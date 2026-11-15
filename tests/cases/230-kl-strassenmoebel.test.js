// Ticket 229: Strassenmoebel im Kloetzchen-Stil (js/kl-dinge-bank.js): k und q draussen (mindestens 5 Zellen o im 5 mal 5) bekommen Gestalten je nach Ort, hoechstens 11 Teile, benachbarte Kacheln der gleichen Art sind nie gleich,
// die Wahl haengt nur von der Kachelposition ab (zweimal gebaut gleich, damit Host und Client gleich zeichnen), drinnen bleiben Kiste und Fass. Ohne WebGL 2 uebersprungen.
const { glPage } = require('../glshare');
module.exports = [
  {
    name: 'Kloetzchen-Strassenmoebel: draussen wechseln die Gestalten von k und q (nie zwei gleiche nebeneinander, hoechstens 11 Teile, bei jedem Bau gleich), drinnen bleiben Kiste und Fass',
    timeout: 240000,
    async run(t) {
      const P = await glPage(t); if (!P) return;
      try {
        const r = await P.page.evaluate(`(async () => { const D = __dbg, o = { sc: {} }; D.view3d.kstil = 1; await D.view3d.set(true);
          for (const [sc, sd] of [['truck', 5], ['bank', 5], ['gas', 3], ['museum', 5], ['casino', 3], ['jewel', 5]]) {
            D.setScenario(sc); D.setSeedMode('random'); D.buildLay(D.layoutFor(sd)); D.startHeist(); D.get().me.hp = 1e9; for (let i = 0; i < 10; i++) D.update(1 / 30); D.draw(); D.draw();
            const K = D.view3d.V.kl(), kit = K.kit, W = D.world(), KLo = K.KL, spec = { s: [[0, 22]], ins: 0 }, sig = {}, parts = {}, out = { err: '' };
            const build = (c, x, y) => { const calls = []; const orig = kit.brick, so = kit.shadow, st = kit.studs; kit.brick = (...a) => { calls.push(a.slice(6, 7).join()); return orig && 0 }; kit.shadow = () => {}; kit.studs = () => {}; try { KLo.objs[c](kit, x, y, c, spec) } finally { kit.brick = orig; kit.shadow = so; kit.studs = st } return calls };
            let n = 0, mx = 0, bad = 0, again = 0, kinds = {}; for (let y = 0; y < W.H; y++) for (let x = 0; x < W.W; x++) { const c = W.cell(x, y); if (c !== 'k' && c !== 'q') continue; n++;
              const a = build(c, x, y), b = build(c, x, y); mx = Math.max(mx, a.length); if (a.join('|') !== b.join('|')) again++; sig[x + ',' + y + c] = a.join('|'); kinds[c + ':' + a.join('|')] = 1;
            }
            const outd = (x, y) => { let c = 0; for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (W.cell(x + dx, y + dy) === 'o') c++; return c >= 5 };
            for (const key in sig) { const m = /^(\\d+),(\\d+)([kq])$/.exec(key), x = +m[1], y = +m[2]; if (!outd(x, y)) continue; for (const [dx, dy] of [[1, 0], [0, 1]]) { const o2 = (x + dx) + ',' + (y + dy) + m[3]; if (sig[o2] !== undefined && outd(x + dx, y + dy) && sig[o2] === sig[key]) bad++ } }
            o.sc[sc] = { n, mx, again, bad, kinds: Object.keys(kinds).length };
          }
          D.view3d.V.el.getContext('webgl2').finish(); o.err = D.view3d.V.info().err; await D.view3d.set(false); return o; })()`);
        t.note(JSON.stringify(r.sc));
        t.ok(r.err === '', 'keine Fehler in der Ansicht');
        for (const [sc, v] of Object.entries(r.sc)) { t.ok(v.mx <= 11, sc + ': hoechstens 11 Teile je Kachel (' + v.mx + ')'); t.eq(v.again, 0, sc + ': bei jedem Bau gleich'); t.eq(v.bad, 0, sc + ': nebeneinander nie zwei gleiche draussen') }
        t.ok(r.sc.truck.kinds >= 5, 'Transporter: mindestens 5 verschiedene Gestalten (' + r.sc.truck.kinds + ')');
        if (P.page.errors.length) t.ok(false, 'JS-Fehler: ' + P.page.errors.slice(0, 2).join(' | '));
      } finally { await P.done(); }
    },
  },
];
