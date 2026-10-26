// Messungen zum Coop-Ausbau (docs/coop-ausbau.md): Groesse der Schnappschuesse, Streuung gleicher Seeds, Kosten eines Bildes.
// Aufruf (im Ordner tests/ steht playwright-core, die Hilfen kommen aus tests/lib.js):
//   node tools/messung-netz.js snap   [szenario] [seed]          Schnappschuss-Groesse bei 4 Spielern ueber 240 s Dauergefecht (Spieler unverwundbar)
//   node tools/messung-netz.js gleich [szenario] [seed] [laeufe]  gleiche Karte, gleiche Lage, gleiches Verhalten: was ist gleich, was streut?
//   node tools/messung-netz.js draw   [szenario ...]              Kosten von draw() und tick() (im Headless-Chromium ohne GPU, auf dem Mac mit GPU deutlich weniger)
const lib = require('../tests/lib.js');

const SNAP = (sc, seed) => `(async () => {
  const G = CT.mkGame(${JSON.stringify(sc)}, ${seed}, 4, 40, 10), A = G.A, out = { rows: [] };
  for (const o of A.get().players) { o.hp = 1e6; o.ar = 0; }
  A.CFG.policeAt = 3; A.CFG.policeForced = 3;
  G.clients[0].cv.dispatchEvent(new KeyboardEvent('keydown', { key: 'f', bubbles: true }));
  const c = A.NET.conns[0], send0 = c.send.bind(c), st = { snap: [], other: 0, otherN: 0 };
  c.send = m => { const b = JSON.stringify(m).length; if (m.t === 'snap') st.snap.push(b); else { st.other += b; st.otherN++; } send0(m); };
  for (let sec = 0; sec < 240; sec += 10) {
    G.run(10);
    const g = A.get(), snap = A.buildSnap(), b = JSON.stringify(snap).length;
    out.rows.push({ t: sec + 10, wave: g.waveN, en: snap.en.length, bl: snap.bl.length, bytes: b });
  }
  const t0 = performance.now(); for (let i = 0; i < 300; i++) JSON.stringify(A.buildSnap()); out.buildAndStringifyMs = +((performance.now() - t0) / 300).toFixed(3);
  const sn = st.snap.sort((a, b) => a - b);
  out.sent = { n: sn.length, mean: Math.round(sn.reduce((a, b) => a + b, 0) / sn.length), p50: sn[sn.length >> 1], p95: sn[Math.floor(sn.length * .95)], max: sn[sn.length - 1] };
  out.other = { n: st.otherN, bytes: st.other }; out.big = G.net.stat.big;
  return out; })()`;

const GLEICH = (sc, seed) => `(async () => {
  const G = CT.mkGame(${JSON.stringify(sc)}, ${seed}, 2, 40, 0), A = G.A, out = {}, g0 = A.get();
  out.map = A.LAY().seed; out.its = g0.its.map(it => [it.t, Math.round(it.x), Math.round(it.y)].join(':')).join('|');
  A.reset(); const nsig = () => A.get().npcs.map(q => Math.round(q.x) + ',' + Math.round(q.y)).join(';');
  out.npc = nsig(); A.CFG.policeAt = 1e6; A.CFG.policeForced = 1e6; G.run(20); out.npc20 = nsig();
  A.CFG.policeAt = 3; A.CFG.policeForced = 3; for (const o of A.get().players) o.hp = 2000;
  G.clients[0].cv.dispatchEvent(new KeyboardEvent('keydown', { key: 'f', bubbles: true }));
  const hp = () => A.get().players.reduce((a, o) => a + Math.max(0, o.hp) + Math.max(0, o.ar), 0), h0 = hp();
  G.run(30); out.dmg30 = Math.round(h0 - hp());
  return out; })()`;

const DRAW = (sc) => `(async () => {
  const G = CT.mkGame(${JSON.stringify(sc)}, 321, 4, 40, 10), A = G.A, B = G.clients[0], out = {};
  for (const o of A.get().players) { o.hp = 1e6; o.ar = 0; }
  A.CFG.policeAt = 3; A.CFG.policeForced = 3; B.cv.dispatchEvent(new KeyboardEvent('keydown', { key: 'f', bubbles: true }));
  G.run(70); out.state = { wave: A.get().waveN, en: A.get().en.length };
  const timeIt = (fn, n) => { const t = performance.now(); for (let i = 0; i < n; i++) fn(); return +((performance.now() - t) / n).toFixed(2); };
  out.drawHostMs = timeIt(() => A.draw(), 40); out.drawClientMs = timeIt(() => B.draw(), 40);
  out.tickHostMs = timeIt(() => A.tick(1 / 60), 120); out.tickClientMs = timeIt(() => B.tick(1 / 60), 120);
  return out; })()`;

async function inPage(env, fn) {
  const page = await lib.openGame(env);
  try {
    await lib.loadTool(page, 'loopnet.js'); await lib.loadInpage(page, 'coop.js');
    const r = await page.evaluate(fn);
    if (page.errors.length) r.fehler = page.errors.slice(0, 2);
    return r;
  } finally { await Promise.race([page.ctx.close().catch(() => {}), new Promise(r => setTimeout(r, 8000))]); }
}

(async () => {
  const [mode = 'snap', ...rest] = process.argv.slice(2), env = await lib.launch();
  try {
    if (mode === 'snap') {
      const sc = rest[0] || 'bank', seed = +rest[1] || 321, r = await inPage(env, SNAP(sc, seed));
      console.log(`Schnappschuss, ${sc} Seed ${seed}, 4 Spieler, Spieler unverwundbar (Gegner sammeln sich an)`);
      for (const w of r.rows) console.log(`  t=${w.t} Welle ${w.wave} Gegner ${w.en} Kugeln ${w.bl}: ${w.bytes} Byte`);
      console.log('  gesendet an einen Client:', JSON.stringify(r.sent), '| andere Nachrichten:', JSON.stringify(r.other), '| Nachrichten ab 16.300 Byte:', r.big);
      console.log('  buildSnap + JSON.stringify:', r.buildAndStringifyMs, 'ms je Aufruf');
    } else if (mode === 'gleich') {
      const sc = rest[0] || 'bank', seed = +rest[1] || 321, n = +rest[2] || 6, res = [];
      for (let i = 0; i < n; i++) res.push(await inPage(env, GLEICH(sc, seed)));
      const same = k => res.every(r => r[k] === res[0][k]), d = res.map(r => r.dmg30), m = d.reduce((a, b) => a + b, 0) / n, sd = Math.sqrt(d.reduce((a, b) => a + (b - m) * (b - m), 0) / n);
      console.log(`Gleicher Seed, ${n} Laeufe: Karte gleich ${same('map')}, Beute-Stuecke gleich ${same('its')}, NPC-Ausgangslage gleich ${same('npc')}, NPCs nach 20 s Erkunden gleich ${same('npc20')}`);
      console.log(`  Schaden in 30 s bei gleichem Verhalten: ${d.join(' ')} | Mittel ${m.toFixed(0)}, Streuung ${sd.toFixed(0)} (${(100 * sd / m).toFixed(1)} %)`);
    } else if (mode === 'draw') {
      for (const sc of rest.length ? rest : ['bank', 'casino', 'truck']) console.log(sc, JSON.stringify(await inPage(env, DRAW(sc))));
    } else console.log('Modus snap, gleich oder draw');
  } finally { await env.browser.close(); env.srv.close(); }
})();
