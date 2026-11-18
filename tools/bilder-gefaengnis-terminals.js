// Ticket 298: Abnahmebilder der Bedienteile im Gefaengnis (Zellen-Pult, Gitter-Pult, Kamera-Hauptschalter, Kartenleser), 2D und 3D. Aufruf:
//   cd tests && HOLDUP_CHROME=/opt/pw-browsers/chromium node ../tools/bilder-gefaengnis-terminals.js [ausgabeordner] (SEED=5, NAME=terminals.jpg, OPEN=1 zeigt alles offen)
const path = require('path'), fs = require('fs'), { execFileSync } = require('child_process');
const lib = require(path.join(__dirname, '..', 'tests', 'lib'));
const OUT = process.argv[2] || path.join(lib.ROOT, 'docs', 'bilder', 'gefaengnis-terminals'), tmp = fs.mkdtempSync(path.join(require('os').tmpdir(), 'gt-'));
fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const env = await lib.launch({ webgl: true });
  const page = await lib.openGame(env, { still: true, gfx: 'hoch' });
  await lib.loadInpage(page, 'bild.js');
  await page.evaluate(async (seed) => { await __dbg.view3d.set(true); PX.scene('prison', seed); PX.phase('erkundung'); __dbg.LAY().theme.tod = 'mittag'; __dbg.view3d.reset(); await __dbg.view3d.set(true); }, +(process.env.SEED || 5));
  const spots = await page.evaluate(() => { const L = __dbg.LAY(), R = L.prison, g = R.locks.find(l => l.id === 'gi'), rd = g.ops[0].at; return { wach: [(R.sws.wach.at[0] + .5) * 32, (R.sws.wach.at[1] + .5) * 32], kon: [(R.sws.kon.at[0] + .5) * 32, (R.sws.kon.at[1] + .5) * 32], cam: [L.sw.x, L.sw.y], rdr: [(rd[0] + .5) * 32, (rd[1] + 1) * 32] }; });
  console.log(JSON.stringify(spots));
  const files = [];
  for (const mode of ['3d', '2d']) for (const k of ['wach', 'kon', 'cam', 'rdr']) {
    const sp = spots[k];
    await page.evaluate(async ([mode, x, y, open]) => {
      const D = __dbg; await D.view3d.set(mode === '3d'); const m = D.get().me;
      if (open) { const R = D.LAY().prison; D.get().its.filter(i => i.t === 'lsw').forEach(i => i.act(m)); }
      m.x = x; m.y = y + 58; m.vx = m.vy = 0; for (let i = 0; i < 60; i++) D.update(1 / 30); D.draw(); D.draw();
    }, [mode, sp[0], sp[1], !!process.env.OPEN]);
    const f = path.join(tmp, mode + '-' + k + '.jpg');
    if (mode === '3d') { const bb = await (await page.$('main')).boundingBox(); const c = await page.evaluate(([x, y]) => { const V = __dbg.view3d.V, q = V.info().q || 1, s = V.toScr(x, y + 10, 10); return [s[0] * q / V.el.width, s[1] * q / V.el.height]; }, [sp[0], sp[1]]); await page.screenshot({ path: f, type: 'jpeg', quality: 92, clip: bb }); fs.writeFileSync(f + '.c', [c[0] * bb.width, c[1] * bb.height].join(',')); }
    else { const bb = await (await page.$('main')).boundingBox(); await page.screenshot({ path: f, type: 'jpeg', quality: 92, clip: bb }); fs.writeFileSync(f + '.c', [bb.width / 2, bb.height * 232 / 544].join(',')); }
    files.push(f);
  }
  execFileSync('python3', ['-I', '-c', `import sys
from PIL import Image
out=sys.argv[1]; fs=sys.argv[2:]; tiles=[]
for f in fs:
    im=Image.open(f).convert("RGB"); cx,cy=[float(v) for v in open(f+".c").read().split(",")]; h=int(110*(im.width/960)); b=(int(max(0,min(im.width-2*h,cx-h))),int(max(0,min(im.height-int(1.2*h),cy-.6*h))),0,0); b=(b[0],b[1],b[0]+2*h,b[1]+int(1.2*h)); tiles.append(im.crop(b).resize((520,312),Image.LANCZOS))
S=Image.new("RGB",(520*4+30,312*2+10),(255,255,255))
for i,t in enumerate(tiles): S.paste(t,((i%4)*530,(i//4)*322))
S.save(out,quality=88)`, path.join(OUT, process.env.NAME || 'terminals.jpg'), ...files]);
  console.log('fertig'); process.exit(0);
})().catch(e => { console.error(e); process.exit(1) });
