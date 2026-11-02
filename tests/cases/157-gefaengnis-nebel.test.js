// Gefaengnis, Issue 73 (Tills Log vom 2. November 2026): Die Schluesselkarte der Trakt-Wache (Objekt crd, gezeichnetes Kartensymbol) wurde auch gezeichnet, wenn ihre Stelle im Nebel lag (Gefangener in der Zelle sah die Karte der Wache durch die Wand). Jetzt nur bei Sicht (los vom Spieler), auf Host und Client gleich.
const HELP = `(() => {
  const G = CT.mkGame('prison', 5, 2, 60, 20), A = G.A, B = G.clients[0], T = 32;
  const both = sec => { for (let i = 0; i < Math.round(sec * 60); i++) { A.get().players.forEach(p => { p.hp = 100; p.dead = false; }); step(G.insts, G.net, 1 / 60); } };
  // zaehlt, wie oft das gruene Kartensymbol (9x6 Pixel bei x+6, y-10) beim Zeichnen gemalt wird
  const cardDraws = (D, cc) => { const ctx = D.cv.getContext('2d'), orig = ctx.fillRect; let n = 0;
    ctx.fillRect = function (x, y, w, h) { if (this.fillStyle === '#7ee34a' && w === 9 && h === 6 && Math.abs(x - (cc.x + 6)) < 0.5 && Math.abs(y - (cc.y - 10)) < 0.5) n++; return orig.apply(this, arguments); };
    D.draw(); ctx.fillRect = orig; return n; };
  return { G, A, B, T, both, cardDraws };
})()`;
module.exports = [
  {
    name: 'Gefaengnis-Nebel: die Schluesselkarte der Wache wird nur gezeichnet, wenn sie fuer den Spieler sichtbar ist (Gefangener in der Zelle: nicht, mit Sicht: ja), Host und Client gleich',
    timeout: 120000,
    async run(t) {
      await t.loadTool('loopnet.js'); await t.loadInpage('coop.js');
      const r = await t.page.evaluate(`(() => {
        const H = ${HELP}, A = H.A, B = H.B, o = {}, R = A.LAY().prison;
        for (const D of [A, B]) { const cc = D.get().its.find(i => i.t === 'crd'), me = D.get().me; o[D.name] = {}; o[D.name].has = !!cc;
          const keep = [me.x, me.y]; const z = R.cell; me.x = (z[0] + .5) * H.T; me.y = (z[1] + .5) * H.T;
          const far = !D.los(me.x, me.y, cc.x, cc.y); o[D.name].far = far; o[D.name].hidden = H.cardDraws(D, cc);
          me.x = cc.x; me.y = cc.y + 40; if (!D.los(me.x, me.y, cc.x, cc.y)) me.y = cc.y - 40; o[D.name].near = D.los(me.x, me.y, cc.x, cc.y); o[D.name].shown = H.cardDraws(D, cc); me.x = keep[0]; me.y = keep[1]; }
        return o; })()`);
      for (const k of ['a', 'c1']) {
        t.ok(r[k] && r[k].has, k + ': Karte vorhanden');
        t.ok(r[k].far && r[k].near, k + ': Zelle ohne Sicht auf die Karte, Standpunkt neben der Wache mit Sicht');
        t.eq(r[k].hidden, 0, k + ': ohne Sicht wird die Karte nicht gezeichnet');
        t.ok(r[k].shown >= 1, k + ': mit Sicht wird sie gezeichnet');
      }
    },
  },
  {
    name: 'Gefaengnis-Nebel: Gitter, Tueren und Kartenleser zeigen ausser Sicht den zuletzt gesehenen Zustand (am Anfang zu), nicht den echten; in Sicht den echten (Host und Client)',
    timeout: 120000,
    async run(t) {
      await t.loadTool('loopnet.js'); await t.loadInpage('coop.js');
      const r = await t.page.evaluate(`(() => {
        const H = ${HELP}, A = H.A, B = H.B, o = {}, T = H.T;
        // zaehlt den roten Punkt (6x6) der geschlossenen Stelle q (Kachel) beim Zeichnen
        const reds = (D, q) => { const ctx = D.cv.getContext('2d'), orig = ctx.fillRect, X = q[0] * T, Y = q[1] * T; let n = 0;
          ctx.fillRect = function (x, y, w, h) { if (this.fillStyle === '#d4452f' && w === 6 && h === 6 && Math.abs(x - (X + T / 2 - 3)) < .5 && Math.abs(y - (Y + T / 2 - 3)) < .5) n++; return orig.apply(this, arguments); };
          D.draw(); ctx.fillRect = orig; return n; };
        for (const D of [A, B]) { const R = D.LAY().prison, lk = R.locks.find(l => l.id === 'z'), q = lk.cells[0], me = D.get().me, o2 = o[D.name] = {};
          const far = [43.5 * T, 20.5 * T], cx = q[0] * T + 16, cy = q[1] * T + 16, near = [[-1.5, 0], [1.5, 0], [0, -1.5], [0, 1.5]].map(d => [cx + d[0] * T, cy + d[1] * T]).find(w => D.los(w[0], w[1], cx, cy)) || [cx, cy];
          const at = pos => { me.x = pos[0]; me.y = pos[1]; };
          const setc = ch => { D.world().setc(q[0], q[1], ch); };
          at(far); o2.farHidden = !D.los(far[0], far[1], q[0] * T + 16, q[1] * T + 16); o2.start = reds(D, q);          // zu gesehen (Anfangszustand)
          setc('l'); o2.openUnseen = reds(D, q);                                                                      // echt offen, aber unbekannt: weiter rot
          at(near); o2.nearSees = D.los(near[0], near[1], q[0] * T + 16, q[1] * T + 16); o2.openSeen = reds(D, q);    // gesehen: offen, kein Rot
          at(far); o2.openRemembered = reds(D, q); setc('L'); o2.closedUnseen = reds(D, q);                           // echt wieder zu, unbekannt: bleibt offen
          at(near); o2.closedSeen = reds(D, q); at(far); }
        return o; })()`);
      for (const k of ['a', 'c1']) {
        t.ok(r[k].farHidden && r[k].nearSees, k + ': Standpunkte (fern ohne, nah mit Sicht)');
        t.ok(r[k].start >= 1, k + ': am Anfang zu (roter Punkt)');
        t.ok(r[k].openUnseen >= 1, k + ': echt offen, aber ungesehen: weiter als zu gezeichnet');
        t.eq(r[k].openSeen, 0, k + ': gesehen: offen');
        t.eq([r[k].openRemembered, r[k].closedUnseen], [0, 0], k + ': ausser Sicht bleibt der zuletzt gesehene Zustand (offen), auch wenn es echt wieder zu ist');
        t.ok(r[k].closedSeen >= 1, k + ': wieder gesehen: zu');
      }
    },
  },
];
