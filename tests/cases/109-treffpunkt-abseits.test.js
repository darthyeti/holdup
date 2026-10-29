// Treffpunkt abseits (MRU 1 D1 und D2, docs/major-release-update-1.md, Abschnitt D0 Ergebnis, D1 und D2): Der gemeinsame Mechanismus placeMeet waehlt aus dem Seed (eigener Zufallsstrom) einen Treffpunkt im Hof der Fluchtseite
// auf einer anderen Zeile, mindestens minD Schritte von der Fluchttuer, mit dem Weg Tresor zu Wagen im Fenster. Er gilt fuer alle fuenf Gebaeude-Szenarien (CFG.meet.scs), den Transporter nicht, die Klassik-Bank nicht.
// Die Fluchttuer bleibt die Fluchttuer (exit.door), die Anker der Polizei stehen am neuen Treffpunkt (weniger als heute), Phase 1 nennt den Treffpunkt (Tag und Markierung am Boden).
// Werte je Szenario (CFG.meet.per) liest der Test aus der Konfiguration.
const { coopGame } = require('../lib');

const SC = ['bank', 'jewel', 'gas', 'museum', 'casino'];
// n: Karten fuer die Regeln (Seeds ab 1 im Abstand 37), p5: erlaubte Zahl mit p .5, p1: mindestens so viele mit p 1 (Anteil der Karten, die einen Platz im Fenster finden; Bank rund 82 %, die anderen rund 100 %)
const RULES = { bank: { n: 300, p5: [100, 160], p1: 235 }, jewel: { n: 100, p5: [30, 70], p1: 90 }, gas: { n: 100, p5: [30, 70], p1: 90 }, museum: { n: 100, p5: [30, 70], p1: 90 }, casino: { n: 60, p5: [18, 42], p1: 54 } };
// Bot: Karten mit Treffpunkt abseits, die der Bot mit fruehem Rufen (van alt) spielt, und wie viele er mindestens gewinnen muss (gemessen: Bank 38 von 38, Tankstelle 20 von 20, Museum 20 von 20, Casino 19 von 20, Juwelier 43 bis 53 %)
const BOT = { bank: { n: 12, min: 10, opt: {} }, jewel: { n: 20, min: 5, opt: {} }, gas: { n: 8, min: 6, opt: {} }, museum: { n: 8, min: 6, opt: { goods: true, goodsN: 2 } }, casino: { n: 8, min: 6, opt: {} } };
const SIDES = ['S', 'N', 'E', 'W', 'S+', 'N+', 'E+', 'W+'];

