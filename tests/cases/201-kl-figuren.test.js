// Kloetzchen-Figuren (Ticket 198, js/kl-figuren.js): jede Art hat einen Bauer, jede Haltung (laufen, Waffe, Schild, Gewehr, kniet, liegt, Beute) baut ohne Fehler,
// Teile je Figur im Rahmen. Ohne WebGL 2 uebersprungen. 2D bleibt unberuehrt.
const path = require('path'), { pathToFileURL } = require('url');
const lib = require('../lib');
async function glPage(t) {
  const ok = p => p.evaluate(() => !!document.createElement('canvas').getContext('webgl2'));
  if (await ok(t.page)) return { page: t.page, done: async () => {} };
  const env = await lib.launch({ webgl: true }), page = await lib.openGame(env);
  if (await ok(page)) return { page, done: async () => { await page.ctx.close().catch(() => {}); await env.browser.close().catch(() => {}); env.srv.close(); } };
  await env.browser.close().catch(() => {}); env.srv.close(); t.note('kein WebGL 2, 3D-Teil uebersprungen'); return null;
}
module.exports = [
  {
    name: 'Kloetzchen-Figuren: alle Arten mit Bauer, Haltungen (laufen, Schild, Gewehr, kniet, liegt, Beute) bauen ohne Fehler, Teile je Figur im Rahmen',
    timeout: 240000,
    async run(t) {
      const P = await glPage(t); if (!P) return;
      try {
        const r = await P.page.evaluate(`(async () => { const D = __dbg, o = {};
          D.setScenario('bank'); D.setSeedMode('random'); D.buildLay(D.layoutFor(5)); D.startHeist(); const g = D.get(), me = g.me; me.hp = 1e9; me.armed = true;
          for (let i = 0; i < 300; i++) { me.hp = 1e9; D.update(1 / 30) }
          D.view3d.kstil = 1; await D.view3d.set(true); const W = D.world(), T = 32, free = (x, y) => !W.isSol(Math.floor(x / T), Math.floor(y / T));
          let spot = null; for (let y = 4 * T; y < 40 * T && !spot; y += T) for (let x = 3 * T; x < 50 * T && !spot; x += T) { let ok = true; for (let k = 0; k < 13; k++) for (const dy of [-T, 0, T]) if (!free(x + k * 40, y + dy)) ok = false; if (ok) spot = [x, y] }
          o.spot = !!spot; if (!spot) return o;
          me.x = spot[0]; me.y = spot[1]; me.a = .6; me.units = 3; me.vx = me.vy = 0; for (let i = 0; i < 45; i++) { me.hp = 1e9; me.x = spot[0]; me.y = spot[1]; D.update(1 / 30) }
          const g2 = D.get(); g2.en.length = 0; g2.npcs.length = 0; g2.cars.length = 0;
          const mk = (kind, row, ex) => Object.assign({ id: 9000 + g2.en.length, kind, row, r: 9, hp: 1e5, mhp: 1e5, a: .6, w: 0, mvg: false, fl: 0, h: 0, sh: 0, sx: 0, muz: 30, cool: 99, react: 9, sur: 0, mode: 'x', path: [] }, ex);
          const pos = i => ({ x: spot[0] + (1 + (i / 3 | 0)) * 36, y: spot[1] + (i % 3 - 1) * T });
          const list = [['cop', 0, {}], ['swat', 8, {}], ['shield', 0, { sh: 50 }], ['sniper', 8, {}], ['grd', 2, {}], ['cop', 0, { mvg: true, w: 1.3 }], ['cop', 0, { sur: 1 }]];
          list.forEach(([k, row, ex], i) => g2.en.push(mk(k, row, Object.assign(pos(i), ex))));
          [['civ', 3, 'idle'], ['civ', 4, 'cower'], ['tel', 5, 'idle'], ['mgr', 6, 'idle'], ['civ', 3, 'ko']].forEach(([k, row, st], i) => g2.npcs.push(Object.assign({ id: 7000 + i, k, row, a: .6, w: 0, mvg: false, st, r: 8, kt: 20 }, pos(i + 7))));
          D.draw(); D.draw(); const V = D.view3d.V, i = V.info(); o.i = { figsK: i.k.figsK, figs: i.figs, parts: i.k.parts, err: i.err, figParts: i.figParts }; o.fk = V.info().fk; o.per = i.k.figsK ? i.k.parts / i.k.figsK : 0;
          const K = V.kl(); o.have = ['rob0','rob1','rob2','rob3','cop','swat','shield','sniper','grd','civA','civB','tel','mgr'].filter(a => !K.KL.hasFig(a)); await D.view3d.set(false); return o; })()`);
        t.note(JSON.stringify(r));
        t.ok(r.spot, 'freier Platz fuer die Reihe');
        t.eq(r.have, [], 'Arten ohne Bauer');
        t.ok(r.i.err === '' && r.i.figParts === 0 && r.i.figsK >= 12, 'Reihe aus Teilen ohne Fehler: ' + JSON.stringify(r.i));
        t.ok(r.per > 12 && r.per < 90, 'Teile je Figur im Rahmen (12 bis 90): ' + r.per.toFixed(1));
        if (P.page.errors.length) t.ok(false, 'JS-Fehler: ' + P.page.errors.slice(0, 2).join(' | '));
      } finally { await P.done(); }
    },
  },
];
