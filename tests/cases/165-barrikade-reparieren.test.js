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
];
