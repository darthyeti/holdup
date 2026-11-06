// Issue 128: Tresorcode, mehr Fundorte (pin Pinnwand, copy Kopierer, coat Garderobe, coffee Kaffeeecke) und Mindestabstand zum Tresor.
// Geprueft ueber viele Seeds und Szenarien: jeder neue Ort kommt vor, nie unter CFG.note.minPath Kacheln Weglaenge vom Tresorstand, nie im Tresorvorraum,
// Kopierer und Kaffeeecke nur in Hinterraeumen, im Coop sieht der Client den Zettel am gleichen Ort.
const SC = ['bank', 'jewel', 'gas', 'museum', 'casino', 'nb'];
const NEW = ['pin', 'copy', 'coat', 'coffee'];

module.exports = [
  {
    name: 'Fundort-Abstand: 6 Szenarien, 3 Lagen, 120 Seeds: kein Zettel unter dem Mindestabstand oder im Tresorvorraum, jeder neue Ort kommt vor, Gewichte stehen in CFG',
    async run(t) {
      const r = await t.page.evaluate(([SC, NEW]) => {
        const D = __dbg, o = { cnt: {}, all: {}, bad: [], n: 0, min: D.CFG.note.minPath, w: D.CFG.note.w, tt: D.CFG.note.t, minSeen: 99 };
        for (const sc of SC) {
          o.cnt[sc] = {};
          for (const turn of [null, 'E', 'N+']) for (let seed = 1; seed <= 120; seed++) {
            D.setTurn(turn); D.setScenario(sc); D.setSeedMode('random'); D.setLage([]);
            const lay = D.layoutFor(seed), na = lay.noteAt; if (lay.mission.vault !== 'code') continue;
            if (!na) { o.bad.push(sc + '#' + seed + ' ohne noteAt'); continue; }
            o.n++; o.cnt[sc][na.k] = (o.cnt[sc][na.k] || 0) + 1; o.all[na.k] = (o.all[na.k] || 0) + 1;
            const d = D.vdAt(D.vaultDist(lay), na.x, na.y);
            if (d !== undefined) o.minSeen = Math.min(o.minSeen, d);
            if (d !== undefined && d < o.min) o.bad.push(sc + '#' + seed + ' ' + turn + ' ' + na.k + ' nur ' + d + ' Kacheln vom Tresor');
            if (D.inVorraum(lay, na.x, na.y)) o.bad.push(sc + '#' + seed + ' ' + turn + ' ' + na.k + ' im Tresorvorraum');
            if (['copy', 'coffee'].includes(na.k) && !D.backZones(lay).some(z => na.x >= z[0] && na.x <= z[2] && na.y >= z[1] && na.y <= z[3])) o.bad.push(sc + '#' + seed + ' ' + na.k + ' nicht im Hinterraum');
            const v = D.validateMap(lay).err.filter(e => e.r === 'fundort'); if (v.length) o.bad.push(sc + '#' + seed + ' ' + v[0].m);
          }
        }
        D.setTurn(null); return o;
      }, [SC, NEW]);
      t.eq(r.bad.slice(0, 6), [], r.bad.length + ' Zettel verletzen Abstand oder Regel');
      t.ok(r.n > 1000, 'zu wenige Karten mit Code: ' + r.n);
      for (const k of NEW) { t.ok(r.all[k] > 0, 'neuer Ort kommt vor: ' + k); t.ok(r.w[k] > 0 && r.tt[k] > 0, k + ' hat Gewicht und Dauer in CFG'); }
      t.ok(r.min >= 8, 'Mindestabstand in CFG mindestens 8: ' + r.min);
      for (const sc of ['bank', 'casino']) t.eq(NEW.filter(k => !(r.cnt[sc][k] > 0)), [], sc + ': alle neuen Orte kommen vor ' + JSON.stringify(r.cnt[sc]));
      for (const sc of SC) t.ok(['pin', 'coat'].some(k => r.cnt[sc][k] > 0), sc + ': mindestens Pinnwand oder Garderobe');
      t.note('Verteilung gesamt ' + JSON.stringify(r.all) + '; je Szenario ' + SC.map(sc => sc + ' ' + JSON.stringify(r.cnt[sc])).join('; ') + '; kleinster Abstand ' + r.minSeen);
    },
  },
  {
    name: 'Fundort-Abstand: neue Orte lassen sich suchen (Item note, Dauer aus CFG), und im Coop sieht der Client den Zettel am gleichen Ort wie der Host',
    async run(t) {
      await t.loadTool('loopnet.js'); await t.loadInpage('coop.js');
      const r = await t.page.evaluate(([NEW]) => {
        const probe = __dbg, o = { bad: [], n: 0 };
        for (const kind of NEW) {
          let seed = 0; for (let s = 1; s <= 400 && !seed; s++) { probe.setTurn(null); probe.setScenario('bank'); probe.setSeedMode('random'); probe.setLage([]); const l = probe.layoutFor(s); if (l.noteAt && l.noteAt.k === kind) seed = s }
          if (!seed) { o.bad.push(kind + ' kein Seed'); continue }
          const G = CT.mkGame('bank', seed, 2, 60, 20), A = G.A, B = G.clients[0]; o.n++;
          const na = A.LAY().noteAt, nb = B.LAY().noteAt;
          if (JSON.stringify(na) !== JSON.stringify(nb) || na.k !== kind) o.bad.push(kind + ' Client sieht ' + JSON.stringify(nb) + ' statt ' + JSON.stringify(na));
          const itA = A.get().its.find(i => i.t === 'note'), itB = B.get().its.find(i => i.t === 'note');
          if (!itA || !itB || itA.x !== itB.x || itA.y !== itB.y) o.bad.push(kind + ' Item verschieden');
          if (itA.dur() !== A.CFG.note.t[kind]) o.bad.push(kind + ' Dauer');
          const me = A.get().players[0]; me.hp = 1e9; me.x = itA.x; me.y = itA.y;
          if (!itA.ok(me)) o.bad.push(kind + ' nicht ok');
          try { A.draw(); B.draw() } catch (e) { o.bad.push(kind + ' Zeichnen ' + e.message) }
          itA.act(me); G.run(1); if (!A.get().code || !B.get().code) o.bad.push(kind + ' Code nicht bei allen');
        }
        return o;
      }, [NEW]);
      t.eq(r.bad.slice(0, 6), [], r.bad.length + ' Fehler');
      t.eq(r.n, 4, 'vier neue Orte geprueft');
    },
  },
];
