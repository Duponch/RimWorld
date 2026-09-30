import { writeTestFile, testOutputPath } from '../test-output.ts';
import { createSimpleMealLedger, observeSimpleMealLedger } from '../scenarios/simple-meal-ledger.ts';
import { wildlifePopulationAccount } from '../scenarios/hunting-player';
import { campChunks, campChunkNeedsHaul } from '../scenarios/mining-player';
import { completedStoneOpenings, pendingStoneOpenings, stoneMatter } from '../scenarios/stone-balance';
import { STONE_KINDS } from '../../src/sim/geology';
import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
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
function requireEventCoverage(current:World,observedTick:number):void {
  expect(current.tick,'Food observations must follow confirmed ticks').toBeGreaterThanOrEqual(observedTick);
  // The product journal keeps at most 80 events. A full window starting after
  // our last observation cannot prove the missing transitions: fail with the
  // checkpoint instead of silently inventing food production or loss.
  if(current.events.length>=80)expect(current.events[0]!.tick,`Event window lost coverage after tick ${observedTick}; current tick ${current.tick}`).toBeLessThanOrEqual(observedTick+1);
}
async function finishMaintenance(page:Page,current:World,initialWood:number,decisions:PlayerLog,rotation:{value:number},observe?:(w:World)=>void) {
  const summary=colonySummary(current);let morning:ReturnType<typeof colonySummary>|undefined;
  const trackedChunks=new Set(campChunks(current).map(p=>p.id));
  const seenChunkIds=new Set(current.piles.filter(p=>p.kind==='chunk').map(p=>p.id));
  const trackChunks=(w:World)=>{
    for(const p of campChunks(w))trackedChunks.add(p.id);
    // A pickup creates a new cargo ID. Follow every newly observed chunk,
    // including one dropped outside the camp after an interrupted delivery.
    for(const p of w.piles)if(p.kind==='chunk'){
      if(!seenChunkIds.has(p.id))trackedChunks.add(p.id);
      seenChunkIds.add(p.id);
    }
  };
  const pendingChunks=(w:World)=>[...trackedChunks].filter(id=>{
    const pile=w.piles.find(p=>p.id===id);
    return pile!==undefined&&(pile.owner.type!=='ground'||campChunkNeedsHaul(w,pile));
  });
  const haulingDecisions=(w:World)=>{
    const result=playerDecisions(w,{bulkMeals:true}).filter(d=>d.command.type==='area'&&d.command.action==='haul-chunks');
    for(const id of pendingChunks(w)){
      const p=w.piles.find(p=>p.id===id);
      if(p?.owner.type!=='ground'||p.haulRequested)continue;
      const owner=p.owner;
      if(!result.some(d=>d.command.type==='area'&&d.command.from.x===owner.x&&d.command.from.z===owner.z))
        result.push({reason:'Achever le rangement d’un fragment déjà suivi après sa prise ou son dépôt.',command:{type:'area',action:'haul-chunks',from:owner,to:owner}});
    }
    return result;
  };
  const checkStone=(before:World,after:World)=>{
    const first=stoneMatter(before),last=stoneMatter(after),openings=completedStoneOpenings(after,pendingStoneOpenings(before));
    for(const stone of STONE_KINDS){
      const delta=last[stone]-first[stone],budget=20*openings.filter(s=>s===stone).length;
      expect(delta,`Stone matter may only increase after a real ${stone} excavation`).toBeGreaterThanOrEqual(0);
      expect(delta).toBeLessThanOrEqual(budget);expect(delta%20).toBe(0);
    }
  };
  // A fragment produced since the previous observation must first be
  // designated. Follow the ordinary night's sleep, transport and crafting
  // through the UI; do not demand an empty maintenance queue at midnight.
  const maintenance=current.jobs.filter(j=>j.growingZoneId===undefined).map(j=>j.id);
  if(pendingChunks(current).length||maintenance.length||summary.mining.steelStored<summary.mining.steel) {
    const haul=haulingDecisions(current);
    // Previously designated or already carried chunks need no duplicate command.
    for(const d of haul){await perform(page,d,rotation);decisions.push({tick:current.tick,...d});}
    const planned=await world(page);expect(validateWorld(planned)).toEqual([]);
    expect(stoneMatter(planned),'Haul designations cannot create or consume stone').toEqual(stoneMatter(current));
    for(const p of campChunks(planned))if(campChunkNeedsHaul(planned,p))expect(p.haulRequested,'Every camp or mined ground chunk is designated').toBe(true);
    await panel(page,'menu');await page.locator('#save').click();await page.locator('#load').click();await expectWorld(page,planned);
    let previous=planned;
    for(let interval=1;interval<=3;interval++) {
      await page.keyboard.press('Escape');
      await page.locator('[data-speed="6"]').click();await waitForTick(page,planned.tick+interval*1000);
      await page.locator('[data-speed="0"]').click();await expect(page.locator('#pause-banner')).toBeVisible();
      const next=await world(page);observe?.(next);expect(validateWorld(next)).toEqual([]);expect(woodAccount(next)).toBe(initialWood);
      checkStone(previous,next);trackChunks(next);
      const newHauls=haulingDecisions(next);
      for(const d of newHauls){await perform(page,d,rotation);decisions.push({tick:next.tick,...d});}
      const designated=await world(page);
      expect(stoneMatter(designated)).toEqual(stoneMatter(next));previous=designated;
      for(const p of campChunks(designated))if(campChunkNeedsHaul(designated,p))expect(p.haulRequested,'Newly mined or camp chunks need physical hauling').toBe(true);
      morning=colonySummary(next);
      if(!next.jobs.some(j=>maintenance.includes(j.id))&&morning.mining.steelStored===50&&pendingChunks(designated).length===0&&(summary.mining.blocks!==15||trackedChunks.size===0||morning.mining.blocksStored===35))break;
    }
    const finished=await world(page);expect(finished.jobs.filter(j=>maintenance.includes(j.id)),'Accepted maintenance must finish after the normal night').toEqual([]);
    expect(pendingChunks(finished),'Camp and mined fragments must be stored or consumed after waking').toEqual([]);
    expect(morning!.mining.steelStored,'All extracted steel must reach storage after waking').toBe(50);
    if(summary.mining.blocks===15&&trackedChunks.size>0)expect(morning!.mining.blocksStored,'The available camp fragment must yield the next physical batch').toBe(35);
  }
  return morning;
}

