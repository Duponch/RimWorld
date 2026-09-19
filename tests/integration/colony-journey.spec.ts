import { wildlifePopulationAccount } from '../scenarios/hunting-player';
import { expect, test, type Page } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';
import { perform } from './player-actions';
import { playerArrivalDecisions,playerArrivalComplete,playerDecisions, playerFocusDecisions, colonySummary, woodAccount, foodAccount } from '../scenarios/colony-player';
import { deserializeWorld } from '../../src/sim/serialization';
import type { World } from '../../src/sim/types';
import { validateWorld } from '../../src/sim/index';
import { isBlockMaterial } from '../../src/sim/building-materials';
import { apparelMoveFactor } from '../../src/sim/apparel-rules';
import { world, observeErrors, panel, expectWorld, saveKey } from './helpers';

// Full tracing recorded ~500 MB during a stalled run. Keep compact checkpoints
// and an explicit final screenshot here; the short journeys retain full traces.
test.use({trace:'off'});
async function waitForTick(page:Page,tick:number):Promise<void> {
  let timer:ReturnType<typeof setTimeout>|undefined;
  try {
    await Promise.race([
      page.waitForFunction(t=>window.__lisiere.tick>=t,tick,{polling:1000,timeout:30000}),
      new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(new Error(`Browser stopped responding while advancing to tick ${tick}; inspect hourly-world attachments.`)),35000);}),
    ]);
  } catch(error) {
    clearTimeout(timer);
    const state=await Promise.race([
      page.evaluate(()=>({tick:window.__lisiere?.tick,notice:document.querySelector('#notice')?.textContent,paused:!(document.querySelector('#pause-banner') as HTMLElement)?.hidden})),
      new Promise(resolve=>{timer=setTimeout(()=>resolve('Browser did not answer the diagnostic within 1500 ms.'),1500);}),
    ]).catch(e=>String(e));
    throw new Error(`Target tick ${tick} timed out; last browser state: ${JSON.stringify(state)}; ${String(error)}`);
  } finally {clearTimeout(timer);}
}



type PlayerLog={tick:number;reason:string;command:unknown}[];
async function finishMaintenance(page:Page,current:World,initialWood:number,decisions:PlayerLog,rotation:{value:number}) {
  const summary=colonySummary(current);let morning:ReturnType<typeof colonySummary>|undefined;
  // A fragment produced since the previous observation must first be
  // designated. Follow the ordinary night's sleep, transport and crafting
  // through the UI; do not demand an empty maintenance queue at midnight.
  const maintenance=current.jobs.filter(j=>j.growingZoneId===undefined).map(j=>j.id);
  if(summary.mining.chunks>summary.mining.stored||maintenance.length||summary.mining.steelStored<summary.mining.steel) {
    const haul=playerDecisions(current).filter(d=>d.command.type==='area'&&d.command.action==='haul-chunks');
    // Previously designated or already carried chunks need no duplicate command.
    for(const d of haul){await perform(page,d,rotation);decisions.push({tick:current.tick,...d});}
    const planned=await world(page);expect(validateWorld(planned)).toEqual([]);
    for(const p of planned.piles)if(p.kind==='chunk'&&p.owner.type==='ground'&&!planned.stockpiles.some(s=>s.filters.chunk&&p.owner.type==='ground'&&s.x===p.owner.x&&s.z===p.owner.z))expect(p.haulRequested,'Every outstanding ground chunk is designated').toBe(true);
    await panel(page,'menu');await page.locator('#save').click();await page.locator('#load').click();await expectWorld(page,planned);
    for(let interval=1;interval<=3;interval++) {
      await page.locator('[data-speed="6"]').click();await waitForTick(page,planned.tick+interval*1000);
      await page.locator('[data-speed="0"]').click();await expect(page.locator('#pause-banner')).toBeVisible();
      const next=await world(page);expect(validateWorld(next)).toEqual([]);expect(woodAccount(next)).toBe(initialWood);
      morning=colonySummary(next);
      if(!next.jobs.some(j=>maintenance.includes(j.id))&&morning.mining.steelStored===50&&morning.mining.stored===morning.mining.chunks&&(summary.mining.blocks!==15||summary.mining.chunks===0||morning.mining.blocksStored===35))break;
    }
    const finished=await world(page);expect(finished.jobs.filter(j=>maintenance.includes(j.id)),'Accepted maintenance must finish after the normal night').toEqual([]);
    expect(morning!.mining.stored,'Existing fragments must be stored or consumed after waking').toBe(morning!.mining.chunks);
    expect(morning!.mining.steelStored,'All extracted steel must reach storage after waking').toBe(50);
    if(summary.mining.blocks===15&&summary.mining.chunks>0)expect(morning!.mining.blocksStored,'The existing fragment must yield the next physical batch').toBe(35);
  }
  return morning;
}

