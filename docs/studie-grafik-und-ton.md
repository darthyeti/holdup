# Studie Grafik und Ton (5. November 2026)

Tills Frage: "Können wir die Grafik noch etwas aufpolieren? Ideen und Vorschläge, gern auch den Sound." Diese Studie ist eine Bestandsaufnahme mit Vorschlägen, am Spiel ist nichts gebaut. Ziel bleibt das Cyberdogs-Gefühl mit moderner, realistischer Optik bei Tageslicht.

Bilder: 30 echte Aufnahmen des Spiel-Canvas in voller Auflösung (1920 x 1088), aufgenommen mit Playwright und Chromium (`--disable-accelerated-2d-canvas`, wie die Tests) auf `index.html#debug`, im Repo verkleinert unter `docs/bilder/studie/`. Das Skript `shots.js` und die Auftragslisten `job*.json` liegen daneben, damit sich die Bilder nach einem Umbau wiederholen lassen (Vorher-Nachher). Unten steht je Befund der Dateiname.

## 1. Bestandsaufnahme Optik

### Was heute da ist (technisch)

- Drei vorgerenderte Ebenen in doppelter Auflösung: statische Ebene `st` (Boden, Wände, gebackene Schatten), Objektebene `so` (Möbel), Abziehbilder `dcv` (Blut, Brandflecken). Jedes Bild kopiert davon nur den Ausschnitt der Kamera, das ist billig.
- Sichtfeld: ein Sichtpolygon (`visPoly`) stanzt die Abdunklung `dk` aus, Rand mit 8 Pixeln halbtransparentem Strich.
- Tageszeit und Thema: Farbschleier (`LAY.theme.tint`), Dunkelgrad, Sonnenrichtung mit Lichtbahnen durch die Fenster und Staubteilchen darin (`SUNW`).
- Nacht: blauer Schleier `nd` mit einem weichen Lichtkreis um den eigenen Spieler (`CFG.night.lamp` 300), Explosionen leuchten nachts mit (`o.lt`).
- Teilchen `pt` (bis `ptMax` 900): Funken, Leuchten, Feuerball, Druckwelle, Staub, Trümmer, Rauch, dazu Brandstellen `brn`, Kamerawackeln `shk` nach Abstand (seit T2, 27. Oktober 2026).
- Leuchten über `glow()`: je Aufruf ein neuer radialer Verlauf (Mündungsfeuer, Blaulicht, Explosion, brennendes Wrack).
- Figuren: Sprites aus `chars.png` (64 Pixel gezeichnet, 6 Laufbilder, Idle, tot, geduckt), Trefferblinken über `chars_flash.png`, runder Schlagschatten als Ellipse.
- Fahrzeuge: `cars.png`, fünf Karosserien in einer Grundform, Blaulicht als zwei abwechselnde Leuchtflecken.
- Bildzeit (gemessen, Container ohne Grafikkarte, also Software-Zeichnen, nur als Relativwert): Bank Erkundung 20 ms je `draw()`, Bank Überfall mit Explosion 29 ms, Museum 30 ms, Casino nachts 31 ms. Auf einem normalen Rechner mit Grafikkarte ist das ein Bruchteil, aber der Rahmen ist nicht beliebig weit. Neue Effekte müssen Leistung mitbringen (zuerst Leuchten zwischenspeichern, siehe Vorschlag O1).

### Bewertung nach Bereichen

