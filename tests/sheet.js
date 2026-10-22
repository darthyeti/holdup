// Kontaktbogen: eine Karte in allen acht Lagen (Strasse im Sueden, Norden, Osten, Westen, jeweils auch laengs gespiegelt) auf einem Bild, zum Ansehen vor und nach Aenderungen an turnLayout oder der Kartenerzeugung.
// Aufruf: node sheet.js <szenario> <seed oder Grundrissname> [<seed oder Name> ...]
//   node sheet.js jewel Klassik Ring gas 5     (je Argument ein Bild, ein Szenario-Wort davor schaltet um)
// Je Lage zeichnet RN.draw (inpage/render.js) die Draufsicht wie render.js. Ausgabe nach $HOLDUP_OUT (Standard: <Temp-Ordner>/holdup-render) als sheet_<szenario>_<seed>_<halle>.png.
// Reihenfolge: oben die Lagen mit waagerechter Strasse (S, N, S+, N+), unten die mit senkrechter (E, W, E+, W+), + = laengs der Strasse gespiegelt.
// Worauf achten: nichts in Tueren, Fahrbahn oder auf dem Zaun, nichts schwebt, Schrift und Sprites stehen richtig herum, Wagenplaetze (blau) und Fluchtzone (gruen) liegen auf der Strasse, Posten (rot) sehen zum Gebaeude.
const fs = require('fs'), path = require('path'), os = require('os');
const { launch, openGame, loadInpage } = require('./lib');
const OUT = process.env.HOLDUP_OUT || path.join(os.tmpdir(), 'holdup-render');
const SC = ['bank', 'truck', 'jewel', 'gas', 'museum', 'casino'];

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const jobs = []; let sc = null;
  for (const a of process.argv.slice(2)) { if (SC.includes(a)) sc = a; else if (sc) jobs.push([sc, a]); }
  if (!jobs.length) { console.log('Aufruf: node sheet.js <szenario> <seed oder Grundrissname> [...]'); process.exit(1); }
  const env = await launch(), page = await openGame(env); await loadInpage(page, 'render.js');
  for (const [sc, sd] of jobs) {
    const r = await page.evaluate(([sc, sd]) => {
      // Reihe 1: Strasse waagerecht (S, N, S+, N+), Reihe 2: Strasse senkrecht (E, W, E+, W+), jede Reihe mit eigener Zellgroesse
      const ROWS = [['S', 'N', 'S+', 'N+'], ['E', 'W', 'E+', 'W+']], W = 2800, cw = W / 4, rows = [];
      let seed = null, hall = '';
      for (const names of ROWS) {
        const cs = [];
        for (const s of names) { const q = RN.draw(sc, sd, s === 'S' ? null : s); if (q.err) return q; cs.push(q.c); seed = q.seed; hall = q.hall; }
        const mw = Math.max(...cs.map(c => c.width)), mh = Math.max(...cs.map(c => c.height)), k = Math.min(1, (cw - 8) / mw, 900 / mh);
        rows.push({ cs, k, ch: Math.round(mh * k) + 8 });
      }
      const sh = document.createElement('canvas'); sh.width = W; sh.height = 36 + rows[0].ch + rows[1].ch; const x = sh.getContext('2d');
      x.fillStyle = '#20242b'; x.fillRect(0, 0, sh.width, sh.height);
      x.fillStyle = '#fff'; x.font = 'bold 22px sans-serif'; x.fillText(sc + ' #' + seed + ' ' + hall + ': oben S N S+ N+, unten E W E+ W+ (+ = laengs der Strasse gespiegelt)', 10, 25);
      let y0 = 36;
      for (const { cs, k, ch } of rows) { cs.forEach((c, i) => { const w = Math.round(c.width * k), h = Math.round(c.height * k); x.drawImage(c, i * cw + 4 + (cw - 8 - w) / 2, y0 + 4 + (ch - 8 - h) / 2, w, h); }); y0 += ch; }
      return { png: sh.toDataURL('image/png'), seed, hall };
    }, [sc, sd]);
    if (r.err) { console.log(r.err); continue; }
    const f = path.join(OUT, 'sheet_' + sc + '_' + r.seed + '_' + r.hall.replace(/[^A-Za-z0-9]/g, '') + '.png');
    fs.writeFileSync(f, Buffer.from(r.png.split(',')[1], 'base64')); console.log(f);
  }
  if (page.errors.length) console.log('Fehler im Spiel:', page.errors);
  await Promise.race([page.ctx.close(), new Promise(r => setTimeout(r, 5000))]);
  await Promise.race([env.browser.close(), new Promise(r => setTimeout(r, 5000))]);
  env.srv.close(); process.exit(0);
})();
