// Ticket 198: Bilder des Figurenumrisses bei Nacht (Vorher-nachher). Aufruf:
//   cd <Projektordner>/tests && HOLDUP_CHROME=<Chromium> HOLDUP_ROOT=<Projektordner mit dem zu pruefenden Stand> node ../tools/bilder-umriss.js <Ausgabedatei.jpg> [szene bank] [lage nacht|tag] [stil 0|1]
// Drei Bilder nebeneinander: Spieler auf der Strasse, Spieler im Gebaeude, Gegner im Dunkeln (Polizist ohne Sicht des Spielers im Gebaeude), jeweils ein Ausschnitt um die Figur der Spielkamera mit HUD.
const path = require('path'), fs = require('fs'), { execFileSync } = require('child_process');
const ROOT = process.env.HOLDUP_ROOT || path.join(__dirname, '..');
const lib = require(path.join(ROOT, 'tests', 'lib'));
const [OUT, SC = 'bank', LAGE = 'nacht', STIL = '1'] = process.argv.slice(2);
(async () => {
  const env = await lib.launch({ webgl: true });
  const page = await lib.openGame(env, { still: true, gfx: process.env.GFX || 'hoch' });
  await lib.loadInpage(page, 'bild.js');
  const files = [];
  await page.evaluate(async ([sc, lage, kl]) => {
    const D = __dbg; D.view3d.kstil = +kl; await D.view3d.set(true); PX.scene(sc, 5); D.CFG.vanLock = 0; PX.phase('erkundung'); D.get().me.hp = 1e9;
    const L = D.LAY(); if (lage !== 'tag') { L.mission.lg = (L.mission.lg || []).concat(lage); D.view3d.reset(); await D.view3d.set(true); }
  }, [SC, LAGE, STIL]);
  for (const k of ['strasse', 'innen', 'gegner']) {
    const r = await page.evaluate(async (k) => {
      const D = __dbg, g = D.get(), me = g.me, W = D.world(), T = 32, L = D.LAY(), B = L.bld, free = (x, y) => !W.isSol(Math.floor(x / T), Math.floor(y / T)); g.en.length = 0; me.hp = 1e9;
      const spot = (x0, y0, x1, y1) => { for (let y = y0; y < y1; y += T) for (let x = x0; x < x1; x += T) { let ok = true; for (const dx of [0, 40, 80]) for (const dy of [-T, 0, T]) if (!free(x + dx, y + dy)) ok = false; if (ok) return [x + 16, y + 16] } return null };
      let p = k === 'strasse' ? spot(0, (B.y1 + 2) * T, W.W * T, (B.y1 + 8) * T) : spot((B.x0 + 2) * T, (B.y0 + 2) * T, (B.x1 - 2) * T, (B.y1 - 2) * T);
      if (!p) p = [me.x, me.y]; me.x = p[0]; me.y = p[1]; me.vx = me.vy = 0;
      if (k === 'gegner') { const c = D.mkCop(p[0] + 60, p[1], 'cop'); c.react = -1e9; g.en.push(c) }
      for (let i = 0; i < 30; i++) { me.hp = 1e9; if (k === 'gegner') for (const c of g.en) c.react = -1e9; D.update(1 / 30) }
      D.draw(); D.draw(); const s = D.view3d.V.toScr(me.x + (k === 'gegner' ? 30 : 0), me.y, 20); return { s, err: D.view3d.V.info().err };
    }, k);
    const bb = await (await page.$('main')).boundingBox(), f = path.join(require('os').tmpdir(), 'ul-' + k + '.jpg');
    await page.screenshot({ path: f, type: 'jpeg', quality: 90, clip: bb }); files.push([f, r.s]);
    console.log(k, JSON.stringify(r));
  }
  const args = files.flatMap(([f, s]) => [f, String(s[0]), String(s[1])]);
  execFileSync('python3', ['-I', '-c', 'import sys,os\nfrom PIL import Image\nout=sys.argv[1]; a=sys.argv[2:]; w,h=200,170; S=Image.new("RGB",(w*3*2,h*2))\nfor i in range(3):\n    f,cx,cy=a[i*3],float(a[i*3+1]),float(a[i*3+2]); im=Image.open(f).convert("RGB"); x0=int(max(0,min(im.width-w,cx-w/2))); y0=int(max(0,min(im.height-h,cy-h/2))); S.paste(im.crop((x0,y0,x0+w,y0+h)).resize((w*2,h*2),Image.LANCZOS),(i*w*2,0)); os.remove(f)\nS.save(out,quality=90)', OUT, ...args]);
  if (page.errors.length) console.log('Fehler', page.errors.slice(0, 3));
  await env.browser.close(); env.srv.close();
})();
