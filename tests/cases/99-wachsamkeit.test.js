// MRU 1 C1 (docs/major-release-update-1.md, docs/ideen-und-planung.md, Wachsamkeit der Laeden, Plan v1, beschlossen von Till am 25. Oktober 2026): Stufe 1. Ein Zaehler fuer lautlose Siege in Folge (SESSION.quiet,
// Teamwert der Serie wie die Fahndung, nur im Speicher) laeuft serienweit ueber alle fuenf Szenarien mit Phase 1. Ein lautloser Sieg zaehlt +1, ein lauter Sieg setzt auf 0, ein gescheiterter Auftrag mit weiterlaufender Serie
// (soft) und der Transporter (keine Phase 1) lassen ihn unveraendert, eine Niederlage setzt ihn mit der Serie zurueck. Ab CFG.alert.at (2) bekommt der naechste Auftrag erzwungen den Tag Wachsames Personal (wachsam), als
// "gewarnt" ohne Beute- und Lautlos-Aufschlag (lgw in der Mission, lgM und lgA ueberspringen loot und stl), er zaehlt gegen CFG.lage.max und kommt nur einmal vor. Bei Zaehler unter der Schwelle (und mit CFG.alert.on 0)
// bleibt jede Karte gleich. Der Zaehler faehrt in ros, go und rst mit (startNext und startCoop senden ros vor rst und go, die Clients haben q also doppelt, das ist gewollt, ein Test kann die Wege nicht trennen). Anzeige: das Badge LAEDEN GEWARNT neben der Fahndung (Titel, Auftragswahl, Shop, Lobby, Pause), eine Zeile im Ergebnis. Netz: q in ros, go und rst (VER 36).
const END = `(D, win, sp, soft) => { D.endLocal({ win, soft: !!soft, sp, score: 1000, n: 1, lines: [], fh: null, title: 't', extra: '', hi: false }); return D.SESSION.quiet | 0; }`;

