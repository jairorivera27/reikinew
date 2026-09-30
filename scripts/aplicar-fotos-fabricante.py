"""Aplica fotos oficiales (imagenes-proveedores/fabricantes-web/) a productos ocultos por falta de foto
y los publica. Serie = foto de la familia del fabricante (se muestra el aviso de referencia)."""
import os, re, sys, json, importlib.util
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('SEL', '/dev/null')
spec = importlib.util.spec_from_file_location('imp', os.path.join(ROOT, 'scripts', 'importar-amara.py'))
FOTOS = os.path.join(ROOT, 'imagenes-proveedores', 'fabricantes-web')
PROD = os.path.join(ROOT, 'src', 'content', 'productos')
# código → (slug existente o None para buscar por SKU AMZ-, serie de referencia o None)
PLAN = {
    '000-0003': (None, None), '000-0006': (None, 'Growatt SEM'), '001-0001': (None, 'Hoymiles AC Trunk'),
    '001-0003': (None, None), '001-0010': (None, None), '001-0011': (None, None), '001-0012': (None, None),
    '001-0014': (None, None), '001-0015': (None, None), '001-0017': (None, 'Hoymiles HMS Connection Cable'),
    '003-0001': (None, 'TE SOLARLOK PV4'), '006-0002': (None, 'Solis EPM3-5G'), '006-0011': (None, None),
    '100-0010': (None, 'JA Solar JAM66D45 (DeepBlue 4.0 Pro)'), '203-0018': (None, 'Solis S6-GC3P LV'),
    '300-0002': (None, None),
    '203-0014': ('cat-mayorista-5d8e08561d07', 'Solis S6-GR1P-S'), '203-0016': ('cat-mayorista-155584ad7685', 'Solis S5-GR3P LV'),
}
def main():
    imp = importlib.util.module_from_spec(spec)
    sys.argv = [sys.argv[0]]
    json_load = json.load
    spec.loader.exec_module(imp)
    hechos = []
    for cod, (slug, serie) in PLAN.items():
        foto = next((os.path.join(FOTOS, f) for f in os.listdir(FOTOS) if f.startswith(cod + '.')), None)
        if not foto: continue
        if not slug:
            slug = next((f[:-3] for f in os.listdir(PROD) if f.endswith('.md') and f'sku: "AMZ-{cod}"' in open(os.path.join(PROD, f), encoding='utf-8').read()), None)
        if not slug: continue
        p = os.path.join(PROD, slug + '.md')
        t = open(p, encoding='utf-8').read()
        m = re.match(r'---\n(.*?)\n---', t, re.S); fm = m.group(1)
        im, th, prov = imp.estudio(foto, slug)
        fm = imp.set_campo(fm, 'image', im); fm = imp.set_campo(fm, 'imageThumb', th)
        fm = imp.set_campo(fm, 'imagen_provisional', bool(prov or serie))
        if serie: fm = imp.set_campo(fm, 'imagenSerieRef', serie)
        fm = re.sub(r'^(draft|imagenPendiente):\s*true\n?', '', fm + '\n', flags=re.M).rstrip('\n')
        open(p, 'w', encoding='utf-8').write('---\n' + fm + '\n---' + t[m.end():])
        hechos.append(slug)
    print(len(hechos), 'publicados con foto')
main()
