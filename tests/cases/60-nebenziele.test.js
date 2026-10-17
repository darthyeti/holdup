// Nebenziele: Auswahl aus dem Seed, Auswertung je Ziel, Bonus im Ergebnis, Fehlschlag im Coop beim Client sichtbar, HUD zeichnet.
const SC = ['bank', 'truck', 'jewel', 'gas', 'museum', 'casino'];
const money = s => +String(s).replace(/[^0-9]/g, '');

module.exports = [
  {
    name: 'Nebenziele: Auswahl ist deterministisch, deckt alle Ziele ab, team nur ab zwei Spielern',
    async run(t) {
      const r = await t.page.evaluate(SC => {
        const D = __dbg, out = { seen: {}, bad: [] };
        for (const sc of SC) {
          D.setScenario(sc); D.setSeedMode('random'); D.setGoal(null);
          const set = new Set();
          for (let i = 0; i < 40; i++) {
            const sd = 10 + i * 17;
            D.buildLay(D.layoutFor(sd)); const a = D.goal().k;
            if (i < 6) { D.buildLay(D.layoutFor(sd)); if (D.goal().k !== a) out.bad.push(sc + '#' + sd + ' nicht deterministisch'); }
            set.add(a);
          }
          out.seen[sc] = [...set].sort();
        }
        out.pool = Object.fromEntries(Object.entries(D.GOALS).map(([k, g]) => [k, g.sc]));
        return out;
      }, SC);
      t.eq(r.bad, [], 'Auswahl');
      for (const sc of SC) {
        const want = Object.entries(r.pool).filter(([k, sc2]) => sc2.includes(sc) && !(k === 'team')).map(([k]) => k).sort();
        t.eq(r.seen[sc], want, 'Ziele auf ' + sc + ' (solo, ohne team)');
      }
    },
  },
  {
    name: 'Nebenziele: Schnell und Beute geben Bonus, verfehlt gibt nichts (Bot, Bank)',
    timeout: 120000,
    async run(t) {
      await t.loadTool('bot.js');
      const r = await t.page.evaluate(() => {
        const D = __dbg, o = { sigma: .05, react: .35, call: 0, wait: [15, 4] }, out = {};
        const play = (goal) => { D.setScenario('bank'); D.setSeedMode('classic'); D.setGoal(goal); const res = bot.run(o); return { res: res.res, lines: D.get().ended ? D.get().ended.lines : [], fail: D.goal().fail, k: D.goal().k }; };
        out.fastOk = play('fast');                       // Bot braucht etwa 85 s, Grenze 120 s
        const lim = D.CFG.goal.fast.bank; D.CFG.goal.fast.bank = 30;
        out.fastFail = play('fast'); D.CFG.goal.fast.bank = lim;
        out.fullFail = play('full');                     // Bot holt nur den Tresor, 75 % aller Stellen schafft er nicht
        const fl = D.CFG.goal.full.bank; D.CFG.goal.full.bank = .1;
        out.fullOk = play('full'); D.CFG.goal.full.bank = fl;
        out.cleanFailRate = null;
        return out;
      });
      const val = (x, key) => { const l = x.lines.find(s => s.startsWith(key)); return l ? money(l) : null; };
      for (const k of ['fastOk', 'fastFail', 'fullFail', 'fullOk']) t.eq(r[k].res, 'WIN', k + ': Bot muss gewinnen');
      const loot = val(r.fastOk, 'Beute:');
      t.ok(r.fastOk.lines.some(s => s.startsWith('Nebenziel erfüllt (Schnell)')), 'Schnell erfüllt: ' + JSON.stringify(r.fastOk.lines));
      t.eq(val(r.fastOk, 'Nebenziel erfüllt'), Math.round(loot * 0.1), 'Bonus 10 % der Beute');
      t.ok(r.fastFail.fail === 1 && r.fastFail.lines.some(s => s.startsWith('Nebenziel verfehlt: Schnell')), 'Schnell verfehlt');
      t.ok(!r.fastFail.lines.some(s => s.startsWith('Nebenziel erfüllt')), 'verfehlt gibt keinen Bonus');
      t.ok(r.fullFail.lines.some(s => s.startsWith('Nebenziel verfehlt: Nichts liegen lassen')), 'Beute-Ziel verfehlt: ' + JSON.stringify(r.fullFail.lines));
      t.ok(r.fullOk.lines.some(s => s.startsWith('Nebenziel erfüllt (Nichts liegen lassen)')), 'Beute-Ziel erfüllt: ' + JSON.stringify(r.fullOk.lines));
      t.eq(val(r.fullOk, 'Nebenziel erfüllt'), Math.round(val(r.fullOk, 'Beute:') * 0.12), 'Bonus 12 % der Beute');
    },
  },
  {
    name: 'Nebenziele: Treffer, Verdacht und Zeit lassen das Ziel scheitern',
    async run(t) {
      const r = await t.page.evaluate(() => {
        const D = __dbg, out = {};
        const fresh = (goal) => { D.setScenario('bank'); D.setSeedMode('classic'); D.setGoal(goal); D.reset(); };
        fresh('clean'); for (let i = 0; i < 30; i++) D.update(1 / 30); out.cleanIdle = D.goal().fail;
        D.get().me.hp -= 10; D.update(1 / 30); out.cleanHit = D.goal().fail;
        fresh('clean'); D.get().me.hp = 100; D.update(1 / 30); D.get().me.hp = 100; D.update(1 / 30); out.cleanHeal = D.goal().fail;
        fresh('calm'); D.setSus(30); D.update(1 / 30); out.calmLow = D.goal().fail; D.setSus(41); D.update(1 / 30); out.calmHigh = D.goal().fail;
        fresh('calm'); D.startHeist(false); D.setSus(90); D.update(1 / 30); out.calmAfterHeist = D.goal().fail;
        fresh('fast'); D.startHeist(false); D.get().me.hp = 1e6;
        for (let i = 0; i < 30 * 100; i++) { D.get().me.hp = 1e6; D.update(1 / 30); } out.fastEarly = D.goal().fail;
        for (let i = 0; i < 30 * 30; i++) { D.get().me.hp = 1e6; D.update(1 / 30); } out.fastLate = D.goal().fail;
        return out;
      });
      t.eq(r.cleanIdle, 0, 'ohne Treffer bleibt es heil'); t.eq(r.cleanHit, 1, 'Treffer verfehlt'); t.eq(r.cleanHeal, 0, 'mehr HP ist kein Treffer');
      t.eq(r.calmLow, 0, 'Verdacht 30 % ist ruhig'); t.eq(r.calmHigh, 1, 'Verdacht 41 % verfehlt'); t.eq(r.calmAfterHeist, 0, 'nach dem Ueberfall zaehlt der Verdacht nicht mehr');
      t.eq(r.fastEarly, 0, 'unter der Zeit'); t.eq(r.fastLate, 1, 'ueber der Zeit');
    },
  },
  {
    name: 'Nebenziele: im Coop sieht der Client den Fehlschlag, team scheitert beim Niederschlag',
    async run(t) {
      await t.loadTool('loopnet.js'); await t.loadInpage('coop.js');
      const r = await t.page.evaluate(() => {
        const out = {};
        let G = CT.mkGame('bank', 321, 2, 60, 20, 'clean'), A = G.A, B = G.clients[0];
        out.cleanStart = [A.goal().k, B.goal().k, A.goal().fail, B.goal().fail];
        A.get().players[1].hp -= 20; G.run(1);
        out.cleanHit = [A.goal().fail, B.goal().fail];
        G = CT.mkGame('casino', 99, 2, 60, 20, 'team'); A = G.A; B = G.clients[0];
        B.cv.dispatchEvent(new KeyboardEvent('keydown', { key: 'f', bubbles: true }));
        G.run(2); out.teamIdle = [A.goal().fail, B.goal().fail, A.get().phase];
        A.get().players[1].hp = 0; G.run(1);
        out.teamDown = [A.goal().fail, B.goal().fail];
        out.rolled = null;
        return out;
      });
      t.eq(r.cleanStart, ['clean', 'clean', 0, 0], 'Ziel zu Beginn');
      t.eq(r.cleanHit, [1, 1], 'Fehlschlag kommt beim Client an');
      t.eq(r.teamIdle, [0, 0, 2], 'team ohne Niederschlag (im Ueberfall)');
      t.eq(r.teamDown, [1, 1], 'team scheitert und der Client sieht es');
    },
  },
  {
    name: 'Nebenziele: Auswahl ohne erzwungenes Ziel stimmt im Coop auf Host und Client',
    async run(t) {
      await t.loadTool('loopnet.js'); await t.loadInpage('coop.js');
      const r = await t.page.evaluate(SC => {
        const bad = [];
        for (const sc of SC) for (const seed of [11, 202, 3033]) {
          const G = CT.mkGame(sc, seed, 3);
          const ks = G.insts.map(d => d.goal().k);
          if (new Set(ks).size !== 1) bad.push(sc + '#' + seed + ': ' + ks.join(','));
        }
        return bad;
      }, SC);
      t.eq(r, [], 'Host und Clients wuerfeln verschieden');
    },
  },
  {
    name: 'Nebenziele: HUD zeichnet in beiden Phasen fuer jedes Ziel und jede Karte',
    async run(t) {
      const n = await t.page.evaluate(SC => {
        const D = __dbg; let n = 0;
        for (const sc of SC) for (const k of Object.keys(D.GOALS)) {
          D.setScenario(sc); D.setSeedMode('random'); D.setGoal(k); D.buildLay(D.layoutFor(5));
          D.draw(); D.startHeist(false); for (let i = 0; i < 20; i++) D.update(1 / 30); D.draw(); n++;
        }
        D.setGoal(null);
        return n;
      }, SC);
      t.eq(n, SC.length * 5, 'Zeichendurchlaeufe');
    },
  },
];
