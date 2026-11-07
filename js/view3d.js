/* Holdup: 3D-Ansicht (Ticket 149, 3D-0: Geruest, docs/plan-3d.md). ES-Modul, die einzige Stelle mit Modulen: index.html laedt es per import() erst,
   wenn 3D gewuenscht ist (Optionen "Ansicht" oder #3d), nie ueber file:// (Chromium verbietet dort Module, dann Rueckfall auf 2D mit Meldung).
   mkView3d(X) bekommt vom Kern einen Kontext X (Konstanten und Getter, nur lesen; Raster nur ueber X.cell, Strasse nur ueber X.LANE) und zeichnet die Welt
   mit Three.js in eine eigene WebGL-Leinwand unter dem 2D-Canvas. Das 2D-Canvas bleibt oben, durchsichtig, und traegt HUD und Menues (js/draw.js).
   Stand 3D-0: Szene, Kamera fest gekippt (X.angle, 20 bis 30 Grad, Standard 25), Boden als Flaeche mit der Textur der statischen 2D-Ebene (X.st, X.so).
   Einheiten: 1 Einheit = 1 Weltpixel, 2D x -> 3D x, 2D y -> 3D z, oben ist +y. Simulation, Netz und VER bleiben unberuehrt.
   Uebernommen aus dem Prototyp (Ticket 125, PR 130): Kontext mit Gettern, Perspektive mit schmalem Blickwinkel, camSet, Boden aus der 2D-Textur, pick-Strahl, Rueckfall {on:false,err}.
   Bei geaendertem Kontext oder geaenderter Rueckgabe mkView3d.api hier und VIEW3D_API in index.html erhoehen. */
import * as THREE from '../assets/three.module.min.js';

export const V3CFG = { fov: 30, aimH: 24, near: 10, far: 9000, clear: 0x0e1014 };

export function mkView3d(X) {
  const C = V3CFG, T = X.T, VW = X.VW, VH = X.VH;
  let ren;
  try {
    ren = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  } catch (e) { return { on: false, err: 'kein WebGL 2 (' + String(e && e.message || e).slice(0, 60) + ')' }; }
  if (!ren.capabilities || !ren.capabilities.isWebGL2) { ren.dispose(); return { on: false, err: 'kein WebGL 2' }; }
  const glc = ren.getContext(), dbgInfo = glc.getExtension('WEBGL_debug_renderer_info');
  const st = { q: 0, frames: 0, ms: 0, msAvg: 0, calls: 0, tris: 0, errs: 0, err: '', builds: 0, groundUp: 0 };
  ren.setPixelRatio(1); ren.outputColorSpace = THREE.SRGBColorSpace; ren.setClearColor(C.clear);
  const el = ren.domElement; el.id = 'c3d'; el.setAttribute('aria-hidden', 'true'); el.style.pointerEvents = 'none'; el.style.display = 'none';
  const setQ = q => { if (q === st.q) return; st.q = q; ren.setSize(VW * q, VH * q, false) };

  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(C.fov, VW / VH, C.near, C.far);
  cam.up.set(0, 0, -1);

  // Boden: statische Ebene (X.st) plus Objekte (X.so) in einer Leinwand, als Textur auf eine Flaeche ueber die ganze Welt (unbeleuchtet, sieht aus wie 2D)
  const groundCv = document.createElement('canvas'), groundG = groundCv.getContext('2d');
  const groundTex = new THREE.CanvasTexture(groundCv); groundTex.colorSpace = THREE.SRGBColorSpace; groundTex.anisotropy = Math.min(8, ren.capabilities.getMaxAnisotropy());
  const groundMat = new THREE.MeshBasicMaterial({ map: groundTex });
  let ground = null, curLay = null, curSt = null, gridKey = '';
  function refreshGround() { groundG.clearRect(0, 0, groundCv.width, groundCv.height); groundG.drawImage(X.st, 0, 0); groundG.drawImage(X.so, 0, 0); groundTex.needsUpdate = true; st.groundUp++ }
  function buildLay() {
    const WP = X.W * T, HP = X.H * T, ox = X.WX0 * T, oz = X.WY0 * T;
    curLay = X.LAY; curSt = X.st;
    groundCv.width = X.st.width; groundCv.height = X.st.height; refreshGround();
    if (ground) { scene.remove(ground); ground.geometry.dispose() }
    ground = new THREE.Mesh(new THREE.PlaneGeometry(WP, HP).rotateX(-Math.PI / 2), groundMat); ground.position.set(ox + WP / 2, 0, oz + HP / 2); ground.name = 'boden'; scene.add(ground);
    gridKey = keyOfGrid(); st.builds++;
  }
  // Rasterschluessel: aendert sich eine Kachel (Tuer, Fenster, Barrikade), wird die Bodentextur neu kopiert (die Objektebene X.so zeichnet der Kern neu)
  function keyOfGrid() { let s = ''; const x0 = X.WX0, y0 = X.WY0; for (let y = y0; y < y0 + X.H; y++) for (let x = x0; x < x0 + X.W; x++) { const c = X.cell(x, y); s += c === 'v' ? 'o' : c } return s }

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
      else { const k = keyOfGrid(); if (k !== gridKey) { gridKey = k; refreshGround() } }
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
      builds: st.builds, groundUp: st.groundUp, objs: scene.children.length, ground: !!ground, size: [el.width, el.height],
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
  function dispose() { show(false); if (el.parentNode) el.parentNode.removeChild(el); for (const e of [X.cv]) { e.style.gridRow = ''; e.style.gridColumn = '' } if (ground) ground.geometry.dispose(); groundMat.dispose(); groundTex.dispose(); ren.dispose(); try { ren.forceContextLoss() } catch (e) { /* schon weg */ } api.dead = 'entsorgt' }

  return Object.assign(api, { render, show, pick, toScr, info, probe, dispose, el, cam, scene, cfg: C });
}
mkView3d.api = 1;
