/* Kloetzchen-Stil: Dinge (allgemein) (Ticket 198, Schritt 4a). Bauer fuer Szenario-Teile (KL.obj mit Namen der Art, fn(k, o) je Bild mit k.dbrick(mx, mz, y0, sx, sy, sz, drehung, farbe, leuchten))
   und Kacheln (ein Zeichen, fn(k, x, y, ch, spec) beim Bau der Welt mit k.brick, k.studs, k.shadow, siehe js/kl-kern.js und js/kl-dinge-bank.js).
   Hier: Tresortuer (vault) und Tastenfeld (pad), Notizen/Fundorte des Codes (note), Geldbuendel (bundle), Beutesack (bag), leere Kassen und Automaten (dark), Zaun f, Barrikade X.
   Dazu KL.util (kleine Helfer). Beute-Stuecke (good) baut jede Datei fuer ihre eigenen Namen als KL.obj('good:'+n), fehlt der Bauer, zeichnet view3d klassisch (nie unsichtbar).
   Wande, Fenster, Tueren und Boden bleiben schlicht (Welt A), dort gibt es keinen Bauer. Alles aus Zustand der Karte und der Beute (scen3d), das auch ein Client hat. */
// Oberkante des Koerpers der Kachel an (x, y) in Weltpixeln (wie view3d topAt), fuer Dinge, die auf Moebeln liegen
function top(k, x, y) { const c = k.E.cellAt(Math.floor(x / k.T), Math.floor(y / k.T)), e = k.C.cells[c]; if (!e || (e.open && k.X.vaultOpen)) return 0; let h = 0; for (const s of e.s) if (s[0] === 0) h = Math.max(h, s[1]); return h }
export function register(KL) {
  KL.util = { top };
  const T = 32, B = (k, ...a) => k.dbrick(...a);

  // ---------- Tresortuer: Handrad (zu) oder aufgeschwenktes Blatt (offen), Lage im Rahmen der Tuer wie die 2D-Zeichnung ----------
  KL.obj('vault', (k, o) => {
    const X0 = o.x, Y0 = o.y, h = o.h, m = u => o.dir < 0 ? 2 * X0 + T - u : u, w = (u, v) => h ? [X0 + (v - Y0), Y0 + (u - X0)] : [u, v];
    const bx = (u0, u1, v0, v1, y0, hh, col, em) => { const a = w(m(u0), v0), b = w(m(u1), v1); B(k, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, y0, Math.abs(b[0] - a[0]), hh, Math.abs(b[1] - a[1]), 0, col, em) };
    const steel = 0x8d97a6, dark = 0x2f343c, gold = 0xe8b923;
    if (o.open) { // offen (Ticket 198 Tresor): Tuerblatt etwa 100 Grad aufgeschwenkt, liegt am Gang an der Wand (Angel am oberen Ende der Oeffnung), Bolzen eingefahren, Durchgang frei, nur zwei Pfosten als Rahmen
      const L = 2 * T - 6;
      bx(X0 - 3, X0 + 3, Y0 - 3, Y0, 0, 62, dark); bx(X0 - 3, X0 + 3, Y0 + 2 * T, Y0 + 2 * T + 3, 0, 62, dark);                       // Pfosten der Oeffnung
      bx(X0 - 2 - L, X0 - 2, Y0 - 5, Y0 + 1, 2, 56, steel); bx(X0 - 2 - L, X0 - 2, Y0 - 5.6, Y0 - 5, 6, 48, 0xb7c0cd);              // Blatt an der Wand, helle Aussenseite
      bx(X0 - 2 - L - 1.4, X0 - 2 - L, Y0 - 5, Y0 + 1, 8, 8, gold); bx(X0 - 2 - L - 1.4, X0 - 2 - L, Y0 - 5, Y0 + 1, 46, 8, gold);      // eingefahrene Bolzen an der freien Kante
      bx(X0 - 2 - L / 2 - 4, X0 - 2 - L / 2 + 4, Y0 + 1, Y0 + 3, 24, 8, gold); bx(X0 - 2 - L / 2 - 1.5, X0 - 2 - L / 2 + 1.5, Y0 + 1, Y0 + 3, 20, 16, gold); // Handrad am Blatt (Innenseite)
      bx(X0 - 2, X0 + 3, Y0 - 5, Y0 + 1, 14, 6, 0x5a626d);                                                                               // Angel
    } else {
      const c = Y0 + T;
      bx(X0 - 4, X0, c - 13, c + 13, 18, 26, 0xa7b0be); bx(X0 - 5, X0 - 4, c - 11, c + 11, 20, 22, 0x6e7886);               // runde Platte als Stufenblock
      bx(X0 - 8, X0 - 5, c - 3, c + 3, 27, 6, gold); bx(X0 - 8, X0 - 5, c - 11, c + 11, 28.5, 3, gold); bx(X0 - 8, X0 - 5, c - 1.5, c + 1.5, 19, 22, gold);  // Nabe und Handrad (Kreuz)
      for (const dv of [-12, 12]) bx(X0 - 9, X0 - 5, c + dv - 2, c + dv + 2, 27, 6, 0xf5d25a); for (const dy of [-10, 10]) bx(X0 - 9, X0 - 5, c - 2, c + 2, 28.5 + dy - 2, 4, 0xf5d25a);
      bx(X0 - 4, X0, c - 20, c - 15, 50, 5, dark); bx(X0 - 4.4, X0 - 3.6, c - 19, c - 16, 51, 3, 0xe5392e, 1);             // Riegel und rote Lampe
      bx(X0 - 3, X0, Y0 + 3, Y0 + 2 * T - 3, 61, 1.2, 0xffffff, .35);
    }
  });
  // Tastenfeld (Code des Tresors): Standfuss, Saeule, Kopf mit Tasten, gruene Lampe
  KL.obj('pad', (k, o) => {
    B(k, o.x, o.y, 0, 10, 4, 10, 0, 0x3a4a60); B(k, o.x, o.y, 4, 5, 18, 5, 0, 0x7d8ea6); B(k, o.x, o.y, 22, 13, 11, 9, 0, 0x2f5fb0);
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) B(k, o.x - 4 + i * 4, o.y + 4.6, 23.2 + j * 2.8, 2.6, 2, 1, 0, 0xf0f4f8);
    B(k, o.x, o.y, 33, 6, 1.6, 6, 0, 0x7ee34a, 1);
  });

  // ---------- Fundort des Codes: Buerogeraet je Art, dazu Zettel, solange der Code fehlt ----------
  // Teile [breite, tiefe, unten, hoehe, farbe, versatz]
  const NOTE = { bin: [[16, 16, 0, 18, 0x4fae6a], [18, 18, 18, 2, 0x2f7a47]], copy: [[24, 18, 0, 22, 0xe7ebef], [24, 18, 22, 3, 0x4aa8e8, 0], [22, 14, 25, 1.2, 0x2a2e36]],
    coffee: [[24, 12, 0, 22, 0x8a4a2c], [10, 8, 22, 5, 0xe9ecef], [10, 4, 12, 3, 0x2d3238]], file: [[24, 22, 0, 40, 0x7f93ad], [20, 1, 10, 3, 0xd6dbe2], [20, 1, 24, 3, 0xd6dbe2]] };
  // Wandarten (Ticket 228): stehen an der Wand der Kachel (die Karte waehlt Kacheln mit angrenzender Wand '#'), gebaut in Wandkoordinaten: u laengs der Wand, v Tiefe von der Wandflaeche weg, y Hoehe.
  // Teile [u, v, unten, breite laengs, tiefe, hoehe, farbe]; ps ist der Platz fuer den Zettel [u, v, hoehe] (immer von oben sichtbar, auf einem Brett oder Regal, nie senkrecht an der Wand)
  const WALL = {
    coat: { ps: [3, 5, 48], p: [[0, .8, 8, 30, 1.6, 44, 0x8a6a42], [0, 4, 46, 30, 8, 2, 0x6b4e2e], [-7, 3.4, 12, 9, 4.4, 33, 0xd8412f], [6, 3.4, 12, 9, 4.4, 33, 0x2f6fd8], [-7, 3.4, 41, 7, 3.6, 4, 0xf59a88], [6, 3.4, 41, 7, 3.6, 4, 0x7fb0f5]] },
    pin: { ps: [0, 5, 10], p: [[0, .8, 12, 28, 1.6, 32, 0xb98f5a], [0, 1.8, 16, 8, .8, 7, 0xfff2a8], [-8, 1.8, 28, 7, .8, 6, 0xf08a8a], [8, 1.8, 26, 7, .8, 8, 0x9ad0ff], [0, 4, 8, 24, 7, 2, 0x6b4e2e]] },
    locker: { ps: [0, 9, 58], p: [[0, 9, 0, 18, 18, 58, 0x3c7fd0], [0, 18.3, 40, 16, 1, 4, 0x1b3f6e], [0, 18.3, 16, 16, 1, 4, 0x1b3f6e], [5, 18.6, 28, 2, 1, 5, 0xe8b923]] } };
  // Seite der Wand: Richtung (nx, nz) von der Kachelmitte zur Wand (erste angrenzende '#'), Rueckfall Norden
  const wallDir = (k, x, y) => { const tx = Math.floor(x / T), ty = Math.floor(y / T); for (const [dx, dz] of [[0, -1], [-1, 0], [1, 0], [0, 1]]) if (k.E.cellAt(tx + dx, ty + dz) === '#') return [dx, dz]; return [0, -1] };
  // Zettel (Ticket 228): gross, hell, leicht schraeg, mit Textzeilen und rotem Rand, ohne Leuchten
  const paper = (k, x, z, t, rot) => { B(k, x, z, t, 14, 1.2, 11, rot, 0xfffbe6); B(k, x, z - 3, t + 1.2, 10, .5, 1.2, rot, 0x6b7280); B(k, x, z, t + 1.2, 10, .5, 1.2, rot, 0x6b7280); B(k, x - 5, z - 4.4, t + 1.2, 3, .5, 3, rot, 0xd9382c) };
  KL.obj('note', (k, o) => {
    const W = WALL[o.n];
    if (W) {
      const [nx, nz] = wallDir(k, o.x, o.y), zx = nz !== 0, px = -nz, pz = nx;   // Querrichtung (laengs der Wand)
      const at = (u, v) => [o.x + nx * (16 - v) + px * u, o.y + nz * (16 - v) + pz * u];
      for (const [u, v, y0, su, sv, sh, c] of W.p) { const [wx, wz] = at(u, v); B(k, wx, wz, y0, zx ? su : sv, sh, zx ? sv : su, 0, c) }
      if (o.paper) { const [wx, wz] = at(W.ps[0], W.ps[1]); paper(k, wx, wz, W.ps[2], zx ? -.25 : .25) }
      return;
    }
    let t = o.n === 'desk' || o.n === 'mon' ? top(k, o.x, o.y) : 0; const P = NOTE[o.n] || (o.n === 'desk' || o.n === 'mon' || o.n === 'mgr' ? [] : NOTE.file);
    for (const q of P) { B(k, o.x + (q[5] || 0), o.y, q[2], q[0], q[3], q[1], 0, q[4]); t = Math.max(t, q[2] + q[3]) }
    if (o.paper) paper(k, o.x, o.y, t, -.2);
  });

  // ---------- Beute: Geldbuendel (offener Tresor, Notenbank), Beutesack, leere Kassen und Automaten ----------
  // Geldbuendel (Ticket 198 Tresor): gross und auffaellig (rund doppelte Groesse): Stapel aus drei satt gruenen Buendeln mit heller Banderole und goldenem Siegel, oben ein leuchtender Streifen
  const stack = (k, x, z, y0, n) => { for (let i = 0; i < n; i++) { const a = (i % 2 ? .1 : -.08), yy = y0 + i * 6.2; B(k, x, z, yy, 26, 6, 16, a, 0x2fb457, .1); B(k, x, z, yy - .1, 5.4, 6.2, 16.4, a, 0xf6f0d6); B(k, x + 1.6, z, yy + 6, 2.2, .5, 16.6, a, 0xe8b923, .3) } }
  // Geldbuendel (Ticket 255): drei Stapel mit Banderole, oben ein erkennbarer Schein aus Kloetzen: heller Schein mit dunkelgruenem Rand, Medaillon links, Wertzahlen in den Ecken, die Banderole quer darueber mit rotem Stempel
  KL.obj('bundle', (k, o) => {
    const t = top(k, o.x, o.y); stack(k, o.x, o.y, t, 3);
    const y = t + 18.6, a = -.08, c = Math.cos(a), s_ = Math.sin(a), P = (dx, dz, y0, sx, sy, sz, col, em, da) => B(k, o.x + dx * c - dz * s_, o.y + dx * s_ + dz * c, y0, sx, sy, sz, a + (da || 0), col, em);
    P(0, 0, y, 24.4, .6, 14.4, 0xcfe9b6);                                                                                                       // Schein
    P(0, -6.7, y + .6, 24.4, .5, 1.1, 0x2d7a44); P(0, 6.7, y + .6, 24.4, .5, 1.1, 0x2d7a44); P(-11.7, 0, y + .6, 1.1, .5, 14.4, 0x2d7a44); P(11.7, 0, y + .6, 1.1, .5, 14.4, 0x2d7a44);      // Rand
    P(-7, 0, y + .6, 6, .5, 6, 0x3a8f55); P(-7, 0, y + .6, 6, .5, 6, 0x3a8f55, 0, .785); P(-7, 0, y + 1.1, 2.6, .4, 2.6, 0xcfe9b6);              // Medaillon
    for (const [dx, dz] of [[-8.6, -4], [-8.6, 4], [8.6, -4], [8.6, 4]]) P(dx, dz, y + .6, 2.6, .4, 1.6, 0x2d7a44);                              // Wertzahlen in den Ecken
    P(8, 0, y + .6, 4, .4, 4, 0x3a8f55);                                                                                                         // zweites Feld rechts
    P(1.6, 0, y + .6, 5.4, .8, 15.4, 0xf6f0d6); P(1.6, 0, y + 1.4, 2.4, .4, 2.4, 0xd8321f);                                                     // Banderole quer mit Stempel
  });
  KL.obj('bag', (k, o) => {
    const t = top(k, o.x, o.y);
    B(k, o.x, o.y, t, 15, 6, 12, 0, 0x8a6a3a); B(k, o.x, o.y, t + 6, 12, 5, 10, .25, 0xa8824a); B(k, o.x, o.y, t + 11, 6, 3, 6, .5, 0x8a6a3a);   // Sack in drei Stufen
    B(k, o.x, o.y, t + 8, 16, 1.4, 13, 0, 0xe8b923, .25); B(k, o.x, o.y + 6.3, t + 3, 7, 4, .8, 0, 0xf2ecd0); B(k, o.x - 1, o.y + 6.4, t + 3.8, 3, 2.4, .6, 0, 0x2f9e4f);
  });
  // geleerte Kasse oder Automat (view3d zeichnet sonst einen dunklen Fleck): Abdeckung ueber Bildschirm und Schublade, rote Lampe
  KL.obj('dark', (k, o) => {
    const c = k.E.cellAt(Math.floor(o.x / T), Math.floor(o.y / T)), t = top(k, o.x, o.y);
    if (c === 'A') { B(k, o.x, o.y + 8.9, 24, 13, 11, .9, 0, 0x16191e); B(k, o.x, o.y + 9.4, 36, 4, 1.5, .6, 0, 0xe5392e, 1) }
    else { B(k, o.x, o.y, t, 15, 6.6, 12, 0, 0x2f343c); B(k, o.x, o.y + 6.3, t + 5, 5, 1.4, .6, 0, 0xe5392e, 1) }
  });


  // ---------- Zaun f: Pfosten und zwei Latten, quer zur Nachbarschaft; Barrikade X: Bretter, Balken, Nieten ----------
  const isF = (k, x, y) => k.E.cellAt(x, y) === 'f';
  KL.obj('f', (k, x, y, c) => { // Zaun: je Kachel zwei Latten und ein Pfosten (am freien Ende auch der zweite), wenige Kloetze, weil es auf der Bank mehr als hundert Zaunkacheln gibt
    const cx = x * T + T / 2, cz = y * T + T / 2, hz = isF(k, x - 1, y) || isF(k, x + 1, y) || !(isF(k, x, y - 1) || isF(k, x, y + 1)), L = 31, S = (a, b, h, dy, col) => k.brick(cx + (hz ? a : 0), cz + (hz ? 0 : a), dy, hz ? b : 2.6, h, hz ? 2.6 : b, col);
    const n1 = hz ? isF(k, x + 1, y) : isF(k, x, y + 1);
    S(-L / 2 + 1.5, 3, 28, 0, 0x9aa5b4); if (!n1) S(L / 2 - 1.5, 3, 28, 0, 0x9aa5b4);
    S(0, L, 3, 22, 0xd2d9e4); S(0, L, 3, 11, 0xd2d9e4);
  });
  KL.obj('X', (k, x, y, c, spec) => {
    const cx = x * T + T / 2, cz = y * T + T / 2, B_ = k.brick, w = T - 2;
    k.shadow(cx, cz, w + 8);
    for (let i = 0; i < 4; i++) B_(cx, cz, i * 7.2, w, 6.8, w - 3, i % 2 ? 0xb07a45 : 0xc98d52);
    B_(cx, cz, 28.8, w - 2, 2, w - 5, 0x8a5a30); B_(cx - w / 2 + 3, cz, 0, 4, 30, w, 0x6f4a28); B_(cx + w / 2 - 3, cz, 0, 4, 30, w, 0x6f4a28);
    for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) B_(cx + a * (w / 2 - 3), cz + b * (w / 2 - 5), 30, 2.4, 1.2, 2.4, 0xd8dde4);
    B_(cx, cz, 14, 3, 3, w + .6, 0xd8dde4, .1, .78); k.studs(cx, cz, w - 8, w - 8, 30.8, 0xc98d52);
  });

  // ---------- Barrikade im Zustand (scen3d 'bar', je Kachel): Stufe lv (Stahlplatten), Heile f (Schaeden) auf dem Grundkoerper der Kachel X ----------
  KL.obj('bar', (k, o) => {
    const x = o.x, z = o.y, f = o.f, w = T - 2;
    for (let i = 1; i < o.lv && i < 3; i++) { B(k, x, z + w / 2 - 1, 3 + (i - 1) * 12, w - 6, 10, 2, 0, 0x8d97a6); for (const a of [-1, 1]) B(k, x + a * (w / 2 - 6), z + w / 2, 5 + (i - 1) * 12, 2.2, 2.2, 1.2, 0, 0xe8edf3) }
    if (f < .75) { B(k, x - 6, z + w / 2 - 1.2, 20, 9, 7, 1.4, 0, 0x2a1d12); B(k, x + 8, z + w / 2 - 1, 8, 6, 5, 1.4, 0, 0x2a1d12) }
    if (f < .5) { B(k, x + 4, z - 2, 30, 9, 5, 4, .5, 0x6f4a28); B(k, x - 8, z + 3, 31, 6, 4, 3, -.4, 0xa07040) }
    if (f < .25) { B(k, x, z + w / 2 - 1, 12, 13, 12, 1.6, 0, 0x14100c); B(k, x - 10, z + 6, 30, 8, 8, 4, .7, 0x6f4a28); B(k, x + 11, z - 5, 31, 7, 6, 4, -.8, 0x6f4a28) }
  });

  // ---------- Gadgets am Boden ('d:' plus Art, fn(k, q) wie die Szenario-Teile, ein Haken in view3d buildFx; q aus fx3d): Falle (trap), Notfallkoffer (aid), Ablenker (dcy), Granate (gr) ----------
  KL.obj('d:trap', (k, q) => {
    const lamp = q.armed ? 0xff3a2e : 0xffc23a;
    if (q.k === 'mine') { for (const a of [0, .785]) B(k, q.x, q.y, 0, 13, 3, 13, a, 0x4a5a30); B(k, q.x, q.y, 3, 7, 1.6, 7, .4, 0x2f3a22); B(k, q.x, q.y, 4.6, 3, 2, 3, 0, lamp, 1.3) }
    else if (q.k === 'claw') { B(k, q.x, q.y, 3, 18, 8, 4, 0, 0x5b7a35); B(k, q.x, q.y + 2.4, 4, 14, 6, 1, 0, 0x2f4a1c); for (const a of [-1, 1]) B(k, q.x + a * 6, q.y - 2, 0, 1.4, 4, 1.4, 0, 0x2a2e36); B(k, q.x, q.y, 11, 3, 2, 3, 0, lamp, 1.3) }
    else { B(k, q.x, q.y, 0, 12, 5, 8, 0, 0xd9c28a); B(k, q.x, q.y, 5, 12, .8, 8, 0, 0xb09a62); B(k, q.x - 3, q.y, 5.8, 2.6, 1.6, 2.6, 0, lamp, 1.3); B(k, q.x + 2.5, q.y, 5.8, 4, 1, 4, 0, 0x2a2e36) }
  });
  KL.obj('d:aid', (k, q) => { B(k, q.x, q.y, 0, 16, 8, 12, 0, 0xf5f8f5); B(k, q.x, q.y, 8, 17, 1.4, 13, 0, 0xd8dde4); B(k, q.x, q.y + 6.1, 2, 6, 5, .8, 0, 0xe5392e); B(k, q.x, q.y + 6.1, 3.8, 2, 1.6, .9, 0, 0xffffff, .3); B(k, q.x, q.y + 6.1, 2.5, 2, 4, .9, 0, 0xffffff); B(k, q.x, q.y + 6.2, 3.6, 5, 1.6, .9, 0, 0xffffff); B(k, q.x, q.y, 9.4, 6, 1.8, 1.6, 0, 0x6a6a72) });
  KL.obj('d:dcy', (k, q) => { B(k, q.x, q.y, 0, 10, 5, 8, 0, 0x3a4a60); B(k, q.x, q.y, 5, 6, 2, 5, 0, 0xffc23a, .4); B(k, q.x, q.y, 7, 3, 3, 3, 0, 0xff9a2e, q.bl ? 1.4 : .2) });
  const GR = { flash: 0xf4f0d8, smoke: 0xb4bcc8, dec: 0xffc23a, shell: 0xff8a3a, gas: 0x9fbf3c };
  KL.obj('d:gr', (k, q) => { const c = GR[q.k] || GR.gas; B(k, q.x, q.y, q.h, 5.4, 6.4, 5.4, .3, c); B(k, q.x, q.y, q.h + 6.4, 3.4, 1.6, 3.4, 0, 0x2a2e36); B(k, q.x + 2.6, q.y, q.h + 7, 2.6, 1, 1, 0, 0xd8dde4) });
}
