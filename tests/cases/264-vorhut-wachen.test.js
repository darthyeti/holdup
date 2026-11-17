// Ticket 264 (Coop-Log build 334, Seed 2661): Beim Geldtransporter mit Vorhut liefen die zwei ausgestiegenen Wachen des Begleitwagens zu Beginn des Zugriffs davon. Ursache: covCenter (Deckungs-KI)
// nahm als Mitte immer den Panzerwagen, der zu dem Zeitpunkt noch am westlichen Kartenrand wartet oder anrollt, die Vorhut-Wachen (vg) liefen deshalb ueber die ganze Karte nach Westen. Jetzt gilt fuer sie
// der Begleitwagen (vh, solange er steht) als Mitte. Pruefung: nach dem Halt der Vorhut bleiben die vg-Wachen in 25 s alle innerhalb von 12 Kacheln des Begleitwagens, auch wenn der Panzerwagen erst spaeter kommt.
const FIND = `(pred, n) => { const D = __dbg, out = []; D.setScenario('truck'); D.setSeedMode('random'); D.setLage([]); for (let sd = 1; sd < 800 && out.length < n; sd++) { const m = D.genTruckMission(sd); if (pred(m)) out.push(sd); } return out; }`;
const BUILD = `(sd) => { const D = __dbg; D.sessReset(); D.setScenario('truck'); D.setSeedMode('random'); D.setLage([]); D.setTurn('S'); D.buildSeed(sd); D.CFG.policeAt = 26; D.CFG.policeForced = 20; const g = D.get(); for (const b of D.bars().filter(x => x.rd && x.g === 0)) { b.lv = 1; b.hp = 100; } return { D, g, me: g.me }; }`;
module.exports = [
  {
    name: 'Transporter-Vorhut: die ausgestiegenen Wachen des Begleitwagens bleiben bei ihm (hoechstens 12 Kacheln), sie laufen nicht zum noch wartenden Panzerwagen am Kartenrand (Seed 2661 und zwei weitere)',
    async run(t) {
      await t.loadTool('loopnet.js');
      const r = await t.page.evaluate(`(() => { const o = { rows: [] }, seeds = [2661].concat((${FIND})(m => m.vorhut && !m.panne, 2));
        for (const sd of seeds) { const { D, g, me } = (${BUILD})(sd), bb = D.bars().find(x => x.rd && x.g === 0), hold = [bb.cells[0][0] * 32 + 64 + 16, 8 * 32 + 16]; let tStop = -1, maxD = 0, n = 0, tkAt = null;
          for (let i = 0; i < 30 * 140; i++) { me.hp = 1e9; me.x = hold[0]; me.y = hold[1]; D.update(1 / 30); const vh = D.vh(); if (!vh) break;
            if (tStop < 0 && vh.st === 'stopped') tStop = i / 30;
            if (tStop >= 0 && i / 30 < tStop + 25) { const vg = g.en.filter(e => e.vg && e.hp > 0); n = Math.max(n, vg.length); for (const e of vg) maxD = Math.max(maxD, Math.hypot(e.x - vh.x, e.y - vh.y)); if (!tkAt && D.tk() && D.tk().st !== 'wait' && D.tk().st !== 'drive') tkAt = i / 30 }
            if (tStop >= 0 && i / 30 > tStop + 26) break; }
          o.rows.push([sd, Math.round(tStop), n, Math.round(maxD)]); }
        return o; })()`);
      t.note('Seed, Halt der Vorhut (s), Wachen, groesster Abstand zum Begleitwagen (px): ' + JSON.stringify(r.rows));
      t.ok(r.rows.length === 3 && r.rows.every(q => q[1] >= 0 && q[2] === 2), 'die Vorhut haelt und zwei Wachen steigen aus: ' + JSON.stringify(r.rows));
      t.ok(r.rows.every(q => q[3] <= 12 * 32), 'die Wachen bleiben innerhalb von 12 Kacheln beim Begleitwagen: ' + r.rows.map(q => q[3]));
    },
  },
];
