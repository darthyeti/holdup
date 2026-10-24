// Paket P1 (docs/bugfix-plaene.md, B1 vom 24. Oktober 2026): Die erzeugte Tankstelle darf nicht zu eng werden. Zu eng heisst: keine 2 Kacheln breite Verbindung von der Vordertuer zur Fluchttuer
// (ein Block 2x2 schiebt sich Kachel fuer Kachel ueber freie Kacheln der Verkaufsflaeche von der Vordertuer bis zur Fluchttuer) oder weniger als CFG.gasGen.minArea Kacheln Verkaufsflaeche (Breite mal Tiefe).
// Die Regel steckt in zwei Stellen: GS_SHOPS[].minSd (kleinste Tiefe je Regalmuster) und CFG.gasGen.minArea, gasLayout wirft Karten weg, die sie verletzen. validateMap (Regel 'gang-breite') prueft dasselbe am Raster,
// damit ein neues Regalmuster nicht wieder zum Schlauch wird. Die Klassik-Huelle (14 x 4, Fluchttuer 7, zwei Inseln, lay.q fehlt) ist handgebaut und bleibt davon ausgenommen (Entscheidung Till, 24. Oktober 2026).
// Die Breitenpruefung im Test ist eine eigene Fassung (Kachelraster, isSol), sie benutzt validateMap nicht.
const HELP = `(() => {
  const D = __dbg;
  // wide(sw, sd, er): schiebt einen 2x2-Block ueber freie Kacheln der Verkaufsflaeche (x 1..sw, y 6..sd+5) von einem Startblock an der Vordertuer (unterste Zeile sd+5, ueberlappt die zwei Tuerkacheln fd und fd+1 um mindestens eine Spalte)
  // bis zu einem Zielblock an der Fluchttuer (Spalte sw, ueberlappt die zwei Tuerzeilen er und er+1 um mindestens eine Zeile)
  const wide = (sw, sd, er) => {
    const fd = 1 + Math.floor((sw - 2) / 2), free = (x, y) => !D.isSol(x, y), ok = (x, y) => x >= 1 && y >= 6 && x + 1 <= sw && y + 1 <= sd + 5 && free(x, y) && free(x + 1, y) && free(x, y + 1) && free(x + 1, y + 1);
    const q = [], seen = new Set(); for (let x = fd - 1; x <= fd + 1; x++) if (ok(x, sd + 4)) { q.push([x, sd + 4]); seen.add(x + ',' + (sd + 4)); }
    const goal = c => c[0] === sw - 1 && c[1] >= er - 1 && c[1] <= er + 1;
    for (let h = 0; h < q.length; h++) { const c = q[h]; if (goal(c)) return true; for (const d of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const n = [c[0] + d[0], c[1] + d[1]]; if (seen.has(n.join()) || !ok(n[0], n[1])) continue; seen.add(n.join()); q.push(n); } }
    return false;
  };
  // frei(sw, sd): freie Kacheln der Verkaufsflaeche x 1..sw, y 6..5+sd
  const frei = (sw, sd) => { let n = 0; for (let y = 6; y <= 5 + sd; y++) for (let x = 1; x <= sw; x++) if (!D.isSol(x, y)) n++; return n; };
  return { D, wide, frei };
})()`;

