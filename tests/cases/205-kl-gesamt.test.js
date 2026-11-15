// Klotzchen-Abnahme (Ticket 198, Integrationspruefung fuer den Coop-Test): alle acht Szenarien mit Kloetzchen durch alle Phasen (Erkundung, Ueberfall, Polizei, Flucht)
// ohne Fehler, mit draw() und unter der Dreiecks- und Draw-Call-Grenze; Coop (Test-Leitung) mit Explosion und Zerfall, Client ohne Fehler und mit Teilen; Rueckfall auf den klassischen Stil und ohne WebGL.
// Ohne WebGL 2 im Test-Chromium wird der 3D-Teil uebersprungen (wie Test 190 und 200).
const lib = require('../lib');
const SCS = ['bank', 'truck', 'jewel', 'gas', 'museum', 'casino', 'nb', 'prison'];
const TRIS = 150000, CALLS = 120;
async function glPage(t) {
  const ok = p => p.evaluate(() => !!document.createElement('canvas').getContext('webgl2'));
  if (await ok(t.page)) return { page: t.page, done: async () => {} };
  const env = await lib.launch({ webgl: true }), page = await lib.openGame(env);
  if (await ok(page)) return { page, done: async () => { await page.ctx.close().catch(() => {}); await env.browser.close().catch(() => {}); env.srv.close(); } };
  await env.browser.close().catch(() => {}); env.srv.close(); t.note('kein WebGL 2, 3D-Teil uebersprungen'); return null;
}
module.exports = [
  {
    name: 'Kloetzchen gesamt: alle acht Szenarien durch Erkundung, Ueberfall, Polizei und Flucht ohne Fehler, draw() laeuft, Dreiecke und Draw Calls unter der Grenze',
    timeout: 900000,
    async run(t) {
      const P = await glPage(t); if (!P) return;
      try {
        await lib.loadInpage(P.page, 'bild.js');
        await P.page.evaluate(async () => { __dbg.view3d.kstil = 1; await __dbg.view3d.set(true); });
        const rows = [];
        for (const sc of SCS) {
          const r = await P.page.evaluate(async (sc) => {
            const D = __dbg, o = {}, shot = ph => { D.draw(); D.draw(); const V = D.view3d.V, i = V.info(); o[ph] = { err: i.err, on: !!(i.k && i.k.on), figsK: i.k ? i.k.figsK : -1, carsK: i.k ? i.k.carsK : -1, tris: i.tris, calls: i.calls, parts: i.k ? i.k.parts : 0 } };
            PX.scene(sc, 5);
            for (const ph of ['erkundung', 'ueberfall', 'polizei']) { PX.phase(ph); shot(ph); }
            // Flucht: Fluchtwagen rufen und weiterspielen (der Spieler bleibt unverwundbar), Notenbank und Gefaengnis ohne Fluchtwagen laufen einfach weiter
            try { D.callVan(); } catch (e) { o.vanErr = String(e) }
            for (let i = 0; i < 300; i++) { const m = D.get().me; if (m && m.hp < 100) m.hp = 100; D.update(1 / 30) } shot('flucht');
            return o;
          }, sc);
          rows.push([sc, r]);
          for (const ph of ['erkundung', 'ueberfall', 'polizei', 'flucht']) {
            const q = r[ph];
            t.ok(q.err === '' && q.on, sc + ' ' + ph + ': keine Fehler in der Ansicht, Klotzchen an: ' + JSON.stringify(q));
            t.ok(q.tris < TRIS && q.calls < CALLS, sc + ' ' + ph + ': Dreiecke ' + q.tris + ' unter ' + TRIS + ', Draw Calls ' + q.calls + ' unter ' + CALLS);
            t.ok(q.figsK >= 1, sc + ' ' + ph + ': Figuren aus Teilen (mindestens der Spieler): ' + q.figsK);
          }
        }
        t.note(rows.map(([sc, r]) => sc + ' ' + ['erkundung', 'ueberfall', 'polizei', 'flucht'].map(p => r[p].tris + '/' + r[p].calls + '/' + r[p].figsK + '/' + r[p].carsK).join(' ')).join(' | '));
        await P.page.evaluate(async () => { await __dbg.view3d.set(false) });
        if (P.page.errors.length) t.ok(false, 'JS-Fehler: ' + P.page.errors.slice(0, 3).join(' | '));
      } finally { await P.done(); }
    },
  },
  {
    name: 'Kloetzchen-Coop gesamt: Host und Client in 3D mit Kloetzchen, Ueberfall mit Autoexplosion und Polizisten-Zerfall, Client ohne Fehler und mit Teilen, gleiche Wracks',
    timeout: 400000,
    async run(t) {
      const P = await glPage(t); if (!P) return;
      try {
        await lib.loadTool(P.page, 'loopnet.js'); await lib.loadInpage(P.page, 'coop.js');
        const r = await P.page.evaluate(`(async () => {
          const G = CT.mkGame('bank', 321, 2), A = G.A, B = G.clients[0]; A.CFG.policeAt = 1e6; A.CFG.policeForced = 1e6;
          const run = n => { for (let i = 0; i < n; i++) step(G.insts, G.net, 1 / 60); };
          for (const d of [A, B]) { d.view3d.kstil = 1; await d.view3d.set(true); }
          A.startHeist(); run(120); for (const d of [A, B]) { d.draw(); d.draw(); }
          const o = { phase: [A.get().phase, B.get().phase] }; const car = A.get().cars.find(c => c.civ && !c.dead); o.car = !!car;
          // ein Polizist neben dem Spieler, der faellt
          const g = A.get(), me = g.me, cop = A.mkCop(me.x + 60, me.y, false); cop.hp = 1e5; cop.mhp = 1e5; cop.cool = 99; g.en.push(cop);
          run(30); for (const d of [A, B]) { d.draw(); d.draw() } o.figs = [A, B].map(d => d.view3d.V.info().k.figsK);
          A.get().me.hp = 1e9; if (car) A.carBlow(car, 0); const cc = A.get().en.find(e => e.id === cop.id); if (cc) cc.hp = 0;
          let deb = [0, 0], parts = [0, 0];
          for (let i = 0; i < 90; i++) { run(1); if (i % 2) for (const d of [A, B]) d.draw(); const k = [A, B].map(d => d.view3d.V.info().k); deb = deb.map((v, j) => Math.max(v, k[j].deb)); parts = parts.map((v, j) => Math.max(v, k[j].parts)) }
          const kk = [A, B].map(d => d.view3d.V.info()); o.deb = deb; o.parts = parts; o.wreck = kk.map(i => i.ck && i.ck.wreck || 0); o.err = kk.map(i => i.err); o.on = kk.map(i => i.k.on); o.tris = kk.map(i => i.tris);
          for (const d of [A, B]) await d.view3d.set(false); for (const d of G.insts) { try { d.leaveGame(); } catch (e) {} } return o; })()`);
        t.note(JSON.stringify(r));
        t.ok(r.err.every(e => e === '') && r.on.every(Boolean), 'beide Ansichten im Kloetzchen-Stil ohne Fehler');
        t.ok(r.figs[1] >= 2, 'der Client zeichnet Figuren aus Teilen (Spieler und Polizist): ' + r.figs);
        t.ok(r.parts[1] > 100, 'Teile beim Client vorhanden: ' + r.parts);
        if (r.car) { t.ok(r.wreck[0] > 0 && r.wreck[1] > 0, 'das Wrack steht bei Host und Client: ' + r.wreck); t.ok(r.deb[0] > 10 && r.deb[1] > 10, 'Zerfall mit Teilen bei Host (' + r.deb[0] + ') und Client (' + r.deb[1] + ')') }
        else t.note('kein ziviles Auto auf der Karte, Explosion uebersprungen');
        t.ok(r.tris.every(v => v < TRIS), 'Dreiecke unter der Grenze: ' + r.tris);
        if (P.page.errors.length) t.ok(false, 'JS-Fehler: ' + P.page.errors.slice(0, 2).join(' | '));
      } finally { await P.done(); }
    },
  },
  {
    name: 'Kloetzchen-Rueckfall: der gemerkte Stil klassisch (F7, #klassisch) zeichnet die Low-Poly-Figuren, ohne Schalter ist Kloetzchen Standard, ohne WebGL laeuft das Spiel in 2D weiter',
    timeout: 300000,
    async run(t) {
      const env = await lib.launch({ webgl: true });
      try {
        const open = async (hash, nogl, stil) => {
          const ctx = await env.browser.newContext({ viewport: { width: 1000, height: 640 } });
          await ctx.addInitScript(() => { delete window.__holdupKl; });
          if (stil) await ctx.addInitScript(v => { try { localStorage.setItem('holdup.stil', v) } catch (e) {} }, stil);
          if (nogl) await ctx.addInitScript(() => { window.WebGL2RenderingContext = undefined; window.WebGLRenderingContext = undefined; });
          const page = await ctx.newPage(); page.errors = []; page.on('pageerror', e => page.errors.push(String(e && e.stack || e)));
          await page.goto(env.url + '/index.html' + hash); await page.waitForFunction(() => window.__dbg && __dbg.get && __dbg.get().players, null, { timeout: 30000 });
          await page.evaluate(() => { __dbg.setFocus(true) }); return { page, ctx };
        };
        const run = p => p.evaluate(async () => { const D = __dbg; D.reset(); D.startHeist(false, D.get().me); await D.view3d.ready(); for (let i = 0; i < 120; i++) { D.get().me.hp = 100; D.update(1 / 30) } D.draw(); D.draw(); const i = D.view3d.info ? D.view3d.info() : {}, V = D.view3d.V, vi = V && V.info ? V.info() : null; return { st: D.view3d.state, kl: V3OPT.kloetz, figParts: vi && vi.figParts, figsK: vi && vi.k ? vi.k.figsK : -1, err: vi ? vi.err : '', el: !!document.getElementById('c3d') }; });
        let gl = true;
        { const a = await open('#debug&3d', false, 'klassisch'); gl = await a.page.evaluate(() => !!document.createElement('canvas').getContext('webgl2')); if (!gl) t.note('kein WebGL 2, Teil 1 und 2 uebersprungen'); else { const r = await run(a.page); t.note('klassisch ' + JSON.stringify(r)); t.ok(r.kl === 0 && r.figsK <= 0 && r.figParts > 0 && r.err === '', 'Stil klassisch (holdup.stil, wie F7 und #klassisch): Low-Poly-Figuren, keine Kloetzchen: ' + JSON.stringify(r)); t.eq(a.page.errors, [], 'Stil klassisch (holdup.stil, wie F7 und #klassisch): keine JS-Fehler') } await a.ctx.close(); }
        if (gl) { const b = await open('#debug&3d'); const r = await run(b.page); t.note('standard ' + JSON.stringify(r)); t.ok(r.kl === 1 && r.figsK > 0 && r.figParts === 0 && r.err === '', 'ohne Schalter: Kloetzchen sind Standard: ' + JSON.stringify(r)); t.eq(b.page.errors, [], 'Standard: keine JS-Fehler'); await b.ctx.close(); }
        { const c = await open('#debug&3d', true); const r = await c.page.evaluate(async () => { const D = __dbg; D.reset(); D.startHeist(false, D.get().me); D.draw(); await D.view3d.ready(); for (let i = 0; i < 120; i++) { D.get().me.hp = 100; D.update(1 / 30) } D.draw(); const cv = document.getElementById('c'); return { st: D.view3d.state, el: !!document.getElementById('c3d'), mid: cv.getContext('2d').getImageData(480, 270, 1, 1).data[3], phase: D.get().phase } });
          t.note('ohne WebGL ' + JSON.stringify(r)); t.ok(r.st === 'rueckfall' && !r.el && r.mid === 255, 'ohne WebGL: Rueckfall auf 2D, das Spiel zeichnet weiter: ' + JSON.stringify(r)); t.eq(c.page.errors, [], 'ohne WebGL: keine JS-Fehler'); await c.ctx.close(); }
      } finally { await env.browser.close().catch(() => {}); env.srv.close(); }
    },
  },
];
