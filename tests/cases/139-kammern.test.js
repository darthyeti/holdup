// Kammern (Plan Kammern, docs/ideen-und-planung.md, Schritte K1 und K2, Entscheidungen von Till am 28. und 29. Oktober 2026): Der Juwelier bekommt ein Versteck fuer Bewusstlose, einen Abstellraum oder ein WC (LAY.stash {kind, door, out, cells, deep}) in der Suedwestecke
// der Halle (ausserhalb der Sicht der Kassierer), und die Huelle wird tiefer (CFG.jewGen.deep: hd bis 15, die Strasse im Sueden rueckt ab hd 14 mit). Geprueft wird: (1) mit CFG.stash.on 0 und CFG.jewGen.deep.on 0 ist jede Karte Zeichen fuer Zeichen die von vorher (60 Seeds, Hashes vom Stand vor dem Umbau),
// (2) die Tiefe 12 bis 15 kommt vor, die Strasse sitzt hinter dem Gebaeude, alle Huellen bestehen validateMap, (3) Anteil, Art und Aufbau der Kammern, (4) die Regel kammer samt Mutanten, (5) alle acht Lagen, (6) wer einen Bewusstlosen durch die Tuer zieht und im Innenraum loslaesst (H), dessen Koerper liegt verstaut in der Versteck-Kachel, dort findet ihn keine Streife in 90 s,
// einer in der Halle schon, (7) Host und Client bauen dieselbe Kammer. Ab K3 (Museum und Casino, nachtraeglich platziert mit placeStash) dieselben Pruefungen je Szenario, am Ende des Blocks 'Museum und Casino'.
const { coopGame } = require('../lib');
// Hashes von Raster und Feldern der Museums- und Casino-Karten 1 bis 40 auf der Basis (Lage S, ohne Treffpunkt abseits) vom Stand vor K3 (Commit 3dfcb21), siehe Test 'Kammern aus (Museum, Casino)'.
// Die Museumswerte sind seit Museum v2 (Ticket 41, groesseres Haus, andere Routen und Kameras) neu aufgenommen (Stand vor K3 plus v2 ohne Kammer), die Casino-Werte sind unveraendert.
const OLD_MC = {"museum":[[1,"a57ec156"],[2,"eb001d4f"],[3,"3847aef9"],[4,"58fdf0fe"],[5,"5a2f4322"],[6,"90bcc9df"],[7,"bf62d4f8"],[8,"a48d800"],[9,"a9277b89"],[10,"23499f4"],[11,"9e67fb3"],[12,"e99a43a1"],[13,"e5a42d9"],[14,"689c52c9"],[15,"21ef3433"],[16,"88ed40c6"],[17,"44562a58"],[18,"1d6daa8e"],[19,"dda3d494"],[20,"15124cf3"],[21,"1a8aa87e"],[22,"cae3f42f"],[23,"d67eaff5"],[24,"b3d4f839"],[25,"ee25e14a"],[26,"9c136e38"],[27,"abd6d622"],[28,"ee62fc10"],[29,"1812c79"],[30,"4d13d3e7"],[31,"d6be53dd"],[32,"f4456daf"],[33,"f7acec68"],[34,"a6ea876e"],[35,"b14f53c7"],[36,"ffad74e6"],[37,"97972851"],[38,"5a56a899"],[39,"778cbf10"],[40,"df8d71d1"]],"casino":[[1,"9ac48b0b"],[2,"6960230f"],[3,"bb9b2bcf"],[4,"35a113f6"],[5,"6d0eafc2"],[6,"21af3aaf"],[7,"155c41d9"],[8,"c25a95cd"],[9,"ab8baf78"],[10,"698738b7"],[11,"c811619f"],[12,"d7950ebc"],[13,"72395169"],[14,"d54d218f"],[15,"facb4d26"],[16,"27616e23"],[17,"93707a96"],[18,"a23a137c"],[19,"a099699"],[20,"e96d9b9e"],[21,"dfd3c532"],[22,"be9859dd"],[23,"93e83c4a"],[24,"5c3f36c2"],[25,"c3803d36"],[26,"15b501d"],[27,"a9e5404a"],[28,"1771d1f5"],[29,"8548a672"],[30,"d646ef00"],[31,"477cdb79"],[32,"fd78a6aa"],[33,"76aa07a7"],[34,"36e9663f"],[35,"d9cafffe"],[36,"b2d11e64"],[37,"1484c256"],[38,"f8c98b4"],[39,"20fd278"],[40,"9fe7eed3"]]};
// Hashes von Raster und Feldern (TN.layHash) der Juwelier-Karten 1 bis 60 auf der Basis (Lage S, ohne Treffpunkt abseits) vom Stand vor dem Umbau (Commit 338fb25)
const OLD = [[1,"dae043bc"],[2,"6ca426c9"],[3,"abcbf428"],[4,"4139bd1a"],[5,"c0f97e66"],[6,"eab6cbf3"],[7,"986fea40"],[8,"c75c8471"],[9,"b74d39a0"],[10,"3f736087"],[11,"5c588933"],[12,"ca8628af"],[13,"df43c803"],[14,"e142889e"],[15,"8d11ee6d"],[16,"7525001d"],[17,"275da623"],[18,"31017f2b"],[19,"bb02814b"],[20,"9eaa0aab"],[21,"85e2c2cc"],[22,"d25cb50"],[23,"7d55f29c"],[24,"6feceefc"],[25,"f7ccf555"],[26,"8c8e90e7"],[27,"bb419c76"],[28,"318a6f96"],[29,"9fff8837"],[30,"1a9ded6c"],[31,"f2083a0d"],[32,"7447f00b"],[33,"4531a34d"],[34,"3fea8fc"],[35,"8b3d22f9"],[36,"598c349"],[37,"e6c36d2d"],[38,"c5cd8654"],[39,"a7dc6a6f"],[40,"1231e6ba"],[41,"7aad7ed6"],[42,"35d8d50c"],[43,"fcbf87dc"],[44,"b16b29a3"],[45,"2aa2371d"],[46,"df0c14f"],[47,"36674548"],[48,"bc602c4"],[49,"76c1ac7f"],[50,"16de66ce"],[51,"f821718c"],[52,"220d0c22"],[53,"41ae1d92"],[54,"dcfb6dae"],[55,"1b8ce37e"],[56,"1a499fd6"],[57,"8abd291a"],[58,"13b4a1d2"],[59,"484ded0d"],[60,"275777a8"]];

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

  // ---- K3: Museum und Casino (nachtraeglich platziert, js/maps.js placeStash) ----
  {
    name: 'Kammern aus (Museum, Casino): mit CFG.stash.on 0 ist jede der Karten 1 bis 40 Zeichen fuer Zeichen die vom Stand vor K3, keine Kammer',
    timeout: 120000,
    async run(t) {
      await t.loadInpage('turn.js');
      const r = await t.page.evaluate((OLD) => {
        const D = __dbg, C = D.CFG, keep = [C.meet.p, C.stash.on]; C.meet.p = 0; C.stash.on = 0; const diff = [], n = {}; let st = 0;
        try {
          D.setSeedMode('random'); D.setLage([]); D.setTurn('S');
          for (const sc of ['museum', 'casino']) { D.setScenario(sc); n[sc] = 0; for (const [s, h] of OLD[sc]) { const lay = D.layoutBase(s); n[sc]++; if (TN.layHash(D, lay) !== h) diff.push(sc + '#' + s); if (lay.stash) st++; } }
        } finally { C.meet.p = keep[0]; C.stash.on = keep[1]; }
        return { diff, st, n };
      }, OLD_MC);
      t.eq(r.diff, [], 'Karten, die von vorher abweichen'); t.eq(r.st, 0, 'keine Kammer'); t.eq(r.n, { museum: 40, casino: 40 }, '40 Seeds je Szenario');
    },
  },
  {
    name: 'Kammer in Museum und Casino: Anteil (Museum seit Museum v2 gut drei Viertel statt gut zehn Prozent, Casino gut drei Viertel: die offenen Hallen lassen nur Ecken und Nebenraeume zu, die keine Kamera und keine Streife einsieht), beide Arten, Innenraum 4 oder 6 Kacheln frei, Ring geschlossen mit einer Tuer d, nichts in einer Sperrzone, kein Laser naeher als 1,2 Kacheln, validateMap meldet nichts Neues gegenueber derselben Karte ohne Kammer, gleiche Seeds geben gleiche Kammern',
    timeout: 290000,
    async run(t) {
      await t.loadInpage('turn.js');
      const r = await t.page.evaluate(() => {
        const D = __dbg, C = D.CFG, keep = C.meet.p; C.meet.p = 0; const out = {}, sig = rep => rep.err.concat(rep.warn).map(e => e.r + ': ' + e.m);
        try {
          D.setSeedMode('random'); D.setLage([]); D.setTurn('S');
          for (const sc of ['museum', 'casino']) {
            D.setScenario(sc); const o = out[sc] = { n: 0, st: 0, kinds: {}, sizes: {}, bad: [], nd: 0 }, seeds = [];
            for (let s = 1; s <= 150; s++) { const lay = D.layoutBase(s); o.n++; if (!lay.stash) continue; o.st++; seeds.push(s); const K = lay.stash, w = D.world(), tag = sc + '#' + s + ' ' + JSON.stringify(K); o.kinds[K.kind] = (o.kinds[K.kind] || 0) + 1; o.sizes[K.cells.length] = (o.sizes[K.cells.length] || 0) + 1;
              if (K.cells.length < 4 || K.cells.some(c => D.isSol(c[0], c[1]))) o.bad.push(tag + ' Innenraum');
              if (!K.deep.length || K.deep.some(c => !K.cells.some(q => q[0] === c[0] && q[1] === c[1]))) o.bad.push(tag + ' Versteck-Kacheln');
              if (w.cell(K.door[0], K.door[1]) !== 'd' || D.isSol(K.out[0], K.out[1]) || Math.abs(K.out[0] - K.door[0]) + Math.abs(K.out[1] - K.door[1]) !== 1) o.bad.push(tag + ' Tuer');
              const X = K.cells.map(c => c[0]), Y = K.cells.map(c => c[1]); let ring = 0; for (let x = Math.min(...X) - 1; x <= Math.max(...X) + 1; x++) for (let y = Math.min(...Y) - 1; y <= Math.max(...Y) + 1; y++) { if (X.includes(x) && Y.includes(y)) continue; const ch = w.cell(x, y); if (ch === '#') ring++; else if (ch !== 'd') o.bad.push(tag + ' Ring ' + x + ',' + y + ' ' + ch); }
              if (lay.zones.some(z => K.cells.concat([K.door, K.out]).some(c => c[0] >= z[0] && c[0] <= z[2] && c[1] >= z[1] && c[1] <= z[3]))) o.bad.push(tag + ' Sperrzone');
              for (const L of lay.lasers || []) for (const c of K.cells.concat([K.door, K.out])) { const x = c[0] + .5, y = c[1] + .5, dx = L[2] - L[0], dy = L[3] - L[1], q = Math.max(0, Math.min(1, ((x - L[0]) * dx + (y - L[1]) * dy) / (dx * dx + dy * dy || 1))); if (Math.hypot(x - (L[0] + dx * q), y - (L[1] + dy * q)) < 1.2) o.bad.push(tag + ' Laser'); }
              const rep = sig(D.validateMap(lay)); if (s <= 40) { D.CFG.stash.on = 0; const base = sig(D.validateMap(D.layoutBase(s))); D.CFG.stash.on = 1; const lay2 = D.layoutBase(s); if (rep.some(m => !base.includes(m))) o.bad.push(tag + ' validateMap neu: ' + rep.filter(m => !base.includes(m)).join(' | ')); if (JSON.stringify(lay2.stash) !== JSON.stringify(K)) o.nd++; }
              else if (D.validateMap(lay).err.length) o.bad.push(tag + ' validateMap Fehler'); }
            o.bad = o.bad.slice(0, 6); o.seeds = seeds.slice(0, 6);
          }
        } finally { C.meet.p = keep; D.CFG.stash.on = 1; }
        return out;
      });
      for (const sc of ['museum', 'casino']) { const o = r[sc]; t.eq(o.bad, [], sc + ': Abweichungen'); t.eq(o.nd, 0, sc + ': gleiche Seeds, gleiche Kammern'); t.ok(o.kinds.wc >= o.st * .25 && o.kinds.abstell >= o.st * .25, sc + ': beide Arten: ' + JSON.stringify(o.kinds)); }
      t.ok(r.museum.st >= r.museum.n * .6 && r.museum.st <= r.museum.n * .95, 'Museum: Anteil mit Kammer ' + r.museum.st + ' von ' + r.museum.n);
      t.ok(r.casino.st >= r.casino.n * .65 && r.casino.st <= r.casino.n * .9, 'Casino: Anteil mit Kammer ' + r.casino.st + ' von ' + r.casino.n);
      t.note('Museum ' + r.museum.st + '/' + r.museum.n + ' ' + JSON.stringify(r.museum.sizes) + ', Casino ' + r.casino.st + '/' + r.casino.n + ' ' + JSON.stringify(r.casino.sizes));
    },
  },
  {
    name: 'Kammer in Museum und Casino: die Regel kammer schlaegt bei jeder Verletzung an (Ring offen, Tuer weg, Sperrzone, Wegpunkt am Ring, Kamera im Raum), die unveraenderte Kammer besteht',
    timeout: 120000,
    async run(t) {
      await t.loadInpage('turn.js');
      const r = await t.page.evaluate(() => {
        const D = __dbg, C = D.CFG, keep = C.meet.p; C.meet.p = 0; const out = {};
        try {
          D.setSeedMode('random'); D.setLage([]); D.setTurn('S');
          for (const sc of ['museum', 'casino']) {
            D.setScenario(sc); let seed = 0; for (let s = 1; s < 300 && !seed; s++) { const l = D.layoutBase(s); if (l.stash && l.guards.length) seed = s; }
            const run = (name, f) => { const lay = D.layoutBase(seed), w = D.world(), K = lay.stash; f && f(w.setc, lay, w, K); const rep = D.validateMap(lay); out[sc + ':' + name] = { kammer: rep.err.some(e => e.r === 'kammer'), neu: rep.err.map(e => e.r).join() }; };
            out[sc + ':seed'] = seed; run('ohne');
            run('ring', (c, l, w, K) => { const x = K.cells[0][0], y = Math.min(...K.cells.map(q => q[1])) - 1; if (w.cell(x, y) === '#' && !(K.door[0] === x && K.door[1] === y)) c(x, y, '.'); else c(K.door[0], K.door[1] + (K.out[1] - K.door[1]) * 0, '#'); });
            run('tuer', (c, l, w, K) => { c(K.door[0], K.door[1], '#'); });
            run('zone', (c, l, w, K) => { l.zones.push([K.cells[0][0], K.cells[0][1], K.cells[0][0], K.cells[0][1]]); });
            run('wegpunkt', (c, l, w, K) => { l.guards[0].route.push([K.out[0], K.out[1]]); });
            run('kamera', (c, l, w, K) => { l.cams.push({ x: (K.deep[0][0] + .5) * 32, y: (K.deep[0][1] + .5) * 32, a0: 0, amp: .5, sp: .5, rng: 200, fov: .5 }); });
          }
        } finally { C.meet.p = keep; }
        return out;
      });
      for (const sc of ['museum', 'casino']) {
        t.ok(!r[sc + ':ohne'].kammer, sc + ': die unveraenderte Kammer (Seed ' + r[sc + ':seed'] + ') besteht die Regel: ' + JSON.stringify(r[sc + ':ohne']));
        for (const k of ['ring', 'tuer', 'zone', 'wegpunkt', 'kamera']) t.ok(r[sc + ':' + k].kammer, sc + ' ' + k + ': Regel kammer muss anschlagen, bekam ' + JSON.stringify(r[sc + ':' + k]));
      }
    },
  },
  {
    name: 'Kammer in Museum und Casino in allen acht Lagen (Strasse an N, E, W, auch gespiegelt): Tuer d, Innenraum frei, Ring Wand, Kachel vor der Tuer begehbar, validateMap ohne neue Fehler',
    timeout: 240000,
    async run(t) {
      await t.loadInpage('turn.js');
      const r = await t.page.evaluate(() => {
        const D = __dbg, C = D.CFG, keep = C.meet.p; C.meet.p = 0; const bad = []; let n = 0;
        try {
          D.setSeedMode('random'); D.setLage([]);
          for (const sc of ['museum', 'casino']) { D.setScenario(sc); D.setTurn('S'); const seeds = []; for (let s = 1; s < 200 && seeds.length < 3; s++) if (D.layoutBase(s).stash) seeds.push(s);
            for (const s of seeds) for (const side of TN.SIDES) {
              D.setTurn(side); const lay = D.layoutFor(s), K = lay.stash, w = D.world(), tag = sc + '#' + s + ' ' + side;
              if (!K) { bad.push(tag + ' keine Kammer'); continue; } n++;
              if (w.cell(K.door[0], K.door[1]) !== 'd') bad.push(tag + ' Tuer ' + w.cell(K.door[0], K.door[1]));
              if (K.cells.some(c => D.isSol(c[0], c[1]))) bad.push(tag + ' Innenraum belegt');
              if (!K.deep.length || K.deep.some(c => !K.cells.some(q => q[0] === c[0] && q[1] === c[1]))) bad.push(tag + ' Versteck-Kacheln');
              if (Math.abs(K.out[0] - K.door[0]) + Math.abs(K.out[1] - K.door[1]) !== 1 || D.isSol(K.out[0], K.out[1])) bad.push(tag + ' Kachel vor der Tuer');
              const rep = D.validateMap(lay); if (rep.err.some(e => e.r === 'kammer')) bad.push(tag + ' ' + rep.err.filter(e => e.r === 'kammer').map(e => e.m).join(' | '));
            } }
        } finally { D.setTurn(null); C.meet.p = keep; }
        return { bad: bad.slice(0, 8), nbad: bad.length, n };
      });
      t.eq(r.bad, [], 'Abweichungen (' + r.nbad + ')'); t.eq(r.n, 48, 'je 3 Seeds mal 8 Lagen mal 2 Szenarien');
    },
  },
  {
    name: 'Kammer im Spiel (Museum, Casino): mit allen Wachen, Angestellten und Kameras im Dienst laesst sich eine ausgeschaltete Wache durch die Tuer in die Kammer ziehen (zu jedem Zeitpunkt der Streife, vier Anlaufzeiten), ohne Alarm; H verstaut sie, dort findet sie die Streife in 90 s nie; derselbe Koerper mitten in der Halle wird gefunden',
    timeout: 290000,
    async run(t) {
      const r = await t.page.evaluate(`(() => { const D = __dbg, res = { drag: [], hid: [], hall: [] }, px = c => (c + .5) * 32, away = me => { me.x = -16; me.y = 176; };
        const setup = (sc, s, warm) => { D.sessReset(); D.setScenario(sc); D.setSeedMode('random'); D.setLage([]); D.setTurn('S'); D.CFG.meet.p = 0; D.buildSeed(s); D.CFG.policeAt = 1e6; D.CFG.policeForced = 1e6;
          const g = D.get(), me = g.me, L = D.LAY(); for (const q of g.npcs) if (q.st === 'away') q.at = 1e9; away(me); for (let i = 0; i < warm * 30; i++) { away(me); D.update(1 / 30); } return { g, me, L }; };
        for (const sc of ['museum', 'casino']) {
          D.setScenario(sc); D.setSeedMode('random'); D.setLage([]); D.setTurn('S'); D.CFG.meet.p = 0; const seeds = []; for (let s = 1; s < 200 && seeds.length < 4; s++) { const l = D.layoutBase(s); if (l.stash && l.guards.length >= 2) seeds.push(s); }
          res[sc] = seeds;
          for (const s of seeds) for (const warm of [0, 13, 29, 47]) {
            { const { g, me, L } = setup(sc, s, warm), K = L.stash, a = g.npcs.find(q => q.k === 'grd' && q.st === 'idle'); D.koMi(a).act(me); a.kt = 1e9;
              const nb = c => [[1, 0], [-1, 0], [0, 1], [0, -1]].map(d => [c[0] + d[0], c[1] + d[1]]).filter(q => !D.isSol(q[0], q[1]) && !(q[0] === K.door[0] && q[1] === K.door[1])), ap = nb(K.out)[0];
              a.x = px(ap[0]); a.y = px(ap[1]); me.x = px(K.out[0]); me.y = px(K.out[1]); D.bodyMi(a).act(me);
              const first = K.cells.find(c => Math.abs(c[0] - K.door[0]) + Math.abs(c[1] - K.door[1]) === 1), wps = [K.door, first, first]; let wi = 0, ticks = 0;
              while (wi < wps.length && ticks < 900 && D.get().phase === 1) { const w = wps[wi], dx = px(w[0]) - me.x, dy = px(w[1]) - me.y; if (Math.hypot(dx, dy) < 8) { wi++; continue; } D.keys.d = dx > 2; D.keys.a = dx < -2; D.keys.s = dy > 2; D.keys.w = dy < -2; D.update(1 / 30); ticks++; }
              D.keys.w = D.keys.a = D.keys.s = D.keys.d = false; for (let i = 0; i < 6; i++) D.update(1 / 30);
              const ph = D.get().phase, cell = [Math.floor(a.x / 32), Math.floor(a.y / 32)]; D.relBody(me); const deep = K.deep.some(q => q[0] === Math.floor(a.x / 32) && q[1] === Math.floor(a.y / 32)); let tt = 0; for (; tt < 30 * 90 && D.get().phase === 1; tt++) { away(me); D.update(1 / 30); }
              res.drag.push([sc, s, warm, wi, ph, deep ? 1 : 0, D.get().phase, +(tt / 30).toFixed(1)]); }
          }
          for (const s of seeds) { const { g, me, L } = setup(sc, s, 5), a = g.npcs.find(q => q.k === 'grd' && q.st === 'idle'), o = g.npcs.find(q => q.k === 'grd' && q !== a), rp = o.route[0]; D.koMi(a).act(me); a.kt = 1e9; a.x = px(Math.round(rp[0])); a.y = px(Math.round(rp[1])); let tt = 0; for (; tt < 30 * 90 && D.get().phase === 1; tt++) { away(me); D.update(1 / 30); } res.hall.push([sc, s, D.get().phase, +(tt / 30).toFixed(1)]); }
        }
        return res; })()`);
      t.eq(r.drag.length, 32, 'Laeufe: ' + JSON.stringify(r.museum) + ' / ' + JSON.stringify(r.casino));
      t.eq(r.drag.map(x => [x[3], x[4]]), r.drag.map(() => [3, 1]), 'der Spieler zieht den Koerper bis in den Raum, kein Alarm waehrend des Ziehens: ' + JSON.stringify(r.drag.filter(x => x[3] !== 3 || x[4] !== 1)));
      t.ok(r.drag.every(x => x[5] === 1), 'H verstaut den Koerper in einer Versteck-Kachel: ' + JSON.stringify(r.drag.filter(x => x[5] !== 1)));
      t.eq(r.drag.map(x => x[6]), r.drag.map(() => 1), 'in der Kammer findet ihn in 90 s weder Streife noch Kamera: ' + JSON.stringify(r.drag.filter(x => x[6] !== 1)));
      t.ok(r.hall.filter(x => x[2] === 2).length >= r.hall.length - 1, 'derselbe Koerper auf einem Wegpunkt der anderen Streife: in aller Regel Alarm: ' + JSON.stringify(r.hall));
    },
  },
  {
    name: 'Kammer im Coop (Museum, Casino): Host und Client bauen dieselbe Kammer (je ein Seed mit Kammer, vom Start bis zum Sieg)',
    timeout: 290000,
    async run(t) {
      await t.loadInpage('turn.js');
      const seeds = await t.page.evaluate(() => { const D = __dbg, out = {}; D.setSeedMode('random'); D.setLage([]); D.setTurn('S'); D.CFG.meet.p = 0; for (const sc of ['museum', 'casino']) { D.setScenario(sc); for (let s = 1; s < 200 && !out[sc]; s++) if (D.layoutBase(s).stash) out[sc] = s; } return out; });
      const res = []; for (const sc of ['museum', 'casino']) res.push(await coopGame(t.env, sc, seeds[sc]));
      t.ok(seeds.museum && seeds.casino, 'je ein Seed mit Kammer: ' + JSON.stringify(seeds)); t.note(res.map(r => r.tag + ' ' + r.stat.hall).join(', '));
      t.eq(res.flatMap(r => r.bad.map(b => r.tag + ': ' + b)), [], 'Abweichungen');
    },
  },
  {
    name: 'Kammer in Museum und Casino: kein Beute-Stueck (LAY.goods.rc) schneidet Innenraum oder Ring (Seeds 1 bis 150), keines der parkenden Autos (LAY.decor) liegt im Gebaeude, und die Regel kammer meldet ein Beute-Stueck im Ring',
    timeout: 120000,
    async run(t) {
      await t.loadInpage('turn.js');
      const r = await t.page.evaluate(() => {
        const D = __dbg, C = D.CFG, keep = C.meet.p; C.meet.p = 0; const bad = [], out = { n: 0 };
        try {
          D.setSeedMode('random'); D.setLage([]); D.setTurn('S');
          for (const sc of ['museum', 'casino']) { D.setScenario(sc);
            for (let s = 1; s <= 150; s++) { const lay = D.layoutBase(s), K = lay.stash; if (!K) continue; out.n++;
              const X = K.cells.map(c => c[0]), Y = K.cells.map(c => c[1]), R = [(Math.min(...X) - 1) * 32, (Math.min(...Y) - 1) * 32, (Math.max(...X) + 2) * 32, (Math.max(...Y) + 2) * 32];
              for (const g of lay.goods || []) if (g.rc && g.rc[0] < R[2] && g.rc[0] + g.rc[2] > R[0] && g.rc[1] < R[3] && g.rc[1] + g.rc[3] > R[1]) bad.push(sc + '#' + s + ' Beute ' + g.k + ' ' + g.rc);
              const B = lay.bld; for (const d of lay.decor || []) if (d.x < (B.x1 + 1) * 32 && d.x + 64 > B.x0 * 32 && d.y < (B.y1 + 1) * 32 && d.y + 64 > B.y0 * 32) bad.push(sc + '#' + s + ' Auto im Gebaeude ' + d.x + ',' + d.y);
            } }
          D.setScenario('museum'); let seed = 0; for (let s = 1; s < 300 && !seed; s++) { const l = D.layoutBase(s); if (l.stash && (l.goods || []).length) seed = s; }
          const lay = D.layoutBase(seed), K = lay.stash; lay.goods.push({ k: 'art', rc: [K.cells[0][0] * 32 + 4, K.cells[0][1] * 32 + 4, 20, 10] }); out.mut = D.validateMap(lay).err.some(e => e.r === 'kammer' && /Beute/.test(e.m));
        } finally { C.meet.p = keep; }
        out.bad = bad.slice(0, 6); out.nbad = bad.length; return out;
      });
      t.eq(r.bad, [], 'Abweichungen (' + r.nbad + ' bei ' + r.n + ' Kammern)'); t.ok(r.n >= 100, 'Kammern geprueft: ' + r.n); t.ok(r.mut, 'Regel kammer meldet ein Beute-Stueck im Innenraum');
    },
  },
  {
    name: 'Kammer in Museum und Casino: der Zugang (Kachel vor der Tuer und ihre begehbaren Nachbarn ausser der Tuer) liegt ausserhalb der echten Sicht aller Streifen (Wachen und Zusatzfiguren: Kegel in Laufrichtung, an Wegpunkten rundum, Manager, Kassierer nach Sueden, Kameras im ganzen Schwenk mal 1,25), Seeds 1 bis 150, Sichtlinie mit der echten Funktion los()',
    timeout: 240000,
    async run(t) {
      await t.loadInpage('turn.js');
      const r = await t.page.evaluate(() => {
        const D = __dbg, C = D.CFG, keep = C.meet.p; C.meet.p = 0; const bad = [], out = { n: 0, cells: 0 }, T = 32, angd = (a, b) => { const d = Math.abs(a - b) % (2 * Math.PI); return d > Math.PI ? 2 * Math.PI - d : d; };
        try {
          D.setSeedMode('random'); D.setLage([]); D.setTurn('S');
          for (const sc of ['museum', 'casino']) { D.setScenario(sc);
            for (let s = 1; s <= 150; s++) { const lay0 = D.layoutBase(s); if (!lay0.stash) continue; D.buildLay(lay0); const lay = D.LAY(), K = lay.stash; out.n++;
              const pts = [], seg = (q, rg, fov) => { if (!q) return; for (let k = 0; k < q.length; k++) { pts.push([q[k][0], q[k][1], null, rg, 0]); if (k) { const a = q[k - 1], b = q[k], n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) * 2)), an = Math.atan2(b[1] - a[1], b[0] - a[0]); for (let u = 1; u < n; u++) pts.push([a[0] + (b[0] - a[0]) * u / n, a[1] + (b[1] - a[1]) * u / n, an, rg, fov]); } } };
              (lay.guards || []).forEach(g => seg(g.route, C.guard.rng, C.guard.fov)); if (lay.mgr) seg(lay.mgr.route, 280, 1.1); (lay.mission.extra || []).forEach(x => seg(x.route, C.guard.rng, C.guard.fov)); (lay.tellers || []).forEach(q => pts.push([q[0], q[1], Math.PI / 2, 250, 1.2]));
              const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(v => [K.out[0] + v[0], K.out[1] + v[1]]).filter(q => !(q[0] === K.door[0] && q[1] === K.door[1]) && !D.isSol(q[0], q[1])), acc = [K.out].concat(nb);
              for (const c of acc) { out.cells++; const tx = (c[0] + .5) * T, ty = (c[1] + .5) * T;
                for (const p of pts) { const sx = (p[0] + .5) * T, sy = (p[1] + .5) * T, dd = Math.hypot(tx - sx, ty - sy); if (dd >= p[3]) continue; if (p[2] != null && angd(p[2], Math.atan2(ty - sy, tx - sx)) > p[4]) continue; if (D.los(sx, sy, tx, ty)) { bad.push(sc + '#' + s + ' ' + c + ' gesehen von ' + p.slice(0, 2).map(v => Math.round(v * 10) / 10)); break; } }
                for (const m of lay.cams || []) { const dd = Math.hypot(tx - m.x, ty - m.y); if (dd >= m.rng * 1.25) continue; if (angd(m.a0, Math.atan2(ty - m.y, tx - m.x)) > m.amp + m.fov) continue; if (D.los(m.x, m.y, tx, ty)) { bad.push(sc + '#' + s + ' ' + c + ' gesehen von Kamera ' + Math.round(m.x) + ',' + Math.round(m.y)); break; } } }
            } }
        } finally { C.meet.p = keep; }
        out.bad = bad.slice(0, 6); out.nbad = bad.length; return out;
      });
      t.eq(r.bad, [], 'Abweichungen (' + r.nbad + ' bei ' + r.n + ' Kammern, ' + r.cells + ' Zugangskacheln)'); t.ok(r.n >= 100, 'Kammern geprueft: ' + r.n);
    },
  },
];
