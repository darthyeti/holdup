// Gemeinsamer WebGL-Browser fuer alle Tests der 3D-Ansicht (Ticket 198). glPage(t, opts) liefert { page, env, done }.
// Hat die Standard-Seite des Testlaufs WebGL 2 und braucht der Test nichts Besonderes (keine opts), wird sie genommen. Sonst startet der ERSTE Aufruf des ganzen Laufs EINEN Chromium mit SwiftShader
// (lib.launch webgl), den alle weiteren Aufrufe wiederverwenden (je Test ein frischer Kontext mit eigener Seite); run.js schliesst ihn am Ende (closeShared). Grund: Ein eigener Browser je Test
// (Start, Server, Seitenladen) und SwiftShader-Arbeit aus vielen draw() in der Warteschlange liessen in der CI auf zwei Kernen den naechsten page.goto in die 30 Sekunden laufen.
// done() wartet die GPU-Warteschlange ab (gl.finish) und schliesst den Kontext. opts gehen an openGame (zum Beispiel { gfx: 'mittel' }); opts.force erzwingt den eigenen Browser auch bei vorhandenem WebGL 2.
// HOLDUP_GLENV=1 erzwingt ihn immer (so laeuft es in der CI, wo die Standard-Seite kein WebGL 2 hat).
const lib = require('./lib');
let shared = null;
const hasGl = p => p.evaluate(() => { const c = document.createElement('canvas'); return !!c.getContext('webgl2'); });
const settle = page => page.evaluate(() => { try { const V = window.__dbg && __dbg.view3d && __dbg.view3d.V; const c = V && V.el && V.el.getContext('webgl2'); if (c) c.finish() } catch (e) {} }).catch(() => {});
async function glPage(t, opts) {
  const o = Object.assign({}, opts), force = !!o.force || !!process.env.HOLDUP_GLENV; delete o.force;
  const plain = !Object.keys(o).length;
  if (!force && plain && await hasGl(t.page)) return { page: t.page, env: t.env, done: async () => { await settle(t.page) } };
  if (!shared) {
    const env = await lib.launch({ webgl: true });
    shared = { env, ok: null };
  }
  if (shared.ok === false) { t.note('kein WebGL 2 im Test-Chromium (auch nicht mit SwiftShader-Flags), 3D-Teil uebersprungen'); return null }
  const page = await lib.openGame(shared.env, plain ? undefined : o);
  if (shared.ok == null) shared.ok = await hasGl(page);
  if (!shared.ok) { await page.ctx.close().catch(() => {}); t.note('kein WebGL 2 im Test-Chromium (auch nicht mit SwiftShader-Flags), 3D-Teil uebersprungen'); return null }
  return { page, env: shared.env, done: async () => { await settle(page); await page.ctx.close().catch(() => {}) } };
}
// am Ende des Laufs (run.js): den gemeinsamen Browser schliessen
async function closeShared() {
  const s = shared; shared = null; if (!s) return;
  await Promise.race([s.env.browser.close().catch(() => {}), new Promise(r => setTimeout(r, 8000))]); s.env.srv.close();
}
module.exports = { glPage, closeShared, settle };
