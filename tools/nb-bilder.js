// Bilder der Notenbank-Maschinen im Spiel (dynamische Teile eingeschlossen) fuer die Optikpruefung (Ticket 65 und 66).
// Aufruf: HOLDUP_CHROME=... node tools/nb-bilder.js <Zielordner> <Praefix> [bohrer|presse|alle]
// Schreibt <Zielordner>/<Praefix>-<szene>.png (Ausschnitt um die Maschine, Spiel-Canvas, 2x). Szenen: bohrer-aus, bohrer-halb, bohrer-steht, bohrer-loch, presse-aus, presse-laeuft, presse-voll, abgabe.
const fs = require('fs'), path = require('path');
const { launch, openGame } = require('../tests/lib');
(async () => {
  const out = process.argv[2] || 'docs/bilder', pre = process.argv[3] || 'bild', which = process.argv[4] || 'alle';
  fs.mkdirSync(out, { recursive: true });
  const env = await launch(), page = await openGame(env);
  const scenes = {
    'bohrer-aus': '', 'bohrer-halb': 'D.nbd().st=1;D.nbd().p=.5;', 'bohrer-steht': 'D.nbd().st=2;D.nbd().c=1;D.nbd().p=.4;', 'bohrer-loch': 'D.nbHole(true);D.nbd().st=3;D.nbd().p=1;',
    'presse-aus': '', 'presse-raum': 'D.nbp().st=1;D.nbp().paper=.6;D.nbp().n=3;D.nbp().m=0b000101;D.nbp().dv=15000;', 'presse-laeuft': 'D.nbp().st=1;D.nbp().paper=.7;D.nbp().n=7;D.nbp().m=0b000111;', 'presse-voll': 'D.nbp().st=6;D.nbp().paper=.4;D.nbp().n=20;D.nbp().m=63;D.nbp().dv=45000;', 'abgabe': 'D.nbp().dv=60000;', 'halten-0': '/*top*/D.nbd().st=1;D.nbd().p=.4;D.nbp().st=1;D.nbp().n=7;', 'halten-2': '/*top*/D.nbd().st=1;D.nbd().p=.4;D.nbp().st=1;D.nbp().n=7;H(2);', 'halten-3': '/*top*/D.nbd().st=1;D.nbd().p=.4;D.nbp().st=1;D.nbp().n=7;H(3);', 'halten-4': '/*top*/D.nbd().st=2;D.nbd().c=2;D.nbd().p=.4;D.nbp().st=1;D.nbp().n=7;H(4);'
  };
  const pick = Object.keys(scenes).filter(k => which === 'alle' || k.startsWith(which) || (which === 'presse' && k === 'abgabe'));
  const hud = which === 'halten';
  for (const k of pick) {
    const focus = k.startsWith('halten') ? 'rig' : k === 'presse-raum' ? 'raum' : k.startsWith('presse') ? 'press' : k === 'abgabe' ? 'dep' : 'rig';
    await page.mouse.move(3, 3);
    const r = await page.evaluate(([code, focus]) => {
      const D = __dbg, T = 32; D.sessReset(); D.setScenario('nb'); D.setSeedMode('random'); D.setLage([]); D.buildSeed(5); D.CFG.policeAt = 1e6; D.CFG.policeForced = 1e6; D.CFG.nb.alarmAt = 1e6; D.reset();
      const g = D.get(), me = g.me; g.npcs.splice(0); D.startHeist(true, me); const L = D.LAY().nb; for (let i = 0; i < 30 * 22; i++) { me.hp = 1e9; D.update(1 / 30); }
      const c = focus === 'raum' ? [22 * T, 9 * T] : focus === 'rig' ? [(L.rig[0] + 1) * T, (L.rig[1] + 1.5) * T] : focus === 'press' ? [(L.press[0] + 2.5) * T, (L.press[1] + 1) * T] : [21 * T, 3.5 * T];
      me.x = c[0]; me.y = c[1] + 56; me.x = c[0]; me.y = c[1] + 56; for (let i = 0; i < 45; i++) { me.hp = 1e9; me.x = c[0]; me.y = c[1] + 56; D.update(1 / 30); } for (const e of D.get().en) if (e.fix) { e.x = e.fix[0] * T; e.y = e.fix[1] * T; } const H = ring => { const at = { 1: [14.5, 25.5], 2: [14.5, 20.5], 3: [12, 10.5], 4: [20.5, 4.5] }; for (let r = 1; r <= ring; r++) { const c = D.mkCop(at[r][0] * T, at[r][1] * T, false); c.hp = 1e9; c.cool = 1e9; c.react = -1e9; c.fix = at[r]; D.get().en.push(c); } }; eval(code); D.nbh().t = 95; const cv0 = document.querySelector('canvas'); for (const tg of [cv0, window, document]) tg.dispatchEvent(new MouseEvent('mousemove', { clientX: 1, clientY: 1, bubbles: true })); D.update(.001); D.draw(); D.draw();
      const cv = document.querySelector('canvas'), o = document.createElement('canvas'); o.width = 640; o.height = 400; const top = code.includes('/*top*/'); const x = o.getContext('2d'); const sx = cv.width / 2 - 320, sy = cv.height / 2 - 200 - 22;
      if (top) { o.height = 110; x.drawImage(cv, cv.width / 2 - 480, 12, 960, 165, 0, 0, 640, 110); } else x.drawImage(cv, sx, sy, 640, 400, 0, 0, 640, 400); return o.toDataURL('image/png');
    }, [scenes[k], focus]);
    fs.writeFileSync(path.join(out, pre + '-' + k + '.png'), Buffer.from(r.split(',')[1], 'base64')); console.log(path.join(out, pre + '-' + k + '.png'));
  }
  await Promise.race([page.ctx.close(), new Promise(r => setTimeout(r, 4000))]); await Promise.race([env.browser.close(), new Promise(r => setTimeout(r, 4000))]); env.srv.close(); process.exit(0);
})();
