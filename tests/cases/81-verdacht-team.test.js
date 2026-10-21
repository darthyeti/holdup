// Verdachtsbalken im Coop (Tills Frage: stapeln sich die Balken pro Mitspieler, muss der Balken fuer bis zu 4 Spieler laenger sein?):
// Es gibt einen gemeinsamen Teambalken, die Raten gelten als Maximum (nicht Summe). Neu: Der Balken ist je weiterem Spieler um CFG.susPer (.25) laenger,
// sus bleibt in Prozent des Balkens, Anstieg und Abbau werden durch 1 + susPer * (n - 1) geteilt. Solo bleibt unveraendert.
async function setup(t) {
  await t.loadTool('loopnet.js');
  await t.loadInpage('coop.js');
}

module.exports = [
  {
    name: 'Verdacht Team: gleiche Beobachtung braucht mit n Spielern n-mal 1 + 0,25 (n - 1) so lange bis zum Alarm (Wache sieht Spieler mit Beute)',
    async run(t) {
      await setup(t);
      const r = await t.page.evaluate(() => {
        const out = {};
        for (const n of [1, 2, 3, 4]) {
          const G = CT.mkGame('jewel', 654, n), A = G.A, g = A.get().npcs.find(q => q.k === 'grd');
          if (!g) return { err: 'keine Wache auf der Karte' };
          A.setSus(0); const p1 = A.get().players[n > 1 ? 1 : 0]; let s = 0;
          const hold = () => { p1.x = g.x + 50; p1.y = g.y; p1.units = 1; g.a = 0; };
          for (let i = 0; i < 60 * 40 && A.get().phase === 1; i++) { hold(); step(G.insts, G.net, 1 / 60); s++; }
          out[n] = { t: +(s / 60).toFixed(2), phase: A.get().phase, rate: 48 * A.lgM('sus') };
        }
        return out;
      });
      t.ok(!r.err, r.err);
      for (const n of [1, 2, 3, 4]) {
        t.eq(r[n].phase, 2, n + ' Spieler: Alarm ausgeloest');
        const soll = 100 / r[n].rate * (1 + .25 * (n - 1));
        t.ok(Math.abs(r[n].t - soll) < soll * .12 + .1, n + ' Spieler: ' + r[n].t + ' s bis zum Alarm, erwartet ' + soll.toFixed(2) + ' s (Rate ' + r[n].rate + ')');
      }
      t.ok(r[4].t > r[1].t * 1.5, 'zu viert dauert es deutlich laenger als solo: ' + r[4].t + ' gegen ' + r[1].t);
    },
  },
  {
    name: 'Verdacht Team: Abbau laeuft langsamer in Prozent (9 / Faktor), Solo bleibt bei 9 pro Sekunde, Rate-Maximum statt Summe',
    async run(t) {
      await setup(t);
      const r = await t.page.evaluate(() => {
        const out = {};
        for (const n of [1, 4]) {
          const G = CT.mkGame('bank', 321, n), A = G.A;
          A.setSus(60); G.run(2); out['abbau' + n] = +(60 - A.get().sus).toFixed(2);   // niemand beobachtet: 2 s Abbau
        }
        // Maximum statt Summe: vier Spieler im Blick derselben Wache steigern nicht schneller als einer
        const rate = (n, nSee) => {
          const G = CT.mkGame('jewel', 654, n), A = G.A, g = A.get().npcs.find(q => q.k === 'grd'); A.setSus(0);
          const P = A.get().players; let s = 0;
          for (let i = 0; i < 30; i++) { for (let k = 0; k < nSee; k++) { P[k].x = g.x + 50 + k * 6; P[k].y = g.y; P[k].units = 1; } g.a = 0; step(G.insts, G.net, 1 / 60); s++; }
          return A.get().sus / (s / 60);
        };
        out.eins = rate(4, 1); out.vier = rate(4, 4);
        return out;
      });
      t.ok(Math.abs(r.abbau1 - 18) < .6, 'solo: 18 Prozent in 2 s abgebaut: ' + r.abbau1);
      t.ok(Math.abs(r.abbau4 - 18 / 1.75) < .6, 'zu viert: 18 / 1,75 Prozent in 2 s: ' + r.abbau4);
      t.ok(r.eins > 0 && Math.abs(r.vier - r.eins) < r.eins * .1, 'vier im Blick wie einer (Maximum): ' + r.eins.toFixed(1) + ' gegen ' + r.vier.toFixed(1) + ' Prozent/s');
    },
  },
  {
    name: 'Verdacht Team: CFG.susPer 0 schaltet ab, Client sieht denselben Balken in Prozent, HUD zeichnet mit Team-Hinweis',
    async run(t) {
      await setup(t);
      const r = await t.page.evaluate(() => {
        const out = {};
        const G = CT.mkGame('jewel', 654, 3), A = G.A, B = G.clients[0], g = A.get().npcs.find(q => q.k === 'grd');
        const p = A.get().players[1]; A.setSus(0);
        for (let i = 0; i < 90; i++) { p.x = g.x + 50; p.y = g.y; p.units = 1; g.a = 0; step(G.insts, G.net, 1 / 60); }
        p.units = 0; p.x = A.get().players[0].x; p.y = A.get().players[0].y; G.run(1); out.host = A.get().sus; out.client = B.get().sus;   // nicht mehr im Blick: der Balken sinkt langsam, der Vergleich ist stabil
        const draw = [];
        const ctx = A.cv.getContext('2d'), o = ctx.fillText; ctx.fillText = function (s) { draw.push(String(s)); return o.apply(this, arguments); };
        try { A.draw(); } finally { ctx.fillText = o; }
        out.hint = draw.find(s => /^Team: Balken/.test(s)) || null;
        // abgeschaltet: gleiche Beobachtung wie solo
        A.CFG.susPer = 0; A.setSus(0);
        for (let i = 0; i < 30; i++) { p.x = g.x + 50; p.y = g.y; p.units = 1; g.a = 0; step(G.insts, G.net, 1 / 60); }
        out.aus = A.get().sus; A.CFG.susPer = .25;
        return out;
      });
      t.ok(r.host > 5, 'Verdacht steigt: ' + r.host);
      t.ok(Math.abs(r.client - r.host) < 2, 'Client sieht ungefaehr denselben Balken (Prozent): ' + r.client + ' gegen ' + r.host);
      t.eq(r.hint, 'Team: Balken x1,50', 'HUD nennt den Faktor zu dritt');
      t.ok(r.aus > 12 && r.aus < 30, 'ohne Skalierung steigt es mit voller Rate (48/s mal 0,5 s = 24 Prozent, Lage ohne Abweichung): ' + r.aus);
    },
  },
  {
    name: 'Verdacht Team: Solo ohne Hinweis und mit Faktor 1 (Rate 48 pro Sekunde)',
    async run(t) {
      const r = await t.page.evaluate(() => {
        const D = __dbg; D.reset(); D.setSus(0);
        const g = D.get().npcs.find(q => q.k === 'grd'), m = D.get().me;
        if (!g) return { err: 'keine Wache' };
        let s = 0; for (let i = 0; i < 30; i++) { m.x = g.x + 50; m.y = g.y; m.units = 1; g.a = 0; D.update(1 / 60); s++; }
        const draw = [], c = document.querySelector('canvas').getContext('2d'), o = c.fillText; c.fillText = function (x) { draw.push(String(x)); return o.apply(this, arguments); };
        try { D.draw(); } finally { c.fillText = o; }
        return { rate: D.get().sus / (s / 60), lg: D.lgM('sus'), hint: draw.some(x => /^Team:/.test(x)) };
      });
      t.ok(!r.err, r.err);
      t.eq(r.hint, false, 'kein Team-Hinweis solo');
      t.ok(Math.abs(r.rate - 48 * r.lg) < 48 * r.lg * .1, 'Rate solo ' + r.rate.toFixed(1) + ', erwartet ' + (48 * r.lg).toFixed(1));
    },
  },
];
