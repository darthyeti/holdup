// 3D-2a (Ticket 151) und 3D-2b (Ticket 160): Figuren (Low-Poly, Stil B, Teile als InstancedMesh) und Fahrzeuge der 3D-Ansicht (js/draw.js figs3d, js/view3d.js V3CFG.figs, V3CFG.fig und V3CFG.cars). Kein Pixelvergleich, Zustaende ueber den Debug-Hook.
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
    name: '3D-Figuren: Low-Poly-Teile als Instanzen (Draw Calls unabhaengig von der Figurenzahl), Haltung nach Zustand (steht, kniet, liegt, laeuft, bewaffnet), Teamfarben, Treffer als Farbe',
    timeout: 240000,
    async run(t) {
      const P = await glPage(t); if (!P) return;
      try {
        const page = P.page;
        const r = await page.evaluate(`(async () => { const D = __dbg, o = {};
          const i0 = await D.view3d.set(true); if (i0.state !== 'an') return { i0 };
          D.setScenario('bank'); D.buildSeed('classic'); D.setFocus(true); D.CFG.policeAt = 1e6; D.CFG.policeForced = 1e6; D.reset(); D.update(1 / 30);
          const g = D.get(), m = g.me, I = () => D.view3d.info(), at = (x, y) => { const f = D.view3d.V.dyn().f, i = f.findIndex(q => q[5] === Math.round(x) && q[6] === Math.round(y)); return i < 0 ? null : I().fi[i]; };
          const n = g.npcs.find(q => q.k === 'tel'); m.x = n.x; m.y = n.y + 70; D.update(1 / 30); D.draw();
          o.base = [I().figs, I().figParts, I().figCalls, I().calls];
          o.stand = at(n.x, n.y); n.st = 'ko'; n.kt = 20; D.draw(); o.ko = at(n.x, n.y); n.st = 'cower'; D.draw(); o.cower = at(n.x, n.y); n.st = 'idle'; D.draw();
          // Spieler: unbewaffnet, bewaffnet, getroffen
          m.armed = false; D.draw(); const f0 = I().fi.find(q => q[0] === 'pl'); m.armed = true; D.draw(); const f1 = I().fi.find(q => q[0] === 'pl');
          m.hurt = 1; D.draw(); const f2 = I().fi.find(q => q[0] === 'pl'); m.hurt = 0; D.draw(); o.pl = [f0, f1, f2];
          // viele Gegner dazu: Draw Calls bleiben, Teile wachsen
          const mk = (k, kind, row, dx, dy, ex) => Object.assign({}, g.en[0] || {}, { id: 9100 + k, kind, row, x: m.x + dx, y: m.y + dy, a: 3, sh: 0, h: 0, w: 0, mvg: false, hp: 100, mhp: 100, sur: 0, fl: 0 }, ex || {});
          const add = [mk(1, 'cop', 0, 30, -20), mk(2, 'swat', 8, 30, 20), mk(3, 'shield', 0, 50, 0, { sh: 50 }), mk(4, 'sniper', 8, -30, 0), mk(5, 'cop', 0, -30, 30), mk(6, 'grd', 2, -30, -30), mk(7, 'cop', 0, 0, -40), mk(8, 'swat', 8, 0, 40)];
          g.en.push(...add); D.draw(); const I1 = I(); o.more = [I1.figs, I1.figParts, I1.figCalls, I1.dynCalls, I1.xparts - I1.gear, I1.calls];
          const cop = add[0]; o.cop0 = at(cop.x, cop.y); cop.mvg = true; cop.w = 0.4; D.draw(); const c1 = at(cop.x, cop.y); cop.w = 1.9; D.draw(); const c2 = at(cop.x, cop.y); cop.mvg = false; D.draw(); const c3 = at(cop.x, cop.y); cop.w = 0.4; D.draw(); const c4 = at(cop.x, cop.y);
          cop.mvg = true; cop.w = 0.4 + Math.PI; D.draw(); const c5 = at(cop.x, cop.y); cop.mvg = false; cop.w = 0.4; D.draw();
          o.cop = [o.cop0, c1, c2, c3, c4, c5]; cop.sur = 1; D.draw(); o.copSur = at(cop.x, cop.y);
          o.shield = at(add[2].x, add[2].y); o.sniper = at(add[3].x, add[3].y); o.swat = at(add[1].x, add[1].y);
          // eine Figur des Spiels zaehlt in der Liste und im Bild gleich (Tris je Figur: Gesamtzahl mit und ohne die acht)
          const tr1 = I().tris; for (const e of add) g.en.splice(g.en.indexOf(e), 1); D.draw(); const tr0 = I().tris; o.tris = [tr1, tr0, add.length];
          await D.view3d.reset(); return o; })()`);
        if (!r.stand) { t.ok(false, '3D nicht an oder keine Person: ' + JSON.stringify(r)); return; }
        const [figs, parts, calls] = r.base;
        t.note('Draw Calls der Figuren ' + calls + ' (Teil-Arten) bei ' + figs + ' Figuren, ' + parts + ' Teile; mit ' + r.more[0] + ' Figuren ' + r.more[2] + ' Draw Calls, ' + r.more[1] + ' Teile; Dreiecke je Gegner rund ' + Math.round((r.tris[0] - r.tris[1]) / r.tris[2]));
        // Instanzen: Draw Calls je Teil-Art, nicht je Figur
        t.ok(calls >= 4 && r.more[2] <= 8 && r.more[2] < r.more[0], 'Draw Calls der Figuren hoechstens acht (sieben Teil-Arten und das Schild), weniger als Figuren: ' + calls + ' bei ' + figs + ', ' + r.more[2] + ' bei ' + r.more[0]);
        t.ok(r.more[5] - r.base[3] <= 3 && r.more[0] - figs >= 6, 'echte Draw Calls (Renderer): acht Figuren mehr, hoechstens drei Aufrufe mehr (Instanzen, nicht je Figur ein Mesh): ' + r.base[3] + ' auf ' + r.more[5] + ' bei ' + figs + ' auf ' + r.more[0] + ' Figuren');
        t.ok(r.more[0] >= figs + 6 && r.more[1] >= parts + 6 * 12, 'mehr Figuren, mehr Instanzen: ' + JSON.stringify([figs, parts, r.more[0], r.more[1]]));
        t.ok(r.stand[2] >= 13 && r.stand[2] <= 24, 'eine Figur besteht aus 13 bis 24 Teilen (Rumpf, Kopf, Glieder, Zubehoer): ' + r.stand[2]);
        const tpf = (r.tris[0] - r.tris[1]) / r.tris[2]; t.ok(tpf > 600 && tpf <= 2000, 'rund 1.000 Dreiecke je Figur, dazu der Umriss (Ticket 189, Rumpf, Glieder, Kopf noch einmal als Rueckseiten) bis 2.000: ' + Math.round(tpf));
        // Haltung nach Zustand: Hoehe des hoechsten Teils
        t.ok(r.stand[3] > 27 && r.stand[3] < 34, 'stehende Person: Kopfmitte auf rund 30 Hoehe (Kopf 36 hoch): ' + r.stand[3]);
        t.ok(r.ko[3] < 10 && r.ko[2] === r.stand[2], 'bewusstlos: liegt flach (hoechstes Teil unter 10) mit denselben Teilen: ' + JSON.stringify([r.ko, r.stand]));
        t.ok(r.cower[3] > 17 && r.cower[3] < r.stand[3] - 3, 'geduckt: kniet (Kopfmitte mindestens 3 tiefer als im Stehen): ' + r.cower[3] + ' gegen ' + r.stand[3]);
        // Bewegung und Zielen
        t.ok(r.cop[1][5] !== r.cop[2][5] && r.cop[1][5] !== r.cop[0][5] && r.cop[1][5] !== r.cop[5][5], 'laufend: Beine und Arme schwingen mit der Laufphase (Pose aendert sich mit w, auch bei gleicher Huepfhoehe um eine halbe Runde weiter: Beine vertauscht): ' + JSON.stringify([r.cop[0][5], r.cop[1][5], r.cop[2][5], r.cop[5][5]]));
        t.eq(r.cop[3][5], r.cop[4][5], 'stehend: die Laufphase aendert nichts');
        t.ok(r.cop[0][2] > r.stand[2] - 4 && r.pl[1][2] > r.pl[0][2], 'bewaffnet: Waffe als Zusatzteile (Spieler mit Waffe hat mehr Teile als ohne): ' + JSON.stringify([r.pl[0][2], r.pl[1][2], r.cop[0][2]]));
        t.ok(r.copSur[2] < r.cop[0][2] && r.copSur[3] < r.cop[0][3], 'ergeben (geduckt): ohne Waffe und niedriger: ' + JSON.stringify([r.copSur, r.cop[0]]));
        t.ok(r.shield[2] > r.stand[2] && r.sniper[2] > r.stand[2], 'Schild-Beamter und Scharfschuetze tragen ihr Zubehoer (mehr Teile als eine unbewaffnete Person): ' + JSON.stringify([r.shield[2], r.sniper[2], r.stand[2]]));
        // Farben: Teamfarbe aus der Zeile, Treffer hellt die Farbe auf
        t.ok(r.pl[0][4] !== 0 && r.pl[2][4] !== r.pl[1][4], 'Treffer: Farbe des Spielers wird heller (Blinken ueber das Material): ' + JSON.stringify([r.pl[1][4].toString(16), r.pl[2][4].toString(16)]));
        t.eq(new Set([r.cop[0][4], r.swat[4], r.pl[1][4], r.stand[4]]).size, 4, 'Polizist, SWAT, Spieler und Angestellte haben eigene Farben');
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
        const hx = d => d.i.fi.filter(f => f[0] === 'pl').map(f => f[4]).sort((x, y) => x - y);
        t.ok(hx(b).length === 2 && hx(b)[0] !== hx(b)[1], 'beide Spieler tragen in 3D verschiedene Teamfarben (Rumpffarbe ' + hx(b).map(v => v.toString(16)) + ')');
        t.eq(hx(b), hx(a), 'Host und Client: gleiche Rumpffarben');
        t.eq(r.miss, [], 'jede Figur beim Client gehoert zu einer Figur des Hosts (Zeile gleich, Lage hoechstens 40 px daneben)');
        if (page.errors.length) t.ok(false, 'JS-Fehler: ' + page.errors.slice(0, 2).join(' | '));
      } finally { await P.done(); }
    },
  },
  {
    name: '3D-Figuren: Umriss hebt die Figur vom Boden ab (Ticket 189), Farbabstand zum Boden steigt, Umriss nur an Rumpf, Gliedern und Kopf, aus mit out 0',
    timeout: 240000,
    async run(t) {
      const P = await glPage(t); if (!P) return;
      try {
        const page = P.page;
        const r = await page.evaluate(async () => {
          const D = __dbg; const i0 = await D.view3d.set(true); if (i0.state !== 'an') return { i0 };
          D.setScenario('bank'); D.buildSeed('classic'); D.setFocus(true); D.CFG.policeAt = 1e6; D.CFG.policeForced = 1e6; D.reset();
          const g = D.get(), me = g.me, W = D.world(), T = 32, free = (x, y) => !W.isSol(Math.floor(x / T), Math.floor(y / T)); let spot = null;
          for (let y = 4 * T; y < 40 * T && !spot; y += T) for (let x = 3 * T; x < 50 * T && !spot; x += T) { let ok = true; for (const dx of [0, 40, 80]) for (const dy of [-T, 0, T]) if (!free(x + dx, y + dy)) ok = false; if (ok) spot = [x, y]; }
          for (let k = 0; k < 60; k++) { me.x = spot[0]; me.y = spot[1]; me.vx = me.vy = 0; me.hp = 1e9; D.update(1 / 30); }
          const e = D.mkCop(spot[0] + 40, spot[1], 'cop'); e.react = -1e9; g.en.push(e); D.draw(); D.draw();
          const V = D.view3d.V, C = V.cfg, o = { i0 };
          const meas = () => { D.draw(); const i = V.info(), q = V.seen(spot[0] + 40, spot[1], 14); return { ol: i.figOl, parts: i.figParts, tris: i.tris, dist: q.dist, merge: q.merge, px: q.px } };
          o.on = meas(); const out0 = C.fig.look.out; C.fig.look.out = 0; o.off = meas(); C.fig.look.out = out0; o.on2 = meas();
          return o;
        });
        if (r.i0 && r.i0.state !== 'an') { t.ok(false, '3D nicht an: ' + JSON.stringify(r.i0)); return; }
        t.note('mit Umriss ' + JSON.stringify(r.on) + ', ohne ' + JSON.stringify(r.off));
        t.ok(r.on.ol > 0 && r.off.ol === 0 && r.on2.ol === r.on.ol, 'Umriss-Instanzen nur mit out > 0: ' + [r.on.ol, r.off.ol, r.on2.ol]);
        t.eq(r.on.parts, r.off.parts, 'der Umriss zaehlt nicht als Figurenteil (figParts gleich)');
        t.ok(r.on.ol < r.on.parts, 'Umriss nur fuer Rumpf, Glieder und Kopf, nicht fuer jedes Teil: ' + r.on.ol + ' von ' + r.on.parts);
        t.ok(r.on.merge < r.off.merge + 1e-6 && r.on.dist > r.off.dist, 'Kontrast zum Boden steigt (Farbabstand ' + r.off.dist.toFixed(0) + ' -> ' + r.on.dist.toFixed(0) + ', verschmelzend ' + (r.off.merge * 100).toFixed(0) + ' % -> ' + (r.on.merge * 100).toFixed(0) + ' %)');
        if (page.errors.length) t.ok(false, 'JS-Fehler: ' + page.errors.slice(0, 2).join(' | '));
        await page.evaluate(() => __dbg.view3d.reset());
      } finally { await P.done(); }
    },
  },
];
