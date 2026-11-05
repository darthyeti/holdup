// Issue 112: Die Zeilenliste der Ergebnisseite lief bei langen Listen (Notenbank, Coop mit Serie) unter die Kacheln und die Fahndungs-Box.
// Jetzt ordnet endRows die Zeilen in das Fenster y 244 bis 392 (enger, kleiner, mehr Spalten): keine Zeile schneidet Kacheln oder Box, alle liegen im Bild.
module.exports = [
  {
    name: 'Ergebnisseite: Listen von 1 bis 24 Zeilen liegen im Bild und schneiden weder Kacheln noch Fahndungs-Box; bis 6 Zeilen bleibt es beim alten Abstand 28',
    async run(t) {
      await t.loadTool('loopnet.js'); await t.loadInpage('menu.js');
      const r = await t.page.evaluate(() => {
        const d = MT.solo(null, 's'), o = { bad: [], lens: [] };
        const cv = document.createElement('canvas'), g = cv.getContext('2d'), mw = (f, s) => { g.font = f; return g.measureText(s).width; };
        const mk = n => Array.from({ length: n }, (_, i) => i === 1 ? 'Beute verloren: Gefangenschaft kostet das ganze Konto der Serie' : 'Notenbank Zeile ' + (i + 1) + ': Tresor, Stahlkammer, Wachen, Bonus ' + '9'.repeat(i % 4) + ' $');
        d.startGame(); d.setFocus(true); d.startHeist(false); MT.adv(d, .5);
        d.endLocal({ win: false, soft: false, score: 0, n: 4, lines: mk(16), fh: null, title: 't', extra: '', hi: 1 });
        const tiles = d.ui().tiles().map(q => ({ id: q.id, x: q.x, y: q.y, w: q.w, h: q.h }));
        tiles.push({ id: 'endRet', x: 730, y: 402, w: 190, h: 58 }, { id: 'kick', x: 40, y: 420, w: 190, h: 40 }, { id: 'fh', x: 748, y: 216, w: 196, h: 200 });
        for (let n = 1; n <= 24; n++) {
          const rows = d.endRows(mk(n), n > 1 ? 1 : 0, mw);
          if (n <= 6) o.lens.push(rows.map(q => q.y).join());
          rows.forEach(q => {
            const x0 = q.x - q.w / 2, x1 = q.x + q.w / 2, y0 = q.y - q.fs, y1 = q.y + 3;
            if (x0 < 0 || x1 > 960 || y0 < 0 || y1 > 544) o.bad.push(n + ':bild:' + q.i);
            tiles.forEach(k => { if (x0 < k.x + k.w && x1 > k.x && y0 < k.y + k.h && y1 > k.y) o.bad.push(n + ':' + k.id + ':' + q.i); });
          });
        }
        return o;
      });
      t.eq(r.bad, [], 'keine Zeile außerhalb des Bilds oder auf Kachel und Box');
      t.eq(r.lens[5], '244,272,300,328,356,384', 'sechs Zeilen im alten Abstand');
    },
  },
];
