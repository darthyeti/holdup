# Bugfix-Pläne

Hier stehen Fehler und Verhaltenswünsche, die Till im Spiel findet, als Pakete mit versioniertem Plan. Pakete mit Plan sind für größere oder riskante Fehler, gebaut wird erst auf Tills ausdrückliches Go, nie nebenbei. Kleine Fehler, die Till meldet (zum Beispiel ein überlagerter Text im HUD oder die Platzregel der Mine am 26. Oktober 2026), werden direkt behoben und mit Test und Doku in der Themendatei festgehalten, ohne Paket. Commit nur auf Zuruf.

## Regeln

- **Paket:** Eine laufende Nummer (P1, P2, ...) für Fehler, die denselben Code berühren und zusammen gebaut werden. Fehler in anderem Code bekommen ein eigenes Paket, damit zwei Pakete in parallelen Sitzungen laufen können, ohne in `index.html` zu kollidieren.
- **Bugs:** Je Fehler eine Nummer (B1, B2, ...) mit Datum und Tills Beschreibung, dazu der Befund mit Messwerten und dem Messverfahren.
- **Plan:** Versioniert (v1, v2, ...). Kommt ein Fehler dazu, steigt die Version, und das Änderungsprotokoll nennt in einer Zeile, was neu ist. Frühere Fassungen stehen in der Git-Historie dieser Datei.
- **Status:** gesammelt, Plan steht, freigegeben, gebaut (Commit), gespielt, abgenommen.
- **Bau:** Ein Paket wird als ein Commit `Paket Pn: ...` gebaut (in Cloud-Sitzungen auf einer eigenen Branch `claude/paket-pn`). Test zuerst (rot), dann Code, volle Läufe und Gegenproben, Doku in der Themendatei. Nach Tills Spieltest trägt der Status "abgenommen" und das Datum.

## Übersicht

| Paket | Thema | Plan | Status |
|---|---|---|---|
| P1 | Tankstelle: zu enge Verkaufsräume | v1.1 (24. Oktober 2026) | abgenommen (24. Oktober 2026, Till hat gespielt: passt) |
| P2 | Runde endet sofort mit Brettersatz im Kit | v1.1 (24. Oktober 2026) | abgenommen (25. Oktober 2026, Till hat gespielt: funktioniert) |
| P3 | HUD: Lage-Tags fallen weg, wenn es zu viele sind | v1.1 (25. Oktober 2026) | abgenommen (25. Oktober 2026, Till hat gespielt) |
| P4 | Balancing-Patch 1 (Sammlung von Tills Punkten) | S1 bis S3 mit Befund | gebaut (26. Oktober 2026), wartet auf Tills Spieltest (Till ergänzt weitere Punkte) |
| P5 | Geiselschild: Beamter klebt am Spieler | v1 (26. Oktober 2026) | gebaut (26. Oktober 2026), wartet auf Tills Spieltest |
| P6 | Coop: Serienstand im neuen Raum und Mitspieler entfernen | v1.1 (26. Oktober 2026) | Plan steht, wartet auf Tills Go (zusammen mit P4 bauen) |

## P1 Tankstelle: zu enge Verkaufsräume

**Bugs**
- B1 (24. Oktober 2026, Till): Bei einem sehr kleinen Gebäude wird es auf der Tankstelle zu eng. Screenshot: Halle Gänge, Breite 12, Tiefe 3, Straße im Westen, zwei Wachen im Gang.

**Begriffe**
- Hülle: die Maße des Gebäudes (Breite `sw` 12 bis 18, Tiefe `sd` 3 bis 5, Zeile der Fluchttür `er`, Zahl der Zapfsäuleninseln `np`, Seite `ps`). Der Generator (`gasParams`, `gasLayout`, `genGas`) würfelt sie aus dem Seed.
- Klassik-Hülle: die handgebaute Tankstelle von vor Sprint 6 (Breite 14, Tiefe 4, Fluchttür Zeile 7, zwei Inseln, `CLASSICGP`). Sie kommt bei 10 % der Karten (`CFG.gasGen.classic`) direkt, bei zufällig gleichen Maßen (etwa 1,3 % der übrigen) und als Rückfall nach 30 erfolglosen Versuchen, immer ohne `validateMap`. Der Test `37-tankstelle-generator` beweist, dass sie Zeichen für Zeichen die alte Karte ergibt.
- Regalmuster: die Einrichtung (Klassik, Insel, Wandregale, Gänge, `GS_SHOPS`), immer aus dem Seed, unabhängig von der Hülle. "Klassik" heißt also zweimal etwas: Hülle und Muster.

**Befund** (gemessen am 24. Oktober 2026 mit Wegwerf-Skripten im echten Spiel: alle 84 Kombinationen aus Breite 12 bis 18, Tiefe 3 bis 5 und vier Mustern über `genGas`, dazu Aufzeichnung der Wachen für 12 Karten):
- Der Screenshot ist Gänge, Breite 12, Tiefe 3: 28 freie Kacheln, 46 % davon in einem Gang von einer Kachel Breite (Regale 1x2 an der Fensterseite lassen eine Gasse über die ganze Länge und 1 Kachel breite Nischen). 5 Figuren (Wache, Kassierer, Zivilisten) und bis zu 4 Kameras teilen sich die Fläche.
- Freie Kacheln im Mittel: Tiefe 3 etwa 37, Tiefe 4 etwa 52, Tiefe 5 etwa 67. Anteil der Kacheln ohne 2x2-Platz: Gänge 0,30 (Tiefe 3), 0,34 (4), 0,17 (5), Klassik 0,45 (3), 0,16 (4), 0,12 (5), Insel höchstens 0,16, Wandregale höchstens 0,03.
- Zu eng (keine 2 Kacheln breite Verbindung von der Vordertür zur Fluchttür): Gänge bei Tiefe 3 und 4 (alle Breiten) und teils bei Tiefe 5, Klassik bei Tiefe 3, Insel und Wandregale nie. Das sind 21 von 84 Kombinationen (25 %) der erzeugten Karten, dazu "Gänge auf der Klassik-Hülle" (etwa 2,5 % aller Karten).
- `validateMap` kennt nur Erreichbarkeit, keine Breite: alle 84 Kombinationen sind gültig.
- Kein Problem des Versteckens: Der Anteil der Zeit ohne Sicht von Wache und Kassierer an den Regalen liegt bei Tiefe 3, 4 und 5 fast gleich (67 bis 89 %), ein 5-s-Fenster ohne Sicht gibt es bei 78 bis 100 % der Stellen (mit Kameras 52 bis 78 %). Das Problem ist die körperliche Enge: Spieler, Wache und Zivilisten im selben Gang, im Überfall ein Schlauch ohne Deckung.

