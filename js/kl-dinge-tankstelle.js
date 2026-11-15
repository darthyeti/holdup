/* Kloetzchen-Stil: Dinge der Tankstelle (Ticket 198, Schritt 4a). Kachel u (Zapfsaeule, beim Bau der Welt, sie verschwindet als Kachel, wenn sie ausbrennt: das Raster wird o), Szenario-Teil pump
   (heil: leuchtende Anzeige zur Strasse, ausgebrannt: verkohlter Stumpf) und die Beute des Shops (KL.obj good:cig und good:shelf, o.n aus den Beute-Stuecken). Die Anzeige liegt an der Suedseite wie in 2D. */
export function register(KL) {
  KL.obj('u', (k, x, y, c, spec) => {
    const cx = x * 32 + 16, cz = y * 32 + 16, B = k.brick, w = 32 - 2 * (spec.ins || 4), top = spec.s[0][1]; k.shadow(cx, cz, w + 10);
    B(cx, cz, 0, w + 2, 3, w + 2, 0x7d8896); B(cx, cz, 3, w, top - 12, w - 4, 0xe8423a); B(cx, cz - w / 2 + 1, 3, w, top - 10, 3, 0xc02f28);         // Sockel, roter Korpus, Rueckwand
    B(cx, cz, top - 9, w + 1, 3, w - 3, 0xffffff); B(cx, cz, top - 6, w - 2, 6, w - 6, 0x2e5fd0); B(cx, cz + w / 2 - 3.2, top - 4.5, w - 6, 3, .6, 0xf5f8fb, .3);   // weisses Band, Dach (blau)
    B(cx - w / 2 + 1, cz + 1, 9, 3.4, 16, 3.4, 0x2a2e36); B(cx - w / 2 + 1, cz + 3.5, 20, 3.4, 3.4, 5, 0x2a2e36);                                   // Zapfhahn
    B(cx + 2, cz + w / 2 - 3, 18, 10, 7, .8, 0x1b2230); B(cx + 2, cz + w / 2 - 2.6, 19, 8, 5, .6, 0x7ee34a, 1.1);                                   // Anzeige
    B(cx, cz, top - 3, 5, 6, 5, 0xffd23a, .15);
  });
  KL.obj('pump', (k, o) => {
    if (o.ok) { k.dbrick(o.x, o.y + 12.6, 22, 14, 7, 1, 0, 0x7ee34a, 1.2); return }
    k.dbrick(o.x, o.y, 0, 20, 8, 18, 0, 0x2a2420); k.dbrick(o.x, o.y, 8, 14, 4, 12, .3, 0x1c1815); k.dbrick(o.x - 5, o.y + 3, 12, 6, 5, 5, .4, 0x14110e); k.dbrick(o.x + 4, o.y - 2, 12, 5, 3, 5, -.3, 0x3a2f28); k.dbrick(o.x, o.y, 12, 4, 2, 4, 0, 0xff7a2a, 1.4);
  });
  const B = (k, ...a) => k.dbrick(...a);
  // Zigaretten-Regal: Packungen in bunten Reihen, genommen leer (dunkle Fuge)
  KL.obj('good:cig', (k, o) => {
    const r = o.rc, t = KL.util.top(k, r[0] + r[2] / 2, r[1] + r[3] / 2);
    const cx = r[0] + r[2] / 2, cz = r[1] + r[3] / 2, w = Math.max(6, r[2] - 4), d = Math.max(4, r[3] - 4);
    B(k, cx, cz, t, w, 2, d, 0, 0xe9edf2);
    for (let i = 0; i < 6; i++) { const x = cx - w / 2 + (i + .5) * w / 6, col = o.done ? 0x1e1b18 : [0xe5392e, 0xffffff, 0x2f6bff, 0xffd23a, 0xe5392e, 0x2fd36a][i]; B(k, x, cz, t + 2, w / 6 - 1, o.done ? 1 : 9, d - 2, 0, col, o.done ? 0 : .05) }
  });
  // Waren im Regal: Dosen, Flaschen und Tueten, genommen leer
  KL.obj('good:shelf', (k, o) => {
    const r = o.rc, t = KL.util.top(k, r[0] + r[2] / 2, r[1] + r[3] / 2);
    const cx = r[0] + r[2] / 2, cz = r[1] + r[3] / 2, w = Math.max(6, r[2] - 4), d = Math.max(4, r[3] - 4), cols = [0xff7a2a, 0x2fd36a, 0xe5392e, 0x2f9bff, 0xffd23a];
    for (let s = 0; s < 2; s++) { B(k, cx, cz, t + s * 11, w, 1.4, d, 0, 0xd8dde4); for (let i = 0; i < 4; i++) { const x = cx - w / 2 + (i + .5) * w / 4; B(k, x, cz, t + s * 11 + 1.4, w / 4 - 1.6, o.done ? .8 : 8 - (i % 2) * 2, d - 2, 0, o.done ? 0x1e1b18 : cols[(i + s * 2) % cols.length]) } }
  });
}
