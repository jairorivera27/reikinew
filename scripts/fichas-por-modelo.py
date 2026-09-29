"""
Segunda pasada de fichas técnicas: busca en Autosolar por la REFERENCIA del modelo
(p. ej. GW10K-SDT-30, FLA24171, Tracer-4210AN) a los productos que aún no tienen fichaPdf.

Verificación: solo acepta una página cuyo <title>/<h1> contiene la referencia completa
(comparada sin espacios ni guiones, y como palabra completa). Descarga el PDF de ficha
técnica (no manuales ni garantías) a public/fichas/proveedores/ y asigna fichaPdf.

Salida adicional: docs/fichas-por-modelo.json (slug → referencia, página, pdf).
Uso: python3 scripts/fichas-por-modelo.py [--dry-run]
"""
import html, json, os, re, subprocess, sys, time, urllib.parse

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROD = os.path.join(ROOT, 'src', 'content', 'productos')
OUTDIR = os.path.join(ROOT, 'public', 'fichas', 'proveedores')
UA = 'Mozilla/5.0 (ReikiSolar catalogo; info@reikisolar.com.co)'
EXCL = re.compile(r'account|assets|login|register|contacto|contact/|blog|all-reviews|manufacturers|cart/|fabricantes')
DRY = '--dry-run' in sys.argv
UNIDAD = re.compile(r'^\d+([.,]\d+)?(W|KW|KWH|WH|A|AH|V|VDC|VAC|VA|KA|MM)$|^IP\d\d$|^\d{4,7}$', re.I)


def get(url, binary=False):
    time.sleep(1.0)
    r = subprocess.run(['curl', '-sL', '--max-time', '60', '-A', UA, url], capture_output=True)
    return r.stdout if binary else r.stdout.decode('utf-8', 'replace')


def norm(s):
    return re.sub(r'[^A-Z0-9]', '', s.upper())


def referencias(title, model):
    fuente = model if model and model not in ('Accesorio/Monitor', 'N/A', 'WIFI', 'HESS', 'LEYU') else title
    toks = re.findall(r'[A-Za-z0-9][A-Za-z0-9./\-]{3,}[A-Za-z0-9]', fuente)
    out = []
    for t in toks:
        t = t.strip('.-/')
        if re.search(r'\d', t) and re.search(r'[A-Za-z]', t) and not UNIDAD.match(t) and len(norm(t)) >= 5:
            out.append(t)
    return sorted(set(out), key=len, reverse=True)[:2]


def contiene(texto, ref):
    # referencia completa como "palabra": no seguida ni precedida de otro alfanumérico
    t = re.sub(r'[\s\-_/.]', '', texto.upper())
    n = norm(ref)
    return re.search(rf'(?<![A-Z0-9]){re.escape(n)}(?![0-9])', t) is not None


def elegir_pdf(pdfs):
    fichas = [p for p in pdfs if not re.search(r'manual|garant|declara|certific|instal', urllib.parse.unquote(p), re.I)]
    return (fichas or [None])[0]


def nombre_local(url):
    base = urllib.parse.unquote(url.rsplit('/', 1)[-1])
    base = re.sub(r'[^A-Za-z0-9._-]+', '-', base.encode('ascii', 'ignore').decode() or base).strip('-').lower()
    return base if base.endswith('.pdf') else base + '.pdf'


def main():
    res = {}
    for f in sorted(os.listdir(PROD)):
        t = open(os.path.join(PROD, f), encoding='utf-8').read()
        m = re.match(r'---\n(.*?)\n---', t, re.S)
        fm = m.group(1)
        if re.search(r'^draft:\s*true', fm, re.M) or re.search(r'^fichaPdf:', fm, re.M):
            continue
        title = re.search(r'^title:\s*"?(.*?)"?$', fm, re.M).group(1)
        model = (re.search(r'^model:\s*"?([^"\n]*)', fm, re.M) or [0, ''])[1].strip()
        refs = referencias(title, model)
        if not refs:
            continue
        slug = f[:-3]
        hallado = None
        for ref in refs:
            busq = get('https://autosolar.co/search?q=' + urllib.parse.quote(ref))
            urls = list(dict.fromkeys(u for u in re.findall(r'https://autosolar\.co/[a-z0-9-]+/[a-z0-9-]+', busq) if not EXCL.search(u)))[:6]
            for u in urls:
                if norm(ref).lower()[:5] not in u.replace('-', ''):
                    continue
                page = get(u)
                cab = ' '.join(re.findall(r'<title>([^<]+)|<h1[^>]*>(.*?)</h1>', page, re.S)[0]) if '<title>' in page else ''
                cab = html.unescape(re.sub(r'<[^>]+>', ' ', ' '.join(x for tup in re.findall(r'<title>([^<]+)</title>|<h1[^>]*>(.*?)</h1>', page, re.S) for x in tup)))
                if not contiene(cab, ref):
                    continue
                pdfs = sorted(set(re.findall(r'https://cdn\.autosolar\.co/pdf/[^"\'\s<>]+?\.pdf', page)))
                pdf = elegir_pdf(pdfs)
                if pdf:
                    hallado = {'ref': ref, 'pagina': u, 'titulo': cab.strip()[:120], 'pdf_origen': pdf}
                    break
            if hallado:
                break
        if not hallado:
            print(f'--  {slug[:60]:60} {refs}')
            continue
        nombre = nombre_local(hallado['pdf_origen'])
        ruta = os.path.join(OUTDIR, nombre)
        if not DRY and not os.path.exists(ruta):
            data = get(hallado['pdf_origen'], binary=True)
            if data[:4] != b'%PDF':
                print(f'!!  {slug} PDF inválido')
                continue
            open(ruta, 'wb').write(data)
        hallado['pdf'] = '/fichas/proveedores/' + nombre
        res[slug] = hallado
        if not DRY:
            open(os.path.join(PROD, f), 'w', encoding='utf-8').write(
                '---\n' + fm + '\nfichaPdf: ' + json.dumps(hallado['pdf']) + '\n---' + t[m.end():])
        print(f'OK  {slug[:60]:60} {hallado["ref"]} → {nombre}')
    json.dump(res, open(os.path.join(ROOT, 'docs', 'fichas-por-modelo.json'), 'w'), indent=1, ensure_ascii=False)
    print('\nAsignadas:', len(res))


if __name__ == '__main__':
    main()
