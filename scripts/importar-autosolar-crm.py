"""
Importa a la tienda los equipos de Autosolar CON UNIDADES en el CRM de distribuidor
(autosolar.co/crm, consulta del 28/10/2026) que Reiki todavía no tiene.

Reglas acordadas con Reiki (28/10/2026):
  - Solo referencias con unidades disponibles y precio > 0 en el CRM.
  - Precio de venta = costo × 1,30. El costo es el precio de distribuidor CON IVA
    (el CRM muestra el precio sin IVA; la ficha con sesión iniciada lo muestra con IVA).
  - Se excluyen servicios, repuestos, estructuras y material eléctrico menor; también los packs
    de varias unidades, las baterías de plomo/gel (solo se vende litio), los equipos sin marca,
    las referencias con entrega a más de 30 días y las que ya existen en la tienda.
  - Los productos que ya están en la tienda no se tocan.

Entradas (carpeta ignorada por git, la arma la consulta al CRM):
  imagenes-proveedores/autosolar-crm/importar.json  — selección (sku, nombre, categoría, unidades, precio CRM)
  imagenes-proveedores/autosolar-crm/fichas.json    — ficha pública: fotos descargadas, PDFs, precio con IVA
Uso: python3 scripts/importar-autosolar-crm.py [--dry-run]
"""
import json, os, re, subprocess, sys, time, unicodedata, urllib.parse
from PIL import Image, ImageChops, ImageDraw, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROD = os.path.join(ROOT, 'src', 'content', 'productos')
IMG_OUT = os.path.join(ROOT, 'public', 'images', 'productos-estudio')
FICHAS = os.path.join(ROOT, 'public', 'fichas', 'proveedores')
ENT = os.path.join(ROOT, 'imagenes-proveedores', 'autosolar-crm')
DRY = '--dry-run' in sys.argv
MARGEN = 1.30
HOY = '2026-10-28'

SEL = json.load(open(os.path.join(ENT, 'importar.json'), encoding='utf-8'))
FIC = json.load(open(os.path.join(ENT, 'fichas.json'), encoding='utf-8'))

MARCAS = {'Victron Energy': 'Victron', 'Felicity Solar': 'Felicity', 'Must Solar': 'Must', 'Schneider Electric': 'Schneider',
          'PHVOLT': 'PHVolt', 'Electroindustrial JM SAS': 'Electroindustrial JM', 'Nacional de dobleces': 'Nacional de Dobleces',
          'Hebei Huatong': 'Topsolar', 'Solax Power': 'SolaX'}
MARCA_SKU = {'5552118': 'Pearl', '2001513': 'Must'}

