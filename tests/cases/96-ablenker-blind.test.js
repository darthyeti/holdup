// MRU 1 A2 (docs/major-release-update-1.md, docs/ideen-und-planung.md, Zusaetze): Der Ablenker macht Angestellte blind. Solange er piept (decT 11 s, vorher 8), sind Kassierer und Manager (k tel und mgr) im Radius decR (380 px)
// blind fuer die Spieler: Sie tragen nichts zum Verdacht bei, weder beim Stehlen noch mit Beute in der Tasche noch beim Herumstehen (die zwei Schleifen im Beobachterblock von hostStep). Die Wache am Ablenker sieht weiter alles in ihrem
// Kegel (sie geht hin und wartet decHold 10 s, vorher 6), die Kameras bleiben aktiv, und blinde Angestellte tragen ein durchgestrichenes Auge ueber dem Kopf (drawGad, der Client rechnet es aus dem Schnappschuss-Feld dy und den
// Positionen der NPCs). Messung am Verdacht: Wache und Angestellte stehen fest, der Spieler steht im Kegel und traegt Beute, die Raten sind hoch gesetzt (carry 40), damit der Abbau (down 9) sie nicht verdeckt.
const HELP = `(() => {
  const D = __dbg, W = () => D.world();
  const isolate = (keep, camKeep) => { D.get().npcs.forEach(q => { if (q !== keep) q.st = 'away'; }); D.get().cams.forEach((c, i) => { if (camKeep == null || i !== camKeep) c.off = true; }); };
  const spotFor = (q, hot) => { for (const a of [0, Math.PI / 2, Math.PI, -Math.PI / 2, .6, -.6, 2.5, -2.5]) for (const d of [60, 45, 80]) { const x = q.x + Math.cos(a) * d, y = q.y + Math.sin(a) * d; if (D.isSol(Math.floor(x / 32), Math.floor(y / 32)) || !D.los(q.x, q.y, x, y)) continue; if (!hot && W().restricted(x, y)) continue; return { x, y, a }; } return null; };
  // Aufbau: Juwelier Seed 654 (klassische Huelle), ein Ablenker im Vorrat, Raten hoch, kein Starren, keine Gnadenfrist; kind ist tel, mgr oder grd
  const setup = kind => { D.CFG.jewGen.on = 0; D.setScenario('jewel'); D.setSeedMode('random'); D.setLage([]); D.sessReset(); D.SESSION.cons = { dc: 3 }; D.buildSeed(654);
    D.CFG.watch.grace = 0; D.CFG.watch.stare = 0; D.CFG.watch.carry = { grd: 40, staff: 40 };
    const q = D.get().npcs.find(n => n.k === kind), me = D.get().me; isolate(q); const sp = spotFor(q, false); return { q, me, sp }; };
  // eine Sekunde Spielzeit in Schritten, Beobachter und Spieler festgehalten, Rueckgabe: Verdacht
  const hold = (q, me, sp, secs, loot) => { for (let i = 0; i < secs * 30; i++) { q.x = q.gx; q.y = q.gy; q.a = sp.a; q.look = { x: sp.x, y: sp.y, t: .7 }; me.x = sp.x; me.y = sp.y; me.units = loot ? 1 : 0; me.loot = loot ? 1000 : 0; me.thf = 0; D.update(1 / 30); } return D.get().sus; };
  return { D, isolate, spotFor, setup, hold };
})()`;

