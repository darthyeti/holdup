// Kammern (Plan Kammern, docs/ideen-und-planung.md, Schritte K1 und K2, Entscheidungen von Till am 28. und 29. Oktober 2026): Der Juwelier bekommt ein Versteck fuer Bewusstlose, einen Abstellraum oder ein WC (LAY.stash {kind, door, out, cells, deep}) in der Suedwestecke
// der Halle (ausserhalb der Sicht der Kassierer), und die Huelle wird tiefer (CFG.jewGen.deep: hd bis 15, die Strasse im Sueden rueckt ab hd 14 mit). Geprueft wird: (1) mit CFG.stash.on 0 und CFG.jewGen.deep.on 0 ist jede Karte Zeichen fuer Zeichen die von vorher (60 Seeds, Hashes vom Stand vor dem Umbau),
// (2) die Tiefe 12 bis 15 kommt vor, die Strasse sitzt hinter dem Gebaeude, alle Huellen bestehen validateMap, (3) Anteil, Art und Aufbau der Kammern, (4) die Regel kammer samt Mutanten, (5) alle acht Lagen, (6) wer einen Bewusstlosen durch die Tuer zieht und im Innenraum loslaesst (H), dessen Koerper liegt verstaut in der Versteck-Kachel, dort findet ihn keine Streife in 90 s,
// einer in der Halle schon, (7) Host und Client bauen dieselbe Kammer.
const { coopGame } = require('../lib');
// Hashes von Raster und Feldern (TN.layHash) der Juwelier-Karten 1 bis 60 auf der Basis (Lage S, ohne Treffpunkt abseits) vom Stand vor dem Umbau (Commit 338fb25)
const OLD = [[1,"6c951475"],[2,"9988addf"],[3,"eb68afd5"],[4,"513a9c19"],[5,"55c54349"],[6,"62a3e8a5"],[7,"e8259ca"],[8,"dc60ed56"],[9,"a68e360d"],[10,"b1e2f265"],[11,"61dd77aa"],[12,"d34af0a0"],[13,"fa12b5a6"],[14,"fb99ecfe"],[15,"786fcb1d"],[16,"ffa6962e"],[17,"6c9f7fcb"],[18,"9a158dcf"],[19,"b8128afe"],[20,"263e183a"],[21,"84666c95"],[22,"512188e1"],[23,"10000ddb"],[24,"6d78168e"],[25,"19117b9d"],[26,"e40b5d5a"],[27,"2e7b2fba"],[28,"1d7522ac"],[29,"c039ed1e"],[30,"94585456"],[31,"aa2c716f"],[32,"726727ef"],[33,"72b3747b"],[34,"5124f2b"],[35,"3e9a38b6"],[36,"a7046b22"],[37,"5a376774"],[38,"9da1fdc5"],[39,"f25d1268"],[40,"9d59bc93"],[41,"20aca1cd"],[42,"c60312e2"],[43,"44be270"],[44,"31a9dabe"],[45,"45e09352"],[46,"89170870"],[47,"94481fd"],[48,"ae47d090"],[49,"3dca4bf6"],[50,"9d4e7124"],[51,"e5d45bb0"],[52,"9c2c64a0"],[53,"14891f6b"],[54,"a3014d8"],[55,"90450256"],[56,"dbc782dc"],[57,"c3b124aa"],[58,"69b05b9b"],[59,"574fe8d"],[60,"635f40dd"]];