# Títulos revisados a mano (los demás salen del nombre del CRM con tildes corregidas).
TITULOS = {
    '3004121': 'Inversor Híbrido Trifásico Deye 10 kW SUN-10K-SG04LP3-EU-AM2-LV',
    '1881068': 'Monitoreo WiFi Felicity IOTH2403 para Inversores IVCM-LV',
    '1881062': 'Monitoreo WiFi Felicity IOTH2407',
    '1881060': 'Monitoreo WiFi para Inversores PHVolt',
    '1880837': 'Batería de Litio Felicity 5,12 kWh 100 Ah FLH48100UG1 Alto Voltaje',
    '1881064': 'Gestor de Energía Growatt GroHome Manager-X',
    '1881079': 'Bandeja Tipo Rack para Gabinete de Baterías Electroindustrial JM',
    '1881076': 'Gabinete para Baterías Solares 120×60×60 cm Electroindustrial JM',
    '1881073': 'Gabinete para Baterías Solares 80×60×60 cm Electroindustrial JM',
    '1700574': 'Cable Victron VE.Can a CAN-bus BMS Tipo A 5 m',
    '1700550': 'Medidor de Energía Victron ET340 Trifásico 65 A por Fase',
    '1700529': 'Cable de Interfaz Victron RS485 a USB 1,8 m',
    '3004300': 'Inversor Cargador Felicity 5000 W 48 V IVEM5048-LV',
    '3004246': 'Inversor Cargador Tensite 2000 W 24 V IVCM2024-LV',
    '3004611': 'Inversor Cargador Rack PHVolt 3000 W 48 V EOS3000',
    '1880811': 'Batería de Litio Tensite 4,8 kWh 48 V TS-L5000/LV',
    '3004281': 'Inversor On-Grid SolaX Mega 35 kW G2-LV',
    '3205075': 'Smart Energy Manager Growatt 1M',
    '3202012': 'Medidor Trifásico Growatt TPM-CT-E 250 A',
    '3202015': 'Monitoreo Growatt Shine Link-X',
    '3202016': 'Monitoreo Growatt ShineWiFi-S',
    '3202017': 'Monitoreo Growatt ShineWiFi-F',
    '3202018': 'Monitoreo Growatt ShineWiFi-X',
    '5504070': 'Brackets para Batería Pylontech US2000 2,4 kWh 48 V',
    '5552118': 'Flotador Pearl MAC5 para Control de Nivel',
    '9506080': 'Base de Instalación para 3 Inversores Nacional de Dobleces',
    '9506082': 'Base de Instalación para 2 Inversores Nacional de Dobleces',
    '9506083': 'Base de Instalación para Inversor Nacional de Dobleces',
    '9506010': 'Tablero de Sobreponer Conelec 8 Polos',
    '2001513': 'Controlador de Carga PWM Must 40 A 12/24 V con LCD',
    '2001507': 'Controlador de Carga PWM Must 10 A 12/24 V con LCD',
    '2001514': 'Controlador de Carga PWM Must 50 A 48 V con LCD',
    '3001020': 'Kit de Conexión WiFi para Inversores Must',
    '3001010': 'Kit de Conexión en Paralelo para Inversores Must',
    '3202601': 'Inversor de Corriente Onda Pura Belttt 600 W 24 V',
    '5501615': 'Variador de Bombeo Solar Nastec VASCO VS212 3 HP Trifásico 230 V',
    '3301031': 'Cargador de Vehículo Eléctrico de Pared Moreday 7 kW Tipo 2 MDAC132EN',
    '3301028': 'Cargador de Vehículo Eléctrico de Pared Moreday 7 kW Tipo 2 MDAC332EN-K',
    '3301022': 'Cargador Portátil de Vehículo Eléctrico Moreday 3,5 kW Tipo 2 MDAC116ENF',
    '5504046': 'Conector MC4 en Y 2 a 1 Suntree 4/6 mm² 1500 VDC',
    '5504000': 'Conector MC4 Suntree para Paneles Solares 4/6 mm² 1500 VDC',
}
# PDF que no corresponde al equipo (es de otro modelo de la serie): no se publica.
PDF_NO = {'3004121'}

# Referencia del fabricante (campo model). Sin entrada → no se publica model.
MODELOS = {'1880837': 'FLH48100UG1', '1880811': 'TS-L5000/LV', '3301031': 'MDAC132EN', '3301028': 'MDAC332EN-K',
           '3301022': 'MDAC116ENF', '5552118': 'MAC5', '3004300': 'IVEM5048-LV', '3004611': 'EOS3000', '3004246': 'IVCM2024-LV',
           '3004121': 'SUN-10K-SG04LP3-EU-AM2-LV', '3004281': 'Mega 35kW-G2-LV', '1700550': 'ET340', '1881068': 'IOTH2403',
           '1881062': 'IOTH2407', '5001531': 'GD100-5R5G-2-PV', '5001538': 'GD100-015G-4-PV', '5501615': 'VASCO VS212',
           '5501503': 'BPD 5HP', '3202012': 'TPM-CT-E', '3202015': 'Shine Link-X', '3202016': 'ShineWiFi-S',
           '3202017': 'ShineWiFi-F', '3202018': 'ShineWiFi-X', '1881064': 'GroHome Manager-X', '3205075': 'Smart Energy Manager 1M'}

APLIC_TIPO = {'Inversor cargador (off-grid)': 'sistemas solares aislados y respaldo con baterías',
              'Inversor on-grid': 'sistemas solares conectados a la red',
              'Inversor híbrido': 'sistemas solares híbridos con baterías',
              'Inversor de corriente onda pura': 'convertir 24 V DC de baterías a 110 V AC'}


def _compartidos():
    vistos, rep = set(), set()
    for s, f in FIC.items():
        if s in PDF_NO or not f['pdfs']: continue
        u = next((u for u in f['pdfs'] if re.search(r'ficha|especificaciones|datasheet', urllib.parse.unquote(u), re.I)), f['pdfs'][0])
        (rep if u in vistos else vistos).add(u)
    return rep


