// MRU 1 A3 (docs/major-release-update-1.md, docs/ideen-und-planung.md, Zusaetze): Die Geisel ist ein Kugelfang. Kugeln der Polizei (Beamte, Wachen, Scharfschuetzen) treffen Geiseln (vorher gingen sie durch sie hindurch),
// und Beamte und Scharfschuetzen schiessen nicht, wenn eine lebende Geisel zwischen ihnen und dem Spieler nahe der Schusslinie steht (hostBlock, Zusatzradius CFG.hostage.line 10 Pixel zum Koerper). Stirbt die Geisel
// durch eine Polizeikugel, zaehlt das nicht als Zivilistenschreck und nicht in hostK (die Polizei hat geschossen, nicht der Spieler), die Meldung sagt es, der Besitzer ist frei. Zivilisten, die keine Geiseln sind, bleiben
// unberuehrt (Gegnerkugeln treffen nur Spieler und Geiseln). Das Netzformat bleibt (der Host rechnet Kugeln, der Client sieht die Geisel ueber np und das Verschwinden).
// Aufbau: Bank Seed 5017 (Karte nach S gedreht, keine Polizei von allein), ein freier waagrechter Streifen im Gebaeude, Spieler am Ostende, Geisel (direkt per grabHost) und Schuetze davor auf der Linie. Alle Figuren werden
// vor jedem Schritt festgehalten, damit die Geometrie stimmt (die Geisel folgt dem Besitzer sonst).
const HELP = `(() => {
  const D = __dbg, T = 32;
  const strip = () => { const w = D.world(); for (let ty = w.WY0 + 2; ty < w.WY0 + w.H - 2; ty++) for (let tx = w.WX0 + 9; tx < w.WX0 + w.W - 3; tx++) { const x = tx * T + 16, y = ty * T + 16; let ok = true;
    for (let d = -240; d <= 70 && ok; d += 12) for (const dy of [-1, 0, 1]) if (D.isSol(Math.floor((x + d) / T), ty + dy)) ok = false;
    if (ok && D.clear(x - 240, y, x + 70, y) && D.los(x - 240, y, x + 70, y)) return { x, y }; } return null; };
  // Szene: Spieler bei sp, die Geisel n (Besitzer ist der Spieler), die Beamten ausgeraeumt
  const scene = () => { D.setScenario('bank'); D.setSeedMode('random'); D.setLage([]); D.setTurn('S'); D.buildSeed(5017); D.CFG.policeAt = 1e6; D.CFG.policeForced = 1e6;
    D.reset(); D.startHeist(false, D.get().me); const g = D.get(), me = g.me; g.en.length = 0; const sp = strip(); if (!sp) return null;
    const n = g.npcs.find(q => q.st === 'cower' && q.k !== 'grd'), n2 = g.npcs.find(q => q.st === 'cower' && q.k !== 'grd' && q !== n); D.grabHost(n, me); return { D, g, me, n, n2, sp }; };
  const shoot = (x, y, dmg, sn) => D.get().bl.push({ id: 9100 + (Math.random() * 1e5 | 0), x, y, vx: 720, vy: 0, l: .8, o: 0, own: -1, dmg, sn: sn ? 1 : 0 });
  // sek Sekunden Spielzeit, alle Figuren festgehalten (pos: Spieler p, Geisel h, optional Beamter c oder Scharfschuetze c), Rueckgabe: neue Gegnerkugeln (ohne Scharfschuetzen) und Scharfschuss-Kugeln, groesster Zielwert
  const run = (sc, sec, pos, c, f) => { const seen = new Set(), seenSn = new Set(); let aim = 0; for (let i = 0; i < sec * 30; i++) { sc.me.x = pos.p[0]; sc.me.y = pos.p[1]; sc.me.hp = 1e9; sc.n.x = pos.h[0]; sc.n.y = pos.h[1]; if (c) { c.x = pos.c[0]; c.y = pos.c[1]; } if (f) f(i);
    D.update(1 / 30); for (const b of D.get().bl) if (!b.o) (b.sn ? seenSn : seen).add(b.id); if (c && c.kind === 'sniper') aim = Math.max(aim, c.aim); } return { shots: seen.size, sn: seenSn.size, aim }; };
  return { D, strip, scene, shoot, run };
})()`;

