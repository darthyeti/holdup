// Geiseln (Tills Idee vom 23. Oktober 2026, entschieden am 24. Oktober 2026, Rolle Schutzschild): Im Ueberfall nimmt jeder Spieler per E (halten) einen geduckten Zivilisten oder Angestellten
// zur Geisel (hoechstens eine je Spieler), sie folgt der Laufspur, Spielerkugeln koennen sie toeten (Team-Konto; seit MRU 1 A3 treffen auch Polizeikugeln sie und die Beamten schiessen nicht durch sie, Test 97-geisel-kugelfang), solange eine Geisel im Gebaeude lebt warten
// die Beamten laenger auf ihren Posten (hoechstens CFG.hostage.cap Sekunden je Auftrag), der Scharfschuetze kommt eine Welle frueher, Nehmen und Tod buchen auf das Fahndungslevel (VER 29).
const SETUP = `(seed) => {
  const D = __dbg; D.setScenario('bank'); D.setSeedMode('random'); D.setLage([]); D.setTurn('S'); D.buildSeed(seed || 5017);
  D.CFG.policeAt = 1e6; D.CFG.policeForced = 1e6; D.CFG.hostage.cap = 10;
  D.reset(); D.startHeist(false, D.get().me);
  const run = (n, f) => { for (let i = 0; i < n; i++) { const m = D.get().me; m.hp = 1e9; if (f) f(m, i); D.update(1 / 30); } };
  // ein geduckter Angestellter oder Zivilist, bei dem E wirklich die Geisel waehlt (kein Beute- oder Materialstueck naeher)
  const pick = () => { const m = D.get().me; for (const n of D.get().npcs) { if (n.st !== 'cower' || n.k === 'grd') continue; m.x = n.x; m.y = n.y; const it = D.pickIt(m, -1); if (it && it.t === 'host' && it === D.hostMi(n)) return n; } return null; };
  return { D, run, pick };
}`;

