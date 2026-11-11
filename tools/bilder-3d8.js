// 3D-8 (Ticket 157): Abnahmebilder Coop und Zuschauer in 3D (docs/bilder/plan-3d/3d8-*.jpg): Client-Sicht mit Teamfarben, Namen und Funk-Markierung,
// Zuschauer mit freier Kamera (alles sehen), Wettkampf mit Uebersichtskarte. Instanzen ueber die Test-Leitung (tools/loopnet.js, tests/inpage/coop.js),
// deren Leinwaende versteckt sind: das Bild ist die WebGL-Leinwand der Instanz mit ihrem 2D-Canvas (HUD) darueber. Fuer das Bild gestellt. Nur Darstellung, kein Test.
// Aufruf: cd tests && HOLDUP_CHROME=/opt/pw-browsers/chromium node ../tools/bilder-3d8.js [ordner]
const path = require('path');
const fs = require('fs');
const lib = require(path.join(__dirname, '..', 'tests', 'lib'));
const OUT = process.argv[2] || path.join(lib.ROOT, 'docs', 'bilder', 'plan-3d');
const SHOTS = {
  // Client-Sicht: Ueberfall zu zweit, der Host funkt "Achtung, hier!" an einen Punkt vor dem Client, Polizei unterwegs
  'client-sicht': async () => {
    const G = CT.mkGame('bank', 321, 2), A = G.A, B = G.clients[0]; A.CFG.policeAt = 95;
    const pl = A.get().players; pl[0].x = pl[1].x + 110; pl[0].y = pl[1].y - 40; A.startHeist(); G.run(2);
    const q = B.get().p; A.radHost(pl[0], 3, q.x - 120, q.y - 150); G.run(.5);
    await B.view3d.set(true); B.mouse.t = -999; return B;
  },
  // Zuschauer mit freier Kamera ueber der Halle (alles sehen gilt in der freien Kamera immer)
  'zuschauer-frei': async () => {
    const G = CT.mkGame('bank', 321, 3), A = G.A; A.CFG.policeAt = 1e6; A.CFG.policeForced = 1e6; G.run(1);
    const S = CT.addSpec(G, 'zz'); G.run(2); await S.view3d.set(true); S.specKey('v'); S.keys.w = 1; G.run(.25); delete S.keys.w; G.run(3); return S;
  },
  // Wettkampf: zwei Teams auf demselben Seed, Zuschauer bei Team A mit Uebersichtskarte (eigenes Team gefuellt, anderes als Ring)
  wettkampf: async () => {
    const D = CT.mkDuel(2, 2); D.A.CFG.duel.len = 3; D.A.CFG.duel.specDelay = D.B.CFG.duel.specDelay = 2; D.A.duelOpen(); D.run(.3); D.B.duelJoin(D.A.NET.code); D.run(1.5);
    const S = CT.addSpec({ net: D.net, A: D.A, insts: D.insts }); D.run(2); D.A.duelReady(); D.B.duelReady(); D.run(9);
    const pa = D.A.get().players; pa[1].x = pa[0].x + 90; D.run(1); await S.view3d.set(true); D.run(.5); return S;
  },
};
(async () => {
  const env = await lib.launch({ webgl: true });
  for (const [k, f] of Object.entries(SHOTS)) {
    const page = await lib.openGame(env, { gfx: 'mittel' });
    await lib.loadTool(page, 'loopnet.js'); await lib.loadInpage(page, 'coop.js');
    const r = await page.evaluate(async src => {
      const d = await (0, eval)('(' + src + ')')(); d.draw(); d.draw();
      const V = d.view3d.V, c = document.createElement('canvas'); c.width = 1920; c.height = 1088; const x = c.getContext('2d');
      d.draw(); x.drawImage(V.el, 0, 0, 1920, 1088); x.drawImage(d.cv, 0, 0, 1920, 1088);   // im selben Durchlauf: WebGL-Bild noch da
      const i = d.view3d.info(); return { url: c.toDataURL('image/jpeg', .82), info: { state: i.state, errs: i.errs, calls: i.calls, figs: i.figs, vis: i.vis.on, funk: d.view3d.funk().length } };
    }, f.toString());
    const file = path.join(OUT, '3d8-' + k + '.jpg');
    fs.writeFileSync(file, Buffer.from(r.url.split(',')[1], 'base64'));
    console.log(k, JSON.stringify(r.info));
    if (page.errors.length) console.log('Fehler', page.errors.slice(0, 3));
    await page.ctx.close();
  }
  await env.browser.close(); env.srv.close();
})();
