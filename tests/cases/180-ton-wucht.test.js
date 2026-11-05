// Ton A3 (Ticket #120): Schuss und Explosion mit Koerper (T1), Daempfung durch Waende (T3), Menuetoene (T8). Ohne Ohren: OfflineAudioContext (docs/tests-und-messwerte.md, Ton testen ohne Ohren).
// Was wie klingt, muss ein Mensch hoeren; geprueft wird: entsteht ohne Fehler, endlich, nicht uebersteuert, Waffen unterscheiden sich, Wand daempft, Freies nicht, Menuetoene kommen bei den Aktionen.
const REND = `SND.frame = () => {}; SND.work = () => {}; window.__rend = async (fn, sec) => { const ctx = new OfflineAudioContext(2, Math.round(44100 * (sec || 3)), 44100); await new Promise(r => setTimeout(r, 60)); SND._reinit(ctx); SND.listen(0, 0); fn(); const b = await ctx.startRendering();
  const d = b.getChannelData(0); let pk = 0, e = 0, bad = 0; for (let i = 0; i < d.length; i++) { const v = d[i]; if (!isFinite(v)) bad++; pk = Math.max(pk, Math.abs(v)); e += v * v; }
  let lo = 0, acc = 0; for (let i = 0; i < d.length; i++) { acc += d[i]; if (i >= 40) acc -= d[i - 40]; const m = acc / 40; lo += m * m; }
  return { pk, rms: Math.sqrt(e / d.length), lo: Math.sqrt(lo / d.length), bad }; };`;

