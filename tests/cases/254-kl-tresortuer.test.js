// Kloetzchen-Stil, Tresortuer offen (Ticket 254): das Blatt schwenkt ganz auf und liegt flach an der Mauer neben der Oeffnung auf der Gangseite, nichts mehr mitten im Gang. Reiner Bauer-Test ohne Browser:
// ein Test-Kit (T, E.cellAt, dbrick) faengt die Kloetze ab, alle vier Lagen (Tuer waagrecht oder senkrecht, Richtung 1 und -1) und beide Seiten (Mauer nur nach Norden oder nur nach Sueden).
const path = require('path'), { pathToFileURL } = require('url');
const lib = require('../lib');
module.exports = [{
  name: 'Tresortuer offen: das Blatt liegt in allen vier Lagen flach an der Mauer (1,5 vor der Flaeche, 6 dick, hoch), nur auf Mauerkacheln, nicht in der Oeffnung und nicht im Gang; geschlossen unveraendert',
  async run(t) {
    const K = await import(pathToFileURL(path.join(lib.ROOT, 'js', 'kl-kern.js')).href), T = 32, bad = [], seen = [];
    for (const h of [0, 1]) for (const dir of [1, -1]) for (const side of ['N', 'S']) {
      const tx = 10, ty = 10, wallTiles = new Set(); // Tuer an Kachel (tx, ty), zwei Kacheln lang (entlang v), die Mauer laeuft entlang v
      const add = (a, b) => wallTiles.add(h ? b + ',' + a : a + ',' + b);   // (u-Kachel, v-Kachel)
      for (let i = 1; i <= 3; i++) add(tx, side === 'N' ? ty - i : ty + 1 + i);
      const bricks = [], k = { T, E: { cellAt: (x, y) => wallTiles.has(x + ',' + y) ? '#' : '.' }, C: { cells: {}, scen: {} }, dbrick: (x, z, y0, sx, sy, sz, a, col, em) => bricks.push({ x, z, y0, sx, sy, sz, col, em }) };
      const o = { x: tx * T, y: ty * T, h, dir, open: 1 }; K.KL.objs.vault(k, o);
      // Blatt: die hohen, breiten Stuecke (Hoehe >= 50, nicht die Pfosten mit 62 am Rand der Oeffnung)
      const faceU = dir > 0 ? tx * T : tx * T + T; const u = b => h ? [b.z - 0, b.sz] : [b.x, b.sx], v = b => h ? [b.x, b.sx] : [b.z, b.sz];
      const leaf = bricks.filter(b => b.sy === 56 && b.col === 0x8d97a6); if (leaf.length !== 1) { bad.push('h' + h + ' d' + dir + side + ': ' + leaf.length + ' Blaetter'); continue; }
      const L = leaf[0], [uc, uw] = u(L), [vc, vw] = v(L), vlo = vc - vw / 2, vhi = vc + vw / 2;
      const outer = dir > 0 ? faceU - (uc + uw / 2) : (uc - uw / 2) - faceU;   // Abstand der Mauerseite des Blattes zur Mauerflaeche, positiv zum Gang
      const gap = dir > 0 ? faceU - (uc + uw / 2) : (uc - uw / 2) - faceU;
      if (!(gap > .5 && gap < 3)) bad.push('h' + h + ' d' + dir + side + ': Abstand zur Mauer ' + gap.toFixed(2));
      if (Math.abs(uw - 6) > .01) bad.push('h' + h + ' d' + dir + side + ': Dicke ' + uw);
      const door0 = (h ? tx : ty) * T; void door0; const vd0 = ty * T * (h ? 0 : 1) + (h ? tx * T : 0), vd1 = vd0 + 2 * T; // Oeffnung entlang v
      const vopen0 = (h ? o.x : o.y), vopen1 = vopen0 + 2 * T;
      const inOpening = vhi > vopen0 + .01 && vlo < vopen1 - .01; if (inOpening) bad.push('h' + h + ' d' + dir + side + ': Blatt ragt in die Oeffnung');
      // liegt entlang der Mauer, nur ueber Mauerkacheln
      const inWallRun = side === 'N' ? (vlo >= vopen0 - 3 * T - .01 && vhi <= vopen0) : (vlo >= vopen1 && vhi <= vopen1 + 3 * T + .01); if (!inWallRun) bad.push('h' + h + ' d' + dir + side + ': Blatt ueber der Mauer hinaus ' + vlo + '..' + vhi);
      seen.push([h, dir, side, Math.round(gap * 10) / 10, Math.round((vhi - vlo) * 10) / 10]);
    }
    t.note(JSON.stringify(seen)); t.eq(bad, [], 'Abweichungen');
    // geschlossen: die Tuer hat weiter ihr Handrad (Gold) und keinen Blatt-Block am Gang
    const cl = []; K.KL.objs.vault({ T, E: { cellAt: () => '.' }, C: { cells: {}, scen: {} }, dbrick: (x, z, y0, sx, sy, sz, a, col) => cl.push(col) }, { x: 320, y: 320, h: 0, dir: 1, open: 0 });
    t.ok(cl.includes(0xe8b923) && cl.length >= 8, 'geschlossen: Handrad und Platte wie vorher (' + cl.length + ' Kloetze)');
  },
}];
