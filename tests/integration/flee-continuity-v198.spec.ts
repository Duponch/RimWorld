import { expect,test } from '@playwright/test';
import { fleeContinuityCamp } from '../scenarios/flee-continuity-v198.ts';
import { serializeWorld,validateWorld } from '../../src/sim/serialization.ts';
import { writeTestFileSync,testOutputPath } from '../test-output.ts';
import { expectWorld,observeErrors,panel,pause,saveKey,world } from './helpers.ts';
import { revealCells } from './player-actions.ts';

type Frame={phase:number;tick:number;x:number;z:number;alpha:number;until:number;start:number;end:number;visible:boolean};
const probe=`window.__fleeV198={active:false,phase:0,samples:[],overflow:false};
const fleeFrameV198=ColonyRenderer.prototype.frame;
ColonyRenderer.prototype.frame=function(now){const result=fleeFrameV198.call(this,now),b=window.__fleeV198;
if(!b.active||this.preparing||!this.world)return result;
const i=this.world.pawns.findIndex(p=>p.id===b.id);if(i<0)return result;
const p=this.world.pawns[i],g=this.pawns.pawnMesh.geometry,f=g.getAttribute('aFrom'),t=g.getAttribute('aTo'),travel=g.getAttribute('aTravel');
const start=travel.getX(i),end=travel.getY(i),alpha=end>start?Math.min(1,Math.max(0,(this.pawns.travelTime.value-start)/(end-start))):this.pawns.blend.value;
const point=this.screenPawns().find(p=>p.id===b.id),visible=!!point&&document.elementFromPoint(point.x,point.y)===this.renderer.domElement;
const sample={phase:b.phase,tick:this.timeline.tick,x:f.getX(i)+(t.getX(i)-f.getX(i))*alpha,z:f.getZ(i)+(t.getZ(i)-f.getZ(i))*alpha,alpha,until:p.flee?.until??-1,start,end,visible};
if(b.samples.length<16000)b.samples.push(sample);else b.overflow=true;return result;};`;
function continuity(samples:Frame[]){
  let idleStart:number|undefined,maximum=0,moving=0,refuges=0;
  for(let i=1;i<samples.length;i++){
    const a=samples[i-1]!,b=samples[i]!;
    if(a.phase!==b.phase||a.until!==0||b.until!==0){idleStart=undefined;if(a.until>0&&b.until===0)refuges++;continue;}
    if(b.tick<=a.tick)continue;
    if(Math.hypot(b.x-a.x,b.z-a.z)>.001){moving++;idleStart=undefined;}
    else {idleStart??=a.tick;maximum=Math.max(maximum,b.tick-idleStart);}
  }
  return {maximumIntraRouteIdleClock:maximum,movingIntervals:moving,refugeRenewals:refuges,visibleFraction:samples.filter(s=>s.visible).length/samples.length};
}
test('V198 native civilian flee remains continuous within routes at 1×/6×, including save and resume',async({playwright})=>{
  test.setTimeout(89_000);
  const browser=await playwright.chromium.launch({channel:'chromium',args:[]});
  const page=await browser.newPage({baseURL:'http://127.0.0.1:5173',viewport:{width:1440,height:1000}}),errors=observeErrors(page),reports:unknown[]=[];
  const report=()=>writeTestFileSync('artifacts/flee-continuity-v198-native.json',JSON.stringify({prepared:true,backend:'native WebGPU',idleClockBudget:1.25,reports,errors},null,2)+'\n');
  try {
    await page.route('**/src/main.ts*',async route=>{const response=await route.fetch();await route.fulfill({response,body:probe+await response.text()});});
    await page.goto('/?scenario=camp&e2e&size=32');await expect(page.locator('#loading')).toHaveCount(0);await pause(page);
    expect(await page.evaluate(()=>window.__lisiere.backend)).toBe('WebGPU');
    await panel(page,'menu');await page.locator('#save').click();await page.keyboard.press('Escape');
    for(const speed of [1,6]){
      const {w:initial,target,chaser}=fleeContinuityCamp(speed===6),duration=speed===6?240:140;
      await page.evaluate(({key,data})=>window.__lisiere.saveRepository.setItem(key,data),{key:saveKey,data:serializeWorld(initial)});
      await panel(page,'menu');await page.locator('#load').click();await expectWorld(page,initial);await page.keyboard.press('Escape');
      // Keep the whole prepared runway in view, rather than only its origin.
      await revealCells(page,[chaser,{x:79,z:48}]);
      await page.evaluate(id=>Object.assign((window as any).__fleeV198,{active:true,phase:0,id,samples:[],overflow:false}),target.id);
      await page.locator(`[data-speed="${speed}"]`).click();
      await page.waitForFunction(tick=>{const b=(window as any).__fleeV198,s=b.samples.at(-1);return s?.tick>=tick&&s.alpha>.1&&s.alpha<.9;},initial.tick+8,{polling:'raf',timeout:8_000});
      await pause(page);const checkpoint=await world(page);await page.evaluate(()=>(window as any).__fleeV198.active=false);
      await panel(page,'menu');await page.locator('#save').click();await page.locator('#load').click();await expectWorld(page,checkpoint);await page.keyboard.press('Escape');
      await page.evaluate(()=>Object.assign((window as any).__fleeV198,{active:true,phase:1}));await page.locator(`[data-speed="${speed}"]`).click();
      await page.waitForFunction(tick=>{const b=(window as any).__fleeV198;return b.overflow||b.samples.at(-1)?.tick>=tick;},initial.tick+duration,{polling:'raf',timeout:27_000});
      await pause(page);const end=await world(page),captured:{samples:Frame[];overflow:boolean}=await page.evaluate(()=>{const b=(window as any).__fleeV198;b.active=false;return {samples:b.samples,overflow:b.overflow};}),metrics=continuity(captured.samples);
      reports.push({speed,checkpointTick:checkpoint.tick,endTick:end.tick,metrics,captured});report();
      writeTestFileSync(`artifacts/flee-continuity-v198-${speed}x-checkpoint.json`,serializeWorld(checkpoint));
      expect(validateWorld(end)).toEqual([]);expect(end.pawns.find(p=>p.id===target.id)!.flee).toBeDefined();
      expect(end.pawns.find(p=>p.id===chaser.id)!.lastAttack).toBeUndefined();expect(captured.overflow).toBe(false);
      expect(metrics.refugeRenewals).toBeGreaterThanOrEqual(2);expect(metrics.movingIntervals).toBeGreaterThan(20);expect(metrics.maximumIntraRouteIdleClock).toBeLessThanOrEqual(1.25);expect(metrics.visibleFraction).toBeGreaterThanOrEqual(.98);
      await page.screenshot({path:testOutputPath(`artifacts/flee-continuity-v198-${speed}x.png`)});
    }
    expect(errors).toEqual([]);
  } catch(error){
    const captured=await page.evaluate(()=>(window as any).__fleeV198).catch(()=>null),checkpoint=await world(page).catch(()=>null);
    reports.push({error:String(error),captured});
    if(checkpoint)writeTestFileSync('artifacts/flee-continuity-v198-failed-checkpoint.json',serializeWorld(checkpoint));
    report();throw error;
  } finally {report();await browser.close();}
});
