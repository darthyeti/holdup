# Offen und Spieltest

Teil der Projektdoku, der Kern steht in `CLAUDE.md`. Hier steht, was als Nächstes ansteht: die Fragen für Tills Spieltest, offene Entscheidungen, technisch Offenes und die ungemessenen Stellschrauben. Gebaute Dinge mit Werten und Messungen stehen in der jeweiligen Themendatei (Liste in `CLAUDE.md`, Wo steht was), nicht hier.

Pflege: Sobald etwas gebaut ist, das Till noch nicht gespielt hat, kommt hier eine Zeile mit den Fragen dazu (Bereich suchen, sonst neuen anlegen). Hat Till getestet und entschieden, wird der Punkt gestrichen und die Erkenntnis geht in die Themendatei. Die Chronik der Builds gehört nicht hierher und nicht in `CLAUDE.md`: Sie steht in der Git-Historie und in den Themendateien.

Stand der Prüfung (21. Oktober 2026, Build 65, `VER` 20, `UI_API` 4): 141 automatische Tests grün (`cd tests && npm test`, rund 4 Minuten), das sind keine Spieltests. Von Till gespielt sind der Solo-Transporter (Build 27: machbar, am Ende bleiben 5 bis 10 s), der erste Solo-Test der neuen Karten (Build 41), das Feedback zum Juwelier (Build 46) und mehrere Coop-Partien zu dritt und zu viert (daraus entstanden Alarm-Meldung, Polizei-Abstand, Fluchtwagen, Shop-Ausbau, Auszeichnungen, Polizei-Anfahrt, Beobachterregeln, Team-Leiste). Fast alles, was danach gebaut wurde, war ungespielt. Am 21. Oktober 2026 hat Till abgehakt: Polizei, Barrikaden und Gegner (Lehnen, Schilde, Granaten, Scharfschützen, Innentür-Barrikaden, Riegel, Abstand, Anfahrt, Wiederbeleben, Pistole), den Fluchtwagen (Zeiger, Einsteigen, Fahrer), den Transporter (solo und Coop), den Juwelier (Wege, Werte, Wache), leises Vorgehen (Beobachterregeln, Verdachtsbalken im Coop), den Coop (Alarm-Meldung, Namen, Versionsanzeige, Team-Leiste, Rückfrage, Auszeichnungen, Lobby) und die Menüs (Kacheln, Bildgröße, Maus fangen, "so in Ordnung erstmal"). Was unten steht, ist der Rest. Vor neuen Spielsachen kommt der Test (Regel in `CLAUDE.md`).

## Spieltest-Fragen (Till)

### Fluchtwagen

- [ ] Ruf (automatisch nach 150 s, G nach 40 s, mit Funkgerät Stufe 1 bis 3 in 28, 20, 14 s, im Coop zählt das beste Funkgerät aller Lebenden): Ist ein Funkgerät Stufe 3 im Team zu früh für alle (Vorschlag: Untergrenze oder nur das Funkgerät des Rufenden)?

### Lage-Tags (docs/karte-und-layout.md)

- [ ] Spürt man jeden Tag? Ist Nebel (Sichtradius etwa 380 px) lesbar statt nervig, lohnt sich Sicherheitsdienst gegen den Beute-Aufschlag, ist die Flaute eine echte Verschnaufpause und kein Geschenk, passt der Zahltag (Polizei 11 s früher), ist das Wachsame Personal beim lautlosen Raub fair?

### Szenarien (docs/szenarien.md)

- [ ] Juwelier, fünf Hallen: Wirken sie verschieden genug, sind Salon und Ring mit den Trennwänden im Überfall zu stark oder zu schwach, hilft die Deckung hinter Säulen?
- [ ] Tankstelle: Ist der Einstieg leicht genug, sind die explodierenden Zapfsäulen lesbar und fair, kommt die Polizei nach 28 s zu früh?
- [ ] Museum: Sind die Laser-Tore und der 50-s-Schalter spannend statt fummelig, passt der Lichtkegel der Wachen (sie sehen Spieler im Kegel überall, `CFG.museum.seen`), ist das Tragen schwerer Stücke (Statue 3 Plätze) eine echte Entscheidung, ist die Nacht lesbar?
- [ ] Casino: Ist der Chip-Tausch am Cage eine echte Entscheidung, sind 19 bis 30 Gäste und 4 bis 6 Sicherheitsleute zu viel, läuft es flüssig, wie lang ist die Ladezeit der Karte?
- [ ] Zufall mit Rang: Museum ab Auftrag 3, Casino ab Auftrag 5 (`CFG.rank` 2 und 4).
- [ ] Neue Grundrisse von Tankstelle, Museum und Casino: Sehen sie verschieden genug aus, ist jede Variante fair (Tankstelle Insel mit dem Block vor der Tür, Museum Kabinette mit den engen Durchgängen und Ring mit dem Mittelblock, Säulenhalle als Deckung für die Polizei, Casino Reihen und Staffel mit den längeren Wegen), merkt man die Wachrouten, passt die Lage von Bar und Automaten im Casino zur Flucht, fehlt in den Lagern der Tankstelle Abwechslung (die Kisten sind bewusst gleich, weil sie Deckung sind)?