module.exports = [
  {
    name: 'Kammern aus: mit CFG.stash.on 0 und CFG.jewGen.deep.on 0 ist jede Juwelier-Karte Zeichen fuer Zeichen die von vorher (60 Seeds), die Tiefe bleibt 12 bis 13, keine Karte hat eine Kammer',
    timeout: 120000,
    async run(t) {
      await t.loadInpage('turn.js');
      const r = await t.page.evaluate((OLD) => {
        const D = __dbg, C = D.CFG, keep = [C.meet.p, C.stash.on, C.jewGen.deep.on]; C.meet.p = 0; C.stash.on = 0; C.jewGen.deep.on = 0;
        try {
          D.setScenario('jewel'); D.setSeedMode('random'); D.setLage([]); D.setTurn('S'); const diff = [], hd = {}; let st = 0;
          for (const [s, h] of OLD) { const lay = D.layoutBase(s); if (TN.layHash(D, lay) !== h) diff.push(s); if (lay.q) hd[lay.q.hd] = (hd[lay.q.hd] || 0) + 1; if (lay.stash) st++; }
          return { diff, hd, st, n: OLD.length };
        } finally { C.meet.p = keep[0]; C.stash.on = keep[1]; C.jewGen.deep.on = keep[2]; }
      }, OLD);
      t.eq(r.diff, [], 'Karten, die von vorher abweichen');
      t.eq(r.st, 0, 'keine Kammer'); t.ok(Object.keys(r.hd).every(k => k === '12' || k === '13'), 'Tiefe nur 12 oder 13: ' + JSON.stringify(r.hd)); t.eq(r.n, 60, '60 Seeds');
    },
  },
  {
    name: 'Tiefe: CFG.jewGen.deep macht aus der Tiefe 12 bis 13 eine von 12 bis 15 (jeder Wert kommt vor), die Strasse im Sueden rueckt mit (Buergersteig, Fahrbahn und parkende Autos hinter dem Gebaeude), alle Huellen bestehen validateMap ohne Warnungen',
    timeout: 240000,
    async run(t) {
      await t.loadInpage('turn.js');
      const r = await t.page.evaluate(() => {
        const D = __dbg, C = D.CFG, keep = [C.meet.p, C.stash.on]; C.meet.p = 0; C.stash.on = 0; const hd = {}, bad = []; let n = 0;
        try {
          D.setScenario('jewel'); D.setSeedMode('random'); D.setLage([]); D.setTurn('S');
          for (let s = 1; s <= 500; s++) {
            const lay = D.layoutBase(s), q = lay.q; if (!q) continue; n++; hd[q.hd] = (hd[q.hd] || 0) + 1; const y1 = lay.bld.y1, tag = 'jewel#' + s + ' ' + lay.hall + ' ' + JSON.stringify(q);
            if (y1 !== 13 + (q.hd - 12)) bad.push(tag + ' Gebaeudekasten ' + y1);
            const m = x => lay.mat(x, y1 + 1) + lay.mat(x, y1 + 3); if (m(5) !== 'sa') bad.push(tag + ' Strasse hinter dem Gebaeude: ' + m(5));
            for (const d of lay.decor) if (d.y <= y1 && d.x < lay.bld.x1 + 1) bad.push(tag + ' parkendes Auto im Gebaeude ' + d.x + ',' + d.y);
            const w = D.world(); if (w.cell(3, w.WY0 + w.H - 1) !== 'f') bad.push(tag + ' Zaun am Suedrand fehlt');
            const rep = D.validateMap(lay); if (rep.err.length || rep.warn.length) bad.push(tag + ' validateMap ' + rep.err.concat(rep.warn).map(e => e.r + ': ' + e.m).join(' | '));
          }
        } finally { C.meet.p = keep[0]; C.stash.on = keep[1]; }
        return { hd, n, bad: bad.slice(0, 8), nbad: bad.length };
      });
      t.eq(r.bad, [], 'Abweichungen (' + r.nbad + ')');
      for (const k of ['12', '13', '14', '15']) t.ok((r.hd[k] || 0) >= r.n * .08, 'Tiefe ' + k + ' kommt vor (mindestens 8 %): ' + JSON.stringify(r.hd));
    },
  },
  {
    name: 'Kammer: gut drei Viertel der Karten haben eine (CFG.stash.p mal die Nicht-Klassik-Huellen), WC und Abstellraum kommen vor, in jeder Tiefe, Innenraum 2 x 2 mit Versteck-Reihe, Ring geschlossen mit einer Tuer d, keine Kammer in einer Sperrzone, gleiche Seeds geben gleiche Kammern',
    timeout: 240000,
    async run(t) {
      await t.loadInpage('turn.js');
      const r = await t.page.evaluate(() => {
        const D = __dbg, C = D.CFG, keep = C.meet.p; C.meet.p = 0; const kinds = {}, hd = {}, bad = []; let n = 0, st = 0, nd = 0;
        try {
          D.setScenario('jewel'); D.setSeedMode('random'); D.setLage([]); D.setTurn('S');
          for (let s = 1; s <= 600; s++) {
            const lay = D.layoutBase(s); n++; if (!lay.stash) { if (!lay.q) { /* Klassik */ } continue; }
            const K = lay.stash, w = D.world(), tag = 'jewel#' + s + ' ' + JSON.stringify(K); st++; kinds[K.kind] = (kinds[K.kind] || 0) + 1; hd[lay.q.hd] = (hd[lay.q.hd] || 0) + 1;
            if (K.deep.length !== 2 || K.deep.some(c => !K.cells.some(q => q[0] === c[0] && q[1] === c[1]))) bad.push(tag + ' Versteck-Reihe');
            if (K.cells.length !== 4 || K.cells.some(c => D.isSol(c[0], c[1]))) bad.push(tag + ' Innenraum');
            if (w.cell(K.door[0], K.door[1]) !== 'd' || D.isSol(K.out[0], K.out[1])) bad.push(tag + ' Tuer');
            if (lay.zones.some(z => K.cells.concat([K.door, K.out]).some(c => c[0] >= z[0] && c[0] <= z[2] && c[1] >= z[1] && c[1] <= z[3]))) bad.push(tag + ' Sperrzone');
            const rep = D.validateMap(lay); if (rep.err.length || rep.warn.length) bad.push(tag + ' validateMap ' + rep.err.concat(rep.warn).map(e => e.r + ': ' + e.m).join(' | '));
            if (s <= 60 && JSON.stringify(D.layoutBase(s).stash) !== JSON.stringify(K)) nd++;
          }
          D.CFG.stash.on = 0; let aus = 0; for (let s = 1; s <= 100; s++) if (D.layoutBase(s).stash) aus++; D.CFG.stash.on = 1;
          return { n, st, kinds, hd, bad: bad.slice(0, 8), nbad: bad.length, nd, aus };
        } finally { C.meet.p = keep; D.CFG.stash.on = 1; }
      });
      t.eq(r.bad, [], 'Abweichungen (' + r.nbad + ')');
      t.ok(r.st >= r.n * .68 && r.st <= r.n * .90, 'Anteil der Karten mit Kammer: ' + r.st + ' von ' + r.n);
      t.ok((r.kinds.wc || 0) >= r.st * .35 && (r.kinds.abstell || 0) >= r.st * .35, 'beide Arten kommen vor: ' + JSON.stringify(r.kinds));
      for (const k of ['12', '13', '14', '15']) t.ok((r.hd[k] || 0) >= r.st * .08, 'Kammern in Tiefe ' + k + ': ' + JSON.stringify(r.hd));
      t.eq(r.nd, 0, 'gleiche Seeds, gleiche Kammern'); t.eq(r.aus, 0, 'CFG.stash.on 0: keine Kammer');
    },
  },
  {
    name: 'Regel kammer: eine Kammer besteht validateMap, jede Verletzung (zu klein, Ring offen oder aus anderem Material, Tuer weg, Sperrzone, Tuer zugestellt, Wegpunkt am Ring, Kamera im Raum) schlaegt an, und die Sichtpruefung zaehlt (die Reihe neben der Tuer ist von der Suedgasse einsehbar, die Versteck-Reihe nicht)',
    timeout: 180000,
    async run(t) {
      await t.loadInpage('turn.js');
      const r = await t.page.evaluate(() => {
        const D = __dbg, C = D.CFG, keep = C.meet.p; C.meet.p = 0; const out = {};
        D.setScenario('jewel'); D.setSeedMode('random'); D.setLage([]); D.setTurn('S');
        let seed = 0; for (let s = 1; s < 300 && !seed; s++) { const l = D.layoutBase(s); if (l.stash && l.guards.length) seed = s; }
        const run = (name, f, sd) => {
          const lay = D.layoutBase(sd || seed), w = D.world(), K = lay.stash;
          f && f(w.setc, lay, w, K); const rep = D.validateMap(lay); out[name] = { err: rep.err.map(e => e.r), warn: rep.warn.map(e => e.r), msg: rep.err.filter(e => e.r === 'kammer').map(e => e.m) };
        };
        out.seed = seed;
        run('ohne');
        run('klein', (c, l, w, K) => { K.cells = K.cells.slice(0, 2); });
        run('ring', (c, l, w, K) => { c(K.door[0], K.door[1] - 1, '.'); });
        run('ring-pfeiler', (c, l, w, K) => { c(K.door[0], K.door[1] - 1, 'P'); });
        run('tuer', (c, l, w, K) => { c(K.door[0], K.door[1], '#'); });
        run('zone', (c, l, w, K) => { l.zones.push([K.cells[0][0], K.cells[0][1], K.cells[0][0], K.cells[0][1]]); });
        run('zugestellt', (c, l, w, K) => { c(K.out[0], K.out[1], 'k'); });
        run('wegpunkt', (c, l, w, K) => { l.guards[0].route.push([K.out[0] + 1, K.out[1] - 1]); });
        run('kamera', (c, l, w, K) => { l.cams.push({ x: (K.cells[0][0] + .5) * 32, y: (K.cells[0][1] + .5) * 32, a0: 0, amp: .5, sp: .5, rng: 200, fov: .5 }); });
        run('deep-leer', (c, l, w, K) => { K.deep = []; });
        run('deep-fremd', (c, l, w, K) => { K.deep = [[0, 0]]; });
        // Sicht: Mit der Reihe neben der Tuer als Versteck (untere Reihe) meldet die Pruefung auf Karten, deren Wegpunkte an der Suedgasse durch die Tuer sehen, eine einsehbare Kachel; mit der echten Versteck-Reihe nie
        let sicht = null; for (let s = 1; s < 300 && !sicht; s++) { const l = D.layoutBase(s); if (!l.stash) continue; const ys = l.stash.cells.map(q => q[1]), dm = Math.max(...ys); l.stash.deep = l.stash.cells.filter(q => q[1] === dm);
          const rep = D.validateMap(l); if (rep.err.some(e => e.r === 'kammer' && /eingesehen/.test(e.m))) sicht = s; }
        out.sicht = sicht; if (sicht) run('sicht-echt', null, sicht);
        C.meet.p = keep; return out;
      });
      const has = k => r[k].err.includes('kammer');
      t.eq(r.ohne.err, [], 'die unveraenderte Kammer (Seed ' + r.seed + ') besteht validateMap'); t.eq(r.ohne.warn, [], 'ohne Warnungen');
      for (const k of ['klein', 'ring', 'ring-pfeiler', 'tuer', 'zone', 'zugestellt', 'wegpunkt', 'kamera', 'deep-leer', 'deep-fremd']) t.ok(has(k), k + ': Regel kammer muss anschlagen, bekam ' + JSON.stringify(r[k]));
      t.ok(r.sicht, 'es gibt Karten, auf denen die Reihe neben der Tuer von einem Wegpunkt aus einsehbar ist (Seed ' + r.sicht + ')');
      if (r.sicht) t.ok(!has('sicht-echt') && r['sicht-echt'].err.length === 0, 'dieselbe Karte mit der echten Versteck-Reihe besteht: ' + JSON.stringify(r['sicht-echt']));
    },
  },
  {
    name: 'Kammer in allen acht Lagen (Strasse an N, E, W, auch gespiegelt): Tuer d, Innenraum frei, Ring Wand, validateMap ohne Fehler, die Lage der Kammer relativ zur Karte aendert sich mit',
    timeout: 240000,
    async run(t) {
      await t.loadInpage('turn.js');
      const r = await t.page.evaluate(() => {
        const D = __dbg, C = D.CFG, keep = C.meet.p; C.meet.p = 0; const bad = [], rel = {}; let n = 0;
        try {
          D.setScenario('jewel'); D.setSeedMode('random'); D.setLage([]);
          let seeds = []; D.setTurn('S'); for (let s = 1; s < 200 && seeds.length < 6; s++) if (D.layoutBase(s).stash) seeds.push(s);
          for (const s of seeds) for (const side of TN.SIDES) {
            D.setTurn(side); const lay = D.layoutFor(s), K = lay.stash, w = D.world(), tag = 'jewel#' + s + ' ' + side;
            if (!K) { bad.push(tag + ' keine Kammer'); continue; } n++;
            if (w.cell(K.door[0], K.door[1]) !== 'd') bad.push(tag + ' Tuer ' + w.cell(K.door[0], K.door[1]));
            if (K.cells.some(c => D.isSol(c[0], c[1]))) bad.push(tag + ' Innenraum belegt');
            if (!K.deep.length || K.deep.some(c => !K.cells.some(q => q[0] === c[0] && q[1] === c[1]))) bad.push(tag + ' Versteck-Reihe ausserhalb des Innenraums');
            if (Math.abs(K.out[0] - K.door[0]) + Math.abs(K.out[1] - K.door[1]) !== 1) bad.push(tag + ' Kachel vor der Tuer');
            const rep = D.validateMap(lay); if (rep.err.length) bad.push(tag + ' validateMap ' + rep.err.map(e => e.r + ': ' + e.m).join(' | '));
            const B = lay.bld; (rel[side] = rel[side] || []).push([Math.round((K.cells[0][0] - B.x0) / (B.x1 - B.x0) * 10), Math.round((K.cells[0][1] - B.y0) / (B.y1 - B.y0) * 10)].join());
          }
        } finally { D.setTurn(null); C.meet.p = keep; }
        return { bad: bad.slice(0, 8), nbad: bad.length, n, rel };
      });
      t.eq(r.bad, [], 'Abweichungen (' + r.nbad + ')'); t.eq(r.n, 48, '6 Seeds mal 8 Lagen');
      t.ok(new Set(Object.values(r.rel).map(a => a.join(';'))).size >= 4, 'die Kammer liegt je Lage woanders im Gebaeude: ' + JSON.stringify(r.rel));
    },
  },
  {
    name: 'Kammer im Spiel: eine ausgeschaltete Wache laesst sich durch die einkachelbreite Tuer in die Kammer ziehen (die Wachen in der Halle behalten die Karte im Blick), H im Innenraum verstaut den Koerper in der Versteck-Reihe mit Meldung; dort findet ihn die Streife in 90 s nie, in der Halle in aller Regel',
    timeout: 290000,
    async run(t) {
      const r = await t.page.evaluate(`(() => { const D = __dbg, res = { drag: [], hid: [], hall: [] }, px = c => (c + .5) * 32;
        const setup = s => { D.sessReset(); D.setScenario('jewel'); D.setSeedMode('random'); D.setLage([]); D.setTurn('S'); D.buildSeed(s); D.CFG.policeAt = 1e6; D.CFG.policeForced = 1e6;
          const g = D.get(), me = g.me, L = D.LAY(), guards = g.npcs.filter(q => q.k === 'grd' && q.st !== 'away'); for (const c of g.cams) c.off = true; L.mission.blackoutAt = null; for (const q of g.npcs) if (q.st === 'away') q.at = 1e9; return { g, me, L, guards }; };
        const away = me => { me.x = -16; me.y = 176; }, seeds = []; D.setScenario('jewel'); D.setSeedMode('random'); D.setLage([]); D.setTurn('S');
        for (let s = 1; s < 300 && seeds.length < 6; s++) { const l = D.layoutBase(s); if (l.stash && l.guards.length >= 2) seeds.push(s); }
        res.seeds = seeds; { setup(seeds[0]); const K = D.LAY().stash, lob = D.world().LOBBY; res.lobby = lob.filter(c => K.cells.some(q => q[0] === c[0] && q[1] === c[1]) || (c[0] === K.door[0] && c[1] === K.door[1])).length; res.lobbyN = lob.length; }
        // 1 Ziehen: nur die Wache in der Halle (die andere steht fern), kein Alarm waehrend des Ziehens
        { const { g, me, L, guards } = setup(seeds[0]), K = L.stash, a = guards[0]; for (const n of g.npcs) if (n !== a) { n.st = 'away'; n.at = 1e9; } D.koMi(a).act(me); a.kt = 1e9;
          a.x = px(K.out[0]); a.y = px(K.out[1] - 1); me.x = px(K.out[0] + 1); me.y = px(K.out[1] - 1); D.bodyMi(a).act(me);
          const first = K.cells.find(c => Math.abs(c[0] - K.door[0]) + Math.abs(c[1] - K.door[1]) === 1), wps = [[K.out[0], K.out[1] - 1], [K.out[0], K.out[1]], K.door, first, first]; let wi = 0, ticks = 0;
          while (wi < wps.length && ticks < 900) { const w = wps[wi], dx = px(w[0]) - me.x, dy = px(w[1]) - me.y; if (Math.hypot(dx, dy) < 8) { wi++; continue; } D.keys.d = dx > 2; D.keys.a = dx < -2; D.keys.s = dy > 2; D.keys.w = dy < -2; D.update(1 / 30); ticks++; }
          D.keys.w = D.keys.a = D.keys.s = D.keys.d = false; for (let i = 0; i < 6; i++) D.update(1 / 30);
          const cell = () => [Math.floor(a.x / 32), Math.floor(a.y / 32)], inK = c => K.cells.some(q => q[0] === c[0] && q[1] === c[1]);
          res.vorher = { wp: wi, ticks, dr: a.dr, dg: me.dg ? 1 : 0, phase: D.get().phase, imRaum: inK([Math.floor(me.x / 32), Math.floor(me.y / 32)]) };
          D.relBody(me); res.nachher = { cell: cell(), deep: K.deep.some(q => q[0] === cell()[0] && q[1] === cell()[1]), dr: a.dr, dg: me.dg ? 1 : 0, feed: D.msgs().feed.some(x => /verstaust den Bewusstlosen (im WC|im Abstellraum)/.test(x)) };
          // ausserhalb der Kammer bleibt der Koerper liegen, wo er losgelassen wird (kein Verstauen)
          const b = guards[0]; b.dr = -1; me.dg = 0; me.x = px(K.out[0] + 4); me.y = px(K.out[1] - 1); b.x = px(K.out[0] + 3); b.y = px(K.out[1] - 1); const c0 = cell(); D.bodyMi(b).act(me); D.relBody(me); res.draussen = [c0.join(), cell().join()];
          // ein Koerper, der weit vom Spieler im Innenraum liegt (nicht im Schlepptau), wird nicht eingezogen
          const f = guards[0]; f.dr = -1; me.dg = 0; me.x = px(K.cells[0][0]); me.y = px(K.cells[0][1]); f.x = px(K.out[0] + 3); f.y = px(K.out[1] - 1); const f0 = [Math.floor(f.x / 32), Math.floor(f.y / 32)]; D.bodyMi(f).act(me); D.relBody(me); res.fern = [f0.join(), [Math.floor(f.x / 32), Math.floor(f.y / 32)].join()]; }
        // 2 Verborgen: der Koerper liegt in der Versteck-Reihe, die zweite Wache geht ihre Runden, der Spieler ist weit weg
        const run = (s, where) => { const { g, me, L, guards } = setup(s), K = L.stash, a = guards[0]; D.koMi(a).act(me); a.kt = 1e9; if (where === 'kammer') { a.x = px(K.deep[0][0]); a.y = px(K.deep[0][1]); } else { a.x = px(K.out[0] + 8); a.y = px(K.out[1] - 1); }
          let t = 0; for (; t < 30 * 90 && D.get().phase === 1; t++) { away(me); D.update(1 / 30); } return [D.get().phase, +(t / 30).toFixed(1)]; };
        for (const s of seeds) { res.hid.push(run(s, 'kammer')); res.hall.push(run(s, 'halle')); }
        return res; })()`);
      t.ok(r.lobby === 0 && r.lobbyN > 20, 'Zivilisten betreten die Kammer nicht (keine Innenkachel in LOBBY, ' + r.lobbyN + ' Kacheln): ' + r.lobby);
      t.eq(r.vorher && [r.vorher.wp, r.vorher.dr, r.vorher.dg, r.vorher.phase, r.vorher.imRaum], [5, 0, 1, 1, true], 'der Spieler zieht den Koerper durch die Tuer in den Raum, der Koerper ist noch im Schlepptau, kein Alarm: ' + JSON.stringify(r.vorher));
      t.eq(r.nachher && [r.nachher.deep, r.nachher.dr, r.nachher.dg, r.nachher.feed], [true, -1, 0, true], 'H im Innenraum (der Koerper steht noch in der Tuer): er liegt danach in der Versteck-Reihe, die Meldung steht im Feed: ' + JSON.stringify(r.nachher));
      t.ok(r.draussen && r.draussen[0] === r.draussen[1], 'ausserhalb der Kammer bleibt der Koerper liegen, wo er losgelassen wird: ' + JSON.stringify(r.draussen));
      t.ok(r.fern && r.fern[0] === r.fern[1], 'ein Koerper weit vom Spieler wird nicht in die Kammer gezogen: ' + JSON.stringify(r.fern));
      t.eq(r.hid.map(x => x[0]), r.hid.map(() => 1), 'in der Versteck-Reihe findet ihn die Streife in 90 s nie (Seeds ' + r.seeds + '): ' + JSON.stringify(r.hid));
      t.ok(r.hall.filter(x => x[0] === 2).length >= r.seeds.length - 1, 'dieselben Seeds mit dem Koerper in der Halle: in aller Regel Alarm: ' + JSON.stringify(r.hall));
    },
  },
  {
    name: 'Kammer im Coop: Host und Client bauen dieselbe Kammer (je ein Seed mit Tiefe 12 bis 13 und 14 bis 15, vom Start bis zum Sieg)',
    timeout: 290000,
    async run(t) {
      await t.loadInpage('turn.js');
      const seeds = await t.page.evaluate(() => { const D = __dbg, out = [], seen = new Set(); D.setScenario('jewel'); D.setSeedMode('random'); D.setLage([]); D.setTurn('S'); for (let s = 1; s < 400 && out.length < 2; s++) { const l = D.layoutBase(s); if (!l.stash) continue; const k = l.q.hd >= 14; if (!seen.has(k)) { seen.add(k); out.push(s); } } return out; });
      const res = []; for (const s of seeds) res.push(await coopGame(t.env, 'jewel', s));
      t.eq(seeds.length, 2, 'zwei Seeds'); t.note(res.map(r => r.tag + ' ' + r.stat.hall).join(', '));
      t.eq(res.flatMap(r => r.bad.map(b => r.tag + ': ' + b)), [], 'Abweichungen');
    },
  },
  {
    name: 'Kammer in allen Huellen: jede zugelassene Kombination aus fuenf Hallen, hw 11 bis 17, hd 12 bis 15 und vx 0 bis 2 besteht mit WC und mit Abstellraum validateMap ohne Fehler und Warnungen (die Tuer ist erreichbar, der Gang zum Tresentor bleibt breit)',
    timeout: 240000,
    async run(t) {
      await t.loadInpage('turn.js');
      const r = await t.page.evaluate(() => { const D = __dbg, C = D.CFG, keep = C.meet.p; C.meet.p = 0; const out = { n: 0, bad: [] };
        try { D.setScenario('jewel'); D.setSeedMode('random'); D.setLage([]); D.setTurn('S');
          for (let i = 0; i < D.JW_HALLS.length; i++) for (let hw = 11; hw <= 17; hw++) for (let hd = 12; hd <= 15; hd++) for (let vx = 0; vx <= 2; vx++) {
            const H = D.JW_HALLS[i]; if (hw < H.minHw || hd < H.minHd) continue;
            for (const kind of ['wc', 'abstell']) { const lay = D.finishLay(D.genJewel(777, { hw, hd, vx, classic: false, hall: i, stash: kind })), rep = D.validateMap(lay); out.n++;
              if (!lay.stash || lay.stash.kind !== kind) out.bad.push(H.n + ' ' + hw + 'x' + hd + ' vx' + vx + ' ohne Kammer');
              if (rep.err.length || rep.warn.length) out.bad.push(H.n + ' ' + hw + 'x' + hd + ' vx' + vx + ' ' + kind + ': ' + rep.err.concat(rep.warn).map(e => e.r + ' ' + e.m).join(' | ')); } }
        } finally { C.meet.p = keep; }
        out.bad = out.bad.slice(0, 8); return out; });
      t.eq(r.bad, [], 'Abweichungen'); t.ok(r.n >= 700, 'Zahl der Kombinationen: ' + r.n);
    },
  },
];
