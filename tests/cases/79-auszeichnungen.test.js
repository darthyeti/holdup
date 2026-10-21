// Auszeichnungen im Coop-Ergebnis (Tills Wunsch aus den Coop-Runden): Nach der Beute-Uebersicht gibt es eine zweite Seite, auf der die Spieler fuer ihre Taten
// ausgezeichnet werden (meiste Beute, meiste Toetungen, am meisten rumgestanden, als Erster geflohen ...). Der Host zaehlt je Spieler in o.st, rechnet in finish()
// (awards) und schickt die fertige Liste im Ende-Paket (res.aw, VER 17). Solo hat keine zweite Seite.
async function setup(t) {
  await t.loadTool('loopnet.js');
  await t.loadInpage('coop.js');
  await t.loadInpage('menu.js');
}

module.exports = [
  {
    name: 'Auszeichnungen: Zaehler zaehlen Weg, Stillstand, Schuesse, Treffer, Tote, Zivilisten, Boden, Wiederbeleben und Alarm',
    async run(t) {
      await setup(t);
      const r = await t.page.evaluate(() => {
        const G = CT.mkGame('bank', 321, 2), A = G.A, g = () => A.get(), P = g().players, o = {};
        o.t0 = [P[0].st.t > 2, P[1].st.t > 2];
        A.startHeist(false, P[0]); o.alarm = [P[0].st.alarm, P[1].st.alarm];
        // Weg und Stillstand: P0 laeuft eine Sekunde nach rechts, P1 steht
        const i0 = P[0].st.idle, j0 = P[1].st.idle;
        A.keys.d = 1; const x0 = P[0].x; G.run(1); A.keys.d = 0; G.run(.1);
        o.dist = [Math.round(P[0].st.dist), Math.round(P[0].x - x0)]; o.dist1 = Math.round(P[1].st.dist);
        o.idle = [+(P[0].st.idle - i0).toFixed(1), P[1].st.idle - j0 > 1];
        // Schuesse: P0 feuert (Magazin voll), danach leer ohne Reserve: Klick
        P[0].mag = 12; P[0].res = 0; A.keys[' '] = 1; G.run(1); o.sh = P[0].st.sh; o.dry0 = P[0].st.dry;
        P[0].mag = 0; P[0].cool = 0; G.run(1); o.dryA = P[0].st.dry; o.mag = P[0].mag; o.sh2 = P[0].st.sh;
        A.keys[' '] = 0;
        // Treffer und Tod eines Beamten durch eine Kugel von P1, Zivilist durch P0, ein Gegnertreffer auf P0
        g().en.length = 0; g().bl.length = 0;
        const cop = A.mkCop(P[0].x + 200, P[0].y, false); g().en.push(cop);
        g().bl.push({ id: 9001, x: cop.x - 8, y: cop.y, vx: 720, vy: 0, l: .8, o: 1, own: 1, d: 999 });
        A.update(1 / 60); o.k = [P[1].st.k, P[1].st.ht, P[0].st.k];
        const civ = g().npcs.find(q => q.k === 'civ'); civ.x = P[0].x + 200; civ.y = P[0].y; civ.hp = 1;
        g().bl.push({ id: 9002, x: civ.x - 8, y: civ.y, vx: 720, vy: 0, l: .8, o: 1, own: 0, d: 999 });
        A.update(1 / 60); o.civ = [P[0].st.civ, P[1].st.civ, g().civKills];
        g().bl.push({ id: 9003, x: P[0].x, y: P[0].y, vx: 0, vy: 0, l: 1, o: 0, dmg: 8 });
        A.update(1 / 60); o.tk = [P[0].st.tk, P[1].st.tk];
        // P1 geht zu Boden, P0 beleibt ihn wieder
        P[1].hp = 0; A.update(1 / 60); o.down = [P[1].dead, P[1].st.dn, P[0].st.dn];
        P[0].x = P[1].x; P[0].y = P[1].y; A.keys.e = 1; G.run(A.CFG.rev.t + 1); A.keys.e = 0;
        o.rev = [P[1].dead, P[0].st.rev, P[1].st.rev];
        return o;
      });
      t.eq(r.t0, [true, true], 'aktive Zeit laeuft fuer beide');
      t.eq(r.alarm, [1, 0], 'Waffe gezogen zaehlt als 1 beim Spieler, der F drueckt');
      t.ok(r.dist[0] > 60 && Math.abs(r.dist[0] - r.dist[1]) < 15, 'Weg ~ zurueckgelegte Strecke: ' + JSON.stringify(r.dist));
      t.eq(r.dist1, 0, 'wer steht, laeuft nicht');
      t.ok(r.idle[0] < .3 && r.idle[1], 'Stillstand (Zuwachs): P0 lief, P1 stand: ' + JSON.stringify(r.idle));
      t.ok(r.sh >= 3 && r.sh <= 12, 'Schuesse gezaehlt: ' + r.sh);
      t.eq(r.dry0, 0, 'mit Munition kein Klick'); t.ok(r.dryA >= 1 && r.mag === 0 && r.sh2 === r.sh, 'leeres Magazin ohne Reserve zaehlt als Klick, nicht als Schuss: ' + JSON.stringify([r.dryA, r.mag, r.sh, r.sh2]));
      t.eq(r.k, [1, 1, 0], 'Kugel von P1 toetet den Beamten: Kill und Treffer bei P1');
      t.eq(r.civ, [1, 0, 1], 'Zivilist geht auf P0');
      t.eq(r.tk, [1, 0], 'Gegnerkugel trifft P0');
      t.eq(r.down, [true, 1, 0], 'Boden zaehlt beim Gefallenen');
      t.eq(r.rev, [false, 1, 0], 'Wiederbeleben zaehlt beim Helfer');
    },
  },
  {
    name: 'Auszeichnungen: Geraete, Barrikaden, Zapfsaeulen und Wachen zaehlen den richtigen Spieler',
    async run(t) {
      await setup(t);
      const r = await t.page.evaluate(() => {
        const G = CT.mkGame('bank', 321, 2), A = G.A, g = () => A.get(), P = g().players, o = {};
        A.startHeist(false, P[0]); G.run(.5);
        P[1].med = 1; P[1].hp = 40; A.useGadget(P[1], 2); o.gad = [P[0].st.gad, P[1].st.gad, P[1].med];
        A.useGadget(P[1], 2); o.gad2 = P[1].st.gad;   // ohne Vorrat: nichts gezaehlt
        const bi = g().its.find(i => i.t === 'bar' && i.mode(P[0]) === 0 && i.b.lv === 0);
        if (bi) { P[0].mat = 5; P[0].units = 2.5; const m = bi.mode(P[0]); if (m === 1) bi.act(P[0]); o.bar = [m, P[0].st.bar, P[1].st.bar]; } else o.bar = 'kein Tuerteil';
        return o;
      });
      t.eq(r.gad, [0, 1, 0], 'Medkit zaehlt bei dem, der es nutzt');
      t.eq(r.gad2, 1, 'ohne Vorrat zaehlt nichts');
      t.ok(r.bar !== 'kein Tuerteil', 'Tuer mit Barrikade gefunden');
      if (Array.isArray(r.bar)) t.eq(r.bar, [1, 1, 0], 'Barrikade zaehlt bei dem, der sie baut');
    },
  },
  {
    name: 'Auszeichnungen: Regeln (Mindestwert, Gleichstand teilt, alle gleich entfaellt, Obergrenze je Spieler und Seite, Solo ohne)',
    async run(t) {
      await setup(t);
      const r = await t.page.evaluate(() => {
        const G = CT.mkGame('bank', 654, 3), A = G.A, P = A.get().players, o = {};
        const fresh = () => P.forEach(p => { Object.keys(p.st).forEach(k => { p.st[k] = 0 }); p.st.t = 30; p.loot = 0; p.out = false; });
        const by = (aw, k) => aw.find(a => a.k === k);
        fresh(); P[0].st.sec = 40000; P[1].st.sec = 10000; P[0].st.k = 5; P[1].st.k = 5; P[2].st.k = 1; P[0].st.idle = 14; P[1].st.idle = 14.5;
        P[0].st.civ = 2; P[1].st.civ = 2; P[2].st.civ = 2;
        let aw = A.awards();
        o.loot = by(aw, 'loot') && [by(aw, 'loot').n, by(aw, 'loot').p, by(aw, 'loot').t];
        o.tie = by(aw, 'kills') && [by(aw, 'kills').n, by(aw, 'kills').p, by(aw, 'kills').v];
        o.idleMin = !!by(aw, 'idle'); o.allEq = !!by(aw, 'civ'); o.nothing = !by(aw, 'dn');
        // Mindestwert greift: knapp ueber der Grenze gibt es den Titel
        P[1].st.idle = A.CFG.awards.min.idle + 1; aw = A.awards(); o.idleOn = by(aw, 'idle') && by(aw, 'idle').p;
        // Obergrenze je Spieler: P0 gewinnt alles, bekommt aber hoechstens CFG.awards.per
        fresh(); const s = P[0].st; Object.assign(s, { sec: 9, k: 9, idle: 99, dn: 9, alarm: 2, civ: 9, rev: 9, dry: 9, tk: 9, sh: 99, ht: 99, dist: 1e5, work: 99, gad: 9, bar: 9 });
        P[1].st.sec = 1; aw = A.awards(); o.cap = aw.filter(a => a.p.length === 1 && a.p[0] === 0).length; o.n = aw.length; o.per = A.CFG.awards.per;
        // Seitenobergrenze und Felder
        A.CFG.awards.per = 99; aw = A.awards(); o.max = aw.length; A.CFG.awards.per = o.per;
        o.fields = aw.every(a => a.k && a.t && a.n && a.v && a.s && Array.isArray(a.p));
        // nur ein Teilnehmer: keine Auszeichnungen
        fresh(); P[1].st.t = 0; P[2].st.t = 0; P[0].st.k = 9; o.single = A.awards().length;
        return o;
      });
      t.eq(r.loot, ['Orange', [0], 'DICKSTE TASCHE'], 'hoechster Wert gewinnt');
      t.eq(r.tie, ['Orange & Blau', [0, 1], '5 Gegner ausgeschaltet'], 'Gleichstand teilt den Titel');
      t.eq(r.idleMin, false, 'unter dem Mindestwert gibt es nichts (14,5 s bei 15)');
      t.eq(r.allEq, false, 'haben alle den gleichen Wert, entfaellt der Posten');
      t.eq(r.idleOn, [1], 'ueber dem Mindestwert gewinnt der Spieler');
      t.eq(r.cap, r.per, 'ein Spieler bekommt hoechstens CFG.awards.per Titel');
      t.ok(r.n >= r.per, 'die anderen Posten bleiben nicht leer: ' + r.n);
      t.ok(r.max <= 8, 'hoechstens CFG.awards.max Eintraege: ' + r.max);
      t.eq(r.fields, true, 'jeder Eintrag hat Kennung, Titel, Namen, Wert, Unterzeile und Spieler');
      t.eq(r.single, 0, 'mit nur einem Teilnehmer gibt es keine Auszeichnungen');
    },
  },
  {
    name: 'Auszeichnungen: Coop-Ende bringt die Liste zu allen, Enter blaettert zur zweiten Seite, dann in den Shop (Pfeile und Kachel blaettern zurueck)',
    async run(t) {
      await setup(t);
      const r = await t.page.evaluate(() => {
        const G = CT.mkGame('bank', 321, 2), A = G.A, B = G.clients[0], g = d => d.get(), P = g(A).players, o = {};
        // lautloser Abgang: P0 zuerst mit Beute, dann P1 (Spawn liegt draussen, units > 0 genuegt)
        P[0].units = 1; P[0].loot = 30000; G.run(2); P[1].units = 1; P[1].loot = 10000; G.run(2);
        o.ended = [!!g(A).ended, !!g(B).ended];
        const aw = d => g(d).ended.aw.map(a => [a.t, a.n, a.v, a.s, a.cl.join('/')]);
        o.awA = aw(A); o.awB = aw(B); o.pg = [g(A).ended.pg, g(B).ended.pg];
        o.tiles1 = [MT.tile(A, 'endPrev') ? 1 : 0, A.ui().tiles().map(q => q.id).join(',')];
        const h1 = (MT.shot(A, o.h = {}, 'a1'), o.h.a1);
        // Enter blaettert
        MT.k(A, 'Enter'); o.pgEnter = g(A).ended.pg; o.scr1 = A.state().scr; o.tiles2 = A.ui().tiles().map(q => q.id).join(',');
        MT.shot(A, o.h, 'a2'); o.differs = h1 !== o.h.a2;
        // Pfeil links zurueck, rechts vor, Kachel Uebersicht zurueck
        MT.k(A, 'ArrowLeft'); o.left = g(A).ended.pg; MT.k(A, 'ArrowRight'); o.right = g(A).ended.pg;
        MT.click(A, 'endPrev'); o.prevClick = g(A).ended.pg; MT.click(A, 'endNext'); o.nextClick = g(A).ended.pg;
        // Client kann auch blaettern; Esc bleibt Verlassen
        MT.k(B, 'ArrowRight'); o.clientPg = g(B).ended.pg;
        // zweite Seite mit Enter: Shop (Sieg)
        MT.k(A, 'Enter'); o.shop = A.state().scr;
        MT.k(B, 'Enter'); o.shopB = B.state().scr;
        return o;
      });
      t.eq(r.ended, [true, true], 'Ende bei Host und Client');
      t.eq(r.pg, [0, 0], 'Start auf Seite 1');
      t.ok(r.awA.length >= 3, 'mindestens Beute, Erster und Letzter: ' + JSON.stringify(r.awA));
      t.eq(r.awB, r.awA, 'der Client bekommt dieselbe Liste wie der Host');
      const T = k => r.awA.find(a => a[0] === k);
      t.eq(T('DICKSTE TASCHE') && T('DICKSTE TASCHE').slice(1, 3), ['Orange', '$ 30.000 gesichert'], 'Beute-Titel');
      t.eq(T('ERSTER RAUS') && T('ERSTER RAUS')[1], 'Orange', 'Orange war zuerst draussen');
      t.eq(T('LETZTER AM WAGEN') && T('LETZTER AM WAGEN')[1], 'Blau', 'Blau war zuletzt draussen');
      t.eq(T('ERSTER RAUS')[4], '#ff9a3c', 'Medaille in der Spielerfarbe');
      t.eq(r.tiles1, [0, 'endNext,endBack'], 'Seite 1: zwei Kacheln');
      t.eq(r.pgEnter, 1, 'Enter blaettert zur zweiten Seite'); t.eq(r.scr1, 'play', 'noch nicht im Shop');
      t.eq(r.tiles2, 'endNext,endBack,endPrev', 'Seite 2 hat die Kachel Uebersicht');
      t.eq(r.differs, true, 'Seite 2 sieht anders aus');
      t.eq([r.left, r.right], [0, 1], 'Pfeil links und rechts');
      t.eq([r.prevClick, r.nextClick], [0, 1], 'Kachel Uebersicht und Kachel Auszeichnungen');
      t.eq(r.clientPg, 1, 'auch der Client blaettert');
      t.eq(r.shop, 'shop', 'Enter auf der zweiten Seite: Shop (Sieg)');
      t.eq(r.shopB, 'shop', 'Client ebenso');
    },
  },
  {
    name: 'Auszeichnungen: Niederlage zu viert (Host startet die neue Serie, Clients warten), lange Namen und viele Gewinner zeichnen ohne Fehler',
    async run(t) {
      await setup(t);
      const r = await t.page.evaluate(() => {
        const G = CT.mkGame('bank', 321, 4), A = G.A, C1 = G.clients[0], g = d => d.get(), P = g(A).players, o = {};
        ['Anna-Lena Langname', 'Bo', 'Cy', 'Dagmar'].forEach((n, i) => G.insts[i].setName(n)); G.run(1);
        o.names = [0, 1, 2, 3].map(i => A.pn(i));
        for (const p of P) { p.st.k = 3; p.st.sec = 0; }   // Gleichstand ueber alle: entfaellt
        P[0].st.k = 5; P[1].st.k = 5; P[2].st.k = 5;   // drei teilen sich den Titel
        P[3].st.idle = 99; P[2].st.dn = 4; P[1].st.civ = 3; P[0].st.alarm = 2;
        A.startHeist(false, P[0]); G.run(.5);
        for (const p of P) p.hp = 0; G.run(2);
        o.ended = [!!g(A).ended, !!g(C1).ended]; o.win = g(A).ended && g(A).ended.win;
        const aw = g(A).ended.aw; o.k = aw.find(a => a.k === 'kills'); o.n = aw.length;
        MT.k(A, 'Enter'); MT.k(C1, 'Enter');
        for (const d of [A, C1]) { d.draw(); d.draw(); }
        o.pg = [g(A).ended.pg, g(C1).ended.pg]; o.tilesC = C1.ui().tiles().map(q => q.id).join(',');
        MT.k(C1, 'Enter'); o.waits = !!g(C1).ended;   // Client kann nicht weiter: der Host startet
        MT.k(A, 'Enter'); G.run(1); o.next = [!!g(A).ended, A.state().scr, !!g(C1).ended];
        return o;
      });
      t.eq(r.ended, [true, true], 'Ende bei Host und Client'); t.eq(!!r.win, false, 'Niederlage');
      t.ok(r.k && r.k.n === r.names.slice(0, 3).join(' & '), 'drei Gewinner: ' + JSON.stringify(r.k) + ' / ' + JSON.stringify(r.names));
      t.ok(r.n >= 4, 'mehrere Auszeichnungen: ' + r.n);
      t.eq(r.pg, [1, 1], 'beide auf Seite 2'); t.eq(r.tilesC, 'endNext,endBack,endPrev');
      t.eq(r.waits, true, 'der Client wartet auf den Host');
      t.eq(r.next[0], false, 'Host startet die naechste Runde');
    },
  },
  {
    name: 'Auszeichnungen: Solo hat keine zweite Seite (Enter geht gleich weiter), Zaehler aendern das Spiel nicht',
    async run(t) {
      await setup(t);
      const r = await t.page.evaluate(() => {
        const net = LoopNet(30, 0), d = MT.solo(net), o = {};
        d.startGame(); d.setFocus(true); d.startHeist(false); MT.adv(d, .5); d.get().me.hp = 0; d.update(1 / 30);
        o.ended = !!d.get().ended; o.aw = d.get().ended.aw.length; o.tiles = d.ui().tiles().map(q => q.id).join(',');
        d.draw(); MT.k(d, 'ArrowRight'); o.pg = d.get().ended.pg; MT.k(d, 'Enter'); o.next = [!!d.get().ended, d.state().scr];
        o.stat = Object.keys(d.get().me.st).length;
        return o;
      });
      t.eq(r.ended, true); t.eq(r.aw, 0, 'Solo: keine Liste'); t.eq(r.tiles, 'endNext,endBack', 'Kacheln wie bisher');
      t.eq(r.pg, 0, 'Pfeil blaettert nicht'); t.eq(r.next, [false, 'play'], 'Enter startet sofort die neue Serie');
      t.ok(r.stat > 10, 'Zaehler liegen am Spieler');
    },
  },
];
