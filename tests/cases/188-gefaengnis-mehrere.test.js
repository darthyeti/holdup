// Issue 90: Bleiben im Coop mehrere Spieler zurueck, sitzen alle im Gefaengnis, jeder in einer eigenen Zelle (LAY.prison.slots, Tueren z, z1, z2). Die Liste kommt mit go und rst vom Host (PZ), SESSION.pz ist eine Liste. Sind alle gefangen, bleibt Spieler 0 als Befreier draussen (Gitter II oeffnet nur ein Schalter aussen).
const HELP = `(() => {
  const mk = (sc, seed, n) => {
    const G = CT.mkGame(sc, seed, n, 60, 20), A = G.A;
    const both = (sec, f) => { for (let i = 0; i < Math.round(sec * 60); i++) { A.get().players.forEach(p => { if (!p.dead) p.hp = 1e9; }); if (f) f(i); G.run(1 / 60); } };
    return { G, A, both };
  };
  const cl = (D, x, y) => D.world().M[y + 6][x + 6];
  const lst = (D, id) => D.LAY().prison.locks.find(l => l.id === id).cells.map(c => cl(D, c[0], c[1])).join('');
  return { mk, cl, lst };
})()`;

module.exports = [
  {
    name: 'Gefaengnis mit mehreren Gefangenen: zwei Zurueckgebliebene sitzen ein (Liste auf Host und Clients), jeder in eigener Zelle ohne Pistole, jeder hebelt seine Tuer, der Schalter oeffnet alle, Sieg erst wenn beide am Abholpunkt waren (feste Belohnung je Gefangenem)',
    timeout: 180000,
    async run(t) {
      await t.loadTool('loopnet.js'); await t.loadInpage('coop.js');
      const r = await t.page.evaluate(`(() => {
        const H = ${HELP}, o = {}, M = H.mk('bank', 5, 3), A = M.A, G = M.G, C1 = G.clients[0], C2 = G.clients[1];
        A.get().players[0].out = true; A.finish(true, 'Teilweise entkommen', 'x'); G.run(1);
        o.pz = [A.SESSION.pz, C1.SESSION.pz, C2.SESSION.pz];
        o.msg = [A, C1, C2].map(d => /Spieler \\d und Spieler \\d sitzen im Gefängnis/.test((d.get().ended || {}).pz || '') || /sitzen im Gefängnis/.test((d.get().ended || {}).pz || ''));
        A.startNext(); G.run(2.5);
        o.next = [A.sc(), C1.sc(), C2.sc()]; o.pzNow = [A.getPz(), C1.getPz(), C2.getPz()];
        const R = A.LAY().prison, pl = A.get().players;
        o.slots = R.slots.length; o.cellsOk = pl[1].x === R.slots[0].cell[0] && pl[1].y === R.slots[0].cell[1] && pl[2].x === R.slots[1].cell[0] && pl[2].y === R.slots[1].cell[1];
        o.distinct = new Set(R.slots.map(s => s.cell.join())).size === R.slots.length;
        o.guns = pl.map(p => p.mag > 0);
        const pry = A.get().its.filter(i => i.t === 'pry'); o.npry = pry.length;
        o.pryOk = [pry[0].ok(pl[1]), pry[0].ok(pl[0]), pry[1].ok(pl[2]), pry[1].ok(pl[0])];
        o.before = [H.lst(A, 'z'), H.lst(A, 'z1'), H.lst(A, 'z2')];
        pry[1].act(pl[2]); M.both(1);
        o.one = [H.lst(A, 'z'), H.lst(A, 'z1'), H.lst(C1, 'z1'), H.lst(C2, 'z1')];
        o.pryAfter = [pry[1].ok(pl[2])];
        // Schalter oeffnet alle Zellen der Gefangenen
        const R2 = A.LAY().prison, sw = A.get().its.filter(i => i.t === 'lsw').find(i => R2.sws[i.k].opens.includes('zi'));
        o.swOk = [sw.ok(pl[0]), sw.ok(pl[1]), sw.ok(pl[2])]; sw.act(pl[0]); M.both(1);
        o.all = [H.lst(A, 'z'), H.lst(A, 'z1'), H.lst(C2, 'z'), H.lst(C2, 'z1')];
        // Sieg erst mit beiden am Abholpunkt (Phase 1, lautlos)
        const pk = R.pick; pl[1].x = pk[0] * 32 + 16; pl[1].y = pk[1] * 32 + 16; M.both(.5);
        o.mid = [!!A.get().ended, pl[1].out, pl[2].out, pl[0].out];
        pl[2].x = pk[0] * 32 + 16; pl[2].y = pk[1] * 32 + 16; M.both(1);
        const e = A.get().ended; o.end = e ? [e.win, pl[2].out] : null; o.sec = [pl[1].st.sec >= A.CFG.prison.reward, pl[2].st.sec >= A.CFG.prison.reward];
        o.after = A.SESSION.pz;
        return o; })()`);
      t.eq(r.pz, [[1, 2], [1, 2], [1, 2]], 'Spieler 1 und 2 bleiben zurueck, die Liste ist auf Host und beiden Clients gleich');
      t.eq(r.msg, [true, true, true], 'das Ergebnis nennt beide');
      t.eq(r.next, ['prison', 'prison', 'prison'], 'der naechste Auftrag ist der Ausbruch');
      t.eq(r.pzNow, [[1, 2], [1, 2], [1, 2]], 'go oder rst tragen die Liste');
      t.ok(r.slots >= 3 && r.distinct, 'die Anlage bietet mindestens drei verschiedene Zellen fuer Gefangene');
      t.ok(r.cellsOk, 'beide Gefangenen stehen in ihrer eigenen Zelle');
      t.eq(r.guns, [true, false, false], 'beide Gefangenen ohne Pistole, der Befreier bewaffnet');
      t.eq(r.npry, 2, 'je Gefangenem ein Aufhebeln der eigenen Tuer');
      t.eq(r.pryOk, [true, false, true, false], 'nur Gefangene hebeln, jeder an seiner Tuer');
      t.eq(r.before, ['L', 'L', 'L'], 'vorher sind die Zellentueren zu');
      t.eq(r.one, ['L', 'l', 'l', 'l'], 'die Tuer des zweiten Gefangenen geht auf (Host und Clients), die des ersten bleibt zu');
      t.eq(r.pryAfter, [false], 'das offene Aufhebeln erscheint nicht mehr');
      t.eq(r.swOk, [true, false, false], 'den Schalter bedient nur der Befreier');
      t.eq(r.all, ['l', 'l', 'l', 'l'], 'der Schalter oeffnet alle Zellen der Gefangenen');
      t.eq(r.mid, [false, true, false, false], 'ist nur einer draussen, laeuft der Auftrag weiter und der Befreier bleibt im Spiel');
      t.eq(r.end, [true, true], 'sind beide draussen, ist es ein Sieg');
      t.eq(r.sec, [true, true], 'feste Belohnung je Gefangenem');
      t.eq(r.after, [], 'nach dem Ausbruch sitzt niemand mehr ein');
    },
  },
  {
    name: 'Gefaengnis mit mehreren Gefangenen: kommt nur einer raus und der andere bleibt, ist es kein Sieg; verlaesst einer das Spiel, zaehlt der Rest',
    timeout: 180000,
    async run(t) {
      await t.loadTool('loopnet.js'); await t.loadInpage('coop.js');
      const r = await t.page.evaluate(`(() => {
        const H = ${HELP}, o = {}, M = H.mk('bank', 5, 3), A = M.A, G = M.G;
        A.get().players[0].out = true; A.finish(true, 'Teilweise entkommen', 'x'); G.run(1); A.startNext(); G.run(2.5);
        const pl = A.get().players, pk = A.LAY().prison.pick;
        pl[2].dead = true; pl[2].hp = 0; pl[1].x = pk[0] * 32 + 16; pl[1].y = pk[1] * 32 + 16; M.both(1.5);
        // der Befreier geht von selbst raus, sobald kein lebender Gefangener mehr drin ist
        const e = A.get().ended; o.loss = e ? e.win : 'offen';
        // zweite Runde: ein Gefangener geht weg, der andere kommt raus
        const M2 = H.mk('bank', 5, 3), B = M2.A; B.get().players[0].out = true; B.finish(true, 'Teilweise entkommen', 'x'); M2.G.run(1); B.startNext(); M2.G.run(2.5);
        const q = B.get().players, pk2 = B.LAY().prison.pick; q[2].gone = true;
        q[1].x = pk2[0] * 32 + 16; q[1].y = pk2[1] * 32 + 16; M2.both(1.5);
        const e2 = B.get().ended; o.gone = e2 ? e2.win : 'offen';
        return o; })()`);
      t.eq(r.loss, false, 'ein Gefangener drin, der andere verloren: gescheitert');
      t.eq(r.gone, true, 'ein Gefangener weg, der andere draussen: Sieg');
    },
  },
  {
    name: 'Gefaengnis: sind alle Spieler zurueckgeblieben, bleibt Spieler 0 als Befreier draussen (Gitter II hat nur Schalter aussen); Zellen sind verschieden, Gegenprobe: doppelte Zelle wird erkannt',
    timeout: 180000,
    async run(t) {
      await t.loadTool('loopnet.js'); await t.loadInpage('coop.js');
      const r = await t.page.evaluate(`(() => {
        const H = ${HELP}, o = {}, M = H.mk('bank', 5, 3), A = M.A, G = M.G;
        A.SESSION.pz = [0, 1, 2]; G.clients.forEach(c => { c.SESSION.pz = [0, 1, 2]; });
        A.startNext(); G.run(2.5);
        o.pz = [A.sc(), A.getPz(), G.clients[0].getPz()];
        const slots = A.LAY().prison.slots, distinct = s => new Set(s.map(x => x.cell.join())).size === s.length;
        o.dist = [distinct(slots), distinct([slots[0], slots[0], slots[1]])];
        return o; })()`);
      t.eq(r.pz, ['prison', [1, 2], [1, 2]], 'Spieler 0 bleibt draussen, 1 und 2 sitzen ein');
      t.eq(r.dist, [true, false], 'Zellen verschieden; die Pruefung erkennt eine doppelte Zelle (Mutant)');
    },
  },
];
