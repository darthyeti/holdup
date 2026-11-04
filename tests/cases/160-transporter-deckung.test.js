// Transporter: Deckungs-KI der Besatzung (Ticket 14, 4. November 2026, CFG.truck.cov, docs/szenarien.md). Die Besatzung (Modus cover) sucht Plaetze an kugelsperrenden Kacheln, die gegen die Spieler decken, schaut abwechselnd heraus und schiesst,
// wechselt bei Wegfall der Deckung, Flanke und zu nahen Spielern, bleibt dort bis zur Polizei (Tills Entscheidung trk-sturm B) und stuermt erst mit ihr. Aufgeben bleibt, cov.on 0 ist das alte Verhalten (Posten, Sturm nach crewHold).
async function setup(t) {
  await t.loadTool('loopnet.js');
}
// Seeds ohne Panne und ohne Vorhut (anderer Ablauf), ab 3000 wie der Transporter-Bot
const NP = `(n) => { const D = __dbg, out = []; D.setScenario('truck'); D.setSeedMode('random'); D.setLage([]); for (let sd = 3000; out.length < n; sd++) { const m = D.genTruckMission(sd); if (!m.panne && !m.vorhut && m.crew >= 3) out.push(sd); } return out; }`;
// Aufbau: fertige Sperre, der Wagen haelt, Phase 2. Der Spieler (unverwundbar) steht danach auf der Nordseite, 8 Kacheln hinter dem Wagen (Ostseite der Sperre), danach per P(dx, dy) in Kacheln vom Wagen
const BUILD = `(sd, opt) => { const D = __dbg; D.sessReset(); D.setScenario('truck'); D.setSeedMode('random'); D.setLage([]); D.setTurn('S'); D.buildSeed(sd); D.CFG.policeAt = 26; D.CFG.policeForced = 20; if (opt && opt.pol) { D.CFG.truck.policeAt = opt.pol; D.CFG.policeForced = opt.pol; } if (opt && opt.on !== undefined) D.CFG.truck.cov.on = opt.on;
  const g = D.get(), me = g.me, L = D.LAY(); for (const b of D.bars().filter(x => x.rd && x.g === 0)) { b.lv = 1; b.hp = 100; } return { D, g, me, L }; }`;
const STEP = `(D, me, n, f) => { for (let i = 0; i < n; i++) { me.hp = 1e9; if (window.__hold) { me.x = window.__hold[0]; me.y = window.__hold[1]; } D.update(1 / 30); if (f && f(i / 30)) return i / 30; } return -1; }`;
// bis Phase 2 (der Spieler wartet nordwaerts der Fahrbahn, 2 Kacheln hinter der Sperre, damit die Besatzung ihn schon beim Aussteigen kennt)
const TO2 = `(D, me, STEP) => { const b = D.bars().find(x => x.rd && x.g === 0); window.__hold = [b.cells[0][0] * 32 + 2 * 32 + 16, 8 * 32 + 16]; STEP(D, me, 30 * 150, () => D.get().phase === 2); return D.tk(); }`;
const MORE = `const adj = (D, x, y) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(v => D.world().isBul(x + v[0], y + v[1])), tile = e => [Math.floor(e.x / 32), Math.floor(e.y / 32)],
  shel = (D, e, o) => { const dx = o.x - e.x, dy = o.y - e.y, dd = Math.hypot(dx, dy) || 1; for (let s = 10; s <= 48; s += 6) if (D.world().isBul(Math.floor((e.x + dx / dd * s) / 32), Math.floor((e.y + dy / dd * s) / 32))) return true; return false; },
  crew = D => D.get().en.filter(e => e.crew && !e.sur && e.hp > 0);`;

