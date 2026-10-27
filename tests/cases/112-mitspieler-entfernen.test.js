// Paket P6, B7 (Tills Wunsch nach dem Coop-Test vom 26. Oktober 2026: ein inaktiver Mitspieler, der Host musste den Raum neu eroeffnen): Der Host kann jederzeit Mitspieler entfernen.
// Eine Kachel "Mitspieler" (nur Host mit mindestens einem Mitspieler) oeffnet in Lobby, Pause, Shop, Auftragswahl und Ergebnis die Liste, ein Klick fragt zurueck, Ja schickt kick und trennt.
// Der Entfernte landet auf dem Titel. In Lobby und Shop verschwindet er aus der Liste, im Spiel steht er auf gone ("wurde entfernt"). Clients koennen nicht entfernen.
async function setup(t) {
  await t.loadTool('loopnet.js');
  await t.loadInpage('coop.js');
  await t.loadInpage('menu.js');
  await t.loadInpage('overlap.js');
}
const LOBBY = `(n) => { const net = LoopNet(30, 0), all = []; for (let i = 0; i < n; i++) { const d = mkInst(net, 'p' + i); d.setName(['Anna-Lena', 'Bo', 'Cyrill-Max', 'Dagmar'][i]); all.push(d); }
  const run = s => { for (let i = 0; i < s * 60; i++) step(all, net, 1 / 60); }; all[0].hostRoom(); run(.5); for (let i = 1; i < n; i++) { all[i].joinRoom(all[0].NET.code); run(1.5); } run(1); return { all, run }; }`;
const WIN = `(n) => { const G = CT.mkGame('bank', 321, n), A = G.A; ['Anna-Lena', 'Bo', 'Cyrill-Max', 'Dagmar'].forEach((x, i) => G.insts[i] && G.insts[i].setName(x)); G.run(1);
  A.get().players.forEach(p => { p.units = 1; p.loot = 20000; }); G.run(3); return G; }`;

