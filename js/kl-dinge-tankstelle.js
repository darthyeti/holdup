/* Kloetzchen-Stil: Dinge der Tankstelle (Ticket 198, Schritt 4a). Kachel u (Zapfsaeule, beim Bau der Welt, sie verschwindet als Kachel, wenn sie ausbrennt: das Raster wird o), Szenario-Teil pump
   (heil: leuchtende Anzeige zur Strasse, ausgebrannt: verkohlter Stumpf) und die Beute des Shops (KL.obj good:cig und good:shelf, o.n aus den Beute-Stuecken). Die Anzeige liegt an der Suedseite wie in 2D. */
export function register(KL) {
  KL.obj('u', (k, x, y, c, spec) => { // Zapfsaeule: heller Korpus mit roten Streifen und rotem Dach, grosse leuchtende Anzeige zur Strasse (Sueden)
    const cx = x * 32 + 16, cz = y * 32 + 16, B = k.brick, w = 32 - 2 * (spec.ins || 4), top = spec.s[0][1]; k.shadow(cx, cz, w + 10);
    B(cx, cz, 0, w + 2, 3, w + 2, 0x8a94a2);                                                                                           // Sockel
    B(cx, cz, 3, w, top - 10, w - 4, 0xf4f6f8);                                                                                        // heller Korpus
    B(cx, cz, 9, w + .6, 4, w - 3.4, 0xe8423a); B(cx, cz, top - 11, w + .6, 3, w - 3.4, 0xe8423a);                                     // rote Streifen
    B(cx, cz, top - 8, w + 1.5, 6, w - 2, 0xe8423a); B(cx, cz, top - 2, w + 1.5, 2, w - 2, 0xb22d26);                                  // rotes Dach
    B(cx - w / 2 + .5, cz + 1, 12, 3.4, 12, 3.4, 0x2a2e36); B(cx - w / 2 + .5, cz + 3.5, 21, 3.4, 3.4, 5, 0x2a2e36);                  // Zapfhahn
    B(cx + 1.5, cz + w / 2 - 3, 20, 13, 9, .9, 0x1b2230); B(cx + 1.5, cz + w / 2 - 2.5, 21, 11, 7, .6, 0x7ef08a, 1.7); B(cx + 1.5, cz + w / 2 - 2.2, 24.5, 7, 1.4, .5, 0xffffff, 1.9); // Anzeige
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
  // Waren im Regal: dunkles Holz als Unterlage, Rueckwand und Seitenteile, hinten ein erhoehter Boden (Stufe), darauf und davor viele kleine flache Warenkloetzchen in gedeckten Farben, genommen leer
  KL.obj('good:shelf', (k, o) => {
    const r = o.rc, t = KL.util.top(k, r[0] + r[2] / 2, r[1] + r[3] / 2), cx = r[0] + r[2] / 2, cz = r[1] + r[3] / 2, w = Math.max(8, r[2] - 2), d = Math.max(8, r[3] - 2), body = 0x4a382c, board = 0x6a5240;
    const cols = [0xa8584a, 0xc4a45a, 0x56808f, 0x6f8f58, 0x8a6f9a, 0xd2cab2, 0xb0703c], dB = d * .42, zb = cz - d / 2 + dB / 2, zf = cz + d / 2 - (d - dB) / 2;
    B(k, cx, cz, t, w, 1.4, d, 0, body);                                                                                                 // Unterlage
    B(k, cx, cz - d / 2 + .8, t + 1.4, w, 20, 1.6, 0, body); for (const a of [-1, 1]) B(k, cx + a * (w / 2 - .8), cz, t + 1.4, 1.6, 12, d, 0, body); // Rueckwand, Seiten
    B(k, cx, zb, t + 1.4, w - 3.2, 7, dB, 0, board);                                                                                      // erhoehte Stufe hinten
    if (o.done) return;
    const n = Math.floor((w - 5) / 4.2), x0 = cx - (n - 1) * 2.1;
    for (let i = 0; i < n; i++) {
      const x = x0 + i * 4.2, hb = 3 + ((i * 5) % 3) * .8, hf = 2.6 + ((i * 7) % 3) * .7;
      B(k, x, zb - .5, t + 8.4, 3.4, hb, 3.6, 0, cols[(i * 3) % cols.length]);                                                           // hinten, auf der Stufe
      B(k, x, zf - (zf - cz) * .35, t + 1.4, 3.4, hf, 3.6, 0, cols[(i * 5 + 2) % cols.length]);                                           // vorn
    }
  });
}
