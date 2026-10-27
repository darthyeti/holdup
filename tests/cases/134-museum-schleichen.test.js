// Museum und Schleichen (Paket Transporter, Schleichen und Optik, T5, Tills Wunsch vom 27. Oktober 2026: das Museum soll sich besser fuers Schleichen eignen, die Polizeiphase bleibt):
// (1) Die Nachtwaechter bleiben an den Wegpunkten laenger stehen (CFG.museum.pause, ihr Kegel zeigt dann laenger in eine Richtung, das gibt Luecken zum Durchschlupfen),
// (2) wer im Kegel steht, fuellt den Balken gnaedigerer (CFG.museum.seen 56 statt 70 pro Sekunde, 1,8 s bis 100),
// (3) der Sicherheitsraum ist das Versteck fuer Bewusstlose (von den Galerien nicht einsehbar, die Streife geht nicht hinein), mitten in der Galerie findet ihn die andere Wache,
// (4) der Hauptschalter (Kameras aus) macht das Verstecken vor den Kameras unnoetig, danach sind sie wieder scharf.
async function setup(t) {
  await t.loadTool('loopnet.js');
  await t.loadInpage('coop.js');
}
// Museum mit mindestens zwei Wachen (Seeds 1 bis 120, der erste Treffer), ohne Lage-Tags, Kameras aus, Polizei weit weg; der Spieler steht ausserhalb des Gebaeudes am Spawn.
const SETUP = `(sd) => { const D = __dbg; D.sessReset(); D.setScenario('museum'); D.setSeedMode('random'); D.setLage([]); D.setTurn('S'); let s = sd;
  if (s == null) for (s = 1; s < 120; s++) { D.buildSeed(s); if (D.get().npcs.filter(q => q.k === 'grd').length >= 2) break; } D.buildSeed(s); D.CFG.policeAt = 1e6; D.CFG.policeForced = 1e6;
  const g = D.get(), me = g.me, L = D.LAY(), W = D.world(), guards = g.npcs.filter(q => q.k === 'grd'); for (const c of g.cams) c.off = true; me.x = L.spawn.x; me.y = L.spawn.y; L.mission.blackoutAt = null; for (const q of g.npcs) if (q.st === 'away') q.at = 1e9;   // keine Ereignisse (Stromausfall, Wachwechsel) im Test
  return { D, g, me, L, W, guards, seed: s }; }`;

