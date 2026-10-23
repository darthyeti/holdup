// Testlauf fuer Holdup: node run.js [--update] [--long] [--fast] [--jobs=N|auto] [--write-weights] [Teil des Testnamens ...]   (--fast laesst Tests mit slow: true aus, das sind die langen Karten-Durchlaeufe, npm run test:fast)   (--jobs=N verteilt die Dateien auf N Kindprozesse mit eigenem Browser, Gewichte in weights.json, npm run test:par)   (--long fuehrt statt cases/ die grossen Laeufe in long/ aus: npm run test:long, viele Seeds, mehrere Minuten)   (HOLDUP_ROOT=<Ordner> spielt gegen einen anderen Stand, zum Beispiel git archive HEAD~1)
// Jeder Test liegt in cases/*.test.js und exportiert { name, run(t) }. Jeder Test bekommt eine frische Seite mit #debug,
// JS-Fehler im Spiel lassen ihn scheitern. t.snapshot(schluessel, wert) vergleicht mit golden/<datei>.json (mit --update neu schreiben).
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');
const { launch, openGame, loadTool, loadInpage } = require('./lib');

const args = process.argv.slice(2);
const UPDATE = args.includes('--update');
const LONG = args.includes('--long');
const FAST = args.includes('--fast');           // Tests mit slow: true auslassen
const WRITEW = args.includes('--write-weights');   // nach einem vollen Lauf ohne Filter weights.json neu schreiben
const CHILD = !!process.env.HOLDUP_CHILD;       // Kindprozess eines parallelen Laufs (bekommt seine Dateien in HOLDUP_FILES)
const jobsArg = (args.find(a => a.startsWith('--jobs')) || '').split('=')[1] || process.env.HOLDUP_JOBS || '1';
const JOBS = CHILD ? 1 : jobsArg === 'auto' ? Math.max(1, Math.min(4, os.cpus().length - 1)) : Math.max(1, +jobsArg || 1);
const SLOWHINT = +process.env.HOLDUP_SLOWHINT || 20;   // Sekunden, ab denen ein Test ohne slow einen Hinweis bekommt
const filters = args.filter(a => !a.startsWith('--'));
const WFILE = path.join(__dirname, 'weights.json');
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

// Abschluss fuer sequentielle und parallele Laeufe: Summenzeile (Format wie immer), Hinweise, Gewichte
function report(results, pass, fail, t0, skipped) {
  console.log('\n' + pass + ' bestanden, ' + fail + ' fehlgeschlagen (' + ((Date.now() - t0) / 1000).toFixed(0) + ' s)');
  if (CHILD) return;   // Hinweise, Gewichte und die Liste der Fehler schreibt der Elternprozess
  if (skipped) console.log('Schneller Lauf: ' + skipped + ' langsame Tests ausgelassen (slow: true), voller Lauf mit npm test.');
  const bad = results.filter(r => !r.ok);
  if (bad.length > 1) { console.log('Fehlgeschlagen:'); for (const r of bad) console.log('  ' + r.file + ': ' + r.name); }
  const hint = JOBS > 1 ? [] : results.filter(r => !r.slow && r.sec >= SLOWHINT);   // im parallelen Lauf sind die Zeiten durch die Konkurrenz um die Kerne verzerrt
  if (hint.length) { console.log('Hinweis: ohne slow: true, aber ab ' + SLOWHINT + ' s (Maschine ist langsam oder der Test gehoert in den langen Lauf):'); for (const r of hint) console.log('  ' + r.sec + ' s ' + r.file + ': ' + r.name.slice(0, 100)); }
  if (WRITEW && !CHILD && !filters.length && !FAST && !LONG) {
    const w = {};
    for (const r of results) { const e = w[r.file] || (w[r.file] = { all: 0, fast: 0 }); e.all += r.sec; if (!r.slow) e.fast += r.sec; }
    for (const k of Object.keys(w)) { w[k].all = Math.round(w[k].all); w[k].fast = Math.round(w[k].fast); }
    fs.writeFileSync(WFILE, JSON.stringify(w, null, 1) + '\n'); console.log('weights.json geschrieben (' + Object.keys(w).length + ' Dateien).');
  }
}

