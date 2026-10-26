// Fahrzeuge solide und kugelfangend (Oktober 2026, Plan in docs/archiv-gebaute-plaene.md): Geparkte Streifenwagen, Wracks und der haltende Fluchtwagen stempeln ihren Fussabdruck als v ins Raster
// (stampCar, vanSync, wie der Panzerwagen mit tkStamp): niemand laeuft hindurch, Kugeln beider Seiten enden am Wagen, der Schaden geht an den Wagen, ein Wrack faengt Kugeln ohne Schaden,
// wer beim Parken im Fussabdruck steht, wird ausgeworfen, reset raeumt auf, Host und Client haben dasselbe Raster. Die Wege von jeder Aussentuer zur Zustiegszone bleiben offen (Messung des Plans als Pruefung).
async function setup(t) {
  await t.loadTool('loopnet.js');
  await t.loadInpage('coop.js');
}

// Aufbau (solo, Ueberfall, Polizei sofort, Spieler haelt in __run auf dem Spawn und ist unverwundbar); M0 ist das Raster vor dem Ueberfall
const SETUP = `(sc, seed, turn, extra) => {
  const D = __dbg; D.setScenario(sc); D.setSeedMode(typeof seed === 'number' ? 'random' : 'classic'); D.setLage([]); D.setTurn(turn || 'S'); D.buildSeed(seed);
  const L = D.LAY(); L.wb = (L.wb || 0) + (extra == null ? 8 : extra); D.CFG.policeAt = 1; D.CFG.policeForced = 1; D.CFG.snp.from = 99;
  const M0 = D.world().M.join('\\n'); D.startHeist(false, D.get().me);
  window.__run = (s, f) => { for (let i = 0; i < Math.round(s * 30); i++) { const m = D.get().me; m.hp = 1e9; m.x = L.spawn.x; m.y = L.spawn.y; if (f) f(i); D.update(1 / 30); } };
  return { L, M0 };
}`;

