// Casino als Generator (Sprint 9 des Plans Mehr Abwechslung, docs/offen-und-spieltest.md): Die Huelle kommt aus Parametern (genCasino, CFG.casinoGen): Zusatzbreite dx 0 bis 4 (Gebaeude x0..39+dx, Cage, Tresorraum,
// Ostwand und Hof wandern, der Sicherheitsraum waechst), Zusatztiefe dy 0 bis 2 (Gebaeude y0..23+dy, die ganze Strasse rueckt nach Sueden), Versatz des Haupteingangs vx -2 bis 2 (Klassik x19..21). Die Klassik-Huelle
// (0, 0, 0) ist mit jeder der vier Hallen Zeichen fuer Zeichen die Karte von vorher (Selbsttest 43-casino-basis mit CFG.casinoGen.on 0). Die vier Hallen (CS_FLOORS) sind Funktionen eines Massobjekts.
// Die Enge-Pruefung im Test ist eine eigene Fassung (Kachelraster), sie benutzt validateMap nicht: In der Halle (x1..38+dx ab Zeile 10, dazu x12..38+dx in den Zeilen 7 bis 9) darf es keinen Gang der Breite 1 und der
// Laenge mindestens 6 geben, dessen Seiten Tresen, Wand oder Pfeiler (C # P) sind. Gemessen am 25. Oktober 2026: Die handgebaute Promenade hat zwei gestaltete Gaenge der Laenge 4 und 5 (Automatengasse an der Westwand
// und der Spalt zwischen Tischen und Theke), sie sind in jeder Huelle gleich und duerfen nicht anschlagen.
// Warnungen: Wie schon die Klassik-Huelle warnt jedes Casino bei weg-start-tresor (Richtwert 8 bis 32, gemessen 34 bis 40), beute-summe (308.000 ueber 260.000) und wachen (4 bis 6 statt 3), das sind weite Leitplanken
// (CFG.val), sie gelten fuer die grosse Karte nicht. Jede andere Warnung und jeder Fehler faellt durch.
const { coopGame } = require('../lib');
const HELP = `(() => {
  const D = __dbg, B = 'C#P';
  const tubes = (dx, dy) => {
    const w = D.world(), S = 22 + dy, c = (x, y) => w.cell(x, y), fr = (x, y) => !D.isSol(x, y);
    const hn = (x, y) => fr(x, y) && B.includes(c(x - 1, y)) && B.includes(c(x + 1, y)), vn = (x, y) => fr(x, y) && B.includes(c(x, y - 1)) && B.includes(c(x, y + 1));
    let n = 0;
    for (const [x0, x1, y0, y1] of [[1, 38 + dx, 10, S], [12, 38 + dx, 7, 9]]) for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      let ok = true; for (let k = 0; k < 6; k++) if (!(y + k <= y1 && hn(x, y + k))) { ok = false; break; } if (ok) n++;
      ok = true; for (let k = 0; k < 6; k++) if (!(x + k <= x1 && vn(x + k, y))) { ok = false; break; } if (ok) n++;
    }
    return n;
  };
  return { D, tubes };
})()`;

