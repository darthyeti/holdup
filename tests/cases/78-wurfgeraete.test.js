// Wurfgeraete (Oktober 2026): Rauchgranate (4), Ablenker (5), seit MRU 1 A1 ohne die gestrichene Blendgranate (Taste 3 ist frei, siehe 95-blend-gestrichen). Taste halten und loslassen, Zielring, Rauch sperrt Sicht, Wachen gehen zum Ablenker, Coop.
const SETUP2 = () => {   // Bank klassisch, Ueberfall, keine Polizei, Spieler mit Vorrat, Spielstand ruhig
  const D = __dbg; D.CFG.policeAt = 1e6; D.CFG.policeForced = 1e6;
  D.sessReset(); D.SESSION.cons = { sm: 3, dc: 3 }; D.reset();
};

module.exports = [
  {
    name: 'Wurf: Zielpunkt liegt frei auf der Strecke zur Maus (nur auf 300 Pixel begrenzt), eine Wand dazwischen macht ihn blockiert statt ihn zu kürzen',
    async run(t) {
      const r = await t.page.evaluate(() => {
        const D = __dbg, me = D.get().me, out = {};
        me.x = 12 * 32 + 16; me.y = 14 * 32 + 16;    // Gehsteig vor der Bank, frei
        const a = D.throwPoint(me, me.x + 100, me.y); out.near = [Math.round(a.x - me.x), Math.round(a.y - me.y), a.blocked, a.far];
        const b = D.throwPoint(me, me.x + 900, me.y); out.far = [Math.round(b.x - me.x), b.blocked, b.far];
        const c = D.throwPoint(me, me.x, me.y - 200); out.wall = [Math.round(c.y - me.y), c.blocked, c.far, c.hit ? Math.round(c.hit.y - me.y) : null];   // die Fassade der Bank liegt 1,5 Kacheln weiter nördlich
        return out;
      });
      t.eq(r.near, [100, 0, false, false], 'Ziel in Reichweite: genau dort');
      t.ok(r.far[0] === 300 && r.far[2] === true, 'zu weit: auf 300 Pixel gekürzt: ' + JSON.stringify(r.far));
      t.eq([r.wall[0], r.wall[1], r.wall[2]], [-200, true, false], 'Ziel bleibt an der Maus, der Wurf ist blockiert: ' + JSON.stringify(r.wall));
      t.ok(r.wall[3] > -200 && r.wall[3] < -20, 'die Sperre liegt zwischen Figur und Ziel (Kreuz): ' + JSON.stringify(r.wall));
      t.eq([r.near[2], r.far[1]], [false, false], 'freie Strecken sind nicht blockiert');
    },
  },
  {
    name: 'Wurf: ein blockierter Wurf wird nicht ausgeführt (Vorrat bleibt, nichts fliegt, Hinweis), ein freier Wurf geht wie bisher',
    async run(t) {
      const r = await t.page.evaluate(() => {
        const D = __dbg, cv = document.getElementById('c'), out = {};
        D.CFG.policeAt = 1e6; D.CFG.policeForced = 1e6; D.sessReset(); D.SESSION.cons = { sm: 2, dc: 1 }; D.reset(); D.startHeist(false, D.get().me);
        const me = D.get().me; me.x = 12 * 32 + 16; me.y = 14 * 32 + 16; D.update(1 / 30);
        const box = cv.getBoundingClientRect(), mv = (sx, sy) => cv.dispatchEvent(new MouseEvent('mousemove', { clientX: box.left + sx * box.width / 960, clientY: box.top + sy * box.height / 544, bubbles: true }));
        // Maus 120 Pixel ueber der Figur, also hinter der Fassade
        mv(480, 272 - 120); D.draw(); const ty = D.mouse.y;
        cv.dispatchEvent(new KeyboardEvent('keydown', { key: '4', bubbles: true })); D.draw();
        const a = D.aimPoint(); out.aim = [Math.round(a.y - ty), a.blocked, !!a.hit];
        cv.dispatchEvent(new KeyboardEvent('keyup', { key: '4', bubbles: true }));
        out.fl = me.sm; out.gr = D.gren().gr.length; out.banner = (D.msgs().banner || '');
        // der Host verweigert dasselbe, falls ein Client es trotzdem schickt
        D.useGadget(me, 4, me.x, me.y - 120); out.fl2 = me.sm; out.gr2 = D.gren().gr.length;
        // frei: Maus 140 Pixel rechts
        mv(480 + 140, 272); D.draw();
        cv.dispatchEvent(new KeyboardEvent('keydown', { key: '4', bubbles: true })); D.draw();
        out.aim2 = D.aimPoint().blocked;
        cv.dispatchEvent(new KeyboardEvent('keyup', { key: '4', bubbles: true }));
        out.fl3 = me.sm; out.gr3 = D.gren().gr.length;
        return out;
      });
      t.eq(r.aim, [0, true, true], 'der Ring sitzt auf der Maus (nicht an der Wand) und der Wurf ist blockiert: ' + JSON.stringify(r.aim));
      t.eq([r.fl, r.gr], [2, 0], 'Loslassen bei blockiertem Weg: kein Wurf, Vorrat bleibt');
      t.ok(/blockiert/.test(r.banner), 'Hinweis erscheint: ' + r.banner);
      t.eq([r.fl2, r.gr2], [2, 0], 'auch der Host wirft nicht, wenn ein Client ein blockiertes Ziel schickt');
      t.eq([r.aim2, r.fl3, r.gr3], [false, 1, 1], 'freier Weg: wirft wie bisher');
    },
  },
  {
    name: 'Wurf: Taste 4 halten zeigt den Ring, Loslassen wirft Richtung Maus, der Vorrat sinkt, Pause bricht ab',
    async run(t) {
      const r = await t.page.evaluate(() => {
        const D = __dbg, cv = document.getElementById('c'), out = {};
        D.CFG.policeAt = 1e6; D.CFG.policeForced = 1e6; D.sessReset(); D.SESSION.cons = { sm: 2, dc: 1 }; D.reset(); D.startHeist(false, D.get().me);
        const me = D.get().me; me.x = 12 * 32 + 16; me.y = 14 * 32 + 16; D.update(1 / 30);
        const box = cv.getBoundingClientRect(), sx = 480 + 140, sy = 272;   // Mitte plus 140 Pixel nach rechts (Welt = Bildschirm plus Kamera)
        cv.dispatchEvent(new MouseEvent('mousemove', { clientX: box.left + sx * box.width / 960, clientY: box.top + sy * box.height / 544, bubbles: true }));
        D.draw(); const tx = D.mouse.x, ty = D.mouse.y;
        cv.dispatchEvent(new KeyboardEvent('keydown', { key: '4', bubbles: true })); D.draw();
        out.aim = D.aimPoint(); out.heldOk = out.aim.x > me.x;
        cv.dispatchEvent(new KeyboardEvent('keyup', { key: '4', bubbles: true }));
        out.fl = me.sm; out.gr = D.gren().gr.map(q => [q.k, q.own, Math.round(q.vx) > 0]);
        out.want = [Math.round(tx), Math.round(ty), Math.round(me.x), Math.round(me.y)];
        // zweiter Versuch: halten, dann Pause: kein Wurf
        cv.dispatchEvent(new KeyboardEvent('keydown', { key: '4', bubbles: true }));
        cv.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        cv.dispatchEvent(new KeyboardEvent('keyup', { key: '4', bubbles: true }));
        out.fl2 = me.sm; out.gr2 = D.gren().gr.length;
        return out;
      });
      t.ok(r.heldOk, 'Zielring liegt rechts der Figur (Maus rechts): ' + JSON.stringify(r.aim));
      t.eq(r.fl, 1, 'Vorrat sinkt um eins'); t.eq(r.gr, [['smoke', 0, true]], 'eine Rauchgranate des Spielers fliegt nach rechts');
      t.eq(r.fl2, 1, 'Pause nach dem Halten: kein Wurf'); t.eq(r.gr2, 1, 'es fliegt nur die erste');
    },
  },
  {
    name: 'Wurf: Rauchgranate sperrt die Sicht, Beamte hinter dem Rauch verlieren das Ziel, nach 9 s ist er weg',
    async run(t) {
      const r = await t.page.evaluate(() => {
        const D = __dbg, out = {}, T = 32;
        D.CFG.policeAt = 1e6; D.CFG.policeForced = 1e6; D.sessReset(); D.SESSION.cons = { sm: 3 }; D.reset(); D.startHeist(false, D.get().me);
        const g = D.get(), me = g.me; g.en.length = 0;
        const ox = 12 * T + 16, oy = 14 * T + 16;
        const cop = D.mkCop(ox + 340, oy, false); cop.mode = 'push'; g.en.push(cop);
        // ohne Rauch sieht und beschiesst der Beamte den Spieler (react steigt)
        let r0 = 0; for (let i = 0; i < 30 * 1.5; i++) { me.x = ox; me.y = oy; me.hp = 1e9; cop.x = ox + 340; cop.y = oy; D.update(1 / 30); r0 = Math.max(r0, cop.react || 0); }
        out.ohne = +r0.toFixed(2);
        D.useGadget(me, 4, ox + 170, oy);
        for (let i = 0; i < 30 * 1.5; i++) { me.x = ox; me.y = oy; me.hp = 1e9; cop.x = ox + 340; cop.y = oy; D.update(1 / 30); }
        out.wolke = D.gren().gr.length === 0; out.n = JSON.stringify(D.get().cams ? 1 : 0);
        out.sicht = D.smoked(ox, oy, ox + 340, oy); out.daneben = D.smoked(ox, oy + 200, ox + 340, oy + 200);
        let r1 = 0; for (let i = 0; i < 30 * 2; i++) { me.x = ox; me.y = oy; me.hp = 1e9; cop.x = ox + 340; cop.y = oy; D.update(1 / 30); r1 = Math.max(r1, cop.react || 0); }
        out.mit = +r1.toFixed(2);
        for (let i = 0; i < 30 * 10; i++) { me.x = ox; me.y = oy; me.hp = 1e9; D.update(1 / 30); }
        out.weg = D.smoked(ox, oy, ox + 340, oy); out.sm = me.sm;
        return out;
      });
      t.ok(r.ohne > .3, 'ohne Rauch sieht der Beamte den Spieler: ' + r.ohne);
      t.ok(r.wolke && r.sicht && !r.daneben, 'Die Wolke sperrt die Sichtlinie, daneben nicht: ' + JSON.stringify(r));
      t.eq(r.mit, 0, 'im Rauch verliert der Beamte das Ziel'); t.ok(!r.weg, 'nach 9 s ist die Wolke weg'); t.eq(r.sm, 2, 'Vorrat sinkt um eins');
    },
  },
  {
    name: 'Wurf: Ablenker lockt Wachen zum Wurfpunkt (Gegenprobe ohne Wurf), nur beim Erkunden, Rauch nur im Überfall',
    open: { det: true },
    async run(t) {
      const r = await t.page.evaluate(() => {
        const D = __dbg, out = {}, T = 32;
        D.CFG.policeAt = 1e6;
        const start = () => { D.sessReset(); D.SESSION.cons = { sm: 2, dc: 2 }; D.reset(); const g = D.get(); return { g, me: g.me, guard: g.npcs.find(q => q.k === 'grd') }; };
        // Gegenprobe: wohin kommt die Wache in 25 s von allein?
        let { g, me, guard } = start(); out.hasGuard = !!guard; const trail = [];
        for (let i = 0; i < 30 * 25; i++) { me.x = 3 * T; me.y = 30 * T; D.update(1 / 30); if (i % 6 === 0) trail.push([guard.x, guard.y]); }
        // ein erreichbarer Punkt 6 bis 9 Kacheln von der Wache, den sie ohne Wurf nie naehrer als 90 Pixel besucht
        ({ g, me, guard } = start()); const gx = Math.floor(guard.x / T), gy = Math.floor(guard.y / T); let spot = null;
        for (let r = 6; r <= 10 && !spot; r++) for (let dx = -r; dx <= r && !spot; dx++) for (const dy of [-r, r, 0]) { const cx = gx + dx, cy = gy + dy; if (Math.max(Math.abs(dx), Math.abs(dy)) !== r || D.isSol(cx, cy)) continue; const px = cx * T + 16, py = cy * T + 16; if (trail.every(q => Math.hypot(q[0] - px, q[1] - py) > 90) && D.pathTo(guard.x, guard.y, cx, cy).length && D.los(guard.x, guard.y, px, py) !== undefined) { spot = [px, py]; break; } }
        out.spot = !!spot; if (!spot) return out;
        // Phase 1: Rauch verweigert
        me.x = spot[0]; me.y = spot[1] + 40; if (D.isSol(Math.floor(me.x / T), Math.floor(me.y / T))) me.y = spot[1] - 40;
        D.useGadget(me, 4, me.x + 50, me.y); out.deny = [me.sm];
        D.useGadget(me, 5, spot[0], spot[1]); out.dc = me.dc;
        let best = 1e9, atSpot = null;
        for (let i = 0; i < 30 * 25; i++) { me.x = spot[0]; me.y = spot[1] + (D.isSol(Math.floor(spot[0] / T), Math.floor((spot[1] + 40) / T)) ? -40 : 40); D.update(1 / 30); const d = Math.hypot(guard.x - spot[0], guard.y - spot[1]); if (d < best) best = d; if (atSpot == null && d < 40) atSpot = i / 30; }
        out.best = Math.round(best); out.atSpot = atSpot;
        D.startHeist(false, me); const dc0 = me.dc; D.useGadget(me, 5, me.x + 50, me.y); out.deny2 = me.dc === dc0;
        return out;
      });
      t.ok(r.hasGuard, 'die Karte hat eine Wache'); t.ok(r.spot, 'Testpunkt gefunden, den die Wache von allein nicht besucht');
      t.eq(r.deny, [2], 'Rauch geht beim Erkunden nicht'); t.eq(r.dc, 1, 'Ablenker geworfen, Vorrat sinkt');
      t.ok(r.atSpot != null && r.best < 40, 'die Wache geht zum Wurfpunkt: ' + JSON.stringify([r.best, r.atSpot]));
      t.ok(r.deny2, 'im Überfall geht der Ablenker nicht');
    },
  },
  {
    name: 'Wurf: Coop, der Client wirft (Taste halten, loslassen), Host rechnet, beide sehen Rauch und der Vorrat sinkt',
    async run(t) {
      await t.loadTool('loopnet.js'); await t.loadInpage('coop.js');
      const r = await t.page.evaluate(() => {
        const G = CT.mkGame('bank', 321, 2), A = G.A, B = G.clients[0];
        A.CFG.policeAt = 1e6; A.CFG.policeForced = 1e6;
        B.SESSION.cons = { sm: 2 }; B.openShop(); G.run(1); A.startNext(); G.run(2);
        B.cv.dispatchEvent(new KeyboardEvent('keydown', { key: 'f', bubbles: true })); G.run(1);
        const pb = A.get().players[1], out = { before: [A.get().players[1].sm, B.get().players[1].sm] };
        const sp = A.LAY().spawn; pb.x = sp.x; pb.y = sp.y;   // der Spawn liegt auf der Strasse vor der Bank, welche Kachel frei ist, haengt vom Treffpunkt der Zufallskarte ab
        const cvb = B.cv;
        B.mouse.sx = 600; B.mouse.sy = 272; B.mouse.t = B.get().time;   // das Test-Canvas hat keine Groesse, deshalb der Zeiger direkt
        B.draw(); cvb.dispatchEvent(new KeyboardEvent('keydown', { key: '4', bubbles: true })); B.draw(); cvb.dispatchEvent(new KeyboardEvent('keyup', { key: '4', bubbles: true }));
        for (let i = 0; i < 90; i++) { pb.x = sp.x; pb.y = sp.y; pb.hp = 1e9; step(G.insts, G.net, 1 / 60); }
        out.after = [A.get().players[1].sm, B.get().players[1].sm];
        G.run(1.5);
        out.cloud = [A.smokeN(), B.smokeN()];
        return out;
      });
      t.eq(r.before, [2, 2], 'Vorrat des Clients beim Host und beim Client'); t.eq(r.after, [1, 1], 'nach dem Wurf bei beiden um eins weniger');
      t.ok(r.cloud[0] === 1 && r.cloud[1] === 1, 'die Rauchwolke steht auf Host und Client: ' + JSON.stringify(r.cloud));
    },
  },
];
