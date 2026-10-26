// Flugschreiber (Session-Log, Tills Wunsch vom 26. Oktober 2026 für die Coop-Tests), Stufe A: mkFlog() baut je Spielinstanz einen Schreiber (LOG, im Debug-Hook als flog()), der im Speicher aufzeichnet und als JSON-Datei ausgibt (F9, Kachel Log speichern in den Optionen).
// Aufgezeichnet wird: Kopf je Auftrag (flogMeta: Szenario, Seed, Spieler mit Kits, Karte mit Tags, Serie, Umgebung), Ereignisse mit Wand- und Spielzeit (say und ban aus fxApply, Phase, Welle, Polizei, Fluchtwagen, Spieler tot, am Boden, entkommen, weg, Netz, Ruckler,
// Fehler, Tab), eine Messzeile je Sekunde (FL_KEYS), 5 Bilder je Sekunde (30 s Ring) und Markierungen (F8) mit diesem Ring. Ringpuffer: Ereignisse 6000, Messzeilen 5400, Bilder 150, Markierungen 20. Gemessen wird in tick (logStep), nicht in update.
module.exports = [
  {
    name: 'Flugschreiber solo: Kopf je Auftrag (Szenario, Seed, Spieler, Karte, Serie), eine Messzeile je Sekunde mit allen Spalten, Ereignisse mit Phase, Alarm-Meldungen (say) und Spieler am Boden, Bilder mit Positionen, Umgebung',
    async run(t) {
      const r = await t.page.evaluate(() => {
        const D = __dbg, o = {}; D.sessReset(); D.setScenario('bank'); D.setSeedMode('random'); D.setLage([]); D.setTurn('S'); D.buildSeed(5017); D.CFG.policeAt = 1e6; D.CFG.policeForced = 1e6; D.setFocus(true);
        const L = D.flog(); D.tick(1 / 30); D.startHeist(false, D.get().me); for (let i = 0; i < 100; i++) D.tick(1 / 30);
        D.get().me.hp = 0; for (let i = 0; i < 30; i++) D.tick(1 / 30);
        const d = L.dump(); o.fmt = [d.fmt, d.spiel, d.build, typeof d.datum, typeof d.gespeichert]; o.env = Object.keys(d.umgebung).sort(); o.runden = d.runden.length;
        const m = d.runden[d.runden.length - 1].meta; o.meta = { sz: m.szenario, seed: m.seed, rolle: m.rolle, sp: m.spieler.length, name: m.spieler[0].n, kit: Object.keys(m.spieler[0].k).sort(), karte: Object.keys(m.karte).sort(), serie: Object.keys(m.serie).sort(), ver: m.ver, build: m.build };
        o.spalten = d.messzeilen.spalten.length; o.zeilen = d.messzeilen.zeilen.length; o.breit = d.messzeilen.zeilen.every(z => z.length === d.messzeilen.spalten.length); o.z0 = d.messzeilen.zeilen[0]; o.zT = d.messzeilen.spalten.slice(0, 4);
        o.kinds = [...new Set(d.ereignisse.map(e => e[2]))].sort(); o.phase = d.ereignisse.filter(e => e[2] === 'phase').map(e => e[3]); o.say = d.ereignisse.filter(e => e[2] === 'say').length > 0; o.spieler = d.ereignisse.filter(e => e[2] === 'spieler').map(e => e[3]);
        o.zeit = d.ereignisse.every(e => typeof e[0] === 'number' && typeof e[1] === 'number');
        const mk = L.mark('test'); const d2 = L.dump(); o.mark = [mk, d2.markierungen.length, d2.markierungen[0].note, d2.markierungen[0].frames.length > 10, d2.markierungen[0].frames.length <= 150, d2.markierungen[0].ev.length <= 80];
        const f = d2.markierungen[0].frames[d2.markierungen[0].frames.length - 1]; o.frame = [f.length, Array.isArray(f[2]), f[2][0].length, Array.isArray(f[3])];
        return o;
      });
      t.eq(r.fmt, [1, 'holdup', r.meta.build, 'string', 'string'], 'Format 1, Spiel, Build, Datum, Zeitstempel');
      t.eq(r.env, ['bildschirm', 'fenster', 'kerne', 'netz', 'online', 'speicher', 'sprache', 'ua'], 'Umgebung');
      t.ok(r.runden >= 1 && r.runden <= 2, 'ein Kopf je Auftrag (die Debug-Seite startet selbst eine erste Runde, dann baut der Test die zweite): ' + r.runden);
      t.eq([r.meta.sz, r.meta.seed, r.meta.rolle, r.meta.sp], ['bank', 5017, 'solo', 1], 'Kopf: Szenario, Seed, Rolle, ein Spieler');
      t.eq(r.meta.kit, ['helm', 'sk', 'vest', 'w'], 'Kit des Spielers');
      t.eq(r.meta.karte, ['h', 'lage', 'strasse', 'tags', 'transporter', 'w'], 'Karte');
      t.eq(r.meta.serie, ['fahndung', 'konto', 'lautlos', 'punkte', 'runde'], 'Serie');
      t.eq([r.spalten, r.breit], [24, true], 'Messzeilen haben alle 24 Spalten');
      t.ok(r.zeilen >= 3 && r.zeilen <= 5, 'etwa eine Messzeile je Sekunde bei 4,3 s Spiel: ' + r.zeilen);
      t.eq(r.zT, ['t', 'gt', 'scr', 'ph'], 'Spalten beginnen mit Wandzeit und Spielzeit');
      t.ok(r.kinds.includes('phase') && r.kinds.includes('say') && r.kinds.includes('spieler') && r.kinds.includes('runde'), 'Ereignisarten: ' + JSON.stringify(r.kinds));
      t.eq(r.phase, [2], 'Phase 2 wird gemeldet');
      t.eq(r.spieler.map(x => x[2]).slice(0, 1), ['tot'], 'der Spieler ist tot (solo gibt es kein Liegen)');
      t.ok(r.zeit, 'jedes Ereignis hat Wandzeit und Spielzeit');
      t.eq(r.mark.slice(0, 3), [1, 1, 'test'], 'Markierung gesetzt');
      t.ok(r.mark[3] && r.mark[4] && r.mark[5], 'Markierung hält Bilder (über 10, höchstens 150) und höchstens 80 Ereignisse');
      t.eq(r.frame, [4, true, 5, true], 'Bild: Wandzeit, Spielzeit, Spieler [Kennung, x, y, hp, Flags], Gegner');
    },
  },
  {
    name: 'Flugschreiber: Ringpuffer (Ereignisse 6000, Bilder 150, Markierungen 20), Fehler werden mit Stack erfasst (error und unhandledrejection), Ruckler und Zeitsprünge sind begrenzt (evl), Tab versteckt wird erfasst',
    async run(t) {
      const r = await t.page.evaluate(() => {
        const D = __dbg, o = {}, L = D.flog(); D.setFocus(true);
        for (let i = 0; i < 7000; i++) L.ev('x', i); for (let i = 0; i < 400; i++) L.frame([0, [], []]); for (let i = 0; i < 30; i++) L.mark('m' + i); const d = L.dump(); o.cap = [d.ereignisse.length, d.markierungen.length, d.markierungen[0].frames.length, d.markierungen[19].note];
        window.dispatchEvent(new ErrorEvent('error', { message: 'Testfehler', filename: 'http://x/y/index.html', lineno: 42, error: new Error('boom') })); o.err = L.dump().ereignisse.filter(e => e[2] === 'fehler').map(e => [e[3].m, e[3].f, e[3].l, /boom/.test(e[3].s)]);
        const e2 = new Event('unhandledrejection'); e2.reason = new Error('versprochen'); window.dispatchEvent(e2); o.rej = L.dump().ereignisse.filter(e => e[2] === 'fehler' && /Promise/.test(e[3].m)).length; o.nErr = L.dump().fehler;
        const cnt = () => L.dump().ereignisse.filter(e => e[2] === 'ruckler').length, n0 = cnt(); for (let i = 0; i < 20; i++) L.evl('ruckler', 120, 5); o.evl = cnt() - n0;
        Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')); delete document.hidden; o.tab = L.dump().ereignisse.filter(e => e[2] === 'tab').map(e => e[3]).slice(-1);
        return o;
      });
      t.eq(r.cap, [6000, 20, 150, 'm29'], 'Ereignisse 6000, Markierungen 20 (die letzte bleibt), Bilder in der Markierung 150');
      t.eq(r.err, [['Testfehler', 'index.html', 42, true]], 'Fehler mit Meldung, Datei, Zeile und Stack');
      t.eq([r.rej, r.nErr], [1, 2], 'unhandledrejection wird erfasst, Zähler 2');
      t.eq(r.evl, 1, 'evl lässt innerhalb der Mindestzeit nur ein Ereignis durch');
      t.eq(r.tab, ['versteckt'], 'Tab versteckt wird erfasst');
    },
  },
  {
    name: 'Flugschreiber speichern: F9 und die Kachel in den Optionen geben eine JSON-Datei aus (Name mit Build, Rolle, Name, Zeit), F8 und die Kachel Markieren setzen eine Markierung, in den Menüs und in der Pause gehen beide Tasten auch',
    async run(t) {
      await t.loadTool('loopnet.js'); await t.loadInpage('menu.js');
      const r = await t.page.evaluate(async () => {
        const o = {}, got = [], oc = HTMLAnchorElement.prototype.click;
        HTMLAnchorElement.prototype.click = function () { if (this.download) got.push({ name: this.download, href: this.href }); };
        try {
          const d = MT.solo(null, 's'), key = (k) => MT.k(d, k); d.sessReset(); d.setName('Tilli'); const L = d.flog();
          key('F9'); o.f9 = got.length; const j = await (await fetch(got[0].href)).json(); o.json = [j.fmt, j.spiel, j.gespeichert.length > 10]; o.name = got[0].name;
          key('F8'); o.f8 = L.dump().markierungen.length;
          key('o'); o.tiles = d.ui().tiles().map(q => q.id).filter(id => id === 'flog' || id === 'fmark'); MT.click(d, 'fmark'); o.ui = L.dump().ereignisse.filter(e => e[2] === 'ui').map(e => e[3]); o.kachelMark = L.dump().markierungen.length; MT.click(d, 'flog'); o.kachel = got.length;
          const pos = d.ui().tiles().filter(q => q.id === 'flog' || q.id === 'fmark'); o.nebeneinander = pos[0].y === pos[1].y && pos[0].x < pos[1].x; o.inside = d.ui().tiles().every(q => q.x >= 0 && q.y >= 0 && q.x + q.w <= 960 && q.y + q.h <= 544);
          d.startGame(); d.setFocus(true); MT.adv(d, 1); key('Escape'); key('F9'); o.pause = got.length;
        } finally { HTMLAnchorElement.prototype.click = oc; }
        return o;
      });
      t.eq(r.f9, 1, 'F9 gibt eine Datei aus');
      t.eq(r.json, [1, 'holdup', true], 'Inhalt ist das Log (Format 1)');
      t.ok(/^holdup-log-b\d+-solo-Tilli-\d{8}-\d{6}\.json$/.test(r.name), 'Dateiname: ' + r.name);
      t.eq(r.f8, 1, 'F8 setzt eine Markierung');
      t.eq(r.tiles, ['flog', 'fmark'], 'beide Kacheln in den Optionen');
      t.ok(r.ui.includes('flogMark'), 'jede Menü-Aktion steht als Ereignis ui im Log (wer was gedrückt hat): ' + JSON.stringify(r.ui));
      t.eq([r.kachelMark, r.kachel], [2, 2], 'die Kacheln markieren und speichern');
      t.ok(r.nebeneinander && r.inside, 'nebeneinander, alles im Bild');
      t.eq(r.pause, 3, 'F9 geht auch in der Pause');
    },
  },
  {
    name: 'Flugschreiber im Coop (Host und Client): beide zeichnen auf, der Client misst Schnappschuss-Abstand, Ping und Korrektur, die Ereignisse nennen Verbindung und Spieler, der Kopf nennt beide Spieler mit Namen',
    async run(t) {
      await t.loadTool('loopnet.js'); await t.loadInpage('coop.js');
      const r = await t.page.evaluate(() => {
        const G = CT.mkGame('bank', 321, 2), A = G.A, B = G.clients[0], o = {}; A.CFG.policeAt = 1e6; A.CFG.policeForced = 1e6;
        B.cv.dispatchEvent(new KeyboardEvent('keydown', { key: 'f', bubbles: true })); G.run(6);
        const da = A.flog().dump(), db = B.flog().dump(), col = (d, k) => d.messzeilen.spalten.indexOf(k), rowsB = db.messzeilen.zeilen;
        o.rolle = [da.runden[0].meta.rolle, db.runden[0].meta.rolle]; o.sp = [da.runden[0].meta.spieler.length, db.runden[0].meta.spieler.length]; o.ids = [da.runden[0].meta.id, db.runden[0].meta.id];
        o.sn = rowsB.reduce((s, z) => s + z[col(db, 'sn')], 0); o.gap = Math.max(...rowsB.map(z => z[col(db, 'gapMax')])); o.ping = Math.max(...rowsB.map(z => z[col(db, 'ping')]));
        o.netzA = da.ereignisse.filter(e => e[2] === 'netz').map(e => JSON.stringify(e[3])); o.netzB = db.ereignisse.filter(e => e[2] === 'netz').map(e => e[3]);
        o.phaseB = db.ereignisse.filter(e => e[2] === 'phase').map(e => e[3]); o.zeilenA = da.messzeilen.zeilen.length; B.leaveGame('Test-Ende'); o.leave = B.flog().dump().ereignisse.filter(e => e[2] === 'netz' && e[3][0] === 'verlassen').map(e => e[3][1]); G.run(1); o.hostSieht = A.flog().dump().ereignisse.filter(e => e[2] === 'netz' && e[3][0] === 'getrennt').length;
        return o;
      });
      t.eq(r.rolle, ['host', 'client'], 'Rollen im Kopf');
      t.eq(r.sp, [2, 2], 'beide kennen beide Spieler');
      t.eq(r.ids, [0, 1], 'Spielerkennungen');
      t.ok(r.sn > 20, 'der Client zählt Schnappschüsse (20 je Sekunde, 6 s): ' + r.sn);
      t.ok(r.gap > 0 && r.gap < 1000, 'größte Lücke zwischen Schnappschüssen in ms: ' + r.gap);
      t.ok(r.ping > 0, 'der Client misst den Ping: ' + r.ping);
      t.ok(r.netzA.includes('["verbunden",1]'), 'der Host nennt die Verbindung von Spieler 1: ' + JSON.stringify(r.netzA));
      t.ok(r.netzB.includes('verbunden mit dem Host'), 'der Client nennt die Verbindung zum Host: ' + JSON.stringify(r.netzB));
      t.ok(r.phaseB.includes(2), 'der Client sieht den Überfall (Phase 2) aus dem Schnappschuss');
      t.ok(r.zeilenA >= 4, 'der Host hat Messzeilen: ' + r.zeilenA);
      t.eq(r.leave, ['Test-Ende'], 'wer die Partie selbst verlässt (leaveGame), steht als verlassen im eigenen Log');
      t.eq(r.hostSieht, 1, 'der Host sieht danach die getrennte Verbindung');
    },
  },
];
