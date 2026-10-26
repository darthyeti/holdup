// Treffpunkt-Messung fuer Holdup (MRU 1 D0, docs/major-release-update-1.md): Wie viel Platz hat jede Karte fuer einen zweiten oder entfernten Treffpunkt des Fluchtwagens?
// Nur messen, am Spiel aendert das Werkzeug nichts. Nur mit index.html#debug nutzbar (setzt window.__dbg). Laden im Browser: fetch('tools/treffpunkt.js').then(r=>r.text()).then(eval)
// Aufruf: treffpunkt.table('jewel',300) gibt je Halle eine Zeile mit Hoefen, Wegen und Kandidaten (Lage S, siehe unten), treffpunkt.measure(lay) misst eine Karte, treffpunkt.run(sc,seeds,lagen) alle Lagen.
// Ein Treffpunkt ist der Fluchtwagen (4 x 2 Kacheln) mit seiner Zone (4 x 4 Kacheln um den Wagen). Kandidat: Wagen und Zone liegen auf Kacheln, die ein Generator freiraeumen kann (Boden o, Zaun f, Pflanze p, Fass q, Kiste k, Auto v),
// ausserhalb des Gebaeudes und der Wagenplaetze der Polizei, und die Zeile bis zum Weltrand ist ebenso frei (der Wagen faehrt am Rand ein, ein Zaun dort wird zum Tor, wie es clearLane heute tut).
// Weg = Schritte (4 Nachbarn) ueber begehbare Aussenkacheln, Tueren L zaehlen als offen. d: von der Aussenkachel der Fluchttuer zur ersten Zonenkachel am Wagen. e (pVE): von der Tresor-Standkachel dorthin, wie validateMap.pathVE (Richtwert 8 bis 28).
// Klassen nach Lage der Zone zum Gebaeude, in Strassenachsen (laengs/quer): A Hof auf der Fluchtseite, B Hof am anderen Ende, R Rueckseite (quer, Seite ohne Strasse), V Strassenseite (quer, zwischen Gebaeude und Strasse).
// Drehen und Spiegeln (turnLayout) aendert die Zahlen nicht (Geometrie gleich bis auf +-1 Kandidat, Wege bis +-2 Schritte durch das Zielfeld), deshalb misst table nur die Lage S.
(function(){
const D=__dbg,T=32;
function measure(lay,o){o=o||{};
 const w=D.world(),ln=D.laneOf(lay),B=lay.bld,xa=ln.axis==='x';
 const rep=D.validateMap(lay);                       // ruft findSpots (lay.spots)
 const S0=xa?w.WX0:w.WY0,SN=xa?w.W:w.H,C0=xa?w.WY0:w.WX0,CN=xa?w.H:w.W;
 const ch=(s,c)=>xa?w.cell(s,c):w.cell(c,s);
 const bs0=xa?B.x0:B.y0,bs1=xa?B.x1:B.y1,bc0=xa?B.y0:B.x0,bc1=xa?B.y1:B.x1;
 const SOFT=o.cars==='fest'?'ofpqk':'ofpqkv';
 const inB=(s,c)=>s>=bs0&&s<=bs1&&c>=bc0&&c<=bc1;
 const hard=[];for(let i=0;i<SN;i++)hard.push(new Uint8Array(CN));
 for(let s=S0;s<S0+SN;s++)for(let c=C0;c<C0+CN;c++)hard[s-S0][c-C0]=(inB(s,c)||!SOFT.includes(ch(s,c)))?1:0;
 for(const sl of ln.slots)for(const q of sl.cells){const a=ln.st(q[0],q[1]);if(a[0]>=S0&&a[0]<S0+SN&&a[1]>=C0&&a[1]<C0+CN)hard[a[0]-S0][a[1]-C0]=1}
 // Summentabelle der harten Kacheln: Rechteckabfrage in O(1)
 const P=[];for(let i=0;i<=SN;i++)P.push(new Int32Array(CN+1));
 for(let i=0;i<SN;i++)for(let j=0;j<CN;j++)P[i+1][j+1]=P[i][j+1]+P[i+1][j]-P[i][j]+hard[i][j];
 const cnt=(s0,s1,c0,c1)=>{if(s1<s0||c1<c0)return 0;if(s0<S0||s1>=S0+SN||c0<C0||c1>=C0+CN)return 1e9;const a=s0-S0,b=s1-S0+1,c=c0-C0,d=c1-C0+1;return P[b][d]-P[a][d]-P[b][c]+P[a][c]};
 // Liegt der Treffpunkt abseits (lay.meet), ist der haltende Wagen fest (4 x 2 Kacheln), an der Fluchttuer stehen die Kacheln vor den Tueren frei
 const fp=lay.meet?new Set(ln.box(ln.van.stop,ln.van.stop+128,ln.van.pos,32).map(q=>q[0]+','+q[1])):null;
 const walk=(s,c)=>{if(s<S0||s>=S0+SN||c<C0||c>=C0+CN)return false;if(fp&&fp.has((xa?s:c)+','+(xa?c:s)))return false;const k=ch(s,c);if(inB(s,c))return k==='L'||!w.isSol(xa?s:c,xa?c:s);return k==='o'};
 const bfs=(s,c)=>{const dm=new Int16Array(SN*CN).fill(-1),q=[[s,c]];dm[(s-S0)*CN+(c-C0)]=0;for(let h=0;h<q.length;h++){const a=q[h][0],b=q[h][1],d=dm[(a-S0)*CN+(b-C0)];for(const v of[[1,0],[-1,0],[0,1],[0,-1]]){const x=a+v[0],y=b+v[1];if(x<S0||x>=S0+SN||y<C0||y>=C0+CN)continue;const k=(x-S0)*CN+(y-C0);if(dm[k]>=0||!walk(x,y))continue;dm[k]=d+1;q.push([x,y])}}return dm};
 // Ziel liegt in der Zone (Props dort sind Hindernisse der Flutfuellung): Weg bis zum Nachbarn plus ein Schritt
 const dist=(dm,s,c)=>{const g=(a,b)=>(a<S0||a>=S0+SN||b<C0||b>=C0+CN)?-1:dm[(a-S0)*CN+(b-C0)];const d=g(s,c);if(d>=0)return d;let m=1e9;for(const v of[[1,0],[-1,0],[0,1],[0,-1]]){const e=g(s+v[0],c+v[1]);if(e>=0&&e+1<m)m=e+1}return m<1e9?m:-1};
 // Fluchttuer: Aussenkachel (Zelle minus iv), ohne Fluchttuer das heutige Ziel
 const sp=(lay.spots||[]).find(q=>q.ex),door=sp?ln.st(sp.cells[0][0]-sp.iv[0],sp.cells[0][1]-sp.iv[1]):ln.st(ln.exit.goal[0],ln.exit.goal[1]);
 const dmDoor=bfs(door[0],door[1]),gl=ln.st(ln.exit.goal[0],ln.exit.goal[1]),now=dist(dmDoor,gl[0],gl[1]);
 let dmV=null,pveNow=null;if(lay.vault&&lay.vault.door){const st=D.vaultStand(lay),a=ln.st(st[0],st[1]);dmV=bfs(a[0],a[1]);pveNow=dist(dmV,gl[0],gl[1])}
 // Hof = freie Kacheln zwischen Gebaeude und Randzaun (ohne den Zaun)
 const hiEnd=S0+SN-1,courtLo=bs0-(S0+1),courtHi=(hiEnd-1)-bs1,exitHi=ln.exit.dir>0;
 const vn=ln.van,vrow=Math.round(vn.pos/T)-1,vst=Math.floor(vn.stop/T),vanEntry=vn.dir<0?'hi':'lo';
 const rq=ln.side==='S'||ln.side==='E'?1:-1;      // Strasse liegt auf der Seite hoeherer (1) oder niedrigerer (-1) Quer-Kachel
 const mk0=()=>({n:0,max:0,n10:0,ok28:0,ok24:0,ve10:null,dwMax:0,wall:0,wallVE:0,wveMin:null,d1D:0});
 const cls={A:mk0(),B:mk0(),R:mk0(),V:mk0()},byD={};
 const fits=(entry,t,r)=>{if(cnt(t,t+3,r-1,r+2))return false;if(entry==='hi'?(t+4>hiEnd||cnt(t+4,hiEnd,r,r+1)):(t-1<S0||cnt(S0,t-1,r,r+1)))return false;return true};
 const curOk=fits(vanEntry,vst,vrow);        // Gegenprobe der Regeln: der heutige Treffpunkt muss selbst ein Kandidat sein
 const ov=(a0,a1,b0,b1)=>Math.min(a1,b1)-Math.max(a0,b0)+1;
 for(const entry of['hi','lo'])for(let t=S0;t<=S0+SN-4;t++)for(let r=C0+1;r<=C0+CN-3;r++){
  if(!fits(entry,t,r))continue;
  const gs=entry==='hi'?t:t+3,gc=r+1,d=dist(dmDoor,gs,gc);if(d<0)continue;
  const zs0=t,zs1=t+3,zc0=r-1,zc1=r+2;let k;
  if(zs0>bs1)k=exitHi?'A':'B';else if(zs1<bs0)k=exitHi?'B':'A';
  else if(rq>0)k=zc0>bc1?'V':(zc1<bc0?'R':null);else k=zc1<bc0?'V':(zc0>bc1?'R':null);
  if(!k)continue;
  // Zone und Linie: die Flaeche hinter der Linie reicht bis zum Rand, sie darf das Gebaeude nicht enthalten. Im Hof (A, B) faehrt der Wagen deshalb von dem Rand ein, hinter dem die Zone liegt.
  if((k==='A'&&entry!==(exitHi?'hi':'lo'))||(k==='B'&&entry!==(exitHi?'lo':'hi')))continue;
  const c=cls[k],e=dmV?dist(dmV,gs,gc):-1;c.n++;if(d>c.max)c.max=d;
  // am Gebaeude: die Zone grenzt an die Gebaeudebox und teilt mindestens zwei Kacheln Wand mit ihr
  const wall=(k==='A'||k==='B')?((zs0===bs1+1||zs1===bs0-1)&&ov(zc0,zc1,bc0,bc1)>=2):((zc0===bc1+1||zc1===bc0-1)&&ov(zs0,zs1,bs0,bs1)>=2);
  if(wall){c.wall++;if(e>=8&&e<=28){c.wallVE++;if(c.wveMin==null||e<c.wveMin)c.wveMin=e}}
  if(k==='A'&&r===vrow&&entry===vanEntry&&d>c.d1D)c.d1D=d;     // nur laengs der Achse in derselben Zeile
  if(k==='A'&&e>=0){const b=byD[d]=byD[d]||[0,1e9,0];b[0]++;if(e<b[1])b[1]=e;b[2]+=e}
  if(d>=10){c.n10++;if(e>=0&&(c.ve10==null||e<c.ve10))c.ve10=e;if(e>=0&&e<=28){c.ok28++;if(d>c.dwMax)c.dwMax=d}if(e>=0&&e<=24)c.ok24++}}
 return{hall:lay.hall||null,side:ln.side,exitName:ln.exit.name,W:w.W,H:w.H,axis:SN,quer:CN,bld:[bs0,bs1,bc0,bc1],courtExit:exitHi?courtHi:courtLo,courtOther:exitHi?courtLo:courtHi,
  now,pveNow,pveVal:rep.info.pathVE==null?null:rep.info.pathVE,vrow,curOk,cls,byD,errs:rep.err.map(e=>e.r)}}
function layOf(sc,seed,lage){D.setScenario(sc);D.setSeedMode(seed==='classic'?'classic':'random');D.setLage([]);const l0=D.layoutBase(seed);return!lage||lage==='S'?l0:D.turnLayout(l0,lage[0],lage[1]==='+')}
// run: alle genannten Lagen der Seeds, eine Messung je Karte und Lage
function run(sc,seeds,lagen,o){const out=[];for(const s of seeds)for(const sd of lagen||['S']){const m=measure(layOf(sc,s,sd),o);m.sc=sc;m.seed=s;m.lage=sd;out.push(m)}return out}
const srt=a=>a.filter(x=>x!=null).sort((x,y)=>x-y),med=a=>{a=srt(a);return a.length?a[Math.floor(a.length/2)]:null},mm=a=>{a=srt(a);return a.length?[a[0],a[Math.floor(a.length/2)],a[a.length-1]]:null};
const pc=(a,f)=>a.length?Math.round(100*a.filter(f).length/a.length):0;
// table: n Seeds (Schritt 37 ab from), Lage S, gruppiert nach Halle (Bank: Klassik, Ost, West nach Seite der Fluchttuer). Alle Zahlen: [kleinster, mittlerer, groesster Wert ueber die Karten] oder Prozent der Karten.
function table(sc,n,from,o){const seeds=[];for(let i=0;i<n;i++)seeds.push((from||1)+i*37);if(sc==='bank')seeds.unshift('classic');
 const all=run(sc,seeds,['S'],o),g={};for(const m of all){const k=sc==='bank'?(m.seed==='classic'?'Klassik':m.exitName==='Osten'?'Ost':'West'):m.hall;(g[k]=g[k]||[]).push(m)}
 const rows={};for(const k of Object.keys(g).sort()){const a=g[k],cl=c=>({wallPct:pc(a,m=>m.cls[c].wallVE>0),wallVE:med(a.map(m=>m.cls[c].wveMin))});
  const dd=d=>({minE:med(a.map(m=>m.byD[d]&&m.byD[d][1]<1e9?m.byD[d][1]:null)),meanE:med(a.map(m=>m.byD[d]?Math.round(m.byD[d][2]/m.byD[d][0]):null))});
  rows[k]={n:a.length,welt:med(a.map(m=>m.W))+'x'+med(a.map(m=>m.H)),hofFlucht:mm(a.map(m=>m.courtExit)),hofGegen:mm(a.map(m=>m.courtOther)),pveJetzt:mm(a.map(m=>m.pveNow)),
   d1D:mm(a.map(m=>m.cls.A.d1D)),A2D:{pct:pc(a,m=>m.cls.A.ok28>0),dMax:mm(a.map(m=>m.cls.A.dwMax))},B:cl('B'),R:cl('R'),V:cl('V'),pve10:dd(10),pve12:dd(12),pve14:dd(14),
   curOk:pc(a,m=>m.curOk),pveGleich:pc(a,m=>m.pveNow===m.pveVal)}}
 return{sc,n:seeds.length,cars:o&&o.cars||'weich',rows}}
window.treffpunkt={measure,run,table,layOf};
})();
