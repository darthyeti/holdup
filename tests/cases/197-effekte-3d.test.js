// 3D-7 (Ticket 156): Effekte der 3D-Ansicht (js/draw.js fx3d und txt3d, js/view3d.js buildFx und V3CFG.fx). Kein Pixelvergleich, Zustaende ueber den Debug-Hook.
// Liste (Prinzip MAP_FIELDS): jeder Ereignisname aus fxApply und jede Teilchenart (pt.push) hat in V3CFG.fx eine 3D-Entsprechung, jede Liste aus fx3d wird gezeichnet; neue ohne Eintrag machen den Test rot.
// Mit WebGL (sonst uebersprungen wie Test 190): jedes Ereignis zeigt seine Kanaele (Teilchen im Puffer, Muendungsfeuer, Licht, Spuren, Kamera), Teilchen verschwinden wieder, Aufnahmen am Boden so viele wie in 2D,
// Granaten im Bogen, Bodenschriften da, Draw Calls im Gefecht unter dem Budget, Spielzustand mit und ohne 3D gleich.
const fs = require('fs');
const path = require('path');
const lib = require('../lib');

// gfx: eigene Seite mit dieser Grafikstufe (Teilchen der Schuesse, Blut und Scherben gibt es erst ab Stufe mittel, wie in 2D)
async function glPage(t, gfx) {
  if (!gfx && await t.page.evaluate(() => { const c = document.createElement('canvas'); return !!c.getContext('webgl2'); })) return { page: t.page, done: async () => {} };
  const env = await lib.launch({ webgl: true });
  const page = await lib.openGame(env, gfx ? { gfx } : undefined);
  if (await page.evaluate(() => { const c = document.createElement('canvas'); return !!c.getContext('webgl2'); })) return { page, done: async () => { await page.ctx.close().catch(() => {}); await env.browser.close().catch(() => {}); env.srv.close(); } };
  await env.browser.close().catch(() => {}); env.srv.close();
  t.note('kein WebGL 2 im Test-Chromium (auch nicht mit SwiftShader-Flags), 3D-Teil uebersprungen');
  return null;
}
// Seitenhelfer: Bank (Seed 5, Strasse im Sueden), Spieler auf dem Gehweg vor der Bank, Teilchen leer, Ansicht lesen
const H7 = `window.H7 = {
  bank(ph) { const D = __dbg; PX.scene('bank', 5); PX.phase(ph || 'erkundung'); const me = D.get().me; me.x = 860; me.y = 520; me.vx = me.vy = 0; for (let i = 0; i < 5; i++) { me.hp = 100; D.update(1 / 30); } D.ptClear(); D.mouse.t = -999; return me; },
  info() { const i = __dbg.view3d.V.info(); return { fx: i.fx, calls: i.calls, tris: i.tris, errs: i.errs, err: i.err, pl: (i.light && i.light.pl || []).map(q => q[0]), tgt: i.tgt }; },
};`;
// Abbildung der Teilchenart auf den Puffer (wie V3CFG.fx.pt.b), zum Nachzaehlen
const BUF = V => Object.fromEntries(Object.entries(V.pt).map(([k, e]) => [k, e.b]));

