/* Kloetzchen-Stil: Dinge des Juweliers (Ticket 198 Schritt 4a, Auslage Ticket 256). Die Vitrine (vit) und das VIP-Stueck (good:vip) baut js/kl-dinge-museum.js (passend fuer Museum und Juwelier),
   damit nicht der zuletzt geladene Bauer gewinnt. Tresor, Tastenfeld und Beute des Juweliers laufen ueber die allgemeinen Bauer (js/kl-dinge-allgemein.js, Moebel js/kl-dinge-bank.js).
   Hier steht der Inhalt der Juwelier-Vitrine: KL.jewelry(k, r, t, leer) wird von der Vitrine aufgerufen (r Rechteck [x, y, w, h], t Oberkante des Sockels). Vier Schmuckarten, fest je Vitrine
   nach einem Hash ihrer Lage: Ringe auf Kissen, Ketten auf Bueste, Uhren, Edelsteine auf Samt. Gold und Silber glaenzen metallisch (kleine Leuchtwerte nur als Glanz), Steine sind klare
   Farben mit mittlerem Leuchten, keine bunten Kugeln. Leer (genommen): dieselbe Vitrine, das Polster flach und dunkel, Ringe, Uhren und Steine fehlen, nur die Bueste stehen nackt da. */
const GOLD = 0xe3b53a, SILVER = 0xd3dae4, DIA = 0xe4f6ff, SAPH = 0x2a58cc, RUBY = 0xc9223c, EMER = 0x1f9c5c;
const rot = (x, z, a) => [x * Math.cos(a) - z * Math.sin(a), x * Math.sin(a) + z * Math.cos(a)];
// ein Quader relativ zur Mitte (cx, cz) des Stuecks, mit dessen Drehung a
const at = (k, cx, cz, a) => (dx, dz, y0, sx, sy, sz, col, em, da) => { const p = rot(dx, dz, a); k.dbrick(cx + p[0], cz + p[1], y0, sx, sy, sz, a + (da || 0), col, em) };

// Ring: vier Stege um ein Loch, auf einer Seite der Stein
const ring = (k, x, z, y, a, stone, full) => { if (!full) return; const b = at(k, x, z, a);
  b(0, -2, y, 5, 1.4, 1.1, GOLD, .12); b(0, 2, y, 5, 1.4, 1.1, GOLD, .12); b(-2, 0, y, 1.1, 1.4, 3, GOLD, .12); b(2, 0, y, 1.1, 1.4, 3, GOLD, .12);
  if (full) { b(0, -2, y + 1.4, 2.4, .9, 1.6, SILVER, .1); b(0, -2, y + 2.3, 2, 1.6, 2, stone, .55, .4) } };
// Kette auf der Buste: Hals und Schulter in dunklem Samt, Goldkette als Kragen, Anhaenger vorn
const bust = (k, x, z, y, a, stone, full) => { const b = at(k, x, z, a);
  b(0, 0, y, 7, 1.2, 4.2, 0x383a42); b(0, 0, y + 1.2, 3.4, 2.6, 3.4, 0x383a42); b(0, 0, y + 3.8, 2.6, .8, 2.6, 0x4a4d57);
  if (full) { b(0, -1.9, y + 1.2, 5.6, .8, .9, GOLD, .12); b(-2.7, -.9, y + 1.2, .9, .8, 2.4, GOLD, .12); b(2.7, -.9, y + 1.2, .9, .8, 2.4, GOLD, .12); b(0, -2.7, y + .4, 1.8, 1.8, 1, stone, .55, .4) } };
// Uhr: Armband liegt als Schlaufe, Gehaeuse in Silber mit hellem Zifferblatt und goldener Krone
const watch = (k, x, z, y, a, full) => { if (!full) return; const b = at(k, x, z, a);
  b(0, 0, y, 2.6, .8, 11, 0x2b2429); b(0, 0, y + .8, 1.6, .3, 11.4, 0x3b3036);                           // Armband (dunkles Leder) mit Naht
  b(0, 0, y + .8, 5.6, 1.6, 5.6, GOLD, .15); b(0, 0, y + 2.4, 4.4, .6, 4.4, SILVER, .12); b(0, 0, y + 3, 3.2, .4, 3.2, 0x14181f); b(0, -.9, y + 3.2, .6, .2, 1.8, 0xfff3c4, .7); b(.9, 0, y + 3.2, 1.8, .2, .6, 0xfff3c4, .7); b(3.1, 0, y + 1, 1, .9, 1, GOLD, .15) };
// Edelstein auf Samt: Unterteil und Tafel, klare Farbe
const gem = (k, x, z, y, a, col, s, full) => { if (!full) return; const b = at(k, x, z, a);
  b(0, 0, y, 5.2 * s, .5, 5.2 * s, SILVER, .12);                                                          // Fassung
  b(0, 0, y + .5, 4 * s, 1.1 * s, 4 * s, col, .5, .4); b(0, 0, y + .5 + 1.1 * s, 2.8 * s, 1 * s, 2.8 * s, col, .8, .8); b(0, 0, y + .5 + 2.1 * s, 1.4 * s, .8 * s, 1.4 * s, 0xffffff, 1.1, .2) };
const KINDS = [
  { velvet: 0x2f3f9a, step: 9, put: (k, x, z, y, n, full) => ring(k, x, z, y, .3 * (n % 3), [DIA, SAPH, RUBY, EMER][n % 4], full) },
  { velvet: 0x4a3a52, step: 11, put: (k, x, z, y, n, full) => bust(k, x, z, y, 0, [RUBY, DIA, SAPH][n % 3], full) },
  { velvet: 0x3a3f4a, step: 10, put: (k, x, z, y, n, full) => watch(k, x, z, y, (n % 2) * Math.PI / 2 * 0, full) },
  { velvet: 0x8a1f44, step: 8, put: (k, x, z, y, n, full) => gem(k, x, z, y, .4 * (n % 3), [DIA, SAPH, RUBY, EMER, DIA][n % 5], n % 3 === 0 ? 1.25 : 1, full) },
];
export const jewelry = (k, r, t, empty) => {
  const cx = r[0] + r[2] / 2, cz = r[1] + r[3] / 2, h = (Math.imul(Math.round(cx / 7), 73856093) ^ Math.imul(Math.round(cz / 7), 19349663)) >>> 0, K = KINDS[h % KINDS.length], full = !empty,
    nx = Math.max(1, Math.floor((r[2] - 6 - K.step / 4) / K.step)), nz = Math.max(1, Math.floor((r[3] - 6) / K.step)), t2 = t + 4.1;
  k.dbrick(cx, cz, t + 2.5, r[2] - 7, 1.6, r[3] - 7, 0, empty ? 0x17101a : K.velvet);                      // Polster (leer: flach und dunkel)
  for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) { const x = cx - (nx - 1) * K.step / 2 + i * K.step, z = cz - (nz - 1) * K.step / 2 + j * K.step; K.put(k, x + (j % 2 ? K.step / 4 : 0), z, t2, h + i * 5 + j * 3, full) }
};
export function register(KL) { KL.jewelry = jewelry }
