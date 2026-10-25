// MRU 1 B5 (docs/major-release-update-1.md, docs/ideen-und-planung.md, Skillbaum-Umbau, Gegenstaende): Notfallkoffer. Der Knoten U3 (hinter Sanitaeter, Entweder-oder zu C4 hinter Techniker) gibt Taste C: Der Koffer wird 22 Pixel vor dem Spieler
// abgestellt (ist dort kein Platz, an seiner Stelle; nur im Ueberfall, nur mit Vorrat, nicht naeher als CFG.aid.near an einem anderen) und heilt CFG.aid.t Sekunden lang alle Lebenden im Radius CFG.aid.r mit hps HP je Sekunde (Stufe 1, 2, 3: 5, 7, 9, Stueck 1, 1, 2), den Besitzer
// eingeschlossen, nie ueber 100, keinen am Boden. Die Koffer gehen im Schnappschuss mit (kf), der Vorrat als Index 33 der Spielerzeile, VER 39. Aufbau wie 99-sprengfalle: Bank Seed 5017 (nach S gedreht, keine Polizei von allein), ein freier waagrechter Streifen.
const HELP = `(() => {
  const D = __dbg, T = 32;
  const strip = () => { const w = D.world(); for (let ty = w.WY0 + 2; ty < w.WY0 + w.H - 2; ty++) for (let tx = w.WX0 + 9; tx < w.WX0 + w.W - 3; tx++) { const x = tx * T + 16, y = ty * T + 16; let ok = true;
    for (let d = -240; d <= 70 && ok; d += 12) for (const dy of [-1, 0, 1]) if (D.isSol(Math.floor((x + d) / T), ty + dy)) ok = false;
    if (ok && D.clear(x - 240, y, x + 70, y)) return { x, y }; } return null; };
  const scene = (sk, phase1) => { D.sessReset(); Object.assign(D.SESSION.sk, sk || {}); D.setScenario('bank'); D.setSeedMode('random'); D.setLage([]); D.setTurn('S'); D.buildSeed(5017); D.CFG.policeAt = 1e6; D.CFG.policeForced = 1e6;
    D.reset(); if (!phase1) D.startHeist(false, D.get().me); const g = D.get(), me = g.me, sp = strip(); if (!sp) return null; g.en.length = 0; me.x = sp.x; me.y = sp.y; me.hp = 100; me.inv = 0; me.ar = 0; return { D, g, me, sp }; };
  const run = (sc, sec) => { for (let i = 0; i < sec * 30; i++) D.update(1 / 30); };
  return { D, strip, scene, run };
})()`;

