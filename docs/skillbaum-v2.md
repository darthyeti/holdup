# Skillbaum v2 (Entwurf und Plan, 17. November 2026)

Anlass: Coop-Log Build 334 (17. November 2026) und Tills Eindruck: Die Wurzeln auf Stufe 3 sind Pflichtkäufe (jeder hatte Munition 3), das Präzisionsgewehr ist schwach, der Granatwerfer hat zu wenig Munition, Barrikaden-Mine und Claymore sind zu ähnlich, der Techniker ist schwächer als die Verteidigung, Barrikaden baut man im Coop fast nur in der Notenbank. Till wollte einen neuen Entwurf mit großen Schritten.

Entscheidungen von Till (17. November 2026, Chat): Aufteilung Schütze, Stellung, Spezialist passt. Mine streichen, Claymore behalten. Präzisionsgewehr mit rechter Maustaste. Techniker-Gegenstand C4 mit Türen, dazu Wände einreißen. Alles in einem Zug umsetzen.

Vom Leitstand festgelegt (Till kann es kippen): Sprengbar sind Innenwände und Außenwände des Gebäudes, nicht die Wände um den Tresor (sonst ist der Tresor umgangen) und nicht der Kartenrand.

## Grundregeln

1. Ein Punkt in der Wurzel öffnet beide Pfade dahinter (`skNeed` verlangt Stufe 1 statt `CFG.skill.max`). Der Gegenstand braucht weiter seinen Pfad auf Stufe 3.
2. Drei Bäume mit Rolle im Coop: Schütze (Schaden), Stellung (Gelände halten), Spezialist (Team und Technik).
3. Bleibt: Entweder-oder zwischen den Pfaden eines Baums, Gegenstand hinter dem Pfad, Bonus auf Stufe 3, Stufen 1 bis 3, Rücksetzen bei Niederlage, Zurücknehmen im laufenden Shop-Besuch.
4. Ein Gegenstand je Baum, eine Taste je Baum: Schütze rechte Maustaste (vorher Shift), Stellung Taste 3, Spezialist C (Koffer) beziehungsweise E (C4).
5. Knoten-IDs bleiben (`A0` bis `U4`), damit Kit, Netz und Tests stabil bleiben. Laufende Serien: Wer beim Laden der neuen Version Punkte auf einem umgebauten Knoten hat, bekommt sie zurück (nur im Speicher, `SESSION` überlebt kein Neuladen, das betrifft also nur den Wechsel im laufenden Coop nicht).

## Schütze (Baum A)

| ID | Knoten | Stufe 1 / 2 / 3 | Bonus Stufe 3 |
|---|---|---|---|
| A0 | Waffenkunde (Wurzel) | Reserve +25/50/75 %, Nachladen 5/10/15 % schneller | |
| A1 | Ruhige Hand | Streuung -10/20/30 % | Läufer (bleibt) |
| A3 | Präzisionsgewehr | 4/6/8 Schuss je Auftrag | Ziel wird fürs Team markiert |
| A2 | Durchschlag | Schaden gegen Schilde +20/40/60 % | Durchschuss (bleibt) |
| A4 | Granatwerfer | 3/5/7 Granaten je Auftrag | |

Präzisionsgewehr neu: rechte Maustaste halten legt an (Sicht zoomt etwas heraus, Ziellinie), Linksklick schießt, Loslassen beendet. Shift ist wieder nur Schleichen. Ein Treffer schaltet jeden Gegner aus (auch SWAT und Schild), durchschlägt Gegner, Schilde und Fenster. Markierung (Stufe 3): der getroffene oder anvisierte Gegner leuchtet für das Team kurz auf. Der Granatwerfer bekommt dieselbe Bedienung (rechte Maustaste halten, Klick feuert), das Entweder-oder verhindert beide.

## Stellung (Baum V, bisher Verteidigung)

| ID | Knoten | Stufe 1 / 2 / 3 | Bonus Stufe 3 |
|---|---|---|---|
| V0 | Panzerung (Wurzel) | Weste verschleißt 25/50/75 % langsamer | |
| V1 | Bollwerk | Barrikaden 20/35/50 % schneller, beim Lehnen 25/35/45 % weniger Schaden | Zäh |
| V3 | Feldbarrikade | 2/3/4 Stück je Auftrag | |
| V2 | Sprengmeister | Claymore 1/2/3 Stück je Auftrag (Taste 3) | Claymore auch an eigenen Barrikaden (das war die Mine) |
| V4 | Selbstschuss-MG | 1/1/2 Stück, 40/60/80 Schuss | |

