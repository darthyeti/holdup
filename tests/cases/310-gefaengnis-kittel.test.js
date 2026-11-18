// Ticket 310: Waescherei-Kittel im Gefaengnis. Ein Stapel in der Waescherei (LAY.prison.kit, Objekt kit), E (halten) zieht einen Kittel an (Spieler-Flag kc): nur Mitspieler ohne gezogene Waffe, nie der Gefangene,
// nur Phase 1, hoechstens so viele wie Teamspieler und CFG.prison.kittel.max. Mit Kittel gilt die Sperrzone in Kantine, Waescherei, Kueche, Flur und Hof 1 beim Schleichen oder Stehen nicht als heiss, in Wachstube
// und Kontrollraum nur beim Schleichen. Innenbereich, Beute, Stehlen, gezogene Waffe und Phase 2 heben die Tarnung auf. Flag 2048 im Schnappschuss (VER 91).
const SETUP = `(sd, n) => { const D = __dbg; D.sessReset(); D.setScenario('prison'); D.setSeedMode('random'); D.setLage([]); D.setN(n || 2); D.buildSeed(sd); D.CFG.policeAt = 1e6; D.CFG.policeForced = 1e6;
  const g = D.get(), me = g.me, pz = g.players[1], R = D.LAY().prison, T = 32; for (const c of g.cams) c.off = true;
  const it = k => D.get().its.find(i => i.t === k), tile = (x, y) => [(x + .5) * T, (y + .5) * T];
  const walk = (pts, sn, each) => { const keys = D.keys; keys.Shift = !!sn; for (const q of pts) { let n = 0; while (Math.hypot(q[0] - me.x, q[1] - me.y) > 5 && n < 2400 && !D.get().ended) { const dx = q[0] - me.x, dy = q[1] - me.y; keys.d = dx > 3; keys.a = dx < -3; keys.s = dy > 3; keys.w = dy < -3; D.update(1 / 30); n++; if (each) each(); } } keys.a = keys.d = keys.w = keys.s = keys.Shift = false; };
  const put = (o, x, y) => { o.x = x; o.y = y; o.tx = x; o.ty = y; };
  return { D, g, me, pz, R, T, it, tile, walk, put }; }`;

const SENS = `(sd, mode) => { const S = (${SETUP})(sd), { D, g, me, pz, R, it, put } = S;
  const r = R.rooms[mode.room];
  const gd = g.npcs.filter(q => q.k === 'grd' && q.st !== 'away')[0];
  for (const q of g.npcs) if (q !== gd && q.k === 'grd') { q.st = 'away'; q.at = 1e9; }
  const gx = mode.gx, gy = mode.gy; gd.st = 'idle'; gd.still = true; gd.x = gx; gd.y = gy; gd.base = Math.PI / 2; gd.a = gd.base; gd.path = []; gd.wait = 99;
  put(me, gx, gy + 150); put(pz, 40 * 32, 3 * 32);
  if (mode.kit) me.kc = 1; if (mode.loot) me.loot = 5000; if (mode.thf) me.thf = 99; if (mode.armed) me.armed = true;
  const inRoom = me.x >= r[0] * 32 && me.x < (r[2] + 1) * 32 && me.y >= r[1] * 32 && me.y < (r[3] + 1) * 32;
  let max = 0; for (let i = 0; i < 60; i++) { D.keys.s = !!mode.walk; D.keys.Shift = !!mode.sn; D.update(1 / 30); max = Math.max(max, D.get().sus); if (mode.walk && me.y > gy + 230) me.y = gy + 150; if (mode.thf) me.thf = 99; }
  D.keys.s = false; D.keys.Shift = false; return { sus: max, ph: D.get().phase, inRoom }; }`;