module.exports = [
  {
    name: 'Museum: die Nachtwaechter stehen an den Wegpunkten CFG.museum.pause s (2 bis 4), auf den anderen Karten bleibt es bei 1 bis 2,5 s',
    async run(t) {
      await setup(t);
      const r = await t.page.evaluate(`(() => { const o = {}, walk = (sc, sd) => { const D = __dbg; D.sessReset(); D.setScenario(sc); D.setSeedMode('random'); D.setLage([]); D.setTurn('S'); D.buildSeed(sd); D.CFG.policeAt = 1e6; D.CFG.policeForced = 1e6; const g = D.get(), me = g.me, L = D.LAY(); for (const c of g.cams) c.off = true;
          const q = g.npcs.find(n => n.k === 'grd' && n.route && !n.still && n.st !== 'away'); if (!q) return null; const iv = []; let cur = 0, was = true; for (let i = 0; i < 30 * 260; i++) { me.x = L.spawn.x; me.y = L.spawn.y; me.hp = 1e9; D.update(1 / 30); const mv = q.mvg; if (!mv) cur += 1 / 30; else { if (cur > 0.05 && !was) iv.push(cur); cur = 0; } was = mv; if (D.get().phase !== 1) break; }
          return { n: iv.length, min: +Math.min(...iv.slice(1)).toFixed(2), max: +Math.max(...iv.slice(1)).toFixed(2), phase: D.get().phase }; };
        o.museum = walk('museum', 31); o.jewel = walk('jewel', 31); o.bank = walk('bank', 5017); o.P = __dbg.CFG.museum.pause; return o; })()`);
      t.eq(r.P, [2, 4], 'CFG.museum.pause ist der Bereich [2, 4] s');
      t.ok(r.museum && r.museum.n >= 6, 'Aufbau: die Wache geht ihre Runde: ' + JSON.stringify(r.museum)); t.eq(r.museum.phase, 1, 'es gab keinen Alarm');
      t.ok(r.museum.min >= r.P[0] - .15 && r.museum.max <= r.P[1] + .3, 'im Museum steht sie ' + r.P[0] + ' bis ' + r.P[1] + ' s: ' + JSON.stringify(r.museum));
      t.ok(r.museum.max - r.museum.min > .4, 'die Pausen streuen: ' + JSON.stringify(r.museum));
      for (const k of ['jewel', 'bank']) if (r[k]) t.ok(r[k].min >= .85 && r[k].max <= 2.8, k + ': unveraendert 1 bis 2,5 s: ' + JSON.stringify(r[k]));
    },
  },
  {
    name: 'Museum: eine Wache im Kegel fuellt den Verdacht mit CFG.museum.seen (56 pro Sekunde), Schleichen mal 0,8',
    async run(t) {
      await setup(t);
      const r = await t.page.evaluate(`(() => { const o = {}, S = (${SETUP})(), { D, g, me, L, W, guards } = S, q = guards[0], K = D.CFG.museum, free = (x, y) => [[0, 0], [-9, -9], [9, -9], [-9, 9], [9, 9]].every(p => !D.isSol(Math.floor((x + p[0]) / 32), Math.floor((y + p[1]) / 32)));
        for (const n of g.npcs) if (n !== q) { n.st = 'away'; n.at = 1e9; } q.still = true; q.route = null; q.path = []; q.alert = 0; q.look = null;
        let ok = false; for (let i = 0; i < 24 && !ok; i++) { const an = i * Math.PI / 12, x = q.x + Math.cos(an) * 90, y = q.y + Math.sin(an) * 90; const tx = Math.floor(x / 32), ty = Math.floor(y / 32); if (free(x, y) && D.los(q.x, q.y, x, y) && tx > L.bld.x0 && tx < L.bld.x1 && ty > L.bld.y0 && ty < L.bld.y1) { me.x = x; me.y = y; q.base = Math.atan2(y - q.y, x - q.x); q.a = q.base; ok = true; } }
        o.platz = ok; const pos = [me.x, me.y]; D.update(1 / 30); const a0 = D.get().sus; for (let i = 0; i < 15; i++) { me.x = pos[0]; me.y = pos[1]; q.base = Math.atan2(pos[1] - q.y, pos[0] - q.x); D.update(1 / 30); } o.laufen = D.get().sus - a0; o.seen = K.seen; o.net = D.CFG.watch.net ? D.CFG.watch.down : 0; o.phase = D.get().phase; return o; })()`);
      t.eq(r.platz, true, 'Aufbau: ein Platz im Blick der Wache'); t.eq(r.seen, 56, 'CFG.museum.seen ist 56'); t.eq(r.phase, 1, 'noch kein Alarm');
      t.ok(Math.abs(r.laufen - (r.seen - r.net) * 0.5) < 2, 'in einer halben Sekunde steigt der Balken um rund ' + (r.seen - r.net) * .5 + ' (Rate minus Abbau, wenn das Netz an ist): ' + r.laufen.toFixed(1));
    },
  },
  {
    name: 'Museum: ein Bewusstloser im Sicherheitsraum wird von der anderen Wache nie gefunden (60 s Streife), mitten in der Galerie im Blick der Wache gibt es Alarm',
    async run(t) {
      await setup(t);
      const r = await t.page.evaluate(`(() => { const o = {}, run = hide => { const S = (${SETUP})(), { D, g, me, L, W, guards } = S, a = guards[0], b = guards[1]; D.koMi(a).act(me);
          if (hide) { let mx = -1, my = -1; for (let y = W.WY0; y < W.WY0 + W.H && mx < 0; y++) for (let x = W.WX0; x < W.WX0 + W.W; x++) if (W.cell(x, y) === 'm') { mx = x; my = y; break; } let pick = null; for (let dy = 1; dy <= 4 && !pick; dy++) for (let dx = -1; dx <= 3 && !pick; dx++) if (W.cell(mx + dx, my + dy) === '.' && !D.isSol(mx + dx, my + dy)) pick = [mx + dx, my + dy]; o.raum = pick; a.x = pick[0] * 32 + 16; a.y = pick[1] * 32 + 16; }
          else { b.still = true; b.route = null; b.path = []; let ok = false; for (let i = 0; i < 24 && !ok; i++) { const an = i * Math.PI / 12, x = a.x + Math.cos(an) * 110, y = a.y + Math.sin(an) * 110; if (!D.isSol(Math.floor(x / 32), Math.floor(y / 32)) && D.los(a.x, a.y, x, y)) { b.x = x; b.y = y; b.base = Math.atan2(a.y - y, a.x - x); b.a = b.base; ok = true; } } o.platz = ok; }
          for (let i = 0; i < 30 * 60 && D.get().phase === 1; i++) { me.x = L.spawn.x; me.y = L.spawn.y; D.update(1 / 30); } return D.get().phase; };
        o.versteck = run(true); o.offen = run(false); return o; })()`);
      t.ok(r.raum, 'Aufbau: ein Platz im Sicherheitsraum neben den Monitoren: ' + JSON.stringify(r.raum)); t.eq(r.versteck, 1, 'im Sicherheitsraum bleibt er unentdeckt'); t.eq(r.platz, true, 'Aufbau: die Wache steht in der Galerie im Blick'); t.eq(r.offen, 2, 'in der Galerie im Blick einer Wache gibt es Alarm');
    },
  },
  {
    name: 'Museum: nach dem Hauptschalter (Kameras aus) bleibt ein Bewusstloser im Blick einer Kamera unentdeckt, sind die Kameras wieder scharf, gibt es Alarm',
    async run(t) {
      await setup(t);
      const r = await t.page.evaluate(`(() => { const o = {}, S = (${SETUP})(), { D, g, me, L, guards } = S, a = guards[0]; for (const n of guards) if (n !== a) { n.st = 'away'; n.at = 1e9; } D.koMi(a).act(me);
        const free = (x, y) => [[0, 0], [-9, -9], [9, -9], [-9, 9], [9, 9]].every(p => !D.isSol(Math.floor((x + p[0]) / 32), Math.floor((y + p[1]) / 32))); const c = g.cams[0]; let ok = false;
        for (let i = 0; i < 48 && !ok; i++) { const an = i * Math.PI / 24, x = a.x + Math.cos(an) * 150, y = a.y + Math.sin(an) * 150; if (free(x, y) && D.los(x, y, a.x, a.y)) { c.x = x; c.y = y; c.a0 = Math.atan2(a.y - y, a.x - x); c.amp = 0; c.off = false; ok = true; } } o.platz = ok;
        const sw = g.its.find(i => i.t === 'sw'); o.sw = !!sw; sw.act(me); o.aus = D.get().camDown; for (let i = 0; i < 30 * 30; i++) { me.x = L.spawn.x; me.y = L.spawn.y; D.update(1 / 30); } o.waehrend = [D.get().phase, Math.round(D.get().camDown)];
        for (let i = 0; i < 30 * 40 && D.get().phase === 1; i++) { me.x = L.spawn.x; me.y = L.spawn.y; D.update(1 / 30); } o.danach = [D.get().phase, a.st]; return o; })()`);
      t.eq(r.platz, true, 'Aufbau: eine Kamera mit Blick auf den Koerper'); t.eq(r.sw, true, 'Aufbau: Hauptschalter da'); t.ok(r.aus > 30, 'Aufbau: Kameras aus fuer ' + r.aus + ' s');
      t.eq(r.waehrend[0], 1, 'waehrend die Kameras aus sind, gibt es keinen Alarm'); t.eq(r.danach[0], 2, 'danach gibt es Alarm');
    },
  },
];
