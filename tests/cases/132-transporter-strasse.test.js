// Transporter-Strasse (Paket Transporter, Schleichen und Optik, T4b, Tills Rueckmeldung vom 27. Oktober 2026: die Mission ist wenig abwechslungsreich): Die Strasse hat neben dem Normalfall zwei Varianten aus dem Seed.
// Baustelle (25 %): in der Mitte (x 25 bis 33) sind die beiden noerdlichen Fahrspuren (Zeilen 9 und 10) mit Zaeunen zu, der Wagen faehrt in den Zeilen 11 und 12, die Sperre Mitte besteht nur noch aus zwei Teilstuecken.
// Gassen (35 %): ein bis drei der vier Seitengassen (x 17 bis 19 und 38 bis 40 im Norden, 9 bis 11 und 31 bis 33 im Sueden) sind zugemauert, mindestens eine bleibt offen. Der Rest ist wie bisher.
async function setup(t) {
  await t.loadTool('loopnet.js');
  await t.loadInpage('coop.js');
}
const FIND = `(want) => { const D = __dbg, out = {}; D.setScenario('truck'); D.setSeedMode('random'); D.setLage([]); for (let sd = 1; sd < 400; sd++) { const m = D.genTruckMission(sd); for (const k of want) { const key = k(m); if (key && !out[key]) out[key] = sd; } } return out; }`;
// die vier Seitengassen: x von, x bis, Zeile von, Zeile bis (Reihenfolge wie closed in der Mission)
const ALLEYS = [[17, 19, 1, 6], [38, 40, 1, 6], [9, 11, 15, 22], [31, 33, 15, 22]];

