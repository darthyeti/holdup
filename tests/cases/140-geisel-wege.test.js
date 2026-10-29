// Geisel und gezogene Koerper finden einen Weg (Flugschreiber vom 28. Oktober 2026, Tills Beobachtung: eine eingeklemmte Geisel). Befund: Die Geisel (und der gezogene Koerper) laeuft nur geradlinig auf den Spurpunkt des Spielers zu (mv, achsgetrennt).
// Steht ein Wagen oder eine Ecke so, dass beide Achsen blockiert sind, bleibt sie haengen, bis der Spieler 300 px weit weg ist (dann springt sie auf den Spurpunkt). In einer Partie mit Polizei (parkende Streifenwagen, Wracks) kommt das vor:
// in einer Zufallslauf-Messung (Bank Seed 1, Casino Seed 43) steckte die Geisel 3 bis 4 s an einer Wagenecke fest, ohne in Festem zu stehen.
// Jetzt (followStep, CFG.follow): Kommt der Folger nicht voran, sucht er nach CFG.follow.path s mit pathTo einen Weg zum Spurpunkt, nach CFG.follow.tp s wird er an einen freien Platz am Spurpunkt gesetzt.
// Aufbau: Tankstelle (der erste Seed mit einem freien Platz von 11 x 9 Kacheln), dort zwei Wagenbloecke ('v') im Winkel (Norden und Osten der Geisel), der Spieler laeuft von der Nordostseite nach Osten.
const SETUP_P1 = `(() => { const D = __dbg, T = 32; let g, me, W, L, at = null; window.__f0 = window.__f0 || Object.assign({}, D.CFG.follow); Object.assign(D.CFG.follow, window.__f0);   // CFG.follow auf den Anfangswert, die Tests drehen daran
  for (let sd = 1; sd < 40 && !at; sd++) { D.sessReset(); D.setScenario('gas'); D.setSeedMode('random'); D.setLage([]); D.setTurn('S'); D.buildSeed(sd); D.CFG.policeAt = 1e6; D.CFG.policeForced = 1e6;
    g = D.get(); me = g.me; W = D.world(); L = D.LAY(); const B = L.bld;
    // freier Platz: 11 x 9 Kacheln ohne Festes (nach dem Aufbau, also ohne parkende Autos), ausserhalb des Gebaeudes, Bezugspunkt links in der Mitte
    for (let y = W.WY0 + 1; y < W.WY0 + W.H - 9 && !at; y++) for (let x = W.WX0 + 1; x < W.WX0 + W.W - 11 && !at; x++) { let ok = true; for (let j = 0; j < 9 && ok; j++) for (let i = 0; i < 11; i++) if (D.isSol(x + i, y + j) || (x + i >= B.x0 - 1 && x + i <= B.x1 + 1 && y + j >= B.y0 - 1 && y + j <= B.y1 + 1)) { ok = false; break; } if (ok) at = [x + 3, y + 5]; } }
  for (const c of g.cams) c.off = true; @@HEIST@@for (const n of g.npcs) n.st = n.k === 'civ' ? 'cower' : n.st;
  return { D, T, g, me, W, L, at }; })()`;
const SETUP = SETUP_P1.replace('@@HEIST@@', 'D.startHeist(false, me, false); '), SETUP_ERK = SETUP_P1.replace('@@HEIST@@', '');   // Geiseln gibt es nur im Ueberfall (Phase 2), gezogen wird in der Erkundung (Phase 1)

