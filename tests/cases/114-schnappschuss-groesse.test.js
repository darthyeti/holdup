// Schnappschuss-Groesse im Coop (26. Oktober 2026): PeerJS lehnt JSON-Nachrichten ab 16.300 Byte ab (message-too-big) und verwirft sie still, die Verbindung bleibt offen, der Client friert ein.
// Messung (tools/loopnet.js, 4 Spieler, unverwundbar, Polizei ab 3 s, Spieler schiessen nicht, die Partie endet von selbst nach rund 210 s): Bank und Juwelier mit Fahndung 100 und Serienrunde 8 kommen
// auf 147 Gegner (Welle 9) und eine groesste Nachricht von 12.900 Byte. Gegenmassnahme snapFit: Ueber CFG.net.snapB (14.000 Byte) bleiben die Gegner mit dem groessten Abstand zum naechsten Spieler weg,
// Scharfschuetzen nie, reicht das nicht, fallen Ereignisse hinten weg. Netzformat und VER bleiben. Die Tests pruefen die Regel an gebauten Schnappschuessen (Einheit), im Coop mit 330 Gegnern ueber die
// Test-Leitung (Clients sehen die naechsten, Zustandsabgleich ohne falsche Abweichung, Erholung), in einem echten Gefecht mit niedriger Grenze und im Dauergefecht aller Szenarien (slow).
const SETUP = `(() => { const G = CT.mkGame('bank', 321, 2), A = G.A; A.CFG.policeAt = 1e6; A.CFG.policeForced = 1e6; return { G, A }; })()`;
const SETUP4 = `(() => { const G = CT.mkGame('bank', 321, 4), A = G.A; A.CFG.policeAt = 1e6; A.CFG.policeForced = 1e6; G.clients[0].cv.dispatchEvent(new KeyboardEvent('keydown', { key: 'f', bubbles: true })); return { G, A, B: G.clients[0] }; })()`;

// Dauergefecht: 4 Spieler unverwundbar, Polizei ab 3 s, Fahndung 100, Serienrunde 8; schiessen: alle zielen und schiessen auf den naechsten Gegner (sonst stehen sie nur da und die Wellen sammeln sich)
const FIGHT = (sc, shoot, lang) => `(() => { const G = CT.mkGame(${JSON.stringify(sc)}, 321, 4, 60, 20, null, null, ins => { ins[0].SESSION.heat = 100; ins[0].SESSION.round = 8; }), A = G.A; A.CFG.policeAt = 3; A.CFG.policeForced = 3; if (${!!lang}) A.CFG.vanStay = 1e6;   // lang: der Fluchtwagen wartet ewig, das Gefecht geht ueber die natuerlichen 210 s hinaus
  G.clients[0].cv.dispatchEvent(new KeyboardEvent('keydown', { key: 'f', bubbles: true }));
  const keep = () => A.get().players.forEach(p => { p.hp = 1e9; p.res = 999; if (p.mag < 3) p.mag = 12; });
  const aim = () => { for (const d of G.insts) { const g = d.get(), me = g.me; if (!me) continue; let best = null, bd = 1e12; for (const e of g.en) { if (e.hp <= 0) continue; const dd = (e.x - me.x) ** 2 + (e.y - me.y) ** 2; if (dd < bd) { bd = dd; best = e; } } if (best) { d.mouse.x = best.x; d.mouse.y = best.y; d.mouse.t = g.time; d.keys[' '] = ${shoot ? 1 : 0}; } } };
  let enMax = 0, sec = 0, wave = 0;
  for (; sec < ${lang ? 420 : 300}; sec++) { for (let i = 0; i < 60; i++) { keep(); if (i % 6 === 0) aim(); G.run(1 / 60); } const g = A.get(); enMax = Math.max(enMax, g.en.length); if (g.ended) break; }
  return { stat: G.net.stat, snapB: A.CFG.net.snapB, cut: A.NET.cut, enMax, sec, kills: A.get().kills, wave: A.get().waveN, conns: A.NET.conns.length, bad: A.flogStat().bad, n: A.flogStat().n }; })()`;
const SCS = ['bank', 'truck', 'jewel', 'gas', 'museum', 'casino'];

