/* Holdup: Kartenerzeugung (Klassikkarte, Themen, Lage-Tags, genMission, mirrorLayout und turnLayout, genLayout, validLayout, Geldtransporter, Juwelier, Tankstelle, Museum, Casino, finishLay).
   Klassisches Skript ohne Bauschritt, wird vor dem Spielkern in index.html geladen. mkMaps(X) bekommt vom Kern (start() in index.html) einen Kontext X
   (Konstanten und Funktionen des Kerns, dazu Getter fuer das Raster und alles, was sich waehrend einer Partie aendert, ein Setter nur fuer vaultOpen)
   und liefert die Erzeuger, die der Kern braucht. Jede Instanz (auch die Coop-Tests mit mehreren Instanzen in einer Seite) ruft die Fabrik selbst auf, auf Modulebene liegt kein Zustand.
   Das Raster fasst dieses Skript nur ueber newGrid, fill, setc und cell an. Neue Namen aus dem Kern: im Kontextobjekt von mkMaps(...) in index.html nachtragen. Bei geaendertem Kontext
   oder geaenderter Rueckgabe MAPS_API in index.html und mkMaps.api hier erhoehen. Globale Namen (Math, Object, Set) kommen aus dem gemeinsamen Skriptumfeld. */
function mkMaps(X){
const CX=X;//Kontext (lokale Variablen X gibt es im Erzeugercode)
const {CFG,DC_CASINO,DC_CLASSIC,DC_GAS,DC_JEWEL,DC_MUSEUM,OOB,SESSION,T,VH,VW,cell,decorOf,decorPaint,fill,fillDerived,isSol,laneOf,newGrid,pathTo,placeMeet,roadOf,setc,validateMap}=X;
function classicLayout(){newGrid(44,28,-6,-5);
fill(0,0,25,12,'#');fill(1,1,24,11,'.');
fill(1,6,10,6,'C');setc(11,6,'g');
fill(12,1,17,6,'#');fill(13,1,17,4,'.');setc(12,2,'V');setc(12,3,'V');
fill(18,1,18,11,'#');setc(18,9,'d');
fill(19,6,24,6,'#');setc(21,6,'d');
[[25,9],[25,10],[9,12],[10,12],[0,9]].forEach(a=>setc(a[0],a[1],'D'));
const cbd=CFG.map.back==='vault'?11:22;setc(cbd,0,'L');
[3,6,9,20,23].forEach(x=>setc(x,0,'W'));
[2,3,4,13,14,15,16].forEach(x=>setc(x,12,'W'));
[[2,2],[3,2],[8,2],[9,2],[21,2],[22,2],[23,2]].forEach(a=>setc(a[0],a[1],'e'));
[[21,8],[22,8],[23,8]].forEach(a=>setc(a[0],a[1],'m'));
[[3,5],[6,5],[9,5]].forEach(a=>setc(a[0],a[1],'r'));
[[6,9],[12,9]].forEach(a=>setc(a[0],a[1],'P'));
[[1,11],[16,7],[24,11],[24,1]].forEach(a=>setc(a[0],a[1],'p'));
[[13,10],[14,10],[15,10]].forEach(a=>setc(a[0],a[1],'b'));
[[17,10],[17,11]].forEach(a=>setc(a[0],a[1],'A'));
fill(CX.WX0,CX.WY0,CX.WX0+CX.W-1,CX.WY0,'f');fill(CX.WX0,CX.WY0+CX.H-1,CX.WX0+CX.W-1,CX.WY0+CX.H-1,'f');fill(CX.WX0,CX.WY0,CX.WX0,CX.WY0+CX.H-1,'f');fill(CX.WX0+CX.W-1,CX.WY0,CX.WX0+CX.W-1,CX.WY0+CX.H-1,'f');
setc(37,9,'o');setc(37,10,'o');
fill(26,13,36,13,'f');setc(30,13,'o');setc(31,13,'o');
[[14,-2],[15,-2],[14,-3],[27,-3],[28,-3],[-2,-3]].forEach(a=>setc(a[0],a[1],'k'));
[[4,-3],[-4,4],[34,2],[35,2],[36,11],[-5,12]].forEach(a=>setc(a[0],a[1],'q'));
[[-2,1],[-2,4],[-2,8],[-2,11],[-1,-1],[36,-3],[26,11],[8,-1]].forEach(a=>setc(a[0],a[1],'p'));
fill(27,2,30,3,'v');fill(32,6,35,7,'v');
const lay={seed:'classic',decor:decorOf(DC_CLASSIC),bld:{x0:0,y0:0,x1:25,y1:12},winN:[3,6,9,20,23],winS:[2,3,4,13,14,15,16],
mat:(x,y)=>{if(x>=0&&x<=25&&y>=0&&y<=12){
if(x===12&&(y===2||y===3))return'k';
if(x>=13&&x<=17&&y>=1&&y<=4)return'm';
if(x>=19&&x<=24&&y>=1&&y<=5)return'w';
if(x>=19&&x<=24&&y>=7)return'k';
if(y<=5&&x<=11)return'k';return't'}
if(y>=20)return'l';if(y===19)return's';if(y>=15)return'a';if(y>=13)return's';
if(x>=26)return'a';if(x<0)return'l';return'y'},
paintFloor(s){s.fillStyle='rgba(60,45,30,.55)';s.fillRect(9*T-4,11*T+2,2*T+8,T-4);
s.strokeStyle='rgba(255,255,255,.7)';s.lineWidth=2;for(const yy of[9,10]){s.strokeRect(26*T+4,yy*T+4,4*T-8,T-8)}
s.fillStyle='rgba(224,182,40,.8)';s.fillRect(1*T+4,7*T+6,10*T,2);
s.fillStyle='rgba(235,235,225,.5)';for(let i=0;i<4;i++)s.fillRect(0*T+10+i*30,14*T+2,12,2);
},
paintTop(s){decorPaint(s,lay.decor);
s.strokeStyle='rgba(255,255,255,.28)';s.lineWidth=2;for(let i=0;i<4;i++){s.beginPath();s.moveTo(26*T+4,i*T*2+T*0+4);s.lineTo(26*T+34,i*T*2+4);s.stroke()}
s.fillStyle='#3b4048';s.fillRect(24*T+8,7*T+2,16,10);s.fillStyle='#e0b020';s.fillRect(24*T+14,7*T+5,4,4);s.fillStyle='rgba(255,255,255,.25)';s.fillRect(24*T+8,7*T+2,16,1);
},
spawn:{x:9.9*T,y:13.6*T},
zones:[[1,1,11,6],[12,1,17,4],[19,1,24,11],[8,-99,99,-1],[26,-99,99,12]],lobby:[1,7,17,11],
cams:[
{x:1.5*T,y:7.5*T,a0:.62,amp:.55,sp:.55,rng:270,fov:.5},
{x:17.5*T,y:7.5*T,a0:2.45,amp:.5,sp:.5,rng:270,fov:.5},
{x:1.5*T,y:1.5*T,a0:.75,amp:.6,sp:.6,rng:250,fov:.5},
{x:11.5*T,y:1.5*T,a0:1.75,amp:.7,sp:.7,rng:170,fov:.55},
{x:16.5*T,y:-.45*T,a0:3.14,amp:.55,sp:.5,rng:300,fov:.5},
{x:19.5*T,y:-.45*T,a0:0,amp:.55,sp:.45,rng:300,fov:.5},
{x:27.5*T,y:8*T,a0:2.55,amp:.5,sp:.5,rng:260,fov:.5}],
tellers:[[3,4],[6,4],[9,4]],mgr:{p:[20,2],route:[[20,2],[23,4],[21,5],[20,8],[23,10],[20,10]]},theme:mkTheme(0,0,0),guards:[{p:[3,9],route:[[3,9],[9,8],[16,8],[17,9],[20,9],[23,9],[20,7],[16,10],[8,10]]}],civ:6,mission:{code:'4719',vault:'code',guards:1,west:true,cams:7,civ:6,tags:[],ev:[],at:{},extra:[],bags:[],blackoutAt:null},
note:[22,2],mon:[22,8],vault:{door:[12,2],pad:[11,4],dir:1,bundles:[[14,2],[16,2],[14,3],[16,3],[15,4]]},
tills:[[3,5],[6,5],[9,5]],atms:[[17,10],[17,11]],backDoors:[[cbd,0]],
sw:{x:24*T+16,y:7*T+22},exit:{x:26*T,y0:8*T,y1:12*T,dir:1,tx:26},van:{y:10*T,x0:32*T,stop:26*T,dir:-1},flip:false,
posts:[{x:8,y:14,a:-1.57,k:'S'},{x:27,y:8,a:3.14,k:'E',anchor:true},{x:-1,y:9,a:0,k:'W'},Object.assign({x:11,y:-1,a:1.57,k:'N'},cbd===11?{door:[11,0]}:{}),{x:11,y:14,a:-1.57,k:'S'},{x:27,y:11,a:3.14,k:'E',anchor:true},Object.assign({x:22,y:-1,a:1.57,k:'N'},cbd===22?{door:[22,0]}:{}),{x:5,y:14,a:-1.57,k:'S'},
{x:-1,y:6,a:0,k:'W'},{x:5,y:-1,a:1.57,k:'N'},{x:14,y:14,a:-1.57,k:'S'},{x:27,y:6,a:3.14,k:'E',anchor:true},{x:16,y:-1,a:1.57,k:'N'},{x:-1,y:12,a:0,k:'W'},{x:2,y:14,a:-1.57,k:'S'},{x:17,y:14,a:-1.57,k:'S'}],
slots:{W:[15,10,5,0],E:[20,25,30,35]},laneY:18*T,title:{cx:32,ax:190,cy:-10,ay:110}};
return lay}
/* ---- Zufallskarte: Variationen derselben Bank. Alle Groessen kommen aus den Parametern q, CLASSICP ergibt exakt die klassische Bank. ---- */
function mulberry32(a){return()=>{a=(a+0x6D2B79F5)|0;let t=Math.imul(a^(a>>>15),1|a);t=(t+Math.imul(t^(t>>>7),61|t))^t;return((t^(t>>>14))>>>0)/4294967296}}
const CLASSICP={cx:11,vw:5,ew:6,bd:5,ld:5,fd:9,wy:9,ey:9,sd:9,od:21,nt:3,na:2,nb:3,nbun:5,yw:11};
function genParams(r){const ri=(a,b)=>a+Math.floor(r()*(b-a+1)),q={cx:ri(9,13),vw:ri(4,6),ew:ri(5,8),bd:ri(4,6),ld:ri(4,6),yw:ri(9,12)};
const mx1=q.cx+1+q.vw,ex0=mx1+2,ex1=ex0+q.ew-1,ly0=q.bd+2,ly1=q.bd+q.ld+1;
q.fd=ri(6,mx1-6);q.wy=ri(ly0+1,ly1-1);q.sd=ri(ly0+1,ly1-1);q.ey=ri(ly0+1,ly1-2);q.od=ri(ex0+1,ex1-1);
q.nt=Math.min(ri(2,3),Math.floor((q.cx-5)/3)+1);q.na=Math.min(ri(1,3),ly1-q.sd);q.nb=ri(2,3);q.nbun=[4,5,5,6][ri(0,3)];return q}
/* Optik (LAY.theme): Palette je Material, Wand-, Glas-, Tresen-, Tuerfarben und Tageszeit (Licht, Toenung, Dunkelheit). THEMES[0] + TODS[0] ergeben exakt die klassische Optik. */
const SUN0={c:'255,238,196',a:.5,dx:76,dy:151,c2:'255,240,205',a2:.2};
const THEMES=[
{n:'klassik',f:{t:[206,210,208,190,195,196,132],k:[72,84,100],w:[168,122,76],m:[122,128,134],l:[66,106,54],s:[172,170,162],a:[60,62,66],y:[116,112,104]},wall:['#9d988b','#c4bfaf','#b3ae9f','#5e5a50','#6b675c'],glass:['#cfeaf5','#78a9c4'],counter:['#5a3d27','#8a6444'],pillar:['#6b675c','#aaa59a'],door:['#4a3622','#6a6e75']},
{n:'warm',f:{t:[222,206,178,204,188,160,150],k:[104,66,72],w:[150,104,64],m:[150,140,126],l:[78,112,56],s:[190,176,150],a:[64,62,62],y:[134,118,100]},wall:['#b8a98a','#d3c6a8','#c5b698','#7a6e58','#857862'],glass:['#e8dcc0','#9a9ab0'],counter:['#4a3020','#7a5438'],pillar:['#7a6e58','#c2b496'],door:['#3e2a1a','#5a5a60']},
{n:'dunkel',f:{t:[118,124,130,102,108,114,70],k:[46,52,66],w:[112,80,54],m:[96,104,116],l:[56,92,56],s:[130,130,128],a:[48,50,54],y:[96,96,98]},wall:['#7b7f85','#9a9fa6','#8e939a','#44474c','#505358'],glass:['#9fd0e8','#4a7894'],counter:['#2e2a28','#55504c'],pillar:['#55585d','#8b9096'],door:['#2e2a28','#50565c']},
{n:'altbau',f:{t:[190,140,112,170,122,96,110],k:[56,92,76],w:[184,138,84],m:[130,124,118],l:[60,98,50],s:[168,150,130],a:[58,58,60],y:[128,108,92]},wall:['#94604c','#b57a62','#a56d58','#5a362a','#6a4234'],glass:['#d9ecf2','#6f9bb0'],counter:['#4a3022','#7c5a42'],pillar:['#6a4234','#a87c68'],door:['#3b2618','#5e5248']}];
const TODS=[{n:'mittag',tint:null,dark:.58},
{n:'morgen',tint:[150,185,255,.10],dark:.56,sun:{c:'205,225,255',a:.42,dx:-70,dy:151,c2:'215,230,255'}},
{n:'abend',tint:[255,140,60,.15],dark:.62,sun:{c:'255,185,120',a:.55,dx:112,dy:120,c2:'255,205,150'}},
{n:'daemmerung',tint:[70,90,170,.20],dark:.68,sun:{c:'150,170,240',a:.22,dx:40,dy:151,c2:'170,185,240'}},
{n:'nacht',tint:[30,45,110,.26],dark:.80,sun:{c:'140,160,235',a:.16,dx:30,dy:140,c2:'160,175,240',a2:.12}}];
const mkTheme=(ti,di,sty)=>{const b=THEMES[ti],t=TODS[di];return Object.assign({},b,{tod:t.n,tint:t.tint,dark:t.dark,sun:Object.assign({},SUN0,t.sun||{}),sty:sty|0})};
/* Optik Juwelier (Noir): schwarzer Marmor, Gold, Samt. Eigenes Thema, damit die Zufallskarten der Bank unveraendert bleiben. */
const THEME_NOIR={n:'noir',f:{t:[22,20,27,32,29,39,12],k:[104,22,42],w:[66,44,32],m:[62,68,78],l:[38,66,42],s:[148,144,138],a:[50,52,56],y:[104,100,96]},wall:['#2b252f','#3f3745','#352d3b','#1b161e','#221c26'],glass:['#bcd0e6','#6a89ac'],counter:['#2a2226','#cfc8bb'],pillar:['#3a3340','#6a5f72'],door:['#2a2226','#6a5f72']};
const mkThemeOf=(b,di,sty)=>{const t=TODS[di];return Object.assign({},b,{tod:t.n,tint:t.tint,dark:t.dark,sun:Object.assign({},SUN0,t.sun||{}),sty:sty|0})};
const scOf=l=>l.truck?'truck':l.prison?'prison':l.jewel?'jewel':l.gas?'gas':l.museum?'museum':l.casino?'casino':'bank';
/* Texte je Ort: a = Akkusativ fuer die Polizeimeldung, say = Briefing im Feed, focus = Text im Fokus-Overlay */
const PLACE={bank:{a:'die Bank',say:'Erkunde die Bank. Mit F ziehst du die Waffe.',focus:'Erkunde die Bank. Mit F ziehst du die Waffe und startest den Überfall.'},
truck:{a:'den Panzerwagen',say:'Baut aus Kisten, Fässern und Autos Stück für Stück eine Sperre über alle vier Fahrspuren, bevor der Panzerwagen kommt.',focus:'Baut eine Sperre, bevor der Panzerwagen kommt. Mit F ziehst du die Waffe.'},
jewel:{a:'den Juwelier',say:'Erkunde den Juwelier. Vitrinen schneidest du leise auf, mit F ziehst du die Waffe und schlägst sie ein.',focus:'Erkunde den Juwelier. Vitrinen leise aufschneiden, mit F startest du den Überfall.'},
gas:{a:'die Tankstelle',say:'Erkunde die Tankstelle. Die Polizei ist schnell: Nimm mit, was du tragen kannst. Zapfsäulen explodieren, wenn man sie beschießt.',focus:'Erkunde die Tankstelle. Die Polizei ist hier schnell, mit F startest du den Überfall.'},
museum:{a:'das Museum',say:'Nachts im Museum: Dunkel, du siehst nur im Lichtkreis um dich. Wer im Lichtkegel einer Wache steht, fällt sofort auf, wer einen Laser berührt, löst Alarm aus. Der Hauptschalter legt Laser und Kameras 50 s lahm.',focus:'Nachts im Museum. Schleichen lohnt sich, der erste Schuss ist teuer.'},
prison:{a:'das Gefängnis',say:'Gefängnisausbruch: Der Gefangene schleicht aus dem Zellentrakt in den Kontrollraum und öffnet dort die Zellentür. Draußen hält das Team das Tor auf (E am Tor, laut). Dann alle in den Fluchtwagen.',focus:'Gefängnisausbruch. Drinnen leise zum Kontrollraum, draußen das Tor aufhalten.'},
casino:{a:'das Casino',say:'Erkunde das Casino. Chips tauschst du im Überfall am Cage in Geld, sonst zählen sie beim Abgang nur zur Hälfte.',focus:'Erkunde das Casino. Chips tauschst du am Cage, mit F startest du den Überfall.'}};
/* Auftragslage (LAY.mission): eigener Zufallsstrom, aendert die Geometrie nicht. CLASSICM ergibt die klassische Lage. */
const CLASSICM={code:'4719',vault:'code',guards:1,west:true,cams:7,civ:6,noteIdx:1,rot:[0,false,0,false],ev:[],at:{},lg:[]};
/* Lage-Tags: dauerhafte Bedingungen eines ganzen Auftrags (anders als die Ereignisse, die zu einer Zeit eintreten). Jeder bringt Risiko oder Entlastung und meist einen Beute-Faktor. sc: b Bank, j Juwelier, t Transporter, no: schliesst andere Tags aus, d: Text fuers Briefing aus den CFG-Werten. */
const sg=f=>(f>=1?'+':'')+Math.round((f-1)*100)+' %',LAGE={
sicher:{n:'Sicherheitsdienst',sc:'bjgmc',no:['flaute'],d:()=>'Zwei Wachen, mehr Kameras, Schild-Beamte früher. Beute '+sg(CFG.lage.sicher.loot)},
zahltag:{n:'Zahltag',sc:'bjtgc',no:['flaute'],d:()=>'Kassen und Tresor sind voll, aber die Polizei kommt '+(-CFG.lage.zahltag.pol)+' s früher. Beute '+sg(CFG.lage.zahltag.loot)},
flaute:{n:'Flaute',sc:'bjgmc',no:['sicher','zahltag'],d:()=>'Wenig los und wenig Bargeld: Die Polizeiwellen kommen langsamer. Beute '+sg(CFG.lage.flaute.loot)},
nebel:{n:'Nebel',sc:'bjtg',no:['nacht'],d:()=>'Schlechte Sicht für alle: Personal und Kameras sehen weniger, du auch.'},
nacht:{n:'Nacht',sc:'bjtgc',no:['nebel'],d:()=>{const N=CFG.lage.nacht,o=N.per[SCL[scOf(CX.LAY)]]||{},a=['Dunkel: Du siehst weniger weit, Personal und Kameras auch.'];if(o.civ!=null)a.push(o.civ<1?'Kaum Kundschaft.':'Hochbetrieb, mehr Gäste.');if(o.guards)a.push('Eine Wache mehr.');if(o.cams)a.push('Eine Kamera mehr.');if(o.pol)a.push('Ruhige Gegend: Die Polizei kommt '+o.pol+' s später.');if(o.sus)a.push('Mehr Zeugen: Verdacht '+sg(o.sus)+'.');if(o.loot)a.push('Beute '+sg(o.loot)+'.');return a.join(' ')}},
wachsam:{n:'Wachsames Personal',sc:'bjgmc',no:[],d:w=>w?'Die Läden sind gewarnt (lautlose Siege in Folge): Der Verdacht steigt '+Math.round((CFG.lage.wachsam.sus-1)*100)+' % schneller, der Bonus bei lautlosem Raub sinkt auf '+Math.round(CFG.stealthBonus*CX.quietFade()*100)+' %.':'Der Verdacht steigt '+Math.round((CFG.lage.wachsam.sus-1)*100)+' % schneller, dafür '+Math.round((CFG.stealthBonus+CFG.lage.wachsam.stl)*100)+' % Bonus bei lautlosem Raub.'}};
/* Wuerfeln mit eigenem Strom (Seed), damit Karten ohne Tag fuer denselben Seed unveraendert bleiben. lgForce ist nur fuer Tests (dbg.setLage). */
/* Erzwungene Tags der Wachsamkeit (CFG.alert): ab dem Zaehler at, nur in Szenarien, die den Tag kennen. */
const warnTags=()=>CFG.alert.on&&(SESSION.quiet|0)>=CFG.alert.at?[CFG.alert.tag]:[],SCL={bank:'b',jewel:'j',gas:'g',museum:'m',casino:'c',truck:'t',prison:'p'},
/* Welche erzwungenen Tags eine Karte dieses Szenarios jetzt braeuchte (Text), reset baut die Welt neu, wenn die gebaute Karte (gleicher Seed bei Gleiche Karte) davon abweicht */
warnFor=sc=>CX.lgForce?'':warnTags().filter(k=>LAGE[k].sc.includes(SCL[sc]||'b')).join(','),lgN=(ms,k)=>LAGE[k].n+((ms.lgw||[]).includes(k)?' (gewarnt)':'');
function rollLage(sd,sc,nev){const r=mulberry32((((sd|0)*40503)>>>0)^0x6c4e1f27),u=r(),pool=Object.keys(LAGE).filter(k=>LAGE[k].sc.includes(sc)),res=[],fw=CX.lgForce?[]:warnTags().filter(k=>pool.includes(k));
for(const k of fw){pool.splice(pool.indexOf(k),1);for(const x of LAGE[k].no){const i=pool.indexOf(x);if(i>=0)pool.splice(i,1)}}
let n=Math.min(u<CFG.lage.n[0]?0:u<CFG.lage.n[1]?1:2,CFG.lage.max-nev-fw.length);
while(n-->0&&pool.length){const k=pool.splice(Math.floor(r()*pool.length),1)[0];res.push(k);for(const x of LAGE[k].no){const i=pool.indexOf(x);if(i>=0)pool.splice(i,1)}}
return CX.lgForce?CX.lgForce.filter(k=>LAGE[k]&&LAGE[k].sc.includes(sc)):fw.concat(res)}
function genMission(mr,sc,sd){const ri=(a,b)=>a+Math.floor(mr()*(b-a+1)),gw=mr(),m={code:String(ri(1000,9999)),vault:mr()<.15?'drill':'code',guards:gw<.1?0:gw<.75?1:2,west:mr()<.7,cams:ri(5,8),civ:ri(3,9),noteIdx:ri(0,6),rot:[ri(0,8),mr()<.5,ri(0,5),mr()<.5]};
const u=mr(),pool=['wache','strom','streife','transport','feiertag'];m.ev=[];for(let i=0,n=u<.55?0:u<.9?1:2;i<n;i++)m.ev.push(pool.splice(Math.floor(mr()*pool.length),1)[0]);
m.at={wache:ri(25,45),strom:ri(30,60),transport:ri(30,50)};
m.lg=rollLage(sd,sc||'b',m.ev.length);{const fw=CX.lgForce?[]:warnTags().filter(k=>m.lg.includes(k));if(fw.length)m.lgw=fw}if(m.lg.includes('sicher')){m.guards=Math.max(m.guards,CFG.lage.sicher.guards);m.cams=Math.min(9,m.cams+CFG.lage.sicher.cams)}if(m.lg.includes('flaute'))m.civ=Math.max(2,Math.round(m.civ*CFG.lage.flaute.civ));if(m.lg.includes('nacht')){const N=CFG.lage.nacht.per[sc||'b']||{};if(N.civ!=null)m.civ=Math.min(14,Math.max(2,Math.round(m.civ*N.civ)));if(N.guards)m.guards=Math.min(2,m.guards+N.guards);if(N.cams)m.cams=Math.min(9,m.cams+N.cams)}return m}
const rotR=(a,k,rev)=>{const b=a.slice(k%a.length).concat(a.slice(0,k%a.length));return rev?b.reverse():b};
/* Spiegeln links/rechts als Nachbearbeitung eines fertigen Layouts: Raster, alle Koordinaten (Kachel X, Pixel XP), Winkel, Wagenseiten, Fluchtrichtung. */
function mirrorLayout(lay){const Mx=2*CX.WX0+CX.W,X=x=>Mx-1-x,XP=x=>Mx*T-x,t2=a=>[X(a[0]),a[1]];
for(const r of CX.M)r.reverse();
const b=lay.bld,bx0=b.x0,bx1=b.x1;b.x0=X(bx1);b.x1=X(bx0);
lay.winN=lay.winN.map(X);lay.winS=lay.winS.map(X);
const om=lay.mat,pf=lay.paintFloor,pt=lay.paintTop,fl=f=>s=>{s.save();s.translate(Mx*T,0);s.scale(-1,1);f(s);s.restore()};
lay.mat=(x,y)=>om(X(x),y);lay.paintFloor=fl(pf);lay.paintTop=fl(pt);
lay.spawn.x=XP(lay.spawn.x);lay.zones=lay.zones.map(z=>[X(z[2]),z[1],X(z[0]),z[3]]);lay.lobby=[X(lay.lobby[2]),lay.lobby[1],X(lay.lobby[0]),lay.lobby[3]];
lay.cams.forEach(c=>{c.x=XP(c.x);c.a0=Math.PI-c.a0});
lay.tellers=lay.tellers.map(t2);lay.mgr.p=t2(lay.mgr.p);lay.mgr.route=lay.mgr.route.map(t2);lay.guards.forEach(g=>{g.p=t2(g.p);g.route=g.route.map(t2)});
lay.note=t2(lay.note);lay.mon=t2(lay.mon);lay.vault.door=t2(lay.vault.door);lay.vault.pad=t2(lay.vault.pad);lay.vault.bundles=lay.vault.bundles.map(t2);lay.vault.dir=-1;
lay.mission.extra.forEach(x=>{x.p=t2(x.p);x.route=x.route.map(t2)});lay.mission.bags=lay.mission.bags.map(t2);lay.tills=lay.tills.map(t2);lay.atms=lay.atms.map(t2);lay.backDoors=lay.backDoors.map(t2);
if(lay.stash)lay.stash={kind:lay.stash.kind,door:t2(lay.stash.door),out:t2(lay.stash.out),cells:lay.stash.cells.map(t2),deep:lay.stash.deep.map(t2)};
lay.sw.x=XP(lay.sw.x);lay.exit.x=XP(lay.exit.x);lay.exit.dir=-lay.exit.dir;lay.exit.tx=X(lay.exit.tx);
lay.van.x0=XP(lay.van.x0)-128;lay.van.stop=XP(lay.van.stop)-128;lay.van.dir=-lay.van.dir;
lay.posts.forEach(p=>{p.x=X(p.x);p.a=Math.PI-p.a;if(p.door)p.door=t2(p.door)});
/* Parkende Autos: Mitte x spiegeln (bx und by sind die Malbasis, die Malerei laeuft ueber fl schon gespiegelt), sonst baut deriveDecor die Wagen auf der falschen Seite und im Raster bleiben v-Kacheln ohne Auto (Ticket #33) */
if(lay.decor)lay.decor=lay.decor.map(d=>Object.assign({},d,{x:XP(d.x)}));
lay.slots={W:lay.slots.E.map(X),E:lay.slots.W.map(X)};
lay.theme=Object.assign({},lay.theme,{sun:Object.assign({},lay.theme.sun,{dx:-lay.theme.sun.dx})});lay.flip=true;return lay}
/* ---- Strasse auf eine andere Seite legen (Pruefwerkzeug der freien Strasse, siehe docs/karte-und-layout.md; im Spielablauf noch ungenutzt):
   turnLayout(lay,side,mirror) bildet eine fertig gebaute Gebaeude-Karte mit Strasse im Sueden (Raster in den Globalen, also direkt nach layoutFor) auf eine Strasse an `side` ab.
   S: unveraendert, N: oben/unten gespiegelt, E: x und y getauscht (transponiert), W: transponiert und links/rechts gespiegelt. mirror=true spiegelt zusaetzlich laengs der Strasse (die Fluchtseite wechselt auf die andere Strassenseite).
   Raster, Kachel- und Pixelkoordinaten, Winkel, Zeichenhaken, Tresortuer (waagerecht bei E und W: vault.o 'h') und die Strasse (lay.road statt laneY/slots/exit/van) werden mitgenommen. Fensterstrahlen winN/winS entfallen bei E und W (kein Wert fuer Seitenfenster), Titelkamera neu. ---- */
function turnLayout(lay,side,mirror){
if(lay.truck||lay.road)throw new Error('turnLayout: nur Gebaeude-Karten mit Strasse im Sueden');
if(side==='S'&&!mirror)return lay;
const sw=side==='E'||side==='W';let fx=side==='W',fy=side==='N';if(mirror){if(sw)fy=!fy;else fx=!fx}
const X0=CX.WX0,Y0=CX.WY0,W0=CX.W,H0=CX.H,old=CX.M.map(r=>r.slice()),W2=sw?H0:W0,H2=sw?W0:H0,X2=sw?Y0:X0,Y2=sw?X0:Y0,Mx=2*X2+W2,My=2*Y2+H2;
const tile=(x,y)=>{let a=sw?y:x,b=sw?x:y;if(fx)a=Mx-1-a;if(fy)b=My-1-b;return[a,b]},
 inv=(a,b)=>{if(fy)b=My-1-b;if(fx)a=Mx-1-a;return sw?[b,a]:[a,b]},
 pxp=(x,y)=>{let a=sw?y:x,b=sw?x:y;if(fx)a=Mx*T-a;if(fy)b=My*T-b;return[a,b]},
 ang=a=>{let c=Math.cos(a),s=Math.sin(a);if(sw){const t=c;c=s;s=t}if(fx)c=-c;if(fy)s=-s;return Math.round(Math.atan2(s,c)*1e6)/1e6},
 rect=r=>{const p=tile(r[0],r[1]),q=tile(r[2],r[3]);return[Math.min(p[0],q[0]),Math.min(p[1],q[1]),Math.max(p[0],q[0]),Math.max(p[1],q[1])]},
 prc=r=>{const p=pxp(r[0],r[1]),q=pxp(r[0]+r[2],r[1]+r[3]);return[Math.min(p[0],q[0]),Math.min(p[1],q[1]),Math.abs(q[0]-p[0]),Math.abs(q[1]-p[1])]},
 tl=a=>a&&tile(a[0],a[1]),pl=a=>a&&a.map(q=>tile(q[0],q[1])),pp=o=>Object.assign({},o,{x:pxp(o.x,o.y)[0],y:pxp(o.x,o.y)[1]});
// Strasse zuerst lesen (die Rohdaten gelten noch fuer die alte Lage)
const R0=roadOf(lay),vd=Object.assign({},CX.ROAD_SIDES);
newGrid(W2,H2,X2,Y2);for(let y=0;y<H0;y++)for(let x=0;x<W0;x++){const t=tile(x+X0,y+Y0);setc(t[0],t[1],old[y][x])}
const bb=rect([lay.bld.x0,lay.bld.y0,lay.bld.x1,lay.bld.y1]),bc=pxp((lay.bld.x0+lay.bld.x1+1)*T/2,(lay.bld.y0+lay.bld.y1+1)*T/2);lay.bld={x0:bb[0],y0:bb[1],x1:bb[2],y1:bb[3]};
{const cx=x=>fx?Mx-1-x:x,a=lay.winN.map(cx),c=lay.winS.map(cx);if(sw){lay.winN=[];lay.winS=[]}else{lay.winN=fy?c:a;lay.winS=fy?a:c}}
{const om=lay.mat,pf=lay.paintFloor,pt=lay.paintTop,m=[sw?0:1,sw?1:0,sw?1:0,sw?0:1,0,0];if(fx){m[0]=-m[0];m[2]=-m[2];m[4]=Mx*T}if(fy){m[1]=-m[1];m[3]=-m[3];m[5]=My*T}
 const tw=f=>s=>{s.save();s.transform(m[0],m[1],m[2],m[3],m[4],m[5]);f(s);s.restore()};
 lay.mat=(x,y)=>{const q=inv(x,y);return om(q[0],q[1])};lay.paintFloor=tw(pf);lay.paintTop=tw(pt)}
lay.spawn=pp(lay.spawn);lay.zones=lay.zones.map(rect);lay.lobby=rect(lay.lobby);
lay.cams=(lay.cams||[]).map(c=>Object.assign(pp(c),{a0:ang(c.a0)}));
lay.tellers=pl(lay.tellers);if(lay.mgr)lay.mgr=Object.assign({},lay.mgr,{p:tl(lay.mgr.p),route:pl(lay.mgr.route)});
lay.guards=(lay.guards||[]).map(g=>Object.assign({},g,{p:tl(g.p),route:pl(g.route)}));
lay.note=tl(lay.note);lay.mon=tl(lay.mon);lay.tills=pl(lay.tills);lay.atms=pl(lay.atms);lay.backDoors=pl(lay.backDoors);if(lay.sw)lay.sw=pp(lay.sw);
if(lay.stash)lay.stash={kind:lay.stash.kind,door:tl(lay.stash.door),out:tl(lay.stash.out),cells:pl(lay.stash.cells),deep:pl(lay.stash.deep)};
{const mi=lay.mission;lay.mission=Object.assign({},mi,{extra:(mi.extra||[]).map(x=>Object.assign({},x,{p:tl(x.p),route:pl(x.route)})),bags:pl(mi.bags||[])})}
if(lay.vault){const v=lay.vault,pr=[tile(v.door[0],v.door[1]),tile(v.door[0],v.door[1]+1)],h=pr[0][1]===pr[1][1],door=h?(pr[0][0]<pr[1][0]?pr[0]:pr[1]):(pr[0][1]<pr[1][1]?pr[0]:pr[1]);
 lay.vault=Object.assign({},v,{door,pad:tl(v.pad),dir:sw?(fy?-v.dir:v.dir):(fx?-v.dir:v.dir),bundles:pl(v.bundles),o:h?'h':'v',st:door===pr[1]?1:0})}
for(const k of['vit','goods'])if(lay[k])lay[k]=lay[k].map(o=>Object.assign(pp(o),{rc:prc(o.rc)}));
if(lay.pumps)lay.pumps=lay.pumps.map(q=>Object.assign({},q,{x:tile(q.x,q.y)[0],y:tile(q.x,q.y)[1]}));
if(lay.lasers)lay.lasers=lay.lasers.map(q=>{const p=pxp(q[0]*T,q[1]*T),r=pxp(q[2]*T,q[3]*T);return[p[0]/T,p[1]/T,r[0]/T,r[1]/T]});
if(lay.cage)lay.cage=pp(lay.cage);
if(lay.decor)lay.decor=lay.decor.map(d=>{const q=pxp(d.x,d.y);return Object.assign({},d,{x:q[0],y:q[1]})});
// Seitenbuchstaben der Posten: Bild der Seite unter derselben Abbildung (nur der lineare Teil)
const sideOf={};for(const k in vd){const u=k==='S'?[0,1]:k==='N'?[0,-1]:k==='E'?[1,0]:[-1,0];let a=sw?u[1]:u[0],b=sw?u[0]:u[1];if(fx)a=-a;if(fy)b=-b;sideOf[k]=a>0?'E':a<0?'W':b>0?'S':'N'}
lay.posts=lay.posts.map(p=>{const t=tile(p.x,p.y),o=Object.assign({},p,{x:t[0],y:t[1],a:ang(p.a),k:sideOf[p.k]||p.k});if(p.door)o.door=tl(p.door);return o});
// Strasse: laengs der Achse (alt x) ist neu y bei E und W, sonst x. Quer-Werte folgen der Abbildung, laengs-Werte nur der Spiegelung laengs.
const MA=sw?My:Mx,af=sw?fy:fx,cp=c=>{const p=pxp(0,c);return sw?p[0]:p[1]},sl=R0.slots.map(l=>l.map(u=>af?MA-1-u:u)),vn=R0.van,ex=R0.exit,c0=cp(ex.span[0]),c1=cp(ex.span[1]);
lay.road={side:sideOf.S,pos:cp(R0.pos),slots:af?[sl[1],sl[0]]:sl,
 van:{pos:cp(vn.pos),from:af?MA*T-vn.from-128:vn.from,stop:af?MA*T-vn.stop-128:vn.stop,dir:af?-vn.dir:vn.dir},
 exit:Object.assign({line:af?MA*T-ex.line:ex.line,span:[Math.min(c0,c1),Math.max(c0,c1)],dir:af?-ex.dir:ex.dir,tx:af?MA-1-ex.tx:ex.tx,goal:ex.goal?tile(ex.goal[0],ex.goal[1]):tile(ex.tx,Math.round(vn.pos/T))},ex.door?(()=>{const d0=cp(ex.door.span[0]),d1=cp(ex.door.span[1]);return{door:{line:af?MA*T-ex.door.line:ex.door.line,span:[Math.min(d0,d1),Math.max(d0,d1)]}}})():{})};
delete lay.laneY;delete lay.slots;delete lay.exit;delete lay.van;delete lay.spots;delete lay.lockCells;delete lay.wins;delete lay.snp;
lay.title={cx:Math.round(bc[0]-VW/2),ax:90,cy:Math.round(bc[1]-VH/2),ay:70};lay.flip=!sw&&fx;lay.turned=side+(mirror?'+':'');return lay}
function genLayout(seed,po,tpf){const r=mulberry32(seed|0),q=po||genParams(r),ri=(a,b)=>a+Math.floor(r()*(b-a+1)),rnd=po?()=>1:r;
const{cx,vw,ew,bd,ld,fd,wy,sd,ey:ey0,od,nt,na,nb,nbun,yw}=q;
const tpr=mulberry32(Math.imul(seed|0,2246822519)^0x27d4eb2f),tp=po?'E':tpf||(tpr()<CFG.map.tpW?'W':'E'),X0=-6-(tp==='W'?CFG.map.tpX:0);
const mr=mulberry32((((seed|0)*2654435761)>>>0)^0x5bd1e995),ms=po?CLASSICM:genMission(mr,'b',seed);
const tr=mulberry32((((seed|0)*40503)>>>0)^0x1b873593),ti=po?0:Math.floor(tr()*THEMES.length),tw=tr(),di=po?0:tw<.35?0:tw<.55?1:tw<.85?2:3,sty=po?0:Math.floor(tr()*3),flip=po?false:tr()<.5,swp=po?false:tr()<.35,pr=mulberry32((((seed|0)*69069)>>>0)^0x2545f491),pi=(a,b)=>a+Math.floor(pr()*(b-a+1));
const mx1=cx+1+vw,ex0=mx1+2,ex1=ex0+ew-1,bx1=ex1+1,by1=bd+ld+2,ly0=bd+2,ly1=by1-1,w=-X0+bx1+1+yw+1,h=by1+16,oc=ex0+Math.floor(ew/2),ex2=X0+w-1;
const ey=swp?2+((ey0-(ly0+1))%(bd-3)):ey0,oy0=swp?ly0:1,oy1=swp?ly1:bd,sy0=swp?1:ly0,sy1=swp?bd:ly1;
newGrid(w,h,X0,-5);
fill(0,0,bx1,by1,'#');fill(1,1,bx1-1,by1-1,'.');
fill(1,bd+1,cx-1,bd+1,'C');setc(cx,bd+1,'g');
fill(cx+1,1,mx1,bd+1,'#');fill(cx+2,1,mx1,bd-1,'.');setc(cx+1,2,'V');setc(cx+1,3,'V');
fill(mx1+1,1,mx1+1,by1-1,'#');setc(mx1+1,sd,'d');
fill(ex0,bd+1,ex1,bd+1,'#');setc(od,bd+1,'d');
[[bx1,ey],[bx1,ey+1],[fd,by1],[fd+1,by1]].concat(tp==='W'?[[0,wy],[0,wy+1]]:ms.west?[[0,wy]]:[]).forEach(a=>setc(a[0],a[1],'D'));
/* Hoechstens 4 Aussentueren (Karten-Vertrag): Die Bank hat nur eine Hintertuer, CFG.map.back waehlt sie (vault = vor dem Tresor, der Standard, office = ueber dem Buero oder Sicherheitsraum). Die andere Stelle bleibt Wand, behaelt aber ihren Posten. */
const bd1=CFG.map.back==='vault'?cx:oc,bd2=bd1===cx?oc:cx;setc(bd1,0,'L');
const winN=[cx-8,cx-5,cx-2,ex0+1,ex1-1].filter(x=>x>=2&&rnd()>.12),winS=[];
for(let x=2;x<=fd-3&&winS.length<3;x++)if(rnd()>.12)winS.push(x);for(let x=fd+4;x<=mx1-1;x++)if(rnd()>.12)winS.push(x);
winN.forEach(x=>setc(x,0,'W'));winS.forEach(x=>setc(x,by1,'W'));
[[2,2],[3,2],[cx-3,2],[cx-2,2],[oc-1,oy0+1],[oc,oy0+1],[oc+1,oy0+1]].forEach(a=>setc(a[0],a[1],'e'));
[[oc-1,sy0+1],[oc,sy0+1],[oc+1,sy0+1]].forEach(a=>setc(a[0],a[1],'m'));
const tills=[];for(let i=0;i<nt;i++){tills.push([3+3*i,bd]);setc(3+3*i,bd,'r')}
[[cx-5,ly0+2],[cx+1,ly0+2]].forEach(a=>setc(a[0],a[1],'P'));
[[1,ly1],[mx1-1,ly0],[ex1,sy1],[ex1,oy0]].forEach(a=>setc(a[0],a[1],'p'));
for(let i=0;i<nb;i++)setc(mx1-4+i,ly1-1,'b');
const atms=[];for(let i=0;i<na;i++){atms.push([mx1,ly1-i]);setc(mx1,ly1-i,'A')}
atms.reverse();
fill(X0,-5,ex2,-5,'f');fill(X0,-5+h-1,ex2,-5+h-1,'f');fill(X0,-5,X0,-5+h-1,'f');fill(ex2,-5,ex2,-5+h-1,'f');
if(tp==='W'){setc(X0,wy,'o');setc(X0,wy+1,'o')}else{setc(ex2,ey,'o');setc(ex2,ey+1,'o')}
const gx=po?bx1+5:ri(bx1+4,ex2-5);fill(bx1+1,by1+1,ex2-1,by1+1,'f');setc(gx,by1+1,'o');setc(gx+1,by1+1,'o');
// Beamten-Posten und Wagenplaetze
const S=[fd-1,fd+2,fd-4,fd+5,fd-7,fd+8].map(x=>({x,y:by1+2,a:-1.57,k:'S'})),E=[ey-1,ey+2,ey-3].map(y=>tp==='W'?{x:bx1+2,y,a:3.14,k:'E'}:{x:bx1+2,y,a:3.14,k:'E',anchor:true}),Wp=tp==='W'?[wy-1,wy+2,wy-3].map((y,i)=>i<CFG.map.anW?{x:-2,y,a:0,k:'W',anchor:true}:{x:-2,y,a:0,k:'W'}):[wy,wy-3,wy+3].map(y=>({x:-1,y,a:0,k:'W'})),
N=[cx,oc].map(x=>{const po={x,y:-1,a:1.57,k:'N'};if(x===bd1)po.door=[x,0];return po}).concat([{x:cx-6,y:-1,a:1.57,k:'N'},{x:cx+5,y:-1,a:1.57,k:'N'}]);
const posts=(tp==='W'?[S[0],Wp[0],E[0],N[0],S[1],Wp[1],N[1],S[2],E[1],N[2],S[3],Wp[2],N[3],E[2],S[4],S[5]]:[S[0],E[0],Wp[0],N[0],S[1],E[1],N[1],S[2],Wp[1],N[2],S[3],E[2],N[3],Wp[2],S[4],S[5]]).filter(po=>po.x>=X0+1&&po.x<=ex2-1&&!isSol(po.x,po.y));
const slots={W:[],E:[]};for(let x=fd+6;x>=-3;x-=5)slots.W.push(x);for(let x=fd+11;x<=ex2-2;x+=5)slots.E.push(x);
// Aussen: Autos im Hof (Bloecke), Kisten, Faesser, Pflanzen
const c1=[ri(bx1+2,bx1+4),ri(1,3)],c2=[ri(bx1+6,ex2-5),ri(5,Math.min(6,ey-3))];
if(po){c1[0]=bx1+2;c1[1]=2;c2[0]=bx1+7;c2[1]=6}
if(swp){c1[1]=ey+5;c2[1]=ey+8}
const ycars=[c1,c2].filter(c=>c[1]+1<=by1-CFG.map.gate);ycars.forEach(c=>fill(c[0],c[1],c[0]+3,c[1]+1,'v'));
const rv=new Set();posts.forEach(p=>rv.add(p.x+','+p.y));[[bd1,-1],[bd2,-1],[-1,wy],[bx1+1,ey],[bx1+1,ey+1],[fd,by1+1],[fd+1,by1+1],[-1,-1]].forEach(a=>rv.add(a[0]+','+a[1]));
if(tp==='W')for(let x=X0+1;x<=-1;x++)for(let y=wy-1;y<=wy+2;y++)rv.add(x+','+y);
const ca=[ri(0,Math.floor((bx1-4)/2)),0];ca[1]=ri(ca[0]+6,bx1-4);if(po){ca[0]=1;ca[1]=21}
const prop=(ch,x,y)=>{if(cell(x,y)!=='o'||rv.has(x+','+y)||x>bx1&&x<ex2&&y>by1-CFG.map.gate)return;setc(x,y,ch)};
{const cn=[[4,6,4,6,6,9],[1,2,1,2,12,18],[8,11,6,9,2,4]][sty],nk=pi(cn[0],cn[1]),nq=pi(cn[2],cn[3]),np=pi(cn[4],cn[5]);for(let i=0;i<nk;i++)prop('k',pi(-4,ex2-1),pi(-3,-2));
for(let i=0;i<nq;i++){const side=pi(0,2);if(side===0)prop('q',pi(-5,-3),pi(-3,by1));else if(side===1)prop('q',pi(-4,bx1+2),pi(-3,-2));else prop('q',pi(bx1+2,ex2-1),pi(0,ey-3))}
for(let i=0;i<np;i++){const side=pi(0,2);if(side===0)prop('p',-2,pi(0,by1));else if(side===1)prop('p',pi(-3,ex2-1),-1);else prop('p',pi(bx1+1,ex2-1),pi(-3,by1))}}
const R0=[[3,sd],[fd,ly0+1],[mx1-1,ly0+1],[mx1,sd],[ex0+1,sd],[ex1-1,sd],[ex0+1,ly0],[mx1-1,ly1-1],[fd-1,ly1-1]],MR0=[[ex0+1,oy0+1],[ex1-1,oy1-1],[od,swp?oy0:oy1],[ex0+1,sy0+1],[ex1-1,sy1-1],[ex0+1,sy1-1]];
const mgrR=rotR(MR0,ms.rot[2],ms.rot[3]),guards=[],deskT=[[oc-1,oy0+1],[oc,oy0+1],[oc+1,oy0+1],[2,2],[3,2],[cx-3,2],[cx-2,2]];
if(ms.guards>=1){const rt=rotR(R0,ms.rot[0],ms.rot[1]);guards.push({p:rt[0],route:rt})}
if(ms.guards>=2){const rt=rotR(R0,(ms.rot[0]+4)%9,!ms.rot[1]);guards.push({p:rt[0],route:rt})}
const camc=[{x:1.5*T,y:(ly0+.5)*T,a0:.62,amp:.55,sp:.55,rng:270,fov:.5},{x:(mx1+.5)*T,y:(ly0+.5)*T,a0:2.45,amp:.5,sp:.5,rng:270,fov:.5},{x:1.5*T,y:1.5*T,a0:.75,amp:.6,sp:.6,rng:250,fov:.5},{x:(cx+.5)*T,y:1.5*T,a0:1.75,amp:.7,sp:.7,rng:170,fov:.55},
{x:(mx1-.5)*T,y:-.45*T,a0:3.14,amp:.55,sp:.5,rng:300,fov:.5},{x:(ex0+.5)*T,y:-.45*T,a0:0,amp:.55,sp:.45,rng:300,fov:.5},{x:(tp==='W'?-1.5:bx1+2.5)*T,y:((tp==='W'?wy:ey)-1)*T,a0:tp==='W'?.59:2.55,amp:.5,sp:.5,rng:260,fov:.5},{x:(fd+1)*T,y:(by1-.55)*T,a0:-1.4,amp:.6,sp:.5,rng:260,fov:.5},{x:(ex0+.5)*T,y:(sy0+.5)*T,a0:.8,amp:.55,sp:.5,rng:260,fov:.5}];
let camsSel=camc.slice(0,7);
if(!po){const idx=camc.map((_,i)=>i);for(let i=idx.length-1;i>0;i--){const j=Math.floor(mr()*(i+1));[idx[i],idx[j]]=[idx[j],idx[i]]}camsSel=idx.slice(0,ms.cams).sort((a,b)=>a-b).map(i=>{const c=camc[i];return Object.assign({},c,{a0:c.a0+(mr()-.5)*.3,rng:c.rng+Math.round((mr()-.5)*40)})})}
const ev=ms.ev,evTag={wache:'Wachwechsel',strom:'Stromausfall',streife:'Streife in der Nähe',transport:'Geldtransport',feiertag:'Feiertag'},extra=[],bags=[],frontP=[fd,ly1];
if(ev.includes('wache'))extra.push({p:frontP,route:rotR(R0,3,true),at:ms.at.wache,msg:'Wachwechsel: Ein zweiter Wachmann betritt die Halle.'});
if(ev.includes('transport')){extra.push({p:frontP,route:rotR(R0,6,false),at:ms.at.transport,msg:'Geldtransport trifft ein: Geldsäcke in der Halle, ein Wachmann sichert sie.'});for(const c of [[fd-2,ly1],[fd+3,ly1],[fd-3,ly1-1],[fd+4,ly1-1],[fd-4,ly1],[fd+5,ly1]])if(bags.length<2&&!isSol(c[0],c[1]))bags.push(c)}
const tags=[];if(ms.vault==='drill')tags.push('Tresor nur laut');if(ms.guards===0)tags.push('keine Wache');else if(ms.guards===2)tags.push('zwei Wachen');if(!ms.west&&tp!=='W')tags.push('ohne Seitentür');if(tp==='W')tags.push('Fluchtweg: Seitentür');if(ms.civ>=8)tags.push('viel Kundschaft');else if(ms.civ<=3)tags.push('kaum Kundschaft');if(camsSel.length!==7)tags.push(camsSel.length+' Kameras');tags.unshift(...(ms.lg||[]).map(k=>lgN(ms,k)),...ev.map(e=>evTag[e]));
const DCG=[{x:ca[0],y:by1+3,row:3,sh:'B'},{x:ca[1],y:by1+3,row:2,sh:'B'}].concat(ycars.map((c,i)=>({x:c[0],y:c[1],row:2+i,sh:'C'})));
const lay={seed,decor:decorOf(DCG),q:Object.assign({},q,{sw:swp?1:0},tp==='W'?{tp:'W'}:{}),theme:mkTheme(ti,ms.lg.includes('nacht')?4:di,sty),bld:{x0:0,y0:0,x1:bx1,y1:by1},winN,winS,
mat:(x,y)=>{if(x>=0&&x<=bx1&&y>=0&&y<=by1){if(x===cx+1&&(y===2||y===3))return'k';if(x>=cx+2&&x<=mx1&&y>=1&&y<=bd-1)return'm';if(x>=ex0&&x<=ex1&&y>=oy0&&y<=oy1)return'w';if(x>=ex0&&x<=ex1&&(swp?(y>=sy0&&y<=sy1):y>=ly0))return'k';if(y<=bd&&x<=cx)return'k';return't'}
if(y>=by1+8)return'l';if(y===by1+7)return's';if(y>=by1+3)return'a';if(y>=by1+1)return's';if(x>bx1)return'a';if(x<0)return tp==='W'&&y>=wy-1&&y<=wy+2?'a':'l';return'y'},
paintFloor(s){s.fillStyle='rgba(60,45,30,.55)';s.fillRect(fd*T-4,(by1-1)*T+2,2*T+8,T-4);
if(!lay.meet){s.strokeStyle='rgba(255,255,255,.7)';s.lineWidth=2;for(const yy of tp==='W'?[wy,wy+1]:[ey,ey+1]){s.strokeRect(tp==='W'?-4*T+4:(bx1+1)*T+4,yy*T+4,4*T-8,T-8)}}
s.fillStyle='rgba(224,182,40,.8)';s.fillRect(1*T+4,ly0*T+6,(cx-1)*T,2);
s.fillStyle='rgba(235,235,225,.5)';for(let i=0;i<4;i++)s.fillRect(0*T+10+i*30,(by1+2)*T+2,12,2)},
paintTop(s){decorPaint(s,lay.decor);
s.strokeStyle='rgba(255,255,255,.28)';s.lineWidth=2;for(let i=0;i<4;i++){s.beginPath();s.moveTo((bx1+1)*T+4,i*T*2+T*0+4);s.lineTo((bx1+1)*T+34,i*T*2+4);s.stroke()}
s.fillStyle='#3b4048';s.fillRect(ex1*T+8,sy0*T+2,16,10);s.fillStyle='#e0b020';s.fillRect(ex1*T+14,sy0*T+5,4,4);s.fillStyle='rgba(255,255,255,.25)';s.fillRect(ex1*T+8,sy0*T+2,16,1)},
spawn:{x:(fd+.9)*T,y:(by1+1.6)*T},
zones:[[1,1,cx,bd+1],[cx+1,1,mx1,bd-1],[ex0,1,ex1,ly1],[cx-3,-99,99,-1],[bx1+1,-99,99,by1]],lobby:[1,ly0,mx1,ly1],
cams:camsSel,
tellers:tills.map(t=>[t[0],bd-1]),
mgr:{p:mgrR[0],route:mgrR},guards,civ:ev.includes('feiertag')?Math.min(CFG.ev.civMax,ms.civ*2):ms.civ,mission:{code:ms.code,vault:ms.vault,guards:ms.guards,west:ms.west,cams:camsSel.length,civ:ms.civ,tags,ev,lg:ms.lg||[],...(ms.lgw?{lgw:ms.lgw}:{}),at:ms.at,extra,bags,blackoutAt:ev.includes('strom')?ms.at.strom:null},
note:deskT[ms.noteIdx],mon:[oc,sy0+1],vault:{door:[cx+1,2],pad:[cx,bd-1],dir:1,bundles:[]},tills,atms,backDoors:[[bd1,0]],
sw:{x:ex1*T+16,y:sy0*T+22},exit:tp==='W'?{x:0,y0:(wy-1)*T,y1:(wy+3)*T,dir:-1,tx:-1}:{x:(bx1+1)*T,y0:(ey-1)*T,y1:(ey+3)*T,dir:1,tx:bx1+1},van:tp==='W'?{y:(wy+1)*T,x0:(X0+1)*T,stop:-4*T,dir:1}:{y:(ey+1)*T,x0:(-6+w-6)*T,stop:(bx1+1)*T,dir:-1},flip:false,
posts,slots,laneY:(by1+6)*T,title:{cx:Math.round((X0*T+((X0+w)*T-VW))/2),ax:Math.floor(((X0+w)*T-VW-X0*T)/2*.85),cy:-10,ay:110}};
// Buendel im Tresor (Gitter im Innenraum)
{const vx0=cx+2,xs=[vx0+1,vx0+3,vx0+5].filter(x=>x<=mx1),c=[];for(const y of[2,3])for(const x of xs.slice(0,2))c.push([x,y]);c.push([vx0+2,bd-1]);for(const x of xs.slice(2))c.push([x,2]);c.push([vx0+1,bd-1],[mx1-1,bd-1]);
const seen=new Set();lay.vault.bundles=c.filter(a=>{const k=a+'';if(seen.has(k)||a[1]>bd-1)return false;seen.add(k);return true}).slice(0,nbun)}
if(flip)mirrorLayout(lay);
return lay}

/* Gueteprueffung: alles Wichtige muss vom Spielerstart aus erreichbar sein (Tresor als offen gerechnet). */
function validLayout(lay){const ov=CX.vaultOpen;CX.vaultOpen=true;try{const sp=[Math.floor(lay.spawn.x/T),Math.floor(lay.spawn.y/T)],seen=Array.from({length:CX.H},()=>Array(CX.W).fill(0)),q=[sp],b=lay.bld,v0=lay.vault;
if(isSol(sp[0],sp[1]))return false;seen[sp[1]-CX.WY0][sp[0]-CX.WX0]=1;
for(let h=0;h<q.length;h++){const c=q[h];for(const d of CX.D4){const nx=c[0]+d[0],ny=c[1]+d[1];if(isSol(nx,ny)||seen[ny-CX.WY0][nx-CX.WX0])continue;seen[ny-CX.WY0][nx-CX.WX0]=1;q.push([nx,ny])}}
const R=(x,y)=>!OOB(x,y)&&seen[y-CX.WY0][x-CX.WX0]===1,near=a=>R(a[0],a[1])||CX.D4.some(d=>R(a[0]+d[0],a[1]+d[1])),all=(l,f)=>l.every(f);
const ln=laneOf(lay),ey=Math.round(ln.exit.span[0]/T)+1,ez=[ln.pt(ln.exit.tx,ey),ln.pt(ln.exit.tx,ey+1)],sw=[Math.floor(lay.sw.x/T),Math.floor(lay.sw.y/T)];
if(!all(lay.posts,p=>R(p.x,p.y)))return false;if(lay.posts.length<10)return false;
if(!all(lay.vault.bundles,a=>R(a[0],a[1]))||lay.vault.bundles.length<4)return false;
if(!R(v0.door[0]-v0.dir,2)||!R(v0.door[0]-v0.dir,3))return false;
if(!near(lay.note)||!near(lay.mon)||!all(lay.tills,near)||!all(lay.atms,near)||!R(sw[0],sw[1]))return false;
if(!R(ez[0][0],ez[0][1])||!R(ez[1][0],ez[1][1])||!all(lay.backDoors,a=>R(a[0],-1)))return false;
if(!all(lay.mgr.route,a=>R(a[0],a[1]))||!all(lay.guards,g=>all(g.route,a=>R(a[0],a[1])))||!all(lay.mission.extra,x=>all(x.route,a=>R(a[0],a[1])))||!all(lay.mission.bags,a=>R(a[0],a[1]))||!all(lay.cams,c=>near([Math.floor(c.x/T),Math.floor(c.y/T)]))||!all(lay.tellers,a=>!isSol(a[0],a[1])))return false;
if(!all(ln.slots,q=>R(q.curb[0],q.curb[1])))return false;
let n=0;const l=lay.lobby;for(let y=l[1];y<=l[3];y++)for(let x=l[0];x<=l[2];x++)if(R(x,y))n++;if(n<14)return false;
// Weglaengen wie in der Klassik halten (Schwierigkeit haengt stark daran): Start zu Tresor, Tresor zu Ausgang, Frontposten zu Tresor
const P=(a,c)=>pathTo(a[0]*T+16,a[1]*T+16,c[0],c[1]).length,dr=[v0.door[0]-v0.dir,v0.door[1]+1],ex=ln.exit.goal,p0=lay.posts[0],m=CFG.map,inr=(v,r)=>v>=r[0]&&v<=r[1];
return inr(P(sp,dr),m.a)&&inr(P(dr,ex),lay.q&&lay.q.tp==='W'?(lay.q.sw?m.bws:m.bw):lay.q&&lay.q.sw?m.bs:m.b)&&inr(P([p0.x,p0.y],dr),m.c)}finally{CX.vaultOpen=ov}}
/* ---- Szenario Geldtransporter (fahrender Hinterhalt): Eine Strasse mit Haeuserbloecken (60x24 Kacheln), der Panzerwagen faehrt von Westen nach Osten.
   Dieselben LAY-Felder wie die Bank, die bankspezifischen (Tresor, Kameras, Angestellte) sind leer. LAY.truck markiert das Szenario, LAY.spots sind die Sperrstellen quer ueber die Fahrbahn (rd). ---- */
function genTruckMission(sd){const r=mulberry32((((typeof sd==='number'?sd:7)*2654435761)>>>0)^0x7a3c91d5),ri=(a,b)=>a+Math.floor(r()*(b-a+1)),crew=ri(2,4),bagN0=ri(6,8),arrive=ri(55,75);
const lg=rollLage(typeof sd==='number'?sd:7,'t',0),V=CFG.truck.var,pk=(tab,u)=>{let a=0;for(const k of Object.keys(tab)){a+=tab[k].p;if(u<a)return k}return null};
const cargo=pk(V.cargo,r())||'geld',lock=pk(V.lock,r())||'std',alarm=pk(V.alarm,r())||'normal',hu=r(),heavy=Math.min(crew-1,hu<V.heavy.p[0]?0:hu<V.heavy.p[1]?1:2),su=r(),gu=[r(),r(),r(),r()],street=su<V.street.baustelle?'baustelle':su<V.street.baustelle+V.street.gassen?'gassen':'std',closed=gu.map(u=>street==='gassen'&&u<.45),cg=V.cargo[cargo]||{v:CFG.truck.bagV,u:CFG.truck.bagU,lab:'Geldsack einpacken',nm:'Säcke'},bagN=cargo==='geld'?bagN0:ri(cg.n[0],cg.n[1]);
if(street==='gassen'){if(!closed.some(Boolean))closed[Math.floor(gu[0]*4)]=true;if(closed.every(Boolean))closed[Math.floor(gu[1]*4)]=false}
/* Panne (E1, hinter allen alten Wuerfen, damit alte Seeds gleich bleiben): der Wagen steht von Anfang an auf der Kachel px */
const pu=r(),xu=r(),panne=pu<V.panne.p,px=V.panne.x[0]+Math.floor(xu*(V.panne.x[1]-V.panne.x[0]+1));
/* Vorhut (E2, hinter den Wuerfeln der Panne): ein Begleitwagen faehrt vor dem Panzerwagen, nicht bei der Panne und nicht bei der Baustelle (dort sind die oberen Spuren zu) */
const vu=r(),vorhut=!panne&&street!=='baustelle'&&vu<V.vorhut.p;
/* Gegenrichtung (E3, hinter allen Wuerfeln): der Wagen faehrt von Osten nach Westen, Fluchtzone und Fluchtwagen liegen im Westen */
const ru=r(),rev=ru<V.rev.p;
const vt=[V.cargo[cargo],V.lock[lock],V.alarm[alarm],heavy?{tag:V.heavy.tag[heavy-1]}:null,panne?{tag:'Panne'}:null,vorhut?{tag:'Vorhut'}:null,rev?{tag:'Wagen von Osten'}:null,street==='baustelle'?{tag:'Baustelle'}:street==='gassen'?{tag:closed.filter(Boolean).length+(closed.filter(Boolean).length===1?' Gasse dicht':' Gassen dicht')}:null].filter(Boolean).map(q=>q.tag);
return{code:'',vault:'none',guards:0,cams:0,civ:0,west:false,tags:lg.map(k=>LAGE[k].n).concat(['Panzerwagen',crew+' Wachen',bagN+' '+cg.nm]).concat(vt),ev:[],lg,at:{},extra:[],bags:[],blackoutAt:null,crew,bagN,arrive,cargo,bv:cg.v,bu:cg.u,blab:cg.lab,lock,lk:V.lock[lock]?V.lock[lock].k:1,alarm,al:V.alarm[alarm]?V.alarm[alarm].d:0,heavy,street,closed,panne,px,vorhut,rev}}
/* Baustelle (T4b): die gesperrten Kacheln der oberen Spuren, x0 y0 x1 y1 (Zaun im Raster, gezeichnet als Baustelle) */
const TK_SITE=[25,9,33,10],inSite=(lay,x,y)=>!!lay.truck&&lay.mission.street==='baustelle'&&x>=TK_SITE[0]&&x<=TK_SITE[2]&&y>=TK_SITE[1]&&y<=TK_SITE[3];
function paintSite(s){const x0=TK_SITE[0]*T,y0=TK_SITE[1]*T,w=(TK_SITE[2]-TK_SITE[0]+1)*T,h=(TK_SITE[3]-TK_SITE[1]+1)*T,hs=(a,b)=>((a*73856093)^(b*19349663))>>>0;
s.fillStyle='rgba(0,0,0,.22)';s.fillRect(x0+3,y0+6,w-4,h-6);s.fillStyle='#665a4c';s.fillRect(x0+4,y0+4,w-8,h-8);
for(let i=0;i<150;i++){const q=hs(i,7),gx=x0+8+q%(w-20),gy=y0+8+(q>>>9)%(h-20);s.fillStyle=(q>>>5)&1?'#8a7d6c':'#4c423a';s.fillRect(gx,gy,2+(q>>>7)%3,2)}
s.fillStyle='#3d352e';s.fillRect(x0+26,y0+16,w-52,h-32);s.fillStyle='rgba(0,0,0,.3)';s.fillRect(x0+26,y0+16,w-52,5);
[[58,26],[170,22]].forEach(p=>{s.fillStyle='rgba(0,0,0,.3)';s.fillRect(x0+p[0],y0+p[1]+5,46,10);s.fillStyle='#a6a9a4';s.fillRect(x0+p[0],y0+p[1],46,10);s.fillStyle='#c9ccc7';s.fillRect(x0+p[0],y0+p[1],46,3);s.fillStyle='#6f726e';s.fillRect(x0+p[0]+43,y0+p[1],3,10)});
const bar=(bx,by,len,hz)=>{const n=Math.ceil(len/16);s.fillStyle='rgba(0,0,0,.28)';if(hz)s.fillRect(bx,by+5,len,4);else s.fillRect(bx+5,by,4,len);for(let i=0;i<n;i++){const l=Math.min(16,len-i*16);s.fillStyle=i%2?'#e9ece9':'#c8372b';if(hz)s.fillRect(bx+i*16,by,l,6);else s.fillRect(bx,by+i*16,6,l)}s.fillStyle='rgba(0,0,0,.35)';if(hz){s.fillRect(bx,by,len,1);s.fillRect(bx,by+5,len,1)}else{s.fillRect(bx,by,1,len);s.fillRect(bx+5,by,1,len)}};
bar(x0+2,y0+2,w-4,true);bar(x0+2,y0+h-8,w-4,true);bar(x0+2,y0+8,h-16,false);bar(x0+w-8,y0+8,h-16,false);
s.fillStyle='#4a4f55';for(let i=0;i<=w;i+=48){s.fillRect(x0+i-1,y0,3,4);s.fillRect(x0+i-1,y0+h-4,3,4)}
[[-9,10],[-9,h-10],[w+9,10],[w+9,h-10],[w/2-70,-7],[w/2+70,-7],[w/2-70,h+7],[w/2+70,h+7]].forEach(p=>{const cx=x0+p[0],cy=y0+p[1];s.fillStyle='rgba(0,0,0,.3)';s.beginPath();s.arc(cx+1.5,cy+2,6,0,6.283);s.fill();s.fillStyle='#e2661f';s.beginPath();s.arc(cx,cy,5.5,0,6.283);s.fill();s.fillStyle='#f4f4ef';s.beginPath();s.arc(cx,cy,3.4,0,6.283);s.fill();s.fillStyle='#e2661f';s.beginPath();s.arc(cx,cy,1.7,0,6.283);s.fill()})}
function truckLayout(sd){const tms=genTruckMission(sd),st=tms.street;newGrid(60,24,0,0);fill(0,0,59,23,'o');
fill(0,0,59,0,'f');fill(0,23,59,23,'f');fill(0,0,0,23,'f');fill(59,0,59,23,'f');
for(let y=9;y<=12;y++){setc(0,y,'o');setc(59,y,'o')}
[[1,16],[20,37],[41,58]].forEach(a=>fill(a[0],1,a[1],6,'#'));
[[1,8],[12,30],[34,58]].forEach(a=>fill(a[0],15,a[1],22,'#'));
[3,6,9,12,15,23,26,29,32,35,44,47,50,53,56].forEach(x=>setc(x,6,'W'));
[3,6,14,17,20,23,26,37,40,43,46,50,54,57].forEach(x=>setc(x,15,'W'));
const parked=[{x:9,y:7,row:2},{x:35,y:7,row:3},{x:22,y:13,row:3},{x:44,y:13,row:2}];
parked.forEach(c=>fill(c.x,c.y,c.x+3,c.y+1,'v'));
[[5,7],[6,7],[25,7],[44,7],[52,7],[18,2],[18,3],[39,2],[39,3],[14,14],[15,14],[36,14],[54,14],[10,17],[32,18],[32,19]].forEach(a=>setc(a[0],a[1],'k'));
[[3,7],[30,7],[48,7],[56,7],[19,5],[38,5],[11,14],[11,16],[40,14],[33,16],[57,14]].forEach(a=>setc(a[0],a[1],'q'));
/* Strassenvarianten (T4b): Baustelle sperrt in der Mitte die Zeilen 9 und 10, Gassen mauert einen Teil der vier Seitengassen zu (nach den Kulissen, damit auch deren Kisten verschwinden) */
if(st==='baustelle')fill(TK_SITE[0],TK_SITE[1],TK_SITE[2],TK_SITE[3],'f');
if(st==='gassen')[[17,19,1,6],[38,40,1,6],[9,11,15,22],[31,33,15,22]].forEach((a,i)=>{if(tms.closed[i])fill(a[0],a[2],a[1],a[3],'#')});
const spots=[];[18,29,39].forEach((x,i)=>(st==='baustelle'&&i===1?[11,12]:[9,10,11,12]).forEach(y=>spots.push({cells:[[x,y]],x:x*T+16,y:y*T+16,side:null,iv:[1,0],ex:false,lk:false,rd:true,g:i,r:54,n:['Sperre West','Sperre Mitte','Sperre Ost'][i]})));
const tr=mulberry32((((typeof sd==='number'?sd:3)|0)*40503>>>0)^0x1b873593),ti=Math.floor(tr()*THEMES.length),tw=tr(),di=tw<.35?0:tw<.55?1:tw<.85?2:3;
const lay={seed:sd,truck:true,bld:{x0:1,y0:1,x1:58,y1:6},winN:[],winS:[],
mat:(x,y)=>y>=9&&y<=12?'a':y===8||y===13?'s':'y',
paintFloor(s){s.fillStyle='rgba(235,235,225,.55)';for(let i=st==='baustelle'?4:0;i<8;i++)s.fillRect(26*T+3,9*T+4+i*15,2*T-6,8)},
paintTop(s){if(st==='baustelle')paintSite(s)},
spawn:tms.panne?{x:4.5*T,y:13.6*T}:{x:29.5*T,y:13.6*T},zones:[],lobby:[2,8,57,8],cams:[],tellers:[],mgr:{p:[0,0],route:[]},guards:[],civ:0,
mission:tms,theme:mkTheme(ti,tms.lg.includes('nacht')?4:di,0),note:[0,0],mon:[0,0],vault:{door:[0,0],pad:[0,0],dir:1,bundles:[]},tills:[],atms:[],backDoors:[],sw:{x:0,y:0},
exit:{x:55*T,y0:9*T,y1:13*T,dir:1,tx:55},van:{y:10*T+16,x0:66*T,stop:55*T,dir:-1},flip:false,
posts:[{x:4,y:8,a:0,k:'W'},{x:5,y:13,a:0,k:'W'},{x:14,y:8,a:0,k:'W'},{x:14,y:13,a:0,k:'W'},{x:18,y:8,a:1.57,k:'M'},{x:18,y:13,a:-1.57,k:'M'},{x:30,y:8,a:1.57,k:'M'},{x:30,y:13,a:-1.57,k:'M'},
{x:49,y:8,a:3.14,k:'E',anchor:true},{x:49,y:13,a:3.14,k:'E',anchor:true},{x:53,y:8,a:3.14,k:'E',anchor:true},{x:53,y:13,a:3.14,k:'E',anchor:true}],
slots:{W:[2,6,10,14],E:[42,46,50]},laneY:10*T+16,title:{cx:12*T,ax:9*T,cy:4*T,ay:16},
spots,lockCells:[],parked};if(tms.rev)truckRev(lay);return lay}
/* Gegenrichtung (E3): Die Karte bleibt, gespiegelt (wie mirrorLayout, nur fuer diese Felder) werden Fluchtzone, Fluchtwagen, Wagenplaetze der Polizei und bei der Panne der Startplatz des Spielers (gegenueber der Fluchtzone). Die Posten behalten ihre Plaetze (gespiegelte laegen teils in Festem), nur die Anker wechseln: sie sichern die Fluchtseite, also stehen sie jetzt im Westen. */
function truckRev(lay){const Mx=60,X=x=>Mx-1-x,XP=x=>Mx*T-x;
lay.exit.x=XP(lay.exit.x);lay.exit.dir=-lay.exit.dir;lay.exit.tx=X(lay.exit.tx);
lay.van.x0=XP(lay.van.x0)-128;lay.van.stop=XP(lay.van.stop)-128;lay.van.dir=-lay.van.dir;
lay.posts.forEach(p=>{if(p.k==='E')delete p.anchor;else if(p.k==='W')p.anchor=true});lay.slots={W:lay.slots.E.map(X),E:lay.slots.W.map(X)};
if(lay.mission.panne)lay.spawn.x=XP(lay.spawn.x)}
/* ---- Szenario Juwelier: kleine Boutique (Gebaeude x0..23, y0..13) mit Schaufenster im Sueden, vier Vitrineninseln, Wandvitrinen, Tresen mit Verkaeufern und Bueroraum plus Tresorraum im Nordosten.
   Eingaenge: Vordertuer (Glas, Sueden, offen), Hintertuer (Norden, Personaltuer, fuehrt ins Bueroraum) und Lieferanteneingang (Osten, hinter den Tresen, zugleich Fluchttuer zum Hof, in dem der Wagen wartet).
   Dieselben LAY-Felder wie die Bank (Tresor = Hinterzimmer-Safe, Bundles = Schmuckkassetten), dazu LAY.jewel und LAY.vit (Vitrinen als Beute). ---- */
function jwStar(c,x,y,s,col){c.fillStyle=col;c.beginPath();c.moveTo(x,y-s);c.quadraticCurveTo(x,y,x+s,y);c.quadraticCurveTo(x,y,x,y+s);c.quadraticCurveTo(x,y,x-s,y);c.quadraticCurveTo(x,y,x,y-s);c.fill()}
function jwGem(c,x,y,s,col){c.fillStyle=col;c.beginPath();c.moveTo(x,y-s);c.lineTo(x+s*.9,y-s*.1);c.lineTo(x,y+s);c.lineTo(x-s*.9,y-s*.1);c.closePath();c.fill();c.fillStyle='rgba(255,255,255,.55)';c.beginPath();c.moveTo(x-s*.45,y-s*.35);c.lineTo(x,y-s);c.lineTo(x+s*.45,y-s*.35);c.closePath();c.fill()}
function jwJewels(c,x,y,w,h,r){const GEM=['#e8f4ff','#ff3b5c','#3bc4ff','#59e08a','#ffd34a'],n=Math.max(1,Math.floor(w/15)),m=Math.max(1,Math.floor(h/15));
for(let j=0;j<m;j++)for(let i=0;i<n;i++){const cx=x+(i+.5)*w/n,cy=y+(j+.5)*h/m,t=r();
if(t<.34){c.strokeStyle='#e7c25a';c.lineWidth=1.6;c.beginPath();c.arc(cx,cy+1.5,3.4,0,6.283);c.stroke();jwGem(c,cx,cy-3,2.4,GEM[Math.floor(r()*5)])}
else if(t<.6)jwGem(c,cx,cy,3.6,GEM[Math.floor(r()*5)]);
else if(t<.78){c.strokeStyle='#e7c25a';c.lineWidth=1.2;c.beginPath();c.arc(cx,cy-2,5,.25,2.9);c.stroke();jwGem(c,cx,cy+3,2,GEM[Math.floor(r()*5)])}
else if(t<.9){for(let k=0;k<4;k++){c.fillStyle='#f4efe6';c.beginPath();c.arc(cx-5+k*3.4,cy,1.7,0,6.283);c.fill()}}
else{c.fillStyle='#2a2f38';c.beginPath();c.arc(cx,cy,3.8,0,6.283);c.fill();c.strokeStyle='#d8c27a';c.lineWidth=1;c.stroke();c.fillStyle='#e8eef5';c.fillRect(cx-.5,cy-2.4,1,2.6)}
if(r()<.35)jwStar(c,cx+r()*6-3,cy+r()*6-3,3+r()*2.5,'#fffbe8')}}
function jwCase(c,x,y,w,h,r){c.fillStyle='rgba(0,0,0,.28)';c.fillRect(x+4,y+5,w,h);c.fillStyle='#2a2226';c.fillRect(x,y,w,h);c.strokeStyle='#d4a94a';c.lineWidth=2;c.strokeRect(x+1,y+1,w-2,h-2);
const ix=x+4,iy=y+4,iw=w-8,ih=h-8,q=c.createLinearGradient(ix,iy,ix,iy+ih);q.addColorStop(0,'#8f1f36');q.addColorStop(1,'#6d1424');c.fillStyle=q;c.fillRect(ix,iy,iw,ih);jwJewels(c,ix,iy,iw,ih,r);
c.fillStyle='rgba(185,205,235,.20)';c.fillRect(ix,iy,iw,ih);c.fillStyle='rgba(255,255,255,.16)';c.beginPath();c.moveTo(ix+iw*.1,iy+ih);c.lineTo(ix+iw*.32,iy);c.lineTo(ix+iw*.46,iy);c.lineTo(ix+iw*.24,iy+ih);c.closePath();c.fill()}
/* Juwelier, Hallen-Grundrisse (aus dem Seed, eigener Strom): isl = Vitrineninseln [x,y,w,h,Stuecke], insgesamt immer 8 Stuecke, wall = sechs Wandvitrinen [x,y,w,h], pil = Saeulen (blickdicht, kugelsperrend, Deckung), part = Trennwaende [x,y,w,h], plants und bench = Dekor, route = sechs Wegpunkte der Wache (geschlossene Schleife durch die Gaenge).
   Halle x1..13, y1..12, die Vordertuer liegt bei x11 und 12 (y13), davor bleibt der Eingangsbereich frei. Die Podeste am Schaufenster (y12), der Tresen und alles hinter Kachel x14 sind in allen Hallen gleich. */
/* Hallen als Funktionen der Huelle (Sprint 7): hw Hallenbreite (Halle x1..hw, Klassik 13), hd Tiefe (Zeilen y1..hd, Klassik 12), vd linke Kachel der Vordertuer (Klassik 11). Mit hw 13, hd 12 und vd 11 ergibt jede Halle exakt die alte Tabelle (Selbsttest 39-juwelier-basis).
   Wandvitrinen: so viele 2 Kachel breite Stuecke von x2 an, wie in die Nordwand passen (Klassik sechs). Die Podeste am Schaufenster stehen in der Halle von x2 an im Abstand 3 bis vd-3 (Klassik drei), die drei unter dem Tresen wandern mit dem rechten Block. */
const jwWall=hw=>{const a=[];for(let x=2;x+1<=hw;x+=2)a.push([x,1,2,1]);return a},jwIw=hw=>hw>=15?4:hw>=13?3:2,jwPl=(hw,hd,vd)=>[[1,3],[hw,3],[vd-1,hd],[hw,hd],[22+hw-13,hd]],jwBe=hd=>[[1,5],[1,hd-3]];
const JW_HALLS=[
{n:'Klassik',minHw:11,minHd:12,mk:(hw,hd,vd)=>{const iw=jwIw(hw),R=hw-2-iw,mx=Math.ceil((3+iw+R-1)/2),my=Math.ceil(hd/2);return{isl:[[3,3,iw,2,2],[R,3,iw,2,2],[3,hd-4,iw,2,2],[R,hd-4,iw,2,2]],wall:jwWall(hw),pil:[],part:[],plants:jwPl(hw,hd,vd),bench:jwBe(hd),route:[[hw-1,hd-1],[hw-1,my],[mx,my],[mx,hd-1],[2,hd-1],[2,my]]}}},
{n:'Reihen',minHw:11,minHd:12,mk:(hw,hd,vd)=>{const my=Math.ceil(hd/2);return{isl:[[3,3,hw-7,2,4],[3,hd-4,hw-7,2,4]],wall:jwWall(hw),pil:[[hw-2,5],[hw-2,hd-4]],part:[],plants:jwPl(hw,hd,vd),bench:jwBe(hd),route:[[hw-1,hd-1],[hw-1,my],[hw-1,3],[2,2],[2,my],[2,hd-1]]}}},
{n:'Salon',minHw:11,minHd:12,mk:(hw,hd,vd)=>{const iw=jwIw(hw),R=hw-2-iw,my=Math.ceil(hd/2);return{isl:[[3,3,iw,2,2],[R,3,iw,2,2],[3,hd-4,iw,2,2],[R,hd-4,iw,2,2]],wall:jwWall(hw),pil:[],part:[[1,6,2,1],[5,6,hw-8,1],[hw-1,6,2,1]],plants:jwPl(hw,hd,vd),bench:jwBe(hd),route:[[hw-1,hd-1],[hw-2,my+1],[hw-2,3],[2,2],[4,my+1],[2,hd-1]]}}},
{n:'Ring',minHw:11,minHd:12,mk:(hw,hd,vd)=>{const gx=4+Math.floor((hw-7)/2),my=Math.ceil(hd/2);return{isl:[[4,4,hw-6,1,2],[4,hd-3,gx-4,1,1],[gx+1,hd-3,hw-3-gx,1,1],[4,5,1,hd-8,2],[hw-3,5,1,hd-8,2]],wall:[[2,1,2,1],[4,1,2,1],[6,1,2,1],[8,1,2,1],[1,3,1,2],[1,6,1,2]],pil:[],part:[],plants:[[hw,2],[1,hd-2],[vd-1,hd],[hw,hd],[22+hw-13,hd],[5,5],[hw-4,5]],bench:[[1,hd-3]],route:[[hw-1,hd-1],[hw-1,my],[hw-1,3],[2,3],[2,my],[2,hd-1]]}}},
{n:'Gänge',minHw:13,minHd:12,mk:(hw,hd,vd)=>{const a=Math.floor((hw-7)/3),x2=4+a,x3=x2+2+a,rx=3+a;return{isl:[[2,3,2,4,2],[x2,3,2,4,2],[x3,3,2,4,2],[3,hd-4,hw-8,2,2]],wall:jwWall(hw),pil:[[hw-4,hd-3]],part:[],plants:jwPl(hw,hd,vd),bench:jwBe(hd),route:[[hw-1,hd-1],[hw-1,7],[hw-1,2],[rx,2],[rx,7],[2,hd-1]]}}}];
const CLASSICJW={hw:13,hd:12,vx:0,classic:true};
function jwHallOf(sn){const hr=mulberry32((((sn)*7919)>>>0)^0x2c9b4d1f);return JW_HALLS[Math.floor(hr()*JW_HALLS.length)]}
/* Zufallsparameter des Juweliers (eigener Strom wie gasParams): k ist der Versuch, Versuch 0 ist mit CFG.jewGen.classic die Klassik-Huelle (13, 12, 0). vx verschiebt die Vordertuer nach links. */
function jewParams(sn,k){const G=CFG.jewGen,P=Object.assign({},CLASSICJW);if(!G.on)return P;const r=mulberry32((Math.imul(sn|0,374761393)+Math.imul(k+1,668265263))^0x6a09e667),ri=(a,b)=>a+Math.floor(r()*(b-a+1)),c=r();if(k===0&&c<G.classic)return P;
P.hw=ri(G.hw[0],G.hw[1]);P.hd=ri(G.hd[0],G.hd[1]);P.vx=ri(G.vx[0],G.vx[1]);
/* Tiefe (Entscheidung von Till, 29. Oktober 2026): zwei angehaengte Wuerfe, die alten Seeds behalten ihre Parameter; mit deep.on 0 gilt hd 12 bis 13 wie vorher. Die Strasse im Sueden rueckt ab hd 14 mit (sy in genJewel). */
const e1=r(),e2=r();if(G.deep&&G.deep.on&&e1<G.deep.p)P.hd+=1+Math.floor(e2*G.deep.max);
/* Kammer (CFG.stash): zwei weitere angehaengte Wuerfe, Ja/Nein und Art. */
const s1=r(),s2=r(),K=CFG.stash;if(K&&K.on&&K.scs.includes('jewel')&&s1<K.p)P.stash=s2<.5?'abstell':'wc';
P.classic=P.hw===13&&P.hd===12&&P.vx===0&&!P.stash;return P}
/* Kammer zeichnen (Basiskoordinaten, die Zeichenhaken drehen und spiegeln mit der Karte): Boden und Einrichtung, ohne Kollision (der Koerper liegt darueber). WC: helle Fliesen, Becken an der Ostwand, Waschbecken an der Nordwand. Abstellraum: grauer Estrich, Regal an der Nordwand, Eimer und Besen. */
const inStash=(lay,x,y)=>!!lay.stash&&(lay.stash.cells.some(c=>c[0]===x&&c[1]===y)||(lay.stash.door[0]===x&&lay.stash.door[1]===y));
function stashBox(K){const X=K.cells.map(c=>c[0]),Y=K.cells.map(c=>c[1]);return[Math.min(...X),Math.min(...Y),Math.max(...X),Math.max(...Y)]}
function stashFloor(s,K){const b=stashBox(K),x=b[0]*T,y=b[1]*T,w=(b[2]-b[0]+1)*T,h=(b[3]-b[1]+1)*T,wc=K.kind==='wc';
s.fillStyle=wc?'#d9e2e6':'#6f6a62';s.fillRect(x,y,w,h);s.lineWidth=1;
if(wc){s.strokeStyle='rgba(90,110,125,.45)';for(let i=0;i<=w/16;i++){s.beginPath();s.moveTo(x+i*16+.5,y);s.lineTo(x+i*16+.5,y+h);s.stroke()}for(let j=0;j<=h/16;j++){s.beginPath();s.moveTo(x,y+j*16+.5);s.lineTo(x+w,y+j*16+.5);s.stroke()}}
else{s.fillStyle='rgba(30,28,24,.22)';for(let i=0;i<7;i++)s.fillRect(x+6+((i*37)%(w-14)),y+5+((i*23)%(h-12)),9+(i%3)*4,5+(i%2)*3)}}
function stashTop(s,K){const b=stashBox(K),X0=b[0]*T,Y0=b[1]*T,X1=(b[2]+1)*T,W2=(b[2]-b[0]+1)*T;
if(K.kind==='wc'){s.fillStyle='rgba(0,0,0,.16)';s.beginPath();s.ellipse(X1-20,Y0+19,12,9,0,0,6.283);s.fill();
 s.fillStyle='#f4f7f8';s.fillRect(X1-9,Y0+8,8,16);s.beginPath();s.ellipse(X1-20,Y0+16,11,8,0,0,6.283);s.fill();s.strokeStyle='#a9b6bd';s.lineWidth=1.5;s.stroke();
 s.fillStyle='#cfdbe0';s.beginPath();s.ellipse(X1-21,Y0+16,6,4.5,0,0,6.283);s.fill();
 s.fillStyle='#f4f7f8';s.fillRect(X0+10,Y0+2,22,13);s.strokeStyle='#a9b6bd';s.lineWidth=1;s.strokeRect(X0+10.5,Y0+2.5,21,12);s.fillStyle='#cfdbe0';s.beginPath();s.ellipse(X0+21,Y0+9,7,4,0,0,6.283);s.fill()}
else{s.fillStyle='#5b4632';s.fillRect(X0+3,Y0+2,W2-6,11);s.fillStyle='#7a5d3f';s.fillRect(X0+3,Y0+2,W2-6,3);
 for(let i=0;i*14+9<W2-3;i++){s.fillStyle=['#a8814f','#8c6b43','#b99560'][i%3];s.fillRect(X0+6+i*14,Y0+6,10,6)}
 s.fillStyle='rgba(0,0,0,.2)';s.beginPath();s.ellipse(X1-14,Y0+27,8,6,0,0,6.283);s.fill();s.fillStyle='#3f7fb5';s.beginPath();s.ellipse(X1-15,Y0+25,8,6,0,0,6.283);s.fill();s.fillStyle='#9fc6e6';s.beginPath();s.ellipse(X1-15,Y0+24,5,3.5,0,0,6.283);s.fill();
 s.strokeStyle='#8a6a3c';s.lineWidth=2;s.beginPath();s.moveTo(X1-5,Y0+15);s.lineTo(X1-5,Y0+34);s.stroke();s.fillStyle='#c9b27c';s.fillRect(X1-8,Y0+14,6,4)}}
/* Routenpunkte, die zu nah an der Kammer liegen (innerhalb von CFG.stash.gap Kacheln um den Ring), ruecken auf die naechste begehbare Kachel ausserhalb dieses Kastens (gleicher Strom, kein Zufall). Gilt im Raster, das genJewel gerade gebaut hat. */
function routeOut(R,K){const b=stashBox(K),g=CFG.stash.gap,x0=b[0]-1-g,x1=b[2]+1+g,y0=b[1]-1-g,y1=b[3]+1+g,inB=p=>p[0]>=x0&&p[0]<=x1&&p[1]>=y0&&p[1]<=y1;
return R.map(p=>{if(!inB(p))return p;let best=null,bd=1e9;for(let x=x0-1;x<=x1+1;x++)for(let y=y0-1;y<=y1+1;y++){const q=[x,y];if(inB(q)||x<1||y<1||isSol(x,y))continue;const d=Math.abs(x-p[0])+Math.abs(y-p[1])*1.5;if(d<bd){bd=d;best=q}}return best||p})}
function jewelLayout(sd){const sn=typeof sd==='number'?sd:7,G=CFG.jewGen;if(G.on){const H=jwHallOf(sn);for(let k=0;k<G.tries;k++){const P=jewParams(sn,k);if(P.classic)return genJewel(sn,P);if(P.hw<H.minHw||P.hd<H.minHd)continue;const lay=finishLay(genJewel(sn,P));if(validateMap(lay).ok){lay.tries=k+1;return lay}}}return genJewel(sn,CLASSICJW)}
function genJewel(sn,P){const hw=P.hw,hd=P.hd,vx=P.vx,dx=hw-13,dy=hd-12,sy=Math.max(0,hd-13),vd=hw-2-vx,X1=37+dx;newGrid(44+dx,30+sy,-6,-6);fill(-6,-6,X1,23+sy,'o');
fill(-6,-6,X1,-5,'#');fill(-6,-6,-3,13+sy,'#');fill(X1,-4,X1,23+sy,'f');fill(-6,23+sy,X1-1,23+sy,'f');setc(X1,7,'o');setc(X1,8,'o');
fill(0,0,23+dx,13+dy,'#');fill(1,1,22+dx,12+dy,'.');
fill(14+dx,1,14+dx,6,'#');fill(14+dx,6,22+dx,6,'#');setc(17+dx,6,'d');fill(19+dx,1,19+dx,5,'#');setc(19+dx,2,'V');setc(19+dx,3,'V');
fill(14+dx,7,14+dx,9,'C');fill(15+dx,9,21+dx,9,'C');setc(20+dx,9,'r');setc(22+dx,9,'g');
const H=P.hall!=null?JW_HALLS[P.hall]:jwHallOf(sn),HT=H.mk(hw,hd,vd),ISL=HT.isl,PED=[],box=a=>[a[0],a[1],a[0]+a[2]-1,a[1]+a[3]-1];
const SK=P.stash?{kind:P.stash,door:[3,hd],out:[4,hd],cells:[[1,hd-1],[2,hd-1],[1,hd],[2,hd]],deep:[[1,hd-1],[2,hd-1]]}:null;
for(let x=2;x<=vd-3;x+=3)if(!(SK&&x===2))PED.push(x);[14,17,20].forEach(x=>PED.push(x+dx));
ISL.forEach(a=>fill(...box(a),'C'));HT.wall.forEach(a=>fill(...box(a),'C'));PED.forEach(x=>fill(x,hd,x+1,hd,'C'));HT.part.forEach(a=>fill(...box(a),'#'));HT.pil.forEach(a=>setc(a[0],a[1],'P'));
const winS=[];for(let x=1;x<=22+dx;x++)if(x!==vd&&x!==vd+1&&!(SK&&x<=3)){setc(x,13+dy,'W');winS.push(x)}setc(vd,13+dy,'D');setc(vd+1,13+dy,'D');
/* Kammer in der Suedwestecke der Halle (Innenraum 2 x 2 an der West- und Suedwand, Wand darueber und rechts, Tuer unten rechts zur Suedgasse, die Fenster davor sind Wand, das erste Podest und die Pflanze entfallen). Ausserhalb der Sicht der Kassierer (Reichweite 7,8 Kacheln), die Routen halten Abstand (routeOut), die Kamera der Ecke entfaellt. */
if(SK){fill(0,hd-2,3,hd-2,'#');fill(3,hd-2,3,hd,'#');setc(3,hd,'d')}
setc(23+dx,7,'D');setc(23+dx,8,'D');setc(17+dx,0,'L');
[[15,2],[16,2]].forEach(a=>setc(a[0]+dx,a[1],'m'));[[15,4],[16,4],[17,4]].forEach(a=>setc(a[0]+dx,a[1],'e'));
HT.plants.filter(a=>!(SK&&a[0]<=3&&a[1]>=hd-2)).forEach(a=>setc(a[0],a[1],'p'));HT.bench.forEach(a=>setc(a[0],a[1],'b'));
fill(27+dx,0,30+dx,1,'v');fill(31+dx,11,34+dx,12,'v');
const sx=(a,t)=>a[0]>=t?a[0]+dx:a[0];
[[6,-2],[7,-2],[14,-3],[21,-2],[30,-3],[33,-2],[25,12],[35,2]].forEach(a=>setc(sx(a,24),a[1],'k'));[[3,-3],[10,-4],[26,-3],[35,-2],[24,12],[-2,5],[-2,10]].forEach(a=>setc(sx(a,24),a[1],'q'));[[2,22],[9,22],[16,22],[24,22],[31,22],[0,15],[23,15]].forEach(a=>setc(sx(a,23),a[1]+sy,'p'));
// Beute: Vitrinen (Mitte und Rechteck in Pixeln)
const vit=[],cases=[],addV=(k,x,y,w,h)=>vit.push({k,x:(x+w/2)*T,y:(y+h/2)*T,rc:[x*T,y*T,w*T,h*T]});
ISL.forEach(a=>{cases.push([a[0],a[1],a[2],a[3]]);const n=a[4],hor=a[2]>=a[3];for(let i=0;i<n;i++)hor?addV('isl',a[0]+i*a[2]/n,a[1],a[2]/n,a[3]):addV('isl',a[0],a[1]+i*a[3]/n,a[2],a[3]/n)});
HT.wall.forEach(a=>{cases.push([a[0],a[1],a[2],a[3]]);addV('wall',a[0],a[1],a[2],a[3])});PED.forEach(x=>{cases.push([x,hd,2,1]);addV('win',x,hd,2,1)});cases.push([16+dx,9,4,1]);addV('ctr',16+dx,9,2,1);addV('ctr',18+dx,9,2,1);
// Auftragslage und Optik aus eigenen Zufallsstroemen
const mr=mulberry32((((sn)*2654435761)>>>0)^0x5bd1e995),ms=genMission(mr,'j',sn),tr=mulberry32((((sn)*40503)>>>0)^0x1b873593);tr();const tw=tr(),di=tw<.35?0:tw<.55?1:tw<.85?2:3;
ms.ev=ms.ev.filter(e=>e!=='transport');ms.civ=Math.max(2,Math.round(ms.civ*.6));
/* Gedraenge (wie bei der Tankstelle): Die freie Flaeche der Halle begrenzt Wachen und Kameras der erzeugten Huellen (die Klassik-Huelle bleibt wie sie ist). */
let fr=0;for(let y=1;y<=hd;y++)for(let x=1;x<=hw;x++)if(!isSol(x,y))fr++;if(SK)fr-=4;
const CR=CFG.jewGen.crowd;if(!P.classic&&fr<CR.two)ms.guards=Math.min(ms.guards,1);
const R0=SK?routeOut(HT.route,SK):HT.route,MR0=[[16,3],[18,3],[18,5],[17,7],[20,8],[16,8]].map(a=>[a[0]+dx,a[1]]),guards=[];
if(ms.guards>=1){const rt=rotR(R0,ms.rot[0]%6,ms.rot[1]);guards.push({p:rt[0],route:rt})}
if(ms.guards>=2){const rt=rotR(R0,(ms.rot[0]+3)%6,!ms.rot[1]);guards.push({p:rt[0],route:rt})}
const camc0=[{x:1.5*T,y:1.5*T,a0:.78,amp:.6,sp:.6,rng:270,fov:.5},{x:(hw+.5)*T,y:1.5*T,a0:2.4,amp:.6,sp:.55,rng:250,fov:.5},{x:1.5*T,y:(hd+.4)*T,a0:-.78,amp:.55,sp:.5,rng:250,fov:.5},{x:(hw+.5)*T,y:(hd+.4)*T,a0:-2.35,amp:.55,sp:.5,rng:240,fov:.5},
{x:(22.4+dx)*T,y:7.4*T,a0:2.4,amp:.5,sp:.5,rng:230,fov:.5},{x:(15.5+dx)*T,y:1.5*T,a0:.8,amp:.6,sp:.6,rng:180,fov:.55},{x:(18.5+dx)*T,y:-.45*T,a0:3.14,amp:.55,sp:.5,rng:300,fov:.5},{x:(24.6+dx)*T,y:5*T,a0:2.6,amp:.5,sp:.5,rng:260,fov:.5}],camc=SK?camc0.filter((_,i)=>i!==2):camc0;
const idx=camc.map((_,i)=>i);for(let i=idx.length-1;i>0;i--){const j=Math.floor(mr()*(i+1));[idx[i],idx[j]]=[idx[j],idx[i]]}
let nCam=Math.max(4,Math.min(camc.length,ms.cams-1));if(!P.classic&&fr<CR.few)nCam=Math.min(nCam,CR.camsFew);
const camsSel=idx.slice(0,nCam).sort((a,b)=>a-b).map(i=>{const c=camc[i];return Object.assign({},c,{a0:c.a0+(mr()-.5)*.3,rng:c.rng+Math.round((mr()-.5)*40)})});
const ev=ms.ev,evTag={wache:'Wachwechsel',strom:'Stromausfall',streife:'Streife in der Nähe',feiertag:'Feiertag'},extra=[];
/* Der Wachwechsel-Wachmann beginnt in den erzeugten Huellen nicht auf den Kacheln direkt an der Vordertuer (Klassik wie vorher) */
const wp=P.classic?[vd,hd]:[[vd,hd-1],[vd+1,hd-1],[vd-1,hd-1],[vd+2,hd-1]].find(a=>!isSol(a[0],a[1]))||[vd,hd];
if(ev.includes('wache'))extra.push({p:wp,route:rotR(R0,3,true),at:ms.at.wache,msg:'Wachwechsel: Ein zweiter Wachmann betritt den Laden.'});
const tags=[];if(ms.vault==='drill')tags.push('Tresor nur laut');if(ms.guards===0)tags.push('keine Wache');else if(ms.guards===2)tags.push('zwei Wachen');if(ms.civ>=5)tags.push('viel Kundschaft');else if(ms.civ<=2)tags.push('kaum Kundschaft');if(camsSel.length!==6)tags.push(camsSel.length+' Kameras');tags.unshift(...(ms.lg||[]).map(k=>lgN(ms,k)),...ev.map(e=>evTag[e]));
const deskT=[[15,4],[16,4],[17,4]].map(a=>[a[0]+dx,a[1]]),pools=ISL.map(a=>[(a[0]+a[2]/2)*T,(a[1]+a[3]/2)*T,100]).concat([[(18+dx)*T,9.5*T,120],[(21.5+dx)*T,2.5*T,80],[(17+dx)*T,3.5*T,90],[(vd+1)*T,hd*T,90]]);
return{seed:sn,decor:decorOf(DC_JEWEL(dx,sy)),jewel:true,cone:true,hall:H.n,theme:mkThemeOf(THEME_NOIR,ms.lg.includes('nacht')?4:di,0),bld:{x0:0,y0:0,x1:23+dx,y1:13+dy},winN:[],winS,
mat:(x,y)=>{if(x>=0&&x<=23+dx&&y>=0&&y<=13+dy){if(y<=5&&x>=15+dx&&x<=18+dx)return'w';if(y<=5&&x>=20+dx)return'm';if(y>=7&&y<=8&&x>=15+dx)return'w';return't'}
if(y>=22+sy)return'l';if(y>=20+sy)return's';if(y>=16+sy)return'a';if(y>=14+sy)return's';if(x>23+dx)return'a';return'y'},
paintFloor(s){const r=mulberry32(sn*7+1);s.lineWidth=1;
for(let i=0;i<70;i++){const x=T+r()*hw*T,y=T+r()*hd*T;s.strokeStyle='rgba(255,255,255,'+(.03+r()*.04)+')';s.beginPath();s.moveTo(x,y);s.quadraticCurveTo(x+r()*60-30,y+r()*40-20,x+r()*90-45,y+r()*60-30);s.stroke()}
for(let i=0;i<25;i++){const x=(14+dx)*T+r()*9*T,y=10*T+r()*(hd-9)*T;s.strokeStyle='rgba(255,255,255,'+(.03+r()*.04)+')';s.beginPath();s.moveTo(x,y);s.quadraticCurveTo(x+r()*50-25,y+r()*30-15,x+r()*80-40,y+r()*40-20);s.stroke()}
const cx=(hw+2)/2,cy=(hd+3)/2;
s.strokeStyle='rgba(212,169,74,.6)';s.lineWidth=2;s.strokeRect(1.5*T,2.5*T,(hw-1)*T,(hd-2)*T);s.strokeRect(1.5*T+5,2.5*T+5,(hw-1)*T-10,(hd-2)*T-10);
s.lineWidth=1;s.strokeStyle='rgba(212,169,74,.4)';s.beginPath();s.moveTo(cx*T,(cy-3)*T);s.lineTo((cx+2.7)*T,cy*T);s.lineTo(cx*T,(cy+3)*T);s.lineTo((cx-2.7)*T,cy*T);s.closePath();s.stroke();
s.globalCompositeOperation='lighter';for(const L of pools){const g2=s.createRadialGradient(L[0],L[1],0,L[0],L[1],L[2]);g2.addColorStop(0,'rgba(255,206,140,.14)');g2.addColorStop(1,'rgba(255,206,140,0)');s.fillStyle=g2;s.beginPath();s.arc(L[0],L[1],L[2],0,6.283);s.fill()}s.globalCompositeOperation='source-over';if(SK)stashFloor(s,SK)},
paintTop(s){const r=mulberry32(sn*13+5);
decorPaint(s,DC_JEWEL(dx,sy).map((d,i)=>Object.assign({i,bx:d.x,by:d.y},d)));
for(const a of cases)jwCase(s,a[0]*T,a[1]*T,a[2]*T,a[3]*T,r);
s.fillStyle='#3b4048';s.fillRect((16+dx)*T+8,1*T+2,16,10);s.fillStyle='#e0b020';s.fillRect((16+dx)*T+14,1*T+5,4,4);s.fillStyle='rgba(255,255,255,.25)';s.fillRect((16+dx)*T+8,1*T+2,16,1);
s.fillStyle='rgba(255,255,255,.28)';for(let i=0;i<4;i++)s.fillRect(0*T+10+i*30,(18+sy)*T+14,12,2);for(let i=0;i<8;i++)s.fillRect(8*T+i*30,(18+sy)*T+14,12,2);for(let i=0;i<8;i++)s.fillRect(24*T+i*30,(18+sy)*T+14,12,2);if(SK)stashTop(s,SK)},
spawn:{x:(vd+.9)*T,y:(14.6+dy)*T},
zones:[[15+dx,1,18+dx,5],[20+dx,1,22+dx,5],[15+dx,7,22+dx,8],[0,-99,99,-1],[24+dx,-99,99,13+dy]],lobby:[1,2,hw,hd],
cams:camsSel,tellers:[[19+dx,8],[21+dx,8]],mgr:{p:MR0[0],route:MR0},guards,civ:ev.includes('feiertag')?Math.min(CFG.ev.civMax,ms.civ*2):ms.civ,
mission:{code:ms.code,vault:ms.vault,guards:ms.guards,west:false,cams:camsSel.length,civ:ms.civ,tags,ev,lg:ms.lg||[],...(ms.lgw?{lgw:ms.lgw}:{}),at:ms.at,extra,bags:[],blackoutAt:ev.includes('strom')?ms.at.strom:null},
note:deskT[ms.noteIdx%3],mon:[15+dx,2],vault:{door:[19+dx,2],pad:[18+dx,4],dir:1,bundles:[[20+dx,1],[22+dx,1],[20+dx,4],[22+dx,4]]},tills:[[20+dx,9]],atms:[],backDoors:[[17+dx,0]],
sw:{x:(16+dx)*T+16,y:1*T+22},exit:{x:(24+dx)*T,y0:6*T,y1:10*T,dir:1,tx:24+dx},van:{y:8*T,x0:(30+dx)*T,stop:(24+dx)*T,dir:-1},flip:false,
...(P.classic?{posts:[{x:4,y:15,a:-1.57,k:'S'},{x:26,y:6,a:3.14,k:'E',anchor:true},{x:-1,y:8,a:0,k:'W'},{x:17,y:-1,a:1.57,k:'N',door:[17,0]},{x:10,y:15,a:-1.57,k:'S'},{x:26,y:9,a:3.14,k:'E',anchor:true},{x:11,y:-1,a:1.57,k:'N'},{x:15,y:15,a:-1.57,k:'S'},{x:-1,y:4,a:0,k:'W'},{x:22,y:-1,a:1.57,k:'N'},{x:7,y:15,a:-1.57,k:'S'},{x:27,y:4,a:3.14,k:'E',anchor:true},{x:5,y:-1,a:1.57,k:'N'},{x:-1,y:12,a:0,k:'W'},{x:13,y:15,a:-1.57,k:'S'},{x:20,y:15,a:-1.57,k:'S'}],
slots:{W:[14,9,4,-1],E:[19,24,29,34]}}:{q:{hw,hd,vx}}),...(SK?{stash:SK}:{}),laneY:(19+sy)*T,title:{cx:Math.round((CX.WX0*T+((CX.WX0+CX.W)*T-VW))/2),ax:Math.floor(((CX.WX0+CX.W)*T-VW-CX.WX0*T)/2*.85),cy:-10,ay:110},vit}}
/* ---- Gemeinsame Helfer der neuen Karten (Tankstelle, Museum, Casino): Raster aus Textzeilen, Rahmen der Welt, Kameras waehlen, Lage-Text. ---- */
const asc=(rows,x0,y0)=>rows.forEach((r,j)=>{for(let i=0;i<r.length;i++)if(r[i]!==' ')setc(x0+i,y0+j,r[i])});
function frameWorld(w,h,x0,y0,wy1){newGrid(w,h,x0,y0);const x1=x0+w-1,y1=y0+h-1;fill(x0,y0,x1,y1,'o');fill(x0,y0,x1,y0+1,'#');fill(x0,y0,x0+3,wy1,'#');fill(x1,y0+2,x1,y1,'f');fill(x0,y1,x1-1,y1,'f')}
function pickCams(mr,camc,n){const idx=camc.map((_,i)=>i);for(let i=idx.length-1;i>0;i--){const j=Math.floor(mr()*(i+1));[idx[i],idx[j]]=[idx[j],idx[i]]}
return idx.slice(0,Math.min(camc.length,n)).sort((a,b)=>a-b).map(i=>{const c=camc[i];return Object.assign({},c,{a0:c.a0+(mr()-.5)*.3,rng:c.rng+Math.round((mr()-.5)*40)})})}
function lageTags(ms,ev,evTag,camN,camBase,extra){const tags=[];if(ms.vault==='drill')tags.push('Tresor nur laut');if(ms.guards===0)tags.push('keine Wache');else if(ms.guards>=2&&!extra)tags.push('zwei Wachen');if(camN!==camBase)tags.push(camN+' Kameras');(extra||[]).forEach(t=>tags.push(t));tags.unshift(...(ms.lg||[]).map(k=>lgN(ms,k)),...ev.map(e=>evTag[e]));return tags}
const titleBox=()=>({cx:Math.round((CX.WX0*T+((CX.WX0+CX.W)*T-VW))/2),ax:Math.floor(((CX.WX0+CX.W)*T-VW-CX.WX0*T)/2*.85),cy:-10,ay:110});
/* ---- Szenario Tankstelle: kleiner Laden (Gebaeude x0..15, y0..10) mit Vorfeld und Zapfsaeulen im Sueden, Lager und Safe im Nordwesten, Kasse mit Zigarettenregal im Nordosten.
   Eingaenge: Vordertuer (Glas, Sueden), Hintertuer ins Lager (Norden, Personaltuer) und Osttuer (Glas, Fluchttuer zum Hof). Die Polizei kommt frueh (CFG.gas.pol), die Zapfsaeulen explodieren. ---- */
/* Tankstelle, Verkaufsraeume (aus dem Seed, eigener Strom, wie JW_HALLS beim Juwelier): sh = vier Regalstuecke [x,y,w,h] (je 800), lg = vier Kisten im Lager [x,y,Zeichen], pu = Zapfsaeuleninseln [x,y] (je zwei Saeulen nebeneinander, y immer 12), route = Wachroute.
   Verkaufsraum x1..14, y6..9. Frei bleiben der Eingangsbereich (x6..9, y8..9), die Zeile y6 am Tresen (x10..14, Gatter bei 10 und Kasse bei 12), die Osttuer (x13..14, y7..8). Die Beute bleibt gleich (5 Zigarettenstuecke, 4 Regalstuecke, gleiche Werte).
   Bauregeln (mit dem Bot gemessen, siehe docs/szenarien.md): (1) Lager: immer der 2x2-Block bei x6..7, y3..4 (nur die Fass-Position wechselt). Er ist Deckung zwischen Lagertuer und Safe, mit anderen Formen (Reihe, T) verlor der Safe-Camper-Bot im Gierig-Lauf von 97 auf 33 bis 47 %. Eine Kiste bei x5 liegt in der Reichweite des Tresor-Standplatzes (4,3) und nimmt der Taste E den Tresor weg. (2) Routenpunkte mindestens 5 Kacheln vom Eingang (8,9): jeder kann Startpunkt der Wache beim Alarm sein, und eine Wache neben der Tuer steht dem Bot auf den Fuessen (Kugeln starten hinter ihr). (3) Zapfsaeulen: die innere Saeule hoechstens bei x4 links und mindestens bei x11 rechts, die Explosion reicht 3 Kacheln. (4) Regale an der Suedwand (vor den Fenstern) machten den Gierig-Lauf von 97 auf 82 %, an der Nordwand sind sie sicherer. */
const GS_SHOPS=[
{n:'Klassik',minSd:4,sh:s=>[[3,7,2,1],[5,7,2,1],[s-5,7,2,1],[s-3,7,2,1]],lg:[[6,3,'k'],[7,3,'k'],[6,4,'k'],[7,4,'q']],pl:3,pr:3,rt:(l,r,t,b)=>[[r,b],[r,t],[l,t],[l,b]]},
{n:'Insel',minSd:3,sh:s=>[[3,7,2,1],[5,7,2,1],[3,8,2,1],[5,8,2,1]],lg:[[6,3,'q'],[7,3,'k'],[6,4,'k'],[7,4,'k']],pl:2,pr:2,rt:(l,r,t,b)=>[[r,b],[r,t],[l,t],[l,b]]},
{n:'Wandregale',minSd:3,sh:s=>[[2,6,2,1],[4,6,2,1],[6,6,2,1],[8,6,2,1]],lg:[[6,3,'k'],[7,3,'k'],[6,4,'q'],[7,4,'k']],pl:1,pr:1,rt:(l,r,t,b)=>[[r,t+1],[r,b],[l,b],[l,t+1]]},
{n:'Gänge',minSd:5,sh:s=>[[3,7,1,2],[5,7,1,2],[s-5,7,1,2],[s-3,7,1,2]],lg:[[6,3,'k'],[7,3,'q'],[6,4,'k'],[7,4,'k']],pl:3,pr:1,rt:(l,r,t,b,e)=>[[r,b],[r,t],[Math.min(4,Math.floor(e-Math.sqrt(Math.max(0,25-(b-t)*(b-t))))),t],[l,b]]}];
/* Huelle der Tankstelle aus Parametern (Plan Mehr Abwechslung, Sprint 6): sw Breite der Verkaufsflaeche (Klassik 14, x1..sw), sd Zahl ihrer Zeilen (4, y6..5+sd), er erste Zeile der Fluchttuer (7, zwei Kacheln), np Zahl der Zapfsaeuleninseln (2), ps bei einer Insel die Seite.
   Das Lager mit Safe (x0..9, y0..4) bleibt ein fester Block, die Tresenkammer (x10..sw) waechst mit sw, die Vordertuer liegt mittig (fd = 1 + (sw-2)/2). Mit sw 14, sd 4, er 7, np 2 ergibt jede Halle exakt die Karte von vorher (Test 37-tankstelle-generator). */
function gasRows(sw,sd,er){const cw=sw-9,fd=1+Math.floor((sw-2)/2),rw=['#######L'+'#'.repeat(sw-6),'#..#ee..m#'+'C'.repeat(cw)+'#','#..V.....#'+'.'.repeat(cw)+'#','#..V.....d'+'.'.repeat(cw)+'#','#..#.....#'+'.'.repeat(cw)+'#','##########g'+'C'+'r'+'C'.repeat(cw-3)+'#'];
for(let y=6;y<=5+sd;y++)rw.push('W'+'.'.repeat(sw)+(y===6?'#':y===er||y===er+1?'D':'W'));
let fr='#';for(let x=1;x<=sw;x++)fr+=x===fd||x===fd+1?'D':'W';rw.push(fr+'#');return rw}
function gsBoxes(c,x,y,w,h,r,pal){const n=Math.max(2,Math.floor(w/6)),m=Math.max(1,Math.floor(h/9));c.fillStyle='rgba(0,0,0,.35)';c.fillRect(x+2,y+h-4,w-4,3);for(let j=0;j<m;j++)for(let i=0;i<n;i++){c.fillStyle=pal[Math.floor(r()*pal.length)];c.fillRect(x+3+i*(w-6)/n,y+3+j*(h-6)/m,(w-6)/n-1.5,(h-6)/m-1.5)}}
const CLASSICGP={sw:14,sd:4,er:7,np:2,ps:'L',classic:true};
/* Zufallsparameter der Tankstelle (eigener Strom, wie genParams der Bank): k ist der Versuch, Versuch 0 ist mit CFG.gasGen.classic die Klassik-Huelle. */
function gasParams(sn,k){const G=CFG.gasGen,P=Object.assign({},CLASSICGP);if(!G.on)return P;const r=mulberry32((Math.imul(sn|0,374761393)+Math.imul(k+1,668265263))^0x2f6b1d93),ri=(a,b)=>a+Math.floor(r()*(b-a+1)),c=r();if(k===0&&c<G.classic)return P;
P.sw=ri(G.sw[0],G.sw[1]);P.sd=ri(G.sd[0],G.sd[1]);P.er=ri(7,4+P.sd);const q=r();P.np=q<.2?1:q<.8?2:3;P.ps=r()<.5?'L':'R';P.classic=P.sw===14&&P.sd===4&&P.er===7&&P.np===2;return P}
function gsShopOf(sn){const hr=mulberry32((((sn)*7919)>>>0)^0x3a1f5c27);return GS_SHOPS[Math.floor(hr()*GS_SHOPS.length)]}
/* Breite der Verkaufsflaeche (Paket P1): schiebt einen 2x2-Block ueber freie Kacheln (x 1..sw, y 6..5+sd) von einem Startblock an der Vordertuer (unterste Zeile, ueberlappt die zwei Tuerkacheln um mindestens eine Spalte) bis zu einem Zielblock an der Fluchttuer (Spalte sw, ueberlappt die zwei Tuerzeilen um mindestens eine Zeile). Liest das Raster (isSol), q = lay.q (sw, sd, er). */
function gasWide(q){const sw=q.sw,sd=q.sd,er=q.er,fd=1+Math.floor((sw-2)/2),ok=(x,y)=>x>=1&&y>=6&&x+1<=sw&&y+1<=sd+5&&!isSol(x,y)&&!isSol(x+1,y)&&!isSol(x,y+1)&&!isSol(x+1,y+1),seen=new Set(),w=[];
for(let x=fd-1;x<=fd+1;x++)if(ok(x,sd+4)){w.push([x,sd+4]);seen.add(x+','+(sd+4))}
for(let h=0;h<w.length;h++){const c=w[h];if(c[0]===sw-1&&c[1]>=er-1&&c[1]<=er+1)return true;for(const d of CX.D4){const nx=c[0]+d[0],ny=c[1]+d[1],k=nx+','+ny;if(seen.has(k)||!ok(nx,ny))continue;seen.add(k);w.push([nx,ny])}}return false}
/* Breite des Juweliers (Sprint 7, wie gasWide): schiebt einen 2x2-Block ueber freie Kacheln der Halle und des Bereichs unter dem Tresen (x 1..22+dx, y 1..hd) von einem Startblock an der Vordertuer (unterste Zeile hd-1, ueberlappt die Tuerkacheln vd und vd+1 um mindestens eine Spalte) bis vor das Tresentor (Block links oben (21+dx, 10)). q = lay.q (hw, hd, vx). */
/* Enge Gaenge im Museum (Sprint 8, wie jewWide): In den beiden Galerien (West x1..ww, Ost x18+dx..26+ox ab Zeile 6) darf es keinen Gang der Breite 1 und der Laenge mindestens 3 geben, dessen Seiten Wand, Pfeiler oder Tresen sind (Pflanzen und Baenke zaehlen nicht, kurze Nischen neben einer Vitrine auch nicht). q = lay.q (ww, ew, dy). Das Atrium ist in allen Huellen derselbe Block und gehoert nicht dazu. */
function muTubes(q){const ww=q.ww,dx=ww-9,ox=dx+q.ew-9,S=16+q.dy,B='C#P',fr=(x,y)=>!isSol(x,y),hn=(x,y)=>fr(x,y)&&B.includes(cell(x-1,y))&&B.includes(cell(x+1,y)),vn=(x,y)=>fr(x,y)&&B.includes(cell(x,y-1))&&B.includes(cell(x,y+1));let n=0;
for(const [x0,x1,y0,y1] of [[1,ww,1,S],[18+dx,26+ox,6,S]])for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){if(y+2<=y1&&hn(x,y)&&hn(x,y+1)&&hn(x,y+2))n++;if(x+2<=x1&&vn(x,y)&&vn(x+1,y)&&vn(x+2,y))n++}return n}
/* Enge Gaenge im Casino (Sprint 9, wie muTubes): In der Halle (x1..38+dx ab Zeile 10, dazu x12..38+dx in den Zeilen 7 bis 9) darf es keinen Gang der Breite 1 und der Laenge mindestens 6 geben, dessen Seiten Tresen, Wand oder Pfeiler sind (Pflanzen und Baenke zaehlen nicht). Gemessen: Die handgebaute Promenade hat zwei gestaltete Gaenge der Laenge 4 und 5 (Automatengasse, Spalt zwischen Tischen und Theke), sie duerfen nicht anschlagen. q = lay.q (dx, dy, vx). */
function csTubes(q){const S=22+q.dy,B='C#P',fr=(x,y)=>!isSol(x,y),hn=(x,y)=>fr(x,y)&&B.includes(cell(x-1,y))&&B.includes(cell(x+1,y)),vn=(x,y)=>fr(x,y)&&B.includes(cell(x,y-1))&&B.includes(cell(x,y+1));let n=0;
for(const [x0,x1,y0,y1] of [[1,38+q.dx,10,S],[12,38+q.dx,7,9]])for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){let ok=true;for(let k=0;k<6&&ok;k++)ok=y+k<=y1&&hn(x,y+k);if(ok)n++;ok=true;for(let k=0;k<6&&ok;k++)ok=x+k<=x1&&vn(x+k,y);if(ok)n++}return n}
function jewWide(q){const hw=q.hw,hd=q.hd,dx=hw-13,vd=hw-2-q.vx,ok=(x,y)=>x>=1&&y>=1&&x+1<=22+dx&&y+1<=hd&&!isSol(x,y)&&!isSol(x+1,y)&&!isSol(x,y+1)&&!isSol(x+1,y+1),seen=new Set(),w=[];
for(let x=vd-1;x<=vd+1;x++)if(ok(x,hd-1)){w.push([x,hd-1]);seen.add(x+','+(hd-1))}
for(let h=0;h<w.length;h++){const c=w[h];if(c[0]===21+dx&&c[1]===10)return true;for(const d of CX.D4){const nx=c[0]+d[0],ny=c[1]+d[1],k=nx+','+ny;if(seen.has(k)||!ok(nx,ny))continue;seen.add(k);w.push([nx,ny])}}return false}
function gasLayout(sd){const sn=typeof sd==='number'?sd:7,G=CFG.gasGen;if(G.on){const H=gsShopOf(sn);for(let k=0;k<G.tries;k++){const P=gasParams(sn,k);if(P.classic)return genGas(sn,P);if(P.sd<H.minSd||P.sw*P.sd<G.minArea)continue;const lay=finishLay(genGas(sn,P));if(validateMap(lay).ok){lay.tries=k+1;return lay}}}return genGas(sn,CLASSICGP)}
function genGas(sn,P){const sw=P.sw,sd=P.sd,er=P.er,fd=1+Math.floor((sw-2)/2),bot=5+sd,wall=6+sd,dx=sw-14,cx0=10;frameWorld(44,30,-6,-6,13);setc(37,er,'o');setc(37,er+1,'o');
const H=P.shop!=null?GS_SHOPS[P.shop]:gsShopOf(sn),SH=H.sh(sw),py=wall+2,pxL=Math.min(H.pl,fd-4),pxR=Math.max(sw-H.pr,fd+4),isl=[];
if(P.np>=2||P.ps==='L')isl.push([pxL,py]);if(P.np>=2||P.ps==='R')isl.push([pxR,py]);if(P.np===3){if(pxR-3>=fd+4)isl.push([pxR-3,py]);else if(pxL+3<=fd-4)isl.push([pxL+3,py])}isl.sort((a,b)=>a[0]-b[0]);
const PU=[].concat(...isl.map(a=>[[a[0],a[1]],[a[0]+1,a[1]]]));
asc(gasRows(sw,sd,er),0,0);SH.forEach(a=>fill(a[0],a[1],a[0]+a[2]-1,a[1]+a[3]-1,'C'));H.lg.forEach(a=>setc(a[0],a[1],a[2]));PU.forEach(a=>setc(a[0],a[1],'u'));
const sx=a=>a[0]>=16?a[0]+dx:a[0];[[18,1],[19,1],[18,2],[-2,-3],[24,10],[28,4]].forEach(a=>setc(sx(a),a[1],'k'));[[20,5],[21,9],[17,11],[26,8],[-2,5],[-2,10],[10,-3]].forEach(a=>setc(sx(a),a[1],'q'));[[2,22],[9,22],[16,22],[24,22],[31,22],[0,15],[15,15]].forEach(a=>setc(a[0],a[1],'p'));
const winS=[];for(let x=1;x<=sw;x++)if(x!==fd&&x!==fd+1)winS.push(x);
const mr=mulberry32((((sn)*2654435761)>>>0)^0x5bd1e995),ms=genMission(mr,'g',sn),tr=mulberry32((((sn)*40503)>>>0)^0x1b873593),ti=tr()<.5?2:0,tw=tr(),di=tw<.35?0:tw<.55?1:tw<.85?2:3;
ms.civ=Math.max(1,Math.min(3,Math.round(ms.civ*.4)));ms.guards=ms.lg.includes('sicher')?2:Math.min(ms.guards,1);ms.cams=Math.max(2,Math.min(4,ms.cams-4));
/* Gedraenge (Paket P1): Die freie Flaeche der Verkaufsraeume begrenzt Kameras und Wachen der erzeugten Huellen (die Klassik-Huelle bleibt wie sie ist). */
const fr=sw*sd-SH.reduce((a,b)=>a+b[2]*b[3],0),CR=CFG.gasGen.crowd;if(!P.classic){if(fr<CR.few)ms.cams=Math.min(ms.cams,CR.camsFew);if(fr<CR.two)ms.guards=Math.min(ms.guards,1)}
const rl=Math.min(2,fd-5),rr=Math.max(sw-1,fd+6),R0=H.rt(rl,rr,6,bot,fd+1),NR=R0.length,guards=[];
if(ms.guards>=1){const rt=rotR(R0,ms.rot[0]%NR,ms.rot[1]);guards.push({p:rt[0],route:rt})}
if(ms.guards>=2){const rt=rotR(R0,(ms.rot[0]+(NR>>1))%NR,!ms.rot[1]);guards.push({p:rt[0],route:rt})}
const camc=[{x:1.5*T,y:6.4*T,a0:.75,amp:.6,sp:.6,rng:300,fov:.5},{x:(sw+.5)*T,y:6.4*T,a0:2.4,amp:.6,sp:.55,rng:300,fov:.5},{x:1.5*T,y:(bot+.5)*T,a0:-.7,amp:.55,sp:.5,rng:290,fov:.5},{x:6.5*T,y:1.4*T,a0:1.2,amp:.6,sp:.6,rng:230,fov:.55},{x:(cx0+2.5)*T,y:1.4*T,a0:1.57,amp:.6,sp:.55,rng:200,fov:.55},{x:(fd+1)*T,y:(wall+.4)*T,a0:1.57,amp:.7,sp:.5,rng:320,fov:.6}];
const camsSel=pickCams(mr,camc,ms.cams);
const ev=ms.ev.filter(e=>e!=='transport'),evTag={wache:'Wachwechsel',strom:'Stromausfall',streife:'Streife in der Nähe',feiertag:'Feiertag'},extra=[];ms.ev=ev;
/* Paket P1: der Wachwechsel-Wachmann beginnt in den erzeugten Huellen nicht auf den Kacheln direkt an der Vordertuer (Klassik-Huelle wie vorher) */
const wp=P.classic?[fd,bot]:[[fd,bot-1],[fd+1,bot-1],[fd-1,bot-1],[fd+2,bot-1]].find(a=>!isSol(a[0],a[1]))||[fd,bot];
if(ev.includes('wache'))extra.push({p:wp,route:rotR(R0,NR>>1,true),at:ms.at.wache,msg:'Wachwechsel: Ein Wachmann betritt die Tankstelle.'});
const tags=lageTags(ms,ev,evTag,camsSel.length,3);
const deskT=[[4,1],[5,1]],goods=[];
for(let x=Math.max(cx0,sw-4);x<=sw;x++)goods.push({k:'cig',x:x*T+16,y:T+16,rc:[x*T,T,T,T],r:46});
SH.forEach(a=>goods.push({k:'shelf',x:(a[0]+a[2]/2)*T,y:(a[1]+a[3]/2)*T,rc:[a[0]*T,a[1]*T,a[2]*T,a[3]*T],r:50}));
return{seed:sn,decor:decorOf(DC_GAS(dx)),gas:true,hall:H.n,theme:mkTheme(ti,ms.lg.includes('nacht')?4:di,0),bld:{x0:0,y0:0,x1:sw+1,y1:wall},winN:[],winS,
mat:(x,y)=>{if(x>=0&&x<=sw+1&&y>=0&&y<=wall)return(y<=4&&x!==9)?'w':'m';
if(y>=22)return'l';if(y>=20)return's';if(y>=16)return'a';if(y>=14)return's';if(x>sw+1)return'a';return'y'},
paintFloor(s){const r=mulberry32(sn*7+1);
for(let i=0;i<40;i++){const x=T+r()*(sw-1)*T,y=(wall+1)*T+r()*3*T,q=s.createRadialGradient(x,y,0,x,y,10+r()*14);q.addColorStop(0,'rgba(25,22,20,.28)');q.addColorStop(1,'rgba(25,22,20,0)');s.fillStyle=q;s.fillRect(x-24,y-24,48,48)}
for(const a of isl.map(q=>[q[0]-.6,q[1]-.45])){s.fillStyle='#7c828a';s.fillRect(a[0]*T,a[1]*T,3.2*T,1.9*T);s.fillStyle='#aeb4bb';s.fillRect(a[0]*T+3,a[1]*T+3,3.2*T-6,1.9*T-6)}
s.strokeStyle='rgba(235,200,60,.7)';s.lineWidth=2;s.strokeRect(1.2*T,(wall+1.2)*T,(sw-.4)*T,2.6*T);
s.fillStyle='rgba(255,255,255,.35)';for(let i=0;i<5;i++)s.fillRect((sw+2.5)*T+i*0,2*T+i*T*1.6,3*T,2)},
paintTop(s){const r=mulberry32(sn*13+5),PAL=['#c4402f','#e8b84a','#3a7fc4','#59a65a','#d8d4c8','#8a4fc4'];
decorPaint(s,DC_GAS(dx).map((d,i)=>Object.assign({i,bx:d.x,by:d.y},d)));
for(const q of goods)gsBoxes(s,q.rc[0],q.rc[1],q.rc[2],q.rc[3],r,q.k==='cig'?['#d8d4c8','#c4402f','#2a2e34','#e8b84a']:PAL);
s.fillStyle='#3b4048';s.fillRect(6*T+8,1*T+2,16,10);s.fillStyle='#e0b020';s.fillRect(6*T+14,1*T+5,4,4);s.fillStyle='rgba(255,255,255,.25)';s.fillRect(6*T+8,1*T+2,16,1);
s.fillStyle='rgba(255,255,255,.28)';for(let i=0;i<8;i++)s.fillRect(0*T+10+i*30,18*T+14,12,2);for(let i=0;i<8;i++)s.fillRect(14*T+i*30,18*T+14,12,2);for(let i=0;i<8;i++)s.fillRect(24*T+i*30,18*T+14,12,2)},
spawn:{x:(fd+.9)*T,y:(wall+2.3)*T},
zones:[[1,1,8,4],[10,1,sw,4],[0,-99,99,-1],[sw+2,-99,99,wall]],lobby:[1,6,sw,bot],
cams:camsSel,tellers:[[cx0+2,4]],mgr:null,guards,civ:ev.includes('feiertag')?Math.min(CFG.ev.civMax,ms.civ*2):ms.civ,
mission:{code:ms.code,vault:ms.vault,guards:ms.guards,west:false,cams:camsSel.length,civ:ms.civ,tags,ev,lg:ms.lg||[],...(ms.lgw?{lgw:ms.lgw}:{}),at:ms.at,extra,bags:[],blackoutAt:ev.includes('strom')?ms.at.strom:null},
note:deskT[ms.noteIdx%2],mon:[8,1],vault:{door:[3,2],pad:[4,4],dir:-1,bundles:[[1,2],[2,3]]},tills:[[cx0+2,5]],atms:[],backDoors:[[7,0]],
sw:{x:6*T+16,y:1*T+22},exit:{x:(sw+2)*T,y0:(er-1)*T,y1:(er+3)*T,dir:1,tx:sw+2},van:{y:(er+1)*T,x0:(sw+8)*T,stop:(sw+2)*T,dir:-1},flip:false,
...(P.classic?{posts:[{x:4,y:15,a:-1.57,k:'S'},{x:18,y:6,a:3.14,k:'E',anchor:true},{x:-1,y:8,a:0,k:'W'},{x:7,y:-1,a:1.57,k:'N',door:[7,0]},{x:10,y:15,a:-1.57,k:'S'},{x:18,y:9,a:3.14,k:'E',anchor:true},{x:3,y:-1,a:1.57,k:'N'},{x:14,y:15,a:-1.57,k:'S'},{x:-1,y:4,a:0,k:'W'},{x:12,y:-1,a:1.57,k:'N'},{x:7,y:15,a:-1.57,k:'S'},{x:19,y:4,a:3.14,k:'E',anchor:true},{x:5,y:-1,a:1.57,k:'N'},{x:-1,y:12,a:0,k:'W'},{x:12,y:15,a:-1.57,k:'S'},{x:2,y:15,a:-1.57,k:'S'}],
slots:{W:[12,7,2,-3],E:[17,22,27,32]}}:{q:{sw,sd,er,np:P.np,ps:P.ps}}),laneY:19*T,title:titleBox(),bn:CFG.gas.bn,polAt:CFG.gas.pol,wb:CFG.gas.wb,goods,
pumps:PU.map(a=>({x:a[0],y:a[1],hp:CFG.gas.pump.hp}))}}
/* ---- Szenario Museum bei Nacht: Gebaeude x0..27, y0..17. Westgalerie mit vier Gemaelden, Atrium mit Infotresen, Sicherheitsraum (Monitore, Hauptschalter, Hintertuer) im Norden, Ostgalerie mit Statue und Reliktvitrinen hinter einem Lasertor, Depot im Nordosten hinter einem zweiten Laser.
   Eingaenge: Haupteingang (Glas, Sueden), Hintertuer (Norden, direkt in den Sicherheitsraum) und Osttuer (Fluchttuer in der Ostgalerie, von innen leise zu entriegeln, so kommt man an den Lasern vorbei raus). Laser (LAY.lasers) loesen in Phase 1 Alarm aus, solange die Kameras laufen. ---- */
