// Seitenskript fuer Coop-Tests: baut Host und Clients ueber die Test-Leitung (tools/loopnet.js muss geladen sein).
(function () {
  // mkGame(sc, seed, n, lat, jit, goal, turn, pre): Host A plus n-1 Clients, Raum gebaut, Spiel gestartet, 3 s Spielzeit vorgespult. turn legt die Strasse auf allen Instanzen auf eine Seite (dbg.setTurn, zum Beispiel 'E+')
  function mkGame(sc, seed, n, lat, jit, goal, turn, pre) {
    const net = LoopNet(lat == null ? 60 : lat, jit == null ? 20 : jit), insts = [];
    const A = mkInst(net, 'a'); insts.push(A);
    A.setScenario(sc); A.setSeedMode(seed); if (turn) A.setTurn(turn);
    A.hostRoom(); for (let i = 0; i < 10; i++) step(insts, net, 1 / 60);
    for (let k = 1; k < n; k++) {
      const C = mkInst(net, 'c' + k); insts.push(C); if (turn) C.setTurn(turn);
      C.joinRoom(A.NET.code); for (let i = 0; i < 120; i++) step(insts, net, 1 / 60);
    }
    if (goal) for (const d of insts) d.setGoal(goal);
    if (pre) { pre(insts); for (let i = 0; i < 60; i++) step(insts, net, 1 / 60); }   // pre: Stand setzen, nachdem alle im Raum sind (ein neuer Raum setzt SESSION zurueck, sie gilt hier fuer alle Instanzen)
    A.startCoop();
    const run = (sec) => { for (let i = 0; i < Math.round(sec * 60); i++) step(insts, net, 1 / 60); };
    run(3);
    return { net, A, insts, clients: insts.slice(1), run };
  }
  // Kennzeichen des Weltzustands, der auf Host und Clients gleich sein muss
  function sig(d) {
    const g = d.get(), L = d.LAY();
    return {
      sc: d.sc(), seed: L.seed, lg: (L.mission.lg || []).join(','), map: d.world().M.join('\n'),
      its: g.its.map(it => [it.t, it.k || '', Math.round(it.x), Math.round(it.y)].join(':')),
      done: g.its.map(it => it.done ? 1 : 0).join(''), phase: g.phase, np: g.players.length,
    };
  }
  function diff(a, b) {
    const out = [];
    for (const k of ['sc', 'seed', 'lg', 'map', 'phase', 'np', 'done']) if (a[k] !== b[k]) out.push(k + (k === 'map' || k === 'done' ? '' : ': ' + a[k] + ' != ' + b[k]));
    if (a.its.length !== b.its.length) out.push('its-laenge ' + a.its.length + ' != ' + b.its.length);
    else { const i = a.its.findIndex((x, j) => x !== b.its[j]); if (i >= 0) out.push('its[' + i + '] ' + a.its[i] + ' != ' + b.its[i]); }
    return out;
  }
  window.CT = { mkGame, sig, diff };
})();
