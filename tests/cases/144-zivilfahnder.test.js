// Zivile Wachen und Zivilfahnder (Ticket #34, Tills Entscheidungen vom 29. Oktober 2026, Plan: docs/ideen-und-planung.md, Wachsamkeit der Laeden, Stufe 2 neu): Ab CFG.uc.at[0] (3) lautlosen Siegen in Folge (SESSION.quiet)
// ist einer der Kunden ein Zivilfahnder (Merker uc an einem Kunden, k bleibt civ), ab at[1] (5) sind es zwei. In Phase 1 beobachtet er wie eine Wache (Verdacht, Alarm), der Ablenker wirkt nicht auf ihn, er laesst sich von hinten
// ausschalten und sein Koerper loest beim Fund Alarm aus. Im Ueberfall zieht er die Pistole und wird Gegner (kind grd, Zivilkleidung). Hinweis (Funkgeraet) nur in CFG.uc.hint Pixeln Abstand, dazu der lange Blick (lookT).
// Bei Zaehler unter 3 aendert sich nichts (eigener Zufallsstrom nur ab 3, Alt-Neu bei Zaehler 0 mit tests/altneu.js). Netz: Merker in np[14], Kleidung in en[14], VER 56.
async function setup(t) {
  await t.loadTool('loopnet.js');
  await t.loadInpage('coop.js');
}
// Aufbau: Szenario sc, Seed, Zaehler q, Phase 1 ohne Polizei.
const BUILD = `(sc, seed, q) => { const D = __dbg; D.sessReset(); D.SESSION.quiet = q; D.setScenario(sc); D.setSeedMode('random'); D.setLage([]); D.setTurn('S'); D.buildSeed(seed); D.CFG.policeAt = 1e6; D.CFG.policeForced = 1e6; return D; }`;
// Bank 5017 mit Zaehler 3: nur der Zivilfahnder uc (und ein gewoehnlicher Kunde civ) bleiben, alle anderen weg, Kameras aus. put(d, ang) stellt den Zivilfahnder d Pixel vom Spieler weg, er schaut zum Spieler (still).
const ONE = `(q, extra) => { const D = (${BUILD})('bank', 5017, q == null ? 3 : q), g = D.get(), me = g.me, L = D.LAY(); D.CFG.loiter.warn = 1e9; D.CFG.loiter.after = 1e9;
  const uc = g.npcs.find(n => n.uc), civ = g.npcs.find(n => n.k === 'civ' && !n.uc);
  for (const n of g.npcs) if (n !== uc && n !== civ && !(extra && extra.keep && extra.keep(n))) { n.st = 'away'; n.at = 1e9; } for (const c of g.cams) c.off = true;
  me.x = L.spawn.x; me.y = L.spawn.y; me.hp = 1e9;
  const free = (x, y) => [[0, 0], [-9, -9], [9, -9], [-9, 9], [9, 9]].every(o => !D.isSol(Math.floor((x + o[0]) / 32), Math.floor((y + o[1]) / 32)));
  const put = (n, d, still) => { for (let i = 0; i < 24; i++) { const an = i * Math.PI / 12, x = me.x + Math.cos(an) * d, y = me.y + Math.sin(an) * d; if (free(x, y) && D.los(me.x, me.y, x, y)) { n.x = x; n.y = y; n.base = an + Math.PI; n.a = n.base; n.path = []; n.mvg = false; n.look = null; n.alert = 0; n.st = 'idle'; n.still = still !== false; n.ucCd = 0; return an; } } return null; };
  return { D, g, me, uc, civ, free, put, L }; }`;

