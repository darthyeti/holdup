// Ticket 297: Waeschewagen im Gefaengnis (leiser Fluchtweg). Ein Wagen in der Waescherei (LAY.prison.cart), mit E (halten) greifen und schieben (Flag cg), der Gefangene steigt im Aussenbereich mit E ein (cv),
// ist im Wagen unsichtbar fuer Wachen und Kameras, der Schieber ist beim Schleichen unverdaechtig, im Alarm steigt der Gefangene aus, am Abholpunkt zaehlt der Wagen mit Insasse (lautlose Flucht).
// Aufbau der Einzel-Tests: Gefaengnis, zwei Spieler auf einer Instanz (Spieler 0 draussen, Spieler 1 der Gefangene), Kameras aus. walk(pts, sn) laeuft Spieler 0 ueber Tastendruck durch die Punkte (sn: Shift).
const SETUP = `(sd) => { const D = __dbg; D.sessReset(); D.setScenario('prison'); D.setSeedMode('random'); D.setLage([]); D.setN(2); D.buildSeed(sd); D.CFG.policeAt = 1e6; D.CFG.policeForced = 1e6;
  const g = D.get(), me = g.me, pz = g.players[1], R = D.LAY().prison, T = 32; for (const c of g.cams) c.off = true;
  const it = k => D.get().its.find(i => i.t === k), tile = (x, y) => [(x + .5) * T, (y + .5) * T];
  const walk = (pts, sn, each) => { const keys = D.keys; keys.Shift = !!sn; for (const q of pts) { let n = 0; while (Math.hypot(q[0] - me.x, q[1] - me.y) > 5 && n < 2400 && !D.get().ended) { const dx = q[0] - me.x, dy = q[1] - me.y; keys.d = dx > 3; keys.a = dx < -3; keys.s = dy > 3; keys.w = dy < -3; D.update(1 / 30); n++; if (each) each(); } } keys.a = keys.d = keys.w = keys.s = keys.Shift = false; };
  const put = (o, x, y) => { o.x = x; o.y = y; o.tx = x; o.ty = y; };
  return { D, g, me, pz, R, T, it, tile, walk, put }; }`;