**Plan v1** (24. Oktober 2026)
1. Test zuerst (rot): `38-tankstelle-enge` baut alle 84 Kombinationen mit `genGas` und prüft für jede Karte aus `gasLayout` (ohne Klassik-Hülle), dass eine 2 Kacheln breite Verbindung von der Vordertür zur Fluchttür besteht und Breite mal Tiefe mindestens 42 beträgt.
2. Regel für Muster und Tiefe: `GS_SHOPS[].minSd` (Gänge 5, Klassik 4, Insel 3, Wandregale 3) und `CFG.gasGen.minArea` 42. `gasLayout` wirft Karten, die das verletzen, weg und würfelt neu (das Muster hängt am Seed, die Versuche würfeln nur Breite und Tiefe). 63 von 84 Kombinationen (75 %) bleiben, im Schnitt etwa 1,3 Versuche. Die Messung ergab, dass `minSd` und die Breitenverbindung dieselben 63 Kombinationen behalten.
3. Allgemeine Raster-Regel in `validateMap` für Tankstellen (Breitenverbindung Vordertür zu Fluchttür), damit ein neues Regalmuster später nicht wieder ein Schlauch wird. Die Klassik-Hülle steht mit Begründung in `KNOWN` des Tests `27-kartenvertrag`.
4. Gedränge begrenzen: Kameras, Wachen und Zivilisten skalieren mit der freien Fläche (unter etwa 40 freien Kacheln höchstens 2 Kameras und eine Wache, die zweite Wache der Lage `sicher` ab etwa 48), der Wachwechsel-Wächter startet nicht auf der Kachel am Eingang. Die Grenzen werden nach dem Bau mit den Schleichmessungen (`tools/stealth.js`) und dem Bot festgelegt.
5. Abnahme: Tests 37 und 92 angepasst, `npm test` und Langlauf grün, Bot vorher und nachher (Gewinnrate je Muster und Tiefe), Spieltest-Fragen für Till.

**Entscheidung (Till, 24. Oktober 2026):** "Gänge auf der Klassik-Hülle" (Breite 14, Tiefe 4) bleibt als Ausnahme, wie es ist. Die Klassik-Hülle läuft weiter ohne die neue Breitenregel und ohne Änderung der Schnappschüsse (Schritt 3 trägt sie mit Begründung in `KNOWN` ein, `minSd` und die Raster-Regel gelten nur für erzeugte Hüllen).

**Bau** (24. Oktober 2026), Abweichungen vom Plan:
- Die Breitenprüfung ist ein 2x2-Block, der über freie Kacheln der Verkaufsfläche von einem Startblock an der Vordertür (unterste Zeile, überlappt die zwei Türkacheln) zu einem Zielblock an der Fluchttür (Spalte `sw`, überlappt die zwei Türzeilen) rutscht (`gasWide`, im Test eine eigene Fassung). Gemessen: Klassik-Muster bei Tiefe 3 und Gänge bei Tiefe 3 und 4 sind in allen Breiten Schlauch (21 von 84 Kombinationen wie im Plan), Insel und Wandregale nie. Erste Fassungen der Prüfung (Startblock innen vor der Tür) hielten auch Insel 12 x 4 und 13 x 4 für Schlauch, weil ein Regal vor einer der zwei Türkacheln steht, tatsächlich öffnet sich dort aber gleich daneben der Raum.
- `minArea` 42 (Breite mal Tiefe) greift zusätzlich bei Tiefe 3 und Breite 12 und 13 (36 und 39), also bleiben 59 von 84 Kombinationen (70 %), nicht 63. 19 von 21 Kombinationen aus Breite und Tiefe kommen noch vor.
- Die Klassik-Hülle ist im Code ausgenommen (`lay.q` fehlt), nicht über `KNOWN`: So prüft `validateMap` die Regel in den Läufen des Kartenvertrags weiter streng für alle erzeugten Hüllen. Gedrehte Karten (`lay.turned`) sind dieselbe Halle und werden an der Basis geprüft.
- Das Muster hängt am Seed (`gsShopOf`), die Versuche würfeln nur Breite, Tiefe, Fluchttür, Inseln. Karten mit Gängen brauchen deshalb im Mittel 3 Versuche (gemessen höchstens 14 in 3000 Seeds, Grenze `tries` 30), Tests 37 und 92 erwarten höchstens 20 statt 5.
- Gedränge (Schritt 4): `CFG.gasGen.crowd` (`few` 40, `camsFew` 2, `two` 48), freie Fläche = `sw*sd` minus acht Regalkacheln. Unter 40: höchstens 2 Kameras und eine Wache (betrifft 14 x 3 und 15 x 3 mit Insel und Wandregale, rund 7 % der erzeugten Karten), unter 48 nur eine Wache (rund 27 %, die Lage Sicher behält ihren Tag, hat dort aber nur eine Wache). Der Wachwechsel-Wachmann beginnt eine Zeile weiter drin. Die Zahlen sind die des Plans, ohne Messung mit Menschen (die Schleichmessung `tools/stealth.js` gilt nur dem Juwelier, der Bot gewinnt in allen Gruppen 98 bis 100 %).
- Schnappschüsse `layout-hash` und `turn-hash` geändert (nur die Tankstelle), `gas-basis` bleibt im Raster gleich. `VER` 30, weil derselbe Seed eine andere Tankstelle baut. Für Tests erzwingt `P.shop` ein Regalmuster und `GS_SHOPS` steht im Debug-Hook.

**Risiken:** Der Umbau berührt `GS_SHOPS`, `gasParams`, `gasLayout`, `genGas`, `CFG.gasGen` (etwa 15 Zeilen) sowie die Tests 37 und 92 und liegt damit im Bereich des parallelen Cloud-Umbaus von `index.html`: erst nach dessen Merge bauen. Weniger kleine Hallen heißt weniger Abwechslung bei der Hüllengröße (75 % der Kombinationen bleiben, Breite und Tiefe variieren weiter).

**Änderungsprotokoll**
- v1 (24. Oktober 2026): Plan zu B1.
- v1.1 (24. Oktober 2026): Entscheidung eingetragen (Gänge auf der Klassik-Hülle bleibt als Ausnahme), keine offene Frage mehr.
- Bau (24. Oktober 2026): Go von Till, gebaut mit den Abweichungen oben, Status gebaut.
- Abnahme (24. Oktober 2026): Till hat die Tankstelle gespielt (Hüllen, kleine und breite Läden), es passt, Status abgenommen.

## P2 Runde endet sofort mit "Lautlos entkommen" (Brettersatz im Kit)

**Bugs**
- B2 (24. Oktober 2026, Till): Im Coop endet mitten in einer Serie beim Start in das nächste Szenario die Runde sofort, und die Gruppe landet wieder in der Auftragswahl. Die Kombination ist unbekannt, nur im Coop erlebt.

