// #314: Flugschreiber und Abschussmeldung. (1) startHeist schreibt das Ereignis ausloeser [Spieler-Id (-1 keiner), Grund, erzwungen] in den Flugschreiber (F, Verdacht, Laser, C4, Tor, Vorhut, ...).
// (2) Die Abschussmeldung nennt die echte Waffe auf Deutsch (Pistole, MP, Sturmgewehr, Praezisionsgewehr, Selbstschuss-MG, Claymore, Granatwerfer, Explosion) und solo DU statt YOU. Die Kugel traegt die Quelle im Feld src (nur Host, kein Netzformat).
const HELP = `(() => {
  const D = __dbg, T = 32;
  const strip = () => { const w = D.world(); for (let ty = w.WY0 + 2; ty < w.WY0 + w.H - 2; ty++) for (let tx = w.WX0 + 9; tx < w.WX0 + w.W - 3; tx++) { const x = tx * T + 16, y = ty * T + 16; let ok = true;
    for (let d = -240; d <= 70 && ok; d += 12) for (const dy of [-1, 0, 1]) if (D.isSol(Math.floor((x + d) / T), ty + dy)) ok = false;
    if (ok && D.clear(x - 240, y, x + 70, y)) return { x, y }; } return null; };
  const scene = (sk, phase1) => { D.sessReset(); Object.assign(D.SESSION.sk, sk || {}); D.setScenario('bank'); D.setSeedMode('random'); D.setLage([]); D.setTurn('S'); D.buildSeed(5017); D.CFG.policeAt = 1e6; D.CFG.policeForced = 1e6;
    D.reset(); if (!phase1) D.startHeist(false, D.get().me); const g = D.get(), me = g.me, sp = strip(); if (!sp) return null; g.en.length = 0; me.x = sp.x; me.y = sp.y; me.hp = 100; me.inv = 0; me.ar = 0; return { D, g, me, sp }; };
  const cop = (sc, x, y, hp) => { const c = D.mkCop(x, y, false); c.mode = 'post'; c.post = { x, y, a: Math.PI, door: null }; c.rt = 1e9; c.a = Math.PI; c.cool = 1e9; c.hp = hp == null ? 1 : hp; sc.g.en.push(c); return c; };
  const run = (sc, sec, pin, god) => { for (let i = 0; i < sec * 30; i++) { if (god) sc.me.hp = 1e9; for (const [f, x, y] of pin || []) { f.x = x; f.y = y; } D.update(1 / 30); } };
  const aimAt = (d, x, y) => { d.draw(); const m = d.mouse, cx = m.x - m.sx, cy = m.y - m.sy; m.sx = x - cx; m.sy = y - cy; m.t = d.get().time; d.draw(); };
  const feed = () => D.msgs().feed.join(' | ');
  const ausl = () => D.flog().dump().ereignisse.filter(e => e[2] === 'ausloeser').map(e => e[3]).slice(-1);
  return { D, scene, cop, run, aimAt, feed, ausl };
})()`;

