/* Kloetzchen-Stil: Dinge des Casinos (Ticket 198, Schritt 4c, Teil Casino): Chips der Cage und Spielautomaten ('good:chips', 'good:slot'), VIP-Auslagen und Statue stehen in kl-dinge-museum.js (gleiche Arten).
   Bauer wie dort: fn(k, o) mit k.dbrick, o.rc Rechteck [x, y, w, h] in Weltpixeln, o.done genommen. Spieltische und Cage-Tresen sind Kacheln des Rasters (eigene Bauer, wenn sie ein Zeichen haben). */
const CHIP = [0xc4402f, 0x3a78cc, 0x2f9a52, 0xe5dfd2, 0x1f2128];
export function register(KL) {
  // Spieltische (Ticket 244): vier Arten, von oben an Form und Filz zu erkennen, je Tisch ueber seine Lage gewaehlt: Roulette (Oktagon mit Kessel und Zahlenfeld, gruen), Blackjack (Halbkreis, blau, Kartenschlitten
  // und Spielplaetze), Poker (Oval, burgunder, goldene Reling), Wuerfel (Rechteck mit Banden, lindgruen, zwei Wuerfel). Ein Tisch ist ein Block von 4 mal 2 Kacheln (o.rc ist nur seine Chipflaeche an der
  // Spielerseite, Sueden). Voll: farbige Chipstapel mit Glanz. Abgeraeumt (o.done): Filz dunkelgrau, keine Chips, leere offene Chipablage mit goldener Kante und ein umgeworfener Stuhl daneben.
  const TYPES = [{ n: 'roulette', felt: 0x1f8a46, edge: 0x6b4a2a }, { n: 'blackjack', felt: 0x2a62c8, edge: 0x2f343c }, { n: 'poker', felt: 0xa11f3f, edge: 0xc9a23a }, { n: 'wuerfel', felt: 0x86b82a, edge: 0x7a4a24 }];
  KL.casinoTable = o => { const x = Math.floor(o.rc[0] / 32), y = Math.floor(o.rc[1] / 32); return TYPES[((Math.imul(x, 2654435761) ^ Math.imul(y + 3, 40503)) >>> 13) % 4] };
  // Block eines Tisches (Ticket 262): 4 mal 2 Kacheln aus 'C', o.rc ist nur seine Chipflaeche (zwei Kacheln, eine Kachel tief) an der Spielerseite. Gedrehte Karten legen den Block hochkant (rc hoch statt breit),
  // gespiegelte setzen die Chipflaeche in die andere Zeile oder Spalte. Die zweite Zeile (Spalte) des Blocks ist die 'C'-Seite neben der Chipflaeche; stossen zwei Bloecke aneinander, sind beide Seiten 'C', dann
  // entscheidet die Mehrheit der eindeutigen Tische derselben Karte (alle Tische einer Karte sind gleich ausgerichtet). Ergebnis: Mitte, Richtung zur Spielerseite (dv), Quer-Achse (du) und Drehwinkel th.
  const blocks = new WeakMap();
  function blockOf(k, o) {
    const L = k.X.LAY, T = k.T, cell = k.E.cellAt; let M = L && blocks.get(L); if (!M) { M = { h: null, v: null }; if (L) blocks.set(L, M) }
    const r = o.rc, hor = r[2] >= r[3], isC = (x, y) => cell(x, y) === 'C';
    const all = (L && L.goods ? L.goods : []).filter(g => g.k === 'chips' && g.rc), vote = hz => { if (M[hz ? 'h' : 'v'] != null) return M[hz ? 'h' : 'v'];
      let a = 0, b = 0; for (const g of all) { if ((g.rc[2] >= g.rc[3]) !== hz) continue; const c = hz ? [Math.floor(g.rc[0] / T) - 1, Math.floor(g.rc[1] / T)] : [Math.floor(g.rc[0] / T), Math.floor(g.rc[1] / T) - 1];
        const full = d => { for (let i = 0; i < 4; i++) { const x = hz ? c[0] + i : c[0] + d, y = hz ? c[1] + d : c[1] + i; if (!isC(x, y)) return false } return true }, lo = full(-1), hi = full(1); if (lo && !hi) a++; else if (hi && !lo) b++ }
      return M[hz ? 'h' : 'v'] = a >= b ? -1 : 1 };                                                   // -1: zweite Zeile (Spalte) liegt vor der Chipflaeche (kleineres y oder x), 1: dahinter
    const d = vote(hor);
    if (hor) { const cx = r[0] + r[2] / 2, zc = (Math.floor(r[1] / T) + (d < 0 ? 0 : 1)) * T; return d < 0 ? { cx, cz: zc, th: 0 } : { cx, cz: zc, th: Math.PI } }       // d -1: Chipzeile unten (Sueden), +1: oben (Norden)
    const cz = r[1] + r[3] / 2, xc = (Math.floor(r[0] / T) + (d < 0 ? 0 : 1)) * T; return d < 0 ? { cx: xc, cz, th: -Math.PI / 2 } : { cx: xc, cz, th: Math.PI / 2 };          // d -1: Chipspalte rechts (Osten), +1: links
  }
  KL.casinoBlock = blockOf;
  KL.obj('good:chips', (k, o) => {
    const r = o.rc, bl = blockOf(k, o), cs = Math.cos(bl.th), sn = Math.sin(bl.th), t = k.topAt(r[0] + r[2] / 2, r[1] + r[3] / 2), T = KL.casinoTable(o), cx = 0, z0 = 0, W = 64;
    // Teile in der Block-Ebene: u entlang der langen Seite (128), v quer (64), +v zur Spielerseite; Mitte des Blocks ist (0, 0). Weltlage ueber die Drehung des Blocks, Block-Rand +-64 mal +-32 wird nie verlassen.
    const B = (u, v, y0, su, sy, sv, a, col, em) => k.dbrick(bl.cx + u * cs - v * sn, bl.cz + u * sn + v * cs, y0, su, sy, sv, (a || 0) + bl.th, col, em);
    const felt = o.done ? 0x2c322e : T.felt, ed = o.done ? 0x3a3f3c : T.edge, f0 = t + 1.4, spot = o.done ? 0x44504a : 0xf2efe6;
    // Ellipse oder Halbellipse aus Streifen: Mitte (x, z), Halbachsen rx, rz, nur z >= z (half), Hoehe y0 bis y0 + h
    const ell = (x, z, rx, rz, y0, h, col, half, em) => { const N = 4; for (let i = half ? 0 : -N; i <= N; i++) { const dz = rz * (i + (half ? .5 : 0)) / N, w = 2 * rx * Math.sqrt(Math.max(0, 1 - (dz / rz) * (dz / rz))); if (w > 2) B(x, z + dz, y0, w, h, rz / N + .3, 0, col, em) } };
    if (T.n === 'roulette') {
      for (const a of [0, .785]) B(cx - 34, z0, t, 40, 1.4, 40, a, ed); for (const a of [0, .785]) B(cx - 34, z0, f0, 37, .8, 37, a, felt);
      B(cx - 34, z0, f0 + .8, 20, 1.6, 20, .4, o.done ? 0x2a2a2a : 0x4a3220); B(cx - 34, z0, f0 + 2.4, 12, 1, 12, .2, o.done ? 0x3a3a3a : 0xc9a23a); B(cx - 34, z0, f0 + 3.4, 3, 2, 3, 0, o.done ? 0x555555 : 0xe8c248);
      B(cx + 27, z0, t, 58, 1.4, 44, 0, ed); B(cx + 27, z0, f0, 54, .8, 40, 0, felt);
      if (!o.done) for (let i = 0; i < 12; i++) for (let j = 0; j < 3; j++) B(cx + 3 + i * 4.6, z0 - 8 + j * 8, f0 + .8, 3.6, .4, 6, 0, (i + j) % 2 ? 0xc4402f : 0x1f2128);
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
      B(cx + 52, z0 + 24, f0 + .8, 9, 1.8, 9, .5, 0x4a4f58); B(cx + 52, z0 + 24, f0 + 2.6, 9, 1.4, 2, .5, 0x2a2e36); B(cx + 48, z0 + 28, f0 + .8, 2.4, 3.6, 2.4, .5, 0x2a2e36); B(cx + 56, z0 + 27, f0 + .8, 2.4, 3.6, 2.4, .5, 0x2a2e36); return }
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
