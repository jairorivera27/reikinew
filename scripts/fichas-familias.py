"""
Asigna fichas técnicas por FAMILIA de producto (la hoja de datos del fabricante cubre
todos los modelos de la serie). Solo reglas verificadas a mano:

  - Suntree: series identificadas leyendo cada PDF (SL7N-63, SL7N-125D/DH, SCB8-63, SUP2*-PV).
  - Victron: hojas de datos oficiales en español (victronenergy.com/upload/documents/*-ES.pdf).

No pisa un fichaPdf existente. Uso: python3 scripts/fichas-familias.py
"""
import json, os, re, subprocess, time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROD = os.path.join(ROOT, 'src', 'content', 'productos')
VICTRON = 'https://www.victronenergy.com/upload/documents/'
OUT_FAB = os.path.join(ROOT, 'public', 'fichas', 'fabricantes')

# (marca, regex sobre título+modelo, ruta pública o URL Victron)
REGLAS = [
    ('Suntree', r'SL7N-63', '/fichas/proveedores/ficha-tecnica-breaker-dc-mcb-sl7n-63-suntree.pdf'),
    ('Suntree', r'SL7N-125D', '/fichas/proveedores/ficha-tcnica-breaker-solar-dc-1x80a-250v-suntree.pdf'),
    ('Suntree', r'SCB8-63', '/fichas/proveedores/ficha-tecnica-breakers-ac-suntree-1-.pdf'),
    ('Suntree', r'SUP2H?\d?-PV|SUP2-DC', '/fichas/proveedores/ficha-tecnica-dps-dc-suntree.pdf'),
    ('Victron', r'\bPhoenix (12|24|48)/(250|375|500|800|1200)\b', 'Datasheet-Inverter-VE.Direct-250VA-1600VA-ES.pdf'),
    ('Victron', r'\bMultiPlus (12/(800|1200|3000)|24/(2000|3000)|48/2000)\b', 'Datasheet-MultiPlus-inverter-charger-800VA-5kVA-ES.pdf'),
    ('Victron', r'\bQuattro (12|24|48)/(5000|10000|15000)\b', 'Datasheet-Quattro-3kVA-15kVA-ES.pdf'),
    ('Victron', r'BMV-712', 'Datasheet-BMV-712-Smart-ES.pdf'),
    ('Victron', r'Venus GX', 'Datasheet-Venus-GX-ES.pdf'),
    ('Victron', r'Ekrano GX', 'Datasheet-Ekrano-GX-ES.pdf'),
    ('Victron', r'SCC110050210', 'Datasheet-SmartSolar-charge-controller-MPPT-100-30-&-100-50-ES.pdf'),
    ('Victron', r'SCC1451[12]0\d{3}', 'Datasheet-SmartSolar-MPPT-RS-ES.pdf'),
]


def fm_de(path):
    t = open(path, encoding='utf-8').read()
    m = re.match(r'---\n(.*?)\n---', t, re.S)
    return t, m


def main():
    os.makedirs(OUT_FAB, exist_ok=True)
    descargas, asignados = {}, []
    for f in sorted(os.listdir(PROD)):
        t, m = fm_de(os.path.join(PROD, f))
        fm = m.group(1)
        if re.search(r'^draft:\s*true', fm, re.M) or re.search(r'^fichaPdf:', fm, re.M):
            continue
        marca = (re.search(r'^brand:\s*"?([^"\n]+)', fm, re.M) or [0, ''])[1]
        texto = ' '.join(filter(None, [re.search(r'^title:\s*"(.*)"', fm, re.M).group(1),
                                       (re.search(r'^model:\s*"?([^"\n]+)', fm, re.M) or [0, ''])[1]]))
        for m_, rx, destino in REGLAS:
            if m_ != marca or not re.search(rx, texto):
                continue
            if not destino.startswith('/'):
                if destino not in descargas:
                    time.sleep(1)
                    local = os.path.join(OUT_FAB, 'victron-' + destino.lower().replace('&', 'y'))
                    if not os.path.exists(local):
                        data = subprocess.run(['curl', '-sL', '--max-time', '90', VICTRON + destino], capture_output=True).stdout
                        if data[:4] != b'%PDF':
                            descargas[destino] = None
                            break
                        open(local, 'wb').write(data)
                    descargas[destino] = '/fichas/fabricantes/' + os.path.basename(local)
                destino = descargas[destino]
                if not destino:
                    break
            fm2 = fm + '\nfichaPdf: ' + json.dumps(destino)
            open(os.path.join(PROD, f), 'w', encoding='utf-8').write('---\n' + fm2 + '\n---' + t[m.end():])
            asignados.append((f[:-3], destino))
            break
    for s, d in asignados:
        print(f'{s[:62]:62} {d}')
    print(f'\nAsignadas: {len(asignados)}')


if __name__ == '__main__':
    main()
