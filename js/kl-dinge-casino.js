/* Kloetzchen-Stil: Dinge des Casinos (Ticket 198, Schritt 4c, Teil Casino): Chips der Cage und Spielautomaten ('good:chips', 'good:slot'), VIP-Auslagen und Statue stehen in kl-dinge-museum.js (gleiche Arten).
   Bauer wie dort: fn(k, o) mit k.dbrick, o.rc Rechteck [x, y, w, h] in Weltpixeln, o.done genommen. Spieltische und Cage-Tresen sind Kacheln des Rasters (eigene Bauer, wenn sie ein Zeichen haben). */
const CHIP = [0xc4402f, 0x3a78cc, 0x2f9a52, 0xe5dfd2, 0x1f2128];
export function register(KL) {
  KL.obj('good:chips', (k, o) => { const r = o.rc, cx = r[0] + r[2] / 2, cz = r[1] + r[3] / 2, t = k.topAt(cx, cz);
    if (o.done) { k.dbrick(cx, cz, t, r[2] - 6, .5, r[3] - 6, 0, 0x1c5a3a); return }
    const n = Math.max(3, Math.floor((r[2] - 6) / 7)); for (let i = 0; i < n; i++) { const hgt = 3 + ((i * 5 + Math.round(cx)) % 4) * 2.4, col = CHIP[(i + Math.round(cz / 8)) % CHIP.length], x = r[0] + 5 + (i + .5) * (r[2] - 10) / n;
      for (let j = 0; j * 1.8 < hgt; j++) k.dbrick(x, cz + ((i & 1) ? 3 : -3), t + j * 1.8, 6, 1.5, 6, 0, j % 2 ? col : 0xe9e5da) } });
  KL.obj('good:slot', (k, o) => { const r = o.rc, cx = r[0] + r[2] / 2, cz = r[1] + r[3] / 2, t = k.topAt(cx, cz);
    if (o.done) { k.dbrick(cx, cz, t, r[2] - 6, .5, r[3] - 6, 0, 0x080808); return }
    k.dbrick(cx, cz, t, 12, 26, 9, 0, 0xb5303a); k.dbrick(cx, cz + 4.6, t + 14, 10, 8, .8, 0, 0x22d3ee, .9); k.dbrick(cx, cz, t + 26, 12, 3, 9, 0, 0xe5c040, .5); k.dbrick(cx + 7.5, cz, t + 12, 2, 8, 2, 0, 0x8a8f98) });
}
