// Bot-Rauchtest: Der Balance-Bot (tools/bot.js) spielt je Szenario ein paar fruehe Abgaenge. Das ist kein Balance-Test,
// sondern eine Probe, dass ein ganzer Auftrag von Phase 1 bis zum Ende durchlaeuft (Beute, Polizei, Wagen, Ergebnis) und der Sieg erreichbar bleibt.
// Richtwerte aus docs/tests-und-messwerte.md: frueh rufen (call:0) gewinnt auf Bank, Tankstelle, Museum (2 Stuecke) und Casino (nur Tresor) fast immer.
// van 'alt': der Bot hat keine Taktik fuer Polizei am Fluchtwagen, die Rauchtests messen die Karten mit dem alten Verhalten (sofort an Bord, Fahrer wartet immer); die neuen Regeln testet 32-fluchtwagen
const BASE = { sigma: .05, react: .35, kit: 'old', call: 0, van: 'alt' };

const cases = [
  { name: 'Bank klassisch', sc: 'bank', n: 12, min: .75, opt: { wait: [15, 4] }, classic: true },
  { name: 'Bank Zufallskarten', sc: 'bank', n: 12, min: .7, opt: {}, from: 5000 },
  { name: 'Juwelier', sc: 'jewel', n: 10, min: .5, opt: {}, from: 5000 },
  { name: 'Tankstelle (nur Tresor)', sc: 'gas', n: 10, min: .7, opt: {}, from: 5000 },
  { name: 'Museum (zwei Kassetten)', sc: 'museum', n: 10, min: .7, opt: { goods: true, goodsN: 2 }, from: 5000 },
  { name: 'Casino (nur Tresor)', sc: 'casino', n: 10, min: .7, opt: {}, from: 5000 },
];

module.exports = cases.map(c => ({
  name: 'Bot: ' + c.name + ' gewinnt mit frueh rufen mindestens ' + Math.round(c.min * 100) + ' %',
  timeout: 240000,
  async run(t) {
    await t.loadTool('bot.js');
    const r = await t.page.evaluate(([c, base]) => {
      __dbg.setScenario(c.sc); __dbg.setSeedMode(c.classic ? 'classic' : 'random');
      const o = Object.assign({}, base, c.opt);
      return c.classic ? bot.batch(c.n, o) : bot.batchSeeds(c.n, o, c.from);
    }, [c, BASE]);
    t.note('Siege ' + Math.round(r.winRate * 100) + ' % (n=' + r.n + '), Beute ' + r.avgLoot + ', Zeit ' + r.avgT + ' s, Rest-HP ' + r.avgMinHp + (r.lost ? ', verloren: ' + r.lost : ''));
    t.ok(r.winRate >= c.min, 'Siegquote ' + Math.round(r.winRate * 100) + ' % liegt unter ' + Math.round(c.min * 100) + ' %');
    t.ok(r.avgLoot > 0, 'Bot hat keine Beute gesichert');
  },
}));
