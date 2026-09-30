"""
Miniaturas consistentes para las tarjetas de la tienda (600×600, fondo blanco puro).

A partir de la imagen de estudio 1600×1600 de cada producto:
  1) quita el fondo radial #FFF→#EEF0F3 (división por el fondo conocido → blanco),
  2) detecta el contorno del producto y lo recorta,
  3) lo centra en 600×600 ocupando SIEMPRE la misma caja (82 %), con una sombra suave uniforme.
Así todos los productos se ven del mismo tamaño en las tarjetas, sin importar cómo vino la foto.

Uso: python3 scripts/normalizar-miniaturas.py [--muestra DIR] [--solo slug,...]
"""
import os, re, sys, glob
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROD = os.path.join(ROOT, 'src', 'content', 'productos')
PUB = os.path.join(ROOT, 'public')
MUESTRA = sys.argv[sys.argv.index('--muestra') + 1] if '--muestra' in sys.argv else None
SOLO = set(sys.argv[sys.argv.index('--solo') + 1].split(',')) if '--solo' in sys.argv else None
T = 600
CAJA = 0.82


def fondo_radial(n):
    y, x = np.mgrid[0:n, 0:n].astype(np.float32)
    t = np.minimum(1, np.sqrt((x - (n - 1) / 2) ** 2 + (y - n * 0.46) ** 2) / (n * 0.72))
    s = t * t * (3 - 2 * t)
    c0 = np.array([255, 255, 255], np.float32); c1 = np.array([0xEE, 0xF0, 0xF3], np.float32)
    return c0 + (c1 - c0) * s[..., None]


_BG = {}


def a_blanco(im):
    a = np.asarray(im.convert('RGB'), np.float32)
    n = a.shape[0]
    if a.shape[0] == a.shape[1] and n >= 800:
        if n not in _BG: _BG[n] = fondo_radial(n)
        a = np.clip(a / _BG[n] * 255.0, 0, 255)
    # todo lo casi blanco y sin color → blanco puro (se va el fondo y la sombra vieja)
    mx, mn = a.max(2), a.min(2)
    fondo = (mn >= 222) & (mx - mn <= 12)
    a[fondo] = 255
    return a


def normalizar(src, dst):
    a = a_blanco(Image.open(src))
    mn = a.min(2); sat = a.max(2) - mn
    obj = (mn < 222) | (sat > 12)
    ys, xs = np.where(obj)
    if len(xs) < 50: return False
    # recorte robusto (ignora motas sueltas)
    x0, x1 = np.percentile(xs, [0.3, 99.7]).astype(int); y0, y1 = np.percentile(ys, [0.3, 99.7]).astype(int)
    crop = Image.fromarray(a[y0:y1 + 1, x0:x1 + 1].astype(np.uint8))
    esc = min(T * CAJA / crop.width, T * CAJA / crop.height, 2.5)
    crop = crop.resize((max(1, round(crop.width * esc)), max(1, round(crop.height * esc))), Image.LANCZOS)
    lienzo = Image.new('RGB', (T, T), 'white')
    x = (T - crop.width) // 2; y = (T - crop.height) // 2 - 8
    sombra = Image.new('L', (T, T), 0)
    ImageDraw.Draw(sombra).ellipse((T / 2 - crop.width * 0.38, y + crop.height - 6, T / 2 + crop.width * 0.38, y + crop.height + 14), fill=60)
    lienzo = Image.composite(Image.new('RGB', (T, T), (170, 175, 182)), lienzo, sombra.filter(ImageFilter.GaussianBlur(9)))
    # pegar con multiplicar: el blanco del recorte no tapa la sombra
    base = np.asarray(lienzo, np.float32); capa = np.full_like(base, 255)
    capa[y:y + crop.height, x:x + crop.width] = np.asarray(crop, np.float32)
    out = Image.fromarray((base * capa / 255).astype(np.uint8))
    out.save(dst, 'WEBP', quality=86, method=6)
    return True


def main():
    hechos = 0
    for f in sorted(glob.glob(os.path.join(PROD, '*.md'))):
        slug = os.path.basename(f)[:-3]
        if SOLO and slug not in SOLO: continue
        t = open(f, encoding='utf-8').read()
        img = (re.search(r'^image:\s*"?([^"\n]+)', t, re.M) or [0, ''])[1]
        if not img.startswith('/images/') or 'placeholders' in img or img.endswith('.svg'): continue
        src = os.path.join(PUB, img.lstrip('/'))
        if not os.path.exists(src): continue
        if MUESTRA:
            dst = os.path.join(MUESTRA, slug + '.webp')
        else:
            base = re.sub(r'\.(webp|png|jpe?g)$', '', img, flags=re.I)
            rel = base + '-card.webp'
            dst = os.path.join(PUB, rel.lstrip('/'))
        if normalizar(src, dst):
            hechos += 1
            if not MUESTRA:
                fm_t = re.sub(r'^imageCard:.*\n', '', t, flags=re.M)
                fm_t = re.sub(r'^(image:.*)$', r'\1\nimageCard: "' + rel + '"', fm_t, count=1, flags=re.M)
                open(f, 'w', encoding='utf-8').write(fm_t)
    print('miniaturas:', hechos)


if __name__ == '__main__':
    main()
