// Skillbaum (Tills Idee vom 24. Oktober 2026, umgebaut als MRU 1 B1 am 25. Oktober 2026, docs/spielsystem.md, Skillbaum): Punkte je gewonnenem Auftrag (SESSION.pts), je Baum Wurzel (Knoten 0), zwei Pfade
// (1 und 2, offen mit Wurzel 3 von 3, Entweder-oder) und je Pfad ein Gegenstand (3 hinter 1, 4 hinter 2, offen mit dem Pfad auf 3, noch nicht gebaut: soon), Stufen 0 bis 3, die Werte stehen in CFG.skill und wirken
// ueber skv(Kit, Knoten, Schluessel). Die Struktur (Entweder-oder, Gegenstaende, Rücknahme, Layout) prueft 98-skillbaum-umbau. Skills gehoeren zum Kit jedes Spielers (curKit, sanKit, mkPl), der Host rechnet.
const SETUP = `(sk, o) => {
  const D = __dbg; D.setScenario('bank'); D.setSeedMode('random'); D.setLage([]); D.setTurn('S'); D.buildSeed(5017);
  D.CFG.policeAt = 1e6; D.CFG.policeForced = 1e6; D.CFG.vanLock = 0;
  D.sessReset(); Object.assign(D.SESSION.sk, sk || {}); D.reset(); if (!(o && o.phase1)) D.startHeist(false, D.get().me);
  const me = D.get().me; me.hp = 100; me.inv = 0; me.ar = 0;
  return { D, me };
}`;

