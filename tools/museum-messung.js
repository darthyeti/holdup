// Museum-Messung (Ticket 41, Plan Museum v2 in docs/szenarien.md). Werkzeug, kein Test.
// Aufruf: cd <Projekt> && node tools/museum-messung.js <von> <anzahl> <ausgabe.json>   (Seed i: 3 + 11 * (von + i), HOLDUP_CHROME wie bei den Tests, rund 1 s je Seed)
//         node tools/museum-messung.js agg <datei.json> [weitere.json ...]   (Kennzahlen als Text: Karten, Wachen- und Kameraabstaende, Abdeckung, unbeobachtete Wege, Standardlauf)
// Je Seed 120 s Aufzeichnung mit dem Spieler ausserhalb, 5 Hz, Sichtpruefung mit canSee. Verfahren und Grenzen: docs/szenarien.md, Museum v2, Messung.
const { launch, openGame } = require('../tests/lib');
const fs=require('fs');
const NOB=!!process.env.HOLDUP_NOBLOCK;
const FN = `([sd,secs]) => {
const D=__dbg,T=32,HZ=5,STEP=6,NOB=${NOB};
D.sessReset();if(NOB&&D.CFG.museumGen.block)D.CFG.museumGen.block.on=0;D.setScenario('museum');D.setSeedMode('random');D.setLage(null);D.setTurn('S');D.buildSeed(sd);
const L=D.LAY(),R={sd,hall:L.hall,q:L.q||null,lg:L.mission.lg,ev:L.mission.ev,tod:L.theme.tod,bld:L.bld,tries:L.tries||0};
const ncam=D.get().cams.length;R.cams=ncam;R.guards0=D.get().npcs.filter(q=>q.k==='grd').length;
const W0=D.world();R.M=[];for(let y=L.bld.y0;y<=L.bld.y1;y++)R.M.push(W0.M[y-W0.WY0].slice(L.bld.x0-W0.WX0,L.bld.x1-W0.WX0+1));
const dx=(L.q?L.q.ww:9)-9;R.dx=dx;
// Aufzeichnung
const rec=[],camsA=D.get().cams.map(c=>({x:c.x,y:c.y,a0:c.a0,amp:c.amp,sp:c.sp,rng:c.rng,fov:c.fov}));
const me=D.get().me;
for(let i=0;i<secs*30;i++){me.x=-200;me.y=-200;D.update(1/30);if(i%STEP===0){const g=D.get();rec.push({t:g.time,g:g.npcs.map(q=>q.k==='grd'&&q.st!=='away'&&q.st!=='dead'&&q.st!=='ko'?[q.x,q.y,q.a,q.fov,q.rng]:null)})}}
const nG=rec[0].g.length;R.gRng=(rec[0].g.find(Boolean)||[])[4];R.gFov=(rec[0].g.find(Boolean)||[])[3];R.guardsMax=Math.max(...rec.map(r=>r.g.filter(Boolean).length));
// Wachen: Abstaende
let minSync=1e9,close4=0,close8=0,nS=0,minTrace=1e9;const traces=[];
for(let i=0;i<nG;i++)traces.push(rec.map(r=>r.g[i]).filter(Boolean));
for(const r of rec){const gs=r.g.filter(Boolean);if(gs.length<2)continue;nS++;let m=1e9;for(let i=0;i<gs.length;i++)for(let j=i+1;j<gs.length;j++)m=Math.min(m,Math.hypot(gs[i][0]-gs[j][0],gs[i][1]-gs[j][1]));minSync=Math.min(minSync,m);if(m<4*T)close4++;if(m<8*T)close8++}
for(let i=0;i<nG;i++)for(let j=i+1;j<nG;j++)for(const a of traces[i])for(const b of traces[j])minTrace=Math.min(minTrace,Math.hypot(a[0]-b[0],a[1]-b[1]));
let m01=1e9;for(const r of rec){const a=r.g[0],b=r.g[1];if(a&&b)m01=Math.min(m01,Math.hypot(a[0]-b[0],a[1]-b[1]))}R.gMin01=m01<1e8?m01/T:null;
R.gMinSync=nS?minSync/T:null;R.gClose4=nS?close4/nS:null;R.gClose8=nS?close8/nS:null;R.gMinTrace=minTrace<1e8?minTrace/T:null;R.nSync=nS;
// Wachen: Abstand zu Lasern
let minLaser=1e9;const sd2=(x,y,l)=>{const ax=l[0]*T,ay=l[1]*T,bx=l[2]*T,by=l[3]*T,vx=bx-ax,vy=by-ay,t=Math.max(0,Math.min(1,((x-ax)*vx+(y-ay)*vy)/(vx*vx+vy*vy)));return Math.hypot(x-ax-vx*t,y-ay-vy*t)};
for(const tr of traces)for(const p of tr)for(const l of L.lasers)minLaser=Math.min(minLaser,sd2(p[0],p[1],l));R.gMinLaser=minLaser/T;
// Kameras: Abstaende
let mc=1e9,close6=0,nn=0;for(let i=0;i<ncam;i++){let b=1e9;for(let j=0;j<ncam;j++)if(i!==j){const d=Math.hypot(camsA[i].x-camsA[j].x,camsA[i].y-camsA[j].y)/T;b=Math.min(b,d);if(j>i){mc=Math.min(mc,d);if(d<6)close6++}}nn+=b<1e8?b:0}
R.cMin=ncam>1?mc:null;R.cNN=ncam>1?nn/ncam:null;R.cClose6=close6;
// Flaeche
const b=L.bld,tiles=[];for(let ty=b.y0+1;ty<b.y1;ty++)for(let tx=b.x0+1;tx<b.x1;tx++)if(!D.isSol(tx,ty))tiles.push([tx,ty]);R.floor=tiles.length;R.area=(b.x1-b.x0-1)*(b.y1-b.y0-1);
const inZ=(tx,ty)=>L.zones.some(z=>tx>=z[0]&&tx<=z[2]&&ty>=z[1]&&ty<=z[3]);
const sight=D.lgM('sight');
const cover=(rm)=>{const out=new Map();for(const [tx,ty] of tiles){out.set(tx+','+ty,{g:0,c:0,any:0})}
 let n=0;for(let k=0;k<rec.length;k+=2){n++;const r=rec[k];
  for(const [tx,ty] of tiles){const cx=tx*T+16,cy=ty*T+16,o=out.get(tx+','+ty);let sg=false,sc=false;
   for(const q of r.g){if(q&&D.canSee(q[0],q[1],q[2],q[3],q[4]*rm*sight,cx,cy)){sg=true;break}}
   for(let i=0;i<ncam;i++){const c=camsA[i],a=c.a0+Math.sin(r.t*c.sp+i*1.7)*c.amp;if(D.canSee(c.x,c.y,a,c.fov,c.rng*rm*sight,cx,cy)){sc=true;break}}
   if(sg)o.g++;if(sc)o.c++;if(sg||sc)o.any++}}
 for(const o of out.values()){o.g/=n;o.c/=n;o.any/=n}return out};
const cv={};cv.full=cover(1);cv.sneak=cover(.65);
const sum=(m)=>{let g0=0,g10=0,g25=0,c0=0,c10=0,a0=0,a10=0,cz=0,nz=0,both=0,lg=0,nl=0;const n=tiles.length;
 for(const [tx,ty] of tiles){const o=m.get(tx+','+ty);if(o.g>0)g0++;if(o.g>=.1)g10++;if(o.g>=.25)g25++;if(o.c>0)c0++;if(o.c>=.1)c10++;if(o.any>0)a0++;if(o.any>=.1)a10++;if(o.g>0&&o.c>0)both++;if(inZ(tx,ty)){nz++;if(o.c>0)cz++}if(tx>=18+dx){nl++;if(o.g>0)lg++}}
 return{g0:g0/n,g10:g10/n,g25:g25/n,c0:c0/n,c10:c10/n,any0:a0/n,any10:a10/n,both:both/n,czone:nz?cz/nz:null,lasG:nl?lg/nl:null,nl}};
R.cov={full:sum(cv.full),sneak:sum(cv.sneak)};
// Freie Sichtlinie: Mittel ueber Stichprobenkacheln der Galerien (jede 4. Kachel, 16 Richtungen, Strahl bis 20 Kacheln, in Schritten von 8 px gegen D.los)
{const sg=[];let k=0;for(const [tx,ty] of tiles){if(!inZ(tx,ty)&&(tx<=(L.q?L.q.ww:9)||tx>=18+dx)&&(k++%4===0)){const cx=tx*T+16,cy=ty*T+16;let sum=0;for(let a=0;a<16;a++){const an=a*Math.PI/8;let d=0;for(;d<640;d+=16)if(!D.los(cx,cy,cx+Math.cos(an)*(d+16),cy+Math.sin(an)*(d+16)))break;sum+=d}sg.push(sum/16/T)}}
 R.sight=sg.length?sg.reduce((a,b)=>a+b,0)/sg.length:null;
 const big=[];k=0;for(const [tx,ty] of tiles){if(tx<=(L.q?L.q.ww:9)||tx>=18+dx){if(k++%4===0){const cx=tx*T+16,cy=ty*T+16;let m=0;for(let a=0;a<16;a++){const an=a*Math.PI/8;let d=0;for(;d<640;d+=16)if(!D.los(cx,cy,cx+Math.cos(an)*(d+16),cy+Math.sin(an)*(d+16)))break;m=Math.max(m,d)}big.push(m/T)}}}
 R.sightMax=big.length?big.reduce((a,b)=>a+b,0)/big.length:null}
// Wege (Dijkstra, 8er, keine Ecken schneiden). Sperren: fest (Waende), Laser, Beobachtung ueber Schwellen
const lasers=L.lasers,laserTile=(tx,ty)=>lasers.some(l=>{const ax=l[0],ay=l[1],bx=l[2],by=l[3],vx=bx-ax,vy=by-ay,t=Math.max(0,Math.min(1,((tx+.5-ax)*vx+(ty+.5-ay)*vy)/(vx*vx+vy*vy)));return Math.hypot(tx+.5-ax-vx*t,ty+.5-ay-vy*t)<.62});
const ok0=new Set(tiles.map(t=>t[0]+','+t[1]));
function dij(starts,allow){const dist=new Map(),q=[];for(const s of starts){dist.set(s[0]+','+s[1],0);q.push([0,s[0],s[1]])}
 while(q.length){q.sort((a,b)=>a[0]-b[0]);const [d,x,y]=q.shift();if(d>dist.get(x+','+y))continue;for(let ddx=-1;ddx<=1;ddx++)for(let ddy=-1;ddy<=1;ddy++){if(!ddx&&!ddy)continue;const nx=x+ddx,ny=y+ddy;if(!allow(nx,ny))continue;if(ddx&&ddy&&(!allow(x+ddx,y)||!allow(x,y+ddy)))continue;const nd=d+(ddx&&ddy?1.414:1);const k=nx+','+ny;if(nd<(dist.has(k)?dist.get(k):1e9)){dist.set(k,nd);q.push([nd,nx,ny])}}}return dist}
const dd=Math.floor(L.spawn.x/T),start=[[dd,b.y1-1],[dd+1,b.y1-1]],back=L.backDoors&&L.backDoors[0]?[[L.backDoors[0][0],L.backDoors[0][1]+1]]:[];
const its=D.get().its,goods=its.filter(i=>i.t==='good'),bund=its.filter(i=>i.t==='bundle'),sw=its.filter(i=>i.t==='sw');
const tgt=(it)=>{const a=[];for(const [tx,ty] of tiles){const cx=Math.max(tx*T+9,Math.min(tx*T+T-9,it.x)),cy=Math.max(ty*T+9,Math.min(ty*T+T-9,it.y));if(Math.hypot(cx-it.x,cy-it.y)<(it.r||44)*.9)a.push(tx+','+ty)}return a};
const targets=goods.map(i=>({k:i.k,t:tgt(i)})).concat(bund.map(i=>({k:'bundle',t:tgt(i)})),sw.map(i=>({k:'sw',t:tgt(i)})));
const modes={
 laserOnly:(tx,ty)=>ok0.has(tx+','+ty)&&!laserTile(tx,ty),
 noLaserBlock:(tx,ty)=>ok0.has(tx+','+ty)};
const mk=(cvm,cT,gT,lz)=>(tx,ty)=>{const k=tx+','+ty;if(!ok0.has(k))return false;if(lz&&laserTile(tx,ty))return false;const o=cvm.get(k);return o.c<=cT&&o.g<=gT};
const modelDefs={
 free:mk(cv.sneak,1,1,false),
 freeLaser:mk(cv.sneak,1,1,true),
 camStrictOnly:mk(cv.sneak,0,1,true),
 camStrictGuard50:mk(cv.sneak,0,.5,true),
 camStrictGuard25:mk(cv.sneak,0,.25,true),
 camStrictGuard10:mk(cv.sneak,0,.1,true),
 camStrictGuard0:mk(cv.sneak,0,0,true),
 cam35Guard35:mk(cv.sneak,.35,.35,true)};
R.path={};
for(const [name,al] of Object.entries(modelDefs)){const d=dij(start,al),d2=dij(back.concat(start),al);const o={};
 for(const t of targets){const best=Math.min(...t.t.map(k=>d.has(k)?d.get(k):1e9)),best2=Math.min(...t.t.map(k=>d2.has(k)?d2.get(k):1e9));(o[t.k]=o[t.k]||[]).push([best<1e8?+best.toFixed(1):null,best2<1e8?+best2.toFixed(1):null])}
 R.path[name]=o}
// Ausstiegsweg Haupttuer erreichbar nach Beute? (Rueckweg symmetrisch, ignoriert)
// Lauf: Tuer -> naechstes Gemaelde der Westgalerie -> stehlen -> Tuer, sneak 50 px/s bzw. gehen 85
const arts=goods.filter(i=>i.k==='art'),spawn=[L.spawn.x,L.spawn.y];
const route=(a,b2)=>{const p=D.pathTo(a[0],a[1],Math.floor(b2[0]/T),Math.floor(b2[1]/T));let d=0,x=a[0],y=a[1];for(const q of p){d+=Math.hypot(q[0]-x,q[1]-y);x=q[0];y=q[1]}return{d,p}};
const spotFor=(it)=>{let best=1e9,at=null;for(let ddy=-3;ddy<=3;ddy++)for(let ddx=-3;ddx<=3;ddx++){const tx=Math.floor(it.x/T)+ddx,ty=Math.floor(it.y/T)+ddy;if(D.isSol(tx,ty)||laserTile(tx,ty))continue;const cx=Math.max(tx*T+9,Math.min(tx*T+T-9,it.x)),cy=Math.max(ty*T+9,Math.min(ty*T+T-9,it.y)),dd2=Math.hypot(cx-it.x,cy-it.y);if(dd2>=(it.r||44)*.95)continue;const pl=D.pathTo(spawn[0],spawn[1],tx,ty).length;if(!pl)continue;const sc=pl+dd2*.05;if(sc<best){best=sc;at=[cx,cy]}}return at};
const spots=arts.map(a=>({a,at:spotFor(a)})).filter(s=>s.at);
let plan=null;if(spots.length){let bd=1e9,bs=null;for(const s of spots){const r=route(spawn,s.at);if(r.d<bd){bd=r.d;bs=s}}plan={s:bs,go:route(spawn,bs.at),back:null};plan.back=route(bs.at,[spawn[0],spawn[1]-0])}
const samples=(a,p,speed)=>{const out=[];let x=a[0],y=a[1];for(const q of p){const d=Math.hypot(q[0]-x,q[1]-y),n=Math.max(1,Math.round(d/speed*HZ));for(let i=1;i<=n;i++)out.push([x+(q[0]-x)*i/n,y+(q[1]-y)*i/n]);x=q[0];y=q[1]}return out};
R.run=null;
if(plan){R.runLen=[plan.go.d/T,plan.back.d/T];const N=rec.length;
 const res={};
 for(const mode of ['sneak','walk']){const sp=mode==='sneak'?50:85,rm=mode==='sneak'?.65:1,kf=mode==='sneak'?.8:1;
  const legs=[];const goS=samples(spawn,plan.go.p,sp),bkS=samples(plan.s.at,plan.back.p,sp);
  goS.forEach(p=>legs.push([p[0],p[1],0]));for(let i=0;i<Math.round(CFGt()*HZ);i++)legs.push([plan.s.at[0],plan.s.at[1],1]);bkS.forEach(p=>legs.push([p[0],p[1],0]));
  const seenBy=(idx,p)=>{const r=rec[idx%N];const ins=p[1]<(L.bld.y1+.7)*T&&p[1]>L.bld.y0*T;let g=false,c=false,gj=false;if(!ins)return[false,false,false,false];for(const q of r.g){if(!q)continue;if(D.canSee(q[0],q[1],q[2],q[3],q[4]*rm*sight,p[0],p[1])){g=true;if(D.canSee(q[0],q[1],q[2],Math.min(q[3],.8),260*rm*sight,p[0],p[1])){gj=true;break}}}
   for(let i=0;i<ncam;i++){const cc=camsA[i],a=cc.a0+Math.sin(r.t*cc.sp+i*1.7)*cc.amp;if(D.canSee(cc.x,cc.y,a,cc.fov,cc.rng*rm*sight,p[0],p[1])){c=true;break}}return[g,c,true,gj]};
  // Sicht je Schritt vorab (unabhaengig vom Startindex nicht moeglich, daher je Start berechnen)
  const models={cur:{g:56,c:'hot'},v2:{g:56,c:26},jwInst:{g:1e3,c:0,j:1},jwInstCam:{g:1e3,c:1e3,j:1},jwCur:{g:56,c:'hot',j:1},gOnlyInst:{g:1e3,c:0},camInstOnly:{g:0,c:1e3},bothInst:{g:1e3,c:1e3},bothHalf:{g:200,c:200},gInstCamHot:{g:1e3,c:'hot'}};
  const acc={};for(const k in models)acc[k]=0;let n=0;
  const any={};for(const k in models)any[k]=0;for(let s0=0;s0<N-legs.length-1&&n<150;s0+=Math.max(1,Math.floor(N/150))){n++;const see=legs.map((p,i)=>seenBy(s0+i,p));
   for(const [k,m] of Object.entries(models)){let sus=0,fail=false;for(let i=0;i<legs.length;i++){const [g0,c,ins,gj]=see[i];const g=m.j?gj:g0;if(!ins){sus=Math.max(0,sus-9/HZ);continue}let rate=0;if(g)rate=Math.max(rate,m.g*kf);if(c){const cr=m.c==='hot'?((legs[i][2]===1||inZ(Math.floor(legs[i][0]/T),Math.floor(legs[i][1]/T)))?26*kf:0):m.c;if(cr)rate=Math.max(rate,cr)}
     sus=Math.max(0,Math.min(100,sus+(rate?rate-9:-9)/HZ));if(sus>=100){fail=true;break}}
    if(!fail){acc[k]++;any[k]=1}}}
  const o={n};for(const k in acc){o[k]=+(acc[k]/n).toFixed(3);o[k+'_any']=any[k]}res[mode]=o}
 R.run=res}
function CFGt(){return D.CFG.goods.art.t1}
return R}`;
function aggregate(FILES){
let A=[];for(const f of FILES)A=A.concat(JSON.parse(fs.readFileSync(f,'utf8')));
const n=A.length,q=(a,p)=>{a=a.filter(x=>x!=null).sort((x,y)=>x-y);return a.length?+a[Math.min(a.length-1,Math.floor(p*a.length))].toFixed(2):null};
const st=(a)=>{const b=a.filter(x=>x!=null);return{n:b.length,min:q(b,0),p10:q(b,.1),med:q(b,.5),p90:q(b,.9),max:q(b,1),mean:+(b.reduce((s,x)=>s+x,0)/(b.length||1)).toFixed(2)}};
console.log('n',n);
const cnt=(f)=>{const m={};A.forEach(r=>{const k=f(r);m[k]=(m[k]||0)+1});return m};
console.log('tod',cnt(r=>r.tod),'hall',cnt(r=>r.hall),'classic',A.filter(r=>!r.q).length);
console.log('lg',cnt(r=>r.lg.join('+')||'-'),'ev',cnt(r=>r.ev.join('+')||'-'));
console.log('guards0',cnt(r=>r.guards0),'guardsMax',cnt(r=>r.guardsMax),'cams',cnt(r=>r.cams));
console.log('gRng/gFov',cnt(r=>r.gRng+'/'+r.gFov));
console.log('hash distinct',new Set(A.map(r=>r.M.join('\n'))).size,'params distinct',new Set(A.map(r=>r.hall+JSON.stringify(r.q))).size,'size distinct',new Set(A.map(r=>r.bld.x1+'x'+r.bld.y1)).size);
console.log('ww',cnt(r=>r.q?r.q.ww:9),'ew',cnt(r=>r.q?r.q.ew:9),'dy',cnt(r=>r.q?r.q.dy:0),'vx',cnt(r=>r.q?r.q.vx:0));
console.log('size',cnt(r=>(r.bld.x1+1)+'x'+(r.bld.y1+1)));
console.log('Sichtlinie (Mittel ueber 16 Strahlen, Kacheln)',st(A.map(r=>r.sight)),'laengster Strahl im Mittel',st(A.map(r=>r.sightMax)));
console.log('area',st(A.map(r=>r.area)),'floor',st(A.map(r=>r.floor)));
// Aehnlichkeit
let diffs=[];const NP=Math.min(60,A.length);for(let i=0;i<NP;i++)for(let j=i+1;j<NP;j++){const a=A[i].M,b=A[j].M;const h=Math.min(a.length,b.length),w=Math.min(a[0].length,b[0].length);let d=0,t=0;for(let y=0;y<h;y++)for(let x=0;x<w;x++){t++;if(a[y][x]!==b[y][x])d++}diffs.push(d/t)}
console.log('paarweise Rasterabweichung (60 Karten, 1770 Paare)',st(diffs));
const same=A.filter((r,i)=>A.findIndex(s=>s.M.join('')===r.M.join(''))!==i).length;console.log('gleiche Raster doppelt',same);
// Wachen
const multi=A.filter(r=>r.nSync>0);console.log('seeds mit >=2 Wachen gleichzeitig',multi.length);
console.log('gMinSync',st(multi.map(r=>r.gMinSync)),'gMinTrace',st(multi.map(r=>r.gMinTrace)),'gClose4',st(multi.map(r=>r.gClose4)),'gClose8',st(multi.map(r=>r.gClose8)));
{const p=A.filter(r=>r.gMin01!=null);if(p.length)console.log('Wachen 0 und 1 (die ersten beiden):',p.length,'Seeds, Abstand <9,9:',p.filter(r=>r.gMin01<9.9).length,'(',(p.filter(r=>r.gMin01>=9.9).length/p.length*100).toFixed(0)+' % ab 9,9 ), kleinster',Math.min(...p.map(r=>r.gMin01)).toFixed(2));const e2=A.filter(r=>r.guardsMax===2&&r.nSync>0);console.log('genau zwei Wachen:',e2.length,'Seeds, Abstand <9,9:',e2.filter(r=>r.gMinSync<9.9).length)}
console.log('multi: gMinSync<2',multi.filter(r=>r.gMinSync<2).length,'<4',multi.filter(r=>r.gMinSync<4).length,'gMinTrace<2',multi.filter(r=>r.gMinTrace<2).length,'<1',multi.filter(r=>r.gMinTrace<1).length);
console.log('gMinLaser',st(A.map(r=>r.gMinLaser)),'laser<1.5',A.filter(r=>r.gMinLaser<1.5).length);
console.log('cMin',st(A.map(r=>r.cMin)),'cNN',st(A.map(r=>r.cNN)),'cClose6 pairs',st(A.map(r=>r.cClose6)),'seeds with pair<6',A.filter(r=>r.cClose6>0).length);
for(const m of ['full','sneak']){console.log('COV',m);for(const k of ['g0','g10','g25','c0','c10','any0','any10','both','czone','lasG'])console.log(' ',k,JSON.stringify(st(A.map(r=>r.cov[m][k]))))}
// Wege
const tg=['art','statue','relic','bundle','sw'];
for(const mod of Object.keys(A[0].path)){const o={};for(const t of tg){let tot=0,okc=0,okAny=0,okMain=0;A.forEach(r=>{const arr=r.path[mod][t];arr.forEach(([a,b])=>{tot++;if(a!=null)okMain++;if(b!=null)okAny++});});o[t]=[+(okMain/tot*100).toFixed(0),+(okAny/tot*100).toFixed(0)]}
 // mind. ein Gemaelde / Anteil Seeds mit allem erreichbar
 const anyArt=A.filter(r=>r.path[mod].art.some(x=>x[0]!=null)).length/n,allArt=A.filter(r=>r.path[mod].art.every(x=>x[0]!=null)).length/n,swOk=A.filter(r=>r.path[mod].sw[0][0]!=null).length/n;
 console.log(mod,'Ziele erreichbar % [Haupttuer, mit Hintertuer]',JSON.stringify(o),'Seeds: min. 1 Gemaelde',(anyArt*100).toFixed(0)+'%','alle 4',(allArt*100).toFixed(0)+'%','Schalter',(swOk*100).toFixed(0)+'%')}
// Laeufe
for(const mode of ['sneak','walk']){const o={};for(const k of Object.keys(A.find(r=>r.run).run[mode]).filter(k=>k!=='n'))o[k]=st(A.filter(r=>r.run).map(r=>r.run[mode][k]));console.log('RUN',mode,'seeds',A.filter(r=>r.run).length);for(const k in o)console.log(' ',k,JSON.stringify(o[k]))}
// nach Wachenzahl
for(const mode of ['sneak','walk']){const keys=Object.keys(A.find(r=>r.run).run[mode]).filter(k=>k.endsWith('_any'));console.log('ANY',mode,keys.map(k=>k+'='+(A.filter(r=>r.run).reduce((a,r)=>a+r.run[mode][k],0)/n*100).toFixed(0)+'%').join(' '))}
for(const g of [1,2,3]){const s=A.filter(r=>r.run&&r.guards0===g);if(!s.length)continue;console.log('Wachen',g,'n',s.length,'sneak',Object.keys(s[0].run.sneak).filter(k=>k!=='n').map(k=>k+'='+(s.reduce((a,r)=>a+r.run.sneak[k],0)/s.length).toFixed(2)).join(' '))}
console.log('runLen',st(A.filter(r=>r.runLen).map(r=>r.runLen[0])));

}
(async()=>{
 if(process.argv[2]==='agg'){aggregate(process.argv.slice(3));return}
 const [,, from, cnt, outf]=process.argv;
 const env=await launch();const page=await openGame(env);
 const out=[];
 for(let i=0;i<+cnt;i++){const sd=3+(+from+i)*11;
  const r=await page.evaluate(new Function('return '+FN)(),[sd,120]);
  out.push(r);if(i%10===9){fs.writeFileSync(outf,JSON.stringify(out));console.error('seed',i+1)}}
 fs.writeFileSync(outf,JSON.stringify(out));
 console.error('errors',page.errors.slice(0,3));
 await env.browser.close();env.srv.close();
})();
