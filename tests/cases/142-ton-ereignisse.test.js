// Ton ohne Ohren (Ticket #20): Jeder Ton der Simulation laeuft ueber evt('s', [name, ...args]) oder ein Effekt-Ereignis (sh, es, hw, hf, gl, gb, sk, bx), fxApply ruft dann SND[name].
// Geprueft wird nur die Zuordnung Ereignis -> richtiger SND-Aufruf mit den richtigen Argumenten, nicht der Klang (der steht in docs/tests-und-messwerte.md, Ton testen ohne Ohren).
// Spion: alle Funktionen von SND werden durch Aufzeichner ersetzt (SPY), danach zurueckgesetzt. SND ist fuer alle Instanzen einer Seite derselbe Baustein:
// im Coop zaehlt man also die Aufrufe (Host und Client rufen beide), ein Ton nur fuer einen Spieler (to) kommt genau einmal.
async function setup(t) {
  await t.loadTool('loopnet.js');
  await t.loadInpage('coop.js');
}
const SPY = `(() => { const AMB = ['frame', 'listen', 'work', 'pause'], S = __dbg.SND, rec = [], orig = {};
  for (const k of Object.keys(S)) if (typeof S[k] === 'function' && k[0] !== '_' && !AMB.includes(k)) { orig[k] = S[k]; S[k] = (...a) => { rec.push([k, ...a]); }; }
  return { rec, off() { for (const k in orig) S[k] = orig[k]; }, n: k => rec.filter(r => r[0] === k).length, get: k => rec.filter(r => r[0] === k), clear() { rec.length = 0; } }; })()`;

