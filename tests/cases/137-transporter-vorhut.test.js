// Transporter-Vorhut (E2 der Transporter-Abwechslung, Schritt B der Transporter-Planung, 28. Oktober 2026): In etwa jedem dritten normalen Auftrag faehrt ein Vorausfahrzeug der Sicherheitsfirma CFG.truck.var.vorhut.lead (12) s vor dem Panzerwagen
// in der oberen Fahrspur (Zeilen 9 und 10) die Strasse entlang, mit zwei Wachen. Es haelt vor einer fertigen Sperre (dann beginnt der Ueberfall, die Wachen steigen aus, der Panzerwagen kommt zwoelf Sekunden spaeter dazu) und es meldet,
// was es sieht: Teile einer Sperre, die noch nicht fertig ist, oder Spieler auf der Fahrbahn vor ihm (Sichtweite CFG.truck.var.vorhut.sight). Eine Meldung ist ein erzwungener Alarm (Polizeiuhr), die Vorhut haelt dort und die Wachen steigen aus.
// Sieht es nichts, faehrt es durch und ist weg. Nicht bei der Panne und nicht bei der Baustelle (dort sind die oberen Zeilen zu).
async function setup(t) {
  await t.loadTool('loopnet.js');
  await t.loadInpage('coop.js');
}
const FIND = `(pred, n) => { const D = __dbg, out = []; D.setScenario('truck'); D.setSeedMode('random'); D.setLage([]); for (let sd = 1; sd < 800 && out.length < n; sd++) { const m = D.genTruckMission(sd); if (pred(m)) out.push(sd); } return out; }`;
const BUILD = `(sd) => { const D = __dbg; D.sessReset(); D.setScenario('truck'); D.setSeedMode('random'); D.setLage([]); D.setTurn('S'); D.buildSeed(sd); D.CFG.policeAt = 26; D.CFG.policeForced = 20; const g = D.get(); return { D, g, me: g.me, L: D.LAY(), M: D.LAY().mission }; }`;
// Simulation bis f(D) wahr ist oder sec Sekunden um sind; der Spieler ist unverwundbar und bleibt auf seinem Platz
const RUN = `(D, me, f, sec, hold) => { for (let i = 0; i < sec * 30; i++) { me.hp = 1e9; if (hold) { me.x = hold[0]; me.y = hold[1]; } D.update(1 / 30); if (D.get().ended || f()) return i / 30; } return -1; }`;

