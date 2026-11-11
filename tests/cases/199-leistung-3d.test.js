// 3D-9 (Ticket 158): Rueckfall und Leistung der 3D-Ansicht. Kein Pixelvergleich, Zustaende ueber den Debug-Hook (__dbg.view3d.reg, hud, info).
// Selbstregelung (V3REG in index.html): gleitende Bildzeit aus dem Abstand der Bilder, 10 s ueber der Grenze schaltet eine Stufe zurueck (Schatten aus, Aufloesung kleiner, Teilchen halbiert, 2D mit einmaligem Hinweis),
// hoch nur ueber die Optionen. Kontextverlust und Auto-Modus. HUD-Marken mit Weltbezug (Beute-Text, E-Anzeige, Lehnen) in 3D an der Weltstelle (Rundlauf ueber toScr und pick).
// Die anderen Tests laufen auf fester Stufe (window.__holdupV3Fix aus tests/lib.js), dieser schaltet die Regelung selbst ein (reg.fix = false).
const lib = require('../lib');

async function glPage(t, opts) {
  const env = await lib.launch({ webgl: true });
  const page = await lib.openGame(env, opts);
  if (await page.evaluate(() => !!document.createElement('canvas').getContext('webgl2'))) return { page, env, done: async () => { await page.ctx.close().catch(() => {}); await env.browser.close().catch(() => {}); env.srv.close(); } };
  await env.browser.close().catch(() => {}); env.srv.close();
  t.note('kein WebGL 2 im Test-Chromium (auch nicht mit SwiftShader-Flags), 3D-Teil uebersprungen');
  return null;
}
// 3D ueber die Optionen (nicht ueber den Debug-Wunsch, sonst regelt nichts), Spiel im Bild, Regelung an und von Hand gefuettert
const OPT3D = `window.OPT3D = async (mode) => { const D = __dbg; V3OPT.setMode(mode || '3d'); await D.view3d.set(null); D.reset(); D.setFocus(true); for (let i = 0; i < 5; i++) D.update(1 / 30); D.draw(); await D.view3d.ready(); D.draw();
  const R = D.view3d.reg; R.manual = true; R.fix = false; R.reset(); return D.view3d.info(); };`;

