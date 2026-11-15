// Kloetzchen-Stil der 3D-Ansicht (Ticket 196 und 198, js/kl-*.js): Register (jede Datei laedt und traegt ein, unbekannte Arten fallen zurueck), Stil im Spiel (Figuren und Fahrzeuge aus Teilen, Rueckfall je Art,
// klassischer Stil bleibt waehlbar, Kamera naeher), Coop (Zerfall beim Client aus dem Zustand des Schnappschusses). Kein Pixelvergleich. Ohne WebGL 2 uebersprungen.
const path = require('path'), { pathToFileURL } = require('url');
const lib = require('../lib');
const { glPage } = require('../glshare');   // gemeinsamer WebGL-Browser (tests/glshare.js)
module.exports = [
  {
    name: 'Kloetzchen-Register: jede kl-Datei laedt und traegt sich ein, jede Art von V3CFG hat einen Bauer, unbekannte Arten haben keinen (view3d faellt zurueck), KL_API stimmt zum Kern',
    async run(t) {
      const root = lib.ROOT, K = await import(pathToFileURL(path.join(root, 'js', 'kl-kern.js')).href), V = await import(pathToFileURL(path.join(root, 'js', 'view3d.js')).href), KL = K.KL;
      t.eq(KL.files, K.KL_FILES, 'alle Dateien geladen und eingetragen');
      t.eq(K.KL_API, +(/const KL_API=(\d+);/.exec(require('fs').readFileSync(path.join(root, 'index.html'), 'utf8')) || [])[1], 'KL_API im Kern gleich KL_API in index.html');
      t.eq(K.mkKl.api, K.KL_API, 'mkKl.api gleich KL_API');
      const arts = Object.keys(V.V3CFG.fig.out), cars = Object.keys(V.V3CFG.cars);
      t.eq(arts.filter(a => !KL.hasFig(a)), [], 'Figurenarten ohne Bauer');
      t.eq(cars.filter(a => !KL.hasCar(a)), [], 'Fahrzeugarten ohne Bauer');
      t.ok(!KL.hasFig('gibtsnicht') && !KL.hasCar('gibtsnicht') && !KL.hasObj('gibtsnicht'), 'unbekannte Art hat keinen Bauer');
      t.ok(['C', 'e', 'm', 'b', 'r', 'A', 'k', 'q', 'p'].every(c => KL.hasObj(c)), 'Moebel der Bank eingetragen');
      const n = {}; KL.fx('probe', () => { n.x = 1 }); t.ok(KL.fxs.probe.length === 1, 'KL.fx traegt ein'); delete KL.fxs.probe;
    },
  },
  {
    name: 'Kloetzchen-Stil im Spiel: Figuren und Fahrzeuge aus Teilen, Kamera naeher, fehlender Bauer zeichnet einen grauen Klotz (und zaehlt), keine Fehler',
    timeout: 240000,
    async run(t) {
      const P = await glPage(t); if (!P) return;
      try {
        const r = await P.page.evaluate(`(async () => { const D = __dbg, o = {};
          D.setScenario('bank'); D.setSeedMode('random'); D.buildLay(D.layoutFor(5)); D.startHeist(); D.get().me.hp = 1e9;
          for (let i = 0; i < 600; i++) { D.get().me.hp = 1e9; D.update(1 / 30); }
          await D.view3d.set(true); D.draw(); D.draw(); const V = D.view3d.V, i = V.info();
          o.out = { n: i.k.ol.n, day: i.k.ol.c, want: V.cfg.fig && V.cfg.fig.look ? [V.cfg.fig.look.outDay, V.cfg.fig.look.outNight] : null }; D.setLage && D.setLage(['nacht']); D.buildLay(D.layoutFor(5)); D.startHeist(); for (let j = 0; j < 5; j++) D.update(1 / 30); D.draw(); D.draw(); o.out.night = V.info().k.ol.c; o.kl = { k: i.k && { on: i.k.on, figsK: i.k.figsK, carsK: i.k.carsK, parts: i.k.parts, zoom: i.k.zoom, fb: JSON.parse(JSON.stringify(i.k.fb)) }, err: i.err, calls: i.calls };
          const K = V.kl(); o.listed = [Object.keys(K.KL.figs).length, Object.keys(K.KL.cars).length];
          const bak = Object.assign({}, K.KL.figs); for (const k in bak) delete K.KL.figs[k]; D.draw(); D.draw(); const i2 = V.info(); o.noCop = { figsK: i2.k.figsK, fb: JSON.parse(JSON.stringify(i2.k.fb)), err: i2.err }; Object.assign(K.KL.figs, bak);
          const bak2 = Object.assign({}, K.KL.cars); for (const k in bak2) delete K.KL.cars[k]; D.draw(); D.draw(); const i3 = V.info(); o.noPol = { carsK: i3.k.carsK, fb: JSON.parse(JSON.stringify(i3.k.fb)), err: i3.err }; Object.assign(K.KL.cars, bak2);
          D.draw(); D.draw(); o.back = { fb: V.info().k.fb, err: V.info().err }; await D.view3d.set(false); return o; })()`);
        t.note('Kloetzchen ' + JSON.stringify(r.kl) + '; ohne Bauer Figur ' + JSON.stringify(r.noCop) + '; ohne Bauer Auto ' + JSON.stringify(r.noPol));
        t.ok(r.kl.err === '' && r.noCop.err === '' && r.noPol.err === '' && r.back.err === '', 'keine Fehler in der Ansicht');
        t.ok(r.out.n > 0 && r.out.want && r.out.day === r.out.want[0] && r.out.night === r.out.want[1], 'Klötzchen-Umriss der Figuren da und bei Tag dunkel, bei Nacht hell (outDay, outNight): ' + JSON.stringify(r.out));
        t.ok(r.kl.k && r.kl.k.on && r.kl.k.figsK > 0 && r.kl.k.carsK > 0 && r.kl.k.parts > 100, 'Figuren und Fahrzeuge aus Teilen: ' + JSON.stringify(r.kl.k));
        const n = f => Object.keys(f.fig || {}).length + Object.keys(f.car || {}).length;
        t.eq(n(r.kl.k.fb), 0, 'kein Rueckfall, solange alle Arten einen Bauer haben');
        t.ok(n(r.noCop.fb) > 0 && r.noCop.figsK > 0, 'Figur ohne Bauer: grauer Klotz statt Absturz, im Zaehler: ' + JSON.stringify(r.noCop.fb));
        t.ok(n(r.noPol.fb) > 0 && r.noPol.carsK > 0, 'Fahrzeug ohne Bauer: grauer Klotz, im Zaehler: ' + JSON.stringify(r.noPol.fb));
        t.ok(r.kl.k.zoom < 1, 'Kamera naeher um den Faktor zoom: ' + r.kl.k.zoom);
        if (P.page.errors.length) t.ok(false, 'JS-Fehler: ' + P.page.errors.slice(0, 2).join(' | '));
      } finally { await P.done(); }
    },
  },
  {
    name: 'Kloetzchen-Coop: der Client zeichnet den Zerfall eines Autos aus dem Zustand des Schnappschusses (Test-Leitung), Host und Client gleich',
    timeout: 300000,
    async run(t) {
      const P = await glPage(t); if (!P) return;
      try {
        await lib.loadTool(P.page, 'loopnet.js'); await lib.loadInpage(P.page, 'coop.js');
        const r = await P.page.evaluate(`(async () => {
          const G = CT.mkGame('bank', 321, 2), A = G.A, B = G.clients[0]; A.CFG.policeAt = 1e6; A.CFG.policeForced = 1e6;
          const run = n => { for (let i = 0; i < n; i++) step(G.insts, G.net, 1 / 60); };
          for (const d of [A, B]) { await d.view3d.set(true); }
          A.startHeist(); run(120); for (const d of [A, B]) { d.draw(); d.draw(); }
          const car = A.get().cars.find(c => c.civ && !c.dead); if (!car) return { nocar: 1 };
          const k0 = [A, B].map(d => d.view3d.V.info().k.deb);
          A.get().me.hp = 1e9; A.carBlow(car, 0); let deb = [0, 0], wr = [0, 0];
          for (let i = 0; i < 60; i++) { run(1); if (i % 2) for (const d of [A, B]) d.draw(); const k = [A, B].map(d => d.view3d.V.info().k); deb = deb.map((v, j) => Math.max(v, k[j].deb)); }
          const kk = [A, B].map(d => d.view3d.V.info()); const out = { k0, deb, wreck: kk.map(i => i.ck && i.ck.wreck || 0), err: kk.map(i => i.err), on: kk.map(i => i.k.on) };
          for (const d of [A, B]) await d.view3d.set(false); for (const d of G.insts) { try { d.leaveGame(); } catch (e) {} } return out; })()`);
        t.note(JSON.stringify(r));
        if (r.nocar) { t.note('kein ziviles Auto auf der Karte, Coop-Teil uebersprungen'); return; }
        t.ok(r.err.every(e => e === '') && r.on.every(Boolean), 'beide Ansichten im Kloetzchen-Stil ohne Fehler');
        t.ok(r.wreck[0] > 0 && r.wreck[1] > 0, 'das Wrack steht bei Host und Client');
        t.ok(r.deb[0] > 10 && r.deb[1] > 10, 'Zerfall mit Teilen bei Host (' + r.deb[0] + ') und Client (' + r.deb[1] + ')');
        if (P.page.errors.length) t.ok(false, 'JS-Fehler: ' + P.page.errors.slice(0, 2).join(' | '));
      } finally { await P.done(); }
    },
  },
];
