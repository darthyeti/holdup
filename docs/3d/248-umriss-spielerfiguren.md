# Umriss der Spielerfiguren weniger dominant (Ticket 248, 16. November 2026)

(Ausgelagert aus docs/plan-3d.md, Abschnitt Klötzchen-Stil, Inhalt unverändert.)

Till (Coop-Test): Die Außenlinien der Figuren wirken auch nach #222 zu dominant. Vier Stile standen in der Vorschau zur Wahl (wie bisher, dünn halbtransparent, nur bei ähnlichem Grund, Spielerfarbe, umschaltbar mit F6). **Entschieden (Till, 16. November 2026): "dünne Farblinie in Spielerfarbe".** Fest gebaut, Umschalter und übrige Stile entfernt:

- **Spielerfiguren:** dünne Linie in der Teamfarbe (`o.sc`), 55 Prozent der bisherigen Breite (`FG.look.plW`), Deckkraft 0,95 (`plA`), Tag und Nacht gleich.
- **Alle anderen Figuren** (Polizei, Zivilisten, Wachen): leise, 55 Prozent der Breite (`npcW`), halbe Deckkraft (`npcA`, Dither), dunkel am Tag (`outDay`), hell bei Nacht (`outNight`, Deckkraft dazu `outNightA`).
- **Hinter Wänden** bleibt die Silhouette (2.21) unverändert, sie ist ein eigener Pool in der Spielerfarbe.

Umsetzung: `kit.outline(on, o)` in `js/kl-kern.js`, der Umriss-Pool `k-umriss` trägt Farbe und Deckkraft je Instanz (`iO`), Werte in `V3CFG.fig.look` (`js/view3d.js`). Nur Darstellung, kein Netzformat, 2D unverändert. Test `248-kl-umriss`, Bild Tag und Nacht (Spieler links in Orange): `docs/bilder/stil-kloetzchen/umriss-fest.jpg`.
