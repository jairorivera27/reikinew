"""
Barrido por código de artículo Autosolar (SKU de 7 dígitos).

Para cada producto cuyo `sku` es un código Autosolar:
  1. busca el código en autosolar.co/search
  2. abre la ficha y CONFIRMA que "Codigo de artículo: <sku>" coincide exactamente
  3. descarga la galería (sin miniaturas) a imagenes-proveedores/autosolar-codigo/<sku>/
Escribe imagenes-proveedores/autosolar-codigo/manifest.json.

Uso: python3 scripts/autosolar-por-codigo.py [--solo 1880836,3004249]
Autorización de uso de imágenes Autosolar: confirmada 2026-09-28.
"""
import glob, json, os, re, subprocess, sys, time, html

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'imagenes-proveedores', 'autosolar-codigo')
UA = 'Mozilla/5.0 (ReikiSolar catalogo; contacto info@reikisolar.com.co)'
EXCL = re.compile(r'account|assets|login|register|contacto|contact/|blog|all-reviews|manufacturers|cart/|fabricantes')


def get(url, binary=False):
    time.sleep(1.0)  # 1 petición/segundo
    r = subprocess.run(['curl', '-sL', '--max-time', '40', '-A', UA, url], capture_output=True)
    return r.stdout if binary else r.stdout.decode('utf-8', 'replace')


def fm_of(path):
    t = open(path, encoding='utf-8').read()
    m = re.match(r'---\n(.*?)\n---', t, re.S)
    fm = m.group(1) if m else ''
    f = lambda k: (re.search(rf'^{k}:\s*"?([^"\n]*)"?\s*$', fm, re.M) or [None, ''])[1]
    return {'slug': os.path.basename(path)[:-3], 'sku': f('sku'), 'title': f('title'), 'brand': f('brand'),
            'category': f('category'), 'draft': f('draft') == 'true', 'provisional': f('imagen_provisional') == 'true'}


def main():
    solo = None
    if '--solo' in sys.argv:
        solo = set(sys.argv[sys.argv.index('--solo') + 1].split(','))
    prods = [fm_of(p) for p in glob.glob(os.path.join(ROOT, 'src/content/productos/*.md'))]
    prods = [p for p in prods if re.fullmatch(r'\d{7}', p['sku']) and (not solo or p['sku'] in solo)]
    os.makedirs(OUT, exist_ok=True)
    mpath = os.path.join(OUT, 'manifest.json')
    manifest = json.load(open(mpath)) if os.path.exists(mpath) else {}
    for i, p in enumerate(sorted(prods, key=lambda x: x['sku'])):
        code = p['sku']
        if code in manifest and manifest[code].get('estado') == 'ok':
            continue
        entry = {'slug': p['slug'], 'titulo_reiki': p['title'], 'marca_reiki': p['brand'], 'categoria': p['category'],
                 'oculto': p['draft'], 'provisional': p['provisional']}
        busq = get(f'https://autosolar.co/search?q={code}')
        urls = sorted({u for u in re.findall(r'https://autosolar\.co/[a-z0-9-]+/[a-z0-9-]+', busq) if not EXCL.search(u)})
        page_url, page = None, None
        for u in urls[:6]:
            h = get(u)
            m = re.search(r'Codigo de art[ií]culo:\s*(\d+)', h)
            if m and m.group(1) == code:
                page_url, page = u, h
                break
        if not page:
            entry['estado'] = 'sin-coincidencia'
            manifest[code] = entry
            print(f'[{i+1}/{len(prods)}] {code} sin coincidencia exacta ({len(urls)} candidatos)')
            continue
        t = re.search(r'<title>([^<|]+)', page)
        fab = re.search(r'Fabricante:.*?<a[^>]*>([^<]+)</a>', page, re.S)
        imgs = []
        for u in re.findall(rf'https://cdn\.autosolar\.co/images/{code}/[A-Za-z0-9._-]+\.(?:jpg|jpeg|png|webp)', page):
            u = re.sub(r'-thumb(2x)?\.', '.', u)
            if u not in imgs:
                imgs.append(u)
        d = os.path.join(OUT, code)
        os.makedirs(d, exist_ok=True)
        files = []
        for k, u in enumerate(imgs[:8], 1):
            fn = os.path.join(d, f'{k:02d}-{os.path.basename(u)}')
            if not os.path.exists(fn):
                data = get(u, binary=True)
                if len(data) < 2000:
                    continue
                open(fn, 'wb').write(data)
            files.append(os.path.relpath(fn, ROOT))
        entry.update({'estado': 'ok', 'url': page_url, 'titulo_autosolar': html.unescape(t.group(1).strip()) if t else '',
                      'fabricante': html.unescape(fab.group(1).strip()) if fab else '', 'imagenes': files})
        manifest[code] = entry
        print(f"[{i+1}/{len(prods)}] {code} OK {entry['fabricante']} · {entry['titulo_autosolar'][:60]} · {len(files)} img")
        json.dump(manifest, open(mpath, 'w'), indent=1, ensure_ascii=False)
    json.dump(manifest, open(mpath, 'w'), indent=1, ensure_ascii=False)


if __name__ == '__main__':
    main()
