// Ticket #278 (2D-Wucht B, nur Optik): Figuren fallen mit Wucht. Wer an einer Kugel stirbt, wird in Schussrichtung zurueckgestossen und rutscht aus (6 bis 14 px, Praezisionsgewehr und Schrot mal 1,6),
// wer an einer Explosion stirbt, fliegt von ihr weg im Bogen (nicht durch Waende), Muetze oder Helm und Waffe fliegen weg (je Stufe 1, 2, 3 Teile) und bleiben als Spur in dcv liegen, ein Schild kippt um.
// Bewusstlose sinken sanft (3 px), Spieler am Boden werden nur zurueckgestossen. Die Richtung kommt aus den Ereignissen hf und bx, Host und Client zeichnen gleich (Zufall aus dem Ort, trR),
// die Leiche der Simulation bleibt, wo sie ist (nur gezeichneter Versatz), der Spielzustand bleibt mit und ohne Wucht gleich.
async function setup(t) {
  await t.loadTool('loopnet.js');
  await t.loadInpage('coop.js');
}
// ein Polizist (k: true SWAT, 'shield' Schild) in dx Pixel Abstand vom Spieler, ein Schuss von links toetet ihn (d 200), pw 1 setzt pr (Praezisionsgewehr)
const KILL = `(A, dx, pw, k) => { if (A.get().phase === 1) A.startHeist(); const m = A.get().me, e = A.mkCop(m.x + dx, m.y, k || false); A.get().en.push(e); e.hp = 10; if (k === 'shield') e.sh = 0;
  A.get().bl.push({ id: 9000 + A.get().bl.length, x: e.x - 4, y: e.y, vx: 720, vy: 0, l: .5, o: 1, own: 0, d: 200, pr: pw ? 1 : 0, pc: 1 }); return e; }`;
const BOOM = `(A, x, y, r) => A.blastAt(x, y, { dmg: 300, pdmg: 0, r: r || 110, scorch: 20 }, 0, 0)`;

