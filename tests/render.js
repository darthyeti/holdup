// Draufsicht einer Karte als PNG (statische Ebene, Objektebene, dazu Wachrouten, Kameras, Beute, Laser, Zapfsaeulen), zum Ansehen neuer Grundrisse.
// Aufruf: node render.js <szenario> <seed oder Grundrissname> [<szenario> <seed oder Name> ...]
//   node render.js casino Reihen museum Kabinette gas 5
// Mit einem Namen (zum Beispiel Reihen, Ring, Insel, Klassik) nimmt es den ersten Seed, dessen LAY.hall so heisst. Ausgabe nach $HOLDUP_OUT (Standard: <Temp-Ordner>/holdup-render).
// Farben: Wachen rot, gelb, gruen, tuerkis (je Route, dicker Punkt = Start), Wachwechsel magenta, Manager orange, Kameras rosa, Beute tuerkis umrandet, Laser rot, Zapfsaeulen orange, Spielerstart weiss.
const fs = require('fs'), path = require('path'), os = require('os');
const { launch, openGame } = require('./lib');
const OUT = process.env.HOLDUP_OUT || path.join(os.tmpdir(), 'holdup-render');

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const args = process.argv.slice(2), jobs = [];
  for (let i = 0; i + 1 < args.length; i += 2) jobs.push([args[i], args[i + 1]]);
  if (!jobs.length) { console.log('Aufruf: node render.js <szenario> <seed oder Grundrissname> ...'); process.exit(1); }
  const env = await launch(), page = await openGame(env);
  for (const [sc, sd] of jobs) {
    const r = await page.evaluate(([sc, sd]) => {
      const D = __dbg; D.setScenario(sc); D.setSeedMode('random'); D.setLage([]);
      let seed = +sd;
      if (isNaN(seed)) { seed = null; for (let s = 1; s < 3000; s++) if (D.layoutFor(s).hall === sd) { seed = s; break; } if (seed == null) return { err: 'Grundriss nicht gefunden: ' + sd }; }
      D.buildLay(D.layoutFor(seed));
      const L = D.LAY(), w = D.world(), T = 32, B = L.bld, bx0 = Math.max(w.WX0, B.x0 - 3), by0 = Math.max(w.WY0, B.y0 - 3), bx1 = Math.min(w.WX0 + w.W - 1, B.x1 + 7), by1 = Math.min(w.WY0 + w.H - 1, B.y1 + 5), S = Math.min(2, 1700 / ((bx1 - bx0 + 1) * T));
      const c = document.createElement('canvas'); c.width = Math.round((bx1 - bx0 + 1) * T * S); c.height = Math.round((by1 - by0 + 1) * T * S);
      const x = c.getContext('2d'); x.scale(S, S); x.translate(-bx0 * T, -by0 * T);
      x.drawImage(w.st, w.WX0 * T, w.WY0 * T, w.W * T, w.H * T); x.drawImage(w.so, w.WX0 * T, w.WY0 * T, w.W * T, w.H * T);
      const route = (pts, col, start) => { x.strokeStyle = col; x.fillStyle = col; x.beginPath(); pts.forEach((p, i) => { const px = (p[0] + .5) * T, py = (p[1] + .5) * T; i ? x.lineTo(px, py) : x.moveTo(px, py); }); x.closePath(); x.stroke(); pts.forEach((p, i) => { x.beginPath(); x.arc((p[0] + .5) * T, (p[1] + .5) * T, i ? 3 : 6, 0, 6.3); x.fill(); }); };
      x.lineWidth = 1.5; const cols = ['#ff3b30', '#ffcc00', '#34c759', '#00c7ff'];
      (L.guards || []).forEach((g, i) => route(g.route, cols[i % 4]));
      (L.mission.extra || []).forEach(e => { route(e.route, '#ff00ff'); x.fillStyle = '#ff00ff'; x.fillRect(e.p[0] * T + 8, e.p[1] * T + 8, 16, 16); });
      if (L.mgr) route(L.mgr.route, '#ff9500');
      (L.cams || []).forEach(q => { x.fillStyle = '#ff2d55'; x.beginPath(); x.arc(q.x, q.y, 5, 0, 6.3); x.fill(); x.strokeStyle = 'rgba(255,45,85,.6)'; x.beginPath(); x.moveTo(q.x, q.y); x.lineTo(q.x + Math.cos(q.a0) * 40, q.y + Math.sin(q.a0) * 40); x.stroke(); });
      x.lineWidth = 1; x.strokeStyle = '#00ffd0';
      for (const q of (L.goods || []).concat(L.vit || [])) x.strokeRect(q.rc[0], q.rc[1], q.rc[2], q.rc[3]);
      x.lineWidth = 3; x.strokeStyle = '#ff0000'; (L.lasers || []).forEach(q => { x.beginPath(); x.moveTo(q[0] * T, q[1] * T); x.lineTo(q[2] * T, q[3] * T); x.stroke(); });
      x.lineWidth = 2; x.strokeStyle = '#ff7700'; (L.pumps || []).forEach(q => x.strokeRect(q.x * T + 2, q.y * T + 2, T - 4, T - 4));
      x.fillStyle = '#fff'; x.beginPath(); x.arc(L.spawn.x, L.spawn.y, 6, 0, 6.3); x.fill();
      x.fillStyle = 'rgba(255,255,255,.55)'; x.font = '9px sans-serif';
      for (let tx = bx0; tx <= bx1; tx++) if (tx % 2 === 0) x.fillText(tx, tx * T + 1, by0 * T + 9);
      for (let ty = by0; ty <= by1; ty++) if (ty % 2 === 0) x.fillText(ty, bx0 * T + 1, ty * T + 9);
      x.setTransform(1, 0, 0, 1, 0, 0); x.fillStyle = '#fff'; x.font = 'bold 22px sans-serif'; x.fillText(sc + ' #' + seed + ' ' + (L.hall || ''), 10, 24);
      return { png: c.toDataURL('image/png'), seed, hall: L.hall || '' };
    }, [sc, sd]);
    if (r.err) { console.log(r.err); continue; }
    const f = path.join(OUT, sc + '_' + r.seed + '_' + r.hall.replace(/[^A-Za-z0-9]/g, '') + '.png');
    fs.writeFileSync(f, Buffer.from(r.png.split(',')[1], 'base64')); console.log(f);
  }
  if (page.errors.length) console.log('Fehler im Spiel:', page.errors);
  await Promise.race([page.ctx.close(), new Promise(r => setTimeout(r, 5000))]);
  await Promise.race([env.browser.close(), new Promise(r => setTimeout(r, 5000))]);
  env.srv.close(); process.exit(0);
})();
