/* Holdup: Kloetzchen-Stil der 3D-Ansicht, Kern (Ticket 196 und 198, docs/plan-3d.md Abschnitt 2.24). ES-Modul, wird von index.html per import() mit ?v=N geladen, wenn der Stil an ist (Standard in 3D,
   Rueckweg: Taste F7, #klassisch in der Adresse oder localStorage holdup.stil=klassisch). Die Dateien kl-*.js (Liste KL_FILES) werden von hier mit derselben ?v=N nachgeladen, jede exportiert register(KL)
   und traegt nur Bauer ein. Neue Art: Bauer in die passende Datei schreiben und dort mit KL.fig, KL.car, KL.obj oder KL.fx eintragen, view3d.js und kl-kern.js bleiben unberuehrt.
   Gibt es fuer eine Art keinen Bauer, zeichnet view3d sie wie ohne Stil (Low-Poly-Figur, Kasten mit 2D-Dach, Szenario-Kloetze), so bleibt jedes Szenario spielbar.
   Register (KL, ein Objekt je Seite):
     KL.fig(art, (k, o, e) => extra)    Figur der Art (Ergebnis von V3CFG.fig typeOf: cop, swat, shield, sniper, grd, civA, civB, tel, mgr, rob0 bis rob3). Baut mit k.part in die Gelenke, liefert die Zahl der Zusatzteile.
     KL.car(art, (k, o, e, look) => 0)  Fahrzeug der Art (pol, civ, wreck, van, vh, tk), Mitte und Lage aus o.
     KL.obj(name, fn)                   Name mit einem Zeichen: Kachel des Rasters, fn(k, x, y, ch, spec) wird beim Bau der Welt gerufen (k.brick, k.studs, k.shadow), die Kachel verliert dann ihren Standardkoerper.
                                        Name sonst: Art eines Szenario-Teils (scen3d, V3CFG.scen.kinds), fn(k, o) je Bild (k.dbrick fuer Kloetze), ersetzt den Bauplan in view3d. 'art:unterart' (zum Beispiel good:statue mit o.n) gilt vor 'art'.
     KL.fx(name, fn)                    Effekt-Haken: 'frame' (k, ctx) je Bild mit Spielzeit, 'fig-tot' (k, {o,e}) neue Leiche, 'car-wreck' (k, {o,e,look}) neues Wrack, 'casing' (k, {o}) Schuss einer Figur.
   Das Werkzeug k (siehe mkKl): part, jt, rotY, collect, brick, spawnDeb, sparkAt, smokeAt, flash, fp, hc, addLight und Konstanten.
   Alles Zeichnen, nichts davon beruehrt Spielzustand oder Netz: Zerfall und Effekte entstehen aus dem Zustand, den auch ein Client hat (figs3d, fx3d), nicht aus Host-Code. */
import * as THREE from '../assets/three.module.min.js';

export const KL_API = 1;
export const KL_FILES = ['kl-figuren.js', 'kl-fahrzeuge.js', 'kl-effekte.js', 'kl-dinge-allgemein.js', 'kl-dinge-welt.js', 'kl-dinge-bank.js', 'kl-dinge-juwelier.js', 'kl-dinge-tankstelle.js', 'kl-dinge-strasse.js', 'kl-dinge-museum.js', 'kl-dinge-casino.js', 'kl-dinge-notenbank.js', 'kl-dinge-gefaengnis.js', 'kl-pickups.js'];

export const KCFG = {
  // Masse der Figur in Weltpixeln (Figur rund 38 hoch, Kopf ein Wuerfel): Fuss (Laenge, Hoehe, Breite), Unter- und Oberschenkel, Beinbreite, Huefte, Becken, Rumpf, Arme, Hand, Kopf, Fase
  dim: { footL: 7.4, footH: 2.6, footW: 5, shin: 5, thigh: 5.5, legW: 4.8, hipW: 3.4, pelvH: 3, torsoH: 10.5, torsoW: 12.6, torsoD: 8.4, armU: 5.4, armF: 5, armT: 4.2, hand: 3.6, head: 11, neck: .6, bevel: .13 },
  // steifes Laufen: Laufphase auf so viele Stufen je Umlauf eingerastet, Beinschwung, Armschwung, Vorlage
  step: 6, run: .78, swing: .7, tilt: .12,
  // Plastik: Glanzexponent, Staerke des Glanzlichts, Himmelsspiegelung, Rand (Fresnel); satte Farben und Figurengroesse; Kamera naeher (Faktor auf den Abstand, 1 wie ohne Stil)
  plastic: [46, .7, .04, .16], sat: 1.4, size: 1.22, zoom: .8,
  // je Grafikstufe (niedrig, mittel, hoch): Obergrenzen fliegender Teile, Funken, Rauchpuffer, Bloom an, Wandkanten-Noppen
  // Kleinteile: Klotz mit kleinster Kante unter small Weltpixeln wird ein Quader ohne Fase (12 statt 108 Dreiecke), sonst zu viele Dreiecke in den Moebeln
  small: 4.5,
  // Noppen (Bauklotz-Knoepfe) auf Moebeln, Dachflaechen und Fahrzeugen: 0 aus (Standard, Ticket 215), 1 an. Zentraler Schalter, k.studs (Welt) und die Dach-Noppen der Fahrzeuge fragen nur hier
  studs: 0,
  q: { debris: [160, 320, 560], sparks: [60, 120, 220], smoke: [24, 48, 80], bloom: [0, 1, 1] },
  // Zerfall: Schwerkraft, Rueckprall, Reibung, Liegezeit (von bis), Verschwinden, Anfangsgeschwindigkeit, Aufwaerts, Drehung, Zug weg vom Spieler (Prozent), Huelsen
  deb: { g: 520, bounce: .38, fric: .62, rest: [5.5, 8.5], fade: .8, burstV: [70, 190], up: [140, 300], spin: 9, biasK: 70 },
  bloom: { thr: .9, knee: .1, s: [.26, .34], flash: .45 },
  alarm: { n: 2, spin: 3.2 },
  // Glas-Splitter einer zerschossenen Scheibe (Ticket 207): Anzahl je Grafikstufe, Groesse von bis, Tempo, Aufwaerts, Liegezeit, Leuchten, Deckkraft, Funken, Farben
  glass: { n: [6, 12, 18], size: [2, 4.2], k: .55, up: .55, rest: [.8, 1.6], em: .05, a: .45, sparks: 6, col: [0xcfeeff, 0xa9d8f5, 0xe8f6ff] },
  // pal: Lackfarben der zivilen Autos (gesaettigt, nach der Zeile aus cars.png gewaehlt), Streifenwagen blau und weiss (pol, Dach und Seiten 0xd5dae1 in kl-fahrzeuge.js)
  // Fluchtwagen (Ticket 245): fpal Grundfarben der vier Varianten (Lieferwagen cremeweiss, Kleinbus dunkel, Pickup oliv, Kastenwagen beige), facc Firmenfarben, ftarp Plane
  car: { fpal: [0xe8e4d4, 0x2a3340, 0x6a7b52, 0xb7b08a], facc: [0xd8412f, 0x1f6fd0, 0x2f9e55, 0xe8a31c], ftarp: 0x4a6b8a, pal: [0xd8322b, 0x2f6fd6, 0xe8b21c, 0x2f9e55, 0xe8741f, 0x7b4fc4, 0x1fa3b4, 0xc9ced6, 0x2b2f38], pol: [0x2b55b8, 0xeef1f4], bar: [0xff3a30, 0x3a6bff], wheel: 0x24272d, glass: 0x1f3550, lamp: 0xfff1b8, tail: 0xff3b2e, scorch: 0x2a2522, ember: 0xff7a2a },
};

