// Ticket 263 (Coop-Log build 334): Nach einer verlorenen Runde (Serie beendet, weder Sieg noch soft) startete sofort wieder die Bank. Erwartet ist die Auftragswahl: Host in der Auftragswahl der Lobby,
// Clients in der Lobby (wie bei einem Serien-Neustart), Solo in der Auftragswahl vom Titel. Siege gehen weiter ueber Shop und Auftragswahl, soft (Auftrag gescheitert, Serie laeuft) ueber den Shop.
module.exports = [
  {
    name: 'Niederlage: nach dem Ergebnis steht die Auftragswahl offen (Solo, Coop Host in der Auftragswahl, Client in der Lobby), kein automatischer Neustart; Sieg geht in den Shop',
    async run(t) {
      await t.loadTool('loopnet.js'); await t.loadInpage('coop.js'); await t.loadInpage('menu.js');
      const r = await t.page.evaluate(`(() => { const o = {};
        const pages = d => { for (let i = 0; i < 8 && d.get().ended && d.state().scr !== 'shop'; i++) { MT.k(d, 'Enter'); } };
        // Coop: zwei Spieler, der Host verliert
        const G = CT.mkGame('bank', 321, 2, 40, 0), A = G.A, B = G.clients[0]; G.run(1); const sd0 = A.get().mapSeed;
        A.finish(false, 'Gefasst'); G.run(1); o.endeA = !!A.get().ended; pages(A); G.run(2);
        o.coop = { host: A.state().scr, client: B.state().scr, rundeNeu: A.state().scr === 'play', round: A.SESSION.round };
        // Sieg: Shop
        const H = CT.mkGame('bank', 322, 2, 40, 0), A2 = H.A; H.run(1); A2.setSecured(1000); A2.finish(true, 'x'); H.run(1); pages(A2); H.run(1); o.sieg = A2.state().scr;
        // Solo
        const S = CT.mkGame('bank', 323, 1, 40, 0), A3 = S.A; S.run(1); A3.finish(false, 'Gefasst'); S.run(1); pages(A3); S.run(1); o.solo = A3.state().scr;
        return o; })()`);
      t.note(JSON.stringify(r));
      t.ok(r.endeA, 'Ergebnis der verlorenen Runde da');
      t.eq(r.coop.host, 'mission', 'Host steht in der Auftragswahl');
      t.eq(r.coop.client, 'lobby', 'Client steht in der Lobby und wartet');
      t.ok(!r.coop.rundeNeu, 'keine neue Runde gestartet');
      t.eq(r.sieg, 'shop', 'nach einem Sieg geht es in den Shop');
      t.eq(r.solo, 'mission', 'Solo: nach der Niederlage Auftragswahl');
      if (t.page.errors && t.page.errors.length) t.ok(false, 'JS-Fehler: ' + t.page.errors.slice(0, 2).join(' | '));
    },
  },
];
