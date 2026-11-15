// Ticket 189: Kontrast der Figuren zur Umgebung in 3D. Stellt eine Reihe aller Figurenarten in Bank, Museum und Casino (Seed 5, Erkundung) auf freie Boden, ruft je Figur V.seen
// (Bild mit und ohne die Figur, Farbabstand der Figurenpixel zum Hintergrund) und schreibt den Mittelwert je Szene (dist: Summe der RGB-Unterschiede 0 bis 765, merge: Anteil der Pixel unter 60).
// Aufruf: cd tests && HOLDUP_CHROME=/opt/pw-browsers/chromium node ../tools/messung-kontrast-3d.js [tag] (mit Bildern docs/bilder/plan-3d/3d189-<tag>-<szene>.jpg)
const path = require('path');
const lib = require(path.join(__dirname, '..', 'tests', 'lib'));
const TAG = process.argv[2] || '';
(async () => {
  const env = await lib.launch({ webgl: true });
  const page = await lib.openGame(env, { still: true, gfx: 'mittel' });
  await lib.loadInpage(page, 'bild.js');
  // ohne Schatten (Schattenkarte aus, shA 0), damit nur die Figur selbst gemessen wird und nicht ihr Schatten auf dem Boden
  await page.evaluate(async () => { if (typeof V3OPT !== 'undefined') while (V3OPT.shadow !== 'aus') V3OPT.cycleShadow(); await __dbg.view3d.set(true); __dbg.view3d.V.cfg.shA = 0; });
  const all = [];
  for (const sc of ['bank', 'museum', 'casino']) {
    const r = await page.evaluate((sc) => {
      const D = __dbg; PX.scene(sc, 5); PX.phase('erkundung');
      const g = D.get(), me = g.me, W = D.world(), T = 32; me.armed = true; me.hp = 100;
      const free = (x, y) => !W.isSol(Math.floor(x / T), Math.floor(y / T));
      let spot = null; for (let y = 4 * T; y < 40 * T && !spot; y += T) for (let x = 3 * T; x < 50 * T && !spot; x += T) { let ok = true; for (let k = 0; k < 8; k++) for (const dy of [-T, 0, T]) if (!free(x + k * 40, y + dy)) ok = false; if (ok) spot = [x, y]; }
      if (!spot) return { sc, err: 'kein Platz' };
      g.en.length = 0; g.npcs.length = 0; g.cars.length = 0;
      const mk = (kind, row, extra) => Object.assign({ id: 9000 + g.en.length, kind, row, r: 9, hp: 100, mhp: 100, a: 0, w: 0, mvg: false, fl: 0, h: 0, sh: 0, sx: 0, muz: 30, cool: 9, react: 9, sur: 0, mode: 'x', path: [] }, extra);
      const list = ['me', 'cop', 'swat', 'grd', 'civ', 'tel', 'mgr', 'sniper'], pos = [];
      for (let k = 0; k < 60; k++) { me.x = spot[0]; me.y = spot[1]; me.vx = me.vy = 0; me.hp = 100; D.update(1 / 30); } // Kamera einholen, solange noch niemand sonst da ist
      list.forEach((k, i) => { const x = spot[0] + i * 34, y = spot[1]; pos.push([k, x, y]);
        if (k === 'me') { me.x = x; me.y = y; me.a = 0; me.vx = me.vy = 0; return; }
        if (k === 'cop') g.en.push(mk('cop', 0, { x, y })); if (k === 'swat') g.en.push(mk('swat', 8, { x, y })); if (k === 'sniper') g.en.push(mk('sniper', 8, { x, y })); if (k === 'grd') g.en.push(mk('grd', 2, { x, y }));
        const npc = (kind, row) => g.npcs.push({ id: 7000 + i, k: kind, row, x, y, a: 0, w: 0, mvg: false, st: 'idle', r: 8, kt: 20 });
        if (k === 'civ') npc('civ', 3); if (k === 'tel') npc('tel', 5); if (k === 'mgr') npc('mgr', 6); });
      g.en.forEach(e => { e.a = .6; }); g.npcs.forEach(n => { n.a = .6; }); me.a = .6; D.mouse.t = -999; D.draw(); D.draw();
      const V = D.view3d.V, out = pos.filter(([k, x, y]) => k === 'me' || (D.los(me.x, me.y, x, y) && Math.hypot(x - me.x, y - me.y) <= 130)).map(([k, x, y]) => { const q = V.seen(x, y, 14); return { k, dist: q && q.dist || 0, merge: q && q.merge || 0, px: q && q.px || 0, nul: !q } });
      D.draw(); return { sc, out, cam: [me.x, me.y] };
    }, sc);
    if (r.err) { console.log(sc, r.err); continue; }
    const el = await page.$('main'), bb = await el.boundingBox();
    if (TAG) await page.screenshot({ path: path.join(lib.ROOT, 'docs', 'bilder', 'plan-3d', '3d189-' + TAG + '-' + sc + '.jpg'), type: 'jpeg', quality: 85, clip: bb });
    const ok = r.out.filter(o => o.px > 30), dist = ok.reduce((a, o) => a + o.dist, 0) / ok.length, merge = ok.reduce((a, o) => a + o.merge, 0) / ok.length;
    console.log(sc.padEnd(7), 'Farbabstand', dist.toFixed(0), 'verschmelzend', (merge * 100).toFixed(0) + ' %', r.out.map(o => o.k + ':' + o.dist.toFixed(0) + (o.nul ? 'N' : '') + '/' + o.px).join(' ')); all.push([dist, merge]);
  }
  console.log('Mittel  Farbabstand', (all.reduce((a, q) => a + q[0], 0) / all.length).toFixed(0), 'verschmelzend', (all.reduce((a, q) => a + q[1], 0) / all.length * 100).toFixed(0) + ' %');
  await env.browser.close(); env.srv.close();
})();
