"""
Descarga fichas técnicas (PDF) desde la página del proveedor de cada producto y extrae
datos técnicos para enriquecer descripciones.

Fuentes (solo productos ya emparejados con verificación):
  - docs/lote2-decisiones.json      → código de artículo Autosolar (manifest autosolar-codigo)
  - docs/lote1-decisiones.json      → Autosolar (página del producto) o Solaire (código NFIN/NFAC)

Salida:
  public/fichas/proveedores/<archivo>.pdf   (un PDF por URL, compartido entre SKUs)
  docs/fichas-proveedores.json              (slug → pdf, fuente, specs, bullets)
  y el campo fichaPdf en cada producto (no pisa uno existente salvo --forzar).

Uso: python3 scripts/fichas-proveedores.py [--forzar]
Autorización de uso de contenido Solaire/Autosolar: 2026-09-28.
"""
import csv, html, json, os, re, subprocess, sys, time, urllib.parse

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROD = os.path.join(ROOT, 'src', 'content', 'productos')
OUTDIR = os.path.join(ROOT, 'public', 'fichas', 'proveedores')
FORZAR = '--forzar' in sys.argv
UA = 'Mozilla/5.0 (ReikiSolar catalogo; info@reikisolar.com.co)'
SOLAIRE_PDF = 'https://portal.solaire.com.co/wp-content/uploads/productos-pdf/ITEMS%20DE%20SAP%20PARA%20GLOBAL%20PAGINA/{code}_{tipo}.pdf'


def curl(url, binary=False, head=False):
    time.sleep(1.0)
    args = ['curl', '-sL', '--max-time', '60', '-A', UA]
    if head:
        args += ['-o', '/dev/null', '-w', '%{http_code} %{content_type}']
    r = subprocess.run(args + [url], capture_output=True)
    return r.stdout if binary else r.stdout.decode('utf-8', 'replace')


def limpio(x):
    x = re.sub(r'<[^>]+>', ' ', x)
    return html.unescape(re.sub(r'\s+', ' ', x)).strip()


def pagina_autosolar(url):
    t = curl(url)
    pdfs = sorted(set(re.findall(r'https://cdn\.autosolar\.co/pdf/[^"\'\s<>]+?\.pdf', t)))
    specs = {}
    i = t.find('id="specification"')
    if i > 0:
        for li in re.findall(r'<li[^>]*>(.*?)</li>', t[i:i + 8000], re.S):
            s = limpio(li)
            if ':' in s:
                k, v = s.split(':', 1)
                if k.strip() and v.strip():
                    specs[k.strip()] = v.strip()
    bullets = []
    j = t.find('id="description"')
    if j > 0:
        seg = t[j:t.find('id="specification"', j) if t.find('id="specification"', j) > 0 else j + 60000]
        for li in re.findall(r'<li[^>]*>(.*?)</li>', seg, re.S):
            s = limpio(li)
            if 8 < len(s) < 180 and re.search(r'\d', s):
                bullets.append(s)
    return pdfs, specs, bullets[:20]


def elegir_pdf(pdfs):
    fichas = [p for p in pdfs if not re.search(r'manual|garant|declara|certific', urllib.parse.unquote(p), re.I)]
    return (fichas or pdfs or [None])[0]


def nombre_local(url):
    base = urllib.parse.unquote(url.rsplit('/', 1)[-1])
    base = re.sub(r'[^A-Za-z0-9._-]+', '-', base.encode('ascii', 'ignore').decode() or base).strip('-').lower()
    return base if base.endswith('.pdf') else base + '.pdf'


def set_fm(slug, key, value):
    p = os.path.join(PROD, slug + '.md')
    t = open(p, encoding='utf-8').read()
    m = re.match(r'---\n(.*?)\n---', t, re.S)
    fm = m.group(1)
    line = f'{key}: {json.dumps(value, ensure_ascii=False)}'
    if re.search(rf'^{key}:', fm, re.M):
        if not FORZAR:
            return False
        fm = re.sub(rf'^{key}:.*$', line, fm, flags=re.M)
    else:
        fm += '\n' + line
    open(p, 'w', encoding='utf-8').write('---\n' + fm + '\n---' + t[m.end():])
    return True


