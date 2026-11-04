// Issue 89: Der Gefangene fuehrt nach der aufgehobenen Pistole die Pistole (nicht die Kit-Waffe) bis zum Ende der Runde, der Client sieht sie, in der naechsten Runde gilt wieder das Kit.
module.exports = [
  {
    name: 'Gefaengnis: aufgehobene Pistole ist eine Pistole (Kit mit SMG), nach dem Alarm weiter, Client sieht sie, naechste Runde wieder die Kit-Waffe',
    timeout: 120000,
    async run(t) {
      await t.loadTool('loopnet.js'); await t.loadInpage('coop.js');
      const r = await t.page.evaluate(`(() => {
        const G = CT.mkGame('prison', 5, 2, 60, 20), A = G.A, B = G.clients[0], o = {};
        const both = (sec) => { for (let i = 0; i < Math.round(sec * 60); i++) { A.get().players.forEach(p => { p.hp = 1e9; p.dead = false; }); step(G.insts, G.net, 1 / 60); } };
        const p1 = A.get().players[1], q1 = B.get().players[1];
        for (const p of [p1, q1]) { p.kit.w = 'smg'; p.wp = A.CFG.wpn.smg; }
        p1.kit.sk = { A0: 2 };   // Reserve-Skill (A0) wirkt auch auf die Pistole
        const S = CT.addSpec(G); G.run(2); const s1 = S.get().players[1]; s1.kit.w = 'smg'; s1.wp = A.CFG.wpn.smg;
        const gd = A.get().npcs.filter(n => n.k === 'grd' && n.st !== 'away')[0]; gd.st = 'ko'; gd.kt = 30;
        const pist = A.get().its.filter(i => i.t === 'pist')[0]; pist.act(p1); both(1);
        o.host = [p1.wp.n, p1.mag, p1.res > 72]; o.cl = [q1.wp.n]; o.spec = [s1.wp.n];
        A.startHeist(true, A.get().players[0]); both(1);
        o.alarm = [A.get().phase, p1.wp.n, q1.wp.n, s1.wp.n];
        A.reset(); o.next = [A.get().players[1].wp.n, A.get().players[1].kit.w, A.get().players[1].pgw | 0];
        return o; })()`);
      const P = 'Pistole';
      t.eq(r.host, [P, 12, true], 'Gefangener hat Pistole, Reserve mit A0-Skill ueber 72');
      t.eq(r.spec[0], P, 'Zuschauer sieht die Pistole');
      t.eq(r.cl, [P], 'Client sieht die Pistole');
      t.eq(r.alarm, [2, P, P, P], 'nach dem Alarm weiter die Pistole (Host, Client, Zuschauer)');
      t.eq(r.next.slice(1), ['smg', 0], 'Kit bleibt unangetastet, Flag weg: ' + r.next.join());
    },
  },
];