module.exports = [
  {
    name: '3D-9 Selbstregelung: gedrosselter Takt schaltet stufenweise zurueck (Schatten, Aufloesung, Teilchen, 2D), bleibt in 2D, Hinweis nur einmal, hoch nur ueber die Optionen',
    timeout: 240000,
    async run(t) {
      const P = await glPage(t); if (!P) return;
      try {
        const page = P.page; await page.evaluate(OPT3D);
        const r = await page.evaluate(async () => {
          const D = __dbg, R = D.view3d.reg, o = { st: [] };
          while (V3OPT.shadow !== 'an') V3OPT.cycleShadow();
          const i0 = await OPT3D('3d'); o.i0 = [i0.state, i0.q, i0.size, i0.lod, i0.light && i0.light.shadow.on];
          const snap = () => { D.ptClear(); D.ptFill(40); D.draw(); const i = D.view3d.info(); o.st.push({ lv: R.lv, state: i.state, q: i.q, size: i.size, sh: i.light ? i.light.shadow.on : null, skip: i.fx ? i.fx.skip : null, msg: D.view3d.msg, on: R.on }); };
          snap();
          R.feed(16, 600); o.fast = R.lv;                       // 10 s mit 60 Bildern je Sekunde: nichts
          R.feed(60, 150); o.at9 = R.lv;                        // 9 s mit 60 ms: noch nichts (gleitender Mittelwert braucht etwas Anlauf)
          R.feed(60, 30); snap();                               // ueber 10 s: Stufe 1, Schatten aus
          R.feed(60, 170); snap();                              // Stufe 2, Aufloesung kleiner
          R.feed(60, 170); snap();                              // Stufe 3, Teilchen halbiert
          R.feed(60, 170); snap();                              // Stufe 4: 2D
          o.log = R.log; o.err = V3OPT.err; o.msg1 = D.view3d.msg;
          R.manual = true; R.feed(10, 3000); for (let i = 0; i < 10; i++) { D.update(1 / 30); D.draw(); }
          o.stay = [D.view3d.state, R.lv, !!document.getElementById('c3d')];
          o.mid = document.getElementById('c').getContext('2d').getImageData(960, 500, 1, 1).data[3];
          return o;
        });
        t.eq(r.i0.slice(0, 4), ['an', 1, [960, 544], 0], '3D ueber die Optionen an, volle Stufe (Grafik niedrig)');
        t.eq(r.i0[4], 1, 'Schatten an (Regler an)');
        t.eq([r.fast, r.at9], [0, 0], 'schneller Takt und 9 s langsamer Takt schalten nicht');
        const s = r.st;
        t.eq(s.map(q => q.lv), [0, 1, 2, 3, 4], 'Stufen nacheinander je 10 s');
        t.eq([s[0].sh, s[1].sh], [1, 0], 'Stufe 1: Schatten aus');
        t.eq([s[1].q, s[2].q, s[2].size], [1, .75, [720, 408]], 'Stufe 2: Renderaufloesung mal 0,75');
        t.eq([s[2].skip, s[3].skip], [0, 20], 'Stufe 3: jedes zweite Teilchen faellt weg');
        t.eq(s[4].state, 'rueckfall', 'Stufe 4: Rueckfall auf 2D');
        t.ok(/zu langsam/.test(r.err) && /weiter in 2D/.test(r.msg1 || ''), 'Grund in der Kachel und Hinweis im Bild: ' + r.err + ' / ' + r.msg1);
        t.eq(r.log, [1, 2, 3, 4], 'Protokoll der Stufen');
        t.eq(r.stay, ['rueckfall', 4, false], 'bleibt in 2D, auch bei schnellem Takt, ohne neuen Ladeversuch');
        t.eq(r.mid, 255, 'das Spiel zeichnet in 2D weiter');
        // Optionen: A schaltet die Ansicht durch (3D, 2D, Auto, 3D), die Regelung beginnt von vorn
        await page.focus('#c'); await page.keyboard.press('Escape'); await page.keyboard.press('o');
        for (let k = 0; k < 3; k++) await page.keyboard.press('a');
        const b = await page.evaluate(async () => { const D = __dbg; await new Promise(r => setTimeout(r, 50)); await D.view3d.ready(); const st = D.state(); return [V3OPT.mode, D.view3d.state, D.view3d.reg.lv, V3OPT.lod, V3OPT.err, st.scr]; });
        t.eq(b.slice(0, 5), ['3d', 'an', 0, 0, ''], 'ueber die Optionen wieder 3D, Stufe 0: ' + JSON.stringify(b));
        await page.keyboard.press('Escape'); await page.keyboard.press('Escape');
        t.eq(await page.evaluate(() => __dbg.state().paused), false, 'Optionen zu, Spiel laeuft');
        // zweiter Rueckfall in derselben Sitzung: ohne neuen Hinweis
        const c = await page.evaluate(async () => { const D = __dbg, R = D.view3d.reg; D.view3d.reset(); D.reset(); D.setFocus(true); D.draw(); await D.view3d.ready(); D.draw(); R.manual = true; R.fix = false; const st0 = D.view3d.state, m0 = D.view3d.msg;
          R.feed(60, 900); D.draw(); return [st0, m0, D.view3d.state, D.view3d.msg, R.noted, V3OPT.err]; });
        t.eq(c.slice(0, 5), ['an', undefined, 'rueckfall', undefined, true], 'zweiter Rueckfall still (Hinweis nur einmal je Sitzung): ' + JSON.stringify(c));
        t.ok(/zu langsam/.test(c[5]), 'Grund steht trotzdem in der Kachel');
        await page.evaluate(() => { localStorage.removeItem('holdup.schatten'); localStorage.removeItem('holdup.ansicht'); });
        t.eq(page.errors, [], 'keine JS-Fehler');
      } finally { await P.done(); }
    },
  },
  {
    name: '3D-9 Selbstregelung mit der echten Spielschleife: gedrosseltes requestAnimationFrame (60 ms) faellt bis 2D, ungedrosselt mit hoher Grenze nicht, Debug-Wunsch regelt nie',
    timeout: 240000,
    async run(t) {
      const P = await glPage(t); if (!P) return;
      try {
        const page = P.page; await page.evaluate(OPT3D);
        const r = await page.evaluate(async () => {
          const D = __dbg, R = D.view3d.reg, C = R.cfg, c0 = { hold: C.hold, lim: C.lim }, o = {}, wait = ms => new Promise(r => setTimeout(r, ms));
          await OPT3D('3d'); R.manual = false; C.hold = 1;
          C.lim = 1e4; await wait(2500); o.free = [D.view3d.state, R.lv, R.n || 0];
          const raf = window.requestAnimationFrame; window.requestAnimationFrame = cb => setTimeout(() => cb(performance.now()), 60);
          C.lim = 25; const t0 = performance.now(); while (D.view3d.state !== 'rueckfall' && performance.now() - t0 < 30000) await wait(100);
          o.slow = [D.view3d.state, R.log, Math.round(R.avg), Math.round((performance.now() - t0) / 100) / 10];
          // Debug-Wunsch (__dbg.view3d.set(true), wie alle anderen Tests und die Bildzeit-Messung): feste Stufe
          await D.view3d.set(true); R.reset(); D.draw(); await wait(3000); o.dbg = [D.view3d.state, R.lv, R.on];
          window.requestAnimationFrame = raf; C.hold = c0.hold; C.lim = c0.lim; D.view3d.reset(); return o;
        });
        t.eq(r.free.slice(0, 2), ['an', 0], 'mit hoher Grenze kein Zurueckschalten: ' + JSON.stringify(r.free));
        t.eq(r.slow[0], 'rueckfall', 'gedrosselt bis 2D: ' + JSON.stringify(r.slow));
        t.eq(r.slow[1].slice(-1), [4], 'letzte Stufe 2D, Stufen ' + JSON.stringify(r.slow[1]));
        t.ok(r.slow[2] >= 50, 'gleitende Bildzeit aus dem Abstand der Bilder (mindestens 60 ms je Bild): ' + r.slow[2]);
        t.eq(r.dbg, ['an', 0, false], 'Debug-Wunsch: keine Regelung');
        t.eq(page.errors, [], 'keine JS-Fehler');
      } finally { await P.done(); }
    },
  },
  {
    name: '3D-9 Kontextverlust (webglcontextlost) fuehrt zu 2D mit Meldung, ohne Fehler, das Spiel laeuft weiter',
    timeout: 180000,
    async run(t) {
      const P = await glPage(t); if (!P) return;
      try {
        const page = P.page;
        const r = await page.evaluate(async () => {
          const D = __dbg; const i0 = await D.view3d.set(true); D.reset(); D.setFocus(true); D.draw();
          const gl = document.getElementById('c3d').getContext('webgl2'), ext = gl && gl.getExtension('WEBGL_lose_context');
          if (!ext) return { i0: i0.state, ext: false };
          ext.loseContext(); await new Promise(r => setTimeout(r, 100));
          for (let i = 0; i < 30; i++) { D.update(1 / 30); D.draw(); }
          const c = document.getElementById('c');
          return { i0: i0.state, ext: true, st: D.view3d.state, err: D.view3d.err, msg: D.view3d.msg, opt: V3OPT.err, el: !!document.getElementById('c3d'), mid: c.getContext('2d').getImageData(960, 500, 1, 1).data[3], bg: getComputedStyle(c).backgroundColor };
        });
        t.eq(r.i0, 'an', '3D an');
        if (!r.ext) { t.note('WEBGL_lose_context fehlt, uebersprungen'); return; }
        t.eq(r.st, 'rueckfall', 'Zustand nach dem Kontextverlust');
        t.ok(/Kontext verloren/.test(r.err) && /weiter in 2D/.test(r.msg || '') && r.opt === r.err, 'Meldung nennt den Grund: ' + r.msg);
        t.ok(!r.el && r.mid === 255 && r.bg !== 'rgba(0, 0, 0, 0)', 'Leinwand weg, 2D zeichnet: ' + JSON.stringify(r));
        t.eq(page.errors, [], 'keine JS-Fehler');
      } finally { await P.done(); }
    },
  },
  {
    name: '3D-9 Auto: waehlt 3D mit WebGL 2 und bestandener Probe, faellt still auf 2D bei zu langsamer Probe und ohne WebGL 2',
    timeout: 240000,
    async run(t) {
      // ohne WebGL 2 (immer, auch ohne GPU): Auto aus dem Speicher, still 2D
      {
        const ctx = await t.env.browser.newContext({ viewport: { width: 1000, height: 640 } });
        await ctx.addInitScript(() => { window.WebGL2RenderingContext = undefined; window.WebGLRenderingContext = undefined; localStorage.setItem('holdup.ansicht', 'auto'); });
        const page = await ctx.newPage(), errs = []; page.on('pageerror', e => errs.push(String(e)));
        await page.goto(t.env.url + '/index.html#debug');
        await page.waitForFunction(() => window.__dbg && __dbg.get && __dbg.get().players, null, { timeout: 30000 });
        const r = await page.evaluate(async () => { const D = __dbg; D.setFocus(true); D.reset(); D.draw(); await D.view3d.ready(); for (let i = 0; i < 10; i++) D.update(1 / 30); D.draw(); const c = document.getElementById('c');
          return { mode: V3OPT.mode, st: D.view3d.state, err: D.view3d.err, msg: D.view3d.msg, mid: c.getContext('2d').getImageData(960, 500, 1, 1).data[3], res: performance.getEntriesByType('resource').map(e => e.name).filter(n => /view3d|three/.test(n)) }; });
        await ctx.close();
        t.eq([r.mode, r.st], ['auto', 'rueckfall'], 'ohne WebGL 2: Auto bleibt 2D');
        t.ok(/WebGL/.test(r.err) && !r.msg, 'Grund in der Kachel, keine Meldung im Bild: ' + JSON.stringify([r.err, r.msg]));
        t.eq([r.mid, r.res], [255, []], '2D zeichnet, kein Ladeversuch');
        t.eq(errs, [], 'keine JS-Fehler');
      }
      const P = await glPage(t); if (!P) return;
      try {
        const page = P.page; await page.evaluate(OPT3D);
        const r = await page.evaluate(async () => {
          const D = __dbg, R = D.view3d.reg, o = {};
          const i = await OPT3D('auto'); o.on = [V3OPT.mode, i.state, !!i.shown];
          R.feed(16, 250); D.draw(); o.fast = [D.view3d.state, R.probed, R.lv];
          await OPT3D('auto'); o.r2 = D.view3d.state; R.feed(60, 70); o.slow = [D.view3d.state, R.probed, D.view3d.err, D.view3d.msg, R.log];
          D.draw(); o.mid = document.getElementById('c').getContext('2d').getImageData(960, 500, 1, 1).data[3];
          V3OPT.setMode('2d'); D.view3d.reset(); return o;
        });
        t.eq(r.on, ['auto', 'an', true], 'Auto mit WebGL 2: 3D');
        t.eq(r.fast, ['an', true, 0], 'Probe mit 16 ms je Bild bestanden, 3D bleibt');
        t.eq(r.r2, 'an', 'neu geladen fuer die zweite Probe');
        t.eq(r.slow.slice(0, 2), ['rueckfall', true], 'Probe mit 60 ms je Bild: Auto faellt auf 2D');
        t.ok(/Auto: zu langsam/.test(r.slow[2]) && !r.slow[3], 'still (nur Grund in der Kachel): ' + JSON.stringify(r.slow));
        t.eq(r.slow[4], ['probe'], 'die Probe entscheidet, keine Stufenleiter');
        t.eq(r.mid, 255, '2D zeichnet');
        t.eq(page.errors, [], 'keine JS-Fehler');
      } finally { await P.done(); }
    },
  },
  {
    name: '3D-9 HUD-Marken mit Weltbezug in 3D an der Weltstelle: Beute-Text ueber dem Kopf, E-Anzeige am Ziel, Lehnen-Markierung (Rundlauf toScr/pick, Pixel dort statt an der 2D-Stelle)',
    timeout: 180000,
    async run(t) {
      const P = await glPage(t); if (!P) return;
      try {
        const page = P.page;
        const r = await page.evaluate(async () => {
          const D = __dbg; await D.view3d.set(true); D.reset(); D.setFocus(true); for (let i = 0; i < 5; i++) D.update(1 / 30); D.draw();
          const V = D.view3d.V, c = document.getElementById('c'), cx = c.getContext('2d'), o = {};
          const rt = q => { const p = V.pick(q.s[0], q.s[1], q.w[2]), s = V.toScr(q.w[0], q.w[1], q.w[2]); return [Math.hypot(p[0] - q.w[0], p[1] - q.w[1]), Math.hypot(s[0] - q.s[0], s[1] - q.s[1])]; };
          const ink = (x, y, w, h, f) => { const d = cx.getImageData(Math.round(x * 2), Math.round(y * 2), Math.round(w * 2), Math.round(h * 2)).data; let n = 0; for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 200 && f(d[i], d[i + 1], d[i + 2])) n++; return n; };
          const green = (r, g, b) => g > 180 && r < 170 && b < 120;
          // E-Anzeige: Spieler neben dem Zettel (note), Ziel gewaehlt
          const g0 = D.get(), me = g0.me, nt = g0.its.find(i => i.t === 'note'); me.x = nt.x; me.y = nt.y + 24; me.vx = me.vy = 0; D.update(1 / 30); D.draw();
          const tg = D.view3d.hud().find(q => q.k === 'tg'); o.tg = tg ? { w: tg.w, rt: rt(tg), it: [nt.x, nt.y] } : null;
          // Beute-Text am Spieler (mitten im Bild, nicht unter den HUD-Feldern)
          me.x = 600; me.y = 300; for (let i = 0; i < 40; i++) D.update(1 / 30); D.evt('fx', [me.x, me.y - 16, '+$999', 1.2]); D.draw();
          const fx = D.view3d.hud().find(q => q.k === 'fx'), cam = D.cam();
          o.fx = fx ? { w: fx.w, rt: rt(fx), at3: ink(fx.s[0] - 26, fx.s[1] - 13, 70, 17, green), at2: ink(me.x - 24 - cam[0] - 2, me.y - 16 - cam[1] - 13, 70, 17, green), d: Math.hypot(fx.s[0] - (me.x - cam[0]), fx.s[1] - (me.y - 16 - cam[1])) } : null;
          // Lehnen: Ueberfall, Barrikade oestlich, Spieler zielt hin und haelt F (ln)
          D.startHeist(false, me); const W = D.world(); me.x = 880; me.y = 300; me.a = 0; me.armed = true; const tx = Math.floor(me.x / 32) + 1, ty = Math.floor(me.y / 32);
          o.c0 = W.cell(tx, ty); W.setc(tx, ty, 'X'); me.ln = 1; D.draw();
          const H = D.view3d.hud(), ln = H.find(q => q.k === 'lean'), li = H.find(q => q.k === 'line');
          o.lean = ln ? { w: ln.w, rt: rt(ln), cell: [Math.floor(ln.w[0] / 32), Math.floor(ln.w[1] / 32)], want: [tx, ty], top: ln.w[2], ink: ink(ln.s[0] - 20, ln.s[1] - 20, 40, 40, (r, g, b) => g > 150 && r < 200) } : null;
          o.line = li ? { rt: rt(li), h: li.w[2], aimH: V.cfg.aimH } : null;
          me.ln = 0; D.draw(); o.noLean = D.view3d.hud().filter(q => q.k === 'lean').length;
          W.setc(tx, ty, o.c0); D.view3d.reset(); return o;
        });
        t.ok(r.tg, 'E-Anzeige am Ziel in 3D: ' + JSON.stringify(r.tg));
        if (r.tg) { t.eq(r.tg.w.slice(0, 2), r.tg.it, 'an der Stelle des Ziels'); t.ok(r.tg.w[2] > 0, 'auf dem Deckel des Moebels: ' + r.tg.w[2]); t.ok(r.tg.rt[0] < 1 && r.tg.rt[1] < .01, 'Rundlauf pick(toScr) unter 1 px: ' + r.tg.rt); }
        t.ok(r.fx, 'Beute-Text in 3D gezeichnet');
        if (r.fx) {
          t.ok(r.fx.rt[0] < 1 && r.fx.rt[1] < .01, 'Beute-Text: Rundlauf pick(toScr) in Kopfhoehe unter 1 px: ' + r.fx.rt + ', Hoehe ' + r.fx.w[2]);
          t.ok(r.fx.d > 10, '3D-Stelle weicht von der 2D-Stelle ab: ' + r.fx.d.toFixed(1));
          t.ok(r.fx.at3 > 30 && r.fx.at3 > r.fx.at2 * 2, 'gruene Schrift an der 3D-Stelle, nicht an der 2D-Stelle: ' + r.fx.at3 + ' / ' + r.fx.at2);
        }
        t.ok(r.c0 === '.' || r.c0 === 'o', 'freie Kachel fuer die Barrikade: ' + r.c0);
        t.ok(r.lean, 'Lehnen-Markierung in 3D');
        if (r.lean) { t.eq(r.lean.cell, r.lean.want, 'Rahmen auf der Barrikade'); t.ok(r.lean.top > 0, 'auf ihrem Deckel: ' + r.lean.top); t.ok(r.lean.rt[0] < 1, 'Rundlauf unter 1 px: ' + r.lean.rt); t.ok(r.lean.ink > 10, 'Rahmen gezeichnet: ' + r.lean.ink); }
        t.ok(r.line && r.line.h === r.line.aimH && r.line.rt[0] < 1, 'Schusslinie in Waffenhoehe: ' + JSON.stringify(r.line));
        t.eq(r.noLean, 0, 'ohne Lehnen keine Markierung');
        t.eq(page.errors, [], 'keine JS-Fehler');
      } finally { await P.done(); }
    },
  },
  {
    name: '3D-9 Zustandshash nach 600 Schritten gleich ohne 3D und mit 3D auf der letzten Stufe vor 2D (Teilchen halbiert, kleine Aufloesung, ohne Schatten)',
    timeout: 240000,
    async run(t) {
      const P = await glPage(t); if (!P) return;
      try {
        const page = P.page; await lib.loadInpage(page, 'bild.js');
        const r = await page.evaluate(async () => {
          const D = __dbg, R0 = Math.random, mb = a => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let q = Math.imul(a ^ a >>> 15, 1 | a); q = q + Math.imul(q ^ q >>> 7, 61 | q) ^ q; return ((q ^ q >>> 14) >>> 0) / 4294967296; };
          async function run(on) {
            await D.view3d.set(on); D.view3d.reg.lv = on ? 3 : 0; PX.scene('bank', 5); PX.phase('ueberfall'); PX.phase('polizei'); const rs = mb(42), rd = mb(7); Math.random = rs; D.setFocus(true);
            const V = D.view3d.V; if (on && V) V.pick = (sx, sy) => [sx + D.cam()[0], sy + D.cam()[1]];
            const K = D.keys, M = D.mouse; M.sx = 640; M.sy = 200;
            for (let i = 0; i < 600; i++) {
              for (const k of 'wasd') delete K[k]; K[['d', 'w', 'a', 's'][Math.floor(i / 50) % 4]] = 1; M.down = i % 20 < 8;
              if (i === 200) { const m = D.get().me; D.evt('bx', [m.x + 90, m.y - 60, 90, 1]); }
              const m = D.get().me; if (m) { m.hp = 100; if (m.mag <= 0) m.mag = 12; }
              D.update(1 / 30); if (i % 5 === 4) { Math.random = rd; D.draw(); Math.random = rs; }
            }
            Math.random = R0; for (const k of 'wasd') delete K[k]; M.down = false;
            const g = D.get(), s = JSON.stringify({ t: g.time, ph: g.phase, me: g.me ? [g.me.x, g.me.y, g.me.a, g.me.hp, g.me.mag] : 0, en: g.en.map(e => [e.x, e.y, e.hp]), npc: g.npcs.map(n => [n.x, n.y, n.st]), pt: D.ptN(), its: g.its.map(o => [o.t, !!o.done, o.pr]), M: D.world().M.join('') });
            let h = 0; for (let i = 0; i < s.length; i++) h = Math.imul(h, 31) + s.charCodeAt(i) | 0;
            const i = on ? D.view3d.info() : {}; return { h, ph: g.phase, fr: i.frames || 0, errs: i.errs || 0, lod: i.lod, q: i.q, skip: i.fx ? i.fx.skip : 0 };
          }
          const o = { off: await run(false), on: await run(true), off2: await run(false) }; D.view3d.reg.lv = 0; D.view3d.reset(); return o;
        });
        t.eq(r.off.h, r.off2.h, 'ohne 3D zweimal gleich');
        t.ok(r.on.fr >= 100 && r.on.errs === 0 && r.on.lod === 3 && r.on.q === .75, '3D hat auf Stufe 3 gezeichnet: ' + JSON.stringify(r.on));
        t.eq(r.on.h, r.off.h, 'Zustandshash gleich mit und ohne 3D (Phase ' + r.off.ph + ')');
        t.eq(page.errors, [], 'keine JS-Fehler');
      } finally { await P.done(); }
    },
  },
];
