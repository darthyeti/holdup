// Kartenpruefung fuer Holdup (nur mit index.html#debug nutzbar, setzt window.__dbg).
// Laden im Browser: fetch('tools/mapcheck.js').then(r=>r.text()).then(eval)
// Dann: mapcheck.check('gas',123) liefert einen Bericht, mapcheck.sweep('gas',60) prueft viele Seeds, mapcheck.ascii() zeigt das Raster.
// Geprueft wird per Flutfuellung vom Spielerstart (Tresortuer und Hintertueren zaehlen als offen): Items, Posten, Wagenplaetze, Fluchtzone, Wachrouten, Kassierer, Kameras, dazu die Beute-Summe.
(function(){
const D=__dbg,T=32;
function build(sc,seed,lage){D.setScenario(sc);D.setSeedMode('random');if(lage!==undefined)D.setLage(lage);D.buildLay(D.layoutFor(seed))}
function fill(sx,sy,pass){const w=D.world(),seen=new Set([sx+','+sy]),q=[[sx,sy]];let h=0;
 while(h<q.length){const c=q[h++];for(const v of[[1,0],[-1,0],[0,1],[0,-1]]){const nx=c[0]+v[0],ny=c[1]+v[1],k=nx+','+ny;if(seen.has(k)||!pass(nx,ny))continue;seen.add(k);q.push([nx,ny])}}return seen}
function check(sc,seed,lage){build(sc,seed,lage);const w=D.world(),L=D.LAY(),G=D.get(),rep={sc,seed,lg:L.mission.lg,err:[],info:{}};
 const pass=(x,y)=>{if(w.isSol(x,y)){const c=w.cell(x,y);return c==='L'||c==='V'||c==='u'&&false}return true};
 const st=[Math.floor(L.spawn.x/T),Math.floor(L.spawn.y/T)],R=fill(st[0],st[1],pass);
 const has=(tx,ty)=>R.has(tx+','+ty);
 // Erreichbar heisst: auf einer begehbaren Kachel kann man so stehen, dass der Abstand zum Item kleiner als r ist (Kachelrand statt Kachelmitte, Figurenradius 9 ab Wand)
 const near=(x,y,r)=>{for(let dy=-4;dy<=4;dy++)for(let dx=-4;dx<=4;dx++){const tx=Math.floor(x/T)+dx,ty=Math.floor(y/T)+dy;if(!has(tx,ty))continue;const cx=Math.max(tx*T+3,Math.min(tx*T+T-3,x)),cy=Math.max(ty*T+3,Math.min(ty*T+T-3,y));if(Math.hypot(cx-x,cy-y)<r*.95)return true}return false};
 // Items
 let n=0;for(const it of G.its){if(it.t==='bar'||it.t==='wbar'||it.t==='lock'||it.t==='cam'&&false)continue;n++;if(!near(it.x,it.y,it.r||44))rep.err.push('Item nicht erreichbar: '+it.t+(it.k?'/'+it.k:'')+' bei '+Math.round(it.x/T*10)/10+','+Math.round(it.y/T*10)/10)}
 rep.info.items=n;
 // Polizei: Aussteigepunkt und Posten
 const lane=[Math.floor(120/T),Math.floor((L.laneY-44)/T)];
 const sidewalk=fill(Math.floor(L.slots.E[0]*1),Math.floor((L.laneY-44)/T),pass);
 for(const p of L.posts){const k=p.x+','+p.y;if(w.isSol(p.x,p.y))rep.err.push('Posten steht in Festem: '+k);else if(!sidewalk.has(k))rep.err.push('Posten von der Strasse nicht erreichbar: '+k)}
 // Der Wagen steht mit der Mitte auf slot*T+16 und ist 4 Kacheln breit (slot-1 .. slot+2)
 const sl=[].concat(L.slots.W,L.slots.E);for(const x of sl)for(let k=-1;k<=2;k++)if(w.isSol(x+k,Math.floor(L.laneY/T))){rep.err.push('Wagenplatz blockiert: '+x);break}
 // Fluchtzone und Wagen
 const ex=[L.exit.tx+2,Math.floor(L.van.y/T)];if(!has(ex[0],ex[1]))rep.err.push('Fluchtzone nicht erreichbar');
 // Routen, Kassierer, Tresor, Kameras
 const pt=(a,nm)=>{if(!a)return;if(w.isSol(a[0],a[1])||!has(a[0],a[1]))rep.err.push(nm+' nicht begehbar: '+a)};
 (L.guards||[]).forEach((g,i)=>g.route.forEach(r=>pt(r,'Wachroute '+i)));if(L.mgr)L.mgr.route.forEach(r=>pt(r,'Managerroute'));(L.tellers||[]).forEach(t=>pt(t,'Kassierer'));
 (L.vault.bundles||[]).forEach(b=>pt(b,'Tresorbuendel'));(L.mission.extra||[]).forEach((x,i)=>{pt(x.p,'Wachwechsel-Start');x.route.forEach(r=>pt(r,'Wachwechsel-Route '+i))});(L.pumps||[]).forEach(q=>{if(w.cell(q.x,q.y)!=='u')rep.err.push('Zapfsaeule fehlt: '+q.x+','+q.y)});
 for(const c of L.cams)if(!has(Math.floor(c.x/T),Math.floor(c.y/T))&&!has(Math.floor(c.x/T),Math.floor(c.y/T)+1)&&!has(Math.floor(c.x/T),Math.floor(c.y/T)-1))rep.err.push('Kamera ohne Boden in der Naehe: '+Math.round(c.x/T)+','+Math.round(c.y/T));
 // Zusammenfassung
 let loot=0,units=0;for(const it of G.its){}
 rep.info.wins=(L.wins||[]).length;rep.info.snp=(L.snp||[]).length;rep.info.spots=(L.spots||[]).length;rep.info.posts=L.posts.length;rep.info.cams=L.cams.length;rep.info.guards=(L.guards||[]).length;rep.info.civ=L.civ;rep.info.reach=R.size;
 const goods=(L.goods||[]).map(g=>D.CFG.goods[g.k]);rep.info.goodsV=goods.reduce((s,g)=>s+g.v,0);rep.info.goodsU=goods.reduce((s,g)=>s+g.u,0);
 const bn=L.bn||D.CFG.bundle;rep.info.vaultV=bn.n*bn.v;rep.info.tills=L.tills.length;rep.info.atms=L.atms.length;
 return rep}
function sweep(sc,n,from){const out={n,fail:0,errs:{},tags:{}};for(let i=0;i<n;i++){const seed=(from||1)+i*37,r=check(sc,seed);for(const l of r.lg)out.tags[l]=(out.tags[l]||0)+1;if(r.err.length){out.fail++;for(const e of r.err){const k=e.replace(/[0-9.,-]+/g,'#');(out.errs[k]=out.errs[k]||[]).push(seed)}}}return out}
function ascii(x0,y0,x1,y1){const w=D.world(),rows=[];const X0=x0==null?w.WX0:x0,Y0=y0==null?w.WY0:y0,X1=x1==null?w.WX0+w.W-1:x1,Y1=y1==null?w.WY0+w.H-1:y1;
 let hdr='    ';for(let x=X0;x<=X1;x++)hdr+=(x%10===0?String(Math.abs(x)%100/10|0):' ');rows.push(hdr);hdr='    ';for(let x=X0;x<=X1;x++)hdr+=Math.abs(x)%10;rows.push(hdr);
 for(let y=Y0;y<=Y1;y++){let r=String(y).padStart(3)+' ';for(let x=X0;x<=X1;x++)r+=w.cell(x,y)==='o'?'.':w.cell(x,y);rows.push(r)}return rows.join('\n')}
window.mapcheck={check,sweep,ascii,build};
})();