const THEME_MUSEUM={n:'museum',f:{t:[206,204,198,186,184,180,120],k:[88,60,70],w:[150,104,70],m:[176,174,170],l:[60,98,56],s:[150,148,142],a:[54,56,60],y:[110,108,104]},wall:['#6e6a66','#8d8984','#7b7772','#3f3c39','#48453f'],glass:['#bfd6ea','#6b8fb0'],counter:['#3c3430','#b9a98a'],pillar:['#5a5650','#9a948a'],door:['#3a3430','#7a7a82']};
/* Museum, Raeume (aus dem Seed, eigener Strom, wie JW_HALLS beim Juwelier): art = vier Gemaelde [x,y,Wand] (x,y = linke obere Bodenkachel der zwei Kacheln langen Hangung, Wand N/S/W/E = Seite der Wand oder Trennwand), ben = sechs Baenke (zerlegbares Material), pl = Pflanzen, pil = Saeulen (blickdicht, kugelsperrend), part = Trennwaende [x,y,w,h], desk = Infotresen [x,y,Laenge], rel = vier Reliktvitrinen [x,y] (2x1), st = Sockel der Statue [x,y] (2x2), pool = Lichtkegel im Westsaal [x,y,r], route = Wachroute (Westgalerie und Atrium, geschlossene Schleife).
   Festbleiben: Huelle des Mittelblocks, Atrium-Durchgaenge (x10 und x17, Zeilen 8..10, mit dx verschoben), die Zeilen 8 und 9 der Ostgalerie bis zur Osttuer (Fluchtweg unter dem Lasertor), Haupteingang, Sicherheitsraum und Depot samt Laser. Die Beute bleibt gleich (4 Gemaelde, Statue, 4 Reliktvitrinen, zwei Kassetten, gleiche Werte, 6 Baenke). Neuer Raum: Eintrag ergaenzen, Routen und Wachwechsel-Start begehbar halten. */
