// Bildzeit-Messung (Ticket 143, Auslagern Schritt 4a): Millisekunden je draw() je Szenario und Phase, Median und 90. Perzentil.
// Aufruf: HOLDUP_CHROME=<Chromium> node tools/messung-bildzeit.js [stufe ...] [--n=40] [--3d] [--ohne-schatten] [--lod=0,1,2,3]
// --ohne-schatten (Ticket 154): mit --3d die Schatten der 3D-Ansicht aus (V3OPT, sonst Auto: an ab Stufe mittel).
// --3d (Ticket 149): 3D-Ansicht an (__dbg.view3d), je Bild wird auf die Grafikkarte gewartet (ein Pixel der WebGL-Leinwand gelesen), im Container rendert SwiftShader in Software, Werte nur relativ zu 2D.
//   Seit 3D-9 (Ticket 158) mit Draw Calls und Dreiecken je Szene (info() der Ansicht nach dem letzten Bild, Phase Polizei) und Zeile "Mittel" (Mittel der Mediane ueber alle Szenen).
// --lod=0,1,2,3 (Ticket 158): mit --3d je Stufe der Selbstregelung messen (0 voll, 1 Schatten aus, 2 Aufloesung mal 0,75, 3 Teilchen halbiert), sonst nur Stufe 0. Die Regelung selbst schaltet beim Messen nie (Debug-Wunsch).
// (Grafikstufe niedrig, mittel, hoch, Standard: mittel; im Ordner tests/ muss npm install gelaufen sein)
// Gleiche Szenen wie der Pixel-Hash-Test (tests/inpage/bild.js, Seed 5, Strasse S), die Spielschleife steht still, gemessen wird nur draw() bei unveraendertem Zustand.
// Headless-Chromium ohne GPU (--disable-accelerated-2d-canvas), auf dem Mac mit GPU ist es deutlich weniger. Vergleichbar sind nur Messungen auf derselben Maschine, ohne andere Last. Ausgangswerte: docs/tests-und-messwerte.md.
const lib = require('../tests/lib.js');
const args = process.argv.slice(2), N = +((args.find(a => a.startsWith('--n=')) || '--n=40').slice(4)), levels = args.filter(a => !a.startsWith('--')), D3 = args.includes('--3d'), NOSH = args.includes('--ohne-schatten');
const LODS = D3 ? ((args.find(a => a.startsWith('--lod=')) || '--lod=0').slice(6)).split(',').map(Number) : [0];
if (!levels.length) levels.push('mittel');

(async () => {
  const env = await lib.launch();
  const rows = [];
  for (const gfx of levels) {
    const page = await lib.openGame(env, { det: true, gfx, still: true });
    await lib.loadInpage(page, 'bild.js');
    if (D3) { const i = await page.evaluate(async (nosh) => { if (nosh && typeof V3OPT !== 'undefined') while (V3OPT.shadow !== 'aus') V3OPT.cycleShadow(); const i = await __dbg.view3d.set(true); const q = document.createElement('canvas').getContext('2d', { willReadFrequently: true }); window.PX_SYNC = () => { const V = __dbg.view3d.V; if (V && V.shown) { q.drawImage(V.el, 0, 0, 1, 1); q.getImageData(0, 0, 1, 1); } }; return i; }, NOSH); if (i.state !== 'an') { console.log('3D nicht an: ' + JSON.stringify(i)); process.exit(1); } console.log('3D an: ' + i.gl + ', ' + i.gpu + (NOSH ? ', Schatten aus' : '')); }
    for (const lod of LODS) {
      const sum = [0, 0, 0];
      for (const sc of ['bank', 'truck', 'jewel', 'gas', 'museum', 'casino', 'nb', 'prison']) {
        const r = await page.evaluate(([sc, n, lod, d3]) => { if (d3) __dbg.view3d.reg.lv = lod; PX.scene(sc, 5); const o = {}; for (const ph of PX.PHASES) { PX.phase(ph); o[ph] = PX.ms(n); }
          const i = d3 ? __dbg.view3d.info() : null; return { o, gl: i ? [i.calls, i.tris, i.q, i.light && i.light.shadow ? i.light.shadow.on : 0] : null }; }, [sc, N, lod, D3]);
        const v = Object.keys(r.o).map(k => r.o[k]); v.forEach((q, j) => { sum[j] += q.med; });
        rows.push([gfx + (D3 ? ' L' + lod : ''), sc, ...v.map(q => q.med + ' / ' + q.p90), r.gl ? r.gl[0] + ' Aufrufe, ' + r.gl[1] + ' Dreiecke' + (lod ? '' : '') : '']);
      }
      rows.push([gfx + (D3 ? ' L' + lod : ''), 'Mittel', ...sum.map(x => (x / 8).toFixed(1)), '']);
    }
    if (page.errors.length) console.log('Fehler im Spiel:', page.errors.slice(0, 2));
    await Promise.race([page.ctx.close(), new Promise(r => setTimeout(r, 5000))]);
  }
  console.log((D3 ? '3D an (L Stufe der Selbstregelung). ' : '') + 'Bildzeit draw() in ms, Median / 90. Perzentil aus ' + N + ' Aufrufen: Erkundung | Ueberfall | Polizei' + (D3 ? ' | Draw Calls und Dreiecke (Polizei)' : ''));
  for (const r of rows) console.log(r[0].padEnd(10) + r[1].padEnd(8) + r.slice(2).map(s => String(s).padEnd(14)).join(' '));
  await Promise.race([env.browser.close(), new Promise(r => setTimeout(r, 5000))]);
  env.srv.close(); process.exit(0);
})();
