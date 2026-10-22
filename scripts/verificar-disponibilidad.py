"""
Revisión diaria de disponibilidad en los proveedores Ingesolar, Autosolar y Amara NZero,
y actualización del campo `stock` (y `stockBajo`) de los productos de la tienda.

Reglas (las mismas de la actualización manual del 14/10/2026):
  - Ingesolar: semáforo público de stock por ciudad (product_stock). Con existencia en alguna
    ciudad -> "disponible" (stockBajo si todas las ciudades con existencia están en "pocas");
    agotado en todas -> "pre-orden".
  - Autosolar: ficha del producto (confirmando "Codigo de artículo"), availability schema.org.
    InStock -> "disponible"; cualquier otro -> "pre-orden".
  - Amara NZero: filtro público "Productos con stock" del catálogo. Con stock -> "disponible",
    sin stock -> "pre-orden".

Seguridad: si la consulta de un proveedor falla o es incompleta (muchos errores, o pasaría a
pre-orden más del 40 % de sus productos de golpe), NO se tocan los productos de ese proveedor y
se deja anotado en el reporte. Un producto que no se encuentra en el proveedor no se modifica, ni uno con `stockManual: true`
(estado fijado a mano por Reiki) o `draft: true` (oculto).

Salidas:
  - src/content/productos/*.md (solo las líneas stock / stockBajo)
  - data/disponibilidad-proveedores.json (estado de la última revisión + caché de URLs Autosolar)
  - <--reporte RUTA>.json con el detalle de la revisión (para el reporte diario)

Uso: python3 scripts/verificar-disponibilidad.py [--dry-run] [--reporte /ruta/reporte.json]
"""
import datetime, html, json, os, re, subprocess, sys, time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROD = os.path.join(ROOT, 'src', 'content', 'productos')
ESTADO = os.path.join(ROOT, 'data', 'disponibilidad-proveedores.json')
UA = 'Mozilla/5.0 (ReikiSolar catalogo; contacto info@reikisolar.com.co)'
DRY = '--dry-run' in sys.argv
REPORTE = sys.argv[sys.argv.index('--reporte') + 1] if '--reporte' in sys.argv else None
MAX_PREORDEN_NUEVOS = 0.40   # fracción máxima de productos de un proveedor que puede pasar a pre-orden en un día
MAX_ERRORES = 0.20           # fracción máxima de consultas fallidas por proveedor

ING_URL = 'https://etfgokqhqplejkbwmtsv.supabase.co/rest/v1/product_stock'
ING_KEY = 'sb_publishable_GIjtFdiYIJ4hj_NJX9HTrA_jbTqHYoP'  # llave pública del catálogo web de Ingesolar
AMARA_CATS = ['accesorios', 'estructuras', 'inversores', 'modulos', 'smart-home', 'baterias']


def curl(url, headers=(), pausa=1.0, tiempo=60):
    time.sleep(pausa)
    cmd = ['curl', '-sL', '--max-time', str(tiempo), '-A', UA, '-w', '\n%{http_code}']
    for h in headers:
        cmd += ['-H', h]
    r = subprocess.run(cmd + [url], capture_output=True)
    body, _, code = r.stdout.decode('utf-8', 'replace').rpartition('\n')
    return (int(code) if code.isdigit() else 0), body


# ---------------------------------------------------------------- productos de la tienda
def leer_productos():
    prov = json.load(open(os.path.join(ROOT, 'data', 'proveedores-tienda.json'), encoding='utf-8'))
    out = []
    for slug, info in prov.items():
        p = info.get('proveedor')
        if p not in ('Ingesolar', 'Autosolar', 'Amara NZero'):
            continue
        path = os.path.join(PROD, slug + '.md')
        if not os.path.exists(path):
            continue
        t = open(path, encoding='utf-8').read()
        m = re.match(r'---\n(.*?)\n---', t, re.S)
        if not m:
            continue
        fm = m.group(1)
        g = lambda k: (re.search(rf'^{k}:\s*"?([^"\n]*)"?\s*$', fm, re.M) or [None, None])[1]
        # Estado fijado a mano por Reiki (stockManual: true) u oculto (draft): la revisión diaria no lo toca.
        if g('stockManual') == 'true' or g('draft') == 'true':
            continue
        out.append({'slug': slug, 'proveedor': p, 'path': path, 'titulo': g('title') or info.get('titulo'),
                    'sku': (g('sku') or '').strip(), 'stock': g('stock'), 'stockBajo': g('stockBajo') == 'true'})
    return out


