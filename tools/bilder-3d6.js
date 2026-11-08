// 3D-6 (Ticket 155): Abnahmebilder je Szenario in 3D (docs/bilder/plan-3d/3d6-<szenario>.jpg). Stellt die Szene wie tests/inpage/bild.js her (feste Karte Seed 5, Strasse im Sueden),
// sucht eine freie Stelle mit Sicht auf die Besonderheit des Szenarios und speichert das Bild der Seite (WebGL-Leinwand mit HUD). Nur Darstellung, kein Test.
// Aufruf: cd tests && HOLDUP_CHROME=/opt/pw-browsers/chromium node ../tools/bilder-3d6.js [szenarien] [ordner] [phase]
const path = require('path');
const lib = require(path.join(__dirname, '..', 'tests', 'lib'));
const SCS = (process.argv[2] || 'bank,truck,jewel,gas,museum,casino,nb,prison').split(',');
const OUT = process.argv[3] || path.join(lib.ROOT, 'docs', 'bilder', 'plan-3d');
const PH = process.argv[4] || '';
(async () => {
  const env = await lib.launch({ webgl: true });
  const page = await lib.openGame(env, { still: true, gfx: 'mittel' });
  await lib.loadInpage(page, 'bild.js');
  await page.evaluate(async () => { await __dbg.view3d.set(true); });
  for (const sc of SCS) {
    const r = await page.evaluate(([sc, PH]) => {
      const D = __dbg, T = 32; PX.scene(sc, 5);
      const ph = PH || { truck: 'ueberfall', nb: 'ueberfall' }[sc] || 'erkundung'; PX.phase(ph);
      const L = D.LAY(), g = D.get(), me = g.me, W = D.world();
      // Ziel je Szenario: die Besonderheit, auf die das Bild schaut
      let tg;
      if (L.truck) { const t = D.tk(); tg = [t.x, t.y]; }
      else if (L.nb) tg = [(L.nb.rig[0] + 1) * T, (L.nb.rig[1] + 1) * T];
      else if (L.prison) { const c = L.prison.locks[0].cells[0]; tg = [c[0] * T + 16, c[1] * T + 16]; }
      else if (L.lasers) { const l = L.lasers[0]; tg = [(l[0] + l[2]) / 2 * T, (l[1] + l[3]) / 2 * T]; }
      else if (L.pumps) { const q = L.pumps[0]; tg = [q.x * T + 16, q.y * T + 16]; }
      else if (L.casino) { const s = g.its.find(i => i.t === 'good'); tg = [s.x, s.y]; }
      else if (L.jewel) tg = [L.vit[0].x, L.vit[0].y];
      else { const v = L.vault.door; tg = [v[0] * T + 16, v[1] * T + 32]; }
      const free = (x, y) => { const c = W.cell(Math.floor(x / T), Math.floor(y / T)); return !W.isSol(Math.floor(x / T), Math.floor(y / T)) && c !== 'v'; };
      let best = null;
      for (const r of [90, 120, 150, 180, 220]) { for (let k = 0; k < 16 && !best; k++) { const a = Math.PI / 2 + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * Math.PI / 8, x = tg[0] + Math.cos(a) * r, y = tg[1] + Math.sin(a) * r; if (free(x, y) && D.los(x, y, tg[0], tg[1])) best = [x, y]; } if (best) break; }
      best = best || [me.x, me.y];
      for (let k = 0; k < 30; k++) { me.x = best[0]; me.y = best[1]; me.vx = me.vy = 0; me.hp = 100; me.a = Math.atan2(tg[1] - best[1], tg[0] - best[0]); D.update(1 / 30); }
      D.mouse.t = -999; D.draw(); D.draw();
      const i = D.view3d.V.info(); return { tg, best, ph, scen: i.scen, calls: i.calls, err: i.err };
    }, [sc, PH]);
    const el = await page.$('main');
    const f = path.join(OUT, '3d6-' + sc + (PH ? '-' + PH : '') + '.jpg');
    await page.screenshot({ path: f, type: 'jpeg', quality: 82, clip: await el.boundingBox() });
    console.log(sc, r.ph, JSON.stringify(r));
  }
  if (page.errors.length) console.log('Fehler', page.errors.slice(0, 3));
  await env.browser.close(); env.srv.close();
})();
