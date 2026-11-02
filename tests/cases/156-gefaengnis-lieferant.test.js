// Gefaengnis, Issue 71 (Tills Board, 2. November 2026): (1) Zur Lieferzeit kommt ein Lieferant (Zivilist, `dlv`) von draussen durch die Servicetuer in die Kueche, die Tuer bleibt CFG.prison.dlOpen s offen, nachdem er durch ist (Fenster im HUD, Schnappschussfeld `pv`), dann zu. (2) Jede ausgeschaltete oder im Alarm getoetete Wache hinterlaesst eine Pistole fuer den Gefangenen (Objekt `pist`, Ort bei toten Gegnern im Schnappschussfeld `pg`).
const HELP = `(() => {
  const G = CT.mkGame('prison', 5, 2, 60, 20), A = G.A, B = G.clients[0], T = 32;
  const both = (sec, f) => { for (let i = 0; i < Math.round(sec * 60); i++) { A.get().players.forEach(p => { p.hp = 1e9; p.dead = false; }); if (f) f(i); step(G.insts, G.net, 1 / 60); } };
  const cl = (D, x, y) => D.world().M[y + 6][x + 6];   // die Anlage liegt in der Welt ab (-6,-6)
  const items = (D, t) => D.get().its.filter(i => i.t === t);
  const lock = (D, id) => D.LAY().prison.locks.find(l => l.id === id);
  const lst = (D, id) => lock(D, id).cells.map(c => cl(D, c[0], c[1])).join('');
  const sw = (D, id) => items(D, 'lsw').find(i => D.LAY().prison.sws[i.k].opens.includes(id));
  return { G, A, B, T, both, cl, items, lock, lst, sw };
})()`;
module.exports = [
  {
    name: 'Gefaengnis-Lieferant: zur Lieferzeit kommt er von draussen durch die Servicetuer in die Kueche, die Tuer bleibt danach CFG.prison.dlOpen s offen und geht dann zu (Host und Client, HUD-Feld pv)',
    timeout: 120000,
    async run(t) {
      await t.loadTool('loopnet.js'); await t.loadInpage('coop.js');
      const r = await t.page.evaluate(`(() => {
        const H = ${HELP}, A = H.A, B = H.B, o = {}, R = A.LAY().prison, C = A.CFG.prison, d = R.dl.cells[0];
        const dv = D => D.get().npcs.find(n => n.dlv), door = () => H.cl(A, d[0], d[1]) + H.cl(B, d[0], d[1]), rt = () => A.get().rT;
        o.cfg = [C.dlOpen, C.deliveryOpen]; o.hid = [dv(A).st, dv(B).st];
        while (rt() < R.dl.at - 0.3) H.both(0.25);
        o.pre = [door(), dv(A).st]; let outside = false;
        for (let i = 0; i < 40 * 4 && !o.inT; i++) { H.both(0.25); const n = dv(A); if (n.st === 'idle' && n.y > d[1] * H.T + 32) outside = true; if (n.y < d[1] * H.T - 32) o.inT = rt(); }
        o.outside = outside; o.inT = o.inT || null; o.doorIn = door(); o.stIn = R.dv.st;
        const t0 = rt(), rem = R.dv.end - t0; o.rem = rem <= C.dlOpen + 0.01 && rem > C.dlOpen - 0.6; H.both(rem - 0.6); o.at4 = door(); o.hud = [A.LAY().prison.dv.st, B.LAY().prison.dv.st];
        H.both(1.2); o.at6 = door(); o.endSt = R.dv.st; o.dt = +(rt() - t0).toFixed(1);
        const n = dv(A); o.where = [Math.floor(n.x / H.T), Math.floor(n.y / H.T), n.y < d[1] * H.T];
        return o; })()`);
      t.eq(r.cfg, [5, 20], 'dlOpen 5 s (Fenster nach dem Lieferanten), deliveryOpen 20 s (von innen)');
      t.eq(r.hid, ['away', 'away'], 'vor der Lieferung ist der Lieferant nicht da');
      t.eq(r.pre[0], 'LL', 'Tuer zu vor der Lieferung');
      t.ok(r.outside, 'er steht zuerst draussen vor der Tuer');
      t.ok(r.inT != null, 'er kommt durch die Tuer in die Kueche');
      t.eq(r.doorIn, 'll', 'direkt nach dem Durchgang ist die Tuer noch offen');
      t.ok(r.rem, 'ab dem Durchgang laufen genau dlOpen Sekunden');
      t.eq(r.stIn, 2, 'das 5-s-Fenster laeuft (Zustand 2)');
      t.eq(r.at4, 'll', 'knapp vor Ablauf noch offen');
      t.eq(r.hud, [2, 2], 'Fenster auf Host und Client im Schnappschuss (pv)');
      t.eq(r.at6, 'LL', 'danach zu');
      t.ok(r.where[2], 'der Lieferant bleibt in der Kueche: ' + r.where);
    },
  },
  {
    name: 'Gefaengnis-Pistolen: jede ausgeschaltete Wache laesst eine Pistole liegen, auch die dritte und vierte, immer wieder; im Alarm getoetete Wachen auch (Ort per Schnappschuss beim Client)',
    timeout: 120000,
    async run(t) {
      await t.loadTool('loopnet.js'); await t.loadInpage('coop.js');
      const r = await t.page.evaluate(`(() => {
        const H = ${HELP}, A = H.A, B = H.B, o = {}, p1 = A.get().players[1], gs = A.get().npcs.filter(n => n.k === 'grd' && n.st !== 'away');
        const pist = H.items(A, 'pist'); o.n = [pist.length, gs.length]; o.picked = [];
        for (let i = 0; i < 4; i++) { p1.mag = 0; p1.res = 0; gs[i].st = 'ko'; gs[i].kt = 99; const ok = pist[i].ok(p1); pist[i].act(p1); o.picked.push([ok, p1.mag > 0, pist[i].done]); }
        p1.mag = 0; p1.res = 0; A.startHeist(true, A.get().players[0]); H.both(0.5);
        const en = A.get().en.find(e => e.pgi === 4); o.enemy = !!en; const ex = en.x, ey = en.y; o.before = pist[4].ok(p1);
        en.hp = 0; H.both(0.5);
        const pb = H.items(B, 'pist')[4], p1b = B.get().players[1]; p1b.mag = 0; p1b.res = 0;
        o.dead = [pist[4].ok(p1), pb.ok(p1b), Math.abs(pist[4].x - ex) < 40 && Math.abs(pist[4].y - ey) < 40, Math.abs(pb.x - ex) < 40];
        pb.act(p1b); o.clientGot = p1b.mag > 0;
        return o; })()`);
      t.eq(r.n, [7, 7], 'je Wache eine Pistole');
      t.eq(r.picked.map(q => q.join()), ['true,true,true', 'true,true,true', 'true,true,true', 'true,true,true'], 'Wache 1 bis 4 je ausgeschaltet: aufhebbar, bewaffnet');
      t.ok(r.enemy, 'im Alarm wird die Wache zum Gegner (traegt ihren Pistolen-Index)');
      t.eq(r.before, false, 'lebendig und wach: keine Pistole');
      t.eq(r.dead, [true, true, true, true], 'getoetet: Pistole an der Stelle, auf Host und Client');
      t.ok(r.clientGot, 'der Gefangene als Client hebt sie auf');
    },
  },
  {
    name: 'Gefaengnis-Lieferant: von hinten bewusstlos auszuschalten (wie Angestellte), ein Koerper im Blick einer Wache gibt Alarm; er selbst sieht Bewaffnete und meldet sie (Verdacht steigt), anders als Kunden',
    timeout: 120000,
    async run(t) {
      await t.loadTool('loopnet.js'); await t.loadInpage('coop.js');
      const r = await t.page.evaluate(`(() => {
        const H = ${HELP}, A = H.A, o = {}, R = A.LAY().prison, K = A.CFG.ko, d = R.dl.cells[0], g = A.get(), p0 = g.players[0];
        const place = () => { const n = g.npcs.find(q => q.dlv); n.st = 'idle'; n.still = true; n.path = []; n.base = Math.PI / 2; n.a = n.base; n.x = d[0] * H.T + 16; n.y = (d[1] - 3) * H.T + 16; n.alert = 0; n.look = null; return n; };
        let n = place();
        // Bewaffnete im Blick: Verdacht steigt (Kunden sehen das nicht, Angestellte schon)
        p0.x = n.x; p0.y = n.y + 90; const sus0 = A.get().sus; let mx = 0;
        for (let i = 0; i < 90; i++) { p0.thf = .6; H.both(1 / 30); mx = Math.max(mx, A.get().sus); } o.sus = [Math.round(sus0), Math.round(mx), n.alert > 0 || A.get().phase === 2];
        // Ausschalten von hinten
        n = place(); o.phSus = A.get().phase; p0.x = n.x; p0.y = n.y - 28; p0.thf = 0; const it = A.koMi(n); o.okBehind = it.ok(p0); p0.y = n.y + 28; o.okFront = it.ok(p0);
        p0.y = n.y - 28; it.act(p0); o.ko = n.st; o.bodyMi = A.bodyMi(n).ok(p0);
        // Wache sieht den Koerper: Alarm nach CFG.ko.find s
        const gd = g.npcs.find(q => q.k === 'grd' && q.st !== 'away'); gd.st = 'idle'; gd.still = true; gd.route = null; gd.path = []; gd.x = n.x; gd.y = n.y - 90; gd.base = Math.PI / 2; gd.a = gd.base; gd.alert = 0;
        p0.x = 3 * H.T; p0.y = 3 * H.T; o.ph0 = A.get().phase; for (let i = 0; i < Math.round((K.find + 1.5) * 30); i++) { gd.base = Math.PI / 2; gd.x = n.x; gd.y = n.y - 90; H.both(1 / 30); } o.ph1 = A.get().phase;
        return o; })()`);
      t.ok(r.sus[1] > r.sus[0], 'der Lieferant sieht die Bewaffneten und der Verdacht steigt: ' + r.sus);
      t.eq([r.okBehind, r.okFront], [true, false], 'Ausschalten nur von hinten');
      t.eq(r.ko, 'ko', 'er ist bewusstlos');
      t.ok(r.bodyMi, 'der Koerper laesst sich greifen und ziehen');
      t.eq([r.ph0, r.ph1], [1, 2], 'eine Wache, die den Koerper sieht, schlaegt Alarm');
    },
  },
];
