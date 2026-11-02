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
      const r = await t.page.evaluate(`(() => { const o = ${STRAT}, out = []; for (const sd of [7003, 7005, 7006, 7008]) { const x = bot.nb(Object.assign({ seed: sd }, o)); out.push({ sd, res: x.res, t: x.t, holeT: x.holeT, vault: x.vault, secured: x.secured, maxD: x.maxD, hold: x.hold, kills: x.kills, dstop: x.dstop }); } return out; })()`);
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
      const r = await t.page.evaluate(`(() => { const o = ${STRAT}; const a = bot.nb(Object.assign({ seed: 7003 }, o)); const b = bot.nb(Object.assign({ seed: 7003 }, o, { gier: 1e9, stay: 40 })); return { a: [a.res, a.t, a.holeT], b: [b.res, b.t, b.holeT] }; })()`);
      t.ok(r.a[2] > 0, 'der Bohrer ist durch (Loch offen) bei Seed 7003: ' + JSON.stringify(r.a));
      t.ok(r.b[2] > 0 && (r.b[0] !== 'WIN' || r.b[1] >= r.b[2] + 39), 'mit grosser Gier und stay 40 geht er fruehestens 40 s nach Loch offen (oder faellt vorher): ' + JSON.stringify(r.b));
    },
  },
];
