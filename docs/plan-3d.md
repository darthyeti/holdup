# Plan 3D-Umbau (Plan v1, 7. November 2026)

Stand: Plan, Entscheidungen E1 bis E5 getroffen (Abschnitt 9), Vorab-Ticket 144 gebaut (PR 148), 3D-0 als Nächstes. Till hat die Richtung entschieden: 3D, Kamera fest gekippt (etwa 20 bis 30 Grad), und zwar nach einem sauberen Stand (zuerst Auslagern Schritt 4, `js/draw.js`, Ticket 144). Vorarbeiten: der Prototyp (PR 130, Ticket 125, `js/view3d.js`, Three.js 0.170.0, Bilder in `docs/bilder/proto3d/`, wird nicht gemergt), der Vergleich 2D, 2D schräg und 3D (Branch `claude/125-2d-schraeg`, `docs/bilder/vergleich-2d-3d/`), der Pixel-Test (`tests/cases/189-pixelhash.test.js`, `tests/pixel-altneu.js`) und die Bildzeit-Messung (`tools/messung-bildzeit.js`). Dieser Plan ist die Spezifikation; die Aufgabenliste sind die GitHub Issues (Tickets unten werden daraus angelegt). Abschnitt 8 nennt die Risiken, Abschnitt 9 Tills Entscheidungen.

## 1. Ziel und Leitplanken

**Ziel.** Dieselbe Welt, derselbe Spielablauf, aber mit gekippter Kamera, echter Höhe (Wände, Möbel, Fahrzeuge werfen Schatten und verdecken Sicht) und einem Licht, das Tag und Nacht glaubwürdig trägt. Das Cyberdogs-Gefühl (Top-down) bleibt: Die Kamera ist fest, der Blick bleibt von oben.

**Leitplanken (gelten für jedes Ticket).**

1. **3D ist reine Darstellung.** Spiellogik, Karten, Netz und Kollision bleiben 2D: Raster über `cell`/`setc`, `isSol`, `isOpq`, `isBul`, `los`, `mv`, Weltkoordinaten `x`/`y` in Pixeln, Kachel `T=32`. Kein Spielzustand wandert in die Szene; die Szene wird jedes Bild aus dem Zustand abgeleitet. `VER` (Netzformat) ändert sich durch 3D nicht, `buildSnap`/`applySnap` bleiben unberührt. Wer 3D aus dem Spiel nimmt, hat dasselbe Spiel.
2. **Host-autoritativ unverändert.** Der Host rechnet, Clients zeichnen aus Schnappschüssen. Die 3D-Ansicht liest nur, ob Host, Client, Solo oder Zuschauer. Zielen, Sicht und Fadenkreuz entstehen weiter in Weltkoordinaten (`mouse.x/y`), nur die Umrechnung von Bildschirm zu Welt wird in 3D ersetzt (Abschnitt 4).
3. **Kein Bauschritt.** Three.js liegt als Datei in `assets/` (unverändert aus dem npm-Paket, 692 KB, MIT, SHA-256 in `docs/assets-und-dateien.md`, wie `peerjs.min.js`). Das Spiel lädt sie erst, wenn 3D an ist. Das passt zu GitHub Pages und `file://`: Der Prototyp lädt `js/view3d.js` per dynamischem `import()` als ES-Modul. Das ist die einzige Stelle mit Modulen; `file://` verbietet Module in Chromium (CORS auf `file:`), deshalb gilt: 3D läuft über Webserver und GitHub Pages, nicht über Doppelklick auf `index.html`. Alternative wäre ein klassisches Skript mit Three.js-Build als globalem `THREE` (`three.min.js` gibt es seit Version 0.160 nicht mehr, nur Module). Empfehlung: Modul-Import beibehalten, in `file://` den 2D-Rückfall mit klarem Hinweis ("3D braucht einen Webserver") zeigen. Der Spielkern bleibt klassisch.
4. **2D bleibt als Rückfall.** Ein Regler in den Optionen (Ansicht: Auto, 3D, 2D). Auto wählt 2D, wenn WebGL fehlt, Three.js nicht ladbar ist oder die Bildzeit dauerhaft zu hoch liegt (Abschnitt 5). Ob 2D als Wahl dauerhaft bleibt oder nur als Notanker, ist Entscheidung E3 (Abschnitt 9). Bis dahin gilt: Der 2D-Pfad wird nicht verändert und bleibt pixelgleich.
5. **Assets und Lizenz.** Nur selbst gezeichnete oder prozedurale Inhalte, wie heute (`gen_sprites.py`). Three.js ist MIT.
6. **Ein Ticket, ein PR, kleinster Umbau** (CLAUDE.md). Jeder 3D-PR ändert den 2D-Pfad nicht.

## 2. Architektur

### 2.1 Anbindung an `js/draw.js` (Ticket 144)

Heute zeichnet `draw()` (`draw1`/`draw0`, rund 65 KB zwischen den Funktionen `drawCart`, `drawNight`, `drawGad` und weiteren) alles direkt in das 2D-Canvas `g`. Der Prototyp leitet `g` dafür kurz um (`let g` statt `const g`), das ist ein Notbehelf. Sauber geht es erst nach dem Auslagern:

- `js/draw.js` (Fabrik `mkDraw(X)`) zerlegt `draw0` in **Schichten** mit festen Namen, jede ein Aufruf: `world` (Boden und statische Ebene), `props` (Dinge, Beute, Türen, Laser), `entities` (Spieler, Gegner, Zivilisten, Fahrzeuge, Geräte), `shots` (Kugeln, Granaten, Partikel, Decals), `light` (Nacht, Tönung, Vignette, Sichtkante), `hud` (alles in Bildschirmkoordinaten). Das ist eine Umformung ohne Verhaltensänderung (Abnahme: `node tests/pixel-altneu.js` meldet IDENTISCH, `189-pixelhash` grün, Bildzeit vorher und nachher).
- Darüber liegt eine **Ansicht** mit zwei Ausprägungen und derselben Schnittstelle: `view2d` (ruft die Schichten in der heutigen Reihenfolge) und `view3d` (zeichnet `world`, `props`, `entities`, `shots`, `light` selbst mit WebGL, übernimmt von der 2D-Seite nur `hud`). Schnittstelle: `render(state, hudCtx)` mit nur lesendem Zustand (Kontextobjekt `X` wie bei `mkUI` und `mkMaps`, Getter statt Umbau der Namen, Vertragszähler `VIEW3D_API`), dazu `pick(sx,sy,h)` (Bildschirm zu Welt) und `toScr(x,y,h)` (Welt zu Bildschirm).
- **HUD als Overlay.** WebGL-Canvas unten, das bisherige 2D-Canvas oben und transparent (nur HUD, Texte, Menüs, Fadenkreuz, Gegnerbalken, Funksprüche). Die Menüs (`js/ui.js`) und das HUD ändern sich nicht. Weltgebundene Marken (Prompts über Dingen, Zielmarken, Namensschilder) bekommen ihre Bildschirmposition aus `toScr(x,y,h)`; der Prototyp hat stattdessen ein Welt-Overlay als Textur auf den Boden gelegt (Ausgleichsfläche `ovBegin`/`ovEnd`), das ist für Marken auf dem Boden (Kreise, Zonen) brauchbar, für aufrechte Marken nicht. Regel: Bodenmarken als Decal-Textur, aufrechte Marken als HUD über `toScr`.
- Bis Ticket 144 gemergt ist, baut keiner der 3D-Schritte (außer dem reinen Gerüst, 3D-0). Solange `draw` in `start()` liegt, würde jeder Eingriff mit allen anderen PRs kollidieren.

### 2.2 Aus dem Prototyp übernehmen, neu bauen, verwerfen

Der Prototyp (42 KB, 420 Zeilen, `mkView3d(X)`) zeigt, dass der Weg trägt. Übernommen werden die Ideen und große Teile des Codes, aber als Ergebnis von Tickets mit Tests, nicht als Kopie:

- **Übernehmen:** Kontextobjekt `X` mit Gettern (Raster nur über `X.cell`, Straße nur über `X.LANE`); Kamera als Perspektive mit schmalem Blickwinkel (`fov` 30), Kippung `tilt` und Zoom über den Abstand, `camSet`; Boden aus den Texturen der statischen 2D-Ebene (`X.st`, `X.so`) als Bodentextur; Höhentabelle je Kachelzeichen (`V3CFG.cells`: unten/oben in Weltpixeln, Einzug für Möbel, Material); Sichtmaske aus dem Sichtpolygon als Textur, die in den Materialien (über `patch`/`onBeforeCompile`) die Abdunklung steuert; Durchblick auf den Spieler (`uPl`, `uCut`); Tageszeiten-Tabelle `TOD` (Sonne, Himmelslicht, Höhe); Pooling der Lichter und Partikel (`pool`); `pick`-Strahl auf Bodenebene; Fallback `{on:false, err}` bei fehlendem WebGL.
- **Neu bauen:** die Schnittstelle zu `js/draw.js` statt des umgeleiteten `g`; alle Figuren (Abschnitt 3); Szenario-Besonderheiten (2.6); Rückfall und Bildzeit-Regelung (Abschnitt 5); Optionen statt des Schiebers am Bildrand und der Debug-Tasten; Tests (Abschnitt 6); Doku.
- **Verwerfen:** den frei einstellbaren Winkel 0 bis 60 Grad und Zoom per Mausrad als Spielfunktion (Entscheidung E2: fester Winkel, höchstens kleiner Spielraum), die Umleitung von `g`, den Schieber im DOM (`box`).

### 2.3 Statische Ebene

Wände, Pfeiler, Fenster, Türen, Tresen, Möbel, Zäune, Barrikaden stehen im Raster (`M`, `LAY`). Daraus entsteht **einmal je Karte** eine zusammengefasste Geometrie (Prototyp: `buildLay`, `buildStatic`): Kacheln mit gleicher Höhe und gleichem Material werden zu einer Netzfläche verschmolzen oder als `InstancedMesh` gelegt; nur sichtbare Seitenflächen werden erzeugt (eine Wandseite entfällt, wenn dahinter wieder Wand steht). Ziel: wenige Hundert Dreiecke je Raum, **unter 30 Draw Calls für die ganze statische Ebene**.

Das Raster ändert sich zur Laufzeit an wenigen Stellen (Tür auf, Fenster zerschossen `w`, Barrikade `X`, Fenster gesichert `Y`, Tresortür `V` offen, Wrack und Fahrzeuge `v`). Der Prototyp hasht das Raster (`keyOfGrid`) und baut bei Änderung neu, das ist grob, aber für den Anfang richtig. Ausbau: nur den betroffenen Chunk (Block von 8 x 8 Kacheln) neu bauen. Bodendecals (Blut, Einschüsse, Brandflecken, Glasscherben, das heutige `dcv`) bleiben eine 2D-Textur, die alle 0,3 s hochgeladen wird (`decalT`).

Der Boden nimmt die Pixeloptik der 2D-Ebene (Materialien, Themen, Teppiche) als Textur. Das ist der günstigste Weg und hält die Karten-Themen (`THEMES`, `TODS`) wirksam, ohne sie neu zu schreiben. Wandtexturen (Backstein, Putz) kommen aus der Wandfläche der 2D-Zeichnung oder aus kleinen eigenen Mustern (3D-1 entscheidet nach Sicht der Bilder).

### 2.4 Dynamische Ebene

