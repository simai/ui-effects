// Text flow (simai.effect 1.1.0; dark scheme only): rows of code or symbols scroll on a dark ground,
// lit by slow folds of light that bend and split; a click in the area sends a wave of light. From the
// Larena sign-in picture by Rim Zabarov / SIMAI.
//
// The text keeps its own hue (the hue setting), drawn over a fixed dark ground. Rows come from a seeded
// generator, so a mount draws the same scene at the defaults; only a click's wave is random. Reduced
// motion draws one still frame; a hidden tab or an area off screen asks for no frames.
const instances = new WeakMap();
const textSources={"javascript": ["const light = await findSomethingBeautiful();", "function breathe(time) { return Math.sin(time * 0.5); }", "const leaves = points.map(point => wind.carry(point));", "if (curiosity) { explore(); }", "const wave = { shape: randomShape(), life: 4 };", "for (const letter of story) { reveal(letter); }", "requestAnimationFrame(() => makeRoomForWonder());", "const answer = 42; // a small secret in the dark", "export const quiet = () => new Promise(resolve => dawn(resolve));", "// sometimes the background has something to say"], "html": ["<!doctype html> <html lang=\"ru\">", "<main class=\"quiet\"> <section> hello, human. </section> </main>", ":root { --light: #74b4d5; --curiosity: 1; }", ".leaf { transform: rotate(var(--wind)); }", "@keyframes breathe { 50% { opacity: 0.42; } }", "<canvas aria-hidden=\"true\"></canvas>", ".wave { animation: grow 4s ease-out; }", "<!-- Ты нашёл маленькую пасхалку. -->", "@media (prefers-reduced-motion: reduce) { .leaf { animation: none; } }", "body { margin: 0; background: #141414; }"], "terminal": ["$ git status --short", "$ npm run build", "✓ build complete   ✓ no errors   ✓ ready for another idea", "$ echo \"hello, human.\"", "$ git log --oneline --max-count=5", "42c0ffe add a little wonder", "$ node explore.js --curiosity=high", "[info] listening for the next small discovery", "$ printf \"keep looking\\n\"", "// not all secrets need a password"], "easter": ["// hello, human. you found the quiet part.", "// Ты нашёл эту строку. Значит, свет был здесь.", "const answer = 42;", "// SIMAI — маленькие детали тоже имеют значение.", "while (curiosity) { explore(); }", "// Здесь могла быть ещё одна хорошая идея."]};

const defaults = {theme:'javascript', fontSize:12, speed:100, light:52, base:5, scale:65, hue:190, clicks:true};
const ranges = {fontSize:[8,18],speed:[0,200],light:[0,100],base:[0,30],scale:[50,200],hue:[0,360]};
function mountTextFlow(host, options={}, still=false) {
 if (!(host instanceof HTMLElement)) throw new TypeError('Text Flow requires an HTMLElement');
 if (instances.has(host)) return instances.get(host);
 const cfg={...defaults};
 function applyOptions(patch){for(const key of Object.keys(ranges)){if(patch[key]!==undefined&&Number.isFinite(Number(patch[key]))){const [min,max]=ranges[key];cfg[key]=Math.max(min,Math.min(max,Number(patch[key])))}}if(patch.theme!==undefined)cfg.theme=['symbols','javascript','html','terminal','easter'].includes(patch.theme)?patch.theme:'symbols';if(patch.clicks!==undefined)cfg.clicks=Boolean(patch.clicks)}
 applyOptions(options);
 const canvas=document.createElement('canvas');canvas.style.cssText='position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none;background:#141414';canvas.setAttribute('aria-hidden','true');host.prepend(canvas);
 const ctx=canvas.getContext('2d'),texture=document.createElement('canvas'),tx=texture.getContext('2d'),lit=document.createElement('canvas'),lx=lit.getContext('2d'),mask=document.createElement('canvas'),mx=mask.getContext('2d');
 let visible=true,width=0,height=0,dpr=0,lineHeight,rows=[],time=0,last=0,lastDraw=0,textureDirty=true,maskData,pulses=[],frame=0,raf=0,destroyed=false,manualPaused=false,textBuilds=0,previousKind=-1;
 const motion=matchMedia('(prefers-reduced-motion: reduce)');
 const alphabet='abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
 let seed=4739;function random(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296}
 function waveRandom(){return Math.random()}
 function rebuildRows(){seed=4739;lineHeight=Math.round(cfg.fontSize*1.6);const count=Math.ceil((width+320)/(cfg.fontSize*.6+1.5)),lines=textSources[cfg.theme];rows=Array.from({length:Math.ceil(height/lineHeight)+1},(_,i)=>{let text;if(cfg.theme==='symbols'||(cfg.theme==='easter'&&i%6!==2))text=Array.from({length:count},()=>alphabet[Math.floor(random()*alphabet.length)]).join('');else{const line=lines[cfg.theme==='easter'?Math.floor(i/6)%lines.length:i%lines.length]+'    ';text=line.repeat(Math.ceil(count/line.length)+1)}return{text,offset:random()*160}});textureDirty=true}
 function resize(){if(destroyed)return;const w=Math.max(1,host.clientWidth),h=Math.max(1,host.clientHeight),ratio=Math.min(devicePixelRatio||1,2);if(w===width&&h===height&&ratio===dpr)return;width=w;height=h;dpr=ratio;canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);texture.width=Math.ceil(width+320);texture.height=height;lit.width=width;lit.height=height;mask.width=Math.ceil(width/9);mask.height=Math.ceil(height/9);maskData=mx.createImageData(mask.width,mask.height);rebuildRows();render()}
