const fs=require('fs'),path=require('path');
const W=path.join(__dirname,'../../..');
const { launch, openGame } = require(W+'/tests/lib');
const OUT=process.env.OUT||require('path').join(__dirname,'neu');
const job=require(process.argv[2]);
(async()=>{
  const env=await launch(); const page=await openGame(env,{});
  page.on('pageerror',e=>console.log('ERR',e));
  for(const j of job){
    const r=await page.evaluate(([j])=>{try{
      const D=__dbg; const out={}; const T=32;
      if(!j.keep){D.startGame(); D.sessReset(); D.setScenario(j.sc); D.setSeedMode(j.seed==='classic'?'classic':'random'); D.setLage(j.lage||null); if(j.prep) eval(j.prep); D.buildSeed(j.seed);}
      const H={}; H.run=(sec,f)=>{const g=D.get();for(let i=0;i<sec*30;i++){for(const o of g.players){o.hp=Math.max(o.hp,60)} if(f)f(i); D.update(1/30)}}; H.near=()=>{const g=D.get(),me=g.me;let b=null,bd=1e9;for(const e of g.en){if(e.hp<=0)continue;const d=Math.hypot(e.x-me.x,e.y-me.y);if(d<bd){bd=d;b=e}}return b}; H.aim=(x,y)=>{const c=D.cam();D.mouse.sx=x-c[0];D.mouse.sy=y-c[1];D.mouse.x=x;D.mouse.y=y}; eval(j.code||'');
      D.draw(); D.draw();
      return {ok:1,info:out,img:document.querySelector('canvas').toDataURL('image/png')};
    }catch(e){return {err:String(e.stack)}}},[j]);
    const img=r.img; delete r.img; console.log(j.name, JSON.stringify(r).slice(0,400)); if(img){fs.writeFileSync(path.join(OUT,j.name+'.png'),Buffer.from(img.split(',')[1],'base64'));}
  }
  await Promise.race([env.browser.close(),new Promise(r=>setTimeout(r,4000))]); env.srv.close(); process.exit(0);
})();
