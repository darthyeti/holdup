// Menüablauf zwischen den Aufträgen (Tills Wunsch vom 26. Oktober 2026 beim Testen mit #debug): (1) Der Titel führt mit einer laufenden Serie (ab Auftrag 2) zuerst in den Shop, den Treffpunkt zwischen den Aufträgen, erst von dort mit Weiter in die Auftragswahl;
// der erste Auftrag geht direkt in die Auftragswahl. Vorher übersprang Serie fortsetzen den Shop, wer ihn mit Esc verlassen hatte (zum Beispiel für die Optionen), kam nie mehr hinein. (2) Der Shop hat eine Kachel Optionen (O) unten zwischen Zum Titel und Weiter,
// Esc schließt nur das Fenster, der Shop bleibt. (3) Mit #debug gibt es in den Testwerkzeugen die Kachel Shop öffnen (nur solo, aus Titel und Pause, ohne einen Auftrag zu beenden).
module.exports = [
  {
    name: 'Menüablauf solo: Auftrag 1 geht vom Titel direkt in die Auftragswahl, ab Auftrag 2 zuerst in den Shop (Weiter führt zur Auftragswahl, Zurück dorthin zurück), Esc im Shop geht zum Titel und Serie fortsetzen kommt wieder in den Shop, die Serie bleibt erhalten',
    async run(t) {
      await t.loadTool('loopnet.js'); await t.loadInpage('menu.js');
      const r = await t.page.evaluate(() => {
        const d = MT.solo(null, 's'), k = x => MT.k(d, x), o = {}, S = d.SESSION; d.sessReset();
        o.r0 = (() => { MT.click(d, 'serie'); const a = [d.state().scr, d.SC.from]; MT.click(d, 'back'); return a.concat(d.state().scr); })();
        S.round = 2; S.wallet = 12345; S.pts = 1;
        MT.click(d, 'serie'); o.shop = d.state().scr; o.tiles = d.ui().tiles().map(q => q.id).filter(id => ['opt', 'skills', 'back', 'next'].includes(id));
        MT.click(d, 'next'); o.mission = [d.state().scr, d.SC.from]; MT.click(d, 'back'); o.zurueck = d.state().scr;
        k('Escape'); o.titel = d.state().scr; MT.click(d, 'serie'); o.wieder = [d.state().scr, S.wallet, S.round, S.pts];
        return o;
      });
      t.eq(r.r0, ['mission', 'title', 'title'], 'Auftrag 1: Titel, Auftragswahl, Zurück zum Titel');
      t.eq(r.shop, 'shop', 'ab Auftrag 2 führt Serie fortsetzen in den Shop');
      t.eq(r.tiles, ['skills', 'opt', 'back', 'next'], 'der Shop hat Fähigkeiten, Optionen, Zum Titel und Weiter');
      t.eq(r.mission, ['mission', 'shop'], 'Weiter führt in die Auftragswahl (von dort)');
      t.eq(r.zurueck, 'shop', 'Zurück in der Auftragswahl führt wieder in den Shop');
      t.eq(r.titel, 'title', 'Esc im Shop geht zum Titel');
      t.eq(r.wieder, ['shop', 12345, 2, 1], 'Serie fortsetzen führt wieder in den Shop, Konto, Runde und Punkte sind unverändert');
    },
  },
  {
    name: 'Optionen im Shop: Kachel Optionen (O) öffnet das Fenster, Esc schließt nur das Fenster und lässt den Shop stehen, die Optionen im Shop haben weder Namen noch Neue Serie, mit #debug stocken die Testwerkzeuge dort Geld und Punkte auf, ohne den Shop zu verlassen',
    async run(t) {
      await t.loadTool('loopnet.js'); await t.loadInpage('menu.js');
      const r = await t.page.evaluate(() => {
        const d = MT.solo(null, 's'), k = x => MT.k(d, x), o = {}, S = d.SESSION; d.sessReset(); S.round = 2; d.openShop(); d.ui().tiles();
        MT.click(d, 'opt'); o.modal = d.ui().modal(); o.rows = d.ui().tiles().map(q => q.id).filter(id => ['name', 'series', 'unlock', 'dbg', 'flog', 'fmark', 'mute'].includes(id));
        k('Escape'); o.zu = [d.ui().modal(), d.state().scr]; k('o'); o.taste = d.ui().modal(); k('Escape');
        k('o'); MT.click(d, 'dbg'); const w0 = S.wallet, p0 = S.pts; MT.click(d, 'dmoney'); MT.click(d, 'dpts'); o.testw = [d.ui().modal(), d.state().scr, S.wallet - w0, S.pts - p0]; o.dshop = d.ui().tiles().some(q => q.id === 'dshop');
        k('Escape'); k('Escape'); o.zurueck = [d.ui().modal(), d.state().scr]; const n0 = d.ui().tiles().find(q => q.id === 'skills'); o.skillsTitel = !!n0;
        return o;
      });
      t.eq(r.modal, 'options', 'die Kachel öffnet die Optionen');
      t.eq(r.rows, ['mute', 'flog', 'fmark', 'dbg'], 'im Shop: Ton, Log speichern, Markieren und mit #debug die Testwerkzeuge, kein Name, keine Neue Serie, kein Aufträge-frei');
      t.eq(r.zu, [null, 'shop'], 'Esc schließt nur das Fenster, der Shop bleibt');
      t.eq(r.taste, 'options', 'die Taste O öffnet die Optionen');
      t.eq(r.testw.slice(0, 2), ['dbg', 'shop'], 'die Testwerkzeuge öffnen im Shop, Klicks lassen den Shop stehen');
      t.eq(r.testw.slice(2), [50000, 5], 'Geld +50.000, Punkte +5');
      t.eq(r.zurueck, [null, 'shop'], 'zweimal Esc: zurück im Shop');
      t.ok(r.dshop, 'im Shop (solo) gibt es auch die Kachel Shop öffnen (macht dort nichts Neues)');
    },
  },
  {
    name: 'Testwerkzeuge: Shop öffnen (nur solo) bringt vom Titel (Auftrag 1) und aus der Pause eines laufenden Auftrags direkt in den Shop, ohne einen Auftrag zu beenden; im Coop gibt es die Kachel nicht, der Shop dort hat die Optionen ebenso',
    async run(t) {
      await t.loadTool('loopnet.js'); await t.loadInpage('menu.js'); await t.loadInpage('coop.js');
      const r = await t.page.evaluate(() => {
        const o = {}, d = MT.solo(null, 's'), k = x => MT.k(d, x); d.sessReset(); k('o'); MT.click(d, 'dbg'); o.t0 = d.ui().tiles().some(q => q.id === 'dshop'); MT.click(d, 'dshop'); d.ui().tiles(); o.vomTitel = [d.state().scr, d.ui().modal(), d.SESSION.round];
        const net = LoopNet(30, 0), e = MT.solo(net), ke = x => MT.k(e, x); e.sessReset(); e.startGame(); e.setFocus(true); MT.adv(e, 1); ke('Escape'); ke('o'); MT.click(e, 'dbg'); MT.click(e, 'dshop'); e.ui().tiles(); o.ausPause = [e.state().scr, e.state().paused, e.ui().modal()];
        const G = CT.mkGame('gas', 321, 2), A = G.A, B = G.clients[0]; A.openShop(); A.ui().tiles(); o.coopHost = [A.state().scr, A.ui().tiles().some(q => q.id === 'opt')]; MT.click(A, 'opt'); MT.click(A, 'dbg'); o.coopDshop = A.ui().tiles().some(q => q.id === 'dshop');
        B.openShop(); B.ui().tiles(); o.coopClient = [B.state().scr, B.ui().tiles().some(q => q.id === 'opt')];
        return o;
      });
      t.ok(r.t0, 'vom Titel (solo) gibt es die Kachel');
      t.eq(r.vomTitel, ['shop', null, 0], 'Shop öffnen bringt vom Titel in den Shop, Fenster zu, Serie bei Auftrag 1');
      t.eq(r.ausPause, ['shop', false, null], 'aus der Pause eines laufenden Auftrags direkt in den Shop (der Auftrag ist verworfen)');
      t.eq(r.coopHost, ['shop', true], 'Coop-Host: der Shop hat die Kachel Optionen');
      t.eq(r.coopDshop, false, 'im Coop gibt es Shop öffnen nicht');
      t.eq(r.coopClient, ['shop', true], 'Coop-Client: der Shop hat die Kachel Optionen');
    },
  },
];