module.exports = [
  {
    name: 'Fahrzeuge: mit allen Plaetzen und dem Fluchtwagen bleibt von jeder Aussentuer ein Weg zur Zone, die Zone zu 75 Prozent frei, jede Wagenkachel solide und kugelsperrend, reset raeumt auf (5 Szenarien, 2 Lagen)',
    slow: true,
    async run(t) {
      const r = await t.page.evaluate(`(() => { const S = ${SETUP}, D = __dbg, T = 32, out = [];
        for (const [sc, seed] of [['bank', 5017], ['jewel', 11], ['gas', 21], ['museum', 31], ['casino', 41]]) for (const turn of ['S', 'E+']) {
          const { L, M0 } = S(sc, seed, turn), LN = D.LANE(), W = D.world(), bad = [];
          const zone = () => { const w = D.world(); let n = 0; for (let y = w.WY0; y < w.WY0 + w.H; y++) for (let x = w.WX0; x < w.WX0 + w.W; x++) if (!w.isSol(x, y) && LN.exit.has(x * T + 16, y * T + 16)) n++; return n; };
          const reach = (sx, sy) => { const w = D.world(); if (w.isSol(sx, sy)) return false; const seen = new Set([sx + ',' + sy]), q = [[sx, sy]];
            for (let h = 0; h < q.length; h++) { const [x, y] = q[h]; if (LN.exit.has(x * T + 16, y * T + 16)) return true; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy, k = nx + ',' + ny; if (seen.has(k) || w.isSol(nx, ny)) continue; seen.add(k); q.push([nx, ny]); } } return false; };
          const doors = () => L.spots.filter(s => s.side && !s.lk || s.ex).filter(sp => { const c0 = sp.cells[0]; return !reach(c0[0] - sp.iv[0], c0[1] - sp.iv[1]); }).map(sp => sp.n);
          const z0 = zone(); __run(.2); D.spawnWave(); for (let k = 0; k < 3; k++) { __run(10); D.spawnWave(); } __run(45);
          const cars = D.get().pcs, cells = cars.flatMap(c => c.cells || []);
          if (!cars.length) bad.push('keine Wagen'); if (cars.some(c => c.st !== 'park' && !c.dead)) bad.push('Wagen noch unterwegs');
          if (cars.some(c => !c.cells || !c.cells.length)) bad.push('Wagen ohne Fussabdruck');
          if (cells.some(q => !W.isSol(q[0], q[1]) || !W.isBul(q[0], q[1]))) bad.push('Wagenkachel nicht solide oder kugeldurchlaessig');
          const d1 = doors(); if (d1.length) bad.push('ohne Weg zur Zone (Wagen): ' + d1.join(','));
          const z1 = zone(); if (z1 < z0 * .75) bad.push('Zone mit Wagen ' + z1 + ' von ' + z0);
          D.callVan(); const at = () => { const g = D.get(); return g.vanArr && g.vanMode === 0 && Math.abs(g.vanX - LN.van.stop) <= 2; };
          for (let i = 0; i < 150 && !at(); i++) __run(1);
          if (!at()) bad.push('Fluchtwagen kam nicht an'); else {
            const mouth = new Set(L.spots.flatMap(sp => sp.cells.map(c => (c[0] - sp.iv[0]) + ',' + (c[1] - sp.iv[1])))), vc = LN.box(LN.van.stop, LN.van.stop + 128, LN.van.pos, 32).filter(c => !mouth.has(c[0] + ',' + c[1])); if (vc.some(c => D.world().cell(c[0], c[1]) === 'o')) bad.push('Kachel unter dem Fluchtwagen nicht gestempelt'); if (vc.length < 4) bad.push('Fussabdruck des Fluchtwagens zu klein: ' + vc.length);
            const d2 = doors(); if (d2.length) bad.push('ohne Weg zur Zone (Wagen und Fluchtwagen): ' + d2.join(','));
            const z2 = zone(), zb = L.meet ? z0 - 8 : z0; if (z2 < zb * .75) bad.push('Zone mit Fluchtwagen ' + z2 + ' von ' + z0 + (L.meet ? ' (abzueglich der 8 Kacheln des Wagens, Treffpunkt abseits)' : ''));
          }
          D.reset(); if (D.world().M.join('\\n') !== M0) bad.push('reset raeumt die gestempelten Kacheln nicht auf');
          out.push({ sc, turn, cars: cars.length, bad });
        }
        return out; })()`);
      t.eq(r.filter(o => o.bad.length), [], 'Probleme: ' + JSON.stringify(r.filter(o => o.bad.length)));
      t.ok(r.every(o => o.cars >= 2), 'auf jeder Karte parkten mindestens zwei Wagen: ' + r.map(o => o.sc + o.turn + ':' + o.cars).join(' '));
    },
  },
  {
    name: 'Fahrzeuge: der Spieler laeuft nicht durch den Wagen, Spielerkugeln machen Schaden am Wagen, Gegnerkugeln enden am Wagen (Deckung), ein Wrack faengt Kugeln ohne Schaden',
    async run(t) {
      const r = await t.page.evaluate(`(() => { const S = ${SETUP}, D = __dbg, T = 32, o = {}; S('bank', 'classic', 'S', 0); const LN = D.LANE(), W = () => D.world(); let c = null;
        __run(.2); D.spawnWave(); for (let i = 0; i < 60 && !c; i++) { __run(1); c = D.get().pcs.find(q => q.st === 'park' && q.row === 0 && q.crew.length === 0); }
        if (!c) return { err: 'kein geparkter Wagen' };
        const cn = LN.n, pt = k => [c.x + cn[0] * k, c.y + cn[1] * k], clr = () => { D.get().en.length = 0; }, me = () => D.get().me, step = n => { for (let i = 0; i < n; i++) { clr(); D.update(1 / 30); } };
        const inFoot = () => { const tx = Math.floor(me().x / T), ty = Math.floor(me().y / T); return c.cells.some(q => q[0] === tx && q[1] === ty); };
        // 1) Laufen: von der Randsteinseite auf den Wagen zu
        const key = Math.abs(cn[0]) > Math.abs(cn[1]) ? (cn[0] > 0 ? 'a' : 'd') : (cn[1] > 0 ? 'w' : 's');
        let p = pt(54); me().x = p[0]; me().y = p[1]; me().hp = 1e9; D.keys[key] = true; step(45); D.keys[key] = false; o.laufen = { drin: inFoot(), dist: Math.hypot(me().x - c.x, me().y - c.y), frei: !D.isSol(Math.floor(p[0] / T), Math.floor(p[1] / T)) };
        // 2) Spielerkugel: Schaden am Wagen
        const bul = (id, k, own, extra) => D.get().bl.push(Object.assign({ id, x: pt(k)[0], y: pt(k)[1], vx: -cn[0] * 720, vy: -cn[1] * 720, l: .8, own }, extra));
        o.hp0 = c.hp; bul(7001, 90, 0, { o: 1, d: 50 }); step(8); o.nachSpieler = c.hp; o.kugel1 = D.get().bl.some(b => b.id === 7001);
        // 3) Gegnerkugel: vorn trifft den Spieler (Kontrolle), hinter dem Wagen nicht
        me().hp = 100; p = pt(60); me().x = p[0]; me().y = p[1]; bul(7002, 90, -1, { dmg: 30 }); for (let i = 0; i < 8; i++) { me().x = p[0]; me().y = p[1]; clr(); D.update(1 / 30); } o.vorn = me().hp;
        me().hp = 100; p = pt(-60); o.hinten0 = !D.isSol(Math.floor(p[0] / T), Math.floor(p[1] / T)); const hp1 = c.hp; bul(7003, 90, -1, { dmg: 30 }); for (let i = 0; i < 14; i++) { me().x = p[0]; me().y = p[1]; clr(); D.update(1 / 30); } o.hinten = me().hp; o.wagenHeil = c.hp === hp1; o.kugel3 = D.get().bl.some(b => b.id === 7003);
        // 4) Wrack: Treffer ohne Schaden, Kachelraster bleibt, Kugel endet
        me().hp = 1e9; c.hp = 30; bul(7004, 90, 0, { o: 1, d: 50 }); step(8); o.tot = [c.dead, c.hp]; o.zellen = c.cells.every(q => W().isSol(q[0], q[1]));
        bul(7005, 90, 0, { o: 1, d: 50 }); step(8); o.wrack = [c.dead, c.hp, D.get().bl.some(b => b.id === 7005)];
        return o; })()`);
      t.ok(!r.err, r.err);
      t.ok(r.laufen.frei && !r.laufen.drin && r.laufen.dist > 20, 'zu Fuss nicht in den Wagen: ' + JSON.stringify(r.laufen));
      t.eq([r.nachSpieler, r.kugel1], [r.hp0 - 50, false], 'Spielerkugel: 50 Schaden am Wagen, Kugel weg');
      t.ok(r.vorn < 100, 'Kontrolle: die Gegnerkugel trifft einen Spieler vor dem Wagen (' + r.vorn + ' HP)');
      t.ok(r.hinten0, 'der Punkt hinter dem Wagen ist frei');
      t.eq([r.hinten, r.wagenHeil, r.kugel3], [100, true, false], 'Gegnerkugel endet am Wagen: Spieler dahinter unverletzt, der Wagen nimmt keinen Schaden von Gegnern');
      t.eq(r.tot, [true, 0], 'der Wagen explodiert'); t.eq(r.zellen, true, 'das Wrack bleibt solide');
      t.eq(r.wrack, [true, 0, false], 'ein Wrack faengt Kugeln ohne Schaden und bleibt tot');
    },
  },
  {
    name: 'Fahrzeuge: wer beim Parken im Fussabdruck steht, wird zur naechsten freien Kachel geschoben; Beamte steigen nie in gestempelte Kacheln aus',
    async run(t) {
      const r = await t.page.evaluate(`(() => { const S = ${SETUP}, D = __dbg, T = 32, o = {}; S('bank', 'classic', 'S', 0); const LN = D.LANE(); __run(.2); D.spawnWave();
        // Der Spieler steht genau auf dem Zielplatz des ersten Wagens, bis der Wagen haelt
        let car = null, at = null; for (let i = 0; i < 30 * 60 && !car; i++) { const c = D.get().pcs.find(q => q.st === 'in'); const m = D.get().me; m.hp = 1e9;
          if (c) { at = LN.pt(c.tg, c[LN.C]); m.x = at[0]; m.y = at[1]; } else { m.x = D.LAY().spawn.x; m.y = D.LAY().spawn.y; } D.update(1 / 30); const p = D.get().pcs.find(q => q.st === 'park'); if (p && at) car = p; }
        if (!car) return { err: 'kein Wagen hat geparkt' };
        const m = D.get().me; o.drin = car.cells.some(q => q[0] === Math.floor(m.x / T) && q[1] === Math.floor(m.y / T)); o.solide = D.isSol(Math.floor(m.x / T), Math.floor(m.y / T)); o.weg = Math.round(Math.hypot(m.x - at[0], m.y - at[1]));
        // Beamte: erste Aussteiger aller Wagen stehen nicht in gestempelten Kacheln
        let bad = 0, n = 0; for (let i = 0; i < 30 * 40; i++) { __run(1 / 30); for (const e of D.get().en) if (e.kind === 'cop' && !e.__seen) { e.__seen = 1; n++; if (D.isSol(Math.floor(e.x / T), Math.floor(e.y / T))) bad++; } }
        o.beamte = [n, bad]; return o; })()`);
      t.ok(!r.err, r.err);
      t.eq([r.drin, r.solide], [false, false], 'der Spieler wurde aus dem Fussabdruck geschoben, er steht auf einer freien Kachel (' + r.weg + ' px weiter)');
      t.ok(r.weg > 0, 'der Spieler hat sich bewegt');
      t.ok(r.beamte[0] > 0 && r.beamte[1] === 0, 'Beamte steigen auf freien Kacheln aus: ' + JSON.stringify(r.beamte));
    },
  },
  {
    name: 'Fahrzeuge: der Fluchtwagen ist nur solide, solange er haelt; faehrt der nervoese Fahrer weg, sind seine Kacheln wieder frei (ohne die Kacheln der Streifenwagen zu raeumen)',
    async run(t) {
      const r = await t.page.evaluate(`(() => { const S = ${SETUP}, D = __dbg, T = 32, o = {}; const { L } = S('jewel', 11, 'S', 0), LN = D.LANE(); D.CFG.pol.car.tier2 = 0; D.CFG.snp.from = 99;
        const at = () => { const g = D.get(); return g.vanArr && g.vanMode === 0 && Math.abs(g.vanX - LN.van.stop) <= 2; }; const mouth = new Set(L.spots.flatMap(sp => sp.cells.map(c => (c[0] - sp.iv[0]) + ',' + (c[1] - sp.iv[1])))), vc = LN.box(LN.van.stop, LN.van.stop + 128, LN.van.pos, 32).filter(c => !mouth.has(c[0] + ',' + c[1]));
        const types = () => vc.map(c => D.world().cell(c[0], c[1])); __run(.2); D.spawnWave(); __run(25); o.vorher = types(); D.callVan(); for (let i = 0; i < 150 && !at(); i++) __run(1);
        if (!at()) return { err: 'Fluchtwagen kam nicht an' }; o.haelt = types();
        // Beamter am Wagen: der Fahrer wird nervoes und faehrt weg
        const m = LN.van.mid(LN.van.stop), cop = D.mkCop(m[0], m[1], null); D.get().en.push(cop); for (let i = 0; i < 30 * 9 && D.get().vanMode === 0; i++) { cop.x = m[0]; cop.y = m[1]; cop.hp = 1e9; __run(1 / 30); }
        o.modus = D.get().vanMode; D.get().en.length = 0; __run(2); o.danach = types(); return o; })()`);
      t.ok(!r.err, r.err);
      t.ok(r.vorher.some(c => c === 'o'), 'vor der Ankunft liegt Strasse unter dem Fahrerplatz: ' + r.vorher.join(''));
      t.ok(r.haelt.every((c, i) => c !== 'o' || false) && r.haelt.some((c, i) => c === 'v' && r.vorher[i] === 'o'), 'beim Halten sind die Strassenkacheln v: ' + r.haelt.join(''));
      t.ok(r.modus >= 1, 'der Fahrer ist weggefahren (Modus ' + r.modus + ')');
      t.eq(r.danach.map((c, i) => c === 'v' && r.vorher[i] === 'o' ? 'X' : '.').join(''), r.danach.map(() => '.').join(''), 'danach ist keine Kachel des Fluchtwagens mehr gestempelt');
    },
  },
  {
    name: 'Fahrzeuge im Coop: Host und Client haben dasselbe Raster (parkende Wagen, Wrack, Fluchtwagen), der Client kann nicht durch den Wagen laufen',
    async run(t) {
      await setup(t);
      const r = await t.page.evaluate(() => {
        const out = {}, G = CT.mkGame('bank', 321, 2), A = G.A, B = G.clients[0]; A.CFG.policeAt = 1; A.CFG.policeForced = 1;
        const god = s => { for (let i = 0; i < Math.round(s * 60); i++) { A.get().players.forEach(p => { p.hp = 1e9; }); step(G.insts, G.net, 1 / 60); } };
        const same = () => A.world().M.join('\n') === B.world().M.join('\n'), vs = d => d.world().M.join('').split('v').length - 1;
        const M0 = A.world().M.join('\n'), v0 = vs(A); A.startHeist(false, A.get().players[0]); god(1); A.spawnWave(); god(16);
        out.parken = A.get().pcs.filter(c => c.st === 'park').length; out.gleich1 = same(); out.neu = [vs(A) - v0, vs(B) - v0];
        const c = A.get().pcs.find(q => q.st === 'park' && q.row === 0); A.get().en.length = 0; A.get().bl.push({ id: 6001, x: c.x, y: c.y - 60, vx: 0, vy: 720, l: .8, o: 1, own: 0, d: 9999 }); god(1);
        out.wrack = [c.dead, (B.get().pcs.find(q => q.id === c.id) || {}).dead]; out.gleich2 = same(); out.dbg = { c: [c.id, c.side, c.slot, c.row, Math.round(c.x), Math.round(c.y), c.hp, c.cells && c.cells.length], cars: A.get().pcs.map(q => [q.id, q.side, q.slot, q.row, Math.round(q.x), Math.round(q.y), q.st, q.dead, q.hp, q.cells && q.cells.length]) };
        const cc = B.get().pcs.find(q => q.id === c.id); out.clientZellen = !!(cc && cc.cells && cc.cells.length && cc.cells.every(q => B.isSol(q[0], q[1])));
        A.callVan(); for (let i = 0; i < 90 && !(A.get().vanArr && A.get().vanMode === 0 && Math.abs(A.get().vanX - A.LANE().van.stop) <= 2); i++) god(1); god(1.5);
        out.vanAn = A.get().vanArr && A.get().vanMode === 0; out.gleich3 = same(); out.vanNeu = [vs(A), vs(B)];
        return out;
      });
      t.ok(r.parken >= 2, 'Wagen parken: ' + r.parken);
      t.eq(r.gleich1, true, 'gleiches Raster nach dem Parken'); t.ok(r.neu[0] > 0 && r.neu[0] === r.neu[1], 'Host und Client haben gleich viele neue v-Kacheln: ' + r.neu);
      t.eq(r.wrack, [true, true], 'Wrack bei beiden ' + JSON.stringify(r.dbg)); t.eq(r.gleich2, true, 'gleiches Raster mit Wrack'); t.eq(r.clientZellen, true, 'der Client kennt den Fussabdruck des Wracks als solide');
      t.eq(r.vanAn, true, 'der Fluchtwagen steht'); t.eq(r.gleich3, true, 'gleiches Raster mit Fluchtwagen'); t.ok(r.vanNeu[0] === r.vanNeu[1], 'gleich viele v-Kacheln: ' + r.vanNeu);
    },
  },
];