module.exports = [
  {
    name: 'Tankstelle eng: je Regalmuster und Tiefe (84 Huellen aus Breite 12 bis 18, Tiefe 3 bis 5, vier Muster) haelt minSd die Verbindung 2 Kacheln breit, ohne die Regel faellt keine zu enge Huelle durch',
    timeout: 120000,
    async run(t) {
      const r = await t.page.evaluate(`(() => { const H = ${HELP}, D = H.D, out = { shops: D.GS_SHOPS.map(s => [s.n, s.minSd]), rows: [], area: D.CFG.gasGen.minArea };
        D.setScenario('gas'); D.setSeedMode('random'); D.setLage([]); D.setTurn('S');
        for (let i = 0; i < D.GS_SHOPS.length; i++) for (let sw = 12; sw <= 18; sw++) for (let sd = 3; sd <= 5; sd++) for (let er = 7; er <= 4 + sd; er++) {
          const lay = D.finishLay(D.genGas(777, { sw, sd, er, np: 2, ps: 'L', classic: false, shop: i }));
          out.rows.push({ shop: D.GS_SHOPS[i].n, i, sw, sd, er, hall: lay.hall, wide: H.wide(sw, sd, er), frei: H.frei(sw, sd) });
        }
        return out; })()`);
      t.ok(r.shops.every(s => typeof s[1] === 'number'), 'jedes Regalmuster hat minSd: ' + JSON.stringify(r.shops));
      t.eq(r.rows.filter(q => q.hall !== q.shop).length, 0, 'P.shop erzwingt das Regalmuster');
      const min = {}; r.shops.forEach(s => { min[s[0]] = s[1]; });
      const gut = r.rows.filter(q => q.sd >= min[q.shop] && q.sw * q.sd >= r.area), schlauch = gut.filter(q => !q.wide);
      t.eq(schlauch.map(q => q.shop + ' ' + q.sw + 'x' + q.sd + ' er ' + q.er), [], 'jede Huelle, die die Regel zulaesst (minSd und minArea), hat die breite Verbindung');
      // minSd ist nicht hoeher als noetig: die Tiefe unter minSd hat bei mindestens einer Breite keine breite Verbindung (sonst koennte das Muster dort bleiben)
      const zuHoch = r.shops.filter(s => s[1] > 3).filter(s => !r.rows.some(q => q.shop === s[0] && q.sd === s[1] - 1 && !q.wide)).map(s => s[0]);
      t.eq(zuHoch, [], 'minSd ist nicht hoeher als noetig (eine Tiefe darunter gibt es dort wirklich Schlauch)');
      t.note('Verbindung je Muster und Tiefe (Breite 12 bis 18, er 7): ' + r.shops.map(s => s[0] + ' ' + [3, 4, 5].map(sd => sd + ':' + r.rows.filter(q => q.shop === s[0] && q.sd === sd && q.er === 7 && q.wide).length + '/7').join(' ')).join('; '));
    },
  },
  {
    name: 'Tankstelle eng: kein erzeugtes Gebaeude (Seeds 1 bis 500, Basis) hat eine zu enge Verbindung oder weniger als minArea Verkaufsflaeche, die Klassik-Huelle bleibt wie sie ist',
    timeout: 240000,
    async run(t) {
      const r = await t.page.evaluate(`(() => { const H = ${HELP}, D = H.D, out = { n: 0, classic: 0, schlauch: [], klein: [], tries: {}, area: D.CFG.gasGen.minArea, halls: {} };
        D.setScenario('gas'); D.setSeedMode('random'); D.setLage([]); D.setTurn('S');
        for (let s = 1; s <= 500; s++) { const lay = D.layoutBase(s); out.n++; if (!lay.q) { out.classic++; continue; } const q = lay.q;
          out.halls[lay.hall + q.sd] = (out.halls[lay.hall + q.sd] || 0) + 1; out.tries[lay.tries] = (out.tries[lay.tries] || 0) + 1;
          if (!H.wide(q.sw, q.sd, q.er)) out.schlauch.push(s + ' ' + lay.hall + ' ' + q.sw + 'x' + q.sd + ' er ' + q.er);
          if (q.sw * q.sd < out.area) out.klein.push(s + ' ' + q.sw + 'x' + q.sd); }
        return out; })()`);
      t.eq(r.schlauch, [], 'zu enge Verbindung');
      t.eq(r.klein, [], 'Verkaufsflaeche unter minArea (' + r.area + ')');
      t.ok(r.classic >= 25 && r.classic <= 120, 'Klassik-Huelle bleibt: ' + r.classic + ' von ' + r.n);
      t.ok(Math.max(...Object.keys(r.tries).map(Number)) <= 20, 'hoechstens 20 Versuche je Karte (das Muster Gaenge braucht Tiefe 5, im Mittel 3 Versuche; CFG.gasGen.tries 30): ' + JSON.stringify(r.tries));
      t.ok(Object.keys(r.halls).length >= 8, 'die erlaubten Kombinationen aus Muster und Tiefe kommen vor: ' + JSON.stringify(r.halls));
    },
  },
  {
    name: 'Tankstelle eng: validateMap meldet gang-breite fuer eine zu enge erzeugte Huelle (Gaenge 12 x 3), nicht fuer eine breite und nicht fuer die Klassik-Huelle (Gaenge 14 x 4 ohne q)',
    timeout: 120000,
    async run(t) {
      const r = await t.page.evaluate(`(() => { const H = ${HELP}, D = H.D, out = {};
        D.setScenario('gas'); D.setSeedMode('random'); D.setLage([]); D.setTurn('S');
        const rule = (P, shop) => { const lay = D.finishLay(D.genGas(777, Object.assign({}, P, { shop }))); const rep = D.validateMap(lay); return { err: rep.err.map(e => e.r), q: !!lay.q }; };
        out.enge = rule({ sw: 12, sd: 3, er: 7, np: 2, ps: 'L', classic: false }, 3);
        out.breit = rule({ sw: 16, sd: 5, er: 7, np: 2, ps: 'L', classic: false }, 3);
        out.klassik = rule({ sw: 14, sd: 4, er: 7, np: 2, ps: 'L', classic: true }, 3);
        return out; })()`);
      t.ok(r.enge.q && r.enge.err.includes('gang-breite'), 'Gaenge 12 x 3 meldet gang-breite: ' + JSON.stringify(r.enge));
      t.ok(r.breit.q && !r.breit.err.includes('gang-breite'), 'Gaenge 16 x 5 meldet keine gang-breite: ' + JSON.stringify(r.breit));
      t.ok(!r.klassik.q && !r.klassik.err.includes('gang-breite'), 'die Klassik-Huelle ist ausgenommen: ' + JSON.stringify(r.klassik));
    },
  },
  {
    name: 'Tankstelle eng: Gedraenge begrenzt (unter crowd.few freien Kacheln hoechstens 2 Kameras und eine Wache, die zweite Wache nur ab crowd.two), der Wachwechsel-Wachmann beginnt nicht auf der Kachel am Eingang',
    timeout: 240000,
    async run(t) {
      const r = await t.page.evaluate(`(() => { const H = ${HELP}, D = H.D, C = D.CFG.gasGen.crowd, out = { C, n: 0, bad: [], wache: 0, eingang: [], kleinste: 99 };
        D.setScenario('gas'); D.setSeedMode('random'); D.setLage([]); D.setTurn('S');
        if (!C) return out;
        for (let s = 1; s <= 600; s++) { const lay = D.layoutBase(s); if (!lay.q) continue; out.n++; const q = lay.q, fr = H.frei(q.sw, q.sd), cams = lay.cams.length, guards = lay.guards.length; out.kleinste = Math.min(out.kleinste, fr);
          if (fr < C.few && (cams > C.camsFew || guards > 1)) out.bad.push(s + ': frei ' + fr + ', ' + cams + ' Kameras, ' + guards + ' Wachen');
          if (fr < C.two && guards > 1) out.bad.push(s + ': frei ' + fr + ', zweite Wache');
          const w = (lay.mission.extra || []).find(e => /Wachwechsel/.test(e.msg || '')); if (w) { out.wache++; const fd = 1 + Math.floor((q.sw - 2) / 2); if (w.p[1] >= q.sd + 5 && (w.p[0] === fd || w.p[0] === fd + 1)) out.eingang.push(s + ' ' + w.p); } }
        return out; })()`);
      t.ok(r.C && r.C.few === 40 && r.C.two === 48 && r.C.camsFew === 2, 'CFG.gasGen.crowd: few 40, two 48, camsFew 2: ' + JSON.stringify(r.C));
      t.eq(r.bad, [], 'Gedraenge unter der Grenze');
      t.ok(r.wache > 5, 'der Wachwechsel kommt in mehreren Karten vor: ' + r.wache);
      t.eq(r.eingang, [], 'der Wachwechsel-Wachmann beginnt nicht an der Vordertuer');
      t.note('kleinste freie Flaeche einer erzeugten Huelle: ' + r.kleinste + ' Kacheln, ' + r.n + ' Huellen geprueft');
    },
  },
];
