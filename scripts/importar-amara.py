"""
Importa a la tienda los equipos de Amara NZero CON STOCK y precio publicado (portal de clientes,
consulta del 29/09/2026), con precio de venta = costo proveedor × 1,30.

Reglas acordadas con Reiki:
  - Solo productos con unidades disponibles y precio > 0.
  - Si el equipo ya existe en la tienda con un precio MENOR o igual al nuevo → no se toca.
  - Si ya existe con un precio MAYOR (margen excesivo) → se baja a costo × 1,30 (y se publica si
    estaba oculto y ahora tiene foto).
  - Los demás se crean como productos nuevos.

Entradas: imagenes-proveedores/amara/detalles.json (scripts/amara-detalles.py) + la selección.
Uso: SEL=<amara-sel.json> python3 scripts/importar-amara.py [--dry-run]
"""
import json, os, re, subprocess, sys, time, unicodedata
from PIL import Image, ImageChops, ImageDraw, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROD = os.path.join(ROOT, 'src', 'content', 'productos')
IMG_OUT = os.path.join(ROOT, 'public', 'images', 'productos-estudio')
FICHAS = os.path.join(ROOT, 'public', 'fichas', 'fabricantes')
DET = json.load(open(os.path.join(ROOT, 'imagenes-proveedores', 'amara', 'detalles.json')))
SEL = json.load(open(os.environ['SEL']))
DRY = '--dry-run' in sys.argv
MARGEN = 1.30
HOY = '2026-09-29'

