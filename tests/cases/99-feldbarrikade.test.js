// Skillbaum v2, Schritt 4 (#290): Feldbarrikade (V3). Taste 3 stellt eine Kachel X (kein Material, nur im Ueberfall, 2/3/4 Stueck), nicht auf Fahrspur, Wagenplaetzen, Fluchtzone (LANE, alle vier Strassenseiten), nicht in oder vor Tueren, keine Figur darauf. Solide, kugelsperrend, lehnbar, Polizeikugeln zerschiessen sie (CFG.field.hp). Coop: Schnappschuss fb, VER 87.
const HELP = `(() => {
  const D = __dbg, T = 32;
  const strip = () => { const w = D.world(); for (let ty = w.WY0 + 2; ty < w.WY0 + w.H - 2; ty++) for (let tx = w.WX0 + 9; tx < w.WX0 + w.W - 3; tx++) { const x = tx * T + 16, y = ty * T + 16; let ok = true;
    for (let d = -240; d <= 70 && ok; d += 12) for (const dy of [-1, 0, 1]) if (D.isSol(Math.floor((x + d) / T), ty + dy)) ok = false;
    if (ok && D.clear(x - 240, y, x + 70, y)) return { x, y }; } return null; };
  // Szene: sk setzt den Skillbaum, phase1 laesst im Erkunden, sonst Ueberfall; me steht auf dem Streifen
  const scene = (sk, phase1, turn) => { D.sessReset(); Object.assign(D.SESSION.sk, sk || {}); D.setScenario('bank'); D.setSeedMode('random'); D.setLage([]); D.setTurn(turn || 'S'); D.buildSeed(5017); D.CFG.policeAt = 1e6; D.CFG.policeForced = 1e6;
    D.reset(); if (!phase1) D.startHeist(false, D.get().me); const g = D.get(), me = g.me, sp = strip(); if (!sp) return null; g.en.length = 0; me.x = sp.x; me.y = sp.y; me.hp = 100; me.inv = 0; me.ar = 0; return { D, g, me, sp }; };
  const cop = (sc, x, y, kind) => { const c = D.mkCop(x, y, kind || false); c.mode = 'post'; c.post = { x, y, a: Math.PI, door: null }; c.rt = 1e9; c.a = Math.PI; c.cool = 1e9; sc.g.en.push(c); return c; };   // c.cool: der Beamte schiesst nicht, damit nur die Falle Leben nimmt
  // Sekunden Spielzeit, Beamte (pin: Liste [Figur, x, y]) und Spieler festgehalten, me.hp wahlweise hoch
  const run = (sc, sec, pin, god) => { for (let i = 0; i < sec * 30; i++) { if (god) sc.me.hp = 1e9; for (const [f, x, y] of pin || []) { f.x = x; f.y = y; } D.update(1 / 30); } };
  // Maus auf einen Weltpunkt: draw() rechnet mouse.x und mouse.y aus mouse.sx, mouse.sy und der Kamera neu, deshalb ueber die Kamera zurueckrechnen
  const aimAt = (d, x, y) => { d.draw(); const m = d.mouse, cx = m.x - m.sx, cy = m.y - m.sy; m.sx = x - cx; m.sy = y - cy; m.t = d.get().time; d.draw(); };
  return { D, strip, scene, cop, run, aimAt };
})()`;


