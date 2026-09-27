import { expect, test } from '@playwright/test';
import { createWorld, stepWorld } from '../../src/sim/engine';
import { addGroundMaterial, refreshStock } from '../../src/sim/materials';
import { serializeWorld, validateWorld } from '../../src/sim/serialization';
import { ACTION_FX } from '../../src/render/ActionVfxLayer';
import { expectWorld, observeErrors, panel, pause, saveKey } from './helpers';

const probe = `
window.__mealView = null;
const frameBeforeMealProbe = ColonyRenderer.prototype.frame;
ColonyRenderer.prototype.frame = function(now) {
  const result = frameBeforeMealProbe.call(this, now);
  if (!this.preparing) window.__mealView = this;
  return result;
};`;

test('V135: real ingestion draws food signs in the resident WebGPU action batch', async ({ playwright }) => {
  test.setTimeout(120_000);
  const initial=createWorld(1351,32,32);
  initial.tiles=initial.tiles.map(()=>({terrain:'grass'}));
  initial.resources=[];initial.piles=[];initial.stockpiles=[];initial.structures=[];
  initial.pawns=initial.pawns.slice(0,1);
  Object.assign(initial.pawns[0]!,{x:13,z:16,hunger:10,rest:100});
  addGroundMaterial(initial,'food',1,{x:14,z:16});refreshStock(initial);
  for(let i=0;i<600&&initial.pawns[0]!.state!=='eating';i++)stepWorld(initial);
  expect(initial.pawns[0]!.need).toMatchObject({kind:'eat',phase:'ingest'});
  expect(validateWorld(initial)).toEqual([]);

  const browser=await playwright.chromium.launch({channel:'chromium',headless:false,args:[]});
  const page=await browser.newPage({baseURL:'http://127.0.0.1:5173',viewport:{width:1440,height:1000}});
  const errors=observeErrors(page);
  try {
    await page.addInitScript(({key,data})=>localStorage.setItem(key,data),{key:saveKey,data:serializeWorld(initial)});
    await page.route('**/src/main.ts*',async route=>{
      const response=await route.fetch();
      await route.fulfill({response,body:probe+await response.text()});
    });
    await page.goto('/?scenario=camp&size=32&e2e');
    await expect(page.locator('#loading')).toHaveCount(0);
    await pause(page);
    await panel(page,'menu');await page.locator('#load').click();await expectWorld(page,initial);
    await page.keyboard.press('Escape');
    await page.waitForFunction(()=>!!(window as any).__mealView);
    const eater=initial.pawns[0]!;
    await page.evaluate(({x,z})=>{
      const view=(window as any).__mealView;
      view.controls.enableDamping=false;
      view.rig.setMode('orthographic');
      view.controls.target.set(x,0,z);
      view.camera.zoom=7;
      view.camera.updateProjectionMatrix();view.controls.update();
    },{x:eater.x,z:eater.z});
    const sample=()=>page.evaluate(()=>{
      const view=(window as any).__mealView;
      const mesh=view.actionVfx.mesh;
      const source=view.pawns.feedbackSource;
      return {backend:view.backend,visible:mesh.visible,count:mesh.geometry.instanceCount,
        kind:mesh.geometry.getAttribute('actionFx').getX(0),
        sharedPose:['aFrom','aTo','aTravel'].every(name=>mesh.geometry.getAttribute(name)===source.getAttribute(name)),
        clock:view.actionVfx.time.value};
    });
    await expect.poll(async()=> (await sample()).kind).toBe(ACTION_FX.eat);
    const first=await sample();
    expect(first).toMatchObject({backend:'WebGPU',visible:true,count:1,kind:ACTION_FX.eat,sharedPose:true});
    await page.waitForTimeout(180);
    expect((await sample()).clock).toBe(first.clock);
    await page.screenshot({path:test.info().outputPath('meal-signs-v135.png')});
    expect(errors).toEqual([]);
  } finally {await browser.close();}
});
