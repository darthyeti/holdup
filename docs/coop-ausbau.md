# Coop-Ausbau: Funk und Chat, Zuschauer, Wettkampf

Teil der Projektdoku, der Kern steht in `CLAUDE.md`. Plan v1 vom 26. Oktober 2026 (über Nacht ausgearbeitet aus Tills drei Wünschen). **Till hat am 26. Oktober 2026 alle Empfehlungen des Plans angenommen** ("das passt für mich, wie du es vorschlägst"): Die zehn Entscheidungen unten gelten wie empfohlen, die Reihenfolge ist F1, F2, F3, W0, Z, W. Die Schritte sind so geschnitten, dass jeder für sich Nutzen bringt und einen Commit mit Tests ergibt. **Stand der Schritte:** siehe Tabelle Stand am Ende des Dokuments.

Tills Wünsche (26. Oktober 2026, vor dem Feierabend):
1. Eine Chatfunktion für den Coop und vielleicht eine Funkfunktion: die zwei bis drei wichtigsten Befehle zur Koordination per Taste absetzen ("Lasst uns leise vorgehen", "Ich brauche Hilfe"), für alle Mitspieler sichtbar und hörbar.
2. Eine Zuschauerfunktion im Coop: vier Spieler und eine Anzahl x Zuschauer.
3. Ein Plan, wie man zukünftig zwei Mannschaften (2 mal 4) parallel auf demselben Seed zum Vergleich spielen lässt. Zuschauer sehen beides. Eine Art Wettkampfmodus.

## Kurzfassung

- **Spur F, Funk und Chat.** Erst der Funkspruch (Taste X, dann Ziffer 1 bis 4, vier Sprüche je Phase plus Markierung am Fadenkreuz), dann der Textchat. Der Funkspruch ist der Teil, der im Gefecht wirklich benutzt wird, der Chat ist für Lobby, Shop, Ergebnis und ruhige Phasen. Beide laufen über den Host, brauchen keinen Server und kaum Bandbreite. Stimme (Sprachchat) planen wir nicht.
- **Spur Z, Zuschauer.** Zuschauer sind passive Clients ohne Spielerplatz. Sie dürfen jederzeit kommen (auch in ein laufendes Spiel), sehen das Spiel aus der Sicht eines Spielers oder frei, und bekommen den Strom mit halber Rate (10 statt 20 Schnappschüsse je Sekunde). Obergrenze 6 je Raum. Gemessen: Ein Schnappschuss kostet den Host 0,07 ms, die Bandbreite je Empfänger ist der eigentliche Engpass. Zwei Wegwerf-Versuche haben belegt, dass die zwei größten technischen Fragen harmlos sind: Eine Platzhalter-Figur als `me` läuft in allen Szenarien ohne Fehler, und ein Zuschauer, der mitten im Gefecht einsteigt, hat nach 12 s denselben Zustand wie ein Dauer-Client.
- **Spur W, Wettkampf.** Zwei getrennte Coop-Räume (zwei Hosts, je bis zu vier Spieler) auf derselben Karte, verbunden durch eine dünne Host-zu-Host-Leitung für Start, Fortschritt und Ergebnis. Die Zuschauer sehen das eine Team in voller Ansicht und beide Teams als Punkte auf derselben Karte (zwei Welten, eine Karte). Wichtigste Einschränkung: Das Spiel ist nicht deterministisch (Streuung, Beamte, Zivilisten würfeln), fair heißt deshalb "gleiche Bedingungen", nicht "gleiche Ergebnisse".
- **Reihenfolge.** F1 und F2 (Funk, Markierung), F3 (Chat), W0 (Seed-feste Zivilisten, klein), Z1 bis Z4 (Zuschauer), W1 bis W3 (Wettkampf). Die Serien-Code-Schritte S1 bis S3 (docs/ideen-und-planung.md) machen den Wettkampf schöner, sind aber keine Voraussetzung.
- **Vorab zu klären (Till, Abschnitt Entscheidungen):** Netz-Realität (strenge NATs, Relay), Standardwerte (Zuschauer an, Obergrenze, Verzögerung im Wettkampf), Wertung und Länge eines Duells.

## So würde es sich anfühlen

- **Funk.** Phase 1, Anna steht nah an einer Wache und die anderen laufen schon los. Sie drückt X, dann 2. Bei allen erscheint orange `Anna: Lasst uns leise vorgehen!`, ein kurzes Funk-Knacken, über Annas Figur ein paar Funkwellen. Später liegt Ben am Boden: X, 1. Dreifacher dringender Ton, `Ben: Ich brauche Hilfe!`, ein Pfeil am Bildrand zeigt zu ihm, und er hat noch seine 25 Sekunden bis zum Verbluten.
- **Zuschauer.** Clara bekommt von Till den Zuschauer-Link und kommt mitten im Gefecht dazu. Sie sieht zuerst Anna, mit dem Pfeil nach rechts wechselt sie zu Ben, mit V löst sie die Kamera und schaut sich den Fluchtwagen an. Till sieht in der Lobby und in der Team-Leiste "Zuschauer: 1". Clara kann nichts auslösen: Der Host verwirft von Zuschauern alles außer Handschlag, Namen, Ping und Tribünen-Chat.
- **Wettkampf.** Till und Max eröffnen je einen Raum, Max gibt Tills Code als Gegner ein. Beide Teams haben vier Spieler und drücken "Bereit", nach fünf Sekunden spielen beide die Tankstelle auf derselben Karte. Im HUD steht eine kleine Tafel `Gegner: 38.000 | Welle 2 | 3 von 4 aktiv` neben den eigenen Werten. Am Ende des Auftrags blättert man auf die Seite "Duell" und sieht beide Ergebnisse nebeneinander. Nach drei Aufträgen steht der Sieger fest, "Revanche" startet eine neue Folge. Die Zuschauer sehen ein Team in voller Ansicht und rechts oben eine Karte mit beiden Teams als Punkten, 20 Sekunden verzögert.

## Annahmen aus Tills bisherigen Entscheidungen

Wo Till nichts gesagt hat, habe ich so angenommen, wie er sonst entschieden hat. Jede Annahme ist hier benannt, damit er sie kippen kann.

| Nr | Annahme | Herkunft |
|---|---|---|
| A1 | Kein eigener Server. WebRTC über PeerJS mit Raumcode, der Host rechnet alles, Clients bekommen Schnappschüsse. Alles Neue läuft auf dieser Architektur. | CLAUDE.md, docs/coop-und-netz.md, Serien-Code-Plan ("kein eigener Server") |
| A2 | Ein Team hat höchstens 4 Spieler (vier Farben in `PC`, Plätze 0 bis 3). Zuschauer belegen keinen dieser Plätze. | docs/spielsystem.md, Spieler |
| A3 | Das Spiel ist nicht deterministisch, ein Replay ist kein Ziel. | Flugschreiber (docs/coop-und-netz.md), Serien-Code-Plan, Grenzen |
| A4 | Ein neuer Raum ist immer eine neue Serie. Beim Wettkampf starten beide Teams bei null (Konto, Ausrüstung, Skills, Fahndung). Die Shop-Entscheidungen gehören zum Vergleich. | Paket P6, Serien-Code-Plan ("der Vergleich misst auch Entscheidungen") |
| A5 | Wertung wie im Serien-Code-Plan: erst Zahl der gewonnenen Aufträge, dann Beute gesamt. Verglichen wird nur bei gleicher Spielerzahl. | docs/ideen-und-planung.md, Serien-Code, S3 |
| A6 | "Zwei Mannschaften parallel auf demselben Seed" heißt: zwei getrennte Welten mit derselben Karte, nicht zwei Teams in einer Welt (kein PvP). | Tills Wortlaut ("zum Vergleich", "Zuschauer sehen dann beides") |
| A7 | Keine Test-Stopps, aber auch kein Bau ohne Go. Tests zuerst (rot), Mutanten, kurze Spieltest-Hinweise. | docs/offen-und-spieltest.md, Pflege |
| A8 | Kein Sprachchat im Plan (Till nennt Text und Funkbefehle). Wer zusammen spielt, hat meist ohnehin Sprache (Telefon, Discord). Funk und Chat sind für das, was sich im Spiel selbst sichtbar machen lässt. | Annahme, nicht entschieden |
| A9 | Menüs bleiben Kacheln (`js/ui.js`), neue Bildschirmteile bekommen einen Überlappungstest. Namen höchstens 12 Zeichen (`NAME_MAX`). | docs/spielsystem.md, Test 80 |
| A10 | Die Zuschauer-Namen existieren schon, ein Wechsel per Taste war notiert, aber nicht gebaut. Heute zeigt `setView()` einem Gefallenen automatisch den ersten lebenden Mitspieler. | docs/offen-und-spieltest.md, Coop Punkt 2 |

