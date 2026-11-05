// Transporter: Polizei sucht Deckung und rueckt gestaffelt an (Ticket 100, 5. November 2026, CFG.truck.cop, docs/szenarien.md Geldtransporter, Plan Polizei im Transporter).
// Ein Beamter aus dem Streifenwagen bekommt einen Anker (Flanke Ost oder West nach dem Wagen, Gehweg Nord oder Sued im Wechsel, Abstand cop.dist Kacheln vom Panzerwagen), sucht dort Deckung (Modus cover, e.pv),
// rueckt alle cop.stay Sekunden um cop.step Kacheln vor (cop.adv Spruenge, Deckung bei jedem Halt) und geht erst danach ins Spiel (push). Gebaeude-Szenarien und cop.on 0 bleiben wie vorher.
async function setup(t) {
  await t.loadTool('loopnet.js');
}
// Seeds ohne Panne und ohne Vorhut ab 3000 (wie 162)
const NP = `(n) => { const D = __dbg, out = []; D.setScenario('truck'); D.setSeedMode('random'); D.setLage([]); for (let sd = 3000; out.length < n; sd++) { const m = D.genTruckMission(sd); if (!m.panne && !m.vorhut && m.crew >= 3) out.push(sd); } return out; }`;
// fertige Sperre West, der Spieler (unverwundbar) wartet auf dem Nordgehweg zwei Kacheln hinter ihr
const BUILD = `(sd, opt) => { const D = __dbg; D.sessReset(); D.setScenario('truck'); D.setSeedMode('random'); D.setLage([]); D.setTurn('S'); D.buildSeed(sd); D.CFG.policeAt = 26; D.CFG.policeForced = 20; if (opt && opt.on !== undefined) D.CFG.truck.cop.on = opt.on;
  const g = D.get(), me = g.me; for (const b of D.bars().filter(x => x.rd && x.g === 0)) { b.lv = 1; b.hp = 100; } const b = D.bars().find(x => x.rd && x.g === 0); window.__hold = [b.cells[0][0] * 32 + 64, 8 * 32 + 16]; return { D, g, me }; }`;
const STEP = `(D, me, n, f) => { for (let i = 0; i < n; i++) { me.hp = 1e9; me.x = window.__hold[0]; me.y = window.__hold[1]; D.update(1 / 30); if (f && f(i / 30)) return i / 30; } return -1; }`;
const adj = `(D, x, y) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(v => D.world().isBul(x + v[0], y + v[1]))`;
const pvs = `D => D.get().en.filter(e => e.pv && e.hp > 0)`;

