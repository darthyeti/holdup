// Test-Leitung im Speicher fuer Coop-Tests, ersetzt PeerJS. Nur mit index.html#debug nutzbar. net.stat zaehlt Nachrichten (n), die groesste in Byte (max) und die zu grossen (big): Wie PeerJS wirft sie JSON-Nachrichten ab 16.300 Byte weg, ein Test kann big auf 0 pruefen.
// Laden: fetch('tools/loopnet.js').then(r=>r.text()).then(eval)
// Zwei Instanzen in einer Seite, Zeit wird von Hand vorgespult (virtuelle Zeit, schnell und deterministisch):
//   const net=LoopNet(40);                       // 40 ms Verzoegerung je Richtung
//   const A=mkInst(net,'a'),B=mkInst(net,'b');   // je ein Spiel mit eigenem Canvas, ohne rAF-Schleife
//   A.hostRoom();net.advance(.05);B.joinRoom(A.NET.code);...
//   for(let i=0;i<60;i++)step([A,B],net,1/60);   // tickt beide Spiele und liefert Nachrichten aus
(function(){
function LoopNet(lat,jit){lat=lat==null?30:lat;jit=jit||0;const q=[],rooms={},stat={big:0,max:0,n:0};let t=0;
const dl=()=>lat+(jit?Math.random()*jit:0);
const put=(fn,d)=>q.push({at:t+d,fn});
function pair(){const A={closed:0,onmsg:null,onclose:null},B={closed:0,onmsg:null,onclose:null};
const snd=(from,to)=>{let last=0;return m=>{if(from.closed)return;const js=JSON.stringify(m),b=new TextEncoder().encode(js).length;stat.n++;if(b>stat.max)stat.max=b;if(b>=16300){stat.big++;return}   // wie PeerJS: JSON-Nachrichten ab 16.300 Byte gehen nicht raus (message-too-big)
const d=JSON.parse(js);last=Math.max(last,t+dl());put(()=>{if(!to.closed&&to.onmsg)to.onmsg(d)},last-t)}};
const cls=(from,to)=>()=>{if(from.closed)return;from.closed=1;put(()=>{if(!to.closed){to.closed=1;to.onclose&&to.onclose()}},lat+jit+5)};
A.send=snd(A,B);B.send=snd(B,A);A.close=cls(A,B);B.close=cls(B,A);return[A,B]}
return{
host(code,h){rooms[code]=h;put(()=>h.onOpen&&h.onOpen(),1);return{close(){delete rooms[code]}}},
join(code,h){const r=rooms[code];if(!r){put(()=>h.onError('peer-unavailable'),1);return{close(){}}}
const[A,B]=pair();put(()=>{r.onConn(B);h.onOpen(A)},dl());return{close(){A.close()}}},
advance(dt){t+=dt*1000;q.sort((a,b)=>a.at-b.at);while(q.length&&q[0].at<=t){q.shift().fn()}},
get pending(){return q.length},stat,get now(){return t},lat:()=>lat,setLat(l,j){lat=l;jit=j||0}}}
function mkInst(net,name){const cv=document.createElement('canvas');cv.width=1920;cv.height=1088;cv.tabIndex=0;cv.dataset.inst=name;document.body.appendChild(cv);cv.style.display='none';
const before=window.__dbgs.length;window.__mkInst({cv,noLoop:true,transport:net});const d=window.__dbgs[before];d.name=name;d.cv=cv;d.CFG.vanLock=0;d.setFocus(true);return d}   // Sperrfrist des Funks aus: die Tests rufen den Wagen sofort (32-fluchtwagen setzt sie wieder)
function step(list,net,dt){for(const d of list)d.tick(dt);net.advance(dt)}
window.LoopNet=LoopNet;window.mkInst=mkInst;window.step=step;
})();