## Ist-Stand im Code (Fundstellen)

- **Verbindung.** `hostConn(c)` vergibt den Platz sofort beim Verbindungsaufbau (Ids 1 bis 3, nur in der Lobby), noch vor der Nachricht `hi`. Das muss sich für Zuschauer und Gegner-Hosts ändern: Die Entscheidung "Spieler, Zuschauer oder Gegner" fällt erst mit `hi`. `NET.conns` enthält nur Spieler und kommt in 12 Zeilen von `index.html` vor (14 Stellen), die Kopplung ist überschaubar. Zuschauer bekommen eine eigene Liste `NET.specs`, `bcast` sendet an beide.
- **Schnappschuss.** `buildSnap()` liefert den ganzen Zustand (kein Delta), `netHostTick` schickt ihn alle 50 ms an jeden Client (`c.send(Object.assign({ev:...},s))`, eine JSON-Kodierung je Empfänger). Ereignisse (`evt`) hängen am Schnappschuss und gehen mit `to === -1` an alle oder mit einer Spieler-Id nur an einen. Ein Spät-Einsteiger braucht deshalb kein Delta-Protokoll, nur den Aufbau der Welt (`reset()` aus Seed und Szenario) und danach Schnappschüsse.
- **Ich und angezeigte Figur.** `me` ist der lokale Spieler, `p` die angezeigte Figur (`setView`). Kamera, Sichtfeld (`visPoly`), HUD und Fadenkreuz hängen an `p`, Simulationscode nimmt nie `p`. `me` kommt rund 70 mal im Code vor, `reset()` setzt `me=players[Math.min(NET.myId,nPl-1)]`. Ein Zuschauer ohne Spielerplatz bräuchte eine Platzhalter-Figur.
- **Eingabe.** `kn(e)` normiert Tasten (Einzelzeichen klein). In Gebrauch sind W A S D, Pfeile, Leertaste, E, F, G, H, Q, R, C, M, P, 1 bis 5, Shift, Esc, F8, F9, im Ergebnis Enter und Pfeile. Im laufenden Spiel sind alle anderen Buchstaben und Tab frei, darunter X, Z, V und B (die Menü-Tasten gelten nur in Menüs und in der Pause). Es gibt schon einen Texteingabe-Zustand (`nameEdit`, der Spielername), der vor allen anderen Tasten greift.
- **Meldungen.** `say(t,to)` und `ban(s,t,to)` laufen über `evt`, das Meldungsfeld `feed` (5 Zeilen, 6 s, Breite `CFG.hud.feedW`) und das Banner. Der Flugschreiber protokolliert jedes `say`.
- **Ton.** `SND` (WebAudio, komplett synthetisch). `SND.radio()` gibt es schon (zwei Pieptöne und Rauschen, benutzt beim Rufen des Fluchtwagens). **Namenskonflikt:** Im Shop heißt ein Posten `Funkgerät` (`radio`, ruft den Fluchtwagen schneller). Der neue Funkspruch heißt deshalb im Spiel "Funkspruch", der Shop-Posten bleibt "Funkgerät". Der Funkspruch hängt nicht vom Funkgerät ab: Koordination soll kein Kaufposten sein.
- **Lobby.** `sLobby()` in `js/ui.js` zeichnet genau vier Platzkacheln aus `NET.roster`. Die Team-Leiste (`teamStrip`) zeigt Status je Spieler über `roster[].at`.
- **Zufall.** `Math.random` kommt 26 mal vor, rund 15 davon in der Simulation (Aufbau der NPCs und Zivilisten, Wartezeiten der NPCs, Streuung der Schüsse von Spielern und Beamten, Abstände der Beamten-Schüsse, Fahrzeug-Versatz, Scharfschützen-Posten, Granatenziel), der Rest in Ton und Optik. Karte, Beute und Lage-Tags sind dagegen aus dem Seed abgeleitet (`mulberry32`).
- **Netz-Bibliothek.** PeerJS 1.5.4 (`assets/peerjs.min.js`). `wrap` in `peerTransport` kapselt die Verbindung, Nachrichten ab 16.300 Byte lehnt PeerJS ab (`message-too-big`).

## Messungen vom 26. Oktober 2026

Werkzeug: `node tools/messung-netz.js snap|gleich|draw` (Test-Leitung im Speicher, Chromium ohne GPU). Die Zahlen sind eine Grundlage für Entscheidungen, keine Spielgefühl-Messung.

**Schnappschuss (4 Spieler, Bank Seed 321, Spieler unverwundbar, Polizei ab 3 s, deshalb sammeln sich Gegner an):**

| Zeitpunkt | Welle | Gegner | Größe |
|---|---|---|---|
| 10 s | 1 | 7 | 1,6 KB |
| 40 s | 2 | 11 | 2,1 KB |
| 80 s | 3 | 35 | 3,7 KB |
| 130 s | 5 | 63 | 5,2 KB |
| 200 s | 8 | 111 | 8,4 KB |

Über 240 s gesendet an einen Client: Mittel 4,9 KB, Median 4,6 KB, 95. Perzentil 9,4 KB, Maximum 10,6 KB (mit Ereignissen). Das ist ein künstlicher Dauerkampf, im echten Spiel enden Partien früher. Der Gegnerblock `en` macht gut die Hälfte aus (rund 38 Byte je Gegner). **Die PeerJS-Grenze (16.300 Byte) ist damit in Sicht, aber nicht erreicht.** Dafür ist als eigene Aufgabe vorgemerkt, einen Dauertest anzulegen.

Kosten für den Host: `buildSnap` plus `JSON.stringify` 0,07 bis 0,10 ms, nur Kodieren 0,05 ms, ein Simulationsschritt des Hosts 0,5 ms, eines Clients 0,03 bis 0,12 ms. **Die CPU des Hosts ist kein Engpass**, auch nicht mit zehn Empfängern (zusätzlich rund 0,5 ms je Tick).

**Bandbreite je Empfänger bei 20 Schnappschüssen je Sekunde:** 2 KB sind 0,32 Mbit/s, 4 KB sind 0,64 Mbit/s, 8,5 KB sind 1,4 Mbit/s. Bei 10 je Sekunde (Zuschauer) halbiert sich das. Beispiel mitten im Gefecht (4 KB): drei Mitspieler 1,9 Mbit/s plus sechs Zuschauer bei 10 Hz 1,9 Mbit/s, zusammen rund 3,8 Mbit/s Upload des Hosts. Das passt zu üblichen Anschlüssen, ist aber für DSL-Upload knapp. Deshalb Obergrenze und Rückstau-Schutz (Z3).