test('partie de trois jours : un joueur équipe son camp et entretient ses stocks par la vraie interface', async ({playwright},testInfo)=>{
  // Per-hour progress remains bounded by waitForTick. Leave room for native
  // GPU preparation and visible decisions: reaching tick 15019 took ~590 s,
  // then the recorded continuation passed within its separate 240 s bound.
  test.setTimeout(900000);
  // Hardware WebGPU; the dedicated boundary journey still covers software fallback.
  const browser=await playwright.chromium.launch({channel:'chromium',args:[]});
  const page=await browser.newPage({baseURL:'http://127.0.0.1:5173',viewport:{width:1440,height:1000}});
  page.setDefaultTimeout(10000);
  const errors=observeErrors(page), decisions:{tick:number;reason:string;command:unknown}[]=[], days:ReturnType<typeof colonySummary>[]=[];
  const harvests=new Map<string,number>(), meals=new Map<string,number>(), sleepers=new Set<number>();const recreationActivities=new Set<string>(),clearedSites=new Set<string>();let finalReport:unknown,waitingFor=0;let morning:ReturnType<typeof colonySummary>|undefined;
  try {
    // No injected fixture, inventory, clocks or simulation speed outside the UI.
    await page.goto('/?scenario=camp&e2e&seed=42');await expect(page.locator('#loading')).toHaveCount(0);
    await page.locator('[data-speed="0"]').click();await expect(page.locator('#pause-banner')).toBeVisible();
    const initial=await world(page);expect(initial.wildlife?.animals).toHaveLength(12);expect(initial.width).toBe(250);expect(initial.stock).toEqual({wood:12,food:18});
    expect(initial.foodRules).toBe('adult');
    expect(initial.piles.filter(p=>p.kind==='food').map(p=>[p.item,p.quantity])).toEqual([['survival-meal',10],['survival-meal',8]]);
    await expect(page.locator('#food-items [data-item="survival-meal"] strong')).toHaveText('18');
    await expect(page.locator('#food-items [data-item="legacy-portion"]')).toBeHidden();
    const initialWood=woodAccount(initial), initialFood=foodAccount(initial);const cookingLedger=createSimpleMealLedger(initial.events),rotation={value:0};
    let foodObservedTick=initial.tick;
    const observeFood=(current:World)=>{
      requireEventCoverage(current,foodObservedTick);
      for(const e of current.events)if(e.type==='need'&&e.message.includes('a mangé une portion'))meals.set(`${e.tick}:${e.message}`,Number(e.message.match(/portion \((\d+) /)?.[1]??0));
      for(const e of current.events){const match=e.message.match(/a récolté (\d+) (?:baies|riz)/);if(match)harvests.set(`${e.tick}:${e.message}`,Number(match[1]));}
      observeSimpleMealLedger(cookingLedger,current.events);foodObservedTick=current.tick;
      expect(foodAccount(current)+(current.wildlife?.eatenItems??0)+cookingLedger.totals.unitDelta+[...meals.values()].reduce((a,b)=>a+b,0)).toBe(initialFood+[...harvests.values()].reduce((a,b)=>a+b,0));
    };
    for(const d of playerArrivalDecisions(initial))await perform(page,d,rotation);
    await page.locator('[data-speed="1"]').click();await expect.poll(async()=>playerArrivalComplete(await world(page))).toBe(true);await page.locator('[data-speed="0"]').click();
    await perform(page,{reason:'Reprendre les travaux civils après la reconnaissance.',command:{type:'draft',pawnIds:[initial.pawns[0]!.id],enabled:false}},rotation);
    for(let hour=0;hour<=72;hour+=4) {
      if(hour) {
        await page.keyboard.press('Escape');
        await page.locator('[data-speed="6"]').click();
        waitingFor=initial.tick+hour*250;await waitForTick(page,waitingFor);
        await page.locator('[data-speed="0"]').click();await expect(page.locator('#pause-banner')).toBeVisible();
      }
      const current=await world(page), summary=colonySummary(current), context=JSON.stringify(summary);
      const checkpoint=JSON.stringify(current);
      // Playwright can materialize an attachment body as a path. Save directly
      // at observation time so a timeout cannot discard the replay checkpoint.
      await writeTestFile('tmp/colony-last-checkpoint.json',checkpoint);
      await testInfo.attach(`hourly-world-${hour}`,{contentType:'application/json',body:checkpoint});
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
      observeFood(current);
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
        expect(meals.size,context).toBeGreaterThanOrEqual(18);expect(foodAccount(current)+(current.wildlife?.eatenItems??0)+cookingLedger.totals.unitDelta+[...meals.values()].reduce((a,b)=>a+b,0),context).toBe(initialFood+[...harvests.values()].reduce((a,b)=>a+b,0));
        expect(current.piles.filter(p=>p.kind==='food').every(p=>['berries','survival-meal','rice','simple-meal','hare-meat'].includes(p.item))).toBe(true);
        expect(cookingLedger.totals.portions,context).toBeGreaterThanOrEqual(6);
        expect(cookingLedger.totals.bulkOperations,context).toBeGreaterThanOrEqual(1);
        // Work grants XP, with passion and forgetting; three days have no fixed
        // 1000-XP quota. Compare original builders, including a level crossing.
        expect(initial.pawns.some(before=>{
          const learned=current.pawns.find(p=>p.id===before.id)?.skills.construction;
          return !!learned&&(learned.level>before.skills.construction.level||learned.level===before.skills.construction.level&&learned.xp>before.skills.construction.xp);
        }),'Physical camp construction must leave persisted learning from an original builder').toBe(true);
        expect(decisions.filter(d=>{const c=d.command as {type:string;policyId?:number};return c.type==='food-policy-assign'&&c.policyId===3;}).length,context).toBeGreaterThanOrEqual(3);
        expect([...recreationActivities].sort(),context).toEqual(['horseshoes','skygaze']);
        expect(clearedSites.size,context).toBeGreaterThan(0);
        if(summary.mining.blocks===15&&campChunks(current).length===0) {
          const replenish=playerDecisions(current,{bulkMeals:true}).find(d=>d.command.type==='designate'&&d.command.kind==='mine');
          expect(replenish,'A low block reserve without a chunk must trigger new mining').toBeDefined();
          await perform(page,replenish!,rotation);decisions.push({tick:current.tick,...replenish!});
          const planned=await world(page);expect(planned.jobs.filter(j=>j.kind==='mine')).toHaveLength(1);expect(validateWorld(planned)).toEqual([]);
          await panel(page,'menu');await page.locator('#save').click();await page.locator('#load').click();await expectWorld(page,planned);
        }
        morning=await finishMaintenance(page,await world(page),initialWood,decisions,rotation,observeFood);
        observeFood(await world(page));
        finalReport={morning,clearedSites:clearedSites.size,recreationActivities:[...recreationActivities],cooked:cookingLedger.totals.portions,cooking:{...cookingLedger.totals},backend:await page.evaluate(()=>window.__lisiere.backend),days,meals:meals.size,sleepers:sleepers.size,woodConserved:true,foodReconciled:true,decisions,errors};
        break;
      }
      for(const decision of playerDecisions(current,{bulkMeals:true})) {
        await test.step(`${decision.reason} ${JSON.stringify(decision.command)}`,()=>perform(page,decision,rotation));
        decisions.push({tick:current.tick,...decision});
      }
      if(hour===0)for(const decision of playerFocusDecisions(await world(page))) {
        await perform(page,decision,rotation);decisions.push({tick:current.tick,...decision});
      }
    }
    await page.keyboard.press('Escape');await page.screenshot({path:testOutputPath(`artifacts/colony-three-days-${process.env.VALIDATION_VERSION??'v66'}.png`)});
    expect(errors).toEqual([]);
    await testInfo.attach('colony-journey',{contentType:'application/json',body:JSON.stringify(finalReport)});
  } finally {
    // Persist compact evidence even with the line reporter or a frozen browser.
    await writeTestFile(`artifacts/colony-journey-${process.env.VALIDATION_VERSION??'v66'}.json`,JSON.stringify(finalReport??{complete:false,waitingFor,days,decisions,meals:[...meals],sleepers:[...sleepers],clearedSites:[...clearedSites],recreationActivities:[...recreationActivities],errors},null,2));
    if(!finalReport)await testInfo.attach('colony-journey-incomplete',{contentType:'application/json',body:JSON.stringify({days,decisions,meals:[...meals],errors})});
    // A frozen renderer must not hold the test worker indefinitely in teardown.
    let timer:ReturnType<typeof setTimeout>|undefined;
    try {await Promise.race([browser.close(),new Promise<void>(resolve=>{timer=setTimeout(resolve,5000);})]);}
    finally {clearTimeout(timer);}
  }
});

