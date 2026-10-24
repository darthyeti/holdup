# Bugfix-Pläne

Hier stehen Fehler und Verhaltenswünsche, die Till im Spiel findet, als Pakete mit versioniertem Plan. Gebaut wird erst auf Tills ausdrückliches Go, nie nebenbei. Commit nur auf Zuruf.

## Regeln

- **Paket:** Eine laufende Nummer (P1, P2, ...) für Fehler, die denselben Code berühren und zusammen gebaut werden. Fehler in anderem Code bekommen ein eigenes Paket, damit zwei Pakete in parallelen Sitzungen laufen können, ohne in `index.html` zu kollidieren.
- **Bugs:** Je Fehler eine Nummer (B1, B2, ...) mit Datum und Tills Beschreibung, dazu der Befund mit Messwerten und dem Messverfahren.
- **Plan:** Versioniert (v1, v2, ...). Kommt ein Fehler dazu, steigt die Version, und das Änderungsprotokoll nennt in einer Zeile, was neu ist. Frühere Fassungen stehen in der Git-Historie dieser Datei.
- **Status:** gesammelt, Plan steht, freigegeben, gebaut (Commit), gespielt, abgenommen.
- **Bau:** Ein Paket wird als ein Commit `Paket Pn: ...` gebaut (in Cloud-Sitzungen auf einer eigenen Branch `claude/paket-pn`). Test zuerst (rot), dann Code, volle Läufe und Gegenproben, Doku in der Themendatei. Nach Tills Spieltest trägt der Status "abgenommen" und das Datum.

## Übersicht

| Paket | Thema | Plan | Status |
|---|---|---|---|
| P1 | Tankstelle: zu enge Verkaufsräume | v1.1 (24. Oktober 2026) | Plan steht und ist entschieden, wartet auf Tills Go (frühestens nach dem Cloud-Umbau) |
| P2 | Runde endet sofort mit Brettersatz im Kit | v1.1 (24. Oktober 2026) | Ursache gefunden und nachgestellt, Plan steht und ist entschieden, wartet auf Tills Go |

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

**Risiken:** Der Umbau berührt `GS_SHOPS`, `gasParams`, `gasLayout`, `genGas`, `CFG.gasGen` (etwa 15 Zeilen) sowie die Tests 37 und 92 und liegt damit im Bereich des parallelen Cloud-Umbaus von `index.html`: erst nach dessen Merge bauen. Weniger kleine Hallen heißt weniger Abwechslung bei der Hüllengröße (75 % der Kombinationen bleiben, Breite und Tiefe variieren weiter).

**Änderungsprotokoll**
- v1 (24. Oktober 2026): Plan zu B1.
- v1.1 (24. Oktober 2026): Entscheidung eingetragen (Gänge auf der Klassik-Hülle bleibt als Ausnahme), keine offene Frage mehr.

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

**Risiken:** Klein, zwei Zeilen im Host-Schritt (Beobachterblock und Ausgangsregel) und eine Hilfe. Berührt `hostStep` in `index.html`, liegt also nahe am Cloud-Umbau. Spieler, die Material absichtlich nach draußen tragen, sind künftig nicht mehr "raus" (bisher unabsichtlich gesichert).

**Änderungsprotokoll**
- v1 (24. Oktober 2026): Plan zu B2.
- v1.1 (24. Oktober 2026): Entscheidung zu Schritt 3 eingetragen (Material nie Beute, auch nicht für den Verdacht), Schritt 3 ist keine offene Frage mehr.
