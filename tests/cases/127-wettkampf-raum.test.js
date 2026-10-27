// Coop-Ausbau R2 (docs/coop-ausbau.md, Spur R): Wettkampf in einem Raum. Alle Teilnehmer verbinden sich mit dem Raum-Host A (Team 1). Neben dem Roster gibt es die Liste NET.t2 (Team 2, die Reihenfolge zaehlt: der erste ist der Host von Team 2),
// die Zuschauer und die Grenzen 4 plus 4 plus 6. Jeder waehlt sein Team (Kacheln Team 1, Team 2, Zuschauer) oder der Host stellt um (Teilnehmer-Liste, Pfeil nach oben). Der Start (A.duelStart) prueft vorher, dass sich Team 2 mit seinem Host verbinden kann
// (prep, probe, ok, fail), dann wechselt Team 2 in den eigenen Raum bei seinem Host (go) und der verbindet sich als Gegner mit A (die Leitung aus W1, automatisch bereit). Schlaegt es vor go fehl, bleibt jeder im Raum und der Start bricht mit Meldung ab.
const SETUP = async t => { await t.loadTool('loopnet.js'); await t.loadInpage('coop.js'); await t.loadInpage('menu.js'); await t.loadInpage('overlap.js'); };
// Hilfen in der Seite: add(G, name, spec) laesst eine Instanz beitreten, mk(n1, n2, ns) baut einen Wettkampf-Raum mit n1 Spielern in Team 1 (A mitgezaehlt), n2 in Team 2 und ns Zuschauern
const HELP = `
  window.R2 = {
    add(G, nm, spec) { const C = mkInst(G.net, nm); G.insts.push(C); C.setName(nm); C.joinRoom(G.A.NET.code, spec ? { spec: true } : undefined); G.run(2); return C; },
    mk(n1, n2, ns, mode) {
      const G = CT.mkLobby(1, 0), A = G.A; A.setName('Anna'); G.run(.2); MT.click(A, 'mDuel'); G.run(.3);
      const t1 = [A], t2 = [], sp = [], names = ['Bo', 'Cy', 'Di', 'Ed', 'Fi', 'Gu', 'Hu', 'Iv'];
      // abwechselnd beitreten: im Wettkampf kommt ein Beitretender ins kleinere Team, danach wird passend umgestellt
      let k = 0; const all = [];
      for (let i = 1; i < n1 + n2; i++) all.push(R2.add(G, names[k++]));
      for (const d of all) { if (d.NET.team === 1) t1.push(d); else t2.push(d); }
      for (let i = 0; i < ns; i++) sp.push(R2.add(G, 'Z' + (i + 1), true));
      // Zielgroessen herstellen (Host stellt um)
      const mv = (d, to) => { const who = d.NET.team === 2 ? 't' + d.NET.tk : d.NET.team === 1 ? d.NET.myId : 's' + d.NET.sid; A.roleSet(who, to); G.run(.5); };
      while (t1.length > n1) { const d = t1.pop(); mv(d, 2); t2.push(d); }
      while (t2.length > n2) { const d = t2.pop(); mv(d, 1); t1.push(d); }
      G.run(1); return { G, A, t1, t2, sp };
    },
  };`;

