// Testwerkzeuge (nur mit #debug, Wunsch von Till am 25. Oktober 2026): Die Optionen haben im Titel zwei halbe Kacheln (Aufträge frei, Testwerkzeuge), in der Pause nur die Werkzeuge. Das Fenster Testwerkzeuge (ui:dbg, mDebug in js/ui.js, Aktionen dbg* in uiAct)
// stockt das Konto um 50.000 auf oder setzt es auf 0, gibt 5 Skillpunkte, setzt den Baum zurück (alle Punkte kommen zurück), schaltet die Fahndungsstufe reihum (0 bis 5, die Stufe setzt SESSION.heat auf Stufe mal CFG.fahndung.step), verschiebt die
// Auftragsnummer um 1 (nie unter 0), zählt die lautlosen Siege in Folge hoch (CFG.alert.cap, danach 0) und öffnet solo den Shop (dshop, Test 102-menue-ablauf). Die Tests laufen mit #debug, ohne den Hash gäbe es die Kacheln nicht.
module.exports = [
  {
    name: 'Testwerkzeuge: Die Optionen zeigen im Titel Aufträge frei und Testwerkzeuge nebeneinander, das Fenster hat Geld, Skillpunkte, Baum zurücksetzen, Fahndung, Auftrag und lautlose Siege, Esc schließt',
    async run(t) {
      await t.loadTool('loopnet.js'); await t.loadInpage('menu.js');
      const r = await t.page.evaluate(() => {
        const d = MT.solo(null, 's'), o = {}; d.sessReset(); MT.k(d, 'o'); o.opt = d.ui().tiles().map(q => q.id).filter(id => id === 'unlock' || id === 'dbg');
        const a = d.ui().tiles().find(q => q.id === 'unlock'), b = d.ui().tiles().find(q => q.id === 'dbg'); o.side = [a.y === b.y, a.x < b.x];
        MT.click(d, 'dbg'); o.modal = d.ui().modal(); o.tiles = d.ui().tiles().map(q => q.id);
        const rect = d.ui().tiles().map(q => [q.x, q.y, q.w, q.h]); o.inside = rect.every(([x, y, w, h]) => x >= 0 && y >= 0 && x + w <= 960 && y + h <= 544);
        MT.k(d, 'Escape'); o.after = d.ui().modal();
        return o;
      });
      t.eq(r.opt, ['unlock', 'dbg'], 'Aufträge frei und Testwerkzeuge in den Optionen');
      t.eq(r.side, [true, true], 'nebeneinander');
      t.eq(r.modal, 'dbg', 'Testwerkzeuge öffnet das Fenster');
      t.eq(r.tiles, ['dmoney', 'dmoney0', 'dpts', 'dresp', 'dheat', 'dround', 'dround2', 'dquiet', 'dshop', 'close'], 'alle Kacheln da (Shop öffnen nur solo)');
      t.ok(r.inside, 'alles liegt im Bild');
      t.eq(r.after, 'options', 'Esc schließt nur das Fenster, die Optionen bleiben');
    },
  },
  {
    name: 'Testwerkzeuge: Geld, Skillpunkte, Baum zurücksetzen, Fahndungsstufe, Auftragsnummer und lautlose Siege wirken auf die Serie (SESSION), der Baum gibt alle ausgegebenen Punkte zurück',
    async run(t) {
      await t.loadTool('loopnet.js'); await t.loadInpage('menu.js');
      const r = await t.page.evaluate(() => {
        const d = MT.solo(null, 's'), o = {}, S = d.SESSION, CFG = d.CFG; d.sessReset(); MT.k(d, 'o'); MT.click(d, 'dbg');
        MT.click(d, 'dmoney'); MT.click(d, 'dmoney'); o.money = S.wallet; MT.click(d, 'dmoney0'); o.money0 = S.wallet;
        MT.click(d, 'dpts'); MT.click(d, 'dpts'); o.pts = S.pts;
        S.sk = { A0: 3, A1: 2, V0: 1 }; S.pts = 1; MT.click(d, 'dresp'); o.resp = [S.pts, JSON.stringify(S.sk)];
        S.heat = 0; o.heat = []; for (let i = 0; i < 7; i++) { MT.click(d, 'dheat'); o.heat.push([d.heatLv(S.heat), S.heat]); }
        o.round = []; MT.click(d, 'dround'); o.round.push(S.round); MT.click(d, 'dround2'); MT.click(d, 'dround2'); MT.click(d, 'dround2'); o.round.push(S.round); MT.click(d, 'dround'); o.round.push(S.round);
        S.quiet = 0; o.quiet = []; for (let i = 0; i < CFG.alert.cap + 2; i++) { MT.click(d, 'dquiet'); o.quiet.push(S.quiet); } o.cap = CFG.alert.cap;
        return o;
      });
      t.eq(r.money, 100000, 'zweimal +50.000');
      t.eq(r.money0, 0, 'Konto auf 0');
      t.eq(r.pts, 10, 'zweimal +5 Skillpunkte');
      t.eq(r.resp, [1 + 3 + 2 + 1, '{}'], 'Baum zurücksetzen: die 6 ausgegebenen Punkte kommen zu den offenen, der Baum ist leer');
      t.eq(r.heat, [[1, 20], [2, 40], [3, 60], [4, 80], [5, 100], [0, 0], [1, 20]], 'Fahndung schaltet reihum 1, 2, 3, 4, 5, 0, 1 (Stufe mal 20)');
      t.eq(r.round, [0, 3, 2], 'Auftragsnummer: nie unter 0, dreimal plus 1 gibt 3, minus 1 gibt 2');
      t.eq(r.quiet.slice(0, 3), [1, 2, 3], 'lautlose Siege zählen hoch');
      t.eq(r.quiet.slice(-2), [0, 1], 'nach dem Deckel (' + r.cap + ') geht es auf 0 zurück');
    },
  },
  {
    name: 'Testwerkzeuge in der Pause: die Optionen zeigen dort nur die Testwerkzeuge (ganze Breite), kein Aufträge-frei; das Fenster wirkt wie im Titel (Skillpunkte, Konto)',
    async run(t) {
      await t.loadTool('loopnet.js'); await t.loadInpage('menu.js');
      const r = await t.page.evaluate(() => {
        const net = LoopNet(30, 0), d = MT.solo(net), k = x => MT.k(d, x), o = {}, S = d.SESSION;
        d.sessReset(); d.startGame(); d.setFocus(true); MT.adv(d, 1); k('Escape'); k('o');
        o.opt = d.ui().tiles().map(q => q.id).filter(id => id === 'unlock' || id === 'dbg'); const b = d.ui().tiles().find(q => q.id === 'dbg'); o.full = b && b.w > 300;
        MT.click(d, 'dbg'); o.modal = d.ui().modal(); MT.click(d, 'dpts'); MT.click(d, 'dmoney'); o.set = [S.pts, S.wallet];
        return o;
      });
      t.eq(r.opt, ['dbg'], 'in der Pause nur Testwerkzeuge, kein Aufträge-frei');
      t.ok(r.full, 'in ganzer Breite');
      t.eq(r.modal, 'dbg', 'öffnet das Fenster');
      t.eq(r.set, [5, 50000], 'wirkt auf die Serie');
    },
  },
];
