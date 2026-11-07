/* Holdup: 3D-Ansicht (Ticket 149, 3D-0: Geruest, docs/plan-3d.md). ES-Modul, die einzige Stelle mit Modulen: index.html laedt es per import() erst,
   wenn 3D gewuenscht ist (Optionen "Ansicht" oder #3d), nie ueber file:// (Chromium verbietet dort Module, dann Rueckfall auf 2D mit Meldung).
   mkView3d(X) bekommt vom Kern einen Kontext X (Konstanten und Getter, nur lesen; Raster nur ueber X.cell, Strasse nur ueber X.LANE) und zeichnet die Welt
   mit Three.js in eine eigene WebGL-Leinwand unter dem 2D-Canvas. Das 2D-Canvas bleibt oben, durchsichtig, und traegt HUD und Menues (js/draw.js).
   Stand 3D-0: Szene, Kamera fest gekippt (X.angle, 20 bis 30 Grad, Standard 25), Boden als Flaeche mit der Textur der statischen 2D-Ebene (X.st, X.so).
   Stand 3D-1 (Ticket 150): statische Welt aus dem Raster (Hoehentabelle V3CFG.cells, ein InstancedMesh je Material), Neubau nur bei Rasteraenderung (X.gRev, Abgleich), Spuren (X.dcv) als Ebene ueber dem Boden.
   Stand 3D-2a (Ticket 151): Figuren und Fahrzeuge als Aufsteller aus den Sprites (X.figs aus js/draw.js, Tabellen V3CFG.figs und V3CFG.cars), fuenf InstancedMesh, Marken ueber den Koepfen zeichnet das HUD (toScr).
   Stand 3D-3 (Ticket 152): Kamera mit Vorlauf (Spieler unter der Bildmitte, camLead), Schnitt durch Waende und Moebel vor dem Spieler (uCut im Shader der statischen Welt),
   Silhouette fuer Spieler, Team und sichtbare Gegner hinter Waenden (zweiter Durchgang mit Tiefentest "groesser"), Bodenring am Zielpunkt zeichnet das HUD (js/draw.js).
   Stand 3D-4 (Ticket 153): Sichtmaske aus dem Sichtpolygon der 2D-Dunkelzone (X.vis aus js/draw.js vis3d, nur lokale Daten), ein Viertel der Weltaufloesung, neu gemalt und hochgeladen nur bei
   geaendertem Schluessel (Lage, Reichweite, Raster). Boden, Waende, Moebel, Fahrzeuge und Figuren dunkeln ausserhalb ab wie unter der 2D-Dunkelzone (fogC, nach der Farbraum-Umrechnung).
   Einheiten: 1 Einheit = 1 Weltpixel, 2D x -> 3D x, 2D y -> 3D z, oben ist +y. Simulation, Netz und VER bleiben unberuehrt.
   Uebernommen aus dem Prototyp (Ticket 125, PR 130): Kontext mit Gettern, Perspektive mit schmalem Blickwinkel, camSet, Boden aus der 2D-Textur, pick-Strahl, Rueckfall {on:false,err}.
   Bei geaendertem Kontext oder geaenderter Rueckgabe mkView3d.api hier und VIEW3D_API in index.html erhoehen. */
import * as THREE from '../assets/three.module.min.js';

export const V3CFG = {
  fov: 30, aimH: 24, near: 10, far: 9000, clear: 0x0e1014,
  wallH: 64, decalT: .3, decalDiv: 2, edge: 1.5,
  // 3D-3 (Ticket 152) Kamera: Blickpunkt camLead Weltpixel noerdlich der 2D-Bildmitte, so steht der Spieler unter der Bildmitte und vorn (oben im Bild) ist mehr zu sehen.
  // Schnitt: Waende und Moebel suedlich des Spielers (zur Kamera hin) innerhalb von cutR Bildpunkten um ihn werden oberhalb cutH ausgeblendet (wie auf Tischhoehe abgesenkt),
  // weicher Rand ab cutSoft des Radius (gerastert). Silhouette: Figuren mit Silhouettenfarbe (Spieler, Team, Gegner in Sicht) erscheinen hinter Verdeckung einfarbig mit silA.
  camLead: 40, cutR: 56, cutH: 22, cutSoft: .7, sil: true, silA: .8,
  // 3D-4 (Ticket 153) Sicht: Maske visDiv Weltpixel je Maskenpixel (ein Viertel), Seitenflaechen lesen die Maske visIn Weltpixel hinter der Flaeche (am Wandfuss, die 2D-Sicht reicht 5 px in die Wand),
  // Farbe der Dunkelzone wie 2D (rgba(10,12,20), Deckkraft aus dem Kern), fog: false schaltet die Abdunklung ab (nur Tests und Bilder)
  visDiv: 4, visIn: 2, darkCol: [10, 12, 20], fog: true,
  // 3D-2a (Ticket 151) Figuren als Aufsteller: Koerper (Zylinder, Farbe aus der Sprite-Zeile) bis bodyH, darauf das 2D-Sprite liegend (die Sprites sind Draufsichten, aufrecht gestellt
  // saehe man den Kopf von oben an einer senkrechten Tafel). Geduckt (Spalte 8) mit cowerK der Hoehe, liegend (am Boden, bewusstlos, tot) nur das Sprite knapp ueber dem Boden (lieH).
  // headH: Hoehe der HUD-Marken ueber dem Kopf (Namen, Balken, js/draw.js marks3d). Schatten wie in 2D versetzt (shOff), Deckkraft shA.
  bodyH: 26, spriteH: 28, headH: 30, lieH: 1.2, cowerK: .6, shOff: [5, 6], shA: .33,
  // Jede Figurenart braucht einen Eintrag (Test 192, Liste aus dem Spiel: Spieler, Gegnerarten, Zivilisten- und Personalarten, Fahrer, Gefasste, Tote, Spieler am Boden).
  // r Koerperradius, h Koerperhoehe (Standard bodyH), lie: liegt immer
  figs: {
    pl: { r: 9 }, cop: { r: 9 }, swat: { r: 10 }, shield: { r: 10 }, sniper: { r: 9 }, grd: { r: 10 },
    civ: { r: 8 }, tel: { r: 8 }, mgr: { r: 8 }, drv: { r: 9 }, cap: { r: 9 }, tot: { r: 9, lie: 1 }, down: { r: 9, lie: 1 },
  },
  // Fahrzeuge als niedrige Koerper (Kasten in der mittleren Farbe der Zeile aus cars.png) mit dem 2D-Bild als Dach: so stehen sie als Deckung im Raum (Kachelhoehe wie das Raster v),
  // das Dach zeigt alle Einzelheiten des Sprites. h Hoehe, bar: Blaulicht auf dem Dach, Wrack dunkel wie in 2D (wreckDim). Jede Fahrzeugart braucht einen Eintrag (Test 192).
  cars: { pol: { h: 26, bar: 1 }, civ: { h: 24 }, wreck: { h: 20 }, van: { h: 30 }, vh: { h: 30, bar: 1 }, tk: { h: 40 } },
  wreckDim: .66, carK: [.92, .82],
  // Zusatzteile als Kloetze: Schild (Farben wie 2D nach Zustand), Gewehr des Scharfschuetzen, getragene Beute, Blaulicht rot und blau
  xcol: { sh: [0xa9c3df, 0xd9b36a, 0xd9604f], rf: 0x2a2f36, bag: 0x6a5536, red: 0xff3a30, blue: 0x3a6bff, off: 0x3a3e46 },
  // Flaechenhelligkeit ohne Licht (Licht kommt mit 3D-5): Deckel, Suedseite (zur Kamera), Nordseite, Ost und West, Fuss (Seiten unten dunkler, bis wallH linear heller)
  shade: { top: 1, s: .84, n: .62, ew: .72, foot: .74 },
  // Materialien der Kloetze: 0 Bild (Bodentextur, Deckel zeigen die 2D-Zeichnung, Seiten strecken die Randpixel), 1 Holz, 2 Metall, 3 Zaun; Glas eigens (durchsichtig)
  mats: [null, 0x8a6a45, 0x5f6772, 0x8d959e], glass: 0xbfe6ff, glassA: .3,
  // Hoehentabelle je Kachelzeichen (jedes Zeichen des Rasters braucht einen Eintrag, Test 191): s Scheiben [unten, oben, Material] in Weltpixeln, ins Einzug je Seite,
  // fence duenn quer zur Zaunrichtung, glass [unten, oben] Scheibe in der Mitte, open: Zeichen, deren Koerper wegfaellt, wenn X.vaultOpen gilt, dyn: zeichnet ein spaeteres Ticket (Fahrzeuge 3D-2)
  cells: {
    '.': { s: [] }, o: { s: [] }, g: { s: [] }, v: { s: [], dyn: 1 }, // v: Fahrzeuge zeichnet der dynamische Teil (3D-2a, cars)
    '#': { s: [[0, 64]] }, P: { s: [[0, 64]], ins: 2 }, V: { s: [[0, 64, 2]], open: 1 }, L: { s: [[0, 64, 2]] }, l: { s: [[50, 64]] },
    W: { s: [[0, 16], [50, 64]], glass: [16, 50] }, w: { s: [[0, 16], [50, 64]] }, Y: { s: [[0, 16], [50, 64], [18, 48, 1]] },
    D: { s: [[50, 64]] }, d: { s: [[50, 64]] },
    C: { s: [[0, 24]] }, e: { s: [[0, 20]], ins: 1 }, m: { s: [[0, 22]], ins: 1 }, b: { s: [[0, 14]], ins: 3 }, r: { s: [[0, 26]], ins: 4 },
    A: { s: [[0, 46]], ins: 3 }, k: { s: [[0, 28]], ins: 2 }, q: { s: [[0, 30]], ins: 5 }, p: { s: [[0, 34]], ins: 6 }, u: { s: [[0, 40]], ins: 4 },
    N: { s: [[0, 36, 2]], ins: 1 }, f: { s: [[0, 26, 3]], fence: 1 }, X: { s: [[0, 30, 1]] },
  },
};

