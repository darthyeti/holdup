// Messung: Wie gut klappt das Ausschalten einer Wache (CFG.ko), wenn ein Spieler mit E gehalten hinter ihr herschleicht? (28. Oktober 2026, nach dem Flugschreiber von Till: "der Knockout dauert etwas laenger")
// Aufruf: cd tests && node ko-messung.js [Szenarien, Standard jewel,bank,museum,casino] [Seeds je Szenario, Standard 8] [Versuche je Seed, Standard 12]
//   HOLDUP_ROOT=<Ordner> misst einen anderen Stand des Spiels (Gegenprobe), HOLDUP_CHROME wie bei den Tests, STAND=<f> skaliert die Standzeit der Wachen (Standard 1), SNEAK=1 laeuft mit Shift.
// Aufbau je Versuch: eine Streifenwache, alle anderen weg, Kameras aus, 4 bis 24 s Streife, dann steht der Spieler 28 px hinter ihr, haelt E und folgt mit den echten Tasten (WASD) bis zu 15 s.
// Ausgabe je Szenario: Anteil der Versuche, in denen die ununterbrochene Haltezeit 1,5, 2, 2,5, 3, 4 s erreicht (innerhalb 15 s), die mittlere Zeit bis dahin, Abbrueche des Haltens je Versuch (resets/ep).
// Es zaehlt nur die Wache selbst (Drehen, Weitergehen, Konkurrenz um E). Zeugen (andere Wachen, Kameras, Personal) misst tools/stealth.js (`stealth.koSweep`).
const { launch, openGame } = require('./lib');
const SIM = `([sc, seed, f, eps, sneak]) => {
  const D = __dbg; D.sessReset(); D.setScenario(sc); D.setSeedMode('random'); D.setLage([]); D.buildSeed(seed);
  D.CFG.policeAt = 1e6; D.CFG.policeForced = 1e6; D.CFG.ko.t = 100; /* Haltezeit gross, damit nie ausgeschaltet wird: pr mal 100 ist die ununterbrochene Haltezeit in s */
  const g = D.get(), me = g.me, npcs = g.npcs, keys = D.keys, L = D.LAY();
  const gs = npcs.filter(q => q.k === 'grd' && q.route && q.st !== 'away'); if (!gs.length) return { skip: 'keine Streifenwache' };
  const n = gs[0]; for (const q of npcs) if (q !== n) { q.st = 'away'; q.at = 1e9; } for (const c of g.cams) c.off = true;
  const free = (x, y) => [[0, 0], [-9, -9], [9, -9], [-9, 9], [9, 9]].every(q => !D.isSol(Math.floor((x + q[0]) / 32), Math.floor((y + q[1]) / 32)));
  const Ts = [1.5, 2, 2.5, 3, 4], out = { sc, seed, f, sneak, eps: 0, hit: Ts.map(() => 0), tsum: Ts.map(() => 0), noStart: 0, alarm: 0, walkFrac: 0, resets: 0, frames: 0 };
  const step = () => { const w0 = n.wait; D.update(1 / 30); if (f !== 1 && n.wait > w0 + .3) n.wait *= f; };
  const clear = () => { keys.w = keys.a = keys.s = keys.d = keys.e = keys.Shift = false; };
  me.x = L.spawn.x; me.y = L.spawn.y;
  for (let e = 0; e < eps; e++) {
    clear(); me.x = L.spawn.x; me.y = L.spawn.y; D.setSus(0); me.hp = 100;
    const adv = 4 + Math.random() * 20; for (let i = 0; i < adv * 30; i++) step();
    if (D.get().phase !== 1) { out.alarm++; break; }
    n.alert = 0; n.look = null;
    let placed = false; for (const d of [28, 24, 32, 36]) { const an0 = n.a + Math.PI; for (const da of [0, .5, -.5, 1, -1]) { const x = n.x + Math.cos(an0 + da) * d, y = n.y + Math.sin(an0 + da) * d; if (free(x, y) && D.los(n.x, n.y, x, y)) { me.x = x; me.y = y; placed = true; break; } } if (placed) break; }
    if (!placed) { out.noStart++; continue; }
    out.eps++; const t0 = D.get().time; const first = Ts.map(() => null); let prev = 0, runMax = 0;
    for (let i = 0; i < 15 * 30; i++) {
      const tx = n.x + Math.cos(n.a + Math.PI) * 28, ty = n.y + Math.sin(n.a + Math.PI) * 28, dx = tx - me.x, dy = ty - me.y;
      keys.d = dx > 4; keys.a = dx < -4; keys.s = dy > 4; keys.w = dy < -4; keys.e = true; keys.Shift = !!sneak;
      step(); const held = D.koMi(n).pr * 100; if (n.mvg) out.walkFrac++; out.frames++;
      if (prev > .3 && held === 0) { out.resets++; const dd = Math.hypot(me.x - n.x, me.y - n.y), da = Math.abs(((Math.atan2(me.y - n.y, me.x - n.x) - n.a + 3 * Math.PI) % (2 * Math.PI)) - Math.PI); const why = n.st !== 'idle' ? 'st:' + n.st : n.alert > 0 ? 'alert' : (n.look && n.look.t > 0) ? 'look' : dd >= 36 ? 'dist' : da <= D.CFG.ko.back ? 'winkel' : 'sonst:' + (((D.pickIt(me, -1) || {}).t) || 'nichts'); (out.why = out.why || {})[why] = (out.why[why] || 0) + 1; } prev = held; runMax = Math.max(runMax, held);
      Ts.forEach((T, k) => { if (first[k] === null && held >= T) first[k] = i / 30; });
      if (D.get().phase !== 1) { out.alarm++; break; } if (first[Ts.length - 1] !== null) break;
    }
    first.forEach((v, k) => { if (v !== null) { out.hit[k]++; out.tsum[k] += v; } });
    clear(); D.setSus(0);
    if (D.get().phase !== 1) break;
  }
  out.walkFrac = +(out.walkFrac / Math.max(1, out.frames)).toFixed(2); out.hit = out.hit.map(h => out.eps ? +(h / out.eps).toFixed(2) : 0); out.tavg = out.tsum.map((s, k) => +(s / Math.max(1, Math.round(out.hit[k] * out.eps))).toFixed(1)); delete out.tsum; delete out.frames; return out; }`;