module.exports = [
  {
    name: 'Kugeltod: die Figur wird in Schussrichtung 6 bis 14 px zurueckgestossen (abklingend), mit Praezisionsgewehr weiter, die Leiche der Simulation bleibt stehen',
    async run(t) {
      await setup(t);
      const r = await t.page.evaluate(`(() => { const KILL = ${KILL}, G = CT.mkGame('bank', 5017, 1), A = G.A, o = {}; GFX.set('mittel');
        const run = (pw, dx) => { const e = KILL(A, dx, pw), x0 = e.x, y0 = e.y; G.run(1 / 30); const c = A.corpL().find(q => Math.abs(q.x - x0) < 3 && Math.abs(q.y - y0) < 3); const p0 = A.wuPose(c);
          const w0 = A.wu().fl.find(f => Math.abs(f.x - c.x) < 1 && Math.abs(f.y - c.y) < 1);
          const mid = []; for (let i = 0; i < 20; i++) { G.run(1 / 30); const q = A.wuPose(c); mid.push(Math.round((q.x - c.x) * 10) / 10); }
          const p1 = A.wuPose(c); return { x0: c.x, y0: c.y, c: [c.x, c.y], kind: w0 && w0.kind, d: p1.x - c.x, dy: p1.y - c.y, mid, p0: p0 && p0.x - c.x, lift: p1.lift }; };
        o.a = run(0, 140); o.b = run(1, 200); o.n = A.corpL().length; return o; })()`);
      t.eq(r.a.kind, 's', 'Rueckstoss, kein Flug');
      t.eq(r.a.c, [r.a.x0, r.a.y0], 'die Leiche der Simulation liegt am alten Ort'); t.ok(r.a.d >= 6 && r.a.d <= 14.01, 'Versatz 6 bis 14 px in Schussrichtung (+x): ' + r.a.d); t.ok(Math.abs(r.a.dy) < 0.01, 'genau in Schussrichtung');
      t.ok(r.a.mid[0] > 0 && r.a.mid[0] < r.a.d && r.a.mid[10] > r.a.mid[0], 'er rutscht aus und kommt zur Ruhe: ' + r.a.mid.join(' ')); t.eq(r.a.lift, 0, 'am Boden, kein Abheben');
      t.ok(r.b.d >= 9.6 && r.b.d <= 22.5, 'Praezisionsgewehr stoesst staerker (bis 22 px): ' + r.b.d); t.eq(r.n, 2, 'zwei Leichen');
    },
  },
  {
    name: 'Explosionstod: die Figur fliegt von der Explosion weg im Bogen mit Drehung und Vergroesserung, schlaegt auf, geht nicht durch Waende, die Leiche der Simulation bleibt',
    async run(t) {
      await setup(t);
      const r = await t.page.evaluate(`(() => { const BOOM = ${BOOM}, G = CT.mkGame('bank', 5017, 1), A = G.A, w = A.world(), T = 32, o = {}; GFX.set('mittel');
        const m = A.get().me, e = A.mkCop(m.x + 200, m.y, false); A.get().en.push(e); e.hp = 10; const x0 = e.x, y0 = e.y;
        BOOM(A, x0 - 30, y0); G.run(1 / 30); const c = A.corpL().find(q => Math.abs(q.x - x0) < 1);
        const poses = []; for (let i = 0; i < 40; i++) { poses.push(A.wuPose(c)); G.run(1 / 30); } const last = A.wuPose(c);
        o.kind = A.wu().fl.find(f => Math.abs(f.x - x0) < 1).kind; o.maxLift = Math.max(...poses.map(q => q.lift)); o.maxSc = Math.max(...poses.map(q => q.sc)); o.rot = poses.map(q => q.rot);
        o.d = last.x - x0; o.dy = last.y - y0; o.c = [c.x - x0, c.y - y0]; o.lastLift = last.lift;
        // an der Wand: ein Tile mit freiem Westen und Wand im Osten
        const solid = (x, y) => w.isSol(Math.floor(x / T), Math.floor(y / T)) && w.cell(Math.floor(x / T), Math.floor(y / T)) !== 'v'; let spot = null;
        for (let ty = 2; ty < w.M.length - 2 && !spot; ty++) for (let tx = 2; tx < w.M[0].length - 3 && !spot; tx++) if (!solid(tx * 32 + 16, ty * 32 + 16) && !solid((tx - 1) * 32 + 16, ty * 32 + 16) && solid((tx + 1) * 32 + 16, ty * 32 + 16)) spot = [tx * 32 + 16, ty * 32 + 16];
        o.spot = !!spot; if (spot) { A.get().me.x = spot[0] - 200; const f = A.mkCop(spot[0], spot[1], false); A.get().en.push(f); f.hp = 10; BOOM(A, spot[0] - 20, spot[1], 60); G.run(1 / 30); const c2 = A.corpL().find(q => Math.abs(q.x - spot[0]) < 1 && Math.abs(q.y - spot[1]) < 1);
          let inWall = 0; for (let i = 0; i < 40; i++) { const q = A.wuPose(c2); if (q && solid(q.x, q.y)) inWall++; G.run(1 / 30); } o.inWall = inWall; const q = A.wuPose(c2); o.wallD = q ? q.x - spot[0] : null; }
        return o; })()`);
      t.eq(r.kind, 'f', 'Flug'); t.ok(r.maxLift > 20 && r.maxLift <= 27, 'Bogenhoehe bis 26 px: ' + r.maxLift); t.ok(r.maxSc > 1.15, 'im Scheitel groesser: ' + r.maxSc);
      t.ok(Math.abs(r.rot[20]) > 1.5 && Math.abs(r.rot[20]) < Math.abs(r.rot[39]) + 0.001 || Math.abs(r.rot[39]) > 5, 'er dreht sich im Flug: ' + r.rot.slice(0, 40).map(v => v.toFixed(1)).join(' '));
      t.ok(r.d > 26 && r.d <= 62.1 && Math.abs(r.dy) < 0.01, 'fliegt von der Explosion (links) weg nach rechts, 26 bis 62 px: ' + r.d); t.eq(r.c, [0, 0], 'die Leiche der Simulation bleibt'); t.eq(r.lastLift, 0, 'er liegt am Ende am Boden');
      t.ok(r.spot, 'Wandstelle gefunden'); t.eq(r.inWall, 0, 'nie in einer Wand'); t.ok(r.wallD < 30, 'an der Wand kuerzer: ' + r.wallD);
    },
  },
  {
    name: 'Teile: Muetze und Waffe fliegen weg (je Stufe 1, 2, 3 Teile), landen als Spur in dcv (Obergrenze TRC f), SWAT traegt Helm, ein Schild-Beamter laesst das Schild umkippen',
    async run(t) {
      await setup(t);
      const r = await t.page.evaluate(`(() => { const KILL = ${KILL}, BOOM = ${BOOM}, G = CT.mkGame('bank', 5017, 1), A = G.A, o = {};
        for (const lv of ['niedrig', 'mittel', 'hoch']) { GFX.set(lv); A.reset(); const e = KILL(A, 140, 0, 'shield'); e.sh = 0; G.run(1 / 30); o[lv] = A.wu().fdb.map(q => q.kd); }
        GFX.set('hoch'); A.reset(); const m = A.get().me; const e = A.mkCop(m.x + 140, m.y, 'shield'); e.sh = 50; A.get().en.push(e); e.hp = 10; BOOM(A, e.x - 30, e.y); G.run(1 / 30); o.schild = A.wu().fdb.map(q => q.kd);
        A.reset(); const s = KILL(A, 140, 0, true); G.run(1 / 30); o.swat = A.wu().fdb.map(q => [q.kd, q.hel]);
        // Landen und Spur
        GFX.set('mittel'); A.reset(); const f0 = A.tr().f || 0; KILL(A, 140, 0); G.run(1 / 30); const n0 = A.wu().fdb.length; let inAir = 0; for (let i = 0; i < 30 * 6; i++) { G.run(1 / 30); inAir = Math.max(inAir, A.wu().fdb.filter(q => q.z > 0).length); }
        o.n0 = n0; o.rest = A.wu().fdb.length; o.stamps = (A.tr().f || 0) - f0; o.inAir = inAir;
        // Obergrenze mittel 40
        A.reset(); for (let i = 0; i < 60; i++) { KILL(A, 140 + (i % 5) * 4, 0); G.run(1 / 30); for (let k = 0; k < 30 * 6; k++) G.run(1 / 30); A.get().en.length = 0; } o.cap = A.tr().f;
        return o; })()`);
      t.eq(r.niedrig, ['sh'], 'niedrig: ein Teil (bei Schild das Schild)'); t.eq(r.mittel, ['sh', 'cap'], 'mittel: Schild und Muetze'); t.eq(r.hoch, ['sh', 'cap', 'gun'], 'hoch: Schild, Muetze, Waffe');
      t.ok(r.schild.includes('sh') && r.schild.includes('cap'), 'auch bei Explosion kippt das Schild');
      t.eq(r.swat, [['cap', true], ['gun', true]].slice(0, r.swat.length), 'SWAT: Helm (hel) und Waffe');
      t.ok(r.n0 >= 2 && r.rest === 0, 'alle Teile kommen zur Ruhe: ' + r.n0 + ' dann ' + r.rest); t.ok(r.stamps >= 1 && r.stamps <= r.n0, 'sie bleiben als Spur in dcv liegen: ' + r.stamps);
      t.ok(r.cap <= 40, 'Spuren der Teile unter der Obergrenze mittel (40): ' + r.cap);
    },
  },
  {
    name: 'Bewusstlose sinken sanft (3 px, kein Wegschleudern), Spieler am Boden bekommen nur den Rueckstoss, auch bei einer Explosion kein Flug, danach bleibt die Pose beim Verbluten',
    async run(t) {
      await setup(t);
      const r = await t.page.evaluate(`(() => { const BOOM = ${BOOM}, G = CT.mkGame('bank', 5017, 2), A = G.A, o = {}; GFX.set('mittel'); A.startHeist(); G.run(.2);
        const n = A.get().npcs.find(q => q.st !== 'away' && q.k === 'civ') || A.get().npcs[0]; n.st = 'ko'; n.kt = 30; G.run(.1); const k0 = A.wu().fl.find(f => f.ko); o.ko = k0 && [k0.kind, k0.d]; G.run(.6);
        const pk = A.wuPose(n, 'k' + n.id); o.koPose = pk && [Math.hypot(pk.x - n.x, pk.y - n.y), pk.lift, pk.sc];
        const q = A.get().players[1]; q.x = A.get().me.x + 40; q.y = A.get().me.y; q.hp = 5;
        A.get().bl.push({ id: 9500, x: q.x - 5, y: q.y, vx: 420, vy: 0, l: 1, o: 0, dmg: 60 }); G.run(.2);
        o.dead = [q.dead, q.dn > 0]; const w = A.wu().fl.find(f => f.pl); o.pl = w && [w.kind, +w.ux.toFixed(2), +w.uy.toFixed(2)]; G.run(.6); const pp = A.wuPose({ x: q.x, y: q.y }, 'p' + q.id); o.plD = pp && [pp.x - q.x, pp.lift];
        // Explosion neben ihm: bleibt ein Rueckstoss (s), kein Flug
        q.dn = 40; BOOM(A, q.x - 20, q.y, 80); G.run(.1); o.kinds = A.wu().fl.filter(f => f.pl).map(f => f.kind);
        return o; })()`);
      t.eq(r.ko, ['k', 3], 'KO: sanftes Umfallen'); t.ok(r.koPose[0] <= 3.01 && r.koPose[1] === 0 && r.koPose[2] < 1.01, 'KO: nur ein paar px, kein Abheben: ' + r.koPose);
      t.eq(r.dead, [true, true], 'der Spieler ist am Boden (Simulation wie bisher)'); t.eq(r.pl[0], 's', 'am Boden: Rueckstoss'); t.ok(r.pl[1] > 0.95, 'in Schussrichtung +x: ' + r.pl); t.ok(r.plD[0] >= 6 && r.plD[0] <= 14.01 && r.plD[1] === 0, 'am Boden 6 bis 14 px, kein Heben: ' + r.plD);
      t.ok(r.kinds.every(k => k === 's'), 'auch bei Explosion nur Rueckstoss: ' + r.kinds);
    },
  },
  {
    name: 'Coop: der Client zeichnet dieselbe Bewegung und dieselben Teile wie der Host (Richtung aus den Ereignissen, Zufall aus dem Ort), das Netzformat bleibt (VER gleich)',
    async run(t) {
      await setup(t);
      const r = await t.page.evaluate(`(() => { const KILL = ${KILL}, BOOM = ${BOOM}, G = CT.mkGame('bank', 5017, 2), A = G.A, B = G.clients[0], o = {}; GFX.set('hoch');
        A.startHeist(); G.run(.2); const m = A.get().me; const e1 = A.mkCop(m.x + 140, m.y - 30, false); A.get().en.push(e1); e1.hp = 10; const e2 = A.mkCop(m.x + 140, m.y + 40, true); A.get().en.push(e2); e2.hp = 10;
        A.get().bl.push({ id: 9600, x: e1.x - 4, y: e1.y, vx: 720, vy: 0, l: .5, o: 1, own: 0, d: 200, pc: 1 }); G.run(.05); BOOM(A, e2.x - 25, e2.y - 10);
        G.run(.5); const sig = d => d.wu().fl.filter(f => f.kind !== 'p' && f.kind !== 'n' && !f.pl).map(f => [f.kind, +f.ux.toFixed(2), +f.uy.toFixed(2), +f.d.toFixed(1), +f.sp, Math.round(f.x), Math.round(f.y)].join(':')).sort();
        o.host = sig(A); o.cli = sig(B); o.pa = A.wu().fdb.map(q => q.kd).sort(); o.pb = B.wu().fdb.map(q => q.kd).sort();
        G.run(5); o.restA = A.wu().fdb.length; o.restB = B.wu().fdb.length; o.trA = A.tr().f || 0; o.trB = B.tr().f || 0; o.ver = [A.NET.VER, B.NET.VER];
        A.draw(); B.draw(); return o; })()`);
      t.eq(r.host.length, 2, 'Host: zwei Leichen mit Bewegung: ' + r.host);
      t.eq(r.cli, r.host, 'Client: dieselbe Art, Richtung, Weite und Drehrichtung');
      t.ok(r.pa.length >= 2, 'Host hat Teile'); t.eq(r.restA, 0, 'sie kommen zur Ruhe'); t.eq(r.restB, 0); t.eq(r.trB > 0, r.trA > 0, 'beide stempeln Spuren');
    },
  },
  {
    name: 'Simulation bleibt gleich: gleicher Seed mit Schuessen und Explosion, mit und ohne Wucht (CFG.fx.fall.on) gleiche Leichen, Treffer und Stand; ohne Wucht gibt es keine Teile',
    async run(t) {
      await setup(t);
      const run = (on) => t.page.evaluate(`(() => { const KILL = ${KILL}, BOOM = ${BOOM}, G = CT.mkGame('bank', 5017, 1), A = G.A; A.CFG.fx.fall.on = ${on}; GFX.set('hoch');
        for (let i = 0; i < 4; i++) { KILL(A, 120 + i * 30, i % 2); G.run(.1); } const m = A.get().me, e = A.mkCop(m.x + 260, m.y, true); A.get().en.push(e); BOOM(A, e.x - 20, e.y); G.run(3);
        const g = A.get(); return { corp: A.corpL().map(c => [Math.round(c.x / 8), Math.round(c.y / 8), c.row].join(':')), kills: g.kills, en: g.en.length, hp: g.me.hp, parts: A.wu().fdb.length + A.wu().fl.length, pose: A.wuPose(A.corpL()[0]) }; })()`);
      const a = await run(1), b = await run(0);
      t.eq(a.corp, b.corp, 'gleiche Leichen am gleichen Ort (auf 8 px, die KI streut mit Math.random)'); t.eq(a.kills, b.kills, 'gleiche Abschuesse'); t.eq(a.corp.length, b.corp.length, 'gleiche Zahl Leichen');
      t.ok(a.corp.length >= 4, 'es gibt Leichen: ' + a.corp.length); t.eq(b.parts, 0, 'aus: keine Eintraege, keine Teile'); t.eq(b.pose, null, 'aus: keine Pose, die Leiche wird wie bisher gezeichnet');
    },
  },
];
