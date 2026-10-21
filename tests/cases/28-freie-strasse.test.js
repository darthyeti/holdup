// Freie Strasse (docs/karte-und-layout.md, Abschnitt Freie Strasse): Die Strasse liegt an Sued, Nord, Ost oder West des Gebaeudes, die Fluchtseite auf einer der beiden Seiten der Strasse.
// Beweis: turnLayout (index.html) legt jede vorhandene Gebaeude-Karte auf alle Lagen (S, N, E, W und jeweils laengs gespiegelt, 8 Lagen). Die Karte muss dann dieselben Pruefregeln bestehen wie das Original,
// die Wagen parken auf ihren Plaetzen, die Beamten steigen zum Gebaeude hin aus, der Fluchtwagen fahrt in der neuen Achse, die Flucht endet mit einem Sieg.
const SIDES = ['S', 'N', 'E', 'W', 'S+', 'N+', 'E+', 'W+'];
const HALLS = {
  jewel: ['Klassik', 'Reihen', 'Salon', 'Ring', 'Gänge'],
  gas: ['Klassik', 'Insel', 'Wandregale', 'Gänge'],
  museum: ['Klassik', 'Kabinette', 'Säulenhalle', 'Ring'],
  casino: ['Klassik', 'Promenade', 'Reihen', 'Staffel'],
};

