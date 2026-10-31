// Messung: Wie lange stehen Wachen und Angestellte an Routenpunkten still? (31. Oktober 2026, Ticket #51, Ausschalten weniger fummelig)
// Aufruf: cd tests && node stand-messung.js [Szenarien, Standard bank,jewel,gas,museum,casino,truck] [Seeds je Szenario, Standard 10] [Sekunden je Seed, Standard 240]
//   HOLDUP_ROOT=<Ordner> misst einen anderen Stand. Der Spieler steht weit weg (kein Aufmerksamkeitsreiz), Kameras aus. Gezaehlt wird jede ununterbrochene Pause eines Personals
//   (nicht still, hat eine Route oder wandert, keine Wegstrecke, kein Blickziel): Ausgabe je Szenario und Art (grd, mgr, tel, civ-Angestellte...) kleinste, 5. Perzentil, Mittel, Anzahl.
const { launch, openGame } = require('./lib');
const SIM = `([sc, seed, secs]) => {
  const D = __dbg; D.sessReset(); D.setScenario(sc); D.setSeedMode('random'); D.setLage([]); D.buildSeed(seed); D.CFG.policeAt = 1e6; D.CFG.policeForced = 1e6;
  const g = D.get(), me = g.me, npcs = g.npcs; for (const c of g.cams) c.off = true;
  const st = new Map(), out = []; let t = 0;
  for (let i = 0; i < secs * 30; i++) { me.x = -300; me.y = -300; D.update(1 / 30); t += 1 / 30;
    for (const n of npcs) { if (n.still || n.st !== 'idle' || (n.k === 'civ' && !n.uc && !n.route && n.k === 'civ')) { st.delete(n.id); continue; }
      const stand = !n.mvg && !(n.path && n.path.length) && !(n.look && n.look.t > 0);
      if (stand) { st.set(n.id, (st.get(n.id) || 0) + 1 / 30); } else if (st.has(n.id)) { const d = st.get(n.id); if (d > 0.2 && t - d > 1.5) out.push([n.k, n.route ? 'r' : 'w', +d.toFixed(2)]); st.delete(n.id); } } }
  return out; }`;
(async () => {
  const scs = (process.argv[2] || 'bank,jewel,gas,museum,casino,truck').split(','), ns = +(process.argv[3] || 10), secs = +(process.argv[4] || 240);
  const env = await launch(process.env.HOLDUP_ROOT ? { root: process.env.HOLDUP_ROOT } : undefined); const page = await openGame(env);
  for (const sc of scs) {
    const by = {};
    for (let i = 0; i < ns; i++) { let r; try { r = await page.evaluate(`(${SIM})(${JSON.stringify([sc, 11 + i * 7, secs])})`); } catch (e) { console.log(sc, 'Fehler', String(e).slice(0, 120)); break; } for (const [k, rt, d] of r) (by[k + '/' + rt] = by[k + '/' + rt] || []).push(d); }
    for (const [k, a] of Object.entries(by)) { a.sort((x, y) => x - y); console.log(sc.padEnd(7), k.padEnd(7), 'n', String(a.length).padStart(4), 'min', a[0].toFixed(2), 'p5', a[Math.floor(a.length * .05)].toFixed(2), 'mittel', (a.reduce((s, v) => s + v, 0) / a.length).toFixed(2)); }
  }
  await env.browser.close(); env.srv.close();
})().catch(e => { console.error(e); process.exit(1); });