- Barrikaden-Mine entfällt als eigener Gegenstand, die Claymore übernimmt sie auf Stufe 3.
- Deckung (Lehnen) und Zäh gehören jetzt zum Bollwerk, Baumeister und Sammler gehen darin auf (Sammler entfällt).
- Feldbarrikade: Taste 3 stellt auf freien Boden eine tragbare Deckung (eine Kachel `X`, wie eine Barrikade: solide, sichtdurchlässig, kugelsperrend, lehnbar, zerschießbar), kein Material nötig, nur im Überfall. Nicht auf der Fahrspur (`LANE`), nicht vor Türen und Toren, nicht in der Fluchtzone, nicht auf Wagenplätzen (gleiche Regel wie `vanCells`).
- Sprengmeister: Taste 3 legt die Claymore wie heute. Hat ein Spieler Sprengmeister und Selbstschuss-MG, wählt Taste 3 kurz die Claymore, Taste 3 halten das MG (oder: Q schaltet um; Entwickler entscheidet, Hauptsache klar im HUD).
- Selbstschuss-MG: steht auf freiem Boden, Blickrichtung beim Aufstellen, Kegel 90 Grad, Reichweite rund 260 px, Feuerrate deutlich unter der SMG, Schaden je Kugel wie SMG. Trifft keine Mitspieler, Geiseln und Zivilisten im Kegel schon (es schießt nur, wenn ein Beamter im Kegel ist). HP rund 120, die Polizei nimmt es als Ziel (Rang nach den Spielern), ist die Munition leer, bleibt es stehen und tut nichts. Netz: neues Objekt im Schnappschuss (`VER` erhöhen), Ereignisse über `evt`.

## Spezialist (Baum U, bisher Unterstützung)

| ID | Knoten | Stufe 1 / 2 / 3 | Bonus Stufe 3 |
|---|---|---|---|
| U0 | Werkzeug (Wurzel) | +Störsender, +Ablenker je Auftrag (wie heute) | |
| U1 | Sanitäter | Wiederbeleben 25/40/55 % schneller | Verhandler (bleibt) |
| U3 | Notfallkoffer | bleibt | |
| U2 | Techniker | Funk abhören: die nächste Polizeiwelle steht im HUD (Countdown und Richtung), 10/15/20 s bevor sie da ist; dazu Verdacht langsamer, Dietrich schneller (wie heute) | Fahrer (bleibt) |
| U4 | C4 | 1/1/2 Stück je Auftrag: Tresor und Laderaum wie heute, neu auch verschlossene Türen und Gitter (Hintertüren `L`, Gefängnis-Gitter und Zellentüren) und Wände | |