/* Hallen als Funktionen der Huelle (Sprint 8): mk(c) bekommt das Massobjekt aus muDims: ww Breite der Westgalerie (x1..ww, Klassik 9), dx = ww-9 (Versatz des Mittelblocks), ox = dx + (ew-9) (Versatz der Ostwand), dy Zusatztiefe, S letzte Innenzeile (16+dy), E1 letzte Spalte der Ostgalerie (26+ox), xc Mitte der Westgalerie, ax erstes Nordgemaelde, mid Mitte der Ostgalerie, cl Klassik-Huelle. Mit ww 9, ew 9 und dy 0 ergibt jede Halle exakt die alte Tabelle (Selbsttest 42-museum-basis). Nur der Ring stellt die Reliktvitrinen in erzeugten Huellen eine Kachel weiter nach Osten (sonst waere Spalte 18 ein Gang der Breite 1 und 4 Kacheln Laenge). */
const muDims=P=>{const ww=P.ww,dx=ww-9,ox=dx+P.ew-9,S=16+P.dy;return{ww,dx,ox,dy:P.dy,S,E1:26+ox,xc:Math.floor(ww/2)+1,ax:Math.ceil((ww-4)/2)+1,mid:22+Math.floor((dx+ox)/2),cl:!!P.classic}};
const MU_HALLS=[
{n:'Klassik',minWw:7,minEw:9,mk:c=>({art:[[1,3,'W'],[1,c.S-5,'W'],[c.ax,1,'N'],[c.ax+3,1,'N']],ben:[[c.xc,8],[c.xc,c.S-4],[12+c.dx,c.S-5],[15+c.dx,c.S-5],[c.mid-1,c.S-3],[c.mid,c.S-3]],pl:[[1,6],[c.ww,6],[c.ww,c.S-1],[11+c.dx,6],[16+c.dx,6],[11+c.dx,c.S],[16+c.dx,c.S]],pil:[],part:[],desk:[13+c.dx,c.S-2,3],rel:[[19+c.dx,7],[24+c.ox,7],[19+c.dx,c.S-2],[24+c.ox,c.S-2]],st:[c.mid,10],pool:[[c.xc,9,120]],route:[[c.xc-1,c.S-1],[c.xc-1,7],[c.ww-1,7],[c.ww,9],[14+c.dx,9],[14+c.dx,c.S-1]]})},
{n:'Kabinette',minWw:7,minEw:9,mk:c=>({art:[[c.ax,1,'N'],[c.ax+3,1,'N'],[2,6,'N'],[6,c.S-5,'S']],ben:[[c.xc,8],[c.xc,10],[12+c.dx,8],[15+c.dx,8],[19+c.dx,c.S-5],[19+c.dx,c.S-4]],pl:[[c.ww,6],[1,c.S],[c.ww,c.S-3],[11+c.dx,6],[16+c.dx,6],[11+c.dx,c.S],[16+c.dx,c.S]],pil:[],part:[[1,5,c.ww-3,1],[4,c.S-4,c.ww-3,1]],desk:[12+c.dx,c.S-3,4],rel:[[19+c.ox,c.S-1],[21+c.ox,c.S-1],[23+c.ox,c.S-1],[25+c.ox,c.S-1]],st:[c.mid,11],pool:[[c.xc,3,110],[c.xc,9,110],[c.xc,c.S-2,110]],route:[[c.ww-1,3],[3,3],[2,9],[3,c.S-2],[c.ww,9],[14+c.dx,12]]})},
{n:'Säulenhalle',minWw:7,minEw:9,mk:c=>({art:[[1,3,'W'],[1,c.S-5,'W'],[c.ax,1,'N'],[c.ax+3,1,'N']],ben:[[c.xc,5],[c.xc,c.S-5],[12+c.dx,7],[15+c.dx,7],[18+c.dx,c.S-4],[18+c.dx,c.S-3]],pl:[[1,6],[c.ww,6],[c.ww,c.S-1],[1,c.S],[11+c.dx,6],[16+c.dx,6],[11+c.dx,c.S],[16+c.dx,c.S]],pil:[[3,3],[c.ww-2,3],[3,8],[c.ww-2,8],[3,c.S-3],[c.ww-2,c.S-3],[12+c.dx,c.S-4],[15+c.dx,c.S-4],[c.mid-1,10],[c.mid+2,10],[c.mid-1,13],[c.mid+2,13]],part:[],desk:[13+c.dx,c.S-2,3],rel:[[19+c.dx,7],[24+c.ox,7],[19+c.dx,c.S-2],[24+c.ox,c.S-2]],st:[c.mid,11],pool:[[c.xc,9,120]],route:[[c.xc,c.S-1],[2,c.S-5],[2,5],[c.ww-1,2],[c.ww,10],[14+c.dx,10]]})},
{n:'Ring',minWw:7,minEw:9,mk:c=>{const rx=(c.cl?19:20)+c.dx;return{art:[[c.ax,1,'N'],[c.ax+3,1,'N'],[c.xc-2,7,'E'],[c.xc+2,7,'W']],ben:[[c.xc-2,c.S-2],[c.xc+2,c.S-2],[12+c.dx,c.S-5],[15+c.dx,c.S-5],[24+c.ox,7],[25+c.ox,7]],pl:[[1,c.S],[c.ww,c.S],[1,4],[c.ww,4],[11+c.dx,6],[16+c.dx,6],[11+c.dx,c.S],[16+c.dx,c.S]],pil:[],part:[[c.xc-1,5,3,c.S-9]],desk:[13+c.dx,c.S-2,3],rel:[[rx,c.S-4],[rx,c.S-3],[rx,c.S-2],[rx,c.S-1]],st:[c.mid+1,c.S-4],pool:[[2,9,90],[c.ww-1,9,90]],route:[[2,c.S-1],[2,3],[c.ww-1,3],[c.ww,9],[14+c.dx,9],[14+c.dx,c.S-3],[c.ww-1,c.S-1]]}}}];
const CLASSICMU={ww:9,ew:9,dy:0,vx:0,classic:true};
function muHallOf(sn){const hr=mulberry32((((sn)*7919)>>>0)^0x51d2e8b3);return MU_HALLS[Math.floor(hr()*MU_HALLS.length)]}
function muArt(c,x,y,w,h,r){c.fillStyle='rgba(0,0,0,.35)';c.fillRect(x+2,y+3,w,h);c.fillStyle='#8a6a2e';c.fillRect(x,y,w,h);c.fillStyle='#d8b45a';c.fillRect(x+1,y+1,w-2,h-2);const ix=x+3,iy=y+3,iw=w-6,ih=h-6,q=c.createLinearGradient(ix,iy,ix,iy+ih),hue=Math.floor(r()*360);q.addColorStop(0,'hsl('+hue+',45%,62%)');q.addColorStop(1,'hsl('+(hue+40)+',40%,34%)');c.fillStyle=q;c.fillRect(ix,iy,iw,ih);
const long=iw>ih;for(let i=0;i<3;i++){c.fillStyle='hsla('+(hue+90+i*30)+',35%,'+(24+i*8)+'%,.8)';c.beginPath();const bx=ix+r()*iw,by=iy+ih*(.5+i*.15);c.ellipse(bx,by,(long?iw:ih)*.3,(long?ih:iw)*.28,0,0,6.283);c.fill()}
c.fillStyle='rgba(255,255,255,.18)';c.fillRect(ix,iy,iw,2)}
function muStatue(c,x,y,w,h){c.fillStyle='rgba(0,0,0,.35)';c.fillRect(x+4,y+5,w,h);c.fillStyle='#8f8a92';c.fillRect(x,y,w,h);c.fillStyle='#b9b4bc';c.fillRect(x+3,y+3,w-6,h-6);const cx=x+w/2,cy=y+h/2;c.fillStyle='#4a3a28';c.beginPath();c.ellipse(cx,cy+2,11,15,0,0,6.283);c.fill();c.fillStyle='#8a6a3c';c.beginPath();c.ellipse(cx,cy-1,8,12,0,0,6.283);c.fill();c.fillStyle='#b88a4a';c.beginPath();c.arc(cx,cy-3,5,0,6.283);c.fill();c.fillStyle='rgba(255,255,255,.35)';c.fillRect(cx-6,cy-12,6,2)}
function muCase(c,x,y,w,h,r){c.fillStyle='rgba(0,0,0,.3)';c.fillRect(x+3,y+4,w,h);c.fillStyle='#3a322c';c.fillRect(x,y,w,h);c.strokeStyle='#b9a98a';c.lineWidth=2;c.strokeRect(x+1,y+1,w-2,h-2);c.fillStyle='#1e2430';c.fillRect(x+4,y+4,w-8,h-8);
for(let i=0;i<3;i++){const cx=x+10+i*(w-20)/2,cy=y+h/2;const t=r();if(t<.4){c.fillStyle='#d8b45a';c.beginPath();c.ellipse(cx,cy,5,7,0,0,6.283);c.fill();c.fillStyle='#9a7a2a';c.fillRect(cx-3,cy-9,6,3)}else if(t<.75){c.fillStyle='#c9a24a';c.beginPath();c.arc(cx,cy,6,0,6.283);c.fill();c.fillStyle='#e8cc7a';c.beginPath();c.arc(cx,cy,3.4,0,6.283);c.fill()}else{c.fillStyle='#6fa7b8';c.fillRect(cx-5,cy-6,10,12);c.fillStyle='#a8d4e0';c.fillRect(cx-3,cy-6,3,12)}}
c.fillStyle='rgba(185,205,235,.16)';c.fillRect(x+4,y+4,w-8,h-8)}
/* Zufallsparameter des Museums (eigener Strom wie jewParams): k ist der Versuch, Versuch 0 ist mit CFG.museumGen.classic die Klassik-Huelle (9, 9, 0, 0). ww Breite der Westgalerie, ew Breite der Ostgalerie, dy Zusatztiefe, vx Versatz der Haupttuer im Atrium. */
function museumParams(sn,k){const G=CFG.museumGen,P=Object.assign({},CLASSICMU);if(!G.on)return P;const r=mulberry32((Math.imul(sn|0,374761393)+Math.imul(k+1,668265263))^0x510e527f),ri=(a,b)=>a+Math.floor(r()*(b-a+1)),c=r();if(k===0&&c<G.classic)return P;
P.ww=ri(G.ww[0],G.ww[1]);P.ew=ri(G.ew[0],G.ew[1]);P.dy=ri(G.dy[0],G.dy[1]);P.vx=ri(G.vx[0],G.vx[1]);P.classic=P.ww===9&&P.ew===9&&P.dy===0&&P.vx===0;return P}
function museumLayout(sd){const sn=typeof sd==='number'?sd:7,G=CFG.museumGen;if(G.on){const H=muHallOf(sn);for(let k=0;k<G.tries;k++){const P=museumParams(sn,k);if(P.classic)return genMuseum(sn,P);if(P.ww<H.minWw||P.ew<H.minEw)continue;const lay=finishLay(genMuseum(sn,P),sn);if(validateMap(lay).ok){lay.tries=k+1;return lay}}}return genMuseum(sn,CLASSICMU)}
function genMuseum(sn,P){const dx=P.ww-9,ox=dx+P.ew-9,dy=P.dy,S=16+dy,X1=27+ox,Y1=17+dy,dd=13+dx+P.vx,c=muDims(P);frameWorld(44+ox,34,-6,-6,17);setc(37+ox,7,'o');setc(37+ox,8,'o');
const H=P.hall!=null?MU_HALLS[P.hall]:muHallOf(sn),HT=H.mk(c);
/* Huelle (Raster wie MUSEUM_ROWS, relativ): Aussenwand, Westgalerie x1..ww, Atriumwaende x10+dx und x17+dx mit je drei Zeilen Durchgang, Sicherheitsraum mit Tuer, Depot mit Tresortuer, Fenster, Osttuer, Haupttuer im Atrium */
fill(0,0,X1,Y1,'#');fill(1,1,X1-1,S,'.');fill(10+dx,1,10+dx,S,'#');fill(17+dx,1,17+dx,S,'#');fill(10+dx,8,10+dx,10,'.');fill(17+dx,8,17+dx,10,'.');
fill(10+dx,5,17+dx,5,'#');setc(13+dx,5,'d');fill(21+dx,1,21+dx,4,'#');setc(21+dx,2,'V');setc(21+dx,3,'V');fill(21+dx,5,X1,5,'#');setc(13+dx,0,'L');
[[11,1],[12,1],[14,1]].forEach(a=>setc(a[0]+dx,a[1],'m'));[[16,1],[16,2]].forEach(a=>setc(a[0]+dx,a[1],'e'));
[7,8,S-2,S-1].forEach(y=>setc(0,y,'W'));[6,S-4,S-3].forEach(y=>setc(X1,y,'W'));setc(X1,8,'D');setc(X1,9,'D');
const winS=[];for(let x=2;x<=P.ww-1;x++)if((x-2)%3<2){setc(x,Y1,'W');winS.push(x)}for(let x=19+dx;x<=26+ox;x++)if((x-19-dx)%3<2){setc(x,Y1,'W');winS.push(x)}setc(dd,Y1,'D');setc(dd+1,Y1,'D');
HT.part.forEach(a=>fill(a[0],a[1],a[0]+a[2]-1,a[1]+a[3]-1,'#'));HT.pil.forEach(a=>setc(a[0],a[1],'P'));HT.pl.forEach(a=>setc(a[0],a[1],'p'));HT.ben.forEach(a=>setc(a[0],a[1],'b'));
fill(HT.desk[0],HT.desk[1],HT.desk[0]+HT.desk[2]-1,HT.desk[1],'C');fill(HT.st[0],HT.st[1],HT.st[0]+1,HT.st[1]+1,'C');HT.rel.forEach(a=>fill(a[0],a[1],a[0]+1,a[1],'C'));fill(30+ox,0,33+ox,1,'v');fill(32+ox,13,35+ox,14,'v');
const sx=(a,t)=>a[0]>=t?a[0]+ox:a[0];[[31,4],[33,6],[-2,-3],[6,-2],[22,-3],[29,12],[35,2]].forEach(a=>setc(sx(a,28),a[1],'k'));[[33,3],[35,11],[-2,6],[-2,12],[16,-3],[36,-2]].forEach(a=>setc(sx(a,28),a[1],'q'));[[2,26],[9,26],[16,26],[24,26],[31,26],[4,18+dy],[23,18+dy]].forEach(a=>setc(sx(a,24),a[1],'p'));
const mr=mulberry32((((sn)*2654435761)>>>0)^0x5bd1e995),ms=genMission(mr,'m',sn),tr=mulberry32((((sn)*40503)>>>0)^0x1b873593);tr();
ms.civ=0;const nG=Math.min(3,1+(ms.guards>=2?1:0)+(ms.lg.includes('sicher')?1:0));ms.guards=nG;
const R0=HT.route,NR=R0.length,guards=[];
for(let i=0;i<nG;i++){const rt=rotR(R0,(ms.rot[0]+i*2)%NR,i%2?!ms.rot[1]:ms.rot[1]);guards.push({p:rt[0],route:rt})}
const camc=[{x:1.5*T,y:1.5*T,a0:.78,amp:.6,sp:.6,rng:290,fov:.5},{x:(c.ww+.5)*T,y:1.5*T,a0:2.3,amp:.6,sp:.55,rng:290,fov:.5},{x:1.5*T,y:(S+.4)*T,a0:-.78,amp:.55,sp:.5,rng:290,fov:.5},{x:(c.ww+.5)*T,y:(S+.4)*T,a0:-2.3,amp:.55,sp:.5,rng:290,fov:.5},{x:(11.5+dx)*T,y:6.5*T,a0:.75,amp:.6,sp:.5,rng:260,fov:.5},{x:(16.5+dx)*T,y:(S+.4)*T,a0:-2.35,amp:.55,sp:.5,rng:260,fov:.5},{x:(18.5+dx)*T,y:6.5*T,a0:.7,amp:.6,sp:.55,rng:260,fov:.5},{x:(26.4+ox)*T,y:6.5*T,a0:2.4,amp:.55,sp:.5,rng:280,fov:.5},{x:(26.4+ox)*T,y:(S+.4)*T,a0:-2.4,amp:.55,sp:.5,rng:280,fov:.5}];
const camsSel=pickCams(mr,camc,ms.cams);
const ev=ms.ev.filter(e=>e!=='transport'&&e!=='feiertag'),evTag={wache:'Wachwechsel',strom:'Stromausfall',streife:'Streife in der Nähe'},extra=[];ms.ev=ev;
/* Der Wachwechsel-Wachmann beginnt in den erzeugten Huellen nicht auf der Kachel direkt hinter der Haupttuer (Klassik wie vorher) */
const wp=P.classic?[13,16]:[[dd,S-1],[dd+1,S-1],[dd-1,S-1],[dd+2,S-1]].find(a=>!isSol(a[0],a[1]))||[dd,S];
if(ev.includes('wache'))extra.push({p:wp,route:rotR(R0,NR>>1,true),at:ms.at.wache,msg:'Wachwechsel: Ein zweiter Nachtwächter beginnt seine Runde.'});
const tags=lageTags(ms,ev,evTag,camsSel.length,7,['Nacht']);
const deskT=[[16+dx,1],[16+dx,2]],goods=[];
HT.art.filter(a=>a[2]==='W').concat(HT.art.filter(a=>a[2]!=='W')).forEach(a=>{const x=a[0],y=a[1],d=a[2];goods.push(d==='N'?{k:'art',x:(x+1)*T,y:y*T+14,rc:[x*T,y*T,2*T,12],r:50}:d==='S'?{k:'art',x:(x+1)*T,y:(y+1)*T-14,rc:[x*T,(y+1)*T-12,2*T,12],r:50}:d==='W'?{k:'art',x:x*T+14,y:(y+1)*T,rc:[x*T,y*T,12,2*T],r:50}:{k:'art',x:(x+1)*T-14,y:(y+1)*T,rc:[(x+1)*T-12,y*T,12,2*T],r:50})});
goods.push({k:'statue',x:(HT.st[0]+1)*T,y:(HT.st[1]+1)*T,rc:[HT.st[0]*T,HT.st[1]*T,2*T,2*T],r:58});
HT.rel.forEach(a=>goods.push({k:'relic',x:(a[0]+1)*T,y:a[1]*T+16,rc:[a[0]*T,a[1]*T,2*T,T],r:50}));
const artR=goods.filter(q=>q.k==='art');
return{seed:sn,decor:decorOf(DC_MUSEUM(ox)),museum:true,hall:H.n,theme:mkThemeOf(THEME_MUSEUM,4,0),bld:{x0:0,y0:0,x1:X1,y1:Y1},winN:[],winS,
mat:(x,y)=>{if(x>=0&&x<=X1&&y>=0&&y<=Y1){if(x>=10+dx&&x<=17+dx)return y<=4?'k':'m';if(x>=21+dx&&y<=4)return'k';return'w'}
if(y>=26)return'l';if(y>=24)return's';if(y>=20)return'a';if(y>=18)return's';if(x>X1)return'a';return'y'},
paintFloor(s){const r=mulberry32(sn*7+1);
for(let i=0;i<40;i++){const x=T+r()*(26+ox)*T,y=T+r()*(16+dy)*T;s.strokeStyle='rgba(255,255,255,'+(.025+r()*.03)+')';s.beginPath();s.moveTo(x,y);s.quadraticCurveTo(x+r()*60-30,y+r()*40-20,x+r()*90-45,y+r()*60-30);s.stroke()}
s.strokeStyle='rgba(212,180,110,.45)';s.lineWidth=2;s.strokeRect((11.5+dx)*T,7.5*T,5*T,(8+dy)*T);s.beginPath();s.arc((14+dx)*T,(11.5+dy/2)*T,1.6*T,0,6.283);s.stroke();
s.globalCompositeOperation='lighter';const pools=artR.map(q=>[q.x,q.y,q.rc[2]>q.rc[3]?110:130]).concat([[(HT.st[0]+1)*T,(HT.st[1]+1)*T,150],[(14+dx)*T,(11+dy/2)*T,130]],HT.pool.map(a=>[a[0]*T,a[1]*T,a[2]]),[[(13.5+dx)*T,2.5*T,90],[(24+dx+(ox-dx)/2)*T,2.5*T,90]],HT.rel.map(a=>[(a[0]+1)*T,a[1]*T,90]));
for(const L of pools){const g2=s.createRadialGradient(L[0],L[1],0,L[0],L[1],L[2]);g2.addColorStop(0,'rgba(255,224,170,.20)');g2.addColorStop(1,'rgba(255,224,170,0)');s.fillStyle=g2;s.beginPath();s.arc(L[0],L[1],L[2],0,6.283);s.fill()}s.globalCompositeOperation='source-over'},
paintTop(s){const r=mulberry32(sn*13+5);
decorPaint(s,DC_MUSEUM(ox).map((d,i)=>Object.assign({i,bx:d.x,by:d.y},d)));
for(const q of artR)muArt(s,q.rc[0],q.rc[1],q.rc[2],q.rc[3],r);
muStatue(s,HT.st[0]*T,HT.st[1]*T,2*T,2*T);for(const q of goods)if(q.k==='relic')muCase(s,q.rc[0],q.rc[1],q.rc[2],q.rc[3],r);
s.fillStyle='#3b4048';s.fillRect((14+dx)*T+8,1*T+2,16,10);s.fillStyle='#e0b020';s.fillRect((14+dx)*T+14,1*T+5,4,4);
s.fillStyle='rgba(180,200,230,.35)';for(let x=11+dx;x<=13+dx;x++)s.fillRect(x*T+4,T+4,T-8,T-10);
s.fillStyle='#d4b46a';s.fillRect(HT.desk[0]*T+6,HT.desk[1]*T+6,HT.desk[2]*T-12,5);
s.fillStyle='rgba(255,255,255,.28)';for(let i=0;i<4;i++)s.fillRect(0*T+10+i*30,22*T+14,12,2);for(let i=0;i<8;i++)s.fillRect(12*T+i*30,22*T+14,12,2);for(let i=0;i<8;i++)s.fillRect(26*T+i*30,22*T+14,12,2)},
spawn:{x:(dd+.9)*T,y:19.4*T},
zones:[[11+dx,1,16+dx,4],[22+dx,1,26+ox,4],[18+dx,1,20+dx,4],[0,-99,99,-1],[28+ox,-99,99,17+dy]],lobby:[11+dx,6,16+dx,S],
cams:camsSel,tellers:[],mgr:null,guards,civ:0,
mission:{code:ms.code,vault:ms.vault,guards:ms.guards,west:false,cams:camsSel.length,civ:0,tags,ev,lg:ms.lg||[],...(ms.lgw?{lgw:ms.lgw}:{}),at:ms.at,extra,bags:[],blackoutAt:ev.includes('strom')?ms.at.strom:null},
note:deskT[ms.noteIdx%2],mon:[11+dx,1],vault:{door:[21+dx,2],pad:[20+dx,4],dir:1,bundles:[[23+dx,2],[25+dx,3]]},tills:[],atms:[],backDoors:[[13+dx,0]],
sw:{x:(14+dx)*T+16,y:1*T+22},exit:{x:(28+ox)*T,y0:7*T,y1:11*T,dir:1,tx:28+ox},van:{y:9*T,x0:(34+ox)*T,stop:(28+ox)*T,dir:-1},flip:false,
lasers:[[17.5+dx,7.9,17.5+dx,11.1],[18+dx,5.5,21+dx,5.5]],gAll:true,cone:true,
...(P.classic?{posts:[{x:4,y:19,a:-1.57,k:'S'},{x:29,y:7,a:3.14,k:'E',anchor:true},{x:-1,y:8,a:0,k:'W'},{x:13,y:-1,a:1.57,k:'N',door:[13,0]},{x:12,y:19,a:-1.57,k:'S'},{x:29,y:10,a:3.14,k:'E',anchor:true},{x:5,y:-1,a:1.57,k:'N'},{x:20,y:19,a:-1.57,k:'S'},{x:-1,y:4,a:0,k:'W'},{x:21,y:-1,a:1.57,k:'N'},{x:8,y:19,a:-1.57,k:'S'},{x:30,y:5,a:3.14,k:'E',anchor:true},{x:9,y:-1,a:1.57,k:'N'},{x:-1,y:13,a:0,k:'W'},{x:16,y:19,a:-1.57,k:'S'},{x:25,y:19,a:-1.57,k:'S'},{x:2,y:19,a:-1.57,k:'S'},{x:17,y:-1,a:1.57,k:'N'}],
slots:{W:[17,12,7,2],E:[22,27,32]}}:{q:{ww:P.ww,ew:P.ew,dy,vx:P.vx}}),laneY:23*T,title:titleBox(),bn:CFG.museum.bn,polAt:CFG.museum.pol,wb:CFG.museum.wb,stl:CFG.museum.stl,goods}}
/* ---- Szenario Casino: Gebaeude x0..39, y0..23. Spielhalle mit zwoelf Tischen (Chips), Automatenreihen, Bar, VIP-Salon mit Schliessfaechern (Nordwesten), Sicherheitsraum (Norden), Cage mit Tresor (Nordosten), Geldautomaten und Osttuer (Fluchttuer).
   Beute: Chips sind leicht (viel Wert je Platz), zaehlen beim Abgang aber nur zur Haelfte, wenn man sie nicht am Cage tauscht (Tausch nur im Ueberfall, dauert je Stapel CFG.casino.chip.exT s). Viele Gaeste, vier bis sechs Sicherheitsleute, sechs Angestellte (Croupiers, Cage). ---- */
