// Umriss der Figuren im Kloetzchen-Stil (Ticket 248, js/kl-kern.js outline, Stile X.olv, Taste F6): 0 wie bisher, 1 duenner und halbtransparent, 2 nur bei aehnlichem Grund, 3 in der Spielerfarbe.
// Der Stil wird gemerkt (localStorage holdup.umriss), F6 schaltet weiter, alle Stile zeichnen ohne Fehler. Ohne WebGL 2 uebersprungen.
const { glPage } = require('../glshare');   // gemeinsamer WebGL-Browser (tests/glshare.js)
module.exports = [{
  name: 'Kloetzchen-Umriss: Stile 0 bis 3 (dick wie bisher, duenn halbtransparent, bei aehnlichem Grund, Spielerfarbe), F6 schaltet weiter und merkt den Stil, jeder Stil zeichnet ohne Fehler',
  timeout: 240000,
  async run(t) {
    const P = await glPage(t); if (!P) return;
    try {
      const r = await P.page.evaluate(`(async () => { const D = __dbg, o = {};
        D.setScenario('bank'); D.buildLay(D.layoutFor(5)); D.startHeist(); await D.view3d.set(true); D.draw(); D.draw();
        const K = D.view3d.V.kl(), k = K.kit, T = D.get().me; o.start = D.view3d.olv;
        const fig = (kind, sc) => ({ k: kind, x: T.x, y: T.y, a: 0, row: kind === 'cop' ? 0 : 1, col: 0, hit: 0, lie: 0, al: 1, sh: -1, rf: 0, bag: 0, fl: 0, w: 0, ar: 0, sc });
        o.st = {}; for (const v of [0, 1, 2, 3]) { D.view3d.olv = v; D.draw(); D.draw(); k.outline(true, fig('pl', '#3f78d8')); const pl = k.olState(); k.outline(true, fig('cop', '#ff0000')); const cop = k.olState(); o.st[v] = { pl, cop, err: D.view3d.V.info().err } }
        D.view3d.olv = 2; o.saved = localStorage.getItem('holdup.umriss');
        while (V3OPT.mode !== '3d') V3OPT.cycle(); const key = () => document.getElementById('c').dispatchEvent(new KeyboardEvent('keydown', { key: 'F6' })); key(); o.after = D.view3d.olv; key(); key(); o.wrap = D.view3d.olv; D.view3d.olv = 1; o.banner = D.msgs().banner;
        await D.view3d.set(false); return o; })()`);
      t.note(JSON.stringify(r));
      const s = r.st;
      t.ok(Object.values(s).every(q => q.err === ''), 'jeder Stil zeichnet ohne Fehler');
      t.ok(s[0].pl.t > 0 && s[0].pl.a === 1, 'Stil 0: Umriss wie bisher (Breite ' + s[0].pl.t + ', Deckkraft ' + s[0].pl.a + ')');
      t.ok(s[1].pl.t < s[0].pl.t * .7 && s[1].pl.a < .7, 'Stil 1: duenner (' + s[1].pl.t + ') und halbtransparent (' + s[1].pl.a + ')');
      t.ok(s[2].pl.a >= 0 && s[2].pl.a <= 1 && s[2].pl.t <= s[0].pl.t, 'Stil 2: Deckkraft nach Farbabstand zum Boden (' + s[2].pl.a + ' Spieler, ' + s[2].cop.a + ' Polizist)');
      t.ok(s[3].pl.c !== s[0].pl.c && s[3].cop.c === s[0].cop.c, 'Stil 3: nur der Spieler in seiner Farbe (Spieler ' + s[3].pl.c.toString(16) + ' gegen ' + s[0].pl.c.toString(16) + ', Polizist unveraendert)');
      t.eq(r.saved, '2', 'der Stil wird gemerkt');
      t.eq([r.start, r.after, r.wrap], [1, 3, 1], 'Standard ist Stil 1, F6 schaltet weiter und beginnt nach 3 wieder bei 0 (Start, nach einmal von 2, nach zwei weiteren)');
      if (P.page.errors.length) t.ok(false, 'JS-Fehler: ' + P.page.errors.slice(0, 2).join(' | '));
    } finally { await P.done(); }
  },
}];
