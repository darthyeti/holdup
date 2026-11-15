// Kameraabdeckung (Ticket 221): Anteil der begehbaren Bodenkacheln im Gebaeude (Zeichen '.'), die von mindestens einer Kamera gesehen werden (Entfernung <= rng, Blickwinkel innerhalb fov plus Schwung amp
// um a0, freie Sicht per los), und Zahl der Kameras ohne Mauer im Ruecken (gleiche Regel wie validateMap). Je Szenario ueber Seeds 1 bis N. Aufruf: HOLDUP_CHROME=<Chromium> node tools/messung-kamera.js [N=200]
const path = require('path');
const lib = require(path.join(__dirname, '..', 'tests', 'lib'));
const N = +(process.argv[2] || 200);
(async () => {
  const env = await lib.launch({});
  const page = await lib.openGame(env);
  await lib.loadInpage(page, 'bild.js');
  const r = await page.evaluate((N) => {
    const D = __dbg, T = 32, out = {}, wall = q => q === '#' || q === 'P' || q === 'V';
    for (const sc of ['bank', 'jewel', 'gas', 'museum', 'casino', 'nb', 'prison']) {
      const o = { maps: 0, cams: 0, free: 0, cov: 0, covMin: 1, covMax: 0 };
      for (let sd = 1; sd <= N; sd++) {
        try { PX.scene(sc, sd); } catch (e) { break; }
        const L = D.LAY(), W = D.world(), cams = L.cams || []; if (!cams.length) continue; o.maps++; o.cams += cams.length;
        for (const c of cams) { const tx = Math.floor(c.x / T), ty = Math.floor(c.y / T), dx = Math.cos(c.a0), dy = Math.sin(c.a0); if (!((Math.abs(dx) > .38 && wall(W.cell(tx - Math.sign(dx), ty))) || (Math.abs(dy) > .38 && wall(W.cell(tx, ty - Math.sign(dy)))))) o.free++; }
        let tot = 0, seen = 0;
        for (let y = -8; y < 60; y++) for (let x = -8; x < 70; x++) {
          if (W.cell(x, y) !== '.') continue; tot++; const px = x * T + 16, py = y * T + 16;
          for (const c of cams) { const d = Math.hypot(px - c.x, py - c.y); if (d > c.rng) continue; let a = Math.atan2(py - c.y, px - c.x) - c.a0; while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; if (Math.abs(a) > c.fov + c.amp) continue; if (D.los(c.x, c.y, px, py)) { seen++; break; } }
        }
        const f = tot ? seen / tot : 0; o.cov += f; o.covMin = Math.min(o.covMin, f); o.covMax = Math.max(o.covMax, f);
      }
      o.cov = o.maps ? Math.round(o.cov / o.maps * 1000) / 1000 : 0; o.covMin = Math.round(o.covMin * 1000) / 1000; o.covMax = Math.round(o.covMax * 1000) / 1000; o.camsPer = o.maps ? Math.round(o.cams / o.maps * 100) / 100 : 0;
      out[sc] = o;
    }
    return out;
  }, N);
  console.log('Kameraabdeckung, Seeds 1 bis ' + N + ': Karten, Kameras je Karte, ohne Mauer im Ruecken, mittlere Abdeckung (min bis max)');
  for (const [sc, o] of Object.entries(r)) console.log((sc + '          ').slice(0, 8), String(o.maps).padStart(4), String(o.camsPer).padStart(6), String(o.free).padStart(6), (o.cov * 100).toFixed(1).padStart(6) + ' %', '(' + (o.covMin * 100).toFixed(0) + ' bis ' + (o.covMax * 100).toFixed(0) + ' %)');
  await page.ctx.close().catch(() => {}); await env.browser.close().catch(() => {}); env.srv.close();
})().catch(e => { console.error(e); process.exit(1); });
