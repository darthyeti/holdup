/* 3D-Ansicht (Prototyp zu Ticket #125, wird nicht gemergt). Laedt nur bei #3d in der Adresse (dynamischer import aus index.html).
   Liest den Spielzustand ueber das Kontextobjekt X (Getter, nur lesen) und zeichnet die Welt mit Three.js in eine eigene WebGL-Leinwand,
   die index.html dann unter das 2D-HUD legt. Simulation, Netz und VER bleiben unberuehrt.
   Einheiten: 1 Einheit = 1 Weltpixel, 2D x -> 3D x, 2D y -> 3D z, oben ist +y. Raster nur ueber X.cell, Strasse nur ueber X.LANE. */
import * as THREE from '../assets/three.module.min.js';

export const V3CFG = {
  fov: 30, tiltMax: 60, tiltStep: 5, zoomMin: .55, zoomMax: 1.8,
  wallH: 64, aimH: 24, bodyH: 26, spriteH: 28, carH: 26,
  cutR: 70, ovMaxW: 1600, ovMaxH: 1400, visDiv: 4, decalT: .3,
  lamps: { step: 7, off: 2, h: 88, n: 4, dist: 360, I: 1.7 },
  pool: { muz: 3, blue: 4, boom: 2, lamp: 4, room: 2 },
  // Hoehen je Kachel: [unten, oben] in Weltpixeln, ins: Einzug je Seite (Moebel schmaler als die Kachel), m: Material (0 Bild, 1 Holz, 2 Metall)
  cells: {
    '#': { s: [[0, 64]] }, P: { s: [[0, 64]], ins: 2 }, V: { s: [[0, 64]], m: 2 }, L: { s: [[0, 64]] },
    W: { s: [[0, 16], [50, 64]], glass: [16, 50] }, w: { s: [[0, 16], [50, 64]] }, Y: { s: [[0, 16], [50, 64], [18, 48, 1]] },
    D: { s: [[50, 64]] }, d: { s: [[50, 64]] }, l: { s: [[50, 64]] },
    C: { s: [[0, 24]] }, e: { s: [[0, 20]], ins: 1 }, m: { s: [[0, 22]], ins: 1 }, b: { s: [[0, 14]], ins: 3 }, r: { s: [[0, 26]], ins: 4 },
    A: { s: [[0, 46]], ins: 3 }, k: { s: [[0, 28]], ins: 2 }, q: { s: [[0, 30]], ins: 5 }, p: { s: [[0, 34]], ins: 6 }, u: { s: [[0, 40]], ins: 4 },
    f: { s: [[0, 26]], fence: 1 }, X: { s: [[0, 30, 1]] },
  },
};

const TOD = {
  mittag: { sun: 2.9, hemi: 1.15, elev: 58, sky: 0xdfe8f2, gnd: 0x5a5148 },
  morgen: { sun: 2.3, hemi: 1.0, elev: 36, sky: 0xc9d8ff, gnd: 0x4a4a52 },
  abend: { sun: 2.4, hemi: .85, elev: 24, sky: 0xffc89a, gnd: 0x4a3a30 },
  daemmerung: { sun: 1.0, hemi: .55, elev: 18, sky: 0x8a9ad8, gnd: 0x2a2a38 },
  nacht: { sun: .42, hemi: .2, elev: 48, sky: 0x4a5a9a, gnd: 0x12141c },
};