Figuren, Fahrzeuge, Kugeln, Granaten, Partikel, Gegenstände (Beute, Taschen, Minen, C4), Türen in Bewegung. Regeln:

- **Pools und Wiederverwendung.** Pro Typ ein Pool (Prototyp: `fig`, `car`, `sweep`, `mkParts`). Objekte, die ein Bild nicht gesehen wurden, werden unsichtbar, nach 300 Bildern entfernt.
- **Fahrzeuge** (Streifenwagen, zivile Autos, Fluchtwagen, Panzerwagen, Wracks) aus wenigen Quadern mit Fenstern als dunkle Flächen, Farbe aus den Sprite-Zellen von `cars.png`. Sie stehen auch im Raster (`v`/`tkStamp`), die 3D-Höhe nimmt die Kachelhöhe (`carH` 26).
- **Kugeln und Partikel** als Punkt-Sprites (`PointsMaterial` mit Größe nach Abstand, Prototyp `PN`/`PA`) in einem Puffer, nicht als Einzelobjekte. Mündungsfeuer, Blaulicht, Explosion als gepoolte Punktlichter (`pool`: 3, 4, 2, 4, 2).
- **Ereignisse.** Effekte folgen weiter `evt(...)`/`fxApply`. Die 3D-Ansicht hängt sich in `fxApply` nur zum Zeichnen ein (Funken, Rauch, Scherben), sie löst nichts in der Simulation aus.

### 2.5 Licht und Schatten

Eine Richtungslichtquelle als Sonne (Richtung und Farbe aus `LAY.theme.sun`, das 2D kennt die Werte schon: Farbe, Stärke, `dx`, `dy`), dazu ein Himmelslicht (Hemisphere). Schatten über eine Schattenkarte, die nur den Bereich um die Kamera abdeckt (der Prototyp setzt `PCFSoftShadowMap`). Tageszeiten bleiben die vier (`mittag`, `morgen`, `abend`, `daemmerung`) plus Nacht; die Farben stehen in einer Tabelle (`TOD`), nicht im Code verstreut, und die Zahlen wandern in `CFG`/`V3CFG` ("Alle Balance-Werte in CFG" gilt sinngemäß für Optikwerte: `V3CFG` ganz oben im Modul, ein Ort). Lampen im Raum (Deckenlampen, Blaulicht, Mündungsfeuer) sind gepoolte Punktlichter mit Reichweite, höchstens 4 gleichzeitig mit Schatten aus. Schattenqualität ist ein Regler (aus, weich), weil sie der größte Einzelposten der Bildzeit ist.

### 2.6 Sicht, Nebel und Nacht

Das Spiel kennt das Sichtfeld heute als Polygon aus `los` (Sichtkante in `draw` bei Stufe mittel und hoch). In 3D bleibt das Polygon die **einzige Quelle**; es wird, wie im Prototyp, in eine Maske gemalt (Auflösung ein Viertel der Weltgröße, weiche Kante) und in den Materialien der statischen und dynamischen Ebene als Abdunklung gelesen: außerhalb des Sichtfelds sind Boden und Wände abgedunkelt (Nebel des Krieges wie in 2D, `uDark`), Gegner und Zivilisten außerhalb der Sicht sind unsichtbar (wie heute, über `los`, nicht über die Maske). Das hält die Spielregel (wer sieht wen) in 2D und verhindert, dass 3D Sicht schenkt oder nimmt.

Die Kippung führt zu einer eigenen Frage: Eine hohe Wand ragt in der Darstellung über den Boden dahinter. Die Sichtmaske gilt am Boden; Wandoberseiten und -seiten werden mit der Maske der Wandfußpunkte eingefärbt. Die Wand "vor" dem Spieler (näher an der Kamera) verdeckt den Spieler, das wird über Silhouette und Wandtransparenz gelöst (Abschnitt 4), nicht über die Sicht.

Nacht (`nightOn`, `drawNight`, Taschenlampe, Lichtkegel, Aus-Schalter): Hemisphere und Sonne dunkel (`TOD.nacht`), die Taschenlampe ist ein Spot am Spieler mit Kegelmaske, Lampen im Raum sind Punktlichter. Die Sichtmaske wirkt weiter. Die Bank-Nacht ist der Prüfstein (Bilder `docs/bilder/proto3d/nacht-*.jpg`).

### 2.7 Szenario-Besonderheiten

Jede Besonderheit ist ein Eintrag der Höhentabelle oder ein kleines Modul, nicht ein Eingriff in den Kern:

- **Laser** (Museum, Casino, Bank-Varianten): leuchtende dünne Quader in Kniehöhe bis Hüfthöhe mit Additiv-Blending, Pulsieren aus der Spielzeit.
- **Zapfsäulen** (Tankstelle, `u`): Quader mit Display, Explosion und Feuer wie andere Explosionen (Partikel und Punktlicht), Schaden bleibt in 2D.
- **Tresor** (`V`, Tresortür, Tresorraum, Geldstapel, Schließfächer): Höhentabelle mit Metallmaterial, Tür dreht sich beim Öffnen (Animation aus `vaultOpen`).
- **Geldtransporter** (Panzerwagen `tk`, Straße mit Spur): großer Quader mit Fahrerhaus, Dach-Luke, Reifen aus Zylindern; fährt in 2D-Koordinaten.
- **Notenbank** (`LAY.nb`, Tunnel statt Fluchtwagen): Tunneleingang als Öffnung im Boden und Rampe; gegebenenfalls später ein Schacht-Look. Der Tunnel ist heute nur ein Spielobjekt, kein eigener Raum.
- **Gefängnis** (nur Coop, `LAY.prison`): Zellengitter als dünne Stäbe (Transparenz), Wachtürme und Hof; der Zaun (`f`) bekommt Gitteroptik.
- **Casino** (Chips, Cage, Tische), **Museum** (Vitrinen, Sockel), **Juwelier** (Vitrinen, Auslage): Möbel mit Höhen, Glas als halbtransparente Fläche.
- **Straße und Außenwelt** (Gehsteig, Parkplätze, Zäune, Fluchtzone): Boden und niedrige Hindernisse.

