/* Kloetzchen-Stil: Fahrzeuge (Ticket 198, Schritt 3). register(KL) traegt je Art einen Bauer ein: (k, o, e, look), o Lage und Masse aus figs3d (x, y, a, L, W, k, row, fx, bl Blaulicht), e Eintrag aus V3CFG.cars (h, bar),
   look Farben aus k.carLook. Vorwaerts +x, oben +y, rechts +z, Radhaus unten. Arten: pol, civ, wreck, van, vh, tk. Hoechstens 40 Teile je Fahrzeug (carMax im Kern).
   Fahrtrichtung: figs3d meldet Wagen, die nach links fahren, mit fx -1 und um 180 Grad gedrehtem Winkel (Sprite gespiegelt); der Klotzbau braucht die wahre Richtung: KL.carHead(o). Nur Zustand aus figs3d (Client gleich). */
export function register(KL) {
  // wahre Fahrtrichtung (bei fx -1 ist der gemeldete Winkel um 180 Grad gedreht)
  KL.carHead = o => o.fx < 0 ? o.a + Math.PI : o.a;
  const car = (k, o, e, look) => {
    const { part, colOf, KC, C } = k, Lc = o.L * C.carK[0], Wc = o.W * C.carK[1], H = e.h, kind = o.k, KCar = KC.car, tt = k.time || 0;
    k.rotY(o.x, o.y, KL.carHead(o), 1); const R = k.root; k.state(0, 1);
    // Farben (Ticket 223): satter Lack ohne Abdunklung (die Dunkelung aus #200 gegen Ueberstrahlen entfaellt, dafuer daempft der Kern das Blaulicht auf dem eigenen Lack), zivile Autos aus der Palette KCar.pal
    const wheel = colOf(KCar.wheel), glass = colOf(KCar.glass), rim = colOf(0xc9ced6), dark = colOf(0x2a2e35), wr = 5.6;
    const pal = KCar.pal && kind === 'civ' ? colOf(KCar.pal[(o.row | 0) % KCar.pal.length]) : null, body = look.pol ? colOf(0x2250c8) : (pal || look.body), white = colOf(0xd5dae1), roof = look.pol ? white : (pal ? pal.clone().multiplyScalar(1.08) : look.roof.clone().multiplyScalar(.92));
    const cap = c => { const m = Math.max(c.r, c.g, c.b), t = colOf(0xd8dce2), top = Math.max(t.r, t.g, t.b) * .72; return m > top ? c.clone().multiplyScalar(top / m) : c };   // hellen Lack auf rund 0xd8dce2 mal .72 (linear) begrenzen, die Sonne hellt ihn wieder auf
    const shine = c => c.clone().multiplyScalar(1.35), bw = Wc * .92, wz = bw / 2 - 1;
    const lamps = (x0, x1, y, w) => { for (const s of [1, -1]) { part(R, x0, y, s * w, 1.4, 3.2, 7, colOf(KCar.lamp), 1.1); part(R, x1, y, s * w, 1.4, 3.2, 7, colOf(KCar.tail), .9) } };
    const bar = (x, y, on) => { const a = o.bl === 1; for (const s of [-1, 1]) part(R, x, y, s * Wc * .22, 4.6, 3.8, Wc * .34, colOf((s < 0) === a ? KCar.bar[0] : KCar.bar[1]), on ? 1.2 : .06) };
    const studs = (x, y, sx, sz, kk) => { if (!KC.studs) return; for (const a of [-1, 1]) for (const b of [-1, 1]) part(R, x + a * sx, y, b * sz, kk, 1.3, kk, roof) };
    const wheels = ax => { for (const a of ax) for (const sz of [1, -1]) { part(R, Lc * a, wr, sz * (wz + 1), wr * 2, wr * 2, 5.6, wheel); part(R, Lc * a, wr, sz * (wz + 4), wr * 1.1, wr * 1.1, 1, rim, .08) } };
    if (kind === 'wreck') {
      // ausgebrannt: dunkle Klotze, Dach eingedrueckt, Glut, Rauchfahne (Zeit aus der Spielzeit, je Wagen versetzt)
      const sc = colOf(KCar.scorch), cl = colOf(KCar.ember), fl = .3 + .25 * Math.sin(tt * 7 + o.x), dk2 = colOf(0x3a3330);
      part(R, 0, 7, 0, Lc, 8, Wc * .96, sc); part(R, Lc * .3, 12.5, 0, Lc * .3, 4, Wc * .9, sc); part(R, -Lc * .1, 13, 1, Lc * .3, 5, Wc * .7, dk2, 0, 0, .12);
      part(R, -Lc * .36, 11.5, 0, Lc * .2, 3, Wc * .8, dk2, 0, 0, -.1); part(R, -Lc * .1, 16.5, -2, Lc * .26, 2.4, Wc * .5, sc, 0, .1, .2);
      part(R, -Lc * .32, 11, -Wc * .2, 9, 3, 9, cl, fl, 0, .2); part(R, Lc * .1, 15, Wc * .16, 7, 3, 7, cl, fl * .7, 0, -.15); part(R, Lc * .38, 11, -Wc * .12, 5, 2, 5, cl, fl * .6);
      for (const [sx, sz, d] of [[.32, 1, 0], [.32, -1, 1.2], [-.32, 1, 0], [-.32, -1, 0]]) part(R, Lc * sx, wr - d, sz * (Wc / 2 - 1.6), wr * 2, wr * 2, 6, wheel);
      part(R, -Lc * .46, 4.2, Wc * .2, 9, 2.4, 3, dk2, 0, 0, .3); // abgerissenes Teil
      const key = Math.round(o.x / 6) + ',' + Math.round(o.y / 6), nx = smoke.get(key) || 0;
      if (tt > nx && k.smokeAt) { smoke.set(key, tt + .55 + Math.abs(Math.sin(o.x)) * .5); k.smokeAt(o.x, o.y, 14, 1, .8); if (smoke.size > 40) smoke.clear() }
      return 0;
    }
    // ---------- Fluchtwagen (Ticket 245): eine von vier Varianten je Auftrag, gleiche Grundflaeche, Hoehe und Kollision. Wahl aus LAY.seed (Karte, bei Host und Client gleich), eigene Palette (nicht die der zivilen Autos).
    // 0 Lieferwagen mit Firmenstreifen und Logo auf dem Dach, 1 dunkler Kleinbus mit getoenten Scheiben, 2 Pickup mit Plane, 3 alter Kastenwagen mit Rostflecken. Wartet er (steht still), steht die Schiebetuer offen
    // beziehungsweise die Hecktuer, der Fahrer sitzt im Fuehrerhaus (Kopf mit Muetze ueber der Scheibe).
    const flucht = () => {
      const LY = k.X.LAY || {}, seed = typeof LY.seed === 'number' ? LY.seed : (LY.bld ? LY.bld.x0 * 31 + LY.bld.y0 * 17 : 0), V = ((Math.imul(seed | 0, 2654435761) >>> 11) % 4 + 4) % 4, FP = KCar.fpal || [0xe8e4d4, 0x2a3340, 0x6a7b52, 0xb7b08a], AC = KCar.facc || [0xd8412f, 0x1f6fd0, 0x2f9e55, 0xe8a31c];
      const acc = colOf(AC[(((Math.imul(seed | 0, 40503) >>> 9) % AC.length) + AC.length) % AC.length]);
      const lp = waitPos.get('van') || { x: o.x, y: o.y, t: tt }; if (Math.hypot(lp.x - o.x, lp.y - o.y) > .6) { lp.x = o.x; lp.y = o.y; lp.t = tt } waitPos.set('van', lp); const open = tt - lp.t > .35;
      const bodyH = H - 11, cabL = Lc * .3, boxL = Lc - cabL - 1, X0 = -Lc / 2 + boxL / 2, gl2 = colOf(0x131c2a), c0 = cap(colOf(FP[V]));
      wheels([.32, -.32]); part(R, 0, 8, 0, Lc, 6, bw * .96, dark);
      part(R, Lc / 2 + .2, 8.6, 0, 2.6, 5, bw * .98, dark); part(R, -Lc / 2 - .2, 8.6, 0, 2.6, 5, bw * .98, dark); part(R, Lc / 2 + .7, 10.6, 0, 1.2, 3, bw * .3, rim, .12); lamps(Lc / 2 + .3, -Lc / 2 - .3, 12, bw * .34);
      // Fuehrerhaus (alle Varianten): Lack unten, Scheiben, kleines Dach, Fahrer
      const cab = (col, len) => { part(R, Lc / 2 - len / 2, 11 + bodyH * .25, 0, len, bodyH * .5, bw * .96, col); part(R, Lc / 2 - len / 2 - len * .08, 11 + bodyH * .65, 0, len * .84, bodyH * .3, bw * .88, gl2); part(R, Lc / 2 - len / 2 - len * .1, 11 + bodyH * .8 + .7, 0, len * .6, 1.4, bw * .78, col) };
      const driver = () => { part(R, Lc / 2 - cabL * .22, 11 + bodyH * .8 - 1, -bw * .2, 4.2, 4.6, 4.2, colOf(0xe3b58f)); part(R, Lc / 2 - cabL * .22, 11 + bodyH * .8 + 3, -bw * .2, 4.6, 1.6, 4.8, colOf(0x1c1f26)) };
      if (V === 0) { // Lieferwagen
        part(R, X0, 11 + bodyH / 2, 0, boxL, bodyH, bw, c0); cab(c0, cabL);
        for (const sg of [1, -1]) part(R, X0, 11 + bodyH * .42, sg * (bw / 2 + .3), boxL * .92, bodyH * .2, .8, acc);   // Firmenstreifen
        part(R, X0 + boxL * .08, 11 + bodyH + .8, 0, boxL * .42, 1.2, bw * .52, acc); part(R, X0 + boxL * .08, 11 + bodyH + 1.6, -bw * .1, boxL * .3, .6, 3, colOf(0xffffff)); part(R, X0 + boxL * .08, 11 + bodyH + 1.6, bw * .1, boxL * .2, .6, 3, colOf(0xffffff));   // Logo auf dem Dach
        if (open) { part(R, X0 + boxL * .12, 11 + bodyH * .45, bw / 2 + .2, boxL * .3, bodyH * .64, 1.2, dark); part(R, X0 - boxL * .2, 11 + bodyH * .45, bw / 2 + 2.2, boxL * .3, bodyH * .64, 1.2, c0) }
        else part(R, X0 + boxL * .12, 11 + bodyH * .45, bw / 2 + .3, .8, bodyH * .64, .8, colOf(0x30343b));
      } else if (V === 1) { // dunkler Kleinbus
        const bc = colOf(FP[1]);
        part(R, 0, 11 + bodyH * .3, 0, Lc * .98, bodyH * .6, bw, bc); part(R, -Lc * .02, 11 + bodyH * .6 + bodyH * .2, 0, Lc * .78, bodyH * .4, bw * .94, gl2); part(R, -Lc * .04, 11 + bodyH + .4, 0, Lc * .66, 1.6, bw * .8, bc);
        part(R, Lc * .44, 11 + bodyH * .62, 0, Lc * .1, 2.4, bw * .96, bc); for (const sg of [1, -1]) part(R, -Lc * .04, 11 + bodyH + 1.8, sg * bw * .3, Lc * .6, 1, 1, rim);
        part(R, -Lc / 2 - .1, 11 + bodyH * .44, 0, 1.2, bodyH * .5, bw * .4, colOf(0x1d2126));
        if (open) { part(R, -Lc * .06, 11 + bodyH * .32, bw / 2 + .2, Lc * .26, bodyH * .52, 1.2, dark); part(R, -Lc * .28, 11 + bodyH * .32, bw / 2 + 2.2, Lc * .22, bodyH * .52, 1.2, bc) } else part(R, -Lc * .06, 11 + bodyH * .32, bw / 2 + .3, .8, bodyH * .52, .8, colOf(0x0f1217));
      } else if (V === 2) { // Pickup mit Plane
        const cc = c0; cab(cc, cabL * 1.15);
        part(R, -Lc * .2, 11.8, 0, Lc * .56, 2.4, bw * .96, dark);   // Ladeflaeche
        for (const sg of [1, -1]) part(R, -Lc * .2, 11 + 5, sg * (bw / 2 - .8), Lc * .56, 6.4, 1.6, cc); part(R, -Lc / 2 + .8, 11 + 5, 0, 1.6, 6.4, bw * .96, cc);
        const tp = colOf(KCar.ftarp || 0x4a6b8a); part(R, -Lc * .2, 11 + 9, 0, Lc * .5, 5.4, bw * .78, tp); part(R, -Lc * .2, 11 + 13.4, 0, Lc * .4, 4.2, bw * .6, tp); part(R, -Lc * .2, 11 + 17, 0, Lc * .28, 3.4, bw * .42, shine(tp));
        for (const dx of [-.34, -.2, -.06]) part(R, Lc * dx, 11 + 9.8, 0, 1.2, 6.4, bw * .82, dark);   // Spannseile
        if (open) part(R, -Lc / 2 - 2.6, 11 + 5, 0, 1.4, 6.4, bw * .9, cc);   // Heckklappe unten
      } else { // alter Kastenwagen mit Rostflecken
        part(R, X0, 11 + bodyH / 2, 0, boxL, bodyH, bw, c0); cab(colOf(0x5a7aa0), cabL);
        const rs = colOf(0x9a4a24); part(R, X0 - boxL * .25, 11 + bodyH + .5, bw * .18, boxL * .2, 1, bw * .22, rs); part(R, X0 + boxL * .2, 11 + bodyH + .5, -bw * .22, boxL * .16, 1, bw * .18, rs); part(R, X0 + boxL * .05, 11 + bodyH * .3, bw / 2 + .3, boxL * .24, bodyH * .22, .8, rs); part(R, X0 - boxL * .3, 11 + bodyH * .6, -bw / 2 - .3, boxL * .18, bodyH * .2, .8, rs);
        for (const sg of [1, -1]) part(R, X0, 11 + bodyH + 1.4, sg * bw * .3, boxL * .8, 1, 1.2, colOf(0x39414a));   // Dachtraeger
        if (open) { part(R, -Lc / 2 - .1, 11 + bodyH * .5, 0, 1.2, bodyH * .8, bw * .8, dark); for (const sg of [1, -1]) part(R, -Lc / 2 - 1.4, 11 + bodyH * .5, sg * (bw / 2 + 1.6), 1.2, bodyH * .8, bw * .3, c0) } else part(R, -Lc / 2 - .5, 11 + bodyH * .5, 0, .8, bodyH * .8, .8, colOf(0x30343b));
      }
      driver();
    };
    const van = kind === 'van' || kind === 'tk' || kind === 'vh';
    if (!van) {
      // Stufen: Fahrgestell, Haube und Heck tiefer, Kabine aus dunklem Glas, Dach schmaler und kuerzer als die Kabine (Front- und Heckscheibe bleiben als dunkle Flaechen sichtbar)
      const sh = look.pol ? 0 : (o.row | 0) % 3, cl = [.38, .48, .34][sh], ch = [11, 11, 14][sh], cx = [-.04, -.1, -.03][sh], cabY = 12.2;
      wheels([.32, -.32]);
      part(R, 0, 8.2, 0, Lc, 8.4, bw, look.pol ? white : body);
      part(R, Lc * .31, 13.4, 0, Lc * .3, 2.6, bw * .98, body); part(R, -Lc * .36, 13.4, 0, Lc * .22, 2.6, bw * .98, body);
      part(R, Lc * .31, 14.9, 0, Lc * .2, .6, bw * .34, shine(body), .06); // Glanzstreifen auf der Haube
      part(R, Lc * cx, cabY + (ch + 2.4) / 2, 0, Lc * cl, ch + 2.4, bw * .86, glass, .03);
      part(R, Lc * cx, cabY + ch + 2.4 + 1.2, 0, Lc * cl * .62, 2.4, bw * .76, roof);
      part(R, Lc / 2 - .3, 6.4, 0, 3.4, 3.8, bw * 1.03, dark); part(R, -Lc / 2 + .3, 6.4, 0, 3.4, 3.8, bw * 1.03, dark); // Stossstangen
      part(R, Lc / 2 + .3, 10, 0, 1.2, 3, bw * .3, rim, .12); // Kuehlergrill
      for (const s of [1, -1]) part(R, Lc * .17, 17.4, s * (bw / 2 + 1.6), 2.6, 2.2, 2.4, dark); // Spiegel
      lamps(Lc / 2 + .1, -Lc / 2 - .1, 11.4, bw * .34);
      if (look.pol) {
        part(R, Lc * .02, 11.6, 0, 16, 2.4, bw * 1.02, colOf(0x1b2f66)); // blaues Tuerschild auf dem weissen Fahrgestell
        if (e.bar) bar(Lc * cx, cabY + ch + 2.4 + 4.4, o.bl);
      } else studs(Lc * cx, cabY + ch + 2.4 + 3.2, Lc * cl * .2, bw * .2, 3.4);
    } else if (kind === 'van') { flucht();
    } else {
      const bodyH = H - 11, cabL = Lc * (kind === 'tk' ? .26 : .3), boxL = Lc - cabL - 1, tk = kind === 'tk', cabC = tk ? colOf(0x4d5762) : cap(body), boxC = tk ? colOf(0x5d6872) : cap(roof), gl2 = colOf(0x131c2a);   // weisse Lieferwagen nicht ueberstrahlt: Lack hoechstens 0xd8dce2, Scheiben dunkler
      wheels(tk ? [.36, .12, -.14, -.38] : [.32, -.32]);
      part(R, 0, 8, 0, Lc, 6, bw * .96, dark);
      part(R, -Lc / 2 + boxL / 2, 11 + bodyH / 2, 0, boxL, bodyH, bw, boxC);
      part(R, -Lc / 2 + boxL / 2, 11 + bodyH + .7, 0, boxL * .84, 1.4, bw * .5, shine(boxC), .05); // Glanzstreifen auf dem Dach
      part(R, Lc / 2 - cabL / 2, 11 + bodyH * .25, 0, cabL, bodyH * .5, bw * .96, cabC); // Fahrerhaus unten (Lack)
      part(R, Lc / 2 - cabL / 2 - cabL * .08, 11 + bodyH * .5 + bodyH * .15, 0, cabL * .84, bodyH * .3, bw * .88, gl2); // Scheiben (dunkler als bei den Pkw)
      part(R, Lc / 2 - cabL / 2 - cabL * .1, 11 + bodyH * .8 + .7, 0, cabL * .6, 1.4, bw * .78, cabC); // Fahrerhausdach
      part(R, Lc / 2 + .2, 8.6, 0, 2.6, 5, bw * .98, dark); part(R, -Lc / 2 - .2, 8.6, 0, 2.6, 5, bw * .98, dark); // Stossstangen
      part(R, Lc / 2 + .7, 10.6, 0, 1.2, 3, bw * .3, rim, .12);
      if (tk) {
        for (let i = 0; i < 3; i++) part(R, -Lc / 2 + 12 + i * (boxL - 24) / 2, 11 + bodyH + 1.6, 0, 4, 1.2, bw * .9, colOf(0x39414a)); // Rippen auf dem Dach
        for (const s of [1, -1]) { part(R, -Lc / 2 + boxL * .45, 11 + bodyH * .55, s * (bw * .5 + .4), boxL * .5, 3, 1, colOf(0x1d2126)); part(R, Lc / 2 - cabL - 3, 11 + bodyH * .4, s * (bw * .5 + .3), 2, bodyH * .5, 1.2, colOf(0xe0b52a)) } // Schiessscharten, Warnstreifen
        part(R, -Lc / 2 - .6, 11 + bodyH * .5, 0, 1.4, bodyH * .82, bw * .86, colOf(0x39414a)); // Hecktuer
      } else {
        part(R, -Lc / 2 + boxL * .4, 11 + bodyH * .45, bw * .5 + .3, boxL * .3, bodyH * .7, 1, colOf(0x1d2126), .02); // Schiebetuer (Fluchtwagen, Vorhut)
      }
      lamps(Lc / 2 + .3, -Lc / 2 - .3, 12, bw * .34);
      if (e.bar) bar(Lc / 2 - cabL / 2, 11 + bodyH * .8 + 4, o.bl);
    }
    return 0;
  };
  const smoke = new Map(), waitPos = new Map();
  for (const art of ['pol', 'civ', 'wreck', 'van', 'vh', 'tk']) KL.car(art, car);
}
