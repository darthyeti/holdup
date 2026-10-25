// Museum als Generator (Sprint 8 des Plans Mehr Abwechslung, docs/offen-und-spieltest.md): Die Huelle kommt aus Parametern (genMuseum, CFG.museumGen): Breite der Westgalerie ww 7 bis 12 (Klassik 9, Galerie x1..ww),
// Zusatzbreite der Ostgalerie ew 9 bis 11 (Klassik 9), Zusatztiefe dy 0 bis 1 (Gebaeude y0..17+dy, die Strasse bleibt fest), Versatz der Haupttuer im Atrium vx -1 bis 1 (Klassik x13 und 14). Die Klassik-Huelle
// (9, 9, 0, 0) ist mit jeder der vier Hallen Zeichen fuer Zeichen die Karte von vorher (Selbsttest 42-museum-basis mit CFG.museumGen.on 0). Die vier Hallen (MU_HALLS) sind Funktionen eines Massobjekts, jede hat
// minWw und minEw, museumLayout wirft Huellen weg, die darunter liegen.
// Die Enge-Pruefung im Test ist eine eigene Fassung (Kachelraster), sie benutzt validateMap nicht: In den beiden Galerien (West x1..ww, Ost x18+dx..26+ox ab Zeile 6) darf es keinen Gang der Breite 1 und der Laenge
// mindestens 3 geben, dessen Seiten Wand, Pfeiler oder Tresen (C # P) sind (Pflanzen und Baenke zaehlen nicht, kurze Nischen neben einer Vitrine auch nicht). Das Atrium ist in allen Huellen derselbe Block und gehoert nicht dazu.
const { coopGame } = require('../lib');
const HELP = `(() => {
  const D = __dbg, B = 'C#P';
  const tubes = (ww, ew, dy) => {
    const w = D.world(), dx = ww - 9, ox = dx + ew - 9, S = 16 + dy, c = (x, y) => w.cell(x, y), fr = (x, y) => !D.isSol(x, y);
    const hn = (x, y) => fr(x, y) && B.includes(c(x - 1, y)) && B.includes(c(x + 1, y)), vn = (x, y) => fr(x, y) && B.includes(c(x, y - 1)) && B.includes(c(x, y + 1));
    let n = 0;
    for (const [x0, x1, y0, y1] of [[1, ww, 1, S], [18 + dx, 26 + ox, 6, S]]) for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      if (y + 2 <= y1 && hn(x, y) && hn(x, y + 1) && hn(x, y + 2)) n++;
      if (x + 2 <= x1 && vn(x, y) && vn(x + 1, y) && vn(x + 2, y)) n++;
    }
    return n;
  };
  return { D, tubes };
})()`;

