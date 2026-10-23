// Fahndungslevel (Tills Idee, Schritt 1 Trockenlauf, docs/spielsystem.md): Teamwert der Serie (SESSION.heat, Punkte 0 bis 100, Stufe 0 bis 5), gebucht am Auftragsende aus generischen Groessen
// (heatBook), im Ende-Paket als res.fh, im Coop vom Host in go, rst und ros (Feld h, VER 25). Der Trockenlauf wirkt nicht auf die Polizei. Das Badge steht in jedem Bildschirm, auch in Shop und Auftragswahl.
// Hinweis: Alle Instanzen einer Seite teilen ein SESSION-Objekt, deshalb prueft der Coop-Test die gesendeten Nachrichten und das Verhalten der Handler, nicht getrennte Staende je Instanz.
const SC = ['bank', 'truck', 'jewel', 'gas', 'museum', 'casino'];

async function setup(t) {
  await t.loadTool('loopnet.js');
  await t.loadTool('bot.js');
  await t.loadInpage('coop.js');
  await t.loadInpage('menu.js');
}

module.exports = [
  {
    name: 'Fahndung: Stufen aus den Punkten (Grenzen, Deckel, Unsinn bleibt in 0 bis 5)',
    async run(t) {
      const r = await t.page.evaluate(() => {
        const D = __dbg, F = D.CFG.fahndung;
        return { names: F.names.length, max: F.max, step: F.step, lv: [0, 19, 20, 39, 40, 59, 60, 79, 80, 99, 100, 150, -30, NaN, 'x', undefined].map(h => D.heatLv(h)), on: F.on };
      });
      t.eq(r.names, 6, 'sechs Stufen (0 bis 5)');
      t.eq(r.max / r.step, 5, 'Punkte und Schrittweite ergeben Stufe 5 bei max');
      t.eq(r.lv, [0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 0, 0, 0, 0], 'Stufe je Punktzahl');
      t.eq(r.on, 0, 'Schritt 1 ist ein Trockenlauf (CFG.fahndung.on 0)');
    },
  },
  {
    name: 'Fahndung: Buchung aus generischen Groessen, Gewichte, Deckel, Untergrenze, kein Szenario fliesst ein',
    async run(t) {
      const r = await t.page.evaluate(SC => {
        const D = __dbg, B = D.heatBook, o = {};
        const quiet = { win: true, phase: 1, kills: 0, civ: 0, waves: 0, goal: false };
        o.quiet = B(50, quiet);
        o.quietFloor = B(10, quiet).to;
        o.quietGoal = B(50, Object.assign({}, quiet, { goal: true }));
        o.calm = B(0, { win: true, phase: 2, kills: 0, civ: 0, waves: 0, goal: false });
        o.loud = B(40, { win: true, phase: 2, kills: 8, civ: 1, waves: 4, goal: true });
        o.caps = B(0, { win: true, phase: 2, kills: 100, civ: 10, waves: 20, goal: false });
        o.soft = B(0, { win: false, phase: 2, kills: 2, civ: 0, waves: 1, goal: false });
        o.sum = x => x.items.reduce((s, q) => s + q[1], 0);
        // Szenario-Unabhaengigkeit: dieselbe Eingabe ergibt auf jeder Karte dasselbe Ergebnis
        const ref = JSON.stringify(B(30, { win: true, phase: 2, kills: 5, civ: 0, waves: 3, goal: true })), diff = [];
        for (const sc of SC) { D.setScenario(sc); if (JSON.stringify(B(30, { win: true, phase: 2, kills: 5, civ: 0, waves: 3, goal: true })) !== ref) diff.push(sc); }
        o.diff = diff;
        o.cfg = D.CFG.fahndung;
        return JSON.parse(JSON.stringify(Object.assign({}, o, { sumQuiet: o.sum(o.quiet), sumLoud: o.sum(o.loud), sumCaps: o.sum(o.caps), sum: undefined })));
      }, SC);
      const F = r.cfg;
      t.eq(r.quiet.items.map(q => q[0]), ['Grundrauschen', 'Lautlos entkommen'], 'lautlos: Grundrauschen und Lautlos-Abzug');
      t.eq(r.quiet.to, 50 + F.drift + F.quiet, 'lautlos senkt (Grundrauschen plus Abzug)');
      t.ok(r.quiet.to < r.quiet.from, 'ein lautloser Auftrag kuehlt ab');
      t.eq(r.quietFloor, 0, 'Untergrenze 0');
      t.ok(r.quietGoal.items.some(q => q[0] === 'Nebenziel' && q[1] === F.goal), 'Nebenziel erfuellt senkt');
      t.eq(r.calm.items.map(q => q[0]), ['Grundrauschen', 'Überfall', 'Ohne Tote'], 'Ueberfall ohne einen Toten: Ohne-Tote-Abzug, keine Wellen');
      t.eq(r.calm.to, F.drift + F.loud + F.calm, 'Ueberfall ohne Tote bleibt ein Plus, aber ein kleineres');
      t.eq(r.sumLoud, F.drift + F.loud + Math.round(8 * F.kill) + F.civ + (4 - F.waveFree) * F.wave + F.goal, 'laut: Gegner, Zivilisten, Wellen, Nebenziel');
      t.eq(r.loud.to, 40 + r.sumLoud, 'laut: Summe auf den alten Stand');
      t.eq(r.sumCaps, F.drift + F.loud + F.killMax + F.civMax + F.waveMax, 'Deckel je Eingabe');
      t.eq(r.caps.to, Math.min(F.max, r.sumCaps), 'Obergrenze max');
      t.ok(!r.soft.items.some(q => q[0] === 'Lautlos entkommen'), 'ohne Sieg gibt es keinen Lautlos-Abzug');
      t.eq(r.diff, [], 'dieselbe Eingabe, dasselbe Ergebnis auf allen Karten (kein Szenario fliesst ein)');
    },
  },
  {
    name: 'Fahndung: Solo bucht am Ende (lautlos senkt, Bot-Ueberfall hebt), das Ergebnis traegt res.fh',
    timeout: 180000,
    async run(t) {
      await setup(t);
      const r = await t.page.evaluate(() => {
        const D = __dbg, o = {};
        // lautlos: Beute auf den Spawn, Phase 1
        const d = MT.solo(null, 's'); d.SESSION.round = 2; MT.click(d, 'serie'); MT.click(d, 'start'); MT.adv(d, 1);
        d.SESSION.heat = 52; d.get().players[0].units = 1; d.get().players[0].loot = 20000; MT.adv(d, 4);
        const e = d.get().ended; o.quiet = e && e.fh ? { fh: e.fh, heat: d.SESSION.heat, win: e.win } : null;
        // Bot-Ueberfall auf der klassischen Bank: laut
        D.setScenario('bank'); D.setSeedMode('classic');
        const res = bot.run({ sigma: .05, react: .35, call: 0, wait: [15, 4], heat: 20 });
        const e2 = D.get().ended; o.loud = { res: res.res, fh: e2 && e2.fh, heat: D.SESSION.heat, phase2: !!(e2 && e2.fh && e2.fh.items.some(q => q[0] === 'Überfall')) };
        return o;
      });
      t.ok(r.quiet && r.quiet.win, 'lautlos gewonnen');
      t.eq(r.quiet.fh.from, 52, 'Stand vorher');
      t.eq(r.quiet.heat, r.quiet.fh.to, 'SESSION.heat ist der gebuchte Wert');
      t.ok(r.quiet.fh.to < 52, 'lautlos kuehlt ab (52 auf ' + r.quiet.fh.to + ')');
      t.ok(r.loud.fh, 'Bot-Ueberfall liefert res.fh (' + JSON.stringify(r.loud.res) + ')');
      t.ok(r.loud.phase2, 'Ueberfall steht in den Gruenden');
      t.eq(r.loud.fh.from, 20, 'Stand vorher (Bot-Lauf)');
      t.eq(r.loud.heat, r.loud.fh.to, 'SESSION.heat ist der gebuchte Wert (Bot-Lauf)');
      t.ok(r.loud.fh.to > 20, 'ein lauter Auftrag heizt an (20 auf ' + r.loud.fh.to + ')');
    },
  },
  {
    name: 'Fahndung: Niederlage beendet die Serie (Fahndung 0, keine Tafel), Neue Serie setzt zurueck',
    timeout: 120000,
    async run(t) {
      await t.loadTool('loopnet.js');
      await t.loadInpage('menu.js');
      const r = await t.page.evaluate(() => {
        const o = {}, d = MT.solo(null, 's'); MT.click(d, 'serie'); MT.click(d, 'start'); MT.adv(d, 1);
        d.SESSION.heat = 60; d.SESSION.round = 3; d.SESSION.wallet = 5000;
        d.startHeist(false); MT.adv(d, 1); d.hitPlayer(d.get().me, 9999); MT.adv(d, 3);   // Tod zaehlt im Ueberfall
        let e = d.get().ended; o.lose = e ? { win: e.win, soft: e.soft, fh: e.fh, heat: d.SESSION.heat, round: d.SESSION.round } : null;
        d.SESSION.heat = 77; d.sessReset(); o.reset = d.SESSION.heat;
        return o;
      });
      t.ok(r.lose, 'Auftrag ist zu Ende (Gefasst)');
      t.ok(!r.lose.win && !r.lose.soft, 'Niederlage');
      t.eq(r.lose.fh, null, 'bei Niederlage keine Fahndungs-Tafel');
      t.eq(r.lose.heat, 0, 'Niederlage setzt die Fahndung zurueck');
      t.eq(r.reset, 0, 'sessReset setzt die Fahndung zurueck');
    },
  },
  {
    name: 'Fahndung: Coop verteilt den Teamwert (go, ros, rst, Ende-Paket), Clients bereinigen Werte',
    timeout: 120000,
    async run(t) {
      await setup(t);
      const r = await t.page.evaluate(() => {
        const o = { log: [] }, net = LoopNet(60, 20), A = mkInst(net, 'a'), insts = [A], run = s => { for (let i = 0; i < Math.round(s * 60); i++) step(insts, net, 1 / 60); };
        A.setScenario('bank'); A.setSeedMode(321); A.hostRoom(); run(.2);
        for (let k = 1; k < 3; k++) { const C = mkInst(net, 'c' + k); insts.push(C); C.joinRoom(A.NET.code); run(2); }
        A.SESSION.heat = 64;
        A.NET.conns.forEach(c => { const s = c.send; c.send = m => { o.log.push(m); return s.call(c, m); }; });
        A.setName('Anna'); run(.3);                                        // Raumliste neu verteilen (ros)
        o.preGo = o.log.length; A.startCoop(); run(3);                         // go
        A.get().players.forEach(p => { p.units = 1; p.loot = 20000; }); run(4);   // lautlos, Ende
        o.ended = !!A.get().ended; o.heatAfter = A.SESSION.heat; o.fh = A.get().ended && A.get().ended.fh;
        A.startNext(); run(1);                                              // rst
        // Handler: der Client uebernimmt h aus ros und bereinigt es
        const B = insts[1], conn = B.NET.conn, ros = h => { conn.onmsg({ t: 'ros', r: B.NET.roster, sc: 'bank', h }); return B.SESSION.heat; };
        o.clamp = { hi: ros(999), lo: ros(-5), junk: ros('x'), ok: ros(42), none: (() => { conn.onmsg({ t: 'ros', r: B.NET.roster, sc: 'bank' }); return B.SESSION.heat; })() };
        o.kinds = o.log.map(m => m.t).filter((x, i, a) => a.indexOf(x) === i);
        o.goH = o.log.filter(m => m.t === 'go').map(m => m.h);
        o.rosH = o.log.slice(0, o.preGo).filter(m => m.t === 'ros').map(m => m.h);
        o.rstH = o.log.filter(m => m.t === 'rst').map(m => m.h);
        o.endFh = o.log.filter(m => m.t === 'end').map(m => m.res && m.res.fh);
        return JSON.parse(JSON.stringify(o));
      });
      t.ok(r.goH.length >= 2 && r.goH.every(h => h === 64), 'go traegt den Wert des Hosts an jeden Client: ' + JSON.stringify(r.goH));
      t.ok(r.rosH.length >= 2 && r.rosH.every(h => h === 64), 'ros traegt den Wert (Lobby zeigt ihn): ' + JSON.stringify(r.rosH));
      t.ok(r.ended && r.fh, 'Ergebnis mit Fahndungs-Tafel (Host)');
      t.eq(r.fh.from, 64, 'Stand vorher im Ende-Paket');
      t.ok(r.endFh.length >= 2 && r.endFh.every(f => f && f.from === 64 && f.to === r.fh.to), 'Ende-Paket traegt den absoluten neuen Wert an jeden Client');
      t.eq(r.heatAfter, r.fh.to, 'Host: SESSION.heat ist der gebuchte Wert');
      t.ok(r.rstH.length >= 2 && r.rstH.every(h => h === r.fh.to), 'rst traegt den neuen Wert: ' + JSON.stringify(r.rstH));
      t.eq(r.clamp, { hi: 100, lo: 0, junk: 0, ok: 42, none: 42 }, 'Client bereinigt h (zu gross, negativ, Unsinn), ohne h bleibt der Stand');
    },
  },
  {
    name: 'Fahndung: Badge steht in Titel, Auftragswahl, Shop, Pause, Lobby, Ergebnis und im HUD (Stufenname und Beschriftung)',
    timeout: 120000,
    async run(t) {
      await setup(t);
      const r = await t.page.evaluate(() => {
        const seen = (d, fn) => { const ctx = d.cv.getContext('2d'), orig = ctx.fillText, log = []; ctx.fillText = function (s) { log.push(String(s)); return orig.apply(this, arguments); }; try { fn(); d.draw(); d.draw(); } finally { ctx.fillText = orig; } return log; };
        const has = (log, name) => log.includes('FAHNDUNG') && log.includes(name), o = {};
        const mk = heat => { const d = MT.solo(null, 's'); d.SESSION.round = 2; d.SESSION.heat = heat; return d; };
        const NM = __dbg.CFG.fahndung.names;
        for (const [h, lv] of [[0, 0], [45, 2], [100, 5]]) {
          const d = mk(h), name = NM[lv];
          o['Titel ' + h] = has(seen(d, () => {}), name);
          o['Auftragswahl ' + h] = has(seen(d, () => { MT.click(d, 'serie'); }), name);
          const d2 = mk(h); o['Shop ' + h] = has(seen(d2, () => { d2.openShop(); }), name);
          const d3 = mk(h); MT.click(d3, 'serie'); MT.click(d3, 'start'); MT.adv(d3, 1);
          o['HUD ' + h] = seen(d3, () => {}).includes('FAHNDUNG');
          o['Pause ' + h] = has(seen(d3, () => { MT.k(d3, 'Escape'); }), name);
          const d4 = mk(h); d4.setFocus(false); MT.click(d4, 'serie'); MT.click(d4, 'start'); MT.adv(d4, 1); d4.setFocus(false);
          o['Overlay ' + h] = has(seen(d4, () => {}), name);
          const d5 = mk(h); MT.click(d5, 'serie'); MT.click(d5, 'start'); MT.adv(d5, 1); d5.get().players[0].units = 1; d5.get().players[0].loot = 20000; MT.adv(d5, 4);
          const e = d5.get().ended; o['Ergebnis ' + h] = e && e.fh ? seen(d5, () => {}).includes('FAHNDUNG') : 'kein Ende';
        }
        const net = LoopNet(30, 0), A = mkInst(net, 'a'); A.hostRoom(); for (let i = 0; i < 20; i++) step([A], net, 1 / 60); A.SESSION.heat = 45;
        o.Lobby = has(seen(A, () => {}), NM[2]);
        return o;
      });
      const bad = Object.entries(r).filter(([, v]) => v !== true).map(([k, v]) => k + ' = ' + v);
      t.eq(bad, [], 'Bildschirme ohne Fahndungs-Badge');
    },
  },
];
