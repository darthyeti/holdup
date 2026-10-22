// Kartenpruefung fuer Holdup (nur mit index.html#debug nutzbar, setzt window.__dbg).
// Laden im Browser: fetch('tools/mapcheck.js').then(r=>r.text()).then(eval)
// Dann: mapcheck.check('gas',123) liefert einen Bericht, mapcheck.sweep('gas',60) prueft viele Seeds, mapcheck.ascii() zeigt das Raster.
// Geprueft wird per Flutfuellung vom Spielerstart (Tresortuer und Hintertueren zaehlen als offen): Items, Posten, Wagenplaetze, Fluchtzone, Wachrouten, Kassierer, Kameras, dazu die Beute-Summe.
// Dazu validate/vsweep/autocmp fuer den Kartenvertrag (validateMap, autoPosts), siehe docs/karte-und-layout.md, und variety (Vielfalt der Karten je Szenario).
(function(){
const D=__dbg,T=32;
// turn: Strasse auf eine andere Seite legen (turnLayout), 'E', 'N', 'W' oder mit '+' dahinter fuer zusaetzliches Spiegeln laengs der Strasse ('E+')
function lay0(sc,seed,lage,turn){D.setScenario(sc);D.setSeedMode('random');if(lage!==undefined)D.setLage(lage);return turn?D.turnLayout(D.layoutBase(seed),turn[0],turn[1]==='+'):D.layoutFor(seed)}
function build(sc,seed,lage,turn){D.buildLay(lay0(sc,seed,lage,turn))}
function fill(sx,sy,pass){const w=D.world(),seen=new Set([sx+','+sy]),q=[[sx,sy]];let h=0;
 while(h<q.length){const c=q[h++];for(const v of[[1,0],[-1,0],[0,1],[0,-1]]){const nx=c[0]+v[0],ny=c[1]+v[1],k=nx+','+ny;if(seen.has(k)||!pass(nx,ny))continue;seen.add(k);q.push([nx,ny])}}return seen}
function check(sc,seed,lage,turn){build(sc,seed,lage,turn);const w=D.world(),L=D.LAY(),G=D.get(),rep={sc,seed,lg:L.mission.lg,err:[],info:{}};
 const pass=(x,y)=>{if(w.isSol(x,y)){const c=w.cell(x,y);return c==='L'||c==='V'||c==='u'&&false}return true};
 const st=[Math.floor(L.spawn.x/T),Math.floor(L.spawn.y/T)],R=fill(st[0],st[1],pass);
 const has=(tx,ty)=>R.has(tx+','+ty);
 // Erreichbar heisst: auf einer begehbaren Kachel kann man so stehen, dass der Abstand zum Item kleiner als r ist (Kachelrand statt Kachelmitte, Figurenradius 9 ab Wand)
 const near=(x,y,r)=>{for(let dy=-4;dy<=4;dy++)for(let dx=-4;dx<=4;dx++){const tx=Math.floor(x/T)+dx,ty=Math.floor(y/T)+dy;if(!has(tx,ty))continue;const cx=Math.max(tx*T+3,Math.min(tx*T+T-3,x)),cy=Math.max(ty*T+3,Math.min(ty*T+T-3,y));if(Math.hypot(cx-x,cy-y)<r*.95)return true}return false};
 // Items
 let n=0;for(const it of G.its){if(it.t==='bar'||it.t==='bard'||it.t==='wbar'||it.t==='lock'||it.t==='cam'&&false)continue;n++;if(!near(it.x,it.y,it.r||44))rep.err.push('Item nicht erreichbar: '+it.t+(it.k?'/'+it.k:'')+' bei '+Math.round(it.x/T*10)/10+','+Math.round(it.y/T*10)/10)}
 rep.info.items=n;
 // Polizei: Aussteigepunkt und Posten
 const LN=D.LANE(),curb=(LN.slots.find(q=>q.end===LN.ends[1])||LN.slots[0]).curb;   // Aussteigepunkt des ersten Platzes am hohen Ende der Strasse
 const sidewalk=fill(curb[0],curb[1],pass);
 for(const p of L.posts){const k=p.x+','+p.y;if(w.isSol(p.x,p.y))rep.err.push('Posten steht in Festem: '+k);else if(!sidewalk.has(k))rep.err.push('Posten von der Strasse nicht erreichbar: '+k)}
 // Der Wagen steht mit der Mitte auf slot*T+16 und ist 4 Kacheln breit (slot-1 .. slot+2)
 for(const q of LN.slots)for(let k=-1;k<=2;k++){const c=LN.pt(q.u+k,LN.row);if(w.isSol(c[0],c[1])){rep.err.push('Wagenplatz blockiert: '+q.u);break}}
 // Fluchtzone und Wagen
 const ex=LN.pt(LN.exit.tx+2,Math.floor(LN.van.pos/T));if(!has(ex[0],ex[1]))rep.err.push('Fluchtzone nicht erreichbar');
 // Routen, Kassierer, Tresor, Kameras
 const pt=(a,nm)=>{if(!a)return;if(w.isSol(a[0],a[1])||!has(a[0],a[1]))rep.err.push(nm+' nicht begehbar: '+a)};
 (L.guards||[]).forEach((g,i)=>g.route.forEach(r=>pt(r,'Wachroute '+i)));if(L.mgr)L.mgr.route.forEach(r=>pt(r,'Managerroute'));(L.tellers||[]).forEach(t=>pt(t,'Kassierer'));
 (L.vault.bundles||[]).forEach(b=>pt(b,'Tresorbuendel'));(L.mission.extra||[]).forEach((x,i)=>{pt(x.p,'Wachwechsel-Start');x.route.forEach(r=>pt(r,'Wachwechsel-Route '+i))});(L.pumps||[]).forEach(q=>{if(w.cell(q.x,q.y)!=='u')rep.err.push('Zapfsaeule fehlt: '+q.x+','+q.y)});
 for(const c of L.cams){const cx=Math.floor(c.x/T),cy=Math.floor(c.y/T);if(![[0,0],[0,1],[0,-1],[1,0],[-1,0]].some(d=>has(cx+d[0],cy+d[1])))rep.err.push('Kamera ohne Boden in der Naehe: '+Math.round(c.x/T)+','+Math.round(c.y/T))}
 // Zusammenfassung
 let loot=0,units=0;for(const it of G.its){}
 rep.info.wins=(L.wins||[]).length;rep.info.snp=(L.snp||[]).length;rep.info.spots=(L.spots||[]).length;rep.info.posts=L.posts.length;rep.info.cams=L.cams.length;rep.info.guards=(L.guards||[]).length;rep.info.civ=L.civ;rep.info.reach=R.size;
 const goods=(L.goods||[]).map(g=>D.CFG.goods[g.k]);rep.info.goodsV=goods.reduce((s,g)=>s+g.v,0);rep.info.goodsU=goods.reduce((s,g)=>s+g.u,0);
 const bn=L.bn||D.CFG.bundle;rep.info.vaultV=bn.n*bn.v;rep.info.tills=L.tills.length;rep.info.atms=L.atms.length;
 return rep}
function sweep(sc,n,from,turn){const out={n,fail:0,errs:{},tags:{}};for(let i=0;i<n;i++){const seed=(from||1)+i*37,r=check(sc,seed,undefined,turn);for(const l of r.lg)out.tags[l]=(out.tags[l]||0)+1;if(r.err.length){out.fail++;for(const e of r.err){const k=e.replace(/[0-9.,-]+/g,'#');(out.errs[k]=out.errs[k]||[]).push(seed)}}}return out}
function ascii(x0,y0,x1,y1){const w=D.world(),rows=[];const X0=x0==null?w.WX0:x0,Y0=y0==null?w.WY0:y0,X1=x1==null?w.WX0+w.W-1:x1,Y1=y1==null?w.WY0+w.H-1:y1;
 let hdr='    ';for(let x=X0;x<=X1;x++)hdr+=(x%10===0?String(Math.abs(x)%100/10|0):' ');rows.push(hdr);hdr='    ';for(let x=X0;x<=X1;x++)hdr+=Math.abs(x)%10;rows.push(hdr);
 for(let y=Y0;y<=Y1;y++){let r=String(y).padStart(3)+' ';for(let x=X0;x<=X1;x++)r+=w.cell(x,y)==='o'?'.':w.cell(x,y);rows.push(r)}return rows.join('\n')}
// ---- Kartenvertrag (docs/karte-und-layout.md): validateMap, laneOf und autoPosts aus dem Debug-Hook ----
// validate(sc,seed,o): o.light prueft direkt nach layoutFor (ohne Aufbau, 1 ms statt 40 ms), o.lage erzwingt Lage-Tags, o.turn legt die Strasse auf eine andere Seite ('N', 'E', 'W', mit '+' auch laengs gespiegelt). Gibt den Bericht von validateMap zurueck.
function validate(sc,seed,o){o=o||{};let lay;if(o.light){lay=lay0(sc,seed,o.lage,o.turn)}else{build(sc,seed,o.lage,o.turn);lay=D.LAY()}return D.validateMap(lay)}
// vsweep(sc,n,from,o): n Seeds (Schritt 37), je Regel Anzahl, erste Seeds und eine Beispielmeldung, dazu Eingangs-Listen und Spannen der Kennzahlen
function vsweep(sc,n,from,o){const out={sc,n,ok:0,err:{},warn:{},entries:{},range:{}},add=(m,r,seed)=>{const e=m[r.r]=m[r.r]||{n:0,seeds:[],ex:r.m};e.n++;if(e.seeds.length<4)e.seeds.push(seed)};
 for(let i=0;i<n;i++){const seed=(from||1)+i*37,r=validate(sc,seed,o);if(r.ok)out.ok++;r.err.forEach(e=>add(out.err,e,seed));r.warn.forEach(e=>add(out.warn,e,seed));
  if(r.info.entries){const k=r.info.entries.join(' | ');out.entries[k]=(out.entries[k]||0)+1}
  for(const [k,v] of[['pathSV',r.info.pathSV],['pathVE',r.info.pathVE],['loot',r.info.loot&&r.info.loot.v],['cams',r.info.cams],['guards',r.info.guards],['mat',r.info.mat&&r.info.mat[0]-r.info.mat[1]],['slots',r.info.slots],['posts',r.info.posts]])if(v!=null){const g=out.range[k]=out.range[k]||[v,v];g[0]=Math.min(g[0],v);g[1]=Math.max(g[1],v)}}
 return out}
// autocmp(sc,seed,o): vergleicht auf der Basiskarte (Lage S), o.turn nimmt eine andere Lage. Abgeleitete Posten und Wagenplaetze (autoPosts) gegen die Handliste der Karte. Ein Posten gilt als getroffen, wenn der andere Typ innerhalb von 1,5 Kacheln liegt, shiftW/shiftE sind je Hand-Platz die Verschiebung (abgeleitet minus Hand) zum naechsten abgeleiteten Platz.
function autocmp(sc,seed,o){o=o||{};let lay;if(o.light){lay=lay0(sc,seed,undefined,o.turn||'S')}else{build(sc,seed,undefined,o.turn||'S');lay=D.LAY()}
 const A=D.autoPosts(lay),H=lay.posts,P=A.posts,d=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),by=l=>{const c={};l.forEach(p=>c[p.k]=(c[p.k]||0)+1);return c},str=l=>l.map(p=>p.x+','+p.y+p.k);
 const um=H.filter(h=>!P.some(a=>d(a,h)<=1.5)),ex=P.filter(a=>!H.some(h=>d(a,h)<=1.5)),um3=H.filter(h=>!P.some(a=>d(a,h)<=3));
 const R=D.roadOf(lay),ln=D.laneOf(lay),sh=k=>R.slots[k].map(u=>{const c=A.slots[ln.ends[k]];return c.length?c.map(v=>v-u).reduce((a,b)=>Math.abs(b)<Math.abs(a)?b:a):null});
 return{sc,seed,flip:!!lay.flip,hall:lay.hall||null,hand:H.length,auto:P.length,bySide:{hand:by(H),auto:by(P)},hit:H.length-um.length,hit3:H.length-um3.length,handMiss:str(um),autoExtra:str(ex),
  doors:{hand:str(H.filter(p=>p.door)),auto:str(P.filter(p=>p.door))},anchors:{hand:str(H.filter(p=>p.anchor)),auto:str(P.filter(p=>p.anchor))},
  slots:{hand:lay.slots||R.slots,auto:A.slots,shiftW:sh(0),shiftE:sh(1)},order:{hand:H.slice(0,8).map(p=>p.k).join(''),auto:P.slice(0,8).map(p=>p.k).join('')}}}
// Vielfalt je Szenario ueber viele Seeds (Plan Mehr Abwechslung, docs/offen-und-spieltest.md): wie viele verschiedene Huellen (Gebaeudebox, Strasse, Ausgang, Fluchtwagen, Wagenplaetze, Posten, Hintertueren, Tresortuer),
// Gebaeudegroessen, Fluchtvarianten, Beute-Anordnungen, Hallen und Raster (gebaut werden nur die ersten rn Seeds, das Raster kostet am meisten). Aufruf: mapcheck.variety('gas',300,1,13,40)
function variety(sc,n,from,step,rn){n=n||300;from=from||1;step=step||13;rn=rn==null?40:rn;D.setScenario(sc);D.setSeedMode('random');D.setLage([]);
 const S=JSON.stringify,shell=new Set(),size=new Set(),esc=new Set(),loot=new Set(),halls={},grids=new Set();
 for(let i=0;i<n;i++){const lay=D.layoutFor(from+i*step),b=lay.bld;size.add(S(b&&[b.x1-b.x0,b.y1-b.y0]));
  const fl=[lay.road,lay.exit,lay.van];esc.add(S(fl));
  shell.add(S([b,fl,lay.slots,lay.laneY,(lay.posts||[]).map(p=>[p.x,p.y,p.k,!!p.anchor]),lay.backDoors,lay.vault&&lay.vault.door]));
  loot.add(S([lay.vault&&lay.vault.door,lay.goods&&lay.goods.map(g=>[g.k,g.x,g.y]),lay.vit&&lay.vit.length]));
  if(lay.hall)halls[lay.hall]=(halls[lay.hall]||0)+1;
  if(i<rn){D.buildLay(lay);grids.add(D.world().M.join('|'))}}
 return{sc,seeds:n,huelle:shell.size,groessen:size.size,flucht:esc.size,beute:loot.size,hallen:Object.keys(halls).length,hallenVerteilung:halls,raster:grids.size,rasterVon:Math.min(rn,n)}}
window.mapcheck={check,sweep,ascii,build,validate,vsweep,autocmp,variety};
})();