module.exports = [
  {
    name: 'Mitspieler entfernen in der Lobby: Kachel nur beim Host, Liste, Rueckfrage, Ja trennt den Gewaehlten (Titel), der andere bleibt, die Liste schrumpft bei allen; Fenster ueberlappen nichts',
    async run(t) {
      await setup(t);
      const r = await t.page.evaluate(`(() => { const o = {}, L = (${LOBBY})(3), [A, B, C] = L.all, ids = d => d.ui().tiles().map(q => q.id);
        o.kachel = [ids(A).includes('kick'), ids(B).includes('kick')]; o.layoutLobby = OV.check(A, {});
        MT.click(A, 'kick'); o.liste = ids(A).filter(s => /^kk:/.test(s)); o.m1 = A.ui().modal(); o.layout1 = OV.check(A, { modal: true }); o.text1 = OV.drawn(A).filter(s => /ENTFERNEN|TEILNEHMER|Bo|Cyrill/.test(s));
        MT.click(A, 'kk:1'); o.m2 = A.ui().modal(); o.text2 = OV.drawn(A).filter(s => /entfernt|ENTFERNEN/.test(s)); o.layout2 = OV.check(A, { modal: true });
        MT.click(A, 'no'); o.zurueck = [A.ui().modal(), ids(A).filter(s => /^kk:/.test(s))]; MT.click(A, 'kk:1'); MT.click(A, 'yes'); L.run(1.5);
        o.scr = [A.state().scr, B.state().scr, C.state().scr]; o.roles = [A.state().role, B.state().role, C.state().role];
        o.rosterA = A.NET.roster.map(r => r.id); o.rosterC = C.NET.roster.map(r => r.id); o.modal = A.ui().modal();
        return o; })()`);
      t.eq(r.kachel, [true, false], 'die Kachel Mitspieler gibt es nur beim Host');
      t.eq(r.layoutLobby, [], 'Lobby mit Kachel ueberlappt nichts');
      t.eq(r.m1, 'kick', 'der Klick oeffnet die Liste'); t.eq(r.liste, ['kk:1', 'kk:2'], 'eine Kachel je Mitspieler');
      t.eq(r.layout1, [], 'Liste ueberlappt nichts'); t.ok(r.text1.some(s => /ENTFERNEN|TEILNEHMER/.test(s)), 'Titel der Liste: ' + JSON.stringify(r.text1));
      t.eq(r.m2, 'confirm', 'ein Klick fragt zurueck'); t.ok(r.text2.some(s => /Bo wird aus dem Raum entfernt/.test(s)), 'die Frage nennt den Namen: ' + JSON.stringify(r.text2)); t.eq(r.layout2, [], 'Rueckfrage ueberlappt nichts');
      t.eq(r.zurueck, ['kick', ['kk:1', 'kk:2']], 'Zurueck in der Rueckfrage fuehrt zur Liste');
      t.eq(r.scr, ['lobby', 'title', 'lobby'], 'der Gewaehlte landet auf dem Titel, die anderen bleiben in der Lobby');
      t.eq(r.roles, ['host', 'solo', 'client'], 'Rollen danach');
      t.eq(r.rosterA, [0, 2], 'die Liste des Hosts'); t.eq(r.rosterC, [0, 2], 'die Liste des anderen Clients'); t.eq(r.modal, null, 'kein Fenster mehr offen');
    },
  },
  {
    name: 'Mitspieler entfernen im Spiel: Pause-Menue mit der Kachel, Ja setzt den Spieler auf gone mit Meldung "wurde entfernt", der Client sieht den Titel, die Runde laeuft weiter',
    async run(t) {
      await setup(t);
      const r = await t.page.evaluate(`(() => { const o = {}, G = CT.mkGame('bank', 321, 3), [A, B, C] = G.insts, ids = d => d.ui().tiles().map(q => q.id);
        G.run(1); MT.k(A, 'p'); G.run(.2); o.pause = [A.state().paused, ids(A).includes('kick'), ids(B).includes('kick')]; o.layout = OV.check(A, {});
        MT.click(A, 'kick'); MT.click(A, 'kk:2'); MT.click(A, 'yes'); G.run(.3); o.feed = OV.drawn(A).some(s => /wurde entfernt/.test(s)); G.run(.3);
        const p = A.get().players; o.gone = [p[1].gone, p[2].gone, p[2].dc]; o.scr = [B.state().scr, C.state().scr];
        MT.click(A, 'resume'); G.run(6); o.weiter = [A.state().scr, !!A.get().ended, A.get().players[1].gone];
        // zweiter Entfernen-Weg: auch der letzte Mitspieler laesst sich entfernen, der Host spielt allein weiter
        MT.k(A, 'p'); G.run(.2); MT.click(A, 'kick'); MT.click(A, 'kk:1'); MT.click(A, 'yes'); G.run(.6); o.letzte = [B.state().scr, A.get().players[1].gone, A.state().scr, A.ui().tiles().some(q => q.id === 'kick')];
        return o; })()`);
      t.eq(r.pause, [true, true, false], 'Pause-Menue: Kachel nur beim Host'); t.eq(r.layout, [], 'Pause-Menue ueberlappt nichts');
      t.eq(r.gone, [false, true, true], 'Spieler 2 ist gone, Spieler 1 nicht'); t.ok(r.feed, 'Meldung "wurde entfernt" in den Meldungen');
      t.eq(r.scr, ['play', 'title'], 'der Entfernte sieht den Titel, der andere spielt weiter');
      t.eq(r.weiter[0], 'play', 'die Runde laeuft weiter'); t.eq(r.weiter[2], false, 'der Verbliebene ist nicht gone');
      t.eq(r.letzte.slice(0, 2), ['title', true], 'auch der letzte Mitspieler laesst sich entfernen'); t.eq(r.letzte[2], 'play', 'der Host bleibt im Spiel');
      t.eq(r.letzte[3], false, 'ohne Mitspieler keine Kachel mehr');
    },
  },
  {
    name: 'Mitspieler entfernen: Kachel auch auf Ergebnis, Shop und Auftragswahl (ohne Ueberlappung), im Shop verschwindet der Entfernte aus der Liste; Clients und Host koennen sich nicht gegenseitig oder selbst entfernen',
    async run(t) {
      await setup(t);
      const r = await t.page.evaluate(`(() => { const o = {}, G = (${WIN})(3), [A, B, C] = G.insts, ids = d => d.ui().tiles().map(q => q.id);
        o.ergebnis = [A.state().scr, !!A.get().ended, ids(A).includes('kick'), ids(B).includes('kick')]; o.layoutE = OV.check(A, {});
        MT.k(A, 'Enter'); G.run(.3); o.seite2 = [ids(A).includes('kick'), OV.check(A, {})];   // Seite 2 des Ergebnisses (Auszeichnungen)
        [A, B, C].forEach(d => { MT.k(d, 'Enter'); }); MT.k(B, 'Enter'); MT.k(C, 'Enter'); G.run(1);
        o.shop = [A.state().scr, ids(A).includes('kick'), ids(B).includes('kick')]; o.layoutS = OV.check(A, {});
        MT.click(A, 'kick'); MT.click(A, 'kk:2'); MT.click(A, 'yes'); G.run(1.5);
        o.nachShop = [C.state().scr, A.NET.roster.map(r => r.id), A.state().scr, B.NET.roster.map(r => r.id)];
        MT.click(A, 'next'); G.run(.5); o.auftrag = [A.state().scr, ids(A).includes('kick')]; o.layoutM = OV.check(A, {});
        o.nein = [B.kickPlayer(0), B.kickPlayer(2), A.kickPlayer(0), A.kickPlayer(7), A.NET.roster.length];
        return o; })()`);
      t.eq(r.ergebnis, ['play', true, true, false], 'Ergebnis: Kachel nur beim Host'); t.eq(r.layoutE, [], 'Ergebnis mit Kachel ueberlappt nichts');
      t.eq(r.seite2, [true, []], 'Ergebnis, Seite 2: Kachel da, nichts ueberlappt');
      t.eq(r.shop, ['shop', true, false], 'Shop: Kachel nur beim Host'); t.eq(r.layoutS, [], 'Shop mit Kachel ueberlappt nichts');
      t.eq(r.nachShop[0], 'title', 'der Entfernte sieht den Titel'); t.eq(r.nachShop[1], [0, 1], 'im Shop verschwindet er aus der Liste'); t.eq(r.nachShop[2], 'shop', 'der Host bleibt im Shop'); t.eq(r.nachShop[3], [0, 1], 'der andere Client sieht dieselbe Liste');
      t.eq(r.auftrag, ['mission', true], 'Auftragswahl: Kachel da'); t.eq(r.layoutM, [], 'Auftragswahl mit Kachel ueberlappt nichts');
      t.eq(r.nein, [false, false, false, false, 2], 'Clients koennen nicht entfernen, der Host nicht sich selbst und keine unbekannte Kennung');
    },
  },
];
