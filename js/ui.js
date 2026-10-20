/* Holdup: Menues als Kacheln (Titel, Auftragswahl, Coop-Hub, Raumcode, Lobby, Shop, Pause, Optionen, Anleitung, Ergebnis).
   Klassisches Skript ohne Bauschritt, wird vor dem Spielkern in index.html geladen. mkUI(X) bekommt vom Kern (start() in index.html) einen Kontext X
   (Getter auf alles, was gezeichnet wird, dazu act(name,arg) fuer Aktionen und volAdj fuer die Regler) und liefert { drawMenu, drawPause, drawEnded, key, down, up, move, active }.
   Aufbau: Jede Seite ist eine Liste von Kacheln (spec: t, back, def, enter, deco). Die Listen werden bei jedem Zeichnen und jeder Eingabe frisch aus dem Zustand gebaut
   (keine eigene Kopie), nur Fokus, gedrueckte Kachel, Regler-Ziehen und das offene Modal liegen hier. Eingabe: Pfeile bewegen den Fokus zur naechsten Kachel in Richtung, Enter oder Leertaste
   waehlt, Esc geht zurueck (spec.back), Tastenkuerzel (Kachel.key) wirken direkt, die Maus setzt den Fokus beim Ueberfahren und waehlt beim Loslassen auf derselben Kachel.
   Aktionen laufen ueber X.act, Namen mit "ui:" erledigt dieses Skript selbst (Modals). Zustand und Logik bleiben im Kern.
   Neue Seite: Funktion s...() mit Kacheln ergaenzen, in base() einhaengen, benoetigte Namen im Getter-Objekt von mkUI(...) in index.html nachtragen.
   Globale Namen (SND, SESSION, Math, window) kommen aus dem gemeinsamen Skriptumfeld. */
