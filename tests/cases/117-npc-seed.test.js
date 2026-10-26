// Coop-Ausbau W0 (docs/coop-ausbau.md, Spur W): Die Ausgangslage der NPCs (Zivilisten: Zelle in der Kundenhalle, Tempo, Wartezeit, Blickrichtung; die Standardwartezeit aller NPCs) kommt aus dem Kartenseed
// (mulberry32 ueber LAY.seed), nicht mehr aus Math.random. Gleicher Seed heisst gleiche Ausgangslage, auch beim zweiten Start derselben Karte, bei Host und Client, und unabhaengig vom Zufallsstrom des Browsers.
// Die Verteilung bleibt dieselbe wie vorher (Zelle aus der Kundenhalle, Tempo 32 bis 42, Wartezeit 0 bis 3, Winkel 0 bis 6,28). Grund (Messung vom 26. Oktober 2026): Karte, Beute und Lage waren bei gleichem Seed
// gleich, die Ausgangslage der NPCs nicht, und die spuert man beim Schleichen. Netz: VER 46 (derselbe Seed startet anders), sonst nichts.
const BUILD = `(D, sc, seed) => { D.setScenario(sc); D.setSeedMode('random'); D.setLage([]); D.setTurn('S'); D.buildSeed(seed); D.CFG.policeAt = 1e6; D.CFG.policeForced = 1e6; D.reset(); }`;
const SIG = `(D) => D.get().npcs.map(q => [q.id, q.k, Math.round(q.x * 10) / 10, Math.round(q.y * 10) / 10, +q.spd.toFixed(3), +q.wait.toFixed(3), +(q.a || 0).toFixed(3)].join(',')).join(';')`;

