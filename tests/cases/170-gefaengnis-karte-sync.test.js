// Issue 96: Die Schluesselkarte (crd) bewegt der Host (Wache traegt sie, laesst sie fallen), der Client sieht dieselbe Lage.
module.exports = [
  {
    name: 'Gefaengnis: Schluesselkarte liegt beim Client dort, wo der Host sie hat (Wache, Fallstelle)',
    timeout: 120000,
    async run(t) {
      await t.loadTool('loopnet.js'); await t.loadInpage('coop.js');
      const r = await t.page.evaluate(`(() => {
        const G = CT.mkGame('prison', 5, 2, 60, 20), A = G.A, B = G.clients[0], o = {};
        const both = (sec) => { for (let i = 0; i < Math.round(sec * 60); i++) { A.get().players.forEach(p => { p.hp = 1e9; p.dead = false; }); step(G.insts, G.net, 1 / 60); } };
        const ci = (I) => I.get().its.find(i => i.t === 'crd');
        both(1);
        let h = ci(A), c = ci(B);
        const gd = A.get().npcs.find(n => n.cardG);
        const c0 = { x: c.x, y: c.y }; gd.x += 70; gd.y += 40; both(0.3);
        o.moved = [Math.hypot(h.x - c.x, h.y - c.y) < 12, Math.hypot(h.x - gd.x, h.y - gd.y) < 3, Math.hypot(c.x - c0.x, c.y - c0.y) > 30];
        A.startHeist(true, A.get().players[0]); both(1);
        h = ci(A); c = ci(B); const e = A.get().en.find(q => q.card);
        if (e) { e.x += 30; e.y += 20; both(0.2); o.carry = [Math.hypot(h.x - c.x, h.y - c.y) < 40, Math.hypot(c.x - gd.x, c.y - gd.y) > 20]; e.hp = 0; both(1); }
        o.drop = [!!h.drop, Math.hypot(h.x - c.x, h.y - c.y) < 12, !!c.drop, !!e];
        return o; })()`);
      t.eq(r.moved, [true, true, true], 'Karte folgt der Wache auch beim Client');
      t.eq(r.carry, [true, true], 'Karte folgt dem Gegner mit Karte');
      t.eq(r.drop, [true, true, true, true], 'Fallstelle gleich, Client kennt die Fallstelle');
    },
  },
];
