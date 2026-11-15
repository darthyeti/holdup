/* Kloetzchen-Stil: Dinge des Gefaengnisses (Ticket 198, Schritt 4d, Teil Gefaengnis): Gitter (grille), Tueren mit Schloss (lock), Kartenleser (reader), Schluesselkarte (card). Bauer wie in kl-dinge-museum.js.
   lock: o.x, o.y Mitte der Kachel, o.open. grille: geschlossenes Gitter, der untere Riegel steht in der statischen Welt. reader: o.x, o.y, o.open. card: o.x, o.y. */
const wallish = (k, c) => { const e = k.C.cells[c]; return !!e && !e.ins && !e.fence && e.s.some(q => q[0] === 0 && q[1] >= k.C.wallH) };
export function register(KL) {
  KL.obj('grille', (k, o) => {
    const G = k.C.scen.grille, T = k.T, tx = Math.floor(o.x / T), ty = Math.floor(o.y / T), cell = k.E.cellAt, c = cell(tx, ty), hz = cell(tx - 1, ty) === c || cell(tx + 1, ty) === c || wallish(k, cell(tx - 1, ty)) || wallish(k, cell(tx + 1, ty)), X0 = tx * T, Y0 = ty * T, m = T / 2;
    for (let i = 0; i < G.n; i++) { const u = 4 + i * 8 + 1.5; k.dbrick(hz ? X0 + u : X0 + m, hz ? Y0 + m : Y0 + u, 0, G.w, 64, G.w, 0, 0xaeb6c2) }
    for (const r of G.rail.slice(1)) k.dbrick(X0 + m, Y0 + m, r[0], hz ? T : G.w, r[1] - r[0], hz ? G.w : T, 0, 0x4a4f58);
  });
  KL.obj('lock', (k, o) => {
    if (!o.open) { k.dbrick(o.x, o.y - 16.4, 30, 6, 6, .8, 0, 0xd4452f, .9); k.dbrick(o.x, o.y + 16.4, 30, 6, 6, .8, 0, 0xd4452f, .9) }
    else { k.dbrick(o.x - 12.5, o.y, 0, 5, 50, k.T - 4, 0, 0x4a4f58); k.dbrick(o.x + 9.5, o.y, 46, 5, 3, 5, 0, 0x7ee34a, .9) }
  });
  KL.obj('reader', (k, o) => { k.dbrick(o.x, o.y, 18, 8, 20, 16, 0, 0x2a2e36); k.dbrick(o.x, o.y + 8.4, 30, 4, 3, .8, 0, o.open ? 0x7ee34a : 0xd4452f, 1) });
  KL.obj('card', (k, o) => { k.dbrick(o.x, o.y, k.topAt(o.x, o.y), 9, 1.4, 6, 0, 0x7ee34a, .4) });
}
