// Ticket #105: Nach einem Reifentreffer nahe dem Kartenrand rollte der Panzerwagen ueber den Rand hinaus und galt als stehend (Seed 11662, Build 258).
// Die Ausrollstrecke (CFG.truck.tireSlide) endet jetzt spaetestens am Kartenrand, und "durch" (gone) geht vor "steht".
async function setup(t) { await t.loadTool('loopnet.js'); }
const NP = `(rev) => { const D = __dbg; D.setScenario('truck'); D.setSeedMode('random'); D.setLage([]); for (let sd = 3000; ; sd++) { const m = D.genTruckMission(sd); if (!m.panne && !m.vorhut && !!m.rev === rev) return sd; } }`;
// Wagen faehrt mit Reifenschaden knapp vor dem Kartenende in Fahrtrichtung, keine Sperre
const RUN = `(rev, fromEnd) => { const D = __dbg; D.sessReset(); D.setScenario('truck'); D.setSeedMode('random'); D.setLage([]); D.setTurn('S'); D.buildSeed((${NP})(rev)); const g = D.get(), me = g.me, tk = D.tk(), dir = rev ? -1 : 1, W = 60 * 32;
  tk.st = 'drive'; tk.x = rev ? fromEnd : W - fromEnd; tk.v = 150; tk.tire = 0; tk.flat = 1; for (let i = 0; i < 20 * 30 && D.tk().st === 'drive'; i++) { me.hp = 1e9; me.x = 2 * 32; me.y = 8 * 32; D.update(1 / 30); }
  const o = { st: tk.st, x: Math.round(tk.x), front: Math.round(rev ? tk.x - 96 : tk.x + 96), W, ended: !!D.get().ended }; return o; }`;
module.exports = [
  {
    name: 'Reifentreffer am Kartenende: der Wagen rollt nicht ueber den Kartenrand, er steht innerhalb der Karte (Fahrtrichtung Ost und West)',
    async run(t) {
      await setup(t);
      const r = await t.page.evaluate(`(() => ({ ost: (${RUN})(false, 220), west: (${RUN})(true, 220) }))()`);
      t.eq([r.ost.st, r.ost.front <= r.ost.W + 4, r.ost.ended], ['stopped', true, false], 'Ost: steht, Front innerhalb der Karte: ' + JSON.stringify(r.ost));
      t.eq([r.west.st, r.west.front >= -4, r.west.ended], ['stopped', true, false], 'West: steht, Front innerhalb der Karte: ' + JSON.stringify(r.west));
    },
  },
  {
    name: 'Reifentreffer weiter vorn: die Ausrollstrecke bleibt wie vorher (tireSlide, 170 Pixel)',
    async run(t) {
      await setup(t);
      const r = await t.page.evaluate(`(() => { const o = (${RUN})(false, 700); const x0 = 60 * 32 - 700; return { d: o.x - x0, st: o.st }; })()`);
      t.eq(r.st, 'stopped', 'steht'); t.ok(r.d > 100 && r.d <= 190, 'rollt rund tireSlide aus: ' + r.d);
    },
  },
];