| Bereich | Wirkt gut | Wirkt billig | Bilder |
|---|---|---|---|
| Böden | Saubere Kacheln, Themen je Karte (Teppich im Casino, Ziegel, Fliesen) | Jede Kachel gleich, kein Schmutz, keine Abnutzung, keine Fugenvariation, Gehweg und Asphalt völlig gleichmäßig, Rasen eine Fläche | 01, 02b, 13, 16 |
| Wände | Klare Grundrisse, gut lesbar | Wandkronen flach grau mit etwas Rauschen, keine Höhe, keine Kante oben hell und unten dunkel, Fassaden außen ohne Gliederung | 02b, 08, 19 |
| Licht und Schatten | Sonnenbahnen durch die Fenster mit Staub sind das schönste Detail, Blaulicht-Schein der Streifenwagen wirkt | Schatten hart und alle gleich versetzt, kein weicher Übergang, keine Umgebungsverdeckung an Wandfüßen, das Sichtpolygon hat harte Kanten und liest sich wie Licht (die hellen Keile auf dem Gehweg in 10 sind Sicht, kein Licht) | 01, 02, 10 |
| Figuren | Lesbar, Farben je Rolle, Waffe sichtbar | Klein (rund 24 Pixel), Laufbilder kaum sichtbar (nur Füße), kein Rückstoß, kein Zucken beim Treffer außer Blinken, alle Körper gleich, die Ellipse als Schatten | 02b, 25 |
| Fahrzeuge | Blaulicht, Wrack glüht nach | Eine Grundform für alle, keine Räder, Spiegel, Lichter, Reflexe, Autos wirken wie Spielzeug, Wrack ein dunkles Rechteck | 11c, 12, 26 |
| Effekte | Mündungsfeuer mit Leuchten, Tracer, Druckwelle, Trümmer, Wackeln, Zapfsäule mit großer Explosion | Explosion ein heller Kreis mit hartem Ring, Rauch kaum sichtbar und kurz, keine aufsteigende Säule über dem Wrack, Treffer auf Personen als rosa Fleck, Glasbruch kaum sichtbar, keine Patronenhülsen | 11b, 12, 18, 19 |
| Lesbarkeit | Ziel-Hinweise (E, F) sind klar, Kegel von Kameras und Wachen gut | Meldungen oben rechts stapeln sich in bis zu zehn Zeilen über die halbe Karte, der Spieler unterscheidet sich kaum von Zivilisten | 03, 04, 06, 09 |
| HUD | Einheitlich, gut lesbar, Fahndungsleiste | Reine Monospace-Kästen, kein Symbol, HP und Munition ohne Balken, wirkt wie ein Debug-Fenster | 01, 10 |
| Menüs | Kacheln klar, Fokus deutlich, Symbole in der Auftragswahl | Gleiche Schrift wie das HUD, keine Bewegung, Hintergrund ist die abgedunkelte Karte, wenig Stimmung | 00, 20, 21, 22, 23, 24 |
| Farbpalette | Ruhig und realistisch, Tageslicht nicht übersättigt | Insgesamt grau, wenig Kontrast zwischen Boden, Wand und Figur, Akzentfarben (Gelb, Grün, Rot) nur im HUD | 01, 17 |
| Nacht | Lichtkreis um den Spieler, Blau stimmt | Keine Laternen, keine erleuchteten Fenster, keine Scheinwerfer, Casino und Museum ohne eigenes Innenlicht, Nacht wirkt nur dunkler, nicht anders | 06, 07, 14, 15 |
| Nebel | Sichtkreis ist spielerisch klar | Harte Kreiskante, flaches Grau, kein Treiben, keine Tiefe | 03, 04, 05 |

### Bilderliste

Die Bilder liegen in `docs/bilder/studie/` (verkleinert auf 960 Breite, Ausschnitte in voller Größe), dazu `shots.js` und `job*.json`, um sie nach einem Umbau für einen Vorher-Nachher-Vergleich neu aufzunehmen.

- `00-titel.jpg` Hauptmenü
- `01-bank-phase1.jpg` Bank Klassik, Erkundung außen
- `02-bank-phase1-innen.jpg`, `02b-bank-innen-ausschnitt.jpg` Kassenhalle, Ausschnitt 1:1
- `03-transporter-phase1.jpg` Transporter (Seed 5, Nebel)
- `04-juwelier-phase1.jpg` Juwelier (Seed 5, Nebel)
- `05-tankstelle-phase1.jpg` Tankstelle (Seed 5, Nebel)
- `06-museum-phase1.jpg` Museum (Seed 5, Nacht)
- `07-casino-phase1.jpg` Casino (Seed 5, Nacht)
- `08-notenbank-phase1.jpg` Notenbank (Seed 5)
- `09-gefaengnis-phase1.jpg` Gefängnis, Zelle (solo erzwungen)
- `10-bank-phase2-feuergefecht.jpg` Überfall, Welle 2, Schüsse
- `11-bank-phase2-explosion.jpg`, `11b-explosion-ausschnitt.jpg`, `11c-streifenwagen-ausschnitt.jpg` Auto explodiert, Ausschnitte
- `12-bank-phase2-rauch.jpg` 1,2 s danach: Wrack und Rauch
- `13-transporter-phase2.jpg`, `19-transporter-phase2-rauch.jpg` Streifenwagen explodiert auf dem Transporter, 2 s danach
- `14-bank-nacht.jpg` Bank mit Lage Nacht
- `15-museum-ohne-lage.jpg`, `16-casino-ohne-lage.jpg`, `17-juwelier-ohne-lage.jpg` dieselben Karten ohne Lage-Tags
- `18-tankstelle-phase2-zapfsaeule.jpg` Zapfsäule explodiert im Überfall
- `20-menue-auftragswahl.jpg`, `21-menue-shop.jpg`, `22-menue-pause.jpg`, `23-ergebnis.jpg`, `24-optionen.jpg` Menüs
- `25-sprites-figuren.jpg`, `26-sprites-autos.jpg` Ausschnitte aus `chars.jpg` und `cars.jpg`

