// Coop ueber die Test-Leitung (tools/loopnet.js, virtuelle Zeit): Host und Clients muessen dieselbe Welt sehen.
// Je Szenario: gleiche Karte, gleiche Items, Ueberfall-Start durch den Client, Beute durch den Client (Host rechnet), Wellen bis 70 s.
const SC = ['bank', 'truck', 'jewel', 'gas', 'museum', 'casino'];
const SEEDS = { bank: 321, truck: 321, jewel: 654, gas: 987, museum: 1234, casino: 4321 };

async function setup(t) {
  await t.loadTool('loopnet.js');
  await t.loadInpage('coop.js');
}

const tests = SC.map(sc => ({
  name: 'Coop: ' + sc + ' zu zweit (Karte, Items, Beute, Wellen stimmen auf Host und Client)',
  async run(t) {
    await setup(t);
    const r = await t.page.evaluate(([sc, seed]) => {
      const G = CT.mkGame(sc, seed, 2), A = G.A, B = G.clients[0], run = G.run, out = {};
      out.d0 = CT.diff(CT.sig(A), CT.sig(B));
      // Ueberfall-Start durch den Client (Taste F)
      B.cv.dispatchEvent(new KeyboardEvent('keydown', { key: 'f', bubbles: true }));
      run(3);
      out.phase = [A.get().phase, B.get().phase];
      // Beute durch den Client: ein passendes Item suchen, den Spieler 1 auf dem Host davor setzen, E halten
      const want = ['good', 'vit', 'till', 'mat'];
      let it = null;
      for (const k of want) { it = A.get().its.find(i => i.t === k && !i.done); if (it) break; }
      out.itemType = it ? it.t : null;
      if (it) {
        const val = p => [p.units, p.loot, p.mat, p.chipV || 0].join();
        const before = val(A.get().players[1]);
        const dur = (typeof it.dur === 'number' ? it.dur : 3) + 1.5;
        B.keys.e = 1;
        for (let i = 0; i < dur * 60; i++) { const p = A.get().players[1]; p.x = it.x; p.y = it.y; p.vx = p.vy = 0; step(G.insts, G.net, 1 / 60); }
        B.keys.e = 0;
        run(1.5);
        out.valA = val(A.get().players[1]); out.valB = val(B.get().players[1]); out.before = before;
        out.doneA = !!A.get().its.find(i => i.t === it.t && i.x === it.x && i.y === it.y).done;
        out.doneB = !!B.get().its.find(i => i.t === it.t && i.x === it.x && i.y === it.y).done;
        out.d1 = CT.diff(CT.sig(A), CT.sig(B));
      }
      // Wellen: bis 70 s Spielzeit laufen lassen, die Gegner muessen (bis auf Zeitversatz) gleich sein
      run(70);
      const ids = d => d.get().en.map(e => e.id).sort((x, y) => x - y);
      const ia = ids(A), ib = ids(B);
      out.enA = ia.length; out.enB = ib.length;
      out.enDiff = ia.filter(x => !ib.includes(x)).length + ib.filter(x => !ia.includes(x)).length;
      out.ended = [!!A.get().ended, !!B.get().ended];
      out.phase2 = [A.get().phase, B.get().phase];
      return out;
    }, [sc, SEEDS[sc]]);
    t.eq(r.d0, [], 'Welt nach dem Start unterschiedlich');
    t.eq(r.phase, [2, 2], 'Ueberfall-Start durch den Client');
    t.ok(r.itemType, 'kein passendes Item zum Testen gefunden');
    t.ok(r.doneA && r.doneB, 'Item (' + r.itemType + ') muss auf beiden als erledigt gelten (Host ' + r.doneA + ', Client ' + r.doneB + ')');
    t.eq(r.valA, r.valB, 'Beute des Clients stimmt nicht ueberein');
    t.ok(r.valA !== r.before, 'Beute des Clients hat sich nicht geaendert (' + r.valA + ')');
    t.eq(r.d1, [], 'Welt nach der Beute unterschiedlich');
    t.ok(r.enDiff <= 3, 'Gegner weichen ab: Host ' + r.enA + ', Client ' + r.enB + ', verschieden ' + r.enDiff);
    t.eq(r.phase2[0], r.phase2[1], 'Phase nach 70 s');
    t.eq(r.ended[0], r.ended[1], 'Ende-Zustand nach 70 s');
  },
}));

tests.push({
  name: 'Coop: Bank zu viert (alle Spieler da, alle Karten gleich)',
  async run(t) {
    await setup(t);
    const r = await t.page.evaluate(() => {
      const G = CT.mkGame('bank', 777, 4), out = {};
      out.np = G.insts.map(d => d.get().players.length);
      out.me = G.insts.map(d => d.state().me);
      out.diffs = G.clients.map(c => CT.diff(CT.sig(G.A), CT.sig(c)));
      G.run(10);
      out.hp = G.insts.map(d => d.get().players.map(p => Math.round(p.hp)).join(','));
      return out;
    });
    t.eq(r.np, [4, 4, 4, 4], 'Spielerzahl');
    t.eq(r.me, [0, 1, 2, 3], 'Spieler-Nummern');
    t.eq(r.diffs, [[], [], []], 'Welt unterschiedlich');
    t.eq(r.hp[0], r.hp[1], 'HP-Anzeige Host gegen Client 1');
  },
});

tests.push({
  name: 'Coop: Falscher Code und Verbindungsabbruch',
  async run(t) {
    await setup(t);
    const r = await t.page.evaluate(() => {
      const out = {};
      const G = CT.mkGame('bank', 321, 2);
      // Dritter Spieler mit falschem Code
      const X = mkInst(G.net, 'x');
      X.joinRoom('ZZZZ');
      for (let i = 0; i < 180; i++) step(G.insts.concat(X), G.net, 1 / 60);
      out.wrongCode = { scr: X.state().scr, msg: X.NET.msg, gone: X.NET.gone };
      // Client verlaesst das Spiel
      G.clients[0].leaveGame();
      for (let i = 0; i < 300; i++) step(G.insts.concat(X), G.net, 1 / 60);
      out.hostScr = G.A.state().scr;
      const p = G.A.get().players[1];
      out.left = !!(p && (p.gone || p.dead || p.out));
      return out;
    });
    t.ok(r.wrongCode.scr !== 'play', 'Falscher Code darf nicht ins Spiel fuehren (scr ' + r.wrongCode.scr + ')');
    t.ok(r.wrongCode.msg || r.wrongCode.gone, 'Falscher Code braucht eine Meldung oder den Hinweis Raum fehlt');
    t.eq(r.hostScr, 'play', 'Host spielt nach dem Weggang weiter');
    t.ok(r.left, 'Der gegangene Spieler muss beim Host als weg gelten');
  },
});

module.exports = tests;
