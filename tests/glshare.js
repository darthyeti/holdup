// Gemeinsame WebGL-Seite fuer Tests der 3D-Ansicht (Ticket 198). Hat die Standard-Seite des Testlaufs WebGL 2, wird sie genommen. Sonst startet der erste Aufruf EINEN Chromium mit SwiftShader (lib.launch webgl),
// den alle weiteren Aufrufe derselben Datei wiederverwenden (je Test eine frische Seite in diesem Browser); der Aufruf mit last = true schliesst ihn am Ende. Grund: Ein eigener Browser je Test
// (Start, Server, Seitenladen) liess in der CI auf zwei Kernen den naechsten page.goto in die 30 Sekunden laufen. done() wartet ausserdem die GPU-Warteschlange ab (gl.finish), sonst bleibt
// SwiftShader-Arbeit liegen und blockiert den naechsten Test im geteilten Browser. HOLDUP_GLENV=1 erzwingt den eigenen Browser (so laeuft es in der CI, wo die Standard-Seite kein WebGL 2 hat).
const lib = require('./lib');
let shared = null;
const hasGl = p => p.evaluate(() => { const c = document.createElement('canvas'); return !!c.getContext('webgl2'); });
const settle = page => page.evaluate(() => { try { const V = window.__dbg && __dbg.view3d && __dbg.view3d.V; const c = V && V.el && V.el.getContext('webgl2'); if (c) c.finish() } catch (e) {} }).catch(() => {});
async function glPage(t, last) {
  if (!process.env.HOLDUP_GLENV && await hasGl(t.page)) return { page: t.page, done: async () => { await settle(t.page) } };
  if (!shared) {
    const env = await lib.launch({ webgl: true }), probe = await lib.openGame(env);
    if (await hasGl(probe)) shared = { env }; else { await env.browser.close().catch(() => {}); env.srv.close(); shared = { none: true } }
    if (shared.env) await probe.ctx.close().catch(() => {});
  }
  if (shared.none) { t.note('kein WebGL 2, 3D-Teil uebersprungen'); return null }
  const page = await lib.openGame(shared.env);
  return { page, done: async () => {
    await settle(page); await page.ctx.close().catch(() => {});
    if (last) { const s = shared; shared = null; await s.env.browser.close().catch(() => {}); s.env.srv.close() }
  } };
}
module.exports = { glPage, settle };