module.exports = [
  {
    name: '3D-Effekte: jeder Ereignisname aus fxApply und jede Teilchenart hat eine 3D-Entsprechung, jede Liste aus fx3d wird gezeichnet (neue ohne Eintrag: rot)',
    timeout: 120000,
    async run(t) {
      const page = t.page;
      const html = fs.readFileSync(path.join(lib.ROOT, 'index.html'), 'utf8'), draw = fs.readFileSync(path.join(lib.ROOT, 'js', 'draw.js'), 'utf8'), view = fs.readFileSync(path.join(lib.ROOT, 'js', 'view3d.js'), 'utf8');
      const V = await page.evaluate(async () => (await import('/js/view3d.js')).V3CFG.fx);
      // Ereignisnamen: die Zweige von fxApply (n==='name')
      const fa = html.slice(html.indexOf('function fxApply(n,a){'), html.indexOf('function camSnap('));
      const names = [...new Set([...fa.matchAll(/n==='(\w+)'/g)].map(m => m[1]))];
      t.ok(names.length >= 14 && ['sh', 'es', 'hw', 'hf', 'sp', 'sk', 'gb', 'gl', 'bx'].every(n => names.includes(n)), 'fxApply kennt ' + names.length + ' Namen: ' + names.join(' '));
      t.eq(names.filter(n => !V.evt[n]), [], 'Ereignisnamen ohne Eintrag in V3CFG.fx.evt');
      t.eq(Object.keys(V.evt).filter(n => !names.includes(n)), [], 'Eintraege in V3CFG.fx.evt, die fxApply nicht kennt');
      t.eq(Object.entries(V.evt).filter(([, v]) => !v.split(' ').every(c => V.chan.includes(c))).map(([k, v]) => k + ': ' + v), [], 'Eintraege nennen nur Kanaele aus V3CFG.fx.chan');
      const sim = ['sh', 'es', 'hw', 'hf', 'sp', 'sk', 'gb', 'gl', 'bx'];
      t.eq(sim.filter(n => !V.evt[n].split(' ').some(c => c === 'pt' || c === 'muz')), [], 'Effekte der Simulation zeigen Teilchen oder Muendungsfeuer');
      // Teilchenarten: alle pt.push({t:'x'...}) im Kern
      const kinds = [...new Set([...html.matchAll(/pt\.push\(\{t:'(\w+)'/g)].map(m => m[1]))];
      t.ok(kinds.length >= 7, 'Teilchenarten im Kern: ' + kinds.join(' '));
      t.eq(kinds.filter(k => !V.pt[k]), [], 'Teilchenarten ohne Eintrag in V3CFG.fx.pt');
      t.eq(Object.keys(V.pt).filter(k => !kinds.includes(k)), [], 'Eintraege in V3CFG.fx.pt, die der Kern nie erzeugt');
      t.eq(Object.entries(V.pt).filter(([, e]) => !['a', 'n'].includes(e.b) || ![0, 1, 2, 3].includes(e.sh) || !Array.isArray(e.h) || e.h.length !== 2 || !(e.k > 0)).map(([k]) => k), [], 'Eintraege mit Puffer a/n, Form 0 bis 3, Hoehe [Start, Zuwachs], Groesse');
      // Listen aus fx3d (Rueckgabe) werden in buildFx gelesen
      const f3 = draw.slice(draw.indexOf('function fx3d('), draw.indexOf('/* 3D-6 (Ticket 155): Szenario-Besonderheiten'));
      const ret = /return\{([^}]*)\}\}\s*$/.exec(f3.trim()), keys = ret ? ret[1].split(',').map(s => s.split(':')[0].trim()) : [];
      t.ok(keys.length >= 10, 'fx3d liefert ' + keys.join(' '));
      const bf = view.slice(view.indexOf('function buildFx('), view.indexOf('// Kamera: Ziel ist die Mitte'));
      t.eq(keys.filter(k => k !== 't' && !new RegExp('D\\.' + k + '\\b').test(bf)), [], 'Listen aus fx3d, die buildFx nicht zeichnet');
      t.ok(page.errors.length === 0, 'keine JS-Fehler' + (page.errors.length ? ': ' + page.errors.slice(0, 2).join(' | ') : ''));
    },
  },
  {
    name: '3D-Effekte: jedes Ereignis zeigt seine Kanaele, Teilchen landen im Puffer und verschwinden wieder, Explosion als Licht, Granate im Bogen',
    timeout: 300000,
    async run(t) {
      const P = await glPage(t, 'mittel'); if (!P) return;
      try {
        const page = P.page;
        await lib.loadInpage(page, 'bild.js'); await page.addScriptTag({ content: H7 });
        const V = await page.evaluate(async () => (await import('/js/view3d.js')).V3CFG.fx);
        const r = await page.evaluate(async () => {
          const D = __dbg, i0 = await D.view3d.set(true); if (i0.state !== 'an') return { i0 };
          const o = {}, me = H7.bank(), x = me.x + 40, y = me.y - 30;
          const fake = () => { const e = { id: 9901, kind: 'cop', x: me.x + 90, y: me.y, a: Math.PI, row: 3, w: 0, mvg: false, h: 0, hp: 100, mhp: 100, muz: 20, fl: 0, r: 9 }; D.get().en.push(e); return e; };
          const A = { sh: [me.id, me.x, me.y, 0], es: [9901, me.x + 90, me.y, 'pistol'], hw: [x, y], hf: [x, y, 6, me.id + 1], sp: [x, y, 10], sk: [x, y], gb: [x, y, 0], gl: [x, y], bx: [x + 60, y, 90, 0] };
          for (const n in A) {
            D.ptClear(); const tr0 = D.trHash(), k0 = D.kick().t; let e = null; if (n === 'es') e = fake();
            D.evt(n, A[n]); D.draw(); const a = H7.info();
            o[n] = { n: a.fx.n, add: a.fx.add, nrm: a.fx.nrm, pl: a.pl, pt: D.ptL(), kick: D.kick().t > k0, shk: D.shk().a };
            for (let i = 0; i < 12; i++) { me.hp = 100; D.update(1 / 30); } o[n].dcv = D.trHash() !== tr0; // Huelsen landen erst nach 0,3 s am Boden
            if (e) D.get().en.splice(D.get().en.indexOf(e), 1);
            me.flash = 0; D.draw();
          }
          // Teilchen verschwinden wieder: nach der Explosion 4 s Spielzeit
          D.ptClear(); D.evt('bx', A.bx); D.draw(); const b0 = H7.info();
          for (let i = 0; i < 120; i++) { me.hp = 100; D.update(1 / 30); } D.draw(); const b1 = H7.info();
          o.decay = { n0: D.ptN(), b0: [b0.fx.add, b0.fx.nrm], b1: [b1.fx.add, b1.fx.nrm], pl: b1.pl };
          // Kamerawackeln verschiebt den Blickpunkt (draw1 versetzt camX/camY, die Ansicht folgt)
          D.ptClear(); D.evt('bx', [me.x, me.y - 20, 110, 0]); const tg = []; for (let i = 0; i < 6; i++) { D.draw(); tg.push(H7.info().tgt.join(',')); }
          o.shake = { n: new Set(tg).size, cam: D.cam().join(',') };
          // Granate im Bogen: erster Blick am Abwurf (Hoehe 0), Mitte der Flugzeit am hoechsten, liegend am Boden
          const G = D.gren(), g = { id: 9902, k: 'gas', x: me.x + 60, y: me.y - 40, vx: 0, vy: 0, st: 'fly', t: 1, tm: 0 }; G.gr.push(g); D.draw(); const h0 = D.view3d.V.fx().gr.find(q => q[0] === 9902);
          g.t = .5; D.draw(); const h1 = D.view3d.V.fx().gr.find(q => q[0] === 9902); g.st = 'rest'; g.tm = .3; D.draw(); const h2 = D.view3d.V.fx().gr.find(q => q[0] === 9902); const th = H7.info().fx.th;
          G.gr.splice(G.gr.indexOf(g), 1); o.gren = { h0, h1, h2, th };
          // Wolken und Dinge: Gaswolke, Rauch, Mine, Notfallkoffer, Ablenker
          D.ptClear(); const L = D.fxL(); G.gc.push({ id: 9903, x: me.x + 200, y: me.y, r: 80, t: 6 }); L.smk.push({ id: 9904, x: me.x - 200, y: me.y, r: 70, t: 8 });
          D.traps().push({ k: 'mine', x: me.x - 60, y: me.y + 40, a: 9, armed: true }); D.aids().push({ id: 9905, x: me.x + 30, y: me.y + 60, t: 5 }); D.dcyList().push({ id: 9906, x: me.x, y: me.y + 80, t: 5 });
          D.draw(); const c = H7.info(); o.things = { n: c.fx.n, add: c.fx.add, nrm: c.fx.nrm, th: c.fx.th, calls: c.fx.calls };
          D.view3d.reset(); return { o };
        });
        if (!r.o) { t.ok(false, '3D nicht an: ' + JSON.stringify(r.i0)); return; }
        const o = r.o, buf = BUF(V);
        t.note(JSON.stringify(o).slice(0, 1200));
        for (const n of ['sh', 'es', 'hw', 'hf', 'sp', 'sk', 'gb', 'gl', 'bx']) {
          const q = o[n], ch = V.evt[n].split(' ');
          // Teilchen im Puffer: so viele wie pt, aufgeteilt nach V3CFG.fx.pt.b (plus Muendungsfeuer im additiven Puffer)
          const wa = q.pt.filter(k => buf[k] === 'a').length, wn = q.pt.filter(k => buf[k] === 'n').length, muz = q.n.muz || 0;
          if (ch.includes('pt')) t.ok(q.pt.length > 0 && q.nrm === wn && q.add >= wa + muz && q.add <= wa + 2 * muz, n + ': ' + q.pt.length + ' Teilchen, im Puffer additiv ' + q.add + ' (erwartet ' + wa + ' plus Muendungsfeuer ' + muz + '), normal ' + q.nrm + ' (' + wn + ')');
          if (ch.includes('muz')) t.ok(muz === 1, n + ': Muendungsfeuer ' + muz);
          if (ch.includes('licht')) t.ok(q.pl.includes('boom'), n + ': Explosion als Punktlicht (' + q.pl.join(' ') + ')');
          if (ch.includes('dcv')) t.ok(q.dcv, n + ': Spur auf dem Boden (dcv, seit 3D-1 Textur des Bodens)');
          if (ch.includes('cam')) t.ok(q.kick || q.shk > 0, n + ': Kamera (Rueckstoss oder Wackeln)');
        }
        t.ok(o.decay.b0[0] + o.decay.b0[1] > 20 && o.decay.n0 === 0 && o.decay.b1[0] === 0 && o.decay.b1[1] === 0 && !o.decay.pl.includes('boom'), 'Teilchen der Explosion verschwinden wieder: ' + JSON.stringify(o.decay));
        t.ok(o.shake.n >= 3, 'Kamerawackeln verschiebt den Blickpunkt (' + o.shake.n + ' verschiedene in 6 Bildern)');
        t.ok(o.gren.h0 && o.gren.h0[3] === 0 && Math.abs(o.gren.h1[3] - V.grArc) < .2 && o.gren.h2[3] === 0 && o.gren.th >= 1, 'Granate im Bogen: Abwurf ' + (o.gren.h0 || [])[3] + ', Mitte ' + (o.gren.h1 || [])[3] + ', liegend ' + (o.gren.h2 || [])[3]);
        const s = o.things;
        t.ok(s.n.gc === 1 && s.n.smk === 1 && s.n.tr === 1 && s.n.aid === 1 && s.n.dcy === 1 && s.nrm === 19 && s.th === 5 && s.calls <= 4, 'Wolken (Gas 9, Rauch 10 Flecken: ' + s.nrm + '), Mine, Notfallkoffer, Ablenker (' + s.th + ' Kloetze), Draw Calls Effekte ' + s.calls);
        if (page !== t.page && page.errors.length) t.ok(false, 'JS-Fehler: ' + page.errors.slice(0, 2).join(' | '));
      } finally { await P.done(); }
    },
  },
  {
    name: '3D-Effekte: Aufnahmen am Boden so viele wie in 2D, Bodenschriften (AUSSTIEG, ABGABE, ABHOLPUNKT) da, Draw Calls im Gefecht unter dem Budget',
    timeout: 300000,
    async run(t) {
      const P = await glPage(t); if (!P) return;
      try {
        const page = P.page;
        await lib.loadInpage(page, 'bild.js'); await page.addScriptTag({ content: H7 });
        const r = await page.evaluate(async () => {
          const D = __dbg, o = {};
          // Aufnahmen: zwei in Sicht, eine im Tresorraum (keine Sicht); 2D gezaehlt an drawImage mit props.png in 34 px
          const put = () => { const me = H7.bank(), L = D.fxL(), v = D.LAY().vault.bundles[0]; L.pk.length = 0; L.pk.push({ x: me.x + 60, y: me.y - 20, k: 5 }, { x: me.x + 100, y: me.y - 20, k: 6 }, { x: v[0] * 32 + 16, y: v[1] * 32 + 16, k: 5 }); return L.pk.map(k => D.los(me.x, me.y, k.x, k.y)); };
          const C2 = CanvasRenderingContext2D.prototype, di = C2.drawImage; let n2 = 0;
          await D.view3d.set(false); o.see = put(); C2.drawImage = function (img, ...a) { if (img && img.src && /props\.png/.test(img.src) && a[6] === 34) n2++; return di.call(this, img, ...a); }; D.draw(); C2.drawImage = di;
          const i0 = await D.view3d.set(true); if (i0.state !== 'an') return { i0 };
          put(); D.draw(); const a = H7.info(); o.pk = { n2, n3: a.fx.pk, list: D.view3d.V.fx().pk };
          // Bodenschriften: Notenbank im Ueberfall mit offenem Loch (AUSSTIEG, ABGABE), Gefaengnis in der Erkundung (ABHOLPUNKT)
          PX.scene('nb', 5); PX.phase('ueberfall'); D.nbHole(true); D.update(1 / 30); D.draw(); o.nb = D.view3d.txt();
          PX.scene('prison', 5); PX.phase('erkundung'); D.draw(); o.pr = D.view3d.txt();
          PX.scene('bank', 5); PX.phase('erkundung'); D.draw(); o.bank = D.view3d.txt();
          // Gefecht: Bank mit Polizei, Explosion, Schuesse
          PX.scene('bank', 5); PX.phase('ueberfall'); PX.phase('polizei'); PX.phase('polizei'); const me = D.get().me; D.evt('bx', [me.x + 80, me.y - 40, 90, 0]); for (let i = 0; i < 3; i++) { me.hp = 100; D.update(1 / 30); }
          for (const e of D.get().en.slice(0, 6)) D.get().bl.push({ x: e.x, y: e.y, vx: 600, vy: 200, o: 1 }); D.draw(); const f = H7.info();
          o.fight = { calls: f.calls, tris: f.tris, fxCalls: f.fx.calls, add: f.fx.add, nrm: f.fx.nrm, en: D.get().en.length, errs: f.errs, err: f.err };
          D.view3d.reset(); return { o };
        });
        if (!r.o) { t.ok(false, '3D nicht an: ' + JSON.stringify(r.i0)); return; }
        const o = r.o;
        t.note(JSON.stringify(o).slice(0, 900));
        t.eq(o.see, [true, true, false], 'zwei Aufnahmen in Sicht, eine im Tresorraum ohne Sicht');
        t.ok(o.pk.n2 === 2 && o.pk.n3 === o.pk.n2 && o.pk.list.length === 2, 'Aufnahmen: 2D ' + o.pk.n2 + ', 3D ' + o.pk.n3 + ' ' + JSON.stringify(o.pk.list));
        t.ok(o.nb.includes('AUSSTIEG') && o.nb.includes('ABGABE'), 'Notenbank: Bodenschriften ' + o.nb.join(' '));
        t.ok(o.pr.includes('ABHOLPUNKT'), 'Gefaengnis: Bodenschrift ' + o.pr.join(' '));
        t.eq(o.bank, [], 'Bank in der Erkundung ohne Bodenschrift');
        t.ok(o.fight.errs === 0 && o.fight.calls < 120 && o.fight.tris < 150000 && o.fight.fxCalls <= 4 && o.fight.fxCalls < 20 && o.fight.add + o.fight.nrm > 20, 'Gefecht: Draw Calls ' + o.fight.calls + ' unter 120 (Effekte ' + o.fight.fxCalls + ' unter 20), Dreiecke ' + o.fight.tris + ', Teilchen ' + (o.fight.add + o.fight.nrm) + ', ' + o.fight.en + ' Gegner');
        if (page !== t.page && page.errors.length) t.ok(false, 'JS-Fehler: ' + page.errors.slice(0, 2).join(' | '));
      } finally { await P.done(); }
    },
  },
  {
    name: '3D-Effekte: Spielzustand nach 600 Schritten im Gefecht (Schiessen, Explosion) ist mit und ohne 3D gleich (fx3d liest nur)',
    timeout: 300000,
    async run(t) {
      const P = await glPage(t); if (!P) return;
      try {
        const page = P.page;
        await lib.loadInpage(page, 'bild.js');
        const r = await page.evaluate(async () => {
          const D = __dbg, R0 = Math.random;
          const mb = s => () => { s = s + 0x6D2B79F5 | 0; let q = Math.imul(s ^ s >>> 15, 1 | s); q = q + Math.imul(q ^ q >>> 7, 61 | q) ^ q; return ((q ^ q >>> 14) >>> 0) / 4294967296; };
          async function run(on) {
            await D.view3d.set(on); PX.scene('bank', 5); const rs = mb(42), rd = mb(7); Math.random = rs; D.setTime(0); D.setFocus(true);
            const V = D.view3d.V; if (on && V) V.pick = (sx, sy) => [sx + D.cam()[0], sy + D.cam()[1]];
            const K = D.keys, M = D.mouse; M.sx = 640; M.sy = 200; let mx = 0;
            for (let i = 0; i < 600; i++) {
              for (const k of 'wasd') delete K[k]; K[['d', 'w', 'a', 's'][Math.floor(i / 50) % 4]] = 1;
              if (i === 60) D.startHeist();
              M.down = i > 120 && i % 20 < 8; if (i === 200 || i === 400) { const m = D.get().me; D.evt('bx', [m.x + 90, m.y - 60, 90, 1]); }
              const m = D.get().me; if (m) { m.hp = 100; if (m.mag <= 0) m.mag = 12; }
              D.update(1 / 30); if (i % 5 === 4) { Math.random = rd; D.draw(); Math.random = rs; if (on && V) mx = Math.max(mx, V.info().fx.add + V.info().fx.nrm); }
            }
            Math.random = R0; for (const k of 'wasd') delete K[k]; M.down = false;
            const g = D.get(); const s = JSON.stringify({ t: g.time, ph: g.phase, me: g.me ? [g.me.x, g.me.y, g.me.a, g.me.hp, g.me.mag] : 0, en: g.en.map(e => [e.x, e.y, e.hp]), npc: g.npcs.map(n => [n.x, n.y, n.st]), bl: g.bl.length, pt: D.ptN(), its: g.its.map(o => [o.t, !!o.done, o.pr]), M: D.world().M.join(''), cars: g.cars.map(c => [c.x, c.y, c.hp]) });
            let h = 0; for (let i = 0; i < s.length; i++) h = Math.imul(h, 31) + s.charCodeAt(i) | 0;
            return { h, ph: g.phase, en: g.en.length, fr: on ? D.view3d.info().frames : 0, errs: on ? D.view3d.info().errs : 0, mx };
          }
          const o = { off: await run(false), on: await run(true), off2: await run(false) };
          D.view3d.reset(); return o;
        });
        t.eq(r.off.h, r.off2.h, 'ohne 3D zweimal gleich');
        t.ok(r.on.fr >= 100 && r.on.errs === 0 && r.on.mx > 10, '3D hat gezeichnet (' + r.on.fr + ' Bilder, bis ' + r.on.mx + ' Teilchen im Puffer)');
        t.eq(r.on.h, r.off.h, 'Zustandshash gleich mit und ohne 3D (Phase ' + r.off.ph + ', ' + r.off.en + ' Gegner)');
        if (page !== t.page && page.errors.length) t.ok(false, 'JS-Fehler: ' + page.errors.slice(0, 2).join(' | '));
      } finally { await P.done(); }
    },
  },
];