**Befund** (nachgestellt am 24. Oktober 2026, solo und Coop zu dritt, Bank Seed 5017):
- Ein einziger Brettersatz (Shop-Posten `bt`, Kit `bt` 1, kostet 2500) reicht. `mkPl` gibt dem Spieler dann `mat` 4 und `units` 2 (4 Material mal `CFG.bar.matU` .5), schon beim Start.
- Der Startpunkt liegt außerhalb der Gebäudehülle. Die Ausgangsregel der Phase 1 in `hostStep` (`(o.units>0||escaped>0)` und außerhalb von `LAY.bld` plus 0,7 Kacheln, nicht beim Transporter) hält Material für Beute und sichert den Spieler mit `secure(o)` im ersten Schritt.
- Mit `escaped>0` zieht das alle anderen, die draußen stehen, mit: Im Coop sind nach zwei Sekunden alle drei raus (`outs` alle `true`, `escaped` 3), `checkEnd` meldet "Lautlos entkommen" mit 0 Beute, `ended` bei Host und Clients gesetzt. Solo passiert dasselbe nach 10 Schritten.
- Folge für die Serie: Die Runde zählt als gewonnen (`SESSION.round` steigt, Fahndung sinkt um den Lautlos-Wert), ohne dass jemand etwas getan hat. Das Ergebnis führt über Shop und Auftragswahl, daher "wieder in der Auftragswahl".
- Der Transporter ist nicht betroffen (die Regel gilt dort nicht), alle anderen Szenarien schon. Warum nur im Coop aufgefallen: Im Coop genügt ein Spieler mit Brettersatz für alle.
- Zweite Wirkung derselben Ursache: Die Beobachterregel nimmt `carry = o.units>0` (Wache 20 pro Sekunde, Personal 10), Material zählt also wie Beute. Wer einen Brettersatz hat oder in Phase 1 Möbel zerlegt (Material), wirkt für Wachen und Angestellte wie ein Dieb. Nicht gemessen, nur aus dem Code gelesen (Zeile mit `carry=o.units>0`).
- Warum kein Test es fand: Die Tests setzen `units` und `loot` von Hand, kein Test startet eine Runde mit Brettersatz.

**Plan v1** (24. Oktober 2026)
1. Test zuerst (rot): `91-brettersatz-start`: Kit mit `bt` (solo und Coop zu dritt mit nur einem Brettersatz), Rundenstart über `startNext`: 15 s lang kein Spieler `out`, `escaped` 0, `ended` leer. Dazu: Material aus einem Möbelstück gezerlegt, Spieler läuft nach draußen: bleibt drin im Spiel. Die Gegenprobe über eine Kopie ohne den Fix muss rot werden.
2. Fix: Eine Hilfe `loot(o)` (Tasche ohne Material, gerechnet als `o.units - o.mat * CFG.bar.matU`, mit `loot>0` als Grenze oder direkt `o.loot>0`) ersetzt `o.units>0` in der Ausgangsregel. Material allein ist keine Beute und löst kein "Lautlos entkommen" aus.
3. Entscheidung (Till, 24. Oktober 2026): Material (Brettersatz und in Phase 1 Zerlegtes) gilt nie als Beute, auch nicht für die Beobachterregel. `loot(o)` ersetzt also auch `carry = o.units>0` im Beobachterblock: Wer nur Material trägt, wird von Wachen und Angestellten nicht als Dieb gesehen (Rate 0 statt 20 und 10).
4. Prüfung: Test `83-beobachter-gnadenfrist` um den Fall Material in Sicht der Wache ergänzen (Rate 0 statt 20), alle Tests und der Bot (Bank, Juwelier, Tankstelle, Museum, Casino mit Brettersatz im Kit, früh rufen), danach Spieltest-Frage: Brettersatz kaufen, Serie weiterspielen.
5. Eine zweite Absicherung (optional, Entscheidung Till): `finish` in den ersten Sekunden einer Runde ohne Beute und ohne Tat bei Phase 1 nie als Sieg zählen. Empfehlung: nicht nötig, wenn Schritt 2 sitzt.

**Bau** (24. Oktober 2026): Statt einer Hilfe `loot(o)` genügt `o.loot>0` (der Wert der Beute, Material zählt nie hinein): zwei Zeilen in `hostStep` (Ausgangsregel der Phase 1, Beobachterblock `carry`). Test `91-brettersatz-start` (solo mit Brettersatz, Material allein, Gegenprobe echte Beute draußen, Coop zu dritt mit einem Brettersatz) war vorher rot ("Lautlos entkommen" nach 2 s) und ist jetzt grün, `83-beobachter-gnadenfrist` hat den Fall Material in Sicht der Wache (Rate 0). Die Gegenprobe (Beobachterblock mit `o.units>0`) schlägt an. 23 Stellen in den Tests 41, 81 und 83 setzten `units` allein als Rucksack und setzen jetzt zusätzlich `loot`. Schritt 5 (zusätzliche Absicherung in `finish`) entfällt wie empfohlen. Der Bot ist nicht betroffen (er startet im Überfall, die Regel gilt nur in Phase 1).

**Risiken:** Klein, zwei Zeilen im Host-Schritt (Beobachterblock und Ausgangsregel) und eine Hilfe. Berührt `hostStep` in `index.html`, liegt also nahe am Cloud-Umbau. Spieler, die Material absichtlich nach draußen tragen, sind künftig nicht mehr "raus" (bisher unabsichtlich gesichert).

**Änderungsprotokoll**
- v1 (24. Oktober 2026): Plan zu B2.
- v1.1 (24. Oktober 2026): Entscheidung zu Schritt 3 eingetragen (Material nie Beute, auch nicht für den Verdacht), Schritt 3 ist keine offene Frage mehr.
- Bau (24. Oktober 2026): Go von Till, gebaut als `o.loot>0` statt `loot(o)`, Status gebaut.
- Abnahme (25. Oktober 2026): Till hat gespielt, der Brettersatz funktioniert, Status abgenommen.

## P3 HUD: Lage-Tags fallen weg, wenn es zu viele sind

**Bugs**
- B3 (25. Oktober 2026, Till): In manchen Runden werden nicht alle Lage-Tags angezeigt, wenn zu viele aktiv sind.

