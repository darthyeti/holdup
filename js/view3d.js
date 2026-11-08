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
   Stand 3D-5 (Ticket 154): Licht. Himmel (oben und unten) und Sonne je Tageszeit (V3CFG.light.tod, Richtung und Farbe aus LAY.theme.sun wie 2D), Schattenkarte der Sonne (eigener Tiefen-Durchgang
   aus Sicht der Sonne um den Blickpunkt, Regler X.shadow), Taschenlampe als Spot mit Lichtkreis bei Nacht (X.night), Punktlichter (Lampen der Karte, Blaulicht, Muendungsfeuer, hoechstens light.pl.max,
   die naechsten zum Blickpunkt), Toenung, Farbkorrektur und Vignette wie GFX.overlay in 2D (litC vor, gradeC nach der Farbraum-Umrechnung, vor der Abdunklung fogC).
   Stand 3D-6 (Ticket 155): Szenario-Besonderheiten (X.scen aus js/draw.js scen3d, Bauplaene SCEN und V3CFG.scen): Tresortuer, Laser, Zapfsaeulen, Notenbank (Bohrer, Loch, Presse), Gefaengnis (Gitter als Staebe,
   Tueren, Leser), Beute im Zustand, Panzerwagen, Fluchtzone, geparkte Autos, Sichtkegel der Wachen; vier Instanz-Gruppen und ein Faecher-Netz.
   Stand 3D-7 (Ticket 156): Effekte (X.fx aus js/draw.js fx3d, V3CFG.fx): Teilchen in zwei Puffern (additiv, normal), Kugeln als Leuchtspur, Muendungsfeuer, Granaten im Bogen, Gas- und Rauchwolken,
   Fallen, Notfallkoffer, Ablenker, Aufnahmen aus props.png, Explosionen als Punktlicht. Spuren am Boden (Blut, Einschuesse, Scherben, Russ) kommen seit 3D-1 ueber X.dcv, Kamerawackeln ueber camX/camY.
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
  // 3D-5 (Ticket 154) Licht. lit: false schaltet alles Licht ab (Aussehen wie 3D-4, nur Tests und Bilder). Lichtwerte linear (vor der Farbraum-Umrechnung), Deckel am Mittag ohne Schatten etwa 1 (wie bisher).
  // tod je Tageszeit (Namen wie maps.js TODS): sky und gnd Himmelslicht von oben und unten (Hemisphere), sun Faktor auf die Sonnenfarbe aus LAY.theme.sun.c, el Sonnenhoehe in Grad,
  // Richtung in der Ebene aus LAY.theme.sun (dx, dy wie die 2D-Lichtbahnen), lamps: Lampen der Karte an. Unbekannte Tageszeit nimmt mittag.
  // grade und vig wie GFX in index.html (Farbkorrektur und Vignette je Stufe, nur ab Stufe mittel), Toenung LAY.theme.tint immer.
  // shadow: Schattenkarte size je Grafikstufe (hoechstens 2048, Plan Abschnitt 5), Bereich area Weltpixel um den Blickpunkt, bias Tiefe, nrm Versatz entlang der Flaechennormale, soft Abstand der Proben in Texeln.
  // spot (Taschenlampe, nur Nacht): Hoehe h, Reichweite r, Kegel cos aussen und innen (c0, c1), Neigung nach unten dn, Farbe col mal i, dazu der Lichtkreis um den Spieler wie 2D (Radius CFG.night.lamp mal haloK, Staerke halo).
  // pl Punktlichter: max gleichzeitig (Shader-Feld), Lampen der Karte im Raster lampStep Kacheln im Gebaeude (Decke, h 60) und streetStep draussen (Laterne, h 80) auf begehbaren Kacheln,
  // Blaulicht (blue, red) ueber dem Dach, Muendungsfeuer (muz) vor der Waffe, Explosionen (boom, 3D-7: Radius aus dem Lichtschein bis r, Staerke mit dem Verloeschen).
  // Reihenfolge der Wahl: Muendungsfeuer, Explosionen, Blaulicht, Lampen, je nach Abstand zum Blickpunkt.
  light: {
    lit: true,
    tod: {
      mittag: { sky: [.62, .62, .6], gnd: [.42, .4, .38], sun: .52, el: 55 },
      morgen: { sky: [.5, .55, .66], gnd: [.34, .37, .44], sun: .62, el: 32 },
      abend: { sky: [.57, .48, .45], gnd: [.38, .32, .3], sun: .74, el: 24 },
      daemmerung: { sky: [.34, .37, .5], gnd: [.23, .25, .33], sun: .55, el: 20, lamps: 1 },
      nacht: { sky: [.08, .1, .17], gnd: [.055, .065, .11], sun: .36, el: 48, lamps: 1 },
    },
    nightK: .3, // Lage-Tag nacht auf einer Tageskarte: Himmel und Sonne zusaetzlich mal nightK (Tageszeit-Farben bleiben)
    grade: { mittag: [255, 244, 225, .04], morgen: [255, 225, 190, .06], abend: [255, 150, 70, .08], daemmerung: [90, 110, 200, .06], nacht: [40, 60, 140, .08] }, gradeHi: 1.4, vig: [0, .2, .32],
    shadow: { size: [1024, 1024, 2048], area: 1280, bias: .0006, nrm: 1.5, soft: 1, far: 4000 },
    spot: { h: 24, r: 470, c0: .83, c1: .94, dn: .22, col: [1, .94, .82], i: 2.8, haloK: 1, halo: .6 },
    pl: { max: 6, lampStep: 5, streetStep: 8, lamp: { h: 60, r: 190, col: [1, .84, .58], i: 2.2 }, street: { h: 80, r: 240, col: [1, .8, .5], i: 2.4 },
      boom: { h: 40, r: 320, col: [1, .66, .32], i: 4 }, blue: { h: 34, r: 200, col: [.25, .42, 1], i: 3.2 }, red: { h: 34, r: 200, col: [1, .22, .18], i: 3.2 }, muz: { d: 30, h: 24, r: 140, col: [1, .74, .4], i: 2.2 } },
  },
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
  // 3D-6 (Ticket 155) Szenario-Besonderheiten: scen3d in js/draw.js liefert je Bild die Teile (dieselbe Auswahl wie lyWorld), hier stehen die Bauplaene je Art (SCEN unten, Masse in Weltpixeln).
  // kinds: jede Art, die scen3d liefert, braucht einen Eintrag (Test 196, sonst zaehlt info().scen ?art und zeichnet nichts); g: Gruppe(n) der Teile (s Koerper beleuchtet, l Leuchten additiv, f Flaechen
  // durchsichtig, i Bildkloetze mit der 2D-Zeichnung als Deckel, c Sichtkegel). laserH Hoehe der Laser (Knie bis Huefte), cone Deckkraft der Sichtkegel wie 2D (ruhig, Alarm), grille Gitterstaebe je Kachel.
  // src: woraus jedes szenario-eigene Feld der Karte (MAP_FIELDS ausser Pflicht) und jede Art von Beute- und Aktionsobjekt (its, t oder t:k) in 3D entsteht. Werte: eine Art aus kinds oder
  // raster (Hoehentabelle cells), boden (Bodentextur aus st und so), figur und fahrzeug (figs3d), hud (Marken, Kameras), logik (unsichtbar, nur Spielregel). Neues Feld oder neue Art ohne Eintrag: Test 196 rot.
  scen: {
    laserH: 20, cone: [[1, .925, .667, .2], [1, .43, .35, .3]], grille: { n: 4, w: 3, rail: [[0, 3], [30, 33], [61, 64]] },
    kinds: { vault: { g: 's l' }, pad: { g: 's l' }, note: { g: 's' }, dark: { g: 'f' }, bundle: { g: 's' }, bag: { g: 's' }, good: { g: 's f' }, vit: { g: 'f' }, cone: { g: 'c' }, laser: { g: 's l f' },
      pump: { g: 's l' }, nbRig: { g: 's l f' }, nbHole: { g: 's' }, zone: { g: 'l' }, nbPress: { g: 's l' }, ring: { g: 'l' }, lock: { g: 's l' }, reader: { g: 's l' }, card: { g: 's' },
      frame: { g: 'l' }, exit: { g: 'l' }, grille: { g: 's' }, tk: { g: 's l f' }, parked: { g: 'i' } },
    src: {
      rob: 'logik', slots: 'logik', posts: 'logik', backDoors: 'raster', vault: 'vault', note: 'note', noteAt: 'note', mon: 'raster', sw: 'boden', tellers: 'figur', mgr: 'figur', tills: 'dark', atms: 'dark',
      guards: 'figur', cams: 'hud', vit: 'vit', goods: 'good', cage: 'raster', pumps: 'pump', lasers: 'laser', bn: 'logik', polAt: 'logik', wb: 'logik', stl: 'logik', gAll: 'logik', cone: 'cone',
      hall: 'logik', jewel: 'logik', gas: 'logik', nb: 'nbRig', prison: 'lock', museum: 'logik', casino: 'logik', road: 'exit', stash: 'raster', meet: 'logik', turned: 'logik', q: 'logik', tries: 'logik',
      truck: 'tk', parked: 'parked', decor: 'fahrzeug', decorReal: 'fahrzeug', spots: 'raster', lockCells: 'lock', wins: 'raster', snp: 'figur',
      'it:note': 'note', 'it:mon': 'raster', 'it:vault': 'vault', 'it:c4': 'vault', 'it:till': 'dark', 'it:atm': 'dark', 'it:bundle': 'bundle', 'it:cam': 'hud', 'it:lock': 'lock', 'it:sw': 'boden',
      'it:bar': 'raster', 'it:bard': 'raster', 'it:barr': 'raster', 'it:mat': 'raster', 'it:wbar': 'raster', 'it:deal': 'fahrzeug', 'it:ckey': 'figur', 'it:cargo': 'tk', 'it:c4t': 'tk', 'it:tbag': 'bag',
      'it:vit': 'vit', 'it:good:cig': 'good', 'it:good:shelf': 'good', 'it:good:art': 'good', 'it:good:statue': 'good', 'it:good:relic': 'good', 'it:good:chips': 'good', 'it:good:slot': 'good', 'it:good:vip': 'good',
      'it:cage': 'raster', 'it:nbd0': 'nbRig', 'it:nbd1': 'nbRig', 'it:nbp0': 'nbPress', 'it:nbp1': 'nbPress', 'it:nbp2': 'nbPress', 'it:nbb': 'bundle', 'it:nbdep': 'nbPress',
      'it:dlx': 'lock', 'it:lsw:wach': 'boden', 'it:lsw:kon': 'boden', 'it:pry': 'lock', 'it:crd': 'card', 'it:rdr': 'reader', 'it:prg': 'lock', 'it:pist': 'figur',
    },
  },
  // 3D-7 (Ticket 156) Effekte: fx3d in js/draw.js liefert je Bild Teilchen, Kugeln, Muendungsfeuer, Granaten, Wolken, Aufnahmen und Dinge am Boden (dieselbe Auswahl wie lyWorld), hier stehen Zuordnung und Masse.
  // evt: jeder Name aus fxApply (index.html) und woraus er in 3D entsteht, Kanaele aus chan (Test 197, neuer Name ohne Eintrag: rot). pt: jede Teilchenart (pt.push t) mit Puffer b (a additiv, n normal),
  // Form sh (0 weich rund, 1 hart, 2 Ring flach am Boden, 3 Strich), Hoehe h [Start, Zuwachs bis zum Verloeschen], Groesse k (Faktor auf die 2D-Groesse), arc (Bogen der Truemmer).
  // Kugeln in Waffenhoehe aimH als Strich (Kern und Schein), Muendungsfeuer als Schein in muzH, Granaten im Flug im Bogen grArc (Granatwerfer shell flacher), Wolken als weiche Flecken in Hoehe, Aufnahmen
  // als 2D-Bild (props.png) liegend in pkH, Licht der Explosionen ueber die Punktlichter (light.pl.boom). Budget Plan 5: Effekte unter 20 Draw Calls (heute 4: zwei Teilchenpuffer, Dinge, Aufnahmen).
  fx: {
    chan: ['pt', 'muz', 'dcv', 'cam', 'licht', 'hud', 'ton'],
    evt: { say: 'hud', ban: 'hud', rad: 'hud', fx: 'hud', s: 'ton', sh: 'muz pt dcv cam', es: 'muz', hw: 'pt dcv', hf: 'pt dcv cam', sp: 'pt', gl: 'pt dcv', gb: 'pt licht', sk: 'pt', bx: 'pt licht dcv cam' },
    pt: { s: { b: 'a', sh: 1, h: [4, 20], k: .6 }, g: { b: 'a', sh: 0, h: [18, 0], k: 1 }, f: { b: 'a', sh: 0, h: [8, 30], k: 1 }, w: { b: 'a', sh: 2, h: [.8, 0], k: 1 },
      d: { b: 'n', sh: 0, h: [4, 12], k: 1.3 }, c: { b: 'n', sh: 1, h: [2, 0], k: 1, arc: 36 }, k: { b: 'n', sh: 0, h: [20, 50], k: 1 } },
    bul: { glow: 2.6, glowA: .35 }, muzH: 24, grArc: 40, shellArc: 16, pkH: 3, pkS: 34, cloudH: [8, 14],
    gr: { flash: 0xe9e6d2, smoke: 0xa9b0bc, dec: 0xffc446, shell: 0xff8a3a, gas: 0x7a8a3c },
  },
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
// 3D-5 Licht: litC (linear, vor colorspace_fragment): Himmelslicht nach Flaechenrichtung, Sonne mit Schattenkarte (5 Proben), Taschenlampe (Spot und Lichtkreis), NPL Punktlichter ohne Schatten.
// Schalter im Shader (neu uebersetzt nur beim Umschalten, setDefs): L_SH Schattenkarte, L_SP Taschenlampe; die Schleife der Punktlichter endet bei uPlN (in Software kostete jede Abfrage zur Laufzeit mit).
// gradeC (sRGB, danach): Toenung und Farbkorrektur wie GFX.overlay, Vignette um die Bildmitte. uLit 0: unveraendert (wie 3D-4).
const NPL = V3CFG.light.pl.max;
const LITF = `#define NPL ${NPL}
uniform float uLit; uniform vec3 uSunD; uniform vec3 uSunC; uniform vec3 uSky; uniform vec3 uGnd;
uniform float uShOn; uniform sampler2D uShM; uniform mat4 uShMat; uniform vec3 uShP;
uniform vec4 uSpP; uniform vec4 uSpD; uniform vec2 uSpK; uniform vec3 uSpC; uniform vec4 uHalo;
uniform vec4 uPlP[NPL]; uniform vec3 uPlC[NPL]; uniform int uPlN;
uniform vec4 uTint; uniform vec4 uGrade; uniform vec4 uVig; uniform float uVigA;
#ifdef L_SH
float shadowAt(vec3 w, vec3 n) {
  vec4 s = uShMat * vec4(w + n * uShP.z, 1.0);
  if (s.x <= 0.0 || s.x >= 1.0 || s.y <= 0.0 || s.y >= 1.0 || s.z >= 1.0) return 1.0;
  float z = s.z - uShP.y, t = uShP.x, r = step(z, texture2D(uShM, s.xy).r);
  r += step(z, texture2D(uShM, s.xy + vec2(t, 0.0)).r) + step(z, texture2D(uShM, s.xy - vec2(t, 0.0)).r);
  r += step(z, texture2D(uShM, s.xy + vec2(0.0, t)).r) + step(z, texture2D(uShM, s.xy - vec2(0.0, t)).r);
  return r * 0.2;
}
#endif
vec3 litC(vec3 c, vec3 w, vec3 n) {
  if (uLit < 0.5) return c;
  vec3 L = mix(uGnd, uSky, n.y * 0.5 + 0.5);
  float sd = dot(n, uSunD);
#ifdef L_SH
  if (sd > 0.0) L += uSunC * (sd * shadowAt(w, n));
#else
  L += uSunC * max(sd, 0.0);
#endif
#ifdef L_SP
  {
    vec3 d = w - uSpP.xyz; float r = length(d);
    if (r < uSpP.w) { vec3 l = d / max(r, 0.001); float a = 1.0 - r / uSpP.w; L += uSpC * (smoothstep(uSpK.x, uSpK.y, dot(l, uSpD.xyz)) * a * a * (0.4 + 0.6 * max(dot(n, -l), 0.0))); }
    float h = 1.0 - length(w.xz - uHalo.xy) / uHalo.z; if (h > 0.0) L += uSpC * (uHalo.w * h * h);
  }
#endif
  for (int i = 0; i < NPL; i++) {
    if (i >= uPlN) break;
    vec4 p = uPlP[i];
    vec3 d = p.xyz - w; float r = length(d); if (r >= p.w) continue;
    float a = 1.0 - r / p.w; L += uPlC[i] * (a * a * (0.35 + 0.65 * max(dot(n, d / max(r, 0.001)), 0.0)));
  }
  return c * L;
}
vec3 gradeC(vec3 c) {
  if (uLit < 0.5) return c;
  c = mix(c, uTint.rgb, uTint.w); c = mix(c, uGrade.rgb, uGrade.w);
  float d = length(gl_FragCoord.xy - uVig.xy); return c * (1.0 - uVigA * clamp((d - uVig.z) / max(1.0, uVig.w - uVig.z), 0.0, 1.0));
}
`;
// Shader der statischen Welt: Kloetze als Instanzen eines Einheitswuerfels, Bild-Koordinate aus der Weltlage (Seiten um edge nach innen versetzt, sie zeigen den Randpixel der Kachel),
// Helligkeit je Flaechenrichtung aus V3CFG.shade. Farbraum wie MeshBasicMaterial (sRGB-Textur, Ausgabe ueber colorspace_fragment).
const VS = `uniform vec4 uOrg; uniform vec4 uSh; uniform float uFoot; uniform float uWallH; uniform float uEdge; uniform float uVisIn; varying vec2 vUv; varying float vSh; varying vec3 vW; varying vec2 vM; varying vec3 vN;
void main() {
  vec4 wp = modelMatrix * instanceMatrix * vec4(position, 1.0); vW = wp.xyz; vM = wp.xz - normal.xz * uVisIn; vN = normal;
  vec2 q = wp.xz - normal.xz * uEdge;
  vUv = vec2((q.x - uOrg.x) * uOrg.z, 1.0 - (q.y - uOrg.y) * uOrg.w);
  float s = normal.y > 0.5 ? uSh.x : normal.z > 0.5 ? uSh.y : normal.z < -0.5 ? uSh.z : uSh.w;
  if (normal.y < 0.5) s *= mix(uFoot, 1.0, clamp(wp.y / uWallH, 0.0, 1.0));
  vSh = s;
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;
// Schnitt (3D-3): uCut = Bildpunkt des Spielers (gl_FragCoord), Radius in Bildpunkten, Suedgrenze (Welt z des Spielers); uCutH Hoehe, ab der geschnitten wird, uCutS weicher Rand.
// Geschnitten wird nur, was zwischen Kamera und Spieler liegt (suedlich von ihm), Waende hinter ihm bleiben stehen.
const FS = VISF + LITF + `uniform sampler2D map; uniform vec3 uCol; uniform float uMap; uniform float uA; uniform vec4 uCut; uniform float uCutH; uniform float uCutS; varying vec2 vUv; varying float vSh; varying vec3 vW; varying vec2 vM; varying vec3 vN;
void main() {
  if (uCut.z > 0.0 && vW.y > uCutH + 0.01 && vW.z > uCut.w) { float d = length(gl_FragCoord.xy - uCut.xy) / uCut.z;
    if (d < uCutS || (d < 1.0 && fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715)))) > (d - uCutS) / (1.0 - uCutS))) discard; }
  vec3 c = uMap > 0.5 ? texture2D(map, vUv).rgb : uCol;
  gl_FragColor = vec4(litC(c * vSh, vW, vN), uA);
  #include <colorspace_fragment>
  gl_FragColor.rgb = fogC(gradeC(gl_FragColor.rgb), vM);
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
  // 3D-5 Licht: gemeinsame Uniforms aller beleuchteten Materialien (litC, gradeC), je Bild in updLight gesetzt. Schattenkarte: Tiefe aus Sicht der Sonne (shRT, eigener Durchgang).
  const LC = C.light, shRT = new THREE.WebGLRenderTarget(1, 1, { depthBuffer: true }), shCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, LC.shadow.far), shDepth = new THREE.MeshDepthMaterial();
  shRT.depthTexture = new THREE.DepthTexture(1, 1); shRT.texture.generateMipmaps = false; shCam.layers.set(1); shCam.up.set(0, 0, -1);
  const v4s = n => Array.from({ length: n }, () => new THREE.Vector4()), v3s = n => Array.from({ length: n }, () => new THREE.Vector3());
  const UL = { uLit: { value: 0 }, uSunD: { value: new THREE.Vector3(0, 1, 0) }, uSunC: { value: new THREE.Vector3() }, uSky: { value: new THREE.Vector3(1, 1, 1) }, uGnd: { value: new THREE.Vector3(1, 1, 1) },
    uShOn: { value: 0 }, uShM: { value: shRT.depthTexture }, uShMat: { value: new THREE.Matrix4() }, uShP: { value: new THREE.Vector3() },
    uSpP: { value: new THREE.Vector4() }, uSpD: { value: new THREE.Vector4() }, uSpK: { value: new THREE.Vector2() }, uSpC: { value: new THREE.Vector3() }, uHalo: { value: new THREE.Vector4() },
    uPlP: { value: v4s(NPL) }, uPlC: { value: v3s(NPL) }, uPlN: { value: 0 }, uTint: { value: new THREE.Vector4() }, uGrade: { value: new THREE.Vector4() }, uVig: { value: new THREE.Vector4() }, uVigA: { value: 0 } };
  Object.assign(UV, UL);
  // Boden in einem Durchgang: Bodenbild, darueber die Spuren nach ihrem Alpha gemischt (eine durchsichtige Ebene ueber dem ganzen Bild kostete in Software rund 45 ms je Bild)
  const groundMat = new THREE.ShaderMaterial({ uniforms: Object.assign({ map: { value: groundTex }, dmap: { value: decTex } }, UV),
    vertexShader: 'varying vec2 vUv; varying vec2 vM; varying vec3 vWp; void main() { vUv = uv; vWp = (modelMatrix * vec4(position, 1.0)).xyz; vM = vWp.xz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: VISF + LITF + 'uniform sampler2D map; uniform sampler2D dmap; varying vec2 vUv; varying vec2 vM; varying vec3 vWp; void main() { vec4 d = texture2D(dmap, vUv); gl_FragColor = vec4(litC(mix(texture2D(map, vUv).rgb, d.rgb, d.a), vWp, vec3(0.0, 1.0, 0.0)), 1.0);\n#include <colorspace_fragment>\ngl_FragColor.rgb = fogC(gradeC(gl_FragColor.rgb), vM);\n}' });
  let decT = 0;
  function refreshDecal() { decG.clearRect(0, 0, decCv.width, decCv.height); if (X.dcv) decG.drawImage(X.dcv, 0, 0, decCv.width, decCv.height); decTex.needsUpdate = true; st.decUp++; decT = performance.now() }

  // Materialien der statischen Welt (ein Draw Call je Material)
  const U0 = { uOrg: { value: new THREE.Vector4() }, uSh: { value: new THREE.Vector4(C.shade.top, C.shade.s, C.shade.n, C.shade.ew) }, uFoot: { value: C.shade.foot }, uWallH: { value: C.wallH }, uEdge: { value: C.edge }, uCut: { value: new THREE.Vector4() }, uCutH: { value: C.cutH }, uCutS: { value: C.cutSoft }, uVisIn: { value: C.visIn } }; Object.assign(U0, UV);
  const mkMat = (o) => new THREE.ShaderMaterial({ vertexShader: VS, fragmentShader: FS, transparent: !!o.tr, depthWrite: !o.tr,
    uniforms: Object.assign({}, U0, { map: { value: o.map || null }, uMap: { value: o.map ? 1 : 0 }, uCol: { value: new THREE.Color(o.col || 0xffffff) }, uA: { value: o.a == null ? 1 : o.a } }) });
  const mats = C.mats.map(c => c === null ? mkMat({ map: groundTex }) : mkMat({ col: c })), glassMat = mkMat({ col: C.glass, a: C.glassA, tr: 1 });
  const box = new THREE.BoxGeometry(1, 1, 1);

  let ground = null, curLay = null, curSt = null, gridKey = '', rev = -1, stat = [], cells = {}, grl = new Set();
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
    rev = X.gRev; gridKey = keyOfGrid(); buildStatic(); st.builds++; buildLamps();
  }
  // 3D-5 Lampen der Karte (nur Darstellung, aus dem Grundriss abgeleitet, fest je Karte): im Gebaeude (LAY.bld) im Raster lampStep an der Decke, draussen im Raster streetStep als Laterne,
  // jeweils nur auf begehbaren Kacheln ohne Koerper in der Hoehentabelle. Leuchten nur, wenn die Tageszeit lamps hat oder Nacht ist.
  let lamps = [];
  function buildLamps() {
    lamps = []; const B = X.LAY && X.LAY.bld, P = LC.pl, free = c => { const e = C.cells[c]; return !!e && !e.s.length && !e.dyn };
    for (let y = X.WY0; y < X.WY0 + X.H; y++) for (let x = X.WX0; x < X.WX0 + X.W; x++) {
      const inB = !!B && x >= B.x0 && x <= B.x1 && y >= B.y0 && y <= B.y1, c = X.cell(x, y);
      if (!free(c)) continue;
      if (inB) { if (c !== 'o' && (x - B.x0) % P.lampStep === 2 && (y - B.y0) % P.lampStep === 2) lamps.push({ k: 'lamp', x: x * T + T / 2, y: y * T + T / 2 }) }
      else if (c === 'o' && (x - X.WX0) % P.streetStep === 4 && (y - X.WY0) % P.streetStep === 4) lamps.push({ k: 'street', x: x * T + T / 2, y: y * T + T / 2 });
    }
  }
  // Rasterschluessel fuer den Abgleich: nur gelesen, wenn der Aenderungszaehler X.gRev weitergezaehlt hat. Fahrzeuge (v) zaehlen nicht (Boden darunter, Fahrzeuge zeichnet 3D-2), die offene Tresortuer schon.
  // 3D-4: zuletzt gesehene Zustaende wie 2D (prSeen, Gitter und Tueren im Gefaengnis): X.seen liefert je Bild die Kacheln, die anders gezeigt werden als das Raster ({'x,y': Zeichen} oder null)
  let ov = null, ovKey = '';
  const cellAt = (x, y) => { const o = ov && ov[x + ',' + y]; return o || X.cell(x, y) };
  // Laeuft eine Wand oder Tuerreihe an der Kachel (x,y) in Ost-West-Richtung? (Gitter und Scheiben stehen quer dazu)
  const wallAt = c => { const e = C.cells[c]; return !!e && !e.ins && !e.fence && e.s.some(q => q[0] === 0 && q[1] >= C.wallH) };
  const gridHz = (x, y) => { const c = cellAt(x, y); return cellAt(x - 1, y) === c || cellAt(x + 1, y) === c || wallAt(cellAt(x - 1, y)) || wallAt(cellAt(x + 1, y)) };
  function keyOfGrid() { let s = (X.vaultOpen ? '1' : '0') + scKey + '|'; const x0 = X.WX0, y0 = X.WY0; for (let y = y0; y < y0 + X.H; y++) for (let x = x0; x < x0 + X.W; x++) { const c = cellAt(x, y); s += c === 'v' ? 'o' : c } return s }

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
      // 3D-6 Gefaengnis: geschlossenes Gitter (scen3d grl) statt Block nur der untere Riegel (ein Kloetzchen wie die Tabelle, die Zaehlung bleibt), Staebe und uebrige Riegel zeichnet SCEN.grille
      if (c === 'L' && grl.has(x + ',' + y)) { const r = C.scen.grille.rail[0], w2 = C.scen.grille.w / 2, m = T / 2; if (gridHz(x, y)) add(lists[2], x * T, y * T + m - w2, x * T + T, y * T + m + w2, r[0], r[1]); else add(lists[2], x * T + m - w2, y * T, x * T + m + w2, y * T + T, r[0], r[1]); continue }
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
      im.instanceMatrix.needsUpdate = true; im.computeBoundingSphere(); if (mat !== glassMat) im.layers.enable(1); scene.add(im); stat.push(im);
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
  const SVS = `attribute vec4 iCell; attribute float iDim; uniform vec2 uGrid; varying vec2 vUv; varying vec3 vHAD; varying vec2 vM; varying vec3 vWp;
void main() { vUv = vec2((iCell.x + uv.x) / uGrid.x, 1.0 - (iCell.y + 1.0 - uv.y) / uGrid.y); vHAD = vec3(iCell.zw, iDim); vec4 wp = modelMatrix * instanceMatrix * vec4(position, 1.0); vM = wp.xz; vWp = wp.xyz; gl_Position = projectionMatrix * viewMatrix * wp; }`;
  const SFS = VISF + LITF + `uniform sampler2D map; uniform sampler2D mapF; varying vec2 vUv; varying vec3 vHAD; varying vec2 vM; varying vec3 vWp;
void main() { vec4 c = vHAD.x > 0.5 ? texture2D(mapF, vUv) : texture2D(map, vUv); if (c.a < 0.5) discard;
  if (vHAD.y < 0.99 && fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715)))) > vHAD.y) discard;
  gl_FragColor = vec4(litC(c.rgb * (1.0 - vHAD.z), vWp, vec3(0.0, 1.0, 0.0)), 1.0);
  #include <colorspace_fragment>
  gl_FragColor.rgb = fogC(gradeC(gl_FragColor.rgb), vM);
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
    vertexShader: 'varying vec3 vC; varying vec2 vM; varying vec3 vWp; varying vec3 vN; void main() { vC = color;\n#ifdef USE_INSTANCING_COLOR\nvC *= instanceColor;\n#endif\nvec4 wp = modelMatrix * instanceMatrix * vec4(position, 1.0); vM = wp.xz; vWp = wp.xyz; vN = normalize(mat3(modelMatrix * instanceMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * wp; }',
    fragmentShader: VISF + LITF + 'varying vec3 vC; varying vec2 vM; varying vec3 vWp; varying vec3 vN; void main() { gl_FragColor = vec4(litC(vC, vWp, normalize(vN)), 1.0);\n#include <colorspace_fragment>\ngl_FragColor.rgb = fogC(gradeC(gl_FragColor.rgb), vM);\n}' });
  function pool(name, geo, mat, attrs, colors, order, cast) {
    const P = { name, n: 0, cap: 0, im: null, a: {} };
    P.size = need => {
      P.n = need; if (need > P.cap) {
        let cap = 16; while (cap < need) cap *= 2;
        if (P.im) { scene.remove(P.im); P.im.geometry.dispose(); P.im.dispose() }
        const g = geo.clone(); for (const k in attrs) { P.a[k] = new THREE.InstancedBufferAttribute(new Float32Array(cap * attrs[k]), attrs[k]); P.a[k].setUsage(THREE.DynamicDrawUsage); g.setAttribute(k, P.a[k]) }
        const im = new THREE.InstancedMesh(g, mat, cap); im.instanceMatrix.setUsage(THREE.DynamicDrawUsage); im.frustumCulled = false; im.name = name; im.renderOrder = order; if (cast) im.layers.enable(1);
        if (colors) { im.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(cap * 3), 3); im.instanceColor.setUsage(THREE.DynamicDrawUsage) }
        scene.add(im); P.im = im; P.cap = cap; st.dynGrow++;
      }
      if (P.im) { P.im.count = need; P.im.visible = need > 0; P.im.instanceMatrix.needsUpdate = true; if (P.im.instanceColor) P.im.instanceColor.needsUpdate = true; for (const k in P.a) P.a[k].needsUpdate = true }
    };
    return P;
  }
  const pSh = pool('schatten', flatGeo, shMat, { iSA: 2 }, false, 1), pBody = pool('koerper', bodyGeo, colMat, {}, true, 2, 1), pSpr = pool('figuren', flatGeo, figMat, { iCell: 4, iDim: 1 }, false, 4),
    pBox = pool('kloetze', cubeGeo, colMat, {}, true, 2, 1), pTop = pool('daecher', flatGeo, topMat, { iCell: 4, iDim: 1 }, false, 4),
    pSil = pool('silhouetten', flatGeo, silMat, { iCell: 4, iCol: 3 }, false, 9), pools = [pSh, pBody, pSpr, pBox, pTop, pSil];
  const silCol = {}, silOf = c => silCol[c] || (silCol[c] = new THREE.Color(c));
  const qr = new THREE.Quaternion(), yAx = new THREE.Vector3(0, 1, 0), tc = new THREE.Color();
  // Instanz i einer Gruppe setzen: Lage (x,z) in Weltpixeln, Hoehe y, Drehung a (2D-Winkel, um die Hochachse), Groesse; Ortsversatz lx, lz im Figurenrahmen wie g.translate nach g.rotate
  function put(P, i, x, y, h, a, sx, sy, sz, lx, lz) { const c = Math.cos(a), s = Math.sin(a); lx = lx || 0; lz = lz || 0; pos.set(x + c * lx - s * lz, h, y + s * lx + c * lz); qr.setFromAxisAngle(yAx, -a); scl.set(sx, sy, sz); P.im.setMatrixAt(i, mtx.compose(pos, qr, scl)) }
  const kinds = (o, L, T) => { const k = T[L.k] ? L.k : '?' + L.k; o[k] = (o[k] || 0) + 1; return T[L.k] };
  let dynLast = { f: [], c: [] }, hide = null, dynL = [];
  function buildDyn() {
    const D = X.figs ? X.figs() : { f: [], c: [] }, F = [], Cs = [], fk = {}, ck = {};
    for (const o of D.f) { if (hide && hide(o)) continue; const e = kinds(fk, o, C.figs); if (e) F.push([o, e]) }
    for (const o of D.c) { const e = kinds(ck, o, C.cars); if (e) Cs.push([o, e]) }
    let nB = 0, nX = 0; const rs = !!UL.uShOn.value, nSh = rs ? F.filter(([o, e]) => e.lie || o.lie).length : F.length + Cs.length; dynL = [];
    for (const [o, e] of F) { if (!(e.lie || o.lie)) nB++; if (o.sh >= 0) nX++; if (o.rf) nX++; if (o.bag) nX++ }
    for (const [o, e] of Cs) nX += 1 + (e.bar && o.bl ? 2 : 0);
    const S = C.sil ? F.filter(([o, e]) => o.sc && !(e.lie || o.lie)) : [];
    pSh.size(nSh); pBody.size(nB); pSpr.size(F.length); pBox.size(nX); pTop.size(Cs.length); pSil.size(S.length);
    let iS = 0, iB = 0, iX = 0, lie = 0, hit = 0;
    const shA = pSh.a.iSA, cel = pSpr.a.iCell, dim = pSpr.a.iDim, box = (x, y, h, a, sx, sy, sz, lx, lz, col) => { put(pBox, iX, x, y, h, a, sx, sy, sz, lx, lz); pBox.im.setColorAt(iX, col); iX++ };
    F.forEach(([o, e], i) => {
      const lying = !!(e.lie || o.lie), cw = o.col === 8, hb = (e.h || C.bodyH) * (cw ? C.cowerK : 1), hs = lying ? C.lieH : hb + C.spriteH - C.bodyH;
      if (lying) { put(pSh, iS, o.x, o.y, .4, o.a, 52, 1, 28, 3, 4); shA.setXY(iS++, 0, .3 * o.al); lie++ }
      else { if (!rs) { put(pSh, iS, o.x + C.shOff[0], o.y + C.shOff[1], .4, 0, 22, 1, 19); shA.setXY(iS++, 0, C.shA) } if (o.fl) dynL.push({ k: 'muz', x: o.x + Math.cos(o.a) * LC.pl.muz.d, y: o.y + Math.sin(o.a) * LC.pl.muz.d }); put(pBody, iB, o.x, o.y, 0, o.a, e.r, hb, e.r); pBody.im.setColorAt(iB++, chCol[o.row] || chCol[0]) }
      put(pSpr, i, o.x, o.y, hs, o.a, 64, 1, 64); cel.setXYZW(i, o.col, o.row, o.hit, o.al); dim.setX(i, 0); if (o.hit) hit++; o._hs = hs;
      if (o.sh >= 0) box(o.x, o.y, 0, o.a, 3, hb + 4, 26, 15, 0, xcol.sh[o.sh > .5 ? 0 : o.sh > .25 ? 1 : 2]);
      if (o.rf) box(o.x, o.y, hs + .6, o.a, 26, 2.5, 2.5, 21, 3, xcol.rf[0]);
      if (o.bag) box(o.x, o.y, hb * .45, o.a, 14, 13, 16, -13, 0, xcol.bag[0]);
    });
    Cs.forEach(([o, e], j) => {
      const i = F.length + j, h = e.h, dimK = o.dim ? C.wreckDim : 0;
      if (!rs) { put(pSh, iS, o.x + C.shOff[0], o.y + C.shOff[1] + 1, .4, o.a, o.L * .97, 1, o.W * .88); shA.setXY(iS++, 1, .3) }
      if (e.bar && o.bl) dynL.push({ k: o.bl === 1 ? 'red' : 'blue', x: o.x, y: o.y, car: o.k });
      tc.copy(carCol[o.row] || carCol[0]).multiplyScalar(1 - dimK); box(o.x, o.y, 0, o.a, o.L * C.carK[0], h, o.W * C.carK[1], 0, 0, tc);
      if (e.bar && o.bl) { const r = o.bl === 1; box(o.x, o.y, h, o.a, 5, 4, 9, -4, -6, r ? xcol.red[0] : xcol.blue[0]); box(o.x, o.y, h, o.a, 5, 4, 9, -4, 6, r ? xcol.blue[0] : xcol.red[0]) }
      put(pTop, j, o.x, o.y, h + .5, o.a, o.L * o.fx, 1, o.W * o.fy); pTop.a.iCell.setXYZW(j, 0, o.row, 0, 1); pTop.a.iDim.setX(j, dimK); void i;
    });
    const sk = {}; S.forEach(([o], j) => { put(pSil, j, o.x, o.y, o._hs, o.a, 64, 1, 64); pSil.a.iCell.setXYZW(j, o.col, o.row, 0, 1); const c = silOf(o.sc); pSil.a.iCol.setXYZ(j, c.r, c.g, c.b); sk[o.k] = (sk[o.k] || 0) + 1 });
    st.sil = S.length; st.sk = sk;
    st.figs = F.length; st.cars = Cs.length; st.fk = fk; st.ck = ck; st.lie = lie; st.hit = hit; st.xparts = iX; st.dynCalls = pools.filter(P => P.im && P.im.visible).length;
    dynLast = { f: F.map(([o]) => [o.k, o.row, o.col, o.lie, o.hit, Math.round(o.x), Math.round(o.y), Math.round(o.a * 100) / 100, o.sh, o.rf, o.bag]), c: Cs.map(([o]) => [o.k, o.row, Math.round(o.x), Math.round(o.y), o.dim]) };
  }

  // 3D-6 (Ticket 155): Szenario-Besonderheiten. X.scen() (js/draw.js scen3d) liefert je Bild die Teile mit Zustand (dieselbe Auswahl wie lyWorld), SCEN baut daraus Kloetze in vier Gruppen:
  // s Koerper (beleuchtet, werfen Schatten), l Leuchten (additiv, unbeleuchtet: Laser, Lampen, Markierungen), f Flaechen (durchsichtig: Glas, dunkle Flecken genommener Beute), i Bildkloetze (Deckel zeigt die
  // 2D-Zeichnung wie die statische Welt: geparkte Autos am Transporter), dazu c die Sichtkegel der Wachen als ein Faecher-Netz. Hoechstens fuenf Draw Calls fuer alles.
  const glowMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: Object.assign({}, UV),
    vertexShader: 'attribute float iA; varying vec3 vC; varying float vA; varying vec2 vM; void main() { vC = vec3(1.0);\n#ifdef USE_INSTANCING_COLOR\nvC = instanceColor;\n#endif\nvA = iA; vec4 wp = modelMatrix * instanceMatrix * vec4(position, 1.0); vM = wp.xz; gl_Position = projectionMatrix * viewMatrix * wp; }',
    fragmentShader: 'varying vec3 vC; varying float vA; varying vec2 vM; void main() { gl_FragColor = vec4(vC * vA, 1.0);\n#include <colorspace_fragment>\n}' });
  const flatMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: Object.assign({}, UV),
    vertexShader: 'attribute float iA; varying vec3 vC; varying float vA; varying vec2 vM; void main() { vC = vec3(1.0);\n#ifdef USE_INSTANCING_COLOR\nvC = instanceColor;\n#endif\nvA = iA; vec4 wp = modelMatrix * instanceMatrix * vec4(position, 1.0); vM = wp.xz; gl_Position = projectionMatrix * viewMatrix * wp; }',
    fragmentShader: VISF + 'varying vec3 vC; varying float vA; varying vec2 vM; void main() { gl_FragColor = vec4(vC, vA);\n#include <colorspace_fragment>\ngl_FragColor.rgb = fogC(gl_FragColor.rgb, vM);\n}' });
  const coneMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide,
    vertexShader: 'attribute vec4 cc; varying vec4 vC; void main() { vC = cc; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'varying vec4 vC; void main() { if (vC.a <= 0.002) discard; gl_FragColor = vC;\n#include <colorspace_fragment>\n}' });
  const pSc = pool('szenario', cubeGeo, colMat, {}, true, 2, 1), pScL = pool('szenario-licht', cubeGeo, glowMat, { iA: 1 }, true, 6), pScF = pool('szenario-flaeche', cubeGeo, flatMat, { iA: 1 }, true, 5),
    pScI = pool('szenario-bild', box, mats[0], {}, false, -1, 1);
  pools.push(pSc, pScL, pScF, pScI);
  const CONE_MAX = 16 * 42; // Dreiecke: 16 Wachen zu je 41 Strahlen
  const coneGeo = new THREE.BufferGeometry(); coneGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(CONE_MAX * 9), 3).setUsage(THREE.DynamicDrawUsage)); coneGeo.setAttribute('cc', new THREE.BufferAttribute(new Float32Array(CONE_MAX * 12), 4).setUsage(THREE.DynamicDrawUsage));
  const coneMesh = new THREE.Mesh(coneGeo, coneMat); coneMesh.frustumCulled = false; coneMesh.renderOrder = 7; coneMesh.name = 'sichtkegel'; coneMesh.visible = false; scene.add(coneMesh);
  const hexC = {}, colOf = h => hexC[h] || (hexC[h] = new THREE.Color(h)), linC = h => { const c = colOf(h); return [c.r, c.g, c.b] };
  // Deckelhoehe der Kachel unter (x,y): oberstes Ende der am Boden stehenden Scheiben (Tresen 24, Wand 64), fuer Flecken und Dinge, die auf Moebeln liegen
  const topAt = (x, y) => { const e = C.cells[cellAt(Math.floor(x / T), Math.floor(y / T))]; if (!e || (e.open && X.vaultOpen)) return 0; let h = 0; for (const q of e.s) if (q[0] === 0) h = Math.max(h, q[1]); return h };
  // Sammler je Gruppe: Kasten mit Mitte (x,z), Unterkante y0, Groesse (sx Laenge entlang a, sy Hoehe, sz Breite), Drehung a, Farbe, Staerke oder Deckkraft
  let SB = null;
  const sb = (G, x, z, y0, sx, sy, sz, a, col, k) => SB[G].push([x, z, y0, sx, sy, sz, a || 0, col, k == null ? 1 : k]);
  // Linie als Kasten (Laser, Raender), d Dicke, y0 Unterkante, h Hoehe
  const line = (G, x0, y0, x1, y1, d, h0, h, col, k) => { const L = Math.hypot(x1 - x0, y1 - y0); if (L < .5) return; sb(G, (x0 + x1) / 2, (y0 + y1) / 2, h0, L, h, d, Math.atan2(y1 - y0, x1 - x0), col, k) };
  const frame = (G, x0, y0, x1, y1, d, h0, col, k) => { line(G, x0, y0, x1, y0, d, h0, .5, col, k); line(G, x0, y1, x1, y1, d, h0, .5, col, k); line(G, x0, y0, x0, y1, d, h0, .5, col, k); line(G, x1, y0, x1, y1, d, h0, .5, col, k) };
  // Rechteck rc [x, y, w, h] (Weltpixel) als Kasten, Einzug n
  const rect = (G, rc, n, y0, h, col, k) => sb(G, rc[0] + rc[2] / 2, rc[1] + rc[3] / 2, y0, Math.max(1, rc[2] - 2 * n), h, Math.max(1, rc[3] - 2 * n), 0, col, k);
  // Glashaube ueber einer Auslage: durchsichtiger Kasten und hellere Oberkante (Vitrinen, Reliquien)
  const hood = (r, t, h) => { rect('f', r, 3, t, h, C.glass, .22); frame('f', r[0] + 3, r[1] + 3, r[0] + r[2] - 3, r[1] + r[3] - 3, 1, t + h - .5, 0xe1ebfa, .55) };
  const NOTE = { bin: [[16, 16, 0, 18, 0x8a929c]], copy: [[24, 16, 0, 24, 0xc9ced4]], coffee: [[26, 12, 0, 24, 0x8c7a66], [10, 10, 24, 12, 0x2d3238]], file: [[24, 22, 0, 38, 0x6f7882]],
    pin: [[22, 4, 6, 30, 0xb98f5a]], coat: [[2, 2, 0, 46, 0x4a3b2d], [7, 5, 18, 22, 0x5b6d83, -4], [7, 5, 18, 20, 0x8a5a3c, 4]], locker: [[18, 26, 0, 56, 0x4f6a86]] };
  const SCEN = {
    // Tresortuer: zu der Block der Hoehentabelle (V) mit Handrad zum Gang, offen das aufgeschwenkte Blatt am Gang und warmes Licht im Tresorraum. Lage im Rahmen der Tuer (u quer, v laengs) wie die 2D-Zeichnung
    vault(o) {
      const X0 = o.x, Y0 = o.y, h = o.h, m = u => o.dir < 0 ? 2 * X0 + T - u : u, w = (u, v) => h ? [X0 + (v - Y0), Y0 + (u - X0)] : [u, v];
      const bx = (G, u0, u1, v0, v1, y0, hh, col, k) => { const a = w(m(u0), v0), b = w(m(u1), v1); sb(G, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, y0, Math.abs(b[0] - a[0]), hh, Math.abs(b[1] - a[1]), 0, col, k) };
      if (o.open) { bx('s', X0 - 2, X0 + 3, Y0 - 2, Y0 + 2 * T + 2, 0, 60, 0x5a626d); bx('f', X0 + T, X0 + 2 * T, Y0, Y0 + 2 * T, .3, .2, 0xffd264, .14) }
      else { const c = Y0 + T; bx('s', X0 - 3, X0, c - 3, c + 3, 27, 6, 0x2a2e34); bx('s', X0 - 2, X0, c - 11, c + 11, 39, 2, 0x2a2e34); bx('s', X0 - 2, X0, c - 11, c + 11, 19, 2, 0x2a2e34); bx('s', X0 - 2, X0, c - 11, c - 9, 19, 22, 0x2a2e34); bx('s', X0 - 2, X0, c + 9, c + 11, 19, 22, 0x2a2e34); bx('l', X0 - 1, X0, Y0 + 3, Y0 + 2 * T - 3, 62, 1, 0xffffff, .12) }
    },
    pad(o) { sb('s', o.x, o.y, 0, 8, 34, 8, 0, 0x2d3640); sb('l', o.x, o.y, 34, 6, .6, 6, 0, 0x7ee34a, .8) },
    note(o) {
      let top = o.n === 'desk' || o.n === 'mon' ? topAt(o.x, o.y) : 0; const P = NOTE[o.n] || (o.n === 'desk' || o.n === 'mon' || o.n === 'mgr' ? [] : NOTE.locker);
      for (const q of P) { sb('s', o.x + (q[5] || 0), o.y, q[2], q[0], q[3], q[1], 0, q[4]); top = Math.max(top, q[2] + q[3]) }
      if (o.paper) sb('s', o.x, o.y, top, 9, .6, 9, 0, 0xe8e4d8);
    },
    dark(o) { sb('f', o.x, o.y, topAt(o.x, o.y) + .3, 28, .2, 28, 0, 0x000000, .4) },
    bundle(o) { const t = topAt(o.x, o.y); sb('s', o.x, o.y, t, 13, 7, 8, 0, 0x3d7a46); sb('s', o.x, o.y, t + 7, 3, .5, 8.4, 0, 0xd9d2b0) },
    bag(o) { sb('s', o.x, o.y, topAt(o.x, o.y), 16, 10, 11, 0, 0x6a5536) },
    // Beute-Stuecke: Statue auf dem Sockel, Glashaube ueber Reliquien und VIP-Auslagen; genommen ein Fleck in der 2D-Farbe auf dem Deckel darunter
    good(o) {
      const r = o.rc, t = topAt(r[0] + r[2] / 2, r[1] + r[3] / 2);
      if (!o.done) { if (o.n === 'statue') sb('s', r[0] + r[2] / 2, r[1] + r[3] / 2, t, 16, 30, 16, 0, 0x8e8a92); else if (o.n === 'relic' || o.n === 'vip') hood(r, t, 14); return }
      const G = { art: [0, 0x2f2a24, 1], statue: [2, 0x121014, .85], chips: [0, 0x1c5a3a, 1], slot: [3, 0x080808, .88], relic: [3, 0x10080c, .82], vip: [3, 0x10080c, .82] }[o.n] || [2, 0x16110c, .72];
      rect('f', r, G[0], t + .3, .2, G[1], G[2]);
    },
    vit(o) { const r = o.rc, t = topAt(r[0] + r[2] / 2, r[1] + r[3] / 2); if (o.done) rect('f', r, 3, t + .3, .2, 0x10080c, .82); else hood(r, t, 12) },
    // Laser: Strahl in laserH (Kern und Schein, pulsierend aus der Spielzeit), Sender an beiden Enden; aus nur ein matter Strich und graue Sender
    laser(o) {
      const H = C.scen.laserH;
      for (const [x, y] of [[o.x0, o.y0], [o.x1, o.y1]]) { sb('s', x, y, 0, 6, H + 4, 6, 0, o.on ? 0xcc3333 : 0x555566); if (o.on) sb('l', x, y, H + 4, 4, .6, 4, 0, 0xff4040, 1) }
      if (o.on) { line('l', o.x0, o.y0, o.x1, o.y1, 1.6, H - .8, 1.6, 0xff6e78, o.f); line('l', o.x0, o.y0, o.x1, o.y1, 7, H - 3, 6, 0xff2832, o.f * .35) }
      else line('f', o.x0, o.y0, o.x1, o.y1, 1, H - .5, 1, 0x969aaa, .3);
    },
    // Zapfsaeule: heil der Koerper aus der Hoehentabelle (u) mit leuchtender Anzeige zur Strasse hin, ausgebrannt ein verkohlter Stumpf (das Raster wird o)
    pump(o) { if (o.ok) { sb('l', o.x, o.y + 12.6, 24, 14, 7, 1, 0, 0x7ee34a, .55); sb('s', o.x, o.y, 40, 20, 2, 20, 0, 0xc4402f) } else { sb('s', o.x, o.y, 0, 20, 6, 18, 0, 0x28221e); sb('s', o.x - 5, o.y + 3, 6, 6, 4, 5, .4, 0x1a1512) } },
    // Bohrer der Notenbank: Gestell aus der Hoehentabelle (N), Motor und Bohrstange (dreht, wird mit dem Fortschritt kuerzer), Lampe nach Zustand, Fortschritt, Krater im Boden
    nbRig(o) {
      const col = o.st === 1 ? 0x7ee34a : o.st === 2 ? 0xd4452f : 0xe0b020, p = o.p;
      sb('s', o.x, o.y, 36, 14, 10, 14, 0, 0x2c3036); sb('s', o.x, o.y, 0, 5, 36 + 8 * (1 - p), 5, o.r, 0x9aa2ac); sb('s', o.x, o.y, 0, 9, 5 * (1 - .45 * p), 9, o.r, 0x6b7280);
      sb('l', o.lx, o.ly, 36, 4, 1.5, 4, 0, col, o.on ? 1 : .35); if (p > 0) { sb('l', o.x - T + 10 + (2 * T - 20) * p / 2, o.y + T - 40, 36, (2 * T - 20) * p, .6, 3, 0, col, .8); sb('f', o.x, o.y + 3, .4, T * (.6 + 1.1 * p), .2, T * (.44 + .8 * p), 0, 0x0c0a09, .25 + .5 * p) }
    },
    // Loch der Notenbank (Ausstieg in den Tunnel): Rand, Schacht und Tiefe als flache Schichten, deckend
    nbHole(o) { sb('s', o.x, o.y, 0, 62, 1, 56, 0, 0x6b6152); sb('s', o.x, o.y, 0, 58, 1.2, 52, 0, 0x17130f); sb('s', o.x, o.y + 3, 0, 42, 1.4, 36, 0, 0x050403) },
    zone(o) { frame('l', o.x0, o.y0, o.x1, o.y1, 2, .4, 0x7ee34a, .5 + .4 * o.f) },
    // Notenpresse: Gehaeuse aus der Hoehentabelle (N), Papiervorrat (schrumpft), Lampe nach Zustand, Fortschritt des Drucks
    nbPress(o) {
      const X0 = o.x, Y0 = o.y, col = o.st === 1 ? 0x7ee34a : o.st === 0 ? 0xe0b020 : o.st === 6 ? 0xffb000 : 0xd4452f;
      if (o.paper > 0) sb('s', X0 + 16, Y0 + 32, 36, 16, 14 * o.paper, 28, 0, 0xf0ead8);
      sb('l', X0 + 56, Y0 + 52, 36, 5, 1.5, 5, 0, col, o.on ? 1 : .35); if (o.pr > 0) sb('l', X0 + 32 + 9 * o.pr, Y0 + 53, 36, 18 * o.pr, .6, 4, 0, 0x7ee34a, .8);
    },
    ring(o) { const n = 24; for (let i = 0; i < n; i++) { if (i % 2) continue; const a = i / n * 6.283, b = (i + 1) / n * 6.283; line('l', o.x + Math.cos(a) * o.r, o.y + Math.sin(a) * o.r, o.x + Math.cos(b) * o.r, o.y + Math.sin(b) * o.r, 2, .4, .5, 0x7ee34a, .5 + .4 * o.f) } },
    // Tueren mit Schloss (Hintertueren, Zellen, Servicetuer): zu eine rote Lampe beidseits am Block (L), offen das zur Seite geschobene Blatt und eine gruene Lampe
    lock(o) { if (!o.open) { sb('l', o.x, o.y - 16.4, 30, 6, 6, .8, 0, 0xd4452f, .9); sb('l', o.x, o.y + 16.4, 30, 6, 6, .8, 0, 0xd4452f, .9) } else { sb('s', o.x - 12.5, o.y, 0, 5, 50, T - 4, 0, 0x30343b); sb('l', o.x + 9.5, o.y, 46, 5, 2, 5, 0, 0x7ee34a, .9) } },
    reader(o) { sb('s', o.x, o.y, 18, 8, 20, 16, 0, 0x1d2026); sb('l', o.x, o.y + 8.4, 30, 4, 3, .8, 0, o.open ? 0x7ee34a : 0xd4452f, 1) },
    card(o) { sb('s', o.x, o.y, topAt(o.x, o.y), 9, 1, 6, 0, 0x7ee34a) },
    frame(o) { frame('l', o.x0, o.y0, o.x1, o.y1, 2, .4, o.c ? 0xffd27a : 0xffffff, o.f) },
    exit(o) { const L = Math.hypot(o.x1 - o.x0, o.y1 - o.y0), ux = (o.x1 - o.x0) / L, uy = (o.y1 - o.y0) / L; for (let s = 0; s < L; s += 14) { const e = Math.min(L, s + 8); line('l', o.x0 + ux * s, o.y0 + uy * s, o.x0 + ux * e, o.y0 + uy * e, 2, .4, .5, 0x7ee34a, .6) } },
    // Panzerwagen (Kasten und Dach zeichnet figs3d): offene Ladetuer hinten mit Licht, Warnblinker bei Panne, Rauch am platten Reifen
    tk(o) {
      const b = o.x - o.fx * o.L / 2, H = C.cars.tk.h;
      if (o.cargo) { sb('s', b - o.fx * 1, o.y, 0, 6, H - 4, o.W - 12, 0, 0x14171c); sb('f', b - o.fx * 9, o.y, .3, 12, .2, o.W - 16, 0, 0xffd264, .18) }
      if (o.blink) for (const [u, v] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) sb('l', o.x + u * (o.L / 2 - 8), o.y + v * (o.W / 2 - 3), H - 2, 6, 6, 6, 0, 0xffaa28, 1);
      if (o.smoke) sb('f', o.x - o.fx * (o.L / 2 - 40), o.y + o.W / 2 + 4, 2, 18, 14, 18, 0, 0x464646, .35);
    },
    cone() { /* Faecher-Netz in buildScen */ },
    // Gitter (Gefaengnis, zu): Staebe und Querriegel quer zur Wand, der untere Riegel steht in der statischen Welt
    grille(o) { const G = C.scen.grille, tx = Math.floor(o.x / T), ty = Math.floor(o.y / T), hz = gridHz(tx, ty), X0 = tx * T, Y0 = ty * T, m = T / 2;
      for (let i = 0; i < G.n; i++) { const u = 4 + i * 8 + 1.5; sb('s', hz ? X0 + u : X0 + m, hz ? Y0 + m : Y0 + u, 0, G.w, 64, G.w, 0, 0x8f97a2) }
      for (const r of G.rail.slice(1)) sb('s', X0 + m, Y0 + m, r[0], hz ? T : G.w, r[1] - r[0], hz ? G.w : T, 0, 0x30343b) },
    parked(o) { sb('i', o.x + 64, o.y + 32, 0, 4 * T - 4, C.cars.civ.h, 2 * T - 6, 0, 0xffffff) },
  };
  let scenLast = [], scKey = '';
  const scenPools = { s: pSc, l: pScL, f: pScF, i: pScI };
  function buildScen(S) {
    const P = S ? S.p : [], kk = {}; SB = { s: [], l: [], f: [], i: [] }; scenLast = [];
    const cones = [];
    for (const o of P) {
      const e = C.scen.kinds[o.k], b = SCEN[o.k], k = e && b ? o.k : '?' + o.k; kk[k] = (kk[k] || 0) + 1; if (!e || !b) continue;
      if (o.k === 'cone') cones.push(o); else b(o); scenLast.push(o.k);
    }
    for (const g in SB) {
      const L = SB[g], Pl = scenPools[g]; Pl.size(L.length);
      L.forEach((q, i) => { if (g === 'i') put(Pl, i, q[0], q[1], q[2] + q[4] / 2, q[6], q[3], q[4], q[5]); else { put(Pl, i, q[0], q[1], q[2], q[6], q[3], q[4], q[5]); Pl.im.setColorAt(i, colOf(q[7])); if (Pl.a.iA) Pl.a.iA.setX(i, q[8]) } });
    }
    // Sichtkegel: Faecher aus den Strahlen von coneRays (endet an blickdichten Kacheln wie 2D), Mitte deckend nach aussen durchsichtig (2D-Verlauf), knapp ueber dem Boden
    const pa = coneGeo.attributes.position.array, ca = coneGeo.attributes.cc.array; let n = 0;
    for (const o of cones) {
      const c = C.scen.cone[o.al ? 1 : 0], p = o.pts, r = Math.max(1, ...p.map(q => Math.hypot(q[0] - o.x, q[1] - o.y)));
      for (let i = 1; i < p.length - 1 && n < CONE_MAX; i++, n++) {
        const v = [[o.x, o.y], p[i], p[i + 1]];
        v.forEach((q, j) => { const f = n * 9 + j * 3, a = c[3] * Math.max(0, 1 - Math.hypot(q[0] - o.x, q[1] - o.y) / r); pa[f] = q[0]; pa[f + 1] = .5; pa[f + 2] = q[1]; const h = n * 12 + j * 4; ca[h] = c[0]; ca[h + 1] = c[1]; ca[h + 2] = c[2]; ca[h + 3] = a });
      }
    }
    coneGeo.setDrawRange(0, n * 3); coneGeo.attributes.position.needsUpdate = true; coneGeo.attributes.cc.needsUpdate = true; coneMesh.visible = n > 0;
    st.scen = kk; st.scenN = [SB.s.length, SB.l.length, SB.f.length, SB.i.length, n];
    // Pruefsumme fuer Tests: Rauminhalt und Farbsumme je Gruppe (aendert sich mit jedem Zustandswechsel)
    st.scenSum = ['s', 'l', 'f', 'i'].map(g => Math.round(SB[g].reduce((a, q) => a + q[3] * q[4] * q[5] + q[2] * 7 + (q[7] % 4099) * .01 + q[8] * 13, 0)));
  }

  // 3D-7 (Ticket 156): Effekte. X.fx() (js/draw.js fx3d) liefert je Bild Teilchen, Kugeln, Muendungsfeuer, Granaten, Wolken, Aufnahmen und Dinge am Boden, hier wird nur gezeichnet (nichts geschrieben).
  // Teilchen in zwei Puffern (ein InstancedMesh je Mischung: additiv fuer Feuer, Funken, Schein, Kugeln; normal fuer Staub, Rauch, Truemmer, Wolken), je Instanz Lage und Groesse (iA), Strichrichtung oder
  // Ringbreite und Form (iB), Farbe linear und Deckkraft (iC). Additiv wird die Deckkraft nach der Farbraum-Umrechnung angewandt (wie 2D 'lighter' im sRGB-Raum, sonst hebt die Umrechnung schwache Raender stark an). Der Shader stellt die Flaeche zur Kamera (Schein, Rauch), legt sie flach (Ringe) oder spannt sie entlang der Bahn (Kugeln, Feuerzunge).
  // Dinge (Granaten, Fallen, Notfallkoffer, Ablenker) als Kloetze, Aufnahmen als 2D-Bild aus props.png. Dazu Explosionen als Punktlicht (dynL boom). Abdunklung ausserhalb der Sicht wie 3D-4.
  const FXV = `attribute vec4 iA; attribute vec4 iB; attribute vec4 iC; varying vec4 vC; varying vec2 vQ; varying float vS; varying float vT; varying vec2 vM;
void main() { vec2 q = position.xz * 2.0; vQ = q; vC = iC; float fl = step(3.5, iB.w); vS = iB.w - 4.0 * fl; vT = iB.x; vec3 c = iA.xyz, w;
  if (fl > 0.5) w = c + vec3(q.x, 0.0, q.y) * iA.w;
  else if (dot(iB.xyz, iB.xyz) > 0.0) { vec3 s = normalize(cross(iB.xyz, normalize(cameraPosition - c))); w = c + iB.xyz * q.x + s * (iA.w * q.y); }
  else w = c + (vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]) * q.x + vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]) * q.y) * iA.w;
  vM = w.xz; gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0); }`;
  const FXA = `varying vec4 vC; varying vec2 vQ; varying float vS; varying float vT; varying vec2 vM;
