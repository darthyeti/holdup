// P3 (docs/bugfix-plaene.md): Lage-Tags im Erkunden-HUD gehen nicht mehr verloren. Vorher fuellte lageLines hoechstens zwei Zeilen zu 28 Zeichen und verwarf jeden weiteren Tag ohne Hinweis (Bank 38,5 % der Seeds,
// Juwelier 6,3 %, Casino 5,3 %, Museum 3,5 %, Tankstelle 1,6 %). Jetzt bricht lageLines bis zu CFG.hud.lageLines (4) Zeilen zu CFG.hud.lageW (28) Zeichen um, der Kasten waechst mit, und brauchen die Tags mehr als vier
// Zeilen, endet Zeile 4 mit "+N weitere" (N = Zahl der nicht gezeigten Tags). Gemessen wird am gezeichneten HUD (fillText und fillRect des Canvas abgefangen), nicht an lageLines selbst.
const CAP = `(() => {
  const ctx = document.querySelector('canvas').getContext('2d'), oT = ctx.fillText, oR = ctx.fillRect, texts = [], rects = [];
  ctx.fillText = function (s, x, y) { texts.push({ s: String(s), x, y }); return oT.apply(this, arguments); };
  ctx.fillRect = function (x, y, w, h) { rects.push({ x, y, w, h }); return oR.apply(this, arguments); };
  return { texts, rects, stop() { ctx.fillText = oT; ctx.fillRect = oR; } };
})()`;
// Die Lage-Zeilen stehen bei x 62, ab y 141 (66 + 5 Zeilen mal 15) und innerhalb des Kastens (das Rechteck bei (10, 10) mit Breite 250, darunter folgt die Zielzeile)
const READ = `(D) => { const c = ${CAP}; try { D.draw(); } finally { c.stop(); } const box = c.rects.find(r => r.x === 10 && r.y === 10 && r.w === 250), lines = c.texts.filter(q => q.x === 62 && q.y >= 141 && box && q.y < 10 + box.h).map(q => q.s); return { lines, h: box && box.h, all: c.texts.map(q => q.s).join('\\n') }; }`;

