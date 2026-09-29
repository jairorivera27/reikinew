"""
Tercera pasada de fichas técnicas: hojas de datos oficiales de fabricante (localizadas con
búsqueda web) para familias que no tiene ningún proveedor.

Verificación estricta: el PDF se asigna a un producto SOLO si la referencia del producto
(p. ej. GW10K-SDT-30, US5000, TSM-670DEG21C.20) aparece textualmente en el PDF
(comparación sin espacios/guiones). Si no aparece, no se asigna.

Salida: public/fichas/fabricantes/<archivo>.pdf, fichaPdf en cada producto y
docs/fichas-fabricantes-web.json. Uso: python3 scripts/fichas-fabricantes-web.py
"""
import json, os, re, subprocess, time, urllib.parse
import pymupdf

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROD = os.path.join(ROOT, 'src', 'content', 'productos')
OUT = os.path.join(ROOT, 'public', 'fichas', 'fabricantes')
UA = 'Mozilla/5.0 (ReikiSolar catalogo; info@reikisolar.com.co)'

# marca del producto a la que pertenece cada PDF (evita que una hoja de inversor que menciona
# baterías compatibles se asigne a esas baterías)
MARCA_PDF = {}

# (nombre local, URL de la hoja de datos del fabricante)
CANDIDATOS = [
    ('goodwe-sdt-g2-plus-datasheet-en.pdf', 'https://en.goodwe.com/Ftp/EN/Downloads/Datasheet/GW_SDT%20G2%20PLUS+_Datasheet-EN.pdf'),
    ('goodwe-sdt-g2-datasheet-en.pdf', 'https://en.goodwe.com/Ftp/EN/Downloads/Datasheet/GW_SDT%20G2_Datasheet-EN.pdf'),
    ('goodwe-sdt-g3-datasheet-en.pdf', 'https://en.goodwe.com/Ftp/EN/Downloads/Datasheet/GW_SDT-G3_Datasheet-EN.pdf'),
    ('goodwe-es-us-datasheet-en.pdf', 'http://us.goodwe.com/Ftp/EN/Downloads/Datasheet/GW_ES-US_Datasheet-EN.pdf'),
    ('deye-sun-5-8k-sg01lp1-us-ficha-es.pdf', 'https://es.deyeinverter.com/deyeinverter/2024/08/12/datasheet_sun-5-8k-sg01lp1-us_240810_es.pdf'),
    ('epever-tracer-an-10-40a-datasheet.pdf', 'https://www.epever.com/wp-content/uploads/2021/05/EPEVER-Datasheet-tracer-an10A-4OA.pdf'),
    ('pylontech-us3000c-datasheet-en.pdf', 'https://www.vpsolar.com/download/catalog/Storage/Pylontech/US3000C-Pylontech-datasheet-EN.pdf'),
    ('pylontech-us5000-datasheet-en.pdf', 'https://www.zcsazzurro.com/uploads/documetazione/Datasheet-battery-Pylontech-US5000-EN.pdf'),
    ('trina-vertex-n-neg21c20-datasheet.pdf', 'https://static.trinasolar.com/sites/default/files/Datasheet_NEG21C.20.pdf'),
    ('trina-vertex-deg21c20-datasheet-en.pdf', 'https://static.trinasolar.com/sites/default/files/Datasheet_Vertex_DEG21C.20_EN_2024_A.pdf'),
    ('jinko-tiger-neo-jkm565-585n-72hl4-v-en.pdf', 'https://jinkosolarcdn.shwebspace.com/uploads/JKM565-585N-72HL4-(V)-F3-EN.pdf'),
    ('studer-xtender-datasheet.pdf', 'https://www.europe-solarstore.com/download/studer/studer_xtender_series_datasheet.pdf'),
    ('huawei-sun2000-80k-mgl0-datasheet.pdf', 'https://solar.huawei.com/admin/asset/v1/pro/view/acc6a3013d9344ccbdb70f32f3b6d274.pdf'),
    ('apsystems-qt2-na-datasheet.pdf', 'https://www.chargesolar.com/documents/APsystems/APsystems_APS-QT2-208V_Datasheet_2025-02-27.pdf'),
    ('suntree-siso-40-ficha.pdf', 'https://base.sato-power.com/thtimages/ISOLATOR%20SW/suntree-SISO-40-Manual.pdf'),
]


def norm(s):
    return re.sub(r'[^A-Z0-9]', '', s.upper())


def referencia(title, model):
    fuente = ' '.join([model or '', title])
    toks = re.findall(r'[A-Za-z0-9][A-Za-z0-9./\-]{3,}[A-Za-z0-9]', fuente)
    malas = re.compile(r'^\d+([.,]\d+)?(W|KW|KWH|WH|A|AH|V|VDC|VAC|VA|KA)$|^IP\d\d$|^\d{4,}$', re.I)
    toks = [t for t in toks if re.search(r'\d', t) and re.search(r'[A-Za-z]', t) and not malas.match(t) and len(norm(t)) >= 5]
    return sorted(set(toks), key=len, reverse=True)