const THEME_CASINO={n:'casino',f:{t:[214,204,190,190,180,166,130],k:[96,24,38],w:[120,78,50],m:[196,192,186],l:[58,96,54],s:[150,146,140],a:[52,54,58],y:[108,106,102]},wall:['#4a3a3e','#6a5258','#5a464b','#2a2024','#33282c'],glass:['#c4d8ea','#6f8fb4'],counter:['#2c1c20','#c9a45a'],pillar:['#4a3a3e','#8a6a40'],door:['#2c1c20','#8a7a6a']};
/* Casino, Spielhallen (aus dem Seed, eigener Strom, wie JW_HALLS beim Juwelier): tb = Tischreihen [y,[x...]] (zwoelf Tische 4x2, Chipstapel an der Suedseite, unter jedem Tisch muss eine Kachel frei sein), sl = acht Automaten [x,y], bar = Theke [x,y] (7 lang) mit Hockern st, ben = Baenke, pl = Pflanzen, pil = Saeulen, vip = drei Schliessfaecher im VIP-Salon, vb und vp = Baenke und Pflanzen im VIP-Salon, dl = vier Croupiers, rt = drei Wachrouten (sechs Punkte, geschlossene Schleifen), lp = Lichtkegel im Boden [x,y,r].
   Festbleiben: Nordblock (VIP-Salon, Flur, Sicherheitsraum samt Tuer, Cage mit Tresor, Geldautomaten, Zeilen 7 und 8 fuer Cage-Tausch und Sicherheitsraumtuer), Weg zur Osttuer (Zeilen 15..18 am Ostende). Die Beute bleibt gleich (12 Chipstapel, 8 Automaten, 3 Schliessfaecher, fuenf Buendel, gleiche Werte, 9 Baenke). Bauregeln (mit dem Bot gemessen, siehe docs/szenarien.md): Tische enden bei x34+dx und jede Reihe hat eine Luecke (sonst eine Mauer und ein Ostgang von einer Kachel), Automaten nur eine Kachel tief, Routenpunkte nicht in Zeile 21 am Eingang (jeder kann Startpunkt der Wache beim Alarm sein). Neue Halle: Eintrag ergaenzen, alle Routenpunkte begehbar halten. */
