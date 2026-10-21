// Seitenskript fuer die Ueberlappungs-Pruefung der Menues: Text gegen Kachel, Text gegen Text, Rand des Bildes.
// check(d) zeichnet die Instanz d einmal und prueft alle Texte, die vor der ersten Kachel gezeichnet werden (Titel, Hinweise, Statuszeilen, beim Ergebnis der Text der Seite 1).
// Texte, die eine Kachel selbst zeichnet, gehoeren zur Kachel und werden nicht geprueft. Im laufenden Spiel (Pause, Ergebnis) zaehlen nur Texte nach dem abdunkelnden Vollbild-Rechteck, alles davor
// ist das abgedunkelte Spiel darunter. Gleiche Texte versetzt (Schatten) sind kein Fund. Kasten eines Textes: Breite per measureText, Hoehe 1,0 mal Schriftgroesse (Oberlaenge .8, Unterlaenge .2),
// jeweils um 1 Pixel verkleinert. Liefert eine Liste von Fundstellen als Text (leer = in Ordnung).
(function () {
  // opt.modal: Fenster (Anleitung, Optionen): geprueft werden die Texte nach dem abdunkelnden Rechteck des Fensters (Alpha .78), die Kacheln darunter zaehlen nicht
  function check(d, opt) {
    const ctx = d.cv.getContext('2d'), orig = { fillText: ctx.fillText, strokeRect: ctx.strokeRect, fillRect: ctx.fillRect }, tiles = d.ui().tiles(), log = [];
    let inTiles = false, started = !(opt && opt.modal) && d.state().scr !== 'play';
    const frame = (x, y, w, h) => tiles.some(t => [.5, 1].some(o => Math.abs(x - (t.x + o)) < .01 && Math.abs(y - (t.y + o)) < .01 && Math.abs(w - (t.w - 2 * o)) < .01 && Math.abs(h - (t.h - 2 * o)) < .01));
    ctx.fillText = function (s, x, y) {
      if (started && !inTiles && String(s).trim()) {
        const sz = +(/(\d+)px/.exec(ctx.font) || [0, 12])[1], w = ctx.measureText(String(s)).width, al = ctx.textAlign;
        const x0 = al === 'center' ? x - w / 2 : al === 'right' || al === 'end' ? x - w : x;
        log.push({ s: String(s), x0: x0 + 1, x1: x0 + w - 1, y0: y - sz * .8 + 1, y1: y + sz * .2 - 1 });
      }
      return orig.fillText.apply(this, arguments);
    };
    ctx.fillRect = function (x, y, w, h) { if (!started && x === 0 && y === 0 && w >= 960 && h >= 544 && (opt && opt.modal ? /\.78\)/ : /\.(74|82)\)/).test(String(ctx.fillStyle))) { started = true; inTiles = false; } return orig.fillRect.apply(this, arguments); };
    ctx.strokeRect = function (x, y, w, h) { if (!inTiles && frame(x, y, w, h)) inTiles = true; return orig.strokeRect.apply(this, arguments); };
    try { d.draw(); } finally { ctx.fillText = orig.fillText; ctx.strokeRect = orig.strokeRect; ctx.fillRect = orig.fillRect; }
    const hit = (a, b) => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0, out = [];
    log.forEach((a, i) => {
      if (a.x0 < 0 || a.x1 > 960 || a.y0 < 0 || a.y1 > 544) out.push('Rand: "' + a.s.slice(0, 40) + '"');
      tiles.forEach(t => { if (hit(a, { x0: t.x, x1: t.x + t.w, y0: t.y, y1: t.y + t.h })) out.push('Kachel ' + t.id + ': "' + a.s.slice(0, 40) + '"'); });
      log.slice(i + 1).forEach(b => { if (a.s !== b.s && hit(a, b)) out.push('Text: "' + a.s.slice(0, 30) + '" und "' + b.s.slice(0, 30) + '"'); });
    });
    tiles.forEach((a, i) => tiles.slice(i + 1).forEach(b => { if (a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y) out.push('Kacheln ' + a.id + ' und ' + b.id); }));
    return out;
  }
  // Alle Texte, die ein Zeichnen von d ausgibt (zum Pruefen, was unter einem Overlay gezeichnet wird oder nicht)
  function drawn(d) {
    const ctx = d.cv.getContext('2d'), o = ctx.fillText, l = [];
    ctx.fillText = function (s) { l.push(String(s)); return o.apply(this, arguments); };
    try { d.draw(); } finally { ctx.fillText = o; }
    return l;
  }
  window.OV = { check, drawn };
})();
