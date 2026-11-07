// Alt-Neu-Vergleich der gezeichneten Bilder (Ticket 143, Auslagern Schritt 4a): beweist, dass ein Umbau des Zeichnens kein Pixel veraendert hat.
// Aufruf: node tests/pixel-altneu.js [ref|Ordner] [schnell]     (Standard fuer den alten Stand: origin/main; ein Ordner mit index.html wird direkt genommen, auch HOLDUP_ROOT)
// Der alte Stand kommt aus `git archive <ref>` in einen Temp-Ordner (der Arbeitsordner bleibt unberuehrt). Beide Staende erzeugen dieselben 72 Bilder wie tests/cases/189-pixelhash.test.js (8 Szenarien, 3 Phasen, 3 Grafikstufen,
// Seed 5, mit tests/inpage/bild.js) auf derselben Maschine im selben Chromium, danach: IDENTISCH oder die Liste der abweichenden Bilder. `schnell`: nur Stufe mittel (24 Bilder). Laufzeit rund 1 Minute.
// Fehlt dem alten Stand der Test-Haken __dbg.setTime (aelter als Ticket 143), setzt das Werkzeug ihn in der Temp-Kopie ein (eine Zeile, aendert kein Spielverhalten).
// Abnahmebedingung fuer Schritt 4b (js/draw.js) und jede Umstellung des Zeichnens: IDENTISCH.
process.env.HOLDUP_PORT = process.env.HOLDUP_PORT || '18840';
const fs = require('fs'), path = require('path'), os = require('os'), cp = require('child_process');
const lib = require('./lib');
const args = process.argv.slice(2), quick = args.includes('schnell'), rest = args.filter(a => a !== 'schnell');
const SC = ['bank', 'truck', 'jewel', 'gas', 'museum', 'casino', 'nb', 'prison'], GFX = quick ? ['mittel'] : ['niedrig', 'mittel', 'hoch'];

function altRoot() {
  const a = rest[0] || process.env.HOLDUP_ROOT || 'origin/main';
  if (fs.existsSync(path.join(path.resolve(a), 'index.html'))) return { dir: path.resolve(a), tmp: null };
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'holdup-pixel-alt-'));
  cp.execSync('git archive ' + JSON.stringify(a) + ' | tar -x -C ' + JSON.stringify(tmp), { cwd: lib.ROOT, stdio: ['ignore', 'inherit', 'inherit'], shell: '/bin/bash' });
  const f = path.join(tmp, 'index.html'); let s = fs.readFileSync(f, 'utf8');
  if (!s.includes('setTime:v=>{time=v}')) { s = s.replace('const dbg={bgPing,', 'const dbg={setTime:v=>{time=v},bgPing,'); fs.writeFileSync(f, s); console.log('Alter Stand ohne setTime: Haken in der Temp-Kopie eingesetzt'); }
  return { dir: tmp, tmp };
}

async function images(root, label) {
  const env = await lib.launch({ root }), out = {};
  try {
    for (const gfx of GFX) {
      const page = await lib.openGame(env, { det: true, gfx, still: true });
      await lib.loadInpage(page, 'bild.js');
      for (const sc of SC) {
        const r = await page.evaluate(sc => { PX.scene(sc, 5); const o = {}; for (const ph of PX.PHASES) { PX.phase(ph); o[ph] = PX.hash(); } return o; }, sc);
        for (const ph of Object.keys(r)) out[sc + '/' + ph + '/' + gfx] = r[ph];
      }
      if (page.errors.length) console.log(label + ': Fehler im Spiel: ' + page.errors.slice(0, 2).join(' | '));
      await Promise.race([page.ctx.close().catch(() => {}), new Promise(r => setTimeout(r, 5000))]);
    }
  } finally { await Promise.race([env.browser.close(), new Promise(r => setTimeout(r, 5000))]); env.srv.close(); }
  return out;
}

(async () => {
  const alt = altRoot();
  try {
    console.log('Alt: ' + alt.dir + '   Neu: ' + lib.ROOT + (quick ? '   (schnell)' : ''));
    const a = await images(alt.dir, 'alt'), b = await images(lib.ROOT, 'neu');
    const bad = Object.keys(a).filter(k => a[k] !== b[k]);
    if (!bad.length) console.log('IDENTISCH (' + Object.keys(a).length + ' Bilder)');
    else { console.log('ABWEICHUNG in ' + bad.length + ' von ' + Object.keys(a).length + ' Bildern:'); for (const k of bad) console.log('  ' + k + ': alt ' + a[k] + ', neu ' + b[k]); }
    process.exitCode = bad.length ? 1 : 0;
  } finally { if (alt.tmp) fs.rmSync(alt.tmp, { recursive: true, force: true }); }
  process.exit();
})();
