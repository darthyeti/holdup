// Transporter-Bot (Schritt D der Transporter-Planung, 28. Oktober 2026, tools/bot.js, bot.truck und bot.truckBatch): Der Bot spielt einen Geldtransporter solo vom Start bis zum Fluchtwagen:
// Material sammeln, die Sperre mit den wenigsten fehlenden Teilen bauen (von der Ostseite, damit er danach hinter ihr steht), den Wagen stoppen, die Besatzung beschiessen (anlehnen mit F ueber die Sperre),
// den Laderaum aufbohren (oder mit dem Schluessel), alle Saecke einpacken, in die Fluchtzone gehen und einsteigen. Mit police: false (Messlauf ohne Polizei) misst er die Zeitleiste der Auftragsarten.
// Der Bot soll zeigen, was die Varianten aus T4 bewirken: Baustelle (zwei Teile) baut schneller, ein schwaches Schloss oeffnet schneller als ein verstaerktes. Die Mutanten laufen mit HOLDUP_BOT=<Kopie von tools/bot.js>.
const fs = require('fs');
const path = require('path');
async function setup(t) {
  await t.loadTool('loopnet.js');
  const src = fs.readFileSync(process.env.HOLDUP_BOT || path.join(__dirname, '..', '..', 'tools', 'bot.js'), 'utf8');
  await t.page.addScriptTag({ content: src });
}
// Seeds nach Variante suchen (genTruckMission ist rein rechnerisch, ohne Kartenbau)
const FIND = `(pred, n) => { const D = __dbg, out = []; D.setScenario('truck'); D.setSeedMode('random'); D.setLage([]); for (let sd = 1; sd < 600 && out.length < n; sd++) { const m = D.genTruckMission(sd); if (pred(m)) out.push(sd); } return out; }`;
const OPT = `{ kit: 'full', sigma: .05, react: .35, police: false }`;
// die ersten n Seeds ab 3000 ohne Panne (die Panne hat einen anderen Ablauf, eigener Test unten)
const NP = `(n) => { const D = __dbg, out = []; D.setScenario('truck'); D.setSeedMode('random'); D.setLage([]); for (let sd = 3000; out.length < n; sd++) if (!D.genTruckMission(sd).panne) out.push(sd); return out; }`;

