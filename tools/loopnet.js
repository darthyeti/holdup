// Test-Leitung im Speicher fuer Coop-Tests, ersetzt PeerJS. Nur mit index.html#debug nutzbar. net.stat zaehlt Nachrichten (n), die groesste in Byte (max) und die zu grossen (big): Wie PeerJS wirft sie JSON-Nachrichten ab 16.300 Byte weg, ein Test kann big auf 0 pruefen.
// Laden: fetch('tools/loopnet.js').then(r=>r.text()).then(eval)
// Zwei Instanzen in einer Seite, Zeit wird von Hand vorgespult (virtuelle Zeit, schnell und deterministisch):
//   const net=LoopNet(40);                       // 40 ms Verzoegerung je Richtung
//   const A=mkInst(net,'a'),B=mkInst(net,'b');   // je ein Spiel mit eigenem Canvas, ohne rAF-Schleife
//   A.hostRoom();net.advance(.05);B.joinRoom(A.NET.code);...
//   for(let i=0;i<60;i++)step([A,B],net,1/60);   // tickt beide Spiele und liefert Nachrichten aus
// Abbrueche nachstellen (Spur N): mkInst(net,'name') haengt dem Spiel eine benannte Sicht auf die Leitung (net.as(name)), jedes Verbindungspaar kennt dann seine zwei Namen.
//   net.cut('b',{silent:true,closeAfter:30})   // Abriss ohne onclose: alles von und zu b geht verloren (net.stat.lost), nach closeAfter Sekunden virtueller Zeit schliessen beide Seiten (wie ICE failed)
//   net.cut('b')                                // harter Abriss: beide Seiten bekommen sofort onclose (wie ein geschlossener Tab)
//   net.heal('b')                               // hebt einen stillen Abriss auf, bevor die Schliesszeit um ist
//   net.signalDown(code,{hold:true})            // der Vermittler verliert den Host: der Raum ist nicht mehr auffindbar (peer-unavailable), der Host bekommt onDisc; ohne hold heilt host.reconnect(), mit hold erst net.signalUp(code)
//   net.signalUp(code)                          // Raum wieder auffindbar, der Host bekommt onRe
(function(){
function LoopNet(lat,jit){lat=lat==null?30:lat;jit=jit||0;const q=[],rooms={},owners={},down={},cuts={},pairs=[],stat={big:0,max:0,n:0,lost:0};let t=0;
const dl=()=>lat+(jit?Math.random()*jit:0);
const put=(fn,d)=>q.push({at:t+d,fn});
function pair(an,bn){const A={closed:0,onmsg:null,onclose:null},B={closed:0,onmsg:null,onclose:null};pairs.push({A,B,a:an,b:bn});
const snd=(from,to)=>{let last=0;return m=>{if(from.closed)return;if((an&&cuts[an])||(bn&&cuts[bn])){stat.lost++;return}const js=JSON.stringify(m),b=new TextEncoder().encode(js).length;stat.n++;if(b>stat.max)stat.max=b;if(b>=16300){stat.big++;return}   // wie PeerJS: JSON-Nachrichten ab 16.300 Byte gehen nicht raus (message-too-big)
const d=JSON.parse(js);last=Math.max(last,t+dl());put(()=>{if(!to.closed&&to.onmsg)to.onmsg(d)},last-t)}};
const cls=(from,to)=>()=>{if(from.closed)return;from.closed=1;put(()=>{if(!to.closed){to.closed=1;to.onclose&&to.onclose()}},lat+jit+5)};
A.send=snd(A,B);B.send=snd(B,A);A.buffered=B.buffered=function(){return this.bufAmt|0};A.close=cls(A,B);B.close=cls(B,A);return[A,B]}   // buffered(): Platzhalter fuer den Sendepuffer der Verbindung (Rueckstau-Schutz der Zuschauer), ein Test setzt c.bufAmt (Byte)
function host(code,h,who){rooms[code]=h;owners[code]=who;delete down[code];put(()=>h.onOpen&&h.onOpen(),1);return{close(){delete rooms[code];delete down[code]},reconnect(){const d=down[code];if(d&&!d.hold)signalUp(code)}}}
function join(code,h,who){if(who&&cuts[who]){put(()=>h.onError('network'),1);return{close(){}}}
const r=rooms[code];if(!r){put(()=>h.onError('peer-unavailable'),1);return{close(){}}}
const[A,B]=pair(who,owners[code]);put(()=>{r.onConn(B);h.onOpen(A)},dl());return{close(){A.close()}}}
function signalDown(code,o){const r=rooms[code];if(!r)return false;down[code]={h:r,hold:!!(o&&o.hold)};delete rooms[code];put(()=>r.onDisc&&r.onDisc(),1);return true}
function signalUp(code){const d=down[code];if(!d)return false;delete down[code];rooms[code]=d.h;put(()=>d.h.onRe&&d.h.onRe(),1);return true}
function drop(p){if(p.A.closed&&p.B.closed)return;p.A.closed=p.B.closed=1;put(()=>{p.A.onclose&&p.A.onclose();p.B.onclose&&p.B.onclose()},lat+jit+5)}   // Abriss: beide Seiten bekommen onclose (wie ICE failed oder ein geschlossener Tab)
function cut(name,o){o=o||{};const mine=pairs.filter(p=>(p.a===name||p.b===name)&&!(p.A.closed&&p.B.closed));
if(!o.silent){for(const p of mine)drop(p);return mine.length}
const c=cuts[name]={at:t};for(const p of mine)put(()=>{if(cuts[name]===c)drop(p)},(o.closeAfter==null?30:o.closeAfter)*1000);return mine.length}
function heal(name){const had=!!cuts[name];delete cuts[name];return had}
return{host,join,signalDown,signalUp,cut,heal,as(name){return{host:(c,h)=>host(c,h,name),join:(c,h)=>join(c,h,name)}},
advance(dt){t+=dt*1000;q.sort((a,b)=>a.at-b.at);while(q.length&&q[0].at<=t){q.shift().fn()}},
get pending(){return q.length},stat,get now(){return t},lat:()=>lat,setLat(l,j){lat=l;jit=j||0}}}
function mkInst(net,name,sess){const cv=document.createElement('canvas');cv.width=1920;cv.height=1088;cv.tabIndex=0;cv.dataset.inst=name;document.body.appendChild(cv);cv.style.display='none';
const before=window.__dbgs.length;window.__mkInst({cv,noLoop:true,transport:net.as?net.as(name):net,session:sess});const d=window.__dbgs[before];d.name=name;d.cv=cv;d.CFG.vanLock=0;d.setFocus(true);return d}   // Sperrfrist des Funks aus: die Tests rufen den Wagen sofort (32-fluchtwagen setzt sie wieder)
function step(list,net,dt){for(const d of list)d.tick(dt);net.advance(dt)}
window.LoopNet=LoopNet;window.mkInst=mkInst;window.step=step;
})();
