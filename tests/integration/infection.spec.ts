import { expect,test,type Page } from '@playwright/test';
import { readFileSync,writeFileSync } from 'node:fs';
import { deserializeWorld,serializeWorld,validateWorld } from '../../src/sim/serialization';
import { INFECTION_UNIT } from '../../src/sim/infection-rules';
import { infectionNextTendCore } from '../../src/sim/infection-state';
import { infectionSummary } from '../scenarios/infection-player';
import { expectWorld,observeErrors,panel,pause,saveKey,world } from './helpers';
import { perform } from './player-actions';
import type { World } from '../../src/sim/types';

// Checkpoints come from infection-colony.test.ts, which starts with healthy
// combatants and actually plays the wound, rescue, infection and recovery.
// This native journey checks player commands at both speeds across those real
// intervals; it does not claim a second uninterrupted three-day UI simulation.
const version=process.env.VALIDATION_VERSION??'v81';
const checkpoint=(name:string)=>deserializeWorld(readFileSync(`tmp/infection-${name}-${version}.json`,'utf8'));
const medicine=(w:World)=>w.piles.filter(p=>p.kind==='medicine').reduce((n,p)=>n+p.quantity,0);
const probe=`window.__infectionView={working:0,lying:0,carrying:0,wrongFacing:0};
const infectionFrame=ColonyRenderer.prototype.frame;ColonyRenderer.prototype.frame=function(...args){const r=infectionFrame.apply(this,args);if(this.preparing||!this.world)return r;
const b=window.__infectionView,g=this.pawns.pawnMesh?.geometry;if(!g)return r;const m=g.getAttribute('aMotion'),to=g.getAttribute('aTo');
this.world.pawns.forEach((p,i)=>{if(p.health?.infections?.cases.length&&m.getZ(i)===1)b.lying++;
if(p.tend?.medicine?.carryPileId!=null&&this.world.piles.some(q=>q.id===p.tend.medicine.carryPileId&&q.owner.type==='pawn'&&q.owner.pawnId===p.id)&&g.getAttribute('aCargo').getX(i)!==0)b.carrying++;
if(p.tend?.phase==='tend'){const patient=this.world.pawns.find(q=>q.id===p.tend.patientId);if(m.getY(i)===1)b.working++;if(patient&&Math.cos(to.getW(i)-Math.atan2(patient.x-p.x,patient.z-p.z))<.999)b.wrongFacing++;}});return r;};`;

async function load(page:Page,w:World) {
  await pause(page);await page.evaluate(({key,data})=>localStorage.setItem(key,data),{key:saveKey,data:serializeWorld(w)});
  await panel(page,'menu');await page.locator('#load').click();await expectWorld(page,w);await page.keyboard.press('Escape');
}
async function inspect(page:Page,id:number) {
  await page.locator(`[data-pawn="${id}"]`).click();
  if(await page.locator('#health-inspection').getAttribute('open')===null)await page.locator('#health-inspection summary').click();
}