float fxA() { float r = length(vQ), a;
  if (vS < 0.5) { a = max(0.0, 1.0 - r); a *= a; } else if (vS < 1.5) a = step(max(abs(vQ.x), abs(vQ.y)), 1.0);
  else if (vS < 2.5) a = 1.0 - smoothstep(0.0, vT, abs(r - 1.0 + vT)); else a = (1.0 - abs(vQ.y)) * (1.0 - smoothstep(0.7, 1.0, abs(vQ.x)));
  return a * vC.a; }
float visV(vec2 w) { if (uDark.w <= 0.0) return 1.0; return texture2D(uVis, vec2((w.x - uVisO.x) * uVisO.z, 1.0 - (w.y - uVisO.y) * uVisO.w)).r; }
`;
  const fxMat = add => new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: add ? THREE.AdditiveBlending : THREE.NormalBlending, uniforms: Object.assign({}, UV), vertexShader: FXV,
    fragmentShader: VISF + FXA + (add ? 'void main() { float a = fxA(); if (a <= 0.004) discard; gl_FragColor = vec4(vC.rgb, 1.0);\n#include <colorspace_fragment>\ngl_FragColor.rgb *= a * (1.0 - uDark.w * (1.0 - visV(vM)));\n}'
      : 'void main() { float a = fxA(); if (a <= 0.004) discard; gl_FragColor = vec4(vC.rgb, a);\n#include <colorspace_fragment>\ngl_FragColor.rgb = fogC(gl_FragColor.rgb, vM);\n}') });
  const fxAddMat = fxMat(1), fxNrmMat = fxMat(0), prTex = tex(X.pr), PR_C = Math.max(1, Math.round(X.pr.width / 64)), PR_R = Math.max(1, Math.round(X.pr.height / 64)), pkMat = sprMat(prTex, prTex, PR_C, PR_R);
  const FXA4 = { iA: 4, iB: 4, iC: 4 };
  const pFxN = pool('effekte', flatGeo, fxNrmMat, FXA4, false, 8), pFxA = pool('effekte-licht', flatGeo, fxAddMat, FXA4, false, 8.5), pThg = pool('dinge', cubeGeo, colMat, {}, true, 2, 1),
    pPk = pool('aufnahmen', flatGeo, pkMat, { iCell: 4, iDim: 1 }, false, 4);
  pools.push(pFxN, pFxA, pThg, pPk);
  const FC = C.fx, strC = {}, lc = s => { let c = strC[s]; if (!c) { const v = String(s).split(',').map(n => (+n || 0) / 255); const q = new THREE.Color().setRGB(v[0] || 0, v[1] || 0, v[2] || 0, THREE.SRGBColorSpace); c = strC[s] = [q.r, q.g, q.b] } return c };
  const hc = h => linC(h);
  const grT = new Map(); // Granaten im Flug: Flugzeit beim ersten Sehen (nur Darstellung, fuer den Bogen)
  let FA = [], FN = [], TH = [], fxSt = {}, fxLast = null;
  // Teilchen: Lage (x, z) in Weltpixeln, Hoehe h, halbe Groesse s, Strich (dx, dz) oder Ringbreite, Form sh, flach, Farbe (linear), Deckkraft
  const fp = (L, x, z, h, s, sh, col, a, dx, dz, fl, dy) => { if (!(a > .004) || !(s > 0)) return; L.push(x, h, z, s, dx || 0, dy || 0, dz || 0, sh + (fl ? 4 : 0), col[0], col[1], col[2], Math.min(1, a)) };
  const ring = (L, x, z, h, r, w, col, a) => { const s = r + w / 2; fp(L, x, z, h, s, 2, col, a, Math.min(1, w / s), 0, 1) };
  const thing = (x, z, y0, sx, sy, sz, a, col) => TH.push([x, z, y0, sx, sy, sz, a || 0, col]);
  function buildFx() {
    const D = X.fx ? X.fx() : null; FA = []; FN = []; TH = []; const n = {};
    if (!D) { for (const P of [pFxA, pFxN, pThg, pPk]) P.size(0); fxSt = { n }; return }
    const cnt = k => { n[k] = (n[k] || 0) + 1 };
    // Teilchen aus pt (Art je V3CFG.fx.pt, unbekannte zaehlen als ?art)
    for (const q of D.pt) {
      const e = FC.pt[q.t]; if (!e) { cnt('?' + q.t); continue } cnt(q.t);
      const a = Math.max(0, Math.min(1, q.l / q.m)), L = e.b === 'a' ? FA : FN, h = e.h[0] + e.h[1] * (1 - a) + (e.arc ? e.arc * 4 * a * (1 - a) : 0);
      if (q.t === 's') fp(L, q.x, q.y, h, e.k * 2, e.sh, lc(q.c), a);
      else if (q.t === 'g') fp(L, q.x, q.y, h, q.r * e.k, e.sh, lc(q.c), a * .9);
      else if (q.t === 'f') fp(L, q.x, q.y, h, q.r * (1 + (1 - a) * 1.1) * e.k, e.sh, lc(a > .62 ? '255,214,125' : a > .3 ? '255,140,45' : '190,60,20'), Math.min(1, a * 1.1));
      else if (q.t === 'w') ring(L, q.x, q.y, h, q.r * (1 - a), 1.5 + a * 4, lc('255,232,190'), a * .75);
      else if (q.t === 'd') fp(L, q.x, q.y, h, (2 + (1 - a) * 5) * e.k, e.sh, lc(q.c), a * .45);
      else if (q.t === 'c') fp(L, q.x, q.y, h, q.s * e.k, e.sh, lc(q.c), Math.min(1, a * 1.8));
      else if (q.t === 'k') fp(L, q.x, q.y, h, (q.r + (1 - a) * 34) * e.k, e.sh, lc('50,46,44'), Math.min(.6, a * .95));
      if (q.t === 'g' && (q.lt || q.r >= 200)) dynL.push({ k: 'boom', x: q.x, y: q.y, r: Math.min(LC.pl.boom.r, q.r), i: a });
    }
    // Kugeln als Strich in Waffenhoehe (Richtung gegen die Flugbahn wie 2D), Kern hart und Schein weich
    for (const b of D.bl) {
      const k = b.sn || b.pr ? .05 : b.o ? .03 : .02, col = lc(b.pr ? '170,225,255' : b.sn ? '255,245,235' : b.o ? '255,225,150' : '255,150,90'), al = b.pr || b.sn ? .95 : b.o ? .9 : .8, lw = b.sn || b.pr ? 2.4 : b.o ? 2 : 1.5, hx = -b.vx * k / 2, hz = -b.vy * k / 2;
      fp(FA, b.x + hx, b.y + hz, C.aimH, lw * .6, 3, col, al, hx, hz); fp(FA, b.x + hx, b.y + hz, C.aimH, lw * FC.bul.glow, 3, col, al * FC.bul.glowA, hx, hz); cnt('bl');
    }
    // Muendungsfeuer: Schein vor der Waffe, beim Spieler dazu die Feuerzunge (Form nach fv wie 2D)
    for (const m of D.muz) {
      fp(FA, m.x, m.y, FC.muzH, m.r * .8, 0, lc(m.pl ? '255,200,110' : '255,170,90'), m.pl ? .9 : .8); cnt('muz');
      if (m.pl) { const L = [9, 12, 7][m.fv] || 9, ca = Math.cos(m.a), sa = Math.sin(m.a); fp(FA, m.x + ca * L, m.y + sa * L, FC.muzH, m.fv === 2 ? 4 : 2.6, 3, lc('255,235,170'), .9, ca * L, sa * L) }
    }
    // Granaten: Dose im Flug im Bogen (Flugzeit beim ersten Sehen), liegend am Boden mit Zuendlicht
    const seenG = new Set(), grL = [];
    for (const q of D.gr) {
      seenG.add(q.id); let h = 0; if (q.st === 'fly') { if (!grT.has(q.id) || grT.get(q.id) < q.t) grT.set(q.id, Math.max(q.t, .01)); const f = Math.max(0, Math.min(1, 1 - q.t / grT.get(q.id))); h = (q.k === 'shell' ? FC.shellArc : FC.grArc) * 4 * f * (1 - f) }
      thing(q.x, q.y, h, 7, 6, 7, 0, FC.gr[q.k] || FC.gr.gas); if (q.bk) fp(FA, q.x, q.y, h + 7, 3, 0, hc(0xff4a3a), 1); cnt('gr'); grL.push([q.id, q.k, q.st, Math.round(h * 10) / 10]);
    }
    for (const id of grT.keys()) if (!seenG.has(id)) grT.delete(id);
    // Wolken: Gas (gruen, Rand als Ring wie die Wirkung) und Rauch (grau, als Wand in die Hoehe), weiche Flecken wie die 2D-Flecken
    for (const c of D.gc) {
      for (let i = 0; i < 9; i++) { const a = i * .7 + c.id + D.t * (.15 + i * .02) * (i % 2 ? 1 : -1), rr = c.r * (.25 + .5 * ((i * 37 + c.id * 13) % 10) / 10); fp(FN, c.x + Math.cos(a) * rr, c.y + Math.sin(a) * rr, FC.cloudH[0] + (i % 3) * FC.cloudH[1], c.r * (.42 + .12 * Math.sin(D.t * .8 + i)) * 1.3, 0, lc('150,176,52'), .5 * c.al) }
      ring(FA, c.x, c.y, .7, c.r, 2, lc('205,225,80'), .8 * c.al); cnt('gc');
    }
    for (const c of D.smk) {
      for (let i = 0; i < 10; i++) { const a = i * .63 + c.id + D.t * (.12 + i * .015) * (i % 2 ? 1 : -1), rr = c.r * (.2 + .55 * ((i * 37 + c.id * 13) % 10) / 10); fp(FN, c.x + Math.cos(a) * rr, c.y + Math.sin(a) * rr, FC.cloudH[0] + (i % 4) * FC.cloudH[1], c.r * (.45 + .1 * Math.sin(D.t * .7 + i)) * 1.3, 0, lc('196,202,212'), .7 * c.al) }
      cnt('smk');
    }
    // Dinge am Boden: Fallen (Wirkradius als Ring, Zuendlicht), Notfallkoffer (Kreuz, Puls), Ablenker (Puls, Blinklicht), brennende Wracks (Schein)
    for (const q of D.tr) {
      ring(FA, q.x, q.y, .6, q.r, 1.5, lc(q.armed ? '255,90,70' : '255,210,90'), q.armed ? .28 : .22);
      if (q.k === 'mine') thing(q.x, q.y, 0, 14, 3, 14, 0, 0x2a2d33); else { thing(q.x, q.y, 0, 18, 8, 8, 0, 0x3a4034); thing(q.x, q.y - 3, 8, 14, 2, 2, 0, 0x2a2d33) }
      if (q.bl) fp(FA, q.x, q.y, q.k === 'mine' ? 4 : 10, 3, 0, hc(q.armed ? 0xff4a3a : 0xffc446), 1); cnt('tr');
    }
    for (const q of D.aid) {
      ring(FA, q.x, q.y, .6, q.r, 1.5, lc('110,235,130'), .3 * q.al); ring(FA, q.x, q.y, .7, 10 + q.ph * (q.r - 10), 2, lc('110,235,130'), .45 * (1 - q.ph) * q.al);
      thing(q.x, q.y, 0, 16, 8, 12, 0, 0xe9efe9); thing(q.x, q.y, 8, 3, .6, 9, 0, 0x2fbf52); thing(q.x, q.y, 8, 9, .6, 3, 0, 0x2fbf52); cnt('aid');
    }
    for (const q of D.dcy) { ring(FA, q.x, q.y, .7, 8 + q.ph * 40, 2, lc('255,196,70'), .8 * (1 - q.ph)); thing(q.x, q.y, 0, 10, 6, 8, 0, 0x2a2d33); if (q.bl) fp(FA, q.x, q.y, 7, 3, 0, hc(0xffc446), 1); cnt('dcy') }
    for (const q of D.burn) { fp(FA, q.x, q.y, 20, 64, 0, lc('255,120,40'), q.f); cnt('burn') }
    // Puffer belegen
    for (const [P, L] of [[pFxA, FA], [pFxN, FN]]) {
      const m = L.length / 12; P.size(m); if (!m) continue; const A = P.a.iA.array, B = P.a.iB.array, Cc = P.a.iC.array;
      for (let i = 0; i < m; i++) { const k = i * 12, j = i * 4; A[j] = L[k]; A[j + 1] = L[k + 1]; A[j + 2] = L[k + 2]; A[j + 3] = L[k + 3]; B[j] = L[k + 4]; B[j + 1] = L[k + 5]; B[j + 2] = L[k + 6]; B[j + 3] = L[k + 7]; Cc[j] = L[k + 8]; Cc[j + 1] = L[k + 9]; Cc[j + 2] = L[k + 10]; Cc[j + 3] = L[k + 11] }
    }
    pThg.size(TH.length); TH.forEach((q, i) => { put(pThg, i, q[0], q[1], q[2], q[6], q[3], q[4], q[5]); pThg.im.setColorAt(i, colOf(q[7])) });
    // Aufnahmen (Munition, Verbandszeug): 2D-Bild aus props.png liegend, wippt wie in 2D
    pPk.size(D.pk.length); D.pk.forEach((k, i) => { put(pPk, i, k.x, k.y, FC.pkH + 1.5 + k.b, 0, FC.pkS, 1, FC.pkS); pPk.a.iCell.setXYZW(i, k.k, 0, 0, 1); pPk.a.iDim.setX(i, 0) }); n.pk = D.pk.length;
    fxSt = { n, add: FA.length / 12, nrm: FN.length / 12, th: TH.length, pk: D.pk.length, calls: [pFxA, pFxN, pThg, pPk].filter(P => P.im && P.im.visible).length };
    fxLast = { pk: D.pk.map(k => [Math.round(k.x), Math.round(k.y), k.k]), gr: grL };
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

  // 3D-5 Licht je Bild. lightA (vor buildDyn): Tageszeit, Himmel, Sonne, Toenung und ob die Schattenkarte gilt. lightB (nach camSet): Schatten-Durchgang um den Blickpunkt, Taschenlampe, Punktlichter.
  // Alles nur aus dem Zustand gelesen (LAY.theme, X.night, X.me, Figurenliste), nichts wird geschrieben. st.lt haelt die Werte des letzten Bildes fuer info().light.
  const rgb = s => String(s || '255,255,255').split(',').map(v => (+v || 0) / 255), lin = v => Math.pow(v, 2.2);
  const sh = { on: 0, size: 0, ups: 0 }; let lt = null;
  function lightA() {
    const th = (X.LAY && X.LAY.theme) || {}, tn = LC.tod[th.tod] ? th.tod : 'mittag', D = LC.tod[tn], night = !!X.night, lit = !!LC.lit, nk = night && tn !== 'nacht' ? LC.nightK : 1;
    UL.uLit.value = lit ? 1 : 0;
    const sun = th.sun || {}, sc = rgb(sun.c).map(lin), el = D.el * Math.PI / 180, dx = +sun.dx || 0, dy = +sun.dy || 1, dl = Math.hypot(dx, dy) || 1;
    // Richtung zur Sonne: gegen die Richtung der 2D-Lichtbahnen (dx, dy), Hoehe el
    UL.uSunD.value.set(-dx / dl * Math.cos(el), Math.sin(el), -dy / dl * Math.cos(el)).normalize();
    UL.uSunC.value.set(sc[0], sc[1], sc[2]).multiplyScalar(D.sun * nk); UL.uSky.value.fromArray(D.sky).multiplyScalar(nk); UL.uGnd.value.fromArray(D.gnd).multiplyScalar(nk);
    const tt = th.tint, gr = LC.grade[tn] || LC.grade.mittag, lv = X.gfx | 0;
    if (tt) UL.uTint.value.set(tt[0] / 255, tt[1] / 255, tt[2] / 255, tt[3]); else UL.uTint.value.set(0, 0, 0, 0);
    UL.uGrade.value.set(gr[0] / 255, gr[1] / 255, gr[2] / 255, lv > 0 ? gr[3] * (lv === 2 ? LC.gradeHi : 1) : 0);
    const q = st.q || 1; UL.uVig.value.set(VW / 2 * q, VH / 2 * q, VH * .45 * q, VW * .62 * q); UL.uVigA.value = LC.vig[lv] || 0;
    sh.on = lit && X.shadow ? 1 : 0; UL.uShOn.value = sh.on;
    lt = { tod: tn, night, lit, sun: UL.uSunC.value.toArray(), dir: UL.uSunD.value.toArray(), sky: UL.uSky.value.toArray(), gnd: UL.uGnd.value.toArray(), tint: UL.uTint.value.toArray(), grade: UL.uGrade.value.w, lamps: !!(D.lamps || night) };
  }
  // Shader-Schalter aller beleuchteten Materialien (litMats, nach deren Bau gefuellt): nur bei Aenderung neu uebersetzen (st.relink zaehlt)
  let defKey = '';
  const litMats = mats.concat([glassMat, groundMat, figMat, topMat, colMat]);
  function setDefs(shOn, spOn) {
    const k = (shOn ? 'S' : '') + (spOn ? 'P' : ''); if (k === defKey) return; defKey = k; st.relink = (st.relink || 0) + 1;
    for (const m of litMats) { const d = m.defines || (m.defines = {}); if (shOn) d.L_SH = ''; else delete d.L_SH; if (spOn) d.L_SP = ''; else delete d.L_SP; m.needsUpdate = true }
  }
  const shV = new THREE.Vector3(), shB = new THREE.Matrix4().set(.5, 0, 0, .5, 0, .5, 0, .5, 0, 0, .5, .5, 0, 0, 0, 1);
  function shadowPass() {
    const S = LC.shadow, size = S.size[X.gfx | 0] || S.size[1], a = S.area / 2;
    if (sh.size !== size) { shRT.setSize(size, size); sh.size = size }
    const tx = size / S.area, cx = Math.round(tgt.x * tx) / tx, cz = Math.round(tgt.z * tx) / tx; // am Texelraster, sonst flimmern die Kanten beim Laufen
    shV.copy(UL.uSunD.value).multiplyScalar(S.far / 2); shCam.position.set(cx + shV.x, shV.y, cz + shV.z); shCam.lookAt(cx, 0, cz);
    shCam.left = -a; shCam.right = a; shCam.top = a; shCam.bottom = -a; shCam.updateProjectionMatrix(); shCam.updateMatrixWorld();
    UL.uShMat.value.copy(shB).multiply(shCam.projectionMatrix).multiply(shCam.matrixWorldInverse); UL.uShP.value.set(S.soft / size, S.bias, S.nrm);
    const ov0 = scene.overrideMaterial; scene.overrideMaterial = shDepth;
    ren.setRenderTarget(shRT); ren.clear(); ren.render(scene, shCam); ren.setRenderTarget(null);
    scene.overrideMaterial = ov0; sh.ups++; sh.calls = ren.info.render.calls;
  }
  function lightB() {
    if (sh.on) shadowPass();
    const P = X.me, sp = LC.spot, on = lt.lit && lt.night && !!P;
    if (on) {
      const ca = Math.cos(P.a), sa = Math.sin(P.a), N = X.nightCfg || {};
      UL.uSpP.value.set(P.x, sp.h, P.y, sp.r); shV.set(ca, -sp.dn, sa).normalize(); UL.uSpD.value.set(shV.x, shV.y, shV.z, 1); UL.uSpK.value.set(sp.c0, sp.c1);
      UL.uSpC.value.fromArray(sp.col).multiplyScalar(sp.i); UL.uHalo.value.set(P.x, P.y, Math.max(1, (+N.lamp || 300) * sp.haloK), sp.halo / sp.i);
    } else UL.uSpD.value.set(0, 0, 0, 0);
    setDefs(!!sh.on, on);
    lt.spot = on ? { x: P.x, y: P.y, a: P.a, dir: UL.uSpD.value.toArray().slice(0, 3), r: sp.r, halo: UL.uHalo.value.z } : null;
    // Punktlichter: Muendungsfeuer zuerst, dann Explosionen (3D-7), dann Blaulicht, dann Lampen (wenn an), je nach Abstand zum Blickpunkt, hoechstens max
    const L = LC.pl, d2 = o => (o.x - tgt.x) * (o.x - tgt.x) + (o.y - tgt.z) * (o.y - tgt.z), by = (A) => A.slice().sort((p, q) => d2(p) - d2(q));
    const cand = by(dynL.filter(o => o.k === 'muz')).concat(by(dynL.filter(o => o.k === 'boom')), by(dynL.filter(o => o.k !== 'muz' && o.k !== 'boom')), lt.lamps ? by(lamps) : []), out = cand.slice(0, lt.lit ? L.max : 0);
    UL.uPlN.value = Math.min(NPL, out.length);
    for (let i = 0; i < NPL; i++) {
      const o = out[i], pp = UL.uPlP.value[i], pc = UL.uPlC.value[i];
      if (!o) { pp.set(0, 0, 0, 0); continue }
      const e = L[o.k]; pp.set(o.x, e.h, o.y, o.r || e.r); pc.fromArray(e.col).multiplyScalar(e.i * (o.i == null ? 1 : o.i));
    }
    lt.pl = out.map(o => [o.k, Math.round(o.x), Math.round(o.y)]); lt.cand = cand.length; lt.nBlue = dynL.filter(o => o.k === 'red' || o.k === 'blue').length; lt.nLamps = lamps.length;
    lt.shadow = { on: sh.on, size: sh.on ? sh.size : 0, ups: sh.ups, calls: sh.on ? sh.calls : 0 };
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
      const SC = X.scen ? X.scen() : null; { const k = SC ? SC.key : ''; if (k !== scKey) { scKey = k; grl = new Set(SC ? SC.grl : []); rev = -1 } }
      if (X.LAY !== curLay || X.st !== curSt) buildLay();
      else if (X.gRev !== rev || (X.vaultOpen ? '1' : '0') !== gridKey[0]) { rev = X.gRev; const k = keyOfGrid(); if (k !== gridKey) { gridKey = k; refreshGround(); buildStatic() } }
      updVis();
      if (performance.now() - decT >= C.decalT * 1000) refreshDecal();
      lightA(); buildDyn(); buildScen(SC); buildFx(); camSet(); setCut(); st.rcam = [tgt.x, tgt.z]; lightB(); ren.render(scene, cam); show(true);
    } catch (e) {
      st.errs++; st.err = String(e && e.message || e).slice(0, 120); if (st.errs >= 3) api.dead = 'Fehler beim Zeichnen (' + st.err + ')'; show(false); return false;
    }
    const ms = performance.now() - t0; st.frames++; st.ms = ms; st.msAvg = st.frames > 1 ? st.msAvg * .9 + ms * .1 : ms;
    st.calls = ren.info.render.calls; st.tris = ren.info.render.triangles;
    return true;
  }
  function info() {
    return { on: !api.dead, shown, angle: angle(), camY: cam.position.y, camZ: cam.position.z - tgt.z, q: st.q, frames: st.frames, ms: st.ms, msAvg: st.msAvg, calls: st.calls, tris: st.tris, errs: st.errs, err: st.err || api.dead,
      builds: st.builds, groundUp: st.groundUp, statBuilds: st.statBuilds, inst: st.inst, parts: st.parts.slice(), vol: st.vol, decUp: st.decUp, figs: st.figs, cars: st.cars, fk: Object.assign({}, st.fk), ck: Object.assign({}, st.ck), lie: st.lie, hit: st.hit, xparts: st.xparts, sil: st.sil || 0, sk: Object.assign({}, st.sk), lead: C.camLead, tgt: (st.rcam || [0, 0]).slice(), cut: U0.uCut.value.toArray(), vis: { on: !!st.visOn, up: st.visUp, dark: UV.uDark.value.w, size: [visCv.width, visCv.height], key: visKey, n: visPoly ? visPoly.length : 0 }, ov: ovKey, dynCalls: st.dynCalls, dynGrow: st.dynGrow, cells: Object.assign({}, cells), light: lt ? JSON.parse(JSON.stringify(lt)) : null, relink: st.relink || 0, defs: defKey, lampList: lamps.map(o => [o.k, o.x, o.y]), decal: !!ground && groundMat.uniforms.dmap.value === decTex, scen: Object.assign({}, st.scen), scenN: (st.scenN || []).slice(), scenSum: (st.scenSum || []).slice(), grl: grl.size, fx: JSON.parse(JSON.stringify(fxSt)), objs: scene.children.length, ground: !!ground, size: [el.width, el.height],
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
  function dispose() { show(false); if (el.parentNode) el.parentNode.removeChild(el); for (const e of [X.cv]) { e.style.gridRow = ''; e.style.gridColumn = '' } if (ground) ground.geometry.dispose(); for (const m of stat) m.dispose(); box.dispose(); for (const P of pools) if (P.im) { P.im.geometry.dispose(); P.im.dispose() } for (const q of [bodyGeo, cubeGeo, flatGeo, figMat, topMat, shMat, silMat, colMat, chTex, chFTex, carTex, glowMat, flatMat, coneMat, coneGeo, fxAddMat, fxNrmMat, pkMat, prTex]) q.dispose(); for (const m of mats.concat([glassMat, groundMat])) m.dispose(); groundTex.dispose(); decTex.dispose(); visTex.dispose(); shRT.dispose(); shDepth.dispose(); ren.dispose(); try { ren.forceContextLoss() } catch (e) { /* schon weg */ } api.dead = 'entsorgt' }

  return Object.assign(api, { render, show, pick, toScr, info, probe, seen, visAt, fogA: () => UV.uDark.value.w, dispose, dyn: () => dynLast, scen: () => scenLast.slice(), fx: () => fxLast, topAt, el, cam, scene, cfg: C });
}
mkView3d.api = 8;
