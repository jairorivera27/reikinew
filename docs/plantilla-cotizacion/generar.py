"""Genera la cotización PDF de Reiki desde cotizacion-ejemplo.json (referencia para Cursor)."""
import base64, io, json, math, pathlib, sys
import qrcode
from jinja2 import Template
from playwright.sync_api import sync_playwright

BASE = pathlib.Path(__file__).parent
datos = json.loads((BASE / (sys.argv[1] if len(sys.argv) > 1 else 'cotizacion-ejemplo.json')).read_text(encoding='utf-8'))

def cop(v):
    return '$ ' + f'{round(v):,}'.replace(',', '.')

def nit_fmt(n):
    return f'{int(n):,}'.replace(',', '.')

e, c, cl = datos['empresa'], datos['cotizacion'], datos['cliente']
e['nit_fmt'] = nit_fmt(e['nit'])

items = []
for it in datos['items']:
    sub = it['precio_unit'] * it['cantidad']
    items.append({**it, 'precio_fmt': cop(it['precio_unit']), 'subtotal_fmt': cop(sub), 'sub': sub})

# Igual que el carrito web (ShoppingCartDrawer.astro): precios con IVA incluido, todo gravado al 19 %.
total_items = sum(i['sub'] for i in items)
envio = datos.get('envio')
total = total_items + (envio or 0)
base = total / 1.19
t = {'base': cop(base), 'iva': cop(total - base), 'total': cop(total),
     'envio': cop(envio) if envio is not None else 'Por cotizar', 'envio_pend': envio is None}

# Estimación orientativa solo si hay paneles
est = None
paneles = [i for i in items if i.get('potencia_w')]
if paneles:
    wp = sum(i['potencia_w'] * i['cantidad'] for i in paneles)
    hsp, pr = c.get('hsp_ciudad', 4.5), c.get('pr', 0.78)
    dia = wp / 1000 * hsp * pr
    bat = 0.0
    for i in items:
        if 'kWh' in i['nombre']:
            import re
            m = re.search(r'([\d.,]+)\s*kWh', i['nombre'])
            if m: bat += float(m.group(1).replace(',', '.')) * i['cantidad']
    est = {'kwp': f'{wp/1000:.2f}'.replace('.', ','), 'paneles': sum(i['cantidad'] for i in paneles),
           'dia': f'{dia:.1f}'.replace('.', ','), 'mes': f'{round(dia*30):,}'.replace(',', '.'),
           'bat': f'{bat:.2f}'.replace('.', ',') if bat else None,
           'hsp': str(hsp).replace('.', ','), 'pr': round(pr * 100)}

qr_img = qrcode.make(c['link_compra'], border=1)
buf = io.BytesIO(); qr_img.save(buf, format='PNG')
qr = 'data:image/png;base64,' + base64.b64encode(buf.getvalue()).decode()

html = Template((BASE / 'plantilla-cotizacion.html').read_text(encoding='utf-8')).render(
    e=e, c=c, cl=cl, items=items, t=t, est=est, qr=qr)
out_html = BASE / 'render.html'
out_html.write_text(html, encoding='utf-8')

footer = f'''<div style="width:100%;font-family:Helvetica,Arial;font-size:6.5pt;color:#6b6475;padding:0 14mm;display:flex;justify-content:space-between;">
<span>{e['razon_social']} · NIT {e['nit_fmt']} · {e['telefono']} · {e['web']}</span>
<span style="white-space:nowrap">{c['numero']} · Página <span class="pageNumber"></span> de <span class="totalPages"></span></span></div>'''

pdf = BASE / f"Cotizacion-Reiki-{c['numero']}.pdf"
with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page()
    pg.goto(out_html.as_uri()); pg.wait_for_load_state('networkidle')
    pg.pdf(path=str(pdf), format='Letter', print_background=True, prefer_css_page_size=True, display_header_footer=True,
           header_template='<span></span>', footer_template=footer,
           margin={'bottom': '16mm'})
    b.close()
print(pdf, t)
