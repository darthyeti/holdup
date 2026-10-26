// E-Auswahl (docs/spielsystem.md, E-Auswahl): Welches Objekt bekommt E, wenn mehrere in Reichweite sind, und wie wechselt Q.
// Gemessen wird mit pickIt/cands (dbg), Zustand wird direkt gesetzt. Der Coop-Test am Ende prueft den Weg Client -> Host ueber die Test-Leitung.
const SC = ['bank', 'jewel', 'gas', 'museum', 'casino'];
const STATES = ['frisch', 'Kameras entdeckt', 'Teilbeute', 'Teilbeute, Tasche voll'];

module.exports = [
  {
    name: 'Auswahl: 32 px innen vor einer Personaltuer (Phase 1) bekommt der Riegel E, in jedem Szenario, jeder Lage und jedem Zustand',
    slow: true,
    async run(t) {
      const r = await t.page.evaluate(([SC, STATES]) => {
        const D = __dbg, bad = []; let n = 0;
        for (const sc of SC) for (const seed of [4242, 77]) for (const turn of [null, 'E', 'W+']) for (const state of STATES) {
          D.setTurn(turn); D.setScenario(sc); D.setSeedMode('random'); D.buildLay(D.layoutFor(seed));
          const G = D.get(), M = G.me, L = D.LAY();
          G.npcs.length = 0;
          if (state !== 'frisch') G.cams.forEach(c => { c.k = true; });
          if (state.startsWith('Teilbeute')) {
            for (const i of G.its.filter(i => i.t === 'note' && i.ok(M))) i.act(M);
            for (const i of G.its.filter(i => i.t === 'vault' && i.ok(M))) i.act(M);
            const first = G.its.find(i => ['bundle', 'good', 'vit'].includes(i.t) && i.ok(M)); if (first) first.act(M);
          }
          if (state.endsWith('voll')) M.units = M.bag;
          for (const sp of L.spots.filter(s => s.side && s.lk)) {
            M.x = sp.x + sp.iv[0] * 32; M.y = sp.y + sp.iv[1] * 32;
            const it = D.pickIt(M, -1); n++;
            if (!it || it.t !== 'lock' || it.x !== sp.x || it.y !== sp.y) bad.push(sc + '#' + seed + ' ' + (turn || '-') + ' ' + state + ' ' + sp.n + ': ' + (it ? it.t : 'nichts'));
          }
        }
        D.setTurn(null);
        return { n, bad: bad.slice(0, 12), nBad: bad.length };
      }, [SC, STATES]);
      t.ok(r.n > 200, 'zu wenige Tueren geprueft: ' + r.n);
      t.eq(r.bad, [], r.nBad + ' von ' + r.n + ' Standpunkten ohne Riegel');
    },
  },
  {
    name: 'Auswahl: der Tuer-Vorrang macht nichts unerreichbar (Kamera, Hauptschalter, Monitore, Notiz, Tresor haben einen Standpunkt, an dem sie E bekommen)',
    async run(t) {
      const r = await t.page.evaluate(([SC]) => {
        const D = __dbg, bad = []; let n = 0;
        for (const sc of SC) for (const seed of [4242, 77]) for (const turn of [null, 'E']) for (const stage of [0, 1]) {
          D.setTurn(turn); D.setScenario(sc); D.setSeedMode('random'); D.buildLay(D.layoutFor(seed));
          const G = D.get(), M = G.me, W = D.world(); G.npcs.length = 0;
          G.cams.forEach(c => { c.k = true; });
          if (stage === 1) for (const i of G.its.filter(i => i.t === 'note' && i.ok(M))) i.act(M);
          const types = stage === 0 ? ['cam', 'sw', 'mon', 'note'] : ['vault'];
          for (const it of G.its.filter(i => types.includes(i.t) && i.ok(M))) {
            let hit = false;
            for (let dx = -it.r; dx <= it.r && !hit; dx += 4) for (let dy = -it.r; dy <= it.r && !hit; dy += 4) {
              if (Math.hypot(dx, dy) >= it.r - 1) continue;
              const x = it.x + dx, y = it.y + dy;
              if ([[-10, -10], [10, -10], [-10, 10], [10, 10]].some(([ax, ay]) => W.isSol(Math.floor((x + ax) / 32), Math.floor((y + ay) / 32)))) continue;
              M.x = x; M.y = y;
              if (D.pickIt(M, -1) === it) hit = true;
            }
            n++;
            if (!hit) bad.push(sc + '#' + seed + ' ' + (turn || '-') + ' ' + it.t + '@' + Math.floor(it.x / 32) + ',' + Math.floor(it.y / 32));
          }
        }
        D.setTurn(null);
        return { n, bad: bad.slice(0, 12), nBad: bad.length };
      }, [SC]);
      t.ok(r.n > 60, 'zu wenige Objekte geprueft: ' + r.n);
      t.eq(r.bad, [], r.nBad + ' von ' + r.n + ' Objekten nirgends erreichbar');
    },
  },
  {
    name: 'Auswahl: alle Beute- und Materialobjekte kennen ihren Platzbedarf, ein Stueck, das nicht passt, rangiert hinten',
    async run(t) {
      const r = await t.page.evaluate(([SC]) => {
        const D = __dbg, miss = {}; let n = 0;
        const LOOT = ['bundle', 'till', 'atm', 'bag', 'tbag', 'good', 'vit', 'mat'];
        for (const sc of SC.concat(['truck'])) {
          D.setTurn(null); D.setScenario(sc); D.setSeedMode('random'); D.buildLay(D.layoutFor(4242));
          for (const i of D.get().its) if (LOOT.includes(i.t)) { n++; if (typeof i.fit !== 'function') miss[sc + ':' + i.t] = 1; }
        }
        // Kuenstlicher Fall: ein Beutestueck, das nicht passt, liegt naeher als eine Kamera; ein passendes liegt noch naeher
        D.setScenario('bank'); D.buildLay(D.layoutFor(4242)); D.startHeist(true);
        const G = D.get(), M = G.me, its = G.its; M.x = 500; M.y = 500; G.cars.filter(c => c.civ).forEach(c => { c.x = -9999; c.y = -9999; });   // zivile Autos (Abbau-Objekte) nicht in Reichweite
        const mk = (tp, dx, fit) => ({ t: tp, x: 500 + dx, y: 500, r: 60, pr: 0, ok: () => true, fit: fit ? () => fit() : undefined, lab: () => tp, dur: () => 1, act() {} });
        const loot = mk('good', 5, () => false), cam = mk('cam', 40), lootOk = mk('good', 2, () => true);
        its.push(loot, cam);
        const withCam = D.pickIt(M, -1);
        its.pop();
        const alone = D.pickIt(M, -1);
        its.pop(); its.push(loot, lootOk, cam);
        const fitsFirst = D.pickIt(M, -1);
        its.length -= 3;
        return { miss: Object.keys(miss), n, withCam: withCam && withCam.t, alone: alone === loot, fitsFirst: fitsFirst === lootOk };
      }, [SC]);
      t.ok(r.n > 20, 'zu wenige Objekte: ' + r.n);
      t.eq(r.miss, [], 'ohne fit()');
      t.eq(r.withCam, 'cam', 'passt das Stueck nicht, geht E an die Kamera');
      t.ok(r.alone, 'ist nichts anderes da, bleibt das Stueck (Rueckmeldung Tasche voll)');
      t.ok(r.fitsFirst, 'ein passendes Stueck gewinnt nach Abstand');
    },
  },
  {
    name: 'Auswahl: in Phase 2 bleibt an der verriegelten Hintertuer die Barrikade die Vorgabe, Q wechselt zum Riegel',
    async run(t) {
      const r = await t.page.evaluate(() => {
        const D = __dbg;
        D.setTurn(null); D.setScenario('bank'); D.reset(); D.startHeist(false);
        const G = D.get(), M = G.me, L = D.LAY();
        const si = L.spots.findIndex(s => s.side && s.lk && !s.ex), sp = L.spots[si];
        const bar = G.its.find(i => i.t === 'bar' && i.b.i === si), lock = G.its.find(i => i.t === 'lock' && i.x === sp.x && i.y === sp.y);
        G.en.length = 0; G.npcs.length = 0; M.mat = 2; M.x = sp.x + sp.iv[0] * 32; M.y = sp.y + sp.iv[1] * 32;
        const out = { first: D.pickIt(M, -1) === bar, hasLock: D.cands(M).includes(lock) };
        let reached = false;
        for (let k = 0; k < 6 && !reached; k++) { D.cycleSel(); reached = D.pickIt(M, D.sel()) === lock; }
        out.reached = reached;
        return out;
      });
      t.ok(r.first, 'Vorgabe in Phase 2 ist die Barrikade');
      t.ok(r.hasLock, 'der Riegel ist als Kandidat da');
      t.ok(r.reached, 'Q erreicht den Riegel');
    },
  },
  {
    name: 'Barrikade: mit Restmaterial bleibt "verstaerken" die Vorgabe, Q waehlt "abbauen", das dauert nur CFG.bar.dismT (nicht 5,4 s)',
    async run(t) {
      const r = await t.page.evaluate(() => {
        const D = __dbg, k = D.keys, out = {};
        function setup() {
          D.setTurn(null); D.setScenario('bank'); D.reset(); D.startHeist(false);
          const G = D.get(), M = G.me; M.mat = 4; G.en.length = 0; G.npcs.length = 0;
          const bar = G.its.find(i => i.t === 'bar' && i.b.n === 'Westtür'), b = bar.b;
          const bard = G.its.find(i => i.t === 'bard' && i.b === b);
          const stand = () => { M.x = b.x + b.iv[0] * 40; M.y = b.y + b.iv[1] * 40; M.hp = 100; };
          stand(); bar.act(M); stand();
          return { G, M, bar, bard, b, stand };
        }
        function hold(S, sec) { k.e = 1; for (let i = 0; i < sec * 30; i++) { S.stand(); D.update(1 / 30); } k.e = 0; D.update(1 / 30); }
        // 1) Vorgabe und Wechsel
        let S = setup();
        out.lv1 = S.b.lv; out.mode = S.bar.mode(S.M); out.firstBar = D.pickIt(S.M, -1) === S.bar; out.bardOk = !!(S.bard && S.bard.ok(S.M));
        out.cands = D.cands(S.M).filter(i => i.b === S.b).length;
        D.cycleSel(); out.qBard = D.pickIt(S.M, D.sel()) === S.bard;
        const pv = S.b.cells.map(c => D.world().cell(c[0], c[1]));
        hold(S, D.CFG.bar.dismT + .5);
        out.lvAfter = S.b.lv; out.matAfter = S.M.mat; out.cellX = S.b.cells.some(c => D.world().cell(c[0], c[1]) === 'X');
        // 2) ohne Q: E halten fuehrt wie bisher zu Stufe 2
        S = setup(); hold(S, D.CFG.bar.buildT[1] * (S.b.bt || 1) + .5); out.lvDefault = S.b.lv;
        // 3) ohne Material gibt es nur den Abbau, kein doppeltes Angebot
        S = setup(); S.M.mat = 0;
        out.mode0 = S.bar.mode(S.M); out.bardOk0 = !!S.bard.ok(S.M); out.cands0 = D.cands(S.M).filter(i => i.b === S.b).length;
        // 4) besetzter Rahmen: Vorgabe bleibt bar (kein ungewolltes Abbauen), Q erreicht den Abbau
        S = setup(); S.G.en.push(D.mkCop(S.b.x, S.b.y, false));
        out.mode3 = S.bar.mode(S.M); out.bardOk3 = !!S.bard.ok(S.M); out.firstBar3 = D.pickIt(S.M, -1) === S.bar;
        D.cycleSel(); out.qBard3 = D.pickIt(S.M, D.sel()) === S.bard;
        return out;
      });
      t.eq(r.lv1, 1, 'Stufe 1 steht');
      t.eq(r.mode, 1, 'Modus mit Restmaterial: verstaerken');
      t.ok(r.firstBar, 'Vorgabe ist das Bauen');
      t.ok(r.bardOk, 'der Abbau ist ein eigenes Objekt (Typ bard) und angeboten');
      t.eq(r.cands, 2, 'zwei Kandidaten an der Barrikade');
      t.ok(r.qBard, 'Q waehlt den Abbau');
      t.eq(r.lvAfter, 0, 'Barrikade nach dem Abbau weg (nach ' + 'dismT + 0,5 s)');
      t.ok(!r.cellX, 'Tuerkachel wieder frei');
      t.ok(r.matAfter >= 4, 'Material kommt zurueck: ' + r.matAfter);
      t.eq(r.lvDefault, 2, 'ohne Q fuehrt E halten wie bisher zu Stufe 2');
      t.eq(r.mode0, 2, 'ohne Material: Abbau ist der Modus');
      t.ok(!r.bardOk0, 'kein doppeltes Angebot ohne Material');
      t.eq(r.cands0, 1, 'ein Kandidat ohne Material');
      t.eq(r.mode3, 3, 'Rahmen besetzt');
      t.ok(r.bardOk3, 'der Abbau geht auch bei besetztem Rahmen');
      t.ok(r.firstBar3, 'bei besetztem Rahmen wird nicht ungewollt abgebaut');
      t.ok(r.qBard3, 'Q erreicht den Abbau bei besetztem Rahmen');
    },
  },
  {
    name: 'Auswahl: Q wirkt im Coop (der Client sendet seine Wahl, der Host baut ab statt zu verstaerken)',
    async run(t) {
      await t.loadTool('loopnet.js');
      await t.loadInpage('coop.js');
      const r = await t.page.evaluate(() => {
        function trial(useQ) {
          const G = CT.mkGame('bank', 321, 2), A = G.A, B = G.clients[0], run = G.run;
          B.cv.dispatchEvent(new KeyboardEvent('keydown', { key: 'f', bubbles: true })); B.cv.dispatchEvent(new KeyboardEvent('keyup', { key: 'f', bubbles: true })); run(3);   // F loslassen: gehalten heisst Lehnen und sperrt E an der Barrikade
          const p = A.get().players[1]; p.mat = 4;
          const bi = A.get().its.findIndex(i => i.t === 'bar' && i.b.side && !i.b.rd && i.mode(p) === 1);
          const bar = A.get().its[bi], b = bar.b;
          const stand = () => { const q = A.get().players[1]; q.x = b.x + b.iv[0] * 40; q.y = b.y + b.iv[1] * 40; q.vx = q.vy = 0; };
          stand(); bar.act(p); stand();
          for (let i = 0; i < 60; i++) { stand(); step(G.insts, G.net, 1 / 60); }
          const out = { lv0: [b.lv, B.get().its[bi].b.lv], cands: B.cands(B.get().me).length };
          if (useQ) { B.cv.dispatchEvent(new KeyboardEvent('keydown', { key: 'q', bubbles: true })); B.cv.dispatchEvent(new KeyboardEvent('keyup', { key: 'q', bubbles: true })); }
          out.sel = B.sel();
          B.keys.e = 1;
          // so lange halten, wie die Aktion dauert (Abbau 2 s, Verstaerken 3,4 s), sonst baut das gehaltene E die Tuer mit dem Restmaterial gleich wieder auf
          const sec = (useQ ? __dbg.CFG.bar.dismT : __dbg.CFG.bar.buildT[1]) + .6;
          for (let i = 0; i < sec * 60; i++) { stand(); step(G.insts, G.net, 1 / 60); }
          B.keys.e = 0; run(1);
          out.lvA = A.get().its[bi].b.lv; out.lvB = B.get().its[bi].b.lv;
          return out;
        }
        return { q: trial(true), plain: trial(false) };
      });
      t.eq(r.q.lv0, [1, 1], 'Stufe 1 steht auf Host und Client');
      t.ok(r.q.cands >= 2, 'der Client sieht zwei Kandidaten: ' + r.q.cands);
      t.ok(r.q.sel >= 0, 'Q setzt eine Wahl auf dem Client');
      t.eq([r.q.lvA, r.q.lvB], [0, 0], 'mit Q baut der Host ab, beide sehen es');
      t.eq([r.plain.lvA, r.plain.lvB], [2, 2], 'ohne Q wird wie bisher verstaerkt');
    },
  },
];
