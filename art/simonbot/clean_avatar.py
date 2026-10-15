"""Rebuild the bot avatar on its true pixel grid.

Reads avatar/original-upload.png (3384 px, upscaled ~59.47x with blur and
off-palette tones), samples the centre of every grid cell, snaps it to the
palette below and writes clean, integer-scaled outputs.

python3 clean_avatar.py   (needs numpy, pillow)
"""
import json, os
import numpy as np
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = HERE
SRC = os.path.join(OUT, 'original-upload.png')

# Grid measured from the edge positions in the upload: 43 vertical and 53
# horizontal edges all fall on one lattice (max residual 1.6 px).
PITCH, OX, OY, N = 59.4709, 12.09, -1.0, 57

PALETTE = {  # name: hex (one entry per colour actually drawn)
    'outline': '#38133e', 'hair': '#473d49', 'hair_moss': '#505748',
    'hair_hi': '#9756a0', 'hair_mid': '#7c4583', 'hair_deep': '#4c2559',
    'skin': '#d7b79a', 'skin_shade': '#c2947f', 'skin_pink': '#b18387', 'blush': '#d78c7e',
    'frames': '#6a466a', 'heart': '#66ad4f', 'heart_shade': '#3c7b5a', 'heart_hi': '#b8e99c',
    'hoodie': '#62468a', 'hoodie_dark': '#452e68', 'hoodie_mauve': '#976792',
}
# Soft in-between tones from the upscale, sent to the colour they belong to.
ALIASES = {'#855477': 'frames', '#875677': 'frames', '#c8a990': 'skin', '#805a90': 'hoodie'}

def hexrgb(h): return [int(h[i:i + 2], 16) for i in (1, 3, 5)]

def main():
    im = np.asarray(Image.open(SRC).convert('RGBA')).astype(float)
    names = list(PALETTE) + [ALIASES[a] for a in ALIASES]
    P = np.array([hexrgb(PALETTE[n]) for n in PALETTE] + [hexrgb(a) for a in ALIASES], float)
    grid = np.full((N, N), -1, int); err = np.zeros((N, N))
    for j in range(N):
        for i in range(N):
            x0, y0, m = OX + i * PITCH, OY + j * PITCH, 10
            a, b = int(max(0, x0 + m)), int(min(im.shape[1], x0 + PITCH - m))
            c, d = int(max(0, y0 + m)), int(min(im.shape[0], y0 + PITCH - m))
            if b - a < 8 or d - c < 8: continue
            med = np.median(im[c:d, a:b].reshape(-1, 4), 0)
            if med[3] < 128: continue
            dist = np.sqrt(((P - med[:3]) ** 2).sum(1)); k = dist.argmin()
            grid[j, i] = list(PALETTE).index(names[k]); err[j, i] = dist[k]
    pal = [hexrgb(PALETTE[n]) for n in PALETTE]
    rgba = np.zeros((N, N, 4), np.uint8)
    for j, i in zip(*np.where(grid >= 0)): rgba[j, i] = pal[grid[j, i]] + [255]
    native = Image.fromarray(rgba)
    native.save(os.path.join(OUT, 'bot-avatar-57.png'))
    for s in (8, 16): native.resize((N * s, N * s), Image.NEAREST).save(os.path.join(OUT, f'bot-avatar-57-x{s}.png'))
    # 64x64 canvas: centred left-right, body on the bottom edge as in the upload,
    # so 512 and 1024 px (Discord sizes) are exact 8x and 16x scales.
    ys, xs = np.where(grid >= 0)
    w = xs.max() - xs.min() + 1
    pad = Image.new('RGBA', (64, 64))
    pad.paste(native.crop((xs.min(), 0, xs.max() + 1, N)), ((64 - w) // 2, 64 - N))
    pad.save(os.path.join(OUT, 'bot-avatar-64.png'))
    for s in (8, 16): pad.resize((64 * s, 64 * s), Image.NEAREST).save(os.path.join(OUT, f'bot-avatar-{64*s}.png'))
    # SVG: one rect per horizontal run, crispEdges.
    px = np.asarray(pad); rects = []
    for y in range(64):
        x = 0
        while x < 64:
            if px[y, x, 3] == 0: x += 1; continue
            col = tuple(px[y, x, :3]); x1 = x
            while x1 < 64 and px[y, x1, 3] and tuple(px[y, x1, :3]) == col: x1 += 1
            rects.append(f'<rect x="{x}" y="{y}" width="{x1-x}" height="1" fill="#%02x%02x%02x"/>' % col); x = x1
    open(os.path.join(OUT, 'bot-avatar-64.svg'), 'w').write(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="512" height="512" shape-rendering="crispEdges">'
        + ''.join(rects) + '</svg>')
    used = sorted(set(grid[grid >= 0].tolist()))
    json.dump({
        'grid': f'{N} x {N} cells in the upload (each {PITCH:.2f} px), placed on a 64 x 64 canvas',
        'pixel_check': 'no cell has an edge inside it and every colour edge sits on the lattice: no mixels',
        'cells': int((grid >= 0).sum()),
        'palette': {n: PALETTE[n] for k, n in enumerate(PALETTE) if k in used},
        'max_snap_distance': round(float(err[grid >= 0].max()), 1),
    }, open(os.path.join(OUT, 'grid-report.json'), 'w'), indent=2)
    print(open(os.path.join(OUT, 'grid-report.json')).read())

if __name__ == '__main__':
    main()
