// Kloetzchen-Stil, Dinge Teil A (Ticket 198, Schritt 4a): Bank, Juwelier, Tankstelle, Strasse. Jede Kachelart und jedes Szenario-Teil dieser Szenarien hat einen Bauer, die Szenarien bauen im Stil ohne Fehler
// unter den Budgets (Draw Calls, Dreiecke), Dinge entstehen aus Zustand der Karte und der Beute (scen3d, Raster), den auch ein Client hat, der Schnitt durch Waende (Schnitt um den Spieler) beruehrt die Moebel nicht.
// Kein Pixelvergleich, ohne WebGL 2 uebersprungen.
const path = require('path'), { pathToFileURL } = require('url');
const lib = require('../lib');
const { glPage } = require('../glshare');   // gemeinsamer WebGL-Browser (tests/glshare.js)
const TILES = ['C', 'e', 'm', 'b', 'r', 'A', 'k', 'q', 'p', 'f', 'u', 'X'];           // Kacheln dieses Teils (g, P, V, Y, W, # bleiben schlicht)
const KINDS = ['vault', 'pad', 'note', 'bundle', 'bag', 'dark', 'pump', 'tk'];
const GOODS = ['good:cig', 'good:shelf'];
module.exports = [
  {
    name: 'Kloetzchen-Dinge A: jede Kachelart und jedes Szenario-Teil von Bank, Juwelier, Tankstelle und Strasse hat einen Bauer, Beute-Stuecke als good:n',
    async run(t) {
      const root = lib.ROOT, K = await import(pathToFileURL(path.join(root, 'js', 'kl-kern.js')).href), V = await import(pathToFileURL(path.join(root, 'js', 'view3d.js')).href), KL = K.KL;
      t.eq(TILES.filter(c => !KL.hasObj(c)), [], 'Kacheln ohne Bauer');
      t.eq(KINDS.filter(c => !KL.hasObj(c)), [], 'Szenario-Teile ohne Bauer');
      t.eq(KINDS.filter(c => !V.V3CFG.scen.kinds[c]), [], 'Arten, die V3CFG nicht kennt');
      t.eq(TILES.filter(c => !V.V3CFG.cells[c]), [], 'Kacheln ohne Eintrag in der Hoehentabelle');
      t.eq(GOODS.filter(g => !KL.hasObj(g)), [], 'Beute-Stuecke ohne Bauer');
      t.ok(!KL.hasObj('good') && !KL.goods, 'kein allgemeines good: ein Beute-Stueck ohne Bauer zeichnet view3d klassisch (nie unsichtbar)');
      t.ok(KL.util && typeof KL.util.top === 'function', 'Helfer da');
    },
  },
  {
    name: 'Kloetzchen-Dinge A: Bank, Juwelier, Tankstelle und Transporter bauen im Stil ohne Fehler, Teile und Moebel da, Budgets gehalten, Schnitt beruehrt Moebel nicht',
    timeout: 300000,
    async run(t) {
      const P = await glPage(t); if (!P) return;
      try {
        await lib.loadInpage(P.page, 'bild.js');
        const r = await P.page.evaluate(`(async () => { const D = __dbg, o = {}; D.view3d.kstil = 1; const i0 = await D.view3d.set(true); if (i0.state !== 'an') return { i0 };
          for (const sc of ['bank', 'jewel', 'gas', 'truck']) {
            PX.scene(sc, 5); PX.phase(sc === 'truck' ? 'ueberfall' : 'erkundung'); const g = D.get(), L = D.LAY(); let tg;
            if (L.truck) { const k = D.tk(); tg = [k.x, k.y]; } else if (L.pumps) { const q = L.pumps[0]; tg = [q.x * 32 + 16, q.y * 32 + 16]; } else if (L.vit) tg = [L.vit[0].x, L.vit[0].y]; else { const v = L.vault.door; tg = [v[0] * 32 + 16, v[1] * 32 + 32]; }
            const W = D.world(), me = g.me; let best = null; for (const rr of [90, 120, 150, 180, 220]) { for (let k = 0; k < 16 && !best; k++) { const a = Math.PI / 2 + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * Math.PI / 8, x = tg[0] + Math.cos(a) * rr, y = tg[1] + Math.sin(a) * rr; if (!W.isSol(Math.floor(x / 32), Math.floor(y / 32)) && W.cell(Math.floor(x / 32), Math.floor(y / 32)) !== 'v' && D.los(x, y, tg[0], tg[1])) best = [x, y]; } if (best) break; }
            best = best || [me.x, me.y]; for (let k = 0; k < 12; k++) { me.x = best[0]; me.y = best[1]; me.vx = me.vy = 0; me.hp = 100; D.update(1 / 30); } D.draw(); D.draw();
            const V = D.view3d.V, i = V.info(), sm = { count: ['k-dinge', 'k-dinge-klein'].reduce((a, n) => a + (V.scene.getObjectByName(n) ? V.scene.getObjectByName(n).count : 0), 0) }, mb = V.scene.getObjectByName('k-moebel');
            o[sc] = { err: i.err, errs: i.errs, calls: i.calls, tris: i.tris, k: i.k && { on: i.k.on, world: i.k.world }, dinge: sm ? sm.count : -1, moebel: mb ? mb.count : -1, kinds: Object.keys(i.scen), list: V.scen() };
          }
          const K = D.view3d.V.kl(); o.cut = K.mats.map(m => m.fragmentShader.includes('uCut') || m.vertexShader.includes('uCut'));
          await D.view3d.set(false); return o; })()`);
        if (r.i0) { t.note('3D nicht verfuegbar: ' + JSON.stringify(r.i0)); return; }
        t.note(JSON.stringify(Object.fromEntries(Object.entries(r).filter(([k]) => k !== 'cut').map(([k, v]) => [k, { calls: v.calls, tris: v.tris, w: v.k && v.k.world, d: v.dinge, kinds: v.kinds.join(' ') }]))));
        for (const sc of ['bank', 'jewel', 'gas', 'truck']) {
          const q = r[sc]; t.ok(q.errs === 0 && q.err === '', sc + ': ohne Fehler ' + (q.err || ''));
          t.ok(q.k && q.k.on, sc + ': Kloetzchen-Stil an'); t.ok(q.calls < 120 && q.tris < 150000, sc + ': Budget Draw Calls ' + q.calls + ', Dreiecke ' + q.tris);
          t.ok(!q.kinds.some(k => k[0] === '?'), sc + ': keine unbekannte Art');
        }
        t.ok(r.bank.k.world.bricks > 60 && r.bank.moebel > 0, 'Bank: Moebel als Kloetze (' + r.bank.k.world.bricks + ' Kloetze)');
        t.ok(r.bank.list.includes('vault') && r.bank.list.includes('pad'), 'Bank: Tresortuer und Tastenfeld da');
        t.ok(r.bank.dinge > 0, 'Bank: Szenario-Teile aus Kloetzen (' + r.bank.dinge + ')');
        t.ok(r.jewel.list.includes('vit') && r.jewel.k.world.bricks > 0, 'Juwelier: Vitrinen da (Bauer von Dinge B, sonst klassisch)');
        t.ok(r.gas.k.world.bricks > 0 && r.gas.list.includes('pump'), 'Tankstelle: Zapfsaeulen (' + r.gas.k.world.bricks + ' Kloetze)');
        t.ok(r.truck.dinge >= 0 && r.truck.list.includes('tk'), 'Transporter: Panzerwagen-Zubehoer');
        t.ok(r.cut.every(c => !c), 'Moebel-Material hat keinen Wandschnitt (Moebel bleiben stehen)');
        if (P.page.errors.length) t.ok(false, 'JS-Fehler: ' + P.page.errors.slice(0, 2).join(' | '));
      } finally { await P.done(); }
    },
  },
  {
    name: 'Kloetzchen-Dinge A: Gadgets am Boden (Mine, Claymore, Notfallkoffer, Ablenker, Granate) und Barrikaden-Zustand kommen aus Kloetzen, ohne Bauer klassisch, Schaden aendert die Teile',
    timeout: 240000,
    async run(t) {
      const P = await glPage(t); if (!P) return;
      try {
        await lib.loadInpage(P.page, 'bild.js');
        const r = await P.page.evaluate(`(async () => { const D = __dbg, o = {}; D.view3d.kstil = 1; const i0 = await D.view3d.set(true); if (i0.state !== 'an') return { i0 };
          PX.scene('bank', 5); PX.phase('ueberfall'); const me = D.get().me, V = D.view3d.V, K = V.kl(), cnt = () => ['k-dinge', 'k-dinge-klein'].reduce((a, n) => a + (V.scene.getObjectByName(n) ? V.scene.getObjectByName(n).count : 0), 0);
          const sd = () => { for (let i = 0; i < 3; i++) { me.hp = 100; D.update(1 / 30); } D.draw(); D.draw(); return V.info(); };
          let a = sd(); o.base = cnt(); o.baseKl = a.k.on;
          const x = me.x, y = me.y; D.traps().push({ k: 'mine', x: x + 40, y, a: 5, id: 91 }, { k: 'claw', x: x - 40, y, a: 5, id: 92 }); D.aids().push({ x, y: y + 40, id: 93, t: 5 }); D.dcyList().push({ x, y: y - 40, id: 94, t: 5 });
          a = sd(); o.gad = cnt(); o.err1 = a.err;
          const KL = K.KL, bak = {}; for (const n of ['d:trap', 'd:aid', 'd:dcy']) { bak[n] = KL.objs[n]; delete KL.objs[n]; } a = sd(); o.noHook = cnt(); o.err2 = a.err; Object.assign(KL.objs, bak);
          const B = D.bars()[0]; if (B) { B.lv = 2; B.hp = 60; for (const c of B.cells) {} a = sd(); o.bar2 = cnt(); const full = B.lv * D.CFG.bar.hp; B.hp = full; sd(); o.barOk = cnt(); B.hp = 1; sd(); o.barLow = cnt(); }
          const sb = n => !!K.sceneBuilder({ k: 'good', n }), kc = K.sceneBuilder({ k: 'd:trap' }); o.good = [sb('cig'), sb('shelf'), sb('unbekannt'), !!kc]; const gb = KL.objs['good:cig']; delete KL.objs['good:cig']; o.goodOff = sb('cig'); sd(); o.err3 = V.info().err; KL.objs['good:cig'] = gb;
          await D.view3d.set(false); return o; })()`);
        if (r.i0) { t.note('3D nicht verfuegbar'); return; }
        t.note(JSON.stringify(r));
        t.ok(r.err1 === '' && r.err2 === '', 'keine Fehler');
        t.ok(r.gad > r.base, 'Gadgets am Boden sind Kloetze (' + r.base + ' auf ' + r.gad + ')');
        t.ok(r.noHook < r.gad, 'ohne Bauer faellt das Ding klassisch zurueck (' + r.noHook + ')');
        t.eq(r.good, [true, true, false, true], 'Bauer-Wahl: good:cig, good:shelf da, unbekannte Unterart nicht, d:trap da');
        t.ok(r.goodOff === false && r.err3 === '', 'ohne good:cig faellt das Stueck klassisch zurueck, ohne Fehler');
        if (r.barOk != null) t.ok(r.barLow > r.barOk, 'Barrikade: Schaden fuegt Teile hinzu (' + r.barOk + ' auf ' + r.barLow + ')');
        if (P.page.errors.length) t.ok(false, 'JS-Fehler: ' + P.page.errors.slice(0, 2).join(' | '));
      } finally { await P.done(); }
    },
  },
];