module.exports = [
  {
    name: 'Abschuss mit eigener Waffe: Pistole, MP (SMG), Sturmgewehr, Praezisionsgewehr heissen richtig, solo steht DU, nie Rifle oder YOU',
    async run(t) {
      const r = await t.page.evaluate(`(() => { const H = ${HELP}, D = H.D, o = {};
        for (const w of ['pistol', 'smg', 'rifle']) { const sc = H.scene({}); sc.me.wp = D.CFG.wpn[w]; sc.me.mag = 30; sc.me.res = 100;
          const c = H.cop(sc, sc.sp.x + 100, sc.sp.y); D.mouse.down = 1; H.aimAt(D, c.x, c.y); H.run(sc, .6, [[c, c.x, c.y], [sc.me, sc.sp.x, sc.sp.y]], true); D.mouse.down = 0; o[w] = H.feed(); }
        const sc = H.scene({ A3: 1 }); sc.me.sx = 5; const c = H.cop(sc, sc.sp.x + 100, sc.sp.y); D.fireSpw(sc.me, c.x, c.y); H.run(sc, .5, [[c, c.x, c.y]], true); o.prec = H.feed();
        return o; })()`);
      t.ok(/DU {2}> {2}Pistole {2}> {2}Polizist/.test(r.pistol), 'Pistole: ' + r.pistol);
      t.ok(/DU {2}> {2}MP {2}> {2}Polizist/.test(r.smg), 'MP: ' + r.smg);
      t.ok(/DU {2}> {2}Sturmgewehr {2}> {2}Polizist/.test(r.rifle), 'Sturmgewehr: ' + r.rifle);
      t.ok(/DU {2}> {2}Pr.zisionsgewehr {2}> {2}Polizist/.test(r.prec), 'Praezisionsgewehr: ' + r.prec);
      for (const k of ['pistol', 'smg', 'rifle', 'prec']) t.ok(!/Rifle|YOU/.test(r[k]), 'weder Rifle noch YOU in ' + k);
    },
  },
  {
    name: 'Abschuss durch Geraete: Selbstschuss-MG, Claymore und Explosion (Zapfsaeule/Auto) stehen mit Namen in der Meldung, der Flugschreiber schreibt dieselbe Zeile als say',
    async run(t) {
      const r = await t.page.evaluate(`(() => { const H = ${HELP}, D = H.D, o = {};
        let sc = H.scene({ V4: 2 }); D.useGadget(sc.me, 8, sc.sp.x - 60, sc.sp.y); const m = D.mgs()[0];
        const c = H.cop(sc, m.x + Math.cos(m.a) * 100, m.y + Math.sin(m.a) * 100); H.run(sc, 1.5, [[c, c.x, c.y], [sc.me, sc.sp.x + 50, sc.sp.y]], true); o.mg = H.feed();
        o.say = D.flog().dump().ereignisse.filter(e => e[2] === 'say' && /Selbstschuss-MG/.test(e[3])).length;
        sc = H.scene({ V2: 1 }); const x = sc.sp.x - 60, y = sc.sp.y; D.useGadget(sc.me, 3, x, y); const c2 = H.cop(sc, x + 20, y); H.run(sc, 3.5, [[c2, x + 20, y], [sc.me, sc.sp.x + 50, sc.sp.y]], true); o.claw = H.feed();
        sc = H.scene({}); const c3 = H.cop(sc, sc.sp.x - 40, sc.sp.y); D.blastAt(sc.sp.x - 40, sc.sp.y, { dmg: 80, pdmg: 0, r: 60, scorch: 20 }, 0, 1); o.boom = H.feed();
        return o; })()`);
      t.ok(/DU {2}> {2}Selbstschuss-MG {2}> {2}Polizist/.test(r.mg), 'MG: ' + r.mg);
      t.ok(r.say >= 1, 'Flugschreiber hat die MG-Zeile');
      t.ok(/DU {2}> {2}Claymore {2}> {2}Polizist/.test(r.claw), 'Claymore: ' + r.claw);
      t.ok(/DU {2}> {2}Explosion {2}> {2}Polizist/.test(r.boom), 'Explosion: ' + r.boom);
    },
  },
  {
    name: 'Ausloeser von Phase 2 im Flugschreiber: F mit Spieler-Id, Verdacht, Vorhut; Coop: Client-F nennt Spieler 1, Client sieht dieselbe Abschussmeldung mit Namen und Waffe',
    async run(t) {
      await t.loadTool('loopnet.js'); await t.loadInpage('coop.js');
      const r = await t.page.evaluate(`(() => { const H = ${HELP}, D = H.D, o = {};
        let sc = H.scene({}, true); D.startHeist(false, sc.me, undefined, 'F'); o.f = H.ausl();
        sc = H.scene({}, true); D.startHeist(true, null, false, 'Vorhut'); o.vh = H.ausl();
        sc = H.scene({}, true); D.detect(sc.me, undefined, sc.me.x, sc.me.y, null); o.sus = H.ausl();
        return o; })()`);
      t.eq(r.f, [[0, 'F', false]], 'Solo: F mit Spieler-Id 0');
      t.eq(r.vh, [[-1, 'Vorhut', true]], 'ohne Spieler -1, Grund Vorhut');
      t.eq(r.sus, [[0, 'Verdacht', true]], 'Entdeckt: Verdacht');
      const c = await t.page.evaluate(() => {
        const G = CT.mkGame('bank', 321, 2), A = G.A, B = G.clients[0], o = {}; A.CFG.policeAt = 1e6; A.CFG.policeForced = 1e6;
        B.cv.dispatchEvent(new KeyboardEvent('keydown', { key: 'f', bubbles: true })); G.run(1);
        o.aus = A.flog().dump().ereignisse.filter(e => e[2] === 'ausloeser').map(e => e[3]); o.ph = [A.get().phase, B.get().phase];
        const e = A.mkCop(A.get().me.x + 60, A.get().me.y, false); e.mode = 'post'; e.post = { x: e.x, y: e.y, a: 0, door: null }; e.rt = 1e9; e.cool = 1e9; e.hp = 1; A.get().en.push(e);
        A.blastAt(e.x, e.y, { dmg: 50, pdmg: 0, r: 40, scorch: 10 }, 1, 1, 'Claymore'); G.run(.5);
        o.fa = A.msgs().feed.filter(s => />/.test(s)); o.fb = B.msgs().feed.filter(s => />/.test(s));
        return o;
      });
      t.eq(c.aus.length, 1, 'ein Ausloeser im Log des Hosts');
      t.eq([c.aus[0][0], c.aus[0][1]], [1, 'F'], 'Client (Spieler 1) mit F');
      t.eq(c.ph, [2, 2], 'beide in Phase 2');
      t.ok(c.fa.length === 1 && /> {2}Claymore {2}> {2}Polizist/.test(c.fa[0]) && !/DU/.test(c.fa[0]), 'Host: Name statt DU: ' + JSON.stringify(c.fa));
      t.eq(c.fb, c.fa, 'der Client sieht dieselbe Meldung');
    },
  },
];
