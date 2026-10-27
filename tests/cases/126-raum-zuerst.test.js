// Coop-Ausbau R1 (docs/coop-ausbau.md, Spur R): Raum zuerst. Der Coop-Hub hat nur noch Raum erstellen und Raum beitreten, der Raum entsteht ohne Modus, der Host waehlt darin Coop spielen oder Coop Wettkampf
// (NET.mode, im Raumstand ros als md), Zuschauer ist eine Rolle im Raum (selbst oder durch den Host, nur in der Lobby), wer beitritt, wenn alle Spielerplaetze belegt sind, wird Zuschauer, und die Lobby hat
// ein Chat-Fenster (Kanal 2, fuer Spieler und Zuschauer). Layout: kein Ueberlapp in allen Zustaenden (inpage/overlap.js).
const SETUP = async t => { await t.loadTool('loopnet.js'); await t.loadInpage('coop.js'); await t.loadInpage('menu.js'); await t.loadInpage('overlap.js'); };

module.exports = [
  {
    name: 'Raum zuerst: der Hub hat nur Raum erstellen und beitreten, der Raum entsteht ohne Modus, der Start ist gesperrt, Mitspieler sehen "Modus offen"',
    async run(t) {
      await SETUP(t);
      const r = await t.page.evaluate(() => {
        const net = LoopNet(40, 0), A = MT.solo(net, 'a'), B = MT.solo(net, 'b'), all = [A, B], run = sec => { for (let i = 0; i < sec * 60; i++) step(all, net, 1 / 60); }, ids = d => d.ui().tiles().map(q => q.id), o = {};
        MT.click(A, 'coop'); o.hub = ids(A).filter(id => id !== 'name' && id !== 'back'); MT.click(A, 'host'); run(1);
        o.A = [A.state().scr, A.NET.role, A.NET.mode]; const code = A.NET.code;
        const a = ids(A); o.tilesA = ['mCoop', 'mDuel', 'start', 'leave', 'link', 'specOn'].map(id => a.includes(id)); o.keineA = ['job', 'duel', 'mode', 'role', 'linkz'].map(id => a.includes(id));
        o.startLock = !!MT.tile(A, 'start').lock;
        MT.click(B, 'coop'); MT.click(B, 'join'); MT.type(B, code); MT.click(B, 'go'); run(3);
        const b = ids(B); o.B = [B.state().scr, B.NET.role, B.NET.mode]; o.tilesB = ['role', 'start', 'leave'].map(id => b.includes(id)); o.keineB = ['mCoop', 'mDuel', 'job', 'specOn'].map(id => b.includes(id));
        o.startB = [MT.tile(B, 'start').title, !!MT.tile(B, 'start').nofocus];
        return o;
      });
      t.eq(r.hub, ['host', 'join'], 'der Hub hat nur Raum erstellen und Raum beitreten');
      t.eq(r.A, ['lobby', 'host', ''], 'der Raum steht ohne Modus');
      t.eq(r.tilesA, [true, true, true, true, true, true], 'der Host sieht die zwei Modus-Kacheln, Start, Raum schliessen, Link und den Zuschauer-Schalter');
      t.eq(r.keineA, [false, false, false, false, false], 'ohne Modus gibt es keine Auftrags-, Wettkampf-, Rollen- oder Zuschauer-Link-Kachel');
      t.ok(r.startLock, 'Starten ist ohne Modus gesperrt');
      t.eq(r.B, ['lobby', 'client', ''], 'der Beitretende sieht denselben Raum, auch ohne Modus');
      t.eq(r.tilesB, [true, true, true], 'ein Mitspieler hat die Rollen-Kachel, den Starthinweis und Verlassen'); t.eq(r.keineB, [false, false, false, false], 'keine Host-Kacheln');
      t.eq(r.startB, ['Der Host wählt den Modus ...', true], 'Mitspieler lesen, dass der Host den Modus waehlt');
    },
  },
  {
    name: 'Raum zuerst: der Host waehlt den Modus (Coop spielen, Coop Wettkampf), die Mitspieler sehen ihn, der Modus laesst sich zuruecknehmen, ein offener Wettkampf endet damit, Starten geht erst mit Modus',
    async run(t) {
      await SETUP(t);
      const r = await t.page.evaluate(() => {
        const net = LoopNet(40, 0), A = MT.solo(net, 'a'), B = MT.solo(net, 'b'), all = [A, B], run = sec => { for (let i = 0; i < sec * 60; i++) step(all, net, 1 / 60); }, ids = d => d.ui().tiles().map(q => q.id), o = {};
        MT.click(A, 'coop'); MT.click(A, 'host'); run(1); const code = A.NET.code; MT.click(B, 'coop'); MT.click(B, 'join'); MT.type(B, code); MT.click(B, 'go'); run(3);
        MT.click(A, 'mCoop'); run(.5); o.coop = [A.NET.mode, B.NET.mode]; const a = ids(A);
        o.tilesCoop = ['job', 'link', 'specOn', 'mode', 'start', 'leave'].map(id => a.includes(id)); o.keineCoop = ['mCoop', 'mDuel', 'duel'].map(id => a.includes(id)); o.startFrei = !MT.tile(A, 'start').lock;
        o.clientJob = [ids(B).includes('job'), !!(MT.tile(B, 'job') || {}).nofocus, (MT.tile(B, 'start') || {}).title];
        MT.click(A, 'mode'); run(.5); o.zurueck = [A.NET.mode, B.NET.mode, !!MT.tile(A, 'start').lock];
        A.duelOpen(); run(.5); o.implizit = [A.NET.mode, B.NET.mode]; A.setMode(''); run(.5);
        MT.click(A, 'mDuel'); run(.5); o.duel = [A.NET.mode, B.NET.mode, ids(A).includes('duel'), ids(A).includes('job')];
        A.duelOpen(); run(.5); o.offen = !!A.NET.duel; MT.click(A, 'mode'); run(.5); o.beendet = [A.NET.duel, A.NET.mode];
        MT.click(A, 'mCoop'); run(.5); MT.click(A, 'start'); run(2); o.start = [A.state().scr, B.state().scr, A.NET.roster.length];
        return o;
      });
      t.eq(r.coop, ['coop', 'coop'], 'Coop spielen: Host und Mitspieler kennen den Modus (ros md)');
      t.eq(r.tilesCoop, [true, true, true, true, true, true], 'Coop-Raum: Auftrag, Link, Zuschauer-Schalter, Modus aendern, Start, Raum schliessen'); t.eq(r.keineCoop, [false, false, false], 'keine Modus-Kacheln und kein Wettkampf-Fenster im Coop');
      t.ok(r.startFrei, 'Starten ist frei'); t.eq(r.clientJob, [true, true, 'Der Host startet ...'], 'Mitspieler sehen den Auftrag (ohne Bedienung) und den Starthinweis');
      t.eq(r.zurueck, ['', '', true], 'Modus aendern geht zurueck in den Raum ohne Modus, bei allen'); t.eq(r.implizit, ['duel', 'duel'], 'ein eroeffneter Wettkampf setzt den Modus Coop Wettkampf selbst');
      t.eq(r.duel, ['duel', 'duel', true, true], 'Coop Wettkampf: Modus bei allen, die Lobby hat das Wettkampf-Fenster (bis R2 mit zwei Raeumen) und den Auftrag');
      t.eq(r.offen, true, 'ein Wettkampf ist offen'); t.eq(r.beendet, [null, ''], 'Modus aendern beendet den offenen Wettkampf');
      t.eq(r.start, ['play', 'play', 2], 'Coop spielen und Starten bringt beide ins Spiel');
    },
  },
  {
    name: 'Raum zuerst: Rolle wechseln in der Lobby (selbst und durch den Host) in beide Richtungen, der Roster und die Verbindungen folgen, der Host selbst bleibt Spieler',
    async run(t) {
      await SETUP(t);
      const r = await t.page.evaluate(() => {
        const G = CT.mkLobby(3, 0), [A, B, C] = G.players, ids = d => d.ui().tiles().map(q => q.id), o = {}, st = () => [A.NET.roster.length, A.NET.conns.length, A.NET.specs.length];
        B.setName('Bo'); G.run(.5); MT.click(A, 'mCoop'); G.run(.5); o.start = st(); o.hostRolle = ids(A).includes('role'); o.titelB = MT.tile(B, 'role').title;
        MT.click(B, 'role'); G.run(1); o.b1 = [B.NET.spec, B.NET.myId, st(), B.NET.msg, MT.tile(B, 'role').title, A.NET.spNames.length, B.NET.roster.length]; o.nameS = A.NET.spNames.slice();
        MT.click(B, 'role'); G.run(1); o.b2 = [B.NET.spec, B.NET.myId, st(), B.NET.msg, MT.tile(B, 'role').title, A.NET.spNames.length]; o.nameP = (A.NET.roster.find(q => q.id === 1) || {}).name;
        MT.click(A, 'kick'); o.modal = ids(A).filter(id => /^k[kr]:/.test(id)).sort();
        MT.click(A, 'kr:2'); G.run(1); o.c1 = [C.NET.spec, C.NET.myId, st(), A.NET.spNames.length]; const sid = A.NET.specs[0].sid;
        o.modal2 = ids(A).filter(id => /^k[kr]:/.test(id)); MT.click(A, 'kr:s' + sid); G.run(1); o.c2 = [C.NET.spec, C.NET.myId, st(), A.NET.spNames.length];
        A.NET.roster.find(q => q.id === 0).name = 'Host'; o.hostWechsel = A.roleSet ? A.roleSet(0, 's') : 'fehlt';
        MT.k(A, 'Escape'); o.sperre = [MT.tile(B, 'role').lock || '']; MT.click(A, 'mode'); G.run(.3); MT.click(A, 'mCoop'); G.run(.3); MT.click(A, 'specOn'); G.run(.5); o.sperre.push(MT.tile(B, 'role').lock || ''); MT.click(A, 'specOn');
        return o;
      });
      t.eq(r.start, [3, 2, 0], 'Ausgangslage: drei Spieler, keine Zuschauer'); t.eq(r.hostRolle, false, 'der Host hat keine Rollen-Kachel'); t.eq(r.titelB, 'Zuschauer werden', 'ein Spieler kann Zuschauer werden');
      t.eq(r.b1.slice(0, 3), [true, -1, [2, 1, 1]], 'nach dem Wechsel: Zuschauer, ohne Platz im Roster, die Verbindung wanderte von den Spielern zu den Zuschauern');
      t.ok(/schaust/.test(r.b1[3]), 'der Wechsel wird gemeldet'); t.eq(r.b1[4], 'Mitspielen', 'die Kachel heisst jetzt Mitspielen'); t.eq(r.b1[5], 1, 'der Host zaehlt einen Zuschauer'); t.eq(r.b1[6], 2, 'der Roster hat zwei Eintraege');
      t.eq(r.b2.slice(0, 3), [false, 1, [3, 2, 0]], 'zurueck: wieder Spieler auf dem freien Platz'); t.ok(/mit/i.test(r.b2[3]), 'auch das wird gemeldet'); t.eq(r.b2[4], 'Zuschauer werden', 'die Kachel heisst wieder Zuschauer werden'); t.eq(r.b2[5], 0, 'kein Zuschauer mehr');
      t.eq(r.modal, ['kk:1', 'kk:2', 'kr:1', 'kr:2'], 'die Teilnehmer-Liste hat je Spieler Rolle und Entfernen'); t.eq(r.c1.slice(0, 3), [true, -1, [2, 1, 1]], 'der Host macht einen Mitspieler zum Zuschauer');
      t.eq(r.modal2.filter(id => id.startsWith('kr:')).length, 2, 'die Liste zeigt auch den Zuschauer mit Rollen-Kachel'); t.eq(r.c2.slice(0, 3), [false, 2, [3, 2, 0]], 'der Host macht ihn wieder zum Spieler, der Platz bleibt frei zugeordnet');
      t.eq(r.hostWechsel, false, 'der Host selbst kann nicht Zuschauer werden'); t.eq(r.sperre, ['', 'Zuschauer aus'], 'schaltet der Host die Zuschauer aus, sieht der Mitspieler den Grund an der Rollen-Kachel'); t.eq(r.nameS, ['Bo'], 'der Name geht als Zuschauer mit'); t.eq(r.nameP, 'Bo', 'und beim Zurueckwechseln wieder in den Roster');
    },
  },
  {
    name: 'Raum zuerst: sind alle Spielerplaetze belegt, wird ein Beitretender Zuschauer, sonst (Zuschauer aus oder voll) abgewiesen; ein Zuschauer kann nur Spieler werden, wenn ein Platz frei ist',
    async run(t) {
      await SETUP(t);
      const r = await t.page.evaluate(() => {
        const G = CT.mkLobby(4, 0), [A] = G.players, o = {}, st = () => [A.NET.roster.length, A.NET.conns.length, A.NET.specs.length];
        MT.click(A, 'mCoop'); G.run(.5);
        const E = mkInst(G.net, 'e'); G.insts.push(E); E.joinRoom(A.NET.code); G.run(3);
        o.e = [E.NET.spec, E.NET.myId, E.state().scr, st(), E.NET.roster.length];
        o.sperre = MT.tile(E, 'role').lock; MT.click(E, 'role'); G.run(.5); E.NET.msg = ''; E.NET.conn.send({ t: 'role', v: 'p' }); G.run(.5); o.voll = [E.NET.spec, st(), E.NET.msg];
        A.kickPlayer(2); G.run(1); o.frei = [st(), E.NET.roster.length]; MT.click(E, 'role'); G.run(1); o.nachFrei = [E.NET.spec, E.NET.myId, st()];
        const F = mkInst(G.net, 'f'); G.insts.push(F); F.joinRoom(A.NET.code); G.run(3); o.f = [F.NET.spec, st()];
        A.CFG.spec.on = 0; const H = mkInst(G.net, 'h'); G.insts.push(H); H.joinRoom(A.NET.code); G.run(3); o.h = [H.state().scr, H.titleNote() && H.titleNote().s, st()];
        A.CFG.spec.on = 1; A.CFG.spec.max = 1; const I = mkInst(G.net, 'i'); G.insts.push(I); I.joinRoom(A.NET.code); G.run(3); o.i = [I.state().scr, I.titleNote() && I.titleNote().s, st()];
        A.kickPlayer(3); G.run(1); o.wechselPlatz = A.NET.roster.length; A.CFG.spec.max = 6; A.CFG.spec.on = 0; A.NET.conns[0].send({ t: 'noop' }); G.run(.3);
        const B = G.insts[1]; B.NET.msg = ''; B.NET.conn.send({ t: 'role', v: 's' }); G.run(.5); o.aus = [B.NET.spec, B.NET.msg, A.NET.specs.length];
        A.CFG.spec.on = 1; A.CFG.spec.max = 1; B.NET.msg = ''; B.NET.conn.send({ t: 'role', v: 's' }); G.run(.5); o.max = [B.NET.spec, B.NET.msg, A.NET.specs.length];
        return o;
      });
      t.eq(r.e, [true, -1, 'lobby', [4, 3, 1], 4], 'der fuenfte wird Zuschauer: kein Platz im Roster, eine Zuschauer-Verbindung');
      t.ok(/belegt/i.test(r.sperre), 'die Rollen-Kachel ist gesperrt und sagt warum'); t.eq(r.voll.slice(0, 2), [true, [4, 3, 1]], 'ohne freien Platz bleibt er Zuschauer, auch wenn die Anfrage beim Host ankommt'); t.ok(/belegt/i.test(r.voll[2]), 'der Host antwortet mit einer Meldung');
      t.eq(r.frei, [[3, 2, 1], 3], 'nach dem Entfernen eines Spielers ist ein Platz frei'); t.eq(r.nachFrei, [false, 2, [4, 3, 0]], 'jetzt kann er Spieler werden, auf dem freien Platz');
      t.eq(r.f, [true, [4, 3, 1]], 'der naechste Beitretende wird wieder Zuschauer'); t.eq(r.aus.slice(0, 1), [false], 'ein Spieler kann bei ausgeschalteten Zuschauern nicht Zuschauer werden'); t.ok(/nicht erlaubt/.test(r.aus[1]), 'mit Meldung'); t.eq(r.max.slice(0, 1), [false], 'und nicht, wenn die Zuschauerplaetze voll sind'); t.ok(/belegt/.test(r.max[1]), 'mit Meldung');
      t.eq(r.h, ['title', 'Der Raum ist voll.', [4, 3, 1]], 'mit ausgeschalteten Zuschauern wird abgewiesen'); t.eq(r.i, ['title', 'Der Raum ist voll.', [4, 3, 1]], 'mit vollen Zuschauerplaetzen auch');
    },
  },
  {
    name: 'Raum zuerst: Chat-Fenster in der Lobby (Kanal 2): Spieler und Zuschauer schreiben, alle lesen, die Fensterkachel oeffnet die Eingabe, im Spiel gilt der Kanal nicht',
    async run(t) {
      await SETUP(t);
      const r = await t.page.evaluate(() => {
        const G = CT.mkLobby(2, 1), [A, B] = G.players, [S] = G.specs, o = {}, lines = d => d.chat().lines.map(l => [l.s, l.c, l.id]), send = (d, s) => { MT.k(d, 'c'); MT.type(d, s); MT.k(d, 'Enter'); };
        MT.click(A, 'mCoop'); G.run(.5);
        o.fenster = [A, B, S].map(d => { const q = MT.tile(d, 'chatbox'); return !!q && !!q.nofocus; });
        send(B, 'hallo'); G.run(.6); o.b = [A, B, S].map(lines);
        send(S, 'von der Tribuene'); G.run(.6); o.s = [A, B, S].map(d => lines(d).slice(-1)[0]);
        MT.click(A, 'chatbox'); o.klick = A.chat().open; MT.k(A, 'Escape'); o.zu = A.chat().open;
        G.run(2); const n0 = lines(A).length; B.NET.conn.send({ t: 'ch', s: 'eins', c: 2 }); B.NET.conn.send({ t: 'ch', s: 'zwei', c: 2 }); G.run(.3); o.sperre = [lines(A).length - n0, lines(A).slice(-1)[0][0]];
        G.run(25); send(A, 'Host schreibt'); G.run(.6); o.host = [A, B, S].map(d => lines(d).slice(-1)[0]);
        MT.click(A, 'start'); G.run(2); const m0 = lines(A).length; B.NET.conn.send({ t: 'ch', s: 'im Spiel', c: 2 }); S.NET.conn.send({ t: 'ch', s: 'im Spiel', c: 2 }); G.run(.5); o.spiel = [A.state().scr, lines(A).length - m0];
        return o;
      });
      t.eq(r.fenster, [true, true, true], 'das Chat-Fenster ist bei Host, Spieler und Zuschauer eine Kachel (ohne Fokus)');
      t.eq(r.b, [[['hallo', 2, 1]], [['hallo', 2, 1]], [['hallo', 2, 1]]], 'die Zeile des Spielers kommt bei allen an, im Kanal 2'); t.eq(r.s.map(x => x && x.slice(0, 2)), [['von der Tribuene', 2], ['von der Tribuene', 2], ['von der Tribuene', 2]], 'ein Zuschauer schreibt in dieselbe Lobby, alle lesen es');
      t.eq(r.s.map(x => x && x[2]), [-1, -1, -1], 'die Absenderkennung des Zuschauers ist -1');
      t.eq(r.klick, true, 'ein Klick auf das Fenster oeffnet die Eingabe'); t.eq(r.zu, false, 'Esc schliesst sie'); t.eq(r.sperre, [1, 'eins'], 'die Zeitsperre gilt auch fuer Kanal 2: von zwei schnellen Zeilen kommt die erste an');
      t.eq(r.host.map(x => x && x[0]), ['Host schreibt', 'Host schreibt', 'Host schreibt'], 'der Host schreibt ebenfalls'); t.eq(r.spiel, ['play', 0], 'im Spiel wird Kanal 2 verworfen');
    },
  },
  {
    name: 'Raum zuerst: ein Link bleibt (Einladung), der Zuschauer-Link der Lobby entfaellt, ein alter Zuschauer-Link (&zu=1) macht beim Beitritt weiter einen Zuschauer',
    async run(t) {
      await SETUP(t);
      const r = await t.page.evaluate(() => {
        const G = CT.mkLobby(1, 0), [A] = G.players, o = {}, copied = [];
        Object.defineProperty(navigator, 'clipboard', { value: { writeText: s => { copied.push(s); return Promise.resolve(); } }, configurable: true });
        MT.click(A, 'mCoop'); G.run(.3); MT.click(A, 'link'); o.links = copied.map(s => s.replace(/^.*#/, '#')); o.code = A.NET.code; o.linkz = A.ui().tiles().some(q => q.id === 'linkz');
        const S = CT.addSpec(G); G.run(3); o.spec = [S.NET.spec, A.NET.specs.length, A.NET.conns.length];
        return o;
      });
      t.eq(r.links, ['#raum=' + r.code], 'ein Einladungslink, nur mit dem Code'); t.eq(r.linkz, false, 'keine Kachel Zuschauer-Link'); t.eq(r.spec, [true, 1, 0], 'ein Beitritt mit spec bleibt ein Zuschauer');
    },
  },
  {
    name: 'Raum zuerst: Rolle und Modus gelten nur in der Lobby (im Spiel ignoriert der Host eine Rollenanfrage, ein Client kann den Modus nicht setzen)',
    async run(t) {
      await SETUP(t);
      const r = await t.page.evaluate(() => {
        const G = CT.mkLobby(3, 0), [A, B, C] = G.players, o = {}, st = () => [A.NET.roster.length, A.NET.conns.length, A.NET.specs.length];
        MT.click(A, 'mCoop'); G.run(.5);
        B.NET.conn.send({ t: 'mode', v: 'duel' }); G.run(.3); o.clientMode = A.NET.mode; A.setMode('quatsch'); o.quatsch = A.NET.mode; C.setMode('duel'); o.clientDirekt = [A.NET.mode, C.NET.mode];
        MT.click(A, 'start'); G.run(2); o.play = A.state().scr; B.NET.conn.send({ t: 'role', v: 's' }); G.run(.5); o.spiel = st(); o.spielModus = [A.setMode(''), A.NET.mode, A.roleSet(2, 's')];
        return o;
      });
      t.eq(r.clientMode, 'coop', 'eine Nachricht mode von einem Client wird verworfen'); t.eq(r.quatsch, 'coop', 'ein unbekannter Modus wird verworfen'); t.eq(r.clientDirekt, ['coop', 'coop'], 'setMode wirkt nur beim Host');
      t.eq(r.play, 'play', 'das Spiel laeuft'); t.eq(r.spiel, [3, 2, 0], 'im Spiel aendert eine Rollenanfrage nichts'); t.eq(r.spielModus, [false, 'coop', false], 'im Spiel ist auch der Modus und der Rollenwechsel des Hosts gesperrt');
    },
  },
  {
    name: 'Raum zuerst: Ueberlappung in allen Zustaenden der Lobby (ohne Modus, Coop, Wettkampf; Host, Mitspieler, Zuschauer; mit Chat-Zeilen und offener Eingabe) und in der Teilnehmer-Liste',
    async run(t) {
      await SETUP(t);
      const r = await t.page.evaluate(() => {
        const G = CT.mkLobby(3, 2), [A, B] = G.players, [S] = G.specs, out = {}, chk = (d, tag) => { const o = OV.check(d); if (o.length) out[tag] = o; };
        const all = (tag) => { chk(A, tag + ' Host'); chk(B, tag + ' Mitspieler'); chk(S, tag + ' Zuschauer'); };
        A.setName('Anna-Lena'); B.setName('Bo'); G.run(.5);
        all('ohne Modus');
        MT.click(A, 'mCoop'); G.run(.5); all('Coop');
        MT.k(B, 'c'); MT.type(B, 'das ist eine ziemlich lange Zeile fuer das kleine Fenster im Raum'); MT.k(B, 'Enter'); G.run(.6); MT.k(A, 'c'); MT.type(A, 'offene Eingabe'); all('Coop mit Chat');
        MT.k(A, 'Escape'); MT.click(A, 'mode'); G.run(.3); MT.click(A, 'mDuel'); G.run(.3); all('Wettkampf');
        A.duelOpen(); G.run(.3); all('Wettkampf offen');
        // Teilnehmer-Liste: ein Fenster ueber der Lobby, geprueft wird es selbst (Kacheln im Bild, keine zwei Kacheln uebereinander, jede im Fenster)
        MT.click(A, 'kick'); const L = A.ui().tiles(), bad = [];
        for (const q of L) if (q.x < 0 || q.y < 0 || q.x + q.w > 960 || q.y + q.h > 544) bad.push('ausserhalb ' + q.id);
        for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) { const a = L[i], b = L[j]; if (a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h) bad.push(a.id + ' ueber ' + b.id); }
        if (bad.length) out['Teilnehmer-Liste'] = bad; MT.k(A, 'Escape');
        return out;
      });
      t.eq(r, {}, 'Fundstellen');
    },
  },
];
