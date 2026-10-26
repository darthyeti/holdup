// Flugschreiber, Stufe B (Wunsch von Till am 26. Oktober 2026, VER 40): Im Coop schickt jeder Client sein Log (lite) am Rundenende, mit F9 und auf Anfrage lgq des Hosts in Stuecken zu 40.000 Zeichen (Nachricht lg: i, k, n, d) an den Host, der es zusammensetzt (NET.logs je Spieler).
// F9 am Host fragt alle Clients mit lgq (1,5 s Spielzeit, tick), danach schreibt er EINE Datei mit seinem Log und den Logs der Mitspieler unter peers. Zustandsabgleich (Nachricht chk): Der Client schickt alle 5 s nach dem naechsten Schnappschuss seine Zustandszeile (chkVec) mit
// der Zeit T des Schnappschusses, der Host hat zu jedem gesendeten Schnappschuss seine Zeile aufgehoben (NET.chkH) und vergleicht (flogChk), Abweichungen werden als Ereignis abgleich und im Feld abgleich der Datei gefuehrt.
const SETUP = `(() => { const G = CT.mkGame('bank', 321, 2), A = G.A, B = G.clients[0]; A.CFG.policeAt = 1e6; A.CFG.policeForced = 1e6; B.cv.dispatchEvent(new KeyboardEvent('keydown', { key: 'f', bubbles: true })); return { G, A, B }; })()`;
const KEY = (cv, k) => `${cv}.dispatchEvent(new KeyboardEvent('keydown', { key: '${k}', bubbles: true }))`;

