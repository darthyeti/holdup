# Spieltische im Casino (Ticket 244)

(Ausgelagert aus docs/plan-3d.md, Abschnitt Klötzchen-Stil, Inhalt unverändert.)

`KL.obj('good:chips')` in `js/kl-dinge-casino.js` baut je Tisch (Block von 4 mal 2 Kacheln, `o.rc` ist nur seine Chipfläche an der Spielerseite) eine von vier Arten, gewählt über die Tischlage (`KL.casinoTable`, Kachel-Hash): Roulette (Oktagon mit Kessel und Zahlenfeld, grün), Blackjack (Halbkreis mit Spielplätzen und Kartenschlitten, blau), Poker (Oval mit goldener Reling, burgunder), Würfel (Rechteck mit Banden und zwei Würfeln, lindgrün). Voll: farbige Chipstapel mit leichtem Glanz an der Spielerseite. Abgeräumt (`o.done`): Filz dunkelgrau, keine Chips, leere offene Chipablage mit goldener Kante und ein umgeworfener Stuhl. Nur Darstellung. Test `244-kl-casino-tische`, Bildbogen `docs/bilder/stil-kloetzchen/casino-tische-voll-leer.jpg` (Tag und Nacht, voll und leer, zwei Seeds).
