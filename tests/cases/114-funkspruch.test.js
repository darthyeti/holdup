// Coop-Ausbau F1 (docs/coop-ausbau.md, Spur F): Funkspruch. Im Coop oeffnet X ein kleines Menue mit vier Spruechen (je Phase), die Ziffern 1 bis 4 senden einen. Das Menue schliesst nach CFG.funk.menuT, mit X und mit Esc
// (Esc pausiert dann nicht), solange es offen ist, gehoeren die Ziffern dem Menue (kein Gadget). Der Client schickt {t:'rad',c:Platz,x,y}, der Host prueft (Platz 0 bis 3 als ganze Zahl, Spieler lebt oder liegt am Boden, nicht
// weg und nicht entkommen, Zeitsperre CFG.funk.cool, derselbe Spruch frueher als CFG.funk.same nicht noch einmal, nur im Spiel) und sendet evt('rad',[id,k,x,y]) an alle. Der Absender ist immer der Spieler der Verbindung.
// Anzeige: Meldung in Senderfarbe mit Namen, Funkzeichen ueber dem Sender (funkMk, CFG.funk.mkT), Ton SND.rad(Art, leise fuer den Sender), optional Stimme (speechSynthesis, Modus stimme), Modus stumm ohne Ton.
// Solo hat kein Menue. Der Flugschreiber nennt den Spruch (Ereignis funk).
const KEY = (cv, k) => `${cv}.dispatchEvent(new KeyboardEvent('keydown', { key: '${k}', bubbles: true }))`;
const SETUP = `(() => { const G = CT.mkGame('bank', 321, 3), A = G.A, B = G.clients[0], C = G.clients[1], key = (d, k) => d.cv.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }));
  const sent = []; const sn = B.NET.conn.send.bind(B.NET.conn); B.NET.conn.send = m => { sent.push(m.t); sn(m); }; return { G, A, B, C, key, sent }; })()`;

