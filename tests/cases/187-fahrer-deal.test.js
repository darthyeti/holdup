// Fahrer-Deal (Ticket 133, CFG.deal): Nach dem zweiten Wegfahren bietet der Fahrer an, gegen die Hälfte der Beute auszusteigen und mit der Schrotflinte zu helfen.
// Aufbau wie 32-fluchtwagen: Bank klassisch, Überfall, keine Polizei, Wagen sofort gerufen, der Spieler unverwundbar.
const SETUP = () => {
  const D = __dbg; D.CFG.policeAt = 1e6; D.CFG.policeForced = 1e6; D.CFG.vanCall = 1; D.CFG.vanStay = 6000;
  D.reset(); D.startHeist(false, D.get().me); D.callVan();
  const step = (n, f) => { for (let i = 0; i < n; i++) { const m = D.get().me; m.hp = 1e9; if (f) f(m, i); D.update(1 / 30); } };
  const ln = D.laneOf(D.LAY()), vm = ln.van.mid(ln.van.stop);
  const far = m => { m.x = 5 * 32; m.y = 5 * 32; };
  step(30 * 40, far);
  D.get().en.length = 0; D.get().me.hurt = 0;
  // ein ruhiger Beamter am Wagen macht den Fahrer nervös: weg, zurück (cycle)
  const mkcop = (x, y) => { const c = D.mkCop(x, y, false); c.mode = 'post'; c.post = { x: 0, y: 0, a: 0 }; c.rt = 1e9; c.cool = 1e9; D.get().en.push(c); return c; };
  const cycle = () => {
    const c = mkcop(vm[0] + 60, vm[1] + 20); let n = 0;
    while (D.get().vanMode !== 1 && n++ < 30 * 20) step(1, m => { far(m); c.x = vm[0] + 60; c.y = vm[1] + 20; });
    D.get().en.length = 0; n = 0;
    while (!(D.get().vanMode === 0 && Math.abs(D.get().vanX - ln.van.stop) <= 2) && n++ < 30 * 60) step(1, far);
  };
  window.__step = step; window.__cycle = cycle; window.__mkcop = mkcop; window.__far = far;
  // ein Platz neben dem Wagen, in Reichweite des Angebots und nicht im Einsteigebereich
  let spot = null;
  for (let r = 40; r <= 85 && !spot; r += 15) for (let k = 0; k < 16 && !spot; k++) {
    const x = vm[0] + Math.cos(k * .3927) * r, y = vm[1] + Math.sin(k * .3927) * r;
    if (!D.isSol(Math.floor(x / 32), Math.floor(y / 32)) && !ln.exit.has(x, y)) spot = [x, y];
  }
  window.__spot = spot; window.__vm = vm;
  const z = ln.exit.cells[Math.floor(ln.exit.cells.length / 2)]; window.__z = [z[0] * 32 + 16, z[1] * 32 + 16];
};
const OFFER = `(() => { const D = __dbg, st = () => D.get().dl;
  window.__cycle(); const a = [st().n, st().st]; window.__cycle(); const b = [st().n, st().st];
  return { a, b }; })()`;
const ACCEPT = `(() => { const D = __dbg, me = () => D.get().me, sp = window.__spot;
  const o = {}; const it = D.get().its.find(i => i.t === 'deal'); o.has = !!it; o.ok0 = it.ok(me());
  D.keys.e = true; window.__step(30 * 3, m => { m.x = sp[0]; m.y = sp[1]; }); D.keys.e = false; return o; })()`;

