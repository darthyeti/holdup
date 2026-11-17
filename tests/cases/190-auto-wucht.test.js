// Ticket #277 (2D-Wucht A, nur Optik): Autoexplosionen mit Gewicht. Das Ereignis bx der Art 1 laesst das Auto kurz abheben (Eintrag t:'h' in dbr, rund 0,4 s, drawCar hebt und vergroessert das Bild, der Schatten bleibt),
// schleudert zwei bis vier Teile (t:'p', je Grafikstufe begrenzt) mit Flugbogen, Ausrutschen und Abprallen an Waenden, gelandete Teile werden als Spur in dcv gestempelt (TRC p), das Wrack brennt laenger
// (CFG.fx.boom.burn[1]) und zieht eine abdriftende Rauchsaeule (Teilchen k mit dr). Teile blockieren nichts. Im Coop zeichnet der Client dieselben Teile (Ort aus trR).
async function setup(t) {
  await t.loadTool('loopnet.js');
  await t.loadInpage('coop.js');
}
// ein ziviles Auto (Form wie mkDecorCar) am Spieler, ohne Schaden zu machen: die Explosion kommt als bx der Art 1 ohne Schaden
const CAR = `(A, dx, dy) => { const m = A.get().me, c = { id: 9000 + A.get().cars.length, civ: 1, cv: 2, side: null, slot: -1, row: 0, a: 0, tilt: 0, tg: 0, st: 'park', ex: 0, sk: 0, crew: [], lead: 0, hp: 140, dead: false, x: m.x + dx, y: m.y + dy };
  A.get().cars.push(c); return c; }`;
const BOOM = `(A, c) => { c.dead = true; c.hp = 0; A.blastAt(c.x, c.y, { dmg: 0, pdmg: 0, r: 110, scorch: 20 }, 0, 1); }`;
const KINDS = `(d) => { const o = {}; for (const q of d.dbrL()) { const k = q.t === 'p' ? q.kd : q.t; o[k] = (o[k] || 0) + 1; } return o; }`;

