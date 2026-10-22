// Posten, Wagenplaetze und Hintertueren aus der Geometrie (Plan Mehr Abwechslung, Sprint 2): fehlt einer Karte LAY.posts, LAY.slots oder LAY.backDoors, leitet fillDerived sie mit autoPosts ab (finishLay, der letzte Schritt von layoutFor).
// Die Handlisten der heutigen Karten bleiben unveraendert (layout-hash). Hier wird bewiesen, dass die abgeleiteten Listen auf jeder Karte, jedem Grundriss und jeder der acht Lagen gueltig sind und im Spiel funktionieren:
// Posten stehen frei und sehen auf Fenster oder Tueren, kein Posten im Gefahrenradius einer Zapfsaeule, jede verriegelte Hintertuer hat ihren Aufbruch-Posten, drei Anker, genug Wagenplaetze, validateMap ohne Fehler.
const SC = ['bank', 'jewel', 'gas', 'museum', 'casino'];
const LAGEN = ['S', 'S+', 'N', 'N+', 'E', 'E+', 'W', 'W+'];

async function setup(t) { await t.loadTool('mapcheck.js'); }

// Je Karte die ersten Seeds, die alle Grundrisse zeigen (Bank: feste Seeds und classic)
const SEEDS = `(sc) => { const D = __dbg; D.setScenario(sc); D.setSeedMode('random'); D.setLage([]);
  if (sc === 'bank') return [5000, 5001, 5013, 5021];
  const seen = {}, out = []; for (let s = 1; s < 3000 && out.length < 5; s++) { const h = D.layoutFor(s).hall; if (!seen[h]) { seen[h] = 1; out.push(s) } } return out; }`;