**Bildkosten:** `draw()` kostet im Headless-Chromium ohne GPU 31 bis 50 ms je Bild (Bank 47 ms, Casino 46 ms, Transporter 31 ms), der Client-Tick nur 0,03 bis 0,12 ms. Auf einem Rechner mit GPU ist das deutlich weniger, wie viel, ist unbekannt. **Das Zeichnen, nicht die Simulation, entscheidet, ob zwei volle Ansichten nebeneinander gehen.** Folgerung für den Plan: eine volle Ansicht plus eine billige Kartenübersicht (Spur W), keine zwei vollen Welten. Till kann es mit `tools/messung-netz.js draw` auf dem Mac nachmessen.

**Gleicher Seed, acht Läufe (Bank Seed 321, 2 Spieler, alle stehen still):** Karte identisch, Beute-Stücke identisch (Lage-Tags und Nebenziel folgen aus dem Seed, `CT.sig` prüft das schon im Coop). **Die Ausgangslage der NPCs unterscheidet sich von Lauf zu Lauf** (Position, Wartezeit, Zivilisten-Wahl), weil sie mit `Math.random` gewürfelt wird. Mit festem Zufallsstrom ist sie identisch. Der Kampf-Zufall wirkt klein: Der erlittene Schaden nach 30 s streut bei gleichem Verhalten um 1 bis 2 Prozent (acht Läufe, Mittel 1632, Streuung 26). **Folgerung:** Für faire Duelle genügt es, die Ausgangslage der Welt aus dem Seed abzuleiten (Schritt W0). Den Kampf-Zufall pro Gegner und Spieler zu schlüsseln wäre ein großer Umbau für wenig Gewinn und steht nicht im Plan. Die Streuung durch das Verhalten der Menschen ist um ein Vielfaches größer.

## Spur F: Funk und Chat

### Entwurf Funkspruch (F1)

Idee: Im Coop drückt man **X**, es erscheint ein kleines Menü mit vier Sprüchen, **Ziffer 1 bis 4** sendet einen. Zwei Tasten, linke Hand, keine Maus. Nach Counter-Strike-Art, weil die Maus zum Zielen gebraucht wird und die Ziffern im Spiel ohnehin die Wurfgeräte sind. Solange das Menü offen ist, gehören die Ziffern dem Menü. Das Menü schließt nach `CFG.funk.menuT` (3,5 s), mit X oder Esc (Esc pausiert dann nicht). Solo gibt es kein Menü und X tut nichts.

Sprüche (Texte in einer Konstante `FUNK`, Zeiten in `CFG.funk`). Platz 1 und 4 sind in beiden Phasen gleich, damit die Finger sie lernen:

| Taste | Phase 1 (Erkunden) | Phase 2 (Überfall) |
|---|---|---|
| 1 | Ich brauche Hilfe! | Ich brauche Hilfe! |
| 2 | Lasst uns leise vorgehen! | Rückzug zum Fluchtwagen! |
| 3 | Sammeln bei mir! (Markierung an der eigenen Position) | Deckung geben! |
| 4 | Achtung, hier! (Markierung am Fadenkreuz) | Achtung, hier! (Markierung am Fadenkreuz) |

Die zwei Beispiele von Till stehen drin. Die Auswahl ist ein Vorschlag, die Liste ist Daten und in einer Zeile änderbar. Für Phase 2 fehlt bewusst "Polizei kommt von Osten": Die Markierung am Fadenkreuz sagt das genauer als jedes Wort.

Wirkung auf alle (Spieler und Zuschauer):
- **Meldung** im Feld oben rechts, in der Farbe des Senders, mit dem Spielernamen (`pn(id)`) und einem Funk-Zeichen: `Anna: Ich brauche Hilfe!`. Der Flugschreiber protokolliert es wie jedes `say`.
- **Zeichen über dem Sender** (kleine Funkwellen, 3 s), damit man sieht, wer gesprochen hat. Außerhalb des Bildes zeigt ein Pfeil am Bildrand zur Figur.
- **Ton** über `SND` (synthetisch, kein neues Asset): ein Funk-Knacken, dazu je nach Spruch ein Muster (ruhig bei "leise", dreifach dringend bei "Hilfe", kurz bei der Markierung). Der Sender hört ein leiseres Echo als Bestätigung. M schaltet wie immer stumm.
- **Vorlesen (optional):** Mit der Browser-Sprachausgabe (`speechSynthesis`, Deutsch) kann der Text zusätzlich gesprochen werden. Das ist ein Schalter in den Optionen (Funk: aus, Ton, Ton und Stimme), gespeichert in `localStorage` wie Lautstärke und Name. Standard Ton ohne Stimme, weil die verfügbaren Stimmen je Betriebssystem stark schwanken (eine deutsche Stimme kann je nach System fehlen). Wer es mag, schaltet es ein. "Hörbar" ist damit auf jedem Gerät durch den Ton gedeckt, die Stimme ist Bonus.

Markierung (F2): "Achtung, hier!" setzt einen Ring (`CFG.funk.pingT` 6 s) an die Stelle des Fadenkreuzes, in Senderfarbe mit dem Namen, sichtbar für alle, höchstens eine Markierung je Sender (die neue ersetzt die alte). Außerhalb des Bildes ein Pfeil am Rand. Der Host begrenzt den Punkt auf die Weltgrenzen. Markierungen gehören zu den stärksten Koordinationswerkzeugen in Top-down-Spielen und kosten fast nichts, deshalb ein eigener Schritt direkt hinter F1.

Netz: Client zu Host `{t:'rad',c:Nummer,x,y}` (`x`, `y` nur bei Markierungen), der Host prüft Spieler (lebt oder liegt am Boden, nicht `gone` oder `out`), Nummer 1 bis 4, Zeitsperre je Sender (`CFG.funk.cool` 1,2 s, derselbe Spruch frühestens nach `CFG.funk.same` 5 s wieder) und sendet `evt('rad',[id,c,x,y])` an alle. **Ein Spieler am Boden darf funken:** "Hilfe" ist genau für ihn da. Der Absender wird vom Host gesetzt, ein Client kann keine fremde Id vorgeben. Kein neues Feld im Schnappschuss (Ereignisse hängen ohnehin daran), `VER` steigt wegen der neuen Nachricht.

Tests (zuerst): Host-Prüfung (Nummer außerhalb, Zeitsperre, gleiche Sprüche, fremde Id vorgeben, Tote und Entkommene, Solo), Coop über die Test-Leitung (Meldung mit Name und Farbe bei Host und Client, Zeichen, Ton-Ereignis), Menü-Verhalten (Ziffern gehören dem Menü, Gadgets feuern währenddessen nicht, Timeout, Esc pausiert nicht), Markierung (Punkt geklemmt, ersetzt die alte, läuft ab), Pixeltest des Menüs, Überlappung mit HUD und Meldungsfeld (Test 80), Mutanten (Zeitsperre, Absenderprüfung, Phasen-Satz).

### Entwurf Textchat (F3)

Der Chat ist für Lobby, Shop, Auftragswahl, Ergebnis und Pause (dort ist Zeit zum Tippen) und für kurze Zeilen im Spiel. Im Gefecht tippt niemand, dafür ist der Funkspruch da.

