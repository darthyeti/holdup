/* Kloetzchen-Stil: Dinge des Gefaengnisses (Ticket 198, Schritt 4d, Teil Gefaengnis): Gitter (grille), Tueren mit Schloss (lock, siehe kl-dinge-bank.js), Kartenleser (reader), Schluesselkarte (card). Bauer wie in kl-dinge-museum.js.
   lock: o.x, o.y Mitte der Kachel, o.open. grille: geschlossenes Gitter, der untere Riegel steht in der statischen Welt. reader: o.x, o.y, o.open. card: o.x, o.y. */
const wallish = (k, c) => { const e = k.C.cells[c]; return !!e && !e.ins && !e.fence && e.s.some(q => q[0] === 0 && q[1] >= k.C.wallH) };
export function register(KL) {
  KL.obj('grille', (k, o) => {
    const G = k.C.scen.grille, T = k.T, tx = Math.floor(o.x / T), ty = Math.floor(o.y / T), cell = k.E.cellAt, c = cell(tx, ty), hz = cell(tx - 1, ty) === c || cell(tx + 1, ty) === c || wallish(k, cell(tx - 1, ty)) || wallish(k, cell(tx + 1, ty)), X0 = tx * T, Y0 = ty * T, m = T / 2;
    for (let i = 0; i < G.n; i++) { const u = 4 + i * 8 + 1.5; k.dbrick(hz ? X0 + u : X0 + m, hz ? Y0 + m : Y0 + u, 0, G.w, 64, G.w, 0, 0xaeb6c2) }
    for (const r of G.rail.slice(1)) k.dbrick(X0 + m, Y0 + m, r[0], hz ? T : G.w, r[1] - r[0], hz ? G.w : T, 0, 0x4a4f58);
  });
  // 'lock' (Tueren mit Schloss) baut js/kl-dinge-bank.js (Ticket 211), auch fuer die Zellen.
  // Kartenleser (Ticket 298): silberne Haube, Kartenschlitz und Lampe oben (gruen offen, rot zu), die Lampe auch an der Seite. o.x, o.y, o.open.
  KL.obj('reader', (k, o) => { k.dbrick(o.x, o.y, 18, 8, 20, 16, 0, 0x2a2e36); k.dbrick(o.x, o.y, 38, 8, 1.6, 16, 0, 0xc4ccd6); k.dbrick(o.x - 1, o.y - 3, 39.4, 5, .6, 1.6, 0, 0x0a0a0c); k.dbrick(o.x - 1, o.y + 4, 39.4, 4, .8, 4, 0, o.open ? 0x7ee34a : 0xd4452f, 1.4); k.dbrick(o.x, o.y + 8.4, 30, 4, 3, .8, 0, o.open ? 0x7ee34a : 0xd4452f, 1) });
  // Pulte des Teams (Ticket 298, Art 'tpult'): freistehendes Bedienpult, o.v 'z' Zellen (orange, Reihe von 8 Lampen, rot zu, gruen offen, die Zelle des Gefangenen mit weissem Fuss, o.lamps, o.hi) oder 'g' Gitter (blau, Gittersymbol, grosser Hebel o.open: umgelegt).
  KL.obj('tpult', (k, o) => {
    const x = o.x, y = o.y, z = o.v === 'z', col = z ? 0xe8892b : 0x3a8bff;
    k.dbrick(x, y, 0, z ? 30 : 26, 10, 14, 0, 0x2b2e35); k.dbrick(x, y, 10, z ? 30 : 26, 3, 14, 0, col);
    if (z) {
      k.dbrick(x, y - 3, 13, 28, 1.6, 4.6, 0, 0x12141a);
      for (let i = 0; i < 8; i++) { const lx = x - 11.9 + i * 3.4, on = o.lamps && o.lamps[i]; k.dbrick(lx, y - 3, 14.6, 2.6, 1, 2.6, 0, on ? 0x7ee34a : 0xd4452f, 1.4); if (o.hi && o.hi[i]) k.dbrick(lx, y + .2, 14.6, 2.8, .6, 1.4, 0, 0xffffff, .8) }
      for (let i = 0; i < 3; i++) k.dbrick(x - 6 + i * 6, y + 4, 13, 3, 2.4, 3, 0, 0xffb060);
    } else {
      k.dbrick(x - 7, y, 13, 10, 1, 10, 0, 0x12141a); for (let i = 0; i < 4; i++) k.dbrick(x - 10 + i * 2.8, y, 14, 1.4, 5, 7, 0, 0xaeb6c2);   // Gittersymbol
      k.dbrick(x + 7, y, 13, 10, 1, 10, 0, 0x12141a);
      const s = o.open ? 1 : -1; for (let i = 0; i < 3; i++) k.dbrick(x + 7 + s * (i * 2.2), y, 14 + i * 3, 2.4, 3.4, 2.4, 0, 0xe5392e);   // Hebel: nach links (zu) oder rechts (offen) umgelegt
      k.dbrick(x + 7 + s * 6.6, y, 20.4, 5, 5, 5, 0, 0xff6a5a); k.dbrick(x + 10, y + 5.2, 13, 3, 1, 2, 0, o.open ? 0x7ee34a : 0xd4452f, 1.4);
    }
  });
  // Waffenschrank (Ticket 268): grauer Stahlschrank an der Wand des Gangs, Tuerspalt, gelbe Lampen solange eine Pistole drin liegt (o.full), sonst dunkel. o.x, o.y Mitte.
  KL.obj('wcab', (k, o) => { k.dbrick(o.x, o.y, 0, 26, 34, 10, 0, 0x66727f); k.dbrick(o.x, o.y + 5.2, 4, 1.6, 28, .8, 0, 0x2a2e36); k.dbrick(o.x - 6.5, o.y + 5.2, 22, 7, 4, .8, 0, o.full ? 0xe0b020 : 0x2a2e36, o.full ? .6 : 0); k.dbrick(o.x + 6.5, o.y + 5.2, 22, 7, 4, .8, 0, o.full ? 0xe0b020 : 0x2a2e36, o.full ? .6 : 0) });
  // Waescherwagen (Ticket 297): Drahtkorb auf vier Raedern mit Waescheberg, Schiebebuegel hinten (o.a Fahrtrichtung, die Spitze zeigt nach +x des Wagens), mit Insasse (o.in) hoeherer Berg. o.x, o.y Mitte.
  KL.obj('cart', (k, o) => { const c = Math.cos(o.a), s = Math.sin(o.a), P = (u, w) => [o.x + c * u - s * w, o.y + s * u + c * w], B = (u, w, z, l, h, d, col, em) => { const q = P(u, w); k.dbrick(q[0], q[1], z, l, h, d, o.a, col, em) };
    for (const u of [-9, 9]) for (const w of [-8, 8]) B(u, w, 0, 4, 5, 4, 0x1a1c20);
    B(0, 0, 5, 26, 2, 22, 0x6c7580);
    for (const w of [-10, 10]) B(0, w, 7, 26, 15, 2, 0x9aa3ad);
    for (const u of [-12, 12]) B(u, 0, 7, 2, 15, 22, 0x9aa3ad);
    B(0, 0, 7, 22, o.in ? 17 : 11, 18, 0xeef1f4);
    B(-4, 0, 7 + (o.in ? 17 : 11), 12, 2, 12, 0xd2d9df);
    B(-14, 0, 14, 3, 14, 20, 0x3b4148); });
  KL.obj('card', (k, o) => { k.dbrick(o.x, o.y, k.topAt(o.x, o.y), 9, 1.4, 6, 0, 0x7ee34a, .4) });
}
