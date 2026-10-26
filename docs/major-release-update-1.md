# Major Release Update 1

Teil der Projektdoku, der Kern steht in `CLAUDE.md`. Till hat am 25. Oktober 2026 mehrere Pläne beschlossen und sie unter dem Namen "Major Release Update 1" (kurz MRU 1) zusammengefasst. Diese Datei ist der Überbau: Schritte, Stand, Reihenfolge und der Plan zum Fluchtwagen (Spur 2, noch nicht gebaut). Die Einzelheiten der anderen Pläne stehen dort, wo sie entstanden sind, und werden hier nicht wiederholt. Stand 26. Oktober 2026: Spur 1 ist bis auf B6 und C2 gebaut. Test-Stopps gibt es nicht mehr (Till, 26. Oktober 2026): Es wird weitergebaut, Till testet nebenher und meldet sich, wenn etwas nicht funktioniert. Commit nur auf Zuruf.

## Ziel

Das Update vertieft das Spiel in drei Richtungen:
- Fähigkeiten und Gegenstände: Der Skillbaum wird zur echten Spezialisierung (Entweder-oder, ein Gegenstand je Pfad).
- Gegenspiel gegen eingefahrene Stile: Wachsamkeit der Läden (wer immer lautlos spielt, wird erschwert), Geiseln als Kugelfang, der Ablenker, die gestrichene Blendgranate.
- Abwechslung bei der Flucht: ein Treffpunkt abseits statt immer am Gebäude, dazu ein Ausweichpunkt als Ereignis.

Das gemeinsame Ziel (Till): Der Spieler soll zwischendurch seinen Stil ändern müssen, es soll weder zu schwer noch zu leicht werden.

## Voraussetzungen

Alle erfüllt: Sprint 9 (Casino als Generator) und Paket P3 (Lage-Tags im HUD) sind gebaut, Tills Spieltests der Vorstufen (Fahndung Schritt 2, Geiseln, A1 bis A3, Coop auf den neuen Karten) sind abgenommen.

## Schritte

Die Größen sind Schätzungen, keine Messungen. Namen für Commits und Gespräche: `MRU 1 A1` und so weiter. Stand: gebaut (Einzelheiten in der Themendatei, Skillbaum und Gegenstände in docs/spielsystem.md), ungespielt oder offen.

| Schritt | Inhalt | Plan und Einzelheiten | Größe | Stand |
|---|---|---|---|---|
| A1 | Blendgranate des Shops streichen (die der Polizei bleibt), Taste 3 frei | docs/ideen-und-planung.md, Zusätze im selben Update | klein | gebaut, abgenommen |
| A2 | Ablenker macht Angestellte blind (`decT` 11, `decHold` 10, Zeichen über dem Kopf) | dort | klein bis mittel | gebaut, abgenommen |
| A3 | Geisel als Kugelfang: Polizeikugeln treffen Geiseln, Beamte schießen nicht durch sie | dort | mittel | gebaut, abgenommen |
| B1 | Skillbaum, Layout und Struktur: drei Zeilen, Entweder-oder, Aufleuchten, Punkte zurücknehmen, Techniker, Zäh, Fahrer und Verhandler in Stufe 3 der Pfade, Zusätze Läufer, Durchschuss, Sammler | dort, Skillbaum-Umbau | mittel | gebaut |
| B2 | Sprengfalle: Barrikaden-Mine und Claymore (treffen auch Mitspieler) | dort | mittel | gebaut |
| B3 | C4 für Tresore und die Sprengladung des Geldtransporters | dort, Gegenstände | mittel bis groß | gebaut |
| B4 | Besondere Waffen: Präzisionsgewehr und Granatwerfer (Shift schaltet um) | dort | mittel bis groß | gebaut |
| B5 | Notfallkoffer (Taste C) | dort | klein bis mittel | gebaut |
| B6 | Balance des Skillbaums messen und anpassen | dort | mittel | offen, nach Tills Rückmeldung |
| C1 | Wachsamkeit der Läden, Stufe 1 (Zähler serienweit, Wachsames Personal erzwungen, Badge, Netz), dazu Lautlos-Bonus mit Abflachung und Skillpunkte lautlos 1, Überfall 2 | docs/ideen-und-planung.md, Karriere-Serie | mittel | gebaut |
| C2 | Wachsamkeit, Stufe 2 (Sicherheitsdienst), nur falls Stufe 1 nicht reicht | dort | klein, aber das Layout hängt am Zähler | offen, bei Bedarf |
| D0 | Messung: Wie viel Platz hat jede Karte in jeder Lage für einen zweiten und einen entfernten Treffpunkt | unten, Ergebnis im Abschnitt D0 Ergebnis | klein | gebaut (Messung), Entscheidung für D1 bis D3 bei Till |
| D1 | Gemeinsamer Treffpunkt-Mechanismus (Treffpunkt abseits im Hof der Fluchtseite, nach D0 statt eines zweiten Treffpunkts am Gebäude), Bank als erster Kunde | unten, Ergebnis im Abschnitt D1 gebaut | groß | gebaut (ungespielt) |
| D2 | Treffpunkt abseits für die übrigen Karten (Juwelier, Tankstelle, Museum, Casino über `CFG.meet.scs`), Werte je Szenario | unten, Abschnitt D2 gebaut | mittel | gebaut (ungespielt) |
| D3 | Ausweichpunkt als Ereignis | unten | mittel | offen |

