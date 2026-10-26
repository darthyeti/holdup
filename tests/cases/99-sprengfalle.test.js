// MRU 1 B2 (docs/major-release-update-1.md, docs/ideen-und-planung.md, Skillbaum-Umbau, Gegenstaende): Sprengfalle. Die Barrikaden-Mine (V3, hinter Baumeister) und die Claymore (V4, hinter Deckung) sind dasselbe Objekt, eine gelegte Falle
// mit Scharfschaltzeit und Ausloesezone (traps, trapStep, trapSpot, placeTrap). Taste 3 halten zeigt den Platzring, Loslassen legt sie (im Ueberfall, nur mit Vorrat, kein Vorrat heisst Taste 3 tut nichts). Die Mine liegt an einer
// stehenden Barrikade (CFG.trap.mine.near) und loest aus, wenn ein Beamter in die Ausloesezone kommt oder die Polizei dort ihre Ladung legt (st fuse). Die Claymore liegt auf freiem Boden und loest bei Annaeherung aus. Ausgeloest
// wird nur von Gegnern (en, ohne Scharfschuetzen und Ergebene), die Explosion trifft aber alle im Radius, auch Mitspieler (blastAt mit pdmg fuer Spieler), Zivilisten und Geiseln wie jede Explosion. Stueck je Stufe 1, 2, 3 (cnt).
// Alle sehen die Falle (Blinkpunkt, Schnappschuss tr), VER 37. Aufbau: Bank Seed 5017 (nach S gedreht, keine Polizei von allein), ein freier waagrechter Streifen im Gebaeude, Beamte und Spieler werden festgehalten.
const HELP = `(() => {
  const D = __dbg, T = 32;
  const strip = () => { const w = D.world(); for (let ty = w.WY0 + 2; ty < w.WY0 + w.H - 2; ty++) for (let tx = w.WX0 + 9; tx < w.WX0 + w.W - 3; tx++) { const x = tx * T + 16, y = ty * T + 16; let ok = true;
    for (let d = -240; d <= 70 && ok; d += 12) for (const dy of [-1, 0, 1]) if (D.isSol(Math.floor((x + d) / T), ty + dy)) ok = false;
    if (ok && D.clear(x - 240, y, x + 70, y)) return { x, y }; } return null; };
  // Szene: sk setzt den Skillbaum, phase1 laesst im Erkunden, sonst Ueberfall; me steht auf dem Streifen
  const scene = (sk, phase1) => { D.sessReset(); Object.assign(D.SESSION.sk, sk || {}); D.setScenario('bank'); D.setSeedMode('random'); D.setLage([]); D.setTurn('S'); D.buildSeed(5017); D.CFG.policeAt = 1e6; D.CFG.policeForced = 1e6;
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
    name: 'Sprengfalle: Barrikaden-Mine (V3) und Claymore (V4) sind keine Platzhalter mehr, Stueck je Stufe 1, 2, 3 beim Start, die Art folgt dem Knoten, ohne Knoten kein Vorrat',
    async run(t) {
      const r = await t.page.evaluate(`(() => { const H = ${HELP}, D = H.D, S = D.CFG.skill, o = {}; o.nodes = ['V3', 'V4'].map(id => [S[id].n, !!S[id].soon, S[id].cnt]); o.still = ['A3', 'A4', 'U3'].map(id => !!S[id].soon); o.cfg = Object.keys(D.CFG.trap || {}).sort();
        const kit = sk => { const sc = H.scene(sk, true); return [sc.me.trap | 0, D.trapKind(sc.me)]; };
        o.k0 = kit({}); o.mine = [1, 2, 3].map(l => kit({ V3: l })); o.claw = [1, 2, 3].map(l => kit({ V4: l })); o.mod = D.CFG.shop.items.every(i => i.k !== 'trap');
        return o; })()`);
      t.eq(r.nodes, [['Barrikaden-Mine', false, [1, 2, 3]], ['Claymore', false, [1, 2, 3]]], 'beide Knoten kaufbar, Stueck je Stufe 1, 2, 3');
      t.eq(r.still, [false, false, false], 'Praezisionsgewehr, Granatwerfer und Notfallkoffer sind seit B4 und B5 keine Platzhalter mehr');
      t.eq(r.cfg, ['claw', 'mine', 'reach'], 'CFG.trap hat mine, claw und reach');
      t.eq(r.k0, [0, null], 'ohne Knoten kein Vorrat und keine Art');
      t.eq(r.mine, [[1, 'mine'], [2, 'mine'], [3, 'mine']], 'V3: Mine, 1 bis 3 Stueck');
      t.eq(r.claw, [[1, 'claw'], [2, 'claw'], [3, 'claw']], 'V4: Claymore, 1 bis 3 Stueck');
    },
  },
  {
    name: 'Sprengfalle legen: nur im Ueberfall (Erkunden: abgelehnt mit Hinweis), Reichweite begrenzt, nicht in Waende, ohne Vorrat tut Taste 3 nichts, die Mine nur an einer stehenden Barrikade',
    async run(t) {
      const r = await t.page.evaluate(`(() => { const H = ${HELP}, D = H.D, o = {}, T = 32;
        // Erkunden: abgelehnt
        let sc = H.scene({ V4: 2 }, true); sc.D.useGadget(sc.me, 3, sc.sp.x - 60, sc.sp.y); o.p1 = [sc.D.traps().length, sc.me.trap, (D.msgs().banner || '').length > 0];
        // Ueberfall: Claymore legen, Reichweite, Vorrat
        sc = H.scene({ V4: 2 }); const R = D.CFG.trap.reach; D.useGadget(sc.me, 3, sc.sp.x - 60, sc.sp.y);
        const a = D.traps()[0]; o.a = a ? [a.k, Math.round(a.x - (sc.sp.x - 60)), Math.round(a.y - sc.sp.y), a.a, a.own] : null; o.n1 = [D.traps().length, sc.me.trap];
        D.useGadget(sc.me, 3, sc.sp.x - 300, sc.sp.y); const b = D.traps()[1]; o.far = b ? Math.round(Math.hypot(b.x - sc.me.x, b.y - sc.me.y)) : null; o.R = R;
        const before = D.traps().length; D.useGadget(sc.me, 3, sc.sp.x - 80, sc.sp.y + 8); o.noStock = [before, D.traps().length, sc.me.trap];
        // zu dicht an einer anderen Falle
        sc = H.scene({ V4: 3 }); D.useGadget(sc.me, 3, sc.sp.x - 60, sc.sp.y); D.useGadget(sc.me, 3, sc.sp.x - 64, sc.sp.y); o.stack = [D.traps().length, sc.me.trap];
        // in eine Wand: ein freies Feld mit festem Nachbarn im Osten suchen
        sc = H.scene({ V4: 2 }); const w = D.world(); let spot = null; for (let ty = w.WY0; ty < w.WY0 + w.H && !spot; ty++) for (let tx = w.WX0; tx < w.WX0 + w.W && !spot; tx++) if (!D.isSol(tx, ty) && D.isSol(tx + 1, ty) && !D.isSol(tx - 1, ty)) spot = { x: tx * T + 16, y: ty * T + 16, wx: (tx + 1) * T + 16 };
        if (spot) { sc.me.x = spot.x; sc.me.y = spot.y; D.useGadget(sc.me, 3, spot.wx, spot.y); o.wall = [D.traps().length, sc.me.trap]; }
        // ohne Knoten: Taste 3 tut nichts (auch keine Meldung)
        sc = H.scene({}); const bn0 = D.msgs().banner || ''; sc.D.useGadget(sc.me, 3, sc.sp.x - 60, sc.sp.y); o.none = [D.traps().length, (D.msgs().banner || '') === bn0];
        // Mine: ohne Barrikade abgelehnt, mit stehender Barrikade am Feld daneben gelegt
        sc = H.scene({ V3: 1 }); D.useGadget(sc.me, 3, sc.me.x, sc.me.y); o.mineNo = [D.traps().length, sc.me.trap];
        const bi = sc.g.its.find(i => i.t === 'bar'); sc.me.mat = 5; bi.act(sc.me); const bar = bi.b; o.built = bar.lv;
        let free = null; const c = bar.cells[0]; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (!free && !D.isSol(c[0] + dx, c[1] + dy)) free = { x: (c[0] + dx) * T + 16, y: (c[1] + dy) * T + 16 };
        sc.me.x = free.x; sc.me.y = free.y; D.useGadget(sc.me, 3, free.x, free.y); const m = D.traps()[0]; o.mine = m ? [m.k, m.bi === bar.i] : null; o.mineLeft = sc.me.trap;
        // Gegenseite: die Mine liegt immer auf der anderen Seite der Barrikade als der Spieler, von beiden Seiten gelegt
        const cc = { x: c[0] * T + 16, y: c[1] * T + 16 }, opp = { x: 2 * cc.x - free.x, y: 2 * cc.y - free.y }; o.oppFree = !D.isSol(Math.floor(opp.x / T), Math.floor(opp.y / T));
        o.opp1 = m ? Math.round(Math.hypot(m.x - opp.x, m.y - opp.y)) : null;
        sc.me.trap = 1; sc.me.x = opp.x; sc.me.y = opp.y; D.useGadget(sc.me, 3, opp.x, opp.y); const m2 = D.traps()[1]; o.opp2 = m2 ? Math.round(Math.hypot(m2.x - free.x, m2.y - free.y)) : null;
        // Aim jenseits der Barrikade genuegt (die Linie durch die feste Barrikade verwirft sie nicht mehr)
        D.traps().length = 0; sc.me.trap = 1; sc.me.x = free.x; sc.me.y = free.y; D.useGadget(sc.me, 3, opp.x, opp.y); const m3 = D.traps()[0]; o.aimOver = m3 ? Math.round(Math.hypot(m3.x - opp.x, m3.y - opp.y)) : null;
        return o; })()`);
      t.eq(r.p1, [0, 2, true], 'Erkunden: nichts gelegt, Vorrat bleibt, Hinweis im Bild');
      t.eq(r.a, ['claw', 0, 0, 0, 0], 'Ueberfall: die Claymore liegt am Zielpunkt (60 Pixel weit), noch nicht scharf, Besitzer 0');
      t.eq(r.n1, [1, 1], 'eine gelegt, eine uebrig');
      t.ok(r.far !== null && Math.abs(r.far - r.R) <= 1, 'ein weiter Zielpunkt wird auf die Reichweite gekuerzt: ' + r.far + ' statt ' + r.R);
      t.eq(r.noStock, [2, 2, 0], 'ohne Vorrat legt Taste 3 nichts mehr');
      t.eq(r.stack, [1, 2], 'zu dicht an der eigenen Falle (4 Pixel) wird abgelehnt, der Vorrat bleibt');
      t.eq(r.wall, [0, 2], 'in eine Wand legt nichts');
      t.eq(r.none, [0, true], 'ohne Knoten tut Taste 3 nichts, auch keine neue Meldung');
      t.eq(r.mineNo, [0, 1], 'die Mine ohne Barrikade in der Naehe wird abgelehnt');
      t.eq([r.built, r.mine, r.mineLeft], [1, ['mine', true], 0], 'mit stehender Barrikade liegt sie dort (an diese Barrikade gebunden)');
      t.ok(r.oppFree, 'die Kachel gegenueber der Barrikade ist frei (Voraussetzung der Pruefung)');
      t.eq([r.opp1, r.opp2, r.aimOver], [0, 0, 0], 'die Mine liegt auf der Kachel gegenueber dem Spieler, von beiden Seiten (' + [r.opp1, r.opp2, r.aimOver].join(' / ') + ' Pixel Abweichung), auch wenn der Zielpunkt jenseits der Barrikade liegt');
    },
  },
  {
    name: 'Claymore: scharf nach CFG.trap.claw.arm, loest nur bei Gegnern in der Zone aus (nicht bei Spielern), die Explosion trifft Beamte nach Abstand (dmg, r) und Mitspieler schwaecher (pdmg), Zaehler und Meldung',
    async run(t) {
      const r = await t.page.evaluate(`(() => { const H = ${HELP}, D = H.D, o = {}, C = D.CFG.trap.claw, dm = (dmg, d) => dmg * (1 - d / C.r * .6);
        let sc = H.scene({ V4: 1 }); const x = sc.sp.x - 60, y = sc.sp.y; D.useGadget(sc.me, 3, x, y); o.placed = D.traps().length; const trap = D.traps()[0];
        const c1 = H.cop(sc, x + 20, y), c2 = H.cop(sc, x - 90, y), c3 = H.cop(sc, x - 150, y), h = [c1.hp, c2.hp, c3.hp], pin = [[c1, x + 20, y], [c2, x - 90, y], [c3, x - 150, y], [sc.me, sc.sp.x + 50, sc.sp.y]];
        const k0 = D.get().kills; H.run(sc, 2, pin, true); o.vor = [D.traps().length, c1.hp === h[0], trap.a > 1.9 && trap.a < 2.1];       // noch nicht scharf: kein Ausloesen
        H.run(sc, 1, pin, true); o.nach = [D.traps().length, D.get().kills - k0, Math.round(h[1] - c2.hp), Math.round(dm(C.dmg, 90)), c3.hp === h[2], c1.hp <= 0];
        o.feed = D.msgs().feed.join(' | ');
        // Spieler loesen nicht aus: me steht 5 s in der Zone der scharfen Falle
        sc = H.scene({ V4: 1 }); D.useGadget(sc.me, 3, sc.sp.x - 60, sc.sp.y); const tx = D.traps()[0].x, ty = D.traps()[0].y; H.run(sc, 5, [[sc.me, tx + 10, ty]], false); o.me = [D.traps().length, sc.me.hp];
        // Mitspieler im Radius werden getroffen: me steht 40 Pixel neben der Falle, ein Beamter loest 20 Pixel auf der anderen Seite aus
        sc = H.scene({ V4: 1 }); D.useGadget(sc.me, 3, sc.sp.x - 60, sc.sp.y); const q = D.traps()[0], cc = H.cop(sc, q.x - 20, q.y); H.run(sc, 2, [[sc.me, q.x + 40, q.y], [cc, q.x - 20, q.y]], false); o.hurt0 = [D.traps().length, sc.me.hp];
        H.run(sc, 1, [[sc.me, q.x + 40, q.y], [cc, q.x - 20, q.y]], false); o.hurt = [D.traps().length, +(100 - sc.me.hp).toFixed(1), +dm(C.pdmg, 40).toFixed(1)];
        return o; })()`);
      t.eq(r.placed, 1, 'Claymore gelegt');
      t.eq(r.vor, [1, true, true], 'nach 2 s noch nicht scharf (arm ' + 2.5 + '): ein Beamter in der Zone loest nichts aus, der Beamte ist heil');
      t.eq([r.nach[0], r.nach[5], r.nach[4]], [0, true, true], 'scharf und ausgeloest: die Falle ist weg, der Beamte in der Zone tot, der dritte weit weg unberuehrt');
      t.ok(Math.abs(r.nach[2] - r.nach[3]) <= 1 && r.nach[1] >= 1, 'der Beamte am Rand (90 Pixel) verliert dmg * (1 - d / r * 0,6): ' + r.nach[2] + ' statt ' + r.nach[3] + ', Abschuesse gezaehlt: ' + r.nach[1]);
      t.ok(/Claymore/.test(r.feed), 'die Meldung nennt die Claymore: ' + r.feed);
      t.eq(r.me, [1, 100], 'ein Spieler in der Zone loest nichts aus und bleibt heil');
      t.eq(r.hurt0, [1, 100], 'vor dem Scharfwerden passiert nichts');
      t.ok(r.hurt[0] === 0 && Math.abs(r.hurt[1] - r.hurt[2]) <= .6, 'der Mitspieler im Radius verliert pdmg * (1 - d / r * 0,6): ' + r.hurt[1] + ' statt ' + r.hurt[2]);
    },
  },
  {
    name: 'Barrikaden-Mine: scharf nach CFG.trap.mine.arm, loest aus bei einem Beamten in der Zone oder wenn die Polizei an der Barrikade ihre Ladung legt (fuse), die Barrikade bleibt heil, nicht ausloesen bei Spielern; faellt die Barrikade, ist sie weg',
    async run(t) {
      const r = await t.page.evaluate(`(() => { const H = ${HELP}, D = H.D, o = {}, T = 32, C = D.CFG.trap.mine;
        const setup = () => { const sc = H.scene({ V3: 3 }); const bi = sc.g.its.find(i => i.t === 'bar'); sc.me.mat = 5; bi.act(sc.me); const bar = bi.b; let free = null; const c = bar.cells[0];
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (!free && !D.isSol(c[0] + dx, c[1] + dy)) free = { x: (c[0] + dx) * T + 16, y: (c[1] + dy) * T + 16 };
          sc.me.x = free.x; sc.me.y = free.y; D.useGadget(sc.me, 3, free.x, free.y); sc.bar = bar; sc.mine = D.traps()[0]; sc.spot = { x: sc.mine.x, y: sc.mine.y }; sc.me.x = free.x + 200; sc.me.y = free.y; return sc; };
        let sc = setup(); o.placed = [D.traps().length, sc.mine && sc.mine.k, sc.me.trap]; const hp0 = sc.bar.hp, far = [[sc.me, sc.me.x, sc.me.y]];
        // Beamter in der Zone
        const c1 = H.cop(sc, sc.spot.x + 30, sc.spot.y); const h = c1.hp; H.run(sc, 1.2, far.concat([[c1, c1.x, c1.y]]), true); o.arming = [D.traps().length, c1.hp === h];
        H.run(sc, .6, far.concat([[c1, c1.x, c1.y]]), true); o.boom = [D.traps().length, c1.hp < h, Math.round(sc.bar.hp - hp0), D.msgs().feed.join(' | ')];
        // Ladung der Polizei an der Barrikade (kein Beamter in der Zone, die Mine ist scharf)
        sc = setup(); H.run(sc, 2, [[sc.me, sc.me.x, sc.me.y]], true); o.armed = D.traps().length; const bb = sc.bar; bb.st = 'fuse'; bb.fz = 5; H.run(sc, .3, [[sc.me, sc.me.x, sc.me.y]], true); o.fuse = [D.traps().length, bb.hp === bb.hp];
        // Spieler direkt an der scharfen Mine: nichts
        sc = setup(); H.run(sc, 4, [[sc.me, sc.spot.x, sc.spot.y]], false); o.me = [D.traps().length, sc.me.hp];
        // Barrikade faellt (lv 0): die Mine ist still weg
        sc = setup(); H.run(sc, 2, [[sc.me, sc.me.x, sc.me.y]], true); sc.bar.lv = 0; H.run(sc, .1, [[sc.me, sc.me.x, sc.me.y]], true); o.gone = D.traps().length;
        o.cfg = [C.arm, C.trig];
        return o; })()`);
      t.eq(r.placed, [1, 'mine', 2], 'Mine gelegt (3 Stueck am Start, eine gelegt)');
      t.eq(r.arming, [1, true], 'noch nicht scharf: der Beamte in der Zone loest nichts aus');
      t.eq([r.boom[0], r.boom[1], r.boom[2]], [0, true, 0], 'scharf: sie loest beim Beamten aus, er verliert Leben, die eigene Barrikade verliert nichts');
      t.ok(/Mine/.test(r.boom[3]), 'die Meldung nennt die Mine: ' + r.boom[3]);
      t.eq(r.armed, 1, 'ohne Beamte bleibt die scharfe Mine liegen');
      t.eq(r.fuse[0], 0, 'legt die Polizei an der Barrikade ihre Ladung (fuse), geht die Mine hoch');
      t.eq(r.me, [1, 100], 'ein Spieler direkt an der scharfen Mine loest nichts aus');
      t.eq(r.gone, 0, 'faellt die Barrikade, ist die Mine still weg');
    },
  },
  {
    name: 'Sprengfalle im Coop: der Client haelt Taste 3 und laesst los (Host rechnet), alle sehen die Falle (Schnappschuss tr) und den Vorrat, ein Beamter loest sie aus, der Abschuss geht auf den Besitzer, die Falle ist bei beiden weg',
    async run(t) {
      await t.loadTool('loopnet.js'); await t.loadInpage('coop.js');
      const r = await t.page.evaluate(() => {
        const G = CT.mkGame('bank', 321, 2), A = G.A, B = G.clients[0], o = {}; A.CFG.policeAt = 1e6; A.CFG.policeForced = 1e6;
        B.cv.dispatchEvent(new KeyboardEvent('keydown', { key: 'f', bubbles: true })); G.run(1);
        const p1 = A.get().players[1]; p1.kit = Object.assign({}, p1.kit, { sk: { V4: 1 } }); p1.trap = 1; B.get().me.kit = Object.assign({}, B.get().me.kit, { sk: { V4: 1 } }); G.run(.5);   // der Client kennt sein eigenes Kit, der Host das des Clients
        o.clientStock = B.get().me.trap | 0; o.phase = B.get().phase;
        const m = B.get().me; const aim = () => { B.draw(); const q = B.mouse, cx = q.x - q.sx, cy = q.y - q.sy; q.sx = m.x - cx; q.sy = m.y - cy; q.t = B.get().time; B.draw(); }; aim();
        B.cv.dispatchEvent(new KeyboardEvent('keydown', { key: '3', bubbles: true })); aim(); G.run(.1); B.cv.dispatchEvent(new KeyboardEvent('keyup', { key: '3', bubbles: true })); G.run(.6);
        const th = A.traps(), tc = B.traps(); o.n = [th.length, tc.length]; o.pos = th[0] && tc[0] ? [Math.round(th[0].x - tc[0].x), Math.round(th[0].y - tc[0].y), th[0].k, tc[0].k, th[0].own] : null; o.stock = [A.get().players[1].trap | 0, B.get().me.trap | 0];
        // scharf werden lassen, dann loest ein Beamter aus
        G.run(3); o.armed = [!!(A.traps()[0] && A.traps()[0].a >= A.CFG.trap.claw.arm), !!(B.traps()[0] && B.traps()[0].armed)];
        const k0 = A.get().players[1].st.k, t0 = A.traps()[0]; const c = A.mkCop(t0.x + 15, t0.y, false); c.cool = 1e9; c.mode = 'post'; c.post = { x: c.x, y: c.y, a: 0, door: null }; c.rt = 1e9; A.get().en.push(c);
        for (let i = 0; i < 60; i++) { A.get().players.forEach(q => { q.hp = 1e9; }); c.x = t0.x + 15; c.y = t0.y; G.run(1 / 60); }
        G.run(.5); o.after = [A.traps().length, B.traps().length, A.get().players[1].st.k - k0, c.hp <= 0];
        return o;
      });
      t.eq([r.phase, r.clientStock], [2, 1], 'Ueberfall laeuft, der Client kennt seinen Vorrat aus dem Schnappschuss');
      t.eq(r.n, [1, 1], 'die Falle liegt beim Host und beim Client');
      t.eq(r.pos, [0, 0, 'claw', 'claw', 1], 'am selben Ort, Claymore, Besitzer ist Spieler 1');
      t.eq(r.stock, [0, 0], 'der Vorrat ist bei beiden verbraucht');
      t.eq(r.armed, [true, true], 'scharf bei Host und Client (Schnappschuss)');
      t.eq(r.after, [0, 0, 1, true], 'ausgeloest: bei beiden weg, der Beamte tot, der Abschuss geht an den Besitzer');
    },
  },
  {
    name: 'Sprengfalle zeichnen und bedienen (solo): Taste 3 halten zeigt den Platzring an der Maus, Loslassen legt die Falle, die gelegte Falle blinkt fuer alle (Ring und Blinkpunkt am Ort), HUD nennt Taste 3 mit Art und Stueckzahl',
    async run(t) {
      const r = await t.page.evaluate(`(() => { const H = ${HELP}, D = H.D, o = {}; const sc = H.scene({ V4: 2 }); const cv = document.getElementById('c'), ctx = cv.getContext('2d');
        const arcs = (x, y) => { const orig = ctx.arc, hits = []; ctx.arc = function (cx, cy, r) { if (Math.abs(cx - x) < 1 && Math.abs(cy - y) < 1) hits.push(Math.round(r * 10) / 10); return orig.apply(this, arguments); }; const txt = [], ot = ctx.fillText; ctx.fillText = function (s) { txt.push(String(s)); return ot.apply(this, arguments); }; try { D.draw(); } finally { ctx.arc = orig; ctx.fillText = ot; } return { hits, txt }; };
        const tx = sc.sp.x - 70, ty = sc.sp.y; H.aimAt(D, tx, ty);
        cv.dispatchEvent(new KeyboardEvent('keydown', { key: '3', bubbles: true })); const d1 = arcs(tx, ty); o.ring = d1.hits.length; o.hud = d1.txt.filter(s => /Claymore/.test(s));
        cv.dispatchEvent(new KeyboardEvent('keyup', { key: '3', bubbles: true })); o.placed = [D.traps().length, sc.me.trap];
        const t0 = D.traps()[0]; const d2 = t0 ? arcs(t0.x, t0.y) : { hits: [] }; o.mark = d2.hits; o.R = D.CFG.trap.claw.r;
        const d3 = arcs(tx + 500, ty); o.none = d3.hits.length;
        return o; })()`);
      t.ok(r.ring >= 1, 'der Platzring wird beim Halten von 3 an der Maus gezeichnet: ' + r.ring);
      t.eq(r.placed, [1, 1], 'Loslassen legt die Falle (Vorrat 2 auf 1)');
      t.ok(r.mark.includes(r.R) && r.mark.length >= 2, 'die gelegte Falle zeigt Radiusring und Blinkpunkt am Ort: ' + JSON.stringify(r.mark));
      t.ok(r.hud.length >= 1 && r.hud.some(s => /\[3\]/.test(s)), 'das HUD nennt Taste 3 mit der Art: ' + JSON.stringify(r.hud));
    },
  },
];
