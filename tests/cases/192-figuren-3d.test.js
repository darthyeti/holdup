// 3D-2a (Ticket 151): Figuren und Fahrzeuge der 3D-Ansicht als Aufsteller aus den Sprites (js/draw.js figs3d, js/view3d.js V3CFG.figs und V3CFG.cars). Kein Pixelvergleich, Zustaende ueber den Debug-Hook.
// Jede Figurenart und jedes Fahrzeug aus dem Spiel braucht einen Eintrag (neue Art ohne Eintrag macht rot), in 3D stehen genau so viele Figuren und Fahrzeuge wie 2D zeichnet
// (gezaehlt an drawImage mit chars.png, chars_flash.png und cars.png), Zustaende aendern die Darstellung, Draw Calls im Budget, der Coop-Client zeigt dieselben Figuren.
const fs = require('fs');
const path = require('path');
const lib = require('../lib');

async function glPage(t, coop) {
  const ok = p => p.evaluate(() => { const c = document.createElement('canvas'); return !!c.getContext('webgl2'); });
  if (!coop && await ok(t.page)) return { page: t.page, done: async () => {} };
  const env = await lib.launch({ webgl: true });
  const page = await lib.openGame(env);
  if (await ok(page)) return { page, done: async () => { await page.ctx.close().catch(() => {}); await env.browser.close().catch(() => {}); env.srv.close(); } };
  await env.browser.close().catch(() => {}); env.srv.close();
  t.note('kein WebGL 2 im Test-Chromium (auch nicht mit SwiftShader-Flags), 3D-Teil uebersprungen');
  return null;
}
// in der Seite: 2D zeichnen und die Figuren- und Fahrzeugbilder zaehlen, dann 3D zeichnen und die Liste der Ansicht holen (D eine Instanz)
const COUNT = `async (D) => {
  const P = CanvasRenderingContext2D.prototype, di = P.drawImage; let ch = 0, car = 0;
  await D.view3d.set(false); D.draw();
  P.drawImage = function (img) { const s = img && img.src || ''; if (/chars(_flash)?\\.png/.test(s)) ch++; else if (/cars\\.png/.test(s)) car++; return di.apply(this, arguments); };
  try { D.draw(); } finally { P.drawImage = di; }
  await D.view3d.set(true); D.draw(); D.draw();
  const i = D.view3d.info(); return { ch, car, i, dyn: D.view3d.V.dyn() };
}`;

