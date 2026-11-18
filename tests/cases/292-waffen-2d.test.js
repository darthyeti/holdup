// Ticket #292 (2D: Waffen sichtbar in der Hand): Die Figuren in chars.png tragen keine Waffe mehr, js/draw.js zeichnet sie als eigenes Bild (props2.png ab (0,320), eine Zelle je Art, WPN2D) ueber dem Koerper,
// mit der Blickrichtung gedreht: Pistole, MP, Sturmgewehr (kit.w), angelegte Spezialwaffe (Praezisionsgewehr, Granatwerfer), Gegner Beamter und Schild Pistole, SWAT Gewehr, Wachmann Pistole, Scharfschuetze Praezisionsgewehr.
// Ohne Waffe: Zivilisten, unbewaffnete Raeuber (Phase 1), Tote, Aufgebende, Spieler am Boden. Rueckstoss beim Schuss (nur mit Grafikstufe ueber niedrig), fehlendes Bild kein Fehler, Coop-Client zeichnet dieselbe Waffe
// (kit.w kommt ueber buildKits, kein neues Netzfeld). Gemessen wird ueber einen Spion auf drawImage (Zelle, Drehung, Versatz), nicht ueber Pixel.
const SPY = `(() => {
  const proto = CanvasRenderingContext2D.prototype; if (!window.__wspy) { window.__wspy = { log: [], img: null }; const o = proto.drawImage;
    proto.drawImage = function (im, ...a) { if (im && im.naturalWidth === 736 && a.length === 8 && a[1] === 320 && a[2] === 64 && a[3] === 64) { const m = this.getTransform(); window.__wspy.img = im; window.__wspy.log.push({ c: a[0] / 64, dx: a[4], rot: Math.atan2(m.b, m.a) }); } return o.call(this, im, ...a); }; }
  return window.__wspy; })()`;
const SCENE = `(sk, phase1) => { const D = __dbg; D.sessReset(); Object.assign(D.SESSION.sk, sk || {}); D.setScenario('bank'); D.setSeedMode('random'); D.setLage([]); D.setTurn('S'); D.buildSeed(5017); D.CFG.policeAt = 1e6; D.CFG.policeForced = 1e6;
  D.reset(); if (!phase1) D.startHeist(false, D.get().me); const g = D.get(), me = g.me; g.en.length = 0; me.hp = 100; me.a = 0.7; GFX.set('mittel'); return { D, g, me }; }`;
const CELL = { pistol: 0, smg: 1, rifle: 2, spr: 3, spl: 4 };

