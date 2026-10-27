// Bewusstlos ausschalten (Paket Transporter, Schleichen und Optik, T5, Tills Idee vom 27. Oktober 2026, Entscheidungen: Grundfaehigkeit, wer aufwacht schlaegt Alarm, die Polizeiphase bleibt): In der Erkundung (Phase 1) kann man Wachen und Personal
// (nicht Kunden) von hinten ausser Sicht mit E (halten, CFG.ko.t) bewusstlos schlagen (Zustand ko, Item koMi). Der Koerper laesst sich mit E (halten) greifen und langsam ziehen (dg, CFG.ko.drag), H laesst ihn los (Item bodyMi, relBody).
// Sieht eine Wache, ein Angestellter oder eine aktive Kamera den Koerper (CFG.ko.find s lang), gibt es Alarm (startHeist(true)). Nach CFG.ko.wake s wacht er auf und schlaegt Alarm, im Ueberfall steht er als Zivilist wieder auf.
async function setup(t) {
  await t.loadTool('loopnet.js');
  await t.loadInpage('coop.js');
}
// Aufbau: Bank (zufaellige Karte), Phase 1, nur eine Wache im Spiel (alle anderen weg), sie steht still. behind(d) stellt den Spieler d Pixel hinter sie (sie schaut vom Spieler weg).
const SETUP = `(sd) => { const D = __dbg; D.sessReset(); D.setScenario('bank'); D.setSeedMode('random'); D.setLage([]); D.setTurn('S'); D.buildSeed(sd); D.CFG.policeAt = 1e6; D.CFG.policeForced = 1e6;
  const g = D.get(), me = g.me, npcs = g.npcs, n = npcs.find(q => q.k === 'grd' && q.st !== 'away'); for (const q of npcs) if (q !== n) { q.st = 'away'; q.at = 1e9; } n.st = 'idle'; n.still = true; n.alert = 0; n.look = null; n.path = []; for (const c of g.cams) c.off = true;
  const free = (x, y) => [[0, 0], [-9, -9], [9, -9], [-9, 9], [9, 9]].every(q => !D.isSol(Math.floor((x + q[0]) / 32), Math.floor((y + q[1]) / 32)));
  const behind = d => { for (let i = 0; i < 16; i++) { const an = i * Math.PI / 8, x = n.x + Math.cos(an) * d, y = n.y + Math.sin(an) * d; if (free(x, y) && D.los(n.x, n.y, x, y)) { n.base = an + Math.PI; n.a = n.base; me.x = x; me.y = y; return an; } } return null; };
  return { D, g, me, n, npcs, free, behind }; }`;

// Fund: n liegt bewusstlos, der Spieler steht weit weg (am Spawn, nicht verdaechtig). Ein Beobachter (Art kind) steht 150 Pixel vom Koerper: 'sicht' mit Blick, 'weg' abgewandt, 'wand' ohne Sichtlinie,
// 'schlaefer' ist selbst bewusstlos; kind 'cam' nimmt die erste Kamera (alle anderen aus), 'aus' schaltet sie ab. Gibt [Phase kurz nach dem Blick (halbe CFG.ko.find), Phase nach CFG.ko.find plus eine Sekunde, Meldung vom Fund] zurueck.
const OBS = `(kind, how) => { const S = (${SETUP})(5017), { D, me, n, npcs } = S, K = D.CFG.ko, L = D.LAY(); me.x = L.spawn.x; me.y = L.spawn.y; D.koMi(n).act(me);
  const free = (x, y) => !D.isSol(Math.floor(x / 32), Math.floor(y / 32)), d = 150, o = { platz: false };
  const spot = vis => { for (let i = 0; i < 48; i++) { const an = i * Math.PI / 24, x = n.x + Math.cos(an) * d, y = n.y + Math.sin(an) * d; if (free(x, y) && D.los(x, y, n.x, n.y) === vis) return { x, y }; } return null; };
  const sp = spot(how !== 'wand'); if (sp) {
    if (kind === 'cam') { const cams = D.get().cams; cams.forEach((c, i) => { c.off = i !== 0 || how === 'aus'; }); const c = cams[0]; c.x = sp.x; c.y = sp.y; c.a0 = Math.atan2(n.y - sp.y, n.x - sp.x); c.amp = 0; o.platz = true; }
    else { const q = kind === 'grd' ? npcs.find(x => x.k === 'grd' && x !== n) : npcs.find(x => x.k === kind); if (q) { q.st = 'idle'; q.at = 0; q.x = sp.x; q.y = sp.y; q.path = []; q.still = true; q.route = null; q.alert = 0; q.look = null; q.mvg = false; q.base = Math.atan2(n.y - sp.y, n.x - sp.x) + (how === 'weg' ? Math.PI : 0); q.a = q.base; if (how === 'schlaefer') D.koMi(q).act(me); o.platz = true } }
    for (const q of D.get().cams) if (kind !== 'cam') q.off = true; }
  for (let i = 0; i < Math.round(K.find * .5 * 30); i++) D.update(1 / 30); o.frueh = D.get().phase;
  for (let i = 0; i < Math.round((K.find * .5 + 1) * 30); i++) D.update(1 / 30); o.spaet = D.get().phase; o.msg = D.msgs().feed.some(s => /findet|entdeckt/i.test(s)); return o; }`;

