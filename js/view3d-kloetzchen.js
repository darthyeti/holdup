/* Holdup: 3D-Stilstudie Kloetzchen (Ticket 196, docs/plan-3d.md Abschnitt 2.19). ES-Modul, wird von index.html nur geladen, wenn der Schalter an ist (Adresse #3d&kloetzchen, #3d&kloetzchen=b,
   Taste F7 wechselt zwischen Standard-3D, Stil A und Stil B). Ohne Schalter wird diese Datei nie gelesen, 2D und 3D bleiben unveraendert.
   mkKlotz(E) bekommt von view3d.js die Werkzeuge der Ansicht (E: Szene, Kamera, Pools, Licht-Shader, Sammler fuer Effekte) und liefert K. Die Ansicht ruft K an wenigen Stellen (alle hinter K.on):
   dyn (Figuren und Fahrzeuge als Kloetzchen statt Low-Poly), step und fxAdd (Zerfall, Funken, Rauch, Leuchten), world (Moebel als Bausteine, Noppen), render (Bloom), sync (Stilwechsel).
   Stil A: Figuren, Fahrzeuge und Moebel aus Kloetzchen, Waende und Boden schlicht. Stil B: dazu der Boden als Bauplatte (Noppen im Shader) und Waende mit Fugen und Noppen auf der Kante.
   Eigener Stil, keine Nachbildung einer Spielfigur: kantige Teile mit Fase, quadratischer Kopf ohne Noppe, Haende als Bloecke, Beine und Arme als zwei starre Glieder. */
import * as THREE from '../assets/three.module.min.js';

export const KCFG = {
  // Masse der Figur in Weltpixeln (Figur rund 38 hoch, Kopf ein Wuerfel): Fuss (Laenge, Hoehe, Breite), Unter- und Oberschenkel, Beinbreite, Huefte (Abstand Bein zur Mitte), Becken, Rumpf, Arme, Hand, Kopf
  dim: { footL: 7.4, footH: 2.6, footW: 5, shin: 5, thigh: 5.5, legW: 4.8, hipW: 3.4, pelvH: 3, torsoH: 10.5, torsoW: 12.6, torsoD: 8.4, armU: 5.4, armF: 5, armT: 4.2, hand: 3.6, head: 11, neck: .6, bevel: .13 },
  // steifes Laufen: Laufphase in so viele Stufen je Umlauf eingerastet (Stop-Motion), Beinschwung und Armschwung
  step: 6, run: .78, swing: .7, tilt: .12,
  // Plastik: Glanzexponent, Staerke des Glanzlichts, Umgebung (Himmel in der Spiegelung), Rand (Fresnel)
  plastic: [46, .7, .04, .16],
  // satte Spielzeugfarben: Saettigung und Figurengroesse (die Studie darf die Figuren etwas groesser zeigen als das Standard-3D)
  sat: 1.4, size: 1.22,
  // Teile je Qualitaetsstufe (Grafik niedrig, mittel, hoch): Obergrenze fliegender Teile, Funken, Rauchpuffer, Bloom
  q: { debris: [160, 320, 560], sparks: [60, 120, 220], smoke: [24, 48, 80], bloom: [0, 1, 1], studs: [0, 1, 1] },
  // Zerfall: Schwerkraft (Weltpixel je s^2), Rueckprall, Reibung am Boden, Liegezeit der Teile, Dauer des Verschwindens
  deb: { g: 520, bounce: .38, fric: .62, rest: [5.5, 8.5], fade: .8, burstV: [70, 190], up: [140, 300], spin: 9, biasK: 70, casing: 2.4 },
  burst: ['cop', 'swat', 'grd', 'shield', 'sniper'],
  // Bloom: Schwelle (Helligkeit der sRGB-Werte), Staerke der beiden Stufen (halbe und viertel Aufloesung), Zuwachs durch Lichtblitze
  bloom: { thr: .9, knee: .1, s: [.26, .34], flash: .45 },
  // Noppenraster (Weltpixel) der Bauplatte und der Wandkanten
  stud: 16, studH: 2.4, studR: 4.4, wall: 64,
  // Moebel als Bausteine: Zeichen im Raster -> Farbe, Noppen, Zusatz (Masse und Hoehe nimmt die Tabelle V3CFG.cells)
  furn: { C: { col: 0xd7ceb8, st: 1 }, e: { col: 0xb07a45, st: 1 }, m: { col: 0x8a93a1, st: 1, x: 'mon' }, b: { col: 0x3a78cc, st: 1 }, r: { col: 0xd6dbe0, st: 1, x: 'till' }, A: { col: 0x59616c, x: 'atm' },
    k: { col: 0xc9994f, st: 1, x: 'crate' }, q: { col: 0xc24a35, x: 'barrel' }, p: { col: 0xb5603b, x: 'plant' } },
  car: { pol: [0x2b55b8, 0xeef1f4], bar: [0xff3a30, 0x3a6bff], wheel: 0x24272d, glass: 0x1f3550, lamp: 0xfff1b8, tail: 0xff3b2e, scorch: 0x2a2522, ember: 0xff7a2a },
  alarm: { n: 2, spin: 3.2 },
};

// Ausgabe in sRGB selbst kodieren: auf dem Bildschirm dasselbe wie bisher, beim Zeichnen in die Zwischenflaeche des Bloom (die ohne Kodierung linear bliebe) bleiben Nebel und Farbkorrektur im selben Farbraum.
// Die Datei wird nur mit dem Schalter geladen, vor dem ersten Uebersetzen eines Shaders.
THREE.ShaderChunk.colorspace_fragment = 'gl_FragColor = sRGBTransferOETF( gl_FragColor );';