module.exports = [
  {
    name: 'Waeschewagen: Startkachel in der Waescherei auf freiem Boden, Objekte da, Weg von dort durch die Kueche und die Servicetuer zum Abholpunkt (8 Seeds)',
    timeout: 240000,
    async run(t) {
      await t.loadTool('loopnet.js'); await t.loadInpage('coop.js');
      const r = await t.page.evaluate(`(() => { const o = { bad: [], n: 0 };
        for (let sd = 1; sd <= 8; sd++) { const S = (${SETUP})(sd), { D, R, me, it, T } = S, c = R.cart, wa = R.rooms.wasch, ku = R.rooms.kue;
          if (!c || c[0] < wa[0] || c[0] > wa[2] || c[1] < wa[1] || c[1] > wa[3]) { o.bad.push([sd, 'lage', c]); continue; }
          if (D.world().M[c[1] + 6][c[0] + 6] !== '.') o.bad.push([sd, 'boden']);
          if (!it('cgr') || !it('cin') || !it('cout')) o.bad.push([sd, 'objekte']);
          const g = it('cgr'); if (Math.abs(g.x - (c[0] + .5) * T) > 1 || Math.abs(g.y - (c[1] + .5) * T) > 1) o.bad.push([sd, 'ort']);
          it('dlx').act(me);
          const pk = R.pick, p = D.pathTo((c[0] + .5) * T, (c[1] + .5) * T, pk[0], pk[1]); if (!p.length) o.bad.push([sd, 'weg']);
          else { const tl = p.map(q => [Math.floor(q[0] / T), Math.floor(q[1] / T)]); if (!tl.some(q => q[0] === R.dl.cells[0][0] && q[1] === R.dl.cells[0][1])) o.bad.push([sd, 'nicht durch die Servicetuer']); if (!tl.some(q => q[0] >= ku[0] && q[0] <= ku[2] && q[1] >= ku[1] && q[1] <= ku[3])) o.bad.push([sd, 'nicht durch die Kueche']); }
          o.n++; }
        return o; })()`);
      t.eq(r.bad, [], 'Wagen je Seed in der Waescherei, Weg durch Kueche und Servicetuer'); t.eq(r.n, 8, 'alle 8 Seeds geprueft');
    },
  },
  {
    name: 'Waeschewagen: E greift ihn (halten), Einsteigen nur fuer den Gefangenen im Aussenbereich, im Wagen gilt nur Aussteigen, H laesst los und steigt aus',
    timeout: 120000,
    async run(t) {
      await t.loadTool('loopnet.js'); await t.loadInpage('coop.js');
      const r = await t.page.evaluate(`(() => { const o = {}, S = (${SETUP})(5), { D, g, me, pz, R, it, tile, put } = S, cart = () => D.cart();
        const c = tile(R.cart[0], R.cart[1]); put(me, c[0] - 20, c[1]);
        const gr = it('cgr'); o.okTeam = gr.ok(me); D.keys.e = true; for (let i = 0; i < 30 * (D.CFG.prison.cart.grabT + .5); i++) D.update(1 / 30); D.keys.e = false;
        o.dr = cart().dr; o.cg = me.cg; D.update(1 / 30); o.okZwei = gr.ok(pz);
        D.relCart(me); o.nachH = [cart().dr, me.cg];
        const cin = it('cin'); put(pz, R.slots[0].cell[0], R.slots[0].cell[1]); o.zelle = cin.ok(pz); put(pz, c[0] + 10, c[1]); o.team = cin.ok(me);
        o.aussen = D.prOut(pz); o.okEin = cin.ok(pz);
        const hof = [40 * 32, 3 * 32]; put(pz, hof[0], hof[1]); o.hof = D.prOut(pz); put(pz, c[0] + 10, c[1]);
        cin.act(pz); o.cv = [pz.cv, cart().in]; D.update(1 / 30); o.pos = Math.hypot(pz.x - cart().x, pz.y - cart().y);
        o.cands = D.cands(pz).map(i => i.t); o.zweiter = cin.ok(me) || cin.ok(pz);
        D.relCart(pz); o.aus = [pz.cv, cart().in];
        cin.act(pz); const co = it('cout'); o.coutOk = co.ok(pz); co.act(pz); o.aus2 = [pz.cv, cart().in];
        return o; })()`);
      t.eq(r.okTeam, true, 'ein Mitspieler kann den Wagen greifen'); t.eq([r.dr, r.cg], [0, 1], 'nach dem Halten schiebt Spieler 0'); t.eq(r.okZwei, false, 'ein Wagen, ein Schieber');
      t.eq(r.nachH, [-1, 0], 'H laesst den Wagen los');
      t.eq([r.zelle, r.team], [false, false], 'in der Zelle und als Mitspieler kein Einsteigen'); t.eq([r.aussen, r.okEin], [true, true], 'im Aussenbereich steigt der Gefangene ein'); t.eq(r.hof, true, 'auch Hof 1 gehoert zum Aussenbereich');
      t.eq(r.cv, [1, 1], 'Insasse gesetzt'); t.ok(r.pos < 1, 'der Insasse sitzt am Wagen'); t.eq(r.cands, ['cout'], 'im Wagen gibt es nur Aussteigen'); t.eq(r.zweiter, false, 'ein Wagen, ein Insasse');
      t.eq(r.aus, [0, -1], 'H steigt aus'); t.eq([r.coutOk, r.aus2], [true, [0, -1]], 'E (Aussteigen) geht');
    },
  },
  {
    name: 'Waeschewagen: der Insasse bleibt vor Wachen unsichtbar, der Schieber ist nur im Stand oder beim Schleichen unverdaechtig, Gehen ohne Wagen und ohne Schleichen baut Verdacht auf',
    timeout: 240000,
    async run(t) {
      await t.loadTool('loopnet.js'); await t.loadInpage('coop.js');
      const r = await t.page.evaluate(`(() => { const o = {};
        // Wache im Gang (still, schaut nach Sueden), der Spieler steht oder geht 150 bis 250 Pixel vor ihr im Sichtkegel (Sperrzone): ohne Wagen steigt der Verdacht
        const run = (mode) => { const S = (${SETUP})(5), { D, g, me, pz, R, it, put } = S, gd = g.npcs.filter(q => q.k === 'grd' && q.st !== 'away').find(q => q.x > R.rooms.gang[0] * 32 && q.x < (R.rooms.gang[2] + 1) * 32);
          for (const q of g.npcs) if (q !== gd && q.k === 'grd') { q.st = 'away'; q.at = 1e9; }
          gd.st = 'idle'; gd.still = true; gd.x = 480; gd.y = 176; gd.base = Math.PI / 2; gd.a = gd.base; gd.path = []; gd.wait = 99;
          put(me, 480, 176 + 150); put(pz, 40 * 32, 3 * 32);
          if (mode === 'plain' || mode === 'geht') put(me, 480, 176 + 250);
          D.cartAt(me.x - 20, me.y + 10);
          if (mode === 'insasse') { put(pz, me.x, me.y); put(me, 20 * 32, 20 * 32); D.cartAt(480, 326); put(pz, 480, 326); it('cin').act(pz); put(me, 20 * 32, 20 * 32); }
          if (mode.startsWith('schieber') || mode === 'geht') it('cgr').act(me);
          if (mode === 'plain') { it('cgr').pr = 0; }
          let max = 0; const dir = (mode === 'schieber-geht' || mode === 'schieber-schleicht' || mode === 'geht') ? 1 : 0;
          for (let i = 0; i < 60; i++) { D.keys.w = !!dir; D.keys.Shift = mode === 'schieber-schleicht'; D.update(1 / 30); max = Math.max(max, D.get().sus); } D.keys.w = false; D.keys.Shift = false;
          return { sus: max, ph: D.get().phase, gd: Math.hypot(gd.x - me.x, gd.y - me.y) }; };
        for (const m of ['plain', 'insasse', 'schieber-still', 'schieber-geht', 'schieber-schleicht']) o[m] = run(m);
        return o; })()`);
      t.ok(r.plain.sus > 5, 'ohne Wagen sieht die Wache einen Spieler in der Sperrzone: ' + r.plain.sus);
      t.eq(r.insasse.sus, 0, 'der Insasse im Wagen wird nicht gesehen');
      t.eq(r['schieber-still'].sus, 0, 'der Schieber im Stand ist unverdaechtig');
      t.ok(r['schieber-geht'].sus > 5, 'der Schieber ohne Schleichen baut Verdacht auf: ' + r['schieber-geht'].sus);
      t.eq(r['schieber-schleicht'].sus, 0, 'der schleichende Schieber ist unverdaechtig');
    },
  },
  {
    name: 'Waeschewagen: Schieben ueber die Route (Waescherei, Kueche, Servicetuer) mit dem Insassen, der Wagen passt durch die Tueren, am Abholpunkt ist der Gefangene gesichert (lautlos)',
    timeout: 240000,
    async run(t) {
      await t.loadTool('loopnet.js'); await t.loadInpage('coop.js');
      const r = await t.page.evaluate(`(() => { const o = { bad: [] };
        for (const sd of [5, 11]) { const S = (${SETUP})(sd), { D, g, me, pz, R, it, tile, put, walk } = S, c = tile(R.cart[0], R.cart[1]);
          for (const q of g.npcs) if (q.k === 'grd') { q.st = 'away'; q.at = 1e9; }
          put(me, c[0] - 24, c[1]); put(pz, c[0] + 8, c[1]); it('cin').act(pz); it('cgr').act(me); it('dlx').act(me);
          const seen = new Set(); let far = 0; const pk = R.pick;
          const p = D.pathTo(me.x, me.y, pk[0], pk[1]); if (!p.length) { o.bad.push([sd, 'weg']); continue; }
          walk(p, true, () => { const k = D.cart(); seen.add(Math.floor(k.x / 32) + ',' + Math.floor(k.y / 32)); far = Math.max(far, Math.hypot(k.x - me.x, k.y - me.y)); });
          const e = D.get(); const dl = R.dl.cells[0];
          o.rows = (o.rows || []).concat([[sd, !!e.ended, e.ended && e.ended.win, e.phase, pz.out, pz.cv, seen.has(dl[0] + ',' + dl[1]), Math.round(far), Math.round(e.sus)]]);
          if (!seen.has(dl[0] + ',' + dl[1])) o.bad.push([sd, 'Wagen nicht durch die Servicetuer']);
          if (!e.ended) o.bad.push([sd, 'nicht beendet']); else if (!e.ended.win) o.bad.push([sd, 'verloren']);
          if (e.phase !== 1) o.bad.push([sd, 'Alarm']);
        }
        return o; })()`);
      t.note(JSON.stringify(r.rows));
      t.eq(r.bad, [], 'der Wagen mit Insasse kommt durch die Servicetuer zum Abholpunkt, Sieg ohne Alarm');
    },
  },
  {
    name: 'Waeschewagen: ganze Route mit Wachen und Kameras: leer in die Kantine, der Gefangene steigt am Gitter II ein, Schieben (schleichend) durch Waescherei und Kueche zum Abholpunkt ohne Alarm',
    timeout: 400000,
    async run(t) {
      await t.loadTool('loopnet.js'); await t.loadInpage('coop.js');
      const r = await t.page.evaluate(`(() => { const o = { bad: [], rows: [] };
        for (const sd of [5, 11, 23]) { const S = (${SETUP})(sd), { D, g, me, pz, R, it, tile, put, walk } = S, c = tile(R.cart[0], R.cart[1]);
          for (const q of g.cams) q.off = false;
          put(me, c[0] - 24, c[1]); it('cgr').act(me); it('dlx').act(me); let sus = 0; const each = () => { sus = Math.max(sus, D.get().sus); };
          const to = D.pathTo(me.x, me.y, 18, 19); if (!to.length) { o.bad.push([sd, 'weg zur Kantine']); continue; }
          walk(to, true, each); const k = D.cart(); put(pz, k.x + 12, k.y); it('cin').act(pz); for (let i = 0; i < 10; i++) D.update(1 / 30);
          const back = D.pathTo(me.x, me.y, R.pick[0], R.pick[1]); if (!back.length) { o.bad.push([sd, 'weg zum Abholpunkt']); continue; }
          const dc = R.dl.cells[0], ix = back.findIndex(q => Math.floor(q[0] / 32) === dc[0] && Math.floor(q[1] / 32) === dc[1] - 1); walk(back.slice(0, ix + 1), true, each); it('dlx').act(me); walk(back.slice(ix + 1), true, each); const e = D.get();
          o.rows.push([sd, !!e.ended, e.ended && e.ended.win, e.phase, Math.round(sus), pz.cv]);
          if (!(e.ended && e.ended.win) || e.phase !== 1) o.bad.push([sd, 'nicht lautlos gesichert', e.phase, Math.round(sus)]); }
        return o; })()`);
      t.note(JSON.stringify(r.rows)); t.eq(r.bad, [], 'lautlos mit dem Wagen ausgebrochen');
    },
  },
  {
    name: 'Waeschewagen: im Alarm steigt der Insasse aus, der Wagen wird losgelassen, Einsteigen und Schieben gibt es im Ueberfall nicht',
    timeout: 120000,
    async run(t) {
      await t.loadTool('loopnet.js'); await t.loadInpage('coop.js');
      const r = await t.page.evaluate(`(() => { const o = {}, S = (${SETUP})(5), { D, g, me, pz, R, it, tile, put } = S, c = tile(R.cart[0], R.cart[1]);
        put(me, c[0] - 24, c[1]); put(pz, c[0] + 8, c[1]); it('cin').act(pz); it('cgr').act(me); D.update(1 / 30); o.vor = [pz.cv, me.cg, D.cart().in, D.cart().dr];
        D.startHeist(true, me); D.update(1 / 30); o.nach = [pz.cv, me.cg, D.cart().in, D.cart().dr, D.get().phase];
        o.msg = D.msgs().feed.some(s => /springt aus dem Wäschewagen/.test(s));
        o.ok = [it('cgr').ok(me), it('cin').ok(pz)]; o.live = pz.cv ? 0 : Math.hypot(pz.x - D.cart().x, pz.y - D.cart().y) < 60;
        return o; })()`);
      t.eq(r.vor, [1, 1, 1, 0], 'vorher: Insasse drin, Schieber greift'); t.eq(r.nach, [0, 0, -1, -1, 2], 'Alarm: beide frei'); t.ok(r.msg, 'Meldung'); t.eq(r.ok, [false, false], 'im Ueberfall kein Greifen und Einsteigen'); t.ok(r.live, 'der Gefangene steht neben dem Wagen');
    },
  },
  {
    name: 'Waeschewagen im Coop: Wagen, Schieber und Insasse sind auf dem Client gleich, der Client zeichnet (2D), der Insasse ist auch dort nicht als Figur zu sehen',
    timeout: 180000,
    async run(t) {
      await t.loadTool('loopnet.js'); await t.loadInpage('coop.js');
      const r = await t.page.evaluate(`(() => { const o = {}, G = CT.mkGame('prison', 5, 2, 60, 20), A = G.A, B = G.clients[0], R = A.LAY().prison, T = 32, ga = A.get(), p0 = ga.players[0], p1 = ga.players[1];
        const c = [(R.cart[0] + .5) * T, (R.cart[1] + .5) * T], put = (o2, x, y) => { o2.x = x; o2.y = y; o2.tx = x; o2.ty = y; };
        o.cl = !!B.get().its.find(i => i.t === 'cgr'); o.start = Math.hypot(A.cart().x - B.cart().x, A.cart().y - B.cart().y) < 1;
        put(p0, c[0] - 24, c[1]); put(p1, c[0] + 8, c[1]); A.get().its.find(i => i.t === 'cin').act(p1); A.get().its.find(i => i.t === 'cgr').act(p0); G.run(1);
        const pb = B.get().players; o.cl2 = [pb[1].cv, pb[0].cg, B.cart().in, B.cart().dr];
        A.keys.a = true; G.run(1.2); A.keys.a = false; G.run(1);
        o.dist = Math.hypot(A.cart().x - B.cart().x, A.cart().y - B.cart().y); o.moved = Math.hypot(A.cart().x - c[0], A.cart().y - c[1]) > 20; o.ins = Math.hypot(pb[1].x - B.cart().x, pb[1].y - B.cart().y);
        B.draw(); A.draw();
        A.relCart(p1); G.run(1); o.aus = [B.get().players[1].cv, B.cart().in];
        return o; })()`);
      t.ok(r.cl && r.start, 'Client kennt Objekte und Wagen'); t.eq(r.cl2, [1, 1, 1, 0], 'Client: Insasse, Schieber, Wagen mit Insasse und Schieber'); t.ok(r.moved, 'der Wagen ist mit dem Schieber gefahren');
      t.ok(r.dist < 6, 'Wagen auf Host und Client gleich: ' + r.dist); t.ok(r.ins < 8, 'der Insasse sitzt auch auf dem Client im Wagen: ' + r.ins); t.eq(r.aus, [0, -1], 'Aussteigen kommt beim Client an');
    },
  },
];
