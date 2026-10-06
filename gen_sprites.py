import math, os, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

OUT = sys.argv[1]
os.makedirs(OUT, exist_ok=True)
OL = (20, 22, 26, 255)


def hexc(h, a=255):
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4)) + (a,)


def shade(c, k):
    return tuple(max(0, min(255, int(v * k))) for v in c[:3]) + (c[3] if len(c) > 3 else 255,)


class Canvas:
    def __init__(self, size, S):
        self.S = S
        self.size = size
        self.im = Image.new('RGBA', (size * S, size * S), (0, 0, 0, 0))
        self.ov = Image.new('RGBA', (size * S, size * S), (0, 0, 0, 0))
        self.d = ImageDraw.Draw(self.im)
        self.o = ImageDraw.Draw(self.ov)

    def E(self, cx, cy, rx, ry, fill, ol=OL, ow=2.0, ov=False):
        S = self.S
        d = self.o if ov else self.d
        if ol and not ov:
            d.ellipse([(cx - rx - ow) * S, (cy - ry - ow) * S, (cx + rx + ow) * S, (cy + ry + ow) * S], fill=ol)
        d.ellipse([(cx - rx) * S, (cy - ry) * S, (cx + rx) * S, (cy + ry) * S], fill=fill)

    def Rr(self, x0, y0, x1, y1, fill, ol=OL, r=2, ow=1.6, ov=False):
        S = self.S
        d = self.o if ov else self.d
        if ol and not ov:
            d.rounded_rectangle([(x0 - ow) * S, (y0 - ow) * S, (x1 + ow) * S, (y1 + ow) * S], radius=(r + ow) * S, fill=ol)
        d.rounded_rectangle([x0 * S, y0 * S, x1 * S, y1 * S], radius=r * S, fill=fill)

    def P(self, pts, fill, ol=OL, ow=1.6, ov=False):
        S = self.S
        d = self.o if ov else self.d
        if ol and not ov:
            d.polygon([(x * S, y * S) for x, y in pts], fill=ol, outline=ol, width=int(ow * 2 * S))
        d.polygon([(x * S, y * S) for x, y in pts], fill=fill)

    def L(self, p0, p1, w, fill, ol=OL, ow=1.8, ov=False):
        S = self.S
        d = self.o if ov else self.d
        if ol and not ov:
            d.line([p0[0] * S, p0[1] * S, p1[0] * S, p1[1] * S], fill=ol, width=int((w + ow * 2) * S))
            for p in (p0, p1):
                r = (w / 2 + ow)
                d.ellipse([(p[0] - r) * S, (p[1] - r) * S, (p[0] + r) * S, (p[1] + r) * S], fill=ol)
        d.line([p0[0] * S, p0[1] * S, p1[0] * S, p1[1] * S], fill=fill, width=int(w * S))
        for p in (p0, p1):
            r = w / 2
            d.ellipse([(p[0] - r) * S, (p[1] - r) * S, (p[0] + r) * S, (p[1] + r) * S], fill=fill)

    def finish(self, noise=0.0, seed=1):
        im = np.array(self.im).astype(np.float32)
        ov = np.array(self.ov).astype(np.float32)
        a = im[..., 3:4] / 255.0
        oa = ov[..., 3:4] / 255.0 * a
        rgb = im[..., :3] * (1 - oa) + ov[..., :3] * oa
        if noise:
            rng = np.random.default_rng(seed)
            n = rng.normal(0, noise, (rgb.shape[0] // 4, rgb.shape[1] // 4, 1)).astype(np.float32)
            n = np.kron(n, np.ones((4, 4, 1), dtype=np.float32))
            rgb = rgb * (1 + n)
        out = np.concatenate([np.clip(rgb, 0, 255), im[..., 3:4]], axis=2).astype(np.uint8)
        img = Image.fromarray(out, 'RGBA')
        return img.resize((self.size, self.size), Image.LANCZOS)


LIGHT = (255, 255, 255, 70)
DARK = (0, 0, 0, 60)


def soldier(pal, phase=0.0, idle=False):
    c = Canvas(128, 4)
    sw = 0 if idle else math.sin(phase) * 12
    bob = 0 if idle else math.cos(phase * 2) * 0.8
    uni, pants, vest = hexc(pal['uni']), hexc(pal['pants']), hexc(pal['vest'])
    boots = hexc('#16171a')
    c.E(64 + sw, 53, 12, 6.5, pants)
    c.E(64 + sw + 9, 53, 6.5, 5.5, boots)
    c.E(64 - sw, 75, 12, 6.5, pants)
    c.E(64 - sw + 9, 75, 6.5, 5.5, boots)
    c.E(62, 64, 13, 22, uni)
    c.E(62, 64, 13, 22, LIGHT, ov=True)
    c.E(64, 66, 12, 20, DARK, ov=True)
    if pal.get('pack'):
        c.Rr(40, 50, 54, 78, hexc(pal['pack']), r=4)
        c.Rr(42, 54, 52, 60, DARK, ov=True, r=2)
    c.E(62, 64, 10, 17, vest)
    c.E(60, 59, 6, 9, LIGHT, ov=True)
    for yy in (52, 70):
        c.Rr(67, yy, 74, yy + 7, shade(vest, .72), r=1.5, ow=1.2)
    c.Rr(58, 62, 62, 66, shade(vest, .6), r=1, ow=1)
    c.E(62, 45, 7, 5, shade(uni, 1.05))
    c.E(62, 83, 7, 5, shade(uni, 1.05))
    rx = bob
    wood = hexc(pal.get('wood', '#6b4a2b'))
    c.P([(66 + rx, 62), (82 + rx, 60.5), (82 + rx, 67.5), (66 + rx, 68)], wood)
    c.Rr(78 + rx, 59.5, 106 + rx, 68.5, hexc('#2a2d33'), r=2)
    c.Rr(80 + rx, 60.5, 104 + rx, 63, hexc('#4a4e57'), ol=None, r=1)
    c.Rr(100 + rx, 60, 116 + rx, 68, hexc(pal.get('guard', '#3a3d44')), r=2)
    c.Rr(114 + rx, 62.4, 127 + rx, 65.6, hexc('#7b8088'), r=1, ow=1.2)
    c.Rr(124 + rx, 61.2, 128 + rx, 66.8, hexc('#202226'), r=1, ow=1)
    c.Rr(87 + rx, 57.5, 97 + rx, 60.3, hexc('#15171a'), r=1, ow=1.2)
    c.P([(88 + rx, 68), (96 + rx, 68), (99 + rx, 80), (91 + rx, 80.5)], hexc('#1a1c20'))
    skin = hexc('#2a2a2d') if pal.get('gloves') else hexc('#d2a37c')
    c.L((62, 46), (74, 50), 8, uni)
    c.L((74, 50), (101 + rx, 60.5), 7.5, uni)
    c.L((62, 82), (76, 77), 8, uni)
    c.L((76, 77), (85 + rx, 68.5), 7.5, uni)
    c.E(102 + rx, 61, 4.6, 4.2, hexc('#2a2a2d'))
    c.E(85 + rx, 68, 4.4, 4.0, hexc('#2a2a2d'))
    hel = hexc(pal['helm'])
    kind = pal['head']
    if kind == 'helmet':
        c.E(65, 64, 13, 13.5, hel)
        c.E(61, 59, 7.5, 5, LIGHT, ov=True)
        c.E(67, 68, 9, 8, DARK, ov=True)
        for (dx, dy, r) in ((62, 66, 3.2), (70, 59, 2.6), (68, 71, 2.4), (58, 61, 2.2)):
            c.E(dx, dy, r, r * .8, shade(hel, .78), ol=None, ov=False)
        c.E(63, 51.5, 3.2, 4, hexc('#101113'))
        c.E(63, 76.5, 3.2, 4, hexc('#101113'))
        c.Rr(74, 58, 79, 70, hexc('#101113'), r=2, ow=1)
    elif kind == 'mask':
        c.E(65, 64, 12, 12.5, hexc('#1c1c20'))
        c.E(62, 59, 6.5, 4.5, LIGHT, ov=True)
        c.Rr(71, 53, 77, 75, hexc(pal.get('band','#b8322a')), r=2, ow=1.4)
        c.Rr(71.5, 53, 74, 75, (255, 255, 255, 40), ol=None, r=1, ov=True)
    else:
        c.E(65, 64, 17, 17, hel)
        c.E(65, 64, 10.5, 10.5, shade(hel, 1.15))
        c.E(61, 59, 7, 5, LIGHT, ov=True)
        c.E(67, 68, 13, 10, DARK, ov=True)
        c.E(65, 64, 10.5, 10.5, shade(hel, .8), ol=None, ov=False)
        c.E(65, 64, 8, 8, shade(hel, 1.12), ol=None, ov=False)
    return c.finish(noise=0.025, seed=3)


def dead(pal):
    c = Canvas(128, 4)
    uni, vest = hexc(pal['uni']), hexc(pal['vest'])
    c.Rr(24, 90, 104, 96, hexc('#16181b'), r=2)
    c.Rr(20, 88.5, 40, 97.5, hexc(pal.get('wood', '#6b4a2b')), r=2)
    c.L((50, 50), (28, 40), 9, uni)
    c.L((50, 78), (30, 94), 9, uni)
    c.E(60, 64, 24, 15, uni)
    c.E(58, 64, 17, 11, vest)
    c.E(56, 59, 9, 5, LIGHT, ov=True)
    c.E(92, 63, 10.5, 10.5, hexc('#1c1c20') if pal['head'] == 'mask' else hexc(pal['helm']))
    if pal['head'] == 'mask':
        c.Rr(95, 54, 100, 72, hexc(pal.get('band','#b8322a')), r=2, ow=1.2)
    c.E(90, 59, 5, 3.5, LIGHT, ov=True)
    return c.finish(noise=0.025, seed=5)



def person(pal, phase=0.0, idle=False, mode='walk'):
    c = Canvas(128, 4)
    uni, pants = hexc(pal['uni']), hexc(pal['pants'])
    skin = hexc(pal.get('skin', '#d9ab84'))
    hair = hexc(pal.get('hair', '#3a2a1c'))
    boots = hexc('#16171a')
    vest = hexc(pal['vest']) if pal.get('vest') else None
    if mode == 'cower':
        c.E(50, 52, 6.5, 5, boots)
        c.E(50, 76, 6.5, 5, boots)
        c.E(58, 64, 15, 20, uni)
        c.E(58, 64, 15, 20, LIGHT, ov=True)
        c.E(60, 67, 13, 17, DARK, ov=True)
        if vest:
            c.E(58, 64, 11, 15, vest)
        c.L((58, 47), (80, 58), 8, uni)
        c.L((58, 81), (80, 70), 8, uni)
        c.E(83, 58, 4.2, 4.2, skin)
        c.E(83, 70, 4.2, 4.2, skin)
        c.E(72, 64, 10.5, 11, hair)
        c.E(70, 60, 5, 3.5, LIGHT, ov=True)
        return c.finish(noise=0.025, seed=7)
    sw = 0 if idle else math.sin(phase) * 12
    s2 = 0 if idle else math.sin(phase) * 9
    c.E(64 + sw, 53, 12, 6.5, pants)
    c.E(64 + sw + 9, 53, 6.5, 5.5, boots)
    c.E(64 - sw, 75, 12, 6.5, pants)
    c.E(64 - sw + 9, 75, 6.5, 5.5, boots)
    pistol = pal.get('pistol')
    if pistol:
        c.L((62, 46), (82, 54), 8, uni)
        c.L((62, 82), (84, 74), 8, uni)
    else:
        c.L((62, 46), (66 + s2, 41), 8, uni)
        c.L((62, 82), (66 - s2, 87), 8, uni)
        c.E(68 + s2, 40, 4.2, 4, skin)
        c.E(68 - s2, 88, 4.2, 4, skin)
    c.E(62, 64, 13, 21, uni)
    c.E(62, 64, 13, 21, LIGHT, ov=True)
    c.E(64, 66, 12, 19, DARK, ov=True)
    if vest:
        c.E(62, 64, 10, 16, vest)
        c.E(60, 59, 6, 8, LIGHT, ov=True)
    if pal.get('tie'):
        c.Rr(70, 62, 77, 66, hexc(pal['tie']), r=1, ow=1)
    if pal.get('belt'):
        c.Rr(54, 56, 60, 72, hexc('#1b1c20'), r=1, ow=1)
        c.Rr(50, 74, 58, 82, hexc('#22242a'), r=2, ow=1)
    if pistol:
        c.Rr(86, 62.2, 100, 66.4, hexc('#1c1e22'), r=1, ow=1.3)
        c.Rr(94, 60.6, 99, 62.4, hexc('#4a4e56'), r=0.5, ow=0.8)
        c.E(84, 55, 4.2, 4, hexc('#2a2a2d'))
        c.E(86, 73, 4.2, 4, hexc('#2a2a2d'))
    kind = pal['head']
    if kind == 'cap':
        c.E(65, 64, 12.5, 13, hexc(pal['cap']))
        c.E(61, 59, 7, 4.5, LIGHT, ov=True)
        c.Rr(74, 55, 88, 73, shade(hexc(pal['cap']), .78), r=3)
        c.E(63, 64, 3, 3, hexc('#c9b25a'), ol=None)
    elif kind == 'hood':
        c.E(63, 64, 13.5, 14, hexc(pal['hood']))
        c.E(59, 58, 7, 5, LIGHT, ov=True)
        c.E(72, 64, 7.5, 9, hexc('#17171a'))
        c.E(74, 64, 4.5, 6, skin, ol=None)
    else:
        c.E(65, 64, 10.5, 11, skin)
        c.E(62, 64, 10.5, 11.5, hair)
        c.E(60, 59, 6, 4, LIGHT, ov=True)
        c.E(72, 64, 5, 8, hair if pal.get('fringe') else skin, ol=None)
    return c.finish(noise=0.025, seed=13)


def dead_person(pal):
    c = Canvas(128, 4)
    uni = hexc(pal['uni'])
    skin = hexc(pal.get('skin', '#d9ab84'))
    c.L((50, 50), (30, 42), 8, uni)
    c.L((50, 78), (32, 92), 8, uni)
    c.E(62, 64, 24, 15, uni)
    c.E(60, 59, 9, 5, LIGHT, ov=True)
    c.E(92, 63, 10.5, 10.5, hexc(pal.get('hair', '#3a2a1c')))
    c.E(30, 42, 4, 4, skin)
    c.E(32, 92, 4, 4, skin)
    return c.finish(noise=0.025, seed=5)


PAL = {
    'pt': dict(uni='#34476b', pants='#28344f', vest='#7d7a5c', helm='#2c3a54', head='helmet', gloves=1),
    'rob': dict(uni='#2a2b30', pants='#1c1d21', vest='#3a3b42', helm='#1c1c20', head='mask', band='#e8742a', gloves=1),
    'grd': dict(uni='#3d4a62', pants='#2b3446', vest='#2e384c', head='cap', cap='#2b3550', pistol=1, belt=1),
    'cva': dict(uni='#9a3f3a', pants='#2f3a52', head='hair', hair='#4a3020'),
    'cvb': dict(uni='#3f6f94', pants='#3a3a42', head='hair', hair='#c9a45a', skin='#e6bf9c'),
    'tel': dict(uni='#e4e6ea', pants='#2a2d38', vest='#2f3a55', head='hair', hair='#2a1c14', tie='#a83a3a'),
    'mgr': dict(uni='#555b68', pants='#3a3e48', vest=None, head='hair', hair='#8a8a8c', tie='#2a3a6a', skin='#caa07c'),
    'hud': dict(uni='#6d7076', pants='#2d3340', head='hood', hood='#767980', skin='#d9ab84'),
    'rb2': dict(uni='#262c3a', pants='#1a1d26', vest='#2f4468', helm='#1c1c20', head='mask', band='#3a8bff', gloves=1),
    'rb3': dict(uni='#262f2a', pants='#1a211d', vest='#2f5a3a', helm='#1c1c20', head='mask', band='#3fbf55', gloves=1),
    'rb4': dict(uni='#2d2838', pants='#1f1c27', vest='#4a3466', helm='#1c1c20', head='mask', band='#a05cf0', gloves=1),
    'hd2': dict(uni='#5d7399', pants='#2d3340', head='hood', hood='#6a82ab', skin='#d9ab84'),
    'hd3': dict(uni='#5f8a69', pants='#2d3340', head='hood', hood='#6c9a76', skin='#d9ab84'),
    'hd4': dict(uni='#7d6a99', pants='#2d3340', head='hood', hood='#8a76a8', skin='#d9ab84'),
    'swt': dict(uni='#23272e', pants='#171a1f', vest='#566170', helm='#14171b', head='helmet', gloves=1, pack='#2b3038', guard='#2a2d33'),
}
ROWS = ['pt', 'rob', 'grd', 'cva', 'cvb', 'tel', 'mgr', 'hud', 'swt', 'rb2', 'rb3', 'rb4', 'hd2', 'hd3', 'hd4']
COLS = 9
atlas = Image.new('RGBA', (128 * COLS, 128 * len(ROWS)), (0, 0, 0, 0))
for r, key in enumerate(ROWS):
    pal = PAL[key]
    armed = key in ('pt', 'rob', 'swt', 'rb2', 'rb3', 'rb4')
    for i in range(6):
        ph = i / 6 * 2 * math.pi
        im = soldier(pal, ph) if armed else person(pal, ph)
        atlas.paste(im, (i * 128, r * 128))
    idle = soldier(pal, 0, idle=True) if armed else person(pal, 0, idle=True)
    atlas.paste(idle, (6 * 128, r * 128))
    atlas.paste(dead(pal) if armed else dead_person(pal), (7 * 128, r * 128))
    atlas.paste(idle if armed else person(pal, mode='cower'), (8 * 128, r * 128))
atlas.save(os.path.join(OUT, 'chars.png'))
arr = np.array(atlas)
fl = arr.copy()
fl[..., 0] = 255
fl[..., 1] = 236
fl[..., 2] = 236
Image.fromarray(fl, 'RGBA').save(os.path.join(OUT, 'chars_flash.png'))


def bag():
    c = Canvas(64, 8)
    c.Rr(12, 17, 52, 47, hexc('#25282d'), r=7, ow=1.8)
    c.Rr(15, 20, 49, 44, hexc('#33373e'), ol=None, r=5)
    c.Rr(12, 29, 52, 35, hexc('#d6b23a'), ol=hexc('#3a3010'), r=1.5, ow=1)
    c.L((22, 17), (22, 11), 3, hexc('#1b1d21'), ol=None)
    c.L((42, 17), (42, 11), 3, hexc('#1b1d21'), ol=None)
    c.L((22, 11), (42, 11), 3, hexc('#1b1d21'), ol=None)
    c.Rr(14, 19, 50, 24, (255, 255, 255, 50), ol=None, r=2, ov=True)
    return c.finish(noise=0.03, seed=31)


def pile():
    c = Canvas(64, 8)
    c.Rr(8, 14, 56, 50, hexc('#6a4d2a'), r=2, ow=1.6)
    for i, (x, y) in enumerate(((13, 19), (13, 32))):
        for j in range(2):
            xx = x + j * 21
            c.Rr(xx, y, xx + 19, y + 12, hexc('#6fa66c'), ol=hexc('#27422a'), r=1, ow=1)
            c.Rr(xx + 7, y - 0.5, xx + 12, y + 12.5, hexc('#e8e2c0'), ol=None, r=0.5)
    c.Rr(10, 15, 54, 19, (255, 235, 180, 70), ol=None, r=1, ov=True)
    return c.finish(noise=0.04, seed=33)


def till():
    c = Canvas(64, 8)
    c.Rr(10, 14, 54, 52, hexc('#6a6e75'), r=3, ow=1.8)
    c.Rr(13, 17, 51, 38, hexc('#8a8f97'), ol=None, r=2)
    c.Rr(20, 19, 44, 30, hexc('#2b4d62'), ol=hexc('#14202a'), r=1, ow=1)
    c.Rr(22, 21, 42, 25, hexc('#7cc6e8'), ol=None, r=0.5)
    c.Rr(13, 40, 51, 50, hexc('#4c5058'), ol=hexc('#202226'), r=1.5, ow=1)
    for xx in (18, 26, 34, 42):
        c.Rr(xx, 32, xx + 5, 36, hexc('#c8ccd2'), ol=None, r=0.5)
    c.Rr(12, 15, 52, 18, (255, 255, 255, 60), ol=None, r=1, ov=True)
    return c.finish(noise=0.02, seed=35)


def camera():
    c = Canvas(64, 8)
    c.Rr(8, 24, 22, 40, hexc('#3b3f46'), r=2, ow=1.4)
    c.Rr(18, 22, 50, 42, hexc('#d8dbe0'), r=5, ow=1.6)
    c.Rr(22, 25, 46, 31, (255, 255, 255, 90), ol=None, r=2, ov=True)
    c.E(52, 32, 7, 8, hexc('#1c1e22'))
    c.E(53, 32, 4.4, 5.2, hexc('#274a66'), ol=None)
    c.E(54.5, 30, 1.6, 1.6, hexc('#e8f6ff'), ol=None)
    c.E(26, 32, 2.2, 2.2, hexc('#d63a3a'), ol=None)
    return c.finish(noise=0.02, seed=37)


def note():
    c = Canvas(64, 8)
    c.P([(16, 14), (47, 12), (49, 46), (18, 49)], hexc('#f2dd5a'), ol=hexc('#8a7a1c'))
    for i in range(4):
        c.L((22, 22 + i * 6), (42 - i * 2, 21.5 + i * 6), 1.6, hexc('#a89528'), ol=None)
    c.L((38, 44), (54, 38), 3, hexc('#2f4fa0'), ol=None)
    return c.finish(noise=0.02, seed=39)


def desk_monitor():
    c = Canvas(64, 8)
    c.Rr(3, 6, 61, 58, hexc('#8a6a45'), r=2, ow=1.6)
    c.Rr(5, 8, 59, 56, hexc('#9a7a52'), ol=None, r=1.5)
    c.Rr(22, 12, 44, 30, hexc('#1c1e22'), ol=None, r=1.5)
    c.Rr(24, 14, 42, 28, hexc('#3d78a6'), ol=None, r=1)
    c.Rr(25, 14.5, 41, 18, (255, 255, 255, 70), ol=None, r=1, ov=True)
    c.Rr(18, 38, 46, 46, hexc('#2a2c31'), ol=hexc('#101114'), r=1.5, ow=1)
    c.Rr(48, 36, 57, 48, hexc('#d7d2c4'), ol=hexc('#6a6556'), r=0.5, ow=0.8)
    return c.finish(noise=0.04, seed=41)


def keypad():
    c = Canvas(64, 8)
    c.Rr(18, 10, 46, 54, hexc('#3c4048'), r=3, ow=1.6)
    c.Rr(22, 14, 42, 24, hexc('#2d6f4a'), ol=None, r=1)
    for r in range(3):
        for k in range(3):
            c.Rr(22 + k * 7, 28 + r * 7, 27 + k * 7, 33 + r * 7, hexc('#aeb3bb'), ol=None, r=0.8)
    return c.finish(noise=0.02, seed=43)


def plant():
    c = Canvas(64, 8)
    c.E(32, 32, 22, 22, hexc('#6a5238'), ol=OL, ow=1.6)
    c.E(32, 32, 17, 17, hexc('#3d3126'), ol=None)
    rng = np.random.default_rng(5)
    for i in range(12):
        a = i / 12 * 2 * math.pi
        x, y = 32 + math.cos(a) * 12, 32 + math.sin(a) * 12
        pts = [(32, 32), (32 + math.cos(a - .35) * 26, 32 + math.sin(a - .35) * 26),
               (32 + math.cos(a) * 29, 32 + math.sin(a) * 29), (32 + math.cos(a + .35) * 26, 32 + math.sin(a + .35) * 26)]
        c.P(pts, hexc('#3f8a3f') if i % 2 else hexc('#4ea04c'), ol=hexc('#1f4a22'), ow=1)
    c.E(32, 32, 4, 4, hexc('#2f6a31'), ol=None)
    return c.finish(noise=0.04, seed=45)


def bench():
    c = Canvas(64, 8)
    c.Rr(2, 12, 62, 52, hexc('#5a3c26'), r=3, ow=1.6)
    c.Rr(5, 15, 59, 49, hexc('#7a5434'), ol=None, r=2)
    for yy in (24, 33, 42):
        c.Rr(5, yy, 59, yy + 1.2, hexc('#4a3220'), ol=None, r=0)
    c.Rr(4, 14, 60, 17, (255, 235, 190, 70), ol=None, r=1, ov=True)
    return c.finish(noise=0.05, seed=47)


def desk():
    c = Canvas(64, 8)
    c.Rr(2, 6, 62, 58, hexc('#7a5a38'), r=2, ow=1.6)
    c.Rr(4, 8, 60, 56, hexc('#936e45'), ol=None, r=1.5)
    c.P([(10, 14), (32, 12), (34, 30), (12, 32)], hexc('#ecebe4'), ol=hexc('#8a897f'), ow=0.8)
    c.P([(34, 34), (54, 33), (55, 50), (35, 51)], hexc('#e4e2d6'), ol=hexc('#8a897f'), ow=0.8)
    c.E(48, 20, 6, 5, hexc('#c9c6b8'), ol=hexc('#6a6556'), ow=0.8)
    c.L((14, 44), (28, 38), 2.4, hexc('#2f4fa0'), ol=None)
    return c.finish(noise=0.05, seed=49)


def atm():
    c = Canvas(64, 8)
    c.Rr(8, 10, 56, 54, hexc('#454a53'), r=3, ow=1.8)
    c.Rr(11, 13, 53, 33, hexc('#2e343c'), ol=None, r=2)
    c.Rr(16, 16, 48, 29, hexc('#2f7f9a'), ol=hexc('#14202a'), r=1, ow=1)
    c.Rr(16, 36, 34, 49, hexc('#9aa0a8'), ol=None, r=1)
    c.Rr(38, 38, 51, 44, hexc('#14161a'), ol=None, r=1)
    c.Rr(10, 11, 54, 15, (255, 255, 255, 60), ol=None, r=1, ov=True)
    return c.finish(noise=0.02, seed=51)


p2 = Image.new('RGBA', (64 * 11, 64), (0, 0, 0, 0))
for i, im in enumerate([bag(), pile(), till(), camera(), note(), desk_monitor(), keypad(), plant(), bench(), desk(), atm()]):
    p2.paste(im, (i * 64, 0))
p2.save(os.path.join(OUT, 'props2.png'))


def car(body, roof, kind):
    c = Canvas(256, 4)
    for (x0, x1) in ((46, 86), (176, 216)):
        c.Rr(x0, 62, x1, 76, hexc('#111214'), r=4, ow=0)
        c.Rr(x0, 180, x1, 194, hexc('#111214'), r=4, ow=0)
    c.Rr(10, 72, 246, 184, hexc(body), r=22, ow=2.4)
    c.Rr(10, 72, 246, 184, (255, 255, 255, 40), ov=True, r=22)
    c.Rr(12, 138, 244, 184, (0, 0, 0, 50), ov=True, r=22)
    if kind == 'van':
        c.Rr(24, 86, 170, 170, hexc(roof), r=10, ow=2)
        c.Rr(36, 98, 70, 158, hexc('#aeb4bc'), r=6, ow=1.5)
        c.Rr(80, 98, 160, 158, shade(hexc(roof), .94), r=4, ow=1.2)
        c.Rr(176, 86, 232, 170, hexc('#223a52'), r=12, ow=2)
        c.Rr(180, 90, 200, 120, (255, 255, 255, 80), ov=True, r=6)
    elif kind == 'police':
        c.Rr(18, 76, 238, 180, hexc('#14161a'), ol=None, r=20)
        c.Rr(104, 72, 154, 184, hexc('#f1f1f1'), ol=None, r=3)
        c.Rr(72, 88, 190, 168, hexc('#1b1d22'), r=14, ow=2)
        c.Rr(86, 96, 170, 160, hexc('#262a31'), ol=None, r=10)
        c.Rr(128, 80, 144, 176, hexc('#d02a2a'), ol=hexc('#101114'), r=3, ow=1.4)
        c.Rr(144, 80, 160, 176, hexc('#2a52d0'), ol=hexc('#101114'), r=3, ow=1.4)
        c.Rr(176, 90, 226, 166, hexc('#1c3248'), r=12, ow=1.8)
    else:
        c.Rr(72, 88, 190, 168, shade(hexc(body), .82), r=14, ow=2)
        c.Rr(86, 96, 170, 160, shade(hexc(body), .95), ol=None, r=10)
        c.Rr(176, 90, 226, 166, hexc('#2a3e52'), r=12, ow=1.8)
    c.Rr(236, 88, 246, 104, hexc('#fff3c2'), ol=None, r=3)
    c.Rr(236, 152, 246, 168, hexc('#fff3c2'), ol=None, r=3)
    c.Rr(10, 88, 17, 104, hexc('#b02a2a'), ol=None, r=2)
    c.Rr(10, 152, 17, 168, hexc('#b02a2a'), ol=None, r=2)
    return c.finish(noise=0.02, seed=61).crop((0, 64, 256, 192))


cars = Image.new('RGBA', (256, 128 * 4), (0, 0, 0, 0))
for i, im in enumerate([car('#e9ebee', '#f4f5f6', 'van'), car('#14161a', '#14161a', 'police'),
                        car('#9a3a34', '#9a3a34', 'civ'), car('#3c5f86', '#3c5f86', 'civ')]):
    cars.paste(im, (0, i * 128))
cars.save(os.path.join(OUT, 'cars.png'))

sheet = Image.new('RGBA', (1152 + 704 + 260, 1024), (110, 104, 96, 255))
sheet.alpha_composite(atlas, (0, 0))
sheet.alpha_composite(p2, (1152, 0))
sheet.alpha_composite(cars, (1152 + 704, 0))
sheet.save(os.path.join(OUT, '_preview.png'))
print('ok')
