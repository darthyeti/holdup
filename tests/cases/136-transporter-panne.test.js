// Transporter-Panne (E1 der Transporter-Abwechslung, 28. Oktober 2026, Tills Wunsch: der Ablauf ist immer gleich): In etwa jedem dritten Transporter-Auftrag steht der Panzerwagen von Anfang an liegengeblieben an der Strasse.
// Keine Sperre, kein Warten: Die Besatzung steht als Wachen mit Sichtkegel um den Wagen (Phase 1). Leise: Wachen von hinten ausschalten (T5), dem bewusstlosen Fahrer den Schluessel nehmen, den Laderaum leise oeffnen, mit den Saecken
// in die Fluchtzone gehen (Lautlos entkommen). Laut: F zieht die Waffe, die Besatzung wird zum Kampftrupp wie beim normalen Zugriff, der Laderaum wird aufgebohrt.
async function setup(t) {
  await t.loadTool('loopnet.js');
  await t.loadInpage('coop.js');
}
const FIELDS = `(m) => [m.crew, m.bagN, m.arrive, m.cargo, m.lock, m.alarm, m.heavy, m.street].join(',')`;

// Seeds suchen (genTruckMission ist rein rechnerisch) und Karte bauen (Turn S, ohne Lage-Tags, Polizei weit weg)
const FIND = `(pred, n) => { const D = __dbg, out = []; D.setScenario('truck'); D.setSeedMode('random'); D.setLage([]); for (let sd = 1; sd < 800 && out.length < n; sd++) { const m = D.genTruckMission(sd); if (pred(m)) out.push(sd); } return out; }`;
const BUILD = `(sd) => { const D = __dbg; D.sessReset(); D.setScenario('truck'); D.setSeedMode('random'); D.setLage([]); D.setTurn('S'); D.buildSeed(sd); D.CFG.policeAt = 1e6; D.CFG.policeForced = 1e6; const g = D.get(); return { D, g, me: g.me, L: D.LAY(), M: D.LAY().mission, W: D.world() }; }`;
// Ein freier Platz neben einem Punkt (Kachelmitte), an dem man stehen kann
const NEAR = `(D, x, y) => { for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [2, 0], [-2, 0]]) { const tx = Math.floor(x / 32) + dx, ty = Math.floor(y / 32) + dy; if (!D.isSol(tx, ty)) return [tx * 32 + 16, ty * 32 + 16]; } return [x, y]; }`;

