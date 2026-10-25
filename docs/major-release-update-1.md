# Major Release Update 1

Teil der Projektdoku, der Kern steht in `CLAUDE.md`. Till hat am 25. Oktober 2026 im Gespräch mehrere Pläne beschlossen und sie unter dem Namen "Major Release Update 1" (kurz MRU 1) zusammengefasst. Diese Datei ist der Überbau: Schritte, Reihenfolge, Test-Stopps und der neue Plan zum Fluchtwagen. Die Einzelheiten der anderen Pläne stehen dort, wo sie entstanden sind, und werden hier nicht wiederholt. Gebaut wird erst auf Tills Go, Schritt für Schritt, Commit nur auf Zuruf.

## Ziel

Das Update vertieft das Spiel in drei Richtungen:
- Fähigkeiten und Gegenstände: Der Skillbaum wird zur echten Spezialisierung (Entweder-oder, ein Gegenstand je Pfad).
- Gegenspiel gegen eingefahrene Stile: Wachsamkeit der Läden (wer immer lautlos spielt, wird erschwert), Geiseln als Kugelfang, der Ablenker, die gestrichene Blendgranate.
- Abwechslung bei der Flucht: ein Treffpunkt abseits statt immer am Gebäude, dazu ein Ausweichpunkt als Ereignis.

Das gemeinsame Ziel (Till): Der Spieler soll zwischendurch seinen Stil ändern müssen, es soll weder zu schwer noch zu leicht werden.

## Voraussetzungen (nicht Teil des Updates)

- Sprint 9, Casino als Generator (läuft in der Cloud, bald fertig). Der Fluchtwagen-Teil beginnt erst danach, weil er alle Generatoren berührt.
- Paket P3, Lage-Tags im HUD (docs/bugfix-plaene.md, Plan steht, wartet auf Go). Die Wachsamkeit der Läden erzwingt Tags, die Bank zeigt heute schon bei mehr als zwei Zeilen nicht alle an.
- Tills Spieltests: Fahndung Schritt 2, Geiseln, der heutige Skillbaum (nur die Balance-Fragen warten auf den Umbau), die Coop-Punkte (docs/offen-und-spieltest.md). Die Regel aus `CLAUDE.md` gilt: Neues erst, wenn das Letzte getestet ist, außer Till sagt, dass es weitergehen soll.

## Schritte

Die Größen sind Schätzungen, keine Messungen. Namen für Commits und Gespräche: `MRU 1 A1` und so weiter.

| Schritt | Inhalt | Plan und Einzelheiten | Größe | Hängt ab von |
|---|---|---|---|---|
| A1 | Blendgranate des Shops streichen (die der Polizei bleibt), Taste 3 frei | docs/ideen-und-planung.md, Zusätze im selben Update | klein | |
| A2 | Ablenker macht Angestellte blind (`decT` 11, `decHold` 10, Zeichen über dem Kopf) | dort | klein bis mittel | |
| A3 | Geisel als Kugelfang: Polizeikugeln treffen Geiseln, Beamte schießen nicht durch sie | dort | mittel | |
| B1 | Skillbaum, Layout und Struktur: drei Zeilen, Entweder-oder, Aufleuchten, Punkte zurücknehmen, Techniker, Zäh, Fahrer und Verhandler in Stufe 3 der Pfade | dort, Skillbaum-Umbau | mittel | A1 (Taste 3) |
| B2 | Sprengfalle: Barrikaden-Mine und Claymore (treffen auch Mitspieler) | dort | mittel | B1 |
| B3 | C4 für Tresore und die Sprengladung des Geldtransporters | dort, Gegenstände | mittel bis groß | B1 |
| B4 | Besondere Waffen: Präzisionsgewehr und Granatwerfer | dort | mittel bis groß | B1 |
| B5 | Notfallkoffer | dort | klein bis mittel | B1 |
| B6 | Balance des Skillbaums messen und anpassen | dort | mittel | Tills Spieltest |
| C1 | Wachsamkeit der Läden, Stufe 1 (Zähler serienweit über alle fünf Szenarien mit Phase 1, Wachsames Personal erzwungen, Badge, Netz) | docs/ideen-und-planung.md, Karriere-Serie | mittel | P3 |
| C2 | Wachsamkeit, Stufe 2 (Sicherheitsdienst), nur falls Stufe 1 nicht reicht | dort | klein, aber das Layout hängt am Zähler | C1 |
| D0 | Messung: Wie viel Platz hat jede Karte in jeder Lage für einen zweiten und einen entfernten Treffpunkt | unten | klein | Sprint 9 |
| D1 | Gemeinsamer Treffpunkt-Mechanismus mit zweitem Treffpunkt am Gebäude, Bank als erster Kunde | unten | groß | D0 |
| D2 | Treffpunkt abseits | unten | groß | D1 |
| D3 | Ausweichpunkt als Ereignis | unten | mittel | D1, besser D2 |

