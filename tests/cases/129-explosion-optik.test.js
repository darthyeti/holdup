// Wuchtigere Explosionen (Paket Transporter, Schleichen und Optik, T2, Tills Wunsch vom 27. Oktober 2026): Autos und Zapfsaeulen sollen optisch mehr hermachen, der Schaden bleibt.
// Das Ereignis bx traegt jetzt den Radius und die Art (0 allgemein, 1 Auto, 2 Zapfsaeule): Feuerball (Teilchen f), Druckwelle (w), Truemmer (c), Rauch (k), ein groesserer Lichtschein (g),
// eine Brandstelle (brn: Rauch und Flammen, Auto laenger als Zapfsaeule), Kamerawackeln je nach Abstand (shk) und eine Obergrenze fuer die Teilchen (CFG.fx.boom.ptMax).
async function setup(t) {
  await t.loadTool('loopnet.js');
  await t.loadInpage('coop.js');
}
const COUNT = `(d) => { const c = {}; for (const k of d.ptL()) c[k] = (c[k] || 0) + 1; return c; }`;
// ein freier Platz 400 Pixel vom Spieler (ausser Reichweite des Schadens)
const AT = `(d) => { const m = d.get().me; return [m.x + 400, m.y]; }`;

module.exports = [
  {
    name: 'Explosion: ein Auto erzeugt Feuerball, Druckwelle, Truemmer und Rauch (Zahl nach Radius), eine Zapfsaeule dasselbe kleiner mit kuerzerer Brandstelle, der Schaden bleibt unveraendert',
    async run(t) {
      await setup(t);
      const r = await t.page.evaluate(`(() => { const C = ${COUNT}, AT = ${AT}, G = CT.mkGame('bank', 5017, 1), A = G.A, F = A.CFG.fx.boom, o = {}, hp0 = A.get().me.hp;
        A.ptClear(); let [x, y] = AT(A); A.blastAt(x, y, A.CFG.pol.car, 0, 1); o.auto = C(A); o.autoBrn = A.brn().map(b => b.t);
        A.ptClear(); A.blastAt(x, y, A.CFG.gas.pump, 0, 2); o.pumpe = C(A); o.pumpeBrn = A.brn().map(b => b.t);
        A.ptClear(); A.blastAt(x, y, { dmg: 10, pdmg: 10, r: 60, scorch: 20 }, 0); o.klein = C(A); o.kleinBrn = A.brn().length;
        o.F = F; o.rAuto = A.CFG.pol.car.r; o.rPumpe = A.CFG.gas.pump.r; o.hp = [hp0, A.get().me.hp];
        return o; })()`);
      const sc = r.rAuto / 110, sp = r.rPumpe / 110, f = r.F;
      t.eq([r.auto.f, r.auto.w, r.auto.c, r.auto.k], [Math.round(f.fire * sc), 1, Math.round(f.deb * sc), Math.round(f.smoke * sc)], 'Auto: Feuerball, Druckwelle, Truemmer, Rauch nach Radius');
      t.ok(r.auto.g >= 1 && r.auto.d >= 20 && r.auto.s >= 20, 'dazu Lichtschein, Staub und Funken wie vorher: ' + JSON.stringify(r.auto));
      t.eq(r.autoBrn, [f.burn[1]], 'ein brennendes Wrack hat eine Brandstelle von ' + f.burn[1] + ' s');
      t.eq([r.pumpe.f, r.pumpe.w, r.pumpe.c, r.pumpe.k], [Math.round(f.fire * sp), 1, Math.round(f.deb * sp), Math.round(f.smoke * sp)], 'Zapfsaeule: dieselben Teilchen nach ihrem Radius'); t.eq(r.pumpeBrn, [f.burn[2]], 'die Brandstelle der Zapfsaeule ist kuerzer');
      t.ok(f.burn[2] < f.burn[1], 'Zapfsaeule brennt kuerzer als ein Auto');
      t.ok(r.klein.f < r.auto.f && r.klein.c < r.auto.c, 'ein kleinerer Radius gibt weniger Teilchen: ' + JSON.stringify([r.klein.f, r.auto.f])); t.eq(r.kleinBrn, 0, 'ohne Art keine Brandstelle');
      t.eq(r.hp[0], r.hp[1], 'der Spieler steht ausser Reichweite und nimmt keinen Schaden (der Schaden selbst ist nicht Teil der Aenderung)');
    },
  },
  {
    name: 'Explosion: die Kamera wackelt nahe an der Explosion und klingt ab, weit weg nicht, das Bild verschiebt die Kamera danach nicht, die Teilchenzahl bleibt unter der Obergrenze',
    async run(t) {
      await setup(t);
      const r = await t.page.evaluate(`(() => { const G = CT.mkGame('bank', 5017, 1), A = G.A, F = A.CFG.fx.boom, o = {}, m = A.get().me;
        A.ptClear(); A.blastAt(m.x + 2000, m.y, A.CFG.pol.car, 0, 1); o.weit = A.shk();
        A.ptClear(); A.blastAt(m.x + 220, m.y, { dmg: 0, pdmg: 0, r: 110, scorch: 20 }, 0, 1); o.nah = A.shk();
        const c0 = A.cam().slice(); A.draw(); const c1 = A.cam(); o.cam = [c0[0] === c1[0], c0[1] === c1[1]];
        for (let i = 0; i < 30 * 2; i++) A.update(1 / 30); o.nachher = A.shk();
        A.ptClear(); A.ptFill(F.ptMax - 5); A.blastAt(m.x + 400, m.y, A.CFG.pol.car, 0, 1); o.voll = [A.ptN(), F.ptMax];
        return o; })()`);
      t.eq(r.weit.a, 0, 'weit weg wackelt nichts'); t.ok(r.nah.a > 0.4 && r.nah.t > 0, 'nah dran wackelt es: ' + JSON.stringify(r.nah)); t.eq(r.cam, [true, true], 'das Zeichnen stellt die Kamera wieder her');
      t.eq(r.nachher.t <= 0, true, 'das Wackeln klingt ab'); t.ok(r.voll[0] <= r.voll[1] + 3, 'Obergrenze der Teilchen (hoechstens drei Kernteilchen darueber): ' + r.voll.join(' / '));
    },
  },
  {
    name: 'Explosion: die Brandstelle raucht und flammt weiter und ist nach ihrer Zeit zu Ende, im Coop sieht der Client dieselben Teilchen, Tests der Optik zeigen deutlich mehr helle Flaeche als ohne Feuerball',
    async run(t) {
      await setup(t);
      const r = await t.page.evaluate(`(() => { const C = ${COUNT}, AT = ${AT}, G = CT.mkGame('bank', 5017, 1), A = G.A, F = A.CFG.fx.boom, o = {};
        A.ptClear(); const [x, y] = AT(A); A.blastAt(x, y, A.CFG.pol.car, 0, 1); for (let i = 0; i < 30 * 5; i++) A.update(1 / 30); const c5 = C(A); o.rauch = [c5.k || 0, A.brn().length, c5.f || 0];
        for (let i = 0; i < 30 * (F.burn[1] + 1); i++) A.update(1 / 30); o.ende = [A.brn().length, C(A).k || 0];
        const H = CT.mkGame('bank', 5017, 2), B = H.clients[0]; H.A.ptClear(); B.ptClear(); const [hx, hy] = AT(H.A); H.A.blastAt(hx, hy, H.A.CFG.pol.car, 0, 1); H.run(.2); o.client = [C(B), B.brn().length, C(H.A).w];
        return o; })()`);
      t.ok(r.rauch[0] > 0 && r.rauch[1] === 1 && r.rauch[2] > 0, 'die Brandstelle gibt nach fuenf Sekunden (der Rauch des Knalls ist weg) noch Rauch und Flammen ab: ' + JSON.stringify(r.rauch)); t.eq(r.ende[0], 0, 'nach ihrer Zeit ist die Brandstelle zu Ende');
      t.ok(r.client[0].f > 0 && r.client[0].w === 1 && r.client[0].c > 0 && r.client[0].k > 0 && r.client[1] === 1, 'auch der Client sieht Feuerball, Druckwelle, Truemmer, Rauch und Brandstelle: ' + JSON.stringify(r.client));
    },
  },
  {
    name: 'Explosion: im Bild ist der Feuerball deutlich sichtbar (viele helle orange Pixel kurz nach dem Knall, vorher kaum welche)',
    async run(t) {
      await setup(t);
      const r = await t.page.evaluate(`(() => { const G = CT.mkGame('bank', 5017, 1), A = G.A, o = {}, m = A.get().me, cx = A.cv.getContext('2d');
        const orange = () => { const d = cx.getImageData(0, 0, A.cv.width, A.cv.height).data; let n = 0; for (let i = 0; i < d.length; i += 4) if (d[i] > 215 && d[i + 1] > 100 && d[i + 1] < 215 && d[i + 2] < 120) n++; return n; };
        A.ptClear(); A.draw(); A.draw(); o.vorher = orange();
        let bx = m.x + 150, by = m.y; for (const an of [0, .8, -.8, 1.6, -1.6, 2.4, -2.4, 3.14]) { const x = m.x + Math.cos(an) * 150, y = m.y + Math.sin(an) * 150; if (A.los(m.x, m.y, x, y)) { bx = x; by = y; break; } } o.pos = [bx - m.x, by - m.y];
        A.blastAt(bx, by, { dmg: 0, pdmg: 0, r: 110, scorch: 20 }, 0, 1); for (let i = 0; i < 5; i++) A.update(1 / 30); A.draw(); A.draw(); o.nachher = orange();
        return o; })()`);
      t.ok(r.nachher - r.vorher > 3500, 'helle orange Flaeche vorher ' + r.vorher + ', kurz nach dem Knall ' + r.nachher);
    },
  },
  {
    name: 'Explosion: die echten Wege (ein Auto geht hoch, eine Zapfsaeule geht hoch) tragen Radius und Art, das Auto bekommt die lange, die Zapfsaeule die kurze Brandstelle',
    async run(t) {
      await setup(t);
      const r = await t.page.evaluate(`(() => { const o = {}, C = ${COUNT};
        { const G = CT.mkGame('bank', 5017, 1), A = G.A, m = A.get().me; A.ptClear(); const c = A.get().cars.find(q => q.civ && !q.dead); o.car = !!c; if (c) { m.hp = 1e9; A.carBlow(c, 0); o.autoBrn = A.brn().map(b => b.t); o.autoF = C(A).f; } }
        { const G = CT.mkGame('gas', 21, 1), A = G.A, m = A.get().me, q = A.LAY().pumps[0]; A.ptClear(); o.pump = !!q; if (q) { m.hp = 1e9; A.pumpBlow(q, 0); o.pumpBrn = A.brn().map(b => b.t); o.pumpF = C(A).f; o.F = A.CFG.fx.boom; o.rP = A.CFG.gas.pump.r; } }
        return o; })()`);
      t.ok(r.car && r.pump, 'Aufbau: ein ziviles Auto und eine Zapfsaeule sind da');
      t.eq(r.autoBrn, [r.F.burn[1]], 'ein explodierendes Auto brennt lange'); t.eq(r.pumpBrn, [r.F.burn[2]], 'eine Zapfsaeule brennt kurz');
      t.eq(r.pumpF, Math.round(r.F.fire * r.rP / 110), 'der Radius der Zapfsaeule bestimmt den Feuerball'); t.ok(r.autoF > 0, 'das Auto hat einen Feuerball');
    },
  },
];