- Funk abhören wirkt für das ganze Team (alle sehen die Anzeige, sobald ein Spieler mit Techniker lebt).
- Wände sprengen: E an einer Wandkachel `#` mit Vorrat. Sprengbar: Wände des Gebäudes (Innen und Außen), nicht die Wände, die an den Tresorraum grenzen (Kacheln rund um `LAY.vault`), nicht der Kartenrand, nicht Wände, hinter denen kein begehbarer Boden liegt. Die Wand wird zu Boden mit Schutt (Optik), Licht, Sicht und Wege passen sich an (statische Ebene neu zeichnen nur für die betroffene Stelle, siehe `groundSame` aus #270). Laut: löst im Erkunden sofort den Alarm aus wie C4 am Tresor.

## Umsetzung

Alles auf der Sammel-Branch `claude/skillbaum-v2`, ein PR nach `main` mit `spielgefuehl` und `voller-lauf`, Vorschau unter `/pr/<n>/`. Teil-Tickets mit eigener Branch von der Sammel-Branch, der Leitstand führt sie zusammen.

1. Schritt 1 (Ticket Baum-Daten): neue Namen und Texte aller Bäume und Knoten in `CFG.skill` und `js/ui.js`, Eintritt ab Stufe 1, Waffenkunde, Granatwerfer 3/5/7, Präzisionsgewehr 4/6/8, neue Gegenstände als `soon` bis zu ihrem Ticket, Punkte-Rückgabe, Tests anpassen.
2. Präzisionsgewehr und Granatwerfer: rechte Maustaste, Ein-Treffer, Markierung.
3. Spezialist: Funk abhören, C4 für Türen, Gitter und Wände.
4. Stellung: Claymore übernimmt Mine, Bollwerk, Feldbarrikade.
5. Selbstschuss-MG (nach 4, gleiche Taste).

Messung danach: Flugschreiber (`nutz`, `nutzsumme`, seit #285) im nächsten Coop-Log.

## Stand

- Schritt 1 (#287, Branch `claude/287-skillbaum-daten`): gebaut. `CFG.skill`: Bäume Schütze, Stellung, Spezialist, alle Knoten mit neuen Namen, Texten und Werten. Eintritt: `skNeedR(id)` (Pfad braucht die Wurzel auf Stufe 1, Gegenstand seinen Pfad auf 3), `skCanSell` bleibt strikt (erst den Pfad zurücknehmen, dann die Wurzel). A0 Waffenkunde (Reserve 25/50/75 %, Nachladen 5/10/15 %, `skv(...,'A0','rl')` wirkt dort, wo A1 vorher Nachladen gab, A1 hat nur noch Streuung). A3 Gewehr 4/6/8, A4 Werfer 3/5/7, Texte nennen `Rechte Maus`. V1 Bollwerk: Bauen 20/35/50 %, Lehnen 25/35/45 % weniger Schaden, Zäh in Stufe 3 (die Werte `lean`, `lo`, `lf` stehen jetzt in V1, Sammler ist weg, `mat` gibt es nicht mehr). V2 Sprengmeister: Claymore 1/2/3 (`trapKind` liefert nur noch `claw` aus V2, `mkPl` zählt `trap` aus V2). Der Zusatz `Mine` (Claymore an Barrikaden) ist nur Text, die Mine-Logik (`trapSpot` `mine`) läuft ungenutzt weiter, bis #290 sie umbaut, ihre Tests entfielen. V3 Feldbarrikade (2/3/4) und V4 Selbstschuss-MG (1/1/2, 40/60/80 Schuss) sind `soon` (nicht kaufbar). U2 Techniker: Text und Wert `ear` 10/15/20 (Funk abhören, Wirkung baut #289), U4 C4: `cnt` 1/1/2, Text nennt Türen, Gitter, Wände (Verhalten #289). Punkte-Rückgabe: `skMigrate()` (in `reset()`), ein `SESSION` ohne `skv` 2 bekommt die Punkte auf V2, V3, V4 zurück; `SESSION_G` und `sessReset` setzen `skv:2`. `UI_API` unverändert. Tests angepasst: 93, 98, 99-c4, 99-spezialwaffen, 99-sprengfalle (Mine-Tests entfernt).
- Schritt 2 (#288, Branch `claude/288-spezialwaffen`): gebaut. Rechte Maustaste (`spwHold`), Ein-Treffer-Gewehr (`CFG.spw.rifle.dmg` 1000), Durchschlag durch Fenster, Markierung Stufe 3 (Ereignis `mk`, `CFG.spw.rifle.mkT`/`mkR`), Zoom nur in 3D (`CFG.spw.zoom`). Offen für Schritt 1 (#287): Skilltexte von A3/A4 nennen noch `Shift:` (Test 98 prüft diese Texte).
- Schritt 3 (Spezialist, Ticket 289) gebaut auf `claude/289-techniker-c4`: Funk abhören (`CFG.funkAb`, HUD-Plakette), C4 an Türen, Gittern, Wänden (`CFG.c4x`), `VER` 86, `DRAW_API` 11. Einzelheiten in docs/spielsystem.md (Absatz C4). Der Vorrat 1/1/2 kommt aus `CFG.skill.U4.cnt` (Ticket 287), dort wird nur gelesen.
- Schritt 4 (#290, Branch `claude/290-stellung`): gebaut. V2 Sprengmeister Stufe 3: Taste 3 an einer eigenen Barrikade legt die Claymore als Barrikaden-Falle (alte Mine-Logik, `trapSpot` liefert `k` `mine`), sonst Claymore auf freiem Boden. V3 Feldbarrikade (2/3/4, nicht mehr `soon`): Taste 3 stellt eine Kachel `X` (`fieldSpot`, Liste `fbs`, `CFG.field` hp 120 und Fahrspurbreite 48), nicht auf Fahrspur, Wagenplätzen, Halteplatz, Fluchtzone, nicht in oder vor Türen, nicht auf Figuren. Polizeikugeln zerschießen sie, Spielerkugeln nicht. Netz: Schnappschuss `fb`, `VER` 87. Tests `99-feldbarrikade`, `99-sprengfalle`. V2 und V3 liegen in verschiedenen Pfaden (Entweder-oder), Taste 3 ist eindeutig; V4 (MG, #291) liegt hinter V2 und teilt sich Taste 3 mit der Claymore, dafür braucht `trapKind` dann eine Wahl.