module.exports = [
  {
    name: 'NPC-Ausgangslage: gleicher Seed gibt dieselben NPCs (Ort, Tempo, Wartezeit, Blick) in allen Gebaeude-Szenarien, beim zweiten Aufbau und mit voellig anderem Zufallsstrom des Browsers, verschiedene Seeds geben verschiedene',
    async run(t) {
      const r = await t.page.evaluate(`(() => { const D = __dbg, build = ${BUILD}, sig = ${SIG}, o = { gleich: [], strom: [], versch: [] }, orig = Math.random;
        try { for (const sc of ['bank', 'jewel', 'gas', 'museum', 'casino']) { const s = {};
          for (const seed of [101, 202, 303]) { build(D, sc, seed); const a = sig(D); build(D, sc, seed); const b = sig(D); Math.random = () => .1; build(D, sc, seed); const c = sig(D); Math.random = () => .9; build(D, sc, seed); const d = sig(D); Math.random = orig;
            o.gleich.push(a === b); o.strom.push(a === c && a === d); s[seed] = a; o.n = (o.n || 0) + (a.match(/;/g) || []).length + 1; }
          o.versch.push(new Set(Object.values(s)).size); } } finally { Math.random = orig; } return o; })()`);
      t.ok(r.gleich.length === 15 && r.gleich.every(x => x), 'zweiter Aufbau desselben Seeds gleich (15 Faelle): ' + JSON.stringify(r.gleich));
      t.ok(r.strom.every(x => x), 'unabhaengig vom Zufallsstrom des Browsers (Math.random auf .1 und .9 gestellt): ' + JSON.stringify(r.strom));
      t.ok(r.versch.every(n => n === 3), 'drei Seeds geben drei verschiedene Ausgangslagen je Szenario: ' + JSON.stringify(r.versch));
      t.ok(r.n > 30, 'es gab NPCs, die verglichen wurden: ' + r.n);
    },
  },
  {
    name: 'NPC-Ausgangslage, Verteilung unveraendert: Zivilisten stehen auf Zellen der Kundenhalle, Tempo 32 bis 42, Wartezeit 0 bis 3, Winkel 0 bis 6,28, Zahl gleich LAY.civ; ueber viele Seeds mehrere verschiedene Zellen',
    async run(t) {
      const r = await t.page.evaluate(`(() => { const D = __dbg, build = ${BUILD}, o = { bad: [], cells: new Set(), firstA: new Set(), spd: [99, 0], wait: [99, 0], a: [99, 0], n: 0, civOk: true }; 
        for (const sc of ['bank', 'jewel']) for (let seed = 1; seed <= 25; seed++) { build(D, sc, seed * 37); const L = D.world().LOBBY.map(c => c[0] + ',' + c[1]), civ = D.get().npcs.filter(q => q.k === 'civ');
          if (civ.length !== D.LAY().civ) o.civOk = false;
          for (const q of civ) { o.n++; const cell = Math.floor(q.x / 32) + ',' + Math.floor(q.y / 32); if (!L.includes(cell)) o.bad.push(sc + seed + ':' + cell); if (sc === 'bank') o.cells.add(cell); if (sc === 'bank' && q === civ[0]) o.firstA.add(q.a.toFixed(4)); o.spd = [Math.min(o.spd[0], q.spd), Math.max(o.spd[1], q.spd)]; o.wait = [Math.min(o.wait[0], q.wait), Math.max(o.wait[1], q.wait)]; o.a = [Math.min(o.a[0], q.a), Math.max(o.a[1], q.a)]; } }
        o.cells = o.cells.size; o.firstA = o.firstA.size; return o; })()`);
      t.eq(r.bad, [], 'jeder Zivilist steht auf einer Zelle der Kundenhalle');
      t.eq(r.civOk, true, 'Zahl der Zivilisten gleich LAY.civ');
      t.ok(r.spd[0] >= 32 && r.spd[1] < 42, 'Tempo im Bereich 32 bis 42: ' + JSON.stringify(r.spd));
      t.ok(r.wait[0] >= 0 && r.wait[1] < 3, 'Wartezeit im Bereich 0 bis 3: ' + JSON.stringify(r.wait));
      t.ok(r.a[0] >= 0 && r.a[1] < 6.29, 'Winkel im Bereich 0 bis 6,28: ' + JSON.stringify(r.a));
      t.ok(r.cells > 5, 'ueber 25 Seeds viele verschiedene Zellen (nicht immer dieselbe): ' + r.cells);
      t.ok(r.firstA > 18, 'der Zufallsstrom haengt vom Seed ab (25 Seeds geben mehr als 18 verschiedene Blickwinkel des ersten Zivilisten): ' + r.firstA);
      t.ok(r.n > 100, 'genug Zivilisten gemessen: ' + r.n);
    },
  },
  {
    name: 'NPC-Wege bei gleichem Seed: Patrouillen und Zivilisten laufen in der Erkundungsphase gleich (Wartezeiten und Ziele aus einem Strom je NPC), unabhaengig vom Zufallsstrom des Browsers, in allen Gebaeude-Szenarien nach 10, 20 und 40 Sekunden',
    async run(t) {
      const r = await t.page.evaluate(`(() => { const D = __dbg, build = ${BUILD}, o = { gleich: [], bewegt: [] }, orig = Math.random;
        const run = (sc, seed, rnd) => { Math.random = rnd; build(D, sc, seed); const out = []; try { for (let s = 1; s <= 40; s++) { for (let i = 0; i < 30; i++) { const m = D.get().me; m.hp = 1e9; D.update(1 / 30); } if (s === 10 || s === 20 || s === 40) out.push(D.get().npcs.map(q => q.id + ':' + Math.round(q.x) + ',' + Math.round(q.y)).join(';')); } } finally { Math.random = orig; } return out; };
        for (const sc of ['bank', 'jewel', 'gas', 'museum', 'casino']) { const a = run(sc, 404, () => .1), b = run(sc, 404, () => .9); o.gleich.push(a.join('|') === b.join('|')); o.bewegt.push(a[0] !== a[2]); }
        return o; })()`);
      t.ok(r.gleich.every(x => x), 'dieselben Wege mit Math.random auf .1 und .9 (fuenf Szenarien): ' + JSON.stringify(r.gleich));
      t.ok(r.bewegt.every(x => x), 'die NPCs bewegen sich tatsaechlich (Stand nach 10 s ungleich Stand nach 40 s): ' + JSON.stringify(r.bewegt));
    },
  },
  {
    name: 'NPC-Wege, Strom je NPC: Jeder NPC hat seinen eigenen Strom (die Folge der Wartezeiten ist je NPC verschieden, Patrouillen laufen nicht im Gleichschritt) und derselbe Strom bei gleichem Seed',
    async run(t) {
      const r = await t.page.evaluate(`(() => { const D = __dbg, build = ${BUILD}, o = { distinct: [], same: [] }, draw = () => D.get().npcs.map(n => n.rr().toFixed(6));
        for (const sc of ['bank', 'jewel', 'casino']) { build(D, sc, 101); const a = draw(); o.distinct.push([new Set(a).size, a.length]); build(D, sc, 101); o.same.push(draw().join() === a.join()); }
        return o; })()`);
      t.ok(r.distinct.every(d => d[0] === d[1] && d[1] > 4), 'jeder NPC zieht eine andere Zahl (verschiedene Strome): ' + JSON.stringify(r.distinct));
      t.ok(r.same.every(x => x), 'derselbe Seed gibt dieselben Strome: ' + JSON.stringify(r.same));
    },
  },
  {
    name: 'NPC-Ausgangslage im Coop: Host und Client bauen beim Start einer Runde dieselben NPCs (Ids, Orte, Wartezeiten), auch beim erneuten Aufbau derselben Karte',
    async run(t) {
      await t.loadTool('loopnet.js'); await t.loadInpage('coop.js');
      const r = await t.page.evaluate(`(() => { const G = CT.mkGame('bank', 321, 2), A = G.A, B = G.clients[0], sig = ${SIG}, o = {};
        A.reset(); B.reset(); o.start = [sig(A) === sig(B), sig(A).length > 50]; const s0 = sig(A); A.reset(); B.reset(); o.nochmal = [sig(A) === s0, sig(B) === s0];
        return o; })()`);
      t.eq(r.start, [true, true], 'Host und Client: gleiche NPCs nach dem Aufbau');
      t.eq(r.nochmal, [true, true], 'beim erneuten Aufbau derselben Karte wieder dieselben');
    },
  },
];
