/* PRIVATE ROOT preparation. Adoption: tests/integration/raid-recovery-driver.ts.
 * New care/nutrition/shelter mandate from real74950; every earlier ledger remains forbidden. */
import {expect,type Page,type TestInfo} from '@playwright/test';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {world,pause,panel,expectWorld,observeErrors,tool,cell,settledCells} from './helpers';
import {perform,revealCells} from './player-actions';
import {serializeWorld,deserializeWorld,validateWorld} from '../../src/sim/serialization';
import {doorOpenness} from '../../src/sim/door-rules';
import {structureMaxHp} from '../../src/sim/thing-damage-rules';
import {rescueReason,rescueProposal} from '../../src/sim/rescue';
import {currentMedicalBed} from '../../src/sim/hospital-medical-stats';
import {carrierOf} from '../../src/sim/rescue-state';
import {canDesignate} from '../../src/sim/engine';
import {blockedCells,reachableCells} from '../../src/sim/pathfinding';
import {canPlaceHumanSleepingSpot} from '../../src/sim/human-sleeping-spot';
import {treatmentTarget,treatmentTargets} from '../../src/sim/care-rules';
import {medicalBleed} from '../../src/sim/injury-state';
import {consumeReason,consumeProposal} from '../../src/sim/consuming';
import {feedingReason} from '../../src/sim/feeding-rules';
import {feedingProposal} from '../../src/sim/feeding';
import {orderReadiness} from '../../src/sim/player-orders';
import {planHaulOrder} from '../../src/sim/player-hauling';
import {constructionSupplied,deliveredMaterial} from '../../src/sim/construction-materials';
import {ITEM_DEFINITIONS,type ItemId} from '../../src/sim/items';
import type {World,Pawn,Command,Cell,MaterialPile} from '../../src/sim/types';

const SOURCE='tmp/early-access-defense/infection-74727/native-01/raid-defense-infection-Rea-8a9ca-ited-contact-care-from74727/';
const INPUT=SOURCE+'issue.json',INPUT_SHA='976b0045ca170b4ebef30058ae3f62db24be323252fe55eccd9d5b165c735663';
const PARENT_SHA='b903a3706adb849e3ca43cff00ffe259cdc20110fb4eb33546544121fbf9848f';
const ORIGINALS=[18530,18532,18534],PATIENTS=[19768,19771],IRIS=18530,GAEL=18532,LEONIE=18534,VISITOR=19771,ENEMY=19852,DOOR=18648,RIFLE=18558,STOOL=19695,MIN_END=75550,END=76150,GAP=8;
const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
const stationary=(w:World,p:Pawn)=>p.moveCooldown===0&&(p.motion?.end??w.tick)<=w.tick;
const inside=(c:Cell)=>c.x>=121&&c.x<=124&&c.z>=111&&c.z<=114;
const person=(w:World,id:number)=>w.pawns.find(p=>p.id===id)??w.visitors?.departed.find(d=>d.pawn.id===id)?.pawn;
const pawn=(w:World,id:number)=>w.pawns.find(p=>p.id===id)!;
const owned=(w:World,id:number)=>[...w.piles,...(w.visitors?.departed.find(d=>d.pawn.id===id)?.items??[])].filter(p=>'pawnId' in p.owner&&p.owner.pawnId===id);
class Stop extends Error{constructor(readonly reason:string,readonly detail:unknown){super(reason);}}

type NutritionTask={consumer:Pawn;owner:Pawn;sourceId:number;carryId:number;quantity:number;phase:string;progress:number;mode:'self'|'feed';forced:boolean};
type MealWitness={consumerId:number;ownerId:number;name:string;mode:'self'|'feed';forced:boolean;sourceId:number;carryId:number;item:ItemId;quantity:number;sourceTick:number;source?:MaterialPile;heldTick:number;lastTick:number;ingestTick?:number;lastIngestTick?:number;progress?:number;hunger?:number;invalid?:string;completion?:unknown};
/** Closed future nutrition witness, shared by real self ingestion and assisted feeding.
 * A missing source/phase or a gap above8 stays explicitly unqualified. */
