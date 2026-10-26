// Leises Aufschneiden (Tills Wunsch vom 26. Oktober 2026, Casino): Die Dauer der leisen Schnitte (Vitrinen, Gemaelde, Chips, Schliessfaecher in Phase 1) lässt sich mit dem Dietrich (Shop) und dem Techniker (Skillbaum) verkuerzen, anteilig CFG.shop.silent (.7) des Effekts auf das laute Aufbrechen. Dazu der Fehler, den die Pruefung fand: Der Techniker machte das Aufbrechen 30 % LANGSAMER statt schneller (Faktor 1 + pick statt 1 - pick).
const HELP = `(() => {
  const D = __dbg;
  const scene = (own, sk, phase2) => { D.sessReset(); Object.assign(D.SESSION.own, own || {}); Object.assign(D.SESSION.sk, sk || {}); D.setScenario('casino'); D.setSeedMode('random'); D.setLage([]); D.setTurn('S'); D.buildSeed(829256); D.CFG.policeAt = 1e6; D.CFG.policeForced = 1e6; D.reset(); if (phase2) D.startHeist(false, D.get().me); return D.get(); };
  return { D, scene };
})()`;

module.exports = [
  {
    name: 'Leises Aufschneiden: Dietrich und Techniker verkuerzen die leisen Schnitte (anteilig CFG.shop.silent), das laute Aufbrechen voll, der Techniker wirkt in die richtige Richtung',
    async run(t) {
      const r = await t.page.evaluate(`(() => { const H = ${HELP}, D = H.D, o = {}; o.silent = D.CFG.shop.silent;
        const tt = (own, sk, phase2) => { const g = H.scene(own, sk, phase2); const it = g.its.find(i => i.t === 'good' && i.k === 'vip') || g.its.find(i => i.t === 'good'); return { k: it.k, sn: typeof it.sn === 'function' ? it.sn(g.me) : it.sn, f: D.toolT(g.me, it), dur: it.dur(g.me) }; };
        o.base = tt({}, {}, false); o.pick3 = tt({ pick: 3 }, {}, false); o.tech3 = tt({}, { U2: 3 }, false); o.both = tt({ pick: 3 }, { U2: 3 }, false);
        o.loud = tt({}, {}, true); o.loud3 = tt({ pick: 3 }, { U2: 3 }, true);
        return o; })()`);
      const S = r.silent;
      t.eq(r.base.sn, 'tick', 'Phase 1: der Schnitt ist leise (tick)');
      t.ok(Math.abs(r.base.f - 1) < 1e-9, 'ohne Dietrich und Techniker bleibt die Dauer wie vorher: ' + r.base.f);
      t.ok(Math.abs(r.pick3.f - (1 - (1 - .4) * S)) < 1e-9, 'Dietrich 3 (Faktor .4): leise Schnitte nur anteilig schneller: ' + r.pick3.f);
      t.ok(Math.abs(r.tech3.f - (1 - .3 * S)) < 1e-9, 'Techniker 3 (30 %): leise Schnitte anteilig schneller, nie langsamer: ' + r.tech3.f);
      t.ok(r.both.f < r.pick3.f && r.both.f < r.tech3.f, 'beides zusammen ist am schnellsten: ' + r.both.f);
      t.eq(r.loud.sn, 'pry', 'Phase 2: Aufbrechen ist laut (pry)');
      t.ok(Math.abs(r.loud.f - 1) < 1e-9 && Math.abs(r.loud3.f - .4 * .7) < 1e-9, 'laut: voller Effekt, Dietrich 3 mal Techniker 3 = .4 * .7: ' + r.loud3.f);
    },
  },
];