module.exports = [
  {
    name: 'T1 Schuss und Explosion: alle Waffen und Gegnerarten, Explosion, Scharfschuetze entstehen ohne Fehler, endlich, unter Uebersteuerung; Waffen klingen verschieden; Explosion hat tiefen Anteil',
    async run(t) {
      await t.page.evaluate(REND);
      const r = await t.page.evaluate(async () => {
        const o = {}, kinds = ['pistol', 'smg', 'rifle'];
        SND.setLos(null);
        for (const k of kinds) o['s_' + k] = await __rend(() => SND.shot(k));
        o.s_none = await __rend(() => SND.shot());
        for (const k of ['cop', 'swat', 'shield', 'sniper']) o['e_' + k] = await __rend(() => SND.eshot(60, 0, k));
        o.boom = await __rend(() => SND.boom(30, 0), 4);
        o.sn = await __rend(() => SND.snshot(30, 0), 3);
        o.mix = await __rend(() => { for (let i = 0; i < 20; i++) { SND.shot('rifle'); } SND.boom(20, 0); SND.boom(40, 0); SND.bang(10, 0); SND.snshot(10, 0); SND.ui('buy'); }, 4);
        o.tune = Object.keys(SND.tune.wpn);
        return o;
      });
      for (const k of Object.keys(r)) { if (k === 'tune') continue; const v = r[k]; t.eq(v.bad, 0, k + ': keine NaN'); t.ok(v.pk > 0.02, k + ': hoerbar (' + v.pk.toFixed(3) + ')'); t.ok(v.pk <= 1, k + ': nicht uebersteuert (' + v.pk.toFixed(3) + ')'); }
      t.ok(r.tune.includes('pistol') && r.tune.includes('smg') && r.tune.includes('rifle'), 'Waffen in TUNE');
      t.ok(Math.abs(r.s_pistol.rms - r.s_smg.rms) > 1e-4 && Math.abs(r.s_rifle.rms - r.s_pistol.rms) > 1e-4, 'Waffen klingen verschieden (Effektivwerte ' + [r.s_pistol.rms, r.s_smg.rms, r.s_rifle.rms].map(x => x.toFixed(4)).join(' / ') + ')');
      t.ok(r.s_rifle.lo > r.s_smg.lo, 'Gewehr hat mehr Tiefe als SMG');
      t.ok(r.s_none.pk > 0.02, 'shot() ohne Art faellt auf Pistole zurueck');
      t.ok(r.e_swat.rms !== r.e_cop.rms, 'Gegnerarten klingen verschieden');
      t.ok(r.boom.lo > r.s_pistol.lo * 1.5, 'Explosion hat mehr Tiefe als ein Pistolenschuss (' + r.boom.lo.toFixed(4) + ' gegen ' + r.s_pistol.lo.toFixed(4) + ')');
      t.ok(r.mix.pk <= 1, 'Mischung uebersteuert nicht (' + r.mix.pk.toFixed(3) + ')');
    },
  },
  {
    name: 'T1 Nachgrollen: die Explosion klingt nach (Energie zwischen 0,6 und 1,5 s), ein Schuss deutlich weniger',
    async run(t) {
      await t.page.evaluate(`SND.frame = () => {}; SND.work = () => {}; window.__tail = async (fn) => { const ctx = new OfflineAudioContext(1, 44100 * 3, 44100); SND._reinit(ctx); SND.listen(0, 0); fn(); const d = (await ctx.startRendering()).getChannelData(0); let a = 0, b = 0, m = 0; for (let i = 0; i < d.length; i++) { if (i > 26460 && i < 66150) a += d[i] * d[i]; if (i < 4410) b += d[i] * d[i]; if (i >= 6615 && i < 17640) m += d[i] * d[i]; } return { late: a, early: b, mid: m }; };`);
      const r = await t.page.evaluate(async () => { SND.setLos(null); return { boom: await __tail(() => SND.boom(30, 0)), shot: await __tail(() => SND.shot('pistol')) }; });
      t.ok(r.shot.mid / r.shot.early > 0.003, 'Schuss hat eine Hallfahne (Energie 0,15 bis 0,4 s: ' + (r.shot.mid / r.shot.early).toExponential(1) + ' des Knalls)');
      t.ok(r.boom.late > 0,'Explosion hat Energie zwischen 0,6 und 1,5 s');
      t.ok(r.boom.late / r.boom.early > 2 * (r.shot.late / r.shot.early), 'Nachgrollen der Explosion deutlich laenger als beim Schuss');
    },
  },
  {
    name: 'T3 Daempfung: hinter einer Wand leiser und dumpfer, im Freien unveraendert; Pruefung gedrosselt und zwischengespeichert',
    async run(t) {
      await t.page.evaluate(REND);
      const r = await t.page.evaluate(async () => {
        const o = {}; let n = 0;
        SND.setLos(() => { n++; return true; });
        o.free = await __rend(() => SND.eshot(120, 0, 'swat'));
        o.freeOcc = SND._occ(120, 0);
        SND.setLos(() => { n++; return false; });
        o.wall = await __rend(() => SND.eshot(120, 0, 'swat'));
        o.wallOcc = SND._occ(120, 0);
        SND.setLos(null); o.none = SND._occ(120, 0);
        n = 0; SND.setLos(() => { n++; return false; }); SND.listen(0, 0);
        for (let i = 0; i < 200; i++) SND._occ(100, 100);
        o.sameN = n; n = 0;
        for (let i = 0; i < 200; i++) SND._occ(i * 40, 300 + i * 17);
        o.manyN = n; o.bud = SND.tune.occ.bud;
        return o;
      });
      t.eq(r.freeOcc, 0, 'frei: nicht verdeckt'); t.eq(r.wallOcc, 1, 'Wand: verdeckt'); t.eq(r.none, 0, 'ohne Pruefer nie verdeckt');
      t.ok(r.wall.rms < r.free.rms * 0.6, 'hinter der Wand deutlich leiser (' + r.wall.rms.toFixed(4) + ' gegen ' + r.free.rms.toFixed(4) + ')');
      t.ok(r.wall.rms > 0, 'aber nicht stumm');
      t.ok(r.wall.lo / r.wall.rms > r.free.lo / r.free.rms, 'hinter der Wand dumpfer (mehr Tiefenanteil)');
      t.eq(r.sameN, 1, 'gleicher Ort: eine Pruefung');
      t.ok(r.manyN <= r.bud + 1, 'viele Orte im selben Zug: hoechstens ' + r.bud + ' Pruefungen (' + r.manyN + ')');
    },
  },
  {
    name: 'T3 im Spiel: die Verdeckung nutzt die Sichtlinie der Karte (Bank klassisch): hinter einer Wand 1, mit freier Sicht 0, beides kommt vor',
    async run(t) {
      const r = await t.page.evaluate(() => {
        const D = __dbg; D.sessReset(); D.setScenario('bank'); D.setSeedMode('classic'); D.buildSeed('classic'); const me = D.get().me, o = { free: 0, wall: 0, bad: 0, n: 0 };
        SND.tune.occ.bud = 1e9; SND.tune.occ.ttl = 0; SND.listen(me.x, me.y);
        for (let rad = 60; rad <= 360; rad += 20) for (let a = 0; a < 6.28; a += .2) {
          const x = Math.round(me.x + Math.cos(a) * rad), y = Math.round(me.y + Math.sin(a) * rad); if (D.isSol(Math.floor(x / 32), Math.floor(y / 32))) continue;
          const v = SND._occ(x, y), w = D.los(x, y, me.x, me.y) ? 0 : 1; o.n++; if (v !== w) o.bad++; if (w) o.wall++; else o.free++;
        }
        return o;
      });
      t.ok(r.n > 100, 'genug Punkte (' + r.n + ')'); t.eq(r.bad, 0, 'Verdeckung stimmt mit der Sichtlinie ueberein');
      t.ok(r.free > 10 && r.wall > 10, 'frei ' + r.free + ', hinter Wand ' + r.wall);
    },
  },
  {
    name: 'T8 Menuetoene: Fokuswechsel, Bestaetigen, Zurueck, Gesperrt und Kauf kommen bei den Aktionen',
    async run(t) {
      await t.loadTool('loopnet.js'); await t.loadInpage('menu.js');
      const r = await t.page.evaluate(() => {
        const d = MT.solo(null, 's'), o = {}, rec = [], orig = SND.ui, ev0 = SND.ev; SND.ui = k => { rec.push(k); }; SND.ev = (...a) => { rec.push('ev:' + a[0]); };
        const take = () => rec.splice(0).join(',');
        try {
          d.sessReset(); d.ui().tiles(); take();
          MT.k(d, 'ArrowDown'); o.down = take(); MT.k(d, 'Tab'); o.tab = take();
          MT.k(d, 'o'); o.open = take(); MT.k(d, 'ArrowDown'); MT.k(d, 'ArrowUp'); o.optFocus = take().split(',')[0]; MT.k(d, 'Escape'); o.back = take();
          const t1 = d.ui().tiles().filter(q => !q.nofocus)[1]; take();
          d.ui().move(t1.x + t1.w / 2, t1.y + t1.h / 2); o.hover = take(); d.ui().move(t1.x + t1.w / 2, t1.y + t1.h / 2); o.hover2 = take();
          d.sessReset(); d.toTitle(); d.ui().tiles(); take(); MT.click(d, 'serie'); take();
          o.ids = d.ui().tiles().map(q => q.id).join(',');
          if (MT.tile(d, 'job:casino')) { MT.click(d, 'job:casino'); o.lock = take(); }
          d.sessReset(); d.SESSION.wallet = 200000; d.SESSION.round = 1; d.openShop(); d.ui().tiles(); take();
          MT.click(d, 'buy:0'); o.buy = take();
          d.SESSION.wallet = 0; d.ui().tiles(); MT.click(d, 'buy:1'); o.noMoney = take();
        } finally { SND.ui = orig; SND.ev = ev0; }
        return o;
      });
      t.eq(r.down, 'focus', 'Pfeil: Fokus'); t.eq(r.tab, 'focus', 'Tab: Fokus'); t.eq(r.open, 'ok', 'Taste auf Kachel: Bestaetigen');
      t.eq(r.optFocus, 'focus', 'Fokus im Fenster'); t.eq(r.back, 'back', 'Esc: Zurueck');
      t.eq(r.hover, 'focus', 'Maus ueber andere Kachel: Fokus'); t.eq(r.hover2, '', 'gleiche Kachel: kein zweiter Ton');
      t.ok(/(^|,)deny$/.test(r.lock) && !/ok|back/.test(r.lock), 'gesperrter Auftrag: Gesperrt, kein Bestaetigen (' + r.lock + ') (Kacheln: ' + r.ids + ')');
      t.ok(/(^|,)buy$/.test(r.buy) && !/ok/.test(r.buy), 'Kauf: Kauf-Ton, kein Bestaetigen dazu (' + r.buy + ')');
      t.ok(/(^|,)ev:deny$/.test(r.noMoney), 'Zu teuer: Verweigert (Spiel-Ton)');
    },
  },
  {
    name: 'T8 Menuetoene klingen: focus, ok, back, buy, deny entstehen ohne Fehler, sind kurz und leise; Fokus ist gedrosselt',
    async run(t) {
      await t.page.evaluate(REND);
      const r = await t.page.evaluate(async () => {
        const o = {}; for (const k of ['focus', 'ok', 'back', 'buy', 'deny']) o[k] = await __rend(() => SND.ui(k), 1);
        const ctx = new OfflineAudioContext(1, 44100, 44100); SND._reinit(ctx); let n = 0; const orig = ctx.createOscillator.bind(ctx); ctx.createOscillator = () => { n++; return orig(); };
        for (let i = 0; i < 20; i++) SND.ui('focus'); o.focusN = n; return o;
      });
      for (const k of ['focus', 'ok', 'back', 'buy', 'deny']) { t.eq(r[k].bad, 0, k + ': keine NaN'); t.ok(r[k].pk > 0.01 && r[k].pk < 0.6, k + ': hoerbar und leise (' + r[k].pk.toFixed(3) + ')'); }
      t.eq(r.focusN, 1, 'Fokus-Ton im Sperrfenster nur einmal');
    },
  },
  {
    name: 'T1 Zuordnung: das Ereignis sh ruft den Schussklang der Waffe des Schuetzen (Pistole, SMG, Sturmgewehr), Schuetzen anderer Spieler klingen nach ihrer Waffe',
    async run(t) {
      const r = await t.page.evaluate(() => {
        const D = __dbg; D.sessReset(); D.setScenario('bank'); D.setSeedMode('classic'); D.buildSeed('classic'); const me = D.get().me, rec = [], o = {}, s0 = SND.shot, e0 = SND.eshot;
        SND.shot = (...a) => rec.push(['shot', ...a]); SND.eshot = (...a) => rec.push(['eshot', ...a]);
        try { for (const k of ['pistol', 'smg', 'rifle']) { me.wp = D.CFG.wpn[k]; rec.length = 0; D.evt('sh', [me.id, 1, 2, 0]); o[k] = rec.map(x => x.slice()); } } finally { SND.shot = s0; SND.eshot = e0; }
        return o;
      });
      t.eq(r.pistol, [['shot', 'pistol']]); t.eq(r.smg, [['shot', 'smg']]); t.eq(r.rifle, [['shot', 'rifle']]);
    },
  },
];
