// Kloetzchen-Stil: Tresor (Ticket 198, Eilauftrag Tresor). Bei geschlossenem Tresor steht ein Tuerblatt in der Oeffnung, bei offenem (vaultOpen) ist der Durchgang frei und das Blatt liegt aufgeschwenkt an der Wand,
// die Geldbuendel sind gross (Stapel, mindestens 20 Weltpixel breit, 15 hoch). Kein Pixelvergleich. Ohne WebGL 2 uebersprungen.
const { glPage } = require('../glshare');   // gemeinsamer WebGL-Browser (tests/glshare.js)
module.exports = [{
  name: 'Kloetzchen Tresor: geschlossen steht ein Tuerblatt im Durchgang, offen ist er frei (Blatt an der Wand), Geldbuendel gross als Stapel',
  timeout: 200000,
  async run(t) {
    const P = await glPage(t); if (!P) return;
    try {
      const r = await P.page.evaluate(`(async () => { const D = __dbg, T = 32; await D.view3d.set(true);
        D.setScenario('bank'); D.setSeedMode('random'); D.setLage([]); D.setTurn('S'); D.buildSeed(5); for (let i = 0; i < 20; i++) { D.get().me.hp = 1e9; D.update(1 / 30); }
        const v = D.LAY().vault, h = v.o === 'h', X0 = v.door[0] * T, Y0 = v.door[1] * T;
        // Durchgang: Streifen quer zur Wand (3 Pixel um die Wandlinie, ueber die Oeffnung von 2 Kacheln, ohne die Pfosten an den Enden)
        const pl = v.dir < 0 ? T : 0, pass = h ? { x0: X0 + 4, x1: X0 + 2 * T - 4, z0: Y0 + pl - 3, z1: Y0 + pl + 3 } : { x0: X0 + pl - 3, x1: X0 + pl + 3, z0: Y0 + 4, z1: Y0 + 2 * T - 4 };
        const blocks = () => { D.draw(); D.draw(); return D.view3d.V.kl().dingeList().filter(q => q[4] >= 20 && Math.abs(q[0] - (pass.x0 + pass.x1) / 2) < (pass.x1 - pass.x0) / 2 + q[3] / 2 && Math.abs(q[1] - (pass.z0 + pass.z1) / 2) < (pass.z1 - pass.z0) / 2 + q[5] / 2).length; };
        const out = { h, closed: blocks(), vo0: D.get().vaultOpen };
        const it = D.get().its.find(i => i.t === 'vault'); it.act(D.get().me); D.update(1 / 30); out.vo1 = D.get().vaultOpen; out.open = blocks();
        const bun = D.get().its.filter(i => i.t === 'bundle' && !i.done); const b0 = bun[0], mm = D.get().me; mm.x = b0.x - 40; mm.y = b0.y + 20; mm.vx = mm.vy = 0; D.update(1 / 30); D.draw(); D.draw(); const bl = D.view3d.V.kl().dingeList();
        out.bundles = bun.length; const near = bl.filter(q => bun.some(b => Math.abs(q[0] - b.x) < 14 && Math.abs(q[1] - b.y) < 10)); out.bw = Math.max(0, ...near.map(q => Math.max(q[3], q[5]))); out.bh = Math.max(0, ...near.map(q => q[2] + q[4]));
        out.err = D.view3d.V.info().err; await D.view3d.set(false); return out; })()`);
      t.note(JSON.stringify(r));
      t.ok(r.err === '', 'keine Fehler ' + r.err);
      t.ok(r.vo0 === false && r.vo1 === true, 'Tresor war zu und ist nach dem Oeffnen offen');
      t.ok(r.closed > 0, 'geschlossen: ein Tuerblatt steht im Durchgang (' + r.closed + ')');
      t.eq(r.open, 0, 'offen: kein Koerper im Durchgang');
      t.ok(r.bundles > 0 && r.bw >= 20 && r.bh >= 15, 'Geldbuendel gross: ' + r.bundles + ' Stueck, Breite ' + r.bw + ', Hoehe ' + r.bh);
      if (P.page.errors.length) t.ok(false, 'JS-Fehler: ' + P.page.errors.slice(0, 2).join(' | '));
    } finally { await P.done(); }
  },
}];