**Befund** (gemessen am 25. Oktober 2026 mit einem Wegwerf-Skript im echten Spiel: `layoutFor(seed).mission.tags` für 1500 Seeds je Szenario, dazu die Umbruchlogik von `lageLines` nachgebaut):
- `lageLines` füllt höchstens zwei Zeilen zu je 28 Zeichen. Passt ein Tag in keine der beiden Zeilen mehr, wird er verworfen, ohne Hinweis und ohne dass der Rahmen wächst. Betroffen ist nur das Erkunden-HUD (Phase 1). Im Überfall zeigt das HUD gar keine Lage-Zeile, das ist nicht Teil von P3.
- Die Reihenfolge der Tags ist fest: Lagen, dann Ereignisse, dann die Struktur-Tags (Tresor nur laut, keine oder zwei Wachen, Fluchtweg, Kundschaft, Kameras, Szenario-Zusätze). Es fallen also zuerst die Struktur-Tags weg, genau die, die man zum Planen braucht.
- Seeds mit verlorenen Tags: Bank 38,5 % (höchstens 7 Tags), Juwelier 6,3 % (6), Casino 5,3 % (5), Museum 3,5 % (5), Tankstelle 1,6 % (4), Transporter 0 % (immer 3 Tags, 2 Zeilen).
- Beispiel Bank, Seed 798: sieben Tags, angezeigt werden "Streife in der Nähe" und "Geldtransport, zwei Wachen", verloren gehen "Tresor nur laut", "Fluchtweg: Seitentür", "viel Kundschaft" und "8 Kameras".
- Zeilen bei Umbruch ohne Grenze (3000 Seeds je Szenario): Bank 1 Zeile 737, 2 Zeilen 1163, 3 Zeilen 910, 4 Zeilen 178, 5 Zeilen 12. Juwelier höchstens 4 Zeilen (14 Seeds), Museum 4 (1), Casino 4 (6), Tankstelle 3, Transporter immer 2. Das längste Einzel-Tag hat 20 Zeichen, passt also immer in eine Zeile.
- Nicht verloren geht die volle Liste beim Rundenstart im Feed (`say 'Lage: ...'`), sie verschwindet aber nach wenigen Sekunden.

**Plan v1** (25. Oktober 2026)
1. Test zuerst (rot): `94-lage-tags` (Nummer beim Bau die nächste freie). Über `D.draw()` mit abgefangenem `fillText` (wie Test 89): Bank Seed 798 zeigt alle sieben Tags im HUD, keine Zeile länger als 28 Zeichen. Wiederholt über 300 Seeds je Szenario: jeder Tag steht im HUD, oder die Zeile endet mit "+N weitere" und gezeigte Tags plus N ergeben die Gesamtzahl. Überlauf erzwungen (Tags der Mission von Hand auf 12 setzen, Cache `_l` leeren): genau 4 Zeilen, die letzte mit richtigem N. Der Rahmen wächst mit: Höhe des Kastens und Position von Zielkasten und Team-Leiste folgen der Zeilenzahl, kein Überlappen.
2. Umbruch ohne Verlust (Till: Vorschlag 1): `lageLines` bricht bis zu `CFG.hud.lageLines` (4) Zeilen zu je `CFG.hud.lageW` (28) Zeichen um. Ein Tag steht ungeteilt in einer Zeile, ein einzelner Tag über der Zeilenbreite steht allein in seiner Zeile.
3. Hinweis bei Überlauf (Till: Vorschlag 3): Brauchen die Tags mehr als 4 Zeilen, endet Zeile 4 mit ", +N weitere", N = Zahl der nicht gezeigten Tags. Dazu werden hinten Tags aus Zeile 4 genommen, bis der Hinweis in 28 Zeichen passt. Nach Messung nur in 12 von 3000 Bank-Seeds (0,4 %), in den anderen Szenarien nie.
4. Folgepositionen prüfen: Kastenhöhe (`152 + 14 * (n - 1)`, Transporter `108 + 14 * (n - 1)`), `goalHud(10 + ph + 4)` und `y0` der Team-Leiste hängen schon an `lageLines().length` und müssen mit bis zu 4 Zeilen (statt 2) nur geprüft werden, nicht neu gebaut. Vier Zeilen sind 28 Pixel mehr als bisher, bei 544 Pixel Höhe und vier Spielern im Team ist Platz.
5. Abnahme: Test grün, schneller Lauf, Bild-Prüfung der Fälle (Bank Seed 798, Überlauf), Spieltest-Frage für Till: Bank mehrmals spielen und die Lage-Zeile prüfen (alle Tags da, Rahmen sauber, Team-Leiste nicht überdeckt).

**Entscheidung (Till, 25. Oktober 2026):** Vorschlag 1 (Umbruch, Rahmen wächst) und Vorschlag 3 ("+N weitere") werden gebaut. Vorschlag 2 (Tags weglassen, die schon als Zeile im HUD stehen: Kamerazahl, "Tresor nur laut") entfällt: Die Zeile KAMERAS zählt Kameras erst nach dem Aufdecken, und ob TRESORCODE den Tag wirklich ersetzt, ist nicht gemessen.

**Risiken:** Klein. Berührt `lageLines`, `CFG` (zwei Werte) und höchstens ein paar Zeilen im HUD in `index.html`, kein Netzformat (kein `VER`), kein Karten-Vertrag, keine `LAY`-Felder. Liegt `index.html` nahe an einem parallelen Umbau (Sprints, Skillbaum-Umbau), erst nach dessen Merge bauen oder auf einer eigenen Branch. Offen bleibt die Frage, ob die Lage im Überfall überhaupt sichtbar sein soll (nicht Teil von P3).

**Bau** (25. Oktober 2026, Go von Till: "mit Major Release beginnen", Spur 1 beginnt bei P3), Abweichungen vom Plan:
- Der Plan nannte für Bank Seed 798 "alle sieben Tags im HUD". Das geht mit vier Zeilen zu 28 Zeichen nicht: Die sieben Tags (19, 13, 15, 11, 20, 15 und 9 Zeichen) brauchen ungeteilt fünf Zeilen. Der Seed gehört zu den 12 von 3000 Bank-Seeds mit fünf Zeilen, bei denen der Hinweis erscheint: Er zeigt "Streife in der Nähe", "Geldtransport", "Tresor nur laut, zwei Wachen" und "+3 weitere". Ein Test prüft das genau, dazu einen Bank-Seed mit vier vollen Zeilen ohne Hinweis.
- Der Umbruch bleibt in der Tag-Reihenfolge (passt ein Tag nicht mehr in die Zeile, beginnt die nächste), anders als der alte Code, der später Tags in frühere Zeilen nachfüllte. Die Reihenfolge der Tags (Lagen, Ereignisse, Struktur) bleibt lesbar.
- `lageLines` in `index.html`, `CFG.hud` ({`lageLines` 4, `lageW` 28}). Kastenhöhe, Zielzeile und Team-Leiste folgten der Zeilenzahl schon, geprüft mit einem Bild (Bank Seed 798: Kasten, Ziel-Kasten darunter, kein Überlappen). Kein Netzformat (kein `VER`), keine `LAY`-Felder.
- Test `94-lage-tags` (drei Tests, rund 65 s): Bank Seed 798, 300 Karten (je Szenario bis zu 60 Seeds mit mindestens fünf Tags: jeder Tag im HUD oder "+N weitere" mit richtiger Zahl, Zeilen höchstens 28 Zeichen, Kasten wächst) und ein erzwungener Überlauf (12 Tags: genau vier Zeilen, "+5 weitere", Kasten 194 hoch, langer Einzel-Tag steht allein, Transporter unverändert).

