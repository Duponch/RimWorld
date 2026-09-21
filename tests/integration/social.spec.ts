import { expect,test } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import { medicalCamp } from '../scenarios/health';
import { applyCommand } from '../../src/sim/engine';
import { serializeWorld,validateWorld } from '../../src/sim/serialization';
import { addMaterial,refreshStock } from '../../src/sim/materials';
import { opinionOf,socialSeed } from '../../src/sim/social-state';
import { observeErrors,panel,pawnTab,saveKey,world,expectWorld } from './helpers';
import { perform } from './player-actions';

test('native UI 1x/6x: physical builders exchange, directed opinions and XP inspected, work and memories survive save/reload',async({playwright})=>{
  test.setTimeout(120000);const browser=await playwright.chromium.launch({channel:'chromium',args:[]}),proof=[];
  try{for(const speed of [1,6]){
    const initial=medicalCamp(2),jobs:number[]=[];
    initial.pawns.forEach((p,i)=>{p.name=i?'Noé':'Ada';p.x=12+i*3;p.z=14;p.priorities.build=1;p.skills.social={level:i?20:0,xp:0,dailyXp:0,passion:1};p.social={rng:socialSeed(initial.seed,p.id),wants:true,memories:[]};
      expect(applyCommand(initial,{type:'designate',kind:'bed',material:'wood',x:p.x,z:p.z+1}).ok).toBe(true);const job=initial.jobs.at(-1)!;jobs.push(job.id);job.construction='frame';addMaterial(initial,'wood',45,{type:'job',jobId:job.id});
    });refreshStock(initial);
    const page=await browser.newPage({baseURL:'http://127.0.0.1:5173',viewport:{width:1440,height:1000}}),errors=observeErrors(page);page.setDefaultTimeout(15000);
    await page.addInitScript(({key,data})=>localStorage.setItem(key,data),{key:saveKey,data:serializeWorld(initial)});
    await page.goto('/?scenario=camp&e2e&size=32');await expect(page.locator('#loading')).toHaveCount(0);await page.locator('[data-speed="0"]').click();await panel(page,'menu');await page.locator('#load').click();await expectWorld(page,initial);await page.keyboard.press('Escape');
    for(let i=0;i<2;i++)await perform(page,{reason:'Deux chantiers proches permettent aux bâtisseurs de se croiser.',command:{type:'order-job',pawnId:initial.pawns[i]!.id,jobId:jobs[i]!,queue:false}},{value:0});
    await page.locator(`[data-speed="${speed}"]`).click();await expect.poll(async()=>(await world(page)).pawns[0]!.social?.memories.length??0,{intervals:[100]}).toBeGreaterThan(0);await page.locator('[data-speed="0"]').click();
    const exchanged=await world(page),[a,b]=exchanged.pawns;expect(validateWorld(exchanged)).toEqual([]);expect(exchanged.jobs.every(j=>j.progress>0)).toBe(true);expect(a!.jobId).toBe(jobs[0]);expect(b!.jobId).toBe(jobs[1]);expect(opinionOf(a!,b!.id,exchanged.tick)).toBeGreaterThan(0);expect(exchanged.pawns.some(p=>(p.skills.social?.xp??0)>0)).toBe(true);
    await page.locator(`[data-pawn="${a!.id}"]`).click();await pawnTab(page,'social');await expect(page.locator(`[data-social-pawn="${b!.id}"]`)).toContainText('Noé');await expect(page.locator('#social-last')).toContainText('avec Noé');await expect(page.locator('#social-skill')).toContainText('Impact 82 %');
    await page.locator('#social-last').scrollIntoViewIfNeeded();await page.screenshot({path:`artifacts/social-v70-${speed}x.png`});
    await panel(page,'menu');await page.locator('#save').click();await page.locator('#load').click();await expectWorld(page,exchanged);await page.keyboard.press('Escape');await page.locator(`[data-speed="${speed}"]`).click();await expect.poll(async()=>(await world(page)).tick).toBeGreaterThan(exchanged.tick+15);await page.locator('[data-speed="0"]').click();
    const after=await world(page);expect(validateWorld(after)).toEqual([]);expect(after.jobs[0]!.progress).toBeGreaterThan(exchanged.jobs[0]!.progress);expect(after.pawns[0]!.social!.memories.length).toBeGreaterThan(0);expect(errors).toEqual([]);
    proof.push({speed,controlledPendingIntent:true,tick:exchanged.tick,afterTick:after.tick,jobs:after.jobs.map(j=>({id:j.id,progress:j.progress})),social:after.pawns.map(p=>({id:p.id,social:p.social,skill:p.skills.social})),errors});await page.close();
  }}finally{await browser.close();}
  writeFileSync('artifacts/social-ui-v70.json',JSON.stringify({date:new Date().toISOString(),proof},null,2)+'\n');
});