- **Bedienung.** Im Spiel öffnet **Enter** eine Eingabezeile (die Figur bleibt stehen: `clearKeys()` beim Öffnen, während der Eingabe werden keine Tasten gesetzt, wie beim Namensfeld), Enter sendet, Esc bricht ab (pausiert nicht). In den Menüs hat der Bildschirm ein Chatfeld mit den letzten Zeilen, die Taste zum Öffnen wird je Bildschirm gewählt, weil Enter dort Kacheln auslöst (Prüfung mit Test 80). Eingabe wie beim Namen: zulässig sind Buchstaben, Ziffern, Leerzeichen und einfache Satzzeichen (`[\p{L}\p{N} .,:;!?'"()+\-/%&@#_]`), höchstens 60 Zeichen. Steuerzeichen und unsichtbare Richtungszeichen fallen durch die Positivliste.
- **Ablauf.** Client zu Host `{t:'ch',s:Text,c:Kanal}`, der Host bereinigt (`cleanChat`), begrenzt (1 Zeile je Sekunde, 6 je 20 s, sonst wird verworfen), setzt den Absender und sendet `{t:'ch',id,s,c}` per `bcast` an alle (nicht über `evt`, denn Schnappschüsse fließen nur im Spiel, der Chat soll auch in den Menüs gehen). Kanal 0 ist das Team, Kanal 1 die Tribüne (Zuschauer, siehe Z4). Das Feld ist von Anfang an da, damit die Zuschauer später kein neues Format brauchen.
- **Anzeige.** Zeilen in Senderfarbe mit Namen, im Spiel kurzlebig (8 s, höchstens 4 Zeilen) in einem Bereich, der das Meldungsfeld und das Banner nicht verdrängt (genaue Lage beim Bau mit dem Überlappungstest), in den Menüs 5 Zeilen Verlauf. Verlauf höchstens 50 Zeilen im Speicher, nichts wird gespeichert.
- **Datenschutz und Missbrauch.** Es gibt keinen Server, der moderieren könnte. Darum: Räume sind nur per Code oder Link erreichbar, der Host kann jeden entfernen (gibt es schon, P6), jeder Spieler kann den Chat in den Optionen ausblenden, und Texte stehen **nicht** im Flugschreiber (nur "Chat, Absender, Länge"), denn Till gibt diese Dateien weiter. Ein Stummschalten einzelner Mitspieler ist ein möglicher Ausbau (F4), nicht Teil des ersten Wurfs.
- **Netz.** Neue Nachricht `ch`, `VER` steigt.

Tests (zuerst): Bereinigung (Steuerzeichen, Richtungsumkehr U+202E, zu lang, nur Leerraum, Umlaute bleiben), Zeitsperre, fremde Id wird ignoriert, Chat in Lobby, Shop, Ergebnis und Spiel (Host und Clients sehen dieselbe Zeile mit Namen), Eingabemodus (Tippen von w, a, s, d bewegt die Figur nicht, Esc pausiert nicht, Solo ohne Wirkung), Überlappung auf allen Bildschirmen (Test 80 erweitern), Flugschreiber ohne Text, Mutanten.

### Schritte Spur F

| Schritt | Inhalt | Größe |
|---|---|---|
| F1 | Funkspruch: Menü, vier Sprüche je Phase, Meldung, Zeichen, Ton, `rad`, Optionen-Schalter für die Stimme | mittel |
| F2 | Markierung "Achtung, hier!": Ring, Randpfeil, Zeitablauf | klein |
| F3 | Textchat: Eingabe, `ch`, Anzeige im Spiel und in allen Menüs, Optionen-Schalter, Kanalfeld | mittel |
| F4 | (optional) Einzelne Mitspieler stummschalten, Schnellantworten | klein |

## Spur Z: Zuschauer

### Entwurf

- **Rolle.** Ein Zuschauer ist ein Client ohne Spielerplatz. Er sendet nur `hi`, `nm`, `ping` und Chat im Kanal Tribüne, der Host **verwirft alles andere** (Positivliste je Verbindungsart, sonst könnte ein gefälschtes `f` oder `in` eines Zuschauers den Host stören). Zuschauer zählen nicht für Bereit-Haken, Spielerzahl (`nPl`), Wellengröße, Verdacht oder Team-Leiste.
- **Beitritt.** Im Coop-Hub kommt eine Kachel "Zuschauen" neben "Raum beitreten" (gleiche Code-Eingabe). Der Host kopiert in der Lobby wahlweise den Spieler-Link (`#raum=CODE`, wie heute) oder den Zuschauer-Link (`#raum=CODE&zu=1`). Zuschauer dürfen **jederzeit** kommen (Lobby, Shop, Auftragswahl, im laufenden Auftrag, Ergebnis), Spieler weiter nur in der Lobby.
- **Obergrenze und Schalter.** In der Lobby gibt es einen Schalter "Zuschauer: an/aus" (Standard an, siehe Entscheidungen), `CFG.spec.max` ist 6. Bei Überschreitung `rej` mit "Der Raum ist voll für Zuschauer." beziehungsweise "Zuschauer sind nicht erlaubt.". Der Host kann Zuschauer wie Mitspieler entfernen (die Liste `Mitspieler` bekommt einen Abschnitt Zuschauer).
- **Protokoll.** `hi` bekommt `sp:1`. Der Host antwortet `wel` mit `id:-1` und einer Zuschauer-Nummer. Die Spielerliste `ros` trägt zusätzlich die Zuschauernamen (`sp`, höchstens 6, nur Namen), damit Lobby und Team-Leiste "Zuschauer: 2" zeigen. Für den Einstieg in ein laufendes Spiel schickt der Host `sgo` mit dem Inhalt von `go` für die aktuelle Runde (Seed, Szenario, Kits, Fahndung, Serienstand), der Client baut die Welt mit `reset()` und wendet dann die Schnappschüsse an.
- **Spät-Einstieg ist die Hauptsorge.** Das Netzformat ist ganzer Zustand, nicht Delta, aber ob **alles**, was die Anzeige braucht, im Schnappschuss steht, ist bisher nur für Clients geprüft, die von Anfang an dabei waren. Der Flugschreiber hat dafür schon das Werkzeug: den Zustandsabgleich `chk` (Phase, Welle, Abschüsse, Beute, Zivilisten, Gegner, NPCs, Autos, Barrikaden, Fallen, Koffer, Tresor, Code, Verdacht, Geiseln). Der Test lässt einen Zuschauer mitten im Kampf einsteigen und vergleicht seinen Zustand nach 5 s mit dem eines Clients, der von Anfang an dabei war. Jede Abweichung ist ein Feld, das im Schnappschuss fehlt, und kommt dort hinein. Rein optische Spuren (Einschusslöcher, Brandflecken) bekommt ein Spät-Einsteiger nicht und braucht sie auch nicht. **Wegwerf-Versuch vom 26. Oktober 2026 (Kopie von `index.html`, `hostConn` nimmt in `play` eine Verbindung ohne Platz an und schickt `go`, nichts davon im Spiel):** Drei Spieler im Gefecht, nach 12 s vier Beute-Stücke genommen, nach weiteren 20 s steigt ein vierter Client ein. Nach 12 s Spielzeit stimmt sein Zustand in allen sechs Szenarien (Bank, Juwelier, Tankstelle, Museum, Casino, Transporter) mit dem eines Dauer-Clients überein: Phase, Welle, Abschüsse, gesicherte Beute, Tresor, Code, Kameras, Beute-Stücke (genommen und verbrannt), das ganze Raster samt Türen, Fenstern und Barrikaden, NPC-Zustände, Zahl der Gegner und Autos, Transporter-Zustand. Der Spät-Einstieg braucht mit dem heutigen Schnappschuss also nichts nachzurüsten. **Nicht abgedeckt:** gebaute Barrikaden mit Fortschritt, Geiseln, Fallen und Koffer in der Luft, Gaswolken. Der echte Test in Z1 deckt sie ab.
- **Platzhalter-Figur.** Der Client bekommt statt `players[myId]` eine lokale Figur (`mkGhost()`, tot, weg, mit Grundausrüstung, nicht in `players`). Damit bleiben die rund 70 Stellen mit `me` gültig, und die bestehende Logik "Gefallener schaut zu" (`setView`) trägt den Zuschauer: `p` ist die gewählte Figur. **Wegwerf-Versuch vom 26. Oktober 2026 (eine Zeile in `reset()` einer Kopie: tote, nicht in `players` geführte Figur mit `id` -2):** Ein Client zeichnet und tickt damit in allen sechs Szenarien, in Phase 1 und 2, je rund 46 s Spielzeit, ohne einen JS-Fehler. `p` folgt von selbst einem aktiven Spieler und wechselt, wenn der ausfällt, das HUD zeigt dessen Leben und Munition, die Zeile `Du schaust Orange zu` gibt es schon, Eingaben gehen nicht an den Host (die Figur ist tot, `clientStep` nimmt den Weg `me.inp=IDLE`). Offen bleiben Kleinigkeiten der Anzeige (Texte für Gefallene wie "Du bist am Boden" dürfen für Zuschauer nicht erscheinen). Eingabe, Senden von `in`, Vorhersage, Mauszeiger-Sperre und Zielhilfen entfallen für Zuschauer (`specStep` statt `clientStep`).
- **Kamera und Bedienung.** Pfeil links und rechts (oder Tab) wechseln die gefolgte Figur (nur Spieler, die nicht `gone` sind), **V** schaltet die freie Kamera (WASD verschieben, ohne HUD einer Figur), **B** schaltet "Alles sehen" (Sichtfeld und Dunkelheit der Figur aus, `visPoly` entfällt). Das HUD zeigt für eine gefolgte Figur deren Leben, Munition und Taschenfüllung (das tut es für Gefallene schon). Ein Banner nennt "ZUSCHAUER" und den gefolgten Namen, eine Namensleiste unten erlaubt den Wechsel mit der Maus. Esc öffnet die Pause mit "Zuschauen beenden".
- **Rate und Last.** Zuschauer bekommen jeden zweiten Schnappschuss (`CFG.spec.every` 2, also 10 Hz). Die Figuren werden clientseitig ohnehin weich nachgezogen. **Wichtig:** Die Ereignisse eines übersprungenen Schnappschusses dürfen nicht verloren gehen, der Host sammelt sie je Zuschauer (`c.evBuf`) und hängt sie an den nächsten. Zusätzlich ein Rückstau-Schutz: Wächst der Sendepuffer einer Zuschauer-Verbindung über `CFG.spec.maxBuf` (64 KB), lässt der Host für sie Schnappschüsse aus, bis er wieder leer ist (PeerJS puffert selbst und ohne Grenze: Eine langsame Leitung lässt die Warteschlange `bufferSize` und damit die Verzögerung immer weiter wachsen. `wrap` gibt dafür `buffered()` aus `bufferSize` und `dataChannel.bufferedAmount` heraus, beim Bau gegen die mitgelieferte Version zu prüfen; die Test-Leitung bekommt einen Platzhalter dafür). So bremst ein Zuschauer mit schlechter Leitung weder den Host noch die Spieler.
- **Verzögerung.** Der Client kann Schnappschüsse um `CFG.spec.delay` Sekunden zurückhalten (Warteschlange mit Empfangszeit). Im normalen Coop 0, im Wettkampf 20 s (gegen "Mitschauen und zuflüstern"). Kostet im Speicher rund 2 MB.
- **Runden und Menüs.** Beim Ergebnis sehen Zuschauer dasselbe Ergebnis (`end` geht an alle), während das Team im Shop ist, steht die Team-Leiste mit dem Status des Hosts (`at`) auf einem ruhigen Hintergrund. `rst` und `go` führen sie in die nächste Runde. Verlassen jederzeit mit Esc.
- **Sicherheit.** Der Zuschauer sieht alles, das ist im Coop harmlos. Im Wettkampf ist es nicht harmlos, deshalb die Verzögerung und der Hinweis, dass Zuschauer nicht mit Spielern sprechen sollten (nicht durchsetzbar, siehe Risiken).

