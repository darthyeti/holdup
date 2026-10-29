// Juwelier als Generator (Sprint 7 des Plans Mehr Abwechslung, docs/archiv-gebaute-plaene.md): Die Huelle kommt aus Parametern (genJewel, CFG.jewGen): Hallenbreite hw 11 bis 17 (Klassik 13, Halle x1..hw), Gebaeudetiefe hd 12 bis 15
// (Klassik 12, 12 bis 13 aus den alten Wuerfen, dazu CFG.jewGen.deep seit dem 29. Oktober 2026, ab 14 rueckt die Strasse mit), Versatz der Vordertuer vx 0 bis 2 (nach links). Die Klassik-Huelle (13, 12, 0) ist mit jeder der fuenf Hallen Zeichen fuer Zeichen die Karte von vorher (Selbsttest
// 39-juwelier-basis mit CFG.jewGen.on 0). Die fuenf Hallen (JW_HALLS) sind Funktionen von hw, hd und der Tuer; jede hat minHw und minHd, jewLayout wirft Huellen weg, die darunter liegen.
// Die Breitenpruefung im Test ist eine eigene Fassung (Kachelraster, isSol), sie benutzt validateMap nicht: Ein 2x2-Block muss von der Vordertuer (unterste Zeile, ueberlappt die Tuerkacheln) bis vor das Tresentor
// (Block links oben (21+dx, 10)) ueber freie Kacheln rutschen koennen.
const { coopGame } = require('../lib');
const HELP = `(() => {
  const D = __dbg;
  const wide = (hw, hd, vx) => {
    const dx = hw - 13, vd = hw - 2 - vx, free = (x, y) => !D.isSol(x, y), ok = (x, y) => x >= 1 && y >= 1 && x + 1 <= hw && y + 1 <= hd && free(x, y) && free(x + 1, y) && free(x, y + 1) && free(x + 1, y + 1);
    const okR = (x, y) => x >= 1 && y >= 1 && x + 1 <= 22 + dx && y + 1 <= hd && free(x, y) && free(x + 1, y) && free(x, y + 1) && free(x + 1, y + 1);
    const q = [], seen = new Set(); for (let x = vd - 1; x <= vd + 1; x++) if (ok(x, hd - 1)) { q.push([x, hd - 1]); seen.add(x + ',' + (hd - 1)); }
    for (let h = 0; h < q.length; h++) { const c = q[h]; if (c[0] === 21 + dx && c[1] === 10) return true; for (const d of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const n = [c[0] + d[0], c[1] + d[1]], k = n.join(); if (seen.has(k) || !okR(n[0], n[1])) continue; seen.add(k); q.push(n); } }
    return false;
  };
  // narrow(hw, hd): freie Laeufe der Breite 1 zwischen zwei Vitrinen, Trennwaenden oder Saeulen in den Zeilen 3 bis hd-4 der Halle (die Zeile hd-3 gehoert dem Durchgang des Rings, der Kopf des Rings ist von Hand nur eine Kachel breit) (Pflanzen und Baenke zaehlen nicht, die Randkacheln an den Waenden auch nicht)
  const narrow = (hw, hd) => { const w = D.world(); let n = 0; for (let y = 3; y <= hd - 4; y++) { let x = 2; while (x <= hw - 1) { if (!D.isSol(x, y)) { const a = x; while (x <= hw && !D.isSol(x, y)) x++; const b = x - 1; if (b - a === 0 && a - 1 >= 1 && b + 1 <= hw && 'C#P'.includes(w.cell(a - 1, y)) && 'C#P'.includes(w.cell(b + 1, y))) n++; } else x++; } } return n; };
  return { D, wide, narrow };
})()`;

