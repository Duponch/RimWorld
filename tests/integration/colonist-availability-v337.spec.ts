import {expect,test,type Page} from '@playwright/test';
import {writeFile} from 'node:fs/promises';
import {applyCommand,stepWorld} from '../../src/sim/engine';
import {createScenarioWorld} from '../../src/sim/new-game';
import {addMaterial} from '../../src/sim/materials';
import {tryGroupDeparture} from '../../src/sim/group-driver';
import {deserializeWorld,serializeWorld,validateWorld} from '../../src/sim/serialization';
import type {Pawn,World} from '../../src/sim/types';
import {readColonistAvailability} from '../../src/ui/colonist-availability';
import {medicalCamp,controlledInjury} from '../scenarios/health';
import {commercialCamp} from '../helpers/commercial-v193';
import {expectWorld,observeErrors,panel,pause,saveKey,world} from './helpers';

// Explicitly prepared checkpoints. Clinical injury and outside ownership use
// real producers; this pilot certifies UI composition, not a played campaign.
function downLocals(w:World){for(const p of w.pawns){controlledInjury(w,p,'left-leg',30000,'crush');controlledInjury(w,p,'right-leg',30000,'crush');}}
function scoutCheckpoint(){
  const {world:w,pawnId,foodId}=commercialCamp();
  expect(applyCommand(w,{type:'scout-start',pawnId,pileId:foodId,quantity:2}).ok).toBe(true);
  for(let n=0;n<1200&&w.scout?.phase!=='travelling';n++)stepWorld(w);
  expect(w.scout?.phase).toBe('travelling');downLocals(w);return w;
}
function commercialCheckpoint(){
  const {world:w,pawnId,foodId}=commercialCamp();
  expect(applyCommand(w,{type:'commercial-start',pawnId,foodPileId:foodId,quantity:2,silver:100}).ok).toBe(true);
  for(let n=0;n<1200&&w.commercialTrip?.phase!=='at-post';n++)stepWorld(w);
  expect(w.commercialTrip?.phase).toBe('at-post');downLocals(w);return w;
}
function groupCheckpoint(){
  const w=createScenarioWorld(337,32,'crashlanded');
  for(const p of w.pawns){delete p.health;delete p.background;delete p.traits;p.hunger=95;p.rest=95;p.recreation.level=100;p.apparelAutomation=false;p.schedule.fill('work');
    for(const key of Object.keys(p.priorities) as (keyof Pawn['priorities'])[])p.priorities[key]=0;}
  const members=w.pawns.slice(0,2),resident=w.pawns[2]!;
  addMaterial(w,'food',members.length,{type:'inventory',pawnId:members[0]!.id},'survival-meal');
  expect(applyCommand(w,{type:'planet-adopt'}).ok).toBe(true);
  expect(applyCommand(w,{type:'group-start',memberIds:members.map(p=>p.id),destination:w.planet!.civilianTile,sources:[]}).ok).toBe(true);
  const formation=w.group;if(!formation||!('exits' in formation))throw Error('Missing actual group formation');formation.phase='leaving';
  // Only the movement frontier is prepared; original people/possessions are
  // then transferred by the same atomic producer as an ordinary departure.
  for(const exit of formation.exits){const p=w.pawns.find(p=>p.id===exit.pawnId)!;if(!exit.cell)throw Error('Missing legal exit');
    p.x=exit.cell.x;p.z=exit.cell.z;p.state='idle';p.path=[];p.moveCooldown=0;p.planCooldown=0;delete p.motion;}
  tryGroupDeparture(w);const group=w.group;if(!group||!('members' in group))throw Error('Missing original outside owner');
  group.phase='at-site';group.tile=w.planet!.civilianTile;group.destination=group.tile;group.route=[group.tile];group.segment=null;group.stop={kind:'at-site'};
  // Admission requires a capable resident. Only after the true departure do
  // we prepare a clinical local death, leaving actual living travellers.
  controlledInjury(w,resident,'head',50000,'crush');expect(resident.state).toBe('dead');
  return w;
}
async function guideAction(page:Page){
  const guide=page.locator('.learning-readout'),row=page.locator('[data-first-day-section="work"]');
  if(!await guide.evaluate(n=>(n as HTMLDetailsElement).open))await guide.locator(':scope > summary').click();
  await expect(page.locator('[data-first-day-section]')).toHaveCount(7);
  if(!await row.evaluate(n=>(n as HTMLDetailsElement).open))await row.locator(':scope > summary').click();
  await row.getByRole('button').click();await expect(guide).not.toHaveAttribute('open','');
}
async function centered(page:Page,id:number){
  await expect.poll(()=>page.evaluate(id=>{const p=window.__lisiere.world.pawns.find(p=>p.id===id)!;
    const point=window.__lisiere.projectCell(p.x,p.z),box=document.querySelector('#viewport canvas')!.getBoundingClientRect();return Math.hypot(point.x-box.width/2,point.y-box.height/2);},id)).toBeLessThan(1);
}

