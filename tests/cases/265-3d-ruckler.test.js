// Ruckler der 3D-Ansicht (Ticket 265, js/view3d.js groundSame, warmShaders): (1) Aendert sich nur das Raster (Sperrteil, zerschossenes oder gesichertes Fenster), wird die Bodentextur (3072 x 1728) nicht ersetzt,
// (2) aendert sich die 2D-Zeichnung (st oder so) an der Kachel, wird sie wie bisher ersetzt, (3) die Vorarbeit der Programme (window.__holdupWarm, sonst nur mit paralleler Uebersetzung) legt alle Pools an
// und uebersetzt die Schalterkombinationen im Voraus: der Wechsel auf Nacht (Taschenlampe) braucht danach kein neues Programm. Ohne WebGL 2 uebersprungen.
const { glPage } = require('../glshare');   // gemeinsamer WebGL-Browser (tests/glshare.js)
const lib = require('../lib');
module.exports = [
  {
    name: 'Ruckler: Sperrteile und Fensterzustaende ersetzen die Bodentextur nicht, eine geaenderte 2D-Zeichnung schon',
    timeout: 240000,
    async run(t) {
      const P = await glPage(t); if (!P) return;
      try {
        await lib.loadInpage(P.page, 'bild.js');
        const r = await P.page.evaluate(`(async () => { const D = __dbg, o = {}; await D.view3d.set(true); PX.scene('bank', 5); PX.phase('ueberfall'); for (let i = 0; i < 4; i++) D.draw();
          const W = D.world(), me = D.get().me, V = D.view3d.V, gx = Math.floor(me.x / 32), gy = Math.floor(me.y / 32), cells = [];
          for (let dy = -4; dy <= 4; dy++) for (let dx = 2; dx <= 8; dx++) { const x = gx + dx, y = gy + dy; if (!W.isSol(x, y) && W.cell(x, y) === 'o') cells.push([x, y]) }
          const i0 = V.info(); o.n = cells.length; o.g0 = i0.groundUp; o.b0 = i0.statBuilds;
          for (let i = 0; i < Math.min(8, cells.length); i++) { W.setc(cells[i][0], cells[i][1], i % 2 ? 'X' : 'Y'); D.draw(); D.draw() }
          const i1 = V.info(); o.g1 = i1.groundUp; o.b1 = i1.statBuilds; o.rb = i1.rb;
          // geaenderte 2D-Zeichnung: ein Pixelfeld der Ebene so an einer Kachel mit Aenderung
          const c = cells[cells.length - 1], k = W.st.width / (W.W * 32), px = Math.round((c[0] - W.WX0) * 32 * k), py = Math.round((c[1] - W.WY0) * 32 * k), g = W.so.getContext('2d');
          g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = '#ff00ff'; g.fillRect(px + 4, py + 4, 20, 20); g.restore(); W.setc(c[0], c[1], 'w'); D.draw(); D.draw(); const i2 = V.info(); o.g2 = i2.groundUp; o.err = i2.err;
          g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(px + 4, py + 4, 20, 20); g.restore(); await D.view3d.set(false); return o; })()`);
        t.note(JSON.stringify(r));
        t.ok(r.n >= 8, 'freie Kacheln fuer die Sperrteile: ' + r.n);
        t.eq(r.g1, r.g0, 'Bodentextur nach 8 Sperrteilen und Fensterzustaenden nicht ersetzt (Ersatz ' + r.g0 + ' bis ' + r.g1 + ')');
        t.ok(r.b1 - r.b0 >= 8 && r.rb[3] >= 8, 'die statische Welt wird trotzdem neu gebaut (' + (r.b1 - r.b0) + ' Neubauten, ' + r.rb[3] + ' ohne Boden)');
        t.eq(r.g2, r.g1 + 1, 'geaenderte 2D-Zeichnung an der Kachel: Bodentextur wird ersetzt');
        t.eq(r.err, '', 'keine Fehler in der Ansicht');
        if (P.page.errors.length) t.ok(false, 'JS-Fehler: ' + P.page.errors.slice(0, 2).join(' | '));
      } finally { await P.done(); }
    },
  },
  {
    name: 'Ruckler: Vorarbeit der Programme (erzwungen) legt alle Pools an, uebersetzt die Schalterkombinationen und der Wechsel auf Nacht braucht kein neues Programm',
    timeout: 240000,
    async run(t) {
      const P = await glPage(t); if (!P) return;
      try {
        await lib.loadInpage(P.page, 'bild.js');
        const one = warm => P.page.evaluate(`(async () => { const D = __dbg, o = {}; window.__holdupWarm = ${warm ? 1 : 0}; window.__holdupNoWarm = ${warm ? 0 : 1}; D.view3d.reset(); await D.view3d.set(true); PX.scene('bank', 5); PX.phase('erkundung'); for (let i = 0; i < 3; i++) D.draw();
          const V = D.view3d.V, a = V.info(); o.a = { prog: a.prog, warm: a.warm, err: a.err };
          const L = D.LAY().mission; L.lg = (L.lg || []).concat('nacht'); for (let i = 0; i < 8; i++) { D.update(1 / 30); D.draw() } const b = V.info(); o.b = { prog: b.prog, relink: b.relink, err: b.err };
          o.pools = V.info().objs; window.__holdupWarm = 0; window.__holdupNoWarm = 0; await D.view3d.set(false); return o; })()`);
        const w = await one(true), n = await one(false);
        t.note('mit ' + JSON.stringify(w) + ' ohne ' + JSON.stringify(n));
        t.ok(w.a.err === '' && w.b.err === '' && w.a.warm[1] === '', 'Vorarbeit ohne Fehler: ' + JSON.stringify(w.a.warm));
        t.ok(w.a.prog > n.a.prog + 10, 'Programme im Voraus uebersetzt: ' + w.a.prog + ' gegen ' + n.a.prog);
        t.eq(w.b.prog, w.a.prog, 'Wechsel auf Nacht mit Vorarbeit: kein neues Programm (' + w.a.prog + ' vor und ' + w.b.prog + ' nach dem Wechsel)');
        if (P.page.errors.length) t.ok(false, 'JS-Fehler: ' + P.page.errors.slice(0, 2).join(' | '));
      } finally { await P.done(); }
    },
  },
];
