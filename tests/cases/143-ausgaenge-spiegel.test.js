// Testluecke aus PR 30 (Auslagern der Kartenerzeugung nach js/maps.js), Ticket 31: Drei Mutanten ueberlebten die Generator-Tests und Alt-Neu schnell. Alle drei aendern die fertige Karte aus layoutFor
// (Beleg: Hash von 120 Seeds je Szenario und Lage aendert sich, siehe PR-Text), die bisherigen Tests pruefen aber nur exit.tx und van.stop (Museum und Casino) oder gar keine Spiegelungs-Felder (Bank).
// (1) Museum und Casino: Die Fluchtzone (exit: x, y0, y1, dir, tx) und der Fluchtwagen (van: y, x0, stop, dir) haengen an den beiden Fluchttuer-Kacheln der Ostwand (lay.spots mit ex). Hier werden sie daraus
//     abgeleitet und exakt verglichen (Basis), in gedrehten Lagen muss die Fluchtzone (laneOf) weiter an der Tuer liegen und gleich gross sein.
// (2) Bank, gespiegelte Karten (mirrorLayout, lay.flip): Ohne ein ungespiegeltes Gegenstueck derselben Karte pruefen Beziehungen, die in beiden Faellen gelten muessen: Fluchtlinie gegen Zielkachel, Wagenhalt gegen
//     Fluchtlinie, Wagenstart auf dem Kachelraster, Spawn-Rest auf der Kachel gespiegelt zum ungespiegelten, Kameras in der Streubreite der gespiegelten Winkel, Tueren, Tresor, Kassen und Automaten auf ihren Kacheln.
const HELP = `(() => {
  const D = __dbg, T = 32;
  const run = (sc, seeds) => {
    const bad = [], seen = { q: 0, classic: 0 }; D.setScenario(sc); D.setSeedMode('random'); D.setLage([]);
    const cells = lay => { const ln = D.laneOf(lay); return ln.exit.cells.length; };
    const base = {};
    for (const s of seeds) {
      D.setTurn('S'); const lay = D.layoutBase(s), tag = sc + '#' + s + (lay.q ? ' ' + JSON.stringify(lay.q) : ' Klassik'); lay.q ? seen.q++ : seen.classic++;
      D.validateMap(lay);   // legt lay.spots an
      const ex = lay.spots.filter(z => z.ex); if (ex.length !== 1) { bad.push(tag + ' Fluchttuer-Spots ' + ex.length); continue; }
      const cs = ex[0].cells, dx = cs[0][0], r0 = Math.min(...cs.map(c => c[1]));
      if (cs.length !== 2 || cs[1][0] !== dx || Math.max(...cs.map(c => c[1])) !== r0 + 1) { bad.push(tag + ' Fluchttuer nicht zwei Kacheln uebereinander ' + JSON.stringify(cs)); continue; }
      const e = lay.exit, v = lay.van, want = { x: (dx + 1) * T, y0: (r0 - 1) * T, y1: (r0 + 3) * T, dir: 1, tx: dx + 1 }, wantV = { y: (r0 + 1) * T, x0: (dx + 7) * T, stop: (dx + 1) * T, dir: -1 };
      for (const k in want) if (e[k] !== want[k]) bad.push(tag + ' exit.' + k + ' ' + e[k] + ' statt ' + want[k]);
      for (const k in wantV) if (v[k] !== wantV[k]) bad.push(tag + ' van.' + k + ' ' + v[k] + ' statt ' + wantV[k]);
      const n0 = cells(lay), isNum = Number.isFinite(n0) && n0 > 0; if (!isNum) bad.push(tag + ' keine Fluchtzonen-Kacheln');
      for (const tn of ['N', 'E', 'W+', 'S+']) {
        D.setTurn(tn); const l2 = D.layoutFor(s), ln = D.laneOf(l2), set = new Set(ln.exit.cells.map(c => c[0] + ',' + c[1]));
        if (ln.exit.cells.length !== n0) bad.push(tag + ' ' + tn + ' Fluchtzone hat ' + ln.exit.cells.length + ' statt ' + n0 + ' Kacheln');
        const w2 = D.world(), nb = [[1, 0], [-1, 0], [0, 1], [0, -1]], doors = [];
        for (let y = w2.WY0; y < w2.WY0 + w2.H; y++) for (let x = w2.WX0; x < w2.WX0 + w2.W; x++) if (w2.cell(x, y) === 'D' && nb.some(d => set.has((x + d[0]) + ',' + (y + d[1])))) doors.push([x, y]);
        if (doors.length !== 2) bad.push(tag + ' ' + tn + ' ' + doors.length + ' Glastuer-Kacheln an der Fluchtzone statt 2');
      }
    }
    D.setTurn('S');
    return { bad, seen };
  };
  return { D, run };
})()`;

