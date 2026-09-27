import {test,expect} from '@playwright/test';
import {serializeWorld,validateWorld} from '../../src/sim/index';
import {addMaterial,refreshStock} from '../../src/sim/materials';
import {medicalCamp} from '../scenarios/health';
import {cell,expectWorld,observeErrors,panel,saveKey} from './helpers';
import {revealCells} from './player-actions';

test('loose composite piles align with their selected ground cells in WebGPU',async({playwright})=>{
  test.setTimeout(90_000);
  const world=medicalCamp(),spots=[
    {x:14,z:19,kind:'wood' as const,item:'wood' as const,quantity:75},
    {x:16,z:19,kind:'food' as const,item:'simple-meal' as const,quantity:5},
    {x:18,z:19,kind:'blocks' as const,item:'granite-blocks' as const,quantity:45},
    {x:14,z:21,kind:'apparel' as const,item:'cloth-shirt' as const,quantity:1},
    {x:16,z:21,kind:'weapon' as const,item:'bolt-action-rifle' as const,quantity:1},
    {x:18,z:21,kind:'chunk' as const,item:'granite-chunk' as const,quantity:1},
  ];
  for(const spot of spots)addMaterial(world,spot.kind,spot.quantity,{type:'ground',x:spot.x,z:spot.z},spot.item);
  refreshStock(world);expect(validateWorld(world)).toEqual([]);
  const browser=await playwright.chromium.launch({channel:'chromium',args:[]});
  const page=await browser.newPage({baseURL:'http://127.0.0.1:5173',viewport:{width:1440,height:1000}}),errors=observeErrors(page);
  try{
    await page.addInitScript(({key,data})=>localStorage.setItem(key,data),{key:saveKey,data:serializeWorld(world)});
    await page.goto('/?scenario=camp&size=32&seed=133&e2e');await expect(page.locator('#loading')).toHaveCount(0);
    await page.locator('[data-speed="0"]').click();await panel(page,'menu');await page.locator('#load').click();await expectWorld(page,world);
    for(let attempt=0;attempt<4;attempt++){
      const distance=await page.evaluate(()=>{const a=window.__lisiere.projectCell(14,19),b=window.__lisiere.projectCell(18,19);return Math.hypot(a.x-b.x,a.y-b.y);});
      if(distance>320)break;
      const bounds=(await page.locator('#viewport canvas').boundingBox())!,focus=await page.evaluate(()=>window.__lisiere.projectCell(16,20));
      await page.mouse.move(bounds.x+focus.x,bounds.y+focus.y);await page.mouse.wheel(0,-420);await page.waitForTimeout(250);
    }
    await revealCells(page,spots);
    expect(await page.evaluate(()=>window.__lisiere.backend)).toMatch(/webgpu/i);
    await page.screenshot({path:'artifacts/visual-anchors-v133.png'});
    await cell(page,14,19);await expect(page.locator('#cell-title')).toContainText('Bois');
    await page.screenshot({path:'artifacts/visual-anchors-selection-v133.png'});
    expect(errors).toEqual([]);
  }finally{await browser.close();}
});
