// Paket P6, B6 (Tills Flugschreiber-Log b163, Runde 6 auf 7: Der Host eroeffnete einen neuen Raum und behielt Konto, Ausruestung, Skills und Fahndung, die neu beigetretenen Clients hatten nichts):
// Ein neuer Raum beginnt fuer alle eine neue Serie. Der Host setzt seinen Stand zurueck, sobald der Raum steht, ein Client, sobald der Host ihn willkommen heisst (scheitert der Beitritt, bleibt sein Stand).
// Mit Stand fragt der Coop-Hub vor "Raum erstellen" und "Raum beitreten" zurueck.
async function setup(t) {
  await t.loadTool('loopnet.js');
  await t.loadInpage('coop.js');
  await t.loadInpage('menu.js');
  await t.loadInpage('overlap.js');
}
const FILL = `(d) => { const S = d.SESSION; S.wallet = 7000; S.own = { vest: 2, drill: 1, smg: 1 }; S.sk = { A0: 1, V2: 2 }; S.round = 3; S.heat = 45; S.pts = 2; S.earned = 12000; }`;
const SNAP = `(d) => { const S = d.SESSION; return { wallet: S.wallet, own: Object.keys(S.own || {}).length, sk: Object.keys(S.sk || {}).length, round: S.round, heat: S.heat, pts: S.pts, earned: S.earned }; }`;

