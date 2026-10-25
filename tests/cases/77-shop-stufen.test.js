// Shop-Ausbau (Oktober 2026): Stufen 1 bis 3, Verschleiss von Weste und Helm, Reparatur, Brettersatz, Adrenalin, Kit im Coop.
module.exports = [
  {
    name: 'Shop: Stufen kosten je Stufe, enden bei Stufe 3 und wirken (Panzerung, Rucksack, Helm)',
    async run(t) {
      const r = await t.page.evaluate(() => {
        const D = __dbg, items = D.CFG.shop.items, ix = k => items.findIndex(i => i.k === k), out = { prices: [], lv: [] };
        D.sessReset(); D.SESSION.wallet = 1e6;
        for (let n = 0; n < 4; n++) { const w0 = D.SESSION.wallet; D.shopBuy(ix('vest')); out.prices.push(w0 - D.SESSION.wallet); out.lv.push(D.SESSION.own.vest | 0); }
        out.state = D.shopState(items[ix('vest')]);
        out.ar = []; out.bag = []; out.helm = [];
        for (let l = 1; l <= 3; l++) {
          D.SESSION.own = { vest: l, pack: l, helm: l }; D.SESSION.wear = { vest: null, helm: null }; D.reset(); const me = D.get().me;
          out.ar.push(me.ar); out.bag.push(me.bag); me.ar = 0; me.hp = 100; me.inv = 0; D.hitPlayer(me, 10); out.helm.push(+(100 - me.hp).toFixed(2));
        }
        out.tool = [1, 2, 3].map(l => { D.SESSION.own = { drill: l, pick: l, radio: l }; const k = D.curKit(); return [k.drill, k.pick, k.radio]; });
        return out;
      });
      t.eq(r.prices, [12000, 20000, 32000, 0], 'Preise je Stufe, die vierte Stufe gibt es nicht');
      t.eq(r.lv, [1, 2, 3, 3], 'Stufen'); t.eq(r.state, 'gekauft', 'Stufe 3 ist das Ende');
      t.eq(r.ar, [100, 150, 200], 'Panzerung je Stufe'); t.eq(r.bag, [9, 10, 11], 'Tasche je Stufe (7 plus 2, 3, 4)');
      t.eq(r.helm, [8.5, 7.5, 6.7], 'Schaden mit Helm je Stufe (15, 25, 33 % weniger)');
      t.eq(r.tool, [[1, 1, 1], [2, 2, 2], [3, 3, 3]], 'Bohrer, Dietrich, Funk als Stufen im Kit');
    },
  },
  {
    name: 'Shop: Weste und Helm nutzen sich ab, der Rest bleibt über Aufträge, Reparieren kostet anteilig, eine höhere Stufe ist wieder voll',
    async run(t) {
      const r = await t.page.evaluate(() => {
        const D = __dbg, items = D.CFG.shop.items, ix = k => items.findIndex(i => i.k === k), out = {};
        D.sessReset(); D.SESSION.wallet = 1e6; D.SESSION.own = { vest: 1, helm: 1 };
        D.reset(); let me = D.get().me; out.start = [me.ar, me.hh];
        const taken = []; for (let i = 0; i < 13; i++) { me.ar = 0; me.hp = 100; me.inv = 0; D.hitPlayer(me, 10); taken.push(+(100 - me.hp).toFixed(2)); }
        out.taken = taken; out.hh = me.hh;
        me.ar = 33; me.hh = 4; D.keepKit(); out.wear = Object.assign({}, D.SESSION.wear);
        out.kit = [D.curKit().vh, D.curKit().hh];
        D.reset(); me = D.get().me; out.next = [me.ar, me.hh];
        const want = Math.round(((1 - 33 / 100) * 12000 * D.CFG.shop.rep + (1 - 4 / 12) * 8000 * D.CFG.shop.rep) / 100) * 100;
        out.cost = [D.repCost(), want];
        const w0 = D.SESSION.wallet; D.shopBuy(ix('rep')); out.paid = w0 - D.SESSION.wallet; out.wear2 = Object.assign({}, D.SESSION.wear);
        out.state = D.shopState(items[ix('rep')]);
        D.reset(); me = D.get().me; out.after = [me.ar, me.hh];
        D.SESSION.wear.vest = 10; D.shopBuy(ix('vest')); out.up = [D.SESSION.own.vest, D.SESSION.wear.vest];
        return out;
      });
      t.eq(r.start, [100, 12], 'neu: Weste voll, Helm 12 Treffer');
      t.eq(r.taken, [8.5, 8.5, 8.5, 8.5, 8.5, 8.5, 8.5, 8.5, 8.5, 8.5, 8.5, 8.5, 10], 'zwölf Treffer mit Helm, der dreizehnte ohne'); t.eq(r.hh, 0, 'Helm kaputt');
      t.eq(r.wear, { vest: 33, helm: 4 }, 'der Rest bleibt über den Auftrag'); t.eq(r.kit, [33, 4], 'Kit trägt den Rest'); t.eq(r.next, [33, 4], 'der nächste Auftrag startet mit dem Rest');
      t.eq(r.cost[0], r.cost[1], 'Reparatur kostet den fehlenden Anteil mal 40 % des Stufenpreises'); t.eq(r.paid, r.cost[1], 'bezahlt');
      t.eq(r.wear2, { vest: null, helm: null }, 'repariert'); t.eq(r.state, 'heil', 'danach nichts mehr zu tun'); t.eq(r.after, [100, 12], 'danach voll');
      t.eq(r.up, [2, null], 'eine höhere Stufe kommt voll');
    },
  },
  {
    name: 'Shop: Brettersatz gibt Material zum Start, Adrenalin rettet genau einmal vor dem Tod, Vorräte bleiben über Aufträge',
    async run(t) {
      const r = await t.page.evaluate(() => {
        const D = __dbg, out = {};
        D.sessReset(); D.SESSION.cons.bt = 2; D.reset(); let me = D.get().me;
        out.bt = [me.mat, me.units, me.bt]; D.keepKit(); out.cons = D.SESSION.cons.bt;
        D.reset(); me = D.get().me; out.bt2 = [me.mat, me.bt];
        D.sessReset(); D.SESSION.cons.ad = 1; D.reset(); me = D.get().me; me.hp = 10; me.ar = 0; me.inv = 0;
        D.hitPlayer(me, 50); out.ad1 = [me.hp, me.inv > 0, me.ad];
        me.inv = 0; D.hitPlayer(me, 50); out.ad2 = me.hp <= 0;
        D.sessReset(); D.SESSION.cons = { sm: 2, dc: 3, ad: 1, bt: 1 }; D.reset(); me = D.get().me; me.sm = 1; D.keepKit(); out.keep = Object.assign({}, D.SESSION.cons);
        out.san = D.sanKit({ vest: 9, helm: -3, jam: 99, sm: 99, vh: 1e9, hh: 99, ad: 5 });
        return out;
      });
      t.eq(r.bt, [4, 2, 1], 'Start mit 4 Material (2 Plätze), ein Satz bleibt'); t.eq(r.cons, 1, 'Vorrat zählt weiter');
      t.eq(r.bt2, [4, 0], 'zweiter Auftrag benutzt den letzten Satz');
      t.eq(r.ad1, [25, true, 0], 'Adrenalin: 25 HP, kurz unverwundbar, verbraucht'); t.ok(r.ad2, 'danach stirbt man wieder');
      t.eq(r.keep.sm, 1, 'Rauchgranaten: verbrauchte zählen nicht mehr'); t.eq(r.keep.dc, 3); t.ok(!('fl' in r.keep), 'kein Vorrat an Blendgranaten mehr (gestrichen)');
      t.eq([r.san.vest, r.san.helm, r.san.jam, r.san.sm, r.san.vh, r.san.hh, r.san.ad], [3, 0, 3, 3, 200, null, 1], 'sanKit begrenzt Stufen, Vorräte und Verschleiss');
    },
  },
  {
    name: 'Shop: Coop, das Kit des Clients (Stufe und Westenrest) kommt beim Host und beim Client an',
    async run(t) {
      await t.loadTool('loopnet.js'); await t.loadInpage('coop.js');
      const r = await t.page.evaluate(() => {
        const G = CT.mkGame('bank', 321, 2), A = G.A, B = G.clients[0];
        B.SESSION.own = { vest: 3, helm: 2, pack: 2 }; B.SESSION.wear = { vest: 77, helm: 5 }; B.SESSION.cons = { sm: 2, dc: 3, ad: 1 };
        B.openShop(); G.run(1);
        A.startNext(); G.run(2);
        const pa = A.get().players[1], pb = B.get().players[1];
        return { host: [pa.ar, pa.hh, pa.helm, pa.bag, pa.sm, pa.ad, pa.dc], client: [pb.ar, pb.hh, pb.sm, pb.ad, pb.dc] };
      });
      t.eq(r.host, [77, 5, 2, 10, 2, 1, 3], 'Host baut den Spieler mit dem Kit des Clients');
      t.eq(r.client, [77, 5, 2, 1, 3], 'der Client sieht denselben Stand im Schnappschuss (die Vorräte hinter dem gestrichenen Blendgranaten-Feld rutschen nach vorn)');
    },
  },
];
