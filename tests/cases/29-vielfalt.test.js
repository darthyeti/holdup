// Vielfalt der Karten je Szenario (Plan Mehr Abwechslung, docs/archiv-gebaute-plaene.md): mapcheck.variety zaehlt ueber viele Seeds, wie viele verschiedene Huellen, Gebaeudegroessen, Fluchtvarianten, Beute-Anordnungen, Hallen und Raster es gibt.
// Der Schnappschuss haelt den Stand fest. Wird ein Szenario generiert (Stufe 1 bis 3 des Plans), steigen die Zahlen, dann den Schnappschuss mit npm run test:update bewusst erneuern. Ziel: mindestens 50 verschiedene Huellen in 300 Seeds je Szenario (die Bank hat 299).
const SC = ['bank', 'jewel', 'gas', 'museum', 'casino', 'truck'];

module.exports = [
  {
    name: 'Vielfalt: Huellen, Groessen, Fluchtvarianten, Beute und Raster je Szenario ueber 200 Seeds (Schnappschuss)',
    slow: true,
    timeout: 240000,
    async run(t) {
      await t.loadTool('mapcheck.js');
      const r = await t.page.evaluate(SC => { const out = {}; for (const sc of SC) out[sc] = mapcheck.variety(sc, 200, 1, 13, 20); return out; }, SC);
      // Die Bank wird aus Parametern gebaut: fast jede Karte ist eine eigene Huelle, jedes Raster verschieden
      t.ok(r.bank.huelle >= 150, 'Bank: mindestens 150 verschiedene Huellen in 200 Seeds: ' + r.bank.huelle);
      t.eq(r.bank.raster, r.bank.rasterVon, 'Bank: jedes der gebauten Raster ist verschieden');
      // Jede Hallen-Karte zeigt alle ihre Varianten
      t.eq([r.jewel.hallen, r.gas.hallen, r.museum.hallen, r.casino.hallen], [5, 4, 5, 4], 'Hallen je Karte');
      for (const sc of SC) t.ok(r[sc].seeds === 200 && r[sc].huelle >= 1 && r[sc].raster >= 1, sc + ': Bericht vollstaendig: ' + JSON.stringify(r[sc]));
      await t.snapshot('vielfalt', r);
    },
  },
];
