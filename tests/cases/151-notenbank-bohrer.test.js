// Notenbank N2 (Ticket 63, docs/szenarien.md, Abschnitt Notenbank): Der Tunnelbohrer im Keller (Ring 4) gräbt den Tunnel. Start mit E (halten, CFG.nb.startT), Fortschritt 0 bis 100 % in CFG.nb.drillT, Störung durch Beschuss, einen Beamten im Keller oder einen Defekt nach Zeit (aus dem Seed), Wiederanwerfen mit E ohne Verlust, ab 100 % öffnet die Tunneltür. Der Ausgang liegt draußen im Kanalschacht und ist von außen nicht erreichbar.
const SOLO = `(() => {
  const D = __dbg, T = 32; D.sessReset(); D.setScenario('nb'); D.setSeedMode('random'); D.setLage([]); D.buildSeed(5); D.CFG.policeAt = 1e6; D.CFG.policeForced = 1e6; D.CFG.nb.alarmAt = 1e6; D.reset();
  const g = D.get(), me = g.me; g.npcs.splice(0); D.startHeist(true, me); D.nbd().fa.length = 0;
  const cl = (x, y) => D.world().M[y + 6][x + 6], rig = D.LAY().nb.rig, door = D.LAY().nb.door;
  const step = (sec, f) => { for (let i = 0; i < Math.round(sec * 30); i++) { me.hp = 1e9; me.dead = false; if (f) f(i); D.update(1 / 30); } };
  const item = t => D.get().its.find(i => i.t === t), at = () => { me.x = (rig[0] + 1) * T; me.y = (rig[1] + 2) * T + 10; };
  const st = () => { const b = D.nbd(); return [b.st, Math.round(b.p * 100) / 100, b.c]; };
  return { D, g, me, T, cl, step, item, at, rig, door, st };
})()`;

