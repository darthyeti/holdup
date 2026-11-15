// Ticket 178: Abnahmebild Fenster in 3D, Bank, Spielkamera 25 Grad, Blick auf die Suedfassade (docs/bilder/plan-3d/3d178-<tag>-<seite>.jpg), je Strassenseite N, E, S, W.
// Aufruf: cd tests && HOLDUP_CHROME=/opt/pw-browsers/chromium node ../tools/bilder-3d178.js <vorher|nachher>
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
      const g = D.get(), me = g.me, W = D.world(), T = 32, M = W.M; let tg = null;
      for (let y = 0; y < M.length && !tg; y++) { const i = M[y].indexOf('W'); if (i >= 0) tg = [(i + W.WX0) * T + 16, (y + W.WY0) * T + 16]; }
      const free = (x, y) => !W.isSol(Math.floor(x / T), Math.floor(y / T));
      let best = null; for (const r of [90, 120, 150, 180]) for (let k = 0; k < 16 && !best; k++) { const a = k * Math.PI / 8, x = tg[0] + Math.cos(a) * r, y = tg[1] + Math.sin(a) * r; if (free(x, y)) best = [x, y]; }
      best = best || [me.x, me.y]; for (let k = 0; k < 20; k++) { me.x = best[0]; me.y = best[1]; me.vx = me.vy = 0; me.a = Math.atan2(tg[1] - best[1], tg[0] - best[0]); D.update(1 / 30); }
      D.mouse.t = -999; D.draw(); D.draw();
    }, side);
    const el = await page.$('main');
    await page.screenshot({ path: path.join(lib.ROOT, 'docs', 'bilder', 'plan-3d', '3d178-' + TAG + '-' + side + '.jpg'), type: 'jpeg', quality: 80, clip: await el.boundingBox() });
  }
  await env.browser.close(); env.srv.close();
})();