module.exports = [
  {
    name: 'Geisel als Kugelfang: Kugeln der Polizei und Scharfschuetzenkugeln treffen die Geisel (92 und 8 und 55 Schaden), sie faengt die Kugel vor dem Spieler ab, nach dem Tod ist der Besitzer frei und kein Zivilistenschreck gebucht',
    async run(t) {
      const r = await t.page.evaluate(`(() => { const H = ${HELP}, D = H.D, out = {}; const sc = H.scene(); out.has = !!sc; if (!sc) return out; const { me, n, n2, sp, g } = sc;
        const pos = () => { me.x = sp.x; me.y = sp.y; n.x = sp.x - 40; n.y = sp.y; };
        const hit = (dmg, sn) => { pos(); me.hp = 100; H.shoot(sp.x - 80, sp.y, dmg, sn); for (let i = 0; i < 6; i++) { pos(); D.update(1 / 30); } return [n.hp, me.hp, D.get().bl.filter(b => !b.o).length]; };
        out.hp0 = n.hp; out.civ0 = [D.get().civKills, D.hostSt().k, me.st.civ]; out.h1 = hit(8, 0);   // Polizeikugel: Geisel -8, der Spieler dahinter bleibt unberuehrt, die Kugel ist weg
        out.h2 = hit(55, 1);                                                                          // Scharfschuetzenkugel: -55
        // ein unbeteiligter, geduckter Zivilist wird von einer Polizeikugel nicht getroffen
        if (n2) { n2.x = sp.x - 150; n2.y = sp.y; const h0 = n2.hp; H.shoot(sp.x - 190, sp.y, 40, 0); for (let i = 0; i < 6; i++) { pos(); n2.x = sp.x - 150; n2.y = sp.y; D.update(1 / 30); } out.civ = [n2.st, n2.hp === h0]; }
        out.h3 = hit(55, 0);                                                                          // der dritte Treffer toetet sie
        out.dead = [!D.get().npcs.includes(n), D.hasHost(me), D.hostSt().k, D.get().civKills, me.st.civ];
        out.feed = D.msgs().feed.join(' | ');
        return out; })()`);
      t.ok(r.has, 'freier Streifen und eine Geisel gefunden');
      t.eq([r.hp0, r.h1[0], r.h1[1], r.h1[2]], [100, 92, 100, 0], 'Polizeikugel: Geisel 100 auf 92, der Spieler hinter ihr unberuehrt, die Kugel ist verbraucht: ' + JSON.stringify([r.hp0, r.h1]));
      t.eq([r.h2[0], r.h2[1]], [37, 100], 'Scharfschuetzenkugel: Geisel 92 auf 37, der Spieler unberuehrt');
      t.eq(r.civ, ['cower', true], 'ein geducktes Zivilistenopfer in der Schusslinie bleibt unverletzt (Gegnerkugeln treffen nur Spieler und Geiseln): ' + JSON.stringify(r.civ));
      t.eq(r.dead, [true, false, 0, 0, 0], 'tot und weg, Besitzer frei, hostK 0, civKills 0 und kein Zivilist im Konto des Spielers (die Polizei hat geschossen)');
      t.ok(/Geisel/.test(r.feed) && /Polizei/.test(r.feed), 'die Meldung nennt Geisel und Polizei: ' + r.feed);
    },
  },
  {
    name: 'Geisel als Kugelfang: Ein Beamter schiesst nicht, solange die Geisel auf der Linie zum Spieler steht (auch knapp daneben), er schiesst, wenn sie seitlich, hinter dem Spieler oder hinter ihm steht oder keine Geisel mehr ist',
    async run(t) {
      const r = await t.page.evaluate(`(() => { const H = ${HELP}, D = H.D, out = {}, V = {};
        // pos: Geisel relativ zum Spieler (hx, hy), der Beamte steht 200 Pixel westlich
        const var1 = (name, hx, hy, release) => { const sc = H.scene(); if (!sc) return; const { me, n, sp } = sc, cop = D.mkCop(sp.x - 200, sp.y, false); D.get().en.push(cop); if (release) D.relHost(me);
          const o = H.run(sc, 4, { p: [sp.x, sp.y], h: [sp.x + hx, sp.y + hy], c: [sp.x - 200, sp.y] }, cop); V[name] = { shots: o.shots, hostHp: n.hp, st: n.st }; };
        var1('frei', -40, 0, true);        // keine Geisel mehr (freigelassen): der Beamte schiesst
        var1('davor', -40, 0);             // mittig auf der Linie
        var1('knapp', -100, 14);           // 14 Pixel neben der Linie, innerhalb Koerper plus Zusatzradius (8 + 10)
        var1('seitlich', -100, 36);        // 36 Pixel neben der Linie: frei
        var1('dahinter', 100, 0);          // hinter dem Spieler (jenseits des Ziels), ausserhalb des Geiselschilds (CFG.hostage.shield 80), naeher schuetzt das Schild, siehe 105-geiselschild
        var1('hinterIhm', -240, 0);        // hinter dem Beamten
        out.V = V; out.line = D.CFG.hostage.line; return out; })()`);
      t.eq(r.line, 10, 'CFG.hostage.line 10');
      t.ok(r.V.frei && r.V.frei.shots >= 3, 'Gegenprobe: ohne Geisel schiesst der Beamte (mindestens 3 Schuesse in 4 s): ' + JSON.stringify(r.V.frei));
      t.eq([r.V.davor.shots, r.V.davor.hostHp, r.V.davor.st], [0, 100, 'hostage'], 'Geisel mittig auf der Linie: kein Schuss, die Geisel unverletzt: ' + JSON.stringify(r.V.davor));
      t.eq(r.V.knapp.shots, 0, 'Geisel knapp neben der Linie (14 Pixel): kein Schuss: ' + JSON.stringify(r.V.knapp));
      t.ok(r.V.seitlich.shots >= 3 && r.V.seitlich.hostHp === 100, 'Geisel 36 Pixel seitlich: der Beamte schiesst wieder, trifft die Geisel nicht: ' + JSON.stringify(r.V.seitlich));
      t.ok(r.V.dahinter.shots >= 3, 'Geisel hinter dem Spieler schuetzt nicht: ' + JSON.stringify(r.V.dahinter));
      t.ok(r.V.hinterIhm.shots >= 3, 'Geisel hinter dem Beamten sperrt nichts: ' + JSON.stringify(r.V.hinterIhm));
    },
  },
  {
    name: 'Geisel als Kugelfang: Ein Scharfschuetze zielt nicht durch die Geisel (und bricht das Zielen ab, sobald sie in die Linie tritt), ohne sie schiesst er nach 1,7 s',
    async run(t) {
      const r = await t.page.evaluate(`(() => { const H = ${HELP}, D = H.D, out = {};
        const mk = () => { const sc = H.scene(); if (!sc) return null; const { sp } = sc, sn = D.mkSniper({ x: sp.x - 230, y: sp.y, a: 0 }); sn.cd = 0; D.get().en.push(sn); sc.sn = sn; return sc; };
        let sc = mk(); out.has = !!sc; if (!sc) return out; D.relHost(sc.me);
        out.frei = H.run(sc, 3, { p: [sc.sp.x, sc.sp.y], h: [sc.sp.x - 40, sc.sp.y], c: [sc.sp.x - 230, sc.sp.y] }, sc.sn);               // keine Geisel: er zielt und schiesst
        sc = mk(); out.block = H.run(sc, 3, { p: [sc.sp.x, sc.sp.y], h: [sc.sp.x - 40, sc.sp.y], c: [sc.sp.x - 230, sc.sp.y] }, sc.sn);       // Geisel auf der Linie
        sc = mk(); const P = { p: [sc.sp.x, sc.sp.y], h: [sc.sp.x - 40, sc.sp.y + 80], c: [sc.sp.x - 230, sc.sp.y] }, Q = { p: P.p, h: [sc.sp.x - 40, sc.sp.y], c: P.c };
        const a1 = H.run(sc, .7, P, sc.sn); const mid = sc.sn.aim; const a2 = H.run(sc, 3, Q, sc.sn);                                        // erst zielt er (Geisel seitlich), dann tritt sie in die Linie
        out.abbruch = { vorher: a1.aim, mid: mid > 0, danachAim: sc.sn.aim, danachShots: a2.sn }; return out; })()`);
      t.ok(r.has, 'Streifen gefunden');
      t.ok(r.frei.aim > 0 && r.frei.sn >= 1, 'Gegenprobe: ohne Geisel zielt der Scharfschuetze und schiesst: ' + JSON.stringify(r.frei));
      t.eq([r.block.aim, r.block.sn], [0, 0], 'Geisel auf der Linie: er zielt nicht und schiesst nicht');
      t.ok(r.abbruch.vorher > 0 && r.abbruch.mid, 'Geisel seitlich: er zielt: ' + JSON.stringify(r.abbruch));
      t.eq([r.abbruch.danachAim, r.abbruch.danachShots], [0, 0], 'tritt die Geisel in die Linie, bricht er ab und schiesst auch danach nicht: ' + JSON.stringify(r.abbruch));
    },
  },
  {
    name: 'Geisel als Kugelfang im Coop: Der Host rechnet den Treffer, der Client sieht die Geisel verschwinden und die Meldung, hostK und civKills bleiben bei beiden 0',
    async run(t) {
      await t.loadTool('loopnet.js'); await t.loadInpage('coop.js');
      const r = await t.page.evaluate(() => {
        const G = CT.mkGame('bank', 321, 2), A = G.A, B = G.clients[0], o = {};
        A.CFG.policeAt = 1e6; A.CFG.policeForced = 1e6;
        B.cv.dispatchEvent(new KeyboardEvent('keydown', { key: 'f', bubbles: true })); G.run(1);
        const me = A.get().players[0], n = A.get().npcs.find(q => q.st === 'cower' && q.k !== 'grd'); if (!n) return { found: false };
        A.grabHost(n, me); G.run(.5); const id = n.id; o.vorher = [A.get().npcs.some(q => q.id === id), B.get().npcs.some(q => q.id === id)];
        A.get().bl.push({ id: 9100, x: n.x - 20, y: n.y, vx: 720, vy: 0, l: .8, o: 0, own: -1, dmg: 300 }); G.run(1);
        o.nachher = [A.get().npcs.some(q => q.id === id), B.get().npcs.some(q => q.id === id)]; o.k = [A.hostSt().k, B.hostSt().k]; o.civ = [A.get().civKills, B.get().civKills];
        o.feed = B.msgs().feed.join(' | '); return o;
      });
      t.ok(r.found !== false, 'Ziel gefunden');
      t.eq(r.vorher, [true, true], 'die Geisel gibt es bei Host und Client');
      t.eq(r.nachher, [false, false], 'nach dem Polizeitreffer ist sie bei beiden weg');
      t.eq([r.k, r.civ], [[0, 0], [0, 0]], 'hostK und civKills bleiben 0');
      t.ok(/Geisel/.test(r.feed) && /Polizei/.test(r.feed), 'der Client sieht die Meldung: ' + r.feed);
    },
  },
];