module.exports = [
  {
    name: 'Treffpunkt abseits: mit CFG.meet.p 0 (und on 0) bleibt jede Karte, wie sie war (kein meet, keine door), mit p 1 aendert sich nur der Treffpunkt (Fluchtzone, Wagen, Posten, Tag), Seed und Hallen bleiben',
    timeout: 240000,
    async run(t) {
      await t.loadInpage('turn.js');
      const r = await t.page.evaluate(SC => {
        const D = __dbg, T = 32, M = D.CFG.meet, bad = [], st = {};
        const strip = l => JSON.stringify(JSON.parse(JSON.stringify({ bld: l.bld, vault: l.vault, tellers: l.tellers, guards: l.guards, mgr: l.mgr, backDoors: l.backDoors, cams: l.cams, spawn: l.spawn, lobby: l.lobby, civ: l.civ, slots: l.slots, laneY: l.laneY, lg: l.mission.lg, hall: l.hall, q: l.q, vit: l.vit, goods: l.goods })));
        for (const sc of SC) {
          D.setScenario(sc); D.setSeedMode('random'); D.setLage([]); const hs0 = {}; let moved = 0;
          M.p = 0; M.on = 1;
          for (let s = 5000; s < 5040; s++) {
            const l = D.layoutBase(s);
            if (l.meet || (l.exit && l.exit.door)) bad.push(sc + '#' + s + ': p 0 und doch meet oder door');
            if (sc === 'bank') { const want = (l.exit.dir > 0 ? l.bld.x1 + 1 : l.bld.x0) * T; if (l.exit.x !== want) bad.push(sc + '#' + s + ': Fluchtlinie ' + l.exit.x + ' statt ' + want); }
            hs0[s] = TN.layHash(D, l);
          }
          M.p = 1; M.on = 0;
          for (let s = 5000; s < 5040; s += 3) { const l = D.layoutBase(s); if (l.meet || TN.layHash(D, l) !== hs0[s]) bad.push(sc + '#' + s + ': on 0 aendert die Karte'); }
          M.on = 1;
          for (let s = 5000; s < 5040; s++) {
            const a = D.layoutBase(s); if (!a.meet) continue; moved++;
            M.p = 0; const b = D.layoutBase(s); M.p = 1;
            if (strip(a) !== strip(b)) bad.push(sc + '#' + s + ': mit meet aendert sich mehr als der Treffpunkt');
            if (a.seed !== b.seed || a.tries !== b.tries) bad.push(sc + '#' + s + ': Seed oder Versuche weichen ab');
          }
          st[sc] = moved; M.p = .5;
        }
        return { bad: bad.slice(0, 8), st };
      }, SC);
      t.eq(r.bad, [], 'Abweichungen');
      for (const sc of SC) t.ok(r.st[sc] >= 10, sc + ': mit p 1 haben mindestens 10 von 40 Karten einen Treffpunkt abseits: ' + r.st[sc]);
    },
  },
  {
    name: 'Treffpunkt abseits: Anteil und Regeln je Szenario (p .5 trifft die Haelfte der Karten mit Platz, Abstand von der Fluchttuer, Weg Tresor zu Wagen im Fenster, Wagen faehrt am Rand ein, Stil, Zone frei, Fluchttuer erkannt)',
    timeout: 280000,
    async run(t) {
      await t.loadTool('treffpunkt.js');
      const r = await t.page.evaluate(([SC, RULES]) => {
        const D = __dbg, T = 32, bad = [], out = {};
        for (const sc of SC) {
          const M = Object.assign({}, D.CFG.meet, (D.CFG.meet.per || {})[sc]), st = { n: 0, meet: 0, forced: 0, d: [], e: [], eNow: [] }; D.setScenario(sc); D.setSeedMode('random'); D.setLage([]);
          for (let i = 0; i < RULES[sc].n; i++) {
            const s = 1 + i * 37;
            D.CFG.meet.p = .5; const l = D.layoutBase(s); st.n++; if (l.meet) st.meet++;
            D.CFG.meet.p = 0; const lb = D.layoutBase(s), repB = D.validateMap(lb), w0 = D.world(), ch0 = (x, y) => (w0.M[y - w0.WY0] || '')[x - w0.WX0];   // Raster vor dem Setzen: Zaun auf der Fahrstrecke und in der Zone
            D.CFG.meet.p = 1; const f = D.layoutBase(s); if (!f.meet) continue; st.forced++;
            const m = f.meet, tag = sc + '#' + s + ' ' + JSON.stringify(m), ln = D.laneOf(f), tm = treffpunkt.measure(f, { cars: 'fest' }), rep = D.validateMap(f);
            st.d.push(m.d); st.e.push(m.e); st.eNow.push(m.e0);
            if (m.d < M.minD) bad.push(tag + ' Abstand ' + m.d + ' unter ' + M.minD);
            if (m.e < M.pveMin || m.e > M.pveMax || m.e > m.e0 + M.extra) bad.push(tag + ' Weg Tresor zu Wagen ' + m.e + ' (vorher ' + m.e0 + ') ausserhalb des Fensters');
            if (tm.now !== m.d || tm.pveNow !== m.e) bad.push(tag + ' Messwerkzeug sieht d ' + tm.now + ' und e ' + tm.pveNow);
            if (!tm.curOk) bad.push(tag + ' der Treffpunkt besteht die Regeln des Messwerkzeugs nicht');
            { const nw = rep.warn.filter(w => !repB.warn.some(b => b.r === w.r)); if (rep.err.length || nw.length) bad.push(tag + ' validateMap ' + rep.err.concat(nw).map(e => e.r + ': ' + e.m).join(' | ')); }   // die Kennzahlen-Warnungen der Karte selbst (Casino) sind bekannt, neu darf keine dazukommen
            if (f.exit.tx !== (f.exit.dir > 0 ? m.t : m.t + 3) || f.van.stop !== m.t * T || f.van.y !== (m.r + 1) * T) bad.push(tag + ' exit/van passen nicht zu meet');
            if (f.van.dir !== -f.exit.dir) bad.push(tag + ' der Wagen faehrt nicht in Richtung Gebaeude');
            if (ln.van.rest.length < 1) bad.push(tag + ' keine Strecke bis zum Weltrand');
            if (f.exit.y1 - f.exit.y0 !== 4 * T) bad.push(tag + ' Zone nicht vier Zeilen breit');
            // Stil: Die Fahrstrecke kreuzt einen Zaun hoechstens (ein Tor), sie laeuft ihm nicht entlang, und in der Zone steht kein Zaun
            { const hiC = f.exit.dir > 0, S0 = w0.WX0, hiEnd = S0 + w0.W - 1;
              for (let x = hiC ? m.t : S0; x <= (hiC ? hiEnd : m.t + 3); x++) for (const y of [m.r, m.r + 1]) if (ch0(x, y) === 'f' && (ch0(x - 1, y) === 'f' || ch0(x + 1, y) === 'f')) bad.push(tag + ' Fahrstrecke laeuft einem Zaun entlang bei ' + x + ',' + y);
              for (let x = m.t; x <= m.t + 3; x++) for (const y of [m.r - 1, m.r + 2]) if (ch0(x, y) === 'f') bad.push(tag + ' Zaun in der Zone bei ' + x + ',' + y); }
            if (!f.exit.door || !f.spots.some(q => q.ex) || f.spots.filter(q => q.ex).length !== 1) bad.push(tag + ' die Fluchttuer wird nicht mehr erkannt');
            { const k0 = JSON.stringify([f.exit, f.van, f.meet, f.posts]); D.finishLay(f); if (JSON.stringify([f.exit, f.van, f.meet, f.posts]) !== k0) bad.push(tag + ' ein zweites finishLay veraendert den Treffpunkt'); }
            if (ln.exit.near(f.spots.find(q => q.ex).x, f.spots.find(q => q.ex).y) !== true) bad.push(tag + ' near() nennt die Fluchttuer nicht');
            // die Fluchttuer liegt nicht in der Zone, die Zone nicht im Gebaeude
            if (f.spots.some(q => q.ex && ln.exit.has(q.x, q.y))) bad.push(tag + ' die Fluchttuer liegt in der Zone');
            if (ln.exit.cells.some(c => c[0] >= f.bld.x0 && c[0] <= f.bld.x1 && c[1] >= f.bld.y0 && c[1] <= f.bld.y1)) bad.push(tag + ' Zone im Gebaeude');
          }
          const med = a => a.length ? a.slice().sort((x, y) => x - y)[Math.floor(a.length / 2)] : null;
          out[sc] = { n: st.n, meet: st.meet, forced: st.forced, dMed: med(st.d), eMed: med(st.e), eNowMed: med(st.eNow) };
        }
        D.CFG.meet.p = .5;
        return { bad: bad.slice(0, 8), nbad: bad.length, out };
      }, [SC, RULES]);
      t.eq(r.bad, [], 'Abweichungen (' + r.nbad + ')');
      for (const sc of SC) {
        const o = r.out[sc], R = RULES[sc];
        t.ok(o.meet >= R.p5[0] && o.meet <= R.p5[1], sc + ' p .5: ' + R.p5[0] + ' bis ' + R.p5[1] + ' von ' + o.n + ' Karten haben einen Treffpunkt abseits: ' + o.meet);
        t.ok(o.forced >= R.p1, sc + ' p 1: mindestens ' + R.p1 + ' von ' + o.n + ' Karten finden einen Platz: ' + o.forced);
        t.note(sc + ': p .5 ' + o.meet + ' von ' + o.n + ', p 1 ' + o.forced + ', Abstand Median ' + o.dMed + ', Weg Tresor zu Wagen Median ' + o.eMed + ' (vorher ' + o.eNowMed + ')');
      }
    },
  },
  {
    name: 'Treffpunkt abseits: Posten und Anker je Szenario (genau die Zahl aus CFG.meet an der Zone, keiner an der Fluchttuer), Tag und Markierung am Boden in Phase 1',
    timeout: 180000,
    async run(t) {
      const r = await t.page.evaluate(SC => {
        const D = __dbg, T = 32, bad = [], tot = {}; D.setLage([]);
        const rec = () => { const c = []; const p = new Proxy(function () {}, { get: (o, k) => k === 'c' ? c : k === 'strokeRect' ? (...a) => { c.push(a); } : () => p, set: () => true }); return p; };
        for (const sc of SC) {
          const M = Object.assign({}, D.CFG.meet, (D.CFG.meet.per || {})[sc]); D.setScenario(sc); D.setSeedMode('random'); D.CFG.meet.p = 1; tot[sc] = 0;
          for (let s = 1; s < 1 + 50 * 37; s += 37) {
            const l = D.layoutBase(s); if (!l.meet) continue; tot[sc]++;
            const tag = sc + '#' + s + ' ' + JSON.stringify(l.meet), m = l.meet, ln = D.laneOf(l);
            const an = l.posts.filter(p => p.anchor); if (sc === 'casino' ? (an.length < 1 || an.length > M.anchors) : an.length !== M.anchors) bad.push(tag + ' ' + an.length + ' Anker statt ' + M.anchors);   // im Casino stehen die Anker mit Abstand um die Zone (grosses Gebaeude), in der Ecke oben bleibt oft nur Platz fuer einen
            const zc = ln.exit.cells, zx = zc.reduce((a, c) => a + c[0], 0) / zc.length, zy = zc.reduce((a, c) => a + c[1], 0) / zc.length;
            for (const p of an) if (Math.hypot(p.x - zx, p.y - zy) > (sc === 'casino' ? 10 : 6)) bad.push(tag + ' Anker ' + p.x + ',' + p.y + ' liegt weit von der Zone');
            const ex = l.spots.find(q => q.ex); for (const p of an) if (Math.hypot(p.x - ex.cells[0][0], p.y - ex.cells[0][1]) < 4) bad.push(tag + ' Anker an der Fluchttuer');
            if (l.posts.length < 10) bad.push(tag + ' nur ' + l.posts.length + ' Posten');
            if (!(l.mission.tags || []).includes('Treffpunkt abseits')) bad.push(tag + ' Tag fehlt');
            // Markierung: die vier mal zwei Kacheln des Wagens, nicht mehr an der Fluchttuer (die Bank zeichnet sonst dort zwei Stellplaetze)
            const g = rec(); l.paintFloor(g); const sr = g.c.filter(a => a[2] === 4 * T - 8 && a[3] === T - 8);
            const at = (x, y) => sr.some(a => a[0] === x * T + 4 && a[1] === y * T + 4);
            if (!at(m.t, m.r) || !at(m.t, m.r + 1)) bad.push(tag + ' keine Markierung am Treffpunkt: ' + JSON.stringify(sr));
            if (sr.length !== 2) bad.push(tag + ' ' + sr.length + ' Markierungen statt 2');
          }
        }
        // ohne Treffpunkt abseits bleibt Tag und Markierung wie gehabt
        D.setScenario('bank'); D.CFG.meet.p = 0; const l0 = D.layoutBase(5000); if ((l0.mission.tags || []).includes('Treffpunkt abseits')) bad.push('p 0: Tag da');
        const g0 = rec(); l0.paintFloor(g0); if (g0.c.filter(a => a[2] === 4 * T - 8).length !== 2) bad.push('p 0: Markierung an der Fluchttuer fehlt');
        D.CFG.meet.p = .5;
        return { bad: bad.slice(0, 8), nbad: bad.length, tot };
      }, SC);
      for (const sc of SC) t.ok(r.tot[sc] >= 8, sc + ': mindestens 8 Karten geprueft: ' + r.tot[sc]);
      t.eq(r.bad, [], 'Abweichungen (' + r.nbad + ')');
    },
  },
  {
    name: 'Treffpunkt abseits: in allen 8 Lagen der Strasse je Szenario (Fluchttuer bleibt erkannt, Zone und Wagenweg frei, validateMap ohne Fehler, Wege wie in der Basis)',
    timeout: 280000,
    async run(t) {
      await t.loadTool('treffpunkt.js');
      const r = await t.page.evaluate(([SC, SIDES]) => {
        const D = __dbg, bad = [], n = {}; D.CFG.meet.p = 1;
        for (const sc of SC) {
          D.setScenario(sc); D.setSeedMode('random'); D.setLage([]); n[sc] = 0;
          for (let s = 1; s < 1 + (sc === 'bank' ? 40 : 14) * 37; s += 37) {
            const base = D.layoutBase(s); if (!base.meet) continue; n[sc]++; D.CFG.meet.p = 0; const repB = D.validateMap(D.layoutBase(s)); D.CFG.meet.p = 1;
            for (const sd of SIDES) {
              D.setScenario(sc); D.setSeedMode('random'); D.setLage([]); const l0 = D.layoutBase(s), lay = sd === 'S' ? l0 : D.turnLayout(l0, sd[0], sd[1] === '+'), tag = sc + '#' + s + ' ' + sd, rep = D.validateMap(lay), tm = treffpunkt.measure(lay, { cars: 'fest' }), nw = rep.warn.filter(w => !repB.warn.some(b => b.r === w.r));
              const errs = rep.err.filter(e => !(e.r === 'welt' && sc === 'bank' && (sd[0] === 'E' || sd[0] === 'W'))); // die Bank ist gedreht nur 28 breit (bekannt)
              if (errs.length || nw.length) bad.push(tag + ' validateMap ' + errs.concat(nw).map(e => e.r + ': ' + e.m).join(' | '));
              if (!lay.meet || lay.meet.t !== base.meet.t) bad.push(tag + ' meet fehlt oder wanderte');
              if (!tm.curOk) bad.push(tag + ' Treffpunkt besteht die Regeln nicht');
              if (Math.abs(tm.now - base.meet.d) > 2 || tm.pveNow !== null && Math.abs(tm.pveNow - base.meet.e) > 2) bad.push(tag + ' Wege ' + tm.now + '/' + tm.pveNow + ' statt ' + base.meet.d + '/' + base.meet.e);
              if (lay.spots.filter(q => q.ex).length !== 1) bad.push(tag + ' Fluchttuer nicht erkannt');
            }
          }
        }
        D.CFG.meet.p = .5;
        return { bad: bad.slice(0, 8), nbad: bad.length, n };
      }, [SC, SIDES]);
      for (const sc of SC) t.ok(r.n[sc] >= (sc === 'bank' ? 12 : 8), sc + ': genug Karten geprueft: ' + r.n[sc]);
      t.eq(r.bad, [], 'Abweichungen (' + r.nbad + ')');
    },
  },
  {
    name: 'Treffpunkt abseits: im Spiel kommt der Wagen am neuen Halt an (alle Szenarien), nur dort (nicht an der Fluchttuer) wird gesichert, die Fluchttuer oeffnet mit dem Ueberfall, das Ziel ist zu Fuss erreichbar',
    timeout: 240000,
    async run(t) {
      const r = await t.page.evaluate(SC => {
        const D = __dbg, T = 32, bad = [], res = {}; D.setLage([]); D.CFG.meet.p = 1; D.CFG.vanLock = 0; D.CFG.van.r = 0; D.CFG.alt.on = 0;   // alt 0: ohne Ausweichpunkt (MRU 1 D3, Test 125), hier gilt nur der Treffpunkt A. r 0: Beamte am Wagen machen den Fahrer nicht nervoes (die Anker stehen bewusst dort), geprueft wird hier nur der Ort
        for (const sc of SC) {
          D.setScenario(sc); D.setSeedMode('random'); D.setLage([]);
          let seed = null; for (let s = 1; s < 800 && seed == null; s++) if (D.layoutBase(s).meet) seed = s;
          if (seed == null) { bad.push(sc + ': keine Karte mit Treffpunkt abseits'); continue; }
          const out = {};
          for (const step of ['tuer', 'zone']) {
            D.buildLay(D.layoutFor(seed)); const L = D.LAY(), ln = D.LANE(), g = D.get(), me = g.me, tag = sc + '#' + seed + ' ' + step;
            D.startHeist(false, me);
            const ex = L.spots.find(q => q.ex); const opened = ex.cells.every(c => !D.world().isSol(c[0], c[1]));
            if (!opened) bad.push(tag + ' die Fluchttuer oeffnet mit dem Ueberfall nicht');
            D.callVan(); for (let i = 0; i < 30 * 200 && !D.get().vanArr; i++) { me.hp = 1e9; me.inv = 1e9; me.x = L.spawn.x; me.y = L.spawn.y; D.update(1 / 30); }
            if (!D.get().vanArr) { bad.push(tag + ' der Wagen kam nicht an'); break; }
            for (let i = 0; i < 30 * 15 && Math.abs(D.get().vanX - ln.van.stop) > 2; i++) { me.hp = 1e9; me.inv = 1e9; me.x = L.spawn.x; me.y = L.spawn.y; D.update(1 / 30); }
            if (Math.abs(D.get().vanX - ln.van.stop) > 2) bad.push(tag + ' der Wagen steht bei ' + D.get().vanX + ' statt ' + ln.van.stop);
            // Das Ziel liegt neben dem Wagen (nicht in ihm) und ist vom Start aus zu Fuss erreichbar, auch wenn der Wagen als fester Block steht
            if (D.world().isSol(ln.exit.goal[0], ln.exit.goal[1])) bad.push(tag + ' das Ziel ' + ln.exit.goal + ' liegt im Festen');
            if (!D.pathTo(L.spawn.x, L.spawn.y, ln.exit.goal[0], ln.exit.goal[1]).length) bad.push(tag + ' kein Weg vom Start zum Ziel ' + ln.exit.goal + ' am stehenden Wagen');
            // me.inv: Die Polizei schiesst (Streuung ueber Math.random). Jeder Treffer setzt hurt, und solange hurt > 0 ist, faengt das Einsteigen (vanBoard) von vorn an. Mit 3 Einheiten dauert es 1,95 s, bei dichtem Beschuss
            // reichten die 6 s hier etwa in 1 von 13 Laeufen nicht (Ticket #5). Geprueft wird nur der Ort, deshalb trifft hier nichts (hitPlayer bricht bei inv > 0 ab).
            me.units = 3; me.loot = 1000;
            const outside = step === 'tuer' ? [ex.cells[0][0] - ex.iv[0], ex.cells[0][1] - ex.iv[1]] : ln.exit.goal;
            for (let i = 0; i < 30 * 6; i++) { me.hp = 1e9; me.inv = 1e9; me.x = outside[0] * T + 16; me.y = outside[1] * T + 16; D.update(1 / 30); if (D.get().escaped || D.get().ended) break; }
            out[step] = { esc: D.get().escaped, ended: !!D.get().ended, secured: D.get().secured };
          }
          if (out.tuer && (out.tuer.esc > 0 || out.tuer.secured > 0)) bad.push(sc + ': an der Fluchttuer wurde gesichert: ' + JSON.stringify(out.tuer));
          if (out.zone && !(out.zone.esc > 0 || out.zone.secured > 0 || out.zone.ended)) bad.push(sc + ': am neuen Halt wurde nichts gesichert: ' + JSON.stringify(out.zone));
          res[sc] = out;
        }
        D.CFG.meet.p = .5;
        return { bad, res };
      }, SC);
      t.note(JSON.stringify(r.res));
      t.eq(r.bad, [], 'Abweichungen');
    },
  },
  {
    name: 'Treffpunkt abseits: Coop zu zweit auf einer Karte mit Treffpunkt abseits je Szenario (Host und Client bauen gleich, der Wagen kommt am neuen Halt an, Sieg)',
    timeout: 280000,
    async run(t) {
      const seeds = await t.page.evaluate(SC => { const D = __dbg, out = {}; for (const sc of SC) { D.setScenario(sc); D.setSeedMode('random'); D.setLage([]); for (let s = 1; s < 400 && out[sc] == null; s++) if (D.layoutFor(s).meet) out[sc] = s; } return out; }, SC);
      t.eq(Object.keys(seeds).length, SC.length, 'je Szenario eine Karte mit Treffpunkt abseits gefunden: ' + JSON.stringify(seeds));
      const res = []; for (const sc of SC) { const r = await coopGame(t.env, sc, seeds[sc]); r.tag = sc + ' ' + r.tag; res.push(r); }
      t.note(res.map(r => r.tag).join(', '));
      t.eq(res.flatMap(r => r.bad.map(b => r.tag + ': ' + b)), [], 'Abweichungen');
    },
  },
  {
    name: 'Treffpunkt abseits: der Bot mit fruehem Rufen gewinnt auf Karten mit Treffpunkt abseits (Bank 10 von 12, Tankstelle, Museum, Casino 6 von 8, Juwelier 5 von 20, kein Haenger)',
    slow: true,
    open: { det: true },
    timeout: 290000,
    async run(t) {
      await t.loadTool('bot.js');
      const r = await t.page.evaluate(([SC, BOT]) => {
        const D = __dbg, M = D.CFG.meet, out = {}; M.p = 1;
        for (const sc of SC) {
          D.setScenario(sc); D.setSeedMode('random'); D.setLage([]);
          const seeds = []; for (let s = 5000; seeds.length < BOT[sc].n && s < 5300; s++) if (D.layoutBase(s).meet) seeds.push(s);
          let w = 0, to = 0; const lost = [];
          for (const s of seeds) { D.setLage([]); D.buildLay(D.layoutFor(s)); const q = bot.run(Object.assign({ sigma: .05, react: .35, kit: 'old', call: 0, van: 'alt', seed: s }, BOT[sc].opt)); if (q.res === 'WIN') w++; else { lost.push(s + ':' + q.res); if (q.res === 'TIMEOUT') to++; } }
          out[sc] = { n: seeds.length, w, to, lost };
        }
        M.p = .5;
        return out;
      }, [SC, BOT]);
      t.note(SC.map(sc => sc + ' ' + r[sc].w + '/' + r[sc].n).join(', '));
      for (const sc of SC) t.ok(r[sc].n === BOT[sc].n && r[sc].to === 0 && r[sc].w >= BOT[sc].min, sc + ': ' + r[sc].w + ' von ' + r[sc].n + ' Siegen (mindestens ' + BOT[sc].min + '), ' + r[sc].to + ' Haenger, verloren: ' + r[sc].lost.slice(0, 6).join(' '));
    },
  },
  {
    name: 'Treffpunkt abseits: das Messwerkzeug und der Mechanismus nutzen dieselben Regeln (Zahl der Kandidaten im Hof der Fluchtseite gleich, alle Szenarien)',
    timeout: 180000,
    async run(t) {
      await t.loadTool('treffpunkt.js');
      const r = await t.page.evaluate(SC => {
        const D = __dbg, bad = []; D.CFG.meet.p = 0;
        for (const sc of SC) { D.setScenario(sc); D.setSeedMode('random'); D.setLage([]); for (let s = 1; s < 1 + 25 * 37; s += 37) { const l = D.layoutBase(s), tm = treffpunkt.measure(l, { cars: 'fest' }), c = D.meetCands(l); if (c.length !== tm.cls.A.n) bad.push(sc + '#' + s + ': ' + c.length + ' Kandidaten im Spiel, ' + tm.cls.A.n + ' im Messwerkzeug'); } }
        D.CFG.meet.p = .5;
        return bad.slice(0, 6);
      }, SC);
      t.eq(r, [], 'Abweichungen');
    },
  },
];