// Ausgabe in sRGB selbst kodieren: auf dem Bildschirm dasselbe wie bisher, beim Zeichnen in die Zwischenflaeche des Bloom (die ohne Kodierung linear bliebe) bleiben Nebel und Farbkorrektur im selben Farbraum.
THREE.ShaderChunk.colorspace_fragment = 'gl_FragColor = sRGBTransferOETF( gl_FragColor );';

// ---------- Register ----------
export const KL = {
  api: KL_API, files: [], figs: {}, cars: {}, objs: {}, fxs: {},
  fig(art, f) { this.figs[art] = f }, car(art, f) { this.cars[art] = f }, obj(name, f, opts) { this.objs[name] = f; this.objOpts[name] = opts || {} }, plain: new Set(), objOpts: {}, fx(name, f) { (this.fxs[name] || (this.fxs[name] = [])).push(f) },
  hasFig(a) { return !!this.figs[a] }, hasCar(a) { return !!this.cars[a] }, hasObj(a) { return !!this.objs[a] },
};
{ // alle kl-Dateien laden (gleiche ?v=N wie dieser Kern) und eintragen lassen
  const base = import.meta.url, q = new URL(base).search;
  const mods = await Promise.all(KL_FILES.map(f => import(new URL('./' + f + q, base).href)));
  mods.forEach((m, i) => { if (typeof m.register !== 'function') throw new Error(KL_FILES[i] + ' ohne register(KL)'); m.register(KL); KL.files.push(KL_FILES[i]) });
}

