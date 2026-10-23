// Polizei-Anfahrt (Tills Beobachtungen aus den Coop-Runden zu viert): Beamte tauchten ohne Fahrzeug mitten im Spielfeld auf (Scharfschuetzen standen sofort auf ihrem Posten,
// dazu stiegen bei vollen Parkplaetzen immer mehr Beamte aus demselben Wagen), Wagen einer Seite starteten gleichzeitig am selben Punkt und fuhren ineinander.
// Neu: Wagen fahren als Kolonne (CFG.pol.carGap), parken danach in einer zweiten Reihe (CFG.pol.car.row), ist alles voll, kommen Beamte zu Fuss vom Kartenrand (fps),
// Scharfschuetzen steigen aus dem Wagen und gehen zu ihrem Posten, Streifenwagen sind zerschiessbar (explodieren wie Zapfsaeulen) und der Wellenabstand waechst mit der Spielerzahl.
async function setup(t) {
  await t.loadTool('loopnet.js');
  await t.loadInpage('coop.js');
}

// Aufbau (solo, Wellen wie zu viert ueber LAY.wb): Ueberfall, Polizei sofort, Spieler steht ausserhalb auf dem Spawn und ist unverwundbar
const SETUP = `(sc, seed, extra) => {
  const D = __dbg; D.setScenario(sc); D.setSeedMode(typeof seed === 'number' ? 'random' : 'classic'); D.setLage([]); D.setTurn('S'); D.buildSeed(seed);
  const L = D.LAY(); L.wb = (L.wb || 0) + (extra == null ? 6 : extra); D.CFG.policeAt = 1; D.CFG.policeForced = 1; D.CFG.snp.from = 99;
  D.startHeist(false, D.get().me);
  window.__run = (s, f) => { for (let i = 0; i < s * 30; i++) { const m = D.get().me; m.hp = 1e9; m.x = L.spawn.x; m.y = L.spawn.y; if (f) f(i); D.update(1 / 30); } };
  return L;
}`;

