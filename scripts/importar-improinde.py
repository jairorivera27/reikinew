"""
Importa a la tienda los equipos de Improinde Energy que no tenemos, con precio de venta = costo × 1,30
(+19 % de IVA en los productos que la lista marca con IVA 19 %).

La lista de precios (HTML del proveedor) se pasa como argumento y NO se guarda en el repo: los costos
del proveedor no se publican. Solo se escribe el precio de venta en cada ficha y el código del proveedor
en data/proveedores-tienda.json.

Reglas:
  - Se omiten Servicios.
  - Si el modelo ya existe en la tienda (código de modelo en título, modelo o SKU de algún producto),
    no se crea un duplicado.
  - Los productos nuevos quedan ocultos (draft) hasta tener foto propia.

Uso: python3 scripts/importar-improinde.py LISTA.html [--dry-run]
"""
import html, json, os, re, sys, unicodedata

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROD = os.path.join(ROOT, 'src', 'content', 'productos')
PROV = os.path.join(ROOT, 'data', 'proveedores-tienda.json')
LISTA = sys.argv[1]
DRY = '--dry-run' in sys.argv
MARGEN = 1.30
HOY = '2026-10-28'

SECCION_CAT = {
    'paneles': 'paneles', 'baterias': 'baterias', 'hibridos': 'inversores', 'ongrid': 'inversores',
    'micro': 'inversores', 'controladores': 'controladores', 'monitoreo': 'accesorios',
    'protecciones': 'protecciones', 'cables': 'accesorios',
}
SIGLAS = {'MPPT', 'PWM', 'LCD', 'USB', 'DC', 'AC', 'IP', 'IPT', 'LV', 'HV', 'BMS', 'CAN', 'GX', 'WIFI', 'RS485',
          'DPS', 'MC4', 'PV', 'UL', 'LFP', 'TL', 'HC', 'BF', 'DV', 'HJT', 'GFCI', 'CT', 'LTE', 'VE', 'UPS'}


def norm(s):
    return re.sub(r'[^A-Z0-9]', '', s.upper())


def slugify(s):
    s = unicodedata.normalize('NFKD', s).encode('ascii', 'ignore').decode()
    return re.sub(r'-+', '-', re.sub(r'[^a-z0-9]+', '-', s.lower())).strip('-')[:90].strip('-')


def cop(n):
    return '$' + f'{int(round(n, -2)):,}'.replace(',', '.')


def marca_bonita(bn):
    bn = bn.strip()
    return bn if len(bn) <= 4 or bn in SIGLAS else bn.title()


def leer_lista():
    t = open(LISTA, encoding='utf-8', errors='replace').read()
    t = re.sub(r'<(script|style)[^>]*>.*?</\1>', '', t, flags=re.S | re.I)
    items = []
    for sec in re.finditer(r'<section id="s-([a-z]+)"(.*?)</section>', t, re.S):
        seccion, cuerpo = sec.group(1), sec.group(2)
        for card in re.split(r'(?=<div class="card" data-brand=)', cuerpo):
            mb = re.match(r'<div class="card" data-brand="[^"]*" data-bn="([^"]*)"', card)
            if not mb:
                continue
            marca = html.unescape(mb.group(1))
            L = [l.strip() for l in html.unescape(re.sub(r'<[^>]+>', '\n', card)).split('\n') if l.strip()]
            i = 0
            while i < len(L):
                if re.fullmatch(r'\d{6}', L[i]) and i + 3 < len(L):
                    nombre, j, desc = L[i + 1], i + 2, ''
                    if not re.fullmatch(r'\d+%', L[j]):
                        desc, j = L[j], j + 1
                    iva = L[j] if re.fullmatch(r'\d+%', L[j]) else '0%'
                    resto = ' '.join(L[j + 1:j + 5])
                    m = re.search(r'\$\s*([\d.]+)\s*/\s*panel', resto) or re.search(r'\$\s*([\d.]+)', resto)
                    if m:
                        items.append({'ref': L[i], 'seccion': seccion, 'marca': marca, 'nombre': nombre,
                                      'desc': desc, 'iva': iva, 'costo': int(m.group(1).replace('.', ''))})
                    i = j + 1
                    continue
                i += 1
    return items


def tokens_modelo(texto):
    out = set()
    for t in re.findall(r'[A-Za-z0-9][A-Za-z0-9\-./+]{3,}', texto):
        n = norm(t)
        if len(n) >= 5 and re.search(r'\d', n) and re.search(r'[A-Z]', n):
            out.add(n)
    return out