Tests (zuerst): Beitritt in Lobby, Shop und laufendem Spiel; Obergrenze und Schalter; Zuschauer belegen keinen Platz (`nPl`, Wellengröße, Bereit-Haken, Team-Leiste unverändert); **alle fremden Nachrichten eines Zuschauers werden verworfen** (Fuzz mit allen bekannten Typen, auch `f`, `in`, `u`, `kit`, `law`, `rdy`, dazu Müll); Spät-Einstieg im Gefecht gleicht per `chk` dem Dauer-Client; Zeichnen aller Bildschirme und aller Szenarien als Zuschauer ohne JS-Fehler (`page.errors` leer, Sicht aus, Sicht an, freie Kamera); Ereignisse gehen bei 10 Hz nicht verloren; Rückstau (Puffer gestellt) lässt Schnappschüsse aus und holt sie nach; Verzögerung (nichts vor der Zeit, nichts verloren); Kick; Host verlässt den Raum; ältere `VER` wird abgelehnt; Kamera-Tasten; Mutanten (Positivliste, Ereignispuffer, Rückstau, Platzvergabe).

### Schritte Spur Z

| Schritt | Inhalt | Größe |
|---|---|---|
| Z1 | Verbindungsmodell: Platzvergabe nach `hi`, Zuschauer-Verbindung (`NET.specs`), Positivliste, `wel` mit `id:-1`, `ros.sp`, `sgo`, Platzhalter-Figur, Zeichnen ohne Fehler; Zuschauer sieht das Spiel (erste gefolgte Figur). Kann in zwei Commits geschnitten werden: erst Beitritt in der Lobby, dann Einstieg ins laufende Spiel. | mittel bis groß |
| Z2 | Bedienung: Wechsel der Figur, freie Kamera, Alles sehen, Namensleiste, Banner, Pause "Zuschauen beenden" | mittel |
| Z3 | Last: Halbrate mit Ereignispuffer, Rückstau-Schutz, Verzögerung, Obergrenze, Sicherheitsnetz für Schnappschüsse nahe der PeerJS-Grenze | mittel |
| Z4 | Menüs und Chat-Kanal: Kachel "Zuschauen", Zuschauer-Link, Schalter in der Lobby, Liste und Kick, Zuschauer-Zeile in Lobby und Team-Leiste, Kanal Tribüne im Chat | mittel |

## Spur W: Wettkampf

### Begriffe und Abgrenzung

Ein **Duell** besteht aus zwei **Teams** (je 2 bis 4 Spieler, beide gleich groß), die dieselben Aufträge auf derselben Karte spielen, **jedes in seiner eigenen Welt**. Die Teams sehen einander nicht und beeinflussen einander nicht, verglichen wird das Ergebnis, dazu zeigt das Spiel den Fortschritt des Gegners. Ein Spiel, in dem sich die Teams in einer Welt bekämpfen oder um dieselbe Beute rennen (PvP), ist etwas anderes, viel Größeres und nicht Teil dieses Plans (Annahme A6).

### Architektur: zwei Hosts statt einem

Es gibt zwei naheliegende Wege, 8 Spieler zu bedienen:

**A. Ein Host rechnet beide Welten.** Ein Raumcode, acht Clients, alles an einem Ort. Dagegen sprechen: Der Host hat Nullverzug, sein Team hat einen Vorteil gegenüber allen anderen sieben. Acht Verbindungen am Upload eines Privatanschlusses (je 0,3 bis 1,4 Mbit/s, zusammen bis über 5 Mbit/s plus Zuschauer). Zwei Spielinstanzen in einer Seite (Karten-Ebenen, besonders im Casino, sind speicherintensiv). Fällt der Host aus, ist das Duell tot. Dafür ist die Kopplung trivial. Die CPU wäre dabei nicht das Problem (Simulationsschritt 0,5 ms).

