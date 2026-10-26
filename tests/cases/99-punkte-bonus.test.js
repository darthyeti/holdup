// Punkte und Lautlos-Bonus (Tills Idee zur Wachsamkeit der Läden, 25. Oktober 2026, Erweiterung von MRU 1 C1): Zwei Währungen. Lautlos bringt das Geld (Bonus 50 %), der Überfall die schnelleren Skillpunkte. Punkte: Sieg 1, Nebenziel +1, Überfall +1 (CFG.skill.pts.loud),
// lautlos +0 (pts.quiet), der Transporter ist immer laut und bekommt den Überfall-Zuschlag nicht. Bonus: CFG.alert.fade ([1, 1, .7, .4]) wirkt als Faktor auf den Lautlos-Bonus nach der Zahl der lautlosen Siege in Folge beim Start (0 und 1 voll, 2 nur 70 % davon,
// ab 3 nur 40 %), die Ergebniszeile nennt die gesunkene Zahl, der gewarnte Tag und die Zeile Läden gewarnt ebenso. CFG.alert.on 0 schaltet den Schwund ab. Das Ergebnis eines lautlosen Siegs läuft hier über finish (Hilfen setSecured, finish im Debug-Hook).
const END = `(D, win, sp, soft) => { D.endLocal({ win, soft: !!soft, sp, score: 1000, n: 1, lines: [], fh: null, title: 't', extra: '', hi: false }); return D.SESSION.pts; }`;

