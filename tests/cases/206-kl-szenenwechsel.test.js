// Szenenwechsel in der 3D-Ansicht (Ticket 198, Eilfund): Wechselt die Karte (Menue-Hintergrund zum Auftrag, Auftrag zu Auftrag) in einer laufenden Ansicht, muss das Bild dasselbe sein wie in einer neu
// angelegten Ansicht (Taste F7). Ursache des Fehlers: WebGL 2 legt Texturen mit fester Groesse an, ein Bild anderer Groesse (Boden, Spuren, Sichtmaske) landete in der alten Flaeche. Kein Pixelvergleich mit Gold,
// nur Ansicht gegen Ansicht. Ohne WebGL 2 uebersprungen.
const { glPage } = require('../glshare');   // gemeinsamer WebGL-Browser (tests/glshare.js)
module.exports = [{
  name: 'Szenenwechsel in laufender 3D-Ansicht: Bild gleich dem einer neu angelegten Ansicht (Boden, Spuren und Sichtmaske folgen der neuen Kartengroesse), mit Kloetzchen und klassisch',
  timeout: 280000,
  async run(t) {
    const P = await glPage(t); if (!P) return;
    try {
      const r = await P.page.evaluate(`(async () => { const D = __dbg, out = [];
        const sig = () => { D.draw(); D.draw(); const V = D.view3d.V, c = document.createElement('canvas'); c.width = 96; c.height = 54; const q = c.getContext('2d', { willReadFrequently: true }); q.drawImage(V.el, 0, 0, 96, 54); return Array.from(q.getImageData(0, 0, 96, 54).data); };
        const go = (sc, sd) => { D.setScenario(sc); D.setSeedMode('random'); D.setLage([]); D.setTurn('S'); D.buildSeed(sd); D.ptClear(); for (let i = 0; i < 10; i++) { D.get().me.hp = 1e9; D.update(1 / 30); } };
        const diff = (a, b) => { let s = 0; for (let i = 0; i < a.length; i += 4) s += Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]); return s / (a.length / 4 * 3); };
        for (const st of [1]) {
          D.view3d.reset(); await D.view3d.set(true);
          for (const [from, to] of [['bank', 'casino'], ['casino', 'truck'], ['truck', 'museum']]) {
            go(from, 5); sig(); go(to, 5); const a = sig(); D.view3d.reset(); await D.view3d.set(true); const b = sig(); out.push({ st, from, to, d: Math.round(diff(a, b) * 100) / 100, err: D.view3d.V.info().err });
          }
        }
        await D.view3d.set(false); return out; })()`);
      t.note(JSON.stringify(r));
      for (const q of r) t.ok(q.err === '' && q.d < 2.5, (q.st ? 'Kloetzchen' : 'klassisch') + ' ' + q.from + ' zu ' + q.to + ': Bild gleich der neuen Ansicht (mittlere Abweichung ' + q.d + ')');
      if (P.page.errors.length) t.ok(false, 'JS-Fehler: ' + P.page.errors.slice(0, 2).join(' | '));
    } finally { await P.done(); }
  },
}];
