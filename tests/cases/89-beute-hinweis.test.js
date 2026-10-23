// Hinweis an der Beute (pinfo): Gemaelde und Statue im Museum werden gestohlen, nicht zerstoert. Phase 1 "Stehlen" (gelb, leise), im Ueberfall "Mitnehmen" (gelb, mit Laut-Zeichen),
// vorher stand im Ueberfall "Abreissen" in Rot (die Farbe fuer zerstoeren). Glasvitrinen bleiben "Einschlagen" (rot), Chips und Waren "Raffen", der Spielautomat "Aufbrechen".
async function kinds(t, sc, seed) {
  return t.page.evaluate(([sc, seed]) => {
    const D = __dbg; D.setScenario(sc); D.setSeedMode('random'); D.setLage([]); D.buildSeed(seed);
    const me = D.get().me, out = {};
    const read = ph => { const o = {}; for (const it of D.get().its.filter(i => i.t === 'good' || i.t === 'vit')) { const d = D.pinfo(it, me), k = it.t === 'vit' ? 'vit' : it.k; o[k] = { v: d.v, c: d.c, i: d.i, loud: !!d.loud }; } return o; };
    out.p1 = read(1); D.startHeist(false); out.p2 = read(2); out.phase = D.get().phase;
    return out;
  }, [sc, seed]);
}

module.exports = [
  {
    name: 'Beute-Hinweis Museum: Gemaelde und Statue "Stehlen" (Phase 1) und "Mitnehmen" mit Laut-Zeichen (Ueberfall), beide gelb; Reliktvitrinen bleiben "Nehmen" und "Einschlagen"',
    async run(t) {
      const r = await kinds(t, 'museum', 31);
      t.eq(r.phase, 2, 'zweite Ablesung im Ueberfall');
      for (const k of ['art', 'statue']) {
        t.eq([r.p1[k].v, r.p1[k].c, r.p1[k].loud], ['Stehlen', 'y', false], k + ' in Phase 1');
        t.eq([r.p2[k].v, r.p2[k].c, r.p2[k].loud], ['Mitnehmen', 'y', true], k + ' im Ueberfall');
        t.ok(r.p1[k].i === 'gem' && r.p2[k].i === 'gem', k + ': Beute-Zeichen, keine Axt');
      }
      t.eq([r.p1.relic.v, r.p1.relic.c], ['Nehmen', 'y'], 'Relikt in Phase 1'); t.eq([r.p2.relic.v, r.p2.relic.c, r.p2.relic.i], ['Einschlagen', 'r', 'axe'], 'Relikt im Ueberfall (Glas geht kaputt)');
    },
  },
  {
    name: 'Beute-Hinweis: Casino (Chips raffen, Automat aufbrechen, Schliessfach einschlagen), Tankstelle (Waren raffen) und Juwelier (Vitrine) unveraendert',
    async run(t) {
      const c = await kinds(t, 'casino', 31);
      t.eq([c.p1.chips.v, c.p2.chips.v, c.p2.chips.c], ['Nehmen', 'Raffen', 'y'], 'Chips');
      t.eq([c.p1.slot.v, c.p2.slot.v, c.p2.slot.c], ['Aufbrechen', 'Aufbrechen', 'r'], 'Spielautomat');
      t.eq([c.p1.vip.v, c.p2.vip.v, c.p2.vip.c], ['Nehmen', 'Einschlagen', 'r'], 'Schliessfach');
      const g = await kinds(t, 'gas', 31);
      for (const k of ['cig', 'shelf']) t.eq([g.p1[k].v, g.p2[k].v], ['Nehmen', 'Raffen'], 'Tankstelle ' + k);
      const j = await kinds(t, 'jewel', 654);
      t.eq([j.p1.vit.v, j.p2.vit.v, j.p2.vit.loud], ['Schneiden', 'Einschlagen', true], 'Vitrine im Juwelier');
    },
  },
  {
    name: 'Beute-Hinweis Museum: das Hinweisfeld am Gemaelde zeichnet "Stehlen", im Ueberfall "Mitnehmen", nie "Abreissen"',
    async run(t) {
      const r = await t.page.evaluate(() => {
        const D = __dbg, T = 32; D.setScenario('museum'); D.setSeedMode('random'); D.setLage([]); D.buildSeed(31);
        const texts = () => { const out = [], c = document.querySelector('canvas').getContext('2d'), o = c.fillText; c.fillText = function (s) { out.push(String(s)); return o.apply(this, arguments); }; try { D.draw(); } finally { c.fillText = o; } return out; };
        const it = D.get().its.find(i => i.t === 'good' && i.k === 'art'), me = D.get().me; let best = null;
        for (let dx = -40; dx <= 40; dx += 4) for (let dy = -40; dy <= 40; dy += 4) { const x = it.x + dx, y = it.y + dy; if ([[9, 9], [-9, 9], [9, -9], [-9, -9]].some(a => D.isSol(Math.floor((x + a[0]) / T), Math.floor((y + a[1]) / T)))) continue; const d = Math.hypot(dx, dy); if (!best || d < best.d) best = { x, y, d }; }
        if (!best) return { err: 'kein Standpunkt am Gemaelde' };
        const at = () => { me.x = best.x; me.y = best.y; me.a = Math.atan2(it.y - me.y, it.x - me.x); D.update(1 / 30); D.update(1 / 30); return texts(); };
        const a = at(); D.startHeist(false); const b = at();
        return { a, b };
      });
      t.ok(!r.err, r.err);
      t.ok(r.a.includes('Stehlen') && !r.a.includes('Abreißen'), 'Phase 1: Stehlen');
      t.ok(r.b.includes('Mitnehmen') && !r.b.includes('Abreißen'), 'Ueberfall: Mitnehmen');
    },
  },
];
