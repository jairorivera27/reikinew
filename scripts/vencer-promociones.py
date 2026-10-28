"""
Cierra las promociones con fecha de vencimiento (campo `promocionHasta: "AAAA-MM-DD"`).

Para cada producto cuya `promocionHasta` ya pasó (hora de Bogotá):
  - `price` vuelve a ser `precioAnterior` (el precio normal antes de la promoción),
  - se quitan `precioAnterior`, `descuentoPct`, `promocion` y `promocionHasta`.

Los demás productos no se tocan. Uso:
  python3 scripts/vencer-promociones.py [--dry-run] [--hoy AAAA-MM-DD]
"""
import datetime, json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROD = os.path.join(ROOT, 'src', 'content', 'productos')
DRY = '--dry-run' in sys.argv
if '--hoy' in sys.argv:
    HOY = sys.argv[sys.argv.index('--hoy') + 1]
else:
    HOY = (datetime.datetime.utcnow() - datetime.timedelta(hours=5)).strftime('%Y-%m-%d')  # Bogotá, UTC-5


def main():
    cerradas = []
    for f in sorted(os.listdir(PROD)):
        if not f.endswith('.md'):
            continue
        path = os.path.join(PROD, f)
        t = open(path, encoding='utf-8').read()
        m = re.match(r'---\n(.*?)\n---', t, re.S)
        if not m:
            continue
        fm = m.group(1)
        hasta = re.search(r'^promocionHasta:\s*"?(\d{4}-\d{2}-\d{2})"?\s*$', fm, re.M)
        if not hasta or hasta.group(1) >= HOY:
            continue
        antes = re.search(r'^precioAnterior:\s*"?([^"\n]+)"?\s*$', fm, re.M)
        if antes:
            fm = re.sub(r'^price:.*$', f'price: {json.dumps(antes.group(1), ensure_ascii=False)}', fm, count=1, flags=re.M)
        fm = re.sub(r'^(precioAnterior|descuentoPct|promocion|promocionHasta):.*\n?', '', fm, flags=re.M)
        cerradas.append((f[:-3], antes.group(1) if antes else '(sin precio anterior)'))
        if not DRY:
            open(path, 'w', encoding='utf-8').write('---\n' + fm.strip('\n') + '\n---' + t[m.end():])
    print(f'Hoy {HOY}: {len(cerradas)} promociones vencidas' + (' (simulación)' if DRY else ''))
    for slug, precio in cerradas:
        print(f'  {slug} -> {precio}')


if __name__ == '__main__':
    main()