### Leises Vorgehen und Nebenziele (docs/spielsystem.md)

- [ ] Nebenziele: Ist das Ziel zu Beginn lesbar (Meldung und Zeile ZIEL), sind die Bonus-Prozente und Grenzen fair (Schnell 120 s auf der Bank, Ohne Treffer 15 %, Nichts liegen lassen .75), wirkt "Alle auf den Beinen" zu dritt, stört die Zeile im HUD?

### Shop und Wurfgeräte (docs/spielsystem.md)

- [ ] Ist die Wurf-Bedienung gut (Ring, Reichweite 300, Loslassen)? Lohnt sich die Blendgranate (1,5 bis 3,5 s, trifft auch das Team), der Rauch (9 s, Radius 110, gegen Beamte am Fluchtwagen), der Ablenker (8 s, lockt Wachen, Erkunden)?
- [ ] Ist der Verschleiß spürbar, aber nicht frustrierend (Reparatur 40 %), sind die Stufenpreise richtig, ist der Shop lesbar (17 Kacheln, Beschreibung unten)?

## Offene Entscheidungen (Till)

- Breiteres Schussfeld beim Lehnen? Es macht das Lehnen deutlich stärker, `CFG.bar` müsste neu gedreht werden. Empfehlung: nein. (Hintergrund: Schräge Kugeln verlassen die Barrikaden-Kachel seitlich und treffen das Fenster neben der Tür, Messung in docs/polizei-und-barrikaden.md.)
- Gedrehte Karten im Zufall: `layoutFor` baut keine, `turnLayout` kann es. Soll die Seite der Straße zufällig aus dem Seed kommen? Die Balance je Seite ist nur mit dem Bot-Rauchtest gemessen (docs/karte-und-layout.md, Freie Straße).
- Fluchtwagen mit Funkgerät im Team: Untergrenze oder nur das Funkgerät des Rufenden (siehe Fluchtwagen oben).
- Treffpunkt des Fluchtwagens in der Seitenstraße als Kartenvariante, nur nach Tills Test.
- Maus fangen als Voreinstellung an (bisher aus)?
- Abfrage des Browsers beim Schließen des Tabs für den Host (Esc, Raum schließen und die Pause fragen schon zurück, siehe docs/coop-und-netz.md, Was beendet die gehostete Sitzung).

## Technisch offen

Coop (in sinnvoller Reihenfolge):

1. Echter Test zu zweit oder zu dritt über das Internet: Latenz, Spielgefühl, ob die Verbindung durch Heim-Router geht. Bisher gespielt, aber Latenz und Router wurden nicht festgehalten, unklar ob alle über das Internet verbunden waren. Direktverbindung scheitert bei strengen NATs, dann braucht es einen TURN-Server oder ein WebSocket-Relay (z. B. Cloudflare Workers). Der PeerJS-Vermittler `0.peerjs.com` ist ein öffentlicher Gratisdienst ohne Zusage.
2. Zuschauer-Wechsel per Taste (nicht gebaut, Namen schon). Hinweis in der Lobby, wenn die Seite per Link (`#raum=XXXX`) geöffnet wurde und der Raum nicht existiert (zeigt aktuell die Fehlermeldung im Menü).
3. Coop-Balance: Wellengröße je Spielerzahl (`CFG.perPlayer`) und Zeiten sind Schätzungen, ein Coop-Bot fehlt (`tools/bot.js` spielt nur Solo). Beute fallen lassen, Funk-Ping (Wiederbeleben ist gebaut).4. Rollenlogik und Missionen (Kundschafter vs. Fahrer/Absicherer), mehr Banken und Karten, Geiseln, Kampagne mit Beute als Geld (das Konto und der Shop sind gebaut).
5. Reconnect nach Verbindungsabbruch, Hostwechsel (aktuell beendet der Host-Abbruch das Spiel für alle).
6. Eigenen Schuss serverseitig verzögerungsfrei abrechnen (Lag-Kompensation), aktuell trifft der Host mit seiner Sicht.

