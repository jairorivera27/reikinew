"""Descarga el detalle público de los productos de Amara NZero seleccionados (foto original,
descripción, detalles técnicos y documentos) → imagenes-proveedores/amara/detalles.json."""
import json, os, re, subprocess, time, html
from bs4 import BeautifulSoup
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
S = os.environ['SEL']
OUT = os.path.join(ROOT, 'imagenes-proveedores', 'amara')
UA = 'Mozilla/5.0 (ReikiSolar catalogo; info@reikisolar.com.co)'
def get(u, binary=False):
    time.sleep(15)  # ritmo pausado: el sitio muestra una espera anti-bot si se consulta rápido
    r = subprocess.run(['curl', '-sL', '--max-time', '60', '-A', UA, u], capture_output=True).stdout
    return r if binary else r.decode('utf-8', 'replace')
sel = json.load(open(S))
prev = json.load(open(os.path.join(OUT, 'detalles.json'))) if os.path.exists(os.path.join(OUT, 'detalles.json')) else {}
res = {}
for cat, nombre, precio, stock, specs, url in sel:
    cod = nombre.split(' - ')[0]
    if cod in prev and prev[cod].get('descripcion') and prev[cod].get('imagenes') and all(os.path.exists(f) for f in prev[cod]['imagenes']):
        res[cod] = prev[cod]; continue
    pagina = get('https://amaranzero.co' + url)
    if 'One moment, please' in pagina[:3000]:
        print(cod, 'espera anti-bot: se omite en esta pasada'); res[cod] = prev.get(cod, {}); continue
    soup = BeautifulSoup(pagina, 'html.parser')
    main = soup.find('main') or soup
    full = [i.get('src') for i in main.find_all('img') if i.get('src') and '/externals/' in i.get('src')]
    orig = []
    for s in full:
        m = re.search(r'/externals/([^?]+)', s)
        if m and m.group(1) not in [o.split('/')[-1] for o in orig]:
            orig.append('https://amaranzero.co/sites/default/files/externals/' + m.group(1))
    txt = re.sub(r'\s+', ' ', main.get_text(' '))
    desc = ''
    m = re.search(re.escape(cod) + r' - (.*?)(?: Inicia sesión y no te pierdas nada|$)', txt[txt.find(cod + ' - ', txt.find(cod + ' - ') + 5):])
    if m: desc = m.group(1).strip()
    det = {}
    m = re.search(r'Detalles técnicos (.*?)(?: Descripción| Descargas|$)', txt)
    if m: det['raw'] = m.group(1)[:600]
    prov = re.search(r'Código proveedor (.*?) ' + re.escape(cod), txt)
    docs = {}
    for a in main.find_all('a', href=True):
        h = a['href']
        if '.pdf' in h:
            tipo = re.search(r'/products-documents/co/[^/]+/([^/]+)/', h)
            docs.setdefault(html.unescape(tipo.group(1)).replace('%20', ' ').replace('%C3%A9', 'é') if tipo else 'doc', h)
    imgs = []
    for k, u in enumerate(orig[:3]):
        f = os.path.join(OUT, f'{cod}-{k}.png')
        if not os.path.exists(f):
            b = get(u, binary=True)
            if b[:4] == b'\x89PNG' or b[:3] == b'\xff\xd8\xff' or b[:4] == b'RIFF':
                open(f, 'wb').write(b)
            else:
                print('  imagen no descargada (espera anti-bot)', u)
        if os.path.exists(f): imgs.append(f)
    res[cod] = dict(cat=cat, nombre=nombre.split(' - ', 1)[1], precio=precio, stock=stock, specs_listado=specs, url=url,
                    descripcion=desc, detalles=det.get('raw', ''), codigo_proveedor=prov.group(1) if prov else '', docs=docs, imagenes=imgs)
    print(cod, len(imgs), 'img', list(docs), desc[:60])
json.dump(res, open(os.path.join(OUT, 'detalles.json'), 'w'), ensure_ascii=False, indent=1)
