// Ticket 177: Abnahmebild Bank in 3D mit Durchgaengen ohne Sturz (docs/bilder/plan-3d/3d177-<tag>.jpg), Blick auf Tresentor und Tuer.
// Aufruf: cd tests && HOLDUP_CHROME=/opt/pw-browsers/chromium node ../tools/bilder-3d177.js <vorher|nachher>
const path = require('path');
const lib = require(path.join(__dirname, '..', 'tests', 'lib'));
const TAG = process.argv[2] || 'nachher';
(async () => {
  const env = await lib.launch({ webgl: true });
  const page = await lib.openGame(env, { still: true, gfx: 'mittel' });
  await page.evaluate(async () => { await __dbg.view3d.set(true); });
  await page.evaluate(() => {
    const D = __dbg; D.setScenario('bank'); D.buildSeed('classic'); D.setFocus(true); D.CFG.policeAt = 1e6; D.CFG.policeForced = 1e6; D.reset();
    for (let i = 0; i < 5; i++) D.update(1 / 30);
    const g = D.get(), me = g.me, W = D.world(), T = 32, M = W.M; let tg = null;
    for (let y = 0; y < M.length && !tg; y++) { const i = M[y].indexOf('g'); if (i >= 0) tg = [(i + W.WX0) * T + 16, (y + W.WY0) * T + 16]; }
    const L = (() => { for (let y = 0; y < M.length; y++) { const i = M[y].indexOf('L'); if (i >= 0) return [i + W.WX0, y + W.WY0]; } })(); if (L) W.setc(L[0], L[1], 'l');
    tg = tg || [me.x, me.y]; const free = (x, y) => !W.isSol(Math.floor(x / T), Math.floor(y / T));
    let best = null; for (const r of [90, 120, 150, 180]) for (let k = 0; k < 16 && !best; k++) { const a = Math.PI / 2 + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * Math.PI / 8, x = tg[0] + Math.cos(a) * r, y = tg[1] + Math.sin(a) * r; if (free(x, y) && D.los(x, y, tg[0], tg[1])) best = [x, y]; }
    best = best || [me.x, me.y]; for (let k = 0; k < 20; k++) { me.x = best[0]; me.y = best[1]; me.vx = me.vy = 0; me.a = Math.atan2(tg[1] - best[1], tg[0] - best[0]); D.update(1 / 30); }
    D.mouse.t = -999; D.draw(); D.draw();
  });
  const el = await page.$('main');
  await page.screenshot({ path: path.join(lib.ROOT, 'docs', 'bilder', 'plan-3d', '3d177-' + TAG + '.jpg'), type: 'jpeg', quality: 80, clip: await el.boundingBox() });
  await env.browser.close(); env.srv.close();
})();
