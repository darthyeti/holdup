// Issue 91: Transporter-Panne, lautlose Flucht im Coop. Die Fluchtzone ist in Phase 1 sichtbar (Zone und Zeiger), sobald Beute eingepackt ist, ein Hinweis erscheint, und wer ohne Beute in der Zone steht, nimmt mit (escaped>0 wie im Gebaeude).
module.exports = [
  {
    name: 'Panne Coop: Zone und Zeiger in Phase 1 erst mit Beute, Hinweis einmal, Spieler mit Beute plus einer ohne laufen in die Zone: lautloser Sieg (Host und Client)',
    timeout: 120000,
    async run(t) {
      await t.loadTool('loopnet.js'); await t.loadInpage('coop.js');
      const r = await t.page.evaluate(`(() => {
        const D = __dbg; D.setScenario('truck'); D.setSeedMode('random'); D.setLage([]);
        let sd = 0; for (let s = 1; s < 800 && !sd; s++) if (D.genTruckMission(s).panne) sd = s;
        const G = CT.mkGame('truck', sd, 2, 60, 20, null, 'S'), A = G.A, B = G.clients[0], o = { sd };
        A.CFG.policeAt = 1e6; A.CFG.policeForced = 1e6;
        const spy = I => { const c = I.cv.getContext('2d'), s = { dash: 0, txt: [] }, sl = c.setLineDash.bind(c), ft = c.fillText.bind(c);
          c.setLineDash = a => { if (a && a[0] === 8 && a[1] === 6) s.dash++; return sl(a); }; c.fillText = (x, ...r) => { s.txt.push(String(x)); return ft(x, ...r); }; return s; };
        const sA = spy(A), sB = spy(B);
        const draw = () => { A.draw(); B.draw(); };
        const run = sec => { for (let i = 0; i < Math.round(sec * 60); i++) { A.get().players.forEach(p => { p.hp = 1e9; p.dead = false; }); step(G.insts, G.net, 1 / 60); } };
        const z = A.LANE().exit.cells.filter(c => !A.isSol(c[0], c[1])), p0 = A.get().players[0], p1 = A.get().players[1];
        run(1); sA.dash = sB.dash = 0; sA.txt.length = sB.txt.length = 0; draw();
        o.vorher = [sA.dash, sB.dash, sA.txt.includes('FLUCHTZONE'), sB.txt.includes('FLUCHTZONE'), A.get().phase];
        p0.loot = 500; run(1); sA.dash = sB.dash = 0; sA.txt.length = sB.txt.length = 0; draw();
        o.nachher = [sA.dash > 0, sB.dash > 0, sA.txt.includes('FLUCHTZONE'), sB.txt.includes('FLUCHTZONE'), A.get().phase];
        o.hinweis = A.msgs().feed.filter(f => /Fluchtzone/.test(f)).length;
        run(2); o.hinweis2 = A.msgs().feed.filter(f => /Fluchtzone/.test(f)).length;
        const c0 = z[0], c1 = z[z.length - 1];
        p0.x = c0[0] * 32 + 16; p0.y = c0[1] * 32 + 16; run(2);
        o.nach1 = [A.get().ended ? 1 : 0, p0.out, p1.out];
        p1.x = c1[0] * 32 + 16; p1.y = c1[1] * 32 + 16; run(2);
        const e = A.get().ended; o.ende = e ? [e.win, e.title] : null; o.phase = A.get().phase;
        run(2); const f = B.get().ended; o.client = f ? [f.win, f.title] : null;
        return o; })()`);
      t.eq(r.vorher, [0, 0, false, false, 1], 'ohne Beute keine Zone');
      t.eq(r.nachher, [true, true, true, true, 1], 'mit Beute: Zone und Zeiger auf Host und Client, noch Phase 1');
      t.eq([r.hinweis, r.hinweis2], [1, 1], 'Hinweis genau einmal');
      t.eq(r.nach1, [0, true, false], 'der Spieler mit Beute ist raus, das Spiel laeuft (der andere fehlt noch)');
      t.eq(r.ende, [true, 'Lautlos entkommen'], 'der Spieler ohne Beute nimmt in der Zone mit: lautloser Sieg');
      t.eq(r.client, [true, 'Lautlos entkommen'], 'auch der Client sieht den Sieg');
    },
  },
];
