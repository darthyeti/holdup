// Coop-Ausbau W2 (docs/coop-ausbau.md, Spur W): Live-Vergleich und Wertung. Im Spiel schicken beide Hosts einmal je Sekunde dl pg (Beute gesichert, Welle, aktive Spieler, Zeit) und zeigen die Tafel "Gegner", am Ende jedes
// Auftrags dl res (Sieg, gescheitert oder Serie beendet, Ergebnis, Dauer). Gewertet wird: erst die gewonnenen Auftraege, dann die Beute der gewonnenen, dann die kuerzere Zeit der gewonnenen. Ein Team mit beendeter Serie ist
// ausgeschieden, das andere spielt allein weiter. Das Ergebnisbild bekommt eine Seite "Duell" (hinter Uebersicht und Auszeichnungen), im Shop wartet der Host mit Weiter auf den Gegner (Gleichtakt), nach dem letzten Auftrag
// steht der Sieger fest und der Host kann eine Revanche anbieten (beide zurueck in die Lobby, neue Serie). Verlaesst der Gegner das Spiel, wird abgebrochen.
const START = `(D, len) => { D.A.CFG.duel.len = len || 3; D.A.duelOpen(); D.run(.3); D.B.duelJoin(D.A.NET.code); D.run(1.5); D.A.duelReady(); D.B.duelReady(); D.run(9); }`;
const TEXTS = `(d) => { const c = d.cv.getContext('2d'), txt = [], ft = c.fillText; c.fillText = function (s) { txt.push(String(s)); return ft.apply(this, arguments); }; d.draw(); c.fillText = ft; return txt; }`;
// Ergebnis eines Auftrags melden: Beute setzen, beenden (win, soft oder verloren)
const ROUND = `(d, kind, sec) => { d.setSecured(sec); if (kind === 'win') d.finish(true, 'Sieg'); else if (kind === 'soft') d.finish(false, 'Gescheitert', '', true); else d.finish(false, 'Verloren'); }`;
// Enter, bis der Shop da ist (blaettert durch die Seiten), Mitspieler melden sich bereit
const TOSHOP = `(team, run) => { for (const d of team) { for (let i = 0; i < 5 && d.state().scr !== 'shop'; i++) MT.k(d, 'Enter'); } run(.5); for (const d of team.slice(1)) MT.click(d, 'next'); run(.6); }`;

