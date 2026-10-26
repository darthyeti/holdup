// Paket P4 (Balancing-Patch 1, 26. Oktober 2026): S2 Mine, Claymore und Granatwerfer mit rund 25 % mehr Schaden (dmg 138, 163, 138, pdmg bleibt),
// S3 das leise Aufschneiden der Vitrine (Juwelier, Phase 1) wird vom Dietrich verkuerzt (vorher blieb es auf allen Stufen bei 6,0 s, weil die leise Formel nur fuer Beute-Stuecke galt).
module.exports = [
  {
    name: 'Balancing: Vitrine leise aufschneiden wird mit dem Dietrich je Stufe schneller (Faktor .79, .685, .58), Einschlagen im Ueberfall und Beute-Stuecke bleiben, wie sie waren',
    async run(t) {
      const r = await t.page.evaluate(() => {
        const D = __dbg, out = { vit: [], smash: [], good: [] };
        const hold = (it, me, ms) => { let n = 0; for (; n < 30 * 40 && !it.done; n++) { me.x = it.x; me.y = it.y; D.keys.e = 1; D.update(1 / 30); } D.keys.e = 0; return +(n / 30).toFixed(2); };
        for (let lv = 0; lv <= 3; lv++) {
          D.sessReset(); D.SESSION.own = { pick: lv }; D.setScenario('jewel'); D.setSeedMode('random'); D.setLage([]); D.buildSeed(654);
          let G = D.get(), me = G.me; G.npcs.length = 0; G.en.length = 0; me.bag = 99;
          let it = G.its.find(i => i.t === 'vit' && i.ok(me));
          out.vit.push({ lv, f: +D.toolT(me, it).toFixed(3), s: hold(it, me) });
          D.sessReset(); D.SESSION.own = { pick: lv }; D.setScenario('jewel'); D.setSeedMode('random'); D.setLage([]); D.buildSeed(654);
          G = D.get(); me = G.me; D.startHeist(false, me); G.npcs.length = 0; G.en.length = 0; me.bag = 99;
          it = G.its.find(i => i.t === 'vit' && i.ok(me));
          out.smash.push({ lv, f: +D.toolT(me, it).toFixed(3) });
          D.sessReset(); D.SESSION.own = { pick: lv }; D.setScenario('museum'); D.setSeedMode('random'); D.setLage([]); D.buildSeed(31);
          G = D.get(); me = G.me; G.npcs.length = 0; G.en.length = 0; me.bag = 99;
          it = G.its.find(i => i.t === 'good' && i.k === 'art' && i.ok(me));
          out.good.push({ lv, f: +D.toolT(me, it).toFixed(3) });
        }
        return out;
      });
      t.eq(r.vit.map(q => q.f), [1, .79, .685, .58], 'Faktor der leisen Vitrine je Dietrich-Stufe 0 bis 3');
      t.ok(Math.abs(r.vit[0].s - 6) < .2, 'ohne Dietrich 6 s: ' + r.vit[0].s);
      t.ok(Math.abs(r.vit[1].s - 4.74) < .2 && Math.abs(r.vit[2].s - 4.11) < .2 && Math.abs(r.vit[3].s - 3.48) < .2, 'gehalten wird 4,7 s, 4,1 s, 3,5 s: ' + r.vit.map(q => q.s).join(', '));
      t.ok(r.vit[0].s > r.vit[1].s && r.vit[1].s > r.vit[2].s && r.vit[2].s > r.vit[3].s, 'jede Stufe ist schneller');
      t.eq(r.smash.map(q => q.f), [1, .7, .55, .4], 'Einschlagen im Ueberfall unveraendert (voller Dietrich-Faktor)');
      t.eq(r.good.map(q => q.f), [1, .79, .685, .58], 'leise Beute-Stuecke im Museum unveraendert');
    },
  },
  {
    name: 'Balancing: Mine, Claymore und Granatwerfer machen rund 25 % mehr Schaden an Gegnern (138, 163, 138), der Schaden an Spielern bleibt (30, 35, 30)',
    async run(t) {
      const r = await t.page.evaluate(() => {
        const D = __dbg, out = {}, C = D.CFG;
        out.cfg = { mine: C.trap.mine.dmg, claw: C.trap.claw.dmg, launch: C.spw.launch.dmg, pd: [C.trap.mine.pdmg, C.trap.claw.pdmg, C.spw.launch.pdmg] };
        D.sessReset(); D.setScenario('bank'); D.setSeedMode('random'); D.setLage([]); D.buildSeed(321);
        const G = D.get(); G.npcs.length = 0; G.en.length = 0;
        // Polizist mit 100 HP in d Pixeln Abstand vom Mittelpunkt: faellt er?
        const fall = (C0, d) => { G.en.length = 0; const x = 400, y = 300, e = D.mkCop(x + d, y); e.hp = 100; e.mhp = 100; G.en.push(e); D.blastAt(x, y, { dmg: C0.dmg, pdmg: C0.pdmg, r: C0.r, scorch: C0.scorch }, 0); return e.hp <= 0; };
        out.mine30 = fall(C.trap.mine, 30); out.mine45 = fall(C.trap.mine, 45);
        out.claw50 = fall(C.trap.claw, 50); out.claw70 = fall(C.trap.claw, 70);
        out.launch30 = fall(C.spw.launch, 30);
        return out;
      });
      t.eq([r.cfg.mine, r.cfg.claw, r.cfg.launch], [138, 163, 138], 'Schaden an Gegnern');
      t.eq(r.cfg.pd, [30, 35, 30], 'Schaden an Spielern bleibt');
      t.eq([r.mine30, r.claw50, r.launch30], [true, true, true], 'ein Polizist (100 HP) faellt bei 30 px (Mine, Werfer) und 50 px (Claymore), vorher ueberlebte er dort');
      t.eq([r.mine45, r.claw70], [false, false], 'weiter aussen bleibt er stehen (45 px, 70 px)');
    },
  },
];