module.exports = [
  {
    name: 'Wettkampf-Raum: Platzvergabe und Grenzen (ohne Modus fuellt sich Team 1, dann die Warteliste Team 2, dann die Zuschauer, im Wettkampf das kleinere Team, im Coop nur Team 1 und Zuschauer), 14 Teilnehmer sind der Hoechstwert, Coop spielen ist bei Wartenden gesperrt',
    async run(t) {
      await SETUP(t);
      const r = await t.page.evaluate(`(() => { ${HELP}; const o = {}, G = CT.mkLobby(1, 0), A = G.A; A.setName('Anna'); G.run(.2);
        const ls = () => [A.NET.roster.length, A.NET.t2.length, A.NET.specs.length];
        for (let i = 1; i <= 4; i++) R2.add(G, 'S' + i); o.ohneModus = ls(); o.team5 = G.insts[4].NET.team; o.lockCoop = MT.tile(A, 'mCoop').lock;
        for (let i = 5; i <= 7; i++) R2.add(G, 'S' + i); o.acht = ls();
        for (let i = 8; i <= 13; i++) R2.add(G, 'Z' + i, true); o.voll = ls();
        const X = mkInst(G.net, 'x'); G.insts.push(X); X.joinRoom(A.NET.code); G.run(2); o.abgewiesen = [X.state().scr, X.titleNote() && X.titleNote().s, ls()];
        const Y = mkInst(G.net, 'y'); G.insts.push(Y); Y.joinRoom(A.NET.code, { spec: true }); G.run(2); o.abgewiesenZ = [Y.state().scr, Y.titleNote() && Y.titleNote().s];
        o.coopSperre = [A.setMode('coop'), A.NET.mode];
        const H = CT.mkLobby(1, 0), B = H.A; MT.click(B, 'mDuel'); H.run(.3); const bs = []; for (let i = 1; i <= 4; i++) { const C = mkInst(H.net, 'w' + i); H.insts.push(C); C.joinRoom(B.NET.code); H.run(2); bs.push(C.NET.team); }
        o.duelBalance = bs; o.duelListen = [B.NET.roster.length, B.NET.t2.length];
        const K = CT.mkLobby(1, 0), D = K.A; MT.click(D, 'mCoop'); K.run(.3); const cs = []; for (let i = 1; i <= 6; i++) { const C = mkInst(K.net, 'k' + i); K.insts.push(C); C.joinRoom(D.NET.code); K.run(2); cs.push([C.NET.team, C.NET.spec]); }
        o.coop = [cs, D.NET.roster.length, D.NET.t2.length, D.NET.specs.length];
        return o; })()`);
      t.eq(r.ohneModus, [4, 1, 0], 'ohne Modus: erst Team 1 (vier), dann die Warteliste Team 2'); t.eq(r.team5, 2, 'der fuenfte Spieler ist in Team 2'); t.ok(r.lockCoop, 'mit Wartenden ist Coop spielen gesperrt: ' + r.lockCoop);
      t.eq(r.acht, [4, 4, 0], 'acht Spieler: vier plus vier'); t.eq(r.voll, [4, 4, 6], 'dazu sechs Zuschauer: 14 Teilnehmer');
      t.eq(r.abgewiesen, ['title', 'Der Raum ist voll.', [4, 4, 6]], 'der 15. Spieler wird abgewiesen'); t.eq(r.abgewiesenZ[0], 'title', 'ein weiterer Zuschauer auch');
      t.eq(r.coopSperre, [false, ''], 'Coop spielen ist mit Wartenden nicht waehlbar');
      t.eq(r.duelBalance, [2, 1, 2, 1], 'im Wettkampf kommt ein Beitretender ins kleinere Team'); t.eq(r.duelListen, [3, 2], 'Team 1: Host und zwei, Team 2: zwei');
      t.eq(r.coop.slice(1), [4, 0, 3], 'im Coop gibt es nur Team 1 und Zuschauer'); t.eq(r.coop[0].map(x => x[1]), [false, false, false, true, true, true], 'der fuenfte und die weiteren werden Zuschauer');
    },
  },
  {
    name: 'Wettkampf-Raum: Team waehlen (selbst ueber die Kacheln, durch den Host in der Teilnehmer-Liste), Zuschauer in beide Richtungen, Reihenfolge in Team 2 mit dem Pfeil, Namen bleiben, Meldungen und Sperren bei vollem Team',
    async run(t) {
      await SETUP(t);
      const r = await t.page.evaluate(`(() => { ${HELP}; const o = {}, { G, A, t1, t2 } = R2.mk(3, 2, 0), ids = d => d.ui().tiles().map(q => q.id), st = () => [A.NET.roster.length, A.NET.t2.length, A.NET.specs.length];
        const [, B1, B2] = t1, [C1, C2] = t2; o.start = [st(), t1.map(d => d.NET.team), t2.map(d => d.NET.team)];
        o.kacheln = ['tm1', 'tm2', 'tmS'].map(id => ids(B1).includes(id)); o.gewaehlt = [MT.tile(B1, 'tm1').chosen, MT.tile(C1, 'tm2').chosen];
        MT.click(B1, 'tm2'); G.run(1); o.b1 = [B1.NET.team, B1.NET.myId >= 0, B1.NET.tk > 0, st(), B1.NET.msg, A.NET.t2n.map(x => x.n)];
        MT.click(B1, 'tm1'); G.run(1); o.b2 = [B1.NET.team, st(), B1.NET.msg];
        MT.click(B2, 'tmS'); G.run(1); o.zuschauer = [B2.NET.spec, B2.NET.team, st(), A.NET.spNames.length, MT.tile(B2, 'tmS').chosen];
        MT.click(B2, 'tm1'); G.run(1); o.zurueck = [B2.NET.spec, B2.NET.team, st()];
        MT.click(C1, 'tmS'); G.run(1); const ord0 = A.NET.t2.map(c => c.nm); o.t2Zuschauer = [st(), ord0];
        MT.click(C1, 'tm2'); G.run(1); o.ordnung = A.NET.t2.map(c => c.nm);
        MT.click(A, 'kick'); o.modal = ids(A).filter(s => /^k[12S]:|^ku:/.test(s)).sort(); const last = A.NET.t2[A.NET.t2.length - 1]; MT.click(A, 'ku:t' + last.tk); G.run(.5); o.hoch = A.NET.t2.map(c => c.nm); MT.k(A, 'Escape');
        o.erster = A.NET.t2[0].nm;
        const D = R2.add(G, 'Neu'); MT.click(A, 'kick'); MT.click(A, 'k1:' + (A.NET.t2.find(c => c.nm === 'Neu') ? 't' + A.NET.t2.find(c => c.nm === 'Neu').tk : 'x')); G.run(.5); MT.k(A, 'Escape'); o.durchHost = [D.NET.team, D.NET.myId >= 0, st()];
        // Team 1 ist voll: Mitspieler in Team 2 sehen die Sperre, die Anfrage wird mit einer Meldung abgelehnt
        const E = R2.add(G, 'Eins'); G.run(1); o.voll = [st(), MT.tile(C1, 'tm1').lock || '']; C1.NET.msg = ''; C1.NET.conn.send({ t: 'role', v: 1 }); G.run(.5); o.vollMeldung = [C1.NET.team, C1.NET.msg];
        return o; })()`);
      t.eq(r.start, [[3, 2, 0], [0, 1, 1], [2, 2]], 'Ausgangslage: drei gegen zwei (der Host hat keine Team-Nummer, er ist immer Team 1)'); t.eq(r.kacheln, [true, true, true], 'Mitspieler haben Team 1, Team 2 und Zuschauer'); t.eq(r.gewaehlt, [true, true], 'das eigene Team ist gewaehlt');
      t.eq([r.b1[0], r.b1[1], r.b1[2], r.b1[3]], [2, false, true, [2, 3, 0]], 'nach dem Wechsel zu Team 2: Team 2, kein Spielerplatz mehr, Nummer in Team 2, Zahlen'); t.ok(/Team 2/.test(r.b1[4]), 'Meldung nennt Team 2: ' + r.b1[4]); t.eq(r.b1[5].length, 3, 'drei Namen in Team 2');
      t.eq([r.b2[0], r.b2[1]], [1, [3, 2, 0]], 'zurueck in Team 1'); t.ok(/Team 1/.test(r.b2[2]), 'Meldung nennt Team 1');
      t.eq([r.zuschauer[0], r.zuschauer[1], r.zuschauer[2], r.zuschauer[3], r.zuschauer[4]], [true, 0, [2, 2, 1], 1, true], 'als Zuschauer'); t.eq([r.zurueck[0], r.zurueck[1], r.zurueck[2]], [false, 1, [3, 2, 0]], 'zurueck als Spieler in Team 1');
      t.eq(r.t2Zuschauer[0], [3, 1, 1], 'ein Spieler aus Team 2 wird Zuschauer'); t.eq(r.ordnung.length, 2, 'und kommt wieder'); t.ok(r.ordnung[r.ordnung.length - 1] !== r.t2Zuschauer[1][0] || r.ordnung.length === 2, 'er steht jetzt hinten');
      t.eq(r.modal.filter(s => /^ku:/.test(s)).length, 1, 'der Pfeil nach oben steht nur bei Spielern in Team 2, die nicht die ersten sind'); t.eq(r.hoch[0], r.ordnung[1], 'der Pfeil schiebt den hinteren nach vorn (er ist jetzt Host von Team 2)');
      t.eq(r.durchHost[0], 1, 'der Host stellt einen Beitretenden in Team 1 um');
      t.ok(/Team 1 voll/.test(r.voll[1]), 'die Kachel Team 1 zeigt die Sperre: ' + r.voll[1]); t.eq(r.vollMeldung[0], 2, 'bei vollem Team 1 bleibt der Spieler in Team 2'); t.ok(/Team 1 ist voll/.test(r.vollMeldung[1]), 'Meldung: ' + r.vollMeldung[1]);
    },
  },
  {
    name: 'Wettkampf-Raum: der Start prueft die Verbindung von Team 2 und uebergibt dann (prep, probe, go), Team 2 spielt in einem Raum bei seinem Host, beide Teams starten automatisch, auch bei ungleicher Groesse',
    async run(t) {
      await SETUP(t);
      const r = await t.page.evaluate(`(() => { ${HELP}; const o = {}, { G, A, t1, t2 } = R2.mk(2, 3, 0), [P1] = t1.slice(1), [B, M1, M2] = t2, st = d => d.state().scr;
        o.vor = [A.NET.roster.length, A.NET.t2.length, B.NET.team, A.NET.t2[0].nm === (B.NET.t2n[0] || {}).n];
        MT.click(A, 'start'); G.run(.05); o.ho = [A.ho() && A.ho().ph, A.NET.duel && A.NET.duel.uni, A.NET.duel && A.NET.duel.lead];
        G.run(.12); o.hold = [!!B.hold(), B.hold() && B.hold().ready];
        G.run(2.5); o.link = [!!(A.NET.duel && A.NET.duel.link), !!(B.NET.duel && B.NET.duel.link), A.ho() === null, B.NET.role, B.NET.code !== A.NET.code, B.NET.side];
        o.raeume = [M1.NET.code === B.NET.code, M2.NET.code === B.NET.code, P1.NET.code === A.NET.code, M1.NET.role, B.NET.roster.length, A.NET.roster.length, M1.NET.team, M1.NET.myId > 0];
        o.gegner = [A.NET.du && A.NET.du.n, B.NET.du && B.NET.du.n, A.NET.duel.rdy, B.NET.duel.rdy, A.NET.duel.uni, B.NET.duel.uni];
        o.lobby = [A.ui().tiles().some(q => q.id === 'u0'), B.ui().tiles().some(q => q.id === 'u0'), MT.tile(A, 'start').title, MT.tile(B, 'start').title];
        G.run(9); o.spiel = [st(A), st(B), st(P1), st(M1), st(M2), A.get().players.length, B.get().players.length];
        o.gleich = [A.LAY().seed === B.LAY().seed, A.sc() === B.sc()]; return o; })()`);
      t.eq(r.vor, [2, 3, 2, true], 'vor dem Start: zwei gegen drei, Team 2 kennt die Liste');
      t.eq(r.ho, ['prep', 1, true], 'der Klick startet die Uebergabe, A ist Leiter eines Wettkampfs fuer zwei Raeume'); t.eq(r.hold, [true, true], 'Host B oeffnet einen verdeckten Raum');
      t.eq(r.link, [true, true, true, 'host', true, 'b'], 'danach steht die Leitung zwischen den Hosts, die Uebergabe ist zu, B ist Host eines eigenen Raums');
      t.eq(r.raeume, [true, true, true, 'client', 3, 2, 1, true], 'Team 2 sitzt im Raum von B (drei Spieler), Team 1 bleibt im Raum von A (zwei Spieler)');
      t.eq(r.gegner, [3, 2, 1, 1, 1, 1], 'beide Hosts kennen die Teamgroesse des Gegners und sind automatisch bereit'); t.eq(r.lobby, [false, false, 'Bereit zurücknehmen', 'Bereit zurücknehmen'], 'beide Lobbys zeigen eine Spalte und Bereit zurücknehmen');
      t.eq(r.spiel, ['play', 'play', 'play', 'play', 'play', 2, 3], 'nach dem Countdown spielen beide Teams, zwei gegen drei'); t.eq(r.gleich, [true, true], 'dieselbe Karte und dasselbe Szenario');
    },
  },
  {
    name: 'Wettkampf-Raum: der Start bricht ab, wenn sich Team 2 nicht verbinden kann (Probe scheitert), wenn Host B nicht antwortet oder wenn jemand den Raum verlaesst; alle bleiben im Raum, mit Meldung; waehrend der Uebergabe sind Beitritt, Wechsel und Modus gesperrt',
    async run(t) {
      await SETUP(t);
      const r = await t.page.evaluate(`(() => { ${HELP}; const o = {}, st = G => [G.A.NET.roster.length, G.A.NET.t2.length, G.A.NET.specs.length];
        { const { G, A, t1, t2 } = R2.mk(2, 3, 0), [B, M1, M2] = t2; A.duelStart(); G.run(.06); B.holdClose(); G.run(2);
          o.probe = [A.ho(), A.NET.duel, A.NET.msg, st(G), t2.map(d => d.state().scr), t2.map(d => d.NET.team), A.NET.hp, M1.NET.msg]; }
        { const { G, A, t1, t2 } = R2.mk(2, 2, 0), [B, M1] = t2; B.NET.conn.onmsg = () => {}; A.duelStart(); G.run(1); o.waehrend = [A.ho() && A.ho().ph, A.NET.hp];
          const N = mkInst(G.net, 'n'); G.insts.push(N); N.joinRoom(A.NET.code); G.run(2); o.beitritt = [N.state().scr, N.titleNote() && N.titleNote().s];
          o.sperren = [A.roleSet(1, 's'), A.roleSet('t' + M1.NET.tk, 1), A.setMode('coop'), A.setMode(''), A.duelStart(), MT.tile(M1, 'tm1').lock, MT.tile(A, 'start').lock];
          G.run(7); o.stumm = [A.ho(), A.NET.duel, A.NET.msg, st(G), B.NET.msg]; }
        { const { G, A, t1, t2 } = R2.mk(2, 3, 0), [B, M1, M2] = t2; A.duelStart(); G.run(.1); M2.leaveGame(); G.run(2);
          o.geht = [A.ho(), A.NET.duel, A.NET.msg, st(G), M1.state().scr, M1.NET.team]; }
        { const { G, A, t1, t2 } = R2.mk(2, 3, 0); A.duelStart(); G.run(.06); A.kickPlayer('t' + t2[2].NET.tk); G.run(2); o.kick = [A.ho(), A.NET.t2.length, t2[2].state().scr]; }
        { const { G, A, t1, t2 } = R2.mk(2, 3, 0), [B, M1, M2] = t2; M2.NET.conn.onmsg = () => {}; A.duelStart(); G.run(3); o.teils = [A.ho() && A.ho().ph, !!(A.NET.duel && A.NET.duel.link), B.NET.role];
          G.run(13); o.teilsAus = [A.ho(), A.NET.duel, A.NET.msg, st(G), B.NET.role]; }
        { const { G, A, t1, t2 } = R2.mk(2, 1, 0); A.startCoop(); G.run(1); o.coopStart = [A.state().scr, t2[0].state().scr, A.NET.t2.length]; }
        return o; })()`);
      t.eq(r.probe[0], null, 'die Probe scheitert: die Uebergabe ist zu'); t.eq(r.probe[1], null, 'der Wettkampf-Leiter wird zurueckgenommen'); t.ok(/kann sich nicht mit .* verbinden/.test(r.probe[2]), 'Meldung nennt, wer sich nicht verbinden kann: ' + r.probe[2]);
      t.eq(r.probe[3], [2, 3, 0], 'alle bleiben im Raum'); t.eq(r.probe[4], ['lobby', 'lobby', 'lobby'], 'und in der Lobby'); t.eq(r.probe[5], [2, 2, 2], 'in Team 2'); t.eq(r.probe[6], '', 'der Hinweis Verbindungen werden geprueft ist weg'); t.ok(/nicht|Raum/.test(r.probe[7]), 'auch Team 2 bekommt die Meldung: ' + r.probe[7]);
      t.eq(r.waehrend, ['prep', 'prep'], 'waehrend B schweigt, steht die Uebergabe in prep (bei allen als hp)'); t.eq(r.beitritt[0], 'title', 'ein Beitretender wird waehrend der Uebergabe abgewiesen'); t.ok(/Start laeuft|Start läuft/.test(r.beitritt[1]), 'mit Meldung: ' + r.beitritt[1]);
      t.eq(r.sperren.slice(0, 5), [false, false, false, false, false], 'waehrend der Uebergabe: kein Wechsel, kein Modus, kein zweiter Start'); t.ok(r.sperren[5], 'die Kacheln der Mitspieler sind gesperrt'); t.ok(r.sperren[6], 'auch Wettkampf starten');
      t.eq(r.stumm[0], null, 'B antwortet nicht: nach sechs Sekunden Abbruch'); t.eq(r.stumm[1], null, 'der Leiter ist zurueckgenommen'); t.ok(/antwortet nicht/.test(r.stumm[2]), 'Meldung: ' + r.stumm[2]); t.eq(r.stumm[3], [2, 2, 0], 'alle sind noch da');
      t.eq(r.geht[0], null, 'geht ein Spieler waehrend der Probe, bricht der Start ab'); t.ok(/hat den Raum verlassen/.test(r.geht[2]), 'Meldung: ' + r.geht[2]); t.eq(r.geht[3], [2, 2, 0], 'die anderen bleiben'); t.eq(r.geht[4], 'lobby', 'im Raum');
      t.eq(r.teils, ['probe', false, 'client'], 'antwortet ein Spieler nie, wartet die Uebergabe in probe (kein go nach dem ersten ok)'); t.eq(r.teilsAus[0], null, 'nach 14 Sekunden Abbruch'); t.ok(/kann sich nicht mit .* verbinden/.test(r.teilsAus[2]), 'Meldung: ' + r.teilsAus[2]); t.eq(r.teilsAus[3], [2, 3, 0], 'alle bleiben'); t.eq(r.teilsAus[4], 'client', 'B ist noch Client von A');
      t.eq(r.coopStart, ['play', 'title', 0], 'ein gewoehnlicher Start (startCoop) schliesst uebrig gebliebene Spieler von Team 2 aus dem Raum aus, sie landen auf dem Titel');
      t.eq(r.kick[0], null, 'auch ein Entfernen bricht ab'); t.eq(r.kick[1], 2, 'Team 2 hat zwei Spieler'); t.eq(r.kick[2], 'title', 'der Entfernte ist auf dem Titel');
    },
  },
  {
    name: 'Wettkampf-Raum: Team 2 mit nur einem Spieler (kein Probe-Schritt), Zuschauer sehen nach der Uebergabe beide Raeume (dlc), Chat in der Lobby vor dem Start erreicht Team 1, Team 2 und Zuschauer',
    async run(t) {
      await SETUP(t);
      const r = await t.page.evaluate(`(() => { ${HELP}; const o = {}, { G, A, t1, t2, sp } = R2.mk(2, 1, 1), [B] = t2, [S] = sp, lines = d => d.chat().lines.map(l => [l.s, l.c, l.id]), send = (d, s) => { MT.k(d, 'c'); MT.type(d, s); MT.k(d, 'Enter'); };
        send(B, 'Team 2 meldet sich'); G.run(1.2); send(S, 'ich schaue'); G.run(1.2); o.eigene = [A, t1[1], B, S].map(d => d.chatOwn().join()); o.chat = [A, t1[1], B, S].map(d => lines(d).map(x => x[0]));
                A.duelStart(); G.run(.14); o.eins = [A.ho() && A.ho().ph]; G.run(6);
        o.link = [!!(A.NET.duel && A.NET.duel.link), B.NET.role, B.NET.roster.length, B.NET.hp, A.NET.hp];
        o.zuschauer = [S.sp2() && S.sp2().code === B.NET.code, S.sp2() && S.sp2().live, S.NET.spec, S.NET.code === A.NET.code, B.NET.specs.length];
        return o; })()`);
      t.eq(r.chat, [['Team 2 meldet sich', 'ich schaue'], ['Team 2 meldet sich', 'ich schaue'], ['Team 2 meldet sich', 'ich schaue'], ['Team 2 meldet sich', 'ich schaue']], 'der Raum-Chat erreicht Host, Team 1, Team 2 und Zuschauer');
      t.eq(r.eigene, ['false,false', 'false,false', 'true,false', 'false,true'], 'nur die eigene Zeile ist als eigene gekennzeichnet (Team 2 und Zuschauer mit gleicher Nummer werden nicht verwechselt)');
      t.eq(r.eins, ['go'], 'ohne weitere Spieler in Team 2 geht die Uebergabe sofort in go'); t.eq(r.link, [true, 'host', 1, '', ''], 'die Leitung steht, B ist allein in seinem Raum');
      t.eq(r.zuschauer, [true, true, true, true, 1], 'der Zuschauer bleibt bei A und sieht B ueber die Zweitverbindung (bei B ein Zuschauer mehr)');
    },
  },
  {
    name: 'Wettkampf-Raum: Ueberlappung der Lobby in allen Zustaenden (ohne Modus mit Wartenden, Wettkampf mit zwei Spalten fuer Host, Team 1, Team 2 und Zuschauer, waehrend der Uebergabe, Raum von B, Teilnehmer-Liste mit Teams)',
    async run(t) {
      await SETUP(t);
      const r = await t.page.evaluate(`(() => { ${HELP}; const out = {}, chk = (d, tag) => { const o = OV.check(d); if (o.length) out[tag] = o; };
        const G0 = CT.mkLobby(1, 0), A0 = G0.A; A0.setName('Anna-Lena'); for (let i = 1; i <= 5; i++) R2.add(G0, ['Bo', 'Cyrill-Max', 'Dagmar', 'Emil', 'Fiona'][i - 1]); chk(A0, 'ohne Modus Host'); chk(G0.insts[5], 'ohne Modus Wartender');
        const { G, A, t1, t2, sp } = R2.mk(3, 3, 2); A.setName('Anna-Lena'); G.run(.3);
        chk(A, 'Wettkampf Host'); chk(t1[1], 'Wettkampf Team 1'); chk(t2[0], 'Wettkampf Team 2'); chk(sp[0], 'Wettkampf Zuschauer');
        MT.k(t2[0], 'c'); MT.type(t2[0], 'eine ziemlich lange Zeile fuer das Chat-Fenster im Raum'); MT.k(t2[0], 'Enter'); G.run(1); chk(t2[0], 'Wettkampf Team 2 mit Chat'); chk(A, 'Wettkampf Host mit Chat');
        MT.click(A, 'kick'); { const L = A.ui().tiles(), bad = []; for (const q of L) if (q.x < 0 || q.y < 0 || q.x + q.w > 960 || q.y + q.h > 544) bad.push('ausserhalb ' + q.id);
          for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) { const a = L[i], b = L[j]; if (a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h) bad.push(a.id + ' ueber ' + b.id); } if (bad.length) out['Teilnehmer-Liste'] = bad; } MT.k(A, 'Escape');
        A.duelStart(); G.run(.3); chk(A, 'Uebergabe Host'); chk(t2[1], 'Uebergabe Team 2'); G.run(2.5); chk(A, 'nach der Uebergabe Host A'); chk(t2[0], 'nach der Uebergabe Host B'); chk(t2[1], 'nach der Uebergabe Mitspieler B'); chk(sp[0], 'nach der Uebergabe Zuschauer');
        return out; })()`);
      t.eq(r, {}, 'Fundstellen');
    },
  },
  {
    name: 'Wettkampf-Raum: nach der Uebergabe laeuft der Wettkampf wie in W2 bis zur Revanche (zwei gegen drei, ein Auftrag), danach sind beide Teams in ihrer Lobby und Bereit startet den naechsten Lauf auch bei ungleicher Groesse',
    async run(t) {
      await SETUP(t);
      const r = await t.page.evaluate(`(() => { ${HELP}; const o = {}, { G, A, t1, t2 } = R2.mk(2, 3, 0), [B, M1, M2] = t2, P1 = t1[1], st = d => d.state().scr;
        A.CFG.duel.len = 1; A.duelStart(); G.run(9); o.spiel = [st(A), st(B), A.NET.duel.len, B.NET.duel.len];
        A.setSecured(30000); A.finish(true, 'Sieg'); B.setSecured(20000); B.finish(true, 'Sieg'); G.run(2);
        for (const d of [A, B]) { for (let i = 0; i < 8 && !d.NET.duel.rdy && st(d) === 'play'; i++) { MT.k(d, 'Enter'); G.run(.2); } }
        G.run(1.5); o.lobby = [st(A), st(B), st(P1), st(M1), st(M2), A.NET.duel && !!A.NET.duel.link, B.NET.duel && !!B.NET.duel.link, A.NET.mode, B.NET.mode];
        o.titel = [MT.tile(A, 'start').title, MT.tile(B, 'start').title, A.NET.duel.uni, B.NET.duel.uni];
        MT.click(A, 'start'); G.run(.3); MT.click(B, 'start'); G.run(9); o.nochmal = [st(A), st(B), st(P1), st(M1), st(M2), A.NET.duel.k, A.get().players.length, B.get().players.length];
        return o; })()`);
      t.eq(r.spiel, ['play', 'play', 1, 1], 'beide spielen den einen Auftrag der Liste');
      t.eq(r.lobby, ['lobby', 'lobby', 'lobby', 'lobby', 'lobby', true, true, 'duel', 'duel'], 'nach der Revanche sind alle in der Lobby ihres Raums, die Leitung steht'); t.eq(r.titel, ['Bereit', 'Bereit', 1, 1], 'Bereit statt Starten (Leitung steht, auch bei ungleicher Groesse)');
      t.eq(r.nochmal.slice(0, 5), ['play', 'play', 'play', 'play', 'play'], 'beide Bereit: der naechste Lauf startet, auch zwei gegen drei'); t.eq(r.nochmal.slice(6), [2, 3], 'mit denselben Teams');
    },
  },
  {
    name: 'Wettkampf-Raum: Beitritte zum Raum von Host B vor dem go (B hinkt hinterher) werden gemerkt und danach bedient, der Start ist ohne Team 2 gesperrt',
    async run(t) {
      await SETUP(t);
      const r = await t.page.evaluate(`(() => { ${HELP}; const o = {}, { G, A, t1, t2 } = R2.mk(2, 3, 0), [B, M1, M2] = t2, st = d => d.state().scr;
        const h = B.NET.conn.onmsg; let held = null; B.NET.conn.onmsg = m => { if (m && m.t === 't2' && m.k === 'go') { held = m; return; } h(m); };
        A.duelStart(); for (let i = 0; i < 60 && !held; i++) G.run(.25); G.run(1.5); const hc = B.hold() && B.hold().code; o.gemerkt = [!!held, M1.NET.code === hc, M2.NET.code === hc, B.NET.role, B.hold() && B.hold().q];
        h(held); G.run(2.5); o.danach = [B.NET.role, B.NET.roster.length, M1.NET.code === B.NET.code, M2.NET.code === B.NET.code, !!(A.NET.duel && A.NET.duel.link), M1.NET.team];
        const H = CT.mkLobby(1, 0), X = H.A; MT.click(X, 'mDuel'); H.run(.3); o.leer = [MT.tile(X, 'start').lock || '', X.duelStart(), X.ho()];
        return o; })()`);
      t.eq(r.gemerkt.slice(0, 4), [true, true, true, 'client'], 'B hat das go noch nicht gesehen, die Mitspieler sind schon beim verdeckten Raum von B (die Beitritte kamen vor B an)'); t.eq(r.gemerkt[4], 2, 'beide Beitritte sind gemerkt, nicht abgewiesen');
      t.eq(r.danach, ['host', 3, true, true, true, 1], 'danach bedient B sie: drei Spieler im Raum, die Leitung steht'); t.eq(r.leer, ['Team 2 ist leer', false, null], 'ohne Team 2 ist Wettkampf starten gesperrt und tut nichts');
    },
  },
  {
    name: 'Wettkampf-Raum: Grenzen und Namen im Einzelnen (Team 2 hoechstens vier und nie im Coop, der Pfeil nicht beim ersten, gleiche Namen werden unterschieden und bleiben beim Wechsel, volles Team 2 sperrt die Kachel), Bereit von Host B zaehlt nur von B, B wartet auf seine Mitspieler, Revanche in beiden Reihenfolgen, Weggang aus Team 1 im Countdown',
    async run(t) {
      await SETUP(t);
      const r = await t.page.evaluate(`(() => { ${HELP}; const o = {}, go = (G, A) => { for (let i = 0; i < 80 && !(A.ho() && A.ho().ph === 'go'); i++) G.run(.05); };
        { const { G, A, t1, t2 } = R2.mk(2, 4, 0), P1 = t1[1], S = R2.add(G, 'Zu', true);
          { const ctx = A.cv.getContext('2d'), f = ctx.fillText, seen = []; ctx.fillText = function (x) { seen.push(String(x)); return f.apply(this, arguments); }; A.draw(); ctx.fillText = f; o.hostSchild = [seen.filter(x => x === 'Host').length, seen.filter(x => x === 'Host 2').length]; }
          o.voll4 = [A.NET.t2.length, A.roleSet('s' + S.NET.sid, 2), A.NET.t2.length, MT.tile(P1, 'tm2').lock || ''];
          const vor = A.NET.t2.map(c => c.nm).join(); o.erster = [A.t2Up(A.NET.t2[0].tk), A.NET.t2.map(c => c.nm).join() === vor]; }
        { const G = CT.mkLobby(1, 0), A = G.A; A.setName('Anna'); G.run(.2); MT.click(A, 'mCoop'); G.run(.3); const P = R2.add(G, 'Bo'), Z = R2.add(G, 'Cy', true);
          o.coop = [A.NET.mode, A.roleSet(1, 2), A.roleSet('s' + Z.NET.sid, 2), A.NET.t2.length]; P.NET.msg = ''; P.NET.conn.send({ t: 'role', v: 2 }); G.run(.5); o.coopMeldung = [P.NET.team, P.NET.msg]; }
        { const G = CT.mkLobby(1, 0), A = G.A; A.setName('Anna'); G.run(.2); for (const n of ['W1', 'W2', 'W3']) R2.add(G, n);
          R2.add(G, 'Bo'); R2.add(G, 'Bo'); R2.add(G, 'Anna'); o.namen = A.NET.t2.map(c => c.nm);
          A.roleSet('t' + A.NET.t2[1].tk, 's'); o.alsZuschauer = [A.NET.spNames.slice(), A.NET.t2.map(c => c.nm)]; A.kickPlayer(3); G.run(.5); A.roleSet('t' + A.NET.t2[0].tk, 1); G.run(.5); o.alsSpieler = A.NET.roster.map(r => r.name); }
        { const { G, A, t1, t2 } = R2.mk(2, 3, 0), [B, M1] = t2; A.duelStart(); M1.NET.conn.send({ t: 't2', k: 'ready', code: 'ABCD' }); G.run(3.5); o.fremd = [!!(A.NET.duel && A.NET.duel.link), A.ho()]; }
        { const { G, A, t1, t2 } = R2.mk(2, 3, 0), [B, M1, M2] = t2; A.duelStart(); go(G, A); M2.leaveGame(); G.run(4);
          o.wartet = [A.ho() && A.ho().ph, B.NET.role, !!B.NET.hb, B.NET.duel, B.NET.roster.length]; G.run(22); o.zeit = [!!(A.NET.duel && A.NET.duel.link), !!(B.NET.duel && B.NET.duel.link), B.NET.roster.length, B.NET.hb, A.ho()]; }
        { const { G, A, t1, t2 } = R2.mk(2, 3, 0), P1 = t1[1], B = t2[0]; A.duelStart(); for (let i = 0; i < 400 && !(A.NET.duel && A.NET.duel.cd >= 0); i++) G.run(.05); o.cd = A.NET.duel && A.NET.duel.cd >= 0; P1.leaveGame(); G.run(12); o.bereit = [A.state().scr, B.state().scr, A.NET.roster.length, B.get().players.length]; }
        { const { G, A, t1, t2 } = R2.mk(1, 1, 0), [B] = t2; A.CFG.duel.len = 1; A.duelStart(); G.run(9); A.setSecured(30000); A.finish(true, 'Sieg'); B.setSecured(20000); B.finish(true, 'Sieg'); G.run(2);
          for (const d of [B, A]) { for (let i = 0; i < 8 && !d.NET.duel.rdy && d.state().scr === 'play'; i++) { MT.k(d, 'Enter'); G.run(.2); } }
          G.run(1.5); o.revanche = [A.state().scr, B.state().scr, A.NET.duel.rdy, B.NET.duel.rdy]; }
        return o; })()`);
      t.eq(r.voll4, [4, false, 4, r.voll4[3]], 'Team 2 hat hoechstens vier Plaetze, auch fuer den Host'); t.ok(/Team 2 voll/.test(r.voll4[3]), 'die Kachel Team 2 zeigt die Sperre: ' + r.voll4[3]); t.eq(r.hostSchild, [1, 1], 'die Lobby nennt den Host von Team 1 "Host" und den ersten Spieler von Team 2 "Host 2"'); t.eq(r.erster, [false, true], 'der Pfeil nach oben tut beim ersten Spieler nichts');
      t.eq(r.coop.slice(0, 2), ['coop', false], 'im Coop gibt es kein Team 2 (Host)'); t.eq(r.coop[2], false, 'auch kein Zuschauer wird dorthin gestellt'); t.eq(r.coop[3], 0, 'Team 2 bleibt leer'); t.eq(r.coopMeldung, [1, 'Team 2 gibt es nur im Wettkampf.'], 'die Anfrage eines Spielers wird mit Meldung abgelehnt');
      t.eq(r.namen, ['Bo', 'Bo 2', 'Anna 2'], 'gleiche Namen in Team 2 werden unterschieden, auch gegen den Host'); t.eq(r.alsZuschauer, [['Bo'], ['Bo', 'Anna 2']], 'als Zuschauer behaelt er seinen Namen ohne die Nummer'); t.ok(r.alsSpieler.includes('Bo'), 'als Spieler auch: ' + r.alsSpieler);
      t.eq(r.fremd, [true, null], 'ein Bereit von einem anderen als Host B wird ignoriert, die Uebergabe gelingt trotzdem');
      t.eq(r.wartet, ['go', 'host', true, null, 2], 'fehlt nach go ein Mitspieler, wartet B in seinem Raum, bevor er sich mit A verbindet'); t.eq(r.zeit, [true, true, 2, null, null], 'nach dem Zeitlimit verbindet sich B mit denen, die da sind');
      t.ok(r.cd, 'der Countdown laeuft'); t.eq(r.bereit, ['play', 'play', 1, 3], 'verlaesst ein Spieler von Team 1 waehrend des Countdowns den Raum, bleibt der automatische Bereit-Zustand und das Spiel beginnt');
      t.eq(r.revanche, ['lobby', 'lobby', 0, 0], 'Revanche auch, wenn B zuerst bereit ist und A danach');
    },
  },
  {
    name: 'Raum ohne Modus: jeder waehlt selbst Spieler, Weitere Spieler oder Zuschauer (Kacheln), die Reihenfolge des Beitritts ist nur der Anfang; der Host stellt in der Teilnehmer-Liste jederzeit um, auch fuer Coop spielen, das mit Wartenden gesperrt ist',
    async run(t) {
      await SETUP(t);
      const r = await t.page.evaluate(`(() => { ${HELP}; const o = {}, G = CT.mkLobby(1, 0), A = G.A; A.setName('Anna'); G.run(.2);
        const ids = d => d.ui().tiles().map(q => q.id), st = () => [A.NET.roster.length, A.NET.t2.length, A.NET.specs.length], chk = (d, tag) => { const x = OV.check(d); if (x.length) o['ue ' + tag] = x; }, pid = nm => A.NET.roster.find(q => q.name === nm).id;
        const [Bo, Cy, Di] = ['Bo', 'Cy', 'Di'].map(n => R2.add(G, n)), Fi = R2.add(G, 'Fi'), Hu = R2.add(G, 'Hu');
        { const ctx = A.cv.getContext('2d'), f = ctx.fillText, seen = []; ctx.fillText = function (x) { seen.push(String(x)); return f.apply(this, arguments); }; A.draw(); ctx.fillText = f; o.hostSchild = [seen.filter(x => x === 'Host').length, seen.filter(x => x === 'Host 2').length]; }
        o.start = [st(), Bo.NET.team, Fi.NET.team, Hu.NET.team]; o.kacheln = [ids(Fi).filter(i => /^tm/.test(i)), ids(Fi).includes('role'), MT.tile(Fi, 'tm2').chosen, MT.tile(Bo, 'tm1').chosen, MT.tile(Fi, 'tm1').lock || ''];
        chk(Fi, 'Weitere Spieler'); chk(Bo, 'Spieler');
        MT.click(Bo, 'tm2'); G.run(1); o.bo = [Bo.NET.team, Bo.NET.myId >= 0, st(), Bo.NET.msg, MT.tile(Bo, 'tm2').chosen, A.NET.t2.map(c => c.nm).join()];
        MT.click(Fi, 'tm1'); G.run(1); o.fi = [Fi.NET.team, Fi.NET.myId > 0, st(), A.NET.roster.map(q => q.name).join()];
        o.voll = [MT.tile(Hu, 'tm1').lock || '']; Hu.NET.msg = ''; MT.click(Hu, 'tm1'); G.run(.3); o.klickStumm = Hu.NET.msg; Hu.NET.conn.send({ t: 'role', v: 1 }); G.run(.5); o.vollKlick = [Hu.NET.team, Hu.NET.msg];
        MT.click(Cy, 'tmS'); G.run(1); o.cy = [Cy.NET.spec, st(), MT.tile(Cy, 'tmS').chosen, ids(Cy).filter(i => /^tm/.test(i)).length, A.NET.spNames.join()]; chk(Cy, 'Zuschauer');
        MT.click(Cy, 'tm1'); G.run(1); o.cyZurueck = [Cy.NET.spec, Cy.NET.team, st(), Cy.NET.msg];
        MT.click(A, 'kick'); o.modal = ids(A).filter(s => /^k[12S]:/.test(s)).length; { const L = A.ui().tiles(), bad = []; for (const q of L) if (q.x < 0 || q.y < 0 || q.x + q.w > 960 || q.y + q.h > 544) bad.push('ausserhalb ' + q.id); for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) { const a = L[i], b = L[j]; if (a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h) bad.push(a.id + ' ueber ' + b.id); } if (bad.length) o['ue Teilnehmer-Liste'] = bad; }
        MT.click(A, 'k2:' + pid('Di')); G.run(.5); o.hostDi = [A.NET.roster.length, A.NET.t2.map(c => c.nm).join(), Di.NET.team];
        MT.click(A, 'k1:t' + A.NET.t2.find(c => c.nm === 'Hu').tk); G.run(.5); o.hostHu = [A.NET.roster.map(q => q.name).join(), A.NET.t2.map(c => c.nm).join(), Hu.NET.team];
        o.pfeil = ids(A).some(s => /^ku:/.test(s)); MT.k(A, 'Escape');
        o.coopLock = [MT.tile(A, 'mCoop').lock || '', A.setMode('coop'), A.NET.mode];
        for (const c of A.NET.t2.slice()) A.roleSet('t' + c.tk, 's'); G.run(.5);
        o.coopFrei = [MT.tile(A, 'mCoop').lock || '', A.setMode('coop'), A.NET.mode, st()]; G.run(.5); o.coopKacheln = [ids(Bo).includes('role'), ids(Bo).includes('tm2')];
        { const G2 = CT.mkLobby(1, 0), A2 = G2.A; A2.setName('Anna'); G2.run(.2); const js = ['W1', 'W2', 'W3', 'V1', 'V2', 'V3', 'V4'].map(n => R2.add(G2, n)), W = js[0], V = js[6];
          o.zweiVoll = [A2.NET.roster.length, A2.NET.t2.length, MT.tile(W, 'tm2').lock || '', MT.tile(V, 'tm2').lock || '', MT.tile(V, 'tm2').chosen]; W.NET.msg = ''; W.NET.conn.send({ t: 'role', v: 2 }); G2.run(.5); o.zweiVollMeldung = [W.NET.team, W.NET.msg];
          o.hostVoll = [A2.roleSet(1, 2), A2.roleSet('t' + A2.NET.t2[0].tk, 1)];
          MT.click(A2, 'kick'); o.modalVoll = [MT.tile(A2, 'k2:' + A2.NET.roster[1].id).lock || '', MT.tile(A2, 'k1:t' + A2.NET.t2[0].tk).lock || '']; { const ctx = A2.cv.getContext('2d'), f = ctx.fillText, seen = []; ctx.fillText = function (x) { seen.push(String(x)); return f.apply(this, arguments); }; A2.draw(); ctx.fillText = f; o.modalTexte = [seen.filter(x => x === 'Weitere Spieler').length, seen.filter(x => x === 'Spieler').length]; } MT.k(A2, 'Escape'); }
        return o; })()`);
      t.eq(r.hostSchild, [1, 0], 'ohne Modus steht nur beim Host "Host", die Spalte der weiteren Spieler hat noch keinen Host 2');
      t.eq(r.start, [[4, 2, 0], 1, 2, 2], 'Anfang nach Beitritt: vier Spieler, zwei weitere');
      t.eq(r.kacheln.slice(0, 2), [['tm1', 'tm2', 'tmS'], false], 'jeder hat die drei Wahl-Kacheln, noch ohne Modus'); t.eq(r.kacheln.slice(2, 4), [true, true], 'die eigene Spalte ist gewaehlt'); t.ok(/Spieler voll/.test(r.kacheln[4]), 'Spieler ist voll, die Kachel sagt es: ' + r.kacheln[4]);
      t.eq(r.bo.slice(0, 3), [2, false, [3, 3, 0]], 'ein Spieler waehlt Weitere Spieler und verliert seinen Platz'); t.ok(/weiteren Spielern/.test(r.bo[3]), 'Meldung: ' + r.bo[3]); t.eq(r.bo[4], true, 'die Kachel zeigt die Wahl'); t.eq(r.bo[5], 'Fi,Hu,Bo', 'er steht hinten in der Reihenfolge');
      t.eq(r.fi.slice(0, 3), [1, true, [4, 2, 0]], 'ein weiterer Spieler waehlt Spieler, der frei gewordene Platz ist seiner'); t.ok(/Fi/.test(r.fi[3]), 'mit seinem Namen: ' + r.fi[3]);
      t.ok(/Spieler voll/.test(r.voll[0]), 'bei vollen Spielerplaetzen ist die Kachel gesperrt'); t.eq(r.klickStumm, '', 'ein Klick auf die gesperrte Kachel tut nichts'); t.eq(r.vollKlick[0], 2, 'eine trotzdem gesendete Wahl aendert nichts'); t.ok(r.vollKlick[1], 'und bekommt eine Meldung: ' + r.vollKlick[1]);
      t.eq(r.cy.slice(0, 3), [true, [3, 2, 1], true], 'Zuschauer waehlen und die Kachel zeigt es'); t.eq(r.cy[3], 3, 'auch ein Zuschauer hat die drei Wahl-Kacheln'); t.eq(r.cy[4], 'Cy', 'Name');
      t.eq(r.cyZurueck.slice(0, 3), [false, 1, [4, 2, 0]], 'der Zuschauer wird wieder Spieler');
      t.eq(r.modal, 15, 'der Host hat in der Teilnehmer-Liste je Teilnehmer (fuenf) die drei Wahl-Kacheln'); t.eq([r.hostDi[0], r.hostDi[2]], [3, 2], 'der Host stellt Di zu den weiteren Spielern'); t.ok(/Di/.test(r.hostDi[1]), 'Di steht in der Liste: ' + r.hostDi[1]);
      t.eq(r.hostHu[2], 1, 'der Host stellt Hu zu den Spielern'); t.ok(/Hu/.test(r.hostHu[0]) && !/Hu/.test(r.hostHu[1]), 'Hu ist in der Spieler-Spalte');
      t.ok(r.pfeil, 'der Pfeil nach oben gilt auch ohne Modus (die Reihenfolge wird zu Team 2)');
      t.ok(r.coopLock[0], 'Coop spielen ist mit Wartenden gesperrt: ' + r.coopLock[0]); t.eq(r.coopLock.slice(1), [false, ''], 'und laesst sich nicht waehlen');
      t.eq(r.coopFrei[0], '', 'nach dem Umstellen ist Coop spielen frei'); t.eq(r.coopFrei.slice(1, 3), [true, 'coop'], 'und laesst sich waehlen'); t.eq(r.coopKacheln, [true, false], 'im Coop haben Spieler nur die Rollen-Kachel');
      t.eq(r.zweiVoll.slice(0, 2), [4, 4], 'vier Spieler und vier weitere'); t.eq(r.zweiVoll[2], 'Weitere Spieler voll', 'die Kachel Weitere Spieler ist fuer Spieler gesperrt'); t.eq(r.zweiVoll[3], '', 'fuer einen, der schon dort steht, nicht'); t.eq(r.zweiVoll[4], true, 'und gewaehlt');
      t.eq(r.zweiVollMeldung, [1, 'Die weiteren Spieler sind voll.'], 'eine Wahl bei vollen weiteren Spielern wird mit Meldung abgelehnt'); t.eq(r.hostVoll, [false, false], 'auch der Host kann dann nichts verschieben (beide Spalten voll)'); t.eq(r.modalVoll, ['Weitere Spieler voll', 'Spieler voll'], 'die Teilnehmer-Liste sperrt volle Spalten'); t.eq(r.modalTexte, [11, 10], 'die Teilnehmer-Liste nennt ohne Modus Spieler und Weitere Spieler (sieben Kacheln je Spalte plus die Ortsangabe der Zeilen)');
      for (const k of Object.keys(r)) if (/^ue /.test(k)) t.eq(r[k], [], 'Ueberlappung: ' + k);
    },
  },
];
