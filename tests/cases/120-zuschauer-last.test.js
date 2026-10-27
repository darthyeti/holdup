// Coop-Ausbau Z3 (docs/coop-ausbau.md, Spur Z): Last der Zuschauer. Zuschauer bekommen nur jeden CFG.spec.every-ten Schnappschuss (2, also 10 Hz), die Ereignisse der uebersprungenen gehen nicht verloren, sondern
// liegen je Zuschauer in c.evBuf (hoechstens CFG.spec.evMax) und kommen mit dem naechsten (genau einmal, in der Reihenfolge). Waechst der Sendepuffer einer Zuschauer-Verbindung (c.buffered()) ueber CFG.spec.maxBuf,
// lässt der Host fuer sie Schnappschuesse aus, bis er wieder leer ist (Spieler sind nicht betroffen). CFG.spec.delay haelt auf dem Zuschauer-Client Schnappschuesse, Ende und Rundenwechsel um diese Sekunden zurueck.
// Das Sicherheitsnetz fitSnap haelt jede Nachricht unter CFG.net.max (15.800 Byte, PeerJS lehnt ab 16.300 ab): erst Ereignisse kuerzen (beim Zuschauer bleibt der Rest im Puffer), dann Kugeln ausduennen.
const SETUP = `(() => { const G = CT.mkGame('bank', 321, 2, 40, 0), A = G.A, S = CT.addSpec(G), rp = [], rs = [];
  const tap = (c, rec) => { const o = c.send.bind(c); c.send = m => { if (m && m.t === 'snap') rec.push({ T: m.T, ev: m.ev || [], b: JSON.stringify(m).length, bl: (m.bl || []).length }); return o(m); }; };
  G.run(3); tap(A.NET.conns[0], rp); tap(A.NET.specs[0], rs);
  const say = (pre, a, b) => { const o = []; for (let i = a; i < b; i++) o.push(pre + i); return o; }, pick = (r, pre) => r.flatMap(x => x.ev).filter(e => e[0] === 'say' && String(e[1][0]).startsWith(pre)).map(e => e[1][0]);
  return { G, A, S, rp, rs, say, pick, clr: () => { rp.length = 0; rs.length = 0; } }; })()`;

