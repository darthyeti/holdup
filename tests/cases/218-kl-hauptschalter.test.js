// Kloetzchen-Stil, Hauptschalter (LAY.sw, E-Ziel Strom aus): Szenario-Teil 'sw' aus scen3d (Lage, Zustand an oder aus aus camDown), Bauer baut einen Schaltkasten an der Wand. Zustand an und aus sehen verschieden aus,
// ohne Bauer faellt es klassisch zurueck (die Platte der statischen Welt bleibt). Kein Pixelvergleich, ohne WebGL 2 uebersprungen.
const path = require('path'), { pathToFileURL } = require('url');
const lib = require('../lib');
const { glPage } = require('../glshare');
module.exports = [
  {
    name: 'Hauptschalter: Bauer sw und Eintrag in V3CFG, jedes Szenario mit LAY.sw liefert das Szenario-Teil',
    async run(t) {
      const K = await import(pathToFileURL(path.join(lib.ROOT, 'js', 'kl-kern.js')).href), V = await import(pathToFileURL(path.join(lib.ROOT, 'js', 'view3d.js')).href);
      t.ok(K.KL.hasObj('sw') && V.V3CFG.scen.kinds.sw, 'sw hat Bauer und Eintrag');
      t.eq([V.V3CFG.scen.src.sw, V.V3CFG.scen.src['it:sw']], ['sw', 'sw'], 'Feld und E-Ziel zeigen auf das Szenario-Teil');
    },
  },
  {
    name: 'Hauptschalter: Bank, Juwelier, Tankstelle und Museum zeichnen den Schaltkasten aus Kloetzen, an und aus (Strom aus) sehen verschieden aus, ohne Bauer klassisch',
    timeout: 240000,
    async run(t) {
      const P = await glPage(t); if (!P) return;
      try {
        await lib.loadInpage(P.page, 'bild.js');
        const r = await P.page.evaluate(`(async () => { const D = __dbg, o = {}; D.view3d.kstil = 1; const i0 = await D.view3d.set(true); if (i0.state !== 'an') return { i0 };
          for (const sc of ['bank', 'jewel', 'gas', 'museum']) {
            PX.scene(sc, 5); PX.phase('erkundung'); const L = D.LAY(), g = D.get(), me = g.me; if (!L.sw) { o[sc] = { none: 1 }; continue; }
            const V = D.view3d.V, K = V.kl(), cnt = () => ['k-dinge', 'k-dinge-klein'].reduce((a, n) => a + (V.scene.getObjectByName(n) ? V.scene.getObjectByName(n).count : 0), 0);
            const sig = () => ['k-dinge', 'k-dinge-klein'].reduce((a, n) => { const m = V.scene.getObjectByName(n); if (!m) return a; let h = 0; const A = m.instanceMatrix.array, C = m.instanceColor ? m.instanceColor.array : []; for (let i = 0; i < m.count * 16; i++) h += A[i] * ((i % 7) + 1); for (let i = 0; i < m.count * 3; i++) h += C[i] * 13; return a + Math.round(h * 100) / 100; }, 0);
            const sd = () => { for (let k = 0; k < 6; k++) { me.x = L.sw.x; me.y = L.sw.y + 12; me.vx = me.vy = 0; me.hp = 100; D.update(1 / 30); } D.draw(); D.draw(); return V.info(); };
            let a = sd(); o[sc] = { sw: a.scen.sw || 0, sigAn: sig(), an: cnt(), err: a.err, sum: a.k.dinge };
            const it = g.its.find(i => i.t === 'sw'); it.act(me); a = sd(); o[sc].aus = cnt(); o[sc].sigAus = sig(); o[sc].camDown = D.get().camDown > 0; o[sc].sumAus = a.k.dinge; o[sc].err2 = a.err;
            const bak = K.KL.objs.sw; delete K.KL.objs.sw; a = sd(); o[sc].ohne = cnt(); o[sc].err3 = a.err; K.KL.objs.sw = bak;
          }
          await D.view3d.set(false); return o; })()`);
        if (r.i0) { t.note('3D nicht verfuegbar'); return; }
        t.note(JSON.stringify(r));
        for (const sc of ['bank', 'jewel', 'gas', 'museum']) {
          const q = r[sc]; if (q.none) { t.note(sc + ': kein Hauptschalter'); continue; }
          t.ok(q.err === '' && q.err2 === '' && q.err3 === '', sc + ': keine Fehler');
          t.ok(q.sw === 1 && q.an >= 20, sc + ': Szenario-Teil sw geliefert und aus vielen Kloetzen (' + q.an + ')');
          t.ok(q.camDown && q.aus === q.an && q.sigAn !== q.sigAus, sc + ': nach Strom aus bleibt die Zahl der Kloetze gleich, Hebel und Lampe wechseln Lage und Farbe (' + q.sigAn + ' gegen ' + q.sigAus + ')');
          t.ok(q.ohne < q.an, sc + ': ohne Bauer faellt es klassisch zurueck (' + q.ohne + ')');
        }
        if (P.page.errors.length) t.ok(false, 'JS-Fehler: ' + P.page.errors.slice(0, 2).join(' | '));
      } finally { await P.done(); }
    },
  },
];
