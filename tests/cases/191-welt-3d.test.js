// 3D-1 (Ticket 150): statische Welt der 3D-Ansicht (js/view3d.js) aus dem Raster. Kein Pixelvergleich, Zustaende ueber den Debug-Hook (__dbg.view3d).
// Hoehentabelle V3CFG.cells: jedes Kachelzeichen (alle Szenarien, Laufzeitzeichen, Liste in CLAUDE.md) braucht einen Eintrag, sonst rot (Prinzip MAP_FIELDS).
// Mit WebGL (sonst uebersprungen wie Test 190): Koerper je Zeichen gleich Kacheln im Raster, Neubau nur bei Rasteraenderung, unter 30 Draw Calls,
// alle Szenarien bauen ohne Fehler, und der Spielzustand nach 600 Schritten ist mit und ohne 3D gleich (Plan 6.3).
const fs = require('fs');
const path = require('path');
const lib = require('../lib');

const RUNTIME = 'XwYlv';   // nur zur Laufzeit: Barrikade, zerschossenes Fenster, Fensterbarrikade, geoeffnete Hintertuer, haltendes Fahrzeug
const SCS = ['bank', 'truck', 'jewel', 'gas', 'museum', 'casino', 'nb', 'prison'];

async function glPage(t) {
  if (await t.page.evaluate(() => { const c = document.createElement('canvas'); return !!c.getContext('webgl2'); })) return { page: t.page, done: async () => {} };
  const env = await lib.launch({ webgl: true });
  const page = await lib.openGame(env);
  if (await page.evaluate(() => { const c = document.createElement('canvas'); return !!c.getContext('webgl2'); })) return { page, done: async () => { await page.ctx.close().catch(() => {}); await env.browser.close().catch(() => {}); env.srv.close(); } };
  await env.browser.close().catch(() => {}); env.srv.close();
  t.note('kein WebGL 2 im Test-Chromium (auch nicht mit SwiftShader-Flags), 3D-Teil uebersprungen');
  return null;
}
// Zeichen im Raster je Szenario (mehrere Seeds, Bank auch gedreht), dazu die feste Klassikkarte
async function gridChars(page) {
  return page.evaluate((SCS) => {
    const D = __dbg, seen = {};
    const take = (sc) => { for (const row of D.world().M) for (const c of row) (seen[c] = seen[c] || new Set()).add(sc); };
    for (const sc of SCS) { D.setScenario(sc); for (const sd of [1, 2, 5, 9]) { D.buildSeed(sd); take(sc); } }
    D.setScenario('bank'); D.buildSeed('classic'); take('bank');
    const o = {}; for (const c in seen) o[c] = [...seen[c]]; return o;
  }, SCS);
}

