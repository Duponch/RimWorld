import {expect,test} from '@playwright/test';
import {serializeWorld,validateWorld} from '../../src/sim/index';
import {triggerBreakdown} from '../../src/sim/breakdowns';
import {addGroundMaterial,refreshStock} from '../../src/sim/materials';
import {deconstructionCamp} from '../scenarios/deconstruction';
import {fixturePower} from '../scenarios/power';
import {cell,expectWorld,observeErrors,panel,pause,saveKey,settledCells,world} from './helpers';

test('panne mécanique V144 : composant physique, réparation, courant et reprise WebGPU',async({playwright})=>{
  test.setTimeout(120000);
  // Only the already-broken machine and an available component are prepared.
  // Its delivery, the repair and the return to service happen in the worker.
  const initial=deconstructionCamp(),pawn=initial.pawns[0]!;
  pawn.skills.construction.level=20; // deterministic Core success at full capacity
  pawn.priorities.build=1;
  pawn.priorities.haul=2;
  pawn.schedule.fill('work');
  pawn.recreation.level=100;
  const generator=fixturePower(initial,'wood-generator',17,16);
  initial.home=[generator.z*initial.width+generator.x];
  addGroundMaterial(initial,'component',1,{x:15,z:16},'component');
  refreshStock(initial);
  expect(triggerBreakdown(initial,generator.id)).toBe(true);
  expect(initial.jobs.some(job=>job.kind==='fix-breakdown'&&job.fixBreakdown?.structureId===generator.id)).toBe(true);
  expect(validateWorld(initial)).toEqual([]);

  const browser=await playwright.chromium.launch({channel:'chromium',args:[]});
  try{
    const page=await browser.newPage({baseURL:'http://127.0.0.1:5173',viewport:{width:1440,height:1000}}),errors=observeErrors(page);
    page.setDefaultTimeout(15000);
    await page.addInitScript(({key,data})=>localStorage.setItem(key,data),{key:saveKey,data:serializeWorld(initial)});
    await page.goto('/?scenario=camp&size=32&e2e');
    await expect(page.locator('#loading')).toHaveCount(0);
    await pause(page);
    await panel(page,'menu');await page.locator('#load').click();await expectWorld(page,initial);

    await cell(page,generator.x,generator.z);
    const card=page.locator(`[data-power-id="${generator.id}"]`);
    await expect(card.locator('[data-power-state]')).toContainText('En panne');
    await expect(card.locator('[data-power-state]')).toContainText('Panne mécanique');
    const broken=await world(page);
    expect(broken.structures.find(s=>s.id===generator.id)?.breakdown).toBeDefined();
    expect(broken.structures.find(s=>s.id===generator.id)?.damage).toBeUndefined();
    expect(broken.structures.find(s=>s.id===generator.id)?.power?.on).toBe(false);
    const [point]=await settledCells(page,[{x:generator.x,z:generator.z}]);
    const canvas=await page.locator('#viewport canvas').boundingBox();
    if(!canvas)throw new Error('Canvas absent');
    await page.mouse.move(canvas.x+point!.x,canvas.y+point!.y);
    await page.mouse.wheel(0,-850);
    await page.waitForTimeout(300);
    await page.screenshot({path:test.info().outputPath('breakdown-v144-broken.png')});

    await panel(page,'menu');await page.locator('#save').click();await page.locator('#load').click();await expectWorld(page,broken);
    await page.keyboard.press('Escape');
    await page.locator('[data-speed="1"]').click();
    await expect.poll(async()=>{
      const current=await world(page);
      return current.jobs.find(job=>job.fixBreakdown?.structureId===generator.id)?.progress??0;
    },{timeout:30000}).toBeGreaterThan(0);
    const repairing=await world(page);
    expect(repairing.piles.some(p=>p.item==='component'&&p.owner.type==='job'&&p.owner.jobId===repairing.jobs.find(job=>job.fixBreakdown?.structureId===generator.id)?.id)).toBe(true);
    await page.locator('[data-speed="6"]').click();
    await expect.poll(async()=>{
      const current=await world(page);
      return !current.structures.find(s=>s.id===generator.id)?.breakdown;
    },{timeout:60000}).toBe(true);
    await expect.poll(async()=>(await world(page)).structures.find(s=>s.id===generator.id)?.power?.on,{timeout:15000}).toBe(true);
    await pause(page);
    const repaired=await world(page);
    expect(repaired.piles.filter(p=>p.item==='component').reduce((total,pile)=>total+pile.quantity,0)).toBe(0);
    expect(repaired.jobs.some(job=>job.fixBreakdown?.structureId===generator.id)).toBe(false);
    expect(validateWorld(repaired)).toEqual([]);
    await cell(page,generator.x,generator.z);
    await expect(card.locator('[data-power-state]')).not.toContainText('Panne mécanique');
    await expect(card.locator('[data-power-state]')).not.toContainText('En panne');
    await page.screenshot({path:test.info().outputPath('breakdown-v144-repaired.png')});

    await panel(page,'menu');await page.locator('#save').click();await page.locator('#load').click();await expectWorld(page,repaired);
    expect(validateWorld(await world(page))).toEqual([]);
    expect(await page.evaluate(()=>window.__lisiere.backend)).toContain('WebGPU');
    expect(errors).toEqual([]);
  }finally{await browser.close();}
});
