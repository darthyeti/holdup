// Bildzeit-Messung (Ticket 143, Auslagern Schritt 4a): Millisekunden je draw() je Szenario und Phase, Median und 90. Perzentil.
// Aufruf: HOLDUP_CHROME=<Chromium> node tools/messung-bildzeit.js [stufe ...] [--n=40] [--3d]
// --ohne-schatten (Ticket 154): mit --3d die Schatten der 3D-Ansicht aus (V3OPT, sonst Auto: an ab Stufe mittel).
// --3d (Ticket 149): 3D-Ansicht an (__dbg.view3d), je Bild wird auf die Grafikkarte gewartet (ein Pixel der WebGL-Leinwand gelesen), im Container rendert SwiftShader in Software, Werte nur relativ zu 2D.     (Stufe niedrig, mittel, hoch, Standard: mittel; im Ordner tests/ muss npm install gelaufen sein)
// Gleiche Szenen wie der Pixel-Hash-Test (tests/inpage/bild.js, Seed 5, Strasse S), die Spielschleife steht still, gemessen wird nur draw() bei unveraendertem Zustand.
// Headless-Chromium ohne GPU (--disable-accelerated-2d-canvas), auf dem Mac mit GPU ist es deutlich weniger. Vergleichbar sind nur Messungen auf derselben Maschine, ohne andere Last. Ausgangswerte: docs/tests-und-messwerte.md.
const lib = require('../tests/lib.js');
const args = process.argv.slice(2), N = +((args.find(a => a.startsWith('--n=')) || '--n=40').slice(4)), levels = args.filter(a => !a.startsWith('--')), D3 = args.includes('--3d'), NOSH = args.includes('--ohne-schatten');
if (!levels.length) levels.push('mittel');

(async () => {
  const env = await lib.launch();
  const rows = [];
  for (const gfx of levels) {
    const page = await lib.openGame(env, { det: true, gfx, still: true });
    await lib.loadInpage(page, 'bild.js');
    if (D3) { const i = await page.evaluate(async (nosh) => { if (nosh && typeof V3OPT !== 'undefined') while (V3OPT.shadow !== 'aus') V3OPT.cycleShadow(); const i = await __dbg.view3d.set(true); const q = document.createElement('canvas').getContext('2d', { willReadFrequently: true }); window.PX_SYNC = () => { const V = __dbg.view3d.V; if (V && V.shown) { q.drawImage(V.el, 0, 0, 1, 1); q.getImageData(0, 0, 1, 1); } }; return i; }, NOSH); if (i.state !== 'an') { console.log('3D nicht an: ' + JSON.stringify(i)); process.exit(1); } console.log('3D an: ' + i.gl + ', ' + i.gpu + (NOSH ? ', Schatten aus' : '')); }
    for (const sc of ['bank', 'truck', 'jewel', 'gas', 'museum', 'casino', 'nb', 'prison']) {
      const r = await page.evaluate(([sc, n]) => { PX.scene(sc, 5); const o = {}; for (const ph of PX.PHASES) { PX.phase(ph); o[ph] = PX.ms(n); } return o; }, [sc, N]);
      rows.push([gfx, sc, ...Object.keys(r).map(k => r[k].med + ' / ' + r[k].p90)]);
    }
    if (page.errors.length) console.log('Fehler im Spiel:', page.errors.slice(0, 2));
    await Promise.race([page.ctx.close(), new Promise(r => setTimeout(r, 5000))]);
  }
  console.log((D3 ? '3D an. ' : '') + 'Bildzeit draw() in ms, Median / 90. Perzentil aus ' + N + ' Aufrufen: Erkundung | Ueberfall | Polizei');
  for (const r of rows) console.log(r[0].padEnd(8) + r[1].padEnd(8) + r.slice(2).map(s => s.padEnd(14)).join(' '));
  await Promise.race([env.browser.close(), new Promise(r => setTimeout(r, 5000))]);
  env.srv.close(); process.exit(0);
})();
