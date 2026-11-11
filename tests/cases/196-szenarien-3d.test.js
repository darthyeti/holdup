// 3D-6 (Ticket 155): Szenario-Besonderheiten der 3D-Ansicht (js/draw.js scen3d, js/view3d.js SCEN und V3CFG.scen). Kein Pixelvergleich, Zustaende ueber den Debug-Hook.
// Liste (Prinzip MAP_FIELDS): jedes szenario-eigene Feld der Karte und jede Art von Beute- und Aktionsobjekt aller acht Szenarien hat in V3CFG.scen.src eine 3D-Entsprechung, jede Art, die scen3d liefert,
// hat einen Bauplan; neue ohne Eintrag machen den Test rot. Mit WebGL (sonst uebersprungen wie Test 190): alle acht Szenarien bauen ohne Fehler unter dem Draw-Call-Budget (Plan 5) und zeigen ihre Besonderheiten,
// Zustandswechsel (Laser aus, Tresor offen, Gitter auf, Loch offen, Zapfsaeule explodiert, Ladetuer offen) aendern die Darstellung, der Spielzustand ist mit und ohne 3D gleich.
const fs = require('fs');
const path = require('path');
const lib = require('../lib');

const SCS = ['bank', 'truck', 'jewel', 'gas', 'museum', 'casino', 'nb', 'prison'];
const BASE = ['raster', 'boden', 'figur', 'fahrzeug', 'hud', 'logik'];
// Besonderheiten, die jedes Szenario in 3D zeigen muss (Ansicht von einer Stelle mit Sicht auf die Besonderheit, Phase wie angegeben)
const NEED = {
  bank: ['vault', 'pad', 'note', 'lock'], truck: ['tk', 'parked'], jewel: ['vit', 'cone', 'vault'], gas: ['pump', 'good'], museum: ['laser', 'good'],
  casino: ['good', 'vault'], nb: ['nbRig', 'nbPress'], prison: ['lock', 'reader', 'ring'],
};

async function glPage(t) {
  if (await t.page.evaluate(() => { const c = document.createElement('canvas'); return !!c.getContext('webgl2'); })) return { page: t.page, done: async () => {} };
  const env = await lib.launch({ webgl: true });
  const page = await lib.openGame(env);
  if (await page.evaluate(() => { const c = document.createElement('canvas'); return !!c.getContext('webgl2'); })) return { page, done: async () => { await page.ctx.close().catch(() => {}); await env.browser.close().catch(() => {}); env.srv.close(); } };
  await env.browser.close().catch(() => {}); env.srv.close();
  t.note('kein WebGL 2 im Test-Chromium (auch nicht mit SwiftShader-Flags), 3D-Teil uebersprungen');
  return null;
}
// Seitenhelfer: Szene wie tests/inpage/bild.js (Seed 5, Strasse im Sueden), Spieler an eine freie Stelle mit Sicht auf das Ziel stellen
const H6 = `window.H6 = {
  scene(sc, ph, sd) { const D = __dbg; PX.scene(sc, sd || 5); PX.phase(ph || 'erkundung'); return D; },
  target(sc) { const D = __dbg, L = D.LAY(), g = D.get(), T = 32;
    if (L.truck) { const t = D.tk(); return [t.x, t.y]; }
    if (L.nb) return [(L.nb.rig[0] + 1) * T, (L.nb.rig[1] + 1) * T];
    if (L.prison) { const c = L.prison.locks[0].cells[0]; return [c[0] * T + 16, c[1] * T + 16]; }
    if (L.lasers) { const l = L.lasers[0]; return [(l[0] + l[2]) / 2 * T, (l[1] + l[3]) / 2 * T]; }
    if (L.jewel) { const q = g.npcs.find(n => n.k === 'grd' && n.st !== 'away'); return q ? [q.x, q.y] : [L.vit[0].x, L.vit[0].y]; }
    if (L.pumps) { const q = L.pumps[0]; return [q.x * T + 16, q.y * T + 16]; }
    const v = L.vault.door; return [v[0] * T + 16, v[1] * T + 32]; },
  look(tg, hold) { const D = __dbg, T = 32, W = D.world(), me = D.get().me, free = (x, y) => !W.isSol(Math.floor(x / T), Math.floor(y / T)) && W.cell(Math.floor(x / T), Math.floor(y / T)) !== 'v';
    let best = null; for (const r of [90, 120, 150, 180, 220]) { for (let k = 0; k < 16 && !best; k++) { const a = Math.PI / 2 + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * Math.PI / 8, x = tg[0] + Math.cos(a) * r, y = tg[1] + Math.sin(a) * r; if (free(x, y) && D.los(x, y, tg[0], tg[1])) best = [x, y]; } if (best) break; }
    best = best || [me.x, me.y]; for (let k = 0; k < (hold || 20); k++) { me.x = best[0]; me.y = best[1]; me.vx = me.vy = 0; me.hp = 100; D.update(1 / 30); } D.draw(); D.draw(); return best; },
  info() { const i = __dbg.view3d.V.info(); return { scen: i.scen, n: i.scenN, sum: i.scenSum, calls: i.calls, tris: i.tris, errs: i.errs, err: i.err, parts: i.parts, vol: i.vol, grl: i.grl, statBuilds: i.statBuilds, list: __dbg.view3d.V.scen() }; },
};`;

