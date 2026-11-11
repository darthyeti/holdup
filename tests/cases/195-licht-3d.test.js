// 3D-5 (Ticket 154): Licht und Nacht der 3D-Ansicht (js/view3d.js lightA, lightB, shadowPass, litC, gradeC; V3OPT.shadow in index.html; fl in js/draw.js figs3d).
// Je Tageszeit andere Lichtwerte und Helligkeit (Nacht dunkler als Mittag), Schatten-Regler schaltet die Schattenkarte (Auto nach Grafikstufe), Taschenlampe folgt der Blickrichtung,
// Blaulicht nur bei Streifenwagen mit Licht, Muendungsfeuer als kurzes Licht, Zahl der Punktlichter begrenzt (die naechsten), Zustandshash mit und ohne 3D gleich (Nacht, Schatten an).
// Kein Pixelvergleich gegen Referenzen, nur Vergleiche im selben Lauf. Ohne WebGL 2 (auch nicht mit SwiftShader-Flags) ueberspringt der Test mit Meldung.
const lib = require('../lib');

async function glPage(t) {
  const ok = p => p.evaluate(() => { const c = document.createElement('canvas'); return !!c.getContext('webgl2'); });
  if (await ok(t.page)) return { page: t.page, done: async () => {} };
  const env = await lib.launch({ webgl: true });
  const page = await lib.openGame(env);
  if (await ok(page)) return { page, done: async () => { await page.ctx.close().catch(() => {}); await env.browser.close().catch(() => {}); env.srv.close(); } };
  await env.browser.close().catch(() => {}); env.srv.close();
  t.note('kein WebGL 2 im Test-Chromium (auch nicht mit SwiftShader-Flags), 3D-Teil uebersprungen');
  return null;
}

// Tageszeiten wie js/maps.js TODS (Toenung, Dunkelzone, Sonne), damit der Test ohne passenden Seed jede Tageszeit auf der Klassikkarte setzen kann
const HELP = `window.L5 = {
  TODS: { mittag: { tint: null, dark: .58, sun: {} },
    morgen: { tint: [150, 185, 255, .10], dark: .56, sun: { c: '205,225,255', a: .42, dx: -70, dy: 151, c2: '215,230,255' } },
    abend: { tint: [255, 140, 60, .15], dark: .62, sun: { c: '255,185,120', a: .55, dx: 112, dy: 120, c2: '255,205,150' } },
    daemmerung: { tint: [70, 90, 170, .20], dark: .68, sun: { c: '150,170,240', a: .22, dx: 40, dy: 151, c2: '170,185,240' } },
    nacht: { tint: [30, 45, 110, .26], dark: .80, sun: { c: '140,160,235', a: .16, dx: 30, dy: 140, c2: '160,175,240', a2: .12 } } },
  tod(D, n) { const th = D.LAY().theme, T = L5.TODS[n]; th.tod = n; th.tint = T.tint; th.dark = T.dark; th.sun = Object.assign({ c: '255,238,196', a: .5, dx: 76, dy: 151, c2: '255,240,205', a2: .2 }, T.sun); },
  shadow(m) { while (V3OPT.shadow !== m) V3OPT.cycleShadow(); },
  grab(V) { V.render(); const c = document.createElement('canvas'); c.width = 480; c.height = 272; const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(V.el, 0, 0, 480, 272); return g.getImageData(0, 0, 480, 272).data; },
  // mittlere Helligkeit (0 bis 255) im Kasten um den Bildpunkt (sx, sy, logisch 960x544), r halbe Kantenlaenge in logischen Punkten
  lum(A, sx, sy, r) { let s = 0, n = 0; for (let y = Math.round((sy - r) / 2); y <= Math.round((sy + r) / 2); y++) for (let x = Math.round((sx - r) / 2); x <= Math.round((sx + r) / 2); x++) { if (x < 0 || y < 0 || x >= 480 || y >= 272) continue; const k = (y * 480 + x) * 4; s += (A[k] + A[k + 1] + A[k + 2]) / 3; n++; } return n ? s / n : 0; },
  all(A) { let s = 0; for (let k = 0; k < A.length; k += 4) s += (A[k] + A[k + 1] + A[k + 2]) / 3; return s / (A.length / 4); },
};`;