# Equipos que ya existen en la tienda (verificados a mano: mismo modelo exacto).
EXISTENTES = {
    '203-0004': 'cat-mayorista-b620fe40c0b9',   # Solis S5-GR1P10K
    '203-0014': 'cat-mayorista-5d8e08561d07',   # Solis S6-GR1P6K-S
    '200-0012': 'cat-mayorista-eb335fe74372',   # Huawei SUN2000-50KTL-M3
    '200-0013': 'cat-mayorista-f2e0b9820012',   # Huawei SUN2000-50K-MGL0
    '203-0016': 'cat-mayorista-155584ad7685',   # Solis S5-GR3P5K-LV
    '001-0007': 'cat-mayorista-67f802e82020',   # Hoymiles DTSU666 split-phase CT 2×100A
}
TITULOS = {'202-0006': 'Microinversor Hoymiles HMS-1000-2T 1000 W',
    '203-0010': 'Inversor On-Grid Solis 50K-LV-5G 50 kW Trifásico 220 V',
    '203-0018': 'Inversor On-Grid Solis S6-GC3P30K04K-LV-ND 30 kW Trifásico',
    '300-0002': 'Smart Dongle Huawei SDongleA-05 WLAN-FE para Monitoreo',
    '202-0003': 'Microinversor Hoymiles HMS-800-2T LV 800 W',
    '102-0019': 'Panel Solar Trina Vertex N TSM-NEG21C.20 715W Bifacial',
    '102-0013': 'Panel Solar Trina Vertex TSM-DE21 670W',
    '102-0003': 'Panel Solar Trina Vertex TSM-DE21 665W',
    '102-0011': 'Panel Solar Trina Vertex N TSM-NEG19RC.20 600W Bifacial',
    '102-0020': 'Panel Solar Trina Vertex N TSM-NEG19RC.20 625W Bifacial',
    '100-0010': 'Panel Solar JA Solar JAM66D45-605/LB 605W Bifacial',
    '102-0008': 'Panel Solar Trina Vertex N TSM-NE19R 605W',
    '102-0015': 'Panel Solar Trina Vertex N TSM-NE19R 620W',
    '102-0018': 'Panel Solar Trina Vertex N TSM-NEG21C.20 710W Bifacial',
    '402-0022': 'Conector a Tierra Sunfer S13 para Clamps',
    '402-0020': 'Clamp Medio Sunfer S11 para Paneles 28–40 mm',
    '402-0019': 'Clamp Final Sunfer S10 para Paneles',
    '402-0021': 'Conector de Riel Sunfer UG1',
    '402-0012': 'Riel Sunfer G1-4650 de 4,65 m',
    '402-0036': 'Hanger Bolt Sunfer S01.1-165 para Cubierta Metálica',
    '402-0031': 'Accesorio L de Anclaje Sunfer S03',
    '402-0028': 'Tapa de Riel Sunfer TG1',
    '402-0016': 'Anclaje Sunfer S80 para Cubierta KR18 Standing Seam',
    '402-0035': 'Anclaje Sunfer S02.4 para Teja de Barro',
    '402-0032': 'Soporte Transversal Sunfer S08-1900-10',
    '402-0037': 'Kit de Tornillería Sunfer S69 M8x25',
    '402-0018': 'Accesorios de Fijación Sunfer A53V para Triángulo V1',
    '402-0026': 'Clamp Medio Sunfer S54 para Cubierta KR18 Standing Seam',
    '400-0004': 'Riel Alurack MRAIL de 4,3 m',
    '402-0024': 'Microriel Medio Sunfer S84 para Cubierta Trapezoidal',
    '402-0015': 'Anclaje Sunfer S04-20 para Cubierta Trapezoidal',
    '402-0013': 'Anclaje Sunfer S01-250 para Madera u Hormigón',
    '400-0003': 'Riel Alurack MRAIL de 3,2 m',
    '402-0025': 'Clamp Final Sunfer S53 para Cubierta KR18 Standing Seam',
    '402-0038': 'Kit de Tornillería Sunfer S79 M8x25 para Microriel',
    '400-0043': 'Platina Central Alurack para Una Inclinación',
    '402-0027': 'Miniriel Sunfer S05-450 para Cubierta Trapezoidal',
    '400-0017': 'Platina Extremo Alto Alurack',
    '400-0001': 'Riel Alurack MRAIL de 4,15 m',
    '400-0031': 'Platina Central Alurack para Doble Inclinación (Duo Pitch)',
    '400-0016': 'Platina Extremo Bajo Alurack',
    '400-0007': 'Riel Alurack SRAIL de 6 m',
    '302-0002': 'DTU Hoymiles DTU-Pro-S WiFi para Monitoreo de Microinversores',
    '001-0004': 'Tapa Final AC Trunk Hoymiles (versión anterior)',
    '500-0002': 'Cable Fotovoltaico Procables 6 mm² CuFlex XLPE (por metro)',
    '003-0001': 'Conectores MC4 TE Connectivity (par)',
    '001-0015': 'Conector Hoymiles HMS',
    '001-0016': 'Tapa de Sellado Hoymiles HMS',
    '001-0003': 'Tapa de Puerto AC Trunk Hoymiles (versión anterior)',
    '001-0014': 'Conector de Extensión Hoymiles HMS',
    '001-0001': 'Cable AC Trunk Hoymiles 12/10 AWG (versión anterior)',
    '006-0011': 'Medidor Monofásico Solis AGF-AE-D/200',
    '001-0006': 'Herramienta de Desbloqueo AC Trunk Hoymiles (versión anterior)',
    '001-0017': 'Cable de Conexión Hoymiles HMS 2,3 m',
    '001-0008': 'Medidor Trifásico Hoymiles DTSU666 con CT 3×100A',
    '001-0012': 'Conector de Terminal de Cable Hoymiles HMT',
    '001-0009': 'Cable de Conexión Troncal Hoymiles HMT',
    '000-0006': 'Gestor de Energía Growatt Smart Energy Manager SEM-D',
    '001-0010': 'Conector de Extensión Hoymiles HMT',
    '006-0002': 'Medidor Solis EPM3-5G PLUS Split Phase (Control de Exportación)',
    '001-0011': 'Conector Troncal Hoymiles HMT',
    '000-0003': 'Medidor Inteligente Growatt TPM-E 100A'}

# Sin foto propia en el portal: foto de referencia de la misma serie ya publicada en la tienda.
SERIE = {
    '202-0003': ('hoymiles-hms-800-2t', 'Hoymiles HMS-2T'),
    '302-0002': ('hoymiles-dtu', 'Hoymiles DTU'),
    '102-0013': ('trina-solar-tsm-670deg21c-20-670w-prov', 'Trina Vertex 670W'),
    '102-0003': ('trina-solar-tsm-670deg21c-20-670w-prov', 'Trina Vertex 670W'),
    '102-0008': ('amara:102-0011', 'Trina Vertex N'),
    '102-0015': ('amara:102-0011', 'Trina Vertex N'),
}

CAT = {'inversores': 'inversores', 'modulos': 'paneles', 'estructuras': 'accesorios', 'smart-home': 'accesorios', 'accesorios': 'accesorios'}
MARCAS = {'solis': 'Solis', 'hoymiles': 'Hoymiles', 'huawei': 'Huawei', 'trina': 'Trina Solar', 'ja': 'JA Solar', 'sunfer': 'Sunfer',
          'alurack': 'Alurack', 'procables': 'Procables', 'te': 'TE Connectivity', 'growatt': 'Growatt'}