export function mkKl(E) {
  const { X, C, scene, ren, UV, st } = E, KC = KCFG, D = KC.dim, FG = C.fig, T = X.T, LC = C.light;
  if (!LC.pl.alarm) LC.pl.alarm = { h: 58, r: 240, col: [1, .16, .1], i: 3.2 };
  const K = { on: false, dead: false, KL };
  const q = () => Math.max(0, Math.min(2, X.gfx | 0)), lod = () => X.lod | 0;
  const satC = new Map(), colOf = h => { let c = satC.get(h); if (!c) { c = E.colOf(h).clone(); const o = {}; c.getHSL(o); c.setHSL(o.h, Math.min(1, o.s * KC.sat), o.l); satC.set(h, c) } return c };
  const rnd = (() => { let s = 196; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 } })(), rr = (a, b) => a + (b - a) * rnd();

  // ---------- Geometrie: Quader mit Fase (Einheitswuerfel) und Noppe ----------
  function bevelBox(r) {
    const tk = [-.5, -.5 + r, .5 - r, .5], P = [], N = [], I = [], inn = .5 - r;
    for (const [iu, iv, ia, sg] of [[0, 1, 2, 1], [0, 1, 2, -1], [1, 2, 0, 1], [1, 2, 0, -1], [2, 0, 1, 1], [2, 0, 1, -1]]) {
      const base = P.length / 3;
      for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) {
        const p = [0, 0, 0]; p[iu] = tk[i]; p[iv] = tk[j]; p[ia] = sg * .5;
        const c = p.map(v => Math.max(-inn, Math.min(inn, v))), d = p.map((v, k) => v - c[k]), l = Math.hypot(d[0], d[1], d[2]);
        const n = l > 1e-6 ? d.map(v => v / l) : (() => { const z = [0, 0, 0]; z[ia] = sg; return z })();
        P.push(c[0] + n[0] * r, c[1] + n[1] * r, c[2] + n[2] * r); N.push(n[0], n[1], n[2]);
      }
      for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) { const a = base + j * 4 + i, c = a + 4; I.push(a, c, a + 1, a + 1, c, c + 1) }
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3)); g.setIndex(I);
    const pa = g.attributes.position, na = g.attributes.normal, ix = g.index.array; // Umlaufsinn nach aussen
    for (let t = 0; t < ix.length; t += 3) {
      const a = ix[t], b = ix[t + 1], c = ix[t + 2], ux = pa.getX(b) - pa.getX(a), uy = pa.getY(b) - pa.getY(a), uz = pa.getZ(b) - pa.getZ(a), vx = pa.getX(c) - pa.getX(a), vy = pa.getY(c) - pa.getY(a), vz = pa.getZ(c) - pa.getZ(a);
      if ((uy * vz - uz * vy) * (na.getX(a) + na.getX(b) + na.getX(c)) + (uz * vx - ux * vz) * (na.getY(a) + na.getY(b) + na.getY(c)) + (ux * vy - uy * vx) * (na.getZ(a) + na.getZ(b) + na.getZ(c)) < 0) { ix[t + 1] = c; ix[t + 2] = b }
    }
    return g;
  }
  const flatBox = new THREE.BoxGeometry(1, 1, 1), boxGeo = bevelBox(D.bevel), studGeo = new THREE.CylinderGeometry(.42, .5, 1, 7).translate(0, .5, 0);

  // ---------- Plastik-Shader: Licht, Schatten, Punktlichter und Nebel wie die Welt (litC), dazu Glanz, Himmelsspiegelung, Rand, Eigenleuchten (iK.y), Deckkraft als Raster (iK.x) ----------
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
  // Glas (Ticket 207): durchsichtig (Deckkraft KC.glass.a), ohne Tiefenschreiben, staerker spiegelnd; nur fuer Glas-Splitter des Zerfalls (spawnDeb mit glass: 1)
  const kGlass = new THREE.ShaderMaterial({ vertexShader: VS, fragmentShader: FS.replace('gl_FragColor = vec4(col, 1.0);', 'gl_FragColor = vec4(col, ' + (KC.glass ? KC.glass.a : .45).toFixed(3) + ');'), transparent: true, depthWrite: false, uniforms: Object.assign({ uK: { value: new THREE.Vector4(KC.plastic[0] * 1.5, KC.plastic[1] * 1.9, KC.plastic[2], KC.plastic[3]) } }, UV) });
  const pG = E.pool('k-glas', boxGeo, kGlass, { iK: 2 }, true, 6, 0); E.pools.push(pG);
  const pB = kpool('k-kloetze', boxGeo), pD = kpool('k-zerfall', boxGeo), pT = kpool('k-dinge', boxGeo), pT2 = kpool('k-dinge-klein', flatBox), pF = kpool('k-kloetze-klein', flatBox);
  // Umriss der Figuren (Ticket 189 auch im Kloetzchen-Stil): dieselbe Lage aufgeblasen, nur Rueckseiten, Tag dunkel, Nacht hell (FG.look)
  const olMat = new THREE.ShaderMaterial({ side: THREE.BackSide, uniforms: Object.assign({}, UV),
    vertexShader: 'attribute vec4 iO; varying vec4 vO; varying vec2 vM; void main() { vO = iO;\n#ifdef USE_INSTANCING_COLOR\n#endif\n vec4 wp = modelMatrix * instanceMatrix * vec4(position, 1.0); vM = wp.xz; gl_Position = projectionMatrix * viewMatrix * wp; }',
    fragmentShader: E.GL.VISF + 'varying vec4 vO; varying vec2 vM; void main() { if (vO.a < 0.99 && fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715)))) > vO.a) discard; gl_FragColor = vec4(vO.rgb, 1.0);\n#include <colorspace_fragment>\n gl_FragColor.rgb = fogC(gl_FragColor.rgb, vM); }' });
  const olCd = new THREE.Color(), olCn = new THREE.Color(), olTmp = new THREE.Color(); let olCol = olCd, olA = 1;
  const pO = E.pool('k-umriss', boxGeo, olMat, { iO: 4 }, false, 2); E.pools.push(pO);
  const pAO = E.pool('k-kontakt', E.flatGeo, E.shMat, { iSA: 2 }, false, 1); E.pools.push(pAO);

  // ---------- Werkzeug fuer die Bauer ----------
  const _p = new THREE.Vector3(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s = new THREE.Vector3(), _l = new THREE.Matrix4(), fm = new THREE.Matrix4(), white = new THREE.Color(1, 1, 1), hitC = new THREE.Color(), yAx = new THREE.Vector3(0, 1, 0);
  const jt = (par, out, x, y, z, rx, ry, rz) => { _p.set(x, y, z); _e.set(rx || 0, ry || 0, rz || 0, 'ZXY'); _q.setFromEuler(_e); _s.set(1, 1, 1); _l.compose(_p, _q, _s); return out.multiplyMatrices(par, _l) };
  const mats = n => Array.from({ length: n }, () => new THREE.Matrix4());
  let hitNow = 0, alNow = 1, out = null, iB = 0, iF = 0, nP = 0, iO = 0, olT = 0, olNt = false;
  // Teil im Gelenk par: Mitte (x,y,z), Groesse, Farbe, Leuchten em, Drehung (rx, rz) vor der Verschiebung. Im Sammelmodus (collect) wird nur gemerkt, sonst in den Pool geschrieben.
  function part(par, x, y, z, sx, sy, sz, col, em, rx, rz) {
    _p.set(x, y, z); _e.set(rx || 0, 0, rz || 0, 'ZXY'); _q.setFromEuler(_e); _s.set(sx, sy, sz); _l.compose(_p, _q, _s); fm.multiplyMatrices(par, _l);
    const c = hitNow ? hitC.copy(col).lerp(white, FG.hit) : col;
    if (out) { out.push({ m: fm.clone(), c: c.clone(), e: em || 0, s: [sx, sy, sz] }); return }
    // Kleinteile (kleinste Kante unter KC.small) als Quader ohne Fase (12 statt 108 Dreiecke), wie die Kleinteile der Moebel
    if (Math.min(sx, sy, sz) < KC.small) { const j = iF++; pF.im.setMatrixAt(j, fm); pF.im.setColorAt(j, c); pF.a.iK.setXY(j, alNow, em || 0) }
    else { const i = iB++; pB.im.setMatrixAt(i, fm); pB.im.setColorAt(i, c); pB.a.iK.setXY(i, alNow, em || 0) }
    nP++;
    if (olT > 0 && Math.min(sx, sy, sz) >= 3.9) { _s.set(sx + 2 * olT, sy + 2 * olT, sz + 2 * olT); _l.compose(_p, _q, _s); fm.multiplyMatrices(par, _l); pO.a.iO.setXYZW(iO, olCol.r, olCol.g, olCol.b, olA); pO.im.setMatrixAt(iO++, fm) }
  }
  const mRoot = new THREE.Matrix4(), rotY = (x, y, a, k) => { _p.set(x, 0, y); _q.setFromAxisAngle(yAx, -a); _s.set(k, k, k); return mRoot.compose(_p, _q, _s) };
  const kit = {
    X, C, E, KC, D, FG, T, THREE, colOf, topAt: E.topAt, rnd, rr, jt, mats, part, rotY, root: mRoot, typeOf: E.typeOf, xcol: E.xcol, carCol: E.carCol, carLook: null,
    state(hit, al) { hitNow = hit; alNow = al == null ? 1 : al }, // Umriss je Figur (Ticket 248, Stile X.olv, Taste F6): 0 wie bisher, 1 duenner und halbtransparent, 2 nur bei aehnlichem Grund (Farbabstand Figur zu Boden), 3 in der Spielerfarbe
    outline(on, o) {
      if (!on || !FG.look.out) { olT = 0; return }
      const v = X.olv | 0, w0 = olNt ? FG.look.outNightW : FG.look.out; let w = w0, a = olNt ? FG.look.outNightA : 1, c = olNt ? olCn : olCd;
      if (v === 1) { w = w0 * .55; a *= .5 }
      else if (v === 2 && o && E.groundLum) { const T0 = FG.out[E.typeOf(o, {})]; const h = T0 ? T0.top : 0x808080, lf = ((h >> 16 & 255) * .299 + (h >> 8 & 255) * .587 + (h & 255) * .114) / 255; a *= Math.max(0, Math.min(1, 1 - Math.abs(lf - E.groundLum(o.x, o.y)) / .34)); if (a < .05) { olT = 0; return } }
      else if (v === 3 && o && o.k === 'pl' && o.sc) { c = olTmp.set(o.sc); w = w0 * .8; a = olNt ? .85 : .9 }
      olT = w; olCol = c; olA = a;
    },
    olState: () => ({ t: olT, a: olA, c: olCol.getHex() }),
    // Teile einer Figur oder eines Fahrzeugs einsammeln (ohne zu zeichnen): fn() ruft part, Ergebnis die Teile mit Lage in der Welt
    collect(fn) { const was = out, r = []; out = r; try { fn() } finally { out = was } return r },
    time: 0, dt: 0, FA: null, FN: null, light: null,
  };
  K.kit = kit;
  // Aussehen eines Fahrzeugs: Karosserie und Dach aus der Zeile in cars.png (satter), Streifenwagen blau und weiss
  kit.carLook = (o, e) => {
    const rowC = (() => { const c = (E.carCol[o.row] || E.carCol[0]).clone(), h = {}; c.getHSL(h); return c.setHSL(h.h, Math.min(1, h.s * KC.sat), h.l) })(), pol = o.k === 'pol' || (o.k === 'vh' && e.bar);
    return { pol, body: pol ? colOf(KC.car.pol[0]) : rowC.clone().multiplyScalar(1.05), roof: pol ? colOf(KC.car.pol[1]) : rowC.clone().multiplyScalar(1.15) };
  };

  // ---------- Zerfall: Teile mit Physik, Funken, Rauch, Leuchten ----------
  const deb = [], sparks = [], puffs = [], flashes = [], queue = [];
  const tq = new THREE.Quaternion(), tq2 = new THREE.Quaternion(), tv = new THREE.Vector3(), tm = new THREE.Matrix4(), tp = new THREE.Vector3(), ts = new THREE.Vector3(), upV = new THREE.Vector3(0, 1, 0);
  // Oberkante des Koerpers der Kachel an (x, y) (Tresen 24, Wand 64) aus der Hoehentabelle: Teile prallen von Waenden ab und bleiben auf Kanten liegen
  const topH = (x, y) => { const c = E.cellAt(Math.floor(x / T), Math.floor(y / T)), e = C.cells[c]; if (!e || (e.open && X.vaultOpen)) return 0; let h = 0; for (const s of e.s) if (s[0] === 0) h = Math.max(h, s[1]); return h };
  const capD = () => KC.q.debris[q()] >> (lod() >= 3 ? 1 : 0);
  // parts aus collect; o: k Tempo, up Aufwaerts, em Glut, dir (Richtung), scale, split (grosse Teile in viele kleine teilen), rest [von, bis] Liegezeit in Sekunden (sonst KC.deb.rest)
  kit.spawnDeb = (parts, cx, cy, o) => {
    parts = parts.slice(); o = o || {}; const B = KC.deb, me = X.me;
    if (o.split) { const more = []; for (const p of parts) { const big = Math.max(...p.s); if (big < 9) continue; const n = big > 40 ? 6 : big > 20 ? 4 : 2; p.s = p.s.map(v => v * .5); for (let i = 0; i < n; i++) more.push({ m: p.m.clone().multiply(new THREE.Matrix4().makeTranslation(rr(-.5, .5), rr(-.5, .5), rr(-.5, .5))), c: p.c, e: p.e, s: p.s.map(v => v * rr(.45, .8)) }) } parts = parts.concat(more) }
    for (const p of parts) {
      p.m.decompose(tp, tq, ts); const kx = tp.x - cx, kz = tp.z - cy, l = Math.hypot(kx, kz) || 1, v = rr(B.burstV[0], B.burstV[1]) * (o.k || 1);
      let bx = kx / l, bz = kz / l; if (o.dir) { bx = bx * .6 + o.dir[0] * .8; bz = bz * .6 + o.dir[1] * .8 } else if (me) { const mx = cx - me.x, mz = cy - me.y, ml = Math.hypot(mx, mz) || 1; bx += mx / ml * (B.biasK / 100); bz += mz / ml * (B.biasK / 100) }
      deb.push({ x: tp.x, y: tp.y, z: tp.z, q: tq.clone(), s: p.s.map(v => v * (o.scale || 1)), c: p.c, em: p.e + (o.em || 0), hot: o.em || 0, vx: bx * v + rr(-25, 25), vy: rr(B.up[0], B.up[1]) * (o.up || 1), vz: bz * v + rr(-25, 25),
        wx: rr(-B.spin, B.spin), wy: rr(-B.spin, B.spin), wz: rr(-B.spin, B.spin), g: o.glass ? 1 : 0, age: 0, rest: 0, life: o.rest ? rr(o.rest[0], o.rest[1]) : rr(B.rest[0], B.rest[1]), still: 0 });
    }
    while (deb.length > capD()) deb.shift();
  };
  kit.sparkAt = (x, y, h, n, spd, col) => { for (let i = 0; i < n; i++) { const a = rnd() * 6.283, v = rr(.4, 1) * spd; sparks.push({ x, y, h, vx: Math.cos(a) * v, vy: Math.sin(a) * v, vh: rr(.3, 1.1) * spd * .9, l: rr(.35, .9), m: .9, c: col || 0 }) } while (sparks.length > KC.q.sparks[q()]) sparks.shift() };
  kit.smokeAt = (x, y, h, n, big) => { for (let i = 0; i < n; i++) puffs.push({ x: x + rr(-8, 8), y: y + rr(-8, 8), h: h + rr(0, 8), vh: rr(14, 30), vx: rr(-8, 8), vy: rr(-8, 8), s: rr(8, 14) * (big || 1), l: rr(1.6, 3.4), m: 3.4, a: rr(.35, .6) }); while (puffs.length > KC.q.smoke[q()]) puffs.shift() };
  kit.flash = (x, y, kk) => flashes.push({ x, y, t: 0, k: kk });
  kit.addLight = o => kit.light && kit.light.push(o);
  kit.fp = (...a) => E.fp(...a); kit.hc = h => E.hc(h);
  kit.fire = (name, a) => { for (const f of KL.fxs[name] || []) f(kit, a) };

  let carsNow = [], figsNow = [], primed = false, lastT = null, prevCars = [], alarmPh = 0;
  const seenKey = new Set();
  K.reset = () => { seenKey.clear(); primed = false; deb.length = 0; sparks.length = 0; puffs.length = 0; flashes.length = 0; lastT = null; prevCars = []; queue.length = 0 };
  const hasFig = (o, e) => KL.hasFig(E.typeOf(o, e)), hasCar = o => KL.hasCar(o.k);
  K.hasFig = hasFig; K.hasCar = hasCar;

  // ---------- Bild: Figuren und Fahrzeuge der Arten mit Bauer (die anderen zeichnet view3d wie sonst) ----------
  const figMax = 40, carMax = 40;
  // Rueckfall fuer Arten ohne Bauer (zaehlt in info().fb, Test 220 verlangt 0): ein schlichter Kasten statt einer Figur oder eines Autos
  const fb = { fig: {}, car: {} }, gray = new THREE.Color(0x9aa3b0);
  const genFig = (k, o, e) => { k.state(o.hit, o.al); k.rotY(o.x, o.y, o.a, 1); k.part(k.root, 0, 11, 0, 8, 22, 12, gray); k.part(k.root, 0, 26, 0, 10, 8, 10, gray); return 0 };
  const genCar = (k, o) => { k.state(0, 1); k.rotY(o.x, o.y, o.a, 1); k.part(k.root, 0, 10, 0, o.L * .9, 20, o.W * .8, gray); return 0 };
  K.dyn = (F, Cs, dynL) => {
    iB = 0; iF = 0; nP = 0; iO = 0; olT = 0; kit.light = dynL; pO.size(F.length * 14);
    { const th = (X.LAY && X.LAY.theme) || {}; olNt = !!(X.night || th.tod === 'nacht' || th.tod === 'daemmerung'); olCd.set(FG.look.outDay); olCn.set(FG.look.outNight) } carsNow = []; figsNow = F;
    pB.size((F.length * figMax + Cs.length * carMax + 24 * 6 + 40 * 8) | 0); pB.u = 0; pF.size((F.length * figMax + Cs.length * carMax + 24 * 6 + 40 * 8) | 0); pF.u = 0;
    pAO.size(F.length + Cs.length + 40); let nAO = 0; const aoA = pAO.a.iSA, tmpM = new THREE.Matrix4(), tmpQ = new THREE.Quaternion(), tmpP = new THREE.Vector3(), tmpS = new THREE.Vector3();
    const ao = (x, y, a, sx, sz, kind, al) => { tmpP.set(x, .4, y); tmpQ.setFromAxisAngle(yAx, -a); tmpS.set(sx, 1, sz); pAO.im.setMatrixAt(nAO, tmpM.compose(tmpP, tmpQ, tmpS)); aoA.setXY(nAO++, kind, al) };
    let gear = 0, lie = 0, hit = 0;
    for (const [o, e] of F) {
      const art = E.typeOf(o, e), lying = !!(e.lie || o.lie);
      if (o.k === 'tot' && KL.fxs['fig-tot'] && !o.noBurst) { const key = 't' + Math.round(o.x) + ',' + Math.round(o.y) + ',' + o.row; if (!seenKey.has(key)) { seenKey.add(key); if (primed) queue.push({ n: 'fig-tot', a: { o: Object.assign({}, o), e, art } }) } if (K.burstArts.has(art)) continue }
      if (lying) { ao(o.x + 3, o.y + 4, o.a, 54, 30, 0, .3 * o.al); lie++ } else { ao(o.x, o.y, 0, 24, 21, 0, .42); if (o.fl) { dynL.push({ k: 'muz', x: o.x + Math.cos(o.a) * LC.pl.muz.d, y: o.y + Math.sin(o.a) * LC.pl.muz.d }); if (queue.length < 48) queue.push({ n: 'casing', a: { o: Object.assign({}, o) } }) } }
      kit.outline(true, o); if (!KL.figs[art]) fb.fig[art] = (fb.fig[art] || 0) + 1; gear += (KL.figs[art] || genFig)(kit, o, e); kit.outline(false); if (o.hit) hit++; o._hs = lying ? FG.hsLie : o.col === 8 ? FG.hsCow : FG.hs;
    }
    const cars = [];
    for (const [o, e] of Cs) {
      const look = kit.carLook(o, e); look.k = o.k;
      if (o.k === 'wreck') { const key = 'w' + Math.round(o.x / 6) + ',' + Math.round(o.y / 6); if (!seenKey.has(key)) { seenKey.add(key); if (primed) { let best = null, bd = 1e9; for (const p of prevCars) { const d = Math.hypot(p.o.x - o.x, p.o.y - o.y); if (d < bd) { bd = d; best = p } } queue.push({ n: 'car-wreck', a: { o: Object.assign({}, o), e: best && bd < 40 ? best.e : e, look: best && bd < 40 ? best.look : look } }) } } }
      else { cars.push({ o: Object.assign({}, o), e, look }); carsNow.push([o, e]) }
      ao(o.x + 2, o.y + 3, o.a, o.L * .96, o.W * .92, 1, .42);
      if (!KL.cars[o.k]) fb.car[o.k] = (fb.car[o.k] || 0) + 1; (KL.cars[o.k] || genCar)(kit, o, e, look);
      if (e.bar && o.bl) dynL.push({ k: o.bl === 1 ? 'red' : 'blue', x: o.x, y: o.y, car: o.k });
    }
    prevCars = cars; primed = true;
    kit.ao = ao; kit.fire('dyn', kit);   // Haken 'dyn': weitere dynamische Teile vor dem Abschluss der Pools (Aufnahmen, kl-pickups.js), Schatten ueber kit.ao
    pAO.u = nAO; pAO.finish(); pB.u = iB; pB.finish(); pF.u = iF; pF.finish(); pO.u = iO; pO.finish(); pO.im.instanceMatrix.needsUpdate = true;
    if (X.alarm && E.lamps.length) { // Alarm im Raum: zwei kreisende rote Lampen an der Decke (naechste Lampen), nur im Ueberfall
      const P = X.me, L = E.lamps.slice().sort((a, b) => (P ? Math.hypot(a.x - P.x, a.y - P.y) - Math.hypot(b.x - P.x, b.y - P.y) : 0)).slice(0, KC.alarm.n);
      L.forEach((l, i) => { const f = .5 + .5 * Math.sin(alarmPh * KC.alarm.spin + i * Math.PI); dynL.push({ k: 'alarm', x: l.x, y: l.y, i: .15 + .85 * f }) });
    }
    return { gear, lie, hit, parts: iB + iF };
  };
  K.burstArts = new Set(['cop', 'swat', 'grd', 'shield', 'sniper']); // Arten, deren Leiche zerfaellt (die Leiche selbst wird dann nicht gezeichnet)

  // ---------- Bild: Physik und Effekte (aus buildFx, mit Spielzeit t) ----------
  K.step = (D0, FA, FN, dynL) => {
    const t = D0.t; if (lastT != null && t < lastT - 1) { K.reset(); lastT = t; return }
    const dt = lastT == null ? 0 : Math.max(0, Math.min(.05, t - lastT)), dr = lastT == null ? 0 : Math.max(0, Math.min(1, t - lastT)); lastT = t; alarmPh += dr;
    kit.time = t; kit.dt = dt; kit.dr = dr; kit.alarmPh = alarmPh; kit.FA = FA; kit.FN = FN; kit.light = dynL; kit.cars = carsNow; kit.figs = figsNow; kit.flashes = flashes; kit.sparks = sparks; kit.puffs = puffs;
    for (const j of queue.splice(0)) kit.fire(j.n, j.a);
    const B = KC.deb, nst = dt > 0 ? Math.ceil(dt / (1 / 60)) : 0, h = nst ? dt / nst : 0;
    for (let s = 0; s < nst; s++) for (const d of deb) {
      d.age += h; if (d.rest > 0) { d.still += h; continue }
      d.vy -= B.g * h; const nx = d.x + d.vx * h, nz = d.z + d.vz * h, lo = d.y - Math.min(d.s[0], d.s[1], d.s[2]) * .4;
      if (topH(nx, d.z) > lo) { d.vx *= -.45 } else d.x = nx; if (topH(d.x, nz) > lo) { d.vz *= -.45 } else d.z = nz;
      d.y += d.vy * h;
      tv.set(d.wx, d.wy, d.wz); const w = tv.length(); if (w > 1e-4) { tq2.setFromAxisAngle(tv.multiplyScalar(1 / w), w * h); d.q.premultiply(tq2) }
      const gh = topH(d.x, d.z), hh = gh + Math.max(.7, Math.min(d.s[0], d.s[1], d.s[2]) * .5);
      if (d.y <= hh) {
        d.y = hh; d.gh = gh; if (Math.abs(d.vy) > 40) kit.sparkAt(d.x, d.z, 1.5, d.hot ? 2 : 0, 70, 1); d.vy = Math.abs(d.vy) > 30 ? -d.vy * B.bounce : 0;
        const f = Math.pow(B.fric, h * 6); d.vx *= f; d.vz *= f; d.wx *= f; d.wy *= f; d.wz *= f;
        if (Math.hypot(d.vx, d.vz) < 12 && d.vy === 0) { d.rest = 1; d.still = 0 }
      }
    }
    for (let i = sparks.length - 1; i >= 0; i--) { const s = sparks[i]; s.l -= dt; if (s.l <= 0) { sparks.splice(i, 1); continue } s.vh -= B.g * .8 * dt; s.x += s.vx * dt; s.y += s.vy * dt; s.h += s.vh * dt; if (s.h < 1) { s.h = 1; s.vh = Math.abs(s.vh) * .35; s.vx *= .6; s.vy *= .6 } }
    for (let i = puffs.length - 1; i >= 0; i--) { const s = puffs[i]; s.l -= dt; if (s.l <= 0) { puffs.splice(i, 1); continue } s.x += s.vx * dt; s.y += s.vy * dt; s.h += s.vh * dt; s.s += 6 * dt }
    for (let i = flashes.length - 1; i >= 0; i--) { const f = flashes[i]; f.t += dt; if (f.t > .3) flashes.splice(i, 1) }
    let fl = 0; for (const f of flashes) fl = Math.max(fl, f.k * (1 - f.t / .3)); flashK = Math.max(flashK * Math.pow(.02, dt), fl);
    for (let i = deb.length - 1; i >= 0; i--) if (deb[i].rest && deb[i].still > deb[i].life + B.fade) deb.splice(i, 1);
    let nG = 0; for (const d of deb) if (d.g) nG++; pD.size(deb.length - nG); pG.size(nG); let iD = 0, iG = 0; deb.forEach(d => { const Pq = d.g ? pG : pD, i = d.g ? iG++ : iD++;
      let k = 1; if (d.rest) { const u = d.still - d.life; if (u > 0) k = Math.max(0, 1 - u / B.fade); if (d.rest === 1) { d.rest = 2; // einrasten: die Achse, die am meisten nach oben zeigt, genau nach oben
          let bi = 0, bv = -1, sg = 1; for (let a = 0; a < 3; a++) { tv.set(a === 0 ? 1 : 0, a === 1 ? 1 : 0, a === 2 ? 1 : 0).applyQuaternion(d.q); if (Math.abs(tv.y) > bv) { bv = Math.abs(tv.y); bi = a; sg = tv.y < 0 ? -1 : 1 } }
          tv.set(bi === 0 ? 1 : 0, bi === 1 ? 1 : 0, bi === 2 ? 1 : 0).applyQuaternion(d.q).multiplyScalar(sg); tq2.setFromUnitVectors(tv, upV); d.q.premultiply(tq2); d.y = (d.gh || 0) + d.s[bi] / 2 } }
      tp.set(d.x, d.y, d.z); ts.set(d.s[0] * k, d.s[1] * k, d.s[2] * k); Pq.im.setMatrixAt(i, tm.compose(tp, d.q, ts)); Pq.im.setColorAt(i, d.c);
      Pq.a.iK.setXY(i, 1, d.hot ? Math.max(0, d.em * Math.max(0, 1 - d.age / 1.6)) : d.em);
    });
    pD.u = deb.length - nG; pD.finish(); pG.u = nG; pG.finish();
    const fp = E.fp; // Quads fuer die Ansicht: Funken, Rauch, Blitz
    for (const s of sparks) { const a = s.l / s.m, c = s.c ? [1, .78, .34] : [1, .62, .22]; fp(FA, s.x, s.y, s.h, 1.1, 3, c, Math.min(1, a * 1.6), -s.vx * .045, -s.vy * .045, 0, -s.vh * .045) }
    for (const s of puffs) { const a = s.l / s.m; fp(FN, s.x, s.y, s.h, s.s, 0, [.2 + .1 * a, .19 + .1 * a, .19 + .08 * a], s.a * Math.min(1, a * 2.2) * .8) }
    for (const f of flashes) { const a = 1 - f.t / .3; fp(FA, f.x, f.y, 14, 22 * f.k * (1 + f.t * 2), 0, E.hc(0xffb35a), .45 * a); fp(FA, f.x, f.y, 14, 7 * f.k, 0, E.hc(0xffffff), .6 * a); dynL.push({ k: 'boom', x: f.x, y: f.y, r: 220 * f.k, i: a * f.k * .7 }) }
    for (const q of GL.splice(0)) fp(FA, q[0], q[1], q[2], q[3], 0, E.hc(q[4]), q[5], 0, 0, q[6]);
    kit.fire('frame', kit);
  };
  let flashK = 0;
  K.hasPk = () => !!(KL.fxs.dyn && KL.fxs.dyn.length);   // ein Bauer fuer die Aufnahmen (Haken dyn) ersetzt die Billboards in view3d
  K.flashK = () => flashK;

  // ---------- Welt: Kacheln mit Bauer (Moebel als Bausteine), Szenario-Teile ----------
  let worldMeshes = [];
  const tileChars = () => Object.keys(KL.objs).filter(k => k.length === 1);
  K.cells = null;
  const mkCells = () => { const tc = tileChars().filter(c => !(KL.objOpts[c] && KL.objOpts[c].keep)); K.cells = Object.fromEntries(Object.entries(C.cells).map(([k, v]) => [k, KL.cellOver && KL.cellOver[k] ? KL.cellOver[k] : tc.includes(k) ? Object.assign({}, v, { s: [] }) : v])) }; mkCells(); // KL.cellOver: Hoehentabelle einer Kachel nur im Kloetzchen-Stil (zum Beispiel L: nur der Sturz, Tuer und Pfosten bauen die Kloetze)
  K.world = () => {
    for (const m of worldMeshes) { scene.remove(m); m.dispose && m.dispose() } worldMeshes = []; K.stats = null; if (!K.on) return;
    const B = [], S = [], A = [];
    const wk = Object.assign({}, kit, {
      brick: (x, z, y0, sx, sy, sz, col, em, rot) => B.push([x, z, y0, sx, sy, sz, colOf(col), em || 0, rot || 0]),
      studs: (cx, cz, sx, sz, h, col) => { if (!KC.studs) return; const nx = Math.max(1, Math.round(sx / 16)), nz = Math.max(1, Math.round(sz / 16)); if (sx < 9 || sz < 9) return; for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) S.push([cx - sx / 2 + (i + .5) * sx / nx, cz - sz / 2 + (j + .5) * sz / nz, h, colOf(col)]) },
      shadow: (cx, cz, size) => A.push([cx, cz, size]),
    });
    for (let y = X.WY0; y < X.WY0 + X.H; y++) for (let x = X.WX0; x < X.WX0 + X.W; x++) { const c = E.cellAt(x, y), f = KL.objs[c]; if (f && c.length === 1 && C.cells[c]) f(wk, x, y, c, C.cells[c]) }
    const mk = (L, geo, name, f) => { if (!L.length) return; const im = new THREE.InstancedMesh(geo.clone(), kMat, L.length), ik = new THREE.InstancedBufferAttribute(new Float32Array(L.length * 2), 2); im.geometry.setAttribute('iK', ik); im.name = name; im.frustumCulled = false; im.layers.enable(1); im.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(L.length * 3), 3); f(im, ik); im.instanceMatrix.needsUpdate = true; im.instanceColor.needsUpdate = true; scene.add(im); worldMeshes.push(im) };
    const sm = B.filter(b => Math.min(b[3], b[4], b[5]) < KC.small), bg = B.filter(b => Math.min(b[3], b[4], b[5]) >= KC.small), put = (L, name) => mk(L, name === 'k-moebel' ? boxGeo : flatBox, name, (im, ik) => L.forEach((b, i) => { _p.set(b[0], b[2] + b[4] / 2, b[1]); _q.setFromAxisAngle(yAx, b[8]); _s.set(b[3], b[4], b[5]); im.setMatrixAt(i, tm.compose(_p, _q, _s)); im.setColorAt(i, b[6]); ik.setXY(i, 1, b[7]) }));
    put(bg, 'k-moebel'); put(sm, 'k-moebel-klein');
    mk(S, studGeo, 'k-noppen', (im, ik) => S.forEach((s, i) => { _p.set(s[0], s[2], s[1]); _q.identity(); _s.set(8.8, 2.4, 8.8); im.setMatrixAt(i, tm.compose(_p, _q, _s)); im.setColorAt(i, s[3]); ik.setXY(i, 1, 0) }));
    if (A.length) { const im = new THREE.InstancedMesh(E.flatGeo.clone(), E.shMat, A.length), ik = new THREE.InstancedBufferAttribute(new Float32Array(A.length * 2), 2); im.geometry.setAttribute('iSA', ik); im.renderOrder = 1; im.frustumCulled = false; A.forEach((a, i) => { _p.set(a[0], .4, a[1]); _q.identity(); _s.set(a[2], 1, a[2]); im.setMatrixAt(i, tm.compose(_p, _q, _s)); ik.setXY(i, 1, .3) }); im.instanceMatrix.needsUpdate = true; scene.add(im); worldMeshes.push(im) }
    K.stats = { small: sm.length, bricks: B.length, studs: S.length, ao: A.length };
  };
  // Szenario-Teile (KL.obj mit Namen der Art): je Bild gesammelt und in einem Pool gezeichnet. Ruft view3d in buildScen.
  const SD = [];
  kit.dbrick = (x, z, y0, sx, sy, sz, a, col, em) => SD.push([x, z, y0, sx, sy, sz, a || 0, colOf(col), em || 0]);
  // gesammelte Teile (kit.collect) als Szenario-Kloetze setzen (nur Drehung um die Hochachse): fuer Fahrzeuge und Figuren als Szenario-Teil (zum Beispiel geparkte Autos)
  const _m = new THREE.Matrix4(), _pp = new THREE.Vector3(), _qq = new THREE.Quaternion(), _ss = new THREE.Vector3();
  kit.emit = parts => { for (const p of parts) { p.m.decompose(_pp, _qq, _ss); SD.push([_pp.x, _pp.z, _pp.y - _ss.y / 2, _ss.x, _ss.y, _ss.z, -2 * Math.atan2(_qq.y, _qq.w), p.c, p.e || 0]) } void _m };
  // weiches Leuchten am Boden oder in der Luft (additiv, fx-Puffer): wird im naechsten step in FA geschrieben (Sichtkegel der Wachen)
  const GL = []; kit.glow = (x, z, h, s, hex, a, flat) => { if (GL.length < 4000) GL.push([x, z, h, s, hex, a, flat ? 1 : 0]) };
  K.scenBegin = () => { SD.length = 0 };
  K.scenEnd = () => { const sm = q => Math.min(q[3], q[4], q[5]) < KC.small; for (const [P, L] of [[pT, SD.filter(q => !sm(q))], [pT2, SD.filter(sm)]]) { P.size(L.length); L.forEach((q, i) => { _p.set(q[0], q[2] + q[4] / 2, q[1]); _q.setFromAxisAngle(yAx, -q[6]); _s.set(q[3], q[4], q[5]); P.im.setMatrixAt(i, tm.compose(_p, _q, _s)); P.im.setColorAt(i, q[7]); P.a.iK.setXY(i, 1, q[8]) }); P.u = L.length; P.finish() } };
  // Bauer fuer ein Szenario-Teil o: erst die feine Art 'art:unterart' (zum Beispiel good:statue, o.n), dann die Art (good)
  K.sceneBuilder = o => KL.objs[o.k + ':' + o.n] || (o.k.length > 1 && KL.objs[o.k]) || null;

  // ---------- Bloom ----------
  const fsGeo = new THREE.BufferGeometry(); fsGeo.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
  const fsScene = new THREE.Scene(), fsCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), fsMesh = new THREE.Mesh(fsGeo, null); fsMesh.frustumCulled = false; fsScene.add(fsMesh);
  const FV = 'varying vec2 vUv; void main() { vUv = position.xy * 0.5 + 0.5; gl_Position = vec4(position.xy, 0.0, 1.0); }';
  const fsMat = (fs, u) => new THREE.ShaderMaterial({ vertexShader: FV, fragmentShader: fs, uniforms: u, depthTest: false, depthWrite: false });
  const mBright = fsMat('uniform sampler2D tS; uniform vec2 uT; varying vec2 vUv; void main() { vec3 c = texture2D(tS, vUv).rgb; float l = dot(c, vec3(0.3, 0.55, 0.15)); gl_FragColor = vec4(c * smoothstep(uT.x, uT.x + uT.y, l), 1.0); }', { tS: { value: null }, uT: { value: new THREE.Vector2(KC.bloom.thr, KC.bloom.knee) } });
  const mBlur = fsMat('uniform sampler2D tS; uniform vec2 uD; varying vec2 vUv; void main() { vec3 s = texture2D(tS, vUv).rgb * 0.2270; s += (texture2D(tS, vUv + uD * 1.3846).rgb + texture2D(tS, vUv - uD * 1.3846).rgb) * 0.3162; s += (texture2D(tS, vUv + uD * 3.2308).rgb + texture2D(tS, vUv - uD * 3.2308).rgb) * 0.0703; gl_FragColor = vec4(s, 1.0); }', { tS: { value: null }, uD: { value: new THREE.Vector2() } });
  const mComp = fsMat('uniform sampler2D tS; uniform sampler2D tA; uniform sampler2D tB; uniform vec2 uS; varying vec2 vUv; void main() { vec3 s = texture2D(tS, vUv).rgb, b = texture2D(tA, vUv).rgb * uS.x + texture2D(tB, vUv).rgb * uS.y; gl_FragColor = vec4(1.0 - (1.0 - s) * (1.0 - clamp(b, 0.0, 1.0)), 1.0); }', { tS: { value: null }, tA: { value: null }, tB: { value: null }, uS: { value: new THREE.Vector2() } });
  const mkRT = (w, h, ms) => new THREE.WebGLRenderTarget(w, h, { depthBuffer: !!ms, samples: ms || 0, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, generateMipmaps: false });
  let rtS = null, rtA = null, rtA2 = null, rtB = null, rtB2 = null, rw = 0, rh = 0; const v2 = new THREE.Vector2();
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
    mBlur.uniforms.uD.value.set(0, 0); mBlur.uniforms.tS.value = rtA.texture; pass(mBlur, rtB);
    bl(rtB, rtB2, rtB, w >> 2, h >> 2);
    const B = KC.bloom, f = 1 + flashK * B.flash;
    mComp.uniforms.tS.value = rtS.texture; mComp.uniforms.tA.value = rtA.texture; mComp.uniforms.tB.value = rtB.texture; mComp.uniforms.uS.value.set(B.s[0] * f, B.s[1] * f); pass(mComp, null);
    K.passCalls = ren.info.render.calls; ren.info.autoReset = true; K.bloom = true;
  };

  // ---------- Stil an oder aus (X.kstil: 0 klassisch, 1 Kloetzchen) ----------
  let applied = -1;
  K.zoom = () => K.on ? KC.zoom : 1;
  K.sync = () => { const w = 1; K.on = !K.dead; if (w === applied) return false; const was = applied; applied = w; return !(was === -1 && w === 0) };
  K.info = () => ({ ol: { n: iO, c: (olNt ? olCn : olCd).getHex(), a: olNt ? FG.look.outNightA : 1 }, fb, dinge: SD.length, on: K.on, files: KL.files.slice(), figs: Object.keys(KL.figs), cars: Object.keys(KL.cars), objs: Object.keys(KL.objs), deb: deb.length, sparks: sparks.length, puffs: puffs.length, parts: iB + iF, bloom: K.bloom, passCalls: K.passCalls, flash: Math.round(flashK * 100) / 100, world: K.stats || null, q: q(), carsK: carsNow.length, figsK: figsNow.length, alarmPh: Math.round(alarmPh * 100) / 100, zoom: K.zoom() });
  K.dingeList = () => SD.map(q => q.slice(0, 7));
  K.debris = () => deb.map(d => [Math.round(d.x), Math.round(d.y * 10) / 10, Math.round(d.z), d.rest]);
  K.dispose = () => { for (const m of worldMeshes) { scene.remove(m); m.dispose && m.dispose() } worldMeshes = []; for (const r of [rtS, rtA, rtA2, rtB, rtB2]) r && r.dispose(); for (const m of [kMat, kGlass, olMat, mBright, mBlur, mComp]) m.dispose(); boxGeo.dispose(); flatBox.dispose(); studGeo.dispose(); fsGeo.dispose(); K.dead = true; K.on = false };
  return K;
}
mkKl.api = KL_API;
