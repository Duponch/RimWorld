import { expect,test,type Page } from '@playwright/test';
import { createHash } from 'node:crypto';
import { existsSync,readFileSync,writeFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { isColonist } from '../../src/sim/affiliation';
import { deserializeWorld,validateWorld } from '../../src/sim/serialization';
import { SCHEMA_VERSION,type Structure,type World } from '../../src/sim/types';
import { cell,expectWorld,observeErrors,panel,pause,saveKey,world } from './helpers';
import { inspectPerson,revealCells } from './player-actions';

// The pilot path is rewritten by current migrations. Keep the V86 input
// canonical and immutable, then exercise its V90 in-memory continuation.
const sourcePath=new URL('../fixtures/colony-v86.json.gz',import.meta.url);
const reportPath='artifacts/prison-colony-native-v86.json';
const viewport={width:1440,height:1000};

async function saveAndLoad(page:Page,expected:World):Promise<void> {
  await panel(page,'menu');
  await page.locator('#save').click();
  await page.locator('#load').click();
  await expectWorld(page,expected);
  await page.keyboard.press('Escape');
}

async function inspectBed(page:Page,bed:Structure,ownerId:number,maxClicks:number):Promise<void> {
  await page.keyboard.press('Escape');
  await revealCells(page,[bed]);
  for(let attempt=0;attempt<maxClicks;attempt++) {
    await cell(page,bed.x,bed.z);
    const owner=page.locator('#bed-owner');
    if(await owner.isVisible()&&await owner.inputValue()===String(ownerId))return;
  }
  throw new Error(`Le lit attribué à la recrue ${ownerId} n’a pas été inspecté en ${bed.x}, ${bed.z}.`);
}

// This is the final World written by the natural V85 -> V86 colony pilot.
// No factory, new wound, incident, item, actor or simulation step is prepared here.
test('native real V86 colony: recruited fourth person, assigned bed, work and exact continuation',async({playwright})=>{
  test.skip(!existsSync(sourcePath),'Complete the natural V86 prison colony pilot first.');
  test.setTimeout(180000);
  const data=gunzipSync(readFileSync(sourcePath)).toString('utf8'),source=JSON.parse(data) as World;
  expect(source.schemaVersion).toBe(86);
  expect(source.scenario?.id).toBe('crashlanded');
  const initial=deserializeWorld(data);
  expect(initial).toMatchObject({...source,schemaVersion:SCHEMA_VERSION});expect(validateWorld(initial)).toEqual([]);
  const colonists=initial.pawns.filter(p=>isColonist(p)&&p.state!=='dead');
  expect(colonists).toHaveLength(4);
  const recruits=colonists.filter(p=>p.recruitment);
  expect(recruits).toHaveLength(1);
  const recruit=recruits[0]!;
  expect(recruit.prisoner).toBeUndefined();
  expect(recruit.recruitment!.fromFaction).toBe('outlaws');
  expect(recruit.recruitment!.recruitedAt).toBeLessThanOrEqual(initial.tick);
  const bed=initial.structures.find(s=>s.id===recruit.bedId);
  expect(bed?.kind).toBe('bed');expect(!!bed?.prisoner).toBe(false);expect(!!bed?.medical).toBe(false);
  expect(recruit.priorities.haul).toBeGreaterThan(0);expect(recruit.priorities.grow).toBeGreaterThan(0);

  const browser=await playwright.chromium.launch({channel:'chromium',args:[]});
  const page=await browser.newPage({baseURL:'http://127.0.0.1:5173',viewport}),errors=observeErrors(page);
  page.setDefaultTimeout(15000);
  const report:Record<string,unknown>={version:90,sourceVersion:86,controlled:false,source:sourcePath.pathname,
    sourceSha256:createHash('sha256').update(data).digest('hex'),initialTick:initial.tick,viewport,
    population:colonists.map(p=>({id:p.id,name:p.name})),status:'running',stage:'cold-load'};
  try {
    await page.addInitScript(({key,data})=>localStorage.setItem(key,data),{key:saveKey,data});
    await page.goto('/?e2e');
    const front=page.locator('.front-menu');await expect(front).toBeVisible();
    expect(await page.evaluate(()=>window.__lisiere.world)).toBeUndefined();
    await front.getByRole('button',{name:'Charger une partie',exact:true}).click();
    await front.locator(`input[name="front-save"][value="${saveKey}"]`).check();
    await front.getByRole('button',{name:'Charger',exact:true}).click();
    await expectWorld(page,initial);await pause(page);await expectWorld(page,initial);
    report.backend=await page.evaluate(()=>window.__lisiere.backend);expect(report.backend).toBe('WebGPU');
    await expect(page.locator('#colonists [data-pawn]')).toHaveCount(4);
    await saveAndLoad(page,initial);

    report.stage='recruit-inspection';
    await inspectPerson(page,recruit.id);
    await expect(page.locator('#selected-name')).toHaveText(recruit.name);
    await expect(page.locator('#toggle-draft')).toBeVisible();
    await expect(page.locator('#prisoner-inspection')).toHaveCount(0);
    await expect(page.locator('#fps-counter')).toBeVisible();
    await page.screenshot({path:'artifacts/prison-colony-native-v86.png'});
    report.recruit={id:recruit.id,name:recruit.name,provenance:recruit.recruitment,
      bedId:recruit.bedId,health:recruit.health,hunger:recruit.hunger,rest:recruit.rest,
      action:await page.locator('#selected-action').textContent()};

    report.stage='assigned-bed';
    await inspectBed(page,bed!,recruit.id,initial.pawns.length+4);
    await expect(page.locator('#bed-owner')).toHaveValue(String(recruit.id));
    await expect(page.locator('#bed-prisoner')).not.toBeChecked();
    await expect(page.locator('#bed-medical')).not.toBeChecked();
    await page.screenshot({path:'artifacts/prison-colony-native-bed-v86.png'});
    report.bed={id:bed!.id,x:bed!.x,z:bed!.z,orientation:bed!.orientation,ownerId:recruit.id};

    report.stage='work-priorities';
    await panel(page,'work');
    for(const work of ['haul','grow','warden'] as const) {
      await expect(page.locator(`select[data-owner="${recruit.id}"][data-work="${work}"]`)).toHaveValue(String(recruit.priorities[work]));
    }
    report.priorities=recruit.priorities;
    await page.screenshot({path:'artifacts/prison-colony-native-work-v86.png'});
    await page.keyboard.press('Escape');
    // Inspection and reading existing controls must not rewrite this real save.
    await expectWorld(page,initial);

    report.stage='continuation';
    await page.locator('[data-speed="6"]').click();
    await expect(page.locator('[data-speed="6"]')).toHaveAttribute('aria-pressed','true');
    await page.waitForFunction(tick=>window.__lisiere.tick>=tick,initial.tick+120,{timeout:30000});
    await pause(page);
    const continued=await world(page),afterRecruit=continued.pawns.find(p=>p.id===recruit.id)!;
    expect(continued.tick-initial.tick).toBeGreaterThanOrEqual(120);
    expect(validateWorld(continued)).toEqual([]);
    expect(continued.pawns.filter(p=>isColonist(p)&&p.state!=='dead').map(p=>p.id)).toEqual(colonists.map(p=>p.id));
    expect(afterRecruit.recruitment).toEqual(recruit.recruitment);expect(afterRecruit.prisoner).toBeUndefined();
    expect(afterRecruit.bedId).toBe(recruit.bedId);expect(afterRecruit.priorities).toEqual(recruit.priorities);
    expect(continued.scenario).toEqual(initial.scenario);expect(continued.gameProfile).toEqual(initial.gameProfile);
    await saveAndLoad(page,continued);
    report.continuation={requestedTicks:120,actualTicks:continued.tick-initial.tick,speed:6,
      finalTick:continued.tick,exactSaveReload:true,recruitState:afterRecruit.state,
      hunger:afterRecruit.hunger,rest:afterRecruit.rest};
    await inspectPerson(page,recruit.id);await expect(page.locator('#selected-name')).toHaveText(recruit.name);
    await page.screenshot({path:'artifacts/prison-colony-native-continued-v86.png'});
    expect(errors).toEqual([]);report.status='passed';report.stage='complete';
  } catch(error) {
    report.status='failed';report.failure=String(error);
    const tag=`prison-colony-native-failed-v86-${Date.now()}`;
    await page.screenshot({path:`artifacts/${tag}.png`}).catch(()=>{});
    const state=await world(page).catch(()=>undefined);
    if(state){report.failureCheckpoint=`tmp/${tag}.json`;writeFileSync(String(report.failureCheckpoint),JSON.stringify(state));report.failureTick=state.tick;report.validation=validateWorld(state);}
    report.notice=await page.locator('#notice').textContent().catch(()=>null);
    writeFileSync(`artifacts/${tag}.json`,JSON.stringify({...report,errors},null,2));
    throw error;
  } finally {
    writeFileSync(reportPath,JSON.stringify({...report,errors},null,2));await browser.close();
  }
});
