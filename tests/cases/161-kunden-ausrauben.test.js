// Kunden ausrauben (Ticket #60, docs/spielsystem.md): im Ueberfall (Phase 2) raubt E (1,5 s halten) einen kauernden Kunden aus (nur Karten mit LAY.rob: Bank, Klassik, Casino),
// Wert aus CFG.rob je Kunde fest aus dem Seed, 0,1 Platz, einmal je Kunde, danach noch als Geisel moeglich, Fahndungszaehler robN, Coop ueber den Host (VER 74).
const SETUP = `(sc, seed) => {
  const D = __dbg; D.setScenario(sc); D.setSeedMode('random'); D.setLage([]); D.setTurn('S'); D.buildSeed(seed);
  D.CFG.policeAt = 1e6; D.CFG.policeForced = 1e6;
  D.reset(); D.startHeist(false, D.get().me);
  const run = (n, f) => { for (let i = 0; i < n; i++) { const m = D.get().me; m.hp = 1e9; if (f) f(m, i); D.update(1 / 30); } };
  const pick = () => { const m = D.get().me; for (const n of D.get().npcs) { if (n.k !== 'civ' || n.st !== 'cower') continue; m.x = n.x; m.y = n.y; const it = D.pickIt(m, -1); if (it && it === D.robMi(n)) return n; } return null; };
  return { D, run, pick };
}`;