// Paralleler Lauf: die Dateien nach Gewicht (weights.json, Sekunden) auf Kindprozesse verteilen, jedes Kind startet einen eigenen Browser und Server.
// Der Port der Kinder ist HOLDUP_PORT (Standard 18765) plus Nummer, die Datei 70-menues bekommt den Standardport (Pixelvergleiche zeichnen die Adresse der Lobby).
async function runParallel(files) {
  const wj = fs.existsSync(WFILE) ? JSON.parse(fs.readFileSync(WFILE, 'utf8')) : {};
  const items = [];
  let skipP = 0;   // Tests, die mit --fast ausfallen und in keiner Datei eines Kindes stehen
  for (const file of files) {
    const base = path.basename(file);
    const match = [].concat(require(file)).filter(tc => !filters.length || filters.some(f => tc.name.includes(f) || file.includes(f)));
    const tcs = match.filter(tc => !(FAST && tc.slow));
    if (!tcs.length) { skipP += match.length; continue; }
    const w = wj[base] ? (FAST ? wj[base].fast : wj[base].all) : 10 * tcs.length;
    items.push({ base, w: Math.max(1, w) });
  }
  const n = Math.min(JOBS, items.length);
  if (n < 2) return null;   // nichts zu verteilen: sequentiell weiter
  const bins = Array.from({ length: n }, () => ({ files: [], w: 0 }));
  for (const it of items.sort((a, b) => b.w - a.w)) { const b = bins.reduce((m, x) => x.w < m.w ? x : m); b.files.push(it.base); b.w += it.w; }
  const basePort = +process.env.HOLDUP_PORT || 18765, pixBin = bins.findIndex(b => b.files.includes('70-menues.test.js'));
  let next = 1;
  const t0 = Date.now(), tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'holdup-tests-'));
  console.log('Paralleler Lauf: ' + n + ' Kindprozesse, geschaetzt ' + bins.map(b => Math.round(b.w) + ' s').join(' / ') + (FAST ? ', schneller Lauf' : ''));
  const kids = bins.map((b, i) => new Promise(resolve => {
    const out = path.join(tmp, 'k' + i + '.json'), port = i === pixBin || (pixBin < 0 && i === 0) ? basePort : basePort + next++;
    const cp = spawn(process.execPath, [__filename, ...args.filter(a => !a.startsWith('--jobs'))], { env: Object.assign({}, process.env, { HOLDUP_CHILD: '1', HOLDUP_SLOWDOWN: String(Math.max(1, n - 1)), HOLDUP_FILES: b.files.join(','), HOLDUP_PORT: String(port), HOLDUP_OUT: out }), stdio: ['ignore', 'pipe', 'pipe'] });
    let buf = '', block = null;
    const flush = () => { if (block) { console.log(block.join('\n')); block = null; } };
    const line = l => {
      if (/^(ok|FAIL) /.test(l)) { flush(); block = [l]; }
      else if (/^\s+\S/.test(l) && block) block.push(l);
      else { flush(); if (l.trim() && !/^\d+ bestanden, \d+ fehlgeschlagen/.test(l)) console.log(l); }
    };
    cp.stdout.on('data', d => { buf += d; let k; while ((k = buf.indexOf('\n')) >= 0) { line(buf.slice(0, k)); buf = buf.slice(k + 1); } });
    cp.stderr.on('data', d => process.stderr.write('[Kind ' + i + '] ' + d));
    cp.on('close', code => { if (buf) line(buf); flush(); resolve({ i, code, out }); });
  }));
  const done = await Promise.all(kids);
  let pass = 0, fail = 0, skipped = skipP, results = [], crashed = 0;
  for (const d of done) {
    if (fs.existsSync(d.out)) { const j = JSON.parse(fs.readFileSync(d.out, 'utf8')); pass += j.pass; fail += j.fail; skipped += j.skipped; results = results.concat(j.results); }
    else { crashed++; console.log('FEHLER Kindprozess ' + d.i + ' endete mit Code ' + d.code + ' ohne Ergebnis (Dateien: ' + bins[d.i].files.join(', ') + ')'); }
  }
  fs.rmSync(tmp, { recursive: true, force: true });
  report(results, pass, fail + crashed, t0, skipped);
  return fail || crashed ? 1 : 0;
}

