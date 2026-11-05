// Transporter-Polizei im Coop (Ticket 100): Die Anker und Deckungsplaetze rechnet nur der Host (Zufall nur dort), der Client sieht die Beamten ueber den Schnappschuss. Geprueft wird mit der Test-Leitung (60 ms Latenz, 20 ms Streuung):
// gleiche Beamte (Ids) und gleiche Orte bei Host und Client, und beide Seiten des Panzerwagens besetzt. Das Netzformat bleibt, VER ist unveraendert.
module.exports = [
  {
    name: 'Coop: die Beamten haben auf Host und Client dieselben Ids und (bis auf die Laufzeit) dieselben Orte, die Beamten verteilen sich auf beide Seiten des Wagens, kein Seitenfehler',
    timeout: 120000,
    async run(t) {
      await t.loadTool('loopnet.js'); await t.loadInpage('coop.js');
      const r = await t.page.evaluate(`(() => {
        const D = __dbg; D.setScenario('truck'); D.setSeedMode('random'); D.setLage([]); let sd = 0; for (let s = 3000; s < 3400 && !sd; s++) { const m = D.genTruckMission(s); if (!m.panne && !m.vorhut && m.crew >= 3) sd = s; }
        const G = CT.mkGame('truck', sd, 2, 60, 20, null, 'S'), A = G.A, C = G.clients[0], o = { sd };
        for (const b of A.bars().filter(x => x.rd && x.g === 0)) { b.lv = 1; b.hp = 100; } A.CFG.policeAt = 26; A.CFG.policeForced = 20;
        const run = sec => { for (let i = 0; i < Math.round(sec * 60); i++) { A.get().players.forEach(p => { p.hp = 1e9; p.dead = false; }); step(G.insts, G.net, 1 / 60); } };
        const cops = d => d.get().en.filter(e => !e.crew && e.hp > 0 && e.kind === 'cop');
        let n = 0; for (let i = 0; i < 200 && A.sirCars().length === 0; i++) run(1); run(1); o.sirH = A.sirCars().length; o.sirC = C.sirCars().length;
        for (let i = 0; i < 200 && A.get().en.filter(e => e.pv && e.hp > 0).length < 8; i++) run(1);
        run(3); const H = cops(A), K = cops(C), km = new Map(K.map(e => [e.id, e])); o.nh = H.length; o.nk = K.length; o.pv = A.get().en.filter(e => e.pv && e.hp > 0).length;
        const dist = H.filter(e => km.has(e.id)).map(e => Math.hypot(e.x - km.get(e.id).x, e.y - km.get(e.id).y)); o.common = dist.length; o.max = Math.round(Math.max(...dist)); o.mean = Math.round(dist.reduce((a, b) => a + b, 0) / dist.length);
        for (let i = 0; i < 60 && A.sirCars().length > 0; i++) run(1); run(2); o.sirH2 = A.sirCars().length; o.sirC2 = C.sirCars().length;
        const tk = A.tk(); o.W = H.filter(e => e.x < tk.x).length; o.E = H.filter(e => e.x >= tk.x).length; o.errs = 0; return o; })()`);
      t.ok(r.pv >= 8, 'der Host hat mindestens 8 Beamte mit Anker: ' + r.pv); t.ok(r.common >= r.nh - 1 && r.common >= 6, 'der Client kennt dieselben Beamten (Ids): ' + r.common + ' von ' + r.nh + ' (Client ' + r.nk + ')');
      t.ok(r.max <= 140 && r.mean <= 60, 'Orte stimmen bis auf die Laufzeit (Mittel, Hoechstwert in Pixeln): ' + r.mean + ' / ' + r.max); t.ok(r.W >= 1 && r.E >= 1, 'beide Seiten des Wagens besetzt: ' + r.W + ' West, ' + r.E + ' Ost'); t.ok(r.sirH > 0 && r.sirC > 0, 'Sirene: Host und Client hoeren sie, solange Wagen besetzt sind: ' + r.sirH + ' / ' + r.sirC); t.eq([r.sirH2, r.sirC2], [0, 0], 'Sirene schweigt auf Host und Client, wenn alle ausgestiegen sind'); t.eq(t.page.errors, [], 'keine Seitenfehler');
    },
  },
];
