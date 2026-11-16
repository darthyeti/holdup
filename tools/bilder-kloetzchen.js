// Ticket 196: Bilder und Bildfolgen der Stilstudie Kloetzchen (docs/bilder/stil-kloetzchen/). Aufruf:
//   cd tests && HOLDUP_CHROME=/opt/pw-browsers/chromium node ../tools/bilder-kloetzchen.js <ordner> <szene bank|museum> <stil 0|1|2> <ablauf> [Bildbreite]
// Abläufe: ueberblick (ganze Spielkamera, mit HUD), laufen, schiessen, zerfall, explosion, autos, pumpe, fluchtwagen, fenster, alarm. Das Spiel laeuft nicht von allein (still), jeder Ablauf steuert Spielschritte (__dbg.update) und zeichnet danach.
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
  if (STIL !== 'x') await page.evaluate(async (stil) => { await __dbg.view3d.set(true); }, STIL);
  const prep = await page.evaluate(([sc, flow, seed, lage]) => {
    const D = __dbg; if (lage) D.setLage([lage]); else if (sc === 'museum') D.setLage(['nacht']);
    PX.scene(sc, seed); if (lage || sc === 'museum') { D.setLage([lage || 'nacht']); D.buildSeed(seed); D.ptClear(); }
    PX.phase(flow === 'dinge' ? 'erkundung' : 'ueberfall'); const g = D.get(), me = g.me; me.hp = 1e9; me.armed = true; me.mag = 99; me.res = 99; D.mouse.t = -999; D.CFG.vanLock = 0;
    const W = D.world(), T = 32, free = (x, y) => !W.isSol(Math.floor(x / T), Math.floor(y / T));
    // freie Richtung vor dem Spieler: von Wand frei und 150 Pixel weit
    let best = 0, bd = -1; for (let k = 0; k < 16; k++) { const a = k / 16 * 6.283; let d = 0; while (d < 220 && free(me.x + Math.cos(a) * (d + 10), me.y + Math.sin(a) * (d + 10))) d += 10; if (d > bd) { bd = d; best = a } }
    window.__dir = best; me.a = best; return { dir: best, free: bd, at: [Math.round(me.x), Math.round(me.y)], night: D.LAY().theme && D.LAY().theme.tod };
  }, [SC, FLOW, +(process.env.SEED || 5), process.env.LAGE || '']);
  console.log(JSON.stringify(prep));
  // TOD=mittag|abend|nacht ...: Tageszeit der Karte erzwingen (theme.tod) und die Ansicht neu aufbauen
  if (process.env.TOD) await page.evaluate(async (tod) => { __dbg.LAY().theme.tod = tod; __dbg.view3d.reset(); await __dbg.view3d.set(true); __dbg.draw(); }, process.env.TOD);
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
  } else if (FLOW === 'dinge') {
    // Dinge des Szenarios: Spieler neben bis zu drei Zielen (Beute, Laser, Bohrer, Presse, Schloesser), Ausschnitt um jedes
    const targets = await page.evaluate(() => { const D = __dbg, g = D.get(), L = D.LAY(), T = 32, out = [], seen = new Set(), add = (n, x, y) => { out.push([n, Math.round(x), Math.round(y), 10]) };
      for (const it of g.its) if ((it.t === 'good' || it.t === 'vit') && !seen.has(it.k || it.t)) { seen.add(it.k || it.t); add(it.k || it.t, it.x, it.y) }
      if (L.lasers && L.lasers[0]) { const l = L.lasers[0]; add('laser', (l[0] + l[2]) * T / 2, (l[1] + l[3]) * T / 2) }
      if (L.nb) { add('bohrer', L.nb.rig[0] * T + T, L.nb.rig[1] * T + T); add('presse', L.nb.press[0] * T + 40, L.nb.press[1] * T + 40) }
      if (L.prison) { const p = L.prison; add('ring', p.pick[0] * T + 16, p.pick[1] * T + 16); const l = p.locks[0]; if (l) add('schloss', l.cells[0][0] * T + 16, l.cells[0][1] * T + 16); const gl = p.locks.find(q => q.id === 'gi'); if (gl) add('leser', gl.ops[0].at[0] * T + 26, gl.ops[0].at[1] * T + 32) }
      return out.slice(0, 8) });
    console.log(JSON.stringify(targets));
    for (const t of targets) { await page.evaluate(([x, y]) => { const D = __dbg, m = D.get().me; m.x = x - 60; m.y = y + 40; m.vx = m.vy = 0; D.update(1 / 30); D.update(1 / 30); D.draw() }, t.slice(1, 3)); process.env.HALF = '190'; info = await shot('d' + FR.length, t.slice(1, 4)) }
  } else if (FLOW === 'tresor') {
    // Tresor zu, offen, Spieler im Tresor (Ticket 198 Tresor): Spieler vor der Tuer, dann Tresor oeffnen (Beute-Objekt act), dann in den Raum dahinter
    const V0 = await page.evaluate(() => { const D = __dbg, L = D.LAY(), T = 32, v = L.vault; if (!v) return null; const m = D.get(); return { door: [v.door[0] * T, v.door[1] * T], o: v.o, dir: v.dir, mid: [v.door[0] * T + 32, v.door[1] * T + 32] } });
    console.log(JSON.stringify(V0)); if (!V0) process.exit(1);
    const put = async (dx, dy, n) => { await page.evaluate(([x, y]) => { const D = __dbg, m = D.get().me; m.x = x; m.y = y; m.vx = m.vy = 0; D.update(1 / 30); D.update(1 / 30) }, [V0.mid[0] + dx, V0.mid[1] + dy]); process.env.HALF = '150'; return shot(n, [V0.mid[0], V0.mid[1], 20]) };
    const side = V0.o === 'h' ? [0, 1] : [1, 0]; // Gangseite grob: ausprobieren
    info = await put(-60 * V0.dir * side[0] - 0, -60 * V0.dir * side[1], 'zu');
    await page.evaluate(() => { const D = __dbg, g = D.get(), it = g.its.find(i => i.t === 'vault'); try { it.act(g.me) } catch (e) { } if (!D.get().vaultOpen) { const c = g.its.find(i => i.t === 'vault'); c && c.act && c.act(g.me) } D.update(1 / 30) });
    console.log('offen', await page.evaluate(() => __dbg.get().vaultOpen));
    info = await put(-60 * V0.dir * side[0], -60 * V0.dir * side[1], 'offen');
    info = await put(40 * V0.dir * side[0], 40 * V0.dir * side[1], 'drin');
    const bu = await page.evaluate(() => { const b = __dbg.get().its.find(i => i.t === 'bundle' && !i.done); if (!b) return null; const m = __dbg.get().me; m.x = b.x - 50; m.y = b.y + 30; m.vx = m.vy = 0; __dbg.update(1 / 30); __dbg.update(1 / 30); return [b.x, b.y, 8] });
    if (bu) { process.env.HALF = '110'; info = await shot('buendel', bu) }
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
    if (process.env.OLV) {
      // Ticket 248: Umrissstile 0 bis 3 (Taste F6), Tag oben, Nacht unten, die Reihe der Rollen mit dem Spieler ganz links
      process.env.HALF = process.env.HALF || '250';
      for (const night of [0, 1]) {
        if (night) await page.evaluate(async () => { const D = __dbg, L = D.LAY(); L.mission.lg = (L.mission.lg || []).concat('nacht'); D.view3d.reset(); await D.view3d.set(true); D.draw() });
        for (const v of [0, 1, 2, 3]) { await page.evaluate(v => { __dbg.view3d.olv = v; __dbg.draw(); __dbg.draw() }, v); info = await shot(`f${FR.length}`, [rp[0] - 60, rp[1], 18]); }
      }
      await page.evaluate(() => { __dbg.view3d.olv = 0 });
    } else {
        process.env.HALF = '470'; info = await shot('f0', rp);
    process.env.HALF = '150'; await shot('f1', [rp[0] - 4 * 40, rp[1], 18]); await shot('f2', [rp[0] + 1.2 * 40, rp[1], 18]);
    }
  } else if (FLOW === 'waffen') {
    // Ticket 217: der Spieler mit Pistole, SMG, Sturmgewehr und verstaut, nah (Spielkamera) in zwei Blickrichtungen
    await page.evaluate(() => { const D = __dbg, g = D.get(); g.en.length = 0; g.npcs.length = 0; g.cars.length = 0; g.me.vx = g.me.vy = 0 });
    process.env.HALF = process.env.HALF || '70';
    for (const a of [0, 2.2]) for (const [w, armed] of [['pistol', 1], ['smg', 1], ['rifle', 1], ['pistol', 0]]) {
      await page.evaluate(([w, armed, a]) => { const D = __dbg, me = D.get().me; me.kit.w = w; me.armed = !!armed; me.a = a; me.hp = 100; D.mouse.t = -999; D.draw(); D.draw() }, [w, armed, a]);
      info = await shot(`f${FR.length}`, null);
    }
  } else if (FLOW === 'waffen2') {
    // Ticket 232: alle Waffen in der Hand (Pistole, SMG, Sturmgewehr, Praezisionsgewehr, Granatwerfer), Lehnen und verstaut, Tag und Nacht, nah in der Spielkamera
    await page.evaluate(() => { const D = __dbg, g = D.get(); g.en.length = 0; g.npcs.length = 0; g.cars.length = 0; g.me.vx = g.me.vy = 0 });
    process.env.HALF = process.env.HALF || '90';
    const poses = [['pistol', 'p'], ['smg', 'p'], ['rifle', 'p'], ['rifle', 'prec'], ['pistol', 'launch'], ['pistol', 'lean'], ['pistol', 'stow']];
    for (const night of [0, 1]) {
      if (night) await page.evaluate(async () => { const D = __dbg, L = D.LAY(); L.mission.lg = (L.mission.lg || []).concat('nacht'); D.view3d.reset(); await D.view3d.set(true); D.draw() });
      for (const [w, mode] of poses) {
        await page.evaluate(([w, mode]) => { const D = __dbg, me = D.get().me; me.kit.w = w; me.kit.sk = mode === 'prec' ? { A3: 1 } : mode === 'launch' ? { A4: 1 } : {}; me.sx = 3; me.ak = 3; me.armed = mode !== 'stow'; me.a = .5; me.units = 0; me.hp = 100; me.ln = mode === 'lean' ? 1 : 0; D.mouse.t = -999;
          const want = mode === 'prec' || mode === 'launch'; if (want !== !!D.spw()) document.getElementById('c').dispatchEvent(new KeyboardEvent('keydown', { key: 'Shift', shiftKey: true })); D.draw(); D.draw(); return [mode, D.spw(), D.spwKind(me)] }, [w, mode]).then(r => process.env.DBGW && console.log(JSON.stringify(r)));
        info = await shot(`f${FR.length}`, null);
      }
    }
  } else if (FLOW === 'pickups') {
    // Ticket 234: Aufnahmen (Munition, Medikit, unbekannte Zelle) als schwebende, drehende Klotzchen, vier Zeitpunkte, Tag und Nacht, nah in der Spielkamera
    process.env.HALF = process.env.HALF || '80';
    const c = await page.evaluate(() => { const D = __dbg, g = D.get(), me = g.me; g.en.length = 0; g.npcs.length = 0; g.cars.length = 0; const a = window.__dir, L = D.fxL(); L.pk.length = 0;
      const at = (d, s, k) => ({ x: me.x + 60 + s, y: me.y + d, k }); L.pk.push(at(40, -34, 5), at(40, 0, 6), at(40, 34, 9)); const m = L.pk[1]; return [m.x, m.y, 14] });
    for (const night of [0, 1]) {
      if (night) await page.evaluate(async () => { const D = __dbg, L = D.LAY(); L.mission.lg = (L.mission.lg || []).concat('nacht'); D.view3d.reset(); await D.view3d.set(true); D.draw() });
      for (let i = 0; i < 4; i++) { await page.evaluate(() => { const D = __dbg; for (let j = 0; j < 12; j++) { D.get().me.hp = 100; D.update(1 / 30) } D.draw(); D.draw() }); info = await shot(`f${FR.length}`, c); }
    }
  } else if (FLOW === 'explosion') {
    await page.evaluate(() => { const D = __dbg, g = D.get(), me = g.me; g.en.length = 0; const c = g.cars.find(q => q.civ && !q.dead) || g.cars[0]; window.__car = c; });
    info = await shot('f0', 'car'); await page.evaluate(() => { const D = __dbg; D.get().me.hp = 1e9; D.carBlow(window.__car, 0) });
    for (const n of [1, 2, 3, 5, 9, 16, 30]) { await step(n); info = await shot('f' + FR.length, 'car') }
  } else if (FLOW === 'autos') {
    // Streifenwagen mit Blaulicht, ziviles Auto, Fluchtwagen: je ein Bild um den Wagen (Phase Polizei, Spieler daneben); mit SC=truck auch Panzerwagen
    await page.evaluate(() => { PX.phase('polizei'); const D = __dbg; D.get().me.hp = 1e9; D.get().en.length = 0; D.callVan && D.callVan(); for (let i = 0; i < 90; i++) D.update(1 / 30); });
    const ids = await page.evaluate(() => { const g = __dbg.get(), out = []; const pol = g.cars.find(c => !c.civ && !c.dead), civ = g.cars.find(c => c.civ && !c.dead); window.__cs = [pol, civ].filter(Boolean); return window.__cs.map(c => c.civ ? 'civ' : 'pol'); });
    for (let i = 0; i < ids.length; i++) { await page.evaluate(i => { const c = window.__cs[i], m = __dbg.get().me; m.x = c.x + 70; m.y = c.y + 50; __dbg.update(1 / 30); window.__at = c }, i); info = await shot('a' + i, 'at') }
  } else if (FLOW === 'alle') {
    // alle Fahrzeugarten nebeneinander (X.figs der Ansicht wird fuer das Bild ersetzt): pol mit Blaulicht, civ in zwei Farben, wreck, van, vh, tk, jeweils nach rechts und links fahrend
    await page.evaluate(() => { const D = __dbg, m = D.get().me; m.y += 150; m.x -= 100; for (let i = 0; i < 40; i++) { m.hp = 1e9; D.update(1 / 30) } });
    const r = await page.evaluate(() => {
      const D = __dbg, V = D.view3d.V, X = V.kl().kit.X, m = D.get().me, orig = X.figs; window.__orig = orig; window.__X = X;
      const row = (k, i, o) => Object.assign({ k, x: m.x - 150 + (i % 4) * 135, y: m.y - 75 + (i >= 4 ? 90 : 0), a: 0, row: 1, L: 128, W: 64, fx: 1, fy: 1, dim: 0, bl: 0 }, o || {}), cs = [row('pol', 0, { bl: 1 }), row('civ', 1, { row: 2 }), row('civ', 2, { row: 5 }), row('wreck', 3, { dim: 1 }), row('van', 4, { row: 0 }), row('vh', 5, { row: 3, bl: 2 }), row('tk', 6, { row: 4, L: 224, W: 96, x: m.x + 330 })];
      const cl = [];
      X.figs = () => ({ f: orig().f, c: cs.concat(cl) }); m.x += 0; window.__at = { x: m.x + 220, y: m.y + 5 }; return cs.length;
    });
    await step(1); info = await shot('alle', 'at');
    await page.evaluate(() => { window.__X.figs = window.__orig });
  } else if (FLOW === 'fenster') {
    // Glas-Zerfall (Ticket 207): Spieler steht vor der ersten Scheibe, ein Schuss, Bildfolge um die Scheibe
    await page.evaluate(() => { const D = __dbg, g = D.get(), m = g.me, w = D.LAY().wins[0]; g.en.length = 0; m.hp = 1e9; m.x = w.px + w.iv[0] * 70; m.y = w.py + w.iv[1] * 70; m.a = Math.atan2(-w.iv[1], -w.iv[0]); for (let i = 0; i < 30; i++) { m.hp = 1e9; D.update(1 / 30) } window.__at = { x: w.px, y: w.py }; window.__w = w; });
    info = await shot('f0', 'at');
    await page.evaluate(() => { const D = __dbg, w = window.__w, m = D.get().me; D.get().bl.push({ id: 9901, x: m.x, y: m.y, vx: -w.iv[0] * 700, vy: -w.iv[1] * 700, l: .8, o: 1, own: m.id, d: 20, ov: 0 }) });
    for (const n of [2, 1, 2, 3, 4, 6, 10, 20]) { await step(n, 'D.get().me.hp=1e9'); info = await shot('f' + FR.length, 'at') }
  } else if (FLOW === 'moebel') {
    // Strassenmoebel (Ticket 229): vier Ausschnitte um Kisten und Faesser draussen (mindestens 5 Zellen o im 5 mal 5), die Szene wie bei SC
    const tiles = await page.evaluate(() => { const D = __dbg, W = D.world(), T = 32, out = []; for (let y = 0; y < W.H; y++) for (let x = 0; x < W.W; x++) { const c = W.cell(x, y); if (c !== 'k' && c !== 'q') continue; let o = 0; for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (W.cell(x + dx, y + dy) === 'o') o++; if (o >= 5) out.push([x * T + 16, y * T + 16]) } const pick = []; for (const q of out) if (pick.every(p => Math.hypot(p[0] - q[0], p[1] - q[1]) > 150)) pick.push(q); return pick.slice(0, 4) });
    for (let i = 0; i < tiles.length; i++) {
      await page.evaluate((t) => { const D = __dbg, m = D.get().me; D.get().en.length = 0; const W = D.world(), T = 32; let best = null; for (let r = 40; r <= 120 && !best; r += 20) for (let a = 0; a < 16 && !best; a++) { const x = t[0] + Math.cos(a * .39) * r, y = t[1] + Math.sin(a * .39) * r; if (!W.isSol(Math.floor(x / T), Math.floor(y / T))) best = [x, y] } m.x = best ? best[0] : t[0]; m.y = best ? best[1] : t[1]; for (let i = 0; i < 40; i++) { m.hp = 1e9; D.update(1 / 30) } window.__at = { x: t[0], y: t[1] }; D.draw(); D.draw() }, tiles[i]);
      info = await shot('m' + i, 'at');
    }
  } else if (FLOW === 'fundorte') {
    // Fundorte des Tresorcodes (Ticket 228): je Art ohne und mit Zettel an einer Wandkachel der Bank (X.scen der Ansicht wird ersetzt), Ausschnitt um den Fundort
    const kinds = ['bin', 'copy', 'coffee', 'file', 'pin', 'coat', 'locker', 'mgr'];
    const tile = await page.evaluate(() => { const D = __dbg, B = D.LAY().bld, W = D.world(), T = 32; for (let y = B.y0 + 1; y < B.y1; y++) for (let x = B.x0 + 2; x < B.x1 - 1; x++) { if (W.cell(x, y) !== '.') continue; if (W.cell(x, y - 1) === '#' && W.cell(x - 1, y) === '.' && W.cell(x + 1, y) === '.') return [x * T + 16, y * T + 16] } return null });
    for (const paper of [0, 1]) for (const kind of kinds) {
      await page.evaluate(([tile, kind, paper]) => { const D = __dbg, V = D.view3d.V, X = V.kl().kit.X; if (!window.__scen0) window.__scen0 = X.scen; const m = D.get().me; m.x = tile[0]; m.y = tile[1] + 70; for (let i = 0; i < 40; i++) { m.hp = 1e9; D.update(1 / 30) } window.__at = { x: tile[0], y: tile[1] };
        X.scen = () => { const o = window.__scen0(); return { p: o.p.filter(q => q.k !== 'note').concat([{ k: 'note', n: kind, x: tile[0], y: tile[1], paper }]), grl: o.grl, key: o.key + kind + paper } }; D.draw(); D.draw() }, [tile, kind, paper]);
      info = await shot('n' + FR.length, 'at');
    }
    await page.evaluate(() => { __dbg.view3d.V.kl().kit.X.scen = window.__scen0 });
  } else if (FLOW === 'fluchtwagen') {
    // Fluchtwagen (Ticket 245): die vier Varianten (LAY.seed waehlt sie) je fahrend (Tuer zu) und wartend (Tuer offen), Streifen aus X.figs wie bei 'alle'
    const seeds = JSON.parse(process.env.VSEEDS || '[4,3,2,1]');   // LAY.seed fuer die Varianten 0 bis 3
    await page.evaluate(() => { const D = __dbg, m = D.get().me; m.y += 150; m.x -= 100; for (let i = 0; i < 40; i++) { m.hp = 1e9; D.update(1 / 30) } });
    for (let vi = 0; vi < 4; vi++) for (const wait of [0, 1]) {
      await page.evaluate(async ([seed, wait]) => { const D = __dbg, V = D.view3d.V, X = V.kl().kit.X, m = D.get().me; if (!window.__figs0) window.__figs0 = X.figs; D.LAY().seed = seed; window.__vx = 0;
        const mk = dx => ({ k: 'van', x: m.x + 170 + dx, y: m.y - 30, a: 0, row: 0, L: 128, W: 64, fx: 1, fy: 1, dim: 0, bl: 0 }); X.figs = () => { const o = window.__figs0(); if (!wait) window.__vx += 6; return { f: o.f, c: [mk(wait ? 0 : window.__vx)] } };
        window.__at = { x: m.x + 170, y: m.y - 30 }; for (let i = 0; i < (wait ? 25 : 4); i++) { D.update(1 / 30); D.draw() } }, [seeds[vi], wait]);
      info = await shot('v' + FR.length, 'at');
    }
    await page.evaluate(() => { __dbg.view3d.V.kl().kit.X.figs = window.__figs0 });
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
