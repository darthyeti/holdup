/* Kloetzchen-Stil: Dinge der Strasse (Ticket 198, Schritt 4a). Szenario-Teil tk: Zubehoer am Panzerwagen (Kasten und Dach zeichnet KL.car 'tk'): offene Ladetuer mit Geld, Warnblinker bei Panne, Rauch am platten Reifen.
   o.x, o.y Mitte, o.L Laenge, o.W Breite, o.fx Fahrtrichtung (-1 oder 1), o.cargo Ladetuer offen, o.blink Blinker an, o.smoke Reifen platt. Fluchtlinie (exit), Rahmen (frame) und geparkte Autos (parked)
   bleiben beim klassischen Bauplan (Linien aus Licht, Bild-Kloetze), die zeichnet view3d wie ohne Stil. */
export function register(KL) {
  KL.obj('tk', (k, o) => {
    const b = o.x - o.fx * o.L / 2, H = k.C.cars.tk.h, B = (...a) => k.dbrick(...a);
    if (o.cargo) {
      B(b - o.fx * 1, o.y, 2, 6, H - 8, o.W - 14, 0, 0x14171c);                                              // dunkle Ladeoeffnung
      for (let i = 0; i < 3; i++) B(b - o.fx * 4, o.y - 8 + i * 8, 2, 5, 4, 7, 0, 0xf0c63a, .15);            // Goldbarren
      for (let i = 0; i < 2; i++) B(b - o.fx * 4, o.y - 4 + i * 8, 6, 5, 4, 7, 0, 0xf0c63a, .15);
      B(b - o.fx * 9, o.y, .3, 12, .5, o.W - 16, 0, 0xffd264, .5);                                           // Lichtschein am Boden
    }
    if (o.blink) for (const [u, v] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) B(o.x + u * (o.L / 2 - 8), o.y + v * (o.W / 2 - 3), H - 2, 6, 5, 6, 0, 0xffaa28, 1.5);
    if (o.smoke) { const x = o.x - o.fx * (o.L / 2 - 40), z = o.y + o.W / 2 + 4; B(x, z, 2, 12, 8, 12, .3, 0x6a6a6a); B(x + 2, z + 1, 10, 9, 7, 9, .7, 0x7d7d7d); B(x - 1, z + 2, 17, 6, 5, 6, 1.1, 0x8f8f8f) }
  });
}