const smooth=x=>x*x*(3-2*x),mix=(a,b,t)=>a+(b-a)*t;
function hash(x,y){let n=Math.imul(x,374761393)+Math.imul(y,668265263);n=Math.imul(n^(n>>>13),1274126177);return((n^(n>>>16))>>>0)/4294967295}
function noise(x,y){const ix=Math.floor(x),iy=Math.floor(y),fx=smooth(x-ix),fy=smooth(y-iy);return mix(mix(hash(ix,iy),hash(ix+1,iy),fx),mix(hash(ix,iy+1),hash(ix+1,iy+1),fx),fy)}
function fbm(x,y){return noise(x,y)*.65+noise(x*2.03+19,y*2.03+7)*.25+noise(x*4.07,y*4.07)*.1}
function drawText(context,color){textBuilds++;context.clearRect(0,0,context.canvas.width,context.canvas.height);context.font=cfg.fontSize+'px monospace';context.letterSpacing='1.5px';context.fillStyle=color;rows.forEach((r,i)=>{const tileWidth=context.measureText(r.text).width;const offset=r.offset%tileWidth;context.fillText(r.text,offset-tileWidth,i*lineHeight+cfg.fontSize+2);context.fillText(r.text,offset,i*lineHeight+cfg.fontSize+2)})}
function drawFrame(){
 if(textureDirty){drawText(tx,`hsl(${cfg.hue} 85% 63%)`);textureDirty=false;}
 ctx.fillStyle='#141414';ctx.fillRect(0,0,width,height);ctx.globalAlpha=cfg.base/100;ctx.drawImage(texture,0,0);ctx.globalAlpha=1;
 const mw=mask.width,mh=mask.height,data=maskData,size=300*cfg.scale/100;
 for(let y=0;y<mh;y++)for(let x=0;x<mw;x++){
  const px=x/mw*width,py=y/mh*height,u=px/size,v=py/size;
  // Domain warping makes long folds bend and split, rather than rigid circles.
  const warp=fbm(u*.7+time*.10,v*.7-time*.12);
  const field=fbm(u*.9+warp*2.9-time*.14,v*.58+warp*1.5+time*.08);
  let a=Math.pow(Math.max(0,1-Math.abs(field-.53)/.16),3)*cfg.light/100;
  const k=(y*mw+x)*4;data.data[k]=255;data.data[k+1]=255;data.data[k+2]=255;data.data[k+3]=Math.min(1,a)*255;
 }
 mx.putImageData(data,0,0);
 // Cached alpha contours are composited at mask resolution, never evaluated per pixel.
 mx.save();mx.globalCompositeOperation='lighter';
 for(const p of pulses){const age=frame-p.born,t=Math.min(1,age/p.life),radius=12+age*p.growth;mx.save();mx.translate(p.x/width*mw,p.y/height*mh);mx.scale(mw/width,mh/height);mx.rotate(p.angle);mx.globalAlpha=p.strength*Math.sin(Math.min(1,t*6)*Math.PI/2)*Math.pow(1-t,.75);mx.drawImage(p.mask,-radius,-radius,radius*2,radius*2);mx.restore()}
 mx.restore();
 lx.clearRect(0,0,width,height);lx.globalCompositeOperation='source-over';lx.drawImage(texture,0,0);lx.globalCompositeOperation='destination-in';lx.drawImage(mask,0,0,width,height);lx.globalCompositeOperation='source-over';ctx.drawImage(lit,0,0);
}

