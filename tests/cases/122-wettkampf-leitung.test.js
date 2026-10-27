// Coop-Ausbau W1 (docs/coop-ausbau.md, Spur W): Gegner-Leitung. Zwei normale Coop-Raeume (zwei Hosts) und eine duenne Leitung dazwischen: Host B verbindet sich mit dem Code von Host A (dritte Verbindungsart neben Spieler und
// Zuschauer: hi mit rv:1, Antwort dl ok), danach laufen nur noch Nachrichten der Art dl (st, go, bye). A leitet (Wettkampf eroeffnen), beide Teams muessen gleich gross und bereit sein, dann schickt A go mit der Liste der
// Auftraege (Seed und Szenario je Runde, aus dem Rang-Pool) und beide Hosts zaehlen CFG.duel.count Sekunden und starten mit denselben Werten. Spieler und Zuschauer sehen den Gegner in der Lobby (ros.du). Jede Seite hat eine
// eigene Serie (opt.session).
const RAW = `(D, host, m, wait) => { const out = []; D.net.join(host.NET.code, { onOpen(c) { c.onmsg = x => out.push(x); c.send(m); }, onError(e) { out.push('err ' + e); } }); D.run(wait || 1.5); return out; }`;
const LINK = `(D) => { D.A.duelOpen(); D.run(.3); D.B.duelJoin(D.A.NET.code); D.run(1.5); }`;
const TEXTS = `(d) => { const c = d.cv.getContext('2d'), txt = [], ft = c.fillText; c.fillText = function (s) { txt.push(String(s)); return ft.apply(this, arguments); }; d.draw(); c.fillText = ft; return txt; }`;