module.exports = [
  {
    name: 'Fahrer-Deal: Angebot erst nach dem zweiten Wegfahren, Annehmen mit E am Wagen, der Fahrer steigt aus',
    timeout: 120000,
    async run(t) {
      const r = await t.page.evaluate(`(() => { (${SETUP.toString()})(); const D = __dbg, o = { f: ${OFFER} };
        Object.assign(o, ${ACCEPT}); const d = D.get().dl; o.st = d.st; o.dv = !!d.dv; o.nv = D.get().vanNv; o.mode = D.get().vanMode; return o; })()`);
      t.eq(r.f.a, [1, 0], 'nach dem ersten Wegfahren noch kein Angebot');
      t.eq(r.f.b, [2, 1], 'nach dem zweiten Wegfahren steht das Angebot');
      t.ok(r.has && r.ok0, 'E-Objekt vorhanden und annehmbar: ' + JSON.stringify(r));
      t.eq([r.st, r.dv, r.mode], [2, true, 0], 'angenommen: Fahrer ist ausgestiegen, Wagen steht');
    },
  },
  {
    name: 'Fahrer-Deal: ohne Angebot (nur ein Wegfahren) lässt sich nichts annehmen',
    timeout: 120000,
    async run(t) {
      const r = await t.page.evaluate(`(() => { (${SETUP.toString()})(); const D = __dbg; window.__cycle(); const it = D.get().its.find(i => i.t === 'deal');
        const sp = window.__spot; D.keys.e = true; window.__step(30 * 3, m => { m.x = sp[0]; m.y = sp[1]; }); D.keys.e = false;
        return { ok: it.ok(D.get().me), st: D.get().dl.st, dv: !!D.get().dl.dv }; })()`);
      t.eq(r, { ok: false, st: 0, dv: false }, 'kein Angebot, kein Fahrer');
    },
  },
  {
    name: 'Fahrer-Deal: der Fahrer schießt auf Beamte in Reichweite (Schrot) und steht dabei neben dem Wagen',
    timeout: 120000,
    async run(t) {
      const r = await t.page.evaluate(`(() => { (${SETUP.toString()})(); const D = __dbg, o = {}; ${OFFER}; ${ACCEPT};
        const ln = D.laneOf(D.LAY()), d = D.get().dl, sd = d.sd; window.__step(30, m => { m.x = window.__spot[0]; m.y = window.__spot[1]; });
        const q = ln.pt(ln.van.stop + 128 + 150, ln.van.pos + sd * 46), c = window.__mkcop(q[0], q[1]); c.hp = c.mhp = 100;
        window.__step(30 * 4, m => { m.x = window.__spot[0]; m.y = window.__spot[1]; c.x = q[0]; c.y = q[1]; });
        o.hp = c.hp; o.dist = Math.round(Math.hypot(d.dv.x - q[0], d.dv.y - q[1])); const cross = ln.axis === 'x' ? d.dv.y : d.dv.x; o.quer = Math.round(Math.abs(cross - ln.van.pos)); return o; })()`);
      t.ok(r.hp < 100, 'der Beamte hat Schrot abbekommen: ' + JSON.stringify(r));
      t.ok(r.quer >= 40, 'der Fahrer steht neben dem Wagen: ' + JSON.stringify(r));
    },
  },
  {
    name: 'Fahrer-Deal: Einsteigen geht trotz Beamtem am Wagen, der Fahrer wird nicht nervös',
    timeout: 120000,
    async run(t) {
      const r = await t.page.evaluate(`(() => { (${SETUP.toString()})(); const D = __dbg, o = {}; ${OFFER}; ${ACCEPT};
        const vm = window.__vm, c = window.__mkcop(vm[0] + 60, vm[1] + 20); c.hp = c.mhp = 1e9;
        let nvMax = 0; window.__step(30 * 7, m => { m.x = window.__spot[0]; m.y = window.__spot[1]; c.x = vm[0] + 60; c.y = vm[1] + 20; nvMax = Math.max(nvMax, D.get().vanNv); });
        o.nv = nvMax; o.mode = D.get().vanMode;
        const me = D.get().me; me.loot = 5000; me.units = 1; window.__step(30 * 4, m => { m.x = window.__z[0]; m.y = window.__z[1]; c.x = vm[0] + 60; c.y = vm[1] + 20; });
        o.out = me.out; o.secured = D.get().secured; return o; })()`);
      t.eq([r.nv, r.mode], [0, 0], 'Beamter am Wagen, Fahrer bleibt: ' + JSON.stringify(r));
      t.ok(r.out && r.secured === 5000, 'Einsteigen trotz Polizei klappt: ' + JSON.stringify(r));
    },
  },
  {
    name: 'Fahrer-Deal: höchstens 40 s, dann steigt er wieder ein (wie bisher)',
    timeout: 120000,
    async run(t) {
      const r = await t.page.evaluate(`(() => { (${SETUP.toString()})(); const D = __dbg, o = {}; ${OFFER}; ${ACCEPT};
        const sp = window.__spot; window.__step(30 * 35, m => { m.x = sp[0]; m.y = sp[1]; }); o.vor = [D.get().dl.st, !!D.get().dl.dv];
        window.__step(30 * 8, m => { m.x = sp[0]; m.y = sp[1]; }); o.nach = [D.get().dl.st, !!D.get().dl.dv, D.get().vanMode]; return o; })()`);
      t.eq(r.vor, [2, true], 'nach 38 s noch im Einsatz');
      t.eq(r.nach, [4, false, 0], 'nach 41 s wieder im Wagen, Wagen steht');
    },
  },
  {
    name: 'Fahrer-Deal: fällt der Fahrer, fährt er nach 8 s ab; Preis 50 % als eigene Zeile der Ergebnisliste, ohne Deal keine Zeile',
    timeout: 160000,
    async run(t) {
      const r = await t.page.evaluate(`(() => { (${SETUP.toString()})(); const D = __dbg, o = {}; ${OFFER}; ${ACCEPT};
        const sp = window.__spot, d = D.get().dl; d.dv.hp = 1; D.get().bl.push({ id: 99999, x: d.dv.x, y: d.dv.y, vx: 0, vy: 0, l: 1, o: 0, dmg: 50 });
        window.__step(1, m => { m.x = sp[0]; m.y = sp[1]; }); o.fall = [d.st, !!d.dv];
        window.__step(30 * 6, m => { m.x = sp[0]; m.y = sp[1]; }); o.vor = [d.st, D.get().vanMode];
        window.__step(30 * 3, m => { m.x = sp[0]; m.y = sp[1]; }); o.nach = [d.st, D.get().vanMode, !!d.dv];
        return o; })()`);
      t.eq(r.fall, [3, true], 'gefallen');
      t.eq(r.vor, [3, 0], 'nach 6 s steht der Wagen noch');
      t.eq(r.nach, [4, 1, false], 'nach 9 s ist er abgefahren');
      const FIN = `me.loot = 10000; me.units = 1; window.__step(30 * 5, m => { m.x = window.__z[0]; m.y = window.__z[1]; }); const e = D.get().ended; return e ? e.lines : null;`;
      const r2 = await t.page.evaluate(`(() => { (${SETUP.toString()})(); const D = __dbg; ${OFFER}; ${ACCEPT}; const me = D.get().me; ${FIN} })()`);
      const r3 = await t.page.evaluate(`(() => { (${SETUP.toString()})(); const D = __dbg; const me = D.get().me; ${FIN} })()`);
      t.ok(r2 && r3, 'Auftrag ist zu Ende');
      const num = s => +String(s).replace(/\D/g, '');
      const beute = r2.find(l => /^Beute:/.test(l)), anteil = r2.find(l => /^Anteil Fahrer/.test(l)), erg = r2.find(l => /^Ergebnis:/.test(l)), erg0 = r3.find(l => /^Ergebnis:/.test(l));
      t.ok(beute && anteil && erg, 'Zeilen vorhanden: ' + JSON.stringify(r2));
      t.ok(/50 %/.test(anteil) && num(anteil.split('):')[1]) === num(beute) / 2, 'Anteil Fahrer 50 % der Beute: ' + JSON.stringify(r2));
      t.ok(num(erg0) - num(erg) === num(beute) / 2, 'Ergebnis um die Hälfte der Beute kleiner als ohne Deal: ' + erg + ' gegen ' + erg0);
      t.ok(!r3.some(l => /^Anteil Fahrer/.test(l)), 'ohne Deal keine Zeile: ' + JSON.stringify(r3));
    },
  },
  {
    name: 'Fahrer-Deal Coop: der Client sieht Angebot und Fahrerfigur, nimmt per E an, Host und Client stimmen überein',
    timeout: 200000,
    async run(t) {
      await t.loadTool('loopnet.js'); await t.loadInpage('coop.js');
      const r = await t.page.evaluate(() => {
        const o = {}, pre = insts => { for (const d of insts) { const C = d.CFG; C.alt.on = 0; C.vanLock = 0; C.policeAt = 1e6; C.policeForced = 1e6; C.vanStay = 1e6; C.vanCall = 1; C.meet.p = 0; } };
        const G = CT.mkGame('bank', 1, 2, 40, 0, null, 'S', pre), { A, clients } = G, B = clients[0];
        A.startHeist(false, A.get().me); A.callVan(); G.run(40);
        const ln = A.LANE(), vm = ln.van.mid(ln.van.stop), ps = A.get().players, far = () => ps.forEach(p => { p.hp = 1e9; p.x = 5 * 32; p.y = 5 * 32; });
        const cyc = () => {
          const c = A.mkCop(vm[0] + 60, vm[1] + 20, false); c.mode = 'post'; c.post = { x: 0, y: 0, a: 0 }; c.rt = 1e9; c.cool = 1e9; A.get().en.push(c);
          for (let i = 0; i < 20 * 60 && A.get().vanMode !== 1; i++) { far(); c.x = vm[0] + 60; c.y = vm[1] + 20; G.run(1 / 60); }
          A.get().en.length = 0;
          for (let i = 0; i < 60 * 60 && !(A.get().vanMode === 0 && Math.abs(A.get().vanX - ln.van.stop) <= 2); i++) { far(); G.run(1 / 60); }
        };
        cyc(); cyc(); G.run(1);
        o.angebot = [A.get().dl.st, B.get().dl.st];
        const p1 = ps[1]; let spot = null;
        for (let r = 40; r <= 85 && !spot; r += 15) for (let k = 0; k < 16 && !spot; k++) {
          const x = vm[0] + Math.cos(k * .3927) * r, y = vm[1] + Math.sin(k * .3927) * r;
          if (!A.isSol(Math.floor(x / 32), Math.floor(y / 32)) && !ln.exit.has(x, y)) spot = [x, y];
        }
        const hold = () => { ps.forEach(p => { p.hp = 1e9; }); p1.x = spot[0]; p1.y = spot[1]; p1.vx = p1.vy = 0; };
        for (let i = 0; i < 60; i++) { hold(); G.run(1 / 60); }   // erst ankommen lassen: der Client wählt E-Objekte mit seiner eigenen Position
        B.keys.e = 1; for (let i = 0; i < 3 * 60; i++) { hold(); G.run(1 / 60); } B.keys.e = 0; G.run(1);
        o.st = [A.get().dl.st, B.get().dl.st]; const dv = A.get().dl.dv, dvB = B.get().dl.dv;
        o.fig = [!!dv, !!dvB, dv && dvB ? Math.round(Math.hypot(dv.x - dvB.x, dv.y - dvB.y)) : -1];
        return o;
      });
      t.eq(r.angebot, [1, 1], 'Angebot steht auf Host und Client');
      t.eq(r.st, [2, 2], 'der Client hat angenommen, beide sehen den Einsatz');
      t.eq(r.fig.slice(0, 2), [true, true], 'Fahrerfigur auf Host und Client');
      t.ok(r.fig[2] >= 0 && r.fig[2] < 12, 'Figur an fast gleicher Stelle: ' + JSON.stringify(r.fig));
    },
  },
];
