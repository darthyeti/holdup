// Kloetzchen-Stil, Spieltische im Casino (Ticket 244): vier Arten (Roulette, Blackjack, Poker, Wuerfel) mit eigener Form und Filzfarbe, voll mit Chipstapeln, abgeraeumt mit dunklem Filz, leerer Ablage und
// umgeworfenem Stuhl. Kein Pixelvergleich, ohne WebGL 2 uebersprungen.
const { glPage } = require('../glshare');
const path = require('path'), { pathToFileURL } = require('url');
const lib = require('../lib');
module.exports = [{
  name: 'Casino-Tische: vier Arten mit eigenem Filz (ueber die Tischlage verteilt), voll (Chips, Glanz) und abgeraeumt (dunkler Filz, Ablage, Stuhl) unterscheiden sich deutlich, ohne Bauer klassisch',
  timeout: 240000,
  async run(t) {
    const P = await glPage(t); if (!P) return;
    try {
      const K = await import(pathToFileURL(path.join(lib.ROOT, 'js', 'kl-kern.js')).href);
      t.ok(K.KL.hasObj('good:chips') && typeof K.KL.casinoTable === 'function', 'Bauer good:chips und Tischart-Wahl da');
      await lib.loadInpage(P.page, 'bild.js');
      const r = await P.page.evaluate(`(async () => { const D = __dbg, o = { kinds: {} }; D.view3d.kstil = 1; const i0 = await D.view3d.set(true); if (i0.state !== 'an') return { i0 };
        for (const sd of [5, 8, 3, 11]) {
          PX.scene('casino', sd); PX.phase('erkundung'); const g = D.get(), me = g.me, V = D.view3d.V, KK = V.kl(), ch = g.its.filter(i => i.t === 'good' && i.k === 'chips'); if (!ch.length) continue;
          for (const i of ch) o.kinds[KK.KL.casinoTable({ rc: i.rc }).n] = 1;
          const cnt = () => ['k-dinge', 'k-dinge-klein'].reduce((a, n) => a + (V.scene.getObjectByName(n) ? V.scene.getObjectByName(n).count : 0), 0);
          const sig = () => ['k-dinge', 'k-dinge-klein'].reduce((a, n) => { const m = V.scene.getObjectByName(n); if (!m) return a; let h = 0; const A = m.instanceMatrix.array, C = m.instanceColor ? m.instanceColor.array : []; for (let i = 0; i < m.count * 16; i++) h += A[i] * ((i % 7) + 1); for (let i = 0; i < m.count * 3; i++) h += C[i] * 13; return a + h; }, 0);
          const c0 = ch[0], sd2 = () => { for (let k = 0; k < 8; k++) { me.x = c0.x; me.y = c0.y + 70; me.vx = me.vy = 0; me.hp = 100; D.update(1 / 30); } D.draw(); D.draw(); return V.info(); };
          let a = sd2(); const full = cnt(), s1 = sig(); ch.forEach(i => { i.done = true; }); a = sd2(); const leer = cnt(), s2 = sig();
          o[sd] = { n: ch.length, full, leer, diff: s1 !== s2, err: a.err }; ch.forEach(i => { i.done = false; });
          const bak = KK.KL.objs['good:chips']; delete KK.KL.objs['good:chips']; a = sd2(); o[sd].ohne = cnt(); o[sd].err2 = a.err; KK.KL.objs['good:chips'] = bak;
        }
        await D.view3d.set(false); return o; })()`);
      if (r.i0) { t.note('3D nicht verfuegbar'); return; }
      t.note(JSON.stringify(r));
      for (const sd of [5, 8, 3, 11]) { const q = r[sd]; if (!q) continue;
        t.ok(q.err === '' && q.err2 === '', 'Seed ' + sd + ': keine Fehler');
        t.ok(q.full > q.leer || q.diff, 'Seed ' + sd + ': voll und abgeraeumt unterscheiden sich (' + q.full + ' gegen ' + q.leer + ' Kloetze)');
        t.ok(q.ohne < q.full, 'Seed ' + sd + ': ohne Bauer faellt der Tisch klassisch zurueck (' + q.ohne + ')'); }
      t.ok(Object.keys(r.kinds).length >= 3, 'mehrere Tischarten kommen vor: ' + Object.keys(r.kinds).join(', '));
      if (P.page.errors.length) t.ok(false, 'JS-Fehler: ' + P.page.errors.slice(0, 2).join(' | '));
    } finally { await P.done(); }
  },
}];