module.exports = [
  {
    name: 'Bewusstlos: nur in Phase 1, nur Wachen und Personal (keine Kunden), nur von hinten ausser Sicht, nur ein unaufgeregter Gegner in Reichweite; die Haltezeit ist CFG.ko.t; mit dem Ausschalten sinkt er in den Zustand ko',
    async run(t) {
      await setup(t);
      const r = await t.page.evaluate(`(() => { const S = (${SETUP})(5017), { D, me, n, npcs, behind } = S, o = {}, K = D.CFG.ko; o.cfg = K; o.platz = behind(30) !== null; const it = D.koMi(n); o.dauer = it.dur();
        D.update(1 / 30); o.hinten = it.ok(me); n.base += Math.PI; n.a = n.base; o.vorn = it.ok(me); n.base -= Math.PI; n.a = n.base;
        n.alert = .5; o.alarmiert = it.ok(me); n.alert = 0; n.look = { x: me.x, y: me.y, t: 1 }; o.schaut = it.ok(me); n.look = null;
        me.x = n.x + 400; o.fern = it.ok(me) && Math.hypot(it.x - me.x, it.y - me.y) < it.r; behind(30);
        const civ = npcs.find(q => q.k === 'civ'); const kc = civ ? D.koMi(civ) : null; if (civ) { civ.st = 'idle'; civ.x = n.x; civ.y = n.y; civ.base = n.base; civ.a = civ.base; civ.still = true; D.update(1 / 30); } o.kunde = kc ? kc.ok(me) : 'keiner';
        D.update(1 / 30); o.wieder = it.ok(me); const sp = Math.floor(me.x); me.dn = 1; o.am_boden = it.ok(me); me.dn = 0;
        n.st = 'cower'; o.geduckt = it.ok(me); n.st = 'idle'; D.startHeist(false, me); o.ueberfall = it.ok(me);
        return o; })()`);
      t.eq(r.platz, true, 'Aufbau: ein Platz hinter der Wache'); t.eq(r.dauer, r.cfg.t, 'die Haltezeit ist CFG.ko.t'); t.eq(r.hinten, true, 'von hinten geht es');
      t.eq([r.vorn, r.alarmiert, r.schaut, r.fern], [false, false, false, false], 'nicht von vorn, nicht bei einem aufgeregten oder schauenden Gegner, nicht aus der Ferne'); t.ok(r.kunde === false || r.kunde === 'keiner', 'Kunden nicht: ' + r.kunde);
      t.eq([r.am_boden, r.geduckt, r.ueberfall], [false, false, false], 'nicht am Boden, nicht bei Geduckten, nicht im Ueberfall');
    },
  },
  {
    name: 'Bewusstlos: mit E gehalten wird die Wache nach der Haltezeit ausgeschaltet (Zustand ko, Wecker, still), davor und bei einem Blickwechsel verfaellt der Fortschritt, waehrend des Haltens gilt der Spieler als beim Stehlen (thf), die Kennzahl zaehlt',
    async run(t) {
      await setup(t);
      const r = await t.page.evaluate(`(() => { const S = (${SETUP})(5017), { D, me, n, behind } = S, o = {}, K = D.CFG.ko, keys = D.keys; behind(30);
        keys.e = true; for (let i = 0; i < 30; i++) { D.update(1 / 30); behind(30); } o.mitte = [n.st, +D.koMi(n).pr.toFixed(2), me.thf > 0];
        n.base += Math.PI; n.a = n.base; D.update(1 / 30); o.unterbrochen = [n.st, D.koMi(n).pr]; behind(30); n.alert = 0;
        for (let i = 0; i < 30 * (K.t + .8); i++) { D.update(1 / 30); if (n.st !== 'ko') behind(30); } keys.e = false;
        o.danach = [n.st, Math.round(n.kt), n.mvg, n.alert, D.get().phase, me.st.ko]; o.msg = D.msgs().feed.some(s => /ausgeschaltet|bewusstlos/i.test(s)); o.K = K;
        return o; })()`);
      t.eq(r.mitte[0], 'idle', 'nach einer Sekunde ist noch nichts passiert'); t.ok(r.mitte[1] > .2 && r.mitte[1] < .6, 'der Fortschritt laeuft: ' + r.mitte[1]); t.ok(r.mitte[2], 'waehrend des Haltens ist der Spieler fuers Verdachtssystem beim Stehlen (thf)');
      t.eq(r.unterbrochen[1], 0, 'schaut die Wache um, ist der Fortschritt weg'); t.eq(r.danach[0], 'ko', 'nach der Haltezeit ist sie bewusstlos');
      t.ok(r.danach[1] > r.K.wake - 4 && r.danach[1] <= r.K.wake, 'der Wecker steht bei CFG.ko.wake: ' + r.danach[1]); t.eq([r.danach[2], r.danach[3], r.danach[4], r.danach[5]], [false, 0, 1, 1], 'sie steht still, ist nicht aufgeregt, es ist noch Phase 1, die Kennzahl zaehlt'); t.ok(r.msg, 'eine Meldung nennt das Ausschalten');
    },
  },
  {
    name: 'Bewusstlos: eine Wache oder ein Angestellter, die den Koerper sehen (CFG.ko.find s lang), schlagen Alarm; nicht ohne Blick (abgewandt, hinter der Wand), nicht Kunden, nicht Bewusstlose; eine aktive Kamera sieht ihn auch, eine abgeschaltete nicht',
    async run(t) {
      await setup(t);
      const r = await t.page.evaluate(`(() => { const out = {}, FIND = ${OBS};
        for (const [kind, how] of [['grd', 'sicht'], ['mgr', 'sicht'], ['tel', 'sicht'], ['grd', 'weg'], ['grd', 'wand'], ['civ', 'sicht'], ['grd', 'schlaefer'], ['cam', 'sicht'], ['cam', 'aus']]) out[kind + '/' + how] = FIND(kind, how);
        out.K = __dbg.CFG.ko; return out; })()`);
      const K = r.K, alarm = ['grd/sicht', 'mgr/sicht', 'tel/sicht', 'cam/sicht'], still = ['grd/weg', 'grd/wand', 'civ/sicht', 'grd/schlaefer', 'cam/aus'];
      for (const k of alarm.concat(still)) t.ok(r[k] && r[k].platz, 'Aufbau ' + k + ': ' + JSON.stringify(r[k]));
      for (const k of alarm) { t.eq(r[k].frueh, 1, k + ': kurz nach dem Blick ist noch nichts'); t.eq(r[k].spaet, 2, k + ': nach CFG.ko.find s ist Alarm'); t.ok(r[k].msg, k + ': eine Meldung nennt den Fund'); }
      for (const k of still) t.eq(r[k].spaet, 1, k + ': kein Alarm');
      t.ok(K.find > 0 && K.find < 2, 'CFG.ko.find: ' + K.find);
    },
  },
  {
    name: 'Bewusstlos: nach CFG.ko.wake s wacht die Wache auf und schlaegt Alarm (Ueberfall, sie kaempft als Beamter mit), im Ueberfall steht ein Bewusstloser still als geduckter Zivilist auf, ein Ueberfall in der Zwischenzeit macht aus ihr keinen Beamten',
    async run(t) {
      await setup(t);
      const r = await t.page.evaluate(`(() => { const o = {}, step = (D, sec) => { for (let i = 0; i < sec * 30; i++) D.update(1 / 30); };
        { const S = (${SETUP})(5017), { D, me, n } = S, K = D.CFG.ko, L = D.LAY(); me.x = L.spawn.x; me.y = L.spawn.y; D.koMi(n).act(me); step(D, K.wake - 3); o.vor = [D.get().phase, n.st, Math.round(n.kt)]; step(D, 4);
          const g = D.get(); o.nach = [g.phase, g.npcs.includes(n), g.en.filter(e => e.kind === 'grd').length, D.msgs().feed.filter(s => /wacht auf/i.test(s)).length]; o.K = K; }
        { const S = (${SETUP})(5017), { D, me, n } = S, K = D.CFG.ko, L = D.LAY(); me.x = L.spawn.x; me.y = L.spawn.y; D.koMi(n).act(me); D.startHeist(false, me); const g = D.get(); o.ueb = [g.phase, g.npcs.includes(n), n.st, g.en.filter(e => e.kind === 'grd').length];
          step(D, K.wake + 2); o.auf = [D.get().phase, n.st, D.get().npcs.includes(n), D.msgs().feed.filter(s => /wacht auf/i.test(s)).length]; }
        { const S = (${SETUP})(5017), { D, me, n, npcs } = S, L = D.LAY(); me.x = L.spawn.x; me.y = L.spawn.y; const m = npcs.find(q => q.k === 'mgr' || q.k === 'tel'); m.st = 'idle'; m.still = true; m.path = []; D.koMi(m).act(me); D.startHeist(false, me); o.pers = [m.k, m.st]; }
        return o; })()`);
      t.eq(r.vor, [1, 'ko', 3], 'drei Sekunden vor dem Wecker schlaeft sie noch'); t.eq(r.nach, [2, false, 1, 1], 'sie wacht auf, schlaegt Alarm (Ueberfall) und kaempft als Beamter mit');
      t.eq(r.ueb, [2, true, 'ko', 0], 'ein Ueberfall in der Zwischenzeit macht aus der Bewusstlosen keinen Beamten'); t.eq(r.auf, [2, 'cower', true, 0], 'im Ueberfall steht sie geduckt auf, ohne Meldung und ohne neuen Alarm');
      t.eq(r.pers[1], 'ko', 'auch bewusstloses Personal wird im Ueberfall nicht geduckt');
    },
  },
  {
    name: 'Bewusstlos: den Koerper greift man mit E (halten, CFG.ko.grabT), dann folgt er dem Spieler und bremst ihn auf CFG.ko.drag; H laesst ihn los, ein Ueberfall auch; nur ein Bewusstloser in Reichweite, nur einer je Spieler, nur in der Erkundung',
    async run(t) {
      await setup(t);
      const r = await t.page.evaluate(`(() => { const o = {}, S = (${SETUP})(5017), { D, me, n, npcs, behind } = S, K = D.CFG.ko, keys = D.keys, L = D.LAY(), step = k => { for (let i = 0; i < k; i++) D.update(1 / 30); };
        behind(30); const pos = { x: me.x, y: me.y }; const an0 = D.koMi(n).ok(me); D.koMi(n).act(me); const bi = D.bodyMi(n); o.wach = [an0, bi.t, bi.dur()]; o.ok = [bi.ok(me), me.dg ? 1 : 0, n.dr];
        me.x = n.x + 200; o.fern = bi.ok(me) && Math.hypot(bi.x - me.x, bi.y - me.y) < bi.r; me.x = pos.x; me.y = pos.y; keys.e = true; step(Math.round(K.grabT * 30 / 2)); o.mitte = [n.dr, me.dg ? 1 : 0]; step(Math.round(K.grabT * 30 / 2) + 6); keys.e = false;
        o.gegriffen = [n.dr, me.dg ? 1 : 0, me.id, D.msgs().feed.some(s => /zieh|greif/i.test(s))]; o.fremd = D.bodyMi(n).ok(Object.assign({}, me, { id: 9, dg: 0 }));
        const free = (x0, y0, dx, dy) => { for (let d = 8; d <= 220; d += 8) { const x = x0 + dx * d, y = y0 + dy * d; if (!S.free(x, y) || !D.los(x0, y0, x, y)) return d; } return 220; };
        const dirs = [['d', 1, 0], ['a', -1, 0], ['s', 0, 1], ['w', 0, -1]]; let best = null; for (const dd of dirs) { const f = free(me.x, me.y, dd[1], dd[2]); if (!best || f > best.f) best = { k: dd[0], dx: dd[1], dy: dd[2], f }; } o.platz = best.f;
        const x0 = me.x, y0 = me.y, bx0 = n.x, by0 = n.y; keys[best.k] = true; step(20); const d1 = Math.hypot(me.x - x0, me.y - y0); step(40); keys[best.k] = false; step(6);
        o.folgt = [Math.round(Math.hypot(n.x - me.x, n.y - me.y)), Math.round(Math.hypot(n.x - bx0, n.y - by0)), K.gap];
        o.rel = [D.relBody(me), n.dr, me.dg ? 1 : 0, D.relBody(me)]; me.x = x0; me.y = y0; keys[best.k] = true; step(20); const d2 = Math.hypot(me.x - x0, me.y - y0); keys[best.k] = false; o.tempo = [+(d1 / d2).toFixed(2), K.drag];
        n.dr = -1; me.dg = 0; me.x = n.x + 10; me.y = n.y; keys.e = true; step(Math.round(K.grabT * 30) + 6); keys.e = false; o.zweiter = n.dr;
        const m = npcs.find(q => q.k === 'mgr' || q.k === 'tel'); m.st = 'idle'; m.still = true; m.path = []; D.koMi(m).act(me); m.x = me.x + 10; m.y = me.y; o.nurEiner = D.bodyMi(m).ok(me);
        D.startHeist(false, me); o.ueb = [n.dr, me.dg ? 1 : 0, D.bodyMi(n).ok(me)];
        return o; })()`);
      t.eq(r.wach, [true, 'body', r.wach[2]], 'der Koerper ist ein eigenes Item (body)'); t.eq(r.ok, [true, 0, -1], 'ein Bewusstloser ist greifbar, ohne ihn zu greifen bremst nichts'); t.eq(r.fern, false, 'aus der Ferne nicht');
      t.eq(r.mitte, [-1, 0], 'nach der halben Haltezeit ist er noch nicht gegriffen'); t.eq([r.gegriffen[0], r.gegriffen[1], r.gegriffen[3]], [0, 1, true], 'danach zieht ihn der Spieler (dr, dg), eine Meldung sagt es');
      t.ok(r.platz >= 120, 'Aufbau: genug Platz zum Ziehen: ' + r.platz); t.ok(r.folgt[0] <= r.folgt[2] + 18, 'der Koerper folgt dicht: ' + JSON.stringify(r.folgt)); t.ok(r.folgt[1] > 60, 'und er wurde deutlich bewegt: ' + JSON.stringify(r.folgt));
      t.eq(r.rel, [true, -1, 0, false], 'H laesst ihn los (einmal)'); t.ok(Math.abs(r.tempo[0] - r.tempo[1]) < .08, 'mit Koerper im Schlepptau geht es mit CFG.ko.drag: ' + JSON.stringify(r.tempo));
      t.eq(r.fremd, false, 'ein Koerper, den schon einer zieht, ist fuer andere nicht greifbar'); t.eq(r.zweiter, 0, 'er laesst sich wieder greifen'); t.eq(r.nurEiner, false, 'wer schon einen zieht, greift keinen zweiten'); t.eq(r.ueb, [-1, 0, false], 'ein Ueberfall laesst ihn los und beendet das Ziehen');
    },
  },
  {
    name: 'Bewusstlos im Coop: der Client haelt E hinter der Wache und schaltet sie aus, beide sehen sie als Bewusstlose (Schnappschuss Code 4 mit Wecker, Fortschritt, Zieher), das Ziehen bremst den Client gleich wie den Host, H des Clients laesst los, Versionsnummer 54',
    async run(t) {
      await setup(t);
      const r = await t.page.evaluate(`(() => { const o = {}, G = CT.mkGame('bank', 5017, 2), A = G.A, B = G.clients[0], K = A.CFG.ko, KEY = (d, k) => d.cv.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }));
        A.CFG.policeAt = 1e6; A.CFG.policeForced = 1e6; const ga = A.get(), n = ga.npcs.find(q => q.k === 'grd' && q.st !== 'away'); for (const q of ga.npcs) if (q !== n) { q.st = 'away'; q.at = 1e9; } n.st = 'idle'; n.still = true; n.path = []; n.alert = 0; n.look = null; for (const c of ga.cams) c.off = true;
        const L = A.LAY(); A.get().me.x = L.spawn.x; A.get().me.y = L.spawn.y;
        const free = (x, y) => [[0, 0], [-9, -9], [9, -9], [-9, 9], [9, 9]].every(q => !A.isSol(Math.floor((x + q[0]) / 32), Math.floor((y + q[1]) / 32))); let pos = null; for (let i = 0; i < 16 && !pos; i++) { const an = i * Math.PI / 8, x = n.x + Math.cos(an) * 30, y = n.y + Math.sin(an) * 30; if (free(x, y) && A.los(n.x, n.y, x, y)) pos = { x, y, an }; }
        n.base = pos.an + Math.PI; n.a = n.base; const pa = ga.players[1], pb = B.get().me; o.id = [pa.id, pb.id];
        const put = () => { pa.x = pb.x = pos.x; pa.y = pb.y = pos.y; }; put(); G.run(.3);
        B.keys.e = true; for (let i = 0; i < 20; i++) { put(); n.base = pos.an + Math.PI; n.a = n.base; G.run(.05); } const sn1 = A.buildSnap().np.find(a => a[0] === n.id); o.mitte = [n.st, sn1[12] > 0, B.get().npcs.find(q => q.id === n.id).st];
        for (let i = 0; i < 40 && n.st !== 'ko'; i++) { put(); G.run(.1); } B.keys.e = false; G.run(.5);
        const sn = A.buildSnap().np.find(a => a[0] === n.id), nb = B.get().npcs.find(q => q.id === n.id); o.ko = [n.st, sn[6], sn[11] > 0 && sn[11] <= K.wake, nb.st, pa.st.ko, A.VER];
        B.keys.e = true; G.run(K.grabT + .6); B.keys.e = false; G.run(.4); o.zug = [n.dr, !!pa.dg, !!pb.dg, A.buildSnap().np.find(a => a[0] === n.id)[13], B.get().npcs.find(q => q.id === n.id).dr];
        const free2 = (x0, y0, dx, dy) => { for (let d = 8; d <= 200; d += 8) { const x = x0 + dx * d, y = y0 + dy * d; if (!free(x, y) || !A.los(x0, y0, x, y)) return d; } return 200; };
        let best = null; for (const dd of [['d', 1, 0], ['a', -1, 0], ['s', 0, 1], ['w', 0, -1]]) { const f = free2(pb.x, pb.y, dd[1], dd[2]); if (!best || f > best.f) best = { k: dd[0], f }; } o.platz = best.f; const x0 = pa.x, y0 = pa.y;
        B.keys[best.k] = true; G.run(1.2); B.keys[best.k] = false; G.run(.6); o.tempo = [Math.round(Math.hypot(pa.x - x0, pa.y - y0)), Math.round(Math.hypot(pb.x - pa.x, pb.y - pa.y))];
        KEY(B, 'h'); G.run(.5); o.rel = [n.dr, !!pa.dg, !!pb.dg];
        return o; })()`);
      t.eq(r.id, [1, 1], 'Aufbau: der Client ist Spieler 1'); t.eq(r.mitte[0], 'idle', 'mitten im Halten noch nicht'); t.ok(r.mitte[1], 'der Fortschritt steht im Schnappschuss'); t.eq(r.ko.slice(0, 2), ['ko', 4], 'der Host fuehrt sie als Bewusstlose, der Schnappschuss Code 4');
      t.ok(r.ko[2], 'der Wecker steht im Schnappschuss'); t.eq(r.ko[3], 'ko', 'der Client sieht sie bewusstlos'); t.eq(r.ko[4], 1, 'die Kennzahl zaehlt beim Client-Spieler'); t.eq(r.ko[5], 54, 'Netzformat 54');
      t.eq([r.zug[0], r.zug[1], r.zug[2], r.zug[3], r.zug[4]], [1, true, true, 2, 1], 'der Client zieht: Host und Client wissen es (Zieher 1, im Schnappschuss 2)');
      t.ok(r.platz >= 90, 'Aufbau: Platz: ' + r.platz); t.ok(r.tempo[1] < 22, 'Host und Client stehen am Ende nah beieinander (die Vorhersage bremst gleich): ' + JSON.stringify(r.tempo)); t.ok(r.tempo[0] > 20, 'und er ist gelaufen: ' + JSON.stringify(r.tempo)); t.eq(r.rel, [-1, false, false], 'H des Clients laesst ihn los');
    },
  },
  {
    name: 'Bewusstlos: ein Bewusstloser sieht nichts (kein Verdacht, auch wenn der Spieler beim Stehlen vor ihm steht), ein Bewusstloser auf Streife bleibt liegen, ein aufgeregter oder abgewandter Gegner wird nie ausgeschaltet',
    async run(t) {
      await setup(t);
      const r = await t.page.evaluate(`(() => { const o = {}, step = (D, sec) => { for (let i = 0; i < Math.round(sec * 30); i++) D.update(1 / 30); };
        { const S = (${SETUP})(5017), { D, me, n, behind } = S; behind(80); n.base = Math.atan2(me.y - n.y, me.x - n.x); n.a = n.base; D.get().sus; const hot = () => { me.thf = .6; };
          let sus0 = 0; for (let i = 0; i < 60; i++) { hot(); D.update(1 / 30); sus0 = Math.max(sus0, D.get().sus); } o.wach = [Math.round(sus0), n.alert > 0 || D.get().phase === 2];
          const S2 = (${SETUP})(5017); const D2 = S2.D, m2 = S2.me, g2 = S2.n; S2.behind(80); g2.base = Math.atan2(m2.y - g2.y, m2.x - g2.x); g2.a = g2.base; D2.koMi(g2).act(m2); let sus1 = 0; for (let i = 0; i < 60; i++) { m2.thf = .6; D2.update(1 / 30); sus1 = Math.max(sus1, D2.get().sus); } o.schlaf = [Math.round(sus1), D2.get().phase]; }
        { const S = (${SETUP})(5017), { D, me, n } = S, L = D.LAY(); me.x = L.spawn.x; me.y = L.spawn.y; n.still = false; n.route = [[Math.floor(n.x / 32) + 2, Math.floor(n.y / 32)], [Math.floor(n.x / 32), Math.floor(n.y / 32)]]; n.ri = 0; n.wait = 0; D.koMi(n).act(me); const x0 = n.x, y0 = n.y; step(D, 8); o.streife = Math.round(Math.hypot(n.x - x0, n.y - y0)); }
        return o; })()`);
      t.eq(r.wach[1], true, 'Gegenprobe: eine wache Wache sieht den Dieb (Alarmstufe oder Alarm)'); t.ok(r.wach[0] > 20, 'Gegenprobe: der Verdacht steigt bei wacher Wache: ' + r.wach[0]);
      t.eq(r.schlaf, [0, 1], 'eine bewusstlose Wache sieht nichts: kein Verdacht, kein Alarm'); t.eq(r.streife, 0, 'ein Bewusstloser auf Streife bleibt liegen');
    },
  },
  {
    name: 'Bewusstlos: die Anzeige nennt das Ausschalten (von hinten), das Ziehen, den Wecker (Zzz mit Sekunden) und das Loslassen mit H',
    async run(t) {
      await setup(t);
      const r = await t.page.evaluate(`(() => { const o = {}, S = (${SETUP})(5017), { D, me, n, behind } = S, K = D.CFG.ko, calls = [], orig = CanvasRenderingContext2D.prototype.fillText;
        CanvasRenderingContext2D.prototype.fillText = function (tx) { calls.push(String(tx)); return orig.apply(this, arguments); };
        const texts = () => { calls.length = 0; D.draw(); D.draw(); return calls.slice(); }; const step = k => { for (let i = 0; i < k; i++) D.update(1 / 30); };
        try { behind(30); step(2); o.vorher = texts(); D.koMi(n).act(me); step(2); o.ko = texts(); D.keys.e = true; step(Math.round(K.grabT * 30) + 6); D.keys.e = false; o.zug = texts(); o.dg = me.dg ? 1 : 0; } finally { CanvasRenderingContext2D.prototype.fillText = orig; }
        o.K = K; return o; })()`);
      t.ok(r.vorher.includes('Ausschalten') && r.vorher.includes('von hinten'), 'vor dem Schlag steht Ausschalten (von hinten): ' + JSON.stringify(r.vorher.filter(x => /Ausschalten|hinten/.test(x))));
      t.ok(r.ko.includes('Körper ziehen'), 'danach steht Körper ziehen'); t.ok(r.ko.some(x => /^Zzz \d+ s$/.test(x)), 'der Wecker steht als Zzz mit Sekunden: ' + JSON.stringify(r.ko.filter(x => /Zzz/.test(x))));
      t.eq(r.dg, 1, 'Aufbau: er wird gezogen'); t.ok(r.zug.includes('H: Körper loslassen'), 'beim Ziehen steht H: Körper loslassen');
    },
  },
];