module.exports = [
  {
    name: 'Geiseln: E (halten) nimmt im Ueberfall einen geduckten Zivilisten oder Angestellten, in Phase 1 nicht, hoechstens eine Geisel je Spieler, Wachen sind keine Geiseln',
    async run(t) {
      const r = await t.page.evaluate(`(() => { const S = ${SETUP}, { D } = (D0 => ({ D: D0 }))(__dbg), o = {};
        D.setScenario('bank'); D.setSeedMode('random'); D.setLage([]); D.setTurn('S'); D.buildSeed(5017); D.CFG.policeAt = 1e6; D.CFG.policeForced = 1e6;
        D.reset(); o.p1 = D.itsAll().filter(i => i.t === 'host').length;   // Phase 1: keine Geisel-Objekte
        const T = S(5017), d = T.D; const n = T.pick(); o.found = !!n; if (!n) return o;
        o.cow = d.get().npcs.filter(q => q.st === 'cower').length; o.guardsAsHost = d.itsAll().filter(i => i.t === 'host').length === o.cow;   // jede geduckte NPC (keine Wache) ist ein Ziel
        const m = d.get().me; d.keys.e = true; T.run(20, q => { q.x = n.x; q.y = n.y; }); o.mid = [n.st, +d.itsAll().find(i => i === d.hostMi(n)).pr.toFixed(2)];   // nach 0,67 s noch nicht fertig (1,2 s)
        T.run(30, q => { if (n.st === 'cower') { q.x = n.x; q.y = n.y; } }); d.keys.e = false;
        o.after = [n.st, n.own, d.hasHost(m), d.hostSt().n];
        const n2 = d.get().npcs.find(q => q.st === 'cower' && q.k !== 'grd'); o.second = n2 ? d.hostMi(n2).ok(m) : null;
        const fake = Object.assign({}, n, { k: 'grd', st: 'cower', own: -1, mi: undefined }); o.guard = D.hostMi(fake).ok(m);   // eine Wache waere kein Ziel
        return o; })()`);
      t.eq(r.p1, 0, 'in Phase 1 gibt es keine Geisel-Objekte');
      t.ok(r.found, 'ein Ziel fuer E gefunden');
      t.ok(r.cow >= 2, 'mehrere geduckte Personen: ' + r.cow);
      t.eq(r.mid[0], 'cower', 'nach 0,7 s noch nicht genommen (E halten dauert 1,2 s): ' + JSON.stringify(r.mid));
      t.eq(r.after, ['hostage', 0, true, 1], 'danach Geisel des Spielers 0, Zaehler 1');
      t.eq(r.second, false, 'eine zweite Geisel geht nicht (hoechstens eine je Spieler)');
      t.eq(r.guard, false, 'eine Wache ist keine Geisel');
    },
  },
  {
    name: 'Geiseln: die Geisel folgt der Laufspur des Spielers (Abstand um 44 px), H laesst sie los, sie ist auch frei, wenn der Besitzer am Boden liegt',
    async run(t) {
      const r = await t.page.evaluate(`(() => { const S = ${SETUP}, T = S(5017), D = T.D, o = {}; const n = T.pick(); if (!n) return { found: false };
        const m = D.get().me; D.keys.e = true; T.run(45, q => { if (n.st === 'cower') { q.x = n.x; q.y = n.y; } }); D.keys.e = false; o.st = n.st;
        // eine freie Strecke von 8 Kacheln suchen und entlanglaufen
        const W = D.world(), dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]]; let dir = null;
        for (const [dx, dy] of dirs) { let ok = true; for (let k = 1; k <= 14; k++) if (W.isSol(Math.floor((m.x + dx * k * 16) / 32), Math.floor((m.y + dy * k * 16) / 32))) ok = false; if (ok) { dir = [dx, dy]; break; } }
        o.dir = !!dir; if (!dir) return o;
        const start = [m.x, m.y]; T.run(100, q => { q.x += dir[0] * 2.2; q.y += dir[1] * 2.2; });
        o.walked = Math.round(Math.hypot(m.x - start[0], m.y - start[1])); o.gap = Math.round(Math.hypot(m.x - n.x, m.y - n.y));
        document.querySelector('canvas').dispatchEvent(new KeyboardEvent('keydown', { key: 'h', bubbles: true })); D.update(1 / 30);
        o.freed = [n.st, n.own, D.hasHost(m)];
        // neu nehmen, dann Besitzer am Boden
        D.keys.e = true; T.run(45, q => { if (n.st === 'cower') { q.x = n.x; q.y = n.y; } }); D.keys.e = false; o.again = n.st;
        m.dn = 5; D.update(1 / 30); o.down = [n.st, n.own]; m.dn = 0;
        return o; })()`);
      t.ok(r.found !== false && r.dir, 'Ziel und freie Strecke gefunden: ' + JSON.stringify(r));
      t.eq(r.st, 'hostage', 'Geisel genommen');
      t.ok(r.walked >= 200 && r.gap >= 20 && r.gap <= 90, 'die Geisel folgt im Abstand um 44 px nach ' + r.walked + ' px Weg: ' + r.gap);
      t.eq(r.freed, ['cower', -1, false], 'H laesst die Geisel los (sie duckt sich wieder)');
      t.eq(r.again, 'hostage', 'nach dem Loslassen laesst sie sich neu nehmen');
      t.eq(r.down, ['cower', -1], 'liegt der Besitzer am Boden, ist die Geisel frei');
    },
  },
  {
    name: 'Geiseln: Beamte warten auf ihrem Posten laenger, solange eine Geisel im Gebaeude lebt (hoechstens cap Sekunden), draussen kein Aufschub, ohne Geisel keine Verzoegerung',
    async run(t) {
      const r = await t.page.evaluate(`(() => { const S = ${SETUP}, o = {};
        const post = (D, rt) => { const m = D.get().me, cop = D.mkCop(m.x + 400, m.y, false); cop.mode = 'post'; cop.post = { x: cop.x, y: cop.y, a: 0, door: null }; cop.rt = D.get().tH + rt; cop.hx = D.hostSt().x; cop.cool = 1e9; cop.react = 0; D.get().en.push(cop); return cop; };
        // 1 ohne Geisel: Freigabe nach 5 s
        let T = S(5017), D = T.D; let cop = post(D, 5); T.run(30 * 4); o.free4 = cop.mode; T.run(30 * 2); o.free6 = cop.mode;
        // 2 mit Geisel im Gebaeude: Freigabe erst nach 5 s plus cap (10 s)
        T = S(5017); D = T.D; const n = T.pick(); if (!n) return { found: false }; const m = D.get().me;
        D.keys.e = true; T.run(45, q => { if (n.st === 'cower') { q.x = n.x; q.y = n.y; } }); D.keys.e = false;
        o.hostage = n.st; D.get().en.length = 0; cop = post(D, 5); T.run(30 * 12); o.w12 = [cop.mode, +D.hostSt().x.toFixed(1)]; { const c2 = D.mkCop(m.x, m.y + 2, false); D.toPost(c2); o.hx = [c2.hx, +D.hostSt().x.toFixed(2), c2.mode]; } T.run(30 * 6); o.w18 = [cop.mode, +D.hostSt().x.toFixed(1)];
        // 3 Geisel und Besitzer draussen: kein Aufschub
        T = S(5017); D = T.D; const n3 = T.pick(); const m3 = D.get().me, B = D.LAY().bld;
        D.keys.e = true; T.run(45, q => { if (n3.st === 'cower') { q.x = n3.x; q.y = n3.y; } }); D.keys.e = false; D.get().en.length = 0;
        const ox = (B.x1 + 4) * 32, oy = (B.y1 + 3) * 32; m3.x = ox; m3.y = oy; n3.x = ox - 20; n3.y = oy; m3.tr = [{ x: ox, y: oy }];
        cop = post(D, 5); T.run(30 * 7, q => { q.x = ox; q.y = oy; }); o.out = [n3.st, cop.mode, +D.hostSt().x.toFixed(1)];
        return o; })()`);
      t.ok(r.found !== false, 'Ziel gefunden');
      t.eq([r.free4, r.free6 !== 'post'], ['post', true], 'ohne Geisel wird der Beamte nach 5 s frei: ' + JSON.stringify([r.free4, r.free6]));
      t.eq(r.hostage, 'hostage', 'Geisel genommen');
      t.ok(r.w12[0] === 'post' && r.w12[1] > 8 && r.w12[1] <= 10, 'mit Geisel wartet der Beamte nach 12 s noch (holdX ' + r.w12[1] + '): ' + JSON.stringify(r.w12));
      t.ok(r.hx[0] > 0 && Math.abs(r.hx[0] - r.hx[1]) < .02 && r.hx[2] === 'run', 'ein spaeter eintreffender Beamter merkt sich holdX beim Erreichen des Postens (toPost, hx): ' + JSON.stringify(r.hx));
      t.ok(r.w18[0] !== 'post' && r.w18[1] <= 10.01, 'nach 5 s plus cap 10 s ist er frei, holdX bleibt im Deckel: ' + JSON.stringify(r.w18));
      t.ok(r.out[0] === 'hostage' && r.out[1] !== 'post' && r.out[2] === 0, 'draussen vor dem Gebaeude gibt es keinen Aufschub: ' + JSON.stringify(r.out));
    },
  },
  {
    name: 'Geiseln: nach der ersten Geiselnahme kommt der Scharfschuetze eine Welle frueher (hFrom), Nehmen und Tod buchen auf die Fahndung (heatBook, Deckel)',
    async run(t) {
      const r = await t.page.evaluate(`(() => { const S = ${SETUP}, T = S(5017), D = T.D, o = {};
        o.before = D.hFrom(3, 'snp'); const n = T.pick(); if (!n) return { found: false };
        D.keys.e = true; T.run(45, q => { if (n.st === 'cower') { q.x = n.x; q.y = n.y; } }); D.keys.e = false; o.after = D.hFrom(3, 'snp'); o.swat = D.hFrom(3, 'swat');
        o.calc = D.heatCalc(true).items.map(q => q.join(':'));
        const F = D.CFG.fahndung, base = { win: true, phase: 2, kills: 0, civ: 0, waves: 0, left: 0, goal: false };
        const book = (host, hostDead, civ) => D.heatBook(0, Object.assign({}, base, { host, hostDead, civ: civ || 0 })).items.map(q => q.join(':'));
        o.b = [book(2, 0), book(0, 1, 1), book(9, 9, 0)]; o.F = [F.host, F.hostMax, F.hostDead, F.hostDeadMax];
        return o; })()`);
      t.ok(r.found !== false, 'Ziel gefunden');
      t.eq([r.before, r.after, r.swat], [3, 2, 3], 'Scharfschuetze ab Welle 2 statt 3, SWAT unveraendert');
      t.ok(r.calc.some(x => x.startsWith('Geiseln genommen (1):')), 'die Buchung nennt die Geiselnahme: ' + JSON.stringify(r.calc));
      t.ok(r.b[0].includes('Geiseln genommen (2):8'), 'zwei Geiseln +8: ' + JSON.stringify(r.b[0]));
      t.ok(r.b[1].includes('Geiseln getötet (1):6') && r.b[1].includes('Zivilisten (1):6'), 'eine tote Geisel +6 zusaetzlich zum Zivilisten: ' + JSON.stringify(r.b[1]));
      t.ok(r.b[2].includes('Geiseln genommen (9):12') && r.b[2].includes('Geiseln getötet (9):18'), 'Deckel 12 und 18: ' + JSON.stringify(r.b[2]));
    },
  },
  {
    name: 'Geiseln: Spielerkugeln toeten die Geisel (Team-Konto civKills und hostK), auch eine Explosion',
    async run(t) {
      const r = await t.page.evaluate(`(() => { const S = ${SETUP}, T = S(5017), D = T.D, o = {}; const n = T.pick(); if (!n) return { found: false };
        D.keys.e = true; T.run(45, q => { if (n.st === 'cower') { q.x = n.x; q.y = n.y; } }); D.keys.e = false; const m = D.get().me;
        const shot = (own, x, y, mine) => D.get().bl.push(Object.assign({ id: 9100 + Math.random() * 1e5 | 0, x, y, vx: 720, vy: 0, l: .8, ov: false }, mine ? { o: 1, own, d: 200 } : { o: 0, own: -1, dmg: 8 }));
        const civ0 = D.get().civKills; m.x = n.x - 200; shot(0, n.x - 30, n.y, true); T.run(8, q => { q.x = n.x - 200; q.y = n.y; });
        o.dead = [n.st, D.hostSt().k, D.get().civKills - civ0, D.hasHost(m)];
        // zweite Geisel stirbt durch eine Explosion
        const n2 = D.get().npcs.find(q => q.st === 'cower' && q.k !== 'grd'); if (n2) { D.grabHost(n2, m); const k0 = D.hostSt().k; D.blastAt(n2.x, n2.y, { dmg: 300, r: 80, scorch: 10 }, 0); o.blast = [n2.hp <= 0 || n2.st === 'dead', D.hostSt().k - k0]; }
        return o; })()`);
      t.ok(r.found !== false, 'Ziel gefunden');
      t.eq(r.dead, ['dead', 1, 1, false], 'Spielerkugel: Geisel tot, Team-Zaehler hostK 1 und civKills plus 1, Besitzer wieder frei');
      t.eq(r.blast, [true, 1], 'auch eine Explosion toetet die Geisel und zaehlt in hostK');
    },
  },
  {
    name: 'Geiseln im Coop: der Client nimmt per E eine Geisel (Host rechnet), beide sehen Zustand und Besitzer, H vom Client laesst sie los, der Client sieht den Zaehler',
    async run(t) {
      await t.loadTool('loopnet.js');
      await t.loadInpage('coop.js');
      const r = await t.page.evaluate(() => {
        const G = CT.mkGame('bank', 321, 2), A = G.A, B = G.clients[0], o = {};
        A.CFG.policeAt = 1e6; A.CFG.policeForced = 1e6; A.CFG.hostage.cap = 10;
        B.cv.dispatchEvent(new KeyboardEvent('keydown', { key: 'f', bubbles: true })); G.run(1);
        const live = () => A.get().players.forEach(q => { q.hp = 1e9; q.dead = false; });
        for (let i = 0; i < 90; i++) { live(); step(G.insts, G.net, 1 / 60); }
        const p1 = A.get().players[1]; let n = null;
        for (const q of A.get().npcs) { if (q.st !== 'cower' || q.k === 'grd') continue; p1.x = q.x; p1.y = q.y; const it = A.pickIt(p1, -1); if (it && it === A.hostMi(q)) { n = q; break; } }
        if (!n) return { found: false };
        B.keys.e = true; let seenPr = 0;
        for (let i = 0; i < 60 * 3; i++) { live(); p1.x = n.x; p1.y = n.y; p1.vx = p1.vy = 0; step(G.insts, G.net, 1 / 60); const q2 = B.get().npcs.find(q => q.id === n.id); if (q2 && q2.mi) seenPr = Math.max(seenPr, q2.mi.pr); if (n.st !== 'cower') break; }
        B.keys.e = false; for (let i = 0; i < 30; i++) { live(); step(G.insts, G.net, 1 / 60); }
        const nb = () => B.get().npcs.find(q => q.id === n.id);
        o.seenPr = +seenPr.toFixed(2); o.host = [n.st, n.own]; o.cl = [nb().st, nb().own]; o.cnt = [A.hostSt().n, B.hostSt().n];
        B.cv.dispatchEvent(new KeyboardEvent('keydown', { key: 'h', bubbles: true })); for (let i = 0; i < 30; i++) { live(); step(G.insts, G.net, 1 / 60); }
        o.rel = [n.st, nb().st]; return o;
      });
      t.ok(r.found !== false, 'Ziel gefunden');
      t.ok(r.seenPr > .2, 'der Client sieht den Fortschritt des Nehmens (Ring): ' + r.seenPr);
      t.eq(r.host, ['hostage', 1], 'der Host hat die Geisel des Clients (Spieler 1)');
      t.eq(r.cl, ['hostage', 1], 'der Client sieht Zustand und Besitzer');
      t.eq(r.cnt, [1, 1], 'der Zaehler kommt beim Client an');
      t.eq(r.rel, ['cower', 'cower'], 'H vom Client laesst die Geisel bei beiden los');
    },
  },
];