module.exports = [
  {
    name: 'Handschlag: Wettkampf eroeffnen (A), beitreten (B mit dem Raumcode von A), danach kennt jeder Host das Gegner-Team (Name, Spielerzahl, Raumcode), Spieler beider Raeume sehen es in ros.du; eine eigene Serie je Team',
    async run(t) {
      await t.loadTool('loopnet.js'); await t.loadInpage('coop.js');
      const r = await t.page.evaluate(`(() => { const D = CT.mkDuel(2, 2), { A, B, pa, pb } = D, o = {};
        o.vor = [A.NET.duel, B.NET.duel, A.NET.du, B.NET.du]; o.serien = [D.sA !== D.sB, A.SESSION === D.sA, pa[1].SESSION === D.sA, B.SESSION === D.sB];
        o.selbst = [B.duelJoin(B.NET.code), B.duelJoin('ab'), B.duelJoin(''), B.NET.duel];
        A.duelOpen(); D.run(.3); o.offen = [A.NET.duel.lead, A.NET.duel.link, A.NET.duel.rv, A.NET.du && A.NET.du.lead, B.NET.duel];
        B.duelJoin(A.NET.code); D.run(1.5);
        o.a = [!!A.NET.duel.link, A.NET.duel.rv.nm, A.NET.duel.rv.n, A.NET.duel.rv.code === B.NET.code]; o.b = [!!B.NET.duel.link, B.NET.duel.lead, B.NET.duel.rv.nm, B.NET.duel.rv.n, B.NET.duel.rv.code === A.NET.code];
        o.du = [pa[1].NET.du, pb[1].NET.du, A.NET.du, B.NET.du].map(x => x && [x.nm, x.n, x.rdy, x.my, x.cd]); o.roster = [A.NET.roster.length, B.NET.roster.length]; return o; })()`);
      t.eq(r.vor, [null, null, null, null], 'ohne Wettkampf ist nichts da'); t.eq(r.serien, [true, true, true, true], 'jedes Team hat eine eigene Serie (SESSION je Instanz, Mitspieler teilen die des Hosts)');
      t.eq(r.selbst, [false, false, false, null], 'der eigene Raumcode und ungueltige Codes sind kein Wettkampf-Beitritt');
      t.eq(r.offen, [true, null, null, 1, null], 'A hat den Wettkampf eroeffnet und wartet (Leiter, keine Leitung, kein Gegner)');
      t.eq(r.a, [true, 'Bert', 2, true], 'A kennt Bert, die Teamgroesse und den Raumcode von B'); t.eq(r.b, [true, false, 'Anna', 2, true], 'B ist der Gast und kennt Anna, Teamgroesse und den Raumcode von A');
      t.eq(r.du, [['Bert', 2, 0, 0, 0], ['Anna', 2, 0, 0, 0], ['Bert', 2, 0, 0, 0], ['Anna', 2, 0, 0, 0]], 'Spieler und Hosts beider Raeume sehen das Gegner-Team (Name, Spielerzahl, bereit, eigenes Bereit, Countdown)'); t.eq(r.roster, [2, 2], 'die Raeume bleiben getrennt');
    },
  },
  {
    name: 'Positivliste und Abweisungen: falsche Version oder kein offener Wettkampf oder schon ein Gegner oder laufendes Spiel werden abgewiesen; Spieler und Zuschauer koennen dl nicht senden; der Gegner kann ausser dl nichts senden, und go nur der Leiter',
    async run(t) {
      await t.loadTool('loopnet.js'); await t.loadInpage('coop.js');
      const r = await t.page.evaluate(`(() => { const D = CT.mkDuel(2, 2), { A, B, pa } = D, o = {}, raw = ${RAW}, link = ${LINK}, hi = (x) => Object.assign({ t: 'hi', ver: A.VER, b: A.BUILD.n, rv: 1, nm: 'X', n: 2, code: 'ZZZZ' }, x || {});
        o.keinWk = raw(D, A, hi()); A.duelOpen(); D.run(.3);
        o.version = raw(D, A, hi({ ver: 1 })); o.build = raw(D, A, hi({ b: 1 }));
        B.duelJoin(A.NET.code); D.run(1.5); o.ok = [!!A.NET.duel.link, A.NET.duel.rv.nm]; o.zweiter = raw(D, A, hi({ nm: 'Zweiter' })); o.nochB = [A.NET.duel.rv.nm];
        // Spieler und Zuschauer
        const S = CT.addSpec({ net: D.net, A, insts: D.insts }); D.run(2);
        pa[1].NET.conn.send({ t: 'dl', k: 'st', n: 2, rdy: 1, nm: 'Fake' }); pa[1].NET.conn.send({ t: 'dl', k: 'go', jobs: [{ sd: 5, sc: 'bank' }], cd: 1 }); S.NET.conn.send({ t: 'dl', k: 'st', n: 2, rdy: 1, nm: 'Fake2' }); S.NET.conn.send({ t: 'dl', k: 'bye' }); D.run(1.5);
        o.fremd = [A.NET.duel.rv.rdy, A.NET.duel.rv.nm, A.NET.duel.cd < 0, !!A.NET.duel.link];
        // Gegner: andere Nachrichten werden verworfen, go nur vom Leiter, ein zweites hi, falsche Teilnehmerzahl
        const L = B.NET.duel.link; B.NET.duel.hb = 9; const before = [A.state().scr, A.NET.roster.length, A.chat().lines.length, A.get().phase];
        for (const m of [{ t: 'in', s: 1, dt: .02 }, { t: 'f' }, { t: 'g' }, { t: 'h' }, { t: 'ch', s: 'x', c: 0 }, { t: 'kit', k: {} }, { t: 'rdy', v: 1, k: {} }, { t: 'u', n: 1 }, { t: 'at', v: 'm' }, { t: 'law' }, hi(), { t: 'dl', k: 'go', jobs: [{ sd: 5, sc: 'bank' }], cd: 1 }, { t: 'dl', k: 'ok' }, { t: 'dl', k: 'nix' }, { t: 'in', k: 'st', n: 4, rdy: 1, nm: 'Y' }, 'Muell', 7, null]) L.send(m); D.run(1.5);
        o.verworfen = [A.state().scr, A.NET.roster.length, A.chat().lines.length, A.get().phase].join() === before.join(); o.nochGegner = [!!A.NET.duel.link, A.NET.duel.cd < 0, A.NET.duel.rv.rdy, A.NET.duel.rv.n, A.NET.duel.rv.nm];
        B.NET.duel.hb = 9; L.send({ t: 'dl', k: 'st', n: 3, rdy: 1, nm: 'Bert Neu' }); D.run(.5); o.st = [A.NET.duel.rv.n, A.NET.duel.rv.rdy, A.NET.duel.rv.nm];
        L.send({ t: 'dl', k: 'st', n: 99, rdy: 5, nm: '<b>Boese</b> ' + 'x'.repeat(80) }); D.run(.5); o.st2 = [A.NET.duel.rv.n, A.NET.duel.rv.rdy, A.NET.duel.rv.nm.length <= 20, /[<>]/.test(A.NET.duel.rv.nm)];
        // laufendes Spiel
        const D2 = CT.mkDuel(2, 1), raw2 = raw; D2.A.duelOpen(); D2.run(.3); D2.A.startCoop(); D2.run(1); o.start = [D2.A.NET.duel, D2.A.state().scr]; o.laeuft = raw2(D2, D2.A, hi({ ver: D2.A.VER, b: D2.A.BUILD.n }));
        return o; })()`);
      const rej = (a, re) => a.length === 1 && a[0].t === 'rej' && re.test(a[0].why);
      t.ok(rej(r.keinWk, /Wettkampf/), 'ohne offenen Wettkampf: abgewiesen: ' + JSON.stringify(r.keinWk)); t.ok(rej(r.version, /Versionen/), 'falsche Version: ' + JSON.stringify(r.version)); t.ok(rej(r.build, /Versionen/), 'falscher Build');
      t.eq(r.ok, [true, 'Bert'], 'der echte Gegner kommt rein'); t.ok(rej(r.zweiter, /Gegner/), 'ein zweiter Gegner wird abgewiesen: ' + JSON.stringify(r.zweiter)); t.eq(r.nochB, ['Bert'], 'Bert bleibt der Gegner');
      t.eq(r.fremd, [0, 'Bert', true, true], 'Spieler und Zuschauer koennen dl nicht senden (Bereit, Name, Start, Leitung bleiben)');
      t.eq(r.verworfen, true, 'vom Gegner wird alles verworfen ausser dl (Phase, Raum, Chat bleiben)'); t.eq(r.nochGegner, [true, true, 0, 2, 'Bert'], 'ein go vom Gegner startet nichts, ok und Unbekanntes tun nichts');
      t.eq(r.st, [3, 1, 'Bert Neu'], 'st vom Gegner setzt Teamgroesse, Bereit und Namen'); t.eq(r.st2, [4, 1, true, false], 'Werte werden begrenzt (Groesse hoechstens 4, bereit 0 oder 1, Name bereinigt und kurz)');
      t.eq(r.start, [null, 'play'], 'startet der Host ein normales Spiel, endet sein Wettkampf-Angebot'); t.ok(rej(r.laeuft, /laeuft|läuft|Wettkampf/), 'im laufenden Spiel kein Gegner: ' + JSON.stringify(r.laeuft));
    },
  },
  {
    name: 'Bereit und Gleichtakt: Ein Team allein startet nichts, sind beide bereit, zaehlen beide Hosts CFG.duel.count Sekunden und starten im selben Takt mit derselben Karte; Spieler beider Teams spielen mit',
    async run(t) {
      await t.loadTool('loopnet.js'); await t.loadInpage('coop.js');
      const r = await t.page.evaluate(`(() => { const D = CT.mkDuel(2, 2), { A, B, pa, pb } = D, o = {}, link = ${LINK}; link(D);
        A.duelReady(); B.duelReady(); D.net.advance(.3); const inj = m => B.NET.duel.link.onmsg(m);
        inj({ t: 'dl', k: 'go', jobs: [], cd: 3 }); o.leer = [B.NET.duel.cd < 0, B.NET.duel.jobs.length];
        inj({ t: 'dl', k: 'go', jobs: [{ sd: 'x', sc: 'evil' }, { sd: 99999999, sc: 'casino' }, 'junk', null, { sd: 5, sc: 'jewel' }, { sd: 6, sc: 'gas' }, { sd: 7, sc: 'bank' }], cd: 99 }); o.roh = [JSON.stringify(B.NET.duel.jobs), B.NET.duel.cd];
        A.duelReady(); B.duelReady(); D.run(1.5); o.zurueckAll = [A.NET.duel.rdy, B.NET.duel.rdy, A.NET.duel.cd < 0, B.NET.duel.cd < 0, A.state().scr, B.state().scr];
        A.NET.duel.link.send({ t: 'dl', k: 'go', jobs: [{ sd: 7, sc: 'bank' }], cd: 3 }); D.net.advance(.3); o.fremdGo = [B.NET.duel.cd < 0, B.NET.duel.jobs.length];
        A.NET.duel.rv.n = 3; D.run(1.6); o.herz = A.NET.duel.rv.n;
        o.ready0 = [A.duelReady(), A.NET.duel.rdy]; D.run(.6); o.nurA = [A.NET.duel.rdy, B.NET.duel.rv.rdy, A.NET.duel.cd < 0, B.NET.duel.cd < 0, A.NET.du.my, pa[1].NET.du.my, pb[1].NET.du.rdy]; D.run(8); o.nurA2 = [A.state().scr, B.state().scr];
        o.zurueck = [A.duelReady(), A.NET.duel.rdy]; D.run(.6); o.zurueck2 = B.NET.duel.rv.rdy; A.duelReady(); D.run(.6);
        const t0 = D.net.now; B.duelReady(); let tA = null, tB = null, cds = [];
        for (let i = 0; i < 100; i++) { D.run(.1); if (A.NET.duel.cd > 0 && A.NET.du && cds[cds.length - 1] !== A.NET.du.cd) cds.push(A.NET.du.cd); if (tA == null && A.state().scr === 'play') tA = D.net.now - t0; if (tB == null && B.state().scr === 'play') tB = D.net.now - t0; }
        o.takt = [tA, tB, A.CFG.duel.count]; o.cds = cds;
        o.gleich = [CT.diff(CT.sig(A), CT.sig(B)), A.NET.duel.jobs.length, JSON.stringify(A.NET.duel.jobs) === JSON.stringify(B.NET.duel.jobs), A.NET.duel.k, B.NET.duel.k];
        const j0 = A.NET.duel.jobs[0]; o.erste = [A.LAY().seed === j0.sd, A.sc() === j0.sc, B.LAY().seed === j0.sd, B.sc() === j0.sc];
        o.spieler = [pa[1].state().scr, pb[1].state().scr, pa[1].sc() === A.sc(), pb[1].sc() === B.sc(), A.get().players.length, B.get().players.length];
        o.nachStart = [A.NET.duel.rdy, B.NET.duel.rdy, A.NET.duel.cd < 0, B.NET.duel.cd < 0]; return o; })()`);
      t.eq(r.leer, [true, 0], 'ein go ohne Auftraege startet nichts'); t.eq(r.roh, ['[{"sd":1,"sc":"bank"},{"sd":999999,"sc":"casino"},{"sd":1,"sc":"bank"},{"sd":1,"sc":"bank"},{"sd":5,"sc":"jewel"}]', 15], 'go wird bereinigt: Seed 1 bis 999999, unbekanntes Szenario wird bank, hoechstens fuenf Auftraege, Countdown hoechstens 15');
      t.eq(r.zurueckAll, [0, 0, true, true, 'lobby', 'lobby'], 'nach dem Zuruecknehmen ist alles wieder ruhig');
      t.eq(r.fremdGo, [true, 0], 'ein go beim Gast, der nicht bereit ist, startet keinen Countdown'); t.eq(r.herz, 2, 'der Herzschlag (st einmal je Sekunde) stellt einen falschen Stand richtig');
      t.eq(r.ready0, [true, 1], 'A wird bereit'); t.eq(r.nurA, [1, 1, true, true, 1, 1, 1], 'B sieht, dass A bereit ist, A und B zaehlen noch nicht, auch Spieler sehen den Stand'); t.eq(r.nurA2, ['lobby', 'lobby'], 'ein Team allein startet nichts (8 s gewartet)');
      t.eq(r.zurueck, [true, 0], 'noch einmal Bereit nimmt es zurueck'); t.eq(r.zurueck2, 0, 'B sieht es');
      t.ok(r.takt[0] != null && r.takt[1] != null, 'beide starten'); t.ok(Math.abs(r.takt[0] - r.takt[1]) < 300, 'im selben Takt (Unterschied unter 0,3 s): ' + JSON.stringify(r.takt));
      t.ok(r.takt[0] > (r.takt[2] - .3) * 1000 && r.takt[0] < (r.takt[2] + 1.2) * 1000, 'nach etwa ' + r.takt[2] + ' s Countdown (plus Laufzeit): ' + r.takt[0]); t.ok(r.cds.length >= 4 && r.cds[0] <= r.takt[2] && r.cds.every((x, i) => !i || x < r.cds[i - 1]), 'der Countdown zaehlt runter: ' + JSON.stringify(r.cds));
      t.eq(r.gleich, [[], 3, true, 1, 1], 'gleiche Karte, Beute, Lage (CT.sig), gleiche Liste von drei Auftraegen, beide am ersten Auftrag'); t.eq(r.erste, [true, true, true, true], 'beide spielen den ersten Auftrag der Liste');
      t.eq(r.spieler, ['play', 'play', true, true, 2, 2], 'die Mitspieler spielen mit, jedes Team zu zweit'); t.eq(r.nachStart, [0, 0, true, true], 'nach dem Start ist Bereit zurueckgesetzt und der Countdown aus');
    },
  },
  {
    name: 'Gleiche Teamgroesse: 3 gegen 2 kann nicht bereit werden, ein Mitspieler dazu macht es moeglich, aendert sich die Groesse im Countdown, bricht er ab (Bereit der Seite mit der Aenderung faellt zurueck)',
    async run(t) {
      await t.loadTool('loopnet.js'); await t.loadInpage('coop.js');
      const r = await t.page.evaluate(`(() => { const D = CT.mkDuel(3, 2), { A, B, pa, pb } = D, o = {}, link = ${LINK}; link(D);
        o.ungleich = [A.duelReady(), B.duelReady(), A.NET.duel.rdy, B.NET.duel.rdy, A.NET.du.n, B.NET.du.n]; D.run(2);
        const C = mkInst(D.net, 'b2', D.sB); D.insts.push(C); pb.push(C); C.joinRoom(B.NET.code); D.run(2.5); o.gleich = [B.NET.roster.length, A.NET.duel.rv.n];
        o.ready = [A.duelReady(), B.duelReady()]; D.run(2); o.cd = [A.NET.duel.cd > 0, B.NET.duel.cd > 0];
        pb[2].leaveGame(); D.run(1.2); o.abbruch = [B.NET.roster.length, A.NET.duel.cd < 0, B.NET.duel.cd < 0, A.NET.duel.rdy, B.NET.duel.rdy, A.state().scr, B.state().scr, A.NET.duel.rv.n];
        D.run(8); o.still = [A.state().scr, B.state().scr];
        const C2 = mkInst(D.net, 'b3', D.sB); D.insts.push(C2); C2.joinRoom(B.NET.code); D.run(2.5); o.wieder = [A.NET.duel.cd < 0, B.NET.duel.rdy]; B.duelReady(); D.run(1.5); o.neu = [A.NET.duel.cd > 0, B.NET.duel.cd > 0];
        return o; })()`);
      t.eq(r.ungleich, [false, false, 0, 0, 2, 3], '3 gegen 2: keiner kann bereit werden'); t.eq(r.gleich, [3, 3], 'ein Mitspieler dazu: 3 gegen 3'); t.eq(r.ready, [true, true], 'jetzt geht es'); t.eq(r.cd, [true, true], 'der Countdown laeuft');
      t.eq(r.abbruch, [2, true, true, 1, 0, 'lobby', 'lobby', 2], 'geht ein Mitspieler, bricht der Countdown ab, Bereit von B faellt zurueck, A bleibt bereit'); t.eq(r.still, ['lobby', 'lobby'], 'es startet nichts (8 s gewartet)');
      t.eq(r.wieder, [true, 0], 'wieder 3 gegen 3: kein Countdown von selbst, B muss neu bereit sein'); t.eq(r.neu, [true, true], 'dann zaehlen beide wieder');
    },
  },
  {
    name: 'Gegner geht: Verlaesst der Gegner-Host die Leitung (duelLeave), schliesst er den Raum oder beendet der Leiter den Wettkampf, wird alles aufgeraeumt (Countdown aus, Bereit aus, A wartet weiter auf einen Gegner, B ist raus), nichts startet',
    async run(t) {
      await t.loadTool('loopnet.js'); await t.loadInpage('coop.js');
      const r = await t.page.evaluate(`(() => { const D = CT.mkDuel(2, 2), { A, B, pa, pb } = D, o = {}, link = ${LINK};
        const ready = () => { A.duelReady(); B.duelReady(); D.run(2); };
        link(D); ready(); o.cd1 = [A.NET.duel.cd > 0, B.NET.duel.cd > 0]; B.duelLeave(); D.run(1);
        o.a = [A.NET.duel.lead, A.NET.duel.link, A.NET.duel.rv, A.NET.duel.rdy, A.NET.duel.cd < 0, /Gegner/.test(A.NET.msg), A.NET.du.nm]; o.b = [B.NET.duel, B.NET.du, B.state().scr]; D.run(6); o.still = [A.state().scr, B.state().scr, pa[1].state().scr, pb[1].state().scr];
        // neuer Gegner nach dem Gehen
        B.duelJoin(A.NET.code); D.run(1.5); o.neu = [!!A.NET.duel.link, A.NET.duel.rv.nm];
        // B schliesst seinen Raum
        ready(); o.cd2 = A.NET.duel.cd > 0; B.leaveGame(); D.run(1.2); o.zu = [A.NET.duel.link, A.NET.duel.cd < 0, A.NET.duel.rdy, A.state().scr, pb[1].state().scr];
        // der Leiter beendet
        const F = CT.mkDuel(2, 1); F.A.duelOpen(); F.run(.3); F.B.duelJoin(F.A.NET.code); F.run(1.5); F.B.NET.duel.link.close(); F.run(1); o.abriss1 = [F.A.NET.duel.lead, F.A.NET.duel.link, F.A.NET.duel.rv, /Gegner/.test(F.A.NET.msg)];
        const F2 = CT.mkDuel(2, 1); F2.A.duelOpen(); F2.run(.3); F2.B.duelJoin(F2.A.NET.code); F2.run(1.5); F2.A.NET.duel.link.close(); F2.run(1); o.abriss2 = [F2.B.NET.duel, /Leiter/.test(F2.B.NET.msg), !!F2.A.NET.duel.link];
        const E = CT.mkDuel(2, 1); E.A.duelOpen(); E.run(.3); E.B.duelJoin(E.A.NET.code); E.run(1.5); E.A.duelOpen(); E.run(1); o.ende = [E.A.NET.duel, E.A.NET.du, E.B.NET.duel, E.B.NET.du, /Wettkampf/.test(E.B.NET.msg)]; return o; })()`);
      t.eq(r.cd1, [true, true], 'Countdown lief'); t.eq(r.a, [true, null, null, 0, true, true, ''], 'A: weiter offen, keine Leitung, kein Gegner, nicht bereit, Countdown aus, Meldung, Anzeige leer');
      t.eq(r.b, [null, null, 'lobby'], 'B: raus aus dem Wettkampf, Raum bleibt'); t.eq(r.still, ['lobby', 'lobby', 'lobby', 'lobby'], 'es startet nichts');
      t.eq(r.neu, [true, 'Bert'], 'ein neuer Gegner kann beitreten'); t.eq(r.cd2, true, 'zweiter Countdown lief');
      t.eq(r.zu, [null, true, 0, 'lobby', 'title'], 'schliesst B den Raum: Leitung weg, Countdown und Bereit aus, A bleibt in der Lobby (die Mitspieler von B verlieren ihren Host)');
      t.eq(r.abriss1, [true, null, null, true], 'bricht die Leitung ohne bye ab (Gast stuerzt ab), raeumt der Leiter auf und bleibt offen'); t.eq(r.abriss2, [null, true, true], 'bricht die Leitung beim Gast ab, ist der Gast draussen mit Meldung (der Leiter merkt es hier nicht, weil die Test-Leitung nur die Gegenseite benachrichtigt)');
      t.eq([r.ende[0] === null, r.ende[1] === null, r.ende[2], r.ende[3], r.ende[4]], [true, true, null, null, true], 'beendet der Leiter, ist der Wettkampf auf beiden Seiten aus (mit Meldung beim Gast)');
    },
  },
  {
    name: 'Auftraege: Die Liste (CFG.duel.len, Standard 3) kommt aus dem Rang-Pool (Museum erst ab dem dritten, Casino ab dem fuenften Auftrag), jeder Auftrag hat Seed und Szenario, beide Hosts nutzen die Liste der Reihe nach (startNext), jede Seite zaehlt k',
    async run(t) {
      await t.loadTool('loopnet.js'); await t.loadInpage('coop.js');
      const r = await t.page.evaluate(`(() => { const D = CT.mkDuel(2, 2), { A, B, pa } = D, o = {}, link = ${LINK}; A.CFG.duel.len = 5; link(D); A.duelReady(); B.duelReady(); D.run(9);
        const mr = Math.random; Math.random = () => .9999; const J2 = A.duelJobs(); Math.random = mr; o.pool = J2.map((j, i) => [i, j.sc, (A.CFG.rank[j.sc] || 0) <= i]);
        const J = A.NET.duel.jobs; o.liste = [J.length, J.every((j, i) => (A.CFG.rank[j.sc] || 0) <= i), J.every(j => Number.isInteger(j.sd) && j.sd >= 1 && j.sd <= 999999), new Set(J.map(j => j.sd)).size, JSON.stringify(B.NET.duel.jobs) === JSON.stringify(J), J.every(j => ['bank', 'truck', 'jewel', 'gas', 'museum', 'casino'].includes(j.sc))];
        o.rang = A.CFG.rank; A.startNext(); B.startNext(); D.run(1.5); o.zwei = [A.NET.duel.k, B.NET.duel.k, A.LAY().seed === J[1].sd, B.LAY().seed === J[1].sd, A.sc() === J[1].sc, B.sc() === J[1].sc, pa[1].LAY().seed === J[1].sd];
        A.startNext(); B.startNext(); D.run(1); o.drei = [A.NET.duel.k, B.NET.duel.k, A.LAY().seed === J[2].sd, B.LAY().seed === J[2].sd]; return o; })()`);
      t.eq(r.liste, [5, true, true, 5, true, true], 'fuenf Auftraege (len auf 5 gestellt), Rang-Pool, Seeds im Bereich und verschieden, beide Hosts haben dieselbe Liste'); t.ok(r.pool.length === 5 && r.pool.every(x => x[2]), 'auch bei dem hoechsten Zufallswert bleibt der Pool dem Rang treu (jeweils das letzte erlaubte Szenario): ' + JSON.stringify(r.pool)); t.eq(r.zwei, [2, 2, true, true, true, true, true], 'startNext nimmt den zweiten Auftrag der Liste, auch beim Mitspieler');
      t.eq(r.drei, [3, 3, true, true], 'und den dritten');
    },
  },
  {
    name: 'Menues: Lobby-Kachel Wettkampf nur beim Host (Fenster eroeffnen, beitreten, beenden), Raumcode-Seite im Wettkampf-Modus, Kachel Bereit statt Starten, Gegner-Zeile bei allen, keine Ueberdeckung in der Lobby, Auftrags-Kachel im Wettkampf gesperrt',
    async run(t) {
      await t.loadTool('loopnet.js'); await t.loadInpage('coop.js'); await t.loadInpage('menu.js'); await t.loadInpage('overlap.js');
      const r = await t.page.evaluate(`(() => { const D = CT.mkDuel(2, 2), { A, B, pa, pb } = D, o = {}, texts = ${TEXTS}, gegner = d => texts(d).filter(s => /^Gegner: /.test(s));
        o.ohne = [!!MT.tile(A, 'duel'), !!MT.tile(B, 'duel')]; MT.click(A, 'mDuel'); MT.click(B, 'mDuel'); D.run(.3); o.kachel = [!!MT.tile(A, 'duel'), !!MT.tile(B, 'duel'), !!MT.tile(pa[1], 'duel')]; o.start0 = [MT.tile(A, 'start').title, MT.tile(B, 'start').title, !!MT.tile(A, 'start').lock];
        MT.click(A, 'duel'); o.modal1 = A.ui().tiles().map(q => q.id); MT.click(A, 'duelNew'); D.run(.3); o.eroeffnet = [A.NET.duel && A.NET.duel.lead, A.state().scr, A.ui().tiles().some(q => q.id === 'duelNew')];
        MT.click(B, 'duel'); o.modal2 = B.ui().tiles().map(q => q.id); MT.click(B, 'duelJoin'); o.seite = [B.state().scr, MT.tile(B, 'go').title, B.NET.joinDuel]; MT.type(B, A.NET.code.toLowerCase()); MT.click(B, 'go'); D.run(1.5);
        o.verbunden = [!!B.NET.duel.link, B.state().scr, B.NET.joinDuel]; o.start1 = [MT.tile(A, 'start').title, MT.tile(B, 'start').title];
        o.zeilen = [gegner(A), gegner(B), gegner(pa[1]), gegner(pb[1])]; MT.click(A, 'start'); D.run(.6); o.bereit = [MT.tile(A, 'start').title, A.NET.duel.rdy, gegner(B), gegner(pb[1])]; o.ueber = [OV.check(A), OV.check(B), OV.check(pa[1])];
        MT.click(A, 'duel'); o.modal3 = A.ui().tiles().map(q => q.id); o.ueberModal = OV.check(A, { modal: true }); MT.click(A, 'duelEnd'); D.run(1); o.ende = [A.NET.duel, B.NET.duel, MT.tile(A, 'start').title];
        MT.click(B, 'duel'); MT.click(B, 'duelJoin'); MT.k(B, 'Escape'); o.zurueck = [B.state().scr, B.NET.joinDuel]; return o; })()`);
      t.eq(r.ohne, [false, false], 'ohne Modus Coop Wettkampf gibt es die Kachel Wettkampf nicht (R1)'); t.eq(r.kachel, [true, true, false], 'im Modus Coop Wettkampf hat nur ein Host die Kachel Wettkampf'); t.eq(r.start0, ['Starten', 'Starten', true], 'ohne Gegner heisst die Kachel Starten und ist gesperrt');
      t.eq(r.modal1, ['duelNew', 'duelJoin', 'no'], 'Fenster ohne Wettkampf: eroeffnen, beitreten, zurueck'); t.eq(r.eroeffnet, [true, 'lobby', false], 'eroeffnet, Fenster zu, noch in der Lobby');
      t.eq(r.modal2, ['duelNew', 'duelJoin', 'no'], 'beim anderen Host dasselbe Fenster'); t.eq(r.seite, ['join', 'Verbinden', true], 'Beitreten fuehrt zur Raumcode-Seite im Wettkampf-Modus'); t.eq(r.verbunden, [true, 'lobby', false], 'verbunden, wieder in der Lobby, Modus aus');
      t.eq(r.start1, ['Bereit', 'Bereit'], 'mit Gegner heisst die Kachel Bereit'); t.eq(r.zeilen, [['Gegner: Bert, 2 Spieler'], ['Gegner: Anna, 2 Spieler'], ['Gegner: Bert, 2 Spieler'], ['Gegner: Anna, 2 Spieler']], 'die Gegner-Zeile steht bei Hosts und Mitspielern');
      t.eq(r.bereit[0], 'Bereit zurücknehmen', 'nach dem Klick: zuruecknehmen'); t.eq(r.bereit[1], 1, 'A ist bereit'); t.eq(r.bereit.slice(2), [['Gegner: Anna, 2 Spieler, bereit'], ['Gegner: Anna, 2 Spieler, bereit']], 'B und sein Mitspieler sehen es');
      t.eq(r.ueber, [[], [], []], 'keine Ueberdeckung in der Lobby (Host, Gast, Mitspieler)'); t.eq(r.modal3, ['duelEnd', 'no'], 'mit Wettkampf: beenden und zurueck'); t.eq(r.ueberModal, [], 'Fenster ohne Ueberdeckung');
      t.eq([r.ende[0], r.ende[1], r.ende[2]], [null, null, 'Starten'], 'Beenden: beide Seiten aus'); t.eq(r.zurueck, ['lobby', false], 'Esc auf der Raumcode-Seite fuehrt in die Lobby zurueck');
    },
  },
];
