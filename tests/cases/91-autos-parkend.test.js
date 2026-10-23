// Parkende Autos der Karten (Tills Wunsch vom 23. Oktober 2026, Plan in docs/offen-und-spieltest.md): Die vier Autos je Karte (ausser dem Transporter) sind keine Malerei mehr, sondern zivile Wagen
// in pcs (civ): solide und kugelfangend wie die Streifenwagen, Spielerkugeln machen Schaden, bei 0 HP explodieren sie wie ein Streifenwagen (Radius, Schaden, Kettenreaktion) und bleiben als Wrack.
// Zivile Autos und alle Wracks lassen sich abbauen (E halten, Material, auch bei vollem Fach, damit man sich freigraben kann), ein heiler Streifenwagen nicht. Der Client sieht dieselben Wagen (VER 28).
async function setup(t) {
  await t.loadTool('loopnet.js');
  await t.loadInpage('coop.js');
}

// Aufbau (solo): Karte bauen, keine Polizei, Ueberfall starten; run(s, f) simuliert s Sekunden und haelt den Spieler unverwundbar, wenn f nicht gesetzt ist
const SETUP = `(sc, seed, turn) => {
  const D = __dbg; D.setScenario(sc); D.setSeedMode('random'); D.setLage([]); D.setTurn(turn || 'S'); D.buildSeed(seed);
  D.CFG.policeAt = 9999; D.CFG.policeForced = 9999; D.CFG.snp.from = 99;
  return D;
}`;