// Opt-in replay of a real failed journey. Never generate resources, fast-forward
// simulation off-screen, or relax the normal maintenance completion assertions.
test('checkpoint actions: replay the paused ordinary decisions through visible cells',async({playwright})=>{
  test.skip(!process.env.COLONY_ACTIONS_CHECKPOINT,'Set a real interrupted journey checkpoint.');
  test.setTimeout(90000);
  const data=await readFile(process.env.COLONY_ACTIONS_CHECKPOINT!,'utf8'),initial=deserializeWorld(data),rotation={value:0},decisions:PlayerLog=[];
  const browser=await playwright.chromium.launch({channel:'chromium',args:[]});
  try {
    const page=await browser.newPage({baseURL:'http://127.0.0.1:5173',viewport:{width:1440,height:1000}}),errors=observeErrors(page);
    page.setDefaultTimeout(10000);
    await page.addInitScript(({key,data})=>localStorage.setItem(key,data),{key:saveKey,data});
    await page.goto('/?scenario=camp&e2e&size=32');await expect(page.locator('#loading')).toHaveCount(0);await page.locator('[data-speed="0"]').click();
    await panel(page,'menu');await page.locator('#load').click();await expectWorld(page,initial);
    const planned=playerDecisions(initial,{bulkMeals:true});
    expect(planned.some(d=>d.command.type==='bill-add'||d.command.type==='bill-update'),'The recorded checkpoint must exercise a bill action').toBe(true);
    for(const d of planned){await test.step(`${d.reason} ${JSON.stringify(d.command)}`,()=>perform(page,d,rotation));decisions.push({tick:initial.tick,...d});}
    const result=await world(page);
    expect(result.tick).toBe(initial.tick);expect(validateWorld(result)).toEqual([]);
    expect(foodAccount(result)).toBe(foodAccount(initial));expect(woodAccount(result)).toBe(woodAccount(initial));expect(stoneMatter(result)).toEqual(stoneMatter(initial));expect(errors).toEqual([]);
    await panel(page,'menu');await page.locator('#save').click();await page.locator('#load').click();await expectWorld(page,result);
    await writeTestFile(`artifacts/colony-actions-${process.env.VALIDATION_VERSION??'v176'}.json`,JSON.stringify({initialTick:initial.tick,decisions,paused:true,foodConserved:true,woodConserved:true,stoneConserved:true,resumedExactly:true,errors},null,2));
  } finally {await browser.close();}
});

