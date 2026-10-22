// Langlauf fuer den Tankstellen-Generator (Plan Mehr Abwechslung, Sprint 6): npm run test:long. Zusaetzlich zu 90-gedrehte-karten (das die Tankstelle mit Generator in allen acht Lagen prueft):
//   1 3000 Seeds auf der Basis: validateMap ohne Fehler und Warnungen, die Bauregeln relativ zur Huelle, kaum Rueckfall, hoechstens 5 Versuche, jede Kombination aus Breite und Tiefe kommt vor
//   2 voller Aufbau und mapcheck.check fuer 400 Seeds
//   3 Bot mit fruehem Rufen auf 450 Karten (neun Gruppen nach Breite und Tiefe): keine Haenger, hoechstens 3 fruehe Verluste, Quote je Gruppe mindestens 85 %, dazu zur Information der gierige Lauf (goods)
//   4 Coop zu zweit auf 20 generierten Karten (verschiedene Breite, Tiefe, Zapfsaeulenzahl)
const { coopGame } = require('../lib');

module.exports = [
  {
    name: 'Lang: Tankstellen-Generator: 3000 Seeds auf der Basis (validateMap ohne Fehler und Warnungen, Bauregeln, Versuche, jede Kombination aus Breite und Tiefe)',
    timeout: 290000,
    async run(t) {
      const r = await t.page.evaluate(() => {
        const D = __dbg, bad = [], combos = {}, tries = {}; let n = 0, classic = 0, minPump = 99, minRoute = 99;
        D.setScenario('gas'); D.setSeedMode('random'); D.setLage([]); D.setTurn('S');
        for (let s = 1; s <= 3000; s++) {
          const lay = D.layoutBase(s); n++; if (!lay.q) { classic++; continue; }
          const sw = lay.q.sw, fd = 1 + Math.floor((sw - 2) / 2), wall = lay.bld.y1, bot = wall - 1, tag = '#' + s + ' ' + JSON.stringify(lay.q);
          combos[sw + 'x' + lay.q.sd] = 1; tries[lay.tries] = (tries[lay.tries] || 0) + 1;
          const rep = D.validateMap(lay); if (rep.err.length || rep.warn.length) { if (bad.length < 10) bad.push(tag + ' validateMap ' + rep.err.concat(rep.warn).map(e => e.r + ': ' + e.m).join(' | ')); continue; }
          for (const q of lay.pumps) { const d = Math.min(Math.hypot(q.x - fd, q.y - wall), Math.hypot(q.x - (fd + 1), q.y - wall)); minPump = Math.min(minPump, d); if (d < 3.5 && bad.length < 10) bad.push(tag + ' Saeule ' + q.x + ',' + q.y + ' nur ' + d.toFixed(1)); for (const p of lay.posts) if (Math.hypot(q.x - p.x, q.y - p.y) < D.CFG.val.danger && bad.length < 10) bad.push(tag + ' Posten im Gefahrenradius'); }
          for (const g of lay.guards.concat(lay.mission.extra || [])) for (const p of g.route) { const d = Math.hypot(p[0] - (fd + 1), p[1] - bot); minRoute = Math.min(minRoute, d); if (d < 4.99 && bad.length < 10) bad.push(tag + ' Routenpunkt ' + p + ' nur ' + d.toFixed(1)); }
        }
        return { bad, n, classic, tries, combos: Object.keys(combos).length, minPump: +minPump.toFixed(2), minRoute: +minRoute.toFixed(2) };
      });
      t.note(r.n + ' Karten, Klassik ' + r.classic + ', Versuche ' + JSON.stringify(r.tries) + ', Kombinationen Breite x Tiefe ' + r.combos + ', Saeule zu Tuer ' + r.minPump + ', Route zu Eingang ' + r.minRoute);
      t.eq(r.bad, [], 'Abweichungen');
      t.eq(r.combos, 21, 'jede Kombination aus sieben Breiten und drei Tiefen kommt vor');
      t.ok(r.classic > 150 && r.classic < 450, 'Klassik-Huelle rund 10 % (150 bis 450 von 3000): ' + r.classic);
      t.ok(Math.max(...Object.keys(r.tries).map(Number)) <= 5, 'hoechstens 5 Versuche je Karte');
    },
  },
  {
    name: 'Lang: Tankstellen-Generator: voller Aufbau und mapcheck (Erreichbarkeit aller Beute, Posten, Wagenplaetze, Fluchtzone) fuer 400 Seeds, dazu mit Sicherheitsdienst',
    timeout: 290000,
    async run(t) {
      await t.loadTool('mapcheck.js');
      const r = await t.page.evaluate(() => {
        const D = __dbg, errs = {}; let n = 0; D.setScenario('gas'); D.setSeedMode('random'); D.setLage([]); D.setTurn('S');
        for (const lg of [undefined, ['sicher']]) for (let s = 5000; s < 5200; s++) { const rep = mapcheck.check('gas', s, lg, 'S'); n++; for (const e of rep.err) { const k = e.replace(/[0-9.,-]+/g, '#'); (errs[k] = errs[k] || []).push(s); } }
        D.setTurn(null); D.setLage([]);
        return { n, errs: Object.entries(errs).map(([k, v]) => k + ' (' + v.length + 'x, zuerst ' + v.slice(0, 3).join(' ') + ')') };
      });
      t.note(r.n + ' Karten voll gebaut und geprueft');
      t.eq(r.errs, [], 'mapcheck meldet Fehler');
    },
  },
  {
    name: 'Lang: Tankstellen-Generator: Bot mit fruehem Rufen auf 450 Karten (neun Gruppen nach Breite und Tiefe): keine Haenger, hoechstens 3 fruehe Verluste, Quote je Gruppe mindestens 85 %',
    timeout: 290000,
    async run(t) {
      await t.loadTool('bot.js');
      const r = await t.page.evaluate(() => {
        const D = __dbg, out = { tresor: {}, gierig: {} }; D.setScenario('gas'); D.setSeedMode('random'); D.setLage([]); D.setTurn('S');
        const grp = l => !l.q ? 'klassik' : (l.q.sw <= 13 ? 'b12-13' : l.q.sw <= 15 ? 'b14-15' : 'b16-18') + ' t' + l.q.sd;
        const seeds = []; for (let s = 5000; s < 5600 && seeds.length < 450; s++) seeds.push(s);
        for (const [name, opt] of [['tresor', {}], ['gierig', { goods: true }]]) {
          const by = {}; let to = 0, early = 0;
          for (const s of seeds.slice(0, name === 'tresor' ? 450 : 150)) {
            const q = bot.run(Object.assign({ sigma: .05, react: .35, kit: 'old', call: 0, van: 'alt', seed: s, turn: 'S' }, opt)), g = grp(D.LAY()); by[g] = by[g] || [0, 0]; by[g][1]++;
            if (q.res === 'WIN') by[g][0]++; else { if (q.res === 'TIMEOUT') to++; if (q.t < 30) early++; }
          }
          out[name] = { by, to, early };
        }
        D.setTurn(null); return out;
      });
      const fmt = o => Object.entries(o.by).sort().map(([k, v]) => k + ' ' + Math.round(100 * v[0] / v[1]) + ' % (' + v[1] + ')').join(', ');
      t.note('fruehes Rufen: ' + fmt(r.tresor)); t.note('gierig (Information, 150 Karten): ' + fmt(r.gierig));
      const bad = []; if (r.tresor.to) bad.push(r.tresor.to + ' Haenger'); if (r.tresor.early > 3) bad.push(r.tresor.early + ' fruehe Verluste');
      for (const [k, v] of Object.entries(r.tresor.by)) if (v[1] >= 10 && v[0] / v[1] < .85) bad.push(k + ': Quote ' + Math.round(100 * v[0] / v[1]) + ' % (' + v[1] + ' Laeufe)');
      t.eq(bad, [], 'Loesbarkeit');
    },
  },
  {
    name: 'Lang: Tankstellen-Generator: Coop zu zweit auf 20 generierten Karten (verschiedene Breite, Tiefe und Zapfsaeulenzahl, vom Start bis zum Sieg)',
    timeout: 290000,
    async run(t) {
      const seeds = await t.page.evaluate(() => { const D = __dbg, out = [], seen = new Set(); D.setScenario('gas'); D.setSeedMode('random'); D.setLage([]); D.setTurn('S'); for (let s = 1; s < 600 && out.length < 20; s++) { const q = D.layoutBase(s).q; if (!q) continue; const k = q.sw + ':' + q.sd + ':' + q.np; if (!seen.has(k)) { seen.add(k); out.push(s); } } return out; });
      const bad = []; for (const s of seeds) { const r = await coopGame(t.env, 'gas', s); for (const b of r.bad) bad.push(r.tag + ': ' + b); }
      t.note(seeds.length + ' Partien');
      t.eq(bad.slice(0, 10), [], 'Coop (' + bad.length + ' Abweichungen)');
    },
  },
];
