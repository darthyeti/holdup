// Balance-Bot fuer Holdup. Nur mit index.html#debug nutzbar (setzt window.__dbg).
// Laden im Browser: fetch('tools/bot.js').then(r=>r.text()).then(eval)
// Dann: bot.batch(20,{call:null}) oder bot.run({call:10,extras:true})
// Optionen: sigma (Zielstreuung rad), react (Reaktionszeit s), call (null = Wagen kommt von selbst, sonst Sekunden
// nach der letzten Beute bis zum Anruf), extras (Geldautomaten und Kassen mitnehmen), wait (Wartekachel),
// seed (Kartenseed, sonst die aktuelle Karte), wait ('vault' = Tresorinneres, sonst Kachel), kit ('old' = Gewehr und Weste wie vor dem Shop, 'base' = Pistole, 'mid' = SMG und Weste, 'full' = alles), cons ({jam,med})
(function(){
const D=__dbg,k=D.keys,S=()=>D.get(),dt=1/30;
const KITS={base:{},old:{rifle:1,vest:1},mid:{smg:1,vest:1},full:{rifle:1,vest:1,helm:1,pack:1,drill:1,pick:1,radio:1}};
const gauss=()=>{let u=0,v=0;while(!u)u=Math.random();while(!v)v=Math.random();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v)};
const tileOf=o=>[Math.floor(o.x/32),Math.floor(o.y/32)];
function steer(tx,ty){const p=S().p;k.a=k.d=k.w=k.s=0;const t=tileOf(p);if(t[0]===tx&&t[1]===ty)return true;const path=D.pathTo(p.x,p.y,tx,ty);if(!path.length)return false;const q=path[0],dx=q[0]-p.x,dy=q[1]-p.y;if(dx>2)k.d=1;if(dx<-2)k.a=1;if(dy>2)k.s=1;if(dy<-2)k.w=1;return false}
function run(o){o=Object.assign({sigma:.09,react:.35,call:null,extras:false,maxT:400,wait:'vault',kit:'old',cons:{}},o||{});
 D.sessReset();Object.assign(D.SESSION.own,KITS[o.kit]||{});Object.assign(D.SESSION.cons,o.cons);
 if(o.seed!=null)D.buildSeed(o.seed);
 D.reset();const L=D.LAY(),exitT=[Math.round(L.exit.x/32),Math.round(L.van.y/32)],waitT=o.wait==='vault'?L.vault.bundles[L.vault.bundles.length-1]:o.wait;D.startHeist(false);k.a=k.d=k.w=k.s=k[' ']=k.e=0;
 const R={res:null,t:0,loot:0,hp:100,minHp:100,waves:0,kills:0,milestones:{},trace:[]};let lastTr=-99;
 let seen=new Map(),jit=0,jt=0,calledAt=null;
 const mark=(n)=>{if(R.milestones[n]==null)R.milestones[n]=+S().tH.toFixed(1)};
 const goals=[];
 if(o.extras)for(const a of L.atms.map(q=>[q[0]-1,q[1]]))goals.push({at:a,hold:true,tag:'atm'});
 goals.push({at:[L.vault.door[0]-1,L.vault.door[1]+1],hold:true,done:()=>S().vaultOpen,tag:'vault'});
 for(const b of L.vault.bundles){let u0=null;goals.push({at:b,hold:true,init:()=>{u0=S().units},done:()=>S().units>=u0+.99,tag:'bundle'})}
 if(o.extras)for(const t of L.tills.slice().reverse())goals.push({at:t,hold:true,tag:'till'});
 let gi=0,gInit=false;
 for(let n=0;n<o.maxT*30;n++){
  const s=S(),p=s.p;if(s.ended)break;
  // Feinde in Sicht
  let tgt=null,bd=1e9;for(const e of s.en){if(!D.los(p.x,p.y,e.x,e.y)||(D.clear&&!D.clear(p.x,p.y,e.x,e.y)))continue;const d=Math.hypot(e.x-p.x,e.y-p.y);if(d<430&&d<bd){bd=d;tgt=e}}
  for(const [e,t] of seen)if(!s.en.includes(e))seen.delete(e);
  if(tgt&&!seen.has(tgt))seen.set(tgt,s.tH);
  k.e=0;
  const vanReady=s.vanArr&&s.vanX<=L.exit.x+2;
  if(tgt&&!(vanReady&&s.units>0)&&s.tH-seen.get(tgt)>=o.react){k.a=k.d=k.w=k.s=0;jt-=dt;if(jt<=0){jit=gauss()*o.sigma;jt=.18}
   // leicht verzoegertes Ziel: Position von vor ~0.1 s
   const lx=tgt.x-(tgt.vx||0)*.1,ly=tgt.y-(tgt.vy||0)*.1;p.a=Math.atan2(ly-p.y,lx-p.x)+jit;k[' ']=1}
  else{k[' ']=0;
   if(s.vaultOpen&&gi<goals.length&&goals[gi].tag==='vault'){gi++;gInit=false}
   const g=goals[gi];
   if(g&&s.tH<s.vanAt-5){if(!gInit){gInit=true;g.init&&g.init()}
    const there=steer(g.at[0],g.at[1]);if(there&&g.hold)k.e=1;
    let fin=g.done?g.done():false;
    if(g.tag==='till'||g.tag==='atm'){if(there&&g.t0==null)g.t0=s.tH;fin=g.t0!=null&&s.tH-g.t0>(g.tag==='atm'?D.CFG.atm.t+.6:D.CFG.till.t+.4)}
    if(fin){gi++;gInit=false}}
   else{ // Warteposition / Flucht
    if(vanReady||(o.call!=null&&calledAt!=null&&s.vanArr))steer(exitT[0],exitT[1]);else steer(waitT[0],waitT[1]);
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
window.bot={run,batch,batchSeeds};
})();
