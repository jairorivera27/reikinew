"""
Importa a la tienda los equipos de Ingesolar (proveedor, catálogo público
https://ingesolarcol.sunnytechcol.site/pages/tienda.html, consulta del 05/10/2026)
que Reiki no tiene, con precio de venta = costo proveedor x 1.30.

Alcance acordado con Reiki:
  - Categorías: paneles, inversores, baterías, controladores, protecciones, accesorios,
    iluminación (reflectores), bombas (bombeo) + aires acondicionados (categoría nueva).
  - Solo productos con stock real (según hasAnyStock del proveedor) y precio > 0.
  - Se excluyen estructuras ("yo no vendo estructuras").
  - Los 2 casos con coincidencia exacta de modelo con un producto que YA tenemos
    (EPever IPT2000-41, Deye LS4G-3) se actualizan aparte (ver actualizar-coincidencias-ingesolar.py).

Entrada: imagenes-proveedores/ingesolar/products.json (export público del proveedor).
Uso: python3 scripts/importar-ingesolar.py [--dry-run] [--limite N]
"""
import json, os, re, subprocess, sys, time, unicodedata
from PIL import Image, ImageChops, ImageDraw, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROD = os.path.join(ROOT, 'src', 'content', 'productos')
IMG_OUT = os.path.join(ROOT, 'public', 'images', 'productos-estudio')
FICHAS = os.path.join(ROOT, 'public', 'fichas', 'proveedores')
RAW = os.path.join(ROOT, 'imagenes-proveedores', 'ingesolar')
os.makedirs(FICHAS, exist_ok=True)
os.makedirs(os.path.join(RAW, 'fotos'), exist_ok=True)

DRY = '--dry-run' in sys.argv
LIMITE = None
if '--limite' in sys.argv:
    LIMITE = int(sys.argv[sys.argv.index('--limite') + 1])

MARGEN = 1.30
HOY = '2026-10-05'
BASE_URL = 'https://ingesolarcol.sunnytechcol.site'

CAT_MAP = {
    'PANELES': 'paneles', 'INVERSORES': 'inversores', 'BATERIAS': 'baterias',
    'CONTROLADORES': 'controladores', 'PROTECCIONES': 'protecciones',
    'ACCESORIOS': 'accesorios', 'ILUMINACION': 'reflectores', 'BOMBAS': 'bombeo',
    'AIRES ACONDICIONADOS': 'aires-acondicionados',
}

# Códigos que ya se resolvieron a mano como coincidencia exacta con un producto existente
# (ver actualizar-coincidencias-ingesolar.py): no se vuelven a crear como nuevos.
YA_RESUELTOS = {'IPT2000-41', 'LS4G-3'}


def cop(v):
    return '$' + f'{int(round(v / 100) * 100):,}'.replace(',', '.')


def slugify(s):
    s = unicodedata.normalize('NFKD', s).encode('ascii', 'ignore').decode().lower()
    s = re.sub(r'[^a-z0-9]+', '-', s).strip('-')
    return s[:85]


SIGLAS = {'mppt', 'pwm', 'ac', 'dc', 'led', 'lcd', 'ip65', 'ip66', 'ip67', 'ip68', 'usb',
          'retie', 'tuv', 'ce', 'rohs', 'bms', 'gps', 'wifi', 'lifepo4', 'mc4'}


def cap(s):
    palabras = s.split(' ')
    out = []
    for w in palabras:
        wl = w.lower().strip('.,():')
        if re.search(r'\d', w):
            out.append(w)  # referencias/medidas con números, tal cual (4M3H, 100AH, 220V...)
        elif wl in SIGLAS:
            out.append(w.upper())
        elif len(w) <= 1:
            out.append(w)
        else:
            out.append(w[:1].upper() + w[1:].lower())
    return ' '.join(out)