def num(p):
    return float(p.replace('COP', '').replace('.', '').replace(',', '.').strip())


def cop(v):
    return '$' + f'{int(round(v)):,}'.replace(',', '.')


def slugify(s):
    s = unicodedata.normalize('NFKD', s).encode('ascii', 'ignore').decode().lower()
    return re.sub(r'[^a-z0-9]+', '-', s).strip('-')[:80]


def marca_de(nombre):
    w = re.split(r'[\s\-]+', nombre.strip())[0].lower()
    return MARCAS.get(w, w.capitalize())


def tipo_de(cat, nombre):
    n = nombre.lower()
    if cat == 'inversores':
        if 'dongle' in n: return 'Módulo de comunicación'
        if re.search(r'hms|hmt', n): return 'Microinversor'
        if 'lv' in n and re.search(r'50k|30k|gc3p', n): return 'Inversor on-grid trifásico'
        return 'Inversor'
    if cat == 'modulos': return 'Panel solar'
    if cat == 'estructuras': return 'Estructura de montaje'
    if 'meter' in n or 'medidor' in n or 'epm' in n or 'energy manager' in n: return 'Medidor / gestor de energía'
    if 'dtu' in n: return 'Monitoreo (DTU)'
    if 'cable' in n: return 'Cable'
    if 'conector' in n or 'connector' in n or 'cap' in n or 'tool' in n: return 'Conector / accesorio de instalación'
    return 'Accesorio'


def titulo(cat, nombre, marca):
    n = re.sub(r'\s+', ' ', nombre).strip()
    n = re.sub(r'^(TRINA|Trina-?|ALURACK -?|ALURACK)\s*', '', n, flags=re.I)
    n = n.replace('VERSIÓN ANTIGUA', '(versión anterior)')
    base = re.sub(r'^' + re.escape(marca.split()[0]) + r'[\s\-]*', '', n, flags=re.I)
    base = base[:1].upper() + base[1:] if base.isupper() is False else base.title()
    pref = {'modulos': 'Panel Solar', 'estructuras': 'Estructura Solar'}.get(cat, '')
    if cat == 'inversores':
        pref = 'Microinversor' if re.search(r'HMS|HMT', n) else ('Smart Dongle' if 'Dongle' in n else 'Inversor Solar')
        base = base.replace('Smart Dongle ', '')
    t = f'{pref} {marca} {base}'.strip() if pref else f'{marca} {base}'
    return re.sub(r'\s+', ' ', t)


def limpiar_desc(d, cod, nombre):
    d = re.sub(r'Código proveedor .*? ' + re.escape(cod) + r' - ', '', d)
    d = d.replace(nombre, '').replace(cod + ' - ', '').strip(' -')
    return re.sub(r'\s+', ' ', d).strip()


# ---------- imagen estudio (misma receta del resto de la tienda) ----------
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
    else:  # fondo blanco → multiplicar para no recortar carcasas blancas
        capa = Image.new('RGB', (W, W), (255, 255, 255))
        capa.paste(im, (x, y))
        fondo = ImageChops.multiply(fondo, capa)
    ruta = os.path.join(IMG_OUT, nombre_seo + '.webp')
    for q in (87, 80, 72):
        fondo.save(ruta, 'WEBP', quality=q, method=6)
        if os.path.getsize(ruta) < 150_000: break
    t = fondo.resize((600, 600), Image.LANCZOS)
    t.save(os.path.join(IMG_OUT, nombre_seo + '-thumb.webp'), 'WEBP', quality=82, method=6)
    return f'/images/productos-estudio/{nombre_seo}.webp', f'/images/productos-estudio/{nombre_seo}-thumb.webp', max(im.size) < 700


def ficha(cod, docs):
    url = next((u for k, u in docs.items() if 'ficha' in k.lower() or 'datasheet' in u.lower()), None)
    if not url: return None
    destino = os.path.join(FICHAS, f'amara-{cod}-ficha-tecnica.pdf')
    if not os.path.exists(destino):
        time.sleep(1)
        b = subprocess.run(['curl', '-sL', '--max-time', '90', url], capture_output=True).stdout
        if b[:4] != b'%PDF': return None
        open(destino, 'wb').write(b)
    return f'/fichas/fabricantes/amara-{cod}-ficha-tecnica.pdf'