PDF_COMPARTIDOS = _compartidos()

TILDES = [('Hibrido', 'Híbrido'), ('Trifasico', 'Trifásico'), ('Bifasico', 'Bifásico'), ('Monofasico', 'Monofásico'),
          ('Bateria', 'Batería'), ('Proteccion', 'Protección'), ('Metalica', 'Metálica'), ('Portatil', 'Portátil'),
          ('exterior', 'Exterior'), ('Distribucion', 'Distribución'), ('SUNTREE', 'Suntree'), ('SCHNEIDER', 'Schneider'),
          ('instalacion', 'Instalación')]


def cop(v):
    return '$' + f'{int(round(v)):,}'.replace(',', '.')


def slugify(s):
    s = unicodedata.normalize('NFKD', s).encode('ascii', 'ignore').decode().lower()
    return re.sub(r'[^a-z0-9]+', '-', s).strip('-')[:80]


def marca(r):
    return MARCA_SKU.get(r['sku']) or MARCAS.get(r['marca'], r['marca'])


def titulo(r):
    if r['sku'] in TITULOS:
        return TITULOS[r['sku']]
    t = r['nombre']
    for a, b in TILDES:
        t = re.sub(rf'\b{a}\b', b, t)
    t = re.sub(r'(\d+)\*(\d+)mm2', r'\1×\2 mm²', t)
    t = re.sub(r'(\d)mm2\b', r'\1 mm²', t)
    m = marca(r)
    if m.lower() not in t.lower():
        t = f'{t} {m}'
    return re.sub(r'\s+', ' ', t).strip()


def tipo(r):
    n, c = r['nombre'].lower(), r['categoria']
    if 'cable solar' in n: return 'Cable fotovoltaico'
    if 'mc4' in n: return 'Conector fotovoltaico'
    if 'breaker' in n or 'interruptor' in n: return 'Interruptor termomagnético'
    if 'portafusible' in n: return 'Portafusible'
    if 'fusible' in n: return 'Fusible'
    if 'caja de distribuci' in n or 'tablero' in n: return 'Tablero / caja de distribución'
    if 'caja de protecci' in n: return 'Caja de protecciones'
    if 'gabinete' in n or 'bandeja' in n: return 'Gabinete para baterías'
    if 'variador' in n: return 'Variador de frecuencia para bombeo solar'
    if 'flotador' in n: return 'Control de nivel'
    if 'cargador ev' in n: return 'Cargador de vehículo eléctrico'
    if 'monitoriz' in n or 'shine' in n: return 'Monitoreo WiFi'
    if 'vatímetro' in n or 'energy meter' in n or 'energy manager' in n or 'grohome' in n: return 'Medidor / gestor de energía'
    if 'controlador' in n: return 'Controlador de carga PWM'
    if 'on grid' in n: return 'Inversor on-grid'
    if 'hibrido' in n or 'híbrido' in n: return 'Inversor híbrido'
    if 'inversor cargador' in n: return 'Inversor cargador (off-grid)'
    if 'onda pura' in n: return 'Inversor de corriente onda pura'
    if 'batería' in n or 'bateria' in n and 'litio' in n: return 'Batería de litio'
    if 'base instalaci' in n: return 'Soporte de montaje'
    if 'kit conexi' in n: return 'Kit de conexión'
    if 'cable' in n: return 'Cable de comunicación'
    return 'Accesorio'


APLIC = {'paneles': 'generación de energía solar fotovoltaica', 'inversores': 'sistemas solares on-grid, híbridos y aislados',
         'baterias': 'almacenamiento de energía en sistemas solares y respaldo eléctrico',
         'controladores': 'sistemas solares aislados con baterías', 'protecciones': 'protección y maniobra de instalaciones solares',
         'bombeo': 'bombeo de agua con energía solar', 'accesorios': 'instalación y monitoreo de sistemas solares'}