export function mkView3d(X) {
  const C = V3CFG, T = X.T, VW = X.VW, VH = X.VH;
  let ren;
  try {
    ren = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  } catch (e) { return { on: false, err: String(e && e.message || e) }; }
  const st = { tilt: 30, tiltT: 30, zoom: 1, zoomT: 1, shadows: true, q: 2, ms: 0, msN: 0, frames: 0, last: {} };
  try { const s = JSON.parse(localStorage.getItem('holdup.3d') || 'null'); if (s) { st.tilt = st.tiltT = +s.tilt || 0; st.zoom = st.zoomT = +s.zoom || 1; st.shadows = s.shadows !== false } } catch (e) { /* ohne Speicher */ }
  const save = () => { try { localStorage.setItem('holdup.3d', JSON.stringify({ tilt: st.tiltT, zoom: st.zoomT, shadows: st.shadows })) } catch (e) { /* egal */ } };
  ren.setPixelRatio(1); ren.setSize(VW * st.q, VH * st.q, false);
  ren.outputColorSpace = THREE.SRGBColorSpace;
  ren.shadowMap.enabled = true; ren.shadowMap.type = THREE.PCFSoftShadowMap;
  ren.setClearColor(0x0e1014);
  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(C.fov, VW / VH, 10, 9000);
  cam.up.set(0, 0, -1);

  // Gemeinsame Uniforms: Sichtmaske (Weltbild der Sichtflaeche, weich), Abdunklung, Durchblick zum Spieler
  const visCv = document.createElement('canvas'), visG = visCv.getContext('2d');
  const visTex = new THREE.CanvasTexture(visCv); visTex.colorSpace = THREE.NoColorSpace; visTex.minFilter = THREE.LinearFilter; visTex.generateMipmaps = false;
  const U = {
    uVis: { value: visTex }, uVisR: { value: new THREE.Vector4(0, 0, 1, 1) }, uDark: { value: .58 },
    uPl: { value: new THREE.Vector3() }, uCut: { value: 0 }, uCutR: { value: C.cutR },
  };
  function patch(mat, o) {
    o = o || {};
    mat.onBeforeCompile = sh => {
      Object.assign(sh.uniforms, U);
      sh.vertexShader = 'varying vec3 vW3;varying vec3 vN3;\n' + sh.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\n' +
        (o.inst ? 'vW3=(modelMatrix*instanceMatrix*vec4(transformed,1.)).xyz;' : 'vW3=(modelMatrix*vec4(transformed,1.)).xyz;') +
        (o.flat ? 'vN3=vec3(0.,1.,0.);' : 'vN3=normalize(mat3(modelMatrix)*objectNormal);'));
      sh.fragmentShader = 'varying vec3 vW3;varying vec3 vN3;uniform sampler2D uVis;uniform vec4 uVisR;uniform float uDark;uniform vec3 uPl;uniform float uCut;uniform float uCutR;\n' +
        sh.fragmentShader.replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\n' + (o.cut ?
          'if(uCut>.5&&vW3.y>7.){vec3 cp=uPl-cameraPosition;float L=length(cp);vec3 dd=cp/L;vec3 ff=vW3-cameraPosition;float tt=dot(ff,dd);if(tt<L-10.){float rr=length(ff-dd*tt);float ee=smoothstep(uCutR*.5,uCutR,rr);float nn=fract(52.9829189*fract(dot(gl_FragCoord.xy,vec2(.06711056,.00583715))));if(nn>ee)discard;}}' : ''))
          .replace('#include <dithering_fragment>', '#include <dithering_fragment>\n' + (o.nomask ? '' :
            '{vec2 q=vW3.xz+vN3.xz*9.;vec2 uv=vec2((q.x-uVisR.x)*uVisR.z,1.-(q.y-uVisR.y)*uVisR.w);float m=texture2D(uVis,uv).r;vec3 dk=gl_FragColor.rgb*(1.-uDark)+vec3(.039,.047,.078)*uDark;gl_FragColor.rgb=mix(dk,gl_FragColor.rgb,m);}'));
    };
    mat.customProgramCacheKey = () => 'v3' + (o.cut ? 'c' : '') + (o.flat ? 'f' : '') + (o.inst ? 'i' : '') + (o.nomask ? 'n' : '');
    return mat;
  }

  // Bilder: Boden (statische Ebene st plus Objekte so) in voller Aufloesung, Spuren (dcv) halb, Overlay fuer 2D-Weltmarken
  const groundCv = document.createElement('canvas'), groundG = groundCv.getContext('2d');
  const groundTex = new THREE.CanvasTexture(groundCv); groundTex.colorSpace = THREE.SRGBColorSpace; groundTex.anisotropy = ren.capabilities.getMaxAnisotropy();
  const decCv = document.createElement('canvas'), decG = decCv.getContext('2d');
  const decTex = new THREE.CanvasTexture(decCv); decTex.colorSpace = THREE.SRGBColorSpace;
  const ovCv = document.createElement('canvas'); ovCv.width = C.ovMaxW; ovCv.height = C.ovMaxH; const ovG = ovCv.getContext('2d');
  const ovTex = new THREE.CanvasTexture(ovCv); ovTex.colorSpace = THREE.SRGBColorSpace; ovTex.generateMipmaps = false; ovTex.minFilter = THREE.LinearFilter;
  const tex = (img, rep) => { const t = new THREE.Texture(img); t.colorSpace = THREE.SRGBColorSpace; t.needsUpdate = true; t.magFilter = THREE.LinearFilter; t.anisotropy = 4; if (rep) { t.repeat.set(rep[0], rep[1]) } return t };
  const chTex = tex(X.ch), chFTex = tex(X.chF), carTex = tex(X.cars);
  const soft = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const q = c.getContext('2d'), gr = q.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.5, 'rgba(255,255,255,.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); q.fillStyle = gr; q.fillRect(0, 0, 64, 64); const t = new THREE.CanvasTexture(c); return t })();

  // Durchschnittsfarbe je Zeile eines Sprite-Bogens (fuer Koerper und Karosserie)
  function rowCols(img, cw, chh, rows, col) {
    const c = document.createElement('canvas'); c.width = cw; c.height = chh; const q = c.getContext('2d', { willReadFrequently: true }), out = [];
    for (let r = 0; r < rows; r++) {
      q.clearRect(0, 0, cw, chh); q.drawImage(img, col * cw, r * chh, cw, chh, 0, 0, cw, chh); const d = q.getImageData(0, 0, cw, chh).data; let R = 0, G = 0, B = 0, N = 0;
      for (let i = 0; i < d.length; i += 16) if (d[i + 3] > 200) { R += d[i]; G += d[i + 1]; B += d[i + 2]; N++ }
      out.push(N ? new THREE.Color(R / N / 255, G / N / 255, B / N / 255).convertSRGBToLinear() : new THREE.Color(.2, .2, .22));
    }
    return out;
  }
  const chCol = rowCols(X.ch, 128, 128, Math.round(X.ch.height / 128), 6), carCol = rowCols(X.cars, 256, 128, Math.round(X.cars.height / 128), 0);

  // Licht
  const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 1); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffffff, 2); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -1000, right: 1000, top: 1000, bottom: -1000, near: 10, far: 4000 }); sun.shadow.bias = -.0006; sun.shadow.normalBias = 1.2;
  scene.add(sun); scene.add(sun.target);
  const pool = {}, mkPt = (n, col, dist) => { const a = []; for (let i = 0; i < n; i++) { const L = new THREE.PointLight(col, 0, dist, 0); scene.add(L); a.push(L) } return a };
  pool.muz = mkPt(C.pool.muz, 0xffc070, 260); pool.blue = mkPt(C.pool.blue, 0xff3030, 320); pool.boom = mkPt(C.pool.boom, 0xff9a40, 520);
  pool.lamp = mkPt(C.pool.lamp, 0xffd9a0, C.lamps.dist); pool.room = mkPt(C.pool.room, 0xffe2b0, 460); pool.me = mkPt(1, 0xdfe8ff, 320);

  // Materialien
  const M = {
    world: patch(new THREE.MeshLambertMaterial({ map: groundTex }), { cut: 1 }),
    wood: patch(new THREE.MeshLambertMaterial({ color: 0x8a6a45 }), { cut: 1 }),
    metal: patch(new THREE.MeshLambertMaterial({ color: 0x6a727e }), { cut: 1 }),
    ground: patch(new THREE.MeshLambertMaterial({ map: groundTex }), {}),
    decal: patch(new THREE.MeshLambertMaterial({ map: decTex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }), {}),
    glass: new THREE.MeshLambertMaterial({ color: 0xbfe6ff, transparent: true, opacity: .28, depthWrite: false, emissive: 0x000000 }),
    post: patch(new THREE.MeshLambertMaterial({ color: 0x3a3f46 }), {}),
    lampHead: new THREE.MeshBasicMaterial({ color: 0xfff0c8 }),
    glowAdd: new THREE.MeshBasicMaterial({ map: soft, transparent: true, opacity: .42, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xffc880 }),
    winAdd: new THREE.MeshBasicMaterial({ map: soft, transparent: true, opacity: .5, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xffb860 }),
    ov: new THREE.MeshBasicMaterial({ map: ovTex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }),
    bullet: new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }),
    gren: patch(new THREE.MeshLambertMaterial({ color: 0x2a2d33 }), {}),
  };
  const outside = new THREE.Mesh(new THREE.PlaneGeometry(40000, 40000).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ color: 0x15181d })); outside.position.y = -1; outside.receiveShadow = true; scene.add(outside);
  let ground = null, decal = null, statMesh = null, glassMesh = null, ovMesh = null, lampGrp = null, winGlow = null, lampSpots = [], roomSpots = [], gridKey = '', curLay = null, curSt = null;
  ovMesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), M.ov); ovMesh.renderOrder = 5; scene.add(ovMesh);

  // Statische Geometrie aus dem Raster: Kloetze je Kachel, Deckflaechen mit dem Bodenbild an derselben Stelle, Seiten strecken die Randpixel
  function buildStatic() {
    const L = X.LAY, W = X.W, H = X.H, x0 = X.WX0, y0 = X.WY0, WP = W * T, HP = H * T, ox = x0 * T, oz = y0 * T;
    const buf = [[], [], []].map(() => ({ p: [], n: [], u: [] })), gl = { p: [], n: [] };
    const U2 = (x, z) => [(x - ox) / WP, 1 - (z - oz) / HP];
    const quad = (b, a, bb, c, d, n, ua, ub, uc, ud) => { b.p.push(...a, ...bb, ...c, ...a, ...c, ...d); for (let i = 0; i < 6; i++)b.n.push(...n); b.u.push(...ua, ...ub, ...uc, ...ua, ...uc, ...ud) };
    const spec = c => C.cells[c];
    const box = (b, X0, Z0, X1, Z1, Y0, Y1, sides) => {
      // oben
      quad(b, [X0, Y1, Z0], [X0, Y1, Z1], [X1, Y1, Z1], [X1, Y1, Z0], [0, 1, 0], U2(X0, Z0), U2(X0, Z1), U2(X1, Z1), U2(X1, Z0));
      if (Y0 > 0) quad(b, [X0, Y0, Z0], [X1, Y0, Z0], [X1, Y0, Z1], [X0, Y0, Z1], [0, -1, 0], U2(X0, Z0), U2(X1, Z0), U2(X1, Z1), U2(X0, Z1));
      const e = 1.5;
      if (sides[0]) quad(b, [X0, Y1, Z0], [X1, Y1, Z0], [X1, Y0, Z0], [X0, Y0, Z0], [0, 0, -1], U2(X0, Z0 + e), U2(X1, Z0 + e), U2(X1, Z0 + e + .01), U2(X0, Z0 + e + .01)); // Nord
      if (sides[1]) quad(b, [X1, Y1, Z1], [X0, Y1, Z1], [X0, Y0, Z1], [X1, Y0, Z1], [0, 0, 1], U2(X1, Z1 - e), U2(X0, Z1 - e), U2(X0, Z1 - e - .01), U2(X1, Z1 - e - .01)); // Sued
      if (sides[2]) quad(b, [X0, Y1, Z1], [X0, Y1, Z0], [X0, Y0, Z0], [X0, Y0, Z1], [-1, 0, 0], U2(X0 + e, Z1), U2(X0 + e, Z0), U2(X0 + e + .01, Z0), U2(X0 + e + .01, Z1)); // West
      if (sides[3]) quad(b, [X1, Y1, Z0], [X1, Y1, Z1], [X1, Y0, Z1], [X1, Y0, Z0], [1, 0, 0], U2(X1 - e, Z0), U2(X1 - e, Z1), U2(X1 - e - .01, Z1), U2(X1 - e - .01, Z0)); // Ost
    };
    const same = (a, b) => { const A = spec(a), B = spec(b); return A && B && A === B && !A.ins && !A.fence };
    const full = c => { const s = spec(c); return s && !s.ins && !s.fence && s.s.some(q => q[0] === 0 && q[1] >= C.wallH) };
    for (let y = y0; y < y0 + H; y++) for (let x = x0; x < x0 + W; x++) {
      const c = X.cell(x, y); let s = spec(c); if (!s) continue;
      if (c === 'V' && X.vaultOpen) continue;
      let X0 = x * T, Z0 = y * T, X1 = X0 + T, Z1 = Z0 + T; const ins = s.ins || 0; X0 += ins; Z0 += ins; X1 -= ins; Z1 -= ins;
      if (s.fence) { const hz = X.cell(x - 1, y) === 'f' || X.cell(x + 1, y) === 'f'; if (hz) { Z0 = y * T + 12; Z1 = y * T + 19 } else { X0 = x * T + 12; X1 = x * T + 19 } }
      const nb = [X.cell(x, y - 1), X.cell(x, y + 1), X.cell(x - 1, y), X.cell(x + 1, y)];
      for (const sl of s.s) {
        const sides = nb.map(n => !(same(c, n) || (full(n) && sl[1] <= C.wallH && !ins && !s.fence)));
        box(buf[sl[2] || s.m || 0], X0, Z0, X1, Z1, sl[0], sl[1], sides);
      }
      if (s.glass) { const hz = nb[2] && full(nb[2]) || spec(nb[2]) === s || spec(nb[3]) === s || full(nb[3]); const gb = { p: [], n: [], u: [] }; if (hz) box(gb, x * T, y * T + 14, x * T + T, y * T + 18, s.glass[0], s.glass[1], [1, 1, 0, 0]); else box(gb, x * T + 14, y * T, x * T + 18, y * T + T, s.glass[0], s.glass[1], [0, 0, 1, 1]); gl.p.push(...gb.p); gl.n.push(...gb.n) }
    }
    const geo = new THREE.BufferGeometry(), P = [], N = [], UV = []; let st0 = 0;
    buf.forEach((b, i) => { P.push(...b.p); N.push(...b.n); UV.push(...b.u); geo.addGroup(st0, b.p.length / 3, i); st0 += b.p.length / 3 });
    geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); geo.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(UV, 2));
    if (statMesh) { scene.remove(statMesh); statMesh.geometry.dispose() }
    statMesh = new THREE.Mesh(geo, [M.world, M.wood, M.metal]); statMesh.castShadow = statMesh.receiveShadow = true; scene.add(statMesh);
    if (glassMesh) { scene.remove(glassMesh); glassMesh.geometry.dispose() }
    const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.Float32BufferAttribute(gl.p, 3)); gg.setAttribute('normal', new THREE.Float32BufferAttribute(gl.n, 3));
    glassMesh = new THREE.Mesh(gg, M.glass); glassMesh.renderOrder = 3; scene.add(glassMesh);
    st.tris = P.length / 9;
  }

  // Boden und Spurenebene, Laternen und Fensterlicht neu, wenn eine neue Karte gebaut ist
  function buildLay() {
    const W = X.W, H = X.H, WP = W * T, HP = H * T, ox = X.WX0 * T, oz = X.WY0 * T;
    curLay = X.LAY; curSt = X.st;
    groundCv.width = X.st.width; groundCv.height = X.st.height; refreshGround();
    decCv.width = WP / 2 | 0; decCv.height = HP / 2 | 0;
    visCv.width = Math.ceil(WP / C.visDiv); visCv.height = Math.ceil(HP / C.visDiv); U.uVisR.value.set(ox, oz, 1 / WP, 1 / HP);
    for (const m of [ground, decal]) if (m) { scene.remove(m); m.geometry.dispose() }
    ground = new THREE.Mesh(new THREE.PlaneGeometry(WP, HP).rotateX(-Math.PI / 2), M.ground); ground.position.set(ox + WP / 2, 0, oz + HP / 2); ground.receiveShadow = true; scene.add(ground);
    decal = new THREE.Mesh(new THREE.PlaneGeometry(WP, HP).rotateX(-Math.PI / 2), M.decal); decal.position.set(ox + WP / 2, .3, oz + HP / 2); decal.receiveShadow = true; decal.renderOrder = 1; scene.add(decal);
    // Laternen rund um das Gebaeude (zwei Kacheln Abstand, alle sieben Kacheln, nur auf freiem Boden)
    if (lampGrp) scene.remove(lampGrp); lampGrp = new THREE.Group(); scene.add(lampGrp); lampSpots = [];
    const b = X.LAY.bld || { x0: 0, y0: 0, x1: 20, y1: 12 }, o = C.lamps.off, bx0 = b.x0 - o, by0 = b.y0 - o, bx1 = b.x1 + o, by1 = b.y1 + o, per = [];
    for (let x = bx0; x <= bx1; x++) { per.push([x, by0], [x, by1]) } for (let y = by0 + 1; y < by1; y++) { per.push([bx0, y], [bx1, y]) }
    const free = (x, y) => { for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (X.cell(x + dx, y + dy) !== 'o') return false; return true };
    per.sort((a, c) => Math.atan2(a[1] - (by0 + by1) / 2, a[0] - (bx0 + bx1) / 2) - Math.atan2(c[1] - (by0 + by1) / 2, c[0] - (bx0 + bx1) / 2));
    let last = null;
    for (const q of per) { if (!free(q[0], q[1])) continue; const wx = q[0] * T + 16, wz = q[1] * T + 16; if (last && Math.hypot(wx - last[0], wz - last[1]) < C.lamps.step * T) continue; if (lampSpots.length && Math.hypot(wx - lampSpots[0][0], wz - lampSpots[0][1]) < C.lamps.step * T * .8) continue; lampSpots.push([wx, wz]); last = [wx, wz] }
    const postG = new THREE.CylinderGeometry(2.5, 3.5, C.lamps.h, 8), headG = new THREE.BoxGeometry(14, 4, 9), glowG = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
    for (const [x, z] of lampSpots) {
      const p = new THREE.Mesh(postG, M.post); p.position.set(x, C.lamps.h / 2, z); p.castShadow = true; lampGrp.add(p);
      const h = new THREE.Mesh(headG, M.lampHead); h.position.set(x, C.lamps.h, z); lampGrp.add(h);
      const gw = new THREE.Mesh(glowG, M.glowAdd); gw.scale.set(240, 1, 240); gw.position.set(x, .6, z); gw.userData.night = 1; gw.renderOrder = 2; lampGrp.add(gw);
    }
    // Fensterlicht: warme Lichtflecken beidseits jedes Fensters (nur nachts sichtbar)
    winGlow = new THREE.Group(); lampGrp.add(winGlow);
    for (const w of X.LAY.wins || []) { for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) { const c = X.cell(w.x + dx, w.y + dy); if (C.cells[c] && C.cells[c].s[0][1] >= C.wallH) continue; if (c === 'W') continue; const gw = new THREE.Mesh(glowG, M.winAdd); gw.scale.set(dx ? 70 : 54, 1, dx ? 54 : 70); gw.position.set(w.x * T + 16 + dx * 30, .7, w.y * T + 16 + dy * 30); gw.renderOrder = 2; winGlow.add(gw) } }
    roomSpots = []; const cx = (b.x0 + b.x1 + 1) / 2 * T, cz = (b.y0 + b.y1 + 1) / 2 * T, hw = (b.x1 - b.x0) * T / 4;
    if ((b.x1 - b.x0) >= (b.y1 - b.y0)) roomSpots.push([cx - hw, cz], [cx + hw, cz]); else { const hh = (b.y1 - b.y0) * T / 4; roomSpots.push([cx, cz - hh], [cx, cz + hh]) }
    gridKey = '';
  }
  function refreshGround() { groundG.clearRect(0, 0, groundCv.width, groundCv.height); groundG.drawImage(X.st, 0, 0); groundG.drawImage(X.so, 0, 0); groundTex.needsUpdate = true }
  function refreshDecal() { decG.clearRect(0, 0, decCv.width, decCv.height); decG.drawImage(X.dcv, 0, 0, decCv.width, decCv.height); decTex.needsUpdate = true }
  function keyOfGrid() { let s = X.vaultOpen ? '1' : '0'; const x0 = X.WX0, y0 = X.WY0; for (let y = y0; y < y0 + X.H; y++) for (let x = x0; x < x0 + X.W; x++) { const c = X.cell(x, y); s += c === 'v' ? 'o' : c } return s }

  // Figuren: Koerper (Zylinder) und darauf das bisherige Sprite als liegende Flaeche, Schatten werfen beide
  const figs = new Map(), bodyG = new THREE.CylinderGeometry(9, 8, C.bodyH, 12).translate(0, C.bodyH / 2, 0), sprG = new THREE.PlaneGeometry(64, 64).rotateX(-Math.PI / 2);
  function fig(key, row) {
    let f = figs.get(key); if (f) return f;
    const g = new THREE.Group(), bm = patch(new THREE.MeshLambertMaterial({ color: chCol[row] || 0x333333 }), {}), body = new THREE.Mesh(bodyG, bm);
    const t1 = chTex.clone(), t2 = chFTex.clone(); for (const t of [t1, t2]) { t.repeat.set(1 / 9, 1 / 15); t.needsUpdate = true }
    const sm = patch(new THREE.MeshLambertMaterial({ map: t1, alphaTest: .5, side: THREE.DoubleSide }), {}), spr = new THREE.Mesh(sprG, sm);
    spr.position.y = C.spriteH; body.castShadow = spr.castShadow = true; body.receiveShadow = spr.receiveShadow = true; g.add(body, spr); scene.add(g);
    f = { g, body, spr, sm, bm, t1, t2, row: -1, seen: 0 }; figs.set(key, f); return f;
  }
  function setFig(f, x, z, a, row, col, hit, flat) {
    f.seen = st.frames; f.g.visible = true; f.g.position.set(x, 0, z); f.g.rotation.y = -a;
    const t = hit ? f.t2 : f.t1; if (f.sm.map !== t) { f.sm.map = t; f.sm.needsUpdate = true }
    t.offset.set(col / 9, 1 - (row + 1) / 15); f.t1.offset.copy(t.offset); f.t2.offset.copy(t.offset);
    if (f.row !== row) { f.row = row; f.bm.color.copy(chCol[row] || new THREE.Color(.2, .2, .2)) }
    f.body.visible = !flat; f.spr.position.y = flat ? 1.2 : C.spriteH;
  }
  // Fahrzeuge: Karosserie als Klotz in der Durchschnittsfarbe, oben das Fahrzeugbild, Streifenwagen mit Lichtbalken
  const cars = new Map(), topG = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), boxG = new THREE.BoxGeometry(1, 1, 1).translate(0, .5, 0);
  const barR = new THREE.MeshBasicMaterial({ color: 0xff2a20 }), barB = new THREE.MeshBasicMaterial({ color: 0x2a5aff });
  function car(key, row, L, Wd, pol) {
    let c = cars.get(key); if (c) return c;
    const g = new THREE.Group(), bm = patch(new THREE.MeshLambertMaterial({ color: carCol[row] || 0x444444 }), {}), body = new THREE.Mesh(boxG, bm); body.scale.set(L * .9, C.carH, Wd * .8);
    const t = carTex.clone(); t.repeat.set(1, 128 / X.cars.height); t.offset.set(0, 1 - (row + 1) * 128 / X.cars.height); t.needsUpdate = true;
    const tm = patch(new THREE.MeshLambertMaterial({ map: t, alphaTest: .4 }), {}), top = new THREE.Mesh(topG, tm); top.scale.set(L, 1, Wd); top.position.y = C.carH + .5;
    body.castShadow = top.castShadow = true; body.receiveShadow = top.receiveShadow = true; g.add(body, top);
    let r = null, b = null; if (pol) { const bg = new THREE.BoxGeometry(5, 4, 9); r = new THREE.Mesh(bg, barR); b = new THREE.Mesh(bg, barB); r.position.set(-2, C.carH + 3, -6); b.position.set(-2, C.carH + 3, 6); g.add(r, b) }
    scene.add(g); c = { g, bm, r, b, seen: 0, base: (carCol[row] || new THREE.Color(.3, .3, .3)).clone() }; cars.set(key, c); return c;
  }
  function setCar(c, x, z, a, dead) { c.seen = st.frames; c.g.visible = true; c.g.position.set(x, 0, z); c.g.rotation.y = -a; c.bm.color.copy(c.base).multiplyScalar(dead ? .25 : 1); if (c.r) { const ph = Math.floor(X.time * 5) % 2; c.r.visible = dead ? false : !!ph; c.b.visible = dead ? false : !ph } }
  function sweep(map) { for (const [k, v] of map) if (v.seen !== st.frames) { v.g.visible = false; if (st.frames - v.seen > 300) { scene.remove(v.g); map.delete(k) } } }

  // Kugeln (gestreckte Kloetze, additiv), Granaten (Kugeln)
  const bulN = 96, bulM = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1.6, 1.6), M.bullet, bulN); bulM.instanceMatrix.setUsage(THREE.DynamicDrawUsage); bulM.frustumCulled = false; scene.add(bulM);
  bulM.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(bulN * 3), 3);
  const grN = 16, grM = new THREE.InstancedMesh(new THREE.SphereGeometry(4, 10, 8), M.gren, grN); grM.castShadow = true; grM.frustumCulled = false; scene.add(grM);
  const tmpM = new THREE.Matrix4(), tmpQ = new THREE.Quaternion(), tmpS = new THREE.Vector3(), tmpP = new THREE.Vector3(), tmpC = new THREE.Color(), up = new THREE.Vector3(0, 1, 0);

  // Weiche Teilchen: Rauch, Staub (normal), Feuer, Glut, Funken (additiv). Ein Punkte-Objekt je Mischart.
  function mkParts(n, add) {
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aSize', new THREE.BufferAttribute(new Float32Array(n), 1).setUsage(THREE.DynamicDrawUsage)); g.setAttribute('aCol', new THREE.BufferAttribute(new Float32Array(n * 4), 4).setUsage(THREE.DynamicDrawUsage));
    const m = new THREE.ShaderMaterial({
      uniforms: { uScale: { value: 1 } }, transparent: true, depthWrite: false, blending: add ? THREE.AdditiveBlending : THREE.NormalBlending,
      vertexShader: 'attribute float aSize;attribute vec4 aCol;varying vec4 vC;uniform float uScale;void main(){vC=aCol;vec4 mv=modelViewMatrix*vec4(position,1.);gl_PointSize=aSize*uScale/-mv.z;gl_Position=projectionMatrix*mv;}',
      fragmentShader: 'varying vec4 vC;void main(){vec2 d=gl_PointCoord-.5;float r=length(d)*2.;if(r>1.)discard;float a=vC.a*(1.-smoothstep(.15,1.,r));' + (add ? 'gl_FragColor=vec4(vC.rgb*a,1.);' : 'gl_FragColor=vec4(vC.rgb,a);') + '}',
    });
    if (add) m.blending = THREE.CustomBlending, m.blendSrc = THREE.OneFactor, m.blendDst = THREE.OneFactor;
    const o = new THREE.Points(g, m); o.frustumCulled = false; o.renderOrder = add ? 7 : 6; scene.add(o); return { o, g, m, n, i: 0 };
  }
  const PN = mkParts(900, false), PA = mkParts(900, true);
  const put = (P, x, y, z, s, r, g, b, a) => { if (P.i >= P.n) return; const i = P.i++, pp = P.g.attributes.position.array, sz = P.g.attributes.aSize.array, cc = P.g.attributes.aCol.array; pp[i * 3] = x; pp[i * 3 + 1] = y; pp[i * 3 + 2] = z; sz[i] = s; cc[i * 4] = r; cc[i * 4 + 1] = g; cc[i * 4 + 2] = b; cc[i * 4 + 3] = a };
  const rgb = s => { const q = String(s).split(',').map(Number); return [q[0] / 255, q[1] / 255, q[2] / 255] };
  const done = P => { P.g.setDrawRange(0, P.i); for (const k of ['position', 'aSize', 'aCol']) P.g.attributes[k].needsUpdate = true; P.i = 0 };

  // Kamera: Ziel ist die Mitte des 2D-Ausschnitts (camX/camY folgen dem Spieler und bleiben am Kartenrand), Kippung um die Ost-West-Achse nach Sueden
  const tgt = new THREE.Vector3();
  function camSet() {
    tgt.set(X.camX + VW / 2, 0, X.camY + VH / 2);
    const D = (VH / 2) / Math.tan(C.fov / 2 * Math.PI / 180) * st.zoom, a = st.tilt * Math.PI / 180;
    cam.position.set(tgt.x, D * Math.cos(a), tgt.z + D * Math.sin(a)); cam.lookAt(tgt); cam.updateMatrixWorld(); cam.updateProjectionMatrix();
  }
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hit = new THREE.Vector3();
  function pick(sx, sy, h) {
    camSet(); ndc.set(sx / VW * 2 - 1, -(sy / VH * 2 - 1)); ray.setFromCamera(ndc, cam); plane.constant = -(h == null ? C.aimH : h);
    if (!ray.ray.intersectPlane(plane, hit)) return [X.camX + sx, X.camY + sy];
    return [hit.x, hit.z];
  }
  const v3 = new THREE.Vector3();
  function toScr(x, z, h) { camSet(); v3.set(x, h || 0, z).project(cam); return [(v3.x + 1) / 2 * VW, (1 - v3.y) / 2 * VH] }

  // Overlay: Bereich des Bodens, den die Kamera sieht (Ecken auf den Boden geworfen), dorthin zeichnet index.html die 2D-Weltmarken
  const ovR = { x: 0, y: 0, w: 1, h: 1, s: 1 };
  function ovBegin() {
    const cs = [[0, 0], [VW, 0], [0, VH], [VW, VH]].map(q => pick(q[0], q[1], 0)); let x0 = Math.min(...cs.map(c => c[0])), x1 = Math.max(...cs.map(c => c[0])), z0 = Math.min(...cs.map(c => c[1])), z1 = Math.max(...cs.map(c => c[1]));
    const wx0 = X.WX0 * T, wz0 = X.WY0 * T, wx1 = wx0 + X.W * T, wz1 = wz0 + X.H * T; x0 = Math.max(x0 - 16, wx0); z0 = Math.max(z0 - 16, wz0); x1 = Math.min(x1 + 16, wx1); z1 = Math.min(z1 + 16, wz1);
    const w = Math.max(64, x1 - x0), h = Math.max(64, z1 - z0), s = Math.min(1, C.ovMaxW / w, C.ovMaxH / h);
    Object.assign(ovR, { x: x0, y: z0, w, h, s });
    ovG.setTransform(1, 0, 0, 1, 0, 0); ovG.clearRect(0, 0, Math.ceil(st.ovW || C.ovMaxW), Math.ceil(st.ovH || C.ovMaxH)); st.ovW = w * s + 2; st.ovH = h * s + 2;
    ovG.setTransform(s, 0, 0, s, -s * x0, -s * z0);
    return { g: ovG, x: x0, y: z0, s };
  }
  function ovEnd() {
    ovTex.repeat.set(ovR.w * ovR.s / C.ovMaxW, ovR.h * ovR.s / C.ovMaxH); ovTex.offset.set(0, 1 - ovTex.repeat.y); ovTex.needsUpdate = true;
    ovMesh.scale.set(ovR.w, 1, ovR.h); ovMesh.position.set(ovR.x + ovR.w / 2, .9, ovR.y + ovR.h / 2);
  }

  // Sichtmaske aus dem Sichtpolygon (Weltkoordinaten), weich gezeichnet
  function visMask(poly) {
    const k = 1 / C.visDiv, ox = X.WX0 * T, oz = X.WY0 * T; visG.setTransform(1, 0, 0, 1, 0, 0); visG.filter = 'none';
    if (!poly) { visG.fillStyle = '#fff'; visG.fillRect(0, 0, visCv.width, visCv.height); visTex.needsUpdate = true; return }
    visG.fillStyle = '#000'; visG.fillRect(0, 0, visCv.width, visCv.height); visG.filter = 'blur(2px)'; visG.fillStyle = '#fff'; visG.beginPath();
    poly.forEach((q, i) => { const x = (q[0] - ox) * k, y = (q[1] - oz) * k; i ? visG.lineTo(x, y) : visG.moveTo(x, y) }); visG.closePath(); visG.fill(); visG.filter = 'none'; visTex.needsUpdate = true;
  }

  // Licht je Tageszeit und Nacht
  function lights(dt) {
    const L = X.LAY, th = L.theme || {}, night = X.nightOn(), P = TOD[th.tod] || TOD.mittag, Q = night ? TOD.nacht : P, sc = th.sun || { c: '255,238,196', dx: 76, dy: 151 };
    hemi.color.setHex(Q.sky); hemi.groundColor.setHex(Q.gnd); hemi.intensity = Q.hemi;
    sun.color.setRGB(...rgb(sc.c)).convertSRGBToLinear(); sun.intensity = Q.sun; if (!night && th.tod === 'mittag') sun.color.setRGB(1, .96, .88);
    const dl = Math.hypot(sc.dx, sc.dy) || 1, el = Q.elev * Math.PI / 180, R = 1600;
    sun.position.set(tgt.x - sc.dx / dl * R * Math.cos(el), R * Math.sin(el), tgt.z - sc.dy / dl * R * Math.cos(el)); sun.target.position.copy(tgt); sun.target.updateMatrixWorld();
    const S = 700 * st.zoom * (1 + st.tilt / 40); Object.assign(sun.shadow.camera, { left: -S, right: S, top: S, bottom: -S }); sun.shadow.camera.updateProjectionMatrix();
    sun.castShadow = st.shadows; ren.shadowMap.enabled = st.shadows;
    for (const k in pool) for (const l of pool[k]) l.intensity = 0;
    // Laternen, Raumlicht, Spielerlampe nur nachts
    if (lampGrp) { for (const o of lampGrp.children) if (o.userData.night) o.visible = night; winGlow.visible = night; M.lampHead.color.setHex(night ? 0xfff0c8 : 0x9a9a92) }
    M.glass.emissive.setHex(night ? 0x8a6a30 : 0x000000); M.glass.opacity = night ? .55 : .28;
    if (night) {
      const ls = lampSpots.slice().sort((a, b) => Math.hypot(a[0] - tgt.x, a[1] - tgt.z) - Math.hypot(b[0] - tgt.x, b[1] - tgt.z));
      pool.lamp.forEach((l, i) => { const s = ls[i]; if (!s) return; l.position.set(s[0], C.lamps.h - 4, s[1]); l.intensity = C.lamps.I });
      pool.room.forEach((l, i) => { const s = roomSpots[i]; if (!s) return; l.position.set(s[0], 58, s[1]); l.intensity = 1.5 });
      const p = X.p; if (p) { pool.me[0].position.set(p.x, 44, p.y); pool.me[0].intensity = .9; pool.me[0].distance = (X.CFG.night && X.CFG.night.lamp) || 300 }
    }
    // Muendungsfeuer
    let mi = 0; const p = X.p;
    for (const o of X.players) { if (mi >= pool.muz.length) break; if (o.flash > 0 && X.live(o) && (o === p || X.los(p.x, p.y, o.x, o.y))) { const l = pool.muz[mi++]; l.position.set(o.x + Math.cos(o.a) * 36, 26, o.y + Math.sin(o.a) * 36); l.intensity = 3.2 } }
    for (const e of X.en) { if (mi >= pool.muz.length) break; if (e.fl > 0 && X.los(p.x, p.y, e.x, e.y)) { const l = pool.muz[mi++]; l.position.set(e.x + Math.cos(e.a) * (e.muz + 4), 26, e.y + Math.sin(e.a) * (e.muz + 4)); l.intensity = 2.6 } }
    // Blaulicht: die naechsten Streifenwagen, zwei Lichter kreisen um das Dach
    const pc = X.pcs.filter(c => !c.civ && !c.dead).sort((a, b) => Math.hypot(a.x - tgt.x, a.y - tgt.z) - Math.hypot(b.x - tgt.x, b.y - tgt.z));
    for (let i = 0; i < pool.blue.length; i += 2) { const c = pc[i / 2]; if (!c) break; const w = X.time * 7 + c.id; for (let k = 0; k < 2; k++) { const l = pool.blue[i + k], an = w + k * Math.PI; l.position.set(c.x + Math.cos(an) * 34, 40, c.y + Math.sin(an) * 34); l.color.setHex(k ? 0x2a5aff : 0xff2a20); l.intensity = 2.4 * (.55 + .45 * Math.sin(w * 2 + k * Math.PI)) } }
    // Explosion und Glut: Schwerpunkt der Feuerteilchen
    let fx = 0, fz = 0, fw = 0, gx = 0, gz = 0, gw = 0;
    for (const q of X.pt) { const a = q.l / q.m; if (q.t === 'f') { fx += q.x * a; fz += q.y * a; fw += a } else if (q.t === 'w') { gx += q.x * a; gz += q.y * a; gw += a * 4 } else if (q.t === 'g' && q.r > 30) { gx += q.x * a; gz += q.y * a; gw += a } }
    if (fw > 0) { const l = pool.boom[0]; l.position.set(fx / fw, 40, fz / fw); l.intensity = Math.min(9, fw * .5); l.color.setHex(0xff9a40) }
    if (gw > 0) { const l = pool.boom[1]; l.position.set(gx / gw, 50, gz / gw); l.intensity = Math.min(12, gw * 1.5); l.color.setHex(0xfff0d0) }
  }

  // Teilchen und Rauch je Bild
  function parts() {
    const t = X.time;
    for (const q of X.pt) {
      const a = q.l / q.m;
      if (q.t === 'k') put(PN, q.x, 18 + (1 - a) * 46, q.y, 2 * (q.r + (1 - a) * 34), .2, .19, .18, Math.min(.6, a * .95));
      else if (q.t === 'f') { const c = a > .62 ? [1, .84, .49] : a > .3 ? [1, .55, .18] : [.75, .24, .08]; put(PA, q.x, 8 + (1 - a) * 34, q.y, 2 * q.r * (1 + (1 - a) * 1.1), c[0], c[1], c[2], Math.min(1, a * 1.1)) }
      else if (q.t === 'g') { const c = rgb(q.c); put(PA, q.x, 14, q.y, 2 * q.r, c[0], c[1], c[2], a * .9) }
      else if (q.t === 's') { const c = rgb(q.c); put(PA, q.x, 18 + a * 10, q.y, 4, c[0], c[1], c[2], a) }
      else if (q.t === 'd') { const c = rgb(q.c); put(PN, q.x, 4 + (1 - a) * 8, q.y, 2 * (2 + (1 - a) * 5), c[0], c[1], c[2], a * .45) }
      else if (q.t === 'c') { const c = rgb(q.c); put(PN, q.x, 2 + a * 14, q.y, 2 * q.s, c[0], c[1], c[2], Math.min(1, a * 1.8)) }
      else if (q.t === 'w') { const r = q.r * (1 - a); for (let i = 0; i < 16; i++) { const an = i / 16 * 6.283; put(PA, q.x + Math.cos(an) * r, 10, q.y + Math.sin(an) * r, 10 + a * 12, 1, .9, .74, a * .7) } }
    }
    // Rauchgranate: zehn Schwaden je Wolke, wie im 2D-Bild, dazu Hoehe
    const G = X.CFG.gadget;
    for (const c of X.smk) { const age = G.smokeT - c.t, al = Math.min(1, age / .6) * Math.min(1, c.t / 2); for (let i = 0; i < 10; i++) { const a = i * .63 + c.id + t * (.12 + i * .015) * (i % 2 ? 1 : -1), rr = c.r * (.2 + .55 * ((i * 37 + c.id * 13) % 10) / 10); put(PN, c.x + Math.cos(a) * rr, 14 + (i % 4) * 14 + Math.sin(t * .7 + i) * 4, c.y + Math.sin(a) * rr, c.r * (.9 + .2 * Math.sin(t * .7 + i)) * 1.6, .76, .79, .83, .55 * al) } }
    for (const c of X.gc || []) { const G2 = X.CFG.gren.gas, age = G2.t - c.t, al = Math.min(1, age / .8) * Math.min(1, c.t / 2.5); for (let i = 0; i < 8; i++) { const a = i * .79 + (c.id || 0) + t * .2 * (i % 2 ? 1 : -1), rr = (c.r || 90) * .5; put(PN, c.x + Math.cos(a) * rr, 12 + (i % 3) * 12, c.y + Math.sin(a) * rr, (c.r || 90) * 1.2, .62, .7, .3, .35 * al) } }
    // Muendungsfeuer als heller Punkt
    const p = X.p;
    for (const o of X.players) if (o.flash > 0 && X.live(o) && (o === p || X.los(p.x, p.y, o.x, o.y))) put(PA, o.x + Math.cos(o.a) * 36, 26, o.y + Math.sin(o.a) * 36, 46, 1, .8, .45, .95);
    for (const e of X.en) if (e.fl > 0 && X.los(p.x, p.y, e.x, e.y)) put(PA, e.x + Math.cos(e.a) * (e.muz + 4), 26, e.y + Math.sin(e.a) * (e.muz + 4), 32, 1, .67, .35, .85);
    if (X.nightOn()) for (const s of lampSpots) put(PA, s[0], C.lamps.h - 2, s[1], 60, 1, .85, .6, .5);
    done(PN); done(PA);
  }

  function ents() {
    const p = X.p, los = (x, y) => X.los(p.x, p.y, x, y);
    for (const o of X.players) { if (X.live(o) && (o === p || los(o.x, o.y))) setFig(fig(o, X.plRow(o)), o.x, o.y, o.a, X.plRow(o), X.frame(o.w, o.mvg), o.hurt > .3); else if (o.dead && o.dn > 0) setFig(fig(o), o.x, o.y, o.a + 3.1, X.plRow(o), 7, 0, 1) }
    for (const e of X.en) if (los(e.x, e.y)) setFig(fig(e, e.row), e.x, e.y, e.a, e.row, e.sur ? 8 : X.frame(e.w, e.mvg), e.h > 0);
    for (const q of X.npcs) { if (q.st === 'away' || !los(q.x, q.y)) continue; const ko = q.st === 'ko'; setFig(fig(q, q.row), q.x, q.y, q.a, q.row, ko ? 7 : q.st === 'cower' ? 8 : X.frame(q.w, q.mvg), 0, ko) }
    for (const c of X.corp) if (los(c.x, c.y)) setFig(fig(c, c.row), c.x, c.y, c.a, c.row, 7, 0, 1);
    for (const c of X.capd) if (los(c.x, c.y)) setFig(fig(c, 2), c.x, c.y, c.a, 2, 8, 0);
    sweep(figs);
    for (const c of X.pcs) setCar(car(c, c.cv || 1, 128, 64, !c.civ), c.x, c.y, c.a, c.dead);
    const L = X.LANE;
    if (X.vanArr || X.vanX !== L.van.from) { const m = L.van.mid(X.vanX), vd = L.van.dir, a = L.axis === 'y' ? (vd < 0 ? -Math.PI / 2 : Math.PI / 2) : (vd < 0 ? Math.PI : 0); setCar(car('van', 0, 128, 64, false), m[0], m[1], a, false) }
    const vh = X.vh; if (vh && vh.st !== 'wait' && vh.st !== 'gone') setCar(car('vh', 3, X.VHL || 160, 64, false), vh.x, vh.y, 0, false);
    const tk = X.tk; if (tk && tk.st !== 'wait' && tk.st !== 'gone') setCar(car('tk', 4, X.TKL || 192, 96, false), tk.x, tk.y, 0, false);
    sweep(cars);
    // Kugeln
    let n = 0;
    for (const b of X.bl) { if (n >= bulN) break; const k = b.sn || b.pr ? .05 : b.o ? .03 : .02, len = Math.max(4, Math.hypot(b.vx, b.vy) * k), a = Math.atan2(b.vy, b.vx); tmpQ.setFromAxisAngle(up, -a); tmpS.set(len, b.sn || b.pr ? 1.6 : 1, b.sn || b.pr ? 1.6 : 1); tmpP.set(b.x - Math.cos(a) * len / 2, 26, b.y - Math.sin(a) * len / 2); tmpM.compose(tmpP, tmpQ, tmpS); bulM.setMatrixAt(n, tmpM); tmpC.setRGB(...(b.pr ? [.67, .88, 1] : b.sn ? [1, .96, .92] : b.o ? [1, .88, .59] : [1, .59, .35])); bulM.setColorAt(n, tmpC); n++ }
    bulM.count = n; bulM.instanceMatrix.needsUpdate = true; if (bulM.instanceColor) bulM.instanceColor.needsUpdate = true;
    n = 0; for (const q of X.gr) { if (n >= grN) break; const h = q.st === 'fly' ? 10 + 30 * Math.sin(Math.min(1, (q.tm || 0) / Math.max(.1, (q.tm || 0) + (q.t || 0))) * Math.PI) : 4; tmpM.makeTranslation(q.x, h, q.y); grM.setMatrixAt(n++, tmpM) } grM.count = n; grM.instanceMatrix.needsUpdate = true;
  }

  let decT = 0, lastT = performance.now();
  function render(poly, g2d) {
    const t0 = performance.now(), dt = Math.min(.1, (t0 - lastT) / 1000); lastT = t0; st.frames++;
    st.tilt += (st.tiltT - st.tilt) * Math.min(1, dt * 10); if (Math.abs(st.tilt - st.tiltT) < .05) st.tilt = st.tiltT;
    st.zoom += (st.zoomT - st.zoom) * Math.min(1, dt * 10); if (Math.abs(st.zoom - st.zoomT) < .002) st.zoom = st.zoomT;
    if (X.LAY !== curLay || X.st !== curSt) buildLay();
    const k = keyOfGrid(); if (k !== gridKey) { if (gridKey) refreshGround(); gridKey = k; buildStatic() }
    decT -= dt; if (decT <= 0) { decT = C.decalT; refreshDecal() }
    camSet(); visMask(poly);
    const th = X.LAY.theme || {}; U.uDark.value = Math.min(.92, (th.dark || .58) + (X.blk > 0 ? .2 : 0));
    const p = X.p; U.uPl.value.set(p.x, 22, p.y); U.uCut.value = st.tilt > 4 ? 1 : 0;
    lights(dt); ents(); parts();
    const sc = ren.domElement.height / (2 * Math.tan(C.fov / 2 * Math.PI / 180)); PN.m.uniforms.uScale.value = sc; PA.m.uniforms.uScale.value = sc;
    ren.render(scene, cam);
    g2d.drawImage(ren.domElement, 0, 0, VW, VH);
    const ms = performance.now() - t0; st.ms = st.msN ? st.ms * .9 + ms * .1 : ms; st.msN++; st.last = { ms, calls: ren.info.render.calls, tris: ren.info.render.triangles };
    ui();
  }

  // Bedienung: Schieber am Bildrand, Tasten Bild hoch/runter (Kippung), Pos1 (senkrecht), Ende (Schatten), Plus/Minus und Mausrad (Zoom)
  const box = document.createElement('div');
  box.style.cssText = 'position:fixed;right:10px;top:50%;transform:translateY(-50%);z-index:50;display:flex;flex-direction:column;align-items:center;gap:6px;padding:8px 6px;background:rgba(14,16,20,.78);border:1px solid #2f3540;border-radius:8px;font:11px monospace;color:#cfd6de;user-select:none';
  box.innerHTML = '<div>3D</div><div id="v3tl">0°</div><input id="v3t" type="range" min="0" max="' + C.tiltMax + '" step="1" style="writing-mode:vertical-lr;direction:rtl;height:180px;width:22px;accent-color:#ffb000"><div>Zoom</div><input id="v3z" type="range" min="' + C.zoomMin + '" max="' + C.zoomMax + '" step=".05" style="writing-mode:vertical-lr;direction:rtl;height:90px;width:22px;accent-color:#7ee34a"><label style="display:flex;gap:3px;align-items:center"><input id="v3s" type="checkbox">Sch.</label><div id="v3ms" style="color:#8d95a1">ms</div>';
  for (const ev of ['mousedown', 'mouseup', 'click', 'pointerdown', 'keydown']) box.addEventListener(ev, e => e.stopPropagation());
  document.body.appendChild(box);
  const elT = box.querySelector('#v3t'), elTL = box.querySelector('#v3tl'), elZ = box.querySelector('#v3z'), elS = box.querySelector('#v3s'), elMs = box.querySelector('#v3ms');
  elT.addEventListener('input', () => { st.tiltT = +elT.value; save() }); elZ.addEventListener('input', () => { st.zoomT = +elZ.value; save() }); elS.addEventListener('change', () => { st.shadows = elS.checked; save() });
  let uiN = 0;
  function ui() { if (document.activeElement !== elT) elT.value = st.tiltT; if (document.activeElement !== elZ) elZ.value = st.zoomT; elS.checked = st.shadows; elTL.textContent = Math.round(st.tilt) + '°'; if (++uiN % 15 === 0) elMs.textContent = st.ms.toFixed(1) + ' ms' }
  const setTilt = v => { st.tiltT = Math.max(0, Math.min(C.tiltMax, v)); save() }, setZoom = v => { st.zoomT = Math.max(C.zoomMin, Math.min(C.zoomMax, v)); save() };
  window.addEventListener('keydown', e => {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
    if (e.code === 'PageUp') setTilt(st.tiltT + C.tiltStep); else if (e.code === 'PageDown') setTilt(st.tiltT - C.tiltStep); else if (e.code === 'Home') setTilt(0); else if (e.code === 'End') { st.shadows = !st.shadows; save() }
    else if (e.code === 'NumpadAdd' || e.key === '+') setZoom(st.zoomT / 1.1); else if (e.code === 'NumpadSubtract' || e.key === '-') setZoom(st.zoomT * 1.1); else return;
    e.preventDefault();
  }, true);
  window.addEventListener('wheel', e => { if (!e.target || e.target.tagName !== 'CANVAS') return; e.preventDefault(); setZoom(st.zoomT * (e.deltaY > 0 ? 1.08 : 1 / 1.08)) }, { passive: false });

  return {
    on: true, st, pick: (sx, sy) => pick(sx, sy), toScr, render, ovBegin, ovEnd,
    setTilt: v => { st.tilt = st.tiltT = Math.max(0, Math.min(C.tiltMax, v)) }, setZoom: v => { st.zoom = st.zoomT = v }, setShadows: v => { st.shadows = !!v },
    setQ: q => { st.q = q; ren.setSize(VW * q, VH * q, false) }, info: () => ({ tilt: st.tilt, zoom: st.zoom, shadows: st.shadows, ms: st.ms, last: st.last, tris: st.tris, gl: ren.getContext().getParameter(ren.getContext().VERSION), figs: figs.size, cars: cars.size, lamps: lampSpots.length }),
    show: v => { box.style.display = v ? 'flex' : 'none' },
  };
}