module.exports = [
  {
    name: 'Auftauchen: unter 3 lautlosen Siegen kein Zivilfahnder (Kunden, Wege und Zufallsstroeme unveraendert), ab 3 einer, ab 5 zwei (nie mehr als Kunden da sind), in allen fuenf Gebaeude-Szenarien, je Seed gleich, mit CFG.uc.on 0 nie; der Zivilfahnder ist ein umgewidmeter Kunde (k civ, Zahl der Kunden gleich LAY.civ)',
    async run(t) {
      const r = await t.page.evaluate(`(() => { const o = { cfg: null, cnt: [], gleich: [], sig: [], civ: [], aus: [], versch: new Set(), kinds: [] }, bu = ${BUILD};
        const sig = D => D.get().npcs.map(q => [q.id, q.k, Math.round(q.x), Math.round(q.y), +q.spd.toFixed(3), +q.wait.toFixed(3), +(q.a || 0).toFixed(3), q.fov, q.rng].join(',')).join(';');
        for (const sc of ['bank', 'jewel', 'gas', 'museum', 'casino']) for (const seed of [101, 202, 303]) {
          const ids = {}, civN = bu(sc, seed, 0).LAY().civ; for (const q of [0, 1, 2, 3, 4, 5, 9]) { const D = bu(sc, seed, q); o.cfg = D.CFG.uc; const n = D.get().npcs, uc = n.filter(x => x.uc); ids[q] = uc.map(x => x.id).join(); o.cnt.push([q, uc.length, sc + seed, D.LAY().civ]);
            o.civ.push(n.filter(x => x.k === 'civ').length === D.LAY().civ); for (const x of uc) o.kinds.push(x.k); if (q === 5 && sc === 'bank') o.versch.add(ids[q]); }
          const ar = q => ids[q] ? ids[q].split(',') : []; o.gleich.push(ids[3] === ids[4] && ar(3).length === Math.min(1, civN) && ids[5] === ids[9] && ar(5).length === Math.min(2, civN) && (!ar(3).length || ar(5).includes(ids[3]))); o.hatKunden = (o.hatKunden || 0) + (civN > 0 ? 1 : 0);
          const s0 = sig(bu(sc, seed, 0)), s2 = sig(bu(sc, seed, 2)), s3 = sig(bu(sc, seed, 3)); o.sig.push([s0 === s2, (s0 !== s3) === (civN > 0)]);
          const D = bu(sc, seed, 5); D.CFG.uc.on = 0; D.reset(); o.aus.push(D.get().npcs.filter(x => x.uc).length); D.CFG.uc.on = 1; }
        const D = bu('bank', 101, 5); const a = D.get().npcs.filter(x => x.uc).map(x => x.id).join(); D.reset(); o.nochmal = a === D.get().npcs.filter(x => x.uc).map(x => x.id).join();
        const D2 = bu('truck', 51, 9); o.truck = D2.get().npcs.filter(x => x.uc).length; return o; })()`);
      t.eq(r.cfg.at, [3, 5], 'Schwellen aus CFG.uc.at');
      for (const [q, n, w, c] of r.cnt) t.eq(n, Math.min(c, q >= 5 ? 2 : q >= 3 ? 1 : 0), w + ' (Kunden ' + c + ') Zaehler ' + q + ' gibt ' + (q >= 5 ? 2 : q >= 3 ? 1 : 0) + ' Zivilfahnder');
      t.ok(r.gleich.every(x => x), 'je Seed gleich (3 und 4 einer, 5 und 9 zwei, der eine ist einer der zwei): ' + JSON.stringify(r.gleich));
      t.ok(r.sig.every(x => x[0] && x[1]), 'NPC-Aufstellung bei 0 und 2 gleich, ab 3 anders (Sicht und Reichweite des Zivilfahnders): ' + JSON.stringify(r.sig));
      t.ok(r.civ.every(x => x), 'Zahl der Kunden gleich LAY.civ in allen Faellen');
      t.ok(r.kinds.every(k => k === 'civ'), 'Zivilfahnder sind Kunden (k civ)');
      t.eq(r.aus, new Array(15).fill(0), 'CFG.uc.on 0: nie');
      t.ok(r.nochmal, 'zweiter Aufbau desselben Seeds wahlt dieselben');
      t.ok(r.hatKunden >= 12 && r.hatKunden <= 14, 'die meisten Karten haben Kunden: ' + r.hatKunden);
      t.eq(r.truck, 0, 'Geldtransporter hat keine Kundschaft');
    },
  },
  {
    name: 'Zufallsstrom: bei Zaehler unter 3 zieht der Aufbau nichts, auch mit anderem Math.random und mehrfachem Aufbau bleibt alles gleich; ab 3 haengt die Wahl nicht von Math.random ab',
    async run(t) {
      const r = await t.page.evaluate(`(() => { const bu = ${BUILD}, orig = Math.random, o = {}; const sig = D => D.get().npcs.map(q => [q.id, q.k, !!q.uc, Math.round(q.x * 10) / 10, Math.round(q.y * 10) / 10, +q.wait.toFixed(3), +q.rr().toFixed(5)].join(',')).join(';');
        try { for (const q of [0, 2, 3, 5]) { Math.random = () => .1; const a = sig(bu('jewel', 654, q)); Math.random = () => .9; const b = sig(bu('jewel', 654, q)); Math.random = orig; o['q' + q] = a === b; }
          // npcR-Strom: der Zivilfahnder-Strom ist eigen, die Wartezeiten der Kunden aendern sich nicht durch die Wahl
          const w = q => bu('bank', 303, q).get().npcs.filter(n => n.k === 'civ').map(n => n.wait.toFixed(4) + '/' + Math.round(n.x) + '/' + Math.round(n.y)).join(); o.strom = w(0) === w(5); } finally { Math.random = orig; } return o; })()`);
      t.eq(r, { q0: true, q2: true, q3: true, q5: true, strom: true }, 'Zufall');
    },
  },
  {
    name: 'Phase 1: der Zivilfahnder beobachtet wie eine Wache (Stehlen in Sicht fuellt den Balken mit 48 pro s), voller Balken gibt "Entdeckt (Zivilfahnder)" und Alarm; ein gewoehnlicher Kunde und ein Zivilfahnder ohne Sicht fuellen nichts',
    async run(t) {
      const r = await t.page.evaluate(`(() => { const S = (${ONE})(3), { D, g, me, uc, civ, put } = S, o = { lg: D.lgM('sus'), dn: D.CFG.watch.net ? D.CFG.watch.down : 0, hat: !!uc };
        if (!uc) return o; o.civ0 = !!civ; const sus = () => D.get().sus;
        // Kontrolle: gewoehnlicher Kunde sieht dasselbe und fuellt nichts
        o.pos = put(uc, 70) !== null; put(civ, 70); D.setSus(0); uc.st = 'away'; uc.at = 1e9; for (let i = 0; i < 30; i++) { me.thf = 1; D.update(1 / 30); } o.civSus = sus(); uc.st = 'idle'; uc.at = 0; D.setSus(0);
        // Zivilfahnder: 1 s
        civ.st = 'away'; civ.at = 1e9; put(uc, 70); D.CFG.watch.grace = 4; for (let i = 0; i < 30; i++) { me.thf = 1; D.update(1 / 30); } o.s1 = sus(); o.alert = uc.alert > 0;
        // ohne Sicht (Wand dazwischen / abgewandt): nichts
        D.setSus(0); me.thf = 0; uc.base += Math.PI; uc.a = uc.base; for (let i = 0; i < 20; i++) { me.thf = 1; uc.a = uc.base; D.update(1 / 30); } o.abgewandt = sus(); uc.base -= Math.PI; uc.a = uc.base;
        // voll: Entdeckt, dann Alarm
        D.setSus(0); for (let i = 0; i < 30 * 12 && D.get().phase === 1; i++) { me.thf = 1; D.update(1 / 30); if (D.get().alarmT > 0 && o.entdeckt == null) o.entdeckt = D.msgs().feed.some(s => /Entdeckt \\(Zivilfahnder\\)/.test(s)); }
        o.phase = D.get().phase; return o; })()`);
      t.ok(r.hat, 'Aufbau: Bank 5017 mit Zaehler 3 hat einen Zivilfahnder');
      t.eq(r.civ0, true, 'Aufbau: ein gewoehnlicher Kunde dabei');
      t.eq(r.pos, true, 'Aufbau: Platz vor dem Spieler');
      t.eq(r.civSus, 0, 'gewoehnlicher Kunde: Balken bleibt leer');
      const rate = 48 * r.lg - r.dn;
      t.ok(r.s1 > rate * .6 && r.s1 < rate * 1.3 + 1, 'nach 1 s im Blick rund ' + rate.toFixed(1) + ' (Wache in der Sperrzone), gemessen ' + r.s1);
      t.eq(r.alert, true, 'er ist aufmerksam (alert)');
      t.eq(r.abgewandt, 0, 'abgewandt: nichts');
      t.eq(r.entdeckt, true, 'Meldung "Entdeckt (Zivilfahnder)"');
      t.eq(r.phase, 2, 'voller Balken: Alarm, der Ueberfall beginnt');
    },
  },
  {
    name: 'Ablenker: wirkt nicht auf den Zivilfahnder (er sieht weiter und fuellt den Balken), blendet aber einen Angestellten an derselben Stelle (Kontrolle)',
    async run(t) {
      const r = await t.page.evaluate(`(() => { const S = (${ONE})(3), { D, g, me, uc, civ, put } = S, o = { hat: !!uc }; if (!uc) return o; const sus = () => D.get().sus; civ.st = 'away'; civ.at = 1e9; D.CFG.watch.grace = 4;
        const run = (k, uck, dec) => { put(uc, 70); uc.k = k; uc.uc = uck; D.setSus(0); D.dcyList().length = 0; if (dec) D.dcyList().push({ id: 900, x: uc.x, y: uc.y, t: 30, bt: 0 }); for (let i = 0; i < 24; i++) { me.thf = 1; D.update(1 / 30); } const v = sus(); D.dcyList().length = 0; return v; };
        o.zfOhne = run('civ', 1, false); o.zfMit = run('civ', 1, true); o.telOhne = run('tel', 0, false); o.telMit = run('tel', 0, true); return o; })()`);
      t.ok(r.hat, 'Aufbau');
      t.ok(r.telOhne > 10, 'Kontrolle: Angestellter ohne Ablenker fuellt: ' + r.telOhne);
      t.eq(r.telMit, 0, 'Kontrolle: Angestellter mit Ablenker ist geblendet');
      t.ok(r.zfOhne > 10, 'Zivilfahnder ohne Ablenker fuellt: ' + r.zfOhne);
      t.ok(r.zfMit > r.zfOhne * .8, 'Zivilfahnder mit Ablenker fuellt weiter: ' + r.zfMit + ' gegen ' + r.zfOhne);
    },
  },
  {
    name: 'Ueberfall: der Zivilfahnder zieht die Pistole und wird Gegner (kind grd, Zivilkleidung, Werte aus CFG.uc) und schiesst; die uebrigen Kunden gehen in Deckung; bei Zaehler 2 gibt es keine zusaetzlichen Gegner',
    async run(t) {
      const r = await t.page.evaluate(`(() => { const o = {}; for (const q of [3, 2]) { const S = (${ONE})(q, { keep: () => false }), { D, g, me, uc, civ, put } = S, U = D.CFG.uc; const who = q === 3 ? uc : civ; o['hat' + q] = !!who; if (!who) continue;
          put(who, 110); if (civ && civ !== who) { civ.st = 'idle'; civ.x = me.x - 50; civ.y = me.y; } const row = who.row, id = who.id; o.cfg = U; D.startHeist(false, me);
          const gn = D.get().npcs, en = D.get().en; o['npc' + q] = gn.some(n => n.id === id); o['en' + q] = en.length; const e = en[0]; if (q === 3) { o.kind = e.kind; o.row = e.row === row && (row === 3 || row === 4); o.hp = e.hp; o.dmg = e.dmg; o.rate = e.rate; o.acc = e.acc; o.spd = e.spd; o.uc = !!e.uc; o.cower = gn.some(n => n.k === 'civ' && n.st === 'cower'); }
          let shots = 0, hp0 = me.hp; me.hp = 1e9; const bl0 = new Set(); for (let i = 0; i < 30 * 15; i++) { D.update(1 / 30); for (const b of D.get().bl) if (!bl0.has(b)) { bl0.add(b); shots++; } me.hp = 1e9; } o['shots' + q] = shots; }
        return o; })()`);
      t.ok(r.hat3 && r.hat2, 'Aufbau');
      t.eq(r.npc3, false, 'der Zivilfahnder ist kein NPC mehr');
      t.eq(r.en3, 1, 'ein Gegner');
      t.eq(r.kind, 'grd', 'Art grd (keine Polizei, wie die Wache)');
      t.eq(r.row, true, 'bleibt in Zivilkleidung (Zeile des Kunden)');
      t.eq([r.hp, r.dmg, r.rate, r.acc, r.spd], [r.cfg.hp, r.cfg.dmg, r.cfg.rate, r.cfg.acc, r.cfg.spd], 'Werte aus CFG.uc');
      t.eq(r.uc, true, 'Merker uc am Gegner');
      t.eq(r.cower, true, 'gewoehnliche Kunden gehen in Deckung');
      t.ok(r.shots3 > 0, 'er schiesst: ' + r.shots3 + ' Kugeln in 15 s');
      t.eq(r.en2, 0, 'Zaehler 2: kein Gegner aus der Kundschaft');
      t.eq(r.shots2, 0, 'Zaehler 2: niemand schiesst');
    },
  },
  {
    name: 'Ausschalten und Koerperfund: von hinten mit E wie eine Wache (Kunde nicht), Meldung nennt den Zivilfahnder; sieht eine Wache oder ein Angestellter den Koerper, gibt es Alarm; im Ueberfall steht er als Kunde wieder auf',
    async run(t) {
      await setup(t);
      const r = await t.page.evaluate(`(() => { const S = (${ONE})(3, { keep: () => false }), { D, g, me, uc, civ, put, free } = S, K = D.CFG.ko, o = { hat: !!uc }; if (!uc) return o;
        put(uc, 30); uc.base = Math.atan2(uc.y - me.y, uc.x - me.x); uc.a = uc.base; civ.st = 'away'; civ.at = 1e9; D.update(1 / 30);
        const it = D.koMi(uc); o.hinten = it.ok(me); uc.base += Math.PI; uc.a = uc.base; o.vorn = it.ok(me); uc.base -= Math.PI; uc.a = uc.base;
        const k = D.koMi(civ); civ.st = 'idle'; civ.x = uc.x; civ.y = uc.y; civ.base = uc.base; civ.a = civ.base; civ.still = true; D.update(1 / 30); o.kunde = k.ok(me); civ.st = 'away';
        it.act(me); o.st = uc.st; o.msg = D.msgs().feed.some(s => /Du schaltest einen Zivilfahnder aus/.test(s));
        // Fund: ein Angestellter (der Kunde wird zum Kassierer) sieht den Koerper
        let sp = null; for (let i = 0; i < 48 && !sp; i++) { const an = i * Math.PI / 24, x = uc.x + Math.cos(an) * 150, y = uc.y + Math.sin(an) * 150; if (free(x, y) && D.los(x, y, uc.x, uc.y)) sp = { x, y }; }
        o.platz = !!sp; if (sp) { civ.k = 'tel'; civ.st = 'idle'; civ.at = 0; civ.x = sp.x; civ.y = sp.y; civ.path = []; civ.still = true; civ.route = null; civ.alert = 0; civ.look = null; civ.base = Math.atan2(uc.y - sp.y, uc.x - sp.x); civ.a = civ.base; me.x = D.LAY().spawn.x; me.y = D.LAY().spawn.y; }
        for (let i = 0; i < Math.round((K.find * .5) * 30); i++) D.update(1 / 30); o.frueh = D.get().phase; for (let i = 0; i < Math.round((K.find * .5 + 1) * 30); i++) D.update(1 / 30); o.spaet = D.get().phase; o.fund = D.msgs().feed.some(s => /findet einen Bewusstlosen: Alarm!/.test(s));
        o.steht = uc.st; o.ucIm = D.get().npcs.includes(uc); return o; })()`);
      t.ok(r.hat, 'Aufbau');
      t.eq(r.hinten, true, 'von hinten geht es'); t.eq(r.vorn, false, 'von vorn nicht'); t.eq(r.kunde, false, 'ein gewoehnlicher Kunde nicht');
      t.eq(r.st, 'ko', 'bewusstlos'); t.eq(r.msg, true, 'Meldung "Du schaltest einen Zivilfahnder aus"');
      t.eq(r.platz, true, 'Aufbau: Platz fuer den Beobachter');
      t.eq(r.frueh, 1, 'vor der Zeit noch kein Alarm'); t.eq(r.spaet, 2, 'der Fund loest Alarm aus'); t.eq(r.fund, true, 'Meldung vom Fund');
      t.eq(r.steht, 'ko', 'im Ueberfall bleibt der Koerper bewusstlos liegen (koDrop)'); t.eq(r.ucIm, true, 'und bleibt im Spiel');
    },
  },
  {
    name: 'Hinweis: Funkgeraet und Ohrstoepsel nur im Abstand CFG.uc.hint zu irgendeinem lebenden Spieler (ucHintOn), gezeichnet nur dann (ucHintN zaehlt Zeichenaufrufe), nie an gewoehnlichen Kunden',
    async run(t) {
      const r = await t.page.evaluate(`(() => { const S = (${ONE})(3), { D, g, me, uc, civ, put } = S, H = D.CFG.uc.hint, o = { hat: !!uc, H }; if (!uc) return o; civ.st = 'away'; civ.at = 1e9;
        const at = d => { put(uc, d); return D.ucHintOn(uc); }; o.nah = at(H - 2); o.fern = at(H + 4); o.gleich = at(H * .3); o.kunde = (() => { put(civ, H * .5); civ.st = 'idle'; return D.ucHintOn(civ); })(); civ.st = 'away';
        put(uc, H - 2); me.dead = true; o.tot = D.ucHintOn(uc); me.dead = false;
        const draws = d => { put(uc, d); D.update(1 / 30); D.draw(); const n0 = D.ucHintN(); D.draw(); D.draw(); return D.ucHintN() - n0; };
        o.drawNah = draws(H - 2); o.drawFern = draws(H + 40); o.drawFern2 = draws(H * 3); return o; })()`);
      t.ok(r.hat, 'Aufbau');
      t.ok(r.H >= 40 && r.H <= 120, 'Hinweis-Abstand ist ein kurzer Abstand: ' + r.H);
      t.eq([r.nah, r.fern, r.gleich, r.kunde, r.tot], [true, false, true, false, false], 'ucHintOn nah/fern/sehr nah/Kunde/Spieler tot');
      t.eq(r.drawNah, 2, 'nah: bei jedem Zeichnen'); t.eq(r.drawFern, 0, 'fern: nie gezeichnet'); t.eq(r.drawFern2, 0, 'weit weg: nie gezeichnet');
    },
  },
  {
    name: 'Langer Blick: sieht er einen Spieler im Kegel, dreht er sich zu ihm und schaut CFG.uc.lookT s lang (der Kopf folgt), dann CFG.uc.lookCool s Ruhe; abgewandt oder zu weit schaut er nicht; gewoehnliche Kunden schauen nie',
    async run(t) {
      const r = await t.page.evaluate(`(() => { const S = (${ONE})(3), { D, g, me, uc, civ, put } = S, U = D.CFG.uc, o = { hat: !!uc, U }; if (!uc) return o; civ.st = 'away'; civ.at = 1e9; const angTo = n => Math.atan2(me.y - n.y, me.x - n.x), ad = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
        put(uc, 120); uc.base += .5; uc.a = uc.base; const tl = []; for (let i = 0; i < Math.round(30 * (U.lookT + U.lookCool + 3)); i++) { D.update(1 / 30); tl.push([uc.look && uc.look.t > 0 ? 1 : 0, ad(uc.a, angTo(uc))]); }
        const sec = s => tl[Math.round(s * 30)]; o.t0 = sec(.2)[0]; o.mid = sec(U.lookT * .6)[0]; o.winkel = sec(U.lookT * .6)[1]; o.nach = sec(U.lookT + .3)[0]; o.ruhe = sec(U.lookT + U.lookCool * .5)[0]; o.wieder = tl.slice(Math.round((U.lookT + U.lookCool) * 30)).some(x => x[0]);
        put(uc, 120); uc.base += Math.PI; uc.a = uc.base; uc.ucCd = 0; let any = false; for (let i = 0; i < 90; i++) { uc.a = uc.base; D.update(1 / 30); if (uc.look && uc.look.t > 0) any = true; } o.rueck = any;
        put(uc, U.lookR + 60); uc.ucCd = 0; any = false; for (let i = 0; i < 90; i++) { D.update(1 / 30); if (uc.look && uc.look.t > 0) any = true; } o.fern = any;
        uc.st = 'away'; uc.at = 1e9; civ.st = 'idle'; civ.at = 0; put(civ, 120); any = false; for (let i = 0; i < 30 * 8; i++) { civ.still = true; D.update(1 / 30); if (civ.look && civ.look.t > 0) any = true; } o.kunde = any; return o; })()`);
      t.ok(r.hat, 'Aufbau');
      t.ok(r.U.lookT >= 1.5, 'der lange Blick ist laenger als der Beute-Blick der Wachen (0,7 s): ' + r.U.lookT);
      t.eq([r.t0, r.mid, r.nach], [1, 1, 0], 'schaut sofort, noch nach 60 % von lookT, danach nicht mehr');
      t.ok(r.winkel < .35, 'er hat sich zum Spieler gedreht: Winkelfehler ' + r.winkel);
      t.eq(r.ruhe, 0, 'in der Ruhezeit schaut er nicht'); t.eq(r.wieder, true, 'danach schaut er wieder hin');
      t.eq(r.rueck, false, 'abgewandt: kein Blick'); t.eq(r.fern, false, 'zu weit weg: kein Blick'); t.eq(r.kunde, false, 'gewoehnlicher Kunde schaut nie');
    },
  },
  {
    name: 'Coop: Host und Client haben dieselben Zivilfahnder (Zaehler 5: zwei, Zaehler 0: keine), der Merker kommt auch aus dem Schnappschuss, im Ueberfall sind es dieselben Gegner in Zivilkleidung, VER 56',
    async run(t) {
      await setup(t);
      const r = await t.page.evaluate(() => {
        const o = {};
        const G = CT.mkGame('bank', 321, 2, null, null, null, null, ds => { ds[0].SESSION.quiet = 5; }), A = G.A, B = G.clients[0];
        const ids = d => d.get().npcs.filter(n => n.uc).map(n => n.id).join();
        o.ver = [A.VER, B.VER]; o.idsA = ids(A); o.idsB = ids(B); o.n = o.idsA.split(',').length;
        for (const n of B.get().npcs) n.uc = 0; G.run(1); o.heil = ids(B) === o.idsA;
        o.hintBoth = [A, B].map(d => typeof d.ucHintOn === 'function');
        A.cv.dispatchEvent(new KeyboardEvent('keydown', { key: 'f', bubbles: true })); G.run(2);
        o.phase = [A.get().phase, B.get().phase]; o.enA = A.get().en.filter(e => e.uc).length; o.enB = B.get().en.filter(e => e.kind === 'grd' && (e.row === 3 || e.row === 4)).length; o.npcA = ids(A); o.npcB = ids(B);
        const H = CT.mkGame('bank', 321, 2, null, null, null, null, ds => { ds[0].SESSION.quiet = 0; }); o.keine = [ids(H.A), ids(H.clients[0])];
        return o;
      });
      t.ok(r.ver[0] >= 56 && r.ver[0] === r.ver[1], 'VER ab 56: ' + JSON.stringify(r.ver));
      t.eq(r.n, 2, 'zwei Zivilfahnder auf dem Host'); t.eq(r.idsB, r.idsA, 'der Client hat dieselben'); t.eq(r.heil, true, 'ein geloeschter Merker kommt per Schnappschuss zurueck');
      t.eq(r.phase, [2, 2], 'Ueberfall laeuft'); t.eq(r.enA, 2, 'Host: zwei Gegner mit Merker'); t.eq(r.enB, 2, 'Client: zwei Gegner in Zivilkleidung (Zeile aus dem Schnappschuss)');
      t.eq([r.npcA, r.npcB], ['', ''], 'keine Zivilfahnder mehr unter den NPCs');
      t.eq(r.keine, ['', ''], 'Zaehler 0: keine');
    },
  },
];