module.exports = [
  {
    name: 'Wachsamkeit: Der Zaehler zaehlt lautlose Siege in Folge (+1), ein lauter Sieg setzt auf 0, soft und der Transporter lassen ihn, eine Niederlage setzt ihn zurueck, Deckel CFG.alert.cap, die Zeile im Ergebnis erst ab der Schwelle',
    async run(t) {
      const r = await t.page.evaluate(`(() => { const D = __dbg, end = ${END}, o = {}; D.sessReset(); o.cfg = D.CFG.alert; o.start = D.SESSION.quiet | 0;
        const lines = () => (D.get().ended ? D.get().ended.lines : []).filter(l => /gewarnt/i.test(l)).length;
        o.q1 = end(D, true, { goal: false, quiet: true }); o.l1 = lines(); o.q2 = end(D, true, { goal: true, quiet: true }); o.l2 = lines(); o.q3 = end(D, true, { goal: false, quiet: true });
        o.soft = end(D, false, null, true); o.truck = end(D, true, { goal: false, quiet: false, tr: true }); o.loud = end(D, true, { goal: true, quiet: false }); o.l0 = lines();
        for (let i = 0; i < 15; i++) end(D, true, { goal: false, quiet: true }); o.cap = D.SESSION.quiet; o.lose = end(D, false, null, false); o.after = [D.SESSION.pts, D.SESSION.quiet | 0];
        return o; })()`);
      t.eq([r.cfg.on, r.cfg.at, r.cfg.cap, r.cfg.tag], [1, 2, 9, 'wachsam'], 'CFG.alert: an, ab 2, Deckel 9, Tag wachsam');
      t.eq([r.start, r.q1, r.q2, r.q3], [0, 1, 2, 3], 'lautlose Siege zaehlen');
      t.eq([r.l1, r.l2], [0, 1], 'die Zeile Laeden gewarnt steht im Ergebnis erst ab 2');
      t.eq(r.soft, 3, 'ein gescheiterter Auftrag mit weiterlaufender Serie (soft) laesst den Zaehler');
      t.eq(r.truck, 3, 'der Transporter hat keine Phase 1 und zaehlt nicht mit (weder +1 noch Rueckstellen)');
      t.eq([r.loud, r.l0], [0, 0], 'ein lauter Sieg setzt auf 0, dann keine Zeile');
      t.eq(r.cap, 9, 'der Deckel haelt bei 9');
      t.eq(r.lose, 0, 'eine Niederlage setzt den Zaehler mit der Serie zurueck');
    },
  },
  {
    name: 'Wachsamkeit: Ab Zaehler 2 bekommt jeder Auftrag mit Phase 1 den Tag Wachsames Personal als gewarnt (einmal, gegen CFG.lage.max, Transporter nicht), darunter und mit CFG.alert.on 0 bleibt jede Karte gleich',
    timeout: 280000,
    async run(t) {
      const r = await t.page.evaluate(`(() => { const D = __dbg, out = { bad: [], n: 0, forced: 0, had: 0 }, max = D.CFG.lage.max;
        const get = (sc, s, q, on) => { D.sessReset(); D.SESSION.quiet = q; D.CFG.alert.on = on == null ? 1 : on; D.setScenario(sc); D.setSeedMode('random'); D.setLage(null); D.setTurn('S'); const m = D.layoutFor(s).mission; return { lg: (m.lg || []).slice(), tags: m.tags.slice(), lgw: m.lgw ? m.lgw.slice() : null, ev: (m.ev || []).length }; };
        for (const sc of ['bank', 'jewel', 'gas', 'museum', 'casino', 'truck']) for (let s = 1; s <= 25; s++) {
          const b = get(sc, s, 0), q1 = get(sc, s, 1), q2 = get(sc, s, 2), q5 = get(sc, s, 5), off = get(sc, s, 5, 0), tag = sc + '#' + s; out.n++;
          if (JSON.stringify(b) !== JSON.stringify(q1)) out.bad.push(tag + ' Zaehler 1 aendert die Karte');
          if (JSON.stringify(b) !== JSON.stringify(off)) out.bad.push(tag + ' CFG.alert.on 0 aendert die Karte');
          if (b.lgw) out.bad.push(tag + ' ohne Zaehler schon gewarnt');
          if (sc === 'truck') { if (JSON.stringify(b) !== JSON.stringify(q2)) out.bad.push(tag + ' Transporter bekommt etwas'); continue; }
          if (b.lg.includes('wachsam')) out.had++;
          const w = q2.lg.filter(k => k === 'wachsam').length; if (w !== 1) out.bad.push(tag + ' wachsam ' + w + 'x'); else out.forced++;
          if (JSON.stringify(q2.lgw) !== '["wachsam"]' || JSON.stringify(q5.lgw) !== '["wachsam"]') out.bad.push(tag + ' lgw ' + JSON.stringify(q2.lgw));
          if (!q2.tags.includes('Wachsames Personal (gewarnt)') || q2.tags.includes('Wachsames Personal')) out.bad.push(tag + ' Tag-Name: ' + JSON.stringify(q2.tags.slice(0, 3)));
          if (q2.lg.length > max - q2.ev) out.bad.push(tag + ' mehr Tags als CFG.lage.max erlaubt: ' + q2.lg.length + ' + ' + q2.ev + ' Ereignisse');
          if (JSON.stringify(q2.ev) !== JSON.stringify(b.ev)) out.bad.push(tag + ' Ereignisse geaendert');
        }
        D.CFG.alert.on = 1; D.setLage(null); return out; })()`);
      t.note(r.n + ' Karten, davon mit Wachsam schon von allein: ' + r.had + ', erzwungen in ' + r.forced);
      t.eq(r.bad.slice(0, 8), [], 'Abweichungen (' + r.bad.length + ')');
      t.ok(r.forced >= 100, 'genug Karten mit erzwungenem Tag: ' + r.forced);
    },
  },
  {
    name: 'Wachsamkeit: Der erzwungene Tag wirkt als gewarnt (Verdacht +60 %, aber kein Lautlos-Zuschlag), der normale Tag behaelt seinen Zuschlag, das Briefing nennt gewarnt',
    async run(t) {
      const r = await t.page.evaluate(() => {
        const D = __dbg, o = {};
        const build = (q, pin, seed) => { D.sessReset(); D.SESSION.quiet = q; D.setScenario('bank'); D.setSeedMode('random'); D.setLage(pin || null); D.setTurn('S'); D.CFG.policeAt = 1e6; D.CFG.policeForced = 1e6; D.buildSeed(seed); const lg = D.LAY().mission.lg.slice(); return { sus: D.lgM('sus'), stl: D.lgA('stl'), loot: D.lgM('loot'), lootOther: lg.filter(k => k !== 'wachsam').reduce((v, k) => v * ((D.CFG.lage[k] || {}).loot || 1), 1), lg, lgw: D.LAY().mission.lgw || null, feed: D.msgs().feed.join(' | ') }; };
        o.w = D.CFG.lage.wachsam; o.warn = build(2, null, 5017); o.pin = build(0, ['wachsam'], 5018); o.none = build(0, [], 5019);   // je eine eigene Karte, reset baut sonst bei gleichem Seed nicht neu o.cfgBonus = D.CFG.stealthBonus; D.setLage(null);
        return o;
      });
      t.ok(r.warn.lg.includes('wachsam') && JSON.stringify(r.warn.lgw) === '["wachsam"]', 'Zaehler 2: wachsam erzwungen und als gewarnt vermerkt: ' + JSON.stringify([r.warn.lg, r.warn.lgw]));
      t.eq([r.warn.sus, r.warn.stl, r.warn.loot], [r.w.sus, 0, r.warn.lootOther], 'gewarnt: Verdachtsrate wie wachsam, aber kein Lautlos-Zuschlag (die Beute folgt nur den anderen Tags: ' + r.warn.lg.join(',') + ')');
      t.eq([r.pin.sus, r.pin.stl, r.pin.lgw], [r.w.sus, r.w.stl, null], 'der normale Tag (von Hand gesetzt) behaelt Rate und Zuschlag und ist nicht gewarnt');
      t.eq([r.none.sus, r.none.stl], [1, 0], 'ohne Tag nichts');
      t.ok(/gewarnt/i.test(r.warn.feed), 'das Briefing nennt gewarnt: ' + r.warn.feed.slice(0, 200));
      t.ok(!/gewarnt/i.test(r.pin.feed), 'der normale Tag nennt es nicht');
    },
  },
  {
    name: 'Wachsamkeit mit Gleiche Karte (derselbe Seed): reset baut die Welt neu, wenn der Zaehler die erzwungenen Tags aendert (hoch und wieder runter), sonst bleibt die gebaute Karte',
    async run(t) {
      const r = await t.page.evaluate(() => {
        const D = __dbg, o = {}; D.sessReset(); D.setScenario('bank'); D.setSeedMode('random'); D.setLage(null); D.setTurn('S'); D.CFG.policeAt = 1e6; D.CFG.policeForced = 1e6;
        const lgw = () => (D.LAY().mission.lgw || []).join(','), ref = () => D.LAY();
        D.buildSeed(5020); o.q0 = lgw(); const L0 = ref();
        D.reset(); o.same = ref() === L0;                                 // nichts geaendert: dieselbe gebaute Karte
        D.SESSION.quiet = 2; D.reset(); o.q2 = lgw(); const L2 = ref(); o.rebuilt = L2 !== L0;
        D.reset(); o.keep = ref() === L2;                                 // wieder nichts geaendert
        D.SESSION.quiet = 0; D.reset(); o.back = lgw(); o.seed = [D.LAY().seed, 5020];
        return o;
      });
      t.eq([r.q0, r.same], ['', true], 'ohne Zaehler keine erzwungenen Tags, ein reset baut die Karte nicht neu');
      t.eq([r.q2, r.rebuilt, r.keep], ['wachsam', true, true], 'Zaehler 2: dieselbe Karte (Seed) wird neu gebaut und traegt den erzwungenen Tag, ein weiterer reset laesst sie');
      t.eq([r.back, r.seed[0] === r.seed[1]], ['', true], 'Zaehler wieder 0: neu gebaut ohne den Tag, derselbe Seed');
    },
  },
  {
    name: 'Wachsamkeit im Coop: q kommt per Raumliste, go und rst zu den Clients, Host und Client bauen dieselbe Lage mit dem erzwungenen Tag, nach Zaehler 0 ohne',
    async run(t) {
      await t.loadTool('loopnet.js'); await t.loadInpage('coop.js');
      const r = await t.page.evaluate(() => {
        const net = LoopNet(60, 20), insts = [], A = mkInst(net, 'a'), o = {}; insts.push(A);
        A.setScenario('bank'); A.setSeedMode('random'); A.CFG.policeAt = 1e6; A.CFG.policeForced = 1e6; A.SESSION.quiet = 2;
        A.hostRoom(); for (let i = 0; i < 10; i++) step(insts, net, 1 / 60);
        const C = mkInst(net, 'c1'); insts.push(C); C.CFG.policeAt = 1e6; C.CFG.policeForced = 1e6; C.joinRoom(A.NET.code); for (let i = 0; i < 120; i++) step(insts, net, 1 / 60);
        o.lobby = C.SESSION.quiet | 0;                                    // aus der Raumliste (ros)
        A.startCoop(); const run = s => { for (let i = 0; i < Math.round(s * 60); i++) step(insts, net, 1 / 60); }; run(3);
        const g = d => ({ lg: d.LAY().mission.lg.join(','), lgw: (d.LAY().mission.lgw || []).join(','), q: d.SESSION.quiet | 0, tags: d.LAY().mission.tags.join('|') });
        o.go = [g(A), g(C)];
        A.SESSION.quiet = 0; A.startNext(); run(3); o.rst0 = [g(A), g(C)];
        A.SESSION.quiet = 3; A.startNext(); run(3); o.rst3 = [g(A), g(C)];
        return o;
      });
      t.eq(r.lobby, 2, 'der Client kennt den Zaehler schon in der Lobby (ros)');
      t.ok(r.go[0].lgw === 'wachsam' && JSON.stringify(r.go[0]) === JSON.stringify(r.go[1]), 'go: Host und Client haben dieselbe Lage mit dem erzwungenen Tag: ' + JSON.stringify(r.go));
      t.ok(r.rst0[0].lgw === '' && JSON.stringify(r.rst0[0]) === JSON.stringify(r.rst0[1]), 'rst mit Zaehler 0: kein erzwungener Tag, beide gleich: ' + JSON.stringify(r.rst0));
      t.ok(r.rst3[0].lgw === 'wachsam' && JSON.stringify(r.rst3[0]) === JSON.stringify(r.rst3[1]) && r.rst3[1].q === 3, 'rst mit Zaehler 3: wieder erzwungen, der Client hat q 3: ' + JSON.stringify(r.rst3));
    },
  },
  {
    name: 'Wachsamkeit: Das Badge LAEDEN GEWARNT steht ab Zaehler 2 in Titel, Auftragswahl, Shop, Lobby und Pause (darunter nicht), ohne Ueberlappung mit Text oder Kacheln',
    async run(t) {
      await t.loadTool('loopnet.js'); await t.loadInpage('coop.js'); await t.loadInpage('menu.js'); await t.loadInpage('overlap.js');
      const r = await t.page.evaluate(() => {
        const o = { ov: {}, badge: {} };
        const texts = d => { const ctx = d.cv.getContext('2d'), orig = ctx.fillText, log = []; ctx.fillText = function (s) { log.push(String(s)); return orig.apply(this, arguments); }; try { d.draw(); } finally { ctx.fillText = orig; } return log; };
        const look = (d, tag) => { for (const q of [1, 2, 4]) { d.SESSION.quiet = q; const w = texts(d).filter(s => /LÄDEN GEWARNT/.test(s)).length; (o.badge[tag] = o.badge[tag] || []).push(w); if (q === 2) { const f = OV.check(d); if (f.length) o.ov[tag] = f; } } };
        const net = LoopNet(30, 0), d = MT.solo(net); d.sessReset(); look(d, 'Titel');
        d.SESSION.round = 2; d.openShop(); look(d, 'Shop'); MT.click(d, 'next'); look(d, 'Auftragswahl');
        const all = [], n2 = LoopNet(30, 0), a = mkInst(n2, 'p0'); a.setName('Anna'); all.push(a); a.hostRoom(); for (let i = 0; i < 30; i++) step(all, n2, 1 / 60);
        const b = mkInst(n2, 'p1'); b.setName('Bo'); all.push(b); b.joinRoom(a.NET.code); for (let i = 0; i < 120; i++) step(all, n2, 1 / 60);
        look(a, 'Lobby Host'); look(b, 'Lobby Client');
        const p = MT.solo(LoopNet(30, 0)); p.startGame(); p.setFocus(true); MT.adv(p, 1); MT.k(p, 'Escape'); look(p, 'Pause');
        return o;
      });
      for (const k of ['Titel', 'Shop', 'Auftragswahl', 'Lobby Host', 'Lobby Client', 'Pause']) t.eq(r.badge[k], [0, 1, 1], k + ': das Badge erst ab Zaehler 2 (bei 1, 2 und 4 gezaehlt)');
      t.eq(r.ov, {}, 'Ueberlappungen bei Zaehler 2: ' + JSON.stringify(r.ov));
    },
  },
];