module.exports = [
  {
    name: 'Punkte: lautlos 1 (kein Zusatz mehr), Überfall 2, das Nebenziel gibt je +1, der Transporter (immer laut) bekommt den Überfall-Zuschlag nicht, ein gescheiterter Auftrag (soft) nichts, die Ergebniszeile nennt die Summe',
    async run(t) {
      const r = await t.page.evaluate(`(() => { const D = __dbg, end = ${END}, o = {}; o.cfg = Object.assign({}, D.CFG.skill.pts); const one = (sp, soft) => { D.sessReset(); return end(D, !soft, sp, soft); };
        o.quiet = one({ goal: false, quiet: true }); o.quietGoal = one({ goal: true, quiet: true }); o.loud = one({ goal: false, quiet: false }); o.loudGoal = one({ goal: true, quiet: false });
        o.truck = one({ goal: false, quiet: false, tr: true }); o.truckGoal = one({ goal: true, quiet: false, tr: true }); o.soft = one(null, true);
        D.sessReset(); end(D, true, { goal: true, quiet: false }); o.line = D.get().ended.lines.filter(l => /^Skillpunkte/.test(l));
        return o; })()`);
      t.eq(r.cfg, { win: 1, goal: 1, quiet: 0, loud: 1 }, 'CFG.skill.pts: Sieg 1, Nebenziel 1, lautlos 0, Überfall 1');
      t.eq([r.quiet, r.quietGoal], [1, 2], 'lautloser Sieg 1, mit Nebenziel 2');
      t.eq([r.loud, r.loudGoal], [2, 3], 'Überfall 2, mit Nebenziel 3');
      t.eq([r.truck, r.truckGoal], [1, 2], 'der Transporter ist immer laut und bekommt den Zuschlag nicht: 1, mit Nebenziel 2');
      t.eq(r.soft, 0, 'ein gescheiterter Auftrag, der die Serie weiterlaufen lässt, gibt nichts');
      t.eq(r.line, ['Skillpunkte: +3 (offen 3)'], 'die Ergebniszeile nennt die Summe');
    },
  },
  {
    name: 'Lautlos-Bonus flacht ab: 0 und 1 lautlose Siege in Folge voll (50 %), 2 nur 35 %, ab 3 nur 20 % (Museum mit 100 % entsprechend 70 und 40 %), die Zeile nennt die gesunkene Zahl, ein Überfall hat keinen Bonus, CFG.alert.on 0 schaltet den Schwund ab',
    async run(t) {
      const r = await t.page.evaluate(`(() => { const D = __dbg, o = {};
        const run = (sc, q, loud, on) => { D.sessReset(); D.SESSION.quiet = q; D.CFG.alert.on = on == null ? 1 : on; D.setScenario(sc); D.setSeedMode('random'); D.setLage([]); D.setTurn('S'); D.buildSeed(5017); D.CFG.policeAt = 1e6; D.CFG.policeForced = 1e6;
          if (loud) D.startHeist(false, D.get().me); D.setSecured(100000); D.finish(true, 't', 'x'); const e = D.get().ended; const bl = e.lines.filter(l => /^Bonus lautlos/.test(l)), m = bl[0] && /\\$ ([\\d.]+)/.exec(bl[0]); return { bonus: bl, score: m ? +m[1].replace(/\\./g, '') : 0 }; };
        o.bank = [0, 1, 2, 3, 9].map(q => run('bank', q)); o.loud = run('bank', 3, true); o.off = run('bank', 5, false, 0); o.museum = [0, 2, 3].map(q => run('museum', q)); o.fade = D.CFG.alert.fade; D.CFG.alert.on = 1;
        return o; })()`);
      t.eq(r.fade, [1, 1, 0.7, 0.4], 'CFG.alert.fade');
      t.eq(r.bank.map(x => x.score), [50000, 50000, 35000, 20000, 20000], 'Bank: Bonus auf 100.000 Beute 50 %, 50 %, 35 %, 20 %, 20 %');
      t.ok(/\(35 % statt 50 %/.test(r.bank[2].bonus[0]) && /\(20 % statt 50 %/.test(r.bank[3].bonus[0]), 'die Zeile nennt den gesunkenen Bonus: ' + JSON.stringify(r.bank[2].bonus));
      t.ok(r.bank[0].bonus.length === 1 && !/statt/.test(r.bank[0].bonus[0]) && !/statt/.test(r.bank[1].bonus[0]), 'bei vollem Bonus steht keine Zusatzangabe');
      t.eq(r.loud.bonus, [], 'ein Überfall hat keinen Lautlos-Bonus');
      t.eq(r.off.score, 50000, 'mit CFG.alert.on 0 bleibt der Bonus voll');
      t.eq(r.museum.map(x => x.score), [100000, 70000, 40000], 'Museum (Bonus 100 %): 100 %, 70 %, 40 %');
    },
  },
  {
    name: 'Anzeige des sinkenden Bonus: die Zeile Läden gewarnt nennt ihn (ab 2 Siegen in Folge 35 %, ab 3 20 %), der gewarnte Tag Wachsames Personal ebenso, vorher keine Zeile',
    async run(t) {
      const r = await t.page.evaluate(`(() => { const D = __dbg, end = ${END}, o = {}; D.sessReset(); const line = () => (D.get().ended.lines.filter(l => /gewarnt/i.test(l))[0] || '');
        end(D, true, { goal: false, quiet: true }); o.l1 = line(); end(D, true, { goal: false, quiet: true }); o.l2 = line(); end(D, true, { goal: false, quiet: true }); o.l3 = line();
        o.tag = [2, 3].map(q => { D.SESSION.quiet = q; return D.LAGE.wachsam.d(true); }); o.fade = [0, 1, 2, 3, 9].map(q => { D.SESSION.quiet = q; return D.quietFade(); });
        return o; })()`);
      t.eq(r.l1, '', 'nach einem Sieg noch keine Zeile');
      t.ok(/gewarnt, der Lautlos-Bonus sinkt auf 35 %\./.test(r.l2), 'nach 2 Siegen: ' + r.l2);
      t.ok(/sinkt auf 20 %\./.test(r.l3), 'nach 3 Siegen: ' + r.l3);
      t.ok(/sinkt auf 35 %\./.test(r.tag[0]) && /sinkt auf 20 %\./.test(r.tag[1]), 'der gewarnte Tag nennt die Zahl: ' + JSON.stringify(r.tag));
      t.eq(r.fade, [1, 1, 0.7, 0.4, 0.4], 'quietFade nach Zähler');
    },
  },
];
