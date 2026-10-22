// Alt-Neu-Vergleich: beweist, dass ein Umbau das Spielverhalten nicht veraendert hat.
// Aufruf: node altneu.js <alter Projektordner> [<neuer Projektordner>] [schnell]     (Standard fuer neu: dieser Projektordner)
// Alten Stand bereitstellen, ohne den Arbeitsordner anzufassen:  mkdir /tmp/holdup-alt && git archive HEAD | tar -x -C /tmp/holdup-alt
// Beide Staende spielen mit festem Zufallsstrom (Math.random) dieselben Laeufe und schreiben Zustandsauszuege, die Zeichen fuer Zeichen gleich sein muessen:
//  1. Spielablauf je Karte (Bank klassisch und Zufallskarten, Juwelier, Tankstelle, Museum, Casino, Transporter): Alarm, Polizeianfahrt, Aussteigen, Fluchtwagen, Flucht,
//     alle 15 Schritte Wagen (Platz, Zustand, Position, Winkel), Beamte (Position, Modus), Fluchtwagen, Beute.
//     Beide Staende spielen die Basiskarte (dbg.setTurn('S'), seit Sprint 5 dazu CFG.map.tpW 0: Treffpunkt der Bank immer Ost): Seit Sprint 4 des Plans Mehr Abwechslung dreht layoutFor die handgebauten Karten aus dem Seed, der Vergleich beweist, dass die Basis und Bank und Transporter unveraendert sind.
//  2. Balance-Bot (tools/bot.js des jeweiligen Stands) mit mehreren Optionen (frueh rufen, warten, Barrikaden, Extras, die neuen Karten): Ergebnis, Zeit, Rest-HP, Beute, Wellen, Abschuesse je Lauf.
// Ausgabe IDENTISCH oder die erste abweichende Zeile. Ein Lauf dauert rund 30 Sekunden, mit `schnell` rund 10 (geprueft: eine einzige Pixelverschiebung beim Aussteigen der Beamten wird erkannt).
// Das Ende-Objekt wird ohne aw und pg verglichen (Auszeichnungen, Oktober 2026: neue Felder, kein Spielablauf).
// Nicht geprueft wird, was kein Zufallsstrom erreicht (Ton, Menues, Netz: dafuer die Tests in cases/). Aenderungen am Bot selbst zeigen sich als Abweichung, dann den Bot in beiden Staenden vergleichen.
process.env.HOLDUP_PORT = process.env.HOLDUP_PORT || '18830';
const fs = require('fs'), path = require('path');
const lib = require('./lib');
const args = process.argv.slice(2), quick = args.includes('schnell'), dirs = args.filter(a => a !== 'schnell');
if (!dirs.length) { console.log('Aufruf: node altneu.js <alter Projektordner> [<neuer Projektordner>] [schnell]'); process.exit(1); }
const ALT = path.resolve(dirs[0]), NEU = path.resolve(dirs[1] || lib.ROOT);

const CASES = [['bank', 'classic']];
for (const s of quick ? [5000] : [101, 777, 5000, 5017, 5034, 5051, 5068, 9001]) CASES.push(['bank', s]);
for (const s of quick ? [11] : [11, 12, 13, 14]) CASES.push(['jewel', s]);
for (const s of quick ? [21] : [21, 22, 23]) CASES.push(['gas', s]);
for (const s of quick ? [31] : [31, 32, 33]) CASES.push(['museum', s]);
for (const s of quick ? [41] : [41, 42, 43]) CASES.push(['casino', s]);
for (const s of quick ? [51] : [51, 52]) CASES.push(['truck', s]);

const BOT = [
  ['bank', 'classic', { sigma: .05, react: .35, call: 0, wait: [15, 4], kit: 'old' }, 3],
  ['bank', 'classic', { sigma: .05, react: .35, call: null, wait: [15, 4], kit: 'old' }, 2],
  ['bank', 'classic', { sigma: .05, react: .35, call: 0, wait: [15, 4], kit: 'old', bar: 'all' }, 2],
  ['bank', 'classic', { sigma: .05, react: .35, call: 0, extras: true, wait: [15, 4], kit: 'full' }, 2],
  ['bank', 5000, { sigma: .05, react: .35, call: 0, kit: 'old' }, 3],
  ['bank', 5017, { sigma: .05, react: .35, call: 0, kit: 'old', bar: 'noexit' }, 2],
  ['jewel', 11, { sigma: .05, react: .35, call: 0, kit: 'old' }, 2],
  ['gas', 21, { sigma: .05, react: .35, call: 0, kit: 'old', goods: true }, 2],
  ['museum', 31, { sigma: .05, react: .35, call: 0, kit: 'old', goods: true, goodsN: 2 }, 2],
  ['casino', 41, { sigma: .05, react: .35, call: 0, kit: 'old', goods: true, goodsN: 3 }, 2],
].slice(0, quick ? 3 : 10);