module.exports = [
  {
    name: 'Feldbarrikade: Stueck je Stufe 2, 3, 4, Taste 3 stellt eine Kachel X (solide, kugelsperrend) ohne Material, nur im Ueberfall, ohne Vorrat nichts',
    async run(t) {
      const r = await t.page.evaluate(`(() => { const H = ${HELP}, D = H.D, o = {}, T = 32;
        o.stock = [1, 2, 3].map(l => H.scene({ V3: l }, true).me.trap | 0); o.kind = D.trapKind(H.scene({ V3: 1 }, true).me);
        let sc = H.scene({ V3: 1 }, true); D.useGadget(sc.me, 3, sc.sp.x - 60, sc.sp.y); o.p1 = [D.fbs().length, sc.me.trap, (D.msgs().banner || '').length > 0];
        sc = H.scene({ V3: 1 }); const mat0 = sc.me.mat; D.useGadget(sc.me, 3, sc.sp.x - 60, sc.sp.y); const f = D.fbs()[0];
        o.f = f ? [D.world().cell(f.x, f.y), D.isSol(f.x, f.y), D.world().isBul(f.x, f.y), D.world().isOpq(f.x, f.y), f.hp === D.CFG.field.hp, sc.me.trap, sc.me.mat === mat0, Math.floor((sc.sp.x - 60) / T) === f.x] : null;
        D.useGadget(sc.me, 3, sc.sp.x - 60, sc.sp.y); o.again = [D.fbs().length, sc.me.trap];
        sc = H.scene({ V3: 2 }); H.cop(sc, Math.floor((sc.sp.x - 60) / T) * T + 16, Math.floor(sc.sp.y / T) * T + 16); D.useGadget(sc.me, 3, sc.sp.x - 60, sc.sp.y); o.occ = [D.fbs().length, sc.me.trap];
        sc = H.scene({ V3: 2 }); D.useGadget(sc.me, 3, sc.me.x, sc.me.y); o.self = [D.fbs().length, sc.me.trap];
        sc = H.scene({}); D.useGadget(sc.me, 3, sc.sp.x - 60, sc.sp.y); o.none = D.fbs().length;
        sc = H.scene({ V3: 2 }); D.useGadget(sc.me, 3, sc.sp.x - 300, sc.sp.y); const g = D.fbs()[0]; o.far = g ? Math.round(Math.hypot(g.x * T + 16 - sc.me.x, g.y * T + 16 - sc.me.y)) : null; o.R = D.CFG.trap.reach;
        const w = D.world(); let spot = null; for (let ty = w.WY0; ty < w.WY0 + w.H && !spot; ty++) for (let tx = w.WX0; tx < w.WX0 + w.W && !spot; tx++) if (!D.isSol(tx, ty) && D.isSol(tx + 1, ty) && !D.isSol(tx - 1, ty)) spot = { x: tx * T + 16, y: ty * T + 16, wx: (tx + 1) * T + 16 };
        sc = H.scene({ V3: 2 }); if (spot) { sc.me.x = spot.x; sc.me.y = spot.y; D.useGadget(sc.me, 3, spot.wx, spot.y); o.wall = [D.fbs().length, sc.me.trap]; }
        return o; })()`);
      t.eq(r.stock, [2, 3, 4], 'Stueck je Stufe');
      t.eq(r.kind, 'field', 'trapKind field');
      t.eq(r.p1, [0, 2, true], 'Erkunden: nichts gestellt, Hinweis im Bild');
      t.eq(r.f, ['X', true, true, false, true, 1, true, true], 'Ueberfall: Kachel X am Zielpunkt, solide, kugelsperrend, sichtdurchlaessig, HP aus CFG, Vorrat 1, Material unberuehrt');
      t.eq(r.again, [1, 1], 'zweites Stueck auf dieselbe Kachel wird abgelehnt (Vorrat bleibt)');
      t.eq(r.occ, [0, 3], 'mit einem Beamten auf der Kachel abgelehnt');
      t.eq(r.self, [0, 3], 'auf der eigenen Kachel abgelehnt');
      t.eq(r.none, 0, 'ohne Knoten nichts');
      t.ok(r.far !== null && r.far <= r.R + 23, 'weiter Zielpunkt wird gekuerzt: ' + r.far);
      t.eq(r.wall, [0, 3], 'in eine Wand nichts');
    },
  },
  {
    name: 'Feldbarrikade verboten: Fahrspur, Wagenplaetze, Fluchtzone (LANE, an allen vier Strassenseiten), in und vor Tueren; frei im Gebaeude',
    async run(t) {
      const r = await t.page.evaluate(`(() => { const H = ${HELP}, D = H.D, T = 32, o = {};
        for (const turn of ['S', 'N', 'E', 'W']) { const sc = H.scene({ V3: 4 }, false, turn), L = D.LANE(), res = {};
          const probe = (x, y) => { sc.me.x = x; sc.me.y = y; return D.fieldSpot(sc.me, { x, y, ok: true, why: '', k: 'field' }); };
          const mid = L.pt((L.lo + L.hi) / 2, L.pos); res.lane = probe(mid[0], mid[1]).ok;
          const sl = L.slots[0], sp = L.pt(sl.u * T + 16, L.pos); res.slot = probe(sp[0], sp[1]).ok;
          const ex = L.exit.cells[0]; res.exit = probe(ex[0] * T + 16, ex[1] * T + 16).ok;
          o[turn] = res; }
        const sc = H.scene({ V3: 4 }); const w = D.world(); let door = null; for (let ty = w.WY0; ty < w.WY0 + w.H && !door; ty++) for (let tx = w.WX0; tx < w.WX0 + w.W && !door; tx++) if ('Dd'.indexOf(w.cell(tx, ty)) >= 0) door = [tx, ty];
        const pr = (cx, cy) => { sc.me.x = cx * T + 16; sc.me.y = cy * T + 16; return D.fieldSpot(sc.me, { x: cx * T + 16, y: cy * T + 16, ok: true, why: '', k: 'field' }); };
        o.door = door ? pr(door[0], door[1]).ok : null;
        o.doorNb = door ? [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(d => !D.isSol(door[0] + d[0], door[1] + d[1])).map(d => pr(door[0] + d[0], door[1] + d[1]).ok) : null;
        const s2 = H.scene({ V3: 4 }); o.free = D.fieldSpot(s2.me, { x: s2.sp.x - 60, y: s2.sp.y, ok: true, why: '', k: 'field' }).ok;
        return o; })()`);
      for (const k of ['S', 'N', 'E', 'W']) t.eq([r[k].lane, r[k].slot, r[k].exit], [false, false, false], 'Strassenseite ' + k + ': Fahrspur, Wagenplatz und Fluchtzone verboten');
      t.eq(r.door, false, 'auf der Tuer verboten');
      t.ok(r.doorNb && r.doorNb.length > 0 && r.doorNb.every(x => x === false), 'vor der Tuer verboten: ' + JSON.stringify(r.doorNb));
      t.eq(r.free, true, 'freier Boden im Gebaeude erlaubt');
    },
  },
  {
    name: 'Feldbarrikade: lehnbar (leanAt), Polizeikugeln zerschiessen sie (HP aus CFG, Kachel wird wieder Boden), eigene Kugeln nicht, reset raeumt auf',
    async run(t) {
      const r = await t.page.evaluate(`(() => { const H = ${HELP}, D = H.D, T = 32, o = {};
        const sc = H.scene({ V3: 2 }); D.useGadget(sc.me, 3, sc.sp.x - 60, sc.sp.y); const f = D.fbs()[0], fx = f.x * T + 16, fy = f.y * T + 16, pv = f.pv;
        sc.me.armed = true; sc.me.x = fx + 40; sc.me.y = fy; sc.me.a = Math.PI; o.lean = D.leanAt(sc.me); o.leanCell = [f.x, f.y];
        const shoot = own => { D.get().bl.push({ id: 9999, x: fx + 20, y: fy, vx: -400, vy: 0, l: 1, o: own ? 1 : 0, dmg: 50, d: 50 }); sc.me.x = fx + 300; D.update(1 / 30); };
        shoot(true); o.own = [D.fbs()[0] && D.fbs()[0].hp, D.CFG.field.hp];
        shoot(false); o.hit1 = D.fbs()[0] && D.fbs()[0].hp; shoot(false); shoot(false); o.gone = [D.fbs().length, D.world().cell(f.x, f.y) === pv];
        const sc2 = H.scene({ V3: 2 }); D.useGadget(sc2.me, 3, sc2.sp.x - 60, sc2.sp.y); const f2 = D.fbs()[0]; D.reset(); o.reset = [D.fbs().length, D.world().cell(f2.x, f2.y) !== 'X'];
        return o; })()`);
      t.eq(r.lean, r.leanCell, 'leanAt findet die Feldbarrikade');
      t.eq(r.own[0], r.own[1], 'eigene Kugeln schaden ihr nicht');
      t.eq(r.hit1, 70, 'Polizeikugel mit 50 Schaden: 120 -> 70');
      t.eq(r.gone, [0, true], 'nach drei Treffern zerschossen, Kachel wieder Boden');
      t.eq(r.reset, [0, true], 'reset raeumt auf');
    },
  },
  {
    name: 'Feldbarrikade und Polizei: ein Beamter an der Barrikade ohne Spieler in Sicht schiesst sie ab (unter 20 s, CFG.field.dps), mit Spieler in Sicht nicht (er schiesst auf den Spieler), ohne Beamten haelt sie',
    async run(t) {
      const r = await t.page.evaluate(`(() => { const H = ${HELP}, D = H.D, T = 32, o = {};
        const mk = () => { const sc = H.scene({ V3: 2 }); D.useGadget(sc.me, 3, sc.sp.x - 60, sc.sp.y); const f = D.fbs()[0]; sc.f = f; sc.fx = f.x * T + 16; sc.fy = f.y * T + 16; return sc; };
        let sc = mk(); const c = H.cop(sc, sc.fx + 30, sc.fy); sc.me.x = sc.fx + 600; let t0 = 0; while (D.fbs().length && t0 < 25) { H.run(sc, .5, [[c, c.x, c.y], [sc.me, sc.me.x, sc.me.y]], true); t0 += .5; } o.away = [D.fbs().length, t0, D.world().cell(sc.f.x, sc.f.y) === sc.f.pv];
        sc = mk(); H.run(sc, 8, [[sc.me, sc.fx + 600, sc.fy]], true); o.empty = [D.fbs().length, D.fbs()[0] && D.fbs()[0].hp];
        sc = mk(); const c2 = H.cop(sc, sc.fx + 30, sc.fy); H.run(sc, 8, [[c2, c2.x, c2.y], [sc.me, sc.fx - 100, sc.fy]], true); o.seen = [D.fbs().length, D.fbs()[0] && D.fbs()[0].hp];
        return o; })()`);
      t.eq(r.away[0], 0, 'ohne Spieler in Sicht faellt sie: ' + JSON.stringify(r.away));
      t.ok(r.away[1] < 20 && r.away[2], 'nach ' + r.away[1] + ' s weg, Kachel wieder Boden');
      t.eq(r.empty, [1, 120], 'ohne Beamten bleibt sie heil');
      t.eq(r.seen, [1, 120], 'mit Spieler in Sicht schiesst der Beamte auf den Spieler, nicht auf die Barrikade');
    },
  },
  {
    name: 'Feldbarrikade im Coop: der Client stellt sie (Host prueft), beide sehen Kachel X, Zerschiessen erscheint beim Client, Vorrat im Schnappschuss',
    async run(t) {
      await t.loadTool('loopnet.js'); await t.loadInpage('coop.js');
      const r = await t.page.evaluate(() => {
        const G = CT.mkGame('bank', 321, 2), A = G.A, B = G.clients[0], o = {}; A.CFG.policeAt = 1e6; A.CFG.policeForced = 1e6;
        B.cv.dispatchEvent(new KeyboardEvent('keydown', { key: 'f', bubbles: true })); G.run(1);
        const p1 = A.get().players[1]; p1.kit = Object.assign({}, p1.kit, { sk: { V3: 1 } }); p1.trap = 2; B.get().me.kit = Object.assign({}, B.get().me.kit, { sk: { V3: 1 } }); G.run(.5);
        const T = 32, h = A.get().players[1]; let spot = null;
        for (const [dx, dy] of [[-60, 0], [60, 0], [0, 60], [0, -60]]) { const x = h.x + dx, y = h.y + dy; if (A.fieldSpot(h, { x, y, ok: true, why: '', k: 'field' }).ok) { spot = [x, y]; break; } }
        o.spot = !!spot; if (!spot) return o;
        const aim = () => { B.draw(); const q = B.mouse, cx = q.x - q.sx, cy = q.y - q.sy; q.sx = spot[0] - cx; q.sy = spot[1] - cy; q.t = B.get().time; B.draw(); }; aim();
        B.cv.dispatchEvent(new KeyboardEvent('keydown', { key: '3', bubbles: true })); aim(); G.run(.1); B.cv.dispatchEvent(new KeyboardEvent('keyup', { key: '3', bubbles: true })); G.run(.6);
        const fa = A.fbs(), fb = B.fbs(); o.n = [fa.length, fb.length]; if (!fa.length) return o;
        o.cell = [A.world().cell(fa[0].x, fa[0].y), B.world().cell(fa[0].x, fa[0].y)]; o.stock = [A.get().players[1].trap | 0, B.get().me.trap | 0];
        const fx = fa[0].x, fy = fa[0].y; A.get().bl.push({ id: 9999, x: fx * T + 36, y: fy * T + 16, vx: -400, vy: 0, l: 1, o: 0, dmg: 500, d: 500 }); G.run(.3);
        o.after = [A.fbs().length, B.fbs().length, B.world().cell(fx, fy) !== 'X'];
        return o;
      });
      t.ok(r.spot, 'ein freier Platz in der Naehe des Clients');
      t.eq(r.n, [1, 1], 'bei Host und Client');
      t.eq(r.cell, ['X', 'X'], 'Kachel X bei beiden');
      t.eq(r.stock, [1, 1], 'Vorrat 2 -> 1 bei beiden');
      t.eq(r.after, [0, 0, true], 'zerschossen: bei beiden weg, Kachel wieder Boden');
    },
  },
];
