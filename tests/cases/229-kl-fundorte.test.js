// Ticket 228: Fundorte des Tresorcodes im Kloetzchen-Stil (js/kl-dinge-allgemein.js, KL.obj('note')): jede Art in NOTE und WALL baut Teile, hoechstens 11 je Fundort (mit Zettel), der Zettel kommt dazu
// und bleibt klein (hoechstens 6 Teile), 2D bleibt unveraendert. Zaehlt die Dinge (info().k.dinge) mit und ohne den Fundort. Ohne WebGL 2 uebersprungen.
const { glPage } = require('../glshare');
module.exports = [
  {
    name: 'Kloetzchen-Fundorte: jede Art des Tresorcodes (bin, copy, coffee, file, pin, coat, locker, mgr, desk, mon) baut Teile, mit Zettel hoechstens 11 je Fundort, der Zettel ist ein eigener kleiner Satz',
    timeout: 240000,
    async run(t) {
      const P = await glPage(t); if (!P) return;
      try {
        const r = await P.page.evaluate(`(async () => { const D = __dbg; D.setScenario('bank'); D.buildLay(D.layoutFor(5)); D.startHeist(); D.get().me.hp = 1e9; D.view3d.kstil = 1; await D.view3d.set(true);
          for (let i = 0; i < 30; i++) D.update(1 / 30); D.draw(); D.draw(); const V = D.view3d.V, X = V.kl().kit.X, orig = X.scen, B = D.LAY().bld, W = D.world(), T = 32, out = {}; let tile = null;
          for (let y = B.y0 + 1; y < B.y1 && !tile; y++) for (let x = B.x0 + 2; x < B.x1 - 1 && !tile; x++) if (W.cell(x, y) === '.' && W.cell(x, y - 1) === '#') tile = [x * T + 16, y * T + 16];
          const n = (kind, paper) => { X.scen = () => { const o = orig(); return { p: o.p.filter(q => q.k !== 'note').concat(kind ? [{ k: 'note', n: kind, x: tile[0], y: tile[1], paper }] : []), grl: o.grl, key: o.key + kind + paper } }; D.draw(); D.draw(); return V.info().k.dinge };
          const base = n(null, 0); out.base = base; for (const kind of ['bin', 'copy', 'coffee', 'file', 'pin', 'coat', 'locker', 'mgr', 'desk', 'mon']) out[kind] = [n(kind, 0) - base, n(kind, 1) - base];
          X.scen = orig; V.el.getContext('webgl2').finish(); out.err = V.info().err; await D.view3d.set(false); return out; })()`);
        t.note(JSON.stringify(r));
        t.ok(r.err === '', 'keine Fehler in der Ansicht');
        for (const kind of ['bin', 'copy', 'coffee', 'file', 'pin', 'coat', 'locker']) { const [a, b] = r[kind]; t.ok(a >= 1 && b <= 11 && b - a >= 3 && b - a <= 6, kind + ': ' + a + ' Teile, mit Zettel ' + b + ' (Zettel ' + (b - a) + ')'); }
        for (const kind of ['mgr', 'desk', 'mon']) { const [a, b] = r[kind]; t.ok(a >= 0 && b - a >= 3 && b <= 11, kind + ': Zettel ' + (b - a) + ' Teile'); }
        if (P.page.errors.length) t.ok(false, 'JS-Fehler: ' + P.page.errors.slice(0, 2).join(' | '));
      } finally { await P.done(); }
    },
  },
];
