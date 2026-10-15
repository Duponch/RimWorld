/* Opt-in real85990 contact qualification with explicitly accepted combat losses.
 * ROOT-reviewed single intervention; historical inputs and ledgers remain immutable. */
import {expect,type Page,type TestInfo} from '@playwright/test';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {world,pause,panel,expectWorld,observeErrors,settledCells} from './helpers';
import {perform,revealCells} from './player-actions';
import {serializeWorld,deserializeWorld,validateWorld} from '../../src/sim/serialization';
import {shotPlan,shootingQueries} from '../../src/sim/shooting';
import {shotCover} from '../../src/sim/combat-report';
import {doorOpenness} from '../../src/sim/door-rules';
import {canStandAt} from '../../src/sim/furniture-travel';
import {meleeContact,meleePlaces,meleeRoute} from '../../src/sim/melee-space';
import {blockedCells} from '../../src/sim/pathfinding';
import {medicalBleed,medicalBleedUnits} from '../../src/sim/injury-state';
import {pawnBody} from '../../src/sim/health-rules';
import {structureMaxHp} from '../../src/sim/thing-damage-rules';
import type {World,Pawn,Command,Cell} from '../../src/sim/types';

const SOURCE='tmp/early-access-defense/raid3-north-adopted-01/native-01/raid-third-flank-Real-raid-5883c-g-and-counterfire-from85961/';
const INPUT=SOURCE+'conservation.json';
const INPUT_SHA='7ef6d416f91042a03e7a877e341a71f8ef11163bd7168fc4b759c61e79b0eabc';
const PARENT_SHA='8b9a885e63cd46d946a4affb614341ab011c69ab6ebafafb43bea2a71c3bc352';
const PRODUCTIVE_SOURCE='tmp/early-access-productive-research/adopted-05/native-05/early-productive-research--961a2-energy-goal-only-in-summary/ledger.json';
const PRODUCTIVE_SHA='fca539be6d24875ca99f31a4f14525769222172cbdd61b3031c91d68d2057591';
const IRIS=18530,GAEL=18532,LEONIE=18534,ENEMY=20141,DOOR=18648,RIFLE=18558,REPAIR=20149,END=87190;
const ORIGINALS=[IRIS,GAEL,LEONIE],PATIENTS=[19768,19771],PROTECTED=[...ORIGINALS,...PATIENTS];
const GAEL_POST:Cell={x:123,z:114},IRIS_RETURN:Cell={x:124,z:111},IRIS_REFUGE:Cell={x:121,z:113},LEONIE_REFUGE:Cell={x:122,z:112};
const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
const stationary=(w:World,p:Pawn)=>p.moveCooldown===0&&(p.motion?.end??w.tick)<=w.tick;
const inside=(c:Cell)=>c.x>=121&&c.x<=124&&c.z>=111&&c.z<=114;
const same=(a:Cell,b:Cell)=>a.x===b.x&&a.z===b.z;
const person=(w:World,id:number)=>w.pawns.find(p=>p.id===id)??w.visitors?.departed.find(d=>d.pawn.id===id)?.pawn;
const pawn=(w:World,id:number)=>w.pawns.find(p=>p.id===id)!;
const owned=(w:World,id:number)=>[...w.piles,...(w.visitors?.departed.find(d=>d.pawn.id===id)?.items??[])].filter(p=>'pawnId' in p.owner&&p.owner.pawnId===id);
class Stop extends Error{constructor(readonly reason:string,readonly detail:unknown){super(reason);}}

