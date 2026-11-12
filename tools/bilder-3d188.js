// Ticket 188: Abnahmebild Silhouette in 3D: Spieler steht suedlich vor einer Innenwand (docs/bilder/plan-3d/3d188-<tag>.jpg), Ausschnitt um die Figur.
// Aufruf: cd tests && HOLDUP_CHROME=/opt/pw-browsers/chromium node ../tools/bilder-3d188.js <vorher|nachher>
const path = require('path');
const lib = require(path.join(__dirname, '..', 'tests', 'lib'));
const TAG = process.argv[2] || 'nachher';
(async () => {
  const env = await lib.launch({ webgl: true });
  const page = await lib.openGame(env, { still: true, gfx: 'mittel' });
  await page.evaluate(async () => { await __dbg.view3d.set(true); });
  const s = await page.evaluate(() => {
    const D = __dbg; D.setScenario('bank'); D.buildSeed('classic'); D.setFocus(true); D.CFG.policeAt = 1e6; D.CFG.policeForced = 1e6; D.reset();
    for (let i = 0; i < 5; i++) D.update(1 / 30);
    const W = D.world(), me = D.get().me; let nb = null;
    for (let y = W.WY0 + 3; y < W.WY0 + W.H - 3 && !nb; y++) for (let x = W.WX0 + 3; x < W.WX0 + W.W - 3 && !nb; x++)
      if (W.cell(x, y) === '#' && W.cell(x - 1, y) === '#' && W.cell(x + 1, y) === '#' && !W.isSol(x, y + 1) && !W.isSol(x, y + 2) && W.cell(x, y + 2) !== '#') nb = [x, y];
    const px = nb[0] * 32 + 16, py = nb[1] * 32 + 44; for (let k = 0; k < 40; k++) { me.x = px; me.y = py; me.a = 1.57; me.hp = 1e9; me.vx = me.vy = 0; D.update(1 / 30); } D.mouse.t = -999; D.draw(); D.draw();
    return D.view3d.V.toScr(px, py, 14);
  });
  const el = await page.$('main'), bb = await el.boundingBox();
  await page.screenshot({ path: path.join(lib.ROOT, 'docs', 'bilder', 'plan-3d', '3d188-' + TAG + '.jpg'), type: 'jpeg', quality: 85, clip: { x: bb.x + Math.max(0, s[0] - 110), y: bb.y + Math.max(0, s[1] - 100), width: 220, height: 170 } });
  await env.browser.close(); env.srv.close();
})();
