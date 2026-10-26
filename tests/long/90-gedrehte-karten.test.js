// Langlauf fuer die gedrehten Karten (Plan Mehr Abwechslung, Sprint 3): npm run test:long, mehrere Minuten, gehoert nicht zu npm test.
// Abnahme der Leitlinie in docs/archiv-gebaute-plaene.md fuer Stufe 1 (Drehen und Spiegeln der handgebauten Karten): Korrektheit ueber viele Seeds in jeder der acht Lagen mit jeder Halle.
//   1 validateMap ohne Fehler (1000 Seeds je Szenario und Lage, ohne Aufbau), jede Halle in jeder Lage, Determinismus
//   2 voller Aufbau und mapcheck.check (Erreichbarkeit, Wagenplaetze, Fluchtzone) fuer 100 Seeds je Szenario und Lage
//   3 Bot mit fruehem Rufen (Loesbarkeit: keine Haenger, hoechstens 3 fruehe Verluste, in jeder Halle und Lage mindestens ein Sieg, weite Mindestquoten je Lage)
//   4 Coop zu zweit ueber die Test-Leitung fuer jede Halle in jeder Lage (je Halle zwei Seeds)
// Seit Sprint 4 (Lage aus dem Seed) kommen dazu, je Szenario ohne Schalter (so, wie der Spieler die Karten bekommt):
//   5 layoutFor aus dem Seed: validateMap ohne Fehler ueber 3000 Seeds, jede Halle in jeder Lage
//   6 Bot mit fruehem Rufen auf 300 Karten aus dem Seed (keine Haenger, wenige fruehe Verluste, Mindestquote)
const { coopGame } = require('../lib');
const SC = ['jewel', 'gas', 'museum', 'casino'];
const LAGEN = ['S', 'N', 'E', 'W', 'S+', 'N+', 'E+', 'W+'];
const SEEDS = `(sc, per) => { const D = __dbg; D.setScenario(sc); D.setSeedMode('random'); D.setLage([]); const got = {}; for (let s = 1; s < 4000; s++) { const h = D.layoutFor(s).hall; (got[h] = got[h] || []).length < per && got[h].push(s) } return got; }`;
// Mindestquoten des Bots je Lage (weit unter den Messwerten vom 22. Oktober 2026, n = 40: Juwelier 55 bis 93 %, Tankstelle 98 bis 100 %, Museum 75 bis 100 %, Casino 100 %): Loesbarkeit, keine Balance
const MINWIN = { jewel: .35, gas: .85, museum: .6, casino: .85 };
const BOTOPT = { jewel: {}, gas: {}, museum: { goods: true, goodsN: 2 }, casino: {} };

