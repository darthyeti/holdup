// Geiselschild (Tills Wunsch nach dem Coop-Test vom 26. Oktober 2026: Geiseln halfen den Mitspielern zu wenig, draussen schoss die Polizei einfach los): Wer naeher als CFG.hostage.shield (80 Pixel) an einer lebenden Geisel
// steht, auch an der eines Mitspielers und auch draussen, wird von Beamten und Scharfschuetzen nicht angegriffen, solange das Zeitbudget shX (hoechstens holdCap Sekunden je Auftrag, es laeuft nur, solange ein Beamter in
// Schussweite ist) nicht verbraucht ist. Danach schiessen sie wieder, die Linienregel (hostBlock) bleibt. Aufbau wie 97-geisel-kugelfang: Bank Seed 5017, freier waagrechter Streifen, Figuren werden festgehalten.
const HELP = `(() => {
  const D = __dbg, T = 32;
  const strip = () => { const w = D.world(); for (let ty = w.WY0 + 2; ty < w.WY0 + w.H - 2; ty++) for (let tx = w.WX0 + 9; tx < w.WX0 + w.W - 3; tx++) { const x = tx * T + 16, y = ty * T + 16; let ok = true;
    for (let d = -240; d <= 70 && ok; d += 12) for (const dy of [-1, 0, 1]) if (D.isSol(Math.floor((x + d) / T), ty + dy)) ok = false;
    if (ok && D.clear(x - 240, y, x + 70, y) && D.los(x - 240, y, x + 70, y)) return { x, y }; } return null; };
  const scene = (np) => { D.setN(np || 1); D.setScenario('bank'); D.setSeedMode('random'); D.setLage([]); D.setTurn('S'); D.buildSeed(5017); D.CFG.policeAt = 1e6; D.CFG.policeForced = 1e6;
    D.reset(); D.startHeist(false, D.get().me); const g = D.get(), me = g.me, p2 = g.players[1] || null; g.en.length = 0; const sp = strip(); if (!sp) return null;
    const n = g.npcs.find(q => q.st === 'cower' && q.k !== 'grd'); D.grabHost(n, me); return { D, g, me, p2, n, sp }; };
  // sek Sekunden, alle Figuren festgehalten: Spieler 1 bei p, Geisel bei h, optional Spieler 2 bei q, Beamter bei c. Rueckgabe: Zahl der neuen Gegnerkugeln
  const run = (sc, sec, pos, c, f) => { const seen = new Set(); for (let i = 0; i < sec * 30; i++) { sc.me.x = pos.p[0]; sc.me.y = pos.p[1]; sc.me.hp = 1e9; sc.n.x = pos.h[0]; sc.n.y = pos.h[1]; if (sc.p2 && pos.q) { sc.p2.x = pos.q[0]; sc.p2.y = pos.q[1]; sc.p2.hp = 1e9; } if (c) { c.x = pos.c[0]; c.y = pos.c[1]; } if (f) f(i);
    D.update(1 / 30); for (const b of D.get().bl) if (!b.o) seen.add(b.id); } return seen.size; };
  return { D, strip, scene, run };
})()`;

