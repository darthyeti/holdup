// Messung: Wie oft haben die fuenf Gebaeude-Generatoren Platz fuer eine Kammer (Abstellraum oder WC) zum Verstecken von Bewusstlosen? (28. Oktober 2026, Plan Kammern in docs/ideen-und-planung.md)
// Aufruf: cd tests && node kammer-messung.js [Szenarien, Standard bank,jewel,gas,museum,casino] [Seeds je Szenario, Standard 40]   (Sperrzonen `LAY.zones` zaehlen seit dem 28. Oktober 2026 nicht mit, PROPS=1: Pflanzen, Baenke, Kisten und Faesser duerfen weichen, HOLDUP_ROOT wie bei den Tests)
// Gesucht wird in den fertigen Karten (Basisorientierung): Kammer innen 2x2, 3x2 oder 2x3 mit Wandring und einer Tuer d. Bedingungen: Innenflaeche frei, mindestens vier Ringkacheln sind schon Wand, Abstand 2 Kacheln zu jeder Wach- und Managerroute und zu den Kassierern,
// kein Posten (Routenpunkt, Kassierer) sieht eine Innenkachel (Sichtlinie, Reichweite 12 Kacheln, nur # und P blocken), alle vorher vom Spawn erreichbaren Routenpunkte bleiben erreichbar, die Tuer ist erreichbar. Kameras zaehlen noch nicht.
// Ausgabe je Szenario: Anteil der Seeds mit mindestens einem Platz (anyPct), mittlere Zahl der Plaetze, Plaetze je Groesse, und warum Kandidaten ausschieden (ring: Dinge im Ring, zu frei: weniger als vier Wandkacheln, Route, Weg, sichtbar, keine Tuer).
const { launch, openGame } = require('./lib');
const SCS = process.argv[2] ? process.argv[2].split(',') : ['bank', 'jewel', 'gas', 'museum', 'casino'], N = +(process.argv[3] || 40);
(async () => {
  const env = await launch(); const page = await openGame(env);
  const out = {};
  for (const sc of SCS) {
    const seeds = [];
    for (let i = 0; i < N; i++) {
      const d = await page.evaluate(([sc, sd]) => { const D = __dbg; D.sessReset(); D.setScenario(sc); D.setSeedMode('random'); D.setLage([]); D.setTurn('S'); D.buildSeed(sd); const w = D.world(), L = D.LAY(), M = w.M.map(r => r.join ? r.join('') : r), sol = {}; for (let y = 0; y < M.length; y++) for (let x = 0; x < M[y].length; x++) { const c = M[y][x]; if (!(c in sol)) sol[c] = D.isSol(x + w.WX0, y + w.WY0); }
        return { M, x0: w.WX0, y0: w.WY0, bld: L.bld, guards: (L.guards || []).map(g => g.route), mgr: L.mgr && L.mgr.route, tellers: L.tellers || [], spawn: L.spawn, sol, cams: (L.cams || []).map(c => [c.x / 32, c.y / 32, c.rng / 32]), zones: L.zones || [], q: L.q || null }; }, [sc, 3 + i * 11]);
      seeds.push(d);
    }
    const res = { n: N, any: 0, cands: 0, why: {}, kinds: {} };
    for (const d of seeds) {
      const { M, x0, y0, bld } = d, H = M.length, Wd = M[0].length, g = M.map(r => r.split(''));
      const at = (x, y) => { const j = y - y0, i = x - x0; return j < 0 || i < 0 || j >= H || i >= Wd ? '#' : g[j][i]; };
      d.sol.g = false; const solid = c => d.sol[c] !== false, free = (x, y) => (process.env.PROPS === '1' ? '.pbkq' : '.').includes(at(x, y)) && x >= bld.x0 && x <= bld.x1 && y >= bld.y0 && y <= bld.y1;
      const pts = []; const seg = r => { if (!r) return; for (let k = 0; k < r.length; k++) { pts.push(r[k]); if (k) { const a = r[k - 1], b = r[k], n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) * 2)); for (let t = 1; t < n; t++) pts.push([a[0] + (b[0] - a[0]) * t / n, a[1] + (b[1] - a[1]) * t / n]); } } };
      d.guards.forEach(seg); seg(d.mgr); d.tellers.forEach(t => pts.push(t));
      const sp = [Math.floor(d.spawn.x / 32), Math.floor(d.spawn.y / 32)];
      { const walk0 = (x, y) => { const c = at(x, y); return !(c in d.sol ? d.sol[c] : true) || c === 'd'; }; const q0 = [sp.slice()], s0 = new Set([sp.join()]); while (q0.length) { const [x, y] = q0.pop(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy, k = nx + ',' + ny; if (s0.has(k) || !walk0(nx, ny)) continue; s0.add(k); q0.push([nx, ny]); } }
        const un = pts.filter((p, i) => i % 7 === 0 && !s0.has(Math.floor(p[0]) + ',' + Math.floor(p[1]))); res.base = (res.base || 0) + (un.length ? 1 : 0); var baseOk = pts.filter((p, i) => i % 7 === 0 && s0.has(Math.floor(p[0]) + ',' + Math.floor(p[1]))); res.baseEx = res.baseEx || (un.length ? JSON.stringify(un.slice(0, 3)) + ' spawn ' + sp : ''); }
      let found = 0;
      for (const [iw, ih] of [[2, 2], [3, 2], [2, 3]]) for (let bx = bld.x0 + 1; bx <= bld.x1 - iw - 1; bx++) for (let by = bld.y0 + 1; by <= bld.y1 - ih - 1; by++) {
        const why = k => { res.why[k] = (res.why[k] || 0) + 1; };
        // innen frei
        let ok = true; for (let x = bx; x < bx + iw && ok; x++) for (let y = by; y < by + ih; y++) if (!free(x, y)) { ok = false; break; }
        if (!ok) continue;
        // Ring: vorhandene Waende zaehlen, freie Kacheln werden Wand, nichts Sonstiges
        const ring = []; for (let x = bx - 1; x <= bx + iw; x++) for (let y = by - 1; y <= by + ih; y++) if (x < bx || x >= bx + iw || y < by || y >= by + ih) ring.push([x, y]);
        let walls = 0, bad = false; for (const [x, y] of ring) { const c = at(x, y); if (c === '#') walls++; else if (!free(x, y)) { bad = true; break; } }
        if (bad) { why('ring'); continue; } if (walls < 4) { why('zu frei'); continue; }
        const inZone = (x, y) => d.zones.some(z => x >= z[0] && x <= z[2] && y >= z[1] && y <= z[3]);   // Tills Entscheidung 28. Oktober 2026: keine Kammer in der Sperrzone
        if (ring.some(([x, y]) => inZone(x, y)) || (() => { for (let x = bx; x < bx + iw; x++) for (let y = by; y < by + ih; y++) if (inZone(x, y)) return true; return false; })()) { why('Sperrzone'); continue; }
        // Tuer: eine Ringkachel (keine Ecke), die freie Kachel dahinter ausserhalb hat
        const doors = ring.filter(([x, y]) => { if (at(x, y) === '#') return false; const inx = x >= bx && x < bx + iw, iny = y >= by && y < by + ih; if (!inx && !iny) return false; const ox = x < bx ? x - 1 : x >= bx + iw ? x + 1 : x, oy = y < by ? y - 1 : y >= by + ih ? y + 1 : y; return free(ox, oy); });
        if (!doors.length) { why('keine Tuer'); continue; }
        // Abstand zu Routen, Postenplaetzen, Kameras
        const box = [bx - 2, by - 2, bx + iw + 1, by + ih + 1]; if (pts.some(p => p[0] >= box[0] && p[0] <= box[2] + 1 && p[1] >= box[1] && p[1] <= box[3] + 1)) { why('Route'); continue; }
        // neues Raster
        const h2 = g.map(r => r.slice()); const set = (x, y, c) => { h2[y - y0][x - x0] = c; }; ring.forEach(([x, y]) => { if (at(x, y) !== '#') set(x, y, '#'); });
        const at2 = (x, y) => { const j = y - y0, i = x - x0; return j < 0 || i < 0 || j >= H || i >= Wd ? '#' : h2[j][i]; };
        const los = (a, b) => { const n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) * 4); for (let t = 1; t < n; t++) { const x = Math.floor(a[0] + (b[0] - a[0]) * t / n + .5 - .5 + .5), y = Math.floor(a[1] + (b[1] - a[1]) * t / n + .5); const c = at2(Math.floor(a[0] + (b[0] - a[0]) * t / n + .5), Math.floor(a[1] + (b[1] - a[1]) * t / n + .5)); if (c === '#' || c === 'P') return false; } return true; };
        let good = null;
        for (const dr of doors) {
          const hh = h2.map(r => r.slice()); const sv = h2; // Tuer setzen
          const prev = h2[dr[1] - y0][dr[0] - x0]; h2[dr[1] - y0][dr[0] - x0] = 'd';
          // versteckte Innenkachel: keine Posten-Sicht (Mitte der Kachel), Sichtweite 12 Kacheln
          const hid = []; for (let x = bx; x < bx + iw; x++) for (let y = by; y < by + ih; y++) { const c = [x + .5, y + .5]; if (!pts.some(p => Math.hypot(p[0] + .5 - c[0], p[1] + .5 - c[1]) < 12 && los([p[0] + .5, p[1] + .5], c))) hid.push([x, y]); }
          // Erreichbarkeit: BFS vom Spawn (4er), Tuer-Aussenkachel muss erreichbar sein, alle Routenpunkte bleiben erreichbar
          const q = [sp.slice()], seen = new Set([sp.join()]); const walk = (x, y) => { const c = at2(x, y); return !(c in d.sol ? d.sol[c] : true) || c === 'd'; };
          while (q.length) { const [x, y] = q.pop(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy, k = nx + ',' + ny; if (seen.has(k) || !walk(nx, ny)) continue; seen.add(k); q.push([nx, ny]); } }
          const reach = !baseOk.some(p => !seen.has(Math.floor(p[0]) + ',' + Math.floor(p[1]))) && hid.length > 0 && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => seen.has((dr[0] + dx) + ',' + (dr[1] + dy)));
          h2[dr[1] - y0][dr[0] - x0] = prev;
          if (hid.length && !reach) why('Weg'); if (!hid.length) why('sichtbar');
          if (reach) { good = { door: dr, hid: hid.length, k: iw + 'x' + ih }; break; }
        }
        if (good) { found++; res.kinds[good.k] = (res.kinds[good.k] || 0) + 1; }
      }
      if (found) res.any++; res.cands += found;
    }
    res.anyPct = Math.round(100 * res.any / N); res.avg = +(res.cands / N).toFixed(1); out[sc] = res; console.log(sc, JSON.stringify({ anyPct: res.anyPct, avgPlaces: res.avg, kinds: res.kinds, pruned: res.why, baseUnreach: res.base, ex: res.baseEx }));
  }
  await env.browser.close(); env.srv.close();
})().catch(e => { console.error(e); process.exit(1); });
