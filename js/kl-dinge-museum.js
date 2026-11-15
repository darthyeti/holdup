/* Kloetzchen-Stil: Dinge des Museums (Ticket 198, Schritt 4c, Teil Museum): Vitrinen, Bilder, Statue, Reliquien, VIP-Auslagen, Laser. register(KL) traegt Bauer fuer Szenario-Teile ein, fn(k, o) je Bild mit
   k.dbrick(mx, mz, y0, sx, sy, sz, drehung, farbe, leuchten) (Mitte in Weltpixeln, Unterkante y0, sx laenge entlang der Drehung). 'good:art' gilt vor 'good' (o.n ist die Unterart). o.rc ist das Rechteck [x, y, w, h],
   o.done heisst genommen: dann bleibt ein dunkler Sockel oder Rahmen. Dazu laser (o.x0..y1, o.on, o.f Puls). Die Vitrine (vit) teilt sich der Juwelier, hier die Fassung fuer beide. */
const hood = (k, r, t, h, col) => {
  const cx = r[0] + r[2] / 2, cz = r[1] + r[3] / 2;
  k.dbrick(cx, cz, t, r[2] - 4, 2.5, r[3] - 4, 0, 0x30343c); // Sockel
  for (const [dx, dz, sx, sz] of [[-1, 0, 1.6, r[3] - 5], [1, 0, 1.6, r[3] - 5], [0, -1, r[2] - 5, 1.6], [0, 1, r[2] - 5, 1.6]]) k.dbrick(cx + dx * (r[2] / 2 - 3), cz + dz * (r[3] / 2 - 3), t + 2.5, sx, h, sz, 0, col || 0xb8e3f4); // Glaswaende als helle Rahmen
  k.dbrick(cx, cz, t + 2.5 + h, r[2] - 4, 1.8, r[3] - 4, 0, 0xcfeaf6);
};
export function register(KL) {
  KL.obj('vit', (k, o) => { const r = o.rc, t = k.topAt(r[0] + r[2] / 2, r[1] + r[3] / 2); if (o.done) { k.dbrick(r[0] + r[2] / 2, r[1] + r[3] / 2, t, r[2] - 6, .5, r[3] - 6, 0, 0x10080c); return } hood(k, r, t, 9); k.dbrick(r[0] + r[2] / 2, r[1] + r[3] / 2, t + 2.5, 8, 4, 5, 0, 0xd9b440, .25) });
  KL.obj('good:art', (k, o) => { const r = o.rc, cx = r[0] + r[2] / 2, cz = r[1] + r[3] / 2, a = r[2] >= r[3] ? 0 : Math.PI / 2, L = Math.max(r[2], r[3]) - 4;
    if (o.done) { k.dbrick(cx, cz, 14, L, 14, 2, a, 0x2f2a24); return }
    k.dbrick(cx, cz, 12, L, 20, 3, a, 0x8a5a2c); k.dbrick(cx, cz, 14, L - 6, 16, 3.6, a, [0xc9a24a, 0x3c7a9a, 0xb5503a, 0x4f9a5a][(Math.round(cx / 32) + Math.round(cz / 32)) & 3]) }); // Rahmen und Leinwand
  KL.obj('good:statue', (k, o) => { const r = o.rc, cx = r[0] + r[2] / 2, cz = r[1] + r[3] / 2;
    k.dbrick(cx, cz, 0, 24, 8, 24, 0, 0x7f7a84); if (o.done) return;
    k.dbrick(cx, cz, 8, 12, 14, 9, 0, 0xcfc8bc); k.dbrick(cx, cz, 22, 8, 10, 8, 0, 0xcfc8bc); k.dbrick(cx, cz, 32, 8, 8, 8, 0, 0xe5dfd2); k.dbrick(cx + 7, cz, 16, 3, 8, 3, 0, 0xcfc8bc); k.dbrick(cx - 7, cz, 16, 3, 8, 3, 0, 0xcfc8bc) });
  for (const n of ['relic', 'vip']) KL.obj('good:' + n, (k, o) => { const r = o.rc, cx = r[0] + r[2] / 2, cz = r[1] + r[3] / 2, t = k.topAt(cx, cz); if (o.done) { k.dbrick(cx, cz, t, r[2] - 6, .5, r[3] - 6, 0, 0x10080c); return } hood(k, r, t, 12);
    if (n === 'relic') { k.dbrick(cx, cz, t + 2.5, 8, 6, 8, 0, 0xd9b440, .2); k.dbrick(cx, cz, t + 8.5, 4, 5, 4, 0, 0xc4402f, .25) } else { k.dbrick(cx - 4, cz, t + 2.5, 6, 3, 6, 0, 0xe8e8f0, .3); k.dbrick(cx + 4, cz, t + 2.5, 6, 5, 6, 0, 0x3ac4d9, .3) } });
  // Laser: Sender an beiden Enden, Strahl als duenner leuchtender Klotz in Knie bis Huefthoehe, aus nur ein matter Strich
  KL.obj('laser', (k, o) => {
    const H = k.C.scen.laserH, L = Math.hypot(o.x1 - o.x0, o.y1 - o.y0), a = Math.atan2(o.y1 - o.y0, o.x1 - o.x0), mx = (o.x0 + o.x1) / 2, mz = (o.y0 + o.y1) / 2;
    for (const [x, y] of [[o.x0, o.y0], [o.x1, o.y1]]) { k.dbrick(x, y, 0, 6, H + 4, 6, 0, o.on ? 0xcc3333 : 0x555566); if (o.on) k.dbrick(x, y, H + 4, 4, .8, 4, 0, 0xff4040, 1) }
    if (L < .5) return; if (o.on) { k.dbrick(mx, mz, H - .8, L, 1.6, 1.6, a, 0xff6e78, .6 + o.f); k.dbrick(mx, mz, H - 2.4, L, .6, 4.8, a, 0xff2832, .25 * o.f) } else k.dbrick(mx, mz, H - .5, L, .6, 1, a, 0x969aaa);
  });
}
