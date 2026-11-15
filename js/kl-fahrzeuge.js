/* Kloetzchen-Stil: Fahrzeuge (Ticket 198, Schritt 3 baut sie komplett aus). register(KL) traegt je Art einen Bauer ein: (k, o, e, look), o Lage und Masse aus figs3d (x, y, a, L, W, bl Blaulicht), e Eintrag aus V3CFG.cars (h, bar),
   look Farben aus k.carLook. Vorwaerts +x, oben +y, rechts +z, Radhaus unten. Arten: pol, civ, wreck, van, vh, tk. */
export function register(KL) {
  const car = (k, o, e, look) => {
    const { part, colOf, KC, C } = k, Lc = o.L * C.carK[0], Wc = o.W * C.carK[1], H = e.h, kind = o.k, KCar = KC.car;
    k.rotY(o.x, o.y, o.a, 1); const R = k.root; k.state(0, 1);
    const wheel = colOf(KCar.wheel), glass = colOf(KCar.glass), body = look.body, roof = look.roof, wr = 5.6, wz = Wc / 2 - 1.6, bar = (x, y, on) => { const a = o.bl === 1; for (const s of [-1, 1]) part(R, x, y, s * Wc * .22, 4.6, 3.8, Wc * .34, colOf((s < 0) === a ? KCar.bar[0] : KCar.bar[1]), on ? .95 : .06) };
    if (kind === 'wreck') {
      const sc = colOf(KCar.scorch), cl = colOf(KCar.ember), fl = .25 + .2 * Math.sin(k.alarmPh * 7 + o.x);
      part(R, 0, 7, 0, Lc, 8, Wc * .96, sc); part(R, Lc * .3, 12.5, 0, Lc * .3, 4, Wc * .9, sc); part(R, -Lc * .1, 13, 1, Lc * .3, 5, Wc * .7, colOf(0x3a3330), 0, 0, .12);
      part(R, -Lc * .32, 11, -wz * .5, 9, 3, 9, cl, fl, 0, .2); part(R, Lc * .1, 15, wz * .4, 7, 3, 7, cl, fl * .7, 0, -.15);
      for (const [sx, sz] of [[.32, 1], [.32, -1], [-.32, 1], [-.32, -1]]) part(R, Lc * sx, wr, sz * wz, wr * 2, wr * 2, 6, wheel);
      return 0;
    }
    const van = kind === 'van' || kind === 'tk' || kind === 'vh', wax = kind === 'tk' ? [.36, .12, -.14, -.38] : [.32, -.32];
    for (const ax of wax) for (const sz of [1, -1]) { part(R, Lc * ax, wr, sz * wz, wr * 2, wr * 2, 6.4, wheel); part(R, Lc * ax, wr, sz * (wz + 3.4), wr * .9, wr * .9, 1, colOf(0xb9bfc7), .05) }
    if (!van) {
      part(R, 0, 8.6, 0, Lc, 9, Wc, body);
      part(R, Lc * .33, 15.4, 0, Lc * .3, 4.2, Wc * .94, roof); part(R, -Lc * .39, 15.4, 0, Lc * .2, 4.2, Wc * .94, roof);
      part(R, -Lc * .03, 19.5, 0, Lc * .4, 12, Wc * .9, roof);
      part(R, -Lc * .03, 19.6, 0, Lc * .36, 5.6, Wc * .9 + 1.4, glass, .02); part(R, -Lc * .03 + Lc * .2 - .6, 19.6, 0, 1.4, 5.6, Wc * .8, glass); part(R, -Lc * .03 - Lc * .2 + .6, 19.6, 0, 1.4, 5.6, Wc * .8, glass);
      part(R, -Lc * .03, 25.6, 0, Lc * .34, 2, Wc * .84, roof);
      part(R, Lc / 2 - .6, 6.2, 0, 3, 3.4, Wc * 1.02, colOf(0x30343b)); part(R, -Lc / 2 + .6, 6.2, 0, 3, 3.4, Wc * 1.02, colOf(0x30343b));
      for (const sz of [1, -1]) { part(R, Lc / 2 + .1, 12.2, sz * Wc * .32, 1.2, 3, 7, colOf(KCar.lamp), .75); part(R, -Lc / 2 - .1, 12.2, sz * Wc * .32, 1.2, 3, 7, colOf(KCar.tail), .55) }
      if (look.pol) { part(R, 0, 8.6, 0, Lc * .98, 3.4, Wc * 1.02, roof); if (e.bar) bar(-Lc * .03, 28.4, o.bl) }
    } else {
      const bodyH = H - 11, cabL = Lc * (kind === 'tk' ? .24 : .3), boxL = Lc - cabL - 1;
      part(R, 0, 8, 0, Lc, 6, Wc * .96, colOf(0x30343b));
      part(R, -Lc / 2 + boxL / 2, 11 + bodyH / 2, 0, boxL, bodyH, Wc * .98, kind === 'tk' ? colOf(0x59636b) : roof);
      part(R, Lc / 2 - cabL / 2, 11 + (bodyH * .76) / 2, 0, cabL, bodyH * .76, Wc * .94, kind === 'tk' ? colOf(0x4a535b) : body);
      part(R, Lc / 2 - cabL / 2 + 1, 11 + bodyH * .56, 0, cabL * .8, bodyH * .3, Wc * .94 + 1.4, glass); part(R, Lc / 2 - .8, 11 + bodyH * .56, 0, 1.4, bodyH * .3, Wc * .8, glass);
      if (kind === 'tk') for (let i = 0; i < 3; i++) part(R, -Lc / 2 + 12 + i * (boxL - 24) / 2, 11 + bodyH + .4, 0, 4, 1.2, Wc * .9, colOf(0x39414a));
      for (const sz of [1, -1]) { part(R, Lc / 2 + .1, 12.4, sz * Wc * .32, 1.2, 3, 7, colOf(KCar.lamp), .75); part(R, -Lc / 2 - .1, 12.4, sz * Wc * .32, 1.2, 3, 7, colOf(KCar.tail), .55) }
      if (e.bar) bar(Lc / 2 - cabL / 2, 11 + bodyH * .76 + 2.4, o.bl);
    }
    return 0;
  };
  for (const art of ['pol', 'civ', 'wreck', 'van', 'vh', 'tk']) KL.car(art, car);
}