(async () => {
  const scs = (process.argv[2] || 'jewel,bank,museum,casino').split(','), ns = +(process.argv[3] || 8), eps = +(process.argv[4] || 12), f = +(process.env.STAND || 1), sneak = process.env.SNEAK === '1', Ts = [1.5, 2, 2.5, 3, 4];
  const env = await launch(process.env.HOLDUP_ROOT ? { root: process.env.HOLDUP_ROOT } : undefined); const page = await openGame(env);
  for (const sc of scs) {
    const a = { eps: 0, hit: Ts.map(() => 0), tw: Ts.map(() => 0), res: 0, why: {}, skip: 0 };
    for (let i = 0; i < ns; i++) {
      const r = await page.evaluate(`(${SIM})(${JSON.stringify([sc, 11 + i * 7, f, eps, sneak])})`);
      if (r.skip) { a.skip++; continue; } a.eps += r.eps; a.res += r.resets; for (const [k, v] of Object.entries(r.why || {})) a.why[k] = (a.why[k] || 0) + v;
      Ts.forEach((T, k) => { const h = Math.round(r.hit[k] * r.eps); a.hit[k] += h; a.tw[k] += r.tavg[k] * h; });
    }
    const e = Math.max(1, a.eps), p = k => (a.hit[k] / e).toFixed(2), tt = k => (a.tw[k] / Math.max(1, a.hit[k])).toFixed(1);
    console.log(sc.padEnd(7), 'Versuche', a.eps, 'ohne Streifenwache', a.skip, '| Abbrueche je Versuch', (a.res / e).toFixed(2), JSON.stringify(a.why), '| Anteil T=' + Ts.join('/') + ':', Ts.map((T, k) => p(k)).join(' '), '| mittlere Zeit:', Ts.map((T, k) => tt(k)).join(' '));
  }
  await env.browser.close(); env.srv.close();
})().catch(e => { console.error(e); process.exit(1); });
