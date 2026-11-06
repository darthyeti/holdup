// Ticket #127: Der Fluchtwagen hupt zweimal kurz, wenn er am Treffpunkt haelt (auch am Ausweichpunkt, auch bei der Rueckkehr).
// Ausgeloest nur ueber evt('s',['horn',x,y]), Position ist die Mitte des Wagens. Andere Fahrzeuge (Streifenwagen, Panzerwagen, zivile Autos) rufen horn nie.
const PRE = `(sc, from, turn) => { const D = __dbg; D.setScenario(sc); D.setSeedMode('random'); D.setLage([]); const C = D.CFG; C.alt.on = 1; C.alt.p = 1; C.vanLock = 0; C.policeAt = 1e6; C.policeForced = 1e6; C.vanStay = 1e6; C.vanCall = 1; C.meet.p = 0;
  let seed = null; for (let s = from || 1; s < 200 && seed == null; s++) { D.setTurn(turn || 'S'); D.buildSeed(s + 1000); D.buildSeed(s); if (D.alt()) seed = s; } if (seed == null) throw new Error('kein Seed mit Ausweichpunkt'); return seed; }`;
const HOOK = `window.__hn = []; SND.horn = (...a) => { window.__hn.push(a); };`;

module.exports = [
  {
    name: 'Hupe: Ankunft am Treffpunkt loest genau ein Hupereignis mit der Position des Wagens aus, der Client bekommt es, nichts anderes hupt',
    timeout: 200000,
    async run(t) {
      await t.loadTool('loopnet.js'); await t.loadInpage('coop.js');
      const r = await t.page.evaluate(({ PRE, HOOK }) => {
        const o = {}, seed = (0, eval)(PRE)('bank', 1), pre = insts => { for (const d of insts) { const C = d.CFG; C.alt.on = 0; C.vanLock = 0; C.policeAt = 1e6; C.policeForced = 1e6; C.vanStay = 1e6; C.vanCall = 1; C.meet.p = 0; } };
        const G = CT.mkGame('bank', seed, 2, 40, 0, null, 'S', pre), { A } = G; (0, eval)(HOOK);
        A.startHeist(false, A.get().me); A.callVan();
        for (let i = 0; i < 20 * 60 && !A.get().vanArr; i++) G.run(1 / 60); o.vorHalt = window.__hn.length;
        for (let i = 0; i < 30 * 60 && Math.abs(A.get().vanX - A.LANE().van.stop) > 2; i++) G.run(1 / 60);
        G.run(2);
        o.n = window.__hn.length; o.args = window.__hn.map(a => a.map(v => Math.round(v)));
        o.mid = A.LANE().van.mid(A.LANE().van.stop).map(Math.round);
        G.run(20); o.nSpaeter = window.__hn.length;
        return o;
      }, { PRE, HOOK });
      t.eq(r.vorHalt, 0, 'vor dem Halten kein Hupen');
      t.eq(r.n, 2, 'ein Ereignis, bei Host und Client je einmal gehoert (2 Instanzen): ' + r.n);
      t.eq(r.args[0], r.mid, 'Position ist die Mitte des haltenden Wagens: ' + JSON.stringify(r.args[0]) + ' gegen ' + JSON.stringify(r.mid));
      t.eq(r.nSpaeter, 2, 'danach nie wieder (Streifenwagen, zivile Autos, stehender Wagen hupen nicht)');
    },
  },
  {
    name: 'Hupe: Ausweichen loest am Ausweichpunkt wieder ein Hupen aus, nicht schon beim Ausweichen selbst',
    timeout: 200000,
    async run(t) {
      await t.loadTool('loopnet.js'); await t.loadInpage('coop.js');
      const r = await t.page.evaluate(({ PRE, HOOK }) => {
        const o = {}, seed = (0, eval)(PRE)('bank', 1), pre = insts => { for (const d of insts) { const C = d.CFG; C.alt.on = 1; C.alt.p = 1; C.vanLock = 0; C.policeAt = 1e6; C.policeForced = 1e6; C.vanStay = 1e6; C.vanCall = 1; C.meet.p = 0; } };
        const G = CT.mkGame('bank', seed, 2, 40, 0, null, 'S', pre), { A } = G; (0, eval)(HOOK);
        A.startHeist(false, A.get().me); A.callVan(); G.run(25); o.a = window.__hn.length;
        A.altSwap(false); G.run(0.05); o.sofort = window.__hn.length; G.run(25); o.b = window.__hn.length;
        o.stop = A.get().vanMode === 0 && Math.abs(A.get().vanX - A.LANE().van.stop) <= 2;
        return o;
      }, { PRE, HOOK });
      t.eq(r.a, 2, 'erste Ankunft: ein Ereignis (2 Instanzen)'); t.eq(r.sofort, 2, 'beim Ausweichen selbst noch kein neues Hupen');
      t.eq(r.b, 4, 'Ankunft am Ausweichpunkt: wieder ein Hupen'); t.ok(r.stop, 'Wagen steht am Ausweichpunkt');
    },
  },
  {
    name: 'Hupe: der Klang entsteht ohne Fehler und NaN, ist hoerbar, endlich, nicht uebersteuert, kurz (zwei Toene), mit Abstand leiser; Werte in TUNE.horn',
    async run(t) {
      await t.page.evaluate(`SND.frame = () => {}; SND.work = () => {}; window.__rend = async (fn, sec) => { const ctx = new OfflineAudioContext(2, Math.round(44100 * (sec || 3)), 44100); await new Promise(r => setTimeout(r, 60)); SND._reinit(ctx); SND.listen(0, 0); fn(); const b = await ctx.startRendering();
        const d = b.getChannelData(0); let pk = 0, e = 0, bad = 0, last = 0; for (let i = 0; i < d.length; i++) { const v = d[i]; if (!isFinite(v)) bad++; pk = Math.max(pk, Math.abs(v)); e += v * v; if (Math.abs(v) > .004) last = i; }
        return { pk, rms: Math.sqrt(e / d.length), bad, dur: last / 44100 }; };`);
      const r = await t.page.evaluate(async () => {
        SND.setLos(null);
        const o = { near: await __rend(() => SND.horn(0, 50), 2), far: await __rend(() => SND.horn(0, 500), 2), gone: await __rend(() => SND.horn(0, 5000), 2) };
        o.tune = SND.tune.horn; o.shot = (await __rend(() => SND.shot('pistol'), 2)).pk; return o;
      });
      t.eq(r.near.bad, 0, 'keine NaN'); t.ok(r.near.pk > .03, 'hoerbar (' + r.near.pk.toFixed(3) + ')'); t.ok(r.near.pk < .4 && r.near.pk < r.shot, 'nicht uebersteuert und leiser als ein Schuss (' + r.near.pk.toFixed(3) + ' gegen ' + r.shot.toFixed(3) + ')');
      t.ok(r.near.dur > .3 && r.near.dur < 1.3, 'zwei kurze Toene, Dauer ' + r.near.dur.toFixed(2) + ' s');
      t.ok(r.far.rms < r.near.rms * .6 && r.far.rms > 0, 'mit Abstand leiser, aber da ' + JSON.stringify([r.near, r.far])); t.eq(r.gone.pk, 0, 'weit weg stumm');
      t.eq(r.tune.n, 2, 'zweimal'); t.ok(r.tune.f.length === 2, 'zwei Tonhoehen');
    },
  },
];
