/* Kloetzchen-Stil: Dinge der Welt, die in allen Szenarien vorkommen (Ticket 220): Fensterrahmen und Barrikaden vor Fenstern (Kacheln W, w, Y), Markierungen am Boden (ring, zone, frame, exit), Sichtkegel der Wachen
   (cone), geparkte Autos (parked) und ein Klotz fuer unbekannte Beute-Unterarten (good). Die schlichten Welt-Koerper bleiben (Wand #, Pfeiler P, Tuerblock V und L: ihre Einzelheiten zeichnen die Szenario-Teile vault und lock),
   hier kommen Rahmen und Aufbauten darauf (KL.obj mit keep: die Kachel behaelt ihren Koerper und das Glas, damit Schnitt und Scherben der Welt unveraendert bleiben). */
const WALLS = '#PWwYVLlDdg';
export function register(KL) {
  KL.plain = new Set(['#', 'P', 'V', 'L', 'l', 'D', 'd', 'g']);   // gewollt schlichte Welt (Koerper der Karte), im Zaehler (tools/zaehler-klassisch.js) kein Rueckfall
  // Richtung der Wand an der Kachel (x, y): true wenn sie in Ost-West-Richtung laeuft
  const hzOf = (k, x, y) => { const cell = k.E.cellAt, isW = (a, b) => WALLS.includes(cell(a, b)) || (k.C.cells[cell(a, b)] || { s: [] }).s.some(q => q[0] === 0 && q[1] >= k.C.wallH); return isW(x - 1, y) && isW(x + 1, y) ? true : isW(x, y - 1) && isW(x, y + 1) ? false : true };
  // Fenster: heller Rahmen mit Fensterbank, Sturzleiste, Pfosten und Kreuz (u entlang der Wand, v quer dazu)
  const frame = (k, x, y, broken) => {
    const T = k.T, cx = x * T + T / 2, cz = y * T + T / 2, hz = hzOf(k, x, y), B = (u, v, y0, su, sh, sv, col, em) => k.brick(cx + (hz ? u : v), cz + (hz ? v : u), y0, hz ? su : sv, sh, hz ? sv : su, col, em), cream = 0xf4ecd8;
    B(0, 0, 15.5, 34, 2.6, 9, cream); B(0, 0, 49.5, 34, 2.4, 8, cream);                                                  // Fensterbank (ragt vor) und Sturzleiste
    B(-15.6, 0, 16, 2.8, 34, 6.4, cream); B(15.6, 0, 16, 2.8, 34, 6.4, cream);                                          // Pfosten
    if (!broken) { B(0, 0, 16, 1.8, 34, 5, cream); B(0, 0, 32, 30, 1.8, 5, cream) }                                      // Kreuz nur im heilen Fenster
    else { B(-9, 0, 16, 5, 3, 2, 0xcfeaff, .15); B(6, 0, 16, 7, 4.5, 2, 0xcfeaff, .15); B(-4, 0, 45, 6, 4, 2, 0xcfeaff, .15); B(11, 0, 44, 4, 5, 2, 0xcfeaff, .15) } // Scherben im Rahmen
  };
  KL.obj('W', (k, x, y) => frame(k, x, y, false), { keep: true });
  KL.obj('w', (k, x, y) => frame(k, x, y, true), { keep: true });
  // Fensterbarrikade: drei Holzbretter quer vor dem Fenster mit Nagelkoepfen, leicht versetzt
  KL.obj('Y', (k, x, y) => {
    const T = k.T, cx = x * T + T / 2, cz = y * T + T / 2, hz = hzOf(k, x, y), B = (u, v, y0, su, sh, sv, col, em) => k.brick(cx + (hz ? u : v), cz + (hz ? v : u), y0, hz ? su : sv, sh, hz ? sv : su, col, em);
    [[0, 19, 0xc99a5a], [-1.4, 31, 0xb5833f], [1.2, 43, 0xd2a868]].forEach(([d, y0, c]) => { B(d, 0, y0, 36, 6, 9.4, c); for (const e of [-14, 14]) B(d + e, 4.8, y0 + 2.2, 2, 2, 1.2, 0x8a8f98); });
    B(0, 0, 15.5, 34, 2.6, 9, 0xf4ecd8); B(0, 0, 49.5, 34, 2.4, 8, 0xf4ecd8);
  }, { keep: true });

  // Markierungen am Boden als leuchtende Klotz-Striche (Rundlauf, Rechteck, Ecken, gestrichelte Linie)
  const dash = (k, x0, y0, x1, y1, on, gap, col, em, h) => { const L = Math.hypot(x1 - x0, y1 - y0); if (L < .5) return; const a = Math.atan2(y1 - y0, x1 - x0); for (let s = 0; s < L; s += on + gap) { const e = Math.min(L, s + on), m = (s + e) / 2; k.dbrick(x0 + Math.cos(a) * m, y0 + Math.sin(a) * m, 0, e - s, h || 1.2, 2.2, a, col, em) } };
  const rect = (k, x0, y0, x1, y1, on, gap, col, em) => { dash(k, x0, y0, x1, y0, on, gap, col, em); dash(k, x1, y0, x1, y1, on, gap, col, em); dash(k, x1, y1, x0, y1, on, gap, col, em); dash(k, x0, y1, x0, y0, on, gap, col, em) };
  KL.obj('ring', (k, o) => { const n = Math.max(16, Math.round(o.r * 6.283 / 16)); for (let i = 0; i < n; i += 2) { const a = i / n * 6.283; k.dbrick(o.x + Math.cos(a) * o.r, o.y + Math.sin(a) * o.r, 0, 9, 1.2, 2.4, a + 1.5708, 0x7ee34a, .4 + .6 * o.f) } });
  KL.obj('zone', (k, o) => rect(k, o.x0, o.y0, o.x1, o.y1, 12, 8, 0x7ee34a, .4 + .6 * o.f));
  KL.obj('frame', (k, o) => { const col = o.c ? 0xffd27a : 0xffffff, em = .3 + .7 * o.f, L = 14; for (const [x, y, sx, sy] of [[o.x0, o.y0, 1, 1], [o.x1, o.y0, -1, 1], [o.x0, o.y1, 1, -1], [o.x1, o.y1, -1, -1]]) { dash(k, x, y, x + sx * L, y, L, 1, col, em, 1.4); dash(k, x, y, x, y + sy * L, L, 1, col, em, 1.4) } });
  KL.obj('exit', (k, o) => dash(k, o.x0, o.y0, o.x1, o.y1, 9, 7, 0x7ee34a, .7));
  // Sichtkegel der Wachen: Faecher aus weichen Leuchtflecken entlang jedes dritten Strahls (rot bei Alarm, sonst warm), nach aussen schwaecher
  KL.obj('cone', (k, o) => {
    const p = o.pts || [], col = o.al ? 0xff6e5a : 0xffe9aa, r = Math.max(1, ...p.map(q => Math.hypot(q[0] - o.x, q[1] - o.y)));
    for (let i = 0; i < p.length; i += 3) { const dx = p[i][0] - o.x, dy = p[i][1] - o.y, L = Math.hypot(dx, dy); for (let s = 20; s < L; s += 26) { const f = s / r; k.glow(o.x + dx * s / L, o.y + dy * s / L, .6, 15 + 7 * f, col, (o.al ? .16 : .12) * (1 - f * .8), true) } }
  });
  // Unbekannte Beute-Unterart: schlichter Kloetzchen-Kasten auf dem Rechteck (kein klassischer Bildklotz), genommen nur ein dunkler Fleck
  const COL = [0x3a9ad9, 0xe5603a, 0x4fb858, 0xe5c33a, 0xb36af0];
  KL.obj('good', (k, o) => { const r = o.rc, cx = r[0] + r[2] / 2, cz = r[1] + r[3] / 2, t = k.topAt(cx, cz); if (o.done) { k.dbrick(cx, cz, t, r[2] - 6, .5, r[3] - 6, 0, 0x16110c); return } const c = COL[(String(o.n).length + Math.round(cx / 32)) % COL.length]; k.dbrick(cx, cz, t, Math.max(8, r[2] - 8), 10, Math.max(8, r[3] - 8), 0, c, .15); k.dbrick(cx, cz, t + 10, Math.max(6, r[2] - 12), 1.6, Math.max(6, r[3] - 12), 0, 0xf4ecd8, .2) });
}
