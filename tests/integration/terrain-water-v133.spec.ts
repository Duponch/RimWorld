import { testOutputPath } from '../test-output.ts';
import { expect, test } from '@playwright/test';
import { observeErrors, startPaused } from './helpers';

test('painted water keeps one resident map across pause, LOD and texture toggles',async({playwright})=>{
  test.setTimeout(90_000);
  const browser=await playwright.chromium.launch({channel:'chromium',headless:false,args:[]});
  const page=await browser.newPage({baseURL:'http://127.0.0.1:5173',viewport:{width:1440,height:1000}});
  try {
  const errors=observeErrors(page);
  await page.route('**/src/main.ts*',async route=>{
    const response=await route.fetch();
    await route.fulfill({response,body:`const originalWaterFrame=ColonyRenderer.prototype.frame;
ColonyRenderer.prototype.frame=function(now){window.__waterView=this;return originalWaterFrame.call(this,now);};\n`+await response.text()});
  });
  await startPaused(page);
  await page.waitForFunction(()=>Boolean((window as any).__waterView?.world));
  await page.evaluate(()=>{
    const v=(window as any).__waterView,w=structuredClone(v.world);
    w.resources=[];w.tick=1500;
    w.tiles=w.tiles.map((tile:any,index:number)=>{
      const x=index%w.width,z=Math.floor(index/w.width);
      return x>=10&&x<=22&&z>=10&&z<=22&&!(x>=15&&x<=17&&z>=15&&z<=17)
        ?{terrain:'water'}:{terrain:(x+z)%5===0?'soil':'grass'};
    });
    v.hasTracks=false;v.setWorld(w,true,0);
    v.controls.enableDamping=false;
    v.rig.setMode('orthographic');v.controls.target.set(16,0,16);
    v.camera.zoom=5;v.camera.updateProjectionMatrix();v.controls.update();
  });
  await page.waitForTimeout(500);
  const close=await page.evaluate(()=>{
    const v=(window as any).__waterView;
    return {backend:v.backend,paint:v.terrainPaintTexture.image.width,version:v.terrainPaintTexture.version,
      time:v.paintedWater.time.value,water:v.terrainGroup.children.filter((c:any)=>c.material===v.paintedWater.material).length,
      uv:v.terrainGroup.children.filter((c:any)=>c.material===v.paintedWater.material).every((c:any)=>!!c.geometry.getAttribute('uv'))};
  });
  expect(close.backend).toBe('WebGPU');expect(close.paint).toBe(256);
  expect(close.water).toBeGreaterThan(0);expect(close.uv).toBe(true);
  await page.locator('#viewport canvas').screenshot({path:testOutputPath('artifacts/terrain-water-v133-close.png')});
  await page.waitForTimeout(300);
  const paused=await page.evaluate(()=>{const v=(window as any).__waterView;return {version:v.terrainPaintTexture.version,time:v.paintedWater.time.value};});
  expect(paused).toEqual({version:close.version,time:close.time});
  // V137: the same resident paint must animate when confirmed time advances.
  // Freeze the test's shader clock independently of the paused simulation.
  await page.evaluate(()=>{const water=(window as any).__waterView.paintedWater;water.present=()=>{};water.time.value=0;});
  await page.waitForTimeout(100);
  const still=await page.locator('#viewport canvas').screenshot();
  await page.evaluate(()=>{(window as any).__waterView.paintedWater.time.value=1;});
  await page.waitForTimeout(100);
  const moved=await page.locator('#viewport canvas').screenshot();
  expect(still.equals(moved)).toBe(false);
  expect(await page.evaluate(()=>(window as any).__waterView.terrainPaintTexture.version)).toBe(close.version);
  await page.setViewportSize({width:1440,height:768});
  await page.evaluate(()=>{const v=(window as any).__waterView;v.camera.zoom=.25;v.camera.updateProjectionMatrix();v.controls.update();});
  await page.waitForTimeout(350);
  const distant=await page.evaluate(()=>{
    const v=(window as any).__waterView,water=v.overview.terrain.children.filter((c:any)=>c.material===v.paintedWater.material);
    return {distant:v.overview.group.visible,water:water.length,uv:water.every((c:any)=>!!c.geometry.getAttribute('uv')),
      version:v.terrainPaintTexture.version};
  });
  expect(distant.distant).toBe(true);expect(distant.water).toBeGreaterThan(0);expect(distant.uv).toBe(true);
  expect(distant.version).toBe(close.version);
  await page.locator('#viewport canvas').screenshot({path:testOutputPath('artifacts/terrain-water-v133-distant.png')});
  await page.evaluate(()=>{(window as any).__waterView.setTexturesEnabled(false);});
  const plain=await page.evaluate(()=>{
    const v=(window as any).__waterView,water=v.overview.terrain.children.filter((c:any)=>c.material===v.waterMaterial);
    return {paint:v.terrainPaintTexture.image.width,water:water.length,uv:water.every((c:any)=>!c.geometry.getAttribute('uv'))};
  });
  expect(plain).toEqual({paint:1,water:1,uv:true});
  await page.evaluate(()=>{(window as any).__waterView.setTexturesEnabled(true);});
  const restored=await page.evaluate(()=>{
    const v=(window as any).__waterView,water=v.overview.terrain.children.filter((c:any)=>c.material===v.paintedWater.material);
    return {paint:v.terrainPaintTexture.image.width,water:water.length,uv:water.every((c:any)=>!!c.geometry.getAttribute('uv'))};
  });
  expect(restored).toEqual({paint:256,water:1,uv:true});
  expect(errors).toEqual([]);
  } finally {await browser.close();}
});
