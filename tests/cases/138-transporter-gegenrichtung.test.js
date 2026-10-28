// Transporter-Gegenrichtung (E3 der Transporter-Abwechslung, 28. Oktober 2026, Tills Wunsch nach mehr Abwechslung): In etwa jedem dritten Auftrag faehrt der Panzerwagen von Osten nach Westen (`mission.rev`, Tag "Wagen von Osten").
// Die Karte selbst bleibt, gespiegelt werden nur Fluchtzone, Fluchtwagen, Wagenplaetze der Polizei, Posten und bei der Panne der Startplatz: Die Fluchtzone liegt am Westende, der Fluchtwagen kommt von Westen, der Wagen faehrt von Osten an,
// haelt auf der Ostseite der Sperre, sein Heck (Laderaum, Saecke) zeigt nach Osten, die Besatzung steigt gespiegelt aus. Vorhut und Panne laufen in dieser Richtung mit. Die Wuerfel `ru` stehen hinter allen alten, alte Seeds bleiben gleich.
async function setup(t) {
  await t.loadTool('loopnet.js');
  await t.loadInpage('coop.js');
}
const FIND = `(pred, n) => { const D = __dbg, out = []; D.setScenario('truck'); D.setSeedMode('random'); D.setLage([]); for (let sd = 1; sd < 900 && out.length < n; sd++) { const m = D.genTruckMission(sd); if (pred(m)) out.push(sd); } return out; }`;
const BUILD = `(sd) => { const D = __dbg; D.sessReset(); D.setScenario('truck'); D.setSeedMode('random'); D.setLage([]); D.setTurn('S'); D.buildSeed(sd); D.CFG.truck.policeAt = 1e6; D.CFG.policeForced = 1e6; const g = D.get(); return { D, g, me: g.me, L: D.LAY(), M: D.LAY().mission }; }`;
const RUN = `(D, me, f, sec, hold) => { for (let i = 0; i < sec * 30; i++) { me.hp = 1e9; if (hold) { me.x = hold[0]; me.y = hold[1]; } D.update(1 / 30); if (D.get().ended || f()) return i / 30; } return -1; }`;
// Seeds ohne Panne und Vorhut (der schlichte Ablauf), nach Richtung
const PLAIN = `(m, rev) => !m.panne && !m.vorhut && !!m.rev === rev`;

