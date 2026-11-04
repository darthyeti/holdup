// Notenbank N4 (Ticket 69, Tills test-70: "der Tresor sollte viel mehr Geldbuendel enthalten, abhaengig von der Spielerzahl, der Gesamtwert muss nicht hoeher sein, aber man muss mehr Zeit verbrauchen"): Im Notenbank-Tresor liegen CFG.nb.vaultN Buendel je Spieler (bei Rundenstart), der Gesamtwert bleibt gleich (Wert je Buendel = Gesamtwert / Zahl), der Platzbedarf je Buendel schrumpft mit, sodass eine volle Tasche denselben Wert traegt, die Aufnahmezeit je Buendel bleibt (mehr Buendel kosten mehr Zeit). Nur LAY.nb.
const SOLO = `(() => {
  const D = __dbg, T = 32; D.sessReset(); D.setScenario('nb'); D.setSeedMode('random'); D.setLage([]); D.buildSeed(5); D.CFG.policeAt = 1e6; D.CFG.policeForced = 1e6; D.CFG.nb.alarmAt = 1e6; D.reset();
  return { D, T, me: D.get().me };
})()`;
const MEASURE = `(D, me) => {
  const b = D.get().its.filter(i => i.t === 'bundle'), o = { n: b.length }; me.bag = 1e9; me.loot = 0; me.units = 0; D.setVaultOpen && D.setVaultOpen(true);
  o.dur = Math.round(b.reduce((a, i) => a + i.dur(), 0) * 1000) / 1000; for (const i of b) i.act(me); o.value = me.loot; o.units = Math.round(me.units * 1000) / 1000; o.per = [Math.round(me.loot / b.length * 100) / 100, Math.round(me.units / b.length * 1000) / 1000];
  me.loot = 0; me.units = 0; me.bag = D.CFG.bag; for (const i of b) i.done = false; let k = 0; for (const i of b) { if (!i.fit(me)) break; i.act(me); k++; } o.bagValue = me.loot; o.bagCount = k; o.pos = new Set(b.map(i => i.x + ',' + i.y)).size; return o; }`;

module.exports = [
  {
    name: 'Tresor: vaultN Buendel je Spieler (1 Spieler, 4 Spieler), gleicher Gesamtwert, gleicher Wert einer vollen Tasche, Aufnahmezeit je Buendel gleich (Gesamtzeit waechst mit der Zahl), alle Buendel auf eigenen Kacheln im Tresorraum',
    timeout: 180000,
    async run(t) {
      await t.loadTool('loopnet.js'); await t.loadInpage('coop.js');
      const r = await t.page.evaluate(`(() => {
        const o = {}, M = ${MEASURE}; { const H = ${SOLO}; o.one = M(H.D, H.me); o.vaultN = H.D.CFG.nb.vaultN; o.rect = H.D.LAY().nb.vspots.length; }
        const G = CT.mkGame('nb', 5, 4, 60, 20), A = G.A, B = G.clients[0]; o.four = M(A, A.get().me); o.fourClient = B.get().its.filter(i => i.t === 'bundle').length;
        const R = A.LAY().vault, rs = A.get().its.filter(i => i.t === 'bundle'); o.inVault = rs.every(i => i.x >= 1 * 32 && i.x < 10 * 32 && i.y >= 7 * 32 && i.y < 15 * 32); o.oldList = R.bundles.length;
        const bank = (() => { const H = ${SOLO}; H.D.setScenario('bank'); H.D.buildSeed(5); H.D.reset(); return H.D.get().its.filter(i => i.t === 'bundle').length; })(); o.bank = bank; return o; })()`);
      t.eq([r.one.n, r.four.n, r.fourClient], [r.vaultN, r.vaultN * 4, r.vaultN * 4], 'Zahl der Buendel: vaultN je Spieler, Client gleich: ' + JSON.stringify([r.one.n, r.four.n, r.fourClient, r.vaultN]));
      t.ok(Math.abs(r.one.value - r.four.value) <= r.four.n && r.one.value > 50000, 'Gesamtwert gleich: ' + JSON.stringify([r.one.value, r.four.value]));
      t.ok(Math.abs(r.one.units - r.four.units) < .01, 'Gesamtplatzbedarf gleich (Platz je Buendel schrumpft): ' + JSON.stringify([r.one.units, r.four.units]));
      t.ok(Math.abs(r.one.bagValue - r.four.bagValue) <= r.one.per[0] + 1, 'eine volle Tasche traegt denselben Wert: ' + JSON.stringify([r.one.bagValue, r.four.bagValue, r.one.bagCount, r.four.bagCount]));
      t.ok(Math.abs(r.four.dur / r.one.dur - 4) < .01, 'Aufnahmezeit je Buendel gleich, Gesamtzeit viermal laenger: ' + JSON.stringify([r.one.dur, r.four.dur]));
      t.ok(r.one.pos === r.one.n && r.four.pos === r.four.n && r.inVault, 'jedes Buendel auf eigener Kachel im Tresorraum: ' + JSON.stringify([r.one.pos, r.four.pos, r.inVault]));
      t.ok(r.bank >= 1 && r.bank <= 8, 'andere Szenarien unveraendert (Bank: ' + r.bank + ' Buendel)');
    },
  },
];
