// Balance-Bot fuer Holdup. Nur mit index.html#debug nutzbar (setzt window.__dbg).
// Laden im Browser: fetch('tools/bot.js').then(r=>r.text()).then(eval)
// Dann: bot.batch(20,{call:null}) oder bot.run({call:10,extras:true}), je Grundriss bot.batchHalls(n,o,from,halls)
// Optionen: goodsN (nur so viele Stuecke), goods (true = Beute-Stuecke der neuen Karten einsammeln, dazu Cage-Tausch im Casino, 'cheap' = Automaten auslassen), lage (Tags erzwingen), sigma (Zielstreuung rad), react (Reaktionszeit s), call (null = Wagen kommt von selbst, sonst Sekunden
// nach der letzten Beute bis zum Anruf), extras (Geldautomaten und Kassen mitnehmen), wait (Wartekachel),
// seed (Kartenseed, sonst die aktuelle Karte), turn (Lage der Strasse fuer alle folgenden Karten, 'N', 'E', 'W' oder 'S', mit + dahinter laengs gespiegelt, null schaltet ab, setzt dbg.setTurn und baut die Karte neu), wait ('vault' = Tresorinneres, sonst Kachel), kit ('old' = Gewehr und Weste wie vor dem Shop, 'base' = Pistole, 'mid' = SMG und Weste, 'full' = alles), bar ('all' = alle Eingaenge samt Fluchttuer verbarrikadieren, 'noexit' = ohne Fluchttuer, die Fluchttuer wird zum Wagen wieder abgebaut), barLv (Stufen je Tuer, 1 oder 2), cons ({jam,med}), round (bereits ueberstandene Auftraege der Serie, skaliert die Polizei), heat (Fahndungspunkte zu Beginn des Laufs, 0 bis 100, Standard 0, wirkt erst mit CFG.fahndung.on), van ('alt' = altes Verhalten des Fluchtwagens: sofort an Bord, Fahrer wartet immer; ein Objekt setzt CFG.van; ohne Angabe gelten die Regeln des Spiels, der Bot hat keine Taktik fuer Polizei am Wagen), shieldSmart (Standard an: Schild-Beamte, deren Schild zum Bot zeigt, werden nur beschossen, wenn sonst nichts in Sicht ist; false = stur auf den Naechsten, Obergrenze fuer die Wirkung der Schilde)
(function(){
const D=__dbg,k=D.keys,S=()=>D.get(),dt=1/30;
const VAN0=Object.assign({},D.CFG.van);
const KITS={base:{},old:{rifle:1,vest:1},mid:{smg:1,vest:1},full:{rifle:1,vest:1,helm:1,pack:1,drill:1,pick:1,radio:1}};
const gauss=()=>{let u=0,v=0;while(!u)u=Math.random();while(!v)v=Math.random();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v)};
const tileOf=o=>[Math.floor(o.x/32),Math.floor(o.y/32)];
function steer(tx,ty){const p=S().p;k.a=k.d=k.w=k.s=0;const t=tileOf(p);if(t[0]===tx&&t[1]===ty)return true;const path=D.pathTo(p.x,p.y,tx,ty);if(!path.length)return false;const q=path[0],dx=q[0]-p.x,dy=q[1]-p.y;if(dx>2)k.d=1;if(dx<-2)k.a=1;if(dy>2)k.s=1;if(dy<-2)k.w=1;return false}
function run(o){o=Object.assign({sigma:.09,react:.35,call:null,extras:false,maxT:400,wait:'vault',kit:'old',cons:{},round:0,heat:0,bar:null,barLv:1},o||{});
 Object.assign(D.CFG.van,VAN0,o.van==='alt'?{bt:0,bu:0,r:0}:o.van&&typeof o.van==='object'?o.van:{});
 D.sessReset();Object.assign(D.SESSION.own,KITS[o.kit]||{});Object.assign(D.SESSION.cons,o.cons);D.SESSION.round=o.round||0;D.SESSION.heat=o.heat||0;
 if(o.lage!==undefined)D.setLage(o.lage);if(o.turn!==undefined)D.setTurn(o.turn);if(o.seed!=null){if(o.lage!==undefined||o.turn!==undefined)D.buildLay(D.layoutFor(o.seed));else D.buildSeed(o.seed)}
 D.reset();const L=D.LAY(),LN=D.LANE(),exitT=LN.exit.goal,waitT=o.wait==='vault'?L.vault.bundles[L.vault.bundles.length-1]:o.wait;D.startHeist(false);k.a=k.d=k.w=k.s=k[' ']=k.e=0;
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
    else if(vanReady||(o.call!=null&&calledAt!=null&&s.vanArr))steer(exitT[0],exitT[1]);else steer(waitT[0],waitT[1]);
    if(o.call!=null&&calledAt==null&&(gi>=goals.length||s.tH>=s.vanAt-5)&&s.tH>=(R.milestones.looted==null?s.tH:R.milestones.looted)+o.call){D.callVan();calledAt=s.tH}
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
window.bot={run,batch,batchSeeds,batchHalls};
})();
