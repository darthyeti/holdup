// Seitenskript: zeichnet die Draufsicht einer Karte auf ein Canvas (statische Ebene, Objektebene, Wachrouten, Kameras, Beute, Laser, Zapfsaeulen, Strasse, Posten).
// RN.draw(szenario, seed oder Grundrissname, Seite) liefert { c: Canvas, seed, hall } oder { err }. Benutzt von render.js (eine Karte als PNG) und sheet.js (Kontaktbogen).
(function () {
  function draw(sc, sd, turn) {
    const D = __dbg; D.setScenario(sc); D.setSeedMode('random'); D.setLage([]);
    let seed = +sd;
    if (isNaN(seed)) { seed = null; for (let s = 1; s < 3000; s++) if (D.layoutBase(s).hall === sd) { seed = s; break; } if (seed == null) return { err: 'Grundriss nicht gefunden: ' + sd }; }
    let lay = D.layoutBase(seed); if (turn) lay = D.turnLayout(lay, turn[0], turn[1] === '+');
    D.buildLay(lay);
    const L = D.LAY(), w = D.world(), T = 32, B = L.bld, ln = D.LANE();
    // Ausschnitt: Gebaeude mit Rand, dazu Wagenplaetze, Fahrstrecke des Fluchtwagens, Fluchtzone und Posten
    let bx0 = B.x0 - 3, by0 = B.y0 - 3, bx1 = B.x1 + 3, by1 = B.y1 + 3;
    const ext = (x, y) => { bx0 = Math.min(bx0, x - 1); by0 = Math.min(by0, y - 1); bx1 = Math.max(bx1, x + 1); by1 = Math.max(by1, y + 1); };
    ln.slots.forEach(q => q.cells.forEach(c => ext(c[0], c[1]))); ln.van.swept.forEach(c => ext(c[0], c[1])); ln.exit.cells.forEach(c => ext(c[0], c[1])); L.posts.forEach(p => ext(p.x, p.y));
    bx0 = Math.max(w.WX0, bx0); by0 = Math.max(w.WY0, by0); bx1 = Math.min(w.WX0 + w.W - 1, bx1); by1 = Math.min(w.WY0 + w.H - 1, by1);
    const S = Math.min(2, 1700 / ((bx1 - bx0 + 1) * T), 1700 / ((by1 - by0 + 1) * T));
    const c = document.createElement('canvas'); c.width = Math.round((bx1 - bx0 + 1) * T * S); c.height = Math.round((by1 - by0 + 1) * T * S);
    const x = c.getContext('2d'); x.scale(S, S); x.translate(-bx0 * T, -by0 * T);
    x.drawImage(w.st, w.WX0 * T, w.WY0 * T, w.W * T, w.H * T); x.drawImage(w.so, w.WX0 * T, w.WY0 * T, w.W * T, w.H * T);
    const route = (pts, col, start) => { x.strokeStyle = col; x.fillStyle = col; x.beginPath(); pts.forEach((p, i) => { const px = (p[0] + .5) * T, py = (p[1] + .5) * T; i ? x.lineTo(px, py) : x.moveTo(px, py); }); x.closePath(); x.stroke(); pts.forEach((p, i) => { x.beginPath(); x.arc((p[0] + .5) * T, (p[1] + .5) * T, i ? 3 : 6, 0, 6.3); x.fill(); }); };
    x.lineWidth = 1.5; const cols = ['#ff3b30', '#ffcc00', '#34c759', '#00c7ff'];
    (L.guards || []).forEach((g, i) => route(g.route, cols[i % 4]));
    (L.mission.extra || []).forEach(e => { route(e.route, '#ff00ff'); x.fillStyle = '#ff00ff'; x.fillRect(e.p[0] * T + 8, e.p[1] * T + 8, 16, 16); });
    if (L.mgr) route(L.mgr.route, '#ff9500');
    (L.cams || []).forEach(q => { x.fillStyle = '#ff2d55'; x.beginPath(); x.arc(q.x, q.y, 5, 0, 6.3); x.fill(); x.strokeStyle = 'rgba(255,45,85,.6)'; x.beginPath(); x.moveTo(q.x, q.y); x.lineTo(q.x + Math.cos(q.a0) * 40, q.y + Math.sin(q.a0) * 40); x.stroke(); });
    x.lineWidth = 1; x.strokeStyle = '#00ffd0';
    for (const q of (L.goods || []).concat(L.vit || [])) x.strokeRect(q.rc[0], q.rc[1], q.rc[2], q.rc[3]);
    x.lineWidth = 3; x.strokeStyle = '#ff0000'; (L.lasers || []).forEach(q => { x.beginPath(); x.moveTo(q[0] * T, q[1] * T); x.lineTo(q[2] * T, q[3] * T); x.stroke(); });
    x.lineWidth = 2; x.strokeStyle = '#ff7700'; (L.pumps || []).forEach(q => x.strokeRect(q.x * T + 2, q.y * T + 2, T - 4, T - 4));
    // Strasse: Wagenplaetze blau (Zielpunkt als Kreuz, Aussteigepunkt als Kreis), Fluchtwagen-Strecke gruen, Fluchtzone gruen gefuellt, Posten rot mit Blickrichtung
    x.lineWidth = 1.5; x.strokeStyle = '#4aa8ff';
    ln.slots.forEach(q => { const xs = q.cells.map(c => c[0]), ys = q.cells.map(c => c[1]); x.strokeRect(Math.min(...xs) * T, Math.min(...ys) * T, (Math.max(...xs) - Math.min(...xs) + 1) * T, (Math.max(...ys) - Math.min(...ys) + 1) * T); x.beginPath(); x.arc((q.curb[0] + .5) * T, (q.curb[1] + .5) * T, 4, 0, 6.3); x.stroke(); });
    x.strokeStyle = '#46e06a'; x.setLineDash([6, 4]); { const a = ln.pt(ln.van.from, ln.van.pos), b = ln.pt(ln.van.stop, ln.van.pos); x.beginPath(); x.moveTo(a[0], a[1]); x.lineTo(b[0], b[1]); x.stroke(); const m = ln.van.mid(ln.van.stop); x.setLineDash([]); x.strokeRect(m[0] - (ln.axis === 'x' ? 64 : 32), m[1] - (ln.axis === 'x' ? 32 : 64), ln.axis === 'x' ? 128 : 64, ln.axis === 'x' ? 64 : 128); }
    x.fillStyle = 'rgba(70,224,106,.25)'; ln.exit.cells.forEach(c => x.fillRect(c[0] * T, c[1] * T, T, T));
    x.fillStyle = '#ff3b30'; x.strokeStyle = '#ff3b30'; L.posts.forEach((p, i) => { const px = (p.x + .5) * T, py = (p.y + .5) * T; x.beginPath(); x.arc(px, py, p.anchor ? 6 : 4, 0, 6.3); x.fill(); x.beginPath(); x.moveTo(px, py); x.lineTo(px + Math.cos(p.a) * 14, py + Math.sin(p.a) * 14); x.stroke(); });
    x.fillStyle = '#fff'; x.beginPath(); x.arc(L.spawn.x, L.spawn.y, 6, 0, 6.3); x.fill();
    x.fillStyle = 'rgba(255,255,255,.55)'; x.font = '9px sans-serif';
    for (let tx = bx0; tx <= bx1; tx++) if (tx % 2 === 0) x.fillText(tx, tx * T + 1, by0 * T + 9);
    for (let ty = by0; ty <= by1; ty++) if (ty % 2 === 0) x.fillText(ty, bx0 * T + 1, ty * T + 9);
    x.setTransform(1, 0, 0, 1, 0, 0); x.fillStyle = '#fff'; x.font = 'bold 22px sans-serif'; x.fillText(sc + ' #' + seed + ' ' + (L.hall || '') + (turn ? ' Strasse ' + turn : ''), 10, 24);
    return { c, seed, hall: L.hall || '' };
  }
  window.RN = { draw };
})();
