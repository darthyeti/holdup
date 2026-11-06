// Coop-Ausbau Spur N, Schritte N1a und N1b (docs/coop-ausbau.md, Plan v1 fuer den Rest von #11; Issue #11).
// N1a (Host): Reisst die Verbindung eines Spielers ausserhalb der Lobby ab, wird er abwesend (o.away, NET.aw, Frist CFG.net.grace im Auftrag, CFG.net.graceMenu sonst) statt sofort zu gehen: Figur steht, ist unverwundbar,
// kann nichts tun, die Runde kippt nicht durch ihn (checkEnd zaehlt live), Rueckkehr ueber die Marke tok mit demselben Platz, ab dem dritten Abriss je Runde entfaellt der Schutz, Start mit "trotzdem los".
// N1b (Client): connLost fuehrt in rejoin(Frist) statt auf den Titel, Overlay, Eingaben eingefroren, Esc gibt auf, Zuschauer kommen zurueck, die Zweitverbindung im Duell versucht es neu.
const SETUP = async t => { await t.loadTool('loopnet.js'); await t.loadInpage('coop.js'); await t.loadInpage('menu.js'); await t.loadInpage('overlap.js');
  /* Weltvergleich ohne die wandernden Gefaengnis-Gegenstaende (Schluesselkarte crd, Pistole pist): der Host bewegt sie, der Client sieht sie auch ohne Abriss erst spaeter, kein Thema von N1 */
  await t.page.evaluate("window.WD = (a, b) => CT.diff(CT.sig(a), CT.sig(b)).filter(x => !/ (crd|pist):/.test(x))"); };
const TEXTS = `(d) => { const c = d.cv.getContext('2d'), txt = [], ft = c.fillText; c.fillText = function (s) { txt.push(String(s)); return ft.apply(this, arguments); }; d.draw(); c.fillText = ft; return txt; }`;
const NETEV = `(d) => d.flog().dump().ereignisse.filter(e => e[2] === 'netz').map(e => JSON.stringify(e[3]))`;
// Spiel mit n Spielern im Ueberfall (Phase 2), keine Polizei von selbst
const MK = `(n, sc, seed) => { const G = CT.mkGame(sc || 'bank', seed || 321, n), A = G.A; A.CFG.policeAt = 1e6; A.CFG.policeForced = 1e6; A.CFG.vanAuto = 1e6; A.startHeist(false, A.get().players[0]); for (const q of A.get().players) q.inv = 1e6; G.run(3); return G; }`;  // alle unverwundbar (die Bank-Wache toetet sonst stehende Figuren), die Tests zur Verwundbarkeit setzen inv selbst auf 0
// Kennzahlen der Figur (muss vor dem Abriss und nach der Rueckkehr gleich sein)
const FIG = `(d, i) => { const q = d.get().players[i]; return [Math.round(q.x), Math.round(q.y), Math.ceil(q.hp), Math.ceil(q.ar), q.mag, q.res, q.loot, q.units, q.mat | 0, q.armed ? 1 : 0, q.c4 | 0, q.trap | 0, q.dc | 0].join(','); }`;

/* Wettkampf-Raum-Aufbau aus 146 (R2.mk, R2.fin) */
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

// Abriss, der die Rueckkehr blockiert (harter Abriss plus stiller Abriss, der Beitritte scheitern laesst), bis net.heal(name)
const DOWN = `(G, n) => { G.net.cut(n); G.net.cut(n, { silent: true, closeAfter: 99999 }); }`;

