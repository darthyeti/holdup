// Coop-Ausbau W3 (docs/coop-ausbau.md, Spur W): Zuschauer im Wettkampf. Ein Zuschauer, der einem der beiden Raeume zusieht, bekommt vom Host den Code des Gegner-Raums (dlc, nur an Zuschauer, nie an Spieler),
// oeffnet dorthin eine zweite Zuschauer-Verbindung und sieht beide Teams: in voller Ansicht eins (Taste T oder ein Klick auf die Karte wechselt) und auf einer Uebersichtskarte beide als Punkte (das eigene Team gefuellt,
// das andere als Ring). Beide Stroeme laufen mit Verzoegerung (CFG.duel.specDelay, standardmaessig 20 s). Die Zweitverbindung nimmt nur Positivlisten-Nachrichten an, geht sie verloren, spielt die Hauptverbindung weiter.
const START = `(D, spec, sdelay) => { D.A.CFG.duel.len = 3; D.A.CFG.duel.specDelay = D.B.CFG.duel.specDelay = sdelay == null ? 2 : sdelay; D.A.duelOpen(); D.run(.3); D.B.duelJoin(D.A.NET.code); D.run(1.5);
  const S = spec ? CT.addSpec({ net: D.net, A: D.A, insts: D.insts }) : null; D.run(2); D.A.duelReady(); D.B.duelReady(); D.run(9); return S; }`;
const TEXTS = `(d) => { const c = d.cv.getContext('2d'), txt = [], ft = c.fillText; c.fillText = function (s) { txt.push(String(s)); return ft.apply(this, arguments); }; d.draw(); c.fillText = ft; return txt; }`;
const TOSHOP = `(team, run) => { for (const d of team) { for (let i = 0; i < 5 && d.state().scr !== 'shop'; i++) MT.k(d, 'Enter'); } run(.5); for (const d of team.slice(1)) MT.click(d, 'next'); run(.6); }`;
const ROUND = `(d, kind, sec) => { d.setSecured(sec); if (kind === 'win') d.finish(true, 'Sieg'); else d.finish(false, 'Verloren'); }`;

