// 3D-4 (Ticket 153): Sicht und Nebel der 3D-Ansicht (js/view3d.js updVis, visAt, fogC; js/draw.js vis3d, seen3d, cams3d).
// Maske gegen los auf Stichpunkten (innen hell, aussen dunkel), Abdunklung im Bild gegen dasselbe Bild ohne Nebel (cfg.fog), Gegner ausserhalb unsichtbar,
// Maske nur bei Aenderung hochgeladen, Kameras wie in 2D, Coop-Client mit eigener Sicht, Zuschauer mit "alles sehen" ohne Maske.
// Kein Pixelvergleich gegen Referenzen. Ohne WebGL 2 (auch nicht mit SwiftShader-Flags) ueberspringt der Test mit Meldung.
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

// Hilfen in der Seite (fuer jede Instanz D mit ihrer Ansicht V): Stichpunkte im Bild, deren Sicht ueber los in 20 px Umkreis gleich ist, am Boden ohne Koerper davor
// und weit weg von Figuren und Fahrzeugen; Bild mit und ohne Nebel; erwartete Farbe aussen = Farbe ohne Nebel gemischt zur Dunkelfarbe mit Deckkraft mal (1 - Maske).
const HELP = `window.S3 = {
  P(D) { const V = D.view3d.V, W = D.world(), g = D.get(), me = g.me, ok = c => c === '.' || c === 'o' || c === 'g', out = [];
    const far = (x, y) => g.npcs.every(q => Math.hypot(q.x - x, q.y - y) > 44) && g.en.every(q => Math.hypot(q.x - x, q.y - y) > 44) && g.players.every(q => Math.hypot(q.x - x, q.y - y) > 44) && g.pcs.every(q => Math.hypot(q.x - x, q.y - y) > 100);
    for (let y = me.y - 600; y <= me.y + 600; y += 23) for (let x = me.x - 700; x <= me.x + 700; x += 23) {
      const s = V.toScr(x, y, 0); if (s[0] < 12 || s[0] > 948 || s[1] < 12 || s[1] > 532) continue;
      const tx = Math.floor(x / 32), ty = Math.floor(y / 32); if (![0, 1, 2].every(k => ok(W.cell(tx, ty + k))) || !far(x, y)) continue;
      const l = D.los(me.x, me.y, x, y); if (![[20, 0], [-20, 0], [0, 20], [0, -20], [14, 14], [-14, -14], [14, -14], [-14, 14]].every(o => D.los(me.x, me.y, x + o[0], y + o[1]) === l)) continue;
      out.push({ x, y, s, l });
    }
    return out; },
  snap(V) { const c = document.createElement('canvas'); c.width = V.el.width; c.height = V.el.height; const g = c.getContext('2d', { willReadFrequently: true }); V.render(); g.drawImage(V.el, 0, 0); return { d: g.getImageData(0, 0, c.width, c.height).data, w: c.width, q: c.width / 960 }; },
  px(S, sx, sy) { const x0 = Math.round(sx * S.q) - 1, y0 = Math.round(sy * S.q) - 1, o = [0, 0, 0]; for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) { const k = ((y0 + j) * S.w + x0 + i) * 4; o[0] += S.d[k] / 9; o[1] += S.d[k + 1] / 9; o[2] += S.d[k + 2] / 9; } return o; },
  // fuer Punkte (x, y, h): Maske m, Farbe mit Nebel, ohne Nebel, erwartete Farbe und groesste Abweichung je Kanal
  fog(D, pts) { const V = D.view3d.V; V.cfg.fog = true; const A = S3.snap(V), a = V.info().vis.dark; V.cfg.fog = false; const B = S3.snap(V); V.cfg.fog = true; V.render();
    const dc = V.cfg.darkCol;
    return pts.map(p => { const s = V.toScr(p.x, p.y, p.h || 0), on = S3.px(A, s[0], s[1]), off = S3.px(B, s[0], s[1]), m = V.visAt(p.x, p.y), k = a * (1 - m), ex = off.map((v, i) => v * (1 - k) + dc[i] * k);
      return Object.assign({}, p, { m, on, off, ex, err: Math.max(...on.map((v, i) => Math.abs(v - ex[i]))), dim: off.reduce((u, v) => u + v, 0) - on.reduce((u, v) => u + v, 0) }); }); },
  pick(L, n) { const o = []; for (let i = 0; i < n && L.length; i++) o.push(L[Math.floor((i + .5) * L.length / n)]); return o; },
};`;

