/* Kloetzchen-Stil: Effekte (Ticket 198, Schritt 5 baut sie ueberall aus). register(KL) traegt Haken ein (KL.fx): 'fig-tot' (neue Leiche einer Art aus K.burstArts, zerfaellt in ihre Teile), 'car-wreck' (neues Wrack, das Auto zerfaellt,
   Funken, Rauch, Blitz), 'casing' (Huelse beim Schuss), 'frame' (je Bild: Leuchten von Blaulicht und Alarm). Ausgeloest nur vom Zustand, den auch ein Client hat (figs3d, fx3d), nie von Host-Code.
   Auswerten: k.collect(() => Bauer) sammelt die Teile, k.spawnDeb(parts, x, y, {k Tempo, up, em Glut, split, scale}) laesst sie fliegen. */
export function register(KL) {
  const shot = new Map();
  KL.fx('fig-tot', (k, { o, e, art }) => {
    const o2 = Object.assign({}, o, { col: 6, lie: 0, hit: 0, al: 1, ar: 0 }), e2 = Object.assign({}, e, { lie: 0 }), b = KL.figs[art];
    if (!b) return; const parts = k.collect(() => b(k, o2, e2)); k.spawnDeb(parts, o.x, o.y, { k: 1 }); k.sparkAt(o.x, o.y, 14, 10, 150, 1); k.flash(o.x, o.y, .5);
  });
  KL.fx('car-wreck', (k, { o, e, look }) => {
    const b = KL.cars[look.k && KL.cars[look.k] ? look.k : 'civ']; if (!b) return;
    const parts = k.collect(() => b(k, Object.assign({}, o, { k: look.k && look.k !== 'wreck' ? look.k : 'civ', bl: 0 }), e, look));
    k.spawnDeb(parts, o.x, o.y, { k: 1.7, up: .75, em: .55, split: 1, scale: .8 }); k.sparkAt(o.x, o.y, 16, 44, 200, 1); k.smokeAt(o.x, o.y, 12, 9, 1.8); k.flash(o.x, o.y, .8);
  });
  KL.fx('casing', (k, { o }) => {
    const kk = Math.round(o.x / 40) + ':' + Math.round(o.y / 40), lt = shot.get(kk) || -9; if (k.time - lt <= .09) return; shot.set(kk, k.time); if (shot.size > 64) shot.clear();
    const a = o.a + Math.PI / 2 + k.rr(-.4, .4), parts = k.collect(() => { k.state(0, 1); k.rotY(o.x, o.y, o.a, 1); k.part(k.root, 8, 24, 5, 2.4, 1.1, 1.1, k.colOf(k.FG.gold), .15) });
    k.spawnDeb(parts, o.x - Math.cos(a) * 10, o.y - Math.sin(a) * 10, { k: .22, up: .5 });
  });
  KL.fx('frame', (k) => {
    const { fp, hc, KC, X } = k;
    for (const [o, e] of k.cars) if (e.bar && o.bl) {
      const a = o.bl === 1, c1 = hc(a ? KC.car.bar[0] : KC.car.bar[1]), c2 = hc(a ? KC.car.bar[1] : KC.car.bar[0]), ca = Math.cos(o.a), sa = Math.sin(o.a), Lc = o.L * k.C.carK[0], bh = (o.k === 'pol' ? 28 : 11 + (e.h - 11) * .76 + 2.4) + 2, bx = o.k === 'pol' ? -Lc * .03 : Lc / 2 - Lc * .15, wz = o.W * k.C.carK[1] * .22;
      for (const [sz, c] of [[-1, c1], [1, c2]]) { const lx = o.x + ca * bx - sa * sz * wz, ly = o.y + sa * bx + ca * sz * wz; fp(k.FA, lx, ly, bh, 13, 0, c, .72); fp(k.FA, lx, ly, bh, 5, 0, [1, 1, 1], .7) }
      fp(k.FA, o.x, o.y, .5, 92, 0, c1, .2, 0, 0, 1); fp(k.FA, o.x, o.y, .5, 60, 0, c2, .12, 0, 0, 1);
    }
    if (X.alarm) { let n = 0; for (const l of k.light) if (l.k === 'alarm') { fp(k.FA, l.x, l.y, 56, 12 + 16 * l.i, 0, hc(0xff2a1c), .2 + .6 * l.i); const a = k.alarmPh * KC.alarm.spin + n++ * Math.PI; for (let j = 1; j <= 6; j++) fp(k.FA, l.x + Math.cos(a) * j * 22, l.y + Math.sin(a) * j * 22, .5, 10 + j * 6, 0, hc(0xff2a1c), .42 * l.i + .06, 0, 0, 1) } }
  });
}