module.exports = [
  {
    name: 'Vorhut: etwa jeder dritte Auftrag ohne Panne und ohne Baustelle (22 bis 38 %), nie zusammen mit beiden, Tag Vorhut genau bei diesen; die Wuerfel der Panne bleiben (Golden)',
    async run(t) {
      await setup(t);
      const r = await t.page.evaluate(`(() => { const D = __dbg, o = { el: 0, v: 0, bad: [], tag: [] }, pa = []; D.setScenario('truck'); D.setSeedMode('random'); D.setLage([]); for (let sd = 1; sd <= 800; sd++) { const m = D.genTruckMission(sd), el = !m.panne && m.street !== 'baustelle'; if (el) o.el++; if (m.vorhut) { o.v++; if (!el) o.bad.push(sd); } if (!!m.vorhut !== m.tags.includes('Vorhut')) o.tag.push(sd); if (sd <= 60) pa.push(sd + ':' + (m.panne ? 1 : 0) + ',' + m.px); } o.pa = pa; return o; })()`);
      t.ok(r.v / r.el >= .22 && r.v / r.el <= .38, 'Anteil der Vorhut unter den moeglichen Auftraegen: ' + r.v + ' von ' + r.el); t.eq(r.bad, [], 'nie bei Panne oder Baustelle'); t.eq(r.tag, [], 'Tag Vorhut genau bei diesen');
      await t.snapshot('panne', r.pa);
    },
  },
  {
    name: 'Vorhut ruhig: wer nichts baut und nicht auf der Fahrbahn steht, wird nicht gemeldet; die Vorhut faehrt lead Sekunden vor dem Wagen los, durch und ist am Ostende weg, ohne Alarm, im Netz sichtbar (Zustand, Ort)',
    async run(t) {
      await setup(t);
      const r = await t.page.evaluate(`(() => { const F = ${FIND}, B = ${BUILD}, RUN = ${RUN}, o = {}, sd = F(m => m.vorhut, 1)[0], { D, g, me, M } = B(sd), arr = Math.min(M.arrive, 99); o.vor = D.vh().st; o.lead = D.CFG.truck.var.vorhut.lead; o.y = D.vh().y;
        const t0 = RUN(D, me, () => D.vh().st === 'drive', 120); o.start = [t0, M.arrive]; const t1 = RUN(D, me, () => D.vh().st === 'gone', 60); o.durch = [t1, D.get().phase, D.vh().x > 1900, !!D.get().ended]; o.dauer = t1; o.msg = D.msgs().feed.some(s => /Vorhut meldet/.test(s)); return o; })()`);
      t.eq(r.vor, 'wait', 'zu Beginn wartet sie'); t.eq(r.y, 10 * 32, 'sie faehrt in den Zeilen 9 und 10'); t.ok(Math.abs(r.start[0] - (r.start[1] - r.lead)) <= 1.2, 'sie faehrt lead Sekunden vor der Ankunft des Wagens los: ' + JSON.stringify(r.start));
      t.ok(r.durch[0] > 0 && r.durch[1] === 1 && r.durch[2] && !r.durch[3], 'sie faehrt durch (Phase 1, kein Ende) und ist am Ostende weg: ' + JSON.stringify(r.durch)); t.ok(!r.msg, 'keine Meldung'); t.ok(r.dauer > 12 && r.dauer < 18, 'die Durchfahrt dauert 12 bis 18 s (Tempo des Wagens, 60 Kacheln und zwei Wagenlaengen): ' + r.dauer.toFixed(1));
    },
  },
  {
    name: 'Vorhut meldet Teile einer Sperre: ist ein Teilstueck gebaut, eine Sperre aber nicht fertig, wenn sie hinkommt, gibt es erzwungenen Alarm, sie haelt dort, zwei Wachen steigen aus (Kampftrupp, Posten), die Polizeiuhr laeuft',
    async run(t) {
      await setup(t);
      const r = await t.page.evaluate(`(() => { const F = ${FIND}, B = ${BUILD}, RUN = ${RUN}, o = {}, sd = F(m => m.vorhut, 1)[0], { D, g, me } = B(sd), b = D.bars().find(x => x.rd && x.g === 1); b.lv = 1; b.hp = 100; const vh = D.vh();
        const t1 = RUN(D, me, () => D.get().phase === 2, 120); o.alarm = [t1 > 0, D.get().phase, D.vh().st === 'stopped' || D.vh().st === 'drive']; RUN(D, me, () => D.vh().st === 'stopped', 20);
        o.halt = [D.vh().st, Math.round(D.vh().x), b.x]; o.dist = b.x - (D.vh().x + 64); o.sight = D.CFG.truck.var.vorhut.sight; o.msg = D.msgs().feed.some(s => s === 'Die Vorhut meldet Teile einer Sperre: Alarm!'); o.guards = D.get().en.filter(e => e.vg).length; o.post = D.get().en.filter(e => e.vg).every(e => e.mode === 'post' && e.kind === 'grd');
        o.pol = D.get().policeAt; o.cargo = D.get().its.find(i => i.t === 'cargo').ok(me); return o; })()`);
      t.eq([r.alarm[0], r.alarm[1]], [true, 2], 'Alarm, sobald sie das Teilstueck sieht'); t.eq(r.halt[0], 'stopped', 'sie haelt'); t.ok(r.dist > 0 && r.dist <= r.sight + 10, 'sie haelt vor dem Teilstueck, hoechstens in Sichtweite: ' + r.dist); t.ok(r.msg, 'die Meldung nennt die Vorhut und die Teile einer Sperre');
      t.eq([r.guards, r.post], [2, true], 'zwei Wachen steigen aus und halten ihren Posten'); t.ok(r.pol > 0, 'die Polizeiuhr laeuft: ' + r.pol); t.eq(r.cargo, false, 'der Panzerwagen ist noch nicht da');
    },
  },
  {
    name: 'Vorhut an der fertigen Sperre: sie haelt davor (ueberfall wie beim Halt des Wagens, ohne erzwungenen Alarm), zwei Wachen steigen aus, zwoelf Sekunden spaeter haelt der Panzerwagen in der unteren Spur an derselben Sperre und seine Besatzung kommt dazu',
    async run(t) {
      await setup(t);
      const r = await t.page.evaluate(`(() => { const F = ${FIND}, B = ${BUILD}, RUN = ${RUN}, o = {}, sd = F(m => m.vorhut && m.crew === 3, 1)[0], { D, g, me, M } = B(sd), bs = D.bars().filter(x => x.rd && x.g === 0); for (const b of bs) { b.lv = 1; b.hp = 100; }
        const t1 = RUN(D, me, () => D.vh().st === 'stopped', 120, [bs[0].x + 24, 10 * 32]); o.t1 = t1 > 0; o.ph = D.get().phase; o.x = [Math.round(D.vh().x), bs[0].cells[0][0] * 32 - D.CFG.truck.gap - 64]; o.g1 = D.get().en.filter(e => e.vg).length; o.crew1 = D.get().en.filter(e => e.crew).length; o.meld = D.msgs().feed.some(s => /Vorhut meldet/.test(s)); o.bremst = D.msgs().feed.some(s => s === 'Der Begleitwagen bremst vor der Sperre!'); o.stamp = [D.vh().cells.length, D.world().cell(D.vh().cells[0][0], D.vh().cells[0][1]), D.vh().cells.every(c => c[1] === 9 || c[1] === 10)];
        const t2 = RUN(D, me, () => D.tk().st === 'stopped', 60); o.t2 = [t2 > 0, Math.round(t2 + t1 + 0)]; o.tk = [D.tk().st, Math.round(D.tk().x), bs[0].cells[0][0] * 32 - D.CFG.truck.gap - 96]; o.crew2 = D.get().en.filter(e => e.crew && !e.vg).length; o.want = M.crew; o.gap = Math.round(D.rT() - 0); o.lead = D.CFG.truck.var.vorhut.lead; return o; })()`);
      t.ok(r.t1, 'sie haelt'); t.eq(r.ph, 2, 'der Ueberfall beginnt'); t.ok(Math.abs(r.x[0] - r.x[1]) <= 12, 'sie haelt vor der Sperre: ' + JSON.stringify(r.x)); t.eq([r.g1, r.crew1], [2, 2], 'zwei Wachen der Vorhut, sonst noch keine Besatzung');
      t.ok(!r.meld, 'bei einer fertigen Sperre meldet sie nichts, auch wenn ein Spieler hinter ihr auf der Fahrbahn steht'); t.ok(r.bremst, 'sie bremst vor der Sperre'); t.ok(r.stamp[0] >= 6 && r.stamp[1] === 'v' && r.stamp[2], 'der haltende Begleitwagen steht als Auto im Raster, nur in den Zeilen 9 und 10: ' + JSON.stringify(r.stamp));
      t.ok(r.t2[0], 'der Panzerwagen haelt auch'); t.ok(Math.abs(r.tk[1] - r.tk[2]) <= 12, 'er haelt vor derselben Sperre: ' + JSON.stringify(r.tk)); t.eq(r.crew2, r.want, 'seine Besatzung kommt dazu (' + r.want + ')');
    },
  },
  {
    name: 'Vorhut sieht Spieler auf der Fahrbahn: wer in den Zeilen 9 bis 12 vor ihr steht, wird gemeldet (Alarm, genauer Satz) sobald er in Sichtweite ist, sie haelt 100 Pixel davor; wer auf den Gehwegen (Zeilen 8 und 13) bleibt, wird nicht gemeldet',
    async run(t) {
      await setup(t);
      const r = await t.page.evaluate(`(() => { const F = ${FIND}, B = ${BUILD}, RUN = ${RUN}, o = {}, sd = F(m => m.vorhut, 1)[0];
        for (const [k, y] of [['nord', 8 * 32 + 16], ['sued', 13 * 32 + 16]]) { const { D, g, me } = B(sd); const t1 = RUN(D, me, () => D.vh().st === 'gone', 120, [24 * 32, y]); o[k] = [t1 > 0, D.get().phase]; }
        { const { D, g, me } = B(sd); const t1 = RUN(D, me, () => D.get().phase === 2, 120, [24 * 32, 10 * 32]); o.sicht = [t1 > 0, Math.round(24 * 32 - (D.vh().x + 64)), D.CFG.truck.var.vorhut.sight]; o.satz = D.msgs().feed.some(s => s === 'Die Vorhut meldet Leute auf der Fahrbahn: Alarm!'); o.keinTeil = D.msgs().feed.some(s => /Teile einer Sperre/.test(s));
          RUN(D, me, () => D.vh().st === 'stopped', 30, [24 * 32, 10 * 32]); o.halt = [D.vh().st, Math.round(24 * 32 - (D.vh().x + 64))]; o.wachen = D.get().en.filter(e => e.vg).length; }
        { const { D, g, me } = B(sd); const t1 = RUN(D, me, () => D.get().phase === 2, 120, [24 * 32, 12 * 32 + 8]); o.sued12 = [t1 > 0, D.get().phase]; }
        return o; })()`);
      t.eq(r.nord, [true, 1], 'auf dem Gehweg im Norden (Zeile 8) wird niemand gemeldet, die Vorhut faehrt durch'); t.eq(r.sued, [true, 1], 'auf dem Gehweg im Sueden (Zeile 13) auch nicht');
      t.ok(r.sicht[0] && Math.abs(r.sicht[1] - r.sicht[2]) <= 12, 'die Meldung kommt, sobald der Spieler in Sichtweite ' + r.sicht[2] + ' ist: ' + JSON.stringify(r.sicht)); t.ok(r.satz && !r.keinTeil, 'der Satz nennt Leute auf der Fahrbahn');
      t.eq(r.halt[0], 'stopped', 'sie haelt'); t.ok(Math.abs(r.halt[1] - 100) <= 12, 'sie haelt 100 Pixel vor dem Spieler: ' + r.halt[1]); t.eq(r.wachen, 2, 'zwei Wachen steigen aus'); t.eq(r.sued12, [true, 2], 'auch die unterste Fahrspur (Zeile 12) zaehlt als Fahrbahn');
    },
  },
  {
    name: 'Vorhut Sichtweite bei Sperren: ein Teilstueck der Sperre Ost wird erst gemeldet, wenn es in Sichtweite kommt (nicht frueher), die Vorhut haelt vor der Sperre',
    async run(t) {
      await setup(t);
      const r = await t.page.evaluate(`(() => { const F = ${FIND}, B = ${BUILD}, RUN = ${RUN}, o = {}, sd = F(m => m.vorhut, 1)[0], { D, g, me } = B(sd), b = D.bars().find(x => x.rd && x.g === 2); b.lv = 1; b.hp = 100; const xb = b.cells[0][0] * 32;
        const t1 = RUN(D, me, () => D.get().phase === 2, 120); o.alarm = [t1 > 0, Math.round(xb - (D.vh().x + 64)), D.CFG.truck.var.vorhut.sight]; RUN(D, me, () => D.vh().st === 'stopped', 30); o.halt = Math.round(xb - (D.vh().x + 64)); o.gap = D.CFG.truck.gap; return o; })()`);
      t.ok(r.alarm[0] && Math.abs(r.alarm[1] - r.alarm[2]) <= 12, 'Alarm erst in Sichtweite (' + r.alarm[2] + ' Pixel vor der Sperre): ' + JSON.stringify(r.alarm)); t.ok(Math.abs(r.halt - r.gap) <= 12, 'sie haelt in Abstand gap (' + r.gap + ') vor der Sperre: ' + r.halt);
    },
  },
  {
    name: 'Vorhut: Wachen sind nie schwer und nie der Fahrer (Besatzung 2 mit schwerer Wache), mit Leben und Schaden der Besatzung; der Funk gestoert verschiebt die Polizei bei der Meldung um jamDelay',
    async run(t) {
      await setup(t);
      const r = await t.page.evaluate(`(() => { const F = ${FIND}, B = ${BUILD}, RUN = ${RUN}, o = {}, sd = F(m => m.vorhut && m.crew === 2 && m.heavy > 0, 1)[0];
        const run = jam => { const { D, g, me } = B(sd); const b = D.bars().find(x => x.rd && x.g === 1); b.lv = 1; b.hp = 100; RUN(D, me, () => D.vh().st === 'drive', 120); if (jam) { me.jam = 1; document.getElementById('c').dispatchEvent(new KeyboardEvent('keydown', { key: '1', bubbles: true })); for (let i = 0; i < 3; i++) D.update(1 / 30); }
          const t1 = RUN(D, me, () => D.get().phase === 2, 120); RUN(D, me, () => D.vh().st === 'stopped', 30); const C = D.CFG.truck.crew; return { D, pol: D.get().policeAt, vg: D.get().en.filter(e => e.vg).map(e => [e.hv | 0, e.drv ? 1 : 0, e.hp, e.mhp, e.dmg]), C }; };
        const a = run(false), j = run(true); o.vg = a.vg; o.C = [a.C.hp, a.C.dmg]; o.base = a.pol; o.jam = j.pol; o.delay = a.D.CFG.truck.jamDelay; o.heavy = sd; return o; })()`);
      t.eq(r.vg.length, 2, 'zwei Wachen'); t.ok(r.vg.every(v => v[0] === 0 && v[1] === 0 && v[2] === r.C[0] && v[3] === r.C[0] && v[4] === r.C[1]), 'nicht schwer, nicht Fahrer, Leben und Schaden der Besatzung: ' + JSON.stringify(r.vg));
      t.eq(r.jam - r.base, r.delay, 'die Polizei kommt um die Stoerzeit spaeter (' + r.base + ' gegen ' + r.jam + ')');
    },
  },
  {
    name: 'Vorhut und Polizeiuhr: an einer fertigen Sperre zaehlt die Uhr vom Halt des Panzerwagens (die Vorhut gibt lead Sekunden dazu), bei einer Meldung (Teilstueck, Leute auf der Fahrbahn) laeuft sie ab der Meldung',
    async run(t) {
      await setup(t);
      const r = await t.page.evaluate(`(() => { const F = ${FIND}, B = ${BUILD}, RUN = ${RUN}, o = {}, sd = F(m => m.vorhut, 1)[0];
        const run = (n, hold) => { const { D, g, me } = B(sd); D.CFG.truck.policeAt = 40; const bs = D.bars().filter(x => x.rd && x.g === 1); bs.slice(0, n).forEach(b => { b.lv = 1; b.hp = 100; }); RUN(D, me, () => D.get().phase === 2, 120, hold); return [D.get().policeAt, D.LAY().mission.al | 0]; };
        o.voll = run(4); o.teil = run(1); o.leute = run(0, [24 * 32, 10 * 32]); o.lead = __dbg.CFG.truck.var.vorhut.lead; o.pa = 40; return o; })()`);
      t.eq(r.teil[0], Math.max(20, r.pa + r.teil[1]), 'Meldung eines Teilstuecks: die Uhr laeuft ab dem Alarm (' + r.pa + ' plus Funkvariante ' + r.teil[1] + ')'); t.eq(r.leute[0], r.teil[0], 'Meldung von Leuten auf der Fahrbahn: ebenso'); t.eq(r.voll[0] - r.teil[0], r.lead, 'fertige Sperre: lead Sekunden mehr (' + r.voll[0] + ' gegen ' + r.teil[0] + ')');
    },
  },
  {
    name: 'Vorhut vorbei, Sperre danach fertig: der Panzerwagen haelt am Ende normal (Ueberfall erst jetzt, keine Wachen der Vorhut), die Vorhut ist weg ohne Meldung',
    async run(t) {
      await setup(t);
      const r = await t.page.evaluate(`(() => { const F = ${FIND}, B = ${BUILD}, RUN = ${RUN}, o = {}, sd = F(m => m.vorhut, 1)[0], { D, g, me } = B(sd), bs = D.bars().filter(x => x.rd && x.g === 1);
        const t1 = RUN(D, me, () => D.vh().x > bs[0].x + 200, 120); o.vorbei = [t1 > 0, D.get().phase, D.vh().st]; for (const b of bs) { b.lv = 1; b.hp = 100; }
        const t2 = RUN(D, me, () => D.vh().st === 'gone', 60); o.weg = [t2 > 0, D.get().phase]; const t3 = RUN(D, me, () => D.tk().st === 'stopped', 60); o.wagen = [t3 > 0, D.get().phase, Math.round(D.tk().x), bs[0].cells[0][0] * 32 - D.CFG.truck.gap - 96]; o.vg = D.get().en.filter(e => e.vg).length; o.crew = D.get().en.filter(e => e.crew).length; o.want = D.LAY().mission.crew; o.meld = D.msgs().feed.some(s => /Vorhut meldet/.test(s)); return o; })()`);
      t.eq([r.vorbei[0], r.vorbei[1]], [true, 1], 'Aufbau: die Vorhut ist vorbei, noch Erkundung'); t.eq(r.weg, [true, 1], 'sie faehrt durch und ist weg, ohne Ueberfall');
      t.ok(r.wagen[0] && r.wagen[1] === 2 && Math.abs(r.wagen[2] - r.wagen[3]) <= 12, 'der Wagen haelt an der Sperre und der Ueberfall beginnt: ' + JSON.stringify(r.wagen)); t.eq([r.vg, r.crew, r.meld], [0, r.want, false], 'keine Wachen der Vorhut, die Besatzung steigt aus, keine Meldung');
    },
  },
  {
    name: 'Vorhut Anzeige: die Zeile VORHUT steht im Hud der Vorbereitung (in m:ss, unterwegs, vorbei) und fehlt bei Auftraegen ohne Vorhut; sobald sie haelt, beginnt der Ueberfall',
    async run(t) {
      await setup(t);
      const r = await t.page.evaluate(`(() => { const F = ${FIND}, B = ${BUILD}, RUN = ${RUN}, o = {}, sd = F(m => m.vorhut, 1)[0], sn = F(m => !m.vorhut && !m.panne && m.street === 'std', 1)[0], calls = [], orig = CanvasRenderingContext2D.prototype.fillText;
        CanvasRenderingContext2D.prototype.fillText = function (tx) { calls.push(String(tx)); return orig.apply(this, arguments); };
        const texts = D => { calls.length = 0; D.draw(); D.draw(); return calls.slice(); }, zeile = a => { const i = a.indexOf('VORHUT'); return i < 0 ? null : a[i + 1]; };
        try { { const { D, g, me } = B(sd); me.hp = 1e9; D.update(1 / 30); o.warten = zeile(texts(D)); RUN(D, me, () => D.vh().st === 'drive', 120); D.update(1 / 30); o.fahrt = zeile(texts(D)); RUN(D, me, () => D.vh().st === 'gone', 60); o.vorbei = zeile(texts(D)); }
          { const { D, g, me } = B(sn); D.update(1 / 30); o.ohne = zeile(texts(D)); } } finally { CanvasRenderingContext2D.prototype.fillText = orig; }
        return o; })()`);
      t.ok(/^in \d+:\d\d$/.test(r.warten), 'vor der Abfahrt steht die Zeit: ' + r.warten); t.eq(r.fahrt, 'unterwegs', 'in der Fahrt unterwegs'); t.eq(r.vorbei, 'vorbei', 'nach der Durchfahrt vorbei'); t.eq(r.ohne, null, 'ohne Vorhut keine Zeile');
    },
  },
  {
    name: 'Vorhut und Barrikaden: waehrend der Begleitwagen vor einer Sperrstelle der oberen Spuren faehrt, laesst sich dort nichts bauen (Modus 3), in den unteren Zeilen und aus der Ferne schon',
    async run(t) {
      await setup(t);
      const r = await t.page.evaluate(`(() => { const F = ${FIND}, B = ${BUILD}, o = {}, sd = F(m => m.vorhut, 1)[0], { D, g, me } = B(sd), bs = D.bars().filter(x => x.rd && x.g === 1), up = bs.find(b => b.cells[0][1] === 9), lo = bs.find(b => b.cells[0][1] === 12), v = D.vh(), item = b => D.get().its.find(i => i.t === 'bar' && i.b === b); me.mat = 9; v.st = 'drive';
        v.x = up.x - 100; o.nah = [item(up).mode(me), item(lo).mode(me)]; v.x = up.x - 900; o.fern = item(up).mode(me); v.x = up.x - 100; v.st = 'wait'; o.wartet = item(up).mode(me); return o; })()`);
      t.eq(r.nah, [3, 1], 'neben dem fahrenden Wagen ist die obere Stelle blockiert (3), die untere frei (1)'); t.eq(r.fern, 1, 'aus der Ferne frei'); t.eq(r.wartet, 1, 'solange er wartet, frei');
    },
  },
  {
    name: 'Vorhut bei laufendem Ueberfall: zieht ein Spieler vorher die Waffe, meldet die Vorhut nichts mehr (kein Satz, kein zweiter Alarm), haelt aber vor dem Teilstueck, die Wachen steigen aus',
    async run(t) {
      await setup(t);
      const r = await t.page.evaluate(`(() => { const F = ${FIND}, B = ${BUILD}, RUN = ${RUN}, o = {}, sd = F(m => m.vorhut, 1)[0], { D, g, me } = B(sd), b = D.bars().find(x => x.rd && x.g === 1); b.lv = 1; b.hp = 100; D.CFG.truck.policeAt = 1e6; D.startHeist(false, me); const pol = D.get().policeAt;
        RUN(D, me, () => D.vh().st === 'stopped', 120); o.halt = D.vh().st; o.meld = D.msgs().feed.some(s => /Vorhut meldet/.test(s)); o.wachen = D.get().en.filter(e => e.vg).length; o.pol = [pol, D.get().policeAt, Math.round(D.get().tH)]; return o; })()`);
      t.eq(r.halt, 'stopped', 'sie haelt'); t.eq(r.meld, false, 'keine Meldung bei laufendem Ueberfall'); t.eq(r.wachen, 2, 'zwei Wachen steigen aus'); t.eq(r.pol[1], r.pol[0], 'die Polizeiuhr wird nicht neu gestellt');
    },
  },
  {
    name: 'Vorhut haelt: wer in der Fahrspur steht, wenn der Begleitwagen ihn erreicht (an der Seite hereingelaufen, hinter der Nase), wird nach Norden aus dem Wagen geschoben; nach einer neuen Runde auf derselben Karte sind die Kacheln des Wagens wieder Strasse',
    async run(t) {
      await setup(t);
      const r = await t.page.evaluate(`(() => { const F = ${FIND}, B = ${BUILD}, RUN = ${RUN}, o = {}, sd = F(m => m.vorhut, 1)[0], { D, g, me } = B(sd), bs = D.bars().filter(x => x.rd && x.g === 0); for (const b of bs) { b.lv = 1; b.hp = 100; }
        const v = D.vh(); RUN(D, me, () => v.x > 400, 120); let t1 = -1; for (let i = 0; i < 30 * 30; i++) { me.hp = 1e9; me.x = v.x - 20; me.y = v.y + 4; D.update(1 / 30); if (v.st === 'stopped') { t1 = i; break; } } o.halt = t1 > 0; o.raus = [Math.round(me.y), 9 * 32 - 14]; const cs = D.vh().cells.slice(); o.zellen = cs.length;
        o.stehen = cs.every(c => D.world().cell(c[0], c[1]) === 'v'); D.reset(); o.danach = cs.map(c => D.world().cell(c[0], c[1])).join(''); return o; })()`);
      t.ok(r.halt, 'sie haelt'); t.ok(Math.abs(r.raus[0] - r.raus[1]) <= 2, 'der Spieler steht nicht im Wagen, sondern nach Norden ausserhalb: ' + JSON.stringify(r.raus)); t.ok(r.zellen >= 6 && r.stehen, 'Aufbau: der Wagen steht als Auto im Raster'); t.ok(/^o+$/.test(r.danach), 'nach dem Neuaufbau sind die Kacheln wieder Strasse: ' + r.danach);
    },
  },
  {
    name: 'Stoerzeit bei fertiger Sperre: der Funk gestoert verschiebt die Polizei bei Halt der Vorhut an einer fertigen Sperre um jamDelay, und beim normalen Zugriff ohne Vorhut (der Wagen haelt als Erster) ebenso',
    async run(t) {
      await setup(t);
      const r = await t.page.evaluate(`(() => { const F = ${FIND}, B = ${BUILD}, RUN = ${RUN}, o = {}, sv = F(m => m.vorhut, 1)[0], sn = F(m => !m.vorhut && !m.panne && m.street === 'std', 1)[0];
        const a = (sd, jam) => { const { D, g, me } = B(sd); for (const b of D.bars().filter(x => x.rd && x.g === 1)) { b.lv = 1; b.hp = 100; } const stopAt = sd === sv ? (() => D.vh().st === 'drive') : (() => D.tk().st === 'drive'); RUN(D, me, stopAt, 120); if (jam) { me.jam = 1; document.getElementById('c').dispatchEvent(new KeyboardEvent('keydown', { key: '1', bubbles: true })); for (let i = 0; i < 3; i++) D.update(1 / 30); } RUN(D, me, () => D.get().phase === 2, 120); return [D.get().policeAt, D.CFG.truck.jamDelay]; };
        const nach = jam => { const { D, g, me } = B(sv); for (const b of D.bars().filter(x => x.rd && x.g === 1)) { b.lv = 1; b.hp = 100; } RUN(D, me, () => D.vh().st === 'stopped', 120); RUN(D, me, () => false, 6); if (jam) { me.jam = 1; document.getElementById('c').dispatchEvent(new KeyboardEvent('keydown', { key: '1', bubbles: true })); for (let i = 0; i < 3; i++) D.update(1 / 30); } return [D.get().policeAt, D.tk().st]; };
        const spaet = jam => { const { D, g, me } = B(sv); for (const b of D.bars().filter(x => x.rd && x.g === 1)) { b.lv = 1; b.hp = 100; } RUN(D, me, () => D.vh().st === 'stopped', 120); const M = D.LAY().mission, arr = M.arrive; M.arrive = 1e6; RUN(D, me, () => false, D.CFG.truck.jamWin + 2); M.arrive = arr; if (jam) { me.jam = 1; document.getElementById('c').dispatchEvent(new KeyboardEvent('keydown', { key: '1', bubbles: true })); for (let i = 0; i < 3; i++) D.update(1 / 30); } return [D.get().policeAt, D.tk().st, Math.round(D.get().tH)]; };
        o.s0 = spaet(false); o.s1 = spaet(true);
        o.v0 = a(sv, false); o.v1 = a(sv, true); o.n0 = a(sn, false); o.n1 = a(sn, true); o.h0 = nach(false); o.h1 = nach(true); return o; })()`);
      t.eq(r.v1[0] - r.v0[0], r.v0[1], 'mit Vorhut: die Polizei kommt um jamDelay spaeter (' + r.v0[0] + ' gegen ' + r.v1[0] + ')'); t.eq(r.n1[0] - r.n0[0], r.n0[1], 'ohne Vorhut: ebenso (' + r.n0[0] + ' gegen ' + r.n1[0] + ')');
      t.ok(r.s0[0] > 0 && r.s0[1] === 'wait', 'Aufbau: die Vorhut hat gehalten, der Wagen ist noch nicht da (' + r.s0[0] + ', ' + r.s0[1] + ')'); t.eq(r.s1[0], r.s0[0], 'nach dem Fenster jamWin (Wagen noch nicht da, ' + r.s1[2] + ' s nach dem Halt der Vorhut) ist es zu spaet, die Uhr bleibt: ' + r.s0[0] + ' gegen ' + r.s1[0]);
      t.ok(r.h0[1] !== 'stopped', 'Aufbau: der Panzerwagen steht noch nicht (' + r.h0[1] + ')'); t.eq(r.h1[0] - r.h0[0], r.v0[1], 'nach dem Halt der Vorhut (Wagen noch unterwegs) wirkt der Stoersender sofort: ' + r.h0[0] + ' gegen ' + r.h1[0]);
    },
  },
  {
    name: 'Vorhut im Coop: der Client sieht dieselbe Vorhut (Zustand, Ort) schon in der Fahrt, nach dem Halt als Auto im Raster (Netzformat ab VER 55), und kennt die ausgestiegenen Wachen mit',
    async run(t) {
      await setup(t);
      const r = await t.page.evaluate(`(() => { const F = ${FIND}, RUN = ${RUN}, sd = F(m => m.vorhut, 1)[0], G = CT.mkGame('truck', sd, 2), A = G.A, B = G.clients[0], o = {}; A.CFG.policeAt = 26; A.CFG.policeForced = 20; const b = A.bars().find(x => x.rd && x.g === 1); b.lv = 1; b.hp = 100; const bb = B.bars().find(x => x.rd && x.g === 1); bb.lv = 1; bb.hp = 100;
        for (let i = 0; i < 100 * 2; i++) { A.get().me.hp = 1e9; G.run(.5); if (A.vh().st === 'drive') break; } G.run(2); o.fahrt = [A.vh().st, B.vh().st, Math.round(A.vh().x), Math.round(B.vh().x)];
        for (let i = 0; i < 100 * 2; i++) { A.get().me.hp = 1e9; G.run(.5); if (A.vh().st === 'stopped') break; } G.run(1); o.a = [A.vh().st, Math.round(A.vh().x)]; o.b = [B.vh().st, Math.round(B.vh().x), B.vh().cells ? B.vh().cells.length : 0, B.vh().cells ? B.world().cell(B.vh().cells[0][0], B.vh().cells[0][1]) : '']; o.ver = A.VER; o.en = [A.get().en.filter(e => e.vg).length, A.get().en.length, B.get().en.length]; return o; })()`);
      t.eq(r.fahrt[0], 'drive', 'Aufbau: die Vorhut faehrt auf dem Host'); t.eq(r.fahrt[1], 'drive', 'der Client sieht sie fahren'); t.ok(Math.abs(r.fahrt[2] - r.fahrt[3]) <= 60 && r.fahrt[3] > -100, 'in der Fahrt am fast selben Ort (der Client gleitet nach): ' + JSON.stringify(r.fahrt));
      t.eq(r.a[0], 'stopped', 'Aufbau: die Vorhut hat auf dem Host gehalten'); t.eq(r.b[0], 'stopped', 'der Client sieht sie stehen'); t.ok(Math.abs(r.a[1] - r.b[1]) <= 12, 'am selben Ort: ' + JSON.stringify([r.a, r.b])); t.ok(r.b[2] >= 6 && r.b[3] === 'v', 'beim Client steht sie als Auto im Raster: ' + JSON.stringify(r.b));
      t.ok(r.ver >= 55, 'Netzformat mit Vorhut (ab 55): ' + r.ver); t.eq(r.en[0], 2, 'Aufbau: zwei Wachen der Vorhut auf dem Host'); t.eq(r.en[2], r.en[1], 'der Client kennt dieselben Gegner (' + r.en[1] + ')');
    },
  },
];