def principal(nombre):
    n = nombre
    for pat in [r'\d+(?:[.,]\d+)?\s?kWh', r'\d+(?:[.,]\d+)?\s?kW\b', r'\d{3,5}\s?W\b', r'\d+\s?HP', r'\d+\*\d+mm2', r'\d+X\d+A', r'\d+x\d+A', r'\d+A\b', r'\d+P\b']:
        m = re.search(pat, n, re.I)
        if m:
            v = [m.group(0)]
            vv = re.search(r'\b(12|24|48|220|230|400)\s?V(?:AC|DC)?\b', n)
            if vv and vv.group(0) not in v[0]: v.append(vv.group(0))
            return ' '.join(v).replace('*', '×').replace('mm2', ' mm²')
    return ''


def estudio(src, nombre_seo):
    """Foto estudio 1600×1600 + miniatura 600 (misma receta que importar-amara.py)."""
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
    if bbox: im = im.crop(bbox)
    esc = min(W * 0.8 / im.width, W * 0.8 / im.height)
    if esc > 1.3: esc = min(1.3, W * 0.7 / max(im.size))
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
        if os.path.getsize(ruta) < 150_000: break
    fondo.resize((600, 600), Image.LANCZOS).save(os.path.join(IMG_OUT, nombre_seo + '-thumb.webp'), 'WEBP', quality=82, method=6)
    return f'/images/productos-estudio/{nombre_seo}.webp', f'/images/productos-estudio/{nombre_seo}-thumb.webp', max(im.size) < 700


def foto(sku, src):
    """Si la foto descargada es pequeña (<500 px), usa la variante -thumb2x del CDN (500 px)."""
    if min(Image.open(src).size) >= 500: return src
    stem, ext = os.path.splitext(os.path.basename(src)[3:])
    dst = os.path.join(os.path.dirname(src), f'00-{stem}-2x{ext}')
    if not os.path.exists(dst):
        b = subprocess.run(['curl', '-sL', '--max-time', '60', f'https://cdn.autosolar.co/images/{sku}/{stem}-thumb2x{ext}'],
                           capture_output=True).stdout
        if len(b) < 2000: return src
        open(dst, 'wb').write(b)
    return dst if Image.open(dst).size[0] > Image.open(src).size[0] else src


def ficha(sku, pdfs):
    """Descarga la ficha (una sola copia si varios equipos comparten el mismo PDF) y la comprime con
    Ghostscript (/ebook) cuando pesa más de 1,5 MB y se reduce al menos un 20 %."""
    if sku in PDF_NO or not pdfs: return None
    url = next((u for u in pdfs if re.search(r'ficha|especificaciones|datasheet', urllib.parse.unquote(u), re.I)), pdfs[0])
    nombre = slugify(urllib.parse.unquote(os.path.basename(url))[:-4])[:60]
    destino = os.path.join(FICHAS, f'autosolar-{nombre}.pdf' if url in PDF_COMPARTIDOS else f'autosolar-{sku}-{nombre}.pdf')
    if not os.path.exists(destino):
        time.sleep(1)
        b = subprocess.run(['curl', '-sL', '--max-time', '120', url], capture_output=True).stdout
        if b[:4] != b'%PDF' or len(b) > 12_000_000: return None
        open(destino, 'wb').write(b)
        if len(b) > 1_500_000:
            tmp = destino + '.gs.pdf'
            r = subprocess.run(['gs', '-q', '-dNOPAUSE', '-dBATCH', '-dSAFER', '-sDEVICE=pdfwrite', '-dPDFSETTINGS=/ebook',
                                '-dCompatibilityLevel=1.5', f'-sOutputFile={tmp}', destino], capture_output=True)
            if r.returncode == 0 and os.path.exists(tmp) and os.path.getsize(tmp) < len(b) * 0.8:
                os.replace(tmp, destino)
            elif os.path.exists(tmp):
                os.remove(tmp)
    return '/fichas/proveedores/' + os.path.basename(destino)


def yml(fm):
    out = ['---']
    for k, v in fm.items():
        if v is None: continue
        if isinstance(v, list):
            out.append(f'{k}:'); out += [f'  - {json.dumps(x, ensure_ascii=False)}' for x in v]
        elif isinstance(v, (bool, int)):
            out.append(f'{k}: {json.dumps(v)}')
        else:
            out.append(f'{k}: {json.dumps(v, ensure_ascii=False)}')
    return '\n'.join(out + ['---'])


