// Team-Leiste (Tills Wunsch als Host: in den Menues, im Shop und zwischen den Spielen, keine Uebersicht, was die Mitspieler machen): Am oberen Rand steht im Coop in Shop, Auftragswahl und Ergebnis
// eine Leiste mit jedem Spieler und seinem Status (Lobby, im Spiel, sieht Ergebnis, kauft ein, bereit, waehlt Auftrag) und rechts "bereit x/y". Jeder meldet seinen Bildschirm (curAt, atSync, Nachricht at),
// der Host traegt es in roster[].at ein und verteilt die Liste (VER 20). Dazu: Der Host sieht beim Verlassen "Raum schliessen" statt "Raum verlassen" (das Verlassen beendet den Raum fuer alle).
async function setup(t) {
  await t.loadTool('loopnet.js');
  await t.loadInpage('coop.js');
  await t.loadInpage('menu.js');
  await t.loadInpage('overlap.js');
}

// Spiel zu dritt oder viert, lautlos gewonnen (alle mit Beute auf dem Spawn), alle sehen das Ergebnis
const WIN = `(n) => { const G = CT.mkGame('bank', 321, n), A = G.A; ['Anna-Lena', 'Bo', 'Cyrill-Max', 'Dagmar'].forEach((x, i) => G.insts[i] && G.insts[i].setName(x)); G.run(1);
  A.get().players.forEach(p => { p.units = 1; p.loot = 20000; }); G.run(3); return G; }`;