**B. Zwei Hosts, jedes Team ein normaler Coop-Raum, dazu eine dünne Leitung zwischen den Hosts.** Jedes Team spielt in einem unveränderten Raum (das ist das bestehende, getestete Coop), beide Teams haben denselben Nullverzug-Vorteil für ihren Host, die Last verteilt sich, ein Ausfall betrifft nur ein Team. **Empfehlung: B.** Neu ist nur die Leitung zwischen den Hosts und das, was darüber läuft.

### Entwurf (Weg B)

- **Zusammenfinden.** Beide Hosts eröffnen einen ganz normalen Raum. Host A schaltet in der Lobby "Wettkampf" an, Host B wählt in seiner Lobby "Wettkampf beitreten" und gibt den Raumcode von A ein. B verbindet sich als **Gegner-Host** mit A (dritte Art von Verbindung neben Spieler und Zuschauer, gleiche Platzvergabe nach `hi`, dort mit `rv:1`). Der Code von A ist der Duell-Code. Die Spieler von B nutzen weiter den Code von B. Spieler und Zuschauer beider Räume sehen in ihrer Lobby "Gegner: Team von Name (3 Spieler)" und dessen Bereit-Stand. A ist der Leiter des Duells (Länge, Regeln, Start).
- **Gegner-Leitung.** Eine Nachrichtenart `dl` mit Unterart `k`, alles Kleinigkeiten (Dutzende Byte, meist einmal je Sekunde): `hi` (Handschlag: `VER`, Build, Teamgröße, Raumcode von B), `cfg` (A an B: Aufträge, Länge, Verzögerung, Ghost-Anzeige), `rdy` (Team bereit, Teamgröße), `go` (A an B und lokal: Start in 5 s), `prog` (einmal je Sekunde: Runde, Phase, Beute gesichert, Dauer, Welle, wie viele Spieler aktiv, lautlos ja/nein), `res` (Rundenergebnis: Sieg, Score, Spielerzahl, Dauer, Nebenziel, lautlos, Ausgeschaltete, Zivilisten), `nx` (Team bereit für den nächsten Auftrag), `bye`. Eine einzige Nachrichtenart macht die Positivliste und den Test einfach.
- **Gleiche Bedingungen (Fairness).**
  1. *Gleiche Aufträge.* A bestimmt die Aufträge und schickt sie in `cfg` als Liste `[{sd,sc},...]` (Seed und Szenario je Runde, Rang-Pool wie heute: Museum frühestens ab dem dritten, Casino ab dem fünften Auftrag). Beide Hosts rufen ihr `startCoop` mit diesen Werten. Karte, Beute, Lage-Tags, Nebenziel, Kameras, Wachrouten sind damit identisch, das beweist der Test `CT.sig` (siehe Messung). Mit den Schritten S1 bis S3 des Serien-Codes ersetzt später ein Code die Liste.
  2. *Gleiche Ausgangslage der Welt.* **Schritt W0:** Position, Wartezeit und Zivilisten-Wahl der NPCs aus dem Seed ableiten (`mulberry32` über Seed und Index), statt `Math.random`. Gemessen: Heute ist das der einzige Unterschied bei gleichem Seed, den ein Spieler im Schleichen spürt. Die Verteilung bleibt gleich (Bot-Siegquoten dürfen sich nicht ändern), nur festgelegt je Seed. Das nützt auch dem Serien-Code ("Nochmal"). `VER` steigt, weil derselbe Seed anders startet.
  3. *Gleicher Build, gleiche Regeln.* Der Handschlag verlangt dieselbe `VER` und denselben Build. Ungleiche Teamgrößen verhindern den Start (ein Team mit mehr Spielern bekommt mehr Polizei, `CFG.perPlayer`, der Vergleich wäre schief). Optional später: "Freundschaftsspiel" mit ungleichen Teams, ungewertet.
  4. *Gleicher Start.* Beide Teams beginnen bei null (A4). Wer im Shop klüger einkauft, gewinnt zu Recht.
  5. *Was ungleich bleibt, ist gewollt:* der Kampf-Zufall (Streuung, Beamte, Granatenziel), gemessen 1 bis 2 Prozent im Schaden bei gleichem Verhalten, und alles, was die Spieler tun. Die Wertung über mehrere Aufträge glättet den Rest.
- **Start im Gleichtakt.** Das Starten ändert sich: Statt "Starten" heißt die Kachel im Wettkampf "Bereit". Sind beide Teams bereit und gleich groß, schickt A `go`, beide Hosts zählen 5 s und starten. Der Versatz der Leitung (Zehntel Sekunden) spielt wegen des Ladens keine Rolle. Vor dem nächsten Auftrag gilt dasselbe (`nx`): Wer noch im Shop ist, hält den Start auf, der Wartende sieht "Gegner kauft ein". Ist ein Team ausgeschieden, spielt das andere allein weiter.
- **Wertung.** Wie im Serien-Code-Plan (A5): erst die Zahl der gewonnenen Aufträge, bei Gleichstand die Beute gesamt (Summe der Team-Ergebnisse `res.score` der gewonnenen Aufträge), danach die kürzere Gesamtdauer. Eine Niederlage beendet die Serie des Teams wie heute. Die Auszeichnungen (Coop) bleiben pro Team. Länge des Duells: Vorschlag 3 Aufträge (ein Abend, siehe Entscheidungen).
- **Anzeige im Spiel.** Neben dem Fahndungsfeld eine kleine Tafel "Gegner": Beute gesichert, Welle, aktive Spieler, Dauer, jeweils neben dem eigenen Wert, farbig nach Führung (Standard an, Option "Blindes Duell" später). Die Tafel ist einmal je Sekunde aktuell (`prog`). Am Ende jedes Auftrags erscheint auf dem Ergebnis eine weitere Seite "Duell" (Blättern wie bei den Auszeichnungen, `ended.pg`): beide Ergebnisse nebeneinander, Zwischenstand der Wertung. Nach dem letzten Auftrag eine Abschlussseite mit Sieger und der Kachel "Revanche".
- **Zuschauer im Duell.** Ein Zuschauer verbindet sich mit einem der Räume (Spur Z) und bekommt vom Host in `wel` den Code des anderen Raums (`duel`), dazu öffnet er eine zweite Verbindung (zweite PeerJS-Identität). **Zwei Welten, eine Karte:** Weil beide Teams dieselbe Karte spielen, braucht er nur eine Weltdarstellung. Die *volle* Ansicht zeigt ein Team (umschaltbar, das Umschalten ist ein Spät-Einstieg in den anderen Raum, rund eine Sekunde), und eine *Übersichtskarte* zeigt beide Teams als Punkte auf demselben Plan (Team A gefüllt, Team B als Ring, Spielerfarben wie sonst, Beamte des gefolgten Teams). Die Übersichtskarte entsteht direkt aus den Spielerzeilen `pl` und `en` des Schnappschusses beider Ströme ohne eigene Welt, kostet fast nichts und braucht keine zweite `start()`-Instanz. Verzögerung 20 s für beide Ströme. Ausgeschiedene Spieler eines Teams können dem anderen Team auf diesem Weg zuschauen.
- **Integrität.** Das Ergebnis des Gegners kommt vom Gegner-Host und ist nicht beweisbar (kein Server, siehe Serien-Code-Plan). Unter Freunden ist das gewollt. Ein späterer Ausbau wäre, Zuschauer die Ergebnisse beider Räume selbst nachrechnen und anzeigen zu lassen (Schiedsrichter-Ansicht).

