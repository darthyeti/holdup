// Paket P2 (docs/bugfix-plaene.md, B2 vom 24. Oktober 2026): Material (Brettersatz im Kit, in Phase 1 zerlegte Moebel) ist keine Beute. Es zaehlt mit 'units' im Rucksack, aber nur
// 'loot' (der Wert der Beute) darf die Ausgangsregel der Phase 1 ausloesen (secure) und den Verdacht der Beobachter (carry). Sonst sichert der Start vor dem Gebaeude einen Spieler mit Brettersatz,
// 'escaped' zieht im Coop alle anderen mit und die Runde endet nach 2 Sekunden als 'Lautlos entkommen' mit 0 Beute (Serie: gewonnen, ohne dass jemand etwas getan hat).
module.exports = [
  {
    name: 'Brettersatz: solo mit Brettersatz im Kit bleibt die Runde im Spiel (15 s), Material allein sichert nicht, echte Beute draussen schon',
    async run(t) {
      const r = await t.page.evaluate(() => {
        const D = __dbg, o = {};
        D.setScenario('bank'); D.setSeedMode('random'); D.setLage([]); D.setTurn('S'); D.buildSeed(5017);
        const run = (kit, set) => {
          D.sessReset(); Object.assign(D.SESSION.cons, kit); D.reset(); const me = D.get().me; if (set) set(me);
          const m0 = [me.mat, me.units, me.loot]; for (let i = 0; i < 15 * 30; i++) { me.hp = 1e9; D.update(1 / 30); }
          const g = D.get(); return { m0, mat: me.mat, out: !!me.out, escaped: g.escaped, ended: g.ended ? g.ended.t || g.ended.title || 'ja' : null, secured: g.secured, phase: g.phase };
        };
        o.bt = run({ bt: 1 });
        o.mat = run({}, me => { me.mat = 3; me.units = 1.5; });
        o.beute = run({}, me => { me.loot = 1000; me.units = 1; });
        return o;
      });
      t.eq(r.bt.m0.slice(0, 2), [4, 2], 'Ausgangslage: ein Brettersatz gibt Material 4 und 2 Platz');
      t.ok(!r.bt.out && r.bt.escaped === 0 && !r.bt.ended && r.bt.secured === 0, 'Brettersatz: nach 15 s nicht draussen, nichts gesichert, Runde laeuft: ' + JSON.stringify(r.bt));
      t.ok(!r.mat.out && r.mat.escaped === 0 && !r.mat.ended && r.mat.secured === 0, 'zerlegtes Material: nach 15 s nicht draussen, nichts gesichert: ' + JSON.stringify(r.mat));
      t.ok(r.beute.secured >= 1000 || r.beute.out, 'Gegenprobe: echte Beute vor dem Gebaeude wird weiter gesichert: ' + JSON.stringify(r.beute));
    },
  },
  {
    name: 'Brettersatz im Coop: ein Spieler mit Material zieht die anderen nicht aus der Runde (escaped bleibt 0, Host und Clients setzen kein Ende)',
    async run(t) {
      await t.loadTool('loopnet.js');
      await t.loadInpage('coop.js');
      const r = await t.page.evaluate(() => {
        const G = CT.mkGame('bank', 5017, 3), A = G.A, o = {};
        const p = A.get().players[1]; p.mat = 4; p.units = 2;
        for (let i = 0; i < 15; i++) { A.get().players.forEach(q => { q.hp = 1e9; q.dead = false; }); G.run(1); }
        o.out = A.get().players.map(q => !!q.out); o.escaped = A.get().escaped; o.ended = G.insts.map(d => !!d.get().ended); o.secured = A.get().secured;
        return o;
      });
      t.eq(r.out, [false, false, false], 'niemand ist draussen gesichert: ' + JSON.stringify(r.out));
      t.ok(r.escaped === 0 && r.secured === 0, 'escaped und gesichert bleiben 0: ' + r.escaped + ', ' + r.secured);
      t.eq(r.ended, [false, false, false], 'bei Host und Clients endet die Runde nicht');
    },
  },
];
