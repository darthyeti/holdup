// Messung: Bleibt eine Geisel haengen? (29. Oktober 2026, Flugschreiber vom 28. Oktober 2026: Tills eingeklemmte Geisel, Test 140-geisel-wege)
// Aufruf: cd tests && node geisel-messung.js [Szenarien, Standard gas,jewel,bank,museum,casino] [Seeds je Szenario, Standard 15] [erster Seed, Standard 1]   (HOLDUP_ROOT wie bei den Tests misst einen anderen Stand)
// Je Seed nimmt der Spieler eine Geisel (Phase 2, Polizei ab 3 s, parkende Streifenwagen stempeln ihren Fussabdruck) und laeuft 100 s zufaellig (feste Zufallsfolge). Haengend heisst: Abstand ueber 60 px und seit mehr als 1,5 s ohne Bewegung,
// SOLID: die Geisel steht laenger als 0,5 s in Festem. Ausgabe je Szenario: Zahl der Laeufe, haengende (Seed, Dauer in s, Kachel der Geisel und des Spielers, Abstand) und gute.
const { launch, openGame } = require('./lib');
const SCS = (process.argv[2] || 'gas,jewel,bank,museum,casino').split(','), N = +(process.argv[3] || 15), FROM = +(process.argv[4] || 1);
(async () => {
  const env = await launch(process.env.HOLDUP_ROOT ? { root: process.env.HOLDUP_ROOT } : undefined); const page = await openGame(env);
  for (const sc of SCS) {
    const r = await page.evaluate(([sc, N, FROM]) => {
      const D = __dbg, out = { n: 0, stuck: [], fine: 0 }, T = 32; let rs = 12345; const rnd = () => (rs = (Math.imul(rs, 1664525) + 1013904223) >>> 0) / 4294967296;
      for (let i = 0; i < N; i++) {
        const seed = FROM + i * 7; D.sessReset(); D.setScenario(sc); D.setSeedMode('random'); D.setLage([]); D.setTurn(null); D.buildSeed(seed); D.CFG.policeAt = 3; D.CFG.policeForced = 3;
        const g = D.get(), me = g.me, L = D.LAY(); for (const c of g.cams) c.off = true;
        const civ = g.npcs.find(n => n.k === 'civ' && n.st !== 'away'); if (!civ) continue;
        D.startHeist(false, me, false); for (const n of g.npcs) if (n.k === 'civ') n.st = 'cower';
        me.x = civ.x + 14; me.y = civ.y; D.grabHost(civ, me); out.n++;
        const keys = D.keys; let solT = 0, maxSol = 0, solAt = null, dir = [0, 0], dt = 0, stuckT = 0, maxStuck = 0, worst = null, lastH = [civ.x, civ.y];
        for (let k = 0; k < 30 * 100 && civ.st === 'hostage'; k++) {
          if (dt <= 0) { const a = Math.floor(rnd() * 9); dir = [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]][a]; dt = 5 + Math.floor(rnd() * 40); } dt--;
          keys.d = dir[0] > 0; keys.a = dir[0] < 0; keys.s = dir[1] > 0; keys.w = dir[1] < 0; me.hp = 1e9; D.update(1 / 30);
          const dist = Math.hypot(civ.x - me.x, civ.y - me.y), moved = Math.hypot(civ.x - lastH[0], civ.y - lastH[1]) > .3; lastH = [civ.x, civ.y];
          const inSol = D.isSol(Math.floor(civ.x / T), Math.floor(civ.y / T)); if (inSol) { solT += 1 / 30; if (solT > maxSol) { maxSol = solT; solAt = [Math.floor(civ.x / T), Math.floor(civ.y / T), k]; } } else solT = 0;
          if (dist > 60 && !moved) { stuckT += 1 / 30; if (stuckT > maxStuck) { maxStuck = stuckT; worst = [Math.floor(civ.x / T), Math.floor(civ.y / T), Math.floor(me.x / T), Math.floor(me.y / T), +dist.toFixed(0), D.isSol(Math.floor(civ.x / T), Math.floor(civ.y / T))]; } } else stuckT = 0;
        }
        keys.w = keys.a = keys.s = keys.d = false;
        if (maxSol > .5) out.stuck.push(['SOLID', seed, +maxSol.toFixed(1), solAt]); else if (maxStuck > 1.5) out.stuck.push([seed, +maxStuck.toFixed(1), worst]); else out.fine++;
      }
      return out;
    }, [sc, N, FROM]);
    console.log(sc, JSON.stringify(r).slice(0, 700));
  }
  await env.browser.close(); env.srv.close();
})().catch(e => { console.error(e); process.exit(1); });