module.exports = [
  {
    name: '3D-Szenarien: jedes szenario-eigene Kartenfeld und jede Objektart hat eine 3D-Entsprechung, jede Art aus scen3d einen Bauplan (neue ohne Eintrag: rot)',
    timeout: 180000,
    async run(t) {
      const page = t.page;
      const draw = fs.readFileSync(path.join(lib.ROOT, 'js', 'draw.js'), 'utf8'), view = fs.readFileSync(path.join(lib.ROOT, 'js', 'view3d.js'), 'utf8');
      const V = await page.evaluate(async () => (await import('/js/view3d.js')).V3CFG.scen);
      // Arten, die scen3d liefert (Quelltext: q('art',...)), gegen kinds und die Bauplaene SCEN
      const body = draw.slice(draw.indexOf('function scen3d('), draw.indexOf('/* 3D-4 (Ticket 153): Sicht fuer die 3D-Ansicht'));
      const emit = [...new Set([...body.matchAll(/q\('(\w+)'/g)].map(m => m[1]))];
      t.ok(emit.length >= 20, 'scen3d liefert ' + emit.length + ' Arten: ' + emit.join(' '));
      t.eq(emit.filter(k => !V.kinds[k]), [], 'Arten aus scen3d ohne Eintrag in V3CFG.scen.kinds');
      const sb = view.slice(view.indexOf('const SCEN = {'), view.indexOf('let scenLast'));
      const plans = [...sb.matchAll(/^ {4}(\w+)\(o?\) \{/gm)].map(m => m[1]);
      t.eq(Object.keys(V.kinds).filter(k => !plans.includes(k)), [], 'Eintraege in kinds ohne Bauplan in SCEN');
      t.eq(Object.keys(V.kinds).filter(k => !emit.includes(k)), [], 'Eintraege in kinds, die scen3d nie liefert');
      // Felder der Karte (MAP_FIELDS ausser Pflicht) und Objektarten (its) aller Szenarien, Erkundung und Ueberfall
      await lib.loadInpage(page, 'bild.js');
      const seen = await page.evaluate((SCS) => {
        const D = __dbg, o = { f: D.MAP_FIELDS.filter(f => f[1] !== 'P').map(f => f[0]), it: {} };
        const take = sc => { for (const i of D.get().its) { const k = 'it:' + i.t + (i.t === 'good' || i.t === 'lsw' ? ':' + i.k : ''); (o.it[k] = o.it[k] || new Set()).add(sc); } };
        for (const sc of SCS) for (const sd of [5, 3]) { PX.scene(sc, sd); take(sc); PX.phase('ueberfall'); take(sc); }
        for (const k in o.it) o.it[k] = [...o.it[k]];
        return o;
      }, SCS);
      const keys = seen.f.concat(Object.keys(seen.it));
      t.ok(seen.f.length >= 40 && Object.keys(seen.it).length >= 40, 'gelesen: ' + seen.f.length + ' Kartenfelder, ' + Object.keys(seen.it).length + ' Objektarten');
      t.eq(keys.filter(k => !V.src[k]).map(k => k + (seen.it[k] ? ' (' + seen.it[k].join(',') + ')' : '')), [], 'Kartenfelder und Objektarten ohne Eintrag in V3CFG.scen.src (js/view3d.js)');
      t.eq(Object.keys(V.src).filter(k => !V.kinds[V.src[k]] && !BASE.includes(V.src[k])).map(k => k + ': ' + V.src[k]), [], 'Eintraege in src nennen eine Art aus kinds oder ' + BASE.join(', '));
      t.eq(Object.keys(V.src).filter(k => !keys.includes(k)), [], 'Eintraege in src, die es im Spiel nicht gibt');
      const need = [...new Set(Object.values(NEED).flat())];
      t.eq(need.filter(k => !V.kinds[k]), [], 'Liste NEED nennt nur Arten aus kinds');
      t.ok(page.errors.length === 0, 'keine JS-Fehler' + (page.errors.length ? ': ' + page.errors.slice(0, 2).join(' | ') : ''));
    },
  },
  {
    name: '3D-Szenarien: alle acht Szenarien bauen in 3D ohne Fehler, unter dem Draw-Call-Budget, mit ihren Besonderheiten und ohne unbekannte Arten',
    timeout: 300000,
    async run(t) {
      const P = await glPage(t); if (!P) return;
      try {
        const page = P.page;
        await lib.loadInpage(page, 'bild.js'); await page.addScriptTag({ content: H6 });
        const r = await page.evaluate(async (SCS) => {
          const D = __dbg, i0 = await D.view3d.set(true); if (i0.state !== 'an') return { i0 };
          const o = {};
          for (const sc of SCS) {
            const ph = sc === 'truck' || sc === 'nb' ? 'ueberfall' : 'erkundung'; H6.scene(sc, ph);
            const tg = H6.target(sc); H6.look(tg); const a = H6.info();
            PX.phase('ueberfall'); D.draw(); const b = H6.info();
            o[sc] = { a, b, kinds: [...new Set(Object.keys(a.scen).concat(Object.keys(b.scen)))] };
          }
          D.view3d.reset(); return { o };
        }, SCS);
        if (!r.o) { t.ok(false, '3D nicht an: ' + JSON.stringify(r.i0)); return; }
        for (const sc of SCS) {
          const q = r.o[sc], bad = q.kinds.filter(k => k[0] === '?'), miss = NEED[sc].filter(k => !q.kinds.includes(k));
          t.ok(q.a.errs === 0 && q.b.errs === 0, sc + ': ohne Fehler ' + (q.a.err || q.b.err || ''));
          t.ok(q.a.calls < 120 && q.b.calls < 120 && q.a.tris < 150000 && q.b.tris < 150000, sc + ': Draw Calls ' + q.a.calls + '/' + q.b.calls + ' unter 120, Dreiecke ' + q.a.tris + '/' + q.b.tris + ' unter 150.000');
          t.ok(q.a.n.slice(0, 4).every(v => v >= 0) && (q.a.n[0] + q.a.n[1] + q.a.n[2] + q.a.n[3] + q.a.n[4]) > 0, sc + ': Teile je Gruppe ' + JSON.stringify(q.a.n));
          t.eq(bad, [], sc + ': unbekannte Arten');
          t.eq(miss, [], sc + ': Besonderheiten fehlen (gezeigt: ' + q.kinds.join(' ') + ')');
        }
        if (page !== t.page && page.errors.length) t.ok(false, 'JS-Fehler: ' + page.errors.slice(0, 2).join(' | '));
      } finally { await P.done(); }
    },
  },
  {
    name: '3D-Szenarien: Zustandswechsel aendern die Darstellung (Laser aus, Tresor offen, Gitter auf, Loch offen, Zapfsaeule explodiert, Ladetuer offen)',
    timeout: 300000,
    async run(t) {
      const P = await glPage(t); if (!P) return;
      try {
        const page = P.page;
        await lib.loadInpage(page, 'bild.js'); await page.addScriptTag({ content: H6 });
        const r = await page.evaluate(async () => {
          const D = __dbg, i0 = await D.view3d.set(true); if (i0.state !== 'an') return { i0 };
          const o = {}, me = () => D.get().me, cnt = (L, k) => L.filter(x => x === k).length;
          // Museum: Laser an, dann Hauptschalter (Kameras und Laser aus)
          H6.scene('museum'); H6.look(H6.target('museum')); let a = H6.info();
          D.get().its.find(i => i.t === 'sw').act(me()); D.update(1 / 30); D.draw(); let b = H6.info();
          o.laser = { on: a.scen.laser || 0, off: b.scen.laser || 0, l: [a.n[1], b.n[1]], f: [a.n[2], b.n[2]], sum: [a.sum, b.sum] };
          // Bank: Tresor zu, dann offen (Block der Tuer weg, Blatt und Licht da, Geldstapel in Sicht)
          H6.scene('bank'); H6.look(H6.target('bank')); a = H6.info();
          D.get().its.find(i => i.t === 'vault').act(me()); D.update(1 / 30); H6.look(H6.target('bank')); b = H6.info();
          o.vault = { open: D.get().vaultOpen, sum: [a.sum, b.sum], vol: [a.vol, b.vol], f: [a.n[2], b.n[2]], bundle: [a.scen.bundle || 0, b.scen.bundle || 0] };
          // Gefaengnis: Gitter zu (Staebe), dann mit der Schluesselkarte auf
          H6.scene('prison'); H6.look(H6.target('prison')); a = H6.info();
          const rd = D.get().its.find(i => i.t === 'rdr'); rd.act(me()); for (let k = 0; k < 5; k++) D.update(1 / 30); D.draw(); D.draw(); b = H6.info();
          const R = D.LAY().prison, gl = R.locks.find(l => l.id === 'gi'), gc = gl.cells[0], W = D.world();
          o.grille = { grl: [a.grl, b.grl], cell: W.cell(gc[0], gc[1]), parts: [a.parts, b.parts], vol: [a.vol, b.vol], builds: [a.statBuilds, b.statBuilds], reader: [a.list.includes('reader'), b.list.includes('reader')], sum: [a.sum, b.sum], st: [a.n[0], b.n[0]], sc: [a.scen.grille || 0, b.scen.grille || 0] };
          // Notenbank: Bohrer, dann Loch offen
          H6.scene('nb', 'ueberfall'); H6.look(H6.target('nb')); a = H6.info(); D.nbHole(true); D.update(1 / 30); D.draw(); b = H6.info();
          o.hole = { a: [a.scen.nbRig || 0, a.scen.nbHole || 0], b: [b.scen.nbRig || 0, b.scen.nbHole || 0], zone: b.scen.zone || 0, sum: [a.sum, b.sum] };
          // Tankstelle: Zapfsaeule heil, dann ausgebrannt (Raster u wird o)
          H6.scene('gas'); H6.look(H6.target('gas')); a = H6.info(); const pq = D.LAY().pumps[0]; pq.hp = 0; W.setc(pq.x, pq.y, 'o'); D.draw(); b = H6.info();
          o.pump = { sum: [a.sum, b.sum], l: [a.n[1], b.n[1]] };
          // Transporter (Seed 2, ohne Panne): Panzerwagen faehrt, steht (von Hand angehalten), Ladetuer offen
          H6.scene('truck', 'erkundung', 2); const step = () => { me().hp = 1e9; D.update(1 / 30); };
          for (let k = 0; k < 30 * 120 && (!D.tk() || D.tk().st !== 'drive'); k++) step(); const st0 = D.tk() && D.tk().st; D.draw(); a = H6.info();
          D.tk().st = 'stopped'; H6.look(H6.target('truck')); const c = H6.info(); // anhalten von Hand (nur Darstellung geprueft; im Spiel halten ihn Sperren oder ein Schaden)
          D.get().its.find(i => i.t === 'ckey').act(me()); D.update(1 / 30); D.draw(); b = H6.info();
          o.truck = { st: [st0, D.tk().st], tk: [a.scen.tk || 0, c.scen.tk || 0, b.scen.tk || 0], sum: [c.sum, b.sum], cargo: D.get().cargoOpen };
          D.view3d.reset(); return { o };
        });
        if (!r.o) { t.ok(false, '3D nicht an: ' + JSON.stringify(r.i0)); return; }
        const o = r.o, ne = (a, b) => JSON.stringify(a) !== JSON.stringify(b);
        t.note(JSON.stringify(o).slice(0, 900));
        t.ok(o.laser.on >= 1 && o.laser.on === o.laser.off && o.laser.l[0] > o.laser.l[1] && o.laser.f[1] > o.laser.f[0], 'Laser: an leuchtend (' + o.laser.l[0] + ' Leuchten), aus matt (' + o.laser.f[1] + ' Flaechen), gleich viele Laser ' + o.laser.on);
        t.ok(o.vault.open && ne(o.vault.sum[0], o.vault.sum[1]) && o.vault.vol[1] < o.vault.vol[0] && o.vault.f[1] > o.vault.f[0], 'Tresor offen: Block weg (Rauminhalt ' + o.vault.vol.join(' > ') + '), Blatt und Licht (Flaechen ' + o.vault.f.join(' -> ') + ')');
        t.ok(o.vault.bundle[1] > 0 && o.vault.bundle[0] === 0, 'Geldstapel erst im offenen Tresor in Sicht: ' + o.vault.bundle.join(' -> '));
        t.ok(o.grille.grl[0] > 0 && o.grille.grl[1] < o.grille.grl[0] && o.grille.cell === 'l' && o.grille.builds[1] > o.grille.builds[0] && o.grille.parts[0][2] - o.grille.parts[1][2] === o.grille.grl[0] - o.grille.grl[1] && o.grille.st[0] > o.grille.st[1] && o.grille.vol[1] > o.grille.vol[0] && o.grille.sc[0] === o.grille.grl[0] && o.grille.sc[1] === o.grille.grl[1], 'Gitter: zu als Staebe (statisch je Kachel ein Riegel, ' + o.grille.parts.map(q => q[2]).join(' -> ') + ' Metallkloetze; dazu 4 Staebe und 2 Riegel als Teile, ' + o.grille.st.join(' -> ') + '; ' + o.grille.grl[0] + ' Kacheln), mit der Karte auf (' + o.grille.grl[1] + '), statische Welt neu gebaut, Rauminhalt ' + o.grille.vol.join(' -> ') + ' ('  + o.grille.grl[0] + ' Kacheln), mit der Karte auf (' + o.grille.grl[1] + '), statische Welt neu gebaut');
        t.ok(o.grille.reader[0] && o.grille.reader[1] && ne(o.grille.sum[0], o.grille.sum[1]), 'Kartenleser wechselt die Lampe');
        t.ok(o.hole.a[0] === 1 && o.hole.a[1] === 0 && o.hole.b[0] === 0 && o.hole.b[1] === 1 && o.hole.zone === 1, 'Notenbank: Bohrer, dann Loch und Ausstieg ' + JSON.stringify(o.hole));
        t.ok(ne(o.pump.sum[0], o.pump.sum[1]) && o.pump.l[1] < o.pump.l[0], 'Zapfsaeule: Anzeige aus, Stumpf statt Saeule ' + JSON.stringify(o.pump));
        t.ok(o.truck.tk.every(v => v === 1) && o.truck.st[0] === 'drive' && o.truck.st[1] === 'stopped' && o.truck.cargo && ne(o.truck.sum[0], o.truck.sum[1]), 'Panzerwagen fahrend und stehend gezeigt, Ladetuer offen aendert die Darstellung ' + JSON.stringify(o.truck));
        if (page !== t.page && page.errors.length) t.ok(false, 'JS-Fehler: ' + page.errors.slice(0, 2).join(' | '));
      } finally { await P.done(); }
    },
  },
  {
    name: '3D-Szenarien: Spielzustand nach 450 Schritten im Museum und im Gefaengnis ist mit und ohne 3D gleich (scen3d liest nur)',
    timeout: 300000,
    async run(t) {
      const P = await glPage(t); if (!P) return;
      try {
        const page = P.page;
        await lib.loadInpage(page, 'bild.js');
        const r = await page.evaluate(async () => {
          const D = __dbg, R0 = Math.random;
          const mb = s => () => { s = s + 0x6D2B79F5 | 0; let q = Math.imul(s ^ s >>> 15, 1 | s); q = q + Math.imul(q ^ q >>> 7, 61 | q) ^ q; return ((q ^ q >>> 14) >>> 0) / 4294967296; };
          async function run(sc, on) {
            await D.view3d.set(on); PX.scene(sc, 5); const rs = mb(42), rd = mb(7); Math.random = rs; D.setTime(0); D.setFocus(true);
            const V = D.view3d.V; if (on && V) V.pick = (sx, sy) => [sx + D.cam()[0], sy + D.cam()[1]];
            const K = D.keys, M = D.mouse; M.sx = 640; M.sy = 200;
            for (let i = 0; i < 450; i++) {
              for (const k of 'wasd') delete K[k]; K[['d', 'w', 'a', 's'][Math.floor(i / 50) % 4]] = 1;
              if (i === 300) D.startHeist();
              const m = D.get().me; if (m) m.hp = 100;
              D.update(1 / 30); if (i % 5 === 4) { Math.random = rd; D.draw(); Math.random = rs; }
            }
            Math.random = R0; for (const k of 'wasd') delete K[k];
            const g = D.get(); const s = JSON.stringify({ t: g.time, ph: g.phase, me: g.me ? [g.me.x, g.me.y, g.me.a, g.me.hp] : 0, en: g.en.map(e => [e.x, e.y, e.hp]), npc: g.npcs.map(n => [n.x, n.y, n.st]), its: g.its.map(o => [o.t, !!o.done, o.pr]), M: D.world().M.join(''), sus: g.sus, cd: g.camDown });
            let h = 0; for (let i = 0; i < s.length; i++) h = Math.imul(h, 31) + s.charCodeAt(i) | 0;
            return { h, ph: g.phase, fr: on ? D.view3d.info().frames : 0, errs: on ? D.view3d.info().errs : 0, scen: on && V ? V.info().scen : null };
          }
          const o = {};
          for (const sc of ['museum', 'prison']) o[sc] = { off: await run(sc, false), on: await run(sc, true), off2: await run(sc, false) };
          D.view3d.reset(); return o;
        });
        for (const sc of ['museum', 'prison']) {
          const q = r[sc];
          t.eq(q.off.h, q.off2.h, sc + ': ohne 3D zweimal gleich');
          t.ok(q.on.fr >= 80 && q.on.errs === 0 && q.on.scen && Object.keys(q.on.scen).length >= 3, sc + ': 3D hat gezeichnet (' + q.on.fr + ' Bilder, Arten ' + JSON.stringify(q.on.scen) + ')');
          t.eq(q.on.h, q.off.h, sc + ': Zustandshash gleich mit und ohne 3D (Phase ' + q.off.ph + ')');
        }
        if (page !== t.page && page.errors.length) t.ok(false, 'JS-Fehler: ' + page.errors.slice(0, 2).join(' | '));
      } finally { await P.done(); }
    },
  },
];
