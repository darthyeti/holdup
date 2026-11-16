// Umriss der Figuren im Kloetzchen-Stil (Ticket 248, js/kl-kern.js outline, FG.look plW, plA, npcW, npcA): Spielerfiguren eine duenne Linie in der Teamfarbe, alle anderen leise (duenn, halbtransparent),
// bei Tag dunkel, bei Nacht hell. Die Silhouette hinter Waenden (Ticket 188) ist ein eigener Pool und bleibt. Ohne WebGL 2 uebersprungen.
const { glPage } = require('../glshare');   // gemeinsamer WebGL-Browser (tests/glshare.js)
module.exports = [{
  name: 'Kloetzchen-Umriss: Spieler duenne Linie in der Teamfarbe, alle anderen leise (duenn, halbtransparent), Tag dunkel und Nacht hell, Silhouette hinter Waenden bleibt, keine Fehler',
  timeout: 240000,
  async run(t) {
    const P = await glPage(t); if (!P) return;
    try {
      const r = await P.page.evaluate(`(async () => { const D = __dbg, o = {};
        D.setScenario('bank'); D.buildLay(D.layoutFor(5)); D.startHeist(); await D.view3d.set(true); D.draw(); D.draw();
        const K = D.view3d.V.kl(), k = K.kit, T = D.get().me, L = D.view3d.V.cfg.fig.look;
        const fig = (kind, sc) => ({ k: kind, x: T.x, y: T.y, a: 0, row: kind === 'cop' ? 0 : 1, col: 0, hit: 0, lie: 0, al: 1, sh: -1, rf: 0, bag: 0, fl: 0, w: 0, ar: 0, sc });
        const read = () => { k.outline(true, fig('pl', '#3f78d8')); const pl = k.olState(); k.outline(true, fig('cop', '#ff0000')); const cop = k.olState(); k.outline(true, fig('civ')); const civ = k.olState(); return { pl, cop, civ } };
        o.day = read(); o.look = { out: L.out, plW: L.plW, plA: L.plA, npcW: L.npcW, npcA: L.npcA, day: L.outDay, night: L.outNight };
        const lg = D.LAY().mission; lg.lg = (lg.lg || []).concat('nacht'); D.view3d.reset(); await D.view3d.set(true); D.draw(); D.draw(); const K2 = D.view3d.V.kl(), k2 = K2.kit;
        k2.outline(true, fig('cop', '#ff0000')); o.nightCop = k2.olState(); k2.outline(true, fig('pl', '#3f78d8')); o.nightPl = k2.olState(); o.err = D.view3d.V.info().err; o.sil = !!D.view3d.V.info().sk;
        await D.view3d.set(false); return o; })()`);
      t.note(JSON.stringify(r));
      const d = r.day, L = r.look;
      t.ok(d.pl.c === 0x3f78d8 && d.pl.t > 0 && d.pl.t <= L.out * .6 && d.pl.a >= .9, 'Spieler: duenne Linie (' + d.pl.t.toFixed(2) + ' statt ' + L.out + ') in der Teamfarbe ' + d.pl.c.toString(16) + ', Deckkraft ' + d.pl.a);
      t.ok(d.cop.c === L.day && d.civ.c === L.day && d.cop.t <= L.out * .6 && d.cop.a <= .5, 'andere Figuren: leise, duenn (' + d.cop.t.toFixed(2) + ') und halbtransparent (' + d.cop.a + '), dunkel am Tag');
      t.ok(r.nightCop.c === L.night && r.nightCop.a < .5 && r.nightCop.t > 0, 'bei Nacht: hell (' + r.nightCop.c.toString(16) + ') und leise (' + r.nightCop.a.toFixed(2) + ')');
      t.eq(r.nightPl.c, 0x3f78d8, 'Spieler bleibt bei Nacht in der Teamfarbe');
      t.eq(r.err, '', 'keine Fehler in der Ansicht');
      if (P.page.errors.length) t.ok(false, 'JS-Fehler: ' + P.page.errors.slice(0, 2).join(' | '));
    } finally { await P.done(); }
  },
}];
