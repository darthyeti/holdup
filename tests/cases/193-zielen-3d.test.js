// 3D-3 (Ticket 152): Zielen und Kamera der 3D-Ansicht (js/view3d.js camSet, pick, toScr, Schnitt uCut, Silhouette, seen; js/draw.js ring3d und Fadenkreuz).
// Kein Pixelvergleich gegen Referenzen: Sichtbarkeit misst V.seen (Anteil der Bildpunkte um die Figur, die sich aendern, wenn sie fehlt), Treffer der Spielzustand.
// Ohne WebGL 2 (auch nicht mit SwiftShader-Flags) ueberspringt der Test mit Meldung.
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
// Bank (feste Karte), 3D an, Ueberfall mit gezogener Waffe, keine Polizei. Hilfen in der Seite: H.put (Spieler setzen und Kamera einschwingen), H.spots (Wand direkt suedlich)
const SETUP = `(async () => { const D = __dbg; const i0 = await D.view3d.set(true); if (i0.state !== 'an') return i0;
  D.setScenario('bank'); D.buildSeed('classic'); D.setFocus(true); D.CFG.policeAt = 1e6; D.CFG.policeForced = 1e6; D.reset(); D.startHeist(false, D.get().me);
  for (let i = 0; i < 5; i++) D.update(1 / 30);
  const W = D.world(), T = 32;
  window.H3 = {
    put(x, y, a) { const me = D.get().me; for (let k = 0; k < 60; k++) { me.x = x; me.y = y; if (a != null) me.a = a; me.hp = 1e9; me.vx = 0; me.vy = 0; D.update(1 / 30); } me.x = x; me.y = y; D.draw(); return me; },
    // begehbare Kacheln mit drei Wandkacheln direkt suedlich (die Wand steht zwischen Kamera und Figur) und eine Kachel Abstand zum Bildrand
    spots() { const o = []; for (let y = W.WY0 + 2; y < W.WY0 + W.H - 3; y++) for (let x = W.WX0 + 2; x < W.WX0 + W.W - 2; x++)
      if (!W.isSol(x, y) && !W.isSol(x, y - 1) && W.cell(x, y + 1) === '#' && W.cell(x - 1, y + 1) === '#' && W.cell(x + 1, y + 1) === '#') o.push([x * T + 16, y * T + 22]); return o; },
    // Bildausschnitt der WebGL-Leinwand nach einem render() (logische Koordinaten)
    grab(x0, y0, x1, y1) { const V = D.view3d.V, q = V.el.width / 960, c = document.createElement('canvas'), w = Math.round((x1 - x0) * q), h = Math.round((y1 - y0) * q); c.width = w; c.height = h;
      V.render(); const g = c.getContext('2d'); g.drawImage(V.el, Math.round(x0 * q), Math.round(y0 * q), w, h, 0, 0, w, h); return g.getImageData(0, 0, w, h).data; },
    diff(a, b) { let n = 0; for (let i = 0; i < a.length; i += 4) if (Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]) > 24) n++; return n / (a.length / 4); },
  };
  return D.view3d.info(); })()`;

