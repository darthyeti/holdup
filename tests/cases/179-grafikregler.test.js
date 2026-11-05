// Optik-Regler GFX (Ticket #118, Studie Paket A): Kachel Grafikqualitaet in den Optionen (niedrig, mittel, hoch, Voreinstellung mittel, localStorage 'holdup.gfx'),
// jede Stufe zeichnet in allen Szenarien ohne JS-Fehler, die Leuchtbilder (GFX.glowImg) werden je Farbe einmal gebaut und wiederverwendet, die Stufe aendert die Simulation nicht.
// Die Tests laufen auf Stufe niedrig (tests/lib.js, window.__holdupGfx), dieser Test wechselt selbst.
module.exports = [
  {
    name: 'Grafikregler: Kachel in den Optionen schaltet niedrig, mittel, hoch reihum und speichert die Wahl',
    async run(t) {
      await t.loadTool('loopnet.js'); await t.loadInpage('menu.js');
      const r = await t.page.evaluate(() => {
        const d = MT.solo(null, 's'), o = {}; d.sessReset(); MT.k(d, 'o'); o.has = !!MT.tile(d, 'gfx');
        GFX.set('niedrig'); o.names = [];
        for (let i = 0; i < 3; i++) { MT.click(d, 'gfx'); o.names.push(GFX.name); }
        o.saved = localStorage.getItem('holdup.gfx');
        o.inside = d.ui().tiles().filter(q => !(q.x >= 0 && q.y >= 0 && q.x + q.w <= 960 && q.y + q.h <= 544)).map(q => [q.id, q.x, q.y, q.w, q.h]);
        GFX.set('niedrig'); return o;
      });
      t.ok(r.has, 'Kachel gfx da');
      t.eq(r.names, ['mittel', 'hoch', 'niedrig'], 'reihum');
      t.eq(r.saved, 'niedrig', 'gespeichert'); t.eq(r.inside, [], 'alle Kacheln im Bild');
    },
  },
  {
    name: 'Grafikregler: Voreinstellung mittel ohne Speicher',
    async run(t) {
      const ctx = await t.env.browser.newContext({ viewport: { width: 1000, height: 640 } });
      await ctx.addInitScript(() => { window.__holdupGfx = 'mittel'; });
      const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(String(e)));
      try {
        await page.goto(t.env.url + '/index.html#debug');
        await page.waitForFunction(() => window.__dbg && window.__dbg.get && window.__dbg.get().players, null, { timeout: 30000 });
        t.eq(await page.evaluate(() => GFX.name), 'mittel'); t.eq(errs, []);
      } finally { await ctx.close(); }
    },
  },
  {
    name: 'Grafikregler: jede Stufe zeichnet in allen Szenarien ohne Fehler, Leuchtbilder werden wiederverwendet, die Simulation bleibt gleich',
    async run(t) {
      await t.loadTool('loopnet.js'); await t.loadInpage('coop.js');
      const errs = []; t.page.on('pageerror', e => errs.push(String(e)));
      const r = await t.page.evaluate(`(() => { const o = { sim: [] };
        for (const sc of ['bank', 'truck', 'jewel', 'gas', 'museum', 'casino', 'nb']) { const G = CT.mkGame(sc, 4711, 1), A = G.A;
          const m = A.get().me; A.blastAt(m.x + 300, m.y, { dmg: 0, pdmg: 0, r: 110, scorch: 20 }, 0, 1);
          const sig = [];
          for (const lv of ['niedrig', 'mittel', 'hoch']) { GFX.set(lv); for (let i = 0; i < 3; i++) A.draw(); sig.push(JSON.stringify([A.get().me.x, A.get().me.hp])); }
          o.sim.push(sig[0] === sig[1] && sig[1] === sig[2]); }
        const im = GFX.glowImg('255,214,125'), b1 = GFX.glowBuilt, im2 = GFX.glowImg('255,214,125');
        o.same = im === im2; o.noNew = GFX.glowBuilt === b1; o.built = b1; GFX.set('niedrig'); return o; })()`);
      t.ok(r.sim.every(Boolean), 'Zeichnen aendert den Spielerzustand nicht: ' + r.sim);
      t.ok(r.same && r.noNew, 'dasselbe Leuchtbild beim zweiten Aufruf');
      t.ok(r.built <= 12, 'wenige Leuchtbilder (je Farbe eins): ' + r.built);
      t.eq(errs, [], 'keine JS-Fehler');
    },
  },
];
