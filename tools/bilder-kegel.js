// Ticket 203: Bilder des Kamera-Sichtkegels in 3D (Vorher-nachher). Aufruf:
//   cd <Projektordner>/tests && HOLDUP_CHROME=<Chromium> HOLDUP_ROOT=<Projektordner mit dem zu pruefenden Stand> node ../tools/bilder-kegel.js <Ausgabedatei.jpg> <szene gas|museum> <lage abend|nacht|tag> <stil 0|1> [alarm 0|1] [seed]
// Das Bild ist die Spielansicht (HUD und Kegel liegen auf dem HUD) mit dem Spieler im Blickfeld der ersten Kamera, ausgeschnitten um die Kamera. alarm 1: die Kamera hat entdeckt (c.alert).
const path = require('path'), fs = require('fs'), { execFileSync } = require('child_process');
const ROOT = process.env.HOLDUP_ROOT || path.join(__dirname, '..');
const lib = require(path.join(ROOT, 'tests', 'lib'));
const [OUT, SC = 'gas', LAGE = 'abend', STIL = '1', AL = '1', SEED = '3'] = process.argv.slice(2);
(async () => {
  const env = await lib.launch({ webgl: true });
  const page = await lib.openGame(env, { still: true, gfx: process.env.GFX || 'hoch' });
  await lib.loadInpage(page, 'bild.js');
  const r = await page.evaluate(async ([sc, lage, kl, al, seed]) => {
    const D = __dbg; await D.view3d.set(true);
    PX.scene(sc, +seed); D.CFG.vanLock = 0; PX.phase('erkundung'); D.get().me.hp = 100;
    const L = D.LAY(); if (lage !== 'tag') { L.mission.lg = (L.mission.lg || []).concat(lage); D.view3d.reset(); await D.view3d.set(true); }
    const g = D.get(), c = g.cams[0], W = D.world(), T = 32; if (!c) return { err: 'keine Kamera' };
    c.k = true; c.off = false; let best = null;
    for (let r = 80; r <= 220 && !best; r += 20) for (let k = 0; k < 24 && !best; k++) { const a = c.ang != null ? c.ang + (k % 2 ? 1 : -1) * Math.floor(k / 2) * .08 : k / 24 * 6.283, x = c.x + Math.cos(a) * r, y = c.y + Math.sin(a) * r; if (!W.isSol(Math.floor(x / T), Math.floor(y / T)) && D.los(x, y, c.x, c.y)) best = [x, y] }
    if (best) { g.me.x = best[0]; g.me.y = best[1]; for (let i = 0; i < 40; i++) { g.me.hp = 100; D.update(1 / 30) } }
    if (+al) c.alert = 5; D.draw(); D.draw();
    const s = D.view3d.V.toScr(c.x, c.y, 56); return { cam: s, me: best, err: D.view3d.V.info().err };
  }, [SC, LAGE, STIL, AL, SEED]);
  console.log(JSON.stringify(r));
  const bb = await (await page.$('main')).boundingBox(), f = OUT.replace(/\.jpg$/, '') + '-voll.jpg';
  await page.screenshot({ path: f, type: 'jpeg', quality: 90, clip: bb });
  const cx = r.cam ? r.cam[0] : bb.width / 2, cy = r.cam ? r.cam[1] : bb.height / 2, w = 560, h = 340;
  execFileSync('python3', ['-I', '-c', 'import sys\nfrom PIL import Image\nf,o=sys.argv[1],sys.argv[2]; cx,cy,w,h=[float(v) for v in sys.argv[3:7]]\nim=Image.open(f).convert("RGB"); x0=int(max(0,min(im.width-w,cx-w*.35))); y0=int(max(0,min(im.height-h,cy-h*.25)))\nim.crop((x0,y0,x0+int(w),y0+int(h))).save(o,quality=90)', f, OUT, cx, cy, w, h]);
  fs.unlinkSync(f);
  if (page.errors.length) console.log('Fehler', page.errors.slice(0, 3));
  await env.browser.close(); env.srv.close();
})();
