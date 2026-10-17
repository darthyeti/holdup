// Grundprobe: Seite laedt, Debug-Hook steht, alle sechs Szenarien lassen sich bauen und ein paar Sekunden simulieren.
const SC = ['bank', 'truck', 'jewel', 'gas', 'museum', 'casino'];

module.exports = [
  {
    name: 'Start: Debug-Hook und Sprites',
    async run(t) {
      const r = await t.page.evaluate(() => ({ build: __dbg.BUILD, players: __dbg.get().players.length, phase: __dbg.get().phase }));
      t.ok(r.build && r.build.n > 0, 'BUILD fehlt');
      t.eq(r.players, 1, 'Spielerzahl');
    },
  },
  {
    name: 'Start: alle Szenarien bauen und simulieren',
    async run(t) {
      for (const sc of SC) {
        const r = await t.page.evaluate(sc => {
          __dbg.setScenario(sc); __dbg.setSeedMode('random'); __dbg.buildLay(__dbg.layoutFor(4242));
          for (let i = 0; i < 60 * 8; i++) __dbg.update(1 / 30);
          const g = __dbg.get();
          return { its: g.its.length, hp: g.me.hp, time: Math.round(g.time), sc: __dbg.sc() };
        }, sc);
        t.eq(r.sc, sc, 'Szenario');
        t.ok(r.its > 0, sc + ': keine Items');
        t.ok(r.hp > 0, sc + ': Spieler tot nach 8 s in Phase 1');
      }
    },
  },
];
