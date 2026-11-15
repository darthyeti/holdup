/* Kloetzchen-Stil: Dinge der Bank (Ticket 198, Schritt 4a: Bank und Juwelier). register(KL) traegt Kachel-Bauer ein (KL.obj mit einem Zeichen): fn(k, x, y, ch, spec), x und y Kachel im Raster, spec Eintrag aus V3CFG.cells (Hoehe s, Einzug ins).
   k.brick(mx, mz, y0, sx, sy, sz, farbe, leuchten, drehung) setzt einen Klotz, k.studs(mx, mz, sx, sz, hoehe, farbe) Noppen darauf, k.shadow(mx, mz, groesse) einen weichen Kontaktschatten. Die Kachel verliert ihren Standardkoerper.
   Vorhanden: Tresen C, Schreibtisch e, Monitortisch m, Bank b, Kasse r, Geldautomat A, Kiste k, Fass q, Pflanze p. Mehr Farbe als die Studie (kraeftige Stoffe, Holz, Glanzkanten), Ziele leuchten:
   Geldautomat (blauer Schrank, Bildschirm, goldener Ausgabeschlitz, Lampe oben) und Kasse (rot mit gelber Lampe, Anzeige, Schublade) sind schon von weitem erkennbar. Haelt sich an die Hoehen der Tabelle V3CFG.cells (Zielhoehe, Deckel). */
