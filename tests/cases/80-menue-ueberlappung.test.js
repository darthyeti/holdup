// Ueberlappungs-Waechter fuer die Menues (Tills Feedback aus dem Coop: im Raum und zwischen den Partien ueberlagern sich Menues und der Status der Mitspieler).
// Fuer jeden Bildschirm zeichnet inpage/overlap.js einmal und prueft, ob Text, der vor den Kacheln gezeichnet wird (Titel, Hinweise, Statuszeilen), eine Kachel, anderen Text
// oder den Bildrand trifft, und ob zwei Kacheln aufeinander liegen. Geprueft werden Lobby (1 bis 4 Spieler, Host und Client), Shop (Coop 2 bis 4, mit Hinweis), Auftragswahl,
// Ergebnis (beide Seiten, Sieg und Niederlage), Pause im Coop sowie Hub und Raumcode mit Meldung. Dazu: Unter dem Ergebnis wird kein HUD gezeichnet (Team-Liste und Banner
// legten sich ueber Titel und Zeilen), unter der Pause bleibt das HUD, aber ohne Banner.
async function setup(t) {
  await t.loadTool('loopnet.js');
  await t.loadInpage('coop.js');
  await t.loadInpage('menu.js');
  await t.loadInpage('overlap.js');
}

module.exports = [
  {
    name: 'Ueberlappung: Lobby mit 1 bis 4 Spielern (Host und Client), Hub und Raumcode mit Meldung',
    async run(t) {
      await setup(t);
      const r = await t.page.evaluate(() => {
        const out = {}, chk = (d, tag) => { const o = OV.check(d); if (o.length) out[tag] = o; };
        for (let n = 1; n <= 4; n++) {
          const net = LoopNet(30, 0), all = [], names = ['Anna-Lena', 'Bo', 'Cyrill-Max', 'Dagmar'];
          for (let i = 0; i < n; i++) { const d = mkInst(net, 'p' + i); d.setName(names[i]); all.push(d); }
          const run = s => { for (let i = 0; i < s * 60; i++) step(all, net, 1 / 60); };
          all[0].hostRoom(); run(.5);
          for (let i = 1; i < n; i++) { all[i].joinRoom(all[0].NET.code); run(1.5); }
          run(1);
          all.forEach((d, i) => chk(d, 'lobby ' + n + ' Spieler, ' + (i ? 'Client ' + i : 'Host') + ' (' + d.state().scr + ')'));
          if (n >= 2) { MT.k(all[0], 't'); chk(all[0], 'Auftragswahl aus der Lobby, Host'); }
        }
        const net = LoopNet(30, 0), d = MT.solo(net);
        MT.click(d, 'coop'); d.NET.msg = 'Raum wird erstellt ...'; chk(d, 'Coop-Hub mit Meldung');
        MT.click(d, 'join'); MT.type(d, 'ab'); d.NET.msg = 'Raum nicht gefunden. Code pruefen oder den Host bitten, den Raum offen zu lassen.'; chk(d, 'Raumcode mit Meldung');
        return out;
      });
      t.eq(r, {}, 'Fundstellen');
    },
  },
  {
    name: 'Ueberlappung: Shop und Auftragswahl im Coop (2 bis 4 Spieler, mit Hinweis Nicht alle sind bereit), Host und Client',
    async run(t) {
      await setup(t);
      const r = await t.page.evaluate(() => {
        const out = {}, chk = (d, tag) => { const o = OV.check(d); if (o.length) out[tag] = o; };
        for (let n = 2; n <= 4; n++) {
          const G = CT.mkGame('bank', 321, n), A = G.A, names = ['Anna-Lena', 'Bo', 'Cyrill-Max', 'Dagmar'];
          G.insts.forEach((d, i) => d.setName(names[i])); G.run(1);
          A.get().players.forEach(p => { p.units = 1; p.loot = 20000; }); G.run(3);
          G.insts.forEach(d => { MT.k(d, 'Enter'); MT.k(d, 'Enter'); }); G.run(.5);
          G.insts.forEach((d, i) => chk(d, 'Shop ' + n + ' Spieler, ' + (i ? 'Client ' + i : 'Host') + ' (' + d.state().scr + ')'));
          if (n > 2) G.insts[1].SESSION.wallet = 0;
          MT.k(A, 'Enter'); G.run(.2); chk(A, 'nach Enter im Shop, Host (' + A.state().scr + ')');
          MT.k(A, 'Enter'); G.run(.2); chk(A, 'nach zweitem Enter, Host (' + A.state().scr + ')');
          G.insts.slice(1).forEach((d, i) => chk(d, 'Client ' + (i + 1) + ' waehrend der Host waehlt (' + d.state().scr + ')'));
        }
        return out;
      });
      t.eq(r, {}, 'Fundstellen');
    },
  },
  {
    name: 'Ueberlappung: Ergebnis (Sieg und Niederlage, beide Seiten) und Pause im Coop mit laufendem Banner',
    async run(t) {
      await setup(t);
      const r = await t.page.evaluate(() => {
        const out = {}, chk = (d, tag) => { const o = OV.check(d); if (o.length) out[tag] = o; };
        // Niederlage zu viert mit Auszeichnungen
        let G = CT.mkGame('bank', 321, 4), A = G.A, C = G.clients[0];
        ['Anna-Lena', 'Bo', 'Cyrill-Max', 'Dagmar'].forEach((n, i) => G.insts[i].setName(n)); G.run(1);
        const P = A.get().players; P[0].st.k = 5; P[1].st.k = 5; P[2].st.idle = 99; P[3].st.dn = 3; P[0].st.sec = 5000;
        A.startHeist(false, P[1]); G.run(.3);
        A.cv.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); G.run(.1);
        chk(A, 'Pause im Coop mit Banner');
        { const b = A.msgs().banner, dr = OV.drawn(A); if (!b) out['Pause: Banner fehlt im Test'] = [String(b)]; else if (dr.includes(b)) out['Banner unter der Pause'] = [b]; if (!dr.includes('ARMOR')) out['Pause: HUD bleibt sichtbar'] = ['ARMOR fehlt']; }
        A.cv.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); G.run(.1);
        P.forEach(p => { p.hp = 0; }); G.run(2);
        for (const [d, w] of [[A, 'Host'], [C, 'Client']]) { if (OV.drawn(d).includes('ARMOR')) out['HUD unter dem Ergebnis, ' + w] = ['ARMOR']; }
        for (const [d, w] of [[A, 'Host'], [C, 'Client']]) { chk(d, 'Ergebnis Niederlage Seite 1, ' + w); MT.k(d, 'ArrowRight'); chk(d, 'Ergebnis Niederlage Seite 2, ' + w); }
        // Sieg zu zweit (lautlos), alle Zeilen
        G = CT.mkGame('bank', 321, 2); A = G.A; const Q = A.get().players;
        Q[0].units = 1; Q[0].loot = 30000; G.run(1); Q[1].units = 1; Q[1].loot = 10000; G.run(2);
        chk(A, 'Ergebnis Sieg Seite 1'); MT.k(A, 'ArrowRight'); chk(A, 'Ergebnis Sieg Seite 2');
        // Solo
        const net = LoopNet(30, 0), d = MT.solo(net);
        d.startGame(); d.setFocus(true); d.startHeist(false); MT.adv(d, .5); d.get().me.hp = 0; d.update(1 / 30); chk(d, 'Ergebnis solo');
        return out;
      });
      t.eq(r, {}, 'Fundstellen');
    },
  },
  {
    name: 'Ueberlappung: Fenster Anleitung und Optionen (Text gegen Text und Kacheln)',
    async run(t) {
      await setup(t);
      const r = await t.page.evaluate(() => {
        const out = {}, net = LoopNet(30, 0), d = MT.solo(net), chk = (tag) => { const o = OV.check(d, { modal: true }); if (o.length) out[tag] = o; };
        MT.adv(d, 1); MT.k(d, '?'); if (d.ui().modal() !== 'help') out['Anleitung fehlt'] = [String(d.ui().modal())]; chk('Anleitung'); MT.k(d, 'Escape');
        MT.k(d, 'o'); if (d.ui().modal() !== 'options') out['Optionen fehlen'] = [String(d.ui().modal())]; chk('Optionen'); MT.k(d, 'Escape');
        return out;
      });
      t.eq(r, {}, 'Fundstellen');
    },
  },
];
