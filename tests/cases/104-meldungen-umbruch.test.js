// Meldungen oben rechts (Feed): Lange Meldungen brechen um (CFG.hud.feedW 440 Pixel) statt ueber den Bildrand oder ueber das linke HUD zu laufen (Tills Screenshots aus dem Museum und dem Casino, 26. Oktober 2026).
const CAP = `(() => { const ctx = document.getElementById('c').getContext('2d'), oT = ctx.fillText, texts = [];
  ctx.fillText = function (s, x, y) { texts.push({ s: String(s), x, y, f: this.font }); return oT.apply(this, arguments); };
  return { texts, stop() { ctx.fillText = oT; } };
})()`;

module.exports = [
  {
    name: 'Feed: lange Meldungen (Museum-Briefing, Casino-Briefing) brechen auf höchstens CFG.hud.feedW um, jedes Wort bleibt erhalten, keine Zeile beginnt links von der Mitte des Bildes',
    async run(t) {
      const r = await t.page.evaluate(`(() => { const D = __dbg, o = {}; const m = document.createElement('canvas').getContext('2d'); m.font = '12px monospace'; o.W = D.CFG.hud.feedW;
        const grab = () => { const c = ${CAP}; try { D.draw(); } finally { c.stop(); } return c.texts; };
        for (const sc of ['museum', 'casino']) { D.sessReset(); D.setScenario(sc); D.setSeedMode('random'); D.setLage([]); D.setTurn('S'); D.buildSeed(5); D.reset(); D.update(1 / 30);
          const msgs = D.msgs().feed.slice(); const tx = grab().filter(q => q.f.indexOf('12px') >= 0 && q.x > 400);
          o[sc] = { msgs: msgs.length, maxW: Math.max(...tx.map(q => m.measureText(q.s).width)), minX: Math.min(...tx.map(q => q.x)), joined: tx.map(q => q.s).join(' ') };
          o[sc].allWords = msgs.every(s => s.split(' ').every(w => o[sc].joined.includes(w))); }
        return o; })()`);
      for (const sc of ['museum', 'casino']) {
        t.ok(r[sc].msgs > 0, sc + ': Meldungen im Feed vorhanden');
        t.ok(r[sc].maxW <= r.W, sc + ': keine Zeile breiter als feedW (' + Math.round(r[sc].maxW) + ' gegen ' + r.W + ')');
        t.ok(r[sc].minX >= 480 - 8, sc + ': keine Zeile reicht nach links ueber die Bildmitte (x ' + Math.round(r[sc].minX) + ')');
        t.ok(r[sc].allWords, sc + ': kein Wort geht beim Umbruch verloren');
      }
    },
  },
];
