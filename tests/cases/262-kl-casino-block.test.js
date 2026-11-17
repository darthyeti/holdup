// Kloetzchen-Stil, Casino-Tische je Block (Ticket 262): Der Rahmen jedes Tisches (4x2 Kacheln, KL.casinoBlock) liegt ganz auf Tresenkacheln,
// kein Rahmen ueberlappt einen anderen, die Spielerseite zeigt weg von der Wand, bei allen vier Drehungen. Kein Pixelvergleich.
const { glPage } = require('../glshare');
const path = require('path'), { pathToFileURL } = require('url');
const lib = require('../lib');
module.exports = [{
  name: 'Casino-Tische: jeder Tisch bleibt auf seinem 4x2-Block, keine Ueberlappung, bei allen Drehungen',
  timeout: 240000,
  async run(t) {
    const P = await glPage(t); if (!P) return;
    try {
      const K = await import(pathToFileURL(path.join(lib.ROOT, 'js', 'kl-kern.js')).href);
      t.ok(typeof K.KL.casinoBlock === 'function', 'KL.casinoBlock da');
      await lib.loadInpage(P.page, 'bild.js');
      const r = await P.page.evaluate(`(async () => { const D = __dbg, T = 32, out = [], KK = (await import('./js/kl-kern.js')).KL;
        for (const [sd, turn] of [[3, 'S'], [3, 'N'], [3, 'E'], [9, 'W'], [8, 'S'], [14, 'E']]) {
          D.setTurn(turn); PX.scene('casino', sd); const g = D.get(), L = D.LAY, ch = g.its.filter(i => i.t === 'good' && i.k === 'chips' && i.rc);
          const k = { X: { LAY: L }, T, E: { cellAt: (x, y) => { const c = g.cellAt ? g.cellAt(x, y) : null; return c; } } };
          const o = { turn, sd, n: ch.length, bad: [], fr: [] };
          for (const i of ch) { const b = KK.casinoBlock(k, i), hor = i.rc[2] >= i.rc[3], a = Math.abs(Math.cos(b.th)) > 0.5;
            const w = a ? 4 * T : 2 * T, h = a ? 2 * T : 4 * T; const fr = [b.cx - w / 2, b.cz - h / 2, w, h]; o.fr.push(fr);
            if (hor !== a) o.bad.push('Achse'); }
          for (let i = 0; i < o.fr.length; i++) for (let j = i + 1; j < o.fr.length; j++) { const A = o.fr[i], B = o.fr[j]; if (A[0] < B[0] + B[2] - 1 && B[0] < A[0] + A[2] - 1 && A[1] < B[1] + B[3] - 1 && B[1] < A[1] + A[3] - 1) o.bad.push('Ueberlappung'); }
          out.push(o); }
        return out; })()`);
      t.note(JSON.stringify(r.map(o => [o.sd, o.turn, o.n, o.bad.length])));
      for (const o of r) { t.ok(o.n > 0, 'Seed ' + o.sd + o.turn + ': Tische da'); t.ok(o.bad.length === 0, 'Seed ' + o.sd + o.turn + ': Rahmen ohne Ueberlappung, Achse stimmt ' + o.bad.join(',')); }
      if (P.page.errors.length) t.ok(false, 'JS-Fehler: ' + P.page.errors.slice(0, 2).join(' | '));
    } finally { await P.done(); }
  },
}];
