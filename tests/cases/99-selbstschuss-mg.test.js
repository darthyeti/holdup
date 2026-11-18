// Skillbaum v2, Schritt 5 (#291): Selbstschuss-MG (V4). Taste V halten zeigt Platz und Kegel, Loslassen stellt es (nur im Ueberfall, 1/1/2 Stueck, 40/60/80 Schuss), gleiche Verbote wie die Feldbarrikade (fieldSpot). Kegel 90 Grad, Reichweite CFG.mg.range, schiesst nur auf Beamte (COPK) mit Sicht, trifft keine Mitspieler, leer = still, die Polizei nimmt es als Ziel (nur ohne Spieler in Sicht) und zerstoert es. Coop: Schnappschuss mg, Ereignis mg, VER 88.
const { glPage } = require('../glshare');   // gemeinsamer WebGL-Browser (tests/glshare.js)
const HELP = `(() => {
  const D = __dbg, T = 32;
  const strip = () => { const w = D.world(); for (let ty = w.WY0 + 2; ty < w.WY0 + w.H - 2; ty++) for (let tx = w.WX0 + 9; tx < w.WX0 + w.W - 3; tx++) { const x = tx * T + 16, y = ty * T + 16; let ok = true;
    for (let d = -240; d <= 70 && ok; d += 12) for (const dy of [-1, 0, 1]) if (D.isSol(Math.floor((x + d) / T), ty + dy)) ok = false;
    if (ok && D.clear(x - 240, y, x + 70, y)) return { x, y }; } return null; };
  const scene = (sk, phase1) => { D.sessReset(); Object.assign(D.SESSION.sk, sk || {}); D.setScenario('bank'); D.setSeedMode('random'); D.setLage([]); D.setTurn('S'); D.buildSeed(5017); D.CFG.policeAt = 1e6; D.CFG.policeForced = 1e6;
    D.reset(); if (!phase1) D.startHeist(false, D.get().me); const g = D.get(), me = g.me, sp = strip(); if (!sp) return null; g.en.length = 0; me.x = sp.x; me.y = sp.y; me.hp = 100; me.inv = 0; me.ar = 0; return { D, g, me, sp }; };
  // Beamter (kind false = Polizist, 'grd' = Wachmann) steht still und schiesst nur mit shoot
  const cop = (sc, x, y, kind, shoot) => { const c = D.mkCop(x, y, kind || false); c.mode = 'post'; c.post = { x, y, a: 0, door: null }; c.rt = 1e9; c.cool = shoot ? 0 : 1e9; if (kind === 'grd') c.kind = 'grd'; sc.g.en.push(c); return c; };
  const run = (sc, sec, pin, god) => { for (let i = 0; i < sec * 30; i++) { if (god) sc.me.hp = 1e9; for (const [f, x, y] of pin || []) { f.x = x; f.y = y; } D.update(1 / 30); } };
  // MG 60 px westlich von me aufstellen (Blick nach Westen)
  const put = sc => { D.useGadget(sc.me, 8, sc.sp.x - 60, sc.sp.y); return D.mgs()[0]; };
  return { D, strip, scene, cop, run, put };
})()`;

