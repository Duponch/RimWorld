import { expect,test } from '@playwright/test';
import { writeFileSync } from 'node:fs';
const proofVersion=process.env.VALIDATION_VERSION??'v54';
import { serializeWorld,validateWorld } from '../../src/sim/index';
import { roofAccidentCamp,medicalCarrier,controlledInjury } from '../scenarios/health';
import { expectWorld,observeErrors,panel,saveKey,world } from './helpers';
import { perform } from './player-actions';
import { careCamp } from '../scenarios/care';
import { damageUnarmoredPawnWithBullet } from '../../src/sim/bullet-damage';

// Observe the actual shared GPU pose inputs after each rendered frame. A correct
// worker state alone cannot prove that a fallen body stopped working visually.
const probe=`
window.__medicalFrames=[];
const medicalFrame=ColonyRenderer.prototype.frame;
ColonyRenderer.prototype.frame=function(...args){const result=medicalFrame.apply(this,args);const g=this.pawns.pawnMesh?.geometry;if(!this.preparing&&g){const m=g.getAttribute('aMotion');window.__medicalFrames.push({tick:this.world.tick,play:this.timeline.tick,roof:this.world.roofing?.constructed.length??0,pawns:this.world.pawns.map((p,i)=>({id:p.id,state:p.state,health:!!p.health,work:m.getY(i),pose:m.getZ(i)}))});if(window.__medicalFrames.length>12000)window.__medicalFrames.shift();}return result;};
`;
test('roof accident and prone cargo remain synchronized; loaded Gunshot wounds receive physical care and survive replay',async({playwright})=>{
  test.setTimeout(90000);const browser=await playwright.chromium.launch({channel:'chromium',args:[]});
  const page=await browser.newPage({baseURL:'http://127.0.0.1:5173',viewport:{width:1440,height:1000}}),errors=observeErrors(page);
  try{
    await page.route('**/src/main.ts*',async route=>{const response=await route.fetch();await route.fulfill({response,body:probe+await response.text()});});
    const initial=roofAccidentCamp();await page.addInitScript(({key,data})=>localStorage.setItem(key,data),{key:saveKey,data:serializeWorld(initial)});
    await page.goto('/?size=32&e2e');await expect(page.locator('#loading')).toHaveCount(0);await page.locator('[data-speed="0"]').click();await panel(page,'menu');await page.locator('#load').click();await expectWorld(page,initial);await page.keyboard.press('Escape');
    await perform(page,{reason:'Retirer le dernier appui sous le toit pour exercer un véritable accident.',command:{type:'designate',kind:'deconstruct',x:14,z:16}},{value:0});
    await page.locator('[data-speed="6"]').click();await expect.poll(async()=>(await world(page)).roofing!.constructed.length).toBe(0);await page.locator('[data-speed="0"]').click();
    const accident=await world(page);expect(accident.pawns.every(p=>!!p.health)).toBe(true);expect(validateWorld(accident)).toEqual([]);
    await page.locator(`[data-pawn="${initial.pawns[0]!.id}"]`).click();await expect(page.locator('#health-inspection')).toContainText('Décédé');await expect(page.locator('[data-health="injuries"]')).not.toHaveText('');await expect(page.locator('#fps-counter')).toBeVisible();await page.screenshot({path:`artifacts/health-roof-${proofVersion}.png`});
    const frames=await page.evaluate(()=> (window as unknown as {__medicalFrames:{tick:number;play:number;roof:number;pawns:{state:string;health:boolean;work:number;pose:number}[]}[]}).__medicalFrames);
    const transition=frames.find(f=>f.pawns.length===2&&f.pawns.every(p=>p.health));expect(transition).toBeDefined();expect(transition!.roof).toBe(0);expect(transition!.tick).toBeLessThanOrEqual(transition!.play);
    const carrier=medicalCarrier(),p=carrier.pawns[0]!;controlledInjury(carrier,p,'left-leg',30000);controlledInjury(carrier,p,'right-leg',30000);expect(validateWorld(carrier)).toEqual([]);
    await page.evaluate(({key,data})=>localStorage.setItem(key,data),{key:saveKey,data:serializeWorld(carrier)});await panel(page,'menu');await page.locator('#load').click();await expectWorld(page,carrier);await page.keyboard.press('Escape');
    await page.locator(`[data-pawn="${p.id}"]`).click();await expect(page.locator('#alerts')).toContainText('à terre');await expect(page.locator('#health-inspection')).toContainText('À terre');
    await page.locator('[data-speed="1"]').click();await expect.poll(async()=>(await world(page)).tick).toBeGreaterThan(carrier.tick+10);await page.locator('[data-speed="0"]').click();const stopped=await world(page);
    await panel(page,'menu');await page.locator('#save').click();await page.locator('#load').click();await expectWorld(page,stopped);await page.keyboard.press('Escape');await page.locator(`[data-pawn="${p.id}"]`).click();await expect(page.locator('#fps-counter')).toHaveText(/\d+ FPS/);await page.screenshot({path:`artifacts/health-downed-${proofVersion}.png`});
    const poses=await page.evaluate(()=> (window as unknown as {__medicalFrames:{pawns:{state:string;work:number;pose:number}[]}[]}).__medicalFrames.flatMap(f=>f.pawns).filter(p=>p.state==='downed'||p.state==='dead'));
    expect(poses.length).toBeGreaterThan(20);expect(poses.every(p=>p.work===0&&p.pose===1)).toBe(true);expect(errors).toEqual([]);
    // Controlled injury fixture, not an in-game shooting command. Exercise the
    // new medical type in the actual worker, inspection and existing care loop.
    const clinic=careCamp(),patient=clinic.pawns[1]!;delete patient.health;
    damageUnarmoredPawnWithBullet(clinic,patient,{part:'left-lung',damage:4});
    await page.evaluate(({key,data})=>localStorage.setItem(key,data),{key:saveKey,data:serializeWorld(clinic)});
    await panel(page,'menu');await page.locator('#load').click();await expectWorld(page,clinic);await page.keyboard.press('Escape');
    await page.locator(`[data-pawn="${patient.id}"]`).click();await expect(page.locator('[data-health="injuries"]')).toContainText('Blessure par balle');
    await page.locator('[data-speed="6"]').click();
    await expect.poll(async()=>{const p=(await world(page)).pawns.find(p=>p.id===patient.id)!;return p.health!.injuries.length===2&&p.health!.injuries.every(i=>i.tended!==undefined);}).toBe(true);
    await page.locator('[data-speed="0"]').click();const treated=await world(page);expect(validateWorld(treated)).toEqual([]);
    expect(treated.pawns[0]!.skills.medicine.xp).toBeGreaterThan(0);
    await panel(page,'menu');await page.locator('#save').click();await page.locator('#load').click();await expectWorld(page,treated);await page.keyboard.press('Escape');
    await page.locator(`[data-pawn="${patient.id}"]`).click();await expect(page.locator('[data-health="injuries"]')).toContainText('Blessure par balle');await expect(page.locator('#fps-counter')).toBeVisible();
    await page.screenshot({path:`artifacts/bullet-care-${proofVersion}.png`});expect(errors).toEqual([]);
    writeFileSync(`artifacts/health-ui-${proofVersion}.json`,JSON.stringify({date:new Date().toISOString(),backend:'native WebGPU',accidentTick:accident.tick,firstVisibleInjury:transition,fallenPoseObservations:poses.length,stopped:stopped.pawns[0],treated:treated.pawns,errors},null,2)+'\n');
  }finally{await browser.close();}
});
