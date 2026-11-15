// Klotzchen-Abnahme (Ticket 198, Integrationspruefung fuer den Coop-Test): alle acht Szenarien mit Kloetzchen durch alle Phasen (Erkundung, Ueberfall, Polizei, Flucht)
// ohne Fehler, mit draw() und unter der Dreiecks- und Draw-Call-Grenze; Coop (Test-Leitung) mit Explosion und Zerfall, Client ohne Fehler und mit Teilen; Rueckfall auf den klassischen Stil und ohne WebGL.
// Ohne WebGL 2 im Test-Chromium wird der 3D-Teil uebersprungen (wie Test 190 und 200). Die drei langen Tests sind slow (voller Lauf), Coop gesamt und Rueckfall laufen im schnellen Lauf.
const lib = require('../lib');
const SCS = ['bank', 'truck', 'jewel', 'gas', 'museum', 'casino', 'nb', 'prison'];
const TRIS = 150000, CALLS = 120, SEEDS = [5, 3];
const { glPage } = require('../glshare');   // gemeinsamer WebGL-Browser (tests/glshare.js)
module.exports = [
  {
    name: 'Kloetzchen gesamt: alle acht Szenarien durch Erkundung, Ueberfall, Polizei und Flucht ohne Fehler, draw() laeuft, Dreiecke und Draw Calls unter der Grenze',
    slow: true,   // rund 100 s und mehr in SwiftShader: nur im vollen Lauf (nachts, voller-lauf), die CI-Schnelllaeufe lassen es aus
    timeout: 900000,
    async run(t) {
      const P = await glPage(t); if (!P) return;
      try {
        await lib.loadInpage(P.page, 'bild.js');
        await P.page.evaluate(async () => { __dbg.view3d.kstil = 1; await __dbg.view3d.set(true); });
        const rows = [];
        for (const [sd, sc] of SEEDS.flatMap(sd => SCS.map(sc => [sd, sc]))) {
          const r = await P.page.evaluate(async ([sc, sd]) => {
            const D = __dbg, o = {}, shot = ph => { D.draw(); D.draw(); const V = D.view3d.V, i = V.info(); o[ph] = { err: i.err, on: !!(i.k && i.k.on), figsK: i.k ? i.k.figsK : -1, carsK: i.k ? i.k.carsK : -1, tris: i.tris, calls: i.calls, parts: i.k ? i.k.parts : 0 } };
            PX.scene(sc, sd);
            // Nacht (Lage nacht in der Karte) nur in der Erkundung, bei Seed 3 mit Abend- und Nachtlicht
            PX.phase('erkundung');
            // Spieler nahe die erste Kamera stellen: zeigt Sichtkegel und Szene mit den meisten Teilen (Casino bei Seed 3 hatte so 175.000 Dreiecke)
            { const g = D.get(), c = g.cams && g.cams[0], W = D.world(), T = 32; if (c) { let best = null; for (let r = 60; r <= 200 && !best; r += 20) for (let k = 0; k < 16 && !best; k++) { const a = k / 16 * 6.283, x = c.x + Math.cos(a) * r, y = c.y + Math.sin(a) * r; if (!W.isSol(Math.floor(x / T), Math.floor(y / T)) && D.los(x, y, c.x, c.y)) best = [x, y] } if (best) { g.me.x = best[0]; g.me.y = best[1]; for (let i = 0; i < 40; i++) { g.me.hp = 100; D.update(1 / 30) } } } }
            shot('erkundung'); const L = D.LAY(); L.mission.lg = (L.mission.lg || []).concat('nacht'); D.view3d.reset(); await D.view3d.set(true); shot('nacht');
            for (const ph of ['ueberfall', 'polizei']) { PX.phase(ph); shot(ph); }
            // Flucht: Fluchtwagen rufen und weiterspielen (der Spieler bleibt unverwundbar), Notenbank und Gefaengnis ohne Fluchtwagen laufen einfach weiter
            try { D.callVan(); } catch (e) { o.vanErr = String(e) }
            for (let i = 0; i < 300; i++) { const m = D.get().me; if (m && m.hp < 100) m.hp = 100; D.update(1 / 30) } shot('flucht');
            return o;
          }, [sc, sd]);
          const tag = sc + '#' + sd; rows.push([tag, r]);
          for (const ph of ['erkundung', 'nacht', 'ueberfall', 'polizei', 'flucht']) {
            const q = r[ph];
            t.ok(q.err === '' && q.on, tag + ' ' + ph + ': keine Fehler in der Ansicht, Klotzchen an: ' + JSON.stringify(q));
            t.ok(q.tris < TRIS && q.calls < CALLS, tag + ' ' + ph + ': Dreiecke ' + q.tris + ' unter ' + TRIS + ', Draw Calls ' + q.calls + ' unter ' + CALLS);
            t.ok(q.figsK >= 1, tag + ' ' + ph + ': Figuren aus Teilen (mindestens der Spieler): ' + q.figsK);
          }
        }
        t.note(rows.map(([sc, r]) => sc + ' ' + ['erkundung', 'nacht', 'ueberfall', 'polizei', 'flucht'].map(p => r[p].tris + '/' + r[p].calls + '/' + r[p].figsK + '/' + r[p].carsK).join(' ')).join(' | '));
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
      const P = await glPage(t); if (!P) return; const env = P.env;
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
      } finally { await P.done(); }
    },
  },
  {
    name: 'Kloetzchen Rundenwechsel: Autoexplosion, dann neuer Auftrag, dreimal hintereinander, ohne Haenger, WebGL-Fehler und Wachstum; danach laedt eine neue Seite im selben Browser zuegig (Verdacht aus Test 202)',
    slow: true,   // rund 100 s und mehr in SwiftShader: nur im vollen Lauf (nachts, voller-lauf), die CI-Schnelllaeufe lassen es aus
    timeout: 400000,
    async run(t) {
      const P = await glPage(t); if (!P) return; const env = P.env;
      try {
        const page = await lib.openGame(env, { hash: '#debug&3d' });
        if (!await page.evaluate(() => !!document.createElement('canvas').getContext('webgl2'))) { t.note('kein WebGL 2, uebersprungen'); return; }
        const r = await page.evaluate(async () => {
          const D = __dbg, out = [], T0 = performance.now(); D.view3d.kstil = 1; await D.view3d.set(true); D.draw(); await D.view3d.ready(); D.draw();
          for (let c = 0; c < 3; c++) {
            const t0 = performance.now(); D.setScenario('bank'); D.setSeedMode('random'); D.buildLay(D.layoutFor(5 + c)); D.startHeist();
            for (let i = 0; i < 90; i++) { D.get().me.hp = 100; D.update(1 / 30) } D.draw(); D.draw();
            const car = D.get().cars.find(q => q.civ && !q.dead); if (car) D.carBlow(car, 0);
            let deb = 0; for (let i = 0; i < 60; i++) { D.get().me.hp = 100; D.update(1 / 30); if (i % 3 === 0) { D.draw(); deb = Math.max(deb, (D.view3d.V.info().k || {}).deb | 0) } }
            D.startNext(); for (let i = 0; i < 30; i++) D.update(1 / 30); D.draw(); D.draw(); const i = D.view3d.V.info();
            out.push({ ms: Math.round(performance.now() - t0), deb, err: i.err, on: !!(i.k && i.k.on), tris: i.tris, objs: i.objs, lost: i.lost, car: !!car });
          }
          return { out, total: Math.round(performance.now() - T0), gl: (() => { const c = document.getElementById('c3d'); const g = c && c.getContext('webgl2'); return g ? g.isContextLost() : 'kein c3d' })() };
        });
        t.note(JSON.stringify(r));
        t.ok(r.out.every(o => o.err === '' && o.on), 'jede Runde ohne Fehler in der Ansicht');
        t.ok(r.gl === false, 'WebGL-Kontext nicht verloren: ' + r.gl);
        t.ok(r.out.every(o => o.deb > 10 || !o.car), 'Zerfall in jeder Runde: ' + r.out.map(o => o.deb));
        t.ok(r.out[2].objs <= r.out[0].objs + 40 && r.out[2].tris < r.out[0].tris * 1.6, 'kein Wachstum der Szene ueber die Runden: Objekte ' + r.out.map(o => o.objs) + ', Dreiecke ' + r.out.map(o => o.tris));
        t.eq(page.errors, [], 'keine JS-Fehler');
        // neue Seite im selben Browser: Ladezeit
        const t1 = Date.now(), p2 = await lib.openGame(env, { hash: '#debug&3d' }); const ms = Date.now() - t1;
        t.ok(ms < 20000, 'neue Seite im selben Browser nach der Explosion in ' + ms + ' ms geladen');
        await p2.ctx.close().catch(() => {});
      } finally { await P.done(); }
    },
  },
  {
    name: 'Kloetzchen-Coop Rundenwechsel: Autoexplosion, Host startet den naechsten Auftrag, der Client zeichnet weiter ohne Fehler und ohne Haenger',
    slow: true,   // rund 100 s und mehr in SwiftShader: nur im vollen Lauf (nachts, voller-lauf), die CI-Schnelllaeufe lassen es aus
    timeout: 400000,
    async run(t) {
      const P = await glPage(t); if (!P) return;
      try {
        await lib.loadTool(P.page, 'loopnet.js'); await lib.loadInpage(P.page, 'coop.js');
        const r = await P.page.evaluate(`(async () => {
          const G = CT.mkGame('bank', 321, 2), A = G.A, B = G.clients[0]; A.CFG.policeAt = 1e6; A.CFG.policeForced = 1e6;
          const run = n => { for (let i = 0; i < n; i++) step(G.insts, G.net, 1 / 60); };
          for (const d of [A, B]) { d.view3d.kstil = 1; await d.view3d.set(true); }
          const o = { rounds: [] };
          for (let c = 0; c < 2; c++) {
            const t0 = performance.now(); A.startHeist(); run(120); for (const d of [A, B]) { d.draw(); d.draw(); }
            const car = A.get().cars.find(q => q.civ && !q.dead); A.get().me.hp = 1e9; if (car) A.carBlow(car, 0);
            let deb = [0, 0]; for (let i = 0; i < 60; i++) { run(1); if (i % 3 === 0) for (const d of [A, B]) d.draw(); deb = deb.map((v, j) => Math.max(v, [A, B][j].view3d.V.info().k.deb)) }
            try { A.startNext(); } catch (e) { o.nextErr = String(e) }
            run(120); for (const d of [A, B]) { d.draw(); d.draw(); }
            const ii = [A, B].map(d => d.view3d.V.info()); o.rounds.push({ ms: Math.round(performance.now() - t0), deb, err: ii.map(i => i.err), on: ii.map(i => !!(i.k && i.k.on)), phase: [A.get().phase, B.get().phase], tris: ii.map(i => i.tris) });
          }
          for (const d of [A, B]) await d.view3d.set(false); for (const d of G.insts) { try { d.leaveGame(); } catch (e) {} } return o; })()`);
        t.note(JSON.stringify(r));
        t.ok(!r.nextErr, 'startNext ohne Fehler: ' + r.nextErr);
        t.ok(r.rounds.every(q => q.err.every(e => e === '') && q.on.every(Boolean)), 'beide Ansichten in jeder Runde ohne Fehler');
        t.ok(r.rounds.every(q => q.deb[1] > 10), 'Zerfall beim Client in jeder Runde: ' + r.rounds.map(q => q.deb));
        t.ok(r.rounds.every(q => q.ms < 60000), 'keine Haenger: ' + r.rounds.map(q => q.ms) + ' ms je Runde');
        if (P.page.errors.length) t.ok(false, 'JS-Fehler: ' + P.page.errors.slice(0, 2).join(' | '));
      } finally { await P.done(); }
    },
  },
];
