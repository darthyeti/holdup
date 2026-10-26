// Paket P5 (26. Oktober 2026, Tills Flugschreiber-Log b163, Runde 15, drei Marker): Ein verletzter Beamter (Modus push) klebte am Spieler mit Geisel, 0 bis 17 Pixel, ueber 15 s.
// Ursache: Das Geiselschild nahm den Geschuetzten ganz aus der Zielwahl, ohne Ziel hat der Beamte keinen Haltabstand und folgt dem Weg-Feld bis in die Kachel des Spielers.
// Jetzt bleibt der Geschuetzte Ziel fuer Bewegung und Zielen (Abstand, Kreisen), nur das Schiessen ist gesperrt, und die Reaktionszeit zaehlt nicht hoch. Aufbau wie 105-geiselschild.
const HELP = `(() => {
  const D = __dbg, T = 32;
  const strip = () => { const w = D.world(); for (let ty = w.WY0 + 2; ty < w.WY0 + w.H - 2; ty++) for (let tx = w.WX0 + 9; tx < w.WX0 + w.W - 3; tx++) { const x = tx * T + 16, y = ty * T + 16; let ok = true;
    for (let d = -300; d <= 120 && ok; d += 12) for (const dy of [-1, 0, 1]) if (D.isSol(Math.floor((x + d) / T), ty + dy)) ok = false;
    if (ok && D.clear(x - 300, y, x + 120, y) && D.los(x - 300, y, x + 120, y)) return { x, y }; } return null; };
  const scene = (np) => { D.setN(np || 1); D.setScenario('bank'); D.setSeedMode('random'); D.setLage([]); D.setTurn('S'); D.buildSeed(5017); D.CFG.policeAt = 1e6; D.CFG.policeForced = 1e6;
    D.reset(); D.startHeist(false, D.get().me); const g = D.get(), me = g.me, p2 = g.players[1] || null; g.en.length = 0; const sp = strip(); if (!sp) return null;
    const n = g.npcs.find(q => q.st === 'cower' && q.k !== 'grd'); D.grabHost(n, me); return { D, g, me, p2, n, sp }; };
  const angd = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
  return { D, strip, scene, angd };
})()`;