module.exports = [
  {
    name: 'Zweitverbindung: Der Host schickt nur Zuschauern den Code des Gegner-Raums (dlc, mit der Verzoegerung), der Zuschauer oeffnet dorthin eine zweite Verbindung, auch wenn er schon vor dem Wettkampf da war; Spieler bekommen nichts; endet der Wettkampf, schliesst sie sich und die Verzoegerung faellt weg',
    async run(t) {
      await t.loadTool('loopnet.js'); await t.loadInpage('coop.js'); await t.loadInpage('menu.js');
      const r = await t.page.evaluate(`(() => { const D = CT.mkDuel(2, 2), { A, B, pa, pb } = D, o = {}; o.std = A.CFG.duel.specDelay; A.CFG.duel.specDelay = B.CFG.duel.specDelay = 2;
        const seenP = [], seenQ = []; const f = pa[1].NET.conn.onmsg; pa[1].NET.conn.onmsg = m => { seenP.push(m.t); f(m); }; const f2 = pb[1].NET.conn.onmsg; pb[1].NET.conn.onmsg = m => { seenQ.push(m.t); f2(m); };
        const S = mkInst(D.net, 's'); D.insts.push(S); S.joinRoom(A.NET.code, { spec: true }); for (let i = 0; i < 60 && !S.NET.conn; i++) D.run(1 / 60); let nDlc = 0; const f3 = S.NET.conn.onmsg; S.NET.conn.onmsg = m => { if (m.t === 'dlc') nDlc++; f3(m); }; D.run(1.5); o.vorher = [S.sp2(), S.dlDelay(), nDlc]; o.rcStart = A.NET.specs[0].rc;
        A.duelOpen(); D.run(.3); B.duelJoin(A.NET.code); D.run(2.5); o.dlcN = nDlc; o.rcLink = A.NET.specs[0].rc === B.NET.code;
        o.nachher = [S.sp2() && S.sp2().code === B.NET.code, S.sp2() && S.sp2().live, A.NET.specs.length, B.NET.specs.length, S.dlDelay(), S.NET.spec, B.NET.spNames.length];
        o.spieler = [seenP.includes('dlc'), seenQ.includes('dlc'), pa[1].sp2(), pb[1].sp2(), pa[1].dlDelay(), JSON.stringify(A.NET.du).includes(B.NET.code)];
        S.NET.conn.onmsg({ t: 'dlc', c: 'ab' }); S.NET.conn.onmsg({ t: 'dlc', c: '!!!!' }); S.NET.conn.onmsg({ t: 'dlc', c: S.NET.code }); S.NET.conn.onmsg({ t: 'dlc', c: 12 }); o.falsch = [S.sp2().code === B.NET.code, S.dlDelay()];
        S.NET.conn.onmsg({ t: 'dlc', c: B.NET.code, dl: 9999 }); o.klemme = [S.dlDelay(), S.sp2().live]; S.NET.conn.onmsg({ t: 'dlc', c: B.NET.code.toLowerCase(), dl: 2 }); o.klemme.push(S.dlDelay(), S.sp2().live);
        pa[1].NET.conn.onmsg({ t: 'dlc', c: B.NET.code, dl: 30 }); o.spielerBlind = [pa[1].sp2(), pa[1].dlDelay()];
        B.duelLeave(); D.run(2); o.ende = [S.sp2(), S.dlDelay(), B.NET.specs.length, A.NET.specs.length]; return o; })()`);
      t.eq(r.std, 20, 'Standardverzoegerung im Wettkampf: 20 s'); t.eq(r.vorher, [null, 0, 0], 'ohne Wettkampf keine Zweitverbindung, keine Verzoegerung und kein dlc'); t.eq(r.dlcN, 1, 'genau ein dlc beim Handschlag, nicht bei jeder Spielerliste'); t.eq([r.rcStart, r.rcLink], ['', true], 'der Host merkt je Zuschauer den letzten Stand (leer, dann der Code des Gegners)');
      t.eq(r.nachher, [true, true, 1, 1, 2, true, 1], 'nach dem Handschlag der Hosts: Zweitverbindung zum Raum von B steht (live), beide Hosts zaehlen den Zuschauer, die Verzoegerung gilt (2 s im Test)');
      t.eq(r.spieler, [false, false, null, null, 0, false], 'Spieler bekommen weder dlc noch den Code (auch nicht in ros.du)'); t.eq(r.falsch, [true, 2], 'ungueltige oder eigene Codes aendern nichts'); t.eq(r.klemme, [60, true, 2, true], 'die Verzoegerung ist auf 60 s begrenzt, derselbe Code (auch klein geschrieben) oeffnet keine neue Verbindung');
      t.eq(r.spielerBlind, [null, 0], 'ein Spieler ignoriert dlc'); t.eq(r.ende, [null, 0, 0, 1], 'Wettkampf zu Ende: Zweitverbindung zu, Verzoegerung weg, B hat den Zuschauer nicht mehr, A schon');
    },
  },
  {
    name: 'Uebersicht und Verzoegerung: Der Zuschauer sieht beide Teams auf einer Karte (eigenes gefuellt, anderes als Ring) mit den Namen der Hosts und dem Hinweis T, die Werte der Zweitverbindung kommen um die Verzoegerung spaeter, ohne Wettkampf gibt es weder Karte noch Hinweis',
    async run(t) {
      await t.loadTool('loopnet.js'); await t.loadInpage('coop.js'); await t.loadInpage('menu.js');
      const r = await t.page.evaluate(`(() => { const D = CT.mkDuel(2, 2), { A, B } = D, o = {}, start = ${START}, texts = ${TEXTS}; const S = start(D, true);
        o.lauf = [S.state().scr, S.sp2().live, S.sp2().go, S.sp2().n, A.get().players.length];
        const a0 = A.get().players[0], b0 = B.get().players[0]; b0.x = a0.x + 160; b0.y = a0.y; D.run(4.5);
        const m = S.spMap(), pick = (L, id) => L.find(q => q.id === id); o.karte = [m.own.length, m.other.length, Math.round(pick(m.own, 0).x - a0.x), Math.round(pick(m.other, 0).x - b0.x), Math.round(pick(m.other, 1).x - B.get().players[1].x)];
        const x1 = b0.x + 40; b0.x = x1; D.run(1.2); o.frueh = Math.round(pick(S.spMap().other, 0).x - x1); D.run(2); o.spaet = Math.round(pick(S.spMap().other, 0).x - x1);
        const tx = texts(S); o.texte = [tx.includes('Anna'), tx.includes('Bert'), tx.some(s => /^T: Team wechseln/.test(s)), S.spLegend()]; o.rechteck = S.spMapRect();
        const bp = B.get().players; bp[1].dead = true; D.run(2.5); o.tot = pick(S.spMap().other, 1).d; bp[1].dead = false; bp[1].gone = true; D.run(2.5); o.weg = [S.spMap().other.length, S.spMap().own.length]; bp[1].gone = false; D.run(2.5); o.da = S.spMap().other.length; const ap = A.get().players; ap[1].gone = true; D.run(2.5); o.ownWeg = S.spMap().own.length; ap[1].gone = false;
        const G = CT.mkGame('bank', 321, 2, 40, 0), S2 = CT.addSpec(G); G.run(3); o.ohne = [S2.sp2(), S2.dlDelay(), texts(S2).some(s => /Team wechseln/.test(s)), S2.specKey('t')]; return o; })()`);
      t.eq(r.lauf, ['play', true, true, 2, 2], 'beide Strome laufen: Hauptwelt im Spiel, Zweitverbindung live mit Start und Spielerzeilen');
      t.eq(r.karte, [2, 2, 0, 0, 0], 'die Karte zeigt zwei Spieler je Team an den Orten der jeweiligen Welt (B um 160 Pixel versetzt)'); t.ok(r.frueh !== 0 && r.frueh === -40, 'nach 1,2 s zeigt der Zuschauer die Bewegung von B noch nicht (Verzoegerung 2 s): ' + r.frueh); t.eq(r.spaet, 0, 'nach weiteren 2 s ist die Bewegung da');
      t.eq(r.texte, [true, true, true, ['Anna', 'Bert']], 'die Legende nennt beide Hosts (das eigene Team zuerst) und die Taste T'); t.eq(r.tot, 1, 'ein ausgeschalteter Spieler des anderen Teams steht als tot in der Karte'); t.eq(r.weg, [1, 2], 'ein gegangener Spieler faellt aus der Karte'); t.eq(r.da, 2, 'und kommt zurueck'); t.eq(r.ownWeg, 1, 'auch im eigenen Team (gegangene Spieler fehlen)'); t.ok(r.rechteck && r.rechteck.x >= 0 && r.rechteck.y >= 0 && r.rechteck.x + r.rechteck.w <= 960 && r.rechteck.y + r.rechteck.h <= 520, 'die Karte liegt im Bild: ' + JSON.stringify(r.rechteck));
      t.eq(r.ohne, [null, 0, false, false], 'ohne Wettkampf keine Karte, kein Hinweis, T bewirkt nichts');
    },
  },
  {
    name: 'Umschalten: T (oder ein Klick auf die Karte) tauscht die Ansicht: die Welt des anderen Teams wird aus dem Stand der Zweitverbindung aufgebaut (gleicher Auftrag, andere Beute), der bisherige Strom wird zur Karte; ein Ergebnis des anderen Teams erscheint nach dem Umschalten als Ergebnisbild; zwei Mal T ist wieder die Ausgangsansicht',
    async run(t) {
      await t.loadTool('loopnet.js'); await t.loadInpage('coop.js'); await t.loadInpage('menu.js');
      const r = await t.page.evaluate(`(() => { const D = CT.mkDuel(2, 2), { A, B } = D, o = {}, start = ${START}, texts = ${TEXTS}, round = ${ROUND}; B.NET.sidN = 5; const S = start(D, true);
        A.setSecured(1111); B.setSecured(2222); const b0 = B.get().players[0]; b0.x = A.get().players[0].x + 120; D.run(4.5);
        o.vor = [S.get().secured, S.NET.code === A.NET.code, Math.abs(S.get().players[0].x - A.get().players[0].x) < 1, S.LAY().seed];
        const cB = S.NET.sp2.conn, sidB = S.NET.sp2.sid; S.NET.sp2.live = false; o.nl = [S.specKey('t'), S.NET.code === A.NET.code]; S.NET.sp2.live = true; S.specKey('v'); o.freiVor = S.spec().free; S.specKey('v'); S.specKey('v');
        S.specKey('t'); o.rollen = [S.NET.conn === cB, S.NET.sid === sidB && sidB === 6, S.NET.roster[0].name, S.NET.du && S.NET.du.nm, S.spec().free, S.spec().t]; o.legendeB = S.spLegend();
        o.sofort = [S.NET.code === B.NET.code, S.sp2().code === A.NET.code, S.state().scr, S.get().secured, Math.round(S.get().players[0].x - b0.x), S.LAY().seed === o.vor[3], S.get().ended ? 1 : 0];
        D.run(3); o.danach = [S.get().secured, Math.round(S.spMap().own[0].x - b0.x), S.spMap().other.length, A.NET.specs.length, B.NET.specs.length, S.sp2().live];
        S.specKey('t'); D.run(.3); o.zurueck = [S.NET.code === A.NET.code, S.get().secured, S.sp2().code === B.NET.code];
        round(B, 'win', 5000); D.run(3.5); o.ergebnis = [S.get().ended ? 1 : 0, S.sp2().end];
        S.specKey('t'); D.run(.3); o.zuB = [S.NET.code === B.NET.code, S.get().ended ? 1 : 0, S.state().scr];
        S.cv.dispatchEvent(new KeyboardEvent('keydown', { key: 't', bubbles: true })); D.run(.3); o.taste = [S.NET.code === A.NET.code, S.get().ended ? 1 : 0]; S.specKey('t'); D.run(.3); S.specKey('t'); D.run(.3); const R = S.spMapRect(); S.specClick(R.x + 20, R.y + 60); D.run(.3); o.klick = [S.NET.code === B.NET.code]; S.specKey('t'); D.run(.3); const R2 = S.spMapRect(); o.daneben = [S.specClick(R2.x - 10, R2.y + 60), S.specClick(R2.x + R2.w + 1, R2.y + 60), S.NET.code === A.NET.code];
        { const E = CT.mkDuel(2, 2), S9 = start(E, true); round(E.A, 'win', 3000); E.run(3.5); o.aEnd = [S9.get().ended ? 1 : 0]; S9.specKey('t'); E.run(.3); o.inB = [S9.get().ended ? 1 : 0, S9.NET.code === E.B.NET.code]; S9.specKey('t'); E.run(.3); o.backA = [S9.get().ended ? 1 : 0, S9.NET.code === E.A.NET.code]; }
        return o; })()`);
      t.eq(r.vor.slice(0, 3), [1111, true, true], 'zuerst die Welt von A (Beute 1111)'); t.eq(r.freiVor, true, 'vor dem Umschalten war die freie Kamera an'); t.eq(r.nl, [true, true], 'ohne stehende Zweitverbindung (nicht live) wird nicht umgeschaltet');
      t.eq(r.rollen, [true, true, 'Bert', 'Anna', false, null], 'Hauptverbindung, Zuschauer-Nummer, Spielerliste und Duell-Anzeige wechseln mit, die freie Kamera ist aus'); t.eq(r.legendeB, ['Bert', 'Anna'], 'die Legende der Karte steht jetzt andersherum');
      t.eq(r.sofort.slice(0, 2), [true, true], 'nach T ist B die Hauptverbindung, A die zweite'); t.eq(r.sofort[2], 'play', 'weiter im Spiel'); t.eq(r.sofort[3], 2222, 'sofort die Beute von B (aus dem letzten Schnappschuss der Zweitverbindung)'); t.eq(r.sofort[4], 0, 'die Spieler stehen wie bei B'); t.ok(r.sofort[5], 'derselbe Auftrag (gleiche Karte)'); t.eq(r.sofort[6], 0, 'kein Ergebnisbild');
      t.eq(r.danach.slice(0, 3), [2222, 0, 2], 'danach weiter der Strom von B; die Karte zeigt jetzt B als eigenes Team und A als anderes'); t.eq(r.danach.slice(3), [1, 1, true], 'jeder Host hat weiter genau einen Zuschauer, die Zweitverbindung lebt');
      t.eq(r.zurueck, [true, 1111, true], 'T noch einmal: wieder A');
      t.eq(r.ergebnis, [0, true], 'ein Ergebnis von B zeigt die Hauptansicht (A) nicht, die Zweitverbindung merkt es'); t.eq(r.zuB, [true, 1, 'play'], 'nach T erscheint das Ergebnisbild von B'); t.ok(r.klick[0], 'ein Klick auf die Karte schaltet ebenfalls um (Ausgangslage A, danach B)'); t.eq(r.daneben, [false, false, true], 'ein Klick neben die Karte schaltet nicht um'); t.eq(r.taste, [true, 0], 'die Taste T schaltet auch auf dem Ergebnisbild um (echtes Tastaturereignis), die Welt ist wieder die laufende von A');
      t.eq([r.aEnd, r.inB, r.backA], [[1], [0, true], [1, true]], 'war die Hauptansicht schon beendet, steht beim Zurueckschalten wieder das Ergebnisbild');
    },
  },
  {
    name: 'Absicherung: Lehnt der Gegner-Raum Zuschauer ab (aus oder voll), bleibt die Karte ohne zweiten Strom mit Meldung und die Hauptansicht laeuft; die Zweitverbindung nimmt nur Spielzustand an (kein Chat, keine Lobby), kick beendet nur sie; Verlassen schliesst beide; Warteschlange bleibt klein',
    async run(t) {
      await t.loadTool('loopnet.js'); await t.loadInpage('coop.js'); await t.loadInpage('menu.js');
      const r = await t.page.evaluate(`(() => { const o = {}, texts = ${TEXTS}, start = ${START};
        { const D = CT.mkDuel(2, 2); D.B.CFG.spec.on = 0; const S = start(D, true); o.aus = [S.sp2().live, S.sp2().msg, S.state().scr, S.get().players.length, D.B.NET.specs.length, texts(S).some(s => /nicht erlaubt/.test(s))]; S.specKey('t'); o.ausT = [S.NET.code === D.A.NET.code]; }
        { const D = CT.mkDuel(2, 2); D.B.CFG.spec.max = 0; const S = start(D, true); o.voll = [S.sp2().live, S.sp2().msg]; }
        { const D = CT.mkDuel(2, 2), { A, B } = D; const S = start(D, true); D.run(2); const lines = S.chat().lines.length, c2 = S.NET.sp2.conn;
          c2.onmsg({ t: 'ch', c: 1, s: 'hallo', n: 'x', sid: 1 }); c2.onmsg({ t: 'lb' }); c2.onmsg({ t: 'dlc', c: 'ABCD', dl: 40 }); c2.onmsg({ t: 'ros', r: [{ id: 0, name: 'Zed' }], sp: [], du: null }); o.fremd = [S.chat().lines.length === lines, S.state().scr, S.dlDelay(), S.NET.roster[0].name !== 'Zed', S.sp2().code === B.NET.code];
          let big = 0; for (let i = 0; i < 12; i++) { D.run(1); big = Math.max(big, S.specQ()); } o.queue = big;
          c2.onmsg({ t: 'kick' }); o.kick = [S.state().scr, S.get().players.length, S.NET.conn ? 1 : 0, S.sp2() && S.sp2().live, S.sp2() && S.sp2().msg]; D.run(.5);
          { const D3 = CT.mkDuel(2, 2), S4 = start(D3, true); S4.NET.sp2.conn.onmsg({ t: 'wel', id: 3, ver: 1, b: 'x' }); o.wel = [S4.sp2().live, S4.sp2().msg, S4.state().scr]; }
          { const D4 = CT.mkDuel(2, 2), S5 = start(D4, true); D4.B.NET.specs[0].close(); D4.run(1); o.zweitWeg = [S5.state().scr, S5.sp2().live, S5.sp2().msg, S5.get().players.length]; }
          { const D5 = CT.mkDuel(2, 2), S6 = start(D5, true); S6.specKey('t'); D5.run(.3); D5.A.NET.specs[0].close(); D5.run(1); o.zweitWegNachTausch = [S6.state().scr, S6.NET.code === D5.B.NET.code, S6.sp2().live, S6.sp2().msg];
            D5.B.NET.specs[0].close(); D5.run(1); o.hauptWegNachTausch = [S6.state().scr, S6.sp2()]; }
          const D2 = CT.mkDuel(2, 2), S3 = start(D2, true), n0 = [D2.A.NET.specs.length, D2.B.NET.specs.length]; S3.leaveGame(); D2.run(1); o.weg = [n0, D2.A.NET.specs.length, D2.B.NET.specs.length, S3.sp2(), S3.state().scr, S3.dlDelay()]; }
        return o; })()`);
      t.eq(r.aus.slice(0, 4), [false, r.aus[1], 'play', 2], 'B erlaubt keine Zuschauer: kein zweiter Strom, Hauptansicht laeuft'); t.ok(/nicht erlaubt/.test(r.aus[1]) && r.aus[4] === 0 && r.aus[5], 'Meldung Zuschauer sind nicht erlaubt (auch auf dem Bild), B hat keinen Zuschauer: ' + JSON.stringify(r.aus)); t.eq(r.ausT, [true], 'T ohne zweiten Strom bleibt bei A');
      t.eq(r.voll[0], false, 'B voll fuer Zuschauer: kein zweiter Strom'); t.ok(/voll/.test(r.voll[1]), 'Meldung: ' + r.voll[1]);
      t.eq(r.fremd, [true, 'play', 2, true, true], 'auf der Zweitverbindung zaehlen Chat, lb und dlc nicht, ein ros aendert nur die Legende, nicht die Hauptansicht');
      t.ok(r.queue > 0 && r.queue < 200, 'die Warteschlange beider Stroeme bleibt klein: ' + r.queue); t.eq(r.kick.slice(0, 3), ['play', 2, 1], 'kick auf der Zweitverbindung: Hauptansicht bleibt'); t.ok(!r.kick[3] && /entfernt|abgewiesen|Abgewiesen/i.test(String(r.kick[4])), 'Zweitverbindung weg mit Meldung: ' + JSON.stringify(r.kick.slice(3)));
      t.eq(r.weg, [[1, 1], 0, 0, null, 'title', 0], 'Verlassen schliesst beide Verbindungen und loescht die Verzoegerung');
      t.eq(r.wel.slice(0, 1).concat(r.wel[2]), [false, 'play'], 'ein gefaelschtes wel mit falscher Nummer oder Version beendet die Zweitverbindung, nicht das Spiel'); t.ok(/Version/.test(r.wel[1]), 'Meldung: ' + r.wel[1]);
      t.eq(r.zweitWeg.slice(0, 2), ['play', false], 'verliert die Zweitverbindung der Host, laeuft die Hauptansicht weiter'); t.ok(/verloren/.test(r.zweitWeg[2]) && r.zweitWeg[3] === 2, 'mit Meldung: ' + JSON.stringify(r.zweitWeg));
      t.eq(r.zweitWegNachTausch.slice(0, 3), ['play', true, false], 'nach dem Umschalten gilt das fuer die vertauschten Rollen (A ist jetzt die zweite Verbindung)'); t.ok(/verloren/.test(r.zweitWegNachTausch[3]), 'Meldung: ' + r.zweitWegNachTausch[3]);
      t.eq(r.hauptWegNachTausch, ['title', null], 'verliert die Hauptverbindung (jetzt B) der Host, endet das Zuschauen mit Rueckkehr zum Titel');
    },
  },
  {
    name: 'Naechste Runde: Spielen beide Teams den zweiten Auftrag, folgt jeder Strom seinem rst, auch der zweite: Umschalten baut die Welt des neuen Auftrags (nicht des alten), hin und zurueck',
    async run(t) {
      await t.loadTool('loopnet.js'); await t.loadInpage('coop.js'); await t.loadInpage('menu.js');
      const r = await t.page.evaluate(`(() => { const D = CT.mkDuel(2, 2), { A, B } = D, o = {}, start = ${START}, round = ${ROUND}, toShop = ${TOSHOP}; const S = start(D, true); const seed1 = A.LAY().seed; D.run(3); o.eins = [S.LAY().seed === seed1];
        round(A, 'win', 10000); round(B, 'win', 20000); D.run(1); toShop(D.pa, D.run); toShop(D.pb, D.run); MT.click(A, 'next'); MT.click(B, 'next'); D.run(9);
        const seed2 = A.LAY().seed; o.neu = [A.state().scr, B.state().scr, seed2 !== seed1, seed2 === B.LAY().seed]; D.run(4.5);
        o.haupt = [S.LAY().seed === seed2, S.get().ended ? 1 : 0, S.sp2().n]; S.specKey('t'); D.run(.3); o.zuB = [S.NET.code === B.NET.code, S.LAY().seed === seed2, S.get().ended ? 1 : 0]; S.specKey('t'); D.run(.3); o.zuA = [S.NET.code === A.NET.code, S.LAY().seed === seed2]; return o; })()`);
      t.eq(r.eins, [true], 'erster Auftrag'); t.eq(r.neu.slice(0, 2), ['play', 'play'], 'beide Teams im zweiten Auftrag'); t.ok(r.neu[2] && r.neu[3], 'neuer Seed, bei beiden gleich');
      t.eq(r.haupt, [true, 0, 2], 'die Hauptansicht folgt dem rst von A, die Karte hat Spielerzeilen von B'); t.eq(r.zuB, [true, true, 0], 'Umschalten baut den neuen Auftrag von B'); t.eq(r.zuA, [true, true], 'und zurueck den neuen Auftrag von A');
    },
  },
];