module.exports = [
  {
    name: 'Waffen 2D: Pistole, MP und Sturmgewehr des Spielers werden mit dem richtigen Bild gezeichnet, gedreht in Blickrichtung, genau eine Waffe je Figur',
    async run(t) {
      await t.loadInpage('coop.js');
      const r = await t.page.evaluate(`(() => { const S = ${SPY}, o = {}; for (const w of ['pistol', 'smg', 'rifle']) { const { D, me } = (${SCENE})({}, false); me.kit = Object.assign({}, me.kit, { w }); S.log.length = 0; D.draw(); o[w] = S.log.slice(); o[w + 'a'] = me.a; } return o; })()`);
      for (const w of ['pistol', 'smg', 'rifle']) {
        t.eq(r[w].length, 1, w + ': genau eine Waffe');
        t.eq(r[w][0].c, CELL[w], w + ': Zelle');
        t.ok(Math.abs(r[w][0].rot - r[w + 'a']) < 1e-3, w + ': in Blickrichtung gedreht ' + r[w][0].rot);
      }
      t.ok(!t.page.errors.length, 'JS-Fehler: ' + t.page.errors.slice(0, 2).join(' | '));
    },
  },
  {
    name: 'Waffen 2D: Gegner (Beamter Pistole, SWAT Gewehr, Schild Pistole, Wachmann Pistole, Scharfschuetze Praezisionsgewehr), Aufgebende und Tote ohne Waffe, Zivilisten ohne, unbewaffneter Spieler ohne',
    async run(t) {
      await t.loadInpage('coop.js');
      const r = await t.page.evaluate(`(() => { const S = ${SPY}, o = {}, { D, g, me } = (${SCENE})({}, false); me.kit = Object.assign({}, me.kit, { w: 'pistol' });
        const add = (k, f) => { g.en.length = 0; const e = k === 'sniper' ? D.mkSniper({ x: me.x + 90, y: me.y, a: Math.PI }) : D.mkCop(me.x + 90, me.y, k === 'swat' ? true : k === 'shield' ? 'shield' : false); if (k === 'grd') { e.kind = 'grd'; e.row = 2; }
          e.cool = 1e9; e.cd = 1e9; e.a = Math.PI; if (f) f(e); g.en.push(e); S.log.length = 0; D.draw(); return S.log.map(q => q.c).sort(); };
        o.cop = add('cop'); o.swat = add('swat'); o.shield = add('shield'); o.grd = add('grd'); o.sniper = add('sniper'); o.sur = add('cop', e => { e.sur = true; }); o.tot = add('cop', e => { e.hp = 0; });
        const sc2 = (${SCENE})({}, true); S.log.length = 0; sc2.D.draw(); o.phase1 = S.log.length; o.phase1Npcs = sc2.g.npcs.length; return o; })()`);
      t.eq(r.cop, [0, 0], 'Beamter und Spieler: Pistole');
      t.eq(r.swat, [0, 2], 'SWAT: Gewehr (Spieler Pistole)');
      t.eq(r.shield, [0, 0], 'Schild-Beamter: Pistole');
      t.eq(r.grd, [0, 0], 'Wachmann: Pistole');
      t.eq(r.sniper, [0, 3], 'Scharfschuetze: Praezisionsgewehr');
      t.eq(r.sur, [0], 'Aufgebender Beamter ohne Waffe (nur die des Spielers)');
      t.eq(r.tot, [0], 'Beamter mit 0 Leben ohne Waffe');
      t.eq(r.phase1, 0, 'Phase 1: unbewaffneter Spieler, Zivilisten und Personal ohne Waffe');
      t.ok(r.phase1Npcs > 0, 'es gibt Zivilisten oder Personal im Spiel');
    },
  },
  {
    name: 'Waffen 2D: angelegte Spezialwaffe (rechte Maus) zeigt Praezisionsgewehr oder Granatwerfer, Loslassen wieder die Pistole; Tote und Spieler am Boden ohne Waffe in der Hand',
    async run(t) {
      await t.loadInpage('coop.js');
      const r = await t.page.evaluate(`(() => { const S = ${SPY}, o = {}; for (const [k, sk] of [['spr', { A3: 1 }], ['spl', { A4: 1 }]]) { const { D, me } = (${SCENE})(sk, false); me.sx = 3; D.spwHold(true); o[k + 'On'] = D.spw(); S.log.length = 0; D.draw(); o[k] = S.log.map(q => q.c);
          D.spwHold(false); S.log.length = 0; D.draw(); o[k + 'Off'] = S.log.map(q => q.c); }
        const { D, me } = (${SCENE})({}, false); me.dead = true; S.log.length = 0; D.draw(); o.dead = S.log.length; me.dn = 5; S.log.length = 0; try { D.draw(); } catch (e) { o.err = String(e); } o.down = S.log.length; return o; })()`);
      t.ok(r.sprOn && r.splOn, 'Spezialwaffe angelegt');
      t.eq(r.spr, [3], 'Praezisionsgewehr: Zelle 3');
      t.eq(r.spl, [4], 'Granatwerfer: Zelle 4');
      t.eq([r.sprOff, r.splOff], [[0], [0]], 'abgelegt: wieder die Pistole');
      t.eq(r.dead, 0, 'toter Spieler ohne Waffe');
      t.eq(r.down, 0, 'Spieler am Boden ohne Waffe in der Hand (die Waffe liegt im Bild der Figur)');
      t.ok(!r.err, 'kein Fehler beim Zeichnen: ' + r.err);
    },
  },
  {
    name: 'Waffen 2D: Rueckstoss beim Schuss (nur ab Grafikstufe mittel), fehlendes Bild (Blatt ohne Waffenzeile) zeichnet ohne Waffe und ohne Fehler',
    async run(t) {
      await t.loadInpage('coop.js');
      const r = await t.page.evaluate(`(() => { const S = ${SPY}, o = {}, { D, me } = (${SCENE})({}, false); me.kit = Object.assign({}, me.kit, { w: 'rifle' });
        S.log.length = 0; D.draw(); o.ruhe = S.log[0].dx; me.flash = .05; S.log.length = 0; D.draw(); o.schuss = S.log[0].dx; me.flash = .025; S.log.length = 0; D.draw(); o.halb = S.log[0].dx;
        GFX.set('niedrig'); S.log.length = 0; D.draw(); o.niedrig = S.log[0].dx; GFX.set('mittel'); me.flash = 0;
        Object.defineProperty(S.img, 'naturalHeight', { value: 128, configurable: true }); S.log.length = 0; try { D.draw(); } catch (e) { o.err = String(e); } o.fehlt = S.log.length; delete S.img.naturalHeight; S.log.length = 0; D.draw(); o.zurueck = S.log.length; return o; })()`);
      t.eq(Math.abs(r.ruhe), 0, 'ohne Schuss kein Versatz');
      t.ok(r.schuss < -2 && r.schuss > -5, 'beim Schuss rutscht die Waffe zurueck: ' + r.schuss);
      t.ok(r.halb < 0 && r.halb > r.schuss, 'der Rueckstoss klingt ab: ' + r.halb);
      t.eq(Math.abs(r.niedrig), 0, 'Stufe niedrig ohne Rueckstoss');
      t.eq(r.fehlt, 0, 'ohne Waffenzeile im Blatt keine Waffe');
      t.ok(!r.err, 'kein Fehler: ' + r.err);
      t.eq(r.zurueck, 1, 'mit Blatt wieder eine Waffe');
    },
  },
  {
    name: 'Waffen 2D im Coop: der Client zeichnet Host und sich selbst mit der Waffe aus kit.w (kein neues Netzfeld), Gegner wie beim Host',
    timeout: 120000,
    async run(t) {
      await t.loadTool('loopnet.js'); await t.loadInpage('coop.js');
      const r = await t.page.evaluate(`(() => { const S = ${SPY}, o = {}, G = CT.mkGame('bank', 5017, 2, 40, 0, 0, 'S', ins => { for (const d of ins) d.SESSION.own.smg = 1; }), A = G.A, B = G.clients[0]; GFX.set('mittel');
        A.startHeist(false, A.get().me); G.run(1.5); const e = A.mkCop(A.get().me.x + 80, A.get().me.y, true); e.cool = 1e9; A.get().en.push(e); G.run(.5);
        o.kits = [A, B].map(d => d.get().players.map(p => p.kit && p.kit.w)); o.phase = [A.get().phase, B.get().phase];
        const draw = d => { S.log.length = 0; d.draw(); return S.log.map(q => q.c).sort(); }; o.host = draw(A); o.client = draw(B); o.en = [A.get().en.length, B.get().en.length]; return o; })()`);
      t.eq(r.phase, [2, 2], 'beide im Ueberfall');
      t.eq(r.kits[1], r.kits[0], 'der Client kennt dieselben Waffen wie der Host');
      t.eq(r.kits[1], ['smg', 'pistol'], 'Host mit MP (Vorbesitz vor dem Beitritt), Client mit Pistole');
      t.eq(r.client, [0, 1, 2], 'Client zeichnet den Host mit MP, sich selbst mit Pistole und den SWAT mit Gewehr: ' + r.client.join(','));
      t.ok([0, 1, 2].every(c => r.host.includes(c)), 'der Host zeichnet dieselben Arten (er sieht je nach Sichtlinie noch weitere Beamte): ' + r.host.join(','));
    },
  },
];
