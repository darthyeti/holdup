// Polizei und Barrikaden: Lehnen, Schild-Beamte, Scharfschuetzen, Granaten (Verfahren aus docs/tests-und-messwerte.md, hier wiederholbar).
// Alle Tests laufen auf der klassischen Bank (Seed-Modus classic ist der Standard der Debug-Seite) und setzen Zustand direkt.

module.exports = [
  {
    name: 'Lehnen: ohne F stoppt die Kugel an der Barrikade, mit F trifft sie',
    async run(t) {
      const r = await t.page.evaluate(() => {
        const D = __dbg, k = D.keys;
        function trial(lean) {
          D.setScenario('bank'); D.reset(); D.startHeist(false);
          let g = D.get(); g.me.mat = 4;
          const bar = g.its.find(i => i.t === 'bar' && i.b.n === 'Westtür');
          bar.act(g.me);
          for (let i = 0; i < 90; i++) D.update(1 / 30);                 // Bau abwarten
          g = D.get(); g.en.length = 0;
          const cop = D.mkCop(-48, 304, false);
          Object.assign(cop, { mode: 'post', rt: 1e9, cool: 1e9, post: { x: -48, y: 304, a: 0 } });
          D.get().en.push(cop);
          const hp0 = cop.hp;
          k.f = lean ? 1 : 0; k[' '] = 1;
          let moved = 0, startX = null;
          for (let i = 0; i < 60; i++) {
            const s = D.get(), me = s.me;
            me.x = 47; me.y = 304; me.hp = 100;
            const c = s.en.find(e => e === cop) || cop;
            c.x = -48; c.y = 304; c.post = { x: -48, y: 304, a: 0 }; c.cool = 1e9;
            D.mouse.x = -48; D.mouse.y = 304; D.mouse.t = s.time;
            D.update(1 / 30);
          }
          k.f = 0; k[' '] = 0; D.clearKeys && D.clearKeys();
          const me = D.get().me;
          return { dmg: hp0 - cop.hp, ln: me.ln };
        }
        const a = trial(false), b = trial(true);
        return { a, b };
      });
      t.note('Schaden ohne F ' + r.a.dmg + ', mit F ' + r.b.dmg + ', Lehnzustand ' + r.b.ln);
      t.eq(r.a.dmg, 0, 'ohne Lehnen darf nichts durchkommen (Schaden ' + r.a.dmg + ')');
      t.ok(r.b.dmg > 0, 'mit F muss die Kugel den Beamten treffen (Schaden ' + r.b.dmg + ')');
    },
  },
  {
    name: 'Schild-Beamte: Schild nimmt Kugeln von vorn mit Verschleiss, von hinten trifft es den Koerper',
    async run(t) {
      const r = await t.page.evaluate(() => {
        const D = __dbg;
        D.setScenario('bank'); D.reset(); D.startHeist(false);
        D.get().en.length = 0;
        const cop = D.mkCop(400, 350, 'shield');
        Object.assign(cop, { mode: 'post', rt: 1e9, cool: 1e9, post: { x: 400, y: 350, a: Math.PI }, a: Math.PI });
        D.get().en.push(cop);
        const pool = D.CFG.shield.pool, hp0 = cop.hp;
        const fire = (dir) => {            // dir 1 = Kugel kommt von vorn (Westen), -1 = von hinten
          D.get().bl.push({ id: 9000 + Math.floor(Math.random() * 1e6), x: 400 - 14 * dir, y: 350, vx: 720 * dir, vy: 0, l: .8, o: 1, own: 0, d: 50 });
          for (let i = 0; i < 3; i++) { cop.x = 400; cop.y = 350; cop.a = Math.PI; cop.cool = 1e9; D.update(1 / 60); }
        };
        const out = {};
        fire(1); out.front = { sh: cop.sh, hp: cop.hp };
        fire(-1); out.rear = { sh: cop.sh, hp: cop.hp };
        let n = 1; while (cop.sh > 0 && n < 20) { fire(1); n++; }
        out.hitsToBreak = n; out.afterBreak = { sh: cop.sh, hp: cop.hp };
        fire(1); out.frontAfter = { sh: cop.sh, hp: cop.hp };
        out.pool = pool; out.hp0 = hp0;
        return out;
      });
      t.eq(r.front.hp, r.hp0, 'Schuss von vorn darf den Koerper nicht treffen');
      t.eq(r.front.sh, r.pool - 50, 'Schild-Verschleiss von vorn');
      t.eq(r.rear.sh, r.front.sh, 'von hinten bleibt der Schild heil');
      t.eq(r.rear.hp, r.hp0 - 50, 'von hinten trifft der Koerper');
      t.ok(r.afterBreak.sh <= 0, 'Schild muss irgendwann brechen');
      t.ok(r.frontAfter.hp < r.afterBreak.hp, 'nach dem Bruch trifft auch ein Schuss von vorn');
    },
  },
  {
    name: 'Scharfschuetzen: Laser rastet ein, Schuss durchschlaegt Fenster, gesichertes Fenster schuetzt',
    async run(t) {
      const r = await t.page.evaluate(() => {
        const D = __dbg;
        function setup() {
          D.setScenario('bank'); D.reset(); D.startHeist(false);
          const g = D.get(); g.en.length = 0;
          const L = D.LAY(), po = L.snp.slice().sort((a, b) => Math.abs(a.x - 496) - Math.abs(b.x - 496))[0];
          const sn = D.mkSniper(po); sn.cd = 0; g.en.push(sn);
          return { po, sn, L };
        }
        const out = {};
        // 1) Fenster offen: Schuss nach etwa 1,7 s, 100 -> 45 HP, Fenster wird zerschossen
        {
          const { po, sn } = setup(), me = D.get().me;
          out.winBefore = D.world().cell(14, 12);
          let aimMax = 0, t = 0;
          for (; t < 6 * 60 && me.hp >= 100; t++) { sn.x = po.x; sn.y = po.y; me.x = 464; me.y = 330; D.update(1 / 60); aimMax = Math.max(aimMax, sn.aim); }
          out.shotAfter = +(t / 60).toFixed(2); out.hp = me.hp; out.aimMax = +aimMax.toFixed(2); out.winAfter = D.world().cell(14, 12);
        }
        // 2) Fenster gesichert: Sicht ist zu, der Laser zaehlt nicht hoch
        {
          const { po, sn } = setup(), me = D.get().me;
          me.mat = 4; me.x = 464; me.y = 344;
          const it = D.get().its.find(i => i.t === 'wbar' && i.w.x === 14 && i.w.y === 12);
          out.hasWbar = !!it;
          if (it) { it.act(me); }
          let aimMax = 0;
          for (let i = 0; i < 4 * 60; i++) { sn.x = po.x; sn.y = po.y; me.x = 464; me.y = 330; D.update(1 / 60); aimMax = Math.max(aimMax, sn.aim); }
          out.sealedAim = aimMax; out.sealedHp = me.hp; out.sealedCell = D.world().cell(14, 12);
        }
        out.cfg = { aim: D.CFG.snp.aim, dmg: D.CFG.snp.dmg };
        return out;
      });
      t.eq(r.winBefore, 'W', 'Fenster vor dem Schuss');
      t.ok(r.aimMax > 0.3, 'Laser muss einrasten (aim ' + r.aimMax + ')');
      t.ok(Math.abs(r.shotAfter - r.cfg.aim) < 0.6, 'Schuss nach etwa ' + r.cfg.aim + ' s, war ' + r.shotAfter);
      t.eq(r.hp, 100 - r.cfg.dmg, 'Schaden');
      t.eq(r.winAfter, 'w', 'Fenster nach dem Schuss zerschossen');
      t.ok(r.hasWbar, 'Fensterbarrikade als Item vorhanden');
      t.eq(r.sealedHp, 100, 'gesichertes Fenster: kein Schaden');
      t.eq(r.sealedAim, 0, 'gesichertes Fenster: Laser bleibt aus');
    },
  },
  {
    name: 'Granaten: Blendzeit nach Abstand und Blickrichtung, Gas schadet in der Wolke',
    async run(t) {
      const r = await t.page.evaluate(() => {
        const D = __dbg;
        D.setScenario('bank'); D.reset(); D.startHeist(false);
        D.get().en.length = 0;
        const F = D.CFG.gren.flash, out = { exp: {}, got: {} };
        const test = (name, d, away) => {
          const me = D.get().me; me.bl = 0; me.hp = 100;
          me.x = 400 + d; me.y = 350; me.a = away ? 0 : Math.PI;   // Blick zur Granate (nach Westen) oder abgewandt
          D.flashBang(400, 350);
          out.got[name] = +D.get().me.bl.toFixed(2);
          const face = away ? F.face : 1;
          out.exp[name] = d > F.r ? 0 : +Math.max(F.minT, F.t * (1 - d / F.r) * face).toFixed(2);
        };
        test('nah', 20, false); test('mittel', 80, false); test('abgewandt', 80, true); test('fern', 260, false);
        // Gas
        const me = D.get().me; me.bl = 0; me.hp = 100; me.x = 410; me.y = 350;
        D.gasCloud(400, 350);
        out.cloud = D.gren().gc.length;
        for (let i = 0; i < 4 * 60; i++) { me.x = 410; me.y = 350; D.update(1 / 60); }
        out.gasHp = D.get().me.hp;
        return out;
      });
      for (const k of Object.keys(r.exp)) t.ok(Math.abs(r.got[k] - r.exp[k]) < 0.15, 'Blendzeit ' + k + ': ' + r.got[k] + ' statt ' + r.exp[k]);
      t.eq(r.cloud, 1, 'Gaswolke entsteht');
      t.ok(r.gasHp < 100, 'Gas muss schaden (HP ' + r.gasHp + ')');
    },
  },
];

