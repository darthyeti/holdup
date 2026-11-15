/* Kloetzchen-Stil: Dinge der Notenbank (Ticket 198, Schritt 4d, Teil Notenbank): Bohrer (nbRig), Loch im Boden (nbHole), Notenpresse (nbPress) und das Gehaeuse N im Raster. Bauer wie in kl-dinge-museum.js.
   nbRig: o.x, o.y Mitte, o.st Zustand (1 laeuft gruen, 2 gestoert rot, sonst gelb), o.p Fortschritt 0 bis 1, o.r Drehung, o.on Lampe, o.lx, o.ly Lampe. nbPress: o.x, o.y Ecke, o.st, o.paper 0 bis 1, o.pr Druckfortschritt, o.on. */
const lampCol = s => s === 1 ? 0x7ee34a : s === 2 ? 0xd4452f : 0xe0b020;
export function register(KL) {
  KL.obj('N', (k, x, y, c, spec) => { const T = k.T, ins = spec.ins || 0, w = T - 2 * ins, cx = x * T + T / 2, cz = y * T + T / 2; k.brick(cx, cz, 0, w, spec.s[0][1], w, 0x5f6772); k.studs(cx, cz, w - 2, w - 2, spec.s[0][1], 0x7a838f); k.shadow(cx, cz, w + 9) });
  KL.obj('nbRig', (k, o) => {
    const col = lampCol(o.st), p = o.p;
    k.dbrick(o.x, o.y, 36, 14, 10, 14, 0, 0x2c3036); k.dbrick(o.x, o.y, 0, 5, 36 + 8 * (1 - p), 5, o.r, 0xb4bcc6); k.dbrick(o.x, o.y, 0, 9, 5 * (1 - .45 * p), 9, o.r, 0xc4402f);
    k.dbrick(o.lx, o.ly, 36, 4, 2, 4, 0, col, o.on ? 1 : .3);
    if (p > 0) { const T = k.T; k.dbrick(o.x - T + 10 + (2 * T - 20) * p / 2, o.y + T - 40, 36, (2 * T - 20) * p, .8, 3, 0, col, .8); k.dbrick(o.x, o.y + 3, .2, T * (.6 + 1.1 * p), .3, T * (.44 + .8 * p), 0, 0x0c0a09) }
  });
  KL.obj('nbHole', (k, o) => { k.dbrick(o.x, o.y, 0, 62, 1, 56, 0, 0x6b6152); k.dbrick(o.x, o.y, 0, 58, 1.2, 52, 0, 0x17130f); k.dbrick(o.x, o.y + 3, 0, 42, 1.4, 36, 0, 0x050403) });
  KL.obj('nbPress', (k, o) => {
    const X = o.x, Y = o.y, col = o.st === 1 ? 0x7ee34a : o.st === 0 ? 0xe0b020 : o.st === 6 ? 0xffb000 : 0xd4452f;
    if (o.paper > 0) k.dbrick(X + 16, Y + 32, 36, 16, 14 * o.paper, 28, 0, 0xf0ead8);
    k.dbrick(X + 56, Y + 52, 36, 5, 2, 5, 0, col, o.on ? 1 : .3); if (o.pr > 0) k.dbrick(X + 32 + 9 * o.pr, Y + 53, 36, 18 * o.pr, .8, 4, 0, 0x7ee34a, .8);
  });
}