(async () => {
  const dir = path.join(__dirname, LONG ? 'long' : 'cases');
  let files = fs.readdirSync(dir).filter(f => f.endsWith('.test.js')).sort().map(f => path.join(dir, f));
  if (process.env.HOLDUP_FILES) { const want = new Set(process.env.HOLDUP_FILES.split(',')); files = files.filter(f => want.has(path.basename(f))); }
  if (JOBS > 1) { const code = await runParallel(files); if (code !== null) process.exit(code); }
  const LOPT = process.env.HOLDUP_ROOT ? { root: process.env.HOLDUP_ROOT } : undefined;   // HOLDUP_ROOT: Tests gegen einen anderen Stand des Spiels laufen lassen (Gegenprobe, ob ein Test den alten Fehler findet)
  let env = await launch(LOPT);
  let pass = 0, fail = 0, skipped = 0;
  const results = [];
  const t0 = Date.now();
  try {
    for (const file of files) {
      const mod = require(file);
      for (const tc of [].concat(mod)) {
        if (filters.length && !filters.some(f => tc.name.includes(f) || file.includes(f))) continue;
        if (FAST && tc.slow) { skipped++; continue; }
        const start = Date.now();
        let page, err = null, t, attempt = 0;
        // tc.retry: so oft wird ein fehlgeschlagener Test auf frischer Seite wiederholt (nur fuer Pixelvergleiche, die selten um ein Pixel schwanken)
        for (;;) {
        if (attempt > 0 && page) await Promise.race([page.ctx.close().catch(() => {}), new Promise(r => setTimeout(r, 8000))]);
        err = null; page = null;
        try {
          page = await openGame(env, tc.open);
          t = mkT(file, page, env);
          // Zeitlimit je Test (Standard 120 s): haengt eine Seite (Endlosschleife im Spiel), wird der Browser hart beendet und neu gestartet
          const limit = ((+process.env.HOLDUP_TIMEOUT * 1000) || tc.timeout || 120000) * (+process.env.HOLDUP_SLOWDOWN || 1);   // im parallelen Lauf rechnet jede Seite langsamer (Kerne werden geteilt)
          let timer, timedOut = false;
          await Promise.race([tc.run(t), new Promise((_, rej) => { timer = setTimeout(() => { timedOut = true; rej(new Fail('Zeitueberschreitung nach ' + limit / 1000 + ' s (haengt das Spiel in einer Schleife?)')); }, limit); })]).finally(() => clearTimeout(timer));
          if (page.errors.length) throw new Fail('JS-Fehler im Spiel: ' + page.errors.slice(0, 3).join(' | '));
        } catch (e) { err = e; if (e instanceof Fail && /^Zeitueberschreitung/.test(e.message)) { try { const b = env.browser, srv = env.srv; await Promise.race([b.close(), new Promise(r => setTimeout(r, 5000))]); srv.close(); } catch (_) { } env = await launch(LOPT); page = null; } }
        if (!err || attempt >= (tc.retry || 0) || (err instanceof Fail && /^Zeitueberschreitung/.test(err.message))) break;
        attempt++; }
        const sec = ((Date.now() - start) / 1000).toFixed(1);
        results.push({ file: path.basename(file), name: tc.name, sec: +sec, ok: !err, slow: !!tc.slow });
        if (err) { fail++; console.log('FAIL ' + tc.name + ' (' + sec + ' s)\n     ' + String(err instanceof Fail ? err.message : err.stack || err).split('\n').join('\n     ')); }
        else { pass++; console.log('ok   ' + tc.name + ' (' + sec + ' s)' + (attempt ? ' beim ' + (attempt + 1) + '. Versuch' : '')); }
        if (t) for (const n of t.notes) console.log('       ' + n);
        if (page) await Promise.race([page.ctx.close().catch(() => {}), new Promise(r => setTimeout(r, 8000))]);
      }
    }
  } finally {
    // Beenden mit Zeitlimit: Chromium kehrt aus close() gelegentlich nicht zurueck (Ursache des einmaligen Haengers beim ersten Coop-Lauf), process.exit raeumt dann auf
    await Promise.race([env.browser.close().catch(() => {}), new Promise(r => setTimeout(r, 8000))]);
    env.srv.close();
  }
  report(results, pass, fail, t0, skipped);
  if (process.env.HOLDUP_OUT) fs.writeFileSync(process.env.HOLDUP_OUT, JSON.stringify({ pass, fail, skipped, results }));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
