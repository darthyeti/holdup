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
    if (o.open) {
      bx(X0 - 3, X0 + 3, Y0 - 2, Y0 + 2 * T + 2, 0, 60, steel); bx(X0 - 4, X0 - 3, Y0 + 2, Y0 + 2 * T - 2, 6, 48, 0xb7c0cd);
      for (let i = 0; i < 4; i++) { const v = Y0 + 8 + i * 16; bx(X0 - 5, X0 - 4, v - 2, v + 2, 52, 4, gold); bx(X0 - 5, X0 - 4, v - 2, v + 2, 8, 4, gold) }
      bx(X0 + T, X0 + 2 * T, Y0 + 2, Y0 + 2 * T - 2, 0, .5, 0xffd264, .55); // warmes Licht aus dem Raum am Boden
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
    coffee: [[24, 12, 0, 22, 0x8a4a2c], [10, 8, 22, 5, 0xe9ecef], [10, 4, 12, 3, 0x2d3238]], file: [[24, 22, 0, 40, 0x7f93ad], [20, 1, 10, 3, 0xd6dbe2], [20, 1, 24, 3, 0xd6dbe2]],
    pin: [[22, 4, 6, 30, 0xb98f5a], [16, 1, 12, 8, 0xfff2a8], [8, 1, 22, 6, 0xf08a8a]], coat: [[2.5, 2.5, 0, 48, 0x7a5b3a], [14, 3, 46, 2, 0x7a5b3a], [7, 5, 20, 24, 0xd8412f, -4], [7, 5, 18, 22, 0x2f6fd8, 4]],
    locker: [[18, 26, 0, 58, 0x3c7fd0], [17, 1, 40, 4, 0x1b3f6e], [17, 1, 16, 4, 0x1b3f6e], [2, 1, 28, 4, 0xe8b923]] };
  KL.obj('note', (k, o) => {
    let t = o.n === 'desk' || o.n === 'mon' ? top(k, o.x, o.y) : 0; const P = NOTE[o.n] || (o.n === 'desk' || o.n === 'mon' || o.n === 'mgr' ? [] : NOTE.locker);
    for (const q of P) { B(k, o.x + (q[5] || 0), o.y, q[2], q[0], q[3], q[1], 0, q[4]); t = Math.max(t, q[2] + q[3]) }
    if (o.paper) { B(k, o.x, o.y, t, 10, 1, 8, 0, 0xffffff, .12); B(k, o.x + 1, o.y - 1, t + 1, 9, .8, 7, .12, 0xfff7c9, .12); B(k, o.x, o.y + .5, t + 1.8, 7, .3, 1, 0, 0xc23a2e) }
  });

  // ---------- Beute: Geldbuendel (offener Tresor, Notenbank), Beutesack, leere Kassen und Automaten ----------
  const stack = (k, x, z, y0, n) => { for (let i = 0; i < n; i++) { B(k, x, z, y0 + i * 3.6, 14, 3.4, 9, i % 2 ? .06 : -.05, 0x2f9e4f); B(k, x, z, y0 + i * 3.6, 4, 3.45, 9.2, i % 2 ? .06 : -.05, 0xf2ecd0) } }
  KL.obj('bundle', (k, o) => { const t = top(k, o.x, o.y); stack(k, o.x, o.y, t, 2); B(k, o.x, o.y, t + 7.2, 14, .6, 9, 0, 0x7ee34a, .3) });
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

  // ---------- Hintertueren und Nebeneingaenge (Ticket 211): Szenario-Teil 'lock' fuer L (zu) und l (offen), auch Personaltueren, Hoftuer und Zellentueren des Gefaengnisses ----------
  // Der Koerper der Kachel L (Wandhoehe, Schnitt wie Waende) bleibt aus der Tabelle, hier kommen beidseitig Rahmen, Stahlblatt, Panikstange, Schild, Kartenleser mit roter LED. Offen (l): Pfosten, an die Laibung
  // geklapptes Blatt, Schwelle, Leser mit gruener LED. Die Wandrichtung folgt den Nachbarkacheln (quer zur Wand sind die zwei Seiten der Tuer), o.x, o.y Mitte der Kachel, o.open.
  const WALLS = '#PWwYVLlDdg';
  KL.obj('lock', (k, o) => {
    const T_ = k.T, cell = k.E.cellAt, tx = Math.floor(o.x / T_), ty = Math.floor(o.y / T_), isW = (a, b) => WALLS.includes(cell(a, b)) || (k.C.cells[cell(a, b)] || { s: [] }).s.some(q => q[0] === 0 && q[1] >= k.C.wallH);
    const hz = isW(tx - 1, ty) && isW(tx + 1, ty) ? true : isW(tx, ty - 1) && isW(tx, ty + 1) ? false : true;
    // u entlang der Wand, v quer dazu (Seiten +1 Sueden oder Osten, -1 Norden oder Westen), Kloetze am Mittelpunkt der Kachel
    const br = (u, v, y0, su, sh, sv, col, em) => k.dbrick(o.x + (hz ? u : v), o.y + (hz ? v : u), y0, hz ? su : sv, sh, hz ? sv : su, 0, col, em);
    const frame = 0x2a3038, steel = 0x9aa6b6, dark = 0x3b4350, H = 56;
    if (!o.open) {
      for (const sd of [-1, 1]) {
        const f = sd * 16.4, p = sd * 17.5;
        br(-13.8, f, 0, 4.4, H + 3, 1.6, frame); br(13.8, f, 0, 4.4, H + 3, 1.6, frame); br(0, f, H, 32, 3.4, 1.6, frame);          // Rahmen: zwei Pfosten und Sturz
        br(0, f, 1, 23.4, H - 2, 1.2, steel);                                                                                       // Stahlblatt
        br(0, f, 1, 23.4, 3, 1.5, dark); br(0, f, H - 4, 23.4, 3, 1.5, dark); br(0, f, 27, 23.4, 1.6, 1.5, dark);                    // Blech-Rippen
        br(-2, p, 24, 21, 3, 2.4, 0xf0f3f7); br(-12, sd * 17, 23, 2.4, 5, 2, 0x6b7380); br(8, sd * 17, 23, 2.4, 5, 2, 0x6b7380);   // Panikstange und Halter
        br(-9, sd * 17, 46, 9, 5, 1.2, 0xffc83a); br(-9, sd * 17.6, 47.6, 6, 1.8, .6, 0x1a1d22);                                     // gelbes Schild
        br(9.5, p, 31, 6, 11, 2.4, 0x20252c); br(9.5, sd * 18.7, 38, 3, 2.4, .6, 0xff3a2e, 1.8); br(9.5, sd * 18.7, 33, 4, 3, .6, 0x4a5260);  // Leser mit roter LED und Tastenfeld
      }
    } else {
      for (const sd of [-1, 1]) { br(-14.5, sd * 15.5, 0, 3, 52, 1.2, frame); br(14.5, sd * 15.5, 0, 3, 52, 1.2, frame) }
      br(-14.5, 0, 0, 3, 52, 32, frame); br(14.5, 0, 0, 3, 52, 32, frame); br(0, 0, 0, 26, .6, 32, 0x20252c);                            // Pfosten (Laibung) und Schwelle
      br(-12, 0, 0, 2.6, 50, 29, steel); br(-12, 0, 24, 2.8, 3, 29, dark); br(-10.4, 0, 22, 1, 3, 14, 0xf0f3f7);                           // an die Laibung geklapptes Blatt mit Rippe und Stange
      br(11, 15.6, 30, 5, 9, 1.6, 0x20252c); br(11, 16.4, 36, 3, 2.4, .6, 0x4cf06a, 1.8); br(11, -15.6, 30, 5, 9, 1.6, 0x20252c); br(11, -16.4, 36, 3, 2.4, .6, 0x4cf06a, 1.8); // Leser mit gruener LED
    }
  });
}
