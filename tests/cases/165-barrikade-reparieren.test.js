// Ticket 92: Barrikaden reparieren. Eigenes Objekt (barr) neben bar und bard: Angebot nur bei stehender Barrikade mit Schaden und Material,
// gibt bis zu CFG.bar.repHp zurueck (hoechstens voll), kostet repMc Material, Dauer repT mal Skill V1, die Sperrfrist cd bleibt. Rang vor Verstaerken.
// Klassische Bank, Zustand direkt gesetzt.
const SETUP = `(() => { const D = __dbg; D.setScenario('bank'); D.reset(); D.startHeist(false); const g = D.get(), me = g.me; g.en.length = 0; g.npcs.length = 0;
  const b = D.bars().find(x => !x.rd); const bi = g.its.find(i => i.t === 'bar' && i.b === b), br = g.its.find(i => i.t === 'barr' && i.b === b);
  me.x = b.x + b.iv[0] * 20; me.y = b.y + b.iv[1] * 20; me.mat = 4; me.units = 0; return { D, g, me, b, bi, br }; })()`;

module.exports = [
  {
    name: 'Reparieren: Angebot nur bei Schaden und Material, bringt HP zurueck (hoechstens voll), kostet Material, cd bleibt',
    async run(t) {
      const r = await t.page.evaluate(`(() => { const S = ${SETUP}, { D, me, b, bi, br } = S, C = D.CFG.bar, o = {}; o.cfg = [C.repT, C.repHp, C.repMc];
        o.none = br.ok(me);
        bi.act(me); bi.act(me); o.lv = b.lv; o.full = [b.hp, br.ok(me)]; me.mat = 4;
        b.hp = 30; b.cd = 5; const cd0 = b.cd, m0 = me.mat; o.hurt = br.ok(me); br.act(me); o.hp1 = b.hp; o.mat = m0 - me.mat; o.cd = b.cd === cd0;
        br.act(me); o.hp2 = b.hp; me.mat = 0; b.hp = 50; o.noMat = br.ok(me); br.act(me); o.hpNoMat = b.hp;
        me.mat = 4; o.dur = br.dur(me); o.pick = D.pickIt(me, -1).t; return o; })()`);
      t.eq(r.cfg, [1.8, 100, 1], 'CFG.bar repT, repHp, repMc');
      t.eq(r.none, false, 'ohne Barrikade kein Angebot');
      t.eq(r.lv, 2, 'zwei Stufen gebaut');
      t.eq(r.full, [200, false], 'volle Barrikade: kein Angebot');
      t.eq(r.hurt, true, 'mit Schaden und Material: Angebot');
      t.eq(r.hp1, 130, 'Reparatur gibt repHp zurueck');
      t.eq(r.mat, 1, 'kostet 1 Material');
      t.eq(r.cd, true, 'Sperrfrist cd bleibt');
      t.eq(r.hp2, 200, 'nicht ueber voll (130 + 100 gedeckelt auf 200)');
      t.eq(r.noMat, false, 'ohne Material kein Angebot');
      t.eq(r.hpNoMat, 50, 'ohne Material aendert act nichts');
      t.eq(r.dur, 1.8, 'Dauer repT');
      t.eq(r.pick, 'barr', 'E-Auswahl: Reparieren vor Verstaerken/Abbauen');
    },
  },
  {
    name: 'Reparieren: nach einem Knall bringt Reparieren die HP zurueck, ueber E halten dauert repT',
    async run(t) {
      const r = await t.page.evaluate(`(() => { const S = ${SETUP}, { D, g, me, b, bi, br } = S, o = {}; bi.act(me); bi.act(me); me.mat = 3;
        b.hp -= D.CFG.bar.dmg; o.afterBoom = b.hp; D.keys.e = true; let n = 0; const m0 = me.mat; while (b.hp < 200 && n < 200) { D.update(1 / 30); n++; } D.keys.e = false;
        o.hp = b.hp; o.sec = n / 30; o.mat = m0 - me.mat; return o; })()`);
      t.eq(r.afterBoom, 100, 'Knall zieht HP ab');
      t.eq(r.hp, 200, 'Reparatur stellt volle HP her');
      t.ok(r.sec >= 1.7 && r.sec <= 2.1, 'Dauer rund repT (' + r.sec + ')');
      t.eq(r.mat, 1, '1 Material verbraucht');
    },
  },
  {
    name: 'Reparieren im Coop: der Client haelt E an der beschaedigten Barrikade, der Host rechnet, beide sehen die HP voll, Material beim Client weniger',
    async run(t) {
      await t.loadTool('loopnet.js');
      await t.loadInpage('coop.js');
      const r = await t.page.evaluate(() => {
        const G = CT.mkGame('bank', 321, 2), A = G.A, B = G.clients[0], run = G.run, o = {};
        B.cv.dispatchEvent(new KeyboardEvent('keydown', { key: 'f', bubbles: true })); B.cv.dispatchEvent(new KeyboardEvent('keyup', { key: 'f', bubbles: true })); run(3);
        const g = A.get(); g.en.length = 0; g.npcs.length = 0; A.CFG.policeAt = 1e6; A.CFG.policeForced = 1e6;
        const b = A.bars().find(x => !x.rd), br = g.its.find(i => i.t === 'barr' && i.b === b), p = g.players[1];
        const bi = g.its.find(i => i.t === 'bar' && i.b === b); p.x = b.x + b.iv[0] * 20; p.y = b.y + b.iv[1] * 20; p.mat = 4; bi.act(p); bi.act(p); b.hp = 100; b.cd = 0; p.mat = 3; p.units = 0; o.m0 = p.mat; o.ok = br.ok(p);
        run(1);
        o.hpB0 = B.bars()[b.i].hp;
        B.keys.e = 1;
        for (let i = 0; i < 4 * 60; i++) { p.x = b.x + b.iv[0] * 20; p.y = b.y + b.iv[1] * 20; p.vx = p.vy = 0; const m = B.get().me; m.x = p.x; m.y = p.y; step(G.insts, G.net, 1 / 60); }
        B.keys.e = 0; run(1.5);
        o.hpA = b.hp; o.hpB = B.bars()[b.i].hp; o.matA = g.players[1].mat; o.matB = B.get().players[1].mat; return o;
      });
      t.eq(r.ok, true, 'Angebot beim Host fuer Spieler 1');
      t.eq(r.hpB0, 100, 'Client sieht den Schaden vor der Reparatur');
      t.eq(r.hpA, 200, 'Host rechnet: HP voll, E 4 s durchgehalten baut die Barrikade nicht ab');
      t.eq(r.hpB, 200, 'Client sieht HP voll');
      t.ok(r.matA < r.m0 && r.matA === r.matB, 'Material beim Client weniger und gleich auf beiden (' + r.m0 + ' -> ' + r.matA + '/' + r.matB + ')');
    },
  },
  {
    name: 'E durchhalten baut die frisch gebaute oder reparierte Barrikade nicht ab; erst nach Loslassen und neuem Halten geht der Abbau',
    async run(t) {
      const r = await t.page.evaluate(`(() => { const S = ${SETUP}, { D, me, b, br } = S, o = {}; me.mat = 4;
        const hold = sec => { D.keys.e = true; for (let i = 0; i < sec * 30; i++) D.update(1 / 30); };
        hold(14); o.built = [b.lv, b.hp];             // bauen, verstaerken, dann nicht abbauen
        D.keys.e = false; D.update(1 / 30); b.hp = 100; me.mat = 2; hold(4); o.rep = [b.lv, b.hp];   // reparieren, dann nicht abbauen
        D.keys.e = false; D.update(1 / 30); hold(3); o.dism = [b.lv, b.hp]; D.keys.e = false; return o; })()`);
      t.eq(r.built, [2, 200], 'Bauen und Verstaerken, danach steht sie noch');
      t.eq(r.rep, [2, 200], 'Reparieren, E weiter gehalten: steht noch, voll');
      t.eq(r.dism, [0, 0], 'E losgelassen und neu gehalten: Abbau moeglich');
    },
  },
];
