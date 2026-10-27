// Transporter-Anfahrt (Tills Rueckmeldung vom 27. Oktober 2026: Streifenwagen fahren aufeinander und uebereinander, Beamte haengen an den schmalen Wegen, die Polizei wirkt langsamer).
// Messbefund: Die Wagenplaetze liegen auf einer Linie und wurden von aussen nach innen vergeben, jeder spaetere Wagen fuhr durch die schon geparkten (die Abstandspruefung beachtet nur fahrende Wagen).
// Die zweite Reihe stempelte Kacheln, auf denen Posten liegen, laufende Beamte behielten ihren alten Weg und standen vor der Wand aus Wagen. Test 82 kennt nur die Gebaeude-Karten.
// Neu: Plaetze von innen nach aussen vergeben (kein Durchfahren), die zweite Reihe meidet Posten, ein blockierter laufender Beamter sucht einen neuen Weg oder einen anderen Posten.
async function setup(t) {
  await t.loadTool('loopnet.js');
  await t.loadInpage('coop.js');
}

// Gezaehlt werden nur Wagen, deren Mitte auf der Karte liegt (die Warteschlange am Rand ausserhalb der Karte ist unsichtbar).
// Aufbau wie in Test 82 (solo, Wellen wie zu viert ueber LAY.wb, der Spieler steht auf dem Spawn und ist unverwundbar), dazu die Messung: Ueberlappungen der Karosserien, stehende Beamte mit Weg,
// Zeit bis zum Ende (der Panzerwagen faehrt ohne Sperre durch, dann endet der Auftrag, die Messung hoert dann auf)
const MESS = `(sc, seed, extra, sec) => {
  const D = __dbg; D.sessReset(); D.setScenario(sc); D.setSeedMode(typeof seed === 'number' ? 'random' : 'classic'); D.setLage([]); D.setTurn('S'); D.buildSeed(seed);
  const L = D.LAY(); L.wb = (L.wb || 0) + extra; D.CFG.policeAt = 1; D.CFG.policeForced = 1; D.CFG.snp.from = 99; D.startHeist(false, D.get().me);
  const R = D.CFG.pol.car, o = { sc, seed, ov: 0, pairs: new Set(), stuckMax: 0, cars: 0, postSolid: 0, inLeft: 0, endT: null, cops: 0 }, last = new Map();
  const hit = (a, b) => { const pts = []; for (const sx of [-1, 0, 1]) for (const sy of [-1, 0, 1]) { const px = sx * R.bx, py = sy * R.by; pts.push([a.x + px * Math.cos(a.a) - py * Math.sin(a.a), a.y + px * Math.sin(a.a) + py * Math.cos(a.a)]); } const ca = Math.cos(-b.a), sa = Math.sin(-b.a); return pts.some(p => { const dx = p[0] - b.x, dy = p[1] - b.y; return Math.abs(dx * ca - dy * sa) < R.bx * .9 && Math.abs(dx * sa + dy * ca) < R.by * .9; }); };
  let i = 0;
  for (; i < 30 * sec; i++) {
    const g0 = D.get(); if (g0.ended) { o.endT = Math.round(i / 30); break; }
    const m = g0.me; m.hp = 1e9; m.x = L.spawn.x; m.y = L.spawn.y;
    if (i === 30 * 12 || i === 30 * 30 || i === 30 * 50) D.spawnWave();
    D.update(1 / 30); const g = D.get(); if (g.ended) continue;
    const cs = g.cars.filter(c => !c.dead && !c.civ); o.cars = Math.max(o.cars, cs.length); const LN = D.LANE(), ins = cs.filter(c => c[LN.A] >= LN.lo && c[LN.A] <= LN.hi);
    for (let a = 0; a < ins.length; a++) for (let b = a + 1; b < ins.length; b++) if (hit(ins[a], ins[b]) || hit(ins[b], ins[a])) { o.ov++; o.pairs.add(ins[a].id + '-' + ins[b].id); }
    o.cops = Math.max(o.cops, g.en.length);
    for (const e of g.en) { if (e.mode !== 'run' || !e.path || !e.path.length) { last.delete(e); continue; } const l = last.get(e); if (!l || Math.hypot(e.x - l.x, e.y - l.y) > 4) last.set(e, { x: e.x, y: e.y, i }); else o.stuckMax = Math.max(o.stuckMax, (i - l.i) / 30); }
  }
  o.pairs = o.pairs.size; o.frames = i; o.postSolid = (D.LAY().posts || []).filter(p => D.world().isSol(p.x, p.y)).length; o.inLeft = D.get().cars.filter(c => !c.dead && !c.civ && c.st === 'in').length;
  return o;
}`;

