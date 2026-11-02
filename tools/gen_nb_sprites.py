#!/usr/bin/env python3
"""Notenbank-Sprites (Ticket 65 und 66): haengt Zellen an assets/props2.png an (Zeile 2 ab y=64), im Stil der uebrigen Gegenstaende
(Draufsicht, Licht von links oben, dunkler Umriss, Schatten, Rundungen). Aufruf: python3 tools/gen_nb_sprites.py (liest die ersten 704x64 Pixel der
eingecheckten props2.png, schreibt assets/props2.png neu, deterministisch, Blatt 736x384). Layout der neuen Bereiche (Pixel im Blatt, 2 Pixel je Welt-Pixel):
  (0,64) 128x128 Bohrgestell (2x2 Kacheln, Bohrloch-Kragen bei (64,78)), (128,64) vier 32x32 Bohrkronen (0, 22,5, 45, 67,5 Grad),
  (256,64) 192x128 Presse (3x2 Kacheln), (448,64) drei 32x32 Walzenphasen, (544,64) 64x32 Foerderband (Muster mit 16 Pixel Periode),
  (0,192) 128x192 Ausgabetisch (2x3 Kacheln), (128,192) 128x64 Abgabetisch (2x1 Kacheln)."""
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


def press():
    im = canvas(192, 128); shadow(im, (6, 10, 186, 120), blur=4, off=(4, 6), a=105, r=10)
    d = ImageDraw.Draw(im)
    BR = '#c9a24a'; BR_D = '#8a6a22'; GRN = '#3f7d3a'; GRN_D = '#2c5a2a'; GRN_L = '#5aa352'; PAP = '#e9e4d2'
    rr(d, (6, 8, 186, 120), 10, '#2f6b34', OUT, 3)                         # Gehaeuse grün
    rr(d, (10, 12, 182, 34), 7, GRN_L, None, 0)                             # Licht oben
    rr(d, (10, 98, 182, 116), 6, GRN_D, None, 0)
    for x in (22, 56, 90, 124, 158): rr(d, (x, 14, x + 10, 22), 3, BR, OUT, 1)   # Messingbeschlaege oben
    # Papierzufuhr links: Papierrolle
    rr(d, (12, 30, 50, 100), 6, '#1d2026', OUT, 2); rr(d, (15, 33, 47, 97), 4, PAP, None, 0)
    d.ellipse((22 * S, 52 * S, 40 * S, 70 * S), fill=BR, outline=OUT, width=2 * S); d.ellipse((28 * S, 58 * S, 34 * S, 64 * S), fill=OUT)
    for y in (38, 44, 86, 92): d.line((17 * S, y * S, 45 * S, y * S), fill='#c9c4b0', width=S)
    # Walzenschacht Mitte (Walzen kommen dynamisch)
    rr(d, (56, 34, 142, 92), 6, '#1d2026', OUT, 2)
    d.rectangle((58 * S, 60 * S, 140 * S, 66 * S), fill=PAP)                 # Papierbahn
    d.line((58 * S, 60 * S, 140 * S, 60 * S), fill=OUT, width=S)
    # Ausgabe rechts: Schlitz mit Messingblende
    rr(d, (146, 40, 180, 86), 6, BR, OUT, 2); rr(d, (150, 46, 178, 80), 4, '#14161a', None, 0); d.rectangle((152 * S, 60 * S, 178 * S, 66 * S), fill=PAP)
    # Bedienfeld unten: Display, Lampen, Schild
    rr(d, (60, 98, 128, 114), 4, '#14161a', OUT, 2); rr(d, (63, 101, 100, 111), 2, '#1b3a2a', None, 0)
    d.ellipse((106 * S, 102 * S, 112 * S, 108 * S), fill='#6b7480'); d.ellipse((116 * S, 102 * S, 122 * S, 108 * S), fill='#6b7480')
    rr(d, (132, 98, 178, 114), 4, BR, OUT, 2)
    d.text((142 * S, 100 * S), '', fill=OUT)
    # Banknoten-Ornament: Schild mit $
    d.ellipse((144 * S, 92 * S, 156 * S, 104 * S), fill=BR_D, outline=OUT, width=S)
    return down(im)

