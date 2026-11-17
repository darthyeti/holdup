# Fluchtwagen mit Abwechslung (Ticket 245, 16. November 2026)

(Ausgelagert aus docs/plan-3d.md, Abschnitt Klötzchen-Stil, Inhalt unverändert.)

Der Fluchtwagen (`van` in `js/kl-fahrzeuge.js`, Funktion `flucht`) war immer derselbe Lieferwagen. Jetzt eine von vier Varianten je Auftrag, gewählt aus `LAY.seed` (die Karte, bei Host und Client gleich, ohne Zufall), mit gleicher Grundfläche, Höhe und Kollision (nur Optik, keine Änderung an Spiellogik, Größe oder Netzformat):

- **0 Lieferwagen** cremeweiß mit Firmenstreifen (Firmenfarbe aus `KCFG.car.facc`) und Logo auf dem Dach.
- **1 Dunkler Kleinbus** mit getönter Fensterfläche, dunklem Dach und Dachträgern.
- **2 Pickup mit Plane**: olivfarbenes Fahrerhaus, offene Ladefläche mit Bordwänden, blaue Plane in drei Stufen mit Spannseilen.
- **3 Alter Kastenwagen** in Beige mit vier Rostflecken, blauem Fahrerhaus und Dachträgern.

Farben aus der eigenen Palette `KCFG.car.fpal` (nicht die `pal` der zivilen Autos), Plane `ftarp`. Fluchtwagen-Merkmale: Der Fahrer sitzt im Fahrerhaus (Kopf mit Mütze über der Scheibe). Steht der Wagen still (Position gleich seit 0,35 s Spielzeit aus `figs3d`, auch beim Client gleich), steht die Schiebetür offen (Lieferwagen, Kleinbus), die Hecktür (Kastenwagen) oder die Heckklappe (Pickup). Teile 26 bis 32 je Wagen (Grenze 40, Test `231-kl-fluchtwagen`). Vorhut (`vh`) und Panzerwagen (`tk`) unverändert. Bilder `fluchtwagen-varianten.jpg` (oben Tag, unten Nacht, je Variante fahrend und wartend), Werkzeug `tools/bilder-kloetzchen.js` Ablauf `fluchtwagen`.
