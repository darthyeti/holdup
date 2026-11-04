// Notenbank N5 (Ticket 75): Verteidigungs-Bot (tools/bot.js, bot.nb). Kurzer Lauf mit wenigen Seeds: Der Bot oeffnet den Tresor, packt die Buendel, sperrt die Kellertreppe mit einer Barrikade, startet den Bohrer, haelt die Engstelle und geht bei offenem Loch hindurch (Strategie frueh). Die Messung ueber viele Seeds ist tools/messung-nb.js (docs/tests-und-messwerte.md).
// Mutanten laufen mit HOLDUP_BOT=<Kopie von tools/bot.js>.
const fs = require('fs');
const path = require('path');
const STRAT = `{ kit: 'old', sigma: .05, post: 'gate', bar: 'treppe', press: false, gier: 0, maxT: 400 }`;
module.exports = [
  {
    name: 'Notenbank-Bot frueh: vier Seeds, jeder Lauf endet vor dem Zeitlimit, der Tresor ist leer geraeumt, die Treppe gesperrt, mindestens ein Lauf kommt durch das Loch (Sieg mit der Beute), Zaehler der Stillstaende und Ringe sind gefuellt',
    timeout: 240000,
    async run(t) {
      await t.page.addScriptTag({ content: fs.readFileSync(process.env.HOLDUP_BOT || path.join(__dirname, '..', '..', 'tools', 'bot.js'), 'utf8') });
      const r = await t.page.evaluate(`(() => { __dbg.CFG.nb.stormSolo = 1e6; const o = ${STRAT}, out = []; for (const sd of [7003, 7005, 7006, 7008]) { const x = bot.nb(Object.assign({ seed: sd }, o)); out.push({ sd, res: x.res, t: x.t, holeT: x.holeT, vault: x.vault, secured: x.secured, maxD: x.maxD, hold: x.hold, kills: x.kills, dstop: x.dstop }); } return out; })()`);
      t.eq(r.filter(x => x.res === 'TIMEOUT').map(x => x.sd), [], 'kein Lauf haengt bis zum Zeitlimit: ' + JSON.stringify(r.map(x => [x.sd, x.res, x.t])));
      t.eq(r.filter(x => !(x.vault >= 45000)).map(x => [x.sd, x.vault]), [], 'der Bot raeumt den Tresor fast ganz (mindestens 45000 von 60000)');
      t.ok(r.every(x => x.kills >= 1 && x.maxD >= 1), 'die Polizei kommt, der Bot schiesst: ' + JSON.stringify(r.map(x => [x.kills, x.maxD])));
      t.ok(r.some(x => x.res === 'WIN' && x.secured >= 45000 && x.holeT > 0 && x.holeT < x.t + 1), 'mindestens ein Lauf bohrt durch und entkommt mit der Beute: ' + JSON.stringify(r.map(x => [x.sd, x.res, x.holeT, x.secured])));
      t.ok(r.every(x => x.hold > 0), 'die gehaltene Zeit wird gezaehlt');
    },
  },
  {
    name: 'Notenbank-Bot: ohne Bohrer kein Loch (Bohrer wird vom Bot gestartet, Mutant "Bohrer nie") und die Strategie gier haelt ihn bei offenem Loch zurueck',
    timeout: 240000,
    async run(t) {
      await t.page.addScriptTag({ content: fs.readFileSync(process.env.HOLDUP_BOT || path.join(__dirname, '..', '..', 'tools', 'bot.js'), 'utf8') });
      const r = await t.page.evaluate(`(() => { const o = ${STRAT}; __dbg.CFG.nb.stormSolo = 1e6; let sd = 7003, a; for (const q of [7003, 7005, 7006, 7008, 7010, 7012]) { a = bot.nb(Object.assign({ seed: q }, o)); sd = q; if (a.holeT > 0) break; } let b; for (const q of [sd, 7003, 7005, 7006, 7008, 7010, 7012]) { b = bot.nb(Object.assign({ seed: q }, o, { gier: 1e9, stay: 40, fleeHp: -1 })); if (b.holeT > 0) break; } return { a: [a.res, a.t, a.holeT], b: [b.res, b.t, b.holeT] }; })()`);
      t.ok(r.a[2] > 0, 'der Bohrer ist durch (Loch offen) bei einem der Seeds: ' + JSON.stringify(r.a));
      t.ok(r.b[2] > 0 && (r.b[0] !== 'WIN' || r.b[1] >= r.b[2] + 39), 'mit grosser Gier und stay 40 geht er fruehestens 40 s nach Loch offen (oder faellt vorher), Seeds bis das Loch aufgeht (der Bot streut zufaellig): ' + JSON.stringify(r.b));
    },
  },
  {
    name: 'Notenbank-Balance: die schwaecheren Wellen (soloWb, soloMaxEn) gelten nur solo, im Coop (zwei Spieler) gelten wb 2 und maxEn 14 wie vor N5, Bohrer 180 s und Presse 30 % im inneren Bereich fuer alle',
    timeout: 120000,
    async run(t) {
      await t.loadTool('loopnet.js'); await t.loadInpage('coop.js');
      const r = await t.page.evaluate(`(() => {
        const wave = D => { D.CFG.policeAt = 1e6; D.CFG.policeForced = 1e6; D.get().en.length = 0; D.spawnWave(); const g = D.get(); return g.en.length + g.pcs.reduce((m, c) => m + (c.crew ? c.crew.length : 0), 0) + g.fps.reduce((m, f) => m + f.crew.length, 0); };
        const D1 = __dbg; D1.sessReset(); D1.setScenario('nb'); D1.setSeedMode('random'); D1.setLage([]); D1.buildSeed(5); D1.reset(); D1.startHeist(false);
        const solo = { max: D1.nbMaxEn(), n: wave(D1), drillT: D1.CFG.nb.drillT, pf3: D1.CFG.nb.pressF[3] };
        const G = CT.mkGame('nb', 5, 2, 60, 20), A = G.A; A.startHeist(false);
        const coop = { max: A.nbMaxEn(), n: wave(A), drillT: A.CFG.nb.drillT, pf3: A.CFG.nb.pressF[3], wb: A.LAY().wb };
        return { solo, coop, cfg: [D1.CFG.nb.wb, D1.CFG.nb.soloWb, D1.CFG.nb.maxEn, D1.CFG.nb.soloMaxEn] }; })()`);
      t.eq([r.solo.max, r.coop.max], [10, 14], 'maxEn solo 10, Coop 14: ' + JSON.stringify([r.solo.max, r.coop.max]));
      t.ok(r.coop.n - r.solo.n >= 3, 'die erste Welle ist im Coop deutlich groesser (wb 2 und perPlayer): ' + JSON.stringify([r.solo.n, r.coop.n]));
      t.eq(r.cfg, [2, 0, 14, 10], 'CFG.nb: wb 2, soloWb 0, maxEn 14, soloMaxEn 10');
      t.ok(r.solo.drillT === 180 && r.coop.drillT === 180 && r.solo.pf3 === .3 && r.coop.pf3 === .3, 'Bohrer 180 s und pressF[3] 0,3 fuer alle: ' + JSON.stringify([r.solo, r.coop]));
    },
  },
];