function nutritionObserver(initial:World){
 const meals=new Map<string,MealWitness>(),ground=new Map<number,{tick:number;pile:MaterialPile}>(),done=new Map<number,unknown>();
 const observe=(w:World)=>{
  const piles=new Map(w.piles.map(p=>[p.id,p]));
  const tasks=w.pawns.flatMap<NutritionTask>(actor=>{
   const n=actor.need,f=actor.feed;
   if(ORIGINALS.includes(actor.id)&&n?.kind==='eat'&&n.sourcePileId!==null&&n.carryPileId!==null)return [{consumer:actor,owner:actor,sourceId:n.sourcePileId,carryId:n.carryPileId,quantity:n.quantity,phase:n.phase,progress:n.progress,mode:'self' as const,forced:!!n.forced}];
   if(f&&ORIGINALS.includes(f.patientId)&&f.sourcePileId!==null&&f.carryPileId!==null){const patient=person(w,f.patientId);if(patient)return [{consumer:patient,owner:actor,sourceId:f.sourcePileId,carryId:f.carryPileId,quantity:f.quantity,phase:f.phase,progress:f.progress,mode:'feed' as const,forced:actor.orders.active==='feed'}];}
   return [];
  });
  for(const task of tasks){
   const key=`${task.consumer.id}:${task.carryId}`;if(meals.has(key))continue;const cargo=piles.get(task.carryId),prior=ground.get(task.sourceId);
   if(!cargo)continue;const witness:MealWitness={consumerId:task.consumer.id,ownerId:task.owner.id,name:task.consumer.name,mode:task.mode,forced:task.forced,sourceId:task.sourceId,carryId:task.carryId,item:cargo.item,quantity:task.quantity,sourceTick:prior?.tick??-1,source:prior?.pile,heldTick:w.tick,lastTick:w.tick};meals.set(key,witness);
   if(!prior||w.tick-prior.tick>GAP||prior.pile.owner.type!=='ground'||cargo.kind!=='food'||cargo.owner.type!=='pawn'||cargo.owner.pawnId!==task.owner.id||cargo.quantity!==task.quantity||prior.pile.item!==cargo.item)witness.invalid='Missing fresh exact ground source/cargo relationship';
   else if(cargo.id===prior.pile.id){if(prior.pile.quantity!==task.quantity)witness.invalid='Whole pickup quantity mismatch';}
   else{const remainder=piles.get(prior.pile.id),left=prior.pile.quantity-task.quantity;if(left===0){if(remainder)witness.invalid='Whole pickup source still exists';}else if(left<0||!remainder||remainder.owner.type!=='ground'||remainder.item!==cargo.item||remainder.quantity!==left||remainder.owner.x!==prior.pile.owner.x||remainder.owner.z!==prior.pile.owner.z)witness.invalid='Split pickup remainder mismatch';}
  }
  for(const m of meals.values()){
   if(m.invalid||m.completion)continue;const patient=person(w,m.consumerId),owner=person(w,m.ownerId),task=tasks.find(t=>t.consumer.id===m.consumerId&&t.carryId===m.carryId&&t.owner.id===m.ownerId),cargo=piles.get(m.carryId);
   if(!patient||!owner){m.invalid='Actor absent';continue;}if(w.tick-m.lastTick>GAP){m.invalid='Observation gap above8';continue;}
   if(!task){const events=w.events.filter(e=>e.tick>(m.lastIngestTick??w.tick)&&e.tick<=w.tick&&e.message.startsWith(`${m.name} a mangé une portion (${m.quantity} × ${ITEM_DEFINITIONS[m.item].label})`));
    if(m.lastIngestTick!==undefined&&w.tick>m.lastIngestTick&&w.tick-m.lastIngestTick<=GAP&&!cargo&&patient.hunger>(m.hunger??100)&&events.length===1){m.completion={tick:w.tick,event:events[0],hunger:patient.hunger,qualification:'Fresh ground source, real held portion, stationary ingest/feed and final disappearance/event observed'};done.set(patient.id,m.completion);}else m.invalid='Interrupted or ambiguous final ingestion';m.lastTick=w.tick;continue;
   }
   if(!cargo||cargo.item!==m.item||cargo.quantity!==m.quantity||cargo.owner.type!=='pawn'||cargo.owner.pawnId!==m.ownerId){m.invalid='Physical cargo changed';continue;}
   if(task.phase===(m.mode==='self'?'ingest':'feed')){
    const contact=m.mode==='self'?stationary(w,patient):stationary(w,owner)&&!!currentMedicalBed(w,patient)&&Math.abs(owner.x-patient.x)+Math.abs(owner.z-patient.z)===1;
    if(!contact){m.invalid='Ingestion/feed not at physical stationary contact';continue;}
    if(m.ingestTick===undefined){if(task.progress>GAP){m.invalid='Fresh ingestion/feed start missed';continue;}m.ingestTick=w.tick;}
    if(m.progress!==undefined&&task.progress<m.progress){m.invalid='Ingestion/feed progress restarted';continue;}m.progress=task.progress;m.lastIngestTick=w.tick;m.hunger=patient.hunger;
   }else if(m.ingestTick!==undefined)m.invalid='Ingestion/feed interrupted';m.lastTick=w.tick;
  }
  ground.clear();for(const p of w.piles)if(p.kind==='food'&&p.owner.type==='ground')ground.set(p.id,{tick:w.tick,pile:structuredClone(p)});
 };
 observe(initial);return {observe,done,values:()=>[...meals.values()]};
}

