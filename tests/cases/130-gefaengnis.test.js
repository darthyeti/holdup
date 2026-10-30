// Gefaengnisausbruch (Issue 45, docs/szenarien.md, Abschnitt Gefaengnis): siebtes Szenario `prison`, handgebaute Anlage ohne Generator. Ausloeser im Coop: Sieg mit einem Zurueckgebliebenen, dann ist der naechste Auftrag der Ausbruch.
// Der Gefangene (PZ) startet in der Zelle ohne Pistole und Tasche, die anderen draussen. Der Schalter im Kontrollraum oeffnet die Zellentrakt-Tuer, das Aussentor (Tresortuer) hat nur von aussen E und C4, danach ist Alarm.
// Sieg nur, wenn der Gefangene im Wagen ist, dann feste Belohnung CFG.prison.reward. Coop ueber die Test-Leitung: Host und Client sehen dieselbe Welt.
const fs = require('fs');
const path = require('path');
// Regeln, die validateMap fuer die Anlage meldet und die bewusst so bleiben: es gibt nur das Tor (kein Aussen-Eingang, keine Vordertuer, keine Beute-Stuecke, kein Weg Tresor zu Ausgang)
const KNOWN = ['eingaenge', 'vordertuer', 'beute-ziel'];

// Zwei Spieler im Gefaengnis, Host A ist Spieler 0 (draussen), der Client B der Gefangene (Spieler 1)
const HELP = `(() => {
  const G = CT.mkGame('prison', 5, 2, 60, 20), A = G.A, B = G.clients[0], T = 32;
  const both = (sec, f) => { for (let i = 0; i < Math.round(sec * 60); i++) { A.get().players.forEach(p => { p.hp = 1e9; p.dead = false; }); if (f) f(i); step(G.insts, G.net, 1 / 60); } };
  const cl = (D, x, y) => D.world().M[y + 6][x + 6];   // die Anlage liegt in der Welt ab (-6,-6)
  const items = (D, t) => D.get().its.filter(i => i.t === t);
  return { G, A, B, T, both, items, cl };
})()`;

