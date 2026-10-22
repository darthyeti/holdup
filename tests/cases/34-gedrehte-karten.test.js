// Gedrehte Karten vorbereiten (Plan Mehr Abwechslung, Sprint 3, docs/offen-und-spieltest.md): Bevor layoutFor die handgebauten Karten aus dem Seed dreht (Sprint 4), muss bewiesen sein, dass jede Lage in allen Spielwegen funktioniert.
// Der Schalter dbg.setTurn legt jede Gebaeude-Karte auf eine der acht Lagen (auch fuer Coop-Clients), so laufen Coop, Bot und Aufbau ueber den normalen Weg (layoutFor, buildWorld, reset).
// Hier die schnelle Fassung fuer npm test (je Szenario alle acht Lagen, die Hallen reihum), den grossen Lauf mit allen Hallen und vielen Seeds gibt es mit npm run test:long (tests/long/).
const { coopGame } = require('../lib');
const SC = ['jewel', 'gas', 'museum', 'casino'];
const LAGEN = ['S', 'N', 'E', 'W', 'S+', 'N+', 'E+', 'W+'];
// Der erste Seed je Halle einer Karte (ein Seed je Grundriss)
const SEEDS = `(sc) => { const D = __dbg; D.setScenario(sc); D.setSeedMode('random'); D.setLage([]); const seen = {}, out = []; for (let s = 1; s < 3000; s++) { const h = D.layoutFor(s).hall; if (!seen[h]) { seen[h] = 1; out.push(s) } } return out; }`;

