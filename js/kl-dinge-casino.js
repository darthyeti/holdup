/* Kloetzchen-Stil: Dinge des Casinos (Ticket 198, Schritt 4c, Teil Casino): Chips der Cage und Spielautomaten ('good:chips', 'good:slot'), VIP-Auslagen und Statue stehen in kl-dinge-museum.js (gleiche Arten).
   Bauer wie dort: fn(k, o) mit k.dbrick, o.rc Rechteck [x, y, w, h] in Weltpixeln, o.done genommen. Spieltische und Cage-Tresen sind Kacheln des Rasters (eigene Bauer, wenn sie ein Zeichen haben). */
const CHIP = [0xc4402f, 0x3a78cc, 0x2f9a52, 0xe5dfd2, 0x1f2128];
export function register(KL) {
  KL.obj('good:chips', (k, o) => { const r = o.rc, cx = r[0] + r[2] / 2, cz = r[1] + r[3] / 2, t = k.topAt(cx, cz);
    if (o.done) { k.dbrick(cx, cz, t, r[2] - 6, .5, r[3] - 6, 0, 0x1c5a3a); return }
    const n = Math.min(4, Math.max(3, Math.floor((r[2] - 6) / 7))); for (let i = 0; i < n; i++) { const hgt = 3 + ((i * 5 + Math.round(cx)) % 3) * 1.8, col = CHIP[(i + Math.round(cz / 8)) % CHIP.length], x = r[0] + 5 + (i + .5) * (r[2] - 10) / n;
      for (let j = 0; j * 1.8 < hgt; j++) k.dbrick(x, cz + ((i & 1) ? 3 : -3), t + j * 1.8, 6, 1.5, 6, 0, j % 2 ? col : 0xe9e5da) } });
  // Spielautomat: roter Kasten mit leuchtendem Bildschirm (drei Walzen gelb, gruen, rot), Kranz oben, Hebel und Muenzfach
  KL.obj('good:slot', (k, o) => { const r = o.rc, cx = r[0] + r[2] / 2, cz = r[1] + r[3] / 2, t = 0; // steht auf dem Boden (die Standflaeche in kl-dinge-bank.js zeichnet nichts)
    if (o.done) { k.dbrick(cx, cz, t, r[2] - 6, .5, r[3] - 6, 0, 0x2a0808); return }
    k.dbrick(cx, cz, t, 14, 24, 11, 0, 0xd42f2f); k.dbrick(cx, cz + 5.6, t + 12, 11, 8, .8, 0, 0x15191f);
    [0xffd23a, 0x4fe36a, 0xff5a5a].forEach((c, i) => k.dbrick(cx - 3.4 + i * 3.4, cz + 6.1, t + 13, 2.6, 6, .6, 0, c, 1.4));
    k.dbrick(cx, cz, t + 24, 15, 3, 12, 0, 0xffd23a, .8); k.dbrick(cx, cz + 5.8, t + 6, 9, 3, .8, 0, 0x2a2e36); k.dbrick(cx + 8.5, cz, t + 12, 2, 8, 2, 0, 0xcfd6de) });
}
