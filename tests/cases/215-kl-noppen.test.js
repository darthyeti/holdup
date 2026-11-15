// Kloetzchen-Stil ohne Noppen (Ticket 215): KCFG.studs (Standard 0) ist der eine Schalter fuer alle Noppen (Welt: k.studs, Fahrzeugdaecher). Mit 0 gibt es keine Noppen-Instanzen,
// mit 1 wieder, die Teile der Fahrzeuge sinken ohne Noppen. Kein Pixelvergleich, ohne WebGL 2 uebersprungen.
const lib = require('../lib');
const { glPage } = require('../glshare');   // gemeinsamer WebGL-Browser (tests/glshare.js)
module.exports = [
  {
    name: 'Kloetzchen ohne Noppen: Standard 0 ohne Noppen-Instanzen (Bank, Casino, Strasse mit Autos), mit KCFG.studs 1 wieder da, Fahrzeugdaecher folgen demselben Schalter',
    timeout: 240000,
    async run(t) {
      const P = await glPage(t); if (!P) return;
      try {
        await lib.loadInpage(P.page, 'bild.js');
        const r = await P.page.evaluate(`(async () => { const D = __dbg, o = {}; D.view3d.kstil = 1; const i0 = await D.view3d.set(true); if (i0.state !== 'an') return { i0 };
          const V = D.view3d.V, K = V.kl(), KC = K.kit.KC; o.std = KC.studs;
          const meshN = () => { const m = V.scene.getObjectByName('k-noppen'); return m ? m.count : 0; };
          for (const sc of ['bank', 'casino', 'truck']) {
            PX.scene(sc, 5); PX.phase(sc === 'truck' ? 'ueberfall' : 'erkundung'); for (let i = 0; i < 6; i++) D.update(1 / 30); D.draw(); D.draw();
            KC.studs = 0; K.world(); D.draw(); const a = V.info(); const off = { studs: a.k.world.studs, mesh: meshN(), parts: a.k.parts, err: a.err };
            KC.studs = 1; K.world(); D.draw(); const b = V.info(); o[sc] = { off, on: { studs: b.k.world.studs, mesh: meshN(), parts: b.k.parts, err: b.err } }; KC.studs = 0; K.world();
          }
          await D.view3d.set(false); return o; })()`);
        if (r.i0) { t.note('3D nicht verfuegbar'); return; }
        t.note(JSON.stringify(r));
        t.eq(r.std, 0, 'KCFG.studs ist Standard 0');
        for (const sc of ['bank', 'casino', 'truck']) {
          const q = r[sc]; t.ok(q.off.err === '' && q.on.err === '', sc + ': keine Fehler');
          t.ok(q.off.studs === 0 && q.off.mesh === 0, sc + ': ohne Noppen keine Instanzen (' + q.off.studs + '/' + q.off.mesh + ')');
          t.ok(q.on.studs > 0 && q.on.mesh > 0, sc + ': mit Schalter 1 sind Noppen da (' + q.on.studs + ')');
        }
        t.ok(r.bank.on.parts >= r.bank.off.parts && r.truck.on.parts >= r.truck.off.parts, 'Fahrzeug- und Figurenteile: mit Noppen nie weniger');
        if (P.page.errors.length) t.ok(false, 'JS-Fehler: ' + P.page.errors.slice(0, 2).join(' | '));
      } finally { await P.done(); }
    },
  },
];