def main():
    os.makedirs(OUTDIR, exist_ok=True)
    fuentes = {}  # slug -> dict(tipo, url|code, match)
    m2 = json.load(open(os.path.join(ROOT, 'imagenes-proveedores/autosolar-codigo/manifest.json')))
    por_codigo = {k: v for k, v in m2.items() if v.get('estado') == 'ok'}
    for slug, d in json.load(open(os.path.join(ROOT, 'docs/lote2-decisiones.json'))).items():
        cod = d.get('codigo') or re.search(r'/(\d{7})/', d['src']).group(1)
        if cod in por_codigo:
            fuentes[slug] = {'tipo': 'autosolar', 'url': por_codigo[cod]['url'], 'match': d['match']}
    # Felicity 16 kWh (lote 2 inicial) y demás por código visible
    for cod, v in por_codigo.items():
        if not v['oculto'] and v['slug'] not in fuentes and cod not in {'1708249', '3004247', '3004613', '3202011'}:
            fuentes[v['slug']] = {'tipo': 'autosolar', 'url': v['url'], 'match': 'exacto'}
    pagina_de_img = {}
    with open(os.path.join(ROOT, 'imagenes-proveedores/manifest.csv'), encoding='utf-8-sig') as f:
        for r in csv.DictReader(f):
            m = re.search(r'page=(\S+)', r.get('notas', ''))
            if m:
                pagina_de_img[r['archivo_local']] = m.group(1)
    for slug, d in json.load(open(os.path.join(ROOT, 'docs/lote1-decisiones.json'))).items():
        if slug in fuentes:
            continue
        code = re.search(r'(NF(?:IN|AC)\d{4})', d['src'])
        if code:
            fuentes[slug] = {'tipo': 'solaire', 'code': code.group(1), 'match': d['match']}
        elif d['src'] in pagina_de_img:
            fuentes[slug] = {'tipo': 'autosolar', 'url': pagina_de_img[d['src']], 'match': d['match']}

    cache, salida, descargados = {}, {}, {}
    for i, (slug, f) in enumerate(sorted(fuentes.items())):
        if not os.path.exists(os.path.join(PROD, slug + '.md')):
            continue
        clave = f.get('url') or f.get('code')
        if clave not in cache:
            if f['tipo'] == 'autosolar':
                pdfs, specs, bullets = pagina_autosolar(f['url'])
                cache[clave] = {'pdf': elegir_pdf(pdfs), 'pdfs': pdfs, 'specs': specs, 'bullets': bullets, 'fuente': f['url']}
            else:
                pdf = SOLAIRE_PDF.format(code=f['code'], tipo='FICHA')
                ok = curl(pdf, head=True).startswith('200')
                cache[clave] = {'pdf': pdf if ok else None, 'pdfs': [pdf] if ok else [], 'specs': {}, 'bullets': [],
                                'fuente': f'Solaire {f["code"]}'}
        c = cache[clave]
        local = None
        if c['pdf']:
            if c['pdf'] not in descargados:
                nombre = nombre_local(c['pdf'])
                if f['tipo'] == 'solaire':
                    nombre = f'solaire-{f["code"].lower()}-ficha.pdf'
                ruta = os.path.join(OUTDIR, nombre)
                if not os.path.exists(ruta):
                    data = curl(c['pdf'], binary=True)
                    if data[:4] == b'%PDF':
                        open(ruta, 'wb').write(data)
                    else:
                        ruta = None
                descargados[c['pdf']] = f'/fichas/proveedores/{nombre}' if ruta else None
            local = descargados[c['pdf']]
        cambiado = set_fm(slug, 'fichaPdf', local) if local else False
        salida[slug] = {**{k: c[k] for k in ('fuente', 'specs', 'bullets')}, 'pdf': local, 'match': f['match']}
        print(f'[{i + 1}/{len(fuentes)}] {slug[:60]:60} {"PDF" if local else "sin PDF"}{" (nuevo)" if cambiado else ""}')
    json.dump(salida, open(os.path.join(ROOT, 'docs/fichas-proveedores.json'), 'w'), indent=1, ensure_ascii=False)
    total = len(salida)
    con = sum(1 for v in salida.values() if v['pdf'])
    print(f'\nProductos con fuente: {total} · con ficha PDF: {con} · PDFs únicos: {len([v for v in descargados.values() if v])}')


if __name__ == '__main__':
    main()
