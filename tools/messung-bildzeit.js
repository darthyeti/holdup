// Bildzeit-Messung (Ticket 143, Auslagern Schritt 4a): Millisekunden je draw() je Szenario und Phase, Median und 90. Perzentil.
// Aufruf: HOLDUP_CHROME=<Chromium> node tools/messung-bildzeit.js [stufe ...] [--n=40]     (Stufe niedrig, mittel, hoch, Standard: mittel; im Ordner tests/ muss npm install gelaufen sein)
// Gleiche Szenen wie der Pixel-Hash-Test (tests/inpage/bild.js, Seed 5, Strasse S), die Spielschleife steht still, gemessen wird nur draw() bei unveraendertem Zustand.
// Headless-Chromium ohne GPU (--disable-accelerated-2d-canvas), auf dem Mac mit GPU ist es deutlich weniger. Vergleichbar sind nur Messungen auf derselben Maschine, ohne andere Last. Ausgangswerte: docs/tests-und-messwerte.md.
const lib = require('../tests/lib.js');
const args = process.argv.slice(2), N = +((args.find(a => a.startsWith('--n=')) || '--n=40').slice(4)), levels = args.filter(a => !a.startsWith('--'));
if (!levels.length) levels.push('mittel');

(async () => {
  const env = await lib.launch();
  const rows = [];
  for (const gfx of levels) {
    const page = await lib.openGame(env, { det: true, gfx, still: true });
    await lib.loadInpage(page, 'bild.js');
    for (const sc of ['bank', 'truck', 'jewel', 'gas', 'museum', 'casino', 'nb', 'prison']) {
      const r = await page.evaluate(([sc, n]) => { PX.scene(sc, 5); const o = {}; for (const ph of PX.PHASES) { PX.phase(ph); o[ph] = PX.ms(n); } return o; }, [sc, N]);
      rows.push([gfx, sc, ...Object.keys(r).map(k => r[k].med + ' / ' + r[k].p90)]);
    }
    if (page.errors.length) console.log('Fehler im Spiel:', page.errors.slice(0, 2));
    await Promise.race([page.ctx.close(), new Promise(r => setTimeout(r, 5000))]);
  }
  console.log('Bildzeit draw() in ms, Median / 90. Perzentil aus ' + N + ' Aufrufen: Erkundung | Ueberfall | Polizei');
  for (const r of rows) console.log(r[0].padEnd(8) + r[1].padEnd(8) + r.slice(2).map(s => s.padEnd(14)).join(' '));
  await Promise.race([env.browser.close(), new Promise(r => setTimeout(r, 5000))]);
  env.srv.close(); process.exit(0);
})();
