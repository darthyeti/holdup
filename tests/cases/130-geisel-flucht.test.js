// Geiseln beim Einsteigen (Paket Transporter, Schleichen und Optik, T3, Tills Wunsch vom 27. Oktober 2026): Sobald der Besitzer in den Fluchtwagen steigt (der Ring beim Einsteigen laeuft, bd groesser als CFG.hostage.fleeAt),
// reisst sich die Geisel los und laeuft zur naechsten Polizei. Sie bleibt dabei eine Geisel (Zustand hostage ohne Besitzer, also Kugelfang und Geiselschild gelten weiter), wird bei der Polizei wieder ein geduckter Zivilist,
// nach CFG.hostage.fleeT Sekunden auch ohne Ankunft. Ist keine Polizei da, ist die Geisel einfach frei (wie beim Loslassen). Aufbau wie in Test 32: Wagen am Halt, keine Polizei, der Spieler unverwundbar.
const SETUP = () => {
  const D = __dbg; D.CFG.policeAt = 1e6; D.CFG.policeForced = 1e6; D.CFG.vanCall = 1; D.CFG.vanStay = 600;
  D.reset(); D.startHeist(false, D.get().me); D.callVan();
  const g = D.get(), ln = D.laneOf(D.LAY()), c = ln.exit.cells[Math.floor(ln.exit.cells.length / 2)];
  window.__z = [c[0] * 32 + 16, c[1] * 32 + 16];
  const step = (n, f) => { for (let i = 0; i < n; i++) { const m = D.get().me; m.hp = 1e9; if (f) f(m, i); D.update(1 / 30); } };
  window.__step = step;
  step(30 * 40, m => { m.x = 5 * 32; m.y = 5 * 32; });
  D.get().en.length = 0; D.get().me.hurt = 0;
  return { vanArr: D.get().vanArr, mode: D.get().vanMode };
};
// Beamter am Posten, der am weitesten vom Fluchtbereich liegt, haelt dort (rt gross), und eine Geisel neben dem Spieler
const COP = `() => { const D = __dbg, L = D.LAY(), z = window.__z, g = D.get(); let best = null, bd = -1; for (const po of L.posts) { const d = Math.hypot(po.x * 32 + 16 - z[0], po.y * 32 + 16 - z[1]); if (d > bd) { bd = d; best = po; } }
  const c = D.mkCop(best.x * 32 + 16, best.y * 32 + 16); D.toPost(c); c.rt = 1e9; c.hx = 0; return c; }`;
const HOST = `(c) => { const D = __dbg, g = D.get(), me = g.me, n = g.npcs.find(q => q.st === 'cower' && q.k !== 'grd'); n.x = me.x; n.y = me.y; D.grabHost(n, me); return n; }`;