module.exports = [
  {
    name: 'Funkspruch: Werte (CFG.funk) und acht Sprueche (Platz 1 und 4 in beiden Phasen gleich, Platz 3 der Phase 1 und Platz 4 tragen eine Markierung)',
    async run(t) {
      const r = await t.page.evaluate(() => {
        const D = __dbg, F = D.CFG.funk, T = D.FUNK;
        return { cfg: Object.keys(F || {}).sort(), n: T && T.length, txt: T && T.map(q => q.t), pt: T && T.map(q => q.pt | 0), snd: T && T.map(q => q.snd), mode: D.funk && D.funk().mode };
      });
      t.eq(r.cfg, ['cool', 'menuT', 'mkT', 'pingT', 'same'], 'CFG.funk: cool, menuT, mkT, pingT, same');
      t.eq(r.n, 8, 'acht Sprueche, vier je Phase');
      t.eq(r.txt, ['Ich brauche Hilfe!', 'Lasst uns leise vorgehen!', 'Sammeln bei mir!', 'Achtung, hier!', 'Ich brauche Hilfe!', 'Rückzug zum Fluchtwagen!', 'Deckung geben!', 'Achtung, hier!'], 'die Texte');
      t.eq(r.pt, [0, 0, 1, 2, 0, 0, 0, 2], 'Markierung: 1 an der eigenen Stelle, 2 am Fadenkreuz');
      t.eq(r.snd, ['help', 'quiet', 'std', 'ping', 'help', 'std', 'std', 'ping'], 'Tonart je Spruch');
      t.eq(r.mode, 'ton', 'Standard: Ton ohne Stimme');
    },
  },
  {
    name: 'Funkspruch im Coop: Der Client drueckt X und 2, Host und beide Clients lesen "Blau: Lasst uns leise vorgehen!" in Senderfarbe, das Menue schliesst, das Funkzeichen sitzt ueber dem Sender, der Flugschreiber nennt den Spruch',
    async run(t) {
      await t.loadTool('loopnet.js'); await t.loadInpage('coop.js');
      const r = await t.page.evaluate(`(() => { const { G, A, B, C, key } = ${SETUP}, o = {};
        key(B, 'x'); G.run(.2); o.open = B.funk().open; key(B, '2'); G.run(1);
        o.feed = [A, B, C].map(d => d.msgs().feed.filter(s => /leise/.test(s))); o.col = [A, B, C].map(d => d.funk().fc.filter(c => c)[0]); o.openAfter = B.funk().open;
        o.mk = [A, B, C].map(d => d.funk().mk.map(q => q.id)); o.last = A.funk().last;
        o.log = A.flog().dump().ereignisse.filter(e => e[2] === 'funk').map(e => JSON.stringify(e[3])); o.logB = B.flog().dump().ereignisse.filter(e => e[2] === 'funk').length;
        return o; })()`);
      t.eq(r.open, true, 'X oeffnet das Menue beim Client');
      t.eq(r.feed, [['Blau: Lasst uns leise vorgehen!'], ['Blau: Lasst uns leise vorgehen!'], ['Blau: Lasst uns leise vorgehen!']], 'Meldung mit Namen bei Host, Absender und Mitspieler');
      t.eq(r.col, ['#5aa0ff', '#5aa0ff', '#5aa0ff'], 'in der Farbe des Senders (Blau)');
      t.eq(r.openAfter, false, 'nach dem Senden schliesst das Menue');
      t.eq(r.mk, [[1], [1], [1]], 'Funkzeichen ueber Spieler 1 bei allen');
      t.eq(r.last && [r.last[0], r.last[1]], [1, 1], 'Ereignis: Sender 1, Spruch 1 (Phase 1, Platz 2)');
      t.eq(r.log, ['[1,1]'], 'der Flugschreiber des Hosts nennt den Spruch');
      t.eq(r.logB, 1, 'und der des Clients');
    },
  },
  {
    name: 'Funkspruch in Phase 2: andere Saetze auf Platz 2 und 3, Platz 1 bleibt "Ich brauche Hilfe!", ein Spruch des Hosts erreicht die Clients, ein Client den anderen Client',
    async run(t) {
      await t.loadTool('loopnet.js'); await t.loadInpage('coop.js');
      const r = await t.page.evaluate(`(() => { const { G, A, B, C, key } = ${SETUP}, o = {};
        A.CFG.policeAt = 1e6; A.CFG.policeForced = 1e6; key(A, 'f'); G.run(1); o.phase = A.get().phase;
        key(C, 'x'); key(C, '2'); G.run(.5); key(A, 'x'); key(A, '3'); G.run(.5); key(B, 'x'); key(B, '1'); G.run(.5);
        o.feed = [A, B, C].map(d => d.msgs().feed.filter(s => /: /.test(s) && !/Überfall|Waffe/.test(s)).sort());
        return o; })()`);
      t.eq(r.phase, 2, 'Ueberfall laeuft');
      const want = ['Blau: Ich brauche Hilfe!', 'Grün: Rückzug zum Fluchtwagen!', 'Orange: Deckung geben!'].sort();
      t.eq(r.feed, [want, want, want], 'drei Sprueche von drei Absendern, bei allen dieselben');
    },
  },
  {
    name: 'Funkmenue: Solange es offen ist, gehoeren die Ziffern dem Menue (Taste 1 sendet einen Spruch statt das Gadget, Taste 5 tut nichts und laesst das Menue offen), geschlossen geht die 1 wieder ans Gadget',
    async run(t) {
      await t.loadTool('loopnet.js'); await t.loadInpage('coop.js');
      const r = await t.page.evaluate(`(() => { const { G, A, B, C, key, sent } = ${SETUP}, o = {};
        const nin = () => sent.filter(x => x !== 'in'); key(B, '1'); G.run(.1); o.zu = nin(); sent.length = 0;
        key(B, 'x'); key(B, '5'); G.run(.1); o.fuenf = [nin(), B.funk().open]; sent.length = 0;
        key(B, '1'); G.run(.3); o.offen = nin(); o.open = B.funk().open; sent.length = 0;
        key(B, '1'); G.run(.1); o.danach = nin();
        return o; })()`);
      t.eq(r.zu, ['u'], 'geschlossen: Taste 1 ist das Gadget (Nachricht u)');
      t.eq(r.fuenf, [[], true], 'offen: Taste 5 sendet nichts und das Menue bleibt offen');
      t.eq(r.offen, ['rad'], 'offen: Taste 1 sendet den Funkspruch und kein Gadget');
      t.eq(r.open, false, 'danach ist das Menue zu');
      t.eq(r.danach, ['u'], 'danach geht die 1 wieder ans Gadget');
    },
  },
  {
    name: 'Funkmenue schliessen: nach CFG.funk.menuT Sekunden, mit X, mit Esc ohne zu pausieren (das zweite Esc pausiert), die Pause schliesst es; Solo hat kein Menue',
    async run(t) {
      await t.loadTool('loopnet.js'); await t.loadInpage('coop.js');
      const r = await t.page.evaluate(`(() => { const { G, A, B, C, key } = ${SETUP}, o = {}, T = A.CFG.funk.menuT;
        key(B, 'x'); G.run(T - .5); o.vorher = B.funk().open; G.run(1); o.nachher = B.funk().open;
        key(B, 'x'); o.auf = B.funk().open; key(B, 'x'); o.mitX = B.funk().open;
        key(B, 'x'); key(B, 'Escape'); o.esc = [B.funk().open, B.state().paused]; key(B, 'Escape'); o.esc2 = B.state().paused;
        return o; })()`);
      t.eq([r.vorher, r.nachher], [true, false], 'geschlossen nach menuT Sekunden, nicht vorher');
      t.eq([r.auf, r.mitX], [true, false], 'X oeffnet und schliesst');
      t.eq(r.esc, [false, false], 'Esc schliesst das Menue und pausiert nicht');
      t.eq(r.esc2, true, 'das zweite Esc pausiert');
      const s = await t.page.evaluate(() => { const D = __dbg, cv = document.getElementById('c'); D.sessReset(); D.reset(); const n0 = D.msgs().feed.length; cv.dispatchEvent(new KeyboardEvent('keydown', { key: 'x', bubbles: true })); for (let i = 0; i < 20; i++) D.update(1 / 30); return { role: D.state().role, open: D.funk().open, feed: D.msgs().feed.length - n0 }; });
      t.eq([s.role, s.open, s.feed], ['solo', false, 0], 'Solo: X tut nichts (kein Menue, keine Meldung)');
    },
  },
  {
    name: 'Funkspruch, Pruefung durch den Host: Platz muss eine ganze Zahl 0 bis 3 sein, Zeitsperre (cool), derselbe Spruch nicht vor same, Tote, Entkommene und Gegangene funken nicht, ein Spieler am Boden darf, in der Lobby nicht, kaputte Nachrichten tun nichts',
    async run(t) {
      await t.loadTool('loopnet.js'); await t.loadInpage('coop.js');
      const r = await t.page.evaluate(`(() => { const { G, A, B, C } = ${SETUP}, o = {}, P = A.get().players, F = A.CFG.funk, c = A.NET.conns[0];
        const bad = [-1, 4, 1.5, '1', null, undefined, NaN].map(v => A.radHost(P[0], v)); o.bad = bad; G.run(F.cool + .1);
        o.erst = A.radHost(P[0], 1); o.sofort = A.radHost(P[0], 2); G.run(F.cool + .1); o.andere = A.radHost(P[0], 2); G.run(F.cool + .1); o.gleich = A.radHost(P[0], 2);
        G.run(F.same + .1); o.gleichSpaeter = A.radHost(P[0], 2);
        G.run(F.same + .1); P[1].dead = true; P[1].dn = 0; o.tot = A.radHost(P[1], 0); P[1].dn = 12; o.boden = A.radHost(P[1], 0); P[1].dead = false;
        G.run(F.cool + .1); P[2].out = true; o.entkommen = A.radHost(P[2], 0); P[2].out = false; P[2].gone = true; o.weg = A.radHost(P[2], 0); P[2].gone = false;
        o.fremd = A.radHost(undefined, 0);
        const f0 = A.msgs().feed.join('|'); for (const m of [{ t: 'rad' }, { t: 'rad', c: 'x' }, { t: 'rad', c: 9 }, { t: 'rad', c: null }, { t: 'rad', c: 1.2 }]) c.onmsg(m); o.kaputt = A.msgs().feed.join('|') === f0 ? 0 : 1;
        const L = mkInst(G.net, 'lobby'); L.hostRoom(); G.insts.push(L); G.run(.3); o.lobby = L.radHost(L.get().players[0], 0);
        return o; })()`);
      t.eq(r.bad, [false, false, false, false, false, false, false], 'Platz ausserhalb, nicht ganzzahlig, Text, null, undefined, NaN: abgelehnt');
      t.eq([r.erst, r.sofort, r.andere], [true, false, true], 'ein Spruch, sofort der naechste abgelehnt (cool), nach cool ein anderer erlaubt');
      t.eq([r.gleich, r.gleichSpaeter], [false, true], 'derselbe Spruch nach cool noch nicht, nach same wieder');
      t.eq([r.tot, r.boden], [false, true], 'Tot funkt nicht, Am Boden darf');
      t.eq([r.entkommen, r.weg, r.fremd], [false, false, false], 'Entkommene, Gegangene und ein fehlender Spieler: abgelehnt');
      t.eq(r.kaputt, 0, 'kaputte Nachrichten ohne Wirkung');
      t.eq(r.lobby, false, 'in der Lobby abgelehnt');
    },
  },
  {
    name: 'Funkspruch, Absender: Eine gefaelschte Id in der Nachricht aendert nichts, der Spruch kommt vom Spieler der Verbindung; Platz 3 der Phase 1 markiert die eigene Stelle, Platz 4 den Punkt am Fadenkreuz (geklemmt auf die Karte, Muell faellt auf die eigene Stelle zurueck)',
    async run(t) {
      await t.loadTool('loopnet.js'); await t.loadInpage('coop.js');
      const r = await t.page.evaluate(`(() => { const { G, A, B, C } = ${SETUP}, o = {}, P = A.get().players, F = A.CFG.funk, c = A.NET.conns[0];
        c.onmsg({ t: 'rad', c: 0, id: 0, pid: 0, from: 0 }); G.run(.5); o.sender = A.funk().last.slice(0, 2); G.run(F.cool + F.same);
        c.onmsg({ t: 'rad', c: 2, x: 9, y: 9 }); G.run(.2); o.eigen = A.funk().last.slice(2).map(Math.round).concat([Math.round(P[1].x), Math.round(P[1].y)]); G.run(F.cool + .1);
        c.onmsg({ t: 'rad', c: 3, x: 1e9, y: -1e9 }); G.run(.2); o.klemm = A.funk().last.slice(2); G.run(F.same + .1);
        c.onmsg({ t: 'rad', c: 3, x: 'abc', y: {} }); G.run(.2); o.muell = A.funk().last.slice(2).map(Math.round).concat([Math.round(P[1].x), Math.round(P[1].y)]); G.run(F.same + .1);
        c.onmsg({ t: 'rad', c: 3, x: 300, y: 250 }); G.run(.2); o.punkt = A.funk().last.slice(2);
        const w = A.world(); o.lim = [(w.WX0 + w.W) * 32, w.WY0 * 32]; return o; })()`);
      t.eq(r.sender, [1, 0], 'Sender ist Spieler 1 (Blau), nicht die gefaelschte Id 0, Spruch 0');
      t.eq([r.eigen[0], r.eigen[1]], [r.eigen[2], r.eigen[3]], 'Platz 3 (Sammeln bei mir): die Stelle des Senders, nicht die Zahlen des Clients');
      t.eq(r.klemm, r.lim, 'Punkt am Fadenkreuz wird auf die Karte geklemmt (rechter und oberer Rand)');
      t.eq([r.muell[0], r.muell[1]], [r.muell[2], r.muell[3]], 'Muell statt Zahlen: die eigene Stelle');
      t.eq(r.punkt, [300, 250], 'ein gueltiger Punkt kommt unveraendert an');
    },
  },
  {
    name: 'Funk-Ton: SND.rad kommt bei jedem Empfaenger einmal, mit der Tonart des Spruchs, beim Sender leise; Modus stumm (nur Meldung) und stimme (Sprachausgabe, nicht fuer den eigenen Spruch, Deutsch) und Modus wird gespeichert',
    async run(t) {
      await t.loadTool('loopnet.js'); await t.loadInpage('coop.js');
      const r = await t.page.evaluate(`(() => { const { G, A, B, C, key } = ${SETUP}, o = {}, calls = [], spoken = [];
        const rad0 = A.SND.rad; A.SND.rad = (k, soft) => calls.push([k, soft ? 1 : 0, ]);
        window.SpeechSynthesisUtterance = function (s) { this.text = s; }; Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: { speak: u => spoken.push([u.text, u.lang]), cancel() { } } });
        key(B, 'x'); key(B, '1'); G.run(.6); o.alle = calls.slice().sort(); o.gesprochen = spoken.length; calls.length = 0;
        G.run(A.CFG.funk.cool + A.CFG.funk.same + .1); A.setFunkMode('stimme'); C.setFunkMode('stumm'); o.modi = [A.funk().mode, B.funk().mode, C.funk().mode]; o.gespeichert = localStorage.getItem('holdup.funk');
        key(B, 'x'); key(B, '2'); G.run(.6); o.stumm = calls.slice().sort(); o.stimme = spoken.slice(); o.feedC = C.msgs().feed.filter(s => /leise/.test(s)).length;
        spoken.length = 0; key(A, 'x'); key(A, '4'); G.run(.4); o.eigen = spoken.length; A.setFunkMode('quatsch'); o.quatsch = A.funk().mode; A.SND.rad = rad0;
        return o; })()`);
      t.eq(r.alle, [[ 'help', 0 ], [ 'help', 0 ], [ 'help', 1 ]], 'Hilfe: drei Empfaenger, die Tonart help, beim Sender (Blau) leise');
      t.eq(r.gesprochen, 0, 'im Modus ton keine Sprachausgabe');
      t.eq(r.modi, ['stimme', 'ton', 'stumm'], 'Modi je Instanz');
      t.eq(r.gespeichert, 'stumm', 'der Modus steht in localStorage (holdup.funk)');
      t.eq(r.stumm, [['quiet', 0], ['quiet', 1]], 'stumm: der Stumme bekommt keinen Ton (nur zwei von drei), die Meldung bleibt: ' + r.feedC);
      t.eq(r.feedC, 1, 'der Stumme sieht den Spruch trotzdem');
      t.eq(r.stimme.length, 1, 'stimme: der Host spricht den fremden Spruch');
      t.ok(/leise/.test(r.stimme[0][0]) && /Blau/.test(r.stimme[0][0]) && r.stimme[0][1] === 'de-DE', 'Name und Text, Sprache de-DE: ' + JSON.stringify(r.stimme[0]));
      t.eq(r.eigen, 0, 'der eigene Spruch wird nicht vorgelesen');
      t.eq(r.quatsch, 'stimme', 'ein ungueltiger Modus aendert nichts');
    },
  },
  {
    name: 'Optionen: Kachel "Funk: Ton / Ton+Stimme / stumm" (Taste X) schaltet reihum und speichert, die Stimme meldet sich beim Umschalten, das Fenster bleibt im Bild und ohne Ueberlappung (Titel, Pause, mit und ohne #debug-Zeilen); die Anleitung nennt X',
    async run(t) {
      await t.loadTool('loopnet.js'); await t.loadInpage('menu.js'); await t.loadInpage('overlap.js');
      const r = await t.page.evaluate(() => {
        const net = LoopNet(30, 0), d = MT.solo(net), k = x => MT.k(d, x), o = {}, spoken = [];
        window.SpeechSynthesisUtterance = function (s) { this.text = s; }; Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: { speak: u => spoken.push(u.text), cancel() { } } });
        k('o'); const tl = MT.tile(d, 'funk'); o.da = !!tl; o.titel = [tl && tl.title];
        MT.click(d, 'funk'); o.titel.push(MT.tile(d, 'funk').title); o.modus1 = d.funk().mode; o.gesprochen = spoken.length;
        MT.click(d, 'funk'); o.titel.push(MT.tile(d, 'funk').title); o.modus2 = d.funk().mode;
        k('x'); o.titel.push(MT.tile(d, 'funk').title); o.modus3 = d.funk().mode; o.gespeichert = localStorage.getItem('holdup.funk');
        const box = q => { const c = d.ui().tiles(); return c.map(z => [z.id, z.y + z.h]).sort((a, b) => b[1] - a[1])[0]; };
        o.unten = box(); o.ov = OV.check(d, { modal: true });
        return o; });
      t.eq(r.da, true, 'die Kachel funk steht in den Optionen');
      t.eq(r.titel, ['Funk: Ton', 'Funk: Ton+Stimme', 'Funk: stumm', 'Funk: Ton'], 'Klick, Klick, Taste X: reihum');
      t.eq([r.modus1, r.modus2, r.modus3, r.gespeichert], ['stimme', 'stumm', 'ton', 'ton'], 'Modus und localStorage');
      t.eq(r.gesprochen, 1, 'beim Umschalten auf Stimme spricht die Sprachausgabe einmal');
      t.ok(r.unten[1] <= 544, 'alle Kacheln im Bild: ' + JSON.stringify(r.unten));
      t.eq(r.ov, [], 'keine Ueberlappung: ' + JSON.stringify(r.ov));
    },
  },
  {
    name: 'Funkmenue zeichnen: offen steht der Kopf und die vier Saetze der Phase mit Ziffern im Bild, geschlossen nichts; der Spruch erscheint in der Meldungsliste in Senderfarbe',
    async run(t) {
      await t.loadTool('loopnet.js'); await t.loadInpage('coop.js');
      const r = await t.page.evaluate(`(() => { const { G, A, B, C, key } = ${SETUP}, o = {}, ctx = B.cv.getContext('2d');
        const texts = () => { const txt = [], ot = ctx.fillText; ctx.fillText = function (s) { txt.push(String(s)); return ot.apply(this, arguments); }; B.draw(); ctx.fillText = ot; return txt; };
        o.zu = texts().filter(s => /Funk|leise|Hilfe|Sammeln|Achtung/.test(s)); key(B, 'x'); o.auf = texts().filter(s => /Funk|leise|Hilfe|Sammeln|Achtung/.test(s));
        key(B, 'x'); key(A, 'x'); key(A, '2'); G.run(.4); o.feed = texts().filter(s => /leise/.test(s)); return o; })()`);
      t.eq(r.zu, [], 'geschlossen: kein Funktext im Bild');
      t.ok(r.auf.some(s => /Funk/.test(s)), 'offen: Kopf Funk: ' + JSON.stringify(r.auf));
      for (const w of ['Ich brauche Hilfe!', 'Lasst uns leise vorgehen!', 'Sammeln bei mir!', 'Achtung, hier!']) t.ok(r.auf.some(s => s.includes(w)), 'offen: ' + w);
      t.ok(r.feed.some(s => s.includes('Orange: Lasst uns leise vorgehen!')), 'der Spruch steht in der Meldungsliste: ' + JSON.stringify(r.feed));
    },
  },
];
