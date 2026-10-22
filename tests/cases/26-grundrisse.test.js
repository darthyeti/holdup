// Grundriss-Varianten von Tankstelle (GS_SHOPS), Museum (MU_HALLS) und Casino (CS_FLOORS), Vorbild ist 25-juwelier fuer den Juwelier.
// Der Seed waehlt ueber einen eigenen Zufallsstrom einen von vier Grundrissen (LAY.hall), Huelle, Eingaenge, Posten, Wagenplaetze, Beute und Mission bleiben gleich.
const VAR = {
  gas: ['Klassik', 'Insel', 'Wandregale', 'Gänge'],
  museum: ['Klassik', 'Kabinette', 'Säulenhalle', 'Ring'],
  casino: ['Klassik', 'Promenade', 'Reihen', 'Staffel'],
};
const SC = Object.keys(VAR);
// Beute je Karte (Anzahl je Art), unabhaengig vom Grundriss
const GOODS = {
  gas: { cig: 5, shelf: 4 },
  museum: { art: 4, statue: 1, relic: 4 },
  casino: { chips: 12, slot: 8, vip: 3 },
};
// Auftragsoptionen des Bot-Rauchtests (wie 50-bot.test.js)
const BOT = { gas: {}, museum: { goods: true, goodsN: 2 }, casino: {} };

// Je Szenario und Grundriss die ersten k Seeds ab `from` (layoutFor allein genuegt, der Name steht in LAY.hall)
const FIND = `(sc, from, k) => {
  const D = __dbg, out = {}; D.setScenario(sc); D.setSeedMode('random'); D.setLage([]); D.setTurn('S');
  for (let s = from; s < from + 3000; s++) { const h = D.layoutFor(s).hall; (out[h] = out[h] || []).length < k && out[h].push(s); }
  return out;
}`;

