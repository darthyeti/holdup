// Gefaengnis, Issue 73 (Tills Log vom 2. November 2026): Die Schluesselkarte der Trakt-Wache (Objekt crd, gezeichnetes Kartensymbol) wurde auch gezeichnet, wenn ihre Stelle im Nebel lag (Gefangener in der Zelle sah die Karte der Wache durch die Wand). Jetzt nur bei Sicht (los vom Spieler), auf Host und Client gleich.
const HELP = `(() => {
  const G = CT.mkGame('prison', 5, 2, 60, 20), A = G.A, B = G.clients[0], T = 32;
  const both = sec => { for (let i = 0; i < Math.round(sec * 60); i++) { A.get().players.forEach(p => { p.hp = 100; p.dead = false; }); step(G.insts, G.net, 1 / 60); } };
  // zaehlt, wie oft das gruene Kartensymbol (9x6 Pixel bei x+6, y-10) beim Zeichnen gemalt wird
  const cardDraws = (D, cc) => { const ctx = D.cv.getContext('2d'), orig = ctx.fillRect; let n = 0;
    ctx.fillRect = function (x, y, w, h) { if (this.fillStyle === '#7ee34a' && w === 9 && h === 6 && Math.abs(x - (cc.x + 6)) < 0.5 && Math.abs(y - (cc.y - 10)) < 0.5) n++; return orig.apply(this, arguments); };
    D.draw(); ctx.fillRect = orig; return n; };
  return { G, A, B, T, both, cardDraws };
})()`;
module.exports = [
  {
    name: 'Gefaengnis-Nebel: die Schluesselkarte der Wache wird nur gezeichnet, wenn sie fuer den Spieler sichtbar ist (Gefangener in der Zelle: nicht, mit Sicht: ja), Host und Client gleich',
    timeout: 120000,
    async run(t) {
      await t.loadTool('loopnet.js'); await t.loadInpage('coop.js');
      const r = await t.page.evaluate(`(() => {
        const H = ${HELP}, A = H.A, B = H.B, o = {}, R = A.LAY().prison;
        for (const D of [A, B]) { const cc = D.get().its.find(i => i.t === 'crd'), me = D.get().me; o[D.name] = {}; o[D.name].has = !!cc;
          const keep = [me.x, me.y]; const z = R.cell; me.x = (z[0] + .5) * H.T; me.y = (z[1] + .5) * H.T;
          const far = !D.los(me.x, me.y, cc.x, cc.y); o[D.name].far = far; o[D.name].hidden = H.cardDraws(D, cc);
          me.x = cc.x; me.y = cc.y + 40; if (!D.los(me.x, me.y, cc.x, cc.y)) me.y = cc.y - 40; o[D.name].near = D.los(me.x, me.y, cc.x, cc.y); o[D.name].shown = H.cardDraws(D, cc); me.x = keep[0]; me.y = keep[1]; }
        return o; })()`);
      for (const k of ['a', 'c1']) {
        t.ok(r[k] && r[k].has, k + ': Karte vorhanden');
        t.ok(r[k].far && r[k].near, k + ': Zelle ohne Sicht auf die Karte, Standpunkt neben der Wache mit Sicht');
        t.eq(r[k].hidden, 0, k + ': ohne Sicht wird die Karte nicht gezeichnet');
        t.ok(r[k].shown >= 1, k + ': mit Sicht wird sie gezeichnet');
      }
    },
  },
];
