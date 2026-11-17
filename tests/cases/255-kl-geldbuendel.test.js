// Kloetzchen-Stil, Geldbuendel (Ticket 255): oben ein erkennbarer Schein (Rand, Medaillon, Wertzahlen, Banderole mit Stempel) aus Kloetzen statt einer flaechigen gruenen Platte. Bauer-Test ohne Browser (Test-Kit faengt die Kloetze ab).
const path = require('path'), { pathToFileURL } = require('url');
const lib = require('../lib');
module.exports = [{
  name: 'Geldbuendel: drei Stapel mit Banderole und oben ein Schein aus Kloetzen (Rand, Medaillon, Ecken, Stempel), keine einfarbige Deckplatte mehr, Schein liegt auf dem obersten Stapel',
  async run(t) {
    const K = await import(pathToFileURL(path.join(lib.ROOT, 'js', 'kl-kern.js')).href), bricks = [];
    const k = { T: 32, E: { cellAt: () => '.' }, C: { cells: {}, scen: {} }, X: {}, dbrick: (x, z, y0, sx, sy, sz, a, col, em) => bricks.push({ x, z, y0, sx, sy, sz, a, col, em: em || 0 }) };
    K.KL.objs.bundle(k, { x: 100, y: 100 });
    const top = Math.max(...bricks.map(b => b.y0 + b.sy)), onTop = bricks.filter(b => b.y0 >= 18 - .01), cols = new Set(onTop.map(b => b.col));
    t.ok(bricks.length >= 20, 'viele Kloetze (' + bricks.length + ')');
    t.ok(onTop.length >= 12 && cols.size >= 4, 'oben mehrere Teile in mindestens vier Farben (' + onTop.length + ' Teile, ' + cols.size + ' Farben): Schein, Rand, Medaillon, Banderole, Stempel');
    t.ok(!bricks.some(b => b.col === 0x7ee34a), 'die flaechige leuchtende Deckplatte (0x7ee34a) ist weg');
    t.ok(bricks.some(b => b.col === 0xd8321f) && bricks.some(b => b.col === 0xf6f0d6), 'Stempel (rot) und Banderole (hell) vorhanden');
    t.ok(top < 22, 'der Schein sitzt auf dem obersten Stapel (Oberkante ' + top.toFixed(1) + ')');
    const bill = onTop.find(b => b.col === 0xcfe9b6); t.ok(bill && bill.sx > 20 && bill.sz > 12 && bill.sy < 1, 'der Schein selbst ist eine flache helle Platte von rund 24 mal 14');
  },
}];
