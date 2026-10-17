// Lage-Tags: Tag wird nur auf passenden Karten gesetzt, Wirkung stimmt mit CFG.lage ueberein, Karten mit Tag bleiben vollstaendig.
const NAMES = { b: 'bank', j: 'jewel', t: 'truck', g: 'gas', m: 'museum', c: 'casino' };

module.exports = [
  {
    name: 'Lage: Tag gilt nur auf passenden Karten',
    async run(t) {
      const bad = await t.page.evaluate(NAMES => {
        const bad = [];
        for (const tag of Object.keys(__dbg.LAGE)) for (const [l, sc] of Object.entries(NAMES)) {
          __dbg.setScenario(sc); __dbg.setSeedMode('random'); __dbg.setLage([tag]); __dbg.buildLay(__dbg.layoutFor(77));
          const has = __dbg.LAY().mission.lg.includes(tag), want = __dbg.LAGE[tag].sc.includes(l);
          if (has !== want) bad.push(tag + '@' + sc + ' hat=' + has + ' soll=' + want);
        }
        __dbg.setLage(null);
        return bad;
      }, NAMES);
      t.eq(bad, [], 'Tag auf falscher Karte');
    },
  },
  {
    name: 'Lage: Zahltag, Flaute, Sicherheitsdienst wirken wie in CFG.lage',
    async run(t) {
      const r = await t.page.evaluate(() => {
        const out = {};
        const base = (sc, lg) => {
          __dbg.setScenario(sc); __dbg.setSeedMode('random'); __dbg.setLage(lg); __dbg.buildLay(__dbg.layoutFor(31));
          __dbg.startHeist(false);
          const g = __dbg.get();
          return { pol: g.policeAt, loot: __dbg.lgM('loot'), gap: __dbg.lgM('gap'), shield: __dbg.lgA('shield'), lg: __dbg.LAY().mission.lg.join(',') };
        };
        out.none = base('bank', []);
        out.zahltag = base('bank', ['zahltag']);
        out.flaute = base('bank', ['flaute']);
        out.sicher = base('bank', ['sicher']);
        out.cfg = JSON.parse(JSON.stringify({ z: __dbg.CFG.lage.zahltag, f: __dbg.CFG.lage.flaute, s: __dbg.CFG.lage.sicher }));
        __dbg.setLage(null);
        return out;
      });
      t.eq(r.none.lg, '', 'ohne Tag');
      t.eq(r.zahltag.lg, 'zahltag');
      t.ok(Math.abs((r.zahltag.pol - r.none.pol) - r.cfg.z.pol) < 0.01, 'Zahltag: policeAt ' + r.zahltag.pol + ' statt ' + (r.none.pol + r.cfg.z.pol));
      t.ok(Math.abs(r.zahltag.loot - r.cfg.z.loot) < 1e-9, 'Zahltag: Beute-Faktor');
      t.ok(Math.abs(r.flaute.loot - r.cfg.f.loot) < 1e-9, 'Flaute: Beute-Faktor');
      t.ok(Math.abs(r.flaute.gap - r.cfg.f.gap) < 1e-9, 'Flaute: Wellenabstand');
      t.ok(Math.abs(r.sicher.loot - r.cfg.s.loot) < 1e-9, 'Sicherheitsdienst: Beute-Faktor');
      t.eq(r.sicher.shield, r.cfg.s.shield, 'Sicherheitsdienst: Schilde frueher');
      t.eq(r.none.loot, 1, 'ohne Tag Faktor 1');
    },
  },
  {
    name: 'Lage: Karten mit erzwungenem Tag sind vollstaendig (mapcheck)',
    async run(t) {
      await t.loadTool('mapcheck.js');
      const r = await t.page.evaluate(NAMES => {
        const bad = [];
        for (const tag of Object.keys(__dbg.LAGE)) for (const [l, sc] of Object.entries(NAMES)) {
          if (sc === 'truck' || !__dbg.LAGE[tag].sc.includes(l)) continue;
          for (let i = 0; i < 12; i++) {
            const rep = mapcheck.check(sc, 500 + i * 29, [tag]);
            for (const e of rep.err) if (!/^Wagenplatz blockiert/.test(e)) bad.push(tag + '@' + sc + '#' + (500 + i * 29) + ': ' + e);
          }
        }
        __dbg.setLage(null);
        return bad;
      }, NAMES);
      t.eq(r.slice(0, 5), [], 'Karten mit Tag unvollstaendig (' + r.length + ' Meldungen)');
    },
  },
];
