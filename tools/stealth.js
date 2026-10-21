// Schleichmessung fuer Holdup (nur mit index.html#debug nutzbar, setzt window.__dbg). Laden: fetch('tools/stealth.js').then(r=>r.text()).then(eval)
// Zeichnet die Patrouille der Wachen in Phase 1 auf (Spieler draussen und unbeteiligt) und rechnet daraus, wie gut man an einer Wache vorbeikommt:
//  win    Anteil der Vitrinen-Schneidestellen mit mindestens einem unbeobachteten Fenster von Schneidezeit plus 1 s innerhalb der Aufzeichnung
//  unseen mittlerer Anteil der Zeit, in dem eine Schneidestelle von keiner Wache gesehen wird
//  wait   mittlere Wartezeit (s) bis zum Beginn eines solchen Fensters
//  naive  Anteil der Startzeitpunkte, bei denen ein Lauf ohne Warten gelingt (k Vitrinen schneiden, dann zur Tuer, Verdacht erreicht nie 100)
//  timed  dasselbe, aber vor jedem Schritt mit Beute wird auf ein sichtfreies Fenster gewartet (perfekte Voraussicht, Obergrenze fuer einen aufmerksamen Menschen), timedT die mittlere Dauer in s
// Kameras bleiben ausser Betracht (Hauptschalter oder Stoersender gehen vom Spieler aus). Sichtregel wie im Spiel: canSee mit Reichweite mal .65 beim Schleichen,
// Verdacht +48/s mal .8 bei Sicht, -9/s sonst, Alarm bei 100. Aufruf: stealth.measure({runs,secs,k,cut,sneak}) fuer die aktuelle Karte, stealth.sweep(n,from,{guards}) ueber Juwelier-Seeds.
// Team (Coop-Balken, Oktober 2026): stealth.team({ns,k,spread,trials,scale}) und stealth.teamSweep(n,from,o): ns Spieler, jeder schneidet k zufaellige Vitrinen und geht zur Tuer, versetzt gestartet (spread s),
// ein gemeinsamer Balken mit Rate-Maximum. ok = Erfolg mit Balken 100 (ohne Skalierung), okS = Erfolg mit Balken 100 * (1 + scale * (n - 1)), peak = mittlerer Hoechststand. Wirklich spielen tut das Spiel mit CFG.susPer,
// das Modell zeigt nur, wie stark ein gemeinsamer Balken mit der Spielerzahl kippt. Grenzen: nur Wache (keine Kameras, Kassierer), keine Absprache, kein Warten, Zufall aus Math.random (Mittel ueber viele Karten).
(function(){
const D=__dbg,T=32,HZ=5;
const guardsAll=()=>D.get().npcs.filter(q=>q.k==='grd'&&q.st!=='away'&&q.st!=='dead');
function record(secs){const out=[],dt=1/30,every=Math.round(30/HZ);D.reset();
 for(let i=0;i<secs*30;i++){const m=D.get().me;m.x=-200;m.y=-200;D.update(dt);if(i%every===0)out.push(guardsAll().map(q=>[q.x,q.y,q.a,q.fov,q.rng]))}
 return out}
function spotFor(it){const L=D.LAY();let best=1e9,at=null;for(let dy=-3;dy<=3;dy++)for(let dx=-3;dx<=3;dx++){const tx=Math.floor(it.x/T)+dx,ty=Math.floor(it.y/T)+dy;if(D.isSol(tx,ty))continue;
 const cx=Math.max(tx*T+9,Math.min(tx*T+T-9,it.x)),cy=Math.max(ty*T+9,Math.min(ty*T+T-9,it.y)),d=Math.hypot(cx-it.x,cy-it.y);if(d>=(it.r||44)*.95)continue;   // Stehen darf man am Kachelrand (Figurenradius 9)
 const pl=D.pathTo(L.spawn.x,L.spawn.y,tx,ty).length;if(!pl)continue;const sc=pl+d*.05;if(sc<best){best=sc;at=[cx,cy]}}return at}
function route(a,b){const p=D.pathTo(a[0],a[1],Math.floor(b[0]/T),Math.floor(b[1]/T));let d=0,x=a[0],y=a[1];for(const q of p){d+=Math.hypot(q[0]-x,q[1]-y);x=q[0];y=q[1]}return{d,p}}
function samples(a,p,speed){const out=[];let x=a[0],y=a[1];for(const q of p){const d=Math.hypot(q[0]-x,q[1]-y),n=Math.max(1,Math.round(d/speed*HZ));for(let i=1;i<=n;i++)out.push([x+(q[0]-x)*i/n,y+(q[1]-y)*i/n]);x=q[0];y=q[1]}return out}
// Ziel des Laufs: die Kachel vor der Vordertuer (offene Tuer an der Strassenseite), Mitte in px
function frontOut(L){const ln=D.LANE(),fd=L.spots.find(q=>q.side===ln.side&&!q.lk&&!q.ex),c=fd.cells[0];return[(c[0]-fd.iv[0])*T+16,(c[1]-fd.iv[1])*T+16]}
function measure(o){o=Object.assign({runs:2,secs:150,k:3,cut:6,sneak:true},o||{});const L=D.LAY(),rm=o.sneak?.65:1,kf=o.sneak?.8:1,speed=o.sneak?50:85,sight=D.lgM('sight');
 const items=D.get().its.filter(i=>i.t==='vit'),spots=items.map(i=>({it:i,at:spotFor(i)})).filter(s=>s.at),exitT=frontOut(L),win=Math.ceil((o.cut+1)*HZ),N=o.secs*HZ;
 const R={guards:D.get().npcs.filter(q=>q.k==='grd').length,vit:items.length,spots:spots.length,win:0,unseen:0,wait:0,naive:0,timed:0,timedT:0,maxWin:0,n:0};
 for(let r=0;r<o.runs;r++){const rec=record(o.secs),cache=new Map();
  const vis=(i,x,y)=>{const key=((i%N)*64+Math.floor(y/T)+8)*128+Math.floor(x/T)+8;let v=cache.get(key);if(v===undefined){const g=rec[i%rec.length];v=g.some(q=>D.canSee(q[0],q[1],q[2],q[3],q[4]*rm*sight,x,y));cache.set(key,v)}return v};
  let u=0,wn=0,ws=0,wmax=0;
  for(const s of spots){const v=Array.from({length:2*N},(_,i)=>vis(i,s.at[0],s.at[1]));let run=0,best=0,tot=0,has=false;for(let i=0;i<N;i++){if(!v[i]){run++;tot++;best=Math.max(best,run);if(run>=win)has=true}else run=0}
   u+=tot/N;wn+=has?1:0;wmax=Math.max(wmax,best/HZ);
   const ok=new Array(2*N).fill(false);let c=0;for(let i=2*N-1;i>=0;i--){c=v[i]?0:c+1;ok[i]=c>=win}
   let nxt=1e9;const next=new Array(2*N);for(let i=2*N-1;i>=0;i--){if(ok[i])nxt=i;next[i]=nxt}
   let sum=0;for(let i=0;i<N;i++)sum+=next[i]>=1e9?N/HZ:(next[i]-i)/HZ;ws+=sum/N}
  R.win+=wn/spots.length;R.unseen+=u/spots.length;R.wait+=ws/spots.length;R.maxWin=Math.max(R.maxWin,wmax);
  // Lauf: naechste Vitrinen zuerst, danach Tuer. Schritte in 1/HZ s, Verdacht nur mit Beute
  const order=[];let cur=[L.spawn.x,L.spawn.y];const left=spots.slice();for(let i=0;i<Math.min(o.k,left.length);i++){let bi=0,bd=1e9;left.forEach((s,j)=>{const d=route(cur,s.at).d;if(d<bd){bd=d;bi=j}});order.push(left[bi]);cur=left[bi].at;left.splice(bi,1)}
  const legs=[];cur=[L.spawn.x,L.spawn.y];order.forEach((s,idx)=>{legs.push({pts:samples(cur,route(cur,s.at).p,speed),loot:idx>0});legs.push({pts:Array(Math.round(o.cut*HZ)).fill(s.at),loot:idx>0,still:true});cur=s.at});
  legs.push({pts:samples(cur,route(cur,exitT).p,speed),loot:true});
  const sim=(t0,wait)=>{let t=t0,sus=0,el=0;for(const leg of legs){
    if(wait){let w=0;for(;w<=100*HZ;w++){let ok=true;for(let i=0;i<leg.pts.length&&ok;i++)if(vis(t+w+i,leg.pts[i][0],leg.pts[i][1]))ok=false;if(ok)break}if(w>100*HZ)return null;t+=w;el+=w/HZ}
    for(let i=0;i<leg.pts.length;i++){const sees=leg.loot&&vis(t,leg.pts[i][0],leg.pts[i][1]);sus=Math.max(0,Math.min(100,sus+(sees?48*kf:-9)/HZ));if(sus>=100)return null;t++;el+=1/HZ}}
   return el};
  let n=0,a=0,b=0,bt=0;for(let s0=0;s0<N-50*HZ;s0+=2*HZ){n++;if(sim(s0,false)!=null)a++;const x=sim(s0,true);if(x!=null){b++;bt+=x}}
  R.naive+=a/n;R.timed+=b/n;R.timedT+=b?bt/b:0;R.n++}
 for(const k of['win','unseen','wait','naive','timed','timedT'])R[k]=+(R[k]/R.n).toFixed(2);R.maxWin=+R.maxWin.toFixed(1);
 return R}
function sweep(n,from,o){o=o||{};const rows=[];for(let i=0;i<n;i++){const sd=(from||1)+i*3;D.setScenario('jewel');D.setSeedMode('random');D.setLage([]);D.buildLay(D.layoutFor(sd));const g=D.get().npcs.filter(q=>q.k==='grd').length;if(o.guards!=null&&g!==o.guards)continue;const m=measure(o);m.seed=sd;rows.push(m)}
 const avg=k=>+(rows.reduce((a,m)=>a+m[k],0)/(rows.length||1)).toFixed(2);
 return{n:rows.length,guards:o.guards,win:avg('win'),unseen:avg('unseen'),wait:avg('wait'),naive:avg('naive'),timed:avg('timed'),timedT:avg('timedT'),maxWin:Math.max(0,...rows.map(m=>m.maxWin)),rows}}

// Teamlauf: n Spieler, jeder schneidet k zufaellige Vitrinen und geht zur Tuer, versetzt gestartet, EIN gemeinsamer Balken, Rate = Maximum (wie im Spiel), nicht Summe.
function team(o){o=Object.assign({secs:120,k:3,cut:6,sneak:true,ns:[1,2,3,4],spread:15,trials:120,scale:.25},o||{});
 const L=D.LAY(),rm=o.sneak?.65:1,kf=o.sneak?.8:1,speed=o.sneak?50:85,sight=D.lgM('sight');
 const items=D.get().its.filter(i=>i.t==='vit'),spots=items.map(i=>({it:i,at:spotFor(i)})).filter(s=>s.at),exitT=frontOut(L),N=o.secs*HZ;
 const R={};for(const n of o.ns)R[n]={ok:0,okS:0,peak:0,tr:0};
 const rec=record(o.secs),cache=new Map();
 const vis=(i,x,y)=>{const key=((i%N)*64+Math.floor(y/T)+8)*128+Math.floor(x/T)+8;let v=cache.get(key);if(v===undefined){const g=rec[i%rec.length];v=g.some(q=>D.canSee(q[0],q[1],q[2],q[3],q[4]*rm*sight,x,y));cache.set(key,v)}return v};
 const mkPts=()=>{const left=spots.slice().sort(()=>Math.random()-.5).slice(0,Math.min(o.k,spots.length)),order=[];let cur=[L.spawn.x,L.spawn.y];
  while(left.length){let bi=0,bd=1e9;left.forEach((s,j)=>{const d=route(cur,s.at).d;if(d<bd){bd=d;bi=j}});order.push(left[bi]);cur=left[bi].at;left.splice(bi,1)}
  const pts=[];cur=[L.spawn.x,L.spawn.y];order.forEach((s,idx)=>{for(const q of samples(cur,route(cur,s.at).p,speed))pts.push([q[0],q[1],idx>0]);for(let i=0;i<Math.round(o.cut*HZ);i++)pts.push([s.at[0],s.at[1],idx>0]);cur=s.at});
  for(const q of samples(cur,route(cur,exitT).p,speed))pts.push([q[0],q[1],true]);return pts};
 for(let tr=0;tr<o.trials;tr++){const t0=Math.floor(Math.random()*(N-100*HZ)),pl=[0,1,2,3].map(()=>({pts:mkPts(),off:Math.floor(Math.random()*o.spread*HZ)}));
  for(const n of o.ns){const P=pl.slice(0,n),end=Math.max(...P.map(p=>p.off+p.pts.length));let sus=0,susS=0,capS=100*(1+o.scale*(n-1)),fail=false,failS=false,peak=0;
   for(let t=0;t<end;t++){let sees=false;for(const p of P){const j=t-p.off;if(j>=0&&j<p.pts.length&&p.pts[j][2]&&vis(t0+t,p.pts[j][0],p.pts[j][1])){sees=true;break}}
    const d=(sees?48*kf:-9)/HZ;sus=Math.max(0,Math.min(100,sus+d));susS=Math.max(0,susS+d);peak=Math.max(peak,sus);if(sus>=100)fail=true;if(susS>=capS)failS=true}
   R[n].tr++;if(!fail)R[n].ok++;if(!failS)R[n].okS++;R[n].peak+=peak}}
 for(const n of o.ns){R[n].ok=+(R[n].ok/R[n].tr).toFixed(2);R[n].okS=+(R[n].okS/R[n].tr).toFixed(2);R[n].peak=+(R[n].peak/R[n].tr).toFixed(0)}
 return R}
function teamSweep(n,from,o){o=o||{};const acc={};let cnt={};for(let i=0;i<n;i++){const sd=(from||1)+i*3;D.setScenario('jewel');D.setSeedMode('random');D.setLage([]);D.buildLay(D.layoutFor(sd));const g=D.get().npcs.filter(q=>q.k==='grd').length;
  const r=team(o);const key=g+' Wache(n)';cnt[key]=(cnt[key]||0)+1;acc[key]=acc[key]||{};for(const k in r){acc[key][k]=acc[key][k]||{ok:0,okS:0,peak:0};for(const f of['ok','okS','peak'])acc[key][k][f]+=r[k][f]}}
 for(const key in acc)for(const k in acc[key])for(const f in acc[key][k])acc[key][k][f]=+(acc[key][k][f]/cnt[key]).toFixed(2);
 return{seeds:cnt,res:acc}}
window.stealth={measure,sweep,record,team,teamSweep};
})();
