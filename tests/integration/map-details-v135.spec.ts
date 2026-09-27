import { expect, test } from '@playwright/test';
import { createWorld } from '../../src/sim/engine';
import { addGroundMaterial, refreshStock } from '../../src/sim/materials';
import { serializeWorld, validateWorld } from '../../src/sim/serialization';
import { expectWorld, observeErrors, panel, pawnTab, saveKey, settledCells } from './helpers';
import { revealCells } from './player-actions';

test('V135: avatar stays in the lower summary; Alt and close zoom reveal physical map details', async ({ playwright }) => {
  test.setTimeout(100_000);
  const world=createWorld(1352,32,32),target={x:18,z:16};
  world.tiles=world.tiles.map(()=>({terrain:'grass'}));
  world.resources=[];world.structures=[];world.piles=[];world.packed=[];world.jobs=[];world.growingZones=[];world.stockpiles=[];
  addGroundMaterial(world,'food',4,target,'simple-meal');refreshStock(world);
  expect(validateWorld(world)).toEqual([]);
  const browser=await playwright.chromium.launch({channel:'chromium',headless:false,args:[]});
  const page=await browser.newPage({baseURL:'http://127.0.0.1:5173',viewport:{width:1440,height:1000}}),errors=observeErrors(page);
  try {
    await page.addInitScript(({key,data})=>localStorage.setItem(key,data),{key:saveKey,data:serializeWorld(world)});
    await page.goto('/?scenario=camp&size=32&e2e');await expect(page.locator('#loading')).toHaveCount(0);
    await page.locator('[data-speed="0"]').click();await panel(page,'menu');await page.locator('#load').click();await expectWorld(page,world);
    await page.locator(`[data-pawn="${world.pawns[0]!.id}"]`).click();await pawnTab(page,'bio');
    await expect(page.locator('.colonist-inspector-summary .appearance-inspection img')).toBeVisible();
    await expect(page.locator('[data-colonist-panel="bio"] .appearance-inspection')).toHaveCount(0);
    await page.screenshot({path:test.info().outputPath('lower-avatar-v135.png')});
    await page.keyboard.press('Escape');
    await revealCells(page,[target]);
    const pointer=async()=>{
      const [point]=await settledCells(page,[target]),bounds=(await page.locator('#viewport canvas').boundingBox())!;
      return {x:bounds.x+point!.x,y:bounds.y+point!.y};
    };
    let p=await pointer();await page.mouse.move(p.x,p.y);
    await page.keyboard.down('Alt');
    await expect(page.locator('#map-cell-details')).toBeVisible();
    await expect(page.locator('#map-cell-details')).toContainText('Repas simple ×4');
    await expect(page.locator('#map-cell-details')).toContainText('Fertilité');
    await page.screenshot({path:test.info().outputPath('alt-inspector-v135.png')});
    await page.keyboard.up('Alt');await expect(page.locator('#map-cell-details')).toBeHidden();
    for(let i=0;i<8&&await page.locator('.map-labels-overlay').isHidden();i++){
      p=await pointer();await page.mouse.move(p.x,p.y);await page.mouse.wheel(0,-400);await page.waitForTimeout(120);
    }
    await expect(page.locator('.map-labels-overlay')).toBeVisible();
    await expect.poll(()=>page.evaluate(()=>{
      const canvas=document.querySelector<HTMLCanvasElement>('.map-labels-overlay')!;
      const data=canvas.getContext('2d')!.getImageData(0,0,canvas.width,canvas.height).data;
      for(let i=3;i<data.length;i+=4)if(data[i]!==0)return true;
      return false;
    })).toBe(true);
    await page.screenshot({path:test.info().outputPath('map-details-v135.png')});
    expect(errors).toEqual([]);
  } finally {await browser.close();}
});
