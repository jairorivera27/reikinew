"""
Importa a la tienda los equipos de Suneo Energy (proveedor nuevo, noviembre 2026; tienda pública
https://suneoenergy.com.co) que Reiki no tiene, con precio de venta = precio Suneo x 1,30.

Alcance acordado con Reiki (10/11/2026): "publica los productos de Suneo".
  - Una ficha por variante (cada amperaje, voltaje o potencia es un producto aparte), solo las
    variantes con stock y precio > 0.
  - Se excluyen servicios, eólica y baterías de bicicleta eléctrica.
  - Si la referencia ya existe en la tienda, no se crea de nuevo (queda como otra fuente de precio
    en el panel: op=prov-catalogo).

Entrada: imagenes-proveedores/suneo/products.json (python3 scripts/descargar-suneo.py).
Uso: python3 scripts/importar-suneo.py [--dry-run]
"""
import glob, html, importlib.util, json, os, re, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROD = os.path.join(ROOT, 'src', 'content', 'productos')
RAW = os.path.join(ROOT, 'imagenes-proveedores', 'suneo')
os.makedirs(os.path.join(RAW, 'fotos'), exist_ok=True)
DRY = '--dry-run' in sys.argv
MARGEN = 1.30
HOY = '2026-11-10'

_spec = importlib.util.spec_from_file_location('ing', os.path.join(ROOT, 'scripts', 'importar-ingesolar.py'))
ing = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(ing)
cop, slugify, cap, estudio, set_campo = ing.cop, ing.slugify, ing.cap, ing.estudio, ing.set_campo
_spec2 = importlib.util.spec_from_file_location('sin_logo', os.path.join(ROOT, 'scripts', 'suneo_sin_logo.py'))
sin_logo = importlib.util.module_from_spec(_spec2)
_spec2.loader.exec_module(sin_logo)

EXCLUIR = ('SERVICIOS', 'ENERGÍA EÓLICA', 'VEHÍCULO ELÉCTRICO')
# Equipos con la marca del proveedor impresa en el propio aparato (no se puede quitar de la foto)
CON_MARCA_PROVEEDOR = re.compile(r'GATEWAY IOT|Transferencia autom', re.I)


def categoria(cats, nombre):
    c = ' > '.join(cats).upper()
    n = nombre.upper()
    if 'BATER' in c:
        return 'baterias'
    if 'CONTROLADOR' in c or 'EPEVER' in n:
        return 'controladores'
    if 'INVERSOR' in c and ('INVERSOR' in n or 'MICROINVERSOR' in n):
        return 'inversores'
    if 'BOMBEO' in c:
        return 'bombeo'
    if 'ALUMBRADO' in c:
        return 'reflectores'
    if 'PROTECCIONES' in c or 'TABLEROS' in c:
        return 'protecciones'
    return 'accesorios'


norm = lambda s: re.sub(r'[^a-z0-9]', '', str(s or '').lower())
SPEC = re.compile(r'^\d+(\.\d+)?(w|kw|wp|v|vac|vdc|voc|mm2|mm|a|ah|kwh|kva|hz|p|polos?|m|mts|kv|ka|x\d+)$')


def refs(*ts):
    out = set()
    for t in ts:
        for w in re.split(r'[\s,/()+|]+', str(t or '')):
            k = norm(w)
            if len(k) >= 5 and re.search(r'\d', k) and re.search(r'[a-z]', k) and not SPEC.match(k) and not re.match(r'^(dc|ac)\d+v?$', k):
                out.add(k)
    return out


def tienda():
    skus, rs = set(), set()
    for f in glob.glob(os.path.join(PROD, '*.md')):
        t = open(f, encoding='utf-8').read(3000)
        for k in ('sku', 'model'):
            m = re.search(rf'^{k}:\s*"?([^"\n]+)', t, re.M)
            if m:
                skus.add(norm(m.group(1).replace('SNO-', '')))
        m = re.search(r'^title:\s*"?([^"\n]+)', t, re.M)
        if m:
            rs |= refs(m.group(1))
    return skus, rs