module.exports = [
  {
    name: 'Team-Leiste: jeder meldet seinen Bildschirm, der Host verteilt ihn (Ergebnis, Shop, bereit, Auftragswahl, Spiel)',
    async run(t) {
      await setup(t);
      const r = await t.page.evaluate(`(() => { const G = (${WIN})(3), [A, B, C] = G.insts, o = {}, at = d => d.NET.roster.map(r => r.at || '-').join(''), rdy = d => d.NET.roster.map(r => r.rdy ? 1 : 0).join('');
        G.run(1); o.ende = [at(A), at(B), at(C)];
        MT.k(B, 'Enter'); MT.k(B, 'Enter'); G.run(1); o.bImShop = [at(A), at(B), at(C)];
        MT.k(B, 'Enter'); G.run(1); o.bBereit = [at(A), rdy(A), rdy(C)];
        MT.k(A, 'Enter'); MT.k(A, 'Enter'); G.run(1); o.hostImShop = [at(A), at(C)];
        MT.k(C, 'Enter'); MT.k(C, 'Enter'); MT.k(C, 'Enter'); G.run(1); o.alleBereit = [at(A), rdy(A), rdy(B)];
        MT.k(A, 'Enter'); G.run(1); o.auftrag = [A.state().scr, at(A), at(B), at(C)];
        MT.k(A, 'Enter'); G.run(1.5); o.spiel = [A.state().scr, at(A), at(B), at(C)];
        return o; })()`);
      t.eq(r.ende, ['eee', 'eee', 'eee'], 'alle sehen das Ergebnis, bei Host und Clients dieselbe Liste');
      t.eq(r.bImShop, ['ese', 'ese', 'ese'], 'Bo ist im Shop, die anderen noch beim Ergebnis');
      t.eq(r.bBereit[1], '010', 'Bo ist bereit (Host sieht es)'); t.eq(r.bBereit[2], '010', 'Cyrill-Max sieht es auch');
      t.eq(r.hostImShop, ['sse', 'sse'], 'Host und Bo im Shop, Cyrill-Max noch beim Ergebnis');
      t.eq(r.alleBereit, ['sss', '011', '011'], 'Cyrill-Max ist im Shop, bereit sind Bo und Cyrill-Max (bei Host und Clients gleich)');
      t.eq(r.auftrag[0], 'mission', 'Enter im Shop oeffnet die Auftragswahl'); t.eq(r.auftrag.slice(1), ['mss', 'mss', 'mss'], 'der Host waehlt den Auftrag, die anderen warten im Shop');
      t.eq(r.spiel[0], 'play', 'Start'); t.eq(r.spiel.slice(1), ['ppp', 'ppp', 'ppp'], 'alle im Spiel');
    },
  },
  {
    name: 'Team-Leiste: gezeichnet in Shop, Auftragswahl und Ergebnis (nur Coop), mit Name, Status und bereit x/y, ohne Ueberlappung',
    async run(t) {
      await setup(t);
      const r = await t.page.evaluate(`(() => { const G = (${WIN})(4), [A, B, C, D] = G.insts, o = {};
        const has = (d, re) => OV.drawn(d).some(s => re.test(s));
        o.ergebnis = [has(A, /^Anna-Lena$/), has(A, /sieht Ergebnis/), has(A, /^bereit 0\\/3$/)];
        // Vergleich mit und ohne Leiste: die Leiste darf nichts treffen (andere Texte, Kacheln), alles im Bild
        const diff = (d, tag) => { const w = OV.boxes(d), saved = d.NET.roster; d.NET.roster = [saved[0]]; const wo = OV.boxes(d); d.NET.roster = saved;
          const key = b => b.s + '|' + Math.round(b.x0) + '|' + Math.round(b.y0), seen = new Set(wo.texts.map(key)), strip = w.texts.filter(b => !seen.has(key(b))), rest = w.texts.filter(b => seen.has(key(b))), bad = [];
          if (!strip.length) bad.push('keine Leiste gezeichnet');
          const hit = (a, b) => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;
          for (const a of strip) { if (a.x0 < 0 || a.x1 > 960 || a.y0 < 0 || a.y1 > 40) bad.push('ausserhalb: ' + a.s); for (const b of rest) if (hit(a, b)) bad.push(a.s + ' trifft ' + b.s); for (const q of w.tiles) if (hit(a, q)) bad.push(a.s + ' trifft Kachel ' + q.id); }
          return bad.length ? [tag, bad.slice(0, 4)] : null; };
        const bad = []; const push = x => { if (x) bad.push(x); };
        push(diff(A, 'Ergebnis Seite 1')); MT.k(A, 'ArrowRight'); push(diff(A, 'Ergebnis Seite 2'));
        [A, B, C, D].forEach(d => { MT.k(d, 'Enter'); MT.k(d, 'Enter'); }); G.run(1);
        push(diff(A, 'Shop Host')); push(diff(B, 'Shop Client'));
        o.shop = [has(A, /^Anna-Lena$/), has(A, /bereit/), has(B, /^bereit 3\\/3$/) || has(B, /^bereit \\d\\/3$/)];
        MT.k(A, 'Enter'); G.run(.5); push(diff(A, 'Auftragswahl Host')); o.mission = [A.state().scr, has(A, /wählt Auftrag/), has(B, /wählt Auftrag/)];
        o.bad = bad;
        // Solo und Lobby: keine Leiste
        const net = LoopNet(30, 0), S = MT.solo(net); MT.adv(S, 1); MT.k(S, 'Enter'); MT.k(S, 'Escape'); o.solo = OV.drawn(S).some(s => /bereit \\d\\/\\d|sieht Ergebnis|kauft ein/.test(s));
        return o; })()`);
      t.eq(r.ergebnis, [true, true, true], 'Ergebnis zeigt Name, Status und bereit 0/3');
      t.eq(r.bad, [], 'Leiste trifft nichts und liegt im oberen Rand');
      t.eq(r.shop[0], true, 'Shop zeigt die Leiste'); t.eq(r.shop[2], true, 'der Client sieht bereit x/3');
      t.eq(r.mission, ['mission', true, true], 'Auftragswahl: Host und Client lesen "waehlt Auftrag"');
      t.eq(r.solo, false, 'Solo hat keine Leiste');
    },
  },
  {
    name: 'Team-Leiste: ein Mitspieler geht, die Leiste verliert ihn; Host liest Raum schliessen, Client Raum verlassen (Rueckfrage in der Pause)',
    async run(t) {
      await setup(t);
      const r = await t.page.evaluate(`(() => { const G = (${WIN})(3), [A, B, C] = G.insts, o = {};
        [A, B, C].forEach(d => { MT.k(d, 'Enter'); MT.k(d, 'Enter'); }); G.run(1);
        o.vorher = OV.drawn(A).filter(s => /^(Anna-Lena|Bo|Cyrill-Max)$/.test(s)).length;
        C.leaveGame(''); G.run(1.5); o.nachher = [A.NET.roster.length, OV.drawn(A).some(s => /^Cyrill-Max$/.test(s)), OV.drawn(A).some(s => /^bereit \\d\\/1$/.test(s))];
        // Pause im Coop: Raum schliessen (Host) und Raum verlassen (Client)
        MT.k(A, 'Enter'); MT.k(A, 'Enter'); MT.k(A, 'Enter'); G.run(1.5);   // Shop, Auftragswahl, Hinweis Nicht alle sind bereit, trotzdem starten
        o.scr = A.state().scr; A.get().players.forEach(p => { p.hp = 1e9; });
        const pause = d => { d.cv.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); MT.k(d, 'q'); G.run(.1); const t = OV.drawn(d); MT.k(d, 'Escape'); MT.k(d, 'Escape'); return t; };
        o.hostPause = pause(A).filter(s => /RAUM|Raum|verlassen|schließen/.test(s)); o.clientPause = pause(B).filter(s => /RAUM|Raum|verlassen|schließen/.test(s));
        return o; })()`);
      t.eq(r.scr, 'play', 'die naechste Runde laeuft');
      t.ok(r.vorher >= 3, 'vorher drei Namen in der Leiste (und im Kasten): ' + r.vorher);
      t.eq(r.nachher, [2, false, true], 'danach zwei Spieler, Cyrill-Max ist aus der Leiste, bereit x/1');
      t.ok(r.hostPause.includes('RAUM SCHLIESSEN') && r.hostPause.includes('Ja, Raum schließen'), 'Host: ' + JSON.stringify(r.hostPause));
      t.ok(r.clientPause.includes('RAUM VERLASSEN') && r.clientPause.includes('Ja, verlassen'), 'Client: ' + JSON.stringify(r.clientPause));
    },
  },
];
