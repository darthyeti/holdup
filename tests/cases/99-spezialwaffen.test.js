// MRU 1 B4 (docs/major-release-update-1.md, docs/ideen-und-planung.md, Skillbaum-Umbau, Gegenstaende): Besondere Waffen. Das Praezisionsgewehr (A3, hinter Ruhige Hand) und der Granatwerfer (A4, hinter Durchschlag) teilen sich die Umschaltung auf Shift
// (Shift schaltet im Ueberfall ein und aus, eingeschaltet zeigt die Zielhilfe, Linksklick oder Leertaste schiesst, die normale Waffe schweigt, nur mit Vorrat, Stueck je Auftrag aus dem Knoten, Abklingzeit CFG.spw.*.cool). Das Gewehr schiesst eine schnelle Kugel mit pr: 100 Schaden, geht durch alle Gegner in der Linie
// und an Schilden vorbei (dort nur schield mal Schaden), 50 % mehr gegen SWAT und Scharfschuetzen (elite). Der Werfer verschiesst eine Granate (gr, k shell), die am Zielpunkt oder im Flug am ersten Gegner platzt (blastAt: dmg gegen Beamte,
// pdmg gegen Spieler, die Explosion trifft alle). VER 39. Aufbau wie 99-sprengfalle: Bank Seed 5017 (nach S gedreht, keine Polizei von allein), ein freier waagrechter Streifen, Beamte und Spieler werden festgehalten.
const HELP = `(() => {
  const D = __dbg, T = 32;
  const strip = () => { const w = D.world(); for (let ty = w.WY0 + 2; ty < w.WY0 + w.H - 2; ty++) for (let tx = w.WX0 + 9; tx < w.WX0 + w.W - 3; tx++) { const x = tx * T + 16, y = ty * T + 16; let ok = true;
    for (let d = -240; d <= 70 && ok; d += 12) for (const dy of [-1, 0, 1]) if (D.isSol(Math.floor((x + d) / T), ty + dy)) ok = false;
    if (ok && D.clear(x - 240, y, x + 70, y)) return { x, y }; } return null; };
  const scene = (sk, phase1) => { D.sessReset(); Object.assign(D.SESSION.sk, sk || {}); D.setScenario('bank'); D.setSeedMode('random'); D.setLage([]); D.setTurn('S'); D.buildSeed(5017); D.CFG.policeAt = 1e6; D.CFG.policeForced = 1e6;
    D.reset(); if (!phase1) D.startHeist(false, D.get().me); const g = D.get(), me = g.me, sp = strip(); if (!sp) return null; g.en.length = 0; me.x = sp.x; me.y = sp.y; me.hp = 100; me.inv = 0; me.ar = 0; return { D, g, me, sp }; };
  const cop = (sc, x, y, kind) => { const c = kind === 'sniper' ? D.mkSniper({ x, y, a: Math.PI }) : D.mkCop(x, y, kind || false); if (kind === 'sniper') { c.cd = 1e9; } else { c.mode = 'post'; c.post = { x, y, a: Math.PI, door: null }; c.rt = 1e9; c.cool = 1e9; } c.a = Math.PI; sc.g.en.push(c); return c; };
  const run = (sc, sec, pin, god) => { for (let i = 0; i < sec * 30; i++) { if (god) sc.me.hp = 1e9; for (const [f, x, y] of pin || []) { f.x = x; f.y = y; } D.update(1 / 30); } };
  const aimAt = (d, x, y) => { d.draw(); const m = d.mouse, cx = m.x - m.sx, cy = m.y - m.sy; m.sx = x - cx; m.sy = y - cy; m.t = d.get().time; d.draw(); };
  return { D, strip, scene, cop, run, aimAt };
})()`;

