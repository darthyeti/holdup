// Ticket 196: Bilder und Bildfolgen der Stilstudie Kloetzchen (docs/bilder/stil-kloetzchen/). Aufruf:
//   cd tests && HOLDUP_CHROME=/opt/pw-browsers/chromium node ../tools/bilder-kloetzchen.js <ordner> <szene bank|museum> <stil 0|1|2> <ablauf> [Bildbreite]
// Abläufe: ueberblick (ganze Spielkamera, mit HUD), laufen, schiessen, zerfall, explosion, autos, pumpe, alarm. Das Spiel laeuft nicht von allein (still), jeder Ablauf steuert Spielschritte (__dbg.update) und zeichnet danach.
// Es wird die WebGL-Leinwand selbst gelesen (ohne HUD, doppelte Aufloesung bei Grafik hoch), ein Ausschnitt um das Geschehen, Bildfolgen als Streifen (Pillow). Stil 0 ist das heutige 3D zum Vergleich.
const path = require('path'), fs = require('fs'), { execFileSync } = require('child_process');
const lib = require(path.join(__dirname, '..', 'tests', 'lib'));
const [OUT = path.join(lib.ROOT, 'docs', 'bilder', 'stil-kloetzchen'), SC = 'bank', STIL = '1', FLOW = 'ueberblick', BW = '420'] = process.argv.slice(2);
const tmp = fs.mkdtempSync(path.join(require('os').tmpdir(), 'kl-'));
const strip = (files, out, w) => execFileSync('python3', ['-I', '-c', 'import sys\nfrom PIL import Image\nout=sys.argv[1]; w=int(sys.argv[2]); fs=sys.argv[3:]\nims=[Image.open(f).convert("RGB") for f in fs]\nims=[i.resize((w,int(i.height*w/i.width)),Image.LANCZOS) for i in ims]\nn=len(ims); cols=min(n,4); rows=(n+cols-1)//cols\nS=Image.new("RGB",(cols*w,rows*ims[0].height))\nfor k,i in enumerate(ims): S.paste(i,((k%cols)*w,(k//cols)*ims[0].height))\nS.save(out,quality=88)', out, String(w), ...files]);
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const env = await lib.launch({ webgl: true });
  const page = await lib.openGame(env, { still: true, gfx: process.env.GFX || 'hoch' });
  await lib.loadInpage(page, 'bild.js');
  if (STIL !== 'x') await page.evaluate(async (stil) => { __dbg.view3d.kstil = +stil; await __dbg.view3d.set(true); }, STIL);
  const prep = await page.evaluate(([sc, flow]) => {
    const D = __dbg; if (sc === 'museum') D.setLage(['nacht']);
    PX.scene(sc, 5); if (sc === 'museum') { D.setLage(['nacht']); D.buildSeed(5); D.ptClear(); }
    PX.phase(flow === 'ueberblick' || flow === 'alarm' ? 'ueberfall' : 'ueberfall'); const g = D.get(), me = g.me; me.hp = 1e9; me.armed = true; me.mag = 99; me.res = 99; D.mouse.t = -999; D.CFG.vanLock = 0;
    const W = D.world(), T = 32, free = (x, y) => !W.isSol(Math.floor(x / T), Math.floor(y / T));
    // freie Richtung vor dem Spieler: von Wand frei und 150 Pixel weit
    let best = 0, bd = -1; for (let k = 0; k < 16; k++) { const a = k / 16 * 6.283; let d = 0; while (d < 220 && free(me.x + Math.cos(a) * (d + 10), me.y + Math.sin(a) * (d + 10))) d += 10; if (d > bd) { bd = d; best = a } }
    window.__dir = best; me.a = best; return { dir: best, free: bd, at: [Math.round(me.x), Math.round(me.y)], night: D.LAY().theme && D.LAY().theme.tod };
  }, [SC, FLOW]);
  console.log(JSON.stringify(prep));
  // ein Bild: Spielschritte, zeichnen, Leinwand lesen, Mitte (Bildpunkte) des Geschehens zurueck
  const FR = [], shot = async (name, at) => {
    const r = await page.evaluate((at) => {
      const D = __dbg; D.draw(); const V = D.view3d.V, i = V.info(), q = i.q || 1, g = D.get(), m = g.me; let p = [m.x, m.y, 20]; if (at === 'car') { const c = g.cars.find(c => c.dead) || g.cars[0]; if (c) p = [c.x, c.y, 10] } else if (at === 'at') { const q = window.__at; p = [q.x, q.y, 10] } else if (at === 'boom') p = [window.__bx, window.__by, 10]; else if (at) p = at;
      const s = V.toScr(p[0], p[1], p[2]); return { url: V.el.toDataURL('image/jpeg', .93), c: [s[0] * q, s[1] * q], q, k: i.k, calls: i.calls, tris: i.tris, err: i.err };
    }, at);
    const f = path.join(tmp, name + '.jpg'); fs.writeFileSync(f, Buffer.from(r.url.split(',')[1], 'base64'));
    const half = +(process.env.HALF || 240);
    execFileSync('python3', ['-I', '-c', 'import sys\nfrom PIL import Image\nf=sys.argv[1]; cx=float(sys.argv[2]); cy=float(sys.argv[3]); h=int(sys.argv[4])\nim=Image.open(f).convert("RGB"); b=(int(max(0,min(im.width-2*h,cx-h))),int(max(0,min(im.height-int(h*1.25),cy-h*.62))))\nim.crop((b[0],b[1],b[0]+2*h,b[1]+int(h*1.25))).save(f,quality=92)', f, String(r.c[0]), String(r.c[1]), String(half)]);
    FR.push(f); return r;
  };
  const step = (n, fn) => page.evaluate(([n, fn]) => { const D = __dbg; for (let i = 0; i < n; i++) { if (fn) (new Function('D', 'i', fn))(D, i); D.update(1 / 30) } }, [n, fn || '']);
  let info = null;
  if (FLOW === 'ueberblick') {
    const el = await page.$('main'), bb = await el.boundingBox(); await page.evaluate(() => { __dbg.draw(); __dbg.draw() });
    const f = path.join(OUT, `${SC}-s${STIL}-ueberblick.jpg`); await page.screenshot({ path: f, type: 'jpeg', quality: 88, clip: bb }); console.log(f);
  } else if (FLOW === 'vergleich') {
    // gleiche Szene (Polizei-Phase), Spielkamera mit HUD, Ausschnitt um den Spieler; Stil x ist 2D
    const pos = await page.evaluate(() => { PX.phase('polizei'); const D = __dbg; D.get().me.hp = 1e9; D.draw(); D.draw(); const m = D.get().me, c = D.cam(), V = D.view3d.V; const s = V && V.shown ? V.toScr(m.x, m.y, 20) : [m.x - c[0], m.y - c[1]]; return s });
    const el = await page.$('main'), bb = await el.boundingBox(), f = path.join(OUT, `${SC}-${STIL === 'x' ? '2d' : 's' + STIL}-vergleich.jpg`);
    await page.screenshot({ path: f, type: 'jpeg', quality: 90, clip: bb });
    const w = 520, h = 330, x0 = Math.max(0, Math.min(bb.width - w, pos[0] - w / 2)), y0 = Math.max(0, Math.min(bb.height - h, pos[1] - h * .55));
    execFileSync('python3', ['-I', '-c', 'import sys\nfrom PIL import Image\nf=sys.argv[1]; b=[float(v) for v in sys.argv[2:6]]\nim=Image.open(f).convert("RGB").crop((int(b[0]),int(b[1]),int(b[0]+b[2]),int(b[1]+b[3])))\nim.resize((im.width*2,im.height*2),Image.LANCZOS).save(f,quality=90)', f, String(x0), String(y0), String(w), String(h)]); console.log(f);
  } else if (FLOW === 'laufen') {
    await step(1, 'D.keys.d=1;D.keys.w=0'); info = await shot('f0'); for (let k = 1; k < 8; k++) { await step(3, 'D.keys.d=1'); info = await shot('f' + k) } await step(1, 'for(const k of "wasd")delete D.keys[k]');
  } else if (FLOW === 'schiessen') {
    await page.evaluate(() => { const D = __dbg, g = D.get(), me = g.me, a = window.__dir; g.en.length = 0; for (let k = 0; k < 2; k++) g.en.push(D.mkCop(me.x + Math.cos(a) * 130 + Math.sin(a) * (k * 26 - 13), me.y + Math.sin(a) * 130 - Math.cos(a) * (k * 26 - 13), false)); g.en.forEach(e => { e.hp = 1e5; e.mhp = 1e5; e.cool = 99 }); D.mouse.x = me.x + Math.cos(a) * 130; D.mouse.y = me.y + Math.sin(a) * 130; D.mouse.t = 1e9 });
    for (let k = 0; k < 8; k++) { await step(2, 'D.keys[" "]=1;const m=D.get().me;m.a=window.__dir;m.mag=99;D.mouse.x=m.x+Math.cos(m.a)*130;D.mouse.y=m.y+Math.sin(m.a)*130;D.mouse.t=1e9'); info = await shot('f' + k, null) } await step(1, 'D.keys[" "]=0');
  } else if (FLOW === 'zerfall') {
    const cp = await page.evaluate(() => { const D = __dbg, g = D.get(), me = g.me, a = window.__dir; g.en.length = 0; const c = D.mkCop(me.x + Math.cos(a) * 90, me.y + Math.sin(a) * 90, false); c.hp = 40; c.mhp = 40; c.cool = 99; g.en.push(c); window.__cop = c; return [c.x, c.y, 18] });
    for (const n of [1, 2, 2, 2, 2, 2, 3, 3, 4, 6, 10, 20, 40, 80, 160]) { await step(n, 'const m=D.get().me,c=window.__cop;m.a=Math.atan2(c.y-m.y,c.x-m.x);window.__dir=m.a;D.keys[" "]=c.hp>0?1:0;D.mouse.x=c.x;D.mouse.y=c.y;D.mouse.t=1e9;c.cool=99'); info = await shot('f' + FR.length, cp) }
  } else if (FLOW === 'reihe') {
    const rp = await page.evaluate(() => {
      const D = __dbg, g = D.get(), me = g.me, W = D.world(), T = 32, free = (x, y) => !W.isSol(Math.floor(x / T), Math.floor(y / T));
      let spot = null; for (let y = 4 * T; y < 40 * T && !spot; y += T) for (let x = 3 * T; x < 50 * T && !spot; x += T) { let ok = true; for (let k = 0; k < 11; k++) for (const dy of [-T, 0, T]) if (!free(x + k * 40, y + dy)) ok = false; if (ok) spot = [x, y] }
      if (!spot) return null; g.en.length = 0; g.npcs.length = 0; g.cars.length = 0;
      const mk = (kind, row, extra) => Object.assign({ id: 9000 + g.en.length, kind, row, r: 9, hp: 100, mhp: 100, a: 0, w: 0, mvg: false, fl: 0, h: 0, sh: 0, sx: 0, muz: 30, cool: 9, react: 9, sur: 0, mode: 'x', path: [] }, extra);
      ['me', 'cop', 'swat', 'shield', 'sniper', 'grd', 'run', 'civ', 'tel', 'mgr', 'kneel', 'ko'].forEach((k, i) => { const x = spot[0] + i * 40, y = spot[1];
        if (k === 'me') { me.x = x; me.y = y; me.a = 0.6; me.vx = me.vy = 0; return }
        if (k === 'cop') g.en.push(mk('cop', 0, { x, y })); if (k === 'swat') g.en.push(mk('swat', 8, { x, y })); if (k === 'shield') g.en.push(mk('shield', 0, { x, y, sh: 50 })); if (k === 'sniper') g.en.push(mk('sniper', 8, { x, y })); if (k === 'grd') g.en.push(mk('grd', 2, { x, y })); if (k === 'run') g.en.push(mk('cop', 0, { x, y, mvg: true, w: 1.3 }));
        const npc = (kind, row, st) => g.npcs.push({ id: 7000 + i, k: kind, row, x, y, a: 0, w: 0, mvg: false, st: st || 'idle', r: 8, kt: 20 }); if (k === 'civ') npc('civ', 3); if (k === 'tel') npc('tel', 5); if (k === 'mgr') npc('mgr', 6); if (k === 'kneel') npc('civ', 4, 'cower'); if (k === 'ko') npc('civ', 3, 'ko') });
      g.en.forEach(e => { e.a = .6 }); g.npcs.forEach(n => { n.a = .6 }); return [spot[0] + 5.5 * 40, spot[1], 18];
    });
    process.env.HALF = '470'; info = await shot('f0', rp);
    process.env.HALF = '150'; await shot('f1', [rp[0] - 4 * 40, rp[1], 18]); await shot('f2', [rp[0] + 1.2 * 40, rp[1], 18]);
  } else if (FLOW === 'explosion') {
    await page.evaluate(() => { const D = __dbg, g = D.get(), me = g.me; g.en.length = 0; const c = g.cars.find(q => q.civ && !q.dead) || g.cars[0]; window.__car = c; });
    info = await shot('f0', 'car'); await page.evaluate(() => { const D = __dbg; D.get().me.hp = 1e9; D.carBlow(window.__car, 0) });
    for (const n of [1, 2, 3, 5, 9, 16, 30]) { await step(n); info = await shot('f' + FR.length, 'car') }
  } else if (FLOW === 'autos') {
    // Streifenwagen mit Blaulicht, ziviles Auto, Fluchtwagen: je ein Bild um den Wagen (Phase Polizei, Spieler daneben); mit SC=truck auch Panzerwagen
    await page.evaluate(() => { PX.phase('polizei'); const D = __dbg; D.get().me.hp = 1e9; D.get().en.length = 0; D.callVan && D.callVan(); for (let i = 0; i < 90; i++) D.update(1 / 30); });
    const ids = await page.evaluate(() => { const g = __dbg.get(), out = []; const pol = g.cars.find(c => !c.civ && !c.dead), civ = g.cars.find(c => c.civ && !c.dead); window.__cs = [pol, civ].filter(Boolean); return window.__cs.map(c => c.civ ? 'civ' : 'pol'); });
    for (let i = 0; i < ids.length; i++) { await page.evaluate(i => { const c = window.__cs[i], m = __dbg.get().me; m.x = c.x + 70; m.y = c.y + 50; __dbg.update(1 / 30); window.__at = c }, i); info = await shot('a' + i, 'at') }
  } else if (FLOW === 'pumpe') {
    // Explosion einer Zapfsaeule oder (ohne Tankstelle) einer Sprengung: Bildfolge um den Boom (wie explosion)
    await page.evaluate(() => { const D = __dbg, g = D.get(); g.en.length = 0; D.get().me.hp = 1e9; const m = g.me; window.__bx = m.x + 60; window.__by = m.y; });
    info = await shot('f0', 'boom'); await page.evaluate(() => { __dbg.evt('bx', [window.__bx, window.__by, 120, 1]) });
    for (const n of [1, 2, 3, 5, 9, 16, 30]) { await step(n); info = await shot('f' + FR.length, 'boom') }
  } else if (FLOW === 'alarm') {
    await page.evaluate(() => PX.phase('polizei')); info = await shot('f0', null); for (let k = 0; k < 7; k++) { await step(5, 'D.get().me.hp=1e9'); info = await shot('f' + FR.length, null) }
  }
  if (FR.length) { const out = path.join(OUT, `${SC}-s${STIL}-${FLOW}.jpg`); strip(FR, out, +BW); console.log(out, JSON.stringify(info && { calls: info.calls, tris: info.tris, err: info.err, k: info.k })); }
  if (page.errors.length) console.log('Fehler', page.errors.slice(0, 3));
  await env.browser.close(); env.srv.close();
})();
