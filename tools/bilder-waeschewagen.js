// Ticket 297: Abnahmebild des Waeschewagens im Gefaengnis (oben 3D, unten 2D, links leer, rechts mit Insasse), Tag, ein Seed. Aufruf:
//   cd tests && HOLDUP_CHROME=/opt/pw-browsers/chromium node ../tools/bilder-waeschewagen.js [ausgabedatei] (SEED=5)
const path = require('path'), fs = require('fs'), { execFileSync } = require('child_process');
const lib = require(path.join(__dirname, '..', 'tests', 'lib'));
const OUT = process.argv[2] || path.join(lib.ROOT, 'docs', 'bilder', 'waeschewagen-gefaengnis.jpg'), tmp = fs.mkdtempSync(path.join(require('os').tmpdir(), 'ww-'));
(async () => {
  const env = await lib.launch({ webgl: true });
  const page = await lib.openGame(env, { still: true, gfx: 'hoch' });
  await lib.loadInpage(page, 'bild.js');
  await page.evaluate(async (seed) => { await __dbg.view3d.set(true); PX.scene('prison', seed); PX.phase('erkundung'); __dbg.LAY().theme.tod = 'mittag'; __dbg.view3d.reset(); await __dbg.view3d.set(true); }, +(process.env.SEED || 5));
  const files = [];
  for (const mode of ['3d', '2d']) for (const done of [false, true]) {
    await page.evaluate(async ([mode, done]) => {
      const D = __dbg; await D.view3d.set(mode === '3d'); const m = D.get().me, R = D.LAY().prison, c = [(R.cart[0] + .5) * 32, (R.cart[1] + .5) * 32]; D.CFG.policeAt = 1e6;
      if (m.cv) D.relCart(m); D.cartAt(c[0], c[1]); m.x = c[0] + 46; m.y = c[1] + 30; m.a = Math.PI; if (done) { m.x = c[0]; m.y = c[1]; D.get().its.find(i => i.t === 'cin').act(m); }
      m.vx = m.vy = 0; for (let i = 0; i < 20; i++) D.update(1 / 30); D.draw(); D.draw();
    }, [mode, done]);
    const f = path.join(tmp, mode + (done ? 'b' : 'a') + '.jpg');
    if (mode === '3d') { const r = await page.evaluate(() => { const D = __dbg; D.draw(); const V = D.view3d.V, q = V.info().q || 1, w = D.cart(), s = V.toScr(w.x, w.y, 10); return { u: V.el.toDataURL('image/jpeg', .93), c: [s[0] * q, s[1] * q] } }); fs.writeFileSync(f, Buffer.from(r.u.split(',')[1], 'base64')); fs.writeFileSync(f + '.c', r.c.join(',')); }
    else { const bb = await (await page.$('main')).boundingBox(); await page.screenshot({ path: f, type: 'jpeg', quality: 92, clip: bb }); fs.writeFileSync(f + '.c', [bb.width / 2, bb.height / 2 - 30].join(',')); }
    files.push(f);
  }
  await env.close && env.close();
  execFileSync('python3', ['-I', '-c', `import sys
from PIL import Image
out=sys.argv[1]; fs=sys.argv[2:]; tiles=[]
for f in fs:
    im=Image.open(f).convert("RGB"); cx,cy=[float(v) for v in open(f+".c").read().split(",")]; h=im.width/6; k=im.width/960 if f.endswith("a.jpg") or f.endswith("b.jpg") else 1
    h=int(130*(im.width/960)); b=(int(max(0,min(im.width-2*h,cx-h))),int(max(0,min(im.height-int(1.2*h),cy-.6*h))),0,0); b=(b[0],b[1],b[0]+2*h,b[1]+int(1.2*h)); tiles.append(im.crop(b).resize((520,312),Image.LANCZOS))
S=Image.new("RGB",(520*2+10,312*2+10),(255,255,255))
for i,t in enumerate(tiles): S.paste(t,((i%2)*530,(i//2)*322))
S.save(out,quality=88)`, OUT, ...files]);
  console.log(OUT); process.exit(0);
})().catch(e => { console.error(e); process.exit(1) });