module.exports = [
  {
    name: 'Autos: auf allen Karten in vier Lagen kommen die parkenden Autos als solide Wagen ins Spiel, nichts wird doppelt gemalt, Plaetze, Aussteigepunkte und Wege von jeder Aussentuer bleiben frei',
    timeout: 240000,
    async run(t) {
      const r = await t.page.evaluate(`(() => { const S = ${SETUP}, D = __dbg, T = 32, out = [], od = CanvasRenderingContext2D.prototype.drawImage; let painted = 0;
        CanvasRenderingContext2D.prototype.drawImage = function (img, ...a) { if (img && img.src && /cars\\.png/.test(img.src) && a.length === 8 && a[2] === 256 && (a[1] === 256 || a[1] === 384) && a[6] === 128 && a[7] === 64) painted++; return od.call(this, img, ...a); };
        try {
          for (const [sc, seeds, turns] of [['bank', [5017, 5031, 5044, 5058, 5071], ['S']], ['jewel', [11, 12, 13, 14], ['S', 'E+', 'W', 'N+']], ['gas', [21, 22, 23, 24], ['S', 'E+', 'W', 'N+']], ['museum', [31, 32, 33, 34], ['S', 'E+', 'W', 'N+']], ['casino', [41, 42, 43, 44], ['S', 'E+', 'W', 'N+']]])
            for (const turn of turns) for (const seed of seeds) {
              painted = 0; S(sc, seed, turn); const L = D.LAY(), W = D.world(), LN = D.LANE(), cars = D.get().pcs.filter(c => c.civ), bad = [];
              if (cars.length !== L.decorReal.length) bad.push('Wagen ' + cars.length + ' statt ' + L.decorReal.length);
              if (painted !== L.decor.length - L.decorReal.length) bad.push('gemalt ' + painted + ' statt ' + (L.decor.length - L.decorReal.length));
              const seen = new Set(); for (const c of cars) { if (!c.cells || c.cells.length !== 8) bad.push('Fussabdruck ' + (c.cells || []).length); for (const q of c.cells || []) { const k = q[0] + ',' + q[1]; if (seen.has(k)) bad.push('zwei Autos auf ' + k); seen.add(k); if (!W.isSol(q[0], q[1]) || !W.isBul(q[0], q[1])) bad.push('Kachel ' + k + ' nicht solide oder kugeldurchlaessig'); } }
              for (const s of LN.slots) { if (W.isSol(s.curb[0], s.curb[1])) bad.push('Aussteigepunkt zu'); if (s.cells.some(q => W.isSol(q[0], q[1]))) bad.push('Wagenplatz zu'); }
              if (LN.van.swept.concat(LN.van.rest).some(q => W.isSol(q[0], q[1]) && W.cell(q[0], q[1]) === 'v')) bad.push('Fluchtspur zu');
              if (LN.exit.cells.some(q => W.isSol(q[0], q[1]))) bad.push('Fluchtzone belegt');
              const reach = (sx, sy) => { if (W.isSol(sx, sy)) return false; const seen2 = new Set([sx + ',' + sy]), q = [[sx, sy]]; for (let h = 0; h < q.length; h++) { const [x, y] = q[h]; if (LN.exit.has(x * T + 16, y * T + 16)) return true; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy, k = nx + ',' + ny; if (seen2.has(k) || W.isSol(nx, ny)) continue; seen2.add(k); q.push([nx, ny]); } } return false; };
              const doors = L.spots.filter(s => s.side && !s.lk || s.ex).filter(sp => { const c0 = sp.cells[0]; return !reach(c0[0] - sp.iv[0], c0[1] - sp.iv[1]); }).map(sp => sp.n);
              if (doors.length) bad.push('ohne Weg zur Zone: ' + doors.join(','));
              out.push({ k: sc + ' ' + turn + ' #' + seed, n: cars.length, bad });
            }
        } finally { CanvasRenderingContext2D.prototype.drawImage = od; }
        return out; })()`);
      t.eq(r.filter(o => o.bad.length), [], 'Probleme: ' + JSON.stringify(r.filter(o => o.bad.length).slice(0, 6)));
      const min = Math.min(...r.map(o => o.n)), tot = r.reduce((s, o) => s + o.n, 0);
      t.ok(min >= 2, 'auf jeder Karte werden mindestens zwei Autos echt (kleinster Wert ' + min + ': ' + r.filter(o => o.n === min).map(o => o.k).slice(0, 4).join(', ') + ')');
      t.note('echte Autos: ' + tot + ' auf ' + r.length + ' Karten, im Mittel ' + (tot / r.length).toFixed(2) + ' von 4, kleinster Wert ' + min);
    },
  },
  {
    name: 'Autos: Spielerkugeln machen Schaden, Gegnerkugeln nicht, bei 0 HP explodiert das Auto (Radius, Schaden, Kettenreaktion) und bleibt als solides Wrack, das Kugeln ohne Schaden faengt',
    timeout: 120000,
    async run(t) {
      const r = await t.page.evaluate(`(() => { const S = ${SETUP}, D = S('gas', 21, 'S'), o = {}; D.startHeist(false, D.get().me); const me = D.get().me, cars = D.get().pcs.filter(c => c.civ), c = cars[0], c2 = cars[1], R = D.CFG.pol.car;
        const fire = (car, dmg, own) => { D.get().bl.push({ id: 9000 + Math.random() * 1e6 | 0, x: car.x - 80, y: car.y, vx: 720, vy: 0, l: .8, o: own ? 1 : 0, own: 0, d: dmg, ov: false }); for (let i = 0; i < 10; i++) D.update(1 / 30); };
        o.hp0 = c.hp; o.max = D.CFG.dec.hp;
        fire(c, 50, false); o.afterEnemy = c.hp;                              // Gegnerkugel: kein Schaden
        fire(c, 50, true); o.afterPlayer = c.hp;                              // Spielerkugel: Schaden
        // Explosion: Spieler weit weg bleibt heil, ein zweites Auto in Kettenreichweite explodiert mit
        me.hp = 100; me.ar = 0; me.inv = 0; me.x = c.x; me.y = c.y + 220; c2.x = c.x + R.chainR - 20; c2.y = c.y;
        fire(c, 50, true); fire(c, 50, true);
        o.dead = c.dead; o.hpFar = Math.round(me.hp); o.chain = c2.dead; o.cellsKept = c.cells.length === 8 && c.cells.every(q => D.world().isSol(q[0], q[1]) && D.world().isBul(q[0], q[1]));
        // Spieler nah am Auto: Schaden
        const c3 = cars[2]; me.hp = 100; me.ar = 0; me.inv = 0; me.x = c3.x; me.y = c3.y + 80;
        fire(c3, 70, true); fire(c3, 70, true); o.dead3 = c3.dead; o.hpNear = Math.round(me.hp);
        // Wrack: Spielerkugel macht keinen Schaden, das Wrack bleibt, die Kugel endet
        const hpW = c.hp; fire(c, 50, true); o.wreck = { hp: c.hp, dead: c.dead, same: hpW === c.hp };
        o.r = R.r; o.dmg = R.dmg;
        return o; })()`);
      t.eq(r.hp0, r.max, 'volle HP (CFG.dec.hp)');
      t.eq(r.afterEnemy, r.max, 'Gegnerkugeln machen keinen Schaden (Deckung, sonst sprengt die Polizei die Autos neben dir)');
      t.ok(r.afterPlayer < r.max, 'Spielerkugeln machen Schaden');
      t.ok(r.dead, 'bei 0 HP explodiert das Auto');
      t.eq(r.hpFar, 100, 'ausserhalb des Radius (' + r.r + ' px) bleibt der Spieler heil');
      t.ok(r.chain, 'ein zweites Auto in Kettenreichweite explodiert mit');
      t.ok(r.cellsKept, 'das Wrack bleibt solide und kugelsperrend (acht Kacheln)');
      t.ok(r.dead3 && r.hpNear < 100, 'nah am explodierenden Auto nimmt der Spieler Schaden (HP ' + r.hpNear + ')');
      t.ok(r.wreck.dead && r.wreck.same, 'ein Wrack nimmt keinen weiteren Schaden');
    },
  },
  {
    name: 'Autos: Abbau (E halten): ziviles Auto 2 Material, Wrack 1, auch bei vollem Fach (der Rest verfaellt), nur im Ueberfall, ein heiler Streifenwagen nicht, ein Wrack der Polizei schon, die Kacheln sind danach frei',
    timeout: 180000,
    async run(t) {
      const r = await t.page.evaluate(`(() => { const S = ${SETUP}, D = S('gas', 21, 'S'), o = {}, W = D.world(); const cars = () => D.get().pcs.filter(c => c.civ);
        const me0 = D.get().me; o.phase1 = D.carMi(cars()[0]).ok(me0);                       // vor dem Ueberfall nicht
        D.startHeist(false, D.get().me); const me = D.get().me; me.hp = 1e9;
        const work = (c, max) => { D.keys.e = true; let n = 0; while (!c.gone && n < (max || 400)) { me.x = c.x; me.y = c.y + 60; D.update(1 / 30); n++; } D.keys.e = false; return +(n / 30).toFixed(1); };
        const free = c => (c.cells || []).length === 0;
        // 1) ziviles Auto, leeres Fach
        me.mat = 0; me.units = 0; let c = cars()[0]; const cells0 = c.cells.slice();
        o.ok1 = D.carMi(c).ok(me); o.cnt1 = D.carMi(c).cnt; o.dur = D.carMi(c).dur(me);
        o.t1 = work(c); o.mat1 = me.mat; o.units1 = me.units; o.gone1 = c.gone; o.free1 = free(c) && cells0.every(q => !W.isSol(q[0], q[1]));
        // 2) ziviles Auto, Material voll: geht trotzdem, nichts kommt dazu
        c = cars()[0]; me.mat = D.CFG.bar.matMax; me.units = 0; o.ok2 = D.carMi(c).ok(me); o.t2 = work(c); o.mat2 = me.mat; o.gone2 = c.gone;
        // 3) wenig Platz in der Tasche: nur so viel, wie passt
        c = cars()[0]; me.mat = 0; me.units = me.bag - D.CFG.bar.matU; o.ok3 = D.carMi(c).ok(me); o.t3 = work(c); o.mat3 = me.mat; o.gone3 = c.gone;
        // 4) Auswahl: itsAll nimmt Autos in Reichweite mit, die Vorgabe waehlt das naechste
        const cc = cars().find(q => !q.dead); if (cc) { me.x = cc.x; me.y = cc.y + 60; D.update(1 / 30); o.cands = D.cands(me).some(q => q.car === cc); o.pick = D.pickIt(me, -1) && D.pickIt(me, -1).car === cc; }
        // 5) Wrack (ziviles Auto zerschossen): 1 Material
        c = cars()[0]; D.get().bl.push({ id: 7001, x: c.x - 80, y: c.y, vx: 720, vy: 0, l: .8, o: 1, own: 0, d: 999, ov: false }); for (let i = 0; i < 8; i++) D.update(1 / 30);
        me.x = c.x; me.y = c.y + 200; me.mat = 0; me.units = 0; o.dead4 = c.dead; o.cnt4 = D.carMi(c).cnt; o.t4 = work(c); o.mat4 = me.mat; o.gone4 = c.gone;
        // 6) Streifenwagen: heil nicht, als Wrack ja
        D.CFG.policeAt = 1; D.CFG.policeForced = 1; D.spawnWave(); let police = null;
        for (let i = 0; i < 30 * 40 && !police; i++) { me.x = D.LAY().spawn.x; me.y = D.LAY().spawn.y; D.update(1 / 30); police = D.get().pcs.find(q => !q.civ && q.st === 'park'); }
        o.police = !!police; if (police) { o.okPolice = D.carMi(police).ok(me); me.x = police.x; me.y = police.y + 60;
          for (let k = 0; k < 8 && !police.dead; k++) { D.get().bl.push({ id: 7100 + k, x: police.x - 80, y: police.y, vx: 720, vy: 0, l: .8, o: 1, own: 0, d: 60, ov: false }); for (let i = 0; i < 8; i++) D.update(1 / 30); }
          me.mat = 0; me.units = 0; o.deadPolice = police.dead; o.okWreck = D.carMi(police).ok(me); o.cntWreck = D.carMi(police).cnt; if (police.dead) { o.tp = work(police); o.matPolice = me.mat; o.gonePolice = police.gone; } }
        o.matMax = D.CFG.bar.matMax; o.matU = D.CFG.bar.matU; o.matT = D.CFG.bar.matT; o.durF = D.CFG.dec.dur;
        return o; })()`);
      t.eq(r.phase1, false, 'vor dem Ueberfall nicht abbaubar (wie die Moebel)');
      t.ok(r.ok1 && r.cnt1 === 2 && r.gone1 && r.mat1 === 2 && r.units1 === 2 * r.matU, 'ziviles Auto: 2 Material, ' + JSON.stringify([r.ok1, r.cnt1, r.mat1, r.units1]));
      t.ok(Math.abs(r.dur - r.matT * r.durF) < .01 && r.t1 >= r.dur - .1 && r.t1 <= r.dur + .3, 'Dauer wie Moebel mal CFG.dec.dur (' + r.dur.toFixed(2) + ' s), gebraucht ' + r.t1 + ' s');
      t.ok(r.free1, 'die Kacheln des Autos sind danach frei');
      t.ok(r.ok2 && r.gone2 && r.mat2 === r.matMax, 'Material voll: der Abbau geht trotzdem (freigraben), es kommt nichts dazu: ' + JSON.stringify([r.ok2, r.gone2, r.mat2]));
      t.ok(r.ok3 && r.gone3 && r.mat3 === 1, 'wenig Platz in der Tasche: nur das, was passt (' + r.mat3 + ' von 2)');
      t.ok(r.dead4 && r.cnt4 === 1 && r.gone4 && r.mat4 === 1, 'Wrack: 1 Material: ' + JSON.stringify([r.dead4, r.cnt4, r.mat4]));
      t.ok(r.police, 'ein Streifenwagen parkt');
      t.eq(r.okPolice, false, 'ein heiler Streifenwagen ist nicht abbaubar (Deckung der Polizei)');
      t.ok(r.deadPolice && r.okWreck && r.cntWreck === 1 && r.gonePolice && r.matPolice === 1, 'das Wrack eines Streifenwagens ist abbaubar (1 Material): ' + JSON.stringify([r.deadPolice, r.okWreck, r.cntWreck, r.matPolice]));
      t.ok(r.cands && r.pick, 'die E-Auswahl nimmt Autos in Reichweite mit (cands, pickIt)');
    },
  },
  {
    name: 'Autos: Polizei und Autos vertragen sich (Besatzung nur in Streifenwagen, Wagenplaetze und Aussteigepunkte bleiben frei, Wellen kommen wie vorher)',
    timeout: 180000,
    async run(t) {
      const r = await t.page.evaluate(`(() => { const S = ${SETUP}, D = S('jewel', 11, 'E+'), o = {}; D.CFG.policeAt = 1; D.CFG.policeForced = 1; D.CFG.snp.from = 1; D.CFG.snp.car = 1; const L = D.LAY();
        D.startHeist(false, D.get().me); D.get().me.hp = 1e9; const civ0 = D.get().pcs.filter(c => c.civ).length;
        for (let w = 0; w < 4; w++) { D.spawnWave(); for (let i = 0; i < 30 * 12; i++) { const m = D.get().me; m.hp = 1e9; m.x = L.spawn.x; m.y = L.spawn.y; D.update(1 / 30); } }
        const pcs = D.get().pcs; o.civ0 = civ0; o.civ = pcs.filter(c => c.civ).length; o.police = pcs.filter(c => !c.civ).length; o.crewInCiv = pcs.filter(c => c.civ && c.crew && c.crew.length).length;
        o.parked = pcs.filter(c => !c.civ && c.st === 'park').length; o.inCiv = pcs.filter(c => !c.civ).some(c => pcs.some(q => q.civ && Math.hypot(q.x - c.x, q.y - c.y) < 44));
        return o; })()`);
      t.eq(r.civ, r.civ0, 'die zivilen Autos bleiben (alle vier Wellen lang): ' + r.civ0 + ' vorher, ' + r.civ + ' nachher');
      t.ok(r.police >= 2 && r.parked >= 2, 'Streifenwagen kommen und parken (' + r.police + ', davon ' + r.parked + ' geparkt)');
      t.eq(r.crewInCiv, 0, 'in zivilen Autos sitzt nie Besatzung (auch keine Scharfschuetzen)');
      t.eq(r.inCiv, false, 'kein Streifenwagen parkt in einem zivilen Auto');
    },
  },
  {
    name: 'Autos im Coop: der Client sieht dieselben Autos (Raster gleich), Wrack und Abbau auf beiden Seiten, sein Fortschritt zaehlt beim Host, Material landet bei ihm',
    timeout: 180000,
    async run(t) {
      await setup(t);
      const r = await t.page.evaluate(() => {
        const o = {}, G = CT.mkGame('gas', 21, 2, 30, 0), A = G.A, B = G.insts[1];
        A.CFG.policeAt = 9999; A.CFG.policeForced = 9999; B.CFG.policeAt = 9999;
        const civ = d => d.get().pcs.filter(c => c.civ), grid = d => d.world().M.join('\n');
        o.civA = civ(A).length; o.civB = civ(B).length; o.gridEq = grid(A) === grid(B);
        o.fields = A.get().pcs.length > 0;
        A.startHeist(false, A.get().players[0]); G.run(1);
        const c = civ(A)[0]; o.sameId = !!civ(B).find(q => q.id === c.id);
        A.get().players.forEach(p => { p.hp = 1e9; p.x = 60; p.y = 60; });
        for (let k = 0; k < 3; k++) { A.get().bl.push({ id: 9000 + k, x: c.x - 80, y: c.y, vx: 720, vy: 0, l: .8, o: 1, own: 0, d: 60, ov: false }); G.run(.4); }
        o.deadA = c.dead; o.deadB = civ(B).find(q => q.id === c.id).dead; o.gridEq2 = grid(A) === grid(B);
        const pA = A.get().players[1], meB = B.get().me, place = () => { pA.x = meB.x = c.x; pA.y = meB.y = c.y + 60; };
        place(); pA.mat = 0; pA.units = 0; B.keys.e = true; let prSeen = 0, n = 0;
        while (civ(A).some(q => q.id === c.id) && n < 400) { place(); G.run(1 / 30); const cb = civ(B).find(q => q.id === c.id); if (cb && cb.mi) prSeen = Math.max(prSeen, cb.mi.pr); n++; }
        B.keys.e = false; o.removedA = !civ(A).some(q => q.id === c.id); G.run(.6); o.removedB = !civ(B).some(q => q.id === c.id);
        o.prSeen = prSeen > .3; o.mat = pA.mat; o.gridEq3 = grid(A) === grid(B);
        // Zustandswechsel mitten im Spiel: ein zweites Auto zerlegen, solange es heil ist
        const c2 = civ(A)[0], place2 = () => { pA.x = meB.x = c2.x; pA.y = meB.y = c2.y + 60; }; place2(); B.keys.e = true; n = 0;
        while (civ(A).some(q => q.id === c2.id) && n < 400) { place2(); G.run(1 / 30); n++; } B.keys.e = false; G.run(.6);
        o.mat2 = pA.mat; o.civAEnd = civ(A).length; o.civBEnd = civ(B).length; o.gridEq4 = grid(A) === grid(B);
        return o;
      });
      t.eq([r.civA, r.civB], [4, 4], 'Host und Client haben vier zivile Autos');
      t.ok(r.gridEq && r.sameId, 'gleiches Raster, gleiche Wagen-Nummern');
      t.ok(r.deadA && r.deadB && r.gridEq2, 'das Wrack steht bei beiden, das Raster bleibt gleich');
      t.ok(r.removedA && r.removedB && r.prSeen, 'der Client baut das Wrack ab: Fortschritt beim Client sichtbar, Wagen bei beiden weg');
      t.eq(r.mat, 1, 'das Material des Wracks landet beim Spieler (1)');
      t.ok(r.gridEq3, 'nach dem Abbau gleiches Raster');
      t.eq([r.civAEnd, r.civBEnd, r.mat2, r.gridEq4], [2, 2, 3, true], 'ein heiles Auto danach: zwei Material mehr, bei beiden zwei Autos uebrig, Raster gleich');
    },
  },
];
