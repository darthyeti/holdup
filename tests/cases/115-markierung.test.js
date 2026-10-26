// Coop-Ausbau F2 (docs/coop-ausbau.md, Spur F): Markierung. Die Sprueche mit pt (Phase 1 Platz 3 "Sammeln bei mir!" an der Stelle des Senders, Platz 4 "Achtung, hier!" am Punkt des Fadenkreuzes, in Phase 2 ebenfalls Platz 4)
// setzen einen Ring fuer alle (CFG.funk.pingT Sekunden, Senderfarbe, mit Namen), hoechstens eine Markierung je Sender (die neue ersetzt die alte), andere Sender behalten ihre. Liegt der Punkt ausserhalb des Bildes,
// zeigt ein Pfeil mit Ring am Bildrand zu ihm (edgePt: Punkt auf dem Rand, Winkel, null wenn im Bild). Sprueche ohne pt setzen keine Markierung. reset() raeumt auf.
const SETUP = `(() => { const G = CT.mkGame('bank', 321, 3), A = G.A, B = G.clients[0], C = G.clients[1], P = A.get().players, F = A.CFG.funk, cb = A.NET.conns[0], cc = A.NET.conns[1];
  const say = (c, n, x, y) => { c.onmsg({ t: 'rad', c: n, x, y }); G.run(.3); }; return { G, A, B, C, P, F, cb, cc, say }; })()`;