module.exports = [
  {
    name: 'Geisel hinter einem Wagenblock: Sie sucht einen Weg zum Spieler (nach CFG.follow.path s mit pathTo) und ist nach wenigen Sekunden bei ihm; ohne die Wegsuche (Gegenprobe) bleibt sie in der Ecke haengen',
    timeout: 120000,
    async run(t) {
      const run = (off, tpOff) => t.page.evaluate(`(() => { const S = ${SETUP}, { D, T, g, me, W, at } = S, out = {}; if (!at) return { err: 'kein freier Platz' }; const [cx, cy] = at;
        if (${off ? 'true' : 'false'}) { D.CFG.follow.path = 1e9; D.CFG.follow.tp = 1e9; } if (${tpOff ? 'true' : 'false'}) D.CFG.follow.tp = 1e9;
        // Wagenbloecke im Winkel: Norden (cx..cx+3, cy-1) und Osten (cx+1, cy-1..cy+2), die Geisel steht in der Ecke darunter links
        for (let i = 0; i <= 3; i++) W.setc(cx + i, cy - 1, 'v'); for (let j = -1; j <= 2; j++) W.setc(cx + 1, cy + j, 'v');
        const civ = g.npcs.find(n => n.k === 'civ'); civ.x = (cx + .5) * T; civ.y = (cy + .5) * T; civ.st = 'cower';
        me.x = (cx + 2.5) * T; me.y = (cy - 2.5) * T; D.grabHost(civ, me); out.start = [Math.round(Math.hypot(civ.x - me.x, civ.y - me.y))];
        const keys = D.keys; keys.d = true; for (let i = 0; i < 27; i++) { me.hp = 1e9; D.update(1 / 30); } keys.d = false; out.owner = [Math.round(me.x), Math.round(me.y)];
        let near = -1; for (let i = 0; i < 30 * 12; i++) { me.hp = 1e9; D.update(1 / 30); const d = Math.hypot(civ.x - me.x, civ.y - me.y); if (near < 0 && d < 80) near = +(i / 30).toFixed(1); }
        out.near = near; out.dist = Math.round(Math.hypot(civ.x - me.x, civ.y - me.y)); out.st = civ.st; out.sol = D.isSol(Math.floor(civ.x / T), Math.floor(civ.y / T)); return out; })()`);
      const a = await run(false), b = await run(true), c = await run(false, true);
      t.ok(c.near >= 0 && c.near < 8 && c.dist < 80, 'allein die Wegsuche (ohne den Sprung nach tp) bringt sie zum Spieler: ' + JSON.stringify(c));
      t.ok(!a.err, 'Aufbau: ' + JSON.stringify(a)); t.ok(a.start[0] > 80, 'die Geisel steht anfangs hinter den Wagen, nicht neben dem Spieler: ' + JSON.stringify(a.start));
      t.ok(a.near >= 0 && a.near < 8, 'mit Wegsuche ist sie nach unter 8 s beim Spieler (Abstand unter 80): ' + JSON.stringify(a)); t.eq([a.st, a.sol], ['hostage', false], 'sie bleibt Geisel und steht nicht in Festem');
      t.ok(b.near < 0 && b.dist > 150, 'Gegenprobe ohne Wegsuche: sie bleibt in der Ecke haengen (Abstand ' + b.dist + '): ' + JSON.stringify(b));
    },
  },
  {
    name: 'Geisel ohne Weg (der Spieler steht in einem geschlossenen Raum aus Wagenbloecken): nach CFG.follow.tp s ohne Fortschritt steht sie an einem freien Platz am Spurpunkt (im Ring), nicht in Festem, mit groesserem tp entsprechend spaeter',
    timeout: 120000,
    async run(t) {
      const run = tp => t.page.evaluate(`(() => { const S = ${SETUP}, { D, T, g, me, W, at } = S, out = {}; if (!at) return { err: 'kein freier Platz' }; const [cx, cy] = at; D.CFG.follow.tp = ${tp};
        // Ring aus Wagenbloecken (5 x 5 Kacheln, innen 3 x 3) um den Spieler, die Geisel steht davor
        for (let i = 0; i < 5; i++) { W.setc(cx + 2 + i, cy - 4, 'v'); W.setc(cx + 2 + i, cy, 'v'); } for (let j = 1; j < 4; j++) { W.setc(cx + 2, cy - 4 + j, 'v'); W.setc(cx + 6, cy - 4 + j, 'v'); }
        const civ = g.npcs.find(n => n.k === 'civ'); civ.x = (cx - 1.5) * T; civ.y = (cy - 2.5) * T; civ.st = 'cower';
        me.x = (cx + 3.5) * T; me.y = (cy - 1.5) * T; D.grabHost(civ, me); const keys = D.keys; keys.d = true; for (let i = 0; i < 30; i++) { me.hp = 1e9; D.update(1 / 30); } keys.d = false; keys.a = true; for (let i = 0; i < 30; i++) { me.hp = 1e9; D.update(1 / 30); } keys.a = false;
        const inside = () => { const x = Math.floor(civ.x / T), y = Math.floor(civ.y / T); return x >= cx + 3 && x <= cx + 5 && y >= cy - 3 && y <= cy - 1; };
        out.vorher = inside(); let tp = -1; for (let i = 0; i < 30 * 16; i++) { me.hp = 1e9; D.update(1 / 30); if (tp < 0 && inside()) tp = +(i / 30).toFixed(1); }
        out.tp = tp; out.sol = D.isSol(Math.floor(civ.x / T), Math.floor(civ.y / T)); out.st = civ.st; return out; })()`);
      const a = await run(3), b = await run(9);
      t.ok(!a.err, 'Aufbau: ' + JSON.stringify(a)); t.eq(a.vorher, false, 'vor dem Warten steht sie draussen vor dem Ring');
      t.ok(a.tp >= 0 && a.tp <= 4, 'tp 3: sie sitzt nach wenigen Sekunden im Ring beim Spieler (die Zeit ohne Fortschritt begann schon beim Laufen an die Wand): ' + JSON.stringify(a)); t.eq([a.sol, a.st], [false, 'hostage'], 'nicht in Festem, noch Geisel');
      t.ok(b.tp >= a.tp + 4, 'tp 9: spaeter, die Wartezeit zaehlt (' + a.tp + ' gegen ' + b.tp + ' s): ' + JSON.stringify(b));
    },
  },
  {
    name: 'Gezogener Koerper hinter einem Wagenblock: derselbe Weg (followStep), er kommt nach wenigen Sekunden beim Spieler an; ohne Wegsuche bleibt er haengen',
    timeout: 120000,
    async run(t) {
      const run = (off, tpOff) => t.page.evaluate(`(() => { const S = ${SETUP_ERK}, { D, T, g, me, W, at } = S, out = {}; if (!at) return { err: 'kein freier Platz' }; const [cx, cy] = at;
        if (${off ? 'true' : 'false'}) { D.CFG.follow.path = 1e9; D.CFG.follow.tp = 1e9; } if (${tpOff ? 'true' : 'false'}) D.CFG.follow.tp = 1e9;
        for (let i = 0; i <= 3; i++) W.setc(cx + i, cy - 1, 'v'); for (let j = -1; j <= 2; j++) W.setc(cx + 1, cy + j, 'v');
        const w = g.npcs.find(n => n.k === 'civ'); for (const n of g.npcs) if (n !== w) { n.st = 'away'; n.at = 1e9; } w.k = 'grd'; w.x = (cx + .5) * T; w.y = (cy + .5) * T; w.st = 'idle'; w.alert = 0; w.look = null; D.koMi(w).act(me); w.kt = 1e9;
        me.x = (cx + 2.5) * T; me.y = (cy - 2.5) * T; D.bodyMi(w).act(me);
        const keys = D.keys; keys.d = true; for (let i = 0; i < 27; i++) { me.hp = 1e9; D.update(1 / 30); } keys.d = false;
        let near = -1; for (let i = 0; i < 30 * 12; i++) { me.hp = 1e9; D.update(1 / 30); const d = Math.hypot(w.x - me.x, w.y - me.y); if (near < 0 && d < 80) near = +(i / 30).toFixed(1); }
        out.near = near; out.dist = Math.round(Math.hypot(w.x - me.x, w.y - me.y)); out.dr = w.dr; return out; })()`);
      const a = await run(false), b = await run(true), c = await run(false, true);
      t.ok(c.near >= 0 && c.near < 8 && c.dr === 0, 'allein die Wegsuche (ohne den Sprung nach tp) bringt den Koerper zum Spieler: ' + JSON.stringify(c));
      t.ok(!a.err, 'Aufbau: ' + JSON.stringify(a)); t.ok(a.near >= 0 && a.near < 8 && a.dr === 0, 'mit Wegsuche ist der Koerper nach unter 8 s beim Spieler und noch im Schlepptau: ' + JSON.stringify(a));
      t.ok(b.near < 0 && b.dist > 100, 'Gegenprobe ohne Wegsuche: er bleibt haengen (Abstand ' + b.dist + '): ' + JSON.stringify(b));
    },
  },
  {
    name: 'Normales Folgen bleibt wie es war: Eine Geisel, die dem Spieler 40 s lang durch den freien Platz mit ein paar Wagenbloecken folgt (Zufallslauf), springt nie (hoechstens 10 px je Bild), steht nie in Festem und ist am Ende nah beim Spieler',
    timeout: 120000,
    async run(t) {
      const r = await t.page.evaluate(`(() => { const S = ${SETUP}, { D, T, g, me, W, at } = S, out = {}; if (!at) return { err: 'kein freier Platz' }; const [cx, cy] = at;
        for (const [x, y] of [[cx + 1, cy - 2], [cx + 2, cy - 2], [cx + 5, cy + 1], [cx + 5, cy + 2], [cx + 6, cy + 2], [cx - 1, cy + 2], [cx - 2, cy + 2]]) W.setc(x, y, 'v');
        const civ = g.npcs.find(n => n.k === 'civ'); civ.x = (cx + .5) * T; civ.y = (cy + .5) * T; civ.st = 'cower'; me.x = (cx + 1.5) * T; me.y = (cy + .5) * T; D.grabHost(civ, me);
        let rs = 4711; const rnd = () => (rs = (Math.imul(rs, 1664525) + 1013904223) >>> 0) / 4294967296, keys = D.keys; let dir = [0, 0], dt = 0, maxJump = 0, sol = 0, lx = civ.x, ly = civ.y;
        for (let i = 0; i < 30 * 40; i++) { if (dt <= 0) { dir = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]][Math.floor(rnd() * 8)]; dt = 8 + Math.floor(rnd() * 30); } dt--;
          keys.d = dir[0] > 0; keys.a = dir[0] < 0; keys.s = dir[1] > 0; keys.w = dir[1] < 0; me.hp = 1e9; D.update(1 / 30); maxJump = Math.max(maxJump, Math.hypot(civ.x - lx, civ.y - ly)); lx = civ.x; ly = civ.y; if (D.isSol(Math.floor(civ.x / T), Math.floor(civ.y / T))) sol++; }
        keys.w = keys.a = keys.s = keys.d = false; for (let i = 0; i < 60; i++) { me.hp = 1e9; D.update(1 / 30); } out.maxJump = +maxJump.toFixed(1); out.sol = sol; out.dist = Math.round(Math.hypot(civ.x - me.x, civ.y - me.y)); out.st = civ.st; return out; })()`);
      t.ok(!r.err, 'Aufbau: ' + JSON.stringify(r)); t.ok(r.maxJump <= 10, 'kein Sprung (hoechstens 10 px je Bild): ' + JSON.stringify(r)); t.eq([r.sol, r.st], [0, 'hostage'], 'nie in Festem, noch Geisel'); t.ok(r.dist < 90, 'am Ende beim Spieler: ' + r.dist);
    },
  },
  {
    name: 'followStep einzeln: Wer nur kurz haengt und zwischendurch vorankommt, wird nie versetzt (der Zaehler faengt bei Fortschritt neu an), erst die zusammenhaengende Zeit ohne Fortschritt zaehlt',
    timeout: 60000,
    async run(t) {
      const r = await t.page.evaluate(`(() => { const S = ${SETUP}, { D, T, g, me, W, at } = S, out = {}; if (!at) return { err: 'kein freier Platz' }; const [cx, cy] = at; W.setc(cx + 1, cy, 'v');
        const n = g.npcs.find(q => q.k === 'civ'); n.x = (cx + .5) * T; n.y = (cy + .5) * T; n.fk = 0; n.fw = null; let maxJump = 0, lx = n.x, ly = n.y;
        const east = { x: (cx + 3.5) * T, y: (cy + .5) * T }, west = { x: (cx - 2.5) * T, y: (cy + .5) * T };
        // 40 Runden: 0,2 s hinter der Wand (kein Fortschritt), dann zwei Bilder frei nach Westen (Fortschritt), zurueck an die Wand: zusammen 8 s ohne Fortschritt, nie 3 s am Stueck
        D.CFG.follow.path = 1e9;   // ohne Wegsuche, sonst liefe er um die Wand und kaeme voran
        let jumps = 0;
        for (let k = 0; k < 40; k++) { for (let i = 0; i < 6; i++) { const x0 = n.x, y0 = n.y; D.followStep(n, east, 135, 1 / 30, 4, true); if (Math.hypot(n.x - x0, n.y - y0) > 20) jumps++; } for (let i = 0; i < 2; i++) { const x0 = n.x, y0 = n.y; D.followStep(n, { x: n.x - 200, y: n.y }, 135, 1 / 30, 4, true); if (Math.hypot(n.x - x0, n.y - y0) > 20) jumps++; } n.x = (cx + .5) * T; n.y = (cy + .5) * T; }
        out.jumps = jumps;
        // Gegenprobe: 4 s am Stueck ohne Fortschritt (ohne Wegsuche, sonst liefe er um die Wand) versetzen ihn
        n.fk = 0; n.fw = null; n.x = (cx + .5) * T; n.y = (cy + .5) * T; let moved = 0; for (let i = 0; i < 30 * 4; i++) { const x0 = n.x; D.followStep(n, east, 135, 1 / 30, 4, true); if (Math.abs(n.x - x0) > 20) moved++; } out.moved = moved; return out; })()`);
      t.ok(!r.err, 'Aufbau: ' + JSON.stringify(r)); t.eq(r.jumps, 0, 'kurzes Haengen mit Fortschritt dazwischen versetzt nie: ' + JSON.stringify(r)); t.ok(r.moved >= 1, 'Gegenprobe: 4 s am Stueck ohne Fortschritt (ohne Wegsuche) versetzen ihn: ' + JSON.stringify(r));
    },
  },
];