export function mkKlotz(E) {
  const { X, C, scene, ren, UV, st } = E, KC = KCFG, D = KC.dim, FG = C.fig, T = X.T, LC = C.light;
  if (!LC.pl.alarm) LC.pl.alarm = { h: 58, r: 240, col: [1, .16, .1], i: 3.2 };
  const K = { on: false, stil: 0, dead: false };
  const q = () => Math.max(0, Math.min(2, X.gfx | 0));
  const lod = () => X.lod | 0;
  const satC = new Map(), colOf = h => { let c = satC.get(h); if (!c) { c = E.colOf(h).clone(); const o = {}; c.getHSL(o); c.setHSL(o.h, Math.min(1, o.s * KC.sat), o.l); satC.set(h, c) } return c };
  const rnd = (() => { let s = 196; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 } })();
  const rr = (a, b) => a + (b - a) * rnd();

  // ---------- Geometrie: Quader mit Fase (Einheitswuerfel), Noppe, Zylinder ----------
  function bevelBox(r) {
    const tk = [-.5, -.5 + r, .5 - r, .5], P = [], N = [], I = [], inn = .5 - r;
    const faces = [[0, 1, 2, 1], [0, 1, 2, -1], [1, 2, 0, 1], [1, 2, 0, -1], [2, 0, 1, 1], [2, 0, 1, -1]]; // u, v, Normalachse, Vorzeichen
    for (const [iu, iv, ia, sg] of faces) {
      const base = P.length / 3;
      for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) {
        const p = [0, 0, 0]; p[iu] = tk[i]; p[iv] = tk[j]; p[ia] = sg * .5;
        const c = p.map(v => Math.max(-inn, Math.min(inn, v))), d = p.map((v, k) => v - c[k]), l = Math.hypot(d[0], d[1], d[2]);
        const n = l > 1e-6 ? d.map(v => v / l) : (() => { const z = [0, 0, 0]; z[ia] = sg; return z })();
        P.push(c[0] + n[0] * r, c[1] + n[1] * r, c[2] + n[2] * r); N.push(n[0], n[1], n[2]);
      }
      for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) { const a = base + j * 4 + i, b = a + 1, c = a + 4, d = c + 1; I.push(a, c, b, b, c, d) }
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3)); g.setIndex(I);
    // Umlaufsinn pruefen: Dreiecke muessen nach aussen zeigen (Normale des Dreiecks gegen die Vertexnormale), sonst umdrehen
    const pa = g.attributes.position, na = g.attributes.normal, ix = g.index.array;
    for (let t = 0; t < ix.length; t += 3) {
      const a = ix[t], b = ix[t + 1], c = ix[t + 2], ux = pa.getX(b) - pa.getX(a), uy = pa.getY(b) - pa.getY(a), uz = pa.getZ(b) - pa.getZ(a), vx = pa.getX(c) - pa.getX(a), vy = pa.getY(c) - pa.getY(a), vz = pa.getZ(c) - pa.getZ(a);
      const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx, dt = nx * (na.getX(a) + na.getX(b) + na.getX(c)) + ny * (na.getY(a) + na.getY(b) + na.getY(c)) + nz * (na.getZ(a) + na.getZ(b) + na.getZ(c));
      if (dt < 0) { ix[t + 1] = c; ix[t + 2] = b }
    }
    return g;
  }
  const boxGeo = bevelBox(KC.dim.bevel), studGeo = new THREE.CylinderGeometry(.42, .5, 1, 7).translate(0, .5, 0);

  // ---------- Plastik-Shader: Licht, Schatten, Punktlichter und Nebel wie die Welt (litC), dazu Glanz, Spiegelung des Himmels, Rand, Eigenleuchten (iK.y) und Deckkraft als Raster (iK.x) ----------
  const VS = `attribute vec2 iK; varying vec3 vC; varying vec2 vK; varying vec2 vM; varying vec3 vWp; varying vec3 vN;
void main() { vC = vec3(1.0);
#ifdef USE_INSTANCING_COLOR
vC = instanceColor;
#endif
  vK = iK; mat4 M = modelMatrix * instanceMatrix; vec4 wp = M * vec4(position, 1.0); vM = wp.xz; vWp = wp.xyz;
  vec3 s2 = vec3(dot(M[0].xyz, M[0].xyz), dot(M[1].xyz, M[1].xyz), dot(M[2].xyz, M[2].xyz)); vN = normalize(mat3(M) * (normal / max(s2, vec3(1e-4))));
  gl_Position = projectionMatrix * viewMatrix * wp; }`;
  const FS = E.GL.VISF + E.GL.LITF + `uniform vec4 uK; varying vec3 vC; varying vec2 vK; varying vec2 vM; varying vec3 vWp; varying vec3 vN;
void main() {
  if (vK.x < 0.99 && fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715)))) > vK.x) discard;
  vec3 n = normalize(vN); vec3 V = normalize(cameraPosition - vWp);
  vec3 col = litC(vC, vWp, n);
  if (uLit > 0.5) {
    float sh = 1.0;
#ifdef L_SH
    sh = shadowAt(vWp, n);
#endif
    vec3 H = normalize(uSunD + V); float sd = step(0.0, dot(n, uSunD));
    col += uSunC * (pow(max(dot(n, H), 0.0), uK.x) * uK.y * sh * sd);
    vec3 R = reflect(-V, n); float fr = pow(1.0 - max(dot(n, V), 0.0), 3.0);
    col += mix(uGnd, uSky, clamp(R.y * 0.5 + 0.5, 0.0, 1.0)) * (uK.z + uK.w * fr);
    col += vec3(1.0, 0.98, 0.94) * (smoothstep(0.86, 0.97, dot(R, normalize(vec3(-0.35, 0.8, -0.45)))) * uK.y * 0.45 * (0.35 + 0.65 * sh));
    for (int i = 0; i < NPL; i++) {
      if (i >= uPlN) break;
      vec4 p = uPlP[i]; vec3 d = p.xyz - vWp; float r = length(d); if (r >= p.w) continue;
      float a = 1.0 - r / p.w; vec3 L = d / max(r, 0.001); col += uPlC[i] * (a * a * pow(max(dot(n, normalize(L + V)), 0.0), uK.x) * uK.y * 0.7);
    }
  }
  col += vC * (vK.y * 1.7);
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
  gl_FragColor.rgb = fogC(gradeC(gl_FragColor.rgb), vM);
}`;
  const kMat = new THREE.ShaderMaterial({ vertexShader: VS, fragmentShader: FS, uniforms: Object.assign({ uK: { value: new THREE.Vector4(...KC.plastic) } }, UV) });
  K.mats = [kMat];
  const kpool = (name, geo, order) => { const P = E.pool(name, geo, kMat, { iK: 2 }, true, order == null ? 2 : order, 1); E.pools.push(P); return P };
  const pB = kpool('k-kloetze', boxGeo), pS = kpool('k-noppen', studGeo), pD = kpool('k-zerfall', boxGeo);
  const pAO = E.pool('k-kontakt', E.flatGeo, E.shMat, { iSA: 2 }, false, 1); E.pools.push(pAO);
  K.pools = [pB, pS, pD, pAO];

  // ---------- Matrizen und Teile ----------
  const _p = new THREE.Vector3(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s = new THREE.Vector3(), _l = new THREE.Matrix4(), fm = new THREE.Matrix4(), white = new THREE.Color(1, 1, 1), hitC = new THREE.Color(), yAx = new THREE.Vector3(0, 1, 0);
  const jt = (par, out, x, y, z, rx, ry, rz) => { _p.set(x, y, z); _e.set(rx || 0, ry || 0, rz || 0, 'ZXY'); _q.setFromEuler(_e); _s.set(1, 1, 1); _l.compose(_p, _q, _s); return out.multiplyMatrices(par, _l) };
  const M = n => Array.from({ length: n }, () => new THREE.Matrix4()), mRoot = new THREE.Matrix4(), mB = new THREE.Matrix4(), mH = new THREE.Matrix4(), mT = new THREE.Matrix4(), mS = M(2), mE = M(2), mL = M(2), mKn = M(2), mD = new THREE.Matrix4();
  let hitNow = 0, alNow = 1, nP = 0, topY = 0, out = null, curP = pB, iB = 0;
  // Teil in Gelenk par: Mitte (x,y,z), Groesse (sx,sy,sz), Farbe, Leuchten em, Drehung (rx,rz) vor der Verschiebung. Im Sammelmodus (out) nur merken (Zerfall), sonst in den Pool schreiben.
  function part(par, x, y, z, sx, sy, sz, col, em, rx, rz) {
    _p.set(x, y, z); _e.set(rx || 0, 0, rz || 0, 'ZXY'); _q.setFromEuler(_e); _s.set(sx, sy, sz); _l.compose(_p, _q, _s); fm.multiplyMatrices(par, _l);
    const c = hitNow ? hitC.copy(col).lerp(white, FG.hit) : col;
    if (out) { out.push({ m: fm.clone(), c: c.clone(), e: em || 0, s: [sx, sy, sz] }); return }
    const i = iB++; pB.im.setMatrixAt(i, fm); pB.im.setColorAt(i, c); pB.a.iK.setXY(i, alNow, em || 0); nP++; if (fm.elements[13] > topY) topY = fm.elements[13];
  }
  const rotY = (x, y, a, k) => { _p.set(x, 0, y); _q.setFromAxisAngle(yAx, -a); _s.set(k, k, k); return mRoot.compose(_p, _q, _s) };
  const typeOf = (o, e) => E.typeOf(o, e), lerp = (a, b, t) => a + (b - a) * t;

  // ---------- Figur ----------
  function fig(o, e, col0) {
    const T0 = typeOf(o, e), OT = FG.out[T0], k = (1 + ((e.r || 9) - 9) * FG.size) * KC.size, lying = !!(e.lie || o.lie), kneel = !lying && o.col === 8, run = !lying && !kneel && o.col < 6;
    const pw = Math.PI * 2 / KC.step, qw = run ? Math.round((o.w || 0) / pw) * pw : 0, sw = run ? Math.sin(qw) : 0, stepOdd = run ? (Math.round((o.w || 0) / pw) & 1) : 0;
    const gun = !lying && !kneel && o.ar && T0 !== 'sniper', rifle = !lying && !kneel && o.rf, shield = !lying && !kneel && o.sh >= 0, side = [1, -1];
    const top = colOf(OT.top), bot = colOf(OT.bot), skin = colOf(FG.skin), glv = colOf(OT.gl || FG.skin), hat = colOf(OT.hat || OT.bot), dark = colOf(FG.dark), eye = colOf(FG.eye), gunC = colOf(FG.gun), boot = colOf(FG.boot);
    hitNow = o.hit; alNow = o.al; nP = 0; topY = 0;
    rotY(o.x, o.y, o.a, k);
    const legH = D.footH + D.shin + D.thigh, tH = D.torsoH, hd = D.head;
    if (lying) jt(mRoot, mB, (legH + D.pelvH + tH + hd) / 2, D.torsoD / 2 + .2, 0, 0, 0, Math.PI / 2); else mB.copy(mRoot);
    let hipY = legH, bob = 0, lean = 0;
    const hip = [0, 0], kn = [0, 0], spread = [0, 0], sh = [[.12, 0], [.12, 0]], el = [.1, .1];
    if (run) { hip[0] = KC.run * sw; hip[1] = -KC.run * sw; kn[0] = sw < -.3 ? -.9 : -.15; kn[1] = sw > .3 ? -.9 : -.15; lean = KC.tilt; bob = stepOdd ? .5 : 0; sh[0][1] = -KC.swing * sw; sh[1][1] = KC.swing * sw; el[0] = el[1] = .45 }
    if (kneel) { hipY = D.shin * .98 + D.legW * .4; hip[0] = hip[1] = .02; kn[0] = kn[1] = -Math.PI / 2 }
    if (lying) { hip[0] = -.1; hip[1] = .08; kn[0] = -.2; spread[0] = -.08; spread[1] = .05 }
    if (gun) { sh[0] = [0, Math.PI / 2 - .05]; el[0] = 0; sh[1] = [-.38, 1.22]; el[1] = .3 }
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
    if (gun) { jt(mE[0], mD, 0, -D.armF - D.hand * .3, 0); part(mD, 3, -.4, 0, 6.4, 1.8, 1.3, gunC); part(mD, .5, -2.2, 0, 1.8, 3.6, 1.3, gunC) }
    if (rifle) { const L0 = 18; part(mT, D.torsoD / 2 + L0 / 2 - 4, tH * .82, 1.5, L0, 1.8, 1.5, gunC); part(mT, D.torsoD / 2 - 5, tH * .82 - .7, 1.5, 5.5, 3.2, 1.7, colOf(FG.stock)); part(mT, D.torsoD / 2 + 4, tH * .82 + 1.8, 1.5, 6, 1.8, 1.8, gunC); extra++ }
    if (shield) { const c = E.xcol.sh[o.sh > .5 ? 0 : o.sh > .25 ? 1 : 2]; part(mB, D.torsoD / 2 + 5, 16.5, -1.5, 1.8, 27, 17, c, .12); part(mB, D.torsoD / 2 + 6, 22, -1.5, .8, 5, 11, dark); extra++ }
    if (o.bag) { part(mT, -D.torsoD / 2 - 3.6, tH * .56, 0, 5.4, 10.6, 8, colOf(FG.bag)); extra++ }
    if (out) return extra;
    return extra;
  }

  // ---------- Fahrzeug aus Bausteinen (Vorwaerts +x, oben +y, rechts +z) ----------
  const carLook = (o, e) => {
    const rowC = (() => { const c = (E.carCol[o.row] || E.carCol[0]).clone(), h = {}; c.getHSL(h); return c.setHSL(h.h, Math.min(1, h.s * KC.sat), h.l) })(), pol = o.k === 'pol' || (o.k === 'vh' && e.bar);
    return { pol, body: pol ? colOf(KC.car.pol[0]) : rowC.clone().multiplyScalar(1.05), roof: pol ? colOf(KC.car.pol[1]) : rowC.clone().multiplyScalar(1.15) };
  };
  let carBlink = 0;
  function car(o, e, look, collect) {
    const Lc = o.L * C.carK[0], Wc = o.W * C.carK[1], H = e.h, kind = o.k, dim = o.dim ? C.wreckDim : 0;
    rotY(o.x, o.y, o.a, 1); hitNow = 0; alNow = 1;
    const wheel = colOf(KC.car.wheel), glass = colOf(KC.car.glass), body = look.body, roof = look.roof, G = () => 0;
    const wr = 5.6, wz = Wc / 2 - 1.6;
    if (kind === 'wreck') {
      const sc = colOf(KC.car.scorch), cl = colOf(KC.car.ember), fl = .25 + .2 * Math.sin(carBlink * 7 + o.x);
      part(mRoot, 0, 7, 0, Lc, 8, Wc * .96, sc); part(mRoot, Lc * .3, 12.5, 0, Lc * .3, 4, Wc * .9, sc); part(mRoot, -Lc * .1, 13, 1, Lc * .3, 5, Wc * .7, colOf(0x3a3330), 0, 0, .12);
      part(mRoot, -Lc * .32, 11, -wz * .5, 9, 3, 9, cl, fl, 0, .2); part(mRoot, Lc * .1, 15, wz * .4, 7, 3, 7, cl, fl * .7, 0, -.15);
      for (const [sx, sz] of [[.32, 1], [.32, -1], [-.32, 1], [-.32, -1]]) part(mRoot, Lc * sx, wr, sz * wz, wr * 2, wr * 2, 6, wheel);
      return;
    }
    const van = kind === 'van' || kind === 'tk' || kind === 'vh';
    const wax = kind === 'tk' ? [.36, .12, -.14, -.38] : [.32, -.32];
    for (const ax of wax) for (const sz of [1, -1]) { part(mRoot, Lc * ax, wr, sz * wz, wr * 2, wr * 2, 6.4, wheel); part(mRoot, Lc * ax, wr, sz * (wz + 3.4), wr * .9, wr * .9, 1, colOf(0xb9bfc7), .05) }
    if (!van) {
      part(mRoot, 0, 8.6, 0, Lc, 9, Wc, body);
      part(mRoot, Lc * .33, 15.4, 0, Lc * .3, 4.2, Wc * .94, roof); part(mRoot, -Lc * .39, 15.4, 0, Lc * .2, 4.2, Wc * .94, roof);
      part(mRoot, -Lc * .03, 19.5, 0, Lc * .4, 12, Wc * .9, roof);
      part(mRoot, -Lc * .03, 19.6, 0, Lc * .36, 5.6, Wc * .9 + 1.4, glass, .02); part(mRoot, -Lc * .03 + Lc * .2 - .6, 19.6, 0, 1.4, 5.6, Wc * .8, glass); part(mRoot, -Lc * .03 - Lc * .2 + .6, 19.6, 0, 1.4, 5.6, Wc * .8, glass);
      part(mRoot, -Lc * .03, 25.6, 0, Lc * .34, 2, Wc * .84, roof);
      part(mRoot, Lc / 2 - .6, 6.2, 0, 3, 3.4, Wc * 1.02, colOf(0x30343b)); part(mRoot, -Lc / 2 + .6, 6.2, 0, 3, 3.4, Wc * 1.02, colOf(0x30343b));
      for (const sz of [1, -1]) { part(mRoot, Lc / 2 + .1, 12.2, sz * Wc * .32, 1.2, 3, 7, colOf(KC.car.lamp), .75); part(mRoot, -Lc / 2 - .1, 12.2, sz * Wc * .32, 1.2, 3, 7, colOf(KC.car.tail), .55) }
      if (look.pol) { part(mRoot, 0, 8.6, 0, Lc * .98, 3.4, Wc * 1.02, roof); if (e.bar) { const a = o.bl === 1; part(mRoot, -Lc * .03, 28.4, -Wc * .22, 4.6, 3.8, Wc * .34, colOf(a ? KC.car.bar[0] : KC.car.bar[1]), o.bl ? .95 : .06); part(mRoot, -Lc * .03, 28.4, Wc * .22, 4.6, 3.8, Wc * .34, colOf(a ? KC.car.bar[1] : KC.car.bar[0]), o.bl ? .95 : .06) } }
    } else {
      const bodyH = H - 11, cabL = Lc * (kind === 'tk' ? .24 : .3), boxL = Lc - cabL - 1;
      part(mRoot, 0, 8, 0, Lc, 6, Wc * .96, colOf(0x30343b));
      part(mRoot, -Lc / 2 + boxL / 2, 11 + bodyH / 2, 0, boxL, bodyH, Wc * .98, kind === 'tk' ? colOf(0x59636b) : roof);
      part(mRoot, Lc / 2 - cabL / 2, 11 + (bodyH * .76) / 2, 0, cabL, bodyH * .76, Wc * .94, kind === 'tk' ? colOf(0x4a535b) : body);
      part(mRoot, Lc / 2 - cabL / 2 + 1, 11 + bodyH * .56, 0, cabL * .8, bodyH * .3, Wc * .94 + 1.4, glass); part(mRoot, Lc / 2 - .8, 11 + bodyH * .56, 0, 1.4, bodyH * .3, Wc * .8, glass);
      if (kind === 'tk') for (let i = 0; i < 3; i++) part(mRoot, -Lc / 2 + 12 + i * (boxL - 24) / 2, 11 + bodyH + .4, 0, 4, 1.2, Wc * .9, colOf(0x39414a));
      for (const sz of [1, -1]) { part(mRoot, Lc / 2 + .1, 12.4, sz * Wc * .32, 1.2, 3, 7, colOf(KC.car.lamp), .75); part(mRoot, -Lc / 2 - .1, 12.4, sz * Wc * .32, 1.2, 3, 7, colOf(KC.car.tail), .55) }
      if (e.bar) { const a = o.bl === 1; part(mRoot, Lc / 2 - cabL / 2, 11 + bodyH * .76 + 2.4, -Wc * .22, 4.6, 3.8, Wc * .34, colOf(a ? KC.car.bar[0] : KC.car.bar[1]), o.bl ? .95 : .06); part(mRoot, Lc / 2 - cabL / 2, 11 + bodyH * .76 + 2.4, Wc * .22, 4.6, 3.8, Wc * .34, colOf(a ? KC.car.bar[1] : KC.car.bar[0]), o.bl ? .95 : .06) }
    }
    void G; void dim; void H;
  }

  // ---------- Zerfall: Teile mit Physik, Funken, Rauch, Leuchten ----------
  const deb = [], sparks = [], puffs = [], flashes = [], queue = [];
  const tq = new THREE.Quaternion(), tq2 = new THREE.Quaternion(), tv = new THREE.Vector3(), tm = new THREE.Matrix4(), tp = new THREE.Vector3(), ts = new THREE.Vector3(), upV = new THREE.Vector3(0, 1, 0);
  // Oberkante des Koerpers der Kachel an (x, y) (Tresen 24, Wand 64), sonst 0: Teile prallen von Waenden ab und bleiben auf Moebeln liegen. Aus der Hoehentabelle V3CFG.cells, im Stil A und B ohne die Moebel (die stehen als Bausteine).
  const topH = (x, y) => { const c = E.cellAt(Math.floor(x / T), Math.floor(y / T)), e = C.cells[c]; if (!e || (e.open && X.vaultOpen)) return 0; let h = 0; for (const s of e.s) if (s[0] === 0) h = Math.max(h, s[1]); return h };
  const capD = () => KC.q.debris[q()] >> (lod() >= 3 ? 1 : 0);
  function spawnDeb(parts, cx, cy, o) {
    parts = parts.slice();
    const B = KC.deb, me = X.me;
    if (o.split) { const more = []; for (const p of parts) { const big = Math.max(...p.s); if (big < 9) continue; const n = big > 40 ? 6 : big > 20 ? 4 : 2; p.s = p.s.map(v => v * .5); for (let i = 0; i < n; i++) more.push({ m: p.m.clone().multiply(new THREE.Matrix4().makeTranslation(rr(-.5, .5), rr(-.5, .5), rr(-.5, .5))), c: p.c, e: p.e, s: p.s.map(v => v * rr(.45, .8)) }) } parts = parts.concat(more) }
    for (const p of parts) {
      p.m.decompose(tp, tq, ts); const kx = tp.x - cx, kz = tp.z - cy, l = Math.hypot(kx, kz) || 1, v = rr(B.burstV[0], B.burstV[1]) * (o.k || 1);
      let bx = kx / l, bz = kz / l; if (o.dir) { bx = bx * .6 + o.dir[0] * .8; bz = bz * .6 + o.dir[1] * .8 }
      else if (me) { const mx = cx - me.x, mz = cy - me.y, ml = Math.hypot(mx, mz) || 1; bx += mx / ml * (B.biasK / 100); bz += mz / ml * (B.biasK / 100) }
      deb.push({ x: tp.x, y: tp.y, z: tp.z, q: tq.clone(), s: p.s.map(v => v * (o.scale || 1)), c: p.c, em: p.e + (o.em || 0), hot: o.em || 0, vx: bx * v + rr(-25, 25), vy: rr(B.up[0], B.up[1]) * (o.up || 1), vz: bz * v + rr(-25, 25),
        wx: rr(-B.spin, B.spin), wy: rr(-B.spin, B.spin), wz: rr(-B.spin, B.spin), age: 0, rest: 0, life: rr(B.rest[0], B.rest[1]), still: 0 });
    }
    while (deb.length > capD()) deb.shift();
  }
  const sparkAt = (x, y, h, n, spd, col) => { for (let i = 0; i < n; i++) { const a = rnd() * 6.283, v = rr(.4, 1) * spd; sparks.push({ x, y, h, vx: Math.cos(a) * v, vy: Math.sin(a) * v, vh: rr(.3, 1.1) * spd * .9, l: rr(.35, .9), m: .9, c: col || 0 }) } while (sparks.length > KC.q.sparks[q()]) sparks.shift() };
  const smokeAt = (x, y, h, n, big) => { for (let i = 0; i < n; i++) puffs.push({ x: x + rr(-8, 8), y: y + rr(-8, 8), h: h + rr(0, 8), vh: rr(14, 30), vx: rr(-8, 8), vy: rr(-8, 8), s: rr(8, 14) * (big || 1), l: rr(1.6, 3.4), m: 3.4, a: rr(.35, .6) }); while (puffs.length > KC.q.smoke[q()]) puffs.shift() };
  // Ereignisse aus dyn: Figur zerfaellt, Auto explodiert
  function burstFig(o, e) {
    const o2 = Object.assign({}, o, { col: 6, lie: 0, hit: 0, al: 1, ar: 0 }), e2 = Object.assign({}, e, { lie: 0 }); out = []; const keep = pB.im ? 0 : 0; void keep; fig(o2, e2); const parts = out; out = null;
    spawnDeb(parts, o.x, o.y, { k: 1 }); sparkAt(o.x, o.y, 14, 10, 150, 1); flashes.push({ x: o.x, y: o.y, t: 0, k: .5 });
  }
  function burstCar(o, e, look) {
    out = []; carBlink = 0; car(Object.assign({}, o, { k: look.k || 'civ', bl: 0 }), e, look); const parts = out; out = null;
    spawnDeb(parts, o.x, o.y, { k: 1.7, up: .75, em: .55, dir: null, split: 1, scale: .8 }); sparkAt(o.x, o.y, 16, 44, 200, 1); smokeAt(o.x, o.y, 12, 9, 1.8); flashes.push({ x: o.x, y: o.y, t: 0, k: .8 });
  }
  let carsNow = []; const seenKey = new Set(); let primed = false, lastT = null, prevCars = [], shotT = new Map(), alarmPh = 0, flashK = 0;
  K.reset = () => { seenKey.clear(); primed = false; deb.length = 0; sparks.length = 0; puffs.length = 0; flashes.length = 0; lastT = null; prevCars = []; shotT.clear() };

  // ---------- Bild: Figuren und Fahrzeuge, ruft die Ansicht in buildDyn ----------
  const figMax = 40, carMax = 40;
  K.dyn = (F, Cs, dynL) => {
    const rs = !!E.UL.uShOn.value; iB = 0; nP = 0;
    pB.size((F.length * figMax + Cs.length * carMax + 24 * 6) | 0); pB.u = 0;
    let nAO = 0; const aoN = F.length + Cs.length; pAO.size(aoN);
    const aoA = pAO.a.iSA, tmpM = new THREE.Matrix4(), tmpQ = new THREE.Quaternion(), tmpP = new THREE.Vector3(), tmpS = new THREE.Vector3();
    const ao = (x, y, a, sx, sz, kind, al) => { tmpP.set(x, .4, y); tmpQ.setFromAxisAngle(yAx, -a); tmpS.set(sx, 1, sz); pAO.im.setMatrixAt(nAO, tmpM.compose(tmpP, tmpQ, tmpS)); aoA.setXY(nAO++, kind, al) };
    const dt0 = lastT, now = performance.now() / 1000; void dt0; void now;
    let gear = 0, lie = 0, hit = 0;
    for (const [o, e] of F) {
      const t0 = typeOf(o, e), lying = !!(e.lie || o.lie);
      if (o.k === 'tot' && KC.burst.includes(t0)) { const key = 't' + Math.round(o.x) + ',' + Math.round(o.y) + ',' + o.row; if (!seenKey.has(key)) { seenKey.add(key); if (primed) queue.push({ k: 'fig', o: Object.assign({}, o), e }) } continue }
      if (lying) { ao(o.x + 3, o.y + 4, o.a, 54, 30, 0, .3 * o.al); lie++ } else { ao(o.x, o.y, 0, 24, 21, 0, .42); if (o.fl) { dynL.push({ k: 'muz', x: o.x + Math.cos(o.a) * LC.pl.muz.d, y: o.y + Math.sin(o.a) * LC.pl.muz.d }); if (queue.length < 48) queue.push({ k: 'casing', o: Object.assign({}, o) }) } }
      gear += fig(o, e); if (o.hit) hit++; o._hs = lying ? FG.hsLie : o.col === 8 ? FG.hsCow : FG.hs;
    }
    const cars = []; carsNow = [];
    for (const [o, e] of Cs) {
      const look = carLook(o, e); look.k = o.k;
      if (o.k === 'wreck') { const key = 'w' + Math.round(o.x / 6) + ',' + Math.round(o.y / 6); if (!seenKey.has(key)) { seenKey.add(key); if (primed) { let best = null, bd = 1e9; for (const p of prevCars) { const d = Math.hypot(p.o.x - o.x, p.o.y - o.y); if (d < bd) { bd = d; best = p } } queue.push({ k: 'car', o: Object.assign({}, o), e: best && bd < 40 ? best.e : e, look: best && bd < 40 ? best.look : look }) } } }
      else { cars.push({ o: Object.assign({}, o), e, look }); carsNow.push([o, e]) }
      ao(o.x + 2, o.y + 3, o.a, o.L * .96, o.W * .92, 1, .42);
      car(o, e, look);
      if (e.bar && o.bl) dynL.push({ k: o.bl === 1 ? 'red' : 'blue', x: o.x, y: o.y, car: o.k });
    }
    prevCars = cars; primed = true;
    pAO.u = nAO; pAO.finish(); pB.u = iB; pB.finish();
    // Alarm im Raum: zwei kreisende rote Lampen an der Decke naechster Lampen (nur im Ueberfall und in Gebaeuden)
    if (X.alarm && E.lamps.length) {
      const P = X.me, L = E.lamps.slice().sort((a, b) => (P ? Math.hypot(a.x - P.x, a.y - P.y) - Math.hypot(b.x - P.x, b.y - P.y) : 0)).slice(0, KC.alarm.n);
      L.forEach((l, i) => { const f = .5 + .5 * Math.sin(alarmPh * KC.alarm.spin + i * Math.PI); dynL.push({ k: 'alarm', x: l.x, y: l.y, i: .15 + .85 * f }) });
    }
    return { gear, lie, hit, parts: iB };
  };

  // ---------- Bild: Physik und Effekte (aus buildFx, mit Spielzeit t) ----------
  const sr = (c, a) => [c[0], c[1], c[2], a];
  K.step = (D0, FA, FN, dynL) => {
    const t = D0.t, dt = lastT == null ? 0 : Math.max(0, Math.min(.05, t - lastT)); if (lastT != null && t < lastT - 1) { K.reset(); lastT = t; return }
    const dr = lastT == null ? 0 : Math.max(0, Math.min(1, t - lastT)); lastT = t; alarmPh += dr; carBlink += dr;
    for (const j of queue.splice(0)) {
      if (j.k === 'fig') burstFig(j.o, j.e);
      else if (j.k === 'car') burstCar(j.o, j.e, j.look);
      else if (j.k === 'casing') { const o = j.o, last = shotT.get(o.x + ',' + o.y); void last; const kk = Math.round(o.x / 40) + ':' + Math.round(o.y / 40), lt = shotT.get(kk) || -9; if (t - lt > .09) { shotT.set(kk, t); const a = o.a + Math.PI / 2 + rr(-.4, .4); out = []; hitNow = 0; alNow = 1; rotY(o.x, o.y, o.a, 1); part(mRoot, 8, 24, 5, 2.4, 1.1, 1.1, colOf(FG.gold), .15); const parts = out; out = null; spawnDeb(parts, o.x - Math.cos(a) * 10, o.y - Math.sin(a) * 10, { k: .22, up: .5, scale: 1 }) } }
    }
    // Teile
    const B = KC.deb, nst = dt > 0 ? Math.ceil(dt / (1 / 60)) : 0, h = nst ? dt / nst : 0;
    for (let s = 0; s < nst; s++) for (const d of deb) {
      d.age += h; if (d.rest > 0) { d.still += h; continue }
      d.vy -= B.g * h; const nx = d.x + d.vx * h, nz = d.z + d.vz * h, lo = d.y - Math.min(d.s[0], d.s[1], d.s[2]) * .4;
      if (topH(nx, d.z) > lo) { d.vx *= -.45 } else d.x = nx; if (topH(d.x, nz) > lo) { d.vz *= -.45 } else d.z = nz;
      d.y += d.vy * h;
      tv.set(d.wx, d.wy, d.wz); const w = tv.length(); if (w > 1e-4) { tq2.setFromAxisAngle(tv.multiplyScalar(1 / w), w * h); d.q.premultiply(tq2) }
      const gh = topH(d.x, d.z), hh = gh + Math.max(.7, Math.min(d.s[0], d.s[1], d.s[2]) * .5);
      if (d.y <= hh) {
        d.y = hh; d.gh = gh; if (Math.abs(d.vy) > 40) sparkAt(d.x, d.z, 1.5, d.hot ? 2 : 0, 70, 1); d.vy = Math.abs(d.vy) > 30 ? -d.vy * B.bounce : 0;
        const f = Math.pow(B.fric, h * 6); d.vx *= f; d.vz *= f; d.wx *= f; d.wy *= f; d.wz *= f;
        if (Math.hypot(d.vx, d.vz) < 12 && d.vy === 0) { d.rest = 1; d.still = 0 }
      }
    }
    // Funken und Rauch
    for (let i = sparks.length - 1; i >= 0; i--) { const s = sparks[i]; s.l -= dt; if (s.l <= 0) { sparks.splice(i, 1); continue } s.vh -= B.g * .8 * dt; s.x += s.vx * dt; s.y += s.vy * dt; s.h += s.vh * dt; if (s.h < 1) { s.h = 1; s.vh = Math.abs(s.vh) * .35; s.vx *= .6; s.vy *= .6 } }
    for (let i = puffs.length - 1; i >= 0; i--) { const s = puffs[i]; s.l -= dt; if (s.l <= 0) { puffs.splice(i, 1); continue } s.x += s.vx * dt; s.y += s.vy * dt; s.h += s.vh * dt; s.s += 6 * dt }
    for (let i = flashes.length - 1; i >= 0; i--) { const f = flashes[i]; f.t += dt; if (f.t > .3) { flashes.splice(i, 1); continue } }
    let fl = 0; for (const f of flashes) fl = Math.max(fl, f.k * (1 - f.t / .3));
    flashK = Math.max(flashK * Math.pow(.02, dt), fl);
    // wegschmelzen: Teile in der Ruhe verschwinden nach life Sekunden, am Ende klein werden
    for (let i = deb.length - 1; i >= 0; i--) if (deb[i].rest && deb[i].still > deb[i].life + B.fade) deb.splice(i, 1);
    // in den Pool
    pD.size(deb.length); deb.forEach((d, i) => {
      let k = 1; if (d.rest) { const u = d.still - d.life; if (u > 0) k = Math.max(0, 1 - u / B.fade); if (d.rest === 1) { d.rest = 2; // einrasten: die Achse, die am meisten nach oben zeigt, genau nach oben, Lage auf den Boden
          let bi = 0, bv = -1, sg = 1; for (let a = 0; a < 3; a++) { tv.set(a === 0 ? 1 : 0, a === 1 ? 1 : 0, a === 2 ? 1 : 0).applyQuaternion(d.q); if (Math.abs(tv.y) > bv) { bv = Math.abs(tv.y); bi = a; sg = tv.y < 0 ? -1 : 1 } }
          tv.set(bi === 0 ? 1 : 0, bi === 1 ? 1 : 0, bi === 2 ? 1 : 0).applyQuaternion(d.q).multiplyScalar(sg); tq2.setFromUnitVectors(tv, upV); d.q.premultiply(tq2); d.y = (d.gh || 0) + d.s[bi] / 2 } }
      tp.set(d.x, d.y, d.z); ts.set(d.s[0] * k, d.s[1] * k, d.s[2] * k); pD.im.setMatrixAt(i, tm.compose(tp, d.q, ts)); pD.im.setColorAt(i, d.c);
      const em = d.hot ? Math.max(0, d.em * Math.max(0, 1 - d.age / 1.6)) : d.em; pD.a.iK.setXY(i, 1, em);
    });
    pD.u = deb.length; pD.finish();
    // Quads fuer die Ansicht
    const fp = E.fp, hc = E.hc;
    for (const s of sparks) { const a = s.l / s.m, c = s.c ? [1, .78, .34] : [1, .62, .22]; fp(FA, s.x, s.y, s.h, 1.1, 3, c, Math.min(1, a * 1.6), -s.vx * .045, -s.vy * .045, 0, -s.vh * .045) }
    for (const s of puffs) { const a = s.l / s.m; fp(FN, s.x, s.y, s.h, s.s, 0, [.2 + .1 * a, .19 + .1 * a, .19 + .08 * a], s.a * Math.min(1, a * 2.2) * .8) }
    for (const f of flashes) { const a = 1 - f.t / .3; fp(FA, f.x, f.y, 14, 22 * f.k * (1 + f.t * 2), 0, hc(0xffb35a), .45 * a); fp(FA, f.x, f.y, 14, 7 * f.k, 0, hc(0xffffff), .6 * a) }
    // Leuchten der Bausteine: Haelo um Blaulicht, Heck- und Scheinwerfer, Bodenfarbe des Blaulichts, Alarmlampen
    for (const [o, e] of carsNow) {
      if (e.bar && o.bl) { const a = o.bl === 1, c1 = hc(a ? KC.car.bar[0] : KC.car.bar[1]), c2 = hc(a ? KC.car.bar[1] : KC.car.bar[0]), ca = Math.cos(o.a), sa = Math.sin(o.a), bh = (o.k === 'pol' ? 28 : 11 + (e.h - 11) * .76 + 2.4) + 2, bx = o.k === 'pol' ? -(o.L * C.carK[0]) * .03 : (o.L * C.carK[0]) / 2 - o.L * C.carK[0] * .15, wz = o.W * C.carK[1] * .22;
        for (const [sz, c] of [[-1, c1], [1, c2]]) { const lx = o.x + ca * bx - sa * sz * wz, ly = o.y + sa * bx + ca * sz * wz; fp(FA, lx, ly, bh, 13, 0, c, .72); fp(FA, lx, ly, bh, 5, 0, [1, 1, 1], .7) }
        fp(FA, o.x, o.y, .5, 92, 0, c1, .2, 0, 0, 1); fp(FA, o.x, o.y, .5, 60, 0, c2, .12, 0, 0, 1) }
    }
    if (X.alarm && E.lamps.length) { let n = 0; for (const l of dynL) if (l.k === 'alarm') { fp(FA, l.x, l.y, 56, 12 + 16 * l.i, 0, hc(0xff2a1c), .2 + .6 * l.i); const a = alarmPh * KC.alarm.spin + n++ * Math.PI; for (let j = 1; j <= 6; j++) fp(FA, l.x + Math.cos(a) * j * 22, l.y + Math.sin(a) * j * 22, .5, 10 + j * 6, 0, hc(0xff2a1c), .42 * l.i + .06, 0, 0, 1) } }
    for (const f of flashes) dynL.push({ k: 'boom', x: f.x, y: f.y, r: 220 * f.k, i: (1 - f.t / .3) * f.k * .7 });
  };

  // ---------- Welt: Moebel als Bausteine, Noppen, Bauplatte, Fugen ----------
  let worldMeshes = [];
  const furnChars = Object.keys(KC.furn);
  K.cells = Object.fromEntries(Object.entries(C.cells).map(([k, v]) => [k, furnChars.includes(k) ? Object.assign({}, v, { s: [] }) : v]));
  const studsOn = () => KC.q.studs[q()] > 0;
  K.world = () => {
    for (const m of worldMeshes) { scene.remove(m); m.dispose && m.dispose() } worldMeshes = []; K.stats = null; if (!K.on) return;
    const B = [], S = [], A = [], x0 = X.WX0, y0 = X.WY0;
    const addB = (x, z, y0_, sx, sy, sz, col, em, rot) => B.push([x, z, y0_, sx, sy, sz, colOf(col), em || 0, rot || 0]);
    const studs = (cx, cz, sx, sz, h, col) => { const nx = Math.max(1, Math.round(sx / KC.stud)), nz = Math.max(1, Math.round(sz / KC.stud)); if (sx < 9 || sz < 9) return; for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) S.push([cx - sx / 2 + (i + .5) * sx / nx, cz - sz / 2 + (j + .5) * sz / nz, h, colOf(col)]) };
    for (let y = y0; y < y0 + X.H; y++) for (let x = x0; x < x0 + X.W; x++) {
      const c = E.cellAt(x, y), F = KC.furn[c], spec = C.cells[c]; if (!spec) continue;
      if (F) {
        const ins = spec.ins || 0, top = spec.s[0][1], cx = x * T + T / 2, cz = y * T + T / 2, w = T - 2 * ins;
        addB(cx, cz, 0, w, top, w, F.col); A.push([cx, cz, w + 9]);
        if (F.st) studs(cx, cz, w - 2, w - 2, top, F.col);
        if (F.x === 'mon') { addB(cx, cz + w * .04, top, 13, 2, 8, 0x5c6470); addB(cx, cz + 1, top + 2, 15, 10, 2.4, 0x20262e); addB(cx, cz + 2.5, top + 3.4, 11.4, 7.2, .6, 0x4aa8e8, 1) }
        if (F.x === 'till') { addB(cx, cz, top, 14, 6, 11, 0x8a929c); addB(cx, cz + 5.6, top + 3, 8, 2.4, .6, 0x7ee34a, 1) }
        if (F.x === 'atm') { addB(cx, cz + w / 2 - .3, 28, 12, 9, .8, 0x22d3ee, 1) ; addB(cx, cz + w / 2 - .3, 14, 9, 3, .8, 0x303842) }
        if (F.x === 'crate') { addB(cx, cz, top * .5, w + 1.2, 2.4, w + 1.2, 0x7a5a2c); addB(cx, cz, 0, 3, top + .6, w + 1, 0x7a5a2c) }
        if (F.x === 'barrel') { addB(cx, cz, top * .22, w + 1, 2.4, w + 1, 0x2a2e36); addB(cx, cz, top * .66, w + 1, 2.4, w + 1, 0x2a2e36) }
        if (F.x === 'plant') { B.pop(); addB(cx, cz, 0, w * .9, 13, w * .9, F.col); for (let i = 0; i < 3; i++) addB(cx, cz, 13 + i * 7, (w + 5) * (1 - i * .22), 8, (w + 5) * (1 - i * .22), i === 1 ? 0x4fb858 : 0x3a9a46, 0, i * .45) }
      } else if (K.stil === 2 && studsOn() && spec.s.some(s => s[0] === 0 && s[1] === KC.wall) && !spec.glass && !spec.fence) { studs(x * T + T / 2, y * T + T / 2, T - 2 * (spec.ins || 0), T - 2 * (spec.ins || 0), KC.wall, 0xc7ccd4) }
    }
    const mk = (L, geo, name, f) => { if (!L.length) return; const im = new THREE.InstancedMesh(geo.clone(), kMat, L.length); const ik = new THREE.InstancedBufferAttribute(new Float32Array(L.length * 2), 2); im.geometry.setAttribute('iK', ik); im.name = name; im.frustumCulled = false; im.layers.enable(1); im.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(L.length * 3), 3); f(im, ik); im.instanceMatrix.needsUpdate = true; im.instanceColor.needsUpdate = true; scene.add(im); worldMeshes.push(im) };
    mk(B, boxGeo, 'k-moebel', (im, ik) => B.forEach((b, i) => { _p.set(b[0], b[2] + b[4] / 2, b[1]); _q.setFromAxisAngle(yAx, b[8]); _s.set(b[3], b[4], b[5]); im.setMatrixAt(i, tm.compose(_p, _q, _s)); im.setColorAt(i, b[6]); ik.setXY(i, 1, b[7]) }));
    mk(S, studGeo, 'k-wandnoppen', (im, ik) => S.forEach((s, i) => { _p.set(s[0], s[2], s[1]); _q.identity(); _s.set(KC.studR * 2, KC.studH, KC.studR * 2); im.setMatrixAt(i, tm.compose(_p, _q, _s)); im.setColorAt(i, s[3]); ik.setXY(i, 1, 0) }));
    // Kontakt unter den Moebeln
    if (A.length) { const g = E.flatGeo, im = new THREE.InstancedMesh(g.clone(), E.shMat, A.length), ik = new THREE.InstancedBufferAttribute(new Float32Array(A.length * 2), 2); im.geometry.setAttribute('iSA', ik); im.renderOrder = 1; im.frustumCulled = false; A.forEach((a, i) => { _p.set(a[0], .4, a[1]); _q.identity(); _s.set(a[2], 1, a[2]); im.setMatrixAt(i, tm.compose(_p, _q, _s)); ik.setXY(i, 1, .3) }); im.instanceMatrix.needsUpdate = true; scene.add(im); worldMeshes.push(im) }
    K.stats = { furn: B.length, studs: S.length, ao: A.length };
  };

  // Shader der Welt: Fugen und Noppen (Stil B), getauscht beim Stilwechsel
  const STUDF = `
vec3 studC(vec3 c, vec2 w, inout vec3 n, float top) {
  vec2 sp = fract(w / ${KC.stud.toFixed(1)}) - 0.5; float d = length(sp); float disc = 1.0 - smoothstep(0.27, 0.31, d);
  float ring = smoothstep(0.27, 0.32, d) * (1.0 - smoothstep(0.32, 0.46, d));
  n = normalize(n + vec3(sp.x, 0.0, sp.y) * disc * 1.6 * top);
  c *= 1.0 + 0.13 * disc - 0.22 * ring * top;
  c += vec3(0.1) * disc * pow(max(0.0, 1.0 - length(sp - vec2(-0.1, -0.12)) * 3.2), 2.0) * top;
  return c;
}`;
  K.patch = on => {
    const grPatch = 'gl_FragColor = vec4(litC(mix(texture2D(map, vUv).rgb, d.rgb, d.a), vWp, vec3(0.0, 1.0, 0.0)), 1.0);';
    if (!on && !K.patched) return; K.patched = on; const gm = E.groundMat; if (!gm._kOrig) gm._kOrig = gm.fragmentShader;
    gm.fragmentShader = on ? gm._kOrig.replace('void main()', STUDF + '\nvoid main()').replace(grPatch, 'vec3 gn = vec3(0.0, 1.0, 0.0); vec3 gc = studC(mix(texture2D(map, vUv).rgb, d.rgb, d.a), vWp.xz, gn, 1.0); gl_FragColor = vec4(litC(gc, vWp, gn), 1.0);') : gm._kOrig; gm.needsUpdate = true;
    const wl = 'gl_FragColor = vec4(litC(c * vSh, vW, vN), uA);';
    for (const m of E.mats) { if (!m._kOrig) m._kOrig = m.fragmentShader;
      m.fragmentShader = on ? m._kOrig.replace('void main()', STUDF + '\nvoid main()').replace(wl, `vec3 wn = vN;
  if (vN.y > 0.5) { c = studC(c, vW.xz, wn, 1.0); } else { float u = abs(vN.x) > 0.5 ? vW.z : vW.x; float row = floor(vW.y / 8.0); vec2 g = vec2(fract((u + mod(row, 2.0) * 8.0) / 16.0), fract(vW.y / 8.0));
    c *= 1.0 - 0.3 * max(1.0 - smoothstep(0.0, 0.09, g.y), 1.0 - smoothstep(0.0, 0.05, g.x)) + 0.07 * smoothstep(0.86, 1.0, g.y); }
  gl_FragColor = vec4(litC(c * vSh, vW, wn), uA);`) : m._kOrig; m.needsUpdate = true }
  };

  // ---------- Bloom: Szene in eine Flaeche (sRGB kodiert), helle Stellen herausfiltern, auf halber und Viertel-Aufloesung weichzeichnen, wieder addieren ----------
  const fsGeo = new THREE.BufferGeometry(); fsGeo.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
  const fsScene = new THREE.Scene(), fsCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), fsMesh = new THREE.Mesh(fsGeo, null); fsMesh.frustumCulled = false; fsScene.add(fsMesh);
  const FV = 'varying vec2 vUv; void main() { vUv = position.xy * 0.5 + 0.5; gl_Position = vec4(position.xy, 0.0, 1.0); }';
  const fsMat = (fs, u) => new THREE.ShaderMaterial({ vertexShader: FV, fragmentShader: fs, uniforms: u, depthTest: false, depthWrite: false });
  const mBright = fsMat('uniform sampler2D tS; uniform vec2 uT; varying vec2 vUv; void main() { vec3 c = texture2D(tS, vUv).rgb; float l = dot(c, vec3(0.3, 0.55, 0.15)); gl_FragColor = vec4(c * smoothstep(uT.x, uT.x + uT.y, l), 1.0); }', { tS: { value: null }, uT: { value: new THREE.Vector2(KC.bloom.thr, KC.bloom.knee) } });
  const mBlur = fsMat('uniform sampler2D tS; uniform vec2 uD; varying vec2 vUv; void main() { vec3 s = texture2D(tS, vUv).rgb * 0.2270; s += (texture2D(tS, vUv + uD * 1.3846).rgb + texture2D(tS, vUv - uD * 1.3846).rgb) * 0.3162; s += (texture2D(tS, vUv + uD * 3.2308).rgb + texture2D(tS, vUv - uD * 3.2308).rgb) * 0.0703; gl_FragColor = vec4(s, 1.0); }', { tS: { value: null }, uD: { value: new THREE.Vector2() } });
  const mComp = fsMat('uniform sampler2D tS; uniform sampler2D tA; uniform sampler2D tB; uniform vec2 uS; varying vec2 vUv; void main() { vec3 s = texture2D(tS, vUv).rgb, b = texture2D(tA, vUv).rgb * uS.x + texture2D(tB, vUv).rgb * uS.y; gl_FragColor = vec4(1.0 - (1.0 - s) * (1.0 - clamp(b, 0.0, 1.0)), 1.0); }', { tS: { value: null }, tA: { value: null }, tB: { value: null }, uS: { value: new THREE.Vector2() } });
  const mkRT = (w, h, ms) => new THREE.WebGLRenderTarget(w, h, { depthBuffer: !!ms, samples: ms || 0, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, generateMipmaps: false });
  let rtS = null, rtA = null, rtA2 = null, rtB = null, rtB2 = null, rw = 0, rh = 0, v2 = new THREE.Vector2();
  const pass = (mat, to) => { fsMesh.material = mat; ren.setRenderTarget(to); ren.render(fsScene, fsCam) };
  const bloomOn = () => KC.q.bloom[q()] > 0 && lod() < 2;
  K.bloom = false; K.passCalls = 0;
  K.render = (scene_, cam_) => {
    if (!bloomOn()) { K.bloom = false; ren.render(scene_, cam_); return }
    ren.getDrawingBufferSize(v2); const w = v2.x, h = v2.y;
    if (w !== rw || h !== rh || !rtS) { for (const r of [rtS, rtA, rtA2, rtB, rtB2]) r && r.dispose(); rw = w; rh = h; rtS = mkRT(w, h, 4); rtA = mkRT(w >> 1, h >> 1); rtA2 = mkRT(w >> 1, h >> 1); rtB = mkRT(w >> 2, h >> 2); rtB2 = mkRT(w >> 2, h >> 2) }
    ren.info.autoReset = false; ren.info.reset();
    ren.setRenderTarget(rtS); ren.render(scene_, cam_);
    mBright.uniforms.tS.value = rtS.texture; pass(mBright, rtA);
    const bl = (src, tmp, dst, ww, hh) => { mBlur.uniforms.tS.value = src.texture; mBlur.uniforms.uD.value.set(1 / ww, 0); pass(mBlur, tmp); mBlur.uniforms.tS.value = tmp.texture; mBlur.uniforms.uD.value.set(0, 1 / hh); pass(mBlur, dst) };
    bl(rtA, rtA2, rtA, w >> 1, h >> 1);
    mBlur.uniforms.uD.value.set(0, 0); mBlur.uniforms.tS.value = rtA.texture; pass(mBlur, rtB); // runter auf Viertel (Filter), dann weichzeichnen
    bl(rtB, rtB2, rtB, w >> 2, h >> 2);
    const B = KC.bloom, f = 1 + flashK * B.flash;
    mComp.uniforms.tS.value = rtS.texture; mComp.uniforms.tA.value = rtA.texture; mComp.uniforms.tB.value = rtB.texture; mComp.uniforms.uS.value.set(B.s[0] * f, B.s[1] * f); pass(mComp, null);
    K.passCalls = ren.info.render.calls; ren.info.autoReset = true; K.bloom = true;
  };

  // ---------- Stilwechsel ----------
  let applied = -1;
  K.sync = () => {
    const w = Math.max(0, Math.min(2, X.kstil | 0)); K.on = w > 0 && !K.dead; K.stil = w;
    if (w === applied) return false; const was = applied; applied = w; K.patch(w === 2); if (was === -1 && w === 0) return false; return true;
  };
  K.info = () => ({ alarmPh: Math.round(alarmPh * 100) / 100, stil: K.stil, on: K.on, deb: deb.length, sparks: sparks.length, puffs: puffs.length, parts: iB, bloom: K.bloom, passCalls: K.passCalls, flash: Math.round(flashK * 100) / 100, world: K.stats || null, studs: studsOn(), q: q(), cars: carsNow.length });
  K.debris = () => deb.map(d => [Math.round(d.x), Math.round(d.y * 10) / 10, Math.round(d.z), d.rest]);
  K.dispose = () => { for (const m of worldMeshes) { scene.remove(m); m.dispose && m.dispose() } worldMeshes = []; for (const r of [rtS, rtA, rtA2, rtB, rtB2]) r && r.dispose(); for (const m of [kMat, mBright, mBlur, mComp]) m.dispose(); boxGeo.dispose(); studGeo.dispose(); fsGeo.dispose(); K.patch(false); K.dead = true; K.on = false; };
  return K;
}
mkKlotz.api = 1;
