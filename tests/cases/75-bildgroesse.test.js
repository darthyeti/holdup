// Bildgroesse: Das Bild passt sich dem Fenster an (Voreinstellung "auto"), "fix" haelt es wie frueher bei 1100 px, Vollbild fuellt den Bildschirm.
// Alles ist CSS ueber html[data-view] und html[data-fs] (VIEW in index.html), die Wahl steht in localStorage 'holdup.view'.
async function geo(page) {
  return page.evaluate(() => {
    const c = document.getElementById('c').getBoundingClientRect(), d = document.documentElement;
    return { w: Math.round(c.width), h: Math.round(c.height), l: Math.round(c.left), t: Math.round(c.top), ih: innerHeight, iw: innerWidth, sh: d.scrollHeight, sw: d.scrollWidth, view: d.dataset.view, fs: d.dataset.fs || null };
  });
}
async function inWindow(t, w, h, mode, fn) {
  const ctx = await t.env.browser.newContext({ viewport: { width: w, height: h } });
  await ctx.addInitScript(m => { try { localStorage.setItem('holdup.view', m); } catch (e) { /* ohne Speicher bleibt auto */ } }, mode);
  const page = await ctx.newPage();
  const errs = []; page.on('pageerror', e => errs.push(String(e)));
  try {
    await page.goto(t.env.url + '/index.html#debug');
    await page.waitForFunction(() => window.__dbg && window.__dbg.get && window.__dbg.get().players, null, { timeout: 30000 });
    await fn(page);
    t.eq(errs, [], 'keine JS-Fehler');
  } finally { await ctx.close(); }
}

module.exports = [
  {
    name: 'Bildgroesse: auto fuellt das Fenster (ohne Scrollen), fix bleibt bei 1100 px',
    async run(t) {
      for (const [w, h] of [[2560, 1440], [1440, 800], [1000, 640]]) {
        await inWindow(t, w, h, 'auto', async page => {
          const g = await geo(page), asp = g.w / g.h;
          t.eq(g.view, 'auto'); t.ok(Math.abs(asp - 960 / 544) < .03, 'Seitenverhaeltnis 960:544 bei ' + w + 'x' + h + ': ' + asp);
          t.ok(g.sh <= g.ih && g.sw <= g.iw, 'kein Scrollen bei ' + w + 'x' + h + ': ' + g.sh + '/' + g.ih + ' ' + g.sw + '/' + g.iw);
          t.ok(g.w <= g.iw - 24 && g.t + g.h <= g.ih, 'passt ins Fenster bei ' + w + 'x' + h);
          t.ok(g.w >= Math.min(g.iw - 100, (g.ih - 112) * 960 / 544) - 40, 'fuellt die Breite oder die Hoehe bei ' + w + 'x' + h + ': ' + g.w);
        });
      }
      await inWindow(t, 2560, 1440, 'fix', async page => {
        const g = await geo(page);
        t.eq(g.view, 'fix'); t.ok(g.w >= 1098 && g.w <= 1104, 'fix: 1100 px: ' + g.w);
      });
    },
  },
  {
    name: 'Bildgroesse: Optionen schalten Bildgroesse (B) und Vollbild (V), die Maus trifft die Kacheln',
    async run(t) {
      await inWindow(t, 1600, 900, 'auto', async page => {
        const has = await page.evaluate(() => VIEW.can);
        await page.focus('#c');
        await page.keyboard.press('Escape'); await page.keyboard.press('o');     // Pause, dann Optionen
        const ids = await page.evaluate(() => __dbg.ui().tiles().map(q => q.id));
        t.ok(ids.includes('view') && (!has || ids.includes('full')), 'Kacheln Bildgroesse und Vollbild: ' + ids);
        await page.keyboard.press('b');
        t.eq(await page.evaluate(() => [VIEW.mode, localStorage.getItem('holdup.view'), document.documentElement.dataset.view]), ['fix', 'fix', 'fix'], 'B schaltet auf fest und merkt es');
        t.eq((await geo(page)).w, 1102, 'fest: 1100 px');
        await page.keyboard.press('b');
        t.eq(await page.evaluate(() => [VIEW.mode, localStorage.getItem('holdup.view')]), ['auto', 'auto'], 'B schaltet zurueck');
        if (!has) { t.note('kein Vollbild in diesem Browser, uebersprungen'); return; }
        await page.keyboard.press('v');
        await page.waitForFunction(() => document.documentElement.dataset.fs === '1', null, { timeout: 5000 });
        const g = await geo(page);
        t.eq(g.fs, '1', 'Vollbild setzt html[data-fs]');
        t.ok(g.h >= g.ih - 2 || g.w >= g.iw - 2, 'Bild fuellt den Bildschirm: ' + g.w + 'x' + g.h + ' in ' + g.iw + 'x' + g.ih);
        t.ok(g.t <= 1 && g.sh <= g.ih, 'Kopfzeile ist weg, kein Scrollen');
        t.eq(await page.evaluate(() => document.activeElement.id), 'c', 'Fokus bleibt im Spielfeld');
        // Maus: Die Mitte der Kachel Vollbild muss im Vollbild getroffen werden (Umrechnung ueber getBoundingClientRect)
        const hit = async id => {
          const p = await page.evaluate(id => { const q = __dbg.ui().tiles().find(x => x.id === id), c = document.getElementById('c').getBoundingClientRect(); return [c.left + (q.x + q.w / 2) / 960 * c.width, c.top + (q.y + q.h / 2) / 544 * c.height]; }, id);
          await page.mouse.move(p[0], p[1]); return page.evaluate(() => __dbg.ui().focus());
        };
        t.eq([await hit('full'), await hit('mute')], ['full', 'mute'], 'Maus trifft die Kacheln im Vollbild');
        await page.keyboard.press('v');
        await page.waitForFunction(() => !document.documentElement.dataset.fs, null, { timeout: 5000 });
        const g2 = await geo(page);
        t.ok(g2.fs === null && g2.t > 20, 'zurueck im Fenster mit Kopfzeile');
      });
    },
  },
];