def titulo_de(p):
    marca_raw = (p.get('manufacturer') or '').strip()
    marca = cap(marca_raw) if marca_raw else ''
    base = re.sub(r'\s*-\s*' + re.escape(marca_raw) + r'\s*$', '', p['title_base'], flags=re.I) if marca_raw else p['title_base']
    base = re.sub(r'\s+', ' ', base).strip(' -')
    base_cap = cap(base)
    t = f'{marca} {base_cap}'.strip() if marca else base_cap
    return re.sub(r'\s+', ' ', t)[:140]


def especificaciones(p):
    esp = []
    attrs = p.get('attributes') or {}
    etiquetas = {
        'technology': 'Tecnología', 'capacity': 'Capacidad', 'voltage': 'Voltaje',
        'power': 'Potencia', 'flow_rate': 'Caudal', 'max_voltage': 'Voltaje máximo',
        'cable_gauge': 'Calibre', 'type': 'Tipo', 'ac_output': 'Salida AC',
        'amperage': 'Amperaje', 'area_m2': 'Área', 'capacity_btu': 'Capacidad',
        'capacity_l': 'Capacidad', 'color_temp': 'Temperatura de color',
        'connection_type': 'Tipo de conexión', 'connectivity': 'Conectividad',
        'current_type': 'Tipo de corriente', 'diameter_mm': 'Diámetro',
        'dimensions': 'Dimensiones', 'isc': 'Isc', 'kv': 'kV', 'length_m': 'Longitud',
        'phase': 'Fases', 'poles': 'Polos', 'range_km': 'Autonomía',
        'refrigerant': 'Refrigerante', 'system_voltage': 'Voltaje del sistema',
        'thickness_mic': 'Espesor', 'tubes': 'Tubos', 'voc': 'Voc', 'weight': 'Peso',
    }
    for k, v in attrs.items():
        if v:
            esp.append(f'{etiquetas.get(k, k.replace("_", " ").capitalize())}: {v}')
    if p.get('manufacturer'):
        esp.append(f'Fabricante: {cap(p["manufacturer"].strip())}')
    if p.get('reference'):
        esp.append(f'Referencia: {p["reference"]}')
    return esp[:8] or ['Referencia: ' + (p.get('reference') or p['sku'])]


def descargar_imagen(ruta_rel, sku):
    if not ruta_rel:
        return None
    url = BASE_URL + ruta_rel.split('?')[0]
    ext = os.path.splitext(url)[1] or '.webp'
    destino = os.path.join(RAW, 'fotos', f'{sku}{ext}')
    if not os.path.exists(destino):
        r = subprocess.run(['curl', '-sL', '--max-time', '40', '-o', destino, url])
        if r.returncode != 0 or not os.path.exists(destino) or os.path.getsize(destino) < 500:
            if os.path.exists(destino):
                os.remove(destino)
            return None
    return destino