module.exports = [
  {
    name: 'Halbrate: Zuschauer bekommen jeden CFG.spec.every-ten Schnappschuss (2: halb so viele wie ein Spieler, 1: gleich viele, 3: ein Drittel), der Zustand bleibt nah am Host',
    async run(t) {
      await t.loadTool('loopnet.js'); await t.loadInpage('coop.js');
      const r = await t.page.evaluate(`(() => { const { G, A, S, rp, rs, clr } = ${SETUP}, o = {}, ratio = () => +(rs.length / rp.length).toFixed(2), diff = () => +Math.abs(A.get().time - S.get().time).toFixed(2);
        o.cfg = [A.CFG.spec.every, A.CFG.spec.maxBuf, A.CFG.spec.evMax, A.CFG.spec.delay, A.CFG.net.max, A.CFG.net.blKeep];
        clr(); G.run(5); o.r2 = [ratio(), rp.length, diff()]; A.CFG.spec.every = 1; clr(); G.run(5); o.r1 = [ratio(), diff()]; A.CFG.spec.every = 3; clr(); G.run(5); o.r3 = [ratio(), diff()];
        return o; })()`);
      t.eq(r.cfg, [2, 65536, 400, 0, 15800, 60], 'Werte in CFG.spec und CFG.net');
      t.ok(r.r2[0] > .46 && r.r2[0] < .54 && r.r2[1] > 80, 'alle 2: etwa die Haelfte der Schnappschuesse: ' + JSON.stringify(r.r2)); t.ok(r.r2[2] < .35, 'der Zuschauer hinkt dem Host kaum hinterher: ' + r.r2[2]);
      t.ok(r.r1[0] > .96 && r.r1[0] < 1.04, 'alle 1: gleich viele wie ein Spieler: ' + r.r1[0]); t.ok(r.r3[0] > .3 && r.r3[0] < .37 && r.r3[1] < .5, 'alle 3: ein Drittel: ' + JSON.stringify(r.r3));
    },
  },
  {
    name: 'Ereignispuffer: Die Ereignisse uebersprungener Schnappschuesse kommen beim Zuschauer an, jedes genau einmal und in der Reihenfolge (so wie beim Spieler), nach einer Pause und auch bei alle 3',
    async run(t) {
      await t.loadTool('loopnet.js'); await t.loadInpage('coop.js');
      const r = await t.page.evaluate(`(() => { const { G, A, S, rp, rs, say, pick, clr } = ${SETUP}, o = {};
        const send = (pre, n) => { for (let i = 0; i < n; i++) { A.evt('say', [pre + i]); G.run(.07); } G.run(.6); };
        clr(); send('Z3a-', 30); o.a = [pick(rs, 'Z3a-'), pick(rp, 'Z3a-')];
        A.CFG.spec.every = 3; clr(); send('Z3b-', 30); o.b = pick(rs, 'Z3b-'); o.last = rs.length > 0 && rs[rs.length - 1].T;
        o.want = [say('Z3a-', 0, 30), say('Z3b-', 0, 30)]; return o; })()`);
      t.eq(r.a[0], r.want[0], 'alle 2: alle 30 Ereignisse beim Zuschauer, einmal, in der Reihenfolge'); t.eq(r.a[1], r.want[0], 'der Spieler bekommt dieselben');
      t.eq(r.b, r.want[1], 'alle 3: auch dann nichts verloren');
    },
  },
  {
    name: 'Rueckstau-Schutz: Ist der Sendepuffer des Zuschauers ueber CFG.spec.maxBuf, kommt fuer ihn kein Schnappschuss, die Spieler laufen weiter; danach holt er auf und bekommt die gesammelten Ereignisse (hoechstens CFG.spec.evMax, die neuesten), nichts ist zu gross',
    async run(t) {
      await t.loadTool('loopnet.js'); await t.loadInpage('coop.js');
      const r = await t.page.evaluate(`(() => { const { G, A, S, rp, rs, say, pick, clr } = ${SETUP}, o = {}, sp = A.NET.specs[0], diff = () => +Math.abs(A.get().time - S.get().time).toFixed(2);
        o.hat = typeof sp.buffered === 'function'; sp.bufAmt = 70000; clr();
        for (let i = 0; i < 30; i++) { for (let k = 0; k < 20; k++) A.evt('say', ['Z3c-' + (i * 20 + k)]); G.run(.07); }
        G.run(.3); o.still = [rs.length, rp.length];
        sp.bufAmt = 0; G.run(2); const got = pick(rs, 'Z3c-'); o.got = [got.length, got[0], got[got.length - 1], new Set(got).size, rs.length > 5]; o.ok = got.join() === say('Z3c-', 200, 600).join();
        o.big = G.net.stat.big; o.diff = diff();
        sp.bufAmt = 65536; clr(); G.run(.5); o.grenze = rs.length; sp.bufAmt = 65537; clr(); G.run(.5); o.wieder = rs.length;
        const fake = { send() {}, close() {}, on() {}, dataChannel: { bufferedAmount: 1234 }, bufferSize: 3 }; o.wrap = [A.peerTransport().wrap(fake).buffered(), A.peerTransport().wrap({ send() {}, close() {}, on() {} }).buffered()];
        for (let i = 0; i < 5; i++) A.evt('say', ['Z3d-' + i]); G.run(.2); o.evBuf = [sp.evBuf.length > 0]; A.reset(); o.evBuf.push(sp.evBuf.length); return o; })()`);
      t.eq(r.hat, true, 'die Test-Leitung kennt buffered() (Platzhalter bufAmt)');
      t.eq(r.still[0], 0, 'im Rueckstau (70000 ueber maxBuf) kommt kein Schnappschuss fuer den Zuschauer'); t.ok(r.still[1] > 20, 'die Spieler bekommen weiter Schnappschuesse: ' + r.still[1]);
      t.ok(r.grenze > 3, 'genau maxBuf (65536) ist noch kein Rueckstau: ' + r.grenze); t.eq(r.wieder, 0, 'wieder darueber: wieder nichts');
      t.eq(r.got, [400, 'Z3c-200', 'Z3c-599', 400, true], 'nach dem Rueckstau kommen genau die neuesten 400 der 600 Ereignisse, jedes einmal'); t.eq(r.ok, true, 'in der Reihenfolge');
      t.eq(r.wrap, [1234 + 3 * 6000, 0], 'der echte Transport meldet buffered() aus bufferedAmount und bufferSize (mal 6000 Byte), ohne beides 0');
      t.eq(r.evBuf, [true, 0], 'eine neue Runde (reset) leert den Ereignispuffer der Zuschauer');
      t.eq(r.big, 0, 'keine Nachricht war zu gross'); t.ok(r.diff < .35, 'der Zuschauer hat aufgeholt: ' + r.diff);
    },
  },
  {
    name: 'Verzoegerung: Mit CFG.spec.delay haelt der Zuschauer Schnappschuesse, Ende und Runde um diese Sekunden zurueck (Zeit hinkt um den Wert, Ende kommt spaeter), auf 0 gestellt wird der Rest sofort abgespielt',
    async run(t) {
      await t.loadTool('loopnet.js'); await t.loadInpage('coop.js');
      const r = await t.page.evaluate(`(() => { const { G, A, S, clr } = ${SETUP}, o = {}, diff = () => +(A.get().time - S.get().time).toFixed(2);
        o.q0 = S.specQ(); S.CFG.spec.delay = 2; G.run(6); o.diff = diff(); o.q = S.specQ();
        S.CFG.spec.delay = 0; G.run(.1); o.flush = [diff(), S.specQ()];
        S.CFG.spec.delay = 2; G.run(2.5); S.CFG.spec.delay = 0; const q0 = S.specQ(); A.tick(.06); A.tick(.06); G.net.advance(.3); o.reiht = [q0, S.specQ()]; S.tick(1 / 60); o.reihe = [diff(), S.specQ()];
        S.CFG.spec.delay = 2; G.run(.3); A.finish(true, 'Z3'); G.run(1); o.nach1 = [!!A.get().ended, !!S.get().ended]; G.run(1.5); o.nach25 = !!S.get().ended;
        A.startNext(); G.run(.5); o.rstSofort = [!!S.get().ended]; G.run(3); o.rstSpaeter = [!!S.get().ended, !!A.get().ended];
        S.CFG.spec.delay = 2; G.run(.5); o.vorher = S.specQ(); S.leaveGame(); o.nachher = S.specQ();
        return o; })()`);
      t.eq(r.q0, 0, 'ohne Verzoegerung ist die Warteschlange leer');
      t.ok(r.diff > 1.8 && r.diff < 2.4, 'die Zeit des Zuschauers hinkt um etwa 2 s: ' + r.diff); t.ok(r.q > 10, 'es wartet eine Schlange: ' + r.q);
      t.ok(r.flush[0] < .35 && r.flush[1] === 0, 'auf 0 gestellt wird sofort aufgeholt: ' + JSON.stringify(r.flush));
      t.ok(r.reiht[1] > r.reiht[0], 'bei delay 0 reihen sich neue Nachrichten hinter die wartenden ein: ' + JSON.stringify(r.reiht));
      t.ok(r.reihe[0] < .35 && r.reihe[1] === 0, 'bei delay 0 reihen sich neue Nachrichten hinter die wartenden ein (sonst laeuft die Zeit zurueck): ' + JSON.stringify(r.reihe));
      t.eq(r.nach1, [true, false], 'das Ende kommt beim Host sofort, beim Zuschauer nach 1 s noch nicht'); t.eq(r.nach25, true, 'nach 2,5 s ist es da');
      t.eq([r.rstSofort[0], r.rstSpaeter[0], r.rstSpaeter[1]], [true, false, false], 'der Rundenwechsel (rst) wird mit verzoegert: Nach 0,5 s sieht der Zuschauer noch das Ende, nach 3,5 s die neue Runde'); t.ok(r.vorher > 0 && r.nachher === 0, 'wer geht, leert die Schlange: ' + r.vorher + ' dann ' + r.nachher);
    },
  },
  {
    name: 'Sicherheitsnetz: fitSnap haelt jede Nachricht unter CFG.net.max (zu viele Ereignisse werden gekuerzt, zu viele Kugeln ausgeduennt, Sniper- und Praezisionskugeln bleiben), im Spiel mit 700 Kugeln geht keine Nachricht verloren und die Clients bekommen weiter Schnappschuesse',
    async run(t) {
      await t.loadTool('loopnet.js'); await t.loadInpage('coop.js');
      const r = await t.page.evaluate(`(() => { const { G, A, S, rp, rs, clr } = ${SETUP}, o = {}, M = A.CFG.net.max, sz = m => JSON.stringify(m).length;
        const s = A.buildSnap(), len = sz(s), ev3 = [['say', ['a']], ['say', ['b']], ['say', ['c']]], f1 = A.fitSnap(s, ev3, len);
        o.klein = [f1.n, f1.m.ev.length, f1.m.bl.length === s.bl.length, sz(f1.m) < M];
        const evBig = []; for (let i = 0; i < 2000; i++) evBig.push(['say', ['Ereignis Nummer ' + i]]); const f2 = A.fitSnap(s, evBig, len);
        o.ev = [f2.n > 100 && f2.n < 2000, f2.m.ev.length === f2.n, sz(f2.m) < M, JSON.stringify(f2.m.ev[0]) === JSON.stringify(evBig[0])];
        const big = Object.assign({}, s, { bl: s.bl.slice() }); for (let i = 0; i < 700; i++) big.bl.push([9000 + i, 100 + i, 200, 0, 0, 1, 0, 60, i % 50 === 0 ? 1 : 0]);
        const lb = sz(big), f3 = A.fitSnap(big, ev3, lb); o.kugeln = [lb > M, sz(f3.m) < M, f3.m.bl.length < big.bl.length, f3.m.bl.filter(b => b[8] === 1).length === 14, f3.m.bl.length <= 14 + A.CFG.net.blKeep];
        const huge = Object.assign({}, s, { cp: [] }); for (let i = 0; i < 1000; i++) huge.cp.push([100 + i, 200, 1.5, 3.5, 2]); const lh = sz(huge), f4 = A.fitSnap(huge, ev3, lh); o.leichen = [lh > M, sz(f4.m) < M, f4.m.cp.length];
        // im Spiel: 700 ruhende Kugeln auf einmal
        const bl = A.get().bl, p = A.get().players[0]; clr(); G.net.stat.big = 0; for (let i = 0; i < 700; i++) bl.push({ id: 90000 + i, x: p.x + (i % 20), y: p.y + (i % 7), vx: 0, vy: 0, l: 300, o: 1, own: 0, d: 0 });
        G.run(1); o.spiel = [G.net.stat.big, rp.length > 10, rs.length > 3, Math.max(...rp.map(x => x.b)) < 16300, Math.max(...rs.map(x => x.b)) < 16300, Math.max(...rp.map(x => x.bl)) < 700, A.NET.fitN > 0];
        o.client = G.clients[0].get().bl.length < 700;
        bl.length = 0; const n0 = A.NET.fitN; clr(); G.run(1); o.danach = [A.NET.fitN === n0, Math.max(...rp.map(x => x.bl))];
        return o; })()`);
      t.eq(r.klein, [3, 3, true, true], 'kleiner Schnappschuss: nichts wird veraendert');
      t.eq(r.ev, [true, true, true, true], 'zu viele Ereignisse: es passen nur die ersten, n sagt wie viele, die Nachricht bleibt unter dem Maximum');
      t.eq(r.kugeln, [true, true, true, true, true], 'zu viele Kugeln: ausgeduennt, die 14 besonderen (Sniper und Praezision) bleiben, die Nachricht bleibt unter dem Maximum');
      t.eq(r.leichen, [true, true, 0], 'reicht das Ausduennen der Kugeln nicht (hier 1000 Leichen), werden im Notfall auch die Leichen weggelassen');
      t.eq(r.spiel, [0, true, true, true, true, true, true], 'im Spiel mit 700 Kugeln: keine zu grosse Nachricht, Spieler und Zuschauer bekommen Schnappschuesse, die Kugelzahl ist begrenzt, fitN zaehlt');
      t.eq(r.client, true, 'der Client sieht weniger als 700 Kugeln'); t.eq(r.danach[0], true, 'ohne die Kugeln greift das Netz nicht mehr (fitN steigt nicht)');
    },
  },
];
