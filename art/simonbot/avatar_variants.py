"""Discord-ready versions of the cleaned avatar: on a solid backdrop, shown
in Discord's circle crop. python3 avatar_variants.py (after clean_avatar.py)"""
import os
from PIL import Image, ImageDraw
HERE = os.path.dirname(os.path.abspath(__file__)); OUT = HERE
BACKDROPS = {'mint': '#c9ecb4', 'lavender': '#dcc6e6', 'plum': '#24112a'}
art = Image.open(os.path.join(OUT, 'bot-avatar-64.png'))
for name, hx in BACKDROPS.items():
    bg = Image.new('RGBA', (64, 64), hx); bg.alpha_composite(art)
    bg.resize((1024, 1024), Image.NEAREST).save(os.path.join(OUT, f'bot-avatar-{name}-1024.png'))
    big = bg.resize((512, 512), Image.NEAREST)
    m = Image.new('L', (2048, 2048), 0); ImageDraw.Draw(m).ellipse((0, 0, 2047, 2047), fill=255)
    big.putalpha(m.resize((512, 512), Image.LANCZOS)); big.save(os.path.join(OUT, f'bot-avatar-{name}-circle-512.png'))
