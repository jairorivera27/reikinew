#!/usr/bin/env python3
"""
Lista Interna (Pedidos) <-> productos de la tienda, con su proveedor.

Úsalo cada vez que cambie el catálogo de la tienda (src/content/productos):

    python scripts/lista-interna-proveedores.py "data/Catalogo_Reiki_Publico_SEO_Perfecto_Final.xlsx"

Hace dos cosas:
1. Reescribe la hoja "Lista Interna (Pedidos)" del Excel con los productos VISIBLES de
   la tienda (sin draft), cada uno con su proveedor, costo y precio actual. Las filas
   antiguas que ya no están en la tienda pasan a la hoja "No están en la tienda".
   El Excel es interno (costos): NO se sube al repositorio.
2. Genera data/proveedores-tienda.json  (slug -> proveedor) que usa el dashboard
   /admin/pedidos para mostrar de qué proveedor es cada equipo. Solo lleva el nombre
   del proveedor, su código y el título del producto, nunca costos (el repositorio es público).

Cómo se decide el proveedor de cada producto (en este orden):
  a) Si la hoja Lista Interna ya tiene la fila con ese "ID tienda", se respeta
     (así una corrección hecha a mano en el Excel no se pierde).
  b) Marcas de importación: sku ING-* / "Proveedor: Ingesolar" -> Ingesolar,
     sku AMZ-* -> Amara NZero, sku HARDY-* -> Hardy Solar Energy.
  c) Coincidencia con la Lista Interna por modelo/código, luego por nombre,
     luego por marca + precio de venta, luego por precio único.
  d) cat-mayorista-* (lista de precios mayorista) -> "Por confirmar (lista mayorista)".
  e) Si nada coincide: "Por confirmar".
"""
import collections
import glob
import json
import os
import re
import sys

import openpyxl
import yaml
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.utils import get_column_letter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROD_DIR = os.path.join(ROOT, 'src', 'content', 'productos')
OUT_JSON = os.path.join(ROOT, 'data', 'proveedores-tienda.json')
HOJA = 'Lista Interna (Pedidos)'
HOJA_FUERA = 'No están en la tienda'
POR_CONFIRMAR = 'Por confirmar'

# Productos que importer scripts tomaron de otro proveedor (scripts/importar-amara.py).
AMARA_PREVIOS = {
    'cat-mayorista-b620fe40c0b9', 'cat-mayorista-5d8e08561d07', 'cat-mayorista-eb335fe74372',
    'cat-mayorista-f2e0b9820012', 'cat-mayorista-155584ad7685', 'cat-mayorista-67f802e82020',
}

# Productos que ya vendíamos y pasaron a comprarse a Ingesolar (commit a4d500e).
INGESOLAR_PREVIOS = {'datalogger-deye-ls4g-3', 'epever-ipt2000'}

PROV_MAYORISTA = 'Por confirmar (lista mayorista)'

CATEGORIA = {
    'paneles': 'Panel Solar', 'inversores': 'Inversor', 'baterias': 'Batería',
    'reflectores': 'Luminaria', 'controladores': 'Controlador', 'protecciones': 'Protección',
    'bombeo': 'Bomba', 'accesorios': 'Accesorio', 'aires-acondicionados': 'Aire Acondicionado',
}

COLS = [
    'Proveedor', 'Categoría', 'Marca', 'Nombre', 'Modelo', 'Potencia',
    'Costo Base Proveedor (COP)', 'Precio Venta al Público (COP)', 'Margen Utilidad',
    'Código proveedor / SKU', 'ID tienda', 'Estado en tienda', 'Origen del dato',
]


def norm(s):
    return re.sub(r'[^a-z0-9]', '', str(s or '').lower())


def precio(s):
    return int(re.sub(r'\D', '', str(s or '')) or 0)


def leer_productos():
    out = []
    for f in sorted(glob.glob(os.path.join(PROD_DIR, '*.md'))):
        t = open(f, encoding='utf-8').read()
        m = re.match(r'^---\r?\n(.*?)\r?\n---\r?\n?(.*)$', t, re.S)
        if not m:
            continue
        fm = yaml.safe_load(m.group(1)) or {}
        fm['_slug'] = os.path.basename(f)[:-3]
        fm['_body'] = m.group(2)
        out.append(fm)
    return out


