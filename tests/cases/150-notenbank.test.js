// Notenbank N1 (Ticket 61, docs/szenarien.md, Abschnitt Notenbank): achtes Szenario `nb`, handgebaut, nicht gedreht, ohne Ausweichpunkt. Alarm nach CFG.nb.alarmAt s Erkunden, die Tunneltuer (L) geht CFG.nb.open s nach dem Alarm auf, kein Fluchtwagen, Sieg ueber die Fluchtzone am Tunnelende mit Beute.
// validateMap muss ohne Abweichung bestehen (KNOWN leer)
const KNOWN = [];
const SOLO = `(() => {
  const D = __dbg, T = 32; D.sessReset(); D.setScenario('nb'); D.setSeedMode('random'); D.setLage([]); D.buildSeed(5); D.reset();
  const g = D.get(), me = g.me; g.npcs.splice(0);
  const cl = (x, y) => D.world().M[y + 6][x + 6];
  const step = (sec, f) => { for (let i = 0; i < Math.round(sec * 30); i++) { me.hp = 1e9; me.dead = false; if (f) f(i); D.update(1 / 30); } };
  return { D, g, me, T, cl, step };
})()`;

module.exports = [
  {
    name: 'Notenbank: die Karte besteht validateMap bis auf die bekannte Abweichung, ist hoechstens 64x64, baut deterministisch, variiert mit dem Seed und steht in MAP_FIELDS; die Tunneltuer ist L, die Fluchtzone erreichbar nur ueber den Keller',
    async run(t) {
      const r = await t.page.evaluate(() => {
        const D = __dbg, o = {}; D.setScenario('nb'); D.setSeedMode('random'); D.setLage([]);
        const a = D.layoutBase(5), b = D.layoutBase(5), c = D.layoutBase(6), v = D.validateMap(a);
        o.err = v.err.map(e => e.r); o.sc = D.layoutFor(5).nb ? 'nb' : '?'; o.same = D.layoutFor(5).seed === 5 && D.layoutFor(5).hall === 'Notenbank';
        const sig = l => JSON.stringify([l.guards, l.cams.map(x => [x.x, x.y]), l.theme.tod, l.nb.press, l.mission.code]);
        o.det = sig(a) === sig(b); o.vary = [5, 6, 7, 8, 9, 10, 11, 12].map(s => sig(D.layoutBase(s))).filter((x, i, A) => A.indexOf(x) === i).length;
        o.names = D.MAP_FIELDS.map(f => f[0]);
        D.buildLay(a); const w = D.world(), cl = (x, y) => w.M[y + 6][x + 6]; o.size = [w.W, w.H]; o.door = cl(13, 3); o.stair = cl(16, 6);
        const bfs = (from, to, ok) => { const seen = new Set([from.join()]), q = [from]; for (let h = 0; h < q.length; h++) { const c = q[h]; if (c[0] === to[0] && c[1] === to[1]) return true; for (const d of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const n = [c[0] + d[0], c[1] + d[1]], k = n.join(); if (!seen.has(k) && ok(n[0], n[1])) { seen.add(k); q.push(n); } } } return false; };
        let open = false; const walk = (x, y) => { if (open && x === 13 && y === 3) return true; const ch = cl(x, y); return ch !== '#' && ch !== 'W' && ch !== 'Y' && ch !== 'L' && ch !== 'V' && ch !== 'C' && !'ekqPpbAmrfX'.includes(ch) && ch !== undefined; };
        const z = a.nb.zone; o.way = { keller: bfs([14, 30], [20, 3], walk), zoneClosed: bfs([14, 30], [z[0], z[1]], walk) };
        open = true; o.way.zoneOpen = bfs([14, 30], [z[0], z[1]], walk);
        o.pressIn = a.nb.pcand.some(p => p[0] === a.nb.press[0] && p[1] === a.nb.press[1]);
        return o;
      });
      const bad = r.err.filter(x => !KNOWN.includes(x));
      t.eq(bad, [], 'validateMap: nur bekannte Abweichungen (' + KNOWN.join(', ') + '), gemeldet: ' + r.err.join(', '));
      t.eq([r.sc, r.same], ['nb', true], 'layoutFor liefert die Notenbank');
      t.ok(r.det && r.vary >= 3, 'gleicher Seed gleiche Anlage, andere Seeds andere Wachen, Kameras, Presse oder Code (' + r.vary + ' von 8)');
      t.ok(r.size[0] <= 64 && r.size[1] <= 64, 'Welt hoechstens 64x64: ' + r.size);
      t.ok(r.names.includes('nb'), 'MAP_FIELDS kennt nb');
      t.eq([r.door, r.stair], ['L', 'd'], 'Tunneltuer (L) und Kellertreppe (d) stehen');
      t.eq(r.way, { keller: true, zoneClosed: false, zoneOpen: true }, 'Wege: der Keller ist von draussen erreichbar, die Fluchtzone erst bei offener Tunneltuer');
      t.ok(r.pressIn, 'der Platz der Presse ist einer der Kandidaten');
    },
  },
  {
    name: 'Notenbank: frei ab Auftrag 8 (CFG.rank): im Zufall erst ab Runde 8, dann dabei; als Wahl nie im Pool des Gefaengnisses',
    async run(t) {
      const r = await t.page.evaluate(() => {
        const D = __dbg, o = { rank: D.CFG.rank.nb }, pool = rd => { D.sessReset(); D.SESSION.round = rd; D.setScenario('random'); const s = new Set(); for (let i = 0; i < 400; i++) { D.newSeed(); s.add(D.sc()); } return [...s]; };
        o.p6 = pool(6); o.p7 = pool(7); D.sessReset(); return o;
      });
      t.eq(r.rank, 7, 'CFG.rank.nb ist 7 (Auftrag 8)');
      t.ok(!r.p6.includes('nb') && !r.p6.includes('prison'), 'Runde 7: nb nicht im Zufall: ' + r.p6);
      t.ok(r.p7.includes('nb') && !r.p7.includes('prison'), 'Runde 8: nb im Zufall, das Gefaengnis nie: ' + r.p7);
    },
  },
  {
    name: 'Notenbank: Alarm von selbst nach alarmAt s (nicht frueher), die Tunneltuer bleibt bis open s nach dem Alarm zu und geht dann auf, Meldung und Countdown, kein Fluchtwagen',
    timeout: 120000,
    async run(t) {
      const r = await t.page.evaluate(`(() => {
        const H = ${SOLO}, D = H.D, g = H.g, C = D.CFG.nb, o = {}; D.CFG.policeAt = 1e6; D.CFG.policeForced = 1e6;
        H.step(C.alarmAt - 3); o.p1 = D.get().phase; H.step(5); o.p2 = D.get().phase;
        o.van0 = [D.get().vanArr, D.get().vanAt > 1e6];
        const d = D.LAY().nb.door; H.step(C.open - 5); o.before = H.cl(d[0], d[1]); o.cd = D.get().tH;
        const say0 = D.get().feed ? D.get().feed.length : 0; H.step(8); o.after = H.cl(d[0], d[1]);
        H.step(CFG_VANTEST()); o.van1 = [D.get().vanArr, !!D.get().ended];
        function CFG_VANTEST() { return D.CFG.vanAuto + D.CFG.vanStay + 20; }
        return o; })()`);
      t.eq([r.p1, r.p2], [1, 2], 'Phase 1 vor alarmAt, danach Alarm (Phase 2)');
      t.eq([r.before, r.after], ['L', 'l'], 'Tunneltuer zu bis kurz vor open, danach offen');
      t.eq(r.van1, [false, false], 'auch weit nach vanAuto und vanStay kommt kein Fluchtwagen und das Spiel ist nicht vorbei');
    },
  },
  {
    name: 'Notenbank: Sieg nur ueber die Fluchtzone bei offener Tunneltuer; vorher bringt die Zone nichts, ein Sieg im Keller ohne Zone gibt es nicht; Beute zaehlt',
    timeout: 120000,
    async run(t) {
      const r = await t.page.evaluate(`(() => {
        const H = ${SOLO}, D = H.D, g = H.g, me = H.me, T = H.T, C = D.CFG.nb, o = {}; D.CFG.policeAt = 1e6; D.CFG.policeForced = 1e6; D.get().players[0].loot = 1234;
        D.startHeist(true, me); const z = D.LAY().nb.zone;
        me.x = (z[0] + 1) * T; me.y = (z[1] + .5) * T; H.step(2); o.early = [!!D.get().ended, me.out];
        me.x = 12 * T; me.y = 14.5 * T; H.step(C.open + 2); o.mid = [!!D.get().ended, me.out];
        me.x = (z[0] + 1) * T; me.y = (z[1] + .5) * T; H.step(1);
        const e = D.get().ended; o.end = e && { win: e.win, title: e.title }; o.sec = D.get().secured;
        return o; })()`);
      t.eq(r.early, [false, false], 'vor der Oeffnung bringt die Zone nichts');
      t.eq(r.mid, [false, false], 'offene Tunneltuer allein sichert niemanden');
      t.eq(r.end && r.end.win, true, 'Sieg ueber die Zone: ' + JSON.stringify(r.end));
      t.eq(r.end && r.end.title, 'Durch den Tunnel entkommen', 'Titel');
      t.ok(r.sec >= 1234, 'Beute gesichert: ' + r.sec);
    },
  },
  {
    name: 'Notenbank: Obergrenze gleichzeitiger Beamter (CFG.nb.maxEn) und Geiseldeckel hcap; Polizei-Posten stehen nicht am Tunnel',
    timeout: 120000,
    async run(t) {
      const r = await t.page.evaluate(`(() => {
        const H = ${SOLO}, D = H.D, T = H.T, o = {}; D.CFG.policeAt = 1e6; D.CFG.policeForced = 2; D.CFG.nb.maxEn = 5; D.CFG.nb.open = 1e6; D.CFG.nb.alarmAt = 1e6;
        D.startHeist(true, H.me); D.CFG.waveGap = 4; D.CFG.waveGapMin = 4; D.CFG.waveGapStep = 0;
        let mx = 0; H.step(120, () => { const n = D.get().en.filter(e => e.hp > 0 && (e.kind === 'cop' || e.kind === 'swat' || e.kind === 'shield')).length; if (n > mx) mx = n; }); o.max = mx; o.wave = D.get().waveN;
        o.cap = D.holdCap ? D.holdCap() : -1; o.hcap = D.CFG.nb.hcap;
        const z = D.LAY().nb.zone, posts = D.LAY().posts || [], cx = (z[0] + z[2] + 1) / 2, cy = (z[1] + z[3] + 1) / 2; o.nposts = posts.length; o.nearTunnel = posts.filter(p => Math.hypot(p.x + .5 - cx, p.y + .5 - cy) < D.CFG.nb.postD).length;
        return o; })()`);
      t.ok(r.wave >= 3, 'es kamen mehrere Wellen: ' + r.wave);
      t.ok(r.max <= 5, 'nie mehr als maxEn Beamte gleichzeitig: ' + r.max);
      t.eq(r.cap, r.hcap, 'Geiseldeckel gilt: ' + r.cap);
      t.ok(r.nposts >= 8, 'es bleiben genug Posten: ' + r.nposts);
      t.eq(r.nearTunnel, 0, 'kein Polizeiposten am Tunnel');
    },
  },
  {
    name: 'Notenbank: Coop. Host und Client sehen Tunneltuer und Countdown (Schnappschuss), gleiche Karte, Sieg ueber die Zone endet auf beiden',
    timeout: 180000,
    async run(t) {
      await t.loadTool('loopnet.js'); await t.loadInpage('coop.js');
      const r = await t.page.evaluate(`(() => {
        const G = CT.mkGame('nb', 5, 2, 60, 20), A = G.A, B = G.clients[0], o = {}, C = A.CFG.nb, T = 32;
        const both = (sec, f) => { for (let i = 0; i < Math.round(sec * 60); i++) { A.get().players.forEach(p => { p.hp = 1e9; p.dead = false; }); if (f) f(i); G.run(1 / 60); } };
        o.sc = [A.sc(), B.sc()]; o.map = CT.diff(CT.sig(A), CT.sig(B));
        A.CFG.policeAt = 1e6; A.CFG.policeForced = 1e6; B.CFG.policeAt = 1e6; B.CFG.policeForced = 1e6;
        A.startHeist(true, A.get().me); G.run(1);
        const d = A.LAY().nb.door, cl = (D) => D.world().M[d[1] + 6][d[0] + 6];
        both(C.open - 6); o.closed = [cl(A), cl(B)]; o.tH = [Math.round(A.get().tH), Math.round(B.get().tH)];
        both(8); G.run(1); o.open = [cl(A), cl(B)];
        const z = A.LAY().nb.zone; A.get().players.forEach(p => { p.x = (z[0] + 1) * T; p.y = (z[1] + .5) * T; p.loot = 500; }); both(2); G.run(1);
        o.end = [!!A.get().ended, !!B.get().ended]; o.win = A.get().ended && A.get().ended.win;
        return o; })()`);
      t.eq(r.sc, ['nb', 'nb'], 'Szenario auf Host und Client');
      t.eq(r.map, [], 'Karte, Items und Welt gleich');
      t.eq(r.closed, ['L', 'L'], 'Tunneltuer zu auf beiden: ' + JSON.stringify(r.tH));
      t.eq(r.open, ['l', 'l'], 'Tunneltuer offen auf beiden (Schnappschussfeld nbo)');
      t.eq(r.end, [true, true], 'Sieg endet auf beiden');
      t.eq(r.win, true, 'gewonnen');
    },
  },
  {
    name: 'Notenbank: Funk G ruft keinen Wagen (auch nach vanLock), vanCalled bleibt aus',
    async run(t) {
      const r = await t.page.evaluate(`(() => {
        const H = ${SOLO}, D = H.D; D.CFG.policeAt = 1e6; D.CFG.policeForced = 1e6; D.startHeist(true, H.me); H.step(D.CFG.vanLock + 2);
        const g = D.get(); const before = [g.vanCalled, g.vanArr]; D.callVan(); return { before, after: [D.get().vanCalled, D.get().vanAt > 1e6] }; })()`);
      t.eq(r.after, [false, true], 'G ruft nichts: ' + JSON.stringify(r));
    },
  },
  {
    name: 'Notenbank: Auftragswahl hat die Kachel Notenbank und (mit #debug) den Knopf Gefaengnis, beide per Maus und Tastatur erreichbar und waehlbar',
    async run(t) {
      await t.loadTool('loopnet.js'); await t.loadInpage('menu.js');
      const r = await t.page.evaluate(() => {
        const d = MT.solo(null, 's'), o = {}; d.sessReset(); d.SESSION.round = 8; MT.click(d, 'serie'); if (d.state().scr !== 'shop') { /* Runde 0 direkt Auftragswahl */ } 
        MT.click(d, 'next'); o.scr = d.state().scr; const ids = d.ui().tiles().map(q => q.id); o.ids = ids.filter(i => /^job:/.test(i));
        MT.click(d, 'job:nb'); o.nb = d.scen(); MT.click(d, 'job:prison'); o.pr = d.scen();
        const press = (...ks) => { for (const key of ks) MT.k(d, key); return d.ui().focus(); };
        o.keyPr = press('ArrowUp'); o.keyRnd = press('ArrowUp'); o.keyNb = press('ArrowLeft'); o.keyBack = press('ArrowRight');
        return o;
      });
      t.ok(r.ids.includes('job:nb') && r.ids.includes('job:prison'), 'Kacheln da: ' + r.ids);
      t.eq([r.nb, r.pr], ['nb', 'prison'], 'per Klick waehlbar: ' + JSON.stringify(r));
      t.eq([r.keyPr, r.keyRnd, r.keyNb, r.keyBack], ['job:prison', 'job:random', 'job:nb', 'job:random'], 'per Tastatur erreichbar (hoch, hoch, links, rechts vom Knopf Start aus)');
    },
  },
  {
    name: 'Notenbank: wer ohne Beute die offene Zone erreicht, bekommt dasselbe Ergebnis wie in der Bank, wer ohne Beute im Fluchtwagen sitzt (Sieg Entkommen, gesichert 0)',
    timeout: 120000,
    async run(t) {
      const r = await t.page.evaluate(`(() => {
        const out = {};
        { const H = ${SOLO}, D = H.D, me = H.me, T = H.T; D.CFG.policeAt = 1e6; D.CFG.policeForced = 1e6; D.startHeist(true, me); H.step(D.CFG.nb.open + 2);
          const z = D.LAY().nb.zone; me.loot = 0; me.x = (z[0] + 1) * T; me.y = (z[1] + .5) * T; H.step(1); const e = D.get().ended; out.nb = e && [e.win, D.get().secured, e.title]; }
        { const D = __dbg, T = 32; D.sessReset(); D.setScenario('bank'); D.setSeedMode('random'); D.setLage([]); D.buildSeed(5); D.reset(); D.CFG.policeAt = 1e6; D.CFG.policeForced = 1e6;
          const g = D.get(), me = g.me; g.npcs.splice(0); D.startHeist(true, me); me.loot = 0; const L = D.LAY();
          for (let i = 0; i < 30 * 200 && !D.get().ended; i++) { me.hp = 1e9; me.dead = false; if (D.get().vanArr) { me.x = L.exit.x + T; me.y = (L.exit.y0 + L.exit.y1) / 2; } D.update(1 / 30); }
          const e = D.get().ended; out.bank = e && [e.win, D.get().secured, e.title]; }
        return out; })()`);
      t.ok(r.bank && r.nb, 'beide Laeufe enden: ' + JSON.stringify(r));
      t.eq(r.nb.slice(0, 2), r.bank.slice(0, 2), 'Sieg und gesicherte Summe wie in der Bank: ' + JSON.stringify(r));
    },
  },
  {
    name: 'Notenbank: Fundort des Zettels (placeNote) ist gesetzt, gueltig und liegt nie im Tunnel oder in der Fluchtzone (30 Seeds)',
    async run(t) {
      const r = await t.page.evaluate(() => {
        const D = __dbg, o = { n: 0, none: [], tunnel: [], kinds: {} }; D.setScenario('nb'); D.setSeedMode('random'); D.setLage([]);
        for (let sd = 1; sd <= 30; sd++) { const l = D.layoutFor(sd), na = l.noteAt; o.n++; if (!na) { o.none.push(sd); continue; } o.kinds[na.k] = (o.kinds[na.k] || 0) + 1; if (na.x >= 7 && na.x <= 13 && na.y >= 2 && na.y <= 3) o.tunnel.push([sd, na.k, na.x, na.y]); }
        return o;
      });
      t.eq([r.none, r.tunnel], [[], []], 'Fundort immer da, nie im Tunnel: ' + JSON.stringify(r));
    },
  },
  {
    name: 'Notenbank: vier Verteidigungsringe, jede Engstelle ist die einzige Verbindung zum Ring dahinter (Flutfuellung mit der Engstelle als Wand), Ring 1 hat genau drei Eingaenge, der Tunnel bleibt erreichbar',
    async run(t) {
      const r = await t.page.evaluate(() => {
        const D = __dbg, o = {}; D.setScenario('nb'); D.setSeedMode('random'); D.setLage([]);
        const a = D.layoutBase(5), G = a.nb.gates; D.buildLay(a); const w = D.world(), cl = (x, y) => w.M[y + 6][x + 6];
        const SOL = '#WYwCVXfvekqPpbAmrfu', key = c => c.join();
        const reach = (from, to, blocked, tunnelOpen) => { const bl = new Set((blocked || []).map(key)), seen = new Set([key(from)]), q = [from];
          for (let h = 0; h < q.length; h++) { const c = q[h]; if (c[0] === to[0] && c[1] === to[1]) return true; for (const d of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const n = [c[0] + d[0], c[1] + d[1]], k = key(n), ch = cl(n[0], n[1]); if (seen.has(k) || bl.has(k) || ch === undefined || SOL.includes(ch)) continue; if (ch === 'L' && n[0] === 13 && n[1] === 3 && !tunnelOpen) continue; seen.add(k); q.push(n); } } return false; };
        const out = [14, 30], flat = g => [].concat(...g);
        o.s = [reach(out, [14, 21], G.schleuse), reach(out, [14, 21], []), reach(out, [16, 10], G.panzer), reach(out, [16, 10], []), reach(out, [20, 3], G.treppe), reach(out, [20, 3], []), reach([14, 21], [16, 10], G.panzer), reach([16, 10], [20, 3], G.treppe)];
        o.r1 = [reach(out, [14, 26], flat([G.haupt, G.seite, G.hinten])), reach(out, [14, 26], flat([G.seite, G.hinten])), reach(out, [14, 26], flat([G.haupt, G.hinten])), reach(out, [14, 26], flat([G.haupt, G.seite]))];
        o.tun = [reach(out, [8, 2], [], false), reach(out, [8, 2], [], true)];
        o.gatesOk = G.haupt.concat(G.seite, G.hinten, G.schleuse, G.panzer, G.treppe).every(c => cl(c[0], c[1]) !== '#' && cl(c[0], c[1]) !== 'W');
        o.len = [G.schleuse.length, G.panzer.length, G.treppe.length, G.haupt.length];
        return o;
      });
      t.eq(r.s, [false, true, false, true, false, true, false, false], 'Schleuse, Panzertuer und Treppe trennen je ihren Ring, offen ist er erreichbar (auch von innen nach aussen nicht ohne die Engstelle): ' + JSON.stringify(r.s));
      t.eq(r.r1, [false, true, true, true], 'Ring 1 ist nur ueber Haupttuer, Seitentuer und Hintertuer erreichbar, jede reicht allein');
      t.eq(r.tun, [false, true], 'Tunnel: zu unerreichbar, offen erreichbar');
      t.ok(r.gatesOk && r.len.every(n => n >= 1 && n <= 2), 'Engstellen sind Oeffnungen und hoechstens 2 Kacheln breit: ' + JSON.stringify(r.len));
    },
  },
  {
    name: 'Notenbank: die Notenpresse ist eine solide Maschine (3x2 Kacheln), E zeigt Noch nicht in Betrieb und aendert nichts',
    async run(t) {
      const r = await t.page.evaluate(`(() => {
        const H = ${SOLO}, D = H.D, T = H.T, pz = D.LAY().nb.press, o = {};
        o.solid = []; for (let y = 0; y < 2; y++) for (let x = 0; x < 3; x++) o.solid.push(H.cl(pz[0] + x, pz[1] + y));
        const it = D.get().its.find(i => i.t === 'nbp'); o.it = !!it; if (it) { o.lab = it.lab(); o.ok = it.ok(H.me); const s0 = [D.get().secured, D.get().phase]; it.act(); o.same = JSON.stringify(s0) === JSON.stringify([D.get().secured, D.get().phase]); o.done = !!it.done; }
        return o; })()`);
      t.eq(r.solid, ['m', 'm', 'm', 'm', 'm', 'm'], 'sechs solide Kacheln');
      t.ok(r.it && /noch nicht in Betrieb/.test(r.lab) && r.ok && r.same && !r.done, 'E-Hinweis, keine halbe Interaktion: ' + JSON.stringify(r));
    },
  },
];
