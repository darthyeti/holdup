// Ticket 296: Gefaengnis, Lockdown statt Sofort-Alarm (Phase 1). Koerperfund und Verdacht voll loesen beim ersten Mal einen Lockdown aus (Frist CFG.prison.lock.t),
// Funk in der Wachstube (Objekt fnk) wendet ihn ab (danach schnelleres Finden), Ablauf und jede weitere Entdeckung sind Alarm, Tor, C4 und Aufwachen bleiben Sofort-Alarm. Netz: Schnappschussfeld ld (VER 86).
async function setup(t) { await t.loadTool('loopnet.js'); await t.loadInpage('coop.js'); }
// Aufbau in der Seite: Host A (Spieler 0 draussen) und Client B. Nur drei Wachen bleiben, alle still, Kameras aus. body(i) schlaegt Wache i bewusstlos und legt sie in die Wachstube (Blick von Wache 2 auf sie).
const PRE = `(sd) => { const G = CT.mkGame('prison', sd, 2, 60, 20), A = G.A, B = G.clients[0], g = A.get(), R = A.LAY().prison, T = 32, w = R.rooms.wach;
  const grd = g.npcs.filter(n => n.k === 'grd' && n.st !== 'away'); const keep = grd.slice(0, 3); for (const n of g.npcs) if (!keep.includes(n)) { n.st = 'away'; n.at = 1e9; if (n.k === 'grd') n.still = true; }
  for (const n of keep) { n.still = true; n.alert = 0; n.look = null; n.path = []; } for (const c of g.cams) c.off = true;
  const both = sec => { for (let i = 0; i < Math.round(sec * 60); i++) { A.get().players.forEach(p => { p.hp = 1e9; p.dead = false; }); step(G.insts, G.net, 1 / 60); } };
  const place = (n, tx, ty, ang) => { n.x = (tx + .5) * T; n.y = (ty + .5) * T; n.st = 'idle'; n.still = true; n.base = ang; n.a = ang; n.alert = 0; n.look = null; n.path = []; };
  // Beobachter schaut auf die Stelle des Opfers: Opfer (Wache v) wird bewusstlos, Beobachter (o) steht 3 Kacheln weiter in der Wachstube
  const body = (v, o, row) => { const y = w[1] + row; place(o, w[0] + 1, y, 0); place(v, w[0] + 4, y, 0); A.koMi(v).act(g.players[0]); v.x = (w[0] + 4.5) * T; v.y = (y + .5) * T; };
  return { G, A, B, g, R, keep, both, body, place, w }; }`;

