// Coop-Ausbau Z4 (docs/coop-ausbau.md, Spur Z): Menues und Tribuene. Der Coop-Hub hat die Kachel Zuschauen (Raumcode-Seite mit "Zuschauen" statt "Beitreten", joinRoom mit spec, ein eingefuegter Zuschauer-Link
// #raum=CODE&zu=1 wird erkannt), die Lobby des Hosts hat Link kopieren (Spieler), Zuschauer-Link und den Schalter Zuschauer an/aus (CFG.spec.on), Lobby und Team-Leiste zeigen "Zuschauer: N", der Host kann
// Zuschauer ueber dieselbe Liste wie Mitspieler entfernen, und im Chat gibt es die Tribuene (Kanal 1): Zuschauer schreiben und lesen sie untereinander, Spieler sehen sie nicht, Zuschauer lesen den Team-Chat (Kanal 0).
const TEXTS = `(d) => { const c = d.cv.getContext('2d'), txt = [], ft = c.fillText; c.fillText = function (s) { txt.push(String(s)); return ft.apply(this, arguments); }; d.draw(); c.fillText = ft; return txt; }`;
const SEND = `(d, s) => { MT.k(d, d.state().scr === 'play' ? 'Enter' : 'c'); MT.type(d, s); MT.k(d, 'Enter'); }`;