function createWaveMask(kind,rng){
 const c=document.createElement('canvas');c.width=c.height=256;const g=c.getContext('2d');
 const path=new Path2D(),phase=rng()*Math.PI*2,lobes=3+Math.floor(rng()*4),bend=.07+rng()*.1;
 for(let i=0;i<=180;i++){const t=i/180*Math.PI*2;let x,y;
  if(kind===0){x=16*Math.pow(Math.sin(t),3)/19;y=-(13*Math.cos(t)-5*Math.cos(2*t)-2*Math.cos(3*t)-Math.cos(4*t))/19}
  else{let r=.72+bend*Math.sin(lobes*t+phase)+.06*Math.cos(2*t-phase);if(kind===2)r=.65+.17*Math.cos(3*t+phase);if(kind===3)r=.72+.07*Math.sin(5*t+phase);x=Math.cos(t)*r*(kind===4?.65:1);y=Math.sin(t)*r*(kind===4?1.12:1)}
  const px=128+x*105,py=128+y*105;i?path.lineTo(px,py):path.moveTo(px,py)
 }path.closePath();g.strokeStyle='white';g.lineJoin='round';g.lineCap='round';
 // Soft band plus bright narrow rim, with weaker inner folds.
 g.filter='blur(3px)';g.globalAlpha=.22;g.lineWidth=20;g.stroke(path);
 g.filter='blur(1px)';g.globalAlpha=.96;g.lineWidth=11;g.stroke(path);
 g.save();g.translate(128,128);g.rotate((rng()-.5)*.6);g.scale(.65,.65);g.translate(-128,-128);g.globalAlpha=.2;g.lineWidth=14;g.stroke(path);g.restore();
 g.filter='none';return c
}

 function render(){if(!destroyed&&maskData)drawFrame()}
 // Frames are asked for only while it moves: paused, hidden or still, the loop ends and wake() starts it again.
 const moving=()=>!destroyed&&!manualPaused&&!still&&!motion.matches&&visible&&!document.hidden&&host.isConnected;
 function tick(now){raf=0;if(!moving())return;const dt=Math.min((now-(last||now))/1000,.06);last=now;frame+=dt;time+=dt*cfg.speed/100;if(now-lastDraw>=1000/30-.5){lastDraw+=(1000/30)*Math.max(1,Math.floor((now-lastDraw+.5)/(1000/30)));pulses=pulses.filter(p=>frame-p.born<p.life);render()}raf=requestAnimationFrame(tick)}
 function wake(){if(raf===0&&moving()){last=0;lastDraw=performance.now();raf=requestAnimationFrame(tick)}}
 function pulse(x=width*.5,y=height*.45){if(destroyed)return;let kind=Math.floor(waveRandom()*5);if(kind===previousKind)kind=(kind+1)%5;previousKind=kind;pulses.push({x,y,born:frame,mask:createWaveMask(kind,waveRandom),kind,life:3.4+waveRandom()*.9,growth:135+waveRandom()*65,angle:kind===0?(waveRandom()-.5)*.35:waveRandom()*Math.PI*2,strength:1.1+waveRandom()*.2});pulses=pulses.slice(-6);if(manualPaused||still||motion.matches)render()}
 // The host takes no pointer events (simai.effect 1.0.0): a click is read from the document, inside the effect's area.
 function click(event){if(!cfg.clicks||!(event.target instanceof Element)||event.target.closest('a,button,input,textarea,select,label,[role="button"],[contenteditable],[data-text-flow-ignore]'))return;const r=canvas.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)return;pulse((event.clientX-r.left)*width/r.width,(event.clientY-r.top)*height/r.height)}
 function visibility(){last=0;lastDraw=performance.now();if(still||motion.matches)render();wake()}
 const observer=new ResizeObserver(resize);observer.observe(host);const screen=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;if(visible)wake()});screen.observe(host);document.addEventListener('pointerdown',click);document.addEventListener('visibilitychange',visibility);window.addEventListener('resize',resize);motion.addEventListener('change',visibility);
 const api={
  update(patch={}){if(destroyed)return;const previous={...cfg};applyOptions(patch);if(cfg.fontSize!==previous.fontSize||cfg.theme!==previous.theme)rebuildRows();if(cfg.hue!==previous.hue)textureDirty=true;render()},
  pause(){manualPaused=true},
  resume(){manualPaused=false;visibility()},
  destroy(){if(destroyed)return;destroyed=true;cancelAnimationFrame(raf);observer.disconnect();screen.disconnect();document.removeEventListener('pointerdown',click);document.removeEventListener('visibilitychange',visibility);window.removeEventListener('resize',resize);motion.removeEventListener('change',visibility);canvas.remove();pulses=[];rows=[];for(const c of [canvas,texture,lit,mask]){c.width=0;c.height=0}instances.delete(host)}
 };instances.set(host,api);resize();wake();return api;
}

// The settings by the catalogue's names: size is the font size, intensity the light of the folds,
// base the text left visible in the dark, interactive the waves on a click.
const options = (settings) => ({theme: settings.theme, fontSize: settings.size, speed: settings.speed, light: settings.intensity,
  base: settings.base, scale: settings.scale, hue: settings.hue, clicks: settings.interactive !== false});

export function mount(host, settings = {}, context = {}) {
  const still = context.reducedMotion === true;
  const flow = mountTextFlow(host, {...options(settings), clicks: settings.interactive !== false && !still}, still);
  return {
    update(next = {}) { flow.update({...options(next), clicks: next.interactive !== false && !still}); },
    pause() { flow.pause(); },
    resume() { flow.resume(); },
    destroy() { flow.destroy(); },
  };
}