## Reihenfolge

Zwei Spuren, die einander kaum berühren:
- Spur 1, Spielsystem: gebaut bis auf B6 (nach Tills Rückmeldung zum Baum) und C2 (bei Bedarf).
- Spur 2, Karte und Flucht: D0 gemessen und entschieden (Treffpunkt abseits im Hof der Fluchtseite auf einer anderen Zeile, Till, 26. Oktober 2026), D1 gebaut (Mechanismus, Bank), D2 gebaut (alle fünf Gebäude-Karten), dann D3 (Ausweichpunkt als Ereignis), die Voraussetzung (Sprint 9) steht.

Entschieden (Till, 25. Oktober 2026): eine Spur nach der anderen, nicht parallel, ein Schritt wird gemergt, bevor der nächste beginnt. Damit entfallen Kollisionen in `index.html` und bei `VER` zwischen den Spuren.

## Fluchtwagen: Treffpunkt abseits und Ausweichpunkt (neuer Plan, Till, 25. Oktober 2026)

Anlass (Till): Es spielt sich etwas eintönig, dass der Wagen immer einfach an das Gebäude heranfährt. Gewünscht: ein alternativer Treffpunkt abseits, und der Ausweichpunkt als Ereignis. Gebaut wird global für alle Szenarien. Das ist die Stufe 2 des alten Plans "Treffpunkt des Fluchtwagens" (Stufe 1, die Bank mit zwei Treffpunkten, ist gebaut, Entwurf in docs/archiv-gebaute-plaene.md).

Ist-Zustand: Der Treffpunkt ist der Haltepunkt des Fluchtwagens im Hof neben dem Gebäude (`LANE.van`), die Fluchtzone liegt an einem Ende der Straßenachse (`LANE.exit`, Fluchtseite), die Fluchttür ist fest je Karte. Nur die Bank würfelt seit Sprint 5 zwischen Ost und West (`tpf` in `genLayout`), die übrigen Karten haben einen Treffpunkt, dessen Seite die Spiegelung wählt. Die Polizei besetzt ihre Posten in der Reihenfolge Front, Treffpunkt-Seite, andere Seite, Nord, die Anker folgen der Fluchttür (`fillDerived`, `autoPosts`). Der Wagen fährt immer parallel zur Straßenachse, eine echte Seitenstraße quer dazu würde `laneOf` erweitern.

