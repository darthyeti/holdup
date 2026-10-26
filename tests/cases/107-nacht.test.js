// Nacht (Tills Wunsch nach dem Coop-Test vom 26. Oktober 2026: der Tag war kaum zu erkennen und sein Effekt nicht ersichtlich, im Museum gab es ihn nur als Etikett): Nacht ist jetzt ein echter Lage-Tag (Bank, Juwelier,
// Tankstelle, Transporter, Casino, nie zusammen mit Nebel) mit gemeinsamer Wirkung (du, das Personal und die Kameras sehen weniger weit, Tageszeit Nacht mit blauer Toenung) und eigener Wirkung je Szenario (CFG.lage.nacht.per:
// Kundschaft, Wachen, Kameras, Beute, Polizeizeit, Verdacht), dazu sichtbar abgedunkelt ausserhalb eines Lichtkreises um den Spieler (CFG.night). Das Museum ist immer Nacht (Theme), ohne den Tag zu wuerfeln.
module.exports = [
  {
    name: 'Nacht: Der Tag kommt auf Bank, Juwelier, Tankstelle, Transporter und Casino vor, nie auf dem Museum (dort immer Nacht per Theme), nie zusammen mit Nebel; die Beschreibung nennt den Effekt des Szenarios',
    async run(t) {
      const r = await t.page.evaluate(`(() => { const D = __dbg, out = { n: {}, mix: 0 }; D.setLage(null); D.setSeedMode('random');
        for (const [sc, to] of [['bank', 40], ['jewel', 40], ['gas', 40], ['truck', 80], ['casino', 40], ['museum', 20]]) { let n = 0; for (let s = 1; s < to; s++) { D.sessReset(); D.setScenario(sc); D.setTurn('S'); D.buildSeed(s); const lg = D.LAY().mission.lg || []; if (lg.includes('nacht')) { n++; if (lg.includes('nebel')) out.mix++ } } out.n[sc] = n; }
        D.setLage(['nacht']); out.txt = {}; for (const sc of ['bank', 'jewel', 'gas', 'truck', 'casino']) { D.sessReset(); D.setScenario(sc); D.setTurn('S'); D.buildSeed(7); D.reset(); const m = D.msgs().feed; out.txt[sc] = { tags: D.LAY().mission.tags.includes('Nacht'), say: m.find(s => /^Nacht:/.test(s)) || m.join(' | ') }; }
        D.setLage([]); D.sessReset(); D.setScenario('museum'); D.setTurn('S'); D.buildSeed(311704); D.reset(); out.museum = { tod: D.LAY().theme.tod, tag: D.LAY().mission.tags.includes('Nacht'), lg: D.LAY().mission.lg, on: D.nightOn() };
        D.sessReset(); D.setScenario('bank'); D.buildSeed(7); D.reset(); out.bankDay = D.nightOn();
        return out; })()`);
      for (const sc of ['bank', 'jewel', 'gas', 'truck', 'casino']) t.ok(r.n[sc] > 0, sc + ': der Tag Nacht kommt vor (' + r.n[sc] + ' Treffer)');
      t.eq(r.n.museum, 0, 'Museum: Nacht wird nicht gewuerfelt');
      t.eq(r.mix, 0, 'nie zusammen mit Nebel');
      t.ok(r.txt.bank.tags && /Kaum Kundschaft/.test(r.txt.bank.say) && /Eine Wache mehr/.test(r.txt.bank.say), 'Bank: Tag im HUD, Text nennt Kundschaft und Wache: ' + r.txt.bank.say);
      t.ok(/Eine Kamera mehr/.test(r.txt.jewel.say) && /Beute \+10 %/.test(r.txt.jewel.say), 'Juwelier: Kamera und Beute: ' + r.txt.jewel.say);
      t.ok(/8 s später/.test(r.txt.gas.say) && /Beute -10 %/.test(r.txt.gas.say), 'Tankstelle: Polizei spaeter, weniger Beute: ' + r.txt.gas.say);
      t.ok(/Beute \+10 %/.test(r.txt.truck.say), 'Transporter: mehr Beute: ' + r.txt.truck.say);
      t.ok(/Hochbetrieb/.test(r.txt.casino.say) && /Verdacht \+15 %/.test(r.txt.casino.say) && /Beute \+25 %/.test(r.txt.casino.say), 'Casino: Hochbetrieb, Verdacht, Beute: ' + r.txt.casino.say);
      t.eq([r.museum.tod, r.museum.tag, r.museum.lg.includes('nacht'), r.museum.on], ['nacht', true, false, true], 'Museum: Tageszeit Nacht und Etikett ohne Tag im Wuerfelpool: ' + JSON.stringify(r.museum));
      t.eq(r.bankDay, false, 'Bank am Tag: keine Nacht');
    },
  },
  {
    name: 'Nacht: Wirkung je Szenario (Kundschaft, Wachen, Kameras, Beute, Polizeizeit, Verdacht) gegen dieselbe Karte ohne den Tag, gemeinsam Sicht 0,8 und Tageszeit Nacht',
    async run(t) {
      const r = await t.page.evaluate(`(() => { const D = __dbg, out = {}; D.setSeedMode('random'); const P = D.CFG.lage.nacht.per;
        const info = (sc, seed, lg) => { D.sessReset(); D.setLage(lg); D.setScenario(sc); D.setTurn('S'); D.buildLay(D.layoutFor(seed)); const m = D.LAY().mission; return { civ: m.civ, guards: m.guards, cams: m.cams, tod: D.LAY().theme.tod, vis: D.lgv('nacht', 'vis'), f: { loot: D.lgvM('loot'), sus: D.lgvM('sus'), vis: D.lgvM('vis'), sight: D.lgvM('sight') }, pol: D.lgvA('pol') }; };
        for (const [sc, seed] of [['bank', 116145], ['jewel', 95694], ['gas', 751643], ['truck', 748178], ['casino', 829256]]) out[sc] = { day: info(sc, seed, []), night: info(sc, seed, ['nacht']) };
        out.per = P; return out; })()`);
      const d = r, P = r.per;
      for (const sc of ['bank', 'jewel', 'gas', 'truck', 'casino']) { t.eq(d[sc].night.tod, 'nacht', sc + ': Tageszeit Nacht mit dem Tag'); t.ok(Math.abs(d[sc].night.f.vis - .8) < 1e-9 && Math.abs(d[sc].night.f.sight - .85) < 1e-9, sc + ': Sicht .8 und Personal .85: ' + JSON.stringify(d[sc].night.f)); t.ok(d[sc].day.f.vis === 1 && d[sc].day.f.sight === 1 && d[sc].day.pol === 0, sc + ': ohne den Tag alles beim Alten'); }
      t.ok(d.bank.night.civ <= Math.max(2, Math.round(d.bank.day.civ * P.b.civ)) && d.bank.night.civ < d.bank.day.civ, 'Bank: Kundschaft x0,3 (' + d.bank.day.civ + ' auf ' + d.bank.night.civ + ')');
      t.eq(d.bank.night.guards, Math.min(2, d.bank.day.guards + 1), 'Bank: eine Wache mehr (hoechstens 2)');
      t.eq(d.jewel.night.cams, Math.min(9, d.jewel.day.cams + 1), 'Juwelier: eine Kamera mehr: ' + JSON.stringify([d.jewel.day.cams, d.jewel.night.cams]));
      t.ok(Math.abs(d.jewel.night.f.loot - 1.1) < 1e-9 && Math.abs(d.casino.night.f.loot - 1.25) < 1e-9 && Math.abs(d.gas.night.f.loot - .9) < 1e-9 && Math.abs(d.truck.night.f.loot - 1.1) < 1e-9, 'Beute-Faktoren Juwelier 1,1, Casino 1,25, Tankstelle 0,9, Transporter 1,1');
      t.eq(d.gas.night.pol, 8, 'Tankstelle: Polizei 8 s spaeter');
      t.ok(Math.abs(d.casino.night.f.sus - 1.15) < 1e-9 && d.casino.night.civ >= d.casino.day.civ && d.casino.night.guards >= d.casino.day.guards + 1, 'Casino: Verdacht x1,15, mehr Gaeste und eine Wache mehr: ' + JSON.stringify([d.casino.day, d.casino.night]));
    },
  },
  {
    name: 'Nacht sichtbar: Mit dem Tag (und im Museum) ist das Bild ausserhalb eines Lichtkreises um den Spieler abgedunkelt (CFG.night.dim), nahe am Spieler bleibt es hell, am Tag fehlt die Abdunkelung',
    async run(t) {
      const r = await t.page.evaluate(`(() => { const D = __dbg, out = {}; D.setSeedMode('random'); const cv = document.getElementById('c'), ctx = cv.getContext('2d');
        const lum = (x0, y0, w, h) => { const d = ctx.getImageData(x0, y0, w, h).data; let s = 0; for (let i = 0; i < d.length; i += 4) s += d[i] * .3 + d[i + 1] * .59 + d[i + 2] * .11; return s / (d.length / 4); };
        const shot = (sc, seed, lg) => { D.sessReset(); D.setLage(lg); D.setScenario(sc); D.setTurn('S'); D.buildLay(D.layoutFor(seed)); for (let i = 0; i < 20; i++) D.update(1 / 30); D.draw(); D.draw();
          const W = cv.width, H = cv.height; return { far: lum(W * .78, H * .1, W * .2, H * .25), near: lum(W / 2 - 60, H / 2 - 60, 120, 120), on: D.nightOn() }; };
        out.day = shot('casino', 829256, []); out.night = shot('casino', 829256, ['nacht']); out.dim = D.CFG.night;
        return out; })()`);
      t.eq([r.day.on, r.night.on], [false, true], 'nightOn: am Tag aus, mit dem Tag an');
      t.ok(r.night.far < r.day.far * .8, 'weit vom Spieler ist das Bild nachts deutlich dunkler: ' + Math.round(r.night.far) + ' gegen ' + Math.round(r.day.far));
      t.ok(r.night.near > r.night.far, 'um den Spieler ist es heller als in der Ferne: ' + Math.round(r.night.near) + ' gegen ' + Math.round(r.night.far));
    },
  },
];