module.exports = [
  {
    name: '3D-Figuren: jede Figurenart und jedes Fahrzeug aus dem Spiel hat einen Eintrag in V3CFG.figs und V3CFG.cars, 2D-Zeichenstellen und figs3d passen zusammen',
    async run(t) {
      const html = fs.readFileSync(path.join(lib.ROOT, 'index.html'), 'utf8'), dj = fs.readFileSync(path.join(lib.ROOT, 'js/draw.js'), 'utf8');
      const cfg = await t.page.evaluate(async () => { const m = await import('/js/view3d.js'); return { figs: m.V3CFG.figs, cars: m.V3CFG.cars }; });
      // Gegnerarten: jede Zuweisung kind:... in index.html (auch die Auswahl in mkCop), Personen der Karte: mk('art',Zeile,...) (die NPC-Fabrik)
      const en = new Set(); for (const m of html.matchAll(/\bkind:([^,}]{1,60})/g)) for (const q of m[1].matchAll(/'(\w+)'/g)) en.add(q[1]);
      const npc = new Set([...html.matchAll(/\bmk\('(\w+)',\d/g)].map(m => m[1]));
      t.ok(['cop', 'swat', 'shield', 'sniper', 'grd'].every(k => en.has(k)), 'Gegnerarten aus index.html gelesen: ' + [...en].join(','));
      t.ok(['civ', 'grd', 'mgr', 'tel'].every(k => npc.has(k)), 'Personenarten aus index.html gelesen: ' + [...npc].join(','));
      // feste Arten aus figs3d: Spieler, Fahrer, Gefasste, Tote, Spieler am Boden
      const fn = (/function figs3d\(\)\{[\s\S]*?\nreturn\{f:F,c:C\}\}/.exec(dj) || [''])[0];
      t.ok(fn.length > 500, 'figs3d in js/draw.js gefunden');
      const lit = new Set([...fn.matchAll(/fg\('(\w+)'/g)].map(m => m[1]).concat([...fn.matchAll(/'(\w+)'/g)].map(m => m[1]).filter(k => k === 'pl')));
      const carLit = new Set([...fn.matchAll(/C\.push\(\{k:([^,]{1,60})/g)].flatMap(m => [...m[1].matchAll(/'(\w+)'/g)].map(q => q[1])));
      const need = [...new Set([...en, ...npc, ...lit, 'pl'])];
      t.eq(need.filter(k => !cfg.figs[k]), [], 'Figurenarten ohne Eintrag in V3CFG.figs (js/view3d.js)');
      t.ok(['van', 'pol', 'civ', 'wreck', 'tk', 'vh'].every(k => carLit.has(k)), 'Fahrzeugarten aus figs3d: ' + [...carLit].join(','));
      t.eq([...carLit].filter(k => !cfg.cars[k]), [], 'Fahrzeugarten ohne Eintrag in V3CFG.cars');
      t.ok(Object.values(cfg.figs).every(e => e.r > 0 && e.r < 16) && Object.values(cfg.cars).every(e => e.h > 0 && e.h <= 64), 'Eintraege gueltig (Radius, Hoehe)');
      // Wer in 2D eine neue Figuren- oder Fahrzeugzeichnung einbaut, muss figs3d nachziehen: Zahl der Zeichenstellen in lyWorld und drum herum
      const lw = (/function lyWorld\(\)\{[\s\S]*?\nfunction figs3d/.exec(dj) || [''])[0];
      const spr = (lw.match(/\bsprite\(DX\.ch/g) || []).length + (dj.match(/function dvDraw[^\n]*sprite\(DX\.ch/g) || []).length, bod = (lw.match(/\bbody\(/g) || []).length, ko = (lw.match(/\bkoDraw\(/g) || []).length;
      const cars = (dj.match(/drawImage\(cars,/g) || []).length;
      t.eq([spr, bod, ko, cars], [6, 2, 1, 4], 'Zeichenstellen in 2D (sprite, body, koDraw, cars): bei Aenderung figs3d und V3CFG nachziehen');
    },
  },
  {
    name: '3D-Figuren: Bank im Ueberfall mit Polizei, so viele Aufsteller und Fahrzeuge wie 2D zeichnet, keine Art ohne Eintrag, Figuren und Fahrzeuge unter 60 Draw Calls',
    timeout: 240000,
    async run(t) {
      const P = await glPage(t); if (!P) return;
      try {
        const page = P.page;
        const r = await page.evaluate(`(async () => { const D = __dbg, C = ${COUNT}, o = {};
          const i0 = await D.view3d.set(true); if (i0.state !== 'an') return { i0 };
          D.setScenario('bank'); D.buildSeed('classic'); D.setFocus(true); D.CFG.policeAt = 6; D.reset(); D.startHeist(false, D.get().me);
          const run = n => { for (let i = 0; i < n; i++) { D.get().me.hp = 1e9; D.update(1 / 30); } };
          run(30 * 45);
          // Spieler vor die Tuer auf die Strasse: Polizei, Autos und Leute in der Halle in Sicht
          const g = D.get(), m = g.me, cop = g.en.find(e => e.kind === 'cop'); if (cop) { m.x = cop.x; m.y = cop.y - 40; }
          run(3); o.a = await C(D); o.en = g.en.length;
          return o; })()`);
        if (!r.a) { t.ok(false, '3D nicht an: ' + JSON.stringify(r.i0)); return; }
        const i = r.a.i;
        t.note('2D: ' + r.a.ch + ' Figuren, ' + r.a.car + ' Fahrzeuge; 3D: ' + i.figs + ' / ' + i.cars + ', Arten ' + JSON.stringify(i.fk) + ' ' + JSON.stringify(i.ck) + ', ' + i.calls + ' Draw Calls (davon ' + i.dynCalls + ' Figuren und Fahrzeuge), ' + i.tris + ' Dreiecke');
        t.ok(i.errs === 0, 'keine Fehler beim Zeichnen: ' + i.err);
        t.eq(Object.keys(i.fk).concat(Object.keys(i.ck)).filter(k => k[0] === '?'), [], 'keine Figur oder kein Fahrzeug ohne Eintrag');
        t.ok(r.a.ch >= 5 && (i.fk.cop || 0) >= 1 && i.fk.pl === 1 && (i.ck.pol || 0) >= 1, 'Szene mit Polizei, Spieler und Streifenwagen: ' + JSON.stringify([r.a.ch, i.fk, i.ck]));
        t.eq(i.figs, r.a.ch, 'Zahl der Aufsteller gleich Zahl der in 2D gezeichneten Figuren');
        t.eq(i.cars, r.a.car, 'Zahl der Fahrzeuge gleich Zahl der in 2D gezeichneten Fahrzeuge');
        // Budget aus den echten Aufrufen: alle Draw Calls minus statische Welt (Boden plus ein InstancedMesh je belegtem Material und Glas, Test 191)
        const stat = 1 + i.parts.filter(n => n > 0).length, dyn = i.calls - stat;
        t.ok(i.dynCalls >= 4 && dyn === i.dynCalls && dyn < 60, 'Figuren und Fahrzeuge unter 60 Draw Calls: ' + dyn + ' (Gruppen ' + i.dynCalls + ', statisch ' + stat + ')');
        t.ok(i.calls < 120 && i.tris < 150000, 'gesamt unter 120 Draw Calls und 150.000 Dreiecken: ' + i.calls + ', ' + i.tris);
        await page.evaluate(() => __dbg.view3d.reset());
        if (page !== t.page && page.errors.length) t.ok(false, 'JS-Fehler: ' + page.errors.slice(0, 2).join(' | '));
      } finally { await P.done(); }
    },
  },
  {
    name: '3D-Figuren: Zustaende aendern die Darstellung (bewusstlos, am Boden, Treffer, geduckt, Blickrichtung, Schild, Gewehr, Beute), Transporter mit Panzerwagen wie in 2D',
    timeout: 240000,
    async run(t) {
      const P = await glPage(t); if (!P) return;
      try {
        const page = P.page;
        const r = await page.evaluate(`(async () => { const D = __dbg, C = ${COUNT}, o = {};
          const i0 = await D.view3d.set(true); if (i0.state !== 'an') return { i0 };
          D.setScenario('bank'); D.buildSeed('classic'); D.setFocus(true); D.CFG.policeAt = 1e6; D.CFG.policeForced = 1e6; D.reset(); D.update(1 / 30);
          const g = D.get(), m = g.me, find = (k) => D.view3d.V.dyn().f.filter(f => f[0] === k);
          // eine sichtbare Person der Bank (Angestellte am Schalter)
          const n = g.npcs.find(q => q.k === 'tel'); m.x = n.x; m.y = n.y + 70; D.update(1 / 30); D.draw();
          const row = () => D.view3d.V.dyn().f.find(f => f[5] === Math.round(n.x) && f[6] === Math.round(n.y));
          o.n0 = row(); o.lie0 = D.view3d.info().lie;
          n.st = 'ko'; n.kt = 20; D.draw(); o.nko = row(); o.lie1 = D.view3d.info().lie;
          n.st = 'cower'; D.draw(); o.ncw = row(); n.st = 'idle';
          // Blickrichtung des Spielers
          m.a = 0; D.draw(); o.a0 = find('pl')[0][7]; m.a = 1.5; D.draw(); o.a1 = find('pl')[0][7];
          // Treffer (chars_flash) und Beute auf dem Ruecken
          m.hurt = 1; D.draw(); o.hit = [find('pl')[0][4], D.view3d.info().hit]; m.hurt = 0;
          m.units = 2; D.draw(); o.bag = [find('pl')[0][10], D.view3d.info().xparts]; m.units = 0; D.draw(); o.bag0 = D.view3d.info().xparts;
          // am Boden: liegt, tot ohne Koerper
          m.dead = true; m.dn = 8; D.draw(); o.down = find('down')[0]; o.pl = find('pl').length; m.dead = false; m.dn = 0; D.draw();
          // Schild-Beamter und Scharfschuetze direkt vor dem Spieler (nur zum Zeichnen eingesetzt, danach wieder raus)
          const e1 = Object.assign({}, g.en[0] || {}, { id: 9001, kind: 'shield', row: 0, x: m.x + 40, y: m.y, a: 3, sh: 50, h: 0, w: 0, mvg: false, hp: 100, mhp: 100 });
          const e2 = Object.assign({}, e1, { id: 9002, kind: 'sniper', row: 8, x: m.x - 40, sh: 0, aimA: null });
          g.en.push(e1, e2); D.draw(); o.sh = find('shield')[0]; o.sn = find('sniper')[0]; o.xp = D.view3d.info().xparts; o.xb = D.view3d.info().cars;
          e1.h = 1; D.draw(); o.enHit = find('shield')[0][4];
          g.en.splice(g.en.indexOf(e1), 1); g.en.splice(g.en.indexOf(e2), 1);
          // Transporter: Panzerwagen und Begleitfahrzeug, wenn sie fahren, gleiche Zahl wie in 2D
          D.setScenario('truck'); D.buildSeed(3); D.reset(); D.setFocus(true); D.startHeist(false, D.get().me);
          for (let i = 0; i < 30 * 240 && !(D.tk() && D.tk().st !== 'wait'); i++) { D.get().me.hp = 1e9; D.update(1 / 30); }
          const tk = D.tk(); if (tk) { D.get().me.x = tk.x; D.get().me.y = tk.y + 90; } D.update(1 / 30);
          o.tr = await C(D); o.tkSt = tk && tk.st;
          D.setScenario('bank'); D.buildSeed('classic'); D.view3d.reset();
          return o; })()`);
        if (!r.n0) { t.ok(false, '3D nicht an oder keine Person: ' + JSON.stringify(r)); return; }
        t.ok(r.n0[3] === 0 && r.n0[2] !== 7, 'Angestellte steht: ' + JSON.stringify(r.n0));
        t.ok(r.nko && r.nko[3] === 1 && r.nko[2] === 7 && r.lie1 === r.lie0 + 1, 'bewusstlos: liegt (Spalte 7, ohne Koerper): ' + JSON.stringify([r.nko, r.lie0, r.lie1]));
        t.ok(r.ncw && r.ncw[2] === 8 && r.ncw[3] === 0, 'geduckt: Spalte 8: ' + JSON.stringify(r.ncw));
        t.ok(r.a0 === 0 && r.a1 === 1.5, 'Blickrichtung folgt dem Winkel: ' + [r.a0, r.a1]);
        t.eq(r.hit, [1, 1], 'Treffer: Trefferbild (chars_flash)');
        t.ok(r.bag[0] === 1 && r.bag[1] === r.bag0 + 1, 'Beute auf dem Ruecken als Zusatzteil: ' + JSON.stringify([r.bag, r.bag0]));
        t.ok(r.down && r.down[3] === 1 && r.down[2] === 7 && r.pl === 0, 'Spieler am Boden: liegt, nicht mehr stehend: ' + JSON.stringify(r.down));
        t.ok(r.sh && r.sh[8] > 0 && r.sn && r.sn[9] === 1 && r.xp >= r.bag0 + 2, 'Schild und Gewehr als Zusatzteile: ' + JSON.stringify([r.sh, r.sn, r.xp, r.bag0, r.xb]));
        t.eq(r.enHit, 1, 'Treffer am Gegner: Trefferbild');
        const tr = r.tr; t.note('Transporter (' + r.tkSt + '): 2D ' + tr.ch + ' Figuren, ' + tr.car + ' Fahrzeuge; 3D ' + tr.i.figs + ' / ' + tr.i.cars + ' ' + JSON.stringify(tr.i.ck));
        t.ok(tr.i.errs === 0 && tr.i.ck.tk === 1, 'Panzerwagen in 3D: ' + JSON.stringify(tr.i.ck));
        t.eq([tr.i.figs, tr.i.cars], [tr.ch, tr.car], 'Transporter: Figuren und Fahrzeuge wie in 2D');
        if (page !== t.page && page.errors.length) t.ok(false, 'JS-Fehler: ' + page.errors.slice(0, 2).join(' | '));
      } finally { await P.done(); }
    },
  },
  {
    name: '3D-Figuren: Coop ueber die Test-Leitung, der Client zeigt in 3D dieselben Figuren wie in 2D, beide Spieler in ihren Teamfarben',
    timeout: 240000,
    async run(t) {
      const P = await glPage(t, true); if (!P) return;
      try {
        const page = P.page;
        await lib.loadTool(page, 'loopnet.js'); await lib.loadInpage(page, 'coop.js');
        const r = await page.evaluate(`(async () => { const C = ${COUNT}, o = {};
          const G = CT.mkGame('bank', 321, 2), A = G.A, B = G.clients[0]; A.CFG.policeAt = 1e6; A.CFG.policeForced = 1e6;
          const a = A.get().me, b = B.get().me, bh = A.get().players[1]; bh.x = a.x + 50; bh.y = a.y; G.run(1);
          o.rows = A.get().players.map(p => A.get().players.indexOf(p));
          o.b = await C(B); o.a = await C(A);
          // Abgleich mit dem Host: jede Figur, die der Client zeigt, ist eine echte Figur des Hosts (Spieler, Personen, Gegner) mit derselben Sprite-Zeile
          const H = A.get(), ents = [...H.players.map(p => [A.plRow ? A.plRow(p) : null, p.x, p.y]), ...H.npcs.map(q => [q.row, q.x, q.y]), ...H.en.map(e => [e.row, e.x, e.y])];
          o.miss = o.b.dyn.f.filter(f => !ents.some(e => (e[0] === null || e[0] === f[1]) && Math.hypot(e[1] - f[5], e[2] - f[6]) <= 40)).map(f => f.slice(0, 7));
          await B.view3d.set(false); await A.view3d.set(false);
          return o; })()`);
        const b = r.b, a = r.a;
        t.note('Client: 2D ' + b.ch + ' Figuren, 3D ' + b.i.figs + ' ' + JSON.stringify(b.i.fk) + '; Host: 2D ' + a.ch + ', 3D ' + a.i.figs);
        t.ok(b.i.on && b.i.errs === 0 && a.i.errs === 0, '3D beim Client und Host ohne Fehler: ' + (b.i.err || a.i.err));
        t.eq(b.i.figs, b.ch, 'Client: Zahl der Aufsteller gleich Zahl der 2D-Figuren');
        t.eq(a.i.figs, a.ch, 'Host: Zahl der Aufsteller gleich Zahl der 2D-Figuren');
        const pr = d => d.dyn.f.filter(f => f[0] === 'pl').map(f => f[1]).sort((x, y) => x - y);
        t.ok(pr(b).length === 2 && pr(b)[0] !== pr(b)[1], 'Client sieht beide Spieler in verschiedenen Farben (Zeilen ' + pr(b) + ')');
        t.eq(pr(b), pr(a), 'Host und Client zeigen die Spieler mit denselben Zeilen (Teamfarben)');
        t.eq(r.miss, [], 'jede Figur beim Client gehoert zu einer Figur des Hosts (Zeile gleich, Lage hoechstens 40 px daneben)');
        if (page.errors.length) t.ok(false, 'JS-Fehler: ' + page.errors.slice(0, 2).join(' | '));
      } finally { await P.done(); }
    },
  },
];
