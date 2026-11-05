// Transporter: mehr Deckung auf der Strasse (Ticket 100, 5. November 2026): truckLayout stellt zusaetzliche Kisten und Faesser auf die Gehwege (Zeilen 7 und 14) und in die Seitengassen.
// Das Raster bleibt 60 x 24 (Gehweg- und Strassenzeilen, Sperren, Posten und Wagenplaetze unveraendert). Die Strasse des Transporters wird nie gedreht (layoutFor gibt sie unveraendert zurueck),
// geprueft wird sie trotzdem fuer alle vier erzwungenen Lagen, alle Strassenvarianten (std, baustelle, gassen) und die Gegenrichtung.
async function setup(t) {
  await t.loadTool('loopnet.js');
}
module.exports = [
  {
    name: 'Karte: alle Strassenvarianten (Normal, Baustelle, Gassen, je vier Seeds, dazu die Gegenrichtung) bestehen validateMap, in allen vier erzwungenen Lagen, die Karte bleibt 60 x 24 und gleich',
    async run(t) {
      await setup(t);
      const r = await t.page.evaluate(`(() => { const D = __dbg, o = { bad: [], n: 0, dim: new Set(), same: true }; D.setScenario('truck'); D.setSeedMode('random'); D.setLage([]); const take = { baustelle: [], gassen: [], std: [], rev: [] };
        for (let sd = 1; sd <= 400; sd++) { const m = D.genTruckMission(sd); if (take[m.street].length < 4) take[m.street].push(sd); if (m.rev && take.rev.length < 4) take.rev.push(sd); }
        for (const turn of ['S', 'N', 'E', 'W']) for (const k of Object.keys(take)) for (const sd of take[k]) { D.sessReset(); D.setTurn(turn); D.buildSeed(sd); const L = D.LAY(), M = D.world().M; o.n++; o.dim.add(M.length + 'x' + M[0].length); const rep = D.validateMap(L); if (!rep.ok) o.bad.push([turn, k, sd, rep.err.map(e => e.r).join(',')]);
          if (turn === 'S') (window.__ref = window.__ref || {})[sd] = M.join(''); else if (window.__ref[sd] !== M.join('')) o.same = false; }
        return Object.assign(o, { dim: [...o.dim] }); })()`);
      t.eq(r.bad, [], 'validateMap besteht (Lage, Variante, Seed, Regeln)'); t.eq(r.dim, ['24x60'], 'Raster 24 x 60 (' + r.n + ' Karten)'); t.ok(r.same, 'die erzwungene Lage aendert die Transporter-Karte nicht');
    },
  },
  {
    name: 'Mehr Deckung: im Normalfall stehen mindestens 40 Kisten und Faesser auf der Karte (vorher 27), je mindestens vier auf jedem der beiden Gehwege und in den Gassen, die Postenzeilen 8 und 13 und die vier Fahrspuren bleiben frei von Kisten und Faessern',
    async run(t) {
      await setup(t);
      const r = await t.page.evaluate(`(() => { const D = __dbg, o = {}; D.setScenario('truck'); D.setSeedMode('random'); D.setLage([]); let sd = 0; for (let s = 1; s < 400 && !sd; s++) if (D.genTruckMission(s).street === 'std') sd = s;
        D.sessReset(); D.setTurn('S'); D.buildSeed(sd); const M = D.world().M, cnt = (y0, y1) => { let n = 0; for (let y = y0; y <= y1; y++) for (let x = 0; x < M[0].length; x++) if ('kq'.includes(M[y][x])) n++; return n; };
        o.all = cnt(0, 23); o.north = cnt(7, 7); o.south = cnt(14, 14); o.alleyN = cnt(1, 6); o.alleyS = cnt(15, 22); o.posts = cnt(8, 8) + cnt(13, 13); o.road = cnt(9, 12);
        o.ends = D.pathTo(2 * 32 + 16, 8 * 32 + 16, 57, 8).length > 0; return o; })()`);
      t.ok(r.all >= 40, 'mindestens 40 Kisten und Faesser: ' + r.all); t.ok(r.north >= 4 && r.south >= 4, 'gehwegseitig mindestens je vier: ' + r.north + ' / ' + r.south); t.ok(r.alleyN >= 4 && r.alleyS >= 4, 'in den Gassen mindestens je vier: ' + r.alleyN + ' / ' + r.alleyS);
      t.eq([r.posts, r.road], [0, 0], 'Postenzeilen und Fahrspuren frei'); t.ok(r.ends, 'der Gehweg ist von West nach Ost begehbar');
    },
  },
];
