// MRU 1 B1 (docs/major-release-update-1.md, docs/ideen-und-planung.md, Skillbaum-Umbau, beschlossen von Till am 25. Oktober 2026): Der Skillbaum bekommt eine neue Struktur und ein neues Fenster.
// Struktur: je Baum eine Wurzel (k0), zwei Pfade (k1 und k2, offen mit Wurzel 3 von 3, ENTWEDER-ODER: der erste Punkt in einem Pfad sperrt den anderen) und hinter jedem Pfad ein Gegenstand (k3 hinter k1,
// k4 hinter k2, offen mit dem Pfad auf 3). Die sechs Gegenstaende sind in B1 noch nicht gebaut (soon, nicht kaufbar, B2 bis B5). Zaeh, Verhandler und Fahrer sind kein eigener Knoten mehr, sondern kommen mit Stufe 3
// von Deckung (V2), Sanitaeter (U1) und Techniker (U2, frueher Schleicher). Punkte lassen sich bis zum Verlassen des Shops zuruecknehmen (nur im aktuellen Besuch gekaufte Stufen, nichts Abhaengiges darauf).
// Die Zusaetze mit Stufe 3 gibt es in allen sechs Pfaden: Laeufer (Ruhige Hand, Laufen kostet keine Zusatzstreuung), Durchschuss (Durchschlag, die Kugel trifft auch den Beamten dahinter mit halbem Schaden),
// Materialsammler (Baumeister, jedes Moebelstueck gibt ein Material mehr), dazu Zaeh, Verhandler, Fahrer (Tills Wunsch vom 25. Oktober 2026: Go fuer 1 bis 3 noch oben drauf).
// Fenster: drei Zeilen (Angriff, Verteidigung, Unterstuetzung), links die Wurzel, in der Mitte die zwei Pfade untereinander mit ODER dazwischen, rechts je Pfad der Gegenstand, keine Kreuzlinien; wer einen Knoten
// anwaehlt, sieht die Kette von der Wurzel bis dorthin leuchten; der gesperrte Nachbarpfad nennt den Grund (verbaut).
module.exports = [
  {
    name: 'Skillbaum-Umbau: Entweder-oder (der erste Punkt in einem Pfad sperrt den anderen, in beiden Richtungen, in allen drei Baeumen), Gegenstaende sind noch nicht kaufbar, die Namen stimmen',
    async run(t) {
      const r = await t.page.evaluate(() => {
        const D = __dbg, S = D.CFG.skill, out = { names: {}, trees: {} };
        for (const id of D.SKID) out.names[id] = S[id].n;
        for (const k of ['A', 'V', 'U']) {
          const o = {}; D.sessReset(); D.SESSION.pts = 30; const ok = id => D.skOk(D.SESSION.sk, id), buy = id => D.skillBuy(id), blk = id => D.skBlock(D.SESSION.sk, id);
          for (let i = 0; i < 3; i++) buy(k + '0');
          o.pfade = [ok(k + '1'), ok(k + '2')]; o.frei = [blk(k + '1'), blk(k + '2')];
          buy(k + '1'); o.nach1 = [blk(k + '1'), blk(k + '2'), ok(k + '2')]; const p = D.SESSION.pts; o.kaufB = buy(k + '2'); o.ptsB = D.SESSION.pts - p;
          buy(k + '1'); buy(k + '1'); o.item = [ok(k + '3'), buy(k + '3'), ok(k + '4'), buy(k + '4')]; o.sk = Object.assign({}, D.SESSION.sk);
          D.sessReset(); D.SESSION.pts = 30; for (let i = 0; i < 3; i++) buy(k + '0'); buy(k + '2'); o.umgekehrt = [blk(k + '1'), blk(k + '2'), ok(k + '1'), buy(k + '1')];
          out.trees[k] = o;
        }
        return out;
      });
      t.eq(r.names, { A0: 'Munition', A1: 'Ruhige Hand', A2: 'Durchschlag', A3: 'Präzisionsgewehr', A4: 'Granatwerfer', V0: 'Panzerung', V1: 'Baumeister', V2: 'Deckung', V3: 'Barrikaden-Mine', V4: 'Claymore',
        U0: 'Werkzeug', U1: 'Sanitäter', U2: 'Techniker', U3: 'Notfallkoffer', U4: 'C4' }, 'Namen und Zuordnung der Knoten');
      for (const k of ['A', 'V', 'U']) {
        const o = r.trees[k];
        t.eq(o.pfade, [true, true], k + ': Wurzel 3 von 3 schaltet beide Pfade frei');
        t.eq(o.frei, [null, null], k + ': vor der Wahl ist kein Pfad verbaut');
        t.eq(o.nach1, [null, k + '1', false], k + ': der erste Punkt in Pfad 1 sperrt Pfad 2 (verbaut durch ' + k + '1)');
        t.eq([o.kaufB, o.ptsB], [false, 0], k + ': der gesperrte Pfad laesst sich nicht kaufen und kostet nichts');
        t.eq(o.item, [false, false, false, false], k + ': die Gegenstaende sind in B1 nicht kaufbar (noch nicht gebaut)');
        t.eq([o.sk[k + '0'], o.sk[k + '1'], o.sk[k + '2'], o.sk[k + '3'], o.sk[k + '4']], [3, 3, undefined, undefined, undefined], k + ': eine Kette, Wurzel und Pfad 1 auf 3');
        t.eq(o.umgekehrt, [k + '2', null, false, false], k + ': mit Pfad 2 zuerst ist Pfad 1 verbaut');
      }
    },
  },
  {
    name: 'Skillbaum-Umbau: Punkte zuruecknehmen bis zum Verlassen des Shops (nur im Besuch gekaufte Stufen, nichts Abhaengiges darauf, der Punkt kommt zurueck, der Pfad ist wieder frei), danach endgueltig; das Kit folgt',
    async run(t) {
      const r = await t.page.evaluate(() => {
        const D = __dbg, o = {}; const sell = id => D.skillSell(id), buy = id => D.skillBuy(id), S = () => Object.assign({}, D.SESSION.sk);
        // ein frueherer Besuch hat A0 auf 3 gebracht, dieser Besuch kauft A1 zweimal
        D.sessReset(); D.SESSION.pts = 10; D.SESSION.sk = { A0: 3 }; D.openShop();
        buy('A1'); buy('A1'); o.k1 = [S(), D.SESSION.pts]; o.blockB = D.skBlock(D.SESSION.sk, 'A2');
        o.alt = [sell('A0'), D.skCanSell(D.SESSION.sk, 'A0')];             // A0 stammt aus einem frueheren Besuch
        o.a1 = [sell('A1'), S(), D.SESSION.pts]; o.a2 = [sell('A1'), S(), D.SESSION.pts]; o.a3 = sell('A1');
        o.frei = [D.skBlock(D.SESSION.sk, 'A2'), D.skOk(D.SESSION.sk, 'A2')]; o.kit = D.curKit().sk;
        // ganz neu: Wurzel und Pfad im selben Besuch, Rücknahme nur von oben nach unten
        D.sessReset(); D.SESSION.pts = 10; D.openShop(); for (let i = 0; i < 3; i++) buy('V0'); buy('V1');
        o.kette = [D.skCanSell(D.SESSION.sk, 'V0'), D.skCanSell(D.SESSION.sk, 'V1'), sell('V0')];
        sell('V1'); o.v0 = [sell('V0'), D.SESSION.sk.V0, D.skOk(D.SESSION.sk, 'V1')]; sell('V0'); sell('V0'); o.leer = [S(), D.SESSION.pts];
        // Verlassen des Shops: die naechste Runde macht alles endgueltig
        D.sessReset(); D.SESSION.pts = 5; D.openShop(); buy('U0'); o.vorher = D.skCanSell(D.SESSION.sk, 'U0'); D.reset(); o.nachher = [D.skCanSell(D.SESSION.sk, 'U0'), sell('U0'), D.SESSION.sk.U0];
        // ohne Schnappschuss (nie ein Shop geoeffnet) ist nichts rueckgaengig zu machen, und Unbekanntes tut nichts
        D.sessReset(); D.SESSION.pts = 5; D.SESSION.sk = { U0: 1 }; o.ohne = [D.skCanSell(D.SESSION.sk, 'U0'), D.skCanSell(D.SESSION.sk, 'Z9'), sell('Z9')];
        return o;
      });
      t.eq(r.k1, [{ A0: 3, A1: 2 }, 8], 'zwei Stufen A1 gekauft, zwei Punkte weniger (10 auf 8)');
      t.eq(r.blockB, 'A1', 'A2 ist verbaut');
      t.eq(r.alt, [false, false], 'A0 stammt aus einem frueheren Besuch und bleibt');
      t.eq(r.a1, [true, { A0: 3, A1: 1 }, 9], 'eine Stufe zurueck, der Punkt kommt wieder');
      t.eq(r.a2, [true, { A0: 3 }, 10], 'die letzte Stufe zurueck, A1 ist aus dem Kit verschwunden');
      t.eq(r.a3, false, 'mehr als gekauft geht nicht zurueck');
      t.eq(r.frei, [null, true], 'A2 ist wieder frei und kaufbar');
      t.eq(r.kit, { A0: 3 }, 'das Kit folgt der Rücknahme');
      t.eq(r.kette, [false, true, false], 'unter der Wurzel steht ein Pfad: erst den Pfad zurücknehmen, dann die Wurzel');
      t.eq(r.v0, [true, 2, false], 'danach geht die Wurzel (3 auf 2), und die Pfade sind wieder zu');
      t.eq(r.leer, [{}, 10], 'alles zurueckgenommen: kein Knoten mehr, alle zehn Punkte wieder da');
      t.eq([r.vorher, r.nachher], [true, [false, false, 1]], 'nach dem Verlassen des Shops (naechste Runde) ist der Kauf endgueltig');
      t.eq(r.ohne, [false, false, false], 'ohne Schnappschuss und bei Unbekanntem passiert nichts');
    },
  },
  {
    name: 'Skillbaum-Umbau: Zaeh, Verhandler und Fahrer kommen erst mit Stufe 3 (Deckung, Sanitaeter, Techniker), darunter gibt es nur die Werte des Pfades; Sprengmeister, Jaeger und Bollwerk haben keine Werte mehr',
    async run(t) {
      const r = await t.page.evaluate(() => {
        const D = __dbg, o = {}, lv = (id, key) => [1, 2, 3].map(r => D.skv({ sk: { [id]: r } }, id, key));
        o.run = lv('A1', 'run'); o.pierce = lv('A2', 'pierce'); o.mat = lv('V1', 'mat'); o.sw = lv('V2', 'sw'); o.lean = lv('V2', 'lean'); o.cap = lv('U1', 'cap'); o.heat = lv('U1', 'heat'); o.rev = lv('U1', 'rev'); o.van = lv('U2', 'van'); o.sus = lv('U2', 'sus');
        D.setScenario('bank'); D.setSeedMode('random'); D.setLage([]); D.setTurn('S'); D.buildSeed(5017); D.CFG.policeAt = 1e6; D.CFG.policeForced = 1e6;
        o.marker = [0, 1, 2, 3].map(r => { D.sessReset(); if (r) D.SESSION.sk.V2 = r; D.reset(); return D.get().me.sw; });
        o.gone = ['A3', 'A4', 'V3', 'V4', 'U3', 'U4'].map(id => Object.keys(D.CFG.skill[id]).filter(k => Array.isArray(D.CFG.skill[id][k])));
        return o;
      });
      t.eq(r.run, [0, 0, 1], 'Laeufer: erst mit Ruhige Hand 3, die Zusatzstreuung beim Laufen faellt ganz weg');
      t.eq(r.pierce, [0, 0, .5], 'Durchschuss: erst mit Durchschlag 3, der Beamte dahinter bekommt die Haelfte');
      t.eq(r.mat, [0, 0, 1], 'Materialsammler: erst mit Baumeister 3, ein Material mehr je Moebelstueck');
      t.eq(r.sw, [0, 0, .45], 'Zaeh: erst mit Deckung 3, 45 % Leben');
      t.eq(r.cap, [0, 0, 16], 'Verhandler: erst mit Sanitaeter 3, 16 s Aufschub');
      t.eq(r.heat, [0, 0, .5], 'Verhandler: erst mit Sanitaeter 3, Fahndung durch Geiseln halbiert');
      t.eq(r.van, [0, 0, 8], 'Fahrer: erst mit Techniker 3, 8 s frueher');
      t.eq(r.lean, [.25, .4, .55], 'Deckung bringt weiter 25 / 40 / 55 % weniger Schaden beim Lehnen');
      t.eq(r.rev, [.25, .4, .55], 'Sanitaeter bringt weiter das schnellere Wiederbeleben');
      t.eq(r.sus, [.1, .2, .3], 'Techniker (frueher Schleicher) bringt weiter den langsameren Verdacht');
      t.eq(r.marker, [0, 0, 0, 1], 'der Zaeh-Marker am Spieler (sw) steht nur mit Deckung 3');
      t.eq(r.gone, [[], [], [], [], [], []], 'die Gegenstaende haben noch keine Wirkungswerte (B2 bis B5 bauen sie)');
    },
  },
  {
    name: 'Skillbaum-Fenster: drei Zeilen, links die Wurzel, in der Mitte die zwei Pfade untereinander, rechts je Pfad der Gegenstand (kein Kreuz), ODER dazwischen, Text bleibt in den Knoten, nichts ueberlappt',
    async run(t) {
      await t.loadTool('loopnet.js'); await t.loadInpage('menu.js'); await t.loadInpage('overlap.js');
      const r = await t.page.evaluate(() => {
        const d = MT.solo(null, 's'), o = { bad: [] }; d.sessReset(); d.SESSION.round = 2; d.SESSION.pts = 4; d.openShop(); d.ui().tiles(); MT.k(d, 'k');
        const T = id => d.ui().tiles().find(q => q.id === id), cy = q => q.y + q.h / 2;
        const rows = ['A', 'V', 'U'].map(k => ({ k, root: T('sk:' + k + '0'), p1: T('sk:' + k + '1'), p2: T('sk:' + k + '2'), i1: T('sk:' + k + '3'), i2: T('sk:' + k + '4') }));
        for (const w of rows) {
          const { k, root, p1, p2, i1, i2 } = w; if (![root, p1, p2, i1, i2].every(Boolean)) { o.bad.push(k + ': Knoten fehlt'); continue; }
          if (!(root.x + root.w < p1.x && p1.x + p1.w < i1.x)) o.bad.push(k + ': Reihenfolge Wurzel, Pfad, Gegenstand von links nach rechts');
          if (p1.x !== p2.x || i1.x !== i2.x) o.bad.push(k + ': die zwei Pfade und die zwei Gegenstaende stehen nicht untereinander');
          if (!(p1.y + p1.h + 8 <= p2.y)) o.bad.push(k + ': Pfad 1 liegt nicht ueber Pfad 2 (Luft fuer ODER fehlt)');
          if (i1.y !== p1.y || i2.y !== p2.y) o.bad.push(k + ': Gegenstand nicht auf der Hoehe seines Pfades (Kreuz)');
          if (Math.abs(cy(root) - (cy(p1) + cy(p2)) / 2) > 2) o.bad.push(k + ': Wurzel nicht mittig zu den Pfaden');
          if (root.w < 160 || p1.w < 200 || i1.w < 180 || root.h < 50 || p1.h < 50) o.bad.push(k + ': Knoten zu klein ' + [root.w, p1.w, i1.w, root.h].join('/'));
        }
        if (!(rows[0].p2.y + rows[0].p2.h < rows[1].p1.y && rows[1].p2.y + rows[1].p2.h < rows[2].p1.y)) o.bad.push('Zeilen Angriff, Verteidigung, Unterstuetzung ueberlappen oder stehen nicht untereinander');
        const all = d.ui().tiles(); for (const q of all) if (q.x < 40 || q.x + q.w > 920 || q.y < 20 || q.y + q.h > 524) o.bad.push('ausserhalb des Fensters: ' + q.id);
        // Texte im Zeichenlauf: ODER zaehlen, Texte, die in einem Knoten beginnen, muessen darin enden
        const ctx = d.cv.getContext('2d'), orig = ctx.fillText, log = [];
        ctx.fillText = function (s, x, y) { const al = ctx.textAlign, w = ctx.measureText(String(s)).width; log.push({ s: String(s), x0: al === 'center' ? x - w / 2 : al === 'right' ? x - w : x, w, y }); return orig.apply(this, arguments); };
        try { d.draw(); } finally { ctx.fillText = orig; }
        const start = log.findIndex(l => l.s === 'FÄHIGKEITEN'), fenster = start < 0 ? [] : log.slice(start);   // vorher zeichnet der Shop darunter
        o.oder = fenster.filter(l => l.s === 'ODER').length; o.fenster = fenster.length; o.tags = ['+Läufer', '+Durchschuss', '+Sammler', '+Zäh', '+Verhandler', '+Fahrer'].filter(x => fenster.some(l => l.s === x));
        for (const q of all.filter(q => /^sk:/.test(q.id))) { const inn = fenster.filter(l => l.x0 >= q.x - .5 && l.x0 <= q.x + q.w && l.y >= q.y && l.y <= q.y + q.h); if (inn.length < 2) o.bad.push(q.id + ': zu wenig Text im Knoten (' + inn.length + ')'); for (const l of inn) if (l.x0 + l.w > q.x + q.w - 2) o.bad.push(q.id + ': "' + l.s.slice(0, 30) + '" ragt aus dem Knoten'); }
        o.ov = OV.check(d, { modal: true });
        return o;
      });
      t.eq(r.bad, [], 'Layout: ' + JSON.stringify(r.bad));
      t.ok(r.fenster > 50, 'das Fenster wurde gezeichnet (' + r.fenster + ' Texte)');
      t.eq(r.oder, 3, 'je Baum ein ODER zwischen den Pfaden');
      t.eq(r.tags, ['+Läufer', '+Durchschuss', '+Sammler', '+Zäh', '+Verhandler', '+Fahrer'], 'jeder der sechs Pfade mit Zusatz zeigt ihn im Knoten');
      t.eq(r.ov, [], 'Ueberlappungen von Text, Kacheln und Rand: ' + JSON.stringify(r.ov));
    },
  },
  {
    name: 'Skillbaum-Fenster: Aufleuchten der Kette (Wurzel bis zum angewaehlten Knoten), der gesperrte Nachbarpfad nennt den Grund, Gegenstaende zeigen folgt, Rücknahme per Entf-Kachel und Rueckschritt',
    async run(t) {
      await t.loadTool('loopnet.js'); await t.loadInpage('menu.js');
      const r = await t.page.evaluate(() => {
        const d = MT.solo(null, 's'), o = {}; d.sessReset(); d.SESSION.round = 2; d.SESSION.pts = 4; d.openShop(); d.ui().tiles(); MT.k(d, 'k');
        const glow = () => d.ui().tiles().filter(q => q.glow).map(q => q.id.slice(3)).sort();
        const texts = () => { const ctx = d.cv.getContext('2d'), orig = ctx.fillText, log = []; ctx.fillText = function (s) { log.push(String(s)); return orig.apply(this, arguments); }; try { d.draw(); } finally { ctx.fillText = orig; } return log; };
        MT.hover(d, 'sk:A3'); o.itemKette = glow(); MT.hover(d, 'sk:A2'); o.pfadKette = glow(); MT.hover(d, 'sk:V0'); o.wurzel = glow(); MT.hover(d, 'sk:U4'); o.uKette = glow();
        o.itemText = texts().filter(s => /folgt/i.test(s)).length > 0;
        for (let i = 0; i < 3; i++) MT.click(d, 'sk:A0'); MT.click(d, 'sk:A1'); o.gekauft = [Object.assign({}, d.SESSION.sk), d.SESSION.pts];
        MT.hover(d, 'sk:A2'); const tx = texts(); o.grund = tx.filter(s => /verbaut/i.test(s)); o.grundName = tx.some(s => /Ruhige Hand/.test(s));
        o.kette2 = glow(); o.lock = d.ui().tiles().find(q => q.id === 'sk:A2').lock;
        MT.click(d, 'sk:A2'); o.nochmal = [d.SESSION.sk.A2, d.SESSION.pts];
        // Ruecknahme: Rückschritt auf dem angewaehlten Knoten und die Kachel
        o.undoTile = !!d.ui().tiles().find(q => q.id === 'skundo');
        MT.hover(d, 'sk:A1'); MT.k(d, 'Backspace'); o.back1 = [d.SESSION.sk.A1, d.SESSION.pts];
        MT.hover(d, 'sk:A0'); MT.k(d, 'Backspace'); o.back0 = [d.SESSION.sk.A0, d.SESSION.pts];
        MT.click(d, 'sk:A0'); MT.click(d, 'sk:A1'); o.rebuy = [d.SESSION.sk.A0, d.SESSION.sk.A1, d.SESSION.pts];
        MT.hover(d, 'sk:A1'); MT.click(d, 'skundo'); o.tile = [d.SESSION.sk.A1, d.SESSION.sk.A0, d.SESSION.pts];
        MT.k(d, 'Escape'); o.closed = !d.ui().tiles().some(q => /^sk:|^skundo$/.test(q.id)); o.scr = d.state().scr;
        return o;
      });
      t.eq(r.itemKette, ['A0', 'A1', 'A3'], 'Gegenstand A3 angewaehlt: Wurzel, Pfad 1 und Gegenstand leuchten');
      t.eq(r.pfadKette, ['A0', 'A2'], 'Pfad A2 angewaehlt: Wurzel und Pfad leuchten');
      t.eq(r.wurzel, ['V0'], 'die Wurzel leuchtet allein');
      t.eq(r.uKette, ['U0', 'U2', 'U4'], 'U4 gehoert zu Pfad 2 (U2)');
      t.ok(r.itemText, 'ein noch nicht gebauter Gegenstand sagt, dass er folgt');
      t.eq(r.gekauft, [{ A0: 3, A1: 1 }, 0], 'Wurzel dreimal und Pfad 1 einmal gekauft, vier Punkte');
      t.ok(r.grund.length > 0 && r.grundName, 'A2 nennt den Grund: verbaut durch Ruhige Hand: ' + JSON.stringify(r.grund));
      t.eq(r.kette2, ['A0', 'A2'], 'auch der gesperrte Pfad zeigt seine Kette');
      t.ok(r.lock, 'der gesperrte Pfad ist gesperrt (Kauf geht nicht)');
      t.eq(r.nochmal, [undefined, 0], 'Klick auf den verbauten Pfad kauft nichts');
      t.ok(r.undoTile, 'die Kachel zum Zuruecknehmen steht im Fenster');
      t.eq(r.back1, [undefined, 1], 'Rueckschritt nimmt die Stufe von A1 zurueck, ein Punkt kommt wieder');
      t.eq(r.back0, [2, 2], 'Rueckschritt auf der Wurzel nimmt eine Stufe zurueck (kein Pfad mehr darauf)');
      t.eq(r.rebuy, [3, 1, 0], 'wieder gekauft: Wurzel auf 3, Pfad 1, keine Punkte uebrig');
      t.eq(r.tile, [undefined, 3, 1], 'die Kachel Zuruecknehmen nimmt die Stufe des angewaehlten Knotens (A1) zurueck, die Wurzel bleibt');
      t.ok(r.closed && r.scr === 'shop', 'Esc schliesst das Fenster, der Shop bleibt');
    },
  },
  {
    name: 'Zusatz Laeufer (Ruhige Hand 3): Laufen kostet keine Zusatzstreuung mehr, Streuung im Stehen und die -30 % der Ruhigen Hand bleiben; mit Stufe 2 zaehlt das Laufen noch',
    async run(t) {
      const r = await t.page.evaluate(() => {
        const D = __dbg, o = {}, sp0 = D.CFG.wpn.pistol.spread, sp = lv => { D.sessReset(); if (lv) D.SESSION.sk.A1 = lv; D.setScenario('bank'); D.setSeedMode('random'); D.setLage([]); D.setTurn('S'); D.buildSeed(5017); D.reset();
          const m = D.get().me; m.rec = 0; m.bl = 0; m.gs = 0; return [0, 1].map(mv => { m.mv = mv; return +D.shotSp(m, m.wp).toFixed(5); }); };
        o.sp0 = sp0; o.l0 = sp(0); o.l2 = sp(2); o.l3 = sp(3);
        return o;
      });
      const f = x => +x.toFixed(5);
      t.eq(r.l0, [f(r.sp0), f(r.sp0 + .05)], 'ohne Skill: Streuung im Stehen und mit Laufzuschlag 0,05');
      t.eq(r.l2, [f(r.sp0 * .8), f((r.sp0 + .05) * .8)], 'Stufe 2: Streuung -20 %, der Laufzuschlag bleibt');
      t.eq(r.l3, [f(r.sp0 * .7), f(r.sp0 * .7)], 'Stufe 3: Streuung -30 %, im Laufen genauso wie im Stehen');
    },
  },
  {
    name: 'Zusatz Durchschuss (Durchschlag 3): die Kugel trifft auch den Beamten dahinter mit halbem Schaden, nur einmal, nicht durch Schilde, auch wenn der erste faellt; mit Stufe 2 nicht',
    async run(t) {
      const r = await t.page.evaluate(`(() => { const D = __dbg, T = 32, o = {};
        const strip = () => { const w = D.world(); for (let ty = w.WY0 + 2; ty < w.WY0 + w.H - 2; ty++) for (let tx = w.WX0 + 9; tx < w.WX0 + w.W - 3; tx++) { const x = tx * T + 16, y = ty * T + 16; let ok = true;
          for (let d = -240; d <= 70 && ok; d += 12) for (const dy of [-1, 0, 1]) if (D.isSol(Math.floor((x + d) / T), ty + dy)) ok = false; if (ok && D.clear(x - 240, y, x + 70, y)) return { x, y }; } return null; };
        const run = (lv, first) => { D.sessReset(); if (lv) D.SESSION.sk.A2 = lv; D.setScenario('bank'); D.setSeedMode('random'); D.setLage([]); D.setTurn('S'); D.buildSeed(5017); D.CFG.policeAt = 1e6; D.CFG.policeForced = 1e6; D.reset(); D.startHeist(false, D.get().me);
          const sp = strip(); if (!sp) return null; const g = D.get(); g.en.length = 0; const me = g.me, mk = (dx, kind) => { const c = D.mkCop(sp.x + dx, sp.y, kind); c.mode = 'post'; c.post = { x: c.x, y: c.y, a: Math.PI, door: null }; c.rt = 1e9; c.a = Math.PI; return c; };
          const c1 = first === 'shield' ? mk(-150, 'shield') : mk(-150, false), c2 = mk(-110, false), c3 = mk(-70, false); if (first === 'shield') c1.sh = 120; if (first === 'low') c1.hp = 10; g.en.push(c1, c2, c3);
          const h = [c1.hp, c2.hp, c3.hp], pos = [c1, c2, c3].map(c => [c.x, c.y]); me.x = sp.x + 400; me.y = sp.y;
          g.bl.push({ id: 9700, x: sp.x - 215, y: sp.y, vx: 720, vy: 0, l: .8, o: 1, own: 0, d: 34, ov: false });
          for (let i = 0; i < 12; i++) { me.hp = 1e9; [c1, c2, c3].forEach((c, k) => { c.x = pos[k][0]; c.y = pos[k][1]; }); D.update(1 / 30); }
          return { d: [h[0] - c1.hp, h[1] - c2.hp, h[2] - c3.hp].map(x => +x.toFixed(1)), dead1: c1.hp <= 0, sh: first === 'shield' ? 120 - c1.sh : 0 }; };
        o.l2 = run(2); o.l3 = run(3); o.low = run(3, 'low'); o.shield = run(3, 'shield');
        return o; })()`);
      t.ok(r.l2 && r.l3, 'freier Streifen gefunden');
      t.eq(r.l2.d, [34, 0, 0], 'Stufe 2: nur der erste Beamte wird getroffen');
      t.eq(r.l3.d, [34, 17, 0], 'Stufe 3: der erste voll, der zweite mit halbem Schaden, der dritte nichts (nur einmal durch)');
      t.eq([r.low.dead1, r.low.d[1]], [true, 17], 'faellt der erste, fliegt die Kugel trotzdem weiter und trifft den zweiten mit halbem Schaden');
      t.eq([r.shield.sh > 0, r.shield.d[1], r.shield.d[2]], [true, 0, 0], 'ein Schild haelt die Kugel auf, nichts geht durch');
    },
  },
  {
    name: 'Zusatz Materialsammler (Baumeister 3): jedes Moebelstueck gibt 2 statt 1 Material (1 Platz in der Tasche je Stueck), begrenzt durch Tasche und Hoechstmenge; mit Stufe 2 bleibt es bei 1',
    async run(t) {
      const r = await t.page.evaluate(() => {
        const D = __dbg, o = {}, take = (lv, pre) => { D.sessReset(); if (lv) D.SESSION.sk.V1 = lv; D.setScenario('bank'); D.setSeedMode('random'); D.setLage([]); D.setTurn('S'); D.buildSeed(5017); D.CFG.policeAt = 1e6; D.CFG.policeForced = 1e6; D.reset(); D.startHeist(false, D.get().me);
          const g = D.get(), me = g.me, it = g.its.find(i => i.t === 'mat' && i.tx !== undefined); me.mat = 0; me.units = 0; if (pre) pre(me); const u0 = me.units, m0 = me.mat; it.act(me); return [me.mat - m0, +(me.units - u0).toFixed(2), it.done, me.bag]; };
        o.l2 = take(2); o.l3 = take(3); o.bag = take(3, m => { m.units = m.bag - .5; }); o.cap = take(3, m => { m.mat = 3; m.units = 1.5; }); o.full = take(3, m => { m.units = m.bag; });
        return o;
      });
      t.eq(r.l2.slice(0, 3), [1, .5, true], 'Stufe 2: ein Material, ein halber Platz');
      t.eq(r.l3.slice(0, 3), [2, 1, true], 'Stufe 3: zwei Material fuer ein Stueck Moebel (ein Platz)');
      t.eq(r.bag.slice(0, 3), [1, .5, true], 'bei fast voller Tasche nur das, was noch passt');
      t.eq(r.cap.slice(0, 3), [1, .5, true], 'die Hoechstmenge (4) gilt weiter: bei 3 Material nur eins dazu');
      t.eq([r.full[0], r.full[2]], [0, false], 'volle Tasche: nichts, das Moebelstueck bleibt');
    },
  },
  {
    name: 'Skillbaum-Fenster: Pixel in sechs Zustaenden (leer, verbaut, Kette, Gegenstand folgt, voll, ohne Punkte), gleich dem eingecheckten Stand dieser Maschine',
    async run(t) {
      await t.loadTool('loopnet.js'); await t.loadInpage('menu.js');
      const hashes = await t.page.evaluate(() => {
        const d = MT.solo(null, 's'), out = {}; d.sessReset(); d.SESSION.round = 2; d.SESSION.pts = 5; d.openShop(); d.ui().tiles(); MT.k(d, 'k');
        MT.hover(d, 'sk:A0'); MT.shot(d, out, 'leer');
        for (let i = 0; i < 3; i++) MT.click(d, 'sk:V0'); MT.click(d, 'sk:V2'); MT.click(d, 'sk:V2');
        MT.hover(d, 'sk:V1'); MT.shot(d, out, 'verbaut'); MT.hover(d, 'sk:V2'); MT.shot(d, out, 'kette'); MT.hover(d, 'sk:V4'); MT.shot(d, out, 'folgt');
        MT.hover(d, 'sk:U1'); MT.shot(d, out, 'ohne-punkte'); d.SESSION.sk = { A0: 3, A1: 3, V0: 3, V2: 3, U0: 3, U1: 3 }; d.SESSION.pts = 0; MT.hover(d, 'sk:U1'); MT.shot(d, out, 'voll');
        return out;
      });
      await t.snapshot('skillbaum-fenster', hashes, { local: true });
    },
  },
];
