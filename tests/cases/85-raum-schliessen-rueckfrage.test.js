// Rueckfrage vor Raum schliessen (Till als Host: Esc in Lobby, Shop und Ergebnis schloss den Raum sofort und warf alle Mitspieler raus): Der Host mit verbundenen Mitspielern bekommt in Lobby, Shop und Ergebnis
// (Esc und Kachel) ein Fenster "Raum schliessen" mit der Zahl der Mitspieler. Nein oder Esc bleibt im Raum, Ja schliesst. Ohne Mitspieler, fuer Clients und solo geht es direkt wie bisher.
async function setup(t) {
  await t.loadTool('loopnet.js');
  await t.loadInpage('coop.js');
  await t.loadInpage('menu.js');
  await t.loadInpage('overlap.js');
}

// Raum mit n Spielern in der Lobby (kein Start)
const LOBBY = `(n) => { const net = LoopNet(30, 0), all = []; for (let i = 0; i < n; i++) { const d = mkInst(net, 'p' + i); d.setName(['Anna-Lena', 'Bo', 'Cyrill-Max', 'Dagmar'][i]); all.push(d); }
  const run = s => { for (let i = 0; i < s * 60; i++) step(all, net, 1 / 60); }; all[0].hostRoom(); run(.5); for (let i = 1; i < n; i++) { all[i].joinRoom(all[0].NET.code); run(1.5); } run(1); return { all, run }; }`;
// Spiel zu dritt, lautlos gewonnen, alle sehen das Ergebnis
const WIN = `(n) => { const G = CT.mkGame('bank', 321, n), A = G.A; ['Anna-Lena', 'Bo', 'Cyrill-Max', 'Dagmar'].forEach((x, i) => G.insts[i] && G.insts[i].setName(x)); G.run(1);
  A.get().players.forEach(p => { p.units = 1; p.loot = 20000; }); G.run(3); return G; }`;

