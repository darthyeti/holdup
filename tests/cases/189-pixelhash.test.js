// Pixel-Hash des gezeichneten Bildes (Ticket 143, Auslagern Schritt 4a): je Szenario (Bank, Transporter, Juwelier, Tankstelle, Museum, Casino, Notenbank, Gefaengnis), Phase (Erkundung, Ueberfall, Polizei) und Grafikstufe
// (niedrig, mittel, hoch) ein Hash der 1920x1088 Pixel in tests/golden/189-pixelhash.json. Netz fuers Auslagern des Zeichnens (js/draw.js) und den spaeteren 3D-Unterbau: Jede Umstellung muss Pixel fuer Pixel dasselbe Bild liefern.
// Eingefroren ist alles, was das Bild sonst verschieden macht (siehe tests/inpage/bild.js und docs/tests-und-messwerte.md): Zufall, Spielzeit, Maus, Partikel, Spielschleife, Fenstergroesse. Die Hashes haengen an Chromium ohne GPU
// (lib.js startet mit --disable-accelerated-2d-canvas) und an der Systemschrift: auf einer anderen Maschine oder Chromium-Version koennen sie abweichen, dann mit npm run test:update neu schreiben und im PR sagen, warum.
// Aktualisieren nur bewusst (npm run test:update), nie um einen roten Lauf gruen zu machen. Der schnelle Lauf prueft Stufe mittel (alle Szenarien und Phasen) und die Bank auf allen drei Stufen, der volle Lauf die ganze Matrix.
const { openGame, loadInpage } = require('../lib');

const GFX = ['niedrig', 'mittel', 'hoch'];

// Eine Seite je Stufe, darin Szenario fuer Szenario aufbauen und die Phasen der Reihe nach hashen (der Zustand der Phase davor wird fortgesetzt)
async function matrix(t, gfxList, scList) {
  const out = {};
  for (const gfx of gfxList) {
    const page = await openGame(t.env, { det: true, gfx, still: true });
    try {
      await loadInpage(page, 'bild.js');
      for (const sc of scList) {
        const r = await page.evaluate(sc => {
          PX.scene(sc, 5); const o = {};
          for (const ph of PX.PHASES) { const s = PX.phase(ph); o[ph] = { h: PX.hash(), s }; }
          return o;
        }, sc);
        for (const ph of Object.keys(r)) {
          const s = r[ph].s;
          // Der Zustand, den die Phase haben soll (sonst hashen wir ein leeres Bild): Erkundung ohne Gegner, Ueberfall und Polizei im Ueberfall mit Gegnern
          if (ph === 'erkundung') t.eq([s.phase, s.en], [1, 0], sc + ' Erkundung: Phase 1 ohne Gegner');
          else t.ok(s.phase === 2 && s.en > 0, sc + ' ' + ph + ': Phase 2 mit Gegnern ' + JSON.stringify(s));
          out[sc + '/' + ph + '/' + gfx] = r[ph].h;
        }
      }
      t.ok(!page.errors.length, 'JS-Fehler: ' + page.errors.slice(0, 2).join(' | '));
    } finally { await Promise.race([page.ctx.close().catch(() => {}), new Promise(r => setTimeout(r, 8000))]); }
  }
  return out;
}

const SC = ['bank', 'truck', 'jewel', 'gas', 'museum', 'casino', 'nb', 'prison'];

async function check(t, o) {
  for (const k of Object.keys(o)) await t.snapshot(k, o[k]);
}

module.exports = [
  {
    name: 'Pixel-Hash schnell: Stufe mittel, alle acht Szenarien in Erkundung, Ueberfall und Polizei (24 Bilder)',
    async run(t) { await check(t, await matrix(t, ['mittel'], SC)); },
  },
  {
    name: 'Pixel-Hash schnell: Bank auf allen drei Grafikstufen (niedrig und hoch, 6 Bilder)',
    async run(t) { await check(t, await matrix(t, ['niedrig', 'hoch'], ['bank'])); },
  },
  {
    slow: true,
    name: 'Pixel-Hash voll: alle Szenarien, Phasen und Grafikstufen (72 Bilder), stabil bei Wiederholung',
    async run(t) {
      const a = await matrix(t, GFX, SC);
      await check(t, a);
      const b = await matrix(t, ['mittel'], ['bank', 'casino']);   // zweite frische Seite: gleiche Hashes
      for (const k of Object.keys(b)) t.eq(b[k], a[k], 'Wiederholung in neuer Seite: ' + k);
    },
  },
];
