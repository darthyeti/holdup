/* Kloetzchen-Stil: Figuren (Ticket 198, Schritt 2 baut hier alle Rollen und Posen aus). register(KL) traegt je Art einen Bauer ein: (k, o, e) mit dem Werkzeug k aus js/kl-kern.js, Rueckgabe Zahl der Zusatzteile.
   Lokale Achsen der Figur: +x vorn (Blickrichtung), +y oben, +z rechts. Gelenke sind Matrizen (Wurzel, Becken, Rumpf, Schulter, Ellbogen, Hand, Huefte, Knie), jedes Teil sitzt in seinem Gelenk.
   Haltung aus dem Zustand von figs3d: o.col < 6 laeuft (o.w Laufphase, auf KCFG.step Stufen eingerastet = steif), o.col 8 kniet mit Haenden am Kopf, e.lie oder o.lie liegt, o.ar haelt die Waffe, o.rf Gewehr, o.sh Schild, o.bag Beute. */
import * as THREE from '../assets/three.module.min.js';

export function register(KL) {
  const mRoot = new THREE.Matrix4(), mB = new THREE.Matrix4(), mH = new THREE.Matrix4(), mT = new THREE.Matrix4(), mD = new THREE.Matrix4();
  const mk = n => Array.from({ length: n }, () => new THREE.Matrix4()), mS = mk(2), mE = mk(2), mL = mk(2), mKn = mk(2);
  // Lesbarkeit auf Spielzoom: kraeftige Farben je Rolle, ueberschreibt nur die Farben von V3CFG.fig.out (Form und Kopfart bleiben)
  const PAL = { cop: { top: 0x2f62dc, bot: 0x1b2f78, hat: 0x1b2f78 }, swat: { top: 0x2b2e35, bot: 0x1d2025, hat: 0x15171b, gl: 0x15171b }, shield: { top: 0x2b2e35, bot: 0x1d2025, hat: 0x15171b, gl: 0x15171b },
    sniper: { top: 0x5d7a35, bot: 0x3a4a24, hat: 0x2f3d1d }, grd: { top: 0x9b8468, bot: 0x5c4f40, hat: 0x6b5a45 }, civA: { top: 0xf0b030, bot: 0x4c7aa0, hat: 0x6b4226 }, civB: { top: 0xe0508c, bot: 0x3f4d78, hat: 0xd2b46a },
    tel: { top: 0xeef2f5, bot: 0x4a5568, hat: 0x5a3b22 }, mgr: { top: 0x6a4fb5, bot: 0x33363f, hat: 0x2c2118 } };
  const base = (k, o, e, art) => {
    const { part, jt, rotY, colOf, KC, D, FG } = k, OT = Object.assign({}, FG.out[art], PAL[art]), rob = art.startsWith('rob'), kk = (1 + ((e.r || 9) - 9) * FG.size) * KC.size, lying = !!(e.lie || o.lie), kneel = !lying && o.col === 8, run = !lying && !kneel && o.col < 6;
    const pw = Math.PI * 2 / KC.step, qw = run ? Math.round((o.w || 0) / pw) * pw : 0, sw = run ? Math.sin(qw) : 0, stepOdd = run ? (Math.round((o.w || 0) / pw) & 1) : 0;
    const gun = !lying && !kneel && o.ar && art !== 'sniper', wk = gun ? (o.wp === 'smg' || o.wp === 'rifle' ? o.wp : 'pistol') : null, aRifle = wk === 'rifle', rifle = !lying && !kneel && (o.rf || aRifle), shield = !lying && !kneel && o.sh >= 0, side = [1, -1];
    const top = colOf(OT.top), bot = colOf(OT.bot), skin = colOf(FG.skin), glv = colOf(OT.gl || FG.skin), hat = colOf(OT.hat || OT.bot), dark = colOf(FG.dark), eye = colOf(FG.eye), gunC = colOf(FG.gun), boot = colOf(FG.boot);
    k.state(o.hit, o.al);
    rotY(o.x, o.y, o.a, kk); mRoot.copy(k.root);
    const legH = D.footH + D.shin + D.thigh, tH = D.torsoH, hd = D.head * 1.1;
    if (lying) jt(mRoot, mB, (legH + D.pelvH + tH + hd) / 2, D.torsoD / 2 + .2, 0, 0, 0, Math.PI / 2); else mB.copy(mRoot);
    let hipY = legH, bob = 0, lean = 0;
    const hip = [0, 0], kn = [0, 0], spread = [0, 0], sh = [[.12, 0], [.12, 0]], el = [.1, .1];
    if (run) { hip[0] = KC.run * sw; hip[1] = -KC.run * sw; kn[0] = sw < -.3 ? -.9 : -.15; kn[1] = sw > .3 ? -.9 : -.15; lean = KC.tilt; bob = stepOdd ? .5 : 0; sh[0][1] = -KC.swing * sw; sh[1][1] = KC.swing * sw; el[0] = el[1] = .45 }
    if (kneel) { hipY = D.shin * .98 + D.legW * .4; hip[0] = hip[1] = .02; kn[0] = kn[1] = -Math.PI / 2 }
    if (lying) { hip[0] = -.1; hip[1] = .08; kn[0] = -.2; spread[0] = -.08; spread[1] = .05 }
    // Haltung je Waffe (Ticket 217): Pistole einarmig gestreckt, SMG wie eine Uzi einhaendig angewinkelt und gekippt, Sturmgewehr mit beiden Armen im Anschlag
    if (gun) { sh[0] = [0, Math.PI / 2 - .05]; el[0] = 0; sh[1] = [.1, -.08]; el[1] = .12 }
    if (wk === 'smg') { sh[0] = [-.12, .95]; el[0] = 1.05; sh[1] = [.14, -.12]; el[1] = .2 }
    if (rifle) { sh[0] = [-.45, 1.2]; el[0] = .5; sh[1] = [-.15, 1.45]; el[1] = .25 }
    if (shield) { sh[1] = [-.1, 1.15]; el[1] = .3 }
    if (kneel) { sh[0] = [2.55, -.35]; sh[1] = [2.55, -.35]; el[0] = el[1] = 2.2 }
    if (lying) { sh[0] = [.35, 0]; sh[1] = [1.35, 0]; el[0] = .3; el[1] = .2 }
    jt(mB, mH, 0, hipY + bob, 0); jt(mH, mT, 0, D.pelvH * .8, 0, 0, 0, -lean);
    part(mH, 0, D.pelvH * .5 - .3, 0, D.torsoD * .94, D.pelvH, D.torsoW * .92, bot);
    part(mT, 0, tH / 2, 0, D.torsoD, tH, D.torsoW, top);
    if (OT.coat) part(mT, 0, -.8, 0, D.torsoD + 1.6, 4, D.torsoW + 1.4, top);
    if (OT.badge) part(mT, D.torsoD / 2 + .3, tH * .68, -2.6, .8, 2.4, 2.4, colOf(FG.gold), .15);
    if (OT.holster) part(mT, .5, .8, 6.6, 2.6, 3.4, 1.8, dark);
    // Kopf: Wuerfel mit Fase, Augen und Mund als Bloecke (keine Noppe auf dem Kopf)
    const hy = tH + D.neck + hd / 2, mask = OT.head === 'mask';
    part(mT, 0, tH + D.neck / 2, 0, 5, D.neck + .4, 6, skin);
    part(mT, 0, hy, 0, hd, hd, hd * 1.04, mask ? dark : skin);
    if (mask) { part(mT, hd * .5 - .1, hy + hd * .08, 0, .8, hd * .24, hd * .78, skin); for (const d of side) part(mT, hd * .5 + .35, hy + hd * .08, d * 2, .8, 1.7, 1.7, eye) }
    else { for (const d of side) part(mT, hd * .5 + .1, hy + .9, d * 2.5, .8, 2, 1.8, eye); part(mT, hd * .5 + .1, hy - 2.6, 0, .6, .9, 3.6, colOf(0x7a4a3a)) }
    if (rob) { part(mT, 0, hy + hd * .5 + .5, 0, hd * 1.02, 2.4, hd * 1.06, top); part(mT, -D.torsoD / 2 - .3, tH * .5, 0, .8, tH * .8, D.torsoW * .5, colOf(FG.sleeve)) }
    if (OT.head === 'cap') { part(mT, 0, hy + hd * .5 + .6, 0, hd * 1.06, 2.6, hd * 1.1, hat); part(mT, hd * .5 + 2.4, hy + hd * .5 - .2, 0, 5, .9, hd * .95, hat) }
    else if (OT.head === 'helmet') { part(mT, 0, hy + hd * .2, 0, hd * 1.14, hd * .7, hd * 1.18, hat); part(mT, hd * .5 + .3, hy + .1, 0, .7, hd * .26, hd * .78, colOf(FG.visor), .1) }
    else if (OT.head === 'beanie') part(mT, 0, hy + hd * .32, 0, hd * 1.08, hd * .42, hd * 1.12, hat);
    else if (OT.head === 'hair') { part(mT, -.4, hy + hd * .38, 0, hd * 1.08, hd * .3, hd * 1.1, hat); part(mT, -hd * .46, hy - .5, 0, 1.6, hd * .7, hd * 1.06, hat) }
    // Arme: Oberarm, Unterarm, Hand als Bloecke (0 rechts +z, 1 links -z)
    for (let i = 0; i < 2; i++) {
      const d = side[i], aw = D.armT;
      jt(mT, mS[i], 0, tH - aw * .45, d * (D.torsoW / 2 + aw * .35), -d * sh[i][0], 0, sh[i][1]);
      part(mS[i], 0, -D.armU / 2 + .3, 0, aw, D.armU + .6, aw, top);
      jt(mS[i], mE[i], 0, -D.armU, 0, kneel ? -d * el[i] : 0, 0, kneel ? 0 : el[i]);
      part(mE[i], 0, -D.armF / 2 + .2, 0, aw * .94, D.armF + .4, aw * .94, top);
      part(mE[i], 0, -D.armF - D.hand / 2 + .6, 0, D.hand, D.hand, D.hand * .94, glv);
    }
    // Beine: Oberschenkel, Unterschenkel, Fuss als Klotz mit langer Spitze
    for (let i = 0; i < 2; i++) {
      const d = side[i], lt = D.legW;
      jt(mH, mL[i], 0, 0, d * D.hipW, spread[i], 0, hip[i]);
      part(mL[i], 0, -D.thigh / 2 + .3, 0, lt, D.thigh + .6, lt, bot);
      jt(mL[i], mKn[i], 0, -D.thigh, 0, 0, 0, kn[i]);
      part(mKn[i], 0, -D.shin / 2 + .2, 0, lt * .94, D.shin + .4, lt * .94, bot);
      part(mKn[i], (D.footL - lt) / 2, -D.shin - D.footH / 2 + .4, 0, D.footL, D.footH, D.footW, boot);
    }
    let extra = 0;
    const weapC = colOf(0x9aa3af);
    if (wk === 'pistol') { jt(mE[0], mD, 0, -D.armF - D.hand * .3, 0); part(mD, 4, -.2, 0, 9, 2.3, 2.6, weapC); part(mD, 8.8, -.2, 0, 1.6, 1.6, 1.6, gunC); part(mD, .6, -2.4, 0, 2.2, 4.2, 1.7, gunC); extra++ }
    if (wk === 'smg') { jt(mE[0], mD, 0, -D.armF - D.hand * .3, 0, 1.15, 0, -(sh[0][1] + el[0])); part(mD, 3.8, 0, 0, 9.6, 2.8, 3.2, weapC); part(mD, 9.8, .2, 0, 4.4, 1.7, 1.7, gunC); part(mD, 2.2, -4.2, 0, 2.2, 6.4, 2.6, gunC); part(mD, 5.5, 1.9, 0, 3, 1, 1.4, gunC); extra++ }
    if (aRifle) { const hr = tH * .82; part(mT, 7.2, hr, 1.5, 11, 2.7, 3, weapC); part(mT, 17.8, hr + .3, 1.5, 13, 1.7, 1.7, gunC); part(mT, 14.5, hr + .1, 1.5, 6, 2.6, 3, gunC); part(mT, -1.8, hr - .6, 1.5, 7.4, 3.4, 2.1, colOf(FG.stock)); part(mT, 8.2, hr - 3.6, 1.5, 2.2, 5.4, 1.9, gunC); part(mT, 9, hr + 2, 1.5, 4.4, 1.2, 1.2, gunC); extra++ }
    else if (o.rf && rifle) { const L0 = 18; part(mT, D.torsoD / 2 + L0 / 2 - 4, tH * .82, 1.5, L0, 1.8, 1.5, gunC); part(mT, D.torsoD / 2 - 5, tH * .82 - .7, 1.5, 5.5, 3.2, 1.7, colOf(FG.stock)); part(mT, D.torsoD / 2 + 4, tH * .82 + 1.8, 1.5, 6, 1.8, 1.8, gunC); extra++ }
    if (shield) { const c = k.xcol.sh[o.sh > .5 ? 0 : o.sh > .25 ? 1 : 2]; part(mB, D.torsoD / 2 + 5, 16.5, -1.5, 1.8, 27, 17, c, .12); part(mB, D.torsoD / 2 + 6, 22, -1.5, .8, 5, 11, dark); extra++ }
    if (o.bag) { part(mT, -D.torsoD / 2 - 4.4, tH * .52, 0, 7.4, 12.6, 10, colOf(0xc79a3c)); part(mT, -D.torsoD / 2 - 1.2, tH * .84, 0, 1.6, 2.2, 6, colOf(FG.dark)); extra++ }
    return extra;
  };
  // Arten: Spieler und Team (rob0 bis rob3), Polizei und Gegner, Wachen, Zivilisten, Angestellte (Namen wie V3CFG.fig.out)
  for (const art of ['rob0', 'rob1', 'rob2', 'rob3', 'cop', 'swat', 'shield', 'sniper', 'grd', 'civA', 'civB', 'tel', 'mgr']) KL.fig(art, (k, o, e) => base(k, o, e, art));
}
