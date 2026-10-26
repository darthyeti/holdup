// Kartenvertrag (docs/karte-und-layout.md, Abschnitt Karten-Vertrag): validateMap, laneOf und autoPosts ueber alle Karten und Grundrisse.
// Harte Regeln liefern Fehler (err), Kennzahlen Warnungen (warn). Bekannte Abweichungen stehen unten mit Begruendung, nichts an den Karten wurde dafuer geaendert.
// Jede neue, nicht eingetragene Abweichung laesst den Test scheitern; ein Schnappschuss (golden/27-kartenvertrag.json) haelt Zahlen und Warnungen fest.
const fs = require('fs');
const path = require('path');
const SC = ['bank', 'jewel', 'gas', 'museum', 'casino'];
const N = { bank: 80, jewel: 80, gas: 80, museum: 60, casino: 50 };
// Grundrisse je Karte (LAY.hall), die Bank hat keine Hallen sondern Zufallskarten
const HALLS = {
  jewel: ['Klassik', 'Reihen', 'Salon', 'Ring', 'Gänge'],
  gas: ['Klassik', 'Insel', 'Wandregale', 'Gänge'],
  museum: ['Klassik', 'Kabinette', 'Säulenhalle', 'Ring'],
  casino: ['Klassik', 'Promenade', 'Reihen', 'Staffel'],
};
// Bekannte Abweichungen: Karte -> Regel -> Begruendung. Gilt fuer alle Seeds und Grundrisse der Karte.
// Bekannte, von einem Menschen akzeptierte Abweichungen je Karte (Regel: Begruendung). Seit dem 22. Oktober 2026 leer: Zaun und Props auf der Strasse raeumt clearLane in layoutFor, classicLayout hat wie genLayout nur eine Hintertuer, die Museums-Hintertuer liegt frei. Neue Eintraege nur mit Begruendung, Ziel bleibt leer (Plan Mehr Abwechslung, docs/archiv-gebaute-plaene.md).
const KNOWN = { bank: {}, jewel: {}, gas: {}, museum: {}, casino: {} };
const KNOWN_CLASSIC = {};

const rules = (errs, known) => Object.entries(errs).filter(([k]) => !(k in known)).map(([k, v]) => k + ' x' + v.n + ' (Seeds ' + v.seeds.join(',') + '): ' + v.ex);

