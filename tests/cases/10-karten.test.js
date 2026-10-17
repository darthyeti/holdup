// Kartenpruefung: tools/mapcheck.js ueber viele Seeds je Szenario, dazu Determinismus und ein Schnappschuss der Kartenerzeugung.
// Der Schnappschuss meldet jede Aenderung am Generator (Host und Clients muessen dieselbe Karte bauen). Gewollte Aenderung: npm run test:update.
const SC = ['bank', 'jewel', 'gas', 'museum', 'casino'];
const N = { bank: 80, jewel: 80, gas: 80, museum: 60, casino: 50 };
// Bekannte, harmlose Meldungen je Szenario (Regex auf die zusammengefasste Meldung)
const KNOWN = { bank: [/^Wagenplatz blockiert/] };

const tests = SC.map(sc => ({
  name: 'Karten: ' + sc + ' (' + N[sc] + ' Seeds erreichbar und vollstaendig)',
  async run(t) {
    await t.loadTool('mapcheck.js');
    const r = await t.page.evaluate(([sc, n]) => mapcheck.sweep(sc, n, 1), [sc, N[sc]]);
    const bad = Object.entries(r.errs).filter(([k]) => !(KNOWN[sc] || []).some(re => re.test(k)));
    t.ok(!bad.length, bad.map(([k, seeds]) => k + ' (Seeds ' + seeds.slice(0, 5).join(',') + (seeds.length > 5 ? ',...' : '') + ')').join('; '));
    const known = Object.entries(r.errs).filter(([k]) => (KNOWN[sc] || []).some(re => re.test(k)));
    if (known.length) t.note('bekannt: ' + known.map(([k, s]) => k + ' x' + s.length).join('; '));
  },
}));

tests.push({
  name: 'Karten: gleiche Seeds geben gleiche Karten (Determinismus)',
  async run(t) {
    const r = await t.page.evaluate(SC => {
      const sig = (sc, seed) => { __dbg.setScenario(sc); __dbg.setSeedMode('random'); __dbg.setLage(null); return JSON.stringify(__dbg.layoutFor(seed)); };
      const bad = [];
      for (const sc of SC) for (let i = 0; i < 25; i++) { const s = 100 + i * 41; if (sig(sc, s) !== sig(sc, s)) bad.push(sc + ':' + s); }
      return bad;
    }, SC);
    t.eq(r, [], 'Karten nicht deterministisch');
  },
});

tests.push({
  name: 'Karten: Schnappschuss der Kartenerzeugung (Hash je Szenario)',
  async run(t) {
    const hashes = await t.page.evaluate(SC => {
      const h = s => { let x = 2166136261; for (let i = 0; i < s.length; i++) { x ^= s.charCodeAt(i); x = Math.imul(x, 16777619); } return (x >>> 0).toString(16); };
      const out = {};
      for (const sc of SC.concat('truck')) {
        __dbg.setScenario(sc); __dbg.setSeedMode('random'); __dbg.setLage(null);
        let acc = '';
        for (let i = 0; i < 120; i++) acc += JSON.stringify(__dbg.layoutFor(1 + i * 13));
        out[sc] = h(acc);
      }
      return out;
    }, SC);
    await t.snapshot('layout-hash', hashes);
  },
});

module.exports = tests;
