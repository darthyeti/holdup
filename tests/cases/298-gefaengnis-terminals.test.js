// Ticket 298: Bedienteile im Gefaengnis als unterscheidbare Terminals (Zellen-Pult orange, Gitter-Pult blau, Kamera-Hauptschalter violett, Kartenleser, js/draw.js prTerms und prTermDraw, js/kl-dinge-gefaengnis.js tpult).
// Pruefen: jede Art hat ihren E-Text mit Funktion, in 3D steht jede Beschriftung (ZELLEN A oder B, GITTER GANG, KAMERAS, LESER) und die Bauer tpult und sw sind in der Szene, in 2D aendert das Oeffnen des Zellen-Pults
// die Anzeige am Pult (Lampen rot zu gruen offen). Spielregeln unveraendert (Tests 130, 188).
const lib = require('../lib');
const { glPage } = require('../glshare');

module.exports = [
  {
    name: 'Gefaengnis-Terminals: E-Texte nennen die Funktion, das Zellen-Pult zeigt den Zustand seiner Lampen (2D)',
    timeout: 120000,
    async run(t) {
      await lib.loadInpage(t.page, 'bild.js');
      const r = await t.page.evaluate(() => {
        const D = __dbg, o = {};
        for (const sd of [5, 6, 7, 8]) {
          PX.scene('prison', sd); PX.phase('erkundung');
          const R = D.LAY().prison, its = D.get().its.filter(i => i.t === 'lsw'), me = D.get().me;
          o['s' + sd] = its.map(i => i.lab());
          const z = its.find(i => R.sws[i.k].opens.includes('zi'));
          if (sd !== 5) continue;
          me.x = z.x; me.y = z.y + 58; me.vx = me.vy = 0; for (let i = 0; i < 60; i++) { me.hp = 100; D.update(1 / 30); }
          const cv = document.getElementById('c'), cx = cv.getContext('2d'), reg = () => { D.draw(); return Array.from(cx.getImageData(960 - 36, 2 * (272 - 58) - 26, 72, 40).data).join(','); };
          const a = reg(); z.act(me); for (let i = 0; i < 5; i++) { me.hp = 100; D.update(1 / 30); } const b = reg();
          o.diff = a !== b;
        }
        o.rdr = D.get().its.find(i => i.t === 'rdr').lab();
        return o;
      });
      for (const sd of [5, 6, 7, 8]) {
        const l = r['s' + sd];
        t.ok(l.length === 2 && l.some(x => /Zellen öffnen/.test(x)) && l.some(x => /Gitter zum Gang öffnen/.test(x)), 'Seed ' + sd + ': ein Pult Zellen, eins Gitter: ' + JSON.stringify(l));
      }
      t.ok(/LESER/.test(r.rdr), 'Leser-Text: ' + r.rdr);
      t.ok(r.diff, 'Das Zellen-Pult zeigt nach dem Oeffnen andere Lampen (Anzeige am Pult aendert sich)');
    },
  },
  {
    name: 'Gefaengnis-Terminals: in 3D hat jede Art ihren Bauer und ihre Beschriftung (Pulte tpult, Kamera-Hauptschalter sw, Leser reader)',
    timeout: 180000,
    async run(t) {
      const P = await glPage(t); if (!P) return;
      try {
        const page = P.page;
        await lib.loadInpage(page, 'bild.js');
        const r = await page.evaluate(async () => {
          const D = __dbg, i0 = await D.view3d.set(true); if (i0.state !== 'an') return { i0 };
          const o = {};
          for (const sd of [5, 6]) {
            PX.scene('prison', sd); PX.phase('erkundung'); D.draw(); D.draw();
            o['s' + sd] = { txt: D.view3d.txt(), scen: D.view3d.V.info().scen, tb: D.LAY().prison.tb };
          }
          o.kl = await import('/js/kl-kern.js').then(m => (m.KL ? { has: ['tpult', 'sw', 'reader'].map(k => m.KL.hasObj(k)) } : null)).catch(() => null);
          D.view3d.reset(); return o;
        });
        if (!r.s5) { t.ok(false, '3D nicht an: ' + JSON.stringify(r.i0)); return; }
        for (const sd of [5, 6]) {
          const q = r['s' + sd], want = ['ZELLEN ' + (q.tb ? 'B' : 'A'), 'GITTER GANG', 'KAMERAS', 'LESER'];
          t.eq(want.filter(w => !q.txt.includes(w)), [], 'Seed ' + sd + ': Beschriftungen in 3D (gezeigt: ' + q.txt.join(' | ') + ')');
          t.ok(q.scen.tpult === 2 && q.scen.sw >= 1 && q.scen.reader >= 1, 'Seed ' + sd + ': Bauer tpult x2, sw, reader in der Szene: ' + JSON.stringify(q.scen));
        }
        if (r.kl) t.ok(r.kl.has.every(Boolean), 'Bauer registriert: ' + JSON.stringify(r.kl));
        if (page !== t.page && page.errors.length) t.ok(false, 'JS-Fehler: ' + page.errors.slice(0, 2).join(' | '));
      } finally { await P.done(); }
    },
  },
];
