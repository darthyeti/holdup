// Tankstelle mit Kammer (K5), Ticket #110: Die Hintertuer (4,-3) fuehrt in den Gang x4..5 und von dort ins Lager. Die zwei Schreibtische standen frueher unter dem Gang (x4..5, y1) und
// trennten ihn vom Laden (nur zerlegbar, validateMap meldete eingang-verstellt). Jetzt muss von jeder Aussentuer ausser der Fluchttuer ein freier Weg in den Laden fuehren.
const { coopGame } = require('../lib');

module.exports = [
  {
    name: 'Tankstelle mit Kammer: von der Hintertuer fuehrt ein freier Weg (ohne Moebel zu zerlegen) in den Laden, keine Warnung eingang-verstellt',
    timeout: 200000,
    async run(t) {
      await t.loadInpage('turn.js');
      const r = await t.page.evaluate(() => {
        const D = __dbg, C = D.CFG, keep = C.meet.p; C.meet.p = 0; const o = { n: 0, st: 0, blocked: [], warn: [] };
        try {
          D.setScenario('gas'); D.setSeedMode('random'); D.setLage([]); D.setTurn('S');
          for (let s = 1; s <= 150; s++) {
            const lay = D.layoutBase(s); o.n++; if (!lay.stash) continue; o.st++;
            const w = D.world(), ver = D.validateMap(lay).warn.filter(e => e.r === 'eingang-verstellt'); if (ver.length) o.warn.push(s + ' ' + ver.map(e => e.m).join(';'));
            // Flut von der Kachel hinter der Hintertuer (4,-2) ueber freie Kacheln (Tueren d und L zaehlen als begehbar) bis in die Verkaufsflaeche (Zeilen 6 ff.)
            const seen = new Set(['4,-2']), q = [[4, -2]]; let hit = false;
            for (let h = 0; h < q.length && !hit; h++) {
              const [x, y] = q[h]; if (y >= 6 && y <= 5 + lay.q.sd && x >= 1 && x <= lay.q.sw) { hit = true; break; }
              for (const d of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
                const nx = x + d[0], ny = y + d[1], k = nx + ',' + ny;
                if (seen.has(k) || nx < 0 || ny < -3 || ny > 5 + lay.q.sd || nx > lay.q.sw + 1) continue;
                if (D.isSol(nx, ny) && !'dL'.includes(w.cell(nx, ny))) continue;
                seen.add(k); q.push([nx, ny]);
              }
            }
            if (!hit) o.blocked.push(s);
          }
        } finally { C.meet.p = keep; }
        return o;
      });
      t.ok(r.st >= 50, 'genug Karten mit Kammer: ' + r.st + ' von ' + r.n);
      t.eq(r.blocked, [], 'Seeds, in denen die Hintertuer nicht frei in den Laden fuehrt');
      t.eq(r.warn, [], 'Warnung eingang-verstellt');
    },
  },
];
