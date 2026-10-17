// Seitenskript fuer Menue-Tests: Tasten, Mausklicks auf Kacheln, Zustand. Braucht tools/loopnet.js (mkInst).
(function () {
  const k = (d, x, o) => d.cv.dispatchEvent(new KeyboardEvent('keydown', Object.assign({ key: x, bubbles: true }, o || {})));
  const tile = (d, id) => d.ui().tiles().find(q => q.id === id);
  // Klick auf die Mitte einer Kachel (wie Maus: bewegen, druecken, loslassen). frac verschiebt den Klick waagerecht (Regler).
  const click = (d, id, frac) => { const t = tile(d, id); if (!t) throw new Error('keine Kachel ' + id + ' auf ' + d.state().scr + ': ' + d.ui().tiles().map(q => q.id).join(',')); const x = frac == null ? t.x + t.w / 2 : t.x + t.w * frac, y = t.y + t.h / 2; d.ui().move(x, y); d.ui().down(x, y); d.ui().up(x, y); };
  const hover = (d, id) => { const t = tile(d, id); d.ui().move(t.x + t.w / 2, t.y + t.h / 2); };
  const type = (d, s) => { for (const c of s) k(d, c); };
  const adv = (d, s) => { for (let i = 0; i < s * 60; i++) d.tick(1 / 60); };
  const hash = d => { const c = d.cv, x = c.getContext('2d'), a = new Uint32Array(x.getImageData(0, 0, c.width, c.height).data.buffer); let h = 2166136261; for (let i = 0; i < a.length; i += 3) { h ^= a[i]; h = Math.imul(h, 16777619); } return (h >>> 0).toString(16); };
  const shot = (d, out, name) => { d.draw(); d.draw(); out[name] = hash(d); };
  const solo = (net, name) => { const d = mkInst(net, name || 's'); d.toTitle(); d.ui().tiles(); return d; };
  window.MT = { k, tile, click, hover, type, adv, hash, shot, solo };
})();