module.exports = [
  {
    name: 'Rueckfrage: Host mit Mitspielern in der Lobby (Esc und Kachel), Nein bleibt im Raum, Ja schliesst und trennt die Clients; allein oder als Client geht es direkt',
    async run(t) {
      await setup(t);
      const r = await t.page.evaluate(`(() => { const o = {}, L = (${LOBBY})(3), [A, B, C] = L.all, st = d => [d.state().scr, d.state().role, d.ui().modal()];
        MT.k(A, 'Escape'); o.esc = st(A); o.text = OV.drawn(A).filter(s => /RAUM|Mitspieler|schließen/.test(s)); o.layout = OV.check(A, { modal: true });
        MT.k(A, 'Escape'); o.zu = st(A);   // Esc im Fenster schliesst nur das Fenster
        MT.click(A, 'leave'); o.kachel = st(A); MT.click(A, 'no'); o.nein = st(A); L.run(.5); o.clients = [B.state().scr, C.state().scr];
        MT.k(A, 'Escape'); MT.click(A, 'yes'); L.run(1); o.ja = st(A); o.clientsNach = [B.state().scr, C.state().scr, B.state().role];
        // Host allein: direkt
        const S = (${LOBBY})(1), H = S.all[0]; MT.k(H, 'Escape'); o.allein = [H.state().scr, H.state().role, H.ui().modal()];
        // Client verlaesst die Lobby: direkt, der Host bleibt
        const T2 = (${LOBBY})(2), [A2, B2] = T2.all; MT.k(B2, 'Escape'); T2.run(1); o.client = [B2.state().scr, A2.state().scr, A2.NET.roster.length];
        return o; })()`);
      t.eq(r.esc, ['lobby', 'host', 'confirm'], 'Esc fragt zurueck, der Raum bleibt');
      t.ok(r.text.includes('RAUM SCHLIESSEN') && r.text.some(s => /2 Mitspieler werden getrennt/.test(s)), 'Fenster nennt die Zahl der Mitspieler: ' + JSON.stringify(r.text));
      t.eq(r.layout, [], 'Fenster ueberlappt nichts');
      t.eq(r.zu, ['lobby', 'host', null], 'Esc im Fenster schliesst nur das Fenster');
      t.eq(r.kachel, ['lobby', 'host', 'confirm'], 'auch die Kachel Raum schliessen fragt');
      t.eq(r.nein, ['lobby', 'host', null], 'Nein bleibt im Raum'); t.eq(r.clients, ['lobby', 'lobby'], 'die Clients sind noch da');
      t.eq(r.ja, ['coop', 'solo', null], 'Ja schliesst den Raum'); t.eq(r.clientsNach, ['title', 'title', 'solo'], 'die Clients landen auf dem Titel');
      t.eq(r.allein, ['coop', 'solo', null], 'Host allein schliesst ohne Rueckfrage');
      t.eq(r.client, ['coop', 'lobby', 1], 'Client geht direkt, der Host bleibt im Raum');
    },
  },
  {
    name: 'Rueckfrage: Host mit Mitspielern im Shop (Esc und Kachel), Nein bleibt, Ja trennt alle; ein Client im Shop geht direkt',
    async run(t) {
      await setup(t);
      const r = await t.page.evaluate(`(() => { const o = {}, G = (${WIN})(3), [A, B, C] = G.insts, st = d => [d.state().scr, d.state().role, d.ui().modal()];
        [A, B, C].forEach(d => { MT.k(d, 'Enter'); MT.k(d, 'Enter'); }); G.run(1); o.shop = st(A);
        MT.k(A, 'Escape'); o.esc = st(A); MT.k(A, 'Escape'); o.zu = st(A);
        MT.click(A, 'back'); o.kachel = st(A); MT.click(A, 'no'); o.nein = st(A);
        // Client im Shop: direkt
        MT.k(C, 'Escape'); G.run(1); o.client = [C.state().scr, A.NET.roster.length, A.state().scr];
        MT.k(A, 'Escape'); MT.click(A, 'yes'); G.run(1); o.ja = st(A); o.clientsNach = [B.state().scr];
        return o; })()`);
      t.eq(r.shop, ['shop', 'host', null], 'Host im Shop');
      t.eq(r.esc, ['shop', 'host', 'confirm'], 'Esc fragt zurueck'); t.eq(r.zu, ['shop', 'host', null], 'Esc im Fenster schliesst nur das Fenster');
      t.eq(r.kachel, ['shop', 'host', 'confirm'], 'Kachel Raum schliessen fragt'); t.eq(r.nein, ['shop', 'host', null], 'Nein bleibt im Shop');
      t.eq(r.client, ['title', 2, 'shop'], 'Client im Shop geht direkt, der Host bleibt mit einem Mitspieler weniger');
      t.eq(r.ja, ['title', 'solo', null], 'Ja schliesst den Raum'); t.eq(r.clientsNach, ['title'], 'der verbliebene Client landet auf dem Titel');
    },
  },
  {
    name: 'Rueckfrage: Host mit Mitspielern beim Ergebnis (Esc auf Seite 1 und 2, Kachel), Nein bleibt, Ja trennt alle; solo und Client unveraendert',
    async run(t) {
      await setup(t);
      const r = await t.page.evaluate(`(() => { const o = {}, G = (${WIN})(3), [A, B, C] = G.insts, st = d => [d.state().scr, d.state().role, d.ui().modal(), !!d.get().ended];
        o.ende = st(A); MT.k(A, 'Escape'); o.seite1 = st(A); MT.k(A, 'Escape'); o.zu = st(A);
        MT.k(A, 'ArrowRight'); MT.k(A, 'Escape'); o.seite2 = st(A); MT.k(A, 'Escape');
        MT.click(A, 'endBack'); o.kachel = st(A); MT.click(A, 'no'); o.nein = st(A);
        MT.k(C, 'Escape'); G.run(1); o.client = [C.state().scr, A.state().scr];
        MT.k(A, 'Escape'); MT.click(A, 'yes'); G.run(1); o.ja = st(A); o.clientsNach = [B.state().scr];
        // solo: direkt zum Titel
        const net = LoopNet(30, 0), S = MT.solo(net); S.startGame(); S.setFocus(true); S.startHeist(false); MT.adv(S, .5); S.get().me.hp = 0; S.update(1 / 30); const e0 = !!S.get().ended; MT.k(S, 'Escape'); o.solo = [e0, S.state().scr, S.ui().modal()];
        return o; })()`);
      t.eq(r.ende, ['play', 'host', null, true], 'Host sieht das Ergebnis');
      t.eq(r.seite1, ['play', 'host', 'confirm', true], 'Esc auf Seite 1 fragt zurueck'); t.eq(r.zu, ['play', 'host', null, true], 'Esc im Fenster schliesst nur das Fenster');
      t.eq(r.seite2, ['play', 'host', 'confirm', true], 'Esc auf Seite 2 fragt zurueck');
      t.eq(r.kachel, ['play', 'host', 'confirm', true], 'Kachel Raum schliessen fragt'); t.eq(r.nein, ['play', 'host', null, true], 'Nein bleibt beim Ergebnis');
      t.eq(r.client, ['title', 'play'], 'Client geht direkt zum Titel, der Host bleibt');
      t.eq(r.ja, ['title', 'solo', null, false], 'Ja schliesst den Raum'); t.eq(r.clientsNach, ['title'], 'der verbliebene Client landet auf dem Titel');
      t.eq(r.solo, [true, 'title', null], 'solo geht direkt zum Titel');
    },
  },
];
