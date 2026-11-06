// Ticket #134: Lautlos (Phase 1) laesst sich eine Kasse leeren, wenn alle Angestellten an ihr bewusstlos sind. Ohne Ausschalten kein E-Objekt, leer bleibt leer (auch im Ueberfall), der Client sieht die leere Kasse.
async function setup(t) {
  await t.loadTool('loopnet.js');
  await t.loadInpage('coop.js');
}
// Gemeinsamer Aufbau in der Seite: Spieler neben die erste Kasse, alle Sichtquellen aus.
const PREP = `
  const prep = (G) => { const g = G.A.get(); for (const q of g.npcs) if (q.k !== 'tel') { q.st = 'away'; q.at = 1e9; } for (const c of g.cams) c.off = true;
    const it = g.its.find(i => i.t === 'till'); const ops = it.ops.map(id => g.npcs.find(q => q.id === id));
    for (const p of g.players) { p.x = it.x; p.y = it.y + 20; } return { g, it, ops }; };`;
module.exports = [
  {
    name: 'Kasse lautlos: Kassierer ausgeschaltet, Kasse leeren ohne Alarm, Beute in der Tasche, zweites Mal leer (Bank)',
    async run(t) {
      await setup(t);
      const r = await t.page.evaluate(`(() => { ${PREP}
        const G = CT.mkGame('bank', 5017, 2), { g, it, ops } = prep(G), o = {}; const me = g.me;
        o.nOps = ops.length; o.phase0 = g.phase;
        o.okBefore = it.ok(me);
        for (const q of ops) { q.st = 'idle'; q.alert = 0; G.A.koMi(q).act(me); }
        o.ko = ops.every(q => q.st === 'ko'); o.okAfter = it.ok(me); o.durQ = it.dur();
        const l0 = me.loot, u0 = me.units; it.act(me);
        o.gain = me.loot - l0; o.units = me.units - u0; o.done = it.done; o.phase1 = g.phase; o.okAgain = it.ok(me);
        for (let i = 0; i < 30; i++) G.A.update(1 / 30); o.phaseLater = G.A.get().phase;
        G.A.startHeist(true, me, 'test'); G.run(1); const g2 = G.A.get(); o.phaseRaid = g2.phase;
        o.okRaid = it.ok(me); const other = g2.its.find(i => i.t === 'till' && i !== it); o.otherRaid = other ? other.ok(me) : null;
        G.run(1); const gc = G.clients[0].get(); o.clientDone = gc.its.filter(i => i.t === 'till').map(i => !!i.done);
        return o; })()`);
      t.ok(r.nOps >= 1, 'Kasse hat mindestens einen Kassierer: ' + r.nOps);
      t.eq(r.phase0, 1, 'lautlose Phase');
      t.eq(r.okBefore, false, 'ohne Ausschalten kein E-Objekt');
      t.eq(r.ko, true, 'Kassierer bewusstlos');
      t.eq(r.okAfter, true, 'nach dem Ausschalten ist die Kasse ein E-Objekt');
      t.ok(r.durQ > 0, 'Dauer aus CFG.till.qt: ' + r.durQ);
      t.ok(r.gain > 0 && r.units > 0, 'Beute in der Tasche: +' + r.gain + ', ' + r.units + ' Einheiten');
      t.eq(r.done, true, 'Kasse leer');
      t.eq(r.phase1, 1, 'kein Alarm durch das Plündern');
      t.eq(r.okAgain, false, 'nicht zweimal plündern');
      t.eq(r.phaseLater, 1, 'auch danach kein Alarm');
      t.eq(r.phaseRaid, 2, 'Überfall läuft');
      t.eq(r.okRaid, false, 'im Überfall bleibt die geplünderte Kasse leer (keine doppelte Beute)');
      t.eq(r.otherRaid, true, 'die ungeplünderten Kassen sind im Überfall offen');
      t.eq(r.clientDone[0], true, 'Client sieht die leere Kasse: ' + JSON.stringify(r.clientDone));
      t.ok(r.clientDone.slice(1).every(d => !d), 'andere Kassen beim Client noch voll');
    },
  },
  {
    name: 'Kasse lautlos: Gegenprobe (Mutanten): wacher Kassierer, niemand an der Kasse, Tasche voll, Tankstelle, Überfall-Regel unverändert',
    async run(t) {
      await setup(t);
      const r = await t.page.evaluate(`(() => { ${PREP}
        const G = CT.mkGame('bank', 5017, 2), { g, it, ops } = prep(G), o = {}; const me = g.me;
        for (const q of ops) { q.st = 'idle'; q.alert = 0; G.A.koMi(q).act(me); }
        o.ko = it.ok(me);
        const q0 = ops[0]; q0.st = 'idle'; o.woke = it.ok(me); q0.st = 'ko';
        o.back = it.ok(me);
        const keep = it.ops; it.ops = []; o.noOps = it.ok(me); it.ops = keep;
        const bag = me.units; me.units = me.bag; o.fitFull = it.fit(me); me.units = bag; o.fitEmpty = it.fit(me);
        const Gg = CT.mkGame('gas', 3, 1), g2 = Gg.A.get(); const tl = g2.its.filter(i => i.t === 'till'); o.gasTills = tl.length; o.gasHasOps = tl.every(i => i.ops.length > 0);
        for (const q of g2.npcs) if (q.k !== 'tel') { q.st = 'away'; q.at = 1e9; }
        for (const c of g2.cams) c.off = true;
        const gt = tl[0]; if (gt) { g2.me.x = gt.x; g2.me.y = gt.y + 20; o.gasBefore = gt.ok(g2.me); for (const id of gt.ops) { const q = g2.npcs.find(x => x.id === id); q.st = 'idle'; q.alert = 0; Gg.A.koMi(q).act(g2.me); } o.gasAfter = gt.ok(g2.me); }
        const Gr = CT.mkGame('bank', 5017, 1), g3 = Gr.A.get(); Gr.A.startHeist(true, g3.me, 't'); Gr.run(1); o.raidOk = Gr.A.get().its.filter(i => i.t === 'till').every(i => i.ok(Gr.A.get().me));
        return o; })()`);
      t.eq(r.ko, true, 'Vorbedingung: ausgeschaltet gibt Objekt');
      t.eq(r.woke, false, 'Mutant: Kassierer wieder wach, kein Objekt');
      t.eq(r.back, true, 'wieder bewusstlos, Objekt zurück');
      t.eq(r.noOps, false, 'Mutant: niemand an der Kasse, kein lautloses Plündern');
      t.eq(r.fitFull, false, 'volle Tasche: fit verneint');
      t.eq(r.fitEmpty, true, 'leere Tasche: fit bejaht');
      t.ok(r.gasTills >= 1 && r.gasHasOps, 'Tankstelle hat Kasse mit Kassierer');
      t.eq(r.gasBefore, false, 'Tankstelle: ohne Ausschalten kein Objekt');
      t.eq(r.gasAfter, true, 'Tankstelle: nach dem Ausschalten Objekt');
      t.eq(r.raidOk, true, 'Überfall: alle Kassen wie bisher offen');
    },
  },
];
