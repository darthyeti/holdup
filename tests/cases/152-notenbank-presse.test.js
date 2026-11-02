// Notenbank N3 (Ticket 66, docs/szenarien.md, Abschnitt Notenbank): Die Notenpresse im Pressenraum (Ring 3) druckt nach dem Alarm Geld, solange sie betreut wird. Anwerfen, Papier nachlegen und Stau beheben sind je ein Objekt (E halten), unbetreut steht sie nach careT s still, Buendel sind tragbar (fit) und die Abgabestelle im Keller zaehlt Beute sofort als gesichert.
const SOLO = `(() => {
  const D = __dbg, T = 32; D.sessReset(); D.setScenario('nb'); D.setSeedMode('random'); D.setLage([]); D.buildSeed(5); D.CFG.policeAt = 1e6; D.CFG.policeForced = 1e6; D.CFG.nb.alarmAt = 1e6; D.reset();
  const g = D.get(), me = g.me; g.npcs.splice(0); const C = D.CFG.nb, pz = D.LAY().nb.press;
  const heist = () => { D.startHeist(true, me); D.nbd().fa.length = 0; D.nbp().nj = 1e9; };
  const cl = (x, y) => D.world().M[y + 6][x + 6], step = (sec, f) => { for (let i = 0; i < Math.round(sec * 30); i++) { me.hp = 1e9; me.dead = false; if (f) f(i); D.update(1 / 30); } };
  const item = t => D.get().its.find(i => i.t === t), near = () => { me.x = (pz[0] + 1.5) * T; me.y = (pz[1] + 2) * T + 10; }, far = () => { me.x = 15.5 * T; me.y = 3.5 * T; };
  const st = () => { const b = D.nbp(); return [b.st, b.n, Math.round(b.paper * 100) / 100, Math.round(b.care * 100) / 100]; };
  return { D, g, me, T, C, cl, step, item, near, far, st, heist, pz };
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
        const H = ${SOLO}, D = H.D, C = H.C, o = {}; H.heist(); C.printT = 2; C.careT = 6; C.paperT = 1e6; C.slots = 20; D.nbp().st = 1;
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
        D.nbp().st = 1; D.nbp().paper = 1; D.nbp().n = 0; D.nbp().nj = 2; C.printT = 1; C.paperT = 1e6; H.step(4); o.jam = H.st(); o.fixOk = [H.item('nbp2').ok(), H.item('nbp1').ok()]; const n = o.jam[1]; H.step(3); o.jamStill = H.st()[1] === n;
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
        const H = ${SOLO}, D = H.D, C = H.C, me = H.me, o = {}; H.heist(); D.nbp().m = 15; D.nbp().st = 1;
        const b = D.get().its.filter(i => i.t === 'nbb'); o.ok = [b[0].ok(), b[3].ok(), b[4].ok()]; const l0 = me.loot, u0 = me.units; b[0].act(me); o.took = [me.loot - l0, me.units - u0, D.nbp().m, b[0].ok()];
        me.units = me.bag; o.full = [b[1].fit(me), (b[1].act(me), D.nbp().m >> 1 & 1)]; me.units = u0 + C.bundleU;
        const dep = H.item('nbdep'); o.depOk = [dep.ok(me), (me.loot = 0, dep.ok(me))]; me.loot = 12000; me.units = 2; const s0 = D.get().secured; dep.act(me); o.dep = [D.get().secured - s0, me.loot, me.units, me.out];
        me.loot = 3000; me.dead = true; D.finish(false, 'Test', 'x'); const e = D.get().ended, ln = e && e.lines.find(l => /^Ergebnis:/.test(l)); o.end = e && [e.win, ln, e.lines.find(l => /^Beute:/.test(l))];
        return o; })()`);
      t.eq(r.ok, [true, true, false], 'nur gedruckte Buendel sind einpackbar');
      t.eq(r.took, [5000, .5, 14, false], 'ein Buendel bringt bundleV und braucht bundleU Platz: ' + JSON.stringify(r.took));
      t.eq(r.full, [false, 1], 'bei voller Tasche passt es nicht (fit) und bleibt liegen');
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
        o.map = CT.diff(CT.sig(A), CT.sig(B)); A.startHeist(true, A.get().me); G.run(1); A.nbp().nj = 1e9;
        const bid = B.get().me.id, pa = A.get().players[bid], pz = A.LAY().nb.press; for (const p of [pa, B.get().me]) { p.x = (pz[0] + 1.5) * T; p.y = (pz[1] + 2) * T + 10; }
        both(1); o.before = [A.nbp().st, B.nbp().st];
        B.cv.dispatchEvent(new KeyboardEvent('keydown', { key: 'e', bubbles: true })); both(A.CFG.nb.startPT + 1); B.cv.dispatchEvent(new KeyboardEvent('keyup', { key: 'e', bubbles: true })); both(8); G.run(1);
        o.run = [A.nbp().st, B.nbp().st, A.nbp().n, B.nbp().n];
        A.CFG.nb.printT = 1e6; both(1); G.run(1); const ba = A.get().its.filter(i => i.t === 'nbb'); o.pre = [A.nbp().m & 1, B.nbp().m & 1]; ba[0].act(pa); both(1); G.run(1); o.taken = [A.nbp().m & 1, B.nbp().m & 1];
        pa.loot = 9000; const s0 = A.get().secured; A.get().its.find(i => i.t === 'nbdep').act(pa); both(1); G.run(1); o.dep = [A.get().secured - s0, B.get().secured - s0]; o.dvs = [A.nbp().dv, B.nbp().dv];
        return o; })()`);
      t.eq(r.map, [], 'gleiche Welt');
      t.eq(r.before, [0, 0], 'vor dem Anwerfen steht sie auf beiden');
      t.ok(r.run[0] === 1 && r.run[1] === 1 && r.run[2] >= 3 && Math.abs(r.run[2] - r.run[3]) <= 1, 'Client hat sie per E angeworfen, laeuft und druckt auf beiden: ' + JSON.stringify(r.run));
      t.eq([r.pre, r.taken], [[1, 1], [0, 0]], 'das Buendel lag auf beiden und ist nach dem Einpacken auf beiden weg');
      t.eq(r.dep[0], r.dep[1], 'die Abgabe zaehlt als gesichert auf Host und Client gleich: ' + JSON.stringify(r.dep));
      t.eq(r.dvs[0], r.dvs[1], 'der Stapel auf dem Abgabetisch (dv) ist auf Host und Client gleich: ' + JSON.stringify(r.dvs));
      t.ok(r.dep[0] >= 9000, 'mindestens die abgegebene Beute: ' + JSON.stringify(r.dep));
    },
  },
  {
    name: 'Presse: Sie druckt endlos solange betreut, die Ablage hat slots Plaetze, ist sie voll haelt die Presse an (Ablage voll) und laeuft von selbst weiter, sobald ein Buendel weg ist; die Zahl der Buendel ist nicht gedeckelt',
    timeout: 120000,
    async run(t) {
      const r = await t.page.evaluate(`(() => {
        const H = ${SOLO}, D = H.D, C = H.C, me = H.me, o = {}; H.heist(); C.printT = 1; C.paperT = 1e6; C.slots = 6; D.nbp().st = 1; H.near(); me.bag = 1e6; H.step(12); o.full = H.st().concat(D.nbp().m); const n0 = D.nbp().n; H.step(5); o.still = [D.nbp().n === n0, D.nbp().st];
        const b = D.get().its.filter(i => i.t === 'nbb'); b[2].act(me); H.step(2.5); o.resumed = [D.nbp().n - n0, D.nbp().m];
        for (let i = 0; i < 40; i++) { for (const k of b) if (k.ok()) k.act(me); H.step(1.5); } o.many = D.nbp().n; o.loot = me.loot;
        return o; })()`);
      t.eq([r.full[0], r.full[1], r.full[4]], [6, 6, 63], 'Ablage voll: Presse steht (6), sechs Buendel liegen: ' + JSON.stringify(r.full));
      t.eq(r.still[0], true, 'bei voller Ablage druckt sie nichts');
      t.ok(r.resumed[0] === 1 && r.resumed[1] === 63, 'ein Buendel weg, sie druckt von selbst genau eins nach und fuellt die Ablage wieder, ohne Wiederanwerfen: ' + JSON.stringify(r.resumed));
      t.ok(r.many > 30, 'keine feste Kappe: ueber 30 Buendel gedruckt (' + r.many + '), Beute ' + r.loot);
    },
  },
  {
    name: 'Presse: Druckstufe. Je escN gedruckte Buendel eine Stufe: groessere Wellen, hoeheres maxEn (bis maxEnCap) und kuerzere Wellenpause, nur in der Notenbank; ohne gedruckte Buendel bleibt es bei Stufe 0',
    timeout: 180000,
    async run(t) {
      const r = await t.page.evaluate(`(() => {
        const o = {}, run = n => { const H = ${SOLO}, D = H.D, C = H.C; D.CFG.policeForced = 2; H.heist(); C.maxEn = 5; C.maxEnCap = 20; C.escN = 5; C.escMax = 1; C.escWave = 1; C.escGap = .06; D.CFG.policeForced = 2; D.CFG.waveGap = 10; D.CFG.waveGapMin = 10; D.CFG.waveGapStep = 0; D.nbp().n = n;
          let mx = 0; H.step(70, () => { const k = D.get().en.filter(e => e.hp > 0 && (e.kind === 'cop' || e.kind === 'swat' || e.kind === 'shield')).length; if (k > mx) mx = k; }); return { lvl: D.nbLvl(), cap: D.nbMaxEn(), mx, waves: D.get().waveN }; };
        const first = n => { const H = ${SOLO}, D = H.D, C = H.C; D.CFG.policeForced = 2; H.heist(); C.maxEn = 60; C.maxEnCap = 60; C.escN = 5; C.escWave = 1; D.nbp().n = n; H.step(2.4); const g = D.get(); return g.waveN * 1000 + g.en.filter(e => e.hp > 0 && (e.kind === 'cop' || e.kind === 'swat' || e.kind === 'shield')).length + g.cars.reduce((m, c) => m + (c.crew ? c.crew.length : 0), 0) + g.fps.reduce((m, f) => m + f.crew.length, 0); };
        o.a = run(0); o.b = run(30); o.w0 = first(0); o.w6 = first(30); return o; })()`);
      t.eq([r.a.lvl, r.b.lvl], [0, 6], 'Stufe aus der Zahl gedruckter Buendel');
      t.eq([r.a.cap, r.b.cap], [5, 11], 'maxEn steigt je Stufe bis maxEnCap');
      t.ok(r.a.mx <= 5 && r.b.mx > r.a.mx && r.b.mx <= 11, 'mehr Beamte gleichzeitig auf hoeherer Stufe: ' + JSON.stringify([r.a.mx, r.b.mx]));
      t.ok(r.w0 % 1000 > 0 && r.w6 % 1000 - r.w0 % 1000 === 6 && Math.floor(r.w0 / 1000) === 1, 'die erste Welle ist auf Stufe 6 um 6 Beamte (escWave je Stufe) groesser: ' + JSON.stringify([r.w0, r.w6]));
      t.ok(r.b.waves > r.a.waves, 'kuerzere Wellenpause, mehr Wellen in gleicher Zeit: ' + JSON.stringify([r.a.waves, r.b.waves]));
    },
  },
  {
    name: 'Presse: Die Staus kommen aus dem Seed und liegen nach jamMin bis jamMin+jamVar gedruckten Buendeln auseinander (nie zwei kurz hintereinander), gleicher Seed gleiche Folge',
    timeout: 120000,
    async run(t) {
      const r = await t.page.evaluate(`(() => {
        const seq = () => { const H = ${SOLO}, D = H.D, C = H.C; D.startHeist(true, H.me); D.nbd().fa.length = 0; const nj0 = D.nbp().nj; C.printT = .2; C.paperT = 1e6; C.slots = 6; D.nbp().st = 1; H.near(); H.me.bag = 1e6; const at = [];
          for (let i = 0; i < 400 && at.length < 5; i++) { H.step(.2); for (const k of D.get().its) if (k.t === 'nbb' && k.ok()) k.act(H.me); if (D.nbp().st === 3) { at.push(D.nbp().n); H.item('nbp2').act(); } } return { nj0, at, C: [C.jamMin, C.jamVar] }; };
        return { a: seq(), b: seq() }; })()`);
      t.eq(r.a.at, r.b.at, 'gleicher Seed, gleiche Staus');
      t.eq(r.a.at.length, 5, 'fuenf Staus beobachtet: ' + JSON.stringify(r.a));
      const [mn, vr] = r.a.C; let ok = r.a.at[0] >= mn; for (let i = 1; i < r.a.at.length; i++) { const d = r.a.at[i] - r.a.at[i - 1]; if (d < mn || d > mn + vr) ok = false; }
      t.ok(ok, 'Abstaende zwischen jamMin und jamMin+jamVar: ' + JSON.stringify(r.a.at));
    },
  },
  {
    name: 'Presse Optik: Presse, Foerderband, Ausgabetisch und Abgabetisch stehen auf eigenen Kacheln N (solide, keine Moebel oder zerlegbaren Teile darunter), die sechs Ablageplaetze liegen auf dem Ausgabetisch, die Abgabe stapelt sichtbar (dv)',
    timeout: 120000,
    async run(t) {
      const r = await t.page.evaluate(`(() => {
        const H = ${SOLO}, D = H.D, T = H.T, L = D.LAY().nb, o = {}, cells = [];
        for (let y = 0; y < 2; y++) for (let x = 0; x < 3; x++) cells.push([L.press[0] + x, L.press[1] + y]); cells.push([L.belt[0], L.press[1]], [L.belt[0], L.press[1] + 1]);
        for (let y = 0; y < 3; y++) for (let x = 0; x < 2; x++) cells.push([L.tab[0] + x, L.tab[1] + y]); cells.push([L.dep[0], L.dep[1]], [L.dep[0] + 1, L.dep[1]]);
        o.chars = cells.map(c => H.cl(c[0], c[1])).join(''); o.sol = cells.every(c => D.isSol(c[0], c[1]));
        o.mat = D.get().its.filter(i => i.t === 'mat' && cells.some(c => i.x >= c[0] * T && i.x < (c[0] + 1) * T && i.y >= c[1] * T && i.y < (c[1] + 1) * T)).length;
        const b = D.get().its.filter(i => i.t === 'nbb'); o.slots = b.length; o.onTable = b.every(i => i.x >= L.tab[0] * T && i.x < (L.tab[0] + 2) * T && i.y >= L.tab[1] * T && i.y < (L.tab[1] + 3) * T);
        o.cand = L.pcand.every(p => [0, 1, 2].every(k => D.world().M[p[1] + 6 + (k === 2 ? 2 : 0)] !== undefined));
        H.heist(); const me = H.me; me.loot = 7000; const v0 = D.nbp().dv; D.get().its.find(i => i.t === 'nbdep').act(me); o.dv = D.nbp().dv - v0; return o; })()`);
      t.eq(r.chars, 'N'.repeat(r.chars.length), 'alle Maschinen- und Tischkacheln sind N: ' + r.chars);
      t.ok(r.chars.length === 6 + 2 + 6 + 2 && r.sol, 'Kollision bleibt, 16 Kacheln');
      t.eq(r.mat, 0, 'kein zerlegbares Teil unter den Maschinen und Tischen');
      t.ok(r.slots === 6 && r.onTable, 'die sechs Ablageplaetze liegen auf dem Ausgabetisch');
      t.eq(r.dv, 7000, 'die Abgabe zaehlt in dv (Stapel auf dem Abgabetisch)');
    },
  },
];