module.exports = [
  {
    name: 'Kartenvertrag: MAP_FIELDS steht in der Doku, jede Karte liefert alle Pflichtfelder, kein Feld ist unbekannt',
    async run(t) {
      const r = await t.page.evaluate(() => {
        const D = __dbg, F = D.MAP_FIELDS, out = { dup: [], badGroup: [], missing: {}, unknown: [], names: F.map(f => f[0]) };
        const seen = new Set(); for (const f of F) { if (seen.has(f[0])) out.dup.push(f[0]); seen.add(f[0]); if (!'POEA'.includes(f[1])) out.badGroup.push(f[0]); }
        const keys = new Set();
        for (const sc of ['bank', 'jewel', 'gas', 'museum', 'casino', 'truck']) {
          D.setScenario(sc); D.setSeedMode('random'); D.setLage(null);
          const lay = D.layoutBase(5); Object.keys(lay).forEach(k => keys.add(k));
          const miss = F.filter(f => f[1] === 'P' && lay[f[0]] == null).map(f => f[0]); if (miss.length) out.missing[sc] = miss;
        }
        D.setScenario('bank'); D.setSeedMode('classic'); Object.keys(D.layoutFor('classic')).forEach(k => keys.add(k));
        out.unknown = [...keys].filter(k => !seen.has(k));
        return out;
      });
      t.eq(r.dup, [], 'doppelte Felder');
      t.eq(r.badGroup, [], 'unbekannte Gruppe');
      t.eq(r.missing, {}, 'Pflichtfelder fehlen');
      t.eq(r.unknown, [], 'Felder in LAY, die nicht in MAP_FIELDS stehen (in der Doku nachtragen)');
      const doc = fs.readFileSync(path.join(__dirname, '..', '..', 'docs', 'karte-und-layout.md'), 'utf8');
      const absent = r.names.filter(n => !doc.includes('`' + n + '`'));
      t.eq(absent, [], 'Felder, die in docs/karte-und-layout.md fehlen');
    },
  },
  ...SC.map(sc => ({
    name: 'Kartenvertrag: ' + sc + ' (' + N[sc] + ' Seeds, voller Aufbau): keine unbekannte Abweichung',
    slow: true,
    timeout: 240000,
    async run(t) {
      await t.loadTool('mapcheck.js');
      const r = await t.page.evaluate(([sc, n]) => mapcheck.vsweep(sc, n, 1), [sc, N[sc]]);
      const bad = rules(r.err, KNOWN[sc]);
      t.ok(!bad.length, 'neue Abweichung: ' + bad.join('; '));
      const kn = Object.entries(r.err).filter(([k]) => k in KNOWN[sc]);
      if (kn.length) t.note('bekannt: ' + kn.map(([k, v]) => k + ' x' + v.n + '/' + r.n).join(', '));
      const wn = Object.entries(r.warn); if (wn.length) t.note('Warnungen: ' + wn.map(([k, v]) => k + ' x' + v.n + '/' + r.n).join(', '));
      t.note('Eingaenge: ' + Object.entries(r.entries).map(([k, v]) => k + ' x' + v).join(' ; '));
      const sum = { n: r.n, ok: r.ok, err: Object.fromEntries(Object.entries(r.err).map(([k, v]) => [k, v.n])), warn: Object.fromEntries(Object.entries(r.warn).map(([k, v]) => [k, v.n])), entries: r.entries, range: r.range };
      await t.snapshot('sweep-' + sc, sum);
    },
  })),
  {
    name: 'Kartenvertrag: Bank-Zufallskarten (400 Seeds) und classicLayout',
    timeout: 240000,
    async run(t) {
      await t.loadTool('mapcheck.js');
      const r = await t.page.evaluate(() => {
        const sw = mapcheck.vsweep('bank', 400, 1000, { light: true });
        mapcheck.build('bank', 'classic'); const c = __dbg.validateMap(__dbg.LAY());
        return { sw, classic: c.err.map(e => e.r), classicEntries: c.info.entries.length };
      });
      const bad = rules(r.sw.err, KNOWN.bank);
      t.ok(!bad.length, 'neue Abweichung in Zufallskarten: ' + bad.join('; '));
      t.ok(r.sw.ok >= 200, 'wenigstens die Haelfte der Zufallskarten ohne bekannte Abweichung: ' + r.sw.ok + ' von 400');
      t.note('400 Seeds: ohne Abweichung ' + r.sw.ok + '; ' + Object.entries(r.sw.err).map(([k, v]) => k + ' x' + v.n).join(', '));
      const cnt = {}; for (const [k, v] of Object.entries(r.sw.entries)) { const n = k.split(' | ').length; cnt[n] = (cnt[n] || 0) + v; }
      t.note('Aussen-Eingaenge der Zufallskarten: ' + Object.entries(cnt).map(([n, v]) => n + ' Eingaenge x' + v).join(', '));
      t.eq(r.classic.filter(k => !(k in KNOWN_CLASSIC)), [], 'classicLayout: nur bekannte Abweichungen');
      t.note('classicLayout: ' + r.classic.join(', ') + ' (' + r.classicEntries + ' Eingaenge)');
    },
  },
  {
    // Tills Fund (Oktober 2026): Auf dem Parkplatz der Bank stand ein Auto genau vor dem Zauntor, von der Strasse kam man nicht auf den Platz.
    // Ohne CFG.map.gate waren es 39 von 1000 Seeds ganz zugestellt (26 davon gespiegelt) und 70 mit nur einer freien Kachel. CFG.map.gate haelt die zwei Reihen vor dem Zaun frei.
    name: 'Kartenvertrag: Bank-Parkplatztor ist in 1000 Seeds nie zugestellt (Auto, Kiste, Fass, Pflanze, auch gespiegelt)',
    timeout: 240000,
    async run(t) {
      const r = await t.page.evaluate(() => {
        const D = __dbg; D.setScenario('bank'); D.setSeedMode('random'); D.setLage([]);
        const bad = []; let flip = 0;
        for (let sd = 1; sd <= 1000; sd++) {
          const lay = D.layoutFor(sd), v = D.validateMap(lay);
          if (lay.flip) flip++;
          if (v.info.gates !== 1) bad.push(sd + ': ' + v.info.gates + ' Tore');
          if (v.err.some(e => e.r === 'tor-verstellt') || v.warn.some(e => e.r === 'tor-eng')) bad.push(sd + ': Tor verstellt');
        }
        return { flip, nb: bad.length, bad: bad.slice(0, 5) };
      });
      t.eq(r.bad, [], 'Seeds mit verstelltem oder fehlendem Tor (' + r.nb + ')');
      t.ok(r.flip > 300, 'gespiegelte Karten kamen vor: ' + r.flip);
      t.note('1000 Seeds (' + r.flip + ' gespiegelt), Tor immer frei');
    },
  },
  {
    name: 'Kartenvertrag: alle Grundrisse von Juwelier, Tankstelle, Museum und Casino bestehen (je 5 Seeds)',
    timeout: 240000,
    async run(t) {
      await t.loadTool('mapcheck.js');
      const r = await t.page.evaluate(HALLS => {
        const D = __dbg, out = { halls: {}, bad: [] };
        for (const sc of Object.keys(HALLS)) {
          D.setScenario(sc); D.setSeedMode('random'); D.setLage(null);
          const by = {}; for (let s = 1; s < 3000; s++) { const h = D.layoutFor(s).hall; (by[h] = by[h] || []).length < 5 && by[h].push(s); }
          out.halls[sc] = Object.keys(by).sort();
          for (const h of Object.keys(by)) for (const s of by[h]) {
            const rep = mapcheck.validate(sc, s, { light: true });
            for (const e of rep.err) out.bad.push(sc + '/' + h + '#' + s + ' ' + e.r + ': ' + e.m);
          }
          // ein voller Aufbau je Grundriss (Reset, gesperrte Tueren) gibt dasselbe
          for (const h of Object.keys(by)) { const rep = mapcheck.validate(sc, by[h][0]); const lt = mapcheck.validate(sc, by[h][0], { light: true }); if (JSON.stringify(rep.err.map(e => e.r)) !== JSON.stringify(lt.err.map(e => e.r))) out.bad.push(sc + '/' + h + ': Aufbau und layoutFor weichen ab ' + rep.err.map(e => e.r) + ' / ' + lt.err.map(e => e.r)); }
        }
        return out;
      }, HALLS);
      for (const sc of Object.keys(HALLS)) t.eq(r.halls[sc], HALLS[sc].slice().sort(), sc + ': alle Grundrisse gefunden');
      const bad = r.bad.filter(m => { const sc = m.split('/')[0], rule = (/ ([a-z-]+): /.exec(m) || [])[1]; return !(rule in KNOWN[sc]); });
      t.eq(bad, [], 'neue Abweichungen in Grundrissen');
    },
  },
  {
    name: 'Kartenvertrag: Transporter (Klasse Strasse) prueft Welt, Start, Fluchtzone, Fluchtwagen-Weg, Wagenplaetze, Posten und ueberspringt den Rest',
    async run(t) {
      await t.loadTool('mapcheck.js');
      const r = await t.page.evaluate(() => {
        const out = [];
        for (let s = 1; s <= 30; s += 3) { const rep = mapcheck.validate('truck', s); out.push({ cls: rep.cls, err: rep.err, skipped: rep.skipped, info: rep.info }); }
        return out;
      });
      t.ok(r.every(x => x.cls === 'street'), 'Klasse Strasse');
      t.eq(r.flatMap(x => x.err), [], 'Transporter besteht die Strassen-Regeln');
      t.ok(r.every(x => /Strassenkarte/.test(x.skipped)), 'Begruendung fuers Ueberspringen');
      t.ok(r[0].info.slots > 0 && r[0].info.posts > 0 && r[0].info.zone[0] > 0 && !('entries' in r[0].info), 'Strassenregeln liefen, Gebaeuderegeln nicht');
    },
  },
  {
    name: 'Kartenvertrag: die Regeln schlagen an (Negativproben auf dem Juwelier)',
    timeout: 120000,
    async run(t) {
      await t.page.evaluate(() => { __dbg.CFG.meet.p = 0; });   // geprueft wird die Karte ohne Treffpunkt abseits (109)
      await t.loadTool('mapcheck.js');
      const r = await t.page.evaluate(() => {
        const D = __dbg, out = {};
        // Juwelier Seed 1 ohne Aufbau (layoutFor allein, das Raster ist dann noch ohne verriegelte Tueren), danach eine Aenderung an Raster oder Feldern, danach die Pruefung (findSpots laeuft dabei neu)
        const run = (name, f) => {
          D.setScenario('jewel'); D.CFG.jewGen.on = 0; D.setSeedMode('random'); D.setLage([]);
          const lay = D.layoutBase(1), w = D.world(); f(w.setc, lay, w);
          const rep = D.validateMap(lay);
          out[name] = { err: rep.err.map(e => e.r), warn: rep.warn.map(e => e.r) };
        };
        run('ohne', () => { });
        run('spawn', (c, l) => { l.spawn = { x: 5 * 32, y: 5 * 32 }; });
        run('eingaenge-zuviel', c => { c(3, 13, 'D'); c(6, 13, 'D'); });
        run('eingaenge-zuwenig', (c, l) => { c(17, 0, '#'); c(23, 7, '#'); c(23, 8, '#'); l.backDoors = []; });
        run('vordertuer', c => { c(11, 13, '#'); c(12, 13, '#'); });
        run('fluchtweg', c => c(28, 8, 'k'));
        run('wagenplatz', c => c(14, 19, 'k'));
        run('aussteigen', c => c(14, 17, 'k'));
        run('posten', (c, l) => c(l.posts[0].x, l.posts[0].y, 'k'));
        run('fluchtzone', c => { for (let x = 24; x <= 27; x++) for (let y = 6; y <= 9; y++) c(x, y, 'k'); });
        run('beute-ziel', (c, l) => { l.tills = []; l.atms = []; l.vault.bundles = []; l.vit = []; l.goods = undefined; });
        run('beute-stueck', (c, l) => { for (let x = -6; x <= -2; x++) for (let y = -4; y <= 0; y++) c(x, y, '#'); l.tills = [[-4, -2]]; });
        run('material', (c, l, w) => { for (let y = w.WY0; y < w.WY0 + w.H; y++) for (let x = w.WX0; x < w.WX0 + w.W; x++) if ('emb'.includes(w.cell(x, y))) c(x, y, 'o'); });
        run('route', (c, l) => { l.guards = [{ p: [0, 0], route: [[0, 0], [1, 1]] }]; });
        run('lobby', (c, l) => { l.civ = 3; l.lobby = [0, 0, 0, 0]; });
        run('eingang-weg', c => c(17, -1, 'k'));
        run('eingang-verstellt', c => c(17, 1, 'e'));
        run('feld', (c, l) => { delete l.theme; });
        run('weg-warnung', (c, l) => { D.CFG.val.pathSV = [60, 70]; });
        D.CFG.val.pathSV = [8, 30];
        const sv = D.CFG.val.minW; D.CFG.val.minW = 100; run('welt', () => { }); D.CFG.val.minW = sv;
        // Zauntor der Bank (Parkplatz): ein Auto davor stellt es zu (Fehler), ein halb verstelltes Tor ist eine Warnung
        D.setScenario('bank'); D.setSeedMode('random'); D.setLage([]);
        const gate = f => { const lay = D.layoutBase(5), w = D.world(), B = lay.bld, gy = B.y1 + 1; let gx = -1; for (let x = B.x1 + 1; x < w.WX0 + w.W - 1; x++) if (!D.isSol(x, gy)) { gx = x; break; } f(w.setc, gx, gy); const rep = D.validateMap(lay); return { err: rep.err.map(e => e.r), warn: rep.warn.map(e => e.r) }; };
        out['tor-ganz'] = gate((c, gx, gy) => { c(gx, gy - 1, 'v'); c(gx + 1, gy - 1, 'v'); });
        out['tor-halb'] = gate((c, gx, gy) => { c(gx, gy - 1, 'v'); });
        out['tor-frei'] = gate(() => { });
        return out;
      });
      t.eq(r.ohne, { err: [], warn: [] }, 'der unveraenderte Juwelier ist sauber');
      const want = { spawn: 'spawn', 'eingaenge-zuviel': 'eingaenge', 'eingaenge-zuwenig': 'eingaenge', vordertuer: 'vordertuer', fluchtweg: 'fluchtweg', wagenplatz: 'wagenplatz', aussteigen: 'aussteigen', posten: 'posten', fluchtzone: 'fluchtzone', 'beute-ziel': 'beute-ziel', 'beute-stueck': 'beute-stueck', material: 'material', route: 'route', lobby: 'lobby', 'eingang-weg': 'eingang-weg', feld: 'feld', welt: 'welt' };
      for (const [k, rule] of Object.entries(want)) t.ok(r[k].err.includes(rule), k + ': Regel "' + rule + '" muss anschlagen, bekam ' + JSON.stringify(r[k]));
      t.ok(r['eingang-verstellt'].warn.includes('eingang-verstellt') && !r['eingang-verstellt'].err.includes('eingang-weg'), 'Tuer hinter zerlegbarem Moebel ist nur eine Warnung: ' + JSON.stringify(r['eingang-verstellt']));
      t.ok(r['weg-warnung'].warn.includes('weg-start-tresor'), 'Weg Start zu Tresor ausserhalb des Richtwerts warnt: ' + JSON.stringify(r['weg-warnung']));
      t.ok(r['tor-ganz'].err.includes('tor-verstellt'), 'Auto vor dem Zauntor ist ein Fehler: ' + JSON.stringify(r['tor-ganz']));
      t.ok(r['tor-halb'].warn.includes('tor-eng') && !r['tor-halb'].err.includes('tor-verstellt'), 'halb verstelltes Zauntor ist nur eine Warnung: ' + JSON.stringify(r['tor-halb']));
      t.ok(!r['tor-frei'].err.includes('tor-verstellt') && !r['tor-frei'].warn.includes('tor-eng'), 'freies Zauntor ist sauber: ' + JSON.stringify(r['tor-frei']));
    },
  },
  {
    name: 'Kartenvertrag: laneOf beschreibt die Strasse (Achse, Lage, Normale, Seite, Plaetze, Fluchtwagen, Fluchtzone), auch gespiegelt',
    timeout: 120000,
    async run(t) {
      const r = await t.page.evaluate(() => {
        const D = __dbg, T = 32, bad = [], seen = { flip: 0, plain: 0 };
        for (const sc of ['bank', 'jewel', 'gas', 'museum', 'casino', 'truck']) {
          D.setScenario(sc); D.setSeedMode('random'); D.setLage([]);
          for (let s = 1; s < (sc === 'bank' ? 60 : 8); s += 3) {
            const lay = D.layoutBase(s), ln = D.laneOf(lay), tag = sc + '#' + s;
            if (lay.flip) seen.flip++; else seen.plain++;
            if (ln.axis !== 'x' || ln.side !== 'S' || ln.n[0] !== 0 || ln.n[1] !== -1 || ln.pos !== lay.laneY) bad.push(tag + ' Achse/Seite/Lage');
            // Normale zeigt zum Gebaeude
            const cy = (lay.bld.y0 + lay.bld.y1 + 1) * T / 2; if (!((cy - ln.pos) * ln.n[1] > 0)) bad.push(tag + ' Normale zeigt nicht zum Gebaeude');
            if (ln.slots.length !== lay.slots.W.length + lay.slots.E.length) bad.push(tag + ' Plaetze');
            for (const sl of ln.slots) { if (sl.curb[1] >= ln.row) bad.push(tag + ' Aussteigepunkt nicht auf der Gebaeudeseite'); if (!sl.cells.some(c => c[0] === sl.u && c[1] === ln.row)) bad.push(tag + ' Platz ohne Spurkachel'); }
            if (!ln.van.swept.some(c => c[0] === Math.floor(lay.van.stop / T) && c[1] === Math.floor(lay.van.y / T))) bad.push(tag + ' Fahrstrecke ohne Haltepunkt');
            // Fluchtzone liegt in Richtung dir hinter der Linie
            if (!ln.exit.cells.every(c => (c[0] * T + 16 - lay.exit.x) * lay.exit.dir > 0)) bad.push(tag + ' Fluchtzone liegt nicht hinter der Linie');
            // Rest bis zum Weltrand liegt auf der Startseite des Wagens
            if (ln.van.rest.length && !ln.van.rest.every(c => lay.van.dir < 0 ? c[0] * T >= lay.van.x0 : c[0] * T < lay.van.x0)) bad.push(tag + ' Rest liegt auf der falschen Seite');
          }
        }
        return { bad, seen };
      });
      t.eq(r.bad, [], 'Strassen-Eigenschaften');
      t.ok(r.seen.flip > 0 && r.seen.plain > 0, 'gespiegelte und ungespiegelte Karten kamen vor: ' + JSON.stringify(r.seen));
    },
  },
  {
    name: 'Kartenvertrag: autoPosts (Posten und Wagenplaetze aus der Geometrie) im Vergleich zur Handliste, nichts wird ersetzt',
    timeout: 180000,
    async run(t) {
      await t.page.evaluate(() => { __dbg.CFG.meet.p = 0; });   // beim Treffpunkt abseits (109) sind die Posten abgeleitet, hier zaehlt die Handliste
      await t.loadTool('mapcheck.js');
      const r = await t.page.evaluate(() => {
        const out = {}, runs = { bank: [5000, 5037, 5074, 5111], jewel: [1], gas: [1], museum: [1], casino: [1] };
        __dbg.CFG.gasGen.on = 0; __dbg.CFG.jewGen.on = 0; __dbg.CFG.museumGen.on = 0; __dbg.CFG.casinoGen.on = 0;   // der Vergleich mit der Handliste gilt fuer die Klassik-Huelle (die generierten Tankstellen, Juweliere, Museen und Casinos haben abgeleitete Listen)
        for (const sc of Object.keys(runs)) out[sc] = runs[sc].map(s => mapcheck.autocmp(sc, s));
        // Gesund: jeder abgeleitete Posten steht frei und ist von der Strasse erreichbar (validateMap-Regeln auf die abgeleitete Liste)
        const bad = [], D = __dbg;
        for (const sc of Object.keys(runs)) for (const s of runs[sc]) {
          D.setScenario(sc); D.setSeedMode('random'); D.setLage([]); const lay = D.layoutBase(s), A = D.autoPosts(lay), w = D.world();
          for (const p of A.posts) if (w.isSol(p.x, p.y)) bad.push(sc + '#' + s + ' Posten in Festem ' + p.x + ',' + p.y);
          const hand = lay.posts; lay.posts = A.posts; lay.slots = A.slots;
          const rep = D.validateMap(lay); for (const e of rep.err) if (e.r === 'posten' || e.r === 'aussteigen') bad.push(sc + '#' + s + ' ' + e.m);
          lay.posts = hand;
        }
        return { out, bad };
      });
      t.eq(r.bad, [], 'abgeleitete Posten sind frei und erreichbar');
      const sum = {};
      for (const [sc, list] of Object.entries(r.out)) {
        sum[sc] = list.map(c => ({ seed: c.seed, flip: c.flip, hand: c.hand, auto: c.auto, hit: c.hit, hit3: c.hit3, bySide: c.bySide, doorsEqual: JSON.stringify(c.doors.hand) === JSON.stringify(c.doors.auto), anchors: c.anchors, slots: c.slots, order: c.order, handMiss: c.handMiss, autoExtra: c.autoExtra }));
        const c0 = list[0];
        t.note(sc + ' #' + c0.seed + ': Posten von Hand ' + c0.hand + ', abgeleitet ' + c0.auto + ', innerhalb 1,5 Kacheln getroffen ' + c0.hit + ', innerhalb 3 Kacheln ' + c0.hit3 + '; Tuerposten ' + (JSON.stringify(c0.doors.hand) === JSON.stringify(c0.doors.auto) ? 'gleich' : 'verschieden') + '; Wagenplaetze Versatz W ' + c0.slots.shiftW + ' E ' + c0.slots.shiftE);
      }
      await t.snapshot('autoposts', sum);
    },
  },
];
