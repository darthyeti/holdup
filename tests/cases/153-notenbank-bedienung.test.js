// Notenbank N3c (Ticket 66, Tills test-68: "ich konnte nicht um die Presse herum gehen, das darf nicht passieren"): Um Presse, Foerderband, Ausgabetisch (Pressenraum) und Abgabetisch (Keller) bleibt ein freier Gang von mindestens einer Kachel (Bedienseite und beide Schmalseiten), nichts steht an Wand oder Tuer, alle Bedienpunkte sind vom Eingang aus begehbar und in E-Reichweite. Die Notenbank wird nicht gedreht (kein turnLayout), geprueft werden alle Seeds und damit alle drei Plaetze der Presse.
module.exports = [
  {
    name: 'Bedienbarkeit: Gang um Presse, Band und Ausgabetisch (eine Kachel an allen vier Seiten, nicht an Wand oder Tuer), Abgabetisch im Keller frei umgehbar, jeder Bedienpunkt hat eine erreichbare Kachel in E-Reichweite (alle Plaetze der Presse, 24 Seeds)',
    timeout: 180000,
    async run(t) {
      const r = await t.page.evaluate(() => {
        const D = __dbg, T = 32, bad = [], seen = new Set(), o = { presses: [] }; D.setScenario('nb'); D.setSeedMode('random'); D.setLage([]);
        const SOL = '#WYwCVXfvekqPpbAmrfuN';
        for (let sd = 1; sd <= 24; sd++) {
          const a = D.layoutBase(sd), L = a.nb, key = L.press.join(); if (!seen.has(key)) { seen.add(key); o.presses.push(L.press); }
          D.setSeedMode('random'); D.buildSeed(sd); D.reset(); const g = D.get(), w = D.world(), cl = (x, y) => w.M[y + 6][x + 6];
          const walk = (x, y) => { const c = cl(x, y); return c !== undefined && !SOL.includes(c) && c !== 'L' && c !== 'V'; };
          const R = new Set(['14,30']), q = [[14, 30]]; for (let h = 0; h < q.length; h++) for (const d of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const n = [q[h][0] + d[0], q[h][1] + d[1]]; if (!R.has(n + '') && walk(n[0], n[1])) { R.add(n + ''); q.push(n); } }
          const free = (x, y) => walk(x, y) && cl(x, y) === '.' && R.has(x + ',' + y);
          // Gang um die Maschinenzeile Presse + Band + Tisch
          const x0 = L.press[0], x1 = L.tab[0] + 2, y0 = L.press[1], y1 = L.press[1] + 1; const ring = [];
          for (let x = x0 - 1; x <= x1 + 1; x++) { ring.push([x, y0 - 1], [x, y1 + 1]); } for (let y = y0; y <= y1; y++) ring.push([x0 - 1, y], [x1 + 1, y]);
          const miss = ring.filter(c => !free(c[0], c[1])); if (miss.length) bad.push('Seed ' + sd + ' Gang Presse: ' + JSON.stringify(miss.slice(0, 3)));
          if (!(x0 - 1 >= 18 && x1 + 1 <= 26 && y0 - 1 >= 7 && y1 + 1 <= 14)) bad.push('Seed ' + sd + ' Maschinenzeile ausserhalb der Gangkacheln im Raum');
          if (cl(17, 10) !== 'd' || !free(18, 10)) bad.push('Seed ' + sd + ' Tuer (17,10) oder Vorraum (18,10) verstellt');
          // Abgabetisch im Keller
          const dp = L.dep, dr = []; for (let x = dp[0] - 1; x <= dp[0] + 2; x++) dr.push([x, dp[1] - 1], [x, dp[1] + 1]); dr.push([dp[0] - 1, dp[1]], [dp[0] + 2, dp[1]]);
          const dm = dr.filter(c => !free(c[0], c[1])); if (dm.length) bad.push('Seed ' + sd + ' Gang Abgabetisch: ' + JSON.stringify(dm.slice(0, 3)));
          // Bedienpunkte in E-Reichweite
          for (const it of g.its) { if (!['nbp0', 'nbp1', 'nbp2', 'nbb', 'nbdep', 'nbd0', 'nbd1'].includes(it.t)) continue;
            let best = 1e9; for (const k of R) { const [cx, cy] = k.split(',').map(Number); if (cl(cx, cy) !== '.') continue; const dx = Math.max(cx * T - it.x, 0, it.x - (cx + 1) * T), dy = Math.max(cy * T - it.y, 0, it.y - (cy + 1) * T); best = Math.min(best, Math.hypot(dx, dy)); }
            if (best > it.r - 8) bad.push('Seed ' + sd + ' ' + it.t + ' nicht erreichbar (' + Math.round(best) + ' > ' + (it.r - 8) + ')'); }
          // Weg zwischen Presse und Ausgabetisch: Nordgang und Suedgang haengen zusammen
          if (!R.has((x0) + ',' + (y0 - 1)) || !R.has((x1) + ',' + (y1 + 1))) bad.push('Seed ' + sd + ' Gang zwischen Presse und Tisch');
        }
        o.bad = bad; return o;
      });
      t.eq(r.bad, [], 'alle Gaenge und Bedienpunkte frei: ' + JSON.stringify(r.bad.slice(0, 4)));
      t.ok(r.presses.length === 3, 'alle drei Plaetze der Presse kamen in den Seeds vor: ' + JSON.stringify(r.presses));
    },
  },
];
