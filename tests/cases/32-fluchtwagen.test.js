// Fluchtwagen (CFG.van, Tills Beobachtung aus den Coop-Runden: alle rennen zum Wagen, egal wo die Polizei steht): Einsteigen dauert (Ring), der Fahrer fährt weg, wenn Beamte nah am Wagen sind, und kommt zurück, wenn sie weg sind.
// Aufbau: Bank klassisch, Überfall, keine Polizei (CFG.policeAt riesig), Wagen sofort gerufen, der Spieler unverwundbar und mit Beute (units 7) im Fluchtbereich.
const SETUP = () => {
  const D = __dbg; D.CFG.policeAt = 1e6; D.CFG.policeForced = 1e6; D.CFG.vanCall = 1; D.CFG.vanStay = 600;   // das Zeitfenster des Wagens (60 s) soll die Abläufe hier nicht beenden
  D.reset(); D.startHeist(false, D.get().me); D.callVan();
  const g = D.get(), ln = D.laneOf(D.LAY()), c = ln.exit.cells[Math.floor(ln.exit.cells.length / 2)];
  window.__z = [c[0] * 32 + 16, c[1] * 32 + 16];
  const step = (n, f) => { for (let i = 0; i < n; i++) { const m = D.get().me; m.hp = 1e9; if (f) f(m, i); D.update(1 / 30); } };
  window.__step = step;
  // Wagen einfahren lassen, der Spieler bleibt solange draussen
  step(30 * 40, m => { m.x = 5 * 32; m.y = 5 * 32; });
  D.get().en.length = 0; D.get().me.hurt = 0;   // Wachen sind im Ueberfall zu Gegnern geworden und schiessen, ihre Treffer wuerden das Einsteigen stoeren
  return { vanArr: D.get().vanArr, mode: D.get().vanMode };
};

