import { expect,test } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import { medicalCamp } from '../scenarios/health';
import { applyCommand } from '../../src/sim/engine';
import { serializeWorld,validateWorld } from '../../src/sim/serialization';
import { addMaterial,refreshStock } from '../../src/sim/materials';
import { initialSkills } from '../../src/sim/skills';
import { enableArrivals } from '../../src/sim/arrivals';
import { TRAITS } from '../../src/sim/traits';
import { observeErrors,panel,saveKey,world,expectWorld } from './helpers';
import { perform } from './player-actions';

test('personality in real UI: new camp, comparable physical work, thoughts, schedule choice, arrival preview and continuation at 1x/6x',async({playwright})=>{
  test.setTimeout(150000);const browser=await playwright.chromium.launch({channel:'chromium',args:[]}),proof=[];
  try{for(const speed of [1,6]){
    const initial=medicalCamp(2),jobs:number[]=[];
    initial.pawns.forEach((p,i)=>{p.x=10+i*8;p.z=12;p.priorities.build=1;p.skills=initialSkills(8,1,initial.tick);p.mood=50;p.traits=i===0?['optimist','fast-learner']:['nervous','slow-learner'];
      expect(applyCommand(initial,{type:'designate',kind:'bed',material:'wood',x:p.x+3,z:p.z}).ok).toBe(true);const j=initial.jobs.at(-1)!;jobs.push(j.id);j.construction='frame';addMaterial(initial,'wood',45,{type:'job',jobId:j.id});
    });refreshStock(initial);
    const page=await browser.newPage({baseURL:'http://127.0.0.1:5173',viewport:{width:1440,height:1000}}),errors=observeErrors(page);page.setDefaultTimeout(15000);
    await page.addInitScript(({key,data})=>localStorage.setItem(key,data),{key:saveKey,data:serializeWorld(initial)});
    await page.goto('/?e2e&size=32');await expect(page.locator('[data-speed="0"]')).toBeVisible();await expect(page.locator('#loading')).toHaveCount(0);await page.locator('[data-speed="0"]').click();
    const generated=await world(page);expect(generated.pawns.map(p=>p.traits)).toEqual([['optimist','fast-learner'],['steadfast','slow-learner'],['pessimist','nervous']]);
    await panel(page,'menu');await page.locator('#load').click();await expectWorld(page,initial);await page.keyboard.press('Escape');
    const [fast,slow]=initial.pawns;
    await page.locator(`[data-pawn="${fast!.id}"]`).click();await page.locator('.skills-inspection summary').click();
    await expect(page.locator('[data-trait="fast-learner"]')).toContainText('175 %');await expect(page.locator('[data-skill-description]')).toContainText('Apprentissage 175 %');
    await page.locator('#mood-inspection summary').click();await expect(page.locator('[data-thought="trait-optimist"]')).toContainText('+6');
    await page.locator(`[data-pawn="${slow!.id}"]`).click();await expect(page.locator('#mood-break-thresholds')).toContainText('43 / 24.57 / 6.14');
    await perform(page,{reason:'Prévoir des loisirs pour le colon plus sensible aux crises.',command:{type:'schedule-paint',pawnId:slow!.id,hours:[20],assignment:'recreation'}},{value:0});
    for(let i=0;i<2;i++)await perform(page,{reason:'Comparer deux bâtisseurs de même compétence au travail.',command:{type:'order-job',pawnId:initial.pawns[i]!.id,jobId:jobs[i]!,queue:false}},{value:0});
    await page.locator(`[data-speed="${speed}"]`).click();await expect.poll(async()=>(await world(page)).pawns[1]!.skills.construction.xp,{intervals:[100]}).toBeGreaterThan(5000);await page.locator('[data-speed="0"]').click();
    const working=await world(page);expect(working.pawns[0]!.skills.construction.xp).toBe(working.pawns[1]!.skills.construction.xp*7);expect(working.pawns[0]!.mood).toBeGreaterThan(50);
    await panel(page,'menu');await page.locator('#save').click();await page.locator('#load').click();await expectWorld(page,working);await page.keyboard.press('Escape');
    await page.locator(`[data-speed="${speed}"]`).click();await expect.poll(async()=>(await world(page)).structures.filter(s=>s.kind==='bed').length,{timeout:30000}).toBe(2);await page.locator('[data-speed="0"]').click();
    const built=await world(page);expect(validateWorld(built)).toEqual([]);expect(built.jobs).toHaveLength(0);expect(built.piles.filter(p=>p.owner.type==='job')).toHaveLength(0);expect(built.pawns[0]!.skills.construction.xp).toBe(built.pawns[1]!.skills.construction.xp*7);
    // Controlled short calendar, but a real offer generated/accepted by the worker.
    enableArrivals(built);built.arrivals!.nextCheck=built.tick+1;
    await page.evaluate(({key,data})=>localStorage.setItem(key,data),{key:saveKey,data:serializeWorld(built)});await panel(page,'menu');await page.locator('#load').click();await expectWorld(page,built);await page.keyboard.press('Escape');
    await page.locator(`[data-speed="${speed}"]`).click();await expect(page.locator('#arrival-letter')).toBeVisible();await page.locator('[data-speed="0"]').click();const pending=await world(page),offer=pending.arrivals!.pending!;
    await page.locator('#arrival-letter').click();for(const id of offer.traits!)await expect(page.locator('dialog[open]')).toContainText(TRAITS[id].label);await page.locator('#accept-arrival').click();await expect.poll(async()=>(await world(page)).pawns.length).toBe(3);
    const final=await world(page);expect(final.pawns.at(-1)!.traits).toEqual(offer.traits);expect(validateWorld(final)).toEqual([]);
    await page.locator(`[data-pawn="${fast!.id}"]`).click();if(await page.locator('.skills-inspection').getAttribute('open')===null)await page.locator('.skills-inspection summary').click();await page.locator('[data-traits]').scrollIntoViewIfNeeded();await page.screenshot({path:`artifacts/traits-v69-${speed}x.png`});
    await panel(page,'menu');await page.locator('#save').click();await page.locator('#load').click();await expectWorld(page,final);expect(errors).toEqual([]);
    proof.push({speed,generated:generated.pawns.map(p=>({name:p.name,traits:p.traits})),workingTick:working.tick,builtTick:built.tick,finalTick:final.tick,skillXp:built.pawns.map(p=>p.skills.construction.xp),schedule:final.pawns[1]!.schedule,offer,joined:final.pawns.at(-1)!.traits,errors});await page.close();
  }}finally{await browser.close();}
  writeFileSync('artifacts/traits-ui-v69.json',JSON.stringify({date:new Date().toISOString(),controlledWorkAndCalendar:true,proof},null,2)+'\n');
});
