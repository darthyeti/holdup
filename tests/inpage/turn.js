// Seitenskript fuer die Tests gedrehter Karten (Plan Mehr Abwechslung, Sprint 3): Hashes von Karte und Ebenen, eine ganze Coop-Partie auf einer gedrehten Karte.
// Braucht tools/loopnet.js und tests/inpage/coop.js (CT.mkGame). Die Lage kommt ueber dbg.setTurn auf alle Instanzen ('N', 'E', 'W', 'S', mit + dahinter laengs gespiegelt).
(function () {
  const T = 32;
  const SIDES = ['S', 'N', 'E', 'W', 'S+', 'N+', 'E+', 'W+'];
  const fnv = s => { let x = 2166136261; for (let i = 0; i < s.length; i++) { x ^= s.charCodeAt(i); x = Math.imul(x, 16777619); } return (x >>> 0).toString(16); };
  // Pixel-Hash einer Ebene (statische oder Objektebene): zwei Instanzen mit derselben Karte muessen dieselben Pixel zeichnen
  const hashCanvas = cv => { const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data, u = new Uint32Array(d.buffer); let x = 2166136261; for (let i = 0; i < u.length; i++) { x ^= u[i]; x = Math.imul(x, 16777619); } return (x >>> 0).toString(16) + ':' + cv.width + 'x' + cv.height; };
  // Zahl der abweichenden Pixel zweier gleich grosser Ebenen. Gedrehte Karten zeichnen in etwa 3 % der Aufbauten 1 bis 3 Pixel anders (auch zweimal in derselben Instanz, Browser-Rauschen beim gedrehten Zeichnen, kein Spielfehler), deshalb gilt eine kleine Toleranz statt Gleichheit.
  const diffPx = (a, b) => { if (a.width !== b.width || a.height !== b.height) return Infinity; const x = a.getContext('2d').getImageData(0, 0, a.width, a.height).data, y = b.getContext('2d').getImageData(0, 0, b.width, b.height).data; let n = 0; for (let i = 0; i < x.length; i += 4) if (x[i] !== y[i] || x[i + 1] !== y[i + 1] || x[i + 2] !== y[i + 2] || x[i + 3] !== y[i + 3]) n++; return n; };
  // Hash einer Karte nach layoutFor (Raster und alle Felder, Funktionen fallen aus JSON heraus)
  const layHash = (D, lay) => fnv(D.world().M.join('\n') + JSON.stringify(lay));

  // Eine Coop-Partie zu zweit auf der Karte (sc, seed) in Lage turn, vom Start bis zum Sieg. Liefert { tag, bad: [Abweichungen], stat }
  function coop(sc, seed, turn, o) {
    o = o || {};   // turn undefined: ohne Schalter, die Lage kommt aus dem Seed
    const G = CT.mkGame(sc, seed, 2, 60, 20, null, turn), A = G.A, B = G.clients[0], bad = [], stat = {}, tag = sc + '#' + seed + ' ' + (turn != null ? turn : A.turnFor(seed, sc));
    const both = (sec, f) => { for (let i = 0; i < Math.round(sec * 60); i++) { A.get().players.forEach(p => { p.hp = 1e9; p.dead = false; }); if (f) f(i); step(G.insts, G.net, 1 / 60); } };
    stat.hall = A.LAY().hall || ''; stat.lage = turn != null ? turn : A.turnFor(seed, sc);
    // 1 Welt: Karte, Items, Lage-Tags, Strasse, Posten und beide Ebenen sind auf Host und Client gleich
    const d0 = CT.diff(CT.sig(A), CT.sig(B)); if (d0.length) bad.push('Welt nach dem Start: ' + d0.join(', '));
    const la = JSON.stringify(A.LANE()), lb = JSON.stringify(B.LANE());
    if (la !== lb) bad.push('Strasse (LANE) unterschiedlich'); if (la.length < 300) bad.push('Strasse leer, die Probe waere wertlos');
    const want = turn != null ? turn : A.turnFor(seed, sc);   // ohne Schalter bestimmt der Seed die Lage (Sprint 4)
    if (A.LANE().side !== want[0]) bad.push('Strasse liegt an ' + A.LANE().side + ' statt ' + want[0]);
    if (JSON.stringify(A.LAY().posts) !== JSON.stringify(B.LAY().posts)) bad.push('Posten unterschiedlich');
    for (const k of ['st', 'so']) { const n = diffPx(A.world()[k], B.world()[k]); if (n > 200) bad.push('Ebene ' + k + ' unterschiedlich (' + n + ' Pixel)'); }
    // 2 Der Client startet den Ueberfall (Taste F) und holt Beute, der Host rechnet
    B.cv.dispatchEvent(new KeyboardEvent('keydown', { key: 'f', bubbles: true })); both(3);
    if (A.get().phase !== 2 || B.get().phase !== 2) bad.push('Ueberfall-Start durch den Client: Phase ' + A.get().phase + '/' + B.get().phase);
    let it = null; for (const k of ['good', 'vit', 'till', 'mat']) { it = A.get().its.find(i => i.t === k && !i.done); if (it) break; }
    if (!it) bad.push('kein Beute-Item gefunden');
    else {
      const val = p => [p.units, p.loot, p.mat, p.chipV || 0].join(), before = val(A.get().players[1]);
      B.keys.e = 1; both((typeof it.dur === 'number' ? it.dur : 3) + 1.5, () => { const p = A.get().players[1]; p.x = it.x; p.y = it.y; p.vx = p.vy = 0; }); B.keys.e = 0; both(1.5);
      const f = d => d.get().its.find(i => i.t === it.t && i.x === it.x && i.y === it.y);
      if (!f(A).done || !f(B).done) bad.push('Item ' + it.t + ' nicht auf beiden erledigt');
      if (val(A.get().players[1]) !== val(B.get().players[1]) || val(A.get().players[1]) === before) bad.push('Beute des Clients: Host ' + val(A.get().players[1]) + ', Client ' + val(B.get().players[1]) + ', vorher ' + before);
    }
    // 3 Polizei: Wellen und Streifenwagen kommen an, Beamte stehen nie im Festen, Host und Client sehen dieselben Gegner und Wagen
    let wall = 0, ids = new Set(); both(o.police == null ? 60 : o.police, i => { if (i % 30) return; for (const e of A.get().en) { ids.add(e.id); if (A.isSol(Math.floor(e.x / T), Math.floor(e.y / T))) wall++; } });
    const ei = d => d.get().en.map(e => e.id).sort((p, q) => p - q), ea = ei(A), eb = ei(B);
    stat.cops = ids.size; stat.cars = A.get().pcs.length;
    if (wall) bad.push(wall + ' Mal ein Beamter in einer Wand');
    if (ea.filter(x => !eb.includes(x)).length + eb.filter(x => !ea.includes(x)).length > 3) bad.push('Gegner weichen ab: Host ' + ea.length + ', Client ' + eb.length);
    if (Math.abs(A.get().pcs.length - B.get().pcs.length) > 1) bad.push('Streifenwagen: Host ' + A.get().pcs.length + ', Client ' + B.get().pcs.length);
    // 4 Fluchtwagen: kommt in der Achse der Strasse an, der Client sieht ihn, beide steigen ein, der Auftrag endet mit einem Sieg auf beiden
    Object.assign(A.CFG.van, { bt: 0, bu: 0, r: 0 }); A.CFG.vanCall = 1; A.callVan();
    const ln = A.LANE(), cells = ln.exit.cells, cA = cells[0], cB = cells[cells.length - 1]; let arrived = null;
    both(o.van == null ? 90 : o.van, i => {
      const g = A.get(); if (g.ended) return;
      if (g.vanArr && Math.abs(g.vanX - ln.van.stop) <= 2) {
        if (arrived == null) arrived = i / 60;
        [[g.players[0], cA], [g.players[1], cB]].forEach(([p, c]) => { if (p.out) return; p.units = Math.max(p.units, 2); p.loot = Math.max(p.loot, 1000); p.x = c[0] * T + 16; p.y = c[1] * T + 16; p.vx = p.vy = 0; });
      }
    });
    stat.van = arrived == null ? null : Math.round(arrived);
    if (arrived == null) bad.push('Fluchtwagen kam nicht an');
    else if (Math.abs(B.get().vanX - A.get().vanX) > 3 && !A.get().ended) bad.push('Wagenposition: Host ' + Math.round(A.get().vanX) + ', Client ' + Math.round(B.get().vanX));
    both(3);
    const ea2 = A.get().ended, eb2 = B.get().ended;
    if (!ea2 || !ea2.win) bad.push('Host: Flucht endete nicht mit einem Sieg ' + JSON.stringify(ea2 && { win: ea2.win, title: ea2.title }));
    if (!eb2 || !eb2.win) bad.push('Client: Ende fehlt oder kein Sieg ' + JSON.stringify(eb2 && { win: eb2.win, title: eb2.title }));
    return { tag, bad, stat };
  }
  window.TN = { SIDES, fnv, hashCanvas, diffPx, layHash, coop };
})();