**Änderungsprotokoll**
- v1 (25. Oktober 2026): Plan zu B3, Entscheidung Till (Vorschläge 1 und 3).
- Bau (25. Oktober 2026): gebaut mit den Abweichungen oben, Status gebaut.
- Abnahme (25. Oktober 2026): Till hat gespielt, Status abgenommen.

## P4 Balancing-Patch 1 (Sammlung)

Till sammelt hier Punkte für den nächsten Balancing-Patch. Jeder Punkt bekommt eine Nummer (S1, S2, ...) mit Datum, Tills Wortlaut und dem Befund aus Code oder Messung. Die Punkte stehen mit Befund und Änderung so genau da, dass sie ohne weiteren Plan gebaut werden können, Till ergänzt weitere. Gebaut wird erst auf sein Go (S1 bis S3 zusammen mit P6). Die Werte stehen alle in `CFG`.

**Punkte**
- S1 (26. Oktober 2026, Till): "Bohrer verbessert auch das Öffnen des Geldtransporters."
  - Befund (gemessen am 26. Oktober 2026 mit einem Wegwerf-Skript im echten Spiel: Spieler am Laderaum bzw. am Tresor der Bank, E gehalten, Bohrer-Stufe 0 bis 3): Das tut er schon. `toolT` ([index.html](index.html), Zeile mit `const toolT`) gibt für `cargo` denselben Faktor zurück wie für den Tresor ohne Code (`CFG.shop.tier.drill` .64, .5, .4), und der Halte-Schritt rechnet `dt / dur / toolT`. Aufbohrzeit Laderaum und Bank-Tresor: Stufe 0 22,0 s, Stufe 1 14,1 s, Stufe 2 11,0 s, Stufe 3 8,8 s.
  - Was nicht wirkt: Der Schlüssel (`ckey`, 1,8 s, `CFG.truck.keyT`) und C4 (`c4t`) nehmen weder Bohrer noch Dietrich (Faktor 1). Der Dietrich greift nur bei Beute-Stücken mit Aufbrechen und Türen.
  - Vermutung, warum es nicht auffällt: Der Shop-Text des Bohrers nennt nur den Tresor ("Tresor aufbohren in X s statt 22 s"), der Hinweis am Laderaum zeigt keine Zeit, und beim Transporter ist die Zeit bis zur Polizei kurz (`CFG.truck.policeAt` 26 s, ungemessen, wie sie zur Bohrzeit von 22 s steht).
  - Entscheidung (Till, 26. Oktober 2026): Nur der Shop-Text ändert sich, das Verhalten bleibt. Der Text des Bohrers nennt neben dem Tresor auch die Fahrzeugtüren (der Laderaum des Geldtransporters), etwa "Tresor, Fahrzeugtüren aufbohren in X s statt 22 s" (50 Zeichen, mit dem Zusatz "jetzt:" rund 110 von rund 116 Zeichen Platz in der Zeile, beim Bau prüfen). Ein eigener Test für die Bohrzeit am Laderaum entfällt ausdrücklich.
- S2 (26. Oktober 2026, Till): "Claymore und Mine sowie den Granatwerfer mit rund 25 % mehr Schaden einstellen" (im Bau-Durchgang mit P6).
  - Befund (aus `CFG` und `blastAt` gelesen, Radien gerechnet): `CFG.trap.mine.dmg` 110, `CFG.trap.claw.dmg` 130, `CFG.spw.launch.dmg` 110. Der Schaden fällt mit dem Abstand: `dmg * (1 - d / r * 0,6)`, im Mittelpunkt voll, am Rand 40 %. Gegner-HP: Polizist und Wache 100, SWAT 200, Schild-Beamter 110 (dazu sein Schild).
  - Wirkung von plus 25 %: Der Radius, in dem ein Polizist (100 HP) sofort fällt, wächst bei Mine und Werfer (r 84) von 12,7 auf 38 Pixel und bei der Claymore (r 100) von 38,5 auf 64 Pixel. Ein SWAT (200 HP) fällt auch dann nicht auf einen Schlag. Zivilisten und Zapfsäulen (halber Schaden als Kettenreaktion) bekommen denselben Zuschlag.
  - Plan: `mine.dmg` 138, `claw.dmg` 163, `launch.dmg` 138 (plus 25,5 %, 25,4 %, 25,5 %). Nur `dmg` (Gegner, Zivilisten, Zapfsäulen). `pdmg` (Schaden an Spielern: 30, 35, 30) bleibt, sonst träfe Eigenbeschuss härter. Die Tests `99-sprengfalle` und `99-spezialwaffen` werden beim Bau auf feste Zahlen geprüft.
- S3 (26. Oktober 2026, Till): "Das Aufschneiden der Vitrinen muss mit Upgrade noch etwas spürbar schneller gehen" (im Bau-Durchgang mit P6).
  - Befund (gemessen am 26. Oktober 2026 im echten Spiel, E gehalten, Dietrich-Stufe 0 bis 3, Juwelier Seed 654 und zwei Beute-Stücke zum Vergleich): Das leise Aufschneiden der Vitrine dauert auf **allen vier Stufen 6,0 s**. Der Dietrich wirkt dort gar nicht, obwohl der Shop-Text "leises Aufschneiden X %" und der Techniker-Knoten "Dietrich +X %, auch beim leisen Aufschneiden" es versprechen. Einschlagen im Überfall wirkt (1,2 s, 0,87 s, 0,67 s, 0,50 s). Leise Beute-Stücke wirken: Museum-Gemälde 5,0 s, 3,97 s, 3,43 s, 2,93 s, Tankstelle-Zigaretten 3,5 s, 2,77 s, 2,40 s, 2,03 s.
  - Ursache: `toolT` wendet die leise Formel (`1 - (1 - Dietrich) * CFG.shop.silent`) nur auf `it.t==='good'` an. Die Vitrine hat `it.t==='vit'` und fällt auf Faktor 1.
  - Plan: Die Bedingung gilt auch für `vit`. Danach dauert das Aufschneiden 6,0 s, 4,74 s, 4,11 s, 3,48 s (Stufe 0 bis 3, minus 21, 31 und 42 %), mit Techniker 3 noch 2,98 s. Der Test `110-balancing-patch1` hält den Faktor und die gehaltene Zeit je Stufe fest.
  - Entscheidung nach dem Spieltest, nicht jetzt: Soll es noch schneller sein, ist `CFG.shop.silent` (heute 0,7) der Regler. Mit 0,85 dauert das Aufschneiden auf Stufe 3 2,94 s (Museum-Gemälde 2,45 s), mit 1,0 2,40 s. Der Wert gilt für alle leisen Stücke, nicht nur für Vitrinen. Meine Empfehlung: erst den Fehler beheben und spielen, denn heute wirkt der Dietrich dort gar nicht, und plus 42 % ist schon ein großer Sprung.

