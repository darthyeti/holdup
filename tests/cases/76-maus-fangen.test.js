// Maus fangen (MLOCK, Option in den Optionen, Taste F): Pointer Lock im laufenden Spiel, virtueller Zeiger aus movementX/Y, Esc pausiert, Menues geben frei.
// Headless Chromium sperrt keinen Zeiger, deshalb ersetzt ein Stub requestPointerLock, exitPointerLock und document.pointerLockElement (das Spiel prueft nur diese drei Dinge).
const STUB = () => {
  const cv = document.getElementById('c');
  const st = window.__pl = { locked: false, calls: 0, focus: true };
  const fire = () => document.dispatchEvent(new Event('pointerlockchange'));
  Object.defineProperty(document, 'pointerLockElement', { get: () => (st.locked ? cv : null), configurable: true });
  document.hasFocus = () => st.focus;
  HTMLCanvasElement.prototype.requestPointerLock = function () { st.calls++; st.locked = true; fire(); return Promise.resolve(); };
  document.exitPointerLock = () => { if (st.locked) { st.locked = false; fire(); } };
  // der Browser loest die Sperre bei Esc selbst, ohne dass das Spiel die Taste sieht
  st.escape = () => { st.locked = false; fire(); };
};

module.exports = [
  {
    name: 'Maus fangen: Option in den Optionen (F), wird gemerkt, Voreinstellung aus',
    async run(t) {
      const p = t.page;
      t.eq(await p.evaluate(() => __dbg.plock().on), false, 'Voreinstellung aus');
      await p.keyboard.press('Escape'); await p.keyboard.press('o');
      await p.keyboard.press('f');
      t.eq(await p.evaluate(() => ({ on: __dbg.plock().on, ls: localStorage.getItem('holdup.lock') })), { on: true, ls: '1' }, 'F schaltet ein und merkt es');
      await p.keyboard.press('f');
      t.eq(await p.evaluate(() => ({ on: __dbg.plock().on, ls: localStorage.getItem('holdup.lock') })), { on: false, ls: '0' }, 'F schaltet aus');
    },
  },
  {
    name: 'Maus fangen: sperrt auf Klick und Taste, virtueller Zeiger, Esc pausiert, Pause und Optionen geben frei',
    async run(t) {
      const p = t.page;
      await p.evaluate(STUB);
      // Option an, im Spiel
      await p.keyboard.press('Escape'); await p.keyboard.press('o'); await p.keyboard.press('f'); await p.keyboard.press('Escape');
      let s = await p.evaluate(() => ({ pl: __dbg.plock(), st: window.__pl.locked, calls: window.__pl.calls }));
      t.eq([s.pl.on, s.pl.paused, s.st, s.calls], [true, true, false, 0], 'Pause mit Option an sperrt nicht');
      // Weiter per Taste P: die Taste ist eine Eingabe, das Spiel sperrt
      await p.keyboard.press('p');
      s = await p.evaluate(() => ({ pl: __dbg.plock(), calls: window.__pl.calls }));
      t.eq([s.pl.paused, s.pl.held, s.calls], [false, true, 1], 'Weiter sperrt den Zeiger');
      t.ok(s.pl.sx > 0 && s.pl.sx < 960 && s.pl.sy > 0 && s.pl.sy < 544, 'ohne bekannte Mausposition startet der Zeiger vor der Figur, nicht in der Ecke: ' + s.pl.sx + ',' + s.pl.sy);
      // virtueller Zeiger: Delta in logischen Pixeln, am Bildrand geklemmt, Fensterposition egal
      const r = await p.evaluate(() => {
        const cv = document.getElementById('c'), box = cv.getBoundingClientRect(), k = 960 / box.width, ky = 544 / box.height, a = { x: __dbg.mouse.sx, y: __dbg.mouse.sy };
        cv.dispatchEvent(new MouseEvent('mousemove', { movementX: 40, movementY: -20, clientX: 5, clientY: 5, bubbles: true }));
        const b = { x: __dbg.mouse.sx, y: __dbg.mouse.sy };
        cv.dispatchEvent(new MouseEvent('mousemove', { movementX: 99999, movementY: 99999, bubbles: true }));
        const c = { x: __dbg.mouse.sx, y: __dbg.mouse.sy };
        cv.dispatchEvent(new MouseEvent('mousemove', { movementX: -99999, movementY: -99999, bubbles: true }));
        return { a, b, c, d: { x: __dbg.mouse.sx, y: __dbg.mouse.sy }, k, ky };
      });
      t.ok(Math.abs(r.b.x - Math.min(960, Math.max(0, r.a.x + 40 * r.k))) < 1e-6 && Math.abs(r.b.y - Math.min(544, Math.max(0, r.a.y - 20 * r.ky))) < 1e-6, 'Delta wird auf logische Pixel umgerechnet: ' + JSON.stringify(r));
      t.eq([r.c.x, r.c.y], [960, 544], 'rechts unten geklemmt');
      t.eq([r.d.x, r.d.y], [0, 0], 'links oben geklemmt');
      // Esc: Browser loest die Sperre, das Spiel pausiert (auch ohne die Taste zu sehen)
      await p.evaluate(() => window.__pl.escape());
      s = await p.evaluate(() => __dbg.plock());
      t.eq([s.paused, s.held], [true, false], 'Sperre weg ergibt Pause');
      // Weiter per Klick: die Pause-Kachel bekommt den Klick, dieselbe Eingabe sperrt neu
      await p.keyboard.press('p');
      t.eq(await p.evaluate(() => [__dbg.plock().held, window.__pl.calls]), [true, 2], 'erneut gesperrt');
      // Pause per Esc-Taste (das Spiel sieht sie, zum Beispiel wenn der Browser nicht sperrt): der Tick gibt die Sperre frei
      await p.keyboard.press('Escape');
      await p.evaluate(() => __dbg.tick(1 / 30));
      s = await p.evaluate(() => ({ pl: __dbg.plock(), st: window.__pl.locked }));
      t.eq([s.pl.paused, s.pl.held, s.st], [true, false, false], 'Pause gibt den Zeiger frei, damit die Kacheln klickbar sind');
      // Optionen aus: Weiter sperrt nicht mehr
      await p.keyboard.press('o'); await p.keyboard.press('f'); await p.keyboard.press('Escape');
      const before = await p.evaluate(() => window.__pl.calls);
      await p.keyboard.press('p');
      s = await p.evaluate(() => ({ pl: __dbg.plock(), calls: window.__pl.calls }));
      t.eq([s.pl.on, s.pl.paused, s.pl.held, s.calls - before], [false, false, false, 0], 'Option aus sperrt nie');
    },
  },
  {
    name: 'Maus fangen: Fokusverlust pausiert nicht doppelt, Klick ins Bild sperrt',
    async run(t) {
      const p = t.page;
      await p.evaluate(STUB);
      await p.keyboard.press('Escape'); await p.keyboard.press('o'); await p.keyboard.press('f'); await p.keyboard.press('Escape'); await p.keyboard.press('p');
      t.eq(await p.evaluate(() => __dbg.plock().held), true, 'gesperrt');
      // Alt-Tab: das Fenster hat keinen Fokus, die Sperre geht verloren, aber es wird nicht zusaetzlich pausiert
      await p.evaluate(() => { window.__pl.focus = false; window.__pl.escape(); });
      let s = await p.evaluate(() => __dbg.plock());
      t.eq([s.paused, s.held], [false, false], 'Fokusverlust: nur die Sperre geht');
      await p.evaluate(() => { window.__pl.focus = true; });
      // Klick ins Bild sperrt wieder (und schiesst, wie bisher)
      const box = await p.evaluate(() => { const b = document.getElementById('c').getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; });
      await p.mouse.click(box.x, box.y);
      s = await p.evaluate(() => ({ pl: __dbg.plock(), calls: window.__pl.calls }));
      t.eq([s.pl.held, s.calls], [true, 2], 'Klick ins Bild sperrt');
    },
  },
];
