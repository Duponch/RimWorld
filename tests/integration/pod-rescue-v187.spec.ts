import { readFileSync } from 'node:fs';
import { expect,test } from '@playwright/test';
import { deserializeWorld,validateWorld } from '../../src/sim/serialization.ts';
import { isColonist } from '../../src/sim/affiliation.ts';
import { expectWorld,observeErrors,panel,pause,world } from './helpers.ts';
import { perform,revealCells } from './player-actions.ts';
import { TEST_COLONY_COUNT } from '../test-colony-count.ts';
import { testOutputPath,writeTestFile } from '../test-output.ts';

const probe=`
window.__podFrames=[];
const podFrame=ColonyRenderer.prototype.frame;
ColonyRenderer.prototype.frame=function(...args){const result=podFrame.apply(this,args);if(!this.preparing&&this.world&&window.__podFrames.length<1000){const layer=this.podRescue;window.__podFrames.push({tick:this.world.tick,play:layer.tick.value,pending:!!this.world.podRescues?.pending,parts:layer.mesh.activeCount,version:layer.mesh.instanceMatrix.version});}return result;};
`;
test('V187 public capsule falls, opens, is rescued physically and receives care after bed admission in native WebGPU',async({playwright})=>{
  test.setTimeout(120_000);
  const prepared=deserializeWorld(readFileSync('public/test-saves/v187/secours-capsule.json','utf8'));
  const browser=await playwright.chromium.launch({channel:'chromium',args:[]});
  const page=await browser.newPage({baseURL:'http://127.0.0.1:5173',viewport:{width:1440,height:1000}}),errors=observeErrors(page);
  try{
    await page.route('**/src/main.ts*',async route=>{const response=await route.fetch();await route.fulfill({response,body:probe+await response.text()});});
    await page.goto('/?e2e');const front=page.locator('.front-menu');
    await front.getByRole('button',{name:'Charger une partie',exact:true}).click();
    await front.getByRole('button',{name:'Colonies de test'}).click();
    await expect(front.locator('input[name="test-colony"]')).toHaveCount(TEST_COLONY_COUNT);
    await front.locator('input[name="test-colony"][value="secours-capsule-v187"]').check();
    await front.getByRole('button',{name:'Charger cette colonie'}).click();
    await expectWorld(page,prepared);expect(await page.evaluate(()=>window.__lisiere.backend)).toBe('WebGPU');
    await revealCells(page,[prepared.podRescues!.pending!.cell]);
    await page.locator('[data-speed="1"]').click();
    await page.waitForFunction(()=>{
      if(!window.__lisiere.world.podRescues?.incidents.length)return false;
      document.querySelector<HTMLButtonElement>('[data-speed="0"]')!.click();return true;
    },undefined,{polling:'raf'});
    await pause(page);const opened=await world(page),patient=opened.pawns.find(p=>p.podRescue)!;
    expect(validateWorld(opened)).toEqual([]);expect(patient.podRescue!.admittedAt).toBeUndefined();
    expect(opened.pawns.every(p=>!p.rescue)).toBe(true);
    await perform(page,{reason:'Décider du secours civil au lit médical.',command:{type:'order-rescue',pawnId:prepared.pawns[0]!.id,patientId:patient.id,queue:false}},{value:0});
    await page.locator('[data-speed="1"]').click();
    await page.waitForFunction(id=>{
      if(!window.__lisiere.world.pawns.find(p=>p.rescue?.patientId===id&&p.rescue.phase==='carry'))return false;
      document.querySelector<HTMLButtonElement>('[data-speed="0"]')!.click();return true;
    },patient.id,{polling:'raf'});
    await pause(page);const carried=await world(page);
    expect(validateWorld(carried)).toEqual([]);expect(carried.pawns.find(p=>p.id===patient.id)!.podRescue!.admittedAt).toBeUndefined();
    await panel(page,'menu');await page.locator('#save').click();await page.locator('#load').click();await expectWorld(page,carried);await page.keyboard.press('Escape');
    await page.screenshot({path:testOutputPath('artifacts/pod-rescue-v187-carry.png')});
    await page.locator('[data-speed="6"]').click();
    await expect.poll(async()=>(await world(page)).podRescues!.incidents[0]!.tendedAt,{timeout:30_000}).not.toBeUndefined();
    await pause(page);const tended=await world(page),civil=tended.pawns.find(p=>p.id===patient.id)!;
    expect(validateWorld(tended)).toEqual([]);expect(civil.podRescue!.admittedAt).toBeGreaterThan(carried.tick);
    expect(civil.faction).toBe('outlanders');expect(tended.pawns.filter(isColonist)).toHaveLength(3);
    expect(tended.piles.filter(p=>p.item==='herbal-medicine').reduce((n,p)=>n+p.quantity,0)).toBeLessThan(12);
    await revealCells(page,[civil]);
    const point=await page.evaluate(id=>window.__lisiere.projectPawn(id),civil.id),bounds=(await page.locator('#viewport canvas').boundingBox())!;
    expect(point).toBeDefined();await page.mouse.click(bounds.x+point!.x,bounds.y+point!.y);
    await expect(page.locator('#pod-food-policy')).toBeEnabled();
    await expect(page.locator('#enemy-mandate')).toContainText('Naufragé civil accueilli');
    await page.screenshot({path:testOutputPath('artifacts/pod-rescue-v187-tended.png')});
    const frames=await page.evaluate(()=>(window as unknown as {__podFrames:Array<{pending:boolean;parts:number;version:number}>}).__podFrames);
    const falling=frames.filter(f=>f.pending&&f.parts===6);
    expect(falling.length).toBeGreaterThan(5);expect(new Set(falling.map(f=>f.version)).size).toBe(1);
    expect(errors).toEqual([]);
    await writeTestFile('artifacts/pod-rescue-v187-browser.json',JSON.stringify({prepared:true,backend:'native WebGPU',openedTick:opened.tick,carriedTick:carried.tick,admittedAt:civil.podRescue!.admittedAt,tendedAt:tended.podRescues!.incidents[0]!.tendedAt,frames:frames.length,errors},null,2));
  }finally{await browser.close();}
});
