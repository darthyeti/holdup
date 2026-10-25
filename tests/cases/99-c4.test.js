// MRU 1 B3 (docs/major-release-update-1.md, docs/ideen-und-planung.md, Skillbaum-Umbau, Gegenstaende, C4): C4 (Knoten U4, hinter Techniker) ist ein E-Objekt neben dem vorhandenen Oeffnen (Code, Bohrer, Schluessel): am Tresor aller
// Karten mit Tresor (Bank, Juwelier, Tankstelle, Museum, Casino, das gemeinsame Item vault) und am Laderaum des Geldtransporters (Item c4 und c4t, zwei Aktionen auf demselben Ding sind zwei Objekte). Es oeffnet sofort (Dauer
// CFG.c4.t), ist laut (im Erkunden loest es sofort den Alarm aus startHeist(true), im Ueberfall kommt die Polizei CFG.c4.pol Sekunden frueher) und vernichtet einen Teil der Beute dort (CFG.c4.loss, die Stufen sparen davon save, mindestens
// ein Stueck, Flag lost am Item, zaehlt nicht fuer das Nebenziel). 1 Stueck je Auftrag (cnt 1, 1, 1: es gibt je Auftrag nur einen Tresor, mehr Stuecke haetten kein Ziel, die Stufen bringen weniger Verlust). Die E-Auswahl
// bevorzugt C4 nur, wenn man es braucht (Ueberfall oder kein Code, Transporter ohne Schluessel), sonst bleibt das leise Oeffnen vorn (rk). Netz: lo (verlorene Stuecke) im Schnappschuss, Vorrat als Index 31 der Spielerzeile (VER 38).
const HELP = `(() => {
  const D = __dbg;
  // Szene: Bank Seed 5017, sk setzt den Skillbaum, phase1 laesst im Erkunden; me steht am Tresor
  const bank = (sk, phase1) => { D.sessReset(); Object.assign(D.SESSION.sk, sk || {}); D.setScenario('bank'); D.setSeedMode('random'); D.setLage([]); D.setTurn('S'); D.buildSeed(5017); D.CFG.policeAt = 1e6; D.CFG.policeForced = 1e6;
    D.reset(); if (!phase1) D.startHeist(false, D.get().me); const g = D.get(), me = g.me, vi = g.its.find(i => i.t === 'vault'), c4 = g.its.find(i => i.t === 'c4'); me.x = vi.x; me.y = vi.y; me.hp = 1e9; return { D, g, me, vi, c4 }; };
  const stock = (sk) => { const s = bank(sk, true); return s.me.c4 | 0; };
  return { D, bank, stock };
})()`;

