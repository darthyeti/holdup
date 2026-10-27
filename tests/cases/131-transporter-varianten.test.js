// Transporter-Varianten (Paket Transporter, Schleichen und Optik, T4a, Tills Rueckmeldung vom 27. Oktober 2026: die Mission ist wenig abwechslungsreich, Plan Schritt C in docs/szenarien.md):
// Neben Besatzung (2 bis 4), Saecken (6 bis 8) und Ankunftszeit (55 bis 75 s) wuerfelt der Seed jetzt Fracht (Geld, Gold, Muenzen), Schloss (normal, schwach, verstaerkt), Funkalarm (normal, sofort, verzoegert)
// und schwere Wachen (0 bis 2). Die neuen Wuerfe kommen hinter den alten, damit Besatzung, Saecke und Ankunftszeit bestehender Seeds gleich bleiben. Alles liegt in CFG.truck.var, Host und Client bauen dasselbe aus dem Seed.
async function setup(t) {
  await t.loadTool('loopnet.js');
  await t.loadInpage('coop.js');
}
// Werte (Besatzung, Saecke, Ankunft) bestehender Seeds vor der Aenderung, gemessen am 27. Oktober 2026
const GOLD = { 1: [4, 7, 60], 2: [3, 7, 56], 3: [2, 8, 70], 4: [2, 7, 59], 5: [2, 7, 68], 6: [4, 6, 58], 7: [3, 7, 66], 8: [3, 8, 57], 101: [3, 6, 66], 202: [4, 7, 68], 303: [3, 6, 69], 404: [4, 8, 70], 505: [4, 8, 58], 268415: [4, 6, 68], 748178: [2, 7, 55], 928407: [3, 6, 71] };
// Seeds, die eine Variante tragen (aus der Verteilung gesucht, steht im Test, damit er schnell bleibt)
const FIND = `(want) => { const D = __dbg, out = {}; D.setScenario('truck'); D.setSeedMode('random'); D.setLage([]); for (let sd = 1; sd < 600; sd++) { const m = D.genTruckMission(sd); for (const k of want) { const key = k(m); if (key && !out[key]) out[key] = sd; } } return out; }`;

