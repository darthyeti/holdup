// Draufsicht einer Karte als PNG (statische Ebene, Objektebene, dazu Wachrouten, Kameras, Beute, Laser, Zapfsaeulen), zum Ansehen neuer Grundrisse.
// Aufruf: node render.js <szenario> <seed oder Grundrissname> [<Seite>] [<szenario> <seed oder Name> [<Seite>] ...]
//   node render.js casino Reihen museum Kabinette gas 5
// Seite (N, E, W, S, mit + dahinter auch laengs der Strasse gespiegelt) legt die Strasse mit turnLayout auf eine andere Seite: node render.js jewel 5 E jewel 5 W+
// Mit einem Namen (zum Beispiel Reihen, Ring, Insel, Klassik) nimmt es den ersten Seed, dessen LAY.hall so heisst. Ausgabe nach $HOLDUP_OUT (Standard: <Temp-Ordner>/holdup-render).
// Farben: Wachen rot, gelb, gruen, tuerkis (je Route, dicker Punkt = Start), Wachwechsel magenta, Manager orange, Kameras rosa, Beute tuerkis umrandet, Laser rot, Zapfsaeulen orange, parkende Autos (echte Wagen, LAY.decorReal) gelborange umrandet, Spielerstart weiss.
const fs = require('fs'), path = require('path'), os = require('os');
const { launch, openGame, loadInpage } = require('./lib');
const OUT = process.env.HOLDUP_OUT || path.join(os.tmpdir(), 'holdup-render');

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const args = process.argv.slice(2), jobs = [];
  for (let i = 0; i + 1 < args.length;) { const j = [args[i], args[i + 1], null]; i += 2; if (/^[NSEW]\+?$/.test(args[i] || '')) j[2] = args[i++]; jobs.push(j); }
  if (!jobs.length) { console.log('Aufruf: node render.js <szenario> <seed oder Grundrissname> ...'); process.exit(1); }
  const env = await launch(), page = await openGame(env); await loadInpage(page, 'render.js');
  for (const [sc, sd, turn] of jobs) {
    const r = await page.evaluate(([sc, sd, turn]) => { const q = RN.draw(sc, sd, turn); return q.err ? q : { png: q.c.toDataURL('image/png'), seed: q.seed, hall: q.hall }; }, [sc, sd, turn]);
    if (r.err) { console.log(r.err); continue; }
    const f = path.join(OUT, sc + '_' + r.seed + '_' + r.hall.replace(/[^A-Za-z0-9]/g, '') + (turn ? '_' + turn.replace('+', 'p') : '') + '.png');
    fs.writeFileSync(f, Buffer.from(r.png.split(',')[1], 'base64')); console.log(f);
  }
  if (page.errors.length) console.log('Fehler im Spiel:', page.errors);
  await Promise.race([page.ctx.close(), new Promise(r => setTimeout(r, 5000))]);
  await Promise.race([env.browser.close(), new Promise(r => setTimeout(r, 5000))]);
  env.srv.close(); process.exit(0);
})();