def estudio(src, nombre_seo):
    im = Image.open(src)
    im.load()
    W = 1600
    fondo = Image.new('RGB', (W, W), '#FFFFFF')
    grad = Image.new('L', (W, W), 0)
    ImageDraw.Draw(grad).ellipse((-W * 0.2, -W * 0.2, W * 1.2, W * 1.2), fill=255)
    grad = grad.filter(ImageFilter.GaussianBlur(W * 0.25))
    fondo = Image.composite(fondo, Image.new('RGB', (W, W), '#EEF0F3'), grad)
    tiene_alfa = im.mode in ('RGBA', 'LA') or (im.mode == 'P' and 'transparency' in im.info)
    im = im.convert('RGBA') if tiene_alfa else im.convert('RGB')
    bbox = (im.split()[-1].getbbox() if tiene_alfa else ImageChops.difference(im, Image.new('RGB', im.size, (255, 255, 255))).getbbox())
    if bbox:
        im = im.crop(bbox)
    esc = min(W * 0.8 / im.width, W * 0.8 / im.height)
    if esc > 1.3:
        esc = min(1.3, W * 0.7 / max(im.size))
    im = im.resize((max(1, int(im.width * esc)), max(1, int(im.height * esc))), Image.LANCZOS)
    x, y = (W - im.width) // 2, (W - im.height) // 2 - 30
    sombra = Image.new('L', (W, W), 0)
    ImageDraw.Draw(sombra).ellipse((W / 2 - im.width * 0.42, y + im.height - 18, W / 2 + im.width * 0.42, y + im.height + 38), fill=70)
    fondo = Image.composite(Image.new('RGB', (W, W), '#9AA0A8'), fondo, sombra.filter(ImageFilter.GaussianBlur(22)))
    if tiene_alfa:
        fondo.paste(im, (x, y), im)
    else:
        capa = Image.new('RGB', (W, W), (255, 255, 255))
        capa.paste(im, (x, y))
        fondo = ImageChops.multiply(fondo, capa)
    ruta = os.path.join(IMG_OUT, nombre_seo + '.webp')
    for q in (87, 80, 72):
        fondo.save(ruta, 'WEBP', quality=q, method=6)
        if os.path.getsize(ruta) < 150_000:
            break
    t = fondo.resize((600, 600), Image.LANCZOS)
    t.save(os.path.join(IMG_OUT, nombre_seo + '-thumb.webp'), 'WEBP', quality=82, method=6)
    return f'/images/productos-estudio/{nombre_seo}.webp', f'/images/productos-estudio/{nombre_seo}-thumb.webp', max(im.size) < 700


def drive_id(url):
    m = re.search(r'/d/([a-zA-Z0-9_-]+)', url) or re.search(r'id=([a-zA-Z0-9_-]+)', url)
    return m.group(1) if m else None


def descargar_ficha(url, sku, sufijo='ficha'):
    fid = drive_id(url or '')
    if not fid:
        return None
    nombre = f'ingesolar-{sku}.pdf' if sufijo == 'ficha' else f'ingesolar-{sku}-{sufijo}.pdf'
    destino = os.path.join(FICHAS, nombre)
    if os.path.exists(destino):
        return f'/fichas/proveedores/{nombre}'
    durl = f'https://drive.google.com/uc?export=download&id={fid}'
    b = subprocess.run(['curl', '-sL', '--max-time', '40', durl], capture_output=True).stdout
    if b[:4] != b'%PDF':
        return None
    open(destino, 'wb').write(b)
    return f'/fichas/proveedores/{nombre}'


def set_campo(lineas, k, v):
    if v is None:
        return
    if isinstance(v, list):
        lineas.append(f'{k}:')
        lineas += [f'  - {json.dumps(x, ensure_ascii=False)}' for x in v]
    else:
        lineas.append(f'{k}: {json.dumps(v, ensure_ascii=False)}')