def main():
    prov = json.load(open(os.path.join(ROOT, 'data', 'proveedores-tienda.json'), encoding='utf-8'))
    disp = json.load(open(os.path.join(ROOT, 'data', 'disponibilidad-proveedores.json'), encoding='utf-8'))
    skus = set()
    for f in os.listdir(PROD):
        if f.endswith('.md'):
            m = re.search(r'^sku:\s*"?([^"\n]*)', open(os.path.join(PROD, f), encoding='utf-8').read(), re.M)
            if m: skus.add(m.group(1).strip())
    nuevos = []
    for r in SEL:
        sku = r['sku']
        if sku in skus:
            continue  # ya importado o ya en la tienda
        f = FIC[sku]
        crm = int(r['precio'])
        web = int((f.get('precio_web') or '0').replace('.', ''))
        exento = (f.get('iva') or '').lower().startswith('exento')
        costo = max(web, crm if exento else round(crm * 1.19)) if web else (crm if exento else round(crm * 1.19))
        venta = round(costo * MARGEN / 100) * 100
        tit, m, cat = titulo(r), marca(r), r['cat_tienda']
        slug = slugify(tit)
        if os.path.exists(os.path.join(PROD, slug + '.md')): slug = slugify(tit)[:72] + '-' + sku
        tp = tipo(r)
        pp = principal(r['nombre'])
        apl = APLIC_TIPO.get(tp, APLIC[cat])
        esp = [f'Tipo: {tp}'] + ([f'Especificación principal: {pp}'] if pp else []) + [f'Aplicación: {apl}']
        cable = tp == 'Cable fotovoltaico'
        if cable: esp.append('Precio: por metro')
        imagen = thumb = None; provisional = None
        if f['imagenes'] and not DRY:
            imagen, thumb, provisional = estudio(foto(sku, f['imagenes'][0]), slug)
        pdf = None if DRY else ficha(sku, f['pdfs'])
        desc = (f'{tit}. {tp} de la marca {m}' + (f' ({pp})' if pp else '') + f' para {apl}. '
                + ('Se vende por metro. ' if cable else '')
                + 'Equipo nuevo con disponibilidad inmediata para envío a toda Colombia.')
        fm = {'title': tit, 'description': desc,
              'image': imagen or f'/images/placeholders/{cat}.svg', 'imageThumb': thumb,
              'imageAlt': f'{tit} – Reiki Energía Solar', 'category': cat, 'price': cop(venta),
              'specifications': esp, 'brand': m, 'model': MODELOS.get(sku), 'sku': sku, 'power': pp or None,
              'stock': 'disponible', 'order': 7100, 'updatedAt': HOY,
              'imagen_provisional': provisional, 'draft': True if not imagen else None,
              'imagenPendiente': True if not imagen else None, 'fichaPdf': pdf}
        cuerpo = f'\n\n**{tit}** de {m}.\n\n{desc}\n\nProveedor: Autosolar ({sku}).\n'
        if not DRY:
            open(os.path.join(PROD, slug + '.md'), 'w', encoding='utf-8').write(yml(fm) + cuerpo)
        prov[slug] = {'proveedor': 'Autosolar', 'titulo': tit, 'codigo': sku}
        disp.setdefault('autosolar_urls', {})[sku] = r['url']
        nuevos.append({'sku': sku, 'slug': slug, 'titulo': tit, 'categoria': cat, 'unidades': r['disp'],
                       'costo': cop(costo), 'venta': cop(venta), 'iva': f.get('iva'), 'foto': bool(imagen),
                       'provisional': provisional, 'ficha': bool(pdf)})
    if not DRY:
        json.dump(prov, open(os.path.join(ROOT, 'data', 'proveedores-tienda.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
        disp['autosolar_urls'] = dict(sorted(disp['autosolar_urls'].items()))
        json.dump(disp, open(os.path.join(ROOT, 'data', 'disponibilidad-proveedores.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    json.dump(nuevos, open(os.path.join(ENT, 'resultado.json'), 'w'), ensure_ascii=False, indent=1)
    print('nuevos', len(nuevos))
    for n in nuevos: print(' +', n['sku'], n['categoria'], n['venta'], n['iva'], 'foto' if n['foto'] else 'SIN FOTO', 'prov' if n['provisional'] else '', n['titulo'])


if __name__ == '__main__':
    main()
