// Notenbank-Messung (N5, Ticket 75, docs/tests-und-messwerte.md): spielt den Verteidigungs-Bot (tools/bot.js, bot.nb) ueber viele Seeds mit einer Strategie und fasst zusammen.
// Aufruf (vom Projektordner, Chromium ueber HOLDUP_CHROME wie bei den Tests):
//   node tools/messung-nb.js <n> '<Strategie als JSON>' [from] [parallel] [cfg-JSON]
// NB_VAR=0 misst den Klassik-Grundriss (CFG.nb.var.on 0), sonst laufen die Varianten aus dem Seed (N7).
// Strategie = Optionen von bot.nb, zum Beispiel frueh: '{"press":false,"gier":0}', lange: '{"press":true,"gier":150000,"stay":420}'. cfg-JSON ueberschreibt Werte in CFG.nb (zum Beispiel '{"drillT":90}').
// Ausgabe: eine Zeile JSON mit Siegquote, Zeiten, Beute (Tresor, Presse, Abgabe), Druckstufe, tiefstem Ring, Stillstaenden und den verlorenen Seeds. Rauschen bei n 40 rund 7 Prozentpunkte.
const lib = require('../tests/lib.js'), fs = require('fs'), path = require('path');
(async () => {
  const [n = 20, strat = '{}', from = 7000, par = 2, cfg = '{}'] = process.argv.slice(2), env = await lib.launch(), src = fs.readFileSync(path.join(lib.ROOT, 'tools', 'bot.js'), 'utf8');
  const N = +n, F = +from, P = Math.max(1, +par), parts = Array.from({ length: P }, (_, i) => []);
  for (let i = 0; i < N; i++) parts[i % P].push(F + i);
  try {
    const res = (await Promise.all(parts.map(async seeds => {
      const page = await lib.openGame(env, process.env.NB_VAR === '0' ? {} : { nbvar: true }); await page.addScriptTag({ content: src });
      try { return await page.evaluate(([seeds, strat, cfg]) => { Object.assign(__dbg.CFG.nb, JSON.parse(cfg)); const o = JSON.parse(strat); return seeds.map(sd => { const r = bot.nb(Object.assign({}, o, { seed: sd })); r.seed = sd; return r; }); }, [seeds, strat, cfg]); }
      finally { await Promise.race([page.ctx.close().catch(() => {}), new Promise(r => setTimeout(r, 8000))]); }
    }))).flat().sort((a, b) => a.seed - b.seed);
    const w = res.filter(r => r.res === 'WIN'), avg = (a, f) => a.length ? Math.round(a.reduce((x, r) => x + f(r), 0) / a.length * 10) / 10 : null, sum = f => res.reduce((x, r) => x + f(r), 0);
    console.log(JSON.stringify({
      n: N, strat: JSON.parse(strat), cfg: JSON.parse(cfg), win: Math.round(100 * w.length / N), tWin: avg(w, r => r.t), holeT: avg(res.filter(r => r.holeT != null), r => r.holeT), hole: res.filter(r => r.holeT != null).length,
      secured: avg(res, r => r.secured), securedWin: avg(w, r => r.secured), vault: avg(res, r => r.vault), press: avg(res, r => r.press), dep: avg(res, r => r.dep), printed: avg(res, r => r.printed), lvl: avg(res, r => r.lvl), maxD: avg(res, r => r.maxD), hold: avg(res, r => r.hold), minHp: avg(res, r => r.minHp),
      dstop: { beschuss: sum(r => r.dstop.beschuss), beamter: sum(r => r.dstop.beamter), defekt: sum(r => r.dstop.defekt) }, pstop: { papier: sum(r => r.pstop.papier), stau: sum(r => r.pstop.stau), unbetreut: sum(r => r.pstop.unbetreut), voll: sum(r => r.pstop.voll) },
      lost: res.filter(r => r.res !== 'WIN').map(r => r.seed + '@' + r.t + (r.res === 'TIMEOUT' ? 'T' : '')).join(','),
    }));
    if (process.env.NB_ALL) console.log(JSON.stringify(res));
  } finally { await env.browser.close(); env.srv.close(); }
})();