# ---------------------------------------------------------------- Ingesolar
def revisar_ingesolar(prods):
    filas = []
    for ini in range(0, 20000, 1000):
        code, body = curl(f'{ING_URL}?select=sku,ciudad,nivel&order=sku', pausa=0.5,
                          headers=[f'apikey: {ING_KEY}', f'Range: {ini}-{ini + 999}'])
        if code not in (200, 206):
            return None, f'Error HTTP {code} consultando el stock de Ingesolar'
        lote = json.loads(body)
        filas += lote
        if len(lote) < 1000:
            break
    if not filas:
        return None, 'Ingesolar no devolvió filas de stock'
    niveles = {}
    for f in filas:
        niveles.setdefault(f['sku'].upper(), {})[f['ciudad']] = f['nivel']
    res = {}
    for p in prods:
        sku = re.sub(r'^ING-', '', p['sku'], flags=re.I).upper()
        n = niveles.get(sku)
        if not n:
            res[p['slug']] = {'estado': 'no-encontrado'}
            continue
        con = {c: v for c, v in n.items() if v != 'agotado'}
        if con:
            res[p['slug']] = {'estado': 'ok', 'stock': 'disponible',
                              'stockBajo': all(v == 'pocas' for v in con.values()),
                              'detalle': ', '.join(f'{c}: {v}' for c, v in sorted(n.items()))}
        else:
            res[p['slug']] = {'estado': 'ok', 'stock': 'pre-orden', 'stockBajo': False,
                              'detalle': 'agotado en ' + ', '.join(sorted(n))}
    return res, None


# ---------------------------------------------------------------- Autosolar
EXCL = re.compile(r'account|assets|login|register|contacto|contact/|blog|all-reviews|manufacturers|cart/|fabricantes')


def disponibilidad_autosolar(html_txt):
    m = re.search(r'"availability"\s*:\s*"[^"]*schema\.org\\?/(\w+)"', html_txt)
    return m.group(1) if m else None


def revisar_autosolar(prods, cache):
    res, errores = {}, 0
    for p in prods:
        code = p['sku']
        url, page = cache.get(code), None
        if url:
            st, h = curl(url)
            m = re.search(r'Codigo de art[ií]culo:\s*([0-9A-Za-z.-]+)', h)
            if st == 200 and m and m.group(1) == code:
                page = h
            elif st == 0 or st >= 500:
                errores += 1
                res[p['slug']] = {'estado': 'error', 'detalle': f'HTTP {st}'}
                continue
        if page is None:
            st, busq = curl(f'https://autosolar.co/search?q={code}')
            if st != 200:
                errores += 1
                res[p['slug']] = {'estado': 'error', 'detalle': f'búsqueda HTTP {st}'}
                continue
            urls = sorted({u for u in re.findall(r'https://autosolar\.co/[a-z0-9-]+/[a-z0-9-]+', busq) if not EXCL.search(u)})
            for u in urls[:6]:
                st, h = curl(u)
                m = re.search(r'Codigo de art[ií]culo:\s*([0-9A-Za-z.-]+)', h)
                if st == 200 and m and m.group(1) == code:
                    url, page = u, h
                    break
        if page is None:
            res[p['slug']] = {'estado': 'no-encontrado'}
            continue
        cache[code] = url
        av = disponibilidad_autosolar(page)
        if not av:
            res[p['slug']] = {'estado': 'no-encontrado', 'detalle': 'ficha sin dato de disponibilidad', 'url': url}
            continue
        res[p['slug']] = {'estado': 'ok', 'stock': 'disponible' if av == 'InStock' else 'pre-orden',
                          'stockBajo': False, 'detalle': av, 'url': url}
    return res, errores


# ---------------------------------------------------------------- Amara NZero
def codigos_amara(cat, con_stock):
    vistos, pagina = set(), 0
    while pagina < 30:
        q = f'?f%5B0%5D=stock%3A1&page={pagina}' if con_stock else f'?page={pagina}'
        st, h = curl(f'https://amaranzero.co/tienda/{cat}{q}', pausa=15)  # ritmo pausado: el sitio tiene espera anti-bot
        if st == 404 and pagina == 0:
            return set()
        if st != 200:
            raise RuntimeError(f'HTTP {st} en {cat} página {pagina}')
        # los productos del listado vienen en la capa de datos de analítica ("item_id"); así no se
        # cuentan los destacados del encabezado
        nuevos = set(re.findall(r'"item_id":"(\d{3}-\d{4})"', h)) - vistos
        if not nuevos:
            break
        vistos |= nuevos
        pagina += 1
    return vistos


def revisar_amara(prods):
    try:
        con_stock = set()
        for c in AMARA_CATS:
            con_stock |= codigos_amara(c, True)
    except RuntimeError as e:
        return None, f'Amara NZero: {e}'
    res = {}
    for p in prods:
        cod = re.sub(r'^AMZ-', '', p['sku'], flags=re.I)
        if not re.fullmatch(r'\d{3}-\d{4}', cod):
            res[p['slug']] = {'estado': 'no-encontrado', 'detalle': 'sku sin código Amara'}
            continue
        ok = cod in con_stock
        res[p['slug']] = {'estado': 'ok', 'stock': 'disponible' if ok else 'pre-orden', 'stockBajo': False,
                          'detalle': 'con stock' if ok else 'sin stock en el catálogo'}
    if not con_stock:
        return None, 'Amara NZero no mostró ningún producto con stock (posible bloqueo o cambio del sitio)'
    return res, None


