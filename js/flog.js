/* Holdup: Flugschreiber, aus index.html ausgelagert (Plan Auslagern Schritt 1). Klassisches Skript ohne Bauschritt, wird vor dem Spielkern geladen.
   Liefert die globalen Namen mkFlog, FL_SINKS und FL_KEYS (wie vorher im Hauptskript). BUILD liest mkFlog erst beim Speichern aus dem Hauptskript. */
/* Flugschreiber (Session-Log, Tills Wunsch vom 26. Oktober 2026 fuer die Coop-Tests, Einzelheiten in docs/coop-und-netz.md): zeichnet je Spieler im Speicher auf und gibt es als JSON-Datei aus (F9 oder Kachel in den Optionen), im Coop schickt jeder Client sein Log am Rundenende an den Host im selben Raum (Stufe B), sonst geht nichts irgendwohin.
   mkFlog(clock) baut je Spielinstanz einen Schreiber, die Spiellogik ruft nur ev, evl, round, sample, frame, mark, snap, ping, corr, fr, take und dump. Ringpuffer: Ereignisse 6000, Messzeilen 5400 (je Sekunde), Bilder 150 (5 je Sekunde, also 30 s), Markierungen 20 (jede mit diesen 30 s und den letzten 80 Ereignissen). */
const FL_SINKS=new Set(),FL_KEYS=['t','gt','scr','ph','tH','wv','sus','sec','kills','civ','en','npc','pc','hp','ar','x','y','ping','sn','gap','gapMax','corr','fps','dtMax','up','dr','drMax'];
(()=>{const to=f=>{for(const k of FL_SINKS)f(k)};
addEventListener('error',e=>to(k=>k.err({m:String(e.message||''),f:String(e.filename||'').split('/').pop(),l:e.lineno|0,s:e.error&&e.error.stack?String(e.error.stack).slice(0,700):''})));
addEventListener('unhandledrejection',e=>to(k=>k.err({m:'Promise: '+String(e.reason&&e.reason.message||e.reason||'').slice(0,200),s:e.reason&&e.reason.stack?String(e.reason.stack).slice(0,700):''})));
document.addEventListener('visibilitychange',()=>to(k=>k.ev('tab',document.hidden?'versteckt':'sichtbar')));
addEventListener('online',()=>to(k=>k.ev('netz','online')));addEventListener('offline',()=>to(k=>k.ev('netz','offline')))})();
function mkFlog(clock){const MAXE=6000,MAXS=5400,MAXF=150,MAXM=20,t0=performance.now();
let evs=[],smp=[],frm=[],marks=[],rounds=[],errN=0,sn=0,sg=0,gm=0,cm=0,fn=0,dm=0,cn=0,us=0,ds=0,dx=0,lastSnap=0,pingV=0,rl={},gpuS=null;
const now=()=>Math.round((performance.now()-t0)/10)/100,gt=()=>{try{return Math.round(clock()*100)/100}catch(e){return -1}},ring=(a,x,m)=>{a.push(x);if(a.length>m)a.shift()};
/* Grafikkarte (WebGL-Renderer, einmal): zeigt, ob der Browser mit Hardwarebeschleunigung zeichnet oder in Software (SwiftShader, llvmpipe) */
const gpuName=()=>{if(gpuS!==null)return gpuS;try{const c=document.createElement('canvas'),gl=c.getContext('webgl')||c.getContext('experimental-webgl'),e=gl&&gl.getExtension('WEBGL_debug_renderer_info');gpuS=e?String(gl.getParameter(e.UNMASKED_RENDERER_WEBGL)).slice(0,120):(gl?'webgl ohne Info':'kein webgl');const l=gl&&gl.getExtension('WEBGL_lose_context');if(l)l.loseContext()}catch(x){gpuS='fehler'}return gpuS};
const L={
ev(k,d){ring(evs,[now(),gt(),k,d===undefined?null:d],MAXE)},
evl(k,d,min){const t=now();if(t-(rl[k]===undefined?-9:rl[k])<min)return;rl[k]=t;L.ev(k,d)},
err(o){errN++;if(errN<=200)L.ev('fehler',o)},
round(meta){rounds.push({i:rounds.length+1,t:now(),meta});L.ev('runde',rounds.length)},
sample(a){ring(smp,[now()].concat(a),MAXS)},frame(a){ring(frm,[now()].concat(a),MAXF)},
mark(note){const n=String(note||'').slice(0,200);marks.push({t:now(),gt:gt(),note:n,frames:frm.slice(),ev:evs.slice(-80)});if(marks.length>MAXM)marks.shift();L.ev('marke',n.slice(0,80));return marks.length},
snap(){const n=performance.now();if(lastSnap){const g=n-lastSnap;sn++;sg+=g;if(g>gm)gm=g}lastSnap=n},
ping(v){pingV=Math.round(v)},corr(d){if(d>cm)cm=d},fr(ms){fn++;if(ms>dm)dm=ms},cost(u,d){cn++;us+=u;ds+=d;if(d>dx)dx=d},
take(){const o={ping:pingV,sn,gap:sn?Math.round(sg/sn):0,gapMax:Math.round(gm),corr:Math.round(cm),fps:fn,dtMax:Math.round(dm),up:cn?Math.round(us/cn*10)/10:0,dr:cn?Math.round(ds/cn*10)/10:0,drMax:Math.round(dx)};sn=sg=gm=cm=fn=dm=cn=us=ds=dx=0;return o},
env(){const n=navigator,c=n.connection||{};return{ua:n.userAgent,sprache:n.language,bildschirm:[screen.width,screen.height,devicePixelRatio],fenster:[innerWidth,innerHeight],kerne:n.hardwareConcurrency||0,speicher:n.deviceMemory||0,gpu:gpuName(),netz:c.effectiveType?{typ:c.effectiveType,rtt:c.rtt,down:c.downlink}:null,online:n.onLine}},
dump(x,lite){return Object.assign({fmt:1,spiel:'holdup',build:BUILD.n,datum:BUILD.d,gespeichert:new Date().toISOString(),dauer:now(),umgebung:L.env(),runden:rounds,ereignisse:lite?evs.slice(-3000):evs,messzeilen:{spalten:FL_KEYS,zeilen:lite?smp.slice(-1800):smp},markierungen:lite?marks.slice(-5):marks,fehler:errN},x||{})},
save(x){const s=JSON.stringify(L.dump(x)),a=document.createElement('a'),d=new Date(),p2=v=>String(v).padStart(2,'0'),nm=String(x&&x.name||'spieler').replace(/[^\p{L}\p{N}_-]/gu,'').slice(0,16)||'spieler';
a.href=URL.createObjectURL(new Blob([s],{type:'application/json'}));a.download='holdup-log-b'+BUILD.n+'-'+(x&&x.rolle||'solo')+'-'+nm+'-'+d.getFullYear()+p2(d.getMonth()+1)+p2(d.getDate())+'-'+p2(d.getHours())+p2(d.getMinutes())+p2(d.getSeconds())+'.json';
document.body.appendChild(a);a.click();const u=a.href;setTimeout(()=>{a.remove();URL.revokeObjectURL(u)},2000);return{name:a.download,bytes:s.length}}};
FL_SINKS.add(L);return L}
