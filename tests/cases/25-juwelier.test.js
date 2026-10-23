// Juwelier: fuenf Hallen-Grundrisse, Wache mit eigenen Werten, Sichtkegel, Schleichmessung (tools/stealth.js).
const HALLS = ['Klassik', 'Reihen', 'Salon', 'Ring', 'Gänge'];

module.exports = [
  {
    name: 'Juwelier: fuenf verschiedene Hallen, immer 22 Vitrinen (8 Insel, 6 Wand, 6 Podest, 2 Tresen)',
    slow: true,
    async run(t) {
      const r = await t.page.evaluate(() => {
        const D = __dbg, halls = {}, bad = [], grids = new Set();
        D.setScenario('jewel'); D.setSeedMode('random'); D.setLage([]); D.setTurn('S');
        for (let i = 0; i < 150; i++) {
          D.buildLay(D.layoutFor(1 + i * 7));
          const L = D.LAY(), c = {}; for (const v of L.vit) c[v.k] = (c[v.k] || 0) + 1;
          halls[L.hall] = (halls[L.hall] || 0) + 1; grids.add(D.world().M.join('|'));
          if (L.vit.length !== 22 || c.isl !== 8 || c.wall !== 6 || c.win !== 6 || c.ctr !== 2) bad.push(L.hall + '#' + L.seed + ' ' + JSON.stringify(c));
        }
        return { halls, bad, grids: grids.size };
      });
      t.eq(Object.keys(r.halls).sort(), HALLS.slice().sort(), 'alle fuenf Hallen kommen vor');
      t.eq(r.bad, [], 'Vitrinenzahl je Halle');
      t.ok(r.grids >= 5, 'mindestens fuenf verschiedene Raster: ' + r.grids);
      t.ok(Object.values(r.halls).every(n => n >= 15), 'jede Halle wenigstens 15 von 150: ' + JSON.stringify(r.halls));
    },
  },
  {
    name: 'Juwelier: Wache laeuft mit CFG.jewel.guard, Kegel wird im Juwelier und Museum gezeichnet, nicht in der Bank',
    async run(t) {
      const r = await t.page.evaluate(() => {
        const D = __dbg, out = {};
        D.setScenario('jewel'); D.setSeedMode('random'); D.setLage([]); D.setTurn('S');
        let sd = 1; for (; sd < 200; sd++) { D.buildLay(D.layoutFor(sd)); if (D.get().npcs.some(q => q.k === 'grd')) break; }
        const g = D.get().npcs.find(q => q.k === 'grd'), cg = D.CFG.jewel.guard;
        out.guard = [g.spd, g.fov, g.rng]; out.cfg = [cg.spd, cg.fov, cg.rng];
        out.cone = {}; for (const sc of ['bank', 'jewel', 'gas', 'museum', 'casino']) { D.setScenario(sc); D.setSeedMode('random'); D.buildLay(D.layoutFor(5)); out.cone[sc] = !!D.LAY().cone; }
        // Bank-Wache behaelt die alten Werte
        D.setScenario('bank'); D.setSeedMode('random'); for (let s = 1; s < 100; s++) { D.buildLay(D.layoutFor(s)); const b = D.get().npcs.find(q => q.k === 'grd'); if (b) { out.bank = [b.spd, b.fov, b.rng]; break; } }
        out.cfgBank = [D.CFG.guard.spd, D.CFG.guard.fov, D.CFG.guard.rng];
        return out;
      });
      t.eq(r.guard, r.cfg, 'Juwelier-Wache nimmt die Werte aus CFG.jewel.guard');
      t.ok(r.guard[0] < r.cfgBank[0] && r.guard[1] < r.cfgBank[1] && r.guard[2] < r.cfgBank[2], 'langsamer, schmaler, kuerzer als die Standardwache');
      t.eq(r.bank, r.cfgBank, 'Bank-Wache bleibt bei CFG.guard');
      t.eq(r.cone, { bank: false, jewel: true, gas: false, museum: true, casino: false }, 'Sichtkegel nur im Juwelier und Museum');
    },
  },
  {
    name: 'Juwelier: Sichtkegel zeichnet in allen Hallen ohne Fehler und endet an Trennwand und Saeule',
    async run(t) {
      const r = await t.page.evaluate(() => {
        const D = __dbg, seen = new Set(), out = { drawn: 0 };
        D.setScenario('jewel'); D.setSeedMode('random'); D.setLage([]); D.setTurn('S');
        for (let sd = 1; sd < 300 && seen.size < 5; sd++) {
          D.buildLay(D.layoutFor(sd)); const h = D.LAY().hall; if (seen.has(h) || !D.get().npcs.some(q => q.k === 'grd')) continue; seen.add(h);
          D.startHeist(false); D.reset(); const me = D.get().me; me.x = 11.9 * 32; me.y = 12 * 32;
          for (let i = 0; i < 60; i++) D.update(1 / 30); D.draw(); D.draw(); out.drawn++;
        }
        const far = (pts) => Math.max(...pts.slice(1).map(p => Math.hypot(p[0] - pts[0][0], p[1] - pts[0][1])));
        const cfg = D.CFG.jewel.guard;
        // Salon: Trennwand in Zeile y=6 (x5..9). Wache darunter blickt nach Norden gegen die Wand, dann nach Sueden ins Freie.
        for (let sd = 1; sd < 400; sd++) { D.buildLay(D.layoutFor(sd)); if (D.LAY().hall === 'Salon') break; }
        out.wall = Math.round(far(D.coneRays(7.5 * 32, 7.5 * 32, -Math.PI / 2, cfg.fov, cfg.rng)));
        out.open = Math.round(far(D.coneRays(7.5 * 32, 7.5 * 32, Math.PI / 2, cfg.fov, cfg.rng)));
        // Reihen: Saeulen bei (11,5) und (11,8): Wache westlich in Zeile 5 blickt nach Osten, die Mitte des Kegels endet an der Saeule
        for (let sd = 1; sd < 400; sd++) { D.buildLay(D.layoutFor(sd)); if (D.LAY().hall === 'Reihen') break; }
        const pts = D.coneRays(9.5 * 32, 5.5 * 32, 0, .05, cfg.rng); out.pillar = Math.round(far(pts));
        out.cfgRng = cfg.rng;
        return out;
      });
      t.eq(r.drawn, 5, 'alle fuenf Hallen gezeichnet');
      t.ok(r.wall < 60, 'Kegel endet an der Trennwand (reicht nur ' + r.wall + ' px)');
      t.ok(r.open > r.cfgRng * .9, 'im Freien reicht der Kegel fast bis zur Reichweite (' + r.open + ' von ' + r.cfgRng + ')');
      t.ok(r.pillar < 90, 'Kegel endet an der Saeule (reicht nur ' + r.pillar + ' px)');
    },
  },
  {
    name: 'Schleichmessung (tools/stealth.js): laeuft, liefert plausible Werte, Warten hilft',
    timeout: 180000,
    async run(t) {
      await t.loadTool('stealth.js');
      const r = await t.page.evaluate(() => {
        const D = __dbg; D.setScenario('jewel'); D.setSeedMode('random'); D.setLage([]); D.setTurn('S');
        let sd = 1; for (; sd < 200; sd++) { D.buildLay(D.layoutFor(sd)); if (D.get().npcs.filter(q => q.k === 'grd').length === 1) break; }
        return stealth.measure({ runs: 1, secs: 90, k: 2 });
      });
      t.note('unbeobachtet ' + r.unseen + ', naiv ' + r.naive + ', mit Warten ' + r.timed + ' in ' + r.timedT + ' s');
      t.ok(r.vit === 22 && r.spots >= 20, 'Vitrinen gefunden: ' + r.vit + '/' + r.spots);
      t.ok(r.unseen > .5 && r.unseen <= 1, 'unbeobachteter Anteil plausibel: ' + r.unseen);
      t.ok(r.timed >= r.naive && r.timed > .8, 'Warten auf ein Fenster hilft: naiv ' + r.naive + ', mit Warten ' + r.timed);
    },
  },
  {
    name: 'Echtspiel-Messung (stealth.live): spielt n Spieler durch das echte Spiel, ein Regelsatz ohne Alarm gelingt immer, ein scharfer scheitert, danach ist die Seite wieder solo',
    timeout: 180000,
    async run(t) {
      await t.loadTool('stealth.js');
      const r = await t.page.evaluate(() => {
        const D = __dbg; D.setScenario('jewel'); D.setSeedMode('random'); D.setLage([]); D.setTurn('S');
        let sd = 1; for (; sd < 200; sd++) { D.buildLay(D.layoutFor(sd)); if (D.get().npcs.filter(q => q.k === 'grd').length === 1) break; }
        let np = 0; const o = {};
        const leicht = { net: 1, grace: 999, carry: { grd: 0, staff: 0 } }, scharf = { net: 0, stare: 0, grace: 0, carry: { grd: 100, staff: 100 } };
        o.leicht = stealth.live({ n: 3, k: 2, trials: 3, cfg: leicht, idle: 20 });
        o.scharf = stealth.live({ n: 1, k: 4, trials: 8, cfg: scharf, idle: 20 });
        o.spieler = D.get().players.length;
        return o;
      });
      t.eq(r.leicht, 1, 'ohne Alarmmoeglichkeit (Gnadenfrist 999 s) gelingt jeder Lauf zu dritt');
      t.ok(r.scharf < 1, 'mit Rate 100 fuer den Rucksack scheitert mindestens ein Lauf: ' + r.scharf);
      t.eq(r.spieler, 1, 'die Seite ist danach wieder solo (setN 1)');
    },
  },
];
