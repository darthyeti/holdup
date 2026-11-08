// Stil-Tafel 3D (Ticket 160, 3D-2b): rendert die Bilder der drei Figuren-Stile aus tools/stil-tafel-3d.html nach docs/bilder/stil-tafel/ (JPEG).
// Aufruf: node tools/stil-tafel-3d.js [Zielordner]   (braucht tests/node_modules, Chromium wie die Tests: HOLDUP_CHROME)
// Gibt zum Schluss die Dreiecke je Figur und Stil aus (fuer die README der Tafel).
const path = require('path');
const fs = require('fs');
const { launch } = require('../tests/lib.js');

const OUT = path.resolve(process.argv[2] || path.join(__dirname, '..', 'docs', 'bilder', 'stil-tafel'));
const SHOTS = [];
for (const s of ['A', 'B', 'C']) for (const shot of ['spiel', 'nah', 'bewegung']) SHOTS.push({ stil: s, shot, file: `stil-${s.toLowerCase()}-${shot}.jpg` });
SHOTS.push({ stil: 'A', shot: 'vergleich', file: 'vergleich-spielkamera.jpg' });

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const env = await launch({ webgl: true });
  const ctx = await env.browser.newContext({ viewport: { width: 960, height: 544 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto(env.url + '/tools/stil-tafel-3d.html');
  await page.waitForFunction(() => window.TAFEL_READY, null, { timeout: 60000 });
  let tris = null;
  for (const s of SHOTS) {
    const r = await page.evaluate(o => window.TAFEL.render(o), s);
    tris = r.tris;
    const f = path.join(OUT, s.file);
    await page.locator('#wrap').screenshot({ path: f, type: 'jpeg', quality: 84 });
    console.log(s.file, Math.round(fs.statSync(f).size / 1024) + ' KB');
  }
  console.log('Dreiecke/Teile je Figur:', JSON.stringify(tris));
  if (errs.length) console.log('Fehler:', errs.join('\n'));
  await env.browser.close(); env.srv.close();
})().catch(e => { console.error(e); process.exit(1); });
