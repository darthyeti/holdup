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
    name: 'Kloetzchen-Stil im Spiel: Figuren und Fahrzeuge aus Teilen, Kamera naeher, ohne Bauer zeichnet view3d wie sonst, klassischer Stil waehlbar, keine Fehler',
    timeout: 240000,
    async run(t) {
      const P = await glPage(t); if (!P) return;
      try {
        const r = await P.page.evaluate(`(async () => { const D = __dbg, o = {};
          D.setScenario('bank'); D.setSeedMode('random'); D.buildLay(D.layoutFor(5)); D.startHeist(); D.get().me.hp = 1e9;
          for (let i = 0; i < 600; i++) { D.get().me.hp = 1e9; D.update(1 / 30); }
          const shot = async st => { D.view3d.kstil = st; await D.view3d.set(true); D.draw(); D.draw(); const V = D.view3d.V, i = V.info(); return { k: i.k && { on: i.k.on, figsK: i.k.figsK, carsK: i.k.carsK, parts: i.k.parts, zoom: i.k.zoom }, figs: i.figs, cars: i.cars, figParts: i.figParts, camY: i.camY, err: i.err, calls: i.calls }; };
          o.klass = await shot(0); o.kl = await shot(1);
          const K = D.view3d.V.kl(); o.listed = [Object.keys(K.KL.figs).length, Object.keys(K.KL.cars).length];
          const bak = Object.assign({}, K.KL.figs); for (const k in bak) delete K.KL.figs[k]; D.draw(); D.draw(); const i2 = D.view3d.V.info(); o.noCop = { figsK: i2.k.figsK, figParts: i2.figParts, err: i2.err }; Object.assign(K.KL.figs, bak);
          const bak2 = Object.assign({}, K.KL.cars); for (const k in bak2) delete K.KL.cars[k]; D.draw(); D.draw(); const i3 = D.view3d.V.info(); o.noPol = { carsK: i3.k.carsK, err: i3.err }; Object.assign(K.KL.cars, bak2);
          o.back = await shot(0); await D.view3d.set(false); return o; })()`);
        t.note('klassisch ' + JSON.stringify(r.klass) + '; Kloetzchen ' + JSON.stringify(r.kl) + '; ohne Bauer cop ' + JSON.stringify(r.noCop));
        t.ok(r.klass.err === '' && r.kl.err === '' && r.noCop.err === '' && r.noPol.err === '' && r.back.err === '', 'keine Fehler in der Ansicht');
        t.ok(r.kl.k && r.kl.k.on && r.kl.k.figsK > 0 && r.kl.k.carsK > 0 && r.kl.k.parts > 100, 'Figuren und Fahrzeuge aus Teilen (K): ' + JSON.stringify(r.kl.k));
        t.ok(r.kl.figParts === 0, 'ohne klassische Figuren, wenn alle Arten einen Bauer haben: ' + r.kl.figParts);
        t.ok(r.klass.figParts > 0 && r.klass.figs > 0, 'klassisch zeichnet die Low-Poly-Figuren');
        t.ok(r.noCop.figParts > 0 && r.noCop.figsK === 0, 'Art ohne Bauer faellt auf die klassische Figur zurueck');
        t.ok(r.noPol.carsK === 0, 'Fahrzeug ohne Bauer faellt zurueck');
        t.ok(Math.abs(r.kl.camY / r.klass.camY - r.kl.k.zoom) < .02 && r.kl.k.zoom < 1, 'Kamera naeher um den Faktor zoom: ' + (r.kl.camY / r.klass.camY).toFixed(3));
        t.ok(r.back.figParts > 0, 'klassischer Stil bleibt waehlbar');
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
          for (const d of [A, B]) { d.view3d.kstil = 1; await d.view3d.set(true); }
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
