// Coop-Ausbau F3 (docs/coop-ausbau.md, Spur F): Textchat. Im Coop (mindestens zwei Spieler) oeffnet im Spiel Enter eine Eingabezeile, in Lobby, Shop, Auftragswahl, Ergebnis und Pause die Taste C. Tippen: Positivliste
// (Buchstaben, Ziffern, Leerzeichen, . , : ; ! ? ' " ( ) + - / % & @ # _), hoechstens CFG.chat.max Zeichen, die Figur bleibt stehen (keine Taste geht ans Spiel), Esc bricht ab ohne zu pausieren, Enter sendet. Client
// schickt {t:'ch',s,c}, der Host bereinigt (cleanChat), prueft (Kanal 0, Zeitsperre CFG.chat.gap und CFG.chat.burst je 20 s, Text), setzt den Absender und verteilt {t:'ch',id,s,c} per bcast an alle (auch in den Menues,
// kein Schnappschuss noetig). Anzeige: Zeilen in Senderfarbe mit Namen, kurzlebig (CFG.chat.lineT), Verlauf bei offener Eingabe. Optionen: Kachel Chat an/aus. Der Flugschreiber nennt nur Absender und Laenge.
const KEY = (d, k, o) => `${d}.cv.dispatchEvent(new KeyboardEvent('keydown', Object.assign({ key: '${k}', bubbles: true }, ${JSON.stringify(o || {})})))`;
const SETUP = `(() => { const G = CT.mkGame('bank', 321, 3), A = G.A, B = G.clients[0], C = G.clients[1], key = (d, k) => d.cv.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true })),
  type = (d, s) => { for (const ch of s) key(d, ch); }, lines = d => d.chat().lines.map(l => [l.id, l.s, l.c]); return { G, A, B, C, key, type, lines }; })()`;
// Spiel zu dritt, lautlos gewonnen: alle sehen das Ergebnis (wie 84-team-leiste)
const WIN = `(() => { const G = CT.mkGame('bank', 321, 3), A = G.A; G.run(1); A.get().players.forEach(p => { p.units = 1; p.loot = 20000; }); G.run(3); return G; })()`;

