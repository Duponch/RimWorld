import {expect,test,type Page} from '@playwright/test';
import {createWorld,serializeWorld,validateWorld} from '../../src/sim/index';
import {injurePawn} from '../../src/sim/health';
import {HP_UNIT} from '../../src/sim/injury-rules';
import {newApparelState} from '../../src/sim/apparel-rules';
import {newWeaponState} from '../../src/sim/equipment-rules';
import {refreshStock} from '../../src/sim/materials';
import {domesticColony} from '../scenarios/domestic-colony';
import {recruitmentUiFixture,prisonerUiFixture} from '../scenarios/prison-camp';
import {inspectPerson} from './player-actions';
import {expectWorld,observeErrors,panel,pause,pawnTab,saveKey,world} from './helpers';
import {testOutputPath,writeTestFile} from '../test-output';

async function hoverTip(page:Page,selector:string,text:string){
  await page.locator(selector).hover();
  await expect(page.locator('#game-tooltip')).toBeVisible();
  await expect(page.locator('#game-tooltip')).toContainText(text);
  const rect=await page.locator('#game-tooltip').boundingBox();
  expect(rect).not.toBeNull();expect(rect!.x).toBeGreaterThanOrEqual(0);expect(rect!.y).toBeGreaterThanOrEqual(0);
  expect(rect!.x+rect!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
  expect(rect!.y+rect!.height).toBeLessThanOrEqual(page.viewportSize()!.height);
}

test('V199 native prepared UI: real policies, independent filters, anatomical/item tooltips and responsive dossiers',async({playwright})=>{
  test.setTimeout(120_000);
  const initial=createWorld(199,32,32),pawn=initial.pawns[0]!;
  injurePawn(initial,pawn,'left-eye','cut',9*HP_UNIT);
  initial.events.push({tick:initial.tick,type:'need',message:`Bavardage entre ${pawn.name} et ${initial.pawns[1]!.name}.`},
    {tick:initial.tick,type:'command',message:`${pawn.name} a été blessé au combat.`});
  initial.piles.push({id:initial.nextId++,kind:'apparel',item:'cloth-shirt',quantity:1,owner:{type:'apparel',pawnId:pawn.id},apparel:newApparelState('cloth-shirt')},
    {id:initial.nextId++,kind:'weapon',item:'revolver',quantity:1,owner:{type:'equipment',pawnId:pawn.id},weapon:newWeaponState('revolver')});
  refreshStock(initial);expect(validateWorld(initial)).toEqual([]);
  const browser=await playwright.chromium.launch({channel:'chromium',args:[]});
  const page=await browser.newPage({baseURL:'http://127.0.0.1:5173',viewport:{width:1440,height:1000}}),errors=observeErrors(page);
  const layouts:unknown[]=[],evidence:{[key:string]:unknown}={prepared:true,seed:199,viewports:layouts};
  try{
    await page.addInitScript(({key,data})=>localStorage.setItem(key,data),{key:saveKey,data:serializeWorld(initial)});
    await page.goto('/?scenario=camp&size=32&seed=199&e2e');await expect(page.locator('#loading')).toHaveCount(0);
    await pause(page);await panel(page,'menu');await page.locator('#load').click();await expectWorld(page,initial);await page.keyboard.press('Escape');
    evidence.backend=await page.evaluate(()=>window.__lisiere.backend);expect(evidence.backend).toBe('WebGPU');
    await page.locator(`[data-pawn="${pawn.id}"]`).click();await pawnTab(page,'bio');
    await expect(page.locator('.bio-columns')).toBeVisible();await expect(page.locator('[data-skill-entry]')).toHaveCount(11);
    await hoverTip(page,'[data-skill-entry="construction"]','Expérience du niveau');
    await page.screenshot({path:testOutputPath('artifacts/ui-v199-bio-tooltip.png')});
    await page.keyboard.press('Escape');await expect(page.locator('#game-tooltip')).toBeHidden();
    // A tooltip Escape must not close the selected record.
    await expect(page.locator('[data-colonist-panel="bio"]')).toBeVisible();
    await pawnTab(page,'needs');await expect(page.locator('.pawn-needs-list [data-need]')).toHaveCount(5);
    await expect(page.locator('.pawn-thoughts-list .mood-caption')).toBeVisible();
    await expect(page.locator('#mood-gauge')).toBeVisible();await expect(page.locator('#mood-thoughts')).not.toBeEmpty();
    await hoverTip(page,'[data-need="rest"]','Sommeil');
    await page.screenshot({path:testOutputPath('artifacts/ui-v199-needs.png')});
    await pawnTab(page,'health');await expect(page.locator('#game-tooltip')).toBeHidden();
    const clinical=page.locator('.health-injury-row');await expect(clinical).toHaveCount(1);
    await hoverTip(page,'.health-injury-row strong','Points de vie');await expect(page.locator('#game-tooltip')).toContainText('1 / 10');
    await hoverTip(page,'.health-injury-row>span','Lésion');
    await page.screenshot({path:testOutputPath('artifacts/ui-v199-health-tooltip.png')});
    await page.locator('#medical-policy').selectOption('none');await expect.poll(async()=>(await world(page)).pawns[0]!.medicalCare).toBe('none');
    await page.locator('#medical-policy').selectOption('herbal');await expect.poll(async()=>(await world(page)).pawns[0]!.medicalCare).toBe('herbal');
    await page.locator('#self-tend-policy').check();await expect.poll(async()=>(await world(page)).pawns[0]!.selfTend).toBe(true);
    const food=initial.foodPolicies.find(policy=>policy.id!==pawn.foodPolicyId)!;expect(food).toBeDefined();
    await page.locator('#inspector-food-policy').selectOption(String(food.id));await expect.poll(async()=>(await world(page)).pawns[0]!.foodPolicyId).toBe(food.id);
    await page.locator('[data-health-tab="operations"]').click();await expect(clinical).toBeVisible();await expect(page.locator('.health-overview')).toBeHidden();
    await expect(page.locator('.health-operations')).toContainText('Aucune opération disponible.');
    await page.screenshot({path:testOutputPath('artifacts/ui-v199-operations.png')});
    await pawnTab(page,'journal');
    await expect(page.locator('#pawn-journal-rows>li:visible')).toHaveCount(2);
    await page.locator('[data-journal-filter="social"]').click();await expect(page.locator('[data-journal-filter="combat"]')).toHaveAttribute('aria-checked','true');
    await expect(page.locator('#pawn-journal-rows>li:visible')).toHaveCount(1);await expect(page.locator('#pawn-journal-rows>li:visible')).toContainText('combat');
    await page.locator('[data-journal-filter="combat"]').click();await expect(page.locator('#pawn-journal-empty')).toBeVisible();
    await page.locator('[data-journal-filter="all"]').click();await expect(page.locator('#pawn-journal-rows>li:visible')).toHaveCount(2);
    await page.screenshot({path:testOutputPath('artifacts/ui-v199-journal.png')});
    await pawnTab(page,'social');await expect(page.locator('#social-history')).toContainText('Bavardage');
    await page.screenshot({path:testOutputPath('artifacts/ui-v199-social.png')});
    await pawnTab(page,'gear');await expect(page.locator('#equipment-details')).toContainText('Chemise en tissu');
    await page.screenshot({path:testOutputPath('artifacts/ui-v199-gear.png')});
    await page.locator('[data-apparel-information]').click();await expect(page.locator('#object-information')).toBeVisible();
    await page.locator('#object-information-search').fill('tranchant');await expect(page.locator('.object-information-stat')).toHaveCount(1);
    await page.locator('.object-information-stat').focus();await expect(page.locator('#object-information-explanation')).toContainText('base');
    await expect(page.locator('#game-tooltip')).toBeVisible();await expect(page.locator('#object-information #game-tooltip')).toHaveCount(1);
    await page.screenshot({path:testOutputPath('artifacts/ui-v199-item.png')});await page.keyboard.press('Escape');
    await expect(page.locator('#object-information')).toBeHidden();await expect(page.locator('#game-tooltip')).toBeHidden();
    for(const viewport of [{width:1366,height:768},{width:1522,height:1195}]){
      await page.setViewportSize(viewport);
      for(const tab of ['health','bio','needs'] as const){
        await pawnTab(page,tab);
        const rect=await page.locator('#inspector').boundingBox();expect(rect).not.toBeNull();expect(rect!.y).toBeGreaterThanOrEqual(0);
        expect(rect!.y+rect!.height).toBeLessThanOrEqual(viewport.height-70);
        expect(rect!.x+rect!.width).toBeLessThanOrEqual(viewport.width);
        layouts.push({viewport,tab,rect});
        await page.screenshot({path:testOutputPath(`artifacts/ui-v199-${tab}-${viewport.width}.png`)});
      }
    }
    const changed=await world(page);expect(validateWorld(changed)).toEqual([]);expect(changed.tick).toBe(initial.tick);
    expect(changed.piles).toEqual(initial.piles);expect(changed.pawns[0]!.health).toEqual(pawn.health);
    await panel(page,'menu');await page.locator('#save').click();await page.locator('#load').click();await expectWorld(page,changed);await page.keyboard.press('Escape');
    await panel(page,'research');await page.locator('[data-research-select="recon-armor"]').click();
    const researchLayout=await page.evaluate(()=>{const sidebar=document.querySelector('.research-sidebar')!.getBoundingClientRect(),map=document.querySelector('.research-map-section')!.getBoundingClientRect(),node=document.querySelector('.research-node')!.getBoundingClientRect();return {sidebarRight:sidebar.right,mapLeft:map.left,mapWidth:map.width,nodeWidth:node.width,nodeHeight:node.height};});
    expect(researchLayout.mapLeft).toBeGreaterThan(researchLayout.sidebarRight);expect(researchLayout.nodeWidth).toBe(142);expect(researchLayout.nodeHeight).toBe(66);
    evidence.researchLayout=researchLayout;
    await expect(page.locator('[data-research-selection-prerequisites]')).toContainText('Vêtements complexes');
    await page.screenshot({path:testOutputPath('artifacts/ui-v199-research.png')});
    const domestic=domesticColony();expect(validateWorld(domestic)).toEqual([]);
    await page.evaluate(({key,data})=>localStorage.setItem(key,data),{key:saveKey,data:serializeWorld(domestic)});
    await panel(page,'menu');await page.locator('#load').click();await expectWorld(page,domestic);await page.keyboard.press('Escape');
    await page.locator('[data-panel="animals"]').click();await expect(page.locator('[data-domestic-list] thead th')).toHaveCount(8);
    await expect(page.locator('[data-domestic-animal]')).toHaveCount(1);await page.screenshot({path:testOutputPath('artifacts/ui-v199-animals.png')});
    await expect(page.locator('#game-tooltip')).toHaveCount(1);expect(errors).toEqual([]);
    evidence.errors=errors;evidence.finalTick=changed.tick;evidence.policy={medical:changed.pawns[0]!.medicalCare,food:changed.pawns[0]!.foodPolicyId,selfTend:changed.pawns[0]!.selfTend};
    await writeTestFile(testOutputPath('artifacts/ui-v199.json'),JSON.stringify(evidence,null,2));
  }finally{await browser.close();}
});

test('V199 native prepared human inspection keeps captive/hostile permissions and resets an inapplicable tab',async({playwright})=>{
  test.setTimeout(90_000);
  const prepared=recruitmentUiFixture(),initial=prepared.world;expect(validateWorld(initial)).toEqual([]);
  const browser=await playwright.chromium.launch({channel:'chromium',args:[]});
  const page=await browser.newPage({baseURL:'http://127.0.0.1:5173',viewport:{width:1440,height:1000}}),errors=observeErrors(page);
  try{
    await page.addInitScript(({key,data})=>localStorage.setItem(key,data),{key:saveKey,data:serializeWorld(initial)});
    await page.goto('/?scenario=camp&size=32&e2e');await expect(page.locator('#loading')).toHaveCount(0);
    await pause(page);await panel(page,'menu');await page.locator('#load').click();await expectWorld(page,initial);await page.keyboard.press('Escape');
    await inspectPerson(page,prepared.patientId,'health');
    await expect(page.locator('[data-colonist-tab]')).toHaveText(['Journal','Matériel','Prisonnier','Social','Bio','Besoins','Santé']);
    for(const selector of ['#health-inspection','#equipment-details','.skills-inspection','#mood-inspection','#social-inspection'])await expect(page.locator(selector)).toHaveCount(1);
    await expect(page.locator('#inspector-food-policy')).toBeEnabled();await expect(page.locator('#medical-policy')).toBeEnabled();
    await expect(page.locator('#self-tend-policy')).toHaveCount(0);await expect(page.locator('#toggle-draft')).toHaveCount(0);
    await pawnTab(page,'prisoner');
    const policyColors=await page.evaluate(()=>({mode:getComputedStyle(document.querySelector('#prisoner-mode')!).backgroundColor,page:getComputedStyle(document.querySelector('.colonist-inspector-pages')!).backgroundColor}));expect(policyColors.mode).toBe(policyColors.page);
    await page.screenshot({path:testOutputPath('artifacts/ui-v199-prisoner.png')});
    await page.locator(`[data-pawn="${prepared.actorId}"]`).click();await expect(page.locator('[data-colonist-tab="bio"]')).toHaveAttribute('aria-selected','true');
    await expect(page.locator('[data-colonist-tab="prisoner"]')).toHaveCount(0);
    const hostile=prisonerUiFixture();expect(validateWorld(hostile.world)).toEqual([]);
    await page.evaluate(({key,data})=>localStorage.setItem(key,data),{key:saveKey,data:serializeWorld(hostile.world)});
    await panel(page,'menu');await page.locator('#load').click();await expectWorld(page,hostile.world);await page.keyboard.press('Escape');
    await inspectPerson(page,hostile.patientId,'health');
    await expect(page.locator('[data-colonist-tab]')).toHaveCount(6);
    await expect(page.locator('#inspector-food-policy')).toBeDisabled();await expect(page.locator('#medical-policy')).toBeDisabled();
    await expect(page.locator('.health-injury-row')).toBeVisible();await expect(page.locator('#toggle-draft')).toHaveCount(0);
    await page.screenshot({path:testOutputPath('artifacts/ui-v199-hostile.png')});expect(errors).toEqual([]);
  }finally{await browser.close();}
});