module.exports = [
  {
    name: 'Gedreht: setTurn legt jede Karte auf die Lage (acht verschiedene Raster, Strasse an der richtigen Seite), gleiche Seeds geben gleiche Karten, der Transporter bleibt unberuehrt',
    timeout: 120000,
    async run(t) {
      await t.loadInpage('turn.js');
      const r = await t.page.evaluate(({ SC, SEEDS }) => {
        const D = __dbg, seeds = eval(SEEDS), bad = [], out = {};
        for (const sc of SC) for (const seed of seeds(sc).slice(0, 3)) {
          D.setScenario(sc); D.setSeedMode('random'); D.setLage([]);
          const hs = new Set();
          for (const side of TN.SIDES) {
            D.setTurn(side);
            const l1 = D.layoutFor(seed), h1 = TN.layHash(D, l1), l2 = D.layoutFor(seed), h2 = TN.layHash(D, l2);
            if (h1 !== h2) bad.push(sc + '#' + seed + ' ' + side + ': zwei Aufbauten weichen ab');
            if (D.laneOf(l1).side !== side[0]) bad.push(sc + '#' + seed + ' ' + side + ': Strasse an ' + D.laneOf(l1).side);
            // gleiches Ergebnis wie der handgeschriebene Weg
            D.setTurn(null);
            const l0 = D.layoutBase(seed), l3 = side === 'S' ? l0 : D.turnLayout(l0, side[0], side[1] === '+');
            if (TN.layHash(D, l3) !== h1) bad.push(sc + '#' + seed + ' ' + side + ': setTurn weicht von turnLayout ab');
            hs.add(h1);
          }
          if (hs.size !== 8) bad.push(sc + '#' + seed + ': nur ' + hs.size + ' verschiedene Raster in 8 Lagen');
          out[sc] = (out[sc] || 0) + 1;
        }
        // Transporter und ein Szenario ohne Schalter: nichts aendert sich
        D.setScenario('truck'); D.setSeedMode('random'); D.setTurn(null); const a = TN.layHash(D, D.layoutFor(7)); D.setTurn('E'); const b = TN.layHash(D, D.layoutFor(7));
        if (a !== b) bad.push('Transporter wurde gedreht');
        D.setTurn(null); D.setScenario('jewel'); const c = TN.layHash(D, D.layoutFor(5)), d = TN.layHash(D, D.layoutFor(5));
        if (c !== d) bad.push('ohne Schalter nicht deterministisch');
        return { bad, out };
      }, { SC, SEEDS });
      t.eq(r.bad, [], 'Abweichungen');
      t.ok(Object.keys(r.out).length === 4, 'alle vier Szenarien geprueft: ' + JSON.stringify(r.out));
    },
  },
  {
    name: 'Gedreht: Schnappschuss der gedrehten Karten (Hash je Szenario und Lage ueber alle Hallen)',
    timeout: 120000,
    async run(t) {
      await t.loadInpage('turn.js');
      const hashes = await t.page.evaluate(({ SC, SEEDS }) => {
        const D = __dbg, seeds = eval(SEEDS), out = {};
        for (const sc of SC) {
          const sl = seeds(sc).concat(7, 13, 101);
          out[sc] = {};
          for (const side of TN.SIDES) {
            D.setScenario(sc); D.setSeedMode('random'); D.setLage([]); D.setTurn(side);
            out[sc][side] = TN.fnv(sl.map(s => TN.layHash(D, D.layoutFor(s))).join(','));
          }
        }
        D.setTurn(null);
        return out;
      }, { SC, SEEDS });
      await t.snapshot('turn-hash', hashes);
    },
  },
  // Coop: je Szenario alle acht Lagen, die Hallen reihum (jede Halle kommt in mehreren Lagen vor), je Partie eine eigene Seite
  ...SC.map(sc => ({
    name: 'Gedreht: Coop zu zweit auf ' + sc + ' in allen acht Lagen (Karte, Items, Strasse, Ebenen, Posten gleich auf Host und Client, Beute durch den Client, Polizei, Fluchtwagen, Sieg)',
    timeout: 240000,
    async run(t) {
      const seeds = await t.page.evaluate(`(${SEEDS})('${sc}')`);
      const res = [];
      for (let i = 0; i < LAGEN.length; i++) res.push(await coopGame(t.env, sc, seeds[i % seeds.length], LAGEN[i]));
      t.note(res.map(r => r.tag.split(' ').pop() + ':' + r.stat.hall + (r.stat.van == null ? ' ohne Wagen' : '')).join(', '));
      t.eq(res.flatMap(r => r.bad.map(b => r.tag + ': ' + b)), [], 'Abweichungen');
    },
  })),
  {
    name: 'Gedreht: Gegenprobe, der Coop-Vergleich schlaegt an, wenn der Host gedreht ist und der Client nicht',
    async run(t) {
      await t.loadTool('loopnet.js'); await t.loadInpage('coop.js'); await t.loadInpage('turn.js');
      const r = await t.page.evaluate(() => {
        const G = CT.mkGame('jewel', 654, 2), A = G.A, B = G.clients[0];
        const gleich = JSON.stringify(A.LANE()) === JSON.stringify(B.LANE()) && CT.diff(CT.sig(A), CT.sig(B)).length === 0;
        const auto = A.turnFor(654, 'jewel'); A.setTurn(auto[0] === 'E' ? 'W+' : 'E'); A.buildLay(A.layoutFor(654));   // der Host in einer anderen Lage als der Seed vorgibt
        return { gleich, lane: JSON.stringify(A.LANE()) !== JSON.stringify(B.LANE()), diff: CT.diff(CT.sig(A), CT.sig(B)) };
      });
      t.ok(r.gleich, 'ohne Drehung sind beide gleich');
      t.ok(r.lane && r.diff.includes('map'), 'mit gedrehtem Host fallen Strasse und Raster auf: ' + JSON.stringify(r));
    },
  },
  {
    name: 'Gedreht: der Bot mit fruehem Rufen gewinnt in jeder Lage (je Szenario und Lage vier Seeds, ohne Haenger und ohne fruehe Verluste)',
    open: { det: true },
    timeout: 280000,
    async run(t) {
      await t.loadTool('bot.js');
      const r = await t.page.evaluate(({ SC, LAGEN }) => {
        const D = __dbg, out = {}, OPT = { jewel: {}, gas: {}, museum: { goods: true, goodsN: 2 }, casino: {} };
        for (const sc of SC) {
          D.setScenario(sc); D.setSeedMode('random'); D.setLage([]);
          for (const side of LAGEN) {
            let w = 0, to = 0, early = 0;
            for (let i = 0; i < 4; i++) { const q = bot.run(Object.assign({ sigma: .05, react: .35, kit: 'old', call: 0, van: 'alt', seed: 5000 + i, turn: side }, OPT[sc])); if (q.res === 'WIN') w++; else { if (q.res === 'TIMEOUT') to++; if (q.t < 30) early++; } }
            out[sc + ' ' + side] = { w, to, early };
          }
        }
        D.setTurn(null);
        return out;
      }, { SC, LAGEN });
      // Pro Lage mindestens ein Sieg ohne Haenger und fruehen Verlust, je Szenario ueber alle acht Lagen eine Mindestzahl (Messwerte am 22. Oktober 2026 mit n = 40 je Lage: Juwelier 55 bis 93 %, Tankstelle 98 bis 100 %, Museum 75 bis 100 %, Casino 100 %)
      const MIN = { jewel: 12, gas: 28, museum: 20, casino: 28 }, sum = {};
      t.note(Object.entries(r).map(([k, v]) => k + ' ' + v.w + '/4').join(', '));
      for (const [k, v] of Object.entries(r)) { sum[k.split(' ')[0]] = (sum[k.split(' ')[0]] || 0) + v.w; t.ok(v.to === 0 && v.early === 0 && v.w >= 1, k + ': ' + v.w + ' von 4 Siegen (mindestens 1), ' + v.to + ' Haenger, ' + v.early + ' fruehe Verluste'); }
      for (const sc of SC) t.ok(sum[sc] >= MIN[sc], sc + ': ' + sum[sc] + ' Siege in 32 Laeufen (mindestens ' + MIN[sc] + ')');
    },
  },
];
