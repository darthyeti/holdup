// Notenbank N4 (Ticket 69, Tills nb-halten A): Anzeige "Gebaeude gehalten". Der Host zaehlt je Ring (1 Vorhalle, 2 Kassenhalle, 3 innerer Bereich, 4 Keller) die lebenden Beamten, der tiefste Ring mit Polizei bremst Presse (pressF) und Bohrer (drillF) ohne zusaetzlichen Stillstand, die Zeit "gehalten" zaehlt nur ohne Polizei im Gebaeude, Meldungen bei neuem oder zurueckeroberten Ring, Coop gleich.
const SOLO = `(() => {
  const D = __dbg, T = 32; D.sessReset(); D.setScenario('nb'); D.setSeedMode('random'); D.setLage([]); D.buildSeed(5); D.CFG.policeAt = 1e6; D.CFG.policeForced = 1e6; D.CFG.nb.alarmAt = 1e6; D.reset();
  const g = D.get(), me = g.me; g.npcs.splice(0); D.startHeist(true, me); D.nbd().fa.length = 0; D.nbp().nj = 1e9;
  const cops = [], at = { 0: [14.5 * T, 31.5 * T], 1: [14.5 * T, 25.5 * T], 2: [14.5 * T, 20.5 * T], 3: [12 * T, 10.5 * T], 4: [20.5 * T, 4.5 * T] };
  const put = (ring, hp) => { const c = D.mkCop(at[ring][0], at[ring][1], false); c.hp = hp || 1e9; c.ring = ring; D.get().en.push(c); cops.push(c); return c; };
  const hold = () => { for (const c of cops) if (c.hp > 0) { c.x = at[c.ring][0]; c.y = at[c.ring][1]; c.cool = 1e9; c.react = -1e9; } };
  const step = (sec, f) => { for (let i = 0; i < Math.round(sec * 30); i++) { me.hp = 1e9; me.dead = false; hold(); if (f) f(i); D.update(1 / 30); } };
  const clear = () => { for (const c of cops) c.hp = 0; cops.length = 0; D.get().en.length = 0; };
  return { D, g, me, T, at, cops, put, step, clear, C: D.CFG.nb };
})()`;