### Fazit Optik

Das Spiel ist sauber und lesbar, aber flach. Die Szene hat kaum Höhe (Wände, Autos, Figuren liegen alle auf einer Ebene), kaum Licht außer Sonne und Blaulicht, und kaum Spuren (der Boden sieht nach dem Feuergefecht fast aus wie vorher). Die größten Hebel sind Licht und Schatten, Spuren am Boden und Wucht bei Treffern. Neue Sprites sind dafür zunächst nicht nötig.

## 2. Bestandsaufnahme Ton

- Entstehung: alles synthetisch mit WebAudio in `js/snd.js`, keine Dateien. Bausteine sind gefiltertes Rauschen (`nz`) und Oszillatoren (`tn`) mit Hüllkurve, Mischpult `sfx` und `mus` über Kompressor und tanh-Sättigung.
- Raumklang: `sp(x,y,vol)` dämpft nach Abstand (linear bis 650 Pixel, dann quadriert) und setzt Stereo nach seitlichem Versatz. Es gibt keine Verdeckung durch Wände, keinen Hall, keinen Unterschied innen und außen, keinen Tiefpass für ferne Geräusche.
- Vorhandene Klänge: Schuss eigener und fremder (zwei Arten), Scharfschütze, Treffer Wand und Körper, Tod, Schmerz, Reifen, Explosion, Blendgranate, Gas, Glas, Piepen, Tür, Nachladen, leer, Kasse, Aufheben, Schritte (nur der eigene Spieler, `stepSnd`), Entdeckt, Gefunden, Funk und Funksprüche (dazu Sprachausgabe des Browsers als Option), Chat, Ereignisse (Tresor, Unfall, Kamera, Papier, Monitor, Strom, Verweigert, Riegel, Kasse, Automat, Start), Alarm, Welle, Fluchtwagen, Sieg und Niederlage, Bohrer und Hebeln als Dauerklang.
- Musik: in der Erkundung eine Drone (zwei verstimmte Sägezähne, Tiefpass) und ein Spannungston nach Verdacht, im Überfall ein 16tel-Sequenzer (Kick, Bass, Pad, Hats, Snare, Arpeggio) in vier Stufen nach Welle, 112 bis 156 BPM. Im Menü keine Musik.
- Sirene: ein einziger Rechteckton mit zwei Höhen, Lautstärke nach dem Abstand des nächsten Streifenwagens, aber nicht im Stereofeld und nicht je Wagen.
- Fehlt: Umgebung (Stadt, Verkehr, Vögel, Klimaanlage, Raumton im Gebäude), Schritte der anderen (Wachen, Beamte, Mitspieler), Stimmen und Rufe ("Polizei!", Zivilisten schreien, Geiseln), Polizeifunk als Stimmung, Hülsen, Türen der Streifenwagen, Motoren der Streifenwagen und Autos, Glas unter den Füßen, Feuer am Wrack, Alarmglocke als Dauerklang im Gebäude, Menügeräusche (Fokus, Bestätigen), Menümusik.
- Bewertung: Das System ist technisch gut gebaut (eine Datei, keine Assets, sauber gemischt), klingt aber nach Synthesizer und nicht realistisch. Schüsse und Explosionen sind dünn im Bass und ohne Nachhall, das kostet am meisten Wucht.

## 3. Vorschläge