export async function runRaidThirdContact(page:Page,info:TestInfo){
 expect(process.env.DEFENSE_WRAPPER).toBe('1');page.setDefaultTimeout(10000);
 const segment=process.env.DEFENSE_SEGMENT!,seconds=Number(process.env.DEFENSE_BODY_SECONDS??120);
 expect(segment).toMatch(/^[a-zA-Z0-9_-]{1,32}$/);expect(seconds>=100&&seconds<=150).toBe(true);
 const raw=await readFile(INPUT,'utf8');expect(hash(raw)).toBe(INPUT_SHA);
 const initial=deserializeWorld(raw);expect(initial).toEqual({...JSON.parse(raw),schemaVersion:initial.schemaVersion});expect(initial.tick).toBe(85990);expect(validateWorld(initial)).toEqual([]);
 const parentText=await readFile(SOURCE+'ledger.json','utf8');expect(hash(parentText)).toBe(PARENT_SHA);const parent=JSON.parse(parentText);
 expect(parent).toMatchObject({kind:'explicit-raid-defense',resumeAllowed:false,inputSha:'996eb6ec714569d3ed87461d2b84f1e87b9ac6e718da7d9f2e336473d7dedc32',parentLedgerSha:'9c4018a58e1efebc9ddb41b04097811c9b7c7201d2c649d4fb5cd1ec8a8b0e82'});
 expect(parent.checkpoint).toMatchObject({sha256:INPUT_SHA,tick:85990,reloaded:false});
 expect(parent.productiveParent).toMatchObject({protocol:'productive-research-v2',originTick:75566,horizon:111566,parentLedgerSha:PRODUCTIVE_SHA,fullLedgerSha256:PRODUCTIVE_SHA});
 const productiveText=await readFile(PRODUCTIVE_SOURCE,'utf8');expect(hash(productiveText)).toBe(PRODUCTIVE_SHA);const productive=JSON.parse(productiveText);
 expect(productive).toMatchObject({protocol:'productive-research-v2',originTick:75566,horizon:111566,resumeAllowed:false,truncated:false});expect(parent.productiveParent.fullLedger).toEqual(productive);
 const reviewPath=process.env.DEFENSE_ENTRY_REVIEW,reviewSha=process.env.DEFENSE_ENTRY_REVIEW_SHA;
 if(!reviewPath||!reviewSha)throw Error('ROOT must supply a distinct contact mandate.');
 const reviewText=await readFile(reviewPath,'utf8');expect(hash(reviewText)).toBe(reviewSha);const review=JSON.parse(reviewText);
 expect(review).toMatchObject({kind:'raid3-contact-entry-v1',newMandate:true,reviewedBy:'ROOT',priorLedgersRemainForbidden:true,source:{sha256:INPUT_SHA,ledgerSha256:PARENT_SHA,tick:85990,checkpointReloaded:false,parentResumeAllowed:false},defenseHorizon:END,productiveOrigin:75566,productiveHorizon:111566,allowedDestroyedStructure:DOOR,allowedCombatInjuriesPawnId:GAEL,stopOnNewMissingPart:true,acceptedCollaterals:'initial-cabin-wood-walls-above-half-hp'});
 expect(initial.raids?.active).toMatchObject({id:3,phase:'assault',members:[ENEMY]});
 expect(initial.structures.some(s=>s.id===18661)).toBe(false);expect(initial.deconstructed).toMatchObject({count:1,lostWood:3});
 expect(initial.piles.find(p=>p.id===20151)).toMatchObject({item:'wood',quantity:2,owner:{type:'ground',x:124,z:110}});
 expect(initial.structures.find(s=>s.id===DOOR)).toMatchObject({kind:'door',material:'wood',damage:70,door:{open:false,forbidden:true}});
 expect(initial.jobs.find(j=>j.id===REPAIR)).toMatchObject({kind:'repair',reservedBy:LEONIE,progress:61,workRemainder:2000,repair:{structureId:DOOR}});
 expect(initial.jobs.find(j=>j.id===REPAIR)?.repair?.warmed).toBeUndefined();
 expect(pawn(initial,GAEL)).toMatchObject({x:123,z:114,draft:{holdFire:true}});
 const inheritedMotion=structuredClone(pawn(initial,IRIS).motion!);
 expect(inheritedMotion).toMatchObject({from:{x:124,z:111},to:{x:124,z:110},start:85987,end:85990.95});
 expect(pawn(initial,IRIS).cooking).toMatchObject({phase:'gather',ingredients:[{pileId:20144,stage:'source'}]});
 const wood=initial.piles.filter(p=>p.item==='wood').map(p=>structuredClone(p)),plans=initial.jobs.filter(j=>j.id>=20050&&j.id<=20061).map(j=>structuredClone(j));
 expect(wood.reduce((n,p)=>n+p.quantity,0)).toBe(143);expect(plans).toHaveLength(12);
 const initialDamage=new Map(initial.structures.map(s=>[s.id,s.damage??0]));
 const incidentalWalls=new Set(initial.structures.filter(s=>s.kind==='wall'&&s.material==='wood'&&s.x>=120&&s.x<=125&&s.z>=110&&s.z<=115).map(s=>s.id));
 const previousDamage=new Map<number,number|null>(initial.structures.map(s=>[s.id,s.damage??0]));
 const injuries=new Map(PROTECTED.map(id=>[id,new Set(person(initial,id)?.health?.injuries.map(i=>i.id)??[])]));
 const missing=new Map(PROTECTED.map(id=>[id,new Set(person(initial,id)?.health?.missing.map(i=>i.part)??[])]));
 const infections=new Map(PROTECTED.map(id=>[id,new Set(person(initial,id)?.health?.infections?.cases.map(i=>i.id)??[])]));
 const property=PATIENTS.flatMap(id=>owned(initial,id).filter(p=>p.kind!=='food').map(p=>structuredClone(p)));
 const identity=PROTECTED.map(id=>{const p=person(initial,id)!;return {id,name:p.name,appearance:structuredClone(p.appearance),background:p.background,traits:p.traits};});
 const errors=observeErrors(page),lifecycle:unknown[]=[],actions:unknown[]=[],geometry:unknown[]=[],combatTrace:unknown[]=[],gaelHealthTrace:unknown[]=[],gaelDamageTrace:unknown[]=[],collateralTrace:unknown[]=[],doorTrace:unknown[]=[],civilTrace:unknown[]=[],artifactErrors:unknown[]=[],conservationDiagnostics:unknown[]=[],checkpoints:{name:string;path:string;sha256:string;tick:number;reloaded:boolean}[]=[],journal:unknown[]=[],ring:unknown[]=[],rotation={value:0};
 const started=Date.now();let bodyStarted=started,deadline=Infinity,observeUntil=Infinity,loaded=false,finalizing=false,last:World|undefined,stage='input',stop='not-started',failure:unknown,exportFailure:unknown,fallback:unknown,backend:unknown;
 let irisReturned=false,irisRefugeOrdered=false,civiliansSheltered=false,doorDestroyedAt:number|undefined,shotAcceptedAt:number|undefined,meleeAcceptedAt:number|undefined,raidOutcome:unknown,lastJournal=-1,lastKey='',lastDoorKey='',lastHealthKey='',lastEnemyKey='',lastCivilKey='';
 let previousGaelNextId=pawn(initial,GAEL).health?.nextInjuryId??0;
 let previousGaelHealth=structuredClone(pawn(initial,GAEL).health);
 const strict=(list:unknown[],value:unknown)=>{if(list.length>=8192)throw new Stop('causal-capacity',{stage,tick:last?.tick});list.push(value);};
 const rolling=(list:unknown[],value:unknown,limit:number)=>{list.push(value);if(list.length>limit)list.shift();};
 const at=(w:World,id:number,c:Cell)=>same(pawn(w,id),c)&&stationary(w,pawn(w,id));
 const sheltered=(w:World)=>at(w,IRIS,IRIS_REFUGE)&&at(w,LEONIE,LEONIE_REFUGE);
 const healthView=(w:World,p:Pawn)=>({tick:w.tick,pawnId:p.id,state:p.state,nextInjuryId:p.health?.nextInjuryId,injuries:p.health?.injuries??[],newInjuryIds:p.health?.injuries.filter(i=>!injuries.get(p.id)?.has(i.id)).map(i=>i.id)??[],missing:p.health?.missing??[],bloodLoss:p.health?.bloodLoss??0,medicalBleed:p.health?medicalBleed(p.health):0,bleedUnitsPerMedicalInterval:p.health?medicalBleedUnits(p.health):0,body:pawnBody(p),infections:p.health?.infections,melee:p.melee,shooting:p.shooting,lastAttack:p.lastAttack,stun:p.stun,stagger:p.stagger});
 const sample=(w:World)=>({tick:w.tick,stage,people:PROTECTED.map(id=>person(w,id)),enemy:w.pawns.find(p=>p.id===ENEMY),door:w.structures.find(s=>s.id===DOOR),destroyed:w.destroyed,deconstructed:w.deconstructed,repair:w.jobs.find(j=>j.id===REPAIR),wood:w.piles.filter(p=>p.item==='wood'),blueprints:w.jobs.filter(j=>j.id>=20050&&j.id<=20061),rice:w.piles.find(p=>p.id===20144),packed:w.packed,raids:w.raids,projectiles:w.projectiles,events:w.events.slice(-15)});
 const observe=(w:World)=>{
  const g=pawn(w,GAEL);if(g){const view=healthView(w,g),key=JSON.stringify({...view,tick:undefined});if(key!==lastHealthKey){strict(gaelHealthTrace,view);lastHealthKey=key;}const next=g.health?.nextInjuryId??0;if(next>previousGaelNextId){strict(gaelDamageTrace,{observedTick:w.tick,nextInjuryIdBefore:previousGaelNextId,nextInjuryIdAfter:next,healthBefore:previousGaelHealth,healthAfter:structuredClone(g.health),position:{x:g.x,z:g.z,motion:g.motion},engagement:{melee:g.melee,shooting:g.shooting,lastAttack:g.lastAttack},qualification:'Observed nextInjuryId increase, including merged injuries; not every intermediate impact reconstructed'});}previousGaelNextId=next;previousGaelHealth=structuredClone(g.health);}
  for(const old of initial.structures){if(old.id===DOOR)continue;const current=w.structures.find(s=>s.id===old.id),damage=current?current.damage??0:null,before=previousDamage.get(old.id);if(before!==damage){const max=current?structureMaxHp(current):structureMaxHp(old);strict(collateralTrace,{observedTick:w.tick,structureId:old.id,kind:old.kind,material:old.material,position:{x:old.x,z:old.z},damageBefore:before,damageAfter:damage,exists:!!current,maxHp:max,remainingHp:current?max-(current.damage??0):0,acceptedPolicy:incidentalWalls.has(old.id)&&!!current&&max-(current.damage??0)>max/2?'initial-cabin-wood-walls-above-half-hp':null});previousDamage.set(old.id,damage);}}
  const e=w.pawns.find(p=>p.id===ENEMY),ekey=JSON.stringify(e?{state:e.state,health:e.health,melee:e.melee,raid:e.raid,lastAttack:e.lastAttack}:null);
  if(ekey!==lastEnemyKey){strict(combatTrace,{observedTick:w.tick,enemy:e?structuredClone(e):null,qualification:'Actual combat state, no invented hit attribution or future outcome'});lastEnemyKey=ekey;}
  const d=w.structures.find(s=>s.id===DOOR),dkey=JSON.stringify(d?{damage:d.damage,door:d.door}:null);
  if(dkey!==lastDoorKey){strict(doorTrace,{observedTick:w.tick,exists:!!d,hp:d?104-(d.damage??0):null,door:d?structuredClone(d):null,destroyed:structuredClone(w.destroyed),repair:w.jobs.find(j=>j.id===REPAIR)});lastDoorKey=dkey;}
  if(!d&&doorDestroyedAt===undefined)doorDestroyedAt=w.tick;
  if(at(w,IRIS,IRIS_RETURN))irisReturned=true;
  const cview=[IRIS,LEONIE].map(id=>{const p=pawn(w,id);return {id,x:p.x,z:p.z,state:p.state,motion:p.motion,path:p.path,draft:p.draft,jobId:p.jobId,cooking:p.cooking,interruptedCargo:p.interruptedCargo};}),ckey=JSON.stringify(cview);
  if(ckey!==lastCivilKey){strict(civilTrace,{observedTick:w.tick,people:cview});lastCivilKey=ckey;}
  civiliansSheltered=sheltered(w);
  const value=sample(w);rolling(ring,value,16);const key=JSON.stringify([stage,g?.state,g?.shooting?.stance?.phase,g?.melee?.strike,e?.state,w.raids?.active?.phase]);
  if(w.tick-lastJournal>=30||key!==lastKey){rolling(journal,value,192);lastJournal=w.tick;lastKey=key;}
 };
 const guard=(w:World)=>{
  if(errors.length||lifecycle.length)throw new Stop('technical-event',{errors,lifecycle});
  for(const id of PROTECTED){const p=person(w,id);if(!p)throw new Stop('protected-loss',{id,tick:w.tick});
   if(p.state==='dead'||p.health?.death)throw new Stop(id===GAEL?'gael-death':'other-protected-death',{id,tick:w.tick,p});
   if(p.state==='downed'||p.mental?.crisis||p.collapsePending)throw new Stop(id===GAEL?'gael-incapacity':'other-protected-incapacity',{id,tick:w.tick,p});
   if(ORIGINALS.includes(id)&&p.hunger<=12.5)throw new Stop('original-hunger-intervention-required',{id,tick:w.tick,hunger:p.hunger});
   if(p.health?.missing.some(m=>!missing.get(id)!.has(m.part)))throw new Stop('new-missing-part',{id,tick:w.tick,p});
   if(id!==GAEL&&p.health?.injuries.some(i=>!injuries.get(id)!.has(i.id)))throw new Stop('first-other-protected-injury',{id,tick:w.tick,p});
   if(p.health?.infections?.cases.some(i=>!infections.get(id)!.has(i.id)))throw new Stop('new-infection',{id,tick:w.tick,p});
   const before=identity.find(i=>i.id===id)!;expect({id:p.id,name:p.name,appearance:p.appearance,background:p.background,traits:p.traits}).toEqual(before);
  }
  const g=pawn(w,GAEL),body=pawnBody(g);
  if(!body.canBeAwake||body.painShock||body.vitalFailure||body.capacities.manipulation<=0)throw new Stop('gael-combat-incapacity',{tick:w.tick,body,g});
  if(!same(g,GAEL_POST)||!stationary(w,g)||g.path.length||(g.motion?.end??0)>w.tick)throw new Stop('gael-left-static-post-or-started-pursuit',{tick:w.tick,g});
  const iris=pawn(w,IRIS),leo=pawn(w,LEONIE);
  const inheritedOutside=!irisReturned&&w.tick<=initial.tick+12&&same(iris,{x:124,z:110})&&!!iris.motion&&JSON.stringify(iris.motion)===JSON.stringify(inheritedMotion);
  if(!inside(iris)&&!inheritedOutside)throw new Stop('iris-left-authorized-withdrawal',{tick:w.tick,iris});
  if(iris.motion&&(iris.motion.end>w.tick)&&(!inside(iris.motion.from)||!inside(iris.motion.to))){const initialEdge=JSON.stringify(iris.motion)===JSON.stringify(inheritedMotion),returnEdge=same(iris.motion.from,{x:124,z:110})&&same(iris.motion.to,IRIS_RETURN);if(irisReturned||w.tick>initial.tick+12||!initialEdge&&!returnEdge)throw new Stop('iris-new-exterior-edge',{tick:w.tick,iris});}
  if(w.tick>initial.tick&&!irisReturned&&(w.tick>initial.tick+12||iris.path.some(c=>!inside(c))))throw new Stop('iris-withdrawal-bound-or-outward-path',{tick:w.tick,iris});
  if(!inside(leo)||leo.path.some(c=>!inside(c))||leo.motion&&leo.motion.end>w.tick&&(!inside(leo.motion.from)||!inside(leo.motion.to)))throw new Stop('leonie-left-refuge',{tick:w.tick,leo});
  const d=w.structures.find(s=>s.id===DOOR);if(d&&(!d.door?.forbidden||d.door.open||doorOpenness(d,w.tick)!==0))throw new Stop('unexpected-door-opening',{tick:w.tick,d});
  for(const [id,damage] of initialDamage){if(id===DOOR)continue;const s=w.structures.find(s=>s.id===id);if(!s)throw new Stop('other-structure-destroyed',{id,tick:w.tick});if((s.damage??0)>damage){const max=structureMaxHp(s),hp=max-(s.damage??0);if(!incidentalWalls.has(id)||hp<=max/2)throw new Stop(incidentalWalls.has(id)?'cabin-wall-at-or-below-half-hp':'other-structure-damage',{id,tick:w.tick,s,damageBefore:damage,maxHp:max,remainingHp:hp});}}
  expect(w.structures.some(s=>s.id===18661)).toBe(false);expect(w.deconstructed).toEqual(initial.deconstructed);
  for(const old of wood)expect(w.piles.find(p=>p.id===old.id),'Inherited143 wood, including actual northern refund, stays exact').toEqual(old);
  for(const old of plans)expect(w.jobs.find(j=>j.id===old.id),'The12 unpaid blueprints remain physical and unpaid').toEqual(old);
  expect(w.packed,'The inherited packed furniture is preserved').toEqual(initial.packed);expect(w.piles.find(p=>p.id===20144),'The released source rice remains physical').toMatchObject({id:20144,item:'rice',quantity:10,owner:{type:'ground',x:126,z:114}});
  for(const old of property){const id='pawnId' in old.owner?old.owner.pawnId:0;expect(owned(w,id).find(p=>p.id===old.id)).toMatchObject({id:old.id,item:old.item,quantity:old.quantity,owner:old.owner});}
  const rifle=w.piles.find(p=>p.id===RIFLE);if(!rifle?.weapon||rifle.item!=='bolt-action-rifle'||rifle.quantity!==1||rifle.owner.type!=='equipment'||rifle.owner.pawnId!==GAEL||g.equipmentDropPending)throw new Stop('functional-weapon-refusal',{tick:w.tick,rifle,g});
  if(w.pawns.some(p=>p.id!==ENEMY&&p.faction==='outlaws'&&!p.prisoner&&!['dead','downed'].includes(p.state))||w.wildlife?.animals.some(a=>a.manhunter&&!['dead','downed'].includes(a.state))||w.fires?.items.length||(w.raids?.serial??0)!==3)throw new Stop('distinct-new-danger',{tick:w.tick,raids:w.raids});
  const enemy=w.pawns.find(p=>p.id===ENEMY);
  if(!enemy&&!w.raids?.departed.some(d=>d.pawnId===ENEMY&&d.group===3))throw new Stop('enemy-loss-without-physical-exit',{tick:w.tick});
  if(enemy&&!['dead','downed'].includes(enemy.state)&&!enemy.raid?.exiting){const order=enemy.melee?.order,tid=enemy.tactics?.targetId;if(order&&!order.structure&&order.targetId!==GAEL||tid!==undefined&&tid!==null&&tid!==GAEL||enemy.shooting?.order&&enemy.shooting.order.targetId!==GAEL)throw new Stop('enemy-targets-other-protected',{tick:w.tick,enemy});}
  if(w.tick>END||!finalizing&&w.tick===END)throw new Stop('tick-bound',{tick:w.tick});if(Date.now()>deadline)throw new Stop('body-bound',{tick:w.tick,stage});
 };
 const crash=()=>lifecycle.push({kind:'pagecrash',elapsedMs:Date.now()-started}),closed=()=>lifecycle.push({kind:'pageclose',elapsedMs:Date.now()-started}),disconnected=()=>lifecycle.push({kind:'browserdisconnected',elapsedMs:Date.now()-started});
 page.on('crash',crash);page.on('close',closed);const browser=page.context().browser();browser?.on('disconnected',disconnected);
 const read=async(conserve=false)=>{const w=await world(page);last=w;backend=await page.evaluate(()=>window.__lisiere.backend);if(conserve){try{observe(w);}catch(e){conservationDiagnostics.push({tick:w.tick,error:String(e),note:'Diagnostic failure cannot suppress UI conservation'});}}else{observe(w);guard(w);const technical=await page.evaluate(()=>window.__lisiere.incident);if(technical.graphicsFault||technical.simulationStopped)throw new Stop('technical-incident',technical);}return w;};
 const closeMenu=async()=>{if(await page.locator('#menu-panel').isVisible())await page.locator('[data-panel="menu"]').click();};
 const run=async()=>{await pause(page);await read();await closeMenu();await page.keyboard.press('Escape');await page.locator('[data-speed="1"]').click();};
 const wait=async(done:(w:World)=>boolean)=>{while(Date.now()<observeUntil){const w=await read();if(done(w))return w;await page.waitForTimeout(60);}throw new Stop('segment-bound',{tick:last?.tick,stage});};
 const act=async(command:Command,reason:string)=>{await pause(page);await read();await perform(page,{command,reason},rotation);const w=await read();strict(actions,{command,reason,tick:w.tick});return w;};
 const capture=async(name:string,reload:boolean,conserve=false)=>{
  await pause(page);await closeMenu();const before=await read(conserve);expect(validateWorld(before)).toEqual([]);expect(checkpoints.length).toBeLessThan(2);try{await page.screenshot({path:info.outputPath(name+'.png')});}catch(e){artifactErrors.push({name,kind:'screenshot-error',error:String(e),tick:before.tick});}
  await panel(page,'menu');const manager=page.locator('[data-save-manager]'),label=`Defense ${segment} ${name}`;await manager.locator('[data-save-manager-name]').fill(label);await manager.locator('[data-save-manager-action="create"]').click();await expect(manager.locator('[data-save-manager-status]')).toHaveAttribute('data-state','success');
  const download=page.waitForEvent('download');await manager.locator('[data-save-manager-action="export"]').click();const path=info.outputPath(name+'.json');await(await download).saveAs(path);const text=await readFile(path,'utf8');expect(deserializeWorld(text)).toEqual(before);const record={name,path,sha256:hash(text),tick:before.tick,reloaded:false};checkpoints.push(record);
  if(reload){await page.locator('#browse-saves').click();const front=page.locator('.front-menu'),row=front.locator('label').filter({has:page.locator('strong').filter({hasText:label})});await row.locator('input[name="front-save"]').check();await front.getByRole('button',{name:'Charger',exact:true}).click();await expect(page.locator('.game-shell')).toHaveJSProperty('inert',false,{timeout:90000});await expectWorld(page,before);record.reloaded=true;}
  await closeMenu();return before;
 };

 const attackVisible=async(kind:'shoot'|'melee')=>{
  await pause(page);let w=await read();const g=pawn(w,GAEL),enemy=w.pawns.find(p=>p.id===ENEMY);if(!enemy)return false;
  if(!sheltered(w))throw new Stop('civilians-not-sheltered-before-attack',{tick:w.tick});
  const queries=shootingQueries(w),plan=shotPlan(w,g,ENEMY,queries),distance=Math.hypot(enemy.x-g.x,enemy.z-g.z);
  const evidence={tick:w.tick,kind,shooter:{x:g.x,z:g.z,motion:g.motion},target:{x:enemy.x,z:enemy.z,state:enemy.state},door:w.structures.find(s=>s.id===DOOR),plan:'reason' in plan?{reason:plan.reason}:{weaponId:plan.weapon.id,item:plan.weapon.item,line:plan.line},cover:shotCover(queries.grid(),enemy,g)};strict(geometry,evidence);
  if(!stationary(w,g)||!same(g,GAEL_POST))return false;
  if(kind==='shoot'){if(w.structures.some(s=>s.id===DOOR)||'reason' in plan)return false;}
  else {if(distance>1.421||!('reason' in plan)||!meleeContact(w,g,enemy,blockedCells(w,true)))return false;const proposed=meleeRoute(w,g,meleePlaces(w,g,enemy),blockedCells(w));if(proposed===null||proposed.length)throw new Stop('melee-admission-would-approach',{tick:w.tick,distance,proposed});strict(geometry,{kind:'actual-contact-empty-route',tick:w.tick,distance,proposed});}
  await page.keyboard.press('Escape');await page.locator(`[data-pawn="${GAEL}"]`).click();await revealCells(page,[enemy]);let point:{x:number;y:number}|undefined;
  for(let attempt=0;attempt<12;attempt++){
   await settledCells(page,[enemy]);const frame=await page.evaluate(id=>{
    const canvas=document.querySelector<HTMLCanvasElement>('#viewport canvas')!,b=canvas.getBoundingClientRect(),body=window.__lisiere.projectPawn(id);if(!body)return null;
    const clear=[[0,0],[-10,0],[10,0],[0,-10],[0,10]].every(([dx,dy])=>document.elementFromPoint(body.x+dx,body.y+dy)===canvas);
    const preferred={x:b.x+b.width*.72,y:b.y+b.height*.30};let anchor:{x:number;y:number;score:number}|undefined;
    for(let y=b.top+18;y<b.bottom-18;y+=24)for(let x=b.left+18;x<b.right-18;x+=24){if(![[0,0],[-10,0],[10,0],[0,-10],[0,10]].every(([dx,dy])=>document.elementFromPoint(x+dx,y+dy)===canvas))continue;const score=Math.hypot(x-preferred.x,y-preferred.y);if(!anchor||score<anchor.score)anchor={x,y,score};}
    return {body,clear,anchor};
   },ENEMY);if(!frame)throw new Stop('target-projection-absent',{tick:w.tick});if(frame.clear){point=frame.body;break;}if(!frame.anchor)throw new Stop('no-clear-canvas-pan',{tick:w.tick});
   await page.mouse.move(frame.anchor.x,frame.anchor.y);await page.mouse.down({button:'middle'});await page.mouse.move(frame.anchor.x+Math.max(-250,Math.min(250,frame.anchor.x-frame.body.x)),frame.anchor.y+Math.max(-180,Math.min(180,frame.anchor.y-frame.body.y)),{steps:8});await page.mouse.up({button:'middle'});
  }
  if(!point)throw new Stop('target-body-not-visible',{tick:w.tick});expect(await page.evaluate(p=>document.elementFromPoint(p.x,p.y)?.tagName,point)).toBe('CANVAS');
  await page.mouse.click(point.x,point.y,{button:'right'});const button=page.locator(`[data-tactical-attack="${kind}"]`);await expect(button).toBeVisible();await expect(button).toBeEnabled();await button.click();w=await wait(state=>kind==='shoot'?pawn(state,GAEL).shooting?.order?.targetId===ENEMY:pawn(state,GAEL).melee?.order?.targetId===ENEMY);

  const actor=pawn(w,GAEL);if(actor.path.length||!same(actor,GAEL_POST))throw new Stop('accepted-attack-created-approach',{tick:w.tick,actor});
  if(kind==='shoot')shotAcceptedAt??=w.tick;else meleeAcceptedAt??=w.tick;
  strict(actions,{kind:'actual-contextual-'+kind+'-accepted',tick:w.tick,pawnId:GAEL,targetId:ENEMY,weaponId:RIFLE,geometry:evidence});return true;
 };
 try{
  const file=info.outputPath('literal-input.json');await writeFile(file,raw);await page.goto('/?e2e');const front=page.locator('.front-menu');await front.getByRole('button',{name:'Charger une partie',exact:true}).click();await front.locator('input[type=file]').setInputFiles(file);await expect(page.locator('.game-shell')).toHaveJSProperty('inert',false,{timeout:90000});await expectWorld(page,initial);loaded=true;bodyStarted=Date.now();deadline=bodyStarted+seconds*1000;observeUntil=deadline-18000;
  await pause(page);stage='initial';await capture('initial',true);if(artifactErrors.length)throw new Stop('initial-screenshot-failure',{artifactErrors});let w=await read();
  for(const target of [IRIS_RETURN,IRIS_REFUGE,LEONIE_REFUGE])expect(canStandAt(w,target)).toBe(true);
  stage='real-civilian-withdrawal';
  await act({type:'draft',pawnIds:[IRIS],enabled:true},'Interrompre la collecte réelle d’Iris sans supprimer son arête capturée');
  expect(pawn(last!,IRIS).motion).toEqual(inheritedMotion);expect(pawn(last!,IRIS).moveCooldown).toBe(pawn(initial,IRIS).moveCooldown);expect(pawn(last!,IRIS).cooking).toBeNull();
  expect(last!.piles.find(p=>p.id===20144)).toMatchObject({quantity:10,owner:{type:'ground',x:126,z:114}});
  await act({type:'draft-move',pawnIds:[IRIS],target:IRIS_RETURN,queue:false},'Retour réel124,111 après la seule arête héritée124,111→124,110');expect(pawn(last!,IRIS).draft?.target).toEqual(IRIS_RETURN);expect(pawn(last!,IRIS).motion).toEqual(inheritedMotion);
  const abandoned=structuredClone(last!.jobs.find(j=>j.id===REPAIR));
  await act({type:'draft',pawnIds:[LEONIE],enabled:true},'Retirer Léonie dès setup du contact de porte, avec abandon réel de ses61,2 unités de réparation');
  const released=last!.jobs.find(j=>j.id===REPAIR);expect(released).toMatchObject({progress:0,status:'pending',reservedBy:null});expect(released?.workRemainder).toBeUndefined();expect(released?.repair?.warmed).toBeUndefined();
  strict(actions,{kind:'actual-abandoned-repair-work',tick:last!.tick,jobBefore:abandoned,jobAfter:structuredClone(released),restored:false});
  await act({type:'draft-move',pawnIds:[LEONIE],target:LEONIE_REFUGE,queue:false},'Replier réellement Léonie122,112, hors du corridor de tirz114');expect(pawn(last!,LEONIE).draft?.target).toEqual(LEONIE_REFUGE);
  await run();stage='bounded-contact-defense';
  while(Date.now()<observeUntil){
   w=await read();const enemy=w.pawns.find(p=>p.id===ENEMY),g=pawn(w,GAEL);
   if(!enemy||['dead','downed'].includes(enemy.state)||enemy.raid?.exiting||w.raids?.active?.phase==='withdraw'||!w.raids?.active){stop='actual-threat-cessation';raidOutcome={tick:w.tick,target:enemy,raids:w.raids,qualification:enemy?.state==='downed'?'Actual downing; no capture/heal':enemy?.state==='dead'?'Actual death conserved':enemy?.raid?.exiting?'Actual withdrawal flag; physical exit not claimed':'Actual raid cessation/physical absence observed'};break;}
   if(irisReturned&&!irisRefugeOrdered){await act({type:'draft-move',pawnIds:[IRIS],target:IRIS_REFUGE,queue:false},'Prolonger le vrai retour d’Iris vers le refuge121,113 après arrivée immobile124,111');expect(pawn(last!,IRIS).draft?.target).toEqual(IRIS_REFUGE);irisRefugeOrdered=true;await run();continue;}
   if(sheltered(w)){
    if(g.melee?.order?.targetId===ENEMY){await page.waitForTimeout(60);continue;}
    const q=shootingQueries(w),plan=shotPlan(w,g,ENEMY,q),distance=Math.hypot(enemy.x-g.x,enemy.z-g.z);
    if(!w.structures.some(s=>s.id===DOOR)&&!('reason' in plan)){
     if(g.shooting?.order?.targetId!==ENEMY){await attackVisible('shoot');await run();}
    }else if('reason' in plan&&distance<=1.421&&meleeContact(w,g,enemy,blockedCells(w,true))){
     await attackVisible('melee');await run();
    }
   }
   await page.waitForTimeout(60);
  }
  if(stop==='not-started')stop='segment-bound';
 }catch(e){failure=e instanceof Stop?{reason:e.reason,detail:e.detail}:e;stop=e instanceof Stop?e.reason:'technical-or-oracle-error';}
 finally{
  finalizing=true;
  if(loaded&&!page.isClosed()&&checkpoints.length<2)try{stage=failure?'conservation':'issue';await capture(stage,!failure,!!failure);}catch(e){exportFailure=String(e);if(!failure){failure=e instanceof Stop?{reason:e.reason,detail:e.detail}:e;stop=e instanceof Stop?e.reason:'final-export-error';}if(checkpoints.length<2&&!page.isClosed())try{stage='conservation';await capture('conservation',false,true);}catch(second){exportFailure=JSON.stringify({first:exportFailure,conservation:String(second)});}}
  const bodyEnded=Date.now();if(loaded&&!failure&&(bodyEnded>deadline||(last?.tick??END+1)>END)){failure={reason:bodyEnded>deadline?'body-bound':'tick-bound',detail:{tick:last?.tick,bodyMs:bodyEnded-bodyStarted,seconds}};stop=bodyEnded>deadline?'body-bound':'tick-bound';}
  if(!failure&&artifactErrors.length){failure={reason:'screenshot-failure',detail:artifactErrors};stop='screenshot-failure';}
  if(last){const validation=validateWorld(last);if(!validation.length){const text=serializeWorld(last),path=info.outputPath('last-adopted.json');await writeFile(path,text);fallback={path,tick:last.tick,sha256:hash(text),provenance:'Last adopted read; not a UI export'};}else fallback={validation};}
  const ledger={kind:'explicit-raid-defense',intervention:'raid3-contact',inputSha:INPUT_SHA,parentLedgerSha:PARENT_SHA,newMandate:true,priorLedgersRemainForbidden:true,review:{path:reviewPath,sha256:reviewSha},productiveParent:{...structuredClone(parent.productiveParent),fullLedgerPath:PRODUCTIVE_SOURCE,fullLedgerSha256:PRODUCTIVE_SHA,fullLedger:structuredClone(productive)},defenseParent:{source:SOURCE,sha256:PARENT_SHA,ledger:structuredClone(parent)},originTick:75566,horizon:111566,defenseHorizon:END,allowedDestroyedStructure:DOOR,allowedCombatInjuriesPawnId:GAEL,stopOnNewMissingPart:true,acceptedCollaterals:'initial-cabin-wood-walls-above-half-hp',segment,checkpoint:checkpoints.at(-1),resumeAllowed:false,stop,actions,gaelHealthTrace,gaelDamageTrace,collateralTrace,doorTrace,civilTrace,combatTrace,raidOutcome,doorDestroyedAt,shotAcceptedAt,meleeAcceptedAt};
  const ledgerPath=info.outputPath('ledger.json'),text=JSON.stringify(ledger,null,2);await writeFile(ledgerPath,text);
  const summary=info.outputPath('raid-contact-summary.json');await writeFile(summary,JSON.stringify({segment,inputPath:INPUT,inputSha:INPUT_SHA,parentLedgerSha:PARENT_SHA,channel:'chrome',backend,bodyMs:bodyEnded-bodyStarted,overallMs:Date.now()-started,stop,failure:failure instanceof Error?{message:failure.message,stack:failure.stack}:failure,exportFailure,allowedCombatInjuriesPawnId:GAEL,acceptedCollaterals:'initial-cabin-wood-walls-above-half-hp',doorLossPermitted:true,doorDestroyedAt,shotAcceptedAt,meleeAcceptedAt,civiliansSheltered,irisReturned,irisRefugeOrdered,raidOutcome,gaelHealthTrace,gaelDamageTrace,collateralTrace,doorTrace,civilTrace,combatTrace,geometry,actions,checkpoints,ledger:{path:ledgerPath,sha256:hash(text)},errors,lifecycle,artifactErrors,conservationDiagnostics,journal,ring,fallback,last:last?sample(last):null,raidVictoryGuaranteed:false,campaignQualified:false,allVisitorsSaved:false,globalHealingQualified:false,productiveRefundQualified:false},null,2));await info.attach('raid contact summary',{contentType:'application/json',path:summary});
  page.off('crash',crash);page.off('close',closed);browser?.off('disconnected',disconnected);
 }
 if(failure)throw failure instanceof Error?failure:new Error(JSON.stringify(failure));expect(exportFailure).toBeUndefined();expect(checkpoints.at(-1)?.reloaded).toBe(true);expect(last!.tick).toBeGreaterThan(initial.tick);
}