module.exports = [
  {
    name: 'Fluchtzone und Fluchtwagen von Museum und Casino folgen der Fluchttuer (exit x, y0, y1, dir, tx, van y, x0, stop, dir exakt in der Basis, in gedrehten Lagen gleich grosse Fluchtzone an der Tuer)',
    timeout: 180000,
    async run(t) {
      await t.page.evaluate(() => { __dbg.CFG.meet.p = 0; });
      await t.loadInpage('turn.js');
      for (const sc of ['museum', 'casino']) {
        const r = await t.page.evaluate(([sc, help]) => {
          const H = eval(help), seeds = []; for (let s = 1; s <= 60; s++) seeds.push(s);
          return H.run(sc, seeds);
        }, [sc, HELP]);
        t.ok(r.seen.q >= 40 && r.seen.classic >= 1, sc + ': erzeugte und Klassik-Huellen kommen vor ' + JSON.stringify(r.seen));
        t.eq(r.bad.slice(0, 6), [], sc + ': ' + r.bad.length + ' Abweichungen');
      }
    },
  },
  {
    name: 'Bank gespiegelt (mirrorLayout): Fluchtlinie, Wagenhalt und Wagenstart, Spawn, Kameras, Tueren, Tresor, Kassen und Automaten stimmen mit dem Raster ueberein (alle vier Fluchtvarianten ohne und mit Spiegelung)',
    timeout: 180000,
    async run(t) {
      await t.page.evaluate(() => { __dbg.CFG.meet.p = 0; });
      await t.loadInpage('turn.js');
      const r = await t.page.evaluate(() => {
        const D = __dbg, T = 32, bad = [], grp = {}, resid = { U: new Set(), F: new Set() }, sun = { U: new Set(), F: new Set() }, fnum = x => Math.round(x * 1000) / 1000;
        D.setScenario('bank'); D.setSeedMode('random'); D.setLage([]); D.setTurn('S');
        const S0 = [.62, 2.45, .75, 1.75, 3.14, 0, .59, 2.55, -1.4, .8], twoPi = 2 * Math.PI;
        const adist = (a, b) => { let d = ((a - b) % twoPi + twoPi) % twoPi; return Math.min(d, twoPi - d); };
        let maxOff = { U: 0, F: 0 };
        let w = D.world(); const cell = (x, y) => w.cell(x, y);
        const solid = (a, tag, what) => { if (D.isSol(a[0], a[1])) bad.push(tag + ' ' + what + ' steht im Festen bei ' + a); };
        for (let s = 1; s <= 400; s++) {
          const lay = D.layoutBase(s); w = D.world(); const F = lay.flip ? 'F' : 'U', e = lay.exit, v = lay.van, tag = 'bank#' + s + ' ' + F + e.dir;
          grp[F + e.dir] = (grp[F + e.dir] || 0) + 1;
          if (e.x !== (e.dir > 0 ? e.tx : e.tx + 1) * T) bad.push(tag + ' Fluchtlinie ' + e.x + ' gegen Zielkachel ' + e.tx);
          if (v.stop !== e.x - (v.dir > 0 ? 128 : 0)) bad.push(tag + ' Wagenhalt ' + v.stop + ' gegen Fluchtlinie ' + e.x + ' (van.dir ' + v.dir + ')');
          if (v.x0 % T !== 0 || v.stop % T !== 0) bad.push(tag + ' Wagenstart/-halt nicht auf dem Raster: ' + v.x0 + ' ' + v.stop);
          const edge = (w.WX0 + w.W) * T, rel = v.dir > 0 ? v.x0 - w.WX0 * T : v.x0 - edge;
          if (!(v.dir > 0 ? [32, 64, 96] : [-224, -192, -160]).includes(rel)) bad.push(tag + ' Wagenstart ' + rel + ' vom Weltrand');
          resid[F].add(fnum(lay.spawn.x % T));
          for (const c of lay.cams) {
            const set = lay.flip ? S0.map(a => Math.PI - a) : S0, off = Math.min(...set.map(a => adist(c.a0, a)));
            maxOff[F] = Math.max(maxOff[F], off); if (off > .1501) bad.push(tag + ' Kamera ' + fnum(c.a0) + ' ausserhalb der Streuung (' + fnum(off) + ')');
          }
          for (const d of lay.backDoors) if (!'Ll'.includes(cell(d[0], d[1]))) bad.push(tag + ' Hintertuer ' + d + ' ist ' + cell(d[0], d[1]));
          if (cell(lay.vault.door[0], lay.vault.door[1]) !== 'V') bad.push(tag + ' Tresortuer ' + lay.vault.door + ' ist ' + cell(lay.vault.door[0], lay.vault.door[1]));
          solid(lay.vault.pad, tag, 'Tresor-Pad'); lay.vault.bundles.forEach(b => solid(b, tag, 'Buendel'));
          for (const a of lay.tills) if (cell(a[0], a[1]) !== 'r') bad.push(tag + ' Kasse ' + a + ' ist ' + cell(a[0], a[1]));
          for (const a of lay.atms) if (cell(a[0], a[1]) !== 'A') bad.push(tag + ' Automat ' + a + ' ist ' + cell(a[0], a[1]));
          lay.tellers.forEach(a => solid(a, tag, 'Kassierer')); solid(lay.mgr.p, tag, 'Leiter'); lay.mgr.route.forEach(a => solid(a, tag, 'Leiter-Route'));
          lay.guards.forEach(g => { solid(g.p, tag, 'Wache'); g.route.forEach(a => solid(a, tag, 'Wachen-Route')); });
          lay.mission.bags.forEach(a => solid(a, tag, 'Sack'));
          { const lb = lay.lobby, y = lb[1]; if (cell(lb[0] - 1, y) !== '#' || cell(lb[0], y) !== '.' || cell(lb[2], y) !== '.' || cell(lb[2] + 1, y) !== '#') bad.push(tag + ' Schalterhalle ' + lb + ' nicht von Waenden eingefasst: ' + cell(lb[0] - 1, y) + cell(lb[0], y) + cell(lb[2], y) + cell(lb[2] + 1, y)); }
          sun[F].add(lay.theme.sun.dx);
          if (Math.abs(lay.sw.x % T - 16) > 1e-9) bad.push(tag + ' sw.x nicht in der Kachelmitte: ' + lay.sw.x);
        }
        for (const d of sun.F) if (!sun.U.has(-d)) bad.push('Sonne gespiegelt dx ' + d + ' (ungespiegelt kommt ' + [...sun.U] + ' vor)');
        const u = [...resid.U], f = [...resid.F];
        if (u.length !== 1) bad.push('Spawn-Rest ungespiegelt nicht einheitlich: ' + u);
        else if (f.length < 1 || f.length > 2 || !f.every(x => Math.abs(((T - u[0]) % T) - x) < .01)) bad.push('Spawn-Rest gespiegelt ' + f + ' statt ' + ((T - u[0]) % T));
        return { bad, grp, maxOff };
      });
      for (const k of ['U1', 'F1', 'U-1', 'F-1']) t.ok(r.grp[k] >= 30, 'Variante ' + k + ' kommt oft genug vor ' + JSON.stringify(r.grp));
      t.ok(r.maxOff.F > .09 && r.maxOff.U > .09, 'die Kamerastreuung wird ausgeschoepft (sonst prueft die Winkelgrenze nichts) ' + JSON.stringify(r.maxOff));
      t.eq(r.bad.slice(0, 8), [], r.bad.length + ' Abweichungen');
    },
  },
];