- **D0, Messung zuerst.** Für jedes Szenario und jede Lage (und die Hüllen der Generatoren): freie Strecke längs der Straßenachse hinter dem Gebäude, Abstand von der Fluchttür zum Haltepunkt, Platz für einen zweiten Treffpunkt. Warum zuerst: Die Welt ist beim Juwelier 44 Kacheln breit, bei großer Halle (`hw` 17) bleiben für den Hof etwa neun Kacheln, die Bank ist 44 x 28 und gedreht nur 28 breit. Ein Treffpunkt 15 Kacheln abseits passt also nicht überall. Ergebnis ist eine Tabelle und eine Entscheidung: nur entlang der Achse, Welt für die Generatoren vergrößern (Karten über 64 x 64 sind ungeprüft, siehe docs/ideen-und-planung.md, größere Endgame-Karten), oder der Treffpunkt auf der anderen Seite des Gebäudes (der Wagen fährt vorbei). Gemessen am 26. Oktober 2026 (`tools/treffpunkt.js`), das Ergebnis steht im nächsten Abschnitt.
- **D1, gemeinsamer Mechanismus.** Jeder Generator liefert nur Kandidaten (Fluchttür, Haltepunkt, Zone, Hinweis für die Anker), eine gemeinsame Funktion wählt aus dem Seed (eigener Zufallsstrom über `mulberry32`, wie `turnFor`), setzt `exit` und `van` und lässt `fillDerived` Posten und Anker ableiten. Die Bank wird der erste Kunde (Ost oder West bleibt als Kandidaten, die Verteilung 50 zu 50). Phase 1 nennt den Fluchtweg (Tag und Bodenmarkierung) für alle. Prüfung: `validateMap` bekommt eine Regel für den zweiten Treffpunkt, `mapcheck.vsweep` über viele Seeds in jeder Lage, Bot-Rauchtest mit `van:'alt'`, Coop über die Test-Leitung, Kontaktbögen (`tests/sheet.js`), Alt-Neu-Vergleich mit abgeschaltetem Treffpunkt (muss IDENTISCH bleiben). `VER` steigt, weil derselbe Seed eine andere Karte baut.
- **D2, Treffpunkt abseits.** Der Haltepunkt und die Zone liegen ein Stück weg vom Gebäude, mindestens 10 Kacheln Weg von der Fluchttür (Till: erstmal so lassen, Wert in `CFG`, der tatsächliche Abstand kommt aus D0). Der Weg dahin (Hof, Fahrweg, Gasse) ist eine Strecke, die man unter Beschuss läuft, die Polizei kann sie abschneiden. Wenige Anker am entfernten Punkt, sonst wird er die sichere Flucht (wie `CFG.map.anW` bei der Bank). Längere Wege sind laut Tills Leitlinie kein Nachteil, die Grenzen bleiben weite Leitplanken gegen Extreme. Kosten: Die Fluchtwagen-Anfahrt, `vanPointer` und die Zielkachel (`exit.goal`) hängen am Treffpunkt und müssen ihm folgen, `laneOf` bleibt wenn möglich unverändert.
- **D3, Ausweichpunkt als Ereignis.** Der Fahrer weicht aus, wenn die Polizei den Treffpunkt hält (Till, 25. Oktober 2026: situativ, nicht nach einer festen Zeit). Jeder Auftrag mit zwei Kandidaten aus D1 und D2 hat ein A und ein B (das B würfelt der Seed aus eigenem Zufallsstrom, nicht aus dem Strom der Auftragslage, damit Karten und Tags desselben Seeds gleich bleiben). Auslöser heute schon vorhanden: Der Fahrer wird nervös, wenn ein Beamter näher als `CFG.van.r` am Haltepunkt steht (`vanNv`, HUD `Polizei! Abfahrt in N s`), fährt nach `leave` 5 s weg (`vanMode` 1), wartet mindestens `back` 8 s abseits (2) und kommt zurück (3), sobald kein Beamter mehr am Haltepunkt steht. Neu: Der Fahrer kommt dann an B zurück, wenn A noch von der Polizei gehalten wird (Till: Der Wechsel darf auch erfolgen, wenn der Fluchtwagen nervös geworden ist und wegfährt). Hält die Polizei schon beim Rufen (G) den Treffpunkt, fährt er direkt zu B. Ist auch B besetzt, wartet er abseits wie heute. Solange der Wagen ruhig am Treffpunkt wartet, gibt es keinen Wechsel. Der Wechsel ändert Haltepunkt, Zone, Markierung, Zeiger (`vanPointer`) und die Zielkachel, die Polizei-Anker bleiben bei A (Vorschlag: an B stehen wenige oder keine Anker, sonst gäbe es keinen Grund auszuweichen). Meldung groß im HUD und im Feed ("Fahrer: Ich weiche aus nach ..."). Netz: Der Treffpunkt-Index fährt im Schnappschuss (`g`) mit, `vanMode` gibt es schon (`g[22]`), `VER` steigt. Offen: Ist B schon in Phase 1 sichtbar (kleine Markierung, planbar) oder zeigt sich B erst beim Wechsel (Überraschung)? Empfehlung: schon in Phase 1 genannt, das Briefing nennt "Ausweichpunkt vorhanden", damit der Spieler es im Plan hat. Später möglich: zusätzlich ein Ereignis mit fester Zeit aus dem Seed ("Straße gesperrt"), nicht Teil des Updates.
- **Nicht im Update:** Die Spieler wählen den Treffpunkt beim Rufen (G). Das kostet Bedienung, ein Netzfeld und `VER`, erst bewerten, wenn D2 und D3 gespielt sind. Ebenso eine echte Seitenstraße quer zur Hauptstraße, falls D0 sie nicht verlangt.
- **Balance und Messung:** Der Bot beurteilt die Fahrer-Regeln nicht, er misst nur, ob der Weg lösbar bleibt (Rauchtest mit frühem Rufen in jeder Variante). Zur Orientierung: Bei der Bank gewann der Bot bis 22 Schritten Weg rund 60 %, bei 25 bis 26 Schritten rund 21 %, das zeigt, wo ein zu weiter Treffpunkt hinführt. Was fühlt sich richtig an, entscheidet Tills Spieltest.

## D0 Ergebnis: Platz für einen zweiten oder entfernten Treffpunkt (Messung vom 26. Oktober 2026)

Werkzeug `tools/treffpunkt.js` (auf der `#debug`-Seite laden, `treffpunkt.table('jewel',300)`), der Test `108-treffpunkt-messung` hält Regeln und Zahlen fest, Einzelheiten in docs/tests-und-messwerte.md. Gemessen sind 300 Seeds je Szenario (Bank 301 mit der Klassik-Karte), alle Hallen und alle 8 Lagen. Das Werkzeug ändert nichts am Spiel.