export async function runRaidRecovery(page:Page,info:TestInfo){
 expect(process.env.DEFENSE_RECOVERY_WRAPPER).toBe('1');page.setDefaultTimeout(10000);
 const segment=process.env.DEFENSE_RECOVERY_SEGMENT!,seconds=Number(process.env.DEFENSE_RECOVERY_BODY_SECONDS??150);expect(segment).toMatch(/^[a-zA-Z0-9_-]{1,32}$/);expect(seconds>=100&&seconds<=150).toBe(true);
 const raw=await readFile(INPUT,'utf8');expect(hash(raw)).toBe(INPUT_SHA);const initial=deserializeWorld(raw);expect(initial).toEqual(JSON.parse(raw));expect(initial.tick).toBe(74950);expect(initial.schemaVersion).toBe(238);expect(validateWorld(initial)).toEqual([]);
 const parentText=await readFile(SOURCE+'ledger.json','utf8');expect(hash(parentText)).toBe(PARENT_SHA);const parent=JSON.parse(parentText);expect(parent.resumeAllowed).toBe(false);expect(parent.checkpoint).toMatchObject({sha256:INPUT_SHA,tick:74950,reloaded:true});expect(parent.stop).toBe('combat-ceased-and-infection-and-first-gael-care-observed');
 expect(initial.raids?.active).toBeUndefined();expect(initial.raids?.last).toMatchObject({id:2,tick:74801,reason:'defended',downed:1,killed:0});
 const errors=observeErrors(page),lifecycle:unknown[]=[],journal:unknown[]=[],ring:unknown[]=[],actions:unknown[]=[],admissions:unknown[]=[],clinicalTrace:unknown[]=[],milestones:Record<string,number>={},important:unknown[]=[],structuralDamage:unknown[]=[],production:unknown[]=[],checkpoints:{name:string;path:string;sha256:string;tick:number;reloaded:boolean}[]=[],rotation={value:0},meals=nutritionObserver(initial);
 const started=Date.now();let bodyStarted=started,deadline=Infinity,observeUntil=Infinity,loaded=false,finalizing=false,last:World|undefined,stage='input',stop='not-started',failure:unknown,exportFailure:unknown,fallback:unknown,backend:unknown,lastJournal=-1,lastKey='',uninstallAuthorized=false,newBedId:number|undefined,uninstallJobId:number|undefined,wallJobId:number|undefined,wallId:number|undefined,uninstallOrdered=false,rescueOrdered=false,wallPlanOrdered=false,gaelMealOrdered=false,irisMealOrdered=false,complete=false;
 const injuries=new Map([...ORIGINALS,...PATIENTS].map(id=>[id,new Set(person(initial,id)?.health?.injuries.map(i=>i.id)??[])])),missing=new Map([...ORIGINALS,...PATIENTS].map(id=>[id,new Set(person(initial,id)?.health?.missing.map(i=>i.part)??[])])),infections=new Map([...ORIGINALS,...PATIENTS].map(id=>[id,new Set(person(initial,id)?.health?.infections?.cases.map(i=>i.id)??[])]));
 const property=PATIENTS.flatMap(id=>owned(initial,id).filter(p=>p.kind!=='food').map(p=>structuredClone(p))),initialDamage=new Map(initial.structures.map(s=>[s.id,s.damage??0])),damageSeen=new Map(initialDamage),initialStool=initial.structures.find(s=>s.id===STOOL)!;
 const push=(a:unknown[],v:unknown,max=192)=>{a.push(v);if(a.length>max)a.shift();};
 const crash=()=>lifecycle.push({kind:'pagecrash',elapsedMs:Date.now()-started}),closed=()=>lifecycle.push({kind:'pageclose',elapsedMs:Date.now()-started}),disconnected=()=>lifecycle.push({kind:'browserdisconnected',elapsedMs:Date.now()-started});page.on('crash',crash);page.on('close',closed);const browser=page.context().browser();browser?.on('disconnected',disconnected);
 const guard=(w:World)=>{
  if(errors.length||lifecycle.length)throw new Stop('technical-event',{errors,lifecycle});
  for(const id of [...ORIGINALS,...PATIENTS]){const p=person(w,id);if(!p||p.state==='dead'||p.health?.death)throw new Stop('protected-death-or-loss',{id,tick:w.tick,p});if(ORIGINALS.includes(id)&&(p.state==='downed'||p.mental?.crisis||p.collapsePending))throw new Stop('original-incapacity',{id,tick:w.tick,p});
   if(p.mental?.crisis&&!person(initial,id)?.mental?.crisis)throw new Stop('new-protected-crisis',{id,tick:w.tick,p});if(ORIGINALS.includes(id)&&p.hunger<=12.5)throw new Stop('original-hunger-intervention-required',{id,tick:w.tick,hunger:p.hunger});
   if((p.health?.injuries.some(i=>!injuries.get(id)!.has(i.id))||p.health?.missing.some(i=>!missing.get(id)!.has(i.part))))throw new Stop('first-other-protected-injury',{id,tick:w.tick,p});
   if(p.health?.infections?.cases.some(i=>!infections.get(id)!.has(i.id)))throw new Stop('new-infection',{id,tick:w.tick,p});
   if(PATIENTS.includes(id)){expect(p).toMatchObject({faction:'outlanders',visitor:{group:5}});expect(p.visitor?.medicalGuestAt).toBe(person(initial,id)?.visitor?.medicalGuestAt);}
  }
  for(const [id,damage] of initialDamage){const s=w.structures.find(s=>s.id===id);if(!s){if(id===STOOL&&uninstallAuthorized&&w.packed.some(p=>p.building.id===STOOL)){continue;}throw new Stop('other-structure-destruction',{id,tick:w.tick,damageBefore:damage});}const maximum=structureMaxHp(s),current=s.damage??0,previous=damageSeen.get(id)??damage;
   if(current!==previous){structuralDamage.push({kind:'actual-structure-damage-change',id,tick:w.tick,damageBefore:previous,damageNow:current,maxHp:maximum,remaining:maximum-current,repairQualified:false});damageSeen.set(id,current);}
   if(id!==18663&&maximum>0&&maximum-current<=maximum*.5)throw new Stop('structure-critical-hp',{id,tick:w.tick,s,maxHp:maximum,remaining:maximum-current});
  }
  if(w.pawns.some(p=>p.id!==ENEMY&&p.faction==='outlaws'&&!p.prisoner&&!['dead','downed'].includes(p.state))||w.wildlife?.animals.some(a=>a.manhunter&&!['dead','downed'].includes(a.state))||w.fires?.items.length||(w.raids?.serial??0)!==2)throw new Stop('new-danger',{tick:w.tick,raids:w.raids});
  const enemy=w.pawns.find(p=>p.id===ENEMY);if(enemy&&!['dead','downed'].includes(enemy.state))throw new Stop('enemy-standing-again',{tick:w.tick,enemy});
  for(const old of property){const id='pawnId' in old.owner?old.owner.pawnId:0;expect(owned(w,id).find(p=>p.id===old.id)).toMatchObject({id:old.id,item:old.item,quantity:old.quantity,owner:old.owner});}
  expect(w.piles.find(p=>p.id===RIFLE)).toMatchObject({item:'bolt-action-rifle',owner:{type:'equipment',pawnId:GAEL}});
  if(!finalizing&&w.tick>=END)throw new Stop('tick-bound',{tick:w.tick,overshoot:w.tick-END});if(!finalizing&&Date.now()>deadline)throw new Stop('body-bound',{tick:w.tick,stage});
 };
 const sample=(w:World)=>({tick:w.tick,stage,people:[...ORIGINALS,...PATIENTS,ENEMY].map(id=>person(w,id)),door:w.structures.find(s=>s.id===DOOR),doorFraction:w.structures.find(s=>s.id===DOOR)?doorOpenness(w.structures.find(s=>s.id===DOOR)!,w.tick):null,piles:w.piles.filter(p=>p.kind==='food'||p.kind==='medicine'||p.item==='wood'),packed:w.packed.filter(p=>p.building.id===STOOL),raids:w.raids,jobs:w.jobs,events:w.events.slice(-15)});
 const careSignature=(w:World)=>({doctor:{x:pawn(w,IRIS).x,z:pawn(w,IRIS).z,state:pawn(w,IRIS).state,tend:pawn(w,IRIS).tend,orders:pawn(w,IRIS).orders,motion:pawn(w,IRIS).motion,cargo:w.piles.filter(p=>p.owner.type==='pawn'&&p.owner.pawnId===IRIS)},patient:{x:pawn(w,GAEL).x,z:pawn(w,GAEL).z,state:pawn(w,GAEL).state,need:pawn(w,GAEL).need,health:pawn(w,GAEL).health}});
 const read=async(conserve=false)=>{
  const w=await world(page);last=w;backend=await page.evaluate(()=>window.__lisiere.backend);
  if(!finalizing){meals.observe(w);const g=pawn(w,GAEL),doctor=pawn(w,IRIS),v=pawn(w,VISITOR);
   if(milestones.inheritedCareComplete===undefined&&!treatmentTarget(g)&&doctor.tend?.patientId!==GAEL){milestones.inheritedCareComplete=w.tick;important.push({kind:'inherited-gael-tending-finished',tick:w.tick,patient:g,doctor,qualification:'Existing task really finished; no repeated tend order'});}
   if(milestones.gaelBleedingStopped===undefined&&g.health?.injuries.find(i=>i.id===17)?.tended!==undefined&&g.health?.injuries.find(i=>i.id===18)?.tended!==undefined&&medicalBleed(g.health)===0){milestones.gaelBleedingStopped=w.tick;important.push({kind:'real-bleeding-wounds-tended',tick:w.tick,patient:g,qualification:'Bleeding stopped by actual treatments; blood lost and infection risk persist'});}
   if(milestones.visitorDeposit===undefined&&rescueOrdered&&currentMedicalBed(w,v)&&!carrierOf(w,v.id)&&!pawn(w,LEONIE).rescue){milestones.visitorDeposit=w.tick;important.push({kind:'real-visitor-bed-deposit',tick:w.tick,patient:v,bed:currentMedicalBed(w,v)});}
   const rebuilt=w.structures.find(s=>s.kind==='wall'&&s.x===120&&s.z===113&&s.id!==18663);
   if(rebuilt&&wallPlanOrdered&&milestones.wallRebuilt===undefined){wallId=rebuilt.id;milestones.wallRebuilt=w.tick;production.push({kind:'real-new-wall-rebuilt',tick:w.tick,structure:rebuilt,qualification:'New paid physical structure; old18663 and destroyed ledger remain historical'});}
   push(clinicalTrace,{tick:w.tick,doctor:{state:doctor.state,tend:doctor.tend,cargo:w.piles.filter(p=>p.owner.type==='pawn'&&p.owner.pawnId===IRIS)},gael:{state:g.state,need:g.need,health:g.health,hunger:g.hunger,rest:g.rest},visitor:{state:v.state,need:v.need,health:v.health,hunger:v.hunger},leonie:pawn(w,LEONIE)},192);
  }
  const value=sample(w);push(ring,value,16);const key=JSON.stringify([stage,...w.pawns.filter(p=>ORIGINALS.includes(p.id)||p.id===VISITOR).map(p=>[p.id,p.state,p.need?.kind,p.tend?.phase,p.rescue?.phase,p.feed?.phase,p.jobId]),w.jobs.find(j=>j.id===wallJobId)?.construction]);
  if(w.tick-lastJournal>=20||key!==lastKey){push(journal,value,256);lastJournal=w.tick;lastKey=key;}
  if(!conserve){guard(w);const technical=await page.evaluate(()=>window.__lisiere.incident);if(technical.graphicsFault||technical.simulationStopped)throw new Stop('technical-incident',technical);}
  return w;
 };
 const closeMenu=async()=>{if(await page.locator('#menu-panel').isVisible())await page.locator('[data-panel="menu"]').click();};
 const run=async(speed:1|6)=>{await pause(page);await read();await closeMenu();await page.keyboard.press('Escape');await page.locator(`[data-speed="${speed}"]`).click();};
 const wait=async(done:(w:World)=>boolean)=>{while(Date.now()<observeUntil){const w=await read();if(done(w))return w;await page.waitForTimeout(100);}throw new Stop('segment-bound',{tick:last?.tick,stage});};
 const act=async(command:Command,reason:string)=>{await pause(page);const before=await read(),signature=structuredClone(careSignature(before));if(milestones.inheritedCareComplete===undefined&&'pawnId' in command&&command.pawnId===IRIS)throw new Stop('would-interrupt-inherited-doctor-task',{command});await perform(page,{command,reason},rotation);const w=await read();if(milestones.inheritedCareComplete===undefined){expect(w.tick).toBe(before.tick);expect(careSignature(w)).toEqual(signature);}actions.push({command,reason,tick:w.tick});return w;};
 const capture=async(name:string,reload:boolean,conserve=false)=>{
  await pause(page);await closeMenu();const before=await read(conserve);expect(validateWorld(before)).toEqual([]);expect(checkpoints.length).toBeLessThan(2);await page.screenshot({path:info.outputPath(name+'.png')});
  await panel(page,'menu');const manager=page.locator('[data-save-manager]'),label=`Recovery ${segment} ${name}`;await manager.locator('[data-save-manager-name]').fill(label);await manager.locator('[data-save-manager-action="create"]').click();await expect(manager.locator('[data-save-manager-status]')).toHaveAttribute('data-state','success');
  const download=page.waitForEvent('download');await manager.locator('[data-save-manager-action="export"]').click();const path=info.outputPath(name+'.json');await(await download).saveAs(path);const text=await readFile(path,'utf8');expect(deserializeWorld(text)).toEqual(before);const record={name,path,sha256:hash(text),tick:before.tick,reloaded:false};checkpoints.push(record);
  if(reload){await page.locator('#browse-saves').click();const front=page.locator('.front-menu'),row=front.locator('label').filter({has:page.locator('strong').filter({hasText:label})});await row.locator('input[name="front-save"]').check();await front.getByRole('button',{name:'Charger',exact:true}).click();await expect(page.locator('.game-shell')).toHaveJSProperty('inert',false,{timeout:90000});await expectWorld(page,before);record.reloaded=true;}
  await closeMenu();return before;
 };
 const consumeVisible=async(id:number)=>{
  await pause(page);let w=await read();if(id===IRIS&&milestones.inheritedCareComplete===undefined)throw new Stop('would-interrupt-inherited-doctor-task',{id});
  const p=pawn(w,id),candidates=[19664,19655].flatMap(sourceId=>{const pile=w.piles.find(p=>p.id===sourceId),reason=consumeReason(w,p,pile),proposal=reason?undefined:consumeProposal(w,p,pile);admissions.push({kind:'real-clean-interior-consume-admission',tick:w.tick,pawnId:id,sourceId,reason,proposal});return pile&&!reason&&proposal?[pile]:[];});
  const food=candidates[0];if(!food||food.owner.type!=='ground')throw new Stop('interior-ration-admission-refused',{tick:w.tick,pawnId:id});
  const before=structuredClone(careSignature(w));await page.keyboard.press('Escape');await page.locator(`[data-pawn="${id}"]`).click();await revealCells(page,[food.owner]);await settledCells(page,[food.owner]);
  const point=await page.evaluate(c=>{const b=document.querySelector('#viewport canvas')!.getBoundingClientRect(),p=window.__lisiere.projectCell(c.x,c.z);return {x:b.x+p.x,y:b.y+p.y};},food.owner);expect(await page.evaluate(p=>document.elementFromPoint(p.x,p.y)?.tagName,point)).toBe('CANVAS');
  await page.mouse.click(point.x,point.y,{button:'right'});const button=page.locator(`[data-order-consume="${food.id}"]`);await expect(button).toBeEnabled();await button.click();w=await wait(state=>{const n=pawn(state,id).need;return n?.kind==='eat'&&n.forced===true&&n.sourcePileId===food.id;});
  if(milestones.inheritedCareComplete===undefined)expect(careSignature(w)).toEqual(before);actions.push({kind:'real-interior-consume-accepted',tick:w.tick,pawnId:id,sourceId:food.id,source:food});
 };
 const createMedicalSpot=async()=>{
  await pause(page);let w=await read();const command={type:'designate' as const,kind:'sleeping-spot' as const,x:123,z:111,orientation:1 as const},admission=canDesignate(w,command),specific=canPlaceHumanSleepingSpot(w,command);
  admissions.push({kind:'real-new-sleeping-spot-admission',tick:w.tick,command,admission,specific,packed:w.packed.filter(p=>p.building.id===STOOL)});if(!admission.ok||!specific.ok)throw new Stop('new-medical-spot-admission-refused',{tick:w.tick,admission,specific});
  const signature=structuredClone(careSignature(w));await page.keyboard.press('Escape');await tool(page,'sleeping-spot');
  const angle=async()=>{const text=(await page.locator('#placement-orientation').innerText()).trim();expect(text).toMatch(/^(0|90|180|270)°$/);return Number(text.replace('°',''))/90;};
  for(let n=0;n<4&&await angle()!==1;n++)await page.keyboard.press('e');expect(await angle()).toBe(1);rotation.value=1;await revealCells(page,[{x:123,z:111},{x:124,z:111}]);await cell(page,123,111);
  w=await wait(state=>state.structures.some(s=>s.kind==='sleeping-spot'&&s.x===123&&s.z===111&&s.orientation===1));const spot=w.structures.find(s=>s.kind==='sleeping-spot'&&s.x===123&&s.z===111&&s.orientation===1)!;newBedId=spot.id;milestones.newSpot=w.tick;
  if(milestones.inheritedCareComplete===undefined)expect(careSignature(w)).toEqual(signature);actions.push({kind:'real-new-floorbed-placed',tick:w.tick,spot});await act({type:'medical-bed',bedId:spot.id,enabled:true},'Définir le vrai couchage supplémentaire comme médical, sans affectation forcée');
 };
 const quietSpeed=async(w:World)=>{
  const busy=w.pawns.some(p=>ORIGINALS.includes(p.id)&&(p.need?.kind==='eat'||p.feed||p.rescue))||milestones.inheritedCareComplete===undefined||ORIGINALS.some(id=>!meals.done.has(id));
  const speed=busy?1:6,button=page.locator(`[data-speed="${speed}"]`);if(await button.getAttribute('aria-pressed')!=='true')await button.click();
 };
 try{
  const file=info.outputPath('literal-input.json');await writeFile(file,raw);await page.goto('/?e2e');const front=page.locator('.front-menu');await front.getByRole('button',{name:'Charger une partie',exact:true}).click();await front.locator('input[type=file]').setInputFiles(file);await expect(page.locator('.game-shell')).toHaveJSProperty('inert',false,{timeout:90000});await expectWorld(page,initial);loaded=true;bodyStarted=Date.now();deadline=bodyStarted+seconds*1000;observeUntil=deadline-18000;
  await pause(page);stage='initial';await capture('initial',true);let w=await read();
  expect(pawn(w,IRIS)).toMatchObject({x:122,z:113,state:'working',orders:{active:'tend',queue:[]},tend:{patientId:GAEL,phase:'tend',progress:28,duration:852,medicine:{sourcePileId:19845,carryPileId:19845,quantity:2},useMedicine:true}});expect(pawn(w,IRIS).draft).toBeUndefined();
  expect(pawn(w,GAEL)).toMatchObject({x:122,z:114,state:'resting',health:{bloodLoss:21311820},need:{kind:'sleep',phase:'sleep',bedId:19797,medical:'patient'}});expect(pawn(w,GAEL).health?.injuries).toHaveLength(9);expect(pawn(w,GAEL).health?.injuries.filter(i=>i.tended!==undefined).map(i=>i.id)).toEqual([22,25]);expect(pawn(w,GAEL).health?.injuries.find(i=>i.id===17)?.tended).toBeUndefined();expect(pawn(w,GAEL).health?.injuries.find(i=>i.id===18)?.tended).toBeUndefined();
  expect(pawn(w,VISITOR)).toMatchObject({x:123,z:111,state:'downed',need:null,visitor:{medicalGuestAt:72942},health:{infections:{immunity:24221352,cases:[{id:1,severity:27718998,tend:{quality:385,expiresAtCore:785630}}]}}});expect(pawn(w,ENEMY)).toMatchObject({x:119,z:114,state:'downed'});expect(w.structures.some(s=>s.id===18663)).toBe(false);
  expect(w.piles.find(p=>p.id===19845)).toMatchObject({quantity:2,owner:{type:'pawn',pawnId:IRIS}});expect(w.piles.find(p=>p.id===19678)).toMatchObject({quantity:18,owner:{type:'ground',x:124,z:114}});expect(w.piles.find(p=>p.id===19776)).toMatchObject({quantity:3,owner:{type:'inventory',pawnId:VISITOR}});
  important.push({kind:'inherited-clinical-task-and-cargo',tick:w.tick,care:structuredClone(careSignature(w)),visitor:pawn(w,VISITOR),enemy:pawn(w,ENEMY),qualification:'No repeated tend/dose/attack; infection remains ill and foe remains alive/downed'});
  admissions.push({kind:'initial-bed-conflict',tick:w.tick,result:canDesignate(w,{type:'designate',kind:'sleeping-spot',x:123,z:111,orientation:1}),conflict:w.structures.find(s=>s.id===STOOL)});
  stage='leonie-real-nutrition';await act({type:'draft',pawnIds:[LEONIE],enabled:false},'Démobiliser Léonie pour ses besoins et l’assistance réelle, sans modifier les soins d’Iris');await consumeVisible(LEONIE);await run(1);
  while(Date.now()<observeUntil){
   w=await read();const leo=pawn(w,LEONIE),g=pawn(w,GAEL),v=pawn(w,VISITOR),doctor=pawn(w,IRIS);
   if(milestones.inheritedCareComplete===undefined&&doctor.tend?.patientId!==GAEL)throw new Stop('inherited-tending-ended-before-current-wounds-finished',{tick:w.tick,doctor,patient:g,targets:treatmentTargets(g)});
   const leoCritical=!!leo.rescue||!!leo.feed||leo.need?.kind==='eat';
   if(meals.done.has(LEONIE)&&!uninstallOrdered&&!leoCritical){
    await pause(page);w=await read();const command={type:'designate' as const,kind:'uninstall' as const,x:123,z:111,targetId:STOOL},admission=canDesignate(w,command);admissions.push({kind:'real-stool-uninstall-admission',tick:w.tick,command,admission});if(!admission.ok)throw new Stop('stool-uninstall-admission-refused',{tick:w.tick,admission});
    uninstallAuthorized=true;await act(command,'Désinstaller réellement le tabouret qui bloque la place du patient, en conservant son identité');w=await read();const job=w.jobs.find(j=>j.kind==='uninstall'&&j.furniture?.structureId===STOOL);if(!job)throw new Stop('uninstall-job-not-adopted',{tick:w.tick});uninstallJobId=job.id;
    const reason=orderReadiness(w,pawn(w,LEONIE),job);admissions.push({kind:'real-stool-work-admission',tick:w.tick,reason,job});if(reason)throw new Stop('stool-work-admission-refused',{tick:w.tick,reason});await act({type:'order-job',pawnId:LEONIE,jobId:job.id,queue:false},'Prioriser le vrai travail de désinstallation après la ration de Léonie');uninstallOrdered=true;stage='real-medical-space';await run(1);continue;
   }
   if(uninstallOrdered&&newBedId===undefined&&!w.structures.some(s=>s.id===STOOL)&&!w.jobs.some(j=>j.id===uninstallJobId)){
    const packed=w.packed.find(p=>p.building.id===STOOL);expect(packed).toBeDefined();expect(packed?.building).toEqual(initialStool);expect(packed?.owner.type==='ground'||packed?.owner.type==='pawn'&&ORIGINALS.includes(packed.owner.pawnId)).toBe(true);important.push({kind:'real-stool-uninstalled-and-conserved',tick:w.tick,packed});milestones.stoolUninstalled=w.tick;await createMedicalSpot();w=await read();
    const reason=rescueReason(w,pawn(w,LEONIE),pawn(w,VISITOR),true),proposal=reason?undefined:rescueProposal(w,pawn(w,LEONIE),pawn(w,VISITOR),reachableCells(w,pawn(w,LEONIE),blockedCells(w),new Set()),true);admissions.push({kind:'real-visitor-rescue-admission',tick:w.tick,reason,proposal});if(reason||!proposal)throw new Stop('visitor-rescue-admission-refused',{tick:w.tick,reason,proposal});
    await act({type:'order-rescue',pawnId:LEONIE,patientId:VISITOR,queue:false},'Secourir le visiteur au vrai couchage choisi par les règles, sans affecter le lit de Gaël');rescueOrdered=true;stage='real-visitor-bed-rescue';await run(1);continue;
   }
   if(rescueOrdered&&milestones.visitorDeposit===undefined&&!leo.rescue&&v.state==='downed'&&!currentMedicalBed(w,v))throw new Stop('accepted-rescue-ended-before-deposit',{tick:w.tick,doctor:leo,patient:v});
   if(milestones.inheritedCareComplete!==undefined&&!meals.done.has(IRIS)&&!irisMealOrdered&&doctor.need?.kind!=='eat'){
    stage='iris-real-nutrition-after-inherited-care';await consumeVisible(IRIS);irisMealOrdered=true;await run(1);continue;
   }
   if(milestones.inheritedCareComplete!==undefined&&!meals.done.has(GAEL)&&!gaelMealOrdered&&!leoCritical&&milestones.visitorDeposit!==undefined){
    await pause(page);w=await read();const reason=feedingReason(w,pawn(w,LEONIE),pawn(w,GAEL)),proposal=reason?undefined:feedingProposal(w,pawn(w,LEONIE),pawn(w,GAEL),reachableCells(w,pawn(w,LEONIE),blockedCells(w),new Set()));admissions.push({kind:'real-gael-feeding-admission',tick:w.tick,reason,proposal});
    if(!reason&&proposal){await act({type:'order-feed',pawnId:LEONIE,patientId:GAEL,queue:false},'Nourrir Gaël au vrai chevet après libération des soins, avec une portion physique');gaelMealOrdered=true;stage='gael-real-assisted-feeding';await run(1);continue;}
    const ownReason=consumeReason(w,pawn(w,GAEL),w.piles.find(p=>p.id===19664));if(!ownReason){await consumeVisible(GAEL);gaelMealOrdered=true;stage='gael-real-self-nutrition';await run(1);continue;}
   }
   if(milestones.inheritedCareComplete!==undefined&&milestones.gaelBleedingStopped!==undefined&&milestones.visitorDeposit!==undefined&&ORIGINALS.every(id=>meals.done.has(id))&&!wallPlanOrdered&&!leoCritical){
    await pause(page);w=await read();const command={type:'designate' as const,kind:'wall' as const,x:120,z:113,orientation:0 as const,material:'wood' as const},admission=canDesignate(w,command);admissions.push({kind:'real-breach-rebuild-admission',tick:w.tick,command,admission});if(!admission.ok)throw new Stop('breach-rebuild-admission-refused',{tick:w.tick,admission});
    await act(command,'Reconstruire la brèche avec cinq bois réellement livrés, sans rétablir l’ancien mur détruit');w=await read();const job=w.jobs.find(j=>j.kind==='wall'&&j.x===120&&j.z===113);if(!job)throw new Stop('wall-job-not-adopted',{tick:w.tick});wallJobId=job.id;wallPlanOrdered=true;stage='physical-shelter-rebuild';await run(1);continue;
   }
   if(wallPlanOrdered&&milestones.wallRebuilt===undefined&&wallJobId!==undefined&&!leoCritical){
    const job=w.jobs.find(j=>j.id===wallJobId);if(!job&&!w.structures.some(s=>s.kind==='wall'&&s.x===120&&s.z===113))throw new Stop('wall-job-ended-without-wall',{tick:w.tick});
    if(job){
     push(production,{tick:w.tick,job,deliveredWood:deliveredMaterial(w,job,'wood'),leo:{jobId:leo.jobId,haul:leo.haul},wood:w.piles.filter(p=>p.item==='wood')},128);
     if(!constructionSupplied(w,job)&&!(leo.haul?.destination.type==='job'&&leo.haul.destination.jobId===job.id)){
      const proposal=planHaulOrder(w,leo,{type:'job',jobId:job.id});admissions.push({kind:'real-wall-wood-delivery-admission',tick:w.tick,proposal});if(!proposal.reason&&proposal.task){await act({type:'order-haul',pawnId:LEONIE,target:{type:'job',jobId:job.id},queue:false},'Collecter et livrer le vrai bois extérieur au chantier de la brèche');await run(1);continue;}
     }else if(constructionSupplied(w,job)&&job.reservedBy===null&&leo.jobId!==job.id){
      const reason=orderReadiness(w,leo,job);admissions.push({kind:'real-wall-work-admission',tick:w.tick,reason,job});if(!reason){await act({type:'order-job',pawnId:LEONIE,jobId:job.id,queue:false},'Finir le vrai mur après approvisionnement physique');await run(1);continue;}
     }
    }
   }
   const goal=milestones.inheritedCareComplete!==undefined&&milestones.gaelBleedingStopped!==undefined&&milestones.visitorDeposit!==undefined&&milestones.wallRebuilt!==undefined&&ORIGINALS.every(id=>meals.done.has(id));
   if(goal&&w.tick>=MIN_END){await pause(page);w=await read();expect(treatmentTarget(pawn(w,GAEL))).toBeUndefined();expect(medicalBleed(pawn(w,GAEL).health!)).toBe(0);expect(currentMedicalBed(w,pawn(w,VISITOR))).toBeDefined();expect(w.structures.find(s=>s.id===wallId)).toMatchObject({kind:'wall',x:120,z:113,material:'wood'});complete=true;stop='bounded-care-nutrition-and-shelter-observed';break;}
   await quietSpeed(w);await page.waitForTimeout(100);
  }
  if(!complete)throw new Stop('recovery-window-bound',{tick:last?.tick,min:MIN_END,max:END,milestones,nutritionObserved:[...meals.done.keys()]});
 }catch(e){failure=e instanceof Stop?{reason:e.reason,detail:e.detail}:e;stop=e instanceof Stop?e.reason:'technical-or-oracle-error';}
 finally{
  finalizing=true;if(loaded&&!page.isClosed()&&checkpoints.length<2)try{stage=failure?'conservation':'issue';await capture(stage,!failure,!!failure);}catch(e){exportFailure=String(e);}
  if(last){const validation=validateWorld(last);if(!validation.length){const text=serializeWorld(last),path=info.outputPath('last-adopted.json');await writeFile(path,text);fallback={path,tick:last.tick,sha256:hash(text),provenance:'Last adopted read, not UI export'};}else fallback={validation:validation.slice(0,12),count:validation.length};}
  const ledger={kind:'explicit-care-nutrition-and-shelter-from74950',inputSha:INPUT_SHA,parentLedgerSha:PARENT_SHA,newMandate:true,priorAllDefenseLedgersRemainForbidden:true,priorInfectionResumeStillForbidden:true,segment,checkpoint:checkpoints.at(-1),resumeAllowed:false,stop,actions,milestones,important,nutrition:meals.values(),newBedId,wallId,wallJobId,uninstallJobId,structuralDamage};const ledgerPath=info.outputPath('ledger.json'),text=JSON.stringify(ledger,null,2);await writeFile(ledgerPath,text);
  const report=info.outputPath('raid-recovery-summary.json');await writeFile(report,JSON.stringify({segment,inputPath:INPUT,inputSha:INPUT_SHA,parentLedgerSha:PARENT_SHA,inputSchema:initial.schemaVersion,channel:'chrome',backend,bodyMs:Date.now()-bodyStarted,overallMs:Date.now()-started,stop,failure:failure instanceof Error?{message:failure.message,stack:failure.stack}:failure,exportFailure,milestones,important,admissions,clinicalTrace,nutrition:meals.values(),production,structuralDamage,actions,newBedId,wallId,checkpoints,ledger:{path:ledgerPath,sha256:hash(text)},interventionQualified:complete&&!failure&&!exportFailure,campaignQualified:false,globalHealingQualified:false,infectionCureQualified:false,wholeDayQualified:false,errors,lifecycle,journal,ring,fallback,last:last?sample(last):null},null,2));await info.attach('raid recovery summary',{contentType:'application/json',path:report});page.off('crash',crash);page.off('close',closed);browser?.off('disconnected',disconnected);
 }
 if(failure)throw failure instanceof Error?failure:new Error(JSON.stringify(failure));expect(exportFailure).toBeUndefined();expect(stop,'A conserved partial result never proves full recovery').toBe('bounded-care-nutrition-and-shelter-observed');expect(checkpoints.at(-1)?.reloaded).toBe(true);
}