module.exports = [
  {
    name: 'Chat, Bereinigung (cleanChat): Steuerzeichen, Richtungsumkehr, unsichtbare Zeichen, Emoji und spitze Klammern fallen weg, Leerraum wird zusammengezogen, Umlaute und ß bleiben, hoechstens 60 Zeichen, nur Leerraum ergibt nichts',
    async run(t) {
      const r = await t.page.evaluate(() => { const c = __dbg.cleanChat; return {
        a: c('Hallo  Welt!'), b: c('a\u0000b\u0007c\n d\te'), c: c('x‮y'), d: c('Zero​width'), e: c('Hi \u{1F600} there'), f: c('x'.repeat(100)).length, g: c('Größe ß Ä, 12:30 (ok)'), h: c('   ​  '), i: c('<b>fett</b> & "ok"'), j: c('  vorn und hinten  '), max: __dbg.CFG.chat && __dbg.CFG.chat.max }; });
      t.eq(r.a, 'Hallo Welt!', 'doppelte Leerzeichen zusammengezogen');
      t.eq(r.b, 'abc de', 'Steuerzeichen, Zeilenumbruch und Tabulator fallen weg');
      t.eq(r.c, 'xy', 'Richtungsumkehr U+202E faellt weg');
      t.eq(r.d, 'Zerowidth', 'Zeichen ohne Breite fallen weg');
      t.eq(r.e, 'Hi there', 'Emoji fallen weg, die Luecke wird zusammengezogen');
      t.eq([r.f, r.max], [60, 60], 'hoechstens 60 Zeichen (CFG.chat.max)');
      t.eq(r.g, 'Größe ß Ä, 12:30 (ok)', 'Umlaute, ß, Ziffern und Satzzeichen bleiben');
      t.eq(r.h, '', 'nur Leerraum ergibt nichts');
      t.eq(r.i, 'bfett/b & "ok"', 'spitze Klammern fallen weg');
      t.eq(r.j, 'vorn und hinten', 'Anfang und Ende getrimmt');
    },
  },
  {
    name: 'Chat im Spiel: Enter oeffnet die Zeile beim Client, Tippen und Enter senden, Host und beide Clients lesen "Blau: Hallo Welt" (Zeile in Senderfarbe im Bild), der Flugschreiber nennt nur Absender und Laenge',
    async run(t) {
      await t.loadTool('loopnet.js'); await t.loadInpage('coop.js');
      const r = await t.page.evaluate(`(() => { const { G, A, B, C, key, type, lines } = ${SETUP}, o = {}, ctx = C.cv.getContext('2d');
        key(B, 'Enter'); G.run(.1); o.offen = B.chat().open; type(B, 'Hallo Welt'); o.buf = B.chat().buf; key(B, 'Enter'); G.run(.6);
        o.zu = B.chat().open; o.lines = [A, B, C].map(lines);
        const txt = [], ft = ctx.fillText; ctx.fillText = function (s) { txt.push(String(s)); return ft.apply(this, arguments); }; C.draw(); ctx.fillText = ft; o.bild = txt.filter(s => /Hallo/.test(s));
        o.log = A.flog().dump().ereignisse.filter(e => e[2] === 'chat').map(e => JSON.stringify(e[3])); o.logText = JSON.stringify(A.flog().dump().ereignisse).includes('Hallo Welt');
        return o; })()`);
      t.eq([r.offen, r.buf, r.zu], [true, 'Hallo Welt', false], 'Enter oeffnet, die Eingabe steht im Puffer, Enter sendet und schliesst');
      t.eq(r.lines, [[[1, 'Hallo Welt', 0]], [[1, 'Hallo Welt', 0]], [[1, 'Hallo Welt', 0]]], 'bei Host, Absender und Mitspieler dieselbe Zeile von Spieler 1 im Kanal 0');
      t.ok(r.bild.some(s => s.includes('Blau') && s.includes('Hallo Welt')), 'die Zeile steht mit Namen im Bild: ' + JSON.stringify(r.bild));
      t.eq(r.log, ['[1,10]'], 'der Flugschreiber nennt Absender und Laenge');
      t.eq(r.logText, false, 'aber nie den Text');
    },
  },
  {
    name: 'Chat, Eingabemodus: Waehrend die Zeile offen ist, setzt keine Taste etwas im Spiel (w laeuft nicht, Ziffern sind Text), nur erlaubte Zeichen, hoechstens 60, Backspace, Esc bricht ab und pausiert nicht, leeres Enter sendet nichts; danach geht w wieder',
    async run(t) {
      await t.loadTool('loopnet.js'); await t.loadInpage('coop.js');
      const r = await t.page.evaluate(`(() => { const { G, A, B, C, key, type, lines } = ${SETUP}, o = {}, me = () => B.get().me, y0 = Math.round(me().y), sent = []; const sn = B.NET.conn.send.bind(B.NET.conn); B.NET.conn.send = m => { sent.push(m.t); sn(m); };
        key(B, 'Enter'); key(B, 'w'); G.run(1); o.still = Math.round(me().y) === y0; o.buf1 = B.chat().buf; type(B, '123<>{}x'); o.buf2 = B.chat().buf; key(B, 'Backspace'); o.buf3 = B.chat().buf;
        type(B, 'a'.repeat(80)); o.len = B.chat().buf.length; key(B, 'Escape'); o.esc = [B.chat().open, B.state().paused, B.chat().buf, lines(A).length];
        key(B, 'Enter'); key(B, 'Enter'); G.run(.3); o.leer = [B.chat().open, lines(A).length]; key(B, 'Enter'); type(B, '   '); key(B, 'Enter'); G.run(.3); o.blank = lines(A).length; o.gesendet = sent.filter(x => x === 'ch').length;
        B.cv.dispatchEvent(new KeyboardEvent('keyup', { key: 'w', bubbles: true })); key(B, 'w'); G.run(.5); o.laeuft = Math.round(me().y) < y0;
        return o; })()`);
      t.eq(r.still, true, 'Figur bleibt stehen, w geht nicht ans Spiel');
      t.eq([r.buf1, r.buf2, r.buf3], ['w', 'w123x', 'w123'], 'w und Ziffern sind Text, <>{} fallen weg, Backspace loescht');
      t.eq(r.len, 60, 'hoechstens 60 Zeichen');
      t.eq(r.esc, [false, false, '', 0], 'Esc schliesst, pausiert nicht, verwirft den Puffer, nichts wurde gesendet');
      t.eq(r.leer, [false, 0], 'leeres Enter schliesst und sendet nichts');
      t.eq(r.blank, 0, 'nur Leerzeichen ergibt keine Zeile');
      t.eq(r.gesendet, 0, 'und der Client sendet dafuer nicht einmal eine Nachricht');
      t.eq(r.laeuft, true, 'nach dem Schliessen geht w wieder ans Spiel');
    },
  },
  {
    name: 'Chat in den Menues: C oeffnet die Zeile in Lobby, Shop, Auftragswahl, Ergebnis (Enter sendet dort, geht nicht weiter) und Pause, die Zeile kommt bei allen an; Solo und Titel ignorieren C und Enter',
    async run(t) {
      await t.loadTool('loopnet.js'); await t.loadInpage('coop.js'); await t.loadInpage('menu.js');
      const r = await t.page.evaluate(`(() => { const o = {}, key = (d, k) => MT.k(d, k), type = (d, s) => { for (const ch of s) key(d, ch); }, lines = d => d.chat().lines.map(l => l[1] || l.s);
        // Lobby
        { const net = LoopNet(30, 0), A = mkInst(net, 'a'), B = mkInst(net, 'b'); A.hostRoom(); for (let i = 0; i < 20; i++) step([A, B], net, 1 / 60); B.joinRoom(A.NET.code); for (let i = 0; i < 120; i++) step([A, B], net, 1 / 60);
          key(B, 'c'); o.lobbyOffen = [B.state().scr, B.chat().open]; type(B, 'lobby'); key(B, 'Enter'); for (let i = 0; i < 30; i++) step([A, B], net, 1 / 60); o.lobby = [lines(A), lines(B), B.state().scr]; }
        const G = ${WIN}, [A, B, C] = G.insts; G.run(1);
        // Ergebnis: Enter geht sonst weiter
        key(B, 'c'); o.endeOffen = [B.state().scr, !!B.get().ended, B.chat().open]; type(B, 'ende'); key(B, 'Enter'); G.run(.5); o.ende = [lines(A).slice(-1)[0], B.state().scr, !!B.get().ended, B.chat().open];
        // Shop
        key(B, 'Enter'); key(B, 'Enter'); G.run(1); o.shopScr = B.state().scr; key(B, 'c'); o.shopOffen = B.chat().open; type(B, 'shop'); key(B, 'Enter'); G.run(.5); o.shop = [lines(C).slice(-1)[0], B.state().scr];
        // Auftragswahl (Host)
        key(A, 'Enter'); key(A, 'Enter'); G.run(.5); key(A, 'Enter'); G.run(.2); key(A, 'Enter'); G.run(1); o.missionScr = A.state().scr; key(A, 'c'); type(A, 'wahl'); key(A, 'Enter'); G.run(.5); o.mission = [lines(B).slice(-1)[0], A.state().scr];
        return o; })()`);
      t.eq(r.lobbyOffen, ['lobby', true], 'Lobby: C oeffnet');
      t.eq(r.lobby, [['lobby'], ['lobby'], 'lobby'], 'Lobby: Zeile bei Host und Client, kein Bildschirmwechsel');
      t.eq(r.endeOffen, ['play', true, true], 'Ergebnis: C oeffnet, das Ergebnis bleibt');
      t.eq(r.ende, ['ende', 'play', true, false], 'Ergebnis: Enter sendet und geht nicht weiter');
      t.eq([r.shopScr, r.shopOffen], ['shop', true], 'Shop: C oeffnet');
      t.eq(r.shop, ['shop', 'shop'], 'Shop: Zeile angekommen, im Shop geblieben');
      t.eq(r.missionScr, 'mission', 'Auftragswahl erreicht'); t.eq(r.mission, ['wahl', 'mission'], 'Auftragswahl: Zeile angekommen, dort geblieben');
      const s = await t.page.evaluate(() => { const D = __dbg, cv = document.getElementById('c'); D.sessReset(); D.reset(); const k = x => cv.dispatchEvent(new KeyboardEvent('keydown', { key: x, bubbles: true })); k('Enter'); const a = D.chat().open; k('Escape'); D.toTitle && D.toTitle(); k('c'); return { a, b: D.chat().open }; });
      t.eq([s.a, s.b], [false, false], 'Solo: Enter im Spiel und C im Titel oeffnen den Chat nicht');
    },
  },
  {
    name: 'Chat, Pruefung durch den Host: Zeitsperre (1 Zeile je gap, hoechstens burst je 20 s), Kanal nur 0, Text muss eine Zeichenkette sein, ueberlange Zeilen werden gekuerzt, eine gefaelschte Id zaehlt nicht, in der Lobby und im Spiel gleich',
    async run(t) {
      await t.loadTool('loopnet.js'); await t.loadInpage('coop.js');
      const r = await t.page.evaluate(`(() => { const { G, A, B, C, lines } = ${SETUP}, o = {}, F = A.CFG.chat, c = A.NET.conns[0];
        o.fremdeId = [A.chatHost(9, 'x', 0), A.chatHost(-1, 'x', 0), A.chatHost(undefined, 'x', 0)]; o.erst = A.chatHost(1, 'eins', 0); o.sofort = A.chatHost(1, 'zwei', 0); G.run(F.gap + .1); o.spaeter = A.chatHost(1, 'drei', 0); o.andere = A.chatHost(2, 'vier', 0);
        const n = []; for (let i = 0; i < 8; i++) { G.run(F.gap + .1); n.push(A.chatHost(1, 'b' + i, 0)); } o.burst = n;
        G.run(21); o.nachFenster = A.chatHost(1, 'neu', 0);
        G.run(F.gap + .1); o.kanal = [A.chatHost(2, 'x', 1), A.chatHost(2, 'x', undefined), A.chatHost(2, 'x', '0')]; o.typ = [A.chatHost(2, 123, 0), A.chatHost(2, null, 0), A.chatHost(2, { a: 1 }, 0), A.chatHost(2, '<<>>', 0)];
        G.run(F.gap + .1); c.onmsg({ t: 'ch', id: 0, pid: 0, s: 'fremd', c: 0 }); G.run(.3); o.fremd = lines(C).filter(l => l[1] === 'fremd');
        G.run(F.gap + .1); c.onmsg({ t: 'ch', s: 'y'.repeat(5000), c: 0 }); G.run(.3); o.lang = lines(C).slice(-1)[0][1].length;
        return o; })()`);
      t.eq(r.fremdeId, [false, false, false], 'ein Absender, der nicht in der Spielerliste steht, wird abgelehnt');
      t.eq([r.erst, r.sofort, r.spaeter, r.andere], [true, false, true, true], 'eine Zeile, sofort die naechste abgelehnt, nach gap wieder erlaubt, andere Sender unabhaengig');
      t.eq(r.burst.slice(0, 2), [true, true], 'zunaechst gehen sie durch'); t.ok(r.burst.includes(false), 'zu viele in 20 s (burst) werden abgelehnt: ' + JSON.stringify(r.burst));
      t.eq(r.nachFenster, true, 'nach dem Fenster wieder erlaubt');
      t.eq(r.kanal, [false, false, false], 'nur Kanal 0 (Zahl), die Tribuene ist noch reserviert');
      t.eq(r.typ, [false, false, false, false], 'Zahl, null, Objekt und Text ohne erlaubte Zeichen werden abgelehnt');
      t.eq(r.fremd, [[1, 'fremd', 0]], 'die gefaelschte Id 0 zaehlt nicht, Absender ist Spieler 1');
      t.eq(r.lang, 60, 'eine ueberlange Zeile wird auf 60 Zeichen gekuerzt');
    },
  },
  {
    name: 'Chat beim Ergebnis: Die Zeitsperre laeuft auch, wenn die Spielzeit des Hosts beim Ergebnis stillsteht (eigene Uhr des Chats), nach dem Fenster von 20 s sind wieder alle sechs Zeilen moeglich',
    async run(t) {
      await t.loadTool('loopnet.js'); await t.loadInpage('coop.js');
      const r = await t.page.evaluate(`(() => { const G = ${WIN}, [A, B, C] = G.insts, o = {}, F = A.CFG.chat, z0 = A.get().time;
        o.ended = !!A.get().ended; o.erst = A.chatHost(1, 'a', 0); o.sofort = A.chatHost(1, 'b', 0); G.run(F.gap + .1); o.spaeter = A.chatHost(1, 'c', 0);
        o.zeitStill = Math.abs(A.get().time - A.get().time) < 1e-9; const n = []; for (let i = 0; i < 8; i++) { G.run(F.gap + .1); n.push(A.chatHost(1, 'x' + i, 0)); } o.burst = n.includes(false);
        G.run(21); o.fenster = A.chatHost(1, 'neu', 0); return o; })()`);
      t.eq(r.ended, true, 'der Host steht beim Ergebnis');
      t.eq([r.erst, r.sofort, r.spaeter], [true, false, true], 'nach gap Sekunden geht die naechste Zeile, obwohl die Spielzeit steht');
      t.eq(r.burst, true, 'zu viele in 20 s werden abgelehnt');
      t.eq(r.fenster, true, 'nach dem Fenster wieder erlaubt');
    },
  },
  {
    name: 'Chat, Fenster und Ausblenden: Mit offenem Optionen-Fenster in der Pause gehoert C der Kachel Chat (der Chat oeffnet nicht), "Chat aus" blendet die Zeilen im Bild aus (die Eingabezeile bleibt), nach dem Verlassen des Raums ist der Verlauf leer',
    async run(t) {
      await t.loadTool('loopnet.js'); await t.loadInpage('coop.js'); await t.loadInpage('menu.js');
      const r = await t.page.evaluate(`(() => { const { G, A, B, C, key, type, lines } = ${SETUP}, o = {}, ctx = C.cv.getContext('2d');
        const texts = d => { const c = d.cv.getContext('2d'), txt = [], ft = c.fillText; c.fillText = function (s) { txt.push(String(s)); return ft.apply(this, arguments); }; d.draw(); c.fillText = ft; return txt; };
        A.chatHost(1, 'sichtbar', 0); G.run(.3); o.an = texts(C).filter(s => /sichtbar/.test(s)).length;
        C.setChatShow(false); o.aus = texts(C).filter(s => /sichtbar/.test(s)).length; o.verlauf = lines(C).length; key(C, 'Enter'); const tx = texts(C); o.eingabe = tx.filter(s => s === 'Chat').length; o.eingabeZeilen = tx.filter(s => /sichtbar/.test(s)).length; key(C, 'Escape'); C.setChatShow(true);
        key(B, 'Escape'); G.run(.1); o.pause = B.state().paused; key(B, 'o'); o.modal = B.ui().modal(); const s0 = B.chat().show; key(B, 'c'); o.modalC = [B.chat().open, B.chat().show !== s0, B.ui().modal()];
        A.leaveGame('weg'); o.nachVerlassen = A.chat().lines.length; return o; })()`);
      t.eq([r.an, r.aus], [1, 0], 'die Zeile steht im Bild, mit Chat aus nicht mehr');
      t.eq([r.verlauf, r.eingabe, r.eingabeZeilen], [1, 1, 0], 'sie bleibt im Verlauf, die Eingabezeile steht auch mit Chat aus, die Zeilen bleiben ausgeblendet');
      t.eq([r.pause, r.modal], [true, 'options'], 'Pause und Optionen-Fenster offen');
      t.eq(r.modalC, [false, true, 'options'], 'C im Fenster schaltet die Kachel Chat, der Chat oeffnet nicht');
      t.eq(r.nachVerlassen, 0, 'nach dem Verlassen des Raums ist der Verlauf leer');
    },
  },
  {
    name: 'Chat beim Client: Zeilen vom Host werden noch einmal bereinigt und geprueft (unbekannte Id, Kanal, Nicht-Text, Muell ignoriert), Absender ist die Id des Hosts',
    async run(t) {
      await t.loadTool('loopnet.js'); await t.loadInpage('coop.js');
      const r = await t.page.evaluate(`(() => { const { G, A, B, C, lines } = ${SETUP}, o = {}, c = B.NET.conn;
        for (const m of [{ t: 'ch', id: 1, s: '<<a>>', c: 0 }, { t: 'ch', id: 9, s: 'unbekannt', c: 0 }, { t: 'ch', id: 1, s: 'kanal', c: 1 }, { t: 'ch', id: 1, s: 42, c: 0 }, { t: 'ch', id: 1, s: '<<>>', c: 0 }, { t: 'ch', id: 2, s: 'x'.repeat(500), c: 0 }]) c.onmsg(m);
        o.lines = lines(B).map(l => [l[0], l[1].length > 10 ? l[1].length : l[1]]); return o; })()`);
      t.eq(r.lines, [[1, 'a'], [2, 60]], 'nur die zwei gueltigen Zeilen, bereinigt und gekuerzt');
    },
  },
  {
    name: 'Optionen: Kachel Chat an/aus (Taste C im Fenster) neben Funk, gespeichert (holdup.chat), aus blendet die Zeilen im Bild aus (sie bleiben im Verlauf), keine Ueberlappung',
    async run(t) {
      await t.loadTool('loopnet.js'); await t.loadInpage('coop.js'); await t.loadInpage('menu.js'); await t.loadInpage('overlap.js');
      const r = await t.page.evaluate(`(() => { const o = {}, net = LoopNet(30, 0), d = MT.solo(net), k = x => MT.k(d, x);
        k('o'); o.t0 = MT.tile(d, 'chat') && MT.tile(d, 'chat').title; const f = MT.tile(d, 'funk'), c = MT.tile(d, 'chat'); o.nebeneinander = !!f && !!c && f.y === c.y && f.x + f.w <= c.x; k('c'); o.t1 = MT.tile(d, 'chat').title; o.gespeichert = localStorage.getItem('holdup.chat'); o.zeigt = d.chat().show;
        k('c'); o.t2 = MT.tile(d, 'chat').title; o.zeigt2 = d.chat().show; o.ov = OV.check(d, { modal: true }); return o; })()`);
      t.eq([r.t0, r.t1, r.t2], ['Chat: an', 'Chat: aus', 'Chat: an'], 'Kachel schaltet um (Klick oder C)');
      t.eq(r.nebeneinander, true, 'Funk und Chat stehen nebeneinander (eine Zeile)');
      t.eq([r.gespeichert, r.zeigt, r.zeigt2], ['0', false, true], 'gespeichert (0 = aus) und wirksam');
      t.eq(r.ov, [], 'keine Ueberlappung: ' + JSON.stringify(r.ov));
    },
  },
];
