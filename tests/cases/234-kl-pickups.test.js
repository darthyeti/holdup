// Kloetzchen-Aufnahmen (Ticket 234, js/kl-pickups.js, Haken 'dyn' im Kern): jede Art (Munition 5, Medikit 6, unbekannte Zelle) ist ein Klotzmodell unter 10 Teilen, schwebt (6 bis 11 Einheiten),
// dreht sich (eine Umdrehung in 3 s), ersetzt die Billboards der Ansicht, im Coop zeichnet der Client sie aus dem Schnappschuss. Ohne WebGL 2 uebersprungen.
const lib = require('../lib');
const { glPage } = require('../glshare');   // gemeinsamer WebGL-Browser (tests/glshare.js)
module.exports = [
  {
    name: 'Kloetzchen-Aufnahmen: Modell je Art unter 10 Teilen, schweben und drehen sich, ersetzen die Billboards, keine Fehler',
    timeout: 240000,
    async run(t) {
      const P = await glPage(t); if (!P) return;
      try {
        await lib.loadInpage(P.page, 'bild.js');
        const r = await P.page.evaluate(`(async () => { const D = __dbg, o = {};
          D.view3d.kstil = 1; await D.view3d.set(true); PX.scene('bank', 5); PX.phase('ueberfall'); const g = D.get(), me = g.me; g.en.length = 0; g.npcs.length = 0; g.cars.length = 0; const L = D.fxL(); L.pk.length = 0;
          const K = D.view3d.V.kl(), k = K.kit, KL = K.KL; o.has = [!!(KL.fxs.dyn && KL.fxs.dyn.length), K.hasPk(), (KL.pickupKinds || []).join()];
          const meas = () => { D.draw(); D.draw(); const i = D.view3d.V.info(); return { parts: i.k.parts, calls: i.fx.calls, pk: i.fx.pk, err: i.err } };
          o.none = meas(); const at = (s, kind) => ({ x: me.x + 60 + s, y: me.y + 40, k: kind }); L.pk.push(at(-34, 5), at(0, 6), at(34, 9)); o.three = meas();
          // je Art einzeln gesammelt: Teile und Hoehe der Unterkante, zu zwei Zeitpunkten
          const per = {}; for (const kind of [5, 6, 9]) { L.pk.length = 0; L.pk.push(at(0, kind)); const rec = tm => { k.time = tm; k.state(0, 1); const ps = k.collect(() => { for (const f of KL.fxs.dyn) f(k) }); let lo = 1e9, hi = -1e9; for (const p of ps) { const h = Math.abs(p.m.elements[5]) * .5; lo = Math.min(lo, p.m.elements[13] - h); hi = Math.max(hi, p.m.elements[13] + h) } return { n: ps.length, lo: Math.round(lo * 10) / 10, hi: Math.round(hi * 10) / 10, rx: ps[0] ? Math.round(ps[0].m.elements[0] * 1000) / 1000 : 0 } }; per[kind] = [rec(10), rec(10.5), rec(11.5)] } o.per = per;
          L.pk.length = 0; await D.view3d.set(false); return o; })()`);
        t.note(JSON.stringify(r));
        t.ok(r.has[0] && r.has[1] && r.has[2] === '5,6', 'Bauer eingetragen, Billboards ersetzt, Arten 5 und 6: ' + r.has);
        t.ok(r.none.err === '' && r.three.err === '', 'keine Fehler');
        t.eq(r.three.parts - r.none.parts, 4 + 8 + 2, 'Teile der drei Aufnahmen (Medikit 4, Munition 8, unbekannt 2)');
        t.eq(r.three.calls, r.none.calls, 'keine Billboard-Zeichnung (Draw Calls gleich mit und ohne Aufnahmen)');
        for (const kind of [5, 6, 9]) {
          const [a, b, c] = r.per[kind];
          t.ok(a.n >= 2 && a.n < 10, 'Art ' + kind + ': Teile unter 10: ' + a.n);
          t.ok(a.lo >= 5 && a.lo <= 11.5 && c.lo >= 5 && c.lo <= 11.5, 'Art ' + kind + ': schwebt (Unterkante ' + a.lo + ', ' + c.lo + ')');
          t.ok(a.lo !== c.lo || a.lo !== b.lo, 'Art ' + kind + ': wippt (' + [a.lo, b.lo, c.lo] + ')');
          t.ok(a.rx !== b.rx && b.rx !== c.rx, 'Art ' + kind + ': dreht sich (' + [a.rx, b.rx, c.rx] + ')');
        }
        if (P.page.errors.length) t.ok(false, 'JS-Fehler: ' + P.page.errors.slice(0, 2).join(' | '));
      } finally { await P.done(); }
    },
  },
  {
    name: 'Kloetzchen-Aufnahmen im Coop: der Client zeichnet die Aufnahmen des Hosts als Klotzmodelle (pk aus dem Schnappschuss), ohne Billboards und ohne Fehler',
    timeout: 300000,
    async run(t) {
      const P = await glPage(t); if (!P) return;
      try {
        await lib.loadTool(P.page, 'loopnet.js'); await lib.loadInpage(P.page, 'coop.js');
        const r = await P.page.evaluate(`(async () => {
          const G = CT.mkGame('bank', 321, 2), A = G.A, B = G.clients[0]; A.CFG.policeAt = 1e6; A.CFG.policeForced = 1e6;
          const run = n => { for (let i = 0; i < n; i++) step(G.insts, G.net, 1 / 60); };
          for (const d of [A, B]) { d.view3d.kstil = 1; await d.view3d.set(true); }
          A.startHeist(); run(120); const o = {}; const meas = d => { d.draw(); d.draw(); const i = d.view3d.V.info(); return { parts: i.k.parts, calls: i.fx.calls, pk: i.fx.pk, err: i.err } };
          A.get().en.length = 0; A.get().me.hp = 1e9; o.none = [meas(A), meas(B)];
          const me = A.get().me, L = A.fxL(); L.pk.length = 0; L.pk.push({ x: me.x + 40, y: me.y + 30, k: 5 }, { x: me.x + 70, y: me.y + 30, k: 6 }); run(30); o.three = [meas(A), meas(B)];
          for (const d of [A, B]) await d.view3d.set(false); for (const d of G.insts) { try { d.leaveGame(); } catch (e) {} } return o; })()`);
        t.note(JSON.stringify(r));
        t.ok(r.three[1].pk >= 2 && r.three[0].pk >= 2, 'beide kennen die Aufnahmen: Host ' + r.three[0].pk + ', Client ' + r.three[1].pk);
        t.ok(r.three.every((q, i) => q.parts - r.none[i].parts >= 12), 'beide zeichnen die Modelle (Teile plus ' + r.three.map((q, i) => q.parts - r.none[i].parts) + ')');
        t.ok(r.three.every((q, i) => q.calls === r.none[i].calls) && r.three.every(q => q.err === ''), 'keine Billboards, keine Fehler');
        if (P.page.errors.length) t.ok(false, 'JS-Fehler: ' + P.page.errors.slice(0, 2).join(' | '));
      } finally { await P.done(); }
    },
  },
];
