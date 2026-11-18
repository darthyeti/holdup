#!/usr/bin/env python3
"""Ticket 292: Waffen als eigene Bilder. Spleisst die Ergebnisse von gen_sprites.py in die eingecheckten Blaetter (Pillow weicht sonst ueberall minimal ab):
Aufruf: python3 gen_sprites.py /tmp/gen && python3 tools/splice-waffen.py /tmp/gen
- assets/chars.png und chars_flash.png: Zeilen 0, 1, 8, 9, 10, 11 (bewaffnete Figuren) Spalten 0 bis 6 und 8, Zeile 2 (Wachmann) Spalten 0 bis 6, ohne Waffe in der Hand (Tote in Spalte 7 behalten ihre Waffe am Boden).
- assets/props2.png: Waffenbilder (5 Zellen 64x64) ab (0,320), Reihenfolge pistol, smg, rifle, spr (Praezisionsgewehr), spl (Granatwerfer). tools/gen_nb_sprites.py behaelt diesen Bereich."""
import sys, os
from PIL import Image
gen = sys.argv[1]
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
A = os.path.join(root, 'assets')
for name in ('chars.png', 'chars_flash.png'):
    old = Image.open(os.path.join(A, name)).convert('RGBA')
    new = Image.open(os.path.join(gen, name)).convert('RGBA')
    for r, cols in ((0, (0, 1, 2, 3, 4, 5, 6, 8)), (1, (0, 1, 2, 3, 4, 5, 6, 8)), (8, (0, 1, 2, 3, 4, 5, 6, 8)), (9, (0, 1, 2, 3, 4, 5, 6, 8)),
                    (10, (0, 1, 2, 3, 4, 5, 6, 8)), (11, (0, 1, 2, 3, 4, 5, 6, 8)), (2, (0, 1, 2, 3, 4, 5, 6))):
        for c in cols:
            box = (c * 128, r * 128, c * 128 + 128, r * 128 + 128)
            old.paste(new.crop(box), box[:2])
    old.save(os.path.join(A, name), optimize=True)
p2 = Image.open(os.path.join(A, 'props2.png')).convert('RGBA')
w = Image.open(os.path.join(gen, '_waffen.png')).convert('RGBA')
p2.paste(Image.new('RGBA', (w.width, 64), (0, 0, 0, 0)), (0, 320))
p2.alpha_composite(w, (0, 320))
p2.save(os.path.join(A, 'props2.png'), optimize=True)
print('ok')
