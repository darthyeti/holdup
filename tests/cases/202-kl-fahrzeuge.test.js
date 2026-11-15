// Kloetzchen-Stil: Fahrzeuge und Effekte (Ticket 198, js/kl-fahrzeuge.js und js/kl-effekte.js): je Art baut der Bauer ohne Fehler und im Teilebudget (40), Fahrtrichtung, Explosionen (Saeule, C4, Granatwerfer
// ueber das Ereignis bx, Blendgranate ueber gb) lassen Teile und Funken fliegen, beim Client gleich wie beim Host (Test-Leitung). Kein Pixelvergleich. Ohne WebGL 2 uebersprungen.
const path = require('path'), { pathToFileURL } = require('url');
const lib = require('../lib');
async function glPage(t) {
  const ok = p => p.evaluate(() => { const c = document.createElement('canvas'); return !!c.getContext('webgl2'); });
  if (await ok(t.page)) return { page: t.page, done: async () => {} };
  const env = await lib.launch({ webgl: true }), page = await lib.openGame(env);
  if (await ok(page)) return { page, done: async () => { await page.ctx.close().catch(() => {}); await env.browser.close().catch(() => {}); env.srv.close(); } };
  await env.browser.close().catch(() => {}); env.srv.close(); t.note('kein WebGL 2, 3D-Teil uebersprungen'); return null;
}
module.exports = [
  {
    name: 'Kloetzchen-Fahrzeuge: jede Art (pol, civ, wreck, van, vh, tk) baut ohne Fehler, hoechstens 40 Teile, Fahrtrichtung bei fx -1 gedreht',
    timeout: 240000,
    async run(t) {
      const root = lib.ROOT, K = await import(pathToFileURL(path.join(root, 'js', 'kl-kern.js')).href), KL = K.KL;
      t.ok(typeof KL.carHead === 'function', 'KL.carHead eingetragen');
      t.ok(Math.abs(KL.carHead({ a: 0, fx: 1 })) < 1e-9 && Math.abs(KL.carHead({ a: 0, fx: -1 }) - Math.PI) < 1e-9, 'Richtung: fx -1 dreht um 180 Grad');
      const P = await glPage(t); if (!P) return;
      try {
        const r = await P.page.evaluate(`(async () => { const D = __dbg; D.setScenario('bank'); D.setSeedMode('random'); D.buildLay(D.layoutFor(5)); D.startHeist(); D.get().me.hp = 1e9;
          for (let i = 0; i < 60; i++) D.update(1 / 30); D.view3d.kstil = 1; await D.view3d.set(true); D.draw(); D.draw();
          const V = D.view3d.V, K = V.kl(), k = K.kit, out = {}, errs = [];
          const E = { pol: { h: 26, bar: 1 }, civ: { h: 24 }, wreck: { h: 20 }, van: { h: 30 }, vh: { h: 30, bar: 1 }, tk: { h: 40 } };
          for (const art of Object.keys(E)) for (const fx of [1, -1]) for (const bl of [0, 1, 2]) for (const row of [0, 1, 2, 3]) {
            const o = { k: art, x: 200, y: 200, a: 0, row, L: art === 'tk' ? 224 : 128, W: art === 'tk' ? 96 : 64, fx, fy: 1, dim: 0, bl }, look = k.carLook(o, E[art]);
            try { const parts = k.collect(() => K.KL.cars[art](k, o, E[art], look)); const n = parts.length; out[art] = Math.max(out[art] || 0, n); out[art + 'min'] = Math.min(out[art + 'min'] == null ? 1e9 : out[art + 'min'], n) } catch (e) { errs.push(art + ': ' + e.message) }
          }
          await D.view3d.set(false); return { out, errs }; })()`);
        t.note(JSON.stringify(r.out));
        t.eq(r.errs, [], 'Bauer ohne Fehler');
        for (const art of ['pol', 'civ', 'wreck', 'van', 'vh', 'tk']) t.ok(r.out[art + 'min'] >= 6 && r.out[art] <= 40, art + ': Teile im Rahmen (' + r.out[art + 'min'] + ' bis ' + r.out[art] + ')');
        if (P.page.errors.length) t.ok(false, 'JS-Fehler: ' + P.page.errors.slice(0, 2).join(' | '));
      } finally { await P.done(); }
    },
  },
  {
    name: 'Kloetzchen-Effekte: Explosion (Ereignis bx) und Blendgranate (gb) lassen Teile, Funken und Rauch entstehen, Obergrenzen je Stufe gelten, keine Fehler',
    timeout: 240000,
    async run(t) {
      const P = await glPage(t); if (!P) return;
      try {
        const r = await P.page.evaluate(`(async () => { const D = __dbg; D.setScenario('bank'); D.setSeedMode('random'); D.buildLay(D.layoutFor(5)); D.startHeist(); D.get().me.hp = 1e9;
          for (let i = 0; i < 60; i++) D.update(1 / 30); D.view3d.kstil = 1; await D.view3d.set(true); D.draw(); D.draw();
          const V = D.view3d.V, m = D.get().me, o = {}, run = n => { let mx = { deb: 0, sparks: 0, puffs: 0 }; for (let i = 0; i < n; i++) { D.get().me.hp = 1e9; D.update(1 / 30); D.draw(); const k = V.info().k; for (const q in mx) mx[q] = Math.max(mx[q], k[q]) } return mx };
          o.base = run(4); D.evt('bx', [m.x + 60, m.y, 120, 1]); o.boom = run(8);
          o.after = run(240); D.evt('gb', [m.x + 60, m.y, 0]); o.flash = run(8);
          for (let j = 0; j < 12; j++) D.evt('bx', [m.x + 40 + j * 4, m.y + 20, 160, 1]); o.many = run(10);
          o.err = V.info().err; o.q = V.info().k.q; await D.view3d.set(false); return o; })()`);
        t.note(JSON.stringify(r));
        t.ok(r.err === '', 'keine Fehler in der Ansicht');
        t.ok(r.boom.deb >= 4 && r.boom.sparks > 0, 'Explosion: Teile ' + r.boom.deb + ', Funken ' + r.boom.sparks);
        t.ok(r.flash.sparks > 0, 'Blendgranate: Funken ' + r.flash.sparks);
        t.ok(r.many.deb <= [160, 320, 560][r.q] && r.many.sparks <= [60, 120, 220][r.q], 'Obergrenzen je Stufe ' + r.q + ': Teile ' + r.many.deb + ', Funken ' + r.many.sparks);
        if (P.page.errors.length) t.ok(false, 'JS-Fehler: ' + P.page.errors.slice(0, 2).join(' | '));
      } finally { await P.done(); }
    },
  },
  {
    name: 'Kloetzchen-Effekte im Coop: eine Explosion zeigen Host und Client mit Teilen (Test-Leitung)',
    timeout: 300000,
    async run(t) {
      const P = await glPage(t); if (!P) return;
      try {
        await lib.loadTool(P.page, 'loopnet.js'); await lib.loadInpage(P.page, 'coop.js');
        const r = await P.page.evaluate(`(async () => {
          const G = CT.mkGame('bank', 321, 2), A = G.A, B = G.clients[0]; A.CFG.policeAt = 1e6; A.CFG.policeForced = 1e6;
          const run = n => { for (let i = 0; i < n; i++) step(G.insts, G.net, 1 / 60); };
          for (const d of [A, B]) { d.view3d.kstil = 1; await d.view3d.set(true); }
          A.startHeist(); run(120); for (const d of [A, B]) { d.draw(); d.draw(); }
          const m = A.get().me; A.get().me.hp = 1e9; A.evt('bx', [m.x + 50, m.y, 120, 1]); let deb = [0, 0], sp = [0, 0];
          for (let i = 0; i < 40; i++) { run(1); if (i % 2) for (const d of [A, B]) d.draw(); const k = [A, B].map(d => d.view3d.V.info().k); deb = deb.map((v, j) => Math.max(v, k[j].deb)); sp = sp.map((v, j) => Math.max(v, k[j].sparks)) }
          const out = { deb, sp, err: [A, B].map(d => d.view3d.V.info().err) };
          for (const d of [A, B]) await d.view3d.set(false); for (const d of G.insts) { try { d.leaveGame(); } catch (e) {} } return out; })()`);
        t.note(JSON.stringify(r));
        t.ok(r.err.every(e => e === ''), 'keine Fehler');
        t.ok(r.deb[0] >= 4 && r.deb[1] >= 4 && r.sp[0] > 0 && r.sp[1] > 0, 'Host (' + r.deb[0] + ' Teile) und Client (' + r.deb[1] + ') zeigen die Explosion');
        if (P.page.errors.length) t.ok(false, 'JS-Fehler: ' + P.page.errors.slice(0, 2).join(' | '));
      } finally { await P.done(); }
    },
  },
];
