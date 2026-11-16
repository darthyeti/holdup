// Ticket 246: Zielcursor in 3D (Fadenkreuz, davor mit Bodenring), Ausschnitt um die Maus, Spielkamera mit HUD, Tag. Aufruf:
//   cd tests && HOLDUP_CHROME=<Chromium> node ../tools/bilder-cursor.js <Ausgabedatei.jpg>
// Mit einem alten Stand (git stash) laufen lassen fuer das Vorher-Bild, danach Nachher-Bild, beide nebeneinander mit PIL (siehe docs/bilder/stil-kloetzchen/zielcursor-vorher-nachher.jpg).
const path = require('path'), fs = require('fs'), { execFileSync } = require('child_process');
const lib = require(path.join(__dirname, '..', 'tests', 'lib'));
const OUT = process.argv[2] || 'cursor.jpg';
(async () => {
  const env = await lib.launch({ webgl: true });
  const page = await lib.openGame(env, { still: true, gfx: 'hoch' });
  await lib.loadInpage(page, 'bild.js');
  await page.evaluate(async () => { __dbg.view3d.kstil = 1; await __dbg.view3d.set(true) });
  const m = await page.evaluate(() => { const D = __dbg; PX.scene('bank', 5); PX.phase('ueberfall'); const me = D.get().me; me.hp = 100; me.armed = true; D.get().en.length = 0; D.mouse.sx = 640; D.mouse.sy = 330; D.mouse.t = D.get().time; D.draw(); D.draw(); return [D.mouse.sx, D.mouse.sy] });
  const bb = await (await page.$('main')).boundingBox(), f = OUT;
  await page.screenshot({ path: f, type: 'jpeg', quality: 92, clip: bb });
  const sc = bb.width / 960, cx = m[0] * sc, cy = m[1] * sc + 36;   // Kopfzeile der Seite
  execFileSync('python3', ['-I', '-c', 'import sys\nfrom PIL import Image\nf=sys.argv[1]; cx=float(sys.argv[2]); cy=float(sys.argv[3])\nim=Image.open(f).convert("RGB"); w=130; h=100\nb=(int(max(0,cx-w)),int(max(0,cy-h)))\nim=im.crop((b[0],b[1],b[0]+2*w,b[1]+2*h)); im=im.resize((im.width*3,im.height*3),Image.LANCZOS); im.save(f,quality=92)', f, String(cx), String(cy)]);
  console.log(f, JSON.stringify(m));
  await env.browser.close(); env.srv.close();
})();
