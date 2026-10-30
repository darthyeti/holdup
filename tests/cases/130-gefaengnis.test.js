// Gefaengnisausbruch (Issue 45 und 49, docs/szenarien.md, Abschnitt Gefaengnis): siebtes Szenario `prison`, handgebaute Anlage mit Varianten aus dem Seed, kein Generator. Ausloeser im Coop: Sieg mit einem Zurueckgebliebenen, dann ist der naechste Auftrag der Ausbruch.
// Der Gefangene (PZ) startet in seiner Zelle ohne Pistole und Tasche, die anderen draussen. Verriegelt sind (LAY.prison.locks): die Zellentuer z (von innen aufhebeln oder Schalter), die uebrigen Zellentueren zi (Schalter), das Gitter I gi (nur von innen, Schluesselkarte der Trakt-Wache) und das Gitter II gii (nur von aussen, Schalter in Wachstube oder Kontrollraum).
// Das Aussentor (Tresortuer) hat nur von aussen E und C4, danach ist Alarm. Sieg nur, wenn der Gefangene im Wagen ist (feste Belohnung CFG.prison.reward), lautlos ueber den Abholpunkt hinter der Serviceluke der Kueche. Coop ueber die Test-Leitung: Host und Client sehen dieselbe Welt.
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
  const lock = (D, id) => D.LAY().prison.locks.find(l => l.id === id);
  const lst = (D, id) => lock(D, id).cells.map(c => cl(D, c[0], c[1])).join('');
  const sw = (D, id) => items(D, 'lsw').find(i => D.LAY().prison.sws[i.k].opens.includes(id));
  return { G, A, B, T, both, cl, items, lock, lst, sw };
})()`;

// Breitensuche und Loeser fuer eine fertig gebaute Anlage (Seite mit #debug): Raster aus D.world().M, Schloesser aus LAY.prison.locks. Wird als Text in die Seite gegeben.
const SOLVE = `(() => {
  const D = __dbg, T = 32, SOL = '#WCPpbAremkqfLvXwYu';
  const make = () => {
    const M = D.world().M, R = D.LAY().prison, L = D.LAY(), c = (x, y) => (M[y + 6] || '')[x + 6];
    const lk = {}; R.locks.forEach(l => l.cells.forEach(q => { lk[q[0] + ',' + q[1]] = l.id; }));
    const dlc = {}; R.dl.cells.forEach(q => { dlc[q[0] + ',' + q[1]] = 1; });
    const bfs = (from, st, ex) => {
      const pass = (x, y) => { const k = c(x, y); if (k === undefined) return false; if (ex && ex(x, y)) return false;
        if (k === 'V') return !!st.tor; if (k === 'L') return dlc[x + ',' + y] ? !!st.dl : lk[x + ',' + y] ? st.open.has(lk[x + ',' + y]) : false; return !SOL.includes(k); };
      const seen = new Map([[from.join(), 0]]), q = [from];
      if (!pass(from[0], from[1])) return seen;
      for (let h = 0; h < q.length; h++) { const p = q[h]; for (const d of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const n = [p[0] + d[0], p[1] + d[1]]; if (seen.has(n.join()) || !pass(n[0], n[1])) continue; seen.set(n.join(), seen.get(p.join()) + 1); q.push(n); } }
      return seen;
    };
    const tl = v => Math.floor(v / T), spawn = [tl(L.spawn.x), tl(L.spawn.y)], pz = [tl(R.cell[0]), tl(R.cell[1])];
    return { M, R, L, c, bfs, spawn, pz };
  };
  // Loeser: laut (Tor) oder still (Abholpunkt). Die Schloesser oeffnen sich der Reihe nach, wenn ein Bediener sie erreicht (pz: der Gefangene, team: die Mitspieler), die Karte nur, wenn die Route der Trakt-Wache erreichbar ist. Das Tor oeffnet das Team von aussen, die Serviceluke geht in beiden Faellen (Lieferung oder von innen).
  const solve = (G, mode, mut) => {
    const R = mut ? mut(JSON.parse(JSON.stringify(G.R))) : G.R, st = { open: new Set(), tor: false, dl: true };
    const GXe = R.gate[0], er = R.gate[1]; let reg = null, regT = null, card = false, ch = true;
    while (ch) { ch = false; regT = G.bfs(G.spawn, st); reg = G.bfs(G.pz, st);
      card = (G.L.guards[R.card.g].route || []).some(q => reg.has(q.join()));
      for (const l of R.locks) { if (st.open.has(l.id)) continue;
        if (l.ops.some(o => (o.who === 'pz' ? reg : regT).has(o.at.join()) && (o.k !== 'card' || card) && (!o.alarm || (mode === 'laut' && st.tor)))) { st.open.add(l.id); ch = true; } }
      if (mode === 'laut' && !st.tor && regT.has([GXe + 1, er].join())) { st.tor = true; ch = true; } }
    const all = R.locks.every(l => st.open.has(l.id)), exit = mode === 'laut' ? st.tor && reg.has([GXe - 1, er].join()) : reg.has(R.pick.join());
    return { all, exit, open: [...st.open], card };
  };
  // Innen/aussen-Regel der Gitter: Bei jedem Gitter mit allen anderen Schloessern offen darf ein Bediener des Gefangenen nur von innen erreichbar sein (nicht fuer das Team), ein Bediener des Teams nur von aussen (nicht fuer den Gefangenen).
  const rules = (G, mut) => {
    const R = mut ? mut(JSON.parse(JSON.stringify(G.R))) : G.R, bad = []; let nIn = 0, nOut = 0;
    for (const l of R.locks.filter(l => l.kind === 'grille')) {
      const st = { open: new Set(R.locks.filter(m => m.id !== l.id).map(m => m.id)), tor: true, dl: true }, rp = G.bfs(G.pz, st), rt = G.bfs(G.spawn, st);
      for (const o of l.ops) { const k = o.at.join(), inside = rp.has(k) && !rt.has(k), outside = rt.has(k) && !rp.has(k);
        if (o.who === 'pz' && !inside) bad.push(l.id + ': Bediener des Gefangenen nicht nur von innen erreichbar');
        if (o.who === 'team' && !outside) bad.push(l.id + ': Bediener des Teams nicht nur von aussen erreichbar'); }
      if (l.ops.length && l.ops.every(o => o.who === 'pz')) nIn++; if (l.ops.length && l.ops.every(o => o.who === 'team')) nOut++;
    }
    return { bad, nIn, nOut };
  };
  // Kontrollraum nie direkt: Spawn (auch ueber das Tor) und Serviceluke aussen erreichen ihn nur durch die Wachstube, und entlang der stillen Route (nur ueber die Serviceluke) ist jeder Raum Pflicht (Kueche, Waescherei, Kantine, Flur, Wachstube).
  const direct = G => {
    const R = G.R, rm = R.rooms, inR = (r, x, y) => x >= r[0] && x <= r[2] && y >= r[1] && y <= r[3], st = { open: new Set(R.locks.map(l => l.id)), tor: false, dl: true }, stT = Object.assign({}, st, { tor: true });
    const dl = [R.dl.cells[0][0], R.dl.cells[0][1] + 1], kon = [rm.kon[0] + 1, rm.kon[1] + 3], out = {};
    out.reachAll = G.bfs(dl, st).has(kon.join());
    for (const k of ['kue', 'wasch', 'kan', 'flur', 'wach']) out[k] = G.bfs(dl, st, (x, y) => inR(rm[k], x, y)).has(kon.join());
    out.noWach = G.bfs(G.spawn, stT, (x, y) => inR(rm.wach, x, y)).has(kon.join());
    out.len = G.bfs(dl, st).get(kon.join());
    return out;
  };
  return { make, solve, rules, direct };
})()`;

module.exports = [
  {
    name: 'Gefaengnis: die Karte besteht validateMap bis auf die bekannten Abweichungen, hat 16 Zellen (8 je Trakt), 7 Waerter, 6 Kameras, ein Tor, mindestens dreimal so viel begehbare Flaeche wie v1 (200 Kacheln), und gleicht sich bei gleichem Seed; prison steht in MAP_FIELDS und in der Doku',
    async run(t) {
      const r = await t.page.evaluate(() => {
        const D = __dbg, o = {}; D.setScenario('prison'); D.setSeedMode('random'); D.setLage([]);
        const a = D.layoutBase(5), b = D.layoutBase(5), c = D.layoutBase(6); const v = D.validateMap(a);
        o.err = v.err.map(e => e.r); o.sc = D.layoutFor(5).prison ? 'prison' : '?'; o.n = [a.prison.cells.length, a.guards.length, a.cams.length, a.tills.length, a.vault.bundles.length];
        const sig = l => JSON.stringify([l.guards, l.cams.map(x => [x.x, x.y]), l.theme.tod, l.prison.tb, l.prison.pc, l.prison.sx, l.prison.dl.at]);
        o.det = sig(a) === sig(b); o.vary = sig(a) !== sig(c);
        o.names = D.MAP_FIELDS.map(f => f[0]); D.buildLay(a); const M = D.world().M, cl = (x, y) => M[y + 6][x + 6]; o.gate = [cl(49, 6), cl(49, 7)];
        let walk = 0; for (let y = 0; y <= 23; y++) for (let x = 0; x <= 49; x++) if (!'#WCPpbAremkqfLvXwYuV'.includes(cl(x, y))) walk++; o.walk = walk;
        o.locked = a.prison.locks.map(l => l.id + ':' + l.cells.map(q => cl(q[0], q[1])).join(''));
        o.nl = M.join('').split('').filter(ch => ch === 'L').length;
        return o;
      });
      const bad = r.err.filter(x => !KNOWN.includes(x));
      t.eq(bad, [], 'validateMap: nur bekannte Abweichungen (' + KNOWN.join(', ') + '), gemeldet: ' + r.err.join(', '));
      t.eq(r.sc, 'prison', 'layoutFor liefert die Gefaengnis-Karte');
      t.eq(r.n, [16, 7, 6, 0, 0], '16 Zellen, sieben Waerter, sechs Kameras, keine Kassen, keine Beutebuendel');
      t.ok(r.det && r.vary, 'gleicher Seed gleiche Anlage, anderer Seed andere Variante');
      t.eq(r.gate, ['V', 'V'], 'Tor (V) steht');
      t.ok(r.walk >= 3 * 200, 'begehbare Flaeche mindestens das Dreifache von v1 (200): ' + r.walk);
      t.ok(r.locked.every(s => /^[a-z]+:L+$/.test(s)), 'alle verriegelten Stellen sind zu: ' + r.locked.join(' '));
      t.ok(r.names.includes('prison'), 'MAP_FIELDS kennt prison');
      const doc = fs.readFileSync(path.join(__dirname, '..', '..', 'docs', 'szenarien.md'), 'utf8');
      t.ok(/## Gefängnis/.test(doc), 'die Doku hat den Abschnitt Gefaengnis');
    },
  },
  {
    name: 'Gefaengnis: jede verriegelte Stelle ist erreichbar und loesbar, laut und lautlos, fuer 40 Seeds; die Varianten (Trakt, Zelle, Schalter) kommen alle vor',
    timeout: 180000,
    async run(t) {
      const r = await t.page.evaluate(`(() => {
        const D = __dbg, S = ${SOLVE}, o = { fails: [], combos: new Set(), tb: new Set(), sx: new Set(), pcs: new Set(), ats: new Set() }; D.setScenario('prison'); D.setSeedMode('random'); D.setLage([]);
        for (let sd = 1; sd <= 40; sd++) { D.buildLay(D.layoutBase(sd)); const G = S.make(), R = G.R;
          const laut = S.solve(G, 'laut'), still = S.solve(G, 'still');
          if (!laut.all || !laut.exit) o.fails.push(sd + ' laut ' + JSON.stringify(laut));
          if (!still.all || !still.exit) o.fails.push(sd + ' still ' + JSON.stringify(still));
          if (!laut.card) o.fails.push(sd + ' Karte nicht erreichbar');
          // ohne Bediener keine Loesung: jedes Schloss braucht einen Bediener (mindestens einen)
          if (R.locks.some(l => !l.ops.length)) o.fails.push(sd + ' Schloss ohne Bediener');
          o.combos.add(R.tb + '/' + R.pc + '/' + R.sx); o.tb.add(R.tb); o.sx.add(R.sx); o.pcs.add(R.pc); o.ats.add(R.dl.at); }
        return { fails: o.fails, combos: o.combos.size, tb: o.tb.size, sx: o.sx.size, pcs: o.pcs.size, ats: o.ats.size }; })()`);
      t.eq(r.fails, [], 'alle Seeds loesbar');
      t.eq([r.tb, r.sx, r.pcs], [2, 2, 8], 'beide Trakte, beide Schalterbelegungen und alle acht Zellen kommen in 40 Seeds vor');
      t.ok(r.combos >= 20, 'viele verschiedene Kombinationen aus Trakt, Zelle und Schalter: ' + r.combos);
      t.ok(r.ats >= 10, 'die Lieferzeit streut: ' + r.ats);
    },
  },
  {
    name: 'Gefaengnis: Gitter-Regel (mindestens ein Gitter nur von innen, eines nur von aussen), der Kontrollraum ist nie direkt erreichbar (nur ueber Wachstube, die stille Route fuehrt durch Kueche, Waescherei, Kantine, Flur und Wachstube), Mutanten werden erkannt',
    timeout: 180000,
    async run(t) {
      const r = await t.page.evaluate(`(() => {
        const D = __dbg, S = ${SOLVE}, o = { bad: [], dir: [], mut: {} }; D.setScenario('prison'); D.setSeedMode('random'); D.setLage([]);
        for (let sd = 1; sd <= 12; sd++) { D.buildLay(D.layoutBase(sd)); const G = S.make(), q = S.rules(G), d = S.direct(G);
          if (q.bad.length || q.nIn < 1 || q.nOut < 1) o.bad.push(sd + ' ' + JSON.stringify(q));
          if (!d.reachAll || d.noWach || d.kue || d.wasch || d.kan || d.flur || d.wach || d.len < 45) o.dir.push(sd + ' ' + JSON.stringify(d)); }
        D.buildLay(D.layoutBase(5)); const G = S.make();
        // Mutanten: jede Verletzung der Regeln muss auffallen
        o.mut.noCard = S.solve(G, 'laut', R => { R.locks.find(l => l.id === 'gi').ops = []; return R; }).all;                          // Gitter I ohne Bediener: nicht loesbar
        const nc = (mode) => S.solve(G, mode, R => { const l = R.locks.find(l => l.id === 'gi'); l.ops = l.ops.filter(q => q.k !== 'card'); return R; });
        o.mut.noCardLaut = nc('laut').all; o.mut.noCardStill = nc('still').all;     // ohne Karte: laut ueber das Aufhebeln nach Alarm loesbar, lautlos nicht
        o.mut.noSwitch = S.solve(G, 'still', R => { R.locks.find(l => l.id === 'gii').ops = []; return R; }).all;                          // Gitter II ohne Bediener
        o.mut.readerOutside = S.rules(G, R => { const l = R.locks.find(l => l.id === 'gi'); l.ops[0].at = [14, 10]; return R; }).bad.length;     // Kartenleser auf der Gang-Seite: nicht nur von innen
        o.mut.switchInside = S.rules(G, R => { const l = R.locks.find(l => l.id === 'gii'); l.ops[0].at = [15, 18]; return R; }).bad.length; // Schalter fuer das Gitter II im Gang, vom Team nicht erreichbar
        o.mut.pzOutside = S.rules(G, R => { R.locks.find(l => l.id === 'gii').ops[0].who = 'pz'; return R; }).bad.length;                       // Gefangener am Schalter in der Kontrollraum-Seite
        o.mut.bothTeam = S.rules(G, R => { R.locks.find(l => l.id === 'gi').ops[0].who = 'team'; return R; });                          // Gitter I fuer das Team: keines mehr nur von innen
        o.mut.pzSwitch = S.solve(G, 'laut', R => { R.locks.find(l => l.id === 'gii').ops[0].who = 'pz'; return R; }).all;                // Gefangener darf Schalter: Schalter liegt aussen, nicht loesbar
        // ohne die Wachstube ist der Kontrollraum von der Serviceluke aus nicht zu erreichen
        const rm = G.R.rooms, kon = [rm.kon[0] + 1, rm.kon[1] + 3], dl = [G.R.dl.cells[0][0], G.R.dl.cells[0][1] + 1], st = { open: new Set(G.R.locks.map(l => l.id)), tor: false, dl: true };
        o.mut.noWachBlock = G.bfs(dl, st, (x, y) => x >= rm.wach[0] && x <= rm.wach[2] && y >= rm.wach[1] && y <= rm.wach[3]).has(kon.join());
        return o; })()`);
      t.eq(r.bad, [], 'Gitter-Regel in 12 Seeds erfuellt');
      t.eq(r.dir, [], 'Kontrollraum nie direkt, Route fuehrt durch alle Raeume, mindestens 45 Schritte');
      t.eq([r.mut.noCard, r.mut.noSwitch, r.mut.pzSwitch], [false, false, false], 'Mutanten: ohne Bediener oder mit falschem Bediener ist die Anlage nicht loesbar');
      t.eq([r.mut.noCardLaut, r.mut.noCardStill], [true, false], 'Mutant ohne Karte: laut loesbar (Aufhebeln nach Alarm), lautlos nicht');
      t.ok(r.mut.readerOutside > 0, 'Mutant: Kartenleser auf der Gang-Seite faellt auf');
      t.ok(r.mut.switchInside > 0, 'Mutant: Schalter fuer Gitter II im Gang faellt auf');
      t.ok(r.mut.pzOutside > 0, 'Mutant: Gefangener am Schalter ausserhalb faellt auf');
      t.ok(r.mut.bothTeam.nIn < 1, 'Mutant: Gitter I fuers Team, dann gibt es kein Gitter nur von innen mehr');
      t.eq(r.mut.noWachBlock, false, 'ohne die Wachstube kommt man nicht in den Kontrollraum');
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
        o.next = [A.sc(), B.sc()]; o.pzNow = [A.getPz(), B.getPz()]; const nop = d => { const s = CT.sig(d); s.its = s.its.filter(x => !/^(pist|crd)/.test(x)); return s; }; o.map = CT.diff(nop(A), nop(B));
        const R = A.LAY().prison; o.pos = A.get().players.map(p => [p.x, p.y]); o.cell = R.cell;
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
      t.ok(Math.hypot(r.pos[1][0] - r.cell[0], r.pos[1][1] - r.cell[1]) < 40, 'der Gefangene steht in seiner Zelle: ' + JSON.stringify([r.pos, r.cell]));
      t.ok(r.pos[0][0] > 50 * 32, 'der andere steht draussen vor der Mauer: ' + JSON.stringify(r.pos));
      t.eq(r.after, -1, 'nach einem gelungenen Ausbruch ist niemand mehr gefangen');
      t.eq(r.solo, -1, 'solo gibt es den Ausloeser nicht');
    },
  },
  {
    name: 'Gefaengnis: Aufbau (Gefangener ohne Pistole, Tasche und Munition, Phase 1), der Gefangene darf F nicht und die Mitspieler-Schalter nicht, die Schalter oeffnen ihre Stellen auf Host und Client (Zellentueren oder Gitter II), das Tor geht nur von aussen mit E und loest Alarm aus',
    timeout: 120000,
    async run(t) {
      await t.loadTool('loopnet.js'); await t.loadInpage('coop.js');
      const r = await t.page.evaluate(`(() => {
        const H = ${HELP}, A = H.A, B = H.B, o = {}, p0 = A.get().players[0], p1 = A.get().players[1], R = A.LAY().prison;
        o.start = [p1.bag, p1.mag, p1.res, p0.mag > 0, A.get().phase, A.getPz()];
        // F des Gefangenen (Client) startet nichts: als Taste und als rohe Nachricht (der Host prueft selbst)
        B.cv.dispatchEvent(new KeyboardEvent('keydown', { key: 'f', bubbles: true })); B.NET.conn.send({ t: 'f' }); H.both(1); o.f = [A.get().phase, B.get().phase];
        // Schalter: nur fuer die Mitspieler
        const sz = H.sw(A, 'zi'), sg = H.sw(A, 'gii'); o.sw = [sz.ok(p0), sz.ok(p1), sg.ok(p0), sg.ok(p1), sz.k !== sg.k];
        o.before = [H.lst(A, 'z'), H.lst(A, 'zi'), H.lst(A, 'gii'), H.lst(B, 'zi')];
        // Zellentuer-Schalter von Hand ueber E (Host): beide Instanzen sehen die Zellen offen
        p0.x = sz.x; p0.y = sz.y; A.keys.e = 1; H.both(A.CFG.prison.swT + 1.5, () => { p0.x = sz.x; p0.y = sz.y; p0.vx = p0.vy = 0; }); A.keys.e = 0; H.both(1);
        o.zi = [H.lst(A, 'z'), H.lst(A, 'zi'), H.lst(B, 'z'), H.lst(B, 'zi'), sz.done, H.items(B, 'lsw').find(i => B.LAY().prison.sws[i.k].opens.includes('zi')).done];
        o.gii0 = [H.lst(A, 'gii'), H.lst(B, 'gii')];
        sg.act(p0); H.both(1); o.gii = [H.lst(A, 'gii'), H.lst(B, 'gii'), A.get().phase];
        // Tor: von innen (Gefangener) nicht, von aussen ja
        const gate = H.items(A, 'vault')[0]; p1.x = 48 * 32; p1.y = 6.5 * 32; p0.x = 51 * 32; p0.y = 6.5 * 32;
        o.gate = [gate.ok(p1), gate.ok(p0), A.get().vaultOpen];
        gate.act(p0); H.both(1); o.open = [A.get().vaultOpen, B.get().vaultOpen, A.get().phase, B.get().phase, H.cl(A, 49, 6), A.isSol(49, 6)];
        return o; })()`);
      t.eq(r.start, [0, 0, 0, true, 1, 1], 'Gefangener: Tasche 0, Magazin 0, Reserve 0, die anderen bewaffnet, Phase 1, Gefangener ist Spieler 1');
      t.eq(r.f, [1, 1], 'F des Gefangenen startet keinen Ueberfall (keine Pistole)');
      t.eq(r.sw, [true, false, true, false, true], 'Schalter: Mitspieler ja, Gefangener nie; es sind zwei verschiedene Schalter');
      t.eq(r.before, ['L', 'LLLLLLL', 'LL', 'LLLLLLL'], 'vorher: alle Stellen zu');
      t.eq(r.zi, ['l', 'lllllll', 'l', 'lllllll', true, true], 'Schalter mit E gehalten: alle Zellentueren offen, auf Host und Client, Schalter erledigt');
      t.eq(r.gii0, ['LL', 'LL'], 'Gitter II bleibt zu, solange sein Schalter nicht benutzt ist');
      t.eq(r.gii, ['ll', 'll', 1], 'der andere Schalter oeffnet Gitter II, auf Host und Client, ohne Alarm');
      t.eq(r.gate, [false, true, false], 'das Tor geht von innen nicht (Coop), von aussen ja');
      t.eq(r.open.slice(0, 4), [true, true, 2, 2], 'Tor offen und Alarm, auf Host und Client');
      t.eq(r.open[5], false, 'das Tor ist nicht mehr fest');
    },
  },
  {
    name: 'Gefaengnis: Zellentuer aufhebeln (nur der Gefangene, von innen, dauert), Karte der Trakt-Wache (erst nach dem Ausschalten), Kartenleser (nur mit Karte, nur im Trakt), Gitter I auf Host und Client; Gitter II bedient der Gefangene nie',
    timeout: 120000,
    async run(t) {
      await t.loadTool('loopnet.js'); await t.loadInpage('coop.js');
      const r = await t.page.evaluate(`(() => {
        const H = ${HELP}, A = H.A, B = H.B, o = {}, p0 = A.get().players[0], p1 = A.get().players[1], R = A.LAY().prison, T = 32;
        const pry = H.items(A, 'pry')[0], crd = H.items(A, 'crd')[0], rdr = H.items(A, 'rdr')[0];
        o.n = [H.items(A, 'pry').length, H.items(A, 'crd').length, H.items(A, 'rdr').length, H.items(B, 'crd').length];
        // Zellentuer: Start in der Zelle, nur der Gefangene, dauert CFG.prison.pryT
        const dist = (it, p) => Math.hypot(it.x - p.x, it.y - p.y);
        o.pry = [pry.ok(p1), pry.ok(p0), dist(pry, p1) < pry.r, A.CFG.prison.pryT >= 10, pry.dur()];
        A.CFG.prison.pryT = 1.5; B.CFG.prison.pryT = 1.5; B.keys.e = 1; H.both(3, () => { p1.vx = p1.vy = 0; }); B.keys.e = 0; H.both(1);
        o.z = [H.lst(A, 'z'), H.lst(B, 'z'), H.lst(A, 'zi'), H.lst(A, 'gi')];
        // Karte: nur an der ausgeschalteten Wache, der Leser braucht sie
        const gd = A.get().npcs.filter(n => n.k === 'grd' && n.st !== 'away')[R.card.g]; o.cardGuardInTrakt = gd.y > (R.tb ? 15 : 1) * T && gd.y < (R.tb ? 23 : 9) * T && gd.x < 13 * T;
        p1.x = gd.x; p1.y = gd.y; o.cardBefore = [crd.ok(p1), crd.ok(p0)]; gd.st = 'ko'; gd.kt = 60; o.cardKo = [crd.ok(p1), crd.ok(p0)];
        o.rdrBefore = rdr.ok(p1); crd.act(p1); H.both(1); o.cardDone = [crd.done, H.items(B, 'crd')[0].done];
        o.rdrOk = [rdr.ok(p1), rdr.ok(p0)];
        // Leser nur im Trakt: ein Spieler im Gang (Ostseite des Gitters) ist weiter als der Radius
        const gc = R.locks.find(l => l.id === 'gi').cells[0]; o.gangFar = Math.hypot((gc[0] + 1.5) * T - rdr.x, (gc[1] + .5) * T - rdr.y) > rdr.r;
        // am Leser mit E gehalten
        p1.x = rdr.x; p1.y = rdr.y; A.CFG.prison.rdrT = 1; B.CFG.prison.rdrT = 1; B.keys.e = 1; H.both(2.5, () => { p1.x = rdr.x; p1.y = rdr.y; p1.vx = p1.vy = 0; }); B.keys.e = 0; H.both(1);
        o.gi = [H.lst(A, 'gi'), H.lst(B, 'gi'), A.get().phase];
        // Gitter II: Schalter nie fuer den Gefangenen
        const sg = H.sw(A, 'gii'); o.gii = [sg.ok(p1), H.lst(A, 'gii')];
        return o; })()`);
      t.eq(r.n, [1, 1, 1, 1], 'je ein Aufhebeln, eine Karte, ein Leser (auch auf dem Client)');
      t.eq(r.pry.slice(0, 3), [true, false, true], 'Aufhebeln: der Gefangene in der Zelle ja, die anderen nie');
      t.ok(r.pry[3] && r.pry[4] >= 10, 'Aufhebeln dauert lange (Dauer ' + r.pry[4] + ' s)');
      t.eq([r.z[0], r.z[1], r.z[2], r.z[3]], ['l', 'l', 'LLLLLLL', 'LL'], 'Zellentuer offen auf Host und Client, die anderen Zellen und das Gitter I bleiben zu');
      t.ok(r.cardGuardInTrakt, 'die Wache mit der Karte steht im Trakt des Gefangenen');
      t.eq(r.cardBefore, [false, false], 'Karte: vor dem Ausschalten nicht');
      t.eq(r.cardKo, [true, false], 'Karte: nach dem Ausschalten nur der Gefangene');
      t.eq(r.rdrBefore, false, 'der Leser geht ohne Karte nicht');
      t.eq(r.cardDone, [true, true], 'Karte genommen, auf Host und Client');
      t.eq(r.rdrOk, [true, false], 'der Leser geht mit Karte, nur fuer den Gefangenen');
      t.ok(r.gangFar, 'vom Gang aus ist der Leser ausser Reichweite (nur von innen)');
      t.eq(r.gi, ['ll', 'll', 1], 'Gitter I offen auf Host und Client, ohne Alarm');
      t.eq(r.gii, [false, 'LL'], 'Gitter II: der Gefangene darf den Schalter nicht, es bleibt zu');
    },
  },
  {
    name: 'Gefaengnis: Alarm vor der Karte: die Trakt-Wache wird zum Gegner, trotzdem kommt der Gefangene aus dem Trakt (Karte faellt beim Tod des Gegners, Rueckfall: Gitter I nach Alarm aufhebeln, laut und lang)',
    timeout: 120000,
    async run(t) {
      await t.loadTool('loopnet.js'); await t.loadInpage('coop.js');
      const r = await t.page.evaluate(`(() => {
        const H = ${HELP}, A = H.A, B = H.B, o = {}, p0 = A.get().players[0], p1 = A.get().players[1], R = A.LAY().prison;
        const crd = H.items(A, 'crd')[0], prg = H.items(A, 'prg')[0], rdr = H.items(A, 'rdr')[0];
        o.pre = [prg.ok(p1), crd.ok(p1)]; o.long = A.CFG.prison.pryG >= 15;
        A.startHeist(true, p0); H.both(1);
        o.alarm = [A.get().phase, B.get().phase]; const ce = A.get().en.find(e => e.card); o.card = !!ce;
        o.after = [prg.ok(p1), prg.ok(p0), crd.ok(p1), rdr.ok(p1)];
        // Weg 1: der Gegner mit der Karte stirbt, die Karte liegt dort
        ce.x = 6 * 32; ce.y = (R.tb ? 18.5 : 4.5) * 32; ce.hp = 0; for (let i = 0; i < 90; i++) { A.get().players.forEach(p => { p.hp = 1e9; p.dead = false; }); step(H.G.insts, H.G.net, 1 / 60); }
        H.both(1); const cb = H.items(B, 'crd')[0]; o.drop = [crd.ok(p1), crd.ok(p0), Math.round(crd.x), Math.round(crd.y)]; o.cl = [cb.ok(B.get().players[1]), Math.round(cb.x), Math.round(cb.y)]; crd.act(p1); o.rd = rdr.ok(p1); rdr.act(p1); H.both(1); o.gi1 = [H.lst(A, 'gi'), H.lst(B, 'gi')];
        return o; })()`);
      t.eq(r.pre, [false, false], 'vor dem Alarm: kein Aufhebeln des Gitters, keine Karte ohne ausgeschaltete Wache');
      t.ok(r.long, 'Aufhebeln des Gitters ist lang');
      t.eq(r.alarm, [2, 2], 'Alarm auf Host und Client');
      t.ok(r.card, 'der Gegner traegt die Karte');
      t.eq(r.after, [true, false, false, false], 'nach dem Alarm: der Gefangene kann das Gitter aufhebeln (nur er), die Karte hat noch niemand');
      t.eq([r.drop[0], r.drop[1]], [true, false], 'Weg 1: stirbt der Gegner, liegt die Karte da und nur der Gefangene nimmt sie');
      t.eq(r.cl, [true, r.drop[2], r.drop[3]], 'Client (der Gefangene) sieht die gefallene Karte an derselben Stelle und kann sie nehmen');
      t.eq(r.gi1, ['ll', 'll'], 'mit der Karte geht das Gitter I auch nach Alarm');
      const w = await t.page.evaluate(`(() => {
        const H = ${HELP}, A = H.A, B = H.B, o = {}, p0 = A.get().players[0], p1 = A.get().players[1], R = A.LAY().prison, T = 32;
        const prg = H.items(A, 'prg')[0]; A.startHeist(true, p0); H.both(1);
        A.CFG.prison.pryG = 1.5; B.CFG.prison.pryG = 1.5; p1.x = prg.x; p1.y = prg.y; B.keys.e = 1; H.both(3, () => { p1.x = prg.x; p1.y = prg.y; p1.vx = p1.vy = 0; }); B.keys.e = 0; H.both(1);
        o.gi = [H.lst(A, 'gi'), H.lst(B, 'gi')]; return o; })()`);
      t.eq(w.gi, ['ll', 'll'], 'Weg 2: Gitter I mit E halten aufgehebelt, auf Host und Client');
    },
  },
  {
    name: 'Gefaengnis: C4 oeffnet das Tor von aussen und loest Alarm aus, der Gefangene hebt nach dem Ausschalten einer Wache deren Pistole auf und ist dann bewaffnet',
    timeout: 120000,
    async run(t) {
      await t.loadTool('loopnet.js'); await t.loadInpage('coop.js');
      const r = await t.page.evaluate(`(() => {
        const H = ${HELP}, A = H.A, o = {}, p0 = A.get().players[0], p1 = A.get().players[1];
        const c4 = H.items(A, 'c4')[0]; p0.c4 = 1; p0.x = 51 * 32; p0.y = 6.5 * 32; p1.c4 = 1; p1.x = 47 * 32; p1.y = 6.5 * 32;
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
      t.eq(p.n, 7, 'je Waerter eine Pistole (Objekt)');
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
        H.items(A, 'vault')[0].act(p0);
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
  {
    name: 'Gefaengnis: die gewaehlte Kachel gilt nur fuer einen Auftrag (danach Bank), solo wird daraus die Bank',
    timeout: 120000,
    async run(t) {
      await t.loadTool('loopnet.js'); await t.loadInpage('coop.js');
      const r = await t.page.evaluate(`(() => {
        const o = {}, G = CT.mkGame('prison', 5, 2, 60, 20), A = G.A; o.first = [A.sc(), A.getPz()];
        A.get().players.forEach(p => { p.out = true; }); A.finish(true, 'Ausbruch', 'x'); G.run(1); A.startNext(); G.run(2.5); o.next = [A.sc(), G.clients[0].sc(), A.getPz()];
        const D = __dbg; D.sessReset(); D.setScenario('prison'); D.newSeed(); o.solo = D.sc();
        return o; })()`);
      t.eq(r.first, ['prison', 1], 'die Kachel startet das Gefaengnis');
      t.eq(r.next, ['bank', 'bank', -1], 'nach dem gewonnenen Ausbruch ist der naechste Auftrag kein Gefaengnis');
      t.eq(r.solo, 'bank', 'solo wird aus scenario prison die Bank');
    },
  },
  {
    name: 'Gefaengnis: verlaesst der Gefangene den Raum oder sind alle draussen tot (Tor zu), endet der Auftrag als gescheitert; ist das Tor offen, laeuft er weiter',
    timeout: 120000,
    async run(t) {
      await t.loadTool('loopnet.js'); await t.loadInpage('coop.js');
      const run = body => t.page.evaluate(`(() => { const H = ${HELP}, A = H.A, o = {}, p0 = A.get().players[0], p1 = A.get().players[1]; ${body}
        for (let i = 0; i < 120; i++) step(H.G.insts, H.G.net, 1 / 60); const e = A.get().ended; o.e = e && [e.win, e.title]; return o; })()`);
      const a = await run('p1.gone = true;');
      t.eq(a.e, [false, 'Ausbruch gescheitert'], 'Gefangener weg: gescheitert');
      const b = await run('p0.dead = true; p0.hp = 0;');
      t.eq(b.e, [false, 'Ausbruch gescheitert'], 'draussen alle tot, Tor zu: gescheitert');
      const c = await run('A.get().its.find(i => i.t === "vault").act(p0); p0.dead = true; p0.hp = 0;');
      t.ok(!c.e || c.e[1] !== 'Ausbruch gescheitert', 'Tor offen: der Gefangene kann noch raus');
    },
  },
  {
    name: 'Gefaengnis: der Gefangene kommt zu Fuss (echte Kollision) durch alle Stellen vom Bett zum Abholpunkt: Zelle aufhebeln, Trakt, Leser, Gang, Gitter II (Schalter), Kantine, Waescherei, Kueche, Serviceluke; ohne die Stellen kommt er nicht weiter',
    timeout: 180000,
    async run(t) {
      const r = await t.page.evaluate(() => {
        const D = __dbg, T = 32; D.sessReset(); D.setScenario('prison'); D.setSeedMode('random'); D.setLage([]); D.setTurn('S'); D.buildSeed(5); D.CFG.policeAt = 1e6; D.CFG.policeForced = 1e6; D.reset();
        const g = D.get(), me = g.me, R = D.LAY().prison, k = D.keys, o = { steps: 0, seg: [] }; g.cams.forEach(c => { c.off = true; });
        const it = tt => g.its.find(i => i.t === tt), sw = id => g.its.filter(i => i.t === 'lsw').find(i => R.sws[i.k].opens.includes(id));
        const walk = (tx, ty, name) => { const pts = D.pathTo(me.x, me.y, tx, ty); if (!pts.length) { o.seg.push(name + ': kein Weg'); return false; }
          for (const w of pts) { for (let i = 0; i < 300; i++) { const dx = w[0] - me.x, dy = w[1] - me.y; if (Math.hypot(dx, dy) < 5) break; k.d = dx > 3; k.a = dx < -3; k.s = dy > 3; k.w = dy < -3; D.update(1 / 30); o.steps++; } }
          for (const q of ['a', 'd', 'w', 's']) k[q] = false; o.seg.push(name + ': ok'); return true; };
        const near = (x, y, name) => { const d = Math.hypot(me.x - x, me.y - y); if (d > 40) o.seg.push(name + ' zu weit ' + Math.round(d)); };
        // 1. ohne Stellen: zur Kantine gibt es keinen Weg
        o.blocked = D.pathTo(me.x, me.y, 22, 18).length === 0;
        // 2. Zellentuer aufhebeln (an der Stelle der Zelle)
        const cgd = g.npcs.filter(n => n.k === 'grd' && n.st !== 'away')[R.card.g]; g.npcs.splice(0);
        const need = (item, who, name) => { if (!item.ok(who)) o.seg.push(name + ': ok(o) false'); };
        const pry = it('pry'); near(pry.x, pry.y, 'pry'); need(pry, me, 'pry'); pry.act(me);
        // 3. zum Leser, Karte als genommen, Leser
        const rdr = it('rdr'), crd = it('crd'); o.rdrNoCard = rdr.ok(me); o.crdAlive = crd.ok(me); cgd.st = 'ko'; cgd.kt = 99; need(crd, me, 'Karte'); crd.act(me); walk(Math.floor(rdr.x / T), Math.floor(rdr.y / T), 'Leser'); near(rdr.x, rdr.y, 'Leser'); need(rdr, me, 'Leser'); rdr.act(me);
        // 4. in den Gang, vor Gitter II; ohne Schalter kein Weg in die Kantine
        walk(15, 18, 'Gang'); o.blockedII = D.pathTo(me.x, me.y, 22, 18).length === 0; need(sw('gii'), g.players[0], 'Schalter II'); sw('gii').act(g.players[0]);
        // 5. durch Kantine und Waescherei in die Kueche, Serviceluke von innen, zum Abholpunkt
        walk(22, 18, 'Kantine'); walk(34, 19, 'Waescherei'); const dlx = it('dlx'); walk(43, 22, 'Kueche'); near(dlx.x, dlx.y, 'dlx'); need(dlx, me, 'dlx'); dlx.act(me); walk(R.pick[0], R.pick[1], 'Abholpunkt');
        o.d = Math.hypot(me.x - (R.pick[0] * T + 16), me.y - (R.pick[1] * T + 16)); o.r = D.CFG.prison.pickR;
        return o;
      });
      t.ok(r.blocked, 'eingesperrt: aus der Zelle gibt es keinen Weg in die Kantine');
      t.eq([r.rdrNoCard, r.crdAlive], [false, false], 'ohne Karte geht der Leser nicht, die Karte nur nach dem Ausschalten der Wache');
      t.ok(r.blockedII, 'im Gang vor dem Gitter II: kein Weg in die Kantine ohne Schalter');
      t.ok(r.seg.every(s => /: ok$/.test(s)), 'alle Teilstrecken gelaufen: ' + r.seg.join('; '));
      t.ok(r.d < r.r, 'der Gefangene steht am Abholpunkt (Abstand ' + Math.round(r.d) + ' von ' + r.r + ', Schritte ' + r.steps + ')');
    },
  },
  {
    name: 'Gefaengnis: Lieferung. Die Servicetuer der Kueche ist zu, geht zur Lieferzeit (CFG.prison.delivery, aus dem Seed) auf Host und Client auf, nach deliveryOpen s wieder zu, im Alarm bleibt sie offen; draussen kommt man dann leise bis in die Kueche',
    timeout: 120000,
    async run(t) {
      await t.loadTool('loopnet.js'); await t.loadInpage('coop.js');
      const r = await t.page.evaluate(`(() => {
        const H = ${HELP}, A = H.A, B = H.B, o = {}, R = A.LAY().prison, C = A.CFG.prison, at = R.dl.at, d = R.dl.cells[0];
        o.at = at; o.range = [at >= C.delivery[0], at <= C.delivery[1]];
        const st = () => [H.cl(A, d[0], d[1]), H.cl(B, d[0], d[1])].join('');
        const rt = () => A.get().rT, toTime = tt => { for (let i = 0; rt() < tt && i < 400; i++) H.both(0.5); }; o.rt0 = rt();
        o.before = st(); toTime(at + 1); H.both(1); o.during = st(); toTime(at + C.deliveryOpen + 1); H.both(1); o.after = st();
        // Weg von draussen in die Kueche bei zu und offener Tuer (Breitensuche ueber das Raster)
        const bfs = (from, to) => { const seen = new Set([from.join()]), q = [from]; for (let h = 0; h < q.length; h++) { const c = q[h]; if (c[0] === to[0] && c[1] === to[1]) return true; for (const e of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const n = [c[0] + e[0], c[1] + e[1]]; if (seen.has(n.join()) || A.isSol(n[0], n[1])) continue; seen.add(n.join()); q.push(n); } } return false; };
        o.closedWay = bfs([52, 2], [43, 21]); A.world().setc(d[0], d[1], 'l'); o.openWay = bfs([52, 2], [43, 21]); A.world().setc(d[0], d[1], 'L');
        o.alarmWay = (A.startHeist(true, A.get().players[0]), H.both(1.5), st());
        return o; })()`);
      t.ok(r.range[0] && r.range[1], 'Lieferzeit liegt im Fenster: ' + r.at);
      t.eq(r.before, 'LL', 'vor der Lieferung zu (Host, Client)');
      t.ok(r.rt0 >= 0, 'rT lesbar: ' + r.rt0);
      t.eq(r.during, 'll', 'zur Lieferzeit offen auf Host und Client');
      t.eq(r.after, 'LL', 'danach wieder zu');
      t.eq([r.closedWay, r.openWay], [false, true], 'draussen in die Kueche nur bei offener Servicetuer');
      t.eq(r.alarmWay, 'll', 'im Alarm offen');
    },
  },
  {
    name: 'Gefaengnis: der Schalter oeffnet auch die Zellen der Mithaeftlinge, sie laufen los (auf Host und Client sichtbar, hinter dem Gitter I bleiben sie im Trakt), sind Zivilisten (Treffer wie bei Zivilisten), die Wachen schauen hin',
    timeout: 120000,
    async run(t) {
      await t.loadTool('loopnet.js'); await t.loadInpage('coop.js');
      const r = await t.page.evaluate(`(() => {
        const H = ${HELP}, A = H.A, B = H.B, o = {}, C = A.CFG.prison, inm = D => D.get().npcs.filter(n => n.inm);
        o.n = [inm(A).length, inm(B).length, C.inm]; o.kind = inm(A).map(n => n.k).join(); const p0 = inm(A).map(n => [Math.round(n.x), Math.round(n.y)]);
        o.cells = [H.lst(A, 'zi'), H.lst(B, 'zi')]; H.sw(A, 'zi').act(A.get().players[0]); H.both(5);
        o.cellsAfter = [H.lst(A, 'zi'), H.lst(B, 'zi')];
        const moved = (D) => inm(D).filter((n, i) => Math.hypot(n.x - p0[i][0], n.y - p0[i][1]) > 40).length; o.moved = [moved(A), moved(B)];
        o.look = A.get().npcs.filter(n => n.k === 'grd' && n.look).length;
        // hinter dem Gitter I (vom Gefangenen geoeffnet) ziehen sie weiter in den Gang
        const gi = A.LAY().prison.locks.find(l => l.id === 'gi'); A.world().setc(gi.cells[0][0], gi.cells[0][1], 'l'); A.world().setc(gi.cells[1][0], gi.cells[1][1], 'l');
        return o; })()`);
      t.eq(r.n, [3, 3, 3], 'drei Mithaeftlinge auf Host und Client (CFG.prison.inm)');
      t.eq(r.kind, 'civ,civ,civ', 'es sind Zivilisten (Treffer-Regeln wie bei Zivilisten)');
      t.eq(r.cells, ['LLLLLLL', 'LLLLLLL'], 'die Zellentueren sind vorher zu');
      t.eq(r.cellsAfter, ['lllllll', 'lllllll'], 'nach dem Schalter auf beiden offen');
      t.ok(r.moved[0] >= 2 && r.moved[1] >= 2, 'die Mithaeftlinge laufen los, auch auf dem Client: ' + JSON.stringify(r.moved));
      t.ok(r.look >= 1, 'mindestens eine Wache schaut hin');
    },
  },
  {
    name: 'Gefaengnis: wer waehrend der Lieferung hineingeht, kommt wieder hinaus (Servicetuer von innen mit E, das Tor auch von innen, nur nicht fuer den Gefangenen), auch wenn die Tuer sich schliesst',
    timeout: 120000,
    async run(t) {
      await t.loadTool('loopnet.js'); await t.loadInpage('coop.js');
      const r = await t.page.evaluate(`(() => {
        const H = ${HELP}, A = H.A, B = H.B, o = {}, R = A.LAY().prison, C = A.CFG.prison, p0 = A.get().players[0], p1 = A.get().players[1], d = R.dl.cells[0];
        const rt = () => A.get().rT; for (let i = 0; rt() < R.dl.at + 1 && i < 400; i++) H.both(0.5);
        p0.x = (d[0] + .5) * 32; p0.y = (d[1] - .5) * 32; o.open = H.cl(A, d[0], d[1]);
        for (let i = 0; rt() < R.dl.at + C.deliveryOpen + 2 && i < 400; i++) { p0.x = (d[0] + .5) * 32; p0.y = (d[1] - 1.5) * 32; H.both(0.5); }
        o.closed = [H.cl(A, d[0], d[1]), H.cl(B, d[0], d[1])].join('');
        const dlx = H.items(A, 'dlx')[0]; p0.x = (d[0] + .5) * 32; p0.y = (d[1] - .5) * 32; o.ok = [dlx.ok(p0), dlx.ok(A.get().players[1]) ];
        dlx.act(p0); H.both(1); o.reopen = [H.cl(A, d[0], d[1]), H.cl(B, d[0], d[1])].join('');
        const bfs = (from, to) => { const seen = new Set([from.join()]), q = [from]; for (let h = 0; h < q.length; h++) { const c = q[h]; if (c[0] === to[0] && c[1] === to[1]) return true; for (const e of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const n = [c[0] + e[0], c[1] + e[1]]; if (seen.has(n.join()) || A.isSol(n[0], n[1])) continue; seen.add(n.join()); q.push(n); } } return false; };
        o.way = bfs([43, 21], [43, 24]);
        const gate = H.items(A, 'vault')[0]; p0.x = 45 * 32; p0.y = 6.5 * 32; p1.x = 45 * 32; p1.y = 6.5 * 32; o.gate = [gate.ok(p0), gate.ok(p1)];
        return o; })()`);
      t.eq(r.closed, 'LL', 'die Tuer schliesst sich auch mit einem Spieler in der Kueche');
      t.eq(r.ok, [true, true], 'die Servicetuer laesst sich von innen mit E oeffnen');
      t.eq(r.reopen, 'll', 'und ist dann auf Host und Client offen');
      t.eq(r.way, true, 'aus der Kueche gibt es dann einen Weg nach draussen');
      t.eq(r.gate, [true, false], 'das Tor geht von innen fuer Mitspieler, nicht fuer den Gefangenen');
    },
  },
  {
    name: 'Gefaengnis: jedes E-Objekt der Anlage hat ein sichtbares Ding: Schalter, Hauptschalter, Monitor und Notiz ein gezeichnetes Schaltpult oder eine Tisch- und Monitorkachel daneben, Aufhebeln und Leser das verriegelte Tuer- oder Gitterstueck, die Karte ein gezeichnetes Kartensymbol an der Wache',
    timeout: 120000,
    async run(t) {
      const r = await t.page.evaluate(() => {
        const D = __dbg, T = 32; D.setScenario('prison'); D.setSeedMode('random'); D.setLage([]); D.setTurn('S');
        const out = { bad: [], n: 0, mark: [] };
        for (const sd of [5, 6, 7, 8, 9]) {
          D.buildSeed(sd); D.reset(); const lay = D.LAY(), M = D.world().M, ch = (x, y) => M[y + 6][x + 6], R = lay.prison, lockCells = R.locks.reduce((a, l) => a.concat(l.cells), []);
          for (const it of D.get().its.filter(i => ['lsw', 'sw', 'mon', 'note', 'pry', 'rdr', 'prg'].includes(i.t))) {
            const tx = Math.floor(it.x / T), ty = Math.floor(it.y / T); out.n++;
            let ok = false;
            for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
              const x = tx + dx, y = ty + dy;
              if (['lsw', 'sw', 'mon', 'note'].includes(it.t)) { if ('me'.includes(ch(x, y)) || R.panels.some(q => q[0] === x && q[1] === y)) ok = true; }
              else if (lockCells.some(q => q[0] === x && q[1] === y)) ok = true;
            }
            if (!ok) out.bad.push(sd + ' ' + it.t + '@' + tx + ',' + ty);
          }
        }
        // Karte: ein Kartensymbol (#7ee34a) an der Wache, solange sie nicht genommen ist, danach nicht mehr
        D.buildSeed(5); D.reset(); const g = D.get(), cc = g.its.find(i => i.t === 'crd'), me = g.me; me.x = cc.x; me.y = cc.y + 40;
        const log = []; const f = CanvasRenderingContext2D.prototype.fillRect; CanvasRenderingContext2D.prototype.fillRect = function (x, y, w, h) { if (this.fillStyle === '#7ee34a' && Math.abs(x - (cc.x + 6)) < 1 && Math.abs(y - (cc.y - 10)) < 1) log.push(1); return f.apply(this, arguments); };
        D.draw(); out.mark.push(log.length); cc.done = true; log.length = 0; D.draw(); out.mark.push(log.length); CanvasRenderingContext2D.prototype.fillRect = f;
        return out;
      });
      t.ok(r.n >= 7 * 5 - 2, 'E-Objekte gefunden: ' + r.n);
      t.eq(r.bad, [], 'E-Objekte ohne sichtbares Ding in der Naehe');
      t.ok(r.mark[0] >= 1 && r.mark[1] === 0, 'Kartensymbol an der Wache, nach dem Nehmen weg: ' + JSON.stringify(r.mark));
    },
  },
  {
    name: 'Gefaengnis: lautlose Flucht. Erreicht der Gefangene den Abholpunkt hinter der Mauer in Phase 1, ist es ein lautloser Sieg (auf Host und Client, quiet), mit Alarm geht das nicht mehr',
    timeout: 120000,
    async run(t) {
      await t.loadTool('loopnet.js'); await t.loadInpage('coop.js');
      const run = alarm => t.page.evaluate(`(() => {
        const H = ${HELP}, A = H.A, B = H.B, o = {}, pk = A.LAY().prison.pick, p1 = A.get().players[1];
        if (${alarm}) A.startHeist(true, A.get().players[0]);
        p1.x = (pk[0] + .5) * 32; p1.y = (pk[1] + .5) * 32; H.both(3);
        const e = A.get().ended, f = B.get().ended; o.a = e && [e.win, e.title]; o.b = f && [f.win, f.title]; o.phase = A.get().phase; o.sec = A.get().secured; o.q = A.SESSION.quiet; return o; })()`);
      const q = await run(false);
      t.eq(q.a, [true, 'Lautlos ausgebrochen'], 'Host: lautloser Sieg');
      t.eq(q.b && q.b[0], true, 'Client: Sieg');
      t.ok(q.sec > 0 && q.q >= 1, 'Belohnung gesichert, lautlos zaehlt fuer die Serie');
      const l = await run(true);
      t.eq(l.a, null, 'mit Alarm: kein Ende durch den Abholpunkt (Phase 2)');
    },
  },
];