module.exports = [
  {
    name: 'Museum-Generator: Huelle aus Parametern (alle Werte von ww, ew, dy und vx kommen vor), deterministisch, Klassik rund 10 %, hoechstens 20 Versuche, kein Rueckfall, mindestens 40 verschiedene Huellen in 300 Seeds',
    timeout: 180000,
    async run(t) {
      await t.loadInpage('turn.js'); await t.loadTool('mapcheck.js');
      const r = await t.page.evaluate(() => {
        const D = __dbg, vals = { ww: {}, ew: {}, dy: {}, vx: {} }, tries = {}; let classic = 0, nondet = 0, hall = {};
        D.setScenario('museum'); D.setSeedMode('random'); D.setLage([]); D.setTurn('S');
        for (let s = 1; s <= 1000; s++) {
          const lay = D.layoutBase(s), h1 = s <= 100 ? TN.layHash(D, lay) : null; hall[lay.hall] = (hall[lay.hall] || 0) + 1;
          if (!lay.q) classic++; else { for (const k of ['ww', 'ew', 'dy', 'vx']) vals[k][lay.q[k]] = (vals[k][lay.q[k]] || 0) + 1; tries[lay.tries] = (tries[lay.tries] || 0) + 1; }
          if (h1 != null && h1 !== TN.layHash(D, D.layoutBase(s))) nondet++;
        }
        return { classic, vals, tries, nondet, hall, huellen: mapcheck.variety('museum', 300, 1, 1, 0).huelle };
      });
      t.eq(r.nondet, 0, 'gleiche Seeds, gleiche Karten');
      t.ok(Object.keys(r.vals.ww).length === 6 && Object.keys(r.vals.ew).length === 3 && Object.keys(r.vals.dy).length === 2 && Object.keys(r.vals.vx).length === 3, 'alle Werte kommen vor: ' + JSON.stringify(r.vals));
      t.ok(r.classic >= 60 && r.classic <= 160, 'Klassik-Huelle rund 10 % (CFG.museumGen.classic): ' + r.classic + ' von 1000');
      t.ok(Math.max(...Object.keys(r.tries).map(Number)) <= 20, 'hoechstens 20 Versuche je Karte: ' + JSON.stringify(r.tries));
      t.ok(Object.keys(r.hall).length === 4, 'alle vier Hallen kommen vor: ' + JSON.stringify(r.hall));
      t.ok(r.huellen >= 40, 'mindestens 40 verschiedene Huellen in 300 Seeds auf der Basis: ' + r.huellen);
    },
  },
  {
    name: 'Museum-Generator: CFG.museumGen schaltet ab (on 0) und regelt die Klassik (classic 1 gleich aus, 0 fast nie), die Klassik-Huelle ist mit jedem Generator-Stand dieselbe Karte',
    timeout: 120000,
    async run(t) {
      await t.loadInpage('turn.js');
      const r = await t.page.evaluate(() => {
        const D = __dbg, G = D.CFG.museumGen, out = {}; D.setScenario('museum'); D.setSeedMode('random'); D.setLage([]); D.setTurn('S');
        const hs = () => { const a = []; for (let s = 1; s <= 100; s++) a.push(TN.layHash(D, D.layoutBase(s))); return a.join(','); };
        const cnt = () => { let c = 0; for (let s = 1; s <= 300; s++) if (!D.layoutBase(s).q) c++; return c; };
        const on = G.on, cl = G.classic;
        G.on = 0; const aus = hs(); out.ausClassik = cnt(); G.on = 1; G.classic = 1; const eins = hs(); out.einsClassik = cnt(); G.classic = 0; out.nullClassik = cnt(); G.classic = cl; G.on = on;
        out.gleich = aus === eins;
        return out;
      });
      t.eq([r.ausClassik, r.einsClassik], [300, 300], 'on 0 und classic 1 geben nur die Klassik-Huelle');
      t.ok(r.gleich, 'classic 1 ist Zeichen fuer Zeichen gleich dem abgeschalteten Generator');
      t.ok(r.nullClassik <= 6, 'classic 0: die Klassik-Huelle kommt fast nie vor (nur zufaellig gleiche Parameter): ' + r.nullClassik + ' von 300');
    },
  },
  {
    name: 'Museum eng: alle Kombinationen aus vier Hallen, ww 7 bis 12, ew 9 bis 11, dy 0 bis 1 und vx -1 bis 1 (432): was minWw und minEw zulassen, hat keinen Gang der Breite 1 und Laenge 3 in den Galerien und besteht validateMap, minWw und minEw sind nicht hoeher als noetig',
    timeout: 280000,
    async run(t) {
      await t.loadInpage('turn.js');
      const r = await t.page.evaluate(`(() => { const H = ${HELP}, D = H.D, out = { halls: D.MU_HALLS.map(h => [h.n, h.minWw, h.minEw]), rows: [] };
        D.setScenario('museum'); D.setSeedMode('random'); D.setLage([]); D.setTurn('S');
        for (let i = 0; i < D.MU_HALLS.length; i++) for (let ww = 7; ww <= 12; ww++) for (let ew = 9; ew <= 11; ew++) for (let dy = 0; dy <= 1; dy++) for (let vx = -1; vx <= 1; vx++) {
          const lay = D.finishLay(D.genMuseum(777, { ww, ew, dy, vx, classic: false, hall: i })), rep = D.validateMap(lay);
          out.rows.push({ i, hall: lay.hall, ww, ew, dy, vx, tubes: H.tubes(ww, ew, dy), err: rep.err.map(e => e.r), warn: rep.warn.map(e => e.r) });
        }
        return out; })()`);
      t.ok(r.halls.every(h => typeof h[1] === 'number' && typeof h[2] === 'number'), 'jede Halle hat minWw und minEw: ' + JSON.stringify(r.halls));
      t.eq(r.rows.filter(q => q.hall !== r.halls[q.i][0]).length, 0, 'P.hall erzwingt die Halle');
      const min = {}; r.halls.forEach(h => { min[h[0]] = h; });
      const ok = r.rows.filter(q => q.ww >= min[q.hall][1] && q.ew >= min[q.hall][2]);
      const tag = q => q.hall + ' ' + q.ww + '/' + q.ew + '/' + q.dy + ' vx ' + q.vx;
      t.eq(ok.filter(q => q.tubes).map(q => tag(q) + ' ' + q.tubes + ' enge Gaenge'), [], 'jede zugelassene Huelle hat keinen Gang der Breite 1 in den Galerien');
      t.eq(ok.filter(q => q.err.length || q.warn.length).map(q => tag(q) + ' ' + q.err.concat(q.warn).join(',')), [], 'jede zugelassene Huelle besteht validateMap ohne Fehler und Warnungen');
      const zuHoch = r.halls.filter(h => h[1] > 7 || h[2] > 9).filter(h => !r.rows.some(q => q.hall === h[0] && (q.ww < h[1] || q.ew < h[2]) && (q.err.length || q.tubes))).map(h => h[0]);
      t.eq(zuHoch, [], 'minWw und minEw sind nicht hoeher als noetig (unterhalb gibt es wirklich eine zu enge oder ungueltige Huelle)');
      t.note('zu eng oder ungueltig je Halle (von 108): ' + r.halls.map(h => h[0] + ' ' + r.rows.filter(q => q.hall === h[0] && (q.err.length || q.tubes)).length).join(', '));
    },
  },
  {
    name: 'Museum eng: validateMap meldet gang-breite fuer eine Halle mit einem Gang der Breite 1 in der Westgalerie (Probehalle mit Trennwand an der Westwand), nicht fuer eine breite und nicht fuer die Klassik-Huelle (ohne q)',
    timeout: 120000,
    async run(t) {
      const r = await t.page.evaluate(`(() => { const H = ${HELP}, D = H.D, out = {};
        D.setScenario('museum'); D.setSeedMode('random'); D.setLage([]); D.setTurn('S');
        const rule = P => { const lay = D.finishLay(D.genMuseum(777, P)); return { err: D.validateMap(lay).err.map(e => e.r), q: !!lay.q, tubes: H.tubes(P.ww, P.ew, P.dy) }; };
        // Probehalle: eine Trennwand in Spalte 2 von Zeile 3 bis 10, links davon bleibt Spalte 1 als Schlauch zwischen Westwand und Trennwand
        const base = D.MU_HALLS[0];
        D.MU_HALLS.push({ n: 'Probe', minWw: 7, minEw: 9, mk: c => { const m = base.mk(c); return Object.assign({}, m, { part: [[2, 3, 1, 8]] }); } });
        try { out.eng = rule({ ww: 9, ew: 9, dy: 0, vx: 0, classic: false, hall: D.MU_HALLS.length - 1 }); } finally { D.MU_HALLS.pop(); }
        out.breit = rule({ ww: 12, ew: 11, dy: 1, vx: 0, classic: false, hall: 0 });
        out.klassik = rule({ ww: 9, ew: 9, dy: 0, vx: 0, classic: true, hall: 1 });
        return out; })()`);
      t.ok(r.eng.q && r.eng.tubes > 0 && r.eng.err.includes('gang-breite'), 'Probehalle: die eigene Pruefung sieht den Schlauch, validateMap meldet gang-breite: ' + JSON.stringify(r.eng));
      t.ok(r.breit.q && !r.breit.tubes && !r.breit.err.includes('gang-breite'), 'breite Huelle meldet keine gang-breite: ' + JSON.stringify(r.breit));
      t.ok(!r.klassik.q && !r.klassik.err.includes('gang-breite'), 'die Klassik-Huelle ist ausgenommen: ' + JSON.stringify(r.klassik));
    },
  },
  {
    name: 'Museum-Generator: Wachwechsel-Wachmann beginnt nicht an der Haupttuer, die freie Flaeche von Westgalerie und Atrium bleibt gross genug fuer drei Wachen (kleinste Huelle)',
    timeout: 240000,
    async run(t) {
      const r = await t.page.evaluate(() => { const D = __dbg, out = { n: 0, wache: 0, tuer: [], kleinste: 999, drei: 0 };
        D.setScenario('museum'); D.setSeedMode('random'); D.setLage([]); D.setTurn('S');
        for (let s = 1; s <= 700; s++) { const lay = D.layoutBase(s); if (!lay.q) continue; out.n++; const q = lay.q, dx = q.ww - 9; let fr = 0;
          for (let y = 1; y <= 16 + q.dy; y++) for (let x = 1; x <= 16 + dx; x++) if (!D.isSol(x, y) && x !== 10 + dx) fr++;
          out.kleinste = Math.min(out.kleinste, fr); if (lay.guards.length === 3) out.drei++;
          const w = (lay.mission.extra || []).find(e => /Wachwechsel/.test(e.msg || '')); if (w) { out.wache++; const dd = 13 + dx + q.vx; if (w.p[1] >= 16 + q.dy && (w.p[0] === dd || w.p[0] === dd + 1)) out.tuer.push(s + ' ' + w.p); } }
        return out; });
      t.ok(r.wache > 5, 'der Wachwechsel kommt in mehreren Karten vor: ' + r.wache);
      t.eq(r.tuer, [], 'der Wachwechsel-Wachmann beginnt nicht an der Haupttuer');
      t.ok(r.kleinste >= 120, 'auch die kleinste Huelle hat genug freie Flaeche in Westgalerie und Atrium (mindestens 120 Kacheln): ' + r.kleinste);
      t.note('kleinste freie Flaeche von Westgalerie und Atrium einer erzeugten Huelle: ' + r.kleinste + ' Kacheln, ' + r.drei + ' von ' + r.n + ' Karten mit drei Wachen');
    },
  },
  {
    name: 'Museum-Generator: Bauregeln relativ zur Huelle in 400 generierten Karten (validateMap ohne Fehler und Warnungen, Gebaeudekasten, Haupttuer, Fluchttuer, Fluchtweg, Beute, Tresor, Laser, Posten und Wagenplaetze abgeleitet)',
    timeout: 180000,
    async run(t) {
      await t.loadInpage('turn.js');
      const r = await t.page.evaluate(() => {
        const D = __dbg, bad = []; let n = 0, slotsMin = 99;
        D.setScenario('museum'); D.setSeedMode('random'); D.setLage([]); D.setTurn('S');
        for (let s = 1; s <= 700 && n < 400; s++) {
          const lay = D.layoutBase(s); if (!lay.q) continue; n++;
          const q = lay.q, dx = q.ww - 9, ox = dx + q.ew - 9, dd = 13 + dx + q.vx, Y1 = 17 + q.dy, tag = 'museum#' + s + ' ' + lay.hall + ' ' + JSON.stringify(q);
          if (lay.bld.x1 !== 27 + ox || lay.bld.y1 !== Y1) bad.push(tag + ' Gebaeudekasten ' + JSON.stringify(lay.bld));
          const rep = D.validateMap(lay); if (rep.err.length || rep.warn.length) bad.push(tag + ' validateMap ' + rep.err.concat(rep.warn).map(e => e.r + ': ' + e.m).join(' | '));
          const w = D.world(), cell = (x, y) => w.cell(x, y);
          if (cell(dd, Y1) !== 'D' || cell(dd + 1, Y1) !== 'D') bad.push(tag + ' Haupttuer fehlt bei ' + dd);
          const ex = lay.spots.filter(z => z.ex); if (ex.length !== 1 || ex[0].side !== 'E' || ex[0].cells.map(c => c.join()).join(';') !== (27 + ox) + ',8;' + (27 + ox) + ',9') bad.push(tag + ' Fluchttuer ' + JSON.stringify(ex.map(z => z.cells)));
          if (lay.exit.tx !== 28 + ox || lay.van.stop !== (28 + ox) * 32) bad.push(tag + ' Fluchtzone/Wagenhalt ' + lay.exit.tx + ' ' + lay.van.stop);
          for (const y of [8, 9]) for (let x = 18 + dx; x <= 26 + ox; x++) if (D.isSol(x, y)) bad.push(tag + ' Fluchtweg blockiert bei ' + x + ',' + y);
          const kinds = {}; lay.goods.forEach(v => { kinds[v.k] = (kinds[v.k] || 0) + 1; });
          if (kinds.art !== 4 || kinds.statue !== 1 || kinds.relic !== 4) bad.push(tag + ' Beute ' + JSON.stringify(kinds));
          if (JSON.stringify(lay.vault) !== JSON.stringify({ door: [21 + dx, 2], pad: [20 + dx, 4], dir: 1, bundles: [[23 + dx, 2], [25 + dx, 3]] })) bad.push(tag + ' Tresor ' + JSON.stringify(lay.vault));
          if (JSON.stringify(lay.lasers) !== JSON.stringify([[17.5 + dx, 7.9, 17.5 + dx, 11.1], [18 + dx, 5.5, 21 + dx, 5.5]])) bad.push(tag + ' Laser ' + JSON.stringify(lay.lasers));
          const sl = D.laneOf(lay).slots.length; slotsMin = Math.min(slotsMin, sl);
          if (lay.posts.length < 10 || sl < 5) bad.push(tag + ' ' + lay.posts.length + ' Posten, ' + sl + ' Wagenplaetze');
          for (const g of lay.guards.concat(lay.mission.extra || [])) for (const p of g.route) if (D.isSol(p[0], p[1])) bad.push(tag + ' Routenpunkt ' + p + ' in Festem');
        }
        return { bad: bad.slice(0, 10), nbad: bad.length, n, slotsMin };
      });
      t.note(r.n + ' Karten, wenigste Wagenplaetze ' + r.slotsMin);
      t.eq(r.bad, [], 'Abweichungen (' + r.nbad + ')');
      t.ok(r.n === 400, 'genug generierte Karten: ' + r.n);
    },
  },
  {
    name: 'Museum-Generator: Coop zu zweit auf generierten Karten (vier Seeds mit verschiedener Breite und Tiefe, Host und Client bauen gleich, vom Start bis zum Sieg)',
    timeout: 280000,
    async run(t) {
      const seeds = await t.page.evaluate(() => { const D = __dbg, out = [], seen = new Set(); D.setScenario('museum'); D.setSeedMode('random'); D.setLage([]); D.setTurn('S'); for (let s = 1; s < 400 && out.length < 4; s++) { const q = D.layoutBase(s).q; if (!q) continue; const k = (q.ww >= 10 ? 'b' : 'k') + q.dy; if (!seen.has(k)) { seen.add(k); out.push(s); } } return out; });
      const res = []; for (const s of seeds) res.push(await coopGame(t.env, 'museum', s));
      t.note(res.map(r => r.tag + ' ' + r.stat.hall).join(', '));
      t.eq(res.flatMap(r => r.bad.map(b => r.tag + ': ' + b)), [], 'Abweichungen');
    },
  },
  {
    name: 'Museum-Generator: der Bot mit fruehem Rufen loest generierte Karten (40 Seeds, kein Haenger, kein frueher Verlust, mindestens 26 Siege)',
    open: { det: true },
    timeout: 290000,
    async run(t) {
      await t.loadTool('bot.js');
      const r = await t.page.evaluate(() => {
        const D = __dbg; D.setScenario('museum'); D.setSeedMode('random'); D.setLage([]); D.setTurn('S');
        let w = 0, to = 0, early = 0, n = 0; for (let s = 5000; s < 5200 && n < 40; s++) { const l = D.layoutBase(s); if (!l.q) continue; n++; const q = bot.run({ sigma: .05, react: .35, kit: 'old', call: 0, van: 'alt', seed: s, turn: 'S', goods: true, goodsN: 2 }); if (q.res === 'WIN') w++; else { if (q.res === 'TIMEOUT') to++; if (q.t < 30) early++; } }
        D.setTurn(null); return { w, n, to, early };
      });
      t.note(r.w + ' von ' + r.n + ' Siegen');
      t.ok(r.n === 40 && r.to === 0 && r.early === 0 && r.w >= 26, r.w + ' von ' + r.n + ' Siegen (mindestens 26), ' + r.to + ' Haenger, ' + r.early + ' fruehe Verluste');
    },
  },
];
