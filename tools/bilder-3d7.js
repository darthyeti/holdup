// 3D-7 (Ticket 156): Abnahmebilder der Effekte in 3D (docs/bilder/plan-3d/3d7-*.jpg): Gefecht mit Leuchtspuren und Muendungsfeuer, Explosion mit Licht, Granaten (Flug, Gaswolke, Rauch),
// Aufnahmen und Dinge am Boden. Szene wie tests/inpage/bild.js (Bank, Seed 5, Strasse im Sueden), fuer das Bild gestellt (Kugeln, Granaten und Aufnahmen von Hand gesetzt). Nur Darstellung, kein Test.
// Aufruf: cd tests && HOLDUP_CHROME=/opt/pw-browsers/chromium node ../tools/bilder-3d7.js [ordner]
const path = require('path');
const lib = require(path.join(__dirname, '..', 'tests', 'lib'));
const OUT = process.argv[2] || path.join(lib.ROOT, 'docs', 'bilder', 'plan-3d');
const SHOTS = {
  // Gefecht: Polizei da, Spieler schiesst, Kugeln beider Seiten im Flug
  gefecht: () => {
    const D = __dbg; PX.scene('bank', 5); PX.phase('ueberfall'); for (let k = 0; k < 4 && D.get().en.filter(e => e.kind !== 'grd').length < 3; k++) PX.phase('polizei');
    const g = D.get(), me = g.me; me.hp = 100; me.x = 860; me.y = 470; for (let i = 0; i < 3; i++) { me.hp = 100; D.update(1 / 30); } me.hurt = 0;
    const en = D.get().en, bl = D.get().bl, tg = en[0] || { x: me.x + 200, y: me.y + 120 };
    me.a = Math.atan2(tg.y - me.y, tg.x - me.x); me.flash = .05;
    for (let k = 0; k < 4; k++) { const a = me.a + (k - 1.5) * .03, d = 70 + k * 60; bl.push({ x: me.x + Math.cos(a) * d, y: me.y + Math.sin(a) * d, vx: Math.cos(a) * 900, vy: Math.sin(a) * 900, o: 1 }); }
    for (const e of en.slice(0, 5)) { const a = Math.atan2(me.y - e.y, me.x - e.x); e.fl = .05; for (const d of [60, 150]) bl.push({ x: e.x + Math.cos(a) * d, y: e.y + Math.sin(a) * d, vx: Math.cos(a) * 700, vy: Math.sin(a) * 700 }); }
    D.evt('hw', [me.x + 40, me.y - 50]); D.evt('sp', [me.x + 40, me.y - 50, 12]);
  },
  // Explosion eines Streifenwagens oder an der Strasse: Feuerball, Druckwelle, Truemmer, Rauch, Licht
  explosion: () => {
    const D = __dbg; PX.scene('bank', 5); PX.phase('ueberfall'); const me = D.get().me; me.x = 860; me.y = 470; for (let i = 0; i < 3; i++) D.update(1 / 30);
    D.evt('bx', [me.x + 170, me.y + 110, 110, 1]); for (let i = 0; i < 4; i++) { me.hp = 100; D.update(1 / 30); } me.hurt = 0;
  },
  // Granaten: eine im Flug (Bogen), Gaswolke und Rauchwolke, Blendgranate am Boden mit Zuendlicht
  granate: () => {
    const D = __dbg; PX.scene('bank', 5); PX.phase('erkundung'); const me = D.get().me; me.x = 860; me.y = 470; for (let i = 0; i < 3; i++) D.update(1 / 30);
    const G = D.gren(), L = D.fxL();
    G.gr.push({ id: 9801, k: 'gas', x: me.x + 140, y: me.y + 40, vx: 0, vy: 0, st: 'fly', t: 1, tm: 0 }); D.draw(); G.gr[G.gr.length - 1].t = .5;
    G.gr.push({ id: 9802, k: 'flash', x: me.x - 90, y: me.y + 60, vx: 0, vy: 0, st: 'rest', t: 1, tm: .2 });
    G.gc.push({ id: 9803, x: me.x + 300, y: me.y + 80, r: 90, t: 6 }); L.smk.push({ id: 9804, x: me.x - 260, y: me.y + 70, r: 80, t: 8 });
    me.a = 0;
  },
  // Aufnahmen und Dinge am Boden: Munition und Verbandszeug, Mine, Claymore, Notfallkoffer, Ablenker
  aufnahmen: () => {
    const D = __dbg; PX.scene('bank', 5); PX.phase('erkundung'); const me = D.get().me; me.x = 860; me.y = 470; for (let i = 0; i < 3; i++) D.update(1 / 30);
    const L = D.fxL(); L.pk.push({ x: me.x + 70, y: me.y - 10, k: 5 }, { x: me.x + 110, y: me.y + 20, k: 6 }, { x: me.x - 80, y: me.y + 30, k: 5 });
    D.traps().push({ k: 'mine', x: me.x - 150, y: me.y + 90, a: 9, armed: true }, { k: 'claw', x: me.x + 200, y: me.y + 90, a: 9, armed: true });
    D.aids().push({ id: 9805, x: me.x + 40, y: me.y + 100, t: 5 }); D.dcyList().push({ id: 9806, x: me.x - 30, y: me.y + 150, t: 5 });
  },
};
(async () => {
  const env = await lib.launch({ webgl: true });
  const page = await lib.openGame(env, { still: true, gfx: 'mittel' });
  await lib.loadInpage(page, 'bild.js');
  await page.evaluate(async () => { await __dbg.view3d.set(true); });
  for (const [k, f] of Object.entries(SHOTS)) {
    const r = await page.evaluate(src => { (0, eval)('(' + src + ')')(); const D = __dbg; D.mouse.t = -999; D.draw(); D.draw(); const i = D.view3d.V.info(); return { fx: i.fx, calls: i.calls, pl: i.light.pl, err: i.err }; }, f.toString());
    const el = await page.$('main');
    const file = path.join(OUT, '3d7-' + k + '.jpg');
    await page.screenshot({ path: file, type: 'jpeg', quality: 82, clip: await el.boundingBox() });
    console.log(k, JSON.stringify(r));
  }
  if (page.errors.length) console.log('Fehler', page.errors.slice(0, 3));
  await env.browser.close(); env.srv.close();
})();