module.exports = [
  {
    name: 'Geiselschild-Abstand: Ein verletzter Beamter im Angriffsmodus haelt bei einem Spieler mit Geisel Abstand (ueber 80 Pixel), zielt, schiesst nicht; ohne Geisel kreist er und schiesst (Gegenprobe)',
    async run(t) {
      const r = await t.page.evaluate(`(() => { const H = ${HELP}, D = H.D, out = {};
        const go = (withHost) => { const sc = H.scene(); if (!sc) return null; const { sp, me, n } = sc; if (!withHost) D.relHost(me);
          const cop = D.mkCop(sp.x - 200, sp.y, false); cop.hp = 32; cop.mode = 'push'; D.get().en.push(cop);
          const seen = new Set(), dist = []; let aimErr = 9;
          for (let i = 0; i < 15 * 30; i++) { me.x = sp.x; me.y = sp.y; me.hp = 1e9; if (withHost) { n.x = sp.x + 40; n.y = sp.y } D.update(1 / 30);
            for (const b of D.get().bl) if (!b.o) seen.add(b.id);
            if (i % 15 === 0) dist.push(Math.round(Math.hypot(cop.x - me.x, cop.y - me.y))); aimErr = H.angd(cop.a, Math.atan2(me.y - cop.y, me.x - cop.x)); }
          return { dist, min3: Math.min(...dist.slice(6)), shots: seen.size, aimErr: Math.round(aimErr * 100) / 100, mode: cop.mode }; };
        out.mit = go(true); out.ohne = go(false); return out; })()`);
      t.ok(r.mit && r.ohne, 'Aufbau (freier Streifen in der Bank)');
      t.ok(r.mit.min3 > 80, 'mit Geisel: ab der dritten Sekunde nie naeher als 80 Pixel (vorher 1 Pixel): ' + r.mit.dist.join(','));
      t.eq(r.mit.shots, 0, 'mit Geisel: kein Schuss in 15 s (das Budget reicht)');
      t.ok(r.mit.aimErr < .5, 'er zielt auf den Spieler: Abweichung ' + r.mit.aimErr);
      t.ok(r.ohne.shots >= 3, 'Gegenprobe ohne Geisel: er schiesst (' + r.ohne.shots + ' Schuesse)');
      t.ok(r.ohne.min3 > 40 && r.ohne.min3 < 200, 'ohne Geisel: er haelt den ueblichen Abstand: ' + r.ohne.dist.join(','));
    },
  },
  {
    name: 'Geiselschild-Abstand: Ist das Schild verbraucht, schiesst der Beamte erst nach der Reaktionszeit (CFG.pol.react), nicht im ersten Bild; ein geschuetzter und ein freier Spieler: er schiesst auf den freien',
    async run(t) {
      const r = await t.page.evaluate(`(() => { const H = ${HELP}, D = H.D, out = {};
        { const sc = H.scene(); const { sp, me, n } = sc, cop = D.mkCop(sp.x - 200, sp.y, false); cop.hp = 32; cop.mode = 'push'; D.get().en.push(cop);
          D.setShield(D.holdCap() - 1); let tExp = -1, tShot = -1; const seen = new Set();
          for (let i = 0; i < 12 * 30; i++) { me.x = sp.x; me.y = sp.y; me.hp = 1e9; n.x = sp.x + 40; n.y = sp.y; D.update(1 / 30); const sh = D.hostShield(me);
            if (!sh && tExp < 0) tExp = i / 30; for (const b of D.get().bl) if (!b.o && !seen.has(b.id)) { seen.add(b.id); if (tShot < 0) tShot = i / 30; } }
          out.ablauf = { tExp, tShot, delta: Math.round((tShot - tExp) * 100) / 100, react: D.CFG.pol.react }; }
        { const sc = H.scene(2); const { sp, me, p2, n } = sc, cop = D.mkCop(sp.x - 240, sp.y, false); D.get().en.push(cop); const seen = new Set();
          for (let i = 0; i < 5 * 30; i++) { me.x = sp.x - 80; me.y = sp.y + 28; me.hp = 1e9; n.x = sp.x - 100; n.y = sp.y + 30; p2.x = sp.x + 60; p2.y = sp.y; p2.hp = 1e9; cop.x = sp.x - 240; cop.y = sp.y; D.update(1 / 30);
            for (const b of D.get().bl) if (!b.o) seen.add(b.id); }
          out.zwei = { shots: seen.size, geschuetzt: D.hostShield(me), frei: D.hostShield(p2) }; }
        return out; })()`);
      t.ok(r.ablauf.tExp >= 0 && r.ablauf.tShot >= 0, 'das Schild laeuft ab und der Beamte schiesst danach: ' + JSON.stringify(r.ablauf));
      t.ok(r.ablauf.delta >= r.ablauf.react - .05, 'erst nach der Reaktionszeit ' + r.ablauf.react + ' s, nicht im ersten Bild: ' + r.ablauf.delta + ' s nach Ablauf');
      t.ok(r.zwei.geschuetzt === true && r.zwei.frei === false, 'Aufbau: Spieler 0 geschuetzt, Spieler 1 frei: ' + JSON.stringify(r.zwei));
      t.ok(r.zwei.shots >= 2, 'ein geschuetzter und ein freier Spieler im Blick: der Beamte schiesst auf den freien (' + r.zwei.shots + ' Schuesse)');
    },
  },
  {
    name: 'Geiselschild-Abstand: Ein Beamter im Modus run (auf dem Weg zum Posten) wechselt wegen eines Geschuetzten nicht auf push (wie bisher), ohne Geisel wechselt er',
    async run(t) {
      const r = await t.page.evaluate(`(() => { const H = ${HELP}, D = H.D, out = {};
        const go = (withHost) => { const sc = H.scene(); const { sp, me, n } = sc; if (!withHost) D.relHost(me);
          const cop = D.mkCop(sp.x - 150, sp.y, false); cop.mode = 'run'; cop.path = [[sp.x - 100, sp.y + 20], [sp.x + 100, sp.y + 20]]; cop.post = { x: sp.x + 100, y: sp.y, a: 0, door: null }; D.get().en.push(cop);
          for (let i = 0; i < 20; i++) { me.x = sp.x; me.y = sp.y; me.hp = 1e9; n.x = sp.x + 40; n.y = sp.y; D.update(1 / 30); } return cop.mode; };
        out.mit = go(true); out.ohne = go(false); return out; })()`);
      t.eq(r.mit, 'run', 'mit Geisel bleibt er auf dem Weg');
      t.eq(r.ohne, 'push', 'Gegenprobe ohne Geisel: er sieht den Spieler und greift an');
    },
  },
];