def leer_lista(wb):
    ws = wb[HOJA]
    head = [c.value for c in ws[1]]
    filas = []
    for r in ws.iter_rows(min_row=2, values_only=True):
        if not r or not r[3]:
            continue
        filas.append(dict(zip(head, r)))
    return filas


def main():
    xlsx = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'data', 'Catalogo_Reiki_Publico_SEO_Perfecto_Final.xlsx')
    wb = openpyxl.load_workbook(xlsx)
    lista = leer_lista(wb)
    productos = leer_productos()

    por_id = {str(r.get('ID tienda')): r for r in lista if r.get('ID tienda')}
    por_modelo, por_nombre = collections.defaultdict(list), collections.defaultdict(list)
    por_marca_precio, por_precio = collections.defaultdict(list), collections.defaultdict(list)
    for r in lista:
        if r.get('ID tienda'):
            continue  # filas ya ligadas a un producto: solo se usan por ID
        k = norm(r.get('Modelo'))
        if k and k != 'na':
            por_modelo[k].append(r)
        k = norm(r.get('Código proveedor / SKU'))
        if k:
            por_modelo[k].append(r)
        por_nombre[norm(r.get('Nombre'))].append(r)
        pv = int(r.get('Precio Venta al Público (COP)') or 0)
        por_marca_precio[(str(r.get('Marca') or '').lower(), pv)].append(r)
        por_precio[pv].append(r)

    usadas = set()
    filas, mapa = [], {}
    stats = collections.Counter()

    for p in productos:
        slug, sku, body = p['_slug'], str(p.get('sku') or ''), p.get('_body', '')
        pv = precio(p.get('price'))
        prov, fila, origen, codigo, margen = None, None, '', sku or (p.get('model') or ''), None

        if slug in por_id:
            fila = por_id[slug]
            prov, origen = fila.get('Proveedor'), 'Lista Interna (ID tienda)'
        elif sku.startswith('ING-') or 'Proveedor: Ingesolar' in body or slug in INGESOLAR_PREVIOS:
            prov, origen, margen = 'Ingesolar', 'Importación Ingesolar (costo = precio / 1,30)', '30%'
        elif sku.startswith('AMZ-') or slug in AMARA_PREVIOS:
            prov, origen, margen = 'Amara NZero', 'Importación Amara (costo = precio / 1,30)', '30%'
        elif sku.upper().startswith('HARDY'):
            prov, origen = 'Hardy Solar Energy', 'Importación Hardy'
        elif slug.startswith('cat-mayorista-'):
            # data/lista-precios-mayorista.txt: precio tienda = costo x 1,20. El nombre del
            # mayorista no está registrado; corrígelo en el Excel y se respetará (ID tienda).
            prov, origen, margen = PROV_MAYORISTA, 'Lista de precios mayorista (costo = precio / 1,20)', '20%'
        if prov is None or (fila is None and prov == 'Hardy Solar Energy'):
            cand = None
            for k in (norm(p.get('model')), norm(sku)):
                if k and por_modelo.get(k):
                    cand, origen = por_modelo[k], 'Lista Interna (modelo)'
                    break
            if not cand and por_nombre.get(norm(p.get('title'))):
                cand, origen = por_nombre[norm(p.get('title'))], 'Lista Interna (nombre)'
            if not cand and por_marca_precio.get((str(p.get('brand') or '').lower(), pv)):
                cand, origen = por_marca_precio[(str(p.get('brand') or '').lower(), pv)], 'Lista Interna (marca + precio)'
            if not cand and por_precio.get(pv) and len({c.get('Proveedor') for c in por_precio[pv]}) == 1:
                cand, origen = por_precio[pv], 'Lista Interna (precio)'
            if cand:
                libres = [c for c in cand if id(c) not in usadas] or cand
                fila = libres[0]
                prov = prov or fila.get('Proveedor')
        if fila is not None:
            usadas.add(id(fila))
        prov = prov or POR_CONFIRMAR
        if prov == POR_CONFIRMAR:
            origen = 'Sin coincidencia: confirmar proveedor'

        # costo
        costo = None
        if fila is not None and fila.get('Costo Base Proveedor (COP)'):
            costo = int(fila['Costo Base Proveedor (COP)'])
            margen = fila.get('Margen Utilidad') or margen
            codigo = fila.get('Código proveedor / SKU') or codigo
        elif margen == '30%' and pv:
            costo = round(pv / 1.30)
        elif margen == '20%' and pv:
            costo = round(pv / 1.20)

        mapa[slug] = {'proveedor': prov, 'titulo': str(p.get('title') or '')}
        if codigo:
            mapa[slug]['codigo'] = str(codigo)

        if p.get('draft'):
            continue
        stats[prov] += 1
        stock = {'disponible': 'Disponible', 'agotado': 'Agotado', 'pre-orden': 'Pre-orden'}.get(p.get('stock'), p.get('stock') or '')
        filas.append([
            prov, CATEGORIA.get(p.get('category'), p.get('category')), p.get('brand') or '',
            p.get('title'), p.get('model') or (fila or {}).get('Modelo') or '', p.get('power') or (fila or {}).get('Potencia') or '',
            costo, pv or None, margen or '', str(codigo or ''), slug, stock, origen,
        ])

    filas.sort(key=lambda r: (str(r[0]).startswith(POR_CONFIRMAR), r[0], r[1] or '', r[3] or ''))

    # filas antiguas que ya no están en la tienda
    fuera = [r for r in lista if id(r) not in usadas and str(r.get('ID tienda') or '') not in mapa]

    # --- escribir hoja principal ---
    idx = wb.sheetnames.index(HOJA)
    del wb[HOJA]
    ws = wb.create_sheet(HOJA, idx)
    escribir(ws, COLS, filas)
    wb.active = idx

    if HOJA_FUERA in wb.sheetnames:
        previas = [dict(zip([c.value for c in wb[HOJA_FUERA][1]], r)) for r in wb[HOJA_FUERA].iter_rows(min_row=2, values_only=True) if r and r[3]]
        del wb[HOJA_FUERA]
    else:
        previas = []
    vistos, filas_fuera = set(), []
    for r in previas + fuera:
        key = (r.get('Proveedor'), r.get('Nombre'), r.get('Modelo'), r.get('Costo Base Proveedor (COP)'))
        if key in vistos or str(r.get('ID tienda') or '') in mapa:
            continue
        vistos.add(key)
        filas_fuera.append([r.get(c, '') if c in r else '' for c in COLS[:10]])
    ws2 = wb.create_sheet(HOJA_FUERA, idx + 1)
    escribir(ws2, COLS[:10], filas_fuera)

    wb.save(xlsx)
    json.dump(dict(sorted(mapa.items())), open(OUT_JSON, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    open(OUT_JSON, 'a', encoding='utf-8').write('\n')

    print(f'Lista Interna: {len(filas)} productos visibles de la tienda')
    for k, v in stats.most_common():
        print(f'  {k}: {v}')
    print(f'No están en la tienda: {len(filas_fuera)} filas')
    print(f'Mapa dashboard: {len(mapa)} productos -> {OUT_JSON}')


def escribir(ws, cols, filas):
    head_fill = PatternFill('solid', fgColor='4B2A7B')
    ws.append(cols)
    for c in ws[1]:
        c.font = Font(bold=True, color='FFFFFF')
        c.fill = head_fill
        c.alignment = Alignment(vertical='center', wrap_text=True)
    amarillo = PatternFill('solid', fgColor='FFF3C4')
    for r in filas:
        ws.append(r)
        if str(r[0]).startswith(POR_CONFIRMAR):
            for c in ws[ws.max_row]:
                c.fill = amarillo
    for col in ('G', 'H'):
        if col <= get_column_letter(len(cols)):
            for c in ws[col][1:]:
                c.number_format = '"$"#,##0'
    anchos = [20, 16, 16, 60, 26, 14, 18, 18, 10, 24, 44, 14, 36]
    for i, w in enumerate(anchos[:len(cols)], start=1):
        ws.column_dimensions[get_column_letter(i)].width = w
    ws.row_dimensions[1].height = 32
    ws.freeze_panes = 'A2'
    ws.auto_filter.ref = f'A1:{get_column_letter(len(cols))}{max(ws.max_row, 2)}'


if __name__ == '__main__':
    main()