module.exports = [
  {
    name: 'Autoexplosion: das Auto hebt ab (Eintrag h, 0,4 s), Teile fliegen mit Bogen, Tuer, Motorhaube und Reifen je Stufe (zwei, drei, vier), nach dem Aufsetzen ist der Hueper weg',
    async run(t) {
      await setup(t);
      const r = await t.page.evaluate(`(() => { const CAR = ${CAR}, BOOM = ${BOOM}, K = ${KINDS}, o = {}, G = CT.mkGame('bank', 5017, 1), A = G.A;
        for (const lv of ['niedrig', 'mittel', 'hoch']) { GFX.set(lv); A.ptClear(); const c = CAR(A, 0, 0); BOOM(A, c); o[lv] = K(A); }
        GFX.set('mittel'); A.ptClear(); const c = CAR(A, 0, 0); BOOM(A, c); const d0 = A.dbrL(); o.h0 = d0.find(q => q.t === 'h'); o.z = Math.max(...d0.filter(q => q.t === 'p').map(q => q.z));
        o.vz = d0.filter(q => q.t === 'p').map(q => q.vz > 0);
        // Flug: die Hoehe steigt und faellt wieder auf 0
        let zmax = 0; for (let i = 0; i < 8; i++) { A.update(1 / 30); for (const q of A.dbrL()) if (q.t === 'p') zmax = Math.max(zmax, q.z); } o.zmax = zmax; o.hMitte = A.dbrL().some(q => q.t === 'h');
        for (let i = 0; i < 6; i++) A.update(1 / 30); o.hEnde = A.dbrL().some(q => q.t === 'h');
        // Zeichnen mit abhebendem Auto bleibt fehlerfrei
        A.ptClear(); const c2 = CAR(A, 0, 0); BOOM(A, c2); A.update(1 / 30); A.draw();
        return o; })()`);
      t.eq([r.niedrig.p || 0, r.niedrig.h], [0, 1], 'Stufe niedrig: ein Huepfer'); // Teile als Einzelarten gezaehlt, siehe unten
      t.eq(Object.values(r.niedrig).reduce((a, b) => a + b, 0) - r.niedrig.h, 2, 'niedrig: zwei Teile');
      t.eq(Object.values(r.mittel).reduce((a, b) => a + b, 0) - r.mittel.h, 3, 'mittel: drei Teile');
      t.eq(Object.values(r.hoch).reduce((a, b) => a + b, 0) - r.hoch.h, 4, 'hoch: vier Teile');
      t.ok(r.mittel.door >= 1 && r.mittel.hood === 1 && r.mittel.tire === 1, 'mittel: Tuer, Motorhaube, Reifen: ' + JSON.stringify(r.mittel));
      t.eq(r.h0.m, 0.4, 'der Hueper dauert 0,4 s'); t.ok(r.zmax > 20, 'die Teile fliegen mit Bogen (Hoehe z): ' + r.zmax);
      t.eq([r.hMitte, r.hEnde], [true, false], 'der Hueper ist nach 0,4 s zu Ende');
    },
  },
  {
    name: 'Autoexplosion: Teile landen, rutschen aus und bleiben als Spur in dcv liegen (Obergrenze TRC p je Stufe), gehen nicht durch Waende und blockieren nichts',
    async run(t) {
      await setup(t);
      const r = await t.page.evaluate(`(() => { const CAR = ${CAR}, BOOM = ${BOOM}, o = {}, G = CT.mkGame('bank', 5017, 1), A = G.A, w = A.world(), T = 32;
        const solid = (x, y) => { const tx = Math.floor(x / T), ty = Math.floor(y / T); return w.isSol(tx, ty) && w.cell(tx, ty) !== 'v'; };
        GFX.set('mittel'); A.ptClear(); const h0 = A.tr().p || 0, c = CAR(A, 0, 0), hp0 = A.get().me.hp; BOOM(A, c);
        let inWall = 0, steps = 0; for (let i = 0; i < 30 * 8; i++) { A.update(1 / 30); steps++; for (const q of A.dbrL()) if (q.t === 'p' && solid(q.x, q.y)) inWall++; }
        o.inWall = inWall; o.rest = A.dbrL().length; o.stamps = (A.tr().p || 0) - h0; o.hp = [hp0, A.get().me.hp];
        // Obergrenze der Spuren je Stufe (mittel 30): viele Explosionen
        A.ptClear(); for (let i = 0; i < 40; i++) { const c3 = CAR(A, 0, 0); BOOM(A, c3); for (let k = 0; k < 30 * 7; k++) A.update(1 / 30); A.ptClear(); }
        o.cap = A.tr().p;
        return o; })()`);
      t.eq(r.inWall, 0, 'kein Teil ist je in einer Wandkachel');
      t.eq(r.rest, 0, 'nach acht Sekunden ist kein Teil mehr in der Luft oder am Rutschen'); t.ok(r.stamps >= 1 && r.stamps <= 3, 'die Teile liegen als Spur in dcv (Zaehler p): ' + r.stamps);
      t.eq(r.hp[0], r.hp[1], 'die Teile machen keinen Schaden');
      t.ok(r.cap <= 30, 'Spuren der Teile bleiben unter der Obergrenze der Stufe mittel (30): ' + r.cap);
    },
  },
  {
    name: 'Autoexplosion: das Wrack brennt laenger (Flammen, dann Glut) und zieht eine abdriftende Rauchsaeule, Stufe niedrig ohne driftende Saeule, Teilchen bleiben unter ptMax',
    async run(t) {
      await setup(t);
      const r = await t.page.evaluate(`(() => { const CAR = ${CAR}, BOOM = ${BOOM}, o = {}, G = CT.mkGame('bank', 5017, 1), A = G.A, F = A.CFG.fx;
        const T0 = {}; for (const lv of ['niedrig', 'mittel', 'hoch']) { GFX.set(lv); A.ptClear(); const c = CAR(A, 0, 0); BOOM(A, c); T0[lv] = A.brn().map(b => b.t); }
        o.T0 = T0; o.F = F.boom.burn[1];
        GFX.set('mittel'); A.ptClear(); const c = CAR(A, 0, 0); BOOM(A, c);
        let nmax = 0; for (let i = 0; i < 30 * 12; i++) { A.update(1 / 30); nmax = Math.max(nmax, A.ptN()); }
        o.nmax = nmax; o.brn12 = A.brn().length;
        // driftende Saeule: Rauch mit dr bewegt sich nach 3 s weiter (kein Abbremsen auf 0)
        A.ptClear(); const c2 = CAR(A, 0, 0); BOOM(A, c2); for (let i = 0; i < 30 * 4; i++) A.update(1 / 30);
        o.dr = A.ptDr();
        GFX.set('niedrig'); A.ptClear(); const c3 = CAR(A, 0, 0); BOOM(A, c3); for (let i = 0; i < 30 * 4; i++) A.update(1 / 30); o.drLow = A.ptDr(); GFX.set('mittel');
        for (let i = 0; i < 30 * 20; i++) A.update(1 / 30); o.ende = A.brn().length;
        return o; })()`);
      t.eq([r.T0.niedrig, r.T0.mittel, r.T0.hoch], [[r.F], [r.F], [r.F]], 'Brandstelle ' + r.F + ' s auf allen Stufen');
      t.ok(r.F >= 20, 'das Wrack brennt rund 20 s (vorher 14)'); t.ok(r.nmax <= 903, 'Teilchen unter ptMax: ' + r.nmax); t.eq(r.ende, 0, 'nach der Zeit ist die Brandstelle zu Ende');
      t.ok(r.dr > 0, 'es gibt Rauch der Saeule (dr): ' + r.dr); t.eq(r.drLow, 0, 'Stufe niedrig: kein langer, driftender Rauch');
    },
  },
  {
    name: 'Autoexplosion im Coop: der Client zeichnet dieselben Teile nach dem Ereignis (Art, Zahl, Ort), ohne dass das Netzformat sich aendert',
    async run(t) {
      await setup(t);
      const r = await t.page.evaluate(`(() => { const CAR = ${CAR}, K = ${KINDS}, o = {}, G = CT.mkGame('bank', 5017, 2), A = G.A, B = G.clients[0];
        GFX.set('hoch'); A.ptClear(); B.ptClear();
        const m = A.get().me, c = { id: 9100, civ: 1, cv: 2, side: null, slot: -1, row: 0, a: 0, tilt: 0, tg: 0, st: 'park', ex: 0, sk: 0, crew: [], lead: 0, hp: 140, dead: false, x: m.x, y: m.y };
        A.get().cars.push(c); G.run(.6); c.dead = true; c.hp = 0; A.blastAt(c.x, c.y, { dmg: 0, pdmg: 0, r: 110, scorch: 20 }, 0, 1); G.run(.2);
        o.host = K(A); o.client = K(B);
        o.host0 = A.dbrL().filter(q => q.t === 'p').map(q => [q.kd, Math.round(q.vx), Math.round(q.vy)].join(':')).sort().join();
        o.cli0 = B.dbrL().filter(q => q.t === 'p').map(q => [q.kd, Math.round(q.vx), Math.round(q.vy)].join(':')).sort().join();
        return o; })()`);
      t.eq(r.client.h, 1, 'der Client laesst das Auto auch abheben');
      t.eq(r.cli0, r.host0, 'dieselben Teile mit denselben Anfangsgeschwindigkeiten (Zufall aus dem Ort)');
      t.eq(r.client.door, r.host.door, 'Tueren gleich'); t.eq(r.client.hood, r.host.hood, 'Motorhaube gleich'); t.eq(r.client.tire, r.host.tire, 'Reifen gleich');
      t.ok(r.client.door >= 1 && r.client.tire === 1, 'der Client hat Teile: ' + JSON.stringify(r.client));
    },
  },
];
