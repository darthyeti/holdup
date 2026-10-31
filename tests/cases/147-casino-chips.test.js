// Casino: gestohlene Chips lautlos tragen, am Cage tauschen, durch die Tuer gehen (Issue #52, Tills Wunsch vom 31. Oktober 2026).
// (1) Wer nur Chips traegt (o.chipV, Waffe nicht gezogen), fuellt den Verdachtsbalken im Blick einer Wache nicht (CFG.casino.chip.free), anderes Geld in der Tasche schon,
// (2) der Tausch am Cage geht auch in Phase 1 (CFG.casino.chip.p1), bis CFG.casino.chip.big Nennwert lautlos, darueber macht er den Kassierer misstrauisch (o.thf = chip.hot, Beobachter sehen mit voller Rate),
// (3) danach lautlos durch die Tuer = lautloser Sieg, ungetauschte Chips kosten beim Abgang weiter den Hehlerabschlag, (4) Host und Client sehen dasselbe.
async function setup(t) {
  await t.loadTool('loopnet.js');
  await t.loadInpage('coop.js');
}
// Casino-Karte ohne Lage-Tags, Kameras aus, Polizei weit weg; eine Wache steht still, alle anderen sind weg, der Spieler steht in ihrem Blick (Muster aus 134-museum-schleichen).
const SETUP = `(sd) => { const D = __dbg; D.sessReset(); D.setScenario('casino'); D.setSeedMode('random'); D.setLage([]); D.setTurn('S'); D.buildSeed(sd); D.CFG.policeAt = 1e6; D.CFG.policeForced = 1e6;
  const g = D.get(), me = g.me, L = D.LAY(); for (const c of g.cams) c.off = true; const q = g.npcs.find(n => n.k === 'grd' && n.st !== 'away');
  for (const n of g.npcs) if (n !== q) { n.st = 'away'; n.at = 1e9; } q.still = true; q.route = null; q.path = []; q.alert = 0; q.look = null;
  const free = (x, y) => [[0, 0], [-9, -9], [9, -9], [-9, 9], [9, 9]].every(p => !D.isSol(Math.floor((x + p[0]) / 32), Math.floor((y + p[1]) / 32))); let ok = false;
  for (let i = 0; i < 24 && !ok; i++) { const an = i * Math.PI / 12, x = q.x + Math.cos(an) * 90, y = q.y + Math.sin(an) * 90; if (free(x, y) && D.los(q.x, q.y, x, y)) { me.x = x; me.y = y; q.base = Math.atan2(y - q.y, x - q.x); q.a = q.base; ok = true; } }
  return { D, g, me, L, q, ok, pos: [me.x, me.y] }; }`;
const WATCH = `(S, loot, chipV, secs) => { const { D, g, me, q, pos } = S; me.loot = loot; me.chipV = chipV; D.update(1 / 30); const a0 = D.get().sus; for (let i = 0; i < secs * 30; i++) { me.x = pos[0]; me.y = pos[1]; q.base = Math.atan2(pos[1] - q.y, pos[0] - q.x); D.update(1 / 30); } return D.get().sus - a0; }`;

