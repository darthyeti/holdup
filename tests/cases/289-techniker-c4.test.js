// Skillbaum v2, Schritt 3 (Ticket 289, docs/skillbaum-v2.md): Techniker (U2) hoert den Funk ab (naechste Polizeiwelle im HUD, Vorwarnung 10/15/20 s, fuer das ganze Team),
// C4 (U4) sprengt neu auch verschlossene Tueren (c4d), Gefaengnis-Gitter und Zellentueren (c4g) und Waende (c4w, nur Gebaeudewaende, nicht am Tresorraum, nicht am Kartenrand, nur mit begehbarem Boden gegenueber).
const HELP = `(() => {
  const D = __dbg;
  const bank = (sk, phase1) => { D.sessReset(); Object.assign(D.SESSION.sk, sk || {}); D.setScenario('bank'); D.setSeedMode('random'); D.setLage([]); D.setTurn('S'); D.buildSeed(5017); D.CFG.policeAt = 1e6; D.CFG.policeForced = 1e6;
    D.reset(); if (!phase1) D.startHeist(false, D.get().me); const g = D.get(), me = g.me; me.hp = 1e9; return { D, g, me }; };
  const walls = () => { const W = D.world(), out = []; for (let y = W.WY0; y < W.WY0 + W.H; y++) for (let x = W.WX0; x < W.WX0 + W.W; x++) if (W.cell(x, y) === '#') out.push([x, y]); return out; };
  return { D, bank, walls };
})()`;

