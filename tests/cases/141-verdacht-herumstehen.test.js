// Phase-1-Verdacht, Luecken aus Ticket #20: Herumstehen (CFG.loiter) und Sperrzone ohne Beute.
// Bestand: 81 (Team-Balken), 83 (Beobachterregeln mit Beute und Stehlen, Gnadenfrist, Starren, Abbau), 134 (Museum), 41 (Alarm nennt den Spieler). Hier fehlte:
// (1) Herumstehen: Wer im Gebaeude kaum von der Stelle kommt und dabei von einem Angestellten gesehen wird, sammelt Verweilzeit dw; ab warn s Warnung (Ton, Meldung, der Angestellte schaut hin),
//     ab after s fuellt rate pro Sekunde den Balken. Bewegen, Zivilisten und fehlende Sicht zaehlen nicht.
// (2) Sperrzone: Wer ohne Beute in einer Sperrzone gesehen wird, fuellt den Balken mit der vollen Rate (Wache 48, Angestellte 34), der Sicht gerade ausserhalb nicht.
// (3) Bei vollem Balken ohne Gnadenfrist kommt der Alarm: Phase 2, Banner nennt den Grund.
// Alle Raten sind Rate mal lgM('sus') minus CFG.watch.down (net 1), wie in 83.
const BANK = `(() => { const D = __dbg; D.sessReset(); D.setScenario('bank'); D.setSeedMode('classic'); D.setLage([]); D.buildSeed('classic'); D.CFG.watch.grace = 0; D.CFG.policeAt = 1e6; D.CFG.policeForced = 1e6;
  const g = D.get(), tel = g.npcs.find(q => q.k === 'tel'), me = g.me;
  g.npcs.forEach(q => { if (q !== tel) q.st = 'away'; }); g.cams.forEach(c => { c.off = true; });
  // zwei Punkte vor dem Kassierer (Sicht frei, nicht begehbar-blockiert, keine Sperrzone), mehr als loiter.still auseinander
  const ok = (x, y) => !D.isSol(Math.floor(x / 32), Math.floor(y / 32)) && D.los(tel.x, tel.y, x, y) && !D.world().restricted(x, y);
  let sp = null; for (const d of [60, 70, 80]) for (const d2 of [120, 110, 130, 140, 100]) if (!sp && d2 - d >= 40 && ok(tel.x, tel.y + d) && ok(tel.x, tel.y + d2)) sp = [{ x: tel.x, y: tel.y + d }, { x: tel.x, y: tel.y + d2 }];
  return { D, g, tel, me, sp, lg: D.lgM('sus'), dn: D.CFG.watch.net ? D.CFG.watch.down : 0, L: D.CFG.loiter }; })()`;

