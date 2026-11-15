// Kameras nur an Waenden (Ticket 221): Karten-Vertrag (validateMap: Kamera ohne Mauer im Ruecken ist ein Fehler) ueber Seeds 1 bis 500 je Szenario, Klassikkarten, dazu die Klotz-Kamera in 3D
// (Szenario-Teil 'cam': Wandhalter, Gehaeuse, Linse, LED, das 2D-Bild entfaellt, ohne Bauer bleibt es klassisch). Kein Pixelvergleich, 3D-Teil ohne WebGL 2 uebersprungen.
const path = require('path'), { pathToFileURL } = require('url');
const lib = require('../lib');
const { glPage } = require('../glshare');
module.exports = [
  {
    name: 'Kamera an der Wand: validateMap ohne Kamera-Fehler, Seeds 1 bis 500 je Szenario (Bank, Juwelier, Tankstelle, Museum, Casino, Notenbank, Gefaengnis) und Klassikkarten',
    timeout: 600000,
    async run(t) {
      await t.loadTool('mapcheck.js');
      const r = await t.page.evaluate(() => {
        const out = {}, D = __dbg;
        for (const sc of ['bank', 'jewel', 'gas', 'museum', 'casino', 'nb', 'prison']) { const sw = mapcheck.vsweep(sc, 500, 1, { light: true }); out[sc] = { n: sw.n, bad: sw.err['kamera-wand'] ? sw.err['kamera-wand'].n : 0, ex: sw.err['kamera-wand'] ? sw.err['kamera-wand'].ex : '' }; }
        mapcheck.build('bank', 'classic'); const c = D.validateMap(D.LAY()); out.classic = c.err.filter(q => q.r === 'kamera-wand').length;
        return out;
      });
      t.note(JSON.stringify(r));
      for (const sc of ['bank', 'jewel', 'gas', 'museum', 'casino', 'nb', 'prison']) t.ok(r[sc].n >= 400 && r[sc].bad === 0, sc + ': ' + r[sc].n + ' Karten, Kameras ohne Mauer im Ruecken: ' + r[sc].bad + ' ' + r[sc].ex);
      t.eq(r.classic, 0, 'Klassikkarte ohne Kamera-Fehler');
    },
  },
  {
    name: 'Kamera in 3D: Klotz-Kamera mit Wandhalter an der Mauer, das 2D-Bild entfaellt im Stil, ohne Bauer klassisch, aus und an unterscheiden sich',
    timeout: 240000,
    async run(t) {
      const P = await glPage(t); if (!P) return;
      try {
        const K = await import(pathToFileURL(path.join(lib.ROOT, 'js', 'kl-kern.js')).href), V = await import(pathToFileURL(path.join(lib.ROOT, 'js', 'view3d.js')).href);
        t.ok(K.KL.hasObj('cam') && V.V3CFG.scen.kinds.cam, 'Bauer cam und Eintrag da');
        await lib.loadInpage(P.page, 'bild.js');
        const r = await P.page.evaluate(`(async () => { const D = __dbg, o = {}; D.view3d.kstil = 1; const i0 = await D.view3d.set(true); if (i0.state !== 'an') return { i0 };
          for (const sc of ['bank', 'jewel']) {
            PX.scene(sc, 5); PX.phase('erkundung'); const L = D.LAY(), g = D.get(), me = g.me, W = D.world(), c = L.cams[0], tg = [c.x, c.y]; let best = null;
            for (const rr of [60, 90, 120]) for (let k = 0; k < 24 && !best; k++) { const a = k / 24 * 6.283, x = tg[0] + Math.cos(a) * rr, y = tg[1] + Math.sin(a) * rr; if (!W.isSol(Math.floor(x / 32), Math.floor(y / 32)) && D.los(x, y, tg[0], tg[1])) best = [x, y]; }
            best = best || [me.x, me.y]; const V = D.view3d.V, KK = V.kl(), cnt = () => ['k-dinge', 'k-dinge-klein'].reduce((a, n) => a + (V.scene.getObjectByName(n) ? V.scene.getObjectByName(n).count : 0), 0);
            const sig = () => ['k-dinge', 'k-dinge-klein'].reduce((a, n) => { const m = V.scene.getObjectByName(n); if (!m) return a; let h = 0; const A = m.instanceMatrix.array, C = m.instanceColor ? m.instanceColor.array : []; for (let i = 0; i < m.count * 16; i++) h += A[i] * ((i % 7) + 1); for (let i = 0; i < m.count * 3; i++) h += C[i] * 13; return a + h; }, 0);
            const sd = () => { for (let k = 0; k < 8; k++) { me.x = best[0]; me.y = best[1]; me.vx = me.vy = 0; me.hp = 100; D.update(1 / 30); } D.draw(); D.draw(); return V.info(); };
            let a = sd(); o[sc] = { cam: a.scen.cam || 0, n: cnt(), hud: D.view3d.V.info().cams3d, err: a.err };
            const s1 = sig(); D.get().camDown; const it = g.its.find(i => i.t === 'sw'); it.act(me); a = sd(); o[sc].off = cnt(); o[sc].sigDiff = sig() !== s1; o[sc].err2 = a.err;
            const bak = KK.KL.objs.cam; delete KK.KL.objs.cam; a = sd(); o[sc].ohne = cnt(); o[sc].err3 = a.err; KK.KL.objs.cam = bak;
          }
          await D.view3d.set(false); return o; })()`);
        if (r.i0) { t.note('3D nicht verfuegbar'); return; }
        t.note(JSON.stringify(r));
        for (const sc of ['bank', 'jewel']) {
          const q = r[sc]; t.ok(q.err === '' && q.err2 === '' && q.err3 === '', sc + ': keine Fehler');
          t.ok(q.cam >= 1 && q.n >= 12, sc + ': Kamera als Kloetze geliefert (' + q.cam + ' Kameras, ' + q.n + ' Kloetze)');
          t.ok(q.off === q.n || q.sigDiff, sc + ': Zustand aus (Hauptschalter) aendert die Kamera');
          t.ok(q.ohne < q.n, sc + ': ohne Bauer faellt die Kamera auf das klassische Bild zurueck (' + q.ohne + ' Kloetze)');
        }
        if (P.page.errors.length) t.ok(false, 'JS-Fehler: ' + P.page.errors.slice(0, 2).join(' | '));
      } finally { await P.done(); }
    },
  },
];
