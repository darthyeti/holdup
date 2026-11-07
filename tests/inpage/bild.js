// Seitenskript fuer den Pixel-Hash-Test (tests/cases/189-pixelhash.test.js) und die Bildzeit-Messung (tools/messung-bildzeit.js).
// Stellt ein Bild reproduzierbar her: Seite mit openGame(env, { still: true, gfx }) (die Spielschleife steht still), dann PX.scene(sc, seed) und PX.phase(name) fuer jede Phase der Reihe nach.
// Eingefroren wird, was das Zeichnen sonst von Lauf zu Lauf verschieden macht: der Zufall (Math.random, je Szene neu mit festem Startwert), die Spielzeit `time` (zaehlt ueber reset() hinweg weiter, __dbg.setTime),
// die Mausspur (mouse.t, sonst dreht sich die Spielfigur zur zuletzt bewegten Maus), Partikel (ptClear), die Spielschleife (requestAnimationFrame) und die Aufloesung der Eingabe (feste Fenstergroesse kommt vom Test).
window.PX = (() => {
  const D = __dbg, cv = document.getElementById('c'), cx = cv.getContext('2d');
  const mk = a => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const SCN = ['bank', 'truck', 'jewel', 'gas', 'museum', 'casino', 'nb', 'prison'];
  const step = n => { for (let i = 0; i < n; i++) { const m = D.get().me; if (m && m.hp < 100) m.hp = 100; D.update(1 / 30); } };
  const PH = {
    erkundung: () => step(60),                                     // Phase 1: 2 s umsehen
    ueberfall: () => { D.startHeist(); step(60); },                // F gedrueckt: Alarm, Wachen ziehen, 2 s
    polizei: () => step(600),                                      // weitere 20 s Spielzeit mit unverwundbarem Spieler: Polizei ist da, Gefecht
  };
  return {
    SCN, PHASES: Object.keys(PH),
    scene(sc, seed) {
      Math.random = mk(777); D.setTime(0); D.mouse.t = -999;
      D.setN(sc === 'prison' ? 2 : 1); if (sc === 'prison') D.setPz(1);
      D.sessReset(); D.setScenario(sc); D.setSeedMode('random'); D.setLage([]); D.setTurn('S'); D.buildSeed(seed || 5); D.ptClear();
      D.CFG.vanLock = 0;
    },
    phase(name) { PH[name](); const g = D.get(); return { phase: g.phase, en: g.en.length, cars: g.cars.length, npcs: g.npcs.length }; },
    // FNV-1a ueber alle Pixel (als 32-Bit-Woerter, Alpha eingeschlossen) des frisch gezeichneten Bildes
    hash() {
      D.draw(); const d = new Uint32Array(cx.getImageData(0, 0, cv.width, cv.height).data.buffer); let h = 0x811c9dc5;
      for (let i = 0; i < d.length; i++) { h = Math.imul(h ^ d[i], 16777619); h ^= h >>> 15; }
      return (h >>> 0).toString(16).padStart(8, '0');
    },
    // Bildzeit: Median und 90. Perzentil von n Aufrufen draw() (ms) bei unveraendertem Zustand. window.PX_SYNC (gesetzt von tools/messung-bildzeit.js --3d) wartet je Bild auf die Grafikkarte
    ms(n) {
      const sy = window.PX_SYNC || (() => {});
      D.draw(); sy(); const a = []; for (let i = 0; i < n; i++) { const t0 = performance.now(); D.draw(); sy(); a.push(performance.now() - t0); }
      a.sort((x, y) => x - y); return { med: +a[a.length >> 1].toFixed(2), p90: +a[Math.floor(a.length * .9)].toFixed(2) };
    },
  };
})();