module.exports = [
  {
    name: 'Casino-Generator: Huelle aus Parametern (alle Werte von dx, dy und vx kommen vor), deterministisch, Klassik rund 10 %, hoechstens 20 Versuche, kein Rueckfall, mindestens 40 verschiedene Huellen in 300 Seeds',
    timeout: 240000,
    async run(t) {
      await t.loadInpage('turn.js'); await t.loadTool('mapcheck.js');
      const r = await t.page.evaluate(() => {
        const D = __dbg, vals = { dx: {}, dy: {}, vx: {} }, tries = {}; let classic = 0, nondet = 0, hall = {};
        D.setScenario('casino'); D.setSeedMode('random'); D.setLage([]); D.setTurn('S');
        for (let s = 1; s <= 1000; s++) {
          const lay = D.layoutBase(s), h1 = s <= 100 ? TN.layHash(D, lay) : null; hall[lay.hall] = (hall[lay.hall] || 0) + 1;
          if (!lay.q) classic++; else { for (const k of ['dx', 'dy', 'vx']) vals[k][lay.q[k]] = (vals[k][lay.q[k]] || 0) + 1; tries[lay.tries] = (tries[lay.tries] || 0) + 1; }
          if (h1 != null && h1 !== TN.layHash(D, D.layoutBase(s))) nondet++;
        }
        return { classic, vals, tries, nondet, hall, huellen: mapcheck.variety('casino', 300, 1, 1, 0).huelle };
      });
      t.eq(r.nondet, 0, 'gleiche Seeds, gleiche Karten');
      t.ok(Object.keys(r.vals.dx).length === 5 && Object.keys(r.vals.dy).length === 3 && Object.keys(r.vals.vx).length === 5, 'alle Werte kommen vor: ' + JSON.stringify(r.vals));
      t.ok(r.classic >= 60 && r.classic <= 160, 'Klassik-Huelle rund 10 % (CFG.casinoGen.classic): ' + r.classic + ' von 1000');
      t.ok(Math.max(...Object.keys(r.tries).map(Number)) <= 20, 'hoechstens 20 Versuche je Karte: ' + JSON.stringify(r.tries));
      t.ok(Object.keys(r.hall).length === 4, 'alle vier Hallen kommen vor: ' + JSON.stringify(r.hall));
      t.ok(r.huellen >= 40, 'mindestens 40 verschiedene Huellen in 300 Seeds auf der Basis: ' + r.huellen);
    },
  },
  {
    name: 'Casino-Generator: CFG.casinoGen schaltet ab (on 0) und regelt die Klassik (classic 1 gleich aus, 0 fast nie), die Klassik-Huelle ist mit jedem Generator-Stand dieselbe Karte',
    timeout: 120000,
    async run(t) {
      await t.loadInpage('turn.js');
      const r = await t.page.evaluate(() => {
        const D = __dbg, G = D.CFG.casinoGen, out = {}; D.setScenario('casino'); D.setSeedMode('random'); D.setLage([]); D.setTurn('S');
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
    name: 'Casino eng: alle Kombinationen aus vier Hallen, dx 0 bis 4, dy 0 bis 2 und vx -2 bis 2 (300): kein Gang der Breite 1 und Laenge 6 in der Halle und validateMap ohne Fehler und ohne unbekannte Warnungen',
    timeout: 290000,
    async run(t) {
      await t.loadInpage('turn.js');
      const r = await t.page.evaluate(`(() => { const H = ${HELP}, D = H.D, out = { halls: D.CS_FLOORS.map(h => h.n), rows: [] };
        D.setScenario('casino'); D.setSeedMode('random'); D.setLage([]); D.setTurn('S');
        for (let i = 0; i < D.CS_FLOORS.length; i++) for (let dx = 0; dx <= 4; dx++) for (let dy = 0; dy <= 2; dy++) for (let vx = -2; vx <= 2; vx++) {
          const lay = D.finishLay(D.genCasino(777, { dx, dy, vx, classic: false, hall: i })), rep = D.validateMap(lay);
          out.rows.push({ i, hall: lay.hall, dx, dy, vx, tubes: H.tubes(dx, dy), err: rep.err.map(e => e.r), warn: rep.warn.map(e => e.r).filter(r => !['weg-start-tresor', 'beute-summe', 'wachen'].includes(r)) });
        }
        return out; })()`);
      t.eq(r.rows.filter(q => q.hall !== r.halls[q.i]).length, 0, 'P.hall erzwingt die Halle');
      const tag = q => q.hall + ' ' + q.dx + '/' + q.dy + ' vx ' + q.vx;
      t.eq(r.rows.filter(q => q.tubes).map(q => tag(q) + ' ' + q.tubes + ' enge Gaenge'), [], 'jede Huelle hat keinen Gang der Breite 1 und Laenge 6 in der Halle');
      t.eq(r.rows.filter(q => q.err.length || q.warn.length).map(q => tag(q) + ' ' + q.err.concat(q.warn).join(',')), [], 'jede Huelle besteht validateMap ohne Fehler und ohne unbekannte Warnungen');
    },
  },
  {
    name: 'Casino eng: validateMap meldet gang-breite fuer eine Halle mit einem Gang der Breite 1 (Probehalle mit zwei Pfeilerreihen im Eingangsbereich), nicht fuer eine breite und nicht fuer die Klassik-Huelle (ohne q)',
    timeout: 120000,
    async run(t) {
      const r = await t.page.evaluate(`(() => { const H = ${HELP}, D = H.D, out = {};
        D.setScenario('casino'); D.setSeedMode('random'); D.setLage([]); D.setTurn('S');
        const rule = P => { const lay = D.finishLay(D.genCasino(777, P)); return { err: D.validateMap(lay).err.map(e => e.r), q: !!lay.q, tubes: H.tubes(P.dx, P.dy) }; };
        // Probehalle: Pfeiler in den Zeilen 20 und 22 (plus dy) von x10 bis x18, dazwischen bleibt Zeile 21 als Schlauch der Laenge 9
        const base = D.CS_FLOORS[0];
        D.CS_FLOORS.push({ n: 'Probe', mk: c => { const m = base.mk(c), pil = []; for (let x = 10; x <= 18; x++) { pil.push([x, 20 + c.dy]); pil.push([x, 22 + c.dy]); } return Object.assign({}, m, { pil }); } });
        try { out.eng = rule({ dx: 0, dy: 1, vx: 0, classic: false, hall: D.CS_FLOORS.length - 1 }); } finally { D.CS_FLOORS.pop(); }
        out.breit = rule({ dx: 4, dy: 2, vx: 1, classic: false, hall: 1 });
        out.klassik = rule({ dx: 0, dy: 0, vx: 0, classic: true, hall: 1 });
        return out; })()`);
      t.ok(r.eng.q && r.eng.tubes > 0 && r.eng.err.includes('gang-breite'), 'Probehalle: die eigene Pruefung sieht den Schlauch, validateMap meldet gang-breite: ' + JSON.stringify(r.eng));
      t.ok(r.breit.q && !r.breit.tubes && !r.breit.err.includes('gang-breite'), 'breite Huelle meldet keine gang-breite: ' + JSON.stringify(r.breit));
      t.ok(!r.klassik.q && !r.klassik.err.includes('gang-breite'), 'die Klassik-Huelle ist ausgenommen: ' + JSON.stringify(r.klassik));
    },
  },
  {
    name: 'Casino-Generator: Wachwechsel-Wachmann beginnt nicht an der Tuer, die freie Flaeche der Halle reicht in der kleinsten Huelle fuer sechs Wachen und 30 Gaeste',
    timeout: 240000,
    async run(t) {
      const r = await t.page.evaluate(() => { const D = __dbg, out = { n: 0, wache: 0, tuer: [], kleinste: 9999 };
        D.setScenario('casino'); D.setSeedMode('random'); D.setLage([]); D.setTurn('S');
        for (let s = 1; s <= 700; s++) { const lay = D.layoutBase(s); if (!lay.q) continue; out.n++; const q = lay.q; let fr = 0;
          for (let y = 7; y <= 22 + q.dy; y++) for (let x = 12; x <= 38 + q.dx; x++) if (!D.isSol(x, y)) fr++;
          out.kleinste = Math.min(out.kleinste, fr);
          const w = (lay.mission.extra || []).find(e => /Wachwechsel/.test(e.msg || '')); if (w) { out.wache++; const e = 19 + q.vx; if (w.p[1] >= 22 + q.dy && w.p[0] >= e && w.p[0] <= e + 2) out.tuer.push(s + ' ' + w.p); } }
        return out; });
      t.ok(r.wache > 5, 'der Wachwechsel kommt in mehreren Karten vor: ' + r.wache);
      t.eq(r.tuer, [], 'der Wachwechsel-Wachmann beginnt nicht an der Tuer');
      t.ok(r.kleinste >= 300, 'auch die kleinste Huelle hat genug freie Flaeche in der Halle (mindestens 300 Kacheln): ' + r.kleinste);
      t.note('kleinste freie Hallenflaeche einer erzeugten Huelle: ' + r.kleinste + ' Kacheln (' + r.n + ' Karten)');
    },
  },
  {
    name: 'Casino-Generator: Bauregeln relativ zur Huelle in 400 generierten Karten (validateMap ohne Fehler und unbekannte Warnungen, Gebaeudekasten, Haupteingang, Osttuer, Fluchtweg, Beute, Tresor, Cage, Geldautomaten, Posten und Wagenplaetze abgeleitet)',
    timeout: 180000,
    async run(t) {
      await t.loadInpage('turn.js');
      const r = await t.page.evaluate(() => {
        const D = __dbg, bad = []; let n = 0, slotsMin = 99;
        D.setScenario('casino'); D.setSeedMode('random'); D.setLage([]); D.setTurn('S');
        for (let s = 1; s <= 700 && n < 400; s++) {
          const lay = D.layoutBase(s); if (!lay.q) continue; n++;
          const q = lay.q, dx = q.dx, X1 = 39 + dx, Y1 = 23 + q.dy, e = 19 + q.vx, tag = 'casino#' + s + ' ' + lay.hall + ' ' + JSON.stringify(q);
          if (lay.bld.x1 !== X1 || lay.bld.y1 !== Y1) bad.push(tag + ' Gebaeudekasten ' + JSON.stringify(lay.bld));
          const rep = D.validateMap(lay), wn = rep.warn.filter(w => !['weg-start-tresor', 'beute-summe', 'wachen'].includes(w.r)); if (rep.err.length || wn.length) bad.push(tag + ' validateMap ' + rep.err.concat(wn).map(e => e.r + ': ' + e.m).join(' | '));
          const w = D.world(), cell = (x, y) => w.cell(x, y);
          for (let i = 0; i < 3; i++) if (cell(e + i, Y1) !== 'D') bad.push(tag + ' Haupteingang fehlt bei ' + (e + i));
          const ex = lay.spots.filter(z => z.ex); if (ex.length !== 1 || ex[0].side !== 'E' || ex[0].cells.map(c => c.join()).join(';') !== X1 + ',16;' + X1 + ',17') bad.push(tag + ' Osttuer ' + JSON.stringify(ex.map(z => z.cells)));
          if (lay.exit.tx !== 40 + dx || lay.van.stop !== (40 + dx) * 32) bad.push(tag + ' Fluchtzone/Wagenhalt ' + lay.exit.tx + ' ' + lay.van.stop);
          for (let y = 15; y <= 18; y++) for (let x = 36 + dx; x <= 38 + dx; x++) if (D.isSol(x, y) && !(x === 38 + dx && (y === 12 || y === 13))) bad.push(tag + ' Weg zur Osttuer blockiert bei ' + x + ',' + y);
          const kinds = {}; lay.goods.forEach(v => { kinds[v.k] = (kinds[v.k] || 0) + 1; });
          if (kinds.chips !== 12 || kinds.slot !== 8 || kinds.vip !== 3) bad.push(tag + ' Beute ' + JSON.stringify(kinds));
          if (JSON.stringify(lay.vault) !== JSON.stringify({ door: [35 + dx, 2], pad: [34 + dx, 4], dir: 1, bundles: [[36 + dx, 1], [38 + dx, 1], [36 + dx, 4], [38 + dx, 4], [37 + dx, 3]] })) bad.push(tag + ' Tresor ' + JSON.stringify(lay.vault));
          if (JSON.stringify(lay.cage) !== JSON.stringify({ x: (30 + dx) * 32, y: 7 * 32 + 16, r: 60 })) bad.push(tag + ' Cage ' + JSON.stringify(lay.cage));
          if (JSON.stringify(lay.atms) !== JSON.stringify([[38 + dx, 12], [38 + dx, 13]])) bad.push(tag + ' Geldautomaten ' + JSON.stringify(lay.atms));
          for (const g of lay.goods) if (g.k === 'chips') { const tx = Math.round(g.rc[0] / 32) - 1; if (!(!D.isSol(tx + 1, Math.round(g.rc[1] / 32) + 1) || !D.isSol(tx + 2, Math.round(g.rc[1] / 32) + 1))) bad.push(tag + ' Chipstapel ohne freie Kachel darunter ' + tx); }
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
    name: 'Casino-Generator: Coop zu zweit auf generierten Karten (vier Seeds mit verschiedener Breite und Tiefe, Host und Client bauen gleich, vom Start bis zum Sieg)',
    timeout: 290000,
    async run(t) {
      const seeds = await t.page.evaluate(() => { const D = __dbg, out = [], seen = new Set(); D.setScenario('casino'); D.setSeedMode('random'); D.setLage([]); D.setTurn('S'); for (let s = 1; s < 400 && out.length < 4; s++) { const q = D.layoutBase(s).q; if (!q) continue; const k = (q.dx >= 2 ? 'b' : 'k') + (q.dy >= 1 ? 't' : 'f'); if (!seen.has(k)) { seen.add(k); out.push(s); } } return out; });
      const res = []; for (const s of seeds) res.push(await coopGame(t.env, 'casino', s));
      t.note(res.map(r => r.tag + ' ' + r.stat.hall).join(', '));
      t.eq(res.flatMap(r => r.bad.map(b => r.tag + ': ' + b)), [], 'Abweichungen');
    },
  },
  {
    name: 'Casino-Generator: der Bot mit fruehem Rufen loest generierte Karten (40 Seeds, kein Haenger, kein frueher Verlust, mindestens 34 Siege)',
    open: { det: true },
    timeout: 295000,
    async run(t) {
      await t.loadTool('bot.js');
      const r = await t.page.evaluate(() => {
        const D = __dbg; D.setScenario('casino'); D.setSeedMode('random'); D.setLage([]); D.setTurn('S');
        let w = 0, to = 0, early = 0, n = 0; for (let s = 5000; s < 5200 && n < 40; s++) { const l = D.layoutBase(s); if (!l.q) continue; n++; const q = bot.run({ sigma: .05, react: .35, kit: 'old', call: 0, van: 'alt', seed: s, turn: 'S' }); if (q.res === 'WIN') w++; else { if (q.res === 'TIMEOUT') to++; if (q.t < 30) early++; } }
        D.setTurn(null); return { w, n, to, early };
      });
      t.note(r.w + ' von ' + r.n + ' Siegen');
      t.ok(r.n === 40 && r.to === 0 && r.early === 0 && r.w >= 34, r.w + ' von ' + r.n + ' Siegen (mindestens 34), ' + r.to + ' Haenger, ' + r.early + ' fruehe Verluste');
    },
  },
];
