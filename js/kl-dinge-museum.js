/* Kloetzchen-Stil: Dinge des Museums (Ticket 198, Schritt 4c, Teil Museum): Vitrinen, Bilder, Statue, Reliquien, VIP-Auslagen, Laser. register(KL) traegt Bauer fuer Szenario-Teile ein, fn(k, o) je Bild mit
   k.dbrick(mx, mz, y0, sx, sy, sz, drehung, farbe, leuchten) (Mitte in Weltpixeln, Unterkante y0, sx laenge entlang der Drehung). 'good:art' gilt vor 'good' (o.n ist die Unterart). o.rc ist das Rechteck [x, y, w, h],
   o.done heisst genommen: dann bleibt ein dunkler Sockel oder Rahmen. Dazu laser (o.x0..y1, o.on, o.f Puls). Die Vitrine (vit) teilt sich der Juwelier, hier die Fassung fuer beide. */
const GEM = [0xe5324a, 0x3ac4d9, 0xf0e8c8, 0x7ee34a, 0xb36af0, 0xffb02e];
// Glashaube: nur die Rahmenkanten (das Glas ist durchsichtig), Sockel in warmem Holz, damit Sockel und Auslage sich abheben
const hood = (k, r, t, h, base) => {
  const cx = r[0] + r[2] / 2, cz = r[1] + r[3] / 2;
  k.dbrick(cx, cz, t, r[2] - 4, 2.5, r[3] - 4, 0, base || 0x8a5a34);
  for (const [dx, dz, sx, sz] of [[-1, 0, 1.2, r[3] - 5], [1, 0, 1.2, r[3] - 5], [0, -1, r[2] - 5, 1.2], [0, 1, r[2] - 5, 1.2]]) k.dbrick(cx + dx * (r[2] / 2 - 2.6), cz + dz * (r[3] / 2 - 2.6), t + 2.5, sx, h, sz, 0, 0xd6ecf8, .12);
};
// Schmuck auf dem Kissen: Raster aus Steinen (bunt, leuchtend), dazwischen Goldringe und Barren
const jewelry = (k, r, t) => {
  const cx = r[0] + r[2] / 2, cz = r[1] + r[3] / 2, nx = Math.max(1, Math.floor((r[2] - 8) / 9)), nz = Math.max(1, Math.floor((r[3] - 8) / 9)), t2 = t + 4.1;
  k.dbrick(cx, cz, t + 2.5, r[2] - 7, 1.6, r[3] - 7, 0, 0x5a1f5a);
  for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) { const x = cx - (nx - 1) * 4.5 + i * 9, z = cz - (nz - 1) * 4.5 + j * 9, n = i * 7 + j * 3 + Math.round(cx / 7);
    if (n % 3 === 0) { k.dbrick(x, z, t2, 5, .8, 5, 0, 0xe8b923, .35); k.dbrick(x, z, t2 + .8, 3, 2.6, 3, .4, GEM[n % 6], .7) } else if (n % 3 === 1) k.dbrick(x, z, t2, 6.4, 2.2, 3, .3 * (n % 4), 0xffc83a, .45); else k.dbrick(x, z, t2, 4, 3.4, 4, .4, GEM[(n + 2) % 6], .8) }
};
export function register(KL) {
  KL.obj('vit', (k, o) => { const r = o.rc, cx = r[0] + r[2] / 2, cz = r[1] + r[3] / 2, t = k.topAt(cx, cz), jw = k.X.LAY && k.X.LAY.jewel;
    if (o.done) { k.dbrick(cx, cz, t, r[2] - 6, .5, r[3] - 6, 0, 0x10080c); return }
    hood(k, r, t, jw ? 7 : 9, jw ? 0x6a3f24 : 0x8a5a34);
    if (jw) jewelry(k, r, t); else { k.dbrick(cx, cz, t + 2.5, r[2] - 8, 2, r[3] - 8, 0, 0x7a2a3a); k.dbrick(cx, cz, t + 4.5, 8, 5, 5, 0, 0xffd23a, .6); k.dbrick(cx, cz, t + 9.5, 4, 3, 4, .4, 0x3ac4d9, .8) } });
  // Bilder an der Wand: goldener Rahmen, bunte leuchtende Leinwand; genommen bleibt ein dunkler Rahmen
  KL.obj('good:art', (k, o) => { const r = o.rc, cx = r[0] + r[2] / 2, cz = r[1] + r[3] / 2, a = r[2] >= r[3] ? 0 : Math.PI / 2, L = Math.max(r[2], r[3]) - 4;
    if (o.done) { k.dbrick(cx, cz, 14, L, 14, 2, a, 0x4a3a2a); return }
    k.dbrick(cx, cz, 12, L, 20, 3, a, 0xd9a441, .2); k.dbrick(cx, cz, 14, L - 6, 16, 3.6, a, [0x3a9ad9, 0xe5603a, 0x4fb858, 0xe5c33a][(Math.round(cx / 32) + Math.round(cz / 32)) & 3], .3); k.dbrick(cx, cz, 18, (L - 6) * .5, 6, 4, a, 0xf4ecd8, .35) });
  // Statue: heller Sandsteinsockel, Figur in hellem Marmor mit Goldkranz
  KL.obj('good:statue', (k, o) => { const r = o.rc, cx = r[0] + r[2] / 2, cz = r[1] + r[3] / 2;
    k.dbrick(cx, cz, 0, 24, 8, 24, 0, 0xb59a6a); k.dbrick(cx, cz, 8, 20, 2, 20, 0, 0x8a6f48); if (o.done) return;
    k.dbrick(cx, cz, 10, 12, 14, 9, 0, 0xf2eee2); k.dbrick(cx, cz, 24, 8, 10, 8, 0, 0xf2eee2); k.dbrick(cx, cz, 34, 8, 8, 8, 0, 0xfffaf0); k.dbrick(cx, cz, 41.6, 9, 1.6, 9, 0, 0xe8b923, .5); k.dbrick(cx + 7, cz, 18, 3, 8, 3, 0, 0xf2eee2); k.dbrick(cx - 7, cz, 18, 3, 8, 3, 0, 0xf2eee2) });
  // Reliquien und VIP-Auslagen: roter Samtsockel, Haube, Gold und Edelstein leuchten
  for (const n of ['relic', 'vip']) KL.obj('good:' + n, (k, o) => { const r = o.rc, cx = r[0] + r[2] / 2, cz = r[1] + r[3] / 2, t = k.topAt(cx, cz); if (o.done) { k.dbrick(cx, cz, t, r[2] - 6, .5, r[3] - 6, 0, 0x10080c); return } hood(k, r, t, 12, 0x8a2a3a);
    k.dbrick(cx, cz, t + 2.5, r[2] - 8, 1.6, r[3] - 8, 0, 0x7a1f30);
    if (n === 'relic') { k.dbrick(cx, cz, t + 4.1, 8, 6, 8, 0, 0xffd23a, .6); k.dbrick(cx, cz, t + 10.1, 4, 5, 4, .4, 0xff4a5a, .9) } else { k.dbrick(cx - 4, cz, t + 4.1, 6, 3, 6, 0, 0xf4f4ff, .5); k.dbrick(cx + 4, cz, t + 4.1, 6, 5, 6, 0, 0x3ac4d9, .8) } });
  // Laser: Sender an beiden Enden, Strahl als duenner leuchtender Klotz in Knie bis Huefthoehe, aus nur ein matter Strich
  // Lichtschranke (Ticket 239): duenner satter roter Kern mit schwachem dunkelroten Schein (kein Pastell, kein dicker Balken), Flimmern ueber o.f; Sender und Empfaenger sind kleine dunkle Metallgehaeuse mit
  // roter Linse auf Strahlhoehe, flach an der Wand (die Enden der Linie liegen in der Mauerkachel: von dort so weit zur Gegenseite, bis die Kachel frei ist, dort sitzt die Rueckseite des Gehaeuses, der
  // Strahl beginnt an der Linse). Aus (o.on falsch): Linsen dunkel, kein Strahl, kein Ersatzbalken.
  KL.obj('laser', (k, o) => {
    const H = k.C.scen.laserH, T_ = k.T, cell = k.E.cellAt, wall = (x, y) => { const e = k.C.cells[cell(Math.floor(x / T_), Math.floor(y / T_))]; return !!e && e.s.some(q => q[0] === 0 && q[1] >= k.C.wallH) };
    const L0 = Math.hypot(o.x1 - o.x0, o.y1 - o.y0); if (L0 < 1) return; const ux = (o.x1 - o.x0) / L0, uy = (o.y1 - o.y0) / L0, a = Math.atan2(uy, ux);
    const face = (x, y, sx, sy) => { let n = 0; while (wall(x, y) && n++ < 48) { x += sx; y += sy } return [x, y] };          // Mauerflaeche: vom Ende zur Gegenseite, bis die Kachel frei ist
    const f0 = face(o.x0, o.y0, ux, uy), f1 = face(o.x1, o.y1, -ux, -uy), D = 4.2, W = 7.5, HH = 9;
    for (const [f, s, e] of [[f0, 1, [o.x0, o.y0]], [f1, -1, [o.x1, o.y1]]]) {
      const cx = f[0] + ux * s * D / 2, cz = f[1] + uy * s * D / 2;
      if (!wall(e[0], e[1])) k.dbrick(cx, cz, 0, D + 1, H - HH / 2, 5, a, 0x2b3038);                                                          // freistehend: Saeule
      k.dbrick(cx, cz, H - HH / 2, D, HH, W, a, 0x2b3038); k.dbrick(cx, cz, H + HH / 2 - 1.2, D + .4, 1.2, W + .4, a, 0x464e5a);                    // Gehaeuse und Deckplatte
      k.dbrick(f[0] + ux * s * (D + .5), f[1] + uy * s * (D + .5), H - 1.4, 1.2, 2.8, 2.8, a, o.on ? 0xff1010 : 0x2e2226, o.on ? 1.1 : 0);          // Linse
    }
    const b0 = [f0[0] + ux * (D + 1.1), f0[1] + uy * (D + 1.1)], b1 = [f1[0] - ux * (D + 1.1), f1[1] - uy * (D + 1.1)], L = Math.hypot(b1[0] - b0[0], b1[1] - b0[1]);
    if (!o.on || L < 1 || (b1[0] - b0[0]) * ux + (b1[1] - b0[1]) * uy < 0) return;
    const mx = (b0[0] + b1[0]) / 2, mz = (b0[1] + b1[1]) / 2;
    k.dbrick(mx, mz, H - .25, L, .5, .5, a, 0xff0a0a, .5 + .5 * o.f);                                                                          // Kern
    k.dbrick(mx, mz, H - 1, L, 2, 2.6, a, 0xb00000, .15 + .3 * o.f);                                                                              // Schein
  });
}