module.exports = [
  {
    name: 'Gegenrichtung: etwa jeder dritte Auftrag (28 bis 42 % von 800 Seeds), Tag "Wagen von Osten" genau bei diesen, kommt mit Panne, Vorhut, Baustelle und Gassen vor; die Wuerfel stehen hinter den alten (Golden)',
    async run(t) {
      await setup(t);
      const r = await t.page.evaluate(`(() => { const D = __dbg, o = { n: 0, rev: 0, tag: [], mix: { panne: 0, vorhut: 0, baustelle: 0, gassen: 0 }, ra: [] }; D.setScenario('truck'); D.setSeedMode('random'); D.setLage([]);
        for (let sd = 1; sd <= 800; sd++) { const m = D.genTruckMission(sd); o.n++; if (m.rev) { o.rev++; if (m.panne) o.mix.panne++; if (m.vorhut) o.mix.vorhut++; if (m.street === 'baustelle') o.mix.baustelle++; if (m.street === 'gassen') o.mix.gassen++; }
          if (!!m.rev !== m.tags.includes('Wagen von Osten')) o.tag.push(sd); if (sd <= 60) o.ra.push(sd + ':' + (m.rev ? 1 : 0)); } return o; })()`);
      t.ok(r.rev / r.n >= .28 && r.rev / r.n <= .42, 'Anteil der Gegenrichtung: ' + r.rev + ' von ' + r.n); t.eq(r.tag, [], 'Tag genau bei diesen');
      t.ok(Object.values(r.mix).every(v => v > 0), 'in Verbindung mit allen vier Varianten: ' + JSON.stringify(r.mix)); await t.snapshot('rev', r.ra);
    },
  },
  {
    name: 'Karte der Gegenrichtung: Fluchtzone im Westen (Zone Kacheln 1 bis 4, Richtung -1), Fluchtwagen kommt von Westen, Wagenplaetze der Polizei gespiegelt, die Anker der Posten stehen im Westen (Plaetze der Posten bleiben), die ersten 40 Karten bestehen validateMap (alle rund 300 im langsamen Test unten), der Normalfall bleibt wie er war (Osten)',
    async run(t) {
      await setup(t);
      const r = await t.page.evaluate(`(() => { const F = ${FIND}, B = ${BUILD}, P = ${PLAIN}, o = {}, sr = F(m => P(m, true), 1)[0], sn = F(m => P(m, false), 1)[0];
        const get = sd => { const { D, L } = B(sd), LN = D.LANE(), cs = LN.exit.cells; return { exit: [L.exit.x, L.exit.dir, L.exit.tx], van: [L.van.x0, L.van.stop, L.van.dir], slots: JSON.stringify(L.slots), posts: L.posts.map(p => [p.x, p.y, +p.a.toFixed(2), p.k, !!p.anchor]).sort((a, b) => a[0] - b[0] || a[1] - b[1]), anchors: L.posts.filter(p => p.anchor).map(p => p.k).join(''), xs: [Math.min(...cs.map(c => c[0])), Math.max(...cs.map(c => c[0]))], has: [LN.exit.has(2.5 * 32, 10 * 32), LN.exit.has(56 * 32, 10 * 32)], spawn: L.spawn.x }; };
        o.r = get(sr); o.n = get(sn); o.slotsR = JSON.parse(o.r.slots); o.slotsN = JSON.parse(o.n.slots);
        const all = F(m => !!m.rev, 400); o.bad = []; const { D } = B(sr); for (const sd of all.slice(0, 40)) { D.sessReset(); D.setScenario('truck'); D.setSeedMode('random'); D.setLage([]); D.setTurn('S'); D.buildSeed(sd); const rep = D.validateMap(D.LAY()); if (!rep.ok) o.bad.push([sd, rep.err.map(e => e.r).join(',')]); } o.nAll = Math.min(40, all.length);
        const pr = F(m => m.panne && !!m.rev, 1)[0], pn = F(m => m.panne && !m.rev, 1)[0]; o.sp = [B(pr).L.spawn.x, B(pn).L.spawn.x]; return o; })()`);
      t.eq(r.r.exit, [5 * 32, -1, 4], 'Gegenrichtung: Fluchtzone liegt bei x 5 Kacheln, Richtung -1, erste Zonenkachel 4'); t.eq(r.n.exit, [55 * 32, 1, 55], 'Normalfall unveraendert (Osten)');
      t.eq(r.r.van.slice(1), [5 * 32 - 128, 1], 'Fluchtwagen haelt im Westen und faehrt nach Osten'); t.ok(r.r.van[0] < 0, 'er kommt von ausserhalb im Westen: ' + r.r.van[0]); t.eq(r.n.van, [66 * 32, 55 * 32, -1], 'Normalfall: von Osten');
      t.eq(r.r.xs, [1, 4], 'die Zone besteht aus den Kacheln 1 bis 4'); t.eq(r.r.has, [true, false], 'sie liegt im Westen, nicht im Osten'); t.eq(r.n.has, [false, true], 'im Normalfall im Osten');
      t.eq(r.slotsR.W, r.slotsN.E.map(x => 59 - x), 'Wagenplaetze der Polizei vom Westrand gespiegelt'); t.eq(r.slotsR.E, r.slotsN.W.map(x => 59 - x), 'und vom Ostrand');
      t.eq(r.r.posts.map(p => p.slice(0, 4)), r.n.posts.map(p => p.slice(0, 4)), 'die Posten behalten Ort, Blickwinkel und Art'); t.eq([r.r.anchors, r.n.anchors], ['WWWW', 'EEEE'], 'Anker: im Westen bei der Gegenrichtung, im Osten im Normalfall (sie sichern die Fluchtseite)'); t.ok(r.nAll >= 40 && r.bad.length === 0, 'alle ' + r.nAll + ' Karten der Gegenrichtung bestehen validateMap: ' + JSON.stringify(r.bad.slice(0, 3)));
      t.ok(r.sp[0] > 50 * 32 && r.sp[1] < 10 * 32, 'bei der Panne startet der Spieler auf der Seite gegenueber der Fluchtzone: ' + JSON.stringify(r.sp));
    },
  },
  {
    slow: true,
    name: 'Gegenrichtung: alle rund 300 Karten der Seeds 1 bis 900 bestehen validateMap (Panne, Vorhut, Baustelle, Gassen in allen Mischungen)',
    async run(t) {
      await setup(t);
      const r = await t.page.evaluate(`(() => { const D = __dbg, bad = []; let n = 0; for (let sd = 1; sd < 900; sd++) { D.setScenario('truck'); D.setSeedMode('random'); D.setLage([]); const m = D.genTruckMission(sd); if (!m.rev) continue; D.sessReset(); D.setTurn('S'); D.buildSeed(sd); n++; const rep = D.validateMap(D.LAY()); if (!rep.ok) bad.push([sd, m.street, !!m.panne, rep.err.map(e => e.m).join(';')]); } return { n, bad: bad.slice(0, 8) }; })()`);
      t.ok(r.n >= 250, 'genug Karten geprueft: ' + r.n); t.eq(r.bad, [], 'Karten, die validateMap nicht besteht (Seed, Strasse, Panne, Meldung)');
    },
  },
  {
    name: 'Gegenrichtung: der Wagen wartet ausserhalb im Osten, faehrt nach Westen, haelt auf der Ostseite einer fertigen Sperre (Abstand gap), die ersten Sperren sind die im Osten; eine unfertige Sperre haelt ihn nicht, ohne Sperre faehrt er durch (Wagen entkommen)',
    async run(t) {
      await setup(t);
      const r = await t.page.evaluate(`(() => { const F = ${FIND}, B = ${BUILD}, RUN = ${RUN}, P = ${PLAIN}, o = {}, sd = F(m => P(m, true) && m.street === 'std', 1)[0], K = D => D.CFG.truck;
        { const { D, me, M } = B(sd); o.start = [D.tk().x > 60 * 32, D.tk().st]; RUN(D, me, () => D.tk().st === 'drive', 120); const x0 = D.tk().x; RUN(D, me, () => false, 2); o.fahrt = [x0, D.tk().x, D.tk().x < x0]; const t1 = RUN(D, me, () => D.tk().st === 'gone', 60); o.durch = [t1 > 0, D.get().ended && D.get().ended.title, D.tk().x < 0]; }
        for (const g of [2, 1, 0]) { const { D, me, M } = B(sd), bs = D.bars().filter(x => x.rd && x.g === g); for (const b of bs) { b.lv = 1; b.hp = 100; } const t1 = RUN(D, me, () => D.tk().st === 'stopped', 120); o['g' + g] = [t1 > 0, Math.round(D.tk().x), bs[0].cells[0][0] * 32 + 32 + K(D).gap + 96, D.get().phase]; }
        { const { D, me, M } = B(sd), og = D.bars().filter(x => x.rd && x.g === 2), mg = D.bars().filter(x => x.rd && x.g === 1); og[0].lv = 1; og[0].hp = 100; for (const b of mg) { b.lv = 1; b.hp = 100; } const t1 = RUN(D, me, () => D.tk().st === 'stopped', 120); o.teil = [t1 > 0, Math.round(D.tk().x), mg[0].cells[0][0] * 32 + 32 + K(D).gap + 96]; }
        return o; })()`);
      t.eq(r.start, [true, 'wait'], 'der Wagen wartet ausserhalb der Karte im Osten'); t.ok(r.fahrt[2], 'er faehrt nach Westen (x nimmt ab): ' + JSON.stringify(r.fahrt)); t.eq(r.durch[0], true, 'ohne Sperre faehrt er durch'); t.eq(r.durch[1], 'Wagen entkommen', 'Ergebnis Wagen entkommen'); t.ok(r.durch[2], 'am Westende');
      for (const g of [2, 1, 0]) t.ok(r['g' + g][0] && Math.abs(r['g' + g][1] - r['g' + g][2]) <= 12 && r['g' + g][3] === 2, 'Sperre ' + ['West', 'Mitte', 'Ost'][g] + ': er haelt auf ihrer Ostseite und der Ueberfall beginnt: ' + JSON.stringify(r['g' + g]));
      t.ok(r.teil[0] && Math.abs(r.teil[1] - r.teil[2]) <= 12, 'die unfertige Sperre Ost haelt ihn nicht, er haelt vor der fertigen Mitte: ' + JSON.stringify(r.teil));
    },
  },
  {
    name: 'Gegenrichtung mit Baustelle: die Zeilen 9 und 10 sind in der Mitte zugezaeunt, ohne Sperre faehrt der Wagen in den unteren Zeilen nach Westen durch, die zwei Teilstuecke der Sperre Mitte halten ihn auf ihrer Ostseite, eines allein nicht',
    async run(t) {
      await setup(t);
      const r = await t.page.evaluate(`(() => { const F = ${FIND}, B = ${BUILD}, RUN = ${RUN}, o = {}, sd = F(m => !m.panne && !m.vorhut && m.rev && m.street === 'baustelle', 1)[0];
        { const { D, me } = B(sd); const t1 = RUN(D, me, () => D.tk().st === 'gone', 130); o.durch = [t1 > 0, D.get().ended && D.get().ended.title]; }
        { const { D, me } = B(sd); for (const b of D.bars().filter(x => x.rd && x.g === 1)) { b.lv = 1; b.hp = 100; } const t1 = RUN(D, me, () => D.tk().st === 'stopped', 130); o.halt = [t1 > 0, Math.round(D.tk().x), 29 * 32 + 32 + D.CFG.truck.gap + 96]; }
        { const { D, me } = B(sd); const b = D.bars().find(x => x.rd && x.g === 1); b.lv = 1; b.hp = 100; const t1 = RUN(D, me, () => D.tk().st === 'gone', 130); o.eine = [t1 > 0, D.tk().st]; }
        return o; })()`);
      t.eq(r.durch, [true, 'Wagen entkommen'], 'ohne Sperre faehrt er durch'); t.ok(r.halt[0] && Math.abs(r.halt[1] - r.halt[2]) <= 12, 'zwei Teilstuecke halten ihn auf der Ostseite der Sperre Mitte: ' + JSON.stringify(r.halt)); t.eq(r.eine, [true, 'gone'], 'ein Teilstueck allein haelt ihn nicht');
    },
  },
  {
    name: 'Gegenrichtung: Leute vor dem Wagen (westlich, in seiner Spur) halten ihn 100 Pixel davor an, Leute hinter ihm nicht; ein Reifentreffer laesst ihn tireSlide Pixel nach Westen ausrollen',
    async run(t) {
      await setup(t);
      const r = await t.page.evaluate(`(() => { const F = ${FIND}, B = ${BUILD}, RUN = ${RUN}, P = ${PLAIN}, o = {}, sd = F(m => P(m, true) && m.street === 'std', 1)[0];
        { const { D, me } = B(sd); const t1 = RUN(D, me, () => D.tk().st === 'stopped', 120, [20 * 32, 12 * 32]); o.vor = [t1 > 0, Math.round(D.tk().x - 96 - 20 * 32)]; }
        { const sn = F(m => P(m, false) && m.street === 'std', 1)[0], { D, me } = B(sn); const t1 = RUN(D, me, () => D.tk().st === 'stopped', 120, [40 * 32, 12 * 32]); o.vorN = [t1 > 0, Math.round(40 * 32 - (D.tk().x + 96))]; }
        { const { D, me } = B(sd); RUN(D, me, () => D.tk().x < 40 * 32, 120); const t1 = RUN(D, me, () => D.tk().st === 'gone', 120, [50 * 32, 12 * 32]); o.hinter = [t1 > 0, D.tk().st]; }
        { const { D, me } = B(sd); RUN(D, me, () => D.tk().x < 44 * 32, 120); const x0 = D.tk().x; D.tk().tire = 0; const t1 = RUN(D, me, () => D.tk().st === 'stopped', 60); o.reifen = [t1 > 0, Math.round(x0 - D.tk().x), D.CFG.truck.tireSlide]; }
        return o; })()`);
      t.ok(r.vor[0] && r.vorN[0] && Math.abs(r.vor[1] - r.vorN[1]) <= 3 && r.vor[1] > 70 && r.vor[1] <= 100, 'er haelt vor dem Spieler (rund 100 Pixel, er bremst nicht schnell genug) und gleich wie im Normalfall: ' + JSON.stringify([r.vor, r.vorN])); t.eq(r.hinter, [true, 'gone'], 'Leute hinter dem Wagen halten ihn nicht, er faehrt durch');
      t.ok(r.reifen[0] && Math.abs(r.reifen[1] - r.reifen[2]) <= 30, 'nach dem Reifentreffer rollt er rund tireSlide Pixel nach Westen aus: ' + JSON.stringify(r.reifen));
    },
  },
  {
    name: 'Gegenrichtung: Laderaum, Schluessel-Oeffnung und Saecke liegen am Heck im Osten, die Besatzung steigt gespiegelt aus (Fahrer vorn im Westen), im Normalfall umgekehrt',
    async run(t) {
      await setup(t);
      const r = await t.page.evaluate(`(() => { const F = ${FIND}, B = ${BUILD}, RUN = ${RUN}, P = ${PLAIN}, o = {};
        for (const rev of [true, false]) { const sd = F(m => P(m, rev) && m.street === 'std' && m.crew >= 3, 1)[0], { D, me, M } = B(sd); for (const b of D.bars().filter(x => x.rd && x.g === 1)) { b.lv = 1; b.hp = 100; } RUN(D, me, () => D.tk().st === 'stopped', 120); const tk = D.tk(), en = D.get().en.filter(e => e.crew), its = D.get().its;
          const drv = en.find(e => e.drv), item = tp => its.find(i => i.t === tp); o[rev ? 'r' : 'n'] = { drv: Math.round(drv.x - tk.x), cargo: Math.round(item('cargo').x - tk.x), bags: its.filter(i => i.t === 'tbag').map(i => Math.round(i.x - tk.x)), crew: en.map(e => Math.round(e.x - tk.x)), want: M.crew }; }
        return o; })()`);
      t.ok(r.r.drv < -30 && r.n.drv > 30, 'der Fahrer steht vorn: im Westen bei der Gegenrichtung, im Osten im Normalfall: ' + r.r.drv + ' und ' + r.n.drv); t.ok(r.r.cargo > 96 && r.n.cargo < -96, 'der Laderaum liegt am Heck: Osten gegen Westen: ' + r.r.cargo + ' und ' + r.n.cargo);
      t.ok(r.r.bags.every(x => x > 96) && r.n.bags.every(x => x < -96), 'die Saecke liegen hinter dem Heck: ' + JSON.stringify([r.r.bags, r.n.bags])); t.eq([r.r.crew.length, r.n.crew.length], [r.r.want, r.n.want], 'die ganze Besatzung ist ausgestiegen');
      t.ok(r.r.crew.some(x => x < -40) && r.r.crew.some(x => x > 10) && r.n.crew.some(x => x > 40) && r.n.crew.some(x => x < -10), 'Wachen vorn und hinten, gespiegelt zum Normalfall: ' + JSON.stringify([r.r.crew, r.n.crew]));
    },
  },
  {
    name: 'Gegenrichtung und C4: die Ladung am Laderaum sprengt am Heck (im Osten, im Normalfall im Westen), nicht am Fuehrerhaus',
    async run(t) {
      await setup(t);
      const r = await t.page.evaluate(`(() => { const F = ${FIND}, B = ${BUILD}, RUN = ${RUN}, P = ${PLAIN}, o = {};
        for (const rev of [true, false]) { const sd = F(m => P(m, rev) && m.street === 'std' && m.crew >= 3, 1)[0], { D, me } = B(sd); for (const b of D.bars().filter(x => x.rd && x.g === 1)) { b.lv = 1; b.hp = 100; } RUN(D, me, () => D.tk().st === 'stopped', 120);
          const tk = D.tk(), d = rev ? -1 : 1; me.x = tk.x; me.y = tk.y - 120; me.c4 = 2; const calls = [], orig = D.SND.boom; D.SND.boom = (x, y) => { calls.push([x, y]); }; try { D.get().its.find(i => i.t === 'c4t').act(me); } finally { D.SND.boom = orig; } const br = calls; o[rev ? 'r' : 'n'] = { n: br.length, dx: br.length ? Math.round(br[br.length - 1][0] - tk.x) : null, dy: br.length ? Math.round(br[br.length - 1][1] - tk.y) : null, want: -d * 112 }; }
        return o; })()`);
      for (const k of ['r', 'n']) t.ok(r[k].n >= 1 && Math.abs(r[k].dx - r[k].want) <= 4 && Math.abs(r[k].dy) <= 4, (k === 'r' ? 'Gegenrichtung' : 'Normalfall') + ': die Ladung sprengt am Heck (Knall ' + r[k].dx + ' zu ' + r[k].dy + ', erwartet ' + r[k].want + '): ' + JSON.stringify(r[k]));
    },
  },
  {
    name: 'Gegenrichtung: der Bot spielt sie (Sperre von der Westseite gebaut, Wagen von Osten, Laderaum, Saecke, Fluchtzone im Westen): ohne Polizei mindestens vier von fuenf Siege',
    async run(t) {
      await setup(t);
      await t.loadTool('bot.js');
      const r = await t.page.evaluate(`(() => { const D = __dbg, P = ${PLAIN}; D.setScenario('truck'); D.setSeedMode('random'); D.setLage([]); const S = []; for (let sd = 3000; sd < 3400 && S.length < 5; sd++) if (P(D.genTruckMission(sd), true)) S.push(sd);
        return S.map(sd => { const x = bot.truck({ seed: sd, kit: 'full', sigma: .05, react: .35, police: false }); return { sd, res: x.res, rev: x.mission.rev, m: x.milestones, why: x.stopWhy }; }); })()`);
      t.eq(r.length, 5, 'fuenf Seeds'); t.ok(r.filter(x => x.res === 'WIN').length >= 4, 'mindestens vier von fuenf gewonnen: ' + JSON.stringify(r.map(x => [x.sd, x.res]))); t.eq(r.filter(x => !x.rev).map(x => x.sd), [], 'als Gegenrichtung erkannt');
      t.eq(r.filter(x => x.res === 'WIN').filter(x => !(x.m.sperre > 0 && x.m.stand > x.m.sperre && x.m.offen > 0 && x.m.offen < x.m.voll && x.m.voll < x.m.zone && x.why === 'sperre')).map(x => [x.sd, JSON.stringify(x.m)]), [], 'Sperre, Halt, Laderaum, Taschen, Fluchtzone in dieser Reihenfolge');
    },
  },
  {
    name: 'Gegenrichtung mit Vorhut: der Begleitwagen faehrt von Osten nach Westen in den Zeilen 9 und 10, haelt auf der Ostseite einer fertigen Sperre (ohne Meldung, Spieler dicht hinter ihr im Westen bleiben unbemerkt), meldet unfertige Sperren erst in Sichtweite, zwei Wachen steigen aus',
    async run(t) {
      await setup(t);
      const r = await t.page.evaluate(`(() => { const F = ${FIND}, B = ${BUILD}, RUN = ${RUN}, o = {}, sd = F(m => m.vorhut && m.rev, 1)[0], V = D => D.CFG.truck.var.vorhut;
        { const { D, me } = B(sd); o.start = [D.vh().x > 60 * 32, D.vh().st, D.vh().y]; const bs = D.bars().filter(x => x.rd && x.g === 1); for (const b of bs) { b.lv = 1; b.hp = 100; } const x0 = () => D.vh().x; RUN(D, me, () => D.vh().st === 'drive', 120); const a = x0(); RUN(D, me, () => false, 2); o.fahrt = [a, x0()];
          const t1 = RUN(D, me, () => D.vh().st === 'stopped', 120, [bs[0].x - 24, 10 * 32]); o.halt = [t1 > 0, Math.round(D.vh().x), bs[0].cells[0][0] * 32 + 32 + D.CFG.truck.gap + 64, D.get().phase]; o.meld = D.msgs().feed.some(s => /Vorhut meldet/.test(s)); o.wachen = D.get().en.filter(e => e.vg).map(e => Math.round(e.x - D.vh().x)); }
        { const { D, me } = B(sd); const b = D.bars().find(x => x.rd && x.g === 0); b.lv = 1; b.hp = 100; const xb = b.cells[0][0] * 32 + 32; const t1 = RUN(D, me, () => D.get().phase === 2, 120); o.sicht = [t1 > 0, Math.round(D.vh().x - 64 - xb), V(D).sight]; o.satz = D.msgs().feed.some(s => s === 'Die Vorhut meldet Teile einer Sperre: Alarm!'); }
        { const { D, me } = B(sd); const t1 = RUN(D, me, () => D.get().phase === 2, 120, [24 * 32, 10 * 32]); o.leute = [t1 > 0, Math.round(D.vh().x - 64 - 24 * 32), V(D).sight]; RUN(D, me, () => D.vh().st === 'stopped', 30, [24 * 32, 10 * 32]); o.abstand = Math.round(D.vh().x - 64 - 24 * 32); }
        { const { D, me } = B(sd); const t1 = RUN(D, me, () => D.vh().st === 'gone', 120, [24 * 32, 13 * 32 + 16]); o.gehweg = [t1 > 0, D.get().phase, D.vh().st, D.vh().x < 0]; }
        return o; })()`);
      t.eq(r.start, [true, 'wait', 10 * 32], 'die Vorhut wartet im Osten ausserhalb, in der Spur y = 10 Kacheln'); t.ok(r.fahrt[1] < r.fahrt[0], 'sie faehrt nach Westen: ' + JSON.stringify(r.fahrt));
      t.ok(r.halt[0] && Math.abs(r.halt[1] - r.halt[2]) <= 12 && r.halt[3] === 2, 'sie haelt auf der Ostseite der fertigen Sperre, der Ueberfall beginnt: ' + JSON.stringify(r.halt)); t.eq(r.meld, false, 'keine Meldung (der Spieler hinter der Sperre bleibt unbemerkt)'); t.eq(r.wachen.length, 2, 'zwei Wachen steigen aus'); t.ok(r.wachen.every(x => Math.abs(x) <= 70) && r.wachen[0] < 0 && r.wachen[1] > 0, 'bei dem Wagen, gespiegelt (die erste Wache vorn im Westen, die zweite hinten im Osten): ' + JSON.stringify(r.wachen));
      t.ok(r.sicht[0] && Math.abs(r.sicht[1] - r.sicht[2]) <= 12, 'unfertige Sperre West: Meldung erst in Sichtweite ' + r.sicht[2] + ': ' + JSON.stringify(r.sicht)); t.ok(r.satz, 'der Satz nennt Teile einer Sperre');
      t.ok(r.leute[0] && Math.abs(r.leute[1] - r.leute[2]) <= 12, 'Leute auf der Fahrbahn werden in Sichtweite gemeldet: ' + JSON.stringify(r.leute)); t.ok(Math.abs(r.abstand - 100) <= 12, 'die Vorhut haelt 100 Pixel davor: ' + r.abstand); t.eq(r.gehweg, [true, 1, 'gone', true], 'wer auf dem Gehweg steht, wird nicht gemeldet, die Vorhut faehrt durch und ist am Westende weg');
    },
  },
  {
    name: 'Gegenrichtung bei der Panne: der Spieler startet im Osten, die Besatzung steht gespiegelt (Fahrer vorn im Westen), leise bis zur Fluchtzone im Westen: Lautlos entkommen',
    async run(t) {
      await setup(t);
      const r = await t.page.evaluate(`(() => { const F = ${FIND}, B = ${BUILD}, NEAR = (D, x, y) => { for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [2, 0], [-2, 0]]) { const tx = Math.floor(x / 32) + dx, ty = Math.floor(y / 32) + dy; if (!D.isSol(tx, ty)) return [tx * 32 + 16, ty * 32 + 16]; } return [x, y]; }, o = {}, sd = F(m => m.panne && m.rev && m.crew >= 3, 1)[0], { D, g, me, L, M } = B(sd), keys = D.keys, step = k => { for (let i = 0; i < k; i++) D.update(1 / 30); };
        const crew = g.npcs.filter(q => q.crew), drv = crew.find(q => q.drv), item = tp => D.get().its.find(i => i.t === tp), tk = D.tk(); o.spawn = me.x > 50 * 32; o.face = Math.cos(drv.a); o.crewFace = crew.map(q => Math.cos(q.a) < 0 ? -1 : Math.cos(q.a) > 0 ? 1 : 0).join(','); o.stand = [tk.st, Math.round(tk.x), M.px * 32]; o.drv = Math.round(drv.x - tk.x); o.n = crew.length;
        for (const n of crew) D.koMi(n).act(me); const [kx, ky] = NEAR(D, drv.x, drv.y); me.x = kx; me.y = ky; keys.e = true; step(Math.round(D.CFG.truck.keyTakeT * 30) + 8); keys.e = false; o.key = D.get().keyTaken;
        const ck = item('ckey'); o.ck = Math.round(ck.x - tk.x); const [cx, cy] = NEAR(D, ck.x, ck.y); me.x = cx; me.y = cy; keys.e = true; step(Math.round(D.CFG.truck.keyT * 30) + 10); keys.e = false; o.offen = D.get().cargoOpen;
        for (const b of D.get().its.filter(i => i.t === 'tbag')) if (b.fit(me)) b.act(me); o.beute = me.loot > 0; const ex = D.LANE().exit.cells.find(c => !D.isSol(c[0], c[1])); o.zone = ex[0]; me.x = ex[0] * 32 + 16; me.y = ex[1] * 32 + 16; step(8);
        o.ende = D.get().ended ? [D.get().ended.win, D.get().ended.title] : null; return o; })()`);
      t.ok(r.spawn, 'der Spieler startet im Osten'); t.ok(r.face < -.9, 'der Fahrer blickt nach Westen (vom Wagen weg): ' + r.face.toFixed(2)); t.eq(r.stand, ['stopped', r.stand[2], r.stand[2]], 'der Wagen steht auf Kachel px'); t.ok(r.drv < -30, 'der Fahrer steht vorn im Westen: ' + r.drv); t.ok(r.ck > 96, 'der Laderaum liegt am Heck im Osten: ' + r.ck);
      t.eq([r.key, r.offen, r.beute], [true, true, true], 'Schluessel, Laderaum, Saecke'); t.ok(r.zone >= 1 && r.zone <= 4, 'die Fluchtzone liegt im Westen: ' + r.zone); t.eq(r.ende, [true, 'Lautlos entkommen'], 'in der Fluchtzone endet es als Lautlos entkommen');
    },
  },
  {
    name: 'Gegenrichtung im Coop: der Client baut dieselbe Karte (Fluchtzone, Tag), sieht den Wagen von Osten kommen und nach dem Halt am selben Ort, den Laderaum am Heck im Osten',
    async run(t) {
      await setup(t);
      const r = await t.page.evaluate(`(() => { const F = ${FIND}, P = ${PLAIN}, sd = F(m => P(m, true) && m.street === 'std', 1)[0], G = CT.mkGame('truck', sd, 2), A = G.A, B = G.clients[0], o = {}; A.CFG.truck.policeAt = 1e6; const b = A.bars().find(x => x.rd && x.g === 1), bb = B.bars().find(x => x.rd && x.g === 1); for (const q of A.bars().filter(x => x.rd && x.g === 1)) { q.lv = 1; q.hp = 100 } for (const q of B.bars().filter(x => x.rd && x.g === 1)) { q.lv = 1; q.hp = 100 }
        const sig = d => [d.LAY().exit.dir, d.LAY().exit.tx, d.LAY().mission.rev ? 1 : 0, d.LAY().mission.tags.join(';')].join('|'); o.gleich = sig(A) === sig(B); o.sig = sig(A);
        for (let i = 0; i < 200; i++) { A.get().me.hp = 1e9; G.run(.5); if (A.tk().st === 'drive') break; } G.run(1); const a0 = [A.tk().x, B.tk().x]; G.run(1); o.fahrt = [A.tk().st, B.tk().st, a0[0] > A.tk().x, a0[1] > B.tk().x];
        for (let i = 0; i < 200; i++) { A.get().me.hp = 1e9; G.run(.5); if (A.tk().st === 'stopped') break; } G.run(1); o.halt = [A.tk().st, B.tk().st, Math.round(A.tk().x), Math.round(B.tk().x)]; const ck = B.get().its.find(i => i.t === 'cargo'); o.heck = Math.round(ck.x - B.tk().x); return o; })()`);
      t.ok(r.gleich && r.sig.startsWith('-1|4|1|'), 'gleiche Karte auf Host und Client: ' + r.sig); t.eq(r.fahrt, ['drive', 'drive', true, true], 'beide sehen den Wagen nach Westen fahren');
      t.eq([r.halt[0], r.halt[1]], ['stopped', 'stopped'], 'beide sehen ihn stehen'); t.ok(Math.abs(r.halt[2] - r.halt[3]) <= 12, 'am selben Ort: ' + JSON.stringify(r.halt)); t.ok(r.heck > 96, 'der Laderaum liegt beim Client am Heck im Osten: ' + r.heck);
    },
  },
  {
    name: 'Gegenrichtung: der Wagen wird gespiegelt gezeichnet (Fuehrerhaus links), im Normalfall nicht; der Schatten bleibt auf einer Seite',
    async run(t) {
      await setup(t);
      const r = await t.page.evaluate(`(() => { const F = ${FIND}, B = ${BUILD}, RUN = ${RUN}, P = ${PLAIN}, o = {}, orig = CanvasRenderingContext2D.prototype.drawImage;
        const probe = rev => { const sd = F(m => P(m, rev) && m.street === 'std', 1)[0], { D, me } = B(sd); RUN(D, me, () => D.tk().st === 'drive', 120); RUN(D, me, () => false, 1); const seen = [];
          CanvasRenderingContext2D.prototype.drawImage = function (img, sx, sy, sw, sh) { if (arguments.length === 9 && sy === 4 * 128 && sw === 256) seen.push(this.getTransform().a); return orig.apply(this, arguments); };
          try { D.draw(); } finally { CanvasRenderingContext2D.prototype.drawImage = orig; } return seen; };
        o.r = probe(true); o.n = probe(false);
        const vprobe = rev => { const sd = F(m => m.vorhut && !!m.rev === rev, 1)[0], { D, me } = B(sd); RUN(D, me, () => D.vh().st === 'drive', 120); RUN(D, me, () => false, 1); const seen = [];
          CanvasRenderingContext2D.prototype.drawImage = function (img, sx, sy, sw, sh) { if (arguments.length === 9 && sy === 3 * 128 && sw === 256) seen.push(this.getTransform().a); return orig.apply(this, arguments); };
          try { D.draw(); } finally { CanvasRenderingContext2D.prototype.drawImage = orig; } return seen; };
        o.vr = vprobe(true); o.vn = vprobe(false); return o; })()`);
      t.ok(r.r.length >= 1 && r.n.length >= 1, 'Aufbau: der Wagen wird gezeichnet: ' + JSON.stringify([r.r, r.n])); t.ok(r.n.every(a => a > 0), 'Normalfall: nicht gespiegelt'); t.ok(r.r.every(a => a < 0), 'Gegenrichtung: gespiegelt'); t.ok(r.vr.length >= 1 && r.vn.length >= 1 && r.vn.every(a => a > 0) && r.vr.every(a => a < 0), 'der Begleitwagen ebenso (Normalfall nicht, Gegenrichtung gespiegelt): ' + JSON.stringify([r.vr, r.vn]));
    },
  },
];
