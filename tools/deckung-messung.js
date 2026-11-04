// Messung: Transporter-Bot mit und ohne Deckungs-KI der Besatzung (Ticket 14, CFG.truck.cov.on 1 gegen 0), gleiche Seeds. Aufruf: node tools/deckung-messung.js [Seeds, Standard 60] [ab Seed, Standard 3000]
// Je Einstellung zwei Reihen: ohne Polizei (misst nur die Besatzung) und mit Polizei. Ausgabe: Siegquote, Quote gestoppter Wagen, Dauer bis zum Sieg, Rest-HP, Beute.
const fs = require('fs'), path = require('path');
const { launch, openGame } = require('../tests/lib.js');
const N = +(process.argv[2] || 60), FROM = +(process.argv[3] || 3000);
(async () => {
  const env = await launch(); const page = await openGame(env);
  await page.addScriptTag({ content: fs.readFileSync(path.join(__dirname, 'bot.js'), 'utf8') });
  for (const on of [0, 1]) for (const police of [false, true]) {
    const r = await page.evaluate(([on, police, N, FROM]) => { __dbg.CFG.truck.cov.on = on; return bot.truckBatch(N, { kit: 'full', sigma: .05, react: .35, police }, FROM).all; }, [on, police, N, FROM]);
    console.log('cov.on ' + on + ', Polizei ' + (police ? 'ja  ' : 'nein') + ': ' + JSON.stringify(r));
  }
  await env.browser.close(); env.srv.close();
})();
