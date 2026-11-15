/* Kloetzchen-Stil: Dinge der Bank (Ticket 198, Schritt 4a: Bank und Juwelier). register(KL) traegt Kachel-Bauer ein (KL.obj mit einem Zeichen): fn(k, x, y, ch, spec), x und y Kachel im Raster, spec Eintrag aus V3CFG.cells (Hoehe s, Einzug ins).
   k.brick(mx, mz, y0, sx, sy, sz, farbe, leuchten, drehung) setzt einen Klotz, k.studs(mx, mz, sx, sz, hoehe, farbe) Noppen darauf, k.shadow(mx, mz, groesse) einen weichen Kontaktschatten. Die Kachel verliert ihren Standardkoerper.
   Vorhanden: Tresen C, Schreibtisch e, Monitortisch m, Bank b, Kasse r, Geldautomat A, Kiste k, Fass q, Pflanze p. */
const FURN = { C: { col: 0xd7ceb8, st: 1 }, e: { col: 0xb07a45, st: 1 }, m: { col: 0x8a93a1, st: 1, x: 'mon' }, b: { col: 0x3a78cc, st: 1 }, r: { col: 0xd6dbe0, st: 1, x: 'till' }, A: { col: 0x59616c, x: 'atm' },
  k: { col: 0xc9994f, st: 1, x: 'crate' }, q: { col: 0xc24a35, x: 'barrel' }, p: { col: 0xb5603b, x: 'plant' } };
export function register(KL) {
  for (const ch of Object.keys(FURN)) KL.obj(ch, (k, x, y, c, spec) => {
    const F = FURN[c], T = k.T, ins = spec.ins || 0, top = spec.s[0][1], cx = x * T + T / 2, cz = y * T + T / 2, w = T - 2 * ins, B = k.brick;
    k.shadow(cx, cz, w + 9);
    if (F.x === 'plant') { B(cx, cz, 0, w * .9, 13, w * .9, F.col); for (let i = 0; i < 3; i++) B(cx, cz, 13 + i * 7, (w + 5) * (1 - i * .22), 8, (w + 5) * (1 - i * .22), i === 1 ? 0x4fb858 : 0x3a9a46, 0, i * .45); return }
    B(cx, cz, 0, w, top, w, F.col);
    if (F.st) k.studs(cx, cz, w - 2, w - 2, top, F.col);
    if (F.x === 'mon') { B(cx, cz + w * .04, top, 13, 2, 8, 0x5c6470); B(cx, cz + 1, top + 2, 15, 10, 2.4, 0x20262e); B(cx, cz + 2.5, top + 3.4, 11.4, 7.2, .6, 0x4aa8e8, 1) }
    if (F.x === 'till') { B(cx, cz, top, 14, 6, 11, 0x8a929c); B(cx, cz + 5.6, top + 3, 8, 2.4, .6, 0x7ee34a, 1) }
    if (F.x === 'atm') { B(cx, cz + w / 2 - .3, 28, 12, 9, .8, 0x22d3ee, 1); B(cx, cz + w / 2 - .3, 14, 9, 3, .8, 0x303842) }
    if (F.x === 'crate') { B(cx, cz, top * .5, w + 1.2, 2.4, w + 1.2, 0x7a5a2c); B(cx, cz, 0, 3, top + .6, w + 1, 0x7a5a2c) }
    if (F.x === 'barrel') { B(cx, cz, top * .22, w + 1, 2.4, w + 1, 0x2a2e36); B(cx, cz, top * .66, w + 1, 2.4, w + 1, 0x2a2e36) }
  });
}