module.exports = [
  {
    name: 'Freie Strasse: laneOf und validateMap stimmen auf allen Seiten (jeder Grundriss, 8 Lagen), Karten ohne road bleiben unberuehrt',
    timeout: 240000,
    async run(t) {
      const r = await t.page.evaluate(([SIDES, HALLS]) => {
        const D = __dbg, T = 32, bad = [], stat = { maps: 0, variants: 0, weltOnly: 0 };
        const mk = (sc, s, side) => { D.setScenario(sc); D.setSeedMode(s === 'classic' ? 'classic' : 'random'); D.setLage([]); const lay = D.layoutFor(s); return side === 'S' ? lay : D.turnLayout(lay, side[0], side[1] === '+'); };
        const ids = rep => [rep.err.map(e => e.r), rep.warn.map(e => e.r)].map(l => [...new Set(l)].sort().join(','));
        const list = [];
        for (const sc of Object.keys(HALLS)) for (const h of HALLS[sc]) { D.setScenario(sc); D.setSeedMode('random'); D.setLage([]); let seed = null; for (let s = 1; s < 800 && seed == null; s++) if (D.layoutFor(s).hall === h) seed = s; if (seed == null) bad.push(sc + ' ' + h + ': kein Seed'); else list.push([sc, seed]); }
        // Bank-Zufallskarten: dazu 4996 (dort wich die Zielkachel am Wagen nach dem Spiegeln um eine Kachel ab, siehe exit.goal) und 60 Seeds im Abstand 37, darunter gespiegelte und getauschte
        for (const s of [101, 5000, 5017, 9001, 4996, 'classic']) list.push(['bank', s]);
        for (let i = 0; i < 60; i++) list.push(['bank', 1 + i * 37]);
        const EXP = { S: { axis: 'x', n: [0, -1], ends: ['W', 'E'] }, N: { axis: 'x', n: [0, 1], ends: ['W', 'E'] }, E: { axis: 'y', n: [-1, 0], ends: ['N', 'S'] }, W: { axis: 'y', n: [1, 0], ends: ['N', 'S'] } };
        for (const [sc, s] of list) {
          const lay0 = mk(sc, s, 'S'); if ('road' in lay0 || 'turned' in lay0) bad.push(sc + '#' + s + ' Karte ohne Drehung traegt road oder turned');
          const ro = D.roadOf(lay0); if (ro.side !== 'S' || ro.pos !== lay0.laneY || ro.van.from !== lay0.van.x0 || ro.exit.line !== lay0.exit.x) bad.push(sc + '#' + s + ' roadOf liest die alten Felder falsch');
          const rep0 = D.validateMap(lay0), base = ids(rep0), H0 = D.world().H, n0 = D.laneOf(lay0).slots.length; stat.maps++;
          for (const side of SIDES) {
            const lay = mk(sc, s, side), ln = D.laneOf(lay), tag = sc + '#' + s + ' ' + side, e = EXP[side[0]], nq = ln.axis === 'x' ? ln.n[1] : ln.n[0];
            stat.variants++;
            if (ln.side !== side[0] || ln.axis !== e.axis || JSON.stringify(ln.n) !== JSON.stringify(e.n) || JSON.stringify(ln.ends) !== JSON.stringify(e.ends) || ln.A !== e.axis || ln.C !== (e.axis === 'x' ? 'y' : 'x')) { bad.push(tag + ' Seite/Achse/Normale/Enden: ' + JSON.stringify([ln.side, ln.axis, ln.n, ln.ends])); continue; }
            const B = lay.bld, cc = ln.axis === 'x' ? (B.y0 + B.y1 + 1) * T / 2 : (B.x0 + B.x1 + 1) * T / 2;
            if (!((cc - ln.pos) * nq > 0)) bad.push(tag + ' Normale zeigt nicht zum Gebaeude');
            const al = c => ln.axis === 'x' ? c[0] : c[1], cr = c => ln.axis === 'x' ? c[1] : c[0];
            if (ln.slots.length !== n0) bad.push(tag + ' Zahl der Plaetze');
            for (const sl of ln.slots) {
              const as = new Set(sl.cells.map(al)), cs = new Set(sl.cells.map(cr));
              if (as.size !== 5 || cs.size !== 2 || sl.cells.length !== 10) bad.push(tag + ' Platz ' + sl.end + sl.i + ' nicht 5 x 2 Kacheln');
              if (!sl.cells.some(c => al(c) === sl.u && cr(c) === ln.row)) bad.push(tag + ' Platz ohne Spurkachel');
              if (!((cr(sl.curb) - ln.row) * nq > 0)) bad.push(tag + ' Aussteigepunkt nicht auf der Gebaeudeseite');
              if (!ln.ends.includes(sl.end)) bad.push(tag + ' Platz mit falschem Ende ' + sl.end);
            }
            if (!ln.van.swept.some(c => al(c) === Math.floor(ln.van.stop / T) && cr(c) === Math.floor(ln.van.pos / T))) bad.push(tag + ' Fahrstrecke ohne Haltepunkt');
            if (ln.van.rest.length && !ln.van.rest.every(c => ln.van.dir < 0 ? al(c) * T >= ln.van.from : al(c) * T < ln.van.from)) bad.push(tag + ' Rest liegt auf der falschen Seite');
            const ex = ln.exit;
            if (!ex.cells.every(c => ex.has(c[0] * T + 16, c[1] * T + 16))) bad.push(tag + ' Fluchtzone: eine Kachel liegt ausserhalb von exit.has');
            if (!ex.cells.every(c => (al(c) * T + 16 - ex.line) * ex.dir > 0)) bad.push(tag + ' Fluchtzone liegt nicht hinter der Linie');
            { const m = ln.pt(ex.line - ex.dir * 10, (ex.span[0] + ex.span[1]) / 2), q = ln.pt(ex.line + ex.dir * 10, (ex.span[0] + ex.span[1]) / 2); if (ex.has(m[0], m[1]) || !ex.has(q[0], q[1])) bad.push(tag + ' exit.has trennt nicht an der Linie'); }
            const rep = D.validateMap(lay);   // setzt lay.spots (findSpots)
            const sp = lay.spots.filter(q => q.ex);
            if (sp.length !== 1 || sp[0].side !== ex.side) bad.push(tag + ' Fluchttuer: ' + sp.length + ' Stueck, Seite ' + (sp[0] && sp[0].side) + ' statt ' + ex.side);
            if (!lay.spots.some(q => q.side === ln.side && !q.lk && !q.ex)) bad.push(tag + ' keine offene Vordertuer an der Strassenseite');
            const got = ids(rep);
            // Das Original und die gedrehte Karte pruefen gleich. Einzige Ausnahme: ein zu schmales Raster nach dem Transponieren (Regel welt)
            const sw = side[0] === 'E' || side[0] === 'W', narrow = sw && H0 < D.CFG.val.minW;
            let want = base.slice(); if (narrow) { const er = new Set(want[0].split(',').filter(Boolean)); er.add('welt'); want[0] = [...er].sort().join(','); stat.weltOnly++; }
            if (got[0] !== want[0] || got[1] !== want[1]) bad.push(tag + ' Pruefregeln weichen vom Original ab: err ' + got[0] + ' statt ' + want[0] + ', warn ' + got[1] + ' statt ' + want[1]);
          }
        }
        return { bad: bad.slice(0, 20), nbad: bad.length, stat };
      }, [SIDES, HALLS]);
      t.note(r.stat.maps + ' Karten, ' + r.stat.variants + ' Lagen, davon ' + r.stat.weltOnly + ' zu schmal nach dem Transponieren (Bank, Regel welt)');
      t.eq(r.bad, [], 'Abweichungen (' + r.nbad + ')');
    },
  },
  {
    name: 'Freie Strasse: Wagen parken auf den Plaetzen, Beamte steigen zum Gebaeude hin aus, Fluchtwagen faehrt in der Achse, Flucht endet mit Sieg (Juwelier und Tankstelle, 8 Lagen, mit Zeichnen)',
    open: { det: true },
    timeout: 300000,
    async run(t) {
      const r = await t.page.evaluate(([SIDES]) => {
        const D = __dbg, T = 32, out = [], bad = [];
        Object.assign(D.CFG.van, { bt: 0, bu: 0, r: 0 });   // der Test prueft die Strassengeometrie, nicht die Regeln fuers Einsteigen und den Fahrer (die haben 32-fluchtwagen)
        for (const [sc, seed] of [['jewel', 5], ['gas', 22]]) for (const side of SIDES) {
          D.setScenario(sc); D.setSeedMode('random'); D.setLage([]);
          let lay = D.layoutFor(seed); if (side !== 'S') lay = D.turnLayout(lay, side[0], side[1] === '+');
          D.buildLay(lay); D.startHeist(true);
          const LN = D.LANE(), A = LN.A, C = LN.C, tag = sc + ' ' + side, seenCops = new Set();
          let parked = false, drew = 0, ended = null, vanStopT = null, cars = 0;
          for (let i = 0; i < 30 * 170; i++) {
            const G = D.get(), me = G.me;
            if (G.ended) { ended = G.ended; break; }
            me.hp = 1e6; me.ar = 1e6;
            if (i === 30 * 12 && !G.vanCalled) D.callVan();
            if (G.vanArr && Math.abs(G.vanX - LN.van.stop) <= 2 && !me.out) { const q = LN.exit.cells[Math.floor(LN.exit.cells.length / 2)]; me.x = q[0] * T + 16; me.y = q[1] * T + 16; if (vanStopT == null) { vanStopT = i; D.draw(); drew++; } }
            D.update(1 / 30);
            const g = D.get();
            // Beamter: erste Sicht nach dem Aussteigen, 44 px vom Wagen zum Gebaeude hin (Normale), hoechstens 28 px laengs daneben
            for (const e of g.en) if (!seenCops.has(e.id)) { seenCops.add(e.id); if (!['cop', 'swat', 'shield'].includes(e.kind)) continue; const c = g.pcs.slice().sort((p, q) => Math.hypot(p.x - e.x, p.y - e.y) - Math.hypot(q.x - e.x, q.y - e.y))[0]; if (!c) { bad.push(tag + ' Beamter ohne Wagen'); continue; } const dn = (e.x - c.x) * LN.n[0] + (e.y - c.y) * LN.n[1], du = (e.x - c.x) * LN.u[0] + (e.y - c.y) * LN.u[1]; if (Math.abs(dn - 44) > 8 || Math.abs(du) > 34) bad.push(tag + ' Beamter steigt falsch aus: Normale ' + Math.round(dn) + ', laengs ' + Math.round(du)); }
            if (!parked && g.pcs.length && g.pcs.every(c => c.st === 'park')) {
              parked = true; cars = g.pcs.length;
              for (const c of g.pcs) {
                const sl = LN.slots.find(q => q.end === c.side && q.i === c.slot);
                if (!sl) { bad.push(tag + ' Wagen ' + c.id + ' ohne Platz'); continue; }
                if (Math.abs(c[A] - sl.tg) > 1) bad.push(tag + ' Wagen steht nicht auf dem Platz: ' + Math.round(c[A]) + ' statt ' + sl.tg);
                if (Math.abs(c[C] - LN.pos) > 5) bad.push(tag + ' Wagen steht quer daneben: ' + Math.round(c[C]) + ' statt ' + LN.pos);
                const along = LN.axis === 'x' ? Math.abs(Math.cos(c.a)) : Math.abs(Math.sin(c.a)); if (along < .9) bad.push(tag + ' Wagen quer zur Strasse gedreht: ' + c.a.toFixed(2));
                // Fahrtrichtung: Startende ist der Rand der Welt, an dem der Wagen angefahren kam (niedriges Ende faehrt mit der Achse)
                const ahead = LN.axis === 'x' ? Math.cos(c.a) : Math.sin(c.a); if ((ahead > 0) !== (c.side === LN.ends[0])) bad.push(tag + ' Wagen schaut gegen die Fahrtrichtung');
              }
              D.draw(); drew++;
            }
            if (parked && drew === 1 && i % 30 === 0 && g.en.length > 2) { D.draw(); drew++; }
          }
          const G = D.get();
          if (!parked) bad.push(tag + ' kein Wagen kam an');
          if (!ended || !ended.win || G.escaped !== 1) bad.push(tag + ' Flucht endete nicht mit einem Sieg: ' + JSON.stringify(ended && { win: ended.win, title: ended.title }));
          if (vanStopT == null) bad.push(tag + ' Fluchtwagen kam nicht an');
          out.push(tag + ': ' + cars + ' Wagen, ' + seenCops.size + ' Beamte, Wagen hielt nach ' + (vanStopT == null ? '-' : Math.round(vanStopT / 30)) + ' s');
        }
        return { bad: bad.slice(0, 20), nbad: bad.length, out };
      }, [SIDES]);
      t.note(r.out.slice(0, 2).join(' | ') + ' ... (' + r.out.length + ' Läufe)');
      t.eq(r.bad, [], 'Abweichungen (' + r.nbad + ')');
    },
  },
  {
    name: 'Freie Strasse: autoPosts folgt der Strasse (Wagenplaetze gleich, Posten bis auf einen), auch laengs gespiegelt',
    timeout: 120000,
    async run(t) {
      const r = await t.page.evaluate(() => {
        const D = __dbg, bad = [], sum = [];
        const mk = (sc, s) => { D.setScenario(sc); D.setSeedMode('random'); D.setLage([]); return D.layoutFor(s); };
        for (const [sc, seed] of [['jewel', 5], ['gas', 22], ['museum', 33], ['casino', 41], ['bank', 5017]]) for (const side of ['N', 'E', 'W', 'S+', 'N+', 'E+', 'W+']) {
          // Referenz: abgeleitet am Original, dann mit der Karte gedreht. Gegenprobe: am gedrehten Original abgeleitet.
          const a = mk(sc, seed), A = D.autoPosts(a); a.posts = A.posts; a.slots = A.slots;
          const ref = D.turnLayout(a, side[0], side[1] === '+');
          const b = D.turnLayout(mk(sc, seed), side[0], side[1] === '+'), B = D.autoPosts(b), ln = D.laneOf(b);
          const d = (p, q) => Math.hypot(p.x - q.x, p.y - q.y);
          const miss = ref.posts.filter(q => !B.posts.some(p => d(p, q) <= 1.5)).length, tag = sc + ' ' + side;
          const mirrored = side.endsWith('+');
          if (B.posts.length !== ref.posts.length) bad.push(tag + ' Zahl der Posten ' + B.posts.length + ' statt ' + ref.posts.length);
          if (miss > (mirrored ? 3 : 2)) bad.push(tag + ' ' + miss + ' Posten ohne Gegenstueck');
          if (JSON.stringify(Object.keys(B.slots)) !== JSON.stringify(ln.ends)) bad.push(tag + ' Enden der Plaetze ' + Object.keys(B.slots));
          // Plaetze: ohne Spiegelung laengs genau gleich, mit Spiegelung beginnt das 5er-Raster an der Gebaeudemitte (verschoben, aber gleich viele plus/minus 1)
          if (!mirrored) { if (JSON.stringify(ref.road.slots) !== JSON.stringify(ln.ends.map(e => B.slots[e]))) bad.push(tag + ' Wagenplaetze ' + JSON.stringify(ln.ends.map(e => B.slots[e])) + ' statt ' + JSON.stringify(ref.road.slots)); }
          else if (Math.abs(ref.road.slots[0].length + ref.road.slots[1].length - B.slots[ln.ends[0]].length - B.slots[ln.ends[1]].length) > 1) bad.push(tag + ' Zahl der Wagenplaetze weicht ab');
          // Tuer-Posten (Aufbruch) stehen an denselben Tueren
          const doors = l => l.filter(p => p.door).map(p => p.door.join(',')).sort().join(';');
          if (doors(B.posts) !== doors(ref.posts)) bad.push(tag + ' Tuer-Posten ' + doors(B.posts) + ' statt ' + doors(ref.posts));
          // Anker sichern die Fluchtseite: dieselbe Seite wie die Zone
          const anch = B.posts.filter(p => p.anchor); if (!anch.length || !anch.every(p => p.k === ln.exit.side)) bad.push(tag + ' Anker nicht an der Fluchtseite ' + ln.exit.side);
          sum.push(tag + ' ' + B.posts.length + '/' + miss);
        }
        return { bad: bad.slice(0, 20), nbad: bad.length, sum };
      });
      t.note('Posten/ohne Gegenstueck: ' + r.sum.slice(0, 7).join(', ') + ' ...');
      t.eq(r.bad, [], 'Abweichungen (' + r.nbad + ')');
    },
  },
  {
    name: 'Freie Strasse: Tresortuer waagerecht bei Ost und West, Standkachel liegt im Gang an der Tuer, Item in der Mitte der Tuer',
    timeout: 120000,
    async run(t) {
      const r = await t.page.evaluate(() => {
        const D = __dbg, T = 32, bad = [], seen = {};
        for (const [sc, seed] of [['jewel', 5], ['gas', 22], ['museum', 33], ['casino', 41], ['bank', 5017]]) for (const side of ['S', 'N', 'E', 'W', 'E+', 'W+', 'N+']) {
          D.setScenario(sc); D.setSeedMode('random'); D.setLage([]);
          let lay = D.layoutFor(seed); if (side !== 'S') lay = D.turnLayout(lay, side[0], side[1] === '+');
          D.buildLay(lay); const L = D.LAY(), v = L.vault, w = D.world(), tag = sc + ' ' + side, h = side[0] === 'E' || side[0] === 'W';
          seen[h ? 'h' : 'v'] = (seen[h ? 'h' : 'v'] || 0) + 1;
          if ((v.o === 'h') !== h) bad.push(tag + ' Ausrichtung ' + v.o);
          const pair = h ? [[v.door[0], v.door[1]], [v.door[0] + 1, v.door[1]]] : [[v.door[0], v.door[1]], [v.door[0], v.door[1] + 1]];
          if (!pair.every(c => w.cell(c[0], c[1]) === 'V')) bad.push(tag + ' Tuerpaar steht nicht auf V: ' + pair.map(c => w.cell(c[0], c[1])).join(''));
          // Die Tuer liegt in einer Wand: beide Nachbarn quer zur Tuer sind Wand (Gang auf der einen, Tresorraum auf der anderen Seite)
          const st = D.vaultStand(L);
          if (w.isSol(st[0], st[1])) bad.push(tag + ' Standkachel ist fest: ' + st);
          if (!pair.some(c => Math.abs(c[0] - st[0]) + Math.abs(c[1] - st[1]) === 1)) bad.push(tag + ' Standkachel liegt nicht an der Tuer: ' + st);
          // Standkachel auf der Gangseite: gegenueber (ueber das Paar hinweg) liegt der Tresorraum, dort die Buendel
          const it = D.get().its.find(i => i.t === 'vault'), mid = [pair[0][0] * T + (h ? T : 16), pair[0][1] * T + (h ? 16 : T)];
          if (Math.hypot(it.x - mid[0], it.y - mid[1]) > 1) bad.push(tag + ' Item sitzt nicht in der Mitte der Tuer: ' + Math.round(it.x) + ',' + Math.round(it.y) + ' statt ' + mid);
          if (Math.hypot(it.x - (st[0] * T + 16), it.y - (st[1] * T + 16)) >= it.r) bad.push(tag + ' Standkachel ausserhalb der Reichweite des Tresor-Items');
          D.draw();   // zeichnet die Tuer (waagerecht, gespiegelt) ohne Fehler
        }
        return { bad: bad.slice(0, 20), nbad: bad.length, seen };
      });
      t.ok(r.seen.h > 0 && r.seen.v > 0, 'waagerechte und senkrechte Tueren kamen vor: ' + JSON.stringify(r.seen));
      t.eq(r.bad, [], 'Abweichungen (' + r.nbad + ')');
    },
  },
  {
    // Juwelier E und W: Siegquote des Bots rund 50 % (gemessen mit n=48, alt 25/48, neu 22/48), mit n=4 waere 'mindestens 2' nur durch den festen Zufallsstrom gruen, daher mindestens 1.
    name: 'Freie Strasse: Bot-Rauchtest auf gedrehten Karten (Juwelier E, W und N+, Tankstelle N und W, Bank E): der Auftrag laeuft bis zum Sieg',
    open: { det: true },
    timeout: 300000,
    async run(t) {
      await t.loadTool('bot.js');
      const r = await t.page.evaluate(() => {
        const D = __dbg, out = {};
        for (const [sc, seed, side, n, min] of [['jewel', 5000, 'E', 4, 1], ['jewel', 5000, 'W', 4, 1], ['jewel', 5000, 'N+', 4, 2], ['gas', 5000, 'N', 3, 2], ['gas', 5000, 'W', 3, 2], ['bank', 5017, 'E', 3, 2]]) {
          D.setScenario(sc); D.setSeedMode('random'); D.setLage([]);
          D.buildLay(D.turnLayout(D.layoutFor(seed), side[0], side[1] === '+'));
          let w = 0, loot = 0; for (let i = 0; i < n; i++) { const q = bot.run({ sigma: .05, react: .35, kit: 'old', call: 0, van: 'alt' }); if (q.res === 'WIN') { w++; loot += q.loot; } }
          out[sc + ' ' + side] = { w, n, min, loot: w ? Math.round(loot / w) : 0 };
        }
        return out;
      });
      t.note(Object.entries(r).map(([k, v]) => k + ' ' + v.w + '/' + v.n).join(', '));
      for (const [k, v] of Object.entries(r)) t.ok(v.w >= v.min && v.loot > 0, k + ': ' + v.w + ' von ' + v.n + ' Siegen (mindestens ' + v.min + ')');
    },
  },
  {
    name: 'Freie Strasse: Negativproben (unvollstaendiges road, falsche Seite) und turnLayout lehnt Strassenkarte und doppeltes Drehen ab',
    timeout: 60000,
    async run(t) {
      const r = await t.page.evaluate(() => {
        const D = __dbg, out = {};
        const mk = side => { D.setScenario('jewel'); D.setSeedMode('random'); D.setLage([]); const lay = D.layoutFor(5); return side ? D.turnLayout(lay, side, false) : lay; };
        const rules = lay => D.validateMap(lay).err.map(e => e.r);
        let lay = mk('E'); delete lay.road.van; out.vanFehlt = rules(lay);
        lay = mk('E'); lay.road.side = 'X'; out.seiteFalsch = rules(lay);
        lay = mk('E'); lay.road.slots = [lay.road.slots[0]]; out.slotsFalsch = rules(lay);
        lay = mk('E'); out.sauber = rules(lay);
        try { D.turnLayout(mk('E'), 'N', false); out.doppelt = 'kein Fehler'; } catch (e) { out.doppelt = 'Fehler'; }
        D.setScenario('truck'); D.setSeedMode('random'); try { D.turnLayout(D.layoutFor(5), 'N', false); out.truck = 'kein Fehler'; } catch (e) { out.truck = 'Fehler'; }
        return out;
      });
      for (const k of ['vanFehlt', 'seiteFalsch', 'slotsFalsch']) t.ok(r[k].includes('feld'), k + ': validateMap meldet das Feld road: ' + JSON.stringify(r[k]));
      t.eq(r.sauber, [], 'gedrehte Karte ist sauber');
      t.eq([r.doppelt, r.truck], ['Fehler', 'Fehler'], 'turnLayout lehnt ab');
    },
  },
];
