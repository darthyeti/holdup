// Treffpunkt des Fluchtwagens auf der Bank (Plan Mehr Abwechslung, Sprint 5, docs/archiv-gebaute-plaene.md, Treffpunkt des Fluchtwagens, Stufe 1):
// genLayout wuerfelt je Spielseed zwischen zwei Treffpunkten (CFG.map.tpW): E ist der Lieferanteneingang am Ostho (wie bisher), W die Seitentuer mit eigenem Hof (6 plus CFG.map.tpX Kacheln breit) und Fahrweg.
// Die Anker der Polizei stehen am gewaehlten Treffpunkt (E drei, W CFG.map.anW), die Spiegelung (flip) dreht beides auf die andere Seite. Phase 1 nennt den Weg (Tag "Fluchtweg: Seitentuer").
const { coopGame } = require('../lib');

// Je Variante (E, Ef, W, Wf) die ersten Seeds ab 5000
const SEEDS = `(per) => { const D = __dbg; D.setScenario('bank'); D.setSeedMode('random'); D.setLage([]); const out = {}; for (let s = 5000; s < 5400; s++) { const l = D.layoutFor(s), k = ((l.q && l.q.tp) || 'E') + (l.flip ? 'f' : ''); (out[k] = out[k] || []).length < per && out[k].push(s); } return out; }`;