module.exports = [
  {
    name: 'Neuer Raum, neue Serie: Der Host setzt Konto, Ausruestung, Skills, Runde und Fahndung zurueck, sobald der Raum steht; ein Client, sobald der Host ihn willkommen heisst; der Host sieht sein Grundkit',
    async run(t) {
      await setup(t);
      const r = await t.page.evaluate(`(() => { const o = {}, net = LoopNet(30, 0), A = mkInst(net, 'a'), B = mkInst(net, 'b'), all = [A, B], fill = ${FILL}, snap = ${SNAP};
        const run = s => { for (let i = 0; i < s * 60; i++) step(all, net, 1 / 60); };
        fill(A); o.vorher = snap(A);
        A.hostRoom(); run(.5); o.host = snap(A);
        fill(B); B.SESSION.heat = 0; o.bBeitritt = snap(B);   // SESSION gilt je Seite, in diesem Test teilen sich alle Instanzen eine: neu fuellen, damit nur der Client-Reset sichtbar wird
        B.joinRoom(A.NET.code); run(1.5); o.client = snap(B);
        const c = A.NET.conns[0]; o.kitHost = c && c.kit ? [c.kit.w, c.kit.vest | 0, Object.keys(c.kit.sk || {}).length] : null;
        A.setScenario('bank'); A.setSeedMode(321); B.setScenario('bank'); B.setSeedMode(321); A.startCoop(); run(1);
        const p = A.get().players; o.kits = p.map(q => [q.kit.w, q.kit.vest | 0, q.bag]); o.heat = [A.SESSION.heat, B.SESSION.heat];
        return o; })()`);
      t.eq(r.vorher, { wallet: 7000, own: 3, sk: 2, round: 3, heat: 45, pts: 2, earned: 12000 }, 'Aufbau: der Host hat einen Stand'); t.eq(r.bBeitritt, Object.assign({}, r.vorher, { heat: 0 }), 'Aufbau: der Client hat vor dem Beitritt einen Stand (die Fahndung kommt vom Host, deshalb dort 0)');
      const leer = { wallet: 0, own: 0, sk: 0, round: 0, heat: 0, pts: 0, earned: 0 };
      t.eq(r.host, leer, 'der Host hat nach dem Raumaufbau alles zurueck');
            t.eq(r.client, leer, 'der Client hat nach dem Beitritt alles zurueck');
      t.eq(r.kitHost, ['pistol', 0, 0], 'beim Host steht das Grundkit des Clients');
      t.ok(r.kits.every(k => k[0] === 'pistol' && k[1] === 0), 'alle starten mit dem Grundkit: ' + JSON.stringify(r.kits));
      t.eq(r.heat, [0, 0], 'Fahndung 0 bei Host und Client');
    },
  },
  {
    name: 'Neuer Raum, neue Serie: Scheitert der Beitritt (falscher Code), bleibt der Stand des Spielers erhalten; ein Spieler, der nur das Spiel verlaesst, behaelt seinen Stand (nur ein neuer Raum setzt zurueck)',
    async run(t) {
      await setup(t);
      const r = await t.page.evaluate(`(() => { const o = {}, net = LoopNet(30, 0), F = mkInst(net, 'f'), all = [F], fill = ${FILL}, snap = ${SNAP};
        const run = s => { for (let i = 0; i < s * 60; i++) step(all, net, 1 / 60); };
        fill(F); F.joinRoom('ZZZZ'); run(3); o.fehl = { stand: snap(F), msg: F.NET.msg };
        // ein Client verlaesst den Raum: Stand bleibt (Verlassen setzt nichts zurueck)
        const net2 = LoopNet(30, 0), A = mkInst(net2, 'a'), B = mkInst(net2, 'b'), all2 = [A, B]; const run2 = s => { for (let i = 0; i < s * 60; i++) step(all2, net2, 1 / 60); };
        A.hostRoom(); run2(.5); B.joinRoom(A.NET.code); run2(1.5); fill(B); B.leaveGame(); run2(1); o.verlassen = snap(B);
        return o; })()`);
      t.ok(r.fehl.stand.wallet === 7000 && r.fehl.stand.round === 3 && r.fehl.stand.heat === 45, 'fehlgeschlagener Beitritt: Stand bleibt: ' + JSON.stringify(r.fehl));
      t.ok(r.verlassen.wallet === 7000 && r.verlassen.round === 3, 'Verlassen des Raums setzt nichts zurueck: ' + JSON.stringify(r.verlassen));
    },
  },
  {
    name: 'Neuer Raum, neue Serie: Mit Stand fragt der Coop-Hub vor Raum erstellen und Raum beitreten zurueck (Nein bleibt im Hub, Ja geht weiter), ohne Stand geht es direkt',
    async run(t) {
      await setup(t);
      const r = await t.page.evaluate(`(() => { const o = {}, net = LoopNet(30, 0), fill = ${FILL}, st = d => [d.state().scr, d.state().role, d.ui().modal()];
        const hub = (stand) => { const d = MT.solo(net, 's' + Math.random()); d.sessReset(); if (stand) fill(d); MT.click(d, 'coop'); return d; };
        let d = hub(true); MT.click(d, 'host'); o.hostFrage = st(d); o.text = OV.drawn(d).filter(s => /NEUE SERIE|neue Serie|geht verloren/.test(s)); o.layout = OV.check(d, { modal: true });
        MT.click(d, 'no'); o.hostNein = st(d); o.standNein = d.SESSION.wallet;
        MT.click(d, 'host'); MT.click(d, 'yes'); o.hostJa = st(d);
        d = hub(true); MT.click(d, 'join'); o.joinFrage = st(d); MT.click(d, 'yes'); o.joinJa = st(d);
        d = hub(false); MT.click(d, 'host'); o.ohneStand = st(d);
        return o; })()`);
      t.eq(r.hostFrage, ['coop', 'solo', 'confirm'], 'mit Stand fragt Raum erstellen zurueck, es passiert noch nichts');
      t.ok(r.text.length > 0, 'die Frage nennt die neue Serie: ' + JSON.stringify(r.text)); t.eq(r.layout, [], 'die Frage ueberlappt nichts');
      t.eq(r.hostNein, ['coop', 'solo', null], 'Nein bleibt im Hub'); t.eq(r.standNein, 7000, 'der Stand ist unberuehrt');
      t.eq(r.hostJa[0], 'lobby', 'Ja erstellt den Raum'); t.eq(r.hostJa[1], 'host', 'als Host');
      t.eq(r.joinFrage, ['coop', 'solo', 'confirm'], 'auch Raum beitreten fragt zurueck'); t.eq(r.joinJa[0], 'join', 'Ja geht zur Code-Eingabe');
      t.eq(r.ohneStand.slice(0, 2), ['lobby', 'host'], 'ohne Stand erstellt der Hub den Raum direkt');
    },
  },
];
