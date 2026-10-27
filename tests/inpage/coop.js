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
  // mkLobby(n, ns, lat, jit): Host A, n-1 Mitspieler und ns Zuschauer im Raum, noch in der Lobby (nicht gestartet). players = die n Spieler, specs = die Zuschauer, run(sec) tickt alle.
  function mkLobby(n, ns, lat, jit) {
    const net = LoopNet(lat == null ? 40 : lat, jit || 0), insts = [], A = mkInst(net, 'a'); insts.push(A);
    const run = sec => { for (let i = 0; i < Math.round(sec * 60); i++) step(insts, net, 1 / 60); };
    A.hostRoom(); run(.2);
    for (let k = 1; k < n; k++) { const C = mkInst(net, 'c' + k); insts.push(C); C.joinRoom(A.NET.code); run(2); }
    const specs = []; for (let k = 0; k < (ns || 0); k++) { const S = mkInst(net, 's' + k); insts.push(S); specs.push(S); S.joinRoom(A.NET.code, { spec: true }); run(2); }
    return { net, A, insts, players: insts.slice(0, n), specs, run };
  }
  // addSpec(G, name): ein weiterer Zuschauer tritt dem Raum von G.A bei (auch mitten im Spiel), G.run tickt ihn mit
  function addSpec(G, name) { const S = mkInst(G.net, name || 's' + G.insts.length); G.insts.push(S); S.joinRoom(G.A.NET.code, { spec: true }); return S; }
  // mkDuel(nA, nB, lat, jit): Wettkampf-Aufbau (Spur W): zwei Raeume mit zwei Hosts in einer Test-Leitung, Team A (Host A plus nA-1 Mitspieler) und Team B (Host B plus nB-1), beide in der Lobby, jedes Team mit eigener Serie (opt.session),
  // noch ohne Verbindung zwischen den Hosts. pa und pb = die Spieler je Team, run(sec) tickt alle, sA und sB = die Serien. Host A heisst Anna, Host B Bert.
  const freshSession = () => ({ wallet: 0, own: {}, cons: {}, wear: { vest: null, helm: null }, round: 0, earned: 0, best: 0, heat: 0, law: false, pts: 0, sk: {}, sk0: null, quiet: 0 });
  function mkDuel(nA, nB, lat, jit) {
    const net = LoopNet(lat == null ? 40 : lat, jit || 0), insts = [], sA = freshSession(), sB = freshSession(), A = mkInst(net, 'a', sA), B = mkInst(net, 'b', sB); insts.push(A, B);
    const run = sec => { for (let i = 0; i < Math.round(sec * 60); i++) step(insts, net, 1 / 60); };
    A.hostRoom(); B.hostRoom(); run(.2); A.setName('Anna'); B.setName('Bert');
    const pa = [A], pb = [B];
    for (let k = 1; k < nA; k++) { const C = mkInst(net, 'a' + k, sA); insts.push(C); pa.push(C); C.joinRoom(A.NET.code); run(2); }
    for (let k = 1; k < nB; k++) { const C = mkInst(net, 'b' + k, sB); insts.push(C); pb.push(C); C.joinRoom(B.NET.code); run(2); }
    return { net, A, B, pa, pb, insts, run, sA, sB };
  }
  window.CT = { mkGame, sig, diff, mkLobby, addSpec, mkDuel };
})();