module.exports = [
  {
    name: 'Transporter-Bot: ohne Polizei schafft er acht Seeds (Sperre, Zugriff, Laderaum, Saecke, Fluchtwagen), kaum Treffer dank Deckung hinter der Sperre, die Meilensteine folgen der Reihe nach',
    async run(t) {
      await setup(t);
      const r = await t.page.evaluate(`(() => { const out = [], O = ${OPT}, NP = ${NP}; for (const sd of NP(8)) { const x = bot.truck(Object.assign({ seed: sd }, O)); out.push({ sd, res: x.res, loot: x.loot, minHp: x.minHp, kills: x.kills, why: x.stopWhy, m: x.milestones, t: x.t }); } return out; })()`);
      t.eq(r.filter(x => x.res !== 'WIN').map(x => [x.sd, x.res]), [], 'alle Laeufe gewonnen (Seed, Ergebnis)');
      t.eq(r.filter(x => !(x.loot > 0)).map(x => x.sd), [], 'jeder Lauf bringt Beute'); t.eq(r.filter(x => x.why !== 'sperre').map(x => x.sd), [], 'der Wagen steht an der Sperre, nicht an Leuten auf der Strasse');
      t.eq(r.filter(x => x.minHp < 60).map(x => [x.sd, x.minHp]), [], 'hinter der Sperre verliert der Bot kaum Leben (Rest-HP mindestens 60)'); t.ok(r.every(x => x.kills >= 1), 'die Besatzung wird bekaempft');
      t.ok(r.filter(x => x.m.erster <= 5).length >= 5, 'hinter der Sperre schiesst der Bot ueber sie (Anlehnen mit F) und schaltet die Besatzung gleich aus, nicht erst wenn sie stuermt: erster Abschuss nach hoechstens 5 s in mindestens 5 von 8 Laeufen: ' + JSON.stringify(r.map(x => x.m.erster)));
      t.eq(r.filter(x => !(x.t <= 100)).map(x => [x.sd, x.t]), [], 'der Fluchtwagen wird beim Zugriff gerufen und ist dann nach rund 34 s da (Sieg nach hoechstens 100 s)');
      t.eq(r.filter(x => !(x.m.sperre < x.m.stand)).map(x => x.sd), [], 'die Sperre steht vor dem Halt (rT)');
      t.eq(r.filter(x => !(x.m.offen > 0 && x.m.offen < x.m.voll && x.m.voll < x.m.zone && x.m.zone < x.t)).map(x => [x.sd, JSON.stringify(x.m)]), [], 'Laderaum offen, Taschen voll, Fluchtzone, Sieg in dieser Reihenfolge (tH)');
    },
  },
  {
    name: 'Transporter-Bot: auf der Fahrbahn stehen bleiben stoppt den Wagen auch (stop strasse), tut der Bot in der Erkundung nichts, faehrt der Wagen durch (Wagen entkommen), und die Polizei-Einstellung steht danach wieder wie vorher',
    async run(t) {
      await setup(t);
      const r = await t.page.evaluate(`(() => { const D = __dbg, O = ${OPT}, NP = ${NP}, o = {}, pol = [D.CFG.truck.policeAt, D.CFG.policeForced], s1 = NP(2)[1]; const a = bot.truck(Object.assign({ seed: s1, stop: 'strasse' }, O)), b = bot.truck(Object.assign({ seed: s1, stop: 'nichts' }, O));
        o.strasse = [a.res, a.stopWhy, a.milestones.sperre === undefined]; o.nichts = [b.res, b.milestones.stand === undefined, b.kills]; o.pol = [pol, [D.CFG.truck.policeAt, D.CFG.policeForced]];
        const c = bot.truck({ seed: s1, kit: 'full', sigma: .05, react: .35 }); o.mitPolizei = [typeof c.res, c.milestones.stand != null, c.waves]; o.pol2 = [D.CFG.truck.policeAt, D.CFG.policeForced]; return o; })()`);
      t.eq(r.strasse, ['WIN', 'strasse', true], 'auf der Fahrbahn stehen: der Wagen bremst vor dem Bot, ohne dass eine Sperre steht'); t.eq(r.nichts, ['LOSE:Wagen entkommen', true, 0], 'ohne Sperre und ohne Bot auf der Strasse faehrt der Wagen durch');
      t.eq(r.pol[0], r.pol[1], 'police: false laesst die Zeiten nach dem Lauf wie vorher'); t.eq(r.pol2, r.pol[0], 'mit Polizei sind die Zeiten unveraendert (26 s und der Mindestwert)');
      t.ok(r.mitPolizei[1] === true && r.mitPolizei[0] === 'string', 'mit Polizei bekommt der Bot den Wagen zum Stehen');
    },
  },
  {
    name: 'Transporter-Bot: er unterscheidet die Varianten der Auftragsart (Baustelle baut mindestens 8 s frueher als die Normalstrasse, ein schwaches Schloss oeffnet mindestens 8 s frueher als ein verstaerktes)',
    async run(t) {
      await setup(t);
      const r = await t.page.evaluate(`(() => { const D = __dbg, F = ${FIND}, O = ${OPT}, num = a => a.filter(x => typeof x === 'number'), mean = a => { a = num(a); return a.reduce((x, y) => x + y, 0) / (a.length || 1); };
        const grp = seeds => seeds.map(sd => bot.truck(Object.assign({ seed: sd }, O)));
        const bau = F(m => !m.panne && m.street === 'baustelle' && m.lock === 'std', 5), nor = F(m => !m.panne && m.street === 'std' && m.lock === 'std', 5), sw = F(m => !m.panne && m.street === 'std' && m.lock === 'schwach', 5), st = F(m => !m.panne && m.street === 'std' && m.lock === 'stark', 5);
        const A = grp(bau), B = grp(nor), C = grp(sw), E = grp(st), win = a => a.filter(x => x.res === 'WIN').length;
        return { n: [bau.length, nor.length, sw.length, st.length], sperre: [mean(A.map(x => x.milestones.sperre)), mean(B.map(x => x.milestones.sperre))], offen: [mean(C.map(x => x.milestones.offen)), mean(E.map(x => x.milestones.offen))], win: [win(A), win(B), win(C), win(E)], seeds: [bau, nor, sw, st] }; })()`);
      t.eq(r.n, [5, 5, 5, 5], 'Aufbau: je fuenf Seeds: ' + JSON.stringify(r.seeds)); t.ok(r.win.every(x => x >= 4), 'mindestens vier von fuenf gewonnen (der Bot verliert ohne Polizei sehr selten, sonst misst der Vergleich nichts): ' + JSON.stringify(r.win));
      t.ok(r.sperre[0] + 8 <= r.sperre[1], 'Baustelle (2 Teile) steht frueher als die Normalstrasse (4 Teile), rT ' + r.sperre.map(x => x.toFixed(1)).join(' gegen '));
      t.ok(r.offen[0] + 8 <= r.offen[1], 'schwaches Schloss oeffnet frueher als verstaerktes, tH ' + r.offen.map(x => x.toFixed(1)).join(' gegen '));
    },
  },
  {
    name: 'Transporter-Bot: eine Panne (Wagen steht schon) spielt er laut: Waffe gleich ziehen, Besatzung bekaempfen, Laderaum aufbohren, einsteigen (ohne Polizei Sieg)',
    async run(t) {
      await setup(t);
      const r = await t.page.evaluate(`(() => { const D = __dbg; D.setScenario('truck'); D.setSeedMode('random'); D.setLage([]); const P = []; for (let sd = 1; sd < 300 && P.length < 4; sd++) if (D.genTruckMission(sd).panne) P.push(sd); return P.map(sd => { const x = bot.truck(Object.assign({ seed: sd }, ${OPT})); return { sd, res: x.res, why: x.stopWhy, panne: x.mission.panne, m: x.milestones, t: x.t, kills: x.kills }; }); })()`);
      t.eq(r.length, 4, 'vier Pannen-Seeds'); t.ok(r.filter(x => x.res === 'WIN').length >= 3, 'mindestens drei von vier gewonnen (bei der Panne steht die Besatzung nah, der Bot verliert gelegentlich): ' + JSON.stringify(r.map(x => x.res))); t.eq(r.filter(x => x.why !== 'panne' || !x.panne).map(x => x.sd), [], 'als Panne erkannt');
      t.eq(r.filter(x => x.res === 'WIN').filter(x => !(x.m.stand === 0 && x.m.offen > 0 && x.m.offen < x.m.voll && x.m.voll < x.m.zone && x.kills >= 1)).map(x => [x.sd, JSON.stringify(x.m)]), [], 'der Wagen steht von Anfang an, danach Laderaum, Taschen, Fluchtzone in dieser Reihenfolge');
    },
  },
  {
    name: 'Transporter-Bot: truckBatch gibt Siegquote, Quote gestoppter Wagen, Mittel der Meilensteine, Rest-HP und Ergebnisse, auf Wunsch je Gruppe (hier nach Strasse), die Gruppen ergeben zusammen alle Laeufe',
    async run(t) {
      await setup(t);
      const r = await t.page.evaluate(`(() => { const b = bot.truckBatch(8, ${OPT}, 3000, x => x.street), g = Object.values(b.by); return { all: b.all, keys: Object.keys(b.by), sum: g.reduce((a, x) => a + x.n, 0), runs: b.runs.length, wins: g.reduce((a, x) => a + (x.res.WIN || 0), 0) }; })()`);
      t.eq(r.all.n, 8, 'acht Laeufe'); t.eq([r.all.win, r.all.stopped], [100, 100], 'alle gewonnen, alle Wagen gestoppt'); t.eq(r.sum, 8, 'die Gruppen ergeben zusammen alle Laeufe'); t.eq(r.runs, 8, 'je Lauf ein Eintrag'); t.eq(r.wins, 8, 'die Ergebnisse der Gruppen zaehlen mit');
      t.ok(r.all.offen > 0 && r.all.offen < r.all.voll && r.all.voll < r.all.zone, 'Mittel der Meilensteine in der richtigen Reihenfolge: ' + JSON.stringify([r.all.offen, r.all.voll, r.all.zone])); t.ok(r.keys.length >= 2, 'mehrere Strassenarten unter acht Seeds: ' + r.keys.join(','));
    },
  },
];
