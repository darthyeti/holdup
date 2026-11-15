/* Kloetzchen-Stil: Dinge der Bank (Ticket 198, Schritt 4a: Bank und Juwelier). register(KL) traegt Kachel-Bauer ein (KL.obj mit einem Zeichen): fn(k, x, y, ch, spec), x und y Kachel im Raster, spec Eintrag aus V3CFG.cells (Hoehe s, Einzug ins).
   k.brick(mx, mz, y0, sx, sy, sz, farbe, leuchten, drehung) setzt einen Klotz, k.studs(mx, mz, sx, sz, hoehe, farbe) Noppen darauf, k.shadow(mx, mz, groesse) einen weichen Kontaktschatten. Die Kachel verliert ihren Standardkoerper.
   Vorhanden: Tresen C, Schreibtisch e, Monitortisch m, Bank b, Kasse r, Geldautomat A, Kiste k, Fass q, Pflanze p. Mehr Farbe als die Studie (kraeftige Stoffe, Holz, Glanzkanten), Ziele leuchten:
   Geldautomat (blauer Schrank, Bildschirm, goldener Ausgabeschlitz, Lampe oben) und Kasse (rot mit gelber Lampe, Anzeige, Schublade) sind schon von weitem erkennbar. Haelt sich an die Hoehen der Tabelle V3CFG.cells (Zielhoehe, Deckel). */