**Messregeln.** Ein Treffpunkt ist der Wagen (4 x 2 Kacheln) mit seiner Zone (4 x 4). Ein Platz zählt als Kandidat, wenn Wagen, Zone und die Zeile bis zum Weltrand auf Kacheln liegen, die ein Generator freiräumen kann (Boden, Zaun, Pflanze, Fass, Kiste, parkendes Auto), außerhalb des Gebäudes und der Wagenplätze der Polizei (der Zaun am Rand wird zum Tor, wie `clearLane` es heute tut). Weg heißt Schritte über begehbare Außenkacheln. d ist der Weg von der Fluchttür zum Wagen, pVE der Weg von der Tresor-Standkachel dorthin (wie `validateMap`, Richtwert 8 bis 28). Gegenprobe: Der heutige Treffpunkt besteht die Regeln in 100 % der Karten, und pVE stimmt mit `validateMap` überein. Die Wege sind ohne die Tore gerechnet, die `clearLane` später in Zäune auf der Fahrstrecke schneidet (auch Fußgänger gehen hindurch): Im Spiel sind sie dadurch teils kürzer, `placeMeet` rechnet für den gewählten Platz genau nach (siehe D1).

**Befunde.**
1. Die Lage spielt keine Rolle. Drehen und Spiegeln sind Spiegelungen des ganzen Rasters: Höfe und Welt bleiben gleich, die Zahl der Plätze weicht höchstens um einen ab, die Wege um bis zu zwei Schritte (Rundung des Zielfelds). Die Tabelle gilt für alle 8 Lagen.
2. Nur entlang der Achse reicht nicht. Auf derselben Zeile wie heute lässt sich der Wagen nur um (Hof minus 3) Schritte verschieben, 10 Schritte brauchen also einen Hof von 13 Kacheln. Bank, Museum und Casino haben 9 (sechs Schritte, bei der Bank mit den parkenden Autos als feste Hindernisse nur zwei), der Juwelier genau 13, die Tankstelle 17 bis 23. Den Hof auf 13 zu bringen hieße vier Kacheln mehr Welt bei drei Generatoren, andere Karten zum selben Seed und `VER`.
3. Eine frei gewählte Zeile im Hof der Fluchtseite genügt überall. Der Wagen fährt dann in einer anderen Zeile derselben Achse ein (`laneOf` kennt das schon: `van.pos`, Haltepunkt und Zone sind frei), und es gibt Plätze mit 10 und mehr Schritten Abstand zur Fluchttür bei jeder Karte, ohne die Welt zu vergrößern.
4. Der Preis ist ein längerer Weg zum Wagen. Bei mindestens 10 Schritten Abstand liegt pVE im Schnitt 6 bis 9 Schritte über dem heutigen Wert, und bei Bank, Tankstelle und Casino rutscht der mittlere Platz an die Obergrenze des Fensters (28). Die Wahl darf deshalb nicht frei sein, sie muss aus Kandidaten im Fenster kommen (D1). Zur Orientierung aus der Bot-Messung der Bank: bis 22 Schritte rund 60 % Siege, bei 25 bis 26 rund 21 %.
5. Die Gegenseite (das andere Ende des Gebäudes) hat nur die Bank in Reichweite: Die Westtür ist schon da, der Weg bleibt bei 18 bis 20. Bei den übrigen Karten liegt der Tresor auf der Fluchtseite, der kürzeste Weg zum Gegenhof ist 32 bis 60 Schritte, der Gegenhof ist mit 5 Kacheln ohnehin knapp (Zone 4 plus Zaun).
6. Die Rückseite hinter dem Gebäude hat überall Plätze, aber sie liegen an den Hintertüren neben dem Tresor: Weg ab 8 bis 9 Schritte (Bank, Juwelier, Tankstelle, Casino), das macht die Flucht kürzer statt länger. Nur das Museum liegt mit 22 höher. Die Straßenseite hat nur teilweise Platz (siehe Tabelle).
7. Der Geldtransporter ist eine feste Straßenkarte (60 x 24, Fluchtzone im Osten bei Kachel 55, kein Gebäude) und nicht Teil dieser Messung. Die Straße ist lang genug, die Entscheidung fällt mit D1.

| Karte | Hof Fluchtseite | Hof Gegenseite | Weg Tresor zu Wagen heute (pVE) | Nur entlang der Achse (Schritte) | Im Hof, andere Zeile (weitester Platz mit pVE bis 28) | Gegenseite am Gebäude | Rückseite am Gebäude | Straßenseite am Gebäude |
|---|---|---|---|---|---|---|---|---|
| Bank | 9 (bis 12) | 5 (West bis 12) | 15 bis 28, Median 21 | 6 (bis 9, mit parkenden Autos als festen Hindernissen ab 2) | 17 (höchstens 24), bei 97 % der Karten gibt es einen | 100 %, pVE 18 bis 20 | 100 %, ab 8 | 100 %, ab 13 |
| Juwelier | 13 | 5 | 13 | 10 | 18 | 0 % | 100 %, ab 8 | 47 bis 57 %, ab 24 |
| Tankstelle | 17 bis 23 | 5 | 17 bis 25, Median 21 bis 22 | 14 bis 20 | 19 bis 20 (höchstens 24) | 0 % | 100 %, ab 8 | Insel, Klassik 100 % ab 25 bis 26, Gänge, Wandregale 10 bis 12 % ab 21 |
| Museum | 9 | 5 | 14 bis 16 | 6 | 14 (13 bis 15) | 0 % | 100 %, ab 22 | 45 bis 52 %, ab 23 |
| Casino | 9 | 5 | 20 | 6 | 23 | 0 % | 100 %, ab 9 | 0 % |