## Reihenfolge und Test-Stopps

Zwei Spuren, die einander kaum berühren:
- Spur 1, Spielsystem: P3, A1, A2, A3, B1, C1, B2, B3, B4, B5, dann B6 und C2 nach den Tests.
- Spur 2, Karte und Flucht: D0, D1, D2, D3, beginnt nach Sprint 9.

Test-Stopps für Till (er spielt, bevor die nächste Gruppe beginnt, außer er sagt Weiter):
1. Nach A1 bis A3 (Shop ohne Blendgranate, Ablenker, Geiseln gegen die Polizei).
2. Nach B1 (der neue Baum ohne Gegenstände).
3. Nach C1 (fünf lautlose Aufträge hintereinander, ob die Läden warnen).
4. Nach D1 (zweiter Treffpunkt in allen Szenarien, Solo und Coop).
5. Nach D2 und D3 (Treffpunkt abseits, Umleitung).
6. Nach B2 bis B5 je Gegenstand einzeln, B3 zusammen mit dem Transporter.

Entschieden (Till, 25. Oktober 2026): eine Spur nach der anderen, nicht parallel, und Spur 1 zuerst (P3, A1 bis A3, B1, C1, dann B2 bis B5), Spur 2 beginnt nach Sprint 9 und nachdem Spur 1 gemergt ist. Damit entfallen Kollisionen in `index.html` und bei `VER` zwischen den Spuren, ein Schritt wird gemergt, bevor der nächste beginnt.

## Fluchtwagen: Treffpunkt abseits und Ausweichpunkt (neuer Plan, Till, 25. Oktober 2026)

Anlass (Till): Es spielt sich etwas eintönig, dass der Wagen immer einfach an das Gebäude heranfährt. Gewünscht: ein alternativer Treffpunkt abseits, und der Ausweichpunkt als Ereignis. Gebaut wird nach dem letzten Generator (Sprint 9), global für alle Szenarien. Das ist die Stufe 2 des alten Plans "Treffpunkt des Fluchtwagens" in docs/offen-und-spieltest.md, jetzt anders zugeschnitten (dort steht nur noch der Verweis).

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
- Doku in der Themendatei, Spieltest-Fragen für Till in docs/offen-und-spieltest.md, ein Schritt ein Commit auf Zuruf (Cloud: auf einer Branch `claude/...`, Till mergt).
- Neue Dinge mit Zufall nur über `mulberry32` aus eigenem Strom, nie `Math.random`, und kein neues Feld ohne Eintrag in `MAP_FIELDS`.

## Risiken

- Fremdarbeiten in `index.html` (Pakete, Cloud-Sitzungen) und bei `VER`, die parallel zu einem Schritt laufen. Die Spuren selbst laufen nacheinander (Till, 25. Oktober 2026).
- Die Balance verschiebt sich mehrfach gleichzeitig: Skillbaum (Stufe 3 der Pfade schon ab 6 Punkten), Geiseln (stärker), Ablenker (Schleichen leichter), Wachsamkeit (Schleichen schwerer). Der Bot misst nur den Überfall, Phase 1 messen `tools/stealth.js` und der Spieltest. Deshalb die Test-Stopps.
- Das Entfernen der Blendgranate ändert Kit, Shop-Katalog und mehrere Tests.
- Die Welt ist für einen Treffpunkt abseits eng (D0 klärt, ob die Generatoren größere Welten brauchen).
- Das Ereignis wechselt den Treffpunkt mitten im Überfall, das ist das heikelste Stück Spielgefühl und Netz (Host und Client müssen denselben Punkt zur selben Zeit kennen).

## Entschieden und offen (Till)

Entschieden am 25. Oktober 2026: Die Spuren laufen nacheinander. Der Mindestabstand des entfernten Treffpunkts bleibt erstmal bei 10 Kacheln. Die Umleitung kommt situativ (Polizei hält den Treffpunkt), und der Wechsel darf auch erfolgen, wenn der Fahrer nervös geworden ist und wegfährt. Spur 1 kommt zuerst, Spur 2 danach. Noch offen:

1. Ist B (der Ausweichpunkt) schon in Phase 1 sichtbar oder zeigt er sich erst beim Wechsel? Empfehlung: schon in Phase 1, damit man es planen kann.

## Änderungsprotokoll

