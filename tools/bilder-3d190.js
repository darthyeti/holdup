// Ticket 190: Abnahmebild Schnitt nur fuer Waende: Spieler nordlich der Geldautomaten (docs/bilder/plan-3d/3d190-<tag>.jpg), Ausschnitt um die Figur.
// Aufruf: cd tests && HOLDUP_CHROME=/opt/pw-browsers/chromium node ../tools/bilder-3d190.js <vorher|nachher>
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
    const W = D.world(), me = D.get().me; let f = null;
    for (let y = W.WY0 + 3; y < W.WY0 + W.H - 3 && !f; y++) for (let x = W.WX0 + 3; x < W.WX0 + W.W - 3 && !f; x++) if (W.cell(x, y) === 'A' && !W.isSol(x, y - 1) && !W.isSol(x, y - 2)) f = [x, y];
    const px = f[0] * 32 + 16, py = f[1] * 32 - 8; for (let k = 0; k < 40; k++) { me.x = px; me.y = py; me.a = 1.57; me.hp = 1e9; me.vx = me.vy = 0; D.update(1 / 30); } D.mouse.t = -999; D.draw(); D.draw();
    return D.view3d.V.toScr(px, py + 20, 20);
  });
  const el = await page.$('main'), bb = await el.boundingBox();
  await page.screenshot({ path: path.join(lib.ROOT, 'docs', 'bilder', 'plan-3d', '3d190-' + TAG + '.jpg'), type: 'jpeg', quality: 85, clip: { x: bb.x + Math.max(0, s[0] - 130), y: bb.y + Math.max(0, s[1] - 110), width: 260, height: 190 } });
  await env.browser.close(); env.srv.close();
})();
