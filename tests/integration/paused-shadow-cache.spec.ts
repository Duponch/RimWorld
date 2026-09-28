import { readFileSync } from 'node:fs';
import { expect,test } from '@playwright/test';
import { decodeStoredSave } from '../../src/ui/save-storage-codec.ts';

test.skip(!process.env.SHADOW_CACHE_BROWSER,'Native shadow-cache benchmark is opt-in.');

test('paused shadows reuse one atlas and camera motion refreshes it',async({playwright})=>{
  test.setTimeout(180_000);
  const browser=await playwright.chromium.launch({channel:'chromium',headless:false,args:[]});
  const page=await browser.newPage({baseURL:process.env.SHADOW_CACHE_BASE_URL??'http://127.0.0.1:5173',viewport:{width:1440,height:900},deviceScaleFactor:1});
  const errors:string[]=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
  const prefix=`
window.__shadowProbe={view:null,client:null,active:false,frames:[],passes:0,moving:false,force:false};
const shadowProbe=window.__shadowProbe;
const oldShadowFrame=ColonyRenderer.prototype.frame;
ColonyRenderer.prototype.frame=function(now){
  shadowProbe.view=this;
  if(shadowProbe.moving&&this.world){this.camera.position.x+=.025;this.controls.target.x+=.025;}
  const start=performance.now();
  const result=oldShadowFrame.call(this,now);
  if(shadowProbe.active)shadowProbe.frames.push(performance.now()-start);
  return result;
};
`;
  await page.route('**/src/main.ts*',async route=>{
    const response=await route.fetch();
    await route.fulfill({response,body:prefix+await response.text()+'\nshadowProbe.client=client;\n'});
  });
  try {
    await page.goto('/?scenario=camp&e2e&size=32&seed=42');
    await page.addStyleTag({content:'#fps-counter{visibility:hidden!important}'});
    await page.waitForFunction(()=>(window as any).__shadowProbe?.view?.world&&!document.querySelector<HTMLElement>('.game-shell')?.inert);
    const raw=await decodeStoredSave(readFileSync('public/test-saves/v98/mixed-100.json','utf8'));
    await page.evaluate(value=>(window as any).__shadowProbe.client.load(value),raw);
    await page.evaluate(()=>(window as any).__shadowProbe.client.setSpeed(0));
    await page.waitForFunction(()=>(window as any).__shadowProbe.view.world?.width===250);
    const backend=await page.evaluate(()=>((window as any).__shadowProbe.view.backend));
    expect(backend).toBe('WebGPU');
    await page.evaluate(()=>{
      const probe=(window as any).__shadowProbe,view=probe.view,render=view.renderer.render;
      view.renderer.render=function(scene:unknown,camera:unknown){
        if(camera===view.daylight.light.shadow.camera)probe.passes++;
        return render.call(this,scene,camera);
      };
      const canReuse=view.pausedShadow.canReuse.bind(view.pausedShadow);
      view.pausedShadow.canReuse=(...args:unknown[])=>!probe.force&&canReuse(...args);
      view.focusPawn(view.world.pawns[0].id);
    });
    const sample=async(force:boolean,moving:boolean)=>{
      await page.evaluate(({force,moving})=>{
        const probe=(window as any).__shadowProbe;
        probe.force=force;probe.moving=moving;probe.view.invalidatePausedShadow();
      },{force,moving});
      await page.waitForTimeout(500);
      await page.evaluate(()=>{const probe=(window as any).__shadowProbe;probe.frames=[];probe.passes=0;probe.active=true;});
      await page.waitForFunction(()=>(window as any).__shadowProbe.frames.length>=90);
      return page.evaluate(()=>{
        const probe=(window as any).__shadowProbe;probe.active=false;
        const sorted=[...probe.frames].sort((a,b)=>a-b);
        return {frames:sorted.length,passes:probe.passes,medianCpuMs:sorted[Math.floor(sorted.length/2)],p95CpuMs:sorted[Math.floor(sorted.length*.95)]};
      });
    };
    const cached=await sample(false,false);
    const uncached=await sample(true,false);
    const movingCached=await sample(false,true);
    const movingUncached=await sample(true,true);
    await page.evaluate(()=>{const probe=(window as any).__shadowProbe;probe.moving=false;probe.force=false;probe.view.invalidatePausedShadow();});
    await page.waitForTimeout(500);
    const canvas=page.locator('[data-testid="world-canvas"]');
    const pixelsCached=await canvas.screenshot();
    await page.evaluate(()=>{const probe=(window as any).__shadowProbe;probe.force=true;probe.view.invalidatePausedShadow();});
    await page.waitForTimeout(300);
    const pixelsRefreshed=await canvas.screenshot();
    console.log(JSON.stringify({backend,cached,uncached,movingCached,movingUncached,pixelsEqual:pixelsCached.equals(pixelsRefreshed),errors}));
    expect(pixelsCached.equals(pixelsRefreshed)).toBe(true);
    expect(cached.passes).toBeLessThan(3);
    expect(uncached.passes).toBeGreaterThan(50);
    expect(movingCached.passes).toBeGreaterThan(50);
    expect(movingUncached.passes).toBeGreaterThan(50);
    expect(errors).toEqual([]);
  }finally{await browser.close();}
});
