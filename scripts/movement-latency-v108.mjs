import { resolve } from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';

process.env.PLAYWRIGHT_BROWSERS_PATH ??= resolve('.playwright');
const { chromium } = await import('playwright');
mkdirSync('artifacts', { recursive: true });
const probe = `
window.__latency={view:null,records:[],frames:[],intervals:[],previous:null,record:null,lastClick:0};
document.addEventListener('pointerup',e=>{if(e.button===2)window.__latency.lastClick=performance.now();},true);
const latencyCommand=SimulationClient.prototype.command;
SimulationClient.prototype.command=function(command){
 const b=window.__latency;
 if(command.type==='draft-move'){
  const p=b.view.received.world.pawns[0];
  b.record={click:b.lastClick,sent:performance.now(),tick:b.view.received.world.tick,from:{x:p.x,z:p.z},target:command.target};b.records.push(b.record);
 }
 const r=b.record,result=latencyCommand.call(this,command);
 if(command.type==='draft-move')result.then(()=>r.ack=performance.now());return result;
};
const latencyWorld=ColonyRenderer.prototype.setWorld;
ColonyRenderer.prototype.setWorld=function(w,...args){
 const b=window.__latency,r=b.record,p=w.pawns[0];
 if(r&&r.acceptedTick===undefined&&p.draft?.target?.x===r.target.x&&p.draft?.target?.z===r.target.z)r.acceptedTick=w.tick;
 if(r&&!r.authoritative&&p.motion?.start>r.tick){r.authoritative=performance.now();r.start=p.motion.start;r.edge=structuredClone(p.motion);}
 return latencyWorld.call(this,w,...args);
};
const latencyFrame=ColonyRenderer.prototype.frame;
ColonyRenderer.prototype.frame=function(now){
 const b=window.__latency;b.view=this;const start=performance.now(),result=latencyFrame.call(this,now);
 if(this.preparing||!this.world)return result;
 if(b.collect){b.frames.push(performance.now()-start);if(b.previous!==null)b.intervals.push(now-b.previous);b.previous=now;}
 const r=b.record,g=this.pawns.pawnMesh?.geometry;if(!r||!g)return result;
 if(r.visible&&!r.arrived&&r.previous){const delta=this.timeline.tick-r.previous.tick,expected=(now-r.previous.now)*this.received.speed*6/1000;if(expected>0&&delta<expected-.00001)r.starved=(r.starved??0)+1;}
 r.previous={tick:this.timeline.tick,now};
 const a=g.getAttribute('aFrom'),z=g.getAttribute('aTo'),t=g.getAttribute('aTravel'),s=t.getX(0),end=t.getY(0),clock=this.pawns.travelTime.value,alpha=end>s?Math.min(1,Math.max(0,(clock-s)/(end-s))):1;
 const x=a.getX(0)+(z.getX(0)-a.getX(0))*alpha,y=a.getZ(0)+(z.getZ(0)-a.getZ(0))*alpha;
 if(!r.visible&&Math.hypot(x-r.from.x,y-r.from.z)>.003){r.visible=performance.now();r.playhead=this.timeline.tick;r.latest=this.timeline.latest;r.shared=['aFrom','aTo','aTravel'].every(k=>g.getAttribute(k)===this.pawns.cargoMesh.geometry.getAttribute(k)&&g.getAttribute(k)===this.pawns.selectionMesh.geometry.getAttribute(k));}
 if(r.visible&&Math.hypot(x-r.target.x,y-r.target.z)<.001)r.arrived=true;
 return result;
};`;
const stats = values => { const s=[...values].sort((a,b)=>a-b); const q=p=>s.length?+s[Math.min(s.length-1,Math.floor(s.length*p))].toFixed(3):null;return {count:s.length,p50:q(.5),p95:q(.95),max:q(1)}; };
const buffers=(process.env.MOTION_BUFFERS??'4,2,1').split(',').map(Number);
const reports=[],errors=[];
const browser=await chromium.launch({channel:'chromium',headless:false});
try {
 for(const buffer of buffers){
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error'||/GPUValidationError|invalid pipeline/i.test(m.text()))errors.push(m.text());});
  await page.route('**/src/render/MotionTimeline.ts*',async route=>{const response=await route.fetch(),body=await response.text();assert.match(body,/MOTION_BUFFER_TICKS = \d+/);await route.fulfill({response,body:body.replace(/MOTION_BUFFER_TICKS = \d+/,`MOTION_BUFFER_TICKS = ${buffer}`)});});
  await page.route('**/src/main.ts*',async route=>{const response=await route.fetch();await route.fulfill({response,body:probe+await response.text()});});
  await page.goto('http://127.0.0.1:5173/?e2e');
  const fixture=await page.evaluate(async()=>{
   const {equipmentCamp}=await import('/tests/scenarios/equipment.ts');const {serializeWorld,validateWorld}=await import('/src/sim/serialization.ts');
   const w=equipmentCamp(1),p=w.pawns[0];w.piles=[];p.x=13;p.z=16;
   const problems=validateWorld(w);if(problems.length)throw new Error(JSON.stringify(problems));localStorage.setItem('lisiere.save.v1',serializeWorld(w));return {id:p.id,tick:w.tick};
  });
  await page.locator('.front-menu').getByRole('button',{name:/^Charger/}).click();await page.locator('input[name="front-save"][value="lisiere.save.v1"]').check();await page.locator('.front-menu').getByRole('button',{name:'Charger',exact:true}).click();
  await page.waitForFunction(()=>window.__latency.view&&!window.__latency.view.preparing);
  assert.equal(await page.evaluate(()=>window.__lisiere.backend),'WebGPU');
  await page.locator(`[data-pawn="${fixture.id}"]`).click();await page.keyboard.press('r');
  await page.waitForFunction(()=>!!window.__lisiere.world.pawns[0].draft);
  const speedReports=[];
  for(const speed of [1,6]){
   await page.locator(`[data-speed="${speed}"]`).click();await page.waitForTimeout(900);
   await page.evaluate(()=>{const b=window.__latency;b.records=[];b.frames=[];b.intervals=[];b.previous=null;b.collect=true;});
   for(let n=0;n<6;n++){
    const target={x:n%2?13:17,z:16};
    const point=await page.evaluate(t=>{const p=window.__lisiere.projectCell(t.x,t.z),bounds=document.querySelector('#viewport canvas').getBoundingClientRect();return {x:bounds.x+p.x,y:bounds.y+p.y,tag:document.elementFromPoint(bounds.x+p.x,bounds.y+p.y)?.tagName};},target);
    assert.equal(point.tag,'CANVAS');await page.mouse.click(point.x,point.y,{button:'right'});
    await page.waitForFunction(()=>window.__latency.record?.arrived,undefined,{timeout:12000,polling:'raf'});
    await page.waitForTimeout(40+n*13);
   }
   const raw=await page.evaluate(()=>{const b=window.__latency;b.collect=false;return {records:b.records,frames:b.frames,intervals:b.intervals};});
   for(const r of raw.records){assert.ok(r.ack&&r.authoritative&&r.visible&&r.shared);assert.equal(r.start,r.acceptedTick+1);assert.ok(r.playhead<=r.latest);}
   speedReports.push({speed,orders:raw.records.map(r=>({...r,ackMs:r.ack-r.click,logicMs:r.authoritative-r.click,visibleMs:r.visible-r.click,displayMs:r.visible-r.authoritative})),clickToAck:stats(raw.records.map(r=>r.ack-r.click)),clickToLogic:stats(raw.records.map(r=>r.authoritative-r.click)),clickToVisible:stats(raw.records.map(r=>r.visible-r.click)),frameCpu:stats(raw.frames),frameInterval:stats(raw.intervals)});
  }
  reports.push({buffer,speedReports});await page.close();
  writeFileSync('artifacts/movement-latency-v108.json',JSON.stringify({date:new Date().toISOString(),backend:'native WebGPU',reports,errors},null,2)+'\n');
  console.log(JSON.stringify({buffer,speeds:speedReports.map(({speed,clickToAck,clickToLogic,clickToVisible,frameInterval})=>({speed,clickToAck,clickToLogic,clickToVisible,frameInterval}))}));
 }
 assert.deepEqual(errors,[]);
} finally {await browser.close();}