module.exports = [
  {
    name: 'N1a Abwesenheit im Auftrag: harter Abriss von B macht die Figur abwesend (nicht gone), Roster-Eintrag bleibt mit aw, Flag 128 beim dritten Spieler, Anzeige "Verbindung weg (N s)" bei Host und Mitspieler, B steht in der Rueckkehr (Overlay, Eingaben eingefroren), keine Aktion, kein Schaden, Gegner zielen nicht auf sie',
    async run(t) {
      await SETUP(t);
      const r = await t.page.evaluate(`(() => { const o = {}, G = (${MK})(3), [A, B, C] = G.insts, txt = ${TEXTS};
        A.get().players[1].inv = 0; const f0 = (${FIG})(A, 1); (${DOWN})(G, 'c1'); G.run(.6); const pa = A.get().players[1];
        o.away = [!!pa.away, pa.gone, pa.awN, A.NET.conns.length + 1, Object.keys(A.NET.aw).join(','), A.NET.roster.some(r => r.id === 1)];
        o.rest = Math.round(A.NET.aw[1].t); o.frist = A.CFG.net.grace;
        G.run(.5); o.flag = [C.get().players[1].away, B.get().players[1].away];
        o.noteA = txt(A).filter(s => /Verbindung weg/.test(s)); o.noteC = txt(C).filter(s => /Verbindung weg/.test(s));
        o.bRj = [!!B.NET.rj, B.state().scr, txt(B).some(s => /Verbindung weg, versuche es neu/.test(s)), txt(B).some(s => /Esc: Aufgeben/.test(s))];
        o.prot = [A.prot(pa), A.actv().some(q => q.id === 1), A.actv().length]; const hp0 = pa.hp; A.hitPlayer(pa, 40); o.hp = [hp0, pa.hp];
        /* Gegner: eine Welle direkt neben die abwesende Figur, A und C weit weg */
        const pb = A.get().players[1]; A.spawnWave(); const en = A.get().en; for (const e of en) { e.x = pb.x + 40; e.y = pb.y; } G.run(.2);
        const tgts = A.get().en.filter(e => e.tg === 1 || e.tgt === 1).length; G.run(6); o.hp2 = Math.ceil(A.get().players[1].hp); o.stand = (${FIG})(A, 1).split(',').slice(0, 2).join(',') === f0.split(',').slice(0, 2).join(',');
        return o; })()`);
      t.eq(r.away.slice(0, 3), [true, false, 1], 'B ist abwesend, nicht gone, erster Abriss'); t.eq(r.away[3], 2, 'B ist aus NET.conns'); t.eq(r.away[4], '1', 'NET.aw kennt Platz 1'); t.ok(r.away[5], 'Roster-Eintrag bleibt');
      t.ok(r.rest > 50 && r.rest <= r.frist, 'Rest der Frist ' + r.rest + ' von ' + r.frist); t.eq(r.frist, 60, 'CFG.net.grace 60 s');
      t.eq(r.flag.map(x => !!x), [true, false], 'Flag 128: C sieht B abwesend, B selbst nicht');
      t.ok(r.noteA.length > 0 && r.noteC.length > 0, 'Anzeige bei Host und Mitspieler: ' + JSON.stringify([r.noteA, r.noteC]));
      t.eq(r.bRj, [true, 'play', true, true], 'B: Rueckkehr (NET.rj), bleibt im Spiel, Overlay mit Esc-Hinweis');
      t.eq(r.prot, [true, false, 2], 'geschuetzt und nicht in actv() (kein Ziel, kein Handelnder)'); t.eq(r.hp, [100, 100], 'Schaden 0 (hitPlayer ohne Wirkung)'); t.eq(r.hp2, 100, 'Gegner neben B treffen sie nicht'); t.ok(r.stand, 'die Figur steht');
    },
  },
  {
    name: 'N1a Rueckkehr in der Frist: gleicher Platz, gleiche Marke, die Figur ist nach der Rueckkehr unveraendert (Ort, HP, Munition, Beute, Material, Gegenstaende), go mit rl 2, kein Rubberbanding, Welt gleich dem Host, Spiel laeuft weiter',
    async run(t) {
      await SETUP(t);
      const r = await t.page.evaluate(`(() => { const o = {}, G = (${MK})(2), [A, B] = G.insts, fig = ${FIG}; const q = A.get().players[1]; q.loot = 1234; q.units = 2; q.mat = 1; q.hp = 71; q.res = 40; B.get().players[1].loot = 1234; G.run(1);
        const f0 = fig(A, 1), tok0 = B.NET.tok; (${DOWN})(G, 'c1'); G.run(8); o.waehrend = [!!A.get().players[1].away, !!B.NET.rj];
        G.net.heal('c1'); G.run(5); o.nach = [!!A.get().players[1].away, B.NET.rj, B.state().scr, B.NET.myId, B.NET.tok === tok0, A.NET.conns.length + 1, Object.keys(A.NET.aw).length];
        G.run(1); o.fig = [f0, fig(A, 1)]; o.figB = fig(B, 1); o.sig = WD(A, B); o.seq = B.NET.myId;
        /* nach der Rueckkehr bewegt B seine Figur ohne Ruecksprung: Taste d eine Sekunde, Differenz zwischen Client- und Host-Ort klein */
        B.cv.dispatchEvent(new KeyboardEvent('keydown', { key: 'd', bubbles: true })); G.run(1); B.cv.dispatchEvent(new KeyboardEvent('keyup', { key: 'd', bubbles: true })); G.run(.5);
        const pa = A.get().players[1], pb = B.get().players[1]; o.drift = Math.hypot(pa.x - pb.x, pa.y - pb.y); o.moved = Math.round(pa.x - Number(f0.split(',')[0])); o.ack = [pa.ack > 0, pa.ack <= B.get().players.length * 1e6];
        o.ev = NEV(A).filter(s => /abwesend|rj ok/.test(s)); o.evB = NEV(B).filter(s => /rj/.test(s)); o.alive = [!A.get().ended, !B.get().ended];
        return o; function NEV(d) { return (${NETEV})(d); } })()`);
      t.eq(r.waehrend, [true, true], 'waehrend des Abrisses: B abwesend, B in der Rueckkehr');
      t.eq(r.nach.slice(0, 2), [false, null], 'nach der Rueckkehr: nicht mehr abwesend, rj beendet'); t.eq(r.nach.slice(2, 5), ['play', 1, true], 'B im Spiel, Platz 1, Marke unveraendert'); t.eq(r.nach.slice(5), [2, 0], 'A: zwei Verbindungen, NET.aw leer');
      t.eq(r.fig[0], r.fig[1], 'Figur auf dem Host vor Abriss und nach Rueckkehr gleich: ' + r.fig.join(' | '));
      t.eq(r.figB.split(',').slice(2).join(','), r.fig[1].split(',').slice(2).join(','), 'die Figur auf B gleicht der auf dem Host (HP, Munition, Beute, Material): ' + r.figB + ' | ' + r.fig[1]);
      t.eq(r.sig, [], 'Welt von A und B gleich: ' + JSON.stringify(r.sig)); t.ok(r.drift < 4, 'kein Rubberbanding, Abstand Client/Host ' + r.drift); t.ok(r.moved > 20, 'B bewegt sich nach der Rueckkehr (' + r.moved + ' px)'); t.ok(r.ack[0], 'die Eingaben kommen an (ack > 0)');
      t.ok(r.ev.some(s => /abwesend/.test(s)) && r.ev.some(s => /rj ok/.test(s)), 'Flugschreiber Host: abwesend und rj ok: ' + r.ev.join(' | ')); t.ok(r.evB.some(s => /rj start/.test(s)) && r.evB.some(s => /rj ok/.test(s)), 'Flugschreiber Client: ' + r.evB.join(' | ')); t.eq(r.alive, [true, true], 'die Runde laeuft');
    },
  },
  {
    name: 'N1a stiller Abriss: net.cut still und heal vor closeAfter (30 s) macht niemanden abwesend, schliesst die Leitung nach closeAfter, wird B abwesend und kommt nach heal in der Frist zurueck',
    async run(t) {
      await SETUP(t);
      const r = await t.page.evaluate(`(() => { const o = {}, G = (${MK})(2), [A, B] = G.insts;
        G.net.cut('c1', { silent: true, closeAfter: 30 }); G.run(8); o.still = [!!A.get().players[1].away, A.NET.conns.length + 1, !!B.NET.rj]; G.net.heal('c1'); G.run(40); o.heal = [!!A.get().players[1].away, A.NET.conns.length + 1, !!B.NET.rj, B.state().scr];
        G.net.cut('c1', { silent: true, closeAfter: 5 }); G.run(8); o.zu = [!!A.get().players[1].away, !!B.NET.rj, B.state().scr, A.NET.aw[1] && Math.round(A.NET.aw[1].t)]; G.run(20); o.blockiert = [!!A.get().players[1].away, !!B.NET.rj];
        G.net.heal('c1'); G.run(8); o.zurueck = [!!A.get().players[1].away, B.NET.rj, B.state().scr, A.NET.conns.length + 1, A.get().players[1].gone];
        return o; })()`);
      t.eq(r.still, [false, 2, false], 'still, vor closeAfter und vor CFG.net.dead (8 s): keine Abwesenheit, keine Rueckkehr'); t.eq(r.heal, [false, 2, false, 'play'], 'nach heal bleibt alles offen');
      t.eq(r.zu.slice(0, 3), [true, true, 'play'], 'nach closeAfter: B abwesend, in der Rueckkehr'); t.ok(r.zu[3] > 40, 'Rest der Frist laeuft: ' + r.zu[3]);
      t.eq(r.blockiert, [true, true], 'solange die Leitung weg ist, bleibt es so'); t.eq(r.zurueck, [false, null, 'play', 2, false], 'nach heal: B ist zurueck');
    },
  },
  {
    name: 'N1a Frist abgelaufen: nach CFG.net.grace wird B gone (Meldung wie bisher, dc), eine spaete Rueckkehr bekommt rej "Dieser Platz ist nicht mehr frei" und steht auf dem Titel; eine falsche Marke bekommt nie einen Platz',
    async run(t) {
      await SETUP(t);
      const r = await t.page.evaluate(`(() => { const o = {}, G = (${MK})(3), [A, B, C] = G.insts, ev = ${NETEV};
        (${DOWN})(G, 'c1'); G.run(1); B.rejoin(500); G.run(50); o.vor = [!!A.get().players[1].away, A.get().players[1].gone, Math.round(A.NET.aw[1].t)];
        G.run(12); const pa = A.get().players[1]; o.nach = [pa.gone, !!pa.away, Object.keys(A.NET.aw).length, A.get().feed ? 1 : 1, A.get().ended ? 1 : 0, B.state().scr];
        G.net.heal('c1'); G.run(5); o.spaet = [B.state().scr, B.NET.rj, A.NET.conns.length + 1, A.get().players[1].gone, B.state().note || ''];
        o.titel = B.state().titleNote || ''; o.evA = ev(A).filter(s => /abwesend|rj/.test(s));
        return o; })()`);
      t.eq(r.vor.slice(0, 2), [true, false], 'bis zum Ende der Frist abwesend'); t.ok(r.vor[2] <= 12 && r.vor[2] > 0, 'Rest ' + r.vor[2]);
      t.eq(r.nach.slice(0, 5), [true, false, 0, 1, 0], 'nach der Frist: gone, nicht mehr abwesend, NET.aw leer, die Runde laeuft (A und C leben)'); t.eq(r.nach[5], 'play', 'B wartet noch (sein Client hat 500 s)');
      t.eq(r.spaet.slice(0, 2), ['title', null], 'spaete Rueckkehr: rej, B steht auf dem Titel'); t.eq(r.spaet[2], 2, 'kein Platz fuer B (A und C)'); t.ok(r.spaet[3], 'B bleibt gone');
    },
  },
  {
    name: 'N1a die Runde kippt nicht durch Abwesende: Sind alle anderen tot und B abwesend, laeuft die Runde bis zum Ende der Frist, erst dann gescheitert; kehrt B vorher zurueck, spielt er weiter',
    async run(t) {
      await SETUP(t);
      const r = await t.page.evaluate(`(() => { const o = {}, G = (${MK})(2), [A, B] = G.insts;
        (${DOWN})(G, 'c1'); G.run(.5); const p0 = A.get().players[0]; p0.hp = 0; G.run(1); o.tot = [A.get().players[0].dead, A.get().players[0].dn > 0, !!A.get().ended];
        A.get().players[0].dn = 0; A.get().players[0].dead = true; G.run(30); o.mitte = [!!A.get().ended, !!A.get().players[1].away];
        G.run(40); const e = A.get().ended; o.ende = [!!e, e && e.win, A.get().players[1].gone];
        return o; })()`);
      t.eq(r.mitte, [false, true], 'nach 30 s: kein Ende, B noch abwesend'); t.eq(r.ende[0], true, 'nach der Frist endet die Runde'); t.ok(!r.ende[1], 'gescheitert'); t.ok(r.ende[2], 'B gone');
    },
  },
  {
    name: 'N1a Schutz entfaellt ab dem dritten Abriss je Runde (CFG.net.protN 2): erster und zweiter Abriss schuetzen die Figur, der dritte nicht',
    async run(t) {
      await SETUP(t);
      const r = await t.page.evaluate(`(() => { const o = {}, G = (${MK})(3), [A, B, C] = G.insts; o.n = [];
        for (let i = 0; i < 3; i++) { (${DOWN})(G, 'c1'); G.run(5); const p = A.get().players[1]; p.inv = 0; p.hp = 100; p.ar = 0; A.hitPlayer(p, 30); o.n.push([p.awN, !!p.away, A.prot(p), Math.ceil(p.hp), A.actv().some(q => q.id === 1)]); G.run(1); o.flag = (o.flag || []).concat([!!C.get().players[1].away]); G.net.heal('c1'); G.run(6); }
        o.nach = [!!A.get().players[1].away, B.NET.rj, A.get().players[1].awN];
        return o; })()`);
      t.eq(r.n, [[1, true, true, 100, false], [2, true, true, 100, false], [3, true, false, 70, true]], 'Abriss 1 und 2 geschuetzt, 3 verwundbar');
      t.eq(r.flag, [true, true, false], 'Flag 128 (Anzeige bei Mitspielern) nur solange B geschuetzt ist: Abriss 1 und 2 ja, Abriss 3 nein'); t.eq(r.nach, [false, null, 3], 'jedes Mal kehrt B zurueck');
    },
  },
  {
    name: 'N1a Wagen faehrt ab, waehrend B weg ist: B bleibt zurueck (gone), der Auftrag endet fuer die anderen wie bisher',
    async run(t) {
      await SETUP(t);
      const r = await t.page.evaluate(`(() => { const o = {}, G = (${MK})(2), [A, B] = G.insts; A.CFG.vanStay = 4;
        A.callVan(); (${DOWN})(G, 'c1'); G.run(2); o.weg = !!A.get().players[1].away;
        for (let i = 0; i < 120 && !A.get().vanArr; i++) G.run(1); o.da = A.get().vanArr; G.run(8);
        const p = A.get().players; o.nach = [p[1].gone, p[0].gone || p[0].out, !!A.get().ended, !!p[1].away];
        return o; })()`);
      t.ok(r.weg, 'B ist abwesend'); t.ok(r.da, 'der Wagen ist da'); t.eq(r.nach.slice(0, 2), [true, true], 'wer nicht an Bord ist, bleibt zurueck (auch der Abwesende), A ist an Bord oder gone'); t.ok(r.nach[2], 'der Auftrag ist zu Ende'); t.ok(!r.nach[3], 'kein Abwesender mehr');
    },
  },
  {
    name: 'N1a Shop und Ergebnis: Abriss im Ergebnis: Eintrag bleibt, Frist 300 s (graceMenu); Rueckkehr im Ergebnis zeigt das Ergebnis einmal, Rueckkehr im Shop behaelt Kit und SESSION; "trotzdem los": der Abwesende bekommt seine geschuetzte Figur, Rest der Frist laeuft weiter, Rueckkehr im neuen Auftrag per go',
    async run(t) {
      await SETUP(t);
      const r = await t.page.evaluate(`(() => { const o = {}, G = (${MK})(3), [A, B, C] = G.insts, txt = ${TEXTS}; A.setSecured(5000);
        A.finish(true, 'Sieg'); G.run(1.5); o.ende = [!!A.get().ended, !!B.get().ended, !!C.get().ended];
        (${DOWN})(G, 'c1'); G.run(2); o.frist = [Math.round(A.NET.aw[1].t), A.CFG.net.graceMenu, B.state().scr, !!B.NET.rj];
        G.net.heal('c1'); G.run(8); o.zurueck = [!!A.get().players[1].away, B.NET.rj, !!B.get().ended, B.state().scr, A.NET.roster.length];
        /* zweiter Abriss im Ergebnis, Rueckkehr im Shop */
        (${DOWN})(G, 'c1'); G.run(2); A.openShop(); G.run(1); o.shopAw = [A.state().scr, A.NET.roster.length, !!A.NET.aw[1]]; B.SESSION.wallet = 4242; G.net.heal('c1'); G.run(8);
        o.shopRueck = [!!A.NET.aw[1], B.NET.rj, B.state().scr, B.SESSION.wallet, A.NET.roster.length];
        /* B reisst erneut ab, waehrend der Host den naechsten Auftrag startet (trotzdem los) */
        G.net.cut('c1'); G.run(2); const kit0 = A.NET.aw[1] && A.NET.aw[1].kit; A.startNext && 0; o.vorStart = [A.state().scr, !!A.NET.aw[1]];
        return o; })()`);
      t.eq(r.ende, [true, true, true], 'Ergebnis bei allen'); t.eq(r.frist.slice(0, 2).map(x => x > 250 ? 300 : x), [300, 300], 'im Ergebnis gilt graceMenu: ' + r.frist[0]); t.eq(r.frist.slice(2), ['play', true], 'B wartet auf dem Ergebnis');
      t.eq(r.zurueck, [false, null, true, 'play', 3], 'Rueckkehr im Ergebnis: Ergebnis steht, keine Abwesenheit, Roster vollstaendig');
      t.eq(r.shopAw, ['shop', 3, true], 'im Shop bleibt der Eintrag des Abwesenden'); t.eq(r.shopRueck.slice(0, 2), [false, null], 'Rueckkehr im Shop'); t.eq(r.shopRueck[3], 4242, 'SESSION (Konto) von B bleibt'); t.eq(r.shopRueck[4], 3, 'Roster vollstaendig');
    },
  },
  {
    name: 'N1a falsche Marke: Eine Rueckkehr mit erfundener Marke bekommt nie einen Platz (rej, Titel), der echte Platz bleibt abwesend und ist weiter fuer den Inhaber da',
    async run(t) {
      await SETUP(t);
      const r = await t.page.evaluate(`(() => { const o = {}, G = (${MK})(3), [A, B, C] = G.insts;
        (${DOWN})(G, 'c1'); G.run(2); B.NET.tok = 'AAAAAAAAAAAA'; G.net.heal('c1'); G.run(5);
        o.fremd = [B.state().scr, B.NET.role, A.NET.conns.length + 1, !!A.get().players[1].away, !!A.NET.aw[1], A.get().players[1].gone];
        const X = mkInst(G.net, 'x'); G.insts.push(X); X.joinRoom(A.NET.code); G.run(2); o.neu = [X.state().scr, A.NET.conns.length + 1];
        return o; })()`);
      t.eq(r.fremd, ['title', 'solo', 2, true, true, false], 'falsche Marke: Titel, A und C bleiben, Platz 1 bleibt abwesend'); t.eq(r.neu[0], 'title', 'ein normaler Beitritt in einen laufenden Auftrag wird abgewiesen'); t.eq(r.neu[1], 2, 'kein neuer Spieler');
    },
  },
  {
    name: 'N1a/N1b je Szenario (Bank, Transporter, Juwelier, Tankstelle, Museum, Casino, Notenbank, Gefaengnis mit dem Gefangenen als Abwesendem): Abriss nach 20 s Ueberfall, Rueckkehr nach 10 s, danach Welt von Host und Client gleich, die Figur unveraendert, kein Rubberbanding, die Runde ist weiter spielbar',
    slow: true,
    async run(t) {
      await SETUP(t);
      const r = await t.page.evaluate(`(() => { const out = [], fig = ${FIG};
        for (const sc of ['bank', 'truck', 'jewel', 'gas', 'museum', 'casino', 'nb', 'prison']) {
          const G = CT.mkGame(sc, 321, 2, 60, 20, null, null, sc === 'prison' ? (insts => insts.forEach(d => d.setPz(1))) : null), A = G.A, B = G.clients[0];
          A.CFG.policeAt = 1e6; A.CFG.policeForced = 1e6; A.CFG.vanAuto = 1e6; A.startHeist(false, A.get().players[0]); for (const q of A.get().players) q.inv = 1e6; G.run(20);
          const f0 = fig(A, 1); (${DOWN})(G, 'c1'); G.run(10); const away = !!A.get().players[1].away; G.net.heal('c1'); G.run(8);
          const pa = A.get().players[1], pb = B.get().players[1]; B.cv.dispatchEvent(new KeyboardEvent('keydown', { key: 'd', bubbles: true })); G.run(.8); B.cv.dispatchEvent(new KeyboardEvent('keyup', { key: 'd', bubbles: true })); G.run(1);
          out.push({ sc: sc + '/' + A.sc() + (sc === 'prison' ? '/pz' + A.getPz() : ''), away, back: !B.NET.rj && !pa.away && B.state().scr === 'play', same: f0 === fig(A, 1) || fig(A, 1).split(',').slice(2).join(',') === f0.split(',').slice(2).join(','), diff: WD(A, B),  /* Gefaengnis: die Schluesselkarte (crd) des Lieferanten wandert beim Host, beim Client steht sie auch ohne Abriss auf dem alten Platz (gleicher Befund im Dauer-Client, nicht Teil von N1) */
 drift: Math.round(Math.hypot(pa.x - pb.x, pa.y - pb.y)), run: !A.get().ended });
        }
        return out; })()`);
      t.eq(r.map(x => x.sc.split('/')[1]).join(','), 'bank,truck,jewel,gas,museum,casino,nb,prison', 'alle acht Szenarien liefen'); t.eq(r[7].sc, 'prison/prison/pz1', 'Gefaengnis mit Gefangenem auf Platz 1');
      for (const x of r) { t.ok(x.away, x.sc + ': B war abwesend'); t.ok(x.back, x.sc + ': B ist zurueck'); t.ok(x.same, x.sc + ': Figur unveraendert'); t.eq(x.diff, [], x.sc + ': Welt gleich'); t.ok(x.drift < 6, x.sc + ': kein Rubberbanding ' + x.drift); t.ok(x.run, x.sc + ': Runde laeuft'); }
    },
  },
  {
    name: 'N1b Client: connLost fuehrt in die Rueckkehr (kein Titel), Eingaben sind eingefroren (Taste, Mausklick), Esc gibt auf (Titel, Hinweis), bewusstes Verlassen (leaveGame) meldet lv und der Host setzt den Platz sofort auf gone, verlaesst der Host das Spiel (bye), steht der Client sofort auf dem Titel statt zu warten',
    async run(t) {
      await SETUP(t);
      const r = await t.page.evaluate(`(() => { const o = {}, G = (${MK})(3), [A, B, C] = G.insts, key = (d, k, ty) => d.cv.dispatchEvent(new KeyboardEvent(ty || 'keydown', { key: k, bubbles: true }));
        (${DOWN})(G, 'c1'); G.run(1); const x0 = B.get().players[1].x; key(B, 'd'); G.run(.8); key(B, 'd', 'keyup'); o.frozen = [Math.abs(B.get().players[1].x - x0) < 1, !!B.NET.rj, B.state().scr];
        B.cv.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientX: 10, clientY: 10 })); G.run(.2); o.mouse = [!!B.NET.rj, B.state().scr];
        key(B, 'Escape'); G.run(.3); o.esc = [B.state().scr, B.NET.rj, B.NET.role, !!A.NET.aw[1], !!A.get().players[1].away];
        /* bewusstes Verlassen von C: lv, sofort gone, keine Abwesenheit */
        C.leaveGame('Aufgabe'); G.run(1); o.lv = [A.get().players[2].gone, !!A.get().players[2].away, !!A.NET.aw[2]];
        return o; })()`);
      t.eq(r.frozen, [true, true, 'play'], 'Taste d wirkt waehrend der Rueckkehr nicht'); t.eq(r.mouse, [true, 'play'], 'Mausklick wirkt nicht, die Rueckkehr laeuft weiter'); t.eq(r.esc.slice(0, 3), ['title', null, 'solo'], 'Esc: Aufgeben, Titel'); t.ok(r.esc[3] && r.esc[4], 'der Host wartet noch die Frist ab (der Client konnte nichts melden)');
      t.eq(r.lv, [true, false, false], 'bewusstes Verlassen: sofort gone, keine Frist');
      const r2 = await t.page.evaluate(`(() => { const G = (${MK})(2), [A, B] = G.insts; A.leaveGame('Host weg'); G.run(1); return [B.state().scr, B.NET.rj, B.NET.role]; })()`);
      t.eq(r2, ['title', null, 'solo'], 'Host geht: der Client steht sofort auf dem Titel (bye), er wartet nicht in der Rueckkehr');
    },
  },
  {
    name: 'N1b Zuschauer: Abriss im Spiel fuehrt in die Rueckkehr, der Zuschauer kommt mit go zurueck und schaut weiter (Welt gleich dem Host); die Zweitverbindung im Wettkampf versucht es alle 3 s neu und steht nach dem Heilen wieder',
    async run(t) {
      await SETUP(t);
      const r = await t.page.evaluate(`(() => { const o = {}, G = (${MK})(2), [A, B] = G.insts; const S = CT.addSpec(G, 's'); G.run(3); const sid0 = S.NET.sid;
        o.vor = [S.state().scr, A.NET.specs.length]; (${DOWN})(G, 's'); G.run(1); o.weg = [S.state().scr, !!S.NET.rj, A.NET.specs.length]; G.net.heal('s'); G.run(8);
        o.zurueck = [S.state().scr, S.NET.rj, S.NET.spec, A.NET.specs.length, WD(A, S).length, S.NET.sid > 0, A.get().players.length];
        return o; })()`);
      t.eq(r.vor, ['play', 1], 'Zuschauer schaut zu'); t.eq(r.weg, ['play', true, 0], 'Abriss: Rueckkehr, der Host hat ihn aus der Liste'); t.eq(r.zurueck.slice(0, 4), ['play', null, true, 1], 'zurueck als Zuschauer'); t.eq(r.zurueck[4], 0, 'Welt gleich dem Host'); t.ok(r.zurueck[5], 'neue Zuschauernummer');
      const d = await t.page.evaluate(`(() => { const o = {}, D = CT.mkDuel(2, 2), { A, B } = D; A.CFG.duel.len = 3; A.CFG.duel.specDelay = B.CFG.duel.specDelay = 2; A.duelOpen(); D.run(.3); B.duelJoin(A.NET.code); D.run(1.5);
        const S = CT.addSpec({ net: D.net, A, insts: D.insts }, 's'); D.run(2); A.duelReady(); B.duelReady(); D.run(9);
        o.vor = [S.state().scr, S.sp2() && S.sp2().live]; D.net.cut('s'); D.net.cut('s', { silent: true, closeAfter: 99999 }); D.run(8); o.weg = [S.state().scr, S.sp2() && S.sp2().live, !!S.NET.rj];
        D.net.heal('s'); D.run(10); o.heil = [S.state().scr, S.NET.rj, S.sp2() && S.sp2().live, S.sp2() && S.sp2().go ? 1 : 0, B.NET.specs.length, A.NET.specs.length]; return o; })()`);
      t.eq(d.vor, ['play', true], 'Wettkampf, Zuschauer mit zweitem Strom'); t.eq(d.weg[2], true, 'Hauptverbindung in der Rueckkehr'); t.ok(!d.weg[1], 'zweiter Strom ist weg');
      t.eq(d.heil, ['play', null, true, 1, 1, 1], 'nach dem Heilen sind beide Stroeme wieder da (Zweitverbindung versucht es alle 3 s neu, hat wieder go)');
    },
  },
  {
    name: 'N1a Start mit "trotzdem los" (N-R11): Startet der Host den naechsten Auftrag, waehrend B abwesend ist, entsteht B als geschuetzte, abwesende Figur mit seinem Kit, der Rest der Frist laeuft weiter (kein neuer Zaehler), B kommt im neuen Auftrag per go zurueck; kehrt B im Ergebnis zurueck, bleibt sein Ergebnis dasselbe Objekt (end wirkt nicht doppelt)',
    async run(t) {
      await SETUP(t);
      const r = await t.page.evaluate(`(() => { const o = {}, G = (${MK})(3), [A, B, C] = G.insts; A.setSecured(5000); A.finish(true, 'Sieg'); G.run(1.5);
        const e0 = B.get().ended; (${DOWN})(G, 'c1'); G.run(3); G.net.heal('c1'); G.run(5); o.ergebnis = [B.get().ended === e0, !!e0, B.state().scr, !!B.NET.rj];
        A.openShop(); G.run(1); const kit0 = JSON.stringify(A.NET.conns.find(c => c.pid === 1).kit); (${DOWN})(G, 'c1'); G.run(2); const rest0 = A.NET.aw[1].t;
        A.startNext(); G.run(2); const q = A.get().players[1]; o.neu = [A.state().scr, !!q.away, q.awN, A.prot(q), q.gone, JSON.stringify(q.kit) === kit0, A.NET.aw[1].t < rest0, A.NET.aw[1].t > rest0 - 5, A.get().players.length];
        for (const d of A.get().players) d.inv = 1e6; G.run(6); o.steht = [Math.round(A.get().players[1].x - A.get().players[1].x), A.get().players[1].hp];
        G.net.heal('c1'); G.run(8); const qa = A.get().players[1], qb = B.get().players[1]; o.zurueck = [B.state().scr, B.NET.rj, !!qa.away, qa.gone, B.get().ended, Math.hypot(qa.x - qb.x, qa.y - qb.y) < 4, WD(A, B)];
        return o; })()`);
      t.eq(r.ergebnis, [true, true, 'play', false], 'Rueckkehr im Ergebnis: dasselbe Ergebnis, kein zweites');
      t.eq(r.neu, ['play', true, 1, true, false, true, true, true, 3], 'neuer Auftrag: B abwesend, geschuetzt, nicht gone, Kit da, Frist laeuft weiter'); t.eq(r.zurueck, ['play', null, false, false, null, true, []], 'B kommt im neuen Auftrag zurueck, Welt gleich');
    },
  },
  {
    name: 'N1a Lobby-Geist: Ist B im Ergebnis abwesend und fuehrt der Host in die Lobby (Rueckkehr nach dem Duell, duelRet), fallen NET.aw und der Roster-Eintrag heraus, der Platz wird frei, ein Rueckkehrer bekommt genau einen Platz',
    async run(t) {
      await SETUP(t);
      const r = await t.page.evaluate(`(() => { ${HELP}; const o = {}; const { G, A, t1, t2 } = R2.mk(2, 2, 0), B = t2[0], C = t1[1]; R2.fin(G, A, B);
        (${DOWN})(G, C.name); G.run(2); o.vor = [!!A.NET.aw[1], A.NET.roster.length]; const ok = A.duelRet(); G.run(2);
        o.lobby = [ok, A.state().scr, Object.keys(A.NET.aw).length, A.NET.roster.length, A.NET.roster.some(r => r.id === 1)];
        G.net.heal(C.name); G.run(10); o.nach = [A.NET.roster.filter(r => r.id === 1).length, A.NET.roster.length, Object.keys(A.NET.aw).length, C.state().scr];
        return o; })()`);
      t.eq(r.vor, [true, 2], 'B ist im Ergebnis abwesend, der Eintrag bleibt'); t.eq(r.lobby, [true, 'lobby', 0, 1, false], 'nach dem Wechsel in die Lobby: kein Geist in NET.aw und im Roster');
      t.ok(r.nach[0] <= 1 && r.nach[2] === 0, 'ein Rueckkehrer belegt hoechstens einen Platz: ' + JSON.stringify(r.nach));
    },
  },
  {
    name: 'N1b Raum endgueltig weg: Antwortet der Vermittler beim Neuversuch dauerhaft mit peer-unavailable, gibt der Client nach CFG.net.goneT (20 s) auf (Titel mit Hinweis), nicht erst nach der Frist von 60 oder 300 s; kommt der Raum vorher zurueck, geht es weiter',
    async run(t) {
      await SETUP(t);
      const r = await t.page.evaluate(`(() => { const o = {}, G = (${MK})(2), [A, B] = G.insts; o.t = A.CFG.net.goneT;
        G.net.signalDown(A.NET.code, { hold: true }); G.net.cut('c1'); G.run(12); o.mitte = [B.state().scr, !!B.NET.rj]; G.run(12); o.ende = [B.state().scr, B.NET.rj, B.NET.role];
        const H = (${MK})(2), [A2, B2] = H.insts; H.net.signalDown(A2.NET.code, { hold: true }); H.net.cut('c1'); H.run(12); H.net.signalUp(A2.NET.code); H.run(8); o.zurueck = [B2.state().scr, B2.NET.rj, A2.get().players[1].away];
        return o; })()`);
      t.eq(r.t, 20, 'CFG.net.goneT 20 s'); t.eq(r.mitte, ['play', true], 'nach 12 s wartet B noch'); t.eq(r.ende, ['title', null, 'solo'], 'nach rund 20 s steht B auf dem Titel'); t.eq(r.zurueck, ['play', null, null], 'kommt der Raum vor Ablauf zurueck, kehrt B zurueck');
    },
  },
  {
    name: 'N1 tote Leitung (Tills Spieltest): Stirbt die Verbindung still und fuer immer (WLAN weg, neue Adresse, kein onclose), erkennen Host und Client das nach CFG.net.dead (10 s) selbst: der Host macht den Spieler abwesend, der Client geht in rejoin und kommt mit demselben Platz zurueck; in der Lobby greift die Erkennung auch',
    async run(t) {
      await SETUP(t);
      const r = await t.page.evaluate(`(() => { const o = {}, G = (${MK})(3), [A, B, C] = G.insts, ev = ${NETEV}; o.dead = A.CFG.net.dead; const f0 = (${FIG})(A, 1), tok0 = B.NET.tok;
        G.net.kill('c1'); G.run(6); o.wackelt = [!!A.get().players[1].away, !!B.NET.rj, B.state().scr];
        G.run(8); o.danach = [B.NET.rj, B.state().scr, B.NET.myId, B.NET.tok === tok0, !!A.get().players[1].away, A.get().players[1].gone, A.get().players[1].awN, (${FIG})(A, 1) === f0];
        o.evA = ev(A).filter(s => /tot|abwesend|rj ok/.test(s)); o.evB = ev(B).filter(s => /tot|rj/.test(s)); o.diff = WD(A, B);
        /* Lobby: die Erkennung gilt auch dort (versteckte Tabs pingen ueber bgPing) */
        const L = CT.mkLobby(2, 0), [LA, LB] = L.players; L.net.kill('c1'); L.run(6); o.lobby0 = [LA.NET.conns.length, LA.NET.roster.length]; L.run(8); o.lobby = [LA.state().scr, LA.NET.conns.length + 1, LB.state().scr, LA.NET.roster.length];
        /* Lobby verlassen: sofort weg, ein Neubeitritt mit anderem Namen belegt nur einen Platz */
        const M = CT.mkLobby(3, 0), [MA, MB, MC] = M.players; MB.setName('Blau'); M.run(.5); const n0 = MA.NET.roster.length; MB.hostRoom(); M.run(.3); const gone = MA.NET.roster.length; const N = mkInst(M.net, 'n'); M.insts.push(N); N.setName('Bluppy'); N.joinRoom(MA.NET.code); M.run(2); o.verlassen = [n0, gone, MA.NET.roster.length, MA.NET.roster.map(r => r.name).join(',')];
        return o; })()`);
      t.eq(r.dead, 10, 'CFG.net.dead 10 s'); t.eq(r.wackelt.slice(1), [false, 'play'], 'nach 6 s ist noch nichts passiert (Anzeige wackelt genuegt)');
      t.eq(r.danach.slice(0, 5), [null, 'play', 1, true, false], 'nach 14 s: B ist ueber rejoin zurueck, gleicher Platz, gleiche Marke'); t.eq(r.danach.slice(5, 7), [false, 1], 'nicht gone, genau ein Abriss'); t.ok(r.danach[7], 'Figur unveraendert'); t.eq(r.diff, [], 'Welt gleich');
      t.ok(r.evA.some(s => /tot/.test(s)) && r.evA.some(s => /abwesend/.test(s)) && r.evA.some(s => /rj ok/.test(s)), 'Host-Flugschreiber: tot, abwesend, rj ok: ' + r.evA.join(' | ')); t.ok(r.evB.some(s => /tot/.test(s)), 'Client-Flugschreiber: tot: ' + r.evB.join(' | '));
      t.eq(r.lobby0, [1, 2], 'Lobby nach 6 s: noch alle da'); t.eq(r.lobby, ['lobby', 1, 'title', 1], 'Lobby: die tote Leitung faellt nach 10 s heraus (Host: Eintrag weg, Client: Titel), kein Geist'); t.eq(r.verlassen.slice(0, 3), [3, 2, 3], 'Lobby verlassen: der Platz ist sofort frei, der Neubeitritt mit anderem Namen belegt nur einen Platz'); t.ok(!/Blau/.test(r.verlassen[3]) && /Bluppy/.test(r.verlassen[3]), 'ohne Geist Blau: ' + r.verlassen[3]);
    },
  },
  {
    name: 'N1 Neuladen (Marke weg): Ein neuer Tab mit dem Namen des Spielers kommt auf dessen Platz zurueck, solange der Platz abwesend ist oder die alte Leitung wackelt; ein fremder Name wird abgewiesen; zwei gleichnamige Treffer gelten nicht',
    async run(t) {
      await SETUP(t);
      const r = await t.page.evaluate(`(() => { const o = {}, G = (${MK})(3), [A, B, C] = G.insts; B.setName('Bo'); C.setName('Cy'); G.run(1); const f0 = (${FIG})(A, 1);
        /* (a) Leitung wackelt, der Host hat B noch nicht abgeschrieben */
        G.net.kill('c1'); G.run(5); o.wackelt = [!!A.get().players[1].away, A.NET.conns.length + 1]; const tok0 = B.NET.tok;
        const X = mkInst(G.net, 'x'); G.insts.push(X); X.setName('Bo'); X.joinRoom(A.NET.code); G.run(3);
        o.alt = [B.NET.rj ? 1 : 0, B.state().scr, X.NET.tok !== tok0]; o.a = [X.state().scr, X.NET.myId, X.NET.role, !!A.get().players[1].away, A.NET.conns.length + 1, (${FIG})(A, 1) === f0, WD(A, X).length];
        /* (b) B ist abwesend (Reload nach der Frist von 10 s) */
        (${DOWN})(G, 'x'); G.run(14); o.abw = [!!A.get().players[1].away, Object.keys(A.NET.aw).join(',')];
        const Y = mkInst(G.net, 'y'); G.insts.push(Y); Y.setName('bo'); Y.joinRoom(A.NET.code); G.run(3);
        o.b = [Y.state().scr, Y.NET.myId, !!A.get().players[1].away, Object.keys(A.NET.aw).length, (${FIG})(A, 1) === f0];
        /* (c) fremder Name: abgewiesen */
        const Z = mkInst(G.net, 'z'); G.insts.push(Z); Z.setName('Dora'); Z.joinRoom(A.NET.code); G.run(3); o.c = [Z.state().scr, Z.NET.role, A.NET.conns.length + 1];
        return o; })()`);
      t.eq(r.wackelt, [false, 3], 'vorher: Leitung tot, Host hat B noch nicht abgeschrieben');
      t.eq(r.a.slice(0, 3), ['play', 1, 'client'], 'Neuladen bei wackelnder Leitung: neuer Tab auf Platz 1'); t.eq(r.a.slice(3, 6), [false, 3, true], 'B nicht abwesend, drei Spieler, Figur unveraendert'); t.eq(r.a[6], 0, 'Welt gleich');
      t.eq(r.abw, [true, '1'], 'B ist abwesend'); t.eq(r.b.slice(0, 2), ['play', 1], 'Neuladen bei abwesendem Platz (Name gross/klein egal): Platz 1'); t.eq(r.b.slice(2), [false, 0, true], 'nicht mehr abwesend, Figur unveraendert');
      t.eq(r.c.slice(0, 2), ['title', 'solo'], 'fremder Name: abgewiesen'); t.eq(r.c[2], 3, 'kein neuer Spieler');
    },
  },
  {
    name: 'N1 Beitritt per Link verlangt einen selbst getippten Namen: Der Link startet den Beitritt nicht, der Bildschirm zeigt die Aufforderung, Enter ohne Namen tut nichts, ein getippter Name plus Enter tritt bei (Esc und Tab brechen nicht ab); ohne Link (Raum beitreten ueber den Code) bleibt alles wie bisher',
    async run(t) {
      await SETUP(t);
      const r = await t.page.evaluate(`(() => { const o = {}, G = CT.mkLobby(1, 0), A = G.A, txt = ${TEXTS}; A.setName('Anna'); G.run(.3);
        const X = mkInst(G.net, 'x'); G.insts.push(X); X.setName('Gespeichert'); X.linkBegin(A.NET.code, false); G.run(3);
        const key = (d, k) => d.cv.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }));
        o.vor = [X.state().scr, X.NET.role, A.NET.roster.length, !!X.linkJoin(), txt(X).some(s => /Du trittst Raum/.test(s))];
        key(X, 'Enter'); G.run(2); o.leer = [X.NET.role, A.NET.roster.length, !!X.linkJoin()]; key(X, 'Escape'); key(X, 'Tab'); G.run(.2); o.esc = [X.NET.role, !!X.linkJoin()];
        for (const ch of 'Zed') key(X, ch); G.run(.2); o.tippt = txt(X).some(s => /Enter: beitreten als Zed/.test(s)); key(X, 'Enter'); G.run(3);
        o.nach = [X.state().scr, X.NET.role, A.NET.roster.length, A.NET.roster.map(r => r.name).join(','), !!X.linkJoin()];
        const Y = mkInst(G.net, 'y'); G.insts.push(Y); Y.setName('Yvo'); Y.joinRoom(A.NET.code); G.run(2); o.ohne = [Y.NET.role, A.NET.roster.length];
        return o; })()`);
      t.eq(r.vor, ['coop', 'solo', 1, true, true], 'der Link allein tritt nicht bei, die Aufforderung steht da'); t.eq(r.leer, ['solo', 1, true], 'Enter ohne Namen: nichts'); t.eq(r.esc, ['solo', true], 'Esc und Tab brechen nicht ab'); t.ok(r.tippt, 'Hinweis zeigt den getippten Namen');
      t.eq(r.nach.slice(0, 3), ['lobby', 'client', 2], 'mit Namen und Enter im Raum'); t.ok(/Zed/.test(r.nach[3]), 'mit dem getippten Namen: ' + r.nach[3]); t.eq(r.nach[4], false, 'kein offener Linkbeitritt mehr'); t.eq(r.ohne, ['client', 3], 'Beitritt ueber den Code wie bisher');
    },
  },
  {
    name: 'N1 Tab im Hintergrund / Alt-Tab bis 30 s: Steht der Tab eines Clients still (kein tick, keine Pings aus netWatch), halten die Timer-Pings (bgPing) die Leitung am Leben, niemand wird abwesend; ohne sie waere B nach 10 s abwesend (Gegenprobe); steht der Host im Shop still (kein tick), antworten Pings trotzdem und kein Client geht in die Rueckkehr',
    async run(t) {
      await SETUP(t);
      const r = await t.page.evaluate(`(() => { const o = {}, run = (G, list, sec, each) => { for (let i = 0; i < Math.round(sec * 60); i++) { step(list, G.net, 1 / 60); if (each && i % 120 === 0) each(); } };
        /* (a) Client B versteckt, mit Timer-Pings */
        let G = (${MK})(3), [A, B, C] = G.insts; const nAbw = d => d.flog().dump().ereignisse.filter(e => e[2] === 'netz' && (e[3][0] === 'abwesend' || e[3][0] === 'tot')).length; run(G, [A, C], 30, () => B.bgPing()); o.a = [!!A.get().players[1].away, A.NET.conns.length + 1, !!B.NET.rj, nAbw(A)]; run(G, [A, B, C], 5); o.a2 = [!!A.get().players[1].away, !!B.NET.rj, B.state().scr, A.get().players[1].awN | 0];
        /* Gegenprobe: ohne Pings wird B abwesend */
        G = (${MK})(3); [A, B, C] = G.insts; run(G, [A, C], 14); o.ohne = [A.flog().dump().ereignisse.some(e => e[2] === 'netz' && e[3][0] === 'abwesend')];
        /* (b) Host im Shop und still */
        G = (${MK})(3); [A, B, C] = G.insts; A.openShop(); run(G, [B, C], 30); o.b = [!!B.NET.rj, !!C.NET.rj, B.state().scr, nAbw(B)]; run(G, [A, B, C], 5); o.b2 = [!!A.get().players[1].away, !!A.get().players[2].away, !!B.NET.rj, !!C.NET.rj, A.NET.conns.length + 1, nAbw(A)];
        return o; })()`);
      t.eq(r.a, [false, 3, false, 0], '30 s versteckt mit Timer-Pings: nicht abwesend, keine Rueckkehr'); t.eq(r.a2, [false, false, 'play', 0], 'danach weiter anwesend, kein Abriss gezaehlt');
      t.eq(r.ohne, [true], 'Gegenprobe: ohne Pings wird B nach 10 s als tot erkannt und abwesend (die Erkennung greift; die Rueckkehr folgt sofort, weil B erreichbar ist)'); t.eq(r.b, [false, false, 'play', 0], 'Host 30 s still: kein Client geht in die Rueckkehr'); t.eq(r.b2, [false, false, false, false, 3, 0], 'Host wieder aktiv: niemand abwesend');
    },
  },
];