Tests (zuerst, alles mit der Test-Leitung in einer Seite machbar, denn `LoopNet` verwaltet beliebig viele Räume und ein Host kann sich mit dem anderen verbinden; `CT.mkDuel(sc,seed,nA,nB)` ist der neue Helfer): Handschlag (falsche `VER`, falscher Build, ungleiche Teamgröße, Zuschauer und Spieler können sich nicht als Gegner-Host ausgeben, `dl` nur von der Gegner-Verbindung), Gleichtakt (beide starten nach dem Countdown in derselben Spielzeit, nur ein Team bereit startet nichts, Gegner trennt sich im Countdown), gleiche Welt (`CT.sig` beider Räume gleich, NPC-Ausgangslage gleich, nach W0), Fortschritt (`prog` kommt, die Tafel zeigt Werte, ein Ausfall des Gegners wird gemeldet), Ergebnisvergleich (eigene Ergebnisse gesetzt, Wertung für alle Fälle: beide gewinnen, nur einer, beide verlieren, Gleichstand, Ausscheiden mitten im Duell), Revanche, Zuschauer mit zwei Strömen (Übersichtskarte zeigt beide Teams, Umschalten ohne Fehler, Verzögerung), Flugschreiber-Ereignisse (`duell`), Mutanten (Wertung, Positivliste, Teamgröße, Countdown).

### Schritte Spur W

| Schritt | Inhalt | Größe | Voraussetzung |
|---|---|---|---|
| W0 | Ausgangslage der NPCs und Zivilisten aus dem Seed (`mulberry32`), Test "gleicher Seed, gleiche NPCs", Bot-Quote unverändert, `VER` | klein | keine |
| W1 | Gegner-Leitung: dritte Verbindungsart, Handschlag, `cfg`, Bereit, Gleichtakt, Duell-Lobby, Teamgrößenprüfung, `CT.mkDuel` | groß | Z1 (Platzvergabe nach `hi`) |
| W2 | Live-Vergleich: Tafel "Gegner", `prog`, `res`, Ergebnisseite "Duell", Wertung, Abschluss, Revanche, Ausscheiden und Weiterspielen | groß | W1 |
| W3 | Zuschauer im Duell: Zweitverbindung, Übersichtskarte mit beiden Teams, Umschalten der vollen Ansicht, Verzögerung | mittel bis groß | Z1 bis Z3, W2 |
| W4 | (Idee) zweite volle Ansicht nebeneinander. Nur falls die Messung auf Tills Rechner zeigt, dass zwei volle Bilder ruckelfrei gehen. | groß | W3 |

## Reihenfolge und Abhängigkeiten

1. **F1, F2** (Funk, Markierung): unabhängig, sofort nützlich, der kleinste Hebel für das Zusammenspiel.
2. **F3** (Chat): unabhängig, trägt schon das Kanalfeld für die Tribüne.
3. **W0** (feste NPC-Ausgangslage): klein und unabhängig, wirkt sofort auch im Solo und im Serien-Code.
4. **Z1 bis Z4** (Zuschauer): das Fundament für den Wettkampf, trägt gleich die Platzvergabe nach `hi` für die Gegner-Leitung.
5. **W1, W2, W3** (Wettkampf).
6. Unabhängig dazwischen möglich: Serien-Code S1 bis S3 (macht aus der Auftragsliste einen teilbaren Code).

Schätzung in Bauschritten: F gesamt 3 bis 4, Z gesamt 4, W gesamt 4 bis 5. Netzformat: F1, F3, Z1, W0 und W1 erhöhen je `VER`. Wegen "kein Test-Stopp" kann alles nacheinander gebaut werden, jeder Schritt mit schnellem Testlauf, Mutanten und kurzem Spieltest-Hinweis in docs/offen-und-spieltest.md.

## Risiken

