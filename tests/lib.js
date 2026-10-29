// Gemeinsame Helfer fuer die Holdup-Tests: statischer Server, Chromium, Seite mit #debug.
// Das Spiel braucht keinen Bauschritt, der Server liefert den Projektordner (eine Ebene ueber tests/) aus.
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { chromium } = require('playwright-core');

const ROOT = path.resolve(__dirname, '..');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.png': 'image/png', '.json': 'application/json', '.md': 'text/plain; charset=utf-8' };

function serve(root) {
  root = root || ROOT;
  return new Promise(res => {
    const srv = http.createServer((req, rsp) => {
      const u = decodeURIComponent(req.url.split('?')[0]);
      if (u === '/favicon.ico') { rsp.writeHead(204); rsp.end(); return; }
      const f = path.join(root, u === '/' ? 'index.html' : u);
      if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { rsp.writeHead(404); rsp.end('nicht gefunden'); return; }
      rsp.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream', 'cache-control': 'no-store' });
      fs.createReadStream(f).pipe(rsp);
    });
    // Fester Port (Standard 18765, HOLDUP_PORT aendert ihn): Die Lobby zeichnet die Adresse, Pixelvergleiche brauchen sie stabil. Ist er belegt, nimmt der Server irgendeinen freien.
    const port = +process.env.HOLDUP_PORT || 18765;
    srv.once('listening', () => res({ srv, url: 'http://127.0.0.1:' + srv.address().port }));
    srv.once('error', () => srv.listen(0, '127.0.0.1'));
    srv.listen(port, '127.0.0.1');
  });
}

// Chromium: Umgebungsvariable HOLDUP_CHROME, sonst der Playwright-Cache (neueste Revision), sonst Standardsuche von playwright-core.
function findChrome() {
  if (process.env.HOLDUP_CHROME) return process.env.HOLDUP_CHROME;
  const cache = path.join(os.homedir(), 'Library', 'Caches', 'ms-playwright');
  try {
    const dirs = fs.readdirSync(cache).filter(d => /^chromium-\d+$/.test(d)).sort((a, b) => +b.split('-')[1] - +a.split('-')[1]);
    for (const d of dirs) {
      const p = path.join(cache, d, 'chrome-mac-arm64', 'Google Chrome for Testing.app', 'Contents', 'MacOS', 'Google Chrome for Testing');
      if (fs.existsSync(p)) return p;
    }
  } catch (e) { /* kein Cache, dann Standard */ }
  return undefined;
}

// opts.root: anderer Projektordner (zum Beispiel ein alter Stand fuer tests/altneu.js), Standard ist der eigene
async function launch(opts) {
  const { srv, url } = await serve(opts && opts.root && path.resolve(opts.root));
  // --disable-accelerated-2d-canvas: Chrome rastert sonst je Leinwand zur Laufzeit auf der GPU oder der CPU (Speicher, Zahl der Leinwaende), Verlaeufe, Alpha-Rechtecke und Linien sehen auf beiden Wegen
  // verschieden aus, die Pixeltests flackerten (Ticket #6). Mit dem Flag laeuft jede 2D-Leinwand auf der CPU, das Spiel selbst bleibt unveraendert.
  const browser = await chromium.launch({ executablePath: findChrome(), args: ['--autoplay-policy=no-user-gesture-required', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-accelerated-2d-canvas'] });
  return { srv, url, browser };
}

// Neue Seite mit Spiel (#debug), sammelt JS-Fehler. Wartet, bis __dbg und die Sprites da sind.
async function openGame(env, opts) {
  opts = opts || {};
  const ctx = await env.browser.newContext({ viewport: { width: 1000, height: 640 } });
  // Mit opts.det ersetzt ein Init-Skript Math.random durch einen festen Zahlenstrom (fuer Pixelvergleiche, vor dem ersten Skript der Seite)
  if (opts.det) await ctx.addInitScript(() => { let a = 0x9e3779b9; Math.random = () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; });
  const page = await ctx.newPage();
  page.errors = [];
  page.on('pageerror', e => page.errors.push(String(e && e.stack || e)));
  page.on('console', m => { if (m.type() === 'error') page.errors.push('console.error: ' + m.text() + (m.location().url ? ' (' + m.location().url + ')' : '')); });
  await page.goto(env.url + '/index.html' + (opts.hash || '#debug'));
  await page.waitForFunction(() => window.__dbg && window.__dbg.get && window.__dbg.get().players, null, { timeout: 30000 });
  await page.evaluate(() => { __dbg.setFocus(true); });
  // Die Sperrfrist fuers Rufen des Fluchtwagens (CFG.vanLock) gilt in den Tests nicht, die meisten rufen sofort (opts.lock behaelt sie, 32-fluchtwagen prueft sie)
  if (!opts.lock) await page.evaluate(() => { __dbg.CFG.vanLock = 0; });
  page.ctx = ctx;
  return page;
}

// Hilfsskripte aus tools/ in die Seite laden (bot.js, mapcheck.js, loopnet.js)
async function loadTool(page, name) {
  await page.addScriptTag({ content: fs.readFileSync(path.join(ROOT, 'tools', name), 'utf8') });
}

// Eigene Seitenskripte der Tests (tests/inpage/*.js)
async function loadInpage(page, name) {
  await page.addScriptTag({ content: fs.readFileSync(path.join(__dirname, 'inpage', name), 'utf8') });
}

// Eine Coop-Partie zu zweit auf einer (gedrehten) Karte vom Start bis zum Sieg (inpage/turn.js, TN.coop) auf einer eigenen Seite: Jede Instanz haelt Raster und Ebenen im Speicher (das Casino 9 Megapixel je Ebene), mehrere Partien in einer Seite blaehen sie auf.
// Liefert { tag, bad, stat }, die JS-Fehler der Seite landen in bad.
async function coopGame(env, sc, seed, turn, o) {
  const page = await openGame(env);
  try {
    await loadTool(page, 'loopnet.js'); await loadInpage(page, 'coop.js'); await loadInpage(page, 'turn.js');
    const r = await page.evaluate(([sc, seed, turn, o]) => TN.coop(sc, seed, turn == null ? undefined : turn, o), [sc, seed, turn == null ? null : turn, o || {}]);
    if (page.errors.length) r.bad.push('JS-Fehler im Spiel: ' + page.errors.slice(0, 2).join(' | '));
    return r;
  } finally { await Promise.race([page.ctx.close().catch(() => {}), new Promise(r => setTimeout(r, 8000))]); }
}

module.exports = { ROOT, launch, openGame, loadTool, loadInpage, coopGame };