module.exports = [
  {
    name: 'Markierung: "Achtung, hier!" setzt einen Ring am gemeldeten Punkt, "Sammeln bei mir!" an der Stelle des Senders, "Hilfe" und "leise vorgehen" setzen keinen; alle Instanzen sehen dieselben Ringe mit Rest der Zeit',
    async run(t) {
      await t.loadTool('loopnet.js'); await t.loadInpage('coop.js');
      const r = await t.page.evaluate(`(() => { const { G, A, B, C, P, F, cb, cc, say } = ${SETUP}, o = {}, pg = d => d.funk().pings.map(q => [q.id, Math.round(q.x), Math.round(q.y), q.t > F.pingT - 1.2 && q.t <= F.pingT]);
        say(cb, 0); say(cb, 1); G.run(F.cool); o.keine = [A, B, C].map(d => d.funk().pings.length);
        G.run(F.same); say(cb, 3, 300, 250); o.punkt = [A, B, C].map(pg);
        G.run(F.same); say(cc, 2, 9, 9); o.stelle = [A, B, C].map(pg).map(l => l.filter(q => q[0] === 2)); o.pos2 = [Math.round(P[2].x), Math.round(P[2].y)];
        return o; })()`);
      t.eq(r.keine, [0, 0, 0], 'Hilfe und leise vorgehen setzen keine Markierung');
      t.eq(r.punkt, [[[1, 300, 250, true]], [[1, 300, 250, true]], [[1, 300, 250, true]]], 'Platz 4: Ring bei Spieler 1 am Punkt (300, 250), die Restzeit liegt knapp unter pingT, bei allen');
      t.eq(r.stelle, [[[2, r.pos2[0], r.pos2[1], true]], [[2, r.pos2[0], r.pos2[1], true]], [[2, r.pos2[0], r.pos2[1], true]]], 'Platz 3: Ring bei Spieler 2 an dessen Stelle, nicht an den Zahlen des Clients (9, 9)');
    },
  },
  {
    name: 'Markierung: hoechstens eine je Sender (die neue ersetzt die alte), andere Sender behalten ihre, nach pingT Sekunden ist sie weg, reset() raeumt auf',
    async run(t) {
      await t.loadTool('loopnet.js'); await t.loadInpage('coop.js');
      const r = await t.page.evaluate(`(() => { const { G, A, B, C, P, F, cb, cc, say } = ${SETUP}, o = {}, pg = d => d.funk().pings.map(q => [q.id, Math.round(q.x), Math.round(q.y)]).sort();
        say(cb, 3, 300, 250); G.run(F.same); say(cc, 3, 400, 260); G.run(F.same); say(cb, 3, 500, 270); o.drei = [A, B, C].map(pg);
        o.rest = A.funk().pings.map(q => Math.round(q.t * 10) / 10).sort();
        G.run(F.pingT + .2); o.weg = [A, B, C].map(d => d.funk().pings.length);
        G.run(F.same); say(cb, 3, 600, 280); o.neu = A.funk().pings.length; A.reset(); o.nachReset = A.funk().pings.length;
        return o; })()`);
      t.eq(r.drei, [[[1, 500, 270], [2, 400, 260]], [[1, 500, 270], [2, 400, 260]], [[1, 500, 270], [2, 400, 260]]], 'zwei Sender, zwei Ringe, die neue von Spieler 1 hat die alte ersetzt');
      t.ok(r.rest[0] < r.rest[1], 'die Restzeiten unterscheiden sich (der ersetzte Ring ist neu, der von Spieler 2 aelter): ' + JSON.stringify(r.rest));
      t.eq(r.weg, [0, 0, 0], 'nach pingT Sekunden ist keine Markierung mehr da');
      t.eq([r.neu, r.nachReset], [1, 0], 'eine neue Markierung, reset() raeumt sie weg');
    },
  },
  {
    name: 'Markierung, Rand: edgePt liefert null fuer einen Punkt im Bild, sonst einen Punkt auf dem Rand (Abstand 30) mit dem Winkel zum Ziel (Osten 0, Westen Pi, Norden und Sueden dazwischen)',
    async run(t) {
      await t.loadTool('loopnet.js'); await t.loadInpage('coop.js');
      const r = await t.page.evaluate(`(() => { const { G, A } = ${SETUP}, o = {}, p = A.get().p;
        o.imBild = A.edgePt(p.x, p.y, 14); const w = (dx, dy) => { const e = A.edgePt(p.x + dx, p.y + dy, 14); return e && [Math.round(e.x), Math.round(e.y), Math.round(e.a * 100) / 100]; };
        o.ost = w(5000, 0); o.west = w(-5000, 0); o.nord = w(0, -5000); o.sued = w(0, 5000); o.ostNord = w(5000, -5000); return o; })()`);
      t.eq(r.imBild, null, 'die eigene Figur ist im Bild: null');
      t.eq(r.ost.slice(0, 1).concat(r.ost[2]), [930, 0], 'Osten: x am rechten Rand (960 minus 30), Winkel 0');
      t.eq(r.west.slice(0, 1).concat(r.west[2]), [30, 3.14], 'Westen: x bei 30, Winkel Pi');
      t.eq([r.nord[1], r.nord[2]], [30, -1.57], 'Norden: y bei 30, Winkel minus Pi halbe');
      t.eq([r.sued[1], r.sued[2]], [514, 1.57], 'Sueden: y bei 514 (544 minus 30), Winkel Pi halbe');
      t.eq(r.ostNord, [722, 30, -.79], 'diagonal: auf der Linie Bildmitte zum Ziel, am oberen Rand (y 30, x 480 plus 242), Winkel minus Pi viertel');
    },
  },
  {
    name: 'Markierung zeichnen: Ring am Punkt (Welt) und bei einem Punkt ausserhalb des Bildes ein Pfeil mit Ring am Bildrand; nach Ablauf zeichnet nichts mehr; der Name steht am Ring',
    async run(t) {
      await t.loadTool('loopnet.js'); await t.loadInpage('coop.js');
      const r = await t.page.evaluate(`(() => { const { G, A, B, C, P, F, cb, cc, say } = ${SETUP}, o = {}, ctx = B.cv.getContext('2d');
        const spy = () => { const tr = [], txt = [], ot = ctx.translate, ft = ctx.fillText; ctx.translate = function (x, y) { tr.push([Math.round(x), Math.round(y)]); return ot.apply(this, arguments); }; ctx.fillText = function (s) { txt.push(String(s)); return ft.apply(this, arguments); }; B.draw(); ctx.translate = ot; ctx.fillText = ft; return { tr, txt }; };
        const q = B.get().p, nah = [Math.round(q.x + 80), Math.round(q.y + 30)], fern = [Math.round(q.x + 3000), Math.round(q.y)];
        say(cc, 3, nah[0], nah[1]); G.run(.1); const d1 = spy(); o.nah = d1.tr.some(z => z[0] === nah[0] && z[1] === nah[1]); o.name = d1.txt.filter(s => s === 'Grün').length;
        G.run(F.same); say(cc, 3, fern[0], fern[1]); const e = B.edgePt(fern[0], fern[1], 14), d2 = spy(); o.fern = d2.tr.some(z => z[0] === Math.round(e.x) && z[1] === Math.round(e.y)); o.nahWeg = !d2.tr.some(z => z[0] === nah[0] && z[1] === nah[1]);
        G.run(F.pingT + .5); const d3 = spy(); o.nachAblauf = d3.tr.some(z => (z[0] === fern[0] && z[1] === fern[1]) || (z[0] === Math.round(e.x) && z[1] === Math.round(e.y)));
        return o; })()`);
      t.eq(r.nah, true, 'Ring am Punkt im Bild (translate auf den Punkt)');
      t.ok(r.name >= 1, 'der Name des Senders steht im Bild');
      t.eq(r.fern, true, 'ausserhalb des Bildes: Pfeil mit Ring am Rand');
      t.eq(r.nahWeg, true, 'die ersetzte Markierung wird nicht mehr gezeichnet');
      t.eq(r.nachAblauf, false, 'nach Ablauf wird nichts mehr gezeichnet');
    },
  },
];