module.exports = [
  {
    name: 'Besondere Waffen: Praezisionsgewehr (A3) und Granatwerfer (A4) sind keine Platzhalter mehr, Stueck je Stufe 3, 5, 7 und 2, 3, 4, die Art folgt dem Knoten, ohne Knoten kein Vorrat, Entweder-oder verhindert beide',
    async run(t) {
      const r = await t.page.evaluate(`(() => { const H = ${HELP}, D = H.D, S = D.CFG.skill, o = {};
        o.nodes = ['A3', 'A4'].map(id => [S[id].n, !!S[id].soon, S[id].cnt]); o.cfg = Object.keys(D.CFG.spw || {}).sort();
        const kit = sk => { const sc = H.scene(sk, true); return [sc.me.sx | 0, D.spwKind(sc.me)]; };
        o.k0 = kit({}); o.rifle = [1, 2, 3].map(l => kit({ A3: l })); o.launch = [1, 2, 3].map(l => kit({ A4: l }));
        D.sessReset(); D.SESSION.pts = 30; const buy = id => D.skillBuy(id); for (let i = 0; i < 3; i++) buy('A0'); for (let i = 0; i < 3; i++) buy('A1'); o.a3 = buy('A3'); o.a4 = buy('A4'); o.sk = Object.assign({}, D.SESSION.sk);
        return o; })()`);
      t.eq(r.nodes, [['Präzisionsgewehr', false, [3, 5, 7]], ['Granatwerfer', false, [2, 3, 4]]], 'beide Knoten kaufbar, Stueck je Stufe');
      t.eq(r.cfg, ['launch', 'rifle'], 'CFG.spw hat rifle und launch');
      t.eq(r.k0, [0, null], 'ohne Knoten kein Vorrat und keine Art');
      t.eq(r.rifle, [[3, 'rifle'], [5, 'rifle'], [7, 'rifle']], 'A3: Gewehr, 3, 5, 7 Schuss');
      t.eq(r.launch, [[2, 'launch'], [3, 'launch'], [4, 'launch']], 'A4: Werfer, 2, 3, 4 Granaten');
      t.eq([r.a3, r.a4, r.sk.A3, r.sk.A4], [true, false, 1, undefined], 'Entweder-oder: hinter Ruhige Hand gibt es das Gewehr, der Werfer hinter Durchschlag ist verbaut');
    },
  },
  {
    name: 'Gewehr schiessen: nur im Ueberfall (Erkunden abgelehnt mit Hinweis), Abklingzeit zwischen zwei Schuessen, Vorrat sinkt, ohne Vorrat und ohne Knoten tut die Spezialwaffe nichts, die Kugel traegt pr, ist schnell und weit',
    async run(t) {
      const r = await t.page.evaluate(`(() => { const H = ${HELP}, D = H.D, Q = D.CFG.spw.rifle, o = {};
        let sc = H.scene({ A3: 1 }, true); D.useGadget(sc.me, 6, sc.sp.x - 100, sc.sp.y); o.p1 = [sc.me.sx, sc.g.bl.length, (D.msgs().banner || '').length > 0];
        sc = H.scene({ A3: 1 }); D.useGadget(sc.me, 6, sc.sp.x - 100, sc.sp.y); const b = sc.g.bl[0]; o.b = b ? [!!b.pr, b.o, b.d, Math.round(Math.hypot(b.vx, b.vy)), Math.round(b.l * 100) / 100, b.own, Math.round(Math.atan2(b.vy, b.vx) * 100) / 100] : null; o.range = b ? Math.round(Math.hypot(b.vx, b.vy) * b.l) : 0;
        o.s1 = [sc.me.sx, sc.me.scool > 0]; D.useGadget(sc.me, 6, sc.sp.x - 100, sc.sp.y); o.s2 = [sc.me.sx, sc.g.bl.filter(q => q.pr).length];     // sofort noch einmal: abgelehnt (Abklingzeit)
        H.run(sc, Q.cool + .2); D.useGadget(sc.me, 6, sc.sp.x - 100, sc.sp.y); o.s3 = sc.me.sx;
        H.run(sc, Q.cool + .2); D.useGadget(sc.me, 6, sc.sp.x - 100, sc.sp.y); o.s4 = sc.me.sx; H.run(sc, Q.cool + .2); const n0 = sc.g.bl.length; D.useGadget(sc.me, 6, sc.sp.x - 100, sc.sp.y); o.dry = [sc.me.sx, sc.g.bl.length - n0];
        sc = H.scene({}); const bn = D.msgs().banner || ''; D.useGadget(sc.me, 6, sc.sp.x - 100, sc.sp.y); o.none = [sc.g.bl.length, (D.msgs().banner || '') === bn];
        o.normal = 720 * .8; return o; })()`);
      t.eq(r.p1, [3, 0, true], 'Erkunden: nichts geschossen, Vorrat bleibt, Hinweis im Bild');
      t.eq(r.b, [true, 1, 100, 1200, .9, 0, 3.14], 'die Kugel: pr, vom Spieler, 100 Schaden, Tempo 1200, 0,9 s, Besitzer 0, nach Westen');
      t.ok(r.range >= 1000 && r.range > r.normal * 1.5, 'Reichweite ' + r.range + ' Pixel, weit ueber den normalen ' + r.normal);
      t.eq(r.s1, [2, true], 'ein Schuss: Vorrat 3 auf 2, Abklingzeit laeuft');
      t.eq(r.s2, [2, 1], 'sofort noch einmal: abgelehnt, keine zweite Kugel');
      t.eq([r.s3, r.s4], [1, 0], 'nach der Abklingzeit geht der naechste Schuss, bis der Vorrat leer ist');
      t.eq(r.dry, [0, 0], 'ohne Vorrat schiesst die Spezialwaffe nichts');
      t.eq(r.none, [0, true], 'ohne Knoten tut die Spezialwaffe nichts, auch keine neue Meldung');
    },
  },
  {
    name: 'Gewehr-Wirkung: ein Schuss toetet Beamte und geht durch alle in der Linie, 50 % mehr gegen SWAT und Scharfschuetzen, ein Schild faengt nicht ab (nur 60 % Schaden, der Schild bleibt heil), normale Kugeln bleiben am Schild haengen',
    async run(t) {
      const r = await t.page.evaluate(`(() => { const H = ${HELP}, D = H.D, Q = D.CFG.spw.rifle, o = {}; const shot = (sc, n) => { for (let i = 0; i < n; i++) { D.useGadget(sc.me, 6, sc.sp.x - 300, sc.sp.y); H.run(sc, Q.cool + .1); } };
        // zwei Beamte in einer Linie: beide tot
        let sc = H.scene({ A3: 1 }); let x = sc.sp.x; const c1 = H.cop(sc, x - 90, sc.sp.y), c2 = H.cop(sc, x - 170, sc.sp.y), pin = [[c1, x - 90, sc.sp.y], [c2, x - 170, sc.sp.y]];
        D.useGadget(sc.me, 6, x - 300, sc.sp.y); H.run(sc, .3, pin); o.line = [c1.hp <= 0, c2.hp <= 0];
        // SWAT: 200 HP, ein Schuss 150, der zweite toetet
        sc = H.scene({ A3: 1 }); const sw = H.cop(sc, x - 100, sc.sp.y, 'swat'); const hp0 = sw.hp; D.useGadget(sc.me, 6, x - 300, sc.sp.y); H.run(sc, .3, [[sw, x - 100, sc.sp.y]]); o.swat1 = [hp0, sw.hp]; H.run(sc, Q.cool, [[sw, x - 100, sc.sp.y]]); D.useGadget(sc.me, 6, x - 300, sc.sp.y); H.run(sc, .3, [[sw, x - 100, sc.sp.y]]); o.swat2 = sw.hp <= 0;
        // Scharfschuetze: 60 HP, ein Schuss
        sc = H.scene({ A3: 1 }); const sn = H.cop(sc, x - 100, sc.sp.y, 'sniper'); const hs = sn.hp; D.useGadget(sc.me, 6, x - 300, sc.sp.y); H.run(sc, .3, [[sn, x - 100, sc.sp.y]]); o.sniper = [hs, sn.hp <= 0];
        // Schild-Beamter von vorn: der Schild haelt, die Kugel geht durch (60 % Schaden), ein Beamter dahinter faellt
        sc = H.scene({ A3: 1 }); const sh = H.cop(sc, x - 90, sc.sp.y, 'shield'), bk = H.cop(sc, x - 170, sc.sp.y); sh.a = 0; const sh0 = [sh.hp, sh.sh]; const pn = [[sh, x - 90, sc.sp.y], [bk, x - 170, sc.sp.y]];
        D.useGadget(sc.me, 6, x - 300, sc.sp.y); H.run(sc, .3, pn); o.shield = [sh0[0], sh.hp, sh0[1], sh.sh, bk.hp <= 0];
        // normale Kugel (Pistole) am Schild: der Schild nimmt sie, die Leben bleiben
        sc = H.scene({}); const s2 = H.cop(sc, x - 90, sc.sp.y, 'shield'); s2.a = 0; const hh = s2.hp, ss = s2.sh; sc.me.a = Math.PI; sc.me.armed = true; sc.me.mag = 12; sc.me.cool = 0; sc.me.rl = 0; sc.me.inp = Object.assign({}, sc.me.inp, { fire: 1 });
        for (let i = 0; i < 20; i++) { s2.x = x - 90; s2.y = sc.sp.y; sc.me.a = Math.PI; D.update(1 / 30); } o.normal = [hh, s2.hp, ss, s2.sh < ss];
        return o; })()`);
      t.eq(r.line, [true, true], 'ein Schuss, zwei Beamte in der Linie: beide tot (Durchschlag)');
      t.eq(r.swat1, [200, 50], 'SWAT: 100 mal 1,5 = 150 Schaden, 50 HP uebrig');
      t.eq(r.swat2, true, 'der zweite Schuss toetet den SWAT');
      t.eq(r.sniper, [60, true], 'Scharfschuetze (60 HP): ein Schuss');
      t.eq(r.shield.slice(0, 4), [110, 50, 120, 120], 'Schild-Beamter von vorn: 60 Schaden an den Leben (60 % von 100), der Schild bleibt bei 120');
      t.eq(r.shield[4], true, 'die Kugel geht am Schild vorbei und toetet den Beamten dahinter');
    },
  },
  {
    name: 'Granatwerfer: schickt eine Granate zum Zielpunkt (bis maxD, nicht durch Waende), sie platzt dort (Schaden nach Abstand, am Rand weniger, ausserhalb nichts, Mitspieler schwaecher), im Flug am ersten Gegner, Abklingzeit und Vorrat',
    async run(t) {
      const r = await t.page.evaluate(`(() => { const H = ${HELP}, D = H.D, Q = D.CFG.spw.launch, o = {}, dm = (dmg, d) => dmg * (1 - d / Q.r * .6);
        // Phase 1 und ohne Vorrat
        let sc = H.scene({ A4: 1 }, true); D.useGadget(sc.me, 6, sc.sp.x - 150, sc.sp.y); o.p1 = [sc.me.sx, D.gren().gr.length];
        // Zielpunkt am Ende der Strecke: platzt dort
        sc = H.scene({ A4: 1 }); const x = sc.sp.x, y = sc.sp.y, tx = x - 150; const c1 = H.cop(sc, tx - 30, y), c2 = H.cop(sc, tx - 60, y), c3 = H.cop(sc, tx - 120, y); c1.hp = c2.hp = c3.hp = 1e4; const pin = [[c1, tx - 30, y], [c2, tx - 60, y], [c3, tx - 120, y]];
        D.useGadget(sc.me, 6, tx, y); const g0 = D.gren().gr[0]; o.fly = g0 ? [g0.k, g0.own, Math.round(Math.hypot(g0.vx, g0.vy))] : null; o.s1 = sc.me.sx; H.run(sc, 1.2, pin);
        o.hit = [Math.round(1e4 - c1.hp), Math.round(1e4 - c2.hp), Math.round(1e4 - c3.hp)]; o.want = [Math.round(dm(Q.dmg, 30)), Math.round(dm(Q.dmg, 60))]; o.gone = D.gren().gr.length;
        // zweiter Schuss sofort: Abklingzeit
        sc = H.scene({ A4: 2 }); D.useGadget(sc.me, 6, sc.sp.x - 100, sc.sp.y); D.useGadget(sc.me, 6, sc.sp.x - 100, sc.sp.y); o.cool = [sc.me.sx, D.gren().gr.length]; H.run(sc, Q.cool + .2); D.useGadget(sc.me, 6, sc.sp.x - 100, sc.sp.y); o.cool2 = sc.me.sx;
        // zu weit: auf maxD gekuerzt
        sc = H.scene({ A4: 1 }); const pf = D.throwPoint(sc.me, sc.sp.x - 2000, sc.sp.y, Q.maxD); o.far = Math.round(Math.hypot(pf.x - sc.me.x, pf.y - sc.me.y)); o.maxD = Q.maxD; D.useGadget(sc.me, 6, sc.sp.x - 2000, sc.sp.y); o.farShot = [sc.me.sx, D.gren().gr.length];
        // im Flug am ersten Gegner: der Beamte auf halbem Weg bekommt sie, der hinter dem Ziel nicht
        sc = H.scene({ A4: 1 }); const e1 = H.cop(sc, x - 80, y), e2 = H.cop(sc, x - 210, y); e1.hp = e2.hp = 1e4; D.useGadget(sc.me, 6, x - 200, y); H.run(sc, 1.2, [[e1, x - 80, y], [e2, x - 210, y]]); o.air = [1e4 - e1.hp > 50, 1e4 - e2.hp];
        // Spieler im Radius: schwaecher (pdmg), Besitzer eingeschlossen
        sc = H.scene({ A4: 1 }); D.useGadget(sc.me, 6, x - 70, y); H.run(sc, 1.2); o.self = [Math.round(sc.me.hp * 10) / 10, Math.round((100 - Q.pdmg * (1 - 70 / Q.r * .6)) * 10) / 10];
        // Wand im Weg: abgelehnt
        sc = H.scene({ A4: 2 }); const w = D.world(); let spot = null; for (let ty = w.WY0; ty < w.WY0 + w.H && !spot; ty++) for (let tx2 = w.WX0; tx2 < w.WX0 + w.W && !spot; tx2++) if (!D.isSol(tx2, ty) && D.isSol(tx2 + 1, ty) && !D.isSol(tx2 - 1, ty)) spot = { x: tx2 * 32 + 16, y: ty * 32 + 16, wx: (tx2 + 1) * 32 + 16 };
        if (spot) { sc.me.x = spot.x; sc.me.y = spot.y; D.useGadget(sc.me, 6, spot.wx + 40, spot.y); o.wall = [sc.me.sx, D.gren().gr.length]; }
        return o; })()`);
      t.eq(r.p1, [2, 0], 'Erkunden: abgelehnt, Vorrat bleibt');
      t.eq(r.fly, ['shell', 0, 520], 'die Granate fliegt als shell mit Tempo 520, Besitzer 0');
      t.eq(r.s1, 1, 'ein Schuss verbraucht eine der zwei Granaten');
      t.eq(r.hit.slice(0, 2), r.want, 'Schaden nach Abstand zur Mitte: ' + JSON.stringify(r.hit) + ' erwartet ' + JSON.stringify(r.want));
      t.eq(r.hit[2], 0, 'ausserhalb des Radius passiert nichts');
      t.eq(r.gone, 0, 'die Granate ist nach dem Platzen weg');
      t.eq(r.cool, [2, 1], 'sofort noch eine: abgelehnt (Abklingzeit), nur eine Granate unterwegs');
      t.eq(r.cool2, 1, 'nach der Abklingzeit die zweite');
      t.ok(Math.abs(r.far - r.maxD) <= 1, 'ein weites Ziel wird auf maxD gekuerzt: ' + r.far + ' statt ' + r.maxD);
      t.eq(r.farShot, [2, 0], 'die Wand auf der gekuerzten Strecke (hier nach 240 Pixeln) blockiert den Schuss');
      t.eq(r.air, [true, 0], 'im Flug platzt sie am ersten Gegner, der Beamte hinter dem Ziel bleibt heil');
      t.ok(Math.abs(r.self[0] - r.self[1]) <= 1.5, 'der Besitzer im Radius bekommt pdmg: ' + r.self[0] + ' erwartet ' + r.self[1]);
      t.eq(r.wall, [3, 0], 'durch die Wand: abgelehnt, Vorrat bleibt');
    },
  },
  {
    name: 'Explosionen ohne hp-Angabe (Fallen, Werfer): Wagen in der Naehe nehmen die Haelfte von dmg, nicht NaN (Fehler aus B2: C.hp war undefined, der Wagen konnte nie mehr zerstoert werden)',
    async run(t) {
      const r = await t.page.evaluate(`(() => { const H = ${HELP}, D = H.D, o = {}; const sc = H.scene({ A4: 1 }); const car = { dead: false, x: sc.sp.x - 30, y: sc.sp.y, hp: 1000 };
        sc.g.cars.push(car); D.blastAt(sc.sp.x - 50, sc.sp.y, { dmg: 100, pdmg: 10, r: 100, scorch: 20 }, 0); o.car = car.hp; sc.g.cars.pop();
        const c2 = { dead: false, x: sc.sp.x - 30, y: sc.sp.y, hp: 1000 }; sc.g.cars.push(c2); D.blastAt(sc.sp.x - 50, sc.sp.y, { dmg: 100, hp: 280, r: 100, scorch: 20 }, 0); o.withHp = c2.hp; sc.g.cars.pop();
        return o; })()`);
      t.eq(r.car, 950, 'ohne hp: Kettenschaden dmg mal 0,5, der Wagen hat noch eine Zahl als Leben');
      t.eq(r.withHp, 860, 'mit hp (Streifenwagen, Zapfsaeule) wie bisher: hp mal 0,5');
    },
  },
  {
    name: 'Besondere Waffen im Coop: der Client schaltet mit Shift um und schiesst mit der Leertaste (Host rechnet), Vorrat als Index 32 der Spielerzeile, die Kugel (pr) und die Granate (shell) sind beim Client sichtbar, die Schluessel tr (Transporter) und tp (Fallen) im Schnappschuss sind getrennt',
    async run(t) {
      await t.loadTool('loopnet.js'); await t.loadInpage('coop.js');
      const r = await t.page.evaluate(() => {
        const G = CT.mkGame('bank', 321, 2), A = G.A, B = G.clients[0], o = {}; A.CFG.policeAt = 1e6; A.CFG.policeForced = 1e6;
        B.cv.dispatchEvent(new KeyboardEvent('keydown', { key: 'f', bubbles: true })); G.run(1);
        const p1 = A.get().players[1]; p1.kit = Object.assign({}, p1.kit, { sk: { A3: 1 } }); p1.sx = 3; B.get().me.kit = Object.assign({}, B.get().me.kit, { sk: { A3: 1 } }); G.run(.5);
        o.clientStock = B.get().me.sx | 0; o.phase = B.get().phase;
        const m = B.get().me; const aim = () => { B.draw(); const q = B.mouse, cx = q.x - q.sx, cy = q.y - q.sy; q.sx = m.x - cx - 200; q.sy = m.y - cy; q.t = B.get().time; B.draw(); }; aim();
        B.cv.dispatchEvent(new KeyboardEvent('keydown', { key: 'Shift', bubbles: true })); o.on = B.spw(); aim(); G.run(.1); B.cv.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true })); B.cv.dispatchEvent(new KeyboardEvent('keyup', { key: ' ', bubbles: true })); let bh = 0, bc = 0; for (let i = 0; i < 40; i++) { G.run(1 / 60); if (A.get().bl.some(b => b.pr)) bh = 1; if (B.get().bl.some(b => b.pr)) bc = 1; } o.bul = [bh, bc]; o.stock = [A.get().players[1].sx | 0, B.get().me.sx | 0];
        // Granate vom Host
        const me = A.get().me; me.kit = Object.assign({}, me.kit, { sk: { A4: 1 } }); me.sx = 1; A.useGadget(me, 6, me.x + 220, me.y); let sa = 0, sb = 0; for (let i = 0; i < 40; i++) { G.run(1 / 60); if (A.gren().gr.some(q => q.k === 'shell')) sa = 1; if (B.gren().gr.some(q => q.k === 'shell')) sb = 1; } o.sh = [sa, sb];
        const s = A.buildSnap(); o.keys = [Array.isArray(s.tr) && s.tr.length, Array.isArray(s.tp), Array.isArray(s.kf)];
        return o;
      });
      t.eq([r.phase, r.clientStock, r.on], [2, 3, true], 'Ueberfall laeuft, der Client kennt seinen Vorrat aus dem Schnappschuss, Shift schaltet die Spezialwaffe ein');
      t.eq(r.bul, [1, 1], 'die Kugel (pr) gibt es beim Host und beim Client');
      t.eq(r.stock, [2, 2], 'der Vorrat ist bei beiden um eins gesunken');
      t.eq(r.sh, [1, 1], 'die Granate (shell) fliegt beim Host und beim Client');
      t.eq(r.keys, [4, true, true], 'tr bleibt der Transporter-Zustand (vier Werte), die Fallen stehen in tp, die Koffer in kf');
    },
  },
  {
    name: 'Besondere Waffen bedienen (solo): Shift schaltet im Ueberfall ein und aus (mit Vorrat, sonst bleibt Shift das Schleichen), Linksklick oder Leertaste schiesst einen Schuss je Druck, die normale Waffe schweigt, Zielhilfe, Fadenkreuz und HUD zeigen den Zustand, leerer Vorrat schaltet aus',
    async run(t) {
      const r = await t.page.evaluate(`(() => { const H = ${HELP}, D = H.D, o = {}; const cv = document.getElementById('c'), ctx = cv.getContext('2d'), VWL = 960, VHL = 544;
        const key = (k, up) => cv.dispatchEvent(new KeyboardEvent(up ? 'keyup' : 'keydown', { key: k, bubbles: true }));
        const click = () => { const m = D.mouse, r = cv.getBoundingClientRect(); cv.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientX: r.left + m.sx * r.width / VWL, clientY: r.top + m.sy * r.height / VHL })); window.dispatchEvent(new MouseEvent('mouseup', { bubbles: true })); };
        const rec = () => { const txt = [], ot = ctx.fillText; let lines = 0; const ol = ctx.lineTo; ctx.fillText = function (s) { txt.push(String(s)); return ot.apply(this, arguments); }; ctx.lineTo = function () { lines++; return ol.apply(this, arguments); };
          try { D.draw(); } finally { ctx.fillText = ot; ctx.lineTo = ol; } return { txt, lines }; };
        // Gewehr: einschalten, Zielhilfe, HUD, schiessen mit Klick und mit Leertaste, ausschalten
        let sc = H.scene({ A3: 1 }); H.aimAt(D, sc.sp.x - 150, sc.sp.y); sc.me.mag = 12; const base = rec(); o.off0 = D.spw();
        key('Shift'); key('Shift', 1); o.on1 = D.spw(); const held = rec(); o.line = held.lines > base.lines; o.hud = held.txt.filter(s => /Shift/.test(s)); o.plate = held.txt.filter(s => /Gewehr .Shift/.test(s)).length;
        click(); o.click = [sc.me.sx, D.get().bl.filter(b => b.pr).length]; H.run(sc, 1.5); key(' '); key(' ', 1); o.space = sc.me.sx; H.run(sc, 1.5);
        // die normale Waffe schweigt, solange die Spezialwaffe an ist (Maustaste gehalten), danach schiesst sie wieder
        D.mouse.down = 1; H.run(sc, .5); o.pistolQuiet = sc.me.mag; key('Shift'); key('Shift', 1); o.off2 = D.spw(); H.run(sc, .5); o.pistolBack = sc.me.mag < 12; D.mouse.down = 0;
        // Shift ist Schleichen ohne Spezialwaffe, mit Vorrat im Ueberfall nicht
        sc = H.scene({}); key('Shift'); H.run(sc, .1); o.sneakNone = sc.me.inp.sn; key('Shift', 1);
        sc = H.scene({ A3: 1 }); key('Shift'); H.run(sc, .1); o.sneakStock = sc.me.inp.sn; key('Shift', 1); key('Shift'); key('Shift', 1);
        sc = H.scene({ A3: 1 }, true); key('Shift'); o.phase1 = [D.spw(), (H.run(sc, .1), sc.me.inp.sn)]; key('Shift', 1);
        // letzter Schuss: Vorrat leer, Spezialwaffe geht aus, Shift schleicht wieder
        sc = H.scene({ A3: 1 }); sc.me.sx = 1; H.aimAt(D, sc.sp.x - 150, sc.sp.y); key('Shift'); key('Shift', 1); click(); H.run(sc, .2); D.tick(1 / 30); o.empty = [sc.me.sx, D.spw()]; key('Shift'); H.run(sc, .1); o.sneakAfter = sc.me.inp.sn; key('Shift', 1);
        // Werfer: Zielring, Klick feuert, Klick auf blockierte Strecke nicht
        sc = H.scene({ A4: 1 }); H.aimAt(D, sc.sp.x - 120, sc.sp.y); const b2 = rec(); key('Shift'); key('Shift', 1); const h2 = rec(); o.ring = h2.lines > b2.lines; o.hud2 = h2.txt.filter(s => /Shift/.test(s)); click(); o.shot = [sc.me.sx, D.gren().gr.filter(q => q.k === 'shell').length];
        // Auftragswechsel: eine Falle (3 halten) schaltet die Spezialwaffe aus
        sc = H.scene({ A3: 1 }); D.tick(1 / 30); o.fresh = D.spw(); key('Shift'); key('Shift', 1); o.x1 = D.spw(); key('4'); key('4', 1); sc.me.sm = 1; key('4'); o.x2 = D.spw(); key('4', 1);
        return o; })()`);
      t.eq([r.off0, r.on1], [false, true], 'Shift schaltet die Spezialwaffe im Ueberfall ein');
      t.ok(r.line, 'eingeschaltet zeichnet das Gewehr die Zielhilfe (Linie)');
      t.ok(r.hud.some(s => /\[Shift\] Gewehr 3/.test(s)) && r.plate >= 1, 'das HUD nennt Shift, Gewehr und die Stueckzahl und zeigt die Spezialwaffe im Waffenkasten: ' + JSON.stringify(r.hud));
      t.eq(r.click, [2, 1], 'Linksklick schiesst einen Schuss (Vorrat 3 auf 2, eine Kugel pr)');
      t.eq(r.space, 1, 'die Leertaste schiesst auch (nach der Abklingzeit, Vorrat 2 auf 1)');
      t.eq(r.pistolQuiet, 12, 'die normale Waffe schweigt, solange die Spezialwaffe an ist (Maustaste gehalten, Magazin bleibt voll)');
      t.eq([r.off2, r.pistolBack], [false, true], 'Shift schaltet aus, dann schiesst die Pistole wieder');
      t.eq(r.sneakNone, 1, 'ohne Spezialwaffe bleibt Shift das Schleichen');
      t.eq(r.sneakStock, 0, 'mit Spezialwaffe im Ueberfall ist Shift der Umschalter, kein Schleichen');
      t.eq(r.phase1, [false, 1], 'im Erkunden schaltet Shift nichts um und schleicht weiter');
      t.eq(r.empty, [0, false], 'der letzte Schuss leert den Vorrat und schaltet die Spezialwaffe aus');
      t.eq(r.sneakAfter, 1, 'ohne Vorrat ist Shift wieder das Schleichen');
      t.ok(r.ring, 'der Werfer zeigt beim Einschalten den Explosionsradius');
      t.ok(r.hud2.some(s => /\[Shift\] Werfer 2/.test(s)), 'das HUD nennt Shift, Werfer und die Stueckzahl: ' + JSON.stringify(r.hud2));
      t.eq(r.shot, [1, 1], 'Klick feuert die Granate (Vorrat 2 auf 1, eine unterwegs)');
      t.eq([r.fresh, r.x1, r.x2], [false, true, false], 'ein neuer Auftrag beginnt ausgeschaltet (tick), ein Wurfgeraet (4 halten) schaltet die Spezialwaffe aus');
    },
  },
];
