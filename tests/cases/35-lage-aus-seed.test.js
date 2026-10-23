// Lage der Strasse aus dem Seed (Plan Mehr Abwechslung, Sprint 4, Stufe 1): layoutFor dreht und spiegelt die handgebauten Karten (Juwelier, Tankstelle, Museum, Casino) aus Seed und Szenario (turnFor, CFG.turn),
// Bank und Transporter bleiben unberuehrt. Host und Clients kennen Seed und Szenario, das Netz uebertraegt nichts Neues (VER 21 haelt alte Staende fern).
// Was bewiesen wird: gleichmaessige Verteilung der acht Lagen, Gleichheit mit dem Erzwingen (setTurn) und mit turnLayout, die Basis (layoutBase) bleibt wie sie war, CFG.turn schaltet ab und schraenkt ein, Coop ohne Schalter baut gleich.
const { coopGame } = require('../lib');
const SC = ['jewel', 'gas', 'museum', 'casino'];
const LAGEN = ['S', 'N', 'E', 'W', 'S+', 'N+', 'E+', 'W+'];

module.exports = [
  {
    name: 'Lage aus dem Seed: gleichmaessig ueber die acht Lagen (je 3000 Seeds, drei Seed-Bereiche), Bank und Transporter bleiben Sued',
    async run(t) {
      const r = await t.page.evaluate(({ SC }) => {
        const D = __dbg, out = {}, bad = [];
        for (const sc of SC.concat('bank', 'truck')) {
          const cnt = {}, sides = {}; let mir = 0, n = 0;
          for (const [from, step] of [[1, 1], [100000, 7], [987001, 13]]) for (let i = 0; i < 1000; i++) { const k = D.turnFor(from + i * step, sc); cnt[k] = (cnt[k] || 0) + 1; sides[k[0]] = (sides[k[0]] || 0) + 1; if (k[1]) mir++; n++; }
          out[sc] = cnt;
          if (sc === 'bank' || sc === 'truck') { if (Object.keys(cnt).join() !== 'S') bad.push(sc + ' wird gedreht: ' + JSON.stringify(cnt)); continue; }
          // Erwartung 375 je Lage (sd 18), Seite 750 (sd 25), gespiegelt 1500 (sd 27): Grenzen bei rund fuenf Standardabweichungen
          for (const l of ['S', 'N', 'E', 'W', 'S+', 'N+', 'E+', 'W+']) if (Math.abs((cnt[l] || 0) - 375) > 90) bad.push(sc + ' Lage ' + l + ': ' + (cnt[l] || 0) + ' von 3000');
          for (const s of ['S', 'N', 'E', 'W']) if (Math.abs((sides[s] || 0) - 750) > 125) bad.push(sc + ' Seite ' + s + ': ' + (sides[s] || 0));
          if (Math.abs(mir - 1500) > 135) bad.push(sc + ' gespiegelt: ' + mir);
        }
        return { bad, out };
      }, { SC });
      t.eq(r.bad, [], 'Verteilung der Lagen');
    },
  },
  {
    name: 'Lage aus dem Seed: layoutFor gleich dem Erzwingen mit setTurn und gleich turnLayout auf der Basis, die Basis (layoutBase) bleibt Sued, Bank und Transporter sind gleich der Basis',
    timeout: 120000,
    async run(t) {
      await t.loadInpage('turn.js');
      const r = await t.page.evaluate(({ SC }) => {
        const D = __dbg, bad = [], seen = {}; let n = 0;
        for (const sc of SC.concat('bank', 'truck')) {
          D.setScenario(sc); D.setSeedMode('random'); D.setLage([]);
          for (let seed = 1; seed <= 60; seed++) {
            D.setTurn(null);
            const tf = D.turnFor(seed, sc), auto = D.layoutFor(seed), ha = TN.layHash(D, auto);
            D.setTurn(tf); const hf = TN.layHash(D, D.layoutFor(seed));
            D.setTurn(null); const base = D.layoutBase(seed), road = !!base.road, hb = TN.layHash(D, base);
            const hm = tf === 'S' ? hb : (D.setTurn(null), TN.layHash(D, D.turnLayout(D.layoutBase(seed), tf[0], tf[1] === '+')));
            if (ha !== hf) bad.push(sc + '#' + seed + ': layoutFor weicht vom Erzwingen ab (' + tf + ')');
            if (ha !== hm) bad.push(sc + '#' + seed + ': layoutFor weicht von turnLayout ab (' + tf + ')');
            if (road) bad.push(sc + '#' + seed + ': die Basis traegt road');
            if ((sc === 'bank' || sc === 'truck') && ha !== hb) bad.push(sc + '#' + seed + ': Bank oder Transporter wurde veraendert');
            if (sc !== 'bank' && sc !== 'truck') { const s = sc + ' ' + tf; seen[s] = 1; }
            n++;
          }
        }
        return { bad: bad.slice(0, 10), n, lagen: Object.keys(seen).length };
      }, { SC });
      t.eq(r.bad, [], 'Abweichungen');
      t.ok(r.n === 360 && r.lagen >= 28, 'alle Szenarien und fast alle Lagen kamen vor: ' + JSON.stringify(r));
    },
  },
  {
    name: 'Lage aus dem Seed: CFG.turn schaltet ab (on 0) und schraenkt ein (sides, mirror), setTurn(null) laesst den Seed entscheiden',
    async run(t) {
      const r = await t.page.evaluate(() => {
        const D = __dbg, C = D.CFG.turn, out = {};
        const cnt = (sc, from) => { const c = {}; for (let s = from; s < from + 400; s++) { const k = D.turnFor(s, sc); c[k] = (c[k] || 0) + 1; } return c; };
        out.normal = Object.keys(cnt('museum', 1)).length;
        C.on = 0; out.aus = JSON.stringify(cnt('museum', 1)); C.on = 1;
        const sides = C.sides.slice(), mirror = C.mirror; C.sides = ['E']; C.mirror = 0; out.nurE = JSON.stringify(cnt('casino', 1)); C.sides = ['N', 'W']; C.mirror = 1; out.nw = Object.keys(cnt('gas', 1)).sort().join(); C.sides = sides; C.mirror = mirror;
        // layoutFor folgt der Konfiguration
        D.setScenario('jewel'); D.setSeedMode('random'); D.setLage([]); D.setTurn(null); C.sides = ['W']; C.mirror = 0; const L = D.layoutFor(9); out.road = L.road && L.road.side; C.sides = sides; C.mirror = mirror;
        D.setTurn('N'); out.forceN = D.layoutFor(9).road.side; D.setTurn('S'); out.forceS = !!D.layoutFor(9).road; D.setTurn(null);
        return out;
      });
      t.ok(r.normal === 8, 'acht Lagen im Normalbetrieb: ' + r.normal);
      t.eq(r.aus, '{"S":400}', 'CFG.turn.on 0 gibt nur Sued');
      t.eq(r.nurE, '{"E":400}', 'sides [E] ohne Spiegelung gibt nur E');
      t.eq(r.nw, 'N+,W+', 'sides [N,W] mit Spiegelung gibt N+ und W+');
      t.eq([r.road, r.forceN, r.forceS], ['W', 'N', false], 'layoutFor folgt CFG.turn, setTurn erzwingt, S ist die Basis');
    },
  },
  {
    name: 'Lage aus dem Seed: im Spiel (buildSeed, reset) liegt die Strasse an der Seite aus dem Seed, Hallen und Beute der Basis bleiben (gleiche Halle, gleiche Beute-Summe)',
    timeout: 120000,
    async run(t) {
      const r = await t.page.evaluate(({ SC }) => {
        const D = __dbg, bad = []; let n = 0;
        for (const sc of SC) {
          D.setScenario(sc); D.setSeedMode('random'); D.setLage([]);
          for (let seed = 100; seed < 112; seed++) {
            D.setTurn(null); const base = D.layoutBase(seed), want = D.turnFor(seed, sc), ib = D.validateMap(base).info;
            D.buildSeed(seed); const L = D.LAY(), ln = D.LANE(), il = D.validateMap(L).info; n++;
            if (ln.side !== want[0]) bad.push(sc + '#' + seed + ': Strasse an ' + ln.side + ' statt ' + want[0]);
            if (L.seed !== seed || (L.hall || '') !== (base.hall || '')) bad.push(sc + '#' + seed + ': Seed oder Halle weichen ab');
            // Kennzahlen, die sich beim Drehen nicht aendern duerfen: Beute-Summe, Kameras, Wachen, Material, Wagenplaetze, Posten, Wege Start-Tresor und Tresor-Ausgang, Lage-Tags
            const key = (l, i) => JSON.stringify([i.loot && i.loot.v, i.cams, i.guards, i.mat, i.slots, i.posts, i.pathSV, i.pathVE, l.mission.lg]);
            if (key(L, il) !== key(base, ib)) bad.push(sc + '#' + seed + ': Kennzahlen weichen von der Basis ab ' + key(L, il) + ' statt ' + key(base, ib));
          }
        }
        return { bad: bad.slice(0, 8), n };
      }, { SC });
      t.eq(r.bad, [], 'Abweichungen');
      t.ok(r.n === 48, 'alle geprueft: ' + r.n);
    },
  },
  // Coop ohne Schalter: Host und Client bauen die Lage allein aus Seed und Szenario (kein Netzfeld), je Szenario zwei Seeds mit verschiedener Lage, die nicht Sued ist
  ...SC.map(sc => ({
    name: 'Lage aus dem Seed: Coop zu zweit auf ' + sc + ' ohne Schalter (Host und Client bauen dieselbe Lage aus dem Seed, vom Start bis zum Sieg)',
    slow: true,
    timeout: 240000,
    async run(t) {
      const seeds = await t.page.evaluate(({ sc }) => { const D = __dbg, out = [], seen = new Set(); for (let s = 1; s < 400 && out.length < 3; s++) { const k = D.turnFor(s, sc); if (k[0] !== 'S' && !seen.has(k[0])) { seen.add(k[0]); out.push(s); } } return out; }, { sc });
      t.ok(seeds.length === 3, 'drei Seeds mit verschiedenen Seiten gefunden: ' + seeds);
      const res = []; for (const s of seeds) res.push(await coopGame(t.env, sc, s));
      t.note(res.map(r => r.tag).join(', '));
      t.eq(res.flatMap(r => r.bad.map(b => r.tag + ': ' + b)), [], 'Abweichungen');
    },
  })),
];