**Bau** (26. Oktober 2026, Go von Till für P4, P5 und P6 nacheinander als drei Commits), wie geplant:
- S1: Der Shop-Text des Bohrers heißt "Tresor, Fahrzeugtüren aufbohren in X s statt 22 s" (kein eigener Test, wie entschieden).
- S2: `CFG.trap.mine.dmg` 138, `CFG.trap.claw.dmg` 163, `CFG.spw.launch.dmg` 138, `pdmg` unverändert.
- S3: `toolT` wendet die leise Formel auch auf `vit` an.
- Test `110-balancing-patch1` (zwei Tests, rund 2 s) war vorher rot (Faktor [1,1,1,1] statt [1, .79, .685, .58], Schaden [110, 130, 110]) und ist jetzt grün. Die verwandten Tests (Sprengfalle, Spezialwaffen, C4, Shop, Skillbaum, Wurfgeräte, Leises Aufschneiden) laufen grün (45 bestanden), der schnelle Gesamtlauf steht beim Abschluss von P6.

**Änderungsprotokoll**
- Sammlung eröffnet (26. Oktober 2026), S1 mit Befund eingetragen.
- S1 entschieden (26. Oktober 2026): nur Shop-Text, kein Test.
- S2 und S3 eingetragen (26. Oktober 2026), Till: mit P6 zusammen bauen.
- Bau (26. Oktober 2026): Go von Till, S1 bis S3 gebaut, Status gebaut.

## P5 Geiselschild: Beamter klebt am Spieler

**Bugs**
- B5 (26. Oktober 2026, Till, Flugschreiber-Log `holdup-log-b163-solo-Till-20261026-151854.json`, Runde 15, Tankstelle Seed 633635, drei Marker): Ein Polizist "klebt" am Spieler, der eine Geisel hat.

**Befund** (aus dem Log gelesen und am 26. Oktober 2026 im echten Spiel nachgestellt):
- Im Log hängt ein Polizist der Welle 1 mit 32 von 100 HP ab etwa 15 s vor dem Marker an der Position des Spielers (Abstand 0 bis 17 Pixel, beim Marker 1 Pixel, er folgt jeder Bewegung). Die drei anderen Beamten stehen an ihren Posten. Der Spieler hat die Geisel (Geiselschild, `CFG.hostage.shield` 80 Pixel).
- Ursache: Die Zielwahl der Beamten (Schleife `for(const e of en)` in `hostStep`) nimmt Spieler im Geiselschild (`hostShield(o)`) ganz aus der Zielwahl. Der Beamte hat dann kein Ziel (`tg` leer). Den Haltabstand (über 150 Pixel zugehen, darunter seitlich kreisen) und das Zielen gibt es aber nur mit Ziel. Ohne Ziel folgt ein Beamter im Angriffsmodus (`push`) dem Weg-Feld (`flowDir`) bis in die Kachel des Spielers und bleibt dort stehen.
- Warum gerade dieser Beamte: Mit 32 von 100 HP war er verletzt und hat seinen Posten verlassen (`e.hp<e.mhp` schaltet auf `push`). Gesunde Beamte bleiben auf dem Posten, bis ihre Wartezeit abläuft (Geisel: höchstens `CFG.hostage.cap` Sekunden), und würden danach genauso kleben.
- Nachgestellt (Tankstelle Seed 633635, Spieler steht still, ein Beamter mit 32 HP im Angriffsmodus, Start 217 Pixel entfernt, 25 s): mit Geisel Abstand 217, 73, dann ab der dritten Sekunde dauerhaft 1 Pixel, kein Schuss. Gegenprobe ohne Geisel: Abstand bleibt bei 90 bis 100 Pixel, der Beamte kreist und schießt (der Spieler verliert rund 300 HP).
- Folge: Das Schild ist ein Zeitbudget (`shX`, höchstens `holdCap` Sekunden, 30 plus Skill). Ist es aufgebraucht, schießt der Beamte aus einem Pixel Abstand. Bis dahin steht er als Figur im Spieler.
- Nicht betroffen: Scharfschützen (`snipeStep` hat eine eigene Prüfung), der Kugelfang der Geisel (`hostBlock`, die Schusslinie ist nur blockiert, solange die Geisel dazwischen steht).

**Plan v1** (26. Oktober 2026)
1. Test zuerst (rot): `111-geiselschild-abstand` (Nummer beim Bau die nächste freie). (a) Spieler mit Geisel steht still, ein verletzter Beamter (HP 32, `push`) startet 200 Pixel entfernt: nach 3 s bleibt der Abstand bei jeder Messung über 80 Pixel, kein Schuss in 15 s, der Beamte zielt aber auf den Spieler. (b) Gegenprobe ohne Geisel: Abstand 60 bis 160 Pixel, der Beamte schießt (das Verhalten bleibt, wie es ist). (c) Schild verbraucht (`D.setShield(cap)`): der Beamte schießt, und nach Ablauf des Schilds mitten im Lauf erst nach der Reaktionszeit (`CFG.pol.react` .45 s), nicht im ersten Bild. (d) Ein Beamter im Modus `run`, der den geschützten Spieler sieht, wechselt weiter nicht auf `push` (wie heute). Die Gegenprobe über eine Kopie ohne den Fix muss rot werden.
2. Fix (vier Stellen in der Beamten-Schleife von `hostStep`): (i) Die Zielwahl für Bewegung und Zielen lässt `!hostShield(o)` weg, der geschützte Spieler ist wieder ein Ziel. (ii) Mit geschütztem Ziel zählt `e.react` nicht hoch, sondern bleibt 0, und das Schießen ist gesperrt. (iii) Der Wechsel von `run` auf `push` (`tg&&td<CFG.pol.reactD`) gilt nur für ungeschützte Ziele, damit sich dort nichts ändert. (iv) `hostBlock` bleibt in der Zielwahl wie heute. Ein Beamter geht also wie sonst auf etwa 100 bis 150 Pixel heran und kreist, schießt aber nicht. Die Scharfschützen-Regel ändert sich nicht. Kein neuer Wert in `CFG`, kein Netzformat (der Host rechnet, kein `VER`).
3. Prüfung: Test 105 (Geiselschild), 97 (Kugelfang), 92 (Geiseln), die Polizei-Tests (`82-polizei-anfahrt` und die Barrikaden-Tests), der schnelle Lauf, danach der volle Lauf und der Bot. Bild-Prüfung: Spieler mit Geisel, Beamter kreist im Abstand.
4. Doku: Absatz Geiseln und Geiselschild in docs/spielsystem.md (Beamte halten Abstand und zielen, schießen nicht), Test in docs/tests-und-messwerte.md.

**Alternative** (verworfen, 26. Oktober 2026): Nur im Weg-Feld-Zweig einen Haltabstand einbauen (Beamte ohne Ziel bleiben bei etwa 110 Pixel stehen). Das wäre eine einzige Stelle, ergäbe aber stehende statt kreisende Beamte und einen neuen Wert in `CFG`. Der Plan oben bringt das Verhalten ohne Schild mit und braucht keinen neuen Wert.