module.exports = [
  {
    name: 'Funk abhoeren: Techniker zeigt die naechste Welle (Restzeit, Seite) erst innerhalb von 10/15/20 s, ohne Techniker oder bei totem Techniker nichts, im Erkunden nichts',
    async run(t) {
      const r = await t.page.evaluate(`(() => { const H = ${HELP}, D = H.D, o = {};
        o.cfg = D.CFG.funkAb.t;
        const run = (lv) => { const b = H.bank(lv ? { U2: lv } : {}, false); const g = D.get(); D.update(1 / 30); const out = { w: D.funkCalc() };
          D.setPolice(D.get().tH + 40); out.far = !!D.funkAb(); D.setPolice(D.get().tH + 9); out.s9 = D.funkAb(); D.setPolice(D.get().tH + 14); out.s14 = !!D.funkAb(); D.setPolice(D.get().tH + 19); out.s19 = !!D.funkAb(); D.setPolice(D.get().tH + 25); out.s25 = !!D.funkAb();
          D.draw(); return out; };
        o.l0 = run(0); o.l1 = run(1); o.l2 = run(2); o.l3 = run(3);
        { const b = H.bank({ U2: 2 }, false); const g = D.get(); D.setPolice(D.get().tH + 9); b.me.dead = true; D.update(1 / 30); D.setPolice(D.get().tH + 9); o.dead = [D.funkCalc(), !!D.funkAb()]; b.me.dead = false; }
        { const b = H.bank({ U2: 2 }, true); o.p1 = [D.get().phase, !!D.funkAb()]; }
        return o; })()`);
      t.eq(r.cfg, [10, 15, 20], 'CFG.funkAb.t');
      t.eq([r.l0.w, r.l1.w, r.l2.w, r.l3.w], [0, 10, 15, 20], 'Vorwarnzeit je Stufe');
      t.eq([r.l0.far, !!r.l0.s9], [false, false], 'ohne Techniker keine Anzeige');
      t.eq([r.l1.far, !!r.l1.s9, r.l1.s14, r.l1.s25], [false, true, false, false], 'Stufe 1: nur innerhalb 10 s ' + JSON.stringify(r.l1));
      t.eq([r.l2.s14, r.l2.s19, r.l3.s19, r.l3.s25], [true, false, true, false], 'Stufe 2: 15 s, Stufe 3: 20 s');
      t.ok(r.l1.s9 && Math.abs(r.l1.s9.s - 9) < .2 && ['W', 'E', 'N', 'S'].includes(r.l1.s9.side), 'Restzeit und Seite: ' + JSON.stringify(r.l1.s9));
      t.eq(r.dead, [0, false], 'ein toter Techniker hoert nichts ab');
      t.eq(r.p1, [1, false], 'im Erkunden keine Welle zu melden');
    },
  },
  {
    name: 'Funk abhoeren im Coop: der Techniker (Host) warnt auch den Client (Wert im Schnappschuss), weit vor der Welle bleibt es dunkel',
    timeout: 120000,
    async run(t) {
      await t.loadTool('loopnet.js'); await t.loadInpage('coop.js');
      const r = await t.page.evaluate(`(() => { const o = {};
        const G = CT.mkGame('bank', 5, 2, 60, 20, null, null, insts => { insts.forEach(d => { d.SESSION.sk.U2 = 2; }); }), A = G.A, B = G.clients[0];
        const both = sec => { for (let i = 0; i < Math.round(sec * 60); i++) { A.get().players.forEach(p => { p.hp = 1e9; p.dead = false; }); step(G.insts, G.net, 1 / 60); } };
        A.startHeist(true, A.get().players[0]); both(1); A.setPolice(A.get().tH + 12); both(1);
        o.a = [A.funkCalc(), !!A.funkAb()]; o.b = !!B.funkAb(); B.draw();
        const f = B.funkAb(); o.s = !!f && Math.abs(f.s - (A.get().policeAt - A.get().tH)) < 1.5; o.side = !!f && f.side === A.funkAb().side;
        A.setPolice(A.get().tH + 60); both(1); o.far = [!!A.funkAb(), !!B.funkAb()];
        return o; })()`);
      t.eq(r.a, [15, true], 'Host: Stufe 2, 12 s vor der Welle');
      t.eq(r.b, true, 'Client sieht die Anzeige');
      t.ok(r.s && r.side, 'Client: gleiche Restzeit und Seite wie der Host');
      t.eq(r.far, [false, false], 'weit vor der Welle bei beiden nichts');
    },
  },
  {
    name: 'C4 an der Wand: nur Gebaeudewaende mit begehbarem Boden gegenueber, nicht am Tresorraum, nicht am Kartenrand; Sprengung macht Boden (Raster, statische Ebene), Alarm im Erkunden, Vorrat weg, reset stellt die Wand wieder her',
    async run(t) {
      const r = await t.page.evaluate(`(() => { const H = ${HELP}, D = H.D, o = {};
        const b = H.bank({ U4: 1 }, true); const W = D.world(), L = D.LAY(), ws = H.walls(), B = L.bld;
        const ok = ws.filter(q => D.wallOk(q[0], q[1])), bad = ws.filter(q => !D.wallOk(q[0], q[1])); if (!ok.length) return { n: [true, true], dbg: [ws.length, JSON.stringify(B), W.WX0, W.WY0, W.W, W.H, ws.slice(0, 5)] };
        o.n = [ok.length > 10, bad.length > 10];
        o.inBld = ok.every(q => q[0] >= B.x0 && q[0] <= B.x1 && q[1] >= B.y0 && q[1] <= B.y1);
        o.edge = ws.filter(q => q[0] <= W.WX0 || q[0] >= W.WX0 + W.W - 1 || q[1] <= W.WY0 || q[1] >= W.WY0 + W.H - 1).every(q => !D.wallOk(q[0], q[1]));
        const near = ws.filter(q => (L.vault.bundles || []).some(c => Math.abs(c[0] - q[0]) <= 1 && Math.abs(c[1] - q[1]) <= 1));
        o.vault = [near.length > 0, near.every(q => !D.wallOk(q[0], q[1]))];
        const dd = L.vault.door; o.door = ws.filter(q => Math.abs(q[0] - dd[0]) <= 1 && Math.abs(q[1] - dd[1]) <= 1).every(q => !D.wallOk(q[0], q[1]));
        const sol = ws.find(q => !(!W.isSol(q[0] - 1, q[1]) && !W.isSol(q[0] + 1, q[1])) && !(!W.isSol(q[0], q[1] - 1) && !W.isSol(q[0], q[1] + 1)) && q[0] >= B.x0 && q[0] <= B.x1 && q[1] >= B.y0 && q[1] <= B.y1);
        o.solid = !sol || !D.wallOk(sol[0], sol[1]);
        const w = ok.find(q => !W.isSol(q[0], q[1] + 1)) || ok[0], me = b.me; me.x = (w[0] + .5) * 32; me.y = (w[1] + 1.5) * 32; if (W.isSol(w[0], w[1] + 1)) { me.x = (w[0] - .5) * 32; me.y = (w[1] + .5) * 32; }
        const tgt = D.c4Wall(me); o.tgt = !!tgt && tgt[0] === w[0] && tgt[1] === w[1];
        const mi = D.itsAll().find(i => i.t === 'c4w' && i.ok(me)); o.item = !!mi; o.near = mi ? [Math.round(mi.x - (w[0] + .5) * 32), Math.round(mi.y - (w[1] + .5) * 32)] : null;
        const px = () => { const d = W.st.getContext('2d').getImageData((w[0] - W.WX0) * 64 + 8, (w[1] - W.WY0) * 64 + 8, 48, 48).data; let h = 0; for (let i = 0; i < d.length; i += 4) h = (Math.imul(h, 31) + d[i] + d[i + 1] * 3 + d[i + 2] * 7) | 0; return h; };
        const h0 = px(); o.c4 = me.c4; o.p1 = D.get().phase; mi.act(me); const g = D.get();
        o.after = [W.cell(w[0], w[1]), me.c4, g.phase, D.rub().length, px() !== h0]; o.msg = D.msgs().feed.join(' | ');
        o.noMore = D.itsAll().some(i => i.t === 'c4w' && i.ok(me));
        o.pass = !W.isSol(w[0], w[1]) && !W.isOpq(w[0], w[1]);
        o.noOne = !D.wallOk(w[0], w[1]);
        D.draw();
        D.reset(); o.reset = [D.world().cell(w[0], w[1]), D.rub().length];
        return o; })()`);
      t.eq(r.n, [true, true], 'es gibt sprengbare und nicht sprengbare Waende ' + JSON.stringify(r.dbg));
      t.ok(r.inBld && r.edge, 'sprengbar nur im Gebaeude, nie am Kartenrand ' + JSON.stringify(r.dbg));
      t.eq(r.vault, [true, true], 'Waende am Tresorinhalt sind tabu');
      t.ok(r.door && r.solid, 'Waende an der Tresortuer und Waende ohne begehbaren Boden gegenueber sind tabu');
      t.ok(r.tgt && r.item, 'Ziel und E-Objekt an der Wand neben dem Spieler: ' + JSON.stringify(r));
      t.eq(r.near, [0, 0], 'das Objekt sitzt auf der Wandkachel');
      t.eq([r.c4, r.p1], [1, 1], 'ein Stueck, Erkunden');
      t.eq(r.after, ['.', 0, 2, 1, true], 'Wand ist Boden, Stueck weg, Alarm im Erkunden, Schutt gemerkt, statische Ebene geaendert');
      t.ok(/spreng/i.test(r.msg), 'Meldung: ' + r.msg);
      t.eq([r.noMore, r.pass, r.noOne], [false, true, true], 'ohne Vorrat kein Objekt mehr, Durchgang frei, Kachel nicht mehr sprengbar');
      t.eq(r.reset, ['#', 0], 'reset stellt die Wand wieder her');
    },
  },
  {
    name: 'C4 an der Hintertuer: c4d oeffnet die verschlossene Tuer (L zu l), laut, Vorrat weg, ohne Vorrat nicht nutzbar',
    async run(t) {
      const r = await t.page.evaluate(`(() => { const H = ${HELP}, D = H.D, o = {};
        const b = H.bank({ U4: 1 }, true), g = D.get(), me = b.me, L = D.LAY(), sp = L.spots.find(s => s.lk); o.has = !!sp;
        const it = g.its.find(i => i.t === 'c4d'); me.x = sp.x; me.y = sp.y; o.ok = [it.ok(me), (me.c4 = 0, it.ok(me))]; me.c4 = 1;
        o.before = sp.cells.map(c => D.world().cell(c[0], c[1])).join(''); it.act(me);
        o.after = sp.cells.map(c => D.world().cell(c[0], c[1])).join(''); o.st = [me.c4, D.get().phase, it.ok(me)]; return o; })()`);
      t.ok(r.has, 'die Karte hat eine verschlossene Personaltuer');
      t.eq(r.ok, [true, false], 'mit Vorrat nutzbar, ohne nicht');
      t.ok(/^L+$/.test(r.before) && /^l+$/.test(r.after), 'L wird l: ' + r.before + ' > ' + r.after);
      t.eq(r.st, [0, 2, false], 'Stueck weg, Alarm, danach nicht mehr nutzbar');
    },
  },
  {
    name: 'C4 im Gefaengnis: c4g an jedem Gitter und jeder Zellentuer, oeffnet ueber prisonOpen (Bitmaske im Netz), Client-Raster gleich dem des Hosts',
    timeout: 120000,
    async run(t) {
      await t.loadTool('loopnet.js'); await t.loadInpage('coop.js');
      const r = await t.page.evaluate(`(() => { const o = {};
        const G = CT.mkGame('prison', 5, 2, 60, 20), A = G.A, B = G.clients[0];
        const both = sec => { for (let i = 0; i < Math.round(sec * 60); i++) { A.get().players.forEach(p => { p.hp = 1e9; p.dead = false; }); step(G.insts, G.net, 1 / 60); } };
        const R = A.LAY().prison, its = A.get().its.filter(i => i.t === 'c4g'); o.n = [its.length, R.locks.length];
        const mk = A.get().players[0]; mk.c4 = 3; const lk = R.locks.find(l => l.id === 'gi') || R.locks[0], it = its[R.locks.indexOf(lk)];
        const cells = l => l.cells.map(c => A.world().cell(c[0], c[1])).join(''), cellsB = l => l.cells.map(c => B.world().cell(c[0], c[1])).join('');
        o.before = [cells(lk), cellsB(lk)]; o.ok = it.ok(mk); it.act(mk); both(1.5);
        o.after = [cells(lk), cellsB(lk)]; o.stock = mk.c4; o.ok2 = it.ok(mk);
        o.same = A.world().M.join('\\n') === B.world().M.join('\\n');
        return o; })()`);
      t.eq(r.n[0], r.n[1], 'ein c4g je Verriegelung');
      t.eq(r.before[0], r.before[1], 'vorher gleich');
      t.ok(/^L+$/.test(r.before[0]) && r.ok, 'vorher zu, nutzbar');
      t.ok(/^l+$/.test(r.after[0]) && /^l+$/.test(r.after[1]), 'danach offen bei Host und Client: ' + r.after.join(' / '));
      t.eq([r.stock, r.ok2, r.same], [2, false, true], 'Stueck weg, nicht mehr nutzbar, Raster gleich');
    },
  },
  {
    name: 'C4 an der Wand im Coop: der Client sieht die gesprengte Wand als Boden (Raster gleich, Schutt gemerkt), beide haben gleich viele Wand-Objekte (gleiche E-Indizes)',
    timeout: 120000,
    async run(t) {
      await t.loadTool('loopnet.js'); await t.loadInpage('coop.js');
      const r = await t.page.evaluate(`(() => { const o = {};
        const G = CT.mkGame('bank', 5, 2, 60, 20, null, 'S'), A = G.A, B = G.clients[0];
        const both = sec => { for (let i = 0; i < Math.round(sec * 60); i++) { A.get().players.forEach(p => { p.hp = 1e9; p.dead = false; }); step(G.insts, G.net, 1 / 60); } };
        const L = A.LAY(), B0 = L.bld; let w = null;
        for (let y = B0.y0; y <= B0.y1 && !w; y++) for (let x = B0.x0; x <= B0.x1 && !w; x++) if (A.wallOk(x, y)) w = [x, y];
        const me = A.get().players[0]; me.c4 = 1; me.x = (w[0] + .5) * 32; me.y = (w[1] + .5) * 32 + 20; both(.5);
        const nm = (I) => I.itsAll().filter(i => i.t === 'c4w').length; o.items = [nm(A), nm(B)];
        const mi = A.itsAll().find(i => i.t === 'c4w' && i.ok(me)); o.can = !!mi; mi.act(me); both(1.5);
        o.cell = [A.world().cell(w[0], w[1]), B.world().cell(w[0], w[1])]; o.same = A.world().M.join('\\n') === B.world().M.join('\\n'); o.rub = [A.rub().length, B.rub().length];
        B.draw();
        return o; })()`);
      t.ok(r.can, 'E-Objekt an der Wand');
      t.eq(r.cell, ['.', '.'], 'Wand ist bei Host und Client Boden');
      t.eq([r.same, r.rub], [true, [1, 1]], 'Raster gleich, Schutt bei beiden gemerkt');
      t.eq(r.items[0], r.items[1], 'gleich viele Wand-Objekte');
    },
  },
];
