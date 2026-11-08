// Grundprobe: Seite laedt, Debug-Hook steht, alle sechs Szenarien lassen sich bauen und ein paar Sekunden simulieren.
const SC = ['bank', 'truck', 'jewel', 'gas', 'museum', 'casino', 'nb'];

module.exports = [
  {
    name: 'Start: Debug-Hook und Sprites',
    async run(t) {
      const r = await t.page.evaluate(() => ({ build: __dbg.BUILD, players: __dbg.get().players.length, phase: __dbg.get().phase }));
      t.ok(r.build && r.build.n > 0, 'BUILD fehlt');
      t.eq(r.players, 1, 'Spielerzahl');
    },
  },
  {
    name: 'Start: alle Szenarien bauen und simulieren',
    async run(t) {
      for (const sc of SC) {
        const r = await t.page.evaluate(sc => {
          __dbg.setScenario(sc); __dbg.setSeedMode('random'); __dbg.buildLay(__dbg.layoutFor(4242));
          for (let i = 0; i < 60 * 8; i++) __dbg.update(1 / 30);
          const g = __dbg.get();
          return { its: g.its.length, hp: g.me.hp, time: Math.round(g.time), sc: __dbg.sc() };
        }, sc);
        t.eq(r.sc, sc, 'Szenario');
        t.ok(r.its > 0, sc + ': keine Items');
        t.ok(r.hp > 0, sc + ': Spieler tot nach 8 s in Phase 1');
      }
    },
  },
  {
    name: 'Start: index.html und js/ui.js gehoeren zusammen (Build-Nummer im Skript-Tag, Version)',
    async run(t) {
      const r = await t.page.evaluate(async () => {
        const html = await (await fetch('index.html', { cache: 'no-store' })).text();
        const tag = /js\/ui\.js\?v=(\d+)/.exec(html), uiSrc = await (await fetch('js/ui.js', { cache: 'no-store' })).text();
        return { tag: tag && +tag[1], build: __dbg.BUILD.n, api: typeof mkUI === 'function' ? mkUI.api : null, apiInUi: /mkUI\.api=(\d+)/.exec(uiSrc), apiInCore: /const UI_API=(\d+)/.exec(html), size: uiSrc.length };
      });
      t.eq(r.tag, r.build, 'Skript-Tag js/ui.js?v=N muss die Build-Nummer tragen (der Hook setzt sie)');
      t.ok(r.apiInUi && r.apiInCore && r.apiInUi[1] === r.apiInCore[1] && r.api === +r.apiInCore[1], 'mkUI.api und UI_API muessen gleich sein');
    },
  },
  {
    name: 'Start: alle js/*.js im Skript-Tag tragen die Build-Nummer und sind geladen',
    async run(t) {
      const r = await t.page.evaluate(async () => {
        const html = await (await fetch('index.html', { cache: 'no-store' })).text();
        const tags = [...html.matchAll(/<script src="js\/([\w-]+\.js)\?v=(\d+)"><\/script>/g)].map(m => ({ f: m[1], v: +m[2] }));
        const loaded = { 'ui.js': typeof mkUI === 'function', 'snd.js': typeof SND === 'object' && typeof SND.init === 'function', 'flog.js': typeof mkFlog === 'function' && typeof FL_SINKS === 'object', 'maps.js': typeof mkMaps === 'function' && mkMaps.api === 1, 'draw.js': typeof mkDraw === 'function' && mkDraw.api === +(/const DRAW_API=(\d+)/.exec(html) || [])[1] };
        return { tags, build: __dbg.BUILD.n, loaded, bare: (html.match(/<script src="js\/[^"?]+"/g) || []).length };
      });
      const files = r.tags.map(x => x.f);
      for (const f of ['ui.js', 'snd.js', 'flog.js', 'maps.js', 'draw.js']) t.ok(files.includes(f), 'Skript-Tag fehlt: js/' + f);
      for (const x of r.tags) {
        t.eq(x.v, r.build, 'js/' + x.f + '?v=N muss die Build-Nummer tragen');
        t.ok(r.loaded[x.f] !== false, 'js/' + x.f + ' nicht geladen');
        t.ok(x.f in r.loaded, 'js/' + x.f + ': unbekannte Datei, Ladeprobe in 00-start ergaenzen');
      }
      t.eq(r.bare, 0, 'Skript-Tag js/... ohne ?v=N');
    },
  },
  {
    name: 'Start: fehlt js/snd.js, js/flog.js, js/maps.js oder js/draw.js, kommt eine klare Meldung',
    async run(t) {
      for (const f of ['snd', 'flog', 'maps', 'draw']) {
        const page = await t.env.browser.newContext({ viewport: { width: 1000, height: 640 } }).then(c => c.newPage());
        await page.route('**/js/' + f + '.js*', r => r.fulfill({ status: 404, body: '' }));
        await page.goto(t.env.url + '/index.html');
        await page.waitForFunction(() => !document.getElementById('err').hidden, null, { timeout: 15000 });
        const msg = await page.evaluate(() => document.getElementById('err').textContent);
        await page.context().close();
        t.ok(msg.includes('js/' + f + '.js') && /fehlt/.test(msg) && /neu laden/.test(msg), f + ': Meldung: ' + msg);
      }
    },
  },
  {
    name: 'Start: alte js/ui.js im Cache gibt eine klare Meldung statt eines stillen Fehlers',
    async run(t) {
      const fs = require('fs'), path = require('path');
      const old = fs.readFileSync(path.join(__dirname, '..', 'fixtures', 'ui-build44.js'), 'utf8');   // js/ui.js von Build 44, ohne mkUI.api
      const page = await t.env.browser.newContext({ viewport: { width: 1000, height: 640 } }).then(c => c.newPage());
      await page.route('**/js/ui.js*', r => r.fulfill({ body: old, contentType: 'text/javascript' }));
      await page.goto(t.env.url + '/index.html');
      await page.waitForFunction(() => !document.getElementById('err').hidden, null, { timeout: 15000 });
      const msg = await page.evaluate(() => document.getElementById('err').textContent);
      await page.context().close();
      t.ok(/veraltet/.test(msg) && /neu laden/.test(msg), 'Meldung: ' + msg);
    },
  },
  {
    name: 'Start: js/maps.js und index.html gehoeren zusammen (mkMaps.api gleich MAPS_API), eine veraltete Datei gibt eine klare Meldung',
    async run(t) {
      const fs = require('fs'), path = require('path');
      const r = await t.page.evaluate(async () => {
        const html = await (await fetch('index.html', { cache: 'no-store' })).text(), src = await (await fetch('js/maps.js', { cache: 'no-store' })).text();
        return { apiInFile: /mkMaps\.api=(\d+)/.exec(src), apiInCore: /const MAPS_API=(\d+)/.exec(html), api: typeof mkMaps === 'function' ? mkMaps.api : null, global: Object.prototype.hasOwnProperty.call(window, 'MAPS_API') };
      });
      t.ok(r.apiInFile && r.apiInCore && r.apiInFile[1] === r.apiInCore[1] && r.api === +r.apiInCore[1], 'mkMaps.api und MAPS_API muessen gleich sein');
      t.ok(!r.global, 'MAPS_API ist ein const im Kernskript, kein window-Name');
      const page = await t.env.browser.newContext({ viewport: { width: 1000, height: 640 } }).then(c => c.newPage());
      await page.route('**/js/maps.js*', rt => rt.fulfill({ body: 'function mkMaps(){}', contentType: 'text/javascript' }));   // alte Datei ohne mkMaps.api
      await page.goto(t.env.url + '/index.html');
      await page.waitForFunction(() => !document.getElementById('err').hidden, null, { timeout: 15000 });
      const msg = await page.evaluate(() => document.getElementById('err').textContent);
      await page.context().close();
      t.ok(/js\/maps\.js/.test(msg) && /veraltet/.test(msg) && /neu laden/.test(msg), 'Meldung: ' + msg);
    },
  },
  {
    name: 'Start: js/draw.js und index.html gehoeren zusammen (mkDraw.api gleich DRAW_API), eine veraltete Datei gibt eine klare Meldung',
    async run(t) {
      const r = await t.page.evaluate(async () => {
        const html = await (await fetch('index.html', { cache: 'no-store' })).text(), src = await (await fetch('js/draw.js', { cache: 'no-store' })).text();
        return { apiInFile: /mkDraw\.api=(\d+)/.exec(src), apiInCore: /const DRAW_API=(\d+)/.exec(html), api: typeof mkDraw === 'function' ? mkDraw.api : null, global: Object.prototype.hasOwnProperty.call(window, 'DRAW_API') };
      });
      t.ok(r.apiInFile && r.apiInCore && r.apiInFile[1] === r.apiInCore[1] && r.api === +r.apiInCore[1], 'mkDraw.api und DRAW_API muessen gleich sein');
      t.ok(!r.global, 'DRAW_API ist ein const im Kernskript, kein window-Name');
      const page = await t.env.browser.newContext({ viewport: { width: 1000, height: 640 } }).then(c => c.newPage());
      await page.route('**/js/draw.js*', rt => rt.fulfill({ body: 'function mkDraw(){}', contentType: 'text/javascript' }));   // alte Datei ohne mkDraw.api
      await page.goto(t.env.url + '/index.html');
      await page.waitForFunction(() => !document.getElementById('err').hidden, null, { timeout: 15000 });
      const msg = await page.evaluate(() => document.getElementById('err').textContent);
      await page.context().close();
      t.ok(/js\/draw\.js/.test(msg) && /veraltet/.test(msg) && /neu laden/.test(msg), 'Meldung: ' + msg);
    },
  },
  {
    name: 'Start: 3D-Modul js/view3d.js (Ticket 149): import im Kern traegt die Build-Nummer, mkView3d.api passt zu VIEW3D_API, three liegt in assets/',
    async run(t) {
      const r = await t.page.evaluate(async () => {
        const html = await (await fetch('index.html', { cache: 'no-store' })).text(), src = await (await fetch('js/view3d.js', { cache: 'no-store' })).text();
        const th = await fetch('assets/three.module.min.js', { cache: 'no-store' }), tb = await th.text();
        return { imp: [...html.matchAll(/import\('\.\/js\/view3d\.js\?v=(\d+)'\)/g)].map(m => +m[1]), build: __dbg.BUILD.n, api: (/mkView3d\.api = (\d+);/.exec(src) || [])[1], core: (/const VIEW3D_API=(\d+);/.exec(html) || [])[1],
          from: /from '\.\.\/assets\/three\.module\.min\.js'/.test(src), three: th.ok && /const t="170"/.test(tb.slice(0, 400)), n: tb.length };
      });
      t.eq(r.imp, [r.build], 'genau ein import(\'./js/view3d.js?v=N\') mit der Build-Nummer (stamp-build setzt sie)');
      t.ok(r.api && r.api === r.core, 'mkView3d.api und VIEW3D_API gleich: ' + r.api + ' / ' + r.core);
      t.ok(r.from && r.three && r.n === 691648, 'js/view3d.js laedt assets/three.module.min.js (Three.js 0.170.0, 691.648 Bytes): ' + r.n);
    },
  },
  {
    name: 'Start: fehlt js/view3d.js oder ist es veraltet, faellt 3D mit klarer Meldung auf 2D zurueck und das Spiel laeuft',
    async run(t) {
      for (const k of ['404', 'alt']) {
        const ctx = await t.env.browser.newContext({ viewport: { width: 1000, height: 640 } });
        await ctx.route('**/js/view3d.js*', r => k === '404' ? r.fulfill({ status: 404, body: '' }) : r.fulfill({ body: 'export function mkView3d(){return{on:true}}', contentType: 'text/javascript' }));
        const page = await ctx.newPage(), errs = []; page.on('pageerror', e => errs.push(String(e)));
        await page.goto(t.env.url + '/index.html#debug');
        await page.waitForFunction(() => window.__dbg && __dbg.get && __dbg.get().players, null, { timeout: 30000 });
        const r = await page.evaluate(async () => { const D = __dbg; D.setFocus(true); const i = await D.view3d.set(true); for (let n = 0; n < 10; n++) D.update(1 / 30); D.draw(); const c = document.getElementById('c');
          return { st: i.state, err: i.err, msg: D.view3d.msg, mid: c.getContext('2d').getImageData(960, 500, 1, 1).data[3] }; });
        await ctx.close();
        t.eq(r.st, 'rueckfall', k + ': Zustand');
        t.ok(/js\/view3d\.js/.test(r.err) && (k === '404' ? /nicht ladbar/ : /veraltet/).test(r.err) && /weiter in 2D/.test(r.msg), k + ': Meldung: ' + r.msg);
        t.ok(r.mid === 255, k + ': Welt weiter in 2D gezeichnet');
        t.eq(errs, [], k + ': keine JS-Fehler');
      }
    },
  },
];