function fightTest(sc, shoot, enMin, lang) {
  return {
    name: `Dauergefecht${lang ? ' über die natürliche Dauer hinaus (420 s, Fluchtwagen wartet ewig, ohne Gegenmaßnahme über 16.300 Byte)' : ''} (${sc}, ${shoot ? 'Spieler schießen zurück' : 'Spieler stehen nur da'}, 4 Spieler unverwundbar, Fahndung 100, Runde 8): keine Nachricht erreicht die PeerJS-Grenze, die größte bleibt unter CFG.net.snapB`,
    slow: true, timeout: lang ? 600000 : 300000,
    async run(t) {
      await t.loadTool('loopnet.js'); await t.loadInpage('coop.js');
      const r = await t.page.evaluate(FIGHT(sc, shoot, lang));
      t.note(`${sc}: ${r.sec} s, Welle ${r.wave}, höchstens ${r.enMax} Gegner, ${r.kills} Abschüsse, größte Nachricht ${r.stat.max} Byte, Kürzungen ${r.cut.n} (höchstens ${r.cut.en} Gegner, ${r.cut.ev} Ereignisse), Abgleich ${r.n} Vergleiche`);
      t.eq(r.stat.big, 0, 'die Test-Leitung hat keine Nachricht ab 16.300 Byte weggeworfen');
      t.ok(r.stat.max <= r.snapB, `größte Nachricht ${r.stat.max} Byte liegt über der Grenze ${r.snapB}`);
      t.ok(r.enMax >= enMin, `das Gefecht war groß genug (mindestens ${enMin} Gegner gleichzeitig, waren ${r.enMax})`);
      if (lang) t.ok(r.cut.n > 100 && r.cut.en > 50, 'ohne Kürzung wäre die Nachricht zu groß geworden, der Host hat gekürzt: ' + JSON.stringify(r.cut));
      t.eq(r.conns, 3, 'alle drei Verbindungen sind noch offen');
      t.eq(r.bad, 0, 'Host und Clients weichen im Zustandsabgleich nicht ab (' + r.n + ' Vergleiche)');
    },
  };
}