module.exports = [
  {
    name: 'Skillbaum: 15 Knoten (alle mit Werten und Text, kein Platzhalter mehr), Wurzel offen, Pfade mit Wurzel 3 von 3, Kauf kostet einen Punkt, hoechstens Stufe 3, Wurzel plus Pfad kosten 6 Punkte',
    async run(t) {
      const r = await t.page.evaluate(() => {
        const D = __dbg, S = D.CFG.skill, o = { bad: [], soon: [] };
        o.ids = D.SKID.length;
        for (const id of D.SKID) {
          const n = S[id]; if (!n || !n.n || !n.d) { o.bad.push(id + ' fehlt'); continue; }
          if (n.soon) { o.soon.push(id); continue; }
          const rising = (k, zero) => Array.isArray(n[k]) && n[k].length === 3 && n[k].every((v, i) => (zero && i < 2 ? v === 0 : v > 0) && (!i || v >= n[k][i - 1]));
          const keys = [...n.d.matchAll(/\{(\w+)%?\}/g)].map(m => m[1]); if (!keys.length) o.bad.push(id + ' ohne Wert');
          for (const k of keys) if (!rising(k)) o.bad.push(id + '.' + k + ' keine steigende Liste');
          for (const k of [...(n.b || '').matchAll(/\{(\w+)%?\}/g)].map(m => m[1])) if (!rising(k, true)) o.bad.push(id + '.' + k + ' kein Wert erst in Stufe 3');
          if (n.b && (!n.bn || ![...n.b.matchAll(/\{(\w+)%?\}/g)].length)) o.bad.push(id + ' Zusatz ohne Namen oder ohne Wert');
          o.bonus = (o.bonus || []).concat(n.b ? [id] : []);
        }
        D.sessReset(); D.SESSION.pts = 20; const ok = id => D.skOk(D.SESSION.sk, id), buy = id => D.skillBuy(id);
        o.lock0 = ['A0', 'A1', 'A2', 'A3', 'A4'].map(ok); o.denied = [buy('A1'), buy('A3')];
        buy('A0'); buy('A0'); o.root2 = ok('A1'); buy('A0'); o.open1 = [ok('A1'), ok('A2'), ok('A3'), ok('A4')];
        buy('A2'); buy('A2'); buy('A2'); o.beyond = buy('A2'); o.sk = Object.assign({}, D.SESSION.sk); o.pts = D.SESSION.pts;
        D.SESSION.pts = 0; o.nopts = buy('A1');
        o.other = [ok('V1'), ok('U2')];   // andere Baeume bleiben gesperrt
        return o;
      });
      t.eq(r.ids, 15, 'fuenfzehn Knoten');
      t.eq(r.bad, [], 'Daten und Texte: ' + JSON.stringify(r.bad));
      t.eq(r.soon, [], 'kein Gegenstand ist mehr als soon markiert (Mine und Claymore seit MRU 1 B2, C4 seit B3, Gewehr, Werfer und Koffer seit B4 und B5 gebaut)');
      t.eq(r.bonus, ['A1', 'A2', 'V1', 'V2', 'U1', 'U2'], 'jeder der sechs Pfade hat einen Zusatz mit Stufe 3');
      t.eq(r.lock0, [true, false, false, false, false], 'am Anfang nur die Wurzel offen');
      t.eq(r.denied, [false, false], 'gesperrte Knoten lassen sich nicht kaufen');
      t.eq(r.root2, false, 'Wurzel 2 von 3 schaltet die Pfade noch nicht frei');
      t.eq(r.open1, [true, true, false, false], 'Wurzel 3 von 3 schaltet beide Pfade frei, die Gegenstaende nicht');
      t.eq([r.sk.A0, r.sk.A2, r.beyond], [3, 3, false], 'Wurzel und Pfad auf 3, mehr als Stufe 3 geht nicht');
      t.eq(r.pts, 14, 'Wurzel und ein Pfad haben 6 der 20 Punkte gekostet');
      t.eq(r.nopts, false, 'ohne Punkte kein Kauf');
      t.eq(r.other, [false, false], 'andere Baeume sind unabhaengig gesperrt');
    },
  },
  {
    name: 'Skillbaum: Punkte nach einem gewonnenen Auftrag (1, im Ueberfall +1, dazu Nebenziel +1, lautlos gibt keinen Zusatz mehr, siehe 99-punkte-bonus), Niederlage beendet die Serie und leert Punkte und Baum, das Kit traegt die Stufen (curKit, sanKit klemmt)',
    async run(t) {
      const r = await t.page.evaluate(`(() => { const S = ${SETUP}, { D } = S({}, { phase1: true }), o = {};
        const end = (win, sp, soft) => { D.endLocal({ win, soft: !!soft, sp, score: 1000, n: 1, lines: [], fh: null, title: 't', extra: '', hi: false }); return D.SESSION.pts; };
        D.sessReset(); o.win = end(true, { goal: false, quiet: false });
        o.goal = end(true, { goal: true, quiet: false }) - o.win; o.quiet = end(true, { goal: true, quiet: true }) - o.win - o.goal;
        o.line = D.get().ended.lines.some(l => /^Skillpunkte: \\+2/.test(l)); o.soft = end(false, null, true) - (o.win + o.goal + o.quiet);
        D.SESSION.sk.A0 = 2; D.SESSION.sk.U3 = 1; o.kit = D.curKit().sk;
        o.san = D.sanKit({ sk: { A0: 9, Z9: 3, V2: -2, U1: 2, U2: 'x' } }).sk;
        end(false, null, false); o.after = [D.SESSION.pts, Object.keys(D.SESSION.sk).length];
        return o; })()`);
      t.eq([r.win, r.goal, r.quiet], [2, 3, 2], 'lauter Sieg 2 Punkte (Sieg 1, Ueberfall 1), mit Nebenziel 3, lautlos mit Nebenziel 2');
      t.ok(r.line, 'das Ergebnis nennt die Skillpunkte');
      t.eq(r.soft, 0, 'ein gescheiterter Auftrag, der die Serie weiterlaufen laesst (soft), gibt keine Punkte');
      t.eq(r.kit, { A0: 2, U3: 1 }, 'das Kit traegt die Stufen');
      t.eq(r.san, { A0: 3, U1: 2 }, 'sanKit klemmt auf 0 bis 3 und wirft unbekannte Knoten und Unsinn weg');
      t.eq(r.after, [0, 0], 'Niederlage: Punkte und Baum sind weg');
    },
  },
  {
    name: 'Skillbaum: Wirkungen auf Reserve, Nachladen, Schilde, Weste, Lehnen, Bauen, Zaeh (Deckung 3), Werkzeug, Dietrich, Fluchtwagen (Techniker 3), Geiseln (Sanitaeter 3); Sprengmeister, Jaeger und Bollwerk gibt es nicht mehr',
    async run(t) {
      const r = await t.page.evaluate(`(() => { const S = ${SETUP}, o = {};
        const base = S({}), D = base.D, m0 = base.me, wp = D.CFG.wpn.pistol;
        const cop = (kind, a, sk) => { const c = D.mkCop(m0.x + 300, m0.y, kind); c.a = a; c.mode = 'post'; c.post = { x: c.x, y: c.y, a, door: null }; c.rt = 1e9; D.get().en.length = 0; D.get().en.push(c); return c; };
        const shoot = (c, own) => { D.get().bl.push({ id: 9500 + Math.random() * 1e5 | 0, x: c.x - 30, y: c.y, vx: 720, vy: 0, l: .8, o: 1, own: 0, d: 34, ov: false }); for (let i = 0; i < 6; i++) D.update(1 / 30); };
        const fresh = (sk, p1) => S(sk, p1);
        // Stufe 0 als Vergleich
        o.base = { res: m0.res, jam: m0.jam, dc: m0.dc, mat: m0.mat, sw: m0.sw };
        let c = cop('shield', Math.PI); c.sh = 120; shoot(c); o.shield0 = 120 - c.sh;
        c = cop('swat', Math.PI); const h = c.hp; shoot(c); o.swat0 = h - c.hp;
        c = cop('swat', Math.PI); const h2 = c.hp; D.blastAt(c.x, c.y, { dmg: 100, r: 100, scorch: 10 }, 0); o.blast0 = h2 - c.hp;
        m0.ar = 100; m0.inv = 0; m0.ln = 0; D.hitPlayer(m0, 20); o.ar0 = 100 - m0.ar; m0.hp = 100; m0.ln = 1; m0.ar = 0; D.hitPlayer(m0, 20); o.lean0 = 100 - m0.hp; m0.ln = 0;
        { const b0 = D.get().its.find(i => i.t === 'bar'); m0.mat = 5; o.dur0 = b0.dur(m0); b0.act(m0); o.hp0 = b0.b.hp; }
        // alle Stufen 3
        const all = {}; for (const id of D.SKID) all[id] = 3;
        const f = fresh(all), d = f.D, m = f.me, wp2 = d.CFG.wpn.pistol;
        o.sk = { res: m.res, jam: m.jam, dc: m.dc, mat: m.mat, units: m.units, sw: m.sw };
        m.mag = 0; d.keys.r = true; d.update(1 / 30); d.keys.r = false; o.rl = [m.rl, wp2.rl];
        c = cop('shield', Math.PI); c.sh = 120; (() => { d.get().bl.push({ id: 9601, x: c.x - 30, y: c.y, vx: 720, vy: 0, l: .8, o: 1, own: 0, d: 34, ov: false }); for (let i = 0; i < 6; i++) d.update(1 / 30); })(); o.shield3 = 120 - c.sh;
        c = d.mkCop(m.x + 300, m.y, 'swat'); c.a = Math.PI; c.mode = 'post'; c.post = { x: c.x, y: c.y, a: Math.PI, door: null }; c.rt = 1e9; d.get().en.length = 0; d.get().en.push(c); const h3 = c.hp;
        d.get().bl.push({ id: 9602, x: c.x - 30, y: c.y, vx: 720, vy: 0, l: .8, o: 1, own: 0, d: 34, ov: false }); for (let i = 0; i < 6; i++) d.update(1 / 30); o.swat3 = h3 - c.hp;
        c = d.mkCop(m.x + 300, m.y, 'swat'); c.mode = 'post'; c.post = { x: c.x, y: c.y, a: 0, door: null }; c.rt = 1e9; d.get().en.length = 0; d.get().en.push(c); const h4 = c.hp; d.blastAt(c.x, c.y, { dmg: 100, r: 100, scorch: 10 }, 0); o.blast3 = h4 - c.hp;
        m.ar = 100; m.inv = 0; m.ln = 0; d.hitPlayer(m, 20); o.ar3 = 100 - m.ar; m.hp = 100; m.ln = 1; m.ar = 0; d.hitPlayer(m, 20); o.lean3 = 100 - m.hp; m.ln = 0;
        m.hp = 100; m.ar = 0; m.ad = 0; d.hitPlayer(m, 500); o.sw = [Math.round(m.hp), m.sw, m.inv > 0]; m.hp = 100; m.inv = 0; d.hitPlayer(m, 500); o.sw2 = m.hp <= 0;
        o.pick = [d.toolT(m, { sn: 'pry', t: 'x' }), base.D.toolT(m0, { sn: 'pry', t: 'x' })];
        const bar = d.get().its.find(i => i.t === 'bar'); m.mat = 5; o.bar = bar ? [bar.dur(m), o.dur0] : null;
        if (bar) { bar.act(m); o.barhp = [bar.b.hp, o.hp0]; }
        d.CFG.vanLock = 0; d.startHeist(false, d.get().me); d.callVan(); o.van = [Math.round(d.get().vanAt - d.get().tH), d.CFG.vanCall];
        o.cap = [d.holdCap(), d.CFG.hostage.cap];
        const n = d.get().npcs.find(q => q.st === 'cower' && q.k !== 'grd'); d.grabHost(n, d.get().me); o.heat = d.heatCalc(true).items.filter(q => /^Geiseln genommen/.test(q[0])).map(q => q[1]);
        return o; })()`);
      t.eq(r.sk.res, Math.round(r.base.res * 1.75), 'Munition 3: Reserve +75 %');
      t.ok(Math.abs(r.rl[0] - r.rl[1] * .7) < .05, 'Ruhige Hand 3: Nachladen 30 % schneller: ' + JSON.stringify(r.rl));
      t.ok(Math.abs(r.shield3 / r.shield0 - 1.6) < .02, 'Durchschlag 3: Schaden gegen Schilde +60 %: ' + JSON.stringify([r.shield0, r.shield3]));
      t.ok(Math.abs(r.swat3 / r.swat0 - 1) < .02, 'Jaeger ist entfallen (steckt kuenftig im Praezisionsgewehr): Schaden gegen SWAT unveraendert: ' + JSON.stringify([r.swat0, r.swat3]));
      t.ok(Math.abs(r.blast3 / r.blast0 - 1) < .02, 'Sprengmeister ist entfallen (steckt kuenftig im Granatwerfer): Explosion unveraendert: ' + JSON.stringify([r.blast0, r.blast3]));
      t.ok(Math.abs(r.ar3 / r.ar0 - .25) < .02, 'Panzerung 3: die Weste verliert 75 % weniger: ' + JSON.stringify([r.ar0, r.ar3]));
      t.ok(Math.abs(r.lean3 / r.lean0 - .45) < .02, 'Deckung 3: beim Lehnen 55 % weniger Schaden: ' + JSON.stringify([r.lean0, r.lean3]));
      t.ok(r.bar && Math.abs(r.bar[0] / r.bar[1] - .5) < .02, 'Baumeister 3: Barrikaden 50 % schneller: ' + JSON.stringify(r.bar));
      t.ok(r.barhp && Math.abs(r.barhp[0] / r.barhp[1] - 1) < .01, 'Bollwerk ist entfallen: gebaute Barrikaden halten wie ohne Skill: ' + JSON.stringify(r.barhp));
      t.eq(r.sw, [45, 0, true], 'Deckung 3 bringt Zaeh: einmal mit 45 % Leben wieder auf, danach verbraucht');
      t.ok(r.sw2, 'der zweite Treffer wirkt wieder (kein zweites Aufstehen)');
      t.eq([r.sk.jam - r.base.jam, r.sk.dc - r.base.dc], [2, 3], 'Werkzeug 3: zwei Stoersender und drei Ablenker mehr');
      t.ok(Math.abs(r.pick[0] / r.pick[1] - .7) < .01, 'Techniker 3: Dietrich (Aufbrechen) 30 % schneller (Faktor auf die Dauer .7, vorher falsch herum 1.3): ' + JSON.stringify(r.pick));
      t.eq(r.van, [32, 40], 'Techniker 3 bringt Fahrer: der Wagen kommt 8 s frueher (32 statt 40 s)');
      t.eq(r.cap, [46, 30], 'Sanitaeter 3 bringt Verhandler: Geisel-Aufschub +16 s');
      t.eq(r.heat, [2], 'Sanitaeter 3 bringt Verhandler: die Geiselnahme kostet 50 % weniger Fahndung (4 wird 2)');
    },
  },
  {
    name: 'Skillbaum im Menue: Der Shop hat die Kachel Faehigkeiten (K, zeigt die offenen Punkte), der Baum oeffnet sich als Fenster, Klick kauft eine Stufe, gesperrte Knoten und fehlende Punkte kaufen nichts, Esc schliesst',
    async run(t) {
      await t.loadTool('loopnet.js');
      await t.loadInpage('menu.js');
      const r = await t.page.evaluate(() => {
        const d = MT.solo(null, 's'), o = {}; d.sessReset(); d.SESSION.round = 2; d.SESSION.pts = 2; d.openShop(); d.ui().tiles();
        o.tile = d.ui().tiles().some(q => q.id === 'skills'); MT.k(d, 'k'); const ids = d.ui().tiles().map(q => q.id); o.open = ids.filter(i => /^sk:/.test(i)).length;
        MT.click(d, 'sk:A1'); o.locked = [d.SESSION.sk.A1 | 0, d.SESSION.pts];
        MT.click(d, 'sk:A0'); MT.click(d, 'sk:A0'); o.bought = [d.SESSION.sk.A0, d.SESSION.pts];
        MT.click(d, 'sk:A0'); o.nopts = [d.SESSION.sk.A0, d.SESSION.pts];
        MT.k(d, 'Escape'); o.closed = !d.ui().tiles().some(q => /^sk:/.test(q.id)); o.scr = d.state().scr;
        return o;
      });
      t.ok(r.tile, 'die Kachel Faehigkeiten steht im Shop');
      t.eq(r.open, 15, 'das Fenster zeigt 15 Knoten');
      t.eq(r.locked, [0, 2], 'ein gesperrter Knoten kauft nichts und kostet nichts');
      t.eq(r.bought, [2, 0], 'zwei Klicks auf die Wurzel kaufen zwei Stufen fuer zwei Punkte');
      t.eq(r.nopts, [2, 0], 'ohne Punkte kauft der dritte Klick nichts');
      t.ok(r.closed && r.scr === 'shop', 'Esc schliesst das Fenster, der Shop bleibt');
    },
  },
  {
    name: 'Skillbaum im Coop: Das Kit des Clients traegt die Stufen zum Host (sanKit), Sanitaeter beschleunigt das Wiederbeleben, Fahrer des Teams wirkt auf den Wagen',
    async run(t) {
      await t.loadTool('loopnet.js');
      await t.loadInpage('coop.js');
      const r = await t.page.evaluate(() => {
        const rev = sk => {
          __dbg.sessReset(); Object.assign(__dbg.SESSION.sk, sk);
          const G = CT.mkGame('bank', 321, 2), A = G.A; A.CFG.policeAt = 1e6; A.CFG.policeForced = 1e6;
          A.get().players[0].x = A.get().players[1].x + 20; A.get().players[0].y = A.get().players[1].y;
          G.A.get().players[0].hp = 1e9; const p1 = A.get().players[1]; p1.dead = true; p1.dn = 25; p1.hp = 0;
          A.keys.e = true; for (let i = 0; i < 60; i++) { const q0 = A.get().players[0]; q0.hp = 1e9; q0.x = p1.x - 20; q0.y = p1.y; p1.dn = 25; step(G.insts, G.net, 1 / 60); } A.keys.e = false;
          return { rv: +p1.rv.toFixed(3), kit: A.get().players[1].kit.sk, kit0: A.get().players[0].kit.sk };
        };
        const a = rev({}), b = rev({ U0: 3, U1: 3 });
        return { a, b };
      });
      t.ok(r.b.kit && r.b.kit.U1 === 3 && r.b.kit0.U1 === 3, 'beide Kits tragen die Stufen: ' + JSON.stringify([r.b.kit, r.b.kit0]));
      t.ok(r.a.rv > 0.1 && r.a.rv < 0.4, 'ohne Skill fuellt sich das Wiederbeleben in einer Sekunde um etwa 1 / 3,5: ' + r.a.rv);
      t.ok(Math.abs(r.b.rv / r.a.rv - 1 / .45) < .1, 'Sanitaeter 3: Wiederbeleben 55 % schneller: ' + JSON.stringify([r.a.rv, r.b.rv]));
    },
  },
];