Alle Vorschläge sind reine Optik oder reiner Ton auf jedem Rechner für sich: kein neues Feld im Schnappschuss, kein `VER`. Was auf Ereignissen aufbaut, nutzt die bestehenden `evt`-Namen (`sh`, `es`, `hw`, `hf`, `bx`, `gl`) oder bekommt neue Namen über `evt`. Zufall für Optik darf `Math.random` nutzen (nur in der Kartenerzeugung ist `mulberry32` Pflicht), aber Böden, die in die statische Ebene gebacken werden, brauchen den Seed, damit `turn-hash` und der Abgleich Host gegen Client nicht reißen (dort `mulberry32` aus `LAY.seed`).

Tests allgemein: Die Pixel-Schnappschüsse liegen lokal (`tests/golden-local`, nicht eingecheckt: `70-menues`, `37-tankstelle-generator`, `39-juwelier-basis`, `42-museum-basis`, `43-casino-basis`, `75-bildgroesse`, `98-skillbaum-umbau`), also bricht dort nur die eigene Maschine und wird mit `node run.js --update <Name>` neu aufgenommen. Eingecheckte Hashes der statischen Ebene (`turn-hash`) und der Ebenenvergleich Host gegen Client (`TN.diffPx`, Toleranz 200 Pixel) sind betroffen, wenn sich `st` oder `so` ändern. `render.js` zeichnet nur die Draufsicht der Karte und ist von Licht und Teilchen nicht betroffen.

### Optik

**O1 Leuchten zwischenspeichern (Vorbedingung).** `glow()` erzeugt heute je Aufruf einen neuen radialen Verlauf. Stattdessen einmal je Farbe ein kleines Leuchtbild vorrendern und mit `drawImage` skaliert zeichnen. Hebt nichts sichtbar, gibt aber Leistung für alles andere frei. Aufwand klein, Risiko klein (Pixel weichen minimal ab, lokale Goldens neu), keine Assets.

**O2 Weiche Schatten und Umgebungsverdeckung.** Beim Backen der statischen Ebene unter jeder Wand und jedem Möbel einen weichen Verlauf statt eines harten Versatzes, dazu ein dunkler Saum an Wandfüßen und in Ecken. Figuren und Autos bekommen einen weichen, etwas gestreckten Schatten in Sonnenrichtung (`LAY.theme.sun`). Hebt sofort die Höhe der Szene, die Karte wirkt nicht mehr wie ein Grundriss. Aufwand mittel, Leistung neutral (gebacken), Risiko: `turn-hash` und lokale Goldens neu, Ebenenvergleich muss deterministisch bleiben. Keine Assets.

**O3 Wandkronen mit Höhe.** Oberkante hell, Kante zur Sonnenseite heller, Gegenseite dunkler, ein schmaler Streifen Wandfläche unter der Krone (falsche Perspektive, wie viele Top-down-Spiele). Macht Räume plastisch. Aufwand mittel, Risiko wie O2, keine Assets.

**O4 Bodendetails aus dem Seed.** Je Kachel leichte Helligkeitsstreuung, Fugen unregelmäßig, Flecken, Risse, Gullydeckel, Ölflecken auf der Straße, Laub und Kippen auf dem Gehweg, Rasen mit zwei Grüntönen und Halmen, Teppichabnutzung vor Tresen und Türen. Alles in die statische Ebene gebacken, Zufall aus `mulberry32(LAY.seed)`. Nimmt die Sterilität. Aufwand klein bis mittel, Leistung neutral, Risiko wie O2. Keine Assets nötig, später optional CC0-Texturen.

**O5 Spuren, die bleiben.** Einschusslöcher an Wänden (`hw`), Blutlachen statt rosa Fleck (`hf`, dunkelrot, weich, wächst kurz), Glassplitter am Boden (`gl`, glitzern im Sonnenlicht), Patronenhülsen beim Schießen (kleine Teilchen, die liegen bleiben und nach dem Auftrag gelöscht werden), Reifenspuren beim Bremsen der Streifenwagen, Rußfahnen an Wänden nach Explosionen. Alles in `dcv` gemalt, mit Obergrenze. Nach einem Feuergefecht sieht man, was passiert ist, das ist viel Cyberdogs-Gefühl. Aufwand klein, Leistung neutral (Abziehbilder), Risiko: Coop zeigt Spuren nur, wenn die Ereignisse ankommen (das tun sie heute schon für Ton und Funken), keine Netzänderung. Keine Assets.