/* Hallen als Funktionen der Huelle (Sprint 9): mk(c) bekommt das Massobjekt aus csDims: dx Zusatzbreite (Cage, Tresorraum, Ostwand wandern), dy Zusatztiefe (die Strasse rueckt nach Sueden), vx Versatz des Haupteingangs, ya = floor(dy/2) (Verschiebung der mittleren Tischreihe), hd und hu die zwei Haelften von dx, sp(k,n) die Verteilung der Zusatzbreite auf n Tische einer Reihe. Mit dx 0, dy 0 und vx 0 ergibt jede Halle exakt die alte Tabelle (Selbsttest 43-casino-basis). Tische einer Reihe ruecken gleichmaessig auseinander (Klassik, Staffel), in der Promenade und den Reihen der Ostblock, die Tischreihen unten ruecken mit dy auseinander, alles Suedliche (Theke, Hocker, Pflanzen, Saeulen am Eingang) wandert mit dy. */
const csDims=P=>{const dx=P.dx,dy=P.dy;return{dx,dy,vx:P.vx,ya:Math.floor(dy/2),hd:Math.floor(dx/2),hu:dx-Math.floor(dx/2),sp:(k,n)=>Math.floor(dx*k/(n-1)),cl:!!P.classic}};
const csTb=(c,rows)=>rows.map(r=>[r[0],r[1].map((x,k)=>x+c.sp(k,r[1].length))]);
const csA=c=>[[2,21+c.dy],[2,10],[12,8],[36+c.dx,8],[37+c.dx,21+c.dy],[18+c.vx,21+c.dy]],csC=c=>[[13,7],[26+c.dx,7],[36+c.dx,8],[36+c.dx,16],[26+c.dx,16],[13,16]];
const CS_FLOORS=[
{n:'Klassik',mk:c=>({tb:csTb(c,[[9,[13,19,25,31]],[13+c.ya,[13,19,25,31]],[17+c.dy,[13,19,25,31]]]),sl:[[2,12],[2,15],[3,12],[3,15],[4,12],[4,15],[5,12],[5,15]],bar:[2,18+c.dy],st:[[3,20+c.dy],[5,20+c.dy],[7,20+c.dy]],ben:[[38+c.dx,19+c.dy],[38+c.dx,20+c.dy]],pl:[[38+c.dx,9],[1,11],[1,22+c.dy],[9,22+c.dy],[12,22+c.dy],[38+c.dx,22+c.dy]],pil:[],vip:[[3,1],[5,1],[7,1]],vb:[[2,5],[3,5],[8,5],[9,5]],vp:[[1,1],[10,1],[1,8],[10,8]],dl:[[14,8],[20+c.sp(1,4),8],[26+c.sp(2,4),8],[32+c.sp(3,4),8]],rt:[csA(c),[[17,12],[17,20+c.dy],[23+c.sp(1,4),20+c.dy],[23+c.sp(1,4),12],[29+c.sp(2,4),12],[29+c.sp(2,4),20+c.dy]],csC(c)],lp:[[4,13.5,110],[5,19+c.dy,90]]})},
{n:'Promenade',mk:c=>({tb:[[9,[13,17,27+c.dx,31+c.dx]],[13+c.ya,[13,17,27+c.dx,31+c.dx]],[17+c.dy,[13,17,27+c.dx,31+c.dx]]],sl:[[1,12],[3,12],[1,13],[3,13],[1,14],[3,14],[1,15],[3,15]],bar:[30+c.dx,20+c.dy],st:[[31+c.dx,22+c.dy],[33+c.dx,22+c.dy],[35+c.dx,22+c.dy]],ben:[[38+c.dx,19+c.dy],[38+c.dx,20+c.dy]],pl:[[38+c.dx,9],[1,11],[1,22+c.dy],[9,22+c.dy],[12,22+c.dy],[38+c.dx,22+c.dy]],pil:[[22+c.hd,11],[25+c.hu,11],[22+c.hd,15+c.dy],[25+c.hu,15+c.dy]],vip:[[1,2],[1,4],[1,6]],vb:[[4,3],[5,3],[7,6],[8,6]],vp:[[1,1],[10,1],[1,8],[10,8]],dl:[[14,8],[18,8],[28+c.dx,8],[32+c.dx,8]],rt:[csA(c),[[23+c.hd,8],[23+c.hd,13],[23+c.hd,19+c.dy],[36+c.dx,19+c.dy],[36+c.dx,11],[36+c.dx,8]],csC(c)],lp:[[2,13.5,110],[33+c.dx,21+c.dy,90]]})},
{n:'Reihen',mk:c=>({tb:[[10,[9,13,17,23+c.dx,27+c.dx,31+c.dx]],[15+c.dy,[9,13,17,23+c.dx,27+c.dx,31+c.dx]]],sl:[[3,12],[4,12],[3,13],[4,13],[3,16],[4,16],[3,17],[4,17]],bar:[26+c.dx,19+c.dy],st:[[27+c.dx,21+c.dy],[29+c.dx,21+c.dy],[31+c.dx,21+c.dy]],ben:[[38+c.dx,19+c.dy],[38+c.dx,20+c.dy]],pl:[[38+c.dx,9],[1,11],[1,22+c.dy],[9,22+c.dy],[12,22+c.dy],[38+c.dx,22+c.dy]],pil:[[15+c.vx,19+c.dy],[23+c.vx,19+c.dy]],vip:[[8,1],[9,1],[10,1]],vb:[[2,5],[3,5],[8,5],[9,5]],vp:[[1,1],[5,1],[1,8],[10,8]],dl:[[13,9],[19,9],[25+c.dx,9],[32+c.dx,9]],rt:[csA(c),[[12,13],[36+c.dx,13],[36+c.dx,18+c.dy],[28+c.dx,18+c.dy],[12,18+c.dy],[12,9]],[[13,7],[26+c.dx,7],[36+c.dx,8],[36+c.dx,17],[26+c.dx,13],[13,13]]],lp:[[4,14.5,110],[28+c.dx,19+c.dy,90]]})},
{n:'Staffel',mk:c=>({tb:csTb(c,[[9,[13,19,25,31]],[13+c.ya,[11,17,23,29]],[17+c.dy,[13,19,25,31]]]),sl:[[1,11],[1,12],[1,13],[1,14],[1,15],[1,16],[1,17],[1,18]],bar:[5,20+c.dy],st:[[6,22+c.dy],[8,22+c.dy],[10,22+c.dy]],ben:[[38+c.dx,19+c.dy],[38+c.dx,20+c.dy]],pl:[[38+c.dx,9],[1,22+c.dy],[14,22+c.dy],[26+c.hd,22+c.dy],[38+c.dx,22+c.dy],[12,11]],pil:[],vip:[[2,8],[3,8],[4,8]],vb:[[3,3],[4,3],[7,3],[8,3]],vp:[[1,1],[10,1],[1,6],[10,6]],dl:[[14,8],[20+c.sp(1,4),8],[26+c.sp(2,4),8],[32+c.sp(3,4),8]],rt:[csA(c),[[18,8],[19,12],[18,16],[24,20+c.dy],[30+c.dx,16],[31+c.dx,12]],csC(c)],lp:[[1.5,14,110],[8,20+c.dy,90]]})}];
const CLASSICCS={dx:0,dy:0,vx:0,classic:true};
function csHallOf(sn){const hr=mulberry32((((sn)*7919)>>>0)^0x6e4a9d15);return CS_FLOORS[Math.floor(hr()*CS_FLOORS.length)]}
function csTable(c,x,y,w,h,r){c.fillStyle='rgba(0,0,0,.35)';c.fillRect(x+3,y+4,w,h);c.fillStyle='#5a3a24';c.fillRect(x,y,w,h);c.fillStyle='#7a5434';c.fillRect(x+1,y+1,w-2,3);c.fillStyle='#1c5a3a';c.fillRect(x+4,y+5,w-8,h-9);c.strokeStyle='rgba(235,225,160,.55)';c.lineWidth=1;c.strokeRect(x+6.5,y+7.5,w-13,h-15);
if(r()<.5){c.beginPath();c.arc(x+w/2,y+h*.45,h*.3,0,6.283);c.stroke()}else{c.beginPath();c.arc(x+w/2,y+4,w*.28,.2,2.94);c.stroke()}}
function csChips(c,x,y,w,h,r){const COL=['#d9423a','#3a7fd9','#e8e8e8','#2a2a2e','#59c26a','#e8b84a'],n=3;for(let i=0;i<n;i++){const cx=x+8+i*(w-16)/(n-1),cy=y+h/2;const k=2+Math.floor(r()*3);for(let j=0;j<k;j++){c.fillStyle='rgba(0,0,0,.3)';c.beginPath();c.ellipse(cx+1,cy-j*2+2,6,3.4,0,0,6.283);c.fill();c.fillStyle=COL[Math.floor(r()*COL.length)];c.beginPath();c.ellipse(cx,cy-j*2,6,3.4,0,0,6.283);c.fill();c.strokeStyle='rgba(255,255,255,.55)';c.lineWidth=1;c.stroke()}}}
function csSlot(c,x,y,r){c.fillStyle='rgba(0,0,0,.35)';c.fillRect(x+3,y+4,T-2,T-2);c.fillStyle='#2a1c24';c.fillRect(x+2,y+2,T-4,T-4);c.fillStyle='#a8283c';c.fillRect(x+4,y+4,T-8,7);c.fillStyle='#10161f';c.fillRect(x+5,y+13,T-10,9);const COL=['#ffd34a','#59e08a','#ff5a6a'];for(let i=0;i<3;i++){c.fillStyle=COL[Math.floor(r()*3)];c.fillRect(x+6+i*7,y+15,5,5)}c.fillStyle='#d4b46a';c.fillRect(x+6,y+24,T-12,2);c.fillStyle='rgba(255,255,255,.25)';c.fillRect(x+4,y+4,T-8,1)}
function csCage(c,x,y,w){c.fillStyle='rgba(0,0,0,.3)';c.fillRect(x,y+T-2,w,5);c.fillStyle='#2c1c20';c.fillRect(x,y,w,T);c.fillStyle='#c9a45a';c.fillRect(x+1,y+1,w-2,4);c.strokeStyle='rgba(201,164,90,.8)';c.lineWidth=2;for(let i=0;i<w/T*3;i++){c.beginPath();c.moveTo(x+4+i*T/3,y+7);c.lineTo(x+4+i*T/3,y+T-6);c.stroke()}c.fillStyle='#e8cc7a';c.fillRect(x+w/2-12,y+T-9,24,5)}
/* Zufallsparameter des Casinos (eigener Strom wie jewParams): k ist der Versuch, Versuch 0 ist mit CFG.casinoGen.classic die Klassik-Huelle (0, 0, 0). dx Zusatzbreite, dy Zusatztiefe, vx Versatz des Haupteingangs. */
function casinoParams(sn,k){const G=CFG.casinoGen,P=Object.assign({},CLASSICCS);if(!G.on)return P;const r=mulberry32((Math.imul(sn|0,374761393)+Math.imul(k+1,668265263))^0x1f83d9ab),ri=(a,b)=>a+Math.floor(r()*(b-a+1)),c=r();if(k===0&&c<G.classic)return P;
P.dx=ri(G.dx[0],G.dx[1]);P.dy=ri(G.dy[0],G.dy[1]);P.vx=ri(G.vx[0],G.vx[1]);P.classic=P.dx===0&&P.dy===0&&P.vx===0;return P}
function casinoLayout(sd){const sn=typeof sd==='number'?sd:7,G=CFG.casinoGen;if(G.on){for(let k=0;k<G.tries;k++){const P=casinoParams(sn,k);if(P.classic)return genCasino(sn,P);const lay=finishLay(genCasino(sn,P),sn);if(validateMap(lay).ok){lay.tries=k+1;return lay}}}return genCasino(sn,CLASSICCS)}
function genCasino(sn,P){const dx=P.dx,dy=P.dy,vx=P.vx,X1=39+dx,Y1=23+dy,S=22+dy,e=19+vx,c=csDims(P);frameWorld(56+dx,40+dy,-6,-6,23+dy);setc(49+dx,11,'o');setc(49+dx,12,'o');
const H=P.hall!=null?CS_FLOORS[P.hall]:csHallOf(sn),HT=H.mk(c),tT=[];HT.tb.forEach(r=>r[1].forEach(x=>tT.push([x,r[0]])));
/* Huelle (Raster wie CASINO_ROWS, relativ): Aussenwand, VIP-Salon mit Tueren, Flur, Sicherheitsraum (waechst um dx nach Osten) mit Tuer, Cage mit Tresen und Tor, Tresorraum mit Tuer, Geldautomaten, Osttuer, Haupteingang */
fill(0,0,X1,Y1,'#');fill(1,1,X1-1,S,'.');setc(19,0,'L');setc(30+dx,0,'L');
fill(11,1,11,8,'#');setc(11,4,'d');setc(11,5,'d');fill(0,9,11,9,'#');setc(6,9,'d');setc(7,9,'d');
fill(15,1,15,5,'#');fill(15,6,18,6,'#');setc(19,6,'d');setc(20,6,'d');fill(21,6,25+dx,6,'#');fill(24+dx,1,25+dx,5,'#');
[[16,1],[17,1],[18,1],[22,1],[23,1]].forEach(a=>setc(a[0],a[1],a[0]<19?'m':'e'));[[27,1],[28,1]].forEach(a=>setc(a[0]+dx,a[1],'e'));
fill(26+dx,6,33+dx,6,'C');setc(34+dx,6,'g');fill(35+dx,6,X1,6,'#');fill(35+dx,1,35+dx,5,'#');setc(35+dx,2,'V');setc(35+dx,3,'V');
setc(38+dx,12,'A');setc(38+dx,13,'A');setc(X1,16,'D');setc(X1,17,'D');
const winS=[];[3,4,7,8,12,13].forEach(x=>{setc(x,Y1,'W');winS.push(x)});[27,28,31,32,36,37].forEach(x=>{setc(x+dx,Y1,'W');winS.push(x+dx)});for(let i=0;i<3;i++)setc(e+i,Y1,'D');
tT.forEach(a=>fill(a[0],a[1],a[0]+3,a[1]+1,'C'));HT.sl.forEach(a=>setc(a[0],a[1],'C'));fill(HT.bar[0],HT.bar[1],HT.bar[0]+6,HT.bar[1],'C');HT.st.concat(HT.ben,HT.vb).forEach(a=>setc(a[0],a[1],'b'));HT.pl.concat(HT.vp).forEach(a=>setc(a[0],a[1],'p'));HT.pil.forEach(a=>setc(a[0],a[1],'P'));HT.vip.forEach(a=>setc(a[0],a[1],'C'));fill(44+dx,0,47+dx,1,'v');fill(44+dx,26-6,47+dx,27-6,'v');
const sx=(a,t)=>a[0]>=t?a[0]+dx:a[0];[[43,4],[45,7],[-2,-3],[6,-2],[24,-3],[42,22],[47,3]].forEach(a=>setc(sx(a,40),a[1],'k'));[[44,9],[46,11],[-2,6],[-2,14],[16,-3],[48,-2]].forEach(a=>setc(sx(a,40),a[1],'q'));[[2,32],[9,32],[16,32],[24,32],[31,32],[40,32],[6,24],[33,24]].forEach(a=>setc(sx(a,40),a[1]+dy,'p'));
const mr=mulberry32((((sn)*2654435761)>>>0)^0x5bd1e995),ms=genMission(mr,'c',sn),tr=mulberry32((((sn)*40503)>>>0)^0x1b873593);tr();const tw=tr(),di=tw<.35?0:tw<.55?1:tw<.85?2:3;
const nG=Math.min(6,3+ms.guards+(ms.lg.includes('sicher')?1:0));ms.guards=nG;ms.cams=Math.min(10,ms.cams+3);const civBase=Math.round(9+ms.civ*1.6);ms.civ=civBase;
const RT=HT.rt,guards=[];
for(let i=0;i<nG;i++){const base=RT[i%3],rt=rotR(base,(ms.rot[0]+i)%base.length,(i>>1)%2?!ms.rot[1]:ms.rot[1]);guards.push({p:rt[0],route:rt})}
const camc=[{x:1.5*T,y:10.5*T,a0:.75,amp:.6,sp:.6,rng:300,fov:.5},{x:1.5*T,y:(22.4+dy)*T,a0:-.75,amp:.55,sp:.5,rng:300,fov:.5},{x:12.5*T,y:7.4*T,a0:.6,amp:.6,sp:.55,rng:300,fov:.5},{x:(25.5+dx)*T,y:7.4*T,a0:2.5,amp:.6,sp:.5,rng:300,fov:.5},{x:(38.4+dx)*T,y:7.4*T,a0:2.4,amp:.55,sp:.5,rng:300,fov:.5},{x:(38.4+dx)*T,y:(22.4+dy)*T,a0:-2.4,amp:.55,sp:.5,rng:300,fov:.5},{x:(19.5+vx)*T,y:(22.4+dy)*T,a0:-1.57,amp:.7,sp:.5,rng:330,fov:.55},{x:17.5*T,y:1.4*T,a0:1.2,amp:.6,sp:.6,rng:230,fov:.55},{x:(30.5+dx)*T,y:1.4*T,a0:1.57,amp:.6,sp:.55,rng:240,fov:.55},{x:6*T,y:1.4*T,a0:1.0,amp:.6,sp:.55,rng:260,fov:.55}];
const camsSel=pickCams(mr,camc,ms.cams);
const ev=ms.ev.filter(e=>e!=='transport'),evTag={wache:'Wachwechsel',strom:'Stromausfall',streife:'Streife in der Nähe',feiertag:'Feiertag'},extra=[];ms.ev=ev;
/* Der Wachwechsel-Wachmann beginnt in den erzeugten Huellen nicht auf den Kacheln direkt hinter dem Haupteingang (Klassik wie vorher) */
const wp=P.classic?[20,22]:[[e+1,S-1],[e,S-1],[e+2,S-1],[e+3,S-1]].find(a=>!isSol(a[0],a[1]))||[e+1,S];
if(ev.includes('wache'))extra.push({p:wp,route:rotR(RT[1],3,true),at:ms.at.wache,msg:'Wachwechsel: Ein zusätzlicher Sicherheitsmann betritt die Halle.'});
const tags=lageTags(ms,ev,evTag,camsSel.length,8,[nG+' Wachen']);
const deskT=[[22,1],[23,1],[27+dx,1],[28+dx,1]],goods=[];
for(const a of tT)goods.push({k:'chips',x:(a[0]+2)*T,y:(a[1]+1)*T+16,rc:[(a[0]+1)*T,(a[1]+1)*T+3,2*T,T-6],r:46});
for(const a of HT.sl)goods.push({k:'slot',x:a[0]*T+16,y:a[1]*T+16,rc:[a[0]*T,a[1]*T,T,T],r:46});
for(const a of HT.vip)goods.push({k:'vip',x:a[0]*T+16,y:a[1]*T+16,rc:[a[0]*T,a[1]*T,T,T],r:46});
const civN=ev.includes('feiertag')?Math.min(30,Math.round(ms.civ*1.5)):ms.civ;
return{seed:sn,decor:decorOf(DC_CASINO(dx,dy)),casino:true,hall:H.n,theme:mkThemeOf(THEME_CASINO,ms.lg.includes('nacht')?4:di,0),bld:{x0:0,y0:0,x1:X1,y1:Y1},winN:[],winS,
mat:(x,y)=>{if(x>=0&&x<=X1&&y>=0&&y<=Y1){if(x>=16&&x<=24+dx&&y<=5)return'm';if(x<=10&&y<=8)return'w';if(x>=12&&x<=14&&y<=8)return't';if(y>=19+dy&&x>=15+vx&&x<=25+vx)return'm';return'k'}
if(y>=32+dy)return'l';if(y>=30+dy)return's';if(y>=26+dy)return'a';if(y>=24+dy)return's';if(x>X1)return'a';return'y'},
paintFloor(s){const r=mulberry32(sn*7+1);
s.strokeStyle='rgba(212,169,74,.38)';s.lineWidth=1.5;for(let i=0;i<22+Math.ceil(dx/1.7);i++){for(let j=0;j<11+Math.ceil(dy/1.1);j++){const cx=(2+i*1.7)*T,cy=(10.5+j*1.1)*T;if(cx>(38+dx)*T)continue;s.beginPath();s.moveTo(cx,cy-9);s.lineTo(cx+9,cy);s.lineTo(cx,cy+9);s.lineTo(cx-9,cy);s.closePath();s.stroke()}}
s.strokeStyle='rgba(212,169,74,.6)';s.lineWidth=3;s.strokeRect(1.4*T,7.4*T,(37.2+dx)*T,(15.2+dy)*T);
s.globalCompositeOperation='lighter';for(const t of tT){const g2=s.createRadialGradient((t[0]+2)*T,(t[1]+1)*T,0,(t[0]+2)*T,(t[1]+1)*T,120);g2.addColorStop(0,'rgba(255,214,150,.20)');g2.addColorStop(1,'rgba(255,214,150,0)');s.fillStyle=g2;s.beginPath();s.arc((t[0]+2)*T,(t[1]+1)*T,120,0,6.283);s.fill()}
for(const L of[[(20+dx/2)*T,2.5*T,100],[(30+dx)*T,3*T,120],[5*T,4*T,140]].concat(HT.lp.map(a=>[a[0]*T,a[1]*T,a[2]]))){const g2=s.createRadialGradient(L[0],L[1],0,L[0],L[1],L[2]);g2.addColorStop(0,'rgba(255,214,150,.16)');g2.addColorStop(1,'rgba(255,214,150,0)');s.fillStyle=g2;s.beginPath();s.arc(L[0],L[1],L[2],0,6.283);s.fill()}s.globalCompositeOperation='source-over'},
paintTop(s){const r=mulberry32(sn*13+5);
decorPaint(s,DC_CASINO(dx,dy).map((d,i)=>Object.assign({i,bx:d.x,by:d.y},d)));
for(const t of tT)csTable(s,t[0]*T,t[1]*T,4*T,2*T,r);
for(const q of goods){if(q.k==='chips')csChips(s,q.rc[0],q.rc[1],q.rc[2],q.rc[3],r);else if(q.k==='slot')csSlot(s,q.rc[0],q.rc[1],r);else if(q.k==='vip'){s.fillStyle='rgba(0,0,0,.3)';s.fillRect(q.rc[0]+3,q.rc[1]+4,T,T);s.fillStyle='#3a2c30';s.fillRect(q.rc[0],q.rc[1],T,T);s.fillStyle='#c9a45a';s.fillRect(q.rc[0]+2,q.rc[1]+2,T-4,3);s.fillStyle='#8a7a6a';s.fillRect(q.rc[0]+6,q.rc[1]+10,T-12,12);s.fillStyle='#e8cc7a';s.fillRect(q.rc[0]+T/2-2,q.rc[1]+14,4,4)}}
csCage(s,(26+dx)*T,6*T,8*T);
s.fillStyle='#3a2a1e';s.fillRect(HT.bar[0]*T,HT.bar[1]*T,7*T,T);s.fillStyle='#c9a45a';s.fillRect(HT.bar[0]*T,HT.bar[1]*T,7*T,3);s.fillStyle='rgba(255,236,190,.25)';s.fillRect(HT.bar[0]*T+2,HT.bar[1]*T+5,7*T-4,3);
s.fillStyle='#3b4048';s.fillRect(20*T+8,1*T+2,16,10);s.fillStyle='#e0b020';s.fillRect(20*T+14,1*T+5,4,4);
s.fillStyle='rgba(180,200,230,.35)';for(let x=16;x<=18;x++)s.fillRect(x*T+4,T+4,T-8,T-10);
s.fillStyle='rgba(255,255,255,.28)';for(let i=0;i<4;i++)s.fillRect(0*T+10+i*30,(28+dy)*T+14,12,2);for(let i=0;i<8;i++)s.fillRect(18*T+i*30,(28+dy)*T+14,12,2);for(let i=0;i<8;i++)s.fillRect(34*T+i*30,(28+dy)*T+14,12,2)},
spawn:{x:(e+1.4)*T,y:(25.2+dy)*T},
zones:[[16,1,23+dx,5],[26+dx,1,34+dx,5],[36+dx,1,38+dx,5],[0,-99,99,-1],[41+dx,-99,99,23+dy]],lobby:[1,10,38+dx,22+dy],
cams:camsSel,tellers:[[29+dx,5],[32+dx,5]].concat(HT.dl),mgr:{p:[20,3],route:[[20,3],[20,5],[22,3],[18,3]]},guards,civ:civN,
mission:{code:ms.code,vault:ms.vault,guards:ms.guards,west:false,cams:camsSel.length,civ:ms.civ,tags,ev,lg:ms.lg||[],...(ms.lgw?{lgw:ms.lgw}:{}),at:ms.at,extra,bags:[],blackoutAt:ev.includes('strom')?ms.at.strom:null},
note:deskT[ms.noteIdx%4],mon:[16,1],vault:{door:[35+dx,2],pad:[34+dx,4],dir:1,bundles:[[36+dx,1],[38+dx,1],[36+dx,4],[38+dx,4],[37+dx,3]]},tills:[],atms:[[38+dx,12],[38+dx,13]],backDoors:[[19,0],[30+dx,0]],
sw:{x:20*T+16,y:1*T+22},exit:{x:(40+dx)*T,y0:15*T,y1:19*T,dir:1,tx:40+dx},van:{y:17*T,x0:(46+dx)*T,stop:(40+dx)*T,dir:-1},flip:false,cage:{x:(30+dx)*T,y:7*T+16,r:60},
...(P.classic?{posts:[{x:4,y:25,a:-1.57,k:'S'},{x:41,y:11,a:3.14,k:'E',anchor:true},{x:-1,y:8,a:0,k:'W'},{x:19,y:-1,a:1.57,k:'N',door:[19,0]},{x:12,y:25,a:-1.57,k:'S'},{x:41,y:21,a:3.14,k:'E',anchor:true},{x:30,y:-1,a:1.57,k:'N',door:[30,0]},{x:20,y:25,a:-1.57,k:'S'},{x:-1,y:3,a:0,k:'W'},{x:5,y:-1,a:1.57,k:'N'},{x:28,y:25,a:-1.57,k:'S'},{x:43,y:8,a:3.14,k:'E',anchor:true},{x:36,y:-1,a:1.57,k:'N'},{x:-1,y:13,a:0,k:'W'},{x:36,y:25,a:-1.57,k:'S'},{x:12,y:-1,a:1.57,k:'N'},{x:8,y:25,a:-1.57,k:'S'},{x:-1,y:18,a:0,k:'W'},{x:24,y:25,a:-1.57,k:'S'},{x:24,y:-1,a:1.57,k:'N'},{x:16,y:25,a:-1.57,k:'S'},{x:32,y:25,a:-1.57,k:'S'},{x:-1,y:22,a:0,k:'W'},{x:2,y:25,a:-1.57,k:'S'}],
slots:{W:[24,19,14,9,4,-1],E:[30,35,40,45]}}:{q:{dx,dy,vx}}),laneY:(29+dy)*T,title:titleBox(),bn:CFG.casino.bn,polAt:CFG.casino.pol,wb:CFG.casino.wb,goods}}
// Karten-Vertrag: Auf den Zellen der Strasse (Fahrstrecke des Fluchtwagens samt Rand bis zum Weltrand, Wagenplaetze) steht nichts Festes, das nur Dekor ist. Zaun wird zum Tor, Einzelkacheln-Props (Pflanze, Fass, Kiste) verschwinden. Laeuft nach dem Bau und nach der Pruefung und macht nur Kacheln frei, deshalb kann es keine Erreichbarkeit zerstoeren. Autos (v) und Waende bleiben stehen, die meldet validateMap weiter.
function clearLane(lay){if(lay.truck)return lay;const ln=laneOf(lay),cs=[].concat(ln.van.swept,ln.van.rest);ln.slots.forEach(s=>s.cells.forEach(c=>cs.push(c)));for(const c of cs){if(OOB(c[0],c[1]))continue;const ch=cell(c[0],c[1]);if(ch==='f'||ch==='p'||ch==='q'||ch==='k')setc(c[0],c[1],'o')}return lay}
// Letzter Schritt jeder Karte: fehlende Listen ableiten, dann die Strasse freiraeumen (die abgeleiteten Wagenplaetze duerfen Zaun und Einzelkachel-Props kreuzen)
/* Kammer nachtraeglich (Museum und Casino, Plan Kammern K3 in docs/ideen-und-planung.md): Auf der fertigen Karte (nach fillDerived) werden Kandidaten gesucht (Innenraum 2x2, 3x2 oder 2x3 frei, Ring ausserhalb der Sperrzonen, mindestens vier Ringkacheln schon Wand, die uebrigen freien Ringkacheln werden Wand, eine Tuer d auf einer freien Ringkachel mit freier Kachel davor), ein eigener Zufallsstrom (Seed) wuerfelt Ja/Nein (CFG.stash.p), die Art und die Reihenfolge der Kandidaten. Ein Kandidat gilt, wenn
   (1) kein Wegpunkt einer Route und kein Kassierer naeher als CFG.stash.gap am Ring liegt, (2) Tuer, Kachel davor und deren begehbare Nachbarn (die letzten Schritte beim Ziehen) von keinem Routenpunkt, Kassierer und keiner Kamera eingesehen werden (echte Reichweiten: Wachen 8,1 Kacheln, Manager 8,8, Kassierer 7,8, Kameras Reichweite mal 1,25; Wachen gucken auf der Strecke in Laufrichtung (Kegel 1,35), an Wegpunkten rundum, Kassierer nach Sueden, Kameras im ganzen Schwenkbereich; der Koerper in der Tuer darf nicht in CFG.ko.find gefunden werden, Lehre aus K2), (2a) kein Beute-Stueck (LAY.goods.rc) im Ring oder Innenraum, (2a2) weder Ring noch Innenraum auf der Fluchtachse (Zeilen der Fluchttuer plus 1 quer durchs Gebaeude) oder eine Kachel um eine Kamera, (2b) weder diese Kacheln noch der Innenraum einem Laser (LAY.lasers) naeher als 1,2 Kacheln kommen, (3) mindestens eine Innenkachel verborgen ist (deep, Reichweite CFG.stash.sight) und (4) validateMap keinen Fehler und keine Warnung mehr meldet als vorher. Gibt es keinen Kandidaten, bleibt die Karte ohne Kammer. Idempotent (lay.stash gesetzt: nichts), CFG.stash.on 0 laesst die Karte unberuehrt. */