module.exports = [
  {
    name: 'Panne: alte Seeds bleiben, wie sie waren (Besatzung, Saecke, Ankunft, Fracht, Schloss, Alarm, schwere Wachen, Strasse der Seeds 1 bis 60, die neue Wuerfelung steht hinter allen alten)',
    async run(t) {
      await setup(t);
      const r = await t.page.evaluate(`(() => { const D = __dbg, F = ${FIELDS}, out = []; D.setScenario('truck'); D.setSeedMode('random'); D.setLage([]); for (let sd = 1; sd <= 60; sd++) out.push(sd + ':' + F(D.genTruckMission(sd))); return out; })()`);
      await t.snapshot('alt', r);
    },
  },
  {
    name: 'Panne: etwa jeder dritte Auftrag (22 bis 38 % von 600 Seeds), der Wagen steht auf einer der Kacheln 23 bis 37 (so beruehrt er in keiner Richtung einen Wagenplatz der Polizei), der Tag Panne steht nur bei diesen',
    async run(t) {
      await setup(t);
      const r = await t.page.evaluate(`(() => { const D = __dbg, o = { n: 0, p: 0, px: [], tag: [] }; D.setScenario('truck'); D.setSeedMode('random'); D.setLage([]); for (let sd = 1; sd <= 600; sd++) { const m = D.genTruckMission(sd); o.n++; if (m.panne) { o.p++; o.px.push(m.px); } if (!!m.panne !== m.tags.includes('Panne')) o.tag.push(sd); } o.min = Math.min(...o.px); o.max = Math.max(...o.px); o.var = new Set(o.px).size; return o; })()`);
      t.ok(r.p / r.n >= .22 && r.p / r.n <= .38, 'Anteil der Pannen: ' + r.p + ' von ' + r.n); t.ok(r.min >= 23 && r.max <= 37, 'Lage des Wagens: ' + r.min + ' bis ' + r.max); t.ok(r.var >= 8, 'die Lage streut: ' + r.var + ' verschiedene'); t.eq(r.tag, [], 'Tag Panne genau bei den Pannen');
    },
  },
  {
    name: 'Panne: Aufbau (Wagen steht von Anfang an auf sechs Kacheln, Besatzung als ruhige Wachen um ihn, Fahrer vorn, keine in Waenden, Spieler startet weit weg auf der Seite gegenueber der Fluchtzone, Phase 1; in der Gegenrichtung gespiegelt), normale Auftraege bleiben wie vorher (Wagen wartet, keine Wachen, gleicher Start)',
    async run(t) {
      await setup(t);
      const r = await t.page.evaluate(`(() => { const F = ${FIND}, B = ${BUILD}, o = { panne: [], norm: [] }; const P = F(m => m.panne, 6), N = F(m => !m.panne, 3);
        for (const sd of P) { const { D, g, L, M, W } = B(sd), tk = D.tk(), crew = g.npcs.filter(q => q.crew); const cells = []; for (let i = 0; i < 6; i++) cells.push(W.cell(M.px - 3 + i, 11) + W.cell(M.px - 3 + i, 12));
          o.panne.push({ sd, st: tk.st, x: tk.x, px: M.px, y: tk.y, cells: cells.join(','), n: crew.length, want: M.crew, drv: crew.filter(q => q.drv).length, kinds: [...new Set(crew.map(q => q.k + ':' + q.st))].join('|'), solid: crew.filter(q => D.isSol(Math.floor(q.x / 32), Math.floor(q.y / 32))).length, far: Math.round(Math.max(...crew.map(q => Math.hypot(q.x - tk.x, q.y - tk.y)))), drvFront: (crew.find(q => q.drv).x - tk.x) * (M.rev ? -1 : 1) > 96, spawnFar: M.rev ? L.spawn.x > tk.x + 200 : L.spawn.x < tk.x - 200, phase: g.phase, en: g.en.length, ok: D.validateMap(L).ok }); }
        for (const sd of N) { const { D, g, L } = B(sd), tk = D.tk(); o.norm.push({ sd, st: tk.st, npcs: g.npcs.length, spawn: L.spawn.x, phase: g.phase }); } return o; })()`);
      t.eq(r.panne.length, 6, 'sechs Pannen-Seeds'); for (const a of r.panne) { const k = 'Seed ' + a.sd + ': ';
        t.eq([a.st, a.x, a.y], ['stopped', a.px * 32, 12 * 32], k + 'der Wagen steht von Anfang an'); t.eq(a.cells, 'vv,vv,vv,vv,vv,vv', k + 'sechs Kacheln in den Zeilen 11 und 12 sind Wagen'); t.eq([a.n, a.drv, a.kinds], [a.want, 1, 'grd:idle'], k + 'Besatzung als ruhige Wachen, ein Fahrer');
        t.eq(a.solid, 0, k + 'keiner steht in der Wand'); t.ok(a.far <= 175, k + 'alle nahe am Wagen: ' + a.far); t.ok(a.drvFront && a.spawnFar, k + 'Fahrer vorn, Start weit weg'); t.eq([a.phase, a.en, a.ok], [1, 0, true], k + 'Phase 1, kein Gegner, Karte besteht die Pruefung'); }
      for (const a of r.norm) t.eq([a.st, a.npcs, a.spawn, a.phase], ['wait', 0, 29.5 * 32, 1], 'Seed ' + a.sd + ': der normale Auftrag bleibt (Wagen wartet, keine Wachen, gleicher Start)');
    },
  },
  {
    slow: true,
    name: 'Panne: auf allen Pannen-Karten der Seeds 1 bis 800 (rund 240, mit Baustelle und Gassen, in beiden Richtungen) steht jede Wache der Besatzung auf freiem Boden, ein Fahrer, der Wagen steht, die Wachen mit Route haben einen Weg, und die Karte besteht validateMap (kein Wagenplatz der Polizei unter dem Wagen)',
    async run(t) {
      await setup(t);
      const r = await t.page.evaluate(`(() => { const D = __dbg, bad = []; let n = 0; for (let sd = 1; sd < 800; sd++) { D.setScenario('truck'); D.setSeedMode('random'); D.setLage([]); const m = D.genTruckMission(sd); if (!m.panne) continue; D.sessReset(); D.setTurn('S'); D.buildSeed(sd); n++;
        const crew = D.get().npcs.filter(q => q.crew), solid = crew.filter(q => D.isSol(Math.floor(q.x / 32), Math.floor(q.y / 32))).length, noway = crew.filter(q => q.route && !(q.line && q.line.length)).length;
        const vm = D.validateMap(D.LAY()); if (crew.length !== m.crew || solid || noway || crew.filter(q => q.drv).length !== 1 || D.tk().st !== 'stopped' || !vm.ok) bad.push([sd, m.street, crew.length, m.crew, solid, noway, vm.ok ? '' : vm.err.map(e => e.m).join(';')]); } return { n, bad: bad.slice(0, 10) }; })()`);
      t.ok(r.n >= 200, 'genug Pannen-Karten geprueft: ' + r.n); t.eq(r.bad, [], 'Karten mit falscher Besatzung oder Pruefung (Seed, Strasse, Zahl, soll, in der Wand, ohne Weg, Pruefung)');
    },
  },
  {
    name: 'Panne leise: Besatzung ausschalten, dem bewusstlosen Fahrer den Schluessel nehmen (E halten), den Laderaum leise oeffnen, Saecke einpacken, in der Fluchtzone Lautlos entkommen (Phase 1 bis zum Ende); aufbohren geht erst im Ueberfall',
    async run(t) {
      await setup(t);
      const r = await t.page.evaluate(`(() => { const F = ${FIND}, B = ${BUILD}, NEAR = ${NEAR}, o = {}, sd = F(m => m.panne, 1)[0], { D, g, me, L } = B(sd), keys = D.keys, step = k => { for (let i = 0; i < k; i++) D.update(1 / 30); };
        const crew = g.npcs.filter(q => q.crew), drv = crew.find(q => q.drv), item = tp => D.get().its.find(i => i.t === tp); o.vor = [D.keyMi(drv).ok(me), item('cargo').ok(me), item('ckey').ok(me)];
        for (const n of crew) D.koMi(n).act(me); o.ko = crew.map(q => q.st).join(','); o.keyNonDrv = crew.filter(q => !q.drv).some(q => D.keyMi(q).ok(me)); o.keyOk = D.keyMi(drv).ok(me); o.ckeyVorher = item('ckey').ok(me); o.bohrer = item('cargo').ok(me);
        const ex0 = D.LANE().exit.cells.find(c => !D.isSol(c[0], c[1])); const sx = me.x, sy = me.y; me.x = ex0[0] * 32 + 16; me.y = ex0[1] * 32 + 16; step(8); o.zoneLeer = [D.get().ended ? 1 : 0, D.get().phase]; me.x = sx; me.y = sy;
        const kd = D.CFG.truck.keyTakeT; o.dauer = D.keyMi(drv).dur(); const [kx, ky] = NEAR(D, drv.x, drv.y); me.x = kx; me.y = ky; keys.e = true; step(Math.round(kd * 30 / 2)); o.mitte = D.get().keyTaken; step(Math.round(kd * 30 / 2) + 8); keys.e = false; o.key = D.get().keyTaken;
        o.ckeyNachher = item('ckey').ok(me); const ck = item('ckey'); const [cx, cy] = NEAR(D, ck.x, ck.y); me.x = cx; me.y = cy; keys.e = true; step(Math.round(D.CFG.truck.keyT * 30) + 10); keys.e = false; o.offen = D.get().cargoOpen; o.phaseOffen = D.get().phase;
        for (const b of D.get().its.filter(i => i.t === 'tbag')) if (b.fit(me)) b.act(me); o.beute = [me.loot > 0, me.units]; const ex = D.LANE().exit.cells.find(c => !D.isSol(c[0], c[1])); me.x = ex[0] * 32 + 16; me.y = ex[1] * 32 + 16; step(8);
        o.ende = D.get().ended ? [D.get().ended.win, D.get().ended.title] : null; o.phase = D.get().phase; return o; })()`);
      t.eq(r.vor, [false, false, false], 'vorher: kein Schluessel zu nehmen (Fahrer wach), kein Aufbohren in Phase 1, kein Schluessel-Oeffnen'); t.ok(r.ko.split(',').every(x => x === 'ko'), 'die Besatzung liegt bewusstlos: ' + r.ko);
      t.eq(r.keyNonDrv, false, 'nur dem Fahrer kann man den Schluessel nehmen'); t.eq(r.zoneLeer, [0, 1], 'ohne Beute beendet die Fluchtzone nichts'); t.eq([r.keyOk, r.ckeyVorher, r.bohrer], [true, false, false], 'der Fahrer ist greifbar fuer den Schluessel, der Laderaum noch zu, aufbohren geht nicht in Phase 1'); t.eq(r.dauer, 1.6, 'Schluessel nehmen dauert CFG.truck.keyTakeT (1,6 s)');
      t.eq([r.mitte, r.key], [false, true], 'nach der halben Zeit noch nicht, danach ist der Schluessel da'); t.eq([r.ckeyNachher, r.offen, r.phaseOffen], [true, true, 1], 'der Laderaum geht leise auf, es bleibt Phase 1');
      t.eq(r.beute, [true, r.beute[1]], 'Saecke eingepackt'); t.eq(r.ende, [true, 'Lautlos entkommen'], 'in der Fluchtzone endet es als Lautlos entkommen');
    },
  },
  {
    name: 'Panne laut: F zieht die Waffe, die Besatzung wird zum Kampftrupp (gleiche Zahl, Fahrer, schwere Wachen mit mehr Leben, nur einmal), die Polizeiuhr laeuft, der Laderaum laesst sich aufbohren, bewusstlose Wachen bleiben liegen',
    async run(t) {
      await setup(t);
      const r = await t.page.evaluate(`(() => { const F = ${FIND}, B = ${BUILD}, o = {}, sd = F(m => m.panne && m.crew >= 3 && m.heavy >= 1, 1)[0], { D, g, me, M } = B(sd), crew0 = g.npcs.filter(q => q.crew), item = tp => D.get().its.find(i => i.t === tp); D.koMi(crew0[1]).act(me); const ko = crew0[1];
        D.CFG.policeAt = 26; D.CFG.policeForced = 20; D.startHeist(false, me); const g2 = D.get(); const C = D.CFG.truck; o.phase = g2.phase; o.en = g2.en.map(e => [!!e.crew, !!e.drv, e.hv | 0, Math.round(e.hp), e.mode]); o.want = M.crew - 1; o.hpN = C.crew.hp; o.hpH = C.crew.hp * C.var.heavy.hp; o.koBleibt = [ko.st, g2.npcs.includes(ko)]; o.nochNpc = g2.npcs.filter(q => q.crew && q.st !== 'ko').length;
        o.policeAt = g2.policeAt; o.bohrer = item('cargo').ok(me); o.ckey = item('ckey').ok(me); o.tk = D.tk().st; return o; })()`);
      t.eq(r.phase, 2, 'Ueberfall'); t.eq(r.en.length, r.want, 'ein Kampftrupp je wache Wache (die bewusstlose bleibt liegen)'); t.ok(r.en.every(e => e[0] && e[4] === 'post'), 'alle sind Besatzung und halten ihren Posten'); t.ok(r.en.filter(e => e[1]).length <= 1, 'hoechstens ein Fahrer');
      t.ok(r.en.some(e => e[2] === 1 && Math.abs(e[3] - r.hpH) < 2), 'schwere Wachen haben mehr Leben'); t.ok(r.en.some(e => e[2] === 0 && e[3] === r.hpN), 'normale Wachen haben die Standardwerte'); t.eq(r.koBleibt, ['ko', true], 'die bewusstlose Wache bleibt liegen und wird kein Gegner'); t.eq(r.nochNpc, 0, 'keine wache Besatzung bleibt als Zivilist zurueck');
      t.ok(r.policeAt > 0 && r.policeAt < 60, 'die Polizeiuhr laeuft: ' + r.policeAt); t.eq([r.bohrer, r.ckey, r.tk], [true, false, 'stopped'], 'aufbohren geht jetzt, der Wagen steht weiter');
    },
  },
  {
    name: 'Panne mit C4: Laderaum sprengen in Phase 1 ist laut (Alarm, Ueberfall), der Laderaum ist offen',
    async run(t) {
      await setup(t);
      const r = await t.page.evaluate(`(() => { const F = ${FIND}, B = ${BUILD}, o = {}, sd = F(m => m.panne, 1)[0], { D, g, me } = B(sd), item = tp => D.get().its.find(i => i.t === tp); me.c4 = 1; o.ok = item('c4t').ok(me); item('c4t').act(me); o.phase = D.get().phase; o.offen = D.get().cargoOpen; o.pol = D.get().policeAt; return o; })()`);
      t.eq([r.ok, r.phase, r.offen], [true, 2, true], 'mit C4 ist die Sprengung moeglich, danach Ueberfall und offener Laderaum'); t.ok(r.pol > 0, 'die Polizeiuhr laeuft: ' + r.pol);
    },
  },
  {
    name: 'Panne mit Stoersender: wer den Funk vor dem Ueberfall stoert, verschiebt die Polizei um CFG.truck.jamDelay (wie beim normalen Zugriff)',
    async run(t) {
      await setup(t);
      const r = await t.page.evaluate(`(() => { const F = ${FIND}, B = ${BUILD}, o = {}, sd = F(m => m.panne, 1)[0]; const base = (() => { const { D, me } = B(sd); D.CFG.policeAt = 26; D.CFG.policeForced = 20; D.startHeist(false, me); return D.get().policeAt; })();
        const { D, me } = B(sd); D.CFG.policeAt = 26; D.CFG.policeForced = 20; me.jam = 1; document.getElementById('c').dispatchEvent(new KeyboardEvent('keydown', { key: '1', bubbles: true })); for (let i = 0; i < 3; i++) D.update(1 / 30); D.startHeist(false, me); o.base = base; o.jam = D.get().policeAt; o.delay = D.CFG.truck.jamDelay; return o; })()`);
      t.eq(r.jam - r.base, r.delay, 'die Polizei kommt um die Stoerzeit spaeter (' + r.base + ' gegen ' + r.jam + ')');
    },
  },
  {
    name: 'Panne: Besatzung laesst sich von hinten ausschalten (beim normalen Auftrag nicht), sieht eine wache Wache einen bewusstlosen Kollegen, gibt es Alarm und der Bewusstlose bleibt liegen',
    async run(t) {
      await setup(t);
      const r = await t.page.evaluate(`(() => { const F = ${FIND}, B = ${BUILD}, o = {}, sd = F(m => m.panne && m.crew >= 3, 1)[0], { D, g, me, M } = B(sd), crew = g.npcs.filter(q => q.crew), a = crew[1], b = crew[2], step = k => { for (let i = 0; i < k; i++) D.update(1 / 30); };
        // hinter a stellen
        const free = (x, y) => [[0, 0], [-9, -9], [9, -9], [-9, 9], [9, 9]].every(q => !D.isSol(Math.floor((x + q[0]) / 32), Math.floor((y + q[1]) / 32))); a.still = true; a.route = null; a.path = []; let ok = false;
        for (let i = 0; i < 16 && !ok; i++) { const an = i * Math.PI / 8, x = a.x + Math.cos(an) * 30, y = a.y + Math.sin(an) * 30; if (free(x, y) && D.los(a.x, a.y, x, y)) { a.base = an + Math.PI; a.a = a.base; me.x = x; me.y = y; ok = true; } } o.platz = ok; o.ok = D.koMi(a).ok(me);
        D.koMi(a).act(me); o.ko = a.st; b.still = true; b.route = null; b.path = []; b.alert = 0; b.look = null; me.x = M.px * 32 - 300; me.y = 13 * 32 + 16;
        let sp = null; for (let i = 0; i < 24 && !sp; i++) { const an = i * Math.PI / 12, x = a.x + Math.cos(an) * 120, y = a.y + Math.sin(an) * 120; if (free(x, y) && D.los(x, y, a.x, a.y)) sp = [x, y, an]; } o.sp = !!sp; if (sp) { b.x = sp[0]; b.y = sp[1]; b.base = Math.atan2(a.y - sp[1], a.x - sp[0]); b.a = b.base; }
        for (const c of crew) if (c !== a && c !== b) c.st = 'away'; step(60); o.phase = D.get().phase; o.koBleibt = a.st; o.msg = D.msgs().feed.some(s => /findet einen Bewusstlosen/.test(s)); return o; })()`);
      t.eq([r.platz, r.ok], [true, true], 'Aufbau: von hinten ist die Besatzung ausschaltbar'); t.eq(r.ko, 'ko', 'sie liegt bewusstlos'); t.ok(r.sp, 'Aufbau: ein Kollege mit Blick auf den Koerper');
      t.eq([r.phase, r.koBleibt, r.msg], [2, 'ko', true], 'der Kollege findet den Koerper: Alarm, der Bewusstlose bleibt liegen');
    },
  },
  {
    name: 'Panne im Coop: Host und Client bauen dieselbe Karte (Wagen steht, gleiche Besatzung), der Client sieht bewusstlose Wachen und den genommenen Schluessel',
    async run(t) {
      await setup(t);
      const r = await t.page.evaluate(`(() => { const F = ${FIND}, sd = F(m => m.panne && m.crew >= 3, 1)[0], G = CT.mkGame('truck', sd, 2), A = G.A, B = G.clients[0], o = {}; A.CFG.policeAt = 1e6; A.CFG.policeForced = 1e6;
        const sig = d => { const tk = d.tk(); return [d.sc(), tk.st, tk.x, d.get().npcs.filter(q => q.crew).map(q => (q.drv ? 'F' : 'W') + q.ci).join(';'), d.get().phase].join('|'); }; o.gleich = sig(A) === sig(B); o.sig = sig(A);
        const crew = A.get().npcs.filter(q => q.crew), drv = crew.find(q => q.drv), me = A.get().me; for (const n of crew) A.koMi(n).act(me); G.run(.5); const nb = B.get().npcs.filter(q => q.crew); o.clientKo = nb.map(q => q.st).join(',');
        const NEAR = ${NEAR}, [kx, ky] = NEAR(A, drv.x, drv.y), bd = B.get().npcs.find(q => q.crew && q.drv); me.x = kx; me.y = ky; A.keys.e = true; G.run(.6); o.halten = [+A.keyMi(drv).pr.toFixed(2), +B.keyMi(bd).pr.toFixed(2), A.get().keyTaken]; A.keys.e = false; G.run(.4); o.losgelassen = [A.keyMi(drv).pr, B.keyMi(bd).pr];
        A.keyMi(drv).act(me); G.run(.5); o.key = [A.get().keyTaken, B.get().keyTaken]; const ck = B.get().its.find(i => i.t === 'ckey'); o.ckeyClient = ck.ok(B.get().me); return o; })()`);
      t.ok(r.gleich, 'gleiche Karte auf Host und Client: ' + r.sig); t.ok(r.clientKo.split(',').every(x => x === 'ko'), 'der Client sieht die Besatzung bewusstlos: ' + r.clientKo); t.ok(r.halten[0] > .2 && r.halten[0] < 1 && !r.halten[2], 'Aufbau: der Host haelt E am Fahrer, der Balken steht dazwischen: ' + JSON.stringify(r.halten)); t.ok(Math.abs(r.halten[1] - r.halten[0]) < .15, 'der Client sieht denselben Balken: ' + JSON.stringify(r.halten)); t.eq(r.losgelassen, [0, 0], 'losgelassen steht er bei beiden auf 0');
      t.eq(r.key, [true, true], 'der Schluessel ist bei beiden da'); t.eq(r.ckeyClient, true, 'der Client kann den Laderaum leise oeffnen');
    },
  },
];
