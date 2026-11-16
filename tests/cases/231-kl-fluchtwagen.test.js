// Ticket 245: Fluchtwagen im Kloetzchen-Stil (js/kl-fahrzeuge.js, flucht): vier Varianten je LAY.seed (gleiche Grundflaeche und Hoehe), jede hoechstens 40 Teile, fahrend und wartend (Tuer offen) verschieden,
// bei gleichem Seed immer gleich (Host und Client zeichnen dasselbe), vh und tk unveraendert. Ohne WebGL 2 uebersprungen.
const { glPage } = require('../glshare');
module.exports = [
  {
    name: 'Kloetzchen-Fluchtwagen: vier Varianten je Seed (hoechstens 40 Teile, fahrend und wartend verschieden, bei gleichem Seed gleich), Vorhut und Panzerwagen unveraendert',
    timeout: 240000,
    async run(t) {
      const P = await glPage(t); if (!P) return;
      try {
        const r = await P.page.evaluate(`(async () => { const D = __dbg; D.setScenario('bank'); D.buildLay(D.layoutFor(5)); D.startHeist(); D.get().me.hp = 1e9; D.view3d.kstil = 1; await D.view3d.set(true);
          for (let i = 0; i < 10; i++) D.update(1 / 30); D.draw(); D.draw(); const V = D.view3d.V, K = V.kl(), kit = K.kit, KL = K.KL, L = D.LAY(), o = { vars: {} };
          const sig = parts => parts.map(p => [p.s.map(v => Math.round(v * 10)).join('x'), p.c.getHexString()].join(':')).join('|');
          const van = (seed, wait) => { L.seed = seed; kit.time = wait ? 5 : 0; const ob = { k: 'van', x: 300, y: 300, a: 0, row: 0, L: 128, W: 64, fx: 1, fy: 1, dim: 0, bl: 0 }, e = { h: 30 }; const look = kit.carLook(ob, e);
            if (!wait) { KL.cars.van(kit, Object.assign({}, ob, { x: 999 }), e, look) } // vorher an anderer Stelle: der Wagen faehrt
            return kit.collect(() => KL.cars.van(kit, ob, e, look)) };
          const seen = {}; for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) { const a = van(seed, 0), a2 = van(seed, 0), w = van(seed, 1); const s = sig(a); (seen[s] = seen[s] || []).push(seed);
            o.vars[seed] = { n: a.length, nw: w.length, same: sig(a2) === s, openDiff: sig(w) !== s }; }
          o.distinct = Object.keys(seen).length;
          const vh = kit.collect(() => KL.cars.vh(kit, { k: 'vh', x: 300, y: 300, a: 0, row: 3, L: 128, W: 64, fx: 1, fy: 1, dim: 0, bl: 0 }, { h: 30, bar: 1 }, kit.carLook({ k: 'vh', row: 3 }, { bar: 1 }))).length;
          const tk = kit.collect(() => KL.cars.tk(kit, { k: 'tk', x: 300, y: 300, a: 0, row: 4, L: 224, W: 96, fx: 1, fy: 1, dim: 0, bl: 0 }, { h: 40 }, kit.carLook({ k: 'tk', row: 4 }, { h: 40 }))).length;
          o.vh = vh; o.tk = tk; D.view3d.V.el.getContext('webgl2').finish(); o.err = V.info().err; await D.view3d.set(false); return o; })()`);
        t.note(JSON.stringify(r));
        t.ok(r.err === '', 'keine Fehler in der Ansicht');
        t.ok(r.distinct >= 4, 'mindestens 4 verschiedene Varianten ueber die Seeds: ' + r.distinct);
        for (const [seed, v] of Object.entries(r.vars)) { t.ok(v.n >= 8 && v.n <= 40 && v.nw <= 40, 'Seed ' + seed + ': ' + v.n + ' Teile (wartend ' + v.nw + ')'); t.ok(v.same, 'Seed ' + seed + ': bei jedem Bau gleich'); t.ok(v.openDiff, 'Seed ' + seed + ': wartend (Tuer offen) sieht anders aus als fahrend'); }
        t.ok(r.vh <= 40 && r.tk <= 40, 'Vorhut und Panzerwagen weiter im Rahmen: ' + r.vh + ' und ' + r.tk);
        if (P.page.errors.length) t.ok(false, 'JS-Fehler: ' + P.page.errors.slice(0, 2).join(' | '));
      } finally { await P.done(); }
    },
  },
];