# Victron lo surte E&M con su número de parte (toda la línea ya está en la tienda): no se duplica.
EXCLUIR_MARCAS = {'VICTRON'}
# Duplicados confirmados a mano (mismo producto con otro nombre en la tienda).
EXCLUIR_REFS = {'827176', '827173', '827172', '827178', '827180', '827188', '827186', '827184', '827182',
                '827150', '827170', '827060', '830663', '824472', '829370'}

GENERICOS = {'12V', '24V', '48V', '110V', '120V', '220V', '230V', '240V', '600VDC', '800VDC', '1000VDC', '1100VDC',
             '1500VDC', '110VAC', '120VAC', '220VAC', '230VAC', '240VAC', '400VAC'}


def main():
    items = [x for x in leer_lista() if x['seccion'] in SECCION_CAT]
    tienda = []
    for f in os.listdir(PROD):
        if not f.endswith('.md'):
            continue
        fm = re.match(r'---\n(.*?)\n---', open(os.path.join(PROD, f), encoding='utf-8').read(), re.S)
        if not fm:
            continue
        g = lambda k: (re.search(rf'^{k}:\s*"?([^"\n]*)', fm.group(1), re.M) or [None, ''])[1]
        tienda.append((f[:-3], norm(g('title')), norm(g('model')), norm(g('sku'))))
    prov = json.load(open(PROV, encoding='utf-8'))
    ya_codigos = {v.get('codigo') for v in prov.values() if v.get('proveedor') == 'Improinde'}
    slugs = {t[0] for t in tienda}

    creados, existentes = [], []
    for it in items:
        if it['ref'] in ya_codigos or it['ref'] in EXCLUIR_REFS or it['marca'].upper() in EXCLUIR_MARCAS:
            continue
        toks = {t for t in tokens_modelo(it['nombre'] + ' ' + it['desc']) if not re.fullmatch(r'\d+[A-Z]*', t)} - {norm(g) for g in GENERICOS}
        dup = next((s for s in tienda for t in toks
                    if t == s[2] or t == s[3] or (len(t) >= 6 and t in s[1])), None)
        if dup:
            existentes.append((it['ref'], it['nombre'], dup[0]))
            continue
        marca = marca_bonita(it['marca'])
        titulo = it['nombre'].strip()
        titulo = re.sub(r'^PS\s+', 'Panel Solar ', titulo)
        if marca.upper() not in titulo.upper() and marca.upper() != 'GENERICO':
            titulo = f'{titulo} {marca}'
        titulo = re.sub(r'\s+', ' ', titulo)
        slug = slugify(titulo)
        if slug in slugs:
            slug = slugify(f'{titulo} {it["ref"]}')
        iva = 1.19 if it['iva'].startswith('19') else 1.0
        venta = it['costo'] * MARGEN * iva
        specs = [f'Marca: {marca}']
        partes = [p.strip(' .') for p in re.split(r'[.;]\s+|,\s+', it['desc']) if 3 <= len(p.strip(' .')) <= 90]
        specs += partes[:8]
        desc = f'{titulo}. {it["desc"].rstrip(".")}.' if it['desc'] else f'{titulo}.'
        lineas = ['---',
                  f'title: {json.dumps(titulo, ensure_ascii=False)}',
                  f'description: {json.dumps(desc[:300], ensure_ascii=False)}',
                  'image: "/images/placeholders/accesorios.svg"',
                  f'imageAlt: {json.dumps(titulo + " – Reiki Energía Solar", ensure_ascii=False)}',
                  f'category: "{SECCION_CAT[it["seccion"]]}"',
                  f'price: "{cop(venta)}"',
                  'specifications:'] + [f'  - {json.dumps(s, ensure_ascii=False)}' for s in specs] + [
                  f'brand: {json.dumps(marca, ensure_ascii=False)}',
                  f'sku: "IMP-{it["ref"]}"',
                  'stock: "disponible"',
                  'order: 8100',
                  f'updatedAt: "{HOY}"',
                  'draft: true',
                  'imagenPendiente: true',
                  '---', '', desc, '']
        if not DRY:
            open(os.path.join(PROD, slug + '.md'), 'w', encoding='utf-8').write('\n'.join(lineas))
            prov[slug] = {'proveedor': 'Improinde', 'titulo': titulo, 'codigo': it['ref']}
        slugs.add(slug)
        creados.append((it['ref'], it['seccion'], slug, titulo, cop(venta)))
    if not DRY:
        json.dump(prov, open(PROV, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print(f'lista: {len(items)} | ya existen en la tienda: {len(existentes)} | nuevos: {len(creados)}' + (' (simulación)' if DRY else ''))
    json.dump({'creados': creados, 'existentes': existentes},
              open(os.environ.get('REPORTE', '/dev/null'), 'w'), ensure_ascii=False, indent=1)


if __name__ == '__main__':
    main()