def limpio(nombre):
    n = re.sub(r'\s*-?\s*copiar\s*$', '', nombre, flags=re.I)
    n = re.sub(r'\s+', ' ', n.replace('﻿', '')).strip(' -')
    return n


def titulo(p, v):
    n = limpio(p['nombre'])
    marca = (p.get('marca') or '').strip()
    var = (v.get('nombre') or '').strip().rstrip('.').strip()
    vsku = (v.get('sku') or '').strip()
    if vsku and re.search(r'X{2,}', n):
        n = re.sub(r'\S*X{2,}\S*', vsku, n, count=1)
    num = re.match(r'\s*(\d+(?:[.,]\d+)?)', var)
    if var and num:
        # "80/100/125/160A", "25A/40A/63A" u "80 - 125A" en el nombre base: se quita el rango y queda la variante
        N = r'\d+(?:[.,]\d+)?\s*(?:A|Ah|W|kW|VA|HP|AWG|Lm|M|P)?'
        def quitar(m):
            nums = re.findall(r'\d+(?:[.,]\d+)?', m.group(0))
            if num.group(1) in nums:
                return ' '
            try:
                vals = [float(x.replace(',', '.')) for x in nums]
                if '-' in m.group(0) and len(vals) == 2 and min(vals) <= float(num.group(1).replace(',', '.')) <= max(vals):
                    return ' '
            except ValueError:
                pass
            return m.group(0)
        n2 = re.sub(r'(?<![\w.])' + N + r'(?:\s*(?:/|-|,|\sy\s)\s*' + N + r')+(?![\w])', quitar, n)
        n2 = re.sub(r'\s*-\s*(?:-\s*)+', ' - ', n2)
        n = re.sub(r'\s+,', ',', re.sub(r'\s+', ' ', n2)).strip(' -,')
    if marca and marca.lower() != 'suneo' and marca.lower() not in n.lower():
        n = f'{n} {marca}'
    if var and norm(var) not in norm(n):
        n = f'{n} {var}'
    t = cap(n) if n.isupper() or sum(c.isupper() for c in n) > len(n) * 0.6 else n
    return re.sub(r'\s+', ' ', t)[:140]


def especificaciones(p, v):
    esp = []
    for linea in re.split(r'\n|(?<=[a-z0-9)])(?=[A-ZÁÉÍÓÚ][a-záéíóú]+:)', p.get('descripcion') or ''):
        linea = linea.strip(' •-·\t')
        if 6 <= len(linea) <= 110 and ':' in linea:
            esp.append(linea)
    marca = (p.get('marca') or '').strip()
    if marca and marca.lower() != 'suneo':
        esp.append(f'Fabricante: {cap(marca)}')
    if v.get('sku') or p.get('sku'):
        esp.append(f'Referencia: {(v.get("sku") or p.get("sku")).strip()}')
    if v.get('nombre'):
        esp.append(f'Presentación: {v["nombre"]}')
    vistos, out = set(), []
    for e in esp:
        if e.lower() not in vistos:
            vistos.add(e.lower())
            out.append(e)
    return out[:8] or [re.sub(r'\s+', ' ', html.unescape(p['nombre']))]


def descargar(url, nombre):
    if not url:
        return None
    url = url.split('?')[0]
    ext = os.path.splitext(url)[1] or '.png'
    destino = os.path.join(RAW, 'fotos', nombre + ext)
    if not os.path.exists(destino):
        subprocess.run(['curl', '-sL', '--max-time', '40', '-o', destino, url])
    if not os.path.exists(destino) or os.path.getsize(destino) < 500:
        return None
    # Sin el logo del proveedor (en la tienda no se nombra a los proveedores)
    limpia = os.path.join(RAW, 'fotos-sin-logo', nombre + '.png')
    if not os.path.exists(limpia):
        os.makedirs(os.path.dirname(limpia), exist_ok=True)
        sin_logo.quitar_logo(destino, limpia)
    return limpia