# ---------------------------------------------------------------- aplicar
def set_campo(t, k, v):
    m = re.match(r'---\n(.*?)\n---', t, re.S)
    fm = m.group(1)
    if v is None:
        fm2 = re.sub(rf'^{k}:.*\n?', '', fm, flags=re.M).rstrip('\n')
    else:
        linea = f'{k}: {json.dumps(v, ensure_ascii=False)}'
        fm2 = re.sub(rf'^{k}:.*$', linea, fm, count=1, flags=re.M) if re.search(rf'^{k}:', fm, re.M) else fm + '\n' + linea
    return t[:m.start(1)] + fm2 + t[m.end(1):]


def main():
    hoy = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=-5))).strftime('%Y-%m-%d %H:%M')
    estado = json.load(open(ESTADO, encoding='utf-8')) if os.path.exists(ESTADO) else {}
    cache = estado.get('autosolar_urls', {})
    prods = leer_productos()
    por = lambda n: [p for p in prods if p['proveedor'] == n]
    resultados, avisos, aplicado = {}, [], {}

    for nombre, fn in (('Ingesolar', lambda ps: revisar_ingesolar(ps)),
                       ('Autosolar', None),
                       ('Amara NZero', lambda ps: revisar_amara(ps))):
        ps = por(nombre)
        print(f'== {nombre}: {len(ps)} productos', flush=True)
        if nombre == 'Autosolar':
            r, errores = revisar_autosolar(ps, cache)
            err = f'Autosolar: {errores} de {len(ps)} consultas fallaron' if ps and errores / len(ps) > MAX_ERRORES else None
        else:
            r, err = fn(ps)
        if err:
            avisos.append(err + ' — no se modificaron sus productos.')
            aplicado[nombre] = False
            r = r or {}
        else:
            nuevos_pre = [p for p in ps if r.get(p['slug'], {}).get('stock') == 'pre-orden' and p['stock'] != 'pre-orden']
            if ps and len(nuevos_pre) / len(ps) > MAX_PREORDEN_NUEVOS:
                avisos.append(f'{nombre}: {len(nuevos_pre)} de {len(ps)} productos pasarían a pre-orden de golpe; '
                              'parece un fallo de la consulta, así que no se modificaron. Revisar a mano.')
                aplicado[nombre] = False
            else:
                aplicado[nombre] = True
        resultados[nombre] = r

    filas, cambios = [], []
    for p in prods:
        r = resultados.get(p['proveedor'], {}).get(p['slug'], {'estado': 'sin-revisar'})
        nuevo_stock, nuevo_bajo = p['stock'], p['stockBajo']
        if r.get('estado') == 'ok' and aplicado.get(p['proveedor']):
            nuevo_stock, nuevo_bajo = r['stock'], bool(r.get('stockBajo')) and r['stock'] == 'disponible'
        cambio = (nuevo_stock != p['stock']) or (nuevo_bajo != p['stockBajo'])
        if cambio:
            cambios.append({'slug': p['slug'], 'titulo': p['titulo'], 'proveedor': p['proveedor'],
                            'antes': p['stock'] + (' (pocas)' if p['stockBajo'] else ''),
                            'ahora': nuevo_stock + (' (pocas)' if nuevo_bajo else '')})
            if not DRY:
                t = open(p['path'], encoding='utf-8').read()
                t = set_campo(t, 'stock', nuevo_stock)
                t = set_campo(t, 'stockBajo', True if nuevo_bajo else None)
                open(p['path'], 'w', encoding='utf-8').write(t)
        filas.append({'slug': p['slug'], 'titulo': p['titulo'], 'proveedor': p['proveedor'], 'sku': p['sku'],
                      'stock': nuevo_stock, 'stockBajo': nuevo_bajo, 'consulta': r.get('estado'),
                      'detalle': r.get('detalle', ''), 'cambio': cambio})

    reporte = {'fecha': hoy, 'avisos': avisos, 'aplicado': aplicado, 'cambios': cambios, 'productos': filas}
    if not DRY:
        estado = {'ultima_revision': hoy, 'autosolar_urls': dict(sorted(cache.items())),
                  'productos': {f['slug']: {'stock': f['stock'], 'stockBajo': f['stockBajo'], 'consulta': f['consulta']}
                                for f in filas}}
        json.dump(estado, open(ESTADO, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    if REPORTE:
        json.dump(reporte, open(REPORTE, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    import collections
    print('Resumen:', dict(collections.Counter((f['proveedor'], f['stock'], f['consulta']) for f in filas)))
    print(f'Cambios: {len(cambios)}')
    for c in cambios:
        print(f"  {c['proveedor']}: {c['titulo']} — {c['antes']} -> {c['ahora']}")
    for a in avisos:
        print('AVISO:', a)


if __name__ == '__main__':
    main()
