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
| D0 | Messung: Wie viel Platz hat jede Karte in jeder Lage für einen zweiten und einen entfernten Treffpunkt | unten | klein | offen, als Nächstes |
| D1 | Gemeinsamer Treffpunkt-Mechanismus mit zweitem Treffpunkt am Gebäude, Bank als erster Kunde | unten | groß | offen |
| D2 | Treffpunkt abseits | unten | groß | offen |
| D3 | Ausweichpunkt als Ereignis | unten | mittel | offen |

## Reihenfolge

Zwei Spuren, die einander kaum berühren:
- Spur 1, Spielsystem: gebaut bis auf B6 (nach Tills Rückmeldung zum Baum) und C2 (bei Bedarf).
- Spur 2, Karte und Flucht: D0, D1, D2, D3, die Voraussetzung (Sprint 9) steht.

Entschieden (Till, 25. Oktober 2026): eine Spur nach der anderen, nicht parallel, ein Schritt wird gemergt, bevor der nächste beginnt. Damit entfallen Kollisionen in `index.html` und bei `VER` zwischen den Spuren.

## Fluchtwagen: Treffpunkt abseits und Ausweichpunkt (neuer Plan, Till, 25. Oktober 2026)

Anlass (Till): Es spielt sich etwas eintönig, dass der Wagen immer einfach an das Gebäude heranfährt. Gewünscht: ein alternativer Treffpunkt abseits, und der Ausweichpunkt als Ereignis. Gebaut wird global für alle Szenarien. Das ist die Stufe 2 des alten Plans "Treffpunkt des Fluchtwagens" (Stufe 1, die Bank mit zwei Treffpunkten, ist gebaut, Entwurf in docs/archiv-gebaute-plaene.md).

Ist-Zustand: Der Treffpunkt ist der Haltepunkt des Fluchtwagens im Hof neben dem Gebäude (`LANE.van`), die Fluchtzone liegt an einem Ende der Straßenachse (`LANE.exit`, Fluchtseite), die Fluchttür ist fest je Karte. Nur die Bank würfelt seit Sprint 5 zwischen Ost und West (`tpf` in `genLayout`), die übrigen Karten haben einen Treffpunkt, dessen Seite die Spiegelung wählt. Die Polizei besetzt ihre Posten in der Reihenfolge Front, Treffpunkt-Seite, andere Seite, Nord, die Anker folgen der Fluchttür (`fillDerived`, `autoPosts`). Der Wagen fährt immer parallel zur Straßenachse, eine echte Seitenstraße quer dazu würde `laneOf` erweitern.

