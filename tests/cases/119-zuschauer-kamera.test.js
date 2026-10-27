// Coop-Ausbau Z2 (docs/coop-ausbau.md, Spur Z): Bedienung der Zuschauer. Pfeil rechts und links wechseln die gefolgte Figur (nur Spieler, die nicht gegangen sind, bevorzugt die aktiven, mit Umlauf), faellt die Figur aus (am Boden,
// tot, entkommen), springt die Ansicht auf einen aktiven Spieler, V schaltet die freie Kamera (WASD und Pfeile bewegen, Shift schneller, begrenzt auf die Karte, zurueck zur gefolgten Figur), B schaltet "alles sehen" (kein
// Sichtfeld und keine Dunkelheit der Figur, alle Figuren sichtbar). Das HUD nennt Zuschauer, Namen und Tasten (Leiste unten), in der freien Kamera ohne Leben und Munition einer Figur, darueber eine Namensleiste zum Anklicken
// (specClick). Eine neue Runde (reset) setzt Ziel und freie Kamera zurueck, "alles sehen" bleibt. Keine neue Nachricht, kein neues Netzformat.
const SETUP = `(() => { const G = CT.mkLobby(3, 1), [A, B, C] = G.players, [S] = G.specs, key = (d, k) => d.cv.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true })), up = (d, k) => d.cv.dispatchEvent(new KeyboardEvent('keyup', { key: k, bubbles: true }));
  A.startCoop(); G.run(3); return { G, A, B, C, S, key, up, id: () => S.get().p.id, P: A.get().players }; })()`;
const TEXTS = `(d) => { const c = d.cv.getContext('2d'), txt = [], ft = c.fillText; c.fillText = function (s) { txt.push(String(s)); return ft.apply(this, arguments); }; d.draw(); c.fillText = ft; return txt; }`;