Höfe in Kacheln zwischen Gebäude und Randzaun. "Gegenseite", "Rückseite" und "Straßenseite" nennen den Anteil der Karten, die dort einen Platz direkt an der Gebäudewand mit pVE im Fenster 8 bis 28 haben, und den kleinsten pVE dazu.

Weg Tresor zu Wagen bei einem Treffpunkt im Hof mit mindestens 10 Schritten Abstand zur Fluchttür (kürzester Platz / mittlerer Platz, Median über die Karten, gegen heute): Bank 19 bis 20 / 26 bis 28 gegen 21, Juwelier 14 / 21 gegen 13, Tankstelle 18 bis 19 / 27 bis 28 gegen 21 bis 22, Museum 24 / 24 gegen 15, Casino 25 / 28 gegen 20. Bei 14 Schritten Abstand steigt der mittlere Platz der Tankstelle auf 31 bis 32, Juwelier 22, Casino 28, Bank 26 bis 27.

**Empfehlung für D1 bis D3 (Entscheidung bei Till).**
- D2, Treffpunkt abseits: im Hof der Fluchtseite auf einer anderen Zeile, keine Welt-Vergrößerung. Die gemeinsame Funktion aus D1 wählt aus den Kandidaten mit d von mindestens `CFG`-Wert (10) und pVE im Fenster 8 bis 28, bei Karten mit kurzem Weg (Juwelier, Museum) auch weiter weg, bei Bank, Tankstelle und Casino bevorzugt nah an 10. Rückseite nicht (Flucht wird kürzer), Gegenseite nur bei der Bank (besteht).
- D3, Ausweichpunkt B: ein zweiter Platz im selben Hof (andere Zeile oder anderer Abstand), bei der Bank alternativ der Hof am anderen Ende. Risiko: Beide Plätze liegen in Reichweite derselben Polizei-Anker, B muss deshalb weg von A liegen und wenige oder keine Anker haben.
- Balance bleibt Sache des Spieltests: Der Bot bildet die Fahrer-Regeln nicht ab und misst nur, ob der Weg lösbar bleibt.

## D1 gebaut: gemeinsamer Treffpunkt-Mechanismus, Bank als erster Kunde (26. Oktober 2026, `VER` 42)

Entscheidung nach D0 (Till, 26. Oktober 2026): Der Treffpunkt abseits liegt im Hof der Fluchtseite auf einer anderen Zeile, die Welt wird nicht größer. Damit entfällt der "zweite Treffpunkt am Gebäude" aus dem alten Entwurf (außer der Westseite der Bank, die der Generator schon würfelt), und D1 liefert den Mechanismus für den Treffpunkt abseits selbst.

**Aufbau.** `finishLay` ruft nach `fillDerived` und vor `clearLane` die Funktion `placeMeet` (in `index.html`, mit `meetKit` und `meetCands` daneben). Sie läuft in der ungedrehten Lage (Straße im Süden, Rohfelder `exit`, `van`), `turnLayout` nimmt das Ergebnis mit (`exit.door` und `exit.goal` werden mit abgebildet). Ablauf:
1. Zufallsstrom aus Seed und Szenarioname (`mulberry32`, eigene Konstante, nichts anderes verbraucht Zufall). Erste Ziehung gegen `CFG.meet.p` (.5), die zweite und folgende mischen die Reihenfolge der Plätze. Hallen, Beute, Personal und Lage-Tags bleiben deshalb für jeden Seed gleich, mit `p` 0 oder `on` 0 ist jede Karte wie vorher (getestet).
2. `meetKit` liefert die Plätze (Regeln wie im Messwerkzeug `tools/treffpunkt.js`, Klasse A mit der richtigen Einfahrt: Wagen und Zone auf Kacheln, die ein Generator freiräumen kann, nicht im Gebäude, nicht auf den Wagenplätzen, die Fahrstrecke bis zum Weltrand frei). Dazu der Stil: Die Fahrstrecke darf einen Zaun nur kreuzen (ein Tor), nicht ihm entlang laufen, und in der Zone steht kein Zaun (Pflanzen, Fässer und Kisten dort räumt `placeMeet` weg). Der Wagen fährt mindestens `CFG.meet.drive` (2) Kacheln.
3. Der erste Platz in der gemischten Reihenfolge, dessen genaue Wege passen, gewinnt. Genau heißt: Die Tore, die `clearLane` in Zäune der Fahrstrecke schneidet, gehen auch Fußgänger, und der haltende Wagen ist ein fester Block (die Wege des Messwerkzeugs in D0 kennen beides nicht). Verlangt sind d, der Weg von der Fluchttür zum Ziel, von mindestens `CFG.meet.minD` (10) und e, der Weg von der Tresor-Standkachel dorthin, zwischen `pveMin` (8) und dem kleineren von `pveMax` (28) und dem Weg am alten Treffpunkt plus `extra` (8).
4. Gesetzt werden `exit` (Linie an der Kante zum Gebäude, Zone vier Zeilen breit von `r-1` bis `r+2`, `goal` in der freien Zonenzeile neben dem Wagen, die dem Weg nach näher liegende), `van` (Zeile, Start sechs Kacheln vor dem Halt, soweit der Rand es zulässt, Fahrtrichtung zum Gebäude hin), `exit.door` (die alte Linie und Spanne), `meet` `{t, r, d, e, e0}`, neu abgeleitete Posten und der Tag "Treffpunkt abseits". Die Markierung am Boden (zwei umrandete Stellplätze, in der Bank bisher an der Fluchttür gezeichnet) kommt von einem Wrapper um `paintFloor`, der die Markierung an der Fluchttür ersetzt.

