// Ticket 109: Coop, Ende "Teilweise entkommen" (einer am Boden, einer raus): danach Ergebnis, Shop, Auftragswahl. Der naechste Auftrag ist das Gefaengnis mit dem Zurueckgebliebenen, auch in der Notenbank und auch wenn es der Host selbst ist.
const RUN = (sc, seed, who) => `(() => {
  const o = {}, G = CT.mkGame('${sc}', ${seed}, 2, 60, 20), A = G.A, B = G.clients[0], pl = A.get().players, z = ${who}, e = 1 - z;
  pl[z].dead = true; pl[z].hp = 0; pl[e].out = true;
  A.finish(true, 'Teilweise entkommen', 'x'); G.run(1);
  o.pz = [A.SESSION.pz, B.SESSION.pz]; o.msg = [A, B].map(d => !!d.get().ended && /sitzt im Gefängnis/.test(d.get().ended.pz || ''));
  A.setScenario('${sc}'); A.setSeedMode('random');
  A.startNext(); G.run(2.5);
  o.next = [A.sc(), B.sc()]; o.pzNow = [A.getPz(), B.getPz()];
  return o; })()`;

module.exports = [
  {
    name: 'Gefaengnis nach Teilweise entkommen: Notenbank und Bank, der Host oder der Client bleibt zurueck, der naechste Auftrag ist der Ausbruch',
    timeout: 180000,
    async run(t) {
      await t.loadTool('loopnet.js'); await t.loadInpage('coop.js');
      for (const [sc, seed] of [['nb', 716185], ['bank', 5]]) for (const who of [0, 1]) {
        const r = await t.page.evaluate(RUN(sc, seed, who));
        const tag = sc + ' Spieler ' + who + ': ';
        t.eq(r.pz, [who, who], tag + 'der Zurueckgebliebene sitzt ein, auf Host und Client');
        t.eq(r.msg, [true, true], tag + 'die Ergebnisseite nennt es als eigene Zeile unter dem Titel (nicht als letzte Zeile der Liste), auf Host und Client');
        t.eq(r.next, ['prison', 'prison'], tag + 'der naechste Auftrag ist der Gefaengnisausbruch');
        t.eq(r.pzNow, [who, who], tag + 'Host und Client kennen den Gefangenen');
      }
    },
  },
];
