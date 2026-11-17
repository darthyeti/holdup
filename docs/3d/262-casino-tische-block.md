# Casino-Tische je Block (Ticket 262)

(Ausgelagert aus docs/plan-3d.md, Abschnitt Klötzchen-Stil, Inhalt unverändert.)

`good:chips` baut jeden Tisch in einem lokalen Rahmen von 4x2 Kacheln (`KL.casinoBlock`): Mitte, Drehung (`th`) und Spielerseite (+v) kommen aus der Lage der Chipflaeche `rc` und der Mehrheit der Tische derselben Achse (die Spielerseite zeigt von der Wand weg). Zahlenfeld, Reling, Chips und Stuhl liegen in diesem Rahmen, es gibt keinen gemeinsamen Unterbau mehr, auch bei aneinandergrenzenden und gedrehten Tischen (Karte N, E, W). Test `262-kl-casino-block` (Rahmen ohne Ueberlappung, Achse stimmt, sechs Karten und Drehungen), reine Darstellung.