export function register(KL) {
  const T = 32, geo = (k, x, y, spec) => { const ins = spec.ins || 0, w = T - 2 * ins; return { cx: x * T + T / 2, cz: y * T + T / 2, w, top: spec.s[0][1] } };
  KL.obj('C', (k, x, y, c, spec) => { // Tresen: Holzfront, heller Deckel mit Messingkante, Noppen
    const { cx, cz, w, top } = geo(k, x, y, spec), B = k.brick; k.shadow(cx, cz, w + 9);
    B(cx, cz, 0, w, top - 4, w, 0xa5683a); B(cx, cz, top - 4, w + .8, 4, w + .8, 0xf3ead2); B(cx, cz + w / 2 - .4, top - 8, w - 4, 2, 1, 0xe8b923, .15); B(cx, cz, 1, w - 6, 8, w + .4, 0x7d4a26);
    k.studs(cx, cz, w - 2, w - 2, top, 0xf3ead2);
  });
  KL.obj('e', (k, x, y, c, spec) => { // Schreibtisch: Platte, vier Beine, Schubladenblock, Papier und Lampe
    const { cx, cz, w, top } = geo(k, x, y, spec), B = k.brick; k.shadow(cx, cz, w + 9);
    B(cx, cz, top - 4, w, 4, w, 0xe08a3a); for (const a of [-1, 1]) for (const b of [-1, 1]) B(cx + a * (w / 2 - 2), cz + b * (w / 2 - 2), 0, 3.4, top - 4, 3.4, 0x8a5424);
    B(cx + w / 2 - 6, cz, 4, 9, top - 8, w - 8, 0xc4702c); B(cx + w / 2 - 1.6, cz, 8, .8, 2.4, 6, 0xe8b923);
    k.studs(cx, cz, w - 2, w - 2, top, 0xe08a3a); B(cx - 4, cz + 3, top + .8, 9, .8, 7, 0xffffff, .1, .2); B(cx + 6, cz - 6, top, 4, 6, 4, 0x2a2e36); B(cx + 6, cz - 6, top + 6, 8, 1.4, 3, 0x2f9e4f);
  });
  KL.obj('m', (k, x, y, c, spec) => { // Monitortisch: blaugrauer Tisch, Bildschirm mit leuchtender Flaeche, Tastatur
    const { cx, cz, w, top } = geo(k, x, y, spec), B = k.brick; k.shadow(cx, cz, w + 9);
    B(cx, cz, top - 4, w, 4, w, 0x6f8fb8); for (const a of [-1, 1]) for (const b of [-1, 1]) B(cx + a * (w / 2 - 2), cz + b * (w / 2 - 2), 0, 3.4, top - 4, 3.4, 0x3d4c66);
    k.studs(cx, cz, w - 2, w - 2, top, 0x6f8fb8);
    B(cx, cz - 3, top, 6, 2.4, 5, 0x4a5262); B(cx, cz - 3, top + 2.4, 3, 4, 2, 0x4a5262); B(cx, cz - 4.4, top + 5, 19, 11, 2.6, 0x1c2128); B(cx, cz - 3, top + 5.8, 16, 9, .6, 0x3fb4ff, 1.1);
    B(cx, cz + 6.5, top, 13, 1.2, 4.2, 0xdce2ea); for (let i = 0; i < 4; i++) B(cx - 4.5 + i * 3, cz + 6.5, top + 1.2, 2, .5, 1.6, 0x8a929c);
  });
  KL.obj('b', (k, x, y, c, spec) => { // Bank (Sitzbank): blaues Polster mit Lehne, Holzfuesse
    const { cx, cz, w, top } = geo(k, x, y, spec), B = k.brick; k.shadow(cx, cz, w + 8);
    for (const a of [-1, 1]) B(cx + a * (w / 2 - 1.5), cz, 0, 3, 6, w - 2, 0x8a5424);
    B(cx, cz + 2, 6, w, top - 6, w - 4, 0x2d6fe0); B(cx, cz - w / 2 + 2, top, w, 8, 4, 0x1f55b8); k.studs(cx, cz + 2, w - 2, w - 6, top, 0x2d6fe0);
  });
  KL.obj('r', (k, x, y, c, spec) => { // Kasse: roter Sockel, graues Geraet mit Anzeige und Tasten, Schublade, gelbe Lampe (Ziel)
    const { cx, cz, w, top } = geo(k, x, y, spec), B = k.brick; k.shadow(cx, cz, w + 9);
    B(cx, cz, 0, w, top - 8, w, 0xe0382f); B(cx, cz, top - 8, w + .6, 3, w + .6, 0xfff1c9); B(cx, cz + w / 2 - .3, 6, w - 6, 5, 1, 0x8a1f1a); B(cx, cz + w / 2 + .1, 8, 6, 1.6, .6, 0xe8b923, .4);
    B(cx, cz - 2, top - 5, 15, 7, 11, 0xcfd6de); B(cx, cz - 6, top + 2, 15, 6, 3, 0x9aa4b0); B(cx, cz - 5.8, top + 4.6, 10, 3, .6, 0x7ee34a, 1.2);
    for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) B(cx - 4 + i * 4, cz + 1.5 + j * 3, top + 2, 2.4, .8, 2.2, 0x3c4350);
    B(cx + 6, cz + 6, top - 5, 3, 3, 3, 0xfff07a, 1.4); B(cx + 6, cz + 6, top - 2, 1, 5, 1, 0xfff07a, .6); // Lampe auf Stiel
  });
  KL.obj('A', (k, x, y, c, spec) => { // Geldautomat: blauer Schrank, helle Stirnleiste, Bildschirm, Tastenfeld, goldener Ausgabeschlitz, Lampe oben
    const { cx, cz, w, top } = geo(k, x, y, spec), B = k.brick, d = 17, fz = cz + d / 2; k.shadow(cx, cz, w + 9);
    B(cx, cz, 0, 22, top - 4, d, 0x1f7fd4); B(cx, cz, top - 4, 24, 4, d + 2, 0xf3f6fa); B(cx - 11.6, cz, 4, .8, top - 12, d - 2, 0x0f4f8c); B(cx + 11.6, cz, 4, .8, top - 12, d - 2, 0x0f4f8c);
    B(cx, fz + .4, 29, 15, 11, .8, 0x15191f); B(cx, fz + .8, 30, 13, 9, .6, 0x28e0f0, 1.4); B(cx - 2, fz + 1.2, 33, 7, 1.2, .4, 0xffffff, 1.6);
    for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) B(cx - 11 + i * 3 + 1, fz + .6, 21 + j * 3, 2.2, 2, .6, 0xdfe5ec); B(cx - 2.5, fz + .5, 21, 4, 5, .6, 0x2a2e36);
    B(cx + 3, fz + .5, 17, 10, 3, .8, 0x15191f); B(cx + 3, fz + .9, 17.6, 8, 1.6, .6, 0xffd23a, 1.6); // Ausgabeschlitz
    B(cx, cz, top, 8, 2, 8, 0xffd23a, 1.5); B(cx, cz, top + 2, 4, 2, 4, 0xffffff, 1.2); // Lampe
  });
  KL.obj('k', (k, x, y, c, spec) => { // Kiste: Holz mit Deckelrahmen, Latten und Eisenecken
    const { cx, cz, w, top } = geo(k, x, y, spec), B = k.brick; k.shadow(cx, cz, w + 9);
    B(cx, cz, 0, w, top - 3, w, 0xe0aa52); B(cx, cz, top - 3, w + 1.2, 3, w + 1.2, 0xb87d2e); for (const a of [-1, 1]) B(cx + a * (w / 2 - 1.5), cz, 0, 3, top - 3, w + 1, 0x8a5a24); B(cx, cz, top * .4, w + 1, 2.6, w + 1.2, 0x8a5a24);
    for (const a of [-1, 1]) for (const b of [-1, 1]) B(cx + a * (w / 2 - .6), cz + b * (w / 2 - .6), top - 1, 2, 2, 2, 0xd8dde4); k.studs(cx, cz, w - 2, w - 2, top, 0xb87d2e);
  });
  KL.obj('q', (k, x, y, c, spec) => { // Fass: achtkantig aus zwei gedrehten Quadern, zwei Ringe, Deckel
    const { cx, cz, w, top } = geo(k, x, y, spec), B = k.brick; k.shadow(cx, cz, w + 9); const r = w * .86;
    for (const a of [0, .785]) B(cx, cz, 0, r, top, r, 0xd9402c, 0, a);
    for (const a of [0, .785]) { B(cx, cz, top * .2, r + 1.2, 2.6, r + 1.2, 0x2a2e36, 0, a); B(cx, cz, top * .62, r + 1.2, 2.6, r + 1.2, 0x2a2e36, 0, a) }
    for (const a of [0, .785]) B(cx, cz, top, r - 3, 1.4, r - 3, 0xf0b32c, 0, a); k.studs(cx, cz, 9, 9, top + 1.4, 0xf0b32c);
  });
  KL.obj('p', (k, x, y, c, spec) => { // Pflanze: Topf, drei Blattstufen, rote Bluete
    const { cx, cz, w } = geo(k, x, y, spec), B = k.brick; k.shadow(cx, cz, w + 9);
    B(cx, cz, 0, w * .9, 13, w * .9, 0xd4602f); B(cx, cz, 11, w * .98, 3, w * .98, 0xb04a22); B(cx, cz, 14, w * .8, 1.2, w * .8, 0x5a3b22);
    for (let i = 0; i < 3; i++) B(cx, cz, 15 + i * 7, (w + 5) * (1 - i * .22), 7.4, (w + 5) * (1 - i * .22), i === 1 ? 0x4fd05a : 0x2fb246, 0, i * .45);
    B(cx + 3, cz - 2, 36, 4, 3, 4, 0xff4a6a, .15, .4); B(cx - 5, cz + 3, 29, 3, 3, 3, 0xffd23a, .15, .2);
  });
}
