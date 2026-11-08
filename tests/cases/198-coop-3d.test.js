// 3D-8 (Ticket 157): Coop und Zuschauer in der 3D-Ansicht. Die Ansicht ist lokal: Host und Client duerfen verschieden zeichnen (2D und 3D im selben Raum),
// Spielzustand und Schnappschuesse bleiben bytegleich. Zuschauer folgt, wechselt, fliegt frei und sieht alles; Funk-Markierungen (Ring am Boden, Boegen ueber dem Kopf)
// und Randpfeile (edgePt, Fluchtwagen-Zeiger) stehen in 3D an der Stelle aus toScr; der Wettkampf mit zwei Teams und Uebersichtskarte baut in 3D.
// Kein Pixelvergleich. Ohne WebGL 2 (auch nicht mit SwiftShader-Flags) ueberspringt der Test mit Meldung.
const lib = require('../lib');

async function glPage(t) {
  const ok = p => p.evaluate(() => { const c = document.createElement('canvas'); return !!c.getContext('webgl2'); });
  if (await ok(t.page)) return { page: t.page, done: async () => {} };
  const env = await lib.launch({ webgl: true });
  const page = await lib.openGame(env);
  if (await ok(page)) return { page, done: async () => { await page.ctx.close().catch(() => {}); await env.browser.close().catch(() => {}); env.srv.close(); } };
  await env.browser.close().catch(() => {}); env.srv.close();
  t.note('kein WebGL 2 im Test-Chromium (auch nicht mit SwiftShader-Flags), 3D-Teil uebersprungen');
  return null;
}
async function coopPage(t) { const P = await glPage(t); if (!P) return null; await lib.loadTool(P.page, 'loopnet.js'); await lib.loadInpage(P.page, 'coop.js'); return P; }
const jsErr = (t, P) => { if (P.page.errors.length) t.ok(false, 'JS-Fehler: ' + P.page.errors.slice(0, 2).join(' | ')); };