- **D0, Messung zuerst.** Für jedes Szenario und jede Lage (und die Hüllen der Generatoren): freie Strecke längs der Straßenachse hinter dem Gebäude, Abstand von der Fluchttür zum Haltepunkt, Platz für einen zweiten Treffpunkt. Warum zuerst: Die Welt ist beim Juwelier 44 Kacheln breit, bei großer Halle (`hw` 17) bleiben für den Hof etwa neun Kacheln, die Bank ist 44 x 28 und gedreht nur 28 breit. Ein Treffpunkt 15 Kacheln abseits passt also nicht überall. Ergebnis ist eine Tabelle und eine Entscheidung: nur entlang der Achse, Welt für die Generatoren vergrößern (Karten über 64 x 64 sind ungeprüft, siehe docs/ideen-und-planung.md, größere Endgame-Karten), oder der Treffpunkt auf der anderen Seite des Gebäudes (der Wagen fährt vorbei).
- **D1, gemeinsamer Mechanismus.** Jeder Generator liefert nur Kandidaten (Fluchttür, Haltepunkt, Zone, Hinweis für die Anker), eine gemeinsame Funktion wählt aus dem Seed (eigener Zufallsstrom über `mulberry32`, wie `turnFor`), setzt `exit` und `van` und lässt `fillDerived` Posten und Anker ableiten. Die Bank wird der erste Kunde (Ost oder West bleibt als Kandidaten, die Verteilung 50 zu 50). Phase 1 nennt den Fluchtweg (Tag und Bodenmarkierung) für alle. Prüfung: `validateMap` bekommt eine Regel für den zweiten Treffpunkt, `mapcheck.vsweep` über viele Seeds in jeder Lage, Bot-Rauchtest mit `van:'alt'`, Coop über die Test-Leitung, Kontaktbögen (`tests/sheet.js`), Alt-Neu-Vergleich mit abgeschaltetem Treffpunkt (muss IDENTISCH bleiben). `VER` steigt, weil derselbe Seed eine andere Karte baut.
- **D2, Treffpunkt abseits.** Der Haltepunkt und die Zone liegen ein Stück weg vom Gebäude, mindestens 10 Kacheln Weg von der Fluchttür (Till: erstmal so lassen, Wert in `CFG`, der tatsächliche Abstand kommt aus D0). Der Weg dahin (Hof, Fahrweg, Gasse) ist eine Strecke, die man unter Beschuss läuft, die Polizei kann sie abschneiden. Wenige Anker am entfernten Punkt, sonst wird er die sichere Flucht (wie `CFG.map.anW` bei der Bank). Längere Wege sind laut Tills Leitlinie kein Nachteil, die Grenzen bleiben weite Leitplanken gegen Extreme. Kosten: Die Fluchtwagen-Anfahrt, `vanPointer` und die Zielkachel (`exit.goal`) hängen am Treffpunkt und müssen ihm folgen, `laneOf` bleibt wenn möglich unverändert.
- **D3, Ausweichpunkt als Ereignis.** Der Fahrer weicht aus, wenn die Polizei den Treffpunkt hält (Till, 25. Oktober 2026: situativ, nicht nach einer festen Zeit). Jeder Auftrag mit zwei Kandidaten aus D1 und D2 hat ein A und ein B (das B würfelt der Seed aus eigenem Zufallsstrom, nicht aus dem Strom der Auftragslage, damit Karten und Tags desselben Seeds gleich bleiben). Auslöser heute schon vorhanden: Der Fahrer wird nervös, wenn ein Beamter näher als `CFG.van.r` am Haltepunkt steht (`vanNv`, HUD `Polizei! Abfahrt in N s`), fährt nach `leave` 5 s weg (`vanMode` 1), wartet mindestens `back` 8 s abseits (2) und kommt zurück (3), sobald kein Beamter mehr am Haltepunkt steht. Neu: Der Fahrer kommt dann an B zurück, wenn A noch von der Polizei gehalten wird (Till: Der Wechsel darf auch erfolgen, wenn der Fluchtwagen nervös geworden ist und wegfährt). Hält die Polizei schon beim Rufen (G) den Treffpunkt, fährt er direkt zu B. Ist auch B besetzt, wartet er abseits wie heute. Solange der Wagen ruhig am Treffpunkt wartet, gibt es keinen Wechsel. Der Wechsel ändert Haltepunkt, Zone, Markierung, Zeiger (`vanPointer`) und die Zielkachel, die Polizei-Anker bleiben bei A (Vorschlag: an B stehen wenige oder keine Anker, sonst gäbe es keinen Grund auszuweichen). Meldung groß im HUD und im Feed ("Fahrer: Ich weiche aus nach ..."). Netz: Der Treffpunkt-Index fährt im Schnappschuss (`g`) mit, `vanMode` gibt es schon (`g[22]`), `VER` steigt. Offen: Ist B schon in Phase 1 sichtbar (kleine Markierung, planbar) oder zeigt sich B erst beim Wechsel (Überraschung)? Empfehlung: schon in Phase 1 genannt, das Briefing nennt "Ausweichpunkt vorhanden", damit der Spieler es im Plan hat. Später möglich: zusätzlich ein Ereignis mit fester Zeit aus dem Seed ("Straße gesperrt"), nicht Teil des Updates.
- **Nicht im Update:** Die Spieler wählen den Treffpunkt beim Rufen (G). Das kostet Bedienung, ein Netzfeld und `VER`, erst bewerten, wenn D2 und D3 gespielt sind. Ebenso eine echte Seitenstraße quer zur Hauptstraße, falls D0 sie nicht verlangt.
- **Balance und Messung:** Der Bot beurteilt die Fahrer-Regeln nicht, er misst nur, ob der Weg lösbar bleibt (Rauchtest mit frühem Rufen in jeder Variante). Zur Orientierung: Bei der Bank gewann der Bot bis 22 Schritten Weg rund 60 %, bei 25 bis 26 Schritten rund 21 %, das zeigt, wo ein zu weiter Treffpunkt hinführt. Was fühlt sich richtig an, entscheidet Tills Spieltest.

## Gemeinsame Regeln für alle Schritte