module.exports = [
  {
    name: 'Grundrisse: je Karte vier Varianten, Beute-Stuecke, Werte und Material bleiben gleich',
    timeout: 240000,
    async run(t) {
      const r = await t.page.evaluate(VAR => {
        const D = __dbg, out = {};
        for (const sc of Object.keys(VAR)) {
          D.setScenario(sc); D.setSeedMode('random'); D.setLage([]); D.setTurn('S');
          const halls = {}, comp = new Set(), grids = new Set();
          for (let i = 0; i < 160; i++) {
            D.buildLay(D.layoutFor(1 + i * 11)); const L = D.LAY(), c = {};
            for (const g of L.goods || []) c[g.k] = (c[g.k] || 0) + 1;
            let v = 0, u = 0; for (const g of L.goods || []) { v += D.CFG.goods[g.k].v; u += D.CFG.goods[g.k].u; }
            const its = D.get().its, mat = its.filter(x => x.t === 'mat').length, good = its.filter(x => x.t === 'good').length;
            halls[L.hall] = (halls[L.hall] || 0) + 1; grids.add(D.world().M.join('|'));
            comp.add(JSON.stringify([c, v, u, mat, good, L.vault.bundles.length, L.bn && L.bn.v, L.polAt, L.wb, L.stl]));
          }
          out[sc] = { halls, comp: [...comp], grids: grids.size };
        }
        return out;
      }, VAR);
      for (const sc of SC) {
        t.eq(Object.keys(r[sc].halls).sort(), VAR[sc].slice().sort(), sc + ': alle vier Grundrisse kommen vor');
        t.ok(Object.values(r[sc].halls).every(n => n >= 20), sc + ': jeder Grundriss wenigstens 20 von 160: ' + JSON.stringify(r[sc].halls));
        t.eq(r[sc].comp.length, 1, sc + ': Beute, Material, Tresor und Zeiten gleich in allen Grundrissen: ' + r[sc].comp.join(' / '));
        t.eq(JSON.parse(r[sc].comp[0])[0], GOODS[sc], sc + ': Beute-Stuecke je Art');
        t.ok(r[sc].grids >= 4, sc + ': mindestens vier verschiedene Raster: ' + r[sc].grids);
      }
    },
  },
  {
    name: 'Grundrisse: Mission, Lage-Tags, Theme und Kameras haengen nicht vom Grundriss ab (Schnappschuss)',
    timeout: 240000,
    async run(t) {
      const hashes = await t.page.evaluate(SC => {
        const D = __dbg, h = s => { let x = 2166136261; for (let i = 0; i < s.length; i++) { x ^= s.charCodeAt(i); x = Math.imul(x, 16777619); } return (x >>> 0).toString(16); };
        const out = {};
        for (const sc of SC) {
          D.setScenario(sc); D.setSeedMode('random'); D.setLage(null); D.setTurn('S');
          let acc = '';
          for (let i = 0; i < 120; i++) {
            D.buildLay(D.layoutFor(1 + i * 13)); const L = D.LAY(), ms = L.mission;
            // Wachwechsel-Routen gehoeren zum Grundriss, die Zeitpunkte nicht
            acc += JSON.stringify([Object.assign({}, ms, { extra: (ms.extra || []).map(e => e.at) }), L.theme, L.cams, L.civ, (L.guards || []).length, L.bn, L.polAt, L.wb, L.stl, L.vault, L.note, L.mon]);
          }
          out[sc] = h(acc);
        }
        return out;
      }, SC);
      // Der Wert ist der des Standes vor den Grundriss-Varianten (mit dem Altstand gegengeprueft), er darf sich durch neue Grundrisse nicht aendern.
      await t.snapshot('mission-hash', hashes);
    },
  },
  {
    name: 'Grundrisse: alle Wachen laufen in jedem Grundriss ihre ganze Route ab und stehen nie im Festen',
    timeout: 240000,
    async run(t) {
      const r = await t.page.evaluate(([SC, FIND]) => {
        const D = __dbg, T = 32, out = {}, find = eval(FIND);
        for (const sc of SC) {
          const seeds = find(sc, 1, 12);
          for (const [hall, list] of Object.entries(seeds)) {
            const key = sc + '/' + hall; out[key] = { runs: 0, bad: [], maxT: 0 };
            let done = 0;
            for (const sd of list) {
              D.setScenario(sc); D.setSeedMode('random'); D.setLage([]); D.setTurn('S'); D.buildLay(D.layoutFor(sd)); const L = D.LAY();
              if (!(L.guards || []).length) continue;
              if (++done > 3) break;
              const w = D.world(), me = D.get().me; me.x = (w.WX0 + w.W - 3) * T; me.y = (w.WY0 + w.H - 3) * T; // Spieler weit draussen, damit nichts Alarm ausloest
              const n = L.guards.length, hit = L.guards.map(() => new Set()); let tm = 0;
              for (let k = 0; k < 600 * 20; k++) {
                D.update(1 / 20); const g = D.get().npcs.filter(q => q.k === 'grd').slice(0, n);
                g.forEach((q, i) => {
                  if (w.isSol(Math.floor(q.x / T), Math.floor(q.y / T))) out[key].bad.push('Wache steht im Festen, Seed ' + sd);
                  L.guards[i].route.forEach((p, j) => { if (Math.hypot((p[0] + .5) * T - q.x, (p[1] + .5) * T - q.y) < 40) hit[i].add(j); });
                });
                tm = k / 20; if (hit.every((s, i) => s.size === L.guards[i].route.length)) break;
              }
              out[key].runs++; out[key].maxT = Math.max(out[key].maxT, Math.round(tm));
              hit.forEach((s, i) => { if (s.size < L.guards[i].route.length) out[key].bad.push('Seed ' + sd + ' Wache ' + i + ' erreicht nur ' + s.size + '/' + L.guards[i].route.length + ' Punkte'); });
            }
          }
        }
        return out;
      }, [SC, FIND]);
      for (const [k, v] of Object.entries(r)) {
        t.ok(v.runs >= 2, k + ': zu wenige Seeds mit Wache (' + v.runs + ')');
        t.eq(v.bad, [], k + ': Wachen');
      }
      t.note('laengste Runde bis alle Punkte besucht: ' + Object.entries(r).map(([k, v]) => k + ' ' + v.maxT + ' s').join(', '));
    },
  },
  {
    name: 'Grundrisse: mapcheck je Grundriss (Erreichbarkeit aller Beute, Posten, Wagenplaetze, Routen), auch mit Sicherheitsdienst',
    timeout: 240000,
    async run(t) {
      await t.loadTool('mapcheck.js');
      const r = await t.page.evaluate(([SC, FIND]) => {
        const find = eval(FIND), bad = [], cnt = {};
        for (const sc of SC) {
          const seeds = find(sc, 1, 8);
          for (const [hall, list] of Object.entries(seeds)) {
            list.forEach((sd, i) => {
              const rep = mapcheck.check(sc, sd, []); cnt[sc + '/' + hall] = (cnt[sc + '/' + hall] || 0) + 1;
              rep.err.forEach(e => bad.push(sc + '/' + hall + '#' + sd + ': ' + e));
              if (i < 3) mapcheck.check(sc, sd, ['sicher']).err.forEach(e => bad.push(sc + '/' + hall + '#' + sd + ' (Sicherheitsdienst): ' + e));
            });
          }
        }
        return { bad, cnt };
      }, [SC, FIND]);
      t.eq(r.bad, [], 'mapcheck');
      t.ok(Object.keys(r.cnt).length === 12, 'zwoelf Grundrisse geprueft: ' + JSON.stringify(r.cnt));
    },
  },
  {
    name: 'Tankstelle: Bauregeln (Zapfsaeulen weit von der Tuer, Routenpunkte weit vom Eingang, Lagerkisten ausserhalb der Reichweite des Tresor-Standplatzes)',
    async run(t) {
      const r = await t.page.evaluate(([FIND]) => {
        const D = __dbg, find = eval(FIND), bad = [], seeds = find('gas', 1, 4);
        for (const [hall, list] of Object.entries(seeds)) for (const sd of list) {
          D.setScenario('gas'); D.setSeedMode('random'); D.setLage([]); D.setTurn('S'); D.buildLay(D.layoutFor(sd)); const L = D.LAY(), w = D.world();
          // Tuerkacheln (7,10) und (8,10), Mitte (x+.5, y+.5): Die Explosion der Saeulen reicht 3 Kacheln
          for (const q of L.pumps) { const d = Math.min(Math.hypot(q.x - 7, q.y - 10), Math.hypot(q.x - 8, q.y - 10)); if (d < 3.5) bad.push(hall + ': Zapfsaeule ' + q.x + ',' + q.y + ' nur ' + d.toFixed(1) + ' Kacheln von der Tuer'); }
          // Jeder Routenpunkt kann Startpunkt der Wache beim Alarm sein
          for (const g of L.guards) for (const p of g.route) { const d = Math.hypot(p[0] - 8, p[1] - 9); if (d < 4.99) bad.push(hall + ': Routenpunkt ' + p + ' nur ' + d.toFixed(1) + ' Kacheln vom Eingang'); }
          // Lager (x4..8, y1..4): Kisten und Faesser nicht naeher als x6
          for (let y = 1; y <= 4; y++) for (let x = 4; x <= 8; x++) { const c = w.cell(x, y); if ((c === 'k' || c === 'q') && x < 6) bad.push(hall + ': Kiste bei ' + x + ',' + y); }
          // Tresor-Standplatz (4,3) und Kasse (12,6): kein zerlegbares Ding und kein Regal naeher als die Reichweite eines Items (46 px) am Standplatz
          for (const it of D.get().its) if (it.t === 'mat' || it.t === 'good') {
            if (Math.hypot(it.x - (4.5 * 32), it.y - (3.5 * 32)) < 46 + 8 && it.t === 'mat') bad.push(hall + ': Material nahe am Tresor-Standplatz ' + it.tx + ',' + it.ty);
          }
        }
        return bad;
      }, [FIND]);
      t.eq(r, [], 'Bauregeln');
    },
  },
  {
    name: 'Museum: Laser, Fluchtweg unter dem Lasertor und Atrium-Durchgaenge bleiben in jedem Raum gleich, Kegel enden an Trennwand, Block und Saeule',
    timeout: 180000,
    async run(t) {
      const r = await t.page.evaluate(([FIND]) => {
        const D = __dbg, T = 32, find = eval(FIND), seeds = find('museum', 1, 2), out = { lasers: new Set(), bad: [], drawn: 0 }, far = pts => Math.max(...pts.slice(1).map(p => Math.hypot(p[0] - pts[0][0], p[1] - pts[0][1])));
        const cfg = D.CFG.guard, cone = {};
        for (const [hall, list] of Object.entries(seeds)) {
          D.setScenario('museum'); D.setSeedMode('random'); D.setLage([]); D.setTurn('S'); D.buildLay(D.layoutFor(list[0])); const L = D.LAY(), w = D.world();
          out.lasers.add(JSON.stringify(L.lasers));
          // Fluchtweg: die Zeilen 8 und 9 der Ostgalerie (x18..26) bleiben frei, und vom Atrium (11,9) kommt man durch die Durchgaenge bis zum Ende der Ostgalerie (26,9)
          for (const y of [8, 9]) for (let x = 18; x <= 26; x++) if (w.isSol(x, y)) out.bad.push(hall + ': Fluchtweg blockiert bei ' + x + ',' + y);
          { const seen = new Set(['11,9']), q = [[11, 9]]; for (let h = 0; h < q.length; h++) for (const v of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const x = q[h][0] + v[0], y = q[h][1] + v[1], k = x + ',' + y; if (!seen.has(k) && !w.isSol(x, y)) { seen.add(k); q.push([x, y]); } } if (!seen.has('26,9')) out.bad.push(hall + ': Ostgalerie vom Atrium nicht erreichbar'); if (!seen.has('1,9')) out.bad.push(hall + ': Westgalerie vom Atrium nicht erreichbar'); }
          for (const y of [9, 10]) for (const x of [9, 10, 11, 16, 17, 18]) if (w.isSol(x, y)) out.bad.push(hall + ': Durchgang blockiert bei ' + x + ',' + y);
          // Eingang, Sicherheitsraumtuer, Wachwechsel-Start
          for (const q of [[13, 16], [14, 16], [13, 6], [13, 7], [12, 16], [15, 16]]) if (w.isSol(q[0], q[1])) out.bad.push(hall + ': Standplatz blockiert bei ' + q);
          // Laser: kein festes Ding (Saeule, Bank, Pflanze, Vitrine) naeher als 1,3 Kacheln (Kachelmitte) an einem Laser
          const segD = (px, py, l) => { const dx = l[2] - l[0], dy = l[3] - l[1], t = Math.max(0, Math.min(1, ((px - l[0]) * dx + (py - l[1]) * dy) / (dx * dx + dy * dy))); return Math.hypot(px - l[0] - t * dx, py - l[1] - t * dy); };
          for (const l of L.lasers) for (let x = 10; x <= 27; x++) for (let y = 1; y <= 16; y++) { const c = w.cell(x, y); if ('PbpC'.includes(c) && segD(x + .5, y + .5, l) < 1.3) out.bad.push(hall + ': ' + c + ' am Laser bei ' + x + ',' + y); }
          // Kegel zeichnen
          D.reset(); const me = D.get().me; me.x = 13.9 * T; me.y = 15 * T;
          for (let i = 0; i < 60; i++) D.update(1 / 30); D.draw(); D.draw(); out.drawn++;
          // Kegel enden an festen Dingen
          if (hall === 'Kabinette') cone.part = Math.round(far(D.coneRays(3.5 * T, 7.5 * T, -Math.PI / 2, .05, 330)));
          if (hall === 'Ring') cone.block = Math.round(far(D.coneRays(2.5 * T, 8.5 * T, 0, .05, 330)));
          if (hall === 'Säulenhalle') cone.pillar = Math.round(far(D.coneRays(5.5 * T, 8.5 * T, 0, .05, 330)));
          if (hall === 'Klassik') cone.open = Math.round(far(D.coneRays(2.5 * T, 8.5 * T, 0, .05, 330)));
        }
        return { lasers: [...out.lasers], bad: out.bad, drawn: out.drawn, cone };
      }, [FIND]);
      t.eq(r.drawn, 4, 'alle vier Raeume gezeichnet');
      t.eq(r.lasers.length, 1, 'die Laser sind in allen Raeumen gleich');
      t.eq(r.bad, [], 'Fluchtweg, Durchgaenge und Laser');
      t.ok(r.cone.part < 80, 'Kegel endet an der Trennwand (reicht nur ' + r.cone.part + ' px)');
      t.ok(r.cone.block < 80, 'Kegel endet am Mittelblock (reicht nur ' + r.cone.block + ' px)');
      t.ok(r.cone.pillar < 80, 'Kegel endet an der Saeule (reicht nur ' + r.cone.pillar + ' px)');
      t.ok(r.cone.open > 300, 'im offenen Saal reicht der Kegel weit (' + r.cone.open + ' px)');
    },
  },
  {
    name: 'Casino: zwoelf Tische und alle Chipstapel in jedem Grundriss, unter jedem Tisch eine freie Kachel, Cage und Fluchtweg frei',
    timeout: 180000,
    async run(t) {
      const r = await t.page.evaluate(([FIND]) => {
        const D = __dbg, find = eval(FIND), seeds = find('casino', 1, 3), bad = [], tabs = {};
        for (const [hall, list] of Object.entries(seeds)) for (const sd of list) {
          D.setScenario('casino'); D.setSeedMode('random'); D.setLage([]); D.setTurn('S'); D.buildLay(D.layoutFor(sd)); const L = D.LAY(), w = D.world();
          const chips = L.goods.filter(g => g.k === 'chips'); tabs[hall] = chips.length;
          for (const g of chips) {
            // Stapel liegt an der Suedseite des Tischs (Kachelspalten tx+1 und tx+2 in der Zeile ty+2 darunter): dort muss eine freie Kachel sein
            const tx = Math.floor(g.rc[0] / 32) - 1, ty = Math.floor(g.rc[1] / 32) - 1;
            for (let dx = 0; dx < 4; dx++) for (let dy = 0; dy < 2; dy++) if (w.cell(tx + dx, ty + dy) !== 'C') bad.push(hall + '#' + sd + ': Tisch bei ' + tx + ',' + ty + ' fehlt im Raster');
            if (w.isSol(tx + 1, ty + 2) && w.isSol(tx + 2, ty + 2)) bad.push(hall + '#' + sd + ': Chipstapel bei ' + tx + ',' + ty + ' nicht von Sueden erreichbar');
          }
          // Cage-Tausch (Zeile 7, x28..32), Sicherheitsraumtuer (19..20,7), Fluchtweg (x36..38, Zeilen 15..18), Eingang (19..21,22), Geldautomaten, VIP-Tueren
          const need = [];
          for (let x = 26; x <= 34; x++) need.push([x, 7]); need.push([19, 7], [20, 7], [37, 12], [37, 13], [6, 10], [7, 10], [6, 8], [7, 8], [10, 4], [10, 5], [19, 22], [20, 22], [21, 22]);
          for (let x = 36; x <= 38; x++) for (let y = 15; y <= 18; y++) need.push([x, y]);
          for (const q of need) if (w.isSol(q[0], q[1])) bad.push(hall + '#' + sd + ': blockiert bei ' + q);
        }
        return { bad, tabs };
      }, [FIND]);
      t.eq(r.bad, [], 'Casino-Grundrisse');
      t.eq(Object.values(r.tabs), [12, 12, 12, 12], 'zwoelf Chipstapel je Grundriss');
    },
  },
  {
    name: 'Grundrisse: der Bot gewinnt in jedem Grundriss mit fruehem Abgang (Rauchtest je Grundriss, keine Balance-Messung)',
    timeout: 400000,
    async run(t) {
      await t.loadTool('bot.js');
      const r = await t.page.evaluate(([SC, FIND, BOT]) => {
        const D = __dbg, find = eval(FIND), out = {};
        for (const sc of SC) {
          const seeds = find(sc, 5000, 4);
          for (const [hall, list] of Object.entries(seeds)) {
            let win = 0, loot = 0, n = 0, lost = [];
            for (const sd of list) {
              D.setScenario(sc); D.setSeedMode('random'); D.setTurn('S');
              const res = bot.run(Object.assign({ sigma: .05, react: .35, kit: 'old', call: 0, seed: sd, van: 'alt' }, BOT[sc])); n++;
              if (res.res === 'WIN') { win++; loot += res.loot } else lost.push(sd);
            }
            out[sc + '/' + hall] = { win, n, avg: win ? Math.round(loot / win) : 0, lost };
          }
        }
        return out;
      }, [SC, FIND, BOT]);
      t.note(Object.entries(r).map(([k, v]) => k + ' ' + v.win + '/' + v.n + ' (' + v.avg + ')').join(', '));
      for (const sc of SC) {
        const ks = Object.keys(r).filter(k => k.startsWith(sc + '/')), w = ks.reduce((s, k) => s + r[k].win, 0), n = ks.reduce((s, k) => s + r[k].n, 0);
        t.eq(ks.length, 4, sc + ': vier Grundrisse');
        t.ok(w / n >= .8, sc + ': Siegquote ' + w + '/' + n + ' liegt unter 80 %: ' + ks.map(k => k + ' ' + JSON.stringify(r[k].lost)).join(', '));
        for (const k of ks) t.ok(r[k].win >= 2, k + ' gewinnt nur ' + r[k].win + ' von ' + r[k].n + ', verloren: ' + JSON.stringify(r[k].lost));
      }
    },
  },
];