module.exports = [
  {
    name: 'Coop-Hub und Link: der Hub hat keine Kachel Zuschauen mehr (R1), ein Beitritt mit spec macht einen Zuschauer (ohne Platz), Raum beitreten bleibt ein Spieler; ein Zuschauer-Link wird beim Einfuegen erkannt und schaltet die Raumcode-Seite auf Zuschauen',
    async run(t) {
      await t.loadTool('loopnet.js'); await t.loadInpage('coop.js'); await t.loadInpage('menu.js');
      const r = await t.page.evaluate(`(async () => { const net = LoopNet(40, 0), A = mkInst(net, 'a'), S = mkInst(net, 's'), P = mkInst(net, 'p'), X = mkInst(net, 'x'), all = [A, S, P, X], run = sec => { for (let i = 0; i < sec * 60; i++) step(all, net, 1 / 60); }, o = {};
        A.hostRoom(); run(1); const code = A.NET.code;
        S.toTitle(); S.ui().tiles(); MT.click(S, 'coop'); o.hub = S.ui().tiles().map(q => q.id).filter(id => id !== 'name' && id !== 'back'); S.joinRoom(code, { spec: true }); run(3); o.spec = [S.NET.spec, S.state().scr, A.NET.specs.length, A.NET.conns.length, A.NET.roster.length];
        P.toTitle(); P.ui().tiles(); MT.click(P, 'coop'); MT.click(P, 'join'); o.seiteP = [P.state().scr, MT.tile(P, 'go').title, P.NET.joinSpec]; MT.type(P, code); MT.click(P, 'go'); run(3); o.spieler = [P.NET.spec, P.state().scr, A.NET.specs.length, A.NET.conns.length, A.NET.roster.length];
        Object.defineProperty(navigator, 'clipboard', { value: { readText: () => Promise.resolve('Link: http://x.de/index.html#raum=K7Q2&zu=1') }, configurable: true });
        X.toTitle(); X.ui().tiles(); MT.click(X, 'coop'); MT.click(X, 'join'); o.vorPaste = [X.NET.joinSpec, MT.tile(X, 'go').title]; MT.click(X, 'paste'); await new Promise(r => setTimeout(r, 60)); X.ui().tiles(); o.paste = [X.NET.joinSpec, MT.tile(X, 'go').title];
        o.parse = [A.parseJoin('https://x.de/y/index.html#raum=AB3D&zu=1'), A.parseJoin('https://x.de/y/index.html#raum=AB3D'), A.parseJoin(' ab3d '), A.parseJoin('nichts'), A.parseJoin('ZU=1 RAUM=K7Q2')];
        return o; })()`);
      t.eq(r.hub, ['host', 'join'], 'der Hub hat nur Raum erstellen und Raum beitreten');
      t.eq(r.spec, [true, 'lobby', 1, 0, 1], 'Beitritt als Zuschauer: kein Platz im Roster (nur der Host), keine Spielerverbindung, ein Eintrag in NET.specs');
      t.eq(r.seiteP, ['join', 'Beitreten', false], 'Raum beitreten bleibt Beitreten'); t.eq(r.spieler, [false, 'lobby', 1, 1, 2], 'Beitritt als Spieler: Platz im Roster');
      t.eq(r.vorPaste, [false, 'Beitreten'], 'Einfuegen: vorher Spieler-Modus'); t.eq(r.paste, [true, 'Zuschauen'], 'ein eingefuegter Zuschauer-Link schaltet auf Zuschauen');
      t.eq(r.parse, [{ code: 'AB3D', spec: true }, { code: 'AB3D', spec: false }, { code: 'AB3D', spec: false }, null, { code: 'K7Q2', spec: true }], 'parseJoin erkennt Code und Zuschauer-Link');
    },
  },
  {
    name: 'Lobby des Hosts: Link kopieren legt die Adresse mit dem Code in die Zwischenablage (R1: ein Link, der Zuschauer-Link entfaellt), der Schalter Zuschauer an/aus stellt CFG.spec.on um und weist neue Zuschauer ab, "Zuschauer (N)" steht in der Lobby bei Host, Spielern und Zuschauern, Mitspieler und Zuschauer haben Link und Schalter nicht',
    async run(t) {
      await t.loadTool('loopnet.js'); await t.loadInpage('coop.js'); await t.loadInpage('menu.js'); await t.loadInpage('overlap.js');
      const r = await t.page.evaluate(`(() => { const G = CT.mkLobby(2, 1), [A, B] = G.players, [S] = G.specs, o = {}, texts = ${TEXTS}, copied = [];
        Object.defineProperty(navigator, 'clipboard', { value: { writeText: s => { copied.push(s); return Promise.resolve(); } }, configurable: true });
        MT.click(A, 'mCoop'); G.run(1); const code = A.NET.code; MT.click(A, 'link'); o.links = copied.map(s => s.replace(/^.*#/, '#')); o.code = code;
        o.kickTitel = (MT.tile(A, 'kick') || {}).title;
        o.tilesA = ['link', 'specOn'].map(id => !!MT.tile(A, id)); o.tilesB = ['link', 'specOn'].map(id => !!MT.tile(B, id)); o.tilesS = ['link', 'specOn'].map(id => !!MT.tile(S, id));
        o.an = MT.tile(A, 'specOn').title; MT.click(A, 'specOn'); G.run(.2); o.aus = [MT.tile(A, 'specOn').title, A.CFG.spec.on]; const S2 = CT.addSpec(G); G.run(2); o.abgewiesen = [S2.state().scr, S2.titleNote() && S2.titleNote().s, A.NET.specs.length];
        MT.click(A, 'specOn'); G.run(.2); o.wieder = [MT.tile(A, 'specOn').title, A.CFG.spec.on]; const S3 = CT.addSpec(G); G.run(2); o.drei = [S3.state().scr, A.NET.specs.length];
        o.txt = [A, B, S, S3].map(d => texts(d).filter(s => /^Zuschauer \\(\\d\\)/.test(s))); o.ueberlappung = OV.check(A);
        return o; })()`);
      t.eq(r.links, ['#raum=' + r.code], 'Link kopieren: ein Einladungslink mit dem Code');
      t.eq(r.kickTitel, 'Teilnehmer', 'die Kachel zum Entfernen und Umstellen heisst in der Lobby Teilnehmer');
      t.eq(r.tilesA, [true, true], 'der Host hat Link und Schalter'); t.eq(r.tilesB, [false, false], 'Mitspieler nicht'); t.eq(r.tilesS, [false, false], 'Zuschauer nicht');
      t.eq(r.an, 'Zuschauer an', 'Standard: an'); t.eq(r.aus, ['Zuschauer aus', 0], 'der Schalter stellt CFG.spec.on auf 0');
      t.eq(r.abgewiesen, ['title', 'Zuschauer sind nicht erlaubt.', 1], 'ein neuer Zuschauer wird abgewiesen, der vorhandene bleibt'); t.eq(r.wieder, ['Zuschauer an', 1], 'wieder an'); t.eq(r.drei, ['lobby', 2], 'danach geht es wieder');
      t.eq(r.txt, [['Zuschauer (2): Zuschauer 1, Zuschauer 2'], ['Zuschauer (2): Zuschauer 1, Zuschauer 2'], ['Zuschauer (2): Zuschauer 1, Zuschauer 2'], ['Zuschauer (2): Zuschauer 1, Zuschauer 2']], 'die Lobby nennt Zahl und Namen der Zuschauer bei allen'); t.eq(r.ueberlappung, [], 'keine Ueberdeckung in der Lobby des Hosts mit Zuschauern');
    },
  },
  {
    name: 'Entfernen: Der Host kann Zuschauer ueber die Liste Mitspieler entfernen (auch wenn er allein mit Zuschauern ist), nach der Rueckfrage landet der Zuschauer auf dem Titel mit der Meldung, die anderen sehen ihn nicht mehr; ein Zuschauer-Name steht in der Rueckfrage',
    async run(t) {
      await t.loadTool('loopnet.js'); await t.loadInpage('coop.js'); await t.loadInpage('menu.js');
      const r = await t.page.evaluate(`(() => { const G = CT.mkLobby(1, 2), [A] = G.players, [S1, S2] = G.specs, o = {}, texts = ${TEXTS}; G.run(1);
        o.kick = !!MT.tile(A, 'kick'); o.kickTitel = MT.tile(A, 'kick').title; MT.click(A, 'kick'); o.dlg1 = texts(A).filter(s => /ENTFERNEN|TEILNEHMER/.test(s)); o.liste = A.ui().tiles().map(q => q.id + ':' + (q.title || '')).filter(s => /^kn:/.test(s)); const id = A.ui().tiles().find(q => /^kk:/.test(q.id)).id;
        MT.click(A, id); o.rueck = A.ui().tiles().map(q => q.id); o.dlg2 = texts(A).filter(s => /ENTFERNEN|entfernt/.test(s)); MT.click(A, 'yes'); G.run(1.5);
        o.danach = [S1.state().scr, S1.titleNote() && S1.titleNote().s, S2.state().scr, A.NET.specs.length, S2.NET.spNames.length, A.NET.spNames.length];
        o.nochMal = A.ui().tiles().find(q => q.id === 'kick') ? 1 : 0; return o; })()`);
      t.eq(r.kick, true, 'die Kachel zum Entfernen erscheint auch mit nur Zuschauern'); t.eq(r.liste.length, 2, 'zwei Eintraege'); t.ok(r.liste.every(s => /Zuschauer/.test(s)), 'die Eintraege tragen den Namen des Zuschauers: ' + JSON.stringify(r.liste));
      t.eq(r.kickTitel, 'Teilnehmer', 'nur Zuschauer im Raum: die Kachel heisst in der Lobby Teilnehmer'); t.eq(r.dlg1, ['TEILNEHMER'], 'Titel der Liste in der Lobby'); t.ok(r.dlg2.includes('ZUSCHAUER ENTFERNEN') && r.dlg2.some(s => /Zuschauer \d wird aus dem Raum/.test(s)), 'die Rueckfrage nennt den Zuschauer mit Namen: ' + JSON.stringify(r.dlg2));
      t.eq(r.rueck, ['yes', 'no'], 'Rueckfrage');
      t.eq(r.danach, ['title', 'Der Host hat dich aus dem Raum entfernt.', 'lobby', 1, 1, 1], 'der Zuschauer ist weg mit Meldung, der andere bleibt, die Liste ist kuerzer');
    },
  },
  {
    name: 'Team-Leiste im Spiel: "Zuschauer: N" bei Host, Mitspielern und Zuschauern, ohne Zuschauer keine Zeile',
    async run(t) {
      await t.loadTool('loopnet.js'); await t.loadInpage('coop.js');
      const r = await t.page.evaluate(`(() => { const G = CT.mkGame('bank', 321, 2, 40, 0), A = G.A, B = G.clients[0], texts = ${TEXTS}, o = {}, has = d => texts(d).filter(s => /^Zuschauer: /.test(s));
        o.vorher = [has(A), has(B)]; const S = CT.addSpec(G), S2 = CT.addSpec(G); G.run(1.5); o.mit = [has(A), has(B), has(S).filter(s => /^Zuschauer: \\d/.test(s))]; S2.leaveGame(); G.run(1.5); o.eins = [has(A), has(B)]; return o; })()`);
      t.eq(r.vorher, [[], []], 'ohne Zuschauer keine Zeile'); t.eq([r.mit[0], r.mit[1]], [['Zuschauer: 2'], ['Zuschauer: 2']], 'Host und Mitspieler sehen die Zahl'); t.eq(r.mit[2], ['Zuschauer: 2'], 'der Zuschauer sieht sie auch (neben seiner Leiste Zuschauer: Name)');
      t.eq(r.eins, [['Zuschauer: 1'], ['Zuschauer: 1']], 'geht einer, sinkt die Zahl');
    },
  },
  {
    name: 'Tribuene: Zuschauer schreiben im Spiel in Kanal 1 (Enter; in der Lobby gilt seit R1 der Raum-Chat, Kanal 2) und lesen einander und den Team-Chat; Spieler und Host sehen die Tribuene nicht; der Host setzt den Namen, bereinigt, begrenzt, und verwirft Kanal 1 von Spielern und Kanal 0 von Zuschauern',
    async run(t) {
      await t.loadTool('loopnet.js'); await t.loadInpage('coop.js'); await t.loadInpage('menu.js');
      const r = await t.page.evaluate(`(() => { const G = CT.mkGame('bank', 321, 2, 40, 0), A = G.A, B = G.clients[0], S1 = CT.addSpec(G), S2 = CT.addSpec(G), o = {}, send = ${SEND}, ls = d => d.chat().lines.map(l => [l.id, l.s, l.c]); G.run(2);
        o.chatOk = [S1, S2].map(d => d.chatOk ? d.chatOk() : null);
        let klick = 0; const snd0 = S1.SND.chat; S1.SND.chat = function () { klick++; return snd0.apply(this, arguments); };
        send(S1, 'Hallo Tribuene'); G.run(.5); o.klick = klick; S1.SND.chat = snd0; o.s1 = ls(S1); o.s2 = ls(S2); o.a = ls(A); o.b = ls(B);
        send(B, 'Team Hallo'); G.run(.5); o.team = [ls(S1).filter(x => x[2] === 0), ls(S2).filter(x => x[2] === 0), ls(A).filter(x => x[2] === 0).length];
        // Gefaelschtes
        const raw = (d, m) => d.NET.conn.send(m);
        G.run(1.5); raw(B, { t: 'ch', s: 'Spieler an Tribuene', c: 1 }); G.run(2); o.sp = [ls(S1), ls(S2), ls(A), ls(B)].map(a => a.filter(x => /Spieler an/.test(x[1])).length);
        raw(S1, { t: 'ch', s: 'Zuschauer an Team', c: 0 }); G.run(2); o.zt = [ls(S1), ls(S2), ls(A), ls(B)].map(a => a.filter(x => /Zuschauer an Team/.test(x[1])).length);
        raw(S2, { t: 'ch', s: 'Name <b>fett</b> %', c: 1, id: 0, n: 'Fake' }); G.run(2); o.fake = ls(S1).filter(x => /fett/.test(x[1])); const texts = ${TEXTS}; o.gezeichnet = texts(S1).filter(s => /fett/.test(s));
        B.NET.conn.onmsg({ t: 'ch', id: -1, s: 'Tribuene an Spieler', c: 1, n: 'N', sid: 9 }); o.einspritzung = ls(B).filter(x => /Tribuene an/.test(x[1])).length;
        raw(S1, { t: 'ch', s: 'eins', c: 1 }); raw(S1, { t: 'ch', s: 'zwei', c: 1 }); G.run(2); o.rate = ls(S2).filter(x => /^(eins|zwei)$/.test(x[1])).map(x => x[1]);
        raw(S1, { t: 'ch', s: 12345, c: 1 }); raw(S1, { t: 'ch', s: '   ', c: 1 }); raw(S1, { t: 'ch', s: 'x', c: 7 }); G.run(2); o.muell = ls(S2).filter(x => x[1] === '12345' || x[1] === 'x').length;
        return o; })()`);
      t.eq(r.chatOk, [true, true], 'Zuschauer duerfen chatten (chatOk)');
      t.eq(r.klick, 1, 'nur der andere Zuschauer hoert den Klick, der Absender nicht (eigene Zeile bleibt still)');
      t.eq(r.s1, [[-1, 'Hallo Tribuene', 1]], 'der Absender sieht seine Zeile (Echo vom Host) mit Kanal 1 und Kennung -1'); t.eq(r.s2, [[-1, 'Hallo Tribuene', 1]], 'der andere Zuschauer auch');
      t.eq([r.a, r.b], [[], []], 'Host und Mitspieler sehen die Tribuene nicht');
      t.eq(r.team[0].length + r.team[1].length, 2, 'der Team-Chat kommt bei beiden Zuschauern an'); t.eq(r.team[2], 1, 'und beim Host');
      t.eq(r.sp, [0, 0, 0, 0], 'ein Spieler kann nicht in die Tribuene schreiben (Kanal 1 von Spielern wird verworfen)'); t.eq(r.zt, [0, 0, 0, 0], 'ein Zuschauer kann nicht ins Team schreiben (Kanal 0 von Zuschauern wird verworfen)');
      t.eq(r.fake.length, 1, 'die Zeile mit Schadzeichen kommt bereinigt an'); t.eq(r.fake[0][1], 'Name bfett/b %', 'spitze Klammern fallen weg'); t.eq(r.fake[0][0], -1, 'die Kennung setzt der Host, nicht die Nachricht (id 0 und Name Fake zaehlen nicht)');
      t.eq(r.gezeichnet, ['(T) Zuschauer 2: Name bfett/b %'], 'die Zeile steht mit (T) und dem Namen, den der Host kennt (nicht Fake)'); t.eq(r.einspritzung, 0, 'ein Spieler-Client zeigt Tribuene-Zeilen nicht an, auch wenn eine ankaeme');
      t.eq(r.rate, ['eins'], 'die Zeitsperre verwirft die zweite Zeile'); t.eq(r.muell, 0, 'Muell (Zahl, Leerzeichen, falscher Kanal) kommt nicht an');
    },
  },
  {
    name: 'Tribuene im Spiel: Enter oeffnet den Chat des Zuschauers (die Figur ist ohnehin nicht steuerbar), die Zeile erscheint bei den anderen Zuschauern mit (T) und dem Namen, nicht bei den Spielern',
    async run(t) {
      await t.loadTool('loopnet.js'); await t.loadInpage('coop.js'); await t.loadInpage('menu.js');
      const r = await t.page.evaluate(`(() => { const G = CT.mkGame('bank', 321, 2, 40, 0), A = G.A, B = G.clients[0], S1 = CT.addSpec(G, 'Clara'), S2 = CT.addSpec(G, 'Dennis'), o = {}, send = ${SEND}, texts = ${TEXTS}; S1.setName('Clara'); G.run(2);
        MT.k(S1, 'Enter'); o.offen = S1.chat().open; MT.type(S1, 'Los'); o.buf = S1.chat().buf; MT.k(S1, 'Enter'); G.run(.6); o.zeilen = [S1, S2, A, B].map(d => d.chat().lines.length);
        o.txt = [texts(S2).filter(s => /Los/.test(s)), texts(A).filter(s => /Los/.test(s))]; o.nm = G.A.NET.specs.map(c => c.nm); return o; })()`);
      t.eq([r.offen, r.buf], [true, 'Los'], 'Enter oeffnet die Eingabe im Spiel'); t.eq(r.zeilen, [1, 1, 0, 0], 'beide Zuschauer haben die Zeile, Host und Mitspieler nicht');
      t.eq(r.txt[0].filter(s => /Los/.test(s)), ['(T) Clara: Los'], 'beim anderen Zuschauer steht (T) und der Name, den der Host kennt (Clara, per nm nachgereicht)'); t.eq(r.txt[1], [], 'beim Host nicht');
    },
  },
];
