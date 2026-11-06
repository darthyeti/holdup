// Langlauf fuer den Treffpunkt der Bank (Plan Mehr Abwechslung, Sprint 5): npm run test:long. Die vier Varianten sind Ost und West (Treffpunkt), jeweils mit und ohne Spiegelung (flip), Abnahme wie bei den gedrehten Karten:
//   1 validateMap ohne Fehler und Warnungen ueber 3000 Seeds (jede Variante mindestens 500 mal), ohne Rueckfall auf die Klassik
//   2 voller Aufbau und mapcheck.check fuer 400 Seeds
//   3 Bot mit fruehem Rufen (100 Seeds je Variante: keine Haenger, hoechstens 3 fruehe Verluste, Quote mindestens 90 %, gemessen 100 %)
//   4 Coop zu zweit ueber die Test-Leitung (6 Seeds je Variante, vom Start bis zum Sieg)
const { coopGame } = require('../lib');
const BY = `(D, from, to, per) => { const by = {}; for (let s = from; s < to; s++) { const l = D.layoutFor(s), k = ((l.q && l.q.tp) || 'E') + (l.flip ? 'f' : ''); (by[k] = by[k] || []).length < per && by[k].push(s); } return by; }`;

module.exports = [
  {
    name: 'Lang: Bank-Treffpunkt: validateMap ohne Fehler und Warnungen ueber 3000 Seeds, jede der vier Varianten mindestens 500 mal, ohne Rueckfall auf die Klassik',
    timeout: 290000,
    async run(t) {
      const r = await t.page.evaluate(() => {
        const D = __dbg, bad = [], cnt = {}, warn = {}; D.setScenario('bank'); D.setSeedMode('random'); D.setLage([]);
        for (let s = 5000; s < 8000; s++) {
          const lay = D.layoutFor(s); if (!lay.q) { bad.push(s + ' Rueckfall'); continue; }
          const k = (lay.q.tp || 'E') + (lay.flip ? 'f' : ''); cnt[k] = (cnt[k] || 0) + 1;
          const rep = D.validateMap(lay); for (const e of rep.err) if (bad.length < 12) bad.push(k + '#' + s + ' ' + e.r + ': ' + e.m); for (const e of rep.warn) warn[e.r] = (warn[e.r] || 0) + 1;
        }
        return { bad, cnt, warn };
      });
      t.note('Varianten ' + JSON.stringify(r.cnt) + ', Warnungen ' + JSON.stringify(r.warn));
      t.eq(r.bad, [], 'validateMap meldet Fehler');
      t.eq(r.warn, {}, 'validateMap meldet Warnungen');
      t.ok(['E', 'Ef', 'W', 'Wf'].every(k => (r.cnt[k] || 0) >= 500), 'jede Variante mindestens 500 mal: ' + JSON.stringify(r.cnt));
    },
  },
  {
    name: 'Lang: Bank-Treffpunkt: voller Aufbau und mapcheck (Erreichbarkeit, Wagenplaetze, Fluchtzone) fuer 400 Seeds',
    timeout: 290000,
    async run(t) {
      await t.loadTool('mapcheck.js');
      const r = await t.page.evaluate(() => {
        const D = __dbg, errs = {}; let n = 0; D.setScenario('bank'); D.setSeedMode('random'); D.setLage([]);
        for (let s = 5000; s < 5400; s++) { const rep = mapcheck.check('bank', s); n++; for (const e of rep.err) { const k = e.replace(/[0-9.,-]+/g, '#'); (errs[k] = errs[k] || []).push(s); } }
        return { n, errs: Object.entries(errs).map(([k, v]) => k + ' (' + v.length + 'x, zuerst ' + v.slice(0, 3).join(' ') + ')') };
      });
      t.note(r.n + ' Karten voll gebaut und geprueft');
      t.eq(r.errs, [], 'mapcheck meldet Fehler');
    },
  },
  {
    name: 'Lang: Bank-Treffpunkt: Bot mit fruehem Rufen in allen vier Varianten (100 Seeds je Variante): keine Haenger, hoechstens 3 fruehe Verluste, Quote mindestens 90 %',
    timeout: 290000,
    async run(t) {
      await t.loadTool('bot.js');
      const r = await t.page.evaluate(({ BY }) => {
        const D = __dbg, by = eval(BY)(D, 5000, 6500, 100), out = {}; D.setScenario('bank'); D.setSeedMode('random'); D.setLage([]);
        for (const [k, list] of Object.entries(by)) { let w = 0, to = 0, early = 0, hp = 0; for (const s of list) { const q = bot.run({ sigma: .05, react: .35, kit: 'old', call: 0, van: 'alt', seed: s }); hp += q.minHp; if (q.res === 'WIN') w++; else { if (q.res === 'TIMEOUT') to++; if (q.t < 30) early++; } } out[k] = { n: list.length, w, to, early, hp: Math.round(hp / list.length) }; }
        return out;
      }, { BY });
      t.note(Object.entries(r).map(([k, v]) => k + ' ' + v.w + ' %, Rest-HP ' + v.hp).join(' | '));
      const bad = []; for (const [k, v] of Object.entries(r)) { if (v.n < 100) bad.push(k + ': nur ' + v.n + ' Seeds'); if (v.to) bad.push(k + ': ' + v.to + ' Haenger'); if (v.early > 3) bad.push(k + ': ' + v.early + ' fruehe Verluste'); if (v.w < 90) bad.push(k + ': Quote ' + v.w + ' %'); }
      t.eq(bad, [], 'Loesbarkeit'); t.ok(Object.keys(r).length === 4, 'alle vier Varianten');
    },
  },
  {
    name: 'Lang: Bank-Treffpunkt: Coop zu zweit mit je 6 Seeds in jeder der vier Varianten (24 Partien, vom Start bis zum Sieg)',
    timeout: 290000,
    async run(t) {
      const by = await t.page.evaluate(`(() => { const D = __dbg; D.setScenario('bank'); D.setSeedMode('random'); D.setLage([]); return (${BY})(D, 5000, 5600, 6); })()`);
      const bad = []; let n = 0;
      for (const [k, list] of Object.entries(by)) for (const s of list) { const r = await coopGame(t.env, 'bank', s); n++; for (const b of r.bad) bad.push(k + ' ' + r.tag + ': ' + b); }
      t.note(n + ' Partien');
      t.eq(bad.slice(0, 10), [], 'Coop (' + bad.length + ' Abweichungen)');
    },
  },
];