**Spielverhalten danach:** Beamte stehen oder kreisen nahe am Spieler mit Geisel und zielen, ohne zu schießen. Sobald das Schild ausläuft, schießen sie nach der normalen Reaktionszeit. Beamte auf ihren Posten, die einen geschützten Spieler sehen, drehen sich zu ihm und weichen seitlich aus (wie bei einem ungeschützten Spieler), statt wie heute stur auf dem Posten zu stehen.

**Risiken:** Klein bis mittel. Die Änderung sitzt in der zentralen Beamten-Schleife (vier Stellen, alle Beamtenarten außer Scharfschützen). Die Polizei-Tests decken sie ab, sie ändert aber die Zielwahl, die auch ohne Geisel jeden Beamten betrifft (nur die Bedingung `hostShield` wird verschoben, ohne Geisel liefert sie immer falsch). `index.html` wird zurzeit parallel geändert (Fluchtwagen-Treffpunkt, Spur 2): erst nach deren Commit bauen oder auf einer eigenen Branch.

**Bau** (26. Oktober 2026, Go von Till), Abweichungen vom Plan:
- Zwei Ziele statt einem: Die Zielwahl merkt sich den nächsten freien (ungeschützten) und den nächsten geschützten Spieler (`tg`, `ts`). Nur wenn kein freier im Blick ist, wird der geschützte zum Ziel (`shd`). Ohne diese Regel hätte ein geschützter Spieler nahe am Beamten einen freien, weiter entfernten Mitspieler verdeckt (der Beamte hätte nicht mehr auf ihn geschossen).
- Mit `shd` bleibt `e.react` bei 0 (kein Schuss, keine angesammelte Reaktionszeit), der Wechsel von `run` auf `push` gilt nur für freie Ziele. `hostBlock` bleibt in der Zielwahl, `hostShield` nur noch zur Einordnung. Kein `CFG`-Wert, kein Netzformat.
- Test `111-geiselschild-abstand` (drei Tests, rund 1 s): Der erste war vorher rot (Abstand 197, 154, 111, 68, 24, 2, 1 ... Pixel) und ist jetzt grün. Die anderen beiden halten fest, was gleich bleibt (Reaktionszeit nach Ablauf des Schilds, freier Mitspieler, `run` bleibt `run`). Die Tests 105, 97, 92 und die Polizei-Tests laufen grün. Der Bot nimmt keine Geiseln und ist nicht betroffen. Eine Bild-Prüfung steht aus.

**Änderungsprotokoll**
- v1 (26. Oktober 2026): Plan zu B5, noch ohne Go.
- Bau (26. Oktober 2026): Go von Till, gebaut mit den Abweichungen oben, Status gebaut.

## P6 Coop: Serienstand im neuen Raum und Mitspieler entfernen

**Bugs**
- B6 (26. Oktober 2026, Till, Flugschreiber-Log `holdup-log-b163-host-Till-20261026-172329.json`): Als Host habe ich die Serie neu gestartet, aber meine Skills, mein Geld, meine Ausrüstung und das Fahndungslevel behalten. Meine Clients hatten keine Skills und keine Ausrüstung mehr.
- B7 (26. Oktober 2026, Till): Wir hatten einen inaktiven Spieler, ich brauche als Host die Möglichkeit, Mitspieler zu kicken.

**Befund B6** (aus dem Host-Log und den Client-Logs gelesen, 26. Oktober 2026):
- Der Vorfall ist der Wechsel von Runde 6 auf Runde 7. Der Host hat bei 1788 s den Raum verlassen (`ui leave`, "Du hast das Spiel verlassen."), danach `coop`, `host`, `copyLink`, die Clients sind bei 1817 s und 1827 s neu verbunden (`netz verbunden`), `lobbyStart` bei 1866 s. In Runde 6 hatten Till (SMG, Weste 2, 3 Skills), zcixoT (Gewehr, Weste 2, 3 Skills) und Bluppy (Gewehr, Weste 2, 2 Skills) Ausrüstung.
- Runde 7 (Host-Log): Till `smg`, Weste 2, 3 Skills, Serie Runde 4, Fahndung 45, Konto 11.935. Beide Clients: `pistol`, Weste 0, 0 Skills. Der Host hat also seinen Stand aus Runde 6 behalten.
- Die Client-Logs beginnen genau in diesem Moment: Ihre Seite wurde beim Beitritt neu geladen (Seitenzeit 0 bei 1817 s Host-Zeit, "verbunden mit dem Host" nach 1 s). Ihre erste Runde ist Runde 7 des Hosts, Serie Runde 0, Konto 0, aber Fahndung 45 und lautlos 2, weil der Serienwert Fahndung vom Host kommt und bei jedem Rundenstart an alle geht (`rst`, `h`).
- Ursache: Der Serienstand (`SESSION`: Konto, Ausrüstung, Skills, Fahndung) lebt nur im Speicher der jeweiligen Seite, es gibt keine Speicherung. `leaveGame` und `hostRoom` setzen ihn nicht zurück (nur Serienende und die Kachel "Neue Serie" im Titel tun das, `sessReset`, Titel nur für die eigene Seite). Jeder bringt sein Kit selbst mit (`hi`, `kit`, `rdy`, `buildKits` nimmt `c.kit`). Wer den Raum verlässt und neu eröffnet, behält als Host alles, Mitspieler mit frischer Seite haben nichts, und die Fahndung gilt für alle. Eine gemeinsame "Neue Serie" für die Gruppe gibt es nicht, und die Lobby zeigt nicht, mit welchem Stand jeder kommt.
- Mögliche Verbindung zu B7 (der Anlass des Neueröffnens steht nicht im Log, Till bestätigt): Spieler 2 ("Grün", in allen Runden bis 6 ohne Ausrüstung und Skills) ist ab Runde 7 nicht mehr dabei, es sind drei Spieler. Es gab keinen Weg, jemanden zu entfernen.

**Befund B7** (aus dem Code gelesen):
- Es gibt keine Nachricht und keine Kachel zum Entfernen. Verlässt ein Client das Spiel (`c.onclose` in `hostConn`), entfernt der Host ihn in Lobby und Shop aus der Liste, im Spiel steht er auf `gone` ("hat das Spiel verlassen", `checkEnd` prüft). Dieser Weg lässt sich für das Entfernen wiederverwenden.
- Ein inaktiver Mitspieler blockiert den Start nicht: Im Shop genügt ein zweiter Druck ("trotzdem los"). Er bleibt aber im Team (mehr Spieler heißt größere Wellen, `CFG.perPlayer`, kein Beitrag).
- Ein Sperren gegen Wiederkommen lohnt nicht: Jeder Beitritt erzeugt eine neue zufällige Peer-Kennung (`new Peer()`), und nach dem Start ist der Raum zu ("Das Spiel läuft schon"). Wiederkommen ist nur in der Lobby möglich.