module.exports = [
  {
    name: 'C4: Knoten U4 ist kein Platzhalter mehr (cnt 1, 1, 1, save 25, 50, 75 %), ein Stueck am Start mit dem Knoten, ohne ihn keins, das Item sitzt am Tresor, nur noch der Notfallkoffer und die zwei Waffen bleiben Platzhalter',
    async run(t) {
      const r = await t.page.evaluate(`(() => { const H = ${HELP}, D = H.D, S = D.CFG.skill, o = {}; o.node = [S.U4.n, !!S.U4.soon, S.U4.cnt, S.U4.save]; o.still = ['A3', 'A4', 'U3'].map(id => !!S[id].soon); o.cfg = Object.keys(D.CFG.c4 || {}).sort();
        o.stock = [{}, { U4: 1 }, { U4: 2 }, { U4: 3 }].map(sk => H.stock(sk)); const b = H.bank({ U4: 1 }); o.item = [!!b.c4, b.c4 && Math.round(b.c4.x - b.vi.x), b.c4 && Math.round(b.c4.y - b.vi.y), b.c4 && b.c4.r];
        o.ok = [b.c4.ok(b.me), (b.me.c4 = 0, b.c4.ok(b.me)), (b.me.c4 = 1, b.g.vaultOpen)];
        o.info = D.pinfo(b.c4, b.me); return o; })()`);
      t.eq(r.node, ['C4', false, [1, 1, 1], [.25, .5, .75]], 'U4: kein soon, ein Stueck, spart 25, 50, 75 % des Verlusts');
      t.eq(r.still, [true, true, true], 'Praezisionsgewehr, Granatwerfer und Notfallkoffer bleiben Platzhalter');
      t.eq(r.cfg, ['loss', 'pol', 'rk', 't'], 'CFG.c4: loss, pol, rk, t');
      t.eq(r.stock, [0, 1, 1, 1], 'ein Stueck je Auftrag mit dem Knoten, sonst keins');
      t.eq(r.item, [true, 0, 0, 58], 'das C4-Objekt sitzt am Tresor');
      t.eq(r.ok, [true, false, false], 'bei geschlossenem Tresor und mit Vorrat nutzbar, ohne Vorrat nicht');
      t.eq([r.info.i, r.info.c, r.info.v, r.info.loud], ['bomb', 'r', 'Sprengen', true], 'der Hinweis: Symbol, rot, Sprengen, laut');
    },
  },
  {
    name: 'C4 am Tresor im Ueberfall: oeffnet sofort, vernichtet einen Teil der Beute (loss mal 1 minus save, mindestens ein Stueck, lost zaehlt nicht fuers Nebenziel), die Polizei kommt frueher, der Rest bleibt einpackbar',
    async run(t) {
      const r = await t.page.evaluate(`(() => { const H = ${HELP}, D = H.D, C = D.CFG.c4, o = { stages: [] };
        for (const lv of [1, 2, 3]) { const b = H.bank({ U4: lv }); const n = b.g.its.filter(i => i.t === 'bundle').length, pol0 = D.get().policeAt, tH0 = D.get().tH; b.c4.act(b.me); const g = D.get();
          const lost = g.its.filter(i => i.lost).length, left = g.its.filter(i => i.t === 'bundle' && !i.done && i.ok(b.me)).length;
          o.stages.push({ lv, n, lost, want: Math.max(1, Math.round(n * C.loss * (1 - [.25, .5, .75][lv - 1]))), left, open: g.vaultOpen, c4: b.me.c4, pol: [pol0, g.policeAt, Math.ceil(tH0) + 3], done: g.its.filter(i => i.done).length, gd: D.goalDone() }); }
        D.CFG.c4.loss = .05; { const b = H.bank({ U4: 3 }); b.c4.act(b.me); o.min = D.get().its.filter(i => i.lost).length; } D.CFG.c4.loss = .4;   // so klein, dass gerundet null herauskaeme: mindestens ein Stueck
        o.feed = D.msgs().feed.join(' | ');
        return o; })()`);
      for (const s of r.stages) {
        t.eq([s.open, s.c4, s.lost, s.left, s.done, s.gd], [true, 0, s.want, s.n - s.want, s.want, 0], 'Stufe ' + s.lv + ': Tresor offen, Stueck verbraucht, ' + s.want + ' von ' + s.n + ' Beutestuecken verbrannt, der Rest einpackbar, lost zaehlt nicht als geholt: ' + JSON.stringify(s));
        t.eq(s.pol[1], Math.max(s.pol[2], s.pol[0] - 12), 'Stufe ' + s.lv + ': die Polizei kommt 12 s frueher (mindestens 3 s nach jetzt): ' + JSON.stringify(s.pol));
      }
      t.eq(r.min, 1, 'selbst bei kleinstem Verlust (0,05) verbrennt mindestens ein Stueck, C4 hat immer einen Preis');
      t.ok(r.stages[0].want > r.stages[2].want || r.stages[0].want >= r.stages[2].want, 'die Stufen sparen Beute (Verlust nimmt nicht zu)');
      t.ok(/spreng/i.test(r.feed) && /verbrannt/.test(r.feed), 'die Meldung nennt die Sprengung und den Verlust: ' + r.feed);
    },
  },
  {
    name: 'C4 im Erkunden loest sofort den Alarm aus (Ueberfall mit erzwungenem Alarm, Polizei in CFG.policeForced), oeffnet den Tresor und verbrennt Beute',
    async run(t) {
      const r = await t.page.evaluate(`(() => { const H = ${HELP}, D = H.D, o = {}; const b = H.bank({ U4: 2 }, true); D.CFG.policeForced = 20; o.p1 = [D.get().phase, D.get().vaultOpen]; b.c4.act(b.me); const g = D.get();
        o.p2 = [g.phase, g.vaultOpen, g.policeAt, g.its.filter(i => i.lost).length > 0, b.me.c4]; o.by = g.alarmBy; o.feed = D.msgs().feed.join(' | '); return o; })()`);
      t.eq(r.p1, [1, false], 'vorher: Erkunden, Tresor zu');
      t.eq(r.p2, [2, true, 20, true, 0], 'danach: Ueberfall, Tresor offen, Polizei in 20 s (erzwungener Alarm), Beute verbrannt, Stueck weg');
      t.ok(/Alarm|ENTDECKT|Tresor/i.test(r.feed), 'Meldung: ' + r.feed);
    },
  },
  {
    name: 'C4: die E-Auswahl nimmt es nur, wenn man es braucht (Ueberfall ohne Code), sonst bleibt das leise Oeffnen vorn (Erkunden mit Code, ohne Vorrat); Q waehlt es immer von Hand',
    async run(t) {
      const r = await t.page.evaluate(`(() => { const H = ${HELP}, D = H.D, o = {};
        let b = H.bank({ U4: 1 }); o.ueberfall = D.pickIt(b.me, -1) && D.pickIt(b.me, -1).t;                                 // Phase 2, kein Code: C4 vorn
        b.me.c4 = 0; o.ohneVorrat = D.pickIt(b.me, -1) && D.pickIt(b.me, -1).t;
        b = H.bank({ U4: 1 }, true); b.g.its.find(i => i.t === 'note').act(); o.code = D.get().code; o.erkunden = D.pickIt(b.me, -1) && D.pickIt(b.me, -1).t;      // Phase 1 mit Code: leise oeffnen vorn
        const idx = D.itsAll().indexOf(b.c4); o.q = D.pickIt(b.me, idx) === b.c4;                                            // von Hand gewaehlt
        o.cands = D.cands(b.me).map(i => i.t);
        return o; })()`);
      t.eq(r.ueberfall, 'c4', 'Ueberfall ohne Code: C4 steht vorn');
      t.eq(r.ohneVorrat, 'vault', 'ohne Vorrat bleibt das normale Aufbohren');
      t.eq([r.code, r.erkunden], [true, 'vault'], 'Erkunden mit Code: das leise Oeffnen steht vorn, nicht die laute Sprengung');
      t.ok(r.q, 'mit Q (von Hand gewaehlt) geht C4 trotzdem');
      t.ok(r.cands.includes('c4') && r.cands.includes('vault'), 'beide stehen in der Kandidatenliste: ' + JSON.stringify(r.cands));
    },
  },
  {
    name: 'C4 am Laderaum des Geldtransporters: oeffnet sofort (auch wenn der Schluessel fehlt, ohne Bohrer), verbrennt einen Teil der Saecke, die uebrigen bleiben einpackbar, die Polizei kommt frueher; nicht bei offenem Laderaum, nicht ohne Vorrat',
    async run(t) {
      const r = await t.page.evaluate(() => {
        const D = __dbg, C = D.CFG.c4, o = {};
        D.sessReset(); D.SESSION.sk.U4 = 1; D.setScenario('truck'); D.setSeedMode('random'); D.setLage([]); D.buildSeed(321); D.CFG.policeAt = 1e6; D.CFG.policeForced = 1e6;
        const me = D.get().me; D.startHeist(false, me); const tk = D.tk(); tk.st = 'stopped'; tk.x = 1500; tk.y = 400; D.update(1 / 30);
        const it = D.get().its.find(i => i.t === 'c4t'), cargo = D.get().its.find(i => i.t === 'cargo'), bags = D.get().its.filter(i => i.t === 'tbag'); o.has = !!it && !!cargo && bags.length > 0; if (!o.has) return o;
        o.stock = me.c4; me.x = it.x; me.y = it.y; me.hp = 1e9;
        o.ok0 = [it.ok(me), cargo.ok(me)]; const pol0 = D.get().policeAt, tH0 = D.get().tH; it.act(me); const g = D.get();
        const n = bags.length; o.bags = { n, lost: bags.filter(b => b.lost).length, want: Math.max(1, Math.round(n * C.loss * (1 - .25))), left: bags.filter(b => !b.done && b.ok(me)).length };
        o.open = g.cargoOpen; o.c4 = me.c4; o.pol = [pol0, g.policeAt, Math.ceil(tH0) + 3]; o.again = it.ok(me); o.gd = D.goalDone(); o.rank = [D.pickIt(me, -1) && D.pickIt(me, -1).t];
        return o;
      });
      t.ok(r.has, 'Panzerwagen mit Laderaum-Objekten und Saecken gefunden');
      t.eq([r.stock, r.ok0], [1, [true, true]], 'ein Stueck, am Laderaum nutzbar neben dem Bohrer (kein Schluessel)');
      t.eq([r.open, r.c4, r.bags.lost, r.bags.left, r.gd], [true, 0, r.bags.want, r.bags.n - r.bags.want, 0], 'Laderaum offen, Stueck weg, ' + r.bags.want + ' von ' + r.bags.n + ' Saecken verbrannt, der Rest einpackbar, lost zaehlt nicht: ' + JSON.stringify(r.bags));
      t.eq(r.pol[1], Math.max(r.pol[2], r.pol[0] - 12), 'die Polizei kommt 12 s frueher: ' + JSON.stringify(r.pol));
      t.eq(r.again, false, 'bei offenem Laderaum ist C4 nicht mehr nutzbar');
    },
  },
  {
    name: 'C4 in allen fuenf Szenarien mit Tresor (Bank, Juwelier, Tankstelle, Museum, Casino, je zwei Seeds): das Objekt sitzt am Tresor, oeffnet ihn im Ueberfall sofort und verbrennt Beute, im Erkunden loest es den Alarm aus',
    timeout: 120000,
    async run(t) {
      const r = await t.page.evaluate(() => {
        const D = __dbg, out = { bad: [], n: 0 };
        for (const sc of ['bank', 'jewel', 'gas', 'museum', 'casino']) for (const sd of [3, 7]) for (const ph1 of [false, true]) {
          D.sessReset(); D.SESSION.sk.U4 = 1; D.setScenario(sc); D.setSeedMode('random'); D.setLage([]); D.setTurn('S'); D.buildSeed(sd); D.CFG.policeAt = 1e6; D.CFG.policeForced = 1e6; D.reset(); if (!ph1) D.startHeist(false, D.get().me);
          const g = D.get(), me = g.me, vi = g.its.find(i => i.t === 'vault'), c4 = g.its.find(i => i.t === 'c4'), tag = sc + '#' + sd + (ph1 ? ' Erkunden' : ' Ueberfall'); out.n++;
          if (!vi || !c4) { out.bad.push(tag + ' ohne Objekt'); continue; }
          const n = g.its.filter(i => i.t === 'bundle').length; if (Math.hypot(c4.x - vi.x, c4.y - vi.y) > 1) out.bad.push(tag + ' nicht am Tresor');
          me.x = c4.x; me.y = c4.y; me.hp = 1e9; if (!c4.ok(me)) { out.bad.push(tag + ' nicht nutzbar'); continue; } c4.act(me); const g2 = D.get(), lost = g2.its.filter(i => i.lost).length;
          if (!g2.vaultOpen) out.bad.push(tag + ' Tresor zu'); if (lost < 1 || lost > n) out.bad.push(tag + ' verbrannt ' + lost + ' von ' + n); if (g2.phase !== 2) out.bad.push(tag + ' kein Ueberfall');
          if (me.c4 !== 0) out.bad.push(tag + ' Stueck bleibt');
        }
        return out;
      });
      t.note(r.n + ' Faelle');
      t.eq(r.bad, [], 'Abweichungen (' + r.bad.length + '): ' + JSON.stringify(r.bad.slice(0, 5)));
    },
  },
  {
    name: 'C4 im Coop: Host und Client sehen Tresor offen, die verbrannten Stuecke (lo) und den Vorrat des Clients (Index 31); die Zaehlung des Nebenziels stimmt bei beiden; HUD und Brandfleck gezeichnet',
    async run(t) {
      await t.loadTool('loopnet.js'); await t.loadInpage('coop.js');
      const r = await t.page.evaluate(() => {
        const G = CT.mkGame('bank', 321, 2), A = G.A, B = G.clients[0], o = {}; A.CFG.policeAt = 1e6; A.CFG.policeForced = 1e6;
        B.cv.dispatchEvent(new KeyboardEvent('keydown', { key: 'f', bubbles: true })); G.run(1);
        const p1 = A.get().players[1]; p1.kit = Object.assign({}, p1.kit, { sk: { U4: 2 } }); p1.c4 = 1; B.get().me.kit = Object.assign({}, B.get().me.kit, { sk: { U4: 2 } }); G.run(.5);
        o.clientStock = B.get().me.c4 | 0; const ctx = B.cv.getContext('2d'), tx = []; const ot = ctx.fillText; ctx.fillText = function (s) { tx.push(String(s)); return ot.apply(this, arguments); }; B.draw(); ctx.fillText = ot; o.hud = tx.filter(s => /C4/.test(s));
        const it = A.get().its.find(i => i.t === 'c4'); p1.x = it.x; p1.y = it.y; it.act(p1); G.run(.8);
        const lost = d => d.get().its.map((q, i) => q.lost ? i : -1).filter(i => i >= 0);
        o.host = [A.get().vaultOpen, lost(A).length, p1.c4]; o.client = [B.get().vaultOpen, lost(B).length, B.get().me.c4 | 0]; o.same = JSON.stringify(lost(A)) === JSON.stringify(lost(B)); o.gd = [A.goalDone(), B.goalDone()];
        const li = lost(B)[0], q = B.get().its[li], rects = [], orf = ctx.fillRect; ctx.fillRect = function (x, y, w, h) { if (q && Math.abs(x - (q.x - 14)) < 1 && Math.abs(y - (q.y - 14)) < 1 && w === 28) rects.push(1); return orf.apply(this, arguments); }; B.draw(); ctx.fillRect = orf; o.scorch = rects.length;
        return o;
      });
      t.eq(r.clientStock, 1, 'der Client kennt seinen Vorrat aus dem Schnappschuss');
      t.ok(r.hud.some(s => /C4 1/.test(s)), 'HUD nennt C4 mit Stueckzahl: ' + JSON.stringify(r.hud));
      t.eq([r.host[0], r.client[0]], [true, true], 'Tresor offen bei Host und Client');
      t.ok(r.host[1] >= 1 && r.host[1] === r.client[1] && r.same, 'dieselben Stuecke sind verbrannt: ' + JSON.stringify([r.host, r.client]));
      t.eq([r.host[2], r.client[2]], [0, 0], 'der Vorrat ist bei beiden verbraucht');
      t.eq(r.gd, [0, 0], 'das Nebenziel zaehlt verbrannte Stuecke bei beiden nicht als geholt');
      t.ok(r.scorch >= 1, 'ein Brandfleck liegt an der Stelle des verbrannten Stuecks (Client)');
    },
  },
];