**O6 Treffer mit Wucht.** Kurzes Kamerawackeln beim eigenen Schuss (klein) und bei eigenem Treffer (stärker), roter Rand am Bildschirm bei Schaden, Rückstoß der Waffe am Sprite (zwei Pixel zurück), Gegner zucken in Trefferrichtung, Mündungsfeuer mit drei Varianten und Rauchwölkchen, Hülsenauswurf. Wenige Zeilen, viel Gefühl. Aufwand klein, Risiko: Spielgefühl (Label `spielgefuehl`), Wackeln abschaltbar für empfindliche Spieler. Keine Assets.

**O7 Licht-Ebene.** Eine zusätzliche Leinwand in halber Auflösung, auf die jedes Bild alle Lichter additiv gemalt werden (Mündungsfeuer, Blaulicht, Feuer, Lampen, Monitore, Leuchtreklame), dann mit `multiply` oder `screen` über die Szene. Bei Tag nur leicht, nachts und in Innenräumen deutlich. Damit werden Nacht und Casino wirklich anders, nicht nur dunkler. Aufwand mittel, Leistung: eine Leinwand mehr je Bild, in halber Auflösung vertretbar, auf "niedrig" aus. Risiko: lokale Goldens, sonst keins. Keine Assets.

**O8 Nacht mit Lichtquellen.** Straßenlaternen mit Lichtkegel am Gehweg, erleuchtete Fenster als warme Rechtecke auf dem Boden davor, Scheinwerfer der Streifenwagen und des Fluchtwagens, Taschenlampenkegel der Wachen (passt zum Sichtkegel), Monitore und Notausgangsschilder in Gebäuden. Setzt O7 voraus. Aufwand mittel, Risiko: Balance, wenn Licht die Sicht beeinflussen soll (zuerst nur Optik, Sichtregeln bleiben). Keine Assets.

**O9 Sichtkante weich.** Die Abdunklung `dk` in halber Auflösung zeichnen und mit einem weichen Rand hochskalieren (oder zwei Polygone, eins leicht verkleinert, mit Verlauf). Die harte Kante liest sich heute wie Licht. Aufwand klein, Leistung: günstiger als heute, wenn in halber Auflösung. Risiko: lokale Goldens, sonst keins. Keine Assets.

**O10 Rauch und Feuer.** Aufsteigende Rauchsäule über brennenden Wracks (zehn bis zwanzig große, weiche Teilchen, die mit dem Wind treiben), Rauchgranate als dichte, wabernde Wolke statt Kreisen, Feuerzungen am Wrack, Funkenflug. Explosion: Feuerball ohne harten Ring, kurzer weißer Blitz auf dem ganzen Bild, Brandfleck mit ausgefranstem Rand. Aufwand mittel, Leistung: Teilchenzahl je Qualität begrenzen (`ptMax`). Risiko: klein. Keine Assets (weiche Teilchen aus einem vorgerenderten Bild wie O1).

**O11 Nebel mit Tiefe.** Statt eines grauen Kreises zwei bis drei langsam ziehende Nebelschichten (vorgerendertes Rauschbild, verschoben) und eine weiche Kante. Aufwand klein, Leistung: zwei Bilder mehr, auf "niedrig" der heutige Kreis. Keine Assets.

**O12 Figuren lebendiger.** Ohne neue Sprites: Wippen beim Laufen (Skalierung 1 bis 3 %), Arme schwingen über eine Verdrehung, Kopf blickt leicht in Zielrichtung vor dem Körper, Sterbeanimation in drei Bildern statt Umschalten. Mit neuen Sprites: größere Figuren (32 statt 24 Pixel sichtbar), mehr Laufbilder, eigene Silhouetten je Rolle (Polizei mit Mütze, SWAT mit Helm, Zivilisten mit Taschen), Räuber mit klarer Akzentfarbe, damit der Spieler sich sofort findet. Aufwand ohne Sprites klein, mit Sprites groß. Risiko: Figurengröße ändert Trefferflächen nicht (nur Optik), wirkt aber auf das Gefühl (`spielgefuehl`).