**Fluchttür bleibt Fluchttür.** `laneOf` liest `exit.door` (sonst die Zonenlinie) für `exit.near`, so erkennt `findSpots` die verriegelte Tür weiter (Name, Barrikade, Öffnen mit dem Überfall, `validateMap`-Regel Eingänge). Neue Regel `treffpunkt` in `validateMap` (ohne erkannte Fluchttür ein Fehler) und die Warnung `treffpunkt-nah`.

**Polizei.** Die Posten sind abgeleitet (`autoPosts` aus der Geometrie), nicht die Handliste der Bank. Höchstens `CFG.meet.anchors` (2) Anker stehen an der Zone (`autoPosts` kappt, wenn `lay.meet` gesetzt ist), die Fluchttür behält keinen. Die Reihenfolge der Beamten bleibt Front, Fluchtseite, andere Seite, Rückseite.

**Wichtigster Fund beim Bau.** Das Ziel am Wagen darf nicht im Wagen liegen. Zuerst lag `exit.goal` in der Wagenzeile, und der haltende Wagen (fester Block) machte es unbegehbar: Der Bot fand keinen Weg und verlor alle Aufträge mit Treffpunkt abseits (0 von 56). An der Fluchttür ist das Ziel von der Wagen-Stempelung ausgenommen (`vanCells`), abseits gilt das nicht. Mit dem Ziel in der freien Zonenzeile gewinnt der Bot 38 von 38 (Rest-HP im Schnitt 87, 86 s). Ein Test (109) prüft deshalb, dass das Ziel nicht im Festen liegt und der Weg vom Start dorthin auch mit stehendem Wagen besteht.

**Zahlen (300 Bank-Karten, Seeds ab 1 im Abstand 37).** Mit `p` .5 haben 126 einen Treffpunkt abseits (42 %), mit `p` 1 sind es 245 (82 %): Die übrigen finden keinen Platz im Fenster oder ohne Zaun entlang der Fahrstrecke (meist Karten, deren Weg Tresor zu Wagen schon bei 24 bis 28 liegt). Abstand von der Fluchttür im Median 11 Schritte, Weg Tresor zu Wagen im Median 22 gegen 20 am alten Treffpunkt. In allen 8 Lagen der Straße bleibt es bei denselben Zahlen (bis auf zwei Schritte).

**Geändert an bestehenden Tests.** `36-treffpunkt-bank` und der Vergleich mit der Handliste in `27-kartenvertrag` laufen mit `CFG.meet.p` 0 (sie prüfen den Treffpunkt an der Fluchttür, den der Generator setzt). Die Schnappschüsse `layout-hash` (nur die Bank) und `sweep-bank` sind bewusst erneuert, alle anderen Karten bleiben Zeichen für Zeichen gleich. Neu: `109-treffpunkt-abseits` (acht Tests).

**Für D2 offen (inzwischen gebaut, siehe D2).** Die anderen Szenarien über `CFG.meet.scs` zuschalten: Juwelier, Tankstelle, Museum und Casino haben die Fluchttür fest an der Zone (die Generator-Tests 39, 42 und 43 prüfen `exit.tx` und `van.stop`), ihre Klassik-Hallen haben Handposten (würden neu abgeleitet), die Markierung in Phase 1 kommt dort nur von `placeMeet`. Dazu die Werte nach Tills Spieltest (`minD`, `extra`, `anchors`, `p`).

## D2 gebaut: Treffpunkt abseits für Juwelier, Tankstelle, Museum und Casino (26. Oktober 2026)

`CFG.meet.scs` nennt jetzt alle fünf Gebäude-Szenarien. Der Mechanismus aus D1 ist unverändert, dazu kamen nur die Freigabe und Werte je Szenario (`CFG.meet.per`, `meetOf(sc)` mischt sie über die Grundwerte). Der Transporter (Straßenkarte) und die Klassik-Bank (Seed `classic`, Rückfall) bleiben ausgenommen, die Klassik-Hallen der Generatoren zählen mit (ihre Handposten werden neu abgeleitet wie bei allen anderen Hallen auch).