module.exports = [
  {
    name: 'Lage-Tags: Bank Seed 798 (sieben Tags, fuenf Zeilen noetig) zeigt vier Zeilen mit "+3 weitere", keine Zeile ist laenger als 28 Zeichen, der Kasten waechst mit (152 + 14 je weitere Zeile); ein Seed mit vier Zeilen zeigt alles',
    async run(t) {
      const r = await t.page.evaluate(`(() => { const D = __dbg, read = ${READ}; D.setScenario('bank'); D.setSeedMode('random'); D.setLage([]); D.buildSeed(798);
        const tags = D.LAY().mission.tags.slice(), o = read(D), out = { tags, phase: D.get().phase, cfg: D.CFG.hud, lines: o.lines, h: o.h };
        // ein Bank-Seed, dessen Tags genau vier Zeilen fuellen (alle zu sehen, kein Hinweis)
        for (let s = 1; s < 3000; s++) { if (D.layoutFor(s).mission.tags.length < 5) continue; D.buildSeed(s); const q = read(D), tg = D.LAY().mission.tags.slice(); if (q.lines.length === 4 && !/weitere/.test(q.lines.join(' ')) && tg.every(g => q.lines.join(', ').includes(g))) { out.vier = { seed: s, lines: q.lines, h: q.h }; break; } }
        return out; })()`);
      t.eq(r.phase, 1, 'Erkunden');
      t.eq(r.cfg, { lageLines: 4, lageW: 28 }, 'CFG.hud');
      t.eq(r.tags.length, 7, 'der Seed hat sieben Tags: ' + JSON.stringify(r.tags));
      t.eq(r.lines, ['Streife in der Nähe', 'Geldtransport', 'Tresor nur laut, zwei Wachen', '+3 weitere'], 'vier Zeilen, die letzte mit dem Hinweis (vorher fehlten vier Tags ohne jeden Hinweis)');
      t.eq(r.h, 152 + 14 * 3, 'der Kasten waechst mit den Zeilen');
      t.ok(r.vier && r.vier.lines.every(l => l.length <= 28) && r.vier.h === 152 + 14 * 3, 'ein Seed mit vier vollen Zeilen zeigt alle Tags in Kasten und Zeilenbreite: ' + JSON.stringify(r.vier));
    },
  },
  {
    name: 'Lage-Tags: in allen Szenarien (je bis zu 60 Seeds mit mindestens fuenf Tags) steht jeder Tag im HUD oder die Zeile 4 endet mit "+N weitere" und gezeigte Tags plus N ergeben die Gesamtzahl',
    timeout: 280000,
    async run(t) {
      const r = await t.page.evaluate(`(() => { const D = __dbg, read = ${READ}, out = { n: 0, ueber: 0, bad: [], maxLines: 0 };
        for (const sc of ['bank', 'jewel', 'gas', 'museum', 'casino']) {
          D.setScenario(sc); D.setSeedMode('random'); D.setLage([]); D.setTurn('S');
          const seeds = []; for (let s = 1; s < 3000 && seeds.length < 60; s++) if (D.layoutFor(s).mission.tags.length >= 5) seeds.push(s);
          for (const s of seeds) {
            D.buildSeed(s); const tags = D.LAY().mission.tags.slice(), o = read(D), txt = o.lines.join(', '), shown = tags.filter(g => txt.includes(g)).length, m = /\\+(\\d+) weitere/.exec(o.lines[o.lines.length - 1] || ''); out.n++; out.maxLines = Math.max(out.maxLines, o.lines.length);
            const tag = sc + '#' + s + ' ' + JSON.stringify(o.lines);
            if (o.lines.length > 4) out.bad.push(tag + ' mehr als vier Zeilen');
            if (o.lines.some(l => l.length > 28)) out.bad.push(tag + ' Zeile ueber 28 Zeichen');
            if (o.h !== 152 + 14 * (o.lines.length - 1)) out.bad.push(tag + ' Kastenhoehe ' + o.h);
            if (shown === tags.length) { if (m) out.bad.push(tag + ' Hinweis trotz voller Liste'); }
            else { out.ueber++; if (!m || shown + +m[1] !== tags.length) out.bad.push(tag + ' fehlende Tags ohne richtigen Hinweis (gezeigt ' + shown + ' von ' + tags.length + ')'); }
          }
        }
        D.setTurn(null); return out; })()`);
      t.note(r.n + ' Karten, davon mit Hinweis +N weitere: ' + r.ueber + ', hoechstens ' + r.maxLines + ' Zeilen');
      t.eq(r.bad.slice(0, 8), [], 'Abweichungen (' + r.bad.length + ')');
      t.ok(r.n >= 100, 'genug Karten mit vielen Tags: ' + r.n);
    },
  },
  {
    name: 'Lage-Tags: Ueberlauf erzwungen (12 Tags): genau vier Zeilen, die letzte endet mit "+5 weitere", der Kasten ist 194 hoch, ein einzelner Tag ueber der Zeilenbreite steht allein in seiner Zeile, der Transporter bleibt unveraendert',
    async run(t) {
      const r = await t.page.evaluate(`(() => { const D = __dbg, read = ${READ}, out = {}; D.setScenario('bank'); D.setSeedMode('random'); D.setLage([]); D.buildSeed(798);
        const M = D.LAY().mission, setTags = a => { M.tags = a; delete M._l; };
        setTags(Array.from({ length: 12 }, (_, i) => 'Lagetag Nr ' + String(i + 1).padStart(2, '0'))); const a = read(D); out.zwoelf = { lines: a.lines, h: a.h };
        setTags(['Kurz', 'Ein sehr langer einzelner Lagetag mit vielen Zeichen', 'Noch einer']); const b = read(D); out.lang = b.lines;
        setTags([]); out.leer = read(D).lines;
        D.setScenario('truck'); D.setSeedMode('random'); D.setLage([]); D.buildSeed(321); const tt = D.LAY().mission.tags.slice(), c = read(D); out.truck = { n: tt.length, alle: tt.every(g => c.all.includes(g)) };
        return out; })()`);
      t.eq(r.zwoelf.lines, ['Lagetag Nr 01, Lagetag Nr 02', 'Lagetag Nr 03, Lagetag Nr 04', 'Lagetag Nr 05, Lagetag Nr 06', 'Lagetag Nr 07, +5 weitere'], 'vier Zeilen, Hinweis mit der richtigen Zahl');
      t.eq(r.zwoelf.h, 152 + 14 * 3, 'Kasten fuer vier Zeilen');
      t.eq(r.lang, ['Kurz', 'Ein sehr langer einzelner Lagetag mit vielen Zeichen', 'Noch einer'], 'ein langer Tag steht allein in seiner Zeile');
      t.eq(r.leer, ['Standard'], 'ohne Tags steht Standard');
      t.ok(r.truck.n >= 1 && r.truck.alle, 'Transporter zeigt alle seine Tags: ' + JSON.stringify(r.truck));
    },
  },
];
