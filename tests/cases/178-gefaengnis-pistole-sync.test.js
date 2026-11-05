// Issue 114: Die Pistole der Wache (pist) liegt beim Client dort, wo der Host sie hat (am Gürtel, getragen vom Gegner, fallen gelassen, aufgehoben).
module.exports = [
  {
    name: 'Gefaengnis: Pistole liegt beim Client dort, wo der Host sie hat (Gürtel, Gegner, Fallstelle, aufgehoben)',
    timeout: 120000,
    async run(t) {
      await t.loadTool('loopnet.js'); await t.loadInpage('coop.js');
      const r = await t.page.evaluate(`(() => {
        const G = CT.mkGame('prison', 5, 2, 60, 20), A = G.A, B = G.clients[0], o = {};
        const both = (sec) => { for (let i = 0; i < Math.round(sec * 60); i++) { A.get().players.forEach(p => { p.hp = 1e9; p.dead = false; }); step(G.insts, G.net, 1 / 60); } };
        const pi = (I, k) => I.get().its.filter(i => i.t === 'pist')[k];
        const same = (k) => Math.hypot(pi(A, k).x - pi(B, k).x, pi(A, k).y - pi(B, k).y) < 12;
        both(1);
        o.belt = [same(0), same(1)];
        A.startHeist(true, A.get().players[0]); both(1);
        const e = A.get().en.find(q => q.pgi === 0);
        o.hasEn = !!e;
        if (e) { e.x += 40; e.y += 30; both(0.3); o.carry = [same(0), Math.hypot(pi(A, 0).x - e.x, pi(A, 0).y - e.y) < 3]; e.hp = 0; both(1); }
        const h = pi(A, 0);
        o.drop = [same(0), !!e && Math.hypot(h.x - e.x, h.y - e.y) < 3];
        const p1 = A.get().players[1]; p1.x = h.x; p1.y = h.y; p1.mag = 0; p1.res = 0; p1.pgw = 0; p1.wp = A.CFG.wpn.smg;
        o.ok = h.ok(p1); h.act(p1); both(0.5);
        o.picked = [pi(A, 0).done, pi(B, 0).done, same(0)];
        return o; })()`);
      t.eq(r.belt, [true, true], 'Gürtel: gleiche Lage');
      t.eq(r.hasEn, true, 'Wache 0 wurde zum Gegner');
      t.eq(r.carry, [true, true], 'Gegner trägt die Pistole, Client sieht sie dort');
      t.eq(r.drop, [true, true], 'Fallstelle gleich beim Client und am toten Gegner');
      t.eq(r.ok, true, 'Gefangener kann sie aufheben');
      t.eq(r.picked, [true, true, true], 'aufgehoben bei Host und Client, Lage gleich');
    },
  },
];
