/* Holdup: 3D-Ansicht (Ticket 149, 3D-0: Geruest, docs/plan-3d.md). ES-Modul, die einzige Stelle mit Modulen: index.html laedt es per import() erst,
   wenn 3D gewuenscht ist (Optionen "Ansicht" oder #3d), nie ueber file:// (Chromium verbietet dort Module, dann Rueckfall auf 2D mit Meldung).
   mkView3d(X) bekommt vom Kern einen Kontext X (Konstanten und Getter, nur lesen; Raster nur ueber X.cell, Strasse nur ueber X.LANE) und zeichnet die Welt
   mit Three.js in eine eigene WebGL-Leinwand unter dem 2D-Canvas. Das 2D-Canvas bleibt oben, durchsichtig, und traegt HUD und Menues (js/draw.js).
   Stand 3D-0: Szene, Kamera fest gekippt (X.angle, 20 bis 30 Grad, Standard 25), Boden als Flaeche mit der Textur der statischen 2D-Ebene (X.st, X.so).
   Stand 3D-1 (Ticket 150): statische Welt aus dem Raster (Hoehentabelle V3CFG.cells, ein InstancedMesh je Material), Neubau nur bei Rasteraenderung (X.gRev, Abgleich), Spuren (X.dcv) als Ebene ueber dem Boden.
   Einheiten: 1 Einheit = 1 Weltpixel, 2D x -> 3D x, 2D y -> 3D z, oben ist +y. Simulation, Netz und VER bleiben unberuehrt.
   Uebernommen aus dem Prototyp (Ticket 125, PR 130): Kontext mit Gettern, Perspektive mit schmalem Blickwinkel, camSet, Boden aus der 2D-Textur, pick-Strahl, Rueckfall {on:false,err}.
   Bei geaendertem Kontext oder geaenderter Rueckgabe mkView3d.api hier und VIEW3D_API in index.html erhoehen. */
import * as THREE from '../assets/three.module.min.js';

export const V3CFG = {
  fov: 30, aimH: 24, near: 10, far: 9000, clear: 0x0e1014,
  wallH: 64, decalT: .3, decalDiv: 2, edge: 1.5,
  // Flaechenhelligkeit ohne Licht (Licht kommt mit 3D-5): Deckel, Suedseite (zur Kamera), Nordseite, Ost und West, Fuss (Seiten unten dunkler, bis wallH linear heller)
  shade: { top: 1, s: .84, n: .62, ew: .72, foot: .74 },
  // Materialien der Kloetze: 0 Bild (Bodentextur, Deckel zeigen die 2D-Zeichnung, Seiten strecken die Randpixel), 1 Holz, 2 Metall, 3 Zaun; Glas eigens (durchsichtig)
  mats: [null, 0x8a6a45, 0x5f6772, 0x8d959e], glass: 0xbfe6ff, glassA: .3,
  // Hoehentabelle je Kachelzeichen (jedes Zeichen des Rasters braucht einen Eintrag, Test 191): s Scheiben [unten, oben, Material] in Weltpixeln, ins Einzug je Seite,
  // fence duenn quer zur Zaunrichtung, glass [unten, oben] Scheibe in der Mitte, open: Zeichen, deren Koerper wegfaellt, wenn X.vaultOpen gilt, dyn: zeichnet ein spaeteres Ticket (Fahrzeuge 3D-2)
  cells: {
    '.': { s: [] }, o: { s: [] }, g: { s: [] }, v: { s: [], dyn: 1 },
    '#': { s: [[0, 64]] }, P: { s: [[0, 64]], ins: 2 }, V: { s: [[0, 64, 2]], open: 1 }, L: { s: [[0, 64, 2]] }, l: { s: [[50, 64]] },
    W: { s: [[0, 16], [50, 64]], glass: [16, 50] }, w: { s: [[0, 16], [50, 64]] }, Y: { s: [[0, 16], [50, 64], [18, 48, 1]] },
    D: { s: [[50, 64]] }, d: { s: [[50, 64]] },
    C: { s: [[0, 24]] }, e: { s: [[0, 20]], ins: 1 }, m: { s: [[0, 22]], ins: 1 }, b: { s: [[0, 14]], ins: 3 }, r: { s: [[0, 26]], ins: 4 },
    A: { s: [[0, 46]], ins: 3 }, k: { s: [[0, 28]], ins: 2 }, q: { s: [[0, 30]], ins: 5 }, p: { s: [[0, 34]], ins: 6 }, u: { s: [[0, 40]], ins: 4 },
    N: { s: [[0, 36, 2]], ins: 1 }, f: { s: [[0, 26, 3]], fence: 1 }, X: { s: [[0, 30, 1]] },
  },
};

