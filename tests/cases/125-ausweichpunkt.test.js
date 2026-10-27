// MRU 1 D3 (docs/major-release-update-1.md): Ausweichpunkt des Fluchtwagens. Zu einem Auftrag kann es einen zweiten Treffpunkt B geben (CFG.alt.p), den nichts vorher zeigt (Till: Ueberraschung). Haelt die Polizei den Treffpunkt A,
// weicht der Fahrer nach B aus, beim Eintreffen sofort oder nach dem Wegfahren (nervoes) nach CFG.alt.wait Sekunden, hoechstens CFG.alt.max Mal je Auftrag. B wird beim Aufbau der Welt aus dem Seed gewuerfelt (altOf, ALT), in der Lage der Strasse
// (laneOf), ohne etwas freizuraeumen. Im Netz fuehrt der Schnappschuss den Index (g[29] vanAlt). Hilfen: D.alt() (B und Stand), D.altCan(), D.altSwap(first), D.copsNearVan(lane,k).

const SC = ['bank', 'jewel', 'gas', 'museum', 'casino'];
// gemeinsamer Aufbau im Seitenkontext: Szenario, Seed mit Ausweichpunkt suchen, Welt bauen (Wagen sofort rufbar, keine Polizei von selbst, Zeitfenster gross)
const PRE = `(sc, from, dir, turn) => { const D = __dbg; D.setScenario(sc); D.setSeedMode('random'); D.setLage([]); const C = D.CFG; C.alt.on = 1; C.alt.p = 1; C.vanLock = 0; C.policeAt = 1e6; C.policeForced = 1e6; C.vanStay = 1e6; C.vanCall = 1; C.meet.p = 0;
  let seed = null, hit = null; for (let s = from || 1; s < 200 && seed == null; s++) for (const tr of [].concat(turn || 'S')) { D.setTurn(tr); D.buildSeed(s + 1000); D.buildSeed(s); if (D.alt() && (!dir || D.LANE().exit.dir === dir)) { seed = s; hit = tr; break; } } if (seed == null) throw new Error('kein Seed mit Ausweichpunkt fuer ' + sc + ' ' + dir + ' ' + turn); D.setTurn(hit); D.buildSeed(seed + 1000); D.buildSeed(seed); return seed; }`;
// ein Schritt der Spielzeit (Beamte mit hold stehen jeden Schritt wieder an ihrem Halt) mit unverwundbarem, weit weg stehendem Spieler
const STEP = `(n, cops) => { const D = __dbg, g = D.get(), me = g.me, L = D.LAY(); for (let i = 0; i < n; i++) { me.hp = 1e9; me.hurt = 0; me.x = L.spawn.x; me.y = L.spawn.y; for (const c of cops || []) if (c.hold) { c.x = c.hold[0]; c.y = c.hold[1]; c.hp = 1e9; } D.update(1 / 30); } }`;