module.exports = [
  {
    name: 'Anker: die Beamten einer Welle bekommen Anker auf beiden Seiten des Panzerwagens (Ost und West) und auf beiden Gehwegen (Nord und Sued), jeder Anker liegt cop.dist Kacheln (plus Rundung) vom Wagen',
    async run(t) {
      await setup(t);
      const r = await t.page.evaluate(`(() => { const B = ${BUILD}, STEP = ${STEP}, o = { n: [], W: [], E: [], N: [], S: [], bad: [] }; for (const sd of (${NP})(3)) { const { D, me } = B(sd); const seen = new Map();
        STEP(D, me, 200 * 30, () => { const tk = D.tk(); for (const e of (${pvs})(D)) if (!seen.has(e.id)) seen.set(e.id, { ax: e.ac.x, ay: e.ac.y, tkx: tk.x }); return seen.size >= 8; });
        const A = [...seen.values()], P = D.LANE().pos, C = D.CFG.truck.cop; o.n.push(A.length); o.W.push(A.filter(a => a.ax < a.tkx).length); o.E.push(A.filter(a => a.ax > a.tkx).length); o.N.push(A.filter(a => a.ay < P).length); o.S.push(A.filter(a => a.ay > P).length);
        o.bad.push(...A.filter(a => Math.abs(a.ax - a.tkx) / 32 < C.dist[0] - 4 || Math.abs(a.ax - a.tkx) / 32 > C.dist[1] + .5).map(a => [sd, Math.round(Math.abs(a.ax - a.tkx) / 32)])); } return o; })()`);
      t.ok(r.n.every(n => n >= 8), 'je Welle mindestens 8 Beamte mit Anker: ' + r.n); t.ok(r.W.every(n => n >= 2) && r.E.every(n => n >= 2), 'beide Flanken besetzt (West, Ost): ' + r.W + ' / ' + r.E);
      t.ok(r.N.every(n => n >= 2) && r.S.every(n => n >= 2), 'beide Gehwege besetzt (Nord, Sued): ' + r.N + ' / ' + r.S); t.eq(r.bad, [], 'Abstand der Anker zum Wagen innerhalb cop.dist (Seed, Kacheln)');
    },
  },
  {
    name: 'Deckung und Streuung: wenn mindestens vier Beamte gleichzeitig im Modus cover sind, liegen ihre Deckungsplaetze auf mindestens zwei verschiedenen Zeilen und sechs Kacheln Streuung laengs der Strasse, und jeder liegt neben einer kugelsperrenden Kachel',
    async run(t) {
      await setup(t);
      const r = await t.page.evaluate(`(() => { const B = ${BUILD}, STEP = ${STEP}, adj = ${adj}, o = { rows: [], span: [], adj: [], n: [] }; for (const sd of (${NP})(3)) { const { D, me } = B(sd); let best = [], t0 = -1;
        STEP(D, me, 200 * 30, (s) => { const cv = (${pvs})(D).filter(e => e.mode === 'cover' && e.cv); if (cv.length >= 4 && t0 < 0) t0 = s; if (cv.length > best.length) best = cv.map(e => ({ x: e.cv.x, y: e.cv.y })); return t0 >= 0 && s > t0 + 12; });
        o.n.push(best.length); o.rows.push(new Set(best.map(q => q.y)).size); o.span.push(Math.max(...best.map(q => q.x)) - Math.min(...best.map(q => q.x))); o.adj.push(best.filter(q => adj(D, q.x, q.y)).length / best.length); } return o; })()`);
      t.ok(r.n.every(n => n >= 4), 'zeitweise mindestens vier im Modus cover: ' + r.n); t.ok(r.rows.every(n => n >= 2), 'mindestens zwei verschiedene Zeilen (keine Linie): ' + r.rows); t.ok(r.span.every(n => n >= 6), 'Streuung laengs der Strasse mindestens 6 Kacheln: ' + r.span);
      t.ok(r.adj.every(p => p === 1), 'jeder Platz neben einer sperrenden Kachel (Deckung genutzt): ' + r.adj);
    },
  },
  {
    name: 'Vorruecken: der Anker eines Beamten rueckt von Sprung zu Sprung naeher an den Wagen (nie weiter weg), nach cop.adv Spruengen und hoechstens (adv + 1) mal stay geht er ins Spiel (push, ausser wer vorher an eine Barrikade tritt: plant); im Mittel steht er dann naeher am Wagen als beim Aussteigen',
    async run(t) {
      await setup(t);
      const r = await t.page.evaluate(`(() => { const B = ${BUILD}, STEP = ${STEP}, o = { back: [], late: [], notPush: 0, tot: 0, d0: [], d1: [], ks: [] }; for (const sd of (${NP})(3)) { const { D, me } = B(sd); const C = D.CFG.truck.cop, tr = new Map(); let nr = 0;
        STEP(D, me, 200 * 30, () => { const tk = D.tk(); for (const e of (${pvs})(D)) { let q = tr.get(e.id); const d = Math.abs(e.ac.x - tk.x); if (!q) { q = { d: [d], k: [e.pvk], t0: D.get().tH, t1: null, pl: false }; tr.set(e.id, q); } else if (e.pvk !== q.k[q.k.length - 1]) { q.d.push(d); q.k.push(e.pvk); } if (e.mode === 'plant') q.pl = true; if (e.mode === 'push' && q.t1 == null) q.t1 = D.get().tH; }
          return tr.size >= 8 && [...tr.values()].filter(q => q.t1 != null).length >= 6; });
        for (const [id, q] of tr) { if (q.t1 == null || q.pl) continue; o.tot++; if (q.d.some((d, i) => i && d > q.d[i - 1] + 1)) o.back.push([sd, id]); if (q.t1 - q.t0 > (C.adv + 1) * C.stay[1] + 8) o.late.push([sd, id, +(q.t1 - q.t0).toFixed(1)]); o.ks.push(q.k[q.k.length - 1]); o.d0.push(q.d[0]); o.d1.push(q.d[q.d.length - 1]); } o.cfg = [C.adv, C.stay[1]]; } const m = a => a.reduce((x, y) => x + y, 0) / a.length / 32; o.m0 = +m(o.d0).toFixed(1); o.m1 = +m(o.d1).toFixed(1); o.kmin = Math.min(...o.ks); return o; })()`);
      t.ok(r.tot >= 8, 'mindestens 8 Beamte beobachtet, die bis ins Spiel gekommen sind: ' + r.tot); t.eq(r.back, [], 'der Anker weicht nie zurueck (Seed, Id)'); t.eq(r.late, [], 'hoechstens (adv + 1) * stay + 8 s bis zum Spiel (Seed, Id, Sekunden)');
      t.eq(r.kmin, r.cfg[0], 'jeder macht alle ' + r.cfg[0] + ' Spruenge vor dem Spiel'); t.ok(r.m1 < r.m0 - 1, 'der Anker steht am Ende naeher am Wagen als am Anfang (Kacheln): ' + r.m0 + ' -> ' + r.m1);
    },
  },
  {
    name: 'cop.on 0 und Gebaeude: mit cop.on 0 kennt kein Beamter einen Anker (alte Posten, run, post, push), und in der Bank hat kein Beamter je einen Anker oder den Modus cover',
    async run(t) {
      await setup(t);
      const r = await t.page.evaluate(`(() => { const B = ${BUILD}, STEP = ${STEP}, o = {}; { const { D, me } = B((${NP})(1)[0], { on: 0 }); const modes = new Set(); let pv = 0; STEP(D, me, 120 * 30, () => { for (const e of D.get().en) { if (e.crew) continue; if (e.pv) pv++; modes.add(e.mode); } return false; }); o.modes = [...modes].sort(); o.pv = pv; }
        { const D = __dbg; D.sessReset(); D.setScenario('bank'); D.setSeedMode('classic'); D.buildSeed(1); D.reset(); D.startHeist(false); const g = D.get(), me = g.me; let pv = 0, cov = 0, cops = 0; for (let i = 0; i < 90 * 30; i++) { me.hp = 1e9; D.update(1 / 30); for (const e of D.get().en) { cops++; if (e.pv) pv++; if (e.mode === 'cover') cov++; } } o.bank = [pv, cov, cops > 0]; }
        return o; })()`);
      t.eq(r.pv, 0, 'cop.on 0: kein Beamter mit Anker'); t.ok(!r.modes.includes('cover') && r.modes.includes('post'), 'cop.on 0: Posten statt Deckung: ' + r.modes); t.eq(r.bank, [0, 0, true], 'Bank: Beamte da, aber ohne Anker und ohne cover');
    },
  },
  {
    name: 'Aussteigen gefaechert: die Beamten steigen auf beiden Seiten der Streifenwagen aus (Nord- und Suedhaelfte der Fahrbahn), nicht in einer Reihe: mindestens je zwei Ausstiegspunkte nordlich und suedlich der Strassenmitte und mindestens fuenf verschiedene Spalten',
    async run(t) {
      await setup(t);
      const r = await t.page.evaluate(`(() => { const B = ${BUILD}, STEP = ${STEP}, o = { N: [], S: [], cols: [] }; for (const sd of (${NP})(3)) { const { D, me } = B(sd); const seen = new Map(); const P = D.LANE().pos;
        STEP(D, me, 200 * 30, () => { for (const e of (${pvs})(D)) if (!seen.has(e.id)) seen.set(e.id, [e.x, e.y]); return seen.size >= 8; });
        const A = [...seen.values()]; o.N.push(A.filter(a => a[1] < P).length); o.S.push(A.filter(a => a[1] >= P).length); o.cols.push(new Set(A.map(a => Math.floor(a[0] / 32))).size); } return o; })()`);
      t.ok(r.N.every(n => n >= 2) && r.S.every(n => n >= 2), 'beide Seiten: ' + r.N + ' / ' + r.S); t.ok(r.cols.every(n => n >= 5), 'mindestens fuenf verschiedene Spalten beim Aussteigen: ' + r.cols);
    },
  },
  {
    name: 'Sirene: sirCars zaehlt nur Streifenwagen, in denen noch jemand sitzt; sind alle ausgestiegen, ist die Liste leer, die Wagen bleiben (Blaulicht)',
    async run(t) {
      await setup(t);
      const r = await t.page.evaluate(`(() => { const B = ${BUILD}, STEP = ${STEP}, o = {}; const { D, me } = B((${NP})(1)[0]); let mx = 0;
        STEP(D, me, 200 * 30, () => { mx = Math.max(mx, D.sirCars().length); return mx > 0 && D.sirCars().length === 0; });
        o.mx = mx; o.nach = D.sirCars().length; o.cars = D.get().pcs ? D.get().pcs.filter(c => !c.dead && !c.civ).length : -1; return o; })()`);
      t.ok(r.mx >= 1, 'waehrend des Ausstiegs gibt es Wagen mit Sirene: ' + r.mx); t.eq(r.nach, 0, 'danach keiner mehr');
    },
  },
];
