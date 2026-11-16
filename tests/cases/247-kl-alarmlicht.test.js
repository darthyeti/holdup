// Kloetzchen-Stil, Alarmlicht (Ticket 247): feste Rundumleuchten an den Waenden (aus dem Raster, gleich bei jedem Spieler), nicht mehr die naechsten Deckenlampen. Die naechsten KC.alarm.n leuchten, die anderen
// blenden weich aus, nichts springt beim Gehen. Kein Pixelvergleich, ohne WebGL 2 uebersprungen.
const { glPage } = require('../glshare');
const lib = require('../lib');
module.exports = [{
  name: 'Alarmlicht: feste Leuchten an Waenden (Abstand, Zahl, Mauer im Ruecken), beim Gehen bleiben die Plaetze gleich, hoechstens n leuchten, Aus- und Einblenden ohne Sprung',
  timeout: 240000,
  async run(t) {
    const P = await glPage(t); if (!P) return;
    try {
      await lib.loadInpage(P.page, 'bild.js');
      const r = await P.page.evaluate(`(async () => { const D = __dbg, o = {}; D.view3d.kstil = 1; const i0 = await D.view3d.set(true); if (i0.state !== 'an') return { i0 };
        for (const sc of ['bank', 'museum']) {
          PX.scene(sc, 5); PX.phase('ueberfall'); const g = D.get(), me = g.me, W = D.world(), L = D.LAY(), V = D.view3d.V, K = V.kl(), b = L.bld; D.draw();
          const pos = () => K.beacons.map(q => [Math.round(q.x), Math.round(q.y)]).join(';'), p0 = pos(), T = 32, path = []; const y = Math.floor((b.y0 + b.y1) / 2); for (let x = b.x0 + 2; x < b.x1 - 1; x++) if (!W.isSol(x, y)) path.push([x * T + 16, y * T + 16]);
          let maxStep = 0, maxLit = 0, prev = null, moved = true;
          for (const p of path) for (let k = 0; k < 6; k++) { me.x = p[0]; me.y = p[1]; me.vx = me.vy = 0; me.hp = 1e9; D.update(1 / 30); D.draw(); const f = K.beacons.map(q => q.fade); if (prev) maxStep = Math.max(maxStep, ...f.map((v, i) => Math.abs(v - prev[i]))); prev = f; maxLit = Math.max(maxLit, f.filter(v => v > .5).length); if (pos() !== p0) moved = false; }
          const walls = K.beacons.filter(q => { const tx = Math.floor((q.x + q.nx * 11.5) / T), ty = Math.floor((q.y + q.ny * 11.5) / T); return W.cell(tx - q.nx, ty - q.ny) === '#' }).length, sp = [];
          for (let i = 0; i < K.beacons.length; i++) for (let j = i + 1; j < K.beacons.length; j++) sp.push(Math.hypot(K.beacons[i].x - K.beacons[j].x, K.beacons[i].y - K.beacons[j].y) / T);
          o[sc] = { n: K.beacons.length, same: moved, maxStep: Math.round(maxStep * 100) / 100, maxLit, walls, minGap: Math.round(Math.min(...sp, 99) * 10) / 10, err: V.info().err, lights: V.info().light ? 1 : 0 };
        }
        await D.view3d.set(false); return o; })()`);
      if (r.i0) { t.note('3D nicht verfuegbar'); return; }
      t.note(JSON.stringify(r));
      for (const sc of ['bank', 'museum']) { const q = r[sc];
        t.ok(q.err === '', sc + ': keine Fehler');
        t.ok(q.n >= 3 && q.n <= 16, sc + ': ' + q.n + ' feste Leuchten (3 bis 16)');
        t.ok(q.same, sc + ': die Plaetze bleiben beim Gehen gleich');
        t.ok(q.walls === q.n, sc + ': jede Leuchte hat eine Mauer im Ruecken (' + q.walls + ' von ' + q.n + ')');
        t.ok(q.minGap >= 7.9, sc + ': Mindestabstand ' + q.minGap + ' Kacheln');
        t.ok(q.maxLit <= 4, sc + ': hoechstens vier leuchten gleichzeitig (' + q.maxLit + ')');
        t.ok(q.maxStep < .5, sc + ': Ein- und Ausblenden ohne Sprung (groesster Schritt ' + q.maxStep + ')'); }
      if (P.page.errors.length) t.ok(false, 'JS-Fehler: ' + P.page.errors.slice(0, 2).join(' | '));
    } finally { await P.done(); }
  },
}];
