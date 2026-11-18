// Ticket 295: Verstecke fuer Bewusstlose im Gefaengnis (LAY.prison.stashes, stow mit hide): Lage, Verstauen, 60 s ohne Fund, Gegenprobe auf der Wachroute, Client.
module.exports = [
  {
    name: 'Gefaengnis: Verstecke liegen auf freien Kacheln, Zellen nur im Trakt des Gefangenen ohne Mithaeftling, aussen in Waescherei, Wachstube, Kueche',
    timeout: 240000,
    async run(t) {
      await t.loadTool('loopnet.js'); await t.loadInpage('coop.js');
      const r = await t.page.evaluate(`(() => {
        const o = { bad: [], n: 0 };
        for (let sd = 1; sd <= 8; sd++) {
          const G = CT.mkGame('prison', sd, 2, 60, 20), A = G.A, R = A.LAY().prison, M = A.world().M, y0 = R.tb ? 15 : 1;
          const fl = c => '.l'.includes(M[c[1] + 6][c[0] + 6]), inR = (r, c) => c[0] >= r[0] && c[0] <= r[2] && c[1] >= r[1] && c[1] <= r[3];
          const S = R.stashes, kinds = S.map(q => q.kind).sort().join(',');
          if (kinds !== 'bett,korb,spind,vorrat,zelle,zelle,zelle,zelle') o.bad.push([sd, 'arten', kinds]);
          for (const q of S) {
            if (!q.cells.every(fl) || !q.deep.every(fl)) o.bad.push([sd, q.id, 'kachel']);
            if (!q.deep.every(d => q.cells.some(c => c[0] === d[0] && c[1] === d[1]))) o.bad.push([sd, q.id, 'deep']);
            if (q.kind === 'zelle' && !(q.cells.every(c => c[1] >= y0 && c[1] <= y0 + 7) && !q.cells.some(c => R.inm.some(m => m[0] === c[0] && m[1] === c[1])))) o.bad.push([sd, q.id, 'trakt']);
            if (q.kind === 'bett' && !q.cells.every(c => inR(R.rooms.kran, c))) o.bad.push([sd, q.id, 'raum']);
            if (q.kind === 'korb' && !q.cells.every(c => inR(R.rooms.wasch, c))) o.bad.push([sd, q.id, 'raum']);
            if (q.kind === 'spind' && !q.cells.every(c => inR(R.rooms.wach, c))) o.bad.push([sd, q.id, 'raum']);
            if (q.kind === 'vorrat' && !q.cells.every(c => inR(R.rooms.kue, c))) o.bad.push([sd, q.id, 'raum']);
            if (q.side === 'out' && !q.hide) o.bad.push([sd, q.id, 'hide']);
          }
          o.n++;
        }
        return o; })()`);
      t.eq(r.bad, [], 'Verstecke je Seed an freien Kacheln in den richtigen Raeumen');
      t.eq(r.n, 8, 'alle 8 Seeds geprueft');
    },
  },
  {
    name: 'Gefaengnis: Koerper im Versteck (je Art) bleibt 60 s ungefunden, derselbe Koerper auf der Wachroute wird gefunden, Client sieht den Koerper am Versteck',
    timeout: 900000, slow: true,
    async run(t) {
      await t.loadTool('loopnet.js'); await t.loadInpage('coop.js');
      const r = await t.page.evaluate(`(() => {
        const o = { stow: [], hid: [], ctl: [], cl: null }, px = c => (c + .5) * 32;
        const prep = (sd, n) => { const G = CT.mkGame('prison', sd, n, 60, 20), A = G.A; A.CFG.policeAt = 1e6; A.CFG.policeForced = 1e6;
          const g = A.get(), p = g.players[n - 1], a = g.npcs.find(q => q.k === 'grd' && q.st === 'idle'), b = g.npcs.find(q => q.k === 'grd' && q !== a);
          A.koMi(a).act(p); a.kt = 1e9; return { G, A, g, p, a, b }; };
        const run = (G, A, p, a, sec) => { let alarm = null; for (let i = 0; i < Math.round(sec * 60); i++) { p.x = -16; p.y = 176; p.hp = 1e9; p.dead = false; a.kt = 1e9; step(G.insts, G.net, 1 / 60); if (alarm === null && A.get().phase !== 1) alarm = +(i / 60).toFixed(1); } return alarm; };
        for (const sd of [3, 5]) {
          const kinds = prep(sd, 2).A.LAY().prison.stashes.map(q => q.id);
          for (const id of kinds) {
            const { G, A, p, a } = prep(sd, 2), S = A.LAY().prison.stashes.find(q => q.id === id);
            a.x = px(S.cells[S.cells.length - 1][0]); a.y = px(S.cells[S.cells.length - 1][1]); p.x = a.x; p.y = a.y; A.bodyMi(a).act(p); const rel = A.relBody(p);
            const dc = [Math.floor(a.x / 32), Math.floor(a.y / 32)], inDeep = S.deep.some(d => d[0] === dc[0] && d[1] === dc[1]);
            o.stow.push([sd, id, rel, inDeep, a.hid === 1]);
            o.hid.push([sd, id, run(G, A, p, a, 60)]);
          }
          const { G, A, p, a, b } = prep(sd, 2); a.x = px(Math.round(b.route[0][0])); a.y = px(Math.round(b.route[0][1]));
          o.ctl.push([sd, a.hid ? 1 : 0, run(G, A, p, a, 60)]);
        }
        { const { G, A, p, a } = prep(5, 2), B = G.clients[0], S = A.LAY().prison.stashes.find(q => q.id === 'korb');
          a.x = px(S.cells[0][0]); a.y = px(S.cells[0][1]); p.x = a.x; p.y = a.y; A.bodyMi(a).act(p); A.relBody(p); for (let i = 0; i < 120; i++) step(G.insts, G.net, 1 / 60);
          const q = B.get().npcs.find(n => n.id === a.id); o.cl = [q.st, Math.floor(q.x / 32), Math.floor(q.y / 32), S.deep[0][0], S.deep[0][1]]; }
        return o; })()`);
      t.eq(r.stow.filter(x => !(x[2] === true && x[3] && x[4])), [], 'jedes Versteck verstaut: relBody, Koerper in deep, hid gesetzt');
      t.eq(r.stow.length, 16, '8 Verstecke auf 2 Seeds');
      t.eq(r.hid.filter(x => x[2] !== null), [], 'verstaut: 60 s ohne Alarm');
      t.eq(r.ctl.filter(x => x[1] !== 0 || x[2] === null).length, 0, 'ohne Versteck auf der Wachroute: Fund (Alarm), hid aus');
      t.eq(r.cl[0], 'ko', 'Client sieht den Bewusstlosen');
      t.eq([r.cl[1], r.cl[2]], [r.cl[3], r.cl[4]], 'Client sieht ihn an der Kachel des Verstecks');
    },
  },
];
