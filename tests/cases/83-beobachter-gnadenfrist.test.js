// Leises Vorgehen fuer Einsteiger (Tills Wunsch: im Coop fuehlt sich ein Rucksack in Sicht von Kameras und Wachen unfair an): Paket 1 aus dem Vorschlag.
// Beobachterregeln (CFG.watch): In Sperrzone oder beim Stehlen (E gehalten an einer Beute-Stelle, o.thf) sehen alle mit der vollen Rate (Wache 48, Angestellte 34, Kamera 26).
// Nur Beute in der Tasche: Kameras ignorieren es, Wache (carry.grd 20) und Angestellte (carry.staff 10) finden es langsam verdaechtig, die Wache bleibt stehen und schaut.
// Gnadenfrist: Bei 100 laeuft ein Countdown (grace 4 s, im Coop mal 1 + susPer * (n - 1)), faellt der Balken unter back (70 %), ist der Alarm abgewendet, sonst startet der erzwungene Ueberfall. Netz: g[24], VER 19.
// Leiser Coop (Oktober 2026): Der Abbau (down 9 pro s) laeuft auch bei Sicht weiter (net 1: der Balken waechst um Rate minus down, die gemessenen Raten unten sind deshalb Rate minus down),
// ein Beobachter starrt hoechstens stare s (1,5) auf einen Traeger und geht dann cool s (4) wieder seinen Weg, und Museumswachen sehen nur im Gebaeude.
async function setup(t) {
  await t.loadTool('loopnet.js');
  await t.loadInpage('coop.js');
}

// Hilfsfunktionen in der Seite: Beobachter isolieren, einen Punkt im Sichtfeld und ausserhalb der Sperrzone finden, Beobachtung pro Schritt halten
const HELP = `(() => {
  const D = __dbg, W = () => D.world();
  const isolate = (keep, camKeep) => { D.get().npcs.forEach(q => { if (q !== keep) q.st = 'away'; }); D.get().cams.forEach((c, i) => { if (camKeep == null || i !== camKeep) c.off = true; }); };
  const spotFor = (q, hot) => { for (const a of [0, Math.PI / 2, Math.PI, -Math.PI / 2, .6, -.6, 2.5, -2.5]) for (const d of [60, 45, 80]) { const x = q.x + Math.cos(a) * d, y = q.y + Math.sin(a) * d; if (D.isSol(Math.floor(x / 32), Math.floor(y / 32)) || !D.los(q.x, q.y, x, y)) continue; if (!hot && W().restricted(x, y)) continue; return { x, y, a }; } return null; };
  return { D, isolate, spotFor };
})()`;