module.exports = [
  {
    name: 'Notfallkoffer: Knoten U3 ist kein Platzhalter mehr (Stueck 1, 1, 2, Heilung 5, 7, 9 HP/s), der Vorrat folgt dem Knoten, ohne Knoten keiner, Entweder-oder zu C4',
    async run(t) {
      const r = await t.page.evaluate(`(() => { const H = ${HELP}, D = H.D, S = D.CFG.skill, o = {};
        o.node = [S.U3.n, !!S.U3.soon, S.U3.cnt, S.U3.hps]; o.cfg = Object.keys(D.CFG.aid || {}).sort();
        const kit = sk => H.scene(sk, true).me.ak | 0; o.k0 = kit({}); o.k = [1, 2, 3].map(l => kit({ U3: l }));
        D.sessReset(); D.SESSION.pts = 30; const buy = id => D.skillBuy(id); for (let i = 0; i < 3; i++) buy('U0'); for (let i = 0; i < 3; i++) buy('U1'); o.u3 = buy('U3'); o.u4 = buy('U4'); o.sk = Object.assign({}, D.SESSION.sk);
        return o; })()`);
      t.eq(r.node, ['Notfallkoffer', false, [1, 1, 2], [5, 7, 9]], 'U3 kaufbar, Stueck 1, 1, 2, Heilung 5, 7, 9');
      t.eq(r.cfg, ['near', 'r', 't'], 'CFG.aid hat r, t und near');
      t.eq(r.k0, 0, 'ohne Knoten kein Vorrat');
      t.eq(r.k, [1, 1, 2], 'Stueck je Stufe 1, 1, 2');
      t.eq([r.u3, r.u4, r.sk.U3, r.sk.U4], [true, false, 1, undefined], 'Entweder-oder: hinter Sanitaeter gibt es den Koffer, C4 hinter Techniker ist verbaut');
    },
  },
  {
    name: 'Notfallkoffer aufstellen: nur im Ueberfall (Erkunden abgelehnt mit Hinweis), 22 Pixel vor dem Spieler, Vorrat sinkt, nicht dicht an einem anderen, ohne Vorrat und ohne Knoten tut Taste C nichts',
    async run(t) {
      const r = await t.page.evaluate(`(() => { const H = ${HELP}, D = H.D, C = D.CFG.aid, o = {};
        let sc = H.scene({ U3: 1 }, true); D.useGadget(sc.me, 7); o.p1 = [D.aids().length, sc.me.ak, (D.msgs().banner || '').length > 0];
        sc = H.scene({ U3: 3 }); D.useGadget(sc.me, 7); const a = D.aids()[0]; o.a = a ? [Math.round(a.x - sc.me.x), Math.round(a.y - sc.me.y), a.t, a.h, a.own] : null; o.n1 = [D.aids().length, sc.me.ak];
        D.useGadget(sc.me, 7); o.near = [D.aids().length, sc.me.ak]; sc.me.x -= C.near + 10; D.useGadget(sc.me, 7); o.far = [D.aids().length, sc.me.ak]; sc.me.x -= C.near + 10; D.useGadget(sc.me, 7); o.dry = [D.aids().length, sc.me.ak];
        sc = H.scene({}); const bn = D.msgs().banner || ''; D.useGadget(sc.me, 7); o.none = [D.aids().length, (D.msgs().banner || '') === bn];
        return o; })()`);
      t.eq(r.p1, [0, 1, true], 'Erkunden: nichts aufgestellt, Vorrat bleibt, Hinweis im Bild');
      t.eq(r.a, [0, -22, 10, 9, 0], 'der Koffer steht 22 Pixel vor dem Spieler (er blickt nach oben), 10 s, Heilung der Stufe 3 (9), Besitzer 0');
      t.eq(r.n1, [1, 1], 'einer aufgestellt, einer uebrig');
      t.eq(r.near, [1, 1], 'dicht am ersten (unter CFG.aid.near): abgelehnt, der Vorrat bleibt');
      t.eq(r.far, [2, 0], 'weiter weg: aufgestellt, der Vorrat ist leer');
      t.eq(r.dry, [2, 0], 'ohne Vorrat tut Taste C nichts');
      t.eq(r.none, [0, true], 'ohne Knoten tut Taste C nichts, auch keine neue Meldung');
    },
  },
  {
    name: 'Notfallkoffer heilt: alle Lebenden im Radius mit hps je Sekunde (Stufe 1 und 3), nie ueber 100, nicht ausserhalb, keinen am Boden, nach t Sekunden ist er weg, insgesamt hps mal t',
    async run(t) {
      const r = await t.page.evaluate(`(() => { const H = ${HELP}, D = H.D, C = D.CFG.aid, o = {}, r1 = v => Math.round(v * 10) / 10;
        let sc = H.scene({ U3: 1 }); sc.me.x = sc.sp.x - 200; D.useGadget(sc.me, 7); sc.me.hp = 40; H.run(sc, 2); o.s1 = r1(sc.me.hp);
        H.run(sc, 8.4); o.total = [r1(sc.me.hp), D.aids().length]; o.gone = 0;
        sc = H.scene({ U3: 3 }); sc.me.x = sc.sp.x - 200; D.useGadget(sc.me, 7); sc.me.hp = 40; H.run(sc, 2); o.s3 = r1(sc.me.hp);
        sc.me.hp = 98; H.run(sc, 1); o.cap = r1(sc.me.hp);
        sc = H.scene({ U3: 1 }); sc.me.x = sc.sp.x - 200; D.useGadget(sc.me, 7); sc.me.x = sc.sp.x + 40; sc.me.hp = 40; H.run(sc, 2); o.out = [r1(sc.me.hp), Math.round(Math.hypot(sc.me.x - D.aids()[0].x, sc.me.y - D.aids()[0].y)), C.r];
        sc = H.scene({ U3: 1 }); sc.me.x = sc.sp.x - 200; D.useGadget(sc.me, 7); sc.me.x = sc.sp.x - 200 + C.r - 10; sc.me.hp = 40; H.run(sc, 1); o.edge = r1(sc.me.hp);
        sc = H.scene({ U3: 1 }); sc.me.x = sc.sp.x - 200; D.useGadget(sc.me, 7); sc.me.hp = 30; sc.me.dn = 8; H.run(sc, 1); o.down = r1(sc.me.hp);
        return o; })()`);
      t.ok(Math.abs(r.s1 - 50) <= 1.5, 'Stufe 1: 5 HP/s, nach 2 s etwa 50: ' + r.s1);
      t.ok(Math.abs(r.total[0] - 90) <= 1.5, 'insgesamt hps mal t = 50 HP (40 auf etwa 90): ' + r.total[0]);
      t.eq(r.total[1], 0, 'nach t Sekunden ist der Koffer weg');
      t.ok(Math.abs(r.s3 - 58) <= 1.5, 'Stufe 3: 9 HP/s, nach 2 s etwa 58: ' + r.s3);
      t.eq(r.cap, 100, 'nie ueber 100');
      t.eq(r.out[0], 40, 'ausserhalb des Radius (' + r.out[1] + ' Pixel, Radius ' + r.out[2] + ') keine Heilung');
      t.ok(r.edge > 40.5, 'knapp innerhalb des Radius wird geheilt: ' + r.edge);
      t.eq(r.down, 30, 'wer am Boden liegt (dn), wird nicht geheilt');
    },
  },
  {
    name: 'Notfallkoffer im Coop: der Client drueckt C (Host rechnet), alle sehen den Koffer (Schnappschuss kf) und den Vorrat des Clients (Index 33), der Host-Spieler im Radius wird mitgeheilt, nach t Sekunden ist er bei beiden weg',
    async run(t) {
      await t.loadTool('loopnet.js'); await t.loadInpage('coop.js');
      const r = await t.page.evaluate(() => {
        const G = CT.mkGame('bank', 321, 2), A = G.A, B = G.clients[0], o = {}; A.CFG.policeAt = 1e6; A.CFG.policeForced = 1e6;
        B.cv.dispatchEvent(new KeyboardEvent('keydown', { key: 'f', bubbles: true })); G.run(1);
        const p1 = A.get().players[1], p0 = A.get().me; p1.kit = Object.assign({}, p1.kit, { sk: { U3: 2 } }); p1.ak = 1; B.get().me.kit = Object.assign({}, B.get().me.kit, { sk: { U3: 2 } }); G.run(.5);
        o.clientStock = B.get().me.ak | 0; o.phase = B.get().phase;
        // Host-Spieler neben den Client stellen und verwunden
        p0.x = p1.x + 20; p0.y = p1.y; p0.hp = 40; B.cv.dispatchEvent(new KeyboardEvent('keydown', { key: 'c', bubbles: true })); G.run(.5);
        o.n = [A.aids().length, B.aids().length]; o.pos = A.aids()[0] && B.aids()[0] ? [Math.round(A.aids()[0].x - B.aids()[0].x), Math.round(A.aids()[0].y - B.aids()[0].y), A.aids()[0].own] : null; o.stock = [A.get().players[1].ak | 0, B.get().me.ak | 0];
        const h0 = p0.hp; G.run(2); o.heal = Math.round((p0.hp - h0) * 10) / 10; o.want = A.CFG.skill.U3.hps[1] * 2;
        G.run(A.CFG.aid.t); o.after = [A.aids().length, B.aids().length];
        return o;
      });
      t.eq([r.phase, r.clientStock], [2, 1], 'Ueberfall laeuft, der Client kennt seinen Vorrat aus dem Schnappschuss');
      t.eq(r.n, [1, 1], 'der Koffer steht beim Host und beim Client');
      t.eq(r.pos, [0, 0, 1], 'am selben Ort, Besitzer ist Spieler 1');
      t.eq(r.stock, [0, 0], 'der Vorrat ist bei beiden verbraucht');
      t.ok(Math.abs(r.heal - r.want) <= 1.5, 'der Host-Spieler im Radius wird mitgeheilt (Stufe 2: 7 HP/s): ' + r.heal + ' statt etwa ' + r.want);
      t.eq(r.after, [0, 0], 'nach t Sekunden ist der Koffer bei beiden weg');
    },
  },
  {
    name: 'Notfallkoffer zeichnen und bedienen (solo): Taste C stellt ihn auf, er zeigt Radiusring und Koffer am Ort, das HUD nennt Taste C mit der Stueckzahl, im Erkunden und ohne Vorrat tut die Taste nichts',
    async run(t) {
      const r = await t.page.evaluate(`(() => { const H = ${HELP}, D = H.D, o = {}; const cv = document.getElementById('c'), ctx = cv.getContext('2d');
        const rec = x => { const arcs = [], txt = [], oa = ctx.arc, ot = ctx.fillText; ctx.arc = function (cx, cy, r) { if (x == null || Math.abs(cx - x) < 1) arcs.push(Math.round(r * 10) / 10); return oa.apply(this, arguments); }; ctx.fillText = function (s) { txt.push(String(s)); return ot.apply(this, arguments); };
          try { D.draw(); } finally { ctx.arc = oa; ctx.fillText = ot; } return { arcs, txt }; };
        let sc = H.scene({ U3: 3 }); o.hud0 = rec().txt.filter(s => /\\[C\\]/.test(s)); cv.dispatchEvent(new KeyboardEvent('keydown', { key: 'c', bubbles: true })); cv.dispatchEvent(new KeyboardEvent('keyup', { key: 'c', bubbles: true }));
        o.placed = [D.aids().length, sc.me.ak]; const a = D.aids()[0], d = rec(a ? a.x : null); o.ring = d.arcs.includes(D.CFG.aid.r); o.hud1 = d.txt.filter(s => /\\[C\\]/.test(s));
        sc = H.scene({ U3: 1 }, true); cv.dispatchEvent(new KeyboardEvent('keydown', { key: 'c', bubbles: true })); o.phase1 = [D.aids().length, sc.me.ak];
        sc = H.scene({}); cv.dispatchEvent(new KeyboardEvent('keydown', { key: 'c', bubbles: true })); o.none = D.aids().length;
        return o; })()`);
      t.ok(r.hud0.some(s => /Koffer 2/.test(s)), 'das HUD nennt C, Koffer und die Stueckzahl (Stufe 3: 2): ' + JSON.stringify(r.hud0));
      t.eq(r.placed, [1, 1], 'Taste C stellt einen Koffer auf (Vorrat 2 auf 1)');
      t.ok(r.ring, 'der Koffer zeigt den Radiusring am Ort');
      t.ok(r.hud1.some(s => /Koffer 1/.test(s)), 'das HUD zaehlt mit: ' + JSON.stringify(r.hud1));
      t.eq(r.phase1, [0, 1], 'Erkunden: Taste C stellt nichts auf, der Vorrat bleibt');
      t.eq(r.none, 0, 'ohne Knoten tut Taste C nichts');
    },
  },
];
