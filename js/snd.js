/* Holdup: Ton, aus index.html ausgelagert (Plan Auslagern Schritt 1). Klassisches Skript ohne Bauschritt, wird vor dem Spielkern geladen.
   Liefert den globalen Namen SND (wie vorher im Hauptskript), keine Abhaengigkeit zum Spielkern. */
/* ---- Ton: alles synthetisch (WebAudio), keine Dateien. Ohne Nutzeraktion bleibt ac=null, dann sind alle Aufrufe leer. ---- */
const SND=(()=>{
let ac=null,mg=null,sfx=null,mus=null,nb=null,muted=false,pz=false,lx=0,ly=0,boost=0;const last={};
try{muted=localStorage.getItem('holdup.mute')==='1'}catch(e){}
const vol={mus:1,sfx:1},cl=v=>typeof v==='number'&&isFinite(v)?Math.min(1,Math.max(0,v)):1;
try{const v=JSON.parse(localStorage.getItem('holdup.vol'));if(v){vol.mus=cl(v.mus);vol.sfx=cl(v.sfx)}}catch(e){}
const rl=(k,ms)=>{const n=performance.now();if(n-(last[k]||0)<ms)return false;last[k]=n;return true};
const hz=(base,semi)=>base*Math.pow(2,semi/12);
/* ---- Stellschrauben des Klangs (Ticket #120, docs/studie-grafik-und-ton.md T1 T3 T8). Alle Werte hier, nicht im Code verstreut. ----
   wpn: Schuss je Waffe. th = tiefer Schlag (Sinus, von-nach in Hz, 40 bis 80), td/tg = Dauer/Pegel, cr = Knall (Rauschen, von-nach in Hz), cd/cg = Dauer/Pegel,
   bd = Koerper (Sinus), tl = Hallfahne (Rauschen, Tiefpass von-nach), tld/tlg = Dauer/Pegel. kind: Waffe des Spielers (pistol, smg, rifle) oder Gegnerart (cop, swat, shield, sniper).
   boom: Explosion. lo = Tiefton (von-nach, Dauer, Pegel), rb = Nachgrollen (Tiefpass von-nach, Dauer, Pegel), deb = Truemmerprasseln (Anzahl, Beginn, Spanne, Pegel).
   occ: Daempfung hinter einer Wand (T3). lp = Tiefpass in Hz, g = Pegelfaktor. Die Sichtpruefung (los) laeuft hoechstens bud-mal je win ms, Ergebnisse gelten ttl ms je Kachelpaar. */
const TUNE={
wpn:{pistol:{th:[70,44],td:.09,tg:.85,cr:[2800,320],cd:.11,cg:.8,bd:[190,60],bg:.7,tl:[1500,220],tld:.6,tlg:.3},
smg:{th:[64,42],td:.07,tg:.7,cr:[3400,420],cd:.08,cg:.75,bd:[240,90],bg:.5,tl:[1800,260],tld:.45,tlg:.22},
rifle:{th:[58,40],td:.14,tg:1,cr:[2400,220],cd:.15,cg:.85,bd:[150,48],bg:.85,tl:[1200,160],tld:1,tlg:.4},
cop:'pistol',swat:'rifle',shield:'pistol',sniper:'rifle',grd:'pistol'},
boom:{lo:[52,24,1.3,1.1],rb:[500,70,2.6,.9],deb:[16,.25,1.5,.3]},
occ:{lp:650,g:.45,ttl:300,bud:6,win:100}};
let losFn=null,bw=0,bc=0;const oc=new Map();
/* Wand zwischen Quelle und Hoerer? 1 = ja. Gedrosselt: Ergebnis je Kachelpaar zwischengespeichert, bei vielen Klaengen in einem Bild nur bud neue Pruefungen je win ms (dann gilt der alte Wert oder frei). */
function occl(x,y){if(!losFn)return 0;const O=TUNE.occ,k=(x>>4)+','+(y>>4)+','+(lx>>4)+','+(ly>>4),n=performance.now(),c=oc.get(k);if(c&&n-c.t<O.ttl)return c.v;
if(n-bw>O.win){bw=n;bc=0}if(bc>=O.bud)return c?c.v:0;bc++;let v=0;try{v=losFn(x,y,lx,ly)?0:1}catch(e){}if(oc.size>300)oc.clear();oc.set(k,{t:n,v});return v}
function init(ctx){if(ac)return;try{const A=window.AudioContext||window.webkitAudioContext;ac=ctx||(A?new A():null);if(!ac)return;
const cp=ac.createDynamicsCompressor();cp.threshold.value=-12;cp.knee.value=20;cp.ratio.value=4;cp.attack.value=.005;cp.release.value=.2;const pre=ac.createGain();pre.gain.value=.5;const sh=ac.createWaveShaper(),cv2=new Float32Array(2048);for(let i=0;i<2048;i++)cv2[i]=.95*Math.tanh((i/2047*2-1)*2/.95);sh.curve=cv2;cp.connect(pre);pre.connect(sh);sh.connect(ac.destination);mg=ac.createGain();mg.gain.value=muted?0:1.3;mg.connect(cp);
sfx=ac.createGain();sfx.gain.value=vol.sfx*vol.sfx;sfx.connect(mg);mus=ac.createGain();mus.gain.value=.3*vol.mus*vol.mus;mus.connect(mg);
nb=ac.createBuffer(1,ac.sampleRate*2,ac.sampleRate);const d=nb.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1}catch(e){ac=null}}
let ck=null;const T0=()=>ck!=null?ck:ac.currentTime;
function env(g,t,a,d,pk){g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(Math.max(pk,.0002),t+a);g.gain.exponentialRampToValueAtTime(.0001,t+a+d)}
// Rauschen durch Filter: o={t:Filtertyp,f,f2,q,g,a,dst}
function nz(t,dur,o){const s=ac.createBufferSource();s.buffer=nb;s.loop=true;const f=ac.createBiquadFilter();f.type=o.t||'bandpass';f.frequency.setValueAtTime(o.f||1000,t);if(o.f2)f.frequency.exponentialRampToValueAtTime(o.f2,t+dur);f.Q.value=o.q||.8;
const g=ac.createGain(),a=o.a||.002;env(g,t,a,dur,o.g||.5);s.connect(f);f.connect(g);g.connect(o.dst||sfx);s.start(t,Math.random());s.stop(t+a+dur+.05)}
// Ton: o={w:Wellenform,f,f2,g,a,lp,dst}
function tn(t,dur,o){const os=ac.createOscillator();os.type=o.w||'sine';os.frequency.setValueAtTime(o.f,t);if(o.f2)os.frequency.exponentialRampToValueAtTime(o.f2,t+dur);
const g=ac.createGain(),a=o.a||.003;env(g,t,a,dur,o.g||.3);let n=os;if(o.lp){const f=ac.createBiquadFilter();f.type='lowpass';f.frequency.value=o.lp;os.connect(f);n=f}
n.connect(g);g.connect(o.dst||sfx);os.start(t);os.stop(t+a+dur+.05)}
// Raumklang: Lautstärke nach Abstand zum Spieler, Stereo nach seitlichem Versatz. null = zu leise.
function sp(x,y,vol){if(x==null)return sfx;const dx=x-lx,dy=y-ly;let v=Math.max(0,1-Math.hypot(dx,dy)/650);v=v*v*vol;if(v<.015)return null;
const oc2=occl(x,y);if(oc2)v*=TUNE.occ.g;if(v<.008)return null;
const g=ac.createGain();g.gain.value=v;let o=g;if(oc2){const f=ac.createBiquadFilter();f.type='lowpass';f.frequency.value=TUNE.occ.lp;f.Q.value=.5;g.connect(f);o=f}
if(ac.createStereoPanner){const pn=ac.createStereoPanner();pn.pan.value=Math.max(-1,Math.min(1,dx/380));o.connect(pn);pn.connect(sfx)}else o.connect(sfx);return g}
const click=(t,f,g)=>{nz(t,.025,{t:'highpass',f:2500,g:g||.3});tn(t,.02,{f,f2:f*.6,w:'square',g:.07})};
/* ---- Einzelklänge ---- */
/* Schuss mit Koerper (T1): Knall, tiefer Schlag, Koerper und eine kurze Hallfahne. w = Eintrag aus TUNE.wpn, dst = Ziel (Raumklang) */
const wk0=k=>{let w=TUNE.wpn[k];if(typeof w==='string')w=TUNE.wpn[w];return w||TUNE.wpn.pistol};
function gun(t,w,dst,m){m=m||1;nz(t,w.cd,{f:w.cr[0],f2:w.cr[1],q:.7,g:w.cg*m,dst});tn(t,w.td,{f:w.th[0],f2:w.th[1],g:w.tg*m,dst});tn(t,.1,{f:w.bd[0],f2:w.bd[1],g:w.bg*m,dst});nz(t+.01,w.tld,{t:'lowpass',f:w.tl[0],f2:w.tl[1],g:w.tlg*m,a:.01,dst})}
function shot(kind){if(!ac)return;gun(T0(),wk0(kind))}
function eshot(x,y,k){if(!ac||!rl('es',35))return;const d=sp(x,y,1);if(!d)return;gun(T0(),wk0(k),d,.9)}
function hit(x,y,flesh){if(!ac||!rl('ht',25))return;const d=sp(x,y,.8);if(!d)return;const t=T0();
if(flesh){tn(t,.09,{f:140,f2:60,g:.9,dst:d});nz(t,.08,{t:'lowpass',f:700,g:1.2,dst:d})}else{nz(t,.05,{t:'highpass',f:3500,g:.6,dst:d});tn(t,.03,{f:1800,f2:900,w:'square',g:.07,dst:d})}}
function kill(x,y){if(!ac)return;const d=sp(x,y,.9);if(!d)return;const t=T0();tn(t,.22,{f:95,f2:38,g:.8,dst:d});nz(t,.18,{t:'lowpass',f:500,g:1.2,dst:d})}
function hurt(){if(!ac||!rl('hu',90))return;const t=T0();tn(t,.16,{f:110,f2:48,g:.8});nz(t,.14,{t:'lowpass',f:600,g:1.2})}
function skid(x,y){if(!ac||!rl('sk',250))return;const d=sp(x,y,1);if(!d)return;const t=T0();nz(t,.55,{f:2600,f2:900,q:1.6,g:.3,a:.04,dst:d});tn(t,.3,{f:70,f2:48,w:'sawtooth',g:.14,lp:300,dst:d})}
/* Explosion (T1): langer Tiefton, Knall, Nachgrollen und Truemmerprasseln (kurze Klicks mit Zufall, nach hinten leiser) */
function boom(x,y){if(!ac)return;const d=sp(x,y,1.2);if(!d)return;const t=T0(),B=TUNE.boom;nz(t,.5,{f:1800,f2:160,g:1.1,dst:d});tn(t,B.lo[2],{f:B.lo[0],f2:B.lo[1],g:B.lo[3],a:.006,dst:d});tn(t,.35,{f:90,f2:34,g:.8,dst:d});
nz(t,B.rb[2],{t:'lowpass',f:B.rb[0],f2:B.rb[1],g:B.rb[3],a:.012,dst:d});
for(let i=0;i<B.deb[0];i++){const u=Math.random(),at=t+B.deb[1]+u*B.deb[2];nz(at,.03+Math.random()*.03,{f:1200+Math.random()*3500,q:1.2,g:B.deb[3]*(1-u*.8)*(.5+Math.random()*.5),a:.001,dst:d})}}
function beep(x,y){if(!ac||!rl('bp',120))return;const d=sp(x,y,1);if(!d)return;const t=T0();tn(t,.08,{f:2100,w:'square',g:.45,dst:d})}
function thud(x,y){if(!ac)return;const d=sp(x,y,.9);if(!d)return;const t=T0();nz(t,.12,{t:'lowpass',f:600,f2:200,g:.7,dst:d});tn(t,.09,{f:140,f2:70,g:.6,dst:d});click(t+.12,900,.3);click(t+.24,800,.25)}
function blip(){if(!ac||!rl('vb',160))return;const t=T0();nz(t,.07,{f:2200,f2:700,q:.8,g:.5});tn(t,.06,{f:240,f2:90,g:.55})}
/* Menuetoene (T8): focus (Fokus wechselt), ok (bestaetigen), back (zurueck), buy (Kauf), deny (gesperrt) */
function ui(k){if(!ac)return;if(k==='focus'){if(!rl('uf',40))return;tn(T0(),.03,{f:1900,w:'triangle',g:.05,a:.002});return}const t=T0();
if(k==='ok'){tn(t,.07,{f:740,w:'triangle',g:.12});tn(t+.055,.1,{f:1110,w:'triangle',g:.11})}
else if(k==='back'){tn(t,.07,{f:900,f2:700,w:'triangle',g:.1});tn(t+.05,.09,{f:600,f2:440,w:'triangle',g:.1})}
else if(k==='buy'){tn(t,.09,{f:1568,w:'triangle',g:.16});tn(t+.06,.2,{f:2349,w:'triangle',g:.15});nz(t,.1,{t:'highpass',f:5200,g:.08})}
else if(k==='deny'){tn(t,.09,{f:170,w:'square',g:.2,lp:600});tn(t+.11,.12,{f:130,w:'square',g:.2,lp:600})}}
function reload(){if(!ac)return;const t=T0();click(t,1100);click(t+.38,800,.25)}
function reloaded(){if(!ac)return;const t=T0();click(t,1400);click(t+.09,1000,.35)}
function empty(){if(!ac)return;click(T0(),700,.5)}
function cash(){if(!ac)return;const t=T0();tn(t,.14,{f:1568,w:'triangle',g:.2});tn(t+.07,.22,{f:2093,w:'triangle',g:.18});nz(t,.12,{t:'highpass',f:5000,g:.1});nz(t,.22,{f:2500,q:.4,g:.14,a:.03})}
function pick(k){if(!ac)return;const t=T0();if(k===5){click(t,900,.4);click(t+.08,1200,.35);tn(t,.12,{f:220,f2:150,w:'triangle',g:.2})}else{tn(t,.35,{f:523,f2:784,w:'triangle',g:.2});tn(t+.12,.4,{f:784,f2:1047,w:'sine',g:.14})}}
function step(sneak,u){if(!ac)return;const t=T0();nz(t,.05,{t:'lowpass',f:380+Math.random()*140,g:(sneak?.25:.6)*(1+u*.06),a:.004})}
function alert(){if(!ac||!rl('al',450))return;const t=T0();tn(t,.14,{f:880,f2:1320,w:'triangle',g:.22});tn(t+.1,.14,{f:1320,w:'triangle',g:.18})}
function found(){if(!ac)return;const t=T0();tn(t,.28,{f:1175,g:.12});tn(t+.09,.32,{f:1568,g:.1})}
function radio(){if(!ac)return;const t=T0();tn(t,.07,{f:1500,w:'square',g:.07});tn(t+.13,.07,{f:1500,w:'square',g:.07});nz(t+.22,.25,{f:1800,q:.4,g:.12,a:.01})}
/* Chatzeile von einem Mitspieler: zwei leise Klicktoene. */
function chat(){if(!ac||!rl('chat',120))return;const t=T0();tn(t,.05,{f:1250,w:'triangle',g:.05});tn(t+.06,.06,{f:1700,w:'triangle',g:.04})}
/* Funkspruch (Coop): Tonart help (drei dringende Piepser), quiet (ein weicher), ping (kurzer Anstieg), sonst das Funk-Knacken. soft: leiser fuer den Sender. */
function rad(kind,soft){if(!ac||!rl('rad',150))return;const t=T0(),m=soft?.45:1;
if(kind==='help'){for(let i=0;i<3;i++)tn(t+i*.1,.07,{f:1900,w:'square',g:.08*m});nz(t+.32,.18,{f:1800,q:.4,g:.1*m,a:.01})}
else if(kind==='quiet'){tn(t,.12,{f:820,w:'triangle',g:.07*m});nz(t+.1,.12,{f:1500,q:.4,g:.06*m,a:.01})}
else if(kind==='ping')tn(t,.16,{f:1150,f2:1750,w:'triangle',g:.1*m});
else{tn(t,.07,{f:1500,w:'square',g:.07*m});tn(t+.13,.07,{f:1500,w:'square',g:.07*m});nz(t+.22,.25,{f:1800,q:.4,g:.12*m,a:.01})}}
function ev(n){if(!ac)return;const t=T0();
if(n==='vault'){tn(t,.55,{f:70,f2:34,g:.85});nz(t,.4,{t:'lowpass',f:500,g:.5});tn(t+.1,.4,{f:240,f2:200,w:'square',g:.09})}
else if(n==='crash'){nz(t,.35,{f:1800,f2:300,g:.8});tn(t,.22,{f:110,f2:50,g:.7})}
else if(n==='cam'){tn(t,.25,{f:2000,f2:200,w:'sawtooth',g:.14});nz(t,.2,{t:'highpass',f:3000,g:.3})}
else if(n==='paper'){nz(t,.28,{f:4000,q:.5,g:.3,a:.05})}
else if(n==='monitor'){tn(t,.09,{f:1200,w:'square',g:.06});tn(t+.12,.09,{f:1600,w:'square',g:.06});tn(t+.24,.14,{f:2000,w:'square',g:.06})}
else if(n==='power'){tn(t,.9,{f:300,f2:40,w:'sawtooth',g:.22,lp:900});tn(t,.3,{f:80,f2:45,g:.6})}
else if(n==='deny'){tn(t,.2,{f:150,w:'square',g:.3,lp:600})}
else if(n==='latch'){click(t,800,.5);click(t+.1,520,.35)}
else if(n==='till'){click(t,1000,.4);tn(t+.06,.5,{f:2400,g:.09})}
else if(n==='atm'){nz(t,.4,{f:1500,f2:400,g:.6});tn(t,.3,{f:900,f2:200,w:'square',g:.1});tn(t+.2,.2,{f:2800,g:.08})}
else if(n==='start'){tn(t,.5,{f:196,f2:392,w:'triangle',g:.18});tn(t+.12,.6,{f:294,f2:588,w:'triangle',g:.12})}}
function alarm(forced){if(!ac)return;const t=T0();for(let i=0;i<(forced?14:9);i++)tn(t+i*.17,.15,{f:i%2?1040:880,w:'triangle',g:.2});if(forced)nz(t,.4,{t:'lowpass',f:500,g:.3});tn(t,.5,{f:90,f2:60,g:.5})}
function wave(ns){if(!ac)return;boost=7;const t=T0();nz(t,.5,{f:1500,q:.5,g:.22,a:.02});tn(t+.05,.2,{f:900,w:'square',g:.04});if(ns)tn(t,.7,{f:70,f2:52,w:'sawtooth',g:.22,lp:300})}
function van(){if(!ac)return;const t=T0();tn(t,1,{f:62,f2:42,w:'sawtooth',g:.3,lp:260});nz(t+.4,.55,{f:3000,f2:1400,q:5,g:.06});tn(t+1,.15,{f:420,w:'square',g:.12,lp:900});tn(t+1.22,.3,{f:420,w:'square',g:.12,lp:900})}
function end(win){if(!ac)return;const t=T0();mOn=0;
if(win){[523,659,784,1047].forEach((f,i)=>tn(t+i*.13,.5,{f,w:'triangle',g:.22,dst:sfx}));tn(t+.5,1.2,{f:1047,w:'triangle',g:.12});tn(t+.5,1.2,{f:784,w:'triangle',g:.1})}
else{[440,349,294,220].forEach((f,i)=>tn(t+i*.28,.7,{f,w:'sawtooth',g:.14,lp:700}));tn(t+.9,1.6,{f:55,g:.5})}}
function gthrow(x,y){if(!ac)return;const d=sp(x,y,1);if(!d)return;const t=T0();click(t,1500,.4);nz(t+.03,.28,{f:900,f2:300,q:.6,g:.25,a:.05,dst:d})}
function bang(x,y){if(!ac)return;const d=sp(x,y,1.3);if(!d)return;const t=T0();nz(t,.2,{t:'highpass',f:2500,g:1.2,dst:d});tn(t,.14,{f:320,f2:80,g:1,dst:d});nz(t,.6,{f:3200,f2:800,q:.4,g:.5,a:.002,dst:d})}
function hiss(x,y){if(!ac)return;const d=sp(x,y,1);if(!d)return;const t=T0();nz(t,1.5,{f:5200,f2:2400,q:.5,g:.4,a:.06,dst:d});tn(t,.14,{f:210,f2:120,g:.45,dst:d})}
function ring(dur){if(!ac||!rl('rg',300))return;const t=T0(),d=Math.min(5,Math.max(.8,dur||2));tn(t,d,{f:3900,g:.1,a:.04});tn(t,d*.8,{f:4350,g:.05,a:.04});nz(t,.3,{t:'lowpass',f:500,g:.5})}
function cough(){if(!ac||!rl('cg',350))return;const t=T0();nz(t,.1,{f:650,f2:300,q:2,g:.55});nz(t+.15,.12,{f:600,f2:280,q:2,g:.5});tn(t,.1,{f:150,f2:90,g:.3})}
function snshot(x,y){if(!ac)return;const d=sp(x,y,1.4);if(!d)return;const t=T0();nz(t,.16,{t:'highpass',f:1800,g:1,dst:d});tn(t,.2,{f:140,f2:40,g:1.1,dst:d});nz(t,1.2,{t:'lowpass',f:700,f2:120,g:.55,a:.01,dst:d})}
function snlock(){if(!ac||!rl('sl',700))return;const t=T0();tn(t,.12,{f:1500,f2:1900,w:'square',g:.14});tn(t+.18,.12,{f:1900,f2:2300,w:'square',g:.14})}
function glass(x,y){if(!ac)return;const d=sp(x,y,1.1);if(!d)return;const t=T0();nz(t,.3,{t:'highpass',f:3500,g:.9,dst:d});for(let i=0;i<5;i++)tn(t+i*.04+Math.random()*.03,.12,{f:2600+Math.random()*2400,f2:1800,w:'triangle',g:.12,dst:d})}
/* ---- Dauerklänge ---- */
let wk=null,wt=0;
function work(kind,dt){if(!ac)return;
if(kind!=='drill'&&wk){const w=wk;wk=null;w.g.gain.setTargetAtTime(0,T0(),.04);setTimeout(()=>{try{w.n.forEach(n=>n.stop())}catch(e){}},400)}
if(!kind)return;
if(kind==='drill'){if(wk)return;const o=ac.createOscillator(),lf=ac.createOscillator(),lg=ac.createGain(),f=ac.createBiquadFilter(),g=ac.createGain(),s=ac.createBufferSource(),nf=ac.createBiquadFilter(),ng=ac.createGain();
o.type='sawtooth';o.frequency.value=84;lf.type='square';lf.frequency.value=15;lg.gain.value=.05;f.type='lowpass';f.frequency.value=1100;g.gain.value=.08;s.buffer=nb;s.loop=true;nf.type='bandpass';nf.frequency.value=2600;nf.Q.value=3;ng.gain.value=.35;
lf.connect(lg);lg.connect(g.gain);o.connect(f);f.connect(g);s.connect(nf);nf.connect(ng);ng.connect(g);g.connect(sfx);o.start();lf.start();s.start();wk={g,n:[o,lf,s]};return}
wt-=dt;if(wt>0)return;const t=T0();
if(kind==='beep'){wt=.35;tn(t,.07,{f:1900,w:'square',g:.07})}
else if(kind==='pry'){wt=.2+Math.random()*.1;nz(t,.09,{f:900+Math.random()*300,f2:400,q:3,g:.3});tn(t,.05,{f:300,f2:200,w:'square',g:.05})}
else{wt=.13+Math.random()*.08;nz(t,.03,{t:'highpass',f:3000,g:.22});tn(t,.03,{f:1200+Math.random()*400,w:'square',g:.04})}}
let dr=null;
function drone(on,sus){if(!ac)return;const t=T0();
if(on&&!dr){const o=[0,0,0].map(()=>ac.createOscillator()),lfo=ac.createOscillator(),lg=ac.createGain(),f=ac.createBiquadFilter(),g=ac.createGain();o[0].type=o[1].type='sawtooth';o[0].frequency.value=55;o[1].frequency.value=55.35;o[2].frequency.value=82.4;
f.type='lowpass';f.frequency.value=360;g.gain.value=0;lfo.frequency.value=.07;lg.gain.value=140;lfo.connect(lg);lg.connect(f.frequency);o.forEach(x=>{x.connect(f);x.start()});lfo.start();f.connect(g);g.connect(mus);dr={o:o.concat(lfo),f,g}}
if(!dr)return;dr.g.gain.setTargetAtTime(on?.14:0,t,on?1.5:.5);if(on)dr.f.frequency.setTargetAtTime(360+sus*4,t,.3);
if(!on){const d=dr;dr=null;setTimeout(()=>{try{d.o.forEach(x=>x.stop())}catch(e){}},3000)}}
let tz=null;
function tension(sus){if(!ac)return;const t=T0();if(!tz){if(sus<2)return;const o=ac.createOscillator(),lf=ac.createOscillator(),lg=ac.createGain(),g=ac.createGain();o.type='triangle';o.frequency.value=200;lf.frequency.value=3;lg.gain.value=.5;g.gain.value=0;
const m=ac.createGain();m.gain.value=.5;lf.connect(lg);lg.connect(m.gain);o.connect(m);m.connect(g);g.connect(mus);o.start();lf.start();tz={o,lf,g}}
tz.g.gain.setTargetAtTime(sus<2?0:Math.min(.16,sus/100*.2),t,.2);tz.o.frequency.setTargetAtTime(200+sus*2.6,t,.2);tz.lf.frequency.setTargetAtTime(2.5+sus/9,t,.2)}
let sr=null,sNext=0,sIdx=0;
function siren(lvl){if(!ac)return;const t=T0();
if(!sr){if(lvl<=0)return;const o=ac.createOscillator(),f=ac.createBiquadFilter(),g=ac.createGain();o.type='square';o.frequency.value=435;f.type='lowpass';f.frequency.value=1700;g.gain.value=0;o.connect(f);f.connect(g);g.connect(sfx);o.start();sr={o,g};sNext=t}
sr.g.gain.setTargetAtTime(lvl,t,.4);while(sNext<t+1){sr.o.frequency.setValueAtTime(sIdx%2?580:435,sNext);sNext+=.56;sIdx++}}
/* ---- Musik im Überfall: Schrittsequenzer, 16tel, wird mit den Wellen dichter ---- */
const BASS=[0,null,0,null,0,0,null,3,null,0,null,-2,null,0,7,null],ARP=[0,3,7,10,12,10,7,3];
let mOn=0,mStep=0,mNext=0;
function seq(s,t,lvl,sd){
if(s%4===0)tn(t,.14,{f:130,f2:42,g:.55,dst:mus});
const b=BASS[s];if(b!=null)tn(t,sd*1.7,{f:hz(55,b),w:'sawtooth',g:.28,lp:420,a:.005,dst:mus});
if(s===0){[0,3,7].forEach(n=>tn(t,sd*15,{f:hz(110,n),w:'sawtooth',g:.05,lp:600,a:.3,dst:mus}))}
if(lvl>=1&&s%4===2)nz(t,.04,{t:'highpass',f:7500,g:.1,dst:mus});
if(lvl>=3&&s%2===1)nz(t,.03,{t:'highpass',f:8500,g:.045,dst:mus});
if(lvl>=2&&(s===4||s===12)){nz(t,.14,{f:1900,q:.7,g:.28,dst:mus});tn(t,.1,{f:200,f2:120,g:.2,dst:mus})}
if(lvl>=3&&s%2===0)tn(t,sd*1.6,{f:hz(220,ARP[(s/2)%8]),w:'triangle',g:.1,lp:2500,dst:mus})}
function heist(s,dt){const t=T0(),lvl=s.wave>=4?3:s.wave>=2?2:s.wave>=1?1:0,bpm=Math.min(156,112+Math.min(s.wave,6)*6+(s.van?8:0)),sd=60/bpm/4;
if(!mOn){mOn=1;mStep=0;mNext=t+.1}while(mNext<t+.2){seq(mStep%16,mNext,lvl,sd);mStep++;mNext+=sd}}
function frame(dt,s){if(!ac||pz)return;boost=Math.max(0,boost-dt);
drone(s.mode===1,s.sus||0);tension(s.mode===1?(s.sus||0):0);
siren(s.mode===2&&s.police?(boost>0?.07:.03)*(s.sd==null?1:Math.max(.35,Math.min(1.2,1.25-s.sd/800))):0);
if(s.mode===2)heist(s,dt);else mOn=0}
function pause(b){if(!ac||b===pz)return;pz=b;try{const r=b?ac.suspend():ac.resume();if(r&&r.catch)r.catch(()=>{})}catch(e){}}
function resume(){if(ac&&ac.state==='suspended'&&!pz)try{const r=ac.resume();if(r&&r.catch)r.catch(()=>{})}catch(e){}}
function applyVol(){if(!ac)return;const t=ac.currentTime;if(sfx)sfx.gain.setTargetAtTime(vol.sfx*vol.sfx,t,.03);if(mus)mus.gain.setTargetAtTime(.3*vol.mus*vol.mus,t,.03)}
function setVol(k,v){if(k!=='mus'&&k!=='sfx')return;vol[k]=Math.round(cl(v)*20)/20;applyVol();try{localStorage.setItem('holdup.vol',JSON.stringify(vol))}catch(e){}}
function toggleMute(){muted=!muted;try{localStorage.setItem('holdup.mute',muted?'1':'0')}catch(e){}if(mg)mg.gain.setTargetAtTime(muted?0:1.3,T0(),.05);return muted}
return{ui,tune:TUNE,setLos:f=>{losFn=typeof f==='function'?f:null;oc.clear()},_occ:occl,init,resume,pause,frame,toggleMute,isMuted:()=>muted,vol:k=>vol[k],setVol,blip,skid,_gains:()=>({sfx:sfx&&sfx.gain.value,mus:mus&&mus.gain.value}),on:()=>!!ac,listen:(x,y)=>{lx=x;ly=y},
shot,eshot,boom,beep,thud,hit,kill,hurt,reload,reloaded,empty,cash,pick,step,alert,found,radio,rad,chat,ev,alarm,wave,van,end,work,snshot,snlock,glass,gthrow,bang,hiss,ring,cough,_seq:seq,_ctx:()=>ac,_clock:v=>{ck=v},_reinit:c=>{ac=null;oc.clear();bw=bc=0;dr=tz=sr=wk=null;mOn=0;sNext=0;sIdx=0;boost=0;pz=false;init(c)}}})();