function placeStash(lay,sn0){const K=CFG.stash,sc=lay.museum?'museum':lay.casino?'casino':null;if(!K||!K.on||!sc||!K.scs.includes(sc)||lay.stash||lay.truck||!lay.bld)return lay;
const sn=typeof lay.seed==='number'?lay.seed:typeof sn0==='number'?sn0:7,r=mulberry32((Math.imul(sn|0,2246822519)^0x4b414d4d)>>>0),roll=r(),kind=r()<.5?'abstell':'wc';if(roll>=K.p)return lay;
const B=lay.bld,zs=lay.zones||[],inZ=(x,y)=>zs.some(z=>x>=z[0]&&x<=z[2]&&y>=z[1]&&y<=z[3]),free=(x,y)=>x>B.x0&&x<B.x1&&y>B.y0&&y<B.y1&&cell(x,y)==='.';
const pts=[],wps=[],seg=(q,rg,fv)=>{if(!q)return;for(let k=0;k<q.length;k++){pts.push([q[k][0],q[k][1],null,rg]);wps.push(q[k]);if(k){const a=q[k-1],b=q[k],n=Math.max(1,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])*2)),an=Math.atan2(b[1]-a[1],b[0]-a[0]);for(let t=1;t<n;t++)pts.push([a[0]+(b[0]-a[0])*t/n,a[1]+(b[1]-a[1])*t/n,an,rg,fv+.35])}}};
const gr=CFG.guard.rng/T,gf=CFG.guard.fov;(lay.guards||[]).forEach(g=>seg(g.route,gr,gf));if(lay.mgr)seg(lay.mgr.route,8.8,1.1);(lay.mission.extra||[]).forEach(x=>seg(x.route,gr,gf));(lay.tellers||[]).forEach(t=>{pts.push([t[0],t[1],Math.PI/2,7.9,1.3]);wps.push(t)});
const opq=(x,y)=>{const c=cell(x,y);return OOB(x,y)||c==='#'||c==='P'||c==='V'},los=(ax,ay,bx,by)=>{const n=Math.ceil(Math.hypot(bx-ax,by-ay)*8);for(let i=1;i<n;i++)if(opq(Math.floor(ax+(bx-ax)*i/n),Math.floor(ay+(by-ay)*i/n)))return false;return true};
const angd=(a,b)=>{let d=Math.abs(a-b)%(2*Math.PI);return d>Math.PI?2*Math.PI-d:d};
const seen=(cx,cy,rg,acc)=>{const x=cx+.5,y=cy+.5;return pts.some(p=>{const dd=Math.hypot(p[0]+.5-x,p[1]+.5-y);if(dd>=(acc?p[3]:rg))return false;if(acc&&p[2]!=null&&angd(p[2],Math.atan2(y-p[1]-.5,x-p[0]-.5))>(p[4]||1.35))return false;return los(p[0]+.5,p[1]+.5,x,y)})||(lay.cams||[]).some(m=>{const dd=Math.hypot(m.x/T-x,m.y/T-y);if(dd>=m.rng*1.25/T)return false;if(acc&&angd(m.a0,Math.atan2(y-m.y/T,x-m.x/T))>(m.amp||0)+(m.fov||1)+.1)return false;return los(m.x/T,m.y/T,x,y)})};
const laserNear=q=>(lay.lasers||[]).some(L=>{const x=q[0]+.5,y=q[1]+.5,dx=L[2]-L[0],dy=L[3]-L[1],t=Math.max(0,Math.min(1,((x-L[0])*dx+(y-L[1])*dy)/(dx*dx+dy*dy||1)));return Math.hypot(x-(L[0]+dx*t),y-(L[1]+dy*t))<1.2});
const gds=(lay.goods||[]).filter(g=>g.rc),hitG=(x0,y0,x1,y1)=>gds.some(g=>g.rc[0]<x1*T&&g.rc[0]+g.rc[2]>x0*T&&g.rc[1]<y1*T&&g.rc[1]+g.rc[3]>y0*T);
const cands=[];for(const[iw,ih]of[[2,2],[3,2],[2,3]])for(let bx=B.x0+1;bx<=B.x1-iw-1;bx++)for(let by=B.y0+1;by<=B.y1-ih-1;by++){
 let ok=true;for(let x=bx;x<bx+iw&&ok;x++)for(let y=by;y<by+ih;y++)if(!free(x,y)||inZ(x,y)){ok=false;break}if(!ok)continue;
 const ring=[];for(let x=bx-1;x<=bx+iw;x++)for(let y=by-1;y<=by+ih;y++)if(x<bx||x>=bx+iw||y<by||y>=by+ih)ring.push([x,y]);
 if(hitG(bx-1,by-1,bx+iw+1,by+ih+1))continue;
 let walls=0;for(const[x,y]of ring){const c=cell(x,y);if(c==='#')walls++;else if(!free(x,y)){ok=false;break}if(inZ(x,y))ok=false}if(!ok)continue;
 for(const d of ring){if(cell(d[0],d[1])==='#')continue;const ix=d[0]>=bx&&d[0]<bx+iw,iy=d[1]>=by&&d[1]<by+ih;if(!ix&&!iy)continue;
  const ou=[d[0]<bx?d[0]-1:d[0]>=bx+iw?d[0]+1:d[0],d[1]<by?d[1]-1:d[1]>=by+ih?d[1]+1:d[1]];if(!free(ou[0],ou[1])||inZ(ou[0],ou[1]))continue;
  cands.push({bx,by,iw,ih,ring,d,ou,nat:walls>=K.wall?0:1})}}