module.exports = [
  {
    name: 'Fortschritt und Tafel: Beide Hosts senden einmal je Sekunde dl pg, jeder sieht den Fortschritt des Gegners (Beute gesichert, Welle, aktive Spieler, Zeit) in NET.du.pr bei Host, Mitspielern und Zuschauern, und zeichnet die Tafel GEGNER mit Namen, Beute, Welle, Spielern und Zeit; ohne Wettkampf keine Tafel',
    async run(t) {
      await t.loadTool('loopnet.js'); await t.loadInpage('coop.js'); await t.loadInpage('menu.js');
      const r = await t.page.evaluate(`(() => { const D = CT.mkDuel(2, 2), { A, B, pa, pb } = D, o = {}, start = ${START}, texts = ${TEXTS}; start(D);
        o.lauf = [A.NET.du.run, B.NET.du.run, A.NET.duel.k, B.NET.duel.k, A.state().scr, B.state().scr, A.NET.duel.mine.length];
        A.setSecured(4000); B.setSecured(9000); D.run(2.5);
        const pr = x => x && [x.l, x.w, x.a, x.n, x.p]; o.pr = [A, B, pa[1], pb[1]].map(d => pr(d.NET.du.pr));
        const S = CT.addSpec({ net: D.net, A, insts: D.insts }); D.run(2.5); o.spec = pr(S.NET.du && S.NET.du.pr);
        const tx = d => texts(d).filter(s => /^GEGNER|^Beute |^Welle |^Spieler |^Zeit /.test(s)); o.tafelA = tx(A); o.tafelB1 = tx(pb[1]);
        A.setSecured(12345); D.run(2.2); o.live = [B.NET.du.pr.l, tx(B).find(s => /^Beute /.test(s))];
        const G = CT.mkGame('bank', 321, 2, 40, 0); o.ohne = texts(G.A).filter(s => /^GEGNER/.test(s)); return o; })()`);
      t.eq(r.lauf, [1, 1, 1, 1, 'play', 'play', 0], 'beide Teams spielen den ersten Auftrag, noch kein Ergebnis');
      t.eq(r.pr, [[9000, 0, 2, 2, 1], [4000, 0, 2, 2, 1], [9000, 0, 2, 2, 1], [4000, 0, 2, 2, 1]], 'A sieht Berts 9000, B sieht 4000, auch ihre Mitspieler (Beute, Welle, aktive Spieler, Spielerzahl, Phase)'); t.eq(r.spec, [9000, 0, 2, 2, 1], 'ein Zuschauer sieht den Fortschritt des Teams, dem er zuschaut (hier die Anzeige von A: Berts Werte)');
      t.eq(r.tafelA[0], 'GEGNER Bert', 'Titel mit dem Namen des Gegners'); t.ok(r.tafelA.some(s => /^Beute \$ 9\.000/.test(s)) && r.tafelA.some(s => /^Welle 0/.test(s)) && r.tafelA.some(s => /^Spieler 2\/2/.test(s)) && r.tafelA.some(s => /^Zeit \d+:\d\d/.test(s)), 'Tafel von A zeigt Beute, Welle, Spieler, Zeit: ' + JSON.stringify(r.tafelA));
      t.ok(r.tafelB1[0] === 'GEGNER Anna', 'auch der Mitspieler von B sieht die Tafel: ' + JSON.stringify(r.tafelB1)); t.eq(r.live[0], 12345, 'der Wert folgt live (hier nach 2 s)'); t.ok(/12\.345/.test(r.live[1]), 'und steht auf der Tafel: ' + r.live[1]); t.eq(r.ohne, [], 'ohne Wettkampf gibt es keine Tafel');
    },
  },
  {
    name: 'Ergebnis und Wertung: dl res kommt beim Gegner an (Sieg, gescheitert, Serie beendet), jeder Host, Mitspieler und Zuschauer sieht Zwischenstand (gewonnene Auftraege, Beute, Zeit) und das Ergebnis des Gegners fuer denselben Auftrag; verlorene Serie heisst ausgeschieden',
    async run(t) {
      await t.loadTool('loopnet.js'); await t.loadInpage('coop.js'); await t.loadInpage('menu.js');
      const r = await t.page.evaluate(`(() => { const D = CT.mkDuel(2, 2), { A, B, pa, pb } = D, o = {}, start = ${START}, round = ${ROUND}; start(D);
        round(A, 'win', 30000); D.run(1); o.nurA = [A.NET.du.mn, A.NET.du.rn, A.NET.du.rr, B.NET.du.rn, B.NET.du.mr, !!B.NET.du.rr];
        round(B, 'win', 20000); D.run(1.5);
        const ra = A.NET.duel.mine[0], rb = B.NET.duel.mine[0]; o.res = [ra.i, ra.w, ra.s, ra.h, ra.sc > 30000, rb.sc > 20000, ra.sc > rb.sc, ra.du > 0, ra.n];
        o.gespiegelt = [JSON.stringify(A.NET.duel.rvr[0]) === JSON.stringify(rb), JSON.stringify(B.NET.duel.rvr[0]) === JSON.stringify(ra)];
        const v = (d, m, r) => { const x = d.NET.du; return [x.mw, x.rw, x.ml === m.sc, x.rl === r.sc, x.mn, x.rn, x.mo, x.ro, x.fin, x.mr && x.mr.sc, x.rr && x.rr.sc]; };
        o.stand = [v(A, ra, rb), v(B, rb, ra), v(pa[1], ra, rb), v(pb[1], rb, ra)]; o.sieger = [A.NET.du.mw > A.NET.du.rw || A.NET.du.ml > A.NET.du.rl, B.NET.du.ml < B.NET.du.rl];
        // gescheitert (Serie laeuft weiter) und verloren (ausgeschieden)
        const E = CT.mkDuel(2, 2), start2 = start; start2(E); round(E.A, 'win', 10000); round(E.B, 'soft', 5000); E.run(1.5);
        o.soft = [E.B.NET.duel.mine[0].s, E.B.NET.duel.mine[0].w, E.B.NET.duel.mine[0].h, E.B.NET.du.mo, E.A.NET.du.ro, E.A.NET.du.rn, E.A.NET.du.rw, E.B.NET.du.mw, E.B.NET.du.ml];
        const F = CT.mkDuel(2, 2); start(F); round(F.A, 'win', 10000); round(F.B, 'lose', 5000); F.run(1.5);
        o.verloren = [F.B.NET.duel.mine[0].h, F.B.NET.duel.out, F.B.NET.du.mo, F.A.NET.du.ro, F.A.NET.du.rn, F.A.NET.du.mw, F.A.NET.du.rw];
        // doppeltes und falsches res
        const L = F.B.NET.duel.link; F.B.NET.duel.hb = 9; L.send({ t: 'dl', k: 'res', i: 0, w: 1, s: 0, h: 0, sc: 9999999999, du: -5, n: 99 }); L.send({ t: 'dl', k: 'res', i: 9, w: 1, sc: 5 }); L.send({ t: 'dl', k: 'res', i: 'x' }); F.run(1);
        o.klemme = [F.A.NET.duel.rvr.length, F.A.NET.duel.rvr[0].sc <= 10000000, F.A.NET.duel.rvr[0].du >= 0, F.A.NET.duel.rvr[0].n <= 4]; return o; })()`);
      t.eq(r.nurA, [1, 0, null, 1, null, false], 'nur A fertig: A hat ein Ergebnis und noch keines vom Gegner, B sieht As Ergebnis, hat aber noch kein eigenes'); t.eq(r.res, [0, 1, 0, 0, true, true, true, true, 2], 'res von A: Auftrag 0, gewonnen, Beute mit Bonus, Dauer, zwei Spieler');
      t.eq(r.gespiegelt, [true, true], 'jeder Host hat die Ergebnisse des Gegners genau so, wie dieser sie sendet');
      t.eq(r.stand[0].slice(0, 9), [1, 1, true, true, 1, 1, 0, 0, ''], 'Stand bei A: beide einen Auftrag gewonnen, Beute je Team, noch nicht fertig');
      t.eq([r.stand[1].slice(0, 9), r.stand[2].slice(0, 9), r.stand[3].slice(0, 9)], [[1, 1, true, true, 1, 1, 0, 0, ''], [1, 1, true, true, 1, 1, 0, 0, ''], [1, 1, true, true, 1, 1, 0, 0, '']], 'Gast-Host und Mitspieler sehen denselben Stand aus ihrer Sicht (eigene Beute links)'); t.eq(r.stand[1][9] === r.stand[0][10] && r.stand[1][10] === r.stand[0][9], true, 'mr und rr sind vertauscht (mein letztes Ergebnis, das des Gegners fuer denselben Auftrag)');
      t.eq(r.soft, [1, 0, 0, 0, 0, 1, 0, 0, 0], 'gescheitert: Auftrag zaehlt als gespielt, nicht gewonnen, kein Ausscheiden, keine Beute in der Wertung'); t.eq(r.verloren, [1, 1, 1, 1, 1, 1, 0], 'Serie beendet: ausgeschieden (bei B und beim Gegner sichtbar)');
      t.eq(r.klemme, [1, true, true, true], 'ein zweites res fuer denselben Auftrag ersetzt das erste, falsche Nummern werden verworfen, Werte begrenzt');
    },
  },
  {
    name: 'Wertung: duelCmp ordnet nach gewonnenen Auftraegen, dann Beute, dann kuerzerer Zeit; gleich ist unentschieden; vertauscht kehrt sich um',
    async run(t) {
      await t.loadTool('loopnet.js'); await t.loadInpage('coop.js');
      const r = await t.page.evaluate(`(() => { const D = CT.mkDuel(2, 1), A = D.A, c = (a, b) => A.duelCmp({ w: a[0], l: a[1], t: a[2] }, { w: b[0], l: b[1], t: b[2] });
        return { siege: [c([2, 1, 99], [1, 9e9, 1]), c([1, 9e9, 1], [2, 1, 99])], beute: [c([2, 500, 99], [2, 400, 1]), c([2, 400, 1], [2, 500, 99])], zeit: [c([2, 500, 60], [2, 500, 90]), c([2, 500, 90], [2, 500, 60])], gleich: [c([2, 500, 60], [2, 500, 60]), c([0, 0, 0], [0, 0, 0])] }; })()`);
      t.eq(r.siege, ['m', 'r'], 'mehr gewonnene Auftraege gewinnen, egal wie die Beute ist'); t.eq(r.beute, ['m', 'r'], 'bei gleichen Siegen entscheidet die Beute'); t.eq(r.zeit, ['m', 'r'], 'bei gleicher Beute die kuerzere Zeit'); t.eq(r.gleich, ['d', 'd'], 'alles gleich: unentschieden');
    },
  },
  {
    name: 'Ergebnisseiten: Die Seite Duell steht hinter Uebersicht und Auszeichnungen (Enter und Pfeile blaettern, die Kachel nennt die naechste Seite), zeigt Runde, beide Ergebnisse, Zwischenstand und, solange der Gegner spielt, Gegner spielt noch; ohne Wettkampf bleiben die Seiten wie vorher',
    async run(t) {
      await t.loadTool('loopnet.js'); await t.loadInpage('coop.js'); await t.loadInpage('menu.js'); await t.loadInpage('overlap.js');
      const r = await t.page.evaluate(`(() => { const D = CT.mkDuel(2, 2), { A, B, pa } = D, o = {}, start = ${START}, round = ${ROUND}, texts = ${TEXTS}; start(D);
        round(A, 'win', 30000); D.run(1);
        // blaettern
        const titel = []; for (let i = 0; i < 5; i++) { titel.push(MT.tile(A, 'endNext').title); if (titel[i] === 'Weiter: Shop') break; MT.k(A, 'ArrowRight'); }
        o.titel = titel; o.duell = texts(A).filter(s => /DUELL|Runde|Gegner|Dein Team|Bert|Zwischenstand|Beute|Gewonnen/.test(s)); o.ueber = OV.check(A);
        o.zurueck = [MT.tile(A, 'endPrev') && MT.tile(A, 'endPrev').title];
        round(B, 'soft', 20000); D.run(1.5); o.beide = texts(A).filter(s => /Zwischenstand|Gegner spielt|\\$ /.test(s));
        for (let i = 0; i < 4 && MT.tile(B, 'endNext').title !== 'Weiter: Shop'; i++) MT.k(B, 'Enter'); o.beideB = texts(B).filter(s => /Zwischenstand|Gegner spielt/.test(s));
        // ohne Wettkampf: Seiten wie vorher
        const G = CT.mkGame('bank', 321, 2, 40, 0); G.A.setSecured(1000); G.A.finish(true, 'x'); G.run(1); o.ohne = [MT.tile(G.A, 'endNext').title, !!MT.tile(G.A, 'endPrev')]; return o; })()`);
      t.ok(r.titel.length >= 2 && r.titel[r.titel.length - 1] === 'Weiter: Shop', 'die letzte Seite fuehrt in den Shop: ' + JSON.stringify(r.titel)); t.ok(r.titel.includes('Duell'), 'eine Kachel kuendigt die Seite Duell an: ' + JSON.stringify(r.titel));
      t.ok(r.duell.includes('DUELL') && r.duell.some(s => /^Runde 1 von 3/.test(s)) && r.duell.includes('Dein Team') && r.duell.includes('Bert') && r.duell.some(s => /Gegner spielt noch/.test(s)), 'Seite Duell mit Runde, beiden Spalten und Hinweis: ' + JSON.stringify(r.duell));
      t.eq(r.ueber, [], 'keine Ueberdeckung auf der Seite Duell'); t.ok(r.zurueck[0], 'auf der letzten Seite gibt es die Kachel zurueck: ' + JSON.stringify(r.zurueck));
      t.ok(r.beide.some(s => /^Zwischenstand 1 : 0/.test(s)) && !r.beide.some(s => /Gegner spielt/.test(s)), 'mit dem Ergebnis des Gegners (gescheitert): Zwischenstand 1 : 0, eigene Siege zuerst: ' + JSON.stringify(r.beide)); t.ok(r.beideB.some(s => /^Zwischenstand 0 : 1/.test(s)), 'bei B umgekehrt: Zwischenstand 0 : 1: ' + JSON.stringify(r.beideB)); t.eq(r.ohne, ['Weiter: Shop', false], 'ohne Wettkampf bleibt es bei der einen Seite');
    },
  },
  {
    name: 'Shop im Gleichtakt: Weiter heisst Bereit fuer Auftrag N von M, der Host wartet auf den Gegner (Gegner spielt noch, Gegner kauft ein), sind beide bereit, zaehlen beide 5 s und starten den naechsten Auftrag der Liste gleichzeitig; ist der Gegner ausgeschieden oder fertig, geht es sofort',
    async run(t) {
      await t.loadTool('loopnet.js'); await t.loadInpage('coop.js'); await t.loadInpage('menu.js');
      const r = await t.page.evaluate(`(() => { const D = CT.mkDuel(2, 2), { A, B, pa, pb } = D, o = {}, start = ${START}, round = ${ROUND}, texts = ${TEXTS}, toShop = ${TOSHOP}; start(D);
        round(A, 'win', 30000); D.run(.8); toShop(D.pa, D.run); o.titelA = MT.tile(A, 'next').title; MT.click(A, 'next'); D.run(1);
        o.wartet = [A.NET.duel.rdy, A.NET.duel.cd < 0, A.state().scr, texts(A).filter(s => /Gegner spielt noch/.test(s)).length];
        round(B, 'win', 20000); D.run(.8); toShop(D.pb, D.run); o.kauft = [texts(A).filter(s => /Gegner kauft ein/.test(s)).length, texts(B).filter(s => /Gegner ist bereit/.test(s)).length];
        const t0 = D.net.now; MT.click(B, 'next'); let tA = null, tB = null; o.cd = []; for (let i = 0; i < 90; i++) { D.run(.1); if (A.NET.du.cd > 0 && o.cd[o.cd.length - 1] !== A.NET.du.cd) o.cd.push(A.NET.du.cd); if (tA == null && A.state().scr === 'play') tA = D.net.now - t0; if (tB == null && B.state().scr === 'play') tB = D.net.now - t0; }
        o.takt = [tA != null && tB != null && Math.abs(tA - tB) < 300, tA > 4000 && tA < 6500]; const J = A.NET.duel.jobs;
        o.zwei = [A.NET.duel.k, B.NET.duel.k, A.LAY().seed === J[1].sd, B.LAY().seed === J[1].sd, pa[1].LAY().seed === J[1].sd, pb[1].LAY().seed === J[1].sd, A.NET.duel.rdy, B.NET.duel.rdy, A.NET.duel.mine.length, A.NET.du.mw];
        // Gegner ausgeschieden: sofort
        const E = CT.mkDuel(2, 2); start(E); round(E.B, 'lose', 1000); round(E.A, 'win', 10000); E.run(1); toShop(E.pa, E.run); MT.click(E.A, 'next'); E.run(.4); o.frei = [E.A.state().scr, E.A.NET.duel.k, E.A.NET.duel.cd < 0, E.B.state().scr];
        // Ausgeschieden: kein Gleichtakt mehr (duelNext meldet false, das Weiter des Shops geht den normalen Weg)
        const G = CT.mkDuel(2, 2); start(G); round(G.A, 'lose', 1000); G.run(1); G.A.openShop(); o.ausNext = [G.A.state().scr, G.A.duelNext(), G.A.NET.duel.rdy];
        // go des Leiters: nur mit passender Nummer und nur, wenn der Gast selbst bereit ist
        const F = CT.mkDuel(2, 2); start(F); round(F.A, 'win', 10000); round(F.B, 'win', 10000); F.run(.8); toShop(F.pb, F.run); const inj = m => F.B.NET.duel.link.onmsg(m), kk = F.B.NET.duel.k;
        inj({ t: 'dl', k: 'go', i: kk, cd: 5 }); o.goUnbereit = F.B.NET.duel.cd; MT.click(F.B, 'next'); F.run(.2); inj({ t: 'dl', k: 'go', i: kk + 1, cd: 5 }); o.goFalsch = F.B.NET.duel.cd; inj({ t: 'dl', k: 'go', i: kk, cd: 5 }); o.goRichtig = F.B.NET.duel.cd;
        return o; })()`);
      t.eq(r.ausNext, ['shop', false, 0], 'wer ausgeschieden ist, wartet im Shop nicht auf den Gegner'); t.ok(r.goUnbereit < 0 && r.goFalsch < 0, 'ein go ohne eigene Bereitschaft oder mit falscher Nummer wird ignoriert: ' + JSON.stringify([r.goUnbereit, r.goFalsch])); t.eq(r.goRichtig, 5, 'ein go mit passender Nummer startet den Countdown des bereiten Gastes');
      t.eq(r.titelA, 'Bereit: Auftrag 2 von 3', 'der Host sieht, welcher Auftrag kommt'); t.eq(r.wartet, [1, true, 'shop', 1], 'A ist bereit, aber B spielt noch: kein Countdown, A bleibt im Shop und sieht Gegner spielt noch');
      t.eq(r.kauft, [1, 1], 'A sieht Gegner kauft ein (B ist fertig, aber noch nicht bereit), B sieht Gegner ist bereit'); t.eq(r.takt, [true, true], 'beide starten im selben Takt nach etwa 5 s'); t.ok(r.cd.length >= 4 && r.cd[0] <= 5, 'der Countdown zaehlt runter: ' + JSON.stringify(r.cd));
      t.eq(r.zwei, [2, 2, true, true, true, true, 0, 0, 1, 1], 'beide am zweiten Auftrag der Liste (auch die Mitspieler), Bereit zurueckgesetzt, das Ergebnis der ersten Runde bleibt gezaehlt');
      t.eq(r.frei, ['play', 2, true, 'play'], 'ist der Gegner ausgeschieden, startet der naechste Auftrag sofort ohne Countdown (der Ausgeschiedene bleibt auf seinem Ergebnisbild, die Seite ist weiter im Spiel-Zustand)');
    },
  },
  {
    name: 'Ausscheiden und Abschluss: Ein Team mit verlorener Serie ist draussen und wartet auf dem Ergebnisbild (Ausgeschieden), das andere spielt allein weiter; nach dem letzten Auftrag beider steht der Sieger auf der Seite Duell (SIEGER: Dein Team oder Name, UNENTSCHIEDEN), der Host bekommt die Kachel Revanche',
    async run(t) {
      await t.loadTool('loopnet.js'); await t.loadInpage('coop.js'); await t.loadInpage('menu.js');
      const r = await t.page.evaluate(`(() => { const D = CT.mkDuel(2, 2), { A, B, pa, pb } = D, o = {}, start = ${START}, round = ${ROUND}, texts = ${TEXTS}, toShop = ${TOSHOP}; start(D, 2);
        const last = (d) => { for (let i = 0; i < 4 && MT.tile(d, 'endNext') && !/^Weiter|^Revanche|^Ausgeschieden|^Warte|^Zurück|^Der Host/.test(MT.tile(d, 'endNext').title); i++) MT.k(d, 'Enter'); return MT.tile(d, 'endNext').title; };
        round(B, 'lose', 2000); D.run(.8); o.bTitel = last(B); round(A, 'win', 30000); D.run(1); o.aTitel = last(A);
        o.aus = [B.NET.du.mo, A.NET.du.ro, B.NET.du.fin, A.NET.du.fin]; toShop(D.pa, D.run); MT.click(A, 'next'); D.run(.4); o.allein = [A.state().scr, A.NET.duel.k, B.state().scr];
        round(A, 'win', 25000); D.run(1.5);
        o.fin = [A.NET.du.fin, B.NET.du.fin, pa[1].NET.du.fin, pb[1].NET.du.fin, A.NET.du.mn, A.NET.du.rn, A.NET.du.mw, A.NET.du.rw];
        const txtA = (() => { last(A); MT.k(A, 'ArrowRight'); return texts(A); })(); o.sieger = txtA.filter(s => /SIEGER|UNENTSCHIEDEN|ABGEBROCHEN/.test(s)); o.titel = [last(A), last(B), last(pa[1])];
        const txtB = texts(B); o.siegerB = txtB.filter(s => /SIEGER|UNENTSCHIEDEN/.test(s)); return o; })()`);
      t.ok(/Ausgeschieden/.test(r.bTitel), 'das ausgeschiedene Team wartet: ' + r.bTitel); t.eq(r.aus, [1, 1, '', ''], 'B ist ausgeschieden (beide sehen es), noch nicht fertig, weil A weiterspielt');
      t.eq(r.allein, ['play', 2, 'play'], 'A spielt den naechsten Auftrag allein (sofort), B bleibt auf dem Ergebnisbild (Zustand der Seite ist weiter play)'); t.eq(r.fin, ['m', 'r', 'm', 'r', 2, 1, 2, 0], 'nach dem letzten Auftrag: A hat gewonnen (bei A m, bei B r, bei den Mitspielern ebenso)');
      t.eq(r.sieger, ['SIEGER: Dein Team'], 'die Seite Duell bei A: SIEGER: Dein Team'); t.eq(r.siegerB, ['SIEGER: Anna'], 'bei B: SIEGER: Anna (der Name des anderen Hosts)'); t.eq([r.titel[0], r.titel[1]], ['Revanche', 'Revanche'], 'beide Hosts haben die Kachel Revanche'); t.ok(/Host|Warte/.test(r.titel[2]), 'der Mitspieler wartet auf den Host: ' + r.titel[2]);
    },
  },
  {
    name: 'Revanche: Bieten beide Hosts die Revanche an, gehen beide Teams zurueck in die Lobby (neue Serie, Ergebnisse und Auftragsliste weg, Wettkampf bleibt verbunden), dort laeuft Bereit wie vorher; ein Host allein startet nichts',
    async run(t) {
      await t.loadTool('loopnet.js'); await t.loadInpage('coop.js'); await t.loadInpage('menu.js');
      const r = await t.page.evaluate(`(() => { const D = CT.mkDuel(2, 2), { A, B, pa, pb } = D, o = {}, start = ${START}, round = ${ROUND}; start(D, 1);
        D.sA.wallet = 777; D.sB.wallet = 555; const last = d => { for (let i = 0; i < 4 && !/^Revanche|^Warte/.test(MT.tile(d, 'endNext').title); i++) MT.k(d, 'Enter'); return MT.tile(d, 'endNext').title; };
        round(A, 'win', 30000); D.run(1); o.alleinFertig = [A.NET.du.fin, B.NET.du.fin, last(A)]; round(B, 'win', 10000); D.run(1.5);
        o.titel = [last(A), last(B)]; MT.click(A, 'endNext'); D.run(1); o.eineSeite = [A.NET.duel.rdy, A.NET.du.my, B.NET.du.rdy, A.state().scr, B.state().scr, MT.tile(A, 'endNext').title];
        MT.click(A, 'endNext'); D.run(.6); o.zurueck = [A.NET.duel.rdy, A.state().scr]; MT.click(A, 'endNext'); MT.click(B, 'endNext'); D.run(1.5);
        o.lobby = [A.state().scr, B.state().scr, pa[1].state().scr, pb[1].state().scr, !!A.NET.duel.link, !!B.NET.duel.link, A.NET.duel.k, A.NET.duel.mine.length, A.NET.duel.rvr.length, A.NET.duel.jobs.length, A.NET.du.run, A.NET.du.mw, A.NET.duel.out];
        o.serie = [D.sA.wallet, D.sB.wallet, D.sA.round, D.sB.round]; o.start = [MT.tile(A, 'start').title, MT.tile(B, 'start').title];
        A.duelReady(); B.duelReady(); D.run(9); o.neu = [A.state().scr, B.state().scr, A.NET.duel.k, B.NET.duel.k, A.NET.du.run, A.NET.duel.mine.length];
        // ohne Mitspieler (sie teilen im Test die Serie ihres Teams und setzen sie mit lb selbst zurueck): der Host setzt seine Serie selbst zurueck
        const E = CT.mkDuel(1, 1); start(E, 1); E.sA.wallet = 777; E.sB.wallet = 555; round(E.A, 'win', 30000); round(E.B, 'win', 10000); E.run(1.5); last(E.A); last(E.B);
        o.vorher = [E.sA.wallet > 777, E.sA.round, E.sB.round]; MT.click(E.A, 'endNext'); MT.click(E.B, 'endNext'); E.run(1.5); o.solo = [E.A.state().scr, E.sA.wallet, E.sB.wallet, E.sA.round, E.sB.round]; return o; })()`);
      t.eq(r.alleinFertig[0] + r.alleinFertig[1], '', 'solange der Gegner noch spielt, steht kein Ergebnis fest'); t.ok(/^Warte auf Gegner/.test(r.alleinFertig[2]), 'A wartet auf den Gegner: ' + r.alleinFertig[2]);
      t.eq(r.titel, ['Revanche', 'Revanche'], 'beide Hosts bieten Revanche an'); t.eq(r.eineSeite, [1, 1, 1, 'play', 'play', 'Revanche zurücknehmen'], 'ein Host allein: bereit, sonst passiert nichts, die Kachel erlaubt das Zuruecknehmen');
      t.eq(r.zurueck, [0, 'play'], 'zurueckgenommen'); t.eq(r.lobby, ['lobby', 'lobby', 'lobby', 'lobby', true, true, 0, 0, 0, 0, 0, 0, 0], 'beide Teams (auch die Mitspieler) in der Lobby, Leitung bleibt, Ergebnisse, Liste und Zaehler zurueckgesetzt');
      t.eq(r.serie, [0, 0, 0, 0], 'neue Serie fuer beide Teams (Konto und Runde zurueck)'); t.eq(r.vorher, [true, 1, 1], 'vor der Revanche hat jedes Team Konto und Runde'); t.eq(r.solo, ['lobby', 0, 0, 0, 0], 'auch der Host allein setzt seine Serie zurueck'); t.eq(r.start, ['Bereit', 'Bereit'], 'in der Lobby heisst die Kachel wieder Bereit'); t.eq(r.neu, ['play', 'play', 1, 1, 1, 0], 'die Revanche beginnt mit einem neuen Wettkampf');
    },
  },
  {
    name: 'Gegner geht im Spiel: Bricht die Leitung ab, merken es beide (NET.du.gone), der Wettkampf laeuft fuer das andere Team ohne Warten weiter und endet mit WETTKAMPF ABGEBROCHEN (kein Sieger); der Host kommt mit Zurueck in die Lobby heraus',
    async run(t) {
      await t.loadTool('loopnet.js'); await t.loadInpage('coop.js'); await t.loadInpage('menu.js');
      const r = await t.page.evaluate(`(() => { const D = CT.mkDuel(2, 2), { A, B, pa, pb } = D, o = {}, start = ${START}, round = ${ROUND}, texts = ${TEXTS}, toShop = ${TOSHOP}; start(D, 2);
        B.leaveGame(); D.run(1.5); o.weg = [A.NET.du.gone, A.NET.du.run, !!A.NET.duel, A.NET.duel.link === null, A.state().scr, pa[1].NET.du.gone, /Gegner/.test(A.NET.msg)];
        round(A, 'win', 30000); D.run(1); toShop(D.pa, D.run); MT.click(A, 'next'); D.run(.4); o.weiter = [A.state().scr, A.NET.duel.k];
        round(A, 'win', 20000); D.run(1); for (let i = 0; i < 4 && !/Lobby/.test(MT.tile(A, 'endNext').title); i++) MT.k(A, 'Enter');
        o.fin = [A.NET.du.fin, MT.tile(A, 'endNext').title]; const tx = texts(A).filter(s => /ABGEBROCHEN|SIEGER/.test(s)); o.text = tx;
        MT.click(A, 'endNext'); D.run(1); o.lobby = [A.state().scr, pa[1].state().scr, A.NET.duel && A.NET.duel.lead, A.NET.duel && !A.NET.duel.link, A.NET.duel && A.NET.duel.mine.length]; return o; })()`);
      t.eq(r.weg, [1, 1, true, true, 'play', 1, true], 'beide merken es, die Daten bleiben, das Spiel laeuft weiter'); t.eq(r.weiter, ['play', 2], 'ohne Gegner geht es nach dem Shop sofort weiter');
      t.eq(r.fin, ['x', 'Zurück in die Lobby'], 'am Ende abgebrochen, der Host kann in die Lobby'); t.eq(r.text, ['WETTKAMPF ABGEBROCHEN'], 'die Seite Duell sagt es'); t.eq(r.lobby, ['lobby', 'lobby', true, true, 0], 'der Leiter bleibt offen und wartet auf einen neuen Gegner, Ergebnisse weg');
    },
  },
];
