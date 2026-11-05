// Ticket #107: Der Wachmann des Auftrags-Ereignisses Wachwechsel erscheint nicht mehr im Gebaeude, sondern draussen (o-Kachel, ausser Sicht der Spieler, notfalls nach CFG.ev.ent.wait s),
// geht zu einer Tuer aus LAY.spots (bevorzugt die Hintertuer, die er aufschliesst und hinter sich wieder verriegelt), betritt das Gebaeude und erreicht binnen CFG.ev.ent.max s seine Route.
// Die Meldung kommt erst, wenn er durch die Tuer ist. Im Coop sieht der Client ihn erst draussen auftauchen (kein Gleiten aus dem Gebaeude) und gleich zum Host.
// Fuenf Szenarien (Bank, Juwelier, Tankstelle, Museum, Casino) mal Seeds 5, 7, 27, 35 (alle haben den Wachwechsel, gesucht mit layoutFor); die Strasse im Sueden (setTurn 'S').
const SCS = ['bank', 'jewel', 'gas', 'museum', 'casino'], SEEDS = [5, 7, 27, 35];

const SOLO = `(sc, seed) => { const D = __dbg; D.sessReset(); D.setScenario(sc); D.setSeedMode('random'); D.setLage([]); D.setTurn('S'); D.buildSeed(seed); D.CFG.policeAt = 1e6; D.CFG.policeForced = 1e6; D.setFocus(true);
  D.CFG.watch.grace = 1e6;
  const lay = D.LAY(), B = lay.bld, g0 = D.get(), n = g0.npcs.find(q => q.ent), out = { sc, seed, err: null };
  if (!n) return Object.assign(out, { err: 'keine Wachwechsel-Wache (ent)' });
  g0.cams.forEach(c => { c.off = true; });
  const E = D.CFG.ev.ent, T = 32, inB = (x, y) => x >= B.x0 && x <= B.x1 && y >= B.y0 && y <= B.y1, tile = q => [Math.floor(q.x / T), Math.floor(q.y / T)];
  const doors = lay.spots.filter(s => s.side), dk = new Set(); doors.forEach(s => s.cells.forEach(c => dk.add(c[0] + ',' + c[1])));
  out.start = { away: n.st, in: inB(...tile(n)) }; n.at = 0.5; const msg = n.msg, route = n.route, sees = [], feed0 = D.msgs().feed.length;
  let t = 0, spawn = null, door = false, inside = false, reach = null, msgAt = null, msgBeforeDoor = false, opened = false;
  for (let i = 0; i < 30 * (E.wait + E.max + 90) && reach == null; i++) { D.update(1 / 30); t += 1 / 30;
    if (n.st !== 'away' && !spawn) { const tl = tile(n); spawn = { t, tl, cell: D.world().cell(tl[0], tl[1]), inB: inB(tl[0], tl[1]), seen: D.get().players.some(o => Math.hypot(o.x - n.x, o.y - n.y) < E.vis && D.los(o.x, o.y, n.x, n.y)) }; }
    if (spawn) { const tl = tile(n); if (dk.has(tl[0] + ',' + tl[1])) { door = true; if (D.world().cell(tl[0], tl[1]) === 'L') out.solidDoor = true; }
      if (door && !inside && !inB(...tl)) { /* noch draussen */ } if (door && n.ent.s === 0 && !inside) inside = true;
      if (D.msgs().feed.some(m => m === msg)) { if (msgAt == null) { msgAt = t; msgBeforeDoor = !door; } }
      if (inside && route.some(r => Math.hypot(n.x - (r[0] * T + 16), n.y - (r[1] * T + 16)) < 14)) reach = t - spawn.t; } }
  Object.assign(out, { spawn, door, inside, reach, msgAt, msgBeforeDoor, E, st: n.st, doorLocked: lay.spots.filter(s => s.side && s.cells.some(c => D.world().cell(c[0], c[1]) === 'L')).length });
  return out; }`;

