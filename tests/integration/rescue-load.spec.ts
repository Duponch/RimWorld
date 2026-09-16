import { expect,test } from '@playwright/test';
import { readFileSync,writeFileSync } from 'node:fs';
import { cpus } from 'node:os';
import { rescueCamp } from '../scenarios/rescue';
import { serializeWorld,validateWorld } from '../../src/sim/serialization';
import { expectWorld,observeErrors,panel,saveKey,world } from './helpers';

const probe=`
window.__miningBench={active:false,pipelines:[],frames:[],previous:null,view:null,carriedFrames:0,invalidPoses:0};
const rescueLoadFrame=ColonyRenderer.prototype.frame;
ColonyRenderer.prototype.frame=function(...args){const b=window.__miningBench;b.view=this;const begin=performance.now(),result=rescueLoadFrame.apply(this,args);
if(b.active&&!this.preparing){b.frames.push({cpu:performance.now()-begin,interval:b.previous===null?null:args[0]-b.previous,calls:this.stats.drawCalls});b.previous=args[0];
const g=this.pawns.pawnMesh.geometry,f=g.getAttribute('aFrom'),t=g.getAttribute('aTo'),clock=g.getAttribute('aTravel'),m=g.getAttribute('aMotion');
const index=new Map(this.world.pawns.map((p,i)=>[p.id,i]));this.world.pawns.forEach((p,i)=>{if(p.rescue?.phase==='carry'){b.carriedFrames++;const j=index.get(p.rescue.patientId);if(m.getZ(j)!==6||m.getX(j)!==0||m.getY(j)!==0||f.getX(i)!==f.getX(j)||f.getZ(i)!==f.getZ(j)||f.getW(i)!==f.getW(j)||t.getX(i)!==t.getX(j)||t.getZ(i)!==t.getZ(j)||clock.getX(i)!==clock.getX(j)||clock.getY(i)!==clock.getY(j))b.invalidPoses++;}});
}return result;};
`;
const stats=(v:number[])=>{v.sort((a,b)=>a-b);return {count:v.length,p50:v[Math.floor(v.length*.5)],p95:v[Math.floor(v.length*.95)],p99:v[Math.floor(v.length*.99)],max:v.at(-1)};};
test('native rescue load: 2/30/100 actors, exact carried poses and stable pipelines on a 250² map',async({playwright})=>{
  test.setTimeout(150000);const browser=await playwright.chromium.launch({channel:'chromium',args:[]}),results=[];
  try{
    for(const pairs of [1,15,50]){
      const page=await browser.newPage({baseURL:'http://127.0.0.1:5173',viewport:{width:1440,height:1000}}),errors=observeErrors(page);
      await page.addInitScript({content:readFileSync('scripts/gpu-call-probe.mjs','utf8').replace('export function','function')+'\ninstallGpuCallProbe();'});
      await page.route('**/src/main.ts*',async route=>{const r=await route.fetch();await route.fulfill({response:r,body:probe+await r.text()});});
      const initial=rescueCamp(pairs,250);for(const p of [...initial.pawns,...initial.structures]){p.x+=100;p.z+=100;}
      expect(validateWorld(initial)).toEqual([]);
      await page.addInitScript(({key,data})=>localStorage.setItem(key,data),{key:saveKey,data:serializeWorld(initial)});
      await page.goto('/?e2e&size=250');await expect(page.locator('#loading')).toHaveCount(0);await page.locator('[data-speed="0"]').click();await panel(page,'menu');await page.locator('#load').click();await expectWorld(page,initial);await page.keyboard.press('Escape');
      await page.evaluate(()=>new Promise<void>(resolve=>{let n=90;const f=()=>{if(!--n)resolve();else requestAnimationFrame(f);};requestAnimationFrame(f);}));
      await page.evaluate(()=>{const b=(window as any).__miningBench;b.active=true;b.geometry=b.view.pawns.pawnMesh.geometry;});
      await page.locator('[data-speed="6"]').click();
      await page.waitForFunction(n=>{const b=(window as any).__miningBench;return b.view.world.pawns.filter((p:any)=>p.state==='downed'&&p.need?.kind==='sleep'&&p.need.bedId!==null).length===n;},pairs,{timeout:45000,polling:100});
      await page.locator('[data-speed="0"]').click();
      const b=await page.evaluate(()=>{const b=(window as any).__miningBench;b.active=false;return {frames:b.frames,pipelines:b.pipelines,carriedFrames:b.carriedFrames,invalidPoses:b.invalidPoses,stableGeometry:b.geometry===b.view.pawns.pawnMesh.geometry,adapter:b.view.renderer.getContext().getConfiguration().device.adapterInfo.toJSON?.()??{vendor:b.view.renderer.getContext().getConfiguration().device.adapterInfo.vendor,architecture:b.view.renderer.getContext().getConfiguration().device.adapterInfo.architecture}};});
      const end=await world(page);expect(validateWorld(end)).toEqual([]);expect(b.carriedFrames).toBeGreaterThan(pairs);expect(b.invalidPoses).toBe(0);expect(b.stableGeometry).toBe(true);expect(b.pipelines).toEqual([]);expect(errors).toEqual([]);
      results.push({actors:2*pairs,rescued:pairs,adapter:b.adapter,frames:stats(b.frames.flatMap((f:any)=>f.interval===null?[]:[f.interval])),frameCpu:stats(b.frames.map((f:any)=>f.cpu)),drawCalls:stats(b.frames.map((f:any)=>f.calls)),carriedFrames:b.carriedFrames,invalidPoses:b.invalidPoses,stableGeometry:b.stableGeometry,pipelines:b.pipelines,errors});await page.close();
    }
    writeFileSync('artifacts/rescue-native-v46.json',JSON.stringify({date:new Date().toISOString(),cpu:cpus()[0]?.model,viewport:{width:1440,height:1000},protocol:'Native WebGPU, real worker at 6x, cleared 250², concurrent rescues and live physiology; 90 warmup frames. No claim about forests or full combat.',results},null,2)+'\n');
  }finally{await browser.close();}
});