// Lehn-Raster: Von jeder Barrikaden-Stelle (Tueren mit side, Fenster) laesst sich nach aussen schiessen (Verfahren: docs/tests-und-messwerte.md, Lehnen im Raster pruefen).
// Der Spieler steht innen mit 8 und 18 px Abstand zur Kante, ein Beamter 170 px davor in Achsrichtung muss Leben verlieren.
const GRID = [
  { sc: 'bank', seeds: ['classic', 11, 222, 3333] },
  { sc: 'jewel', seeds: [5, 66, 777] },
  { sc: 'gas', seeds: [5, 66, 777] },
  { sc: 'museum', seeds: [5, 66] },
  { sc: 'casino', seeds: [5, 66] },
];
module.exports.push(...GRID.map(gr => ({
  name: 'Lehnen im Raster: ' + gr.sc + ' (alle Tueren und Fenster, 8 und 18 px)',
  timeout: 240000,
  async run(t) {
    const r = await t.page.evaluate(gr => {
      const D = __dbg, k = D.keys, out = { bad: [], tried: 0, skipped: 0 };
      D.setScenario(gr.sc);
      for (const seed of gr.seeds) {
        if (seed === 'classic') { D.setSeedMode('classic'); D.reset(); } else { D.setSeedMode('random'); D.setLage([]); D.buildLay(D.layoutFor(seed)); }
        D.startHeist(false);
        const n = D.get().its.filter(i => (i.t === 'bar' && i.b.side) || i.t === 'wbar').length;
        for (let idx = 0; idx < n; idx++) for (const edge of [8, 18]) {
          D.startHeist && D.reset(); D.startHeist(false);
          const sites = D.get().its.filter(i => (i.t === 'bar' && i.b.side) || i.t === 'wbar');
          const it = sites[idx]; if (!it) continue;
          const c0 = it.t === 'bar' ? it.b.cells[0] : [it.w.x, it.w.y], iv = it.t === 'bar' ? it.b.iv : it.w.iv;
          const label = (gr.sc + '#' + seed + ' ' + (it.t === 'bar' ? it.b.n : 'Fenster ' + c0.join(',')) + ' @' + edge);
          if (!iv) { out.skipped++; continue; }
          const W0 = D.world(), sx = c0[0] * 32 + 16 + iv[0] * (16 + edge), sy = c0[1] * 32 + 16 + iv[1] * (16 + edge);
          // Steht man dort wirklich (Figurenradius 9)? Sonst ist die Stelle fuer das Lehnen von dieser Seite nicht erreichbar (Vitrine, Tresen, Wand direkt dahinter).
          if ([[-9, -9], [9, -9], [-9, 9], [9, 9]].some(([dx, dy]) => { const tx = Math.floor((sx + dx) / 32), ty = Math.floor((sy + dy) / 32); return !(tx === c0[0] && ty === c0[1]) && W0.isSol(tx, ty); })) { out.skipped++; continue; }
          let me = D.get().me; me.mat = 8; me.x = sx; me.y = sy;
          it.act(me);
          for (let i = 0; i < 120 && !['X', 'Y'].includes(D.world().cell(c0[0], c0[1])); i++) { me = D.get().me; me.x = c0[0] * 32 + 16 + iv[0] * (16 + edge); me.y = c0[1] * 32 + 16 + iv[1] * (16 + edge); D.update(1 / 30); }
          if (!['X', 'Y'].includes(D.world().cell(c0[0], c0[1]))) { out.bad.push(label + ': Barrikade wurde nicht gebaut'); continue; }
          D.get().en.length = 0;
          const W = D.world();
          // Beamter 170 px nach aussen, notfalls naeher an die Barrikade
          let dist = 170, cx, cy; const ox = c0[0] * 32 + 16 - iv[0] * 0, oy = c0[1] * 32 + 16;
          const clear = (d) => { for (let q = 20; q <= d; q += 4) { const tx = Math.floor((me.x - iv[0] * q) / 32), ty = Math.floor((me.y - iv[1] * q) / 32); if (tx === c0[0] && ty === c0[1]) continue; if (W.isSol(tx, ty) || W.isBul(tx, ty)) return false; } return true; };
          for (; dist >= 50; dist -= 10) { cx = me.x - iv[0] * dist; cy = me.y - iv[1] * dist; if (clear(dist)) break; }
          if (dist < 50) { out.skipped++; continue; }
          const cop = D.mkCop(cx, cy, false); Object.assign(cop, { mode: 'post', rt: 1e9, cool: 1e9, post: { x: cx, y: cy, a: 0 } });
          D.get().en.push(cop);
          const hp0 = cop.hp; out.tried++;
          k.f = 1; k[' '] = 1; D.mouse.t = -99;
          for (let i = 0; i < 40; i++) {
            me = D.get().me; me.x = c0[0] * 32 + 16 + iv[0] * (16 + edge); me.y = c0[1] * 32 + 16 + iv[1] * (16 + edge); me.hp = 100; me.a = Math.atan2(-iv[1], -iv[0]);
            cop.x = cx; cop.y = cy; cop.post = { x: cx, y: cy, a: 0 }; cop.cool = 1e9;
            D.update(1 / 30);
          }
          k.f = 0; k[' '] = 0;
          if (!(cop.hp < hp0)) out.bad.push(label + ': Beamter bei ' + dist + ' px unverletzt (Lehnen ' + D.get().me.ln + ')');
        }
      }
      return out;
    }, gr);
    t.note(r.tried + ' Stellen geprueft, ' + r.skipped + ' uebersprungen');
    t.ok(r.tried > 5, 'zu wenige Stellen gefunden (' + r.tried + ')');
    t.eq(r.bad.slice(0, 6), [], r.bad.length + ' Stellen ohne freies Schussfeld');
  },
})));