### 2.8 Stand 3D-0 (gebaut 7. November 2026, Ticket 149)

- **Dateien.** `assets/three.module.min.js` (Three.js 0.170.0, unverändert, SHA-256 in docs/assets-und-dateien.md) und `js/view3d.js` (ES-Modul, `mkView3d(X)`, `mkView3d.api` gleich `VIEW3D_API` im Kern, 1). Der Kern lädt es per `import('./js/view3d.js?v=N')` erst, wenn 3D gewünscht ist; `tools/stamp-build.sh` setzt `?v=N` auch dort (dieselbe Regel `js/*.js?v=N`), `tools/pages-site.sh` kopiert `assets/` und `js/` ganz, also auch für `/pr/<n>/` (lokal geprüft, kein Umbau nötig). Three.js selbst hat keine Nummer, der Dateiname wechselt mit der Version.
- **Schalter.** `V3OPT` in `index.html` (wie `GFX`): Ansicht Auto, 3D, 2D (`holdup.ansicht`, Voreinstellung 2D, Auto wählt vorerst 2D) und Winkel 20 bis 30 Grad (`holdup.winkel`, Voreinstellung 25). `#3d` oder `#debug&3d` in der Adresse schaltet 3D an. Optionen: halbe Kachel "Ansicht" (Taste A) neben dem halben Regler "Winkel"; Musik und Effekte sind dafür zwei halbe Regler in einer Zeile (gleiche Zeilenzahl wie vorher, das Fenster passt auch im Titel mit `#debug`).
- **Ablauf.** `v3Frame(play)` (Kern, je Bild aus `draw0`) lädt bei Bedarf und liefert die Ansicht; dann zeichnet `view.render()` die Welt und das 2D-Canvas wird gelöscht (nur HUD), sonst `lyWorld()` (der unveränderte Welt-Teil von `draw0`, nur herausgezogen). Rückfall auf 2D mit Meldung oben im Bild (`v3Note`) und Grund in der Kachel bei `file://` ("3D braucht einen Webserver", ohne Ladeversuch), ohne `WebGL2RenderingContext`, wenn Three.js keinen WebGL-2-Kontext bekommt, bei Lade- oder Versionsfehler des Moduls und nach drei Fehlern beim Zeichnen. Neuer Versuch erst, wenn die Ansicht in den Optionen neu gewählt wird.
- **Overlay.** Die WebGL-Leinwand (`#c3d`, ohne Maus) liegt in derselben Rasterzelle von `<main>` unter dem 2D-Canvas, das in 3D einen durchsichtigen Grund bekommt; Menüs, Pause und Ergebnis blenden die Leinwand aus. Renderauflösung folgt der Grafikstufe (niedrig 960x544, sonst 1920x1088).
- **Szene.** Nur der Boden: eine Fläche über die Welt mit `X.st` und `X.so` als Textur (unbeleuchtet), neu kopiert bei neuer Karte oder geändertem Raster. Kamera wie im Prototyp (`fov` 30, Abstand so, dass die Bildhöhe am Ziel `VH` ist, Ziel Mitte des 2D-Ausschnitts), Kippung `X.angle`. `pick(sx,sy,h)` (Standard `aimH` 24) liefert in 3D die Weltmaus (`mw()` im Kern, in 2D wie bisher), `toScr(x,y,h)`. Figuren, Wände, Weltmarken und Spuren fehlen noch (3D-1 bis 3D-3), Bildschirmtexte mit Weltbezug (Prompts, Beute-Texte) stehen in 3D noch an der 2D-Stelle.
- **Debug.** `__dbg.view3d`: `set(true|false|null)` (Promise mit `info()`), `ready()`, `info()` (Zustand, Fehler, Winkel, Aufrufe, Dreiecke, ms, GPU), `V` (Ansicht mit `probe()`), `reset()`. Bildzeit `tools/messung-bildzeit.js --3d`.
- **Abnahme.** `node tests/pixel-altneu.js origin/main` IDENTISCH (72 Bilder), `189-pixelhash` grün, `VER` unverändert. Bildzeit mittel 3D aus, Mittel über 24 Szenen: vorher 21,4 / 21,4 / 21,9 ms, nachher 22,6 / 20,6 / 21,9 ms (Rauschen). 3D an (SwiftShader im Container, nur relativ): 61,4 ms (Boden 1 Aufruf, 2 Dreiecke; die Kosten sind Füllrate in Software und das Warten auf die Grafik). Tests `00-start` (Modul, Version, Ladefehler) und `190-ansicht-3d` (aus, an, Overlay, `pick`-Rundlauf, Winkel, Optionen, Rückfall ohne WebGL und über `file://`), WebGL in Headless läuft im Container ohne Flags, `launch({webgl:true})` oder `HOLDUP_WEBGL=1` setzt die SwiftShader-Flags, ohne WebGL überspringt der Test. Acht Mutanten erkannt (Rückfall, Winkel, Maus ohne `pick`, deckendes 2D-Canvas, `file://`-Prüfung, Welt doppelt, `import` ohne `?v=N`, Versionsprüfung). Bilder: `docs/bilder/plan-3d/3d0-*.jpg`.

## 3. Figuren

Figuren sind der sichtbarste Punkt des Stils. Optionen:

| Option | Vorteil | Nachteil | Aufwand |
|---|---|---|---|
| A. Sprites als Billboards (wie im Prototyp, `chars.png`, `chars_flash.png`) | alle Animationen und Waffen-Overlays existieren, Trefferblinken geht per Tauschbild, Stil bleibt das gewohnte Cyberdogs-Bild | wirkt in gekippter Kamera flach, Figuren stehen "aufrecht", drehen sich nur in 8 Richtungen, Schatten schwach | S |
| B. Einfache Low-Poly-Modelle aus Grundkörpern im Code (Kapseln, Quader, Kugeln: Torso, Kopf, Arme, Beine, Waffe) | echte Drehung, Schatten, Beinschwung, Trefferblinken per Material, Waffen und Westen als Zusatzteile, alles ohne Dateien (passt zu "selbst gezeichnet") | Aussehen gewöhnungsbedürftig (Stil Klötzchen), Teilanimation muss gebaut werden | M bis L |
| C. Echte Modelle (glTF) mit Skelettanimation | beste Optik | Bauschritt-nah (Dateien, Lader `GLTFLoader` als weiteres Modul, Größe), Lizenzfrage für Fremdmodelle, wir haben keine eigenen Modelle und kein Werkzeug | L bis XL |

**Empfehlung.** Mit **B** bauen, mit **A** als Übergang und Rückfall: 3D-2 liefert zuerst Billboards (nach dem Prototyp), damit alle Szenen sofort spielbar sind; 3D-2b ersetzt sie schrittweise durch Low-Poly-Körper (Spieler, Polizei, Zivilisten, Schild-Beamte, Scharfschützen, Geiseln, jeweils Farbe und Zusatzteile). C bleibt eine spätere Stufe, wenn Till den Stil festgelegt hat (Entscheidung E1). Wichtig: Die Wahl ändert nur 3D-2; alle anderen Tickets gelten für beide.

**Animationen.** Der Zustand kommt aus den vorhandenen Feldern (Winkel `a`, Laufphase, `hp`, Zielen, Schießen, `bd` am Boden/Bewusstlos, Geisel, Tragen, Leiter, Schild). Abbildung bei Modellen:

- **Laufen:** Beine und Arme schwingen nach der gleichen Laufphase, die 2D für die Sprite-Zelle nimmt (kein neuer Zustand im Spiel).
- **Zielen/Schießen:** Oberkörper dreht zum Zielwinkel (`a`), Waffenarm zeigt nach vorn, Mündungsfeuer als Lichtblitz an der Waffenspitze; Rückstoß als kurzer Versatz.
- **Am Boden / bewusstlos:** Körper kippt nach vorn oder hinten auf den Boden (Rotation um die Fußachse, 0,25 s), liegt flach; Wiederbeleben stellt ihn wieder auf. Billboards nutzen die vorhandene Liegezelle.
- **Treffer:** kurzes Aufleuchten des Materials (statt `chars_flash.png`).
- **Tragen, Geiseln, Hände hoch, Schild:** Zusatzteile und Armstellung, je ein kleiner Satz von Posen.
- **Name und Balken** über dem Kopf bleiben HUD (`toScr`).

## 4. Bedienung

- **Zielen mit Maus.** `pick(sx, sy, h)` wirft einen Strahl durch den Mauspunkt auf eine Ebene in Waffenhöhe (`aimH` 24) und liefert den Weltpunkt `mouse.x/y`. Alles andere (Zielwinkel, Zielhilfe, Lehnen, Gadget-Wurf) rechnet damit wie bisher in der Ebene. Das Fadenkreuz ist HUD an der Mausposition; zusätzlich ein Ring auf dem Boden am Zielpunkt. Bei fester Kippung ist die Abbildung bis auf einen konstanten Verzug linear, Nachbar-Fehlerquelle ist die Höhe des Ziels: Gegner werden in Brusthöhe getroffen, nicht am Fuß. Messung in 3D-3: Abweichung zwischen "Maus auf Gegner" und Treffer am Gegner.
- **Kamera.** Folgt dem Spieler wie heute (`camUpdate`, `camSnap`, Glättung `dt*8`), Blickpunkt ist der Bildschirmmittelpunkt in der Weltebene. Fester Winkel (Richtwert 25 Grad, Entscheidung E2), Abstand so, dass die sichtbare Bodenbreite etwa der heutigen 960 Pixel (30 Kacheln) entspricht; weiter vorn verkürzt sich das Bild. Kamerawackeln (`shk`) bleibt, jetzt als Versatz der Kamera.
- **Verdeckung.** Hohe Wände vor dem Spieler verdecken ihn und alles dahinter. Zwei Maßnahmen gemeinsam: (1) **Wandtransparenz in Kameranähe**: Wände und Möbel im Umkreis (`cutR`, Prototyp 70 px) um den Spieler und zwischen Kamera und Spieler werden ausgeblendet oder auf Tischhöhe abgesenkt (Shader: Abstand zur Linie Kamera-Spieler, `uCut`); (2) **Silhouette**: Spieler, Teammitglieder und Gegner in Sicht, die hinter einer Wand stehen, werden als einfarbiger Umriss in Spielerfarbe durch die Wand gezeichnet (zweiter Durchgang ohne Tiefentest, nur Umriss, Gegner nur wenn `los` wahr ist). Das Dach der Gebäude gibt es nicht; die Wände sind das einzige Hindernis. Abnahmekriterium: In jeder Szene bleibt der Spieler jederzeit erkennbar.
- **Maus, Tastatur, Controller-Eingabe** bleiben unverändert (WASD, Zielen, E/Q/F). Zoom und freie Kippung gibt es nicht (E2), das Mausrad bleibt unbelegt oder wie bisher.

## 5. Leistung

**Budgets (Richtwerte, Messung ersetzt Annahme).**