module.exports = [
  {
    name: 'Geiselschild: Ein Beamter schiesst nicht auf einen Spieler im Umkreis der Geisel (auch hinter dem Spieler, auch ausserhalb der Schusslinie), das Budget laeuft, ausserhalb des Umkreises schiesst er',
    async run(t) {
      const r = await t.page.evaluate(`(() => { const H = ${HELP}, D = H.D, out = {}; out.shield = D.CFG.hostage.shield;
        const var1 = (name, hx, hy) => { const sc = H.scene(); if (!sc) return; const { sp } = sc, cop = D.mkCop(sp.x - 200, sp.y, false); D.get().en.push(cop);
          const n = H.run(sc, 4, { p: [sp.x, sp.y], h: [sp.x + hx, sp.y + hy], c: [sp.x - 200, sp.y] }, cop); out[name] = { shots: n, budget: Math.round(D.hostSt().s * 10) / 10 }; };
        var1('hinten', 40, 0);        // 40 Pixel hinter dem Spieler: geschuetzt
        var1('seitlich', 0, 70);      // 70 Pixel daneben, nicht auf der Linie: geschuetzt (nur das Schild, die Linienregel greift nicht)
        var1('weit', 100, 0);         // 100 Pixel: ausserhalb
        var1('weitSeit', 0, 95);      // 95 Pixel seitlich: ausserhalb
        return out; })()`);
      t.eq(r.shield, 80, 'CFG.hostage.shield 80');
      t.eq(r.hinten.shots, 0, 'Geisel 40 Pixel hinter dem Spieler: kein Schuss (vorher schuetzte sie dort nicht): ' + JSON.stringify(r.hinten));
      t.eq(r.seitlich.shots, 0, 'Geisel 70 Pixel seitlich: kein Schuss: ' + JSON.stringify(r.seitlich));
      t.ok(r.hinten.budget >= 3 && r.hinten.budget <= 4.1, 'das Budget laeuft nur mit Beamtem in Schussweite: rund 4 s nach 4 s: ' + r.hinten.budget);
      t.ok(r.weit.shots >= 3 && r.weitSeit.shots >= 3, 'ausserhalb von 80 Pixeln schiesst der Beamte (100 hinten, 95 seitlich): ' + JSON.stringify([r.weit, r.weitSeit]));
      t.ok(r.weit.budget === 0 && r.weitSeit.budget === 0, 'ausserhalb des Umkreises verbraucht sich nichts: ' + JSON.stringify([r.weit.budget, r.weitSeit.budget]));
    },
  },
  {
    name: 'Geiselschild: Es gilt fuer Mitspieler der Geisel (nicht nur fuer den Besitzer), wer ausserhalb steht, wird beschossen; ein Scharfschuetze zielt nicht auf einen Geschuetzten',
    async run(t) {
      const r = await t.page.evaluate(`(() => { const H = ${HELP}, D = H.D, out = {};
        // Zwei Spieler: Besitzer 0 steht weit weg (ausser Schussweite), die Geisel (folgt ihm, im Test festgehalten) steht dy Pixel unter dem Mitspieler 1, der Beamte hat nur ihn im Blick
        const duo2 = (name, dy) => { const sc = H.scene(2); if (!sc || !sc.p2) return; const { sp } = sc, cop = D.mkCop(sp.x - 200, sp.y, false); D.get().en.push(cop);
          const n = H.run(sc, 3, { p: [sp.x + 250, sp.y + 150], h: [sp.x, sp.y + dy], q: [sp.x, sp.y], c: [sp.x - 200, sp.y] }, cop); out[name] = { shots: n }; };
        duo2('geschuetzt', 60);  // Geisel 60 Pixel unter dem Mitspieler (gehoert Spieler 0, der weit weg steht): der Mitspieler ist geschuetzt
        duo2('ungeschuetzt', 140);
        // Scharfschuetze: zielt nicht auf einen Geschuetzten
        const snp = (name, hx) => { const sc = H.scene(); if (!sc) return; const { sp } = sc, sn = D.mkSniper({ x: sp.x - 230, y: sp.y, a: 0 }); sn.cd = 0; D.get().en.push(sn);
          let aim = 0; for (let i = 0; i < 90; i++) { sc.me.x = sp.x; sc.me.y = sp.y; sc.me.hp = 1e9; sc.n.x = sp.x + hx; sc.n.y = sp.y; sn.x = sp.x - 230; sn.y = sp.y; D.update(1 / 30); aim = Math.max(aim, sn.aim); } out[name] = { aim: Math.round(aim * 100) / 100 }; };
        snp('snGeschuetzt', 40); snp('snFrei', 130);
        // der Scharfschuetze zielt schon (Geisel weit weg), dann tritt der Spieler in den Umkreis: das Zielen bricht ab
        { const sc = H.scene(); if (sc) { const { sp } = sc, sn = D.mkSniper({ x: sp.x - 230, y: sp.y, a: 0 }); sn.cd = 0; D.get().en.push(sn); let hx = 220, mid = 0, end = -1;
          for (let i = 0; i < 40; i++) { sc.me.x = sp.x; sc.me.y = sp.y; sc.me.hp = 1e9; sc.n.x = sp.x + hx; sc.n.y = sp.y; sn.x = sp.x - 230; sn.y = sp.y; D.update(1 / 30); if (i === 20) { mid = sn.aim; hx = 40; } }
          end = sn.aim; out.snMitte = { mid: mid > 0, end }; } }
        return out; })()`);
      t.ok(r.geschuetzt && r.geschuetzt.shots === 0, 'ein Mitspieler 60 Pixel von der Geisel eines anderen Spielers wird nicht beschossen: ' + JSON.stringify(r.geschuetzt));
      t.ok(r.ungeschuetzt && r.ungeschuetzt.shots >= 3, 'derselbe Mitspieler 140 Pixel entfernt wird beschossen: ' + JSON.stringify(r.ungeschuetzt));
      t.ok(r.snGeschuetzt.aim === 0, 'ein Scharfschuetze zielt nicht auf einen Geschuetzten: ' + JSON.stringify(r.snGeschuetzt));
      t.ok(r.snMitte && r.snMitte.mid && r.snMitte.end === 0, 'er zielt schon, dann tritt der Spieler in den Umkreis der Geisel: das Zielen bricht ab: ' + JSON.stringify(r.snMitte));
      t.ok(r.snFrei.aim > 0, 'Gegenprobe ohne Geisel in der Naehe: er zielt (aim ' + r.snFrei.aim + ')');
    },
  },
  {
    name: 'Geiselschild: Das Budget ist begrenzt (holdCap, mit Verhandler mehr): ist es verbraucht, schiessen die Beamten wieder; die HUD-Zeile nennt Schild und Rest, und der Client bekommt den Stand mit dem Schnappschuss',
    async run(t) {
      const r = await t.page.evaluate(`(() => { const H = ${HELP}, D = H.D, out = {}; const sc = H.scene(); if (!sc) return out; const { sp } = sc, cop = D.mkCop(sp.x - 200, sp.y, false); D.get().en.push(cop);
        const pos = { p: [sp.x, sp.y], h: [sp.x + 40, sp.y], c: [sp.x - 200, sp.y] }; out.cap = D.holdCap();
        D.setShield(out.cap - 1); out.vor = H.run(sc, 3, pos, cop);            // noch 1 s Budget: danach geht es auf, der Beamte schiesst
        out.rest = D.hostSt().s; out.nach = D.hostShield(sc.me);
        // HUD: die Zeile steht, sobald eine Geisel lebt
        D.setShield(0); const tx = []; const ctx = document.getElementById('c').getContext('2d'), o = ctx.fillText; ctx.fillText = function (s) { tx.push(String(s)); return o.apply(this, arguments); }; try { D.draw(); } finally { ctx.fillText = o; }
        out.hud = tx.filter(s => /Geiselschild/.test(s));
        D.setShield(out.cap); const tx2 = []; ctx.fillText = function (s) { tx2.push(String(s)); return o.apply(this, arguments); }; try { D.draw(); } finally { ctx.fillText = o; } out.hud2 = tx2.filter(s => /Geiselschild/.test(s));
        // Netz: der Wert faehrt im Schnappschuss mit
        D.setShield(12.5); out.snap = D.buildSnap().g[28]; D.setShield(0); D.applySnap(Object.assign({}, D.buildSnap(), {})); out.back = D.hostSt().s;
        return out; })()`);
      t.eq(r.cap, 30, 'holdCap 30 s ohne Verhandler');
      t.ok(r.vor >= 2, 'nach 1 s Restbudget schiesst der Beamte wieder (' + r.vor + ' Schuesse in 3 s)');
      t.ok(r.rest >= r.cap - 0.01, 'das Budget ist am Deckel: ' + r.rest);
      t.eq(r.nach, false, 'verbraucht: hostShield ist aus');
      t.ok(r.hud.length === 1 && /noch/.test(r.hud[0]), 'HUD mit Rest: ' + JSON.stringify(r.hud));
      t.ok(r.hud2.length === 1 && /verbraucht/.test(r.hud2[0]), 'HUD verbraucht: ' + JSON.stringify(r.hud2));
      t.eq(r.snap, 12.5, 'Schnappschuss g[28] tragt das Budget');
    },
  },
];