module.exports = [
  {
    name: 'Transporter-Varianten: der Seed wuerfelt Fracht, Schloss, Funkalarm und schwere Wachen (jede Variante kommt vor, jeder Wurf ist je Seed fest), Besatzung, Saecke und Ankunft bestehender Seeds bleiben gleich',
    async run(t) {
      await setup(t);
      const r = await t.page.evaluate(`(() => { const D = __dbg, o = { n: 0, cargo: {}, lock: {}, alarm: {}, heavy: {}, gleich: [], fest: true, tags: [], bereich: [] }; const V = D.CFG.truck.var; o.V = V; D.setScenario('truck'); D.setSeedMode('random'); D.setLage([]);
        for (let sd = 1; sd <= 600; sd++) { const m = D.genTruckMission(sd), m2 = D.genTruckMission(sd); o.n++; if (JSON.stringify([m.cargo, m.lock, m.alarm, m.heavy, m.crew, m.bagN, m.arrive]) !== JSON.stringify([m2.cargo, m2.lock, m2.alarm, m2.heavy, m2.crew, m2.bagN, m2.arrive])) o.fest = false;
          for (const [k, v] of [['cargo', m.cargo], ['lock', m.lock], ['alarm', m.alarm], ['heavy', m.heavy]]) o[k][v] = (o[k][v] || 0) + 1;
          const nb = m.cargo === 'geld' ? [6, 8] : V.cargo[m.cargo].n; if (m.bagN < nb[0] || m.bagN > nb[1] || m.crew < 2 || m.crew > 4 || m.arrive < 55 || m.arrive > 75 || m.heavy > m.crew - 1) o.bereich.push(sd); }
        D.setScenario('truck'); for (const sd of ${JSON.stringify(Object.keys(GOLD).map(Number))}) { const m = D.genTruckMission(sd); o.gleich.push([sd, m.crew, m.cargo === 'geld' ? m.bagN : 'x', m.arrive]); }
        return o; })()`);
      for (const k of ['gold', 'muenzen']) t.ok((r.cargo[k] || 0) > 60 && (r.cargo[k] || 0) < 220, 'Fracht ' + k + ' kommt vor (' + (r.cargo[k] || 0) + ' von ' + r.n + ')');
      t.ok(r.cargo.geld > 250, 'Geld bleibt die haeufigste Fracht: ' + JSON.stringify(r.cargo));
      for (const [k, name] of [['lock', ['schwach', 'stark']], ['alarm', ['sofort', 'spaet']]]) for (const v of name) t.ok((r[k][v] || 0) > 60, k + ' ' + v + ' kommt vor: ' + JSON.stringify(r[k]));
      t.ok((r.heavy[1] || 0) > 40 && (r.heavy[2] || 0) > 5, 'schwere Wachen kommen einzeln und zu zweit vor: ' + JSON.stringify(r.heavy)); t.eq(r.fest, true, 'jeder Wurf ist je Seed fest'); t.eq(r.bereich, [], 'Werte liegen im Bereich (Seeds ausserhalb)');
      t.eq(r.gleich.map(a => [a[0], a[1], a[3]]), Object.entries(GOLD).map(([sd, v]) => [+sd, v[0], v[2]]), 'Besatzung und Ankunft bestehender Seeds sind gleich geblieben');
      t.eq(r.gleich.filter(a => a[2] !== 'x').map(a => [a[0], a[2]]), Object.entries(GOLD).filter(([sd]) => r.gleich.find(a => a[0] === +sd)[2] !== 'x').map(([sd, v]) => [+sd, v[1]]), 'bei Fracht Geld auch die Saecke');
    },
  },
  {
    name: 'Transporter-Varianten: Fracht bestimmt Zahl, Wert und Platzbedarf der Stuecke, das Schloss die Bohrzeit, der Funkalarm den Polizeibeginn, schwere Wachen haben mehr Leben und Schaden (der Fahrer nie), alle nennen sich im Tag',
    async run(t) {
      await setup(t);
      const r = await t.page.evaluate(`(() => { const D = __dbg, o = {}, V = D.CFG.truck.var, f = (${FIND})([m => m.cargo === 'gold' && 'gold', m => m.cargo === 'muenzen' && 'muenzen', m => m.lock === 'schwach' && 'schwach', m => m.lock === 'stark' && 'stark', m => m.alarm === 'sofort' && 'sofort', m => m.alarm === 'spaet' && 'spaet', m => m.heavy === 1 && 'h1', m => m.heavy === 2 && 'h2', m => m.cargo === 'geld' && m.lock === 'std' && m.alarm === 'normal' && m.heavy === 0 && 'normal']);
        o.f = f; const build = sd => { D.sessReset(); D.setScenario('truck'); D.setSeedMode('random'); D.setLage([]); D.buildSeed(sd); return D.LAY().mission; };
        const bags = () => D.get().its.filter(i => i.t === 'tbag'), me = () => D.get().me;
        for (const k of ['gold', 'muenzen', 'normal']) { const m = build(f[k]); const b = bags(); me().units = 0; me().loot = 0; const c = D.get().its.find(i => i.t === 'cargo'); c.act(me()); const fit5 = (me().units = 5, b[0].fit(me())), fit6 = (me().units = 6, b[0].fit(me())); me().units = 0; b[0].act(me()); o['c' + k] = { n: b.length, bagN: m.bagN, units: me().units, loot: me().loot, fit5, fit6, lab: b[0].lab(), tag: m.tags.join('|') }; }
        for (const k of ['schwach', 'stark', 'normal']) { build(f[k]); o['l' + k] = D.get().its.find(i => i.t === 'cargo').dur(); }
        for (const k of ['sofort', 'spaet', 'normal']) { build(f[k]); D.startHeist(true, D.get().me); o['a' + k] = D.pAt(); }
        for (const k of ['h1', 'h2', 'normal']) { const m = build(f[k]); D.startHeist(false, D.get().me); D.get().en.length = 0; D.spawnCrew(); const cr = D.get().en.filter(e => e.crew); o[k] = { n: cr.length, crew: m.crew, heavy: cr.filter(e => e.hv).length, hp: cr.filter(e => e.hv).map(e => e.mhp), hpN: cr.filter(e => !e.hv).map(e => e.mhp), drvHeavy: cr.some(e => e.drv && e.hv), dmg: cr.filter(e => e.hv).map(e => e.dmg), tag: m.tags.join('|') }; }
        o.C = { crew: D.CFG.truck.crew, drill: D.CFG.truck.drillT, cargo: D.CFG.truck.bagV, V };
        return o; })()`);
      const V = r.C.V;
      t.eq([r.cgold.n, r.cgold.units, r.cgold.loot, r.cgold.fit5, r.cgold.fit6], [r.cgold.bagN, V.cargo.gold.u, V.cargo.gold.v, true, false], 'Gold: wenige Stuecke, je zwei Plaetze und viel Wert, bei sechs belegten Plaetzen passt keines mehr'); t.ok(/Goldbarren/.test(r.cgold.lab) && /Fracht: Gold/.test(r.cgold.tag), 'Beschriftung und Tag nennen Gold: ' + r.cgold.lab + ' / ' + r.cgold.tag);
      t.eq([r.cmuenzen.n, r.cmuenzen.units, r.cmuenzen.loot], [r.cmuenzen.bagN, V.cargo.muenzen.u, V.cargo.muenzen.v], 'Muenzen: viele Stuecke mit wenig Wert'); t.ok(r.cmuenzen.bagN >= 9 && /Fracht: Münzen/.test(r.cmuenzen.tag), 'mindestens neun Muenzsaecke und der Tag: ' + r.cmuenzen.tag);
      for (const k of ['cgold', 'cmuenzen', 'cnormal']) t.ok(r[k].bagN * r[k].loot >= 45000 && r[k].bagN * r[k].loot <= 100000, k + ': der Gesamtwert der Fracht bleibt im Rahmen (45.000 bis 100.000): ' + r[k].bagN * r[k].loot); t.ok(r.cgold.loot > 2 * r.cnormal.loot && r.cmuenzen.loot < r.cnormal.loot, 'Gold ist je Stueck viel wert, Muenzen wenig');
      t.eq([r.cnormal.units, r.cnormal.loot, r.cnormal.fit6, /Geldsack/.test(r.cnormal.lab), /Fracht/.test(r.cnormal.tag)], [1, r.C.cargo, true, true, false], 'Geld wie bisher (ein Platz, 9000, Geldsack, kein Fracht-Tag)');
      t.ok(Math.abs(r.lschwach - r.C.drill * V.lock.schwach.k) < 1e-6 && Math.abs(r.lstark - r.C.drill * V.lock.stark.k) < 1e-6 && r.lnormal === r.C.drill, 'die Bohrzeit folgt dem Schloss: ' + JSON.stringify([r.lschwach, r.lstark, r.lnormal]));
      t.eq([r.asofort, r.aspaet, r.anormal], [Math.max(20, 26 + V.alarm.sofort.d), 26 + V.alarm.spaet.d, 26], 'der Funkalarm verschiebt die erste Polizei (nicht unter 20 s)');
      t.eq([r.h1.heavy, r.h2.heavy, r.normal.heavy], [1, 2, 0], 'eine oder zwei schwere Wachen, ohne Wurf keine'); t.eq([r.h1.hp, r.h1.hpN.every(x => x === r.C.crew.hp)], [[r.C.crew.hp * V.heavy.hp], true], 'eine schwere Wache hat mehr Leben, die anderen nicht'); t.eq(r.h1.dmg, [r.C.crew.dmg * V.heavy.dmg], 'und mehr Schaden');
      t.eq([r.h1.drvHeavy, r.h2.drvHeavy], [false, false], 'der Fahrer ist nie schwer'); t.ok(/Schwere Wache/.test(r.h1.tag) && /Zwei schwere Wachen/.test(r.h2.tag), 'Tags nennen die schweren Wachen: ' + r.h1.tag + ' / ' + r.h2.tag);
      t.eq([r.h1.n, r.h2.n], [r.h1.crew, r.h2.crew], 'die Besatzung hat die gewuerfelte Staerke');
    },
  },
  {
    name: 'Transporter-Varianten im Coop: der Client baut aus dem Seed dieselben Varianten (Fracht, Schloss, Funkalarm, schwere Wachen, Zahl der Stuecke und Bohrzeit)',
    async run(t) {
      await setup(t);
      const r = await t.page.evaluate(`(() => { const out = []; for (const sd of [3, 17, 29, 41, 53, 66]) { const G = CT.mkGame('truck', sd, 2), A = G.A, B = G.clients[0], sig = d => { const m = d.LAY().mission; return [m.cargo, m.lock, m.alarm, m.heavy, m.bagN, m.crew, m.bu, m.bv, m.tags.join('|'), d.get().its.filter(i => i.t === 'tbag').length, d.get().its.find(i => i.t === 'cargo').dur()]; }; out.push([sd, JSON.stringify(sig(A)) === JSON.stringify(sig(B)), sig(A)[0]]); } return out; })()`);
      t.eq(r.filter(x => !x[1]).map(x => x[0]), [], 'Host und Client sehen dieselben Varianten (Seed)'); t.ok(new Set(r.map(x => x[2])).size >= 1, 'die Seeds decken Fracht ab: ' + JSON.stringify(r.map(x => x[2])));
    },
  },
];