module.exports = [
  {
    name: 'Wachwechsel (solo): die Wache erscheint draussen auf einer o-Kachel ausser Sicht, geht durch eine Tuer aus LAY.spots, die Meldung kommt erst nach der Tuer, die Route ist binnen CFG.ev.ent.max s erreicht (5 Szenarien, 4 Seeds)',
    timeout: 600000,
    async run(t) {
      const bad = [];
      let n = 0;
      for (const sc of SCS) {
        for (const seed of SEEDS) {
          const r = await t.page.evaluate(`(${SOLO})(${JSON.stringify(sc)}, ${seed})`);
          n++;
          const id = sc + ' ' + seed;
          if (r.err) { bad.push(id + ': ' + r.err); continue; }
          if (!r.start || r.start.away !== 'away') bad.push(id + ': startet nicht abwesend');
          if (!r.spawn) { bad.push(id + ': erscheint nie'); continue; }
          if (r.spawn.inB) bad.push(id + ': erscheint im Gebaeude ' + JSON.stringify(r.spawn.tl));
          if (r.spawn.cell !== 'o') bad.push(id + ': Startkachel ist nicht o: ' + r.spawn.cell);
          if (r.spawn.seen && r.spawn.t < r.E.wait) bad.push(id + ': erscheint vor den Augen eines Spielers nach ' + r.spawn.t.toFixed(1) + ' s');
          if (!r.door) bad.push(id + ': betritt keine Tuer aus LAY.spots');
          if (r.msgBeforeDoor) bad.push(id + ': Meldung vor der Tuer');
          if (r.msgAt == null) bad.push(id + ': keine Meldung');
          if (r.reach == null) bad.push(id + ': Route nicht erreicht');
          else if (r.reach > r.E.max + 30) bad.push(id + ': Route erst nach ' + r.reach.toFixed(1) + ' s');
          if (r.solidDoor) bad.push(id + ': stand in einer verschlossenen Tuer');
        }
      }
      t.ok(n === SCS.length * SEEDS.length, 'alle Faelle gelaufen');
      t.eq(bad, [], 'Wachwechsel durch die Tuer');
    },
  },
  {
    name: 'Wachwechsel (solo): wer in Sicht der Startkacheln steht, haelt die Wache zurueck, nach CFG.ev.ent.wait s kommt sie trotzdem',
    timeout: 120000,
    async run(t) {
      const r = await t.page.evaluate(`(() => { const D = __dbg; D.sessReset(); D.setScenario('gas'); D.setSeedMode('random'); D.setLage([]); D.setTurn('S'); D.buildSeed(5); D.CFG.policeAt = 1e6; D.CFG.policeForced = 1e6; D.setFocus(true); D.CFG.watch.grace = 1e6;
        const g = D.get(), n = g.npcs.find(q => q.ent), me = g.me, E = D.CFG.ev.ent; g.cams.forEach(c => { c.off = true; }); n.at = 0.2;
        // erste Kachel der Liste: der Spieler steht daneben, sieht sie (Sichtlinie frei, Abstand klein)
        const c = n.ent.sps[0], px = c[0] * 32 + 16, py = c[1] * 32 + 16; let t = 0, t1 = null;
        for (let i = 0; i < 30 * (E.wait + 5) && t1 == null; i++) { me.x = px + 40; me.y = py; me.vx = me.vy = 0; D.update(1 / 30); t += 1 / 30; if (n.st !== 'away') t1 = t; }
        return { t1, wait: E.wait, sps: n.ent.sps.length, free: n.ent.sps.some(q => Math.hypot(q[0] * 32 + 16 - px - 40, q[1] * 32 + 16 - py) > 5) }; })()`);
      t.ok(r.t1 != null, 'die Wache kommt');
      t.ok(r.t1 >= 0.2, 'nicht vor der Zeit');
      // steht der Spieler im Blick der ersten Kachel, nimmt die Wache eine andere oder wartet bis wait s
      t.ok(r.t1 <= r.wait + 1.5, 'spaetestens nach wait s: ' + r.t1);
    },
  },
  {
    name: 'Wachwechsel (Coop): Host und Client sehen die Wache erst draussen, am Ende steht sie bei beiden im Gebaeude, die Hintertuer ist wieder zu (4 Karten)',
    timeout: 600000,
    async run(t) {
      await t.loadTool('loopnet.js');
      await t.loadInpage('coop.js');
      const bad = [];
      for (const [sc, seed] of [['bank', 5], ['jewel', 7], ['gas', 27], ['casino', 35]]) {
        const r = await t.page.evaluate(`(() => { const G = CT.mkGame(${JSON.stringify(sc)}, ${seed}, 2, 60, 20, null, 'S', insts => insts.forEach(d => { d.CFG.policeAt = 1e6; d.CFG.policeForced = 1e6; d.CFG.watch.grace = 1e6; })), A = G.A, B = G.clients[0], T = 32;
          const lay = A.LAY(), bl = lay.bld, inB = (x, y) => x >= bl.x0 && x <= bl.x1 && y >= bl.y0 && y <= bl.y1, tl = q => [Math.floor(q.x / T), Math.floor(q.y / T)];
          const h = A.get().npcs.find(q => q.ent); if (!h) return { err: 'keine ent-Wache' };
          A.get().cams.forEach(c => { c.off = true; }); h.at = A.get().rT + 0.5;
          const E = A.CFG.ev.ent, o = { hostFirst: null, clientFirst: null, doneAt: null, E }; let t = 0;
          for (let i = 0; i < 10 * (E.wait + E.max + 60) && o.doneAt == null; i++) { G.run(0.1); t += 0.1;
            const c = B.get().npcs.find(q => q.id === h.id);
            if (h.st !== 'away' && !o.hostFirst) o.hostFirst = { inB: inB(...tl(h)) };
            if (c && c.st !== 'away' && !o.clientFirst) o.clientFirst = { inB: inB(...tl(c)), t };
            if (o.hostFirst && h.ent.s === 0 && h.st !== 'away') o.doneAt = t; }
          G.run(2);
          const c = B.get().npcs.find(q => q.id === h.id);
          o.hostIn = inB(...tl(h)); o.clientIn = !!c && inB(...tl(c)); o.dist = c ? Math.hypot(c.x - h.x, c.y - h.y) : -1;
          o.doors = lay.spots.filter(s => s.side).map(s => [A, B].map(d => s.cells.map(q => d.world().cell(q[0], q[1])).join('')).join('|'));
          o.feedA = A.msgs().feed.some(m => /Wachwechsel/.test(m)); o.feedB = B.msgs().feed.some(m => /Wachwechsel/.test(m));
          return o; })()`);
        const id = sc + ' ' + seed;
        if (r.err) { bad.push(id + ': ' + r.err); continue; }
        if (!r.hostFirst || r.hostFirst.inB) bad.push(id + ': Host: Start im Gebaeude oder nie');
        if (!r.clientFirst || r.clientFirst.inB) bad.push(id + ': Client sieht die Wache zuerst im Gebaeude: ' + JSON.stringify(r.clientFirst));
        if (r.doneAt == null) bad.push(id + ': nicht durch die Tuer');
        if (!r.hostIn || !r.clientIn) bad.push(id + ': nicht im Gebaeude (Host ' + r.hostIn + ', Client ' + r.clientIn + ')');
        if (r.dist > 48) bad.push(id + ': Client weicht vom Host ab: ' + r.dist.toFixed(0));
        if (r.doors.some(d => { const [a, b] = d.split('|'); return a !== b; })) bad.push(id + ': Tuerzustand verschieden: ' + r.doors.join(' '));
        if (!r.feedA || !r.feedB) bad.push(id + ': Meldung fehlt (Host ' + r.feedA + ', Client ' + r.feedB + ')');
      }
      t.eq(bad, [], 'Wachwechsel im Coop');
    },
  },
];