// 3D-4 Sicht: Maske (r: 1 in Sicht, 0 ausserhalb, weiche Kante wie 2D) in Weltlage (x, z), Abdunklung nach der Farbraum-Umrechnung, also im selben Farbraum wie die 2D-Dunkelzone.
// uDark: Farbe (sRGB 0 bis 1) und Deckkraft, Deckkraft 0 heisst alles sehen (Zuschauer) oder keine Abdunklung.
const VISF = `uniform sampler2D uVis; uniform vec4 uVisO; uniform vec4 uDark;
vec3 fogC(vec3 c, vec2 w) { if (uDark.w <= 0.0) return c; float v = texture2D(uVis, vec2((w.x - uVisO.x) * uVisO.z, 1.0 - (w.y - uVisO.y) * uVisO.w)).r; return mix(c, uDark.rgb, uDark.w * (1.0 - v)); }
`;
// Shader der statischen Welt: Kloetze als Instanzen eines Einheitswuerfels, Bild-Koordinate aus der Weltlage (Seiten um edge nach innen versetzt, sie zeigen den Randpixel der Kachel),
// Helligkeit je Flaechenrichtung aus V3CFG.shade. Farbraum wie MeshBasicMaterial (sRGB-Textur, Ausgabe ueber colorspace_fragment).
const VS = `uniform vec4 uOrg; uniform vec4 uSh; uniform float uFoot; uniform float uWallH; uniform float uEdge; uniform float uVisIn; varying vec2 vUv; varying float vSh; varying vec3 vW; varying vec2 vM;
void main() {
  vec4 wp = modelMatrix * instanceMatrix * vec4(position, 1.0); vW = wp.xyz; vM = wp.xz - normal.xz * uVisIn;
  vec2 q = wp.xz - normal.xz * uEdge;
  vUv = vec2((q.x - uOrg.x) * uOrg.z, 1.0 - (q.y - uOrg.y) * uOrg.w);
  float s = normal.y > 0.5 ? uSh.x : normal.z > 0.5 ? uSh.y : normal.z < -0.5 ? uSh.z : uSh.w;
  if (normal.y < 0.5) s *= mix(uFoot, 1.0, clamp(wp.y / uWallH, 0.0, 1.0));
  vSh = s;
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;
// Schnitt (3D-3): uCut = Bildpunkt des Spielers (gl_FragCoord), Radius in Bildpunkten, Suedgrenze (Welt z des Spielers); uCutH Hoehe, ab der geschnitten wird, uCutS weicher Rand.
// Geschnitten wird nur, was zwischen Kamera und Spieler liegt (suedlich von ihm), Waende hinter ihm bleiben stehen.
const FS = VISF + `uniform sampler2D map; uniform vec3 uCol; uniform float uMap; uniform float uA; uniform vec4 uCut; uniform float uCutH; uniform float uCutS; varying vec2 vUv; varying float vSh; varying vec3 vW; varying vec2 vM;
void main() {
  if (uCut.z > 0.0 && vW.y > uCutH + 0.01 && vW.z > uCut.w) { float d = length(gl_FragCoord.xy - uCut.xy) / uCut.z;
    if (d < uCutS || (d < 1.0 && fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715)))) > (d - uCutS) / (1.0 - uCutS))) discard; }
  vec3 c = uMap > 0.5 ? texture2D(map, vUv).rgb : uCol;
  gl_FragColor = vec4(c * vSh, uA);
  #include <colorspace_fragment>
  gl_FragColor.rgb = fogC(gl_FragColor.rgb, vM);
}`;

export function mkView3d(X) {
  const C = V3CFG, T = X.T, VW = X.VW, VH = X.VH;
  let ren;
  try {
    ren = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  } catch (e) { return { on: false, err: 'kein WebGL 2 (' + String(e && e.message || e).slice(0, 60) + ')' }; }
  if (!ren.capabilities || !ren.capabilities.isWebGL2) { ren.dispose(); return { on: false, err: 'kein WebGL 2' }; }
  const glc = ren.getContext(), dbgInfo = glc.getExtension('WEBGL_debug_renderer_info');
  const st = { q: 0, frames: 0, ms: 0, msAvg: 0, calls: 0, tris: 0, errs: 0, err: '', builds: 0, groundUp: 0, statBuilds: 0, inst: 0, decUp: 0, parts: [], vol: 0, figs: 0, cars: 0, fk: {}, ck: {}, lie: 0, hit: 0, xparts: 0, dynCalls: 0, dynGrow: 0, visUp: 0, visOn: 0 };
  ren.setPixelRatio(1); ren.outputColorSpace = THREE.SRGBColorSpace; ren.setClearColor(C.clear);
  const el = ren.domElement; el.id = 'c3d'; el.setAttribute('aria-hidden', 'true'); el.style.pointerEvents = 'none'; el.style.display = 'none';
  const setQ = q => { if (q === st.q) return; st.q = q; ren.setSize(VW * q, VH * q, false) };

  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(C.fov, VW / VH, C.near, C.far);
  cam.up.set(0, 0, -1);

  // Boden: statische Ebene (X.st) plus Objekte (X.so) in einer Leinwand, als Textur auf eine Flaeche ueber die ganze Welt (unbeleuchtet, sieht aus wie 2D)
  const groundCv = document.createElement('canvas'), groundG = groundCv.getContext('2d');
  const groundTex = new THREE.CanvasTexture(groundCv); groundTex.colorSpace = THREE.SRGBColorSpace; groundTex.anisotropy = Math.min(8, ren.capabilities.getMaxAnisotropy());
  // Spuren (Blut, Einschuesse, Scherben): X.dcv verkleinert (decalDiv) als zweite Textur des Bodens, hochgeladen im Takt decalT (ohne Mipmaps, die kosteten bei jedem Hochladen)
  const decCv = document.createElement('canvas'), decG = decCv.getContext('2d');
  const decTex = new THREE.CanvasTexture(decCv); decTex.colorSpace = THREE.SRGBColorSpace; decTex.generateMipmaps = false; decTex.minFilter = THREE.LinearFilter;
  // 3D-4 Sichtmaske: Leinwand in Weltlage (visDiv Weltpixel je Pixel), weiss in Sicht, schwarz ausserhalb, die Kante wie die 2D-Dunkelzone (GFX.edge). Daten, kein Farbraum, ohne Mipmaps.
  const visCv = document.createElement('canvas'), visG = visCv.getContext('2d', { willReadFrequently: true });
  const visTex = new THREE.CanvasTexture(visCv); visTex.colorSpace = THREE.NoColorSpace; visTex.generateMipmaps = false; visTex.minFilter = THREE.LinearFilter; visTex.magFilter = THREE.LinearFilter;
  const UV = { uVis: { value: visTex }, uVisO: { value: new THREE.Vector4() }, uDark: { value: new THREE.Vector4() } };
  // Boden in einem Durchgang: Bodenbild, darueber die Spuren nach ihrem Alpha gemischt (eine durchsichtige Ebene ueber dem ganzen Bild kostete in Software rund 45 ms je Bild)
  const groundMat = new THREE.ShaderMaterial({ uniforms: Object.assign({ map: { value: groundTex }, dmap: { value: decTex } }, UV),
    vertexShader: 'varying vec2 vUv; varying vec2 vM; void main() { vUv = uv; vM = (modelMatrix * vec4(position, 1.0)).xz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: VISF + 'uniform sampler2D map; uniform sampler2D dmap; varying vec2 vUv; varying vec2 vM; void main() { vec4 d = texture2D(dmap, vUv); gl_FragColor = vec4(mix(texture2D(map, vUv).rgb, d.rgb, d.a), 1.0);\n#include <colorspace_fragment>\ngl_FragColor.rgb = fogC(gl_FragColor.rgb, vM);\n}' });
  let decT = 0;
  function refreshDecal() { decG.clearRect(0, 0, decCv.width, decCv.height); if (X.dcv) decG.drawImage(X.dcv, 0, 0, decCv.width, decCv.height); decTex.needsUpdate = true; st.decUp++; decT = performance.now() }

  // Materialien der statischen Welt (ein Draw Call je Material)
  const U0 = { uOrg: { value: new THREE.Vector4() }, uSh: { value: new THREE.Vector4(C.shade.top, C.shade.s, C.shade.n, C.shade.ew) }, uFoot: { value: C.shade.foot }, uWallH: { value: C.wallH }, uEdge: { value: C.edge }, uCut: { value: new THREE.Vector4() }, uCutH: { value: C.cutH }, uCutS: { value: C.cutSoft }, uVisIn: { value: C.visIn } }; Object.assign(U0, UV);
  const mkMat = (o) => new THREE.ShaderMaterial({ vertexShader: VS, fragmentShader: FS, transparent: !!o.tr, depthWrite: !o.tr,
    uniforms: Object.assign({}, U0, { map: { value: o.map || null }, uMap: { value: o.map ? 1 : 0 }, uCol: { value: new THREE.Color(o.col || 0xffffff) }, uA: { value: o.a == null ? 1 : o.a } }) });
  const mats = C.mats.map(c => c === null ? mkMat({ map: groundTex }) : mkMat({ col: c })), glassMat = mkMat({ col: C.glass, a: C.glassA, tr: 1 });
  const box = new THREE.BoxGeometry(1, 1, 1);

  let ground = null, curLay = null, curSt = null, gridKey = '', rev = -1, stat = [], cells = {};
  function refreshGround() { groundG.clearRect(0, 0, groundCv.width, groundCv.height); groundG.drawImage(X.st, 0, 0); groundG.drawImage(X.so, 0, 0); groundTex.needsUpdate = true; st.groundUp++ }
  function buildLay() {
    const WP = X.W * T, HP = X.H * T, ox = X.WX0 * T, oz = X.WY0 * T;
    curLay = X.LAY; curSt = X.st;
    groundCv.width = X.st.width; groundCv.height = X.st.height; refreshGround();
    decCv.width = Math.max(1, X.st.width / 2 / C.decalDiv | 0); decCv.height = Math.max(1, X.st.height / 2 / C.decalDiv | 0); refreshDecal();
    U0.uOrg.value.set(ox, oz, 1 / WP, 1 / HP); UV.uVisO.value.set(ox, oz, 1 / WP, 1 / HP);
    visCv.width = Math.max(1, Math.ceil(WP / C.visDiv)); visCv.height = Math.max(1, Math.ceil(HP / C.visDiv)); visKey = null;
    if (ground) { scene.remove(ground); ground.geometry.dispose() }
    ground = new THREE.Mesh(new THREE.PlaneGeometry(WP, HP).rotateX(-Math.PI / 2), groundMat); ground.position.set(ox + WP / 2, 0, oz + HP / 2); ground.name = 'boden'; scene.add(ground);
    rev = X.gRev; gridKey = keyOfGrid(); buildStatic(); st.builds++;
  }
  // Rasterschluessel fuer den Abgleich: nur gelesen, wenn der Aenderungszaehler X.gRev weitergezaehlt hat. Fahrzeuge (v) zaehlen nicht (Boden darunter, Fahrzeuge zeichnet 3D-2), die offene Tresortuer schon.
  // 3D-4: zuletzt gesehene Zustaende wie 2D (prSeen, Gitter und Tueren im Gefaengnis): X.seen liefert je Bild die Kacheln, die anders gezeigt werden als das Raster ({'x,y': Zeichen} oder null)
  let ov = null, ovKey = '';
  const cellAt = (x, y) => { const o = ov && ov[x + ',' + y]; return o || X.cell(x, y) };
  function keyOfGrid() { let s = X.vaultOpen ? '1' : '0'; const x0 = X.WX0, y0 = X.WY0; for (let y = y0; y < y0 + X.H; y++) for (let x = x0; x < x0 + X.W; x++) { const c = cellAt(x, y); s += c === 'v' ? 'o' : c } return s }

  // Statische Welt aus dem Raster: je Kachel und Scheibe der Hoehentabelle ein Kloetzchen (Instanz eines Einheitswuerfels), ein InstancedMesh je Material plus Glas.
  // cells zaehlt die Kacheln mit Koerper je Zeichen (Test: Wandkoerper gleich Wandkacheln), Zeichen ohne Eintrag landen in cells['?'+c] und zeichnen nichts.
  const mtx = new THREE.Matrix4(), pos = new THREE.Vector3(), scl = new THREE.Vector3(), qid = new THREE.Quaternion();
  function buildStatic() {
    for (const m of stat) { scene.remove(m); m.dispose() } stat = []; cells = {};
    const lists = C.mats.map(() => []), gl = [], spec = c => C.cells[c], cell = cellAt, wallish = c => { const s = spec(c); return !!s && !s.ins && !s.fence && s.s.some(q => q[0] === 0 && q[1] >= C.wallH) };
    const add = (L, X0, Z0, X1, Z1, Y0, Y1) => L.push(X0, Z0, X1, Z1, Y0, Y1);
    const x0 = X.WX0, y0 = X.WY0, vo = !!X.vaultOpen;
    for (let y = y0; y < y0 + X.H; y++) for (let x = x0; x < x0 + X.W; x++) {
      const c = cell(x, y), s = spec(c);
      if (!s) { cells['?' + c] = (cells['?' + c] || 0) + 1; continue }
      if (!s.s.length || (s.open && vo)) continue;
      cells[c] = (cells[c] || 0) + 1;
      let X0 = x * T, Z0 = y * T, X1 = X0 + T, Z1 = Z0 + T; const ins = s.ins || 0; X0 += ins; Z0 += ins; X1 -= ins; Z1 -= ins;
      const hz = cell(x - 1, y) === c || cell(x + 1, y) === c || wallish(cell(x - 1, y)) || wallish(cell(x + 1, y));
      if (s.fence) { if (cell(x - 1, y) === 'f' || cell(x + 1, y) === 'f') { Z0 = y * T + 12; Z1 = y * T + 19 } else { X0 = x * T + 12; X1 = x * T + 19 } }
      for (const q of s.s) add(lists[q[2] || 0], X0, Z0, X1, Z1, q[0], q[1]);
      if (s.glass) { if (hz) add(gl, x * T, y * T + 14, x * T + T, y * T + 18, s.glass[0], s.glass[1]); else add(gl, x * T + 14, y * T, x * T + 18, y * T + T, s.glass[0], s.glass[1]) }
    }
    const mk = (L, mat, name, order) => {
      const n = L.length / 6; if (!n) return;
      const im = new THREE.InstancedMesh(box, mat, n); im.name = name; im.renderOrder = order || -1;
      for (let i = 0; i < n; i++) { const k = i * 6; pos.set((L[k] + L[k + 2]) / 2, (L[k + 4] + L[k + 5]) / 2, (L[k + 1] + L[k + 3]) / 2); scl.set(L[k + 2] - L[k], L[k + 5] - L[k + 4], L[k + 3] - L[k + 1]); im.setMatrixAt(i, mtx.compose(pos, qid, scl)) }
      im.instanceMatrix.needsUpdate = true; im.computeBoundingSphere(); scene.add(im); stat.push(im);
    };
    lists.forEach((L, i) => mk(L, mats[i], 'welt' + i));
    mk(gl, glassMat, 'glas', 3);
    st.statBuilds++; st.inst = stat.reduce((a, m) => a + m.count, 0);
    // Pruefsumme fuer Tests: Kloetze je Material und Rauminhalt (aendert sich, wenn eine Tuer aufgeht, auch bei gleicher Zahl von Kloetzen)
    st.parts = lists.map(L => L.length / 6).concat([gl.length / 6]); st.vol = 0; for (const L of lists.concat([gl])) for (let k = 0; k < L.length; k += 6) st.vol += (L[k + 2] - L[k]) * (L[k + 3] - L[k + 1]) * (L[k + 5] - L[k + 4]);
  }

  // 3D-2a (Ticket 151): Figuren und Fahrzeuge. Die Liste kommt jedes Bild vom Kern (X.figs, js/draw.js figs3d: dieselbe Auswahl wie in 2D), hier wird nur gezeichnet.
  // Fuenf Draw Calls fuer alles, was sich bewegt: Schatten, Koerper (Zylinder), Sprites (chars.png und chars_flash.png in einem Shader), Kloetze (Fahrzeugkaesten und Zusatzteile), Fahrzeugdaecher (cars.png).
  // Jede Gruppe ist ein InstancedMesh, das bei Bedarf in Zweierpotenzen waechst (st.dynGrow), Instanzen werden jedes Bild neu belegt (wer nicht mehr gesehen wird, faellt einfach weg).
  const tex = img => { const t = new THREE.Texture(img); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; t.needsUpdate = true; return t };
  const chTex = tex(X.ch), chFTex = tex(X.chF), carTex = tex(X.cars);
  const CH_C = Math.round(X.ch.width / 128), CH_R = Math.round(X.ch.height / 128), CAR_R = Math.round(X.cars.height / 128);
  // mittlere Farbe je Zeile eines Sprite-Bogens (deckende Pixel einer Spalte), fuer Koerper und Karosserie (aus dem Prototyp)
  function rowCols(img, cw, chh, rows, col) {
    const c = document.createElement('canvas'); c.width = cw; c.height = chh; const q = c.getContext('2d', { willReadFrequently: true }), out = [];
    for (let r = 0; r < rows; r++) {
      q.clearRect(0, 0, cw, chh); q.drawImage(img, col * cw, r * chh, cw, chh, 0, 0, cw, chh); const d = q.getImageData(0, 0, cw, chh).data; let R = 0, G = 0, B = 0, N = 0;
      for (let i = 0; i < d.length; i += 16) if (d[i + 3] > 200) { R += d[i]; G += d[i + 1]; B += d[i + 2]; N++ }
      out.push(N ? new THREE.Color().setRGB(R / N / 255, G / N / 255, B / N / 255, THREE.SRGBColorSpace) : new THREE.Color(.2, .2, .22));
    }
    return out;
  }
  const chCol = rowCols(X.ch, 128, 128, CH_R, 6), carCol = rowCols(X.cars, 256, 128, CAR_R, 0), xcol = {};
  for (const k in C.xcol) xcol[k] = [].concat(C.xcol[k]).map(c => new THREE.Color(c));
  // Sprite-Shader: Zelle (Spalte, Zeile) aus dem Bogen, Trefferbild aus der zweiten Textur, Deckkraft unter 1 als Raster (verblassende Tote ohne Sortierung), dim dunkelt ab (Wrack)
  const SVS = `attribute vec4 iCell; attribute float iDim; uniform vec2 uGrid; varying vec2 vUv; varying vec3 vHAD; varying vec2 vM;
