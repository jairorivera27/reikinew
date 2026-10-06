"""
Parche único: a los productos ya importados de Ingesolar (sku ING-*) les agrega
  - stockBajo: true  cuando todas las bodegas con existencia están en "pocas".
  - certificadoPdf   descargando el certificado del fabricante si el proveedor lo publica.

No crea productos nuevos ni toca nada fuera de los que ya importamos.
Uso: python3 scripts/parche-ingesolar-stock-certificado.py
"""
import json, os, re, subprocess

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROD = os.path.join(ROOT, 'src', 'content', 'productos')
FICHAS = os.path.join(ROOT, 'public', 'fichas', 'proveedores')
data = json.load(open(os.path.join(ROOT, 'imagenes-proveedores', 'ingesolar', 'products.json'), encoding='utf-8'))
por_sku = {p['sku']: p for p in data}


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


def set_campo(fm, k, v):
    linea = f'{k}: {json.dumps(v, ensure_ascii=False)}'
    return re.sub(rf'^{k}:.*$', linea, fm, count=1, flags=re.M) if re.search(rf'^{k}:', fm, re.M) else fm + '\n' + linea


def main():
    n_bajo = n_cert = 0
    for f in sorted(os.listdir(PROD)):
        if not f.endswith('.md'):
            continue
        path = os.path.join(PROD, f)
        t = open(path, encoding='utf-8').read()
        m = re.match(r'---\n(.*?)\n---', t, re.S)
        if not m:
            continue
        fm = m.group(1)
        msku = re.search(r'^sku:\s*"ING-([^"]+)"', fm, re.M)
        if not msku:
            continue
        sku = msku.group(1)
        p = por_sku.get(sku)
        if not p:
            continue

        cambiado = False
        st = p.get('stock') or {}
        activos = [v for v in [st.get('medellin'), st.get('bogota'), st.get('villavicencio')] if v and v != 'agotado']
        if activos and all(v == 'pocas' for v in activos) and not re.search(r'^stockBajo:', fm, re.M):
            fm = set_campo(fm, 'stockBajo', True)
            cambiado = True
            n_bajo += 1

        if p.get('certificate') and not re.search(r'^certificadoPdf:', fm, re.M):
            fcert = descargar_ficha(p['certificate'], sku, sufijo='cert')
            if fcert:
                fm = set_campo(fm, 'certificadoPdf', fcert)
                cambiado = True
                n_cert += 1

        if cambiado:
            open(path, 'w', encoding='utf-8').write('---\n' + fm.strip('\n') + '\n---' + t[m.end():])

    print('stockBajo agregado a:', n_bajo)
    print('certificadoPdf agregado a:', n_cert)


if __name__ == '__main__':
    main()
