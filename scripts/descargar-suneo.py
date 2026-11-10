"""
Descarga el catálogo público de Suneo Energy (tienda Jumpseller suneoenergy.com.co) con categoría,
precio (público, con IVA), stock, variantes, fotos y descripción.
Salida: imagenes-proveedores/suneo/products.json (carpeta fuera del repositorio).
Uso: python3 scripts/descargar-suneo.py
"""
import html, json, os, re, subprocess
from concurrent.futures import ThreadPoolExecutor

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'imagenes-proveedores', 'suneo')
os.makedirs(OUT, exist_ok=True)


def get(u):
    r = subprocess.run(['curl', '-sL', '--max-time', '40', '-A', 'Mozilla/5.0 (ReikiSolar)', u], capture_output=True)
    return r.stdout.decode('utf-8', 'replace')


def limpiar(t):
    t = html.unescape(re.sub(r'<br\s*/?>|</p>|</li>', '\n', t or ''))
    t = re.sub(r'<[^>]+>', ' ', t)
    return re.sub(r'[ \t]+', ' ', re.sub(r'\n\s*\n+', '\n', t)).strip()


def parse(u):
    s = get(u)
    prod, migas = None, []
    for b in re.findall(r'<script type="application/ld\+json">(.*?)</script>', s, flags=re.S):
        try:
            j = json.loads(b)
        except Exception:
            continue
        for x in j if isinstance(j, list) else [j]:
            if not isinstance(x, dict):
                continue
            if x.get('@type') == 'Product':
                prod = x
            if x.get('@type') == 'BreadcrumbList':
                migas = [e['item']['name'] for e in x.get('itemListElement', [])][1:-1]
    if not prod:
        return None
    ofs = prod.get('offers') or []
    ofs = ofs if isinstance(ofs, list) else [ofs]
    if len(ofs) == 1 and ofs[0].get('@type') == 'AggregateOffer':
        ofs = ofs[0].get('offers') or [ofs[0]]
    variantes = []
    m = re.search(r'<script type="application/json" class="product-json"[^>]*>(.*?)</script>', s, flags=re.S)
    if m:
        try:
            for v in json.loads(m.group(1)):
                vv = v.get('variant') or {}
                variantes.append({
                    'nombre': html.unescape(html.unescape(' '.join(x['value']['name'] for x in v.get('values') or []))).strip(),
                    'sku': str(vv.get('sku') or '').strip(),
                    'precio': float(vv.get('price') or 0),
                    'stock': bool(vv.get('stock_unlimited')) or int(vv.get('stock') or 0) > 0,
                    'unidades': None if vv.get('stock_unlimited') else int(vv.get('stock') or 0),
                    'imagen': v.get('image') or '',
                })
        except Exception:
            variantes = []
    if not variantes:
        variantes = [{'nombre': '', 'sku': o.get('sku', '') or prod.get('sku', ''), 'precio': float(o.get('price') or o.get('lowPrice') or 0),
                      'stock': str(o.get('availability', '')).endswith('InStock'), 'unidades': None, 'imagen': ''} for o in ofs]
    imgs = prod.get('image') or []
    imgs = imgs if isinstance(imgs, list) else [imgs]
    extra = [e for e in re.findall(r'https://cdnx\.jumpseller\.com/suneo-energy-sas/image/\d+/[^"\'?\s]+', s) if '/resize/' not in e and '/thumb/' not in e]
    for e in extra:
        if e not in [i.split('?')[0] for i in imgs]:
            imgs.append(e)
    marca = prod.get('brand')
    marca = marca.get('name', '') if isinstance(marca, dict) else (marca or '')
    return {'url': u, 'nombre': html.unescape(prod.get('name', '')).strip(), 'sku': prod.get('sku', ''), 'marca': marca,
            'categorias': [html.unescape(x) for x in migas], 'descripcion': limpiar(prod.get('description', '')), 'imagenes': [i.split('?')[0] for i in imgs][:4],
            'variantes': variantes}


def main():
    sm = get('https://suneoenergy.com.co/sitemap.xml')
    urls = re.findall(r'<loc>([^<]*)</loc>', sm)
    with ThreadPoolExecutor(6) as ex:
        res = [r for r in ex.map(parse, urls) if r]
    vistos, out = set(), []
    for r in res:
        k = (r['nombre'], r['sku'])
        if k not in vistos:
            vistos.add(k)
            out.append(r)
    json.dump(out, open(os.path.join(OUT, 'products.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print(len(urls), 'urls ·', len(out), 'productos')


if __name__ == '__main__':
    main()
