import {writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
process.env.PLAYWRIGHT_BROWSERS_PATH??=resolve('.playwright');
const {chromium}=await import('@playwright/test');
const browser=await chromium.launch({channel:'chromium',headless:false});
const report={protocol:'18 same-scene captures with original/conservative culling and retained GPU commands. Exact hashes plus bounded raster difference: at most 2 of 1440000 pixels, at most 32/255 per channel. Strict mismatch remains reported, never called pixel-identical.',cases:[],errors:[]};
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}});
 page.on('pageerror',e=>report.errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
 await page.route('**/src/main.ts*',async route=>{const response=await route.fetch();await route.fulfill({response,body:`const originalFrame=ColonyRenderer.prototype.frame;ColonyRenderer.prototype.frame=function(t){window.__equivalence=this;return originalFrame.call(this,t);};\n`+await response.text()+"\nwindow.__equivalenceClient=client;"});});
 await page.goto('http://127.0.0.1:5173/?scenario=crashlanded&e2e&size=250&seed=42');
 await page.waitForFunction(()=>window.__equivalence?.world&&!document.querySelector('.game-shell')?.inert,{},{timeout:60000});
 await page.evaluate(async()=>{const v=window.__equivalence;await window.__equivalenceClient.setSpeed(0);v.renderer.setAnimationLoop(null);v.controls.enableDamping=false;window.__originalWorld=structuredClone(v.world);});
 for(const state of ['initial','foliage-hidden','removed','piles','night','restored'])for(const zoom of ['near','middle','far']){
  const captures=await page.evaluate(async({state,zoom})=>{
   const v=window.__equivalence,w=structuredClone(window.__originalWorld);
   if(state==='removed')w.resources=w.resources.filter((r,i)=>i%5!==0);
   if(state==='piles')w.piles=w.piles.filter((p,i)=>p.owner.type!=='ground'||i%3!==0);
   if(state==='night')w.tick+=3000;
   v.applyWorld(w,true);v.setFoliageVisible(state!=='foliage-hidden');
   v.camera.zoom=zoom==='near'?2:zoom==='middle'?.5:v.controls.minZoom;
   v.camera.updateProjectionMatrix();v.controls.update();v.frame(performance.now());
   const take=async(enabled,conservative=enabled)=>{
    v.landscape.isBundleGroup=enabled;v.landscape.refresh(conservative);
    v.renderer.render(v.scene,v.camera);v.renderer.render(v.scene,v.camera);
    await v.renderer.getContext().getConfiguration().device.queue.onSubmittedWorkDone();
    return v.renderer.domElement.toDataURL('image/png');
   };
   const originalCulling=await take(false),plain=await take(false,true),retained=await take(true);
   const images=await Promise.all([plain,retained].map(async url=>{const image=new Image();image.src=url;await image.decode();return image;}));
   const canvas=document.createElement('canvas');canvas.width=images[0].width;canvas.height=images[0].height;
   const context=canvas.getContext('2d',{willReadFrequently:true});
   const values=images.map(image=>{context.clearRect(0,0,canvas.width,canvas.height);context.drawImage(image,0,0);return context.getImageData(0,0,canvas.width,canvas.height).data;});
   let changedPixels=0,maxChannelDifference=0;
   for(let i=0;i<values[0].length;i+=4){let changed=false;for(let c=0;c<4;c++){const d=Math.abs(values[0][i+c]-values[1][i+c]);changed ||= d!==0;maxChannelDifference=Math.max(maxChannelDifference,d);}if(changed)changedPixels++;}
   return {originalCulling,plain,retained,changedPixels,maxChannelDifference};
  },{state,zoom});
  const hash=s=>createHash('sha256').update(Buffer.from(s.split(',')[1],'base64')).digest('hex');
  const a=hash(captures.plain),b=hash(captures.retained);
  report.cases.push({state,zoom,plain:a,retained:b,exact:a===b,originalCulling:hash(captures.originalCulling),originalCullingExact:hash(captures.originalCulling)===a,changedPixels:captures.changedPixels,maxChannelDifference:captures.maxChannelDifference,rasterEquivalent:captures.changedPixels<=2&&captures.maxChannelDifference<=32});
  if(a!==b){await writeFile(`artifacts/landscape-v95-${state}-${zoom}-plain.png`,Buffer.from(captures.plain.split(',')[1],'base64'));await writeFile(`artifacts/landscape-v95-${state}-${zoom}-retained.png`,Buffer.from(captures.retained.split(',')[1],'base64'));}
 }
}finally{await browser.close();await writeFile('artifacts/landscape-equivalence-v95.json',JSON.stringify(report,null,2));}
console.log(JSON.stringify(report));
if(report.errors.length||report.cases.some(c=>!c.rasterEquivalent))process.exitCode=1;
