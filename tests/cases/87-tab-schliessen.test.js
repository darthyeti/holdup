// Abfrage beim Schliessen des Tabs (Till, 21. Oktober 2026): Wer als Host Mitspieler im Raum hat, bekommt beim Schliessen oder Neuladen die Standard-Abfrage des Browsers (beforeunload mit preventDefault).
// Ohne Mitspieler, solo und als Client gibt es keine Abfrage. Getrennt wird erst beim Verlassen der Seite (pagehide), nicht schon bei der Abfrage, sonst haette ein "Bleiben" die Verbindungen schon gekappt.
async function setup(t) {
  await t.loadTool('loopnet.js');
  await t.loadInpage('coop.js');
  await t.loadInpage('menu.js');
}

// Raum mit n Spielern in der Lobby (kein Start)
const LOBBY = `(n) => { const net = LoopNet(30, 0), all = []; for (let i = 0; i < n; i++) { const d = mkInst(net, 'p' + i); d.setName(['Anna-Lena', 'Bo', 'Cyrill-Max', 'Dagmar'][i]); all.push(d); }
  const run = s => { for (let i = 0; i < s * 60; i++) step(all, net, 1 / 60); }; all[0].hostRoom(); run(.5); for (let i = 1; i < n; i++) { all[i].joinRoom(all[0].NET.code); run(1.5); } run(1); return { all, run }; }`;
// Ein beforeunload-Ereignis wie vom Browser: abbrechbar, true heisst "Abfrage wird gezeigt"
const EV = `() => { const e = new Event('beforeunload', { cancelable: true }); window.dispatchEvent(e); return e.defaultPrevented; }`;

module.exports = [
  {
    name: 'Tab schliessen: Host mit Mitspielern wird gefragt, allein oder nach dem Gehen der Mitspieler nicht; die Abfrage allein trennt noch niemanden',
    async run(t) {
      await setup(t);
      const r = await t.page.evaluate(`(() => { const o = {}, ev = (${EV});
        o.leer = ev();                                  // noch kein Raum, Titel
        const S = (${LOBBY})(1); o.hostAllein = ev();   // Host allein im Raum
        const L = (${LOBBY})(3), [A, B, C] = L.all;     // zweiter Raum mit zwei Mitspielern
        o.mitMitspielern = ev(); L.run(1);
        o.nachAbfrage = [A.NET.conns.length, B.state().scr, C.state().scr];   // die Abfrage trennt nichts
        MT.k(B, 'Escape'); MT.k(C, 'Escape'); L.run(1);
        o.nachDemGehen = [ev(), A.NET.conns.length];
        return o; })()`);
      t.eq(r.leer, false, 'ohne Raum keine Abfrage');
      t.eq(r.hostAllein, false, 'Host allein im Raum: keine Abfrage');
      t.eq(r.mitMitspielern, true, 'Host mit zwei Mitspielern: Abfrage');
      t.eq(r.nachAbfrage, [2, 'lobby', 'lobby'], 'die Abfrage trennt niemanden');
      t.eq(r.nachDemGehen, [false, 0], 'gehen beide Mitspieler, fragt der Host nicht mehr');
    },
  },
  {
    name: 'Tab schliessen: Beim Verlassen der Seite (pagehide) schliesst der Host den Raum und trennt alle Verbindungen',
    async run(t) {
      await setup(t);
      const r = await t.page.evaluate(`(() => { const o = {}, L = (${LOBBY})(3), [A, B, C] = L.all;
        o.vorher = [A.state().role, B.state().scr, C.state().scr];
        window.dispatchEvent(new Event('pagehide')); L.run(1);
        o.nachher = [A.state().role, A.NET.conns.length];   // alle Instanzen teilen hier ein window, ob die Clients auf dem Titel landen, zeigt der Test der Rueckfrage (85)
        return o; })()`);
      t.eq(r.vorher, ['host', 'lobby', 'lobby'], 'Raum steht');
      t.eq(r.nachher, ['solo', 0], 'pagehide schliesst den Raum und kappt alle Verbindungen');
    },
  },
];