module.exports = [
  {
    name: 'Kittel: Stapel in der Waescherei auf freiem Boden (8 Seeds), Objekt kit',
    timeout: 120000,
    async run(t) {
      await t.loadTool('loopnet.js'); await t.loadInpage('coop.js');
      const r = await t.page.evaluate(`(() => { const o = { bad: [], n: 0 };
        for (let sd = 1; sd <= 8; sd++) { const S = (${SETUP})(sd), { D, R, it, T } = S, k = R.kit, wa = R.rooms.wasch;
          if (!k || k[0] < wa[0] || k[0] > wa[2] || k[1] < wa[1] || k[1] > wa[3]) { o.bad.push([sd, 'lage', k]); continue; }
          const w = D.world(); if (w.M[k[1] + 6][k[0] + 6] !== '.') o.bad.push([sd, 'boden', w.M[k[1] + 6][k[0] + 6]]);
          const c = R.cart; if (c[0] === k[0] && c[1] === k[1]) o.bad.push([sd, 'auf dem Wagen']);
          if (!it('kit')) o.bad.push([sd, 'objekt']); o.n++; }
        return o; })()`);
      t.eq(r.bad, [], 'Kittelstapel je Seed in der Waescherei'); t.eq(r.n, 8, '8 Seeds geprueft');
    },
  },
  {
    name: 'Kittel: E halten zieht ihn an (nur Mitspieler, ohne Waffe, Phase 1), der Gefangene nicht, Anzahl = Team, hoechstens 3, einer je Spieler',
    timeout: 120000,
    async run(t) {
      await t.loadTool('loopnet.js'); await t.loadInpage('coop.js');
      const r = await t.page.evaluate(`(() => { const o = {}, S = (${SETUP})(5, 2), { D, g, me, pz, R, it, tile, put } = S, k = it('kit'), c = tile(R.kit[0], R.kit[1]);
        put(me, c[0] - 20, c[1]); o.okTeam = k.ok(me); put(pz, c[0] + 20, c[1]); o.okPz = k.ok(pz);
        me.armed = true; o.okArmed = k.ok(me); me.armed = false;
        D.keys.e = true; for (let i = 0; i < 30 * (D.CFG.prison.kittel.t + .6); i++) D.update(1 / 30); D.keys.e = false;
        o.kc = [me.kc | 0, pz.kc | 0]; o.done = k.done; o.zweiter = k.ok(me); o.msg = D.msgs().feed.some(s => /Kittel/.test(s));
        const S2 = (${SETUP})(5, 2), k2 = S2.it('kit'); S2.D.startHeist(true, S2.me); S2.put(S2.me, c[0] - 20, c[1]); o.ph2 = k2.ok(S2.me);
        const S5 = (${SETUP})(5, 5), k5 = S5.it('kit'), tm = S5.g.players.slice(0, 4); o.left5 = k5.left; let n = 0; for (const q of tm) { if (k5.ok(q)) { k5.act(q); n++ } } o.n5 = n; o.kc5 = tm.map(q => q.kc | 0); o.done5 = k5.done;
        const S3 = (${SETUP})(5, 3); o.left3 = S3.it('kit').left;
        return o; })()`);
      t.eq(r.okTeam, true, 'Mitspieler kann den Kittel nehmen'); t.eq(r.okPz, false, 'der Gefangene nicht'); t.eq(r.okArmed, false, 'mit gezogener Waffe nicht');
      t.eq(r.kc, [1, 0], 'nach dem Halten traegt Spieler 0 den Kittel'); t.eq(r.done, true, 'Team aus einem Spieler: ein Kittel, Stapel leer'); t.eq(r.zweiter, false, 'einer je Spieler');
      t.ok(r.msg, 'Meldung beim Anziehen'); t.eq(r.ph2, false, 'im Ueberfall (Phase 2) kein Anziehen');
      t.eq([r.left5, r.n5, r.done5], [3, 3, true], 'vier im Team, hoechstens 3 Kittel'); t.eq(r.kc5, [1, 1, 1, 0], 'der vierte geht leer aus'); t.eq(r.left3, 2, 'zwei im Team, zwei Kittel');
    },
  },
  {
    name: 'Kittel: vor der Kantinenwache bleibt der Verdacht beim Schleichen und Stehen bei 0, beim Laufen, ohne Kittel, mit Beute, Stehlen und gezogener Waffe steigt er',
    timeout: 240000,
    async run(t) {
      await t.loadTool('loopnet.js'); await t.loadInpage('coop.js');
      const r = await t.page.evaluate(`(() => { const o = {}, K = { room: 'kan', gx: 24 * 32, gy: 16 * 32 + 16 }, run = (m) => (${SENS})(5, Object.assign({}, K, m));
        o.ohne = run({}); o.ohneSn = run({ sn: 1 });
        o.still = run({ kit: 1 }); o.snStill = run({ kit: 1, sn: 1 }); o.laeuft = run({ kit: 1, walk: 1 });
        o.beute = run({ kit: 1, sn: 1, loot: 1 }); o.thf = run({ kit: 1, sn: 1, thf: 1 }); o.waffe = run({ kit: 1, sn: 1, armed: 1 });
        return o; })()`);
      t.ok(r.ohne.inRoom, 'der Test steht wirklich in der Kantine');
      t.ok(r.ohne.sus > 5 && r.ohneSn.sus > 5, 'ohne Kittel sieht die Wache einen Spieler in der Sperrzone: ' + r.ohne.sus + ' / ' + r.ohneSn.sus);
      t.eq([r.still.sus, r.snStill.sus], [0, 0], 'mit Kittel im Stand und beim Schleichen unverdaechtig');
      t.ok(r.laeuft.sus > 5, 'mit Kittel beim Laufen sieht die Wache ihn: ' + r.laeuft.sus);
      t.ok(r.beute.sus > 5, 'mit Beute steigt der Verdacht: ' + r.beute.sus); t.ok(r.thf.sus > 5, 'beim Stehlen steigt er: ' + r.thf.sus); t.ok(r.waffe.sus > 5, 'mit gezogener Waffe steigt er: ' + r.waffe.sus);
    },
  },
  {
    name: 'Kittel: im Gang (Innenbereich) hilft er nicht, in der Wachstube nur beim Schleichen, vor der Flurkamera bleibt der Verdacht beim Schleichen bei 0',
    timeout: 240000,
    async run(t) {
      await t.loadTool('loopnet.js'); await t.loadInpage('coop.js');
      const r = await t.page.evaluate(`(() => { const o = {}, G = { room: 'gang', gx: 480, gy: 176 }, W = { room: 'wach', gx: 27 * 32, gy: 2 * 32 }, run = (K, m) => (${SENS})(5, Object.assign({}, K, m));
        o.gang = run(G, { kit: 1, sn: 1 }); o.gangR = run(G, { kit: 1 });
        o.wachSn = run(W, { kit: 1, sn: 1 }); o.wachStill = run(W, { kit: 1 }); o.wachOhne = run(W, { sn: 1 });
        const cam = (m) => { const S = (${SETUP})(5), { D, g, me, pz, put } = S; for (const q of g.npcs) if (q.k === 'grd') { q.st = 'away'; q.at = 1e9; }
          let best = null; for (const c of g.cams) { c.off = true; if (!best || Math.hypot(c.x - 36.5 * 32, c.y - 10.5 * 32) < Math.hypot(best.x - 36.5 * 32, best.y - 10.5 * 32)) best = c; } best.off = false;
          put(me, 32.5 * 32, 11.5 * 32); put(pz, 40 * 32, 3 * 32); if (m.kit) me.kc = 1; let max = 0;
          for (let i = 0; i < 90; i++) { D.keys.Shift = !!m.sn; D.update(1 / 30); max = Math.max(max, D.get().sus); } D.keys.Shift = false; return max; };
        o.camOhne = cam({ sn: 1 }); o.camKit = cam({ kit: 1, sn: 1 }); o.camKitStill = cam({ kit: 1 });
        return o; })()`);
      t.ok(r.gang.sus > 5, 'im Gang steigt der Verdacht auch mit Kittel: ' + r.gang.sus); t.ok(r.gangR.sus > 5, 'auch im Stand im Gang');
      t.ok(r.wachSn.inRoom, 'der Test steht wirklich in der Wachstube');
      t.eq(r.wachSn.sus, 0, 'in der Wachstube beim Schleichen unverdaechtig'); t.ok(r.wachStill.sus > 5, 'in der Wachstube im Stand ohne Shift nicht: ' + r.wachStill.sus); t.ok(r.wachOhne.sus > 5, 'ohne Kittel auch beim Schleichen nicht');
      t.ok(r.camOhne > 0, 'ohne Kittel sieht die Flurkamera ihn: ' + r.camOhne); t.eq(r.camKit, 0, 'mit Kittel schleichend vor der Flurkamera Verdacht 0'); t.eq(r.camKitStill, 0, 'mit Kittel im Stand Verdacht 0');
    },
  },
  {
    name: 'Kittel im Coop: der Client sieht den Kittel am Mitspieler (Flag, Stapel leer) und zeichnet ohne Fehler',
    timeout: 180000,
    async run(t) {
      await t.loadTool('loopnet.js'); await t.loadInpage('coop.js');
      const r = await t.page.evaluate(`(() => { const o = {}, G = CT.mkGame('prison', 5, 2, 60, 20), A = G.A, B = G.clients[0], R = A.LAY().prison, T = 32, p0 = A.get().players[0];
        o.cl = !!B.get().its.find(i => i.t === 'kit'); o.ver = [A.VER, B.VER];
        p0.x = (R.kit[0] + .5) * T - 20; p0.y = (R.kit[1] + .5) * T; p0.tx = p0.x; p0.ty = p0.y; A.get().its.find(i => i.t === 'kit').act(p0); G.run(1);
        const pb = B.get().players; o.kc = [A.get().players[0].kc | 0, pb[0].kc | 0, pb[1].kc | 0]; o.done = B.get().its.find(i => i.t === 'kit').done;
        let err = null; try { B.draw(); A.draw(); } catch (e) { err = String(e) } o.err = err; return o; })()`);
      t.ok(r.cl, 'Client kennt den Stapel'); t.eq(r.ver[0], r.ver[1], 'VER gleich'); t.eq(r.kc, [1, 1, 0], 'Host und Client: Spieler 0 traegt den Kittel, der Gefangene nicht');
      t.eq(r.done, true, 'der leere Stapel kommt beim Client an'); t.eq(r.err, null, 'Zeichnen ohne Fehler');
    },
  },
];
