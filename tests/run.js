// Testlauf fuer Holdup: node run.js [--update] [Teil des Testnamens ...]
// Jeder Test liegt in cases/*.test.js und exportiert { name, run(t) }. Jeder Test bekommt eine frische Seite mit #debug,
// JS-Fehler im Spiel lassen ihn scheitern. t.snapshot(schluessel, wert) vergleicht mit golden/<datei>.json (mit --update neu schreiben).
const fs = require('fs');
const path = require('path');
const { launch, openGame, loadTool, loadInpage } = require('./lib');

const args = process.argv.slice(2);
const UPDATE = args.includes('--update');
const filters = args.filter(a => !a.startsWith('--'));
const GOLD = path.join(__dirname, 'golden');

class Fail extends Error {}
function mkT(testFile, page, env) {
  const golden = path.join(GOLD, path.basename(testFile).replace(/\.test\.js$/, '') + '.json');
  const t = {
    page, env, notes: [],
    ok(c, msg) { if (!c) throw new Fail(msg || 'Bedingung nicht erfuellt'); },
    eq(a, b, msg) { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Fail((msg || 'ungleich') + ': ' + JSON.stringify(a) + ' != ' + JSON.stringify(b)); },
    note(s) { t.notes.push(s); },
    loadTool: n => loadTool(page, n),
    loadInpage: n => loadInpage(page, n),
    // local: Referenz liegt in golden-local/ (nicht eingecheckt, gilt nur fuer diese Maschine, zum Beispiel Pixel mit Systemschrift). Fehlt sie, wird sie angelegt.
    async snapshot(key, value, o) {
      const local = !!(o && o.local), file = local ? path.join(__dirname, 'golden-local', path.basename(golden)) : golden;
      let g = {};
      if (fs.existsSync(file)) g = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (UPDATE || (local && !(key in g))) { g[key] = value; fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, JSON.stringify(g, null, 1) + '\n'); t.note('Schnappschuss ' + key + (local ? ' (lokal)' : '') + ' geschrieben'); return; }
      if (!(key in g)) throw new Fail('Schnappschuss "' + key + '" fehlt, mit npm run test:update anlegen');
      if (JSON.stringify(g[key]) !== JSON.stringify(value)) throw new Fail('Schnappschuss "' + key + '" weicht ab: ' + JSON.stringify(value) + ' statt ' + JSON.stringify(g[key]) + ' (gewollt? dann npm run test:update)');
    },
  };
  return t;
}

(async () => {
  const dir = path.join(__dirname, 'cases');
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.test.js')).sort().map(f => path.join(dir, f));
  let env = await launch();
  let pass = 0, fail = 0;
  const t0 = Date.now();
  try {
    for (const file of files) {
      const mod = require(file);
      for (const tc of [].concat(mod)) {
        if (filters.length && !filters.some(f => tc.name.includes(f) || file.includes(f))) continue;
        const start = Date.now();
        let page, err = null, t;
        try {
          page = await openGame(env, tc.open);
          t = mkT(file, page, env);
          // Zeitlimit je Test (Standard 120 s): haengt eine Seite (Endlosschleife im Spiel), wird der Browser hart beendet und neu gestartet
          const limit = (+process.env.HOLDUP_TIMEOUT * 1000) || tc.timeout || 120000;
          let timer, timedOut = false;
          await Promise.race([tc.run(t), new Promise((_, rej) => { timer = setTimeout(() => { timedOut = true; rej(new Fail('Zeitueberschreitung nach ' + limit / 1000 + ' s (haengt das Spiel in einer Schleife?)')); }, limit); })]).finally(() => clearTimeout(timer));
          if (page.errors.length) throw new Fail('JS-Fehler im Spiel: ' + page.errors.slice(0, 3).join(' | '));
        } catch (e) { err = e; if (e instanceof Fail && /^Zeitueberschreitung/.test(e.message)) { try { const b = env.browser, srv = env.srv; await Promise.race([b.close(), new Promise(r => setTimeout(r, 5000))]); srv.close(); } catch (_) { } env = await launch(); page = null; } }
        const sec = ((Date.now() - start) / 1000).toFixed(1);
        if (err) { fail++; console.log('FAIL ' + tc.name + ' (' + sec + ' s)\n     ' + String(err instanceof Fail ? err.message : err.stack || err).split('\n').join('\n     ')); }
        else { pass++; console.log('ok   ' + tc.name + ' (' + sec + ' s)'); }
        if (t) for (const n of t.notes) console.log('       ' + n);
        if (page) await page.ctx.close();
      }
    }
  } finally {
    await env.browser.close();
    env.srv.close();
  }
  console.log('\n' + pass + ' bestanden, ' + fail + ' fehlgeschlagen (' + ((Date.now() - t0) / 1000).toFixed(0) + ' s)');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