def roller(phase):
    im = canvas(32, 32); d = ImageDraw.Draw(im); cx = cy = 16; a0 = phase * math.pi / 6
    d.ellipse(((cx - 14) * S, (cy - 13) * S, (cx + 14) * S, (cy + 15) * S), fill=(15, 12, 8, 80))
    d.ellipse(((cx - 13) * S, (cy - 14) * S, (cx + 13) * S, (cy + 13) * S), fill='#c9a24a', outline=OUT, width=2 * S)
    for k in range(6):
        a = a0 + k * math.pi / 3; d.line((cx * S, cy * S, (cx + math.cos(a) * 11) * S, (cy + math.sin(a) * 11) * S), fill='#8a6a22', width=2 * S)
    d.ellipse(((cx - 4) * S, (cy - 4) * S, (cx + 4) * S, (cy + 4) * S), fill=STEEL, outline=OUT, width=S)
    return down(im)

def belt():
    im = canvas(64, 32); d = ImageDraw.Draw(im)
    d.rectangle((0, 0, 64 * S, 32 * S), fill='#2a2e34')
    for x in range(-8, 72, 16):
        d.polygon([((x + 0) * S, 6 * S), ((x + 8) * S, 16 * S), ((x + 0) * S, 26 * S), ((x + 5) * S, 26 * S), ((x + 13) * S, 16 * S), ((x + 5) * S, 6 * S)], fill='#3b4350')
    d.rectangle((0, 0, 64 * S, 4 * S), fill=STEEL); d.rectangle((0, 28 * S, 64 * S, 32 * S), fill=STEEL_D)
    d.line((0, 4 * S, 64 * S, 4 * S), fill=OUT, width=S); d.line((0, 28 * S, 64 * S, 28 * S), fill=OUT, width=S)
    return down(im)

def table(w, h, top='#8a5a2c', felt=None):
    im = canvas(w, h); shadow(im, (3, 3, w - 3, h - 3), blur=3, off=(3, 4), a=95, r=5); d = ImageDraw.Draw(im)
    rr(d, (2, 2, w - 3, h - 3), 5, top, OUT, 2); rr(d, (4, 4, w - 5, 9), 3, '#a87038', None, 0)
    if felt: rr(d, (7, 11, w - 8, h - 8), 3, felt, '#1d2026', 1)
    for (x, y) in ((6, 6), (w - 8, 6), (6, h - 8), (w - 8, h - 8)): screw(d, x, y, 1.2)
    return down(im)

def extra_parts(sheet):
    sheet.alpha_composite(press(), (256, 64))
    for i in range(3): sheet.alpha_composite(roller(i), (448 + i * 32, 64))
    sheet.alpha_composite(belt(), (544, 64))
    sheet.alpha_composite(table(128, 192, '#8a5a2c', '#2f6b34'), (0, 192))    # Ausgabetisch 2x3 Kacheln (Zellen der sechs Buendel)
    sheet.alpha_composite(table(128, 64, '#8a5a2c', '#7b3b2f'), (128, 192))   # Abgabetisch 2x1 Kacheln

def build(root):
    src = Image.open(os.path.join(root, 'assets', 'props2.png')).convert('RGBA').crop((0, 0, 704, 64))
    sheet = Image.new('RGBA', (736, 384), (0, 0, 0, 0)); sheet.paste(src, (0, 0))
    sheet.alpha_composite(rig(), (0, 64))
    for i in range(4): sheet.alpha_composite(bit(i), (128 + i * 32, 64))
    extra_parts(sheet)
    sheet.save(os.path.join(root, 'assets', 'props2.png'), optimize=True)
if __name__ == '__main__':
    build(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
