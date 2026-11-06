// Prototyp 2D-Schraegsicht (#125, nicht mergen): #debug&schraeg zeichnet Waende als Bloecke, ohne JS-Fehler, (Mausrueckrechnung bei Stauchung nur von Hand geprueft).
// Ohne #schraeg bleibt das Bild unveraendert (Gegenprobe nur von Hand gegen main, siehe PR).
const SCH = { hash: '#debug&schraeg' };
module.exports = [
  {
    name: 'Schraegsicht: Halle zeichnet bei Hoehe 0, 0,6 und 1 sowie Stauchung 0,85 ohne Fehler',
    open: SCH, timeout: 120000,
    async run(t) {
      const r = await t.page.evaluate(() => {
        const D = __dbg, o = { tilts: [] };
        D.reset(); const m = D.get().me; m.x = 8.5 * 32; m.y = 9.5 * 32;
        for (let i = 0; i < 60; i++) D.update(1 / 30);
        for (const [h, sq] of [[0, 1], [.6, 1], [1, 1], [.6, .85]]) {
          D.schr.h = h; D.schr.sq = sq; D.draw();
          const cv = document.getElementById('c'), q = cv.getContext('2d'), d = q.getImageData(0, 0, cv.width, cv.height).data;
          let lum = 0, n = 0; for (let i = 0; i < d.length; i += 4 * 997) { lum += (d[i] + d[i + 1] + d[i + 2]) / 3; n++ }
          o.tilts.push({ h, sq, lum: lum / n });
        }
        return o;
      });
      for (const x of r.tilts) t.ok(x.lum > 25, 'Bild leer bei h=' + x.h + ' sq=' + x.sq + ' (Helligkeit ' + x.lum.toFixed(1) + ')');
    },
  },
];
