import { testOutputPath } from '../test-output.ts';
import {test,expect} from '@playwright/test';
import {createWorld,serializeWorld,validateWorld} from '../../src/sim/index';
import {addGroundMaterial,refreshStock} from '../../src/sim/materials';
import {cell,expectWorld,observeErrors,panel,saveKey,settledCells} from './helpers';
import {revealCells} from './player-actions';

test('map click cycles meal and growing zone; bare soil only reports hover',async({playwright})=>{
  test.setTimeout(75_000);
  const browser=await playwright.chromium.launch({channel:'chromium',args:[]});
  const page=await browser.newPage({baseURL:'http://127.0.0.1:5173',viewport:{width:1440,height:1000}}),errors=observeErrors(page);
  const failedResponses:string[]=[];page.on('response',response=>{if(response.status()>=500)failedResponses.push(`${response.status()} ${response.url()}`);});
  try{
    const initial=createWorld(129,32,32),target={x:18,z:16},bare={x:19,z:16},rich={x:20,z:16},tree={x:23,z:20};
    initial.tiles=initial.tiles.map(()=>({terrain:'grass'}));initial.resources=[];initial.structures=[];initial.jobs=[];initial.piles=[];initial.stockpiles=[];initial.packed=[];initial.growingZones=[];
    initial.tiles[rich.z*initial.width+rich.x]={terrain:'rich-soil'};
    expect(initial.pawns.some(p=>[target,bare,rich,tree].some(c=>p.x===c.x&&p.z===c.z))).toBe(false);
    addGroundMaterial(initial,'food',2,target,'simple-meal');
    initial.resources.push({id:initial.nextId++,kind:'tree',amount:15,...tree});
    initial.growingZones.push({id:initial.nextId++,cells:[target.z*initial.width+target.x],plant:'rice',allowSow:true,allowCut:true});
    refreshStock(initial);expect(validateWorld(initial)).toEqual([]);
    await page.addInitScript(({key,data})=>localStorage.setItem(key,data),{key:saveKey,data:serializeWorld(initial)});
    await page.goto('/?scenario=camp&size=32&seed=129&e2e');await expect(page.locator('#loading')).toHaveCount(0);
    await page.locator('[data-speed="0"]').click();await panel(page,'menu');await page.locator('#load').click();await expectWorld(page,initial);
    await revealCells(page,[target,bare,rich,tree]);
    const [point]=await settledCells(page,[target]),bounds=(await page.locator('#viewport canvas').boundingBox())!;
    await page.mouse.move(bounds.x+point!.x,bounds.y+point!.y);
    await expect(page.locator('#map-hover-readout')).toContainText('Terre ordinaire');
    await expect(page.locator('#map-hover-readout')).toContainText('Repas simple ×2');
    await cell(page,target.x,target.z);await expect(page.locator('#cell-title')).toHaveText('Repas simple');
    await page.screenshot({path:testOutputPath('artifacts/map-selection-v129.png')});
    await cell(page,target.x,target.z);await expect(page.locator('#cell-title')).toHaveText('Zone de culture');
    await expect(page.locator('#growing-plant')).toHaveValue('rice');
    await cell(page,target.x,target.z);await expect(page.locator('#cell-title')).toHaveText('Repas simple');
    await cell(page,bare.x,bare.z);await expect(page.locator('#inspector')).toBeHidden();
    await expect(page.locator('#map-hover-readout')).toContainText('Terre ordinaire');
    await cell(page,rich.x,rich.z);await expect(page.locator('#inspector')).toBeHidden();
    await expect(page.locator('#map-hover-readout')).toContainText('Terre riche');
    await expect(page.locator('#map-hover-readout')).toContainText('fertilité 140 %');
    await cell(page,tree.x,tree.z);
    await expect(page.locator('.cell-health')).toBeVisible();
    await expect(page.locator('.cell-actions')).toBeVisible();
    await expect(page.locator('#cell-chop')).toBeVisible();
    await page.screenshot({path:testOutputPath('artifacts/object-inspection-v130.png')});
    await page.locator('#cell-chop').click();
    await expect.poll(()=>page.evaluate(({x,z})=>window.__lisiere.world.jobs.some(job=>job.kind==='chop'&&job.x===x&&job.z===z),tree)).toBe(true);
    expect({errors,failedResponses}).toEqual({errors:[],failedResponses:[]});
  }finally{await browser.close();}
});