def main():
    data = json.load(open(os.path.join(RAW, 'products.json'), encoding='utf-8'))
    skus, refs_tienda = tienda()
    existentes = set(os.path.splitext(f)[0] for f in os.listdir(PROD))
    rep = {'creados': [], 'ya_en_tienda': [], 'excluidos': 0, 'sin_stock': 0}
    for p in data:
        cats = p.get('categorias') or []
        if not cats or any(x in ' > '.join(cats).upper() for x in EXCLUIR) or CON_MARCA_PROVEEDOR.search(p['nombre']):
            rep['excluidos'] += 1
            continue
        multi = len(p['variantes']) > 1
        for i, v in enumerate(p['variantes']):
            if not v.get('stock') or not v.get('precio'):
                rep['sin_stock'] += 1
                continue
            vsku = (v.get('sku') or p.get('sku') or '').strip()
            tit = titulo(p, v)
            if (len(norm(vsku)) >= 5 and norm(vsku) in skus) or (not multi and refs(tit, vsku) & refs_tienda):
                rep['ya_en_tienda'].append((vsku, tit))
                continue
            sku = 'SNO-' + (vsku or slugify(tit)[:40]).replace(' ', '')
            if norm(sku) in skus:
                continue
            skus.add(norm(sku))
            slug = slugify(tit)
            if slug in existentes:
                slug = slugify(tit + '-' + (vsku or str(i)))
            if slug in existentes:
                rep['ya_en_tienda'].append((vsku, tit))
                continue
            costo = v['precio']
            cat = categoria(cats, p['nombre'])
            imagen = thumb = None
            prov = True
            if not DRY:
                src = descargar(v.get('imagen') or (p.get('imagenes') or [''])[0], slugify(vsku or tit)[:60])
                if src:
                    try:
                        imagen, thumb, prov = estudio(src, slug)
                    except Exception as e:
                        print('ERROR imagen', vsku, e)
            desc = html.unescape(html.unescape(p.get('descripcion') or '')).replace('\xa0', ' ').replace('\n', ' ')
            desc = re.sub(r'\s+', ' ', desc).strip()
            descripcion = (desc[:220].rsplit(' ', 1)[0] + '…') if len(desc) > 220 else (desc or tit)
            descripcion = f'{tit}. {descripcion}' if not descripcion.lower().startswith(tit.lower()[:20]) else descripcion
            L = ['---']
            set_campo(L, 'title', tit)
            set_campo(L, 'description', descripcion[:300])
            set_campo(L, 'image', imagen or '/images/placeholders/accesorios.svg')
            if thumb:
                set_campo(L, 'imageThumb', thumb)
            set_campo(L, 'imageAlt', f'{tit} – Reiki Energía Solar')
            set_campo(L, 'category', cat)
            set_campo(L, 'price', cop(costo * MARGEN))
            set_campo(L, 'specifications', especificaciones(p, v))
            if p.get('marca') and p['marca'].lower() != 'suneo':
                set_campo(L, 'brand', cap(p['marca'].strip()))
            if vsku:
                set_campo(L, 'model', vsku)
            set_campo(L, 'sku', sku)
            set_campo(L, 'stock', 'disponible')
            if v.get('unidades') is not None and v['unidades'] <= 3:
                set_campo(L, 'stockBajo', True)
            set_campo(L, 'order', 8000)
            set_campo(L, 'updatedAt', HOY)
            if imagen:
                set_campo(L, 'imagen_provisional', prov)
            else:
                set_campo(L, 'draft', True)
                set_campo(L, 'imagenPendiente', True)
            L += ['---', '', f'Proveedor: Suneo Energy ({vsku}).' if vsku else 'Proveedor: Suneo Energy.', '']
            if not DRY:
                open(os.path.join(PROD, slug + '.md'), 'w', encoding='utf-8').write('\n'.join(L))
            existentes.add(slug)
            rep['creados'].append({'slug': slug, 'sku': sku, 'titulo': tit, 'categoria': cat, 'costo': costo, 'venta': cop(costo * MARGEN), 'foto': bool(imagen)})
    json.dump(rep, open(os.path.join(RAW, 'reporte-importacion.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print('creados', len(rep['creados']), '· sin foto', sum(1 for c in rep['creados'] if not c['foto']), '· ya en tienda', len(rep['ya_en_tienda']), '· excluidos', rep['excluidos'], '· variantes sin stock', rep['sin_stock'])


if __name__ == '__main__':
    main()