module.exports = [
  {
    name: 'Ablenker blind: Werte (decT 11, decHold 10) und Shop-Text nennen die blinden Angestellten',
    async run(t) {
      const r = await t.page.evaluate(() => { const D = __dbg, it = D.CFG.shop.items.find(i => i.k === 'dc'); return { decT: D.CFG.gadget.decT, hold: D.CFG.gadget.decHold, decR: D.CFG.gadget.decR, txt: it.d() }; });
      t.eq([r.decT, r.hold, r.decR], [11, 10, 380], 'Werte');
      t.ok(/11 s/.test(r.txt) && /Angestellte/.test(r.txt) && /blind/.test(r.txt), 'Shop-Text: ' + r.txt);
    },
  },
  {
    name: 'Ablenker blind: Ein Kassierer in Sicht trägt nichts zum Verdacht bei, solange der Ablenker piept (Gegenprobe ohne Ablenker), danach wirkt er wieder',
    open: { det: true },
    async run(t) {
      const r = await t.page.evaluate(`(() => { const H = ${HELP}, D = H.D, out = {}; const { q, me, sp } = H.setup('tel'); out.has = !!q && !!sp; if (!out.has) return out;
        q.gx = q.x; q.gy = q.y; D.setSus(0);
        out.ohne = H.hold(q, me, sp, 2, true);                                   // Gegenprobe: ohne Ablenker steigt der Verdacht
        D.setSus(0); D.useGadget(me, 5, sp.x + 20, sp.y); out.dyN = D.dyN();
        H.hold(q, me, sp, 2, true); out.dyN2 = D.dyN(); out.blind = D.staffBlind(q);   // der Ablenker liegt, der Kassierer ist blind
        D.setSus(0); out.mit = H.hold(q, me, sp, 5, true);                       // 5 s Beute in Sicht des Kassierers, Ablenker piept noch
        out.stehlen = (() => { D.setSus(0); for (let i = 0; i < 90; i++) { q.x = q.gx; q.y = q.gy; q.a = sp.a; q.look = { x: sp.x, y: sp.y, t: .7 }; me.x = sp.x; me.y = sp.y; me.units = 0; me.loot = 0; me.thf = 1; D.update(1 / 30); } return D.get().sus; })();
        H.hold(q, me, sp, 6, false);                                             // der Ablenker laeuft ab (11 s ab Landung)
        out.dyN3 = D.dyN(); out.blind2 = D.staffBlind(q); D.setSus(0); out.danach = H.hold(q, me, sp, 2, true);
        return out; })()`);
      t.ok(r.has, 'Kassierer und Standpunkt in Sicht gefunden');
      t.ok(r.ohne > 20, 'ohne Ablenker steigt der Verdacht durch den Kassierer: ' + r.ohne);
      t.eq([r.dyN, r.dyN2, r.blind], [0, 1, true], 'der Ablenker liegt nach dem Flug, der Kassierer ist blind: ' + JSON.stringify([r.dyN, r.dyN2, r.blind]));
      t.ok(r.mit < 3, 'mit Ablenker und Beute in der Tasche: kein Verdacht durch den Kassierer: ' + r.mit);
      t.ok(r.stehlen < 3, 'auch beim Stehlen (thf) sieht der blinde Kassierer nichts: ' + r.stehlen);
      t.eq([r.dyN3, r.blind2], [0, false], 'nach dem Piepen ist der Kassierer wieder sehend');
      t.ok(r.danach > 20, 'danach steigt der Verdacht wieder: ' + r.danach);
    },
  },
  {
    name: 'Ablenker blind: Die Wache am Ablenker sieht weiter alles in ihrem Kegel (und ist nie blind), blind sind nur Kassierer und Manager im Radius, Zivilisten sind es nicht',
    open: { det: true },
    async run(t) {
      const r = await t.page.evaluate(`(() => { const H = ${HELP}, D = H.D, out = {}; const { q, me, sp } = H.setup('grd'); out.has = !!q && !!sp; if (!out.has) return out;
        q.gx = q.x; q.gy = q.y; D.setSus(0); D.useGadget(me, 5, sp.x + 20, sp.y); H.hold(q, me, sp, 2, true); out.dyN = D.dyN(); out.blindGrd = D.staffBlind(q);
        D.setSus(0); out.wache = H.hold(q, me, sp, 3, true);
        // Radius: ein Kassierer weit weg vom Ablenker ist nicht blind, ein naher schon (die Wache dient nur als Traeger des Ablenkers)
        const tel = D.get().npcs.find(n => n.k === 'tel'), mgr = D.get().npcs.find(n => n.k === 'mgr'), civ = D.get().npcs.find(n => n.k === 'civ'), d = D.dcyList()[0];
        const at = (n, dx) => { n.x = d.x + dx; n.y = d.y; return D.staffBlind(n); };
        out.nah = tel ? at(tel, 100) : null; out.fern = tel ? at(tel, 500) : null; out.mgr = mgr ? at(mgr, 100) : null; out.civ = civ ? at(civ, 100) : null;
        return out; })()`);
      t.ok(r.has, 'Wache und Standpunkt gefunden');
      t.eq([r.dyN, r.blindGrd], [1, false], 'der Ablenker liegt, die Wache ist nie blind');
      t.ok(r.wache > 20, 'die Wache am Ablenker sieht den Träger von Beute weiter: ' + r.wache);
      t.eq([r.nah, r.fern, r.mgr, r.civ], [true, false, true, false], 'blind sind Kassierer und Manager im Radius (nah ja, fern nein), Zivilisten nie');
    },
  },
  {
    name: 'Ablenker blind: blinde Angestellte tragen ein Zeichen über dem Kopf (durchgestrichenes Auge), sehende nicht, der Client zeichnet es auch',
    async run(t) {
      await t.loadTool('loopnet.js'); await t.loadInpage('coop.js');
      const r = await t.page.evaluate(`(() => { const G = CT.mkGame('jewel', 654, 2), A = G.A, B = G.clients[0]; A.CFG.policeAt = 1e6; A.CFG.policeForced = 1e6;
        const out = {}, count = (d, tel) => { const ctx = d.cv.getContext('2d'), o = ctx.ellipse, hits = []; ctx.ellipse = function (x, y) { hits.push([Math.round(x), Math.round(y)]); return o.apply(this, arguments); }; try { d.draw(); } finally { ctx.ellipse = o; } return hits.filter(h => Math.abs(h[0] - Math.round(tel.x)) <= 2 && h[1] < Math.round(tel.y) - 8 && h[1] > Math.round(tel.y) - 30).length; };
        const tel = A.get().npcs.find(n => n.k === 'tel'); out.has = !!tel; if (!tel) return out;
        const telB = () => B.get().npcs.find(n => n.id === tel.id);
        G.run(1); out.vorher = [count(A, tel), count(B, telB())];
        const me = A.get().me, free = (x, y) => !A.isSol(Math.floor(x / 32), Math.floor(y / 32)) && A.los(tel.x, tel.y, x, y); let sp = null; for (const a of [0, Math.PI / 2, Math.PI, -Math.PI / 2, .6, -.6, 2.5, -2.5]) for (const d of [60, 45, 80]) { const x = tel.x + Math.cos(a) * d, y = tel.y + Math.sin(a) * d; if (!sp && free(x, y) && free(x + 20, y)) sp = [x, y]; }
        out.sp = !!sp; if (!sp) return out; me.x = sp[0]; me.y = sp[1]; me.dc = 2; A.useGadget(me, 5, sp[0] + 20, sp[1]); G.run(2.5);
        out.mitHost = count(A, tel); out.mitClient = telB() ? count(B, telB()) : -1; out.dy = [A.dyN(), B.dyN()];
        G.run(14); out.nachher = [count(A, tel), count(B, telB())];
        return out; })()`);
      t.ok(r.has && r.sp, 'Kassierer und freier Wurfplatz vorhanden');
      t.eq(r.vorher, [0, 0], 'ohne Ablenker kein Zeichen');
      t.ok(r.dy[0] === 1 && r.dy[1] === 1, 'der Ablenker liegt bei Host und Client: ' + JSON.stringify(r.dy));
      t.ok(r.mitHost >= 1 && r.mitClient >= 1, 'blinder Kassierer trägt das Zeichen bei Host und Client: ' + JSON.stringify([r.mitHost, r.mitClient]));
      t.eq(r.nachher, [0, 0], 'nach dem Piepen ist das Zeichen weg');
    },
  },
];