**Entscheidungen (Till, 26. Oktober 2026)**
- B6: Ein neuer Raum ist immer eine neue Serie, für alle. Keine Solo-Serie wird in den Coop übernommen.
- B7: Der Host muss jederzeit entfernen können (Lobby, Pause im Spiel, Shop, Auftragswahl, Ergebnis).

**Plan v1.1** (26. Oktober 2026)
1. Tests zuerst (rot), mit der Test-Leitung `loopnet.js` (Host und zwei Clients): `112-mitspieler-entfernen` (Entfernen in der Lobby: Liste schrumpft, der Client landet im Titel mit der Meldung; im Shop; in der Auftragswahl; auf dem Ergebnisbild; mitten in der Runde: Spieler `gone`, Meldung "wurde entfernt", die Runde läuft weiter und endet, auch wenn der letzte Mitspieler geht; ein Client kann nicht entfernen, die Nachricht wird ignoriert; der Host kann sich nicht selbst entfernen) und `113-neuer-raum-neue-serie` (Host mit Konto, Ausrüstung, Skills und Fahndung eröffnet einen Raum: alles zurückgesetzt; Client mit Stand tritt bei: zurückgesetzt, aber erst nach der Willkommens-Nachricht; scheitert der Beitritt (falscher Code), bleibt der Stand erhalten; die Fahndung des Hosts ist 0; Start gibt allen das Grundkit). Dazu Layout-Prüfung der neuen Kacheln mit `overlap.js`.
2. B6 (Kern, zwei Stellen): Der Host ruft `sessReset()`, sobald sein Raum steht (`onOpen` von `TR.host`), ein Client, sobald der Host ihn willkommen heißt (Nachricht `wel` in `clientMsg`, und sein Kit geht danach neu an den Host, `sendKit`). Beim Beitritt schickt `hi` bis dahin das Grundkit. So wird ein fehlgeschlagener Beitritt oder Raumaufbau nicht bestraft. Keine neue Nachricht, kein Listenformat, keine Kachel "Neue Serie für alle" und keine Anzeige der Serienrunde mehr (entfällt gegenüber v1).
3. B6 Sicherheitsfrage: Hat der Spieler einen Stand (Runde über 0, Konto, Ausrüstung oder Skills), fragt der Coop-Hub vor "Raum eröffnen" und "Beitreten" mit einem Bestätigungsfenster: "Coop beginnt immer eine neue Serie. Dein Stand (Konto, Ausrüstung, Skills, Fahndung) geht verloren." (Text wie die Kachel "Neue Serie" im Titel, `ui:confirm`). Ohne Stand keine Frage.
4. B7 Netz (Host rechnet): `kickPlayer(id)` nur am Host und nur für `id` ungleich 0: setzt `c.kicked`, schickt `{t:'kick'}` und schließt die Verbindung nach 250 ms. `c.onclose` meldet bei `c.kicked` "<Name> wurde entfernt" statt "hat das Spiel verlassen", sonst läuft der bisherige Weg (Lobby und Shop: aus der Liste, im Spiel: `gone` mit `checkEnd`). Der Client stellt `kick` mit `leaveGame('Der Host hat dich aus dem Raum entfernt.')` dar. Flugschreiber-Ereignis `netz ['entfernt', id]`. `VER` steigt um eins (neue Nachricht).
5. B7 Bedienung (`js/ui.js`): Ein Bildschirm `kick` "Mitspieler entfernen" mit einer Kachel je Mitspieler (Name und Ort `at`, die Farbe des Spielers) und Zurück. Eine Kachel "Mitspieler" nur für den Host mit mindestens einem Mitspieler öffnet ihn in fünf Bildschirmen: Lobby, Pause-Menü (im Spiel jederzeit, auch wenn der Host tot oder am Boden ist, solange das Menü offen geht), Shop, Auftragswahl, Ergebnis. Die genaue Lage der Kachel pro Bildschirm wird beim Bau geprüft. Vor dem Entfernen fragt ein Bestätigungsfenster ("<Name> aus dem Raum entfernen?"). Der Kontext von `mkUI` bekommt `kickPlayer`, `UI_API` steigt.
6. Prüfung: Tests 112 und 113, die Coop-Tests (40, 85, 87, 90, 99-wachsamkeit), die Menü-Tests (70, 80), schneller Lauf, danach voller Lauf. Tests, die vor `hostRoom` oder `joinRoom` Stand setzen, setzen ihn danach (die Test-Leitung ruft beides auf). Bild-Prüfung der fünf Bildschirme mit Kachel und des neuen Bildschirms. Die Gegenprobe über eine Kopie ohne Fix muss rot werden.
7. Doku: docs/coop-und-netz.md (`kick`, Rücksetzen beim Betreten, `VER`), docs/spielsystem.md (Coop beginnt immer eine neue Serie), docs/tests-und-messwerte.md (neue Tests).

**Nicht im Plan** (auf Wunsch): den Solo-Stand beim Betreten sichern und beim Verlassen des Coop wieder herstellen (statt zu verwerfen). Heute geht ein Coop-Stand beim Verlassen in den Solo-Titel mit, das bleibt wie es ist.

**Spielverhalten danach:** Wer einen Raum eröffnet oder betritt, beginnt mit leerem Konto, Grundkit und Fahndung 0 (mit Rückfrage, falls er einen Stand hat). Der Host entfernt einen Mitspieler jederzeit mit zwei Klicks und Bestätigung. Der Entfernte sieht den Titel mit einer Meldung. Zurück in die Lobby kommt er nur dort, solange der Raum offen ist (nach dem Start ist der Raum zu).

**Risiken:** Mittel. Der Plan berührt Netz und Menüs (`hostRoom`, `joinRoom`, `hostConn`, `clientMsg`, `js/ui.js` mit fünf Bildschirmen, `VER`, `UI_API`) und liegt damit nahe an paralleler Arbeit in `index.html` (Fluchtwagen-Treffpunkt, Spur 2): erst nach deren Commit bauen oder auf einer eigenen Branch. Entfernen mitten in der Runde nutzt den bestehenden Abbruchweg (`gone`, `checkEnd`), er ist mit dem Test 112 abzusichern, besonders wenn der letzte aktive Mitspieler entfernt wird oder die Liste danach Lücken in den Kennungen hat (heute bei Abbrüchen im Shop schon möglich). Das Zurücksetzen beim Betreten ändert den Ausgangszustand vieler Coop-Tests (siehe Schritt 6).

**Änderungsprotokoll**
- v1 (26. Oktober 2026): Plan zu B6 und B7, noch ohne Go, zwei Entscheidungen offen.
- v1.1 (26. Oktober 2026): Entscheidungen von Till eingetragen. B6 wird einfacher (Rücksetzen beim Betreten, keine Kachel "Neue Serie für alle", keine Serienrunde in der Liste), B7 bekommt fünf Bildschirme.