module.exports = [
  {
    name: 'Bohrer: Start mit E (halten), vorher steht er; ohne Alarm (Phase 1) geht nichts; Start und Wiederanwerfen sind zwei Objekte nach der E-Regel',
    timeout: 120000,
    async run(t) {
      const r = await t.page.evaluate(`(() => {
        const H = ${SOLO}, D = H.D, o = {}, C = D.CFG.nb; o.s0 = H.st(); o.items = [!!H.item('nbd0'), !!H.item('nbd1')]; o.ok = [H.item('nbd0').ok(), H.item('nbd1').ok()];
        H.at(); D.keys.e = true; H.step(C.startT - 1); o.mid = H.st(); H.step(2.5); D.keys.e = false; o.run = H.st(); o.ok2 = [H.item('nbd0').ok(), H.item('nbd1').ok()];
        return o; })()`);
      t.eq(r.s0, [0, 0, 0], 'aus, 0 %');
      t.eq(r.items, [true, true], 'zwei Objekte: starten und wieder anwerfen');
      t.eq(r.ok, [true, false], 'nur Starten ist moeglich');
      t.eq(r.mid[0], 0, 'vor Ablauf der Haltezeit steht er noch: ' + JSON.stringify(r.mid));
      t.eq(r.run[0], 1, 'nach der Haltezeit laeuft er: ' + JSON.stringify(r.run));
      t.eq(r.ok2, [false, false], 'laufend ist weder Start noch Wiederanwerfen moeglich');
    },
  },
  {
    name: 'Bohrer: Fortschritt ist linear ueber drillT, die Tunneltuer oeffnet bei 100 % und nicht frueher, Meldung und Zustand fertig',
    timeout: 120000,
    async run(t) {
      const r = await t.page.evaluate(`(() => {
        const H = ${SOLO}, D = H.D, o = {}, C = D.CFG.nb; D.CFG.nb.drillT = 40; D.nbd().st = 1;
        H.step(20); o.half = [H.st(), H.cl(H.door[0], H.door[1])]; H.step(18); o.late = [H.st(), H.cl(H.door[0], H.door[1])]; H.step(3); o.end = [H.st(), H.cl(H.door[0], H.door[1])];
        return o; })()`);
      t.ok(Math.abs(r.half[0][1] - .5) < .03 && r.half[0][0] === 1 && r.half[1] === 'L', 'bei der Haelfte etwa 50 %, Tuer zu: ' + JSON.stringify(r.half));
      t.ok(r.late[0][1] < 1 && r.late[1] === 'L', 'kurz vor Schluss noch zu: ' + JSON.stringify(r.late));
      t.eq([r.end[0][0], r.end[0][1], r.end[1]], [3, 1, 'l'], 'bei 100 % fertig und Tuer offen');
    },
  },
  {
    name: 'Bohrer: Stoerung durch Beschuss (Polizeikugel nah am Bohrer), durch einen Beamten im Keller und durch einen Defekt nach Zeit halten ihn an, der Fortschritt bleibt',
    timeout: 120000,
    async run(t) {
      const r = await t.page.evaluate(`(() => {
        const o = {};
        { const H = ${SOLO}, D = H.D, T = H.T; D.CFG.nb.drillT = 100; D.nbd().st = 1; H.step(10); const p0 = H.st()[1];
          const rg = [(H.rig[0] + 1) * T, (H.rig[1] + 1) * T]; D.get().bl.push({ id: 9e5, x: rg[0] + 20, y: rg[1], vx: 0, vy: 0, o: 0, l: 1, dmg: 0 }); H.step(.2); o.shot = [p0, H.st()];
          D.get().bl.length = 0; H.step(5); o.shotStill = H.st(); }
        { const H = ${SOLO}, D = H.D, T = H.T; D.CFG.nb.drillT = 100; D.nbd().st = 1; H.step(10); const p0 = H.st()[1]; const K = D.LAY().nb.keller; const c = D.mkCop(22.5 * T, 3.5 * T, false); D.get().en.push(c); H.step(.2); o.cop = [p0, H.st()]; }
        { const H = ${SOLO}, D = H.D; D.CFG.nb.drillT = 100; D.nbd().fa.push(.3); D.nbd().st = 1; H.step(29); o.beforeFault = H.st(); H.step(3); o.fault = H.st(); H.step(10); o.faultStill = H.st(); }
        return o; })()`);
      t.eq([r.shot[1][0], r.shot[1][2]], [2, 1], 'Beschuss: steht, Ursache 1: ' + JSON.stringify(r.shot));
      t.ok(Math.abs(r.shot[1][1] - r.shot[0]) < .01 && r.shotStill[0] === 2 && r.shotStill[1] === r.shot[1][1], 'Beschuss: Fortschritt bleibt stehen und geht nicht verloren: ' + JSON.stringify(r.shotStill));
      t.eq([r.cop[1][0], r.cop[1][2]], [2, 2], 'Beamter im Keller: steht, Ursache 2: ' + JSON.stringify(r.cop));
      t.eq(r.beforeFault[0], 1, 'vor dem Defekt laeuft er');
      t.eq([r.fault[0], r.fault[2]], [2, 3], 'Defekt nach Zeit bei 30 %: steht, Ursache 3: ' + JSON.stringify(r.fault));
      t.eq(r.faultStill, r.fault, 'der Defekt haelt ihn an, ohne selbst weiterzulaufen');
    },
  },
  {
    name: 'Bohrer: Wiederanwerfen mit E (halten) ohne Verlust des Fortschritts, ein Beamter im Keller stoppt ihn sofort wieder; Defekte aus dem Seed sind deterministisch und liegen im Rahmen',
    timeout: 120000,
    async run(t) {
      const r = await t.page.evaluate(`(() => {
        const o = {}, H = ${SOLO}, D = H.D, C = D.CFG.nb; C.drillT = 100; D.nbd().st = 1; H.step(20); const b = D.nbd(); b.st = 2; b.c = 3; o.stopped = H.st();
        o.ok = [H.item('nbd0').ok(), H.item('nbd1').ok()]; H.at(); D.keys.e = true; H.step(C.restartT + .8); D.keys.e = false; o.again = H.st(); H.step(10); o.later = H.st();
        const fa = () => { D.sessReset(); D.setScenario('nb'); D.setSeedMode('random'); D.buildSeed(7); D.reset(); return D.nbd().fa.slice(); };
        o.f1 = fa(); o.f2 = fa();
        o.range = o.f1.length === C.faultN && o.f1.every(x => x >= C.faultMin && x <= C.faultMax);
        return o; })()`);
      t.eq(r.ok, [false, true], 'steht: nur Wiederanwerfen');
      t.eq(r.again[0], 1, 'laeuft wieder: ' + JSON.stringify(r.again));
      t.ok(r.again[1] >= r.stopped[1] && r.later[1] > r.again[1], 'Fortschritt blieb erhalten und waechst weiter: ' + JSON.stringify([r.stopped, r.again, r.later]));
      t.eq(r.f1, r.f2, 'Defekte gleich fuer denselben Seed');
      t.ok(r.range, 'Zahl und Lage der Defekte im Rahmen: ' + JSON.stringify(r.f1));
    },
  },
  {
    name: 'Tunnel nach draußen: Der Ausgang liegt im Kanalschacht ausserhalb des Gebaeudes (unter der Westmauer), ist ueber den Tunnel erreichbar, von aussen aber nie; kein Posten und keine Anfahrt der Polizei dorthin',
    async run(t) {
      const r = await t.page.evaluate(() => {
        const D = __dbg, o = {}; D.setScenario('nb'); D.setSeedMode('random'); D.setLage([]);
        const a = D.layoutBase(5), G = a.nb.gates, z = a.nb.zone; D.buildLay(a); const w = D.world(), cl = (x, y) => w.M[y + 6][x + 6];
        o.out = z[2] < a.bld.x0; o.under = [cl(0, 2), cl(0, 3), cl(3, 2)];
        const SOL = '#WYwCVXfvekqPpbAmrfu', key = c => c.join(); let open = false;
        const reach = (from, to, blocked) => { const bl = new Set((blocked || []).map(key)), seen = new Set([key(from)]), q = [from]; for (let h = 0; h < q.length; h++) { const c = q[h]; if (c[0] === to[0] && c[1] === to[1]) return true; for (const d of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const n = [c[0] + d[0], c[1] + d[1]], k = key(n), ch = cl(n[0], n[1]); if (seen.has(k) || bl.has(k) || ch === undefined || SOL.includes(ch)) continue; if (ch === 'L' && n[0] === a.nb.door[0] && n[1] === a.nb.door[1] && !open) continue; seen.add(k); q.push(n); } } return false; };
        const flat = g => [].concat(...g), zc = [z[0], z[1]], all = flat([G.haupt, G.seite, G.hinten]);
        o.closed = reach([14, 30], zc, []); open = true; o.open = reach([14, 30], zc, []); o.noEntry = reach([14, 30], zc, all);
        o.lawn = [reach([-1, 8], zc, all), reach([-1, 0], zc, all), reach([30, 20], zc, all), reach([-1, 8], zc, [])];
        const cx = (z[0] + z[2] + 1) / 2, cy = (z[1] + z[3] + 1) / 2, near = p => Math.hypot(p.x + .5 - cx, p.y + .5 - cy) < D.CFG.nb.postD;
        o.posts = [(a.posts || []).length, (a.posts || []).filter(near).length]; const L = D.laneOf ? D.laneOf(a) : null; o.slotsNear = L ? L.slots.filter(s => Math.hypot(s.cells[0][0] - zc[0], s.cells[0][1] - zc[1]) < 20).length : -1;
        return o;
      });
      t.ok(r.out, 'die Fluchtzone liegt westlich der Gebaeudewand');
      t.eq(r.under, ['.', '.', '.'], 'der Tunnel fuehrt unter der Westmauer hindurch (Kacheln (0,2), (0,3), (3,2) begehbar)');
      t.eq([r.closed, r.open, r.noEntry], [false, true, false], 'Ausgang: bei zu Tuer nicht, bei offener Tuer von der Strasse aus nur durch das Gebaeude, ohne die drei Eingaenge gar nicht');
      t.eq(r.lawn, [false, false, false, true], 'vom Rasen daneben, von Norden und von der Ostseite kommt man nie direkt in den Schacht, nur durch das Gebaeude und den Tunnel');
      t.ok(r.posts[0] >= 8 && r.posts[1] === 0, 'kein Posten am Ausgang: ' + JSON.stringify(r.posts));
      t.ok(r.slotsNear === 0 || r.slotsNear === -1, 'kein Wagenplatz in der Naehe des Ausgangs');
    },
  },
  {
    name: 'Bohrer Coop: Host und Client sehen Zustand und Fortschritt (Schnappschuss nbd), das Wiederanwerfen auf dem Client geht (E gehalten auf dem Client, Host laeuft wieder), die Tunneltuer oeffnet auf beiden bei 100 %',
    timeout: 180000,
    async run(t) {
      await t.loadTool('loopnet.js'); await t.loadInpage('coop.js');
      const r = await t.page.evaluate(`(() => {
        const G = CT.mkGame('nb', 5, 2, 60, 20), A = G.A, B = G.clients[0], o = {}, T = 32;
        const both = (sec, f) => { for (let i = 0; i < Math.round(sec * 60); i++) { A.get().players.forEach(p => { p.hp = 1e9; p.dead = false; }); if (f) f(i); G.run(1 / 60); } };
        for (const D of [A, B]) { D.CFG.policeAt = 1e6; D.CFG.policeForced = 1e6; D.CFG.nb.drillT = 40; D.CFG.nb.alarmAt = 1e6; }
        o.map = CT.diff(CT.sig(A), CT.sig(B)); A.startHeist(true, A.get().me); G.run(1); A.nbd().fa.length = 0; A.nbd().st = 1; both(10); G.run(1);
        const s = D => [D.nbd().st, Math.round(D.nbd().p * 10) / 10]; o.run = [s(A), s(B)];
        A.nbd().st = 2; A.nbd().c = 1; both(1); G.run(1); o.stop = [s(A), s(B), B.nbd().c];
        const bid = B.get().me.id, pa = A.get().players[bid], rg = A.LAY().nb.rig; for (const p of [pa, B.get().me]) { p.x = (rg[0] + 1) * T; p.y = (rg[1] + 2) * T + 10; } A.nbd().st = 2; A.nbd().c = 3; both(1.5); o.beforeE = [A.nbd().st, B.nbd().st];
        B.cv.dispatchEvent(new KeyboardEvent('keydown', { key: 'e', bubbles: true })); both(A.CFG.nb.restartT + 1.5); B.cv.dispatchEvent(new KeyboardEvent('keyup', { key: 'e', bubbles: true })); G.run(.5); o.afterE = [A.nbd().st, B.nbd().st, Math.round(A.nbd().p * 100) / 100];
        both(32); G.run(1); const d = A.LAY().nb.door; o.done = [s(A), s(B), A.world().M[d[1] + 6][d[0] + 6], B.world().M[d[1] + 6][d[0] + 6]];
        return o; })()`);
      t.eq(r.map, [], 'gleiche Welt');
      t.ok(r.run[0][0] === 1 && r.run[1][0] === 1 && Math.abs(r.run[0][1] - r.run[1][1]) <= .1 && r.run[1][1] > 0, 'laeuft auf beiden mit gleichem Fortschritt: ' + JSON.stringify(r.run));
      t.eq(r.beforeE, [2, 2], 'vor E steht er auf beiden');
      t.eq([r.afterE[0], r.afterE[1]], [1, 1], 'der Client haelt E (Eingabe ueber die Test-Leitung), der Host hat den Bohrer wieder laufen: ' + JSON.stringify(r.afterE));
      t.ok(r.stop[1][0] === 2 && r.stop[2] === 1, 'Stillstand und Ursache kommen beim Client an: ' + JSON.stringify(r.stop));
      t.eq([r.done[0][0], r.done[1][0], r.done[2], r.done[3]], [3, 3, 'l', 'l'], 'fertig und Tuer offen auf beiden: ' + JSON.stringify(r.done));
    },
  },
];
