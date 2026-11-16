// Ticket 207: Spielerkugeln zerschiessen Fenster (W wird w, Host rechnet, Client bekommt das Raster), Polizeikugeln nicht, danach geht wbar (Y) weiter. Ohne 3D (die Optik pruefen Test 202 und die Bilder).
const lib = require('../lib');
const { glPage } = require('../glshare');
module.exports = [
  {
    name: 'Fenster zerschiessen: eine Spielerkugel macht aus W ein w (Ereignis gl), eine Polizeikugel nicht, Bretter (wbar) gehen danach, mit mehreren Treffern nach CFG.win.hits',
    async run(t) {
      const r = await t.page.evaluate(`(() => { const D = __dbg; D.setScenario('bank'); D.buildLay(D.layoutFor(5)); D.startHeist(); const g = D.get(), me = g.me, W = D.LAY().wins, w = W[0], o = {}; me.hp = 1e9;
        const cellAt = () => D.world().cell(w.x, w.y);
        // von aussen auf die Scheibe: iv zeigt nach innen (deriveWins), wir starten 40 Pixel vor der Scheibe auf der Aussenseite
        const sx = w.px - w.iv[0] * 40, sy = w.py - w.iv[1] * 40, vx = w.iv[0] * 700, vy = w.iv[1] * 700;
        const shoot = own => { D.get().bl.push({ id: 9000 + Math.floor(Math.random() * 1e6), x: sx, y: sy, vx, vy, l: .8, o: own ? 1 : 0, own: me.id, d: 20, ov: 0 }); for (let i = 0; i < 12; i++) { me.hp = 1e9; D.update(1 / 60) } };
        o.pre = cellAt(); o.hits = D.CFG.win.hits;
        shoot(false); o.afterPol = cellAt();
        for (let k = 0; k < o.hits; k++) shoot(true); o.afterMe = cellAt();
        o.bl = D.get().bl.length;
        // mehrere Treffer: mit hits 2 bricht erst der zweite Treffer
        D.CFG.win.hits = 2; const w2 = W.find(q => q !== w && D.world().cell(q.x, q.y) === 'W'); if (w2) { const sx2 = w2.px - w2.iv[0] * 40, sy2 = w2.py - w2.iv[1] * 40; const sh2 = () => { D.get().bl.push({ id: 9500 + Math.floor(Math.random() * 1e5), x: sx2, y: sy2, vx: w2.iv[0] * 700, vy: w2.iv[1] * 700, l: .8, o: 1, own: me.id, d: 20, ov: 0 }); for (let i = 0; i < 12; i++) { me.hp = 1e9; D.update(1 / 60) } }; sh2(); o.h1 = D.world().cell(w2.x, w2.y); sh2(); o.h2 = D.world().cell(w2.x, w2.y) } D.CFG.win.hits = o.hits;
        // Bretter: wbar ist moeglich, solange das Fenster W oder w ist
        const it = g.its.find(i => i.t === 'wbar' && i.w.x === w.x && i.w.y === w.y); D.get().phase; o.wbar = !!it;
        return o; })()`);
      t.note(JSON.stringify(r));
      t.eq(r.pre, 'W', 'Fenster ist heil');
      t.eq(r.afterPol, 'W', 'eine Polizeikugel laesst es heil');
      t.eq(r.afterMe, 'w', 'Spielerkugel(n) zerschiessen es nach ' + r.hits + ' Treffer(n)');
      if (r.h1) { t.eq(r.h1, 'W', 'mit hits 2 haelt die Scheibe den ersten Treffer'); t.eq(r.h2, 'w', 'und bricht beim zweiten') }
      t.ok(r.wbar, 'Fensterbrett (wbar) ist als Objekt da');
    },
  },
  {
    name: 'Fenster zerschiessen im Coop: der Client sieht w, nachdem der Host eine Scheibe zerschossen hat (Test-Leitung)',
    timeout: 120000,
    async run(t) {
      await lib.loadTool(t.page, 'loopnet.js'); await lib.loadInpage(t.page, 'coop.js');
      const r = await t.page.evaluate(`(async () => {
        const G = CT.mkGame('bank', 321, 2), A = G.A, B = G.clients[0]; A.CFG.policeAt = 1e6; A.CFG.policeForced = 1e6;
        const run = n => { for (let i = 0; i < n; i++) step(G.insts, G.net, 1 / 60); };
        A.startHeist(); run(120);
        const w = A.LAY().wins[0], g = A.get(), me = g.me, o = {}; me.hp = 1e9;
        o.pre = [A, B].map(d => d.world().cell(w.x, w.y));
        const sx = w.px - w.iv[0] * 40, sy = w.py - w.iv[1] * 40; for (let k = 0; k < A.CFG.win.hits; k++) { A.get().bl.push({ id: 7000 + k, x: sx, y: sy, vx: w.iv[0] * 700, vy: w.iv[1] * 700, l: .8, o: 1, own: me.id, d: 20, ov: 0 }); run(12); me.hp = 1e9 }
        run(30); o.post = [A, B].map(d => d.world().cell(w.x, w.y));
        for (const d of G.insts) { try { d.leaveGame(); } catch (e) {} } return o; })()`);
      t.note(JSON.stringify(r));
      t.eq(r.pre, ['W', 'W'], 'vorher heil bei beiden');
      t.eq(r.post, ['w', 'w'], 'Host und Client sehen w');
    },
  },
  {
    name: 'Fenster zerschiessen in 3D (Kloetzchen): beim Bruch fliegen Glas-Kloetzchen und Funken, die Zahl bleibt unter der Obergrenze der Stufe, keine Fehler',
    timeout: 240000,
    async run(t) {
      const P = await glPage(t); if (!P) return;
      try {
        const r = await P.page.evaluate(`(async () => { const D = __dbg; D.setScenario('bank'); D.buildLay(D.layoutFor(5)); D.startHeist(); const me = D.get().me; me.hp = 1e9; await D.view3d.set(true);
          for (let i = 0; i < 40; i++) D.update(1 / 30); D.draw(); D.draw(); const V = D.view3d.V, W = D.LAY().wins, w = W[0], o = {};
          o.pre = V.info().k.deb; const sx = w.px - w.iv[0] * 40, sy = w.py - w.iv[1] * 40;
          D.get().bl.push({ id: 9900, x: sx, y: sy, vx: w.iv[0] * 700, vy: w.iv[1] * 700, l: .8, o: 1, own: me.id, d: 20, ov: 0 }); let mx = 0, sp = 0;
          for (let i = 0; i < 24; i++) { me.hp = 1e9; D.update(1 / 30); D.draw(); const k = V.info().k; mx = Math.max(mx, k.deb); sp = Math.max(sp, k.sparks) }
          o.deb = mx; o.sparks = sp; o.cell = D.world().cell(w.x, w.y); o.q = V.info().k.q; o.err = V.info().err; V.el.getContext('webgl2').finish(); await D.view3d.set(false); return o; })()`);
        t.note(JSON.stringify(r));
        t.ok(r.err === '', 'keine Fehler');
        t.eq(r.cell, 'w', 'die Scheibe ist zerschossen');
        t.ok(r.deb >= 3 && r.deb <= [160, 320, 560][r.q], 'Glas-Kloetzchen fliegen: ' + r.deb);
        t.ok(r.sparks > 0, 'Funken: ' + r.sparks);
        if (P.page.errors.length) t.ok(false, 'JS-Fehler: ' + P.page.errors.slice(0, 2).join(' | '));
      } finally { await P.done(); }
    },
  },
];
