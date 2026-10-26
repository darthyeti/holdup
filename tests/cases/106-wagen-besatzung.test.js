// Geldtransporter zu einfach (Tills Coop-Test vom 26. Oktober 2026, Logs): Auf der offenen Strasse sprengten die Spieler die Streifenwagen samt Besatzung, bevor jemand ausstieg (Runde 11: zwei Wagen mit 3 und 2 Beamten
// vier und sechs Sekunden nach der Ankunft, die ersten Beamten stiegen erst nach 42 s aus). Jetzt springt die Besatzung heraus, sobald ihr Wagen getroffen wird (carHurt: bail, ein fahrender Wagen bremst und parkt, alle steigen
// im Abstand CFG.pol.bailGap aus), nur ein Treffer, der den Wagen zerstoert, kostet noch die Besatzung. Dazu: die erste Polizei am Transporter kommt frueher (CFG.truck.policeAt 26) und der Tag Flaute gibt es dort nicht mehr.
module.exports = [
  {
    name: 'Streifenwagen: Ein Treffer ohne Zerstoerung laesst den fahrenden Wagen bremsen und die Besatzung aussteigen (keine Verluste im Wagen), ein toedlicher Treffer zerstoert ihn samt Besatzung wie bisher',
    async run(t) {
      const r = await t.page.evaluate(`(() => { const D = __dbg, out = {}; out.gap = D.CFG.pol.bailGap;
        const start = () => { D.sessReset(); D.setScenario('bank'); D.setSeedMode('random'); D.setLage([]); D.setTurn('S'); D.buildSeed(5017); D.CFG.policeAt = 1e6; D.CFG.policeForced = 1e6; D.reset(); D.startHeist(false, D.get().me); const g = D.get(); g.en.length = 0; D.spawnWave();
          const c = D.get().cars.find(q => !q.civ && q.crew.length >= 2 && q.st === 'in'); return c ? { g, c } : null; };
        let s = start(); out.has = !!s; if (!s) return out; let c = s.c; const n0 = c.crew.length, en0 = D.get().en.length, k0 = D.get().kills;
        D.carHurt(c, 40, 0, c.x, c.y); out.hit = { bail: c.bail, st: c.st, hp: c.hp > 0, dead: !!c.dead, crew: c.crew.length, n0 };
        for (let i = 0; i < 90; i++) D.update(1 / 30);
        out.after = { crew: c.crew.length, en: D.get().en.length - en0, kills: D.get().kills - k0, dead: !!c.dead };
        // Gegenprobe: toedlich
        s = start(); c = s.c; const m0 = c.crew.length, e1 = D.get().en.length, k1 = D.get().kills; D.carHurt(c, 1e4, 0, c.x, c.y); for (let i = 0; i < 60; i++) D.update(1 / 30);
        out.boom = { dead: !!c.dead, crew: c.crew.length, en: D.get().en.length - e1, kills: D.get().kills - k1, m0 };
        // ein stehender Wagen mit Besatzung: Treffer laesst alle sofort aussteigen (statt mit Pausen von exitGap)
        s = start(); c = s.c; for (let i = 0; i < 400 && c.st === 'in'; i++) D.update(1 / 30); out.parked = c.st; const left0 = c.crew.length;
        D.carHurt(c, 10, 0, c.x, c.y); for (let i = 0; i < 40; i++) D.update(1 / 30); out.stand = { left0, crew: c.crew.length, bail: c.bail };
        return out; })()`);
      t.ok(r.has, 'eine Welle mit einem fahrenden Wagen (mindestens 2 Besatzung)');
      t.eq([r.hit.bail, r.hit.st, r.hit.hp, r.hit.dead], [1, 'park', true, false], 'getroffen: Besatzung springt (bail), der Wagen steht, lebt noch: ' + JSON.stringify(r.hit));
      t.eq([r.after.crew, r.after.dead, r.after.kills], [0, false, 0], 'nach 3 s ist die Besatzung draussen, der Wagen ganz, keine Verluste: ' + JSON.stringify(r.after));
      t.ok(r.after.en >= r.hit.n0, 'die Beamten stehen als Gegner im Spiel (' + r.after.en + ' neue, Besatzung ' + r.hit.n0 + ')');
      t.eq([r.boom.dead, r.boom.crew, r.boom.en], [true, 0, 0], 'toedlicher Treffer: Wagen zerstoert, Besatzung tot, niemand steigt aus: ' + JSON.stringify(r.boom));
      t.ok(r.boom.kills >= r.boom.m0, 'die Besatzung zaehlt als Abschuesse (' + r.boom.kills + ' bei ' + r.boom.m0 + ' im Wagen)');
      t.eq([r.stand.crew, r.stand.bail], [0, 1], 'ein stehender Wagen mit Besatzung: nach einem Treffer sind alle in 1,3 s draussen (bailGap ' + r.gap + '): ' + JSON.stringify(r.stand));
    },
  },
  {
    name: 'Geldtransporter: erste Polizei CFG.truck.policeAt 26 s nach dem Alarm, der Tag Flaute kommt dort nie vor (Bank und Juwelier kennen ihn weiter)',
    async run(t) {
      const r = await t.page.evaluate(`(() => { const D = __dbg, out = { truck: {}, other: {} }; out.at = D.CFG.truck.policeAt;
        D.setLage(null); D.setSeedMode('random');
        const count = (sc, from, to) => { let fl = 0, n = 0, tags = 0; for (let s = from; s < to; s++) { D.sessReset(); D.setScenario(sc); D.setTurn('S'); D.buildSeed(s); const lg = D.LAY().mission.lg || []; n++; if (lg.includes('flaute')) fl++; tags += lg.length; } return { n, fl, tags }; };
        out.truck = count('truck', 1, 121); out.bank = count('bank', 1, 41); out.jewel = count('jewel', 1, 41);
        D.setLage([]); D.sessReset(); D.setScenario('truck'); D.buildSeed(748178); D.reset(); const g = D.get(); D.startHeist(true, g.me); out.pol = D.pAt();
        return out; })()`);
      t.eq(r.at, 26, 'CFG.truck.policeAt 26');
      t.eq(r.truck.fl, 0, 'Transporter: in 120 Seeds nie Flaute: ' + JSON.stringify(r.truck));
      t.ok(r.truck.tags > 0, 'die anderen Tags kommen weiter vor (' + r.truck.tags + ' Tags in 120 Seeds)');
      t.ok(r.bank.fl > 0 && r.jewel.fl > 0, 'Bank und Juwelier kennen Flaute weiter: ' + JSON.stringify([r.bank, r.jewel]));
      t.ok(r.pol <= 26 && r.pol >= 15, 'am Transporter kommt die erste Polizei nach hoechstens 26 s (Fahndung kann sie verkuerzen): ' + r.pol);
    },
  },
];
