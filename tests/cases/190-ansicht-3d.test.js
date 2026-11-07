// 3D-0 (Ticket 149): Geruest der 3D-Ansicht (js/view3d.js, ES-Modul) ueber den Debug-Hook __dbg.view3d. Kein Pixelvergleich, Zustaende statt Bilder.
// Ohne WebGL 2 im Test-Chromium versucht der Test einen eigenen Browser mit den SwiftShader-Flags (tests/lib.js, launch({ webgl: true })),
// laeuft auch dort kein WebGL, ueberspringt er die 3D-Teile mit Meldung statt rot zu werden (die Rueckfall-Tests laufen immer).
const path = require('path');
const lib = require('../lib');

// Seite mit WebGL 2: die normale, sonst eine aus einem eigenen Browser mit SwiftShader-Flags. Liefert { page, done } oder null.
async function glPage(t) {
  if (await t.page.evaluate(() => { const c = document.createElement('canvas'); return !!c.getContext('webgl2'); })) return { page: t.page, done: async () => {} };
  const env = await lib.launch({ webgl: true });
  const page = await lib.openGame(env);
  if (await page.evaluate(() => { const c = document.createElement('canvas'); return !!c.getContext('webgl2'); })) return { page, done: async () => { await page.ctx.close().catch(() => {}); await env.browser.close().catch(() => {}); env.srv.close(); } };
  await env.browser.close().catch(() => {}); env.srv.close();
  t.note('kein WebGL 2 im Test-Chromium (auch nicht mit SwiftShader-Flags), 3D-Teil uebersprungen');
  return null;
}
// 3D an, Spiel zuruecksetzen, ein paar Bilder zeichnen
async function on3d(page) {
  return page.evaluate(async () => {
    const D = __dbg; const i0 = await D.view3d.set(true);
    if (i0.state !== 'an') return { i0 };
    D.reset(); for (let i = 0; i < 30; i++) { D.update(1 / 30); if (i % 10 === 9) D.draw(); }
    D.draw(); return { i0, info: D.view3d.info() };
  });
}