- v1 (25. Oktober 2026): Überbau aus Tills Plänen vom selben Tag (Skillbaum-Umbau, Zusätze, Wachsamkeit der Läden) und dem neuen Plan zum Fluchtwagen (D0 bis D3), Schritte, Reihenfolge, Test-Stopps.
- v1.1 (25. Oktober 2026): Tills Antworten eingearbeitet (Spuren nacheinander, Mindestabstand 10, Umleitung situativ mit Wechsel auch nach dem Wegfahren), Zähler der Wachsamkeit serienweit über alle fünf Szenarien.
- v1.2 (25. Oktober 2026): Reihenfolge entschieden, Spur 1 zuerst, Spur 2 danach.
- Bau (25. Oktober 2026, Go von Till: "mit Major Release beginnen"): P3 gebaut (Commit `b22ca26`), A1 gebaut (Blendgranate des Shops gestrichen, `VER` 34), A2 gebaut (Ablenker macht Angestellte blind, `decT` 11, `decHold` 10, Zeichen über dem Kopf, Test `96-ablenker-blind`, kein neues `VER`), A3 gebaut (Geisel als Kugelfang: `hostBlock`, `hostHit`, `CFG.hostage.line`, Test `97-geisel-kugelfang`, kein neues `VER`), danach Test-Stopp 1 (Till hat A1 bis A3 gespielt und am 25. Oktober 2026 abgenommen). B1 gebaut (Skillbaum: Layout in drei Zeilen, Entweder-oder, Gegenstände als Platzhalter `soon`, Zäh, Verhandler und Fahrer in Stufe 3 der Pfade, Techniker, Rücknahme bis zum Verlassen des Shops, Aufleuchten der Kette, `VER` 35, `UI_API` 7, Test `98-skillbaum-umbau`), danach Test-Stopp 2. Nachtrag auf Tills Wunsch (er hatte B1 angespielt): jeder Pfad hat jetzt einen Zusatz mit Stufe 3, neu sind Läufer (Ruhige Hand), Durchschuss (Durchschlag) und Sammler (Baumeister), kein neues `VER`. C1 gebaut (Wachsamkeit der Läden, Stufe 1: Zähler `SESSION.quiet`, erzwungener Tag `wachsam` als gewarnt ohne Aufschlag ab 2 lautlosen Siegen in Folge, Badge, Netz `q`, `VER` 36, `UI_API` 8, Test `99-wachsamkeit`), danach Test-Stopp 3. B3 gebaut (C4 mit E am Tresor und am Laderaum, laut, Beute verbrennt, die Stufen sparen Verlust statt mehr Stück, `CFG.c4`, `c4Blast`, `lo` im Netz, `VER` 38, Test `99-c4`, Till hatte Go: "weiter mit B3, dem C4"). B2 gebaut (Sprengfalle: Barrikaden-Mine und Claymore mit Taste 3, `CFG.trap`, `traps`, `trapStep`, `blastAt` mit `pdmg`, Netz `tr`, `VER` 37, Test `99-sprengfalle`, Till hatte Go: "weiter mit B2, die Sprengfalle"). B4 und B5 gebaut (Till: "schau dir B4 und B5 als nächstes an und setze diese um"): B4 Besondere Waffen (Präzisionsgewehr `A3` und Granatwerfer `A4`, zuerst auf Taste 6 mit Halten und Loslassen, auf Tills Wunsch noch am selben Tag umgebaut: Shift schaltet ein und aus, Linksklick oder Leertaste schießt, die Pistole schweigt solange, `spwOn`, `reqSpw`, kein Netzfeld, `CFG.spw`, `fireSpw`, `spwMul`, `shellBoom`, Kugeln mit `pr`, Granaten `shell`, Test `99-spezialwaffen`), B5 Notfallkoffer (`U3` auf Taste C (zuerst 7), ein abgestellter Koffer heilt 10 s lang, `CFG.aid`, `aidDown`, `aidStep`, Netz `kf`, Test `99-notfallkoffer`), `VER` 39. Beim Bau zwei Fehler aus B2 behoben: Der Schlüssel `tr` stand im Schnappschuss doppelt (Fallen und Zustand des Transporters, im Coop gingen die Transporter-Werte verloren, die Fallen heißen jetzt `tp`) und `blastAt` machte Wagen bei Explosionen ohne `hp` (Fallen) zu `NaN`. Die Wirkungszeile `w` der Gegenstände im Fenster Fähigkeiten und die Anleitung (`1 / 2 / C`, `3 / 4 / 5 halten`, Shift `schleichen, Waffe wechseln`) kamen mit. Die Tests `93`, `98`, `99-c4` und `99-sprengfalle` kennen keine Platzhalter mehr. Danach Test-Stopp 6 (je Gegenstand einzeln).