test('partie de trois jours : un joueur équipe son camp et entretient ses stocks par la vraie interface', async ({playwright},testInfo)=>{
  // Per-hour progress remains bounded by waitForTick. Leave room for native
  // GPU preparation, three days, and the final night's physical maintenance.
  test.setTimeout(600000);
  // Hardware WebGPU; the dedicated boundary journey still covers software fallback.
  const browser=await playwright.chromium.launch({channel:'chromium',args:[]});
  const page=await browser.newPage({baseURL:'http://127.0.0.1:5173',viewport:{width:1440,height:1000}});
  page.setDefaultTimeout(10000);
  const errors=observeErrors(page), decisions:{tick:number;reason:string;command:unknown}[]=[], days:ReturnType<typeof colonySummary>[]=[];
  const harvests=new Map<string,number>(), meals=new Map<string,number>(), sleepers=new Set<number>(), cooked=new Set<string>();const recreationActivities=new Set<string>(),clearedSites=new Set<string>();let finalReport:unknown,waitingFor=0;let morning:ReturnType<typeof colonySummary>|undefined;
  try {
    // No injected fixture, inventory, clocks or simulation speed outside the UI.
    await page.goto('/?e2e&seed=42');await expect(page.locator('#loading')).toHaveCount(0);
    await page.locator('[data-speed="0"]').click();await expect(page.locator('#pause-banner')).toBeVisible();
    const initial=await world(page);expect(initial.wildlife?.animals).toHaveLength(12);expect(initial.width).toBe(250);expect(initial.stock).toEqual({wood:12,food:18});
    expect(initial.foodRules).toBe('adult');
    expect(initial.piles.filter(p=>p.kind==='food').map(p=>[p.item,p.quantity])).toEqual([['survival-meal',10],['survival-meal',8]]);
    await expect(page.locator('#food-items [data-item="survival-meal"] strong')).toHaveText('18');
    await expect(page.locator('#food-items [data-item="legacy-portion"]')).toBeHidden();
    const initialWood=woodAccount(initial), initialFood=foodAccount(initial);const rotation={value:0};
    for(const d of playerArrivalDecisions(initial))await perform(page,d,rotation);
    await page.locator('[data-speed="1"]').click();await expect.poll(async()=>playerArrivalComplete(await world(page))).toBe(true);await page.locator('[data-speed="0"]').click();
    await perform(page,{reason:'Reprendre les travaux civils après la reconnaissance.',command:{type:'draft',pawnIds:[initial.pawns[0]!.id],enabled:false}},rotation);
    for(let hour=0;hour<=72;hour+=4) {
      if(hour) {
        await page.locator('[data-speed="6"]').click();
        waitingFor=initial.tick+hour*250;await waitForTick(page,waitingFor);
        await page.locator('[data-speed="0"]').click();await expect(page.locator('#pause-banner')).toBeVisible();
      }
      const current=await world(page), summary=colonySummary(current), context=JSON.stringify(summary);
      await testInfo.attach(`hourly-world-${hour}`,{contentType:'application/json',body:JSON.stringify(current)});
      expect(summary.equipment).toHaveLength(1);if(hour)expect(summary.equipment[0]!.owner.type).toBe('equipment');
      expect(validateWorld(current),context).toEqual([]);expect(woodAccount(current),context).toBe(initialWood);
      expect(summary.thermal.outdoors).toBeGreaterThanOrEqual(14);expect(summary.thermal.outdoors).toBeLessThanOrEqual(28);
      for(const t of summary.thermal.temperatures){expect(t).toBeGreaterThanOrEqual(14);expect(t).toBeLessThanOrEqual(28);}
      for(const light of summary.lighting) {
        expect(light.cellFactor).toBeCloseTo(.8+.2*Math.min(1,light.cellLight/.3),8);
        // This healthy camp equips but never removes its vest. The captured
        // edge combines light and apparel; 0.8 alone predates physical clothing.
        const apparel=apparelMoveFactor(current,current.pawns.find(p=>p.id===light.id)!);
        expect(light.travelFactor).toBeGreaterThanOrEqual(.8*apparel);expect(light.travelFactor).toBeLessThanOrEqual(1);
      }
      expect(current.pawns.every(p=>p.hunger>0&&p.rest>0),context).toBe(true);
      for(const e of current.events)if(e.type==='need'&&e.message.includes('a mangé une portion'))meals.set(`${e.tick}:${e.message}`,Number(e.message.match(/portion \((\d+) /)?.[1] ?? 0));
      for(const e of current.events) {const match=e.message.match(/a récolté (\d+) (?:baies|riz)/);if(match)harvests.set(`${e.tick}:${e.message}`,Number(match[1]));}
      for(const e of current.events)if(e.message.includes('a cuisiné 1 repas simple'))cooked.add(`${e.tick}:${e.message}`);
      for(const e of current.events)if(e.message.includes('a dégagé le chantier'))clearedSites.add(`${e.tick}:${e.message}`);
      for(const e of current.events)if(e.message.includes('commence à')){if(e.message.includes('fers à cheval'))recreationActivities.add('horseshoes');if(e.message.includes('observer le ciel'))recreationActivities.add('skygaze');}
      for(const p of current.pawns)if(p.state==='sleeping'&&p.need?.kind==='sleep'&&p.need.bedId!==null)sleepers.add(p.id);
      if(hour && hour%24===0) {
        days.push(summary);
        await panel(page,'menu');await page.locator('#save').click();await page.locator('#load').click();await expectWorld(page,current);
      }
      if(hour===72) {
        expect(summary.mining.cells,context).toBeGreaterThanOrEqual(6);expect(summary.mining.steel,context).toBe(50);expect(summary.mining.steelInBuildings,context).toBe(150);expect(summary.mining.stored,context).toBeLessThanOrEqual(summary.mining.chunks);
        // The player checks only every four hours, unlike the hourly core pilot.
        // One complete batch minus the new wall is sufficient on day 3; a second
        // batch needs another random chunk. Prove the deficit has a real next action.
        expect([15,35],context).toContain(summary.mining.blocks);expect(summary.mining.blocksStored,context).toBe(summary.mining.blocks);
        expect(current.structures.filter(s=>s.kind==='wall'&&isBlockMaterial(s.material)),context).toHaveLength(1);
        expect(current.deconstructed.count,context).toBe(1);expect(current.structures.find(s=>s.kind==='horseshoes')?.x,context).toBe(Math.floor(current.width/2)+4);expect(current.packed,context).toEqual([]);
        expect(summary.structures,context).toEqual({'wood-generator':1,'standing-lamp':1,'passive-cooler':0,bed:4,table:1,stool:3,wall:7,campfire:1,horseshoes:1,stonecutter:1,door:1});expect(current.jobs.filter(j=>j.growingZoneId===undefined&&!['chop','harvest','mine'].includes(j.kind)),context).toEqual([]);expect(current.resources.filter(r=>r.kind==='rice').length,context).toBeGreaterThan(5);
        // Mining is a replenishment order like woodcutting. Bound the outstanding
        // area, then require these exact jobs to finish after ordinary sleep below.
        expect(current.jobs.filter(j=>j.kind==='mine').length,context).toBeLessThanOrEqual(4);
        expect(summary.mining.componentsInBuildings,context).toBe(2);expect(summary.mining.componentsStored,context).toBe(4);expect(summary.power.filter(s=>s.on),context).toHaveLength(2);
        expect(summary.apparel.filter(i=>i.owner.type==='apparel'),context).toHaveLength(5);
        expect(summary.medicines,context).toEqual({total:30,stored:30,policies:['industrial','industrial','industrial','industrial']});
        expect(summary.roofing,context).toEqual({constructed:28,planned:28,removal:0});expect(current.stock.food,context).toBeGreaterThan(0);expect(sleepers.size,context).toBe(4);expect(current.arrivals?.accepted,context).toBe(1);expect(current.pawns,context).toHaveLength(4);
        expect(wildlifePopulationAccount(current)).toBe(12);expect(current.wildlife!.eatenNutrition).toBeGreaterThan(0);
        expect(meals.size,context).toBeGreaterThanOrEqual(18);expect(foodAccount(current)+(current.wildlife?.eatenItems??0)+9*cooked.size+[...meals.values()].reduce((a,b)=>a+b,0),context).toBe(initialFood+[...harvests.values()].reduce((a,b)=>a+b,0));
        expect(current.piles.filter(p=>p.kind==='food').every(p=>['berries','survival-meal','rice','simple-meal','hare-meat'].includes(p.item))).toBe(true);
        expect(cooked.size,context).toBeGreaterThanOrEqual(6);
        expect(current.pawns.some(p=>p.skills.construction.xp>1000000),context).toBe(true);
        expect(decisions.filter(d=>{const c=d.command as {type:string;policyId?:number};return c.type==='food-policy-assign'&&c.policyId===3;}).length,context).toBeGreaterThanOrEqual(3);
        expect([...recreationActivities].sort(),context).toEqual(['horseshoes','skygaze']);
        expect(clearedSites.size,context).toBeGreaterThan(0);
        if(summary.mining.blocks===15&&summary.mining.chunks===0) {
          const replenish=playerDecisions(current).find(d=>d.command.type==='designate'&&d.command.kind==='mine');
          expect(replenish,'A low block reserve without a chunk must trigger new mining').toBeDefined();
          await perform(page,replenish!,rotation);decisions.push({tick:current.tick,...replenish!});
          const planned=await world(page);expect(planned.jobs.filter(j=>j.kind==='mine')).toHaveLength(1);expect(validateWorld(planned)).toEqual([]);
          await panel(page,'menu');await page.locator('#save').click();await page.locator('#load').click();await expectWorld(page,planned);
        }
        morning=await finishMaintenance(page,await world(page),initialWood,decisions,rotation);
        finalReport={morning,clearedSites:clearedSites.size,recreationActivities:[...recreationActivities],cooked:cooked.size,backend:await page.evaluate(()=>window.__lisiere.backend),days,meals:meals.size,sleepers:sleepers.size,woodConserved:true,foodReconciled:true,decisions,errors};
        break;
      }
      for(const decision of playerDecisions(current)) {
        await test.step(`${decision.reason} ${JSON.stringify(decision.command)}`,()=>perform(page,decision,rotation));
        decisions.push({tick:current.tick,...decision});
      }
      if(hour===0)for(const decision of playerFocusDecisions(await world(page))) {
        await perform(page,decision,rotation);decisions.push({tick:current.tick,...decision});
      }
    }
    await page.keyboard.press('Escape');await page.screenshot({path:`artifacts/colony-three-days-${process.env.VALIDATION_VERSION??'v66'}.png`});
    expect(errors).toEqual([]);
    await testInfo.attach('colony-journey',{contentType:'application/json',body:JSON.stringify(finalReport)});
  } finally {
    // Persist compact evidence even with the line reporter or a frozen browser.
    await writeFile(`artifacts/colony-journey-${process.env.VALIDATION_VERSION??'v66'}.json`,JSON.stringify(finalReport??{complete:false,waitingFor,days,decisions,meals:[...meals],errors},null,2));
    const checkpoint=[...testInfo.attachments].reverse().find(a=>a.name.startsWith('hourly-world-'));
    if(checkpoint?.body)await writeFile('tmp/colony-last-checkpoint.json',checkpoint.body);
    if(!finalReport)await testInfo.attach('colony-journey-incomplete',{contentType:'application/json',body:JSON.stringify({days,decisions,meals:[...meals],errors})});
    // A frozen renderer must not hold the test worker indefinitely in teardown.
    let timer:ReturnType<typeof setTimeout>|undefined;
    try {await Promise.race([browser.close(),new Promise<void>(resolve=>{timer=setTimeout(resolve,5000);})]);}
    finally {clearTimeout(timer);}
  }
});

// Opt-in replay of a real failed journey. Never generate resources, fast-forward
// simulation off-screen, or relax the normal maintenance completion assertions.
test('checkpoint journey: continue the ordinary player, food ledger and third-night maintenance',async({playwright})=>{
  test.skip(!process.env.COLONY_JOURNEY_CHECKPOINT,'Set the real interrupted journey checkpoint.');
  test.setTimeout(240000);
  const data=await readFile(process.env.COLONY_JOURNEY_CHECKPOINT!,'utf8'),initial=deserializeWorld(data),rotation={value:0},decisions:PlayerLog=[];
  const browser=await playwright.chromium.launch({channel:'chromium',args:[]});
  try {
    const page=await browser.newPage({baseURL:'http://127.0.0.1:5173',viewport:{width:1440,height:1000}}),errors=observeErrors(page);
    await page.addInitScript(({key,data})=>localStorage.setItem(key,data),{key:saveKey,data});
    await page.goto('/?e2e&size=32');await expect(page.locator('#loading')).toHaveCount(0);await page.locator('[data-speed="0"]').click();
    await panel(page,'menu');await page.locator('#load').click();await expectWorld(page,initial);
    const eventKey=(e:World['events'][number])=>`${e.tick}:${e.type}:${e.message}`,seen=new Set(initial.events.map(eventKey));
    let consumed=0,harvested=0,cooked=0;
    const check=(w:World)=>{
      expect(validateWorld(w)).toEqual([]);expect(woodAccount(w)).toBe(woodAccount(initial));
      for(const e of w.events)if(!seen.has(eventKey(e))){
        seen.add(eventKey(e));const harvest=e.message.match(/a récolté (\d+) (?:baies|riz)/),meal=e.message.match(/a mangé une portion \((\d+) /);
        if(harvest)harvested+=Number(harvest[1]);if(meal)consumed+=Number(meal[1]);if(e.message.includes('a cuisiné 1 repas simple'))cooked++;
      }
      expect(foodAccount(w)+consumed+9*cooked+(w.wildlife?.eatenItems??0)-(initial.wildlife?.eatenItems??0)).toBe(foodAccount(initial)+harvested);
      expect(w.pawns.every(p=>p.hunger>0&&p.rest>0&&p.state!=='dead'&&p.state!=='downed')).toBe(true);
      expect(wildlifePopulationAccount(w)).toBe(12);
    };
    for(let target=initial.tick+1000;target<=Math.max(initial.tick+1000,18000+initial.tick%1000);target+=1000){
      const current=await world(page);for(const d of playerDecisions(current)){await perform(page,d,rotation);decisions.push({tick:current.tick,...d});}
      await page.locator('[data-speed="6"]').click();await waitForTick(page,target);
      await page.locator('[data-speed="0"]').click();await expect(page.locator('[data-speed="0"]')).toHaveAttribute('aria-pressed','true');check(await world(page));
    }
    const third=await world(page),summary=colonySummary(third);
    expect(summary.structures).toEqual({'wood-generator':1,'standing-lamp':1,'passive-cooler':0,bed:4,table:1,stool:3,wall:7,campfire:1,horseshoes:1,stonecutter:1,door:1});
    expect(summary.roofing).toEqual({constructed:28,planned:28,removal:0});expect(summary.mining.steel).toBe(50);expect(summary.mining.steelInBuildings).toBe(150);
    expect(summary.medicines).toEqual({total:30,stored:30,policies:Array(4).fill('industrial')});expect(summary.apparel.filter(i=>i.owner.type==='apparel')).toHaveLength(5);
    expect(third.growingZones.find(z=>z.plant==='cotton')?.cells).toHaveLength(6);expect(third.arrivals?.accepted).toBe(1);
    const morning=await finishMaintenance(page,third,woodAccount(initial),decisions,rotation),final=await world(page);check(final);
    expect(final.wildlife!.eatenNutrition).toBeGreaterThan(initial.wildlife!.eatenNutrition);
    await panel(page,'menu');await page.locator('#save').click();await page.locator('#load').click();await expectWorld(page,final);expect(errors).toEqual([]);
    await writeFile(`artifacts/colony-continuation-${process.env.VALIDATION_VERSION??'v76'}.json`,JSON.stringify({date:new Date().toISOString(),initialTick:initial.tick,finalTick:final.tick,summary,morning,final:colonySummary(final),ledger:{consumed,harvested,cooked,foodReconciled:true,woodConserved:true},decisions,errors},null,2));
  } finally {await browser.close();}
});

test('checkpoint maintenance: finish accepted work through the real UI after ordinary sleep',async({playwright})=>{
  test.skip(!process.env.COLONY_MAINTENANCE_CHECKPOINT,'Set a recorded journey checkpoint to reproduce its continuation.');
  test.setTimeout(120000);
  const data=await readFile(process.env.COLONY_MAINTENANCE_CHECKPOINT!,'utf8'),initial=deserializeWorld(data);
  const browser=await playwright.chromium.launch({channel:'chromium',args:[]});
  try {
    const page=await browser.newPage({baseURL:'http://127.0.0.1:5173',viewport:{width:1440,height:1000}}),errors=observeErrors(page),decisions:PlayerLog=[];
    await page.addInitScript(({key,data})=>localStorage.setItem(key,data),{key:saveKey,data});
    await page.goto('/?e2e&size=32');await expect(page.locator('#loading')).toHaveCount(0);await page.locator('[data-speed="0"]').click();
    await panel(page,'menu');await page.locator('#load').click();await expectWorld(page,initial);await page.keyboard.press('Escape');
    const morning=await finishMaintenance(page,initial,woodAccount(initial),decisions,{value:0});
    const final=await world(page),summary=colonySummary(final);
    expect(summary.apparel.filter(i=>i.owner.type==='apparel')).toHaveLength(4);
    expect(summary.structures).toEqual(colonySummary(initial).structures);
    expect(summary.mining.steelStored).toBe(50);expect(summary.mining.steelInBuildings).toBe(150);
    await panel(page,'menu');await page.locator('#save').click();await page.locator('#load').click();await expectWorld(page,final);
    expect(errors).toEqual([]);
    await writeFile(`artifacts/colony-maintenance-${process.env.VALIDATION_VERSION??'v66'}.json`,JSON.stringify({date:new Date().toISOString(),initialTick:initial.tick,finalTick:final.tick,morning,decisions,woodConserved:true,errors},null,2));
  } finally {await browser.close();}
});