module.exports = [
  {
    name: 'PeerJS-Anbindung (wrap): Ein Fehler der Verbindung (message-too-big) schließt sie nicht, solange sie offen ist, ein Fehler an einer geschlossenen Verbindung und das Ereignis close melden den Abbruch, Fehler stehen im Log',
    async run(t) {
      const r = await t.page.evaluate(() => {
        const D = __dbg, o = {}, TRp = D.peerTransport(), mk = () => { const h = {}, c = { open: true, on(n, f) { h[n] = f; }, send() { }, close() { } }; c.h = h; return c; };
        let c = mk(), w = TRp.wrap(c), closed = 0, got = []; w.onclose = () => closed++; w.onmsg = m => got.push(m);
        c.h.data({ t: 'a' }); c.h.error({ type: 'message-too-big' }); o.nachFehler = [closed, got.length]; c.open = false; c.h.error({ type: 'webrtc' }); o.geschlossenFehler = closed; c.h.close(); o.close = closed;
        o.log = D.flog().dump().ereignisse.filter(e => e[2] === 'netz' && e[3][0] === 'peerjs-fehler').map(e => e[3][1]);
        return o;
      });
      t.eq(r.nachFehler, [0, 1], 'message-too-big bei offener Verbindung: nicht geschlossen, Daten kommen weiter an');
      t.eq(r.geschlossenFehler, 1, 'Fehler an einer geschlossenen Verbindung meldet den Abbruch');
      t.eq(r.close, 2, 'das Ereignis close meldet ihn ebenfalls');
      t.eq(r.log, ['message-too-big', 'webrtc'], 'die Fehler stehen im Log');
    },
  },
  {
    name: 'Flugschreiber Coop: der Client schickt sein Log in Stücken an den Host (auch mehr als ein Stück), der Host setzt es zusammen (gleiche Zahl Ereignisse, Rolle client, Kopf mit beiden Spielern), F9 am Client sendet und speichert, zu große und kaputte Stücke werden verworfen',
    async run(t) {
      await t.loadTool('loopnet.js'); await t.loadInpage('coop.js');
      const r = await t.page.evaluate(`(async () => { const { G, A, B } = ${SETUP}, o = {}; G.run(3);
        for (let i = 0; i < 2500; i++) B.flog().ev('fuell', 'Überfall "äöü" \\ ' + '漢字'.repeat(80) + i);
        const own = B.flog().dump({}, true).ereignisse.length; const n = B.flogSend(); G.run(1); o.n = n; const got = A.flogLogs()[1]; o.got = got ? [got.log.rolle, got.log.runden[0].meta.spieler.length, got.log.ereignisse.length - 0 >= own - 5, got.bytes > 40000] : null;
        o.hostEv = A.flog().dump().ereignisse.filter(e => e[2] === 'netz').map(e => e[3][0]).filter(x => /Log/.test(x));
        // F9 am Client: sendet und speichert
        const oc = HTMLAnchorElement.prototype.click, dl = []; HTMLAnchorElement.prototype.click = function () { if (this.download) dl.push(this.download); };
        try { ${KEY('B.cv', 'F9')}; G.run(1); o.f9 = dl.length; o.f9Name = /-client-/.test(dl[0] || ''); } finally { HTMLAnchorElement.prototype.click = oc; }
        // Fremdes: zu grosses Stueck, falsche Nummer, kaputtes JSON
        const before = Object.keys(A.flogLogs()).length; A.NET.conns[0] && 0;
        const c = A.NET.conns[0]; c.onmsg({ t: 'lg', i: 99, k: 0, n: 1, d: 'x'.repeat(50000) }); c.onmsg({ t: 'lg', i: 98, k: 5, n: 2, d: '{}' }); c.onmsg({ t: 'lg', i: 97, k: 0, n: 1, d: '{kaputt' });
        o.bad = [Object.keys(A.flogLogs()).length === before, A.flog().dump().ereignisse.filter(e => e[2] === 'netz' && e[3][0] === 'Log kaputt').length];
        o.stat = [G.net.stat.big, G.net.stat.max]; const bn = G.net.stat.big; B.NET.conn.send({ t: 'x', d: 'a'.repeat(17000) }); G.run(1); o.limit = [G.net.stat.big - bn, A.get().players.length]; o.conn = [A.NET.conns.length, B.state().role];
        return o; })()`);
      t.ok(r.n >= 6, 'das Log braucht viele kleine Stücke: ' + r.n);
      t.eq(r.stat[0], 0, 'keine Nachricht erreichte die PeerJS-Grenze (16.300 Byte, die Test-Leitung wirft größere weg, am 26. Oktober 2026 riss ein Log-Stück von 40.000 Zeichen die Verbindung ab)');
      t.ok(r.stat[1] < 14000, 'größte Nachricht in Byte, auch mit Umlauten und Anführungszeichen: ' + r.stat[1]);
      t.eq(r.limit, [1, 2], 'die Test-Leitung wirft eine zu große Nachricht wie PeerJS weg (und zählt sie), das Spiel läuft weiter');
      t.eq(r.conn, [1, 'client'], 'die Verbindung bleibt offen');
      t.eq(r.got, ['client', 2, true, true], 'beim Host: Rolle client, Kopf mit 2 Spielern, Ereignisse vollständig, über 40.000 Zeichen');
      t.ok(r.hostEv.includes('Log erhalten'), 'der Host nennt den Empfang: ' + JSON.stringify(r.hostEv));
      t.eq([r.f9, r.f9Name], [1, true], 'F9 am Client speichert die eigene Datei');
      t.eq(r.bad, [true, 1], 'zu großes und falsch nummeriertes Stück werden verworfen, kaputtes JSON wird gemeldet');
    },
  },
  {
    name: 'Flugschreiber Coop: F9 am Host fragt die Clients (lgq) und schreibt nach 1,5 s eine Datei mit dem eigenen Log und den Logs der Mitspieler unter peers (Kopf, Ereignisse, Messzeilen des Clients, Abgleich, Mitspieler)',
    async run(t) {
      await t.loadTool('loopnet.js'); await t.loadInpage('coop.js');
      const r = await t.page.evaluate(`(async () => { const { G, A, B } = ${SETUP}, o = {}; G.run(8);
        const oc = HTMLAnchorElement.prototype.click, dl = []; HTMLAnchorElement.prototype.click = function () { if (this.download) dl.push({ n: this.download, h: this.href }); };
        try { ${KEY('A.cv', 'F9')}; o.sofort = dl.length; G.run(.5); o.nachHalb = dl.length; G.run(2); o.danach = dl.length; o.name = dl[0] && /-host-/.test(dl[0].n);
          const j = await (await fetch(dl[0].h)).json(); o.j = { rolle: j.rolle, peers: Object.keys(j.peers || {}), pr: j.peers && j.peers[1] ? [j.peers[1].log.rolle, j.peers[1].log.messzeilen.zeilen.length > 3, j.peers[1].log.ereignisse.some(e => e[2] === 'netz'), j.peers[1].log.runden[0].meta.spieler.length] : null, abgleich: j.abgleich ? [j.abgleich.n, j.abgleich.bad, j.abgleich.felder.length] : null, mit: (j.mitspieler || []).length };
        } finally { HTMLAnchorElement.prototype.click = oc; }
        o.zweiter = (() => { const o2 = HTMLAnchorElement.prototype.click, d2 = []; HTMLAnchorElement.prototype.click = function () { if (this.download) d2.push(1); }; try { ${KEY('A.cv', 'F9')}; G.run(1); ${KEY('A.cv', 'F9')}; G.run(1); } finally { HTMLAnchorElement.prototype.click = o2; } return d2.length; })();
        return o; })()`);
      t.eq([r.sofort, r.nachHalb, r.danach], [0, 0, 1], 'der Host speichert erst nach der Wartezeit, genau eine Datei');
      t.ok(r.name, 'Dateiname nennt die Rolle host');
      t.eq([r.j.rolle, r.j.peers], ['host', ['1']], 'die Datei hat das Log des Hosts und unter peers das des Mitspielers 1');
      t.eq(r.j.pr, ['client', true, true, 2], 'Log des Clients: Rolle, Messzeilen, Netz-Ereignisse, Kopf mit 2 Spielern');
      t.ok(r.j.abgleich && r.j.abgleich[0] >= 1 && r.j.abgleich[2] === 16, 'der Abgleich steht in der Datei (Vergleiche, Abweichungen, 16 Felder): ' + JSON.stringify(r.j.abgleich));
      t.eq(r.j.mit, 2, 'die Mitspielerliste');
      t.eq(r.zweiter, 1, 'ein zweites F9 während des Sammelns setzt die Wartezeit nicht zurück: nach 2 s ist genau eine Datei da');
    },
  },
  {
    name: 'Zustandsabgleich: ohne Eingriff laufen Host und Client im Gefecht (Überfall, Welle, Polizei) alle 5 s gleich (keine Abweichung), flogChk meldet jedes abweichende Feld mit Namen und Werten, fehlende Gegenzeilen werden gezählt',
    async run(t) {
      await t.loadTool('loopnet.js'); await t.loadInpage('coop.js');
      const r = await t.page.evaluate(`(() => { const { G, A, B } = ${SETUP}, o = {}; A.CFG.policeAt = 8; A.CFG.policeForced = 8; G.run(32);
        const st = A.flogStat(); o.stat = [st.n, st.bad, st.keine]; o.ph = A.get().phase; o.polizei = A.get().en.length;
        // gezielt: abweichende Zeile fuer ein bekanntes T
        const T = A.get().time; const h = A.chkVec(); const bad = h.slice(); bad[2] += 3; bad[6] += 1; A.NET.chkH.push([123.45, h]); A.flogChk(1, { t: 'chk', T: 123.45, c: bad }); const s2 = A.flogStat();
        o.diff = s2.letzte[s2.letzte.length - 1].d.map(x => x[0]); o.vals = s2.letzte[s2.letzte.length - 1].d[0]; o.n2 = [s2.n, s2.bad];
        A.flogChk(1, { t: 'chk', T: 999999, c: h }); o.keine = A.flogStat().keine; A.flogChk(1, { t: 'chk', T: 123.45, c: 'kaputt' }); o.same = A.flogStat().n; A.flogChk(1, { t: 'chk', T: 123.45, c: h.concat([1]) }); o.laenge = A.flogStat().letzte.slice(-1)[0].d.map(x => x[0]);
        o.ereignis = A.flog().dump().ereignisse.filter(e => e[2] === 'abgleich').length;
        return o; })()`);
      t.ok(r.stat[0] >= 4, 'in 32 s mindestens 4 Vergleiche (alle 5 s): ' + JSON.stringify(r.stat));
      t.eq(r.stat[1], 0, 'keine Abweichung zwischen Host und Client im Gefecht (Überfall, Polizei: ' + r.polizei + ' Gegner)');
      t.eq(r.ph, 2, 'der Überfall lief');
      t.eq(r.diff, ['kills', 'gegner'], 'abweichende Felder mit Namen');
      t.eq(r.vals.slice(0, 1), ['kills'], 'Name, Host-Wert, Client-Wert');
      t.eq(r.vals[2] - r.vals[1], 3, 'Client-Wert 3 über dem Host-Wert');
      t.eq(r.n2.slice(1), [r.stat[1] + 1], 'Abweichungen zählen hoch');
      t.eq(r.keine, r.stat[2] + 1, 'ohne Gegenzeile zählt keine');
      t.eq(r.same, r.stat[0] + 1, 'kaputte Zeile (keine Liste) zählt nicht');
      t.ok(r.laenge.includes('laenge'), 'andere Länge wird gemeldet');
      t.ok(r.ereignis >= 1, 'Abweichung steht als Ereignis im Log des Hosts');
    },
  },
];
