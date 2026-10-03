import { readFileSync } from 'node:fs';
import { expect,test } from '@playwright/test';
import { STORAGE_DEMO_HIGH,STORAGE_DEMO_LOW } from '../../scripts/generate-storage-condition-demo-v188.ts';
import { deserializeWorld,validateWorld } from '../../src/sim/serialization.ts';
import type { World } from '../../src/sim/types.ts';
import { cell,expectWorld,observeErrors,panel,pause,tool,world } from './helpers.ts';
import { revealCells } from './player-actions.ts';
import { TEST_COLONY_COUNT } from '../test-colony-count.ts';
import { testOutputPath,writeTestFile } from '../test-output.ts';

const objects=(w:World)=>[
  ...w.piles.map(p=>({id:p.id,quality:p.apparel?.quality??p.weapon?.quality,owner:p.owner,state:{item:p.item,quantity:p.quantity,apparel:p.apparel,weapon:p.weapon}})),
  ...w.packed.map(p=>({id:p.building.id,quality:p.building.quality,owner:p.owner,state:p.building})),
];
const sorted=(w:World)=>objects(w).length===6&&objects(w).every(p=>p.owner.type==='ground'&&(p.quality==='poor'?STORAGE_DEMO_LOW:STORAGE_DEMO_HIGH).some(c=>p.owner.type==='ground'&&p.owner.x===c.x&&p.owner.z===c.z));

test('V188 public storage scene edits both ranges in the real inspector, carries objects and resumes its save in native WebGPU',async({playwright})=>{
  test.setTimeout(120_000);
  const prepared=deserializeWorld(readFileSync('public/test-saves/v188/tri-reserves.json','utf8')),initial=objects(prepared);
  const browser=await playwright.chromium.launch({channel:'chromium',args:[]});
  const page=await browser.newPage({baseURL:'http://127.0.0.1:5173',viewport:{width:1440,height:1000}}),errors=observeErrors(page);
  try{
    await page.goto('/?e2e');const front=page.locator('.front-menu');
    await front.getByRole('button',{name:'Charger une partie',exact:true}).click();
    await front.getByRole('button',{name:'Colonies de test'}).click();
    await expect(front.locator('input[name="test-colony"]')).toHaveCount(TEST_COLONY_COUNT);
    await front.locator('input[name="test-colony"][value="tri-reserves-v188"]').check();
    await front.getByRole('button',{name:'Charger cette colonie'}).click();
    await expectWorld(page,prepared);expect(await page.evaluate(()=>window.__lisiere.backend)).toBe('WebGPU');
    await tool(page,'select');await page.keyboard.press('Escape');
    for(const c of STORAGE_DEMO_HIGH){
      await page.keyboard.press('Escape');await revealCells(page,[c]);await cell(page,c.x,c.z);
      const controls=page.locator('#cell-storage');await expect(controls).toBeVisible();
      await expect(controls.locator('[data-storage-condition-toggle="quality"]')).toBeChecked();
      await expect(controls.locator('[data-storage-condition-toggle="hitPoints"]')).toBeChecked();
      await controls.locator('[data-storage-condition-min="quality"]').selectOption('normal');
      await controls.locator('[data-storage-condition-max="quality"]').selectOption('legendary');
      await controls.locator('[data-storage-condition-min="hitPoints"]').fill('70');
      await controls.locator('[data-storage-condition-max="hitPoints"]').fill('100');
      await controls.getByRole('button',{name:'Appliquer les réglages'}).click();
      await expect.poll(async()=>{
        const s=(await world(page)).stockpiles.find(s=>s.x===c.x&&s.z===c.z);
        return {quality:s?.quality,hitPoints:s?.hitPoints};
      }).toEqual({quality:{min:'normal',max:'legendary'},hitPoints:{min:70,max:100}});
    }
    await pause(page);const edited=await world(page);
    expect(edited.tick).toBe(0);expect(objects(edited)).toEqual(initial);expect(sorted(edited)).toBe(false);
    expect(validateWorld(edited)).toEqual([]);await page.keyboard.press('Escape');
    await page.locator('[data-speed="1"]').click();
    await page.waitForFunction(()=>{
      const w=window.__lisiere.world;
      if(!w.piles.some(p=>p.owner.type==='pawn')&&!w.packed.some(p=>p.owner.type==='pawn'))return false;
      document.querySelector<HTMLButtonElement>('[data-speed="0"]')!.click();return true;
    },undefined,{polling:'raf'});
    await pause(page);const carried=await world(page),cargo=objects(carried).find(p=>p.owner.type==='pawn')!;
    expect(cargo).toBeDefined();expect(sorted(carried)).toBe(false);expect(validateWorld(carried)).toEqual([]);
    const carrier=carried.pawns.find(p=>cargo.owner.type==='pawn'&&p.id===cargo.owner.pawnId)!;
    expect(carrier.haul?.phase).toBe('deliver');expect(carrier.haul?.carryPileId).toBe(cargo.id);
    expect(carrier.x!==prepared.pawns[0]!.x||carrier.z!==prepared.pawns[0]!.z).toBe(true);
    expect(objects(carried).map(p=>({id:p.id,state:p.state}))).toEqual(initial.map(p=>({id:p.id,state:p.state})));
    await revealCells(page,[carrier]);await page.screenshot({path:testOutputPath('artifacts/storage-condition-v188-carry.png')});
    await panel(page,'menu');await page.locator('#save').click();await expect(page.locator('#notice')).toContainText('Colonie sauvegardée');
    await page.locator('#load').click();await expect(page.locator('#notice')).toContainText('Sauvegarde rechargée');
    await expectWorld(page,carried);await page.keyboard.press('Escape');
    await page.locator('[data-speed="6"]').click();
    await expect.poll(async()=>sorted(await world(page)),{timeout:35_000}).toBe(true);
    await pause(page);const final=await world(page);
    expect(validateWorld(final)).toEqual([]);expect(final.nextId).toBe(prepared.nextId);
    expect(objects(final).map(p=>({id:p.id,state:p.state}))).toEqual(initial.map(p=>({id:p.id,state:p.state})));
    expect(final.piles.reduce((n,p)=>n+p.quantity,0)).toBe(4);expect(final.packed).toHaveLength(2);
    expect(final.pawns.every(p=>!p.haul)).toBe(true);
    expect(new Set(objects(final).map(p=>p.owner.type==='ground'?`${p.owner.x},${p.owner.z}`:'carried')).size).toBe(6);
    await revealCells(page,[...STORAGE_DEMO_LOW,...STORAGE_DEMO_HIGH]);
    await page.screenshot({path:testOutputPath('artifacts/storage-condition-v188-sorted.png')});
    expect(errors).toEqual([]);
    await writeTestFile('artifacts/storage-condition-v188-browser.json',JSON.stringify({prepared:true,backend:'native WebGPU',editedTick:edited.tick,
      carriedTick:carried.tick,cargoId:cargo.id,carrierId:carrier.id,finalTick:final.tick,objects:objects(final),errors},null,2));
  }finally{await browser.close();}
});
