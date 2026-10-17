"""
Genera la página del reporte diario de disponibilidad (HTML para publicar como artifact) a partir
del JSON que escribe scripts/verificar-disponibilidad.py --reporte.

Uso: python3 scripts/reporte-disponibilidad-html.py reporte.json salida.html [--commit SHA]
"""
import html, json, sys

rep = json.load(open(sys.argv[1], encoding='utf-8'))
out = sys.argv[2]
commit = sys.argv[sys.argv.index('--commit') + 1] if '--commit' in sys.argv else ''
e = lambda s: html.escape(str(s or ''))
PROVS = ['Ingesolar', 'Autosolar', 'Amara NZero']
TIENDA = 'https://reikisolar.com.co/tienda/'


def chip(stock, bajo):
    if stock == 'disponible' and bajo:
        return '<span class="chip low">Pocas unidades</span>'
    if stock == 'disponible':
        return '<span class="chip ok">Disponible</span>'
    if stock == 'pre-orden':
        return '<span class="chip pre">Pre-orden</span>'
    return f'<span class="chip">{e(stock)}</span>'


CONSULTA = {'ok': '', 'no-encontrado': 'No encontrado en el proveedor', 'error': 'Error de consulta',
            'sin-revisar': 'Sin revisar'}

resumen = []
for p in PROVS:
    fs = [f for f in rep['productos'] if f['proveedor'] == p]
    disp = sum(1 for f in fs if f['stock'] == 'disponible')
    pre = sum(1 for f in fs if f['stock'] == 'pre-orden')
    nf = sum(1 for f in fs if f['consulta'] != 'ok')
    estado = 'Actualizado' if rep['aplicado'].get(p) else 'No aplicado'
    resumen.append(f'''<div class="prov">
  <div class="prov-h"><h3>{e(p)}</h3><span class="tag {'okt' if rep['aplicado'].get(p) else 'bad'}">{estado}</span></div>
  <dl><div><dt>Productos</dt><dd>{len(fs)}</dd></div><div><dt>Disponibles</dt><dd>{disp}</dd></div>
  <div><dt>Pre-orden</dt><dd>{pre}</dd></div><div><dt>Sin dato</dt><dd>{nf}</dd></div></dl></div>''')

avisos = ''.join(f'<li>{e(a)}</li>' for a in rep['avisos'])
cambios = ''.join(
    f'<tr><td><a href="{TIENDA}{e(c["slug"])}" target="_blank" rel="noopener">{e(c["titulo"])}</a></td>'
    f'<td>{e(c["proveedor"])}</td><td>{e(c["antes"])}</td><td>{e(c["ahora"])}</td></tr>' for c in rep['cambios'])

filas = []
for f in sorted(rep['productos'], key=lambda x: (PROVS.index(x['proveedor']), x['stock'] != 'pre-orden', x['titulo'] or '')):
    nota = CONSULTA.get(f['consulta'], f['consulta'])
    det = e(f['detalle']) + (f' · <em>{e(nota)}</em>' if nota else '')
    filas.append(f'<tr data-p="{e(f["proveedor"])}" data-s="{e(f["stock"])}"{" class=chg" if f["cambio"] else ""}>'
                 f'<td><a href="{TIENDA}{e(f["slug"])}" target="_blank" rel="noopener">{e(f["titulo"])}</a>'
                 f'<span class="sku">{e(f["sku"])}</span></td><td>{e(f["proveedor"])}</td>'
                 f'<td>{chip(f["stock"], f["stockBajo"])}</td><td class="det">{det}</td></tr>')

pub = (f'Cambios publicados en la tienda (commit <code>{e(commit[:7])}</code>).' if commit and rep['cambios']
       else 'No hubo cambios que publicar.' if not rep['cambios'] else 'Cambios calculados, sin publicar.')

