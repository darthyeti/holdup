// Treffpunkt-Messung (MRU 1 D0, docs/major-release-update-1.md, Fluchtwagen: Treffpunkt abseits): tools/treffpunkt.js misst, wie viel Platz jede Karte fuer einen zweiten oder entfernten Treffpunkt des Fluchtwagens hat.
// Der Test haelt die Messregeln und die Zahlen fest: Aendert sich ein Hof, die Lage des Fluchtwagens oder ein Generator so, dass die Tabelle in der Doku nicht mehr stimmt, scheitert der Schnappschuss (dann Doku nachziehen, mit --update erneuern).
const SC = ['bank', 'jewel', 'gas', 'museum', 'casino'];
const SIDES = ['S', 'N', 'E', 'W', 'S+', 'N+', 'E+', 'W+'];

module.exports = [
  {
    name: 'Treffpunkt-Messung: die Regeln sind stimmig (heutiger Treffpunkt ist selbst ein Kandidat, Weg Tresor zu Wagen gleich validateMap) und die Tabelle je Karte ist festgehalten',
    async run(t) {
      await t.loadTool('treffpunkt.js');
      await t.page.evaluate(() => { __dbg.CFG.meet.p = 0; });   // gemessen wird der Treffpunkt an der Fluchttuer (D0), den Treffpunkt abseits prueft 109
      const sum = {};
      for (const sc of SC) {
        const r = await t.page.evaluate(sc => treffpunkt.table(sc, 40, 1), sc);
        for (const [k, v] of Object.entries(r.rows)) {
          t.eq(v.curOk, 100, sc + ' ' + k + ': der heutige Treffpunkt besteht die eigenen Regeln nicht (Prozent der Karten)');
          t.eq(v.pveGleich, 100, sc + ' ' + k + ': Weg Tresor zu Wagen weicht von validateMap ab (Prozent der Karten)');
          t.ok(v.n >= 4 || k === 'Klassik', sc + ' ' + k + ': zu wenige Karten (' + v.n + ')');   // die Bank-Klassik ist eine einzige Karte
        }
        sum[sc] = r.rows;
      }
      await t.snapshot('tabelle', sum);
    },
  },
  {
    name: 'Treffpunkt-Messung: Drehen und Spiegeln aendert die Zahlen nicht (Hoefe, Welt, Zahl der Plaetze bis auf einen, Wege bis auf zwei Schritte), der heutige Treffpunkt besteht in allen 8 Lagen',
    async run(t) {
      await t.loadTool('treffpunkt.js');
      await t.page.evaluate(() => { __dbg.CFG.meet.p = 0; });
      const bad = [];
      for (const sc of SC) {
        const r = await t.page.evaluate(([sc, S]) => treffpunkt.run(sc, [3, 40, 77, 114, 151, 188], S), [sc, SIDES]);
        const bySeed = {};
        for (const m of r) (bySeed[m.seed] = bySeed[m.seed] || []).push(m);
        for (const [seed, a] of Object.entries(bySeed)) {
          const ref = a.find(m => m.lage === 'S');
          for (const m of a) {
            const tag = sc + '#' + seed + ' ' + m.lage;
            if (!m.curOk) bad.push(tag + ' heutiger Treffpunkt kein Kandidat');
            if (m.courtExit !== ref.courtExit || m.courtOther !== ref.courtOther || m.axis !== ref.axis || m.quer !== ref.quer) bad.push(tag + ' Hof oder Welt anders');
            for (const c of ['A', 'B', 'R', 'V']) {
              if (Math.abs(m.cls[c].n - ref.cls[c].n) > 1) bad.push(tag + ' Klasse ' + c + ' Plaetze ' + m.cls[c].n + ' statt ' + ref.cls[c].n);
              if (Math.abs(m.cls[c].max - ref.cls[c].max) > 2) bad.push(tag + ' Klasse ' + c + ' weitester Weg ' + m.cls[c].max + ' statt ' + ref.cls[c].max);
            }
            if (m.pveNow !== m.pveVal) bad.push(tag + ' Weg Tresor zu Wagen ' + m.pveNow + ' statt ' + m.pveVal);
          }
        }
      }
      t.eq(bad.slice(0, 6), [], 'Abweichungen (' + bad.length + ')');
    },
  },
];
