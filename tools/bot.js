// Balance-Bot fuer Holdup. Nur mit index.html#debug nutzbar (setzt window.__dbg).
// Laden im Browser: fetch('tools/bot.js').then(r=>r.text()).then(eval)
// Dann: bot.batch(20,{call:null}) oder bot.run({call:10,extras:true}), je Grundriss bot.batchHalls(n,o,from,halls)
// Optionen: skills (Stufen im Skillbaum, zum Beispiel {A0:3,A2:3}, die Gegenstaende A3 bis U4 (Gewehr, Werfer, Mine, Claymore, Koffer, C4) spielt der Bot nicht, 0 = keine), lock (Sperrfrist fuer den Funk in Sekunden, sonst der Wert aus CFG.vanLock, 0 = wie vor dem 24. Oktober 2026), goodsN (nur so viele Stuecke), goods (true = Beute-Stuecke der neuen Karten einsammeln, dazu Cage-Tausch im Casino, 'cheap' = Automaten auslassen), lage (Tags erzwingen), sigma (Zielstreuung rad), react (Reaktionszeit s), call (null = Wagen kommt von selbst, sonst Sekunden
// nach der letzten Beute bis zum Anruf), extras (Geldautomaten und Kassen mitnehmen), wait (Wartekachel),
// seed (Kartenseed, sonst die aktuelle Karte), turn (Lage der Strasse fuer alle folgenden Karten, 'N', 'E', 'W' oder 'S', mit + dahinter laengs gespiegelt, null schaltet ab, setzt dbg.setTurn und baut die Karte neu), wait ('vault' = Tresorinneres, sonst Kachel), kit ('old' = Gewehr und Weste wie vor dem Shop, 'base' = Pistole, 'mid' = SMG und Weste, 'full' = alles), bar ('all' = alle Eingaenge samt Fluchttuer verbarrikadieren, 'noexit' = ohne Fluchttuer, die Fluchttuer wird zum Wagen wieder abgebaut), barLv (Stufen je Tuer, 1 oder 2), cons ({jam,med}), round (bereits ueberstandene Auftraege der Serie, skaliert die Polizei), heat (Fahndungspunkte zu Beginn des Laufs, 0 bis 100, Standard 0, wirkt erst mit CFG.fahndung.on), van ('alt' = altes Verhalten des Fluchtwagens: sofort an Bord, Fahrer wartet immer; ein Objekt setzt CFG.van; ohne Angabe gelten die Regeln des Spiels, der Bot hat keine Taktik fuer Polizei am Wagen), shieldSmart (Standard an: Schild-Beamte, deren Schild zum Bot zeigt, werden nur beschossen, wenn sonst nichts in Sicht ist; false = stur auf den Naechsten, Obergrenze fuer die Wirkung der Schilde)
(function(){
const D=__dbg,k=D.keys,S=()=>D.get(),dt=1/30;
const VAN0=Object.assign({},D.CFG.van),LOCK0=D.CFG.vanLock;
const KITS={base:{},old:{rifle:1,vest:1},mid:{smg:1,vest:1},full:{rifle:1,vest:1,helm:1,pack:1,drill:1,pick:1,radio:1}};
const gauss=()=>{let u=0,v=0;while(!u)u=Math.random();while(!v)v=Math.random();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v)};
const tileOf=o=>[Math.floor(o.x/32),Math.floor(o.y/32)];
function steer(tx,ty){const p=S().p;k.a=k.d=k.w=k.s=0;const t=tileOf(p);if(t[0]===tx&&t[1]===ty)return true;const path=D.pathTo(p.x,p.y,tx,ty);if(!path.length)return false;const q=path[0],dx=q[0]-p.x,dy=q[1]-p.y;if(dx>2)k.d=1;if(dx<-2)k.a=1;if(dy>2)k.s=1;if(dy<-2)k.w=1;return false}
/* Wie steer, geht aber bis auf die Mitte der Zielkachel (Reichweiten wie 46 Pixel am Material gelten von der Mitte aus). */
function steerC(tx,ty){const p=S().p;k.a=k.d=k.w=k.s=0;const cx=tx*32+16,cy=ty*32+16;if(Math.hypot(p.x-cx,p.y-cy)<5)return true;const t=tileOf(p);let qx,qy;if(t[0]===tx&&t[1]===ty){qx=cx;qy=cy}else{const path=D.pathTo(p.x,p.y,tx,ty);if(!path.length)return false;qx=path[0][0];qy=path[0][1]}const dx=qx-p.x,dy=qy-p.y;if(dx>2)k.d=1;if(dx<-2)k.a=1;if(dy>2)k.s=1;if(dy<-2)k.w=1;return false}
function run(o){o=Object.assign({sigma:.09,react:.35,call:null,extras:false,maxT:400,wait:'vault',kit:'old',cons:{},round:0,heat:0,bar:null,barLv:1},o||{});
 Object.assign(D.CFG.van,VAN0,o.van==='alt'?{bt:0,bu:0,r:0}:o.van&&typeof o.van==='object'?o.van:{});D.CFG.vanLock=o.lock!=null?o.lock:LOCK0;
 D.sessReset();Object.assign(D.SESSION.own,KITS[o.kit]||{});Object.assign(D.SESSION.cons,o.cons);D.SESSION.round=o.round||0;D.SESSION.heat=o.heat||0;Object.assign(D.SESSION.sk,o.skills||{});
 if(o.lage!==undefined)D.setLage(o.lage);if(o.turn!==undefined)D.setTurn(o.turn);if(o.seed!=null){if(o.lage!==undefined||o.turn!==undefined)D.buildLay(D.layoutFor(o.seed));else D.buildSeed(o.seed)}
 D.reset();const L=D.LAY(),LN=D.LANE(),waitT=o.wait==='vault'?L.vault.bundles[L.vault.bundles.length-1]:o.wait;D.startHeist(false);k.a=k.d=k.w=k.s=k[' ']=k.e=0;
 const R={res:null,t:0,loot:0,hp:100,minHp:100,waves:0,kills:0,milestones:{},trace:[]};let lastTr=-99;
 let seen=new Map(),jit=0,jt=0,calledAt=null;
 const mark=(n)=>{if(R.milestones[n]==null)R.milestones[n]=+S().tH.toFixed(1)};
 const goals=[];
 if(o.extras)for(const a of L.atms.map(q=>[q[0]-L.vault.dir,q[1]]))goals.push({at:a,hold:true,tag:'atm'});
 goals.push({at:D.vaultStand(L),hold:true,done:()=>S().vaultOpen,tag:'vault'});
 for(const b of L.vault.bundles){let u0=null;goals.push({at:b,hold:true,init:()=>{u0=S().units},done:()=>S().units>=u0+(L.bn||D.CFG.bundle).u*(L.bn||D.CFG.bundle).n/L.vault.bundles.length*.95,tag:'bundle'})}
 if(o.goods){const all=S().its.filter(it=>it.t==='good'),claimed=new Set(),G=D.CFG.goods;
  const reachTile=it=>{const p=S().p;let best=null,bd=1e9;for(let dy=-3;dy<=3;dy++)for(let dx=-3;dx<=3;dx++){const tx=Math.floor(it.x/32)+dx,ty=Math.floor(it.y/32)+dy;if(D.isSol(tx,ty))continue;const d=Math.hypot(tx*32+16-it.x,ty*32+16-it.y);if(d>=(it.r||44)*.9)continue;const pl=D.pathTo(p.x,p.y,tx,ty).length;if(!pl&&!(tileOf(p)[0]===tx&&tileOf(p)[1]===ty))continue;const sc=pl+d*.05;if(sc<bd){bd=sc;best=[tx,ty]}}return best};
  for(let i=0;i<Math.min(all.length,o.goodsN==null?all.length:o.goodsN);i++){let cur=null;goals.push({hold:true,tag:'good',to:14,init(){const p=S().p;cur=null;let bd=1e9;for(const it of all){if(it.done||claimed.has(it))continue;const gd=G[it.k];if(p.units+gd.u>p.bag+.01)continue;if(it.k==='slot'&&o.goods==='cheap')continue;const d=Math.hypot(it.x-p.x,it.y-p.y)/gd.v*1000;if(d<bd){const t=reachTile(it);if(t){bd=d;cur=it;this.at=t}}}if(cur)claimed.add(cur)},done:()=>!cur||cur.done})}
  const cage=S().its.find(it=>it.t==='cage');if(cage)goals.push({hold:true,tag:'cage',to:45,init(){const t=reachTile(cage);this.at=t||[Math.floor(cage.x/32),Math.floor(cage.y/32)+1]},done:()=>S().p.chipV<=0})}
 if(o.extras)for(const t of L.tills.slice().reverse())goals.push({at:t,hold:true,tag:'till'});
 const bars=D.bars(),prep=[];
 if(o.bar)for(const b of bars){if(!b.side||(o.bar==='noexit'&&b.n==='Fluchttür'))continue;
  const inw=b.iv,c0=b.cells[0],stand=[c0[0]+inw[0],c0[1]+inw[1]];
  for(let j=0;j<o.barLv;j++){let tgt=null;prep.push({hold:true,tag:'mat',to:9,init(){const p=S().p;let bd=1e9;tgt=null;for(const it of S().its)if(it.t==='mat'&&!it.done){const d=Math.hypot(it.x-p.x,it.y-p.y);if(d<bd){bd=d;tgt=it}}
    if(tgt){const tx=Math.floor(tgt.x/32),ty=Math.floor(tgt.y/32);this.at=[[0,1],[0,-1],[1,0],[-1,0]].map(v=>[tx+v[0],ty+v[1]]).find(t=>!D.isSol(t[0],t[1]))||[tx,ty+1]}else this.at=stand},done:()=>!tgt||tgt.done})}
  prep.push({at:stand,hold:true,tag:'bar',to:12,done:()=>b.lv>=o.barLv})}
 goals.unshift(...prep);
 let gi=0,gInit=false;
 for(let n=0;n<o.maxT*30;n++){
  const s=S(),p=s.p;if(s.ended)break;
  // Feinde in Sicht
  let tgt=null,bd=1e9;for(const e of s.en){if(!D.los(p.x,p.y,e.x,e.y)||(D.clear&&!D.clear(p.x,p.y,e.x,e.y)))continue;const d0=Math.hypot(e.x-p.x,e.y-p.y),pen=o.shieldSmart!==false&&e.kind==='shield'&&e.sh>0&&Math.abs(((Math.atan2(p.y-e.y,p.x-e.x)-e.a+Math.PI)%(2*Math.PI)+2*Math.PI)%(2*Math.PI)-Math.PI)<D.CFG.shield.arc?1000:0,d=d0+pen;if(d0<430&&d<bd){bd=d;tgt=e}}
  for(const [e,t] of seen)if(!s.en.includes(e))seen.delete(e);
  if(tgt&&!seen.has(tgt))seen.set(tgt,s.tH);
  k.e=0;
  const vanReady=s.vanArr&&Math.abs(s.vanX-LN.van.stop)<=2;
  if(tgt&&!(vanReady&&s.units>0)&&s.tH-seen.get(tgt)>=o.react){k.a=k.d=k.w=k.s=0;jt-=dt;if(jt<=0){jit=gauss()*o.sigma;jt=.18}
   // leicht verzoegertes Ziel: Position von vor ~0.1 s
   const lx=tgt.x-(tgt.vx||0)*.1,ly=tgt.y-(tgt.vy||0)*.1;p.a=Math.atan2(ly-p.y,lx-p.x)+jit;k[' ']=1}
  else{k[' ']=0;
   if(s.vaultOpen&&gi<goals.length&&goals[gi].tag==='vault'){gi++;gInit=false}
   const g=goals[gi];
   if(g&&s.tH<s.vanAt-5){if(!gInit){gInit=true;g.init&&g.init()}
    const there=g.at?steer(g.at[0],g.at[1]):true;if(there&&g.hold&&g.at)k.e=1;
    let fin=g.done?g.done():false;if(g.to){if(g.t1==null)g.t1=s.tH;if(s.tH-g.t1>g.to)fin=true}
    if(g.tag==='till'||g.tag==='atm'){if(there&&g.t0==null)g.t0=s.tH;fin=g.t0!=null&&s.tH-g.t0>(g.tag==='atm'?D.CFG.atm.t+.6:D.CFG.till.t+.4)}
    if(fin){gi++;gInit=false}}
   else{ // Warteposition / Flucht
    const xb=bars.find(b=>b.n==='Fluchttür');
    if(xb&&xb.lv>0&&(s.vanArr||calledAt!=null)){const c0=xb.cells[0];if(steer(c0[0]+xb.iv[0],c0[1]+xb.iv[1]))k.e=1}
    else if(vanReady||(o.call!=null&&calledAt!=null&&s.vanArr))steer(LN.exit.goal[0],LN.exit.goal[1]);else steer(waitT[0],waitT[1]);
    if(o.call!=null&&calledAt==null&&(gi>=goals.length||s.tH>=s.vanAt-5)&&s.tH>=(R.milestones.looted==null?s.tH:R.milestones.looted)+o.call&&s.tH>=D.CFG.vanLock){D.callVan();calledAt=s.tH}
   }
   if(gi>=goals.length||s.tH>=s.vanAt-5)mark('looted')}
  D.update(dt);
  const s2=S();if(o.trace&&s2.tH-lastTr>=5){lastTr=s2.tH;R.trace.push([+s2.tH.toFixed(0),Math.round(s2.p.hp),Math.round(s2.p.ar),s2.en.length,s2.waveN,s2.units,tileOf(s2.p).join(',')].join(' '))}
  const s3=s2;R.minHp=Math.min(R.minHp,s2.p.hp);
 }
 const s=S();R.t=+s.tH.toFixed(1);R.loot=s.loot;R.hp=Math.round(s.p.hp);R.waves=s.waveN;R.kills=s.kills;R.res=s.ended?(s.ended.win?'WIN':'LOSE:'+s.ended.title):'TIMEOUT';R.minHp=Math.round(R.minHp);if(!o.trace)delete R.trace;return R}
function batch(n,o){const out=[];for(let i=0;i<n;i++)out.push(run(o));const w=out.filter(r=>r.res==='WIN');
 const avg=(a,f)=>a.length?Math.round(a.reduce((x,r)=>x+f(r),0)/a.length):null;
 return{n,winRate:w.length/n,avgT:avg(w,r=>r.t),avgLoot:avg(w,r=>r.loot),avgMinHp:avg(out,r=>r.minHp),avgWaves:avg(out,r=>r.waves),causes:out.reduce((m,r)=>(m[r.res]=(m[r.res]||0)+1,m),{})}}
function batchSeeds(n,o,from){const out=[],per={};for(let i=0;i<n;i++){const sd=(from||1)+i,r=run(Object.assign({},o,{seed:sd}));out.push(r);per[sd]=r.res}const w=out.filter(r=>r.res==='WIN');
 const avg=(a,f)=>a.length?Math.round(a.reduce((x,r)=>x+f(r),0)/a.length):null;
 return{n,winRate:w.length/n,avgT:avg(w,r=>r.t),avgLoot:avg(w,r=>r.loot),avgMinHp:avg(out,r=>r.minHp),avgWaves:avg(out,r=>r.waves),lost:Object.keys(per).filter(k=>per[k]!=='WIN').join(',')}}
/* Bot je Grundriss (LAY.hall, Tankstelle, Museum, Casino, Juwelier): die ersten n Seeds ab from (Standard 5000) je Grundriss, o wie bei run. Liefert je Grundriss Siegquote, Rest-HP, Beute und Zeit der Siege, Zeit bis alles geplündert, frühe Verluste (unter 30 s) und die verlorenen Seeds mit Zeit. Gebrauch: bot.batchHalls(100,{sigma:.05,react:.35,kit:'old',call:0},5000,['Klassik','Insel']) (halls weglassen = alle, die vorkommen). */
function batchHalls(n,o,from,halls){const D2=__dbg,seeds={};from=from||5000;const want=h=>!halls||halls.includes(h);
 for(let s=from;s<from+4000;s++){const h=D2.layoutFor(s).hall||'-';if(!want(h))continue;seeds[h]=seeds[h]||[];if(seeds[h].length<n)seeds[h].push(s);if(!halls&&s>from+400&&Object.values(seeds).every(a=>a.length>=n))break;if(halls&&halls.every(x=>(seeds[x]||[]).length>=n))break}
 const out={};for(const h of Object.keys(seeds)){const rs=seeds[h].map(sd=>run(Object.assign({},o,{seed:sd}))),w=rs.filter(r=>r.res==='WIN'),avg=(a,f)=>a.length?Math.round(a.reduce((x,r)=>x+f(r),0)/a.length):0;
  out[h]={n:rs.length,win:Math.round(100*w.length/rs.length),hp:avg(rs,r=>r.minHp),loot:avg(w,r=>r.loot),t:avg(w,r=>r.t),looted:avg(rs,r=>r.milestones.looted||0),early:rs.filter(r=>r.res!=='WIN'&&r.t<30).length,lost:rs.map((r,i)=>r.res!=='WIN'?seeds[h][i]+'@'+r.t:null).filter(Boolean)}}
 return out}
/* Bot je Fahndungsstufe (Schritt 2 des Fahndungslevels): die ersten n Seeds ab from (Standard 5000) der aktuellen Szenario-Einstellung, je Stufe in lv (Punkte = Stufe mal CFG.fahndung.step, o.heat), der Rufzeitpunkt wird gestreut (call = (i % sp[0]) * sp[1] Sekunden, Standard 6 und 4), sonst gewinnt oder verliert der Bot an einer einzigen Schwelle (er ist nach rund 85 s fertig, die dritte Welle kommt bei rund 99 s). Liefert je Stufe Siegquote in Prozent, Rest-HP, Zeit der Siege und Wellen. Gebrauch: __dbg.setScenario('bank');__dbg.setSeedMode('random');bot.levels(96,{kit:'full',sigma:.05,react:.35},[0,1,2,3,4,5]). Rauschen bei n 96 rund 5 Prozentpunkte, die Rest-HP zeigen den Verlauf deutlicher. */
function levels(n,o,lv,from,sp){const D2=__dbg,step=D2.CFG.fahndung.step,out={};sp=sp||[6,4];from=from||5000;
 for(const l of lv){const rs=[];for(let i=0;i<n;i++)rs.push(run(Object.assign({},o,{heat:l*step,seed:from+i,call:(i%sp[0])*sp[1]})));const w=rs.filter(r=>r.res==='WIN'),avg=(a,f)=>a.length?Math.round(a.reduce((x,r)=>x+f(r),0)/a.length):null;
  out['L'+l]={win:Math.round(100*w.length/n),hp:avg(rs,r=>r.minHp),t:avg(w,r=>r.t),waves:avg(rs,r=>r.waves)}}
 return out}
/* Transporter-Bot (Schritt D der Transporter-Planung, 28. Oktober 2026): spielt einen Geldtransporter solo vom Start bis zum Fluchtwagen. Ablauf wie ein vorsichtiger Spieler:
   (1) Erkunden: Material sammeln (Kisten, Faesser, Autos) und die Sperre bauen, die am wenigsten fehlt (Baustelle: zwei Teilstuecke). Gelingt sie nicht rechtzeitig, faehrt der Wagen durch (Ergebnis "Wagen entkommen").
   (2) Zugriff: der Wagen steht, die Besatzung wird beschossen (Ziel- und Schusslogik wie bei run), (3) Laderaum aufbohren (der Bot ueberwaeltigt keine ergebenen Wachen: im Solospiel ergibt sich nur die letzte bei hoechstens 35 Leben, das Gewehr laesst das fast nie uebrig), (4) Saecke einpacken bis die Tasche voll ist, Fluchtwagen rufen und einsteigen.
   Optionen: seed, kit, skills, lage, turn, sigma, react, call (Sekunden nach dem Zugriff bis zum Funkruf, Standard 0), maxT, police (false = Messlauf ohne Polizei, nur die Zeitleiste), Panne-Auftraege (mission.panne) spielt er laut: Waffe gleich ziehen, dann wie der normale Zugriff. Gegenrichtung (mission.rev, der Wagen kommt von Osten): der Bot baut von der Westseite der Sperre (hinter ihr), bei stop 'strasse' steht er westlich vom Wagen. Vorhut-Auftraege (mission.vorhut): haelt der Begleitwagen vor der Sperre, beginnt der Ueberfall schon dort (tH zaehlt ab dem Halt der Vorhut, lead = tH beim Halt des Panzerwagens, Meilenstein vorhut = rT beim Halt der Vorhut), bis der Wagen steht, baut der Bot weiter oder wartet und schiesst auf die Wachen der Vorhut. stop ('sperre' = Standard, 'strasse' = auf der Fahrbahn stehen bleiben statt zu bauen, 'nichts' = in der Erkundung nichts tun, der Wagen faehrt durch),
   van wie bei run. Ergebnis: res ('WIN', 'LOSE:Titel', 'TIMEOUT'), t (Sekunden seit dem Zugriff), tPre (Sekunden bis der Wagen stand), loot, hp, minHp, waves, kills, stopWhy, milestones (rT bzw. tH der Schritte: sperre, stand, erster = erster Treffer-Abschuss, besatzung = letzte kampfbereite Wache des Wagens ausgeschaltet, offen, voll, wagen, zone), tags der Karte (variant), mission (street, cargo, lock, alarm, heavy, crew, bagN, arrive aus dem Seed). */
function truck(o){o=Object.assign({sigma:.09,react:.35,call:0,maxT:420,kit:'old',cons:{},round:0,heat:0,stop:'sperre',police:true},o||{});const POL0=[D.CFG.truck.policeAt,D.CFG.policeForced];if(o.police===false){D.CFG.truck.policeAt=99999;D.CFG.policeForced=99999}try{return truck1(o)}finally{D.CFG.truck.policeAt=POL0[0];D.CFG.policeForced=POL0[1]}}
function truck1(o){
 Object.assign(D.CFG.van,VAN0,o.van==='alt'?{bt:0,bu:0,r:0}:o.van&&typeof o.van==='object'?o.van:{});D.CFG.vanLock=o.lock!=null?o.lock:LOCK0;
 D.sessReset();Object.assign(D.SESSION.own,KITS[o.kit]||{});Object.assign(D.SESSION.cons,o.cons);D.SESSION.round=o.round||0;D.SESSION.heat=o.heat||0;Object.assign(D.SESSION.sk,o.skills||{});
 D.setScenario('truck');D.setSeedMode('random');if(o.lage!==undefined)D.setLage(o.lage);if(o.turn!==undefined)D.setTurn(o.turn);
 if(o.seed!=null){if(o.lage!==undefined||o.turn!==undefined)D.buildLay(D.layoutFor(o.seed));else D.buildSeed(o.seed)}
 D.reset();const L=D.LAY(),LN=D.LANE(),M=L.mission;k.a=k.d=k.w=k.s=k[' ']=k.e=0;if(M.panne)D.startHeist(false); // Panne: der Wagen steht schon, der Bot zieht gleich die Waffe (laut)
 const R={res:null,t:0,tPre:null,lead:0,loot:0,hp:100,minHp:100,waves:0,kills:0,stopWhy:null,milestones:{},variant:M.tags.join('|'),street:M.street,mission:{rev:!!M.rev,vorhut:!!M.vorhut,panne:!!M.panne,street:M.street,cargo:M.cargo,lock:M.lock,alarm:M.alarm,heavy:M.heavy|0,crew:M.crew,bagN:M.bagN,arrive:M.arrive},trace:[]};let seen=new Map(),jit=0,jt=0,calledAt=null,gi=null,rtSeen=0;
 const mark=(n,v)=>{if(R.milestones[n]==null)R.milestones[n]=+v.toFixed(1)};
 const reachTile=it=>{const p=S().p;let best=null,bd=1e9;for(let dy=-3;dy<=3;dy++)for(let dx=-3;dx<=3;dx++){const tx=Math.floor(it.x/32)+dx,ty=Math.floor(it.y/32)+dy;if(D.isSol(tx,ty))continue;const d=Math.hypot(tx*32+16-it.x,ty*32+16-it.y);if(d>=(it.r||44)*.9)continue;const pl=D.pathTo(p.x,p.y,tx,ty).length;if(!pl&&!(tileOf(p)[0]===tx&&tileOf(p)[1]===ty))continue;const sc=pl+d*.05;if(sc<bd){bd=sc;best=[tx,ty]}}return best};
 // Fluchtzone: die naechste begehbare Zonenkachel (das Ziel der Karte liegt im haltenden Wagen und ist dann fest)
 const exitTile=()=>{const p=S().p;let best=null,bd=1e9;for(const c of LN.exit.cells){if(D.isSol(c[0],c[1]))continue;const d=Math.hypot(c[0]*32+16-p.x,c[1]*32+16-p.y);if(d<bd){bd=d;best=c}}return best||LN.exit.goal};
 // Die Sperre mit den wenigsten fehlenden Teilen, bei Gleichstand die naeher am Start gelegene
 const pickGroup=()=>{const gs={};for(const b of D.bars())if(b.rd){const q=gs[b.g]||(gs[b.g]={g:b.g,miss:0,x:b.x});if(b.lv<1)q.miss++}return Object.values(gs).sort((a,b)=>a.miss-b.miss||a.x-b.x)[0]};
 const dx=M.rev?-1:1,grp=o.stop==='sperre'?pickGroup().g:null; // stop 'nichts': der Bot tut in der Erkundung nichts (der Wagen faehrt durch)
 let task=null,taskT=0,taskN=0;
 // Treffbar: auf der Strecke steht nichts Festes ausser Barrikaden (Sicht geht durch Wagen, Kugeln nicht); nur mit Sperre (stop 'sperre'), wer ungedeckt auf der Fahrbahn steht, schiesst wie vorher auf alles, was er sieht
 const hittable=(x0,y0,x1,y1)=>{const W=D.world(),n=Math.ceil(Math.hypot(x1-x0,y1-y0)/8);for(let i=1;i<n;i++){const tx=Math.floor((x0+(x1-x0)*i/n)/32),ty=Math.floor((y0+(y1-y0)*i/n)/32);if(D.isSol(tx,ty)){const c=W.cell(tx,ty);if(c!=='X'&&c!=='Y')return false}}return true};
 for(let n=0;n<o.maxT*30;n++){
  const s=S(),p=s.p;if(s.ended)break;const tk=D.tk(),ph2=s.phase===2,pre=!ph2||(!!tk&&tk.st!=='stopped'&&tk.st!=='gone'); // pre: der Wagen steht noch nicht (auch im Ueberfall, den die Vorhut ausgeloest hat): weiter Sperre bauen oder warten
  if(tk&&R.stopWhy==null&&tk.st==='stopped'){R.stopWhy=M.panne?'panne':R.milestones.sperre!=null?'sperre':'strasse';R.tPre=+D.rT().toFixed(1);R.lead=+s.tH.toFixed(1);mark('stand',D.rT())}
  if(M.vorhut&&D.vh()&&D.vh().st==='stopped')mark('vorhut',D.rT());
  if(grp!=null&&R.milestones.sperre==null&&D.bars().filter(b=>b.rd&&b.g===grp).every(b=>b.lv>0))mark('sperre',D.rT());
  k.a=k.d=k.w=k.s=0;k.e=0;
  // Feinde in Sicht (ergebene Besatzung zaehlt nicht)
  let tgt=null,bd=1e9;if(ph2)for(const e of s.en){if(e.sur||e.cap||!D.los(p.x,p.y,e.x,e.y)||(o.shootable!==false&&o.stop==='sperre'&&!hittable(p.x,p.y,e.x,e.y)))continue;const d0=Math.hypot(e.x-p.x,e.y-p.y),pen=o.shieldSmart!==false&&e.kind==='shield'&&e.sh>0&&Math.abs(((Math.atan2(p.y-e.y,p.x-e.x)-e.a+Math.PI)%(2*Math.PI)+2*Math.PI)%(2*Math.PI)-Math.PI)<D.CFG.shield.arc?1000:0,d=d0+pen;if(d0<430&&d<bd){bd=d;tgt=e}}
  for(const [e,t] of seen)if(!s.en.includes(e))seen.delete(e);
  if(tgt&&!seen.has(tgt))seen.set(tgt,s.tH);
  const vanReady=s.vanArr&&Math.abs(s.vanX-LN.van.stop)<=2;
  if(tgt&&(!(vanReady&&s.units>0)||LN.exit.has(p.x,p.y)||bd<260)&&s.tH-seen.get(tgt)>=o.react){jt-=dt;if(jt<=0){jit=gauss()*o.sigma;jt=.18}
   const lx=tgt.x-(tgt.vx||0)*.1,ly=tgt.y-(tgt.vy||0)*.1;p.a=Math.atan2(ly-p.y,lx-p.x)+jit;k[' ']=1;k.f=D.clear&&!D.clear(p.x,p.y,tgt.x,tgt.y)?1:0}
  else{k[' ']=0;k.f=0;
   if(pre){ // Erkunden (oder Wagen noch unterwegs): Sperre bauen oder auf der Strasse warten
    if(o.stop==='nichts')steerC(tileOf(p)[0],tileOf(p)[1]);
    else if(o.stop==='strasse'){const T0=D.tk(),x=Math.floor((T0.x+dx*900)/32),y=Math.floor(T0.y/32);steerC(x,y)}
    else{const miss=D.bars().filter(b=>b.rd&&b.g===grp&&b.lv<1);
     if(!miss.length){ // fertig: neben der Fahrbahn warten
      steerC(tileOf(p)[0],tileOf(p)[1])}
     else{const b=miss.sort((a,c)=>Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(c.x-p.x,c.y-p.y))[0];
      if((p.mat|0)>=(b.mc||1)){const st=[[dx,0],[-dx,0]].map(v=>[b.cells[0][0]+v[0],b.cells[0][1]+v[1]]).find(t=>!D.isSol(t[0],t[1]))||[b.cells[0][0]+1,b.cells[0][1]];
       if(steerC(st[0],st[1])||Math.hypot(b.x-p.x,b.y-p.y)<b.r*.8)k.e=1}
      else{ // Material holen: das naechste, das noch da ist
       if(!task||task.done||!task.ok(p)||taskN>600){let bb=null,dd=1e9;for(const it of S().its)if(it.t==='mat'&&!it.done&&it.ok(p)){const d=Math.hypot(it.x-p.x,it.y-p.y);if(d<dd){dd=d;bb=it}}task=bb;taskN=0;if(task)task.at=reachTile(task)}
       if(task&&task.at){taskN++;if(steerC(task.at[0],task.at[1])||Math.hypot(task.x-p.x,task.y-p.y)<task.r*.7)k.e=1}}}}
   }else{ // Zugriff
    const ck=S().its.find(it=>it.t==='ckey'),cg=S().its.find(it=>it.t==='cargo');
    if(!s.cargoOpen){const it=s.keyTaken&&ck?ck:cg;if(it){if(it.at==null||n%60===0)it.at=reachTile(it);const t=it.at||[Math.floor(it.x/32)-1,Math.floor(it.y/32)];if(steerC(t[0],t[1])||Math.hypot(it.x-p.x,it.y-p.y)<it.r*.8)k.e=1}}
    else{mark('offen',s.tH);const bags=S().its.filter(it=>it.t==='tbag'&&!it.done&&it.fit(p));
     if(bags.length){bags.sort((a,c)=>Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(c.x-p.x,c.y-p.y));const it=bags[0];if(it.at==null||n%60===0)it.at=reachTile(it);const t=it.at||[Math.floor(it.x/32)-1,Math.floor(it.y/32)];if(steerC(t[0],t[1])||Math.hypot(it.x-p.x,it.y-p.y)<it.r*.8)k.e=1}
     else{mark('voll',s.tH);if(!s.vanCalled&&s.tH>=D.CFG.vanLock)D.callVan();{const et=exitTile();steerC(et[0],et[1])}}}
    if(!s.vanCalled&&calledAt==null&&o.call!=null&&s.tH>=o.call&&s.tH>=D.CFG.vanLock){D.callVan();calledAt=s.tH}
   }}
  if(o.trace&&(n%150===0||(ph2&&n%30===0))){const q=S().p,b=D.bars().filter(x=>x.rd&&x.g===grp);R.trace.push([Math.round(D.rT()),tileOf(q).join(','),q.mat|0,b.filter(x=>x.lv>0).length+'/'+b.length,task?(task.tx+','+task.ty+(task.at?'@'+task.at:'')):'-',tk?tk.st+Math.round(tk.x):'-',ph2?'hp'+Math.round(q.hp)+' en'+s.en.length+' tgt'+(tgt?1:0)+' mag'+q.mag+' off'+(s.cargoOpen?1:0)+' e'+k.e+' u'+s.units+' van'+s.vanMode+(s.vanArr?'A':'-')+(s.vanCalled?'C':'-')+Math.round(s.vanX)+'/'+Math.round(LN.van.stop)+' pol'+s.policeAt:''].join(' '))}
  D.update(dt);R.minHp=Math.min(R.minHp,S().p.hp);if(S().vanArr)mark('wagen',S().tH);if(ph2&&S().units>0&&LN.exit.has(S().p.x,S().p.y))mark('zone',S().tH);if(ph2&&S().keyTaken)mark('schluessel',S().tH);if(ph2&&S().kills>0)mark('erster',S().tH);if(ph2&&D.tk()&&D.tk().st==='stopped'&&!S().en.some(e=>e.crew&&e.hp>0&&!e.sur&&!e.cap))mark('besatzung',S().tH);
 }
 const s=S();R.t=+s.tH.toFixed(1);R.loot=s.loot;R.hp=Math.round(s.p.hp);R.waves=s.waveN;R.kills=s.kills;R.res=s.ended?(s.ended.win?'WIN':'LOSE:'+s.ended.title):'TIMEOUT';R.minHp=Math.round(R.minHp);if(!o.trace)delete R.trace;return R}

/* Transporter-Reihe: die Seeds ab from (Standard 3000), je Lauf bot.truck(o). Liefert Siegquote, Quote der gestoppten Wagen (Sperre gelang), Mittel der Meilensteine (Sekunden: stand = rT beim Stehen, offen, voll, zone = tH) und Rest-HP. by = Funktion lauf -> Schluessel,
   dann zusaetzlich die gleiche Auswertung je Gruppe (zum Beispiel by: r => r.variant.includes('Gold') ? 'Gold' : 'sonst'). */
function truckBatch(n,o,from,by){const rs=[];from=from||3000;for(let i=0;i<n;i++){const r=truck(Object.assign({},o,{seed:from+i}));r.seed=from+i;rs.push(r)}
 const avg=(a,f)=>a.length?+(a.reduce((x,r)=>x+f(r),0)/a.length).toFixed(1):null,sum=a=>({n:a.length,win:Math.round(100*a.filter(r=>r.res==='WIN').length/(a.length||1)),stopped:Math.round(100*a.filter(r=>r.milestones.stand!=null).length/(a.length||1)),
  stand:avg(a.filter(r=>r.milestones.stand!=null),r=>r.milestones.stand),offen:avg(a.filter(r=>r.milestones.offen!=null),r=>r.milestones.offen),voll:avg(a.filter(r=>r.milestones.voll!=null),r=>r.milestones.voll),zone:avg(a.filter(r=>r.milestones.zone!=null),r=>r.milestones.zone),
  t:avg(a.filter(r=>r.res==='WIN'),r=>r.t),hp:avg(a,r=>r.minHp),loot:avg(a.filter(r=>r.res==='WIN'),r=>r.loot),res:a.reduce((m,r)=>(m[r.res]=(m[r.res]||0)+1,m),{})});
 const out={all:sum(rs)};if(by){const g={};for(const r of rs)(g[by(r)]=g[by(r)]||[]).push(r);out.by={};for(const k of Object.keys(g).sort())out.by[k]=sum(g[k])}out.runs=rs.map(r=>[r.seed,r.res,r.t,r.minHp].join(':'));return out}
window.bot={run,batch,batchSeeds,batchHalls,levels,truck,truckBatch};
})();
