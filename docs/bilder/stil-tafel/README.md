# Stil-Tafel Low-Poly-Figuren (Ticket 160, 3D-2b)

Drei Stilrichtungen für die Figuren aus Grundkörpern (Entscheidung E1, docs/plan-3d.md Abschnitt 3). Noch nichts davon ist im Spiel, die Bilder dienen nur der Auswahl.

Alle Bilder zeigen dieselbe Aufstellung auf hellem Bankboden mit Tresen, Tageslicht (Sonne von Nordwest, Schatten nach Südost wie in 2D) und Himmelslicht. Die Spielkamera ist die aus `js/view3d.js` (fov 30, Kippung 25 Grad, Abstand so, dass 544 Weltpixel die Bildhöhe füllen), die Figuren sind so groß wie im Spiel (Kachel 32, Wand 64). Erzeugt mit `node tools/stil-tafel-3d.js` (gibt auch Dreiecke und Teile je Figur aus) aus `tools/stil-tafel-3d.html` (im Browser ansehen über einen Webserver: `tools/stil-tafel-3d.html?stil=B&shot=nah`).

Licht und Schatten der Bilder gibt es im Spiel erst mit 3D-5, die Figuren sehen dort zunächst flacher aus.

## Bilder

| Bild | Inhalt |
|---|---|
| `vergleich-spielkamera.jpg` | alle drei Stile untereinander, Spielkamera, die wichtigste Tafel |
| `stil-a-spiel.jpg`, `stil-b-spiel.jpg`, `stil-c-spiel.jpg` | Aufstellung aus der Spielkamera: Räuber (zielt, orange), Polizist, Schild-Beamter, Scharfschütze, Wache, Zivilist, Geisel (kniend, Hände hinter dem Kopf), Spieler 2 am Boden (blau) |
| `stil-a-nah.jpg`, `stil-b-nah.jpg`, `stil-c-nah.jpg` | Nahaufnahme: Räuber, Polizist, Schild-Beamter, Geisel |
| `stil-a-bewegung.jpg`, `stil-b-bewegung.jpg`, `stil-c-bewegung.jpg` | drei Laufphasen des Räubers, Räuber zielt, Polizist läuft und zielt, Scharfschütze zielt, Schild-Beamter rückt vor |

## Die drei Stile

**A: kantig minimal.** Nur Quader, flache Farben ohne Glanz (Lambert, flache Schattierung). Kopf ein Würfel, Mütze und Helm als Klötze, die Sturmhaube mit hellem Augenschlitz. Erinnert am ehesten an die Pixel-Figuren von Cyberdogs, wirkt aber hart.

**B: weicher Spielzeugstil.** Kapseln und Kugeln, großer runder Kopf (gut ein Drittel der Figur), kräftige Farben, leichter Glanz. Augen als Punkte, Polizeimütze mit Schirm, Helm mit Visier, Schild durchsichtig.

**C: schlank, realistischere Proportionen.** Dünne Glieder, kleiner Kopf (rund ein Sechstel), gedeckte dunkle Töne. Mehr Einzelheiten: Weste mit Taschen und Schriftband, Gürtel, Holster, Abzeichen an der Mütze, Helm mit dunklem Visier, Mütze des Scharfschützen, Tasche mit Riemen.

## Einschätzung

| | A kantig | B Spielzeug | C schlank |
|---|---|---|---|
| Lesbarkeit aus der Spielkamera | gut: klare Umrisse, Farben unterscheidbar | am besten: Kopf und Kopfbedeckung sind von oben das wichtigste Merkmal, hier am größten | schwächer: schmale Glieder und dunkle Töne verschwimmen, Polizist, Schild-Beamter und Wache sind schwer zu trennen; die Einzelheiten sieht man erst in der Nahaufnahme |
| Aufwand (Bau ins Spiel) | klein | mittel | mittel bis groß (mehr Teile je Art, Westen und Zubehör je Figur) |
| Dreiecke je Figur | 190 bis 240 | 3.400 bis 3.700 (so gebaut; mit halb so vielen Segmenten in Umfang und Kappen geschätzt rund 1.000, aus der Spielkamera kaum sichtbar) | 1.470 bis 1.670 |
| Teile je Figur (Meshes) | 16 bis 20 | 18 bis 23 | 18 bis 29 |

Bildzeit grob: Bei 20 bis 30 Figuren im Überfall sind das für A rund 6.000, für C rund 45.000, für B (verringert) rund 30.000 Dreiecke, alle drei für eine Grafikkarte unkritisch. Entscheidend ist die Zahl der Draw Calls: Jede Figur hat 16 bis 29 Teile; im Spiel müssen die Teile wie heute die Aufsteller als `InstancedMesh` je Teil-Art laufen (ein Draw Call je Teil-Art für alle Figuren, nicht je Figur), sonst wären es mehrere hundert Draw Calls. Das gilt für alle drei Stile gleich, A hat die wenigsten Teil-Arten.

## Empfehlung

**Stil B als Grundlage**, mit zwei Anpassungen beim Bau: Farben etwas zurücknehmen (Richtung Tageslicht-Realismus, damit es nicht nach Kinderspielzeug aussieht) und die Segmente der Kapseln und Kugeln halbieren. Begründung: Aus der Spielkamera sieht man vor allem Köpfe und Schultern. Der große Kopf trägt das, was die Figuren unterscheidet (Sturmhaube, Polizeimütze, Helm, Haare), und bleibt auch klein lesbar; das ist der Kern des Cyberdogs-Gefühls, bei dem man jede Figur auf einen Blick erkennt. C sieht in der Nahaufnahme am besten aus, verliert aber genau dort, wo gespielt wird, und kostet am meisten Bauzeit. A ist die günstige Rückfall-Lösung, wenn B zu verspielt wirkt.
