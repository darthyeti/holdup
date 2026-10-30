// Coop-Ausbau Spur N, Schritte N0 und N3 (docs/coop-ausbau.md, Abschnitt Spur N; Issues #11 und #36).
// N0 (Grundlage ohne Spielgefuehl): Test-Leitung mit benannten Instanzen und Abbruechen (net.cut, net.heal, net.signalDown, net.signalUp, net.stat.lost), der Host-Peer meldet "disconnected" und versucht alle 2 s reconnect()
// (sessReset laeuft dabei nicht noch einmal), Stille-Erkennung nur als Anzeige (CFG.net.stall, 4 s), Marke tok im wel, rejoin() auf dem Client mit Frist, Ereignisse im Flugschreiber.
// N3 (Rueckkehr nach dem Duell, #36): Kachel "Zurueck in den Raum" beim Raum-Host A, Nachricht dl ret an Host B, ret an dessen Team und Zuschauer, Platzwunsch tm und o im hi, Serie wie bei der Revanche zurueck.
const SETUP = async t => { await t.loadTool('loopnet.js'); await t.loadInpage('coop.js'); await t.loadInpage('menu.js'); await t.loadInpage('overlap.js'); };
const TEXTS = `(d) => { const c = d.cv.getContext('2d'), txt = [], ft = c.fillText; c.fillText = function (s) { txt.push(String(s)); return ft.apply(this, arguments); }; d.draw(); c.fillText = ft; return txt; }`;
const NETEV = `(d) => d.flog().dump().ereignisse.filter(e => e[2] === 'netz' || e[2] === 'duell').map(e => JSON.stringify(e[3]))`;
const HELP = `
  window.R2 = {
    add(G, nm, spec) { const C = mkInst(G.net, nm); G.insts.push(C); C.setName(nm); C.joinRoom(G.A.NET.code, spec ? { spec: true } : undefined); G.run(2); return C; },
    mk(n1, n2, ns) {
      const G = CT.mkLobby(1, 0), A = G.A; A.setName('Anna'); G.run(.2); MT.click(A, 'mDuel'); G.run(.3);
      const t1 = [A], t2 = [], sp = [], names = ['Bo', 'Cy', 'Di', 'Ed', 'Fi', 'Gu', 'Hu', 'Iv']; let k = 0; const all = [];
      for (let i = 1; i < n1 + n2; i++) all.push(R2.add(G, names[k++]));
      for (const d of all) { if (d.NET.team === 1) t1.push(d); else t2.push(d); }
      for (let i = 0; i < ns; i++) sp.push(R2.add(G, 'Z' + (i + 1), true));
      const mv = (d, to) => { const who = d.NET.team === 2 ? 't' + d.NET.tk : d.NET.team === 1 ? d.NET.myId : 's' + d.NET.sid; A.roleSet(who, to); G.run(.5); };
      while (t1.length > n1) { const d = t1.pop(); mv(d, 2); t2.push(d); }
      while (t2.length > n2) { const d = t2.pop(); mv(d, 1); t1.push(d); }
      G.run(1); return { G, A, t1, t2, sp };
    },
    // Wettkampf bis zum Ergebnis (ein Auftrag), beide siegen, die Ergebnisseite zeigt die letzte Seite
    fin(G, A, B) { A.CFG.duel.len = 1; A.duelStart(); G.run(9); A.setSecured(30000); A.finish(true, 'Sieg'); B.setSecured(20000); B.finish(true, 'Sieg'); G.run(2); A.get().ended.pg = 9; B.get().ended.pg = 9; G.run(.2); },
  };`;