module.exports = [
  {
    name: 'Gefaengnis Lockdown: ein Koerperfund loest Lockdown aus (Frist, Wachen laufen hin), kein Alarm; nach der Frist ohne Gegenmassnahme Alarm',
    timeout: 240000,
    async run(t) {
      await setup(t);
      const r = await t.page.evaluate(`(() => { const S = (${PRE})(5), { A, B, g, R, keep, both, body } = S, K = A.CFG.ko, L = A.CFG.prison.lock, o = {};
        o.cfg = L; body(keep[0], keep[1], 2); keep[2].x = 40 * 32; keep[2].y = 6 * 32; keep[2].still = false;
        both(K.find + 1); o.p1 = A.get().phase; o.ld = R.ld.t > 0; o.n = R.ld.n; o.msg = A.msgs().feed.some(s => /Lockdown/.test(s)); o.rest = R.ld.t;
        o.dispatch = keep[2].path.length > 0 || Math.hypot(keep[2].x - R.ld.x, keep[2].y - R.ld.y) < 400;
        both(1); o.cl = B.LAY().prison.ld.t > 0 && Math.abs(B.LAY().prison.ld.t - R.ld.t) < 2;
        both(L.t - K.find - 2); o.vorAblauf = A.get().phase; both(5); o.nachAblauf = A.get().phase; o.ldNach = R.ld.t; return o; })()`);
      t.eq(r.cfg.t, 15, 'CFG.prison.lock.t 15 s');
      t.eq([r.p1, r.ld, r.n, r.msg], [1, true, 1, true], 'Phase 1 bleibt, Lockdown laeuft, Meldung');
      t.ok(r.rest > 0 && r.rest <= r.cfg.t, 'Restfrist laeuft: ' + r.rest);
      t.eq(r.dispatch, true, 'eine Wache laeuft zum Ort');
      t.eq(r.cl, true, 'Client sieht den Lockdown mit Restzeit (Schnappschuss)');
      t.eq(r.vorAblauf, 1, 'vor dem Ablauf noch Phase 1');
      t.eq([r.nachAblauf, r.ldNach], [2, 0], 'nach dem Ablauf Alarm');
    },
  },
  {
    name: 'Gefaengnis Lockdown: Funk ausschalten wendet ihn ab (nur im Lockdown, Haltezeit aus CFG), danach Wachsamkeit erhoeht, zweite Entdeckung ist Alarm; Gitter und Servicetuer bleiben im Lockdown zu',
    timeout: 240000,
    async run(t) {
      await setup(t);
      const r = await t.page.evaluate(`(() => { const S = (${PRE})(5), { A, B, g, R, keep, both, body, place, w } = S, K = A.CFG.ko, L = A.CFG.prison.lock, o = {}, p = g.players[0];
        const fk = g.its.find(i => i.t === 'fnk'), fkB = B.get().its.find(i => i.t === 'fnk'); o.da = !!fk && !!fkB; o.dur = fk.dur(); o.cfgDur = L.fkT; o.lage = [Math.floor(fk.x / 32) >= w[0] && Math.floor(fk.x / 32) <= w[2], Math.floor(fk.y / 32) >= w[1] && Math.floor(fk.y / 32) <= w[3]];
        o.okVor = fk.ok(p);
        const sw = g.its.find(i => i.t === 'lsw'), pry = g.its.find(i => i.t === 'pry'), pz = g.players[g.players.length - 1];
        body(keep[0], keep[1], 2); keep[2].x = 40 * 32; keep[2].y = 6 * 32; both(K.find + 1); o.ld = R.ld.t > 0;
        o.okIm = fk.ok(p); o.sperre = [sw.ok(p), pry.ok(pz)]; const dl0 = R.dl.at; R.dl.at = A.get().rT - 1; both(.5); o.dlSt = R.dv.st; R.dl.at = dl0;
        fk.act(p); both(1); o.ab = [R.ld.t, R.ld.off, A.get().phase]; o.hudCl = [B.LAY().prison.ld.t, B.LAY().prison.ld.off]; o.okNach = fk.ok(p);
        o.freiNach = sw.ok(p);
        both(L.t + 3); o.still = A.get().phase; o.dlSt2 = R.dv.st;
        const t0 = K.find / L.susX; body(keep[2], keep[1], 4); keep[1].x = (w[0] + 1.5) * 32; both(t0 + .8); o.zweite = A.get().phase;
        return o; })()`);
      t.eq(r.da, true, 'Funk-Objekt bei Host und Client');
      t.eq(r.dur, r.cfgDur, 'Haltezeit aus CFG');
      t.eq(r.lage, [true, true], 'Funk steht in der Wachstube');
      t.eq(r.okVor, false, 'ohne Lockdown nicht bedienbar');
      t.eq([r.ld, r.okIm], [true, true], 'im Lockdown bedienbar');
      t.eq(r.sperre, [false, false], 'Schalter und Aufhebeln sind im Lockdown gesperrt');
      t.eq(r.dlSt, 0, 'Lieferung oeffnet im Lockdown nicht neu');
      t.eq(r.ab, [0, 1, 1], 'abgewendet: Frist 0, erhoehte Wachsamkeit, Phase 1');
      t.eq(r.hudCl, [0, 1], 'Client sieht erhoehte Wachsamkeit');
      t.eq(r.okNach, false, 'Funk nur einmal');
      t.eq(r.freiNach, true, 'danach gehen die Stellen wieder');
      t.eq(r.still, 1, 'kein Alarm nach dem Abwenden');
      t.eq(r.zweite, 2, 'zweiter Koerperfund nach dem Lockdown: sofort Alarm (und schneller als sonst)');
    },
  },
  {
    name: 'Gefaengnis Lockdown: zweite Entdeckung im Lockdown ist Alarm; Verdacht voll (Kamera, Beobachter) loest Lockdown aus; Tor und Schuss bleiben Sofort-Alarm',
    timeout: 240000,
    async run(t) {
      await setup(t);
      const r = await t.page.evaluate(`(() => { const o = {};
        { const S = (${PRE})(5), { A, g, R, both } = S, p = g.players[0]; o.a1 = A.detect(p, false, p.x, p.y, 'Test'); o.a2 = [A.get().phase, R.ld.t > 0]; o.a3 = A.detect(p, false, p.x, p.y, 'Test'); both(.2); o.a4 = [A.get().phase, R.ld.t]; }
        { const S = (${PRE})(5), { A, g, R, keep, both, place, w } = S, p = g.players[0]; p.x = (w[0] + 3.5) * 32; p.y = (w[1] + 3.5) * 32; place(keep[1], w[0] + 1, w[1] + 3, 0); keep[0].x = 40 * 32; keep[0].y = 6 * 32; keep[2].x = 41 * 32; keep[2].y = 6 * 32;
          o.sus = [0, 0]; for (let i = 0; i < 25 * 60 && !R.ld.n; i++) { p.thf = 1e3; both(1 / 60); } o.sus = [A.get().phase, R.ld.n, R.ld.t > 0, Math.round(A.get().sus)]; }
        { const S = (${PRE})(5), { A, g } = S, v = g.its.find(i => i.t === 'vault'), p = g.players[0]; v.act(p); o.tor = A.get().phase; }
        { const S = (${PRE})(5), { A, g } = S, p = g.players[0]; A.startHeist(false, p); o.schuss = A.get().phase; }
        return o; })()`);
      t.eq(r.a1, true, 'erste Entdeckung: Lockdown');
      t.eq(r.a2, [1, true], 'Phase 1, Lockdown laeuft');
      t.eq(r.a3, false, 'zweite Entdeckung im Lockdown');
      t.eq(r.a4, [2, 0], 'Alarm, Lockdown beendet');
      t.eq(r.sus.slice(0, 3), [1, 1, true], 'Verdacht voll: Lockdown statt Alarm: ' + r.sus);
      t.eq(r.tor, 2, 'Tor aufbrechen: Sofort-Alarm');
      t.eq(r.schuss, 2, 'Schuss (Ueberfall): Sofort-Alarm');
    },
  },
];
