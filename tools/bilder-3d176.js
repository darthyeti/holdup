// Ticket 176: Abnahmebilder des Kamera-Sichtkegels in 3D, je Strassenseite (N, E, S, W) eine Kamera, Name docs/bilder/plan-3d/3d176-<vorher|nachher>-<seite>.jpg.
// Aufruf: cd tests && HOLDUP_CHROME=/opt/pw-browsers/chromium node ../tools/bilder-3d176.js <vorher|nachher>
const path = require('path');
const lib = require(path.join(__dirname, '..', 'tests', 'lib'));
const TAG = process.argv[2] || 'nachher';
(async () => {
  const env = await lib.launch({ webgl: true });
  const page = await lib.openGame(env, { still: true, gfx: 'mittel' });
  await page.evaluate(async () => { await __dbg.view3d.set(true); });
  for (const side of ['N', 'E', 'S', 'W']) {
    await page.evaluate(side => {
      const D = __dbg; D.setScenario('bank'); D.setTurn(side); D.buildSeed('classic'); D.setFocus(true); D.CFG.policeAt = 1e6; D.CFG.policeForced = 1e6; D.reset();
      for (let i = 0; i < 5; i++) D.update(1 / 30);
      const g = D.get(), me = g.me, W = D.world(), T = 32; g.cams.forEach(c => { c.k = true; c.off = false; });
      const c = g.cams[0], free = (x, y) => !W.isSol(Math.floor(x / T), Math.floor(y / T));
      let best = null; for (let r = 60; r < 260 && !best; r += 20) for (let k = 0; k < 24 && !best; k++) { const a = k * Math.PI / 12, x = c.x + Math.cos(a) * r, y = c.y + Math.sin(a) * r; if (free(x, y) && D.los(x, y, c.x, c.y)) best = [x, y]; }
      best = best || [me.x, me.y]; for (let k = 0; k < 20; k++) { me.x = best[0]; me.y = best[1]; me.vx = me.vy = 0; me.a = Math.atan2(c.y - best[1], c.x - best[0]); D.update(1 / 30); }
      D.mouse.t = -999; D.draw(); D.draw();
    }, side);
    const el = await page.$('main');
    await page.screenshot({ path: path.join(lib.ROOT, 'docs', 'bilder', 'plan-3d', '3d176-' + TAG + '-' + side + '.jpg'), type: 'jpeg', quality: 80, clip: await el.boundingBox() });
  }
  await env.browser.close(); env.srv.close();
})();
