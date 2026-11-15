// Ticket 198: Pruefbilder je Szenario in der Erkundung, Tag und Nacht, Kloetzchen gegen klassisch (2x2 je Szenario: oben Tag, unten Nacht, links Kloetzchen, rechts klassisch). Aufruf:
//   cd <Projektordner>/tests && HOLDUP_CHROME=<Chromium> HOLDUP_ROOT=<Projektordner mit dem zu pruefenden Stand> node <Ordner mit diesem Werkzeug>/bilder-main-check.js <Ausgabeordner> [phase erkundung|ueberfall]
const path = require('path'), fs = require('fs'), { execFileSync } = require('child_process');
const ROOT = process.env.HOLDUP_ROOT || path.join(__dirname, '..');
const lib = require(path.join(ROOT, 'tests', 'lib'));
const [OUT, PH = 'erkundung'] = process.argv.slice(2);
const SCS = (process.env.SC || 'bank,truck,jewel,gas,museum,casino,nb,prison').split(',');
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const env = await lib.launch({ webgl: true });
  const page = await lib.openGame(env, { still: true, gfx: process.env.GFX || 'hoch' });
  await lib.loadInpage(page, 'bild.js');
  const info = {};
  for (const sc of SCS) {
    const files = [];
    for (const night of [0, 1]) for (const kl of [1, 0]) {
      const r = await page.evaluate(async ([sc, ph, night, kl, SEED, near]) => {
        const D = __dbg; D.view3d.kstil = kl; await D.view3d.set(true);
        PX.scene(sc, SEED); D.CFG.vanLock = 0;
        PX.phase('erkundung'); if (ph !== 'erkundung') PX.phase(ph); D.get().me.hp = 100;
        // Nacht: die Lage nacht gilt in der Karte (LAY.mission.lg), D.setLage greift nicht bei jedem Szenario
        if (night) { const L = D.LAY(); L.mission.lg = (L.mission.lg || []).concat('nacht'); D.view3d.reset(); await D.view3d.set(true); D.draw(); }
        // nahe Kamera: Spieler an eine freie Stelle mit Sicht auf die erste Kamera stellen (zeigt den Sichtkegel)
        if (near) { const g = D.get(), c = g.cams && g.cams[0], W = D.world(), T = 32; if (c) { let best = null; for (let r = 60; r <= 200 && !best; r += 20) for (let k = 0; k < 16 && !best; k++) { const a = k / 16 * 6.283, x = c.x + Math.cos(a) * r, y = c.y + Math.sin(a) * r; if (!W.isSol(Math.floor(x / T), Math.floor(y / T)) && D.los(x, y, c.x, c.y)) best = [x, y] } if (best) { g.me.x = best[0]; g.me.y = best[1]; for (let i = 0; i < 40; i++) { g.me.hp = 100; D.update(1 / 30) } } } }
        D.draw(); D.draw();
        const i = D.view3d.V.info(); return { tod: D.LAY().theme && D.LAY().theme.tod, err: i.err, tris: i.tris, calls: i.calls, k: !!(i.k && i.k.on) };
      }, [sc, PH, night, kl, +(process.env.SEED || 5), !!process.env.NEARCAM]);
      info[`${sc}-${night ? 'nacht' : 'tag'}-${kl ? 'kl' : 'klassisch'}`] = r;
      const bb = await (await page.$('main')).boundingBox(), f = path.join(OUT, `tmp-${sc}-${night}-${kl}.jpg`);
      await page.screenshot({ path: f, type: 'jpeg', quality: 88, clip: bb }); files.push(f);
    }
    // Reihenfolge: Tag Kloetzchen, Tag klassisch, Nacht Kloetzchen, Nacht klassisch
    execFileSync('python3', ['-I', '-c', 'import sys,os\nfrom PIL import Image\nout=sys.argv[1]; fs=sys.argv[2:]\nims=[Image.open(f).convert("RGB") for f in fs]\nw=ims[0].width; h=ims[0].height\nS=Image.new("RGB",(2*w,2*h))\nfor k,i in enumerate(ims): S.paste(i,((k%2)*w,(k//2)*h))\nS.save(out,quality=84)\nfor f in fs: os.remove(f)', path.join(OUT, `main-check-${sc}${process.env.SUF || ''}.jpg`), ...files]);
    console.log(sc, JSON.stringify(Object.fromEntries(Object.entries(info).filter(([k]) => k.startsWith(sc + '-')))));
  }
  if (page.errors.length) console.log('Fehler', page.errors.slice(0, 3));
  await env.browser.close(); env.srv.close();
})();
