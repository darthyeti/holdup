// #9: Raum aus Link oder Eingabe existiert nicht (peer-unavailable): die Lobby zeigt einen eigenen Hinweis mit Raumcode und den Kacheln Raum erstellen und Code eingeben,
// der Hash #raum= faellt weg, die Kacheln gehen mit Maus und Enter. Ein vorhandener Raum zeigt den Hinweis nicht.
const SETUP = async t => { await t.loadTool('loopnet.js'); await t.loadInpage('coop.js'); await t.loadInpage('menu.js'); };

module.exports = [
  {
    name: 'Raum fehlt: unbekannter Code ergibt den Hinweis mit zwei Kacheln, Hash weg, Code eingeben fuehrt in die Raumcode-Eingabe, Raum erstellen macht einen Raum',
    async run(t) {
      await SETUP(t);
      const r = await t.page.evaluate(() => {
        const net = LoopNet(40, 0), A = MT.solo(net, 'a'), B = MT.solo(net, 'b'), C = MT.solo(net, 'c'), all = [A, B, C], run = sec => { for (let i = 0; i < sec * 60; i++) step(all, net, 1 / 60); }, ids = d => d.ui().tiles().map(q => q.id), o = {};
        history.replaceState(null, '', '#raum=ZZZZ'); o.hash0 = location.hash;
        MT.click(A, 'coop'); MT.click(A, 'join'); MT.type(A, 'ZZZZ'); MT.click(A, 'go'); run(2);
        o.A = [A.state().scr, A.NET.gone, A.NET.msg, ids(A).includes('goneHost'), ids(A).includes('goneJoin'), ids(A).includes('start')]; o.hash1 = location.hash;
        MT.click(A, 'goneJoin'); o.join = [A.state().scr, A.NET.gone, ids(A).includes('go')];
        MT.click(A, 'back'); MT.click(A, 'join'); MT.type(A, 'ZZZZ'); MT.click(A, 'go'); run(2);
        MT.k(A, 'Enter'); o.enter = [A.state().scr, A.NET.gone];
        MT.click(A, 'back'); MT.click(A, 'join'); MT.type(A, 'ZZZZ'); MT.click(A, 'go'); run(2);
        MT.click(A, 'goneHost'); run(1); o.host = [A.state().scr, A.NET.role, A.NET.code.length, A.NET.gone];
        MT.click(B, 'coop'); MT.click(B, 'join'); MT.type(B, 'ZZZZ'); MT.click(B, 'go'); run(1);
        MT.click(B, 'goneBack'); o.back = [B.state().scr, B.NET.gone];
        MT.click(C, 'coop'); MT.click(C, 'join'); MT.type(C, A.NET.code); MT.click(C, 'go'); run(3);
        o.C = [C.state().scr, C.NET.role, C.NET.gone, ids(C).includes('goneHost')];
        return o;
      });
      t.eq(r.hash0, '#raum=ZZZZ', 'Vorbereitung: Hash gesetzt');
      t.eq(r.A, ['lobby', 'ZZZZ', '', true, true, false], 'unbekannter Code: Hinweis mit Raumcode und beiden Kacheln, keine allgemeine Meldung, keine Raumkacheln');
      t.eq(r.hash1, '', 'der Hash #raum= ist danach entfernt');
      t.eq(r.join, ['join', '', true], 'Code eingeben fuehrt in die Raumcode-Eingabe');
      t.eq(r.enter, ['join', ''], 'Enter nimmt die vorgewaehlte Kachel Code eingeben');
      t.eq(r.host, ['lobby', 'host', 4, ''], 'Raum erstellen macht einen eigenen Raum');
      t.eq(r.back, ['coop', ''], 'Zurueck geht in den Coop-Hub');
      t.eq(r.C, ['lobby', 'client', '', false], 'ein vorhandener Raum zeigt den Hinweis nicht');
    },
  },
  {
    name: 'Raum fehlt: ein alter Fehler (NET.fail) blockiert die Zeitgrenze des naechsten Beitritts nicht, netReset setzt ihn zurueck',
    async run(t) {
      await SETUP(t);
      const r = await t.page.evaluate(() => {
        const net = LoopNet(40, 0), A = MT.solo(net, 'a');
        A.NET.fail = 1; A.joinRoom('YYYY');
        return { fail: A.NET.fail, role: A.NET.role };
      });
      t.eq(r, { fail: 0, role: 'client' }, 'nach joinRoom ist NET.fail wieder 0');
    },
  },
];