module.exports = [
  {
    name: 'Anfahrt: Wagen fahren als Kolonne ohne Ueberlappung, parken in zwei Reihen, danach kommen Beamte zu Fuss vom Rand (nie in Wand oder Gebaeude)',
    async run(t) {
      const r = await t.page.evaluate(`(() => { const S = ${SETUP}, out = [], tl = v => Math.floor(v / 32);
        for (const [sc, seed] of [['bank', 'classic'], ['bank', 5017], ['jewel', 11], ['gas', 21], ['museum', 31], ['casino', 41]]) {
          const L = S(sc, seed), D = __dbg, B = L.bld, LN = D.LANE(), seen = new Set(), bad = [], ov = new Set(); let maxCars = 0, row1 = 0, foot = 0, edgeOk = true;
          for (let i = 0; i < 30 * 150; i++) {
            if (i === 30 * 20 || i === 30 * 45 || i === 30 * 70 || i === 30 * 100) D.spawnWave();
            __run(1 / 30);
            const g = D.get(); foot = Math.max(foot, g.fps.length);
            for (const e of g.en) if (!seen.has(e.id) && ['cop', 'swat', 'shield', 'sniper'].includes(e.kind)) { seen.add(e.id); const x = tl(e.x), y = tl(e.y); if (D.isSol(x, y) || (x > B.x0 && x < B.x1 && y > B.y0 && y < B.y1)) bad.push([Math.round(e.x), Math.round(e.y)]); }
            const cs = g.pcs; maxCars = Math.max(maxCars, cs.length); row1 = Math.max(row1, cs.filter(c => c.row === 1).length);
            const on = cs.filter(c => c.x > LN.lo && c.x < LN.hi);
            for (let a = 0; a < on.length; a++) for (let b = a + 1; b < on.length; b++) if (Math.abs(on[a].x - on[b].x) < 118 && Math.abs(on[a].y - on[b].y) < 58) ov.add(a + '-' + b);
            const slots = new Set(); for (const c of cs) { const k = c.side + c.slot; if (slots.has(k)) bad.push('doppelter Platz ' + k); slots.add(k) }
          }
          out.push({ sc, seed, bad: bad.slice(0, 3), ov: ov.size, maxCars, row1, foot, parked: D.get().pcs.every(c => c.st === 'park') });
        }
        return out; })()`);
      for (const c of r) {
        const tag = c.sc + ' ' + c.seed;
        t.eq(c.bad, [], tag + ': kein Beamter in Wand, Gebaeude oder doppeltem Platz');
        t.eq(c.ov, 0, tag + ': Wagen ueberlappen sich nie auf der Karte');
        t.ok(c.parked, tag + ': alle Wagen stehen am Ende');
        t.ok(c.maxCars >= 8, tag + ': mehr als die Plaetze der ersten Reihe werden genutzt: ' + c.maxCars + ' Wagen');
        t.ok(c.row1 >= 1, tag + ': zweite Reihe wird genutzt');
      }
      t.ok(r.some(c => c.foot > 0), 'bei vollen Plaetzen kommen Beamte zu Fuss (Fussgruppen: ' + r.map(c => c.foot).join(',') + ')');
    },
  },
  {
    name: 'Anfahrt: die zweite Reihe liegt auf jeder Strassenseite weiter vom Gebaeude weg, Beamte steigen nirgends in Wand oder Gebaeude aus (gedrehte Karten)',
    async run(t) {
      const r = await t.page.evaluate(`(() => { const out = {}, tl = v => Math.floor(v / 32);
        for (const [sc, side] of [['bank', 'S'], ['bank', 'N'], ['bank', 'E'], ['bank', 'W'], ['jewel', 'E'], ['jewel', 'W'], ['gas', 'N']]) {
          const D = __dbg; D.setScenario(sc); D.setSeedMode('random'); D.setLage([]);
          const lay = D.layoutBase(5017); D.buildLay(side === 'S' ? lay : D.turnLayout(lay, side, false));
          const L = D.LAY(), B = L.bld, LN = D.LANE(); L.wb = (L.wb || 0) + 6; D.CFG.policeAt = 1; D.CFG.policeForced = 1; D.CFG.snp.from = 99; D.startHeist(false, D.get().me);
          const cx = (B.x0 + B.x1) / 2 * 32, cy = (B.y0 + B.y1) / 2 * 32, dist = c => Math.abs(LN.axis === 'x' ? c.y - cy : c.x - cx), seen = new Set(), bad = [];
          for (let i = 0; i < 30 * 70; i++) { if (i === 30 * 20 || i === 30 * 45) D.spawnWave(); const m = D.get().me; m.hp = 1e9; m.x = L.spawn.x; m.y = L.spawn.y; D.update(1 / 30);
            for (const e of D.get().en) if (!seen.has(e.id) && ['cop', 'swat', 'shield'].includes(e.kind)) { seen.add(e.id); const x = tl(e.x), y = tl(e.y); if (D.isSol(x, y) || (x > B.x0 && x < B.x1 && y > B.y0 && y < B.y1)) bad.push([Math.round(e.x), Math.round(e.y)]); } }
          const cs = D.get().pcs, r0 = cs.filter(c => c.row === 0 && c.st === 'park').map(dist), r1 = cs.filter(c => c.row === 1 && c.st === 'park').map(dist);
          out[sc + ' ' + side] = { r0: r0.length ? Math.round(Math.max(...r0)) : null, r1: r1.length ? Math.round(Math.min(...r1)) : null, n1: r1.length, bad: bad.slice(0, 2) };
        }
        return out; })()`);
      for (const [k, v] of Object.entries(r)) {
        t.eq(v.bad, [], k + ': keine Beamten in Wand oder Gebaeude');
        t.ok(v.n1 > 0, k + ': zweite Reihe wird genutzt');
        if (v.n1 > 0) t.ok(v.r1 > v.r0, k + ': zweite Reihe liegt weiter vom Gebaeude weg (' + v.r1 + ' gegen ' + v.r0 + ')');
      }
    },
  },
  {
    name: 'Anfahrt: Wagen derselben Seite starten nacheinander (Abstand), nicht zusammen',
    async run(t) {
      const r = await t.page.evaluate(`(() => { const S = ${SETUP}; S('bank', 'classic'); const D = __dbg; D.spawnWave(); const rows = [];
        for (let i = 0; i < 30 * 6; i++) { __run(1 / 30); const cs = D.get().pcs.filter(c => c.side === 'W' && c.st === 'in' && c.x > D.LANE().lo); if (cs.length >= 2) rows.push(cs.map(c => Math.round(c.x))); }
        const first = D.get().pcs.filter(c => c.side === 'W').map(c => [c.slot, c.st, Math.round(c.x)]);
        return { rows, first }; })()`);
      const sep = r.rows.filter(x => x.length >= 2).map(x => Math.abs(x[0] - x[1]));
      t.ok(sep.length > 0, 'zwei Wagen der Westseite sind gleichzeitig unterwegs');
      t.ok(sep.every(d => d >= 128), 'Abstand mindestens eine Wagenlaenge (128 px): ' + JSON.stringify(sep.slice(0, 12)));
    },
  },
  {
    name: 'Anfahrt: Scharfschuetzen kommen im Wagen, steigen aus, gehen zum Posten und zielen erst dort',
    async run(t) {
      const r = await t.page.evaluate(`(() => { const S = ${SETUP}; S('bank', 'classic', 0); const D = __dbg; D.CFG.snp.from = 1; D.CFG.snp.max = 2; D.spawnWave(); const o = {};
        o.sofort = D.get().en.filter(e => e.kind === 'sniper').length; o.imWagen = D.get().pcs.reduce((n, c) => n + c.crew.filter(q => q && q.sn).length, 0);
        o.msg = D.msgs().feed.find(f => /Scharfschütze/.test(f));
        let first = null, aimWalk = 0, arrive = null; const walkPos = [];
        for (let i = 0; i < 30 * 50; i++) { __run(1 / 30); const e = D.get().en.find(q => q.kind === 'sniper'); if (!e) continue; if (!first) { first = i / 30; o.start = [Math.round(e.x), Math.round(e.y), !!e.walk, Math.round(Math.min(...D.get().pcs.map(c => Math.hypot(c.x - e.x, c.y - e.y))))]; o.post = [Math.round(e.post.x), Math.round(e.post.y)]; }
          if (e.walk) { if (e.aim > 0) aimWalk++; walkPos.push([Math.round(e.x), Math.round(e.y)]); } else if (arrive == null) arrive = i / 30; }
        const e = D.get().en.find(q => q.kind === 'sniper');
        o.first = first; o.arrive = arrive; o.aimWalk = aimWalk; o.end = e && [Math.round(e.x), Math.round(e.y), !!e.walk]; o.steps = walkPos.length;
        o.anz = D.get().en.filter(q => q.kind === 'sniper').length;
        return o; })()`);
      t.eq(r.sofort, 0, 'beim Beginn der Welle steht noch kein Scharfschuetze im Spielfeld');
      t.ok(r.imWagen >= 1, 'er sitzt in einem Wagen: ' + r.imWagen);
      t.ok(/rückt an/.test(r.msg || ''), 'Meldung: ' + r.msg);
      t.ok(r.first != null && r.start[2], 'er steigt aus und geht (walk)');
      t.ok(r.start[3] < 140, 'er steigt am Wagen aus (Abstand ' + r.start[3] + ' px)');
      t.eq(r.aimWalk, 0, 'unterwegs zielt er nie');
      t.ok(r.arrive != null && r.steps >= 15 && r.arrive - r.first > .5, 'er braucht Zeit bis zum Posten (Posten im Sueden liegen nah an der Strasse): ' + (r.arrive - r.first).toFixed(1) + ' s');
      t.eq(r.end, [r.post[0], r.post[1], false], 'am Ende steht er auf dem Posten');
      t.ok(r.anz <= 2, 'hoechstens CFG.snp.max: ' + r.anz);
    },
  },
  {
    name: 'Zerschiessen: Spielerkugeln treffen Streifenwagen, bei 0 HP explodiert er (Besatzung stirbt, Schaden und Kette), das Wrack bleibt, Gegnerkugeln enden am Wagen ohne Schaden',
    async run(t) {
      const r = await t.page.evaluate(`(() => { const S = ${SETUP}; S('bank', 'classic', 6); const D = __dbg; D.spawnWave(); __run(14); D.spawnWave(); __run(14);
        const g = () => D.get(), o = {}, me = g().me; __run(20); const cars = g().pcs, c = cars.find(q => q.row === 0 && q.st === 'park' && q.side === 'E');
        const beh = cars.find(q => q.row === 1 && q.st === 'park' && q.side === 'E' && q.slot === c.slot + 4);
        o.beh = !!beh; c.crew = ['cop', 'cop']; c.ex = 1e9; const shoot = (own, k, dmg, ow) => { for (let j = 0; j < k; j++) g().bl.push({ id: 7000 + (shoot.n = (shoot.n || 0) + 1), x: c.x - 24 + j * 6, y: c.y - 60, vx: 0, vy: 720, l: .8, o: ow, own, d: dmg, dmg }); };
        // Gegnerkugel endet am Wagen (Wagen unversehrt)
        o.max = D.CFG.pol.car.hp; shoot(0, 1, 50, 0); __run(.2); o.gegner = c.hp;
        // ein Treffer
        const k0 = g().kills, st0 = me.st.k; shoot(0, 1, 50, 1); __run(.2); o.eins = c.hp;
        // Beamter an der Fahrertuer und Spieler in der Naehe vor der Explosion
        const cop = D.mkCop(c.x + 20, c.y - 50, 'cop'); g().en.push(cop); const hp0 = cop.hp, bh0 = beh ? beh.hp : null;
        me.x = c.x; me.y = c.y - 110; shoot(0, Math.ceil(o.max / 50) - 1, 50, 1); D.update(1 / 30); D.update(1 / 30); D.update(1 / 30);
        o.tot = [c.dead, c.hp, c.crew.length]; o.kills = [g().kills - k0, me.st.k - st0]; o.cop = [hp0, Math.round(cop.hp)]; o.beh = beh ? [bh0, Math.round(beh.hp), beh.dead] : null; o.boom = me.st.boom;
        o.feed = D.msgs().feed.find(f => /explodiert/.test(f));
        // Wrack: Platz bleibt belegt, die Kugel endet am Wrack (solide, seit den Fahrzeugen im Raster)
        __run(1); const id = 7999; g().bl.push({ id, x: c.x, y: c.y - 60, vx: 0, vy: 720, l: .8, o: 1, own: 0, d: 50 }); D.update(1 / 30); D.update(1 / 30); o.durch = g().bl.some(b => b.id === id);
        o.platz = g().pcs.some(q => q === c);
        return o; })()`);
      t.eq(r.gegner, r.max, 'Gegnerkugel trifft den Wagen nicht');
      t.eq(r.eins, r.max - 50, 'ein Treffer mit 50 Schaden: CFG.pol.car.hp - 50');
      t.eq(r.tot[0], true, 'bei 0 HP explodiert er'); t.eq(r.tot[2], 0, 'die Besatzung im Wagen ist weg');
      t.eq(r.kills, [2, 2], 'beide Beamte im Wagen zaehlen als Abschuesse des Schuetzen');
      t.ok(r.cop[1] < r.cop[0], 'Beamter an der Tuer nimmt Schaden: ' + JSON.stringify(r.cop));
      t.ok(r.beh && r.beh[1] < r.beh[0], 'der Wagen dahinter (zweite Reihe) wird beschaedigt: ' + JSON.stringify(r.beh));
      t.ok(r.boom >= 1, 'zaehlt beim Schuetzen als gesprengt'); t.ok(/explodiert/.test(r.feed || ''), 'Meldung: ' + r.feed);
      t.eq(r.durch, false, 'das Wrack faengt die Kugel'); t.eq(r.platz, true, 'das Wrack steht weiter auf dem Platz');
    },
  },
  {
    name: 'Zerschiessen: ein neuer Wagen nimmt den Platz eines Wracks nicht (Platz bleibt belegt), Zapfsaeulen explodieren unveraendert',
    async run(t) {
      const r = await t.page.evaluate(`(() => { const S = ${SETUP}; S('bank', 'classic', 0); const D = __dbg; D.spawnWave(); __run(12);
        const c = D.get().pcs[0], key = c.side + c.slot; D.get().en.length = 0;
        D.get().bl.push({ id: 8001, x: c.x, y: c.y - 60, vx: 0, vy: 720, l: .8, o: 1, own: 0, d: 999 }); D.update(1 / 30); D.update(1 / 30);
        const dead = c.dead; D.spawnWave(); __run(14);
        const same = D.get().pcs.filter(q => q.side + q.slot === key).length;
        // Tankstelle: Zapfsaeule per Kugel
        D.setScenario('gas'); D.setTurn('S'); D.buildSeed(21); __dbg.startHeist(false, D.get().me); const pump = D.LAY().pumps[0], hp0 = pump.hp;
        D.get().bl.push({ id: 8002, x: pump.x * 32 + 16, y: pump.y * 32 - 20, vx: 0, vy: 720, l: .5, o: 1, own: 0, d: 999 }); D.update(1 / 30); D.update(1 / 30); D.update(1 / 30);
        return { dead, same, pump: [hp0, pump.hp] }; })()`);
      t.eq(r.dead, true, 'ein Treffer mit 999 Schaden sprengt den Wagen');
      t.eq(r.same, 1, 'der Platz bleibt mit dem Wrack belegt, kein zweiter Wagen darauf');
      t.ok(r.pump[1] <= 0, 'Zapfsaeule explodiert wie bisher: ' + JSON.stringify(r.pump));
    },
  },
  {
    name: 'Zerschiessen im Coop: der Client sieht Schaden und Wrack, Polizei kommt weiter in Wagen, Abstand der Wellen waechst mit der Spielerzahl',
    async run(t) {
      await setup(t);
      const r = await t.page.evaluate(() => {
        const out = {};
        const G = CT.mkGame('bank', 321, 2), A = G.A, B = G.clients[0]; A.CFG.policeAt = 1; A.CFG.policeForced = 1;
        const god = s => { for (let i = 0; i < Math.round(s * 60); i++) { A.get().players.forEach(p => { p.hp = 1e9; }); step(G.insts, G.net, 1 / 60); } };
        A.startHeist(false, A.get().players[0]); god(1); A.spawnWave(); god(14);
        const c = A.get().pcs.find(q => q.st === 'park' && q.row === 0); const bc = () => B.get().pcs.find(q => q.id === c.id);
        A.get().bl.push({ id: 6001, x: c.x - 20, y: c.y - 60, vx: 0, vy: 720, l: .8, o: 1, own: 0, d: 50 }); god(.6);
        out.max = A.CFG.pol.car.hp; out.schaden = [c.hp, bc() && bc().hp, bc() && bc().dead];
        A.get().bl.push({ id: 6002, x: c.x, y: c.y - 60, vx: 0, vy: 720, l: .8, o: 1, own: 0, d: 999 }); god(.8);
        out.wrack = [c.dead, bc() && bc().dead, bc() && bc().hp];
        // Wellenabstand: waveGap(1) fuer 1 bis 4 Spieler
        out.gap = {};
        for (const n of [1, 2, 3, 4]) { const H = CT.mkGame('bank', 321, n), lg = H.A.lgM('gap'); out.gap[n] = +(H.A.waveGap(1) / lg).toFixed(2); out.gap['min' + n] = +(H.A.waveGap(20) / lg).toFixed(2); }
        out.cfg = [A.CFG.waveGap, A.CFG.waveGapMin, A.CFG.waveGapPer];
        return out;
      });
      t.eq(r.schaden, [r.max - 50, r.max - 50, false], 'Client sieht den Schaden (HP ' + (r.max - 50) + ', noch nicht tot)');
      t.eq(r.wrack, [true, true, 0], 'Client sieht das Wrack');
      const [g0, gm, per] = r.cfg;
      for (const n of [1, 2, 3, 4]) {
        t.ok(Math.abs(r.gap[n] - g0 * (1 + per * (n - 1))) < .05, n + ' Spieler: erster Abstand ' + r.gap[n] + ' s, erwartet ' + (g0 * (1 + per * (n - 1))).toFixed(2));
        t.ok(Math.abs(r.gap['min' + n] - gm * (1 + per * (n - 1))) < .05, n + ' Spieler: kleinster Abstand ' + r.gap['min' + n] + ' s, erwartet ' + (gm * (1 + per * (n - 1))).toFixed(2));
      }
    },
  },
];