def main():
    os.makedirs(OUT, exist_ok=True)
    textos = {}
    for nombre, url in CANDIDATOS:
        ruta = os.path.join(OUT, nombre)
        if not os.path.exists(ruta):
            time.sleep(1)
            data = subprocess.run(['curl', '-sL', '--max-time', '90', '-A', UA, url], capture_output=True).stdout
            if data[:4] != b'%PDF':
                print('sin PDF:', nombre)
                continue
            open(ruta, 'wb').write(data)
        try:
            doc = pymupdf.open(ruta)
            textos[nombre] = (' ' + re.sub(r'\s+', ' ', re.sub(r'[^A-Z0-9\s]', '', re.sub(r'\s*[-/.]\s*', '', ' '.join(p.get_text() for p in doc).upper()))) + ' ', url)
        except Exception as e:
            print('ilegible:', nombre, e)
    for k in textos:
        MARCA_PDF[k] = {'goodwe': 'GoodWe', 'deye': 'Deye', 'epever': 'EPever', 'pylontech': 'Pylontech', 'trina': 'Trina Solar',
                        'jinko': 'Jinko Solar', 'studer': 'Studer', 'huawei': 'Huawei', 'apsystems': 'APsystems', 'suntree': 'Suntree'}[k.split('-')[0]]
    usados, res = set(), {}
    for f in sorted(os.listdir(PROD)):
        t = open(os.path.join(PROD, f), encoding='utf-8').read()
        m = re.match(r'---\n(.*?)\n---', t, re.S)
        fm = m.group(1)
        if re.search(r'^draft:\s*true', fm, re.M) or re.search(r'^fichaPdf:', fm, re.M):
            continue
        marca = (re.search(r'^brand:\s*"?([^"\n]*)', fm, re.M) or [0, ''])[1].strip()
        title = re.search(r'^title:\s*"?(.*?)"?$', fm, re.M).group(1)
        model = (re.search(r'^model:\s*"?([^"\n]*)', fm, re.M) or [0, ''])[1]
        for ref in referencia(title, model):
            n = norm(ref)
            hit = next((k for k, (txt, _) in textos.items() if re.search(rf'(?<![A-Z0-9]){n}(?![0-9])', txt) and MARCA_PDF[k] == marca), None)
            if hit:
                destino = '/fichas/fabricantes/' + hit
                open(os.path.join(PROD, f), 'w', encoding='utf-8').write('---\n' + fm + '\nfichaPdf: ' + json.dumps(destino) + '\n---' + t[m.end():])
                res[f[:-3]] = {'ref': ref, 'pdf': destino, 'fuente': textos[hit][1]}
                usados.add(hit)
                print(f'OK {f[:-3][:58]:58} {ref} → {hit}')
                break
    FAMILIAS = [  # (marca, regex en título+modelo, pdf, cadena que DEBE estar en el PDF)
        ('Trina Solar', r'DEG21C\.20', 'trina-vertex-deg21c20-datasheet-en.pdf', 'DEG21C20'),
        ('Trina Solar', r'NEG21C\.20', 'trina-vertex-n-neg21c20-datasheet.pdf', 'NEG21C20'),
        ('Studer', r'Xtm (2600|4000)-48', 'studer-xtender-datasheet.pdf', 'XTM400048'),
        ('Suntree', r'SISO-40', 'suntree-siso-40-ficha.pdf', 'SISO40'),
    ]
    for f in sorted(os.listdir(PROD)):
        t = open(os.path.join(PROD, f), encoding='utf-8').read()
        m = re.match(r'---\n(.*?)\n---', t, re.S)
        fm = m.group(1)
        if re.search(r'^draft:\s*true', fm, re.M) or re.search(r'^fichaPdf:', fm, re.M):
            continue
        marca = (re.search(r'^brand:\s*"?([^"\n]*)', fm, re.M) or [0, ''])[1].strip()
        texto = re.search(r'^title:\s*"?(.*?)"?$', fm, re.M).group(1) + ' ' + (re.search(r'^model:\s*"?([^"\n]*)', fm, re.M) or [0, ''])[1]
        for mm, rx, pdf, clave in FAMILIAS:
            if mm == marca and re.search(rx, texto) and pdf in textos and clave in textos[pdf][0].replace(' ', ''):
                destino = '/fichas/fabricantes/' + pdf
                open(os.path.join(PROD, f), 'w', encoding='utf-8').write('---\n' + fm + '\nfichaPdf: ' + json.dumps(destino) + '\n---' + t[m.end():])
                res[f[:-3]] = {'ref': rx, 'pdf': destino, 'fuente': textos[pdf][1], 'familia': True}
                usados.add(pdf)
                print(f'FAM {f[:-3][:58]:58} → {pdf}')
                break
    for nombre in list(textos):
        if nombre not in usados:
            os.remove(os.path.join(OUT, nombre))
            print('no usado (borrado):', nombre)
    json.dump(res, open(os.path.join(ROOT, 'docs', 'fichas-fabricantes-web.json'), 'w'), indent=1, ensure_ascii=False)
    print('\nAsignadas:', len(res))


if __name__ == '__main__':
    main()
