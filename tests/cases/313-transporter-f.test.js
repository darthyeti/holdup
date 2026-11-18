// #313: Transporter, F vor dem Halt. Beim Geldtransporter (ohne Panne) zieht F vor dem Halt des Panzerwagens nur die Waffe (armed), Phase 2 und Polizeiuhr beginnen erst beim Halt, beim ersten Schuss oder bei einem Alarm
// (Verdacht, Vorhut, Fund). Bank und die Panne bleiben wie bisher (F = Ueberfall). Die Polizei kommt dann frueestens CFG.policeForced nach dem Halt, nicht vor dem Wagen.
async function setup(t) {
  await t.loadTool('loopnet.js');
  await t.loadInpage('coop.js');
}
const FIND = `(pred, n) => { const D = __dbg, out = []; D.setScenario('truck'); D.setSeedMode('random'); D.setLage([]); for (let sd = 1; sd < 900 && out.length < n; sd++) { const m = D.genTruckMission(sd); if (pred(m)) out.push(sd); } return out; }`;
const PLAIN = `m => !m.panne && !m.vorhut && m.street === 'std'`;
const KEYF = `d => d.cv.dispatchEvent(new KeyboardEvent('keydown', { key: 'f', bubbles: true }))`;
// fertige Sperre 1, damit der Wagen haelt
const SPERRE = `d => { for (const q of d.bars().filter(x => x.rd && x.g === 1)) { q.lv = 1; q.hp = 100; } }`;
// Spielzeit in Schritten, Spieler unverwundbar; bricht ab, sobald f() wahr ist
const GO = `(G, f, sec) => { for (let i = 0; i < sec * 4; i++) { for (const p of G.A.get().players) p.hp = 1e9; G.run(.25); if (f()) return i / 4; } return -1; }`;