module.exports = [
  {
    name: 'Juwelier-Generator: Huelle aus Parametern (alle Werte von hw, hd und vx kommen vor), deterministisch, Klassik rund 10 %, hoechstens 20 Versuche, kein Rueckfall, mindestens 40 verschiedene Huellen in 300 Seeds',
    timeout: 180000,
    async run(t) {
      await t.loadInpage('turn.js'); await t.loadTool('mapcheck.js');
      const r = await t.page.evaluate(() => {
        const D = __dbg, vals = { hw: {}, hd: {}, vx: {} }, tries = {}; let classic = 0, nondet = 0, hall = {};
        D.setScenario('jewel'); D.setSeedMode('random'); D.setLage([]); D.setTurn('S');
        for (let s = 1; s <= 1000; s++) {
          const lay = D.layoutBase(s), h1 = s <= 100 ? TN.layHash(D, lay) : null; hall[lay.hall] = (hall[lay.hall] || 0) + 1;
          if (!lay.q) classic++; else { for (const k of ['hw', 'hd', 'vx']) vals[k][lay.q[k]] = (vals[k][lay.q[k]] || 0) + 1; tries[lay.tries] = (tries[lay.tries] || 0) + 1; }
          if (h1 != null && h1 !== TN.layHash(D, D.layoutBase(s))) nondet++;
        }
        return { classic, vals, tries, nondet, hall, huellen: mapcheck.variety('jewel', 300, 1, 1, 0).huelle };
      });
      t.eq(r.nondet, 0, 'gleiche Seeds, gleiche Karten');
      t.ok(Object.keys(r.vals.hw).length === 7 && Object.keys(r.vals.hd).length === 4 && Object.keys(r.vals.vx).length === 3, 'alle Werte kommen vor: ' + JSON.stringify(r.vals));
      t.ok(r.classic >= 60 && r.classic <= 160, 'Klassik-Huelle rund 10 % (CFG.jewGen.classic): ' + r.classic + ' von 1000');
      t.ok(Math.max(...Object.keys(r.tries).map(Number)) <= 20, 'hoechstens 20 Versuche je Karte: ' + JSON.stringify(r.tries));
      t.ok(Object.keys(r.hall).length === 5, 'alle fuenf Hallen kommen vor: ' + JSON.stringify(r.hall));
      t.ok(r.huellen >= 40, 'mindestens 40 verschiedene Huellen in 300 Seeds auf der Basis: ' + r.huellen);
    },
  },
  {
    name: 'Juwelier-Generator: CFG.jewGen schaltet ab (on 0) und regelt die Klassik (classic 1 gleich aus, 0 fast nie), die Klassik-Huelle ist mit jedem Generator-Stand dieselbe Karte',
    timeout: 120000,
    async run(t) {
      await t.loadInpage('turn.js');
      const r = await t.page.evaluate(() => {
        const D = __dbg, G = D.CFG.jewGen, out = {}; D.setScenario('jewel'); D.setSeedMode('random'); D.setLage([]); D.setTurn('S');
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
    name: 'Juwelier eng: alle Kombinationen aus fuenf Hallen, hw 11 bis 17, hd 12 bis 15 und vx 0 bis 2 (420): was minHw und minHd zulassen, hat die 2 Kacheln breite Verbindung, keinen 1 Kachel breiten Gang zwischen Vitrinen und besteht validateMap, minHw und minHd sind nicht hoeher als noetig',
    timeout: 240000,
    async run(t) {
      await t.loadInpage('turn.js');
      const r = await t.page.evaluate(`(() => { const H = ${HELP}, D = H.D, out = { halls: D.JW_HALLS.map(h => [h.n, h.minHw, h.minHd]), rows: [] };
        D.setScenario('jewel'); D.setSeedMode('random'); D.setLage([]); D.setTurn('S');
        for (let i = 0; i < D.JW_HALLS.length; i++) for (let hw = 11; hw <= 17; hw++) for (let hd = 12; hd <= 15; hd++) for (let vx = 0; vx <= 2; vx++) {
          const lay = D.finishLay(D.genJewel(777, { hw, hd, vx, classic: false, hall: i })), rep = D.validateMap(lay);
          out.rows.push({ i, hall: lay.hall, hw, hd, vx, wide: H.wide(hw, hd, vx), narrow: H.narrow(hw, hd), err: rep.err.map(e => e.r), warn: rep.warn.map(e => e.r) });
        }
        return out; })()`);
      t.ok(r.halls.every(h => typeof h[1] === 'number' && typeof h[2] === 'number'), 'jede Halle hat minHw und minHd: ' + JSON.stringify(r.halls));
      t.eq(r.rows.filter(q => q.hall !== r.halls[q.i][0]).length, 0, 'P.hall erzwingt die Halle');
      const min = {}; r.halls.forEach(h => { min[h[0]] = h; });
      const ok = r.rows.filter(q => q.hw >= min[q.hall][1] && q.hd >= min[q.hall][2]);
      t.eq(ok.filter(q => !q.wide).map(q => q.hall + ' ' + q.hw + 'x' + q.hd + ' vx ' + q.vx), [], 'jede zugelassene Huelle hat die breite Verbindung');
      t.eq(ok.filter(q => q.narrow).map(q => q.hall + ' ' + q.hw + 'x' + q.hd + ' vx ' + q.vx + ' ' + q.narrow + ' enge Gaenge'), [], 'jede zugelassene Huelle hat keinen 1 Kachel breiten Gang zwischen Vitrinen');
      t.eq(ok.filter(q => q.err.length || q.warn.length).map(q => q.hall + ' ' + q.hw + 'x' + q.hd + ' vx ' + q.vx + ' ' + q.err.concat(q.warn).join(',')), [], 'jede zugelassene Huelle besteht validateMap ohne Fehler und Warnungen');
      const zuHoch = r.halls.filter(h => h[1] > 11 || h[2] > 12).filter(h => !r.rows.some(q => q.hall === h[0] && (q.hw < h[1] || q.hd < h[2]) && (!q.wide || q.err.length || q.narrow))).map(h => h[0]);
      t.eq(zuHoch, [], 'minHw und minHd sind nicht hoeher als noetig (unterhalb gibt es wirklich eine zu enge oder ungueltige Huelle)');
      t.note('zu eng oder ungueltig je Halle (von 84): ' + r.halls.map(h => h[0] + ' ' + r.rows.filter(q => q.hall === h[0] && (!q.wide || q.err.length || q.narrow)).length).join(', '));
    },
  },
  {
    name: 'Juwelier eng: validateMap meldet gang-breite fuer eine Halle, die den Weg von der Vordertuer zum Tresentor auf eine Kachel verengt (Probehalle mit Vitrinenblock vor dem Eingang), nicht fuer eine breite und nicht fuer die Klassik-Huelle (ohne q)',
    timeout: 120000,
    async run(t) {
      const r = await t.page.evaluate(`(() => { const H = ${HELP}, D = H.D, out = {};
        D.setScenario('jewel'); D.setSeedMode('random'); D.setLage([]); D.setTurn('S');
        const rule = P => { const lay = D.finishLay(D.genJewel(777, P)); return { err: D.validateMap(lay).err.map(e => e.r), q: !!lay.q, wide: H.wide(P.hw, P.hd, P.vx) }; };
        // Probehalle: ein 6 x 3 Kacheln grosser Vitrinenblock vor dem Eingang, darunter bleiben zwei Zeilen mit einer Pflanze am Ende, der Weg zum Tresentor ist zu
        D.JW_HALLS.push({ n: 'Probe', minHw: 11, minHd: 12, mk: (hw, hd, vd) => ({ isl: [[vd - 3, hd - 4, 6, 3, 2]], wall: [], pil: [], part: [], plants: [[hw, hd - 1], [hw, hd]], bench: [], route: [[hw - 1, hd - 1], [hw - 1, 6], [2, 6], [2, hd - 1], [2, 3], [hw - 1, 3]] }) });
        try { out.eng = rule({ hw: 13, hd: 12, vx: 0, classic: false, hall: D.JW_HALLS.length - 1 }); } finally { D.JW_HALLS.pop(); }
        out.breit = rule({ hw: 17, hd: 13, vx: 0, classic: false, hall: 0 });
        out.klassik = rule({ hw: 13, hd: 12, vx: 0, classic: true, hall: 4 });
        return out; })()`);
      t.ok(r.eng.q && !r.eng.wide && r.eng.err.includes('gang-breite'), 'Probehalle: die eigene Pruefung sieht den Schlauch, validateMap meldet gang-breite: ' + JSON.stringify(r.eng));
      t.ok(r.breit.q && r.breit.wide && !r.breit.err.includes('gang-breite'), 'breite Huelle meldet keine gang-breite: ' + JSON.stringify(r.breit));
      t.ok(!r.klassik.q && !r.klassik.err.includes('gang-breite'), 'die Klassik-Huelle ist ausgenommen: ' + JSON.stringify(r.klassik));
    },
  },
  {
    name: 'Juwelier-Generator: Gedraenge begrenzt (unter crowd.few freien Hallenkacheln hoechstens crowd.camsFew Kameras, unter crowd.two nur eine Wache), der Wachwechsel-Wachmann beginnt nicht auf der Kachel an der Vordertuer',
    timeout: 240000,
    async run(t) {
      const r = await t.page.evaluate(() => { const D = __dbg, C = D.CFG.jewGen.crowd, out = { C, n: 0, bad: [], wache: 0, tuer: [], kleinste: 999, begrenzt: 0 };
        D.setScenario('jewel'); D.setSeedMode('random'); D.setLage([]); D.setTurn('S');
        for (let s = 1; s <= 700; s++) { const lay = D.layoutBase(s); if (!lay.q) continue; out.n++; const q = lay.q; let fr = 0; for (let y = 1; y <= q.hd; y++) for (let x = 1; x <= q.hw; x++) if (!D.isSol(x, y)) fr++;
          out.kleinste = Math.min(out.kleinste, fr); const cams = lay.cams.length, guards = lay.guards.length;
          if (fr < C.few || fr < C.two) out.begrenzt++;
          if (fr < C.few && cams > Math.max(4, C.camsFew)) out.bad.push(s + ': frei ' + fr + ', ' + cams + ' Kameras');
          if (fr < C.two && guards > 1) out.bad.push(s + ': frei ' + fr + ', ' + guards + ' Wachen');
          const w = (lay.mission.extra || []).find(e => /Wachwechsel/.test(e.msg || '')); if (w) { out.wache++; const vd = q.hw - 2 - q.vx; if (w.p[1] >= q.hd && (w.p[0] === vd || w.p[0] === vd + 1)) out.tuer.push(s + ' ' + w.p); } }
        return out; });
      // Der Mechanismus mit erzwungenen Grenzen (jede erzeugte Huelle ist unter der Grenze): hoechstens camsFew Kameras (mindestens 4) und eine Wache
      const f = await t.page.evaluate(() => { const D = __dbg, G = D.CFG.jewGen, old = G.crowd, out = { n: 0, cams: 0, guards: 0 }; G.crowd = { few: 999, camsFew: 4, two: 999 };
        try { for (let s = 1; s <= 250; s++) { const lay = D.layoutBase(s); if (!lay.q) continue; out.n++; out.cams = Math.max(out.cams, lay.cams.length); out.guards = Math.max(out.guards, lay.guards.length); } } finally { G.crowd = old; }
        return out; });
      t.ok(f.n > 150 && f.cams <= 4 && f.guards <= 1, 'mit erzwungenen Grenzen hoechstens 4 Kameras und eine Wache: ' + JSON.stringify(f));
      t.ok(r.C && r.C.few === 93 && r.C.two === 96 && r.C.camsFew === 5, 'CFG.jewGen.crowd: few 93, camsFew 5, two 96: ' + JSON.stringify(r.C));
      t.eq(r.bad, [], 'Gedraenge unter der Grenze');
      t.ok(r.wache > 5, 'der Wachwechsel kommt in mehreren Karten vor: ' + r.wache);
      t.eq(r.tuer, [], 'der Wachwechsel-Wachmann beginnt nicht an der Vordertuer');
      t.note('kleinste freie Hallenflaeche einer erzeugten Huelle: ' + r.kleinste + ' Kacheln, ' + r.begrenzt + ' von ' + r.n + ' Karten begrenzt');
    },
  },
  {
    name: 'Juwelier-Generator: Bauregeln relativ zur Huelle in 400 generierten Karten (validateMap ohne Fehler und Warnungen, Gebaeudekasten, Vordertuer, Fluchttuer, Beute, Tresor, Posten und Wagenplaetze abgeleitet)',
    timeout: 180000,
    async run(t) {
      await t.page.evaluate(() => { __dbg.CFG.meet.p = 0; });   // geprueft wird die Karte ohne Treffpunkt abseits (109)
      await t.loadInpage('turn.js');
      const r = await t.page.evaluate(() => {
        const D = __dbg, bad = []; let n = 0; const vits = {};
        D.setScenario('jewel'); D.setSeedMode('random'); D.setLage([]); D.setTurn('S');
        for (let s = 1; s <= 700 && n < 400; s++) {
          const lay = D.layoutBase(s); if (!lay.q) continue; n++;
          const q = lay.q, dx = q.hw - 13, vd = q.hw - 2 - q.vx, tag = 'jewel#' + s + ' ' + lay.hall + ' ' + JSON.stringify(q);
          if (lay.bld.x1 !== 23 + dx || lay.bld.y1 !== 13 + (q.hd - 12)) bad.push(tag + ' Gebaeudekasten ' + JSON.stringify(lay.bld));
          const rep = D.validateMap(lay); if (rep.err.length || rep.warn.length) bad.push(tag + ' validateMap ' + rep.err.concat(rep.warn).map(e => e.r + ': ' + e.m).join(' | '));
          const w = D.world(), cell = (x, y) => w.cell(x, y);
          if (cell(vd, q.hd + 1) !== 'D' || cell(vd + 1, q.hd + 1) !== 'D') bad.push(tag + ' Vordertuer fehlt bei ' + vd);
          const ex = lay.spots.filter(z => z.ex); if (ex.length !== 1 || ex[0].side !== 'E' || ex[0].cells.map(c => c.join()).join(';') !== (23 + dx) + ',7;' + (23 + dx) + ',8') bad.push(tag + ' Fluchttuer ' + JSON.stringify(ex.map(z => z.cells)));
          if (lay.exit.tx !== 24 + dx || lay.van.stop !== (24 + dx) * 32) bad.push(tag + ' Fluchtzone/Wagenhalt ' + lay.exit.tx + ' ' + lay.van.stop);
          const kinds = {}; lay.vit.forEach(v => { kinds[v.k] = (kinds[v.k] || 0) + 1; });
          if (kinds.isl !== 8 || kinds.ctr !== 2 || !kinds.win || !kinds.wall) bad.push(tag + ' Beute ' + JSON.stringify(kinds));
          vits[lay.vit.length] = (vits[lay.vit.length] || 0) + 1;
          if (JSON.stringify(lay.vault) !== JSON.stringify({ door: [19 + dx, 2], pad: [18 + dx, 4], dir: 1, bundles: [[20 + dx, 1], [22 + dx, 1], [20 + dx, 4], [22 + dx, 4]] })) bad.push(tag + ' Tresor ' + JSON.stringify(lay.vault));
          if (lay.posts.length < 10 || D.laneOf(lay).slots.length < 6) bad.push(tag + ' ' + lay.posts.length + ' Posten, ' + D.laneOf(lay).slots.length + ' Wagenplaetze');
          for (const g of lay.guards.concat(lay.mission.extra || [])) for (const p of g.route) if (D.isSol(p[0], p[1])) bad.push(tag + ' Routenpunkt ' + p + ' in Festem');
        }
        return { bad: bad.slice(0, 10), nbad: bad.length, n, vits };
      });
      t.note(r.n + ' Karten, Zahl der Vitrinen ' + JSON.stringify(r.vits));
      t.eq(r.bad, [], 'Abweichungen (' + r.nbad + ')');
      t.ok(r.n === 400, 'genug generierte Karten: ' + r.n);
    },
  },
  {
    name: 'Juwelier-Generator: Coop zu zweit auf generierten Karten (vier Seeds mit verschiedener Breite und Tiefe, Host und Client bauen gleich, vom Start bis zum Sieg)',
    timeout: 280000,
    async run(t) {
      const seeds = await t.page.evaluate(() => { const D = __dbg, out = [], seen = new Set(); D.setScenario('jewel'); D.setSeedMode('random'); D.setLage([]); D.setTurn('S'); for (let s = 1; s < 400 && out.length < 4; s++) { const q = D.layoutBase(s).q; if (!q) continue; const k = (q.hw >= 15 ? 'b' : 'k') + q.hd; if (!seen.has(k)) { seen.add(k); out.push(s); } } return out; });
      const res = []; for (const s of seeds) res.push(await coopGame(t.env, 'jewel', s));
      t.note(res.map(r => r.tag + ' ' + r.stat.hall).join(', '));
      t.eq(res.flatMap(r => r.bad.map(b => r.tag + ': ' + b)), [], 'Abweichungen');
    },
  },
  {
    name: 'Juwelier-Generator: der Bot mit fruehem Rufen loest generierte Karten (40 Seeds, kein Haenger, kein frueher Verlust, mindestens 20 Siege)',
    open: { det: true },
    timeout: 290000,
    async run(t) {
      await t.loadTool('bot.js');
      const r = await t.page.evaluate(() => {
        const D = __dbg; D.setScenario('jewel'); D.setSeedMode('random'); D.setLage([]); D.setTurn('S');
        let w = 0, to = 0, early = 0, n = 0; for (let s = 5000; s < 5200 && n < 40; s++) { const l = D.layoutBase(s); if (!l.q) continue; n++; const q = bot.run({ sigma: .05, react: .35, kit: 'old', call: 0, van: 'alt', seed: s, turn: 'S' }); if (q.res === 'WIN') w++; else { if (q.res === 'TIMEOUT') to++; if (q.t < 30) early++; } }
        D.setTurn(null); return { w, n, to, early };
      });
      t.ok(r.n === 40 && r.to === 0 && r.early === 0 && r.w >= 20, r.w + ' von ' + r.n + ' Siegen (mindestens 20), ' + r.to + ' Haenger, ' + r.early + ' fruehe Verluste');
    },
  },
];
