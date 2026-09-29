"""
Cuarta pasada: hojas oficiales localizadas por búsqueda web (docs/fichas-candidatas-web.json).
Descarga cada PDF, verifica que contenga la referencia (cadena_en_pdf; las que no tienen capa de
texto fueron verificadas con OCR) y asigna fichaPdf a los slugs indicados. Excluye las
equivalencias dudosas (ver EXCLUIR). Uso: python3 scripts/fichas-candidatas.py
"""
import json, os, re, subprocess, time
import pymupdf

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROD = os.path.join(ROOT, 'src', 'content', 'productos')
OUT = os.path.join(ROOT, 'public', 'fichas', 'fabricantes')
UA = 'Mozilla/5.0 (ReikiSolar catalogo; info@reikisolar.com.co)'
# equivalencias no confirmadas: mejor ficha resumen que una hoja de otro modelo
EXCLUIR_ARCHIVOS = {'goodwe-lynx-home-u-datasheet.pdf', 'hoymiles-dtu-pro-s-datasheet.pdf',
                    'astronergy-astro-n5-chsm72n-580-600-datasheet.pdf', 'growatt-smart-meter-tpm-ct-e-datasheet.pdf'}
SOLO_SLUGS_CON = {'deye-stick-logger-datasheet.pdf': r'LS4G-3'}  # no a los "datalogger Deye" genéricos
EXCLUIR_SLUG_RX = r'1708249'  # SKU con datos en conflicto (Pylontech vs GreenPoint)


def norm(s):
    return re.sub(r'[^A-Z0-9°]', '', s.upper())


def main():
    cand = json.load(open(os.path.join(ROOT, 'docs', 'fichas-candidatas-web.json')))
    rp = os.path.join(ROOT, 'docs', 'fichas-candidatas-asignadas.json')
    res = json.load(open(rp)) if os.path.exists(rp) else {}
    for c in cand:
        if c['archivo'] in EXCLUIR_ARCHIVOS:
            continue
        ruta = os.path.join(OUT, c['archivo'])
        if not os.path.exists(ruta):
            time.sleep(1)
            data = subprocess.run(['curl', '-sL', '--max-time', '120', '-A', UA, c['url']], capture_output=True).stdout
            if data[:4] != b'%PDF':
                print('sin PDF:', c['archivo']); continue
            open(ruta, 'wb').write(data)
        clave = norm(c.get('cadena_en_pdf') or '')
        if clave:
            txt = norm(' '.join(p.get_text() for p in pymupdf.open(ruta)))
            if clave not in txt:
                print('no verifica:', c['archivo'], clave); os.remove(ruta); continue
        n = 0
        for slug in c['slugs']:
            p = os.path.join(PROD, slug + '.md')
            if not os.path.exists(p) or re.search(EXCLUIR_SLUG_RX, slug):
                continue
            t = open(p, encoding='utf-8').read()
            m = re.match(r'---\n(.*?)\n---', t, re.S); fm = m.group(1)
            if re.search(r'^fichaPdf:', fm, re.M) or re.search(r'^draft:\s*true', fm, re.M):
                continue
            if c['archivo'] in SOLO_SLUGS_CON and not re.search(SOLO_SLUGS_CON[c['archivo']], fm):
                continue
            destino = '/fichas/fabricantes/' + c['archivo']
            open(p, 'w', encoding='utf-8').write('---\n' + fm + '\nfichaPdf: ' + json.dumps(destino) + '\n---' + t[m.end():])
            res[slug] = {'pdf': destino, 'fuente': c['url']}
            n += 1
        usado = any(v['pdf'].endswith('/' + c['archivo']) for v in res.values())
        if n == 0 and not usado and os.path.exists(ruta):
            os.remove(ruta)
        print(f"{c['archivo'][:52]:52} {n}")
    json.dump(res, open(os.path.join(ROOT, 'docs', 'fichas-candidatas-asignadas.json'), 'w'), indent=1, ensure_ascii=False)
    print('Asignadas:', len(res))


if __name__ == '__main__':
    main()
