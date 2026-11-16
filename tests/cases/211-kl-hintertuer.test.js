// Kloetzchen-Stil, Hintertueren und Nebeneingaenge (Ticket 211): L (zu) und l (offen), Personaltueren und Hoftuer sind dasselbe Szenario-Teil 'lock' (scen3d lockCells). Bauer da, kein klassischer Rueckfall,
// zu und offen sehen verschieden aus (Kloetze), kein Fehler, Dreiecke im Rahmen. Kein Pixelvergleich, ohne WebGL 2 uebersprungen.
const path = require('path'), { pathToFileURL } = require('url');
const lib = require('../lib');
const { glPage } = require('../glshare');   // gemeinsamer WebGL-Browser (tests/glshare.js)
module.exports = [
  {
    name: 'Hintertuer: der Bauer lock ist eingetragen (Bank, Juwelier, Personaltueren, Gefaengnis teilen ihn)',
    async run(t) {
      const K = await import(pathToFileURL(path.join(lib.ROOT, 'js', 'kl-kern.js')).href), V = await import(pathToFileURL(path.join(lib.ROOT, 'js', 'view3d.js')).href);
      t.ok(K.KL.hasObj('lock') && V.V3CFG.scen.kinds.lock, 'lock hat Bauer und Eintrag');
      t.ok(K.KL.cellOver && K.KL.cellOver.L && K.KL.cellOver.L.cut && K.KL.cellOver.L.s[0][0] > 40, 'im Stil bleibt von L nur der Sturz (mit Schnitt), die Nische bauen die Kloetze');
      t.ok(V.V3CFG.cells.L && V.V3CFG.cells.L.cut && V.V3CFG.cells.l, 'L und l in der Hoehentabelle, L mit Schnitt wie Waende');
    },
  },
  {
    name: 'Hintertuer: Bank und Juwelier zeichnen L und l im Stil aus Kloetzen, zu und offen unterscheiden sich, ohne Bauer faellt es klassisch zurueck',
    timeout: 240000,
    async run(t) {
      const P = await glPage(t); if (!P) return;
      try {
        await lib.loadInpage(P.page, 'bild.js');
        const r = await P.page.evaluate(`(async () => { const D = __dbg, o = {}; const i0 = await D.view3d.set(true); if (i0.state !== 'an') return { i0 };
          for (const sc of ['bank', 'jewel']) {
            PX.scene(sc, 5); PX.phase('erkundung'); const L = D.LAY(), W = D.world(), c = (L.lockCells || [])[0]; if (!c) { o[sc] = { none: 1 }; continue; }
            const g = D.get(), me = g.me, tg = [c[0] * 32 + 16, c[1] * 32 + 16]; let best = null;
            for (const rr of [60, 80, 110]) for (let k = 0; k < 24 && !best; k++) { const a = k / 24 * 6.283, x = tg[0] + Math.cos(a) * rr, y = tg[1] + Math.sin(a) * rr; if (!W.isSol(Math.floor(x / 32), Math.floor(y / 32)) && D.los(x, y, tg[0], tg[1])) best = [x, y]; }
            best = best || [me.x, me.y]; const sd = () => { for (let k = 0; k < 12; k++) { me.x = best[0]; me.y = best[1]; me.vx = me.vy = 0; me.hp = 100; D.update(1 / 30); } D.draw(); D.draw(); return D.view3d.V.info(); };
            const V = D.view3d.V, K = V.kl(), cnt = () => ['k-dinge', 'k-dinge-klein'].reduce((a, n) => a + (V.scene.getObjectByName(n) ? V.scene.getObjectByName(n).count : 0), 0);
            let a = sd(); o[sc] = { lock: a.scen.lock || 0, zu: cnt(), err: a.err, sum: a.scenSum };
            W.setc(c[0], c[1], 'l'); a = sd(); o[sc].offen = cnt(); o[sc].lockOffen = a.scen.lock || 0; o[sc].err2 = a.err; o[sc].sum2 = a.scenSum;
            W.setc(c[0], c[1], 'L'); const bak = K.KL.objs.lock; delete K.KL.objs.lock; a = sd(); o[sc].ohne = cnt(); o[sc].sumOhne = a.scenSum; o[sc].err3 = a.err; K.KL.objs.lock = bak;
          }
          await D.view3d.set(false); return o; })()`);
        if (r.i0) { t.note('3D nicht verfuegbar'); return; }
        t.note(JSON.stringify(r));
        for (const sc of ['bank', 'jewel']) {
          const q = r[sc]; if (q.none) { t.note(sc + ': keine Hintertuer auf dieser Karte'); continue; }
          t.ok(q.err === '' && q.err2 === '' && q.err3 === '', sc + ': keine Fehler');
          t.ok(q.lock > 0, sc + ': Szenario-Teil lock geliefert (' + q.lock + ')');
          t.ok(q.zu >= 40, sc + ': geschlossene Tuer aus vielen Kloetzen (' + q.zu + ')');
          t.ok(q.offen > 0 && q.offen !== q.zu, sc + ': offen sieht anders aus (' + q.zu + ' zu, ' + q.offen + ' offen)');
          t.ok(q.ohne < q.zu, sc + ': ohne Bauer faellt die Tuer klassisch zurueck (' + q.ohne + ' Kloetze)');
        }
        if (P.page.errors.length) t.ok(false, 'JS-Fehler: ' + P.page.errors.slice(0, 2).join(' | '));
      } finally { await P.done(); }
    },
  },
];