**Werte je Szenario.** Grundwerte `p` .5, `minD` 10, `pveMin` 8, `pveMax` 28, `extra` 8, `anchors` 2, `drive` 2. Abweichungen: Museum `extra` 10 (der Weg Tresor zu Wagen ist dort heute 14 bis 16, jeder Platz mit 10 Schritten Abstand liegt bei 24 oder darüber, mit `extra` 8 fand keine Karte einen Platz), Juwelier `anchors` 1 (Bot-Messung unten).

**Zahlen (Seeds ab 1 im Abstand 37).** Anteil der Karten mit Treffpunkt abseits bei `p` .5 und bei `p` 1, Abstand von der Fluchttür und Weg Tresor zu Wagen jeweils im Median (in Klammern der Weg am alten Treffpunkt):

| Karte | p .5 | p 1 | Abstand | Weg Tresor zu Wagen |
|---|---|---|---|---|
| Bank | 126 von 300 | 245 von 300 | 11 | 22 (20) |
| Juwelier | 51 von 100 | 100 von 100 | 13 | 17 (13) |
| Tankstelle | 51 von 100 | 100 von 100 | 13 | 25 (21) |
| Museum | 53 von 100 | 100 von 100 | 10 | 24 (15) |
| Casino | 37 von 60 | 60 von 60 | 13 | 26 (20) |

Alle Hallen aller Szenarien finden Plätze (die Bank wegen ihrer engen Höfe und der Zaunregel nur bei rund 82 %). Im Casino stehen die Anker mit Abstand um die Zone (großes Gebäude), in der Ecke oben bleibt oft nur Platz für einen.

**Bot (früh rufen, `van` alt, gleiche Seeds mit und ohne Treffpunkt abseits).** Tankstelle 20 von 20 gegen 20 von 20, Museum 20 von 20 gegen 20 von 20, Casino 19 von 20 gegen 19 von 20, Bank 38 von 38 gegen 40 von 40. Der Juwelier fällt: ohne 72 % (n=60), mit Treffpunkt abseits und zwei Ankern 43 %, mit einem oder keinem Anker 53 % (Seeds ab 6000, Streuung rund 6 Punkte, die Seeds ab 5000 zeigten 67 gegen 27 % mit zwei Ankern). Der Weg Tresor zu Wagen allein erklärt es nicht (mit kleinerem `extra` kaum besser). Im Juwelier dauert das Beutemachen lange (der Bot braucht bis 180 s), die Polizei steht dann in voller Stärke im Hof. Gewählt: ein Anker. Ob das für Spieler passt, zeigt der Spieltest, die Stellschrauben sind `p`, `minD`, `extra` und `anchors` je Szenario.

**Geändert an bestehenden Tests.** Die Tests, die eine Karte ohne Treffpunkt abseits prüfen (Hand-Hallen unverändert: `39-juwelier-basis`, `42-museum-basis`, `43-casino-basis`, `37-tankstelle-generator` ohne Generator; Bauregeln der Hüllen: `39-juwelier-generator`, `42-museum-generator`, `43-casino-generator` mit festen Fluchtzonen; `27-kartenvertrag` Negativproben, `28-freie-strasse` autoPosts gegen Handliste), laufen mit `CFG.meet.p` 0. Schnappschüsse bewusst erneuert: `layout-hash`, `sweep-*` (Spannen von Posten und Weg Tresor zu Ausgang, `validateMap` ohne neue Fehler oder Warnungen), `vielfalt` (Fluchtvarianten je Szenario ungefähr verdoppelt), `turn-hash`. `109-treffpunkt-abseits` läuft jetzt für alle fünf Szenarien.

**Für D3 offen.** Der Ausweichpunkt als Ereignis (zweiter Platz im selben Hof, Wechsel situativ) braucht den Treffpunkt-Index im Schnappschuss und `VER`. Alle Karten haben jetzt einen Treffpunkt abseits oder an der Tür, der zweite Platz kommt aus derselben Kandidatenliste (`meetKit`).

## Gemeinsame Regeln für alle Schritte

- Test zuerst (rot), dann Code, `npm test`, bei Karten und Generatoren der Langlauf (`npm run test:long`) und der Alt-Neu-Vergleich (`tests/altneu.js`), die Gegenprobe über eine Kopie ohne den Umbau.
- `VER` erhöhen, wenn derselbe Seed eine andere Karte baut oder das Netzformat sich ändert, `UI_API` bei Änderungen am Kontext von `mkUI`. Schnappschüsse nur bewusst erneuern und im Commit sagen.
- Doku in der Themendatei, kurze Spieltest-Hinweise für Till in docs/offen-und-spieltest.md, ein Schritt ein Commit auf Zuruf (Cloud: auf einer Branch `claude/...`, Till mergt).
- Neue Dinge mit Zufall nur über `mulberry32` aus eigenem Strom, nie `Math.random`, und kein neues Feld ohne Eintrag in `MAP_FIELDS`.