module.exports = [
  {
    name: '3D-Zielen: Rundlauf pick(toScr) unter 1 px am Boden und in Waffenhoehe bei 20, 25 und 30 Grad, Maus auf Gegner trifft (oben und unten im Bild), Bodenring am Zielpunkt',
    timeout: 300000,
    async run(t) {
      const P = await glPage(t); if (!P) return;
      try {
        const page = P.page, i0 = await page.evaluate(SETUP);
        if (i0.state !== 'an') { t.ok(false, '3D nicht an: ' + JSON.stringify(i0)); return; }
        const rt = await page.evaluate(() => {
          const D = __dbg, V = D.view3d.V, A = V.cfg.aimH, out = [];
          for (const ang of [20, 25, 30]) {
            V3OPT.setAngle(ang); D.draw(); let e1 = 0, e2 = 0;
            for (const h of [0, A]) for (const sx of [4, 240, 480, 720, 956]) for (const sy of [4, 136, 272, 408, 540]) {
              const w = V.pick(sx, sy, h), s = V.toScr(w[0], w[1], h); e1 = Math.max(e1, Math.hypot(s[0] - sx, s[1] - sy));
              const s2 = V.toScr(w[0] + 37, w[1] - 23, h), w2 = V.pick(s2[0], s2[1], h); e2 = Math.max(e2, Math.hypot(w2[0] - w[0] - 37, w2[1] - w[1] + 23));
            }
            out.push([ang, e1, e2, V.info().angle]);
          }
          V3OPT.setAngle(25); D.draw(); return out;
        });
        for (const [a, e1, e2, ia] of rt) t.ok(ia === a && e1 < 1 && e2 < 1, 'Rundlauf bei ' + a + ' Grad (Bild -> Welt -> Bild ' + e1.toFixed(4) + ' px, Welt -> Bild -> Welt ' + e2.toFixed(4) + ' px)');
        // Treffer: ein stehender Beamter, Maus dort, wo er im Bild steht (Mitte des Sprites in Hoehe spriteH), Schuss ohne Streuung (Math.random 0.5) muss treffen.
        // Abweichung: Weltpunkt der Maus (pick in aimH) gegen die Mitte des Beamten, fuer Maus auf dem Sprite und auf der Brust (bodyH/2).
        const hr = await page.evaluate(() => {
          // Spieler auf der freien Flaeche oestlich der Bank (Kamera oben und rechts am Kartenrand), Ziele auf einem Gitter um ihn: frei, in Sicht, im Bild, mindestens 70 px weg;
          // daraus die zwei obersten, die zwei untersten und vier aus der Mitte
          const D = __dbg, V = D.view3d.V, C = V.cfg, g = D.get(), W = D.world(), me = H3.put(33 * 32 + 16, -1 * 32 + 16, 1.57), out = [], cand = [];
          for (let dx = -320; dx <= 160; dx += 80) for (let dy = -160; dy <= 420; dy += 45) {
            const x = me.x + dx, y = me.y + dy, s = V.toScr(x, y, C.spriteH), cl = (a, b) => { for (let k = 0; k <= 8; k++) { const qx = Math.floor((me.x + (x - me.x) * k / 8 + a) / 32), qy = Math.floor((me.y + (y - me.y) * k / 8 + b) / 32); if (W.isSol(qx, qy)) return false } return true };
            if (Math.hypot(dx, dy) < 70 || s[0] < 20 || s[0] > 940 || s[1] < 10 || s[1] > 534 || !D.los(me.x, me.y, x, y) || !cl(0, 0) || !cl(10, 0) || !cl(-10, 0) || !cl(0, 10) || !cl(0, -10)) continue;
            cand.push([dx, dy, s[1]]);
          }
          cand.sort((a, b) => a[2] - b[2]); const mid = cand.slice(2, -2), offs = cand.slice(0, 2).concat(cand.slice(-2), [0, 1, 2, 3].map(k => mid[Math.floor(mid.length * (k + .5) / 4)]).filter(Boolean));
          const R0 = Math.random;
          for (const [dx, dy] of offs) {
            const x = me.x + dx, y = me.y + dy;
            const e = D.mkCop(x, y, 'cop'); e.a = 0; g.en.push(e);
            const s = V.toScr(x, y, C.spriteH), b = V.toScr(x, y, C.bodyH / 2), pw = V.pick(s[0], s[1]), pb = V.pick(b[0], b[1]);
            const M = D.mouse; M.sx = s[0]; M.sy = s[1]; M.t = g.time + 1; let hit = 0, n = 0;
            Math.random = () => .5;
            try { for (; n < 45 && !hit; n++) { const E = D.get().en; if (!E.includes(e)) E.push(e); e.x = x; e.y = y; e.react = 0; e.cool = 9; me.hp = 1e9; me.cool = Math.min(me.cool, .02); me.rec = 0; me.mag = 12; me.rl = 0; M.t = D.get().time; D.draw(); M.down = 1; D.update(1 / 30); if (e.hp < e.mhp) hit = 1; } }
            finally { Math.random = R0; M.down = 0; }
            out.push({ dx, dy, sy: Math.round(s[1]), hit, n, dSpr: Math.hypot(pw[0] - x, pw[1] - y), dBody: Math.hypot(pb[0] - x, pb[1] - y), flat: Math.hypot(M.sx + D.cam()[0] - x, M.sy + D.cam()[1] - y) });
            { const E = D.get().en, k = E.indexOf(e); if (k >= 0) E.splice(k, 1); } D.get().bl.length = 0;
          }
          return out;
        });
        const used = hr.filter(o => !o.skip);
        t.note('Ziele (Bild-y, Treffer nach Bildern, Abweichung Maus auf Sprite / Brust / 2D-Umrechnung in Weltpixeln): ' + used.map(o => o.sy + ':' + o.n + ':' + o.dSpr.toFixed(1) + '/' + o.dBody.toFixed(1) + '/' + o.flat.toFixed(0)).join('  '));
        t.ok(used.length >= 6, 'genug Ziele in Sicht: ' + used.length + ' von ' + hr.length);
        t.ok(used.some(o => o.sy < 140) && used.some(o => o.sy > 420), 'Ziele oben und unten im Bild: ' + used.map(o => o.sy).join(','));
        t.eq(used.filter(o => !o.hit).map(o => [o.dx, o.dy]), [], 'Maus auf dem Beamten trifft (stehend, ohne Streuung), Ziele ohne Treffer');
        t.ok(used.every(o => o.dSpr < 4 && o.dBody < 9), 'Abweichung Maus auf Gegner gegen Treffpunkt unter dem Koerperradius: ' + used.map(o => o.dSpr.toFixed(1) + '/' + o.dBody.toFixed(1)).join(' '));
        t.ok(used.some(o => o.flat > 20), 'ohne pick (2D-Umrechnung) laege der Punkt daneben: ' + used.map(o => o.flat.toFixed(0)).join(','));
        // Bodenring: am Weltpunkt der Maus, im Bild unter dem Fadenkreuz (Boden liegt tiefer als die Waffenhoehe); Fadenkreuz bleibt an der Maus
        const rg = await page.evaluate(() => { const D = __dbg, V = D.view3d.V, M = D.mouse; for (let k = 0; k < 45; k++) { D.get().me.hp = 1e9; D.update(1 / 30); } D.ptClear(); M.sx = 600; M.sy = 200; M.t = D.get().time; D.draw(); const r = D.view3d.ring(); const g1 = r && V.toScr(r[0], r[1], 0); return { r, mx: [M.x, M.y], g1 }; });
        t.ok(rg.r && Math.hypot(rg.r[0] - rg.mx[0], rg.r[1] - rg.mx[1]) < .01 && Math.hypot(rg.r[2] - rg.g1[0], rg.r[3] - rg.g1[1]) < .01, 'Bodenring am Zielpunkt: ' + JSON.stringify(rg));
        t.ok(rg.r && rg.r[3] > 200 && rg.r[3] - 200 < 20, 'Ring am Boden etwas unter der Maus: ' + (rg.r && rg.r[3]));
        await page.evaluate(() => __dbg.view3d.reset());
        if (page !== t.page && page.errors.length) t.ok(false, 'JS-Fehler: ' + page.errors.slice(0, 2).join(' | '));
      } finally { await P.done(); }
    },
  },
  {
    name: '3D-Kamera: folgt dem Spieler mit Glaettung, Spieler unter der Bildmitte, Bodenbreite etwa 30 Kacheln, Wackeln und Rueckstoss verschieben die Kamera',
    timeout: 240000,
    async run(t) {
      const P = await glPage(t); if (!P) return;
      try {
        const page = P.page, i0 = await page.evaluate(SETUP);
        if (i0.state !== 'an') { t.ok(false, '3D nicht an: ' + JSON.stringify(i0)); return; }
        const r = await page.evaluate(() => {
          const D = __dbg, V = D.view3d.V, C = V.cfg, o = {}; let me = H3.put(9 * 32 + 16, 9 * 32 + 16);
          const t0 = V.info().tgt, s0 = V.toScr(me.x, me.y, 0); o.s0 = s0; o.t0 = t0; o.lead = me.y - t0[1];
          me.x += 160; D.update(1 / 30); D.draw(); o.t1 = V.info().tgt; for (let k = 0; k < 60; k++) { me.hp = 1e9; D.update(1 / 30); } D.draw(); o.t2 = V.info().tgt; o.dx = me.x - (o.t0[0] + 160);
          const a = V.toScr(me.x - 480, me.y, 0), b = V.toScr(me.x + 480, me.y, 0); o.w = [a[0], b[0]];
          // Bodenbreite in Kacheln in der Zeile des Spielers: Weltpunkte am linken und rechten Bildrand
          const l = V.pick(0, V.toScr(me.x, me.y, 0)[1], 0), rr = V.pick(960, V.toScr(me.x, me.y, 0)[1], 0); o.tiles = (rr[0] - l[0]) / 32;
          // Rueckstoss (Treffer des eigenen Spielers) verschiebt camX/camY beim Zeichnen, also auch die 3D-Kamera
          const base = V.info().tgt; let moved = 0; D.evt('sh', [me.id, me.x, me.y, 0]); D.evt('hf', [me.x + 200, me.y, 5, me.id + 1, 0]);
          for (let k = 0; k < 6; k++) { D.draw(); const q = V.info().tgt; moved = Math.max(moved, Math.hypot(q[0] - base[0], q[1] - base[1])); } o.kick = moved;
          D.ptClear(); for (let k = 0; k < 30; k++) { me.hp = 1e9; D.update(1 / 30); } D.draw(); o.calm = V.info().tgt; o.base = base;
          return o;
        });
        t.ok(r.s0[1] > 272 + 20 && r.s0[1] < 272 + 80 && Math.abs(r.s0[0] - 480) < 2, 'Spieler mittig, unter der Bildmitte (vorn mehr Bild): ' + r.s0.map(v => v.toFixed(1)));
        t.ok(Math.abs(r.lead - 40) < 1, 'Blickpunkt camLead noerdlich des Spielers: ' + r.lead);
        t.ok(r.t1[0] > r.t0[0] + 5 && r.t1[0] < r.t0[0] + 160 - 5, 'Kamera folgt geglaettet (ein Bild: Teilstrecke): ' + (r.t1[0] - r.t0[0]).toFixed(1));
        t.ok(Math.abs(r.t2[0] - r.t0[0] - 160) < 1, 'Kamera hat den Spieler eingeholt: ' + (r.t2[0] - r.t0[0]).toFixed(1));
        t.ok(r.tiles > 27 && r.tiles < 33, 'sichtbare Bodenbreite in der Zeile des Spielers etwa 30 Kacheln: ' + r.tiles.toFixed(1));
        t.ok(r.kick > .4, 'Rueckstoss verschiebt die 3D-Kamera: ' + r.kick.toFixed(2));
        t.ok(Math.hypot(r.calm[0] - r.base[0], r.calm[1] - r.base[1]) < .6, 'danach wieder ruhig: ' + JSON.stringify([r.calm, r.base]));
        await page.evaluate(() => __dbg.view3d.reset());
      } finally { await P.done(); }
    },
  },
  {
    name: '3D-Verdeckung: Wand zwischen Kamera und Spieler wird ausgeblendet (Spieler bleibt erkennbar), Wand hinter ihm nicht, Silhouette nur hinter Verdeckung und nur fuer Spieler, Team und Gegner in Sicht',
    timeout: 300000,
    async run(t) {
      const P = await glPage(t); if (!P) return;
      try {
        const page = P.page, i0 = await page.evaluate(SETUP);
        if (i0.state !== 'an') { t.ok(false, '3D nicht an: ' + JSON.stringify(i0)); return; }
        const r = await page.evaluate(() => {
          const D = __dbg, V = D.view3d.V, C = V.cfg, cut0 = C.cutR, o = { rows: [] }, sp = H3.spots();
          const pick = sp.filter((_, i) => i % Math.max(1, Math.floor(sp.length / 6)) === 0).slice(0, 6);
          for (const [x, y] of pick) {
            H3.put(x, y, -1.57);
            const a = V.seen(x, y); C.cutR = 0; const b = V.seen(x, y); C.sil = false; const c = V.seen(x, y); C.cutR = cut0; C.sil = true;
            o.rows.push([x, y, a.vis, b.vis, c.vis]);
          }
          // freie Flaeche: Silhouette an oder aus aendert nichts (sie erscheint nur hinter Verdeckung)
          const me = H3.put(12 * 32 + 16, 14 * 32 + 16), s = V.toScr(me.x, me.y, 14); const A = H3.grab(s[0] - 30, s[1] - 40, s[0] + 30, s[1] + 30); C.sil = false; const B = H3.grab(s[0] - 30, s[1] - 40, s[0] + 30, s[1] + 30); C.sil = true;
          o.open = [H3.diff(A, B), V.seen(me.x, me.y).vis];
          // Wand hinter (noerdlich) dem Spieler bleibt stehen: Spieler eine Kachel suedlich einer Wandreihe, Ausschnitt um die Wand mit und ohne Schnitt gleich
          const W = D.world(); let nb = null; for (let y = W.WY0 + 3; y < W.WY0 + W.H - 3 && !nb; y++) for (let x = W.WX0 + 3; x < W.WX0 + W.W - 3 && !nb; x++)
            if (W.cell(x, y) === '#' && W.cell(x - 1, y) === '#' && W.cell(x + 1, y) === '#' && !W.isSol(x, y + 1) && !W.isSol(x, y + 2) && !W.isSol(x, y + 3) && W.cell(x, y + 2) !== '#' && W.cell(x, y + 3) !== '#') nb = [x, y];
          if (nb) { const m2 = H3.put(nb[0] * 32 + 16, nb[1] * 32 + 32 + 12, 1.57), w = V.toScr(m2.x, nb[1] * 32 + 16, 64); const A2 = H3.grab(w[0] - 40, w[1] - 26, w[0] + 40, w[1] + 20); C.cutR = 0; const B2 = H3.grab(w[0] - 40, w[1] - 26, w[0] + 40, w[1] + 20); C.cutR = cut0; o.north = [nb, H3.diff(A2, B2)]; }
          // Gegner in Sicht hinter einer Wand (Wand suedlich von ihm, der Spieler steht noerdlich im selben Raum): Silhouette; Gegner ohne Sicht: keine
          const g = D.get(); o.en = null;
          for (const [x, y] of sp) {
            const px = x, py = y - 64; if (W.isSol(Math.floor(px / 32), Math.floor(py / 32)) || !D.los(px, py, x, y)) continue;
            const ny = y + 64; if (W.isSol(Math.floor(x / 32), Math.floor(ny / 32)) || D.los(px, py, x, ny)) continue;
            H3.put(px, py, 1.57); const E = D.get().en, e = D.mkCop(x, y, 'cop'), f = D.mkCop(x, ny, 'cop'); e.react = f.react = -1e9; E.push(e, f); D.draw();
            const i1 = V.info(), v1 = V.seen(x, y); C.sil = false; const v0 = V.seen(x, y); C.sil = true;
            const civ = D.get().npcs.find(q => q.st !== 'away'); let civSk = null; if (civ) { const cx = civ.x, cy = civ.y; civ.x = x + 20; civ.y = y; D.draw(); civSk = Object.assign({}, V.info().sk); civ.x = cx; civ.y = cy; }
            o.en = { at: [x, y, ny], sk: i1.sk, sil: i1.sil, dyn: V.dyn().f.filter(q => q[0] === 'cop').map(q => [q[5], q[6]]), v1: v1.vis, v0: v0.vis, civSk };
            E.splice(E.indexOf(e), 1); E.splice(E.indexOf(f), 1); break;
          }
          return o;
        });
        t.note('Stellen (Schnitt / ohne Schnitt mit Silhouette / ohne beides): ' + r.rows.map(q => q[2].toFixed(2) + '/' + q[3].toFixed(2) + '/' + q[4].toFixed(2)).join('  '));
        t.ok(r.rows.length >= 4, 'genug Stellen mit Wand vor dem Spieler: ' + r.rows.length);
        t.ok(r.rows.every(q => q[4] < .12 && q[2] > 3 * q[4]), 'ohne Schnitt und Silhouette verdeckt die Wand den Spieler groesstenteils (Pruefung greift): ' + r.rows.map(q => q[4].toFixed(3)));
        t.ok(r.rows.every(q => q[2] > .15), 'mit Schnitt ist der Spieler an jeder Stelle erkennbar: ' + r.rows.map(q => q[2].toFixed(3)));
        t.ok(r.rows.every(q => q[3] > q[4] + .06), 'ohne Schnitt zeigt die Silhouette den Spieler: ' + r.rows.map(q => q[3].toFixed(3)));
        t.ok(r.open[0] < .002 && r.open[1] > .15, 'freie Flaeche: Silhouette aendert nichts, Spieler sichtbar: ' + r.open.map(v => v.toFixed(4)));
        t.ok(r.north && r.north[1] < .01, 'Wand hinter dem Spieler wird nicht geschnitten: ' + JSON.stringify(r.north));
        t.ok(r.en, 'Stelle fuer Gegner hinter Wand in Sicht gefunden');
        if (r.en) {
          t.eq(r.en.dyn.length, 1, 'nur der Gegner in Sicht wird gezeichnet: ' + JSON.stringify(r.en));
          t.ok(r.en.sk.cop === 1 && r.en.sk.pl === 1 && Object.keys(r.en.sk).length === 2, 'Silhouetten: Spieler und der Gegner in Sicht, nicht der ohne Sicht: ' + JSON.stringify(r.en.sk));
          t.ok(r.en.v1 > r.en.v0 + .04, 'Gegner hinter der Wand als Silhouette zu sehen: ' + r.en.v1.toFixed(3) + ' gegen ' + r.en.v0.toFixed(3));
          t.ok(!r.en.civSk || !Object.keys(r.en.civSk).some(k => k !== 'pl' && k !== 'cop'), 'Zivilisten bekommen keine Silhouette: ' + JSON.stringify(r.en.civSk));
        }
        await page.evaluate(() => __dbg.view3d.reset());
        if (page !== t.page && page.errors.length) t.ok(false, 'JS-Fehler: ' + page.errors.slice(0, 2).join(' | '));
      } finally { await P.done(); }
    },
  },
  {
    name: '3D-Schnitt nur fuer Waende (Ticket 190): Geldautomat, Kasse und Tresen bleiben voll stehen, wenn der Spieler nordlich davon steht',
    timeout: 300000,
    async run(t) {
      const P = await glPage(t); if (!P) return;
      try {
        const page = P.page, i0 = await page.evaluate(SETUP);
        if (i0.state !== 'an') { t.ok(false, '3D nicht an: ' + JSON.stringify(i0)); return; }
        const r = await page.evaluate(() => {
          const D = __dbg, V = D.view3d.V, C = V.cfg, W = D.world(), cut0 = C.cutR, o = {};
          for (const ch of ['A', 'r', 'C']) {
            let f = null; for (let y = W.WY0 + 3; y < W.WY0 + W.H - 3 && !f; y++) for (let x = W.WX0 + 3; x < W.WX0 + W.W - 3 && !f; x++)
              if (W.cell(x, y) === ch && !W.isSol(x, y - 1) && !W.isSol(x, y - 2) && W.cell(x, y - 1) !== 'v') f = [x, y];
            if (!f) continue;
            H3.put(f[0] * 32 + 16, f[1] * 32 - 8, 1.57);
            const h = V.cfg.cells[ch].s[0][1], s = V.toScr(f[0] * 32 + 16, f[1] * 32 + 16, h), bx = [s[0] - 12, s[1] - 12, s[0] + 12, s[1] + 12];
            C.cutR = cut0; const A = H3.grab(...bx); C.cutR = 0; const B = H3.grab(...bx); C.cutR = cut0; o[ch] = H3.diff(A, B);
          }
          return o;
        });
        t.ok(Object.keys(r).length >= 2, 'mindestens zwei der Arten (A, r, C) in der Karte gefunden: ' + JSON.stringify(r));
        t.ok(Object.values(r).every(v => v < .01), 'Moebel im Schnittkreis unveraendert (Anteil geaenderter Bildpunkte mit und ohne Schnitt): ' + JSON.stringify(r));
        await page.evaluate(() => __dbg.view3d.reset());
      } finally { await P.done(); }
    },
  },
];