module.exports = [
  {
    name: 'Halten: Ringe nach Position (draussen 0, Vorhalle 1, Kassenhalle mit Schleuse 2, innerer Bereich mit Panzertuer 3, Keller mit Treppe 4)',
    async run(t) {
      const r = await t.page.evaluate(() => { const D = __dbg, T = 32; D.setScenario('nb'); D.setSeedMode('random'); D.setLage([]); D.buildSeed(5); D.reset(); const f = (x, y) => D.nbRingAt(x * T + 16, y * T + 16);
        return [f(14, 33), f(-3, 10), f(14, 27), f(14, 24), f(14, 23), f(14, 19), f(14, 16), f(16, 15), f(14, 10), f(12, 7), f(16, 6), f(20, 3)]; });
      t.eq(r, [0, 0, 1, 1, 2, 2, 2, 3, 3, 3, 4, 4], 'Ringe: ' + JSON.stringify(r));
    },
  },
  {
    name: 'Halten: Zaehlung je Ring und tiefster Ring D; tote Beamte und Beamte draussen zaehlen nicht',
    timeout: 120000,
    async run(t) {
      const r = await t.page.evaluate(`(() => {
        const H = ${SOLO}, D = H.D, o = {}; H.step(1); o.leer = [D.nbh().D, D.nbh().c.join()];
        H.put(0); H.step(.5); o.draussen = D.nbh().D; const dead = H.put(2, 1e9); dead.hp = 0; D.nbHold(0); o.tot = D.nbh().D;
        H.clear(); H.put(1); H.put(1); H.step(.5); o.r1 = [D.nbh().D, D.nbh().c.join()];
        H.put(2); H.step(.5); o.r2 = [D.nbh().D, D.nbh().c.join()]; H.put(3); H.step(.5); o.r3 = [D.nbh().D, D.nbh().c.join()]; H.put(4); H.step(.5); o.r4 = [D.nbh().D, D.nbh().c.join()];
        H.clear(); H.step(.5); o.frei = [D.nbh().D, D.nbh().c.join()]; return o; })()`);
      t.eq(r.leer, [0, '0,0,0,0'], 'leer: gehalten');
      t.eq([r.draussen, r.tot], [0, 0], 'Beamte draussen und tote zaehlen nicht');
      t.eq([r.r1, r.r2, r.r3, r.r4], [[1, '2,0,0,0'], [2, '2,1,0,0'], [3, '2,1,1,0'], [4, '2,1,1,1']], 'Zahlen je Ring und tiefster Ring');
      t.eq(r.frei, [0, '0,0,0,0'], 'Rueckeroberung: wieder gehalten');
    },
  },
  {
    name: 'Halten: Wirkung. Polizei in Ring 2 bremst die Presse auf pressF[2], in Ring 3 laeuft sie mit pressF[3] (N5: 0,3), in Ring 4 steht sie ohne neuen Zustand (st bleibt 1), Bohrer in Ring 3 auf drillF[3], in Ring 4 steht er; nach der Rueckeroberung laufen beide von selbst weiter',
    timeout: 120000,
    async run(t) {
      const r = await t.page.evaluate(`(() => {
        const o = {}, run = ring => { const H = ${SOLO}, D = H.D, C = H.C; C.printT = 1; C.paperT = 1e6; C.careT = 1e6; C.slots = 30; C.drillT = 100; D.nbp().st = 1; D.nbd().st = 1; if (ring) H.put(ring); H.step(10);
          const a = [D.nbp().n, D.nbp().st, Math.round(D.nbp().paper * 1000) / 1000, D.nbd().st, Math.round(D.nbd().p * 1000) / 1000, D.nbd().c]; H.clear(); D.nbd().st = D.nbd().st === 2 ? 1 : D.nbd().st; H.step(10); return { a, b: [D.nbp().n, D.nbp().st, D.nbd().st, Math.round(D.nbd().p * 1000) / 1000] }; };
        o.r0 = run(0); o.r2 = run(2); o.r3 = run(3); o.r4 = run(4); return o; })()`);
      t.ok(r.r0.a[0] >= 9 && r.r0.a[4] > .09, 'ohne Polizei: Presse etwa 10 Buendel, Bohrer etwa 10 %: ' + JSON.stringify(r.r0.a));
      t.ok(Math.abs(r.r2.a[0] - 6) <= 1 && r.r2.a[1] === 1 && Math.abs(r.r2.a[4] - r.r0.a[4]) < .005, 'Ring 2: Presse mit 0,6, Bohrer unveraendert: ' + JSON.stringify(r.r2.a));
      t.ok(Math.abs(r.r3.a[0] - 10 * 0.3) <= 1 && r.r3.a[1] === 1 && Math.abs(r.r3.a[4] - r.r0.a[4] / 2) < .01, 'Ring 3: Presse laeuft mit pressF[3] 0,3 (N5) ohne neuen Zustand (st 1), Bohrer mit 0,5: ' + JSON.stringify(r.r3.a));
      t.ok(r.r4.a[0] === 0 && r.r4.a[3] === 2 && r.r4.a[5] === 2, 'Ring 4: Presse steht, Bohrer steht (Beamter im Keller, Ursache 2): ' + JSON.stringify(r.r4.a));
      t.ok(r.r2.b[0] - r.r2.a[0] >= 9 && r.r3.b[0] >= 9 && r.r3.b[1] === 1 && r.r3.b[3] > r.r3.a[4] + .09 && r.r4.b[0] >= 9, 'Rueckeroberung: Presse und Bohrer laufen von selbst weiter: ' + JSON.stringify([r.r2.b, r.r3.b, r.r4.b]));
    },
  },
  {
    name: 'Halten: Die Zeit gehalten zaehlt nur ohne Polizei im Gebaeude, Meldungen bei neuem Ring und bei Rueckeroberung, das Ergebnis nennt die Zeit',
    timeout: 120000,
    async run(t) {
      const r = await t.page.evaluate(`(() => {
        const H = ${SOLO}, D = H.D, o = {}; H.step(5); o.t0 = D.nbh().t; const c = H.put(2); H.step(.2); o.msg2 = D.nbh().last; H.step(5); o.t1 = D.nbh().t; c.hp = 0; H.step(3); o.msg0 = D.nbh().last; o.t2 = D.nbh().t; H.step(5); o.t3 = D.nbh().t;
        H.put(4); H.step(3); o.msg4 = D.nbh().last; D.finish(true, 'Test', 'x'); const e = D.get().ended; o.line = e && e.lines.find(l => /^Gebäude gehalten/.test(l)); return o; })()`);
      t.ok(Math.abs(r.t0 - 5) < .6, 'ohne Polizei zaehlt die Zeit: ' + r.t0);
      t.ok(Math.abs(r.t1 - r.t0) < .6, 'mit Polizei drinnen steht die Zeit: ' + JSON.stringify([r.t0, r.t1]));
      t.ok(r.t3 - r.t2 > 4.4, 'nach der Rueckeroberung zaehlt sie wieder: ' + JSON.stringify([r.t2, r.t3]));
      t.ok(/Kassenhalle/.test(r.msg2) && /gehalten/.test(r.msg0) && /Keller/.test(r.msg4), 'Meldungen: ' + JSON.stringify([r.msg2, r.msg0, r.msg4]));
      t.ok(/^Gebäude gehalten: \d+:\d\d/.test(r.line || ''), 'das Ergebnis nennt die Zeit: ' + r.line);
    },
  },
  {
    name: 'Halten Coop: Host und Client sehen tiefsten Ring, Zahlen je Ring und gehaltene Zeit (Schnappschuss nbh), das Ergebnis nennt die Zeit auf beiden',
    timeout: 180000,
    async run(t) {
      await t.loadTool('loopnet.js'); await t.loadInpage('coop.js');
      const r = await t.page.evaluate(`(() => {
        const G = CT.mkGame('nb', 5, 2, 60, 20), A = G.A, B = G.clients[0], o = {}, T = 32;
        const both = (sec, f) => { for (let i = 0; i < Math.round(sec * 60); i++) { A.get().players.forEach(p => { p.hp = 1e9; p.dead = false; }); if (f) f(i); G.run(1 / 60); } };
        for (const D of [A, B]) { D.CFG.policeAt = 1e6; D.CFG.policeForced = 1e6; D.CFG.nb.alarmAt = 1e6; }
        A.startHeist(true, A.get().me); G.run(1); both(4); G.run(1); o.a = [A.nbh().D, B.nbh().D, Math.round(A.nbh().t), Math.round(B.nbh().t)];
        const c = A.mkCop(12 * T, 10.5 * T, false); c.hp = 1e9; A.get().en.push(c); both(2, () => { c.x = 12 * T; c.y = 10.5 * T; c.cool = 1e9; c.react = -1e9; }); G.run(1); o.b = [A.nbh().D, B.nbh().D, A.nbh().c.join(), B.nbh().c.join()];
        A.finish(true, 'Test', 'x'); G.run(1); o.line = [A, B].map(D => (D.get().ended && D.get().ended.lines || []).find(l => /^Gebäude gehalten/.test(l)) || ''); return o; })()`);
      t.ok(r.a[0] === 0 && r.a[1] === 0 && r.a[2] >= 3 && Math.abs(r.a[2] - r.a[3]) <= 1, 'gehalten und Zeit gleich: ' + JSON.stringify(r.a));
      t.eq(r.b, [3, 3, '0,0,1,0', '0,0,1,0'], 'Ring 3 und Zahlen gleich auf beiden');
      t.ok(/Gebäude gehalten/.test(r.line[0]) && r.line[0] === r.line[1], 'Ergebnis nennt die Zeit auf beiden: ' + JSON.stringify(r.line));
    },
  },
  {
    name: 'Halten: Die Ringe kommen aus der Karte (LAY.nb.rings, aus den Engstellen abgeleitet): jede Gebaeudekachel liegt in genau einem Ring, ohne die Engstellen kommt man aus keinem Ring heraus und in jedem Ring zu allen Bodenkacheln (24 Seeds mit den Varianten aus N7), nbRingAt liest nur die Karte',
    open: { nbvar: true },
    timeout: 240000,
    async run(t) {
      const r = await t.page.evaluate(() => {
        const D = __dbg, T = 32, bad = []; D.setScenario('nb'); D.setSeedMode('random'); D.setLage([]);
        for (let sd = 1; sd <= 24; sd++) {
          D.buildSeed(sd); D.reset(); const L = D.LAY(), B = L.bld, w = D.world(), cl = (x, y) => w.M[y + 6][x + 6]; if (!L.nb.rings || L.nb.rings.length !== 4) { bad.push('Seed ' + sd + ' keine vier Ringe'); continue; }
          const ringOf = (x, y) => { const k = []; L.nb.rings.forEach((rs, i) => { if (rs.some(q => x >= q[0] && x <= q[2] && y >= q[1] && y <= q[3])) k.push(i + 1); }); return k; };
          let miss = 0; for (let y = B.y0 + 1; y < B.y1; y++) for (let x = B.x0 + 1; x < B.x1; x++) { const k = ringOf(x, y); if (k.length !== 1) miss++; if (k.length === 1 && D.nbRingAt(x * T + 16, y * T + 16) !== k[0]) miss++; }
          if (miss) bad.push('Seed ' + sd + ' Kacheln ohne genau einen Ring: ' + miss);
          const SOL = '#WYwCVXfvekqPpbAmrfuNL', walk = (x, y) => { const c = cl(x, y); return c !== undefined && (!SOL.includes(c) || c === 'V'); };   // Tresortuer V zaehlt als Durchgang im Ring 3
          const G = L.nb.gates, gate = new Set([].concat(G.schleuse, G.panzer, G.treppe).map(c => c.join()));
          for (let k = 1; k <= 4; k++) {
            const cells = []; for (let y = B.y0 + 1; y < B.y1; y++) for (let x = B.x0 + 1; x < B.x1; x++) if (ringOf(x, y)[0] === k && walk(x, y) && !gate.has(x + ',' + y)) cells.push([x, y]);
            if (!cells.length) { bad.push('Seed ' + sd + ' Ring ' + k + ' leer'); continue; }
            const seen = new Set([cells[0] + '']), q = [cells[0]], leak = [];
            for (let h = 0; h < q.length; h++) for (const d of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const n = [q[h][0] + d[0], q[h][1] + d[1]]; if (seen.has(n + '') || !walk(n[0], n[1]) || gate.has(n + '')) continue; const inB = n[0] > B.x0 && n[0] < B.x1 && n[1] > B.y0 && n[1] < B.y1; if (inB && ringOf(n[0], n[1])[0] !== k) { leak.push(n + ''); continue; } if (!inB) continue; seen.add(n + ''); q.push(n); }
            if (leak.length) bad.push('Seed ' + sd + ' Ring ' + k + ' leckt ohne Engstelle: ' + leak.slice(0, 2));
            const unreached = cells.filter(c => !seen.has(c + '')); if (unreached.length) bad.push('Seed ' + sd + ' Ring ' + k + ' zerfaellt (' + unreached.length + ' Kacheln nicht erreichbar)');
          }
        }
        return bad; });
      t.eq(r, [], 'Ringe aus der Karte: ' + JSON.stringify(r.slice(0, 4)));
    },
  },
  {
    name: 'Halten: Meldungen entprellt. Ein pendelnder Beamter an der Tuer gibt hoechstens eine Meldung je holdMsgT (auch beim Wechsel auf 0), ein schneller Wechsel von Ring 2 nach 3 wird nach Ablauf nachgemeldet, die Anzeige (D) wechselt sofort',
    timeout: 120000,
    async run(t) {
      const r = await t.page.evaluate(`(() => {
        const o = {}, H = ${SOLO}, D = H.D, C = H.C; C.holdMsgT = 2; const c = H.put(1); let n0 = D.nbh().n | 0;
        H.step(8, i => { c.ring = (Math.floor(i / 9) % 2) ? 0 : 1; }); o.pend = (D.nbh().n | 0) - n0; o.pendRep = D.nbh().rep;
        H.clear(); H.step(3); const d = H.put(2); H.step(.2); const n1 = D.nbh().n; o.first = D.nbh().last; d.ring = 3; H.step(.3); o.dNow = D.nbh().D; o.msgNow = D.nbh().last; H.step(2.5); o.msgLater = D.nbh().last; o.nLater = D.nbh().n - n1; return o; })()`);
      t.ok(r.pend >= 1 && r.pend <= 5, 'pendelnder Beamter (8 s, 0 und 1 im Wechsel alle 0,3 s): hoechstens eine Meldung je 2 s (vier bis fuenf): ' + r.pend);
      t.ok(/Kassenhalle/.test(r.first), 'erste Meldung nennt den Ring: ' + r.first);
      t.eq(r.dNow, 3, 'die Anzeige wechselt sofort auf Ring 3');
      t.ok(/Pressenraum/.test(r.msgLater) && r.nLater >= 1, 'der schnelle Wechsel von 2 nach 3 wird nach Ablauf nachgemeldet: ' + JSON.stringify([r.msgNow, r.msgLater, r.nLater]));
    },
  },
];
