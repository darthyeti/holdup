# Holdup

Top-down Bankraub im Browser. Vanilla JS, Canvas 2D, eine Datei (`index.html`) plus Sprite-PNGs in `assets/`. Tastatur plus Maus zum Zielen. Kein Build-Schritt, läuft direkt von GitHub Pages.

Idee (Till): Cyberdogs-Gefühl (1992, Top-down-Shooter), moderne realistische Optik bei Tageslicht, Szenario Payday: Du bist der Räuber. Erst unbewaffnet erkunden, dann Waffe ziehen, Überfall durchhalten, fliehen. Später Coop-Mehrspieler (Aufgaben teilen: auskundschaften vs. Polizei abwehren). Zugehöriges claude.ai-Projekt: "Holdup" (früher "wardogs", Idee dort: iso, Comic-Stil, Coop gegen KI oder Free-for-all).

Sprache mit Till: Deutsch. Er mag empathisch, lösungsorientiert, ehrlichen Widerspruch bei unklugen Entscheidungen, keine Em-Dashes.

## Dateien

- `index.html`: gesamtes Spiel (HTML, CSS, JS). Lädt `assets/*.png` per `Image`, startet danach `start(ch,chF,pr,p2,cars)`.
- `assets/chars.png` (1152x1024): Figuren, Zellen 128px, gezeichnet mit 64px. Spalten 0-5 Laufen, 6 Idle, 7 tot, 8 geduckt. Zeilen: 0 Polizei, 1 Räuber bewaffnet (Maske), 2 Wachmann, 3 Zivilist A, 4 Zivilist B, 5 Kassierer, 6 Manager, 7 Räuber unbewaffnet (Phase 1). Figuren blicken nach +x und werden zur Laufzeit rotiert.
- `assets/chars_flash.png`: Trefferblinken, gleiches Layout.
- `assets/props.png` (64px Zellen): 0 Holzkiste, 1 Militärkiste, 2-4 Fässer, 5 Munition, 6 Medkit.
- `assets/props2.png` (64px Zellen): 0 Geldtasche, 1 Geldbündel, 2 Kasse, 3 Kamera (zeigt +x), 4 Notiz, 5 Schreibtisch mit Monitor, 6 Tastenfeld, 7 Pflanze, 8 Bank, 9 Schreibtisch mit Papier, 10 Geldautomat.
- `assets/cars.png` (256x128 pro Zeile): 0 Fluchtwagen, 1 Polizeiauto, 2 rotes Auto, 3 blaues Auto, alle nach +x.
- `gen_sprites.py`: erzeugt die Sprites (PIL, numpy). Platzhalter-Grafik, selbst gezeichnet, jederzeit austauschbar.

## Architektur in index.html

- Logische Auflösung 960x544 (Viewport), Canvas intern 1920x1088, Zeichnen mit `setTransform(2,0,0,2,...)`. Tiles `T=32`.
- Welt 44x28 Tiles, Tile-Koordinaten von x=-6..37, y=-5..22. Das Gebäude liegt bei x0..25, y0..12 (lokale Koordinaten, viele Positionen im Code sind hart darauf bezogen). Zugriff nur über `cell(x,y)` und `setc(x,y,c)`, nie `M[y][x]` direkt (Offset `WX0/WY0`).
- Kamera `camX/camY` folgt dem Spieler (`camUpdate`, `camSnap`), `W1()` setzt Welt-Transform, `S0()` Bildschirm-Transform für HUD. Maus: `mouse.sx/sy` (Bildschirm), `mouse.x/y` (Welt).
- Statische Ebene `st` (Boden per ImageData-Rauschen, Wände, Schatten, Möbel, Zaun, Autos) wird einmal vorgerendert. Dazu Einschuss-Decals `dcv`, Sicht-/Dunkel-Overlay `dk` pro Frame mit Strahlen-Sichtfeld (`visPoly`, 240 Strahlen).
- Kollision und Sicht: `isSol` (begehbar nein), `isOpq` (blockiert Sicht), `isBul` (blockiert Kugeln). Fenster `W` sind solide, sichtdurchlässig, kugelsperrend. Tresen `C` solide, sichtdurchlässig. Tresortür `V` solide und blickdicht, bis `vaultOpen`. `los()` prüft Sichtlinie. `mv()` bewegt achsgetrennt.
- Tile-Zeichen: `#` Wand, `W` Fenster, `C` Tresen, `g` Tresentor, `V` Tresortür, `D` Glastür, `d` Innentür, `L`/`l` verschlossene/geöffnete Hintertür, `P` Pfeiler, `p` Pflanze, `b` Bank, `e` Schreibtisch, `m` Monitortisch, `r` Kasse, `A` Geldautomat, `k` Kiste, `q` Fass, `v` Auto, `f` Zaun, `o` draußen.
- KI: Pfadsuche `pathTo()` (BFS) für Routen von Wache, Manager und Zivilisten. Polizei und Wachmann im Überfall nutzen ein BFS-Flowfield (`flow()`, `flowDir()`) zum Spieler, strafen und schießen bei Sicht.
- Spielzustand ist global und wird in `reset()` neu aufgebaut (`phase`, `p`, `npcs`, `en`, `cams`, `its`, `loot`, `units`, `code`, `mon`, `sus`, `camDown`, Timer). `update(dt)` und `draw()` laufen in `requestAnimationFrame`, `dt` auf 33 ms gedeckelt, nur bei Canvas-Fokus.