## Risiken

- Fremdarbeiten in `index.html` (Pakete, Cloud-Sitzungen) und bei `VER`, die parallel zu einem Schritt laufen. Die Spuren selbst laufen nacheinander.
- Die Balance hat sich mehrfach gleichzeitig verschoben: Skillbaum (Stufe 3 der Pfade schon ab 6 Punkten), Geiseln (stärker), Ablenker (Schleichen leichter), Wachsamkeit (Schleichen schwerer). Der Bot misst nur den Überfall, Phase 1 messen `tools/stealth.js` und Tills Spiel.
- Die Welt ist für einen Treffpunkt abseits entlang der Achse eng (D0: Hof 9 bis 13 Kacheln), reicht aber, wenn der Wagen im Hof eine andere Zeile nimmt. Dann steigt der Weg Tresor zu Wagen um 6 bis 9 Schritte, bei Bank, Tankstelle und Casino bis an die Obergrenze des Fensters.
- Das Ereignis wechselt den Treffpunkt mitten im Überfall, das ist das heikelste Stück Spielgefühl und Netz (Host und Client müssen denselben Punkt zur selben Zeit kennen).

## Entschieden und offen (Till)

Entschieden am 25. Oktober 2026: Die Spuren laufen nacheinander. Der Mindestabstand des entfernten Treffpunkts bleibt erstmal bei 10 Kacheln. Die Umleitung kommt situativ (Polizei hält den Treffpunkt), und der Wechsel darf auch erfolgen, wenn der Fahrer nervös geworden ist und wegfährt. Spur 1 kommt zuerst, Spur 2 danach. Noch offen:

1. Ist B (der Ausweichpunkt) schon in Phase 1 sichtbar oder zeigt er sich erst beim Wechsel? Empfehlung: schon in Phase 1, damit man es planen kann.
2. (Entschieden am 26. Oktober 2026: Treffpunkt abseits im Hof der Fluchtseite auf einer anderen Zeile.)

## Änderungsprotokoll

- v1 bis v1.2 (25. Oktober 2026): Überbau aus Tills Plänen (Skillbaum-Umbau, Zusätze, Wachsamkeit der Läden) und dem Plan zum Fluchtwagen (D0 bis D3), Tills Antworten (Spuren nacheinander, Mindestabstand 10, Umleitung situativ mit Wechsel auch nach dem Wegfahren, Zähler serienweit), Reihenfolge Spur 1 zuerst.
- Bau (25. und 26. Oktober 2026): P3, A1 bis A3 (von Till abgenommen), B1 bis B5 und C1 gebaut. Kennzahlen: `VER` 34 (A1), 35 und `UI_API` 7 (B1), 36 und `UI_API` 8 (C1), 37 (B2), 38 (B3), 39 (B4 und B5), 40 (Flugschreiber); Tests `96-ablenker-blind`, `97-geisel-kugelfang`, `98-skillbaum-umbau`, `99-wachsamkeit`, `99-sprengfalle`, `99-c4`, `99-spezialwaffen`, `99-notfallkoffer`, `99-punkte-bonus`, `99-testwerkzeuge`. Entscheidungen beim Bau: C4 kostet Beute und Polizeizeit statt mehr Stück je Stufe (es gibt nur einen Tresor je Auftrag), die Spezialwaffe liegt auf Shift statt Taste 6, der Notfallkoffer auf Taste C statt 7, der Lautlos-Bonus flacht nach zwei lautlosen Siegen ab (35 und 20 %, `CFG.alert.fade`), lautlos gibt 1 Skillpunkt und der Überfall 2. Beim Bau behoben: Der Schlüssel `tr` stand im Schnappschuss doppelt (Fallen heißen jetzt `tp`) und `blastAt` machte Wagen bei Explosionen ohne `hp` zu `NaN`. Danach (26. Oktober 2026): Die Mine liegt immer auf der Seite der Barrikade gegenüber dem Spieler.
- 26. Oktober 2026: Die Test-Stopps entfallen auf Tills Wunsch (er testet nebenher), die Stand-Spalte ersetzt sie.
- 26. Oktober 2026: D0 gemessen (`tools/treffpunkt.js`, Test `108-treffpunkt-messung`), Ergebnis und Empfehlung im Abschnitt D0 Ergebnis. Till entscheidet: Treffpunkt abseits im Hof der Fluchtseite auf einer anderen Zeile.
- 26. Oktober 2026: D1 gebaut (`placeMeet`, `CFG.meet`, `VER` 42, Test `109-treffpunkt-abseits`), Bank als erster Kunde.
- 26. Oktober 2026: D2 gebaut (alle fünf Gebäude-Szenarien in `CFG.meet.scs`, Werte je Szenario in `CFG.meet.per`).