- Bildzeit gesamt je Frame (Spielschritt, Zeichnen, WebGL, HUD): **unter 16 ms** auf einem mittleren Notebook mit integrierter Grafik bei 1080p; Ziel 60 Bilder je Sekunde. Härteste Grenze: **unter 25 ms** (40 Bilder), darüber schaltet Auto zurück.
- Draw Calls: **unter 120 gesamt** im Überfall mit Polizei (statisch unter 30, Figuren und Fahrzeuge unter 60, Partikel und Effekte unter 20, HUD ein Canvas-Upload). Dreiecke unter 150.000.
- Schattenkarte höchstens 2048 x 2048, nur der Bereich um den Spieler, Aktualisierung jedes Bild, schaltbar.
- Texturen: Boden einmal je Karte (Größe Weltfläche mal Stufe), Decals 0,3-s-Takt, Sichtmaske ein Viertel der Auflösung, Hochladen nur bei Änderung.
- Die Renderauflösung folgt der heutigen Stufe (`niedrig`, `mittel`, `hoch`, `window.__holdupGfx`) als Skalierung (Prototyp `q`: Zwischenfaktor 2).

**Messverfahren.** (1) `tools/messung-bildzeit.js` bekommt die Option `--3d` (dieselben Szenen und Phasen wie der Hash, Median und 90. Perzentil von `draw()`), (2) `ren.info.render` (Aufrufe, Dreiecke) im Debug-Hook, (3) `LOG.cost` (`up`, `dr`, `drMax`, Flugschreiber) bleibt die Messung beim Spieler und bekommt die Spalte für den GPU-Namen (gibt es schon: `gpu`), (4) Tills Rechner: Flugschreiber-Log einer Runde mit 3D. Headless-Chromium im Container rendert WebGL in Software (SwiftShader), die Absolutwerte dort sind pessimistisch und nur als Relativwert gegen den 2D-Pfad brauchbar. Ausgangswert für 3D-0 und 3D-1 ist die Messung im Prototyp-PR 130, soweit dort vorhanden; sonst misst 3D-0 selbst.

**Selbstregelung (3D-9).** Liegt der gleitende Mittelwert der Bildzeit 10 s lang über der harten Grenze, schaltet das Spiel stufenweise zurück: erst weiche Schatten aus, dann Auflösung kleiner, dann Partikel halbiert, dann Rückfall auf 2D (mit Hinweis, nur einmal pro Sitzung, wieder hochschalten nur auf Wunsch in den Optionen). Die Tests laufen auf fester Stufe.

**Mobil und Tablet** sind ungeprüft (Touch-Steuerung gibt es nicht; das Spiel ist für Tastatur und Maus gebaut). 3D erhöht die Anforderung an die GPU, ein Mobilgerät ist ausdrücklich nicht Ziel dieses Plans. Der Coop braucht gleich starke Rechner bei allen (Auto-Rückfall gilt je Spieler, eine Mischung 2D/3D im Coop ist ohne Folgen, weil die Ansicht lokal ist).

## 6. Tests

Jedes Ticket sichert sich so ab (mindestens die ersten drei Punkte):

1. **2D-Pfad unverändert.** `node tests/pixel-altneu.js` meldet IDENTISCH (72 Bilder, Stufe `mittel` mit `schnell`), `189-pixelhash` grün. Abnahmebedingung jedes 3D-PR, weil der 2D-Pfad nicht angefasst werden darf. Vorlage: Umbau Schritt 4b.
2. **Funktionstests über den Debug-Hook** (kein Pixelvergleich): `__dbg.view3d` meldet an/aus, `info()` (Dreiecke, Aufrufe, Zeit, Fehler); Tests prüfen Zustände statt Bilder: die Szene hat so viele Wandkörper wie das Raster Wandkacheln (Abgleich mit `isSol`), die Höhentabelle deckt jedes Kachelzeichen ab (`MAP_FIELDS`-Prinzip: neues Zeichen ohne Eintrag macht den Test rot), Tür auf ändert die Geometrie, `pick(toScr(x,y))` liefert `x,y` zurück (Rundlauf, Fehler unter 1 px für Höhen 0 und `aimH`), jede Szene baut ohne Fehler und mit Dreiecken unter dem Budget, Rückfall auf 2D bei fehlendem WebGL (Test setzt `WebGLRenderingContext` auf `undefined`).
3. **Gesamtlauf bleibt grün:** Die Spiellogik-Tests (Polizei, Karten, Coop, Transporter) laufen unverändert mit 3D aus und für eine Auswahl auch mit 3D an (Wiederholung von `00-start`, `pixelhash` ohne Vergleich, einem Bot-Lauf mit `?3d`), damit 3D keinen Spielzustand verändert (Zustandshash nach 600 Schritten gleich mit und ohne 3D).
4. **WebGL in Headless-Chromium:** Start mit `--use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader` (in `tests/lib.js` hinter einer Option, in 3D-0 zu prüfen; Flags sind eine Annahme). Läuft WebGL nicht, überspringen die 3D-Tests mit Meldung statt rot zu werden (CI hat ein anderes Chromium).
5. **Pixel-Tests nur lokal.** 3D-Bilder hängen an Treiber und Software-Renderer, deshalb wie `189-pixelhash` eine Referenz je Maschine (`tests/golden-local/`, nicht eingecheckt) und in der CI nur "baut und zeichnet". Zusätzlich Screenshot-Mappen für die Abnahme durch Till (`docs/bilder/plan-3d/`, wie der Prototyp), je Ticket zwei bis vier Bilder (Tag, Nacht, Überfall).
6. **Messung:** `tools/messung-bildzeit.js --3d` vor und nach jedem Ticket, Abweichungen unter 10 Prozent gelten als Rauschen (Fremdlast im Container, siehe docs/tests-und-messwerte.md).
7. **Mutanten:** fünf Stichproben je Ticket (zum Beispiel Wandhöhe, Kameraneigung, Rundlauf `pick`) müssen von Tests erkannt werden.