module.exports = [
  {
    name: 'Transporter-Strasse: der Seed waehlt Normalfall, Baustelle oder zugemauerte Gassen (jede Variante kommt vor), alle Karten bestehen die Pruefung der Karte, die Tags nennen die Variante',
    async run(t) {
      await setup(t);
      const r = await t.page.evaluate(`(() => { const D = __dbg, o = { n: 0, st: {}, bad: [], tags: [], zu: {} }, take = { baustelle: [], gassen: [], std: [] }; D.setScenario('truck'); D.setSeedMode('random'); D.setLage([]);
        for (let sd = 1; sd <= 400; sd++) { const m = D.genTruckMission(sd); o.n++; o.st[m.street] = (o.st[m.street] || 0) + 1; if (take[m.street].length < 8) take[m.street].push(sd);
          if (m.street === 'baustelle' && !m.tags.includes('Baustelle')) o.tags.push(sd); if (m.street === 'gassen' && !m.tags.some(x => /Gasse/.test(x))) o.tags.push(sd); if (m.street === 'std' && m.tags.some(x => /Baustelle|Gasse/.test(x))) o.tags.push(sd);
          if (m.street === 'gassen') { const k = m.closed.filter(Boolean).length; o.zu[k] = (o.zu[k] || 0) + 1; } }
        for (const k of Object.keys(take)) for (const sd of take[k]) { D.sessReset(); D.buildSeed(sd); const rep = D.validateMap(D.LAY()); if (!rep.ok) o.bad.push([sd, rep.err.map(e => e.r).join(',')]); }
        return o; })()`);
      t.eq(r.bad, [], 'je acht Karten jeder Variante bestehen validateMap (Seed, Regeln)'); t.eq(r.tags, [], 'die Tags nennen die Variante (und der Normalfall nennt keine)');
      t.ok((r.st.baustelle || 0) >= 70 && (r.st.gassen || 0) >= 100 && (r.st.std || 0) >= 130, 'jede Variante kommt vor: ' + JSON.stringify(r.st)); t.ok(r.zu[1] > 0 && r.zu[2] > 0 && !r.zu[0] && !r.zu[4], 'eine bis drei Gassen sind zu, nie keine und nie alle: ' + JSON.stringify(r.zu));
    },
  },
  {
    name: 'Transporter-Baustelle: in der Mitte sind die Zeilen 9 und 10 zugezaeunt, der Wagen faehrt in den Zeilen 11 und 12 ohne Sperre durch (Auftrag gescheitert), zwei Teilstuecke der Sperre Mitte halten ihn, die anderen Sperren brauchen weiter vier',
    async run(t) {
      await setup(t);
      const r = await t.page.evaluate(`(() => { const D = __dbg, o = {}, f = (${FIND})([m => !m.panne && !m.rev && m.street === 'baustelle' && 'b', m => !m.panne && !m.rev && m.street === 'std' && 's']);
        const build = sd => { D.sessReset(); D.setScenario('truck'); D.setSeedMode('random'); D.setLage([]); D.setTurn('S'); D.buildSeed(sd); D.CFG.snp.from = 99; D.startHeist(false, D.get().me); D.CFG.policeAt = 1e6; D.CFG.policeForced = 1e6; return D.LAY(); };
        const run = sec => { for (let i = 0; i < sec * 30; i++) { const g = D.get(); if (g.ended) return true; const m = g.me; m.hp = 1e9; D.update(1 / 30); } return false; };
        const built = (g, pick) => { for (const b of D.bars()) if (b.rd && b.g === g && (!pick || pick(b))) { b.lv = 1; b.hp = 100; } };
        let L = build(f.b), W = D.world(); const rows = y => { let s = ''; for (let x = 24; x <= 34; x++) s += W.M[y][x]; return s; };
        o.zaun = [9, 10, 11, 12].map(rows); o.spots = [0, 1, 2].map(g => L.spots.filter(s => s.g === g).map(s => s.cells[0][1]).sort((a, b) => a - b).join(',')); o.stBar = [0, 1, 2].map(g => D.bars().filter(b => b.rd && b.g === g).length);
        const gone = run(130); o.durch = [gone, D.get().ended && D.get().ended.title];
        L = build(f.b); built(1); run(100); o.halt = [D.tk().st, Math.round(D.tk().x)];
        L = build(f.s); o.stStd = [0, 1, 2].map(g => D.bars().filter(b => b.rd && b.g === g).length); built(1); run(100); o.haltStd = [D.tk().st, Math.round(D.tk().x)];
        L = build(f.s); built(1, b => b.cells[0][1] < 11); const g2 = run(130); o.nurZwei = [g2, D.tk().st];
        return o; })()`);
      t.eq(r.zaun, ['offfffffffo', 'offfffffffo', 'ooooooooooo', 'ooooooooooo'], 'die Zeilen 9 und 10 sind von x 25 bis 33 zugezaeunt, die Zeilen 11 und 12 frei');
      t.eq(r.spots, ['9,10,11,12', '11,12', '9,10,11,12'], 'die Sperre Mitte hat nur noch die Zeilen 11 und 12'); t.eq(r.stBar, [4, 2, 4], 'zwei Teilstuecke in der Mitte, sonst vier');
      t.eq(r.durch, [true, 'Wagen entkommen'], 'ohne Sperre faehrt der Wagen durch die zwei freien Spuren und der Auftrag scheitert');
      t.eq(r.halt[0], 'stopped', 'zwei Teilstuecke halten ihn'); t.ok(r.halt[1] > 780 && r.halt[1] < 810, 'vor der Sperre Mitte (x 796): ' + r.halt[1]);
      t.eq(r.stStd, [4, 4, 4], 'ohne Baustelle vier Teilstuecke je Sperre'); t.eq(r.haltStd[0], 'stopped', 'vier halten ihn'); t.eq(r.nurZwei, [true, 'gone'], 'zwei von vier halten ihn nicht, er faehrt durch');
    },
  },
  {
    name: 'Transporter-Gassen: die zugemauerten Gassen sind massive Mauer, die offenen bleiben begehbar (Weg von der Strasse bis ans Ende), mindestens eine ist offen, alles andere ist wie im Normalfall',
    async run(t) {
      await setup(t);
      const r = await t.page.evaluate(`(() => { const D = __dbg, o = { zu: [], offen: [], rest: [] }, A = ${JSON.stringify(ALLEYS)}, f = (${FIND})([m => !m.panne && m.street === 'gassen' && m.closed.filter(Boolean).length === 1 && 'g1', m => !m.panne && m.street === 'gassen' && m.closed.filter(Boolean).length === 3 && 'g3', m => !m.panne && m.street === 'std' && 's']);
        const build = sd => { D.sessReset(); D.setScenario('truck'); D.setSeedMode('random'); D.setLage([]); D.setTurn('S'); D.buildSeed(sd); return D.LAY(); };
        const std = (build(f.s), D.world().M.slice());
        for (const k of ['g1', 'g3']) { const L = build(f[k]), W = D.world(), cl = L.mission.closed; o[k] = cl.slice();
          A.forEach((a, i) => { let all = true; for (let y = a[2]; y <= a[3]; y++) for (let x = a[0]; x <= a[1]; x++) { const c = W.M[y][x]; if (c !== '#') all = false; }
            if (cl[i] && !all) o.zu.push([k, i, 'nicht zu']); if (!cl[i]) { const sx = (a[0] + 1) * 32 + 16, sy = (i < 2 ? 7 : 14) * 32 + 16; if (D.pathTo(sx, sy, a[0] + 1, i < 2 ? a[3] : a[2]).length === 0) o.offen.push([k, i, 'kein Weg']); } });
          const M2 = W.M; let diff = 0; for (let y = 0; y < M2.length; y++) for (let x = 0; x < M2[y].length; x++) if (M2[y][x] !== std[y][x]) { const inAlley = A.some((a, i) => cl[i] && x >= a[0] && x <= a[1] && y >= a[2] && y <= a[3]); if (!inAlley) diff++; } o.rest.push([k, diff]); }
        return o; })()`);
      t.eq(r.rest.map(x => x[1]), [0, 0], 'ausserhalb der zugemauerten Gassen ist die Karte wie im Normalfall (Kacheln, die abweichen)'); t.eq(r.zu, [], 'zugemauerte Gassen sind ueberall Mauer'); t.eq(r.offen, [], 'offene Gassen haben einen Weg von der Strasse bis ans Ende');
      t.eq(r.g1.filter(Boolean).length, 1, 'eine Gasse zu'); t.eq(r.g3.filter(Boolean).length, 3, 'drei Gassen zu');
    },
  },
  {
    name: 'Transporter-Strasse im Coop: der Client baut dieselbe Karte (Raster, Sperren, Tags) aus dem Seed, auch bei Baustelle und zugemauerten Gassen',
    async run(t) {
      await setup(t);
      const r = await t.page.evaluate(`(() => { const f = (${FIND})([m => !m.panne && m.street === 'baustelle' && 'b', m => !m.panne && m.street === 'gassen' && 'g', m => !m.panne && m.street === 'std' && 's']), out = []; for (const k of ['b', 'g', 's']) { const G = CT.mkGame('truck', f[k], 2), A = G.A, B = G.clients[0], sig = d => [d.world().M.join(''), d.LAY().mission.tags.join('|'), d.bars().filter(b => b.rd).length]; out.push([k, JSON.stringify(sig(A)) === JSON.stringify(sig(B))]); } return out; })()`);
      t.eq(r.filter(x => !x[1]).map(x => x[0]), [], 'Host und Client haben dieselbe Karte');
    },
  },
];