module.exports = [
  {
    name: 'Herumstehen: im Blick eines Kassierers waechst die Verweilzeit, ab warn s kommen Warnton und Meldung, der Balken bleibt bis after s leer und waechst danach mit loiter.rate',
    async run(t) {
      const r = await t.page.evaluate(`(() => { const H = ${BANK}, D = H.D, me = H.me, tel = H.tel; if (!H.sp) return { err: 'kein Punkt vor dem Kassierer' };
        const al = []; const a0 = D.SND.alert; D.SND.alert = (...a) => { al.push(a.length); return a0.apply(D.SND, a); };
        const o = { L: H.L, lg: H.lg, dn: H.dn, tl: [] }; D.setSus(0); me.dw = 0; me.dwT = 0; me.dx = H.sp[0].x; me.dy = H.sp[0].y; me.lw = 0;
        const step = () => { me.x = H.sp[0].x; me.y = H.sp[0].y; tel.x = tel.x; D.update(1 / 30); };
        let s = 0, susAtWarn = null, warnAt = null, afterAt = null, sus0 = null;
        for (let i = 0; i < 30 * 12; i++) { step(); s += 1 / 30;
          if (warnAt == null && me.lw) { warnAt = s; susAtWarn = D.get().sus; o.alerts = al.length; o.msg = D.msgs().feed.some(m => /Angestellter wird auf dich aufmerksam/.test(m)); o.banner = (D.msgs().banner || ''); }
          if (warnAt != null && s - warnAt < .5 && tel.look && tel.look.t > 0) o.look = true; if (warnAt != null && tel.alert > 0) o.alert = true;
          if (s > H.L.after + 1.2 && sus0 == null) sus0 = [D.get().sus, s]; }
        o.warnAt = warnAt; o.susAtWarn = susAtWarn; o.dw = me.dw; o.sus1 = sus0; o.sus2 = [D.get().sus, s];
        D.SND.alert = a0; return o; })()`);
      t.ok(!r.err, r.err);
      t.ok(r.warnAt != null && Math.abs(r.warnAt - r.L.warn) < 1.6, 'Warnung nach rund warn s (' + r.L.warn + '): ' + r.warnAt);
      t.eq(r.susAtWarn, 0, 'bei der Warnung ist der Balken noch leer');
      t.ok(r.alerts >= 1, 'Warnton (SND.alert) wurde ausgeloest: ' + r.alerts);
      t.eq(r.msg, true, 'Meldung "Ein Angestellter wird auf dich aufmerksam."');
      t.eq(r.banner, 'Nicht herumstehen!', 'Banner');
      t.eq(r.look, true, 'der Angestellte schaut zum Spieler');
      t.eq(r.alert, true, 'der Angestellte ist aufmerksam (alert)');
      const rate = r.L.rate * r.lg - r.dn, dt = r.sus2[1] - r.sus1[1];
      t.ok(r.sus1[0] > 0, 'nach after s steigt der Balken: ' + r.sus1[0]);
      t.ok(Math.abs((r.sus2[0] - r.sus1[0]) / dt - rate) < Math.abs(rate) * .2 + .5, 'Anstieg ' + ((r.sus2[0] - r.sus1[0]) / dt).toFixed(1) + ' pro s, erwartet ' + rate.toFixed(1));
    },
  },
  {
    name: 'Herumstehen: wer sich bewegt (mehr als loiter.still pro Sekunde), ohne Sicht steht oder von Zivilisten gesehen wird, sammelt nichts; aus dem Blick baut die Verweilzeit ab',
    async run(t) {
      const r = await t.page.evaluate(`(() => { const H = ${BANK}, D = H.D, me = H.me, tel = H.tel; if (!H.sp) return { err: 'kein Punkt vor dem Kassierer' };
        const o = {}, reset = () => { D.setSus(0); me.dw = 0; me.dwT = 0; me.lw = 0; me.dx = H.sp[0].x; me.dy = H.sp[0].y; };
        // (a) Pendeln zwischen zwei Punkten, jede Sekunde ein Wechsel (Strecke > still)
        o.dist = Math.hypot(H.sp[1].x - H.sp[0].x, H.sp[1].y - H.sp[0].y); reset(); let mx = 0;
        for (let i = 0; i < 30 * 10; i++) { const k = Math.floor(i / 30) % 2; me.x = H.sp[k].x; me.y = H.sp[k].y; D.update(1 / 30); mx = Math.max(mx, me.dw); }
        o.moveDw = mx; o.moveSus = D.get().sus;
        // (b) Zivilist statt Angestellter
        reset(); tel.k = 'civ'; mx = 0; for (let i = 0; i < 30 * 10; i++) { me.x = H.sp[0].x; me.y = H.sp[0].y; D.update(1 / 30); mx = Math.max(mx, me.dw); } o.civDw = mx; tel.k = 'tel';
        // (c) ohne Sicht (Angestellter weg): bleibt 0; danach erst aufbauen, dann Sicht weg: Abbau
        tel.st = 'away'; reset(); mx = 0; for (let i = 0; i < 30 * 10; i++) { me.x = H.sp[0].x; me.y = H.sp[0].y; D.update(1 / 30); mx = Math.max(mx, me.dw); } o.awayDw = mx; tel.st = 'idle';
        reset(); for (let i = 0; i < 30 * 4.5; i++) { me.x = H.sp[0].x; me.y = H.sp[0].y; D.update(1 / 30); } o.built = me.dw;
        tel.st = 'away'; for (let i = 0; i < 30 * 2; i++) { me.x = H.sp[0].x; me.y = H.sp[0].y; D.update(1 / 30); } o.after2 = me.dw; o.lwAfter = me.lw;
        return o; })()`);
      t.ok(!r.err, r.err);
      t.ok(r.dist >= 40, 'Aufbau: Pendelstrecke ' + r.dist);
      t.ok(r.moveDw < .5, 'in Bewegung waechst die Verweilzeit nicht: ' + r.moveDw);
      t.eq(r.moveSus, 0, 'in Bewegung bleibt der Balken leer');
      t.eq(r.civDw, 0, 'Zivilisten zaehlen nicht');
      t.eq(r.awayDw, 0, 'ohne Sicht (Angestellter weg) zaehlt nichts');
      t.ok(r.built > 3.5, 'Aufbau der Verweilzeit im Blick: ' + r.built);
      t.ok(r.after2 < r.built - .5, 'aus dem Blick baut sie ab: ' + r.built + ' -> ' + r.after2);
    },
  },
  {
    name: 'Sperrzone: ohne Beute und ohne Stehlen fuellt eine Wache im Blick den Balken mit 48 pro s (minus Abbau), gleicher Abstand ausserhalb der Zone gibt nichts',
    async run(t) {
      const r = await t.page.evaluate(`(() => { const D = __dbg; D.sessReset(); D.setScenario('jewel'); D.CFG.jewGen.on = 0; D.setSeedMode('random'); D.setLage([]); D.buildSeed(654); D.CFG.watch.grace = 0; D.CFG.policeAt = 1e6; D.CFG.policeForced = 1e6;
        const g = D.get(), me = g.me, W = D.world(), grd = g.npcs.find(q => q.k === 'grd'); if (!grd) return { err: 'keine Wache' };
        g.npcs.forEach(q => { if (q !== grd) q.st = 'away'; }); g.cams.forEach(c => { c.off = true; });
        // ein Paar Punkte (Wache, Spieler) 50 px auseinander, beide frei, Sicht frei, Spieler in der Sperrzone; und ein Paar daneben ausserhalb
        const free = (x, y) => !D.isSol(Math.floor(x / 32), Math.floor(y / 32));
        let inZ = null, outZ = null;
        for (let ty = 0; ty < W.H && !(inZ && outZ); ty++) for (let tx = 0; tx < W.W && !(inZ && outZ); tx++) {
          const px = tx * 32 + 16, py = ty * 32 + 16, gx = px - 50, gy = py; if (!free(px, py) || !free(gx, gy) || !D.los(gx, gy, px, py)) continue;
          if (!inZ && W.restricted(px, py) && W.restricted(gx, gy)) inZ = { px, py, gx, gy };
          if (!outZ && !W.restricted(px, py) && !W.restricted(gx, gy) && px > 100 && py > 100) outZ = { px, py, gx, gy }; }
        if (!inZ || !outZ) return { err: 'keine Punktpaare', inZ, outZ };
        const run = (P, who) => { D.setSus(0); me.units = 0; me.loot = 0; me.thf = 0; who.look = null; let s = 0; for (let i = 0; i < 15; i++) { who.x = P.gx; who.y = P.gy; who.a = 0; me.x = P.px; me.y = P.py; me.thf = 0; D.update(1 / 30); s++; } return D.get().sus / (s / 30); };
        const o = { lg: D.lgM('sus'), dn: D.CFG.watch.net ? D.CFG.watch.down : 0 };
        o.grdIn = run(inZ, grd); o.grdOut = run(outZ, grd);
        return o; })()`);
      t.ok(!r.err, r.err + ' ' + JSON.stringify(r));
      const wg = 48 * r.lg - r.dn, ws = 34 * r.lg - r.dn;
      t.ok(Math.abs(r.grdIn - wg) < wg * .15 + .5, 'Wache in der Sperrzone: ' + r.grdIn.toFixed(1) + ' pro s, erwartet ' + wg.toFixed(1));
      t.ok(r.grdOut <= .01, 'Wache sieht den Spieler ausserhalb der Zone ohne Beute nicht als Verdacht: ' + r.grdOut);
      if (r.k) {
        t.ok(Math.abs(r.staffIn - ws) < ws * .15 + .5, 'Angestellte in der Sperrzone: ' + r.staffIn.toFixed(1) + ' pro s, erwartet ' + ws.toFixed(1));
        t.ok(r.staffOut <= .01, 'Angestellte ausserhalb: ' + r.staffOut);
      }
    },
  },
  {
    name: 'Sperrzone: eine Angestellte im Blick (hinter dem Tresen) fuellt den Balken ohne Beute mit 34 pro s (minus Abbau), vor der Zone nichts',
    async run(t) {
      const r = await t.page.evaluate(`(() => { const H = ${BANK}, D = H.D, me = H.me, tel = H.tel, W = D.world();
        const free = (x, y) => !D.isSol(Math.floor(x / 32), Math.floor(y / 32));
        let inZ = null, outZ = null;
        for (let ty = 0; ty < W.H && !(inZ && outZ); ty++) for (let tx = 0; tx < W.W && !(inZ && outZ); tx++) {
          const px = tx * 32 + 16, py = ty * 32 + 16, gx = px, gy = py - 50; if (!free(px, py) || !free(gx, gy) || !D.los(gx, gy, px, py)) continue;
          if (!inZ && W.restricted(px, py)) inZ = { px, py, gx, gy };
          if (!outZ && !W.restricted(px, py) && px > 100) outZ = { px, py, gx, gy }; }
        if (!inZ || !outZ) return { err: 'keine Punktpaare' };
        const run = P => { D.setSus(0); me.units = 0; me.loot = 0; me.thf = 0; me.dw = 0; me.dwT = 0; let s = 0; for (let i = 0; i < 15; i++) { tel.x = P.gx; tel.y = P.gy; tel.a = Math.PI / 2; me.x = P.px; me.y = P.py; me.thf = 0; me.dw = 0; D.update(1 / 30); s++; } return D.get().sus / (s / 30); };
        return { lg: H.lg, dn: H.dn, inn: run(inZ), out: run(outZ) }; })()`);
      t.ok(!r.err, r.err);
      const ws = 34 * r.lg - r.dn;
      t.ok(Math.abs(r.inn - ws) < ws * .15 + .5, 'Angestellte, Spieler in der Sperrzone: ' + r.inn.toFixed(1) + ' pro s, erwartet ' + ws.toFixed(1));
      t.ok(r.out <= .01, 'Angestellte, Spieler vor der Zone ohne Beute: ' + r.out);
    },
  },
  {
    name: 'Alarm durch Herumstehen: ohne Gnadenfrist startet der Ueberfall (Phase 2), sobald der Balken 100 erreicht, mit dem Grund Herumstehen im Banner',
    async run(t) {
      const r = await t.page.evaluate(`(() => { const H = ${BANK}, D = H.D, me = H.me; if (!H.sp) return { err: 'kein Punkt vor dem Kassierer' };
        D.setSus(0); me.dw = 0; me.dwT = 0; me.dx = H.sp[0].x; me.dy = H.sp[0].y; me.lw = 0; let s = 0;
        for (let i = 0; i < 30 * 90 && D.get().phase === 1; i++) { me.x = H.sp[0].x; me.y = H.sp[0].y; D.update(1 / 30); s += 1 / 30; }
        return { phase: D.get().phase, s, rate: H.L.rate * H.lg - H.dn, L: H.L, feed: D.msgs().feed.join(' | ') }; })()`);
      t.ok(!r.err, r.err);
      t.eq(r.phase, 2, 'Alarm nach ' + r.s.toFixed(1) + ' s Herumstehen');
      const soll = r.L.after + 100 / r.rate;
      t.ok(Math.abs(r.s - soll) < soll * .2 + 2, 'Dauer ' + r.s.toFixed(1) + ' s, erwartet rund ' + soll.toFixed(1) + ' s (after + 100 / Rate)');
    },
  },
];
