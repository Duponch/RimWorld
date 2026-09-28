import {expect,test} from '@playwright/test';
import {serializeWorld,validateWorld} from '../../src/sim/index';
import {addGroundMaterial} from '../../src/sim/materials';
import {CLOTHING_RESEARCH_COST,researchCost} from '../../src/sim/research';
import {prepareAdvancedIndustryDemo} from '../../scripts/generate-advanced-industry-demo-v139';
import {cell,expectWorld,observeErrors,panel,pause,saveKey,world} from './helpers';
import {perform,revealCells} from './player-actions';

test('casque V148 : facture, ouvrage physique et port réel dans Chromium/WebGPU',async({playwright})=>{
  test.setTimeout(180000);
  // Scène préparée en mémoire : le composant avancé est une acquisition préalable,
  // mais facture, transport, ouvrage et casque se produisent après le chargement.
  const initial=prepareAdvancedIndustryDemo(),bench=initial.structures.find(s=>s.kind==='fabrication-bench')!,pawn=initial.pawns[0]!;
  bench.bills=[];
  initial.research!.points=CLOTHING_RESEARCH_COST;initial.research!.completedAt=1000;
  initial.research!.reconArmor={points:researchCost('recon-armor'),completedAt:initial.tick};
  pawn.schedule.fill('work');pawn.hunger=100;pawn.rest=100;pawn.recreation.level=100;
  addGroundMaterial(initial,'plasteel',30,{x:10,z:11},'plasteel');
  addGroundMaterial(initial,'advanced-component',1,{x:9,z:11},'advanced-component');
  expect(initial.piles.some(p=>p.item==='recon-helmet'||p.item==='unfinished-recon-helmet')).toBe(false);
  expect(validateWorld(initial)).toEqual([]);

  const browser=await playwright.chromium.launch({channel:'chromium',args:[]});
  try{
    const page=await browser.newPage({baseURL:'http://127.0.0.1:5173',viewport:{width:1440,height:1000}}),errors=observeErrors(page);
    await page.addInitScript(({key,data})=>localStorage.setItem(key,data),{key:saveKey,data:serializeWorld(initial)});
    await page.goto('/?scenario=camp&size=32&e2e');
    await expect(page.locator('#loading')).toHaveCount(0);
    await pause(page);await panel(page,'menu');await page.locator('#load').click();await expectWorld(page,initial);
    await page.keyboard.press('Escape');await revealCells(page,[bench]);await cell(page,bench.x,bench.z);
    await expect(page.locator('#add-bill-make-recon-helmet')).toBeEnabled();
    await page.locator('#add-bill-make-recon-helmet').click();
    await expect(page.locator('.bill-cost')).toContainText('30 plastacier · 1 composant avancé');
    await page.keyboard.press('Escape');await page.locator('[data-speed="6"]').click();
    await page.waitForFunction(()=>window.__lisiere.world.piles.some(p=>p.item==='recon-helmet'&&p.owner.type==='ground'),undefined,{timeout:120000});
    await pause(page);
    const completed=await world(page),helmet=completed.piles.find(p=>p.item==='recon-helmet')!;
    expect(completed.piles.some(p=>p.item==='unfinished-recon-helmet')).toBe(false);
    expect(helmet.apparel?.hitPoints).toBe(120);
    expect(validateWorld(completed)).toEqual([]);
    await perform(page,{reason:'Enfiler le casque de reconnaissance fabriqué.',command:{type:'order-equipment',pawnId:pawn.id,itemId:helmet.id,action:'wear',queue:false}},{value:0});
    await page.locator('[data-speed="6"]').click();
    await expect.poll(async()=>(await world(page)).piles.find(p=>p.id===helmet.id)?.owner.type,{timeout:30000}).toBe('apparel');
    await pause(page);
    const worn=await world(page);expect(validateWorld(worn)).toEqual([]);
    expect(await page.evaluate(()=>window.__lisiere.backend)).toContain('WebGPU');
    expect(errors).toEqual([]);
    await page.screenshot({path:test.info().outputPath('recon-helmet-v148.png')});
  }finally{await browser.close();}
});
