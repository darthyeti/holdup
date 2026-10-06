// Test-Leitung im Speicher fuer Coop-Tests, ersetzt PeerJS. Nur mit index.html#debug nutzbar.
// Laden: fetch('tools/loopnet.js').then(r=>r.text()).then(eval)
// Zwei Instanzen in einer Seite, Zeit wird von Hand vorgespult (virtuelle Zeit, schnell und deterministisch):
//   const net=LoopNet(40);                       // 40 ms Verzoegerung je Richtung
//   const A=mkInst(net,'a'),B=mkInst(net,'b');   // je ein Spiel mit eigenem Canvas, ohne rAF-Schleife
//   A.hostRoom();net.advance(.05);B.joinRoom(A.NET.code);...
//   for(let i=0;i<60;i++)step([A,B],net,1/60);   // tickt beide Spiele und liefert Nachrichten aus
(function(){
function LoopNet(lat,jit){lat=lat==null?30:lat;jit=jit||0;const q=[],rooms={};let t=0;
const dl=()=>lat+(jit?Math.random()*jit:0);
const put=(fn,d)=>q.push({at:t+d,fn});
function pair(){const A={closed:0,onmsg:null,onclose:null},B={closed:0,onmsg:null,onclose:null};
const snd=(from,to)=>{let last=0;return m=>{if(from.closed)return;const d=JSON.parse(JSON.stringify(m));last=Math.max(last,t+dl());put(()=>{if(!to.closed&&to.onmsg)to.onmsg(d)},last-t)}};
const cls=(from,to)=>()=>{if(from.closed)return;from.closed=1;put(()=>{if(!to.closed){to.closed=1;to.onclose&&to.onclose()}},lat+jit+5)};
A.send=snd(A,B);B.send=snd(B,A);A.close=cls(A,B);B.close=cls(B,A);return[A,B]}
return{
host(code,h){rooms[code]=h;put(()=>h.onOpen&&h.onOpen(),1);return{close(){delete rooms[code]}}},
join(code,h){const r=rooms[code];if(!r){put(()=>h.onError('peer-unavailable'),1);return{close(){}}}
const[A,B]=pair();put(()=>{r.onConn(B);h.onOpen(A)},dl());return{close(){A.close()}}},
advance(dt){t+=dt*1000;q.sort((a,b)=>a.at-b.at);while(q.length&&q[0].at<=t){q.shift().fn()}},
get pending(){return q.length},get now(){return t},lat:()=>lat,setLat(l,j){lat=l;jit=j||0}}}
function mkInst(net,name){const cv=document.createElement('canvas');cv.width=1920;cv.height=1088;cv.tabIndex=0;cv.dataset.inst=name;document.body.appendChild(cv);cv.style.display='none';
const before=window.__dbgs.length;window.__mkInst({cv,noLoop:true,transport:net});const d=window.__dbgs[before];d.name=name;d.cv=cv;d.setFocus(true);return d}
function step(list,net,dt){for(const d of list)d.tick(dt);net.advance(dt)}
window.LoopNet=LoopNet;window.mkInst=mkInst;window.step=step;
})();