module.exports = [
  {
    name: 'MG stellen: Stueck 1/1/2 und Schuss 40/60/80 je Stufe, Wurf n=8 nur im Ueberfall, Blick = Richtung zum Platz, gekuerzt auf die Reichweite, nichts ohne Vorrat, nicht doppelt, nicht auf Figuren, nicht in Waende',
    async run(t) {
      const r = await t.page.evaluate(`(() => { const H = ${HELP}, D = H.D, o = {}, T = 32;
        o.stock = [1, 2, 3].map(l => H.scene({ V4: l }, true).me.mg | 0); o.ammo = [1, 2, 3].map(l => { const sc = H.scene({ V4: l }); const m = H.put(sc); return m && m.am; });
        o.soon = !D.CFG.skill.V4.soon;
        let sc = H.scene({ V4: 1 }, true); D.useGadget(sc.me, 8, sc.sp.x - 60, sc.sp.y); o.p1 = [D.mgs().length, sc.me.mg, (D.msgs().banner || '').length > 0];
        sc = H.scene({ V4: 1 }); const m = H.put(sc); o.m = m ? [Math.round(m.a * 100) / 100, m.hp === D.CFG.mg.hp, sc.me.mg, Math.floor((sc.sp.x - 60) / T) === Math.floor(m.x / T)] : null; o.pi = Math.round(Math.PI * 100) / 100;
        sc = H.scene({ V4: 3 }); H.put(sc); D.useGadget(sc.me, 8, sc.sp.x - 60, sc.sp.y); o.again = [D.mgs().length, sc.me.mg];
        sc = H.scene({}); D.useGadget(sc.me, 8, sc.sp.x - 60, sc.sp.y); o.none = D.mgs().length;
        sc = H.scene({ V4: 2 }); H.cop(sc, Math.floor((sc.sp.x - 60) / T) * T + 16, Math.floor(sc.sp.y / T) * T + 16); D.useGadget(sc.me, 8, sc.sp.x - 60, sc.sp.y); o.occ = [D.mgs().length, sc.me.mg];
        sc = H.scene({ V4: 2 }); D.useGadget(sc.me, 8, sc.me.x, sc.me.y); o.self = [D.mgs().length, sc.me.mg];
        sc = H.scene({ V4: 2 }); D.useGadget(sc.me, 8, sc.sp.x - 300, sc.sp.y); const g = D.mgs()[0]; o.far = g ? Math.round(Math.hypot(g.x - sc.me.x, g.y - sc.me.y)) : null; o.R = D.CFG.trap.reach;
        const w = D.world(); let spot = null; for (let ty = w.WY0; ty < w.WY0 + w.H && !spot; ty++) for (let tx = w.WX0; tx < w.WX0 + w.W && !spot; tx++) if (!D.isSol(tx, ty) && D.isSol(tx + 1, ty) && !D.isSol(tx - 1, ty)) spot = { x: tx * T + 16, y: ty * T + 16, wx: (tx + 1) * T + 16 };
        sc = H.scene({ V4: 2 }); if (spot) { sc.me.x = spot.x; sc.me.y = spot.y; D.useGadget(sc.me, 8, spot.wx, spot.y); o.wall = [D.mgs().length, sc.me.mg]; }
        return o; })()`);
      t.eq(r.stock, [1, 1, 2], 'Stueck je Stufe');
      t.eq(r.ammo, [40, 60, 80], 'Schuss je Stufe');
      t.ok(r.soon, 'V4 ist nicht mehr soon');
      t.eq(r.p1, [0, 1, true], 'Erkunden: nichts gestellt, Hinweis im Bild');
      t.eq(r.m, [r.pi, true, 0, true], 'Ueberfall: MG am Zielpunkt, Blick nach Westen, HP aus CFG, Vorrat 0');
      t.eq(r.again, [1, 1], 'zweites Stueck auf denselben Platz abgelehnt (Vorrat bleibt)');
      t.eq(r.none, 0, 'ohne Knoten nichts');
      t.eq(r.occ, [0, 1], 'mit einem Beamten auf der Kachel abgelehnt');
      t.eq(r.self, [0, 1], 'auf der eigenen Kachel abgelehnt');
      t.ok(r.far !== null && r.far <= r.R + 23, 'weiter Zielpunkt wird gekuerzt: ' + r.far);
      t.eq(r.wall, [0, 1], 'in eine Wand nichts');
    },
  },
  {
    name: 'MG verboten wie die Feldbarrikade: Fahrspur, Wagenplaetze, Fluchtzone (alle vier Strassenseiten), in und vor Tueren',
    async run(t) {
      const r = await t.page.evaluate(`(() => { const H = ${HELP}, D = H.D, T = 32, o = {};
        for (const turn of ['S', 'N', 'E', 'W']) { D.sessReset(); D.SESSION.sk.V4 = 2; D.setScenario('bank'); D.setSeedMode('random'); D.setLage([]); D.setTurn(turn); D.buildSeed(5017); D.reset(); D.startHeist(false, D.get().me); const me = D.get().me, L = D.LANE(), res = {};
          const probe = (x, y) => { me.x = x; me.y = y; return D.trapSpot(me, 'mg', x, y); };
          const mid = L.pt((L.lo + L.hi) / 2, L.pos); res.lane = probe(mid[0], mid[1]).ok;
          const sl = L.slots[0], sp = L.pt(sl.u * T + 16, L.pos); res.slot = probe(sp[0], sp[1]).ok;
          const ex = L.exit.cells[0]; res.exit = probe(ex[0] * T + 16, ex[1] * T + 16).ok;
          o[turn] = res; }
        const sc = H.scene({ V4: 2 }); const w = D.world(); let door = null; for (let ty = w.WY0; ty < w.WY0 + w.H && !door; ty++) for (let tx = w.WX0; tx < w.WX0 + w.W && !door; tx++) if ('Dd'.indexOf(w.cell(tx, ty)) >= 0) door = [tx, ty];
        const pr = (cx, cy) => { sc.me.x = cx * T + 16; sc.me.y = cy * T + 16; return D.trapSpot(sc.me, 'mg', cx * T + 16, cy * T + 16); };
        o.door = door ? pr(door[0], door[1]).ok : null;
        o.doorNb = door ? [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(d => !D.isSol(door[0] + d[0], door[1] + d[1])).map(d => pr(door[0] + d[0], door[1] + d[1]).ok) : null;
        const s2 = H.scene({ V4: 2 }); o.free = D.trapSpot(s2.me, 'mg', s2.sp.x - 60, s2.sp.y).ok;
        return o; })()`);
      for (const k of ['S', 'N', 'E', 'W']) t.eq([r[k].lane, r[k].slot, r[k].exit], [false, false, false], 'Strassenseite ' + k + ': Fahrspur, Wagenplatz und Fluchtzone verboten');
      t.eq(r.door, false, 'auf der Tuer verboten');
      t.ok(r.doorNb && r.doorNb.length > 0 && r.doorNb.every(x => x === false), 'vor der Tuer verboten: ' + JSON.stringify(r.doorNb));
      t.eq(r.free, true, 'freier Boden im Gebaeude erlaubt');
    },
  },
  {
    name: 'MG schiesst: nur auf Beamte im Kegel (90 Grad) und in der Reichweite, nicht auf Wachleute, nicht rueckwaerts, Schaden je Kugel wie SMG, Feuerrate unter der SMG, leer = still, Mitspieler im Weg werden nicht getroffen',
    async run(t) {
      const r = await t.page.evaluate(`(() => { const H = ${HELP}, D = H.D, o = {};
        const trial = setup => { const sc = H.scene({ V4: 1 }); const m = H.put(sc); if (setup) setup(m, sc); const c = H.cop(sc, m.x - 150, m.y); c.hp = c.mhp = 1e5; const hp0 = c.hp, am0 = m.am; H.run(sc, 2, [[c, c.x, c.y]]); return { dmg: hp0 - c.hp, used: am0 - m.am }; };
        const base = trial(); o.base = [base.dmg > 0, base.used > 0, base.dmg % D.CFG.mg.dmg === 0 && base.dmg <= base.used * D.CFG.mg.dmg];
        o.dmgSmg = D.CFG.mg.dmg === D.CFG.wpn.smg.dmg; o.rate = D.CFG.mg.rate > D.CFG.wpn.smg.cool * 1.5;
        o.edgeIn = trial(m => { m.a = Math.PI + 0.7; }).used > 0; o.edgeOut = trial(m => { m.a = Math.PI + 0.9; }).used; o.behind = trial(m => { m.a = 0; }).used; o.side = trial(m => { m.a = Math.PI / 2; }).used;
        D.CFG.mg.range = 100; o.far = trial().used; D.CFG.mg.range = 260;
        { const sc = H.scene({ V4: 1 }); const m = H.put(sc); const c = H.cop(sc, m.x - 100, m.y, 'grd'); H.run(sc, 2, [[c, c.x, c.y]]); o.grd = [m.am, c.hp === c.mhp]; }
        { const sc = H.scene({ V4: 1 }); const m = H.put(sc); m.am = 0; const c = H.cop(sc, m.x - 100, m.y); H.run(sc, 2, [[c, c.x, c.y]]); o.empty = [m.am, c.hp === c.mhp, D.mgs().length]; }
        { const sc = H.scene({ V4: 1 }); const m = H.put(sc); const c = H.cop(sc, m.x - 150, m.y); c.hp = c.mhp = 1e5; sc.me.x = m.x - 70; sc.me.y = m.y; H.run(sc, 2, [[c, c.x, c.y], [sc.me, sc.me.x, sc.me.y]]); o.mate = [sc.me.hp, m.am < 40, c.hp < c.mhp]; }
        { const sc = H.scene({ V4: 1 }); const m = H.put(sc); const c = H.cop(sc, m.x - 150, m.y); let sh = 0, last = m.am; for (let i = 0; i < 60; i++) { c.hp = c.mhp = 1e5; c.x = m.x - 150; c.y = m.y; D.update(1 / 30); if (m.am < last) { sh += last - m.am; last = m.am; } } o.cps = sh / 2; }
        return o; })()`);
      t.eq(r.base, [true, true, true], 'Beamter im Kegel: getroffen, Munition gezaehlt, Schaden je Kugel ' + JSON.stringify(r.base));
      t.ok(r.dmgSmg, 'Schaden je Kugel wie SMG');
      t.ok(r.rate, 'Feuerrate deutlich unter der SMG');
      t.ok(r.edgeIn, 'knapp im Kegel (40 Grad) schiesst');
      t.eq(r.edgeOut, 0, 'knapp ausserhalb (52 Grad) nicht');
      t.eq(r.behind, 0, 'hinter dem MG nicht');
      t.eq(r.side, 0, 'im rechten Winkel nicht');
      t.eq(r.far, 0, 'ausserhalb der Reichweite nicht');
      t.eq(r.grd, [40, true], 'Wachmann (kein Beamter) im Kegel wird nicht beschossen');
      t.eq(r.empty, [0, true, 1], 'leer: still, bleibt stehen');
      t.eq(r.mate, [100, true, true], 'Mitspieler im Schussfeld bleibt unverletzt, der Beamte dahinter wird getroffen');
      t.ok(r.cps > 3 && r.cps < 9, 'Schuss je Sekunde ' + r.cps);
    },
  },
  {
    name: 'MG und Polizei: ein Beamter ohne Spieler in Sicht nimmt es unter Feuer und zerstoert es (Meldung), mit Spieler in Sicht zielt er auf den Spieler; Polizeikugeln treffen es (HP aus CFG), eigene nicht; reset raeumt auf',
    async run(t) {
      const r = await t.page.evaluate(`(() => { const H = ${HELP}, D = H.D, T = 32, o = {};
        let sc = H.scene({ V4: 1 }); let m = H.put(sc); const mx = m.x, my = m.y;
        const shoot = own => { D.get().bl.push({ id: 9999, x: mx - 20, y: my, vx: 400, vy: 0, l: 1, o: own ? 1 : 0, dmg: 50, d: 50 }); sc.me.x = mx + 300; D.update(1 / 30); };
        shoot(true); o.own = m.hp; shoot(false); o.hit = m.hp;
        sc = H.scene({ V4: 1 }); m = H.put(sc); m.am = 0; const c = H.cop(sc, m.x - 150, m.y, false, true); sc.me.x = m.x + 500; let t0 = 0; while (D.mgs().length && t0 < 40) { H.run(sc, .5, [[c, c.x, c.y], [sc.me, sc.me.x, sc.me.y]], true); t0 += .5; } o.gone = [D.mgs().length, t0]; o.msg = D.msgs().feed.some(s => /Selbstschuss-MG.*zerst/.test(s));
        sc = H.scene({ V4: 1 }); m = H.put(sc); m.am = 0; const c2 = H.cop(sc, m.x - 150, m.y, false, true); H.run(sc, 6, [[c2, c2.x, c2.y], [sc.me, m.x + 60, m.y]], true); o.seen = [D.mgs().length, m.hp];
        sc = H.scene({ V4: 1 }); m = H.put(sc); H.run(sc, 6, [[sc.me, m.x + 60, m.y]]); o.quiet = [D.mgs().length, m.hp];
        sc = H.scene({ V4: 1 }); H.put(sc); D.reset(); o.reset = D.mgs().length;
        return o; })()`);
      t.eq(r.own, 120, 'eigene Kugeln schaden ihm nicht');
      t.eq(r.hit, 70, 'Polizeikugel mit 50 Schaden: 120 -> 70');
      t.eq(r.gone[0], 0, 'ohne Spieler in Sicht faellt es: ' + JSON.stringify(r.gone));
      t.ok(r.gone[1] < 30, 'nach ' + r.gone[1] + ' s zerstoert');
      t.ok(r.msg, 'Meldung im Verlauf');
      t.eq(r.seen[0], 1, 'mit Spieler in Sicht bleibt es stehen (der Beamte zielt auf den Spieler)');
      t.eq(r.quiet, [1, 120], 'ohne Beamten bleibt es heil');
      t.eq(r.reset, 0, 'reset raeumt auf');
    },
  },
  {
    name: 'MG zeichnen: 2D (Dreibein, Lauf, Kegel, Munition) und 3D (Kloetzchen-Bauer d:mg, Mündungsfeuer) ohne Fehler, fx3d liefert die Liste',
    timeout: 240000,
    async run(t) {
      const P = await glPage(t); if (!P) return;
      try {
        const r = await P.page.evaluate(`(async () => { const H = ${HELP}, D = H.D, o = {};
          const sc = H.scene({ V4: 2 }); const m = H.put(sc); H.cop(sc, m.x - 120, m.y); D.setFocus(true);
          D.draw(); o.d2 = D.mgs().length;
          const i0 = await D.view3d.set(true); if (i0.state !== 'an') return { i0 };
          for (let i = 0; i < 20; i++) { D.update(1 / 30); D.draw(); }
          const i = D.view3d.info(); o.errs = [i.errs, i.err]; o.mgs = D.mgs().length; o.fl = D.mgs()[0].am < 80;
          o.kl = i.fb ? JSON.stringify(i.fb) : '';
          return o; })()`);
        if (!r.d2) { t.ok(false, '3D nicht an: ' + JSON.stringify(r.i0)); return; }
        t.eq(r.errs[0], 0, 'keine Fehler beim Zeichnen (3D): ' + r.errs[1]);
        t.eq(r.mgs, 1, 'MG steht im Bild');
        t.ok(r.fl, 'es hat geschossen');
      } finally { await P.done(); }
    },
  },
  {
    name: 'MG im Coop: der Client stellt es (Taste V halten, loslassen), Host prueft, beide sehen es mit Munition, Schuesse zaehlen bei beiden, Vorrat im Schnappschuss, Zerstoeren erscheint beim Client',
    async run(t) {
      await t.loadTool('loopnet.js'); await t.loadInpage('coop.js');
      const r = await t.page.evaluate(() => {
        const G = CT.mkGame('bank', 321, 2), A = G.A, B = G.clients[0], o = {}; A.CFG.policeAt = 1e6; A.CFG.policeForced = 1e6;
        B.cv.dispatchEvent(new KeyboardEvent('keydown', { key: 'f', bubbles: true })); G.run(1);
        const p1 = A.get().players[1]; p1.kit = Object.assign({}, p1.kit, { sk: { V4: 1 } }); p1.mg = 1; B.get().me.kit = Object.assign({}, B.get().me.kit, { sk: { V4: 1 } }); G.run(.5);
        o.stock0 = B.get().me.mg | 0;
        const h = A.get().players[1]; let spot = null;
        for (const [dx, dy] of [[-60, 0], [60, 0], [0, 60], [0, -60]]) { const x = h.x + dx, y = h.y + dy; if (A.trapSpot(h, 'mg', x, y).ok) { spot = [x, y]; break; } }
        o.spot = !!spot; if (!spot) return o;
        const aim = () => { B.draw(); const q = B.mouse, cx = q.x - q.sx, cy = q.y - q.sy; q.sx = spot[0] - cx; q.sy = spot[1] - cy; q.t = B.get().time; B.draw(); }; aim();
        B.cv.dispatchEvent(new KeyboardEvent('keydown', { key: 'v', bubbles: true })); aim(); G.run(.1); B.cv.dispatchEvent(new KeyboardEvent('keyup', { key: 'v', bubbles: true })); G.run(.6);
        const ma = A.mgs(), mb = B.mgs(); o.n = [ma.length, mb.length]; o.dbg = [B.get().phase, B.get().me.mg, B.msgs().banner, A.msgs().banner, A.get().players[1].mg, spot, [h.x, h.y]]; if (!ma.length) return o;
        o.am = [ma[0].am, mb[0].am]; o.stock = [A.get().players[1].mg | 0, B.get().me.mg | 0];
        const m = ma[0], px = () => m.x + Math.cos(m.a) * 120, py = () => m.y + Math.sin(m.a) * 120;
        const e = A.mkCop(px(), py(), false); e.mode = 'post'; e.post = { x: e.x, y: e.y, a: 0, door: null }; e.rt = 1e9; e.cool = 1e9; e.hp = e.mhp = 1e6; A.get().en.push(e);
        for (let i = 0; i < 45; i++) { e.x = px(); e.y = py(); G.run(1 / 30); }
        o.shots = [40 - A.mgs()[0].am > 3, Math.abs(B.mgs()[0].am - A.mgs()[0].am) <= 3, 1e6 - e.hp > 0];
        A.mgHit(A.mgs()[0], 1e6); G.run(.5); o.gone = [A.mgs().length, B.mgs().length]; o.ver = A.VER;
        return o;
      });
      t.ok(r.spot, 'ein freier Platz in der Naehe des Clients');
      t.eq(r.stock0, 1, 'Vorrat kommt per Schnappschuss zum Client');
      t.eq(r.n, [1, 1], 'bei Host und Client ' + JSON.stringify(r.dbg));
      t.eq(r.am, [40, 40], 'Munition 40 bei beiden');
      t.eq(r.stock, [0, 0], 'Vorrat 1 -> 0 bei beiden');
      t.eq(r.shots, [true, true, true], 'es schiesst, Client sieht den Stand mit, Beamter getroffen');
      t.eq(r.gone, [0, 0], 'zerstoert: bei beiden weg');
      t.eq(r.ver, 88, 'VER 88');
    },
  },
];