- **R1 Netz-Realität.** Je mehr Verbindungen, desto eher scheitert jemand an Router oder strengem NAT. Die offizielle PeerJS-Dokumentation nennt als Standard nur einen Google-STUN-Server ([peerjs.com, Peer API](https://peerjs.com/client/api/peer)). Die mitgelieferte Datei `assets/peerjs.min.js` (1.5.4) enthält zusätzlich zwei TURN-Adressen (`eu-0.turn.peerjs.com`, `us-0.turn.peerjs.com`, Benutzer `peerjs`), Berichte aus Projekten auf GitHub sagen, dass diese Namen nicht mehr auflösen, **geprüft habe ich es nicht** (die Cloud-Umgebung hat kein DNS). Sicher ist nur: Auf ein öffentliches Relay ohne Zusage sollte man nicht bauen. Zuschauer und Duell vervielfachen die Zahl der Verbindungen, deshalb ist die Frage "eigenen TURN-Dienst einplanen?" vor W1 zu entscheiden (ein gemieteter Relay ist kein "eigener Server" im Sinn des Prinzips, kostet aber Geld und Pflege). Bis dahin liefert der Flugschreiber die ersten echten Zahlen.
- **R2 Schnappschuss nahe der Grenze.** Im künstlichen Dauerkampf 10,6 KB von 16,3 KB. Zuschauer erhöhen die Größe nicht, aber ein zusätzlicher Posten (Zuschauerliste, Duell-Daten) frisst Reserve. Als eigene Aufgabe vorgemerkt (Dauertest und Gegenmaßnahme). In Z3 gehört ein Sicherheitsnetz dazu.
- **R3 Spät-Einstieg unvollständig.** Im Wegwerf-Versuch (siehe Z) stimmte der Zustand in allen sechs Szenarien, das Risiko ist damit klein, aber nicht null (nicht geprüft: Barrikaden im Bau, Geiseln, Fallen, Koffer, Gaswolken). Der Test per `chk` und Raster-Vergleich in Z1 bleibt Pflicht.
- **R4 Platzhalter-Figur.** Rund 70 Stellen mit `me`. Im Wegwerf-Versuch ohne Fehler in allen Szenarien und Phasen (siehe Z). Mitigation bleibt: Test, der jeden Bildschirm und jedes Szenario als Zuschauer zeichnet, auch bei Ende, Pause und freier Kamera.
- **R5 Bildkosten.** Zwei volle Ansichten sind ungewiss (31 bis 50 ms im Headless-Chromium ohne GPU). Mitigation: Übersichtskarte statt zweiter Welt, W4 nur nach Messung.
- **R6 Erwartung "gleich".** Gleiche Bedingungen, nicht gleiche Ergebnisse. Das muss in der Anzeige stehen ("gleiche Karte, gleiche Lage, gleiches Ziel"), sonst gibt es Streit über Pech.
- **R7 Chat-Missbrauch.** Kein Server, keine Moderation. Mitigation: Räume per Code, Kick, Ausblenden, Positivliste, Zeitsperre, kein Text im Flugschreiber.
- **R8 Tasten.** X und Enter sind frei, aber Enter löst in Menüs Kacheln aus und im Ergebnis das Weiterschalten. Chat in Menüs braucht deshalb eine eigene Öffnungstaste je Bildschirm. Auf deutschen Tastaturen liefert `e.key` das richtige Zeichen (QWERTZ), Totasten (Akzente) sind bei der Eingabe zu testen.
- **R9 Host-Ausfall.** Es gibt keinen Hostwechsel (docs/coop-und-netz.md). Im Duell verliert ein Host-Ausfall nur das eigene Team, der Gegner wird informiert (`bye`) und spielt weiter.
- **R10 Hintergrund-Tabs.** Ein Host im Hintergrund wird von einem Worker getaktet (`hostTicker`). Für Zuschauer im Hintergrund gilt nichts Besonderes, sie zeichnen nur, wenn sichtbar.
- **R11 Doku und Größe.** `CLAUDE.md` ist mit 19,6 KB am Richtwert. Gebautes gehört in docs/coop-und-netz.md und docs/spielsystem.md, nicht in `CLAUDE.md`.

## Was ich nicht empfehle (und warum)

- **Sprachchat im Spiel.** Mikrofonfreigabe, Echo, Mischung über den Host und Bandbreite machen aus einem Spiel-Feature ein Telefonie-Projekt, und ein externer Kanal (Telefon, Discord) ist besser, als wir ihn bauen könnten. Der Funkspruch deckt ab, was sich im Spiel sichtbar machen lässt.
- **Beide Welten auf einem Host mit acht Clients** (Weg A). Technisch möglich, aber unfair (Nullverzug für das Team des Hosts), leitungshungrig und ein einzelner Ausfallpunkt.
- **Freitext als erster Schritt.** Im Gefecht wird nicht getippt. Der Funkspruch bringt den größeren Teil des Nutzens früher und mit weniger Missbrauchsfläche.
- **Zuschauer ohne Obergrenze oder ohne Verzögerung im Wettkampf.** Ohne Obergrenze zahlt der Host-Upload, ohne Verzögerung kann ein Zuschauer per Telefon mitspielen.
- **Bitgleiche Wiederholung (Replay) als Ziel.** Würde jeden Zufall im Spiel (rund 15 Stellen) pro Entität schlüsseln und jede künftige Änderung daran binden. Der Messwert (1 bis 2 Prozent Streuung im Kampf) rechtfertigt das nicht.

## Entscheidungen (Till, 26. Oktober 2026: alle wie empfohlen angenommen)

1. **Taste für den Funkspruch:** X mit Ziffern 1 bis 4 (Empfehlung) oder ein Rad mit der Maus (kollidiert mit dem Zielen).
2. **Stimme beim Funkspruch:** Standard "Ton" ohne Stimme, Stimme als Schalter (Empfehlung) oder Stimme als Standard.
3. **Zuschauer:** Standard an, höchstens 6 je Raum, Zuschauer-Takt 10 Hz (Empfehlung), oder Standard aus mit Einschalten durch den Host.
4. **Netz:** Vor dem Wettkampf (W1) einen gemieteten TURN-Relay prüfen? Empfehlung: erst die Flugschreiber-Ergebnisse der nächsten Partien abwarten (Verbindungsfehler, Ping), dann entscheiden.
5. **Wertung und Länge des Duells:** wie der Serien-Code (Aufträge gewonnen, dann Beute, dann Dauer), Länge 3 Aufträge (Empfehlung), oder reine Summe der Beute.
6. **Anzeige des Gegners:** Tafel mit Fortschritt an (Empfehlung), "Blindes Duell" später als Option.
7. **Zuschauer im Duell:** eine volle Ansicht plus Übersichtskarte (Empfehlung) oder gleich der Versuch zweier voller Bilder.
8. **Verzögerung der Zuschauer im Wettkampf:** 20 s (Empfehlung) oder 0.
9. **Reihenfolge:** F1, F2, F3, W0, Z, W (Empfehlung). Sollen Zuschauer vor dem Chat kommen?
10. **Serien-Code zuerst?** Empfehlung: nicht nötig, der Wettkampf bekommt eine Auftragsliste, der Serien-Code kann sie später ersetzen.

## Stand der Schritte

| Schritt | Stand |
|---|---|
| F1 Funkspruch | gebaut am 26. Oktober 2026 (`VER` 44, Test `114-funkspruch`, Optionen-Kachel Funk, Stimme als Schalter), Einzelheiten in docs/coop-und-netz.md, Funkspruch |
| F2 Markierung | gebaut am 26. Oktober 2026 (kein neues Netzformat, Test `115-markierung`, Einzelheiten in docs/coop-und-netz.md, Funkspruch) |
| F3 Textchat | gebaut am 26. Oktober 2026 (`VER` 45, Test `116-chat`, Optionen-Kachel Chat, Einzelheiten in docs/coop-und-netz.md, Textchat) |
| W0 feste NPC-Ausgangslage | gebaut am 26. Oktober 2026 (`VER` 46, Test `117-npc-seed`, Einzelheiten in docs/karte-und-layout.md) |
| Z1 Zuschauer: Verbindung, Platzhalter-Figur, Spät-Einstieg | gebaut am 26. Oktober 2026 (`VER` 47, Test `118-zuschauer`, Einzelheiten in docs/coop-und-netz.md, Zuschauer), Beitritt vorerst nur über den Link `#raum=CODE&zu=1` |
| Z2 bis Z4 Zuschauer: Bedienung, Last, Menüs | offen |
| W1 bis W3 Wettkampf | offen |

## Änderungsprotokoll

- v1 (26. Oktober 2026): Plan aus Tills drei Wünschen, drei Messungen (Schnappschussgröße, Streuung gleicher Seeds, Bildkosten), Werkzeug `tools/messung-netz.js`. Noch nichts gebaut.
- v1.1 (26. Oktober 2026): Till nimmt alle zehn Empfehlungen an, Bau beginnt mit F1.
- v1.2 (26. Oktober 2026): F1 gebaut (Funkspruch). Abweichung vom Plan: Die Ziffern 5 bis 9 werden bei offenem Menü verschluckt (der Plan sagte nur, dass 1 bis 4 senden), damit kein Gadget aus Versehen feuert. Die Optionen-Kachel braucht in den Optionen eine dritte Verdichtung (Abstand 4, Kacheln 36 und 46 hoch), sonst läuft das Fenster mit den Testwerkzeugen aus dem Bild. Die Anleitung rückt eine Zeile enger (20 statt 22 Pixel je Zeile).
- v1.3 (26. Oktober 2026): F2 gebaut (Markierung). Der Randpfeil liegt auf der Linie von der Bildmitte zum Ziel, nicht in der Ecke (bei einem Ziel schräg oben rechts also am oberen Rand).
- v1.4 (26. Oktober 2026): F3 gebaut (Textchat). Abweichungen vom Plan: (1) Die Zeitsperre läuft auf einer eigenen Uhr, weil die Spielzeit des Hosts beim Ergebnis stillsteht (der Test fand es). (2) Statt eines festen Chatfeldes in jedem Menü gibt es kurzlebige Zeilen am Rand, die in den dichten Menüs kurz über Kacheln liegen: Ein freier Platz ohne Überdeckung existiert in Shop, Auftragswahl und Ergebnis nicht. (3) Die Option Chat steht als halbe Kachel neben Funk, die Anleitung und der Spielbildschirm brauchten dafür engere Zeilen (19 Pixel).
- v1.5 (26. Oktober 2026): W0 gebaut (feste NPC-Ausgangslage). Erweitert gegenüber dem Plan: Auch die Wege sind seed-fest (Wartezeiten und Ziele je NPC aus einem eigenen Strom `n.rr`), denn die Patrouille einer Wache entscheidet im Schleichen mehr als ihr Startpunkt. Nach dem Bau misst `tools/messung-netz.js gleich` Ausgangslage und NPCs nach 20 s Erkunden als gleich (davor verschieden). Die Standardwartezeit in `mk` war ein toter Zufallsaufruf (alle NPCs überschreiben sie).
- v1.6 (26. Oktober 2026): Z1 gebaut (Zuschauer, in einem Commit mit Beitritt in der Lobby und im laufenden Spiel). Abweichungen vom Plan: (1) `rst` trägt `n`, weil ein Zuschauer, der in Shop oder Auftragswahl einsteigt, `go` nie bekam und die Spielerzahl sonst nicht kennt. (2) Der Zuschauer kann den Link `#raum=CODE&zu=1` schon jetzt benutzen, die Kachel kommt mit Z4. (3) Ein Beitritt während des Ergebnisses wartet bis zur nächsten Runde (die Welt der beendeten Runde wäre ohne Schnappschüsse starr). (4) Zuschauer bekommen die privaten Ereignisse einzelner Spieler nicht, auch nicht die des gefolgten.