def main():
    data = json.load(open(os.path.join(RAW, 'products.json'), encoding='utf-8'))

    def has_stock(p):
        st = p.get('stock') or {}
        return any(v and v != 'agotado' for v in [st.get('medellin'), st.get('bogota'), st.get('villavicencio')])

    productos = [p for p in data if (p.get('category') or '').upper() in CAT_MAP
                 and not p.get('sin_stock') and has_stock(p)
                 and (p.get('prices') or {}).get('public')
                 and (p.get('reference') or p.get('sku')) not in YA_RESUELTOS]

    if LIMITE:
        productos = productos[:LIMITE]

    existentes_slugs = set(os.path.splitext(f)[0] for f in os.listdir(PROD))
    ya_importados_sku = set()
    for f in os.listdir(PROD):
        if f.endswith('.md'):
            try:
                txt = open(os.path.join(PROD, f), encoding='utf-8').read(2000)
            except Exception:
                continue
            m = re.search(r'^sku:\s*"ING-([^"]+)"', txt, re.M)
            if m:
                ya_importados_sku.add(m.group(1))
    reporte = {'creados': [], 'sin_imagen': [], 'con_ficha': 0, 'omitidos_existente': []}

    for p in productos:
        if p['sku'] in ya_importados_sku:
            continue
        costo = p['prices']['public']
        venta = costo * MARGEN
        cat = CAT_MAP[p['category'].upper()]
        marca = cap((p.get('manufacturer') or '').strip())
        tit = titulo_de(p)
        sku = f"ING-{p['sku']}"
        slug = slugify(tit)
        if slug in existentes_slugs:
            slug = slugify(tit + '-' + p['sku'])
        if slug in existentes_slugs:
            reporte['omitidos_existente'].append((p['sku'], tit))
            continue

        imagen = imgthumb = None
        prov = True
        imgs = p.get('images') or []
        if imgs and not DRY:
            src = descargar_imagen(imgs[0], p['sku'])
            if src:
                try:
                    imagen, imgthumb, prov = estudio(src, slug)
                except Exception as e:
                    print('ERROR imagen', p['sku'], e)

        fpdf = None
        if p.get('datasheet') and not DRY:
            fpdf = descargar_ficha(p['datasheet'], p['sku'])
            if fpdf:
                reporte['con_ficha'] += 1

        fcert = None
        if p.get('certificate') and not DRY:
            fcert = descargar_ficha(p['certificate'], p['sku'], sufijo='cert')

        stock_bajo = None
        st = p.get('stock') or {}
        activos = [v for v in [st.get('medellin'), st.get('bogota'), st.get('villavicencio')] if v and v != 'agotado']
        if activos and all(v == 'pocas' for v in activos):
            stock_bajo = True

        descripcion = f'{tit}. Equipo con disponibilidad inmediata, envío a toda Colombia.'

        lineas = ['---']
        set_campo(lineas, 'title', tit)
        set_campo(lineas, 'description', descripcion)
        set_campo(lineas, 'image', imagen or '/images/placeholders/accesorios.svg')
        if imgthumb:
            set_campo(lineas, 'imageThumb', imgthumb)
        set_campo(lineas, 'imageAlt', f'{tit} – Reiki Energía Solar')
        set_campo(lineas, 'category', cat)
        set_campo(lineas, 'price', cop(venta))
        set_campo(lineas, 'specifications', especificaciones(p))
        if marca:
            set_campo(lineas, 'brand', marca)
        if p.get('reference'):
            set_campo(lineas, 'model', p['reference'])
        set_campo(lineas, 'sku', sku)
        set_campo(lineas, 'stock', 'disponible')
        set_campo(lineas, 'order', 8000)
        set_campo(lineas, 'updatedAt', HOY)
        if imagen:
            set_campo(lineas, 'imagen_provisional', prov)
        else:
            set_campo(lineas, 'draft', True)
            set_campo(lineas, 'imagenPendiente', True)
        if fpdf:
            set_campo(lineas, 'fichaPdf', fpdf)
        if fcert:
            set_campo(lineas, 'certificadoPdf', fcert)
        if stock_bajo:
            set_campo(lineas, 'stockBajo', True)
        lineas += ['---', '', f'Proveedor: Ingesolar ({p["sku"]}).', '']

        ruta = os.path.join(PROD, slug + '.md')
        if not DRY:
            open(ruta, 'w', encoding='utf-8').write('\n'.join(lineas))
        existentes_slugs.add(slug)
        reporte['creados'].append((p['sku'], slug, tit, cop(costo), cop(venta), 'con foto' if imagen else 'SIN FOTO (oculto)'))
        if not imagen:
            reporte['sin_imagen'].append(p['sku'])

    out = os.path.join(RAW, 'reporte-importacion.json')
    json.dump(reporte, open(out, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print('creados:', len(reporte['creados']))
    print('sin imagen (quedan ocultos):', len(reporte['sin_imagen']))
    print('con ficha técnica descargada:', reporte['con_ficha'])
    print('omitidos por slug ya existente:', len(reporte['omitidos_existente']))
    for r in reporte['creados'][:15]:
        print(' +', r)


if __name__ == '__main__':
    main()
