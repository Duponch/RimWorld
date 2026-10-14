import {test,expect} from '@playwright/test';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {serializeWorld,deserializeWorld,validateWorld} from '../../src/sim/serialization';
import {footprintCells} from '../../src/sim/definitions';
import {ITEM_DEFINITIONS,type ItemId} from '../../src/sim/items';
import {INGEST_TICKS} from '../../src/sim/eating';
import {physicalEatingFactor} from '../../src/sim/health-rules';
import {world,pause,panel,expectWorld,observeErrors} from './helpers';
import type {World,MaterialPile,Pawn} from '../../src/sim/types';
// Bounded continuation from the last adopted snapshot; prior UI export proofs remain separate.
const INPUT='tmp/early-access-v356/last-observed-64996.json';
const INPUT_SHA='4ee2579e4d71aacf917629f3195441aa4de3afa5aa108f877ebcb4b0bc48572a';
const GAP=8; // Current INGEST base50 and rate<=1: a fresh meal cannot finish within8ticks.
const ORIGINALS=[18530,18532,18534],TABLE={x:121,z:111},SEAT={x:123,z:111},END=66031,SLOW=65970;
const sum=(w:World,item:string)=>w.piles.filter(p=>p.item===item).reduce((n,p)=>n+p.quantity,0);
const foods=(w:World)=>w.piles.filter(p=>p.kind==='food');
type MealTrace={pawnId:number;name:string;sourceId:number;sourceObservedTick:number;source:MaterialPile|null;sourceRemainder?:number;quantity:number;carryId:number;item:ItemId;heldTick:number;lastTick:number;lastActualIngestTick?:number;lastProgress?:number;lastHunger?:number;invalidReason?:string;invalidAt?:number;dining?:unknown;ingestTick?:number;ingestProgress?:number;hungerBefore?:number;completion?:unknown};
test.use({channel:'chrome'});
test('V356 continuation from last adopted64996 to66031, no replayed construction',async({page},info)=>{
 test.skip(process.env.V356_CONTINUE!=='1','ROOT opt-in last-adopted continuation; prior red and proofs retained.');test.setTimeout(210000);page.setDefaultTimeout(12000);
 const started=Date.now(),deadline=started+150000,errors=observeErrors(page),raw=await readFile(INPUT,'utf8');expect(createHash('sha256').update(raw).digest('hex')).toBe(INPUT_SHA);
 const literal=JSON.parse(raw),initial=deserializeWorld(raw);expect(initial).toEqual({...literal,schemaVersion:initial.schemaVersion});expect(initial.tick).toBe(64996);
 const checkpoints:{name:string;tick:number;sha256:string;reloaded:boolean;screenshot:boolean}[]=[],ring:unknown[]=[],journal:unknown[]=[],meals=new Map<number,MealTrace>(),seenFood=new Map<number,{tick:number;pile:MaterialPile}>(),usedMealEvents=new Set<string>();
 let loaded=false,complete=false,failure:unknown,last:World|undefined,backend:unknown,stage='input',journalKey='',journalTick=-1,tableId:number|undefined=19697,seatId:number|undefined=19695,mealWitness=false,slow=false;
 const lifecycle:{kind:string;elapsedMs:number}[]=[];
 const onCrash=()=>lifecycle.push({kind:'pagecrash',elapsedMs:Date.now()-started}),onClose=()=>lifecycle.push({kind:'pageclose',elapsedMs:Date.now()-started}),onDisconnected=()=>lifecycle.push({kind:'browserdisconnected',elapsedMs:Date.now()-started});
 page.on('crash',onCrash);page.on('close',onClose);const browser=page.context().browser();browser?.on('disconnected',onDisconnected);
 const front=()=>page.locator('.front-menu');
 const closeMenu=async()=>{if(await page.locator('#menu-panel').isVisible())await page.locator('[data-panel="menu"]').click();await expect(page.locator('#menu-panel')).not.toBeVisible();};
 const guard=(w:World)=>{
  expect(w.pawns.filter(p=>ORIGINALS.includes(p.id)).map(p=>p.id).sort()).toEqual(ORIGINALS);for(const p of w.pawns.filter(p=>ORIGINALS.includes(p.id)))expect(physicalEatingFactor(p)).toBeLessThanOrEqual(1);
  if(w.pawns.some(p=>ORIGINALS.includes(p.id)&&(['dead','downed'].includes(p.state)||p.mental?.crisis))||w.pawns.some(p=>p.faction==='outlaws'&&!p.prisoner&&!['dead','downed'].includes(p.state))||w.wildlife?.animals.some(a=>a.manhunter&&!a.manhunter.exhausted&&!['dead','downed'].includes(a.state)))throw Error('Natural danger/incapacity stops the bounded dining day');
  // Medicine may legitimately be used by ordinary clinical providers. Never impose26 after admission.
 };
 const trackMeals=(w:World)=>{
  const invalidate=(m:MealTrace,reason:string)=>{m.invalidReason??=reason;m.invalidAt??=w.tick;m.lastTick=w.tick;};
  // seenFood contains only the immediately preceding observed ground state.
  for(const pawn of w.pawns.filter(p=>ORIGINALS.includes(p.id))){const task=pawn.need;if(task?.kind!=='eat'||task.carryPileId===null||task.sourcePileId===null||meals.has(task.carryPileId))continue;
   const carry=w.piles.find(p=>p.id===task.carryPileId),old=seenFood.get(task.sourcePileId),source=w.piles.find(p=>p.id===task.sourcePileId);if(!carry)continue;
   const trace:MealTrace={pawnId:pawn.id,name:pawn.name,sourceId:task.sourcePileId,sourceObservedTick:old?.tick??-1,source:old?.pile??null,quantity:task.quantity,carryId:carry.id,item:carry.item,heldTick:w.tick,lastTick:w.tick};meals.set(carry.id,trace);
   if(task.forced||!old||old.pile.owner.type!=='ground'||carry.kind!=='food'||carry.owner.type!=='pawn'||carry.owner.pawnId!==pawn.id||carry.quantity!==task.quantity||carry.item!==old.pile.item){invalidate(trace,'Missing or inconsistent natural ground-source/cargo history');continue;}
   if(carry.id===old.pile.id){if(old.pile.quantity!==task.quantity)invalidate(trace,'Whole pickup did not preserve exact source quantity');}
   else if(old.pile.quantity<=task.quantity||!source||source.kind!=='food'||source.owner.type!=='ground'||source.owner.x!==old.pile.owner.x||source.owner.z!==old.pile.owner.z||source.item!==old.pile.item||source.quantity!==old.pile.quantity-task.quantity||source.quantity<=0)invalidate(trace,'Split pickup lacks the exact positive same-cell source remainder');
   else trace.sourceRemainder=source.quantity;
  }
  for(const trace of meals.values()){
   if(trace.completion||trace.invalidReason)continue;
   const pawn=w.pawns.find(p=>p.id===trace.pawnId),task=pawn?.need,carry=w.piles.find(p=>p.id===trace.carryId),source=w.piles.find(p=>p.id===trace.sourceId);
   if(!pawn||pawn.name!==trace.name||w.tick<trace.lastTick){invalidate(trace,'Actor identity or clock changed');continue;}
   if(trace.sourceRemainder!==undefined){const original=trace.source;if(!original||original.owner.type!=='ground'||!source||source.owner.type!=='ground'||source.owner.x!==original.owner.x||source.owner.z!==original.owner.z||source.item!==trace.item||source.quantity!==trace.sourceRemainder){invalidate(trace,'Observed split source changed before completion');continue;}}
   const matching=task?.kind==='eat'&&!task.forced&&task.sourcePileId===trace.sourceId&&task.carryPileId===trace.carryId&&task.quantity===trace.quantity;
   if(!matching){
    // Completion can credit only the immediate disappearance of this exact observed ingestion.
    const at=trace.lastActualIngestTick,label=ITEM_DEFINITIONS[trace.item].label,message=`${trace.name} a mangé une portion (${trace.quantity} × ${label}) à table.`;
    const candidates=at===undefined?[]:w.events.filter(e=>e.tick>at&&e.tick<=w.tick&&e.message===message&&!usedMealEvents.has(`${e.tick}:${e.message}`));
    if(at!==undefined&&w.tick-at>0&&w.tick-at<=GAP&&!carry&&pawn.hunger>(trace.lastHunger??100)&&w.pawns.filter(p=>p.name===trace.name).length===1&&candidates.length===1){
     const event=candidates[0]!;usedMealEvents.add(`${event.tick}:${event.message}`);trace.completion={tick:event.tick,capturedTick:w.tick,event:structuredClone(event),hunger:pawn.hunger,state:pawn.state,cargoAbsent:true,lastActualIngestTick:at,lastProgress:trace.lastProgress};trace.lastTick=w.tick;
    }else invalidate(trace,`Attempt ended without one unique exact-label completion in the next bounded${GAP} ticks`);
    continue;
   }
   if(task?.kind!=='eat'||!carry||carry.kind!=='food'||carry.item!==trace.item||carry.quantity!==trace.quantity||carry.owner.type!=='pawn'||carry.owner.pawnId!==trace.pawnId){invalidate(trace,'Exact carry custody/item/quantity was interrupted');continue;}
   if(trace.ingestTick!==undefined&&(task.phase!=='ingest'||w.tick-trace.lastTick>GAP)){invalidate(trace,`Ingestion restarted or observation gap exceeded${GAP} ticks`);continue;}
   if(task.phase==='ingest'){
    const dining=task.dining;
    if(tableId===undefined||seatId===undefined||!dining||dining.tableId!==tableId||dining.seatId!==seatId||dining.target.x!==SEAT.x||dining.target.z!==SEAT.z||pawn.x!==SEAT.x||pawn.z!==SEAT.z||pawn.state!=='eating'||pawn.moveCooldown!==0||(pawn.motion?.end??w.tick)>w.tick){invalidate(trace,'Ingestion is not stationary at the selected actual seat/table');continue;}
    if(trace.lastProgress!==undefined&&task.progress<trace.lastProgress){invalidate(trace,'Ingestion progress regressed');continue;}
    trace.dining=structuredClone(dining);trace.ingestTick??=w.tick;trace.ingestProgress??=task.progress;trace.hungerBefore??=pawn.hunger;trace.lastActualIngestTick=w.tick;trace.lastProgress=task.progress;trace.lastHunger=pawn.hunger;
   }
   trace.lastTick=w.tick;
  }
  seenFood.clear();for(const p of foods(w))if(p.owner.type==='ground')seenFood.set(p.id,{tick:w.tick,pile:structuredClone(p)});
 };
 const read=async(conserve=false)=>{
  if(!conserve){if(lifecycle.length)throw Error('Native lifecycle event: '+lifecycle[0]!.kind);expect(errors).toEqual([]);if(Date.now()>deadline)throw Error('V356 continuation150s body bound reached');}
  const w=await world(page);last=w;backend=await page.evaluate(()=>window.__lisiere.backend);if(!conserve){guard(w);expect(await page.evaluate(()=>window.__lisiere.incident)).toMatchObject({simulationStopped:false,graphicsFault:false});trackMeals(w);}
  const sample={elapsedMs:Date.now()-started,stage,tick:w.tick,pawns:w.pawns.map(p=>({id:p.id,state:p.state,hunger:p.hunger,rest:p.rest,draft:p.draft,need:p.need,cooking:p.cooking,jobId:p.jobId,haul:p.haul,memories:p.memories,health:p.health,mental:p.mental})),food:foods(w),medicine:w.piles.filter(p=>p.item==='medicine'),wood:sum(w,'wood'),fuel:w.structures.filter(s=>s.fuel).map(s=>({id:s.id,kind:s.kind,fuel:s.fuel})),jobs:w.jobs,events:w.events.slice(-14)};
  ring.push(sample);if(ring.length>32)ring.shift();const key=JSON.stringify([stage,...w.pawns.map(p=>[p.id,p.state,p.need?.kind,p.need?.phase,p.jobId,p.cooking?.phase,p.haul?.phase])]);if(key!==journalKey||w.tick-journalTick>=60){journal.push(sample);if(journal.length>1024)journal.shift();journalKey=key;journalTick=w.tick;}return w;
 };
 const wait=async(done:(w:World)=>boolean)=>{
  while(true){const state=await read();if(done(state))return state;await page.waitForTimeout(100);}
 }; // read throws the first guard/browser/budget error directly; no expect.poll retry swallowing.
 const capture=async(name:string,reload=true,screenshot=false,conserve=false)=>{
  await pause(page);await closeMenu();const before=await read(conserve);expect(validateWorld(before)).toEqual([]);if(screenshot){expect(checkpoints.filter(c=>c.screenshot).length).toBeLessThan(2);await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve(null)))));await page.screenshot({path:info.outputPath(name+'-map.png')});}
  await panel(page,'menu');const manager=page.locator('[data-save-manager]'),label='V356 continue '+name;await manager.locator('[data-save-manager-name]').fill(label);await manager.locator('[data-save-manager-action="create"]').click();await expect(manager.locator('[data-save-manager-status]')).toHaveAttribute('data-state','success');const download=page.waitForEvent('download');await manager.locator('[data-save-manager-action="export"]').click();const path=info.outputPath(name+'.json');await(await download).saveAs(path);const text=await readFile(path,'utf8');expect(deserializeWorld(text)).toEqual(before);
  const record={name,tick:before.tick,sha256:createHash('sha256').update(text).digest('hex'),reloaded:false,screenshot};checkpoints.push(record);if(reload){expect(checkpoints.filter(c=>c.reloaded).length).toBeLessThan(3);await page.locator('#browse-saves').click();const row=front().locator('label').filter({has:page.locator('strong').filter({hasText:label})});await row.locator('input[name="front-save"]').check();await front().getByRole('button',{name:'Charger',exact:true}).click();await expectWorld(page,before);record.reloaded=true;}
  await info.attach(name,{contentType:'application/json',path});await closeMenu();return before;
 };
 const run=async(speed:1|6)=>{await closeMenu();await page.keyboard.press('Escape');await page.locator(`[data-speed="${speed}"]`).click();};
 try{
  expect(validateWorld(initial)).toEqual([]);expect(INGEST_TICKS).toBeGreaterThan(GAP);expect(sum(initial,'wood')).toBe(20);
  expect(initial.structures.find(s=>s.id===19697)).toMatchObject({kind:'table',x:121,z:111,orientation:1,material:'wood',quality:'poor'});expect(initial.structures.find(s=>s.id===19695)).toMatchObject({kind:'stool',x:123,z:111,orientation:1,material:'wood',quality:'awful'});
  expect(footprintCells(initial.structures.find(s=>s.id===19697)!)).toEqual([{x:121,z:111},{x:122,z:111}]);
  for(const c of [TABLE,{x:122,z:111},SEAT])expect(initial.roofing?.constructed.includes(c.z*initial.width+c.x)).toBe(true);
  // A portion already held at input cannot inherit a source history from a previous run.
  for(const p of initial.pawns){const n=p.need;if(n?.kind!=='eat'||n.carryPileId===null||n.sourcePileId===null)continue;const carry=initial.piles.find(i=>i.id===n.carryPileId);if(carry)meals.set(carry.id,{pawnId:p.id,name:p.name,sourceId:n.sourcePileId,sourceObservedTick:-1,source:null,quantity:n.quantity,carryId:carry.id,item:carry.item,heldTick:initial.tick,lastTick:initial.tick,invalidAt:initial.tick,invalidReason:'Portion already active in last-adopted input; source history absent'});}
  const input=info.outputPath('last-adopted-migrated-input.json');await writeFile(input,serializeWorld(initial));await page.goto('/?e2e');await front().getByRole('button',{name:'Charger une partie',exact:true}).click();await front().locator('input[type=file]').setInputFiles(input);await expectWorld(page,initial);loaded=true;await pause(page);await read();
  stage='continuation-initial';await capture('continuation-initial');
  stage='continuation-day';await run(6);
  while(true){
   let w=await read();if(w.tick>=END)break;
   if(!slow&&w.tick>=SLOW){slow=true;await run(1);w=await read();}
   const active:Pawn|undefined=w.pawns.find(p=>{const n=p.need;return ORIGINALS.includes(p.id)&&n?.kind==='eat'&&!n.forced&&(n.phase==='travel'||n.phase==='ingest')&&n.dining?.tableId===tableId&&n.dining?.seatId===seatId;});
   if(!mealWitness&&active){
    mealWitness=true;const pawnId:number=active.id,n=active.need;if(n?.kind!=='eat'||n.carryPileId===null)throw Error('Selected natural ingestion lost its task');const carryId=n.carryPileId;
    await run(1);await wait(state=>{const need=state.pawns.find(p=>p.id===pawnId)?.need;return need?.kind!=='eat'||need.carryPileId!==carryId||need.phase==='ingest';});await pause(page);w=await read();const need:Pawn['need']|undefined=w.pawns.find(p=>p.id===pawnId)?.need;
    if(need?.kind==='eat'&&need.phase==='ingest'&&need.carryPileId===carryId&&need.dining?.tableId===tableId&&need.dining?.seatId===seatId){stage='continuation-table-ingest';await capture('continuation-table-witness',true,true);}
    stage='continuation-day';await run(1);await wait(state=>{const m=meals.get(carryId),need=state.pawns.find(p=>p.id===pawnId)?.need;return !!m?.completion||!!m?.invalidReason||need?.kind!=='eat'||need.carryPileId!==carryId;});w=await read();if(w.tick>=SLOW)slow=true;await run(slow?1:6);
   }
   await page.waitForTimeout(100);
  }
  stage='continuation-final';const final=await capture('continuation-final',true,true);expect(final.tick).toBeGreaterThanOrEqual(END);
  expect(final.structures.find(s=>s.id===19697)).toMatchObject({kind:'table',x:121,z:111,orientation:1});expect(final.structures.find(s=>s.id===19695)).toMatchObject({kind:'stool',x:123,z:111});for(const c of [TABLE,{x:122,z:111},SEAT])expect(final.roofing?.constructed.includes(c.z*final.width+c.x)).toBe(true);
  expect(checkpoints.filter(c=>c.reloaded).length).toBeLessThanOrEqual(3);expect(checkpoints.every(c=>c.reloaded)).toBe(true);expect(errors).toEqual([]);complete=true;
 }catch(error){failure=error;throw error;}
 finally{
  let exportFailure:unknown,lastAdoptedFile:unknown;
  if(loaded&&failure&&!page.isClosed())try{await capture('continuation-failure-outcome',false,false,true);}catch(error){exportFailure=error;}
  // Independent fallback preserves the last actually read World, never fabricated progress or a browser recovery.
  if(last){const validation=validateWorld(last);if(!validation.length){const text=serializeWorld(last),path=info.outputPath('last-adopted-observation.json');await writeFile(path,text);lastAdoptedFile={path,tick:last.tick,sha256:createHash('sha256').update(text).digest('hex'),provenance:'last read adopted World, not UI export'};}else lastAdoptedFile={validation};}
  const traces=[...meals.values()],qualified=traces.filter(m=>!m.invalidReason&&m.ingestTick!==undefined&&m.completion!==undefined),path=info.outputPath('dining-day-v356-continuation-summary.json');
  await writeFile(path,JSON.stringify({version:356,variant:'continuation',inputPath:INPUT,inputSha:INPUT_SHA,inputProvenance:'ROOT validated last adopted snapshot64996; not previous UI export',channel:'chrome',backend,qualification:'No replay of acquired plans/construction. Bounded natural continuation64996→66031. Optional meal requires new observed source history, exact custody/progress and unique exact-label completion within8ticks below the current50tick fresh-ingestion bound. Portions already held at input remain unqualified. No forced needs/work, attribution of browser cause, campaign/FPS/speed6 certification.',result:failure||exportFailure?'partial-failure':complete?(qualified.length?'bounded-continuation-with-qualified-table-meal':'bounded-continuation-without-qualified-table-meal'):'not-loaded',elapsedMs:Date.now()-started,stage,expectedHorizon:END,slowAt:SLOW,slowSelected:slow,observationWindowTicks:GAP,observationWindowProof:"Current INGEST_TICKS50, physicalEatingFactor<=1, fresh task progress0, one advancement per tick",failure:String(failure??''),failureStack:failure instanceof Error?failure.stack:undefined,exportFailure:String(exportFailure??''),lifecycle,lastAdoptedFile,tableId,seatId,initialWood:sum(initial,'wood'),initialFuel:initial.structures.filter(s=>s.fuel).map(s=>({id:s.id,kind:s.kind,fuel:s.fuel})),initialFood:foods(initial),initialMedicine:sum(initial,'medicine'),initialMemories:initial.pawns.map(p=>({id:p.id,memories:p.memories})),checkpoints,meals:traces,qualifiedTableMealCount:qualified.length,errors,journal,ring,last},null,2));await info.attach('dining-day-v356-continuation-summary',{contentType:'application/json',path});
  page.off('crash',onCrash);page.off('close',onClose);browser?.off('disconnected',onDisconnected);
 }
});