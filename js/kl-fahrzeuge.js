/* Kloetzchen-Stil: Fahrzeuge (Ticket 198, Schritt 3). register(KL) traegt je Art einen Bauer ein: (k, o, e, look), o Lage und Masse aus figs3d (x, y, a, L, W, k, row, fx, bl Blaulicht), e Eintrag aus V3CFG.cars (h, bar),
   look Farben aus k.carLook. Vorwaerts +x, oben +y, rechts +z, Radhaus unten. Arten: pol, civ, wreck, van, vh, tk. Hoechstens 40 Teile je Fahrzeug (carMax im Kern).
   Fahrtrichtung: figs3d meldet Wagen, die nach links fahren, mit fx -1 und um 180 Grad gedrehtem Winkel (Sprite gespiegelt); der Klotzbau braucht die wahre Richtung: KL.carHead(o). Nur Zustand aus figs3d (Client gleich). */
export function register(KL) {
  // wahre Fahrtrichtung (bei fx -1 ist der gemeldete Winkel um 180 Grad gedreht)
  KL.carHead = o => o.fx < 0 ? o.a + Math.PI : o.a;
  const car = (k, o, e, look) => {
    const { part, colOf, KC, C } = k, Lc = o.L * C.carK[0], Wc = o.W * C.carK[1], H = e.h, kind = o.k, KCar = KC.car, tt = k.time || 0;
    k.rotY(o.x, o.y, KL.carHead(o), 1); const R = k.root; k.state(0, 1);
    const wheel = colOf(KCar.wheel), glass = colOf(KCar.glass), rim = colOf(0xb9bfc7), dark = colOf(0x30343b), body = look.body, roof = look.roof, wr = 5.6, wz = Wc / 2 - 1.6;
    const lamps = (x0, x1, y) => { for (const s of [1, -1]) { part(R, x0, y, s * Wc * .32, 1.2, 3, 7, colOf(KCar.lamp), .8); part(R, x1, y, s * Wc * .32, 1.2, 3, 7, colOf(KCar.tail), .6) } };
    const bar = (x, y, on) => { const a = o.bl === 1; for (const s of [-1, 1]) part(R, x, y, s * Wc * .22, 4.6, 3.8, Wc * .34, colOf((s < 0) === a ? KCar.bar[0] : KCar.bar[1]), on ? 1.2 : .06) };
    const studs = (x, y, sx, sz, kk) => { for (const a of [-1, 1]) for (const b of [-1, 1]) part(R, x + a * sx, y, b * sz, kk, 1.3, kk, roof) };
    if (kind === 'wreck') {
      // ausgebrannt: dunkle Klotze, Dach eingedrueckt, Glut, Rauchfahne (Zeit aus der Spielzeit, je Wagen versetzt)
      const sc = colOf(KCar.scorch), cl = colOf(KCar.ember), fl = .3 + .25 * Math.sin(tt * 7 + o.x), dk2 = colOf(0x3a3330);
      part(R, 0, 7, 0, Lc, 8, Wc * .96, sc); part(R, Lc * .3, 12.5, 0, Lc * .3, 4, Wc * .9, sc); part(R, -Lc * .1, 13, 1, Lc * .3, 5, Wc * .7, dk2, 0, 0, .12);
      part(R, -Lc * .36, 11.5, 0, Lc * .2, 3, Wc * .8, dk2, 0, 0, -.1); part(R, -Lc * .1, 16.5, -2, Lc * .26, 2.4, Wc * .5, sc, 0, .1, .2);
      part(R, -Lc * .32, 11, -wz * .5, 9, 3, 9, cl, fl, 0, .2); part(R, Lc * .1, 15, wz * .4, 7, 3, 7, cl, fl * .7, 0, -.15); part(R, Lc * .38, 11, -wz * .3, 5, 2, 5, cl, fl * .6);
      for (const [sx, sz, d] of [[.32, 1, 0], [.32, -1, 1.2], [-.32, 1, 0], [-.32, -1, 0]]) part(R, Lc * sx, wr - d, sz * wz, wr * 2, wr * 2, 6, wheel);
      part(R, -Lc * .46, 4.2, wz * .5, 9, 2.4, 3, dk2, 0, 0, .3); // abgerissenes Teil
      const key = Math.round(o.x / 6) + ',' + Math.round(o.y / 6), nx = smoke.get(key) || 0;
      if (tt > nx && k.smokeAt) { smoke.set(key, tt + .55 + Math.abs(Math.sin(o.x)) * .5); k.smokeAt(o.x, o.y, 14, 1, .8); if (smoke.size > 40) smoke.clear() }
      return 0;
    }
    const van = kind === 'van' || kind === 'tk' || kind === 'vh', wax = kind === 'tk' ? [.36, .12, -.14, -.38] : [.32, -.32];
    for (const ax of wax) for (const sz of [1, -1]) { part(R, Lc * ax, wr, sz * wz, wr * 2, wr * 2, 6.4, wheel); part(R, Lc * ax, wr, sz * (wz + 3.4), wr * .9, wr * .9, 1, rim, .05) }
    if (!van) {
      // Wagenform nach der Zeile: 0 Limousine, 1 Kombi (langes Dach), 2 hoher Kleinwagen; Streifenwagen immer Limousine
      const sh = look.pol ? 0 : (o.row | 0) % 3, cl = [.4, .5, .36][sh], ch = [12, 12, 15][sh], cx = [-.03, -.1, -.02][sh];
      part(R, 0, 8.6, 0, Lc, 9, Wc, body);
      part(R, Lc * .33, 15.4, 0, Lc * .3, 4.2, Wc * .94, roof); part(R, -Lc * .39, 15.4, 0, Lc * (sh === 1 ? .12 : .2), 4.2, Wc * .94, roof);
      part(R, Lc * cx, 15 + ch / 2 + 1.2, 0, Lc * cl, ch, Wc * .9, roof);
      part(R, Lc * cx, 15 + ch * .55 + 1.2, 0, Lc * cl * .9, 5.6, Wc * .9 + 1.4, glass, .02); part(R, Lc * cx + Lc * cl / 2 - .6, 15 + ch * .55 + 1.2, 0, 1.4, 5.6, Wc * .8, glass); part(R, Lc * cx - Lc * cl / 2 + .6, 15 + ch * .55 + 1.2, 0, 1.4, 5.6, Wc * .8, glass);
      part(R, Lc * cx, 15 + ch + 2.4, 0, Lc * cl * .85, 2, Wc * .84, roof);
      part(R, Lc / 2 - .6, 6.2, 0, 3, 3.4, Wc * 1.02, dark); part(R, -Lc / 2 + .6, 6.2, 0, 3, 3.4, Wc * 1.02, dark);
      for (const s of [1, -1]) part(R, Lc * .17, 17.2, s * (Wc / 2 + 1.4), 2.6, 2.2, 2.4, dark); // Spiegel
      lamps(Lc / 2 + .1, -Lc / 2 - .1, 12.2);
      if (look.pol) {
        part(R, 0, 8.6, 0, Lc * .98, 3.4, Wc * 1.02, roof); // weisser Streifen
        part(R, Lc * .02, 12.2, 0, 14, 2.6, Wc * 1.03, colOf(0x1b2f66)); // Tuerschild
        part(R, Lc / 2 - 1, 11.6, 0, 1.4, 3, Wc * .6, rim, .1); // Kuehlergrill
        if (e.bar) bar(Lc * cx, 15 + ch + 6.4, o.bl);
      } else studs(Lc * cx, 15 + ch + 3.8, Lc * cl * .22, Wc * .22, 3.4); // Noppen auf dem Dach
    } else {
      const bodyH = H - 11, cabL = Lc * (kind === 'tk' ? .24 : .3), boxL = Lc - cabL - 1, tk = kind === 'tk';
      part(R, 0, 8, 0, Lc, 6, Wc * .96, dark);
      part(R, -Lc / 2 + boxL / 2, 11 + bodyH / 2, 0, boxL, bodyH, Wc * .98, tk ? colOf(0x59636b) : roof);
      part(R, Lc / 2 - cabL / 2, 11 + (bodyH * .76) / 2, 0, cabL, bodyH * .76, Wc * .94, tk ? colOf(0x4a535b) : body);
      part(R, Lc / 2 - cabL / 2 + 1, 11 + bodyH * .56, 0, cabL * .8, bodyH * .3, Wc * .94 + 1.4, glass); part(R, Lc / 2 - .8, 11 + bodyH * .56, 0, 1.4, bodyH * .3, Wc * .8, glass);
      if (tk) {
        for (let i = 0; i < 3; i++) part(R, -Lc / 2 + 12 + i * (boxL - 24) / 2, 11 + bodyH + .4, 0, 4, 1.2, Wc * .9, colOf(0x39414a)); // Rippen auf dem Dach
        for (const s of [1, -1]) { part(R, -Lc / 2 + boxL * .45, 11 + bodyH * .55, s * (Wc * .49 + .4), boxL * .5, 3, 1, colOf(0x1d2126)); part(R, Lc / 2 - cabL - 3, 11 + bodyH * .4, s * (Wc * .49 + .3), 2, bodyH * .5, 1.2, colOf(0xc9a227)) } // Schiessscharten, Warnstreifen
        part(R, -Lc / 2 - .6, 11 + bodyH * .5, 0, 1.4, bodyH * .82, Wc * .86, colOf(0x39414a)); // Hecktuer
        part(R, Lc / 2 + .8, 8.4, 0, 2.4, 5, Wc * .98, colOf(0x1d2126)); // Rammschutz
      } else {
        part(R, -Lc / 2 + boxL * .4, 11 + bodyH * .45, Wc * .49 + .3, boxL * .3, bodyH * .7, 1, colOf(0x24272d), .02); // Schiebetuer (Fluchtwagen, Vorhut)
        part(R, Lc / 2 - cabL - 1, 11 + bodyH * .1, 0, 1.2, 2.4, Wc * .9, dark);
      }
      lamps(Lc / 2 + .1, -Lc / 2 - .1, 12.4);
      if (e.bar) bar(Lc / 2 - cabL / 2, 11 + bodyH * .76 + 3.4, o.bl);
    }
    return 0;
  };
  const smoke = new Map();
  for (const art of ['pol', 'civ', 'wreck', 'van', 'vh', 'tk']) KL.car(art, car);
}
