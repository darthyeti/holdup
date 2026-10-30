// Museum v2 (Ticket 41, docs/szenarien.md Museum v2): Kameras 3 bis 5 mit Mindestabstand und ohne Naehe zu den Tueren, Kameras zaehlen im ganzen Gebaeude, getrennte Wachrouten mit Mindestabstand,
// keine Wache und kein Wachkegel im Laserbereich, groesseres Haus (500 bis 650 begehbare Kacheln), ein Weg ohne Kamerablick zu einem Gemaelde. Die Regeln stehen in museumRules (validateMap),
// die Mutanten-Tests biegen je eine Eigenschaft einer gueltigen Karte kaputt und verlangen den passenden Fehler.
const SEEDS = 'Array.from({ length: 60 }, (_, i) => 3 + i * 11)';

module.exports = [
  {
    name: 'Museum v2: Kameras 3 bis 5, Abstand mindestens 8, nie nahe einer Aussentuer, hoechstens zwei in der Ostgalerie, Weg ohne Kamerablick zu einem Gemaelde (60 Seeds, alle gueltig)',
    timeout: 240000,
    async run(t) {
      await t.loadInpage('turn.js');
      const r = await t.page.evaluate(`(() => { const D = __dbg, T = 32, out = { bad: [], n: {}, minD: 1e9, door: 1e9, east: 0, rules: D.CFG.museum.cam };
        D.setScenario('museum'); D.setSeedMode('random'); D.setLage(null); D.setTurn('S');
        for (const sd of ${SEEDS}) { const lay = D.layoutBase(sd), rep = D.validateMap(lay); if (!rep.ok) out.bad.push(sd + ': ' + rep.err.map(e => e.r).join()); const cams = lay.cams; out.n[cams.length] = (out.n[cams.length] || 0) + 1;
          for (let i = 0; i < cams.length; i++) for (let j = i + 1; j < cams.length; j++) out.minD = Math.min(out.minD, Math.hypot(cams[i].x - cams[j].x, cams[i].y - cams[j].y) / T);
          const B = lay.bld, dx = lay.q ? lay.q.ww - 9 : 0, W = D.world(); for (const c of cams) { for (let x = B.x0; x <= B.x1; x++) for (const y of [B.y0, B.y1]) if ('DL'.includes(W.cell(x, y))) out.door = Math.min(out.door, Math.hypot(c.x / T - x - .5, c.y / T - y - .5)); }
          out.east = Math.max(out.east, cams.filter(c => c.x / T >= 18 + dx).length); }
        return out; })()`);
      t.eq(r.bad, [], 'alle Karten bestehen validateMap');
      t.ok(Object.keys(r.n).every(k => +k >= 3 && +k <= 5) && Object.keys(r.n).length >= 3, 'Zahl der Kameras 3 bis 5, alle Zahlen kommen vor: ' + JSON.stringify(r.n));
      t.ok(r.minD >= r.rules.minD, 'kleinster Kameraabstand mindestens ' + r.rules.minD + ': ' + r.minD.toFixed(1));
      t.ok(r.door >= r.rules.door, 'keine Kamera naeher als ' + r.rules.door + ' Kacheln an einer Aussentuer: ' + r.door.toFixed(1));
      t.ok(r.east <= 2, 'hoechstens zwei Kameras in der Ostgalerie: ' + r.east);
    },
  },
  {
    name: 'Museum v2: groesseres Haus (Median der begehbaren Innenkacheln 500 bis 650), fuenf Hallen, viele Gebaeudegroessen, Klassik rund 5 %',
    timeout: 240000,
    async run(t) {
      await t.loadInpage('turn.js');
      const r = await t.page.evaluate(`(() => { const D = __dbg, T = 32, out = { fl: [], sizes: {}, hall: {}, classic: 0 };
        D.setScenario('museum'); D.setSeedMode('random'); D.setLage(null); D.setTurn('S');
        for (let i = 0; i < 200; i++) { const lay = D.layoutBase(3 + i * 11), B = lay.bld; let n = 0; for (let y = B.y0 + 1; y < B.y1; y++) for (let x = B.x0 + 1; x < B.x1; x++) if (!D.isSol(x, y)) n++;
          out.fl.push(n); out.sizes[B.x1 + 'x' + B.y1] = 1; out.hall[lay.hall] = (out.hall[lay.hall] || 0) + 1; if (!lay.q) out.classic++; }
        out.fl.sort((a, b) => a - b); return out; })()`);
      const med = r.fl[r.fl.length >> 1];
      t.ok(med >= 500 && med <= 650, 'Median der begehbaren Kacheln 500 bis 650: ' + med + ' (min ' + r.fl[0] + ', max ' + r.fl[r.fl.length - 1] + ')');
      t.ok(Object.keys(r.sizes).length >= 30, 'mindestens 30 Gebaeudegroessen in 200 Seeds: ' + Object.keys(r.sizes).length);
      t.ok(Object.keys(r.hall).length === 5, 'fuenf Hallen: ' + JSON.stringify(r.hall));
      t.ok(r.classic <= 20, 'Klassik-Huelle hoechstens rund 5 %: ' + r.classic + ' von 200');
    },
  },
  {
    name: 'Museum v2: die ersten beiden Wachen laufen getrennt (kleinster gleichzeitiger Abstand mindestens 10 Kacheln), jede weitere haelt 3, keine Wache im Laserbereich (40 Seeds mit zwei und mehr Wachen, Sicherheitsdienst und Wachwechsel, 100 s)',
    timeout: 280000,
    async run(t) {
      await t.loadInpage('turn.js');
      const r = await t.page.evaluate(`(() => { const D = __dbg, T = 32, out = { n: 0, minD: 1e9, minAll: 1e9, worst: null, laser: 0, seenLaser: 0, rng: null, fov: null, cfg: D.CFG.museum.guard };
        for (let sd = 3, k = 0; k < 40 && sd < 3 + 11 * 400; sd += 11) {
          D.sessReset(); D.setScenario('museum'); D.setSeedMode('random'); D.setLage(['sicher']); D.setTurn('S'); D.buildSeed(sd); if (D.get().npcs.filter(q => q.k === 'grd').length < 2) continue;
          k++; out.n++; D.CFG.policeAt = 1e6; D.CFG.policeForced = 1e6; const g = D.get(), me = g.me, L = D.LAY(), dx = L.q ? L.q.ww - 9 : 0; for (const c of g.cams) c.off = true; L.mission.blackoutAt = null;
          for (const q of g.npcs) if (q.st === 'away') q.at = 4;   // der Wachwechsel kommt nach 4 s dazu
          for (let i = 0; i < 30 * 100; i++) { me.x = -300; me.y = -300; D.update(1 / 30); if (i % 3) continue; const gs = D.get().npcs.filter(q => q.k === 'grd' && q.st === 'idle'); out.rng = gs[0] ? gs[0].rng : out.rng; out.fov = gs[0] ? gs[0].fov : out.fov;
            for (const q of gs) { if (q.x / T >= 17 + dx) out.laser++; }
            for (let a = 0; a < gs.length; a++) for (let b = a + 1; b < gs.length; b++) { const d = Math.hypot(gs[a].x - gs[b].x, gs[a].y - gs[b].y) / T; if (gs[a].id < 2 && gs[b].id < 2) { if (d < out.minD) { out.minD = d; out.worst = sd; } } else if (d < out.minAll) out.minAll = d; } } }
        return out; })()`);
      t.ok(r.n >= 30, 'Aufbau: genug Karten mit zwei und mehr Wachen: ' + r.n);
      t.eq([r.rng, r.fov], [r.cfg.rng, r.cfg.fov], 'Kegel wie CFG.museum.guard (260 px, halber Winkel 0,8)');
      t.ok(r.minD >= r.cfg.gap - .2, 'kleinster gleichzeitiger Abstand mindestens ' + r.cfg.gap + ' Kacheln: ' + r.minD.toFixed(2) + ' (Seed ' + r.worst + ')');
      t.ok(r.minAll >= r.cfg.near - .2, 'jede weitere Wache (Sicherheitsdienst, Wachwechsel) haelt mindestens ' + r.cfg.near + ' Kacheln Abstand: ' + r.minAll.toFixed(2));
      t.eq(r.laser, 0, 'keine Wache im Laserbereich');
    },
  },
  {
    name: 'Museum v2: eine Kamera sieht den Spieler im ganzen Gebaeude (Rate CFG.museum.cam.seen), draussen nicht, mit dem Hauptschalter (Kameras aus) nicht',
    timeout: 120000,
    async run(t) {
      await t.loadInpage('turn.js');
      const r = await t.page.evaluate(`(() => { const D = __dbg, T = 32, K = D.CFG.museum, out = { cam: K.cam.seen };
        const prep = () => { D.sessReset(); D.setScenario('museum'); D.setSeedMode('random'); D.setLage([]); D.setTurn('S'); D.buildSeed(14); D.CFG.policeAt = 1e6; D.CFG.policeForced = 1e6; const g = D.get(), L = D.LAY(); for (const q of g.npcs) { q.st = 'away'; q.at = 1e9; } L.mission.blackoutAt = null; return { g, me: g.me, L }; };
        const run = (setup, sec) => { const { g, me, L } = prep(); const spot = setup(g, me, L); let top = 0; for (let i = 0; i < 30 * sec; i++) { me.x = spot[0]; me.y = spot[1]; D.update(1 / 30); top = Math.max(top, D.get().sus); } return { sus: top, phase: D.get().phase }; };
        // Standplatz im Blick der Kamera: eine Kachel in ihrer Mitte, Reichweite halbe Strecke, frei, Sichtlinie frei
        const inView = (g, me, L, ci) => { const c = g.cams[ci]; for (let d = 60; d <= c.rng * .6; d += 8) for (const da of [0, .15, -.15]) { const a = c.a0 + da, x = c.x + Math.cos(a) * d, y = c.y + Math.sin(a) * d, tx = Math.floor(x / T), ty = Math.floor(y / T);
            if (tx > L.bld.x0 && tx < L.bld.x1 && ty > L.bld.y0 && ty < L.bld.y1 && !D.isSol(tx, ty) && D.los(c.x, c.y, x, y)) { for (let i = 0; i < g.cams.length; i++) if (i !== ci) g.cams[i].off = true; c.amp = 0; c.a0 = Math.atan2(y - c.y, x - c.x); return [x, y]; } } return null; };
        out.drin = run((g, me, L) => inView(g, me, L, 0), 1);
        out.draussen = run((g, me, L) => { const c = g.cams[0]; c.amp = 0; for (let i = 1; i < g.cams.length; i++) g.cams[i].off = true; c.a0 = Math.PI / 2; return [L.spawn.x, L.spawn.y + 600]; }, 3);
        out.aus = run((g, me, L) => { const s = inView(g, me, L, 0); g.cams[0].off = true; return s; }, 2);
        return out; })()`);
      t.ok(r.drin.sus > 10 && r.drin.sus < 40, 'im Blick der Kamera steigt der Verdacht (1 s Gehen, rund ' + (r.cam - 9) + ' je Sekunde): ' + JSON.stringify(r.drin));
      t.ok(r.draussen.sus < 1, 'draussen vor dem Haus sieht die Kamera nichts: ' + JSON.stringify(r.draussen));
      t.ok(r.aus.sus < 1, 'Kamera aus: kein Verdacht: ' + JSON.stringify(r.aus));
    },
  },
  {
    name: 'Museum v2, Mutanten: je eine kaputte Eigenschaft einer gueltigen Karte gibt den passenden Fehler (kamera-zahl, kamera-abstand, kamera-tuer, kamera-ost, kamera-weg, wache-abstand, wache-laser)',
    timeout: 120000,
    async run(t) {
      await t.loadInpage('turn.js');
      const r = await t.page.evaluate(`(() => { const D = __dbg, T = 32, out = {}; D.setScenario('museum'); D.setSeedMode('random'); D.setLage(['sicher']); D.setTurn('S');
        let sd = 3; const find = f => { for (; sd < 4000; sd += 11) { const lay = D.layoutBase(sd); if (f(lay)) { return lay; } } return null; };
        const errs = lay => D.validateMap(lay).err.map(e => e.r);
        const lay0 = find(l => l.guards.length >= 2 && l.cams.length >= 4 && D.validateMap(l).ok); out.basis = lay0 && errs(lay0);
        const m = (f) => { const lay = D.layoutBase(lay0.seed); f(lay); return errs(lay); };
        out.zahl = m(l => { l.cams.push(Object.assign({}, l.cams[0])); l.cams.push(Object.assign({}, l.cams[0])); });
        out.abstand = m(l => { l.cams[1].x = l.cams[0].x + 64; l.cams[1].y = l.cams[0].y; });
        out.tuer = m(l => { const B = l.bld, W = D.world(); for (let x = B.x0; x <= B.x1; x++) if (W.cell(x, B.y1) === 'D') { l.cams[0].x = x * T + 16; l.cams[0].y = B.y1 * T - 16; break; } });
        out.ost = m(l => { const dx = l.q.ww - 9; for (const c of l.cams) { c.x = (22 + dx) * T; c.y = 9 * T; c.amp = 0; } });
        out.weg = m(l => { const dd = Math.floor(l.spawn.x / T), B = l.bld; for (const c of l.cams) { c.x = (dd + .5) * T; c.y = (B.y1 - .5) * T; c.a0 = -1.57; c.amp = 3; c.fov = 3.1; c.rng = 2500; } });
        out.wachab = m(l => { l.guards[1].p = l.guards[0].p.slice(); });
        out.laser = m(l => { const dx = l.q.ww - 9; l.guards[0].route = l.guards[0].route.concat([[19 + dx, 9]]); });
        return out; })()`);
      t.ok(r.basis && r.basis.length === 0, 'Aufbau: eine gueltige Karte mit zwei Wachen und mindestens vier Kameras: ' + JSON.stringify(r.basis));
      t.ok(r.zahl.includes('kamera-zahl'), 'zu viele Kameras: ' + JSON.stringify(r.zahl));
      t.ok(r.abstand.includes('kamera-abstand'), 'zwei Kameras zu dicht: ' + JSON.stringify(r.abstand));
      t.ok(r.tuer.includes('kamera-tuer'), 'Kamera ueber der Tuer: ' + JSON.stringify(r.tuer));
      t.ok(r.ost.includes('kamera-ost'), 'zu viele Kameras in der Ostgalerie: ' + JSON.stringify(r.ost));
      t.ok(r.weg.includes('kamera-weg'), 'Kameras sehen den ganzen Weg: ' + JSON.stringify(r.weg));
      t.ok(r.wachab.includes('wache-abstand'), 'Wachen starten am selben Punkt: ' + JSON.stringify(r.wachab));
      t.ok(r.laser.includes('wache-laser'), 'Routenpunkt im Laserbereich: ' + JSON.stringify(r.laser));
    },
  },
];
