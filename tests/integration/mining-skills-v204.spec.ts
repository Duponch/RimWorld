import { readFileSync } from 'node:fs';
import { test,expect } from '@playwright/test';
import { deserializeWorld,validateWorld } from '../../src/sim/serialization';
import { TEST_COLONY_COUNT } from '../test-colony-count';
import { MINING_SKILLS_CELLS,MINING_SKILLS_DEMO_PATH,MINING_SKILLS_DEMO_ID } from '../../scripts/create-mining-skills-v204-test-save';
import { testOutputPath,writeTestFile } from '../test-output';
import { cell,expectWorld,observeErrors,panel,pause,pawnTab,saveKey,tool,world } from './helpers';
import { revealCells } from './player-actions';

test('Minage V204 : profil, XP au contact, coup rapide repris et métal physiquement rangé en WebGPU',async({playwright})=>{
  test.setTimeout(150_000);
  const prepared=deserializeWorld(readFileSync(MINING_SKILLS_DEMO_PATH,'utf8'));
  expect(validateWorld(prepared)).toEqual([]);expect(prepared.jobs).toHaveLength(0);
  const expert=prepared.pawns[2]!,target=MINING_SKILLS_CELLS.expertSteel,index=target.z*prepared.width+target.x;
  expect(expert.skills.mining).toEqual({level:20,xp:0,dailyXp:0,passion:2});
  const browser=await playwright.chromium.launch({channel:'chromium',headless:true,args:[]});
  const page=await browser.newPage({baseURL:'http://127.0.0.1:5173',viewport:{width:1440,height:1000}}),errors=observeErrors(page);
  try{
    await page.addInitScript(()=>{
      const probe={pipelines:0,hooked:false};(window as any).__v204Probe=probe;
      const device=(globalThis as any).GPUDevice?.prototype;
      if(device)for(const name of ['createRenderPipeline','createRenderPipelineAsync']){
        const original=device[name];device[name]=function(...args:any[]){probe.pipelines++;return Reflect.apply(original,this,args);};probe.hooked=true;
      }
    });
    await page.goto('/?e2e');const front=page.locator('.front-menu');
    await front.getByRole('button',{name:'Charger une partie',exact:true}).click();
    await front.getByRole('button',{name:'Colonies de test',exact:true}).click();
    await expect(front.locator('input[name="test-colony"]')).toHaveCount(TEST_COLONY_COUNT);expect(TEST_COLONY_COUNT).toBe(50);
    await front.locator(`input[name="test-colony"][value="${MINING_SKILLS_DEMO_ID}"]`).check();
    await front.getByRole('button',{name:'Charger cette colonie',exact:true}).click();await expectWorld(page,prepared);await pause(page);
    expect(await page.evaluate(()=>window.__lisiere.backend)).toBe('WebGPU');await expect(page.locator('#fps-counter')).toBeVisible();
    await page.locator(`[data-pawn="${expert.id}"]`).click();await pawnTab(page,'bio');
    const entry=page.locator('[data-skill-entry="mining"]');await expect(entry).toBeVisible();
    await expect(page.locator('[data-skill="mining"]')).toHaveAttribute('aria-label','Minage 20/20 · Passion brûlante');
    const order=await page.locator('[data-skill-entry]').evaluateAll(nodes=>nodes.map(n=>(n as HTMLElement).dataset.skillEntry));
    expect(order.slice(2,5)).toEqual(['construction','mining','cooking']);expect(order).toHaveLength(12);
    await entry.hover();await expect(page.locator('#game-tooltip')).toBeVisible();
    await expect(page.locator('#game-tooltip')).toContainText('Vitesse');await expect(page.locator('#game-tooltip')).toContainText('avant lumière');
    await expect(page.locator('#game-tooltip')).toContainText('Rendement minéral 113 %');
    await expect(page.locator('#game-tooltip')).toContainText('pondérée par les dégâts');
    await expect(page.locator('#game-tooltip')).toContainText('Expérience du niveau');
    await page.screenshot({path:testOutputPath('artifacts/mining-v204-bio.png')});await page.keyboard.press('Escape');
    await panel(page,'work');const control=page.locator(`[data-owner="${expert.id}"][data-work="mine"]`);
    await control.hover();await expect(page.locator('#game-tooltip')).toContainText('Minage 20/20');
    await expect(page.locator('#game-tooltip')).toContainText('rendement minéral 113 %');await control.selectOption('1');
    await tool(page,'mine');await revealCells(page,[target]);await cell(page,target.x,target.z);await page.keyboard.press('Escape');
    await expect.poll(async()=>(await world(page)).jobs.some(j=>j.kind==='mine'&&j.x===target.x&&j.z===target.z)).toBe(true);
    const designated=await world(page);expect(designated.pawns[2]!.skills.mining!.xp).toBe(0);expect(designated.tiles[index]!.miningDamage).toBeUndefined();
    const pipelinesBefore=await page.evaluate(()=>(window as any).__v204Probe.pipelines);
    await page.evaluate(({id,index})=>{
      const samples:any[]=[];(window as any).__v204Samples=samples;
      (window as any).__v204Timer=setInterval(()=>{
        const w=window.__lisiere?.world;if(!w)return;const p=w.pawns.find(p=>p.id===id);if(!p)return;
        const job=w.jobs.find(j=>j.id===p.jobId),last=samples.at(-1);if(last?.tick===w.tick)return;
        samples.push({tick:w.tick,x:p.x,z:p.z,state:p.state,xp:p.skills.mining?.xp,damage:w.tiles[index]?.miningDamage??0,pickTicks:job?.pickTicks,progress:job?.progress});
      },20);
    },{id:expert.id,index});
    await page.locator('[data-speed="1"]').click();
    await page.waitForFunction(({id,index})=>{
      const w=window.__lisiere.world,p=w.pawns.find(p=>p.id===id)!,job=w.jobs.find(j=>j.id===p.jobId);
      if((w.tiles[index]!.miningDamage??0)>=80&&job?.pickTicks!==undefined&&job.pickTicks<100&&job.progress>0){
        (document.querySelector('[data-speed="0"]') as HTMLButtonElement).click();return true;
      }return false;
    },{id:expert.id,index},{polling:20});await pause(page);
    const checkpoint=await world(page),working=checkpoint.pawns.find(p=>p.id===expert.id)!,stroke=checkpoint.jobs.find(j=>j.id===working.jobId)!;
    expect(validateWorld(checkpoint)).toEqual([]);expect(checkpoint.tiles[index]!.terrain).toBe('rock');
    expect(checkpoint.tiles[index]!.miningYield).toBeGreaterThan(0);expect(stroke.pickTicks).toBeLessThan(100);expect(stroke.progress).toBeGreaterThan(0);
    expect(checkpoint.piles.some(p=>p.item==='steel')).toBe(false);
    const samples=await page.evaluate(()=>(window as any).__v204Samples as {tick:number;x:number;z:number;state:string;xp:number;damage:number}[]);
    // Level20 can forget while walking. A negative balance is not absence of
    // practice: prove a positive XP transition only at executable contact.
    expect(samples.some(s=>(s.x!==expert.x||s.z!==expert.z)&&s.state!=='working'&&s.damage===0&&s.xp<=0)).toBe(true);
    const learning=samples.filter((s,i)=>i>0&&s.xp>samples[i-1]!.xp);
    expect(learning.length).toBeGreaterThan(0);
    expect(learning.every(s=>s.state==='working'&&Math.max(Math.abs(s.x-target.x),Math.abs(s.z-target.z))<=1)).toBe(true);
    expect(samples.every(s=>s.damage===0||Math.max(Math.abs(s.x-target.x),Math.abs(s.z-target.z))<=1)).toBe(true);
    await page.locator(`[data-pawn="${expert.id}"]`).click();await pawnTab(page,'bio');await entry.focus();
    await expect(page.locator('#game-tooltip')).toBeVisible();await expect(page.locator('#game-tooltip')).toContainText(`${(working.skills.mining!.xp/1000).toFixed(1)} /`);
    await page.screenshot({path:testOutputPath('artifacts/mining-v204-contact-xp.png')});
    await panel(page,'menu');await page.locator('#save').click();
    await expect.poll(()=>page.evaluate(key=>{const raw=window.__lisiere.saveRepository.peekItem(key);return raw?JSON.parse(raw).tick:null;},saveKey)).toBe(checkpoint.tick);
    const saved=deserializeWorld((await page.evaluate(key=>window.__lisiere.saveRepository.peekItem(key),saveKey))!);expect(saved).toEqual(checkpoint);
    await page.locator('#load').click();await expectWorld(page,saved);await page.keyboard.press('Escape');
    await page.locator('[data-speed="6"]').click();await page.waitForFunction(index=>window.__lisiere.world.tiles[index]!.terrain==='rough-stone',index);
    await page.waitForFunction(store=>{
      const steel=window.__lisiere.world.piles.filter(p=>p.item==='steel');
      return steel.length>0&&steel.every(p=>p.owner.type==='ground'&&p.owner.x===store.x&&p.owner.z===store.z);
    },MINING_SKILLS_CELLS.steelStore);
    await pause(page);const final=await world(page);expect(validateWorld(final)).toEqual([]);
    expect(final.tiles[index]!.miningDamage).toBeUndefined();expect(final.tiles[index]!.miningYield).toBeUndefined();
    // Level20 forgets while hauling too. Account for the independent staggered
    // twelve-XP loss instead of mistaking the final balance for earned practice.
    const finalSkill=final.pawns.find(p=>p.id===expert.id)!.skills.mining!;
    expect(finalSkill).toMatchObject({level:20,passion:2});expect(final.tick).toBeLessThan(6000);
    let forgotten=0;
    for(let tick=checkpoint.tick+1;tick<=final.tick;tick++)if((tick%20+expert.id%20)%20===0)forgotten+=12_000;
    expect(finalSkill.xp+forgotten).toBeGreaterThan(working.skills.mining!.xp);
    expect(finalSkill.dailyXp+forgotten).toBeGreaterThan(working.skills.mining!.dailyXp);
    const steel=final.piles.filter(p=>p.item==='steel');expect(steel).toHaveLength(1);
    expect(steel[0]!.owner).toEqual({type:'ground',...MINING_SKILLS_CELLS.steelStore});expect([45,46]).toContain(steel[0]!.quantity);
    await expect(page.locator('#steel')).toHaveText(String(steel[0]!.quantity));
    await panel(page,'menu');await page.locator('#save').click();await page.locator('#load').click();await expectWorld(page,final);await page.keyboard.press('Escape');
    await page.screenshot({path:testOutputPath('artifacts/mining-v204-stored.png')});
    const probe=await page.evaluate(()=>{clearInterval((window as any).__v204Timer);return (window as any).__v204Probe;});
    expect(probe.hooked).toBe(true);expect(probe.pipelines).toBe(pipelinesBefore);expect(errors).toEqual([]);
    await writeTestFile('artifacts/mining-v204-native.json',JSON.stringify({prepared:true,backend:'WebGPU',initialTick:prepared.tick,
      designatedTick:designated.tick,checkpointTick:checkpoint.tick,stroke,contribution:checkpoint.tiles[index]!.miningYield,
      skillBefore:expert.skills.mining,skillCheckpoint:working.skills.mining,skillAfter:final.pawns.find(p=>p.id===expert.id)!.skills.mining,
      finalTick:final.tick,steel:final.piles.filter(p=>p.item==='steel'),samples,pipelinesBefore,pipelinesAfter:probe.pipelines,
      notice:'Scène préparée32² ; désignation, approche, coups, XP, reprise et transport réels. Aucune campagne naturelle, fréquence ou performance générale établie.',errors},null,2));
  }finally{await writeTestFile('artifacts/mining-v204-native-errors.json',JSON.stringify(errors));await browser.close();}
});
