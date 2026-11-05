// Kammer in der Bank (K4, Plan Kammern in docs/ideen-und-planung.md, Ticket #8, Entscheidung kammer-personal A: Personalbereich, Sperrzonen-Ausnahme nur fuer bank und gas):
// Die Kammer liegt im Buero des Ostfluegels (Nordostecke, mit Tausch Suedostecke), der Ostfluegel wird mit Kammer um drei Spalten breiter (genLayout, eigener Strom, Rueckfall auf dieselbe Huelle ohne Kammer,
// wenn validateMap etwas Neues meldet). Geprueft: (1) mit CFG.stash.on 0 ist jede Bank-Karte 1 bis 40 Zeichen fuer Zeichen die von vorher, (2) Anteil, Aufbau, validateMap, gleiche Seeds gleiche Kammern,
// (3) die Regel kammer samt Mutanten der Sperrzonen-Ausnahme, (4) alle acht Lagen, (5) der Zugang liegt ausserhalb der Sicht, (6) Spieltest: ziehen, H, 90 s ohne Alarm, Gegenprobe in der Halle, (7) Coop.
const { coopGame } = require('../lib');
// Hashes (TN.layHash) der Bank-Karten 1 bis 40 auf der Basis (Lage S, ohne Treffpunkt abseits) vom Stand vor K4 (origin/main 04bf933)
const OLD = [[1,"f4deb800"],[2,"aa96d294"],[3,"78ce5201"],[4,"e6dc076d"],[5,"cc704636"],[6,"867f9b35"],[7,"3e4c95c7"],[8,"e449d63d"],[9,"32ffd75e"],[10,"525d01e3"],[11,"bd9a8d63"],[12,"6fa56f61"],[13,"777d1832"],[14,"12536fbd"],[15,"40241f2c"],[16,"d06e671e"],[17,"de6e7d10"],[18,"d5cf40c3"],[19,"cb114b41"],[20,"e745280d"],[21,"c2c63cd1"],[22,"2db273"],[23,"bcf371f8"],[24,"ec9bdb2e"],[25,"a2dffc58"],[26,"f4fc7455"],[27,"6a14083a"],[28,"e262027e"],[29,"a54e485c"],[30,"6cf99e68"],[31,"1b231191"],[32,"1e91abb9"],[33,"d7936df6"],[34,"c67a8077"],[35,"6d4169ea"],[36,"826d392a"],[37,"bd12a91d"],[38,"81ddcc2a"],[39,"633f6b54"],[40,"cdff71ed"]];