module.exports = [
  {
    name: 'Beobachter: Wache sieht nur Beute langsam (20/s minus Abbau), beim Stehlen oder in der Sperrzone voll (48/s minus Abbau), ohne Beute nichts, und bleibt stehen und schaut',
    async run(t) {
      const r = await t.page.evaluate(`(() => { const H = ${HELP}, D = H.D; D.setScenario('jewel'); D.setSeedMode('random'); D.setLage([]); D.buildSeed(654); D.CFG.watch.grace = 0;
        const g = D.get().npcs.find(q => q.k === 'grd'), me = D.get().me; H.isolate(g, -1); const sp = H.spotFor(g, false); if (!sp) return { err: 'kein Punkt im Sichtfeld der Wache' };
        const run = (units, thf, secs, lootV) => { D.setSus(0); me.units = units; me.loot = lootV != null ? lootV : units * 1000; g.look = null; const g0 = [g.x, g.y]; let s = 0; for (let i = 0; i < secs * 30; i++) { g.x = g0[0]; g.y = g0[1]; g.a = sp.a; me.x = sp.x; me.y = sp.y; me.thf = thf; D.update(1 / 30); s++; } return D.get().sus / (s / 30); };
        const o = { lg: D.lgM('sus'), dn: D.CFG.watch.net ? D.CFG.watch.down : 0 };
        o.leer = run(0, 0, .5); o.material = run(1, 0, .5, 0); o.carry = run(1, 0, .5); o.theft = run(0, 1, .5);
        // Sperrzone: Wache und Spieler in der Mitte einer Zone mit Sicht, Rucksack
        const zn = D.LAY().zones[0], zx = (zn[0] + zn[2]) / 2 * 32 + 16, zy = (zn[1] + zn[3]) / 2 * 32 + 16; o.zone = null;
        o.look = (() => { D.setSus(0); me.units = 1; me.loot = 1000; me.thf = 0; g.look = null; for (let i = 0; i < 15; i++) { me.x = sp.x; me.y = sp.y; me.thf = 0; g.a = sp.a; D.update(1 / 30); } return !!(g.look && g.look.t > 0); })();
        return o; })()`);
      t.ok(!r.err, r.err);
      const wc = 20 * r.lg - r.dn, wt = 48 * r.lg - r.dn;   // Rate minus Abbau
      t.ok(Math.abs(r.carry - wc) < wc * .12 + .3, 'Rucksack: ' + r.carry.toFixed(1) + ' pro s, erwartet ' + wc.toFixed(1));
      t.ok(Math.abs(r.theft - wt) < wt * .12 + .3, 'Stehlen: ' + r.theft.toFixed(1) + ' pro s, erwartet ' + wt.toFixed(1));
      t.ok(r.leer <= 0.01, 'ohne Beute und nicht beim Stehlen sieht die Wache nichts: ' + r.leer);
      t.ok(r.material <= 0.01, 'Material im Rucksack (Brettersatz, zerlegte Moebel, Paket P2) ist keine Beute: die Wache sieht nichts: ' + r.material);
      t.eq(r.look, true, 'die Wache schaut zum Spieler mit dem Rucksack (look)');
    },
  },
  {
    name: 'Beobachter: Angestellte (Kassierer) finden den Rucksack nur sehr langsam verdaechtig (10/s minus Abbau), beim Stehlen voll (34/s minus Abbau)',
    async run(t) {
      const r = await t.page.evaluate(`(() => { const H = ${HELP}, D = H.D; D.setScenario('bank'); D.setSeedMode('classic'); D.setLage([]); D.buildSeed('classic'); D.CFG.watch.grace = 0;
        const tel = D.get().npcs.find(q => q.k === 'tel'), me = D.get().me; H.isolate(tel, -1);
        // Kassierer schauen nach Sueden (base), Spieler davor
        let sp = null; for (const d of [60, 80, 100, 50]) { const x = tel.x, y = tel.y + d; if (!D.isSol(Math.floor(x / 32), Math.floor(y / 32)) && D.los(tel.x, tel.y, x, y) && !D.world().restricted(x, y)) { sp = { x, y }; break; } }
        if (!sp) return { err: 'kein freier Punkt vor dem Kassierer' };
        const run = (units, thf) => { D.setSus(0); me.units = units; me.loot = (units) * 1000; let s = 0; for (let i = 0; i < 15; i++) { me.x = sp.x; me.y = sp.y; me.thf = thf; D.update(1 / 30); s++; } return D.get().sus / (s / 30); };
        return { lg: D.lgM('sus'), dn: D.CFG.watch.net ? D.CFG.watch.down : 0, carry: run(1, 0), theft: run(0, 1), leer: run(0, 0) }; })()`);
      t.ok(!r.err, r.err);
      const sc = 10 * r.lg - r.dn, st = 34 * r.lg - r.dn;
      t.ok(Math.abs(r.carry - sc) < Math.abs(sc) * .15 + .3, 'Rucksack: ' + r.carry.toFixed(1) + ' pro s, erwartet ' + sc.toFixed(1));
      t.ok(Math.abs(r.theft - st) < st * .15 + .3, 'Stehlen: ' + r.theft.toFixed(1) + ' pro s, erwartet ' + st.toFixed(1));
      t.ok(r.leer <= 0.01, 'ohne Beute nichts: ' + r.leer);
    },
  },
  {
    name: 'Beobachter: Kameras ignorieren den Rucksack ausserhalb der Sperrzone, sehen aber das Stehlen (26/s minus Abbau)',
    async run(t) {
      const r = await t.page.evaluate(`(() => { const H = ${HELP}, D = H.D; D.setScenario('bank'); D.setSeedMode('classic'); D.setLage([]); D.buildSeed('classic'); D.CFG.watch.grace = 0;
        const me = D.get().me, cams = D.get().cams; let ci = -1, sp = null;
        for (let i = 0; i < cams.length && ci < 0; i++) { const c = cams[i]; for (const d of [100, 70, 130, 50]) { const a = c.a0, x = c.x + Math.cos(a) * d, y = c.y + Math.sin(a) * d; if (D.isSol(Math.floor(x / 32), Math.floor(y / 32)) || !D.los(c.x, c.y, x, y) || D.world().restricted(x, y)) continue; if (D.canSee(c.x, c.y, a, c.fov, c.rng, x, y)) { ci = i; sp = { x, y }; break; } } }
        if (ci < 0) return { err: 'keine Kamera mit freiem Punkt im Kegel ausserhalb der Sperrzone' };
        H.isolate(null, ci); D.get().cams[ci].amp = 0; D.get().cams[ci].off = false;
        const run = (units, thf) => { D.setSus(0); me.units = units; me.loot = (units) * 1000; let s = 0; for (let i = 0; i < 15; i++) { me.x = sp.x; me.y = sp.y; me.thf = thf; D.update(1 / 30); s++; } return D.get().sus / (s / 30); };
        return { lg: D.lgM('sus'), dn: D.CFG.watch.net ? D.CFG.watch.down : 0, carry: run(1, 0), theft: run(0, 1) }; })()`);
      t.ok(!r.err, r.err);
      t.ok(r.carry <= 0.01, 'Rucksack allein: die Kamera reagiert nicht (' + r.carry + ')');
      const wk = 26 * r.lg - r.dn;
      t.ok(Math.abs(r.theft - wk) < wk * .15 + .3, 'beim Stehlen im Kegel: ' + r.theft.toFixed(1) + ' pro s, erwartet ' + wk.toFixed(1));
    },
  },
  {
    name: 'Beobachter: echtes Stehlen (E gehalten an einer Vitrine) setzt den Diebstahl-Merker, er klingt nach 0,6 s ab; Museum: Wachen sehen jeden im Gebaeude',
    async run(t) {
      const r = await t.page.evaluate(`(() => { const H = ${HELP}, D = H.D, o = {}; D.setScenario('jewel'); D.setSeedMode('random'); D.setLage([]); D.buildSeed(654); D.CFG.watch.grace = 0;
        const me = D.get().me; D.get().npcs.forEach(q => { q.st = 'away'; });
        // Standpunkt wie tools/stealth.js: Kachelrand (Figurenradius 9), erreichbar vom Spawn, innerhalb der Reichweite der Vitrine
        const spot = it => { const L = D.LAY(); let best = 1e9, at = null; for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) { const tx = Math.floor(it.x / 32) + dx, ty = Math.floor(it.y / 32) + dy; if (D.isSol(tx, ty)) continue;
          const cx = Math.max(tx * 32 + 9, Math.min(tx * 32 + 23, it.x)), cy = Math.max(ty * 32 + 9, Math.min(ty * 32 + 23, it.y)), d = Math.hypot(cx - it.x, cy - it.y); if (d >= (it.r || 44) * .95) continue;
          const pl = D.pathTo(L.spawn.x, L.spawn.y, tx, ty).length; if (!pl) continue; const sc = pl + d * .05; if (sc < best) { best = sc; at = { x: cx, y: cy }; } } return at; };
        let vit = null, sp = null; for (const it of D.get().its.filter(i => i.t === 'vit')) { sp = spot(it); if (sp) { vit = it; break; } }
        if (!sp) return { err: 'kein Standpunkt an einer Vitrine' };
        D.keys.e = 1; for (let i = 0; i < 6; i++) { me.x = sp.x; me.y = sp.y; D.update(1 / 30); } o.beimStehlen = me.thf || 0; o.pr = vit.pr;
        D.keys.e = 0; for (let i = 0; i < 6; i++) { me.x = sp.x; me.y = sp.y; D.update(1 / 30); } o.kurz = me.thf || 0; for (let i = 0; i < 18; i++) { me.x = sp.x; me.y = sp.y; D.update(1 / 30); } o.nachher = me.thf || 0;
        // Museum: Wache ohne Beute und ausserhalb der Sperrzone
        D.setScenario('museum'); D.setSeedMode('random'); D.setLage([]); D.buildSeed(31); D.CFG.watch.grace = 0; const g = D.get().npcs.find(q => q.k === 'grd'), m2 = D.get().me; H.isolate(g, -1); const sp2 = H.spotFor(g, false);
        if (!sp2) { o.museum = 'kein Punkt'; return o; }
        D.setSus(0); m2.units = 0; m2.loot = 0; const g0 = [g.x, g.y]; let s = 0; for (let i = 0; i < 6; i++) { g.x = g0[0]; g.y = g0[1]; g.a = sp2.a; m2.x = sp2.x; m2.y = sp2.y; D.update(1 / 30); s++; }
        o.museum = D.get().sus / (s / 30); o.seen = D.CFG.museum.seen * D.lgM('sus') - (D.CFG.watch.net ? D.CFG.watch.down : 0); return o; })()`);
      t.ok(!r.err, r.err);
      t.ok(r.beimStehlen > .3, 'beim Stehlen gesetzt: ' + r.beimStehlen + ' (Fortschritt ' + r.pr + ')');
      t.ok(r.kurz > 0, 'direkt nach dem Loslassen noch kurz gesetzt: ' + r.kurz);
      t.eq(r.nachher, 0, 'nach 0,8 s weg');
      t.ok(r.museum !== 'kein Punkt', 'Punkt im Sichtfeld der Museumswache');
      t.ok(Math.abs(r.museum - r.seen) < r.seen * .15, 'Museum: Wache sieht auch ohne Beute mit CFG.museum.seen: ' + r.museum + ' gegen ' + r.seen);
    },
  },
  {
    name: 'Museum: die Wache sieht niemanden draussen vor dem Fenster (auch nicht durch das Glas), im Gebaeude jeden',
    async run(t) {
      const r = await t.page.evaluate(`(() => { const H = ${HELP}, D = H.D, o = {}; D.setScenario('museum'); D.setSeedMode('random'); D.setLage([]); D.setTurn('S'); D.buildSeed(31); D.CFG.watch.grace = 0;
        const L = D.LAY(), B = L.bld, Wd = D.world(), T = 32, ins = (tx, ty) => tx > B.x0 && tx < B.x1 && ty > B.y0 && ty < B.y1, free = (tx, ty) => !D.isSol(tx, ty), mid = (tx, ty) => [tx * T + 16, ty * T + 16];
        // Ein Fenster oder eine Glastuer in der Huelle: drinnen vier freie Kacheln hintereinander, draussen zwei (nicht in der Sperrzone Nord oder Ost), Sicht durch das Glas
        let pair = null;
        for (let ty = B.y0; ty <= B.y1 && !pair; ty++) for (let tx = B.x0; tx <= B.x1 && !pair; tx++) { const c = Wd.cell(tx, ty); if (c !== 'W' && c !== 'D') continue;
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { let ok = true;
            for (let k = 1; k <= 4; k++) if (!ins(tx + dx * k, ty + dy * k) || !free(tx + dx * k, ty + dy * k)) ok = false;
            for (let k = 1; k <= 2; k++) if (ins(tx - dx * k, ty - dy * k) || !free(tx - dx * k, ty - dy * k)) ok = false;
            if (!ok) continue; const gi = mid(tx + dx * 2, ty + dy * 2), po = mid(tx - dx * 2, ty - dy * 2), pi = mid(tx + dx, ty + dy), gf = mid(tx + dx * 4, ty + dy * 4);
            if (!Wd.restricted(po[0], po[1]) && !Wd.restricted(pi[0], pi[1]) && D.los(gi[0], gi[1], po[0], po[1]) && D.los(gf[0], gf[1], pi[0], pi[1])) { pair = { gi, po, pi, gf, d: [dx, dy] }; break; } } }
        if (!pair) return { err: 'kein Fenster mit freier Sicht gefunden' };
        const g = D.get().npcs.find(q => q.k === 'grd'), me = D.get().me; H.isolate(g, -1);
        const run = (gp, pp, units, thf) => { D.setSus(0); me.units = units; me.loot = units * 1000; let s = 0; for (let i = 0; i < 15; i++) { g.x = gp[0]; g.y = gp[1]; g.a = Math.atan2(pp[1] - gp[1], pp[0] - gp[0]); me.x = pp[0]; me.y = pp[1]; me.thf = thf; D.update(1 / 30); s++; } return D.get().sus / (s / 30); };
        const ga = (gp, pp) => Math.atan2(pp[1] - gp[1], pp[0] - gp[0]);
        o.sieht = D.canSee(pair.gi[0], pair.gi[1], ga(pair.gi, pair.po), g.fov, g.rng, pair.po[0], pair.po[1]);   // ohne die Regel wuerde die Wache durch das Glas sehen
        o.draussen = run(pair.gi, pair.po, 0, 0); o.drinnen = run(pair.gf, pair.pi, 0, 0);
        o.seen = D.CFG.museum.seen * D.lgM('sus') - (D.CFG.watch.net ? D.CFG.watch.down : 0);
        // Der Startpunkt liegt vor dem Eingang, ausserhalb der Huelle (mit Beute draussen ist man ohnehin raus, secure)
        o.spawnDraussen = !ins(Math.floor(L.spawn.x / T), Math.floor(L.spawn.y / T));
        return o; })()`);
      t.ok(!r.err, r.err);
      t.eq(r.sieht, true, 'Sichtlinie durch das Glas besteht (die Wache koennte den Spieler sehen)');
      t.ok(r.draussen <= .01, 'draussen vor dem Fenster: kein Verdacht (' + r.draussen + ' pro s)');
      t.ok(Math.abs(r.drinnen - r.seen) < r.seen * .15 + .3, 'im Gebaeude sieht die Wache jeden mit CFG.museum.seen: ' + r.drinnen.toFixed(1) + ' gegen ' + r.seen.toFixed(1));
      t.eq(r.spawnDraussen, true, 'der Startpunkt liegt ausserhalb der Gebaeudekacheln');
    },
  },
  {
    name: 'Starren: ein Beobachter schaut hoechstens stare s auf einen Traeger, geht cool s lang wieder seinen Weg und schaut dann erneut; der Balken waechst in der Zeit weiter',
    async run(t) {
      const r = await t.page.evaluate(`(() => { const H = ${HELP}, D = H.D, o = {}; D.setScenario('jewel'); D.setSeedMode('random'); D.setLage([]); D.buildSeed(654); D.CFG.watch.grace = 999;
        const g = D.get().npcs.find(q => q.k === 'grd'), me = D.get().me; H.isolate(g, -1); const sp = H.spotFor(g, false); if (!sp) return { err: 'kein Punkt im Sichtfeld der Wache' };
        const W = D.CFG.watch, g0 = [g.x, g.y], run = (stare) => { W.stare = stare; D.buildSeed(654); D.CFG.watch.grace = 999; const gg = D.get().npcs.find(q => q.k === 'grd'), m = D.get().me; H.isolate(gg, -1); D.setSus(0);
          const at = {}, sus = {}; for (let i = 0; i <= 30 * 7; i++) { gg.x = g0[0]; gg.y = g0[1]; gg.a = sp.a; m.x = sp.x; m.y = sp.y; m.units = 1; m.loot = 1000; m.thf = 0; D.update(1 / 30); const tt = Math.round(i / 30 * 10) / 10; at[tt] = !!(gg.look && gg.look.t > 0); sus[tt] = D.get().sus; } return { at, sus }; };
        const a = run(W.stare), b = run(0); o.stare = W.stare; o.cool = W.cool; o.a = [a.at[.5], a.at[1.2], a.at[3.5], a.at[5.0], a.at[6.2], a.at[6.8]]; o.b = [b.at[.5], b.at[3.5], b.at[6.8]];
        o.rateKuehl = (a.sus[4.5] - a.sus[2.5]) / 2; o.lg = D.lgM('sus'); o.dn = W.net ? W.down : 0; return o; })()`);
      t.ok(!r.err, r.err);
      t.eq(r.a, [true, true, false, false, true, true], 'mit Grenze: schaut, wendet sich ab (' + r.stare + ' s Hinsehen, ' + r.cool + ' s Weitergehen), schaut wieder');
      t.eq(r.b, [true, true, true], 'stare 0: der Beobachter bleibt, solange er den Traeger sieht');
      const w = 20 * r.lg - r.dn;
      t.ok(Math.abs(r.rateKuehl - w) < w * .15 + .3, 'der Balken waechst waehrend des Weitergehens mit derselben Rate: ' + r.rateKuehl.toFixed(1) + ' gegen ' + w.toFixed(1));
    },
  },
  {
    name: 'Abbau laeuft bei Sicht weiter (net): eine Rate unter CFG.watch.down senkt den Balken, mit net 0 steigt er; ohne Beobachter sinkt er mit down',
    async run(t) {
      const r = await t.page.evaluate(`(() => { const H = ${HELP}, D = H.D, o = {}; D.setScenario('jewel'); D.setSeedMode('random'); D.setLage([]); D.buildSeed(654); D.CFG.watch.grace = 0; D.CFG.watch.stare = 0;
        const g = D.get().npcs.find(q => q.k === 'grd'), me = D.get().me; H.isolate(g, -1); const sp = H.spotFor(g, false); if (!sp) return { err: 'kein Punkt im Sichtfeld der Wache' };
        const W = D.CFG.watch, g0 = [g.x, g.y]; W.carry.grd = 5;   // unter down
        const run = (net, see, secs) => { W.net = net; D.setSus(50); me.units = see ? 1 : 0; me.loot = (see ? 1 : 0) * 1000; for (let i = 0; i < secs * 30; i++) { g.x = g0[0]; g.y = g0[1]; g.a = sp.a; me.x = see ? sp.x : 0; me.y = see ? sp.y : 4000; me.thf = 0; D.update(1 / 30); } return D.get().sus - 50; };
        o.lg = D.lgM('sus'); o.down = W.down; o.netSicht = run(1, true, 1); o.altSicht = run(0, true, 1); o.netLeer = run(1, false, 1); o.altLeer = run(0, false, 1); W.down = 3; o.drei = run(1, false, 2); return o; })()`);
      t.ok(!r.err, r.err);
      t.ok(Math.abs(r.netSicht - (5 * r.lg - r.down)) < 1, 'net 1: bei Rate 5 sinkt der Balken um ' + r.down + ' minus 5 pro s: ' + r.netSicht.toFixed(1));
      t.ok(Math.abs(r.altSicht - 5 * r.lg) < 1, 'net 0: bei Sicht steigt er mit der Rate 5: ' + r.altSicht.toFixed(1));
      t.ok(Math.abs(r.netLeer + r.down) < 1 && Math.abs(r.altLeer + r.down) < 1, 'ohne Beobachter sinkt er mit down in beiden Faellen: ' + r.netLeer.toFixed(1) + ' / ' + r.altLeer.toFixed(1));
      t.ok(Math.abs(r.drei + 6) < 1, 'down 3 senkt 2 s lang um 6: ' + r.drei.toFixed(1));
    },
  },
  {
    name: 'Gnadenfrist: bei 100 laeuft ein Countdown (kein sofortiger Alarm), er endet im erzwungenen Ueberfall, F und grace 0 verhalten sich wie vorher',
    async run(t) {
      const r = await t.page.evaluate(`(() => { const H = ${HELP}, D = H.D, o = {}; D.setScenario('jewel'); D.setSeedMode('random'); D.setLage([]); D.buildSeed(654);
        const g = D.get().npcs.find(q => q.k === 'grd'), me = D.get().me; H.isolate(g, -1); const sp = H.spotFor(g, false); const g0 = [g.x, g.y];
        const see = (secs, on) => { for (let i = 0; i < secs * 30; i++) { g.x = g0[0]; g.y = g0[1]; g.a = sp.a; if (on) { me.x = sp.x; me.y = sp.y; me.units = 1; me.loot = 1000; me.thf = 1; } else { me.x = 0; me.y = 4000; me.units = 0; me.loot = 0; me.thf = 0; } D.update(1 / 30); if (D.get().phase !== 1) break; } };
        // 1) Beobachtung bis 100: Countdown, noch Phase 1
        D.setSus(0); D.CFG.watch.grace = 4; see(3, true); o.sus1 = D.get().sus; o.alarmT1 = D.get().alarmT; o.phase1 = D.get().phase; o.msg = D.msgs().feed.filter(f => /Entdeckt/.test(f));
        // 2) Weiter beobachtet: nach 4 s erzwungener Ueberfall
        let tt = 0; for (let i = 0; i < 30 * 8 && D.get().phase === 1; i++) { see(1 / 30, true); tt += 1 / 30; } o.phase2 = D.get().phase; o.dauer = +tt.toFixed(1);
        // 3) Abbruch: neues Spiel, Balken auf 100, dann aus dem Blick
        D.buildSeed(654); D.CFG.watch.grace = 4; const g2 = D.get().npcs.find(q => q.k === 'grd'), m2 = D.get().me; H.isolate(g2, -1);
        D.setSus(100); const f = () => { m2.x = 0; m2.y = 4000; m2.units = 0; m2.loot = 0; m2.thf = 0; D.update(1 / 30); };
        D.get().me.units = 1; D.get().me.loot = 1000; D.setSus(100); m2.x = sp.x; m2.y = sp.y; m2.thf = 1; for (let i = 0; i < 3; i++) { g2.x = g0[0]; g2.y = g0[1]; g2.a = sp.a; D.update(1 / 30); }
        o.start = D.get().alarmT; let k = 0; while (D.get().alarmT > 0 && k < 30 * 8) { f(); k++; } o.abgewendet = [D.get().phase, D.get().alarmT, +(k / 30).toFixed(1), D.get().sus < 70]; o.msg2 = D.msgs().feed.some(x => /abgewendet/.test(x));
        for (let i = 0; i < 30 * 10; i++) f(); o.dannNoch = D.get().phase;
        // 4) grace 0: sofort
        D.buildSeed(654); D.CFG.watch.grace = 0; D.setSus(100); const m3 = D.get().me, g3 = D.get().npcs.find(q => q.k === 'grd'); H.isolate(g3, -1); m3.x = sp.x; m3.y = sp.y; m3.units = 1; m3.loot = 1000; m3.thf = 1; g3.x = g0[0]; g3.y = g0[1]; g3.a = sp.a; D.update(1 / 30); o.grace0 = D.get().phase;
        // 5) F waehrend des Countdowns: Ueberfall, Countdown weg
        D.buildSeed(654); D.CFG.watch.grace = 4; D.setSus(100); const m4 = D.get().me, g4 = D.get().npcs.find(q => q.k === 'grd'); H.isolate(g4, -1); m4.x = sp.x; m4.y = sp.y; m4.units = 1; m4.loot = 1000; m4.thf = 1; g4.x = g0[0]; g4.y = g0[1]; g4.a = sp.a; D.update(1 / 30);
        o.vorF = D.get().alarmT; D.startHeist(false, m4); o.nachF = [D.get().phase, D.get().alarmT];
        return o; })()`);
      t.ok(r.sus1 >= 99.9, 'Balken voll: ' + r.sus1);
      t.ok(r.alarmT1 > 0 && r.alarmT1 <= 4, 'Countdown laeuft: ' + r.alarmT1); t.eq(r.phase1, 1, 'noch kein Alarm');
      t.ok(r.msg.length >= 1 && /Wache/.test(r.msg[0]), 'Meldung nennt die Quelle: ' + JSON.stringify(r.msg));
      t.eq(r.phase2, 2, 'nach Ablauf erzwungener Ueberfall'); t.ok(r.dauer > 2 && r.dauer < 5.5, 'Rest des Countdowns ' + r.dauer + ' s');
      t.ok(r.start > 3, 'Countdown startet mit CFG.watch.grace: ' + r.start);
      t.eq(r.abgewendet[0], 1, 'aus dem Blick: kein Alarm'); t.eq(r.abgewendet[1], 0, 'Countdown beendet'); t.eq(r.abgewendet[3], true, 'unter 70 Prozent');
      t.ok(r.abgewendet[2] > 2.5 && r.abgewendet[2] < 5, 'Abbau von 100 auf unter 70 dauert ' + r.abgewendet[2] + ' s (9 pro s)'); t.eq(r.msg2, true, 'Meldung Alarm abgewendet'); t.eq(r.dannNoch, 1, 'danach bleibt es ruhig');
      t.eq(r.grace0, 2, 'grace 0: Alarm sofort wie vorher');
      t.ok(r.vorF > 0, 'Countdown lief'); t.eq(r.nachF, [2, 0], 'F zieht die Waffe und beendet den Countdown');
    },
  },
  {
    name: 'Gnadenfrist im Coop: der Client sieht den Countdown (Schnappschuss, HUD), der Alarm nennt den Spieler, Abbruch wird bei allen sichtbar',
    async run(t) {
      await setup(t);
      const r = await t.page.evaluate(() => {
        const out = {}, G = CT.mkGame('jewel', 654, 2), A = G.A, B = G.clients[0], g = A.get().npcs.find(q => q.k === 'grd'), p1 = A.get().players[1];
        A.get().npcs.forEach(q => { if (q !== g) q.st = 'away'; }); A.get().cams.forEach(c => { c.off = true; });
        let sp = null; for (const a of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) { const x = g.x + Math.cos(a) * 50, y = g.y + Math.sin(a) * 50; if (!A.isSol(Math.floor(x / 32), Math.floor(y / 32)) && A.los(g.x, g.y, x, y) && !A.world().restricted(x, y)) { sp = { x, y, a }; break; } }
        if (!sp) return { err: 'kein Punkt' }; const g0 = [g.x, g.y];
        out.max = A.CFG.watch.grace * (1 + A.CFG.susPer); A.setSus(99); for (let i = 0; i < 30; i++) { g.x = g0[0]; g.y = g0[1]; g.a = sp.a; p1.x = sp.x; p1.y = sp.y; p1.units = 1; p1.loot = 1000; p1.thf = 1; step(G.insts, G.net, 1 / 60); }
        G.run(.2); out.host = A.get().alarmT; out.client = B.get().alarmT; out.phase = [A.get().phase, B.get().phase]; out.feedB = B.msgs().feed.filter(f => /Entdeckt/.test(f));
        const draw = [], ctx = B.cv.getContext('2d'), o0 = ctx.fillText; ctx.fillText = function (s) { draw.push(String(s)); return o0.apply(this, arguments); }; try { B.draw(); } finally { ctx.fillText = o0; }
        out.hud = draw.find(s => /^ENTDECKT! Alarm in/.test(s)) || null;
        // Abbruch: aus dem Blick
        p1.units = 0; p1.loot = 0; p1.thf = 0; p1.x = A.get().players[0].x; p1.y = A.get().players[0].y; A.get().players[0].units = 0; A.get().players[0].loot = 0; for (let i = 0; i < 60 * 7; i++) { p1.thf = 0; p1.units = 0; p1.loot = 0; step(G.insts, G.net, 1 / 60); }   // zu zweit baut sich der Balken mit 9 / (1 + susPer) pro s ab: 30 Prozent in 5 s
        out.abgewendet = [A.get().alarmT, B.get().alarmT, A.get().phase, B.msgs().feed.some(f => /abgewendet/.test(f))];
        return out;
      });
      t.ok(!r.err, r.err);
      t.ok(r.host > 0 && r.host <= r.max + .1 && Math.abs(r.client - r.host) < 1.2, 'Host und Client kennen den Countdown (zu zweit hoechstens grace mal 1 + susPer = ' + r.max + ' s): ' + r.host + ' / ' + r.client); t.eq(r.phase, [1, 1], 'noch Phase 1');
      t.ok(r.feedB.length >= 1 && /Blau/.test(r.feedB[0]), 'Meldung nennt Blau: ' + JSON.stringify(r.feedB));
      t.ok(/s$/.test(r.hud || ''), 'HUD zeigt den Countdown: ' + r.hud);
      t.eq(r.abgewendet.slice(0, 3), [0, 0, 1], 'Abbruch bei Host und Client, noch Phase 1'); t.eq(r.abgewendet[3], true, 'Client liest Alarm abgewendet');
    },
  },
];
