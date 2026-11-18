// Ticket #279 (2D-Wucht C, nur Optik): Nachwirkung von Explosionen und Gefechten. Eine Explosion (Ereignis bx) laesst einen warmen Schein an den Waenden haengen (Eintrag t:'l' in dbr, Umriss aus Strahlen bis zur ersten Wand,
// leuchtet nicht durch Waende), kleine Brocken nah liegen (t:'p' mit fx, Spur in dcv, Zaehler k), Restqualm langsam abziehen (t:'r', 4 bis 6 s), Russ (Zaehler w) und Kerben (Zaehler n) an der Wandkante, Holzsplitter fliegen
// von Barrikaden (Treffer hw auf X). Niedrig: nur Russ und wenige Brocken. Coop: Zufall aus dem Ort, der Client sieht dasselbe.
async function setup(t) {
  await t.loadTool('loopnet.js');
  await t.loadInpage('coop.js');
}
// offene Kachel neben einer Wand in der Naehe des Spielers (Mitte der Kachel), mit Wand rechts
const SPOT = `(A) => { const m = A.get().me, w = A.world(), T = 32, tx0 = Math.floor(m.x / T), ty0 = Math.floor(m.y / T);
  for (let R = 1; R < 30; R++) for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) { const tx = tx0 + dx, ty = ty0 + dy; if (!w.isSol(tx, ty) && w.cell(tx, ty) !== 'v' && !w.isSol(tx - 1, ty) && w.isOpq(tx + 1, ty) && !w.isSol(tx, ty - 1) && !w.isSol(tx, ty + 1)) return [tx * T + 16, ty * T + 16]; }
  return null; }`;
const KINDS = `(d) => { const o = {}; for (const q of d.dbrL()) { const k = q.t === 'p' ? q.kd : q.t; o[k] = (o[k] || 0) + 1; } return o; }`;

