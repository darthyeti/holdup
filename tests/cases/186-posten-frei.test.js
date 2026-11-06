// Posten frei (Ticket #7): deriveDecor darf keinen Polizeiposten mit parkenden Autos (decorCars) einschliessen. Fund aus Bank-Seed 5305.
// Jeder Posten muss auf dem fertigen Raster (mit den echten Wagen) von jedem begehbaren Aussteigepunkt der Strasse aus erreichbar sein.
// Seed 5305 selbst ist seit spaeteren Aenderungen der Kartenerzeugung frei (Plan P7), deshalb zusaetzlich ein gebauter Fall.
const PROBE = `(sc, seed, turn) => {
  const D = __dbg, T = 32; D.setScenario(sc); D.setSeedMode('random'); D.setLage([]); D.setTurn(turn || 'S'); D.buildSeed(seed);
  const L = D.LAY(), W = D.world(), LN = D.LANE(), bad = [];
  const flood = (sx, sy) => { const s = new Set([sx + ',' + sy]), q = [[sx, sy]]; for (let h = 0; h < q.length; h++) { const [x, y] = q[h]; for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) { const nx = x + dx, ny = y + dy, k = nx + ',' + ny; if (nx < W.WX0 || ny < W.WY0 || nx >= W.WX0 + W.W || ny >= W.WY0 + W.H || s.has(k) || W.isSol(nx, ny)) continue; s.add(k); q.push([nx, ny]); } } return s; };
  const comps = []; for (const s of LN.slots) { if (W.isSol(s.curb[0], s.curb[1])) continue; comps.push(flood(s.curb[0], s.curb[1])); }
  for (const p of L.posts) { const k = p.x + ',' + p.y; if (W.isSol(p.x, p.y)) { bad.push('Posten ' + k + ' fest'); continue; } if (comps.some(c => !c.has(k))) bad.push('Posten ' + k + ' eingeschlossen'); }
  return bad;
}`;

module.exports = [
  {
    name: 'Posten frei: Bank-Seed 5305 und eine Stichprobe aller Gebaeude-Szenarien in vier Lagen, jeder Posten ist von der Strasse aus erreichbar',
    timeout: 600000,
    async run(t) {
      const r = await t.page.evaluate(`(() => { const P = ${PROBE}, out = [];
        const rng = (a, n) => Array.from({ length: n }, (_, i) => a + i);
        const sets = [['bank', [5305].concat(rng(5000, 30), rng(5300, 8)), ['S', 'E+', 'W', 'N+']], ['jewel', rng(11, 14), ['S', 'E+', 'W', 'N+']], ['gas', rng(21, 14), ['S', 'E+', 'W', 'N+']], ['museum', rng(31, 14), ['S', 'E+', 'W', 'N+']], ['casino', rng(41, 14), ['S', 'E+', 'W', 'N+']]];
        for (const [sc, seeds, turns] of sets) for (const turn of turns) for (const s of seeds) { const b = P(sc, s, turn); if (b.length) out.push(sc + ' ' + turn + ' #' + s + ': ' + b.join(';')); }
        return out; })()`);
      t.eq(r, [], 'Eingeschlossene Posten: ' + JSON.stringify(r.slice(0, 8)));
    },
  },
  {
    name: 'Posten frei: ein Auto, das den einzigen Zugang zu einem Posten zustellen wuerde, wird nicht an diese Stelle gesetzt (gebauter Fall, deriveDecor)',
    timeout: 120000,
    async run(t) {
      const r = await t.page.evaluate(`(() => { const D = __dbg; D.setScenario('bank'); D.setSeedMode('random'); D.setLage([]); D.setTurn('S'); D.buildSeed(5305);
        const L = D.LAY(), W = D.world(), K = q => q[0] + ',' + q[1], N4 = [[1,0],[-1,0],[0,1],[0,-1]];
        D.deriveDecor(L);   // gleicher Stand wie im Spiel: echte Autos stehen, ihre Zellen sind frei (o)
        const e = Object.assign({}, L.decorReal[0]); if (!e.x && e.x !== 0) return { err: 'kein echtes Auto' };
        const own = new Set(D.carCells(e.x, e.y).map(K));
        // Posten p neben dem Auto, alle seine Nachbarn ausser n (im Auto) zu
        let pick = null;
        for (const n of D.carCells(e.x, e.y)) { for (const [dx, dy] of N4) { const px = n[0] + dx, py = n[1] + dy; if (own.has(px + ',' + py) || W.isSol(px, py) || W.cell(px, py) !== 'o') continue; pick = { n, p: [px, py] }; break; } if (pick) break; }
        if (!pick) return { err: 'kein Platz neben dem Auto' };
        const { n, p } = pick;
        for (const [dx, dy] of N4) { const x = p[0] + dx, y = p[1] + dy; if ((x !== n[0] || y !== n[1]) && !own.has(x + ',' + y)) W.setc(x, y, '#'); }
        L.posts = L.posts.concat([{ x: p[0], y: p[1] }]); L.decor = [e];
        D.deriveDecor(L);
        const hit = L.decorReal.filter(q => D.carCells(q.x, q.y).some(c => K(c) === K(n)));
        return { same: hit.length, after: L.decorReal.map(q => [q.x, q.y]), e: [e.x, e.y], p, n }; })()`);
      t.ok(!r.err, r.err);
      t.ok(!r.same, 'das Auto steht noch an der Stelle, die den Posten einschliesst: ' + JSON.stringify(r));
    },
  },
];
