// Kloetzchen-Stil, Dinge Teil B (Ticket 198, Schritt 4c und 4d): Museum, Casino, Notenbank, Gefaengnis zeichnen ihre Szenario-Teile aus Kloetzchen (KL.obj), ohne Bauer faellt jede Art auf den
// klassischen Bauplan zurueck. Kein Pixelvergleich. Ohne WebGL 2 uebersprungen.
const lib = require('../lib');
const { glPage } = require('../glshare');   // gemeinsamer WebGL-Browser (tests/glshare.js)
module.exports = [{
  name: 'Kloetzchen Dinge B: Museum, Casino, Notenbank und Gefaengnis zeichnen Szenario-Teile als Kloetzchen (k-dinge), ohne Bauer faellt jede Art auf den klassischen Plan zurueck, keine Fehler',
  timeout: 280000,
  async run(t) {
    const P = await glPage(t); if (!P) return;
    try {
      const r = await P.page.evaluate(`(async () => { const D = __dbg, o = {};
        await D.view3d.set(true);
        for (const sc of ['museum', 'casino', 'nb', 'prison']) {
          D.setN(sc === 'prison' ? 2 : 1); if (sc === 'prison') D.setPz(1); D.sessReset(); D.setScenario(sc); D.setSeedMode('random'); D.setLage([]); D.setTurn('S'); D.buildSeed(5);
          for (let i = 0; i < 60; i++) { D.get().me.hp = 1e9; D.update(1 / 30); }
          D.draw(); D.draw(); const V = D.view3d.V, K = V.kl(), i = V.info(), n = i.scenN.slice(), dinge = i.k.dinge;
          const bak = Object.assign({}, K.KL.objs); for (const k in bak) if (k.length > 1) delete K.KL.objs[k]; D.draw(); D.draw(); const j = V.info(); Object.assign(K.KL.objs, bak);
          o[sc] = { err: i.err + j.err, dinge, dingeOhne: j.k.dinge, classic: [i.scenN[0], j.scenN[0]], kinds: Object.keys(i.scen).filter(k => K.KL.hasObj(k) || K.KL.hasObj(k + ':' + 'x')).length };
        }
        await D.view3d.set(false); return o; })()`);
      t.note(JSON.stringify(r));
      for (const sc of ['museum', 'casino', 'nb', 'prison']) {
        const q = r[sc];
        t.ok(q.err === '', sc + ': keine Fehler ' + q.err);
        t.ok(q.dinge > 0 && q.dingeOhne === 0, sc + ': Szenario-Teile als Kloetzchen (' + q.dinge + '), ohne Bauer keine, Fallback zeichnet klassisch (' + q.classic.join(' -> ') + ')');
        t.ok(q.classic[1] >= q.classic[0], sc + ': ohne Bauer zeichnet der klassische Plan mindestens so viele Koerper');
      }
      if (P.page.errors.length) t.ok(false, 'JS-Fehler: ' + P.page.errors.slice(0, 2).join(' | '));
    } finally { await P.done(); }
  },
}];