module.exports = [
  {
    name: 'Geisel beim Einsteigen: solange niemand einsteigt, folgt sie dem Besitzer, mit dem Ring laeuft sie zur Polizei (bleibt Geisel ohne Besitzer, kann nicht neu genommen werden), kommt dort an und ist wieder ein geduckter Zivilist',
    async run(t) {
      await t.loadTool('loopnet.js'); await t.loadInpage('coop.js');
      const r = await t.page.evaluate(`(() => { (${SETUP.toString()})(); const D = __dbg, me = () => D.get().me, o = {}, cop = (${COP})(), n = (${HOST})(cop), z = window.__z;
        window.__step(30, m => { m.x = 5 * 32; m.y = 5 * 32; }); o.vorher = [n.st, n.own, !!n.flee, Math.hypot(n.x - me().x, n.y - me().y) < 120];
        me().units = 0;
        window.__step(4, m => { m.x = z[0]; m.y = z[1]; n.x = m.x; n.y = m.y; }); o.beginn = [me().bd > 0, n.st, n.own, !!n.flee, D.hasHost(me())];
        o.meld = D.msgs().feed.some(s => /Geisel/.test(s) && /Polizei/.test(s)); const d0 = Math.hypot(n.x - cop.x, n.y - cop.y);
        const p0 = [n.x, n.y]; window.__step(30, m => { m.x = z[0]; m.y = z[1]; }); o.weg = Math.hypot(n.x - p0[0], n.y - p0[1]);
        window.__step(30 * 2, m => { m.x = 5 * 32; m.y = 5 * 32; }); o.lauf = [n.st, !!n.flee, Math.hypot(n.x - cop.x, n.y - cop.y) < d0 - 80];
        let tA = 0; while (n.st === 'hostage' && tA < 30 * 15) { window.__step(1, m => { m.x = 5 * 32; m.y = 5 * 32; }); tA++; } o.ankunft = [n.ft, D.CFG.hostage.fleeT];
        window.__step(30 * 20, m => { m.x = 5 * 32; m.y = 5 * 32; }); o.ende = [n.st, !!n.flee, n.own, Math.hypot(n.x - cop.x, n.y - cop.y) < 120];
        return o; })()`);
      t.eq(r.vorher, ['hostage', 0, false, true], 'ohne Einsteigen folgt die Geisel dem Besitzer'); t.eq(r.beginn, [true, 'hostage', -1, true, false], 'mit dem Ring reisst sie sich los (Geisel ohne Besitzer, der Spieler hat keine mehr)');
      t.ok(r.meld, 'eine Meldung nennt die Flucht zur Polizei'); t.ok(r.weg > 80, 'sie rennt mit voller Kraft los (in einer Sekunde ueber 80 Pixel, kein Hin und Her zum Besitzer): ' + Math.round(r.weg)); t.ok(r.lauf[2], 'sie kommt der Polizei deutlich naeher: ' + JSON.stringify(r.lauf));
      t.eq(r.ende, ['cower', false, -1, true], 'bei der Polizei ist sie wieder ein geduckter Zivilist'); t.ok(r.ankunft[0] < r.ankunft[1] - 1, 'sie kommt an, bevor die Zeit ablaeuft: ' + JSON.stringify(r.ankunft));
    },
  },
  {
    name: 'Geisel beim Einsteigen: ohne Polizei ist sie einfach frei, ist der Weg zur Polizei zu lang, endet die Flucht nach CFG.hostage.fleeT Sekunden, der Schnappschuss zeigt sie als Geisel ohne Besitzer',
    async run(t) {
      await t.loadTool('loopnet.js'); await t.loadInpage('coop.js');
      const r = await t.page.evaluate(`(() => { (${SETUP.toString()})(); const D = __dbg, me = () => D.get().me, o = {}, z = window.__z, n = (${HOST})(null);
        window.__step(4, m => { m.x = z[0]; m.y = z[1]; n.x = m.x; n.y = m.y; }); o.keine = [n.st, n.own, !!n.flee];
        (${SETUP.toString()})(); const cop = (${COP})(), n2 = (${HOST})(cop), F = D.CFG.hostage; F.fleeSpd = 5;
        window.__step(4, m => { m.x = z[0]; m.y = z[1]; n2.x = m.x; n2.y = m.y; }); o.flieht = [n2.st, !!n2.flee];
        const sn = D.buildSnap().np.find(a => a[0] === n2.id); o.snap = sn ? [sn[6], sn[9]] : null;
        window.__step(30 * (F.fleeT - 1), m => { m.x = 5 * 32; m.y = 5 * 32; }); o.vorEnde = [n2.st, !!n2.flee];
        window.__step(30 * 3, m => { m.x = 5 * 32; m.y = 5 * 32; }); o.nachEnde = [n2.st, !!n2.flee];
        return o; })()`);
      t.eq(r.keine, ['cower', -1, false], 'ohne Polizei ist die Geisel beim Einsteigen einfach frei'); t.eq(r.flieht, ['hostage', true], 'mit Polizei flieht sie'); t.eq(r.snap, [3, 0], 'der Schnappschuss zeigt sie als Geisel (3) ohne Besitzer (0)');
      t.eq(r.vorEnde, ['hostage', true], 'langsam unterwegs bleibt sie Geisel bis kurz vor dem Zeitlimit'); t.eq(r.nachEnde, ['cower', false], 'nach dem Zeitlimit ist die Flucht zu Ende');
    },
  },
];
