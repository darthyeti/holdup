# Runde Reifen an den Autos (Ticket 257, 16. November 2026)

(Ausgelagert aus docs/plan-3d.md, Abschnitt Klötzchen-Stil, Inhalt unverändert.)

Die Räder der Fahrzeuge waren Quader und wirkten eckig. Jetzt sind Reifen und Felge Zylinder (`wheel(...)` im Kern `js/kl-kern.js`, eigener Pool `k-raeder`, 16 Segmente, Achse quer zur Fahrzeugachse). Alle Fahrzeugarten (`pol`, `civ`, `van`, `vh`, `tk`, Fluchtwagen-Varianten) nutzen es über `wheelP` in `js/kl-fahrzeuge.js`, das Wrack zeigt ein einzelnes Rad. Beim Zerfall (Wrack, Explosion) liefert `wheel` im Sammelmodus einen Quader, die Teile fliegen wie bisher. Das Teilelimit je Fahrzeug (40) bleibt. Rein Darstellung, kein Netzformat betroffen.

Kosten (`messung-bildzeit --3d --kl --n=12`, Erkundung, Überfall, Polizei): vorher 461 / 523 / 515 ms, nachher 444 / 491 / 493 ms je `draw()` im Messrahmen, also nicht langsamer. Dreiecke rund +128 je Szene (Bank 37.529 auf 37.653, Transporter 34.947 auf 35.011, Casino 90.245 auf 90.373), Draw Calls +1. Aus der Spielkamera sind die Räder klein, die Rundung zeigt sich vor allem an den Rändern. Bild vorher und nachher: `docs/bilder/stil-kloetzchen/reifen-vorher-nachher.jpg`.