const SETUP = `(async () => { const D = __dbg; const i0 = await D.view3d.set(true); if (i0.state !== 'an') return i0;
  D.setScenario('bank'); D.buildSeed('classic'); D.setFocus(true); D.CFG.policeAt = 1e6; D.CFG.policeForced = 1e6; D.reset();
  for (let i = 0; i < 10; i++) D.update(1 / 30);
  D.draw(); return D.view3d.info(); })()`;

module.exports = [
  {
    name: '3D-Licht: je Tageszeit andere Licht- und Farbwerte, Nacht dunkler als Mittag, Lampen nur in Daemmerung und Nacht, Licht aus wie 3D-4',
    timeout: 300000,
    async run(t) {
      const P = await glPage(t); if (!P) return;
      try {
        const page = P.page; await page.evaluate(HELP); const i0 = await page.evaluate(SETUP);
        if (i0.state !== 'an') { t.ok(false, '3D nicht an: ' + JSON.stringify(i0)); return; }
        const r = await page.evaluate(() => { const D = __dbg, V = D.view3d.V, o = {}; L5.shadow('aus');
          for (const n of Object.keys(L5.TODS)) { L5.tod(D, n); D.draw(); const A = L5.grab(V), i = V.info(); o[n] = { l: i.light, lum: L5.all(A), errs: i.errs }; }
          // Licht aus: dieselbe Nacht wie ohne Licht (3D-4): heller als die beleuchtete Nacht, Werte stehen auf aus
          V.cfg.light.lit = false; o.off = { lum: L5.all(L5.grab(V)), l: V.info().light }; V.cfg.light.lit = true;
          // Lage-Tag nacht auf einer Tageskarte (nightOn ohne Tageszeit nacht): Himmel dunkler als am Mittag, Taschenlampe an
          L5.tod(D, 'mittag'); const lg = D.LAY().mission; const lg0 = lg.lg; lg.lg = (lg0 || []).concat(['nacht']); D.draw(); o.lg = { l: V.info().light, lum: L5.all(L5.grab(V)) }; lg.lg = lg0;
          L5.tod(D, 'mittag'); D.draw(); return o; });
        const N = Object.keys(r).filter(k => !['off', 'lg'].includes(k));
        t.note('Helligkeit je Tageszeit: ' + N.map(n => n + ' ' + r[n].lum.toFixed(1)).join(', ') + '; Licht aus (Nacht) ' + r.off.lum.toFixed(1) + ', Lage-Tag Nacht ' + r.lg.lum.toFixed(1));
        t.ok(N.every(n => r[n].errs === 0 && r[n].l.tod === n && r[n].l.lit), 'jede Tageszeit zeichnet ohne Fehler und meldet sich: ' + N.map(n => r[n].l.tod).join(','));
        const key = n => JSON.stringify([r[n].l.sun, r[n].l.dir, r[n].l.sky, r[n].l.tint].map(a => a.map(v => Math.round(v * 1000))));
        t.eq(new Set(N.map(key)).size, 5, 'fuenf verschiedene Saetze aus Sonne, Richtung, Himmel und Toenung');
        t.ok(r.mittag.l.dir[1] > r.morgen.l.dir[1] && r.mittag.l.dir[1] > r.abend.l.dir[1] && r.abend.l.dir[1] > r.daemmerung.l.dir[1] - .2, 'Mittagssonne steht am hoechsten: ' + N.map(n => n + ' ' + r[n].l.dir[1].toFixed(2)).join(', '));
        t.ok(r.abend.l.dir[0] < 0 && r.morgen.l.dir[0] > 0, 'Sonne morgens im Osten, abends im Westen (gegen die 2D-Lichtbahnen dx): morgen ' + r.morgen.l.dir[0].toFixed(2) + ', abend ' + r.abend.l.dir[0].toFixed(2));
        t.ok(r.nacht.lum < r.mittag.lum * .75 && r.daemmerung.lum < r.mittag.lum && r.nacht.lum < r.daemmerung.lum, 'Nacht dunkler als Daemmerung, beide dunkler als Mittag: ' + [r.nacht.lum, r.daemmerung.lum, r.mittag.lum].map(v => v.toFixed(1)).join(' < '));
        t.ok(r.mittag.l.grade === 0 && r.mittag.l.tint[3] === 0 && r.abend.l.tint[3] > 0, 'Toenung wie 2D (mittag keine, abend orange), Farbkorrektur in Stufe niedrig aus');
        t.ok(!r.mittag.l.lamps && !r.morgen.l.lamps && !r.abend.l.lamps && r.daemmerung.l.lamps && r.nacht.l.lamps, 'Lampen der Karte nur in Daemmerung und Nacht');
        t.ok(r.mittag.l.pl.length === 0 && r.nacht.l.pl.some(p => p[0] === 'lamp' || p[0] === 'street'), 'Punktlichter: mittags keine, nachts Lampen');
        t.ok(r.nacht.l.spot && !r.mittag.l.spot && !r.daemmerung.l.spot, 'Taschenlampe nur bei Nacht');
        t.ok(!r.off.l.lit && r.off.lum > r.nacht.lum * 1.3, 'Licht aus: ohne Abdunklung der Nacht (wie 3D-4), heller: ' + r.off.lum.toFixed(1));
        t.ok(r.lg.l.night && r.lg.l.spot && r.lg.lum < r.mittag.lum * .8 && r.lg.l.sky[0] < r.mittag.l.sky[0], 'Lage-Tag Nacht auf der Mittagskarte: dunkler, Taschenlampe an');
      } finally { await P.done(); }
    },
  },
  {
    name: '3D-Licht: Schatten-Regler (Auto nach Grafikstufe, an, aus) schaltet die Schattenkarte, Schatten dunkeln den Boden hinter der Wand ab, Optionen merken die Wahl',
    timeout: 300000,
    async run(t) {
      const P = await glPage(t); if (!P) return;
      try {
        const page = P.page; await page.evaluate(HELP); const i0 = await page.evaluate(SETUP);
        if (i0.state !== 'an') { t.ok(false, '3D nicht an: ' + JSON.stringify(i0)); return; }
        const r = await page.evaluate(() => { const D = __dbg, V = D.view3d.V, o = {}; L5.tod(D, 'mittag');
          const st = () => { D.draw(); const i = V.info(); return { sh: i.light.shadow, calls: i.calls, sp: V.scene.children.filter(m => m.name === 'schatten' && m.visible).map(m => m.count)[0] || 0 }; };
          const gfx = n => { GFX.set(n); };
          L5.shadow('auto'); gfx('niedrig'); o.autoLo = st(); gfx('mittel'); o.autoMid = st(); gfx('hoch'); o.autoHi = st();
          gfx('mittel'); L5.shadow('aus'); o.aus = st(); const u0 = o.aus.sh.ups, k0 = V.info().relink; D.draw(); D.draw(); o.ausUps = V.info().light.shadow.ups - u0; o.relink0 = V.info().relink - k0; o.defsAus = V.info().defs;
          L5.shadow('an'); gfx('niedrig'); o.anLo = st(); gfx('mittel'); o.an = st(); o.defsAn = V.info().defs; o.relink1 = V.info().relink - k0;
          // Boden suedoestlich der Wand (die Sonne steht im Nordwesten) mit und ohne Schatten: Stichpunkte im Bild, an denen der Schatten etwas aendert
          const me = D.get().me, W = D.world(), pts = [];
          for (let y = me.y - 260; y <= me.y + 80; y += 8) for (let x = me.x - 300; x <= me.x + 300; x += 8) { const c = W.cell(Math.floor(x / 32), Math.floor(y / 32)); if (c !== '.' && c !== 'o') continue; const s = V.toScr(x, y, 0); if (s[0] > 20 && s[0] < 940 && s[1] > 20 && s[1] < 524) pts.push([x, y, s]); }
          L5.shadow('an'); const A = L5.grab(V); L5.shadow('aus'); const B = L5.grab(V); L5.shadow('an');
          let dark = 0, light = 0; for (const p of pts) { const d = L5.lum(A, p[2][0], p[2][1], 2) - L5.lum(B, p[2][0], p[2][1], 2); if (d < -6) dark++; if (d > 6) light++; }
          o.pts = pts.length; o.dark = dark; o.light = light; o.lumA = L5.all(A); o.lumB = L5.all(B);
          // Optionen: Kachel Schatten (Taste S) schaltet Auto, an, aus und merkt die Wahl
          L5.shadow('auto'); localStorage.removeItem('holdup.schatten'); return o; });
        t.note('Schatten an: ' + JSON.stringify(r.an.sh) + ', Draw Calls ' + r.an.calls + ' (aus ' + r.aus.calls + '); Boden: ' + r.dark + ' von ' + r.pts + ' Stichpunkten dunkler, ' + r.light + ' heller; Bild ' + r.lumA.toFixed(1) + ' gegen ' + r.lumB.toFixed(1));
        t.ok(!r.autoLo.sh.on && r.autoMid.sh.on && r.autoHi.sh.on, 'Auto: aus in niedrig, an ab mittel');
        t.eq([r.autoMid.sh.size, r.autoHi.sh.size], [1024, 2048], 'Schattenkarte 1024 in mittel, 2048 in hoch (hoechstens 2048)');
        t.ok(!r.aus.sh.on && r.aus.sh.size === 0 && r.ausUps === 0, 'aus: keine Schattenkarte, kein Schatten-Durchgang');
        t.ok(r.anLo.sh.on && r.an.sh.on && r.an.sh.calls > 0 && r.an.sh.calls <= 12, 'an: auch in niedrig, Schatten-Durchgang mit ' + r.an.sh.calls + ' Draw Calls (statische Welt, Koerper, Kloetze)');
        t.ok(r.relink0 === 0 && r.relink1 === 1 && r.defsAus === '' && r.defsAn === 'S', 'Shader-Schalter: ohne Aenderung kein neues Uebersetzen, an schaltet L_SH (' + JSON.stringify([r.relink0, r.relink1, r.defsAus, r.defsAn]) + ')');
        t.ok(r.aus.sp > 0 && r.an.sp === 0, 'aus: Figuren mit Schattenfleck wie 2D (' + r.aus.sp + '), an: Schatten aus der Schattenkarte statt Fleck');
        t.ok(r.dark >= 15 && r.dark > r.light * 3, 'Schatten dunkeln den Boden ab: ' + r.dark + ' Stichpunkte dunkler, ' + r.light + ' heller');
        t.ok(r.lumA < r.lumB, 'Bild mit Schatten insgesamt dunkler');
        // Optionen ueber die Kachel: Pause, Optionen, Taste S schaltet Auto, an, aus und merkt die Wahl
        await page.evaluate(() => { localStorage.removeItem('holdup.schatten'); L5.shadow('auto'); GFX.set('niedrig'); });
        await page.focus('#c'); await page.keyboard.press('Escape'); await page.keyboard.press('o');
        const ids = await page.evaluate(() => __dbg.ui().tiles().map(q => q.id));
        t.ok(ids.includes('schatten'), 'Kachel Schatten in den Optionen: ' + ids);
        const seq = []; for (let k = 0; k < 3; k++) { await page.keyboard.press('s'); seq.push(await page.evaluate(() => [V3OPT.shadow, localStorage.getItem('holdup.schatten')].join('/'))); }
        t.eq(seq, ['an/an', 'aus/aus', 'auto/auto'], 'Taste S in den Optionen: Auto, an, aus, gespeichert');
        await page.keyboard.press('Escape'); await page.keyboard.press('Escape');
        await page.evaluate(() => localStorage.removeItem('holdup.schatten'));
      } finally { await P.done(); }
    },
  },
  {
    name: '3D-Licht: Taschenlampe folgt der Blickrichtung, Blaulicht nur bei Streifenwagen mit Licht, Muendungsfeuer kurz, Punktlichter begrenzt auf die naechsten',
    timeout: 300000,
    async run(t) {
      const P = await glPage(t); if (!P) return;
      try {
        const page = P.page; await page.evaluate(HELP); const i0 = await page.evaluate(SETUP);
        if (i0.state !== 'an') { t.ok(false, '3D nicht an: ' + JSON.stringify(i0)); return; }
        // Taschenlampe: Spieler auf der Strasse, Blick nach Osten, dann Westen; Boden 170 px vor und hinter ihm
        const f = await page.evaluate(() => { const D = __dbg, V = D.view3d.V, o = []; L5.shadow('aus'); L5.tod(D, 'nacht');
          const g = D.get(), me = g.me, ln = D.LANE(), y0 = me.y; me.y = y0 + 40;
          for (const a of [0, Math.PI, Math.PI / 2]) { me.a = a; D.draw(); const A = L5.grab(V), i = V.info().light, e = V.toScr(me.x + 170, me.y, 0), w = V.toScr(me.x - 170, me.y, 0), s = V.toScr(me.x, me.y + 170, 0);
            o.push({ a, spot: i.spot, east: L5.lum(A, e[0], e[1], 12), west: L5.lum(A, w[0], w[1], 12), south: L5.lum(A, s[0], s[1], 12) }); }
          me.y = y0; void ln; return o; });
        t.note('Taschenlampe: ' + f.map(q => 'Winkel ' + q.a.toFixed(2) + ' Ost ' + q.east.toFixed(1) + ' West ' + q.west.toFixed(1) + ' Sued ' + q.south.toFixed(1)).join('; '));
        t.ok(f.every(q => q.spot && Math.abs(q.spot.dir[0] - Math.cos(q.a) * Math.hypot(q.spot.dir[0], q.spot.dir[2])) < .02 && Math.abs(q.spot.dir[2] - Math.sin(q.a) * Math.hypot(q.spot.dir[0], q.spot.dir[2])) < .02 && q.spot.dir[1] < 0), 'Spot zeigt in Blickrichtung, leicht nach unten');
        t.ok(f[0].east > f[0].west + 8 && f[1].west > f[1].east + 8, 'Blick nach Osten: Osten heller; nach Westen: Westen heller');
        t.ok(f[2].south > f[0].south + 8, 'Blick nach Sueden: Sueden heller als beim Blick nach Osten');

        // Blaulicht und Muendungsfeuer im Ueberfall bei Nacht
        const b = await page.evaluate(() => { const D = __dbg, V = D.view3d.V, o = {}; L5.shadow('aus');
          D.CFG.policeAt = 6; D.CFG.policeForced = 6; D.reset(); D.startHeist(false, D.get().me); L5.tod(D, 'nacht');
          for (let i = 0; i < 30 * 45; i++) { D.get().me.hp = 1e9; D.update(1 / 30); }
          const g = D.get(), c = g.pcs.find(q => !q.civ && !q.dead); if (c) { g.me.x = c.x + 60; g.me.y = c.y - 120; } D.get().me.hp = 1e9; D.update(1 / 30);
          const cnt = () => { D.draw(); const i = V.info().light; return { pl: i.pl, cand: i.cand, bl: i.pl.filter(p => p[0] === 'red' || p[0] === 'blue').length, nb: i.nBlue, muz: i.pl.filter(p => p[0] === 'muz').length }; };
          o.pol = g.pcs.filter(q => !q.civ && !q.dead).length; o.civ = g.pcs.filter(q => q.civ).length; o.a = cnt();
          // Licht faellt auf den Boden vor dem Wagen (mit und ohne Blaulicht)
          if (c) { const s = V.toScr(c.x, c.y + 50, 0), A = L5.grab(V), b0 = V.cfg.light.pl.blue.i, r0 = V.cfg.light.pl.red.i; V.cfg.light.pl.blue.i = V.cfg.light.pl.red.i = 0; const B = L5.grab(V); V.cfg.light.pl.blue.i = b0; V.cfg.light.pl.red.i = r0; o.glow = L5.lum(A, s[0], s[1], 10) - L5.lum(B, s[0], s[1], 10); }
          // Streifenwagen ohne Licht (alle zivil, dann alle Wracks): kein Blaulicht
          const keep = g.pcs.map(q => [q.civ, q.dead]); g.pcs.forEach(q => { q.civ = 1 }); o.civAll = cnt(); g.pcs.forEach(q => { q.civ = 0; q.dead = 1 }); o.deadAll = cnt(); g.pcs.forEach((q, i) => { q.civ = keep[i][0]; q.dead = keep[i][1] });
          // Muendungsfeuer: Spieler schiesst (flash), nach 0,1 s ist es weg
          const me = D.get().me; g.en.forEach(q => { q.fl = 0 }); if (g.dl && g.dl.dv) g.dl.dv.fl = 0; me.flash = .05; o.fl = cnt(); o.flFirst = o.fl.pl[0]; o.flWant = [Math.round(me.x + Math.cos(me.a) * 30), Math.round(me.y + Math.sin(me.a) * 30)]; me.flash = 0; o.fl0 = cnt();
          const e = g.en.find(q => q.hp > 0); if (e) { me.x = e.x; me.y = e.y - 60; e.fl = .05; o.efl = cnt(); e.fl = 0; }
          // Begrenzung: viele Kandidaten, hoechstens max, die naechsten Lampen
          o.max = V.cfg.light.pl.max; o.lampList = V.info().lampList; o.tgt = V.info().tgt; o.full = cnt();
          return o; });
        t.note('Ueberfall bei Nacht: ' + b.pol + ' Streifenwagen, ' + b.civ + ' zivile Autos; Punktlichter ' + JSON.stringify(b.a.pl) + ' von ' + b.a.cand + ' Kandidaten; Blaulicht hellt den Boden um ' + (b.glow || 0).toFixed(1) + ' auf');
        t.ok(b.pol > 0 && b.a.nb === b.pol, 'je Streifenwagen mit Licht ein Blaulicht (' + b.a.nb + ' fuer ' + b.pol + ')');
        t.ok(b.a.bl > 0 && b.glow > 10, 'Blaulicht unter den Punktlichtern und hellt den Boden vor dem Wagen auf');
        t.ok(b.civAll.nb === 0 && b.civAll.bl === 0 && b.deadAll.nb === 0, 'zivile Autos und Wracks ohne Blaulicht');
        t.ok(b.fl.muz === 1 && b.flFirst[0] === 'muz' && Math.abs(b.flFirst[1] - b.flWant[0]) <= 1 && Math.abs(b.flFirst[2] - b.flWant[1]) <= 1 && b.fl0.muz === 0, 'Muendungsfeuer des Spielers als erstes Licht vor der Waffe, danach keins: ' + JSON.stringify([b.flFirst, b.flWant]));
        t.ok(!b.efl || b.efl.muz === 1, 'Muendungsfeuer eines Gegners in Sicht als Licht');
        t.ok(b.full.pl.length === b.max && b.full.cand > b.max, 'hoechstens ' + b.max + ' Punktlichter bei ' + b.full.cand + ' Kandidaten');
        const d2 = p => (p[1] - b.tgt[0]) ** 2 + (p[2] - b.tgt[1]) ** 2, lampsIn = b.full.pl.filter(p => p[0] === 'lamp' || p[0] === 'street');
        if (lampsIn.length) { const worst = Math.max(...lampsIn.map(d2)), skipped = b.lampList.filter(p => !lampsIn.some(q => q[1] === p[1] && q[2] === p[2])); t.ok(skipped.every(p => d2(p) >= worst - 1), 'die gewaehlten Lampen sind die naechsten zum Blickpunkt'); }
      } finally { await P.done(); }
    },
  },
  {
    name: '3D-Licht: Spielzustand nach 600 Schritten ist mit und ohne 3D gleich (Nacht, Schatten an, Grafik mittel)',
    timeout: 240000,
    async run(t) {
      const P = await glPage(t); if (!P) return;
      try {
        const page = P.page; await page.evaluate(HELP);
        const r = await page.evaluate(async () => {
          const D = __dbg; GFX.set('mittel'); L5.shadow('an');
          const mb = s => () => { s = s + 0x6D2B79F5 | 0; let q = Math.imul(s ^ s >>> 15, 1 | s); q = q + Math.imul(q ^ q >>> 7, 61 | q) ^ q; return ((q ^ q >>> 14) >>> 0) / 4294967296; };
          const R0 = Math.random;
          async function run(on) {
            await D.view3d.set(on); D.setScenario('bank'); D.buildSeed('classic');
            const rs = mb(42), rd = mb(7); Math.random = rs; D.reset(); L5.tod(D, 'nacht'); D.setTime(0); D.setFocus(true);
            const V = D.view3d.V; if (on && V) V.pick = (sx, sy) => [sx + D.cam()[0], sy + D.cam()[1]];
            const K = D.keys, M = D.mouse; M.sx = 640; M.sy = 200;
            for (let i = 0; i < 600; i++) {
              for (const k of 'wasd') delete K[k];
              K[['d', 'w', 'a', 's'][Math.floor(i / 60) % 4]] = 1;
              if (i === 240) D.startHeist();
              D.update(1 / 30);
              if (i % 10 === 9) { Math.random = rd; D.draw(); Math.random = rs; }
            }
            Math.random = R0;
            const g = D.get();
            const s = JSON.stringify({ t: g.time, ph: g.phase, me: [g.me.x, g.me.y, g.me.a, g.me.hp, g.me.mag], en: g.en.map(e => [e.x, e.y, e.hp]), npc: g.npcs.map(n => [n.x, n.y]), its: g.its.map(o => [o.t, !!o.done, o.pr]), M: D.world().M.join(''), sus: g.sus, sec: g.secured, pol: g.policeAt, cam: D.cam() });
            let h = 0; for (let i = 0; i < s.length; i++) h = Math.imul(h, 31) + s.charCodeAt(i) | 0;
            return { h, info: D.view3d.info(), ph: g.phase };
          }
          const off = await run(false), on = await run(true);
          D.view3d.reset(); for (const k of 'wasd') delete D.keys[k]; L5.shadow('auto'); localStorage.removeItem('holdup.schatten'); GFX.set('niedrig');
          return { off, on };
        });
        t.ok(r.on.info.state === 'an' && r.on.info.frames >= 50 && r.on.info.errs === 0 && r.on.info.light && r.on.info.light.night && r.on.info.light.shadow.on, '3D hat bei Nacht mit Schatten gezeichnet: ' + JSON.stringify({ fr: r.on.info.frames, errs: r.on.info.errs, sh: r.on.info.light && r.on.info.light.shadow }));
        t.eq(r.on.h, r.off.h, 'Zustandshash nach 600 Schritten gleich mit und ohne 3D');
      } finally { await P.done(); }
    },
  },
];
