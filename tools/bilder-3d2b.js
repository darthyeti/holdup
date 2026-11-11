// 3D-2b (Ticket 160): Abnahmebilder der Low-Poly-Figuren (docs/bilder/plan-3d/3d2b-*.jpg). Stellt eine Reihe aller Figurenarten vor den Spieler (nur zum Zeichnen, die Simulation laeuft nicht weiter),
// speichert Spielkamera und Nahaufnahme (Ausschnitt dreifach hochgerechnet mit Pillow, falls vorhanden), dazu die Bank im Ueberfall mit Polizei.
// Aufruf: cd tests && HOLDUP_CHROME=/opt/pw-browsers/chromium node ../tools/bilder-3d2b.js [ordner]
const path = require('path');
const { execFileSync } = require('child_process');
const lib = require(path.join(__dirname, '..', 'tests', 'lib'));
const OUT = process.argv[2] || path.join(lib.ROOT, 'docs', 'bilder', 'plan-3d');
const zoom = (f, box) => { try { execFileSync('python3', ['-I', '-c', 'import sys\nfrom PIL import Image\nf=sys.argv[1]; b=[int(v) for v in sys.argv[2:6]]\nim=Image.open(f).convert("RGB").crop((b[0],b[1],b[0]+b[2],b[1]+b[3]))\nim.resize((im.width*3,im.height*3),Image.LANCZOS).save(f.replace(".jpg","-nah.jpg"),quality=85)', f, ...box.map(v => String(Math.round(v)))]); } catch (e) { console.log('Nahaufnahme ohne Pillow uebersprungen'); } };
let zoomFile = '';
(async () => {
  const env = await lib.launch({ webgl: true });
  const page = await lib.openGame(env, { still: true, gfx: 'mittel' });
  await lib.loadInpage(page, 'bild.js');
  await page.evaluate(async () => { await __dbg.view3d.set(true); });
  const mode = process.argv[3] || 'reihe';
  const r = await page.evaluate((mode) => {
    const D = __dbg; PX.scene('bank', 5); PX.phase('ueberfall');
    const g = D.get(), me = g.me, W = D.world(), T = 32, info = {};
    me.armed = true; me.hp = 100; me.units = 2;
    if (mode === 'reihe') {
      const free = (x, y) => !W.isSol(Math.floor(x / T), Math.floor(y / T));
      // freie Waagerechte mit 12 Plaetzen suchen
      let spot = null; for (let y = 4 * T; y < 40 * T && !spot; y += T) for (let x = 3 * T; x < 50 * T && !spot; x += T) { let ok = true; for (let k = 0; k < 11; k++) for (const dy of [-T, 0, T]) if (!free(x + k * 40, y + dy)) ok = false; if (ok) spot = [x, y]; }
      info.spot = spot; if (!spot) return info;
      g.en.length = 0; g.npcs.length = 0; g.cars.length = 0;
      const mk = (kind, row, extra) => Object.assign({ id: 9000 + g.en.length, kind, row, r: 9, hp: 100, mhp: 100, a: 0, w: 0, mvg: false, fl: 0, h: 0, sh: 0, sx: 0, muz: 30, cool: 9, react: 9, sur: 0, mode: 'x', path: [] }, extra);
      const list = [['me'], ['cop'], ['swat'], ['shield'], ['sniper'], ['grd'], ['run-cop'], ['civ'], ['tel'], ['mgr'], ['kneel'], ['ko']];
      list.forEach((q, i) => {
        const x = spot[0] + i * 40, y = spot[1], k = q[0];
        if (k === 'me') { me.x = x; me.y = y; me.a = 0; me.vx = me.vy = 0; return; }
        if (k === 'cop') g.en.push(mk('cop', 0, { x, y })); if (k === 'swat') g.en.push(mk('swat', 8, { x, y }));
        if (k === 'shield') g.en.push(mk('shield', 0, { x, y, sh: 50 })); if (k === 'sniper') g.en.push(mk('sniper', 8, { x, y }));
        if (k === 'grd') g.en.push(mk('grd', 2, { x, y })); if (k === 'run-cop') g.en.push(mk('cop', 0, { x, y, mvg: true, w: 1.3 }));
        const npc = (kind, row, st) => g.npcs.push({ id: 7000 + i, k: kind, row, x, y, a: 0, w: 0, mvg: false, st: st || 'idle', r: 8, kt: 20 });
        if (k === 'civ') npc('civ', 3); if (k === 'tel') npc('tel', 5); if (k === 'mgr') npc('mgr', 6);
        if (k === 'kneel') npc('civ', 4, 'cower'); if (k === 'ko') npc('civ', 3, 'ko');
      });
      g.en.forEach(e => { e.a = 0.6; }); g.npcs.forEach(n => { n.a = 0.6; });
      me.a = 0.6;
    }
    D.mouse.t = -999; D.draw(); D.draw();
    const V = D.view3d.V, i = V.info(); info.i = { figs: i.figs, calls: i.calls, tris: i.tris, fp: i.figParts, fc: i.figCalls, err: i.err, fk: i.fk };
    info.cam = [me.x, me.y]; info.f = V.dyn().f.map(f => f.slice(0, 8).join(',')); return info;
  }, mode);
  console.log(JSON.stringify(r));
  const el = await page.$('main'), bb = await el.boundingBox();
  const f = path.join(OUT, '3d2b-' + (mode === 'reihe' ? 'reihe' : 'bank-ueberfall') + '.jpg'); zoomFile = f;
  await page.screenshot({ path: f, type: 'jpeg', quality: 88, clip: bb });
  console.log(f);
  if (mode === 'reihe') zoom(f, [410, 320, 520, 75]);
  if (page.errors.length) console.log('Fehler', page.errors.slice(0, 3));
  await env.browser.close(); env.srv.close();
})();