test('checkpoint journey: continue the ordinary player, food ledger and third-night maintenance',async({playwright})=>{
  test.skip(!process.env.COLONY_JOURNEY_CHECKPOINT,'Set the real interrupted journey checkpoint.');
  test.setTimeout(240000);
  const data=await readFile(process.env.COLONY_JOURNEY_CHECKPOINT!,'utf8'),initial=deserializeWorld(data),rotation={value:0},decisions:PlayerLog=[];
  const browser=await playwright.chromium.launch({channel:'chromium',args:[]});
  try {
    const page=await browser.newPage({baseURL:'http://127.0.0.1:5173',viewport:{width:1440,height:1000}}),errors=observeErrors(page);
    await page.addInitScript(({key,data})=>localStorage.setItem(key,data),{key:saveKey,data});
    await page.goto('/?scenario=camp&e2e&size=32');await expect(page.locator('#loading')).toHaveCount(0);await page.locator('[data-speed="0"]').click();
    await panel(page,'menu');await page.locator('#load').click();await expectWorld(page,initial);
    const eventKey=(e:World['events'][number])=>`${e.tick}:${e.type}:${e.message}`,seen=new Set(initial.events.map(eventKey));
    let consumed=0,harvested=0,foodObservedTick=initial.tick;const cookingLedger=createSimpleMealLedger(initial.events);
    const check=(w:World)=>{
      requireEventCoverage(w,foodObservedTick);
      expect(validateWorld(w)).toEqual([]);expect(woodAccount(w)).toBe(woodAccount(initial));
      for(const e of w.events)if(!seen.has(eventKey(e))){
        seen.add(eventKey(e));const harvest=e.message.match(/a récolté (\d+) (?:baies|riz)/),meal=e.message.match(/a mangé une portion \((\d+) /);
        if(harvest)harvested+=Number(harvest[1]);if(meal)consumed+=Number(meal[1]);
      }
      observeSimpleMealLedger(cookingLedger,w.events);foodObservedTick=w.tick;
      expect(foodAccount(w)+consumed+cookingLedger.totals.unitDelta+(w.wildlife?.eatenItems??0)-(initial.wildlife?.eatenItems??0)).toBe(foodAccount(initial)+harvested);
      expect(w.pawns.every(p=>p.hunger>0&&p.rest>0&&p.state!=='dead'&&p.state!=='downed')).toBe(true);
      expect(wildlifePopulationAccount(w)).toBe(12);
    };
    for(let target=initial.tick+1000;target<=Math.max(initial.tick+1000,18000+initial.tick%1000);target+=1000){
      const current=await world(page);for(const d of playerDecisions(current,{bulkMeals:true})){await perform(page,d,rotation);decisions.push({tick:current.tick,...d});}
      await page.keyboard.press('Escape');await page.locator('[data-speed="6"]').click();await waitForTick(page,target);
      await page.locator('[data-speed="0"]').click();await expect(page.locator('[data-speed="0"]')).toHaveAttribute('aria-pressed','true');check(await world(page));
    }
    const third=await world(page),summary=colonySummary(third);
    expect(summary.structures).toEqual({'wood-generator':1,'standing-lamp':1,'passive-cooler':0,bed:4,table:1,stool:3,wall:7,campfire:1,horseshoes:1,stonecutter:1,door:1});
    expect(summary.roofing).toEqual({constructed:28,planned:28,removal:0});expect(summary.mining.steel).toBe(50);expect(summary.mining.steelInBuildings).toBe(150);
    expect(summary.medicines).toEqual({total:30,stored:30,policies:Array(4).fill('industrial')});expect(summary.apparel.filter(i=>i.owner.type==='apparel')).toHaveLength(5);
    expect(third.growingZones.find(z=>z.plant==='cotton')?.cells).toHaveLength(6);expect(third.arrivals?.accepted).toBe(1);
    const morning=await finishMaintenance(page,third,woodAccount(initial),decisions,rotation,check),final=await world(page);check(final);
    // A checkpoint at midnight can continue entirely during animal sleep.
    // Preserve accumulated consumption; the natural journey proves feeding.
    expect(final.wildlife!.eatenNutrition).toBeGreaterThanOrEqual(initial.wildlife!.eatenNutrition);
    expect(final.wildlife!.eatenNutrition).toBeGreaterThan(0);
    await panel(page,'menu');await page.locator('#save').click();await page.locator('#load').click();await expectWorld(page,final);expect(errors).toEqual([]);
    await writeTestFile(`artifacts/colony-continuation-${process.env.VALIDATION_VERSION??'v76'}.json`,JSON.stringify({date:new Date().toISOString(),initialTick:initial.tick,finalTick:final.tick,summary,morning,final:colonySummary(final),ledger:{consumed,harvested,cooking:{...cookingLedger.totals},foodReconciled:true,woodConserved:true},decisions,errors},null,2));
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
    await page.goto('/?scenario=camp&e2e&size=32');await expect(page.locator('#loading')).toHaveCount(0);await page.locator('[data-speed="0"]').click();
    await panel(page,'menu');await page.locator('#load').click();await expectWorld(page,initial);await page.keyboard.press('Escape');
    const morning=await finishMaintenance(page,initial,woodAccount(initial),decisions,{value:0});
    const final=await world(page),summary=colonySummary(final);
    expect(summary.apparel.filter(i=>i.owner.type==='apparel')).toHaveLength(4);
    expect(summary.structures).toEqual(colonySummary(initial).structures);
    expect(summary.mining.steelStored).toBe(50);expect(summary.mining.steelInBuildings).toBe(150);
    await panel(page,'menu');await page.locator('#save').click();await page.locator('#load').click();await expectWorld(page,final);
    expect(errors).toEqual([]);
    await writeTestFile(`artifacts/colony-maintenance-${process.env.VALIDATION_VERSION??'v66'}.json`,JSON.stringify({date:new Date().toISOString(),initialTick:initial.tick,finalTick:final.tick,morning,decisions,woodConserved:true,errors},null,2));
  } finally {await browser.close();}
});
