// Ticket #126: Eine ausgeschaltete Wache zeigt oben die Bezeichnung (WACHE, nur bei Wachen mit Route) und den Countdown (Zzz n s). Beide Textkaesten duerfen sich nicht schneiden, bei Host und Client.
async function setup(t) {
  await t.loadTool('loopnet.js');
  await t.loadInpage('coop.js');
  await t.loadInpage('overlap.js');
}
module.exports = [
  {
    name: 'Ausgeschaltete Wache: Bezeichnung und Countdown ueberschneiden sich nicht (Host und Client)',
    async run(t) {
      await setup(t);
      const r = await t.page.evaluate(`(() => { const G = CT.mkGame('bank', 5017, 2), A = G.A, C = G.clients[0], o = {};
        const g = A.get(), n = g.npcs.find(q => q.k === 'grd' && q.st !== 'away'); for (const q of g.npcs) if (q !== n) { q.st = 'away'; q.at = 1e9; }
        n.st = 'idle'; n.still = true; n.alert = 0; n.look = null; n.path = []; for (const c of g.cams) c.off = true;
        n.line = [[n.x - 60, n.y], [n.x + 60, n.y]]; n.rk = 1;
        for (const p of g.players) { p.x = n.x + 50; p.y = n.y; } A.koMi(n).act(g.me); G.run(1);
        for (const [k, d] of [['host', A], ['client', C]]) { const q = d.get().npcs.find(x => x.id === n.id); if (!q.line) q.line = n.line; q.rk = 1; d.get().players.forEach(p => { p.x = q.x + 50; p.y = q.y; }); for (let i = 0; i < 3; i++) d.draw();
          const b = OV.boxes(d).texts, w = b.find(x => x.s === 'WACHE'), z = b.find(x => /^Zzz /.test(x.s)); o[k] = { st: q.st, w: !!w, z: !!z, hit: !!(w && z && w.x0 < z.x1 && w.x1 > z.x0 && w.y0 < z.y1 && w.y1 > z.y0) }; }
        return o; })()`);
      for (const k of ['host', 'client']) { t.eq(r[k].st, 'ko', k + ': Wache liegt bewusstlos'); t.ok(r[k].w && r[k].z, k + ': Bezeichnung und Countdown werden gezeichnet: ' + JSON.stringify(r[k])); t.eq(r[k].hit, false, k + ': Textkaesten schneiden sich nicht'); }
    },
  },
];
