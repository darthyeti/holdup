/* Kloetzchen-Stil: Dinge des Casinos (Ticket 198, Schritt 4c, Teil Casino): Chips der Cage und Spielautomaten ('good:chips', 'good:slot'), VIP-Auslagen und Statue stehen in kl-dinge-museum.js (gleiche Arten).
   Bauer wie dort: fn(k, o) mit k.dbrick, o.rc Rechteck [x, y, w, h] in Weltpixeln, o.done genommen. Spieltische und Cage-Tresen sind Kacheln des Rasters (eigene Bauer, wenn sie ein Zeichen haben). */
const CHIP = [0xc4402f, 0x3a78cc, 0x2f9a52, 0xe5dfd2, 0x1f2128];
export function register(KL) {
  // Spieltische (Ticket 244): vier Arten, von oben an Form und Filz zu erkennen, je Tisch ueber seine Lage gewaehlt: Roulette (Oktagon mit Kessel und Zahlenfeld, gruen), Blackjack (Halbkreis, blau, Kartenschlitten
  // und Spielplaetze), Poker (Oval, burgunder, goldene Reling), Wuerfel (Rechteck mit Banden, lindgruen, zwei Wuerfel). Ein Tisch ist ein Block von 4 mal 2 Kacheln (o.rc ist nur seine Chipflaeche an der
  // Spielerseite, Sueden). Voll: farbige Chipstapel mit Glanz. Abgeraeumt (o.done): Filz dunkelgrau, keine Chips, leere offene Chipablage mit goldener Kante und ein umgeworfener Stuhl daneben.
  const TYPES = [{ n: 'roulette', felt: 0x1f8a46, edge: 0x6b4a2a }, { n: 'blackjack', felt: 0x2a62c8, edge: 0x2f343c }, { n: 'poker', felt: 0xa11f3f, edge: 0xc9a23a }, { n: 'wuerfel', felt: 0x86b82a, edge: 0x7a4a24 }];
  KL.casinoTable = o => { const x = Math.floor(o.rc[0] / 32), y = Math.floor(o.rc[1] / 32); return TYPES[((Math.imul(x, 2654435761) ^ Math.imul(y + 3, 40503)) >>> 13) % 4] };
  KL.obj('good:chips', (k, o) => {
    const r = o.rc, cx = r[0] + r[2] / 2, z0 = r[1] - 3, t = k.topAt(cx, r[1] + r[3] / 2), T = KL.casinoTable(o), B = (x, z, y0, sx, sy, sz, a, col, em) => k.dbrick(x, z, y0, sx, sy, sz, a || 0, col, em);
    const felt = o.done ? 0x2c322e : T.felt, ed = o.done ? 0x3a3f3c : T.edge, f0 = t + 1.4, spot = o.done ? 0x44504a : 0xf2efe6;
    // Ellipse oder Halbellipse aus Streifen: Mitte (x, z), Halbachsen rx, rz, nur z >= z (half), Hoehe y0 bis y0 + h
    const ell = (x, z, rx, rz, y0, h, col, half, em) => { const N = 4; for (let i = half ? 0 : -N; i <= N; i++) { const dz = rz * (i + (half ? .5 : 0)) / N, w = 2 * rx * Math.sqrt(Math.max(0, 1 - (dz / rz) * (dz / rz))); if (w > 2) B(x, z + dz, y0, w, h, rz / N + .3, 0, col, em) } };
    if (T.n === 'roulette') {
      for (const a of [0, .785]) B(cx - 34, z0, t, 40, 1.4, 40, a, ed); for (const a of [0, .785]) B(cx - 34, z0, f0, 37, .8, 37, a, felt);
      B(cx - 34, z0, f0 + .8, 20, 1.6, 20, .4, o.done ? 0x2a2a2a : 0x4a3220); B(cx - 34, z0, f0 + 2.4, 12, 1, 12, .2, o.done ? 0x3a3a3a : 0xc9a23a); B(cx - 34, z0, f0 + 3.4, 3, 2, 3, 0, o.done ? 0x555555 : 0xe8c248);
      B(cx + 22, z0, t, 66, 1.4, 44, 0, ed); B(cx + 22, z0, f0, 62, .8, 40, 0, felt);
      if (!o.done) for (let i = 0; i < 12; i++) for (let j = 0; j < 3; j++) B(cx - 10 + i * 5.2, z0 - 8 + j * 8, f0 + .8, 4, .4, 6, 0, (i + j) % 2 ? 0xc4402f : 0x1f2128);
    } else if (T.n === 'blackjack') {
      ell(cx, z0 - 28, 58, 54, t, 1.4, ed, true); ell(cx, z0 - 28, 54, 50, f0, .8, felt, true);
      B(cx, z0 - 22, f0 + .8, 10, 3.6, 6, 0, 0x16191e); B(cx, z0 - 22.5, f0 + 4.4, 6.4, .6, 3.4, 0, o.done ? 0x777777 : 0xf2efe6);
      if (!o.done) for (let i = -2; i <= 2; i++) { const a = i * .42; B(cx + Math.sin(a) * 38, z0 - 28 + Math.cos(a) * 38 - 4, f0 + .8, 7, .4, 7, -a, spot) }
    } else if (T.n === 'poker') {
      ell(cx, z0, 60, 30, t, 1.4, ed, false); ell(cx, z0, 55, 25, f0, .8, felt, false);
      if (!o.done) for (let i = -3; i <= 3; i++) B(cx + i * 15, z0 + (i * i < 5 ? 11 : 8), f0 + .8, 6, .4, 8, i * .13, spot);
      B(cx, z0 - 4, f0 + .8, 24, .4, 7, 0, o.done ? 0x3a4a40 : 0x6b1230);
    } else {
      B(cx, z0, t, 122, 1.4, 60, 0, ed); B(cx, z0, f0, 110, .8, 48, 0, felt); for (const sz of [-1, 1]) B(cx, z0 + sz * 28, f0, 122, 3, 4, 0, ed); for (const sx of [-1, 1]) B(cx + sx * 59, z0, f0, 4, 3, 60, 0, ed);
      B(cx, z0 + 14, f0 + .8, 96, .4, 3, 0, o.done ? 0x44504a : 0xf2efe6); B(cx, z0 - 12, f0 + .8, 96, .4, 3, 0, o.done ? 0x44504a : 0xc4402f);
      if (!o.done) { B(cx + 10, z0, f0 + .8, 4.6, 4.6, 4.6, .4, 0xf6f3ea); B(cx + 19, z0 + 3, f0 + .8, 4.6, 4.6, 4.6, -.3, 0xf6f3ea); B(cx + 10, z0, f0 + 5.4, 1.1, .3, 1.1, 0, 0x16191e); B(cx + 19, z0 + 3, f0 + 5.4, 1.1, .3, 1.1, 0, 0x16191e) }
    }
    if (o.done) { // offene, leere Chipablage mit goldener Kante und umgeworfener Stuhl
      B(cx - 36, z0 + 24, f0 + .8, 22, 1.8, 7, 0, 0x14181c); B(cx - 36, z0 + 27, f0 + 2.6, 22, .6, 1, 0, 0xc9a23a);
      B(cx + 66, z0 + 36, 0, 10, 3, 10, .5, 0x4a4f58); B(cx + 66, z0 + 36, 3, 10, 1.8, 2, .5, 0x2a2e36); B(cx + 60, z0 + 41, 0, 2.4, 7, 2.4, .5, 0x2a2e36); B(cx + 72, z0 + 40, 0, 2.4, 7, 2.4, .5, 0x2a2e36); return }
    const cols = [0xd8321f, 0x2a6ee0, 0x22a652, 0xf0b020, 0x2a2e36]; const n = 5;
    for (let i = 0; i < n; i++) { const hgt = 7 + ((i * 5 + Math.round(cx)) % 3) * 3, x = cx - 40 + i * 20, z = z0 + 23 + ((i & 1) ? -2 : 0), col = cols[(i + Math.round(z0 / 8)) % cols.length];
      for (let j = 0; j * 1.9 < hgt; j++) B(x, z, f0 + 1 + j * 1.9, 8, 1.6, 8, 0, j % 2 ? col : 0xe9e5da, j * 1.9 + 1.9 >= hgt ? .16 : 0) } });
  // Spielautomat: roter Kasten mit leuchtendem Bildschirm (drei Walzen gelb, gruen, rot), Kranz oben, Hebel und Muenzfach
  KL.obj('good:slot', (k, o) => { const r = o.rc, cx = r[0] + r[2] / 2, cz = r[1] + r[3] / 2, t = 0; // steht auf dem Boden (die Standflaeche in kl-dinge-bank.js zeichnet nichts)
    if (o.done) { k.dbrick(cx, cz, t, r[2] - 6, .5, r[3] - 6, 0, 0x2a0808); return }
    k.dbrick(cx, cz, t, 14, 24, 11, 0, 0xd42f2f); k.dbrick(cx, cz + 5.6, t + 12, 11, 8, .8, 0, 0x15191f);
    [0xffd23a, 0x4fe36a, 0xff5a5a].forEach((c, i) => k.dbrick(cx - 3.4 + i * 3.4, cz + 6.1, t + 13, 2.6, 6, .6, 0, c, 1.4));
    k.dbrick(cx, cz, t + 24, 15, 3, 12, 0, 0xffd23a, .8); k.dbrick(cx, cz + 5.8, t + 6, 9, 3, .8, 0, 0x2a2e36); k.dbrick(cx + 8.5, cz, t + 12, 2, 8, 2, 0, 0xcfd6de) });
}
