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
    name: 'Grafikregler: Voreinstellung mittel ohne __holdupGfx und ohne gespeicherte Wahl',
    async run(t) {
      const ctx = await t.env.browser.newContext({ viewport: { width: 1000, height: 640 } });
      await ctx.addInitScript(() => { delete window.__holdupGfx; try { localStorage.removeItem('holdup.gfx'); } catch (e) { /* ohne Speicher */ } });
      const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(String(e)));
      try {
        await page.goto(t.env.url + '/index.html#debug');
        await page.waitForFunction(() => window.__dbg && window.__dbg.get && window.__dbg.get().players, null, { timeout: 30000 });
        t.eq(await page.evaluate(() => GFX.name), 'mittel'); t.eq(errs, []);
      } finally { await ctx.close(); }
    },
  },
  {
    name: 'Grafikregler: jede Stufe zeichnet in allen Szenarien ohne Fehler, Leuchtbilder werden wiederverwendet und gedeckelt',
    async run(t) {
      await t.loadTool('loopnet.js'); await t.loadInpage('coop.js');
      const errs = []; t.page.on('pageerror', e => errs.push(String(e)));
      const r = await t.page.evaluate(`(() => { const o = {};
        for (const sc of ['bank', 'truck', 'jewel', 'gas', 'museum', 'casino', 'nb']) { const A = CT.mkGame(sc, 4711, 1).A, m = A.get().me;
          A.blastAt(m.x + 300, m.y, { dmg: 0, pdmg: 0, r: 110, scorch: 20 }, 0, 1);
          for (const lv of ['niedrig', 'mittel', 'hoch']) { GFX.set(lv); for (let i = 0; i < 3; i++) A.draw(); } }
        const im = GFX.glowImg('255,214,125', 100), b1 = GFX.glowBuilt, im2 = GFX.glowImg('255,214,125', 100), im3 = GFX.glowImg('255,214,125', 250);
        o.same = im === im2; o.noNew = GFX.glowBuilt === b1 + 1; o.sizes = [im.width, im3.width]; o.scale = 100 / im.width;
        for (let i = 0; i < 400; i++) GFX.glowImg(i + ',1,1', 64); o.built = GFX.glowBuilt; o.noCrash = GFX.glowImg('1,2,3').width;
        GFX.set('niedrig'); return o; })()`);
      t.ok(r.same, 'dasselbe Leuchtbild beim zweiten Aufruf'); t.ok(r.noNew, 'nur die neue Groessenstufe wurde gebaut');
      t.ok(r.sizes[0] >= 100 && r.sizes[1] >= 250 && r.sizes[1] > r.sizes[0], 'Groessenstufen: ' + r.sizes);
      t.ok(r.noCrash === 128, 'Cache nach Ueberlauf weiter benutzbar');
      t.eq(errs, [], 'keine JS-Fehler');
    },
  },
  {
    name: 'Grafikregler: die Stufe aendert die Simulation nicht (gleicher Seed, gleich viele Schritte mit Zeichnen, gleicher Zustand) und laeuft mit Zeit, Explosion und Welle ohne Fehler',
    async run(t) {
      await t.loadTool('loopnet.js'); await t.loadInpage('coop.js');
      const errs = []; t.page.on('pageerror', e => errs.push(String(e)));
      const r = await t.page.evaluate(`(() => { const o = {}, sigs = {};
        for (const sc of ['bank', 'museum']) { sigs[sc] = [];
          for (const lv of ['niedrig', 'mittel', 'hoch']) { GFX.set(lv); const A = CT.mkGame(sc, 311704, 1).A, m = A.get().me;
            A.CFG.policeAt = 5; A.CFG.policeForced = 8;
            for (let i = 0; i < 240; i++) { if (i === 60) A.blastAt(m.x + 250, m.y, { dmg: 0, pdmg: 0, r: 110, scorch: 20 }, 0, 1); A.update(1 / 30); if (i % 4 === 0) A.draw(); }
            const g = A.get(); let s; try { s = JSON.stringify(g); } catch (e) { s = JSON.stringify([g.me.x, g.me.y, g.me.hp]); }
            sigs[sc].push(s); } }
        o.eq = {}; for (const sc in sigs) o.eq[sc] = sigs[sc][0] === sigs[sc][1] && sigs[sc][1] === sigs[sc][2]; o.len = sigs.bank[0].length; GFX.set('niedrig'); return o; })()`);
      t.eq(r.eq, { bank: true, museum: true }, 'Zustand je Stufe gleich (Laenge ' + r.len + ')');
      t.eq(errs, [], 'keine JS-Fehler');
    },
  },
  {
    name: 'Grafikregler: das Overlay wird bei Wechsel von Tageszeit, Tint oder Stufe neu gebaut, sonst wiederverwendet, niedrig baut keins',
    async run(t) {
      await t.loadTool('loopnet.js'); await t.loadInpage('coop.js');
      const r = await t.page.evaluate(`(() => { const o = {}; GFX.set('mittel'); const b0 = GFX.ovBuilt, tt = [255, 140, 60, .15];
        const a = GFX.overlay(tt, 'abend', 960, 544), a2 = GFX.overlay(tt, 'abend', 960, 544); o.same = a === a2; o.b1 = GFX.ovBuilt - b0;
        const n = GFX.overlay([30, 45, 110, .26], 'nacht', 960, 544); o.diffTod = n !== a; o.b2 = GFX.ovBuilt - b0;
        GFX.set('hoch'); const h = GFX.overlay(tt, 'abend', 960, 544); o.diffLv = h !== a; o.b3 = GFX.ovBuilt - b0;
        GFX.set('niedrig'); const A = CT.mkGame('bank', 4711, 1).A, c = GFX.ovBuilt; for (let i = 0; i < 3; i++) A.draw(); o.low = GFX.ovBuilt - c;
        GFX.set('mittel'); const c2 = GFX.ovBuilt; for (let i = 0; i < 3; i++) A.draw(); const th = A.LAY && A.LAY().theme; o.firstBuilds = GFX.ovBuilt - c2;
        if (th) { const old = th.tod; th.tod = th.tod === 'nacht' ? 'abend' : 'nacht'; const c3 = GFX.ovBuilt; A.draw(); o.afterTod = GFX.ovBuilt - c3; A.draw(); o.again = GFX.ovBuilt - c3; th.tod = old; }
        GFX.set('niedrig'); return o; })()`);
      t.ok(r.same && r.b1 === 1, 'gleiche Eingaben, ein Bau: ' + JSON.stringify(r));
      t.ok(r.diffTod && r.b2 === 2, 'andere Tageszeit baut neu'); t.ok(r.diffLv && r.b3 === 3, 'andere Stufe baut neu');
      t.eq(r.low, 0, 'niedrig baut kein Overlay'); t.ok(r.firstBuilds <= 1, 'mittel baut hoechstens einmal je Karte');
      if (r.afterTod !== undefined) t.eq([r.afterTod, r.again], [1, 1], 'Wechsel der Tageszeit im Spiel baut einmal neu');
    },
  },
];