// Shader der statischen Welt: Kloetze als Instanzen eines Einheitswuerfels, Bild-Koordinate aus der Weltlage (Seiten um edge nach innen versetzt, sie zeigen den Randpixel der Kachel),
// Helligkeit je Flaechenrichtung aus V3CFG.shade. Farbraum wie MeshBasicMaterial (sRGB-Textur, Ausgabe ueber colorspace_fragment).
const VS = `uniform vec4 uOrg; uniform vec4 uSh; uniform float uFoot; uniform float uWallH; uniform float uEdge; varying vec2 vUv; varying float vSh;
void main() {
  vec4 wp = modelMatrix * instanceMatrix * vec4(position, 1.0);
  vec2 q = wp.xz - normal.xz * uEdge;
  vUv = vec2((q.x - uOrg.x) * uOrg.z, 1.0 - (q.y - uOrg.y) * uOrg.w);
  float s = normal.y > 0.5 ? uSh.x : normal.z > 0.5 ? uSh.y : normal.z < -0.5 ? uSh.z : uSh.w;
  if (normal.y < 0.5) s *= mix(uFoot, 1.0, clamp(wp.y / uWallH, 0.0, 1.0));
  vSh = s;
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;
const FS = `uniform sampler2D map; uniform vec3 uCol; uniform float uMap; uniform float uA; varying vec2 vUv; varying float vSh;
void main() {
  vec3 c = uMap > 0.5 ? texture2D(map, vUv).rgb : uCol;
  gl_FragColor = vec4(c * vSh, uA);
  #include <colorspace_fragment>
}`;

export function mkView3d(X) {
  const C = V3CFG, T = X.T, VW = X.VW, VH = X.VH;
  let ren;
  try {
    ren = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  } catch (e) { return { on: false, err: 'kein WebGL 2 (' + String(e && e.message || e).slice(0, 60) + ')' }; }
  if (!ren.capabilities || !ren.capabilities.isWebGL2) { ren.dispose(); return { on: false, err: 'kein WebGL 2' }; }
  const glc = ren.getContext(), dbgInfo = glc.getExtension('WEBGL_debug_renderer_info');
  const st = { q: 0, frames: 0, ms: 0, msAvg: 0, calls: 0, tris: 0, errs: 0, err: '', builds: 0, groundUp: 0, statBuilds: 0, inst: 0, decUp: 0, parts: [], vol: 0 };
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
  // Boden in einem Durchgang: Bodenbild, darueber die Spuren nach ihrem Alpha gemischt (eine durchsichtige Ebene ueber dem ganzen Bild kostete in Software rund 45 ms je Bild)
  const groundMat = new THREE.ShaderMaterial({ uniforms: { map: { value: groundTex }, dmap: { value: decTex } },
    vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform sampler2D map; uniform sampler2D dmap; varying vec2 vUv; void main() { vec4 d = texture2D(dmap, vUv); gl_FragColor = vec4(mix(texture2D(map, vUv).rgb, d.rgb, d.a), 1.0);\n#include <colorspace_fragment>\n}' });
  let decT = 0;
  function refreshDecal() { decG.clearRect(0, 0, decCv.width, decCv.height); if (X.dcv) decG.drawImage(X.dcv, 0, 0, decCv.width, decCv.height); decTex.needsUpdate = true; st.decUp++; decT = performance.now() }

  // Materialien der statischen Welt (ein Draw Call je Material)
  const U0 = { uOrg: { value: new THREE.Vector4() }, uSh: { value: new THREE.Vector4(C.shade.top, C.shade.s, C.shade.n, C.shade.ew) }, uFoot: { value: C.shade.foot }, uWallH: { value: C.wallH }, uEdge: { value: C.edge } };
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
    U0.uOrg.value.set(ox, oz, 1 / WP, 1 / HP);
    if (ground) { scene.remove(ground); ground.geometry.dispose() }
    ground = new THREE.Mesh(new THREE.PlaneGeometry(WP, HP).rotateX(-Math.PI / 2), groundMat); ground.position.set(ox + WP / 2, 0, oz + HP / 2); ground.name = 'boden'; scene.add(ground);
    rev = X.gRev; gridKey = keyOfGrid(); buildStatic(); st.builds++;
  }
  // Rasterschluessel fuer den Abgleich: nur gelesen, wenn der Aenderungszaehler X.gRev weitergezaehlt hat. Fahrzeuge (v) zaehlen nicht (Boden darunter, Fahrzeuge zeichnet 3D-2), die offene Tresortuer schon.
  function keyOfGrid() { let s = X.vaultOpen ? '1' : '0'; const x0 = X.WX0, y0 = X.WY0; for (let y = y0; y < y0 + X.H; y++) for (let x = x0; x < x0 + X.W; x++) { const c = X.cell(x, y); s += c === 'v' ? 'o' : c } return s }

  // Statische Welt aus dem Raster: je Kachel und Scheibe der Hoehentabelle ein Kloetzchen (Instanz eines Einheitswuerfels), ein InstancedMesh je Material plus Glas.
  // cells zaehlt die Kacheln mit Koerper je Zeichen (Test: Wandkoerper gleich Wandkacheln), Zeichen ohne Eintrag landen in cells['?'+c] und zeichnen nichts.
  const mtx = new THREE.Matrix4(), pos = new THREE.Vector3(), scl = new THREE.Vector3(), qid = new THREE.Quaternion();
  function buildStatic() {
    for (const m of stat) { scene.remove(m); m.dispose() } stat = []; cells = {};
    const lists = C.mats.map(() => []), gl = [], spec = c => C.cells[c], wallish = c => { const s = spec(c); return !!s && !s.ins && !s.fence && s.s.some(q => q[0] === 0 && q[1] >= C.wallH) };
    const add = (L, X0, Z0, X1, Z1, Y0, Y1) => L.push(X0, Z0, X1, Z1, Y0, Y1);
    const x0 = X.WX0, y0 = X.WY0, vo = !!X.vaultOpen;
    for (let y = y0; y < y0 + X.H; y++) for (let x = x0; x < x0 + X.W; x++) {
      const c = X.cell(x, y), s = spec(c);
      if (!s) { cells['?' + c] = (cells['?' + c] || 0) + 1; continue }
      if (!s.s.length || (s.open && vo)) continue;
      cells[c] = (cells[c] || 0) + 1;
      let X0 = x * T, Z0 = y * T, X1 = X0 + T, Z1 = Z0 + T; const ins = s.ins || 0; X0 += ins; Z0 += ins; X1 -= ins; Z1 -= ins;
      const hz = X.cell(x - 1, y) === c || X.cell(x + 1, y) === c || wallish(X.cell(x - 1, y)) || wallish(X.cell(x + 1, y));
      if (s.fence) { if (X.cell(x - 1, y) === 'f' || X.cell(x + 1, y) === 'f') { Z0 = y * T + 12; Z1 = y * T + 19 } else { X0 = x * T + 12; X1 = x * T + 19 } }
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

  // Kamera: Ziel ist die Mitte des 2D-Ausschnitts (camX/camY folgen dem Spieler wie in 2D), Kippung X.angle um die Ost-West-Achse nach Sueden.
  // Abstand so, dass die Bildhoehe am Ziel der 2D-Hoehe (VH) entspricht, die sichtbare Bodenbreite ist dort wie in 2D.
  const tgt = new THREE.Vector3();
  function angle() { const a = +X.angle; return a >= 20 && a <= 30 ? a : 25 }
  function camSet() {
    tgt.set(X.camX + VW / 2, 0, X.camY + VH / 2);
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

  // Leinwand unter das 2D-Canvas legen: beide in dieselbe Zelle des Rasters von <main> (das 2D-Canvas liegt oben, faengt die Maus, Grund durchsichtig)
  let shown = false;
  function show(v) {
    v = !!v; if (v === shown) return; shown = v; const cv = X.cv;
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
      if (X.LAY !== curLay || X.st !== curSt) buildLay();
      else if (X.gRev !== rev || (X.vaultOpen ? '1' : '0') !== gridKey[0]) { rev = X.gRev; const k = keyOfGrid(); if (k !== gridKey) { gridKey = k; refreshGround(); buildStatic() } }
      if (performance.now() - decT >= C.decalT * 1000) refreshDecal();
      camSet(); ren.render(scene, cam); show(true);
    } catch (e) {
      st.errs++; st.err = String(e && e.message || e).slice(0, 120); if (st.errs >= 3) api.dead = 'Fehler beim Zeichnen (' + st.err + ')'; show(false); return false;
    }
    const ms = performance.now() - t0; st.frames++; st.ms = ms; st.msAvg = st.frames > 1 ? st.msAvg * .9 + ms * .1 : ms;
    st.calls = ren.info.render.calls; st.tris = ren.info.render.triangles;
    return true;
  }
  function info() {
    return { on: !api.dead, shown, angle: angle(), camY: cam.position.y, camZ: cam.position.z - tgt.z, q: st.q, frames: st.frames, ms: st.ms, msAvg: st.msAvg, calls: st.calls, tris: st.tris, errs: st.errs, err: st.err || api.dead,
      builds: st.builds, groundUp: st.groundUp, statBuilds: st.statBuilds, inst: st.inst, parts: st.parts.slice(), vol: st.vol, decUp: st.decUp, cells: Object.assign({}, cells), decal: !!ground && groundMat.uniforms.dmap.value === decTex, objs: scene.children.length, ground: !!ground, size: [el.width, el.height],
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
  function dispose() { show(false); if (el.parentNode) el.parentNode.removeChild(el); for (const e of [X.cv]) { e.style.gridRow = ''; e.style.gridColumn = '' } if (ground) ground.geometry.dispose(); for (const m of stat) m.dispose(); box.dispose(); for (const m of mats.concat([glassMat, groundMat])) m.dispose(); groundTex.dispose(); decTex.dispose(); ren.dispose(); try { ren.forceContextLoss() } catch (e) { /* schon weg */ } api.dead = 'entsorgt' }

  return Object.assign(api, { render, show, pick, toScr, info, probe, dispose, el, cam, scene, cfg: C });
}
mkView3d.api = 2;