const SETUP = `(async () => { const D = __dbg; const i0 = await D.view3d.set(true); if (i0.state !== 'an') return i0;
  D.setScenario('bank'); D.buildSeed('classic'); D.setFocus(true); D.CFG.policeAt = 1e6; D.CFG.policeForced = 1e6; D.reset();
  for (let i = 0; i < 10; i++) D.update(1 / 30);
  D.draw(); return D.view3d.info(); })()`;

module.exports = [
  {
    name: '3D-Sicht: Maske deckt sich mit los (innen hell, aussen dunkel) vor und in der Bank, Abdunklung von Boden und Waenden wie 2D, Gegner ausserhalb unsichtbar',
    timeout: 300000,
    async run(t) {
      const P = await glPage(t); if (!P) return;
      try {
        const page = P.page; await page.evaluate(HELP); const i0 = await page.evaluate(SETUP);
        if (i0.state !== 'an') { t.ok(false, '3D nicht an: ' + JSON.stringify(i0)); return; }
        t.ok(i0.vis && i0.vis.on && i0.vis.dark > .3, 'Maske an, Deckkraft der Dunkelzone wie 2D (' + (i0.vis && i0.vis.dark) + ')');
        // zwei Lagen: vor der Bank (Sicht durch Tuer und Fenster) und in der Schalterhalle
        const spots = await page.evaluate(() => { const D = __dbg, me = D.get().me; return [[me.x, me.y], [me.x + 64, me.y - 160]]; });
        for (const [k, sp] of spots.entries()) {
          const r = await page.evaluate(([x, y]) => { const D = __dbg, me = D.get().me; for (let i = 0; i < 40; i++) { me.x = x; me.y = y; me.vx = me.vy = 0; D.update(1 / 30); } me.x = x; me.y = y; D.draw();
            const L = S3.P(D), inn = S3.pick(L.filter(p => p.l), 12), out = S3.pick(L.filter(p => !p.l), 12), F = S3.fog(D, inn.concat(out));
            // Waende: Deckel in voller Hoehe, aussen und innen der Maske, nicht im Schnitt um den Spieler
            const V = D.view3d.V, W = D.world(), sm = V.toScr(me.x, me.y, 13), wl = [];
            for (let ty = W.WY0; ty < W.WY0 + W.H; ty++) for (let tx = W.WX0; tx < W.WX0 + W.W; tx++) if (W.cell(tx, ty) === '#') { const p = { x: tx * 32 + 16, y: ty * 32 + 16, h: 64 }, s = V.toScr(p.x, p.y, 64);
              if (s[0] > 12 && s[0] < 948 && s[1] > 12 && s[1] < 532 && Math.hypot(s[0] - sm[0], s[1] - sm[1]) > 140 && W.cell(tx, ty - 1) !== 'v') wl.push(p); }
            const WF = S3.fog(D, S3.pick(wl, 40));
            return { F, WF, me: [me.x, me.y], vis: V.info().vis }; }, sp);
          const inn = r.F.filter(p => p.l), out = r.F.filter(p => !p.l), tag = k ? 'in der Halle' : 'vor der Bank';
          t.note(tag + ': ' + inn.length + ' Punkte in Sicht, ' + out.length + ' ausserhalb, Maske ' + r.vis.size + ', Deckkraft ' + r.vis.dark);
          t.ok(inn.length >= 8 && out.length >= 8, tag + ': genug Stichpunkte innen und aussen (' + inn.length + ', ' + out.length + ')');
          const badM = r.F.filter(p => p.l ? p.m < .9 : p.m > .1).map(p => [Math.round(p.x), Math.round(p.y), p.l, +p.m.toFixed(2)]);
          t.eq(badM, [], tag + ': Maske gleich los auf ' + r.F.length + ' Stichpunkten (in Sicht ueber 0,9, sonst unter 0,1)');
          const badF = r.F.filter(p => p.err > 6).map(p => [Math.round(p.x), Math.round(p.y), p.l, p.on.map(Math.round), p.ex.map(Math.round)]);
          t.eq(badF, [], tag + ': Boden im Bild wie die 2D-Dunkelzone (Farbe ohne Nebel gemischt nach Maske, Abweichung hoechstens 6)');
          t.ok(inn.every(p => Math.abs(p.dim) < 8) && out.every(p => p.dim > 20), tag + ': in Sicht unveraendert, ausserhalb dunkler (Summe RGB ' + out.map(p => Math.round(p.dim)).slice(0, 6) + ' ...)');
          const wo = r.WF.filter(p => p.m < .05), wi = r.WF.filter(p => p.m > .95), wbad = r.WF.filter(p => p.err > 6).map(p => [p.x, p.y, +p.m.toFixed(2), p.on.map(Math.round), p.ex.map(Math.round)]);
          t.ok(wo.length >= 5 && wo.every(p => p.dim > 15), tag + ': Waende ausserhalb der Sicht gedimmt (' + wo.length + ' Deckel)');
          t.eq(wbad, [], tag + ': Wanddeckel nach der Maske ihres Fusspunkts gedimmt (' + r.WF.length + ' Deckel, davon ' + wi.length + ' in Sicht)');
        }
        // Gegner: ein Beamter in Sicht wird gezeichnet, einer ausserhalb (hinter Wand) nicht, auch nicht als Silhouette; mit Monitoren sind alle Kameras zu sehen
        const g = await page.evaluate(() => { const D = __dbg, V = D.view3d.V, me = D.get().me, L = S3.P(D), a = L.find(p => p.l), b = L.filter(p => !p.l).pop(), E = D.get().en, o = {};
          const ca = D.mkCop(a.x, a.y, 'cop'), cb = D.mkCop(b.x, b.y, 'cop'); E.push(ca, cb); V.render();
          const f = V.dyn().f.filter(q => q[0] === 'cop'); o.inn = f.some(q => Math.hypot(q[5] - a.x, q[6] - a.y) < 4); o.out = f.some(q => Math.hypot(q[5] - b.x, q[6] - b.y) < 20); o.sil = V.info().sk.cop || 0;
          o.losA = D.los(me.x, me.y, a.x, a.y); o.losB = D.los(me.x, me.y, b.x, b.y);
          E.splice(E.indexOf(ca), 1); E.splice(E.indexOf(cb), 1);
          const C = D.get().cams; o.nc = C.length; o.seenC = C.filter(c => D.los(me.x, me.y, c.x, c.y)).length; D.draw(); o.c0 = D.view3d.cams();
          const k0 = C.map(c => c.k); C.forEach(c => c.k = true); D.draw(); o.c1 = D.view3d.cams(); C.forEach((c, i) => c.k = k0[i]); D.draw();
          return o; });
        t.ok(g.losA && !g.losB && g.inn && !g.out && g.sil === 1, 'Gegner in Sicht als Figur (und Silhouette), ausserhalb weder Figur noch Silhouette (' + JSON.stringify(g) + ')');
        t.ok(g.nc > 1 && g.c0 === g.seenC && g.c1 === g.nc, 'Kameras wie 2D: unbekannt nur in Sicht (' + g.c0 + ' von ' + g.nc + '), nach den Monitoren alle (' + g.c1 + ')');
        if (page.errors.length) t.ok(false, 'JS-Fehler: ' + page.errors.slice(0, 2).join(' | '));
      } finally { await P.done(); }
    },
  },
  {
    name: '3D-Sicht: Maske nur bei Aenderung neu (Stillstand nie, Schritt und Rasteraenderung einmal); den Zustandshash mit und ohne 3D prueft 191',
    timeout: 180000,
    async run(t) {
      const P = await glPage(t); if (!P) return;
      try {
        const page = P.page; await page.evaluate(HELP); const i0 = await page.evaluate(SETUP);
        if (i0.state !== 'an') { t.ok(false, '3D nicht an: ' + JSON.stringify(i0)); return; }
        const r = await page.evaluate(() => { const D = __dbg, V = D.view3d.V, me = D.get().me, o = {}, up = () => V.info().vis.up;
          D.draw(); const u0 = up(), k0 = V.info().vis.key; for (let i = 0; i < 12; i++) D.draw(); o.still = up() - u0; o.keySame = V.info().vis.key === k0;
          const x0 = me.x; me.x += 10; D.draw(); o.step = up() - u0; o.key1 = V.info().vis.key; o.mOld = V.visAt(x0, me.y); D.draw(); D.draw(); o.step2 = up() - u0;
          o.keyHasPos = o.key1.startsWith(Math.round(me.x) + ',' + Math.round(me.y)); me.x = x0; D.draw();
          // Rasteraenderung (eine Kachel weit weg wird zur Kiste und zurueck): Maske neu, danach wieder still
          const W = D.world(); let c = null; for (let y = W.WY0 + 1; y < W.WY0 + W.H - 1 && !c; y++) for (let x = W.WX0 + 1; x < W.WX0 + W.W - 1; x++) if (W.cell(x, y) === 'o') { c = [x, y]; break; }
          const u1 = up(); W.setc(c[0], c[1], 'k'); D.draw(); o.grid = up() - u1; W.setc(c[0], c[1], 'o'); D.draw(); D.draw(); o.grid2 = up() - u1;
          return o; });
        t.eq(r.still, 0, 'Stillstand: 12 Bilder ohne neue Maske');
        t.ok(r.keySame, 'Schluessel im Stillstand gleich');
        t.ok(r.step === 1 && r.step2 === 1 && r.keyHasPos, 'ein Schritt: einmal neu (danach still), Schluessel mit der neuen Lage (' + JSON.stringify(r) + ')');
        t.ok(r.grid === 1 && r.grid2 === 2, 'Rasteraenderung: je Aenderung einmal neu (' + r.grid + ', ' + r.grid2 + ')');
        if (page.errors.length) t.ok(false, 'JS-Fehler: ' + page.errors.slice(0, 2).join(' | '));
      } finally { await P.done(); }
    },
  },
  {
    name: '3D-Sicht: Coop ueber die Test-Leitung, der Client hat seine eigene Sicht als Maske, der Zuschauer mit "alles sehen" keine',
    timeout: 240000,
    async run(t) {
      const P = await glPage(t); if (!P) return;
      try {
        const page = P.page; await page.evaluate(HELP);
        await lib.loadTool(page, 'loopnet.js'); await lib.loadInpage(page, 'coop.js');
        const r = await page.evaluate(`(async () => { const o = {};
          const G = CT.mkGame('bank', 321, 2), A = G.A, B = G.clients[0]; A.CFG.policeAt = 1e6; A.CFG.policeForced = 1e6;
          const a = A.get().me, bh = A.get().players[1]; bh.x = a.x + 64; bh.y = a.y - 200; G.run(1);
          await A.view3d.set(true); await B.view3d.set(true); A.draw(); B.draw();
          const bm = B.get().me, pts = S3.P(B), inn = S3.pick(pts.filter(p => p.l), 12), out = S3.pick(pts.filter(p => !p.l), 12), V = B.view3d.V, VA = A.view3d.V;
          o.n = [inn.length, out.length]; o.bad = inn.concat(out).filter(p => p.l ? V.visAt(p.x, p.y) < .9 : V.visAt(p.x, p.y) > .1).map(p => [Math.round(p.x), Math.round(p.y), p.l]);
          o.key = V.info().vis.key; o.pos = [Math.round(bm.x), Math.round(bm.y)];
          // der Host sieht von woanders: mindestens ein Punkt, an dem seine Maske anders ist als die des Clients
          o.differ = inn.concat(out).filter(p => Math.abs(VA.visAt(p.x, p.y) - V.visAt(p.x, p.y)) > .8).length;
          o.fog = S3.fog(B, inn.concat(out)).filter(p => p.err > 6).length; o.errs = [A.view3d.info().errs, B.view3d.info().errs];
          // Zuschauer: folgt einer Figur mit deren Sicht, B (alles sehen) ohne Maske und ohne Abdunklung, B noch einmal: wieder mit
          const S = CT.addSpec(G, 'zz'); G.run(2); await S.view3d.set(true); S.draw(); const VS = S.view3d.V;
          o.s0 = { on: VS.info().vis.on, dark: VS.fogA() }; S.specKey('b'); S.draw(); o.s1 = { on: VS.info().vis.on, dark: VS.fogA(), all: S.spec().all, figs: VS.info().figs };
          S.specKey('b'); S.draw(); o.s2 = { on: VS.info().vis.on, dark: VS.fogA() };
          for (const d of [S, B, A]) await d.view3d.set(false);
          return o; })()`);
        t.note('Client: ' + r.n[0] + ' Punkte in Sicht, ' + r.n[1] + ' ausserhalb, Schluessel ' + r.key + ', anders als beim Host an ' + r.differ + ' Punkten');
        t.ok(r.n[0] >= 6 && r.n[1] >= 6, 'genug Stichpunkte beim Client');
        t.eq(r.bad, [], 'Maske des Clients gleich seiner eigenen Sicht (los um seine Figur)');
        t.ok(r.key.startsWith(r.pos.join(',')), 'Schluessel des Clients aus seiner eigenen Lage (' + r.key + ', ' + r.pos + ')');
        t.ok(r.differ > 0, 'Host und Client haben verschiedene Masken (jeder seine Sicht)');
        t.eq(r.fog, 0, 'Abdunklung beim Client nach seiner Maske');
        t.eq(r.errs, [0, 0], '3D bei Host und Client ohne Fehler');
        t.ok(r.s0.on && r.s0.dark > .3, 'Zuschauer folgt einer Figur: Maske an (' + JSON.stringify(r.s0) + ')');
        t.ok(r.s1.all && !r.s1.on && r.s1.dark === 0, 'Zuschauer mit alles sehen: keine Maske, keine Abdunklung (' + JSON.stringify(r.s1) + ')');
        t.ok(r.s2.on && r.s2.dark > .3, 'alles sehen aus: Maske wieder an');
        if (page.errors.length) t.ok(false, 'JS-Fehler: ' + page.errors.slice(0, 2).join(' | '));
      } finally { await P.done(); }
    },
  },
  {
    name: '3D-Kegel (Ticket 176): Spitze des Kamera-Sichtkegels liegt auf dem Bildpunkt der Kamera, Strasse an allen vier Seiten',
    timeout: 300000,
    async run(t) {
      const P = await glPage(t); if (!P) return;
      try {
        const page = P.page; await page.evaluate(HELP); const i0 = await page.evaluate(SETUP);
        if (i0.state !== 'an') { t.ok(false, '3D nicht an: ' + JSON.stringify(i0)); return; }
        for (const side of ['N', 'E', 'S', 'W']) {
          const r = await page.evaluate(side => { const D = __dbg; D.setTurn(side); D.buildSeed('classic'); D.CFG.policeAt = 1e6; D.CFG.policeForced = 1e6; D.reset(); for (let i = 0; i < 5; i++) D.update(1 / 30);
            const C = D.get().cams; C.forEach(c => { c.k = true; c.off = false; }); D.draw(); D.draw(); const q = D.view3d.camPts(), V = D.view3d.V;
            return { n: C.length, q: q.map(o => ({ d: Math.hypot(o.cam[0] - o.apex[0], o.cam[1] - o.apex[1]), foot: Math.hypot(o.cam[0] - V.toScr(C[o.i].x, C[o.i].y, 0)[0], o.cam[1] - V.toScr(C[o.i].x, C[o.i].y, 0)[1]) })) }; }, side);
          t.ok(r.n >= 2 && r.q.length >= 1, side + ': Kameras mit Kegel (' + r.q.length + ' von ' + r.n + ')');
          t.ok(r.q.every(o => o.d < 1.5), side + ': Kegelspitze auf dem Bildpunkt der Kamera (Abstaende ' + r.q.map(o => o.d.toFixed(1)) + ')');
          t.ok(r.q.every(o => o.foot > 15), side + ': Kamera haengt in Hoehe, nicht am Fusspunkt (Abstand zum Fusspunkt ' + r.q.map(o => o.foot.toFixed(0)) + ')');
        }
        await page.evaluate(() => { __dbg.setTurn(null); __dbg.view3d.set(false); });
        if (page.errors.length) t.ok(false, 'JS-Fehler: ' + page.errors.slice(0, 2).join(' | '));
      } finally { await P.done(); }
    },
  },
];