void main() { vUv = vec2((iCell.x + uv.x) / uGrid.x, 1.0 - (iCell.y + 1.0 - uv.y) / uGrid.y); vHAD = vec3(iCell.zw, iDim); vec4 wp = modelMatrix * instanceMatrix * vec4(position, 1.0); vM = wp.xz; gl_Position = projectionMatrix * viewMatrix * wp; }`;
  const SFS = VISF + `uniform sampler2D map; uniform sampler2D mapF; varying vec2 vUv; varying vec3 vHAD; varying vec2 vM;
void main() { vec4 c = vHAD.x > 0.5 ? texture2D(mapF, vUv) : texture2D(map, vUv); if (c.a < 0.5) discard;
  if (vHAD.y < 0.99 && fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715)))) > vHAD.y) discard;
  gl_FragColor = vec4(c.rgb * (1.0 - vHAD.z), 1.0);
  #include <colorspace_fragment>
  gl_FragColor.rgb = fogC(gl_FragColor.rgb, vM);
}`;
  const sprMat = (m, f, gx, gy) => new THREE.ShaderMaterial({ vertexShader: SVS, fragmentShader: SFS, side: THREE.DoubleSide, uniforms: Object.assign({ map: { value: m }, mapF: { value: f }, uGrid: { value: new THREE.Vector2(gx, gy) } }, UV) });
  const figMat = sprMat(chTex, chFTex, CH_C, CH_R), topMat = sprMat(carTex, carTex, 1, CAR_R);
  // 3D-3 Silhouette: dasselbe Sprite als einfarbige Flaeche, nur wo etwas davor liegt (Tiefentest groesser, schreibt keine Tiefe), nach allem anderen gezeichnet
  const silMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, depthFunc: THREE.GreaterDepth, side: THREE.DoubleSide, uniforms: { map: { value: chTex }, uGrid: { value: new THREE.Vector2(CH_C, CH_R) }, uA: { value: C.silA } },
    vertexShader: 'attribute vec4 iCell; attribute vec3 iCol; uniform vec2 uGrid; varying vec2 vUv; varying vec3 vC; void main() { vUv = vec2((iCell.x + uv.x) / uGrid.x, 1.0 - (iCell.y + 1.0 - uv.y) / uGrid.y); vC = iCol; gl_Position = projectionMatrix * viewMatrix * modelMatrix * instanceMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform sampler2D map; uniform float uA; varying vec2 vUv; varying vec3 vC; void main() { if (texture2D(map, vUv).a < 0.5) discard; gl_FragColor = vec4(vC, uA);\n#include <colorspace_fragment>\n}' });
  // Schatten: weiche Ellipse (iS 0) oder abgerundetes Rechteck (iS 1, Fahrzeuge), Deckkraft je Instanz
  const shMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false,
    vertexShader: 'attribute vec2 iSA; varying vec2 vUv; varying vec2 vSA; void main() { vUv = uv * 2.0 - 1.0; vSA = iSA; gl_Position = projectionMatrix * viewMatrix * modelMatrix * instanceMatrix * vec4(position, 1.0); }',
    fragmentShader: 'varying vec2 vUv; varying vec2 vSA; void main() { float r = vSA.x > 0.5 ? max(abs(vUv.x), abs(vUv.y)) : length(vUv); float a = vSA.y * (1.0 - smoothstep(0.82, 1.0, r)); if (a <= 0.0) discard; gl_FragColor = vec4(0.06, 0.04, 0.02, a); }' });
  // Koerper und Kloetze: Grundfarbe je Instanz, Flaechenhelligkeit als Eckfarbe wie die statische Welt (V3CFG.shade, Deckel hell, Suedseite zur Kamera)
  const shadeGeo = g => { const n = g.attributes.normal, c = new Float32Array(n.count * 3), S = C.shade; for (let i = 0; i < n.count; i++) { const y = n.getY(i), z = n.getZ(i), v = y > .5 ? S.top : y < -.5 ? S.foot : z > .5 ? S.s : z < -.5 ? S.n : S.ew + (S.s - S.ew) * Math.max(0, z); c[i * 3] = c[i * 3 + 1] = c[i * 3 + 2] = v } g.setAttribute('color', new THREE.BufferAttribute(c, 3)); return g };
  const bodyGeo = shadeGeo(new THREE.CylinderGeometry(1, .9, 1, 12).translate(0, .5, 0)), cubeGeo = shadeGeo(new THREE.BoxGeometry(1, 1, 1).translate(0, .5, 0)), flatGeo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  // wie MeshBasicMaterial mit Eck- und Instanzfarbe, dazu die Abdunklung ausserhalb der Sicht (3D-4)
  const colMat = new THREE.ShaderMaterial({ vertexColors: true, uniforms: Object.assign({}, UV),
    vertexShader: 'varying vec3 vC; varying vec2 vM; void main() { vC = color;\n#ifdef USE_INSTANCING_COLOR\nvC *= instanceColor;\n#endif\nvec4 wp = modelMatrix * instanceMatrix * vec4(position, 1.0); vM = wp.xz; gl_Position = projectionMatrix * viewMatrix * wp; }',
    fragmentShader: VISF + 'varying vec3 vC; varying vec2 vM; void main() { gl_FragColor = vec4(vC, 1.0);\n#include <colorspace_fragment>\ngl_FragColor.rgb = fogC(gl_FragColor.rgb, vM);\n}' });
  function pool(name, geo, mat, attrs, colors, order) {
    const P = { name, n: 0, cap: 0, im: null, a: {} };
    P.size = need => {
      P.n = need; if (need > P.cap) {
        let cap = 16; while (cap < need) cap *= 2;
        if (P.im) { scene.remove(P.im); P.im.geometry.dispose(); P.im.dispose() }
        const g = geo.clone(); for (const k in attrs) { P.a[k] = new THREE.InstancedBufferAttribute(new Float32Array(cap * attrs[k]), attrs[k]); P.a[k].setUsage(THREE.DynamicDrawUsage); g.setAttribute(k, P.a[k]) }
        const im = new THREE.InstancedMesh(g, mat, cap); im.instanceMatrix.setUsage(THREE.DynamicDrawUsage); im.frustumCulled = false; im.name = name; im.renderOrder = order;
        if (colors) { im.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(cap * 3), 3); im.instanceColor.setUsage(THREE.DynamicDrawUsage) }
        scene.add(im); P.im = im; P.cap = cap; st.dynGrow++;
      }
      if (P.im) { P.im.count = need; P.im.visible = need > 0; P.im.instanceMatrix.needsUpdate = true; if (P.im.instanceColor) P.im.instanceColor.needsUpdate = true; for (const k in P.a) P.a[k].needsUpdate = true }
    };
    return P;
  }
  const pSh = pool('schatten', flatGeo, shMat, { iSA: 2 }, false, 1), pBody = pool('koerper', bodyGeo, colMat, {}, true, 2), pSpr = pool('figuren', flatGeo, figMat, { iCell: 4, iDim: 1 }, false, 4),
    pBox = pool('kloetze', cubeGeo, colMat, {}, true, 2), pTop = pool('daecher', flatGeo, topMat, { iCell: 4, iDim: 1 }, false, 4),
    pSil = pool('silhouetten', flatGeo, silMat, { iCell: 4, iCol: 3 }, false, 9), pools = [pSh, pBody, pSpr, pBox, pTop, pSil];
  const silCol = {}, silOf = c => silCol[c] || (silCol[c] = new THREE.Color(c));
  const qr = new THREE.Quaternion(), yAx = new THREE.Vector3(0, 1, 0), tc = new THREE.Color();
  // Instanz i einer Gruppe setzen: Lage (x,z) in Weltpixeln, Hoehe y, Drehung a (2D-Winkel, um die Hochachse), Groesse; Ortsversatz lx, lz im Figurenrahmen wie g.translate nach g.rotate
  function put(P, i, x, y, h, a, sx, sy, sz, lx, lz) { const c = Math.cos(a), s = Math.sin(a); lx = lx || 0; lz = lz || 0; pos.set(x + c * lx - s * lz, h, y + s * lx + c * lz); qr.setFromAxisAngle(yAx, -a); scl.set(sx, sy, sz); P.im.setMatrixAt(i, mtx.compose(pos, qr, scl)) }
  const kinds = (o, L, T) => { const k = T[L.k] ? L.k : '?' + L.k; o[k] = (o[k] || 0) + 1; return T[L.k] };
  let dynLast = { f: [], c: [] }, hide = null;
  function buildDyn() {
    const D = X.figs ? X.figs() : { f: [], c: [] }, F = [], Cs = [], fk = {}, ck = {};
    for (const o of D.f) { if (hide && hide(o)) continue; const e = kinds(fk, o, C.figs); if (e) F.push([o, e]) }
    for (const o of D.c) { const e = kinds(ck, o, C.cars); if (e) Cs.push([o, e]) }
    let nB = 0, nX = 0;
    for (const [o, e] of F) { if (!(e.lie || o.lie)) nB++; if (o.sh >= 0) nX++; if (o.rf) nX++; if (o.bag) nX++ }
    for (const [o, e] of Cs) nX += 1 + (e.bar && o.bl ? 2 : 0);
    const S = C.sil ? F.filter(([o, e]) => o.sc && !(e.lie || o.lie)) : [];
    pSh.size(F.length + Cs.length); pBody.size(nB); pSpr.size(F.length); pBox.size(nX); pTop.size(Cs.length); pSil.size(S.length);
    let iS = 0, iB = 0, iX = 0, lie = 0, hit = 0;
    const shA = pSh.a.iSA, cel = pSpr.a.iCell, dim = pSpr.a.iDim, box = (x, y, h, a, sx, sy, sz, lx, lz, col) => { put(pBox, iX, x, y, h, a, sx, sy, sz, lx, lz); pBox.im.setColorAt(iX, col); iX++ };
    F.forEach(([o, e], i) => {
      const lying = !!(e.lie || o.lie), cw = o.col === 8, hb = (e.h || C.bodyH) * (cw ? C.cowerK : 1), hs = lying ? C.lieH : hb + C.spriteH - C.bodyH;
      if (lying) { put(pSh, iS, o.x, o.y, .4, o.a, 52, 1, 28, 3, 4); shA.setXY(iS++, 0, .3 * o.al); lie++ }
      else { put(pSh, iS, o.x + C.shOff[0], o.y + C.shOff[1], .4, 0, 22, 1, 19); shA.setXY(iS++, 0, C.shA); put(pBody, iB, o.x, o.y, 0, o.a, e.r, hb, e.r); pBody.im.setColorAt(iB++, chCol[o.row] || chCol[0]) }
      put(pSpr, i, o.x, o.y, hs, o.a, 64, 1, 64); cel.setXYZW(i, o.col, o.row, o.hit, o.al); dim.setX(i, 0); if (o.hit) hit++; o._hs = hs;
      if (o.sh >= 0) box(o.x, o.y, 0, o.a, 3, hb + 4, 26, 15, 0, xcol.sh[o.sh > .5 ? 0 : o.sh > .25 ? 1 : 2]);
      if (o.rf) box(o.x, o.y, hs + .6, o.a, 26, 2.5, 2.5, 21, 3, xcol.rf[0]);
      if (o.bag) box(o.x, o.y, hb * .45, o.a, 14, 13, 16, -13, 0, xcol.bag[0]);
    });
    Cs.forEach(([o, e], j) => {
      const i = F.length + j, h = e.h, dimK = o.dim ? C.wreckDim : 0;
      put(pSh, iS, o.x + C.shOff[0], o.y + C.shOff[1] + 1, .4, o.a, o.L * .97, 1, o.W * .88); shA.setXY(iS++, 1, .3);
      tc.copy(carCol[o.row] || carCol[0]).multiplyScalar(1 - dimK); box(o.x, o.y, 0, o.a, o.L * C.carK[0], h, o.W * C.carK[1], 0, 0, tc);
      if (e.bar && o.bl) { const r = o.bl === 1; box(o.x, o.y, h, o.a, 5, 4, 9, -4, -6, r ? xcol.red[0] : xcol.blue[0]); box(o.x, o.y, h, o.a, 5, 4, 9, -4, 6, r ? xcol.blue[0] : xcol.red[0]) }
      put(pTop, j, o.x, o.y, h + .5, o.a, o.L * o.fx, 1, o.W * o.fy); pTop.a.iCell.setXYZW(j, 0, o.row, 0, 1); pTop.a.iDim.setX(j, dimK); void i;
    });
    const sk = {}; S.forEach(([o], j) => { put(pSil, j, o.x, o.y, o._hs, o.a, 64, 1, 64); pSil.a.iCell.setXYZW(j, o.col, o.row, 0, 1); const c = silOf(o.sc); pSil.a.iCol.setXYZ(j, c.r, c.g, c.b); sk[o.k] = (sk[o.k] || 0) + 1 });
    st.sil = S.length; st.sk = sk;
    st.figs = F.length; st.cars = Cs.length; st.fk = fk; st.ck = ck; st.lie = lie; st.hit = hit; st.xparts = iX; st.dynCalls = pools.filter(P => P.im && P.im.visible).length;
    dynLast = { f: F.map(([o]) => [o.k, o.row, o.col, o.lie, o.hit, Math.round(o.x), Math.round(o.y), Math.round(o.a * 100) / 100, o.sh, o.rf, o.bag]), c: Cs.map(([o]) => [o.k, o.row, Math.round(o.x), Math.round(o.y), o.dim]) };
  }

  // Kamera: Ziel ist die Mitte des 2D-Ausschnitts (camX/camY folgen dem Spieler wie in 2D, mit Glaettung, Kamerawackeln und Rueckstoss verschiebt draw1 camX/camY,
  // also auch die Kamera), um camLead nach Norden versetzt (3D-3), Kippung X.angle um die Ost-West-Achse nach Sueden.
  // Abstand so, dass die Bildhoehe am Ziel der 2D-Hoehe (VH) entspricht, die sichtbare Bodenbreite ist dort wie in 2D.
  const tgt = new THREE.Vector3();
  function angle() { const a = +X.angle; return a >= 20 && a <= 30 ? a : 25 }
  function camSet() {
    tgt.set(X.camX + VW / 2, 0, X.camY + VH / 2 - C.camLead);
    const D = (VH / 2) / Math.tan(C.fov / 2 * Math.PI / 180), a = angle() * Math.PI / 180;
    cam.position.set(tgt.x, D * Math.cos(a), tgt.z + D * Math.sin(a)); cam.lookAt(tgt); cam.updateMatrixWorld(); cam.updateProjectionMatrix();
  }
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hit = new THREE.Vector3(), v3 = new THREE.Vector3();
  // Bildschirm (logisch 960x544) zu Welt: Strahl durch den Punkt auf die Ebene in Hoehe h (Standard Waffenhoehe aimH)
  function pick(sx, sy, h) {
    camSet(); ndc.set(sx / VW * 2 - 1, -(sy / VH * 2 - 1)); ray.setFromCamera(ndc, cam); plane.constant = -(h == null ? C.aimH : h);
    if (!ray.ray.intersectPlane(plane, hit)) return [X.camX + sx, X.camY + sy];
    return [hit.x, hit.z];
  }
  // Welt zu Bildschirm (logisch), h Hoehe ueber dem Boden
  function toScr(x, y, h) { camSet(); v3.set(x, h || 0, y).project(cam); return [(v3.x + 1) / 2 * VW, (1 - v3.y) / 2 * VH] }

  // Schnitt um den eigenen Spieler (X.me: lebend und gezeichnet), Mitte in Koerperhoehe, in Bildpunkten der Leinwand (y von unten wie gl_FragCoord)
  function setCut() {
    const P = X.me, u = U0.uCut.value;
    if (!P || !(C.cutR > 0)) { u.set(0, 0, 0, 0); return }
    const s = toScr(P.x, P.y, C.bodyH / 2), q = st.q || 1; u.set(s[0] * q, (VH - s[1]) * q, C.cutR * q, P.y); U0.uCutH.value = C.cutH; U0.uCutS.value = C.cutSoft;
  }
  // Fuer Tests und Bilder: Anteil der Bildpunkte im Kasten um die Figur bei (x,y), die sich aendern, wenn die Figuren in r Weltpixeln um (x,y) fehlen (wie gut ist sie zu sehen).
  // Liefert { vis (0 bis 1), n (Bildpunkte im Kasten), box }. Zwei Bilder im selben Takt, nur Lesen (keine Zustandsaenderung).
  function seen(x, y, r) {
    const q = st.q || 1, a = toScr(x, y, 0), b = toScr(x, y, C.spriteH), cx = (a[0] + b[0]) / 2, cy = (a[1] + b[1]) / 2, hw = 20, hh = 24 + Math.abs(a[1] - b[1]) / 2;
    const bx = [Math.max(0, cx - hw), Math.max(0, cy - hh), Math.min(VW, cx + hw), Math.min(VH, cy + hh)].map(v => Math.round(v * q)), w = bx[2] - bx[0], h = bx[3] - bx[1];
    if (w <= 0 || h <= 0) return { vis: 0, n: 0, box: bx };
    const c = document.createElement('canvas'); c.width = w; c.height = h; const g2 = c.getContext('2d', { willReadFrequently: true });
    const grab = () => { g2.clearRect(0, 0, w, h); g2.drawImage(el, bx[0], bx[1], w, h, 0, 0, w, h); return g2.getImageData(0, 0, w, h).data };
    r = r == null ? 12 : r;
    if (!render()) return null; const A = grab();
    hide = o => Math.hypot(o.x - x, o.y - y) <= r; let B; try { render(); B = grab() } finally { hide = null }
    let n = 0; for (let i = 0; i < A.length; i += 4) if (Math.abs(A[i] - B[i]) + Math.abs(A[i + 1] - B[i + 1]) + Math.abs(A[i + 2] - B[i + 2]) > 24) n++;
    render(); return { vis: n / (w * h), n: w * h, box: bx };
  }

  // 3D-4 Sicht: X.vis() (js/draw.js vis3d) liefert null (alles sehen) oder Schluessel, Deckkraft, Kante und das Sichtpolygon (dieselbe Quelle wie die 2D-Dunkelzone, nur lokale Daten).
  // Die Maske wird nur neu gemalt und hochgeladen, wenn sich der Schluessel aendert (Lage und Reichweite aus dem Kern, dazu Raster und Tresortuer), sonst bleibt sie (st.visUp zaehlt).
  let visKey = null, visPoly = null;
  function updVis() {
    const V = X.vis ? X.vis() : null, u = UV.uDark.value, dc = C.darkCol;
    if (!V) { u.set(0, 0, 0, 0); st.visOn = 0; return }
    st.visOn = 1; u.set(dc[0] / 255, dc[1] / 255, dc[2] / 255, C.fog ? Math.max(0, Math.min(1, V.dark)) : 0);
    const k = V.k + '|' + X.gRev + '|' + (X.vaultOpen ? 1 : 0);
    if (k === visKey) return;
    visKey = k; const P = V.poly(), q = 1 / C.visDiv, ox = X.WX0 * T, oz = X.WY0 * T, g2 = visG;
    g2.setTransform(1, 0, 0, 1, 0, 0); g2.globalAlpha = 1; g2.fillStyle = '#000'; g2.fillRect(0, 0, visCv.width, visCv.height);
    g2.setTransform(q, 0, 0, q, -ox * q, -oz * q); g2.beginPath(); P.forEach((p, i) => i ? g2.lineTo(p[0], p[1]) : g2.moveTo(p[0], p[1])); g2.closePath();
    g2.fillStyle = '#fff'; g2.fill(); g2.lineJoin = 'round'; for (const [w, al] of V.edge) { g2.lineWidth = w; g2.strokeStyle = 'rgba(255,255,255,' + al + ')'; g2.stroke() }
    g2.setTransform(1, 0, 0, 1, 0, 0); visTex.needsUpdate = true; st.visUp++; visPoly = P;
  }
  // Fuer Tests: Maskenwert (0 bis 1) an der Weltstelle (x,y) wie der Shader ihn liest (bilinear), null ohne Maske (alles sehen)
  function visAt(x, y) {
    if (!st.visOn || !visPoly) return null;
    const fx = (x - X.WX0 * T) / C.visDiv - .5, fy = (y - X.WY0 * T) / C.visDiv - .5, x0 = Math.floor(fx), y0 = Math.floor(fy), w = visCv.width, h = visCv.height;
    const d = visG.getImageData(Math.max(0, Math.min(w - 2, x0)), Math.max(0, Math.min(h - 2, y0)), 2, 2).data, tx = Math.max(0, Math.min(1, fx - x0)), ty = Math.max(0, Math.min(1, fy - y0));
    return ((d[0] * (1 - tx) + d[4] * tx) * (1 - ty) + (d[8] * (1 - tx) + d[12] * tx) * ty) / 255;
  }

  // Leinwand unter das 2D-Canvas legen: beide in dieselbe Zelle des Rasters von <main> (das 2D-Canvas liegt oben, faengt die Maus, Grund durchsichtig)
  let shown = false;
  function show(v) {
    const cv = X.cv; v = !!v && cv.style.display !== 'none'; if (v === shown) return; shown = v; // versteckte Leinwand (Test-Instanzen der Test-Leitung): zeichnen ja, zeigen nein
    if (v) {
      if (!el.parentNode && cv.parentNode) { const row = [...cv.parentNode.children].indexOf(cv) + 1; cv.parentNode.insertBefore(el, cv); for (const e of [el, cv]) { e.style.gridRow = String(row); e.style.gridColumn = '1' } }
      el.style.display = 'block'; cv.style.background = 'transparent';
    } else { el.style.display = 'none'; cv.style.background = ''; }
  }

  // Ein Bild: Welt aus dem Zustand ableiten, rendern, Leinwand zeigen. Ein Fehler wird gezaehlt, ab drei Fehlern meldet sich die Ansicht ab (dead, der Kern faellt auf 2D zurueck).
  const api = { on: true, dead: '', get shown() { return shown } };
  function render() {
    if (api.dead) return false;
    const t0 = performance.now();
    try {
      setQ(X.gfx > 0 ? 2 : 1);
      { ov = X.seen ? X.seen() : null; const ok = ov ? JSON.stringify(ov) : ''; if (ok !== ovKey) { ovKey = ok; rev = -1 } }
      if (X.LAY !== curLay || X.st !== curSt) buildLay();
      else if (X.gRev !== rev || (X.vaultOpen ? '1' : '0') !== gridKey[0]) { rev = X.gRev; const k = keyOfGrid(); if (k !== gridKey) { gridKey = k; refreshGround(); buildStatic() } }
      updVis();
      if (performance.now() - decT >= C.decalT * 1000) refreshDecal();
      buildDyn(); camSet(); setCut(); st.rcam = [tgt.x, tgt.z]; ren.render(scene, cam); show(true);
    } catch (e) {
      st.errs++; st.err = String(e && e.message || e).slice(0, 120); if (st.errs >= 3) api.dead = 'Fehler beim Zeichnen (' + st.err + ')'; show(false); return false;
    }
    const ms = performance.now() - t0; st.frames++; st.ms = ms; st.msAvg = st.frames > 1 ? st.msAvg * .9 + ms * .1 : ms;
    st.calls = ren.info.render.calls; st.tris = ren.info.render.triangles;
    return true;
  }
  function info() {
    return { on: !api.dead, shown, angle: angle(), camY: cam.position.y, camZ: cam.position.z - tgt.z, q: st.q, frames: st.frames, ms: st.ms, msAvg: st.msAvg, calls: st.calls, tris: st.tris, errs: st.errs, err: st.err || api.dead,
      builds: st.builds, groundUp: st.groundUp, statBuilds: st.statBuilds, inst: st.inst, parts: st.parts.slice(), vol: st.vol, decUp: st.decUp, figs: st.figs, cars: st.cars, fk: Object.assign({}, st.fk), ck: Object.assign({}, st.ck), lie: st.lie, hit: st.hit, xparts: st.xparts, sil: st.sil || 0, sk: Object.assign({}, st.sk), lead: C.camLead, tgt: (st.rcam || [0, 0]).slice(), cut: U0.uCut.value.toArray(), vis: { on: !!st.visOn, up: st.visUp, dark: UV.uDark.value.w, size: [visCv.width, visCv.height], key: visKey, n: visPoly ? visPoly.length : 0 }, ov: ovKey, dynCalls: st.dynCalls, dynGrow: st.dynGrow, cells: Object.assign({}, cells), decal: !!ground && groundMat.uniforms.dmap.value === decTex, objs: scene.children.length, ground: !!ground, size: [el.width, el.height],
      gl: glc.getParameter(glc.VERSION), gpu: dbgInfo ? glc.getParameter(dbgInfo.UNMASKED_RENDERER_WEBGL) : '' };
  }
  // Fuer Tests und Bilder: Helligkeit des letzten Bildes (Stichprobe), direkt nach einem render() im selben Takt (ohne preserveDrawingBuffer)
  function probe() {
    if (!render()) return null;
    const w = 96, h = 54, c = document.createElement('canvas'); c.width = w; c.height = h; const q = c.getContext('2d'); q.drawImage(el, 0, 0, w, h);
    const d = q.getImageData(0, 0, w, h).data; let s = 0, mn = 255, mx = 0;
    for (let i = 0; i < d.length; i += 4) { const l = (d[i] + d[i + 1] + d[i + 2]) / 3; s += l; if (l < mn) mn = l; if (l > mx) mx = l }
    return { lum: s / (w * h), span: mx - mn };
  }
  function dispose() { show(false); if (el.parentNode) el.parentNode.removeChild(el); for (const e of [X.cv]) { e.style.gridRow = ''; e.style.gridColumn = '' } if (ground) ground.geometry.dispose(); for (const m of stat) m.dispose(); box.dispose(); for (const P of pools) if (P.im) { P.im.geometry.dispose(); P.im.dispose() } for (const q of [bodyGeo, cubeGeo, flatGeo, figMat, topMat, shMat, silMat, colMat, chTex, chFTex, carTex]) q.dispose(); for (const m of mats.concat([glassMat, groundMat])) m.dispose(); groundTex.dispose(); decTex.dispose(); visTex.dispose(); ren.dispose(); try { ren.forceContextLoss() } catch (e) { /* schon weg */ } api.dead = 'entsorgt' }

  return Object.assign(api, { render, show, pick, toScr, info, probe, seen, visAt, fogA: () => UV.uDark.value.w, dispose, dyn: () => dynLast, el, cam, scene, cfg: C });
}
mkView3d.api = 5;