page = f'''<title>Disponibilidad de proveedores</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wght@500;700;800&family=Source+Sans+3:wght@400;600&family=JetBrains+Mono:wght@400&display=swap">
<style>
/* Hoja de control: resumen por proveedor arriba, cambios del día, luego tabla filtrable */
:root {{
  --bg: #f7f8f4; --surface: #ffffff; --fg: #1d2318; --muted: #5f6858; --line: #dfe3d6;
  --accent: #e08a00; --ok: #2f7d32; --ok-bg: #e5f2e3; --low: #9a6200; --low-bg: #fbefd8;
  --pre: #8a3b2e; --pre-bg: #f6e2dd; --chg: #fff6dc;
  --display: "Archivo", "Helvetica Neue", Arial, sans-serif;
  --body: "Source Sans 3", "Segoe UI", system-ui, sans-serif;
  --mono: "JetBrains Mono", ui-monospace, Menlo, monospace;
}}
@media (prefers-color-scheme: dark) {{ :root:not([data-theme="light"]) {{
  --bg: #13160f; --surface: #1b1f16; --fg: #e8ecdf; --muted: #9ea891; --line: #2e3427;
  --accent: #f2a531; --ok: #8fd28f; --ok-bg: #1f3320; --low: #f2c46b; --low-bg: #3a2c12;
  --pre: #f0a596; --pre-bg: #3b1f1a; --chg: #2c2914; color-scheme: dark; }} }}
:root[data-theme="dark"] {{
  --bg: #13160f; --surface: #1b1f16; --fg: #e8ecdf; --muted: #9ea891; --line: #2e3427;
  --accent: #f2a531; --ok: #8fd28f; --ok-bg: #1f3320; --low: #f2c46b; --low-bg: #3a2c12;
  --pre: #f0a596; --pre-bg: #3b1f1a; --chg: #2c2914; color-scheme: dark; }}
body {{ background: var(--bg); color: var(--fg); font: 15px/1.5 var(--body);
  padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px)); padding-block: 24px 48px; }}
main {{ max-width: 1100px; margin: 0 auto; display: grid; gap: 28px; }}
header {{ border-bottom: 3px solid var(--accent); padding-bottom: 14px; }}
.eyebrow {{ font: 600 12px var(--body); letter-spacing: .08em; text-transform: uppercase; color: var(--muted); }}
h1 {{ font: 800 clamp(26px, 4vw, 36px)/1.1 var(--display); margin: 4px 0 6px; text-wrap: balance; }}
h2 {{ font: 700 19px var(--display); margin: 0 0 10px; }}
h3 {{ font: 700 16px var(--display); margin: 0; }}
.sub {{ color: var(--muted); margin: 0; }}
.provs {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 12px; }}
.prov {{ background: var(--surface); border: 1px solid var(--line); border-radius: 6px; padding: 14px 16px; }}
.prov-h {{ display: flex; justify-content: space-between; align-items: center; gap: 8px; }}
dl {{ display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; margin: 12px 0 0; }}
dt {{ font-size: 12px; color: var(--muted); }} dd {{ margin: 0; font: 700 20px var(--display); font-variant-numeric: tabular-nums; }}
.tag {{ font-size: 12px; font-weight: 600; padding: 2px 8px; border-radius: 99px; }}
.okt {{ background: var(--ok-bg); color: var(--ok); }} .bad {{ background: var(--pre-bg); color: var(--pre); }}
.avisos {{ background: var(--pre-bg); color: var(--fg); border-left: 4px solid var(--pre); padding: 10px 16px; border-radius: 4px; }}
.avisos ul {{ margin: 6px 0 0; padding-left: 18px; }}
.wrap {{ overflow-x: auto; background: var(--surface); border: 1px solid var(--line); border-radius: 6px; }}
table {{ border-collapse: collapse; width: 100%; min-width: 640px; }}
th, td {{ text-align: left; padding: 8px 12px; border-bottom: 1px solid var(--line); vertical-align: top; }}
th {{ font-size: 12px; text-transform: uppercase; letter-spacing: .06em; color: var(--muted); font-weight: 600; position: sticky; top: 0; background: var(--surface); }}
tr.chg td {{ background: var(--chg); }}
a {{ color: var(--fg); text-decoration-color: var(--accent); text-underline-offset: 2px; }}
a:focus-visible, button:focus-visible, select:focus-visible, input:focus-visible {{ outline: 2px solid var(--accent); outline-offset: 2px; }}
.sku {{ display: block; font: 12px var(--mono); color: var(--muted); }}
.det {{ font-size: 13px; color: var(--muted); }}
.chip {{ display: inline-block; font-size: 12px; font-weight: 600; padding: 2px 8px; border-radius: 4px; white-space: nowrap; }}
.chip.ok {{ background: var(--ok-bg); color: var(--ok); }} .chip.low {{ background: var(--low-bg); color: var(--low); }}
.chip.pre {{ background: var(--pre-bg); color: var(--pre); }}
.filtros {{ display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 10px; }}
select, input {{ font: inherit; padding: 6px 10px; border: 1px solid var(--line); border-radius: 4px; background: var(--surface); color: var(--fg); }}
input {{ flex: 1 1 200px; min-width: 0; }}
.vacio {{ color: var(--muted); margin: 0; }}
code {{ font-family: var(--mono); font-size: 13px; }}
</style>
<main>
<header>
  <div class="eyebrow">Reiki Energía Solar · revisión diaria</div>
  <h1>Disponibilidad de proveedores</h1>
  <p class="sub">Consulta del {e(rep["fecha"])} (hora Colombia). {pub}</p>
</header>
<section class="provs">{"".join(resumen)}</section>
{f'<section class="avisos"><strong>Avisos</strong><ul>{avisos}</ul></section>' if avisos else ''}
<section>
  <h2>Cambios de hoy ({len(rep["cambios"])})</h2>
  {f'<div class="wrap"><table><thead><tr><th>Producto</th><th>Proveedor</th><th>Antes</th><th>Ahora</th></tr></thead><tbody>{cambios}</tbody></table></div>' if cambios else '<p class="vacio">Ningún equipo cambió de estado desde la revisión anterior.</p>'}
</section>
<section>
  <h2>Estado de todos los equipos</h2>
  <div class="filtros">
    <select id="fp" aria-label="Proveedor"><option value="">Todos los proveedores</option>{"".join(f'<option>{p}</option>' for p in PROVS)}</select>
    <select id="fs" aria-label="Estado"><option value="">Todos los estados</option><option value="disponible">Disponible</option><option value="pre-orden">Pre-orden</option></select>
    <input id="fq" type="search" placeholder="Buscar equipo o código">
  </div>
  <div class="wrap"><table><thead><tr><th>Producto</th><th>Proveedor</th><th>Estado en la tienda</th><th>Detalle del proveedor</th></tr></thead>
  <tbody id="tb">{"".join(filas)}</tbody></table></div>
</section>
</main>
<script>
const fp = document.getElementById('fp'), fs = document.getElementById('fs'), fq = document.getElementById('fq');
function filtrar() {{
  const q = fq.value.toLowerCase();
  for (const tr of document.querySelectorAll('#tb tr')) {{
    tr.hidden = (fp.value && tr.dataset.p !== fp.value) || (fs.value && tr.dataset.s !== fs.value) || (q && !tr.textContent.toLowerCase().includes(q));
  }}
}}
[fp, fs].forEach(x => x.addEventListener('change', filtrar)); fq.addEventListener('input', filtrar);
</script>
'''
open(out, 'w', encoding='utf-8').write(page)
print('ok', out)
