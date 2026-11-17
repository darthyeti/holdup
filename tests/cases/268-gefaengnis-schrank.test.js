// Ticket 268: Waffenschrank im Zellentrakt des Gefangenen (immer erreichbar, je Gefangener eine Pistole, Client sieht ihn) und frueh geoeffnete Servicetuer.
module.exports = [
  {
    name: 'Gefaengnis: Waffenschrank steht im Gang des Trakts des Gefangenen, nach dem Aufhebeln der Zelle erreichbar, auf vielen Seeds',
    timeout: 240000,
    async run(t) {
      await t.loadTool('loopnet.js'); await t.loadInpage('coop.js');
      const r = await t.page.evaluate(`(() => {
        const o = { bad: [], n: 0 };
        for (let sd = 1; sd <= 8; sd++) {
          const G = CT.mkGame('prison', sd, 2, 60, 20), A = G.A, R = A.LAY().prison, T = 32;
          const wk = R.wk, tb = R.tb, y0 = tb ? 15 : 1, p = A.get().players[1];
          const it = A.get().its.find(i => i.t === 'wkb');
          const floor = A.world().M[wk[1] + 6][wk[0] + 6];
          if (!wk || wk[0] !== 11 || wk[1] !== y0 + 3 || floor !== '.' || !it) { o.bad.push([sd, 'lage', wk, floor, !!it]); continue; }
          const pry = A.get().its.find(i => i.t === 'pry'); pry.act(p);
          const M = A.world().M, ok = (x, y) => '.l'.includes(M[y + 6][x + 6]), seen = new Set(), q = [[Math.floor(p.x / T), Math.floor(p.y / T)]]; let hit = false;
          while (q.length) { const [x, y] = q.pop(); if (seen.has(x + ',' + y) || !ok(x, y)) continue; seen.add(x + ',' + y); if (x === Math.floor(it.x / T) && y === Math.floor(it.y / T)) { hit = true; break; } q.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]); }
          if (!hit) o.bad.push([sd, 'weg']);
          p.x = it.x; p.y = it.y + 10; p.mag = 0; p.res = 0; p.pgw = 0;
          if (!it.ok(p)) o.bad.push([sd, 'ok']);
          o.n++;
        }
        return o; })()`);
      t.eq(r.bad, [], 'Schrank je Seed an der Stelle, Weg aus der aufgehebelten Zelle, aufhebbar');
      t.eq(r.n, 8, 'alle 8 Seeds geprueft');
    },
  },
  {
    name: 'Gefaengnis: Pistole aus dem Waffenschrank (nur Unbewaffnete, einmal je Gefangenem), Client sieht Schrank und leeren Zustand',
    timeout: 120000,
    async run(t) {
      await t.loadTool('loopnet.js'); await t.loadInpage('coop.js');
      const r = await t.page.evaluate(`(() => {
        const G = CT.mkGame('prison', 5, 2, 60, 20), A = G.A, B = G.clients[0], o = {};
        const both = (sec) => { for (let i = 0; i < Math.round(sec * 60); i++) { A.get().players.forEach(p => { p.hp = 1e9; p.dead = false; }); step(G.insts, G.net, 1 / 60); } };
        const wi = D => D.get().its.find(i => i.t === 'wkb');
        o.cl = !!wi(B); o.pos = Math.hypot(wi(A).x - wi(B).x, wi(A).y - wi(B).y) < 1;
        const p1 = A.get().players[1], p0 = A.get().players[0];
        p1.mag = 0; p1.res = 0; p1.pgw = 0;
        o.ok = [wi(A).ok(p1), wi(A).ok(p0)];   // Spieler 1 ist der Gefangene, Spieler 0 draussen
        wi(A).act(p1); both(1);
        o.gun = [p1.wp.n, p1.mag > 0, p1.res > 0, p1.pgw];
        o.after = [wi(A).ok(p1), wi(A).done, wi(B).done];
        p1.mag = 0; p1.res = 0; o.again = wi(A).ok(p1);   // leer geschossen: nicht noch einmal
        return o; })()`);
      t.eq(r.cl, true, 'Client hat den Schrank');
      t.eq(r.pos, true, 'gleiche Lage bei Host und Client');
      t.eq(r.ok, [true, false], 'nur der unbewaffnete Gefangene kann nehmen');
      t.eq(r.gun, ['Pistole', true, true, 1], 'Pistole mit Magazin und Reserve');
      t.eq(r.after, [false, true, true], 'danach nicht mehr aufhebbar, leer bei Host und Client');
      t.eq(r.again, false, 'jeder Gefangene nimmt nur einmal');
    },
  },
  {
    name: 'Gefaengnis: Servicetuer der Kueche schon nach rund 20 s (Lieferfenster 18 bis 24 s)',
    timeout: 240000,
    async run(t) {
      await t.loadTool('loopnet.js'); await t.loadInpage('coop.js');
      const r = await t.page.evaluate(`(() => {
        const o = { at: [] };
        for (let sd = 1; sd <= 12; sd++) { const G = CT.mkGame('prison', sd, 2, 60, 20); o.at.push(G.A.LAY().prison.dl.at); o.C = G.A.CFG.prison.delivery; }
        return o; })()`);
      t.eq(r.C, [18, 24], 'CFG.prison.delivery');
      t.eq(r.at.filter(a => a < 18 || a > 24), [], 'Lieferzeit je Seed im Fenster: ' + r.at.join());
    },
  },
];