module.exports = [
  {
    name: 'snapFit (Einheit): unter der Grenze bleibt der Schnappschuss unverändert, darüber fallen die entferntesten Gegner weg (Reihenfolge der übrigen bleibt, Scharfschützen bleiben), das Ergebnis liegt knapp unter der Grenze',
    async run(t) {
      await t.loadTool('loopnet.js'); await t.loadInpage('coop.js');
      const r = await t.page.evaluate(`(() => { const { G, A } = ${SETUP}, o = {}; G.run(1);
        const P = A.get().players, near = a => Math.min(...P.map(p => Math.hypot(a[2] - p.x, a[3] - p.y))), enc = new TextEncoder(), bytes = x => enc.encode(JSON.stringify(x)).length;
        // Gegner i steht 40 + 6 * i Pixel vor Spieler 0; die Zeilen liegen gemischt (137 * i mod 401), die Reihenfolge der Liste sagt also nichts ueber den Abstand
        const base = A.buildSnap(), mk = n => { const s = JSON.parse(JSON.stringify(base)); s.en = []; for (let j = 1; j <= n; j++) { const i = n === 400 ? (137 * j) % 401 : j; s.en.push([i, i % 5 === 0 ? 1 : 0, Math.round((P[0].x + 40 + 6 * i) * 10) / 10, P[0].y, 1.57, 100, 100, 0.25, 1, 0, 0, 0, 0, 0]); } return s; };
        const snapB = A.CFG.net.snapB, ovh = A.CFG.net.ovh; o.snapB = snapB;
        // (a) 20 Gegner: nichts passiert
        let s = mk(20); const before = JSON.stringify(s), ev = [['say', ['Hallo']]], evBefore = JSON.stringify(ev); o.a = [A.snapFit(s, [ev]), JSON.stringify(s) === before, JSON.stringify(ev) === evBefore, A.NET.cut.n];
        // (b) 400 Gegner (ueber 20 KB): die naechsten bleiben, in der alten Reihenfolge
        s = mk(400); s.en.push([9001, 4, Math.round((P[0].x + 5000) * 10) / 10, P[0].y, 0, 60, 60, 0, 0, 0, 0, 0, 0, 0]);   // Scharfschuetze ganz weit weg
        o.groess = bytes(s); const dropped = A.snapFit(s, [ev, []]);
        const ids = s.en.map(a => a[0]), norm = ids.filter(i => i !== 9001), K = norm.length, orig = mk(400).en.map(a => a[0]);
        o.b = { dropped, K, snipe: ids.includes(9001), nah: JSON.stringify(norm) === JSON.stringify(orig.filter(i => i <= K)), sum: dropped + K, total: bytes(Object.assign({ ev }, s)), luft: snapB - bytes(Object.assign({ ev }, s)), cut: A.NET.cut.n };
        // (c) Ereignisse zu viele: erst alle Gegner (ausser Scharfschuetzen), dann Ereignisse hinten weg, Anfang bleibt
        // Die Ereignisse werden halbiert, bis sie passen: n = 8 * m, wobei m Ereignisse den Spielraum um 100 bis 200 Byte ueberschreiten (m passt noch nicht, m / 2 passt)
        s = mk(60); s.en.push([9001, 4, P[0].x + 900, P[0].y, 0, 60, 60, 0, 0, 0, 0, 0, 0, 0]); const sOhne = JSON.parse(JSON.stringify(s)); sOhne.en = [s.en[s.en.length - 1]];
        const room = snapB - ovh - bytes(sOhne), eb = bytes(['sp', [100.5, 200.5, 16]]) + 1, m = Math.floor((room + 150) / eb), evs = [Array.from({ length: 8 * m }, () => ['sp', [100.5, 200.5, 16]]), []], first = JSON.stringify(evs[0][0]);
        o.cm = [m * eb - room];
        A.snapFit(s, evs); o.c = { en: s.en.map(a => a[0]), ev0: evs[0].length, m, ev1: evs[1].length, erster: JSON.stringify(evs[0][0]) === first, total: bytes(Object.assign({ ev: evs[0] }, s)), evMax: A.NET.cut.ev };
        // (e) zwei Spieler weit auseinander: Gegner bei Spieler 1 sind nah an einem Spieler und bleiben, auch wenn sie weit von Spieler 0 stehen
        const x1 = P[1].x, y1 = P[1].y; P[1].x = P[0].x + 2000; P[1].y = P[0].y; s = mk(400); A.snapFit(s, [[]]); const keptE = new Set(s.en.map(a => a[0]));
        o.e = { nah: Array.from({ length: 32 }, (_, i) => 311 + i).filter(i => !keptE.has(i)).length, K: keptE.size }; P[1].x = x1; P[1].y = y1;
        // (d) Byte statt Zeichen: Umlaute und CJK sind in UTF-8 laenger als im String
        const txt = 'Überfall 漢字漢字漢字 ÄÖÜ ß'; s = mk(0); const nEv = Math.floor((snapB - 300 - bytes(s) - ovh) / (JSON.stringify(['say', [txt]]).length + 1)), evB = [Array.from({ length: nEv }, () => ['say', [txt]])];
        o.d = { nEv, zeichen: JSON.stringify(evB[0]).length + bytes(s) + ovh < snapB, bytesVorher: bytes(evB[0]) + bytes(s) + ovh > snapB }; A.snapFit(s, evB); o.d.nachher = bytes(Object.assign({ ev: evB[0] }, s)); o.d.n = evB[0].length;
        return o; })()`);
      t.eq(r.a, [0, true, true, 0], '(a) unter der Grenze: 0 weggelassen, Schnappschuss und Ereignisse unverändert, keine Kürzung gezählt');
      t.ok(r.groess > 16300, '(b) der ungekürzte Schnappschuss wäre für PeerJS zu groß: ' + r.groess);
      t.eq([r.b.sum, r.b.dropped > 100, r.b.snipe, r.b.nah, r.b.cut], [400, true, true, true, 1], '(b) 400 Gegner (Liste gemischt): genau die K nächsten bleiben, in der Reihenfolge der Liste, der Scharfschütze bleibt, eine Kürzung gezählt');
      t.ok(r.b.total <= r.snapB, '(b) Nachricht mit Ereignissen liegt unter der Grenze: ' + r.b.total);
      t.ok(r.b.luft < 80, '(b) es fällt nicht mehr weg als nötig (weniger als ein Gegner Luft): ' + r.b.luft);
      t.eq(r.c.en, [9001], '(c) bei zu vielen Ereignissen bleibt vom Gegnerblock nur der Scharfschütze');
      t.ok(r.cm[0] > 0 && r.cm[0] < 300, '(c) der Test ist scharf: m Ereignisse überschreiten den Spielraum um wenige Byte: ' + r.cm[0]);
      t.eq([r.c.ev0, r.c.erster], [r.c.m >> 1, true], '(c) die Ereignisse werden von 8 m durch Halbieren auf m / 2 hinten gekürzt, der Anfang bleibt');
      t.ok(r.c.total <= r.snapB && r.c.evMax > 0, '(c) die Nachricht liegt unter der Grenze (' + r.c.total + '), die gekürzten Ereignisse sind gezählt');
      t.eq([r.e.nah, r.e.K < 400], [0, true], '(e) zwei Spieler weit auseinander: alle 32 Gegner nahe Spieler 1 bleiben (gezählt wird der Abstand zum nächsten Spieler, nicht zu Spieler 0), es wurde gekürzt');
      t.ok(r.d.zeichen && r.d.bytesVorher, '(d) der Test ist scharf: nach Zeichen läge die Nachricht unter, nach Byte über der Grenze');
      t.ok(r.d.nachher <= r.snapB && r.d.n < r.d.nEv && r.d.n > 100, '(d) nach Byte gerechnet passt es: ' + r.d.nachher + ' Byte, ' + r.d.n + ' von ' + r.d.nEv + ' Ereignissen');
    },
  },
  {
    name: 'Coop mit 330 Gegnern (Test-Leitung, 4 Spieler): nichts erreicht die PeerJS-Grenze, die Clients sehen die nächsten Gegner, der Zustandsabgleich meldet keine falsche Abweichung, das Flugschreiber-Ereignis snapgrenze steht im Log, nach dem Aufräumen sehen die Clients wieder alle',
    async run(t) {
      await t.loadTool('loopnet.js'); await t.loadInpage('coop.js');
      const r = await t.page.evaluate(`(() => { const { G, A, B } = ${SETUP4}, o = {}; G.run(1);
        const sp = A.LAY().spawn, keep = () => A.get().players.forEach(p => { p.hp = 1e9; });
        for (let i = 0; i < 330; i++) { const e = A.mkCop(sp.x + ((i * 37) % 900) - 450, sp.y + 30 + ((i * 53) % 500), false); e.cool = 1e9; e.spd = 0; A.get().en.push(e); }
        for (let i = 0; i < 60 * 13; i++) { keep(); G.run(1 / 60); }
        const P = A.get().players, near = e => Math.min(...P.map(p => Math.hypot(e.x - p.x, e.y - p.y))), host = A.get().en.slice().sort((a, b) => near(a) - near(b)), cl = new Set(B.get().en.map(e => e.id));
        o.stat = G.net.stat; o.snapB = A.CFG.net.snapB; o.cut = A.NET.cut; o.host = A.get().en.length; o.client = B.get().en.length; o.nahe = host.slice(0, 40).filter(e => cl.has(e.id)).length;
        o.flog = A.flog().dump().ereignisse.filter(e => e[2] === 'snapgrenze').length; const st = A.flogStat(); o.abgleich = [st.n, st.bad, st.letzte.slice(-1).map(x => x.d)]; o.conns = [A.NET.conns.length, B.state().role];
        const n0 = A.NET.cut.n; A.get().en.length = 0; for (let i = 0; i < 90; i++) { keep(); G.run(1 / 60); } o.nachher = [B.get().en.length, A.NET.cut.n - n0 <= 3];
        return o; })()`);
      t.eq(r.stat.big, 0, 'die Test-Leitung hat keine Nachricht ab 16.300 Byte weggeworfen');
      t.ok(r.stat.max <= r.snapB, `größte Nachricht ${r.stat.max} Byte liegt über der Grenze ${r.snapB}`);
      t.ok(r.cut.n > 20 && r.cut.en > 50, 'der Host hat gekürzt: ' + JSON.stringify(r.cut));
      t.ok(r.client > 100 && r.client < r.host, `der Client sieht einen Teil: ${r.client} von ${r.host} Gegnern`);
      t.eq(r.nahe, 40, 'die 40 nächsten Gegner des Hosts sind alle beim Client');
      t.ok(r.flog >= 1, 'das Flugschreiber-Ereignis snapgrenze steht im Log des Hosts');
      t.ok(r.abgleich[0] >= 2 && r.abgleich[1] === 0, 'Zustandsabgleich: mindestens 2 Vergleiche ohne Abweichung (die Zahl der Gegner stimmt trotz Kürzung): ' + JSON.stringify(r.abgleich));
      t.eq(r.conns, [3, 'client'], 'die Verbindungen bleiben offen');
      t.eq(r.nachher, [0, true], 'ohne Gegner sieht der Client keine mehr, es wird nicht weiter gekürzt');
    },
  },
  {
    name: 'Gefecht mit niedriger Grenze (Bank, CFG.net.snapB 5000): die Wellen füllen die Nachricht bis zur Grenze, es wird gekürzt statt verworfen, die Clients spielen ohne Lücke weiter',
    async run(t) {
      await t.loadTool('loopnet.js'); await t.loadInpage('coop.js');
      const r = await t.page.evaluate(`(() => { const G = CT.mkGame('bank', 321, 4), A = G.A, B = G.clients[0]; A.CFG.policeAt = 3; A.CFG.policeForced = 3; A.CFG.net.snapB = 5000;
        B.cv.dispatchEvent(new KeyboardEvent('keydown', { key: 'f', bubbles: true })); const keep = () => A.get().players.forEach(p => { p.hp = 1e9; }); let gap = 0;
        for (let s = 0; s < 160; s++) { for (let i = 0; i < 60; i++) { keep(); G.run(1 / 60); } const T = B.get().time; gap = Math.max(gap, A.get().time - T); }
        const st = A.flogStat(); return { stat: G.net.stat, cut: A.NET.cut, en: A.get().en.length, client: B.get().en.length, gap, wave: A.get().waveN, abgleich: [st.n, st.bad], ende: !!A.get().ended }; })()`);
      t.eq(r.stat.big, 0, 'keine Nachricht ab 16.300 Byte');
      t.ok(r.stat.max <= 5000, 'größte Nachricht ' + r.stat.max + ' Byte liegt über der gesetzten Grenze 5000');
      t.ok(r.cut.n > 100 && r.cut.en > 10, 'gekürzt wurde oft: ' + JSON.stringify(r.cut));
      t.ok(r.client > 10 && r.client < r.en, `der Client sieht einen Teil: ${r.client} von ${r.en}`);
      t.ok(r.gap < 0.6, 'der Client hinkt dem Host höchstens ' + r.gap.toFixed(2) + ' s hinterher (Latenz 60 bis 80 ms, keine verworfenen Schnappschüsse)');
      t.eq(r.abgleich[1], 0, 'keine Abweichung im Zustandsabgleich (' + r.abgleich[0] + ' Vergleiche)');
      t.eq(r.ende, false, 'die Partie lief noch');
    },
  },
  {
    name: 'Normalbetrieb: bei einer Partie mit wenigen Gegnern (Welle 1 und 2, 4 Spieler) wird nie gekürzt',
    async run(t) {
      await t.loadTool('loopnet.js'); await t.loadInpage('coop.js');
      const r = await t.page.evaluate(`(() => { const { G, A, B } = ${SETUP4}, o = {}; A.CFG.policeAt = 3; A.CFG.policeForced = 3; const keep = () => A.get().players.forEach(p => { p.hp = 1e9; });
        for (let i = 0; i < 60 * 40; i++) { keep(); G.run(1 / 60); } o.cut = A.NET.cut.n; o.stat = G.net.stat; o.en = A.get().en.length; return o; })()`);
      t.eq(r.cut, 0, 'keine Kürzung bei ' + r.en + ' Gegnern');
      t.eq(r.stat.big, 0, 'nichts verworfen');
    },
  },
  ...SCS.map(sc => fightTest(sc, false, sc === 'truck' ? 5 : sc === 'gas' || sc === 'museum' || sc === 'casino' ? 70 : 100)),
  fightTest('bank', false, 200, true),
  fightTest('bank', true, 20),
  fightTest('jewel', true, 20),
  fightTest('casino', true, 20),
];