module.exports = [
  {
    name: 'Kammern aus: mit CFG.stash.on 0 ist jede Bank-Karte 1 bis 40 Zeichen fuer Zeichen die von vorher, keine Kammer',
    timeout: 120000,
    async run(t) {
      await t.loadInpage('turn.js');
      const r = await t.page.evaluate((OLD) => {
        const D = __dbg, C = D.CFG, keep = [C.meet.p, C.stash.on]; C.meet.p = 0; C.stash.on = 0; const diff = []; let st = 0;
        try { D.setScenario('bank'); D.setSeedMode('random'); D.setLage([]); D.setTurn('S'); for (const [s, h] of OLD) { const lay = D.layoutBase(s); if (TN.layHash(D, lay) !== h) diff.push(s); if (lay.stash) st++; } }
        finally { C.meet.p = keep[0]; C.stash.on = keep[1]; }
        return { diff, st, n: OLD.length };
      }, OLD);
      t.eq(r.diff, [], 'Karten, die von vorher abweichen'); t.eq(r.st, 0, 'keine Kammer'); t.eq(r.n, 40, '40 Seeds');
    },
  },
  {
    name: 'Kammer in der Bank: gut drei Viertel der Karten haben eine, beide Arten, Innenraum 2 x 2 mit Versteck-Reihe an der Aussenwand, Ring geschlossen mit einer Tuer d, validateMap meldet nichts Neues gegenueber derselben Karte ohne Kammer, gleiche Seeds geben gleiche Kammern, der Ostfluegel ist drei Spalten breiter',
    timeout: 290000,
    async run(t) {
      await t.loadInpage('turn.js');
      const r = await t.page.evaluate(() => {
        const D = __dbg, C = D.CFG, keep = C.meet.p; C.meet.p = 0; const sig = rep => rep.err.concat(rep.warn).map(e => e.r + ': ' + e.m), o = { n: 0, st: 0, kinds: {}, swp: 0, stSwp: 0, bad: [], nd: 0, wide: 0 };
        try {
          D.setScenario('bank'); D.setSeedMode('random'); D.setLage([]); D.setTurn('S');
          for (let s = 1; s <= 150; s++) { const lay = D.layoutBase(s); o.n++; if (lay.q && lay.q.sw) o.swp++; if (!lay.stash) continue; o.st++; if (lay.q.sw) o.stSwp++; const K = lay.stash, w = D.world(), tag = 'bank#' + s + ' ' + JSON.stringify(K); o.kinds[K.kind] = (o.kinds[K.kind] || 0) + 1;
            if (lay.q.stash !== K.kind) o.bad.push(tag + ' q.stash');
            if (K.cells.length !== 4 || K.cells.some(c => D.isSol(c[0], c[1]))) o.bad.push(tag + ' Innenraum');
            if (!K.deep.length || K.deep.some(c => !K.cells.some(q => q[0] === c[0] && q[1] === c[1]))) o.bad.push(tag + ' Versteck-Kacheln');
            if (w.cell(K.door[0], K.door[1]) !== 'd' || D.isSol(K.out[0], K.out[1]) || Math.abs(K.out[0] - K.door[0]) + Math.abs(K.out[1] - K.door[1]) !== 1) o.bad.push(tag + ' Tuer');
            const X = K.cells.map(c => c[0]), Y = K.cells.map(c => c[1]); for (let x = Math.min(...X) - 1; x <= Math.max(...X) + 1; x++) for (let y = Math.min(...Y) - 1; y <= Math.max(...Y) + 1; y++) { if (X.includes(x) && Y.includes(y)) continue; const ch = w.cell(x, y); if (ch !== '#' && ch !== 'd') o.bad.push(tag + ' Ring ' + x + ',' + y + ' ' + ch); }
            { const q = lay.q, bx1 = q.cx + 1 + q.vw + 2 + q.ew + 3; if (lay.bld.x1 - lay.bld.x0 !== bx1) o.bad.push(tag + ' Breite ' + (lay.bld.x1 - lay.bld.x0) + ' statt ' + bx1); else o.wide++; if (!K.cells.every(c => c[0] === lay.bld.x1 - 1 || c[0] === lay.bld.x1 - 2 || c[0] === lay.bld.x0 + 1 || c[0] === lay.bld.x0 + 2)) o.bad.push(tag + ' nicht an der Aussenwand'); }
            const rep = sig(D.validateMap(lay)); D.CFG.stash.on = 0; const base = sig(D.validateMap(D.layoutBase(s))); D.CFG.stash.on = 1; D.layoutBase(s);
            if (rep.length) o.bad.push(tag + ' validateMap meldet: ' + rep.join(' | ')); if (rep.some(m => !base.includes(m))) o.bad.push(tag + ' validateMap neu: ' + rep.filter(m => !base.includes(m)).join(' | '));
            if (s <= 40 && JSON.stringify(D.layoutBase(s).stash) !== JSON.stringify(K)) o.nd++; }
          o.bad = o.bad.slice(0, 6);
        } finally { C.meet.p = keep; D.CFG.stash.on = 1; }
        return o;
      });
      t.eq(r.bad, [], 'Abweichungen'); t.eq(r.nd, 0, 'gleiche Seeds, gleiche Kammern'); t.eq(r.wide, r.st, 'jede Kammer-Karte ist um 3 Spalten breiter als ohne Kammer');
      t.ok(r.kinds.wc >= r.st * .3 && r.kinds.abstell >= r.st * .3, 'beide Arten: ' + JSON.stringify(r.kinds)); t.ok(r.st >= r.n * .7 && r.st <= r.n * .9, 'Anteil mit Kammer ' + r.st + ' von ' + r.n);
      t.ok(r.stSwp >= r.swp * .6, 'auch mit Tausch von Buero und Sicherheitsraum: ' + r.stSwp + ' von ' + r.swp); t.note('Bank ' + r.st + '/' + r.n + ' ' + JSON.stringify(r.kinds) + ', Tausch ' + r.stSwp + '/' + r.swp);
    },
  },
  {
    name: 'Regel kammer in der Bank: die Sperrzone des Ostfluegels ist nur fuer bank und gas erlaubt (CFG.stash.zone), ohne die Ausnahme schlaegt die Regel an, mit einer Ausnahme fuer alle bleibt eine Kammer des Juweliers in einer Sperrzone trotzdem unerlaubt nur, solange jewel nicht in der Liste steht',
    timeout: 120000,
    async run(t) {
      const r = await t.page.evaluate(() => {
        const D = __dbg, C = D.CFG, keep = [C.meet.p, C.stash.zone.slice()]; C.meet.p = 0; const out = { bank: [], bankNo: [], jewel: [], jewelAll: [] }, kam = rep => rep.err.filter(e => e.r === 'kammer').map(e => e.m);
        try {
          D.setSeedMode('random'); D.setLage([]); D.setTurn('S'); D.setScenario('bank'); let seed = 0; for (let s = 1; s < 80 && !seed; s++) if (D.layoutBase(s).stash) seed = s;
          const lb = D.layoutBase(seed); out.bank = kam(D.validateMap(lb)); C.stash.zone = []; out.bankNo = kam(D.validateMap(lb)); C.stash.zone = keep[1].slice();
          D.setScenario('jewel'); let js = 0; for (let s = 1; s < 80 && !js; s++) if (D.layoutBase(s).stash) js = s;
          const lay = D.layoutBase(js); lay.zones = (lay.zones || []).concat([[lay.stash.cells[0][0] - 2, lay.stash.cells[0][1] - 2, lay.stash.cells[0][0] + 2, lay.stash.cells[0][1] + 2]]);
          out.jewel = kam(D.validateMap(lay)); C.stash.zone = ['bank', 'gas', 'jewel']; out.jewelAll = kam(D.validateMap(lay)); out.seed = [seed, js];
        } finally { C.meet.p = keep[0]; C.stash.zone = keep[1]; }
        return out;
      });
      t.eq(r.bank, [], 'Bank mit der Ausnahme: Regel kammer ruhig'); t.ok(r.bankNo.some(m => /Sperrzone/.test(m)), 'Bank ohne Ausnahme: Sperrzone gemeldet: ' + JSON.stringify(r.bankNo));
      t.ok(r.jewel.some(m => /Sperrzone/.test(m)), 'Juwelier mit Standardliste: Sperrzone gemeldet: ' + JSON.stringify(r.jewel)); t.ok(!r.jewelAll.some(m => /Sperrzone/.test(m)), 'Mutant (jewel in der Liste): keine Meldung mehr, die Liste wirkt');
    },
  },
  {
    name: 'Kammer in der Bank in allen acht Lagen (Fluchtseite Ost oder West, Tausch von Buero und Sicherheitsraum, gespiegelt): Tuer d, Innenraum frei, Ring Wand, validateMap ohne Fehler, jede Kombination kommt vor',
    timeout: 240000,
    async run(t) {
      const r = await t.page.evaluate(() => {
        const D = __dbg, C = D.CFG, keep = C.meet.p; C.meet.p = 0; const bad = [], cls = {}; let n = 0;
        try {
          D.setScenario('bank'); D.setSeedMode('random'); D.setLage([]); D.setTurn('S');
          for (let s = 1; s <= 200; s++) {
            const lay = D.layoutFor(s), K = lay.stash; if (!K) continue; n++; const w = D.world(), tag = 'bank#' + s, B = lay.bld, mir = K.cells[0][0] < (B.x0 + B.x1) / 2, k = (lay.q.tp === 'W' ? 'W' : 'E') + (lay.q.sw ? 'T' : '-') + (mir ? 'M' : '-'); cls[k] = (cls[k] || 0) + 1;
            if (w.cell(K.door[0], K.door[1]) !== 'd') bad.push(tag + ' Tuer ' + w.cell(K.door[0], K.door[1]));
            if (K.cells.some(c => D.isSol(c[0], c[1]))) bad.push(tag + ' Innenraum belegt');
            if (!K.deep.length || K.deep.some(c => !K.cells.some(q => q[0] === c[0] && q[1] === c[1]))) bad.push(tag + ' Versteck-Reihe ausserhalb des Innenraums');
            const X = K.cells.map(c => c[0]), Y = K.cells.map(c => c[1]); for (let x = Math.min(...X) - 1; x <= Math.max(...X) + 1; x++) for (let y = Math.min(...Y) - 1; y <= Math.max(...Y) + 1; y++) { if (X.includes(x) && Y.includes(y)) continue; const ch = w.cell(x, y); if (ch !== '#' && ch !== 'd') bad.push(tag + ' Ring ' + x + ',' + y + ' ' + ch); }
            const rep = D.validateMap(lay); if (rep.err.length) bad.push(tag + ' validateMap ' + rep.err.map(e => e.r + ': ' + e.m).join(' | '));
          }
        } finally { C.meet.p = keep; }
        return { bad: bad.slice(0, 8), nbad: bad.length, n, cls };
      });
      t.eq(r.bad, [], 'Abweichungen (' + r.nbad + ')'); t.ok(Object.keys(r.cls).length === 8, 'alle acht Kombinationen kommen vor: ' + JSON.stringify(r.cls)); t.note(JSON.stringify(r.cls));
    },
  },
  {
    name: 'Kammer in der Bank: der Zugang (Kachel vor der Tuer und ihre begehbaren Nachbarn ausser der Tuer) liegt ausserhalb der echten Sicht der Kassierer (7,8 Kacheln) und aller Kameras (im ganzen Schwenk mal 1,25); Manager und Wachen laufen im Personalbereich und duerfen ihn sehen, Seeds 1 bis 150, Sichtlinie mit der echten Funktion los()',
    timeout: 240000,
    async run(t) {
      await t.loadInpage('turn.js');
      const r = await t.page.evaluate(() => {
        const D = __dbg, C = D.CFG, keep = C.meet.p; C.meet.p = 0; const bad = [], out = { n: 0, cells: 0 }, T = 32, angd = (a, b) => { const d = Math.abs(a - b) % (2 * Math.PI); return d > Math.PI ? 2 * Math.PI - d : d; };
        try {
          D.setSeedMode('random'); D.setLage([]); D.setTurn('S'); D.setScenario('bank');
          for (let s = 1; s <= 150; s++) { const lay0 = D.layoutBase(s); if (!lay0.stash) continue; D.buildLay(lay0); const lay = D.LAY(), K = lay.stash; out.n++;
            const pts = [], seg = (q, rg, fov) => { if (!q) return; for (let k = 0; k < q.length; k++) { pts.push([q[k][0], q[k][1], null, rg, 0]); if (k) { const a = q[k - 1], b = q[k], n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) * 2)), an = Math.atan2(b[1] - a[1], b[0] - a[0]); for (let u = 1; u < n; u++) pts.push([a[0] + (b[0] - a[0]) * u / n, a[1] + (b[1] - a[1]) * u / n, an, rg, fov]); } } };
            (lay.tellers || []).forEach(q => pts.push([q[0], q[1], Math.PI / 2, 250, 1.2]));
            const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(v => [K.out[0] + v[0], K.out[1] + v[1]]).filter(q => !(q[0] === K.door[0] && q[1] === K.door[1]) && !D.isSol(q[0], q[1])), acc = [K.out].concat(nb);
            for (const c of acc) { out.cells++; const tx = (c[0] + .5) * T, ty = (c[1] + .5) * T;
              for (const p of pts) { const sx = (p[0] + .5) * T, sy = (p[1] + .5) * T, dd = Math.hypot(tx - sx, ty - sy); if (dd >= p[3]) continue; if (p[2] != null && angd(p[2], Math.atan2(ty - sy, tx - sx)) > p[4]) continue; if (D.los(sx, sy, tx, ty)) { bad.push('bank#' + s + ' ' + c + ' gesehen von ' + p.slice(0, 2).map(v => Math.round(v * 10) / 10)); break; } }
              for (const m of lay.cams || []) { const dd = Math.hypot(tx - m.x, ty - m.y); if (dd >= m.rng * 1.25) continue; if (angd(m.a0, Math.atan2(ty - m.y, tx - m.x)) > m.amp + m.fov) continue; if (D.los(m.x, m.y, tx, ty)) { bad.push('bank#' + s + ' ' + c + ' gesehen von Kamera ' + Math.round(m.x) + ',' + Math.round(m.y)); break; } } }
          }
        } finally { C.meet.p = keep; }
        out.bad = bad.slice(0, 6); out.nbad = bad.length; return out;
      });
      t.eq(r.bad, [], 'Abweichungen (' + r.nbad + ' bei ' + r.n + ' Kammern, ' + r.cells + ' Zugangskacheln)'); t.ok(r.n >= 100, 'Kammern geprueft: ' + r.n);
    },
  },
  {
    name: 'Kammer im Spiel (Bank): mit allen Wachen, Angestellten, dem Manager und den Kameras im Dienst laesst sich ein ausgeschalteter Wachmann durch die Tuer in die Kammer ziehen (vier Anlaufzeiten), ohne Alarm; H verstaut ihn, dort findet ihn in 90 s niemand; derselbe Koerper mitten in der Halle wird gefunden',
    timeout: 290000,
    async run(t) {
      const r = await t.page.evaluate(`(() => { const D = __dbg, res = { drag: [], hall: [], seeds: [] }, px = c => (c + .5) * 32, away = me => { me.x = -16; me.y = 176; };
        const setup = (s, warm) => { D.sessReset(); D.setScenario('bank'); D.setSeedMode('random'); D.setLage([]); D.setTurn('S'); D.CFG.meet.p = 0; D.buildSeed(s); D.CFG.policeAt = 1e6; D.CFG.policeForced = 1e6;
          const g = D.get(), me = g.me, L = D.LAY(); for (const q of g.npcs) if (q.st === 'away') q.at = 1e9; away(me); for (let i = 0; i < warm * 30; i++) { away(me); D.update(1 / 30); } return { g, me, L }; };
        D.setScenario('bank'); D.setSeedMode('random'); D.setLage([]); D.setTurn('S'); D.CFG.meet.p = 0; const seeds = []; for (let s = 1; s < 200 && seeds.length < 4; s++) { const l = D.layoutBase(s); if (l.stash && l.guards.length >= 1) seeds.push(s); }
        res.seeds = seeds;
        for (const s of seeds) for (const warm of [0, 13, 29, 47]) {
          const { g, me, L } = setup(s, warm), K = L.stash, a = g.npcs.find(q => q.k === 'grd' && q.st === 'idle'); D.koMi(a).act(me); a.kt = 1e9;
          const nb = c => [[1, 0], [-1, 0], [0, 1], [0, -1]].map(d => [c[0] + d[0], c[1] + d[1]]).filter(q => !D.isSol(q[0], q[1]) && !(q[0] === K.door[0] && q[1] === K.door[1])), ap = nb(K.out)[0];
          a.x = px(ap[0]); a.y = px(ap[1]); me.x = px(K.out[0]); me.y = px(K.out[1]); D.bodyMi(a).act(me);
          const first = K.cells.find(c => Math.abs(c[0] - K.door[0]) + Math.abs(c[1] - K.door[1]) === 1), wps = [K.door, first, first]; let wi = 0, ticks = 0;
          while (wi < wps.length && ticks < 900 && D.get().phase === 1) { const w = wps[wi], dx = px(w[0]) - me.x, dy = px(w[1]) - me.y; if (Math.hypot(dx, dy) < 8) { wi++; continue; } D.keys.d = dx > 2; D.keys.a = dx < -2; D.keys.s = dy > 2; D.keys.w = dy < -2; D.update(1 / 30); ticks++; }
          D.keys.w = D.keys.a = D.keys.s = D.keys.d = false; for (let i = 0; i < 6; i++) D.update(1 / 30);
          const ph = D.get().phase; D.relBody(me); const deep = K.deep.some(q => q[0] === Math.floor(a.x / 32) && q[1] === Math.floor(a.y / 32)); let tt = 0; for (; tt < 30 * 90 && D.get().phase === 1; tt++) { away(me); D.update(1 / 30); }
          res.drag.push([s, warm, wi, ph, deep ? 1 : 0, D.get().phase, +(tt / 30).toFixed(1)]);
        }
        for (const s of seeds) { const { g, me, L } = setup(s, 5), a = g.npcs.find(q => q.k === 'grd' && q.st === 'idle'), rp = L.guards[0].route[3]; D.koMi(a).act(me); a.kt = 1e9; a.x = px(Math.round(rp[0])); a.y = px(Math.round(rp[1])); let tt = 0; for (; tt < 30 * 90 && D.get().phase === 1; tt++) { away(me); D.update(1 / 30); } res.hall.push([s, D.get().phase, +(tt / 30).toFixed(1)]); }
        return res; })()`);
      t.eq(r.drag.length, 16, 'Laeufe: ' + JSON.stringify(r.seeds));
      const ok = r.drag.filter(x => x[3] === 1);
      t.ok(ok.length >= 12, 'der Spieler zieht den Koerper bis in den Raum; Manager und Wachen laufen im Buero und sehen ihn bei einem Teil der Streifenzeiten (Alarm beim Ziehen), in mindestens 12 von 16 Laeufen nicht: ' + ok.length + ' von 16, Alarm bei ' + JSON.stringify(r.drag.filter(x => x[3] !== 1)));
      t.ok(ok.every(x => x[2] === 3), 'wer nicht entdeckt wurde, kommt bis in die Kammer');
      t.ok(ok.every(x => x[4] === 1), 'H verstaut den Koerper in einer Versteck-Kachel: ' + JSON.stringify(ok.filter(x => x[4] !== 1)));
      t.eq(ok.map(x => x[5]), ok.map(() => 1), 'in der Kammer findet ihn in 90 s niemand: ' + JSON.stringify(ok.filter(x => x[5] !== 1)));
      t.ok(r.hall.filter(x => x[1] === 2).length >= r.hall.length - 1, 'derselbe Koerper auf einem Wegpunkt der Streife: in aller Regel Alarm: ' + JSON.stringify(r.hall));
    },
  },
  {
    name: 'Kammer im Coop (Bank): Host und Client bauen dieselbe Kammer (ein Seed mit Kammer, vom Start bis zum Sieg)',
    timeout: 290000,
    async run(t) {
      await t.loadInpage('turn.js');
      const seed = await t.page.evaluate(() => { const D = __dbg; D.setSeedMode('random'); D.setLage([]); D.setTurn('S'); D.CFG.meet.p = 0; D.setScenario('bank'); for (let s = 1; s < 200; s++) if (D.layoutBase(s).stash) return s; return 0; });
      const res = await coopGame(t.env, 'bank', seed);
      t.ok(seed, 'Seed mit Kammer: ' + seed); t.note(res.tag + ' ' + res.stat.hall); t.eq(res.bad.map(b => res.tag + ': ' + b), [], 'Abweichungen');
    },
  },
];