module.exports = [
  {
    name: 'Ableiten: Hintertueren aus den L-Kacheln am Gebaeuderand sind auf allen Karten, Grundrissen und Lagen gleich der Handliste',
    timeout: 240000,
    async run(t) {
      await setup(t);
      const r = await t.page.evaluate(({ SC, LAGEN, SEEDS }) => {
        const D = __dbg, out = { n: 0, bad: [] }, seeds = eval(SEEDS), key = a => JSON.stringify(a.slice().sort((p, q) => p[0] - q[0] || p[1] - q[1]));
        for (const sc of SC) for (const sd of (sc === 'bank' ? ['classic'] : []).concat(seeds(sc))) {
          for (const side of (sd === 'classic' || sd === 5000 || sd === seeds(sc)[0] ? LAGEN : ['S'])) {
            D.setScenario(sc); D.setSeedMode(sd === 'classic' ? 'classic' : 'random'); D.setLage([]);
            let lay = D.layoutFor(sd); if (side !== 'S') lay = D.turnLayout(lay, side[0], side[1] === '+');
            const hand = key(lay.backDoors), abg = key(D.derivedBackDoors(lay)); out.n++;
            if (hand !== abg) out.bad.push(sc + '#' + sd + ' ' + side + ': Hand ' + hand + ' abgeleitet ' + abg);
          }
        }
        return out;
      }, { SC, LAGEN, SEEDS });
      t.ok(r.n >= 60, 'genug Faelle: ' + r.n);
      t.eq(r.bad, [], 'abgeleitete Hintertueren gleich der Handliste');
    },
  },
  {
    name: 'Ableiten: abgeleitete Posten und Wagenplaetze sind auf jeder Karte, jedem Grundriss und jeder Lage gueltig (frei, mit Sicht, Tuerposten, Anker, Plaetze, validateMap)',
    timeout: 290000,
    async run(t) {
      await setup(t);
      const r = await t.page.evaluate(({ SC, LAGEN, SEEDS }) => {
        const D = __dbg, T = 32, seeds = eval(SEEDS), bad = [], stats = []; let n = 0;
        for (const sc of SC) for (const sd of (sc === 'bank' ? ['classic'] : []).concat(seeds(sc))) {
          const first = sd === 'classic' || sd === 5000 || sd === seeds(sc)[0];
          for (const side of (first ? LAGEN : ['S'])) {
            D.setScenario(sc); D.setSeedMode(sd === 'classic' ? 'classic' : 'random'); D.setLage([]);
            let lay = D.layoutFor(sd); if (side !== 'S') lay = D.turnLayout(lay, side[0], side[1] === '+');
            lay.posts = null; if (lay.road) lay.road.slots = null; else lay.slots = null; D.finishLay(lay);
            D.buildLay(lay); const L = D.LAY(), w = D.world(), ln = D.LANE(), tag = sc + '#' + sd + ' ' + side + (L.hall ? ' ' + L.hall : ''); n++;
            // 1 validateMap (die Welt der gedrehten Bank ist 28 statt 30 breit, bekannt und im Test 28 ausgenommen)
            const rep = D.validateMap(L), errs = rep.err.filter(e => !(e.r === 'welt' && sc === 'bank' && /[EW]/.test(side[0]))).map(e => e.r + ': ' + e.m);
            if (errs.length) bad.push(tag + ' validateMap ' + errs.join(' | '));
            // 2 Posten: frei, eindeutig, genug, mit Sicht auf Fenster oder Tueren
            const seen = new Set(); let sees = 0;
            const tg = []; (L.wins || []).forEach(x => tg.push([x.px, x.py])); L.spots.filter(s => s.side).forEach(s => tg.push([s.x, s.y]));
            for (const p of L.posts) {
              const k = p.x + ',' + p.y; if (seen.has(k)) bad.push(tag + ' doppelter Posten ' + k); seen.add(k);
              if (w.isSol(p.x, p.y)) bad.push(tag + ' Posten in Festem ' + k);
              const px = p.x * T + 16, py = p.y * T + 16; if (tg.some(q => Math.hypot(q[0] - px, q[1] - py) < 14 * T && D.los(px, py, q[0], q[1]))) sees++;
            }
            if (L.posts.length < 10) bad.push(tag + ' nur ' + L.posts.length + ' Posten');
            if (sees < L.posts.length * .5) bad.push(tag + ' nur ' + sees + ' von ' + L.posts.length + ' Posten sehen Fenster oder Tueren');
            // 3 verriegelte Hintertueren haben ihren Aufbruch-Posten direkt davor
            for (const s of L.spots.filter(q => q.side && q.lk && !q.ex)) {
              const c0 = s.cells[0], p = L.posts.find(q => q.door && q.door[0] === c0[0] && q.door[1] === c0[1]);
              if (!p) bad.push(tag + ' Hintertuer ' + c0 + ' ohne Aufbruch-Posten'); else if (Math.abs(p.x - c0[0]) + Math.abs(p.y - c0[1]) !== 1) bad.push(tag + ' Aufbruch-Posten nicht direkt vor der Tuer ' + c0);
            }
            // 4 Anker und Wagenplaetze
            const an = L.posts.filter(p => p.anchor); if (an.length < 3) bad.push(tag + ' nur ' + an.length + ' Anker');
            const ends = {}; for (const s of ln.slots) ends[s.end] = (ends[s.end] || 0) + 1;
            if (ln.slots.length < 6 || Object.values(ends).some(v => v < 3)) bad.push(tag + ' Wagenplaetze ' + JSON.stringify(ends));
            // 5 Gefahrenradius um Zapfsaeulen
            for (const q of L.pumps || []) for (const p of L.posts) if (Math.hypot(q.x - p.x, q.y - p.y) < D.CFG.val.danger) bad.push(tag + ' Posten ' + p.x + ',' + p.y + ' im Gefahrenradius von ' + q.x + ',' + q.y);
            if (first) stats.push([tag, L.posts.length, sees]);
          }
        }
        return { n, bad: bad.slice(0, 12), nb: bad.length };
      }, { SC, LAGEN, SEEDS });
      t.ok(r.n >= 60, 'genug Faelle: ' + r.n);
      t.eq(r.bad, [], 'abgeleitete Listen gueltig (' + r.nb + ' Fehler in ' + r.n + ' Faellen)');
    },
  },
  {
    name: 'Ableiten: der Gefahrenradius schlaegt an (Gegenprobe ohne Radius stellt Posten zwischen die Zapfsaeulen) und haelt mit Radius in allen vier Tankstellen-Grundrissen',
    async run(t) {
      await setup(t);
      const r = await t.page.evaluate(({ SEEDS }) => {
        const D = __dbg, seeds = eval(SEEDS)('gas'), out = { mit: [], ohne: [] };
        for (const [key, danger] of [['mit', D.CFG.val.danger], ['ohne', 0]]) {
          D.CFG.val.danger = danger;
          for (const sd of seeds) {
            D.setScenario('gas'); D.setSeedMode('random'); D.setLage([]);
            const lay = D.layoutFor(sd); lay.posts = null; lay.slots = null; D.finishLay(lay); D.buildLay(lay);
            const L = D.LAY(); let min = 99; for (const q of L.pumps) for (const p of L.posts) min = Math.min(min, Math.hypot(q.x - p.x, q.y - p.y));
            out[key].push([L.hall, +min.toFixed(1)]);
          }
        }
        return out;
      }, { SEEDS });
      t.ok(r.mit.length === 4 && r.mit.every(a => a[1] >= 3.7), 'mit Radius ueberall mindestens 3,7 Kacheln: ' + JSON.stringify(r.mit));
      t.ok(r.ohne.some(a => a[1] < 3.7), 'ohne Radius steht mindestens ein Posten im Gefahrenradius (die Probe ist scharf): ' + JSON.stringify(r.ohne));
    },
  },
  {
    name: 'Ableiten: im Spiel besetzen Beamte die abgeleiteten Posten (keiner haengt auf dem Weg, keiner in einer Wand), ungefaehr so viele Posten wie bei der Handliste',
    timeout: 290000,
    async run(t) {
      await setup(t);
      const r = await t.page.evaluate(() => {
        const D = __dbg, T = 32, out = [];
        const cases = [['bank', 'classic'], ['jewel', 1], ['gas', 1], ['museum', 1], ['casino', 1]];
        const play = (sc, sd, derived) => {
          D.setScenario(sc); D.setSeedMode(sd === 'classic' ? 'classic' : 'random'); D.setLage([]);
          const lay = D.layoutFor(sd); if (derived) { lay.posts = null; lay.slots = null; D.finishLay(lay) }
          D.buildLay(lay); const L = D.LAY(); L.wb = (L.wb || 0) + 4; D.CFG.policeAt = 1; D.CFG.policeForced = 1; D.CFG.snp.from = 99; D.CFG.pol.hold = 999; D.CFG.pol.anchorHold = 999;
          D.startHeist(false, D.get().me); const reached = new Set(), first = {}, stuck = new Set(); let inWall = 0, cops = 0;
          for (let i = 0; i < 30 * 100; i++) {
            if (i === 30 * 25 || i === 30 * 50) D.spawnWave();
            const m = D.get().me; m.hp = 1e9; m.x = L.spawn.x; m.y = L.spawn.y; D.update(1 / 30);
            if (i % 15 === 0) for (const e of D.get().en) if (['cop', 'swat', 'shield', 'sniper'].includes(e.kind)) {
              cops++; if (D.isSol(Math.floor(e.x / T), Math.floor(e.y / T))) inWall++;
              if (e.mode === 'post' && e.post) reached.add(L.posts.indexOf(e.post));
              if (e.mode === 'run') { if (first[e.id] == null) first[e.id] = i; else if (i - first[e.id] > 30 * 45) stuck.add(e.id) }
            }
          }
          return { posten: reached.size, inWall, stuck: stuck.size, cops };
        };
        for (const [sc, sd] of cases) out.push({ sc, hand: play(sc, sd, false), abg: play(sc, sd, true) });
        return out;
      });
      for (const c of r) {
        t.eq([c.abg.inWall, c.abg.stuck], [0, 0], c.sc + ': kein Beamter in einer Wand und keiner haengt mehr als 45 s auf dem Weg zum Posten: ' + JSON.stringify(c));
        t.ok(c.abg.posten >= 6, c.sc + ': mindestens sechs abgeleitete Posten besetzt: ' + JSON.stringify(c));
        t.ok(c.abg.posten >= c.hand.posten - 4, c.sc + ': abgeleitete Listen werden ungefaehr so gut besetzt wie die Handlisten: ' + JSON.stringify(c));
      }
      t.note(JSON.stringify(r));
    },
  },
];
