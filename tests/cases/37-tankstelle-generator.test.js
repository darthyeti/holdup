// Tankstelle als Generator (Plan Mehr Abwechslung, Sprint 6, docs/offen-und-spieltest.md): Die Huelle kommt aus Parametern (genGas, CFG.gasGen), die Klassik-Parameter ergeben mit jeder der vier Hallen exakt die Karte von vorher.
// Weitere Tests: Verteilung und Vielfalt, die Bauregeln aus docs/szenarien.md relativ zur Huelle, abgeleitete Posten, Coop, Bot. Der erste Test friert die Basiskarten der Hand-Hallen ein (Schnappschuss, vor dem Umbau aufgenommen): Raster und alle LAY-Felder je Seed (Hash) und die Pixel der statischen und der Objektebene. Er laeuft mit CFG.gasGen.on 0, dem Schalter, der den Generator abschaltet.
const { coopGame } = require('../lib');
const HALLS = ['Klassik', 'Insel', 'Wandregale', 'Gänge'];

module.exports = [
  {
    name: 'Tankstelle: ohne Generator (CFG.gasGen.on 0) sind Raster, Felder und Pixel jeder Hand-Halle gleich dem Stand vor dem Umbau (Schnappschuss)',
    timeout: 120000,
    async run(t) {
      await t.loadInpage('turn.js');
      const r = await t.page.evaluate(({ HALLS }) => {
        const D = __dbg, out = { hash: {}, px: {}, n: {} }, acc = {}, first = {};
        D.setScenario('gas'); D.setSeedMode('random'); D.setLage([]); D.setTurn('S'); if (D.CFG.gasGen) D.CFG.gasGen.on = 0;
        for (let s = 1; s <= 200; s++) {
          const lay = D.layoutBase(s), h = lay.hall; acc[h] = (acc[h] || '') + TN.layHash(D, lay) + ','; out.n[h] = (out.n[h] || 0) + 1;
          (first[h] = first[h] || []).length < 2 && first[h].push(s);
        }
        for (const h of Object.keys(acc)) out.hash[h] = TN.fnv(acc[h]);
        for (const h of Object.keys(first)) for (const s of first[h]) { D.buildLay(D.layoutBase(s)); const w = D.world(); out.px[h + '#' + s] = TN.hashCanvas(w.st) + ' ' + TN.hashCanvas(w.so); }
        return out;
      }, { HALLS });
      t.ok(HALLS.every(h => r.n[h] > 20), 'alle vier Hallen kommen vor: ' + JSON.stringify(r.n));
      await t.snapshot('gas-basis', r);
    },
  },
  {
    name: 'Tankstelle: Generator wuerfelt die Huelle (alle Werte von Breite, Tiefe, Fluchttuer und Zapfsaeulenzahl kommen vor), deterministisch, kein Rueckfall, hoechstens 20 Versuche, mindestens 50 verschiedene Huellen in 300 Seeds, Klassik rund 10 %',
    timeout: 120000,
    async run(t) {
      await t.loadInpage('turn.js'); await t.loadTool('mapcheck.js');
      const r = await t.page.evaluate(() => {
        const D = __dbg, vals = { sw: {}, sd: {}, er: {}, np: {} }, tries = {}; let classic = 0, nondet = 0;
        D.setScenario('gas'); D.setSeedMode('random'); D.setLage([]); D.setTurn('S');
        for (let s = 1; s <= 1000; s++) {
          const lay = D.layoutBase(s), h1 = s <= 100 ? TN.layHash(D, lay) : null;
          if (!lay.q) classic++; else { for (const k of ['sw', 'sd', 'er', 'np']) vals[k][lay.q[k]] = (vals[k][lay.q[k]] || 0) + 1; tries[lay.tries] = (tries[lay.tries] || 0) + 1; }
          if (h1 != null && h1 !== TN.layHash(D, D.layoutBase(s))) nondet++;
        }
        return { classic, vals, tries, nondet, huellen: mapcheck.variety('gas', 300, 1, 1, 0).huelle };
      });
      t.eq(r.nondet, 0, 'gleiche Seeds, gleiche Karten');
      t.ok(Object.keys(r.vals.sw).length === 7 && Object.keys(r.vals.sd).length === 3 && Object.keys(r.vals.er).length === 3 && Object.keys(r.vals.np).length === 3, 'alle Werte kommen vor: ' + JSON.stringify(r.vals));
      t.ok(r.classic >= 60 && r.classic <= 160, 'Klassik-Huelle rund 10 % (CFG.gasGen.classic): ' + r.classic + ' von 1000');
      t.ok(Math.max(...Object.keys(r.tries).map(Number)) <= 20, 'hoechstens 20 Versuche je Karte (seit Paket P1 braucht das Muster Gaenge Tiefe 5, im Mittel 3 Versuche): ' + JSON.stringify(r.tries));
      t.ok(r.huellen >= 50, 'mindestens 50 verschiedene Huellen in 300 Seeds auf der Basis: ' + r.huellen);
    },
  },
  {
    name: 'Tankstelle: CFG.gasGen schaltet ab (on 0) und regelt die Klassik (classic 1 gleich aus, 0 fast nie), die Klassik-Huelle ist mit jedem Generator-Stand dieselbe Karte',
    timeout: 120000,
    async run(t) {
      await t.loadInpage('turn.js');
      const r = await t.page.evaluate(() => {
        const D = __dbg, G = D.CFG.gasGen, out = {}; D.setScenario('gas'); D.setSeedMode('random'); D.setLage([]); D.setTurn('S');
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
    name: 'Tankstelle: Bauregeln relativ zur Huelle in 400 generierten Karten (validateMap ohne Fehler und Warnungen, Zapfsaeulen und Routenpunkte weit vom Eingang, Lager mit Safe und Kistenblock wie in der Klassik, Beute, Fluchttuer, Posten abgeleitet und ausserhalb des Gefahrenradius)',
    timeout: 120000,
    async run(t) {
      await t.loadInpage('turn.js');
      const r = await t.page.evaluate(() => {
        const D = __dbg, bad = [], store = new Set(); let n = 0, pumps = {}, minPump = 99, minRoute = 99;
        D.setScenario('gas'); D.setSeedMode('random'); D.setLage([]); D.setTurn('S');
        for (let s = 1; s <= 600 && n < 400; s++) {
          const lay = D.layoutBase(s); if (!lay.q) continue; n++;
          const sw = lay.q.sw, fd = 1 + Math.floor((sw - 2) / 2), wall = lay.bld.y1, bot = wall - 1, tag = 'gas#' + s + ' ' + lay.hall + ' ' + JSON.stringify(lay.q);
          if (lay.bld.x1 !== sw + 1 || lay.bld.y1 !== 6 + lay.q.sd) bad.push(tag + ' Gebaeudekasten ' + JSON.stringify(lay.bld));
          // Lager mit Safe (x0..9, y0..5) in der Huelle des Rasters: nur die Hallen-Kisten wechseln
          const w = D.world(); store.add(lay.hall + ':' + [0, 1, 2, 3, 4, 5].map(y => Array.from({ length: 10 }, (_, x) => w.cell(x, y)).join('')).join('/'));
          const rep = D.validateMap(lay); if (rep.err.length || rep.warn.length) bad.push(tag + ' validateMap ' + rep.err.concat(rep.warn).map(e => e.r + ': ' + e.m).join(' | '));
          // Zapfsaeulen: 2 je Insel, hoechstens 3 Inseln, mindestens 3,5 Kacheln von beiden Tuerkacheln (die Explosion reicht 3), Posten ausserhalb des Gefahrenradius
          pumps[lay.pumps.length] = (pumps[lay.pumps.length] || 0) + 1; if (lay.pumps.length % 2 || lay.pumps.length < 2 || lay.pumps.length > 6) bad.push(tag + ' ' + lay.pumps.length + ' Zapfsaeulen');
          for (const q of lay.pumps) { const d = Math.min(Math.hypot(q.x - fd, q.y - wall), Math.hypot(q.x - (fd + 1), q.y - wall)); minPump = Math.min(minPump, d); if (d < 3.5) bad.push(tag + ' Zapfsaeule ' + q.x + ',' + q.y + ' nur ' + d.toFixed(1) + ' von der Tuer'); for (const p of lay.posts) if (Math.hypot(q.x - p.x, q.y - p.y) < D.CFG.val.danger) bad.push(tag + ' Posten ' + p.x + ',' + p.y + ' im Gefahrenradius'); }
          // Routenpunkte (jeder kann Startpunkt einer Wache sein): mindestens 5 Kacheln vom Eingang
          for (const g of lay.guards.concat(lay.mission.extra || [])) for (const p of g.route) { const d = Math.hypot(p[0] - (fd + 1), p[1] - bot); minRoute = Math.min(minRoute, d); if (d < 4.99) bad.push(tag + ' Routenpunkt ' + p + ' nur ' + d.toFixed(1) + ' vom Eingang'); }
          // Beute: vier Regalstuecke immer, Zigaretten so viele wie die Tresenkammer breit ist (hoechstens 5), Safe unveraendert
          const cig = lay.goods.filter(g => g.k === 'cig').length, shelf = lay.goods.filter(g => g.k === 'shelf').length;
          if (shelf !== 4 || cig !== Math.min(5, sw - 9)) bad.push(tag + ' Beute: ' + shelf + ' Regalstuecke, ' + cig + ' Zigaretten');
          if (JSON.stringify(lay.vault) !== '{"door":[3,2],"pad":[4,4],"dir":-1,"bundles":[[1,2],[2,3]]}') bad.push(tag + ' Safe weicht ab');
          // Fluchttuer an der Ostwand in den Zeilen er und er+1, Posten abgeleitet (keine Handliste), genug Wagenplaetze
          const ex = lay.spots.filter(q => q.ex); if (ex.length !== 1 || ex[0].side !== 'E' || ex[0].cells.map(c => c.join()).join(';') !== (sw + 1) + ',' + lay.q.er + ';' + (sw + 1) + ',' + (lay.q.er + 1)) bad.push(tag + ' Fluchttuer ' + JSON.stringify(ex.map(q => q.cells)));
          if (lay.posts.length < 10 || D.laneOf(lay).slots.length < 6) bad.push(tag + ' ' + lay.posts.length + ' Posten, ' + D.laneOf(lay).slots.length + ' Wagenplaetze');
        }
        return { bad: bad.slice(0, 10), nbad: bad.length, n, stores: store.size, pumps, minPump: +minPump.toFixed(2), minRoute: +minRoute.toFixed(2) };
      });
      t.note(r.n + ' Karten, Zapfsaeulen je Karte ' + JSON.stringify(r.pumps) + ', kleinster Abstand Saeule zu Tuer ' + r.minPump + ', Route zu Eingang ' + r.minRoute);
      t.eq(r.bad, [], 'Abweichungen (' + r.nbad + ')');
      t.ok(r.n === 400, 'genug generierte Karten: ' + r.n);
      t.ok(r.stores <= 4, 'das Lager mit Safe ist ein fester Block, nur die Hallen-Kisten wechseln (hoechstens vier Raster): ' + r.stores);
    },
  },
  {
    name: 'Tankstelle: Coop zu zweit auf generierten Karten (vier Seeds mit verschiedener Breite, Tiefe und Zapfsaeulenzahl, Host und Client bauen gleich, vom Start bis zum Sieg)',
    timeout: 240000,
    async run(t) {
      const seeds = await t.page.evaluate(() => { const D = __dbg, out = [], seen = new Set(); D.setScenario('gas'); D.setSeedMode('random'); D.setLage([]); D.setTurn('S'); for (let s = 1; s < 300 && out.length < 4; s++) { const q = D.layoutBase(s).q; if (!q) continue; const k = q.np + ':' + (q.sw >= 16 ? 'b' : 'k'); if (!seen.has(k)) { seen.add(k); out.push(s); } } return out; });
      const res = []; for (const s of seeds) res.push(await coopGame(t.env, 'gas', s));
      t.note(res.map(r => r.tag + ' ' + r.stat.hall).join(', '));
      t.eq(res.flatMap(r => r.bad.map(b => r.tag + ': ' + b)), [], 'Abweichungen');
    },
  },
  {
    name: 'Tankstelle: der Bot mit fruehem Rufen gewinnt auf generierten Karten (40 Seeds, kein Haenger, kein frueher Verlust, mindestens 36 Siege)',
    open: { det: true },
    timeout: 280000,
    async run(t) {
      await t.loadTool('bot.js');
      const r = await t.page.evaluate(() => {
        const D = __dbg; D.setScenario('gas'); D.setSeedMode('random'); D.setLage([]); D.setTurn('S');
        let w = 0, to = 0, early = 0, n = 0; for (let s = 5000; s < 5200 && n < 40; s++) { const l = D.layoutBase(s); if (!l.q) continue; n++; const q = bot.run({ sigma: .05, react: .35, kit: 'old', call: 0, van: 'alt', seed: s, turn: 'S' }); if (q.res === 'WIN') w++; else { if (q.res === 'TIMEOUT') to++; if (q.t < 30) early++; } }
        D.setTurn(null); return { w, n, to, early };
      });
      t.ok(r.n === 40 && r.to === 0 && r.early === 0 && r.w >= 36, r.w + ' von ' + r.n + ' Siegen (mindestens 36), ' + r.to + ' Haenger, ' + r.early + ' fruehe Verluste');
    },
  },
];