def set_campo(fm, k, v):
    linea = f'{k}: {json.dumps(v, ensure_ascii=False)}'
    return re.sub(rf'^{k}:.*$', linea, fm, count=1, flags=re.M) if re.search(rf'^{k}:', fm, re.M) else fm + '\n' + linea


def main():
    reporte = {'actualizados': [], 'sin_cambio': [], 'nuevos': [], 'sin_imagen': []}
    for cat, nombre_full, precio, stock, specs, url in SEL:
        cod, _, nombre = nombre_full.partition(' - ')
        costo = num(precio)
        venta = round(costo * MARGEN / 100) * 100
        d = DET.get(cod, {})
        imgs = [f for f in d.get('imagenes', []) if os.path.exists(f)]
        if cod in EXISTENTES:
            slug = EXISTENTES[cod]
            p = os.path.join(PROD, slug + '.md')
            t = open(p, encoding='utf-8').read()
            m = re.match(r'---\n(.*?)\n---', t, re.S)
            fm = m.group(1)
            actual = float(re.sub(r'[^\d]', '', re.search(r'^price:\s*"?([^"\n]*)', fm, re.M).group(1)) or 0)
            if actual and actual <= venta:
                reporte['sin_cambio'].append((cod, slug, cop(actual), cop(venta)))
                continue
            fm = set_campo(fm, 'price', cop(venta))
            fm = set_campo(fm, 'updatedAt', HOY)
            publicado = False
            placeholder = re.search(r'^image:\s*"?/images/(placeholders|livoltek|generic)', fm, re.M)
            if imgs and (placeholder or re.search(r'^imagenPendiente:\s*true', fm, re.M)):
                seo = slugify(nombre) + '-amara'
                im, th, prov = ('', '', True) if DRY else estudio(imgs[0], seo)
                fm = set_campo(fm, 'image', im); fm = set_campo(fm, 'imageThumb', th)
                fm = set_campo(fm, 'imagen_provisional', prov)
            if re.search(r'^draft:\s*true', fm, re.M) and not re.search(r'^image:\s*"?/images/(placeholders|livoltek)', fm, re.M):
                fm = re.sub(r'^draft:\s*true\n?', '', fm, flags=re.M)
                fm = re.sub(r'^imagenPendiente:\s*true\n?', '', fm, flags=re.M)
                publicado = True
            if not DRY:
                open(p, 'w', encoding='utf-8').write('---\n' + fm.strip('\n') + '\n---' + t[m.end():])
            reporte['actualizados'].append((cod, slug, cop(actual), cop(venta), 'publicado' if publicado else ''))
            continue
        # ---- ya importado antes: solo completar la foto si ahora la hay ----
        previo = next((f for f in os.listdir(PROD) if f.endswith('.md') and f'sku: "AMZ-{cod}"' in open(os.path.join(PROD, f), encoding='utf-8').read()), None)
        if previo:
            p = os.path.join(PROD, previo)
            t = open(p, encoding='utf-8').read()
            m = re.match(r'---\n(.*?)\n---', t, re.S); fm = m.group(1)
            if re.search(r'^imagenPendiente:\s*true', fm, re.M) and imgs and not DRY:
                im, th, prov = estudio(imgs[0], previo[:-3])
                fm = set_campo(fm, 'image', im); fm = set_campo(fm, 'imageThumb', th); fm = set_campo(fm, 'imagen_provisional', prov)
                fm = re.sub(r'^(draft|imagenPendiente):\s*true\n?', '', fm, flags=re.M)
                open(p, 'w', encoding='utf-8').write('---\n' + fm.strip('\n') + '\n---' + t[m.end():])
                reporte['nuevos'].append((cod, previo[:-3], 'foto agregada', '', cop(venta), 'con foto'))
            continue
        # ---- producto nuevo ----
        marca = marca_de(nombre)
        tit = TITULOS.get(cod) or titulo(cat, nombre, marca)
        slug = slugify(tit)
        cat_r = CAT[cat]
        desc_prov = limpiar_desc(d.get('descripcion', ''), cod, nombre)
        tipo = tipo_de(cat, nombre)
        esp = [f'Tipo: {tipo}']
        for s in specs.split(' | '):
            if s and not re.search(r':\s*0W?$|Eficiencia Máxima: \d{3,}', s): esp.append(s.replace('.00 W', ' W').replace('.00Años', ' años'))
        det = d.get('detalles', '')
        for k in ['Potencia nominal', 'Garantía producción', 'Tipo de conector', 'Longitud Cable', 'Color de marco']:
            mm = re.search(re.escape(k) + r' ([^A-Z]+?)(?= [A-Z]|$)', det)
            if mm and not any(e.startswith(k) for e in esp): esp.append(f'{k}: {mm.group(1).strip()}')
        gar = re.search(r'(\d+ años? (?:de )?garant[ií]a[^.]*)', desc_prov, re.I)
        if gar: esp.append('Garantía: ' + gar.group(1).strip())
        if d.get('codigo_proveedor'): esp.append('Referencia del fabricante: ' + d['codigo_proveedor'].strip())
        if 'carrete' in nombre.lower():
            esp.append('Precio: por metro')
        pw = re.search(r'(\d{3,4})\s*W\b', nombre) or re.search(r'(\d+(?:\.\d+)?)K', nombre)
        potencia = (pw.group(1) + (' W' if 'W' in pw.group(0) else ' kW')) if pw else ''
        descripcion = (f'{tit}. {desc_prov}'.strip() if desc_prov else f'{tit}.') + ' Equipo nuevo con disponibilidad inmediata para envío a toda Colombia.'
        seo = slug
        imagen = imgthumb = ''
        prov = True
        if imgs and not DRY:
            imagen, imgthumb, prov = estudio(imgs[0], seo)
        serie_ref = None
        if not imagen and cod in SERIE and not DRY:
            base, serie_ref = SERIE[cod]
            if base.startswith('amara:'):
                src = DET.get(base[6:], {}).get('imagenes', [])
                if src and os.path.exists(src[0]):
                    imagen, imgthumb, prov = estudio(src[0], slug)
            else:
                imagen = f'/images/productos-estudio/{base}.webp'
                th = os.path.join(IMG_OUT, base + '-thumb.webp')
                imgthumb = f'/images/productos-estudio/{base}-thumb.webp' if os.path.exists(th) else imagen
                prov = True
            if not imagen: serie_ref = None
        fpdf = None if DRY else ficha(cod, d.get('docs', {}))
        fm = {
            'title': tit, 'description': descripcion,
            'image': imagen or '/images/placeholders/accesorios.svg', 'imageThumb': imgthumb or None,
            'imageAlt': f'{tit} – Reiki Energía Solar', 'category': cat_r, 'price': cop(venta),
            'specifications': esp, 'brand': marca, 'model': (d.get('codigo_proveedor') or nombre).strip(),
            'sku': f'AMZ-{cod}', 'power': potencia or None, 'stock': 'disponible', 'order': 7000,
            'updatedAt': HOY, 'imagen_provisional': prov if imagen else None,
            'draft': True if not imagen else None, 'imagenPendiente': True if not imagen else None,
            'fichaPdf': fpdf, 'imagenSerieRef': serie_ref,
        }
        lineas = ['---']
        for k, v in fm.items():
            if v is None: continue
            if isinstance(v, list):
                lineas.append(f'{k}:'); lineas += [f'  - {json.dumps(x, ensure_ascii=False)}' for x in v]
            elif isinstance(v, bool) or isinstance(v, int):
                lineas.append(f'{k}: {json.dumps(v)}')
            else:
                lineas.append(f'{k}: {json.dumps(v, ensure_ascii=False)}')
        lineas += ['---', '', f'Proveedor: Amara NZero ({cod}).', '']
        ruta = os.path.join(PROD, slug + '.md')
        if os.path.exists(ruta) and not DRY:
            ruta = os.path.join(PROD, slug + '-amz.md')
        if not DRY:
            open(ruta, 'w', encoding='utf-8').write('\n'.join(lineas))
        reporte['nuevos'].append((cod, os.path.basename(ruta)[:-3], tit, cop(costo), cop(venta), 'con foto' if imagen else 'OCULTO: sin foto'))
        if not imagen: reporte['sin_imagen'].append(cod)
    json.dump(reporte, open(os.path.join(os.environ.get('REPORTE_DIR', '/tmp'), 'importacion-amara.json'), 'w'), ensure_ascii=False, indent=1)
    for k, v in reporte.items(): print(k, len(v))
    for r in reporte['actualizados'] + reporte['sin_cambio']: print(' ', r)
    for r in reporte['nuevos'][:80]: print(' +', r)


if __name__ == '__main__':
    main()
