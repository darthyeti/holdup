// Ticket 198: Bildbogen aller acht Szenarien im Kloetzchen-Stil (Spielkamera mit HUD, Phase Ueberfall oder Polizei). Aufruf:
//   cd tests && HOLDUP_CHROME=/opt/pw-browsers/chromium node ../tools/bilder-kl-gesamt.js [ordner] [phase ueberfall|polizei]
// Schreibt gesamt-<szenario>.jpg je Szenario und gesamt-bogen.jpg (2 Spalten) nach docs/bilder/stil-kloetzchen/. SwiftShader, Grafik hoch.
const path = require('path'), fs = require('fs'), { execFileSync } = require('child_process');
const lib = require(path.join(__dirname, '..', 'tests', 'lib'));
const [OUT = path.join(lib.ROOT, 'docs', 'bilder', 'stil-kloetzchen'), PH = 'polizei'] = process.argv.slice(2);
const SCS = ['bank', 'truck', 'jewel', 'gas', 'museum', 'casino', 'nb', 'prison'];
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const env = await lib.launch({ webgl: true });
  const page = await lib.openGame(env, { still: true, gfx: process.env.GFX || 'hoch' });
  await lib.loadInpage(page, 'bild.js');
  await page.evaluate(async () => { __dbg.view3d.kstil = 1; await __dbg.view3d.set(true); });
  const files = [];
  for (const sc of SCS) {
    await page.evaluate(([sc, ph]) => { PX.scene(sc, 5); PX.phase('erkundung'); PX.phase('ueberfall'); if (ph === 'polizei') PX.phase('polizei'); const D = __dbg; D.get().me.hp = 100; D.draw(); D.draw(); }, [sc, PH]);
    const bb = await (await page.$('main')).boundingBox(), f = path.join(OUT, `gesamt-${sc}.jpg`);
    await page.screenshot({ path: f, type: 'jpeg', quality: 88, clip: bb }); files.push(f); console.log(f);
  }
  execFileSync('python3', ['-I', '-c', 'import sys\nfrom PIL import Image\nout=sys.argv[1]; fs=sys.argv[2:]\nims=[Image.open(f).convert("RGB") for f in fs]\nw=ims[0].width//2*1; h=ims[0].height//2*1\nims=[i.resize((w,h),Image.LANCZOS) for i in ims]\nS=Image.new("RGB",(2*w,((len(ims)+1)//2)*h))\nfor k,i in enumerate(ims): S.paste(i,((k%2)*w,(k//2)*h))\nS.save(out,quality=88)', path.join(OUT, 'gesamt-bogen.jpg'), ...files]);
  console.log(path.join(OUT, 'gesamt-bogen.jpg'), page.errors.length ? page.errors.slice(0, 3) : 'ohne Fehler');
  await env.browser.close(); env.srv.close();
})();
