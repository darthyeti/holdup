// Ticket #33 (Unsichtbares Hindernis mit Fahrzeugschatten): Bank-Karten aus genLayout werden zur Haelfte laengs gespiegelt (mirrorLayout). Die Autos im Hof (ycars) stehen als feste v-Kacheln im Raster,
// ihr Sprite kommt aus lay.decor. Spiegelte mirrorLayout das Raster, aber nicht lay.decor, wurde das Auto im Osten als Wagen gebaut, im Westen blieben v-Kacheln und der Schatten ohne Auto stehen:
// ein unsichtbares Hindernis (Seed 967914, Flugschreiber von Till vom 29. Oktober 2026).
// Pruefung: Nach dem Aufbau (keine Polizei, kein Fluchtwagen) liegt jede v-Kachel unter einem Wagen (c.cells) oder unter einem nicht echten Auto der Kulisse (lay.decor ohne decorReal, gemalt).
module.exports = [
  {
    name: 'Autos im Hof: nach dem Spiegeln der Bank gehoert jede feste v-Kachel zu einem sichtbaren Auto (Wagen oder gemalte Kulisse), Seed 967914 und 20 weitere in drei Lagen',
    timeout: 180000,
    async run(t) {
      const r = await t.page.evaluate(() => {
        const D = __dbg, T = 32, bad = [], st = { flip: 0, maps: 0 };
        D.setScenario('bank'); D.setSeedMode('random'); D.setLage([]);
        const seeds = [967914]; for (let s = 1; s <= 20; s++) seeds.push(s * 137);
        for (const turn of ['S', 'S+', 'N+']) for (const sd of seeds) {
          D.setTurn(turn); D.buildSeed(sd + 1000); D.buildSeed(sd);
          const L = D.LAY(), W = D.world(), real = new Set(L.decorReal.map(d => d.i)), own = new Set(), tag = turn + '#' + sd;
          st.maps++; if (L.flip) st.flip++;
          for (const c of D.get().cars) for (const q of c.cells || []) own.add(q[0] + ',' + q[1]);
          for (const d of L.decor) if (!real.has(d.i)) { const x0 = Math.round(d.x / T) - 2, y0 = Math.round(d.y / T) - 1; for (let x = x0; x < x0 + 4; x++) for (let y = y0; y < y0 + 2; y++) own.add(x + ',' + y); }
          for (let y = W.WY0; y < W.WY0 + W.H; y++) for (let x = W.WX0; x < W.WX0 + W.W; x++) if (W.cell(x, y) === 'v' && !own.has(x + ',' + y)) bad.push(tag + ': v ohne Auto bei ' + x + ',' + y);
        }
        return { bad: bad.slice(0, 12), n: bad.length, st };
      });
      t.eq(r.bad, [], 'feste v-Kacheln ohne sichtbares Auto (' + r.n + ')');
      t.ok(r.st.flip >= 10, 'es muessen gespiegelte Karten dabei sein: ' + JSON.stringify(r.st));
    },
  },
];