module.exports = [
  {
    name: 'Deckung beziehen: nach 4 s steht jedes Besatzungsmitglied (Modus cover) einen Platz auf einer Kachel neben einer kugelsperrenden Kachel, keine zwei auf derselben, alle innerhalb der Leine, mindestens die Haelfte gegen den Spieler gedeckt; vor der Polizei stuermt keiner',
    async run(t) {
      await setup(t);
      const r = await t.page.evaluate(`(() => { ${MORE} const B = ${BUILD}, STEP = ${STEP}, TO2 = ${TO2}, o = { sd: [], bad: [], dup: [], leash: [], mode: [], shel: [], far: [] }; for (const sd of (${NP})(4)) { const { D, g, me } = B(sd, { pol: 400 }); const tk = TO2(D, me, STEP); STEP(D, me, 4 * 30); const cr = crew(D), V = D.CFG.truck.cov;
        o.sd.push(cr.length); o.mode.push(...cr.filter(e => e.mode !== 'cover').map(e => [sd, e.mode])); o.bad.push(...cr.filter(e => !adj(D, e.cv.x, e.cv.y)).map(e => [sd, e.cv.x + ',' + e.cv.y])); const ts = cr.map(e => e.cv.x + ',' + e.cv.y); o.dup.push(...ts.filter((x, i) => ts.indexOf(x) !== i));
        o.leash.push(...cr.filter(e => Math.hypot(e.cv.x * 32 + 16 - tk.x, e.cv.y * 32 + 16 - tk.y) > V.leash * 32).map(e => [sd, e.cv.x + ',' + e.cv.y])); o.shel.push(cr.filter(e => shel(D, { x: e.cv.x * 32 + 16, y: e.cv.y * 32 + 16 }, me)).length + '/' + cr.length);
        STEP(D, me, 50 * 30); o.far.push(...crew(D).filter(e => e.mode !== 'cover').map(e => [sd, e.mode])); } return o; })()`);
      t.ok(r.sd.every(n => n >= 3), 'Besatzung von mindestens 3: ' + r.sd); t.eq(r.mode, [], 'alle im Modus cover'); t.eq(r.bad, [], 'jeder steht neben einer kugelsperrenden Kachel'); t.eq(r.dup, [], 'keine zwei auf derselben Kachel'); t.eq(r.leash, [], 'alle in der Leine zum Wagen');
      t.ok(r.shel.every(s => { const [a, b] = s.split('/').map(Number); return a >= Math.ceil(b / 2); }), 'mindestens die Haelfte gegen den Spieler gedeckt (die uebrigen stehen an Ecken, wo sie zum Schiessen nur einen Schritt brauchen): ' + r.shel); t.eq(r.far, [], 'auch 54 s nach dem Halt (weit nach crewHold 22 s, Polizei nicht da) stuermt keiner');
    },
  },
  {
    name: 'Herausschauen: jedes Besatzungsmitglied schiesst innerhalb von 12 s mindestens einmal und versteckt sich danach wieder (nicht dauernd draussen)',
    async run(t) {
      await setup(t);
      const r = await t.page.evaluate(`(() => { ${MORE} const B = ${BUILD}, STEP = ${STEP}, TO2 = ${TO2}, o = { n: [], miss: [], out: [], hits: 0 }; for (const sd of (${NP})(3)) { const { D, g, me } = B(sd, { pol: 400 }); TO2(D, me, STEP); const cr = crew(D), shot = new Map(cr.map(e => [e.id, 0])), seen = new Set(); let outN = 0, tot = 0;
        for (let i = 0; i < 12 * 30; i++) { me.hp = 1e9; D.update(1 / 30); for (const b of D.get().bl) { if (b.o || seen.has(b.id)) continue; seen.add(b.id); let best = null, bd = 60; for (const e of cr) { const d = Math.hypot(e.x - b.x, e.y - b.y); if (d < bd) { bd = d; best = e; } } if (best) shot.set(best.id, shot.get(best.id) + 1); }
          for (const e of cr) { tot++; if (!adj(D, ...tile(e))) outN++; } }
        o.n.push(cr.length); o.miss.push(...cr.filter(e => !(shot.get(e.id) >= 1)).map(e => [sd, e.id])); o.out.push(Math.round(100 * outN / tot)); } return o; })()`);
      t.eq(r.miss, [], 'jeder schiesst mindestens einmal: ' + r.n); t.ok(r.out.every(p => p < 60), 'nicht dauernd ausserhalb der Deckung (Anteil der Zeit auf einer Kachel ohne sperrende Nachbarkachel, Prozent): ' + r.out);
    },
  },
  {
    name: 'Wegfall der Deckung: wird die Kachel hinter der ein Mitglied steht abgeraeumt (wie ein zerlegtes Auto oder eine Kiste), steht es nach hoechstens min + re + Laufzeit woanders neben einer sperrenden Kachel, vorher nicht sofort (Wechsel hoechstens alle min Sekunden)',
    async run(t) {
      await setup(t);
      const r = await t.page.evaluate(`(() => { ${MORE} const B = ${BUILD}, STEP = ${STEP}, TO2 = ${TO2}, o = {}; const sd = (${NP})(1)[0], { D, g, me } = B(sd, { pol: 400 }); TO2(D, me, STEP); STEP(D, me, 8 * 30); const V = D.CFG.truck.cov, e = crew(D)[0]; const cv0 = e.cv.x + ',' + e.cv.y, tl = tile(e);
        const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(v => [e.cv.x + v[0], e.cv.y + v[1]]).filter(c => D.world().isBul(c[0], c[1])); o.nb = nb.length; o.ok0 = adj(D, e.cv.x, e.cv.y); const saved = nb.map(c => [c, D.world().cell(c[0], c[1])]); for (const c of nb) D.world().setc(c[0], c[1], 'o'); o.adjNach = adj(D, e.cv.x, e.cv.y);
        const t1 = STEP(D, me, 20 * 30, () => e.cv.x + ',' + e.cv.y !== cv0); o.gewechselt = t1; STEP(D, me, 6 * 30); o.steht = adj(D, ...tile(e)); o.cvAdj = adj(D, e.cv.x, e.cv.y); o.cs = e.cs; o.min = V.min; o.re = V.re; return o; })()`);
      t.ok(r.nb >= 1 && r.ok0, 'das Mitglied stand neben einer sperrenden Kachel'); t.eq(r.adjNach, false, 'Vorbereitung: nach dem Abraeumen deckt der Platz nicht mehr');
      t.ok(r.gewechselt >= 0 && r.gewechselt <= r.min + r.re + 1, 'es wechselt den Platz, hoechstens min + re nach dem Wegfall: ' + r.gewechselt.toFixed(1) + ' s'); t.eq([r.steht, r.cvAdj], [true, true], 'es steht danach neben einer sperrenden Kachel');
    },
  },
  {
    name: 'Flanke und Naehe: wechselt der Spieler auf die andere Seite des Wagens, wechselt mindestens ein Mitglied den Platz und alle stehen wieder gedeckt; ein Spieler dicht bei einem Mitglied (unter near) vertreibt es von seinem Platz',
    async run(t) {
      await setup(t);
      const r = await t.page.evaluate(`(() => { ${MORE} const B = ${BUILD}, STEP = ${STEP}, TO2 = ${TO2}, o = {}; const sd = (${NP})(1)[0], { D, g, me } = B(sd, { pol: 400 }); const tk = TO2(D, me, STEP); STEP(D, me, 6 * 30); const cr = crew(D), before = cr.map(e => e.cv.x + ',' + e.cv.y);
        window.__hold = [tk.x - 8 * 32 - 16, 13 * 32 + 16]; STEP(D, me, 14 * 30); o.changed = cr.filter((e, i) => e.cv.x + ',' + e.cv.y !== before[i]).length; o.n = cr.length; o.adj = crew(D).every(e => adj(D, e.cv.x, e.cv.y)); o.shel = crew(D).filter(e => shel(D, { x: e.cv.x * 32 + 16, y: e.cv.y * 32 + 16 }, me)).length;
        const e = crew(D)[0], cv1 = e.cv.x + ',' + e.cv.y; const hx = e.cv.x * 32 + 16, hy = e.cv.y * 32 + 16; let px = hx, py = hy, f = false; for (const v of [[2, 0], [-2, 0], [0, 2], [0, -2]]) { const x = hx + v[0] * 32, y = hy + v[1] * 32; if (!D.isSol(Math.floor(x / 32), Math.floor(y / 32))) { px = x; py = y; f = true; break; } }
        o.nah = f; window.__hold = [px, py]; const t2 = STEP(D, me, 12 * 30, () => { return e.cv.x + ',' + e.cv.y !== cv1; }); o.nahWechsel = t2; return o; })()`);
      t.ok(r.changed >= 1, 'bei der Flanke wechselt mindestens ein Mitglied: ' + r.changed + ' von ' + r.n); t.ok(r.adj && r.shel >= 1, 'danach haben alle wieder einen Platz neben sperrenden Kacheln, mindestens einer gedeckt: ' + r.shel); t.ok(r.nah && r.nahWechsel >= 0, 'ein Spieler dicht davor vertreibt das Mitglied: ' + r.nahWechsel);
    },
  },
  {
    name: 'Polizei da: ab policeAt (plus 2 s je Mitglied) rueckt die Besatzung vor (push, wie die Polizei), vorher bleibt sie in Deckung; Aufgeben bleibt (wenig Leben, allein oder in Unterzahl: ergibt sich, schiesst nicht mehr, laesst sich mit E ueberwaeltigen)',
    async run(t) {
      await setup(t);
      const r = await t.page.evaluate(`(() => { ${MORE} const B = ${BUILD}, STEP = ${STEP}, TO2 = ${TO2}, o = {}; const sd = (${NP})(1)[0]; { const { D, g, me } = B(sd); TO2(D, me, STEP); const pa = D.get().policeAt; STEP(D, me, 5 * 30); o.vor = crew(D).map(e => e.mode); o.pa = pa;
          STEP(D, me, 60 * 30, () => D.get().tH >= pa + 2 * 6 + 1); o.zeit = [pa, D.get().tH]; o.nach = crew(D).map(e => e.mode); }
        { const { D, g, me } = B(sd, { pol: 400 }); TO2(D, me, STEP); STEP(D, me, 3 * 30); const cr = crew(D), e1 = cr[0]; for (const e of cr.slice(1)) e.hp = -1; STEP(D, me, 2); e1.hp = 20; STEP(D, me, 3); o.sur = [e1.sur, e1.mode]; STEP(D, me, 3 * 30); o.sur2 = [e1.mode, D.get().bl.filter(b => !b.o).length]; }
        return o; })()`);
      t.ok(r.vor.every(m => m === 'cover'), 'vor der Polizei alle in Deckung: ' + r.vor); t.eq(r.sur, [true, 'sur'], 'wenig Leben und die letzte: ergibt sich'); t.ok(r.nach.length >= 1 && r.nach.every(m => m === 'push'), 'nach der Polizei ruecken die uebrigen vor (push): ' + r.nach + ' ' + r.zeit); t.eq(r.sur2, ['sur', 0], 'der Ergebene bleibt ergeben und schiesst nicht');
    },
  },
  {
    name: 'cov.on 0: das Verhalten von vorher (Modus post, Besatzung bleibt am Posten und stuermt nach crewHold + 2 s je Mitglied, auch ohne Polizei), kein cv, kein cover',
    async run(t) {
      await setup(t);
      const r = await t.page.evaluate(`(() => { ${MORE} const B = ${BUILD}, STEP = ${STEP}, TO2 = ${TO2}, o = {}; const sd = (${NP})(1)[0], { D, g, me } = B(sd, { pol: 400, on: 0 }); TO2(D, me, STEP); STEP(D, me, 10 * 30); o.vor = crew(D).map(e => [e.mode, !!e.cv]); STEP(D, me, 30 * 30); o.nach = crew(D).map(e => e.mode); o.hold = D.CFG.truck.crewHold; return o; })()`);
      t.ok(r.vor.every(x => x[0] === 'post' && !x[1]), 'ohne cov.on: Posten, kein Deckungsplatz: ' + JSON.stringify(r.vor)); t.ok(r.nach.every(m => m === 'push'), 'nach crewHold (' + r.hold + ' s) stuermen sie wie vorher: ' + r.nach);
    },
  },
];
