// MRU 1 A1 (docs/major-release-update-1.md, docs/ideen-und-planung.md, Zusaetze): Die Blendgranate des Shops ist ersatzlos gestrichen (Till: sie spielt sich nicht gut). Weg sind der Posten fl im Shop-Katalog, der Vorrat im Kit
// und im Netz-Schnappschuss, Taste 3 (frei fuer den Gegenstand aus dem Skillbaum, MRU 1 B1), die Betaeubung der Beamten und Wachen (e.stun, CFG.gadget.stun und stunR) und der Eintrag in Steuerung und Gadget-Zeile.
// Die Blendgranaten der Polizei gegen die Spieler bleiben (flashBang, CFG.gren.flash, Test 30-polizei), Rauch (4) und Ablenker (5) bleiben.
module.exports = [
  {
    name: 'Blendgranate gestrichen: kein Posten im Shop-Katalog, kein Vorrat im Kit, keine Betäubungswerte, die Posten Rauch und Ablenker bleiben',
    async run(t) {
      const r = await t.page.evaluate(() => {
        const D = __dbg, out = {};
        D.sessReset(); D.SESSION.cons = { sm: 2, dc: 1 }; D.reset(); const me = D.get().me;
        out.items = D.CFG.shop.items.map(i => i.k); out.flMax = D.CFG.shop.flMax; out.stun = [D.CFG.gadget.stun, D.CFG.gadget.stunR];
        out.meFl = me.fl; out.kit = Object.keys(me.kit).includes('fl'); out.san = Object.keys(D.sanKit({ fl: 99, sm: 99 })).includes('fl'); out.cons = Object.keys(D.SESSION.cons).includes('fl');
        D.keepKit(); out.keep = Object.keys(D.SESSION.cons).includes('fl');
        return out;
      });
      t.ok(!r.items.includes('fl') && r.items.includes('sm') && r.items.includes('dc'), 'Shop-Katalog ohne fl, mit Rauch und Ablenker: ' + JSON.stringify(r.items));
      t.eq([r.flMax, r.stun], [undefined, [undefined, undefined]], 'weder Vorratsgrenze noch Betäubungswerte');
      t.eq([r.meFl, r.kit, r.san, r.cons, r.keep], [undefined, false, false, false, false], 'der Spieler hat kein fl, Kit, sanKit und Vorrat führen es nicht');
    },
  },
  {
    name: 'Blendgranate gestrichen: Taste 3 tut nichts (kein Zielring, kein Wurf, keine Meldung), auch nicht über den Host-Weg useGadget; Taste 4 wirft weiter',
    async run(t) {
      const r = await t.page.evaluate(() => {
        const D = __dbg, cv = document.getElementById('c'), out = {};
        D.CFG.policeAt = 1e6; D.CFG.policeForced = 1e6; D.sessReset(); D.SESSION.cons = { sm: 2, dc: 1 }; D.reset(); D.startHeist(false, D.get().me);
        const me = D.get().me; me.x = 12 * 32 + 16; me.y = 14 * 32 + 16; D.update(1 / 30);
        const box = cv.getBoundingClientRect();
        cv.dispatchEvent(new MouseEvent('mousemove', { clientX: box.left + (480 + 140) * box.width / 960, clientY: box.top + 272 * box.height / 544, bubbles: true }));
        D.draw();
        cv.dispatchEvent(new KeyboardEvent('keydown', { key: '3', bubbles: true })); D.draw();
        cv.dispatchEvent(new KeyboardEvent('keyup', { key: '3', bubbles: true }));
        out.gr3 = D.gren().gr.length; out.sm3 = me.sm; out.banner = (D.msgs().banner || '');
        D.useGadget(me, 3, me.x + 100, me.y); out.gr3b = D.gren().gr.length; out.sm3b = me.sm;
        cv.dispatchEvent(new KeyboardEvent('keydown', { key: '4', bubbles: true })); D.draw(); cv.dispatchEvent(new KeyboardEvent('keyup', { key: '4', bubbles: true }));
        out.gr4 = D.gren().gr.map(q => q.k); out.sm4 = me.sm;
        return out;
      });
      t.eq([r.gr3, r.sm3, /Vorrat|Blend|nützlich|blockiert/.test(r.banner)], [0, 2, false], 'Taste 3 halten und loslassen: nichts fliegt, Vorrat bleibt, keine Meldung zu Wurf oder Vorrat: ' + JSON.stringify(r));
      t.eq([r.gr3b, r.sm3b], [0, 2], 'useGadget mit 3 (ein Client könnte es schicken) wirft nichts');
      t.eq([r.gr4, r.sm4], [['smoke'], 1], 'Taste 4 wirft die Rauchgranate wie bisher');
    },
  },
  {
    name: 'Blendgranate gestrichen: die Polizei blendet Spieler weiter (flashBang), Beamte und Wachen werden nie betäubt (kein stun-Feld), Steuerungstext nennt Taste 3 nicht mehr',
    async run(t) {
      const r = await t.page.evaluate(async () => {
        const D = __dbg, out = {};
        D.CFG.policeAt = 1e6; D.CFG.policeForced = 1e6; D.sessReset(); D.reset(); D.startHeist(false, D.get().me);
        const g = D.get(), me = g.me; g.en.length = 0; const c = D.mkCop(me.x + 150, me.y, false); g.en.push(c);
        me.bl = 0; D.flashBang(me.x + 10, me.y); out.bl = me.bl > 0;
        for (let i = 0; i < 30; i++) D.update(1 / 30);
        out.stun = g.en.some(e => e.stun > 0) || g.npcs.some(n => n.stun > 0);
        const txt = await (await fetch('js/ui.js')).text();
        out.ctrl = /3 \/ 4 \/ 5 halten/.test(txt) || /Blend, Rauch/.test(txt); out.ctrl45 = /4 \/ 5 halten/.test(txt); out.shopFl = /'fl'/.test(txt);
        return out;
      });
      t.ok(r.bl, 'die Blendgranate der Polizei blendet den Spieler weiter');
      t.ok(!r.stun, 'niemand ist betäubt');
      t.eq([r.ctrl, r.ctrl45, r.shopFl], [false, true, false], 'Steuerungstext und Shop-Gruppen in js/ui.js ohne Blend und ohne fl');
    },
  },
];
