// Coop-Ausbau Z1 (docs/coop-ausbau.md, Spur Z): Zuschauer. Ein Zuschauer ist ein Client ohne Spielerplatz: joinRoom(code, { spec: true }) schickt hi mit sp:1, der Host entscheidet erst mit hi (nicht beim Verbindungsaufbau), ob
// Spieler, Zuschauer oder Abweisung (Version, Spiel laeuft, Raum voll, Zuschauer voll oder nicht erlaubt). Zuschauer liegen in NET.specs (hoechstens CFG.spec.max, Schalter CFG.spec.on), belegen keinen Platz (nPl, Roster,
// Start-Kachel), bekommen alle Broadcasts (ros, go, rst, end, ch) und jeden Schnappschuss mit den Ereignissen an alle (to -1). Der Host verwirft von ihnen alles ausser ping und nm. Sie duerfen jederzeit kommen: in der Lobby,
// im laufenden Spiel (der Host schickt go, der Client baut die Welt mit reset() und wendet Schnappschuesse an) und in Shop, Auftragswahl und Ergebnis (dann warten sie bis zum naechsten rst). Auf dem Client ist me eine Platzhalter-Figur
// (id -2, tot, weg, nicht in players), p folgt einem aktiven Spieler, es gibt keine Eingabe, kein Funk, keinen Chat und keine Aenderung an SESSION. VER 47.
const KEY = (d, k) => `${d}.cv.dispatchEvent(new KeyboardEvent('keydown', { key: '${k}', bubbles: true }))`;
// Zustand, der bei Spaeteinsteiger und Dauer-Client gleich sein muss (wie der Wegwerf-Versuch vom 26. Oktober 2026 im Plan)
const SIG = `(d) => { const g = d.get(), w = d.world(); return { phase: g.phase, wave: g.waveN, kills: g.kills, secured: Math.round(g.secured), escaped: g.escaped, vault: g.vaultOpen, code: g.code, mon: g.mon, civKills: g.civKills,
  its: g.its.map(it => (it.done ? 1 : 0) + (it.lost ? 2 : 0)).join(''), cams: g.cams.map(c => (c.k ? 1 : 0) | (c.off ? 2 : 0) | (c.alert > 0 ? 4 : 0)).join(','), map: w.M.join(''), npcSt: g.npcs.map(q => q.id + ':' + q.st).join(','), en: g.en.length, pcs: g.pcs.length }; }`;

