// Ticket 220: Kein klassischer Rueckfall mehr im Kloetzchen-Stil. Ueber alle Szenarien, Seeds 3 und 5 und die Phasen Erkundung und Ueberfall (die Polizei-Phase misst tools/zaehler-klassisch.js, hier zu lang)
// meldet der Zaehler, welche Arten nicht vom Register gezeichnet werden: Figuren, Fahrzeuge, Szenario-Teile und Kacheln mit Koerper ohne Bauer (ausser der gewollt schlichten Welt, KL.plain). Erwartet: nichts.
// Dazu die Registerlisten: jede Art von V3CFG.scen.kinds hat einen Bauer. Ohne WebGL 2 uebersprungen.
const { glPage } = require('../glshare');
module.exports = [{
  name: 'Klassischer Rueckfall: Zaehler ueber alle Szenarien, Seeds 3 und 5, Erkundung und Ueberfall meldet keine Art ohne Kloetzchen-Bauer',
  timeout: 900000, slow: true,
  async run(t) {
    const P = await glPage(t, { gfx: 'mittel', still: true }); if (!P) return;
    try {
      await require('../lib').loadInpage(P.page, 'bild.js');
      await P.page.evaluate(async () => { __dbg.view3d.kstil = 1; await __dbg.view3d.set(true) });
      const miss = { fig: new Set(), car: new Set(), scen: new Set(), tile: new Set() }, tris = [], errs = [];
      for (const sc of ['bank', 'truck', 'jewel', 'gas', 'museum', 'casino', 'nb', 'prison']) for (const sd of [3, 5]) {
        await P.page.evaluate(([sc, sd]) => { PX.scene(sc, sd); const K = __dbg.view3d.V.kl(); window.__rec = {}; if (!K._w) { K._w = 1; const o0 = K.sceneBuilder; K.sceneBuilder = o => { const b = o0(o); if (!b) window.__rec[o.k + (o.n ? ':' + o.n : '')] = 1; return b } } }, [sc, sd]);
        for (const ph of ['erkundung', 'ueberfall']) {
          const r = await P.page.evaluate(([ph]) => { window.__rec = {}; PX.phase(ph); __dbg.draw(); __dbg.draw(); const V = __dbg.view3d.V, i = V.info(), KL = V.kl().KL;
            return { figs: i.fi.map(f => f[0] + '/' + f[1]), cars: Object.keys(i.ck).filter(k => !KL.hasCar(k)), scen: Object.keys(window.__rec), tiles: Object.keys(i.cells).filter(c => c.length === 1 && !KL.hasObj(c) && !KL.plain.has(c)), tris: i.tris, err: i.err } }, [ph]);
          r.figs.forEach(f => miss.fig.add(f)); r.cars.forEach(f => miss.car.add(f)); r.scen.forEach(f => miss.scen.add(f)); r.tiles.forEach(f => miss.tile.add(f)); tris.push([sc, sd, ph, r.tris]); if (r.err) errs.push(sc + ' ' + r.err);
        }
      }
      const mx = tris.reduce((a, b) => b[3] > a[3] ? b : a);
      t.note('Dreiecke hoechstens ' + mx[3] + ' (' + mx.slice(0, 3).join('/') + ')');
      t.eq([...miss.fig], [], 'Figuren im klassischen Rueckfall'); t.eq([...miss.car], [], 'Fahrzeuge im klassischen Rueckfall'); t.eq([...miss.scen], [], 'Szenario-Teile im klassischen Rueckfall'); t.eq([...miss.tile], [], 'Kacheln mit Koerper ohne Bauer');
      t.eq(errs, [], 'keine Fehler'); t.ok(mx[3] < 150000, 'Dreiecke unter 150.000');
      const KLs = await P.page.evaluate(() => { const KL = __dbg.view3d.V.kl().KL, kinds = Object.keys(__dbg.view3d.V.cfg.scen.kinds); return kinds.filter(k => !KL.hasObj(k) && !Object.keys(KL.objs).some(o => o.startsWith(k + ':'))) });
      t.eq(KLs, [], 'Arten von V3CFG.scen.kinds ohne Bauer');
      if (P.page.errors.length) t.ok(false, 'JS-Fehler: ' + P.page.errors.slice(0, 2).join(' | '));
    } finally { await P.done(); }
  },
}];
