/* Kloetzchen-Stil: Effekte (Ticket 198, Schritt 5). register(KL) traegt Haken ein (KL.fx): 'fig-tot' (neue Leiche einer Art aus K.burstArts, zerfaellt in ihre Teile), 'car-wreck' (neues Wrack, das Auto zerfaellt),
   'casing' (Huelse beim Schuss), 'frame' (je Bild: Blaulicht und Alarm leuchten, dazu Explosionen, Granaten, Gas und Rauch aus X.fx()). Ausgeloest nur von Zustand, den auch ein Client hat (figs3d, fx3d), nie von Host-Code.
   Auswerten: k.collect(() => Bauer) sammelt die Teile, k.spawnDeb(parts, x, y, {k Tempo, up, em Glut, split, scale}) laesst sie fliegen. Obergrenzen: der Kern kappt Teile, Funken und Rauch je Grafikstufe (KCFG.q), hier
   kommt dazu: je Ereignis hoechstens 14 Teile (Granaten, Saeulen, C4), bei X.lod >= 3 die Haelfte. Flach zur Seite: grosse Teile fliegen mit wenig Aufwaerts (hoechstens Wandhoehe 64), kleine hoch. */
export function register(KL) {
  const shot = new Map(), seenP = new WeakSet(), seenC = new Set(), seenS = new Set(); let primed = false, lastWreck = { x: 0, y: 0, t: -9 }, tPrev = -1;
  // Klotzhaufen an (x, y): n Teile in den Farben cols, Groesse s, fliegen vom Mittelpunkt weg (kleine Bausteine, Effekte ohne Figur oder Auto)
  const bricks = (k, x, y, n, cols, s, o) => {
    n = Math.min(14, n) >> ((k.X.lod | 0) >= 3 ? 1 : 0); if (n < 1) return;
    const parts = k.collect(() => { k.state(0, 1); k.rotY(x, y, 0, 1); for (let i = 0; i < n; i++) { const a = k.rr(0, 6.283), d = k.rr(2, 9), w = s * k.rr(.7, 1.4); k.part(k.root, Math.cos(a) * d, k.rr(6, 14), Math.sin(a) * d, w, w * k.rr(.5, 1), w * k.rr(.8, 1.3), k.colOf(cols[i % cols.length]), 0, k.rr(-.6, .6), k.rr(-.6, .6)) } });
    k.spawnDeb(parts, x, y, Object.assign({ k: 1 }, o));
  };
  // Platten laengs der laengsten Achse teilen, bis keine laenger ist als maxL (Weltpixel, vor dem Skalieren): grosse Dachplatten fliegen sonst als riesige Flaechen durchs Bild
  const cut = (k, parts, maxL) => {
    const T = k.THREE, out = [];
    for (const p of parts) {
      const ax = p.s.indexOf(Math.max(...p.s)), n = Math.min(6, Math.ceil(p.s[ax] / maxL)); if (n <= 1) { out.push(p); continue }
      for (let i = 0; i < n; i++) { const t = [0, 0, 0]; t[ax] = (i - (n - 1) / 2) * p.s[ax] / n; const s2 = p.s.slice(); s2[ax] = p.s[ax] / n * .96; out.push({ m: p.m.clone().multiply(new T.Matrix4().makeTranslation(t[0], t[1], t[2])), c: p.c, e: p.e, s: s2 }) }
    }
    return out;
  };
  const PLASTIC = [0xd9dde2, 0xff8a3a, 0x3b3f46, 0xffd23a], GASC = [0x8fb53a, 0xc7d946, 0x5e6b2c], SMK = [0xb9bfc7, 0x8a919b, 0x5b616b];
  KL.fx('fig-tot', (k, { o, e, art }) => {
    const o2 = Object.assign({}, o, { col: 6, lie: 0, hit: 0, al: 1, ar: 0 }), e2 = Object.assign({}, e, { lie: 0 }), b = KL.figs[art];
    if (!b) return; const parts = k.collect(() => b(k, o2, e2));
    k.spawnDeb(parts, o.x, o.y, { k: 1.25, up: 1.1 }); k.sparkAt(o.x, o.y, 16, 14, 170, 1); k.sparkAt(o.x, o.y, 8, 6, 90, 0); k.flash(o.x, o.y, .55);
  });
  KL.fx('car-wreck', (k, { o, e, look }) => {
    const kk = look.k && look.k !== 'wreck' && KL.cars[look.k] ? look.k : 'civ', b = KL.cars[kk]; if (!b) return;
    lastWreck = { x: o.x, y: o.y, t: k.time };
    const Lc = o.L * k.C.carK[0], parts = cut(k, k.collect(() => b(k, Object.assign({}, o, { k: kk, bl: 0 }), e, look)), Lc * .22), big = parts.filter(p => Math.max(...p.s) >= 12), small = parts.filter(p => Math.max(...p.s) < 12);
    // wenige grosse Teile flach zur Seite (niedrig, hoechstens Wandhoehe), viele kleine hoch und weit; die grossen werden halbiert, damit sie kein Dach durchschlagen
    k.spawnDeb(big, o.x, o.y, { k: 1.25, up: .25, em: .5, scale: .85 }); k.spawnDeb(small, o.x, o.y, { k: 1.6, up: .6, em: .55, scale: .85 });
    bricks(k, o.x, o.y, 12, PLASTIC, 5, { k: 1.4, up: .55, em: .4 });
    k.sparkAt(o.x, o.y, 16, 44, 200, 1); k.sparkAt(o.x, o.y, 30, 14, 120, 0); k.smokeAt(o.x, o.y, 12, 9, 1.8); k.flash(o.x, o.y, .7);
  });
  KL.fx('casing', (k, { o }) => {
    const kk = Math.round(o.x / 40) + ':' + Math.round(o.y / 40), lt = shot.get(kk) || -9; if (k.time - lt <= .09) return; shot.set(kk, k.time); if (shot.size > 64) shot.clear();
    const a = o.a + Math.PI / 2 + k.rr(-.4, .4), parts = k.collect(() => { k.state(0, 1); k.rotY(o.x, o.y, o.a, 1); k.part(k.root, 8, 24, 5, 2.4, 1.1, 1.1, k.colOf(k.FG.gold), .15) });
    k.spawnDeb(parts, o.x - Math.cos(a) * 10, o.y - Math.sin(a) * 10, { k: .22, up: .5 });
  });
  // neue Explosion (Zapfsaeule, C4, Mine, Claymore, Granatwerfer) und Blendgranate: Leuchtteilchen 'g' aus fx3d, nur einmal je Teilchen; Autoexplosion hat ihren eigenen Haken
  const boom = (k, q) => {
    if (k.time - lastWreck.t < 1 && Math.hypot(q.x - lastWreck.x, q.y - lastWreck.y) < 90) return;
    const white = String(q.c).startsWith('255,255,235'), s = Math.max(.5, Math.min(2, q.r / 160));
    if (white) { k.flash(q.x, q.y, 1); k.sparkAt(q.x, q.y, 14, 22, 190, 0); bricks(k, q.x, q.y, 6, [0xf2efe0, 0xc9ccd2], 3.4, { k: 1.1, up: .8 }); return }
    k.flash(q.x, q.y, .5 + .35 * s); k.sparkAt(q.x, q.y, 14, Math.round(16 * s), 180, 1); k.smokeAt(q.x, q.y, 10, Math.round(5 * s), 1.4);
    bricks(k, q.x, q.y, Math.round(8 * s), PLASTIC, 5.6, { k: 1.2 * s, up: .7, em: .35, split: 0 });
  };
  // Fensterscheibe zerschossen (Ticket 207): W wird w (Zustand im Raster, Host rechnet, Clients bekommen es im Schnappschuss). Der Haken sieht den Wechsel von W nach w im Raster (E.cellAt) und laesst
  // kurz Glas-Kloetzchen fliegen: klein, hell, wenige (je Stufe), liegen nur kurz. Werte in KCFG.glass (hier als Vorgabe eingetragen: n je Grafikstufe, Groesse von bis, Tempo, Aufwaerts, Liegezeit, Funken).
  const winSt = new Map(); let winKey = '';
  const glass = k => k.KC.glass || (k.KC.glass = { n: [6, 12, 18], size: [2, 4.2], k: .55, up: .55, rest: [.8, 1.6], em: .14, sparks: 6, col: [0xcfeeff, 0xa9d8f5, 0xe8f6ff] });
  const windows = k => {
    const L = k.X.LAY, W = L && L.wins; if (!W) return;
    const key = W.length + ':' + (W[0] ? W[0].x + ',' + W[0].y : '') + ':' + (W.length ? W[W.length - 1].x + ',' + W[W.length - 1].y : ''); if (key !== winKey) { winKey = key; winSt.clear() }
    const G = glass(k), q = Math.max(0, Math.min(2, k.X.gfx | 0));
    for (const w of W) {
      const c = k.E.cellAt(w.x, w.y), id = w.x + ',' + w.y, was = winSt.get(id); winSt.set(id, c);
      if (was !== 'W' || c !== 'w') continue;
      const n = G.n[q] >> ((k.X.lod | 0) >= 3 ? 1 : 0), ax = Math.abs(w.iv[0]) > Math.abs(w.iv[1]) ? 1 : 0; // ax: 1 wenn die Scheibe in y-Richtung liegt (Wand laeuft entlang y)
      const parts = k.collect(() => { k.state(0, 1); k.rotY(w.px, w.py, 0, 1); for (let i = 0; i < n; i++) { const u = k.rr(-13, 13), s = k.rr(G.size[0], G.size[1]); k.part(k.root, ax ? 0 : u, k.rr(20, 46), ax ? u : 0, s, s * k.rr(.5, 1), s * k.rr(.6, 1), k.colOf(G.col[i % G.col.length]), G.em, k.rr(-.5, .5), k.rr(-.5, .5)) } });
      k.spawnDeb(parts, w.px, w.py, { k: G.k, up: G.up, rest: G.rest, dir: [w.iv[0] * .5, w.iv[1] * .5] }); k.sparkAt(w.px, w.py, 32, G.sparks, 70, 1);
    }
  };
  KL.fx('frame', (k) => {
    const { fp, hc, KC, X } = k, D = X.fx ? X.fx() : null; windows(k);
    if (D) {
      if (!primed || k.time < tPrev - 1) { for (const q of D.pt) seenP.add(q); for (const c of D.gc) seenC.add(c.id); for (const c of D.smk) seenS.add(c.id); primed = true }
      else {
        for (const q of D.pt) if (!seenP.has(q)) { seenP.add(q); if (q.t === 'g' && (q.lt || q.r >= 200)) boom(k, q) }
        for (const c of D.gc) if (!seenC.has(c.id)) { seenC.add(c.id); bricks(k, c.x, c.y, 6, GASC, 4.6, { k: .8, up: .9 }); k.sparkAt(c.x, c.y, 10, 8, 80, 0) }
        for (const c of D.smk) if (!seenS.has(c.id)) { seenS.add(c.id); bricks(k, c.x, c.y, 5, SMK, 4.6, { k: .8, up: .9 }); k.smokeAt(c.x, c.y, 8, 3, 1.1) }
        if (seenC.size > 64) seenC.clear(); if (seenS.size > 64) seenS.clear();
      }
    }
    tPrev = k.time;
    for (let i = k.flashes.length - 1; i >= 0; i--) if (k.flashes[i].t > .11) k.flashes.splice(i, 1);
    for (const l of k.light) if ((l.k === 'red' || l.k === 'blue') && l.car) l.i = .5;
    for (const [o, e] of k.cars) if (e.bar && o.bl) {
      const a = o.bl === 1, c1 = hc(a ? KC.car.bar[0] : KC.car.bar[1]), c2 = hc(a ? KC.car.bar[1] : KC.car.bar[0]), h = KL.carHead(o), ca = Math.cos(h), sa = Math.sin(h), Lc = o.L * k.C.carK[0],
        bh = (o.k === 'pol' ? 36 : 11 + (e.h - 11) * .76 + 3.4) + 2, bx = o.k === 'pol' ? -Lc * .03 : Lc / 2 - Lc * .15, wz = o.W * k.C.carK[1] * .22;
      for (const [sz, c] of [[-1, c1], [1, c2]]) { const lx = o.x + ca * bx - sa * sz * wz, ly = o.y + sa * bx + ca * sz * wz; fp(k.FA, lx, ly, bh, 13, 0, c, .72); fp(k.FA, lx, ly, bh, 5, 0, [1, 1, 1], .7) }
      fp(k.FA, o.x, o.y, .5, 92, 0, c1, .2, 0, 0, 1); fp(k.FA, o.x, o.y, .5, 60, 0, c2, .12, 0, 0, 1);
    }
    if (X.alarm) { let n = 0; for (const l of k.light) if (l.k === 'alarm') { fp(k.FA, l.x, l.y, 56, 12 + 16 * l.i, 0, hc(0xff2a1c), .2 + .6 * l.i); const a = k.alarmPh * KC.alarm.spin + n++ * Math.PI; for (let j = 1; j <= 6; j++) fp(k.FA, l.x + Math.cos(a) * j * 22, l.y + Math.sin(a) * j * 22, .5, 10 + j * 6, 0, hc(0xff2a1c), .42 * l.i + .06, 0, 0, 1) } }
  });
}