module.exports = [
  {
    name: 'N0 Test-Leitung: net.cut still (Nachrichten gehen verloren, geschlossen wird erst nach closeAfter), net.heal hebt es auf, net.cut hart schliesst sofort beide Seiten, net.stat.lost zaehlt',
    async run(t) {
      await SETUP(t);
      const r = await t.page.evaluate(`(() => { const o = {}, G = CT.mkLobby(3, 0), [A, C, D] = G.players, net = G.net;
        net.cut('c1', { silent: true, closeAfter: 20 }); C.NET.conn.send({ t: 'nm', v: 'Bo' }); D.NET.conn.send({ t: 'nm', v: 'Cy' }); G.run(.3);
        o.still = [net.stat.lost > 0, A.NET.roster.map(r => r.name).includes('Bo'), A.NET.roster.map(r => r.name).includes('Cy')];
        G.run(10); o.offen = [A.NET.conns.length, C.state().scr, D.state().scr]; net.heal('c1'); G.run(25); o.geheilt = [A.NET.conns.length, C.state().scr];
        net.cut('c1', { silent: true, closeAfter: 5 }); G.run(3); o.vor = [A.NET.conns.length, C.state().scr]; G.run(4); o.nach = [A.NET.conns.length, C.state().scr, A.NET.conns.length === 1];
        net.cut('c2'); G.run(.5); o.hart = [A.NET.conns.length, D.state().scr];
        return o; })()`);
      t.eq(r.still, [true, false, true], 'still: die Nachricht von c1 geht verloren, die von c2 kommt an'); t.eq(r.offen, [2, 'lobby', 'lobby'], 'nach 10 s ist noch keine Seite geschlossen');
      t.eq(r.geheilt, [2, 'lobby'], 'nach heal bleibt es offen, auch nach der Schliesszeit'); t.eq(r.vor, [2, 'lobby'], 'vor closeAfter offen'); t.eq(r.nach, [1, 'title', true], 'nach closeAfter schliessen beide Seiten, der Client steht auf dem Titel');
      t.eq(r.hart, [0, 'title'], 'hart: sofort geschlossen');
    },
  },
  {
    name: 'N0 Vermittler: signalDown meldet dem Host onDisc, neue Beitritte laufen in peer-unavailable, der Host versucht alle 2 s reconnect() (ohne hold heilt es, mit hold erst signalUp), sessReset laeuft beim Zurueckkommen nicht, Ereignisse im Flugschreiber',
    async run(t) {
      await SETUP(t);
      const r = await t.page.evaluate(`(() => { const o = {}, G = CT.mkLobby(2, 0), [A, C] = G.players, net = G.net, ev = ${NETEV}, code = A.NET.code; A.SESSION.wallet = 777;
        net.signalDown(code); G.run(.1); o.runter = [A.NET.disc, A.NET.role]; const X = mkInst(net, 'x'); G.insts.push(X); X.joinRoom(code); G.run(1); o.nichtGefunden = [X.state().scr, X.NET.fail, X.NET.msg];
        G.run(3); o.geheilt = [A.NET.disc, A.NET.recN > 0, A.SESSION.wallet, A.NET.conns.length];
        const Y = mkInst(net, 'y'); G.insts.push(Y); Y.joinRoom(code); G.run(2); o.beitritt = [Y.state().scr, Y.NET.myId > 0, A.NET.conns.length];
        A.SESSION.wallet = 555; net.signalDown(code, { hold: true }); G.run(9); o.hold = [A.NET.disc, A.NET.recN >= 4, net.pending >= 0];
        const Z = mkInst(net, 'z'); G.insts.push(Z); Z.joinRoom(code); G.run(1); o.holdBeitritt = Z.NET.fail; net.signalUp(code); G.run(.3); o.hoch = [A.NET.disc, A.SESSION.wallet];
        const W = mkInst(net, 'w'); G.insts.push(W); W.joinRoom(code); G.run(2); o.danach = [W.NET.myId > 0, A.NET.conns.length];
        o.ev = ev(A).filter(s => /vermittler/.test(s)); o.alteSpieler = [C.state().scr, C.NET.myId];
        return o; })()`);
      t.eq(r.runter, [1, 'host'], 'der Host merkt, dass die Anmeldung beim Vermittler weg ist'); t.eq(r.nichtGefunden[0], 'lobby', 'ein neuer Beitritt kommt nicht zum Host'); t.ok(r.nichtGefunden[1] && /nicht gefunden/.test(r.nichtGefunden[2]), 'Meldung Raum nicht gefunden: ' + r.nichtGefunden[2]);
      t.eq(r.geheilt, [0, true, 777, 1], 'nach reconnect ist der Raum wieder da, die Serie (Konto 777) und die Spieler bleiben'); t.eq(r.beitritt, ['lobby', true, 2], 'ein neuer Beitritt klappt wieder');
      t.eq(r.hold, [1, true, true], 'mit hold bleibt der Raum weg, der Host versucht es weiter (mindestens vier Versuche in 9 s)'); t.ok(r.holdBeitritt, 'solange kommt keiner hinein'); t.eq(r.hoch, [0, 555], 'signalUp: wieder da, ohne sessReset (Konto bleibt)');
      t.eq(r.danach, [true, 3], 'danach tritt wieder jemand bei'); t.ok(r.ev.length >= 2 && r.ev.some(s => /weg/.test(s)) && r.ev.some(s => /zur/.test(s)), 'Flugschreiber: vermittler weg und zurueck: ' + r.ev.join(' | '));
      t.eq(r.alteSpieler, ['lobby', 1], 'die bestehende Datenverbindung lief die ganze Zeit weiter');
    },
  },
  {
    name: 'N0 Stille-Erkennung: Ohne Nachricht laenger als CFG.net.stall (4 s) wackelt die Verbindung, nur Anzeige (Host: "Verbindung zu Bo wackelt", Client: "Verbindung wackelt"), kein Eingriff, nach heal verschwindet sie, Flugschreiber wackelt und zurueck',
    async run(t) {
      await SETUP(t);
      const r = await t.page.evaluate(`(() => { const o = {}, G = CT.mkLobby(3, 1), [A, C, D] = G.players, S = G.specs[0], net = G.net, txt = ${TEXTS}, ev = ${NETEV}; C.setName('Bo'); G.run(.5);
        const note = d => txt(d).filter(s => /wackelt/.test(s)); o.stall = A.CFG.net.stall; o.ruhig = [note(A), note(C)];
        net.cut('c1', { silent: true, closeAfter: 60 }); G.run(3); o.drei = [note(A), note(C)];
        G.run(3); o.sechs = [note(A), note(C), note(D), note(S)]; o.noch = [A.NET.conns.length, C.state().scr];
        net.heal('c1'); G.run(3); o.geheilt = [note(A), note(C)];
        o.evA = ev(A).filter(s => /wackelt|zur/.test(s)); o.evC = ev(C).filter(s => /wackelt|zur/.test(s));
        net.cut('s0', { silent: true, closeAfter: 60 }); G.run(6); o.spec = [note(A), note(S)];
        return o; })()`);
      t.eq(r.stall, 4, 'Schwelle 4 s'); t.eq(r.ruhig, [[], []], 'ohne Stoerung keine Anzeige'); t.eq(r.drei, [[], []], 'nach 3 s noch nichts');
      t.eq(r.sechs[0], ['Verbindung zu Bo wackelt'], 'der Host zeigt, wessen Verbindung wackelt'); t.eq(r.sechs[1], ['Verbindung wackelt'], 'der Betroffene sieht es auch'); t.eq(r.sechs[2], ['Verbindung zu Bo wackelt'], 'die anderen Mitspieler sehen es auch (der Host meldet es mit ros)');
      t.eq(r.noch, [2, 'lobby'], 'kein Eingriff: nichts wird getrennt'); t.eq(r.geheilt, [[], []], 'nach heal weg'); t.ok(r.evA.some(s => /wackelt/.test(s)) && r.evA.some(s => /zur/.test(s)), 'Host-Flugschreiber: ' + r.evA.join(' | ')); t.ok(r.evC.some(s => /wackelt/.test(s)) && r.evC.some(s => /zur/.test(s)), 'Client-Flugschreiber: ' + r.evC.join(' | '));
      t.ok(r.spec[0].length === 1 && /wackelt/.test(r.spec[0][0]) && r.spec[1].length === 1, 'auch ein Zuschauer: Host und Zuschauer zeigen es: ' + JSON.stringify(r.spec));
    },
  },
  {
    name: 'N0 Marke tok: wel traegt fuer Spieler, Zuschauer und Team 2 eine zwoelfstellige, je Verbindung andere Marke, sie bleibt beim Rollenwechsel, ein Neubeitritt bekommt eine neue',
    async run(t) {
      await SETUP(t);
      const r = await t.page.evaluate(`(() => { ${HELP}; const o = {}, { G, A, t1, t2, sp } = R2.mk(2, 1, 1), P = t1[1], B = t2[0], S = sp[0];
        const toks = [P, B, S].map(d => d.NET.tok); o.toks = toks; o.lang = toks.map(x => typeof x === 'string' ? x.length : -1); o.versch = new Set(toks).size;
        o.host = [A.NET.conns[0].tok === P.NET.tok, A.NET.t2[0].tok === B.NET.tok, A.NET.specs[0].tok === S.NET.tok];
        const t0 = P.NET.tok; A.roleSet(1, 's'); G.run(.5); o.rolle = [P.NET.spec, P.NET.tok === t0]; o.leer = A.NET.tok || '';
        return o; })()`);
      t.eq(r.lang, [12, 12, 12], 'zwoelf Zeichen'); t.eq(r.versch, 3, 'je Verbindung eine andere Marke'); t.eq(r.host, [true, true, true], 'der Host kennt sie'); t.eq(r.rolle, [true, true], 'beim Rollenwechsel bleibt die Marke'); t.eq(r.leer, '', 'der Host selbst hat keine');
    },
  },
  {
    name: 'N0 rejoin(): der Client laesst seine Verbindung los und tritt alle 3 s neu bei (Anzeige "Verbinde neu ... (N s)"), mit der Marke im hi (rj), bei erreichbarem Raum klappt es sofort, bei weggefallenem Raum nach signalUp, nach der Frist steht er auf dem Titel',
    async run(t) {
      await SETUP(t);
      const r = await t.page.evaluate(`(() => { const o = {}, G = CT.mkLobby(2, 0), [A, C] = G.players, net = G.net, txt = ${TEXTS}, ev = ${NETEV}, code = A.NET.code; C.setName('Bo'); G.run(.5);
        const tok = C.NET.tok; o.rj0 = C.rejoin(30); G.run(2); o.sofort = [C.state().scr, C.NET.conn && C.NET.myId > 0, C.NET.rj, A.NET.conns.length, C.NET.tok !== tok];
        net.signalDown(code, { hold: true }); G.run(.2); C.rejoin(30); G.run(7); o.suche = [C.NET.rj && C.NET.rj.n, txt(C).filter(s => /^Verbinde neu/.test(s)).length, C.state().scr];
        net.signalUp(code); G.run(4); o.zurueck = [C.state().scr, C.NET.myId > 0, C.NET.rj, txt(C).filter(s => /^Verbinde neu/.test(s)).length, A.NET.conns.length];
        o.evC = ev(C).filter(s => /rj/.test(s)); o.evA = ev(A).filter(s => /rj/.test(s));
        net.signalDown(code, { hold: true }); G.run(.2); C.rejoin(12); G.run(14); o.frist = [C.state().scr, C.titleNote() && C.titleNote().s, C.NET.rj];
        o.nichtClient = A.rejoin(5);
        return o; })()`);
      t.eq(r.rj0, true, 'rejoin() beginnt'); t.eq(r.sofort, ['lobby', true, null, 1, true], 'Raum erreichbar: nach kurzer Zeit wieder drin, die Frist ist abgeraeumt (der Host in der Lobby nimmt ihn neu auf), neue Marke');
      t.ok(r.suche[0] >= 2 && r.suche[1] === 1 && r.suche[2] === 'lobby', 'Raum weg: mehrere Versuche, die Anzeige steht, kein Titel: ' + JSON.stringify(r.suche));
      t.eq(r.zurueck, ['lobby', true, null, 0, 1], 'nach signalUp klappt der naechste Versuch, die Anzeige verschwindet'); t.ok(r.evC.some(s => /ok/.test(s)) && r.evC.some(s => /start|neu|versuch/.test(s)), 'Client-Flugschreiber rj: ' + r.evC.join(' | ')); t.ok(r.evA.length >= 1, 'Host-Flugschreiber sieht rj: ' + r.evA.join(' | '));
      t.eq(r.frist[0], 'title', 'nach der Frist steht der Client auf dem Titel'); t.eq(r.frist[1], 'Verbindung zum Host verloren.', 'mit Meldung'); t.eq(r.frist[2], null, 'ohne Rest'); t.eq(r.nichtClient, false, 'ein Host kann nicht neu beitreten');
    },
  },
  {
    name: 'N3 Kachel: "Zurueck in den Raum" steht nur beim Raum-Host A, nur auf der letzten Ergebnisseite mit Gegner und Ergebnis (nicht davor, nicht bei Abbruch, nicht bei B, Mitspielern und Zuschauern), die Revanche bleibt daneben, duelRet nur dann',
    async run(t) {
      await SETUP(t);
      const r = await t.page.evaluate(`(() => { ${HELP}; const o = {}, { G, A, t1, t2, sp } = R2.mk(2, 2, 1), [B, M1] = t2, P1 = t1[1], S = sp[0], has = d => { const q = d.ui().tiles().find(x => x.id === 'endRet'); return q ? q.title : null; };
        o.vorher = [A.duelRet(), has(A)]; A.CFG.duel.len = 1; A.duelStart(); G.run(9); o.imSpiel = [A.duelRet(), has(A)];
        A.setSecured(30000); A.finish(true, 'Sieg'); G.run(1.2); A.get().ended.pg = 9; o.nurA = [has(A), A.duelRet()];
        B.setSecured(20000); B.finish(true, 'Sieg'); G.run(2); for (const d of [A, B, P1, M1, S]) { const e = d.get().ended; if (e) e.pg = 9; } G.run(.2);
        o.kacheln = [A, B, P1, M1, S].map(has); o.revanche = [MT.tile(A, 'endNext').title, MT.tile(B, 'endNext').title, MT.tile(P1, 'endNext').title]; o.erste = (() => { A.get().ended.pg = 0; const v = has(A); A.get().ended.pg = 9; return v; })();
        o.zahl = A.ui().tiles().filter(q => q.id === 'endRet').length; return o; })()`);
      t.eq(r.vorher, [false, null], 'ohne Wettkampf nichts'); t.eq(r.imSpiel, [false, null], 'im Spiel nichts'); t.eq(r.nurA, [null, false], 'solange der Gegner nicht fertig ist (kein Urteil), keine Kachel');
      t.eq(r.kacheln, ['Zurück in den Raum', null, null, null, null], 'nach dem Urteil nur beim Raum-Host A'); t.eq(r.revanche, ['Revanche', 'Revanche', 'Der Host entscheidet ...'], 'die Revanche bleibt, Mitspieler warten'); t.eq(r.erste, null, 'nicht auf der ersten Seite'); t.eq(r.zahl, 1, 'genau eine Kachel');
    },
  },
  {
    name: 'N3 Rueckkehr: Klick auf "Zurueck in den Raum" bringt Team 2 (Host B zuerst, Reihenfolge bleibt) und die Zuschauer beider Raeume in die Lobby von A, die Serie ist zurueck, A sperrt waehrenddessen Start und Modus, danach laeuft ein neuer Wettkampf wie in R2',
    async run(t) {
      await SETUP(t);
      const r = await t.page.evaluate(`(() => { ${HELP}; const o = {}, { G, A, t1, t2, sp } = R2.mk(2, 3, 2), [B, M1, M2] = t2, P1 = t1[1], names2 = t2.map(d => d.SC.name), st = d => d.state().scr;
        A.duelStart(); G.run(9); const Zb = R2.add({ net: G.net, A: B, insts: G.insts, run: G.run }, 'Zb', true); G.run(1);
        A.CFG.duel.len = 1; A.NET.duel.len = 1; B.NET.duel.len = 1; A.setSecured(30000); A.finish(true, 'Sieg'); B.setSecured(20000); B.finish(true, 'Sieg'); G.run(2); for (const d of [A, B, P1, M1, M2, Zb, ...sp]) { const e = d.get().ended; if (e) e.pg = 9; } G.run(.2);
        o.vorher = [st(B), B.NET.role, M1.NET.code === B.NET.code, Zb.NET.code === B.NET.code, A.NET.specs.length, B.NET.specs.length >= 1]; A.SESSION.wallet = 500;
        MT.click(A, 'endRet'); G.run(.05); o.sperre = [A.ho() && A.ho().ph, A.setMode(''), A.duelStart(), st(A), A.NET.duel, A.NET.conns.length];
        G.run(10);
        const all = [A, P1, B, M1, M2, Zb, ...sp];
        o.alle = all.map(d => [d.NET.code === A.NET.code, st(d)]); o.rollen = [P1.NET.team, B.NET.team, M1.NET.team, M2.NET.team, Zb.NET.spec, sp[0].NET.spec, B.NET.role, M1.NET.role];
        o.zahlen = [A.NET.roster.length, A.NET.t2.length, A.NET.specs.length]; o.reihe = A.NET.t2.map(c => c.nm); o.erwartet = names2; o.sp2 = sp.map(d => d.NET.sp2); o.duel = [A.NET.duel, A.NET.du, A.NET.mode, A.ho()];
        o.serie = [A.SESSION.wallet, B.SESSION.wallet]; o.msgA = A.NET.msg; o.alteRaeume = [B.NET.hb, B.hold()];
        o.start = A.duelStart(); G.run(14); o.neu = [A.ho(), !!(A.NET.duel && A.NET.duel.link), st(A), st(B), B.NET.role, A.NET.duel && A.NET.duel.uni];
        return o; })()`);
      t.eq(r.vorher, ['play', 'host', true, true, 3, true], 'Ausgangslage: Team 2 im Raum von B, ein Zuschauer bei B (mit Zweitverbindung zu A, also drei bei A)');
      t.eq(r.sperre, ['ret', false, false, 'lobby', null, 1], 'sofort: A ist in der Lobby, ohne Wettkampf, Start und Modus gesperrt');
      t.eq(r.alle.map(x => x[0]), r.alle.map(() => true), 'alle sind im Raum von A: ' + JSON.stringify(r.alle)); t.eq(r.alle.map(x => x[1]), r.alle.map(() => 'lobby'), 'alle in der Lobby');
      t.eq(r.rollen, [1, 2, 2, 2, true, true, 'client', 'client'], 'Rollen: Team 1 und Team 2 wie vorher, B ist wieder Client, die Zuschauer sind Zuschauer'); t.eq(r.zahlen, [2, 3, 3], 'A hat zwei Spieler, drei in Team 2 und drei Zuschauer (zwei eigene, einen von B)');
      t.eq(r.reihe, r.erwartet, 'Reihenfolge in Team 2 bleibt, B ist wieder Host 2'); t.eq(r.sp2, [null, null], 'die Zweitverbindungen der Zuschauer sind weg'); t.eq(r.duel, [null, null, 'duel', null], 'kein Duell mehr, Modus Wettkampf, Sperre geloest');
      t.eq(r.serie, [0, 0], 'Serie zurueck wie bei der Revanche'); t.ok(r.msgA === '' || !/Zurück/.test(r.msgA), 'Meldung abgeraeumt: ' + r.msgA); t.eq(r.alteRaeume, [null, null], 'B hat nichts mehr offen');
      t.eq(r.neu, [null, true, 'play', 'play', 'host', 1], 'von dort startet ein neuer Wettkampf: Uebergabe, Leitung steht, beide spielen');
    },
  },
  {
    name: 'N3 Wer nicht ankommt: Reagiert ein Mitspieler von B nicht auf ret, wartet B hoechstens CFG.net.retWait und geht dann selbst, der Nachzuegler steht auf dem Titel (kein Haenger), der Rest ist vollstaendig; ein Beitritt, der nicht klappt, endet auf dem Titel',
    async run(t) {
      await SETUP(t);
      const r = await t.page.evaluate(`(() => { ${HELP}; const o = {}, { G, A, t1, t2, sp } = R2.mk(2, 3, 0), [B, M1, M2] = t2, st = d => d.state().scr;
        A.duelStart(); G.run(9); A.CFG.duel.len = 1; A.NET.duel.len = 1; B.NET.duel.len = 1; A.setSecured(30000); A.finish(true, 'Sieg'); B.setSecured(20000); B.finish(true, 'Sieg'); G.run(2); for (const d of [A, B, M1, M2]) { const e = d.get().ended; if (e) e.pg = 9; }
        M2.NET.conn.onmsg = () => {}; o.wait = B.CFG.net.retWait; MT.click(A, 'endRet'); G.run(4); o.waehrend = [st(B), B.NET.role, st(M1), M1.NET.code === A.NET.code, st(M2), M2.NET.code === B.NET.code];
        G.run(13); o.danach = [st(B), B.NET.code === A.NET.code, B.NET.team, st(M2), M2.flog().dump().ereignisse.some(e => e[2] === 'netz' && /Verbindung zum Host verloren/.test(JSON.stringify(e[3]))), A.NET.t2.length, A.NET.t2[0].nm === B.SC.name, A.ho()];
        return o; })()`);
      t.ok(r.wait > 0 && r.wait <= 10, 'Wartezeit ' + r.wait);
      t.eq(r.waehrend, ['play', 'host', 'lobby', true, 'play', true], 'waehrend B wartet: M1 ist schon bei A, M2 reagiert nicht, B haelt seinen Raum');
      t.eq(r.danach.slice(0, 4), ['lobby', true, 2, 'title'], 'danach: B bei A in Team 2, M2 auf dem Titel'); t.ok(r.danach[4], 'M2 verliert die Verbindung zum Host (Flugschreiber)'); t.eq(r.danach.slice(5), [2, true, null], 'A: B und M1 in Team 2, B zuerst, Sperre geloest');
    },
  },
  {
    name: 'N3 Platzwunsch im hi (tm 2 und o): Team 2 nimmt Beitretende, bis es voll ist (dann Zuschauer mit Hinweis), die Reihenfolge folgt o, im Coop-Raum gibt es kein Team 2, ohne tm bleibt alles wie vorher',
    async run(t) {
      await SETUP(t);
      const r = await t.page.evaluate(`(() => { ${HELP}; const o = {}, G = CT.mkLobby(1, 0), A = G.A; A.setName('Anna'); G.run(.2); MT.click(A, 'mDuel'); G.run(.3);
        const add = (nm, want) => { const C = mkInst(G.net, nm); G.insts.push(C); C.setName(nm); C.joinRoom(A.NET.code, want ? { want } : undefined); G.run(2); return C; };
        const xs = [add('Dd', { team: 2, o: 3 }), add('Bb', { team: 2, o: 1 }), add('Cc', { team: 2, o: 2 }), add('Aa', { team: 2, o: 0 })];
        o.team2 = [xs.map(d => d.NET.team), A.NET.t2.map(c => c.nm), A.NET.roster.length];
        const e = add('Ee', { team: 2, o: 4 }); o.voll = [e.NET.spec, e.NET.team, e.NET.msg, A.NET.t2.length, A.NET.specs.length];
        const f = add('Ff'); o.ohne = [f.NET.spec, f.NET.team, A.NET.roster.length];
        const H = CT.mkLobby(1, 0), K = H.A; MT.click(K, 'mCoop'); H.run(.3); const c = mkInst(H.net, 'cc'); H.insts.push(c); c.joinRoom(K.NET.code, { want: { team: 2, o: 0 } }); H.run(2); o.coop = [c.NET.team, c.NET.spec, K.NET.t2.length, c.NET.msg];
        const w = mkInst(G.net, 'ww'); G.insts.push(w); w.joinRoom(A.NET.code, { want: { team: 2, o: 'x' } }); G.run(2); o.schlecht = [w.NET.spec, w.NET.team];
        return o; })()`);
      t.eq(r.team2, [[2, 2, 2, 2], ['Aa', 'Bb', 'Cc', 'Dd'], 1], 'vier Wuensche: alle in Team 2, nach o sortiert (nicht nach Ankunft)');
      t.eq(r.voll[0], true, 'der fuenfte wird Zuschauer'); t.ok(/Team 2 ist voll/.test(r.voll[2]), 'mit Hinweis: ' + r.voll[2]); t.eq([r.voll[3], r.voll[4]], [4, 1], 'Zahlen');
      t.eq(r.ohne[0] === false && r.ohne[1] === 1, true, 'ohne Wunsch wie vorher (Team 1)'); t.eq(r.coop[0] !== 2 && r.coop[2], 0, 'Coop-Raum: kein Team 2'); t.eq(r.coop[1], false, 'sondern Spieler in Team 1'); t.eq(r.schlecht[1] === 2 || r.schlecht[0] === true, true, 'unlesbares o bricht nichts');
    },
  },
  {
    name: 'N3 Nur vom Team-Host: ret wirkt nur auf der Hauptverbindung zu einem Raum der Seite b (Team-Host B), mit gueltigem Code, nicht der eigene Raumcode; Spieler von A, die Zweitverbindung eines Zuschauers und Fremde ignorieren es',
    async run(t) {
      await SETUP(t);
      const r = await t.page.evaluate(`(() => { ${HELP}; const o = {}, { G, A, t1, t2, sp } = R2.mk(2, 2, 1), [B, M1] = t2, P1 = t1[1], S = sp[0], st = d => d.state().scr;
        A.duelStart(); G.run(9); const code = A.NET.code, bcode = B.NET.code;
        P1.NET.conn.onmsg({ t: 'ret', a: 'ZZ23', o: 1 }); G.run(.5); o.p1 = [st(P1), P1.NET.code === code];
        M1.NET.conn.onmsg({ t: 'ret', a: 'zz', o: 1 }); M1.NET.conn.onmsg({ t: 'ret', a: bcode, o: 1 }); M1.NET.conn.onmsg({ t: 'ret' }); G.run(.5); o.m1 = [st(M1), M1.NET.code === bcode];
        o.sp2 = !!S.NET.sp2; const s0 = st(S); if (S.NET.sp2 && S.NET.sp2.conn) S.NET.sp2.conn.onmsg({ t: 'ret', a: 'ZZ23', o: 1 }); G.run(.5); o.spec = [st(S) === s0, S.NET.code === code, !!S.NET.sp2];
        const X = mkInst(G.net, 'x'); G.insts.push(X); X.joinRoom(bcode, { spec: true }); G.run(1); o.fremd = [X.NET.code]; B.NET.duel.d = 1;
        o.bRet = (() => { B.NET.conn && 0; return B.duelRet(); })(); o.stand = [st(A), st(B), A.NET.duel && !!A.NET.duel.link];
        return o; })()`);
      t.eq(r.p1, ['play', true], 'ein Spieler von A bleibt'); t.eq(r.m1, ['play', true], 'ein Mitspieler von B bleibt bei ungueltigem Code, eigenem Raumcode und ohne Code'); t.eq(r.sp2, true, 'der Zuschauer hat eine Zweitverbindung'); t.eq(r.spec, [true, true, true], 'der Zuschauer bleibt in seinem Raum, auf der Zweitverbindung wirkt ret nicht');
      t.eq(r.bRet, false, 'B (kein Raum-Host) kann duelRet nicht ausloesen'); t.eq(r.stand, ['play', 'play', true], 'das Duell laeuft weiter');
    },
  },
  {
    name: 'N3 Kein Haenger: Fuehrt ret zu einem Raum, den es nicht gibt, steht der Mitspieler sofort auf dem Titel, kommt der Beitritt nicht an (Nachrichten gehen verloren), nach CFG.net.retJoin; die uebrigen bleiben unberuehrt',
    async run(t) {
      await SETUP(t);
      const r = await t.page.evaluate(`(() => { ${HELP}; const o = {}, { G, A, t1, t2 } = R2.mk(2, 3, 0), [B, M1, M2] = t2, st = d => d.state().scr, ev = d => d.flog().dump().ereignisse.map(e => JSON.stringify(e[3]));
        A.duelStart(); G.run(9); o.imSpiel = [st(M1), st(M2)];
        M1.NET.conn.onmsg({ t: 'ret', a: 'ZZ99', o: 1 }); G.run(2); o.weg = [st(M1), ev(M1).some(s => /ret/.test(s))];
        M2.NET.conn.onmsg({ t: 'ret', a: A.NET.code, o: 1 }); G.net.cut(M2.name, { silent: true, closeAfter: 100 }); G.run(5); o.wartet = [st(M2), M2.NET.retT > 0]; G.run(12); o.titel = [st(M2), M2.NET.role, ev(M2).some(s => /verlassen/.test(s) && /fehlgeschlagen/.test(s))];
        o.rest = [st(A), st(B), A.NET.duel && !!A.NET.duel.link]; return o; })()`);
      t.eq(r.imSpiel, ['play', 'play'], 'Ausgangslage'); t.eq(r.weg, ['title', true], 'unbekannter Raum: sofort Titel');
      t.eq(r.wartet, ['lobby', true], 'solange der Beitritt laeuft, ist es die Lobby mit Zaehler'); t.eq(r.titel, ['title', 'solo', true], 'nach der Frist steht er auf dem Titel');
      t.eq(r.rest, ['play', 'play', true], 'die anderen merken nichts');
    },
  },
];