module.exports = [
  {
    name: 'F vor dem Halt: Phase bleibt 1, Spieler bewaffnet, keine Polizeiuhr; nach dem Halt Phase 2, Welle 1 erst policeForced nach dem Halt',
    async run(t) {
      await setup(t);
      const r = await t.page.evaluate(`(() => { const F = ${FIND}, K = ${KEYF}, SP = ${SPERRE}, GO = ${GO}, sd = F(${PLAIN}, 1)[0], G = CT.mkGame('truck', sd, 1), A = G.A, o = {}; SP(A);
        o.vor = [A.tk().st, A.get().phase]; K(A); G.run(.5); const g = A.get(); o.f = [g.phase, g.me.armed, g.policeAt, A.get().tH, g.waveN]; o.msg = A.msgs().feed.some(s => /funkt Alarm|Polizei in/.test(s));
        GO(G, () => A.tk().st === 'drive', 200); o.fahrt = [A.get().phase, A.get().policeAt, A.get().me.armed];
        const h = GO(G, () => A.tk().st === 'stopped', 200); o.halt = h >= 0; const g2 = A.get(); o.n = [g2.phase, g2.policeAt, g2.tH < 1.5, g2.waveN, A.msgs().feed.some(s => /Der Fahrer funkt Alarm/.test(s))]; o.pf = A.CFG.policeForced;
        o.fr = A.flog().dump().ereignisse.filter(e => e[2] === 'ausloeser').map(e => e[3][1]);
        const w = GO(G, () => A.get().waveN > 0 || A.get().tH > 60, 90); o.welle = [A.get().tH, A.get().waveN, A.get().policeAt]; return o; })()`);
      t.eq([r.vor[0], r.vor[1]], ['wait', 1], 'Start: Wagen wartet, Phase 1');
      t.ok(r.f[0] === 1 && r.f[1] === true && r.f[2] === 0 && r.f[4] === 0, 'F vor dem Halt: Phase 1, bewaffnet, keine Polizeiuhr: ' + JSON.stringify(r.f));
      t.ok(!r.msg, 'keine Funkalarm-Meldung');
      t.ok(r.fahrt[0] === 1 && r.fahrt[1] === 0 && r.fahrt[2] === true, 'der Wagen faehrt, noch Phase 1, Uhr steht: ' + JSON.stringify(r.fahrt));
      t.ok(r.halt, 'der Wagen haelt');
      t.ok(r.n[0] === 2 && r.n[1] >= r.pf && r.n[2] && r.n[3] === 0 && r.n[4], 'Halt: Phase 2, Polizeiuhr ab dem Halt (>= policeForced), Meldung Fahrer funkt Alarm: ' + JSON.stringify(r.n));
      t.eq(r.fr, ['Zugriff'], 'Ausloeser im Flugschreiber ist der Halt');
      t.ok(r.welle[1] > 0 && r.welle[0] >= r.pf, 'Welle 1 kommt erst ab policeForced nach dem Halt: ' + JSON.stringify(r.welle));
    },
  },
  {
    name: 'Erster Schuss vor dem Halt startet Phase 2 sofort (Ausloeser Schuss, Funkalarm ohne "Der Fahrer", solange kein Wagen da ist)',
    async run(t) {
      await setup(t);
      const r = await t.page.evaluate(`(() => { const F = ${FIND}, K = ${KEYF}, SP = ${SPERRE}, sd = F(${PLAIN}, 1)[0], G = CT.mkGame('truck', sd, 1), A = G.A, o = {}; SP(A);
        K(A); G.run(.3); o.arm = [A.get().phase, A.get().me.armed]; const me = A.get().me; me.mag = 10; me.res = 30; A.setFocus(true); A.keys[' '] = 1; G.run(.4); A.keys[' '] = 0;
        const g = A.get(); o.sch = [g.phase, g.policeAt > 0, A.tk().st]; o.aus = A.flog().dump().ereignisse.filter(e => e[2] === 'ausloeser').map(e => e[3][1]); o.msg = A.msgs().feed.filter(s => /Polizei in/.test(s)); return o; })()`);
      t.eq(r.arm, [1, true], 'F: bewaffnet, Phase 1');
      t.eq([r.sch[0], r.sch[1], r.sch[2]], [2, true, 'wait'], 'Schuss: Phase 2, Uhr laeuft, Wagen noch nicht da: ' + JSON.stringify(r.sch));
      t.eq(r.aus, ['Schuss'], 'Ausloeser Schuss');
      t.ok(r.msg.length === 1 && /^Alarm! Polizei in/.test(r.msg[0]), 'Meldung ohne "Der Fahrer": ' + JSON.stringify(r.msg));
    },
  },
  {
    name: 'Verdacht, Alarm und Vorhut vor dem Halt starten weiter sofort Phase 2 (ohne F)',
    async run(t) {
      await setup(t);
      const r = await t.page.evaluate(`(() => { const F = ${FIND}, o = {}; let sd = F(${PLAIN}, 1)[0], G = CT.mkGame('truck', sd, 1), A = G.A;
        A.detect(A.get().me, undefined, A.get().me.x, A.get().me.y, null); o.sus = [A.get().phase, A.get().policeAt > 0, A.flog().dump().ereignisse.filter(e => e[2] === 'ausloeser').map(e => e[3][1])];
        sd = F(m => m.vorhut, 1)[0]; G = CT.mkGame('truck', sd, 1); A = G.A; const m = A.LAY().mission; for (const q of A.bars().filter(x => x.rd && x.g === 1)) { q.lv = 1; q.hp = 100; }
        let i = 0; for (; i < 300 && A.get().phase === 1 && A.get().time < 1e6; i++) { A.get().me.hp = 1e9; G.run(.5); }
        o.vh = [A.get().phase, A.get().policeAt > 0, A.vh().st, A.flog().dump().ereignisse.filter(e => e[2] === 'ausloeser').map(e => e[3][1])]; return o; })()`);
      t.eq([r.sus[0], r.sus[1], r.sus[2]], [2, true, ['Verdacht']], 'Verdacht startet sofort');
      t.ok(r.vh[0] === 2 && r.vh[1] && r.vh[3].length === 1 && r.vh[3][0] === 'Vorhut', 'Vorhut vor der fertigen Sperre startet den Ueberfall: ' + JSON.stringify(r.vh));
    },
  },
  {
    name: 'Panne und Bank: F ist wie bisher sofort der Ueberfall (Panne: der Wagen steht schon)',
    async run(t) {
      await setup(t);
      const r = await t.page.evaluate(`(() => { const F = ${FIND}, K = ${KEYF}, o = {}; let sd = F(m => m.panne, 1)[0], G = CT.mkGame('truck', sd, 1), A = G.A;
        K(A); G.run(.5); o.pa = [A.get().phase, A.get().policeAt > 0, A.flog().dump().ereignisse.filter(e => e[2] === 'ausloeser').map(e => e[3][1])];
        G = CT.mkGame('bank', 321, 1); A = G.A; A.CFG.policeAt = 1e6; A.CFG.policeForced = 1e6; K(A); G.run(.5); o.bank = [A.get().phase, A.get().me.armed, A.flog().dump().ereignisse.filter(e => e[2] === 'ausloeser').map(e => e[3][1])]; return o; })()`);
      t.eq([r.pa[0], r.pa[1], r.pa[2]], [2, true, ['F']], 'Panne: F startet den Ueberfall');
      t.eq([r.bank[0], r.bank[1], r.bank[2]], [2, true, ['F']], 'Bank: F startet den Ueberfall');
    },
  },
  {
    name: 'Coop: F eines Clients vor dem Halt bewaffnet nur ihn, der Host und beide Clients sehen es (armed im Schnappschuss), Phase 1 bei allen',
    async run(t) {
      await setup(t);
      const r = await t.page.evaluate(`(() => { const F = ${FIND}, K = ${KEYF}, sd = F(${PLAIN}, 1)[0], G = CT.mkGame('truck', sd, 3), A = G.A, B = G.clients[0], C = G.clients[1], o = {}; A.CFG.policeAt = 1e6; A.CFG.policeForced = 1e6;
        K(B); G.run(1); const arm = d => d.get().players.map(p => p.armed ? 1 : 0).join(''); o.arm = [arm(A), arm(B), arm(C)]; o.ph = [A.get().phase, B.get().phase, C.get().phase]; return o; })()`);
      t.eq(r.ph, [1, 1, 1], 'alle noch in Phase 1');
      t.eq(r.arm, ['010', '010', '010'], 'nur Spieler 1 ist bewaffnet, ueberall sichtbar');
    },
  },
];
