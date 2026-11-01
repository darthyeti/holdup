// Ticket #57: Mit #debug allein wuerfelt das Spiel zufaellige Karten (seedMode 'random'). Die feste Klassikkarte setzen nur die Tests, ausdruecklich ueber
// window.__holdupSeed = 'classic' (tests/lib.js, launch), dazu schaltet die Kachel Karte in den Testwerkzeugen (dmap, Aktion dbgMap) um.
// 'classic' ist auch bei Juwelier, Tankstelle, Museum, Casino und Transporter fest (gleicher Seed gibt dieselbe Karte, jede Abfrage gleich).
const { openGame } = require('../lib');
module.exports = [
  {
    name: 'Debug-Zufall: Ohne Flag ergeben zwei Runden mit #debug verschiedene Seeds und echte Karten, mit Flag (Standard der Tests) bleibt es die feste Klassikkarte in allen sechs Szenarien',
    async run(t) {
      const fix = await t.page.evaluate(() => {
        const D = __dbg, o = { flag: window.__holdupSeed, sc: {} };
        for (const sc of ['bank', 'truck', 'jewel', 'gas', 'museum', 'casino']) { D.setScenario(sc); o.sc[sc] = [D.newSeed(), D.newSeed(), JSON.stringify(D.layoutFor('classic')) === JSON.stringify(D.layoutFor('classic'))]; }
        return o;
      });
      t.eq(fix.flag, 'classic', 'die Tests setzen das Flag ausdruecklich');
      for (const sc of Object.keys(fix.sc)) t.eq(fix.sc[sc], ['classic', 'classic', true], 'feste Karte: ' + sc);
      const page = await openGame(t.env, { random: true });
      try {
        const r = await page.evaluate(() => {
          const D = __dbg, o = { flag: window.__holdupSeed === undefined, seeds: [], lay: [] };
          D.setScenario('bank');
          for (let i = 0; i < 2; i++) { const sd = D.newSeed(); o.seeds.push(sd); D.buildSeed(sd); o.lay.push(D.LAY().seed); }
          return o;
        });
        t.ok(r.flag, 'ohne Flag');
        t.ok(r.seeds.every(s => typeof s === 'number'), 'Seeds sind Zahlen: ' + r.seeds);
        t.ok(r.seeds[0] !== r.seeds[1], 'zwei Runden, zwei Seeds: ' + r.seeds);
        t.eq(r.lay, r.seeds, 'die Karte baut aus dem gewuerfelten Seed');
        t.eq(page.errors, [], 'keine JS-Fehler');
      } finally { await page.ctx.close(); }
    },
  },
  {
    name: 'Debug-Zufall: Die Kachel Karte in den Testwerkzeugen schaltet zwischen fest und zufaellig um und wirkt auf die naechste Runde',
    async run(t) {
      await t.loadTool('loopnet.js'); await t.loadInpage('menu.js');
      const r = await t.page.evaluate(() => {
        const d = MT.solo(null, 's'), o = {}; d.sessReset(); MT.k(d, 'o'); MT.click(d, 'dbg');
        const tile = () => d.ui().tiles().find(q => q.id === 'dmap');
        o.has = !!tile(); o.t0 = tile().title; o.s0 = d.newSeed();
        MT.click(d, 'dmap'); o.t1 = tile().title; o.s1 = d.newSeed();
        MT.click(d, 'dmap'); o.t2 = tile().title; o.s2 = d.newSeed();
        return o;
      });
      t.ok(r.has, 'Kachel da');
      t.ok(/fest/.test(r.t0) && r.s0 === 'classic', 'Start fest (Tests): ' + r.t0);
      t.ok(/zufällig/.test(r.t1) && typeof r.s1 === 'number', 'nach Klick zufaellig: ' + r.t1);
      t.ok(/fest/.test(r.t2) && r.s2 === 'classic', 'nach zweitem Klick wieder fest');
    },
  },
];