Beschränkung: Spielgefühl, Zielgefühl und Lesbarkeit prüft nur Till (Label `spielgefuehl`, Vorschau im PR unter `darthyeti.github.io/holdup/pr/<n>/`; die Vorschau muss `#3d` oder die Option setzen). Der Pages-Workflow muss `assets/three.module.min.js` und die Module mitnehmen (in 3D-0 prüfen).

## 7. Schritte als Tickets

Größen: S (bis etwa 2 Stunden Agentenzeit, wenige Dateien), M (halber bis ganzer Tag, ein Bereich), L (mehrere Sitzungen, mehrere Bereiche). Alle Tickets haben als Abnahme zusätzlich Abschnitt 6, Punkte 1 bis 3 und 6.

| Nr | Titel | Ziel | Abnahme | Größe | Abhängigkeit |
|---|---|---|---|---|---|
| Vorab | Ticket 144 (gebaut, PR 148): Zeichnen nach `js/draw.js` | Schichten `world/props/entities/shots/light/hud`, Fabrik `mkDraw(X)` | `pixel-altneu` IDENTISCH, Bildzeit unverändert | L | Pixel-Test (da) |
| 3D-0 (#149) | Gerüst und Schalter | `assets/three.module.min.js`, `js/view3d.js` (leer: Szene, Kamera, Rückfall), Option "Ansicht" (Auto/3D/2D) in den Optionen, Overlay-Canvas für das HUD, Pages-Workflow nimmt die Dateien mit, `__dbg.view3d` | Schalter aus: Spiel bytegleich wie vorher (Pixel-Alt-Neu), an: Boden als Fläche, HUD sichtbar, WebGL-Fehler führt zu 2D mit Meldung, Test `00-start` für das Modul | M | 144 |
| 3D-1 (#150) | Statische Welt Bank | Höhentabelle, Geometrie aus dem Raster (Wände, Fenster, Türen, Tresen, Möbel), Boden aus der 2D-Textur, Neubau bei Rasteränderung (Tür, Fenster, Barrikade), Decals | Alle Kacheln der Bank haben eine Höhe, Rundlauf-Test, unter 30 Aufrufe, Bilder Bank Tag | L | 3D-0 |
| 3D-2 (#151, 3D-2b #160) | Figuren | Spieler, Teammitglieder, Polizei, Schild-Beamte, Scharfschützen, Zivilisten, Geiseln: Stufe a Billboards, Stufe b Low-Poly (Empfehlung B), Animationen (Abschnitt 3), Fahrzeuge | Alle Figurenarten da, Zustände am Boden/bewusstlos/Treffer sichtbar, Coop-Farben | L | 3D-1 |
| 3D-3 (#152) | Zielen und Kamera | Fester Winkel, Kamera folgt, `pick` für Maus, Fadenkreuz und Bodenring, Wandtransparenz und Silhouette | Rundlauf-Test, Treffertest (Bot zielt über `pick` und trifft ein stehendes Ziel), Bild "Spieler hinter Wand erkennbar" | M | 3D-2 (für Silhouette), Rest nach 3D-1 |
| 3D-4 (#153) | Sicht und Nebel | Sichtmaske aus dem Sichtpolygon, Abdunklung außerhalb, Gegner unsichtbar außerhalb (über `los`) | Test: Maske deckt sich mit `los` auf 20 Stichpunkten, Bilder Erkundung | M | 3D-1 |
| 3D-5 (#154) | Licht und Nacht | Sonne und Himmel je Tageszeit, Schatten (Regler), Nacht, Taschenlampe, Lampen als Punktlichter, Blaulicht, Mündungsfeuer | Vier Tageszeiten und Nacht je ein Bild, Schatten aus: Bildzeit sinkt messbar | M | 3D-1, 3D-4 |
| 3D-6 (#155) | Alle Szenarien | Laser, Zapfsäulen, Tresor und Tür, Transporter, Notenbank-Tunnel, Gefängnis, Museum, Casino, Juwelier, Straße und Fluchtwagen | Je Szenario baut es ohne Fehler (Debug-Test über alle acht), Bilder je Szenario | L | 3D-2, 3D-5 |
| 3D-7 (#156) | Effekte | Kugeln und Spuren, Granaten (Blend/Gas), Rauch und Feuer, Funken, Glas, Explosion, Kamerawackeln, Decals | Alle `evt`-Namen (`sh`, `es`, `hw`, `hf`, `sp`, `sk`, `gb`, `gl`) haben eine 3D-Entsprechung (Test über die Liste), Partikel im Puffer | M | 3D-5 |
| 3D-8 (#157) | Coop und Zuschauer | Mehrere Instanzen (Test-Leitung), Client und Host, Zuschauer-Ansicht, Wettkampf (zwei Teams), Funksprüche über `toScr` | Coop-Tests mit 3D an grün, Zustandshash gleich mit/ohne 3D, kein Schnappschuss ändert sich | M | 3D-6 |
| 3D-9 (#158) | Rückfall und Leistung | Selbstregelung (Stufenleiter), Ladefehler, `file://`-Hinweis, Einstellungen speichern, Bildzeit-Messung `--3d`, Messung auf Tills Rechner | Auto schaltet bei künstlich hoher Last (Test mit gedrosseltem Takt) zurück, Budgets erreicht oder begründet überschritten | M | 3D-7 |
| 3D-10 (#159) | Abnahme | Alle Szenen und Phasen gespielt, Bilderbogen, Doku (Wo steht was, Tests, Assets), Standardansicht (Auto) umstellen, Entscheidung E3 umsetzen | Tills Freigabe, voller Testlauf (`voller-lauf`) grün | S | alle |

**Reihenfolge und Parallelität (höchstens zwei bis drei Agenten).** 144 zuerst und allein (Zeichnen ändert alle). Dann 3D-0 allein. Danach 3D-1 (Welt) und 3D-2a (Billboard-Figuren, braucht nur Boden und `pick`) in zwei Sitzungen; 3D-4 (Sicht, braucht Boden und Wände) als dritte erst, wenn 3D-1 Wände hat. 3D-3 nach 3D-2. 3D-5 und 3D-7 überschneiden sich in `lights`/`parts` und laufen nacheinander; 3D-6 kann in zwei Hälften auf zwei Agenten verteilt werden (Hälfte 1: Laser, Zapfsäulen, Tresor, Transporter; Hälfte 2: Notenbank, Gefängnis, Museum, Casino, Juwelier), weil jede Hälfte nur ihre Einträge in der Höhentabelle und ihr Modul berührt. 3D-8 und 3D-9 am Ende parallel. Jeder 3D-PR bekommt `spielgefuehl` (Optik), 3D-1, 3D-2, 3D-6 und 3D-10 zusätzlich `voller-lauf`. Zwischenstände sind spielbar, aber hinter dem Schalter; 2D bleibt Standard bis 3D-10.

## 8. Risiken

- **Figurenstil enttäuscht.** Klötzchenfiguren in gekippter Kamera können "Spielzeug" wirken und den Cyberdogs-Ton verlieren. Gegenmaßnahme: Stufe a (Billboards) zuerst, Stil-Tafel (zwei Bilder je Figur) vor dem Bau von 3D-2b zu Till.
- **Bildzeit.** Schatten und Sichtmaske sind teuer; Integrierte Grafik könnte die Grenze reißen. Gegenmaßnahme: Messung in 3D-0 und 3D-1, Stufenleiter, Schattenregler, 2D-Rückfall.
- **Sicht und Zielen fühlen sich anders an.** Gekippt sieht man nach vorn weniger als nach hinten; die Sichtweite im Spiel bleibt gleich, die Anzeige nicht. Gegenmaßnahme: Kamera so setzen, dass vorn ein Teil Bild mehr sichtbar ist (Spieler unterhalb der Bildmitte), Zielmessung in 3D-3.
- **Verdeckung.** Wände vor dem Spieler, Fahrzeuge als Deckung. Gegenmaßnahme: Transparenz plus Silhouette, Abnahmebild je Szenario.
- **Doppelter Pflegeaufwand.** Jede neue Optik, jede neue Kachel, jedes neue Gerät braucht zwei Darstellungen. Gegenmaßnahme: Test, der jedes Kachelzeichen und jeden `evt`-Namen in der Höhentabelle verlangt; E3 (2D auf Dauer?) entscheidet, wie lange der Aufwand besteht.
- **Module und `file://`.** 3D läuft nur über Webserver (Abschnitt 1). Tills Gewohnheit "Datei öffnen" fällt weg, der Webserver (`python3 -m http.server`) steht schon in CLAUDE.md.
- **Netz.** Unverändert, Risiko gering. Prüfpunkt: kein Rückgriff der 3D-Ansicht auf Zustände, die nur der Host hat (zum Beispiel Sichtfeld der Gegner), sonst fehlt es beim Client. Das Sichtpolygon gibt es lokal für jeden Spieler.
- **Fremdcode.** Three.js ist groß (692 KB) und wird mit jeder Seite geladen, wenn 3D an ist; Ladezeit auf GitHub Pages messen (3D-9), notfalls erst nach Menüaufruf nachladen.
- **Umfang.** Das Gesamtvorhaben ist L bis XL. Nach 3D-1 und 3D-2a gibt es einen klaren Abbruchpunkt: Gefällt die Bank in 3D nicht, wird nichts weiter gebaut, 2D bleibt.

## 9. Entscheidungen von Till (7. November 2026)

Alle fünf nach Empfehlung (Akten `3d-figuren`, `3d-winkel`, `3d-2d-behalten`, `3d-hardware`, `3d-reihenfolge` im Board):

- **E1 Figurenstil: A.** Billboards zuerst (3D-2a), danach Low-Poly aus Grundkörpern im Code (3D-2b). Vor 3D-2b bekommt Till eine Stil-Tafel. Echte Modelle nur, wenn Till welche liefert.
- **E2 Winkel: A.** Fest 25 Grad, dazu ein Regler 20 bis 30 Grad in den Optionen (reiner Geschmack). Kein Zoom, keine freie Kippung im Spiel. Balance, Sichtweiten und Tests gelten für 25 Grad.
- **E3 2D behalten: A.** 2D bleibt bis zur Abnahme (3D-10) wählbar und Rückfall, danach nur Notanker ohne neue Optik. Ob 2D ganz wegfällt, wird später mit Zahlen entschieden.
- **E4 Mindest-Hardware: A.** Notebook mit integrierter Grafik der letzten fünf Jahre, 30 Bilder je Sekunde in Stufe niedrig, ohne WebGL 2 Rückfall auf 2D. Prüfgeräte sind Tills Rechner: MacBook Air M2, HP EliteBook 8 G1a 14 (AMD Ryzen AI, integrierte Radeon) und iPad (M4). Das iPad hat keine Touch-Steuerung im Spiel, es zählt nur mit Tastatur und Maus und ist kein Abnahmeziel; wenn es läuft, ist es eine Zugabe. Messbasis für 3D-9: das MacBook Air (lüfterlos, drosselt bei Dauerlast).
- **E5 Reihenfolge: A.** 144 (gebaut, PR 148), dann 3D-0 bis 3D-4, dann der **Haltepunkt**: Till spielt die Bank in 3D, Bildzeit und Aufwand werden angeschaut, erst dann folgen 3D-5 bis 3D-10.
