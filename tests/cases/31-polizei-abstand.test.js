// Polizei haelt Abstand (CFG.pol.sep, Tills Beobachtung aus den Coop-Runden: Beamte laufen im Haufen durch Tueren und Luecken).
// Der Test setzt Beamte auf einen Fleck und laesst sie in den Sturm (mode push) laufen: ohne Abstand bleiben sie aufeinander, mit Abstand ziehen sie auseinander und kommen trotzdem voran.
const run = (sepR) => {
  const D = __dbg; D.CFG.pol.sep.r = sepR;
  D.reset(); D.startHeist(false, D.get().me);
  const g = D.get(); g.en.length = 0; g.me.hp = 1e9;
  g.me.x = 3 * 32 + 16; g.me.y = 2 * 32 + 16;   // Spieler weit weg im Gebaeude, die Beamten sehen ihn nicht und laufen nur dem Fluss nach
  const x0 = 20 * 32 + 16, y0 = 14 * 32 + 16, cops = [];
  for (let i = 0; i < 8; i++) { const c = D.mkCop(x0 + (i % 3) * 2, y0 + Math.floor(i / 3) * 2, i === 7 ? 'shield' : false); c.mode = 'push'; cops.push(c); g.en.push(c); }
  const pairs = () => { let n = 0, tot = 0; for (let a = 0; a < cops.length; a++) for (let b = a + 1; b < cops.length; b++) { tot++; if (Math.hypot(cops[a].x - cops[b].x, cops[a].y - cops[b].y) < 14) n++; } return n / tot; };
  const start = cops.map(c => [c.x, c.y]);
  let worst = 0;
  for (let i = 0; i < 90; i++) { g.me.hp = 1e9; g.me.x = 3 * 32 + 16; g.me.y = 2 * 32 + 16; D.update(1 / 30); if (i > 20) worst += pairs(); }
  const moved = cops.reduce((s, c, i) => s + Math.hypot(c.x - start[i][0], c.y - start[i][1]), 0) / cops.length;
  return { stacked: +(worst / 69).toFixed(3), moved: Math.round(moved), alive: cops.filter(c => c.hp > 0).length };
};

module.exports = [
  {
    name: 'Polizei: Beamte halten Abstand (ohne Abstand im Haufen, mit Abstand verteilt und trotzdem unterwegs)',
    async run(t) {
      const r = await t.page.evaluate(`(() => ({ off: (${run.toString()})(0), on: (${run.toString()})(36) }))()`);
      t.ok(r.off.stacked > .4, 'ohne Abstand sind die Beamten aufeinander (Vergleichswert): ' + JSON.stringify(r.off));
      t.ok(r.on.stacked < .12, 'mit Abstand liegen kaum noch zwei Beamte aufeinander: ' + JSON.stringify(r.on));
      t.ok(r.on.moved > 50, 'mit Abstand kommen sie trotzdem voran (kein Stau): ' + JSON.stringify(r.on));
      t.note('aufeinander ohne ' + r.off.stacked + ', mit ' + r.on.stacked + '; Weg ohne ' + r.off.moved + ' px, mit ' + r.on.moved + ' px');
    },
  },
];
