// Casino, Selbsttest vor dem Umbau (Sprint 9 des Plans Mehr Abwechslung, docs/archiv-gebaute-plaene.md): Raster und alle LAY-Felder der vier Hallen (Hash ueber 200 Seeds je Halle) und die Pixel beider
// Ebenen (zwei Seeds je Halle) werden eingefroren, solange das Casino noch von Hand gebaut ist (aufgenommen am 25. Oktober 2026 auf dem Stand vor Sprint 9). Mit dem Generator (CFG.casinoGen) muss die
// Klassik-Huelle mit jeder Halle Zeichen fuer Zeichen diese Karte ergeben: Der Test schaltet den Generator ab, sobald es ihn gibt (CFG.casinoGen.on 0), Vorbild ist 39-juwelier-basis.
// Der Hash-Teil (Raster und Felder) ist auf jeder Maschine gleich und eingecheckt, die Pixel haengen an der Maschine (Schrift, Gradienten) und liegen nur lokal (golden-local, wird beim ersten Lauf angelegt).
// Wer die Pixel als Beweis braucht, nimmt sie vor dem Umbau auf (ein Lauf dieses Tests auf dem alten Stand) und vergleicht danach auf derselben Maschine.
const HALLS = ['Klassik', 'Promenade', 'Reihen', 'Staffel'];

module.exports = [
  {
    name: 'Casino: Raster und Felder jeder Hand-Halle (200 Seeds je Halle, Hash) und Pixel der beiden Ebenen (lokal) sind gleich dem Stand vor dem Umbau (Schnappschuss)',
    timeout: 120000,
    async run(t) {
      await t.loadInpage('turn.js');
      const r = await t.page.evaluate(() => {
        const D = __dbg, out = { hash: {}, px: {}, n: {} }, acc = {}, first = {};
        D.setScenario('casino'); D.setSeedMode('random'); D.setLage([]); D.setTurn('S'); if (D.CFG.casinoGen) D.CFG.casinoGen.on = 0;
        for (let s = 1; s <= 200; s++) {
          const lay = D.layoutBase(s), h = lay.hall; acc[h] = (acc[h] || '') + TN.layHash(D, lay) + ','; out.n[h] = (out.n[h] || 0) + 1;
          (first[h] = first[h] || []).length < 2 && first[h].push(s);
        }
        for (const h of Object.keys(acc)) out.hash[h] = TN.fnv(acc[h]);
        for (const h of Object.keys(first)) for (const s of first[h]) { D.buildLay(D.layoutBase(s)); const w = D.world(); out.px[h + '#' + s] = TN.hashCanvas(w.st) + ' ' + TN.hashCanvas(w.so); }
        return out;
      });
      t.ok(HALLS.every(h => r.n[h] > 20), 'alle vier Hallen kommen vor: ' + JSON.stringify(r.n));
      await t.snapshot('casino-basis', { hash: r.hash, n: r.n });
      await t.snapshot('casino-basis-px', r.px, { local: true });
    },
  },
];