for(let i=cands.length-1;i>0;i--){const j=Math.floor(r()*(i+1)),t=cands[i];cands[i]=cands[j];cands[j]=t}
cands.sort((a,b)=>a.nat-b.nat);
const sig=rep=>rep.err.concat(rep.warn).map(e=>e.r+': '+e.m),base=sig(validateMap(lay)),gp=K.gap;let tried=0;const sp0=lay.spots,lk0=lay.lockCells;
/* Fluchtachse: die Zeilen (Spalten) der Fluchttuer plus 2 quer durch das Gebaeude und die Kacheln um Kameras (Kamera braucht Boden in der Naehe) bleiben frei von der Kammer. */
const axis=[];for(const sp of(lay.spots||[]).filter(z=>z.ex)){const hz=sp.side==='E'||sp.side==='W';for(const c of sp.cells)axis.push(hz?[null,c[1]]:[c[0],null])}
const onAxis=q=>axis.some(a=>a[0]==null?Math.abs(q[1]-a[1])<=1:Math.abs(q[0]-a[0])<=1),nearCam=q=>(lay.cams||[]).some(m=>Math.abs(Math.floor(m.x/T)-q[0])<=1&&Math.abs(Math.floor(m.y/T)-q[1])<=1);
for(const c of cands){const{bx,by,iw,ih,ring,d,ou}=c;
 if(wps.some(p=>p[0]>=bx-1-gp&&p[0]<bx+iw+1+gp&&p[1]>=by-1-gp&&p[1]<by+ih+1+gp))continue;
 if(ring.concat([[bx,by],[bx+iw-1,by+ih-1],[bx,by+ih-1],[bx+iw-1,by]]).some(q=>onAxis(q)||nearCam(q)))continue;
 const was=ring.map(q=>cell(q[0],q[1]));ring.forEach(q=>setc(q[0],q[1],'#'));setc(d[0],d[1],'d');
 const undo=()=>{ring.forEach((q,i)=>setc(q[0],q[1],was[i]))};
 const cells=[];for(let x=bx;x<bx+iw;x++)for(let y=by;y<by+ih;y++)cells.push([x,y]);const acc=[d,ou].concat([[1,0],[-1,0],[0,1],[0,-1]].map(v=>[ou[0]+v[0],ou[1]+v[1]]).filter(q=>'.dDLlo'.includes(cell(q[0],q[1]))));
 if(acc.some(q=>seen(q[0],q[1],0,1))||acc.concat(cells).some(q=>laserNear(q))){undo();continue}
const deep=cells.filter(q=>!seen(q[0],q[1],K.sight));if(!deep.length){undo();continue}
 if(++tried>24){undo();break}
 lay.stash={kind,door:d,out:ou,cells,deep};delete lay.spots;delete lay.lockCells;
 const rep=validateMap(lay);if(sig(rep).every(m=>base.includes(m))){const pf=lay.paintFloor,pt=lay.paintTop,S=lay.stash;lay.paintFloor=s=>{pf&&pf(s);stashFloor(s,S)};lay.paintTop=s=>{pt&&pt(s);stashTop(s,S)};return lay}
 delete lay.stash;delete lay.spots;delete lay.lockCells;undo()}