## Spielablauf

**Phase 1, Erkundung** (Spieler unbewaffnet, Tempo 85, Shift schleichen 50, schleichen halbiert Sichtreichweite der Gegner ungefähr):
- Sperrzonen (`restricted()`): Bereich hinter dem Tresen, Tresor, Büro, Sicherheitsraum, Rückseite (Gasse ab x>=8) und Hof (x>=26). Wer dort oder mit Beute gesehen wird (Angestellte, Wachmann, Kameras), füllt den Verdachtsbalken (Rate je nach Beobachter, Abbau 9/s). Bei 100 startet der Überfall erzwungen mit früherer Polizei.
- Erkunden: Kameras und Routen (Wache, Manager) werden erkannt, wenn der Spieler sie in Blickrichtung (< 0.8 rad), unter 300 px und mit Sichtlinie ansieht. Entdecktes bleibt als Sichtkegel und gestrichelte Route auf der Karte, auch in Phase 2.
- Interaktionen (E halten, Liste `its` in `reset()`): Notiz im Büro gibt Tresorcode, Monitore im Sicherheitsraum decken alles auf, Tresor mit Code leise (3 s) oder aufbohren (22 s, nur Phase 2), Kassen (nur Phase 2), Geldbündel im Tresor, verschlossene Nordtüren aufbrechen (3.6 s), Kameras einzeln ausschalten (2.6 s, nur entdeckte), Hauptschalter im Sicherheitsraum legt alle Kameras 50 s lahm.
- Eingänge: vorne (2), West-Seitentür, Hintertür zum Hof, zwei verschlossene Nordtüren (Kassenbereich, Büro).
- Lautlose Flucht: mit Beute (`units>0`) das Gebäude verlassen gibt Sieg mit 25 % Bonus.

**Phase 2, Überfall** (F): Waffe gezogen, Wachmann wird Gegner, Zivilisten und Angestellte gehen in Deckung. Stiller Alarm, Polizei nach 58 s (erzwungen 24 s), dann alle 28 s eine Welle (3+, ab Welle 3 auch aus dem Hof, ab Welle 4 aus der Gasse). Fluchtwagen kommt nach 150 s zum Hinterausgang und bleibt etwa 75 s. Sieg: Fluchtbereich erreichen, wenn der Wagen da ist. Niederlage: HP 0 oder Wagen weg. Zivilisten treffen kostet 5.000. Ergebnis-Overlay, Enter startet neu.

## Entwicklung und Tests

- Lokal: einfacher Webserver oder Datei öffnen (`file://` reicht, Bilder werden relativ geladen).
- Headless-Tests liefen mit Playwright (Python, Chromium). Dafür wurde temporär `window.__dbg={get,update,draw,keys,startHeist,reset}` ans Ende von `start()` gehängt (im Release entfernt, bei Bedarf wieder ergänzen). Mit `__dbg.update(.05)` in Schleifen lässt sich Spielzeit schnell simulieren, mit gesetztem `__dbg.keys.e=1` Interaktionen auslösen.
- Draw-Zeit in Software-Chromium ca. 15 bis 30 ms, auf echter GPU unkritisch.

## Offene Punkte und nächster Schritt: Coop-Mehrspieler

Entscheidung (mit Till besprochen): WebRTC mit Raumcode, kein eigener Server, host-autoritativ.

1. Verbindung: PeerJS (oder Trystero). "Raum erstellen" liefert Code/Link `…#raum=XXXX`, Mitspieler tritt per Link bei. Hosting auf GitHub Pages.
2. Host simuliert alles (KI, Polizei, Kameras, Verdacht, Beute). Clients senden Tasteneingaben und Zielrichtung, Host sendet ca. 20 Hz Snapshots (Spieler, NPCs, Gegner, Kugeln, Kamera-/Tür-/Tresor-Zustand, Timer, Loot, Verdacht).
3. Refactor: Globales `p` wird zur Spielerliste. Sichtfeld (`visPoly`), Kamera, HUD und Interaktionsauswahl pro Client. KI (`flow`) läuft zum nächsten Spieler. Verdacht, Alarm und Überfallstart gelten für das Team (jeder darf F drücken, jeder Verdacht zählt).
4. Erster Schritt: Raumcode, Verbindung, zweite Figur läuft mit, noch ohne Rollenlogik. Danach Rollen (Kundschafter vs. Fahrer/Absicherer), mehr Missionen.
5. Bekannte Grenzen: Direktverbindung scheitert bei strengen NATs (dann TURN oder WebSocket-Relay, z. B. Cloudflare Workers). PeerJS-Broker ist ein öffentlicher Gratisdienst.

Weitere Ideen: Geiseln als optionales Missionselement, Shop und Kampagne mit Beute als Geld, mehr Banken/Karten, Sound, Balancing (Verdachtsraten, Zeiten sind erste Schätzungen).