module.exports = [
  {
    name: 'Treffpunkt: je Spielseed fest gewuerfelt (halb Ost, halb West), deterministisch, ohne Rueckfall auf die Klassik, Ost-Karten unabhaengig vom Westausgang',
    timeout: 120000,
    async run(t) {
      await t.page.evaluate(() => { __dbg.CFG.meet.p = 0; });   // der Treffpunkt abseits (109) ist hier aus: geprueft wird der Treffpunkt der Karte an der Fluchttuer
      await t.loadInpage('turn.js');
      const r = await t.page.evaluate(() => {
        const D = __dbg, bad = [], cnt = { E: 0, W: 0 }, tries = []; D.setScenario('bank'); D.setSeedMode('random'); D.setLage([]);
        const tpOf = l => (l.q && l.q.tp) || 'E', hs = {};
        for (let s = 5000; s < 7000; s++) {
          const l = D.layoutFor(s); if (!l.q) { bad.push(s + ': Rueckfall auf die Klassik'); continue; }
          cnt[tpOf(l)]++; if (s < 5500) tries.push(l.tries); else if (l.tries > 40) bad.push(s + ': ' + l.tries + ' Versuche');
          if (s < 5060) { hs[s] = tpOf(l) + ':' + TN.layHash(D, l); const l2 = D.layoutFor(s); if (TN.layHash(D, l2) !== TN.layHash(D, l)) bad.push(s + ': zwei Aufbauten weichen ab'); }
        }
        // Ost-Karten bleiben, wie sie waren: ohne Westausgang (tpW 0) kommt aus demselben Seed dieselbe Karte
        const tpW = D.CFG.map.tpW; D.CFG.map.tpW = 0;
        for (const [s, v] of Object.entries(hs)) if (v.startsWith('E:')) { const l = D.layoutFor(+s); if (tpOf(l) !== 'E' || 'E:' + TN.layHash(D, l) !== v) bad.push(s + ': Ost-Karte haengt vom Westausgang ab'); }
        // tpW 1: alle West, ohne Rueckfall
        D.CFG.map.tpW = 1; let w = 0; for (let s = 5000; s < 5200; s++) { const l = D.layoutFor(s); if (!l.q) bad.push(s + ': tpW 1 faellt auf die Klassik zurueck'); else if (tpOf(l) === 'W') w++; }
        D.CFG.map.tpW = tpW;
        return { bad: bad.slice(0, 8), cnt, maxTries: Math.max(...tries), w };
      });
      t.eq(r.bad, [], 'Abweichungen');
      t.ok(Math.abs(r.cnt.W - 1000) <= 110, 'halb West (1000 plus minus 110 von 2000): ' + JSON.stringify(r.cnt));
      t.ok(r.maxTries <= 26, 'hoechstens 26 Versuche je Karte in 500 Seeds (Vorbild der Bank): ' + r.maxTries);
      t.eq(r.w, 200, 'mit tpW 1 sind alle 200 Karten West');
    },
  },
  {
    name: 'Treffpunkt: Geometrie in allen vier Varianten (Tuer, Zone, Wagen, Anker, Tag, Fahrweg): validateMap ohne Fehler und Warnungen, Fluchttuer an der Seite des Treffpunkts, Anker am Treffpunkt',
    timeout: 120000,
    async run(t) {
      await t.page.evaluate(() => { __dbg.CFG.meet.p = 0; });   // der Treffpunkt abseits (109) ist hier aus: geprueft wird der Treffpunkt der Karte an der Fluchttuer
      const r = await t.page.evaluate(({ SEEDS }) => {
        const D = __dbg, T = 32, bad = [], seeds = eval(SEEDS)(40), stat = {};
        D.setScenario('bank'); D.setSeedMode('random'); D.setLage([]);
        const C = D.CFG.map;
        for (const [k, list] of Object.entries(seeds)) for (const s of list) {
          const lay = D.layoutFor(s), tp = k[0], flip = k.length > 1, rep = D.validateMap(lay), ln = D.laneOf(lay), tag = k + '#' + s; stat[k] = (stat[k] || 0) + 1;
          if (rep.err.length || rep.warn.length) bad.push(tag + ' validateMap ' + rep.err.concat(rep.warn).map(e => e.r + ': ' + e.m).join(' | '));
          const side = tp === 'E' ? (flip ? 'W' : 'E') : (flip ? 'E' : 'W');
          if (ln.exit.side !== side) bad.push(tag + ' Zone an ' + ln.exit.side + ' statt ' + side);
          if (ln.van.dir !== -ln.exit.dir) bad.push(tag + ' der Wagen faehrt nicht zum Gebaeude hin');
          const ex = lay.spots.filter(q => q.ex); if (ex.length !== 1 || ex[0].side !== side || ex[0].cells.length !== 2) bad.push(tag + ' Fluchttuer: ' + ex.length + ' Stueck, Seite ' + (ex[0] && ex[0].side));
          const other = lay.spots.find(q => q.side === (side === 'E' ? 'W' : 'E') && !q.ex);
          if (tp === 'W' && (!other || other.lk)) bad.push(tag + ' die andere Seitentuer fehlt oder ist verriegelt');
          // Anker: genau am Treffpunkt, Zahl aus CFG
          const an = lay.posts.filter(p => p.anchor), want = tp === 'W' ? C.anW : 3; if (an.length !== want) bad.push(tag + ' ' + an.length + ' Anker statt ' + want);
          const zc = ln.exit.cells, zx = zc.reduce((a, c) => a + c[0], 0) / zc.length, zy = zc.reduce((a, c) => a + c[1], 0) / zc.length;
          for (const p of an) if (Math.hypot(p.x - zx, p.y - zy) > 6) bad.push(tag + ' Anker ' + p.x + ',' + p.y + ' liegt ' + Math.round(Math.hypot(p.x - zx, p.y - zy)) + ' Kacheln von der Zone');
          if (lay.posts.length !== 16) bad.push(tag + ' ' + lay.posts.length + ' Posten');
          // Tag nennt den Weg nur beim Westausgang
          const tg = (lay.mission.tags || []).includes('Fluchtweg: Seitentür'); if (tg !== (tp === 'W')) bad.push(tag + ' Tag Fluchtweg: ' + tg);
          // Wagen faehrt am Zaun an: die Fahrstrecke beginnt am Weltrand dieser Seite, die Luecke im Zaun ist offen
          const w = D.world(), edge = ln.exit.dir > 0 ? w.WX0 + w.W - 1 : w.WX0;   // die Zone liegt auf der Seite, von der der Wagen kommt
          if (!ln.van.rest.some(c => c[0] === edge)) bad.push(tag + ' die Fahrstrecke reicht nicht bis zum Weltrand (Luecke im Zaun)');
          if (rep.info.pathVE != null && tp === 'W' && (rep.info.pathVE < C.bw[0] || rep.info.pathVE > C.bw[1])) bad.push(tag + ' Weg Tresor zu Ausgang ' + rep.info.pathVE + ' ausserhalb ' + C.bw);
        }
        return { bad: bad.slice(0, 10), nbad: bad.length, stat };
      }, { SEEDS });
      t.ok(Object.keys(r.stat).length === 4, 'alle vier Varianten kamen vor: ' + JSON.stringify(r.stat));
      t.eq(r.bad, [], 'Abweichungen (' + r.nbad + ')');
    },
  },
  {
    name: 'Treffpunkt: im Spiel steht die Polizei mit den Ankern am gewaehlten Treffpunkt (Ost und West), nicht am anderen Ausgang',
    timeout: 120000,
    async run(t) {
      await t.page.evaluate(() => { __dbg.CFG.meet.p = 0; });   // der Treffpunkt abseits (109) ist hier aus: geprueft wird der Treffpunkt der Karte an der Fluchttuer
      const r = await t.page.evaluate(({ SEEDS }) => {
        const D = __dbg, T = 32, out = {}; const seeds = eval(SEEDS)(3);
        for (const [k, list] of Object.entries(seeds)) {
          let near = 0, far = 0, n = 0;
          for (const s of list) {
            D.setScenario('bank'); D.setSeedMode('random'); D.setLage([]); D.buildLay(D.layoutFor(s)); const L = D.LAY(), ln = D.LANE();
            L.wb = (L.wb || 0) + 4; D.CFG.policeAt = 1; D.CFG.policeForced = 1; D.CFG.snp.from = 99; D.CFG.pol.hold = 999; D.CFG.pol.anchorHold = 999;
            D.startHeist(false, D.get().me);
            const zc = ln.exit.cells, zx = (zc.reduce((a, c) => a + c[0], 0) / zc.length) * T + 16, zy = (zc.reduce((a, c) => a + c[1], 0) / zc.length) * T + 16;
            for (let i = 0; i < 30 * 70; i++) { if (i === 30 * 25 || i === 30 * 45) D.spawnWave(); const m = D.get().me; m.hp = 1e9; m.x = L.spawn.x; m.y = L.spawn.y; D.update(1 / 30); }
            for (const e of D.get().en) if (['cop', 'swat', 'shield'].includes(e.kind) && e.mode === 'post' && e.post) { n++; if (Math.hypot(e.x - zx, e.y - zy) < 6 * T) near++; else if (e.post.anchor) far++; }
          }
          out[k] = { near, far, n };
        }
        return out;
      }, { SEEDS });
      t.note(JSON.stringify(r));
      for (const [k, v] of Object.entries(r)) { t.ok(v.near >= 3, k + ': mindestens drei Beamte stehen am Treffpunkt (' + v.near + ' von ' + v.n + ' auf Posten)'); t.eq(v.far, 0, k + ': kein Anker-Beamter steht ausserhalb des Treffpunkts'); }
    },
  },
  {
    name: 'Treffpunkt: Coop zu zweit auf Karten aller vier Varianten (Host und Client bauen gleich, Fluchtwagen kommt am richtigen Hof an, Sieg)',
    timeout: 240000,
    async run(t) {
      await t.page.evaluate(() => { __dbg.CFG.meet.p = 0; });   // der Treffpunkt abseits (109) ist hier aus: geprueft wird der Treffpunkt der Karte an der Fluchttuer
      const seeds = await t.page.evaluate(`(${SEEDS})(1)`);
      const res = []; for (const k of ['E', 'Ef', 'W', 'Wf']) res.push(await coopGame(t.env, 'bank', seeds[k][0]));
      t.note(res.map(r => r.tag).join(', '));
      t.eq(res.flatMap(r => r.bad.map(b => r.tag + ': ' + b)), [], 'Abweichungen');
    },
  },
  {
    name: 'Treffpunkt: der Bot mit fruehem Rufen gewinnt in allen vier Varianten (je Variante 20 Seeds, kein Haenger, kein frueher Verlust)',
    slow: true,
    open: { det: true },
    timeout: 280000,
    async run(t) {
      await t.page.evaluate(() => { __dbg.CFG.meet.p = 0; });   // der Treffpunkt abseits (109) ist hier aus: geprueft wird der Treffpunkt der Karte an der Fluchttuer
      await t.loadTool('bot.js');
      const r = await t.page.evaluate(({ SEEDS }) => {
        const D = __dbg, seeds = eval(SEEDS)(20), out = {}; D.setScenario('bank'); D.setSeedMode('random'); D.setLage([]);
        for (const [k, list] of Object.entries(seeds)) { let w = 0, to = 0, early = 0; for (const s of list) { const q = bot.run({ sigma: .05, react: .35, kit: 'old', call: 0, van: 'alt', seed: s }); if (q.res === 'WIN') w++; else { if (q.res === 'TIMEOUT') to++; if (q.t < 30) early++; } } out[k] = { w, n: list.length, to, early }; }
        return out;
      }, { SEEDS });
      t.note(Object.entries(r).map(([k, v]) => k + ' ' + v.w + '/' + v.n).join(', '));
      for (const [k, v] of Object.entries(r)) t.ok(v.n === 20 && v.to === 0 && v.early === 0 && v.w >= 12, k + ': ' + v.w + ' von ' + v.n + ' Siegen (mindestens 12), ' + v.to + ' Haenger, ' + v.early + ' fruehe Verluste');
    },
  },
];