module.exports = [
  {
    name: 'Nachwirkung: Schein (l), Brocken (rock) und Restqualm (r) je Stufe, niedrig ohne Schein und Qualm, nur wenige Brocken',
    async run(t) {
      await setup(t);
      const r = await t.page.evaluate(`(() => { const SPOT = ${SPOT}, K = ${KINDS}, o = {}, G = CT.mkGame('bank', 5017, 1), A = G.A, F = A.CFG.fx.boom; o.F = [F.rock, F.qualm, F.warm.rays];
        const [x, y] = SPOT(A); o.spot = !!x;
        for (const lv of ['niedrig', 'mittel', 'hoch']) { GFX.set(lv); A.reset(); A.ptClear(); A.evt('bx', [x, y, 90, 0]); o[lv] = K(A); }
        GFX.set('mittel'); A.reset(); A.ptClear(); A.evt('bx', [x, y, 90, 0]); let dmax = 0; for (const q of A.dbrL()) if (q.kd === 'rock') dmax = Math.max(dmax, Math.hypot(q.vx, q.vy));
        o.vmax = dmax; o.hp = A.get().me.hp;
        const at = (s) => { const n = Math.round(s * 30) - (at.t || 0); for (let i = 0; i < n; i++) A.update(1 / 30); at.t = Math.round(s * 30); return K(A); };
        o.t05 = at(.5); o.t1 = at(1.1); o.t35 = at(3.5); o.t7 = at(7); GFX.set('niedrig'); return o; })()`);
      t.ok(r.spot, 'Ort an einer Wand gefunden');
      t.eq([r.niedrig.l || 0, r.niedrig.r || 0], [0, 0], 'niedrig: kein Schein, kein Restqualm'); t.ok(r.niedrig.rock >= 1 && r.niedrig.rock <= 3, 'niedrig: wenige Brocken: ' + r.niedrig.rock);
      t.eq(r.mittel.l, 1, 'mittel: ein Schein'); t.eq(r.mittel.r, r.F[1][1], 'mittel: Restqualm ' + r.F[1][1]); t.ok(r.mittel.rock >= 5 && r.mittel.rock <= r.F[0][1], 'mittel: Brocken: ' + r.mittel.rock);
      t.ok(r.hoch.rock > r.mittel.rock && r.hoch.r > r.mittel.r, 'hoch: mehr Brocken und mehr Qualm');
      t.ok(r.vmax <= 115, 'die Brocken starten langsam (hoechstens 115 px/s): ' + r.vmax);
      t.eq(r.hp, 100, 'keine Wirkung auf die Spielfigur');
      t.eq(r.t05.l, 1, 'nach 0,5 s scheint der Schein noch'); t.ok(!r.t1.l, 'nach 1,1 s ist der Schein aus'); t.ok(r.t35.r === r.F[1][1], 'Qualm haengt noch nach 3,5 s: ' + r.t35.r); t.ok(!r.t7.r, 'nach 7 s ist der Qualm abgezogen');
    },
  },
  {
    name: 'Nachwirkung: der Schein haengt an der Wand und leuchtet nicht hindurch (Umriss endet hoechstens 12 px in der Wand)',
    async run(t) {
      await setup(t);
      const r = await t.page.evaluate(`(() => { const SPOT = ${SPOT}, o = {}, G = CT.mkGame('bank', 5017, 1), A = G.A, w = A.world(), T = 32; GFX.set('hoch'); A.reset(); A.ptClear();
        const [x, y] = SPOT(A); A.evt('bx', [x, y, 90, 0]); A.update(1 / 30); A.draw(); const q = A.dbrL().find(e => e.t === 'l'); o.n = q && q.poly ? q.poly.length : 0; let bad = 0, worst = 0, walls = 0;
        for (const [px, py] of q.poly) { const d = Math.hypot(px - x, py - y); let inWall = 0; for (let s = 0; s < d; s += 2) if (w.isOpq(Math.floor((x + (px - x) * s / d) / T), Math.floor((y + (py - y) * s / d) / T))) { inWall = d - s; break; } if (inWall > 0) walls++; worst = Math.max(worst, inWall); if (inWall > 12) bad++; }
        o.bad = bad; o.worst = worst; o.walls = walls; o.r = q.r; GFX.set('niedrig'); return o; })()`);
      t.eq(r.n, 32, 'hoch: 32 Strahlen'); t.ok(r.walls >= 3, 'mehrere Strahlen enden an der Wand: ' + r.walls); t.eq(r.bad, 0, 'kein Strahl reicht mehr als 12 px in eine Wand (am schlimmsten ' + r.worst + ')');
    },
  },
  {
    name: 'Nachwirkung: Brocken landen nah und bleiben als Spur (Zaehler k) liegen, Russ (w) und Kerben (n) an der Wandkante, Obergrenzen je Stufe, niedrig Russ und wenige Brocken',
    async run(t) {
      await setup(t);
      const r = await t.page.evaluate(`(() => { const SPOT = ${SPOT}, o = {}, G = CT.mkGame('bank', 5017, 1), A = G.A, w = A.world(), T = 32, [x, y] = SPOT(A);
        const solid = (px, py) => { const tx = Math.floor(px / T), ty = Math.floor(py / T); return w.isSol(tx, ty) && w.cell(tx, ty) !== 'v'; };
        GFX.set('mittel'); A.reset(); A.ptClear(); const h0 = A.trHash(); A.evt('bx', [x, y, 90, 0]); o.sofort = A.tr(); let inWall = 0, far = 0; for (let i = 0; i < 30 * 6; i++) { A.update(1 / 30); for (const q of A.dbrL()) if (q.fx) { if (solid(q.x, q.y)) inWall++; far = Math.max(far, Math.hypot(q.x - x, q.y - y)); } }
        o.inWall = inWall; o.far = far; o.k = A.tr(); o.rest = A.dbrL().filter(q => q.fx).length; o.hash = A.trHash() !== h0;
        GFX.set('niedrig'); A.reset(); A.ptClear(); A.evt('bx', [x, y, 90, 0]); for (let i = 0; i < 30 * 6; i++) A.update(1 / 30); o.low = A.tr();
        GFX.set('mittel'); A.reset(); for (let j = 0; j < 40; j++) { A.evt('bx', [x, y, 90, 0]); for (let i = 0; i < 30 * 5; i++) A.update(1 / 30); A.ptClear(); } o.cap = A.tr();
        GFX.set('niedrig'); return o; })()`);
      t.ok(r.sofort.w >= 1 && r.sofort.w <= 14, 'mittel: Russ an der Wandkante sofort (w): ' + r.sofort.w); t.ok(r.sofort.n >= 1, 'Kerben (n): ' + r.sofort.n);
      t.eq(r.inWall, 0, 'kein Brocken ist je in einer Wandkachel'); t.ok(r.far < 90, 'die Brocken landen nah (hoechstens 90 px vom Knall): ' + Math.round(r.far)); t.eq(r.rest, 0, 'nach 6 s liegt alles');
      t.ok(r.k.k >= 4 && r.k.k <= 8, 'die Brocken liegen als Spur in dcv (Zaehler k): ' + r.k.k); t.ok(r.hash, 'dcv hat sich veraendert');
      t.ok(r.low.w >= 1 && r.low.k >= 1 && r.low.k <= 3 && r.low.s === 0, 'niedrig: Russ an der Wand und wenige Brocken, keine grosse Russfahne: ' + JSON.stringify(r.low));
      t.ok(r.cap.k <= 40 && r.cap.w <= 30 && r.cap.n <= 24, 'Obergrenzen mittel (k 40, w 30, n 24): ' + JSON.stringify(r.cap));
    },
  },
  {
    name: 'Nachwirkung: Holzsplitter von Barrikaden fliegen und bleiben liegen, Treffer auf andere Waende machen keine; brennendes Wrack hinterlaesst am Ende Restqualm',
    async run(t) {
      await setup(t);
      const r = await t.page.evaluate(`(() => { const SPOT = ${SPOT}, K = ${KINDS}, o = {}, G = CT.mkGame('bank', 5017, 1), A = G.A, w = A.world(), T = 32, [x, y] = SPOT(A), tx = Math.floor(x / T) + 1, ty = Math.floor(y / T);
        GFX.set('mittel'); A.reset(); A.ptClear(); A.evt('hw', [x + 20, y]); o.wand = K(A).wood || 0;
        w.setc(tx, ty, 'X'); A.evt('hw', [tx * T + 6, ty * T + 16]); o.bar = K(A).wood || 0;
        for (let i = 0; i < 30 * 5; i++) A.update(1 / 30); o.rest = A.dbrL().filter(q => q.kd === 'wood').length; o.k = A.tr().k;
        A.reset(); A.ptClear(); A.evt('bx', [x, y, 90, 1]); const r0 = K(A).r; for (let i = 0; i < 30 * 8; i++) A.update(1 / 30); o.r0 = r0; o.r8 = K(A).r || 0; for (let i = 0; i < 30 * 15; i++) A.update(1 / 30); o.brn = A.brn().length; o.r23 = K(A).r || 0;
        GFX.set('niedrig'); return o; })()`);
      t.eq(r.wand, 0, 'ein Treffer auf eine Betonwand macht keine Holzsplitter'); t.ok(r.bar >= 3, 'ein Treffer auf die Barrikade macht Holzsplitter (mittel 3): ' + r.bar); t.eq(r.rest, 0, 'nach 5 s liegen sie'); t.ok(r.k >= 1, 'als Spur (Zaehler k): ' + r.k);
      t.ok(r.r0 >= 3, 'beim Knall Restqualm: ' + r.r0); t.eq(r.brn, 0, 'die Brandstelle ist erloschen'); t.eq(r.r8, 0, 'der Qualm vom Knall ist nach 8 s weg'); t.ok(r.r23 >= 2, 'beim Erloeschen des Wracks (22 s) zieht noch einmal Restqualm ab: ' + r.r23);
    },
  },
  {
    name: 'Nachwirkung im Coop: der Client malt dieselben Brocken, Splitter und Spuren, ohne dass das Netzformat sich aendert',
    async run(t) {
      await setup(t);
      const r = await t.page.evaluate(`(() => { const SPOT = ${SPOT}, K = ${KINDS}, o = {}, G = CT.mkGame('bank', 5017, 2), A = G.A, B = G.clients[0]; GFX.set('hoch'); A.reset(); B.reset(); G.run(.3); A.ptClear(); B.ptClear();
        const [x, y] = SPOT(A); A.evt('bx', [x, y, 90, 0]); G.run(.2);
        o.host = K(A); o.client = K(B); const sig = (D) => D.dbrL().filter(q => q.fx || q.t === 'r' || q.t === 'l').map(q => [q.kd || q.t, Math.round(q.vx || 0), Math.round(q.vy || 0)].join(':')).sort().join();
        o.sh = sig(A); o.sc = sig(B); G.run(6); o.tr = [A.tr(), B.tr()]; o.hash = A.trHash() === B.trHash(); GFX.set('niedrig'); return o; })()`);
      t.ok(r.client.rock >= 5 && r.client.l === 1 && r.client.r >= 3, 'der Client hat Schein, Brocken und Qualm: ' + JSON.stringify(r.client));
      t.eq(r.sc, r.sh, 'gleiche Eintraege mit gleichen Anfangsgeschwindigkeiten (Zufall aus dem Ort)');
      t.eq(r.tr[0], r.tr[1], 'gleiche Zaehler der Spuren'); t.ok(r.hash, 'gleiches Bild von dcv');
    },
  },
];