module.exports = [
  {
    name: 'Zuschauer treten in der Lobby bei: kein Platz (Roster und Start-Kachel zaehlen nur Spieler), Zuschauerliste in ros (sp) bei allen, myId -1, spec-Flag; Spieler koennen weiter beitreten',
    async run(t) {
      await t.loadTool('loopnet.js'); await t.loadInpage('coop.js'); await t.loadInpage('menu.js');
      const r = await t.page.evaluate(`(() => { const G = CT.mkLobby(2, 2), [A, B] = G.players, [S1, S2] = G.specs, o = {};
        o.roster = A.NET.roster.length; o.specs = A.NET.specs.length; o.ids = [S1.NET.myId, S2.NET.myId]; o.flag = [S1.NET.spec, S2.NET.spec, A.NET.spec, B.NET.spec];
        o.namen = [A, B, S1, S2].map(d => d.NET.spNames.length); A.setMode('coop'); G.run(.3); o.startTitel = MT.tile(A, 'start').title; o.spielerRoster = [B, S1].map(d => d.NET.roster.length);
        const C = mkInst(G.net, 'c2'); G.insts.push(C); C.joinRoom(A.NET.code); G.run(2); o.drittes = [A.NET.roster.length, A.NET.specs.length, C.NET.myId];
        return o; })()`);
      t.eq([r.roster, r.specs], [2, 2], 'zwei Spieler im Roster, zwei Zuschauer in NET.specs');
      t.eq(r.ids, [-1, -1], 'Zuschauer haben myId -1'); t.eq(r.flag, [true, true, false, false], 'nur die Zuschauer tragen das Flag spec');
      t.eq(r.namen, [2, 2, 2, 2], 'die Zuschauerliste (ros.sp) kennt bei allen zwei Namen');
      t.eq(r.startTitel, 'Starten (2 Spieler)', 'die Start-Kachel zaehlt nur Spieler');
      t.eq(r.spielerRoster, [2, 2], 'Spieler und Zuschauer sehen zwei Spieler im Roster');
      t.eq(r.drittes, [3, 2, 2], 'ein dritter Spieler bekommt Platz 2, die Zuschauer bleiben zwei');
    },
  },
  {
    name: 'Zuschauer sehen das Spiel ab dem Start: go erreicht sie, me ist die Platzhalter-Figur (id -2, tot, nicht in players), p folgt einem aktiven Spieler, Positionen und Ereignisse (Funkspruch, Meldungen) kommen an, die Zahl der Spieler ist die der Spieler',
    async run(t) {
      await t.loadTool('loopnet.js'); await t.loadInpage('coop.js');
      const r = await t.page.evaluate(`(() => { const G = CT.mkLobby(2, 2), [A, B] = G.players, [S1, S2] = G.specs, o = {};
        A.startCoop(); G.run(3); const g = S1.get(); o.scr = [S1.state().scr, S2.state().scr]; o.me = [g.me.id, g.me.dead, g.me.gone, g.players.includes(g.me)]; o.np = [g.players.length, S2.get().players.length];
        o.p = [g.p.id, g.p.id === g.players.find(q => !q.dead && !q.out && !q.gone).id]; const P = A.get().players; o.pos = [S1, S2, B].map(d => d.get().players.map(q => Math.round(q.x)).join() === P.map(q => Math.round(q.x)).join());
        A.radHost(P[0], 1, 0, 0); A.radHost(P[1], 0, 0, 0); G.run(.6); o.funk = [S1, S2].map(d => d.msgs().feed.filter(s => /Lasst uns leise|Hilfe/.test(s)).length);
        o.snap = S1.get().time > 2;
        // Ereignisse nur an einen Spieler (to = Id) gehen nicht an Zuschauer: die Ablehnung des zweiten Funkspruchs (deny) hoert nur Spieler 1
        const evs = [], ev0 = A.SND.ev; A.SND.ev = (n, ...a) => { evs.push(n); return ev0.call(A.SND, n, ...a); }; G.run(A.CFG.funk.cool + A.CFG.funk.same + .2); A.radHost(P[1], 1, 0, 0); A.radHost(P[1], 1, 0, 0); G.run(.6); A.SND.ev = ev0; o.deny = evs.filter(n => n === 'deny').length; return o; })()`);
      t.eq(r.scr, ['play', 'play'], 'beide Zuschauer sind im Spiel');
      t.eq(r.me, [-2, true, true, false], 'me: id -2, tot, weg, nicht in players');
      t.eq(r.np, [2, 2], 'zwei Spieler im Spiel, die Zuschauer zaehlen nicht');
      t.eq(r.p, [0, true], 'p folgt dem ersten aktiven Spieler');
      t.eq(r.pos, [true, true, true], 'die Positionen aller Spieler stimmen mit dem Host ueberein');
      t.eq(r.funk, [2, 2], 'der Funkspruch der beiden Spieler kommt als Ereignis bei beiden Zuschauern an');
      t.ok(r.snap, 'Schnappschuesse kommen (Zeit laeuft)');
      t.eq(r.deny, 1, 'ein Ereignis nur fuer Spieler 1 (abgelehnter Funkspruch) erreicht nur ihn, nicht die beiden Zuschauer');
    },
  },
  {
    name: 'Zuschauer senden nichts ausser hi, nm und ping (auch bei allen Spieltasten, Funk und Chat) und koennen nichts ausloesen: Funk-Menue und Chat oeffnen sich nicht, Phase bleibt, kein Wechsel von SESSION',
    async run(t) {
      await t.loadTool('loopnet.js'); await t.loadInpage('coop.js');
      const r = await t.page.evaluate(`(() => { const G = CT.mkLobby(2, 1), [A, B] = G.players, [S] = G.specs, o = {}, sent = []; const sn = S.NET.conn.send.bind(S.NET.conn); S.NET.conn.send = m => { sent.push(m.t); sn(m); };
        A.startCoop(); G.run(2); const k = x => S.cv.dispatchEvent(new KeyboardEvent('keydown', { key: x, bubbles: true }));
        for (const x of ['w', 'a', 's', 'd', 'e', 'q', 'f', 'g', 'h', 'r', 'c', '1', '2', '3', '4', '5', 'Shift', ' ', 'x', 'Enter', 'ArrowLeft']) { k(x); S.cv.dispatchEvent(new KeyboardEvent('keyup', { key: x, bubbles: true })); G.run(.1); }
        k('x'); o.funk = S.funk().open; k('Escape'); k('Enter'); o.chat = S.chat().open; G.run(2);
        o.typen = [...new Set(sent)].sort(); o.phase = [A.get().phase, S.get().phase]; o.wallet = S.SESSION.wallet; o.round = S.SESSION.round; o.pause = S.state().paused;
        return o; })()`);
      t.ok(r.typen.every(x => ['hi', 'nm', 'ping'].includes(x)), 'gesendete Nachrichtenarten: ' + JSON.stringify(r.typen));
      t.eq([r.funk, r.chat], [false, true], 'das Funk-Menue oeffnet sich nicht, der Chat schon (Tribuene, Z4: Zuschauer duerfen unter sich schreiben)');
      t.eq(r.phase, [1, 1], 'die Phase bleibt Erkunden (F loest nichts aus)');
      t.eq([r.wallet, r.round], [0, 0], 'das Konto und die Serie des Zuschauers bleiben unberuehrt');
    },
  },
  {
    name: 'Der Host verwirft jede Nachricht eines Zuschauers ausser ping und nm (gefaelschte in, f, g, h, u, kit, law, rdy, at, lg, chk, rad, ch, kick, Muell), davor ignoriert er auch Nachrichten vor hi; ohne hi gibt es keinen Platz',
    async run(t) {
      await t.loadTool('loopnet.js'); await t.loadInpage('coop.js');
      const r = await t.page.evaluate(`(() => { const G = CT.mkLobby(2, 1), [A, B] = G.players, [S] = G.specs, o = {}; A.startCoop(); G.run(2);
        const snap = () => JSON.stringify([A.get().players.map(q => [Math.round(q.x), Math.round(q.y), q.hp, q.armed, q.dead, q.jam, q.units]), A.get().phase, A.NET.conns.length, A.NET.roster.length]);
        const before = snap(), c = S.NET.conn;
        for (const m of [{ t: 'in', s: 1, dt: .03, vx: 1, vy: 1, fire: 1, a: 1 }, { t: 'f' }, { t: 'g' }, { t: 'h' }, { t: 'u', n: 1 }, { t: 'kit', k: { w: 'rifle' } }, { t: 'law' }, { t: 'rdy', v: 1 }, { t: 'at', v: 'p' }, { t: 'lg', i: 1, k: 0, n: 1, d: '{}' }, { t: 'chk', T: 1, c: [] }, { t: 'rad', c: 0 }, { t: 'ch', s: 'x', c: 0 }, { t: 'kick' }, { t: 'rej' }, { t: 'x' }, {}, null, 5, 'text', [1, 2]]) { try { c.send(m); } catch (e) { } }
        G.run(1); o.gleich = snap() === before; o.phase = A.get().phase; o.conns = [A.NET.conns.length, A.NET.specs.length];
        c.send({ t: 'nm', v: 'Sam' }); G.run(.5); o.nm = A.NET.specs[0].nm; c.send({ t: 'ping', n: 123 }); G.run(.5); o.pong = S.NET.ping >= 0;
        // Verbindung, die nie hi schickt oder vor hi etwas sendet: kein Platz
        let got = []; const raw = G.net.join(A.NET.code, { onOpen(cc) { cc.onmsg = m => got.push(m.t); cc.send({ t: 'in', s: 1, dt: .03, vx: 1, vy: 0 }); cc.send({ t: 'f' }); cc.send({ t: 'rdy', v: 1 }); }, onError() { } }); G.run(1);
        o.ohneHi = [A.NET.conns.length, A.NET.specs.length, A.NET.roster.length, A.get().phase, got.length];
        return o; })()`);
      t.eq(r.gleich, true, 'Spieler, Phase, Verbindungen, Roster und Meldungen unveraendert nach 21 gefaelschten Nachrichten');
      t.eq(r.phase, 1, 'das gefaelschte f hat keinen Ueberfall ausgeloest');
      t.eq(r.conns, [1, 1], 'ein Spieler und ein Zuschauer verbunden');
      t.eq(r.nm, 'Sam', 'nm aendert den Namen des Zuschauers'); t.ok(r.pong, 'ping wird beantwortet');
      t.eq(r.ohneHi, [1, 1, 2, 1, 0], 'eine Verbindung ohne hi belegt keinen Platz und bekommt keine Antwort');
    },
  },
  {
    name: 'Abweisungen: Zuschauer-Obergrenze (CFG.spec.max) mit Meldung, Zuschauer nicht erlaubt (CFG.spec.on 0), falsche Version, Spieler waehrend des Spiels ("Das Spiel laeuft schon."), Raum voll fuer Spieler; abgewiesene Verbindungen belegen nichts',
    async run(t) {
      await t.loadTool('loopnet.js'); await t.loadInpage('coop.js');
      const r = await t.page.evaluate(`(() => { const G = CT.mkLobby(2, 0), A = G.A, o = {}; A.CFG.spec.max = 2; const spec = () => { const S = CT.addSpec(G); G.run(2); return S; };
        A.CFG.spec.on = 0; const S4 = spec(); o.aus = [A.NET.specs.length, S4.state().scr, S4.titleNote() && S4.titleNote().s]; A.CFG.spec.on = 1;
        const S1 = spec(), S2 = spec(), S3 = spec(); o.max = [A.NET.specs.length, S3.state().scr, S3.state().role, S3.titleNote() && S3.titleNote().s];
        // falsche Version und Spieler waehrend des Spiels ueber rohe Verbindungen
        const raw = (hi) => { const got = []; G.net.join(A.NET.code, { onOpen(c) { c.onmsg = m => got.push(m); c.send(hi); }, onError() { } }); G.run(1); return got.map(m => m.t + ':' + (m.why || '')); };
        o.version = raw({ t: 'hi', ver: 1, b: 1, k: {}, nm: 'x' }); o.versionZuschauer = raw({ t: 'hi', ver: 1, b: 1, k: {}, nm: 'x', sp: 1 }); o.nachVersion = A.NET.specs.length;
        for (const nm of ['c2', 'c3']) { const C = mkInst(G.net, nm); G.insts.push(C); C.joinRoom(A.NET.code); G.run(2); } const E = mkInst(G.net, 'c4'); G.insts.push(E); E.joinRoom(A.NET.code); G.run(2); o.voll = [A.NET.roster.length, E.state().scr];
        A.startCoop(); G.run(1); o.spiel = raw({ t: 'hi', ver: A.VER, b: A.BUILD.n, k: {}, nm: 'x' }); o.rest = [A.NET.conns.length, A.NET.roster.length];
        const S5 = spec(); o.spaet = [A.NET.specs.length, S5.state().scr];
        return o; })()`);
      t.eq(r.max.slice(0, 2), [2, 'title'], 'der dritte Zuschauer wird abgewiesen (zwei bleiben) und landet auf dem Titel'); t.ok(/voll f/.test(r.max[3] || ''), 'Meldung: ' + r.max[3]);
      t.eq(r.aus.slice(0, 2), [0, 'title'], 'mit CFG.spec.on 0 kommt keiner dazu'); t.ok(/nicht erlaubt/.test(r.aus[2] || ''), 'Meldung: ' + r.aus[2]);
      t.ok(r.version.some(s => /^rej:Versionen passen nicht/.test(s)), 'falsche Version (Spieler): ' + JSON.stringify(r.version));
      t.ok(r.versionZuschauer.some(s => /^rej:Versionen passen nicht/.test(s)) && r.nachVersion === 2, 'falsche Version (Zuschauer) wird abgewiesen und belegt nichts: ' + JSON.stringify(r.versionZuschauer));
      t.eq(r.voll, [4, 'title'], 'ein fuenfter Spieler bei vollem Raum (vier) wird abgewiesen und landet auf dem Titel');
      t.ok(r.spiel.some(s => s === 'rej:Das Spiel läuft schon.'), 'Spieler waehrend des Spiels: ' + JSON.stringify(r.spiel));
      t.eq(r.rest, [3, 4], 'abgewiesene Verbindungen belegen nichts (drei Mitspieler, vier im Roster)');
    },
  },
  {
    name: 'Spaeteinstieg mitten im Gefecht: Der Zuschauer baut die Welt aus go und hat nach 12 s denselben Zustand wie ein Client, der von Anfang an dabei war (Phase, Welle, Beute, Raster mit Tueren, Fenstern und Barrikaden, NPCs, Kameras)',
    async run(t) {
      await t.loadTool('loopnet.js'); await t.loadInpage('coop.js');
      const r = await t.page.evaluate(`(() => { const out = []; for (const sc of ['bank', 'jewel', 'gas', 'museum', 'casino']) { const G = CT.mkGame(sc, 321, 3, 40, 0), A = G.A, B = G.clients[0], sig = ${SIG};
        for (const q of A.get().players) q.hp = 100000; A.CFG.policeAt = 3; A.CFG.policeForced = 3; ${KEY('A', 'f')}; G.run(12);
        let n = 0; for (const it of A.get().its) { if (n >= 3) break; if (it.done || !['till', 'atm', 'bundle', 'good'].includes(it.t)) continue; try { it.act(A.get().players[0]); n++; } catch (e) { } }
        G.run(15); const S = CT.addSpec(G); G.run(12); const sb = sig(B), ss = sig(S); out.push({ sc, scr: S.state().scr, np: S.get().players.length, diff: Object.keys(sb).filter(k => sb[k] !== ss[k]) }); } return out; })()`);
      for (const q of r) { t.eq(q.scr, 'play', q.sc + ': Zuschauer ist im Spiel'); t.eq(q.np, 3, q.sc + ': drei Spieler'); t.eq(q.diff, [], q.sc + ': Zustand gleich dem eines Dauer-Clients'); }
    },
  },
  {
    name: 'Zuschauer in Ergebnis, Shop und Auftragswahl: Ergebnis ohne Aenderung an SESSION und ohne Weiter (Enter tut nichts, Kachel wartet), Beitritt waehrend Shop oder Ergebnis wartet in der Lobby-Ansicht bis zum naechsten rst und spielt dann mit',
    async run(t) {
      await t.loadTool('loopnet.js'); await t.loadInpage('coop.js'); await t.loadInpage('menu.js');
      const r = await t.page.evaluate(`(() => { const G = CT.mkGame('bank', 321, 3, 40, 0), [A, B, C] = G.insts, o = {}; const S0 = CT.addSpec(G, 'frueh'); G.run(2); o.fruehScr = S0.state().scr;
        A.get().players.forEach(p => { p.units = 1; p.loot = 20000; }); G.run(3); o.ende = [S0.state().scr, !!S0.get().ended, S0.SESSION.wallet, S0.SESSION.round, A.get().ended && A.get().ended.win];
        MT.k(S0, 'Enter'); o.tile = MT.tile(S0, 'endNext') && MT.tile(S0, 'endNext').title; MT.k(S0, 'Enter'); MT.k(S0, 'Enter'); G.run(1); o.nachEnter = [S0.state().scr, !!S0.get().ended];
        const S1 = CT.addSpec(G, 'spaet'); G.run(2); o.spaetScr = [S1.state().scr, S1.get().players.length, A.NET.specs.length];
        MT.k(A, 'Enter'); MT.k(A, 'Enter'); G.run(.5); MT.k(A, 'Enter'); G.run(.2); MT.k(A, 'Enter'); G.run(1); o.hostScr = A.state().scr; MT.k(A, 'Enter'); G.run(.5); MT.k(A, 'Enter'); G.run(3);
        o.neu = [A.state().scr, S0.state().scr, S1.state().scr, S0.get().players.length, S1.get().players.length, S0.get().phase, S1.get().phase, !!S0.get().ended];
        return o; })()`);
      t.eq(r.fruehScr, 'play', 'ein Zuschauer, der vor dem Ende dabei ist, sieht das Spiel');
      t.eq(r.ende, ['play', true, 94800, 3, true], 'Ergebnis: Zuschauer sieht es (ended); SESSION gilt je Seite, die drei Spieler buchen je 31.600 und eine Runde, der Zuschauer buchte nichts dazu (sonst 126.400 und 4)');
      t.ok(/Warte/.test(r.tile || ''), 'die Kachel nennt das Warten statt Weiter: ' + r.tile);
      t.eq(r.nachEnter, ['play', true], 'Enter auf dem Ergebnis tut beim Zuschauer nichts');
      t.eq(r.spaetScr, ['lobby', 1, 2], 'Beitritt waehrend des Ergebnisses: wartet in der Lobby-Ansicht (nPl noch unbekannt, der Raum zaehlt zwei Zuschauer)');
      t.ok(r.hostScr === 'mission' || r.hostScr === 'shop', 'der Host kam durch Shop und Auftragswahl: ' + r.hostScr);
      t.eq(r.neu, ['play', 'play', 'play', 3, 3, 1, 1, false], 'nach dem Start der naechsten Runde spielen beide Zuschauer mit (rst), drei Spieler');
    },
  },
  {
    name: 'Verlassen und Abbruch: Ein Zuschauer, der geht, verschwindet aus NET.specs und aus ros.sp bei allen; verlaesst der Host den Raum, endet es fuer den Zuschauer mit der Meldung Verbindung zum Host verloren',
    async run(t) {
      await t.loadTool('loopnet.js'); await t.loadInpage('coop.js');
      const r = await t.page.evaluate(`(() => { const G = CT.mkLobby(2, 2), [A, B] = G.players, [S1, S2] = G.specs, o = {}; A.startCoop(); G.run(2);
        S1.leaveGame('weg'); G.run(1); o.nach = [A.NET.specs.length, B.NET.spNames.length, S2.NET.spNames.length, S1.state().scr];
        A.leaveGame('Ende'); G.run(1); o.host = [S2.state().scr, S2.titleNote && S2.titleNote() && S2.titleNote().s]; return o; })()`);
      t.eq(r.nach, [1, 1, 1, 'title'], 'ein Zuschauer weniger, bei allen aktuell');
      t.eq(r.host[0], 'title', 'der Host schliesst den Raum, der Zuschauer landet auf dem Titel'); t.ok(/Verbindung zum Host verloren/.test(r.host[1] || ''), 'Meldung: ' + r.host[1]);
    },
  },
  {
    name: 'Zuschauer zeichnen ohne Fehler in allen Szenarien: Erkunden, Ueberfall, Ergebnis, Pause, Funk und Chat der anderen, mit der Platzhalter-Figur als me (kein JS-Fehler, p folgt einem Spieler)',
    async run(t) {
      await t.loadTool('loopnet.js'); await t.loadInpage('coop.js');
      const r = await t.page.evaluate(`(() => { const res = []; for (const sc of ['bank', 'truck', 'jewel', 'gas', 'museum', 'casino']) { const G = CT.mkLobby(2, 1), [A, B] = G.players, [S] = G.specs, errs = {};
        A.setScenario(sc); A.setSeedMode(321); const note = (w, e) => { const k = w + ': ' + String(e && e.message || e); errs[k] = (errs[k] || 0) + 1; };
        const dr = w => { try { S.draw(); } catch (e) { note(w, e); } }; A.startCoop(); G.run(2);
        for (let i = 0; i < 6; i++) { G.run(1); dr('erkunden'); } A.radHost(A.get().players[0], 3, 400, 300); ${KEY('A', 'f')}; for (let i = 0; i < 20; i++) { G.run(1); dr('ueberfall'); }
        const g = S.get(); const me = g.me.id, pId = g.p && g.p.id; ${KEY('S', 'Escape')}; dr('pause'); res.push({ sc, errs, me, pId, phase: g.phase, paused: S.state().paused }); } return res; })()`);
      for (const q of r) { t.eq(q.errs, {}, q.sc + ': kein Fehler beim Zeichnen'); t.eq(q.me, -2, q.sc + ': me ist die Platzhalter-Figur'); t.ok(q.pId === 0 || q.pId === 1, q.sc + ': p folgt einem Spieler: ' + q.pId); }
    },
  },
];
