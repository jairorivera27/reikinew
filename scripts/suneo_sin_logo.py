"""
Quita el logo del proveedor ("suneo" con puntos verdes) de las fotos de Suneo Energy antes de pasarlas
al estudio: lo busca por plantilla (varios tamaños) y lo pinta de blanco. Plantilla:
imagenes-proveedores/suneo/logo-plantilla.png (recorte del logo de una de sus fotos).
"""
import os
import cv2
import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PLANTILLA = os.path.join(ROOT, 'imagenes-proveedores', 'suneo', 'logo-plantilla.png')


def _gris(im):
    bg = Image.new('RGBA', im.size, (255, 255, 255, 255))
    rgb = Image.alpha_composite(bg, im.convert('RGBA')).convert('RGB')
    return rgb, cv2.cvtColor(np.array(rgb), cv2.COLOR_RGB2GRAY)


def quitar_logo(src, dst, umbral=0.55):
    rgb, g = _gris(Image.open(src))
    t0 = cv2.cvtColor(np.array(Image.open(PLANTILLA).convert('RGB')), cv2.COLOR_RGB2GRAY)
    H, W = g.shape
    mejor = (0, None)
    for esc in np.linspace(0.06, 0.45, 40):  # ancho del logo = 6 % a 45 % del ancho de la foto
        tw = int(W * esc)
        th = int(t0.shape[0] * tw / t0.shape[1])
        if tw < 20 or th < 10 or th >= H or tw >= W:
            continue
        t = cv2.resize(t0, (tw, th), interpolation=cv2.INTER_AREA)
        r = cv2.matchTemplate(g, t, cv2.TM_CCOEFF_NORMED)
        _, v, _, loc = cv2.minMaxLoc(r)
        if v > mejor[0]:
            mejor = (v, (loc[0], loc[1], tw, th))
    if mejor[0] < umbral:
        rgb.save(dst)
        return 0.0
    x, y, w, h = mejor[1]
    m = int(w * 0.08)
    rgb.paste((255, 255, 255), (max(0, x - m), max(0, y - m), min(W, x + w + m), min(H, y + h + int(h * 0.5))))
    # Recortar al producto (sin el blanco que deja el logo ni el ruido casi blanco del fondo)
    a = np.array(rgb.convert('L'))
    ys, xs = np.where(a < 235)
    if len(xs):
        mm = int(max(W, H) * 0.02)
        rgb = rgb.crop((max(0, xs.min() - mm), max(0, ys.min() - mm), min(W, xs.max() + mm), min(H, ys.max() + mm)))
    rgb.save(dst)
    return mejor[0]


if __name__ == '__main__':
    import sys
    src, out = sys.argv[1], sys.argv[2]
    os.makedirs(out, exist_ok=True)
    n = 0
    for f in sorted(os.listdir(src)):
        s = quitar_logo(os.path.join(src, f), os.path.join(out, os.path.splitext(f)[0] + '.png'))
        n += s > 0
        if s == 0:
            print('sin logo detectado:', f)
    print('con logo quitado', n)
