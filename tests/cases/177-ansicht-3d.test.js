// 3D-Prototyp (#125, nicht mergen): #debug&3d laedt js/view3d.js, ein paar Sekunden spielen, bei 0, 30 und 55 Grad zeichnen, ohne JS-Fehler.
// Ohne WebGL (manche Headless-Umgebungen) wird der 3D-Teil sauber uebersprungen und das als Notiz ausgegeben. Ohne #3d bleibt alles 2D.
const W3D = { hash: '#debug&3d' };
async function v3Ready(page) {
  await page.waitForFunction(() => window.__dbg && __dbg.v3 && __dbg.v3(), null, { timeout: 30000 });
  return page.evaluate(() => { const V = __dbg.v3(); if (!V.on) return { on: false, err: V.err }; V.setQ(.5); return { on: true, info: V.info() } });
}

module.exports = [
  {
    name: '3D: Ansicht laedt, spielt und zeichnet bei 0, 30 und 55 Grad',
    open: W3D, timeout: 240000,
    async run(t) {
      const r0 = await v3Ready(t.page);
      if (!r0.on) { t.note('kein WebGL in diesem Browser, 3D-Teil uebersprungen: ' + r0.err); return }
      t.note('WebGL: ' + r0.info.gl);
      const r = await t.page.evaluate(() => {
        const D = __dbg, V = D.v3(), cv = document.getElementById('c'), q = cv.getContext('2d'), o = { tilts: [] };
        D.reset();
        for (let i = 0; i < 30 * 4; i++) { D.update(1 / 30); if (i % 20 === 0) D.draw() }
        for (const tl of [0, 30, 55]) {
          V.setTilt(tl); D.draw();
          const d = q.getImageData(0, 0, cv.width, cv.height).data; let lum = 0, n = 0, mn = 255, mx = 0;
          for (let i = 0; i < d.length; i += 4 * 997) { const l = (d[i] + d[i + 1] + d[i + 2]) / 3; lum += l; n++; mn = Math.min(mn, l); mx = Math.max(mx, l) }
          const me = D.get().me, s = V.toScr(me.x, me.y, 24), w = V.pick(s[0], s[1]);
          o.tilts.push({ tl, info: V.info(), lum: lum / n, span: mx - mn, s, err: Math.hypot(w[0] - me.x, w[1] - me.y) });
        }
        o.phase = D.get().phase; o.hp = D.get().me.hp;
        return o;
      });
      for (const x of r.tilts) {
        t.ok(Math.abs(x.info.tilt - x.tl) < .01, 'Kippung ' + x.tl + ' nicht gesetzt: ' + x.info.tilt);
        t.ok(x.lum > 25 && x.span > 60, 'Bild bei ' + x.tl + ' Grad leer oder einfarbig (Helligkeit ' + x.lum.toFixed(1) + ', Spanne ' + x.span + ')');
        t.ok(x.err < 1, 'Strahl auf die Zielebene trifft den Spieler nicht wieder (' + x.err.toFixed(2) + ' px bei ' + x.tl + ' Grad)');
        t.ok(x.s[0] > 200 && x.s[0] < 760 && x.s[1] > 100 && x.s[1] < 450, 'Spieler nicht in der Bildmitte bei ' + x.tl + ' Grad: ' + x.s.map(Math.round));
        t.note(x.tl + ' Grad: ' + x.info.last.ms.toFixed(0) + ' ms (Software-Grafik, halbe Aufloesung), ' + x.info.last.calls + ' Zeichenaufrufe, ' + x.info.last.tris + ' Dreiecke');
      }
      t.ok(r.hp > 0, 'Spieler tot nach 4 s');
    },
  },
  {
    name: '3D: Mauszeiger zielt ueber den Strahl (Weltpunkt unter der Maus bei 45 Grad)',
    open: W3D, timeout: 240000,
    async run(t) {
      const r0 = await v3Ready(t.page);
      if (!r0.on) { t.note('kein WebGL, uebersprungen'); return }
      const box = await t.page.locator('canvas#c').boundingBox();
      const tg = await t.page.evaluate(() => { const D = __dbg, V = D.v3(); V.setTilt(45); D.reset(); D.get().me.armed = true; D.update(1 / 30); D.draw(); const me = D.get().me, x = me.x + 120, y = me.y - 60; return { w: [x, y], s: V.toScr(x, y, 24) } });
      await t.page.mouse.move(box.x + tg.s[0] / 960 * box.width, box.y + tg.s[1] / 544 * box.height);
      const a = await t.page.evaluate(() => { const D = __dbg; D.draw(); D.update(1 / 30); D.draw(); const me = D.get().me; return me.a });
      const want = await t.page.evaluate(w => { const me = __dbg.get().me; return Math.atan2(w[1] - me.y, w[0] - me.x) }, tg.w);
      const d = Math.abs(Math.atan2(Math.sin(a - want), Math.cos(a - want)));
      t.ok(d < .12, 'Blickrichtung folgt dem Strahl nicht: ' + a.toFixed(3) + ' statt ' + want.toFixed(3));
    },
  },
  {
    name: '3D: ohne #3d bleibt das Spiel 2D und laedt keine 3D-Datei',
    async run(t) {
      const r = await t.page.evaluate(() => ({ v3: __dbg.v3(), res: performance.getEntriesByType('resource').map(e => e.name).filter(n => /view3d|three/.test(n)) }));
      t.eq(r.v3, null, 'V3 muss ohne #3d leer bleiben');
      t.eq(r.res, [], 'ohne #3d darf weder view3d.js noch three geladen werden');
    },
  },
];
