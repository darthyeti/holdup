// Langlauf fuer den Museums-Generator (Plan Mehr Abwechslung, Sprint 8): npm run test:long. Zusaetzlich zu 90-gedrehte-karten (das das Museum mit Generator in allen acht Lagen prueft):
//   1 3000 Seeds auf der Basis: validateMap ohne Fehler und Warnungen, die Bauregeln relativ zur Huelle, kaum Rueckfall, hoechstens 20 Versuche, jeder Wert von ww, ew, dy und vx und jede Halle kommt vor
//   2 voller Aufbau und mapcheck.check fuer 400 Seeds
//   3 Bot mit fruehem Rufen auf 300 Karten (Gruppen nach ww und dy): keine Haenger, hoechstens 3 fruehe Verluste, Quote je Gruppe mindestens 60 %
//   4 Coop zu zweit auf 20 generierten Karten (verschiedene Breite, Tiefe, Halle)
const { coopGame } = require('../lib');

module.exports = [
  {
    name: 'Lang: Museums-Generator: 3000 Seeds auf der Basis (validateMap ohne Fehler und Warnungen, Bauregeln, Versuche, jeder Parameterwert, jede Halle)',
    timeout: 290000,
    async run(t) {
      const r = await t.page.evaluate(() => {
        const D = __dbg, bad = [], vals = { ww: {}, ew: {}, dy: {}, vx: {} }, tries = {}, halls = {}; let n = 0, classic = 0;
        D.setScenario('museum'); D.setSeedMode('random'); D.setLage([]); D.setTurn('S');
        for (let s = 1; s <= 3000; s++) {
          const lay = D.layoutBase(s); n++; halls[lay.hall] = (halls[lay.hall] || 0) + 1; if (!lay.q) { classic++; continue; }
          const q = lay.q, dx = q.ww - 9, ox = dx + q.ew - 9, tag = '#' + s + ' ' + lay.hall + ' ' + JSON.stringify(q);
          for (const k of ['ww', 'ew', 'dy', 'vx']) vals[k][q[k]] = (vals[k][q[k]] || 0) + 1; tries[lay.tries] = (tries[lay.tries] || 0) + 1;
          const rep = D.validateMap(lay); if (rep.err.length || rep.warn.length) { if (bad.length < 10) bad.push(tag + ' validateMap ' + rep.err.concat(rep.warn).map(e => e.r + ': ' + e.m).join(' | ')); continue; }
          if (lay.bld.x1 !== 27 + ox || lay.bld.y1 !== 17 + q.dy) bad.push(tag + ' Gebaeudekasten');
          for (const y of [8, 9]) for (let x = 18 + dx; x <= 26 + ox; x++) if (D.isSol(x, y) && bad.length < 10) bad.push(tag + ' Fluchtweg blockiert bei ' + x + ',' + y);
          for (const g of lay.guards.concat(lay.mission.extra || [])) for (const p of g.route) if (D.isSol(p[0], p[1]) && bad.length < 10) bad.push(tag + ' Routenpunkt ' + p + ' in Festem');
        }
        return { bad, n, classic, tries, halls, vals: Object.fromEntries(Object.entries(vals).map(([k, v]) => [k, Object.keys(v).length])) };
      });
      t.note(r.n + ' Karten, Klassik ' + r.classic + ', Versuche ' + JSON.stringify(r.tries) + ', Werte ' + JSON.stringify(r.vals) + ', Hallen ' + JSON.stringify(r.halls));
      t.eq(r.bad, [], 'Abweichungen');
      t.eq(r.vals, { ww: 6, ew: 3, dy: 2, vx: 3 }, 'jeder Parameterwert kommt vor');
      t.eq(Object.keys(r.halls).length, 4, 'alle vier Hallen kommen vor');
      t.ok(r.classic > 150 && r.classic < 450, 'Klassik-Huelle rund 10 % (150 bis 450 von 3000): ' + r.classic);
      t.ok(Math.max(...Object.keys(r.tries).map(Number)) <= 20, 'hoechstens 20 Versuche je Karte');
    },
  },
  {
    name: 'Lang: Museums-Generator: voller Aufbau und mapcheck (Erreichbarkeit aller Beute, Posten, Wagenplaetze, Fluchtzone) fuer 400 Seeds, dazu mit Sicherheitsdienst',
    timeout: 290000,
    async run(t) {
      await t.loadTool('mapcheck.js');
      const r = await t.page.evaluate(() => {
        const D = __dbg, errs = {}; let n = 0; D.setScenario('museum'); D.setSeedMode('random'); D.setLage([]); D.setTurn('S');
        for (const lg of [undefined, ['sicher']]) for (let s = 5000; s < 5200; s++) { const rep = mapcheck.check('museum', s, lg, 'S'); n++; for (const e of rep.err) { const k = e.replace(/[0-9.,-]+/g, '#'); (errs[k] = errs[k] || []).push(s); } }
        D.setTurn(null); D.setLage([]);
        return { n, errs: Object.entries(errs).map(([k, v]) => k + ' (' + v.length + 'x, zuerst ' + v.slice(0, 3).join(' ') + ')') };
      });
      t.note(r.n + ' Karten voll gebaut und geprueft');
      t.eq(r.errs, [], 'mapcheck meldet Fehler');
    },
  },
  {
    name: 'Lang: Museums-Generator: Bot mit fruehem Rufen auf 300 Karten (Gruppen nach Breite der Westgalerie und Tiefe): keine Haenger, hoechstens 3 fruehe Verluste, Quote je Gruppe mindestens 60 %',
    timeout: 290000,
    async run(t) {
      await t.loadTool('bot.js');
      const r = await t.page.evaluate(() => {
        const D = __dbg, by = {}; let to = 0, early = 0; D.setScenario('museum'); D.setSeedMode('random'); D.setLage([]); D.setTurn('S');
        const grp = l => !l.q ? 'klassik' : (l.q.ww <= 8 ? 'w7-8' : l.q.ww <= 10 ? 'w9-10' : 'w11-12') + ' d' + l.q.dy;
        for (let s = 5000; s < 5300; s++) {
          const q = bot.run({ sigma: .05, react: .35, kit: 'old', call: 0, van: 'alt', seed: s, turn: 'S', goods: true, goodsN: 2 }), g = grp(D.LAY()); by[g] = by[g] || [0, 0]; by[g][1]++;
          if (q.res === 'WIN') by[g][0]++; else { if (q.res === 'TIMEOUT') to++; if (q.t < 30) early++; }
        }
        D.setTurn(null); return { by, to, early };
      });
      t.note('fruehes Rufen: ' + Object.entries(r.by).sort().map(([k, v]) => k + ' ' + Math.round(100 * v[0] / v[1]) + ' % (' + v[1] + ')').join(', '));
      const bad = []; if (r.to) bad.push(r.to + ' Haenger'); if (r.early > 3) bad.push(r.early + ' fruehe Verluste');
      for (const [k, v] of Object.entries(r.by)) if (v[1] >= 10 && v[0] / v[1] < .6) bad.push(k + ': Quote ' + Math.round(100 * v[0] / v[1]) + ' % (' + v[1] + ' Laeufe)');
      t.eq(bad, [], 'Loesbarkeit');
    },
  },
  {
    name: 'Lang: Museums-Generator: Coop zu zweit auf 20 generierten Karten (verschiedene Breite, Tiefe und Halle, vom Start bis zum Sieg)',
    timeout: 290000,
    async run(t) {
      const seeds = await t.page.evaluate(() => { const D = __dbg, out = [], seen = new Set(); D.setScenario('museum'); D.setSeedMode('random'); D.setLage([]); D.setTurn('S'); for (let s = 1; s < 600 && out.length < 20; s++) { const l = D.layoutBase(s), q = l.q; if (!q) continue; const k = l.hall + (q.ww >= 10 ? 'b' : 'k') + q.dy + (q.ew > 9 ? 'e' : ''); if (!seen.has(k)) { seen.add(k); out.push(s); } } return out; });
      const bad = []; for (const s of seeds) { const r = await coopGame(t.env, 'museum', s); for (const b of r.bad) bad.push(r.tag + ': ' + b); }
      t.note(seeds.length + ' Partien');
      t.eq(bad.slice(0, 10), [], 'Coop (' + bad.length + ' Abweichungen)');
    },
  },
];