if(sp0)lay.spots=sp0;if(lk0)lay.lockCells=lk0;
return lay}
/* ---- Szenario Gefaengnis (Eilauftrag Issue 45): handgebaute Anlage, kein Generator. Mauer x0..25, y0..11 mit dem Aussentor (Tresortuer V) in der Ostmauer bei (25,5) und (25,6). Westen: Zellentrakt (vier Zellen y1..2, Gang y4..5, die Zellentuer Z zur Hofseite bei (12,4) und (12,5) ist verriegelt), darunter der Kontrollraum (y7..10) mit der Servicetuer bei (2,6) vom Gang aus. Osten: Hof x13..24.
   Der Gefangene startet in Zelle 1, die anderen draussen vor dem Tor. LAY.prison: cell (Startpunkt Gefangener, Pixel), cells (Zellen), doors (Kacheln, die der Schalter oeffnet), psw (Schalter im Kontrollraum, Pixel), gate (Kachel des Aussentors). ---- */
const PR_ROWS=['##########################','#..#..#..#..#............#','#..#..#..#..#............#','#d##d##d##d##............#','#...........L............#','#...........L............#','##d##########............#','#...........#............#','#..mm.ee....#............#','#...........#............#','#...........#............#','##########################'];
function prisonLayout(sd){const sn=typeof sd==='number'?sd:7,GX=25,er=5,bot=11;frameWorld(44,30,-6,-6,13);setc(37,er,'o');setc(37,er+1,'o');
const rows=PR_ROWS.slice();rows[5]=rows[5].slice(0,25)+'V';rows[6]=rows[6].slice(0,25)+'V';asc(rows,0,0);
[[15,3],[16,3],[22,9]].forEach(a=>setc(a[0],a[1],'b'));[[22,10],[23,10],[23,9]].forEach(a=>setc(a[0],a[1],'k'));[[14,10]].forEach(a=>setc(a[0],a[1],'q'));
[[28,13],[33,13]].forEach(a=>setc(a[0],a[1],'q'));[[27,20],[32,21],[7,21],[16,21]].forEach(a=>setc(a[0],a[1],'p'));
const P=CFG.prison,mr=mulberry32((((sn)*2654435761)>>>0)^0x2d4f1c93),tr=mulberry32((((sn)*40503)>>>0)^0x1b873593),ti=tr()<.5?2:0,di=tr()<.6?0:1;
const rot=Math.floor(mr()*4),gd=(p,route)=>({p:route[rot%route.length],route:rotR(route,rot%route.length,mr()<.5)});
const g1={p:[8,4],route:[[10,4],[10,5],[3,5],[3,4]]},guards=[g1,gd(null,[[23,2],[23,8],[14,8],[14,2]]),gd(null,[[22,3],[22,8],[18,8],[18,3]])];
const camc=[{x:13.5*T,y:1.4*T,a0:.7,amp:.55,sp:.55,rng:330,fov:.55},{x:24.5*T,y:1.4*T,a0:2.35,amp:.55,sp:.5,rng:330,fov:.55},{x:24.5*T,y:10.4*T,a0:3.9,amp:.5,sp:.5,rng:330,fov:.55}];
const cells=[[1,1],[4,1],[7,1],[10,1]];
return{seed:sn,decor:decorOf([]),prison:{cell:[2*T,2*T],cells,doors:[[12,4],[12,5]],psw:{x:10.5*T,y:10.4*T},gate:[GX,er]},hall:'Gefängnis',theme:mkTheme(ti,di,0),bld:{x0:0,y0:0,x1:GX,y1:bot},winN:[],winS:[],
mat:(x,y)=>{if(x>=0&&x<=GX&&y>=0&&y<=bot)return x>=13?'s':'m';if(y>=22)return'l';if(y>=20)return's';if(y>=16)return'a';if(y>=14)return's';if(x>GX)return'a';return'y'},
paintFloor(s){s.strokeStyle='rgba(255,255,255,.18)';s.lineWidth=2;s.strokeRect(14*T,2*T,10*T,8*T);s.fillStyle='rgba(255,255,255,.3)';for(let i=0;i<5;i++)s.fillRect((GX+2.5)*T,2*T+i*T*1.6,3*T,2);
for(const c of cells){s.fillStyle='rgba(60,70,90,.55)';s.fillRect(c[0]*T+3,c[1]*T+4,T*.8,T*1.6);s.fillStyle='#8b8f98';s.fillRect(c[0]*T+3,c[1]*T+4,T*.8,3)}},
paintTop(s){s.strokeStyle='#2a2e34';s.lineWidth=2;for(const c of cells)for(let i=0;i<2;i++){const x=(c[0]+i)*T+16;s.beginPath();s.moveTo(x,3*T+2);s.lineTo(x,3*T+T-2);s.stroke()}},
spawn:{x:28.2*T,y:2.4*T},zones:[[0,0,GX,bot]],lobby:[13,1,24,10],
cams:camc,tellers:[],mgr:null,guards,civ:0,
mission:{code:'0000',vault:'drill',guards:guards.length,west:false,cams:camc.length,civ:0,tags:[],ev:[],lg:[],at:{},extra:[],bags:[],blackoutAt:null},
note:[7,8],mon:[3,8],tills:[],atms:[],backDoors:[],vault:{door:[GX,er],pad:[GX+1,er+2],dir:-1,bundles:[]},sw:{x:10.5*T,y:7.6*T},
exit:{x:(GX+1)*T,y0:(er-1)*T,y1:(er+3)*T,dir:1,tx:GX+1},van:{y:(er+1)*T,x0:(GX+7)*T,stop:(GX+1)*T,dir:-1},flip:false,laneY:19*T,title:titleBox(),polAt:P.pol,wb:P.wb,goods:[]}}
function finishLay(lay,sn){return placeStash(clearLane(placeMeet(fillDerived(lay))),sn)}
return{CLASSICM,CLASSICP,CS_FLOORS,GS_SHOPS,JW_HALLS,LAGE,MU_HALLS,PLACE,SCL,casinoLayout,casinoParams,classicLayout,csTubes,finishLay,gasLayout,gasParams,gasWide,prisonLayout,genCasino,genGas,genJewel,genLayout,genMission,genMuseum,genTruckMission,inSite,inStash,jewParams,jewWide,jewelLayout,muTubes,mulberry32,museumLayout,museumParams,scOf,truckLayout,turnLayout,validLayout,warnFor}}
mkMaps.api=1;
