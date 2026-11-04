// Notenbank N6 (Ticket 77, Tills nb-sturm B): Ab CFG.nb.stormSolo (150 s) solo oder stormCoop (90 s) im Coop nach dem Bohrer-Start rueckt die Polizei Ring fuer Ring vor (Trupps von Sturm-Beamten, Haltepunkte aus LAY.nb.gates und LAY.nb.rings). Ein Ring gilt als eingenommen (nbS.ring), solange stormTake Sturm-Beamte darin stehen, er bleibt besetzt, bis die Spieler sie ausgeschaltet haben, dann rueckt der Sturm wieder an. Die Sturm-Beamten zaehlen in nbHold (Presse, Bohrer), die Wellen laufen daneben weiter.
const SOLO = `(() => {
  const D = __dbg; D.sessReset(); D.setScenario('nb'); D.setSeedMode('random'); D.setLage([]); D.buildSeed(5); D.CFG.policeAt = 1e6; D.CFG.policeForced = 1e6; D.CFG.nb.alarmAt = 1e6; D.reset(); D.startHeist(false);
  const me = D.get().me; me.hp = 1e6; me.ar = 1e6; D.nbS().t0 = D.get().tH;
  const step = s => { for (let i = 0; i < s * 30; i++) D.update(1 / 30); };
  return { D, step };
})()`;
module.exports = [
  {
    name: 'Sturm: Beginn nach stormSolo (150 s) solo und stormCoop (90 s) im Coop nach dem Bohrer-Start, vorher kein Sturm-Beamter, danach die erste Meldung und ein Trupp',
    timeout: 180000,
    async run(t) {
      await t.loadTool('loopnet.js'); await t.loadInpage('coop.js');
      const r = await t.page.evaluate(`(() => {
        const o = {}; const H = ${SOLO}, D = H.D; o.cfg = [D.CFG.nb.stormSolo, D.CFG.nb.stormCoop];
        H.step(149); o.s149 = [D.nbS().on, D.get().en.filter(e => e.stm).length]; H.step(2); o.s151 = [D.nbS().on, D.get().en.filter(e => e.stm).length];
        const G = CT.mkGame('nb', 5, 2, 60, 20), A = G.A; A.CFG.policeAt = 1e6; A.CFG.policeForced = 1e6; A.startHeist(false); for (const q of A.get().players) { q.hp = 1e6; q.ar = 1e6; }
        A.nbS().t0 = A.get().tH; G.run(89); o.c89 = [A.nbS().on, A.get().en.filter(e => e.stm).length]; G.run(3); o.c92 = [A.nbS().on, A.get().en.filter(e => e.stm).length];
        return o; })()`);
      t.eq(r.cfg, [150, 90], 'Startzeiten in CFG.nb');
      t.eq([r.s149, r.s151], [[false, 0], [true, 3]], 'solo: bei 149 s kein Sturm, bei 151 s laeuft er mit dem ersten Trupp: ' + JSON.stringify([r.s149, r.s151]));
      t.eq([r.c89, r.c92], [[false, 0], [true, 3]], 'Coop (zwei Spieler): bei 89 s kein Sturm, bei 92 s laeuft er mit dem ersten Trupp: ' + JSON.stringify([r.c89, r.c92]));
    },
  },
  {
    name: 'Sturm: rueckt Ring fuer Ring vor (Vorhalle, Kassenhalle, innerer Bereich, Keller), die Beamten stehen wirklich im Ring (nbRingAt, Haltepunkte aus den Engstellen), halten Position (Modus post), nbHold meldet den tiefsten Ring und bremst Presse und Bohrer',
    timeout: 240000,
    async run(t) {
      const r = await t.page.evaluate(`(() => {
        const H = ${SOLO}, D = H.D, o = { rings: [], D: [], modes: null, spots: [1, 2, 3, 4].map(r => D.nbSpots(r).length) };
        D.nbd().st = 1; D.nbd().p = 0; H.step(151);
        for (let i = 0; i < 12; i++) { H.step(10); o.rings.push(D.nbS().ring); o.D.push(D.nbh().D); }
        o.modes = [...new Set(D.get().en.filter(e => e.stm && e.hp > 0).map(e => e.mode))]; o.c = D.nbh().c; o.p0 = D.nbd().p;
        const inRing = D.get().en.filter(e => e.stm && e.hp > 0).every(e => D.nbRingAt(e.x, e.y) >= 1); o.inRing = inRing; o.alive = D.get().en.filter(e => e.stm && e.hp > 0).length;
        return o; })()`);
      t.ok(r.spots.every(n => n >= 3), 'jeder Ring hat Haltepunkte aus den Engstellen: ' + JSON.stringify(r.spots));
      t.ok(r.rings.every((v, i) => i === 0 || v >= r.rings[i - 1]) && r.rings[0] >= 1 && r.rings[r.rings.length - 1] === 4, 'Ring fuer Ring, am Ende ist der Keller eingenommen (nie rueckwaerts ohne Gegenwehr): ' + JSON.stringify(r.rings));
      t.eq(r.D, r.rings, 'nbHold meldet den tiefsten Ring wie der Sturm (D gleich eingenommene Ringe): ' + JSON.stringify([r.D, r.rings]));
      t.ok(r.modes.length === 1 && r.modes[0] === 'post' && r.inRing, 'alle Sturm-Beamten halten Position im Ring (Modus post): ' + JSON.stringify([r.modes, r.inRing, r.c]));
    },
  },
  {
    name: 'Sturm: Rueckeroberung. Sind die Sturm-Beamten im inneren Bereich und Keller ausgeschaltet, sinkt der Stand (nbS.ring) auf die Ringe davor und der Sturm rueckt wieder an; die Wellen laufen daneben weiter (zaehlen die Sturm-Beamten nicht gegen maxEn)',
    timeout: 240000,
    async run(t) {
      const r = await t.page.evaluate(`(() => {
        const H = ${SOLO}, D = H.D, o = {}; D.nbd().st = 1; H.step(151); H.step(60); o.ring0 = D.nbS().ring;
        for (const e of D.get().en) if (e.stm && D.nbRingAt(e.x, e.y) >= 2) e.hp = 0; H.step(0.2); o.after = [D.nbS().ring, D.nbh().D];
        H.step(60); o.again = [D.nbS().ring, D.nbh().D];
        { const en = D.get().en; for (let i = en.length - 1; i >= 0; i--) if (!en[i].stm) en.splice(i, 1); } D.CFG.nb.soloMaxEn = 3; const n0 = D.get().pcs.reduce((m, c) => m + (c.crew ? c.crew.length : 0), 0); D.spawnWave(); const g = D.get(); o.wave = g.pcs.reduce((m, c) => m + (c.crew ? c.crew.length : 0), 0) + g.fps.reduce((m, f) => m + f.crew.length, 0) - n0;
        return o; })()`);
      t.ok(r.ring0 >= 3, 'vor der Gegenwehr stehen mindestens drei Ringe: ' + r.ring0);
      t.ok(r.after[0] <= 1, 'nach dem Ausschalten der Beamten ab Ring 2 steht nur noch Ring 1: ' + JSON.stringify(r.after));
      t.ok(r.again[0] >= 2, 'der Sturm rueckt wieder an und nimmt den Ring erneut ein: ' + JSON.stringify(r.again));
      t.ok(r.wave >= 1, 'eine Welle kommt trotz Sturm-Beamten (zaehlen nicht gegen maxEn): ' + r.wave);
    },
  },
  {
    name: 'Sturm: Aussenrichtung und Weg. Die Notenbank hat eine feste Ausrichtung (auch mit erzwungener Lage der Strasse bleibt LAY.nb unveraendert: wuerde man sie einmal drehen, schlaegt das hier an und nbSquad muss neu geprueft werden); fuer 12 Seeds erscheint der erste Trupp ausserhalb des Gebaeudes auf begehbaren Kacheln mit Weg zum Haltepunkt; ohne Weg (Treppe zugestellt) entsteht kein Sturm-Beamter, sondern ein gewoehnlicher Stuermer, der nicht gegen stormMax zaehlt',
    timeout: 300000,
    async run(t) {
      const r = await t.page.evaluate(`(() => {
        const D = __dbg, o = { bad: [], gates: new Set(), noPath: null }; D.setScenario('nb'); D.setSeedMode('random'); D.setLage([]);
        for (const tn of [null, 'E']) { D.setTurn(tn); o.gates.add(D.layoutFor(5).nb.gates.haupt[0].join(',') + '|' + D.layoutFor(5).nb.rig.join(',')); } D.setTurn(null);
        for (let sd = 1; sd <= 12; sd++) {
          D.sessReset(); D.buildSeed(sd); D.CFG.policeAt = 1e6; D.CFG.policeForced = 1e6; D.CFG.nb.alarmAt = 1e6; D.reset(); D.startHeist(false); D.nbS().t0 = D.get().tH;
          const n = D.nbSquad(1), q = D.get().en.filter(e => e.stm), W = D.world();
          if (n !== 3 || q.length !== 3) o.bad.push(sd + ': Trupp ' + n + '/' + q.length);
          for (const e of q) { if (D.nbRingAt(e.x, e.y) !== 0) o.bad.push(sd + ': im Gebaeude'); if (D.isSol(Math.floor(e.x / 32), Math.floor(e.y / 32))) o.bad.push(sd + ': in fester Kachel'); if (e.mode !== 'run' || !e.path.length) o.bad.push(sd + ': kein Weg'); }
        }
        D.sessReset(); D.buildSeed(5); D.CFG.policeAt = 1e6; D.CFG.policeForced = 1e6; D.CFG.nb.alarmAt = 1e6; D.reset(); D.startHeist(false);
        const st = D.LAY().nb.gates.treppe[0]; D.world().setc(st[0], st[1], 'X'); const en0 = D.get().en.length; const n = D.nbSquad(4);
        const add = D.get().en.slice(en0); o.noPath = { n, add: add.length, stm: add.filter(e => e.stm).length, mode: [...new Set(add.map(e => e.mode))] };
        return { bad: o.bad, gates: [...o.gates], noPath: o.noPath }; })()`);
      t.eq(r.gates.length, 1, 'LAY.nb bleibt auch bei erzwungener Lage der Strasse gleich: ' + JSON.stringify(r.gates));
      t.eq(r.bad, [], 'erster Trupp: drei Beamte ausserhalb, auf begehbaren Kacheln, mit Weg: ' + JSON.stringify(r.bad.slice(0, 4)));
      t.eq([r.noPath.add, r.noPath.stm, r.noPath.mode], [3, 0, ['push']], 'Treppe zugestellt: drei gewoehnliche Stuermer ohne Sturm-Kennzeichen (zaehlen nicht gegen stormMax): ' + JSON.stringify(r.noPath));
    },
  },
];