module.exports = [
  {
    name: 'Kunden ausrauben: E 1,5 s halten raubt einen kauernden Kunden aus (Wert in LAY.rob.v, 0,1 Platz), nur einmal, danach Geisel moeglich, Phase 1 und Angestellte nie',
    async run(t) {
      const r = await t.page.evaluate(`(() => { const S = ${SETUP}, o = {};
        const D0 = __dbg; D0.setScenario('bank'); D0.setSeedMode('random'); D0.setLage([]); D0.setTurn('S'); D0.buildSeed(5017); D0.reset(); o.p1 = D0.itsAll().filter(i => i.t === 'rob').length; { const q = D0.get().npcs.find(z => z.k === 'civ'); o.p1ok = D0.get().phase === 1 && q ? (q.st = 'cower', D0.robMi(q).ok(D0.get().me)) : null; }
        const T = S('bank', 5017), D = T.D, m = D.get().me; const n = T.pick(); o.found = !!n; if (!n) return o;
        o.rob = D.LAY().rob; o.cfg = D.CFG.rob; const l0 = m.loot, u0 = m.units;
        D.keys.e = true; T.run(20, q => { q.x = n.x; q.y = n.y; }); o.mid = [n.rob || 0, +D.robMi(n).pr.toFixed(2)];
        T.run(40, q => { if (!n.rob) { q.x = n.x; q.y = n.y; } }); D.keys.e = false;
        o.after = [n.rob, m.loot - l0, +(m.units - u0).toFixed(2), D.robN()];
        o.again = D.robMi(n).ok(m); o.host = D.hostMi(n).ok(m);
        o.staff = D.get().npcs.filter(q => q.k !== 'civ').every(q => !D.robMi(q).ok(m));
        m.x = n.x; m.y = n.y; const it = D.pickIt(m, -1); o.next = it ? it.t : null;
        o.rk = [D.rank(D.robMi(n), m, 10), D.rank(D.hostMi(n), m, 10)];   // rob vor Geisel, beide hinter jeder Beute in Reichweite
        o.emp = D.itsAll().filter(i => i.t === 'rob').length === D.get().npcs.filter(q => q.k === 'civ').length;
        return o; })()`);
      t.eq(r.p1, 0, 'in Phase 1 gibt es keine rob-Objekte');
      t.eq(r.p1ok, false, 'in Phase 1 ist ok falsch, auch bei kauerndem Kunden');
      t.ok(r.found, 'ein Kunde, bei dem E ausraubt, gefunden');
      t.eq([r.cfg.t, r.cfg.pen, r.rob.v, r.rob.u], [1.5, 20, [300, 1500], .1], 'Werte der Bank (CFG.rob, LAY.rob)');
      t.eq(r.mid[0], 0, 'nach 0,7 s noch nicht ausgeraubt: ' + JSON.stringify(r.mid));
      t.eq(r.after[0], 1, 'danach ausgeraubt');
      t.ok(r.after[1] >= 300 && r.after[1] <= 1500, 'Beute im Bereich: ' + r.after[1]);
      t.eq(r.after[2], .1, 'Platz 0,1');
      t.eq(r.after[3], 1, 'Fahndungszaehler robN 1');
      t.eq(r.again, false, 'einmal je Kunde');
      t.eq(r.host, true, 'als Geisel noch moeglich');
      t.eq(r.next, 'host', 'das naechste E waehlt die Geisel');
      t.ok(r.staff, 'Angestellte und Wachen nie');
      t.eq(r.rk, [30, 36], 'rank: rob = Abstand + CFG.rob.pen (20), kleiner als Geisel (26)');
      t.ok(r.emp, 'ein rob-Objekt je Kunde in itsAll');
    },
  },
  {
    name: 'Kunden ausrauben: nur Karten mit LAY.rob (Bank, Casino), nicht Juwelier, Tankstelle, Museum; Casino bucht in Chips; volle Tasche, Haeftlinge, Zivilfahnder und Lieferanten nie',
    async run(t) {
      const r = await t.page.evaluate(`(() => { const S = ${SETUP}, out = {};
        for (const [sc, sd] of [['bank', 321], ['casino', 4321], ['jewel', 654], ['gas', 987], ['museum', 1234]]) {
          const T = S(sc, sd), D = T.D, m = D.get().me, L = D.LAY(), x = { rob: !!L.rob };
          x.n = D.itsAll().filter(i => i.t === 'rob').length;
          if (L.rob) { x.v = L.rob.v; x.chips = L.rob.chips; const n = T.pick(); if (n) { const c0 = m.chipV || 0, l0 = m.loot; D.keys.e = true; T.run(70, q => { if (!n.rob) { q.x = n.x; q.y = n.y; } }); D.keys.e = false; x.rb = n.rob || 0; x.got = (m.chipV || 0) - c0; x.loot = m.loot - l0;
              const n2 = D.get().npcs.find(q => q.k === 'civ' && q.st === 'cower' && !q.rob); if (n2) { m.units = m.bag; x.fullFit = D.robMi(n2).fit(m); m.units = 0; x.sp = ['inm', 'dlv', 'uc'].map(k => { const f = Object.assign({}, n2, { rob: 0, rmi: undefined, [k]: 1 }); return D.robMi(f).ok(m) }) } } }
          out[sc] = x; }
        return out; })()`);
      t.eq([r.bank.rob, r.casino.rob], [true, true], 'Bank und Casino haben LAY.rob');
      t.eq([r.jewel.rob, r.gas.rob, r.museum.rob], [false, false, false], 'Juwelier, Tankstelle, Museum nicht');
      t.eq([r.jewel.n, r.gas.n, r.museum.n], [0, 0, 0], 'dort nie ein rob-Objekt');
      t.eq(r.casino.v, [1000, 3000], 'Casino 1.000 bis 3.000');
      t.eq(r.casino.chips, 1, 'Casino in Chips');
      t.eq(r.casino.rb, 1, 'Casino-Gast ausgeraubt');
      t.ok(r.casino.got >= 1000 && r.casino.got <= 3000, 'Chipwert im Bereich: ' + r.casino.got);
      t.ok(r.casino.loot < r.casino.got, 'Chips zaehlen bis zum Tausch mit Hehlerabschlag');
      t.eq(r.casino.fullFit, false, 'volle Tasche: fit greift');
      t.eq(r.casino.sp, [false, false, false], 'Haeftling, Lieferant, Zivilfahnder nie');
    },
  },
  {
    name: 'Kunden ausrauben: Fahndungszeile mit Deckel (sieben Kunden zaehlen sechs), gleicher Wert auf demselben Seed',
    async run(t) {
      const r = await t.page.evaluate(`(() => { const S = ${SETUP}, T = S('bank', 5017), D = T.D, o = {};
        const bk = n => D.heatBook(0, { phase: 2, kills: 0, civ: 0, host: 0, hostDead: 0, rob: n, waves: 0, left: 0, goal: false }).items.find(i => /ausgeraubt/.test(i[0]));
        o.b0 = bk(0) || null; o.b1 = bk(1); o.b7 = bk(7);
        o.v1 = D.get().npcs.filter(n => n.k === 'civ').map(n => D.robVal(n));
        const T2 = S('bank', 5017); o.v2 = T2.D.get().npcs.filter(n => n.k === 'civ').map(n => T2.D.robVal(n)); return o; })()`);
      t.eq(r.b0, null, 'ohne Ausraub keine Zeile');
      t.eq(r.b1[1], 1, 'ein Kunde: +1');
      t.eq(r.b7[1], 6, 'Deckel 6');
      t.eq(r.v1, r.v2, 'gleiche Werte auf demselben Seed');
      t.ok(r.v1.length > 0, 'Kunden vorhanden');
    },
  },
  {
    name: 'Kunden ausrauben (Coop): der Client haelt E, der Host rechnet, beide sehen ausgeraubt; Reihenfolge von itsAll gleich',
    timeout: 120000,
    async run(t) {
      await t.loadTool('loopnet.js');
      await t.loadInpage('coop.js');
      const r = await t.page.evaluate(() => {
        const G = CT.mkGame('bank', 321, 2), A = G.A, B = G.clients[0], out = {};
        B.cv.dispatchEvent(new KeyboardEvent('keydown', { key: 'f', bubbles: true })); G.run(3);
        out.phase = [A.get().phase, B.get().phase];
        out.ver = A.VER;
        out.ord = A.itsAll().map(i => i.t).join() === B.itsAll().map(i => i.t).join();
        const n = A.get().npcs.find(q => q.k === 'civ' && q.st === 'cower'); if (!n) { out.none = 1; return out; }
        const nb = B.get().npcs.find(q => q.id === n.id), p1 = A.get().players[1], l0 = p1.loot;
        B.keys.e = 1;
        for (let i = 0; i < 240; i++) { if (!n.rob) { p1.x = n.x; p1.y = n.y; p1.vx = p1.vy = 0 } step(G.insts, G.net, 1 / 60); }
        B.keys.e = 0; G.run(1);
        out.hostRob = n.rob || 0; out.cliRob = nb.rob || 0; out.gain = p1.loot - l0; out.ordAfter = A.itsAll().map(i => i.t).join() === B.itsAll().map(i => i.t).join();
        return out;
      });
      t.eq(r.phase, [2, 2], 'Ueberfall laeuft');
      t.ok(r.ver >= 74, 'VER mindestens 74: ' + r.ver);
      t.ok(r.ord && r.ordAfter, 'itsAll hat bei Host und Client dieselbe Reihenfolge');
      t.ok(!r.none, 'Kunde gefunden');
      t.eq([r.hostRob, r.cliRob], [1, 1], 'Host und Client sehen ausgeraubt');
      t.ok(r.gain >= 300 && r.gain <= 1500, 'Beute des Clients auf dem Host: ' + r.gain);
    },
  },
];