module.exports = [
  {
    name: 'Ton-Zuordnung: jedes Ereignis ruft den richtigen SND-Baustein mit den richtigen Argumenten (s, sh, es, hw, hf, gl, gb, sk, bx), unbekannte Namen tun nichts',
    async run(t) {
      const r = await t.page.evaluate(`(() => { const D = __dbg; D.sessReset(); D.setScenario('bank'); D.setSeedMode('classic'); D.buildSeed('classic'); const S = ${SPY}, o = {};
        try {
          const ev = (n, a, to) => { S.clear(); D.evt(n, a, to); return S.rec.map(r => r.slice()); };
          o.s = ev('s', ['alert']); o.s2 = ev('s', ['ev', 'power']); o.s3 = ev('s', ['boom', 10, 20]); o.unbek = ev('s', ['gibtsnicht', 1]); o.unbek2 = ev('quatsch', [1]);
          o.hw = ev('hw', [5, 6]); o.hf = ev('hf', [5, 6, 3]); o.gl = ev('gl', [7, 8]); o.sk = ev('sk', [9, 10]);
          o.gb0 = ev('gb', [1, 2, 0]); o.gb1 = ev('gb', [1, 2, 1]); o.gb2 = ev('gb', [1, 2, 2]); o.gb3 = ev('gb', [1, 2, 3]); o.bx = ev('bx', [11, 12, 90, 0]);
          o.es = ev('es', [99, 30, 40, 'swat']); o.shMe = ev('sh', [D.get().me.id, 1, 2, 0]);
          o.fremd = ev('s', ['alert'], 77);
        } finally { S.off(); }
        return o; })()`);
      t.eq(r.s, [['alert']], 'evt s alert -> SND.alert()');
      t.eq(r.s2, [['ev', 'power']], 'evt s ev power -> SND.ev("power")');
      t.eq(r.s3, [['boom', 10, 20]], 'Argumente werden durchgereicht');
      t.eq(r.unbek, [], 'unbekannter Ton: kein Aufruf, kein Fehler');
      t.eq(r.unbek2, [], 'unbekanntes Ereignis: kein Ton, kein Fehler');
      t.eq(r.hw, [['hit', 5, 6, 0]], 'hw: Treffer in die Wand = SND.hit(x, y, 0)');
      t.eq(r.hf, [['hit', 5, 6, 1]], 'hf: Treffer im Koerper = SND.hit(x, y, 1)');
      t.eq(r.gl, [['glass', 7, 8]], 'gl: SND.glass');
      t.eq(r.sk, [['hit', 9, 10, 0]], 'sk: Treffer auf ein Schild = SND.hit(x, y, 0)');
      t.eq(r.gb0, [['bang', 1, 2]], 'gb 0: Blendgranate = SND.bang');
      t.eq(r.gb1, [['hiss', 1, 2]], 'gb 1: Gas = SND.hiss');
      t.eq(r.gb2, [['hiss', 1, 2]], 'gb 2: Rauch = SND.hiss');
      t.eq(r.gb3, [['beep', 1, 2]], 'gb 3: Ablenker = SND.beep');
      t.eq(r.bx, [['boom', 11, 12]], 'bx: Explosion = SND.boom');
      t.eq(r.es, [['eshot', 30, 40, 'swat']], 'es: Gegnerschuss = SND.eshot(x, y, Art)');
      t.eq(r.shMe, [['shot']], 'sh vom eigenen Spieler = SND.shot()');
      t.eq(r.fremd, [], 'Ton fuer einen anderen Spieler (to) wird hier nicht gespielt');
    },
  },
  {
    name: 'Ton aus der Simulation: Warnton bei Entdeckung, "Alarm abgewendet", Alarmsirene beim Ueberfall, Pistolenschuss, Treffer in die Wand und Glas loesen die richtigen Toene aus',
    async run(t) {
      const r = await t.page.evaluate(`(() => { const D = __dbg; D.sessReset(); D.setScenario('bank'); D.setSeedMode('classic'); D.setLage([]); D.buildSeed('classic'); D.CFG.policeAt = 1e6; D.CFG.policeForced = 1e6; const S = ${SPY}, o = {};
        try {
          const g = D.get(), me = g.me, W = D.world(), cells = ch => { const out = []; W.M.forEach((row, y) => { for (let x = 0; x < row.length; x++) if (row[x] === ch) out.push([x, y]); }); return out; };
          g.npcs.forEach(q => { q.st = 'away'; }); g.cams.forEach(c => { c.off = true; });
          const grd = g.npcs.find(q => q.k === 'tel'); grd.st = 'idle';
          let sp = null; for (const d of [60, 80, 100]) { const x = grd.x, y = grd.y + d; if (!D.isSol(Math.floor(x / 32), Math.floor(y / 32)) && D.los(grd.x, grd.y, x, y) && !W.restricted(x, y)) { sp = { x, y }; break; } }
          if (!sp) return { err: 'kein Punkt vor dem Kassierer' };
          // (1) Der Kassierer sieht den Traeger (Rate hochgesetzt): Warnton, Gnadenfrist laeuft
          // erst nur gesehen (kleine Rate, kein Countdown): der Warnton der Sicht; dann voller Balken: der Warnton des Countdowns
          D.CFG.watch.grace = 4; D.CFG.watch.carry.staff = 5; D.setSus(0); me.units = 1; me.loot = 1000; S.clear();
          for (let i = 0; i < 6; i++) { me.x = sp.x; me.y = sp.y; D.update(1 / 30); }
          o.sicht = S.n('alert'); o.cd0 = D.get().alarmT;
          D.CFG.watch.carry.staff = 400; D.setSus(99); S.clear();
          for (let i = 0; i < 10 && D.get().alarmT <= 0; i++) { me.x = sp.x; me.y = sp.y; D.update(1 / 30); }
          o.countdown = D.get().alarmT > 0; o.alertCount = S.n('alert');
          // (2) Beute weg: der Balken faellt unter back, Alarm abgewendet (ev power)
          me.loot = 0; me.units = 0; S.clear();
          for (let i = 0; i < 30 * 12 && D.get().alarmT > 0; i++) { me.x = sp.x; me.y = sp.y; D.update(1 / 30); }
          o.abgewendet = D.get().alarmT === 0 && D.get().phase === 1; o.power = S.get('ev').filter(a => a[1] === 'power').length;
          // (3) erzwungener Ueberfall: Sirene
          S.clear(); D.startHeist(true); o.alarm = S.get('alarm');
          // (4) Ueberfall: Schuss mit der Pistole
          S.clear(); me.mag = 12; me.res = 30; me.cool = 0; D.mouse.down = 1; for (let i = 0; i < 12; i++) D.update(1 / 30); D.mouse.down = 0; o.shot = S.n('shot');
          // (5) Kugel in eine Wand: hit(x, y, 0); Scharfschuetzenkugel in ein Fenster: glass
          const wall = cells('#')[0], win = cells('W')[0], ox = W.WX0, oy = W.WY0;
          S.clear(); D.get().bl.push({ id: 9001, x: (wall[0] + ox) * 32 + 16, y: (wall[1] + oy) * 32 + 16, vx: 1, vy: 0, l: 1, o: 1, own: 0, d: 10 }); D.update(1 / 60); o.wall = S.get('hit').map(a => a.slice(3));
          if (win) { S.clear(); D.get().bl.push({ id: 9002, x: (win[0] + ox) * 32 + 16, y: (win[1] + oy) * 32 + 16, vx: 1, vy: 0, l: 1, o: 1, own: 0, d: 10, sn: 1 }); D.update(1 / 60); o.glass = S.get('glass').map(a => [Math.round(a[1]), Math.round(a[2])]); o.win = [(win[0] + ox) * 32 + 16, (win[1] + oy) * 32 + 16]; o.winCell = D.world().M[win[1]][win[0]]; }
        } finally { S.off(); }
        return o; })()`);
      t.ok(!r.err, r.err);
      t.ok(r.sicht >= 1 && r.cd0 === 0, 'gesehen mit Beute: Warnton ohne Countdown: ' + r.sicht);
      t.eq(r.countdown, true, 'Aufbau: Gnadenfrist laeuft');
      t.ok(r.alertCount >= 1, 'Balken voll, Countdown beginnt: Warnton SND.alert: ' + r.alertCount);
      t.eq(r.abgewendet, true, 'Aufbau: Alarm abgewendet');
      t.ok(r.power >= 1, 'Alarm abgewendet: SND.ev("power")');
      t.eq(r.alarm, [['alarm', true]], 'erzwungener Ueberfall: SND.alarm(true)');
      t.ok(r.shot >= 1, 'Pistolenschuss im Ueberfall: SND.shot: ' + r.shot);
      t.ok(r.wall.length >= 1 && r.wall.every(a => a[0] === 0), 'Kugel in die Wand: SND.hit(..., 0): ' + JSON.stringify(r.wall));
      t.ok(r.win, 'Aufbau: die Bank hat Fenster');
      t.eq(r.winCell, 'w', 'Aufbau: das Fenster ist zerschossen');
      t.eq(r.glass, [r.win], 'Scharfschuetzenkugel durch das Fenster: SND.glass am Fenster');
    },
  },
  {
    name: 'Ton im Coop: ein Ton an alle kommt bei Host und Client an, ein Ton an einen Spieler nur bei diesem; Schuss des Hosts: shot beim Host, eshot (cop) beim Client; Glas und Explosion bei beiden',
    async run(t) {
      await setup(t);
      const r = await t.page.evaluate(`(() => { const G = CT.mkGame('bank', 321, 2), A = G.A, B = G.clients[0], S = ${SPY}, o = {};
        try {
          G.run(1);
          const cnt = fn => { S.clear(); fn(); G.run(.6); return S.rec.map(r => r.slice(0, 1).concat(r[0] === 'ev' ? [r[1]] : [], r[0] === 'eshot' ? [r[3]] : [])); };
          o.all = cnt(() => A.evt('s', ['alert'])); o.host = cnt(() => A.evt('s', ['cash'], 0)); o.client = cnt(() => A.evt('s', ['cash'], B.get().me.id));
          o.gl = cnt(() => A.evt('gl', [100, 100])); o.boom = cnt(() => A.evt('bx', [100, 100, 90, 0])); o.hw = cnt(() => A.evt('hw', [100, 100]));
          o.sh = cnt(() => A.evt('sh', [A.get().me.id, 100, 100, 0]));
          o.myB = B.get().me.id;
        } finally { S.off(); }
        return o; })()`);
      t.eq(r.myB, 1, 'Aufbau: der Client ist Spieler 1');
      t.eq(r.all, [['alert'], ['alert']], 'Ton an alle: Host und Client');
      t.eq(r.host, [['cash']], 'Ton an den Host (to 0): nur ein Aufruf');
      t.eq(r.client, [['cash']], 'Ton an den Client: nur ein Aufruf (kommt per Schnappschuss an)');
      t.eq(r.gl, [['glass'], ['glass']], 'Glas: Host und Client');
      t.eq(r.boom, [['boom'], ['boom']], 'Explosion: Host und Client');
      t.eq(r.hw, [['hit'], ['hit']], 'Treffer in die Wand: Host und Client');
      t.eq(r.sh.slice().sort(), [['eshot', 'cop'], ['shot']], 'Schuss des Hosts: shot beim Host, eshot (cop) beim Client');
    },
  },
];
