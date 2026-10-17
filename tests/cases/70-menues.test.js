// Menues als Kacheln: Ablauf per Tastatur und Maus (portabel) und Pixel-Schnappschuesse aller Bildschirme (nur lokal, siehe unten).
// Pixel-Schnappschuesse: golden-local/70-menues.json, nicht eingecheckt (Schrift und Rasterung haengen vom System ab). Vor einem Umbau der Menues
// `node run.js --update Pixel` laufen lassen, nach dem Umbau `node run.js Pixel`: Der Umbau darf kein Pixel veraendern.
async function setup(t) { await t.loadTool('loopnet.js'); await t.loadInpage('menu.js'); }

module.exports = [
  {
    name: 'Menues: Hauptmenue, Auftragswahl, Optionen und Anleitung per Tastatur',
    async run(t) {
      await setup(t);
      const r = await t.page.evaluate(() => {
        const net = LoopNet(30, 0), d = MT.solo(net), k = x => MT.k(d, x), o = {};
        o.f0 = d.ui().focus(); k('Enter'); o.mission = [d.state().scr, d.ui().focus()];
        k('ArrowUp'); o.up = d.ui().focus(); k('Escape'); o.back = d.state().scr;
        k('c'); o.coop = d.state().scr; k('j'); o.join = d.state().scr; k('Escape'); k('Escape'); o.title = d.state().scr;
        k('o'); o.opt = d.ui().modal(); k('Escape'); o.optClosed = d.ui().modal();
        k('?'); o.help = d.ui().modal(); k('Enter'); o.helpClosed = d.ui().modal();
        k('ArrowRight'); o.right = d.ui().focus(); k('ArrowLeft'); o.left = d.ui().focus();
        k('Tab'); o.tab = d.ui().focus();
        return o;
      });
      t.eq(r.f0, 'serie', 'Standardfokus des Hauptmenues');
      t.eq(r.mission, ['mission', 'start'], 'Enter oeffnet die Auftragswahl, Fokus auf Start');
      t.ok(/^job:/.test(r.up), 'Pfeil hoch aus Start landet bei einem Auftrag: ' + r.up);
      t.eq(r.back, 'title', 'Esc zurueck'); t.eq(r.coop, 'coop'); t.eq(r.join, 'join'); t.eq(r.title, 'title');
      t.eq(r.opt, 'options'); t.eq(r.optClosed, null); t.eq(r.help, 'help'); t.eq(r.helpClosed, null);
      t.ok(r.right !== 'serie' && r.left === 'serie', 'Pfeile bewegen den Fokus: ' + r.right + ' dann ' + r.left);
      t.ok(r.tab && r.tab !== r.left, 'Tab springt weiter');
    },
  },
  {
    name: 'Menues: Auftragswahl waehlt, sperrt nach Rang, merkt die Wahl und startet',
    async run(t) {
      await setup(t);
      const r = await t.page.evaluate(() => {
        const net = LoopNet(30, 0), d = MT.solo(net), k = x => MT.k(d, x), o = {};
        d.SESSION.sessReset ? 0 : 0; d.sessReset();
        k('Enter'); MT.click(d, 'job:jewel'); o.pick = [d.scen(), d.ui().focus()];
        o.saved = localStorage.getItem('holdup.sc');
        MT.click(d, 'job:casino'); o.locked = d.scen(); o.lockInfo = MT.tile(d, 'job:casino').lock;
        MT.click(d, 'job:museum'); o.museumRound0 = d.scen();
        d.SESSION.round = 4; o.casinoRound4 = MT.tile(d, 'job:casino').lock; MT.click(d, 'job:casino'); o.casino = d.scen();
        MT.click(d, 'job:random'); o.random = d.scen();
        k('k'); o.same = d.SC.same; k('k'); o.same2 = d.SC.same;
        MT.click(d, 'job:gas'); k('Enter'); o.start = [d.state().scr, d.sc()];
        return o;
      });
      t.eq(r.pick, ['jewel', 'start'], 'Wahl setzt den Auftrag und springt auf Start');
      t.eq(r.saved, 'jewel', 'letzte Wahl wird gemerkt');
      t.eq(r.locked, 'jewel', 'Casino ist in Runde 0 gesperrt'); t.ok(/Auftrag 5/.test(r.lockInfo), 'Sperrgrund: ' + r.lockInfo);
      t.eq(r.museumRound0, 'jewel', 'Museum ist in Runde 0 gesperrt');
      t.eq(r.casinoRound4, '', 'Casino ab Auftrag 5 frei'); t.eq(r.casino, 'casino');
      t.eq(r.random, 'random'); t.eq(r.same, true, 'K schaltet Gleiche Karte an'); t.eq(r.same2, false);
      t.eq(r.start, ['play', 'gas'], 'Start beginnt den gewaehlten Auftrag');
    },
  },
  {
    name: 'Menues: Optionen (Regler, Ton, Name, Alle freischalten, Neue Serie mit Rueckfrage)',
    async run(t) {
      await setup(t);
      const r = await t.page.evaluate(() => {
        const net = LoopNet(30, 0), d = MT.solo(net), k = x => MT.k(d, x), o = {};
        k('o'); MT.click(d, 'vmus', .5); o.volMid = d.SND.vol('mus'); MT.hover(d, 'vsfx'); k('ArrowLeft'); o.volLeft = d.SND.vol('sfx');
        for (let i = 0; i < 30; i++) k('ArrowRight'); o.volMax = d.SND.vol('sfx');
        const m0 = d.SND.isMuted(); k('m'); o.muted = d.SND.isMuted() !== m0; k('m');
        MT.click(d, 'name'); MT.type(d, 'kim'); k('Enter'); o.name = d.SC.name;
        d.SESSION.round = 3; d.SESSION.wallet = 5000;
        MT.click(d, 'series'); o.confirm = d.ui().modal(); MT.click(d, 'no'); o.stillThere = d.SESSION.round;
        MT.click(d, 'series'); MT.click(d, 'yes'); o.reset = [d.SESSION.round, d.SESSION.wallet, d.ui().modal()];
        o.unlock0 = d.SC.unlock; k('o'); MT.click(d, 'unlock'); o.unlock1 = d.SC.unlock;
        return o;
      });
      t.ok(Math.abs(r.volMid - .5) < .1, 'Klick auf den Regler setzt die Lautstaerke: ' + r.volMid);
      t.ok(r.volLeft < 1 && r.volMax === 1, 'Pfeile aendern die Lautstaerke: ' + r.volLeft + ' ' + r.volMax);
      t.ok(r.muted, 'M schaltet den Ton'); t.eq(r.name, 'kim', 'Name wird uebernommen');
      t.eq(r.confirm, 'confirm'); t.eq(r.stillThere, 3, 'Nein laesst die Serie');
      t.eq(r.reset, [0, 0, null], 'Ja beendet die Serie'); t.eq(r.unlock0, false); t.eq(r.unlock1, true, 'Freischalten schaltet um');
    },
  },
  {
    name: 'Menues: Shop kauft per Kachel und Taste, Weiter fuehrt ueber die Auftragswahl',
    async run(t) {
      await setup(t);
      const r = await t.page.evaluate(() => {
        const net = LoopNet(30, 0), d = MT.solo(net), k = x => MT.k(d, x), o = {};
        d.sessReset(); d.SESSION.wallet = 200000; d.SESSION.round = 1; d.openShop(); d.ui().tiles(); o.scr = d.state().scr;
        o.n = d.ui().tiles().filter(q => /^buy:/.test(q.id)).length; o.focus = d.ui().focus();
        const w0 = d.SESSION.wallet; MT.click(d, 'buy:0'); o.clickBuy = w0 - d.SESSION.wallet;
        const items = d.CFG.shop.items, keys = '1234567890-';
        for (let i = 1; i < items.length; i++) k(keys[i]);
        o.bought = items.map(it => it.c ? (d.SESSION.cons[it.k] | 0) > 0 : !!d.SESSION.own[it.k]);
        MT.click(d, 'next'); o.next = [d.state().scr, d.SC.from]; k('Escape'); o.back = d.state().scr;
        k('Enter'); k('Enter'); o.go = d.state().scr; o.round = d.SESSION.round;
        return o;
      });
      t.eq(r.scr, 'shop'); t.eq(r.n, 11, 'elf Posten als Kacheln'); t.eq(r.focus, 'next', 'Standardfokus Weiter');
      t.ok(r.clickBuy > 0, 'Klick kauft'); t.ok(r.bought.every(Boolean), 'alles gekauft: ' + JSON.stringify(r.bought));
      t.eq(r.next, ['mission', 'shop'], 'Weiter oeffnet die Auftragswahl'); t.eq(r.back, 'shop', 'Esc zurueck in den Shop');
      t.eq(r.go, 'play', 'Auftrag starten beginnt den naechsten Auftrag');
    },
  },
  {
    name: 'Menues: Pause als Kacheln (Weiter, Optionen, Anleitung, Rueckfrage beim Verlassen)',
    async run(t) {
      await setup(t);
      const r = await t.page.evaluate(() => {
        const net = LoopNet(30, 0), d = MT.solo(net), k = x => MT.k(d, x), o = {};
        d.startGame(); d.setFocus(true); MT.adv(d, 1);
        k('Escape'); o.paused = d.state().paused; o.focus = d.ui().focus();
        k('o'); o.opt = d.ui().modal(); k('Escape'); o.optClosed = [d.ui().modal(), d.state().paused];
        k('?'); o.help = d.ui().modal(); MT.click(d, 'close'); o.helpClosed = d.ui().modal();
        k('q'); o.confirm = d.ui().modal(); MT.click(d, 'no'); o.stay = [d.ui().modal(), d.state().scr, d.state().paused];
        k('p'); o.resumed = d.state().paused;
        k('Escape'); MT.click(d, 'resume'); o.clickResume = d.state().paused;
        k('Escape'); k('q'); MT.click(d, 'yes'); o.title = d.state().scr;
        return o;
      });
      t.eq(r.paused, true); t.eq(r.focus, 'resume', 'Standardfokus Weiter'); t.eq(r.opt, 'options');
      t.eq(r.optClosed, [null, true], 'Esc schliesst nur das Modal'); t.eq(r.help, 'help'); t.eq(r.helpClosed, null);
      t.eq(r.confirm, 'confirm'); t.eq(r.stay, [null, 'play', true], 'Nein bleibt in der Pause');
      t.eq(r.resumed, false, 'P setzt fort'); t.eq(r.clickResume, false, 'Klick auf Weiter'); t.eq(r.title, 'title', 'Ja verlaesst zum Titel');
    },
  },
  {
    name: 'Menues: Ergebnis zeigt Kacheln, Klick geht weiter oder zum Titel',
    async run(t) {
      await setup(t);
      const r = await t.page.evaluate(() => {
        const net = LoopNet(30, 0), d = MT.solo(net), o = {};
        const lose = () => { d.startGame(); d.setFocus(true); d.startHeist(false); MT.adv(d, .5); d.get().me.hp = 0; d.update(1 / 30); };
        lose(); o.ended = !!d.get().ended; o.tiles = d.ui().tiles().map(q => q.id + (q.nofocus ? '*' : '')).join(',');
        MT.click(d, 'endNext'); o.next = [!!d.get().ended, d.state().scr];
        lose(); MT.click(d, 'endBack'); o.back = d.state().scr;
        return o;
      });
      t.eq(r.ended, true); t.eq(r.tiles, 'endNext*,endBack*', 'zwei Kacheln, nur mit der Maus');
      t.eq(r.next, [false, 'play'], 'Neue Serie startet sofort'); t.eq(r.back, 'title', 'Titel');
    },
  },
  {
    name: 'Menues: Coop-Weg ueber Kacheln, Host waehlt den Auftrag fuer alle',
    async run(t) {
      await setup(t);
      const r = await t.page.evaluate(() => {
        const net = LoopNet(30, 0), A = MT.solo(net, 'a'), B = MT.solo(net, 'b'), insts = [A, B], o = {};
        const run = s => { for (let i = 0; i < s * 60; i++) step(insts, net, 1 / 60); };
        MT.click(A, 'coop'); MT.click(A, 'host'); run(1); o.host = [A.state().scr, A.NET.code];
        MT.click(B, 'coop'); MT.click(B, 'join'); MT.type(B, A.NET.code.toLowerCase()); MT.k(B, 'Enter'); run(2); o.client = B.state().scr;
        o.clientJob = MT.tile(B, 'job').nofocus; MT.k(B, 't'); o.clientT = B.state().scr;
        MT.k(A, 't'); o.hostMission = [A.state().scr, A.SC.from]; MT.click(A, 'job:gas'); MT.click(A, 'start'); o.back = [A.state().scr, A.scen()];
        run(1); o.clientSees = B.scen();
        MT.click(A, 'start'); run(2); o.play = [A.state().scr, B.state().scr, A.sc(), B.sc()];
        return o;
      });
      t.eq(r.host[0], 'lobby'); t.ok(/^[A-Z0-9]{4}$/.test(r.host[1]), 'Raumcode');
      t.eq(r.client, 'lobby', 'Beitritt per Code und Enter'); t.eq(r.clientJob, true, 'Client darf den Auftrag nicht aendern'); t.eq(r.clientT, 'lobby');
      t.eq(r.hostMission, ['mission', 'lobby'], 'Host oeffnet die Auftragswahl aus der Lobby'); t.eq(r.back, ['lobby', 'gas'], 'Uebernehmen geht zurueck in die Lobby');
      t.eq(r.clientSees, 'gas', 'Client sieht die Wahl'); t.eq(r.play, ['play', 'play', 'gas', 'gas'], 'Start fuer alle');
    },
  },
  {
    name: 'Pixel: Hauptmenue, Auftragswahl, Optionen, Anleitung, Coop, Raumcode, Shop, Pause, Ergebnis',
    open: { det: true },
    retry: 1,
    timeout: 120000,
    async run(t) {
      await setup(t);
      const hashes = await t.page.evaluate(() => {
        const net = LoopNet(30, 0), out = {}, S = MT.solo(net), k = x => MT.k(S, x), shot = n => MT.shot(S, out, n);
        MT.adv(S, 2); shot('titel'); k('ArrowRight'); shot('titel-fokus'); k('ArrowLeft');
        S.SESSION.round = 3; S.SESSION.wallet = 45000; S.SESSION.best = 66000; shot('titel-serie'); S.sessReset();
        k('o'); shot('optionen'); MT.click(S, 'vmus', .3); shot('optionen-regler'); MT.click(S, 'series'); shot('optionen-neue-serie'); MT.click(S, 'no'); k('Escape');
        k('?'); shot('anleitung'); k('Escape');
        k('Enter'); shot('mission'); MT.hover(S, 'job:jewel'); shot('mission-juwelier'); MT.hover(S, 'job:casino'); shot('mission-gesperrt'); MT.click(S, 'job:gas'); shot('mission-gewaehlt'); MT.click(S, 'job:random'); shot('mission-zufall');
        S.SESSION.round = 4; shot('mission-rang5'); k('k'); shot('mission-gleiche-karte'); k('Escape');
        k('c'); shot('coop'); k('j'); shot('join-leer'); k('a'); k('b'); k('k'); shot('join-code'); k('x'); shot('join-voll'); k('Escape'); k('Escape'); k('Escape');
        S.sessReset(); S.SESSION.wallet = 30000; S.SESSION.round = 2; S.openShop(); shot('shop-30k'); k('1'); k('2'); k('5'); shot('shop-gekauft'); k('9'); k('9'); shot('shop-zu-teuer'); MT.hover(S, 'buy:3'); shot('shop-hover');
        S.SESSION.wallet = 0; shot('shop-leer');
        S.sessReset(); S.toTitle(); S.ui().tiles(); k('Enter'); k('Enter'); MT.adv(S, 1.5); shot('spiel-phase1'); k('Escape'); shot('pause'); k('o'); shot('pause-optionen'); k('Escape'); k('q'); shot('pause-rueckfrage'); k('Escape'); k('p');
        S.startHeist(false); MT.adv(S, .5); S.get().me.hp = 0; S.update(1 / 30); MT.hover(S, 'endNext'); shot('ergebnis-verloren');
        return out;
      });
      t.note(Object.keys(hashes).length + ' Bildschirme');
      await t.snapshot('pixel', hashes, { local: true });
    },
  },
  {
    name: 'Pixel: Coop-Lobby zu dritt, Auftragswahl der Lobby, Shop im Coop',
    open: { det: true },
    retry: 1,
    timeout: 120000,
    async run(t) {
      await setup(t);
      const hashes = await t.page.evaluate(() => {
        const net = LoopNet(30, 0), out = {};
        const A = mkInst(net, 'a'), B = mkInst(net, 'b'), C = mkInst(net, 'c'), all = [A, B, C]; A.setName('Ada'); B.setName('Bo'); C.setName('Cy');
        const run = s => { for (let i = 0; i < s * 60; i++) step(all, net, 1 / 60); };
        A.hostRoom(); run(.5); B.joinRoom(A.NET.code); run(1); C.joinRoom(A.NET.code); run(2);
        MT.shot(A, out, 'lobby-host'); MT.shot(C, out, 'lobby-client');
        MT.k(A, 't'); MT.shot(A, out, 'mission-lobby'); MT.click(A, 'job:truck'); MT.click(A, 'start'); run(1); MT.shot(C, out, 'lobby-client-truck');
        MT.hover(A, 'link'); MT.shot(A, out, 'lobby-host-hover');
        A.startCoop(); run(2); A.SESSION.wallet = 80000; A.SESSION.round = 2; A.openShop(); run(1);
        MT.shot(A, out, 'shop3-host'); MT.k(B, 'Enter'); run(1); MT.shot(A, out, 'shop3-host-bereit'); MT.k(A, 'Enter'); MT.shot(A, out, 'mission-shop');
        return out;
      });
      t.note(Object.keys(hashes).length + ' Bildschirme');
      await t.snapshot('pixel-coop', hashes, { local: true });
    },
  },
];
