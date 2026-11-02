// Notenbank N3 (Ticket 66, docs/szenarien.md, Abschnitt Notenbank): Die Notenpresse im Pressenraum (Ring 3) druckt nach dem Alarm Geld, solange sie betreut wird. Anwerfen, Papier nachlegen und Stau beheben sind je ein Objekt (E halten), unbetreut steht sie nach careT s still, Buendel sind tragbar (fit) und die Abgabestelle im Keller zaehlt Beute sofort als gesichert.
const SOLO = `(() => {
  const D = __dbg, T = 32; D.sessReset(); D.setScenario('nb'); D.setSeedMode('random'); D.setLage([]); D.buildSeed(5); D.CFG.policeAt = 1e6; D.CFG.policeForced = 1e6; D.CFG.nb.alarmAt = 1e6; D.reset();
  const g = D.get(), me = g.me; g.npcs.splice(0); const C = D.CFG.nb, pz = D.LAY().nb.press;
  const heist = () => { D.startHeist(true, me); D.nbd().fa.length = 0; D.nbp().jam.length = 0; };
  const step = (sec, f) => { for (let i = 0; i < Math.round(sec * 30); i++) { me.hp = 1e9; me.dead = false; if (f) f(i); D.update(1 / 30); } };
  const item = t => D.get().its.find(i => i.t === t), near = () => { me.x = (pz[0] + 1.5) * T; me.y = (pz[1] + 2) * T + 10; }, far = () => { me.x = 15.5 * T; me.y = 3.5 * T; };
  const st = () => { const b = D.nbp(); return [b.st, b.n, Math.round(b.paper * 100) / 100, Math.round(b.care * 100) / 100]; };
  return { D, g, me, T, C, step, item, near, far, st, heist, pz };
})()`;

