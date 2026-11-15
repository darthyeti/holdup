/* Kloetzchen-Stil: Aufnahmen am Boden (Ticket 234, fx3d().pk: k 5 Munition, 6 Medikit, jede andere Zelle ein neutraler Klotz). Haken KL.fx('dyn', k): Klotzmodelle, die leicht ueber dem Boden schweben, wippen und
   sich drehen (eine Umdrehung in 3 Sekunden, Versatz nach Position, damit nicht alle im Gleichtakt laufen), darunter ein weicher Schatten. Nur Darstellung (Spielzeit k.time), kein Zustand, kein Netzformat.
   Teile je Aufnahme unter 10, kleine Teile laufen im Kern ueber den flachen Pool (KCFG.small). Hoechstens PK_MAX Aufnahmen, die naechsten zum Spieler. */
const PK_MAX = 40, SPIN = Math.PI * 2 / 3, FLOAT = 8, BOB = 1.6;
export function register(KL) {
  // Modelle in lokalen Achsen (x vorn, y oben, z rechts), Mitte auf dem Boden, k: Kit-Werkzeug aus dem Kern
  const MODEL = {
    // Medikit: weisser Koffer mit rotem Kreuz auf dem Deckel, kleiner grauer Griff
    6: k => { const w = k.colOf(0xf1f3f5), r = k.colOf(0xe0322b), g = k.colOf(0x8b929c); k.part(k.root, 0, 4, 0, 12, 7, 8.4, w); k.part(k.root, 0, 7.6, 0, 7.4, .9, 2.2, r, .25); k.part(k.root, 0, 7.6, 0, 2.2, .9, 7.4, r, .25); k.part(k.root, 0, 8.2, 0, 4, 1.6, 1.4, g); return 4 },
    // Munition: olivgruene Kiste mit dunklerem Deckelstreifen und drei gelben Patronen
    5: k => { const o = k.colOf(0x5d6e2f), d = k.colOf(0x414f20), y = k.colOf(0xf0c93a), b = k.colOf(0xb77c2c); k.part(k.root, 0, 3.4, 0, 12, 6.4, 8.4, o); k.part(k.root, 0, 6.5, 0, 12.4, .8, 3, d);
      for (const z of [-2.6, 0, 2.6]) { k.part(k.root, 0, 8.6, z, 1.9, 3.4, 1.9, y, .2); k.part(k.root, 0, 10.7, z, 1.5, 1, 1.5, b) } return 8 },
    // unbekannte Zelle: neutraler Klotz mit hellem Punkt
    0: k => { k.part(k.root, 0, 4, 0, 8, 8, 8, k.colOf(0x6f86a6)); k.part(k.root, 0, 8.2, 0, 2.6, .9, 2.6, k.colOf(0xf1f3f5), .2); return 2 },
  };
  KL.pickupKinds = [5, 6];
  KL.fx('dyn', k => {
    const X = k.X, D = X.fx ? X.fx() : null; if (!D || !D.pk || !D.pk.length) return;
    let L = D.pk; if (L.length > PK_MAX) { const P = X.me || X.p || { x: 0, y: 0 }; L = L.slice().sort((a, b) => Math.hypot(a.x - P.x, a.y - P.y) - Math.hypot(b.x - P.x, b.y - P.y)).slice(0, PK_MAX) }
    for (const q of L) {
      const ph = (q.x * .37 + q.y * .23) % 6.283, a = k.time * SPIN + ph, h = FLOAT + BOB * Math.sin(k.time * 2.1 + ph), m = MODEL[q.k] || MODEL[0];
      k.state(0, 1); k.rotY(q.x, q.y, a, 1); k.root.elements[13] += h;   // schweben: Wurzel um h anheben
      m(k);
      if (k.ao) k.ao(q.x + 1, q.y + 2, 0, 15 - h * .25, 15 - h * .25, 0, .34 - h * .008);
    }
  });
}