function mkUI(X){
const A='#ffb000',G='#7ee34a',Y='#ffd27a',TX='#c9d4de',MU='#8d95a1',SU='#9aa6b2',RD='#ff8a7a',BL='#9fd0ff';
let focus=null,pressed=null,drag=null,hov=null,modal=null,stack=[],sig='';
/* Auftraege: be = Beute, ri = Risiko (1 bis 3, Schaetzung, nicht gemessen), s = Kurzzeile, d = Beschreibung in zwei Zeilen */
const JOBS=[
{k:'bank',n:'Bank',i:'bank',be:2,ri:2,s:'Tresor und Geldautomaten',d:['Bankfiliale mit Tresor. Erkunden: Kameras, Wachroute, Tresorcode. Lautlos mit Beute raus: 50 % Bonus.','Oder F: Überfall. Tresor bis 60.000, Automaten je 12.000. Je länger du bleibst, desto härter die Polizei.']},
{k:'jewel',n:'Juwelier',i:'jewel',be:2,ri:3,s:'Vitrinen und Tresor',d:['Vitrinen 2.500 bis 9.000, Tresor 56.000. Leise aufschneiden (6 s) und unbemerkt raus: 50 % Bonus.','Oder F: Überfall und Vitrinen einschlagen. Wer mit Beute gesehen wird, löst Alarm aus. Drei Eingänge.']},
{k:'gas',n:'Tankstelle',i:'gas',be:1,ri:1,s:'Schnell, Zapfsäulen',d:['Schnell rein und raus: Kasse, Regale und Safe bringen zusammen etwa 30.000. Die Polizei ist früh da.','Zapfsäulen explodieren, wenn man sie beschießt: Deckung und Falle zugleich. Guter Einstieg.']},
{k:'truck',n:'Transporter',i:'truck',be:2,ri:2,s:'Hinterhalt auf der Straße',d:['Panzerwagen stoppen: Material sammeln, Sperre quer über die Fahrbahn bauen, bevor der Wagen kommt.','Wachen überwältigen (Bonus, Schlüssel) oder erschießen, Laderaum öffnen. 6 bis 8 Säcke zu je 9.000.']},
{k:'museum',n:'Museum',i:'museum',be:3,ri:2,s:'Nacht, Laser, Lichtkegel',d:['Im Lichtkegel einer Wache fällst du sofort auf, Laser lösen bei Berührung Alarm aus (Schalter: 50 s aus).','Gemälde, Statue, Relikte, Depot. Lautlos mit Beute raus: 100 % Bonus. Schwere Stücke machen langsam.']},
{k:'casino',n:'Casino',i:'casino',be:3,ri:3,s:'Chips und Cage',d:['Viele Wachen und Kameras. Chips zählen nur halb, wenn du sie nicht am Cage tauschst (dauert).','Chips, Automaten, VIP-Fächer, Tresor. Erst kämpft der Hausdienst, dann die Polizei.']}],
RANDOM={k:'random',n:'Zufall',i:'dice',s:'Würfelt unter allem, was dein Rang freischaltet',d:['Jeder Auftrag wird neu gewürfelt, unter allem, was dein Rang freischaltet.','Bank, Juwelier, Transporter und Tankstelle von Anfang an, Museum ab Auftrag 3, Casino ab Auftrag 5.']};
const CTRL=[['WASD / Pfeile','laufen'],['Shift','schleichen'],['E halten','Interaktion'],['F','Überfall starten'],['F halten','an Barrikade lehnen'],['Maus / Leertaste','zielen, schießen'],['R','nachladen'],['G','Fluchtwagen rufen'],['1 / 2','Störsender, Medkit'],['Esc, P','Pause'],['M','Ton an/aus']];
const FLOW=['1  Erkunden: Kameras, Wachroute, Code, Beute','2  Lautlos mit Beute raus: Bonus auf die Beute','3  Oder F: Überfall. Eingänge verbarrikadieren,','   die Polizei kommt in Wellen. G ruft den Fluchtwagen.','Nicht herumstehen: Angestellte merken es.','Je länger du bleibst, desto härter die Polizei.','Nebenziel: ein optionales Ziel je Auftrag (Zeile ZIEL),','Erfolg gibt Bonus auf die Beute.'];
const SHOPGRP=[['WAFFEN',['smg','rifle']],['SCHUTZ',['vest','helm','mask']],['WERKZEUG',['pack','drill','pick']],['EINSATZ',['radio','jam','med']]];

/* ---------- Hilfen ---------- */
function fit(t,w,font){const{g}=X;g.font=font;t=String(t);if(g.measureText(t).width<=w)return t;while(t.length>1&&g.measureText(t+'…').width>w)t=t.slice(0,-1);return t+'…'}
function wrap(t,w,font,max){const{g}=X;g.font=font;const out=[];let l='';for(const x of String(t).split(' ')){const n=l?l+' '+x:x;if(g.measureText(n).width>w&&l){out.push(l);l=x}else l=n}if(l)out.push(l);if(max&&out.length>max){out.length=max;out[max-1]=fit(out[max-1]+'…',w,font)}return out}
function icon(id,cx,cy,s,c){const{g}=X;g.save();g.translate(cx,cy);g.scale(s/24,s/24);g.translate(-12,-12);g.strokeStyle=c;g.fillStyle=c;g.lineWidth=2;g.lineCap='round';g.lineJoin='round';g.beginPath();
const dots=a=>{for(const[x,y]of a){g.beginPath();g.arc(x,y,1.5,0,6.283);g.fill()}};
switch(id){
case'play':g.moveTo(7,4);g.lineTo(20,12);g.lineTo(7,20);g.closePath();g.fill();break;
case'bank':g.moveTo(3,9);g.lineTo(12,3);g.lineTo(21,9);g.closePath();for(const x of[6,10,14,18]){g.moveTo(x,11);g.lineTo(x,18)}g.moveTo(3,21);g.lineTo(21,21);g.stroke();break;
case'jewel':g.moveTo(6,4);g.lineTo(18,4);g.lineTo(22,10);g.lineTo(12,21);g.lineTo(2,10);g.closePath();g.moveTo(2,10);g.lineTo(22,10);g.moveTo(9,4);g.lineTo(11,10);g.lineTo(12,21);g.moveTo(15,4);g.lineTo(13,10);g.lineTo(12,21);g.stroke();break;
case'gas':g.rect(5,4,9,17);g.moveTo(3,21);g.lineTo(16,21);g.moveTo(14,9);g.lineTo(18,9);g.lineTo(18,17);g.lineTo(21,17);g.lineTo(21,8);g.lineTo(18,5);g.moveTo(7,8);g.lineTo(12,8);g.stroke();break;
case'truck':g.rect(2,7,13,10);g.moveTo(15,10);g.lineTo(19,10);g.lineTo(22,13);g.lineTo(22,17);g.lineTo(15,17);g.moveTo(9,18);g.arc(7,18,2,0,6.283);g.moveTo(20,18);g.arc(18,18,2,0,6.283);g.stroke();break;
case'museum':g.rect(3,5,18,14);g.moveTo(3,16);g.lineTo(9,10);g.lineTo(13,14);g.lineTo(16,11);g.lineTo(21,16);g.moveTo(18,8.5);g.arc(16.5,8.5,1.5,0,6.283);g.stroke();break;
case'casino':g.rect(4,4,16,16);g.stroke();dots([[8,8],[16,8],[12,12],[8,16],[16,16]]);break;
case'dice':g.rect(4,4,16,16);g.stroke();g.font='bold 14px monospace';g.textAlign='center';g.fillText('?',12,17);break;
case'coop':g.arc(8,8,3,0,6.283);g.moveTo(16+3,8);g.arc(16,8,3,0,6.283);g.moveTo(2,20);g.quadraticCurveTo(8,10,14,20);g.moveTo(10,20);g.quadraticCurveTo(16,10,22,20);g.stroke();break;
case'help':g.arc(12,12,9,0,6.283);g.stroke();g.font='bold 14px monospace';g.textAlign='center';g.fillText('?',12,17);break;
case'opt':for(const[y,x]of[[6,8],[12,16],[18,10]]){g.moveTo(3,y);g.lineTo(21,y);g.stroke();g.beginPath();g.arc(x,y,2.5,0,6.283);g.fill();g.beginPath()}break;
case'plus':g.moveTo(12,4);g.lineTo(12,20);g.moveTo(4,12);g.lineTo(20,12);g.stroke();break;
case'enter':g.moveTo(10,5);g.lineTo(19,5);g.lineTo(19,19);g.lineTo(10,19);g.moveTo(3,12);g.lineTo(14,12);g.moveTo(10,8);g.lineTo(14,12);g.lineTo(10,16);g.stroke();break;
case'lock':g.rect(5,11,14,10);g.moveTo(8,11);g.lineTo(8,8);g.arc(12,8,4,Math.PI,0);g.lineTo(16,11);g.stroke();break;
case'back':g.moveTo(20,12);g.lineTo(5,12);g.moveTo(11,6);g.lineTo(5,12);g.lineTo(11,18);g.stroke();break;
case'link':g.arc(8.5,12,5,0,6.283);g.moveTo(20.5,12);g.arc(15.5,12,5,0,6.283);g.stroke();break;
case'clip':g.rect(6,5,12,16);g.moveTo(9,5);g.lineTo(9,3);g.lineTo(15,3);g.lineTo(15,5);g.moveTo(9,11);g.lineTo(15,11);g.moveTo(9,15);g.lineTo(15,15);g.stroke();break}
g.restore()}
function dotsRow(x,y,n,c){const{g}=X;for(let i=0;i<3;i++){g.beginPath();g.arc(x+i*13,y,4,0,6.283);if(i<n){g.fillStyle=c;g.fill()}else{g.strokeStyle='rgba(255,255,255,.28)';g.lineWidth=1;g.stroke()}}}

/* ---------- Kacheln zeichnen ---------- */
function drawTile(t,under){const{g}=X,f=!under&&focus===t.id&&!t.nofocus,h=!under&&hov===t.id&&t.nofocus&&!!t.act,k=t.kind||'n',lk=!!t.lock;
g.save();g.globalAlpha=lk?.62:1;
if(k!=='g'||f){g.fillStyle=k==='p'?(f||h?'rgba(52,104,40,.94)':'rgba(30,70,25,.88)'):k==='x'?(f||h?'rgba(110,34,30,.92)':'rgba(70,24,22,.84)'):(f||h?'rgba(30,34,46,.95)':'rgba(8,10,16,.86)');g.fillRect(t.x,t.y,t.w,t.h)}
const lw=f||t.chosen?2:1;g.lineWidth=lw;
g.strokeStyle=f||h?(k==='x'?'#ff6a5a':k==='p'?'#b6ff90':A):t.chosen?G:k==='g'?'rgba(255,255,255,.2)':k==='p'?'rgba(126,227,74,.7)':k==='x'?'rgba(255,106,90,.55)':'rgba(255,176,0,.3)';
g.strokeRect(t.x+lw/2,t.y+lw/2,t.w-lw,t.h-lw);
if(t.paint)t.paint(t,f);
else{const ic=t.icon,iw=ic?(t.h>=100?44:30):0,tx=t.x+12+iw;if(ic)icon(ic,t.x+12+iw/2,t.y+t.h/2,t.h>=100?34:20,lk?MU:k==='p'?G:k==='x'?'#ff8a7a':A);
 const col=lk?MU:k==='p'?G:k==='x'?'#ffb3a8':Y,cw=t.w-24-iw-(t.chip||t.key?44:0);g.textAlign='left';g.font=t.tf||'bold 14px monospace';g.fillStyle=col;
 if(t.sub){g.fillText(fit(t.title,cw,g.font),tx,t.y+(t.h<60?24:30));const ls=wrap(t.sub,t.w-24-iw,'11px monospace',t.sl||2);g.font='11px monospace';g.fillStyle=SU;ls.forEach((l,i)=>g.fillText(l,tx,t.y+(t.h<60?41:48)+i*14))}
 else g.fillText(fit(t.title,cw,g.font),tx,t.y+t.h/2+5)}
const ch=t.chip||(t.key?(t.key.length===1?t.key.toUpperCase():t.key):'');
if(ch&&!t.nochip){g.font='11px monospace';g.textAlign='right';const w=g.measureText(ch).width+10;g.strokeStyle='rgba(255,176,0,.45)';g.lineWidth=1;g.strokeRect(t.x+t.w-w-8+.5,t.y+8+.5,w,17);g.fillStyle=A;g.fillText(ch,t.x+t.w-13,t.y+21)}
if(lk&&!t.paint){icon('lock',t.x+t.w-18,t.y+t.h-18,16,MU)}
g.restore()}

/* ---------- Seiten ---------- */
const jobOf=k=>k==='random'?RANDOM:JOBS.find(j=>j.k===k)||JOBS[0];
function sTitle(){const{SESSION,fmt,scenario}=X,r=SESSION.round;
return{def:'serie',t:[
{id:'serie',x:60,y:176,w:510,h:236,kind:'p',act:'solo',chip:'Enter',paint(t){const{g}=X;icon('play',t.x+60,t.y+70,58,G);g.textAlign='left';g.font='bold 28px monospace';g.fillStyle=G;g.fillText(r>0?'Serie fortsetzen':'Neue Serie',t.x+110,t.y+78);
g.font='14px monospace';g.fillStyle=TX;const L=r>0?['Auftrag '+(r+1)+'   Konto '+fmt(SESSION.wallet),'Bester Auftrag '+fmt(SESSION.best)]:['Wer einen Auftrag verliert, verliert alles.','Ausrüstung kaufst du im Shop zwischen den Aufträgen.'];L.forEach((l,i)=>g.fillText(l,t.x+24,t.y+140+i*22));
g.font='13px monospace';g.fillStyle=Y;g.fillText('Nächster Auftrag: '+jobOf(X.scLocked(scenario)?'bank':scenario).n,t.x+24,t.y+206)}},
{id:'coop',x:590,y:176,w:310,h:72,key:'c',act:'coop',icon:'coop',title:'Coop',sub:'Raum erstellen oder beitreten'},
{id:'help',x:590,y:258,w:310,h:72,key:'?',act:'ui:help',icon:'help',title:'So wird gespielt',sub:'Steuerung und Symbole'},
{id:'opt',x:590,y:340,w:310,h:72,key:'o',act:'ui:options',icon:'opt',title:'Optionen',sub:'Ton, Bild, Name, Serie'}],
deco(){const{g,titleNote}=X;g.textAlign='center';if(titleNote){g.font='12px monospace';g.fillStyle=RD;g.fillText(titleNote.s,480,160)}
g.font='11px monospace';g.fillStyle=MU;g.fillText('Pfeiltasten oder Maus wählen, Enter oder Klick bestätigt, Esc geht zurück.',480,446);g.fillText('Ton: '+(SND.isMuted()?'aus':'an')+' (M)',480,466)}}}
function sMission(){const{scenario,NET,sameMap,CFG,missionFrom,SESSION,shopNote,fmt}=X,from=missionFrom,cw=201,gap=12,rh=128,pos=[[0,0],[1,0],[2,0],[3,0],[0,1],[1,1]];
const rk=k=>(CFG.rank[k]||0),lk=k=>X.scLocked(k)?'ab Auftrag '+(rk(k)+1):'';
const t=JOBS.map((j,i)=>({id:'job:'+j.k,x:60+pos[i][0]*(cw+gap),y:84+pos[i][1]*(rh+12),w:cw,h:rh,act:'pick',arg:j.k,chosen:scenario===j.k,lock:lk(j.k),job:j,paint:paintJob,nochip:true}));
t.push({id:'job:random',x:60+2*(cw+gap),y:84+rh+12,w:cw*2+gap,h:rh,act:'pick',arg:'random',chosen:scenario==='random',job:RANDOM,paint:paintRandom,nochip:true});
t.push({id:'back',x:60,y:466,w:170,h:44,kind:'g',act:'missionBack',title:'Zurück',chip:'Esc'});
if(NET.role!=='client')t.push({id:'same',x:246,y:466,w:340,h:44,key:'k',act:'same',title:'Gleiche Karte nochmal: '+(sameMap?'an':'aus'),chosen:sameMap});
t.push({id:'start',x:620,y:466,w:280,h:44,kind:'p',act:'missionStart',title:from==='lobby'?'Übernehmen':'Auftrag starten',chip:'Enter'});
return{def:'start',back:'missionBack',t,deco(){const{g}=X;g.textAlign='left';g.font='bold 30px monospace';g.fillStyle=A;g.fillText('AUFTRAG WÄHLEN',60,64);
g.textAlign='right';g.font='12px monospace';g.fillStyle=TX;g.fillText(SESSION.round>0?'Serie: Auftrag '+(SESSION.round+1)+'   Konto '+fmt(SESSION.wallet):'Neue Serie',900,58);
const ft=t.find(q=>q.id===focus&&q.job),j=(ft?ft.job:jobOf(scenario)),dl=ft&&ft.lock?[ft.job.n+' ist gesperrt: erreichbar '+ft.lock+'.','Jeder überstandene Auftrag zählt, auch beim Zufall.']:j.d;
g.fillStyle='rgba(0,0,0,.55)';g.fillRect(60,366,840,84);g.strokeStyle='rgba(255,176,0,.3)';g.lineWidth=1;g.strokeRect(60.5,366.5,839,83);g.textAlign='left';g.font='bold 13px monospace';g.fillStyle=Y;g.fillText(j.n,74,386);
g.font='12px monospace';g.fillStyle=TX;dl.forEach((l,i)=>g.fillText(l,74,408+i*18));
if(shopNote.t>0){g.textAlign='center';g.font='13px monospace';g.fillStyle=Y;g.fillText(shopNote.s,480,461)}g.textAlign='left'}}}
function paintJob(t){const{g}=X,j=t.job,lk=!!t.lock,c=lk?MU:Y;icon(j.i,t.x+26,t.y+28,26,lk?MU:A);g.textAlign='left';g.font='bold 15px monospace';g.fillStyle=c;g.fillText(j.n,t.x+50,t.y+33);
g.font='11px monospace';g.fillStyle=SU;wrap(j.s,t.w-24,'11px monospace',2).forEach((l,i)=>g.fillText(l,t.x+12,t.y+60+i*13));
if(lk){icon('lock',t.x+t.w-20,t.y+20,18,MU);g.fillStyle=MU;g.font='12px monospace';g.fillText(t.lock,t.x+12,t.y+t.h-14);return}
g.fillStyle=MU;g.fillText('Beute',t.x+12,t.y+100);dotsRow(t.x+66,t.y+96,j.be,A);g.fillStyle=MU;g.fillText('Risiko',t.x+12,t.y+116);dotsRow(t.x+66,t.y+112,j.ri,'#ff6a5a');
if(t.chosen){g.textAlign='right';g.font='bold 11px monospace';g.fillStyle=G;g.fillText('gewählt',t.x+t.w-12,t.y+22)}}
function paintRandom(t){const{g}=X;icon('dice',t.x+26,t.y+28,26,G);g.textAlign='left';g.font='bold 15px monospace';g.fillStyle=G;g.fillText('Zufall',t.x+50,t.y+33);g.font='11px monospace';g.fillStyle=SU;wrap(RANDOM.s,t.w-24,'11px monospace',2).forEach((l,i)=>g.fillText(l,t.x+12,t.y+60+i*13));
if(t.chosen){g.textAlign='right';g.font='bold 11px monospace';g.fillStyle=G;g.fillText('gewählt',t.x+t.w-12,t.y+22)}}
function sCoop(){const{NET,myName,nameEdit,time}=X;
return{def:'host',back:'coopBack',t:[
{id:'host',x:190,y:226,w:270,h:112,key:'h',act:'host',icon:'plus',title:'Raum erstellen',sub:'Du bist Host, dein Tab rechnet das Spiel.',sl:3},
{id:'join',x:500,y:226,w:270,h:112,key:'j',act:'join',icon:'enter',title:'Raum beitreten',sub:'Code oder Link vom Host eintippen oder einfügen.',sl:3},
{id:'name',x:190,y:352,w:580,h:60,key:'n',act:'name',paint(t){const{g}=X;g.textAlign='left';g.font='11px monospace';g.fillStyle=MU;g.fillText('DEIN NAME',t.x+14,t.y+20);
if(myName||nameEdit){g.font='bold 18px monospace';g.fillStyle=Y;g.fillText(myName+(nameEdit&&Math.floor(time*2)%2?'|':''),t.x+14,t.y+46)}else{g.font='14px monospace';g.fillStyle='#6c7480';g.fillText('ohne Namen: deine Farbe',t.x+14,t.y+46)}
g.textAlign='right';g.fillStyle=MU;g.font='11px monospace';g.fillText(nameEdit?'Enter: übernehmen':'Klick zum Ändern',t.x+t.w-14,t.y+46)}},
{id:'back',x:60,y:488,w:170,h:40,kind:'g',act:'coopBack',title:'Zurück',chip:'Esc'}],
deco(){const{g,errTxt}=X;g.textAlign='center';g.font='bold 30px monospace';g.fillStyle=BL;g.fillText('COOP',480,196);g.font='13px monospace';g.fillStyle=TX;g.fillText('Ein Raum, ein Überfall, bis zu 4 Räuber.',480,216);
if(!window.Peer){g.font='12px monospace';g.fillStyle=RD;g.fillText(errTxt('lib'),480,440)}else if(NET.msg){g.font='12px monospace';g.fillStyle=Y;g.fillText(NET.msg,480,440)}}}}
function sJoin(){const{NET,joinText}=X,ok=joinText.length===4;
return{def:ok?'go':'paste',back:'joinBack',enter:'go',t:[
{id:'paste',x:250,y:338,w:220,h:60,key:'v',act:'paste',icon:'clip',title:'Einfügen',sub:'Aus der Zwischenablage',chip:'Strg V'},
{id:'go',x:490,y:338,w:220,h:60,kind:'p',act:'joinGo',icon:'enter',title:'Beitreten',lock:ok?'':'erst 4 Zeichen',chip:'Enter',sub:ok?'Mit dem Host verbinden':'Erst 4 Zeichen eingeben'},
{id:'back',x:60,y:488,w:170,h:40,kind:'g',act:'joinBack',title:'Zurück',chip:'Esc'}],
deco(){const{g}=X;g.textAlign='center';g.font='bold 30px monospace';g.fillStyle=BL;g.fillText('RAUMCODE',480,196);g.font='13px monospace';g.fillStyle=TX;g.fillText('Code des Hosts eintippen oder Link einfügen.',480,220);
for(let i=0;i<4;i++){const x=480-110+i*60;g.fillStyle='rgba(0,0,0,.6)';g.fillRect(x,250,50,64);g.strokeStyle=i===joinText.length?A:'rgba(255,176,0,.35)';g.lineWidth=2;g.strokeRect(x+1,251,48,62);g.font='bold 40px monospace';g.fillStyle=Y;g.fillText(joinText[i]||'',x+25,299)}
if(NET.msg){g.font='13px monospace';g.fillStyle=Y;g.fillText(NET.msg,480,424)}}}}
function sLobby(){const{NET,PC,pn,myName,nameEdit,time,scenario,roomLink}=X,host=NET.role==='host';
const t=[];for(let i=0;i<4;i++){const r=NET.roster.find(q=>q.id===i),me=i===NET.myId;t.push({id:'p'+i,x:122+i*182,y:268,w:170,h:84,nofocus:!me,act:me?'name':'',key:me?'n':'',nochip:!me,pl:{i,r,me},paint:paintPlayer,chip:me?'N':''})}
t.push({id:'job',x:122,y:366,w:350,h:56,key:host?'t':'',act:host?'missionOpen':'',nofocus:!host,title:'Auftrag: '+jobOf(scenario).n,sub:host?'Klick zum Ändern':'Der Host wählt den Auftrag',nochip:!host,icon:jobOf(scenario).i});
if(host)t.push({id:'link',x:486,y:366,w:352,h:56,key:'l',act:'copyLink',icon:'link',title:'Link kopieren',sub:'Einladung zum Weitergeben'});
t.push({id:'leave',x:60,y:488,w:200,h:40,kind:'g',act:'lobbyBack',title:host?'Raum schließen':'Verlassen',chip:'Esc'});
t.push({id:'start',x:620,y:484,w:280,h:44,kind:host?'p':'g',act:host?'lobbyStart':'',nofocus:!host,title:host?'Starten ('+NET.roster.length+(NET.roster.length===1?' Spieler)':' Spieler)'):'Der Host startet ...',chip:host?'Enter':'',nochip:!host});
return{def:host?'start':'leave',back:'lobbyBack',t,deco(){const{g}=X;g.textAlign='center';g.font='13px monospace';g.fillStyle=TX;g.fillText(host?'Dein Raum':'Du bist im Raum',480,188);g.font='bold 44px monospace';g.fillStyle=A;g.fillText(NET.code,480,232);
if(host){g.font='11px monospace';g.fillStyle=MU;g.fillText(roomLink(),480,252)}g.font='13px monospace';g.fillStyle=Y;g.fillText(NET.msg||'',480,452)}}}
function paintPlayer(t){const{g,PC,pn,myName,nameEdit,time,NET}=X,{i,r,me}=t.pl;g.textAlign='left';g.fillStyle=r?PC[i].c:'rgba(255,255,255,.18)';g.fillRect(t.x+12,t.y+14,12,12);
if(r){g.font='bold 14px monospace';g.fillStyle='#e6eaf0';const nm=me&&nameEdit?myName+(Math.floor(time*2)%2?'|':' '):pn(i);g.fillText(fit(nm,t.w-60,g.font),t.x+32,t.y+25);g.font='11px monospace';g.fillStyle=SU;g.fillText((me?'du':'Mitspieler')+(i===0?', Host':''),t.x+12,t.y+50);if(me){g.fillStyle=MU;g.fillText(nameEdit?'tippen, Enter':'Klick: Name',t.x+12,t.y+68)}}
else{g.font='12px monospace';g.fillStyle='#6c7480';g.fillText('wartet auf',t.x+32,t.y+25);g.fillText('Spieler ...',t.x+12,t.y+50)}}
function sShop(){const{CFG,NET,SESSION,fmt,shopState,SHOPKEYS}=X,items=CFG.shop.items,t=[],host=NET.role==='host',client=NET.role==='client',mine=NET.roster.find(q=>q.id===NET.myId);
const cols=SHOPGRP.map(([n,ks])=>({n,ix:ks.map(k=>items.findIndex(it=>it.k===k)).filter(i=>i>=0)}));
items.forEach((it,i)=>{if(!cols.some(c=>c.ix.includes(i)))cols[cols.length-1].ix.push(i)});
cols.forEach((c,ci)=>c.ix.forEach((i,ri)=>t.push({id:'buy:'+i,x:60+ci*212,y:104+ri*90,w:204,h:82,act:'buy',arg:i,key:SHOPKEYS[i],item:items[i],st:shopState(items[i]),paint:paintItem,nochip:true})));
t.push({id:'back',x:60,y:466,w:200,h:44,kind:'g',act:'shopBack',title:NET.role==='solo'?'Zum Titel':'Raum verlassen',chip:'Esc'});
t.push({id:'next',x:620,y:466,w:280,h:44,kind:'p',act:'shopNext',chip:'Enter',title:client?(mine&&mine.rdy?'Doch noch nicht bereit':'Bereit'):'Weiter: Auftragswahl'});
return{def:'next',back:'shopBack',t,cols,deco(){const{g,curKit,PC,pn,shopNote}=X;g.textAlign='left';g.font='bold 30px monospace';g.fillStyle=A;g.fillText('SHOP',60,64);
g.textAlign='right';g.font='bold 22px monospace';g.fillStyle=G;g.fillText('Konto '+fmt(SESSION.wallet),900,58);g.font='12px monospace';g.fillStyle=TX;g.fillText('Serie: Auftrag '+(SESSION.round+1)+'   Bester Auftrag '+fmt(SESSION.best),900,80);
g.textAlign='left';g.font='bold 11px monospace';g.fillStyle=MU;cols.forEach((c,ci)=>g.fillText(c.n,60+ci*212,96));
const k=curKit(),nm=[CFG.wpn[k.w].n].concat(items.filter(it=>!it.c&&it.k!=='smg'&&it.k!=='rifle'&&SESSION.own[it.k]).map(it=>it.n)),gd=[k.jam?'Störsender x'+k.jam:'',k.med?'Medkit x'+k.med:''].filter(Boolean);
g.textAlign='center';g.font='12px monospace';g.fillStyle=TX;g.fillText(fit('Dein Kit: '+nm.join(', ')+(gd.length?'   |   '+gd.join(', '):''),840,'12px monospace'),480,388);
if(NET.role!=='solo'){const n=NET.roster.length,w=Math.min(150,860/n);NET.roster.forEach((r,i)=>{const x=480-n*w/2+i*w+8;g.fillStyle=PC[r.id].c;g.fillRect(x,402,9,9);g.textAlign='left';g.font='11px monospace';g.fillStyle=r.id===0||r.rdy?G:SU;g.fillText(pn(r.id)+(r.id===0?' (Host)':r.rdy?' bereit':' kauft ein'),x+14,411)})}
if(shopNote.t>0){g.textAlign='center';g.font='13px monospace';g.fillStyle=Y;g.fillText(shopNote.s,480,440)}g.textAlign='left'}}}
function paintItem(t){const{g,fmt,CFG,SHOPKEYS}=X,it=t.item,st=t.st,ok=st==='kaufen',own=st==='gekauft'||st==='ersetzt',i=CFG.shop.items.indexOf(it),cnt=it.c?(SESSION.cons[it.k]|0):0;
g.textAlign='left';g.font='bold 11px monospace';g.fillStyle=A;g.fillText('['+SHOPKEYS[i]+']',t.x+10,t.y+20);
g.font='bold 13px monospace';g.fillStyle=own?G:ok?Y:MU;g.fillText(fit(it.n,t.w-100,g.font),t.x+38,t.y+20);
g.textAlign='right';g.font='bold 13px monospace';g.fillStyle=ok?'#e6eaf0':'#6c7480';g.fillText(fmt(it.p),t.x+t.w-10,t.y+20);
g.textAlign='left';g.font='11px monospace';g.fillStyle=SU;wrap(it.d(),t.w-20,'11px monospace',2).forEach((l,k)=>g.fillText(l,t.x+10,t.y+40+k*13));
g.font='11px monospace';g.fillStyle=own?G:st==='zu teuer'?RD:SU;g.fillText(it.c?'Vorrat '+cnt+' / '+CFG.shop[it.k+'Max']+(ok?'':'  ('+st+')'):st,t.x+10,t.y+t.h-9)}
function sPause(){const{NET}=X;
return{def:'resume',back:'resume',t:[
{id:'resume',x:330,y:158,w:300,h:50,kind:'p',key:'p',act:'resume',title:'Weiter',chip:'P'},
{id:'help',x:330,y:218,w:300,h:50,key:'?',act:'ui:help',icon:'help',title:'So wird gespielt'},
{id:'opt',x:330,y:278,w:300,h:50,key:'o',act:'ui:options',icon:'opt',title:'Optionen'},
{id:'leave',x:330,y:338,w:300,h:50,kind:'x',key:'q',act:'ui:confirm',arg:{k:'leave'},title:NET.role==='solo'?'Zum Titel':'Raum verlassen'}],
deco(){const{g,VW,VH,SESSION,fmt}=X;g.fillStyle='rgba(8,10,16,.74)';g.fillRect(0,0,VW,VH);g.textAlign='center';g.fillStyle=Y;g.font='bold 34px monospace';g.fillText('PAUSE',480,122);
g.font='12px monospace';g.fillStyle=MU;g.fillText(SESSION.round>0?'Serie: Auftrag '+(SESSION.round+1)+'   Konto '+fmt(SESSION.wallet):'',480,424)}}}
function sEnded(){const{ended,NET}=X;if(!ended)return null;const win=ended.win||ended.soft;
return{t:[{id:'endNext',x:730,y:468,w:190,h:58,kind:'p',nofocus:true,act:(NET.role==='client'&&!win)?'':'endNext',chip:'Enter',title:win?'Weiter: Shop':NET.role==='client'?'Der Host startet ...':'Neue Serie',tf:'bold 13px monospace'},
{id:'endBack',x:40,y:468,w:190,h:58,nofocus:true,act:'endBack',chip:'Esc',title:NET.role==='solo'?'Zum Titel':NET.role==='host'?'Raum schließen':'Raum verlassen',tf:'bold 13px monospace'}]}}

/* ---------- Modals: Optionen, Anleitung, Rueckfrage ---------- */
function mOptions(){const{scr,DBG,unlockAll,myName,nameEdit,time,CFG}=X,title=scr==='title',rows=[];
rows.push({id:'vmus',slider:0,title:'Musik',paint:paintSlider},{id:'vsfx',slider:1,title:'Effekte',paint:paintSlider});
/* Ton und Maus fangen (MLOCK aus index.html): zwei halbe Kacheln nebeneinander, ohne Pointer-Lock-Unterstuetzung nur der Ton in voller Breite */
rows.push({id:'mute',key:'m',act:'mute',half:MLOCK.can?0:undefined,title:'Ton: '+(SND.isMuted()?'aus':'an'),sub:MLOCK.can?'Musik und Effekte':'',nochip:false});
if(MLOCK.can)rows.push({id:'lock',key:'f',act:'mlock',half:1,title:'Maus fangen: '+(MLOCK.on?'an':'aus'),sub:MLOCK.on?'Esc gibt die Maus frei':'Zeiger bleibt beweglich'});
/* Bildgroesse und Vollbild (VIEW aus index.html): zwei halbe Kacheln nebeneinander, ohne Vollbild-Unterstuetzung nur die Bildgroesse in voller Breite */
rows.push({id:'view',key:'b',act:'view',half:VIEW.can?0:undefined,title:'Bildgröße',sub:VIEW.mode==='auto'?'Passt sich dem Fenster an':'Fest, höchstens 1100 px'});
if(VIEW.can)rows.push({id:'full',key:'v',act:'full',half:1,title:'Vollbild: '+(VIEW.full?'an':'aus'),sub:VIEW.full?'Esc beendet das Vollbild':'Ganzer Bildschirm'});
if(title)rows.push({id:'name',key:'n',act:'name',paint(t){const{g}=X;g.textAlign='left';g.font='bold 14px monospace';g.fillStyle=Y;g.fillText('Dein Name',t.x+12,t.y+26);g.textAlign='right';g.font='bold 14px monospace';g.fillStyle=myName||nameEdit?TX:'#6c7480';g.fillText((myName||(nameEdit?'':'ohne Namen'))+(nameEdit&&Math.floor(time*2)%2?'|':''),t.x+t.w-52,t.y+26)}});
if(title)rows.push({id:'series',kind:'x',act:'ui:confirm',arg:{k:'series'},title:'Neue Serie beginnen',sub:'Konto und Ausrüstung gehen verloren.'});
if(title&&DBG)rows.push({id:'unlock',act:'unlock',title:'Alle Aufträge freischalten: '+(unlockAll?'an':'aus'),sub:'Nur zum Testen, hebt die Rang-Sperren auf.'});
const gap=8,hs=rows.map(r=>r.sub?56:44),h=70+hs.reduce((a,b,i)=>a+(rows[i].half===1?0:b+gap),0)+56,y0=Math.round((544-h)/2),px=240,pw=480,hw=(pw-40-gap)/2;
let yy=y0+56;const t=rows.map((r,i)=>{const o=Object.assign({x:px+20,y:yy,w:pw-40,h:hs[i]},r);if(r.half===0)o.w=hw;else if(r.half===1){o.x=px+20+hw+gap;o.w=hw}if(r.half!==0)yy+=hs[i]+gap;return o});
t.push({id:'close',x:px+pw/2-90,y:y0+h-52,w:180,h:40,kind:'p',act:'ui:close',title:'Schließen',chip:'Esc'});
return{def:'close',back:'ui:close',t,deco(){const{g}=X;panelFrame(px,y0,pw,h,'OPTIONEN')}}}
function paintSlider(t){const{g}=X,i=t.slider,v=SND.vol(i?'sfx':'mus');g.textAlign='left';g.font='bold 14px monospace';g.fillStyle=Y;g.fillText(t.title,t.x+12,t.y+27);const bx=t.x+130,bw=t.w-200;
g.fillStyle='rgba(0,0,0,.65)';g.fillRect(bx,t.y+19,bw,8);g.fillStyle=focus===t.id?A:'#b07a00';g.fillRect(bx,t.y+19,bw*v,8);g.fillStyle='#f4f1e6';g.fillRect(bx+bw*v-2,t.y+16,4,14);
g.textAlign='right';g.font='12px monospace';g.fillStyle=TX;g.fillText(Math.round(v*100)+'%',t.x+t.w-12,t.y+27)}
function panelFrame(x,y,w,h,title){const{g,VW,VH}=X;g.fillStyle='rgba(8,10,16,.78)';g.fillRect(0,0,VW,VH);g.fillStyle='rgba(14,16,22,.96)';g.fillRect(x,y,w,h);g.strokeStyle='rgba(255,176,0,.45)';g.lineWidth=1;g.strokeRect(x+.5,y+.5,w-1,h-1);g.textAlign='left';g.font='bold 15px monospace';g.fillStyle=A;g.fillText(title,x+20,y+34)}
function mHelp(){const px=70,pw=820,py=24,ph=496;
return{def:'close',back:'ui:close',t:[{id:'close',x:480-90,y:py+ph-52,w:180,h:40,kind:'p',act:'ui:close',title:'Schließen',chip:'Esc'}],
deco(){const{g,drawLegend}=X;panelFrame(px,py,pw,ph,'SO WIRD GESPIELT');g.font='bold 11px monospace';g.fillStyle=MU;g.textAlign='left';g.fillText('STEUERUNG',px+24,py+66);g.fillText('ABLAUF',px+430,py+66);
CTRL.forEach((r,i)=>{const y=py+92+i*24;g.font='bold 12px monospace';g.fillStyle=Y;g.fillText(r[0],px+24,y);g.font='12px monospace';g.fillStyle=TX;g.fillText(r[1],px+190,y)});
FLOW.forEach((l,i)=>{g.font='12px monospace';g.fillStyle=TX;g.fillText(l,px+430,py+92+i*24)});
g.font='bold 11px monospace';g.fillStyle=MU;g.fillText('SYMBOLE',px+24,py+376);drawLegend(py+398);g.textAlign='left'}}}
function mConfirm(m){const px=270,pw=420,ph=176,py=Math.round((544-ph)/2);
return{def:'no',back:'ui:close',t:[{id:'yes',x:px+20,y:py+ph-62,w:180,h:44,kind:'x',act:'ui:yes',title:m.yesLabel||'Ja'},{id:'no',x:px+pw-200,y:py+ph-62,w:180,h:44,kind:'p',act:'ui:close',title:'Zurück',chip:'Esc'}],
deco(){const{g}=X;panelFrame(px,py,pw,ph,m.title||'Sicher?');g.textAlign='left';g.font='13px monospace';g.fillStyle=TX;wrap(m.msg||'',pw-40,'13px monospace',3).forEach((l,i)=>g.fillText(l,px+20,py+66+i*20))}}}
function openModal(m){m.ret=focus;stack.push(m);modal=m;focus=null}
function closeModal(){const m=stack.pop();modal=stack[stack.length-1]||null;if(m)focus=m.ret}
function closeAll(){const m=stack[0];stack=[];modal=null;if(m)focus=m.ret}

/* ---------- aktuelle Seite ---------- */
function base(){const{scr,paused,ended,NET}=X;
if(scr==='title')return sTitle();if(scr==='mission')return sMission();if(scr==='coop')return sCoop();if(scr==='join')return sJoin();if(scr==='lobby')return sLobby();if(scr==='shop')return sShop();
if(scr==='play'){if(ended)return sEnded();if(paused)return sPause()}return null}
function modalSpec(m){if(m.k==='options')return mOptions();if(m.k==='help')return mHelp();if(m.k==='confirm')return mConfirm(m);return null}
function cur(){const b=base();if(!b){stack=[];modal=null;sig='';return null}
const sg=X.scr+'|'+(X.paused?1:0)+'|'+(X.ended?1:0);if(sg!==sig){sig=sg;stack=[];modal=null;focus=null;hov=null}
const c=modal?modalSpec(modal):b;
if(!c.t.some(t=>t.id===focus&&!t.nofocus))focus=(c.t.find(t=>t.id===c.def&&!t.nofocus)||c.t.find(t=>!t.nofocus)||{}).id||null;
return c}

/* ---------- Eingabe ---------- */
function tileAt(x,y){const c=cur();if(!c)return null;for(let i=c.t.length-1;i>=0;i--){const t=c.t[i];if(x>=t.x&&x<=t.x+t.w&&y>=t.y&&y<=t.y+t.h)return t}return null}
function setSlider(t,x){X.volAdj(t.slider,Math.max(0,Math.min(1,(x-(t.x+130))/(t.w-200))),true)}
function activate(t){if(!t||!t.act)return;if(t.lock){SND.ev('deny');return}const a=t.act;
if(a==='ui:close'){closeModal();return}
if(a==='ui:options'||a==='ui:help'){openModal({k:a.slice(3)});return}
if(a==='ui:confirm'){const solo=X.NET.role==='solo';openModal(Object.assign({k:'confirm'},(t.arg||{}).k==='series'?{title:'NEUE SERIE',msg:'Konto, Ausrüstung und Serienstand gehen verloren. Wirklich neu beginnen?',yesLabel:'Ja, neue Serie',yes:'newSeries'}:{title:solo?'ZUM TITEL':'RAUM VERLASSEN',msg:solo?'Der laufende Auftrag wird abgebrochen. Die Serie bleibt bestehen.':'Du verlässt das Spiel, die anderen spielen weiter.',yesLabel:solo?'Ja, zum Titel':'Ja, verlassen',yes:'leave'}));return}
if(a==='ui:yes'){const y=modal.yes;closeAll();X.act(y);return}
X.act(a,t.arg);if(a==='pick')focus='start'}
function nav(k){const c=cur();if(!c)return true;const L=c.t.filter(t=>!t.nofocus);if(!L.length)return true;const f=L.find(t=>t.id===focus);if(!f){focus=L[0].id;return true}
const cx=t=>t.x+t.w/2,cy=t=>t.y+t.h/2;let best=null,bs=1e9;
for(const t of L){if(t===f)continue;const dx=cx(t)-cx(f),dy=cy(t)-cy(f);let p,q;
if(k==='ArrowRight'){if(dx<=4)continue;p=dx;q=Math.abs(dy)}else if(k==='ArrowLeft'){if(dx>=-4)continue;p=-dx;q=Math.abs(dy)}else if(k==='ArrowDown'){if(dy<=4)continue;p=dy;q=Math.abs(dx)}else{if(dy>=-4)continue;p=-dy;q=Math.abs(dx)}
const s=p+2.5*q;if(s<bs){bs=s;best=t}}
if(best)focus=best.id;return true}
function key(k,e){const c=cur();if(!c||c.t.every(t=>t.nofocus))return false;e=e||{};const ft=c.t.find(t=>t.id===focus&&!t.nofocus);
if(k==='m'){if(!e.repeat)X.act('mute');return true}
if(k==='ArrowLeft'||k==='ArrowRight'){if(ft&&ft.slider!=null){X.volAdj(ft.slider,k==='ArrowLeft'?-.05:.05);return true}return nav(k)}
if(k==='ArrowUp'||k==='ArrowDown')return nav(k);
if(k==='Tab'){const L=c.t.filter(t=>!t.nofocus),i=L.findIndex(t=>t.id===focus);focus=L[(i+1)%L.length].id;return true}
if(k==='Enter'||k===' '){if(!e.repeat){const t=(k==='Enter'&&c.enter)?c.t.find(q=>q.id===c.enter):ft;activate(t)}return true}
if(k==='Escape'){if(!e.repeat&&c.back)activate({act:c.back});return true}
const t=c.t.find(q=>q.key&&q.key===k);if(t){if(!e.repeat)activate(t);return true}
return true}
function down(x,y){const c=cur();if(!c)return false;const t=tileAt(x,y);if(t){if(t.slider!=null){drag=t;setSlider(t,x)}pressed=t.id;if(!t.nofocus)focus=t.id}return true}
function up(x,y){if(drag){drag=null;pressed=null;return}const c=cur();if(!c){pressed=null;return}const t=tileAt(x,y);if(pressed&&t&&t.id===pressed&&t.slider==null)activate(t);pressed=null}
function move(x,y){if(drag){setSlider(drag,x);return}const t=tileAt(x,y);hov=t?t.id:null;if(t&&!t.nofocus)focus=t.id}
const active=()=>!!cur();

/* ---------- Zeichnen ---------- */
function paintStack(c,under){c.deco&&c.deco();c.t.forEach(t=>drawTile(t,under))}
function paintAll(){const b=base();if(stack.length){paintStack(b,true);stack.forEach(m=>paintStack(modalSpec(m),m!==modal))}else paintStack(b,false)}
function drawMenu(){const{g,scr}=X;titleBack(scr==='shop'||scr==='mission');g.textAlign='center';if(!cur())return;paintAll();g.textAlign='left'}
function drawPause(){const{g}=X;if(!cur())return;paintAll();g.textAlign='left'}
function drawEnded(){const c=cur();if(!c)return;c.t.forEach(t=>drawTile(t,false))}
function titleBack(small){const{S0,T,VH,VW,W1,WX0,WY0,camX,camY,g,so,st}=X;W1();g.globalCompositeOperation='source-over';g.fillStyle='#0e1014';g.fillRect(camX-2,camY-2,VW+4,VH+4);
{const sx=(camX-WX0*T)*2,sy=(camY-WY0*T)*2;g.drawImage(st,sx,sy,VW*2,VH*2,camX,camY,VW,VH);g.drawImage(so,sx,sy,VW*2,VH*2,camX,camY,VW,VH)}
S0();g.fillStyle='rgba(8,10,16,.68)';g.fillRect(0,0,VW,VH);
const v=g.createRadialGradient(480,272,200,480,272,640);v.addColorStop(0,'rgba(0,0,0,0)');v.addColorStop(1,'rgba(0,0,0,.55)');g.fillStyle=v;g.fillRect(0,0,VW,VH);
if(small)return;g.textAlign='center';g.font='bold 76px monospace';g.fillStyle='rgba(0,0,0,.6)';g.fillText('HOLDUP',484,112);g.fillStyle='#ffb000';g.fillText('HOLDUP',480,108);
g.font='15px monospace';g.fillStyle='#c9d4de';g.fillText('Rein, raus, reich.',480,140)}
return{drawMenu,drawPause,drawEnded,key,down,up,move,active,JOBS,modal:()=>modal?modal.k:null,focus:()=>{cur();return focus},tiles:()=>{const c=cur();return c?c.t.map(t=>({id:t.id,x:t.x,y:t.y,w:t.w,h:t.h,lock:t.lock||'',chosen:!!t.chosen,nofocus:!!t.nofocus})):[]}}}
mkUI.api=2;