**O13 Fahrzeuge.** `gen_sprites.py` zeichnet die Autos neu: mehrere Karosserien (Limousine, Kombi, Kleinwagen, Transporter), Räder sichtbar, Scheiben mit Spiegelung, Scheinwerfer und Rücklichter, Dachbalken mit Lichtern, Wrack als eigenes Bild (verkohlt, Scheiben weg). Aufwand mittel, keine fremden Assets. Risiko: Größen in `cars.png` nicht ändern, sonst Kollision und Stempel prüfen.

**O14 HUD und Menüs.** Eigene Schrift (eine freie Schrift unter SIL Open Font License, lokal in `assets/` statt Google, damit es ohne Netz läuft), Balken für HP und Panzerung, Munition als Symbol, Meldungen höchstens drei Zeilen und verblassend, die langen Auftragstexte nur beim Start als Karte in der Mitte, Kacheln mit leichtem Hereinschieben und Tönen. Hintergrund im Titel mit langsamer Kamerafahrt über eine lebende Karte (Zivilisten laufen). Aufwand mittel, Risiko: `70-menues` hat 36 Pixel-Schnappschüsse (lokal neu aufnehmen), `UI_API` nur bei Kontextänderung. Asset: eine Schriftdatei.

**O15 Farbkorrektur je Thema.** Ein abschließender Farbschleier je Tageszeit und Karte gibt es schon (`tint`). Ausbauen zu Lichtfarbe (warm am Abend, kalt nachts) plus leichter Vignette und etwas mehr Kontrast. Aufwand klein, Leistung: ein Rechteck mehr. Keine Assets.

### Ton

**T1 Schuss und Explosion mit Körper.** Jeder Schuss bekommt einen tiefen Schlag (40 bis 80 Hz, sehr kurz) und eine kurze Hallfahne, jede Explosion einen langen Tiefton, Nachgrollen und Trümmerprasseln (Rauschen mit Zufallsklicks). Waffen klingen verschieden (Pistole, SMG, Sturmgewehr, Gewehr). Aufwand klein, Risiko: Pegel prüfen (Kompressor), keine Assets.

**T2 Hall in Innenräumen.** Ein `ConvolverNode` mit selbst erzeugter Impulsantwort (abklingendes Rauschen, keine Datei), zwei Räume: drinnen (kurz, 0,6 s, Halle, Tresor), draußen (sehr kurz, Hauswand-Echo). Jeder Klang geht anteilig in den Hall, je nachdem ob Quelle und Hörer drinnen sind (aus `LAY.bld` oder Raster). Aufwand klein bis mittel, Leistung: ein bis zwei Faltungen, vertretbar, auf "niedrig" aus. Keine Assets.

**T3 Verdeckung durch Wände.** Liegt eine Wand zwischen Quelle und Hörer (`los`), bekommt der Klang einen Tiefpass und wird leiser. Ferne Schüsse dumpf, nahe scharf. Hilft auch der Orientierung (wo schießt die Polizei). Aufwand klein, Leistung: ein `los` je Klang, gedrosselt. Keine Assets.

**T4 Umgebung.** Leiser Dauerklang je Karte und Ort: draußen Stadt (Verkehrsrauschen, ferne Hupe, Vögel bei Tag, Grillen nachts), drinnen Raumton (Klimaanlage, Kühlschrank in der Tankstelle, Spielautomaten und Gemurmel im Casino, Stille und Uhrticken im Museum). Alles synthetisch möglich, besser mit freien Aufnahmen. Aufwand klein (synthetisch) bis mittel (mit Dateien), Leistung klein. Risiko: Ladezeit bei Dateien.

**T5 Schritte und Stimmen der anderen.** Schritte der Wachen und Beamten räumlich (Untergrund: Fliese, Teppich, Asphalt), Mitspieler im Coop ebenso. Kurze Rufe als Ton oder über die Sprachausgabe, die der Funk schon nutzt ("Polizei, Hände hoch!", Schreie der Zivilisten bei Alarm, "Mann am Boden"). Gibt dem Schleichen Spannung. Aufwand mittel, Risiko: Sprachausgabe klingt je Browser verschieden, besser freie Aufnahmen. Assets optional.

**T6 Sirene je Wagen, Polizeifunk.** Jeder Streifenwagen eine eigene Sirene mit Doppler-Andeutung (Tonhöhe leicht mit Annäherung) und Stereo, beim Anhalten Türenschlagen, Motor bei Fahrt. Im Überfall leiser Polizeifunk als Stimmung (gefiltertes Sprachrauschen, Piepser). Aufwand klein bis mittel, keine Assets nötig.

