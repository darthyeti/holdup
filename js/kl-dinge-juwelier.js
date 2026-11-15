/* Kloetzchen-Stil: Dinge des Juweliers (Ticket 198, Schritt 4a). Szenario-Teile (KL.obj mit Namen der Art, fn(k, o) mit k.dbrick): Vitrine (vit, o.rc Rechteck in Weltpixeln, o.done leer).
   Statt der Glashaube ein Rahmen aus Messing mit Sockel und Schmuck aus leuchtenden Steinen (Rubin, Saphir, Smaragd, Diamant), geleert nur der dunkle Samt. Wande und Boden schlicht (Welt A). */
export function register(KL) {
  const B = (k, ...a) => k.dbrick(...a), gems = [[0xe5223a, 1], [0x2f6bff, 1], [0x2fd36a, 1], [0xf2fbff, 1.3], [0xffb82e, 1]];
  KL.obj('vit', (k, o) => {
    const r = o.rc, cx = r[0] + r[2] / 2, cz = r[1] + r[3] / 2, t = KL.util.top(k, cx, cz), w = Math.max(6, r[2] - 6), d = Math.max(6, r[3] - 6), gold = 0xf0c63a;
    B(k, cx, cz, t, w, 2, d, 0, o.done ? 0x2a1520 : 0x8a1f3c);                     // Samt
    if (!o.done) { // Sockel mit Schmuckstuecken (Anzahl nach Breite), leuchtende Steine
      const n = Math.max(2, Math.floor(w / 9));
      for (let i = 0; i < n; i++) { const x = cx - w / 2 + (i + .5) * w / n, g = gems[(i + Math.round(cx / 8)) % gems.length]; B(k, x, cz, t + 2, 5, 3, 5, 0, 0xe9edf2); B(k, x, cz, t + 5, 3.4, 3.4, 3.4, .78, g[0], g[1]); }
    }
    for (const a of [-1, 1]) for (const b of [-1, 1]) B(k, cx + a * (w / 2 - .8), cz + b * (d / 2 - .8), t, 1.8, 12, 1.8, 0, gold);    // Eckpfosten
    B(k, cx, cz, t + 11, w, 1.2, d, 0, 0xcfe9ff, o.done ? .15 : .4);                                                               // Deckel aus leichtem Glasschimmer
  });
}
