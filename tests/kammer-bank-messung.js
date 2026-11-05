// Messung K4 (Bank mit Kammer): Anteil der Seeds mit Kammer, Rueckfaelle (Kammer gewuerfelt, aber validateMap lehnt ab), Verteilung nach Lage der Straße und Tausch.
// Aufruf: cd tests && node kammer-bank-messung.js [Szenario bank] [Seeds 150] [Lagen S,N,E,W]
const { launch, openGame } = require('./lib');
const SC = process.argv[2] || 'bank', N = +(process.argv[3] || 150);
(async () => {
  const env = await launch(); const page = await openGame(env);
  const r = await page.evaluate(([SC, N, process_off]) => {
    const D = __dbg; D.sessReset(); if (process_off) D.CFG.stash.on = 0; D.setScenario(SC); D.setSeedMode('random'); D.setLage([]); D.setTurn('S');
    const res = { n: N, st: 0, kinds: {}, err: 0, why: {}, swp: 0, stSwp: 0, tries: {} };
    for (let s = 1; s <= N; s++) {
      const lay = D.layoutBase(s); const rep = D.validateMap(lay);
      if (lay.stash) { res.st++; res.kinds[lay.stash.kind] = (res.kinds[lay.stash.kind] || 0) + 1; }
      if (lay.q && lay.q.sw) { res.swp++; if (lay.stash) res.stSwp++; }
      if (rep.err.length || rep.warn.length) { res.err++; for (const e of rep.err.concat(rep.warn)) res.why[e.r] = (res.why[e.r] || 0) + 1; }
      res.tries[lay.tries || 0] = (res.tries[lay.tries || 0] || 0) + 1;
    }
    return res;
  }, [SC, N, process.env.OFF === '1']);
  console.log(JSON.stringify(r)); await env.close && env.close(); process.exit(0);
})();
