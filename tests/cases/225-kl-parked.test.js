// Kloetzchen-Stil: geparkte Autos am Transporter (Szenario-Teil parked) sind Autos aus Kloetzchen (Bauer KL.obj parked, Auto der Art civ aus kl-fahrzeuge.js), nicht der klassische Bildklotz. Ohne WebGL 2 uebersprungen.
const { glPage } = require('../glshare');
module.exports = [{
  name: 'Kloetzchen parked: geparkte Autos am Transporter aus Kloetzchen (kein klassischer Bildklotz)',
  timeout: 200000,
  async run(t) {
    const P = await glPage(t, { gfx: 'mittel', still: true }); if (!P) return;
    try {
      await require('../lib').loadInpage(P.page, 'bild.js');
      const r = await P.page.evaluate(async () => { const D = __dbg; D.view3d.kstil = 1; await D.view3d.set(true); PX.scene('truck', 5); PX.phase('erkundung'); D.draw(); D.draw(); const V = D.view3d.V, i = V.info(), K = V.kl(), n = i.scen.parked || 0, L = K.dingeList();
        return { n, dinge: L.length, hasB: K.KL.hasObj('parked'), err: i.err } });
      t.note(JSON.stringify(r));
      t.ok(r.err === '' && r.n > 0 && r.hasB, 'geparkte Autos da (' + r.n + ') mit Bauer');
      t.ok(r.dinge >= r.n * 12, 'je Auto mindestens zwoelf Kloetze (' + r.dinge + ' Kloetze fuer ' + r.n + ' Autos)');
      if (P.page.errors.length) t.ok(false, 'JS-Fehler: ' + P.page.errors.slice(0, 2).join(' | '));
    } finally { await P.done(); }
  },
}];