**T7 Musikschichten nach Phase und Fahndung.** Der Sequenzer ist schon da. Ausbau: in der Erkundung ein ruhiges Grundmuster statt nur Drone (Bass, gedämpfte Akkorde), das bei Verdacht Schichten dazunimmt, beim Alarm ein Übergang (Trommelwirbel, dann Takt eins der Überfall-Musik), die Fahndungsstufe (`SESSION.heat`) hebt Tempo und Dichte, ein ruhiger Ausklang beim Einsteigen in den Fluchtwagen, ein eigenes Thema im Titel und Shop. Aufwand mittel (synthetisch), Risiko: Musik ist Geschmack, darum Regler und eigene Abschaltung. Alternativ freie Musikstücke in Schichten (Stems), die übereinander geblendet werden.

**T8 Menütöne.** Fokus, Bestätigen, Zurück, Kauf, gesperrt. Aufwand klein, keine Assets.

### Optik-Regler (Qualität niedrig, mittel, hoch)

Ein Objekt `GFX` neben `VIEW` (gespeichert unter `localStorage` `holdup.gfx`), Kachel in den Optionen, Voreinstellung mittel, nur Optik, die Spiellogik kennt ihn nicht.

| Stufe | Licht und Schatten | Teilchen und Spuren | Nebel und Nacht | Ton |
|---|---|---|---|---|
| niedrig | gebackene weiche Schatten (O2 kostet nichts), keine Licht-Ebene, Sichtkante wie heute | `ptMax` 250, keine Hülsen, Spuren höchstens 100 | heutiger Kreis | kein Hall, keine Verdeckung |
| mittel | Licht-Ebene in viertel Auflösung, weiche Sichtkante | `ptMax` 600, Spuren 400 | eine Nebelschicht, Laternen | Hall, Verdeckung |
| hoch | Licht-Ebene in halber Auflösung, Vignette | `ptMax` 900, Rauchsäulen, Spuren 1000 | zwei Nebelschichten, alle Lichter | Hall, Verdeckung, Umgebung je Raum |

Dazu eine Selbstprüfung: Liegt die Bildzeit (heute schon in `LOG.cost` gemessen) über 10 Sekunden lang über 20 ms, schlägt das Spiel einmal vor, eine Stufe herunterzugehen. Die Tests laufen auf einer festen Stufe (in `tests/lib.js` setzen), damit Pixel-Goldens stabil bleiben.

### Assets und Lizenzen

- Für die Pakete A bis C sind keine fremden Assets nötig, alles lässt sich zeichnen und synthetisch erzeugen (`gen_sprites.py`, WebAudio).
- Wenn Assets, dann nur CC0: Grafik und Texturen zum Beispiel von Kenney (kenney.nl, alles CC0), OpenGameArt mit Filter CC0, Texturen mit Filter CC0 auf ambientCG oder Poly Haven. Ton von Freesound nur mit Filter "Creative Commons 0", Musik von OpenGameArt mit Filter CC0. Keine Marken, Logos oder Fahrzeugmodelle echter Hersteller, kein Nachbau existierender Spiele.
- Schrift: freie Schrift unter SIL Open Font License, Datei lokal in `assets/`.
- Größe: Tondateien als OGG und MP3 (Safari), alles zusammen unter 3 MB halten, nachladen nach dem Start, ohne Datei spielt die Synthese weiter (wie bei PeerJS: fehlt die Datei, bleibt das Spiel spielbar).
- Jede fremde Datei mit Quelle und Lizenz in `docs/assets-und-dateien.md`.

## 4. Pakete und Reihenfolge

