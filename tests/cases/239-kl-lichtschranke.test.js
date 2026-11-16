// Kloetzchen-Stil, Lichtschranke im Museum (Ticket 239): duenner Strahl (Kern und Schein) zwischen zwei kleinen Gehaeusen mit Linse, aus ohne Strahl, nichts ragt in die Mauer. Kein Pixelvergleich, ohne WebGL 2 uebersprungen.
const { glPage } = require('../glshare');
const lib = require('../lib');
module.exports = [{
  name: 'Lichtschranke: Gehaeuse an der Wand und duenner roter Strahl (an), nur Gehaeuse mit dunklen Linsen (aus), Kloetze liegen nicht in der Mauer, Strahl duenner als 1',
  timeout: 240000,
  async run(t) {
    const P = await glPage(t); if (!P) return;
    try {
      await lib.loadInpage(P.page, 'bild.js');
      const r = await P.page.evaluate(`(async () => { const D = __dbg, o = {}; D.view3d.kstil = 1; const i0 = await D.view3d.set(true); if (i0.state !== 'an') return { i0 };
        for (const sd of [5, 8, 3]) {
          PX.scene('museum', sd); PX.phase('erkundung'); const L = D.LAY(), g = D.get(), me = g.me, W = D.world(), l = (L.lasers || [])[1]; if (!l) { o[sd] = { none: 1 }; continue; }
          const V = D.view3d.V, T = 32, tg = [(l[0] + l[2]) / 2 * T, (l[1] + l[3]) / 2 * T]; let best = null;
          for (const rr of [50, 80, 110]) for (let k = 0; k < 24 && !best; k++) { const a = k / 24 * 6.283, x = tg[0] + Math.cos(a) * rr, y = tg[1] + Math.sin(a) * rr; if (!W.isSol(Math.floor(x / T), Math.floor(y / T)) && D.los(x, y, tg[0], tg[1])) best = [x, y]; }
          best = best || [me.x, me.y]; const sd2 = () => { for (let k = 0; k < 8; k++) { me.x = best[0]; me.y = best[1]; me.vx = me.vy = 0; me.hp = 100; D.update(1 / 30); } D.draw(); D.draw(); return V.info(); };
          const box = { x0: Math.min(l[0], l[2]) * T - 14, x1: Math.max(l[0], l[2]) * T + 14, y0: Math.min(l[1], l[3]) * T - 14, y1: Math.max(l[1], l[3]) * T + 14 };
          const insts = () => { const out = []; for (const n of ['k-dinge', 'k-dinge-klein']) { const m = V.scene.getObjectByName(n); if (!m) continue; const A = m.instanceMatrix.array; for (let i = 0; i < m.count; i++) { const x = A[i * 16 + 12], z = A[i * 16 + 14]; if (x > box.x0 && x < box.x1 && z > box.y0 && z < box.y1) out.push([x, A[i * 16 + 13], z, Math.hypot(A[i * 16], A[i * 16 + 1], A[i * 16 + 2]), Math.hypot(A[i * 16 + 4], A[i * 16 + 5], A[i * 16 + 6]), Math.hypot(A[i * 16 + 8], A[i * 16 + 9], A[i * 16 + 10])]); } } return out; };
          const inWall = a => a.filter(p => W.isSol(Math.floor(p[0] / T), Math.floor(p[2] / T))).length;
          let a = sd2(); const on = insts(); o[sd] = { n: on.length, wall: inWall(on), err: a.err, thin: on.filter(p => Math.min(p[3], p[4], p[5]) < 1).length };
          g.its.find(i => i.t === 'sw').act(me); a = sd2(); const off = insts(); o[sd].off = off.length; o[sd].wallOff = inWall(off); o[sd].err2 = a.err;
        }
        await D.view3d.set(false); return o; })()`);
      if (r.i0) { t.note('3D nicht verfuegbar'); return; }
      t.note(JSON.stringify(r));
      for (const sd of [5, 8, 3]) { const q = r[sd]; if (q.none) { t.note('Seed ' + sd + ': keine Lichtschranke'); continue; }
        t.ok(q.err === '' && q.err2 === '', 'Seed ' + sd + ': keine Fehler');
        t.ok(q.n >= q.off + 2 && q.off >= 4, 'Seed ' + sd + ': an hat Strahl (Kern und Schein) mehr als aus (' + q.n + ' gegen ' + q.off + '), aus zeigt die Gehaeuse (' + q.off + ')');
        t.ok(q.thin >= 1, 'Seed ' + sd + ': der Kern ist duenner als 1 (' + q.thin + ')');
        t.ok(q.wall === 0 && q.wallOff === 0, 'Seed ' + sd + ': kein Klotz liegt in der Mauer (' + q.wall + '/' + q.wallOff + ')'); }
      if (P.page.errors.length) t.ok(false, 'JS-Fehler: ' + P.page.errors.slice(0, 2).join(' | '));
    } finally { await P.done(); }
  },
}];
