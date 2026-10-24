// Alarm-Meldung im Coop (Tills Wunsch aus den Coop-Runden): Wer die Waffe zieht oder den Alarm ausloest, steht fuer alle im Banner und im Meldungsfeld.
// Solo bleibt ohne Namen. Die Meldung laeuft ueber say und ban (evt), also ohne neues Netzformat.
async function setup(t) {
  await t.loadTool('loopnet.js');
  await t.loadInpage('coop.js');
}

module.exports = [
  {
    name: 'Alarm: Client zieht die Waffe, Host und Client lesen seinen Namen',
    async run(t) {
      await setup(t);
      const r = await t.page.evaluate(() => {
        const G = CT.mkGame('bank', 321, 2), A = G.A, B = G.clients[0];
        B.cv.dispatchEvent(new KeyboardEvent('keydown', { key: 'f', bubbles: true }));
        G.run(2);
        return { a: A.msgs(), b: B.msgs(), phase: [A.get().phase, B.get().phase] };
      });
      t.eq(r.phase, [2, 2], 'Ueberfall laeuft');
      for (const k of ['a', 'b']) {
        t.ok(r[k].feed.includes('Blau hat die Waffe gezogen: Überfall!'), k + ': Meldung mit dem Namen des Clients: ' + JSON.stringify(r[k].feed));
        t.eq(r[k].banner, 'Blau: ÜBERFALL! ALLE AUF DEN BODEN!', k + ': Banner');
      }
    },
  },
  {
    name: 'Alarm: Host zieht die Waffe, der Client liest den Namen des Hosts',
    async run(t) {
      await setup(t);
      const r = await t.page.evaluate(() => {
        const G = CT.mkGame('bank', 321, 2), A = G.A, B = G.clients[0];
        A.cv.dispatchEvent(new KeyboardEvent('keydown', { key: 'f', bubbles: true }));
        G.run(2);
        return { b: B.msgs() };
      });
      t.ok(r.b.feed.includes('Orange hat die Waffe gezogen: Überfall!'), 'Meldung: ' + JSON.stringify(r.b.feed));
      t.eq(r.b.banner, 'Orange: ÜBERFALL! ALLE AUF DEN BODEN!', 'Banner');
    },
  },
  {
    name: 'Alarm: entdeckter Spieler wird genannt (Verdacht erreicht 100 durch einen Spieler mit Beute im Blick der Wache)',
    async run(t) {
      await setup(t);
      const r = await t.page.evaluate(() => {
        const G = CT.mkGame('jewel', 654, 2), A = G.A, B = G.clients[0], g = A.get().npcs.find(q => q.k === 'grd');
        if (!g) return { err: 'keine Wache auf der Karte' };
        A.setSus(97);
        const p1 = A.get().players[1];
        for (let i = 0; i < 60 * 12 && A.get().phase === 1; i++) { p1.x = g.x + 50; p1.y = g.y; p1.units = 1; p1.loot = 1000; g.a = 0; p1.vx = p1.vy = 0; step(G.insts, G.net, 1 / 60); }
        G.run(1);
        return { phase: A.get().phase, a: A.msgs(), b: B.msgs() };
      });
      t.ok(!r.err, r.err);
      t.eq(r.phase, 2, 'Alarm ausgeloest');
      for (const k of ['a', 'b']) {
        t.ok(r[k].feed.includes('Blau ist aufgefallen: Alarm!'), k + ': Meldung nennt den Spieler: ' + JSON.stringify(r[k].feed));
        t.eq(r[k].banner, 'Blau: ENTDECKT! ALARM!', k + ': Banner');
      }
    },
  },
  {
    name: 'Alarm: Solo bleibt ohne Namen (Banner wie bisher)',
    async run(t) {
      const r = await t.page.evaluate(() => { __dbg.startHeist(false, __dbg.get().me); return __dbg.msgs(); });
      t.eq(r.banner, 'ÜBERFALL! ALLE AUF DEN BODEN!', 'Banner solo');
      t.ok(!r.feed.some(s => /hat die Waffe gezogen/.test(s)), 'keine Namensmeldung solo: ' + JSON.stringify(r.feed));
    },
  },
];
