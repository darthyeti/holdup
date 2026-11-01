// Fundort des Tresorcodes (Issue 53, docs/karte-und-layout.md, Fundort des Codes): Bei jedem Auftrag mit Codetresor liegt der Zettel an einem Ort, den der Seed waehlt (LAY.noteAt {k,x,y}):
// desk Schreibtisch, mon Monitor, mgr der Manager traegt ihn (faellt beim Ausschalten oder Tod, nDrop, im Schnappschuss nd), bin Papierkorb, file Aktenschrank, locker Spind nahe einer Personaltuer.
// Geprueft: Verteilung ueber Seeds, Szenarien und Lagen, validateMap (Regel fundort), Erreichbarkeit, Suchen und Finden je Fundort, der Manager (Ausschalten, Tod, Aufwachen, Host und Client), Zeichnen.
const SC = ['bank', 'jewel', 'gas', 'museum', 'casino'];

module.exports = [
  {
    name: 'Fundort: pro Szenario und Lage alle sechs Orte kommen vor, nur bei Codetresor gibt es noteAt, gleicher Seed gleicher Ort, validateMap meldet keinen Fundort-Fehler, Klassik bleibt beim Schreibtisch',
    async run(t) {
      const r = await t.page.evaluate(([SC]) => {
        const D = __dbg, o = { cnt: {}, bad: [], drill: 0, code: 0, det: true, names: D.MAP_FIELDS.map(f => f[0]), kinds: D.NOTE_KINDS.slice() };
        for (const sc of SC) {
          o.cnt[sc] = {};
          for (const turn of [null, 'N', 'E+', 'W']) for (let seed = 1; seed <= 90; seed++) {
            D.setTurn(turn); D.setScenario(sc); D.setSeedMode('random'); D.setLage([]);
            const lay = D.layoutFor(seed), v = D.validateMap(lay), na = lay.noteAt;
            if (lay.mission.vault !== 'code') { o.drill++; if (na) o.bad.push(sc + '#' + seed + ' noteAt trotz Bohrtresor'); continue; }
            o.code++;
            if (!na) { o.bad.push(sc + '#' + seed + ' ' + turn + ' ohne noteAt'); continue; }
            o.cnt[sc][na.k] = (o.cnt[sc][na.k] || 0) + 1;
            const fe = v.err.filter(e => e.r === 'fundort' || e.r === 'feld-weg'); if (fe.length) o.bad.push(sc + '#' + seed + ' ' + turn + ' ' + na.k + ': ' + fe.map(e => e.m || e.r).join('; '));
            if (turn == null && seed <= 20) { const a = D.layoutFor(seed).noteAt; if (JSON.stringify(a) !== JSON.stringify(na)) o.det = false; }
          }
        }
        D.setTurn(null); D.setScenario('bank'); D.setSeedMode('classic'); const cl = D.layoutFor('classic'); o.classic = cl.noteAt && cl.noteAt.k;
        return o;
      }, [SC]);
      t.eq(r.bad.slice(0, 6), [], r.bad.length + ' Karten mit Fehler am Fundort');
      t.ok(r.names.includes('noteAt'), 'noteAt steht in MAP_FIELDS');
      // Welche Orte je Szenario nie gewaehlt werden koennen (Rueckfall Schreibtisch): kein Manager auf Tankstelle und Museum, kein Spind auf dem Juwelier und der Tankstelle (siehe docs/karte-und-layout.md, Fundort des Codes)
      const MISSING = { bank: [], jewel: ['locker'], gas: ['mgr', 'locker'], museum: ['mgr'], casino: [] };
      for (const sc of SC) t.eq(r.kinds.filter(k => !(r.cnt[sc][k] > 0)), MISSING[sc], sc + ': nie gewaehlte Orte, Zaehlung ' + JSON.stringify(r.cnt[sc]));
      t.ok(r.det, 'gleicher Seed, gleicher Fundort');
      t.ok(r.drill > 0 && r.code > 0, 'es gibt Karten mit Bohrtresor (' + r.drill + ') und mit Code (' + r.code + ')');
      t.eq(r.classic, 'desk', 'Klassikkarte: Schreibtisch');
      t.note(SC.map(sc => sc + ' ' + JSON.stringify(r.cnt[sc])).join('; '));
    },
  },
  {
    name: 'Fundort: Verteilung folgt den Gewichten (Bank, 400 Seeds: jeder Ort mindestens halb so oft wie erwartet, Rueckfall auf den Schreibtisch selten) und das Moebel steht auf Boden an einer Wand, fern von Tueren und Beute',
    async run(t) {
      const r = await t.page.evaluate(() => {
        const D = __dbg, c = {}, bad = []; let n = 0;
        for (let seed = 1; seed <= 400; seed++) {
          D.setTurn(null); D.setScenario('bank'); D.setSeedMode('random'); D.setLage([]); const lay = D.layoutFor(seed);
          if (lay.mission.vault !== 'code') continue; n++; const a = lay.noteAt; c[a.k] = (c[a.k] || 0) + 1;
          if (['bin', 'file', 'locker'].includes(a.k)) {
            if (D.world().cell(a.x, a.y) !== '.') bad.push(seed + ' ' + a.k + ' nicht auf Boden');
            if (![[1, 0], [-1, 0], [0, 1], [0, -1]].some(d => D.world().cell(a.x + d[0], a.y + d[1]) === '#')) bad.push(seed + ' ' + a.k + ' nicht an einer Wand');
            for (const b of lay.vault.bundles.concat(lay.tills, [lay.vault.pad])) if (Math.hypot(b[0] - a.x, b[1] - a.y) < D.CFG.note.near) bad.push(seed + ' ' + a.k + ' zu nah an Beute');
          }
        }
        return { c, n, bad };
      });
      t.eq(r.bad.slice(0, 5), [], r.bad.length + ' Moebel an falscher Stelle');
      const W = { desk: 3, mgr: 2, bin: 2, file: 2, mon: 2, locker: 2 }, tot = 13;
      for (const k of Object.keys(W)) t.ok((r.c[k] || 0) >= r.n * W[k] / tot * .5, k + ' zu selten: ' + (r.c[k] || 0) + ' von ' + r.n);
      t.ok((r.c.desk || 0) <= r.n * 3 / tot * 1.8, 'zu oft Schreibtisch: ' + r.c.desk + ' von ' + r.n);
      t.note('Bank 400 Seeds, ' + r.n + ' mit Code: ' + JSON.stringify(r.c));
    },
  },
  {
    name: 'Fundort: jeder Ort laesst sich suchen und finden (E-Objekt note mit Dauer aus CFG.note.t, Reichweite, Aktion setzt code), in jedem Szenario, das Zeichnen laeuft durch',
    async run(t) {
      const r = await t.page.evaluate(([SC]) => {
        const D = __dbg, o = { n: 0, bad: [], per: {}, dur: {}, cfgT: D.CFG.note.t };
        for (const sc of SC) {
          const want = new Set(D.NOTE_KINDS), pick = {};
          for (let seed = 1; seed <= 300 && want.size; seed++) { D.setTurn(null); D.setScenario(sc); D.setSeedMode('random'); D.setLage([]); const l = D.layoutFor(seed); if (l.noteAt && want.has(l.noteAt.k) && l.noteAt.k !== 'mgr') { pick[l.noteAt.k] = seed; want.delete(l.noteAt.k) } }
          for (const k of Object.keys(pick)) {
            D.setTurn(null); D.setScenario(sc); D.setSeedMode('random'); D.setLage([]); D.buildLay(D.layoutFor(pick[k]));
            const G = D.get(), me = G.me, L = D.LAY(), it = G.its.find(i => i.t === 'note'); o.n++; G.npcs.length = 0;
            if (L.noteAt.k !== k) { o.bad.push(sc + ' ' + k + ' falscher Ort ' + L.noteAt.k); continue }
            const px = L.noteAt.x * 32 + 16, py = L.noteAt.y * 32 + 16; if (Math.hypot(it.x - px, it.y - py) > 1) o.bad.push(sc + ' ' + k + ' Item nicht auf der Kachel');
            o.dur[k] = it.dur(); me.x = px; me.y = py; me.hp = 1e9;
            if (!it.ok(me) || G.code) o.bad.push(sc + ' ' + k + ' nicht ok am Start');
            if (D.pickIt(me, -1) === null) o.bad.push(sc + ' ' + k + ' pickIt nichts');
            try { D.draw() } catch (e) { o.bad.push(sc + ' ' + k + ' Zeichnen: ' + e.message) }
            it.act(me); if (!D.get().code) o.bad.push(sc + ' ' + k + ' act setzt den Code nicht'); if (it.ok(me)) o.bad.push(sc + ' ' + k + ' noch ok nach dem Fund');
            const info = D.pinfo(it, me); if (!info || !info.v) o.bad.push(sc + ' ' + k + ' ohne Anzeigetext');
            o.per[sc] = (o.per[sc] || []).concat(k);
          }
        }
        return o;
      }, [SC]);
      t.eq(r.bad.slice(0, 6), [], r.bad.length + ' Fehler');
      t.ok(r.n >= 20, 'zu wenige Faelle: ' + r.n);
      t.ok(Object.keys(r.dur).every(k => r.dur[k] === r.cfgT[k]), 'Dauer des Items kommt aus CFG.note.t');
      t.ok(r.dur.file > r.dur.desk && r.dur.bin > r.dur.desk, 'Papierkorb und Aktenschrank dauern laenger als der Schreibtisch');
    },
  },
  {
    name: 'Fundort Manager: der Zettel ist erst nach dem Ausschalten oder Tod des Managers aufhebbar, liegt an seinem Platz, bleibt nach dem Aufwachen, geht nie verloren',
    async run(t) {
      const r = await t.page.evaluate(([SC]) => {
        const D = __dbg, o = { bad: [], n: 0, skip: [] };
        for (const sc of SC) {
          let seed = 0; for (let s = 1; s <= 400 && !seed; s++) { D.setTurn(null); D.setScenario(sc); D.setSeedMode('random'); D.setLage([]); const l = D.layoutFor(s); if (l.noteAt && l.noteAt.k === 'mgr' && l.mgr) seed = s }
          if (!seed) { o.skip.push(sc); continue }
          for (const how of ['ko', 'tot', 'ko-wach']) {
            D.setTurn(null); D.setScenario(sc); D.setSeedMode('random'); D.setLage([]); D.buildLay(D.layoutFor(seed)); D.CFG.policeAt = 1e6; D.CFG.policeForced = 1e6;
            const G = D.get(), me = G.me, it = G.its.find(i => i.t === 'note'), mg = G.npcs.find(n => n.k === 'mgr'); o.n++; me.hp = 1e9;
            const tag = sc + ' ' + how;
            if (!mg) { o.bad.push(tag + ' kein Manager'); continue }
            me.x = it.x; me.y = it.y; if (it.ok(me)) o.bad.push(tag + ' ok vor dem Ausschalten'); if (D.nDropGet()) o.bad.push(tag + ' Zettel vor dem Ausschalten am Boden');
            for (const n of G.npcs) if (n !== mg) { n.x = -999; n.y = -999 }   // Zeugen weg, nur der Manager ist im Spiel
            if (how === 'tot') { mg.st = 'dead' } else { mg.x = me.x + 20; mg.y = me.y; mg.a = Math.atan2(me.y - mg.y, me.x - mg.x) + 3.14; D.koMi(mg).act(me) }
            D.update(1 / 30); const dp = D.nDropGet();
            if (!dp) { o.bad.push(tag + ' kein Zettel nach dem Ausschalten'); continue }
            if (Math.hypot(dp.x - mg.x, dp.y - mg.y) > 1) o.bad.push(tag + ' Zettel nicht an seinem Platz');
            const px = dp.x, py = dp.y;
            if (how === 'ko-wach') { mg.kt = 0; for (let i = 0; i < 10; i++) D.update(1 / 30); mg.x += 300; if (mg.st === 'ko') o.bad.push(tag + ' wacht nicht auf') }
            me.x = px; me.y = py; for (let i = 0; i < 4; i++) D.update(1 / 30);
            const it2 = D.get().its.find(i => i.t === 'note'); if (Math.hypot(it2.x - px, it2.y - py) > 1) o.bad.push(tag + ' Item folgt dem Manager statt am Boden zu bleiben');
            me.x = px; me.y = py; if (!it2.ok(me)) o.bad.push(tag + ' nicht aufhebbar');
            try { D.draw() } catch (e) { o.bad.push(tag + ' Zeichnen ' + e.message) }
            it2.act(me); if (!D.get().code) o.bad.push(tag + ' Code nicht gesetzt');
          }
        }
        return o;
      }, [SC]);
      t.eq(r.bad.slice(0, 8), [], r.bad.length + ' Fehler bei ' + r.n + ' Faellen');
      t.ok(r.n >= 9, 'zu wenige Faelle: ' + r.n); t.eq(r.skip, ['gas', 'museum'], 'nur Karten ohne Manager (Tankstelle, Museum) haben nie den Manager als Fundort');
    },
  },
  {
    name: 'Fundort Manager im Coop: Der Client sieht den Zettel am Boden an derselben Stelle (Schnappschussfeld nd), kann ihn aufheben, und der Code kommt bei allen an',
    async run(t) {
      await t.loadTool('loopnet.js'); await t.loadInpage('coop.js');
      const r = await t.page.evaluate(() => {
        const o = {}; const probe = __dbg; let seed = 0;
        for (let s = 1; s <= 400 && !seed; s++) { probe.setTurn(null); probe.setScenario('bank'); probe.setSeedMode('random'); probe.setLage([]); const l = probe.layoutFor(s); if (l.noteAt && l.noteAt.k === 'mgr') seed = s }
        o.seed = seed;
        const G = CT.mkGame('bank', seed, 2, 60, 20), A = G.A, B = G.clients[0];
        const mg = A.get().npcs.find(n => n.k === 'mgr'), me = A.get().players[0], itA = () => A.get().its.find(i => i.t === 'note'), itB = () => B.get().its.find(i => i.t === 'note');
        o.kind = [A.LAY().noteAt.k, B.LAY().noteAt.k]; o.before = [A.nDropGet(), B.nDropGet()];
        me.hp = 1e9; mg.x = me.x + 20; mg.y = me.y; mg.a = Math.atan2(me.y - mg.y, me.x - mg.x) + 3.14; A.koMi(mg).act(me); G.run(1);
        o.after = [A.nDropGet(), B.nDropGet()]; o.same = o.after[0] && o.after[1] ? Math.hypot(o.after[0].x - o.after[1].x, o.after[0].y - o.after[1].y) : -1;
        o.item = [Math.round(itA().x), Math.round(itA().y), Math.round(itB().x), Math.round(itB().y)];
        const mb = B.get().me; o.okFar = itB().ok(mb); mb.x = itB().x; mb.y = itB().y; mb.hp = 1e9; o.okNear = itB().ok(mb);
        itA().act(me); G.run(1); o.code = [A.get().code, B.get().code];
        return o;
      });
      t.ok(r.seed > 0, 'Seed mit Manager gefunden');
      t.eq(r.kind, ['mgr', 'mgr'], 'Host und Client kennen den Fundort');
      t.eq(r.before, [null, null], 'vor dem Ausschalten liegt nichts am Boden');
      t.ok(r.after[0] && r.after[1] && r.same >= 0 && r.same < 2, 'Zettel liegt bei Host und Client an derselben Stelle: ' + JSON.stringify(r.after));
      t.eq(r.item[0], r.item[2], 'Item x gleich'); t.eq(r.item[1], r.item[3], 'Item y gleich');
      t.ok(!r.okFar || r.okNear, 'Client kann den Zettel am Boden aufheben');
      t.eq(r.code, [true, true], 'Code bei Host und Client');
    },
  },
];