test('native infection care: physical dose/save, actual renewal and convalescence at 1×/6×',async({playwright})=>{
  test.setTimeout(180000);
  const initial=checkpoint('declaration'),renewal=checkpoint('renewal'),immune=checkpoint('immune'),near=checkpoint('near-recovery');
  const patientId=initial.pawns[0]!.id,doctorId=initial.pawns[2]!.id,id=initial.pawns[0]!.health!.infections!.cases[0]!.id;
  const browser=await playwright.chromium.launch({channel:'chromium',args:[]});
  const page=await browser.newPage({baseURL:'http://127.0.0.1:5173',viewport:{width:1440,height:1100}}),errors=observeErrors(page),reports=[];
  page.setDefaultTimeout(12000);
  try {
    await page.addInitScript(({key,data})=>localStorage.setItem(key,data),{key:saveKey,data:serializeWorld(initial)});
    await page.addInitScript(()=>{
      const state=window as any;state.__infectionPipelines=0;
      for(const key of ['createRenderPipeline','createRenderPipelineAsync'] as const){const fn=GPUDevice.prototype[key];(GPUDevice.prototype as any)[key]=function(...args:any[]){state.__infectionPipelines++;return (fn as any).apply(this,args);};}
    });
    await page.route('**/src/main.ts*',async route=>{const response=await route.fetch();await route.fulfill({response,body:probe+await response.text()});});
    await page.goto('/?scenario=camp&e2e&size=32');await expect(page.locator('#loading')).toHaveCount(0);await pause(page);
    for(const speed of [1,6]) {
      await load(page,initial);await inspect(page,patientId);
      const row=page.locator(`[data-infection="${id}"]`),immunity=page.locator('[data-health="immunity"]');
      await expect(row).toContainText('infection mineure');await expect(row).toContainText('Aucun soin actif');await expect(row).toContainText('Nouveau soin possible maintenant');
      await expect(immunity).toContainText('Immunité commune');await expect(page.locator('#health-inspection')).toContainText('Pied gauche');
      await perform(page,{reason:'Réveiller la médecin pour traiter l’infection déclarée.',command:{type:'order-tend',pawnId:doctorId,patientId,queue:false}},{value:0});
      await page.keyboard.press('Escape');await page.locator(`[data-speed="${speed}"]`).click();
      await page.waitForFunction(id=>{
        const w=window.__lisiere.world;if(!w.piles.some(p=>p.kind==='medicine'&&p.owner.type==='pawn'&&p.owner.pawnId===id))return false;
        (document.querySelector('[data-speed="0"]') as HTMLButtonElement).click();return true;
      },doctorId,{polling:'raf',timeout:25000});
      await expect(page.locator('[data-speed="0"]')).toHaveAttribute('aria-pressed','true');
      const carrying=await world(page);expect(validateWorld(carrying)).toEqual([]);
      expect(medicine(carrying)).toBe(medicine(initial));expect(carrying.pawns[0]!.health!.infections!.cases[0]!.tend).toBeUndefined();
      await panel(page,'menu');await page.locator('#save').click();await page.locator('#load').click();await expectWorld(page,carrying);await page.keyboard.press('Escape');
      const pipelines=await page.evaluate(()=>{(window as any).__infectionView={working:0,lying:0,carrying:0,wrongFacing:0};return (window as any).__infectionPipelines as number;});
      await page.locator(`[data-speed="${speed}"]`).click();
      await expect.poll(async()=>(await world(page)).pawns[0]!.health!.infections!.cases[0]!.tend,{timeout:25000}).toBeDefined();await pause(page);
      const treated=await world(page);expect(medicine(treated)).toBe(medicine(initial)-1);expect(validateWorld(treated)).toEqual([]);
      expect(treated.pawns[2]!.skills.medicine.xp).toBeGreaterThan(initial.pawns[2]!.skills.medicine.xp);
      await inspect(page,patientId);await expect(row).toContainText('Soin actif');await expect(row).toContainText('Renouvellement dans');
      const presentation=await page.evaluate(()=>(window as any).__infectionView as {working:number;lying:number;carrying:number;wrongFacing:number});
      expect(presentation.working).toBeGreaterThan(0);expect(presentation.lying).toBeGreaterThan(0);expect(presentation.carrying).toBeGreaterThan(0);expect(presentation.wrongFacing).toBe(0);
      const pipelinesAdded=await page.evaluate(()=>(window as any).__infectionPipelines as number)-pipelines;expect(pipelinesAdded).toBe(0);
      await page.locator('[data-health="infections"]').scrollIntoViewIfNeeded();await expect(row).toBeVisible();
      await page.screenshot({path:`artifacts/infection-care-${speed}x-${version}.png`});

      await load(page,renewal);await inspect(page,patientId);await expect(row).toContainText('Renouvellement dans');
      // Temporarily disable automatic care through the real Work table so the
      // player can observe the eligibility boundary and choose the next care.
      await perform(page,{reason:'Choisir explicitement le prochain renouvellement.',command:{type:'priority',pawnId:doctorId,work:'doctor',value:0}},{value:0});
      await page.keyboard.press('Escape');const nextCore=infectionNextTendCore(renewal.pawns[0]!.health!.infections!.cases[0]!);
      await page.locator(`[data-speed="${speed}"]`).click();await expect.poll(async()=>(await world(page)).pawns[0]!.health!.tick*10).toBeGreaterThanOrEqual(nextCore);await pause(page);
      await inspect(page,patientId);await expect(row).toContainText('Nouveau soin possible maintenant');
      await perform(page,{reason:'Rendre la médecin disponible pour le soin suivant.',command:{type:'priority',pawnId:doctorId,work:'doctor',value:1}},{value:0});
      await perform(page,{reason:'Renouveler le soin admissible, sans dose à distance.',command:{type:'order-tend',pawnId:doctorId,patientId,queue:false}},{value:0});
      await page.keyboard.press('Escape');await page.locator(`[data-speed="${speed}"]`).click();
      const oldExpiry=renewal.pawns[0]!.health!.infections!.cases[0]!.tend!.expiresAtCore;
      await expect.poll(async()=>(await world(page)).pawns[0]!.health!.infections!.cases[0]!.tend!.expiresAtCore,{timeout:25000}).toBeGreaterThan(oldExpiry);await pause(page);
      const renewed=await world(page);expect(medicine(renewed)).toBe(medicine(renewal)-1);expect(validateWorld(renewed)).toEqual([]);

      await load(page,immune);await inspect(page,patientId);await expect(immunity).toContainText('100.0 %');await expect(immunity).toContainText('convalescence en cours');
      await expect(row).toContainText('Aucun nouveau soin nécessaire');expect(immune.pawns[0]!.health!.infections!.cases[0]!.severity).toBeGreaterThan(0);
      await load(page,near);await inspect(page,patientId);await expect(row).toBeVisible();await page.locator(`[data-speed="${speed}"]`).click();
      await expect.poll(async()=>(await world(page)).pawns[0]!.health!.infections!.cases.length,{timeout:25000}).toBe(0);await pause(page);
      const recovered=await world(page);expect(validateWorld(recovered)).toEqual([]);expect(medicine(recovered)).toBe(medicine(near));
      expect(recovered.pawns[0]!.health!.infections!.immunity).toBeLessThan(INFECTION_UNIT);await expect(row).toHaveCount(0);await expect(immunity).toContainText('Infection résolue');
      await panel(page,'menu');await page.locator('#save').click();await page.locator('#load').click();await expectWorld(page,recovered);await page.keyboard.press('Escape');await inspect(page,patientId);
      await expect(page.locator('#fps-counter')).toBeVisible();await page.screenshot({path:`artifacts/infection-recovery-${speed}x-${version}.png`});
      reports.push({speed,provenance:{seed:initial.seed,declaration:initial.tick,renewal:renewal.tick,immune:immune.tick,nearRecovery:near.tick},carrySavedAt:carrying.tick,treated:infectionSummary(treated),renewed:infectionSummary(renewed),recovered:infectionSummary(recovered),presentation,pipelinesAdded});
    }
    expect(errors).toEqual([]);
    writeFileSync(`artifacts/infection-ui-${version}.json`,JSON.stringify({date:new Date().toISOString(),backend:'native WebGPU',scope:'Player-driven care intervals from genuine core journey checkpoints; not a continuous multi-day UI run.',reports,errors},null,2));
  } finally {await browser.close();}
});