- Test zuerst (rot), dann Code, `npm test`, bei Karten und Generatoren der Langlauf (`npm run test:long`) und der Alt-Neu-Vergleich (`tests/altneu.js`), die Gegenprobe über eine Kopie ohne den Umbau.
- `VER` erhöhen, wenn derselbe Seed eine andere Karte baut oder das Netzformat sich ändert, `UI_API` bei Änderungen am Kontext von `mkUI`. Schnappschüsse nur bewusst erneuern und im Commit sagen.
- Doku in der Themendatei, kurze Spieltest-Hinweise für Till in docs/offen-und-spieltest.md, ein Schritt ein Commit auf Zuruf (Cloud: auf einer Branch `claude/...`, Till mergt).
- Neue Dinge mit Zufall nur über `mulberry32` aus eigenem Strom, nie `Math.random`, und kein neues Feld ohne Eintrag in `MAP_FIELDS`.

## Risiken

- Fremdarbeiten in `index.html` (Pakete, Cloud-Sitzungen) und bei `VER`, die parallel zu einem Schritt laufen. Die Spuren selbst laufen nacheinander.
- Die Balance hat sich mehrfach gleichzeitig verschoben: Skillbaum (Stufe 3 der Pfade schon ab 6 Punkten), Geiseln (stärker), Ablenker (Schleichen leichter), Wachsamkeit (Schleichen schwerer). Der Bot misst nur den Überfall, Phase 1 messen `tools/stealth.js` und Tills Spiel.
- Die Welt ist für einen Treffpunkt abseits eng (D0 klärt, ob die Generatoren größere Welten brauchen).
- Das Ereignis wechselt den Treffpunkt mitten im Überfall, das ist das heikelste Stück Spielgefühl und Netz (Host und Client müssen denselben Punkt zur selben Zeit kennen).

## Entschieden und offen (Till)

Entschieden am 25. Oktober 2026: Die Spuren laufen nacheinander. Der Mindestabstand des entfernten Treffpunkts bleibt erstmal bei 10 Kacheln. Die Umleitung kommt situativ (Polizei hält den Treffpunkt), und der Wechsel darf auch erfolgen, wenn der Fahrer nervös geworden ist und wegfährt. Spur 1 kommt zuerst, Spur 2 danach. Noch offen:

1. Ist B (der Ausweichpunkt) schon in Phase 1 sichtbar oder zeigt er sich erst beim Wechsel? Empfehlung: schon in Phase 1, damit man es planen kann.

## Änderungsprotokoll

- v1 bis v1.2 (25. Oktober 2026): Überbau aus Tills Plänen (Skillbaum-Umbau, Zusätze, Wachsamkeit der Läden) und dem Plan zum Fluchtwagen (D0 bis D3), Tills Antworten (Spuren nacheinander, Mindestabstand 10, Umleitung situativ mit Wechsel auch nach dem Wegfahren, Zähler serienweit), Reihenfolge Spur 1 zuerst.
- Bau (25. und 26. Oktober 2026): P3, A1 bis A3 (von Till abgenommen), B1 bis B5 und C1 gebaut. Kennzahlen: `VER` 34 (A1), 35 und `UI_API` 7 (B1), 36 und `UI_API` 8 (C1), 37 (B2), 38 (B3), 39 (B4 und B5), 40 (Flugschreiber); Tests `96-ablenker-blind`, `97-geisel-kugelfang`, `98-skillbaum-umbau`, `99-wachsamkeit`, `99-sprengfalle`, `99-c4`, `99-spezialwaffen`, `99-notfallkoffer`, `99-punkte-bonus`, `99-testwerkzeuge`. Entscheidungen beim Bau: C4 kostet Beute und Polizeizeit statt mehr Stück je Stufe (es gibt nur einen Tresor je Auftrag), die Spezialwaffe liegt auf Shift statt Taste 6, der Notfallkoffer auf Taste C statt 7, der Lautlos-Bonus flacht nach zwei lautlosen Siegen ab (35 und 20 %, `CFG.alert.fade`), lautlos gibt 1 Skillpunkt und der Überfall 2. Beim Bau behoben: Der Schlüssel `tr` stand im Schnappschuss doppelt (Fallen heißen jetzt `tp`) und `blastAt` machte Wagen bei Explosionen ohne `hp` zu `NaN`. Danach (26. Oktober 2026): Die Mine liegt immer auf der Seite der Barrikade gegenüber dem Spieler.
- 26. Oktober 2026: Die Test-Stopps entfallen auf Tills Wunsch (er testet nebenher), die Stand-Spalte ersetzt sie.