test('V337 prepared native absence: health focus, true voyage views, menu after click, living clock and exact reloads',async({playwright},info)=>{
  test.setTimeout(180000);
  const local=medicalCamp(2,16);downLocals(local);
  const dead=medicalCamp(1,16);controlledInjury(dead,dead.pawns[0]!,'head',50000,'crush');expect(dead.pawns[0]!.state).toBe('dead');
  const scenarios=[{name:'downed',initial:local},{name:'scout',initial:scoutCheckpoint()},{name:'commerce',initial:commercialCheckpoint()},{name:'group',initial:groupCheckpoint()},
    {name:'confirmed-death',initial:dead},{name:'empty-history',initial:medicalCamp(0,16)}];
  const browser=await playwright.chromium.launch({channel:'chrome'}),evidence:unknown[]=[];
  try{for(const {name,initial} of scenarios){
    expect(validateWorld(initial),`${name}: prepared checkpoint is valid`).toEqual([]);
    const context=await browser.newContext({baseURL:process.env.LISIERE_BASE_URL??'http://127.0.0.1:5410',viewport:{width:1440,height:1000}});
    const page=await context.newPage(),errors=observeErrors(page);page.setDefaultTimeout(20000);
    try{
      await page.addInitScript(({key,data})=>localStorage.setItem(key,data),{key:saveKey,data:serializeWorld(initial)});
      await page.goto('/?scenario=camp&size=32&seed=337&e2e');await expect(page.locator('#loading')).toHaveCount(0);
      await pause(page);await panel(page,'menu');await page.locator('#load').click();await expectWorld(page,initial);await page.keyboard.press('Escape');
      expect(await page.evaluate(()=>window.__lisiere.backend)).toBe('WebGPU');
      const alert=page.locator('[data-alert="colonist-availability"]');await expect(alert).toContainText(name==='confirmed-death'||name==='empty-history'?'Aucun colon vivant actuellement recensé':'Aucun colon libre');
      if(name==='downed'){
        await alert.focus();await alert.press('Enter');await centered(page,initial.pawns[0]!.id);
        await expect(page.locator('[data-colonist-tab="health"]')).toHaveAttribute('aria-selected','true');await expect(alert).toBeFocused();
        await page.keyboard.press('Escape');await guideAction(page);await centered(page,initial.pawns[0]!.id);
        await expect(page.locator('[data-colonist-tab="health"]')).toHaveAttribute('aria-selected','true');
      }else if(name==='scout'||name==='commerce'||name==='group'){
        const tab=name==='group'?'group':'individual',opposite=tab==='group'?'individual':'group';
        await panel(page,'world');await page.locator(`[data-world-tab="${opposite}"]`).click();await page.keyboard.press('Escape');
        const away=readColonistAvailability(initial);if(away.kind!=='unavailable'||!away.away.length)throw Error('Missing real outside identity');
        await page.locator(`[data-alert="availability-away:${away.away[0]!.id}"]`).click();
        await expect(page.locator(`[data-world-tab="${tab}"]`)).toHaveAttribute('aria-selected','true');await expect(page.locator('#world-panel')).toBeVisible();
        await page.locator(`[data-world-tab="${opposite}"]`).click();await page.keyboard.press('Escape');
        if(name==='group'){await guideAction(page);await expect(page.locator('[data-world-tab="group"]')).toHaveAttribute('aria-selected','true');}
        else{ // The guide correctly prefers the actual injured person still on-map.
          await guideAction(page);await centered(page,initial.pawns[0]!.id);await expect(page.locator('[data-colonist-tab="health"]')).toHaveAttribute('aria-selected','true');
        }
      }else{
        if(name==='empty-history')await expect(page.locator('[data-alert^="availability-death:"]')).toHaveCount(0);
        else await expect(page.locator('[data-alert^="availability-death:"]')).toHaveCount(1);
        await alert.focus();await alert.press('Space');await expect(page.locator('#menu-panel')).toBeVisible();
        await page.keyboard.press('Escape');await guideAction(page);await expect(page.locator('#menu-panel')).toBeVisible();
      }
      await page.keyboard.press('Escape');await expectWorld(page,initial);
      // An explanatory HUD must not stop the simulation or create a defeat
      // command. Only opening Menu uses the player's existing pause path.
      await page.locator('[data-speed="1"]').click();await expect.poll(()=>page.evaluate(()=>window.__lisiere.tick)).toBeGreaterThan(initial.tick+2);
      await expect(page.locator('[data-speed="1"]')).toHaveAttribute('aria-pressed','true');await pause(page);
      const continued=await world(page);expect(validateWorld(continued)).toEqual([]);expect(readColonistAvailability(continued).kind).toBe('unavailable');
      await page.screenshot({path:info.outputPath(`${name}.png`)});
      await panel(page,'menu');await page.locator('#save').click();await page.locator('#load').click();await expectWorld(page,continued);await page.keyboard.press('Escape');
      await expect(page.locator('[data-alert="colonist-availability"]')).toBeVisible();
      const manager=page.locator('[data-save-manager]');await panel(page,'menu');const download=page.waitForEvent('download');await manager.locator('[data-save-manager-action="export"]').click();
      const file=await download,path=info.outputPath(`${name}.json`);await file.saveAs(path);
      const {readFile}=await import('node:fs/promises');expect(deserializeWorld(await readFile(path,'utf8'))).toEqual(continued);
      expect(errors).toEqual([]);evidence.push({name,prepared:true,backend:'WebGPU',initialTick:initial.tick,continuedTick:continued.tick,availability:readColonistAvailability(continued),reloadExact:true,errors});
    }finally{await context.close();}
  }}finally{await browser.close();await writeFile(info.outputPath('availability-summary.json'),JSON.stringify(evidence,null,2));}
});