module.exports = [
  {
    name: 'Presse: Anwerfen mit E (halten), vorher und ohne Alarm geht nichts, das Anwerfen ist ein eigenes Objekt (Papier und Stau sind weitere), druckt dann alle printT s ein Buendel',
    timeout: 120000,
    async run(t) {
      const r = await t.page.evaluate(`(() => {
        const H = ${SOLO}, D = H.D, C = H.C, o = {}; o.p1 = [H.item('nbp0').ok(), H.item('nbp1').ok(), H.item('nbp2').ok()]; H.heist(); o.p2 = [H.item('nbp0').ok(), H.item('nbp1').ok(), H.item('nbp2').ok()];
        C.printT = 3; H.near(); D.keys.e = true; H.step(C.startPT - 1); o.mid = H.st(); H.step(2.5); D.keys.e = false; o.run = H.st(); H.step(7); o.later = H.st(); o.ok = [H.item('nbp0').ok(), H.item('nbp2').ok()];
        return o; })()`);
      t.eq(r.p1, [false, false, false], 'ohne Alarm ist nichts moeglich');
      t.eq(r.p2, [true, false, false], 'nach dem Alarm nur Anwerfen');
      t.eq(r.mid[0], 0, 'vor Ablauf der Haltezeit steht sie noch: ' + JSON.stringify(r.mid));
      t.eq(r.run[0], 1, 'nach der Haltezeit laeuft sie: ' + JSON.stringify(r.run));
      t.ok(r.later[1] >= 2 && r.later[1] <= 4, 'sie druckt etwa alle printT s ein Buendel: ' + JSON.stringify(r.later));
      t.eq(r.ok, [false, false], 'laufend ist weder Anwerfen noch Stau-Beheben moeglich');
    },
  },
  {
    name: 'Presse: Druck nur betreut. In der Naehe bleibt care voll, ohne Betreuung steht sie nach careT s (Zustand unbetreut), druckt dann nichts mehr, Wiederanwerfen setzt sie fort ohne Verlust',
    timeout: 120000,
    async run(t) {
      const r = await t.page.evaluate(`(() => {
        const H = ${SOLO}, D = H.D, C = H.C, o = {}; H.heist(); C.printT = 2; C.careT = 6; C.paperT = 1e6; D.nbp().st = 1;
        H.near(); H.step(10); o.near = H.st(); H.far(); H.step(4); o.part = H.st(); H.step(4); o.stopped = H.st(); const n0 = o.stopped[1]; H.step(8); o.still = H.st();
        o.ok = [H.item('nbp0').ok(), H.item('nbp0').lab()]; H.item('nbp0').act(); H.near(); H.step(5); o.again = H.st();
        return o; })()`);
      t.eq([r.near[0], r.near[3]], [1, 1], 'in der Naehe laeuft sie, care bleibt voll: ' + JSON.stringify(r.near));
      t.ok(r.near[1] >= 4, 'sie hat gedruckt: ' + JSON.stringify(r.near));
      t.ok(r.part[3] < 1 && r.part[3] > 0 && r.part[0] === 1, 'ohne Betreuung sinkt care, noch laeuft sie: ' + JSON.stringify(r.part));
      t.eq(r.stopped[0], 4, 'nach careT s steht sie (unbetreut): ' + JSON.stringify(r.stopped));
      t.eq(r.still[1], r.stopped[1], 'unbetreut druckt sie nichts mehr');
      t.ok(r.ok[0] && /wieder anwerfen/.test(r.ok[1]), 'Wiederanwerfen ist moeglich');
      t.ok(r.again[0] === 1 && r.again[1] > r.stopped[1], 'danach laeuft sie weiter und druckt: ' + JSON.stringify(r.again));
    },
  },
  {
    name: 'Presse: Papier reicht paperT s, leer steht sie, Papier nachlegen (eigenes Objekt) setzt sie fort; Stau nach jam-Zahl der Buendel, Stau beheben (eigenes Objekt) setzt sie fort',
    timeout: 120000,
    async run(t) {
      const r = await t.page.evaluate(`(() => {
        const H = ${SOLO}, D = H.D, C = H.C, o = {}; H.heist(); C.printT = 100; C.paperT = 10; D.nbp().st = 1; H.near(); H.step(2); o.p0 = H.item('nbp1').ok(); H.step(3); o.half = H.st(); o.p1 = H.item('nbp1').ok(); H.step(6); o.empty = H.st();
        o.p1b = H.item('nbp1').ok(); H.item('nbp1').act(); o.fed = H.st();
        D.nbp().st = 1; D.nbp().paper = 1; D.nbp().n = 0; D.nbp().jam.push(2); C.printT = 1; C.paperT = 1e6; H.step(4); o.jam = H.st(); o.fixOk = [H.item('nbp2').ok(), H.item('nbp1').ok()]; const n = o.jam[1]; H.step(3); o.jamStill = H.st()[1] === n;
        H.item('nbp2').act(); o.fixed = H.st(); H.step(3); o.after = H.st();
        return o; })()`);
      t.ok(r.half[0] === 1 && Math.abs(r.half[2] - .5) < .06 && !r.p0 && r.p1, 'Papier sinkt mit der Zeit, bei 80 % noch kein Nachlegen, bei 50 % ja: ' + JSON.stringify(r.half));
      t.eq([r.empty[0], r.empty[2]], [2, 0], 'leer: steht (Papier leer): ' + JSON.stringify(r.empty));
      t.ok(r.p1b && r.fed[0] === 1 && r.fed[2] === 1, 'Papier nachlegen setzt sie fort: ' + JSON.stringify(r.fed));
      t.eq(r.jam[0], 3, 'Stau nach der gesetzten Zahl: ' + JSON.stringify(r.jam));
      t.eq(r.fixOk, [true, false], 'bei Stau nur Stau beheben');
      t.ok(r.jamStill, 'im Stau druckt sie nichts');
      t.ok(r.fixed[0] === 1 && r.after[1] > r.fixed[1], 'Stau behoben, sie druckt weiter: ' + JSON.stringify(r.after));
    },
  },
  {
    name: 'Presse: Buendel sind tragbar (Platzbedarf fit, voll gibt Tasche voll), nur gedruckte sind einpackbar; Abgabe im Keller zaehlt die Beute sofort als gesichert, auch wenn der Traeger danach faellt und das Team verliert',
    timeout: 120000,
    async run(t) {
      const r = await t.page.evaluate(`(() => {
        const H = ${SOLO}, D = H.D, C = H.C, me = H.me, o = {}; H.heist(); D.nbp().n = 4; D.nbp().st = 5;
        const b = D.get().its.filter(i => i.t === 'nbb'); o.ok = [b[0].ok(), b[3].ok(), b[4].ok()]; const l0 = me.loot, u0 = me.units; b[0].act(me); o.took = [me.loot - l0, me.units - u0, b[0].done, b[0].ok()];
        me.units = me.bag; o.full = [b[1].fit(me), (b[1].act(me), b[1].done)]; me.units = u0 + C.bundleU;
        const dep = H.item('nbdep'); o.depOk = [dep.ok(me), (me.loot = 0, dep.ok(me))]; me.loot = 12000; me.units = 2; const s0 = D.get().secured; dep.act(me); o.dep = [D.get().secured - s0, me.loot, me.units, me.out];
        me.loot = 3000; me.dead = true; D.finish(false, 'Test', 'x'); const e = D.get().ended, ln = e && e.lines.find(l => /^Ergebnis:/.test(l)); o.end = e && [e.win, ln, e.lines.find(l => /^Beute:/.test(l))];
        return o; })()`);
      t.eq(r.ok, [true, true, false], 'nur gedruckte Buendel sind einpackbar');
      t.eq(r.took, [5000, .5, true, false], 'ein Buendel bringt bundleV und braucht bundleU Platz: ' + JSON.stringify(r.took));
      t.eq(r.full, [false, false], 'bei voller Tasche passt es nicht (fit) und bleibt liegen');
      t.eq(r.depOk, [true, false], 'Abgabe nur mit Beute');
      t.eq(r.dep, [12000, 0, 0, false], 'Abgabe: sofort gesichert, Tasche leer, der Spieler bleibt im Spiel: ' + JSON.stringify(r.dep));
      const num = s => +String(s).replace(/[^0-9]/g, '');
      t.ok(r.end && r.end[0] === false && num(r.end[2]) >= 12000 && num(r.end[1]) >= 12000, 'auch bei verlorenem Auftrag zaehlt das Abgegebene, die Beute im Ergebnis: ' + JSON.stringify(r.end));
    },
  },
  {
    name: 'Presse Coop: Der Client haelt E und wirft die Presse an, Zustand, Papier und gedruckte Zahl kommen auf dem Client an, ein eingepacktes Buendel ist auf beiden weg, die Abgabe des Clients zaehlt auf dem Host',
    timeout: 180000,
    async run(t) {
      await t.loadTool('loopnet.js'); await t.loadInpage('coop.js');
      const r = await t.page.evaluate(`(() => {
        const G = CT.mkGame('nb', 5, 2, 60, 20), A = G.A, B = G.clients[0], o = {}, T = 32;
        const both = (sec, f) => { for (let i = 0; i < Math.round(sec * 60); i++) { A.get().players.forEach(p => { p.hp = 1e9; p.dead = false; }); if (f) f(i); G.run(1 / 60); } };
        for (const D of [A, B]) { D.CFG.policeAt = 1e6; D.CFG.policeForced = 1e6; D.CFG.nb.alarmAt = 1e6; D.CFG.nb.printT = 2; }
        o.map = CT.diff(CT.sig(A), CT.sig(B)); A.startHeist(true, A.get().me); G.run(1); A.nbp().jam.length = 0;
        const bid = B.get().me.id, pa = A.get().players[bid], pz = A.LAY().nb.press; for (const p of [pa, B.get().me]) { p.x = (pz[0] + 1.5) * T; p.y = (pz[1] + 2) * T + 10; }
        both(1); o.before = [A.nbp().st, B.nbp().st];
        B.cv.dispatchEvent(new KeyboardEvent('keydown', { key: 'e', bubbles: true })); both(A.CFG.nb.startPT + 1); B.cv.dispatchEvent(new KeyboardEvent('keyup', { key: 'e', bubbles: true })); both(8); G.run(1);
        o.run = [A.nbp().st, B.nbp().st, A.nbp().n, B.nbp().n];
        const ba = A.get().its.filter(i => i.t === 'nbb'), bb = B.get().its.filter(i => i.t === 'nbb'); ba[0].act(pa); both(1); G.run(1); o.taken = [ba[0].done, bb[0].done];
        pa.loot = 9000; const s0 = A.get().secured; A.get().its.find(i => i.t === 'nbdep').act(pa); both(1); G.run(1); o.dep = [A.get().secured - s0, B.get().secured - s0];
        return o; })()`);
      t.eq(r.map, [], 'gleiche Welt');
      t.eq(r.before, [0, 0], 'vor dem Anwerfen steht sie auf beiden');
      t.ok(r.run[0] === 1 && r.run[1] === 1 && r.run[2] >= 3 && Math.abs(r.run[2] - r.run[3]) <= 1, 'Client hat sie per E angeworfen, laeuft und druckt auf beiden: ' + JSON.stringify(r.run));
      t.eq(r.taken, [true, true], 'das eingepackte Buendel ist auf beiden weg');
      t.eq(r.dep[0], r.dep[1], 'die Abgabe zaehlt als gesichert auf Host und Client gleich: ' + JSON.stringify(r.dep));
      t.ok(r.dep[0] >= 9000, 'mindestens die abgegebene Beute: ' + JSON.stringify(r.dep));
    },
  },
];
