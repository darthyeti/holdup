# Ruckler im 3D auf schwächeren Rechnern (Ticket 265, 17. November 2026)

(Ausgelagert aus docs/plan-3d.md, Abschnitt Klötzchen-Stil, Inhalt unverändert.)

Befund aus dem Coop-Log (Build 334, AMD-iGPU): Spitzen von 130 bis 920 ms beim Ansichtswechsel, Alarm im Gefängnis, Rundenstart und je Sperrteil im Transporter. Gemessen mit `info()` der Ansicht (neu: `rb` Neubauten der Welt, `prog` Programme, `warm` Vorarbeit) und der Bildzeit (`draw` plus `gl.finish`) im Container (SwiftShader, auch mit CPU-Drossel 2x und 4x):

| Vermutung | Ergebnis |
|---|---|
| **Bodentextur bei jeder Rasteränderung neu** (`refreshGround`) | **Hauptursache, belegt.** Jede Rasteränderung (Sperrteil `X`, Fenster `w` oder `Y`, Tür, Gitter im Gefängnis über `prisonOpen`, also auch der Alarm) setzte die ganze Bodentextur neu zusammen (zwei Vollbild-Kopien, 3072 x 1728, rund 21 MB) und lud sie hoch, `groundUp` stieg bei 12 Sperrteilen von 1 auf 13. Das Spiel zeichnet diese Zustände in 2D dynamisch, die Ebenen `st` und `so` ändern sich dabei nicht. |
| Shader-Neuübersetzung bei wechselnder Lichtzahl | **widerlegt.** Die Punktlichter sind ein festes Feld (`NPL`) mit Zähler `uPlN`, die Zahl der Lichter ändert kein Programm. Neu übersetzt wird nur bei den Schaltern `L_SH` (Schattenkarte) und `L_SP` (Taschenlampe bei Nacht): je Schalterkombination ein Satz Programme. |
| Erstes Zeichnen neuer Materialien und Pools | **plausibel, im Container nicht messbar** (SwiftShader übersetzt erst beim ersten Zeichnen, die Zahl der Programme stieg beim Wechsel auf Nacht, die Bildzeit des Wechsels nicht). |
| Geometrie ohne Pool je Barrikadenteil | **nicht belegt.** Gemessen wurde die Rasteränderung `X` je Sperrteil (siehe oben, 6 bis 13 ms nach der Behebung); die Teile der Barrikade (`its`, Dinge) wurden nicht einzeln gemessen. |

Behoben (`js/view3d.js`):
- **`groundSame`:** Bei Rasteränderung wird je geänderter Kachel der Ausschnitt der Bodentextur mit `st` und `so` verglichen, ist er gleich, entfällt der Ersatz der Textur, die statische Welt wird weiter neu gebaut (2 bis 3 ms). Ein anderer Präfix des Schlüssels (Tresor, Szenario) oder ein Unterschied in der 2D-Zeichnung ersetzt sie wie bisher.
- **`warmShaders`:** einmal je Ansicht nach dem ersten Aufbau werden alle Pools angelegt und alle Schalterkombinationen über `compileAsync` im Voraus übersetzt (11 auf 27 bis 38 Programme), nur wo die Grafikkarte parallel übersetzen kann (`KHR_parallel_shader_compile`, sonst blockierte die Vorarbeit selbst). `window.__holdupWarm` erzwingt sie (Test), `__holdupNoWarm` schaltet sie aus. Wirkung auf echten Grafikkarten ungemessen, bitte im nächsten Coop-Log prüfen (Bilder über 100 ms beim Alarm und beim Ansichtswechsel).

Vorher gegen nachher (Container, 12 Sperrteile im Transporter-ähnlichen Aufbau, Bildzeit in ms je Sperrteil): ohne Drossel Median 968 (Höchstwert 2554) gegen 8,5 (13), mit Drossel 4x Median 1145 (1984) gegen 22,5 (61); Ersatz der Bodentextur 12 gegen 0. Offen (nicht behoben, Spiel und nicht 3D): Kartenbau beim Rundenstart (332 bis 787 ms), Neuaufbau der Ansicht beim ersten Umschalten (Modul, Renderer), Zeitsprünge um 0,2 s. Test `265-3d-ruckler`.
