// Shop: Der Status-Text der gestuften Posten (Weste, Helm, Rucksack, Bohrer, Dietrich, Funk, Zeile hinter den drei Stufenquadraten, rund 20 Zeichen Platz) war mit "nicht gekauft  (zu teuer)" zu lang und ragte
// aus der Kachel (Tills Beobachtung). Jetzt steht bei Stufe 0 nur "zu teuer" (rot) statt "nicht gekauft (zu teuer)", und ab Stufe 1 faellt der Grund weg, wenn die Zeile sonst nicht passt.
async function setup(t) {
  await t.loadTool('loopnet.js');
  await t.loadInpage('menu.js');
  await t.loadInpage('overlap.js');
}

module.exports = [
  {
    name: 'Shop-Text: kein Status-Text ragt aus seiner Kachel (kein Geld, wenig Geld, Weste und Helm mit Verschleiss, alles auf Stufe 3), Stufe 0 zeigt nur "zu teuer"',
    async run(t) {
      await setup(t);
      const r = await t.page.evaluate(() => {
        const net = LoopNet(30, 0), S = MT.solo(net), out = { bad: [], texts: {} };
        const states = {
          keinGeld: { wallet: 0, own: {}, wear: {} },
          wenigGeld: { wallet: 9000, own: {}, wear: {} },
          verschleiss: { wallet: 0, own: { vest: 1, helm: 1, pack: 1, drill: 2 }, wear: { vest: 40, helm: 5 } },
          verschleissReich: { wallet: 90000, own: { vest: 2, helm: 2 }, wear: { vest: 120, helm: 9 } },
          alles: { wallet: 99999, own: { vest: 3, helm: 3, pack: 3, drill: 3, pick: 3, radio: 3 }, wear: { vest: 150, helm: 12 } },
        };
        for (const [name, st] of Object.entries(states)) {
          S.sessReset(); S.SESSION.wallet = st.wallet; Object.assign(S.SESSION.own, st.own); S.SESSION.wear.vest = st.wear.vest == null ? null : st.wear.vest; S.SESSION.wear.helm = st.wear.helm == null ? null : st.wear.helm;
          S.openShop(); const b = OV.boxes(S);
          for (const q of b.tiles.filter(x => /^buy:/.test(x.id))) {
            const inside = b.texts.filter(x => (x.x0 + x.x1) / 2 > q.x0 && (x.x0 + x.x1) / 2 < q.x1 && (x.y0 + x.y1) / 2 > q.y0 && (x.y0 + x.y1) / 2 < q.y1);
            for (const x of inside) if (x.x1 > q.x1 - 6 || x.x0 < q.x0 + 4) out.bad.push(name + ' ' + q.id + ': "' + x.s + '" ragt aus der Kachel (' + Math.round(x.x1 - q.x1) + ' px)');
            if (name === 'keinGeld') out.texts[q.id] = inside.map(x => x.s);
          }
        }
        return out;
      });
      t.eq(r.bad, [], 'kein Text ragt aus der Kachel');
      const tiered = Object.entries(r.texts).filter(([, v]) => v.some(s => /^Weste$|^Helm$|^Rucksack$|^Bohrer$|^Dietrich$|^Funkgerät$/.test(s)));
      t.ok(tiered.length >= 6, 'gestufte Posten gefunden: ' + tiered.length);
      for (const [id, v] of tiered) { t.ok(v.includes('zu teuer'), id + ': ohne Geld steht "zu teuer": ' + JSON.stringify(v)); t.ok(!v.some(s => /nicht gekauft/.test(s)), id + ': nicht "nicht gekauft (zu teuer)": ' + JSON.stringify(v)); }
    },
  },
];