module.exports = [
  {
    name: '3D: ohne Schalter bleibt das Spiel 2D und laedt weder js/view3d.js noch three',
    async run(t) {
      const r = await t.page.evaluate(() => { for (let i = 0; i < 10; i++) __dbg.update(1 / 30); __dbg.draw();
        return { st: __dbg.view3d.state, on: __dbg.view3d.on, mode: V3OPT.mode, want: __dbg.view3d.info().want, el: !!document.getElementById('c3d'), res: performance.getEntriesByType('resource').map(e => e.name).filter(n => /view3d|three/.test(n)) }; });
      t.eq([r.st, r.on, r.mode, r.want, r.el], ['aus', false, '2d', false, false], 'Voreinstellung 2D, nichts geladen');
      t.eq(r.res, [], 'ohne 3D darf weder view3d.js noch three geladen werden');
    },
  },
  {
    name: '3D: an baut ohne Fehler, Boden als Flaeche, HUD auf durchsichtigem Canvas darueber, aus blendet wieder aus',
    timeout: 180000,
    async run(t) {
      const P = await glPage(t); if (!P) return;
      try {
        const page = P.page, r = await on3d(page);
        t.eq(r.i0.state, 'an', '3D an: ' + JSON.stringify(r.i0));
        if (!r.info) return;
        const i = r.info; t.note('WebGL: ' + i.gl + ', ' + i.gpu + '; ' + i.calls + ' Aufrufe, ' + i.tris + ' Dreiecke, ' + i.ms.toFixed(1) + ' ms je Bild (Software, nur relativ)');
        t.ok(i.on && i.shown && i.ground && i.frames >= 3 && i.errs === 0, 'Ansicht zeichnet ohne Fehler: ' + JSON.stringify(i));
        t.ok(i.calls >= 1 && i.tris >= 2 && i.tris < 150000, 'Boden als Flaeche (Dreiecke im Budget): ' + i.tris);
        const q = await page.evaluate(() => GFX.lv > 0 ? 2 : 1);
        t.eq(i.size, [960 * q, 544 * q], 'Renderaufloesung folgt der Grafikstufe (niedrig 960x544, sonst wie das 2D-Canvas)');
        const d = await page.evaluate(() => {
          const D = __dbg, V = D.view3d.V, pr = V.probe(), c = document.getElementById('c'), e = document.getElementById('c3d'), a = c.getBoundingClientRect(), b = e.getBoundingClientRect();
          const q = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let op = 0, cl = 0;
          for (let k = 3; k < q.length; k += 4 * 13) { if (q[k] > 250) op++; if (q[k] < 8) cl++; }
          const mid = c.getContext('2d').getImageData(960, 500, 1, 1).data[3];
          return { pr, rect: [a.x - b.x, a.y - b.y, a.width - b.width, a.height - b.height], disp: getComputedStyle(e).display, bg: getComputedStyle(c).backgroundColor, below: !!(e.compareDocumentPosition(c) & Node.DOCUMENT_POSITION_FOLLOWING), pe: getComputedStyle(e).pointerEvents, op, cl, mid };
        });
        t.ok(d.pr && d.pr.lum > 20 && d.pr.span > 40, 'Bodenbild nicht leer und nicht einfarbig: ' + JSON.stringify(d.pr));
        t.ok(d.rect.every(v => Math.abs(v) < 1), 'WebGL-Leinwand deckt sich mit dem 2D-Canvas: ' + d.rect);
        t.ok(d.disp === 'block' && d.below && d.pe === 'none', 'WebGL-Leinwand sichtbar, unter dem 2D-Canvas, ohne Maus: ' + [d.disp, d.below, d.pe]);
        t.eq(d.bg, 'rgba(0, 0, 0, 0)', '2D-Canvas hat in 3D einen durchsichtigen Grund');
        t.ok(d.cl > d.op && d.mid < 8, 'Welt im 2D-Canvas nicht gezeichnet (Mitte durchsichtig): ' + JSON.stringify([d.cl, d.op, d.mid]));
        t.ok(d.op > 500, 'HUD sichtbar (deckende Pixel im 2D-Canvas): ' + d.op);
        // Maus: Weltpunkt kommt aus dem Strahl, Rundlauf toScr -> pick trifft den Spieler in Waffenhoehe und am Boden
        const m = await page.evaluate(() => {
          const D = __dbg, V = D.view3d.V, g = D.get(), me = g.me, s = V.toScr(me.x, me.y, 24), w = V.pick(s[0], s[1]), s0 = V.toScr(me.x + 50, me.y - 30, 0), w0 = V.pick(s0[0], s0[1], 0);
          const M = D.mouse; M.sx = 700; M.sy = 120; D.draw(); const q = V.pick(700, 120), c = D.cam();
          return { e24: Math.hypot(w[0] - me.x, w[1] - me.y), e0: Math.hypot(w0[0] - me.x - 50, w0[1] - me.y + 30), mx: [M.x - q[0], M.y - q[1]], flat: [M.x - (700 + c[0]), M.y - (120 + c[1])] };
        });
        t.ok(m.e24 < 1 && m.e0 < 1, 'Rundlauf pick(toScr) unter 1 px: ' + m.e24.toFixed(3) + ' / ' + m.e0.toFixed(3));
        t.ok(Math.hypot(m.mx[0], m.mx[1]) < .01, 'mouse.x/y kommt in 3D aus pick: ' + m.mx);
        t.ok(Math.hypot(m.flat[0], m.flat[1]) > 5, 'in 3D weicht der Weltpunkt von der 2D-Umrechnung ab: ' + m.flat);
        // Menue: Ansicht blendet aus, das Spiel blendet wieder ein
        const mn = await page.evaluate(() => { const D = __dbg, e = document.getElementById('c3d'); D.toTitle(); D.draw(); const a = getComputedStyle(e).display, bg = getComputedStyle(document.getElementById('c')).backgroundColor; D.startGame(); D.draw(); return [a, bg !== 'rgba(0, 0, 0, 0)', getComputedStyle(e).display]; });
        t.eq(mn, ['none', true, 'block'], 'im Menue ist die WebGL-Leinwand aus, im Spiel wieder an');
        // 3D aus: zurueck auf 2D, Welt wieder im 2D-Canvas
        const off = await page.evaluate(async () => { const D = __dbg; await D.view3d.set(false); D.draw(); const c = document.getElementById('c'), e = document.getElementById('c3d'); return { disp: getComputedStyle(e).display, bg: getComputedStyle(c).backgroundColor, mid: c.getContext('2d').getImageData(960, 500, 1, 1).data[3], on: D.view3d.on, mx: D.mouse.x - (D.mouse.sx + D.cam()[0]) }; });
        t.ok(off.disp === 'none' && off.bg !== 'rgba(0, 0, 0, 0)' && off.mid === 255 && !off.on && Math.abs(off.mx) < .01, '3D aus: zurueck in 2D: ' + JSON.stringify(off));
        await page.evaluate(() => __dbg.view3d.reset());
        if (page !== t.page && page.errors.length) t.ok(false, 'JS-Fehler: ' + page.errors.slice(0, 2).join(' | '));
      } finally { await P.done(); }
    },
  },
  {
    name: '3D: Regler Kamerawinkel 20 bis 30 Grad wirkt auf die Kamera, Optionen schalten die Ansicht und merken beides',
    timeout: 180000,
    async run(t) {
      const P = await glPage(t); if (!P) return;
      try {
        const page = P.page, r = await on3d(page);
        if (!r.info) { t.ok(false, '3D nicht an: ' + JSON.stringify(r.i0)); return; }
        t.eq(r.info.angle, 25, 'Standardwinkel 25 Grad');
        const tilt = i => Math.atan2(i.camZ, i.camY) * 180 / Math.PI;
        t.ok(Math.abs(tilt(r.info) - 25) < .01, 'Kamera bei 25 Grad gekippt: ' + tilt(r.info));
        const a = await page.evaluate(() => { const o = []; for (const v of [20, 30, 40, 10]) { V3OPT.setAngle(v); __dbg.draw(); o.push(__dbg.view3d.info()); } V3OPT.setAngle(25); return o; });
        const tl = a.map(tilt).map(x => Math.round(x * 100) / 100);
        t.eq(tl, [20, 30, 30, 20], 'Winkel wirkt auf die Kamera und bleibt in 20 bis 30 Grad');
        // Oberflaeche: Pause, Optionen, Regler mit Pfeiltasten, Kachel Ansicht mit A (Auto, 3D, 2D)
                await page.focus('#c');
        await page.keyboard.press('Escape'); await page.keyboard.press('o');
        const ids = await page.evaluate(() => __dbg.ui().tiles().map(q => q.id));
        t.ok(ids.includes('ansicht') && ids.includes('winkel'), 'Kacheln Ansicht und Winkel in den Optionen: ' + ids);
        const fW = await page.evaluate(() => { const q = __dbg.ui().tiles().find(x => x.id === 'winkel'), c = document.getElementById('c').getBoundingClientRect(); return [c.left + (q.x + q.w / 2) / 960 * c.width, c.top + (q.y + q.h / 2) / 544 * c.height]; });
        await page.mouse.move(fW[0], fW[1]);
        t.eq(await page.evaluate(() => __dbg.ui().focus()), 'winkel', 'Maus trifft den Regler');
        await page.keyboard.press('ArrowLeft'); await page.keyboard.press('ArrowLeft');
        t.eq(await page.evaluate(() => [V3OPT.angle, localStorage.getItem('holdup.winkel')]), [23, '23'], 'Pfeil links: zwei Grad weniger, gespeichert');
        const fR = await page.evaluate(() => { const q = __dbg.ui().tiles().find(x => x.id === 'winkel'), c = document.getElementById('c').getBoundingClientRect(); return [c.left + (q.x + q.w - 50) / 960 * c.width, c.top + (q.y + q.h / 2) / 544 * c.height]; });
        await page.mouse.click(fR[0], fR[1]);
        t.eq(await page.evaluate(() => V3OPT.angle), 30, 'Klick rechts aussen: 30 Grad');
        const seq = [];
        for (let k = 0; k < 3; k++) { await page.keyboard.press('a'); seq.push(await page.evaluate(() => [V3OPT.mode, localStorage.getItem('holdup.ansicht')].join('/'))); }
        t.eq(seq, ['auto/auto', '3d/3d', '2d/2d'], 'A schaltet Auto, 3D, 2D und merkt es');
        // Neu laden: Winkel und Ansicht bleiben, 3D aus den Optionen startet die Ansicht ohne Debug-Wunsch
        await page.evaluate(() => { localStorage.setItem('holdup.ansicht', '3d'); localStorage.setItem('holdup.winkel', '21'); });
        await page.reload(); await page.waitForFunction(() => window.__dbg && __dbg.get && __dbg.get().players, null, { timeout: 30000 });
        const rl = await page.evaluate(async () => { const D = __dbg; D.reset(); D.setFocus(true); D.draw(); const i = await D.view3d.ready(); D.draw(); return [V3OPT.mode, V3OPT.angle, D.view3d.info().state, D.view3d.info().angle]; });
        t.eq(rl, ['3d', 21, 'an', 21], 'nach dem Neuladen: 3D aus den Optionen, Winkel 21');
        await page.evaluate(() => { localStorage.removeItem('holdup.ansicht'); localStorage.removeItem('holdup.winkel'); __dbg.view3d.reset(); });
      } finally { await P.done(); }
    },
  },
  {
    name: '3D: Rueckfall auf 2D mit Meldung ohne WebGL (WebGL2RenderingContext undefined, getContext liefert nichts)',
    async run(t) {
      for (const k of ['global', 'context']) {
        const ctx = await t.env.browser.newContext({ viewport: { width: 1000, height: 640 } });
        if (k === 'global') await ctx.addInitScript(() => { window.WebGL2RenderingContext = undefined; window.WebGLRenderingContext = undefined; });
        else await ctx.addInitScript(() => { const g = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function (c, o) { return /webgl/.test(c) ? null : g.call(this, c, o); }; });
        const page = await ctx.newPage(), errs = []; page.on('pageerror', e => errs.push(String(e)));
        await page.goto(t.env.url + '/index.html#debug&3d');
        await page.waitForFunction(() => window.__dbg && __dbg.get && __dbg.get().players, null, { timeout: 30000 });
        const r = await page.evaluate(async () => { const D = __dbg; D.setFocus(true); D.reset(); D.draw(); await D.view3d.ready(); for (let i = 0; i < 20; i++) D.update(1 / 30); D.draw(); const c = document.getElementById('c');
          return { st: D.view3d.state, err: D.view3d.err, msg: D.view3d.msg, opt: V3OPT.err, el: document.getElementById('c3d'), mid: c.getContext('2d').getImageData(960, 500, 1, 1).data[3], bg: getComputedStyle(c).backgroundColor }; });
        await ctx.close();
        t.eq(r.st, 'rueckfall', k + ': Zustand');
        t.ok(/WebGL/.test(r.err) && /weiter in 2D/.test(r.msg) && r.opt === r.err, k + ': Meldung nennt den Grund: ' + r.msg);
        t.ok(!r.el && r.mid === 255 && r.bg !== 'rgba(0, 0, 0, 0)', k + ': das Spiel zeichnet in 2D weiter: ' + JSON.stringify(r));
        t.eq(errs, [], k + ': keine JS-Fehler');
      }
    },
  },
  {
    name: '3D: ueber file:// faellt die Ansicht auf 2D zurueck mit dem Hinweis auf den Webserver',
    async run(t) {
      const ctx = await t.env.browser.newContext({ viewport: { width: 1000, height: 640 } });
      await ctx.addInitScript(() => { window.__holdupSeed = 'classic'; });
      const page = await ctx.newPage(), errs = []; page.on('pageerror', e => errs.push(String(e)));
      await page.goto('file://' + path.join(lib.ROOT, 'index.html') + '#debug&3d');
      await page.waitForFunction(() => window.__dbg && __dbg.get && __dbg.get().players, null, { timeout: 30000 });
      const r = await page.evaluate(async () => { const D = __dbg; D.setFocus(true); D.draw(); await D.view3d.ready(); D.draw(); return { st: D.view3d.state, err: D.view3d.err, msg: D.view3d.msg, res: performance.getEntriesByType('resource').map(e => e.name).filter(n => /view3d|three/.test(n)) }; });
      await ctx.close();
      t.eq(r.st, 'rueckfall', 'Zustand');
      t.ok(/Webserver/.test(r.err) && /Webserver/.test(r.msg), 'Meldung: ' + r.msg);
      t.eq(r.res, [], 'kein Ladeversuch des Moduls ueber file://');
      t.eq(errs, [], 'keine JS-Fehler');
    },
  },
];
