// Grafik A2 (Ticket #119, Studie O5 und O6): bleibende Spuren in dcv (Einschuss, Blut, Glas, Russ, Huelsen) mit Obergrenze je Stufe, nach dem Auftrag weg, im Coop ueber die vorhandenen Ereignisse
// auch beim Client; Wucht (Kamerawackeln, roter Rand, Zucken, Rueckstoss) mit Schaltern Wackeln und Blut; die Simulation bleibt gleich (nur Zeichnen).
// Die Tests laufen auf niedrig (tests/lib.js), die Spuren brauchen mittel: GFX.set('mittel') und am Ende zurueck.
async function setup(t) {
  await t.loadTool('loopnet.js');
  await t.loadInpage('coop.js');
}
const AT = `(A) => { const m = A.get().me; return [m.x + 300, m.y]; }`;

module.exports = [
  {
    name: 'Spuren: Einschuss, Blut, Glas und Russ entstehen bei den Ereignissen und veraendern dcv, niedrig malt nur Einschuss und Huelsen',
    async run(t) {
      await setup(t);
      const r = await t.page.evaluate(`(() => { const AT = ${AT}, G = CT.mkGame('bank', 5017, 1), A = G.A, o = {}; GFX.set('mittel'); A.reset();
        const [x, y] = AT(A), h0 = A.trHash(); o.t0 = A.tr();
        A.evt('hw', [x, y]); o.hw = [A.tr().h, A.trHash() !== h0]; let h = A.trHash();
        A.evt('hf', [x + 20, y, 5]); o.hf = [A.tr().b, A.trHash() !== h]; h = A.trHash();
        A.evt('gl', [x + 40, y]); o.gl = [A.tr().g, A.trHash() !== h]; h = A.trHash();
        A.evt('bx', [x + 80, y, 90, 1]); o.bx = [A.tr().s, A.trHash() !== h];
        GFX.set('niedrig'); A.reset(); A.evt('hw', [x, y]); A.evt('hf', [x + 20, y, 5]); A.evt('gl', [x + 40, y]); A.evt('bx', [x + 80, y, 90, 1]); o.low = A.tr();
        GFX.set('niedrig'); return o; })()`);
      t.eq(r.t0, { h: 0, c: 0, b: 0, g: 0, s: 0 }, 'zu Beginn keine Spuren');
      t.eq(r.hw, [1, true], 'Einschuss'); t.eq(r.hf, [1, true], 'Blutlache'); t.eq(r.gl, [1, true], 'Glassplitter'); t.eq(r.bx, [1, true], 'Russfahne');
      t.eq(r.low, { h: 1, c: 0, b: 0, g: 0, s: 0 }, 'niedrig: nur der Einschuss');
    },
  },
  {
    name: 'Spuren: Obergrenze je Stufe, danach keine neuen Abziehbilder; der neue Auftrag (reset) leert alles',
    async run(t) {
      await setup(t);
      const r = await t.page.evaluate(`(() => { const AT = ${AT}, G = CT.mkGame('bank', 5017, 1), A = G.A, o = {}; GFX.set('mittel'); A.reset();
        const [x, y] = AT(A), blank = A.trHash();
        for (let i = 0; i < 900; i++) { A.evt('hw', [x + (i % 40), y + ((i / 40) | 0)]); A.evt('hf', [x + (i % 30), y + 60 + ((i / 30) | 0), 5]); A.evt('gl', [x + (i % 20), y + 120 + ((i / 20) | 0)]); if (i % 10 === 0) A.evt('bx', [x + i, y + 200, 90, 1]); }
        o.n = A.tr(); const full = A.trHash(); A.evt('hf', [x + 1, y + 300, 5]); o.same = A.trHash() === full; o.full = full !== blank;
        A.reset(); o.after = [A.tr(), A.trHash() === blank];
        GFX.set('hoch'); for (let i = 0; i < 900; i++) A.evt('hf', [x + i, y + 400, 5]); o.hoch = A.tr().b; GFX.set('niedrig'); return o; })()`);
      t.eq([r.n.h, r.n.b, r.n.g, r.n.s], [300, 120, 60, 20], 'mittel: Obergrenzen erreicht und nicht ueberschritten');
      t.ok(r.full && r.same, 'ueber der Grenze malt nichts mehr'); t.eq(r.after[0], { h: 0, c: 0, b: 0, g: 0, s: 0 }, 'reset setzt die Zaehler zurueck'); t.ok(r.after[1], 'dcv ist nach dem neuen Auftrag leer'); t.eq(r.hoch, 260, 'hoch: mehr Blut erlaubt');
    },
  },
  {
    name: 'Spuren: im Coop sieht der Client dieselben Spuren wie der Host (gleiches Bild von dcv), Blut aus malt keine Lachen',
    async run(t) {
      await setup(t);
      const r = await t.page.evaluate(`(() => { const AT = ${AT}, o = {}; GFX.set('mittel'); const G = CT.mkGame('bank', 5017, 2), A = G.A, B = G.clients[0]; A.reset(); B.reset(); G.run(.3);
        const [x, y] = AT(A), h0 = [A.trHash(), B.trHash()]; A.evt('hf', [x, y, 5]); A.evt('hw', [x + 30, y]); A.evt('gl', [x + 60, y]); A.evt('bx', [x + 100, y, 90, 1]); G.run(.3);
        o.tr = [A.tr(), B.tr()]; o.hash = [A.trHash() === B.trHash(), A.trHash() !== h0[0], B.trHash() !== h0[1]];
        FXO.set('blood', false); const b0 = B.tr().b; A.evt('hf', [x, y + 100, 5]); G.run(.3); o.blutAus = [A.tr().b, B.tr().b - b0]; FXO.set('blood', true); GFX.set('niedrig'); return o; })()`);
      t.eq(r.tr[0], r.tr[1], 'gleiche Zaehler'); t.eq(r.tr[1], { h: 1, c: r.tr[1].c, b: 1, g: 1, s: 1 }, 'der Client malt alle vier Spuren: ' + JSON.stringify(r.tr[1]));
      t.eq(r.hash, [true, true, true], 'dcv von Host und Client ist pixelgleich'); t.eq(r.blutAus, [1, 0], 'Blut aus: keine neue Lache (Host-Zaehler bleibt, Client ebenso)');
    },
  },
  {
    name: 'Wucht: Wackeln bei eigenem Schuss, staerker bei eigenem Treffer und bei Schaden, klingt ab; Schalter Wackeln aus haelt die Kamera ruhig; roter Rand bei Schaden',
    async run(t) {
      await setup(t);
      const r = await t.page.evaluate(`(() => { const G = CT.mkGame('bank', 5017, 1), A = G.A, o = {}, m = A.get().me; GFX.set('mittel'); A.reset();
        A.evt('sh', [m.id, m.x, m.y, 0]); o.schuss = A.kick(); A.evt('hf', [m.x + 200, m.y, 5, 0, 0]); o.fremd = A.kick();
        A.evt('hf', [m.x + 200, m.y, 5, m.id + 1, 0]); o.treffer = A.kick();
        for (let i = 0; i < 12; i++) A.update(1 / 30); o.ab = A.kick();
        A.update(1 / 30); const me = A.get().me; me.hp -= 20; A.update(1 / 30); o.schaden = [A.kick(), A.dmgV() > 0];
        o.off = []; for (let i = 0; i < 20; i++) { const k = A.kickOff(); o.off.push(k ? Math.abs(k[0]) + Math.abs(k[1]) : -1); }
        FXO.set('shake', false); o.aus = A.kickOff(); FXO.set('shake', true); GFX.set('niedrig'); return o; })()`);
      t.ok(r.schuss.a > 0 && r.schuss.t > 0, 'Schuss wackelt klein: ' + JSON.stringify(r.schuss));
      t.ok(r.fremd.a === r.schuss.a, 'Treffer eines anderen Spielers wackelt nicht staerker'); t.ok(r.treffer.a > r.schuss.a, 'eigener Treffer staerker: ' + JSON.stringify(r.treffer));
      t.ok(r.ab.t <= 0, 'klingt ab'); t.ok(r.schaden[0].a > r.treffer.a && r.schaden[1], 'Schaden am Spieler: staerkstes Wackeln und roter Rand: ' + JSON.stringify(r.schaden));
      t.ok(r.off.some(v => v > 0), 'die Kamera verschiebt sich'); t.eq(r.aus, null, 'Wackeln aus: keine Verschiebung');
    },
  },
  {
    name: 'Wucht: Gegner zucken in Trefferrichtung und kehren zurueck, Mündungsfeuer wechselt die Variante, Schalter wirken auf die Optionsseite (Kacheln shake und blood)',
    async run(t) {
      await setup(t); await t.loadInpage('menu.js');
      const r = await t.page.evaluate(`(() => { const G = CT.mkGame('bank', 5017, 1), A = G.A, o = {}, m = A.get().me; GFX.set('mittel'); A.reset(); const e = A.mkCop(m.x + 60, m.y, false); A.get().en.push(e); A.evt('hf', [e.x, e.y, 5, m.id + 1, 0]); const w = A.tw(); o.tw = w.length ? [w[0].k, w[0].id === e.id, w[0].dx > 0, Math.abs(w[0].dy) < 1e-6] : null;
        for (let i = 0; i < 10; i++) A.update(1 / 30); o.back = A.tw().length;
        const v = new Set(); for (let i = 0; i < 6; i++) { A.evt('sh', [m.id, m.x, m.y, 0]); v.add(A.get().me.fv); } o.var = v.size;
        const d = MT.solo(null, 's'); d.sessReset(); MT.k(d, 'o'); o.tiles = [!!MT.tile(d, 'shake'), !!MT.tile(d, 'blood')];
        FXO.set('shake', true); FXO.set('blood', true); MT.click(d, 'shake'); MT.click(d, 'blood'); o.sw = [FXO.shake, FXO.blood, localStorage.getItem('holdup.shake'), localStorage.getItem('holdup.blood')];
        MT.click(d, 'shake'); MT.click(d, 'blood'); o.back2 = [FXO.shake, FXO.blood];
        o.inside = d.ui().tiles().filter(q => !(q.x >= 0 && q.y >= 0 && q.x + q.w <= 960 && q.y + q.h <= 544)).map(q => [q.id, q.x, q.y, q.w, q.h].join()); GFX.set('niedrig'); return o; })()`);
      t.eq(r.tw, ['e', true, true, true], 'Gegner zuckt in Schussrichtung'); t.eq(r.back, 0, 'Zucken ist nach kurzer Zeit vorbei');
      t.ok(r.var >= 2, 'Muendungsfeuer in Varianten: ' + r.var); t.eq(r.tiles, [true, true], 'Kacheln Wackeln und Blut in den Optionen');
      t.eq(r.sw, [false, false, '0', '0'], 'Klick schaltet aus und speichert'); t.eq(r.back2, [true, true], 'zweiter Klick schaltet an'); t.eq(r.inside, [], 'alle Kacheln im Bild');
    },
  },
  {
    name: 'Simulation bleibt gleich: gleicher Seed, gleiche Schritte mit Feuergefecht, mit mittel plus Wackeln und Blut gegen niedrig ohne beides gleicher Zustand',
    async run(t) {
      await setup(t);
      // jede Messung in einer frischen Seite (globaler Zustand verschiebt Spiele in derselben Seite) mit festem Zufall und ohne die eigene Schleife der Seite (sie zoege im Takt der Uhr aus demselben Zufallsstrom)
      const run = async (mode) => { await t.page.reload(); await t.page.waitForFunction(() => window.__dbg && window.__dbg.get && window.__dbg.get().players, null, { timeout: 30000 }); await t.loadTool('loopnet.js'); await t.loadInpage('coop.js');
        await t.page.evaluate(() => { window.requestAnimationFrame = () => 0; }); await t.page.waitForTimeout(150); // die Schleife der Seite selbst zieht sonst im Takt der Uhr aus demselben Zufallsstrom
        return t.page.evaluate(`(() => { for (const k of Object.keys(SND)) if (typeof SND[k] === 'function') SND[k] = () => 0; GFX.set('${mode[0]}'); FXO.set('shake', ${mode[1]}); FXO.set('blood', ${mode[2]}); let s = 12345; Math.random = () => { s = (s + 0x6D2B79F5) | 0; let z = Math.imul(s ^ s >>> 15, 1 | s); z = z + Math.imul(z ^ z >>> 7, 61 | z) ^ z; return ((z ^ z >>> 14) >>> 0) / 4294967296; };
        const G = CT.mkGame('bank', 5017, 1), A = G.A, m = A.get().me; for (let k = 0; k < 3; k++) A.get().en.push(A.mkCop(m.x + 120 + k * 40, m.y + (k - 1) * 30, false)); A.startHeist(true); A.setFocus(true); m.armed = true; m.mag = 99; m.res = 99; A.keys[' '] = true; const d = [];
        for (let i = 0; i < 30 * 12; i++) { const e = A.get().en.find(q => q.hp > 0); if (e) { const c = A.cam(); A.mouse.sx = e.x - c[0]; A.mouse.sy = e.y - c[1]; A.mouse.x = e.x; A.mouse.y = e.y; A.mouse.t = A.get().time; } A.update(1 / 30); if (i % 5 === 0) A.draw(); if (i % 60 === 59) { const g = A.get(); d.push([g.me.x | 0, g.me.y | 0, Math.ceil(g.me.hp), g.en.length, g.en.map(q => Math.ceil(q.hp) + ':' + (q.x | 0) + ',' + (q.y | 0)).join('|'), g.kills]); } }
        A.keys[' '] = false; return { d, tr: A.tr() }; })()`); };
      const a = await run(['mittel', true, true]), b = await run(['niedrig', false, false]), c = await run(['niedrig', false, false]);
      t.eq(b.d, c.d, 'Vorbedingung: derselbe Lauf zweimal gleich (fester Zufall)');
      t.ok(a.d.length === 6 && a.d.some(x => x[3] > 0), 'das Feuergefecht lief (Gegner da): ' + JSON.stringify(a.d.slice(0, 3)));
      t.eq(a.d, b.d, 'Zustand nach jedem Zeitabschnitt gleich');
      t.ok(a.tr.h + a.tr.b + a.tr.c > 0, 'mit Effekten entstanden Spuren: ' + JSON.stringify(a.tr)); t.eq(b.tr.b + b.tr.g + b.tr.s, 0, 'ohne Effekte keine Blut-, Glas- und Russspuren');
    },
  },
  {
    name: 'Spuren, Gegenprobe: mittel mit Explosion und Welle laeuft ohne JS-Fehler, der Spielzustand zaehlt Spuren nur im Zeichnen (kein Eintrag im Schnappschuss)',
    async run(t) {
      await setup(t);
      const errs = []; t.page.on('pageerror', e => errs.push(String(e)));
      const r = await t.page.evaluate(`(() => { GFX.set('mittel'); const G = CT.mkGame('bank', 5017, 2), A = G.A, B = G.clients[0], m = A.get().me, o = {}; A.spawnWave();
        A.blastAt(m.x + 250, m.y, A.CFG.pol.car, 0, 1); A.evt('gl', [m.x + 100, m.y]);
        for (let i = 0; i < 30 * 6; i++) { G.run(1 / 30); if (i % 4 === 0) { A.draw(); B.draw(); } }
        o.snap = JSON.stringify(A.buildSnap(B.get().me.id)).length; o.tr = [A.tr(), B.tr()]; GFX.set('niedrig'); return o; })()`);
      t.eq(errs, [], 'keine JS-Fehler'); t.ok(r.tr[0].s >= 1 && r.tr[1].s >= 1, 'Russ bei Host und Client: ' + JSON.stringify(r.tr)); t.ok(r.snap < 16300, 'Schnappschuss unter der Nachrichtengrenze: ' + r.snap);
    },
  },
];