const tests = [];
for (const sc of SC) {
  tests.push({
    name: 'Lang: ' + sc + ': validateMap ohne Fehler (1000 Seeds in jeder der acht Lagen), jede Halle in jeder Lage, gleiche Seeds geben gleiche Karten',
    timeout: 290000,
    async run(t) {
      await t.loadInpage('turn.js');
      const r = await t.page.evaluate(({ sc, LAGEN }) => {
        const D = __dbg, bad = [], warn = {}, halls = {}; let n = 0, nondet = 0;
        D.setScenario(sc); D.setSeedMode('random'); D.setLage([]);
        for (const side of LAGEN) {
          D.setTurn(side);
          for (let seed = 1; seed <= 1000; seed++) {
            const lay = D.layoutFor(seed), h1 = seed % 10 === 0 ? TN.layHash(D, lay) : null, rep = D.validateMap(lay); n++;   // der Hash vor validateMap, das Pruefen traegt lay.spots ein
            const h = (lay.hall || '-') + ' ' + side; halls[h] = (halls[h] || 0) + 1;
            for (const e of rep.err) if (bad.length < 20) bad.push(side + ' #' + seed + ' ' + e.r + ': ' + e.m);
            for (const w of rep.warn) warn[w.r] = (warn[w.r] || 0) + 1;
            if (h1 != null && h1 !== TN.layHash(D, D.layoutFor(seed))) nondet++;
          }
        }
        D.setTurn(null);
        return { n, bad, warn, halls, nondet };
      }, { sc, LAGEN });
      t.note(r.n + ' Karten geprueft, Warnungen: ' + JSON.stringify(r.warn) + ', Karten je Halle und Lage mindestens ' + Math.min(...Object.values(r.halls)));
      t.eq(r.bad, [], 'validateMap meldet Fehler');
      t.eq(r.nondet, 0, 'Karten mit gleichem Seed sind nicht gleich');
      const hs = new Set(Object.keys(r.halls).map(k => k.split(' ')[0])); t.ok(hs.size >= 4 && Object.keys(r.halls).length === hs.size * 8, 'jede Halle kommt in jeder Lage vor: ' + JSON.stringify(r.halls));
    },
  });
  tests.push({
    name: 'Lang: ' + sc + ': voller Aufbau und mapcheck (Erreichbarkeit, Wagenplaetze, Fluchtzone) fuer 100 Seeds in jeder der acht Lagen',
    timeout: 290000,
    async run(t) {
      await t.loadTool('mapcheck.js');
      const r = await t.page.evaluate(({ sc, LAGEN }) => {
        const D = __dbg, errs = {}; let n = 0;
        D.setScenario(sc); D.setSeedMode('random'); D.setLage([]);
        for (const side of LAGEN) for (let i = 0; i < 100; i++) {
          const seed = 1 + i * 7, rep = mapcheck.check(sc, seed, undefined, side); n++;
          for (const e of rep.err) { const k = e.replace(/[0-9.,-]+/g, '#'); (errs[k] = errs[k] || []).push(side + '#' + seed); }
        }
        return { n, errs: Object.entries(errs).map(([k, v]) => k + ' (' + v.length + 'x, zuerst ' + v.slice(0, 3).join(' ') + ')') };
      }, { sc, LAGEN });
      t.note(r.n + ' Karten voll gebaut und geprueft');
      t.eq(r.errs, [], 'mapcheck meldet Fehler');
    },
  });
  tests.push({
    name: 'Lang: ' + sc + ': Bot mit fruehem Rufen in jeder Lage (100 Seeds je Lage): keine Haenger, hoechstens 3 fruehe Verluste, in jeder Halle und Lage ein Sieg, Quote mindestens ' + Math.round(MINWIN[sc] * 100) + ' %',
    timeout: 290000,
    async run(t) {
      await t.loadTool('bot.js');
      const r = await t.page.evaluate(({ sc, LAGEN, opt }) => {
        const D = __dbg, out = {};
        D.setScenario(sc); D.setSeedMode('random'); D.setLage([]);
        for (const side of LAGEN) {
          let w = 0, to = 0, early = 0, tt = 0; const halls = {};
          for (let i = 0; i < 100; i++) {
            const q = bot.run(Object.assign({ sigma: .05, react: .35, kit: 'old', call: 0, van: 'alt', seed: 5000 + i, turn: side }, opt)), h = D.LAY().hall || '-';
            halls[h] = halls[h] || [0, 0]; halls[h][1]++;
            if (q.res === 'WIN') { w++; tt += q.t; halls[h][0]++; } else { if (q.res === 'TIMEOUT') to++; if (q.t < 30) early++; }
          }
          out[side] = { w, to, early, t: w ? Math.round(tt / w) : 0, halls };
        }
        D.setTurn(null);
        return out;
      }, { sc, LAGEN, opt: BOTOPT[sc] });
      t.note(Object.entries(r).map(([k, v]) => k + ' ' + v.w + ' %, ' + v.t + ' s').join(' | '));
      const bad = [];
      for (const [side, v] of Object.entries(r)) {
        if (v.to) bad.push(side + ': ' + v.to + ' Haenger (Zeitueberschreitung)');
        if (v.early > 3) bad.push(side + ': ' + v.early + ' fruehe Verluste unter 30 s (hoechstens 3 in 100 Laeufen, einzelne Ausreisser hat der Bot auch ungedreht, zum Beispiel Casino Staffel Seed 5008: 7 von 60 in S, 0 von 60 in E)');
        if (v.w < MINWIN[sc] * 100) bad.push(side + ': Quote ' + v.w + ' % unter ' + MINWIN[sc] * 100 + ' %');
        for (const [h, a] of Object.entries(v.halls)) if (!a[0]) bad.push(side + ' ' + h + ': kein Sieg in ' + a[1] + ' Laeufen');
      }
      t.eq(bad, [], 'Loesbarkeit');
    },
  });
  tests.push({
    name: 'Lang: ' + sc + ': Coop zu zweit in jeder Halle und jeder der acht Lagen (je Halle zwei Seeds, vom Start bis zum Sieg)',
    timeout: 290000,
    async run(t) {
      const got = await t.page.evaluate(`(${SEEDS})('${sc}', 2)`);
      const bad = []; let n = 0;
      for (const [hall, seeds] of Object.entries(got)) for (let k = 0; k < seeds.length; k++) for (let i = 0; i < LAGEN.length; i++) {
        const side = LAGEN[i], r = await coopGame(t.env, sc, seeds[k], side); n++;
        for (const b of r.bad) bad.push(r.tag + ' ' + hall + ': ' + b);
      }
      t.note(n + ' Partien');
      t.eq(bad.slice(0, 12), [], 'Coop auf gedrehter Karte (' + bad.length + ' Abweichungen)');
    },
  });
}
for (const sc of SC) {
  tests.push({
    name: 'Lang: ' + sc + ': Karten aus dem Seed ohne Schalter (3000 Seeds): validateMap ohne Fehler, jede Halle in jeder der acht Lagen',
    timeout: 290000,
    async run(t) {
      const r = await t.page.evaluate(({ sc }) => {
        const D = __dbg, bad = [], halls = {}; let n = 0;
        D.setScenario(sc); D.setSeedMode('random'); D.setLage([]); D.setTurn(null);
        for (let seed = 1; seed <= 3000; seed++) {
          const lay = D.layoutFor(seed), want = D.turnFor(seed, sc), rep = D.validateMap(lay); n++;
          const side = D.laneOf(lay).side; if (side !== want[0]) bad.push('#' + seed + ': Strasse an ' + side + ' statt ' + want[0]);
          for (const e of rep.err) if (bad.length < 15) bad.push('#' + seed + ' ' + e.r + ': ' + e.m);
          const k = (lay.hall || '-') + ' ' + want; halls[k] = (halls[k] || 0) + 1;
        }
        return { n, bad, halls };
      }, { sc });
      const hs = new Set(Object.keys(r.halls).map(k => k.split(' ')[0]));
      t.note(r.n + ' Karten, seltenste Halle in einer Lage: ' + Math.min(...Object.values(r.halls)) + ' mal');
      t.eq(r.bad, [], 'Karten aus dem Seed');
      t.ok(Object.keys(r.halls).length === hs.size * 8, 'jede Halle kommt in jeder Lage vor: ' + Object.keys(r.halls).length + ' von ' + hs.size * 8);
    },
  });
  tests.push({
    name: 'Lang: ' + sc + ': Bot mit fruehem Rufen auf 300 Karten aus dem Seed (ohne Schalter): keine Haenger, hoechstens 6 fruehe Verluste, Quote mindestens ' + Math.round(MINWIN[sc] * 100) + ' %',
    timeout: 290000,
    async run(t) {
      await t.loadTool('bot.js');
      const r = await t.page.evaluate(({ sc, opt }) => {
        const D = __dbg, lagen = {}; let w = 0, to = 0, early = 0;
        D.setScenario(sc); D.setSeedMode('random'); D.setLage([]); D.setTurn(null);
        for (let i = 0; i < 300; i++) {
          const seed = 5000 + i, q = bot.run(Object.assign({ sigma: .05, react: .35, kit: 'old', call: 0, van: 'alt', seed }, opt)), k = D.turnFor(seed, sc)[0];
          lagen[k] = lagen[k] || [0, 0]; lagen[k][1]++;
          if (q.res === 'WIN') { w++; lagen[k][0]++; } else { if (q.res === 'TIMEOUT') to++; if (q.t < 30) early++; }
        }
        return { w, to, early, lagen };
      }, { sc, opt: BOTOPT[sc] });
      t.note(Math.round(r.w / 3) + ' % Siege, je Seite: ' + Object.entries(r.lagen).map(([k, v]) => k + ' ' + Math.round(100 * v[0] / v[1]) + ' %').join(', '));
      const bad = [];
      if (r.to) bad.push(r.to + ' Haenger');
      if (r.early > 6) bad.push(r.early + ' fruehe Verluste unter 30 s');
      if (r.w < 3 * MINWIN[sc] * 100) bad.push('Quote ' + Math.round(r.w / 3) + ' %');
      t.eq(bad, [], 'Loesbarkeit');
    },
  });
}
module.exports = tests;