module.exports = [
  {
    name: '3D-Coop: 2D und 3D im selben Raum (Client 3D und Host 2D, umgekehrt): Zustandshash beider Instanzen und alle Schnappschuesse des Hosts bytegleich wie ohne 3D',
    timeout: 300000,
    async run(t) {
      const P = await coopPage(t); if (!P) return;
      try {
        const r = await P.page.evaluate(`(async () => {
          // eigener Zufall fuer Simulation und Zeichnen, feste Uhr: der Vergleich sieht nur, was die Simulation rechnet
          const mb = s => () => { s = s + 0x6D2B79F5 | 0; let q = Math.imul(s ^ s >>> 15, 1 | s); q = q + Math.imul(q ^ q >>> 7, 61 | q) ^ q; return ((q ^ q >>> 14) >>> 0) / 4294967296; };
          const R0 = Math.random, P0 = performance.now.bind(performance), H = s => { let h = 0; for (let i = 0; i < s.length; i++) h = Math.imul(h, 31) + s.charCodeAt(i) | 0; return h; };
          async function run(m) {   // m = [Host 3D, Client 3D]
            Math.random = mb(42); let clk = 0; performance.now = () => clk;
            const G = CT.mkGame('bank', 321, 2, 40, 0), A = G.A, B = G.clients[0], I = [A, B]; A.CFG.policeAt = 20;
            Math.random = R0;
            // gleiche Mausabbildung: in 3D zielt die Maus bewusst ueber pick (anderer Weltpunkt), hier zaehlt nur, ob die Ansicht Zustand aendert
            for (let k = 0; k < 2; k++) if (m[k]) { await I[k].view3d.set(true); I[k].view3d.V.pick = (sx, sy) => [sx + I[k].cam()[0], sy + I[k].cam()[1]]; }
            const rs = mb(9), rd = mb(7); Math.random = rs; const snaps = [];
            for (const d of I) { d.mouse.sx = 640; d.mouse.sy = 200; }
            for (let i = 0; i < 900; i++) {
              for (const d of I) { for (const k of 'wasd') delete d.keys[k]; d.keys[['d', 'w', 'a', 's'][Math.floor(i / 90 + (d === B ? 2 : 0)) % 4]] = 1; }
              if (i === 120) A.startHeist();
              clk += 1000 / 60; step(G.insts, G.net, 1 / 60);
              if (i % 4 === 3) { Math.random = rd; for (const d of I) d.draw(); Math.random = rs; }
              if (i % 150 === 149) snaps.push(JSON.stringify(A.buildSnap()));
            }
            Math.random = R0; performance.now = P0;
            const hs = d => { const g = d.get(); return H(JSON.stringify({ t: g.time, ph: g.phase, pl: g.players.map(o => [o.x, o.y, o.a, o.hp]), en: g.en.map(e => [e.x, e.y, e.hp]), npc: g.npcs.map(n => [n.x, n.y]), its: g.its.map(o => [o.t, !!o.done]), M: d.world().M.join(''), sec: g.secured })); };
            const out = { h: [hs(A), hs(B)], sh: H(snaps.join('|')), sl: snaps.map(s => s.length), ph: A.get().phase, i3: I.map(d => { const f = d.view3d.info(); return [f.state, f.frames || 0, f.errs || 0]; }) };
            for (const d of I) await d.view3d.set(false);
            for (const d of G.insts) { try { d.leaveGame(); } catch (e) {} }
            return out;
          }
          await run([0, 0]);   // Aufwaermen: der erste Raum der Seite vergibt andere Kennungen
          return { off: await run([0, 0]), cl: await run([0, 1]), ho: await run([1, 0]), off2: await run([0, 0]) }; })()`);
        t.note('Hash ' + r.off.h + ', Schnappschuesse ' + r.off.sl.join('/') + ' Byte, Phase ' + r.off.ph + '; 3D Client ' + JSON.stringify(r.cl.i3[1]) + ', Host ' + JSON.stringify(r.ho.i3[0]));
        t.eq(r.off2, r.off, 'ohne 3D zweimal gleich (der Lauf ist reproduzierbar)');
        t.ok(r.off.ph === 2, 'der Lauf erreicht den Ueberfall');
        t.ok(r.cl.i3[1][0] === 'an' && r.cl.i3[1][1] >= 200 && r.cl.i3[1][2] === 0 && r.cl.i3[0][1] === 0, 'Client zeichnet 3D, Host 2D: ' + JSON.stringify(r.cl.i3));
        t.ok(r.ho.i3[0][0] === 'an' && r.ho.i3[0][1] >= 200 && r.ho.i3[0][2] === 0 && r.ho.i3[1][1] === 0, 'Host zeichnet 3D, Client 2D: ' + JSON.stringify(r.ho.i3));
        t.eq(r.cl.h, r.off.h, 'Client in 3D: Zustandshash von Host und Client gleich wie ohne 3D');
        t.eq(r.ho.h, r.off.h, 'Host in 3D: Zustandshash von Host und Client gleich wie ohne 3D');
        t.eq([r.cl.sh, r.cl.sl], [r.off.sh, r.off.sl], 'Client in 3D: Schnappschuesse des Hosts bytegleich (Inhalt und Groesse)');
        t.eq([r.ho.sh, r.ho.sl], [r.off.sh, r.off.sl], 'Host in 3D: Schnappschuesse bytegleich (Inhalt und Groesse)');
        jsErr(t, P);
      } finally { await P.done(); }
    },
  },
  {
    name: '3D-Zuschauer: folgt einer Figur (Maske und Schnitt um sie), wechselt mit Pfeiltaste, freie Kamera und "alles sehen" ohne Maske und Abdunklung mit allen Figuren, der Blickpunkt folgt der Kamera',
    timeout: 240000,
    async run(t) {
      const P = await coopPage(t); if (!P) return;
      try {
        const r = await P.page.evaluate(`(async () => { const o = {};
          const G = CT.mkGame('bank', 321, 2), A = G.A; A.CFG.policeAt = 1e6; A.CFG.policeForced = 1e6;
          const pl = A.get().players; pl[1].x = pl[0].x + 300; G.run(1);
          const S = CT.addSpec(G, 'zz'); G.run(2); await S.view3d.set(true); S.draw(); const V = S.view3d.V;
          const inf = () => { S.draw(); const i = V.info(), g = S.get(), c = S.cam(); return { fk: i.fk, n: i.figs, cut: i.cut.map(Math.round), tgt: i.tgt.map(Math.round), lead: i.lead, cam: c.map(Math.round), vis: i.vis.on, key: i.vis.key, dark: i.vis.dark, fog: V.fogA(), p: [g.p.id, Math.round(g.p.x), Math.round(g.p.y)], errs: i.errs }; };
          o.f0 = inf(); S.specKey('ArrowRight', { preventDefault() {} }); G.run(2); o.f1 = inf();
          S.specKey('b'); o.all = inf(); S.specKey('b');
          S.specKey('v'); G.run(2); const c0 = inf().cam; S.keys.a = 1; G.run(.5); delete S.keys.a; G.run(4); o.free = inf(); o.moved = Math.round(c0[0] - o.free.cam[0]);
          o.total = A.get().npcs.filter(q => q.st !== 'away').length + A.get().players.length;
          S.specKey('v'); G.run(2); o.back = inf();
          await S.view3d.set(false); return o; })()`);
        const tg = q => [q.cam[0] + 480, q.cam[1] + 272 - q.lead];
        t.note('folgt ' + r.f0.p[0] + ' dann ' + r.f1.p[0] + ', Figuren ' + r.f0.n + '/' + r.all.n + '/' + r.free.n + ' (alle ' + r.total + '), freie Kamera ' + r.moved + ' px');
        t.ok(r.f0.vis && r.f0.dark > .3 && r.f0.key.startsWith(r.f0.p[1] + ',' + r.f0.p[2]), 'folgt Spieler ' + r.f0.p[0] + ': Maske aus seiner Lage (' + r.f0.key + ')');
        t.ok(r.f0.cut[2] > 0 && r.f0.cut[3] === r.f0.p[2], 'Schnitt durch Waende um die gefolgte Figur');
        t.ok(r.f1.p[0] !== r.f0.p[0] && r.f1.key.startsWith(r.f1.p[1] + ',' + r.f1.p[2]) && r.f1.cut[3] === r.f1.p[2], 'Pfeiltaste: folgt dem anderen Spieler, Maske und Schnitt wandern mit (' + JSON.stringify(r.f1) + ')');
        for (const k of ['f0', 'f1', 'all', 'free', 'back']) t.ok(Math.abs(r[k].tgt[0] - tg(r[k])[0]) <= 1 && Math.abs(r[k].tgt[1] - tg(r[k])[1]) <= 1, k + ': Blickpunkt der 3D-Kamera ist die Mitte des 2D-Ausschnitts mit Vorlauf (' + r[k].tgt + ' gegen ' + tg(r[k]) + ')');
        t.ok(!r.all.vis && r.all.fog === 0 && r.all.n >= r.f0.n, 'alles sehen: keine Maske, keine Abdunklung, mindestens so viele Figuren');
        t.ok(!r.free.vis && r.free.fog === 0 && r.free.cut[2] === 0, 'freie Kamera: keine Maske, keine Abdunklung, kein Schnitt (die Platzhalter-Figur zaehlt nicht)');
        t.ok(r.moved > 50 && Math.abs(r.free.cam[0] + 480 - r.free.p[1]) < 30, 'freie Kamera fliegt mit WASD, Kamera und Blickpunkt folgen (' + r.moved + ' px, Ziel ' + r.free.tgt + ', Figur ' + r.free.p + ')');
        t.eq(r.free.n, r.total, 'freie Kamera zeigt alle Figuren (Spieler und Personen, ohne Sichtpruefung)');
        t.ok(r.back.vis && r.back.dark > .3, 'zurueck zur Figur (V): Maske wieder an');
        t.eq([r.f0.errs, r.free.errs, r.back.errs], [0, 0, 0], 'ohne Zeichenfehler');
        jsErr(t, P);
      } finally { await P.done(); }
    },
  },
  {
    name: '3D-Funk: Markierung im Bild als Ring am Boden an toScr (Rundlauf ueber pick), Funkboegen ueber dem Kopf des Senders, ausserhalb ein Randpfeil in Richtung toScr, Bildgrenze nach der 3D-Abbildung; Fluchtwagen-Zeiger ueber dem Wagen',
    timeout: 240000,
    async run(t) {
      const P = await coopPage(t); if (!P) return;
      try {
        const r = await P.page.evaluate(`(async () => { const o = {};
          const G = CT.mkGame('bank', 321, 2), A = G.A, B = G.clients[0], cb = A.NET.conns[0], F = A.CFG.funk; A.CFG.policeAt = 1e6; A.CFG.policeForced = 1e6;
          const pl = A.get().players; pl[0].x = pl[1].x + 120; pl[0].y = pl[1].y; G.run(1);
          await B.view3d.set(true); B.draw(); const V = B.view3d.V, H = V.cfg.headH, ctx = B.cv.getContext('2d');
          const spy = () => { const tr = [], txt = [], ot = ctx.translate, ft = ctx.fillText; ctx.translate = function (x, y) { tr.push([x, y]); return ot.apply(this, arguments); }; ctx.fillText = function (s, x, y) { txt.push([String(s), x, y, ctx.getTransform()]); return ft.apply(this, arguments); }; B.draw(); ctx.translate = ot; ctx.fillText = ft; return { tr, txt }; };
          const say = (c, n, x, y) => { c.onmsg({ t: 'rad', c: n, x, y }); G.run(.3); };
          const q = B.get().p, nah = [Math.round(q.x + 60), Math.round(q.y - 140)];
          say(cb, 3, nah[0], nah[1]); B.draw(); o.f = B.view3d.funk();
          const ping = o.f.find(z => z.k === 'ping'), mk = o.f.find(z => z.k === 'mk'), ex = V.toScr(nah[0], nah[1], 0), back = V.pick(ping.s[0], ping.s[1], 0), me = B.get().me;
          o.ping = [ping.id, Math.hypot(ping.s[0] - ex[0], ping.s[1] - ex[1]), Math.hypot(back[0] - nah[0], back[1] - nah[1])];
          const eh = V.toScr(me.x, me.y, H), e0 = V.toScr(me.x, me.y, 0); o.mk = [mk && mk.id, mk && Math.hypot(mk.s[0] - eh[0], mk.s[1] - eh[1]), Math.round(e0[1] - eh[1])];
          o.edgeNah = B.edgePt(nah[0], nah[1], 14);
          // Band: im 3D-Bild, nach der 2D-Abbildung aber ausserhalb (oder umgekehrt), entlang einer Linie nach Norden und Sueden
          const cam = B.cam(), in3 = (x, y) => { const s = V.toScr(x, y, 0); return s[0] > 14 && s[0] < 946 && s[1] > 14 && s[1] < 530; }, in2 = (x, y) => x - cam[0] > 14 && x - cam[0] < 946 && y - cam[1] > 14 && y - cam[1] < 530;
          let band = null; for (let y = q.y - 600; y < q.y + 600 && !band; y += 4) if (in3(q.x, y) !== in2(q.x, y)) band = [q.x, y, in3(q.x, y)];
          o.band = band && [band[2], !!B.edgePt(band[0], band[1], 14)];
          // fern: Randpfeil in Richtung des 3D-Bildpunkts, gezeichnet am Rand
          G.run(F.same); say(cb, 3, q.x + 2400, q.y - 900); // der Host klemmt den Punkt auf die Karte
          const fp = B.funk().pings[0], fern = [fp.x, fp.y]; const d2 = spy(), e = B.edgePt(fern[0], fern[1], 14), sf = V.toScr(fern[0], fern[1], 0);
          o.fern = [!!e, e && Math.abs(e.a - Math.atan2(sf[1] - 272, sf[0] - 480)), e && Math.abs(e.a - Math.atan2(fern[1] - cam[1] - 272, fern[0] - cam[0] - 480)), e && d2.tr.some(z => Math.abs(z[0] - e.x) < .01 && Math.abs(z[1] - e.y) < .01), B.view3d.funk().filter(z => z.k === 'ping').length];
          o.scr = [B.view3d.scr(nah[0], nah[1]).map(Math.round), ex.map(Math.round)];
          // Fluchtwagen-Zeiger: Phase 2, Wagen gerufen, der Treffpunkt im Bild: Marke ueber dem Wagen an toScr in Dachhoehe
          A.startHeist(); G.run(.5); A.callVan(); G.run(.5); const Ln = A.LANE(), vm = Ln.van.mid(Ln.van.stop); for (const d of A.get().players) { d.x = vm[0]; d.y = vm[1] - 150; } G.run(1.5);
          const d3 = spy(), lab = d3.txt.find(z => z[0] === 'TREFFPUNKT' || z[0] === 'FLUCHTWAGEN'), vs = V.toScr(vm[0], vm[1], V.cfg.cars.van.h);
          o.van = lab && [lab[0], Math.round(lab[1] - vs[0]), Math.round(lab[2] - (vs[1] - 56))];
          await B.view3d.set(false); B.draw(); o.scr2D = [B.view3d.scr(nah[0], nah[1]), [nah[0] - B.cam()[0], nah[1] - B.cam()[1]]];
          return o; })()`);
        t.note('Ping ' + r.ping[1].toFixed(2) + ' px neben toScr, Rundlauf ' + r.ping[2].toFixed(2) + ' px; Boegen ' + r.mk[2] + ' px ueber dem Fusspunkt; Band ' + JSON.stringify(r.band) + '; fern ' + JSON.stringify(r.fern) + '; Wagen ' + JSON.stringify(r.van));
        t.ok(r.ping[0] === 1 && r.ping[1] < .5 && r.ping[2] < 1, 'Ring am Boden an toScr des gemeldeten Punkts, pick fuehrt auf ihn zurueck (unter 1 px): ' + JSON.stringify(r.ping));
        t.ok(r.mk[0] === 1 && r.mk[1] < .5 && r.mk[2] > 8, 'Funkboegen ueber dem Kopf des Senders (toScr in Kopfhoehe): ' + JSON.stringify(r.mk));
        t.eq(r.edgeNah, null, 'Punkt im Bild: kein Randpfeil');
        t.ok(r.band && r.band[1] === !r.band[0], 'Bildgrenze nach der 3D-Abbildung: im 3D-Bild kein Pfeil, ausserhalb ein Pfeil, auch wo 2D anders laege (' + JSON.stringify(r.band) + ')');
        t.ok(r.fern[0] && r.fern[1] < .01 && r.fern[3] && r.fern[4] === 1, 'ferner Punkt: Randpfeil in Richtung seines 3D-Bildpunkts, am Rand gezeichnet (' + JSON.stringify(r.fern) + ')');
        t.ok(r.fern[2] > .02, 'die Richtung ist eine andere als nach der 2D-Abbildung (sonst prueft der Fall nichts)');
        t.eq(r.scr[0], r.scr[1], 'scrPt in 3D gleich toScr');
        t.ok(r.van && Math.abs(r.van[1]) <= 1 && Math.abs(r.van[2]) <= 4, 'Fluchtwagen-Zeiger ueber dem Wagen an toScr in Dachhoehe (' + JSON.stringify(r.van) + ')');
        t.eq(r.scr2D[0], r.scr2D[1], 'scrPt in 2D wie bisher: Welt minus Kamera');
        jsErr(t, P);
      } finally { await P.done(); }
    },
  },
  {
    name: '3D-Wettkampf: zwei Teams auf demselben Seed, Zuschauer und je ein Spieler in 3D, Uebersichtskarte im HUD, Teamwechsel mit T zeigt die Figuren des anderen Teams, alles ohne Fehler',
    timeout: 240000,
    async run(t) {
      const P = await coopPage(t); if (!P) return;
      try {
        const r = await P.page.evaluate(`(async () => { const o = {};
          const D = CT.mkDuel(2, 2); D.A.CFG.duel.len = 3; D.A.CFG.duel.specDelay = D.B.CFG.duel.specDelay = 2; D.A.duelOpen(); D.run(.3); D.B.duelJoin(D.A.NET.code); D.run(1.5);
          const S = CT.addSpec({ net: D.net, A: D.A, insts: D.insts }); D.run(2); D.A.duelReady(); D.B.duelReady(); D.run(9);
          const all = [S, D.pa[1], D.pb[1]]; for (const d of all) await d.view3d.set(true); D.run(1);
          const ctx = S.cv.getContext('2d'), txt = [], ft = ctx.fillText; ctx.fillText = function (s) { txt.push(String(s)); return ft.apply(this, arguments); }; for (const d of all) d.draw(); ctx.fillText = ft;
          o.lauf = [S.state().scr, S.sp2() && S.sp2().live, D.A.LAY().seed === D.B.LAY().seed];
          o.i = all.map(d => { const f = d.view3d.info(); return [f.state, f.frames, f.errs, (f.fk || {}).pl || 0]; });
          o.karte = [txt.some(s => /Team wechseln/.test(s)), S.spMap().own.length, S.spMap().other.length];
          S.specKey('t'); D.run(.5); S.draw(); const f = S.view3d.info();
          o.tausch = [S.NET.code === D.B.NET.code, f.errs, f.frames > o.i[0][1], (f.fk || {}).pl || 0];
          for (const d of all) await d.view3d.set(false); return o; })()`);
        t.note('3D (Zustand, Bilder, Fehler, Spieler im Bild) Zuschauer ' + JSON.stringify(r.i[0]) + ', Team A ' + JSON.stringify(r.i[1]) + ', Team B ' + JSON.stringify(r.i[2]) + '; nach T ' + JSON.stringify(r.tausch));
        t.eq(r.lauf, ['play', true, true], 'Wettkampf laeuft, Zuschauer mit Zweitverbindung, gleicher Seed');
        for (const q of r.i) t.ok(q[0] === 'an' && q[1] >= 1 && q[2] === 0, '3D an und ohne Fehler: ' + JSON.stringify(q));
        t.ok(r.karte[0] && r.karte[1] === 2 && r.karte[2] === 2, 'Uebersichtskarte mit beiden Teams und Hinweis T im HUD ueber der 3D-Welt (' + JSON.stringify(r.karte) + ')');
        t.ok(r.tausch[0] && r.tausch[1] === 0 && r.tausch[2] && r.tausch[3] >= 1, 'T: Welt des anderen Teams in 3D, zeichnet weiter ohne Fehler mit dessen Spielern (' + JSON.stringify(r.tausch) + ')');
        jsErr(t, P);
      } finally { await P.done(); }
    },
  },
];
