import {expect,test} from '@playwright/test';
import {serializeWorld,validateWorld} from '../../src/sim/index';
import {addGroundMaterial,refreshStock} from '../../src/sim/materials';
import {AUTODOORS_RESEARCH_COST} from '../../src/sim/research';
import {deconstructionCamp,fixtureBuilding} from '../scenarios/deconstruction';
import {fixturePower} from '../scenarios/power';
import {cell,expectWorld,observeErrors,panel,pause,saveKey,settledCells,world} from './helpers';
import {revealCells} from './player-actions';

test('porte automatique V143 : recherche, chantier, courant et inspection dans Chromium/WebGPU',async({playwright})=>{
  test.setTimeout(150000);
  // Controlled checkpoint: the bench, fueled generator and near-complete
  // research are explicit preparation. Completion and the door's construction
  // happen through the running simulation and player controls below.
  const initial=deconstructionCamp(),pawn=initial.pawns[0]!;
  initial.tick=2000;
  pawn.skills.construction.level=8;
  pawn.skills.intellectual={level:10,xp:0,dailyXp:0,passion:1};
  pawn.priorities.research=1;
  pawn.priorities.build=1;
  pawn.priorities.haul=2;
  pawn.schedule.fill('work');
  pawn.recreation.level=100;
  initial.research={project:null,points:0,autodoors:{points:AUTODOORS_RESEARCH_COST-100_000}};
  Object.assign(fixtureBuilding(initial,'research-bench',18,18),{material:'wood' as const});
  const generator=fixturePower(initial,'wood-generator',20,16);
  addGroundMaterial(initial,'wood',25,{x:13,z:14},'wood');
  addGroundMaterial(initial,'steel',40,{x:14,z:14},'steel');
  addGroundMaterial(initial,'component',2,{x:15,z:14},'component');
  refreshStock(initial);
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

    await panel(page,'architect');
    await page.locator('[data-category="structure"]').click();
    await expect(page.locator('[data-tool="autodoor"]')).toBeVisible();
    await page.locator('[data-tool="autodoor"]').click();
    await expect(page.locator('#tool-instruction')).toContainText('40 Acier');
    await expect(page.locator('#tool-instruction')).toContainText('2 Composants');
    await revealCells(page,[{x:16,z:16}]);await cell(page,16,16);
    await expect(page.locator('#notice')).toContainText('Recherchez Portes automatiques');
    expect((await world(page)).jobs.some(job=>job.kind==='autodoor')).toBe(false);

    await panel(page,'research');
    await expect(page.locator('[data-research-node="autodoors"]')).toHaveAttribute('data-state','available');
    await expect(page.locator('[data-autodoors-status]')).toHaveText('Disponible');
    await page.locator('[data-research-select="autodoors"]').click();
    await expect(page.locator('[data-research-selection-prerequisites]')).toContainText('Électricité (acquise au départ)');
    await page.locator('[data-research-selected-start]').click();
    await expect.poll(async()=>(await world(page)).research?.project).toBe('autodoors');
    await page.keyboard.press('Escape');await page.locator('[data-speed="6"]').click();
    await expect.poll(async()=>(await world(page)).research?.autodoors?.completedAt,{timeout:20000}).toBeDefined();
    await pause(page);
    await panel(page,'research');
    await expect(page.locator('[data-autodoors-status]')).toHaveText('Terminée');

    await panel(page,'architect');
    await page.locator('[data-category="structure"]').click();
    await page.locator('[data-tool="autodoor"]').click();
    await revealCells(page,[{x:16,z:16}]);await cell(page,16,16);
    await expect.poll(async()=>(await world(page)).jobs.some(job=>job.kind==='autodoor')).toBe(true);
    await page.keyboard.press('Escape');await page.locator('[data-speed="6"]').click();
    await expect.poll(async()=>(await world(page)).structures.some(s=>s.kind==='autodoor'&&s.x===16&&s.z===16),{timeout:60000}).toBe(true);
    await expect.poll(async()=>(await world(page)).structures.find(s=>s.kind==='autodoor')?.power?.on,{timeout:15000}).toBe(true);
    await pause(page);
    const built=await world(page),door=built.structures.find(s=>s.kind==='autodoor')!;
    expect(door).toMatchObject({material:'wood',power:{on:true,parentId:generator.id}});
    expect(validateWorld(built)).toEqual([]);

    await cell(page,door.x,door.z);
    await expect(page.locator('#cell-title')).toContainText('Porte automatique');
    await expect(page.locator('#door-state')).toContainText('Alimentée : ouverture rapide');
    const power=page.locator(`[data-power-id="${door.id}"]`);
    await expect(power.locator('[data-power-state]')).toContainText('Demande 50 W');
    await expect(power.locator('[data-power-flick]')).toBeHidden();
    await page.locator('#door-holdOpen').check();
    await page.locator('#door-forbidden').check();
    await expect.poll(async()=>{
      const state=(await world(page)).structures.find(s=>s.id===door.id)?.door;
      return state?.holdOpen===true&&state.forbidden===true;
    }).toBe(true);
    const configured=await world(page);
    expect(validateWorld(configured)).toEqual([]);
    await panel(page,'menu');await page.locator('#save').click();await page.locator('#load').click();await expectWorld(page,configured);
    await page.keyboard.press('Escape');
    const [doorPoint]=await settledCells(page,[{x:door.x,z:door.z}]);
    const canvas=await page.locator('#viewport canvas').boundingBox();
    if(!canvas)throw new Error('Canvas absent');
    await page.mouse.move(canvas.x+doorPoint!.x,canvas.y+doorPoint!.y);
    await page.mouse.wheel(0,-850);
    await page.waitForTimeout(300);
    await page.screenshot({path:test.info().outputPath('autodoor-powered-v143.png')});

    await cell(page,generator.x,generator.z);
    await page.locator('#cell-deconstruct').click();
    await page.locator('[data-speed="6"]').click();
    await expect.poll(async()=>(await world(page)).structures.some(s=>s.id===generator.id),{timeout:30000}).toBe(false);
    await expect.poll(async()=>(await world(page)).structures.find(s=>s.id===door.id)?.power?.on).toBe(false);
    await pause(page);await cell(page,door.x,door.z);
    await expect(page.locator('#door-state')).toContainText('Sans courant : ouverture ordinaire');
    await expect(page.locator(`[data-power-id="${door.id}"] [data-power-state]`)).toContainText('Non raccordée');
    const final=await world(page);
    expect(final.structures.find(s=>s.id===door.id)?.door).toMatchObject({holdOpen:true,forbidden:true});
    expect(validateWorld(final)).toEqual([]);
    expect(await page.evaluate(()=>window.__lisiere.backend)).toContain('WebGPU');
    expect(errors).toEqual([]);
    await page.screenshot({path:test.info().outputPath('autodoor-unpowered-v143.png')});
  }finally{await browser.close();}
});
