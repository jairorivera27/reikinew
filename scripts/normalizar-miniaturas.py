"""
Miniaturas consistentes para las tarjetas de la tienda (640×410, la proporción de la tarjeta; mismo fondo de estudio).

A partir de la imagen de estudio 1600×1600 de cada producto:
  1) detecta el contorno del producto por sus aristas (funciona también con equipos blancos),
  2) recorta ese rectángulo con su sombra y lo funde en un fondo de estudio nuevo,
  3) lo centra ocupando SIEMPRE la misma caja (84 % del alto / 74 % del ancho).
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
T = 600          # (compatibilidad)
W_T, H_T = 640, 410  # misma proporción que la foto de la tarjeta (306×196)
CAJA_ALTO, CAJA_ANCHO = 0.84, 0.74


def fondo_radial(n, alto=None):
    alto = alto or n
    y, x = np.mgrid[0:alto, 0:n].astype(np.float32)
    t = np.minimum(1, np.sqrt((x - (n - 1) / 2) ** 2 + (y - alto * 0.46) ** 2) / (max(n, alto) * 0.72))
    s = t * t * (3 - 2 * t)
    c0 = np.array([255, 255, 255], np.float32); c1 = np.array([0xEE, 0xF0, 0xF3], np.float32)
    return c0 + (c1 - c0) * s[..., None]


_BG = {}


def caja_producto(a):
    """Contorno del producto por bordes: el fondo de estudio y la sombra son suaves (sin bordes),
    el producto siempre tiene aristas, aunque sea blanco."""
    from scipy import ndimage
    g = ndimage.gaussian_filter(a.mean(2), 1.0)
    mag = np.hypot(ndimage.sobel(g, 0), ndimage.sobel(g, 1)) / 8.0
    borde = mag > 2.2
    borde = ndimage.binary_opening(borde, iterations=1) | (mag > 6)
    ys, xs = np.where(borde)
    if len(xs) < 80: return None
    x0, x1 = np.percentile(xs, [0.2, 99.8]); y0, y1 = np.percentile(ys, [0.2, 99.8])
    return int(x0), int(y0), int(x1), int(y1)


def normalizar(src, dst):
    im = Image.open(src).convert('RGB')
    a = np.asarray(im, np.float32)
    caja = caja_producto(a)
    if not caja: return False
    x0, y0, x1, y1 = caja
    w, h = x1 - x0, y1 - y0
    pad = int(max(w, h) * 0.04)
    x0, y0 = max(0, x0 - pad), max(0, y0 - pad); x1, y1 = min(im.width, x1 + pad), min(im.height, y1 + pad)
    crop = im.crop((x0, y0, x1, y1))
    esc = min(W_T * CAJA_ANCHO / crop.width, H_T * CAJA_ALTO / crop.height, 2.5)
    crop = crop.resize((max(1, round(crop.width * esc)), max(1, round(crop.height * esc))), Image.LANCZOS)
    # bordes del recorte difuminados para que se funda con el fondo nuevo
    m = Image.new('L', crop.size, 255)
    f = max(4, int(min(crop.size) * 0.06))
    m = Image.new('L', (crop.width - 2 * f, crop.height - 2 * f), 255) if crop.width > 2 * f and crop.height > 2 * f else m
    alfa = Image.new('L', crop.size, 0); alfa.paste(m, (f, f) if m.size != crop.size else (0, 0))
    alfa = alfa.filter(ImageFilter.GaussianBlur(f / 2))
    fondo = Image.fromarray(fondo_radial(W_T, H_T).astype(np.uint8))
    x = (W_T - crop.width) // 2; y = (H_T - crop.height) // 2 - 3
    fondo.paste(crop, (x, y), alfa)
    fondo.save(dst, 'WEBP', quality=86, method=6)
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