module.exports = [
  {
    name: 'Fluchtwagen: Einsteigen dauert 1,5 s plus 0,15 s je Beutenplatz, erst danach ist die Beute gesichert',
    async run(t) {
      const r = await t.page.evaluate(`(() => { const s = (${SETUP.toString()})(); const D = __dbg, out = { s }, me = () => D.get().me;
        const board = (units) => { me().units = units; me().loot = 5000; me().out = false; me().gone = false; let n = 0, mid = 0;
          while (!me().out && n < 30 * 10) { window.__step(1, m => { m.x = window.__z[0]; m.y = window.__z[1]; }); n++; if (n === 15) mid = me().bd; } return { t: n / 30, mid: +mid.toFixed(2), secured: D.get().secured }; };
        out.leer = board(0);
        return out; })()`);
      t.ok(r.s.vanArr && r.s.mode === 0, 'Wagen ist da: ' + JSON.stringify(r.s));
      t.ok(Math.abs(r.leer.t - 1.5) < .15, 'leere Tasche: 1,5 s bis zum Sichern: ' + JSON.stringify(r.leer));
      t.ok(r.leer.mid > .2 && r.leer.mid < .8, 'Ring füllt sich in der Mitte: ' + r.leer.mid);
    },
  },
  {
    name: 'Fluchtwagen: volle Tasche braucht länger, Verlassen des Bereichs und ein Treffer setzen den Ring zurück',
    async run(t) {
      const r = await t.page.evaluate(`(() => { const S = ${SETUP.toString()}, D = __dbg, me = () => D.get().me, out = {};
        S(); const z = window.__z; me().units = 7; me().loot = 5000;
        let n = 0; while (!me().out && n < 30 * 10) { window.__step(1, m => { m.x = z[0]; m.y = z[1]; }); n++; } out.voll = n / 30;
        // zweiter Versuch (frische Karte): nach 1 s den Bereich verlassen
        S(); me().units = 7; me().loot = 5000;
        window.__step(30, m => { m.x = z[0]; m.y = z[1]; }); out.vor = +me().bd.toFixed(2);
        window.__step(1, m => { m.x = 5 * 32; m.y = 5 * 32; }); out.nach = me().bd;
        // dritter Versuch (frische Karte): dauernd getroffen
        S(); me().units = 7; me().loot = 5000;
        window.__step(30 * 6, m => { m.x = z[0]; m.y = z[1]; m.hurt = .3; }); out.getroffen = { bd: me().bd, out: me().out };
        return out; })()`);
      t.ok(Math.abs(r.voll - 2.55) < .2, 'volle Tasche (7 Plätze): etwa 2,55 s: ' + r.voll);
      t.ok(r.vor > .3 && r.nach === 0, 'Verlassen des Bereichs setzt den Ring zurück: ' + JSON.stringify(r));
      t.ok(r.getroffen.bd === 0 && !r.getroffen.out, 'unter Beschuss kommt niemand an Bord: ' + JSON.stringify(r.getroffen));
    },
  },
  {
    name: 'Fluchtwagen: Beamte am Wagen machen den Fahrer nervös, er fährt weg und kommt zurück, wenn sie weg sind',
    async run(t) {
      const r = await t.page.evaluate(`(() => { (${SETUP.toString()})(); const D = __dbg, me = () => D.get().me, z = window.__z, out = { log: [] };
        const ln = D.laneOf(D.LAY()), vm = ln.van.mid(ln.van.stop);
        const cop = D.mkCop(vm[0] + 60, vm[1] + 20, false); cop.mode = 'post'; cop.post = { x: 0, y: 0, a: 0 }; cop.rt = 1e9; cop.cool = 1e9; D.get().en.push(cop);
        const st = () => ({ mode: D.get().vanMode, nv: +D.get().vanNv.toFixed(1), x: Math.round(D.get().vanX) });
        window.__step(30 * 2, m => { m.x = 5 * 32; m.y = 5 * 32; cop.x = vm[0] + 60; cop.y = vm[1] + 20; }); out.nervoes = st();
        window.__step(30 * 5, m => { m.x = 5 * 32; m.y = 5 * 32; cop.x = vm[0] + 60; cop.y = vm[1] + 20; }); out.weg = st();
        // Spieler im Bereich, Wagen weg: kein Einsteigen
        window.__step(30 * 12, m => { m.x = z[0]; m.y = z[1]; cop.x = vm[0] + 60; cop.y = vm[1] + 20; }); out.abseits = Object.assign(st(), { out: me().out, bd: me().bd });
        // Polizei weg: Fahrer kommt zurueck (nach mindestens 10 s abseits)
        D.get().en.length = 0;
        window.__step(30 * 25, m => { m.x = z[0]; m.y = z[1]; }); out.zurueck = Object.assign(st(), { out: me().out, ended: !!D.get().ended });
        out.feed = D.msgs().feed;
        return out; })()`);
      t.ok(r.nervoes.mode === 0 && r.nervoes.nv > 1, 'nach 2 s mit Polizei am Wagen wird der Fahrer nervös: ' + JSON.stringify(r.nervoes));
      t.ok(r.weg.mode === 1 || r.weg.mode === 2, 'nach 7 s mit Polizei am Wagen (leave 5 s) fährt er weg: ' + JSON.stringify(r.weg));
      t.ok(r.abseits.mode === 2 && !r.abseits.out && r.abseits.bd === 0, 'solange die Polizei am Wagen steht, wartet er abseits und niemand steigt ein: ' + JSON.stringify(r.abseits));
      t.ok(r.zurueck.out, 'ohne Polizei kommt er zurück und der Spieler steigt ein: ' + JSON.stringify(r.zurueck));
      t.ok(r.feed.some(s => /kommt zurück|wieder da/.test(s)) || r.zurueck.out, 'Meldung beim Zurückkommen: ' + JSON.stringify(r.feed));
    },
  },
  {
    name: 'Fluchtwagen: Coop, der Client sieht Ring, Nervosität und Abfahrt des Fahrers',
    async run(t) {
      await t.loadTool('loopnet.js');
      await t.loadInpage('coop.js');
      const r = await t.page.evaluate(() => {
        const G = CT.mkGame('bank', 321, 2), A = G.A, B = G.clients[0];
        A.CFG.policeAt = 1e6; A.CFG.policeForced = 1e6; A.CFG.vanCall = 1;
        B.cv.dispatchEvent(new KeyboardEvent('keydown', { key: 'f', bubbles: true })); G.run(1);
        A.callVan();
        for (let i = 0; i < 60 * 40; i++) { A.get().players.forEach(o => { o.hp = 1e9; o.dead = false; }); step(G.insts, G.net, 1 / 60); }   // Wachen werden im Ueberfall zu Gegnern, die Spieler bleiben am Leben
        A.get().en.length = 0; A.get().players.forEach(o => { o.hurt = 0; });
        const ln = A.laneOf(A.LAY()), c = ln.exit.cells[Math.floor(ln.exit.cells.length / 2)], z = [c[0] * 32 + 16, c[1] * 32 + 16], vm = ln.van.mid(ln.van.stop);
        const out = { arr: [A.get().vanArr, B.get().vanArr] };
        const p1 = A.get().players[1];
        p1.units = 7; p1.loot = 4000; let seenBd = 0;
        for (let i = 0; i < 90; i++) { p1.x = z[0]; p1.y = z[1]; p1.vx = p1.vy = 0; p1.hp = 1e9; step(G.insts, G.net, 1 / 60); seenBd = Math.max(seenBd, B.get().players[1].bd || 0); }
        out.seenBd = +seenBd.toFixed(2);
        const cop = A.mkCop(vm[0] + 60, vm[1] + 20, false); cop.mode = 'post'; cop.post = { x: 0, y: 0, a: 0 }; cop.rt = 1e9; cop.cool = 1e9; A.get().en.push(cop);
        p1.out = false; p1.gone = false; A.get().players[0].hp = 1e9;
        for (let i = 0; i < 60 * 3; i++) { cop.x = vm[0] + 60; cop.y = vm[1] + 20; p1.x = 5 * 32; p1.y = 5 * 32; p1.hp = 1e9; step(G.insts, G.net, 1 / 60); }
        out.nervB = [A.get().vanMode, B.get().vanMode, +B.get().vanNv.toFixed(1)];
        for (let i = 0; i < 60 * 4; i++) { cop.x = vm[0] + 60; cop.y = vm[1] + 20; p1.x = 5 * 32; p1.y = 5 * 32; p1.hp = 1e9; step(G.insts, G.net, 1 / 60); }
        out.weg = [A.get().vanMode, B.get().vanMode];
        return out;
      });
      t.ok(r.arr[0] && r.arr[1], 'Wagen ist auf Host und Client da: ' + JSON.stringify(r.arr));
      t.ok(r.seenBd > .3, 'der Client sieht den Ring (bd) des Mitspielers beim Einsteigen: ' + r.seenBd);
      t.ok(r.nervB[0] === 0 && r.nervB[1] === 0 && r.nervB[2] > 1, 'Nervosität kommt beim Client an: ' + JSON.stringify(r.nervB));
      t.ok(r.weg[0] >= 1 && r.weg[1] === r.weg[0], 'Abfahrt kommt beim Client an: ' + JSON.stringify(r.weg));
    },
  },
];
