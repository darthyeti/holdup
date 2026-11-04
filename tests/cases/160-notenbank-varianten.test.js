// Notenbank N7 (Ticket 79, Tills nb-varianten B): Die Anlage wandert je Seed (eigener Strom in nbLayout, CFG.nb.var.on). Tresorraum und Pressenraum tauschen die Seite, die Panzertuer sitzt links, mittig oder rechts, der Keller und die Treppe wandern, die Seitentuer und die Hintertuer der Vorhalle wechseln die Zeile. Fest bleiben vier Ringe, genau eine Engstelle je Ringgrenze, das Loch im Keller und der Abgabetisch neben dem Bohrer. Die Tests 150 bis 159 laufen mit der Klassik-Karte (tests/lib.js setzt __nbVarOff), dieser Test (open: nbvar) mit den Varianten.
const KNOWN = [];
const SOLO = sd => `(() => {
  const D = __dbg; D.sessReset(); D.setScenario('nb'); D.setSeedMode('random'); D.setLage([]); D.buildSeed(${sd}); D.CFG.policeAt = 1e6; D.CFG.policeForced = 1e6; D.CFG.nb.alarmAt = 1e6; D.reset(); D.startHeist(false);
  const me = D.get().me; me.hp = 1e6; me.ar = 1e6; D.nbS().t0 = D.get().tH; D.nbd().fa.length = 0;
  const step = s => { for (let i = 0; i < s * 30; i++) { me.hp = 1e6; me.dead = false; D.update(1 / 30); } };
  return { D, step, me };
})()`;
module.exports = [
  {
    name: 'Varianten: 100 Seeds ergeben viele verschiedene Anordnungen, jede Achse (Tresorseite, Panzertuer, Keller, Treppe, Seitentuer, Hintertuer) nimmt alle Werte an, gleicher Seed gleiche Anordnung, mit var.on 0 immer der Klassik-Grundriss',
    open: { nbvar: true },
    timeout: 120000,
    async run(t) {
      const r = await t.page.evaluate(() => {
        const D = __dbg, o = { sig: new Set(), ax: { vs: new Set(), panzer: new Set(), keller: new Set(), treppe: new Set(), seite: new Set(), hinten: new Set() } }; D.setScenario('nb'); D.setSeedMode('random'); D.setLage([]);
        for (let sd = 1; sd <= 100; sd++) { const v = D.layoutBase(sd).nb.var; o.sig.add(JSON.stringify(v)); for (const k in o.ax) o.ax[k].add(v[k]); }
        o.det = JSON.stringify(D.layoutBase(17).nb.var) === JSON.stringify(D.layoutBase(17).nb.var);
        o.axn = Object.fromEntries(Object.entries(o.ax).map(([k, s]) => [k, [...s].sort()])); o.n = o.sig.size;
        D.CFG.nb.var.on = 0; o.off = new Set([1, 2, 3, 4, 5, 6, 7, 8].map(s => JSON.stringify(D.layoutBase(s).nb.var))).size; o.classic = D.layoutBase(3).nb.var;
        return { n: o.n, det: o.det, axn: o.axn, off: o.off, classic: o.classic };
      });
      t.ok(r.n >= 40, 'mindestens 40 verschiedene Anordnungen in 100 Seeds: ' + r.n);
      t.eq(r.axn, { vs: ['O', 'W'], panzer: [11, 13, 15], keller: [11, 14, 16], treppe: [11, 13, 14, 15, 16], seite: [24, 25, 26], hinten: [24, 25, 26, 27] }, 'alle Werte je Achse kommen vor (Treppe: 11 bis 16 je nach Keller, 12 nie)');
      t.ok(r.det, 'gleicher Seed gleiche Anordnung');
      t.eq([r.off, r.classic], [1, { vs: 'W', panzer: 15, keller: 14, treppe: 16, seite: 25, hinten: 25 }], 'var.on 0: immer der Klassik-Grundriss');
    },
  },
  {
    name: 'Varianten: 60 Seeds. validateMap ohne Abweichung, genau eine Engstelle je Ringgrenze (Flutfuellung mit der Engstelle als Wand), Ring 1 hat genau drei Eingaenge, Tresortuer, Pressentuer, Treppe und Panzertuer sind Oeffnungen am richtigen Ort, Tresor und Presse liegen auf den gegenueberliegenden Seiten, das Loch bleibt nur ueber den Keller erreichbar',
    open: { nbvar: true },
    timeout: 240000,
    async run(t) {
      const r = await t.page.evaluate(() => {
        const D = __dbg, bad = [], SOL = '#WYwCVXfvekqPpbAmrfuN'; D.setScenario('nb'); D.setSeedMode('random'); D.setLage([]);
        for (let sd = 1; sd <= 60; sd++) {
          const a = D.layoutBase(sd), G = a.nb.gates, v = D.validateMap(a); for (const e of v.err) bad.push(sd + ' validateMap ' + e.r);
          D.buildLay(a); const w = D.world(), cl = (x, y) => w.M[y + 6][x + 6], key = c => c.join(), z = a.nb.zone;
          const reach = (from, to, blocked, tunnelOpen) => { const bl = new Set((blocked || []).map(key)), seen = new Set([key(from)]), q = [from];
            for (let h = 0; h < q.length; h++) { const c = q[h]; if (c[0] === to[0] && c[1] === to[1]) return true; for (const d of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const n = [c[0] + d[0], c[1] + d[1]], k = key(n), ch = cl(n[0], n[1]); const rigc = n[0] >= z[0] && n[0] <= z[2] && n[1] >= z[1] && n[1] <= z[3]; if (seen.has(k) || bl.has(k) || ch === undefined || (SOL.includes(ch) && !(rigc && tunnelOpen))) continue; seen.add(k); q.push(n); } } return false; };
          const out = [14, 30], mid = c => [Math.floor((c[0][0] + c[c.length - 1][0]) / 2), c[0][1]], flat = g => [].concat(...g);
          const s2 = [G.schleuse[0][0], G.schleuse[0][1] - 2], s3 = [a.nb.vspots[0][0] < 14 ? 13 : 13, 10], s4 = [z[2] + 1, z[1] + 1], s1 = [14, 26];
          const R = [reach(out, s2, G.schleuse), reach(out, s2, []), reach(out, s3, G.panzer), reach(out, s3, []), reach(out, s4, G.treppe), reach(out, s4, []), reach(s2, s3, G.panzer), reach(s3, s4, G.treppe)];
          if (JSON.stringify(R) !== JSON.stringify([false, true, false, true, false, true, false, false])) bad.push(sd + ' Engstellen ' + JSON.stringify(R));
          const r1 = [reach(out, s1, flat([G.haupt, G.seite, G.hinten])), reach(out, s1, flat([G.seite, G.hinten])), reach(out, s1, flat([G.haupt, G.hinten])), reach(out, s1, flat([G.haupt, G.seite]))];
          if (JSON.stringify(r1) !== JSON.stringify([false, true, true, true])) bad.push(sd + ' Ring 1 ' + JSON.stringify(r1));
          if (reach(out, z.slice(0, 2), [], false) || !reach(out, z.slice(0, 2), [], true)) bad.push(sd + ' Loch');
          if (![G.haupt, G.seite, G.hinten, G.schleuse, G.panzer, G.treppe].every(g => g.every(c => !SOL.includes(cl(c[0], c[1])) && cl(c[0], c[1]) !== undefined || cl(c[0], c[1]) === 'L'))) bad.push(sd + ' Engstelle nicht offen');
          if (!(cl(G.hinten[0][0], G.hinten[0][1]) === 'L' && cl(a.nb.stair[0], 6) === 'd' && cl(G.panzer[0][0], 15) === 'd' && cl(G.panzer[1][0], 15) === 'd')) bad.push(sd + ' Tueren');
          // Tresor und Presse: Seiten, Tuer, Platz
          const vd = a.vault.door, east = a.nb.var.vs === 'O', pd = east ? 10 : 17;
          if (cl(vd[0], 9) !== 'V' || cl(vd[0], 10) !== 'V' || vd[0] !== (east ? 17 : 10) || a.vault.dir !== (east ? 1 : -1)) bad.push(sd + ' Tresortuer');
          if (cl(pd, 10) !== 'd') bad.push(sd + ' Pressentuer');
          const px = a.nb.press[0], inPress = east ? px >= 2 && a.nb.tab[0] + 2 <= 8 : px >= 19 && a.nb.tab[0] + 2 <= 25; if (!inPress) bad.push(sd + ' Presse im falschen Raum');
          if (!a.nb.vspots.every(c => east ? c[0] >= 19 && c[0] <= 26 : c[0] >= 1 && c[0] <= 8)) bad.push(sd + ' Regale auf der falschen Seite');
          if (!a.vault.bundles.every(c => a.nb.vspots.some(q => q[0] === c[0] && q[1] === c[1]) || cl(c[0], c[1]) === '.')) bad.push(sd + ' Buendel im Tresor');
          const pad = a.vault.pad; if (cl(pad[0], pad[1]) !== '.') bad.push(sd + ' Platz vor dem Tresor');
          // Stern: drei Ringe in der Vorhalle, Treppe liegt im Keller-Bereich
          const K = a.nb.keller; if (!(a.nb.stair[0] >= K[0] && a.nb.stair[0] <= K[2] && z[0] >= K[0] && z[2] <= K[2])) bad.push(sd + ' Treppe oder Loch ausserhalb des Kellers');
          if (a.nb.rings.length !== 4) bad.push(sd + ' Ringe');
        }
        return bad;
      });
      t.eq(r, [], 'Varianten: ' + JSON.stringify(r.slice(0, 6)));
    },
  },
  {
    name: 'Varianten: Bohrer und Sturm funktionieren in jeder Anordnung (acht verschiedene Seeds): der Bohrer ist nach drillT fertig und das Loch offen, jeder Ring hat Haltepunkte, der Sturm erreicht den Keller, die Beamten stehen im Ring',
    open: { nbvar: true },
    timeout: 480000,
    async run(t) {
      const seeds = [3, 11, 19, 27, 35, 43, 51, 59];
      const out = [];
      for (const sd of seeds) {
        const r = await t.page.evaluate(`(() => {
          const H = ${SOLO(sd)}, D = H.D, o = { v: JSON.stringify(D.LAY().nb.var), spots: [1, 2, 3, 4].map(r => D.nbSpots(r).length) };
          const pr = D.nbp(); D.nbd().st = 1; D.nbd().p = 0; H.step(D.CFG.nb.drillT / 3); o.p3 = Math.round(D.nbd().p * 100);
          H.step(151); H.step(70); o.ring = D.nbS().ring; o.D = D.nbh().D; o.inRing = D.get().en.filter(e => e.stm && e.hp > 0).every(e => D.nbRingAt(e.x, e.y) >= 1); o.n = D.get().en.filter(e => e.stm && e.hp > 0).length; o.st = D.nbd().st;
                    return o; })()`);
        out.push([sd, r]);
      }
      for (const [sd, r] of out) {
        t.ok(r.spots.every(n => n >= 3), 'Seed ' + sd + ' ' + r.v + ': Haltepunkte je Ring ' + JSON.stringify(r.spots));
        t.ok(r.p3 >= 20 && r.p3 <= 45, 'Seed ' + sd + ': der Bohrer laeuft (nach einem Drittel der Zeit ' + r.p3 + ' %)');
        t.ok(r.n >= 1 && r.inRing, 'Seed ' + sd + ': Sturm-Beamte stehen im Gebaeude auf Positionen ' + JSON.stringify([r.n, r.inRing, r.ring, r.D]));
        t.ok(r.ring >= 2, 'Seed ' + sd + ': der Sturm nimmt mindestens Ring 2 ein: ' + r.ring);
      }
    },
  },
  {
    name: 'Varianten: der Bohrer wird in jeder Anordnung fertig, das Loch ist offen (Kachel begehbar), Bedienpunkte der Presse und des Abgabetisches sind vom Eingang erreichbar (24 Seeds)',
    open: { nbvar: true },
    timeout: 300000,
    async run(t) {
      const r = await t.page.evaluate(() => {
        const D = __dbg, T = 32, bad = [], SOL = '#WYwCVXfvekqPpbAmrfuNL'; D.setScenario('nb'); D.setSeedMode('random'); D.setLage([]);
        for (let sd = 1; sd <= 24; sd++) {
          D.sessReset(); D.buildSeed(sd); D.CFG.policeAt = 1e6; D.CFG.policeForced = 1e6; D.CFG.nb.alarmAt = 1e6; D.reset(); D.startHeist(false);
          const g = D.get(), me = g.me, L = D.LAY().nb, w = D.world(), cl = (x, y) => w.M[y + 6][x + 6]; D.nbd().fa.length = 0;
          const walk = (x, y) => { const c = cl(x, y); return c !== undefined && (!SOL.includes(c) || c === 'V'); };
          const R = new Set(['14,30']), q = [[14, 30]]; for (let h = 0; h < q.length; h++) for (const d of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const n = [q[h][0] + d[0], q[h][1] + d[1]]; if (!R.has(n + '') && walk(n[0], n[1])) { R.add(n + ''); q.push(n); } }
          for (const it of g.its) { if (!['nbp0', 'nbp1', 'nbp2', 'nbb', 'nbdep', 'nbd0', 'nbd1'].includes(it.t)) continue;
            let best = 1e9; for (const k of R) { const [cx, cy] = k.split(',').map(Number); if (cl(cx, cy) !== '.') continue; const dx = Math.max(cx * T - it.x, 0, it.x - (cx + 1) * T), dy = Math.max(cy * T - it.y, 0, it.y - (cy + 1) * T); best = Math.min(best, Math.hypot(dx, dy)); }
            if (best > it.r - 8) bad.push(sd + ' ' + it.t + ' nicht erreichbar (' + Math.round(best) + ')'); }
          // Gang um die Maschinenzeile und die Tuer des Pressenraums
          const east = L.var.vs === 'O', x0 = L.press[0], x1 = L.tab[0] + 2, y0 = L.press[1], y1 = y0 + 1, ring = [], free = (x, y) => cl(x, y) === '.' && R.has(x + ',' + y);
          for (let x = x0 - 1; x <= x1 + 1; x++) ring.push([x, y0 - 1], [x, y1 + 1]); for (let y = y0; y <= y1; y++) ring.push([x0 - 1, y], [x1 + 1, y]);
          if (ring.some(c => !free(c[0], c[1]))) bad.push(sd + ' Gang Presse');
          const pd = east ? [10, 10] : [17, 10], pin = east ? [9, 10] : [18, 10]; if (cl(pd[0], pd[1]) !== 'd' || !free(pin[0], pin[1])) bad.push(sd + ' Pressentuer verstellt');
          // Bohrer laufen lassen
          D.nbd().st = 1; D.nbd().p = 0; for (let i = 0; i < (D.CFG.nb.drillT + 10) * 30; i++) { me.hp = 1e6; me.dead = false; D.update(1 / 30); }
          const z = L.zone, w2 = D.world(), c2 = (x, y) => w2.M[y + 6][x + 6]; if (D.nbd().st !== 3 || c2(z[0], z[1]) !== '.' || c2(z[2], z[3]) !== '.') bad.push(sd + ' Loch nicht offen ' + D.nbd().st + ' ' + c2(z[0], z[1]));
        }
        return bad;
      });
      t.eq(r, [], 'Bohrer, Loch und Bedienpunkte: ' + JSON.stringify(r.slice(0, 6)));
    },
  },
];