// Zufallsstrom wie in lib.openGame mit det:true, aber je Lauf mit eigenem Anfang
const SEEDED = 'let a=0x1234567^(typeof seed==="number"?seed:7);Math.random=()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};';

async function spielen(root) {
  const env = await lib.launch({ root }), out = [];
  const botSrc = fs.readFileSync(path.join(root, 'tools', 'bot.js'), 'utf8');
  for (const [sc, seed] of CASES) {
    const page = await lib.openGame(env);
    const res = await page.evaluate(new Function('args', 'const [sc,seed]=args;' + SEEDED + `
      const D = __dbg, lines = [], r1 = v => Math.round(v * 1000) / 1000;
      D.setScenario(sc); D.setSeedMode(typeof seed === 'number' ? 'random' : 'classic'); D.setLage([]); if (D.setTurn) D.setTurn('S'); D.CFG.map.tpW = 0; D.buildSeed(seed); D.startHeist(true);
      const L = D.LAY();
      for (let i = 0; i < 30 * 170; i++) {
        const G = D.get(), me = G.me;
        if (G.ended) { lines.push('ENDE ' + i + ' ' + JSON.stringify((({ aw, pg, ...e }) => e)(G.ended)).slice(0, 80)); break; }
        me.hp = 1e6; me.ar = 1e6;
        if (i === 30 * 12 && !G.vanCalled) D.callVan();
        if (G.vanArr && Math.abs(G.vanX - L.van.stop) <= 2 && me.x < L.exit.x + L.exit.dir * 40 && !me.out) { me.x = L.exit.x + L.exit.dir * 48; me.y = (L.exit.y0 + L.exit.y1) / 2; }
        D.update(1 / 30);
        if (i % 15 === 0) { const g = D.get(); lines.push(JSON.stringify({ i, tH: r1(g.tH), wv: g.waveN, van: [g.vanArr, g.vanCalled, g.vanX], sec: g.secured, esc: g.escaped, kills: g.kills,
          pcs: g.pcs.map(c => [c.id, c.side, c.slot, c.st, r1(c.x), r1(c.y), r1(c.a), c.crew.length]), en: g.en.slice(0, 40).map(e => [e.id, r1(e.x), r1(e.y), e.mode]), nen: g.en.length })); }
      }
      const G = D.get(); lines.push('Ende ' + JSON.stringify({ tH: G.tH, secured: G.secured, escaped: G.escaped, ended: G.ended && G.ended.win, vanX: G.vanX }));
      return lines;`), [sc, seed]);
    out.push('### Ablauf ' + sc + ' ' + seed + (page.errors.length ? ' FEHLER ' + page.errors.join(' | ') : ''), ...res);
    await page.ctx.close();
  }
  for (const [sc, seed, o, n] of BOT) {
    const page = await lib.openGame(env);
    await page.addScriptTag({ content: botSrc });
    const res = await page.evaluate(new Function('args', 'const [sc,seed,o,n]=args;' + SEEDED + `
      const D = __dbg; D.setScenario(sc); D.setSeedMode(typeof seed === 'number' ? 'random' : 'classic'); D.setLage([]); if (D.setTurn) D.setTurn('S'); D.CFG.map.tpW = 0; D.buildSeed(seed);
      const rs = []; for (let i = 0; i < n; i++) { const r = bot.run(Object.assign({}, o)); rs.push(r.res + '@' + r.t + ' hp' + r.minHp + ' loot' + r.loot + ' w' + r.waves + ' k' + r.kills); }
      return rs;`), [sc, seed, o, n]);
    out.push('### Bot ' + sc + ' ' + seed + ' ' + JSON.stringify(o) + (page.errors.length ? ' FEHLER ' + page.errors.join(' | ') : ''), ...res);
    await page.ctx.close();
  }
  await Promise.race([env.browser.close(), new Promise(r => setTimeout(r, 5000))]);
  env.srv.close();
  return out;
}

(async () => {
  console.log('alt: ' + ALT + '\nneu: ' + NEU + (quick ? ' (schnell)' : ''));
  const t0 = Date.now(), a = await spielen(ALT), b = await spielen(NEU);
  let diff = -1; for (let i = 0; i < Math.max(a.length, b.length); i++) if (a[i] !== b[i]) { diff = i; break; }
  if (diff < 0) console.log('IDENTISCH (' + a.length + ' Zeilen, ' + ((Date.now() - t0) / 1000).toFixed(0) + ' s)');
  else {
    let head = ''; for (let i = diff; i >= 0; i--) if ((a[i] || '').startsWith('###')) { head = a[i]; break; }
    console.log('ABWEICHUNG in Zeile ' + (diff + 1) + ' (' + head + ')\n alt: ' + String(a[diff]).slice(0, 400) + '\n neu: ' + String(b[diff]).slice(0, 400));
  }
  process.exit(diff < 0 ? 0 : 1);
})().catch(e => { console.error(e); process.exit(2); });