module.exports = [
  {
    name: '3D-Welt: die Hoehentabelle hat fuer jedes Kachelzeichen einen gueltigen Eintrag (alle Szenarien, Laufzeitzeichen, CLAUDE.md), begehbare Zeichen ohne Koerper am Boden',
    timeout: 120000,
    async run(t) {
      const html = fs.readFileSync(path.join(lib.ROOT, 'index.html'), 'utf8'), md = fs.readFileSync(path.join(lib.ROOT, 'CLAUDE.md'), 'utf8');
      const SOLID = (/const SOLID='([^']*)'/.exec(html) || [])[1];
      t.ok(!!SOLID, 'SOLID in index.html gefunden');
      const line = md.split('\n').find(l => l.startsWith('- Tile-Zeichen:')) || '';
      const docChars = [...line.matchAll(/`(.)`/g)].map(m => m[1]);
      t.ok(docChars.length >= 25, 'Liste der Kachelzeichen in CLAUDE.md gelesen: ' + docChars.join(''));
      const cells = await t.page.evaluate(async () => (await import('/js/view3d.js')).V3CFG.cells);
      const grid = await gridChars(t.page);
      const all = new Set([...Object.keys(grid), ...RUNTIME, ...SOLID, ...docChars]);
      const missing = [...all].filter(c => !cells[c]).map(c => c + (grid[c] ? ' (' + grid[c].join(',') + ')' : ''));
      t.eq(missing, [], 'Kachelzeichen ohne Eintrag in V3CFG.cells (js/view3d.js)');
      const bad = [];
      for (const c of Object.keys(cells)) {
        const e = cells[c];
        if (!Array.isArray(e.s)) { bad.push(c + ': s fehlt'); continue; }
        for (const q of e.s) if (!(q[0] >= 0 && q[1] > q[0] && q[1] <= 64 && [undefined, 0, 1, 2, 3, 4].includes(q[2]))) bad.push(c + ': Scheibe ' + JSON.stringify(q));
        const solid = SOLID.includes(c) || c === 'V', ground = e.s.some(q => q[0] === 0);
        if (solid && !ground && !e.dyn) bad.push(c + ': solide, aber ohne Koerper am Boden');
        if (!solid && e.s.some(q => q[0] < 48)) bad.push(c + ': begehbar, aber Koerper unter Kopfhoehe');
        if (e.glass && !(e.glass[0] >= 0 && e.glass[1] > e.glass[0])) bad.push(c + ': glass');
      }
      t.eq(bad, [], 'Eintraege gueltig und passend zur Kollision (solide hat Koerper, begehbar nur oben)');
      t.eq(['W', 'w', 'Y'].filter(c => cells[c].s.some(q => (q[2] || 0) === 0)), [], 'Fenster: Bruestung und Sturz nicht aus dem Bildmaterial (sonst zeigt der Deckel das 2D-Fenster ein zweites Mal, Ticket 178)');
      t.ok(cells.W.glass && cells.W.frame && cells.W.frame.length === 2 && cells.w.frame, 'Fenster: Scheibe mit Rahmen, zerschossen nur der Rahmen');
      t.ok(cells.V.open === 1 && cells.W.glass && !cells.w.glass, 'Tresortuer faellt beim Oeffnen weg, nur das heile Fenster hat Glas');
      const full = ['#', 'P', 'V', 'L'].filter(c => !cells[c].s.some(q => q[0] === 0 && q[1] === 64));
      t.eq(full, [], 'Wand, Pfeiler, Tresortuer und Hintertuer reichen vom Boden bis zur Wandhoehe 64');
      t.eq(['W', 'w', 'Y'].filter(c => cells[c].s.some(q => q[1] > 50)), [], 'Fenster haben nur eine Bruestung, keinen Sturz: von oben offen wie die Tueren (Ticket 178)');
      t.eq(['D', 'd', 'l', 'g'].filter(c => cells[c].s.length), [], 'Durchgaenge (Tueren D und d, offene Hintertuer, Tresentor) haben keinen Koerper ueber Kopfhoehe (Ticket 177)');
      await t.page.evaluate(() => { __dbg.setScenario('bank'); __dbg.buildSeed('classic'); });
    },
  },
  {
    name: '3D-Welt: Bank baut ohne Fehler, Koerper je Zeichen gleich Kacheln im Raster, unter 30 Draw Calls, Neubau nur bei Rasteraenderung (Tuer, Fenster, Barrikade, Tresor)',
    timeout: 240000,
    async run(t) {
      const P = await glPage(t); if (!P) return;
      try {
        const page = P.page;
        const r = await page.evaluate(async () => {
          const D = __dbg, i0 = await D.view3d.set(true); if (i0.state !== 'an') return { i0 };
          D.setScenario('bank'); D.buildSeed('classic'); for (let i = 0; i < 5; i++) { D.update(1 / 30); D.draw(); }
          const V = D.view3d.V, cfg = V.cfg.cells, w = D.world(), M = w.M, cnt = {};
          for (const row of M) for (const c of row) cnt[c] = (cnt[c] || 0) + 1;
          const want = {}; for (const c in cnt) if (cfg[c] && cfg[c].s.length) want[c] = cnt[c];
          const parts = [0, 0, 0, 0, 0, 0]; for (const c in want) { for (const q of cfg[c].s) parts[q[2] || 0] += cnt[c]; if (cfg[c].frame) parts[2] += cfg[c].frame.length * cnt[c]; if (cfg[c].glass) parts[5] += cnt[c]; }
          const a = D.view3d.info();
          // ohne Aenderung: weitere Bilder bauen nichts neu, auch nicht nach setc mit demselben Zeichen
          const g0 = D.view3d.V; let x0 = 0, y0 = 0; for (let y = 0; y < M.length && !x0; y++) { const i = M[y].indexOf('#'); if (i >= 0) { x0 = i + w.WX0; y0 = y + w.WY0; } }
          w.setc(x0, y0, '#'); for (let i = 0; i < 5; i++) D.draw(); const b = D.view3d.info();
          // haltendes Fahrzeug (o -> v, wie stampOn): Zaehler laeuft, aber die Welt bleibt gleich, also kein Neubau
          const O = (() => { for (let y = 0; y < M.length; y++) { const i = M[y].indexOf('o'); if (i >= 0) return [i + w.WX0, y + w.WY0]; } })();
          w.setc(O[0], O[1], 'v'); D.draw(); const bv = D.view3d.info(); w.setc(O[0], O[1], 'o'); D.draw();
          // Hintertuer auf: L -> l
          const find = ch => { for (let y = 0; y < M.length; y++) { const i = M[y].indexOf(ch); if (i >= 0) return [i + w.WX0, y + w.WY0]; } return null; };
          const L = find('L'); w.setc(L[0], L[1], 'l'); D.draw(); const c = D.view3d.info();
          w.setc(L[0], L[1], 'L'); D.draw(); const c2 = D.view3d.info();
          // Fenster zerschossen und vernagelt, Barrikade auf freiem Boden innen
          const Wn = find('W'); w.setc(Wn[0], Wn[1], 'w'); D.draw(); const e = D.view3d.info(); w.setc(Wn[0], Wn[1], 'Y'); D.draw(); const e2 = D.view3d.info(); w.setc(Wn[0], Wn[1], 'W'); D.draw();
          const F = find('.'); w.setc(F[0], F[1], 'X'); D.draw(); const f = D.view3d.info(); w.setc(F[0], F[1], '.'); D.draw();
          // Tresor auf (wie im Spiel ueber das Objekt), danach wieder zu per reset
          const vt = D.get().its.find(o => o.t === 'vault'); vt.act(D.get().me); D.draw(); const v = D.view3d.info();
          D.reset(); D.draw(); const v2 = D.view3d.info();
          const pass = ['D', 'd', 'l', 'g'].reduce((n, ch) => n + (cnt[ch] || 0), 0);
          return { a, b, bv, c, c2, e, e2, f, v, v2, want, parts, pass };
        });
        if (!r.a) { t.ok(false, '3D nicht an: ' + JSON.stringify(r.i0)); return; }
        const a = r.a; t.note(a.calls + ' Draw Calls, ' + a.tris + ' Dreiecke, ' + a.inst + ' Kloetze, ' + a.ms.toFixed(1) + ' ms (Software)');
        t.ok(a.on && a.errs === 0 && a.statBuilds >= 1 && a.decal, 'Bank baut ohne Fehler: ' + JSON.stringify({ errs: a.errs, err: a.err, sb: a.statBuilds }));
        t.eq(Object.keys(a.cells).filter(k => k[0] === '?'), [], 'kein Zeichen ohne Eintrag im Raster');
        t.eq(a.cells['#'], r.want['#'], 'Wandkoerper gleich Wandkacheln');
        t.eq(a.cells, r.want, 'Koerper je Zeichen gleich Kacheln im Raster');
        t.eq(a.parts, r.parts, 'Kloetze je Material (Bild, Holz, Metall, Zaun, Mauerkrone, Glas) wie aus Raster und Hoehentabelle gerechnet');
        t.ok(r.pass > 0 && !a.cells.D && !a.cells.d && !a.cells.l && !a.cells.g, 'Durchgaenge im Raster (' + r.pass + ') ohne Koerper und Sturz: ' + JSON.stringify([a.cells.D, a.cells.d, a.cells.l, a.cells.g]));
        t.ok(a.calls >= 3 && a.calls < 30, 'statische Welt unter 30 Draw Calls: ' + a.calls);
        t.ok(a.tris > 1000 && a.tris < 150000, 'Dreiecke im Budget: ' + a.tris);
        t.eq([r.b.statBuilds, r.b.builds, r.b.groundUp], [a.statBuilds, a.builds, a.groundUp], 'ohne Rasteraenderung kein Neubau (auch nicht bei setc mit demselben Zeichen)');
        t.eq([r.bv.statBuilds, r.bv.groundUp], [a.statBuilds, a.groundUp], 'haltendes Fahrzeug (o zu v) baut die Welt nicht neu (Abgleich nach dem Zaehler)');
        t.ok(r.c.statBuilds === a.statBuilds + 1 && r.c.cells.L === a.cells.L - 1 && !r.c.cells.l && r.c.vol < a.vol && r.c.groundUp === a.groundUp + 1, 'Tuer auf aendert die Geometrie (kein Sturz ueber der offenen Tuer): ' + JSON.stringify([r.c.cells.L, r.c.cells.l, a.vol - r.c.vol]));
        t.ok(r.c2.cells.L === a.cells.L && r.c2.vol === a.vol && r.c2.tris === a.tris, 'Tuer zu: wie vorher');
        const dp = (i, k) => i.parts[k] - a.parts[k];
        t.ok(r.e.cells.w === 1 && r.e.cells.W === a.cells.W - 1 && dp(r.e, 5) === -1 && dp(r.e, 0) === 0, 'Fenster zerschossen: eine Glasscheibe weniger, Bruestung bleibt: ' + r.e.parts);
        t.ok(r.e2.cells.Y === 1 && dp(r.e2, 5) === -1 && dp(r.e2, 1) === 1, 'Fenster vernagelt: Bretter (Holz) statt Glas: ' + r.e2.parts);
        t.ok(r.f.cells.X === 1 && dp(r.f, 1) === 1 && r.f.vol === a.vol + 32 * 32 * 30, 'Barrikade gebaut: ein Holzkoerper mehr');
        t.ok(!r.v.cells.V && r.v.statBuilds > r.f.statBuilds, 'Tresortuer offen: Tuerkoerper weg: ' + r.v.cells.V);
        t.eq(r.v2.cells.V, a.cells.V, 'nach reset ist die Tresortuer wieder da');
        t.ok(r.v2.errs === 0, 'keine Fehler beim Zeichnen');
        await page.evaluate(() => __dbg.view3d.reset());
        if (page !== t.page && page.errors.length) t.ok(false, 'JS-Fehler: ' + page.errors.slice(0, 2).join(' | '));
      } finally { await P.done(); }
    },
  },
  {
    name: '3D-Welt: alle acht Szenarien bauen ohne Fehler, unter 30 Draw Calls, Koerper passen zum Raster',
    timeout: 240000,
    async run(t) {
      const P = await glPage(t); if (!P) return;
      try {
        const page = P.page;
        const r = await page.evaluate(async (SCS) => {
          const D = __dbg, i0 = await D.view3d.set(true); if (i0.state !== 'an') return { i0 };
          const o = {};
          for (const sc of SCS) {
            D.setScenario(sc); D.buildSeed(3); D.update(1 / 30); D.draw(); D.draw();
            const i = D.view3d.info(), cfg = D.view3d.V.cfg.cells, M = D.world().M, cnt = {}, parts = [0, 0, 0, 0, 0, 0];
            for (const row of M) for (const c of row) if (cfg[c] && cfg[c].s.length && !(c === 'V' && D.get().vaultOpen)) { cnt[c] = (cnt[c] || 0) + 1; for (const q of cfg[c].s) parts[q[2] || 0]++; if (cfg[c].frame) parts[2] += cfg[c].frame.length; if (cfg[c].glass) parts[5]++; }
            o[sc] = { errs: i.errs, err: i.err, calls: i.calls, tris: i.tris, parts: i.parts.join(',') === parts.join(','), ok: JSON.stringify(i.cells) === JSON.stringify(Object.fromEntries(Object.keys(i.cells).map(k => [k, cnt[k]]))) && Object.keys(cnt).length === Object.keys(i.cells).length };
          }
          D.setScenario('bank'); D.buildSeed('classic'); D.view3d.reset();
          return { o };
        }, SCS);
        if (!r.o) { t.ok(false, '3D nicht an: ' + JSON.stringify(r.i0)); return; }
        for (const sc of SCS) { const q = r.o[sc]; t.ok(q.errs === 0 && q.calls < 30 && q.tris > 500 && q.ok && q.parts, sc + ': ' + JSON.stringify(q)); }
        if (page !== t.page && page.errors.length) t.ok(false, 'JS-Fehler: ' + page.errors.slice(0, 2).join(' | '));
      } finally { await P.done(); }
    },
  },
  {
    name: '3D-Welt: Spielzustand nach 600 Schritten ist mit und ohne 3D gleich (die Ansicht liest nur)',
    timeout: 240000,
    async run(t) {
      const P = await glPage(t); if (!P) return;
      try {
        const page = P.page;
        const r = await page.evaluate(async () => {
          const D = __dbg;
          // eigener Zufall fuer Simulation und Zeichnen getrennt: der Hash vergleicht nur, was update() rechnet
          const mb = s => () => { s = s + 0x6D2B79F5 | 0; let q = Math.imul(s ^ s >>> 15, 1 | s); q = q + Math.imul(q ^ q >>> 7, 61 | q) ^ q; return ((q ^ q >>> 14) >>> 0) / 4294967296; };
          const R0 = Math.random;
          async function run(on) {
            await D.view3d.set(on); D.setScenario('bank'); D.buildSeed('classic');
            const rs = mb(42), rd = mb(7); Math.random = rs; D.reset(); D.setTime(0); D.setFocus(true);
            // gleiche Mausabbildung in beiden Laeufen: in 3D zielt die Maus bewusst ueber pick (anderer Weltpunkt), hier zaehlt nur, ob das Zeichnen Zustand aendert
            const V = D.view3d.V; if (on && V) V.pick = (sx, sy) => [sx + D.cam()[0], sy + D.cam()[1]];
            const K = D.keys, M = D.mouse; M.sx = 640; M.sy = 200; let fr = 0;
            for (let i = 0; i < 600; i++) {
              for (const k of 'wasd') delete K[k];
              K[['d', 'w', 'a', 's'][Math.floor(i / 60) % 4]] = 1;
              if (i === 240) D.startHeist();
              D.update(1 / 30);
              if (i % 5 === 4) { Math.random = rd; D.draw(); Math.random = rs; fr++; }
            }
            Math.random = R0;
            const g = D.get(), rn = v => Math.round(v * 1000) / 1000;
            const s = JSON.stringify({ t: g.time, ph: g.phase, me: [g.me.x, g.me.y, g.me.a, g.me.hp, g.me.mag], en: g.en.map(e => [e.x, e.y, e.hp]), npc: g.npcs.map(n => [n.x, n.y]), its: g.its.map(o => [o.t, !!o.done, o.pr]), M: D.world().M.join(''), sus: g.sus, sec: g.secured, pol: g.policeAt, cam: D.cam() });
            let h = 0; for (let i = 0; i < s.length; i++) h = Math.imul(h, 31) + s.charCodeAt(i) | 0;
            return { h, len: s.length, info: D.view3d.info(), en: g.en.length, ph: g.phase, me: [rn(g.me.x), rn(g.me.y)] };
          }
          const off = await run(false), on = await run(true), off2 = await run(false);
          D.view3d.reset(); for (const k of 'wasd') delete D.keys[k];
          return { off, on, off2 };
        });
        t.note('Hash ' + r.off.h + ', Phase ' + r.off.ph + ', ' + r.off.en + ' Gegner, Spieler bei ' + r.off.me + '; 3D: ' + r.on.info.frames + ' Bilder, Zustand ' + r.on.info.state);
        t.eq(r.off.h, r.off2.h, 'ohne 3D zweimal gleich (der Lauf ist reproduzierbar)');
        t.ok(r.on.info.state === 'an' && r.on.info.frames >= 100 && r.on.info.errs === 0, '3D hat waehrend des Laufs gezeichnet: ' + JSON.stringify({ st: r.on.info.state, fr: r.on.info.frames, errs: r.on.info.errs }));
        t.eq(r.on.h, r.off.h, 'Zustandshash nach 600 Schritten gleich mit und ohne 3D');
        t.ok(r.off.ph === 2 && r.off.len > 1000, 'der Lauf erreicht den Ueberfall: Phase ' + r.off.ph);
      } finally { await P.done(); }
    },
  },
];