module.exports = [
  {
    name: 'Zuschauer, Wechsel: Pfeil rechts und links gehen durch die Spieler mit Umlauf, das Ziel bleibt, gegangene Spieler fehlen in der Reihe, faellt die gefolgte Figur aus, springt die Ansicht auf einen aktiven Spieler',
    async run(t) {
      await t.loadTool('loopnet.js'); await t.loadInpage('coop.js');
      const r = await t.page.evaluate(`(() => { const { G, A, S, key, id, P } = ${SETUP}, o = {};
        o.start = [id(), S.spec().t]; key(S, 'ArrowRight'); const a = id(); key(S, 'ArrowRight'); const b = id(); key(S, 'ArrowRight'); const c = id(); o.rechts = [a, b, c]; key(S, 'ArrowLeft'); const d = id(); key(S, 'ArrowLeft'); o.links = [d, id()];
        const tab = sh => S.cv.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: sh, bubbles: true }));
        tab(false); const ta = id(); tab(false); const tb = id(); tab(true); o.tab = [ta, tb, id()]; G.run(1.5); o.bleibt = [id(), S.spec().t];
        P[2].gone = true; G.run(.5); key(S, 'ArrowRight'); const e = id(); key(S, 'ArrowRight'); o.ohneGegangene = [e, id()];
        P[2].gone = false; G.run(.3); key(S, 'ArrowRight'); key(S, 'ArrowRight'); const t1 = id(); P[t1].out = true; G.run(.5); o.faelltAus = [t1, id(), S.get().p.out, S.spec().t === id()]; P[t1].out = false;
        P[1].out = true; G.run(.5); key(S, 'ArrowRight'); o.ueberspringt = id(); key(S, 'ArrowLeft'); o.ueberspringtLinks = id(); P[1].out = false; G.run(.3);
        for (const q of P) q.out = true; G.run(.5); o.alleAus = [id() >= -2, !!S.get().p]; try { S.draw(); o.zeichnet = true; } catch (e) { o.zeichnet = String(e); }
        return o; })()`);
      t.eq(r.start, [0, null], 'am Anfang folgt er dem ersten aktiven Spieler (automatisch, kein festes Ziel)');
      t.eq(r.rechts, [1, 2, 0], 'Pfeil rechts: 1, 2, dann Umlauf zu 0'); t.eq(r.links, [2, 1], 'Pfeil links geht zurueck');
      t.eq(r.tab, [2, 0, 2], 'Tab geht eine Figur weiter (mit Umlauf), Umschalt+Tab zurueck');
      t.eq(r.bleibt, [2, 2], 'das gewaehlte Ziel bleibt ueber die Zeit');
      t.ok(r.ohneGegangene[0] !== 2 && r.ohneGegangene[1] !== 2, 'ein gegangener Spieler kommt in der Reihe nicht vor: ' + JSON.stringify(r.ohneGegangene));
      t.ok(r.faelltAus[1] !== r.faelltAus[0] && r.faelltAus[2] === false && r.faelltAus[3] === true, 'faellt die gefolgte Figur aus, wechselt die Ansicht auf einen aktiven Spieler und merkt sich ihn: ' + JSON.stringify(r.faelltAus));
      t.eq([r.ueberspringt, r.ueberspringtLinks], [2, 0], 'ein ausgefallener Spieler (hier Nummer 1) wird beim Wechseln uebersprungen, in beide Richtungen');
      t.eq(r.zeichnet, true, 'ohne aktive Spieler stuerzt nichts ab, das Zeichnen geht');
    },
  },
  {
    name: 'Zuschauer, freie Kamera: V schaltet um (me ist dann p, Start an der Stelle der gefolgten Figur), WASD und Pfeile bewegen mit CFG.spec.cam Pixeln je Sekunde, Shift schneller, begrenzt auf die Karte, Pfeile wechseln dann nicht, V geht zurueck zur selben Figur, eine neue Runde setzt zurueck',
    async run(t) {
      await t.loadTool('loopnet.js'); await t.loadInpage('coop.js');
      const r = await t.page.evaluate(`(() => { const { G, A, S, key, up, id } = ${SETUP}, o = {}, F = A.CFG.spec, w = A.world(); const auto = id(); key(S, 'v'); key(S, 'v'); o.auto = [id() === auto, S.spec().t === auto]; key(S, 'ArrowRight'); const ziel = id(), q = S.get().p, x0 = q.x, y0 = q.y;
        key(S, 'v'); const m = () => S.get().me; o.an = [S.spec().free, id(), Math.abs(m().x - x0) < 2, Math.abs(m().y - y0) < 2]; key(S, 'ArrowRight'); key(S, 'ArrowRight'); up(S, 'ArrowRight'); o.pfeileWechselnNicht = [id(), S.spec().free];
        const mitte = () => { m().x = (w.WX0 + w.W / 2) * 32; m().y = (w.WY0 + w.H / 2) * 32; }; mitte(); // Kartenmitte, damit kein Rand die Strecke kuerzt
        const mx = m().x; key(S, 'd'); G.run(.5); up(S, 'd'); o.dx = Math.round(m().x - mx); const my = m().y; key(S, 'w'); G.run(.5); up(S, 'w'); o.dy = Math.round(m().y - my);
        mitte(); const dx0 = m().x, dy0 = m().y; key(S, 'd'); key(S, 's'); G.run(.5); up(S, 'd'); up(S, 's'); o.diag = Math.round(Math.hypot(m().x - dx0, m().y - dy0));
        mitte(); const mx2 = m().x; key(S, 'Shift'); key(S, 'd'); G.run(.5); up(S, 'd'); up(S, 'Shift'); o.schnell = Math.round(m().x - mx2);
        key(S, 'ArrowRight'); G.run(30); up(S, 'ArrowRight'); o.rand = [Math.round(m().x), (w.WX0 + w.W) * 32]; o.cam = [F.cam, F.fast];
        key(S, 'v'); o.zurueck = [S.spec().free, id() === ziel, S.spec().t === ziel];
        key(S, 'v'); S.reset(); o.reset = [S.spec().free, S.spec().t]; return o; })()`);
      t.eq(r.auto, [true, true], 'V und wieder V ohne vorherigen Wechsel: dieselbe Figur, und sie ist jetzt das feste Ziel');
      t.eq(r.an, [true, -2, true, true], 'V: freie Kamera, p ist me (id -2), Start an der Stelle der gefolgten Figur');
      t.eq(r.pfeileWechselnNicht, [-2, true], 'in der freien Kamera wechseln die Pfeile die Figur nicht');
      t.ok(r.dx > 180 && r.dx < 240, 'rechts: ungefaehr 210 Pixel in einer halben Sekunde bei 420: ' + r.dx);
      t.ok(r.diag > 190 && r.diag < 230, 'schraeg gleich schnell wie gerade (ungefaehr 210, nicht 297): ' + r.diag);
      t.ok(r.dy < -180 && r.dy > -240, 'oben: ungefaehr minus 210: ' + r.dy);
      t.ok(r.schnell > 400 && r.schnell < 480, 'mit Shift ungefaehr 450 (900 je Sekunde): ' + r.schnell);
      t.eq(r.rand[0], r.rand[1], 'am rechten Kartenrand ist Schluss'); t.eq(r.cam, [420, 900], 'CFG.spec.cam 420 und fast 900');
      t.eq(r.zurueck, [false, true, true], 'V geht zurueck zur selben gefolgten Figur');
      t.eq(r.reset, [false, null], 'eine neue Runde (reset) setzt freie Kamera und Ziel zurueck');
    },
  },
  {
    name: 'Zuschauer, alles sehen: B schaltet Sicht und Dunkelheit der Figur ab (kein Abdunkeln des Bildes), eine Figur hinter der Wand ist dann zu sehen, in der freien Kamera immer, B bleibt ueber neue Runden',
    async run(t) {
      await t.loadTool('loopnet.js'); await t.loadInpage('coop.js');
      const r = await t.page.evaluate(`(() => { const { G, A, S, key, id, P } = ${SETUP}, o = {}, texts = ${TEXTS}, w = S.world();
        const dark = () => { const c = S.cv.getContext('2d'), n = []; const di = c.drawImage; c.drawImage = function (src) { if (src && src.width === 960 && src.height === 544 && arguments.length === 5) n.push(1); return di.apply(this, arguments); }; S.draw(); c.drawImage = di; return n.length; };
        // ein begehbarer Platz, den die gefolgte Figur nicht sieht
        const q = S.get().p; let spot = null; for (let ty = w.WY0; ty < w.WY0 + w.H && !spot; ty++) for (let tx = w.WX0; tx < w.WX0 + w.W && !spot; tx++) { const x = tx * 32 + 16, y = ty * 32 + 16; if (!w.isSol(tx, ty) && !S.los(q.x, q.y, x, y)) spot = [x, y]; }
        o.spot = !!spot; P[1].x = spot[0]; P[1].y = spot[1]; G.run(.4); const nm = S.pn(1), cnt = () => texts(S).filter(s => s === nm).length;
        o.normal = dark(); o.hidden = cnt(); key(S, 'b'); o.alles = [S.spec().all, dark(), cnt()]; key(S, 'b'); o.zurueck = [S.spec().all, dark(), cnt()];
        key(S, 'v'); o.frei = [dark(), cnt()]; key(S, 'b'); o.freiB = S.spec().all; key(S, 'v'); o.wieder = [S.spec().free, dark(), cnt()];
        key(S, 'b'); S.reset(); o.bleibt = S.spec().all; return o; })()`);
      t.eq(r.spot, true, 'es gibt einen nicht einsehbaren Platz');
      t.ok(r.normal >= 1, 'normal wird das Bild abgedunkelt (die Dunkelebene wird gezeichnet): ' + r.normal);
      t.eq(r.alles, [true, 0, r.hidden + 1], 'B: keine Dunkelebene mehr, die Figur hinter der Wand ist mit Namen zu sehen');
      t.eq(r.zurueck, [false, r.normal, r.hidden], 'B noch einmal: wieder wie vorher');
      t.eq(r.frei, [0, r.hidden + 1], 'in der freien Kamera gibt es immer alles zu sehen');
      t.eq(r.freiB, false, 'B ist in der freien Kamera ohne Wirkung'); t.eq(r.wieder, [false, r.normal, r.hidden], 'zurueck zur Figur: wieder die Sicht der Figur');
      t.eq(r.bleibt, true, 'die Einstellung bleibt ueber eine neue Runde');
    },
  },
  {
    name: 'Zuschauer, Anzeige: Leiste unten mit Name und Tasten (Zuschauer: Orange, Pfeile, V, B), in der freien Kamera "Freie Kamera" ohne Leben und Munition einer Figur, Namensleiste mit einem Eintrag je Spieler zum Anklicken (specClick waehlt, daneben tut nichts), Pause und Ergebnis nehmen die Pfeile nicht',
    async run(t) {
      await t.loadTool('loopnet.js'); await t.loadInpage('coop.js');
      const r = await t.page.evaluate(`(() => { const { G, A, S, key, id } = ${SETUP}, o = {}, texts = ${TEXTS};
        let tx = texts(S); o.leiste = [tx.some(s => /Zuschauer: Orange/.test(s)), tx.some(s => /wechseln/.test(s) && /freie Kamera/.test(s)), tx.includes('HP'), tx.some(s => s === 'ARMOR')];
        const chips = S.spec().chips; o.chips = chips.length; const c2 = chips.find(q => q.id === 2); o.klick = [S.specClick(c2.x + c2.w / 2, c2.y + c2.h / 2), id(), S.specClick(1, 1), id()];
        A.get().players[1].out = true; G.run(.5); texts(S); const c1 = S.spec().chips.find(q => q.id === 1); const before = id(); o.tot = [S.specClick(c1.x + 2, c1.y + 2), id() === before, !!c1];
        A.get().players[1].out = false; G.run(.3); S.specClick(S.spec().chips[0].x + 2, S.spec().chips[0].y + 2);
        document.body.appendChild(S.cv); S.cv.style.cssText = 'position:fixed;left:0;top:0;width:960px;height:544px'; // die Zusatz-Instanz haengt sonst nicht im Dokument (Rechteck 0), die Umrechnung der Maus braucht eins
        const rc = S.cv.getBoundingClientRect(), md = (x, y) => S.cv.dispatchEvent(new MouseEvent('mousedown', { clientX: rc.left + x * rc.width / 960, clientY: rc.top + y * rc.height / 544, bubbles: true }));
        const ch1 = S.spec().chips.find(q => q.id === 1); md(ch1.x + ch1.w / 2, ch1.y + ch1.h / 2); o.maus = [id(), S.mouse.down]; md(480, 150); o.mausBoden = S.mouse.down;
        key(S, 'v'); tx = texts(S); o.frei = [tx.some(s => /Freie Kamera/.test(s)), tx.includes('HP'), tx.some(s => s === 'ARMOR'), tx.some(s => /V: zur/.test(s))];
        key(S, 'v'); key(S, 'Escape'); G.run(.1); const p0 = id(); key(S, 'ArrowRight'); G.run(.1); o.pause = [S.state().paused, id() === p0, (S.ui().tiles().find(q => q.id === 'leave') || {}).title]; o.pauseKlick = [S.specClick(c2.x + 2, c2.y + 2), id() === p0];
        return o; })()`);
      t.eq(r.leiste, [true, true, true, true], 'Leiste nennt Zuschauer und Name und die Tasten, HP und ARMOR der gefolgten Figur stehen im HUD');
      t.eq(r.chips, 3, 'ein Eintrag je Spieler in der Namensleiste'); t.eq(r.klick, [true, 2, false, 2], 'ein Klick auf den Eintrag waehlt den Spieler, ein Klick daneben nichts');
      t.eq(r.tot, [true, true, true], 'ein Klick auf einen ausgefallenen Spieler wird verbraucht und waehlt ihn nicht');
      t.eq(r.maus, [1, 0], 'der echte Mausdruck auf die Namensleiste waehlt die Figur und "schiesst" nicht'); t.eq(r.mausBoden, 0, 'ein Mausdruck ins Bild setzt bei einem Zuschauer nichts (kein Schiessen)');
      t.eq(r.frei, [true, false, false, true], 'freie Kamera: Titel und Hinweis, kein HP und ARMOR');
      t.eq(r.pauseKlick, [false, true], 'in der Pause wirkt die Namensleiste nicht');
      t.eq(r.pause, [true, true, 'Zuschauen beenden'], 'in der Pause wechseln die Pfeile nichts, die Kachel zum Gehen heisst Zuschauen beenden');
    },
  },
  {
    name: 'Zuschauer, Ergebnis: Auf dem Ergebnisbild wechseln Pfeile, Tab, V und B nichts (die Pfeile blaettern dort die Auszeichnungen), das Bild laesst sich zeichnen und die Leiste ist weg',
    async run(t) {
      await t.loadTool('loopnet.js'); await t.loadInpage('coop.js');
      const r = await t.page.evaluate(`(() => { const { G, A, S, key, id } = ${SETUP}, o = {}, texts = ${TEXTS};
        key(S, 'ArrowRight'); const t0 = S.spec().t, i0 = id(); S.endLocal({ win: true, soft: false, title: 'Ende', score: 0, aw: [], lines: ['a'], hi: 0 });
        for (const k of ['ArrowRight', 'ArrowLeft', 'Tab', 'v', 'b']) key(S, k);
        o.ziel = [S.spec().t === t0, id() === i0, S.spec().free, S.spec().all]; try { o.leiste = texts(S).some(s => /Zuschauer: /.test(s)); o.zeichnet = true; } catch (e) { o.zeichnet = String(e); }
        return o; })()`);
      t.eq(r.ziel, [true, true, false, false], 'im Ergebnis aendern die Tasten nichts am Ziel, an der freien Kamera und an Alles sehen');
      t.eq(r.zeichnet, true, 'das Ergebnisbild laesst sich zeichnen'); t.eq(r.leiste, false, 'die Leiste fehlt im Ergebnisbild');
    },
  },
];