**Paket A: Schnelle Gewinne (Empfehlung: zuerst).** O1 Leuchten zwischenspeichern, O5 Spuren, O6 Treffer mit Wucht, O9 weiche Sichtkante, O15 Farbkorrektur, T1 Schuss und Explosion mit Körper, T3 Verdeckung, T8 Menütöne, dazu der Optik-Regler als Gerüst. Aufwand: zwei bis drei kleine Tickets, keine Assets, kein Netz. Wirkung: Feuergefechte fühlen sich sofort härter an. Label `spielgefuehl`, Vorschau unter `/pr/<n>/`. **Stand 5. November 2026: A1 gebaut (#118)**: Regler `GFX`, O1, O9, O15 (ohne Kontrast), siehe docs/spielsystem.md, Optik-Regler. Offen in Paket A: O5, O6, T1, T3, T8 (#119, #120).

**Paket B: Licht und Höhe (danach).** O2 weiche Schatten, O3 Wandkronen, O4 Bodendetails, O7 Licht-Ebene, T2 Hall. Vorher Auslagern Schritt 4 (`js/draw.js`, docs/ideen-und-planung.md) mit einem Pixel-Hash-Test je Szenario und Phase, damit die Optik-Arbeit nicht mit jedem anderen PR in `start()` kollidiert. Aufwand: mittel, berührt die statische Ebene (`turn-hash`, Ebenenvergleich), deshalb `voller-lauf`.

**Paket C: Nacht, Nebel und Stimmung.** O8 Nacht mit Lichtquellen, O10 Rauch und Feuer, O11 Nebel, T4 Umgebung, T6 Sirene und Funk, T7 Musikschichten. Aufwand: mittel, baut auf O7 auf.

**Paket D: Neue Figuren und Fahrzeuge (nur nach Tills Stilentscheidung).** O12 Figuren mit neuen Sprites, O13 Fahrzeuge, O14 HUD und Menüs mit eigener Schrift, T5 Stimmen. Aufwand: groß, hier entscheidet der Stil.

Empfehlung: A sofort, B direkt danach, C nach Tills Spieltest von B, D erst nach der Stilentscheidung. A und B ändern nichts an der Spiellogik und lassen sich jederzeit mit dem Regler zurücknehmen.

### Top 5 nach Wirkung je Aufwand

1. O5 Spuren, die bleiben (Einschüsse, Blut, Glas, Hülsen, Ruß): klein, sichtbar in jeder Runde.
2. O6 und T1 Treffer und Schuss mit Wucht (Wackeln, Rückstoß, Bass, Hall): klein, das Spielgefühl springt.
3. O2 und O3 weiche Schatten und Wandkronen: mittel, die Karte bekommt Höhe.
4. O7 und O8 Licht-Ebene mit Nachtlichtern: mittel, Nacht, Casino und Museum werden eigene Orte.
5. T2 und T3 Hall und Verdeckung: klein bis mittel, Innenräume klingen nach Raum, die Polizei ist hörbar zu orten.

## 5. Entscheidungen für Till

1. Stil: realistisch (Licht, weiche Schatten, gedeckte Farben, wie heute angelegt) oder comichaft (Konturen, kräftige Farben, wie im alten Projekt wardogs)? Die Pakete A bis C passen zu beiden, D hängt davon ab.
2. Musik: ja oder nein, und wenn ja, synthetisch weiterbauen (eigener Klang, keine Dateien) oder freie Stücke in Schichten?
3. Assets: alles selbst erzeugt (heute, ohne Lizenzfragen) oder freie CC0-Dateien für Ton und Texturen (realistischer, mehr Ladezeit, Pflege der Quellen)?
4. Wucht gegen Lesbarkeit: Wie viel Kamerawackeln, Blut und Rauch ist gewollt? Vorschlag: mittel als Standard, abschaltbar.
5. Figurengröße: bleiben die Figuren klein (Übersicht, Cyberdogs) oder werden sie größer (Detail, weniger Überblick)?
6. Meldungen: Dürfen die langen Auftragstexte aus der Ecke oben rechts in eine Startkarte wandern (weniger Text im Bild)?
7. Qualitätsregler: Voreinstellung mittel, und soll das Spiel bei Ruckeln selbst eine Stufe herunter vorschlagen?

Tills Antworten vom 5. November 2026: (1) Stil realistisch. (2) Musik erzeugt, in Schichten (Paket C). (3) Geräusche später als CC0-Aufnahmen, Grafik selbst erzeugt. (4) Wackeln, Blut und Rauch mittel und einzeln abschaltbar. (5) Figurengröße bleibt. Reihenfolge: Paket A sofort (#118, #119 nach #118, #120). (7) Regler voreingestellt mittel; ob das Spiel bei Ruckeln selbst eine Stufe herunter vorschlägt, ist offen und wird nicht gebaut. Frage 6 (Startkarte) bleibt offen.
