// Kloetzchen-Waffen in der Hand (Ticket 217, js/kl-figuren.js, js/draw.js figs3d Feld wp, CFG.wpn tip): je Waffenart das richtige Modell und die richtige Pose, verstaut ohne Waffe,
// der Coop-Client sieht die Waffe des Hosts, Muendungsfeuer am Lauf (CFG.wpn.*.tip). Ohne WebGL 2 uebersprungen.
const lib = require('../lib');
const { glPage } = require('../glshare');   // gemeinsamer WebGL-Browser (tests/glshare.js)
module.exports = [
  {
    name: 'Kloetzchen-Waffen: Pistole, SMG und Sturmgewehr haben je ein eigenes Modell und eine eigene Pose, verstaut keine Waffe, Muendungsfeuer-Abstand je Waffe in CFG',
    timeout: 240000,
    async run(t) {
      const P = await glPage(t); if (!P) return;
      try {
        const r = await P.page.evaluate(`(async () => { const D = __dbg, o = {};
          D.setScenario('bank'); D.buildLay(D.layoutFor(5)); D.startHeist(); D.view3d.kstil = 1; await D.view3d.set(true); D.draw(); D.draw();
          const K = D.view3d.V.kl(), k = K.kit, KL = K.KL; k.state(0, 1);
          const fig = (wp, ar) => ({ k: 'pl', x: 0, y: 0, a: 0, row: 1, col: 0, hit: 0, lie: 0, al: 1, sh: -1, rf: 0, bag: 0, fl: 0, w: 0, ar, wp });
          const read = (wp, ar) => { const ps = k.collect(() => KL.figs.rob0(k, fig(wp, ar), { r: 9 })); let fx = -1e9, n = ps.length; for (const p of ps) fx = Math.max(fx, p.m.elements[12] + Math.abs(p.m.elements[0]) * .5); return { n, fx: Math.round(fx * 10) / 10 } };
          o.stow = read('rifle', 0); o.pistol = read('pistol', 1); o.smg = read('smg', 1); o.rifle = read('rifle', 1); o.none = read(undefined, 1);
          o.tip = ['pistol', 'smg', 'rifle'].map(w => D.CFG.wpn[w].tip);
          await D.view3d.set(false); return o; })()`);
        t.note(JSON.stringify(r));
        t.ok(r.stow.n < r.pistol.n && r.pistol.n < r.smg.n && r.smg.n < r.rifle.n, 'Teile je Waffe: verstaut ' + r.stow.n + ' < Pistole ' + r.pistol.n + ' < SMG ' + r.smg.n + ' < Sturmgewehr ' + r.rifle.n);
        t.ok(r.stow.fx < r.pistol.fx - 5, 'verstaut ohne Waffe: weiteste Stelle vorn ' + r.stow.fx + ' gegen Pistole ' + r.pistol.fx);
        t.ok(r.rifle.fx > r.smg.fx && r.rifle.fx > r.pistol.fx, 'Sturmgewehr reicht am weitesten nach vorn: ' + [r.pistol.fx, r.smg.fx, r.rifle.fx]);
        t.eq(r.none.n, r.pistol.n, 'ohne Waffenart (Gegner, aeltere Zustaende) gilt die Pistole');
        t.ok(r.tip.every(v => v > 15 && v < 40) && r.tip[2] > r.tip[0], 'Muendungsabstand je Waffe in CFG.wpn.*.tip: ' + r.tip);
        // Laufspitze nah am Muendungsfeuer: die weiteste Stelle der Teile (Mitte plus halbe Laenge) liegt hoechstens 4 Pixel neben dem Abstand in CFG
        ['pistol', 'smg', 'rifle'].forEach((w, i) => t.ok(Math.abs(r[w].fx - r.tip[i]) < 4, w + ': Laufspitze ' + r[w].fx + ' nahe am Muendungsabstand ' + r.tip[i]));
        if (P.page.errors.length) t.ok(false, 'JS-Fehler: ' + P.page.errors.slice(0, 2).join(' | '));
      } finally { await P.done(); }
    },
  },
  {
    name: 'Kloetzchen-Waffen im Coop: der Client kennt die Waffe des Host-Spielers (kit.w), zeichnet sie in der Hand (Teile je Waffe) und beide Ansichten laufen ohne Fehler',
    timeout: 300000,
    async run(t) {
      const P = await glPage(t); if (!P) return;
      try {
        await lib.loadTool(P.page, 'loopnet.js'); await lib.loadInpage(P.page, 'coop.js');
        const r = await P.page.evaluate(`(async () => {
          const G = CT.mkGame('bank', 321, 2, 60, 20, null, null, insts => { insts[0].SESSION.own.smg = 1 }), A = G.A, B = G.clients[0]; A.CFG.policeAt = 1e6; A.CFG.policeForced = 1e6;
          const run = n => { for (let i = 0; i < n; i++) step(G.insts, G.net, 1 / 60); };
          for (const d of [A, B]) { d.view3d.kstil = 1; await d.view3d.set(true); }
          A.startHeist(); run(120); const o = { kitA: A.get().players.map(p => p.kit && p.kit.w), kitB: B.get().players.map(p => p.kit && p.kit.w) };
          const parts = d => { d.draw(); d.draw(); return d.view3d.V.info().k.parts };
          const pb = B.get().players[0]; pb.armed = true; const n = {}; for (const w of ['pistol', 'smg', 'rifle']) { pb.kit.w = w; n[w] = parts(B) } o.n = n; pb.kit.w = o.kitA[0];
          for (const d of [A, B]) { d.draw(); d.draw() } const ii = [A, B].map(d => d.view3d.V.info()); o.err = ii.map(i => i.err); o.on = ii.map(i => !!(i.k && i.k.on));
          for (const d of [A, B]) await d.view3d.set(false); for (const d of G.insts) { try { d.leaveGame(); } catch (e) {} } return o; })()`);
        t.note(JSON.stringify(r));
        t.ok(r.kitA[0] && r.kitB[0] === r.kitA[0], 'der Client kennt die Waffe des Host-Spielers: Host ' + r.kitA + ', Client ' + r.kitB);
        t.ok(r.n.pistol < r.n.smg && r.n.smg < r.n.rifle, 'Teile je Waffe beim Client (Host-Spieler bewaffnet): ' + JSON.stringify(r.n));
        t.ok(r.err.every(e => e === '') && r.on.every(Boolean), 'beide Ansichten im Kloetzchen-Stil ohne Fehler');
        if (P.page.errors.length) t.ok(false, 'JS-Fehler: ' + P.page.errors.slice(0, 2).join(' | '));
      } finally { await P.done(); }
    },
  },
];