module.exports = [
  {
    name: 'Casino-Chips: nur Chips in der Tasche fuellen im Blick einer Wache den Balken nicht, anderes Geld oder CFG.casino.chip.free 0 schon',
    async run(t) {
      await setup(t);
      const r = await t.page.evaluate(`(() => { const o = {}, w = ${WATCH}, S = (${SETUP})(4321); o.platz = S.ok; o.free = S.D.CFG.casino.chip.free;
        o.nur = w(S, 16000, 16000, 1.5); o.gemischt = w(S, 16000, 8000, 1.5); o.geld = w(S, 16000, 0, 1.5); S.D.CFG.casino.chip.free = 0; o.aus = w(S, 16000, 16000, 1.5); S.D.CFG.casino.chip.free = 1; o.phase = S.D.get().phase;
        return o; })()`);
      t.eq(r.platz, true, 'Aufbau: ein Platz im Blick der Wache'); t.eq(r.free, 1, 'CFG.casino.chip.free ist 1');
      t.ok(r.geld > 3, 'anderes Geld im Blick der Wache fuellt den Balken: ' + r.geld.toFixed(1));
      t.ok(r.nur <= 0, 'nur Chips: der Balken steigt nicht: ' + r.nur.toFixed(1));
      t.ok(r.gemischt > 3, 'Chips plus anderes Geld: der Balken steigt wie bisher: ' + r.gemischt.toFixed(1));
      t.ok(r.aus > 3, 'mit chip.free 0 steigt er (Mutant): ' + r.aus.toFixed(1));
      t.eq(r.phase, 1, 'noch kein Alarm');
    },
  },
  {
    name: 'Casino-Chips: Tausch am Cage in Phase 1 (E halten), bis chip.big lautlos, darueber wird der Kassierer misstrauisch (thf, Balken steigt im Blick), mit chip.p1 0 geht es nicht',
    async run(t) {
      await setup(t);
      const r = await t.page.evaluate(`(() => { const o = {}, w = ${WATCH}, S = (${SETUP})(4321), { D, g, me } = S, K = D.CFG.casino.chip; o.big = K.big; o.hot = K.hot;
        const cage = () => D.get().its.find(i => i.t === 'cage'); o.da = !!cage();
        const tausch = (v) => { me.loot = v; me.chipV = v; me.thf = 0; const c = cage(); me.x = c.x; me.y = c.y + 20; D.update(1 / 30); D.keys.e = true; const t0 = D.get().time; for (let i = 0; i < 30 * 12 && me.chipV > 0; i++) { me.x = c.x; me.y = c.y + 20; D.update(1 / 30); } D.keys.e = false; return { chipV: me.chipV, loot: me.loot, thf: me.thf, dt: D.get().time - t0, phase: D.get().phase, sus: D.get().sus }; };
        o.klein = tausch(16000); o.gross = tausch(K.big + 8000);
        K.p1 = 0; me.chipV = 8000; me.loot = 8000; o.okAus = !!cage().ok(me); K.p1 = 1; o.okAn = !!cage().ok(me); me.chipV = 0; o.okLeer = !!cage().ok(me);
        // der grosse Tausch macht im Blick einer Beobachterin misstrauisch: Balken nach dem Tausch (thf) gegen Balken ohne
        const S2 = (${SETUP})(4321); S2.me.thf = 0; o.ohne = w(S2, 8000, 0, K.hot); const S3 = (${SETUP})(4321); S3.me.thf = K.hot; o.mit = w(S3, 8000, 0, 1); return o; })()`);
      t.ok(r.da, 'Aufbau: das Casino hat einen Cage');
      t.eq([r.big, r.hot], [24000, 1.5], 'CFG.casino.chip: big 24000, hot 1,5');
      t.eq([r.klein.chipV, r.klein.loot, r.klein.phase], [0, 16000, 1], 'kleiner Tausch: Chips weg, Wert bleibt, noch Phase 1');
      t.ok(r.klein.dt >= 2 - .1 && r.klein.dt < 5, 'der Tausch dauert (mindestens 2 s): ' + r.klein.dt.toFixed(2));
      t.eq(r.klein.thf, 0, 'kleiner Tausch: lautlos, kein Misstrauen');
      t.eq([r.gross.chipV, r.gross.phase], [0, 1], 'grosser Tausch klappt auch, noch kein Alarm');
      t.ok(r.gross.thf > 0, 'grosser Tausch macht den Kassierer misstrauisch (thf ' + r.gross.thf.toFixed(2) + ')');
      t.eq([r.okAus, r.okAn, r.okLeer], [false, true, false], 'Tausch in Phase 1 nur mit chip.p1 und nur mit Chips in der Tasche');
      t.ok(r.mit > r.ohne + 10, 'misstrauisch (thf): der Balken steigt im Blick deutlich schneller: ' + r.mit.toFixed(1) + ' gegen ' + r.ohne.toFixed(1));
    },
  },
  {
    name: 'Casino-Chips: lautlos durch die Tuer hinaus ist ein lautloser Sieg, getauschte Chips zaehlen voll, ungetauschte mit Hehlerabschlag chip.pen',
    async run(t) {
      await setup(t);
      const r = await t.page.evaluate(`(() => { const o = {}, run = (loot, chipV) => { const S = (${SETUP})(4321), { D, g, me, L } = S; for (const n of g.npcs) { n.st = 'away'; n.at = 1e9 } me.loot = loot; me.chipV = chipV; me.units = 1;
          me.x = (L.bld.x0 + L.bld.x1) / 2 * 32; me.y = (L.bld.y1 + 2) * 32; for (let i = 0; i < 60 && !D.get().ended; i++) D.update(1 / 30); const e = D.get().ended; return { ph: D.get().phase, sec: D.get().secured, win: e ? e.win : null, quiet: e ? e.lines.some(l => /Bonus lautlos/.test(l)) : null }; };
        o.getauscht = run(16000, 0); o.roh = run(16000, 16000); return o; })()`);
      t.eq([r.getauscht.win, r.getauscht.ph], [true, 1], 'getauschte Chips: lautloser Sieg in Phase 1'); t.eq(r.getauscht.quiet, true, 'als lautlos gewertet');
      t.eq(r.getauscht.sec, 16000, 'getauscht: voller Wert');
      t.eq(r.roh.win, true, 'auch ungetauschte Chips: Sieg'); t.eq(r.roh.sec, 8000, 'ungetauscht: Hehlerabschlag ' + 'chip.pen (.5)');
    },
  },
  {
    name: 'Casino-Chips Coop: Chip stehlen und am Cage tauschen durch den Client, Host und Client stimmen ueberein, Phase 1 bleibt',
    async run(t) {
      await setup(t);
      const r = await t.page.evaluate(() => {
        const G = CT.mkGame('casino', 4321, 2), A = G.A, B = G.clients[0], out = {}; A.CFG.policeAt = 1e6; A.CFG.policeForced = 1e6;
        for (const n of A.get().npcs) { n.st = 'away'; n.at = 1e9; } for (const c of A.get().cams) c.off = true;
        const hold = (it, secs) => { B.keys.e = 1; for (let i = 0; i < secs * 60; i++) { const p = A.get().players[1]; p.x = it.x; p.y = it.y + 8; p.vx = p.vy = 0; step(G.insts, G.net, 1 / 60); } B.keys.e = 0; G.run(1); };
        const ch = A.get().its.find(i => i.t === 'good' && i.k === 'chips' && !i.done); hold(ch, 3);
        const v = p => [p.chipV || 0, p.loot]; out.nachChip = [v(A.get().players[1]), v(B.get().players[1])];
        const cg = A.get().its.find(i => i.t === 'cage'); hold(cg, 4);
        out.nachCage = [v(A.get().players[1]), v(B.get().players[1])]; out.phase = [A.get().phase, B.get().phase]; out.sus = [A.get().sus, B.get().sus];
        out.cageOk = B.get().its.find(i => i.t === 'cage').ok(B.get().players[1]); return out; });
      t.eq(r.nachChip[0][0], 8000, 'Host: ein Chipstapel (8000) in der Tasche'); t.eq(r.nachChip[0], r.nachChip[1], 'Client sieht dieselben Chips');
      t.eq(r.nachCage[0], [0, 8000], 'Host: getauscht, Wert bleibt'); t.eq(r.nachCage[0], r.nachCage[1], 'Client sieht den Tausch');
      t.eq(r.phase, [1, 1], 'beide noch in Phase 1'); t.ok(Math.abs(r.sus[0] - r.sus[1]) < 2 && r.sus[0] < 5, 'kein Verdacht: ' + r.sus.join(' / '));
    },
  },
];