module.exports = [
  {
    name: 'Gefaengnis: die Karte besteht validateMap bis auf die bekannten Abweichungen, hat 4 Zellen, 3 Waerter, 3 Kameras, ein Tor, und gleicht sich bei gleichem Seed; prison steht in MAP_FIELDS und in der Doku',
    async run(t) {
      const r = await t.page.evaluate(() => {
        const D = __dbg, o = {}; D.setScenario('prison'); D.setSeedMode('random'); D.setLage([]);
        const a = D.layoutBase(5), b = D.layoutBase(5), c = D.layoutBase(6); const v = D.validateMap(a);
        o.err = v.err.map(e => e.r); o.sc = D.layoutFor(5).prison ? 'prison' : '?'; o.n = [a.prison.cells.length, a.guards.length, a.cams.length, a.tills.length, a.vault.bundles.length];
        const sig = l => JSON.stringify([l.guards, l.cams.map(x => [x.x, x.y]), l.theme.tod]);
        o.det = sig(a) === sig(b); o.vary = sig(a) !== sig(c);
        o.names = D.MAP_FIELDS.map(f => f[0]); D.buildLay(a); const cl = (x, y) => D.world().M[y + 6][x + 6]; o.gate = [cl(25, 5), cl(25, 6)]; o.doors = [cl(12, 4), cl(12, 5)];
        return o;
      });
      const bad = r.err.filter(x => !KNOWN.includes(x));
      t.eq(bad, [], 'validateMap: nur bekannte Abweichungen (' + KNOWN.join(', ') + '), gemeldet: ' + r.err.join(', '));
      t.eq(r.sc, 'prison', 'layoutFor liefert die Gefaengnis-Karte');
      t.eq(r.n, [4, 3, 3, 0, 0], 'vier Zellen, drei Waerter, drei Kameras, keine Kassen, keine Beutebuendel');
      t.ok(r.det && r.vary, 'gleicher Seed gleiche Anlage, anderer Seed andere Waerterrouten oder Kameras');
      t.eq([r.gate, r.doors], [['V', 'V'], ['L', 'L']], 'Tor (V) und Zellentrakt-Tuer (L) stehen');
      t.ok(r.names.includes('prison'), 'MAP_FIELDS kennt prison');
      const doc = fs.readFileSync(path.join(__dirname, '..', '..', 'docs', 'szenarien.md'), 'utf8');
      t.ok(/## Gefängnis/.test(doc), 'die Doku hat den Abschnitt Gefaengnis');
    },
  },
  {
    name: 'Gefaengnis: Ausloeser nur im Coop. Sieg mit einem Zurueckgebliebenen setzt ihn als Gefangenen, der naechste Auftrag ist der Ausbruch (auf Host und Client gleich), solo gibt es das nicht, ein Ausbruch-Sieg loest keinen neuen aus',
    timeout: 120000,
    async run(t) {
      await t.loadTool('loopnet.js'); await t.loadInpage('coop.js');
      const r = await t.page.evaluate(`(() => {
        const o = {}, G = CT.mkGame('bank', 5, 2, 60, 20), A = G.A, B = G.clients[0];
        A.get().players[0].out = true; A.finish(true, 'Test', 'x'); G.run(1);
        o.pz = [A.SESSION.pz, B.SESSION.pz]; o.msg = A.get().ended && A.get().ended.lines.some(l => /sitzt im Gefängnis/.test(l));
        A.startNext(); G.run(2.5);
        o.next = [A.sc(), B.sc()]; o.pzNow = [A.getPz(), B.getPz()]; const nop = d => { const s = CT.sig(d); s.its = s.its.filter(x => !/^pist/.test(x)); return s; }; o.map = CT.diff(nop(A), nop(B));
        o.pos = A.get().players.map(p => [Math.round(p.x / 32), Math.round(p.y / 32)]);
        // Ausbruch gewonnen: kein neuer Gefangener
        const pl = A.get().players; pl.forEach(p => { p.out = true; }); A.finish(true, 'Ausbruch', 'x'); G.run(1); o.after = A.SESSION.pz;
        // solo: kein Ausloeser
        const D = __dbg; D.sessReset(); D.setScenario('bank'); D.setSeedMode('random'); D.buildSeed(5017); D.reset(); D.finish(true, 'Test', 'x'); o.solo = D.SESSION.pz;
        return o; })()`);
      t.eq(r.pz, [1, 1], 'Spieler 1 (der Client) blieb zurueck und sitzt ein, auf Host und Client');
      t.ok(r.msg, 'das Ergebnis nennt es');
      t.eq(r.next, ['prison', 'prison'], 'der naechste Auftrag ist der Gefaengnisausbruch');
      t.eq(r.pzNow, [1, 1], 'Host und Client kennen den Gefangenen (Nachricht go oder rst)');
      t.eq(r.map, [], 'Karte, Items und Welt sind auf Host und Client gleich');
      t.ok(r.pos[1][0] <= 3 && r.pos[1][1] <= 3, 'der Gefangene steht in seiner Zelle: ' + JSON.stringify(r.pos));
      t.ok(r.pos[0][0] > 26, 'der andere steht draussen vor der Mauer: ' + JSON.stringify(r.pos));
      t.eq(r.after, -1, 'nach einem gelungenen Ausbruch ist niemand mehr gefangen');
      t.eq(r.solo, -1, 'solo gibt es den Ausloeser nicht');
    },
  },
  {
    name: 'Gefaengnis: Aufbau (Gefangener ohne Pistole, Tasche und Munition, Phase 1), der Schalter oeffnet die Zellentrakt-Tuer auf Host und Client, das Tor geht nur von aussen mit E und loest Alarm aus, der Gefangene darf F nicht',
    timeout: 120000,
    async run(t) {
      await t.loadTool('loopnet.js'); await t.loadInpage('coop.js');
      const r = await t.page.evaluate(`(() => {
        const H = ${HELP}, A = H.A, B = H.B, o = {}, p0 = A.get().players[0], p1 = A.get().players[1];
        o.start = [p1.bag, p1.mag, p1.res, p0.mag > 0, A.get().phase, A.getPz()];
        // F des Gefangenen (Client) startet nichts
        B.cv.dispatchEvent(new KeyboardEvent('keydown', { key: 'f', bubbles: true })); H.both(1); o.f = [A.get().phase, B.get().phase];
        // Schalter: im Kontrollraum
        const sw = H.items(A, 'psw')[0]; o.swOk = [sw.ok(p1), sw.done]; o.doorBefore = [H.cl(A, 12, 4), H.cl(B, 12, 4)];
        p1.x = sw.x; p1.y = sw.y; B.keys.e = 1; H.both(CFG_T(A) + 1.5, () => { p1.x = sw.x; p1.y = sw.y; p1.vx = p1.vy = 0; }); B.keys.e = 0; H.both(1);
        o.doorAfter = [H.cl(A, 12, 4), H.cl(A, 12, 5), H.cl(B, 12, 4), H.cl(B, 12, 5)]; o.swDone = [items(A), items(B)].map(a => a[0].done);
        function items(D) { return H.items(D, 'psw'); }
        // Tor: von innen (Gefangener) nicht, von aussen ja
        const gate = H.items(A, 'vault')[0]; p1.x = 24 * 32; p1.y = 5.5 * 32; p0.x = 27 * 32; p0.y = 5.5 * 32;
        o.gate = [gate.ok(p1), gate.ok(p0), A.get().vaultOpen];
        gate.act(p0); H.both(1); o.open = [A.get().vaultOpen, B.get().vaultOpen, A.get().phase, B.get().phase, H.cl(A, 25, 5), A.isSol(25, 5)];
        return o;
        function CFG_T(D) { return D.CFG.prison.swT; } })()`);
      t.eq(r.start, [0, 0, 0, true, 1, 1], 'Gefangener: Tasche 0, Magazin 0, Reserve 0, die anderen bewaffnet, Phase 1, Gefangener ist Spieler 1');
      t.eq(r.f, [1, 1], 'F des Gefangenen startet keinen Ueberfall (keine Pistole)');
      t.eq(r.swOk, [true, false], 'der Schalter ist nutzbar');
      t.eq(r.doorBefore, ['L', 'L'], 'die Tuer ist zu');
      t.eq(r.doorAfter, ['l', 'l', 'l', 'l'], 'Schalter mit E gehalten: beide Tuerkacheln offen, auf Host und Client');
      t.eq(r.swDone, [true, true], 'der Schalter ist auf beiden erledigt');
      t.eq(r.gate, [false, true, false], 'das Tor geht von innen nicht (Coop), von aussen ja');
      t.eq(r.open.slice(0, 4), [true, true, 2, 2], 'Tor offen und Alarm, auf Host und Client');
      t.eq(r.open[5], false, 'das Tor ist nicht mehr fest');
    },
  },
  {
    name: 'Gefaengnis: C4 oeffnet das Tor von aussen und loest Alarm aus, der Gefangene hebt nach dem Ausschalten einer Wache deren Pistole auf und ist dann bewaffnet',
    timeout: 120000,
    async run(t) {
      await t.loadTool('loopnet.js'); await t.loadInpage('coop.js');
      const r = await t.page.evaluate(`(() => {
        const H = ${HELP}, A = H.A, o = {}, p0 = A.get().players[0], p1 = A.get().players[1];
        const c4 = H.items(A, 'c4')[0]; p0.c4 = 1; p0.x = 27 * 32; p0.y = 5.5 * 32; p1.c4 = 1; p1.x = 24 * 32; p1.y = 5.5 * 32;
        o.c4ok = [c4.ok(p0), c4.ok(p1)]; c4.act(p0); H.both(1); o.c4 = [A.get().vaultOpen, A.get().phase, A.msgs().feed.join(' | ')];
        return o; })()`);
      t.eq(r.c4ok, [true, false], 'C4 nur von aussen');
      t.eq(r.c4.slice(0, 2), [true, 2], 'Tor gesprengt, Alarm');
      t.ok(/das Tor/.test(r.c4[2]) && !/Beutest/.test(r.c4[2]), 'Meldung nennt das Tor, kein Beutever lust: ' + r.c4[2]);
      const p = await t.page.evaluate(`(() => {
        const H = ${HELP}, A = H.A, o = {}, p1 = A.get().players[1];
        const pist = H.items(A, 'pist'); o.n = pist.length; const gd = A.get().npcs.filter(n => n.k === 'grd' && n.st !== 'away')[0];
        o.before = pist[0].ok(p1); gd.st = 'ko'; gd.kt = 30; o.ko = pist.map(i => i.ok(p1)); const wp = p1.wp;
        pist[0].act(p1); o.after = [p1.mag === wp.mag && p1.mag > 0, p1.res === wp.res, pist[0].done, pist[0].ok(p1)];
        const p0 = A.get().players[0]; o.other = pist[1].ok(p0);
        return o; })()`);
      t.eq(p.n, 3, 'je Waerter eine Pistole (Objekt)');
      t.eq([p.before, p.ko[0]], [false, true], 'erst nach dem Ausschalten der Wache aufhebbar');
      t.eq(p.after, [true, true, true, false], 'danach hat der Gefangene Magazin und Reserve, die Pistole ist weg');
      t.eq(p.other, false, 'nur der Gefangene ohne Waffe hebt auf');
    },
  },
  {
    name: 'Gefaengnis: Sieg erst, wenn der Gefangene im Wagen ist (feste Belohnung CFG.prison.reward), ein Entkommener ohne den Gefangenen ist eine Niederlage',
    timeout: 240000,
    async run(t) {
      await t.loadTool('loopnet.js'); await t.loadInpage('coop.js');
      const run = (win) => t.page.evaluate(`(() => {
        const H = ${HELP}, A = H.A, B = H.B, o = {}, T = 32;
        const p0 = A.get().players[0], p1 = A.get().players[1];
        H.items(A, 'psw')[0].act(p1); H.items(A, 'vault')[0].act(p0);
        Object.assign(A.CFG.van, { bt: 0, bu: 0, r: 0 }); A.CFG.vanCall = 1; A.CFG.vanLock = 0; A.callVan();
        const ln = A.LANE(), cells = ln.exit.cells, cA = cells[0], cB = cells[cells.length - 1]; let arrived = null;
        const WIN = ${win};
        H.both(90, i => { const g = A.get(); if (g.ended) return;
          if (g.vanArr && Math.abs(g.vanX - ln.van.stop) <= 2) { if (arrived == null) arrived = i / 60;
            const go = (p, c) => { if (p.out) return; p.x = c[0] * T + 16; p.y = c[1] * T + 16; p.vx = p.vy = 0; };
            go(p0, cA); if (WIN) go(p1, cB); else p1.dead = true; } });
        H.both(3); const ea = A.get().ended, eb = B.get().ended;
        o.arrived = arrived != null; o.a = ea && [ea.win, ea.title, ea.lines.join(' | ')]; o.b = eb && [eb.win, eb.title]; o.secured = A.get().secured; o.reward = A.CFG.prison.reward; return o; })()`);
      const w = await run(true);
      t.ok(w.arrived, 'der Fluchtwagen kommt');
      t.eq(w.a && w.a[0], true, 'Host: Sieg wenn beide im Wagen: ' + JSON.stringify(w.a));
      t.eq(w.b && w.b[0], true, 'Client: Sieg');
      t.eq(w.a && w.a[1], 'Ausbruch gelungen', 'Titel Ausbruch gelungen');
      t.eq(w.secured, w.reward, 'die Belohnung ist die feste Summe, keine Beute');
      const l = await run(false);
      t.ok(l.arrived, 'der Fluchtwagen kommt (Niederlage)');
      t.eq(l.a && l.a[0], false, 'Niederlage, wenn der Gefangene nicht im Wagen ist: ' + JSON.stringify(l.a));
      t.eq(l.b && l.b[0], false, 'Client: Niederlage');
    },
  },
];