export function register(KL) {
  const T = 32, geo = (k, x, y, spec) => { const ins = spec.ins || 0, w = T - 2 * ins; return { cx: x * T + T / 2, cz: y * T + T / 2, w, top: spec.s[0][1] } };
  KL.obj('C', (k, x, y, c, spec) => { // Tresen: Holzfront, heller Deckel mit Messingkante, Noppen
    const { cx, cz, w, top } = geo(k, x, y, spec), B = k.brick; k.shadow(cx, cz, w + 9);
    const L = k.X.LAY || {}, at = (dx, dy) => k.E.cellAt(x + dx, y + dy) === 'C';
    const run = (dx, dy) => { let n = 1; for (let i = 1; i < 5 && at(dx * i, dy * i); i++) n++; for (let i = 1; i < 5 && at(-dx * i, -dy * i); i++) n++; return n };
    if (L.casino && run(1, 0) <= 2 && run(0, 1) <= 2) { k.shadow(cx, cz, w + 9); return } // 2x2-Block: Standflaeche der Spielautomaten, der Automat (good:slot) ist der Koerper
    if (L.casino) { // Spieltisch (Ticket 198 Abnahme): Holzfuss, gruener Filz, Holzrand nur an den Aussenseiten, Chipstapel, Kreis der Auslage
      B(cx, cz, 0, w - 2, top - 4, w - 2, 0x6b3f22); B(cx, cz, top - 4, w + .6, 3, w + .6, 0x1f9a52);
      for (const [dx, dy, px, pz, sx, sz] of [[0, -1, 0, -w / 2 + 1.5, w + .8, 3], [0, 1, 0, w / 2 - 1.5, w + .8, 3], [-1, 0, -w / 2 + 1.5, 0, 3, w + .8], [1, 0, w / 2 - 1.5, 0, 3, w + .8]]) if (!at(dx, dy)) B(cx + px, cz + pz, top - 1, sx, 4.2, sz, 0x8a5226);
      B(cx, cz, top - .8, 14, .5, 14, 0x3cc47a); B(cx, cz, top - .5, 9, .5, 9, 0x1f9a52);
      if ((x * 3 + y) % 3 === 0) { for (let i = 0; i < 4; i++) B(cx - 6, cz + 5, top - 1 + i * 1.6, 5, 1.4, 5, i % 2 ? 0xc4402f : 0xe9e5da); for (let i = 0; i < 3; i++) B(cx + 6, cz - 4, top - 1 + i * 1.6, 5, 1.4, 5, i % 2 ? 0x3a78cc : 0x1f2128) }
      return;
    }
    if (L.jewel) { // Schaukasten (Ticket 198 Abnahme): Nussholzfuss, dunkles Samtkissen, Glasrahmen; der Schmuck kommt aus der Vitrine (vit)
      B(cx, cz, 0, w, top - 6, w, 0x6a3f24); B(cx, cz, top - 6, w + .8, 2, w + .8, 0xe8b923, .2); B(cx, cz, top - 4, w - 1, 2.5, w - 1, 0x4a1f4a);
      for (const [px, pz, sx, sz] of [[0, -w / 2 + .8, w, 1.4], [0, w / 2 - .8, w, 1.4], [-w / 2 + .8, 0, 1.4, w], [w / 2 - .8, 0, 1.4, w]]) B(cx + px, cz + pz, top - 1.5, sx, 3.4, sz, 0xd6ecf8, .1);
      return;
    }
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
  const kisteIn = (k, x, y, c, spec) => { // Kiste: Holz mit Deckelrahmen, Latten und Eisenecken
    const { cx, cz, w, top } = geo(k, x, y, spec), B = k.brick; k.shadow(cx, cz, w + 9);
    B(cx, cz, 0, w, top - 3, w, 0xe0aa52); B(cx, cz, top - 3, w + 1.2, 3, w + 1.2, 0xb87d2e); for (const a of [-1, 1]) B(cx + a * (w / 2 - 1.5), cz, 0, 3, top - 3, w + 1, 0x8a5a24); B(cx, cz, top * .4, w + 1, 2.6, w + 1.2, 0x8a5a24);
    for (const a of [-1, 1]) for (const b of [-1, 1]) B(cx + a * (w / 2 - .6), cz + b * (w / 2 - .6), top - 1, 2, 2, 2, 0xd8dde4); k.studs(cx, cz, w - 2, w - 2, top, 0xb87d2e);
  };
  const fassIn = (k, x, y, c, spec) => { // Fass: achtkantig aus zwei gedrehten Quadern, zwei Ringe, Deckel
    const { cx, cz, w, top } = geo(k, x, y, spec), B = k.brick; k.shadow(cx, cz, w + 9); const r = w * .86;
    for (const a of [0, .785]) B(cx, cz, 0, r, top, r, 0xd9402c, 0, a);
    for (const a of [0, .785]) { B(cx, cz, top * .2, r + 1.2, 2.6, r + 1.2, 0x2a2e36, 0, a); B(cx, cz, top * .62, r + 1.2, 2.6, r + 1.2, 0x2a2e36, 0, a) }
    for (const a of [0, .785]) B(cx, cz, top, r - 3, 1.4, r - 3, 0xf0b32c, 0, a); k.studs(cx, cz, 9, 9, top + 1.4, 0xf0b32c);
  };
  // ---------- Strassenmoebel (Ticket 229, Stufe 1, nur Optik): k und q draussen (mindestens 5 Zellen 'o' im 5 mal 5 um die Kachel) bekommen je nach Ort andere Gestalten, gleiche Grundflaeche und Hoehe wie Kiste und Fass ----------
  // Wahl fest aus der Kachelposition (kein Zufall, Host und Client gleich): allein stehende Kacheln nach Hash, Nachbarn gleicher Art nach dem Muster x + 2y (benachbart nie gleich)
  const outdoor = (k, x, y) => { let o = 0; for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (k.E.cellAt(x + dx, y + dy) === 'o') o++; return o >= 5 };
  const pickV = (k, x, y, ch, n) => { let same = false; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (k.E.cellAt(x + dx, y + dy) === ch) same = true; const h = (Math.imul(x, 73856093) ^ Math.imul(y, 19349663)) >>> 0; return same ? (x + 2 * y) % n : (h >>> 7) % n };
  // Je Gestalt hoechstens ein grosser Klotz (kleinste Kante ab KC.small, mit Fase, 108 Dreiecke), der Rest Kleinteile ohne Fase (12 Dreiecke), wie bei Kiste und Fass: so bleibt der Dreieckszuwachs unter einem Prozent
  const KQ = [ // q: Mülltonne grau, Mülltonne grün, Pflanzkübel mit Busch, Streugutkiste, Poller-Gruppe
    (k, cx, cz, w, top, B) => { const r = w * .78; B(cx, cz, 0, r, top * .9, r, 0x8a949f); B(cx, cz, top * .9, r + 2, 3, r + 2, 0x59616b); B(cx + r * .5 + 1, cz, top * .45, 2.4, 3, 8, 0x3c424a); B(cx, cz, top * .9 + 3, 6, 2.4, 3, 0x2f343b) },
    (k, cx, cz, w, top, B) => { const r = w * .78; B(cx, cz, 0, r, top * .9, r, 0x2f9e55); B(cx, cz, top * .9, r + 2, 3, r + 2, 0x1f6e3c); B(cx - r * .5 - 1, cz, top * .45, 2.4, 3, 8, 0x1a4a2b); B(cx, cz, top * .9 + 3, 6, 2.4, 3, 0xe8e8e8) },
    (k, cx, cz, w, top, B) => { B(cx, cz, 0, w * .86, top * .5, w * .86, 0xc5b79a); B(cx, cz, top * .5, w * .92, 2.4, w * .92, 0x9c8e72); for (let i = 0; i < 3; i++) B(cx, cz, top * .5 + 2.4 + i * 4.2, (w * .8) * (1 - i * .2), 4.2, (w * .8) * (1 - i * .2), i === 1 ? 0x4fd05a : 0x2fb246, 0, i * .5); B(cx + 4, cz - 3, top * .5 + 15, 3.4, 3, 3.4, 0xff6a8a, .1) },
    (k, cx, cz, w, top, B) => { B(cx, cz, 0, w * .86, top * .6, w * .62, 0xf0b32c); B(cx, cz, top * .6, w * .9, 3, w * .66, 0x2a2e36); B(cx, cz, top * .3, w * .88, 3, w * .64, 0x2a2e36); B(cx - 5, cz + w * .32, top * .36, 7, 4, .8, 0xffffff) },
    (k, cx, cz, w, top, B) => { for (const dx of [-8, 0, 8]) for (const dz of dx === 0 ? [0] : [-4, 4]) { B(cx + dx, cz + dz, 0, 4.4, top * .8, 4.4, 0xd8412f); B(cx + dx, cz + dz, top * .55, 4.4, 3, 4.4, 0xf2f2f2) } }];
  const KK = [ // k: Müllcontainer, Zeitungsbox, Stromkasten, Paketstation, Holzkiste
    (k, cx, cz, w, top, B) => { B(cx, cz, 3, w * .96, top * .7, w * .86, 0x2f6f4e); B(cx, cz, 3 + top * .7, w * .98, 3, w * .9, 0x1f4a34); B(cx, cz, 3 + top * .7 + 3, w * .5, 1.6, w * .7, 0x3f8a64); for (const a of [-1, 1]) B(cx + a * (w * .38), cz + w * .46, 0, 4, 4, 2.4, 0x23262b); B(cx - w * .3, cz + w * .44, top * .45, 6, 4, .8, 0xe8e8e8) },
    (k, cx, cz, w, top, B) => { B(cx, cz, 0, w * .56, 4.4, w * .56, 0x23262b); B(cx, cz, 4.4, w * .62, top - 8, w * .62, 0x2f6fd8); B(cx, cz, top - 3.6, w * .66, 3, w * .66, 0x1a4aa0); B(cx, cz + w * .31, top * .5, w * .4, 6, .8, 0x1f3550); B(cx, cz + w * .32, top * .5 - 6, w * .3, 2, .8, 0xe8e8e8) },
    (k, cx, cz, w, top, B) => { B(cx, cz, 0, w * .84, top, w * .56, 0xaab2bb); B(cx, cz, top, w * .9, 2, w * .62, 0x7c8590); B(cx - 4, cz + w * .29, top * .55, 7, 7, .8, 0xf0c92c); B(cx - 4, cz + w * .3, top * .55 + 1.5, 1.4, 3, .6, 0x2a2e36); B(cx + 5, cz + w * .29, top * .3, 8, 3, .8, 0x59616b) },
    (k, cx, cz, w, top, B) => { B(cx, cz, 0, w * .92, top, w * .62, 0xf0b32c); B(cx, cz, top, w * .96, 2, w * .66, 0x2a2e36); for (const [a, b] of [[-1, 0], [0, 0], [1, 0], [-1, 1], [0, 1], [1, 1]]) B(cx + a * w * .28, cz + w * .32, 3 + b * (top * .42), w * .22, top * .34, .8, 0xffffff, 0, 0) },
    null];
  const street = (list, ch) => (k, x, y, c, spec) => {
    const { cx, cz, w, top } = geo(k, x, y, spec);
    if (!outdoor(k, x, y)) return null;
    const f = list[pickV(k, x, y, ch, list.length)]; if (!f) return null;
    k.shadow(cx, cz, w + 9); f(k, cx, cz, w, top, k.brick); return true;
  };
  const kStreet = street(KK, 'k'), qStreet = street(KQ, 'q');
  KL.obj('k', (k, x, y, c, spec) => { if (!kStreet(k, x, y, c, spec)) kisteIn(k, x, y, c, spec) });
  KL.obj('q', (k, x, y, c, spec) => { if (!qStreet(k, x, y, c, spec)) fassIn(k, x, y, c, spec) });
  KL.obj('p', (k, x, y, c, spec) => { // Pflanze: Topf, drei Blattstufen, rote Bluete
    const { cx, cz, w } = geo(k, x, y, spec), B = k.brick; k.shadow(cx, cz, w + 9);
    B(cx, cz, 0, w * .9, 13, w * .9, 0xd4602f); B(cx, cz, 11, w * .98, 3, w * .98, 0xb04a22); B(cx, cz, 14, w * .8, 1.2, w * .8, 0x5a3b22);
    for (let i = 0; i < 3; i++) B(cx, cz, 15 + i * 7, (w + 5) * (1 - i * .22), 7.4, (w + 5) * (1 - i * .22), i === 1 ? 0x4fd05a : 0x2fb246, 0, i * .45);
    B(cx + 3, cz - 2, 36, 4, 3, 4, 0xff4a6a, .15, .4); B(cx - 5, cz + 3, 29, 3, 3, 3, 0xffd23a, .15, .2);
  });

  // ---------- Hintertueren und Nebeneingaenge (Ticket 211): Szenario-Teil 'lock' fuer L (zu) und l (offen), auch Personaltueren, Hoftuer und Zellentueren des Gefaengnisses ----------
  // Der Koerper der Kachel L (Wandhoehe, Schnitt wie Waende) bleibt aus der Tabelle, hier kommen beidseitig Rahmen, Stahlblatt, Panikstange, Schild, Kartenleser mit roter LED. Offen (l): Pfosten, an die Laibung
  // geklapptes Blatt, Schwelle, Leser mit gruener LED. Die Wandrichtung folgt den Nachbarkacheln (quer zur Wand sind die zwei Seiten der Tuer), o.x, o.y Mitte der Kachel, o.open.
  KL.cellOver = Object.assign(KL.cellOver || {}, { L: { s: [[54, 64, 2]], cut: 1 } }); // L im Kloetzchen-Stil: nur der Sturz bleibt aus der Tabelle (mit Schnitt), die Nische bauen die Kloetze
  const WALLS = '#PWwYVLlDdg';
  KL.obj('lock', (k, o) => {
    const T_ = k.T, cell = k.E.cellAt, tx = Math.floor(o.x / T_), ty = Math.floor(o.y / T_), isW = (a, b) => WALLS.includes(cell(a, b)) || (k.C.cells[cell(a, b)] || { s: [] }).s.some(q => q[0] === 0 && q[1] >= k.C.wallH);
    const hz = isW(tx - 1, ty) && isW(tx + 1, ty) ? true : isW(tx, ty - 1) && isW(tx, ty + 1) ? false : true;
    // u entlang der Wand, v quer dazu (Seiten +1 Sueden oder Osten, -1 Norden oder Westen), Kloetze am Mittelpunkt der Kachel
    const br = (u, v, y0, su, sh, sv, col, em) => k.dbrick(o.x + (hz ? u : v), o.y + (hz ? v : u), y0, hz ? su : sv, sh, hz ? sv : su, 0, col, em);
    const frame = 0x2a3038, steel = 0x9aa6b6, dark = 0x3b4350, H = 56;
    if (!o.open) {
      // Nische: die Kachel L hat im Stil nur den Sturz (KL.cellOver), hier stehen zwei wandstarke Pfosten, ein duenneres Stahlblatt mittig in der Laibung und die Beschlaege auf beiden Seiten
      br(-13.5, 0, 0, 5, 54, 32, frame); br(13.5, 0, 0, 5, 54, 32, frame); br(0, 0, 0, 22, .6, 32, 0x20252c);                    // Pfosten (Laibung) und Schwelle
      br(0, 0, 1, 21.6, 52, 8, steel); br(0, 0, 1, 21.8, 3, 8.4, dark); br(0, 0, 49, 21.8, 3, 8.4, dark); br(0, 0, 22, 21.8, 1.6, 8.4, dark); // Stahlblatt (ein Viertel der Wandstaerke) mit Rippen
      for (const sd of [-1, 1]) {
        const f = sd * 4.6;
        br(-1.5, sd * 6.4, 22, 17, 2.8, 2.4, 0xf0f3f7); br(-9, sd * 5.4, 21.4, 2.2, 4.2, 1.6, 0x6b7380); br(6, sd * 5.4, 21.4, 2.2, 4.2, 1.6, 0x6b7380);   // Panikstange und Halter
        br(-6, sd * 4.8, 29, 8.4, 5, 1, 0xffc83a); br(-6, sd * 5.4, 30.4, 5.6, 1.8, .5, 0x1a1d22); void f;                              // gelbes Schild
        br(13.5, sd * 16.9, 23, 4, 10, 1.8, 0x20252c); br(13.5, sd * 17.9, 30.4, 2.4, 2.4, .6, 0xff3a2e, 1.8); br(13.5, sd * 17.9, 25.4, 3, 3, .6, 0x4a5260);   // Leser an der Laibung mit roter LED und Tastenfeld
      }
    } else {
      for (const sd of [-1, 1]) { br(-13.5, sd * 15.5, 0, 5, 50, 1.2, frame); br(13.5, sd * 15.5, 0, 5, 50, 1.2, frame) }
      br(-13.5, 0, 0, 5, 50, 32, frame); br(13.5, 0, 0, 5, 50, 32, frame); br(0, 0, 0, 22, .6, 32, 0x20252c);                          // Pfosten (Laibung) und Schwelle
      br(-8, 0, 0, 6, 48, 29, steel); br(-8, 0, 22, 6.4, 3, 29, dark); br(-4.6, 0, 21, 1, 3, 14, 0xf0f3f7);                              // duenn an die Laibung geklapptes Blatt mit Rippe und Stange
      br(13.5, 16.9, 23, 4, 10, 1.8, 0x20252c); br(13.5, 17.9, 30.4, 2.4, 2.4, .6, 0x4cf06a, 1.8); br(13.5, -16.9, 23, 4, 10, 1.8, 0x20252c); br(13.5, -17.9, 30.4, 2.4, 2.4, .6, 0x4cf06a, 1.8); // Leser mit gruener LED
    }
  });

  // ---------- Hauptschalter (Szenario-Teil 'sw', LAY.sw, E-Ziel Strom aus): Schaltkasten an der naechsten Wand ----------
  // Grauer Metallkasten etwa halbe Wandhoehe, gelb-schwarzes Warnschild mit Blitz, grosser roter Hebel, darueber eine Lampe. Strom an (o.on): Hebel oben, Lampe gruen; nach Strom aus (Kameras aus):
  // Hebel unten, Lampe rot. Die Wand im Ruecken folgt den Nachbarkacheln (zuerst Norden, dann Westen, Osten, Sueden), ohne Wand steht der Kasten mit Blick nach Sueden in der Kachelmitte.
  KL.obj('sw', (k, o) => {
    const T_ = k.T, tx = Math.floor(o.x / T_), ty = Math.floor(o.y / T_), cell = k.E.cellAt, wall = (a, b) => cell(a, b) === '#' || cell(a, b) === 'P'; // nur echte Mauer, keine Tueren
    // Standort: die Kachel von LAY.sw, steht dort ein Moebel (zum Beispiel der Monitortisch im Museum), die naechste freie Bodenkachel (hoechstens zwei Kacheln entfernt) mit Wand im Ruecken
    const free = (a, b) => cell(a, b) === '.', dirs = [[0, -1], [-1, 0], [1, 0], [0, 1]], wd = (a, b) => dirs.find(d => wall(a + d[0], b + d[1]));
    let best = null, bd = 1e9; for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const a = tx + dx, b = ty + dy; if (!free(a, b) || !wd(a, b)) continue; const d = Math.hypot(a * T_ + 16 - o.x, b * T_ + 16 - o.y) + (free(tx, ty) && !dx && !dy ? -99 : 0); if (d < bd) { bd = d; best = [a, b] } }
    const [bx, by] = best || [tx, ty], D = wd(bx, by) || [0, -1], cx = bx * T_ + T_ / 2, cz = by * T_ + T_ / 2, pu = [-D[1], D[0]];
    // u entlang der Wand, w Abstand von der Wandflaeche nach innen (Wand bei w = 0), Kloetze am Rand der Kachel
    const br = (u, w, y0, su, sh, sw_, col, em) => { const px = cx + D[0] * (T_ / 2 - w) + pu[0] * u, pz = cz + D[1] * (T_ / 2 - w) + pu[1] * u, ax = D[0] !== 0; k.dbrick(px, pz, y0, ax ? sw_ : su, sh, ax ? su : sw_, 0, col, em) };
    const on = o.on, metal = 0x8f98a6, dark = 0x2a2f37;
    br(0, 3, 14, 20, 34, 6, metal); br(0, 6.4, 15, 17, 32, .8, 0xaab3c0);                       // Kasten und Tuerblatt
    for (const sx of [-1, 1]) for (const sy of [16, 45]) br(sx * 8, 6.9, sy, 1.6, 1.6, .6, 0xd8dde4);  // Nieten
    br(-5, 7, 36, 8, 8, .8, 0xffc83a); br(-5, 7.5, 37, 2, 6, .5, 0x1a1d22); br(-6.6, 7.5, 39.6, 3, 1.6, .5, 0x1a1d22); br(-3.4, 7.5, 36.8, 3, 1.6, .5, 0x1a1d22); // Warnschild mit Blitz
    br(4, 7, 20, 4.4, 17, .7, dark);                                                             // Hebelschlitz
    br(4, 8, on ? 31 : 20, 3, 6, 2, 0xe5392e); br(4, 9.4, on ? 36 : 17.5, 5.6, 5.6, 4.4, 0xff4a3a);  // Hebel mit grossem Knauf: oben (an) oder unten (aus)
    br(0, 4.5, 50, 9, 3, 4, dark); br(0, 7.4, 50.4, 5, 2.2, 1.2, on ? 0x4cf06a : 0xff3a2e, 1.8); // Lampe: gruen oder rot
  });
}
