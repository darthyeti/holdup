// Ticket 220: Zaehler fuer den klassischen Rueckfall im Kloetzchen-Stil. Laeuft ueber alle Szenarien, Seeds und Phasen und meldet, welche Arten NICHT vom Kloetzchen-Register gezeichnet werden:
// Figuren (Art nach typeOf), Fahrzeuge (Art), Szenario-Teile (Art, mit Unterart o.n) und Kachelzeichen mit Koerper in der statischen Welt ohne Kachel-Bauer. Aufruf:
//   cd tests && HOLDUP_CHROME=/opt/pw-browsers/chromium node ../tools/zaehler-klassisch.js [--seeds=3,5] [--szenen=bank,truck,...] [--phasen=erkundung,ueberfall,polizei]
const path = require('path');
const lib = require(path.join(__dirname, '..', 'tests', 'lib'));
const arg = (n, d) => ((process.argv.find(a => a.startsWith('--' + n + '=')) || '').split('=')[1] || d).split(',');
const SC = arg('szenen', 'bank,truck,jewel,gas,museum,casino,nb,prison'), SEEDS = arg('seeds', '3,5').map(Number), PH = arg('phasen', 'erkundung,ueberfall,polizei');
(async () => {
  const env = await lib.launch({ webgl: true });
  const page = await lib.openGame(env, { still: true, gfx: 'mittel' });
  await lib.loadInpage(page, 'bild.js');
  await page.evaluate(async () => { __dbg.view3d.kstil = 1; await __dbg.view3d.set(true); });
  const tot = { fig: {}, car: {}, scen: {}, tile: {}, tileK: {} }, add = (o, k, w) => { o[k] = o[k] || { n: 0, wo: [] }; o[k].n++; if (o[k].wo.indexOf(w) < 0) o[k].wo.push(w) };
  for (const sc of SC) for (const sd of SEEDS) {
    await page.evaluate(([sc, sd]) => { PX.scene(sc, sd); window.__rec = { scen: {}, hit: {} }; const K = __dbg.view3d.V.kl(), o0 = K.sceneBuilder; if (!K._w) { K._w = 1; K.sceneBuilder = o => { const b = o0(o); const k = o.k + (o.n ? ':' + o.n : ''); (b ? window.__rec.hit : window.__rec.scen)[k] = 1; return b }; } }, [sc, sd]);
    for (const ph of PH) {
      const r = await page.evaluate(([ph]) => { window.__rec = { scen: {}, hit: {} }; PX.phase(ph); __dbg.draw(); __dbg.draw(); const V = __dbg.view3d.V, i = V.info(), K = V.kl(), KL = K.KL, D = V.dyn();
        const arts = new Set(), cars = {}; for (const f of i.fi) arts.add(f[0] + '/' + f[1]);
        const carKinds = Object.keys(i.ck).filter(k => !KL.hasCar(k));
        const tiles = Object.keys(i.cells).filter(c => c.length === 1 && !KL.hasObj(c) && !(KL.plain && KL.plain.has(c))).map(c => c + ':' + i.cells[c]), tilesK = Object.keys(i.cells).filter(c => c.length === 1 && KL.hasObj(c));
        return { figs: Array.from(arts), cars: carKinds, scen: Object.keys(window.__rec.scen), classicScen: i.scenN, err: i.err, tris: i.tris, tiles, tilesK, calls: i.calls } }, [ph]);
      const w = sc + '/' + sd + '/' + ph;
      for (const f of r.figs) add(tot.fig, f, w); for (const c of r.cars) add(tot.car, c, w); for (const s of r.scen) add(tot.scen, s, w); for (const t of r.tiles) add(tot.tile, t.split(':')[0], w);
      console.log(w, 'tris', r.tris, 'err', r.err || '-', 'figKlassisch', r.figs.length, 'carKlassisch', r.cars.length, 'scenKlassisch', JSON.stringify(r.scen), 'tileKlassisch', r.tiles.join(' '));
    }
  }
  const out = {}; for (const k in tot) { out[k] = {}; for (const a in tot[k]) out[k][a] = { n: tot[k][a].n, in: tot[k][a].wo.length > 6 ? tot[k][a].wo.slice(0, 6).concat('...') : tot[k][a].wo } }
  console.log('SUMME ' + JSON.stringify(out));
  if (page.errors.length) console.log('Fehler', page.errors.slice(0, 3));
  await env.browser.close(); env.srv.close();
})();