module.exports = [
  {
    name: 'Transporter-Anfahrt: Streifenwagen fahren nie durch geparkte Wagen (keine ueberlappenden Karosserien), auch mit Wellen wie zu viert, und kein Posten wird von parkenden Wagen ueberstempelt',
    async run(t) {
      await setup(t);
      const r = await t.page.evaluate(`(() => { const M = ${MESS}, out = []; for (const seed of [748178, 268415, 928407, 101, 202, 303, 404, 505]) out.push(M('truck', seed, 6, 200)); return out; })()`);
      const bad = r.filter(o => o.ov > 0 || o.postSolid > 0), many = r.filter(o => o.cars < 7);
      t.eq(bad.map(o => [o.seed, o.ov, o.pairs, o.postSolid]), [], 'Ueberlappungen und ueberstempelte Posten (Seed, Frames, Paare, Posten)');
      t.eq(many.map(o => [o.seed, o.cars]), [], 'es kommen genug Wagen (mindestens sieben), sonst misst der Test nichts');
    },
  },
  {
    name: 'Transporter-Anfahrt: laufende Beamte bleiben nicht haengen (kein Beamter steht mit Weg laenger als 6 s still) und die Wagen kommen an',
    async run(t) {
      await setup(t);
      const r = await t.page.evaluate(`(() => { const M = ${MESS}, out = []; for (const seed of [748178, 268415, 928407, 101, 202, 303, 404, 505]) out.push(M('truck', seed, 6, 200)); return out; })()`);
      t.eq(r.filter(o => o.stuckMax > 6).map(o => [o.seed, +o.stuckMax.toFixed(1)]), [], 'Beamte, die laenger als 6 s stehen (Seed, Sekunden)');
      t.eq(r.filter(o => o.inLeft > 0 && o.endT == null).map(o => o.seed), [], 'am Ende steht kein Wagen noch auf der Anfahrt');
      t.ok(r.every(o => o.cops >= 10), 'genug Beamte: ' + JSON.stringify(r.map(o => o.cops)));
    },
  },
  {
    name: 'Anfahrt auf den Gebaeude-Karten: die neue Platzvergabe (von innen nach aussen) laesst auch dort keine Wagen ineinander fahren',
    slow: true,
    async run(t) {
      await setup(t);
      const r = await t.page.evaluate(`(() => { const M = ${MESS}, out = []; for (const [sc, seed] of [['bank', 5017], ['bank', 21], ['jewel', 11], ['jewel', 31], ['gas', 21], ['museum', 31], ['casino', 41]]) out.push(M(sc, seed, 6, 120)); return out; })()`);
      t.eq(r.filter(o => o.ov > 0).map(o => [o.sc, o.seed, o.ov, o.pairs]), [], 'Ueberlappungen (Karte, Seed, Frames, Paare)');
      t.eq(r.filter(o => o.stuckMax > 6).map(o => [o.sc, o.seed, +o.stuckMax.toFixed(1)]), [], 'Beamte, die laenger als 6 s stehen');
    },
  },
  {
    name: 'Transporter-Anfahrt: ein Beamter, dessen Weg ein Wagen zustellt, kommt ueber einen Umweg an denselben Posten, ist der Posten selbst zugestellt, bekommt er einen anderen (nie einen vergebenen), und nach zwei Versuchen geht er ins Spiel',
    async run(t) {
      await setup(t);
      const r = await t.page.evaluate(`(() => { const D = __dbg, o = {}; D.sessReset(); D.setScenario('truck'); D.setSeedMode('random'); D.setLage([]); D.setTurn('S'); D.buildSeed(202);
        const L = D.LAY(); D.CFG.policeAt = 1e6; D.CFG.policeForced = 1e6; D.CFG.snp.from = 99; D.startHeist(false, D.get().me); const W = D.world(), T = 32;
        let far = null; const keep = () => { const m = D.get().me; m.hp = 1e9; m.x = far ? far[0] : L.spawn.x; m.y = far ? far[1] : L.spawn.y; };
        const mk = (tx, ty) => { const e = D.mkCop(tx * T + 16, ty * T + 16); D.toPost(e); return e; };
        const posts = L.posts.slice(); const po = posts[0];
        // Umweg: ein Streifen quer zum Weg wird zugestellt, daneben ist Platz
        { let e = null, pq = null; for (const pp of posts) for (const dx of [-9, -8, -7, 7, 8, 9]) { if (e || W.isSol(pp.x + dx, pp.y)) continue; const c = mk(pp.x + dx, pp.y); if (!c.post || c.path.length < 6) { D.get().en.length = 0; continue; }
            const q = c.path[3], bx = Math.floor(q[0] / T), by = Math.floor(q[1] / T), was = []; for (let dy = -1; dy <= 1; dy++) if (!W.isSol(bx, by + dy)) { was.push([bx, by + dy, W.cell(bx, by + dy)]); W.setc(bx, by + dy, 'v'); }
            if (D.pathTo(c.x, c.y, c.post.x, c.post.y).length) { e = c; pq = c.post; } else { for (const w of was) W.setc(w[0], w[1], w[2]); D.get().en.length = 0; } }
          o.start = !!e; if (e) { far = [(e.x < (W.WX0 + W.W / 2) * T ? W.WX0 + W.W - 3 : W.WX0 + 2) * T, L.spawn.y]; const d0 = Math.hypot(e.x - (pq.x * T + 16), e.y - (pq.y * T + 16)); for (let i = 0; i < 30 * 10; i++) { keep(); D.update(1 / 30); } o.umweg = [e.post === pq, e.mode, Math.hypot(e.x - (pq.x * T + 16), e.y - (pq.y * T + 16)) < d0 * .5, e.rp || 0]; } }
        // Posten zugestellt: ein anderer, nicht vergebener, nicht solider
        { D.get().en.length = 0; const a = mk(po.x + 4, po.y), b = mk(po.x + 5, po.y); W.setc(a.post.x, a.post.y, 'v'); const old = a.post, dd = q => Math.hypot(q.x * T + 16 - a.x, q.y * T + 16 - a.y); const near = posts.filter(q => q !== old && !W.isSol(q.x, q.y)).sort((u, v) => dd(u) - dd(v))[0]; b.post = near; D.repath(a);
          o.neu = [!!a.post, a.post !== old, !!a.post && !W.isSol(a.post.x, a.post.y), a.post !== b.post, a.path.length > 0, a.rp]; D.repath(a); D.repath(a); o.limit = [a.mode, a.post, a.path.length, a.rp]; }
        return o; })()`);
      t.ok(r.start, 'Aufbau: ein Beamter laeuft zum Posten mit langem Weg');
      t.eq([r.umweg[0], r.umweg[2]], [true, true], 'der Umweg bringt ihn an denselben Posten (er kommt ihm deutlich naeher): ' + JSON.stringify(r.umweg)); t.ok(r.umweg[1] === 'run' || r.umweg[1] === 'post', 'und er bleibt im Ablauf (laufen oder Posten): ' + r.umweg[1]); t.ok(r.umweg[3] >= 1, 'er hat dafuer einen neuen Weg gesucht (stehen geblieben, dann repath)');
      t.eq(r.neu, [true, true, true, true, true, 1], 'ein zugestellter Posten wird durch einen anderen ersetzt, der frei ist und nicht schon einem anderen gehoert');
      t.eq(r.limit, ['push', null, 0, 3], 'nach zwei Versuchen geht der Beamte ins Spiel');
    },
  },
];
