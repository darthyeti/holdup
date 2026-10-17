// Menues, Shop und Pause: Ablauf ueber Tastatur (portabel) und Pixel-Schnappschuesse aller Bildschirme (nur lokal, siehe unten).
// Pixel-Schnappschuesse: golden-local/70-menues.json, nicht eingecheckt (Schrift und Rasterung haengen vom System ab). Vor einem Umbau der Menues
// `node run.js --update Pixel` laufen lassen, nach dem Umbau `node run.js Pixel`: Der Umbau darf kein Pixel veraendern.

const key = (d, k) => d.cv.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }));

module.exports = [
  {
    name: 'Menues: Titel, Coop-Menue, Raumcode und zurueck per Tastatur',
    async run(t) {
      const r = await t.page.evaluate(() => {
        const D = __dbg, cv = document.getElementById('c'), k = x => cv.dispatchEvent(new KeyboardEvent('keydown', { key: x, bubbles: true })), out = [];
        D.toTitle(); out.push(D.state().scr);
        k('c'); out.push(D.state().scr);
        k('j'); out.push(D.state().scr);
        k('A'); k('B'); k('Backspace'); k('Escape'); out.push(D.state().scr);
        k('Escape'); out.push(D.state().scr);
        const sc0 = D.scen(); k('t'); out.push(sc0 + '>' + D.scen());
        for (let i = 0; i < 6; i++) k('t'); out.push(D.scen());
        for (const s of ['title', 'coop']) { D.draw(); }
        return out;
      });
      t.eq(r.slice(0, 5), ['title', 'coop', 'join', 'coop', 'title'], 'Bildschirmfolge');
      t.eq(r[5], 'bank>truck', 'T schaltet den Auftrag weiter');
      t.eq(r[6], 'bank', 'sieben Mal T: sechs Auftraege plus Zufall, dann wieder Bank');
    },
  },
  {
    name: 'Menues: Enter startet solo, Esc pausiert, P geht weiter, M schaltet den Ton',
    async run(t) {
      const r = await t.page.evaluate(() => {
        const D = __dbg, cv = document.getElementById('c'), k = x => cv.dispatchEvent(new KeyboardEvent('keydown', { key: x, bubbles: true })), out = {};
        D.toTitle(); D.setFocus(true); k('Enter'); out.play = D.state();
        k('Escape'); out.paused = D.state().paused; D.draw();
        k('p'); out.resumed = D.state().paused;
        const m0 = D.SND.isMuted(); D.toTitle(); k('m'); out.muteToggled = D.SND.isMuted() !== m0; k('m');
        // Lautstaerke: Pfeiltasten im Titel
        const v0 = D.SND.vol('mus'); k('ArrowLeft'); const v1 = D.SND.vol('mus'); k('ArrowRight'); out.vol = [v0, v1, D.SND.vol('mus')];
        return out;
      });
      t.eq(r.play.scr, 'play', 'Enter startet den Auftrag'); t.eq(r.paused, true, 'Esc pausiert'); t.eq(r.resumed, false, 'P setzt fort');
      t.ok(r.muteToggled, 'M schaltet den Ton'); t.ok(r.vol[1] < r.vol[0] && r.vol[2] === r.vol[0], 'Pfeil links leiser, rechts wieder lauter: ' + r.vol);
    },
  },
  {
    name: 'Menues: Shop kauft per Zifferntaste, Enter startet den naechsten Auftrag',
    async run(t) {
      const r = await t.page.evaluate(() => {
        const D = __dbg, cv = document.getElementById('c'), k = x => cv.dispatchEvent(new KeyboardEvent('keydown', { key: x, bubbles: true })), out = {};
        D.sessReset(); D.SESSION.wallet = 200000; D.SESSION.round = 1;
        D.openShop(); out.scr = D.state().scr;
        const items = D.CFG.shop.items, keys = '1234567890-';
        out.n = items.length;
        const w0 = D.SESSION.wallet;
        for (let i = 0; i < items.length; i++) { D.draw(); k(keys[i]); }
        D.draw();
        out.bought = items.map(it => it.c ? (D.SESSION.cons[it.k] | 0) : (D.SESSION.own[it.k] ? 1 : 0));
        out.spent = w0 - D.SESSION.wallet;
        out.keys = items.map(it => it.k);
        k('Enter'); out.after = D.state().scr; out.round = D.SESSION.round;
        D.sessReset();
        return out;
      });
      t.eq(r.scr, 'shop', 'openShop'); t.eq(r.n, 11, 'elf Posten');
      t.ok(r.bought.every(x => x > 0 || false), 'alles gekauft: ' + JSON.stringify(r.bought) + ' ' + r.keys.join(','));
      t.ok(r.spent > 0, 'Konto hat sich verringert');
      t.eq(r.after, 'play', 'Enter startet den naechsten Auftrag');
    },
  },
  {
    name: 'Pixel: alle Bildschirme (Titel, Coop, Raumcode, Lobby, Shop, Pause, Spiel) bleiben unveraendert',
    open: { det: true },
    timeout: 120000,
    async run(t) {
      await t.loadTool('loopnet.js');
      const hashes = await t.page.evaluate(() => {
        const net = LoopNet(30, 0), out = {};
        const hash = d => { const c = d.cv, x = c.getContext('2d'), a = new Uint32Array(x.getImageData(0, 0, c.width, c.height).data.buffer); let h = 2166136261; for (let i = 0; i < a.length; i += 3) { h ^= a[i]; h = Math.imul(h, 16777619); } return (h >>> 0).toString(16); };
        const shot = (d, name) => { d.draw(); d.draw(); out[name] = hash(d); };
        const k = (d, x) => d.cv.dispatchEvent(new KeyboardEvent('keydown', { key: x, bubbles: true }));
        const adv = (d, s) => { for (let i = 0; i < s * 60; i++) d.tick(1 / 60); };
        // Solo-Instanz
        const S = mkInst(net, 's'); S.toTitle(); adv(S, 2);
        shot(S, 'titel'); k(S, 't'); shot(S, 'titel-truck'); for (let i = 0; i < 4; i++) k(S, 't'); shot(S, 'titel-casino');
        k(S, 'ArrowLeft'); shot(S, 'titel-lautstaerke'); k(S, 'ArrowLeft'); k(S, 'ArrowRight');
        k(S, 'c'); shot(S, 'coop'); k(S, 'j'); shot(S, 'join-leer'); k(S, 'A'); k(S, 'B'); k(S, 'K'); shot(S, 'join-code'); k(S, 'Escape'); k(S, 'Escape'); S.toTitle();
        S.SESSION.round = 3; S.SESSION.wallet = 45000; shot(S, 'titel-serie');
        S.sessReset(); S.SESSION.wallet = 30000; S.SESSION.round = 2; S.openShop(); shot(S, 'shop-30k'); k(S, '1'); k(S, '2'); k(S, '5'); shot(S, 'shop-gekauft'); k(S, '9'); k(S, '9'); shot(S, 'shop-zu-teuer');
        S.SESSION.wallet = 0; shot(S, 'shop-leer');
        S.sessReset(); S.toTitle(); k(S, 'Enter'); adv(S, 1.5); shot(S, 'spiel-phase1'); k(S, 'Escape'); shot(S, 'pause'); k(S, 'ArrowDown'); k(S, 'ArrowRight'); shot(S, 'pause-lautstaerke'); k(S, 'p');
        // Coop-Lobby
        const A = mkInst(net, 'a'), B = mkInst(net, 'b'); A.hostRoom(); for (let i = 0; i < 20; i++) step([A, B], net, 1 / 60);
        B.joinRoom(A.NET.code); for (let i = 0; i < 120; i++) step([A, B], net, 1 / 60);
        shot(A, 'lobby-host'); shot(B, 'lobby-client');
        A.startCoop(); for (let i = 0; i < 60; i++) step([A, B], net, 1 / 60); shot(A, 'coop-spiel-host');
        return out;
      });
      t.note(Object.keys(hashes).length + ' Bildschirme');
      await t.snapshot('pixel', hashes, { local: true });
    },
  },
  {
    name: 'Pixel: Randfaelle (Shop im Coop, Hover, Fehlermeldungen, Namenseingabe, Lobby zu dritt)',
    open: { det: true },
    timeout: 120000,
    async run(t) {
      await t.loadTool('loopnet.js');
      const hashes = await t.page.evaluate(() => {
        const net = LoopNet(30, 0), out = {};
        const hash = d => { const c = d.cv, x = c.getContext('2d'), a = new Uint32Array(x.getImageData(0, 0, c.width, c.height).data.buffer); let h = 2166136261; for (let i = 0; i < a.length; i += 3) { h ^= a[i]; h = Math.imul(h, 16777619); } return (h >>> 0).toString(16); };
        const shot = (d, name) => { d.draw(); d.draw(); out[name] = hash(d); };
        const k = (d, x) => d.cv.dispatchEvent(new KeyboardEvent('keydown', { key: x, bubbles: true }));
        const adv = (d, s) => { for (let i = 0; i < s * 60; i++) d.tick(1 / 60); };
        const S = mkInst(net, 's'); S.toTitle(); adv(S, 1);
        // Hover im Shop und auf der Weiter-Schaltflaeche, Hinweiszeile
        S.sessReset(); S.SESSION.wallet = 50000; S.SESSION.round = 4; S.openShop();
        S.mouse.sx = 200; S.mouse.sy = 120; shot(S, 'shop-hover-kaufbar'); S.mouse.sx = 600; S.mouse.sy = 400; shot(S, 'shop-hover-rechts');
        S.mouse.sx = 480; S.mouse.sy = 490; shot(S, 'shop-hover-weiter'); k(S, '3'); shot(S, 'shop-hinweis'); k(S, '4'); k(S, '4'); shot(S, 'shop-schon-gekauft');
        S.SESSION.wallet = 1e7; for (const x of '1234567890-') k(S, x); shot(S, 'shop-alles'); k(S, 'u'); shot(S, 'shop-alles-2');
        S.sessReset(); S.toTitle(); adv(S, .5);
        // Titel mit Meldung und Peer-Fehler im Coop-Menue, Namenseingabe
        k(S, 'c'); const P = window.Peer; window.Peer = undefined; shot(S, 'coop-ohne-peer'); window.Peer = P;
        k(S, 'n'); shot(S, 'coop-name-edit'); for (const x of 'Kim') k(S, x); shot(S, 'coop-name-kim'); k(S, 'Enter'); shot(S, 'coop-name-fertig');
        k(S, 'j'); for (const x of 'ABCD') k(S, x); shot(S, 'join-voll'); k(S, 'Escape'); k(S, 'Escape');
        // Coop zu dritt: Lobby, Shop mit Bereit-Markierung
        const A = mkInst(net, 'a'), B = mkInst(net, 'b'), C = mkInst(net, 'c'); A.setName('Ada'); B.setName('Bo'); C.setName('Cy');
        A.hostRoom(); for (let i = 0; i < 20; i++) step([A, B, C], net, 1 / 60);
        B.joinRoom(A.NET.code); for (let i = 0; i < 60; i++) step([A, B, C], net, 1 / 60);
        C.joinRoom(A.NET.code); for (let i = 0; i < 120; i++) step([A, B, C], net, 1 / 60);
        shot(A, 'lobby3-host'); shot(C, 'lobby3-client');
        A.startCoop(); for (let i = 0; i < 120; i++) step([A, B, C], net, 1 / 60);
        for (const d of [A, B, C]) { d.sessReset && 0; }
        A.SESSION.wallet = 80000; A.SESSION.round = 2; A.openShop(); for (let i = 0; i < 60; i++) step([A, B, C], net, 1 / 60);
        shot(A, 'shop3-host'); k(B, 'Enter'); for (let i = 0; i < 60; i++) step([A, B, C], net, 1 / 60); shot(A, 'shop3-host-bereit'); shot(B, 'shop3-client-bereit');
        return out;
      });
      t.note(Object.keys(hashes).length + ' Bildschirme');
      await t.snapshot('pixel-randfaelle', hashes, { local: true });
    },
  },
];