Polizei und Barrikaden: Der Spieltest ist abgehakt, offen ist, ob danach `CFG.bar` zu drehen ist (docs/ideen-und-planung.md). Lautloser Raub: Ablenkung als nächste Schicht (der Ablenker als Wurfgerät auf Taste 5 ist gebaut, was darüber hinaus geplant war, steht in docs/ideen-und-planung.md).

Karten (docs/karte-und-layout.md): Posten und Wagenplätze wirklich ableiten (`autoPosts` wird bisher nur mit der Handliste verglichen), Registry für Kartentypen, Tresor und Büro optional. Karten über 64 x 64 und Coop mit gedrehter Karte sind ungeprüft.

Transporter (docs/szenarien.md): Schritt B bis D und weitere Karten. Die Besatzung hat keine echte Deckungs-KI (steht am Posten, stürmt nach `crewHold`). Es fehlen Bot, Vorhut mit Verdacht auf der Fahrbahn, Sprengladung und Generator-Varianten.

Menüs, Serie, Langzeit (docs/ideen-und-planung.md): Auftragsbörse (Menü Stufe 5), Karriere-Serie mit Rang und Nebenzielen (Entwurf), Touch für iPad und iPhone (Entwurf), Langzeitmotivation.

Struktur (docs/ideen-und-planung.md): Doku aufteilen und Tests festhalten sind erledigt, das Auslagern von Code ist begonnen (`js/ui.js`), als Nächstes `SND`, `peerTransport` und die Generatoren.

Werkzeug und Tests: Die Tests decken Transporter-Ablauf, Phase-1-Verdacht, Ton und die Optik im Spiel nicht ab (nur Menüs sind pixelgesichert). Der Pre-commit-Hook wirkt nur mit lokalem `core.hooksPath`. Der Browser cacht `assets/cars.png` stark.

## Stellschrauben

Die Werte stehen im Objekt `CFG` ganz oben in `start()` in `index.html` und sind dort maßgeblich, hier stehen nur die Schalter, die geschätzt oder nur mit dem Bank-Bot gemessen sind (Messungen in docs/tests-und-messwerte.md): `CFG.rev`, `CFG.bar` (`wave`, `hold`, `fuse`, `again`, `crowd`, `pref`), `CFG.pol.hold`, `CFG.pol.sep`, `CFG.pol.carGap`, `CFG.pol.foot`, `CFG.pol.car`, `CFG.snp` (und `CFG.snp.car`), `CFG.win`, `CFG.gren`, `CFG.shield`, `CFG.lean`, `CFG.gas`, `CFG.museum`, `CFG.casino`, `CFG.goods` (Werte, Plätze und Zeiten aller Beute-Stücke), `CFG.rank`, `CFG.guard`, `CFG.jewel.guard`, `CFG.goal` (alles ungemessen), `CFG.lage` (nur mit dem Bank-Bot und nur für den Überfall gemessen), `CFG.shop`, `CFG.gadget`, `CFG.susPer` (0 schaltet ab), `CFG.watch`, `CFG.awards` (alle Mindestwerte sind Schätzungen), `CFG.waveGapPer`, `CFG.perPlayer`, `CFG.loiter`, `CFG.van`, `CFG.vanAuto`, `CFG.vanCall`, `CFG.truck`, Pistole und SMG, `CFG.lock.exit`. Zum Abschalten für A/B-Messungen gibt es `CFG.pol.sep.r` 0 und `CFG.susPer` 0.

## Messhinweise für den Spieltest

- Der Bot gewinnt die klassische Bank mit frühem Rufen 100 % (95 s), beim Warten auf den Auto-Wagen nur noch etwa ein Viertel (der Altwert 77 % ist seit Schildern, Granaten und Scharfschützen überholt). Mit den neuen Fluchtwagen-Regeln gewinnt er beim Warten 0 statt 20 %, auf Zufallskarten von Bank, Juwelier, Museum und Casino 58 % bis 0 %. Er hat keine Taktik für Polizei am Wagen, die Rauchtests laufen deshalb mit `van:'alt'`. Die Fahrer-Regeln hat Till am 21. Oktober 2026 abgenommen, der Bot bildet sie weiterhin nicht ab. Einzelheiten in docs/tests-und-messwerte.md.
- Der Bot misst nur den Überfall: Phase 1 (Kameras, Wachsames Personal, Nebel, Beobachterregeln) ist nur mit `tools/stealth.js` und Skripten gemessen.