module.exports = [
  {
    name: 'Auswahl: B liegt auf freiem Boden (Zone 4 x 4 und Fahrstrecke), nicht auf Zone, Fahrstrecke und Wagenplaetzen von A, mit Fussweg von A (9 bis 26 Schritte) und vom Tresor (hoechstens 34); in jeder Lage der Strasse und jedem Szenario gibt es B bei mindestens 40 % der Karten, gleich oft in allen vier Lagen, deterministisch; ohne CFG.alt.on, mit p 0, am Transporter und bei der Klassik-Bank gibt es keins',
    timeout: 240000,
    async run(t) {
      await t.loadInpage('turn.js');
      const r = await t.page.evaluate(SC => {
        const D = __dbg, T = 32, bad = [], per = {}, M0 = D.CFG.alt; D.setSeedMode('random'); D.setLage([]); D.CFG.alt.p = 1; D.CFG.meet.p = 0;
        for (const sc of SC) {
          D.setScenario(sc); const has = {}, cnt = [0, 0];
          for (const tf of ['S', 'N', 'E', 'W+']) {
            D.setTurn(tf);
            for (let s = 1; s <= 4; s++) {
              const seed = s * 37; D.buildSeed(seed); const a = D.alt(), ln = D.LANE(), w = D.world(), tag = sc + '#' + seed + ' ' + tf; cnt[1]++;
              (has[seed] = has[seed] || []).push(a ? 1 : 0); if (!a) continue; cnt[0]++;
              const A = new Set(); for (const c of [].concat(ln.exit.cells, ln.van.swept, ln.van.rest, ln.slots.flatMap(q => q.cells))) A.add(c[0] + ',' + c[1]);
              const cells = a.zone.concat(a.swept);
              if (!cells.every(c => w.cell(c[0], c[1]) === 'o')) bad.push(tag + ' B liegt nicht auf freiem Boden');
              if (cells.some(c => A.has(c[0] + ',' + c[1]))) bad.push(tag + ' B ueberschneidet A');
              if (a.zone.length !== 16) bad.push(tag + ' Zone hat ' + a.zone.length + ' Kacheln');
              const M = D.CFG.alt; if (!(a.d >= M.dMin && a.d <= M.dMax)) bad.push(tag + ' Fussweg A nach B ' + a.d); if (!(a.e >= 0 && a.e <= M.eMax)) bad.push(tag + ' Weg Tresor nach B ' + a.e);
              const pl = D.pathTo(ln.exit.goal[0] * T + 16, ln.exit.goal[1] * T + 16, a.goal[0], a.goal[1]).length; if (!pl) bad.push(tag + ' kein Weg von A nach B'); else { if (pl < a.d - 3 || pl > a.d + 8) bad.push(tag + ' Fussweg ' + pl + ' statt etwa ' + a.d); const ax = ln.axis === 'x' ? 0 : 1, cx = 1 - ax, cr = a.zone.map(c => c[cx]), lo = Math.min(...cr), hi = Math.max(...cr), oc = a.goal[cx] === lo ? hi : lo, og = [a.goal[0], a.goal[1]]; og[cx] = oc; const po = D.pathTo(ln.exit.goal[0] * T + 16, ln.exit.goal[1] * T + 16, og[0], og[1]).length; if (po && po + 1 < pl) bad.push(tag + ' das Ziel liegt in der ferneren Zeile (' + pl + ' statt ' + po + ')'); }
              if (Math.abs(a.from - a.t) < M0.drive) bad.push(tag + ' der Wagen faehrt weniger als ' + M0.drive + ' Kacheln'); if (a.dir !== ln.van.dir) bad.push(tag + ' Fahrtrichtung ' + a.dir + ' statt ' + ln.van.dir);
              if (a.e0 != null && a.e > a.e0 + M0.extra) bad.push(tag + ' Weg Tresor nach B ' + a.e + ' ueber ' + a.e0 + ' plus ' + M0.extra); if (!a.zone.some(c => c[0] === a.goal[0] && c[1] === a.goal[1])) bad.push(tag + ' Ziel liegt nicht in der Zone');
              { const cr = c => ln.axis === 'x' ? c[1] : c[0], zs = [...new Set(a.zone.map(cr))].sort((p, q) => p - q), ss = [...new Set(a.swept.map(cr))].sort((p, q) => p - q); if (zs.length !== 4 || ss.length !== 2 || ss[0] !== zs[1] || ss[1] !== zs[2]) bad.push(tag + ' Wagenzeilen ' + ss + ' liegen nicht in der Mitte der Zone ' + zs); }
              if (w.isSol(a.goal[0], a.goal[1])) bad.push(tag + ' Ziel von B liegt im Festen'); if (a.cur !== 0 || a.n !== 0) bad.push(tag + ' Auftrag beginnt nicht an A');
              if (s <= 2) { D.buildSeed(seed + 1); D.buildSeed(seed); const b = D.alt(); if (!b || b.t !== a.t || b.r !== a.r || b.d !== a.d) bad.push(tag + ' nicht deterministisch'); }
            }
          }
          for (const k of Object.keys(has)) if (new Set(has[k]).size !== 1) bad.push(sc + '#' + k + ' B gibt es nicht in allen Lagen gleich: ' + has[k]);
          per[sc] = cnt; if (cnt[0] < cnt[1] * 0.4) bad.push(sc + ': B bei nur ' + cnt[0] + ' von ' + cnt[1] + ' Karten');
        }
        // Fussweg-Grenzen aus der Konfiguration: enger gestellt gelten sie fuer jedes B
        { const M = D.CFG.alt, lim = {}; D.setScenario('gas'); D.setTurn('S'); for (const [lo, hi] of [[14, 99], [0, 11]]) { M.dMin = lo; M.dMax = hi; const ds = []; for (let s = 1; s <= 12; s++) { D.buildSeed(s * 37); const a = D.alt(); if (a) ds.push(a.d); } lim[lo + '-' + hi] = ds.length ? [Math.min(...ds), Math.max(...ds), ds.length] : null; if (ds.length < 3) bad.push('Fussweg-Grenzen ' + lo + ' bis ' + hi + ': zu wenige B (' + ds.length + ')'); else if (ds.some(d => d < lo || d > hi)) bad.push('Fussweg-Grenzen ' + lo + ' bis ' + hi + ' verletzt: ' + ds); } M.dMin = 10; M.dMax = 26; per.grenzen = lim; }
        // aus: on 0, p 0, Transporter, Klassik
        D.setTurn('S'); D.setScenario('bank'); const off = {}; D.CFG.alt.on = 0; D.buildSeed(111); off.on0 = D.alt(); D.CFG.alt.on = 1; D.CFG.alt.p = 0; D.buildSeed(112); off.p0 = D.alt(); D.CFG.alt.p = 1;
        D.setScenario('truck'); D.buildSeed(5017); off.truck = D.alt(); D.setScenario('bank'); D.setSeedMode('classic'); D.buildSeed('classic'); off.classic = D.alt(); D.setSeedMode('random'); const sv = D.CFG.alt.scs; D.CFG.alt.scs = ['gas']; D.buildSeed(113); off.scs = D.alt(); D.CFG.alt.scs = sv;
        return { bad, per, off };
      }, SC);
      t.eq(r.bad, [], 'alle Pruefungen an B'); t.eq(r.off, { on0: null, p0: null, truck: null, classic: null, scs: null }, 'aus bei CFG.alt.on 0, p 0, Transporter, Klassik und einem Szenario ausserhalb von CFG.alt.scs');
      t.note('Karten mit B (von 16 je Szenario, p 1): ' + JSON.stringify(r.per));
    },
  },
  {
    name: 'Unsichtbar: B steht in keiner Karte, keinem Tag und keiner Ebene (Raster, Felder und statische Ebene sind mit und ohne B Zeichen fuer Zeichen gleich), die Markierung erscheint erst, wenn der Fahrer ausweicht, und zeigt dann die zwei Stellplaetze von B',
    timeout: 200000,
    async run(t) {
      await t.loadInpage('turn.js');
      const r = await t.page.evaluate(PRE => {
        const D = __dbg, o = { bad: [] };
        for (const sc of ['bank', 'jewel', 'gas', 'museum', 'casino']) {
          const sd = (0, eval)(PRE)(sc, 1), h = on => { D.CFG.alt.on = on; D.buildSeed(sd + 1000); D.buildSeed(sd); const lay = D.LAY(); return [TN.layHash(D, D.layoutFor(sd)), TN.hashCanvas(D.world().st), Object.keys(lay).sort().join(','), lay.mission.tags.join('|')].join('#'); };
          const a = h(1), b = h(0); D.CFG.alt.on = 1; if (a !== b) o.bad.push(sc + ' Seed ' + sd + ': Karte oder Ebene mit B anders als ohne'); if (!/^[^#]+#[^#]+#[^#]+#/.test(a)) o.bad.push('Hash ' + a);
        }
        (0, eval)(PRE)('bank', 1); const g = D.get(), me = g.me, L = D.LAY(); D.startHeist(false, me); D.callVan();
        const rects = () => { const c = document.querySelector('canvas').getContext('2d'); let n = 0; const f = c.strokeRect; c.strokeRect = function () { if (String(this.strokeStyle) === 'rgba(255, 255, 255, 0.7)') n++; return f.apply(this, arguments); }; D.draw(); c.strokeRect = f; return n; };
        const step = (n) => { for (let i = 0; i < n; i++) { me.hp = 1e9; me.x = L.spawn.x; me.y = L.spawn.y; D.update(1 / 30); } };
        step(30 * 60); o.arr = [D.get().vanArr, D.get().vanMode, D.alt().cur]; o.r0 = rects(); const a = D.alt();
        const w = D.world(), A0 = { stop: D.LANE().van.stop, pos: D.LANE().van.pos }, vcells = () => D.LANE().box(A0.stop, A0.stop + 128, A0.pos, 32).filter(c => w.cell(c[0], c[1]) === 'v').length;
        o.stamp0 = vcells(); D.altSwap(false); o.stamp1 = vcells();   // der stehende Wagen an A wird beim Ausweichen sofort abgebaut
        o.msg = D.msgs().feed.concat(D.msgs().banner || []).filter(s => /weicht aus: weiter im (Norden|Süden|Osten|Westen)/.test(s)).length; step(30 * 4); o.r1 = rects(); o.cur = D.alt().cur;
        return o;
      }, PRE);
      t.eq(r.bad, [], 'Karte, Felder, Tags und statische Ebene mit und ohne B gleich'); t.eq(r.arr, [true, 0, 0], 'der Wagen kommt an A an'); t.eq([r.stamp0 >= 6, r.stamp1], [true, 0], 'der stehende Wagen an A ist ein fester Block, beim Ausweichen ist er sofort weg'); t.eq(r.r0, 0, 'vor dem Ausweichen keine Markierung von B im Bild'); t.eq(r.r1, 2, 'danach zwei umrandete Stellplaetze von B'); t.eq(r.cur, 1, 'B gilt'); t.ok(r.msg >= 1, 'Meldung "Der Fahrer weicht aus"');
    },
  },
  {
    name: 'Ausweichen: Beim Eintreffen mit Polizei an A faehrt der Wagen gleich an B ein, ohne Polizei bleibt es bei A, sind beide besetzt, bleibt er bei A; nervoes geworden weicht er nach dem Wegfahren und CFG.alt.wait Sekunden aus (Polizei haelt A noch), wartet abseits solange B besetzt ist; an B steht er fest, gesichert wird nur dort; zurueck nach A nur bei besetztem B und freiem A, hoechstens CFG.alt.max Mal; der Auftrag beginnt wieder an A',
    timeout: 240000,
    async run(t) {
      const r = await t.page.evaluate(({ PRE, STEP }) => {
        const D = __dbg, T = 32, o = {}, pre = (0, eval)(PRE), step = (0, eval)(STEP); pre('bank', 1);
        const mine = () => { const l = D.LANE(); return { stop: l.van.stop, pos: l.van.pos, goal: l.exit.goal.slice() }; }, snap = () => { const g = D.get(); return [g.vanArr, g.vanMode, D.alt().cur, D.alt().n, +(Math.abs(g.vanX - D.LANE().van.stop) <= 2)]; };
        const A = mine(), B0 = D.alt();
        const midOf = (stop, pos) => { const l = D.LANE(), q = l.pt(stop + 64, pos); return q; }, copAt = (stop, pos) => { const m = midOf(stop, pos), c = D.mkCop(m[0], m[1]); D.get().en.push(c); c.hold = m; return c; };
        const feed = () => D.msgs().feed.concat(D.msgs().banner || []).filter(s => /weicht aus/.test(s)).length;
        const start = () => { pre('bank', 1); D.startHeist(false, D.get().me); D.callVan(); };
        // (a) mit Polizei an A beim Eintreffen
        // (a0) zwei Beamte am Halt reichen beim Eintreffen nicht (CFG.alt.hold 3)
        start(); { const two = [copAt(A.stop, A.pos), copAt(A.stop, A.pos)]; for (let i = 0; i < 30 * 200 && !D.get().vanArr; i++) step(1, two); o.a0 = snap(); }
        // (a) drei Beamte (hold) halten den Treffpunkt beim Eintreffen
        start(); const cA = copAt(A.stop, A.pos), cA3 = [cA, copAt(A.stop, A.pos), copAt(A.stop, A.pos)]; for (let i = 0; i < 30 * 200 && !D.get().vanArr; i++) step(1, cA3); o.a1 = snap(); o.aFrom = Math.abs(D.get().vanX - D.LANE().van.from); step(30 * 3, cA3); o.a2 = snap(); o.aMsg = feed();
        const l1 = D.LANE(); o.aStop = [l1.van.stop === B0.stop, l1.van.pos === B0.pos, l1.exit.goal[0] === B0.goal[0] && l1.exit.goal[1] === B0.goal[1]];
        o.aStamp = (() => { const w = D.world(); const cells = D.LANE().box(D.LANE().van.stop, D.LANE().van.stop + 128, D.LANE().van.pos, 32).filter(c => w.cell(c[0], c[1]) === 'v').length; const ca = D.LANE().box(A.stop, A.stop + 128, A.pos, 32).filter(c => w.cell(c[0], c[1]) === 'v').length; return [cells, ca]; })();
        // an B einsteigen: gesichert wird nur dort
        { const me = D.get().me; me.units = 3; me.loot = 1000; const g = D.LANE().exit.goal; for (let i = 0; i < 30 * 8; i++) { me.hp = 1e9; me.hurt = 0; me.x = g[0] * T + 16; me.y = g[1] * T + 16; for (const q of cA3) { q.x = q.hold[0]; q.y = q.hold[1]; } D.update(1 / 30); if (D.get().escaped || D.get().ended) break; } o.aEsc = [D.get().escaped > 0 || D.get().secured > 0 || !!D.get().ended]; }
        // (b) ohne Polizei: bleibt an A
        start(); for (let i = 0; i < 30 * 200 && !D.get().vanArr; i++) step(1); step(30 * 3); o.b = snap();
        // (c) beide besetzt: bleibt an A, wird nervoes, faehrt weg, wartet abseits; erst wenn B frei ist, weicht er aus
        start(); const cAc = [copAt(A.stop, A.pos), copAt(A.stop, A.pos), copAt(A.stop, A.pos)]; let cB = copAt(B0.stop, B0.pos); for (let i = 0; i < 30 * 200 && !D.get().vanArr; i++) step(1, cAc.concat([cB])); o.c1 = snap(); step(30 * 12, cAc.concat([cB])); o.c2 = snap();
        step(30 * 6, cAc.concat([cB])); o.c3 = snap(); cB.hold = null; cB.x = -999; cB.y = -999; cB.hp = 0; for (let i = 0; i < 30 * 5 && D.alt().cur === 0; i++) step(1, cAc); o.c4 = snap();
        // (d) erst am Wagen, dann Polizei: nervoes, weg, abseits, ausweichen, an B ankommen
        start(); for (let i = 0; i < 30 * 200 && !D.get().vanArr; i++) step(1); step(30 * 4); o.d0 = snap(); const cD = copAt(A.stop, A.pos); step(30 * 2, [cD]); o.d1 = snap(); step(30 * 6, [cD]); o.d2 = snap(); for (let i = 0; i < 30 * 10 && D.alt().cur === 0; i++) step(1, [cD]); o.d3 = snap(); step(30 * 3, [cD]); o.d4 = snap(); o.dMsg = feed();
        // (e) Polizei wechselt: jetzt haelt sie B, A ist frei: er geht nach A zurueck (zweites Ausweichen), danach ist Schluss (max 2)
        cD.hold = null; cD.hp = 0; cD.x = -999; cD.y = -999; const cE = copAt(B0.stop, B0.pos); for (let i = 0; i < 30 * 20 && D.alt().cur === 1; i++) step(1, [cE]); o.e1 = snap(); step(30 * 3, [cE]); o.e2 = snap(); o.eStop = D.LANE().van.stop === A.stop;
        const cF = copAt(A.stop, A.pos); cE.hold = null; cE.hp = 0; cE.x = -999; cE.y = -999; step(30 * 25, [cF]); o.f = snap(); o.fCan = D.altCan();
        // (h) Polizei macht den Fahrer nervoes und zieht ab, bevor er ausweicht: B ist frei, aber A auch, also wartet er und kehrt nach CFG.van.back nach A zurueck
        start(); for (let i = 0; i < 30 * 200 && !D.get().vanArr; i++) step(1); step(30 * 4); const cH = copAt(A.stop, A.pos); for (let i = 0; i < 30 * 12 && D.get().vanMode !== 2; i++) step(1, [cH]); cH.hold = null; cH.hp = 0; cH.x = -999; cH.y = -999; o.h0 = snap(); step(30 * 4, []); o.h1 = snap(); step(30 * 6, []); o.h2 = snap();
        // (g) neuer Auftrag: wieder A, auch wenn B galt und Wechsel gezaehlt sind (ohne neuen Aufbau der Welt)
        D.altSwap(false); o.g0 = [D.alt().cur, D.alt().n]; D.reset(); o.g = [D.alt().cur, D.alt().n, D.LANE().van.stop === A.stop, Math.abs(D.get().vanX - D.LANE().van.from) < 1];
        return o;
      }, { PRE, STEP });
      t.eq([r.a0[2], r.a0[3]], [0, 0], 'a: zwei Beamte an A beim Eintreffen reichen nicht (CFG.alt.hold 3), der Wagen faehrt an A ein'); t.eq(r.a1.slice(0, 4), [true, 0, 1, 1], 'a: drei Beamte an A beim Eintreffen: der Wagen faehrt gleich an B ein (vanAlt 1, ein Wechsel)'); t.ok(r.aFrom < 8, 'a: er faehrt von der Anfahrt von B aus ein (vanX ' + r.aFrom + ' Pixel vom Start von B)'); t.eq(r.a2, [true, 0, 1, 1, 1], 'a: und steht dort'); t.ok(r.aMsg >= 1, 'a: Meldung'); t.eq(r.aStop, [true, true, true], 'a: LANE.van und LANE.exit zeigen auf B');
      t.eq(r.aStamp[0], 8, 'a: der stehende Wagen ist ein fester Block (8 Kacheln) an B'); t.eq(r.aStamp[1], 0, 'a: an A steht nichts'); t.ok(r.aEsc[0], 'a: an B wird gesichert');
      t.eq(r.b, [true, 0, 0, 0, 1], 'b: ohne Polizei bleibt es bei A');
      t.eq([r.c1[2], r.c1[3]], [0, 0], 'c: sind beide besetzt, faehrt er an A ein'); t.eq([r.c2[1], r.c2[2], r.c2[3]], [2, 0, 0], 'c: nervoes weg, abseits, kein Ausweichen solange B besetzt ist'); t.eq([r.c3[1], r.c3[2], r.c3[3]], [2, 0, 0], 'c: auch spaeter nicht'); t.eq([r.c4[1], r.c4[2], r.c4[3]], [3, 1, 1], 'c: B wird frei, er weicht aus (kommt zurueck, an B)');
      t.eq([r.d0[1], r.d0[2], r.d0[3], r.d0[4]], [0, 0, 0, 1], 'd: ohne Polizei steht er an A'); t.ok(r.d1[1] === 0 && r.d1[2] === 0, 'd: Polizei an A: nervoes, noch da'); t.eq([r.d2[1], r.d2[2]], [2, 0], 'd: nach 5 s weg, wartet abseits (noch nicht ausgewichen: wait 3 s)'); t.eq([r.d3[1], r.d3[2], r.d3[3]], [3, 1, 1], 'd: danach weicht er aus und kommt zurueck'); t.eq([r.d4[1], r.d4[2], r.d4[4]], [0, 1, 1], 'd: und steht an B'); t.ok(r.dMsg >= 1, 'd: Meldung');
      t.eq([r.e1[2], r.e1[3]].concat(r.eStop), [0, 2, true], 'e: haelt die Polizei B und ist A frei, geht er zurueck nach A (zweites Ausweichen)'); t.eq([r.e2[1], r.e2[4]], [0, 1], 'e: und steht dort');
      t.eq([r.f[2], r.f[3], r.fCan], [0, 2, false], 'f: mehr als CFG.alt.max Wechsel gibt es nicht, er bleibt bei A (nervoes, abseits)'); t.eq(r.g0, [1, 1], 'g: vor dem neuen Auftrag gilt B'); t.eq(r.g, [0, 0, true, true], 'g: ein neuer Auftrag beginnt wieder an A (Wechsel zurueckgesetzt)'); t.eq([r.h0[1], r.h0[2]], [2, 0], 'h: der Fahrer ist abseits'); t.eq([r.h1[1], r.h1[2], r.h1[3]], [2, 0, 0], 'h: ist A frei, weicht er auch nach CFG.alt.wait nicht aus'); t.eq([r.h2[1], r.h2[2], r.h2[3]].concat(r.h2[4]), [0, 0, 0, 1], 'h: er kehrt nach CFG.van.back nach A zurueck');
    },
  },
  {
    name: 'Grenzen: B gilt als besetzt, wenn ein Beamter naeher als CFG.van.r mal CFG.alt.free am Halt steht (knapp davor schon, knapp dahinter nicht), tote und ergebene Beamte zaehlen nicht, CFG.alt.max 0 und CFG.alt.on 0 verbieten das Ausweichen',
    timeout: 120000,
    async run(t) {
      const r = await t.page.evaluate(PRE => {
        const D = __dbg, o = {}, pre = (0, eval)(PRE); pre('bank', 1); const a = D.alt(), l = D.LANE(), q = l.pt(a.stop + 64, a.pos), R = D.CFG.van.r * D.CFG.alt.free, en = D.get().en;
        const put = (d, f) => { const c = D.mkCop(q[0] + d, q[1]); if (f) f(c); en.push(c); return c; }, clear = () => { en.length = 0; };
        o.leer = D.altCan(); let c = put(R - 5); o.nah = D.altCan(); clear(); c = put(R + 5); o.fern = D.altCan(); clear(); c = put(0, c => { c.hp = 0; }); o.tot = D.altCan(); clear(); c = put(0, c => { c.sur = true; }); o.ergeben = D.altCan(); clear(); c = put(0, c => { c.kind = 'grd'; }); o.waerter = D.altCan(); clear();
        D.CFG.alt.max = 0; o.max0 = D.altCan(); D.CFG.alt.max = 2; o.max2 = D.altCan();
        D.CFG.alt.on = 0; D.buildSeed(a.t + 99999); o.aus = [D.alt(), D.altCan()]; D.CFG.alt.on = 1;
        return o;
      }, PRE);
      t.eq([r.leer, r.nah, r.fern, r.tot, r.ergeben, r.waerter], [true, false, true, true, true, true], 'Radius: knapp innerhalb besetzt, knapp ausserhalb frei, Tote, Ergebene und Wachen (keine Polizei) zaehlen nicht'); t.eq([r.max0, r.max2], [false, true], 'CFG.alt.max'); t.eq(r.aus, [null, false], 'CFG.alt.on 0: kein B, kein Ausweichen');
    },
  },
  {
    name: 'Netz: Der Schnappschuss fuehrt vanAlt (g hat 30 Felder), Host und Clients bauen dasselbe B, ein Ausweichen des Hosts schaltet bei allen Clients LANE.van und LANE.exit um (auch bei einem Zuschauer, der danach einsteigt), ein Wechsel zurueck ebenso; der Wagen steht auf Host und Client am selben Ort fest',
    timeout: 200000,
    async run(t) {
      await t.loadTool('loopnet.js'); await t.loadInpage('coop.js');
      const r = await t.page.evaluate(({ PRE }) => {
        const o = {}, D = __dbg, seed = (0, eval)(PRE)('bank', 1), pre = insts => { for (const d of insts) { const C = d.CFG; C.alt.on = 1; C.alt.p = 1; C.vanLock = 0; C.policeAt = 1e6; C.policeForced = 1e6; C.vanStay = 1e6; C.vanCall = 1; C.meet.p = 0; } };
        const G = CT.mkGame('bank', seed, 3, 40, 0, null, 'S', pre), { A, clients } = G; o.seed = seed;
        o.gLen = A.NET && A.buildSnap().g.length; o.same = [A, ...clients].map(d => { const a = d.alt(); return a && [a.t, a.r, a.d, a.e, a.stop, a.pos].join(','); });
        A.startHeist(false, A.get().me); A.callVan(); G.run(0.5); const a = A.alt(), stopA = A.LANE().van.stop;
        G.run(8); o.vor = [A, ...clients].map(d => [d.alt().cur, d.LANE().van.stop === stopA, d.get().vanMode]);
        A.altSwap(false); G.run(1.5); o.nach = [A, ...clients].map(d => [d.alt().cur, d.LANE().van.stop === a.stop, d.LANE().van.pos === a.pos, d.LANE().exit.goal.join(',') === a.goal.join(',')]);
        G.run(4); o.steht = [A, ...clients].map(d => [d.get().vanMode, Math.abs(d.get().vanX - d.LANE().van.stop) <= 2]);
        const S = CT.addSpec(G); pre([S]); G.run(4); o.spec = [S.alt() && S.alt().cur, S.LANE().van.stop === a.stop];
        A.altSwap(false); G.run(2); o.zurueck = [A, ...clients, S].map(d => [d.alt().cur, d.LANE().van.stop === stopA]);
        return o;
      }, { PRE });
      t.eq(r.gLen, 30, 'der Schnappschuss fuehrt vanAlt (g hat 30 Felder)'); t.ok(r.same[0] && r.same.every(s => s === r.same[0]), 'Host und Clients bauen dasselbe B: ' + JSON.stringify(r.same));
      t.eq(r.vor, [[0, true, 0], [0, true, 0], [0, true, 0]], 'der Wagen steht an A (Host und beide Clients)'); t.eq(r.nach, [[1, true, true, true], [1, true, true, true], [1, true, true, true]], 'nach dem Ausweichen gilt B bei allen');
      t.eq(r.steht, [[0, true], [0, true], [0, true]], 'der Wagen steht an B fest'); t.eq(r.spec, [1, true], 'ein Zuschauer, der spaeter einsteigt, sieht B'); t.eq(r.zurueck, [[0, true], [0, true], [0, true], [0, true]], 'und zurueck an A bei allen');
    },
  },
  {
    name: 'Einsteigen an B: in beiden Fahrtrichtungen (Zone links und rechts vom Gebaeude) und in den Lagen Sued, Nord, Ost, West gesichert wird an B, nicht an A',
    timeout: 240000,
    async run(t) {
      const r = await t.page.evaluate(({ PRE }) => {
        const out = [], pre = (0, eval)(PRE), T = 32;
        for (const [sc, dir, turn] of [['bank', 1, ['S', 'S+']], ['bank', -1, ['S', 'S+']], ['gas', 1, ['N', 'N+']], ['gas', -1, ['N', 'N+']], ['jewel', 1, ['E', 'E+']], ['jewel', -1, ['E', 'E+']], ['museum', 1, ['W', 'W+']], ['museum', -1, ['W', 'W+']]]) {
          const D = __dbg, seed = pre(sc, 1, dir, turn), g = D.get(), me = g.me, L = D.LAY(), ln = D.LANE(), A = { stop: ln.van.stop, goal: ln.exit.goal.slice() }, tag = sc + '#' + seed + ' ' + D.LAY().turned + ' ' + dir;
          D.startHeist(false, me); D.callVan(); D.altSwap(true); const B = D.alt();
          for (let i = 0; i < 30 * 200 && !D.get().vanArr; i++) { me.hp = 1e9; me.x = L.spawn.x; me.y = L.spawn.y; D.update(1 / 30); }
          for (let i = 0; i < 30 * 15 && Math.abs(D.get().vanX - D.LANE().van.stop) > 2; i++) { me.hp = 1e9; me.x = L.spawn.x; me.y = L.spawn.y; D.update(1 / 30); }
          const row = { tag, cur: B.cur, stop: D.LANE().van.stop === B.stop, steht: Math.abs(D.get().vanX - B.stop) <= 2, ziel: D.LANE().exit.goal.join(',') === B.goal.join(',') };
          me.units = 3; me.loot = 1000; const x = B.goal[0] * T + 16, y = B.goal[1] * T + 16; for (let i = 0; i < 30 * 6; i++) { me.hp = 1e9; me.hurt = 0; me.x = x; me.y = y; D.update(1 / 30); if (D.get().escaped || D.get().ended) break; }
          row.gesichert = D.get().escaped > 0 || D.get().secured > 0 || !!D.get().ended; out.push(row);
        }
        return out;
      }, { PRE });
      t.eq(r.filter(x => !(x.stop && x.steht && x.ziel && x.gesichert)).map(x => x.tag), [], 'an B einsteigen: Wagen steht an B, Ziel stimmt, es wird gesichert: ' + JSON.stringify(r));
    },
  },
];
