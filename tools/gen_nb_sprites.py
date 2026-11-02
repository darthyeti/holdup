#!/usr/bin/env python3
"""Notenbank-Sprites (Ticket 65 und 66): haengt Zellen an assets/props2.png an (Zeile 2 ab y=64), im Stil der uebrigen Gegenstaende
(Draufsicht, Licht von links oben, dunkler Umriss, Schatten, Rundungen). Aufruf: python3 tools/gen_nb_sprites.py (liest die ersten 704x64 Pixel der
eingecheckten props2.png, schreibt assets/props2.png neu, deterministisch). Layout der neuen Zeile:
  (0,64) 128x128 Bohrgestell (2x2 Kacheln, Bohrloch-Kragen bei (64,78)), (128,64) vier 32x32 Bohrkronen (0, 22, 45, 67 Grad)."""
from PIL import Image, ImageDraw, ImageFilter
import math, os, sys
S = 4
OUT = '#1d2026'; STEEL = '#8f97a2'; STEEL_D = '#59616c'; STEEL_L = '#c3c9d1'; DARK = '#2a2e34'; YEL = '#e0b020'; ORG = '#d9772b'; RED = '#d4452f'; GRN = '#7ee34a'

def canvas(w, h): return Image.new('RGBA', (w * S, h * S), (0, 0, 0, 0))
def down(im): return im.resize((im.width // S, im.height // S), Image.LANCZOS)
def rr(d, box, r, fill, outline=OUT, w=2):
    x0, y0, x1, y1 = [v * S for v in box]
    d.rounded_rectangle((x0, y0, x1, y1), r * S, fill=fill, outline=outline, width=w * S)
def shadow(im, box, blur=3, off=(3, 4), a=95, r=6):
    sh = Image.new('RGBA', im.size, (0, 0, 0, 0)); d = ImageDraw.Draw(sh)
    x0, y0, x1, y1 = [v * S for v in box]; d.rounded_rectangle((x0 + off[0] * S, y0 + off[1] * S, x1 + off[0] * S, y1 + off[1] * S), r * S, fill=(15, 12, 8, a))
    sh = sh.filter(ImageFilter.GaussianBlur(blur * S)); im.alpha_composite(sh)
def hazard(d, box, step=9):
    x0, y0, x1, y1 = box
    for i in range(-40, 140, step * 2):
        pts = [(i, y1), (i + step, y1), (i + step + (y1 - y0), y0), (i + (y1 - y0), y0)]
        d.polygon([(max(x0, min(x1, px)) * S, py * S) for px, py in pts], fill=YEL)
def screw(d, x, y, r=1.6):
    d.ellipse(((x - r) * S, (y - r) * S, (x + r) * S, (y + r) * S), fill='#a8b0bb', outline=OUT, width=S // 2)

def rig():
    im = canvas(128, 128); shadow(im, (10, 14, 118, 118), blur=4, off=(4, 6), a=110, r=10)
    d = ImageDraw.Draw(im)
    rr(d, (8, 12, 118, 118), 10, '#4b5058', OUT, 3)                       # Grundplatte
    rr(d, (12, 16, 114, 40), 7, '#5b616b', None, 0)                        # Licht oben
    d.rectangle((12 * S, 100 * S, 114 * S, 114 * S), fill=OUT)
    layer = Image.new('RGBA', im.size, (0, 0, 0, 0)); hd = ImageDraw.Draw(layer); hazard(hd, (13, 102, 113, 113)); im.alpha_composite(layer)
    d = ImageDraw.Draw(im)
    d.rectangle((13 * S, 101 * S, 113 * S, 102 * S), fill=OUT)
    # Bohrloch-Kragen
    cx, cy = 64, 78
    d.ellipse(((cx - 29) * S, (cy - 29) * S, (cx + 29) * S, (cy + 29) * S), fill='#2a2e34', outline=OUT, width=3 * S)
    d.ellipse(((cx - 25) * S, (cy - 25) * S, (cx + 25) * S, (cy + 25) * S), fill=STEEL, outline=STEEL_D, width=2 * S)
    d.ellipse(((cx - 18) * S, (cy - 18) * S, (cx + 18) * S, (cy + 18) * S), fill='#0f1114', outline=OUT, width=2 * S)
    for k in range(8):
        a = k * math.pi / 4 + .39; screw(d, cx + math.cos(a) * 22, cy + math.sin(a) * 22, 1.7)
    # Staender links und rechts
    for x0 in (14, 100):
        rr(d, (x0, 20, x0 + 14, 98), 4, STEEL, OUT, 2); rr(d, (x0 + 2, 22, x0 + 5, 96), 2, STEEL_L, None, 0); rr(d, (x0 + 10, 22, x0 + 12, 96), 1, STEEL_D, None, 0)
        for y in (30, 50, 70, 88): screw(d, x0 + 7, y, 1.4)
    # Querholm mit Gelb
    rr(d, (12, 8, 116, 30), 6, STEEL, OUT, 2); rr(d, (15, 10, 113, 15), 3, STEEL_L, None, 0)
    d.rectangle((17 * S, 24 * S, 111 * S, 27 * S), fill=YEL)
    # Motorgehaeuse mit Orange und Lueftung
    rr(d, (40, 2, 88, 50), 8, DARK, OUT, 3); rr(d, (44, 5, 84, 14), 4, '#454b54', None, 0)
    rr(d, (40, 26, 88, 33), 0, ORG, OUT, 1)
    for y in (37, 41, 45): d.rectangle((50 * S, y * S, 78 * S, (y + 1.6) * S), fill='#14161a')
    # Welle vom Motor zum Kragen
    rr(d, (59, 50, 69, 62), 3, STEEL_D, OUT, 2)
    # Schaltkasten rechts oben mit Lampenfeld
    rr(d, (92, 34, 112, 58), 4, '#3a3f48', OUT, 2); rr(d, (95, 37, 109, 45), 2, '#14161a', None, 0)
    d.ellipse((96 * S, 49 * S, 101 * S, 54 * S), fill='#6b7480'); d.ellipse((103 * S, 49 * S, 108 * S, 54 * S), fill='#6b7480')
    return down(im)

def bit(phase):
    im = canvas(32, 32); d = ImageDraw.Draw(im); cx = cy = 16; a0 = math.radians(phase * 22.5)
    d.ellipse(((cx - 14) * S, (cy - 14) * S, (cx + 14) * S, (cy + 14) * S), fill=(15, 12, 8, 90))
    d.ellipse(((cx - 13) * S, (cy - 13) * S, (cx + 12) * S, (cy + 12) * S), fill='#d8dce2', outline=OUT, width=2 * S)
    for k in range(6):
        a = a0 + k * math.pi / 3
        pts = [(cx + math.cos(a) * 3, cy + math.sin(a) * 3), (cx + math.cos(a + .55) * 12, cy + math.sin(a + .55) * 12), (cx + math.cos(a + .9) * 12, cy + math.sin(a + .9) * 12)]
        d.polygon([(x * S, y * S) for x, y in pts], fill=STEEL_D if k % 2 else STEEL_L, outline=OUT)
        tx, ty = cx + math.cos(a + .72) * 11.5, cy + math.sin(a + .72) * 11.5; d.ellipse(((tx - 1.8) * S, (ty - 1.8) * S, (tx + 1.8) * S, (ty + 1.8) * S), fill=YEL, outline=OUT, width=S // 2)
    d.ellipse(((cx - 4) * S, (cy - 4) * S, (cx + 4) * S, (cy + 4) * S), fill=STEEL, outline=OUT, width=S)
    return down(im)

def build(root):
    src = Image.open(os.path.join(root, 'assets', 'props2.png')).convert('RGBA').crop((0, 0, 704, 64))
    sheet = Image.new('RGBA', (736, 192), (0, 0, 0, 0)); sheet.paste(src, (0, 0))
    sheet.alpha_composite(rig(), (0, 64))
    for i in range(4): sheet.alpha_composite(bit(i), (128 + i * 32, 64))
    extra = globals().get('extra_parts')
    if extra: extra(sheet)
    sheet.save(os.path.join(root, 'assets', 'props2.png'), optimize=True)
if __name__ == '__main__':
    build(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
