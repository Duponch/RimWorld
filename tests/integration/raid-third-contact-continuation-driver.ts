/* Private continuation of the already engaged real86114 contact.
 * No attack, movement, equipment, repair or setup command is issued. */
import {expect,type Page,type TestInfo} from '@playwright/test';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {world,pause,panel,expectWorld,observeErrors} from './helpers';
import {serializeWorld,deserializeWorld,validateWorld} from '../../src/sim/serialization';
import {medicalBleed,medicalBleedUnits} from '../../src/sim/injury-state';
import {pawnBody} from '../../src/sim/health-rules';
import {structureMaxHp} from '../../src/sim/thing-damage-rules';
import type {World,Pawn,Cell} from '../../src/sim/types';

const SOURCE='tmp/early-access-defense/raid3-contact-adopted-01/native-01/raid-third-contact-Real-ra-4c4ab--from85990-retaining-losses/';
const INPUT=SOURCE+'conservation.json';
const INPUT_SHA='c2c0c462102536f4ac4e77f2392711f5e81b4bd01a5a8bb337b33ae283f3239f';
const PARENT_SHA='189102809ef9d59bcf4b67f76e44a395712865260cf1918b900f30f35798f372';
const PARENT_SUMMARY_SHA='668e5f683b1c186d6373376dcdf9440c81ead9052021d7a80f61bdfb8ea83189';
const PRODUCTIVE_SOURCE='tmp/early-access-productive-research/adopted-05/native-05/early-productive-research--961a2-energy-goal-only-in-summary/ledger.json';
const PRODUCTIVE_SHA='fca539be6d24875ca99f31a4f14525769222172cbdd61b3031c91d68d2057591';
const IRIS=18530,GAEL=18532,LEONIE=18534,ENEMY=20141,DOOR=18648,RIFLE=18558,END=86514;
const ORIGINALS=[IRIS,GAEL,LEONIE],PATIENTS=[19768,19771],PROTECTED=[...ORIGINALS,...PATIENTS];
const GAEL_POST:Cell={x:123,z:114},IRIS_REFUGE:Cell={x:121,z:113},LEONIE_REFUGE:Cell={x:122,z:112};
const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
const stationary=(w:World,p:Pawn)=>p.moveCooldown===0&&(p.motion?.end??w.tick)<=w.tick;
const same=(a:Cell,b:Cell)=>a.x===b.x&&a.z===b.z;
const person=(w:World,id:number)=>w.pawns.find(p=>p.id===id)??w.visitors?.departed.find(d=>d.pawn.id===id)?.pawn;
const pawn=(w:World,id:number)=>w.pawns.find(p=>p.id===id)!;
const owned=(w:World,id:number)=>[...w.piles,...(w.visitors?.departed.find(d=>d.pawn.id===id)?.items??[])].filter(p=>'pawnId' in p.owner&&p.owner.pawnId===id);
class Stop extends Error{constructor(readonly reason:string,readonly detail:unknown){super(reason);}}

export async function runRaidThirdContactContinuation(page:Page,info:TestInfo){
 expect(process.env.DEFENSE_WRAPPER).toBe('1');page.setDefaultTimeout(10000);
 const segment=process.env.DEFENSE_SEGMENT!,seconds=Number(process.env.DEFENSE_BODY_SECONDS??120);
 expect(segment).toMatch(/^[a-zA-Z0-9_-]{1,32}$/);expect(seconds>=100&&seconds<=150).toBe(true);
 const raw=await readFile(INPUT,'utf8');expect(hash(raw)).toBe(INPUT_SHA);
 const initial=deserializeWorld(raw);expect(initial).toEqual({...JSON.parse(raw),schemaVersion:initial.schemaVersion});expect(initial.tick).toBe(86114);expect(validateWorld(initial)).toEqual([]);
 const parentText=await readFile(SOURCE+'ledger.json','utf8');expect(hash(parentText)).toBe(PARENT_SHA);const parent=JSON.parse(parentText);
 expect(parent).toMatchObject({kind:'explicit-raid-defense',intervention:'raid3-contact',resumeAllowed:false,inputSha:'7ef6d416f91042a03e7a877e341a71f8ef11163bd7168fc4b759c61e79b0eabc',parentLedgerSha:'8b9a885e63cd46d946a4affb614341ab011c69ab6ebafafb43bea2a71c3bc352',stop:'new-missing-part'});
 const parentSummaryText=await readFile(SOURCE+'raid-contact-summary.json','utf8');expect(hash(parentSummaryText)).toBe(PARENT_SUMMARY_SHA);
 expect(parent.checkpoint).toMatchObject({sha256:INPUT_SHA,tick:86114,reloaded:false});
 expect(parent.productiveParent).toMatchObject({protocol:'productive-research-v2',originTick:75566,horizon:111566,parentLedgerSha:PRODUCTIVE_SHA,fullLedgerSha256:PRODUCTIVE_SHA});
 const productiveText=await readFile(PRODUCTIVE_SOURCE,'utf8');expect(hash(productiveText)).toBe(PRODUCTIVE_SHA);const productive=JSON.parse(productiveText);
 expect(productive).toMatchObject({protocol:'productive-research-v2',originTick:75566,horizon:111566,resumeAllowed:false,truncated:false});expect(parent.productiveParent.fullLedger).toEqual(productive);
 const reviewPath=process.env.DEFENSE_ENTRY_REVIEW,reviewSha=process.env.DEFENSE_ENTRY_REVIEW_SHA;
 if(!reviewPath||!reviewSha)throw Error('ROOT must supply a distinct contact mandate.');
 const reviewText=await readFile(reviewPath,'utf8');expect(hash(reviewText)).toBe(reviewSha);const review=JSON.parse(reviewText);
 expect(review).toMatchObject({kind:'raid3-contact-continuation-entry-v1',newMandate:true,reviewedBy:'ROOT',priorLedgersRemainForbidden:true,source:{sha256:INPUT_SHA,ledgerSha256:PARENT_SHA,tick:86114,checkpointReloaded:false,parentResumeAllowed:false},defenseHorizon:END,productiveOrigin:75566,productiveHorizon:111566,allowedDestroyedStructure:DOOR,allowedCombatInjuriesPawnId:GAEL,allowedCombatAnatomyPawnId:GAEL,stopOnNewMissingPart:false,acceptedCollaterals:'initial-cabin-wood-walls-above-half-hp'});
 expect(initial.raids?.active).toMatchObject({id:3,phase:'assault',members:[ENEMY]});
 expect(initial.structures.some(s=>s.id===18661)).toBe(false);expect(initial.deconstructed).toMatchObject({count:1,lostWood:3});
 expect(initial.piles.find(p=>p.id===20151)).toMatchObject({item:'wood',quantity:2,owner:{type:'ground',x:124,z:110}});
 expect(initial.structures.some(s=>s.id===DOOR)).toBe(false);expect(initial.destroyed).toMatchObject({count:2,lost:{wood:30}});
 expect(pawn(initial,GAEL)).toMatchObject({x:123,z:114,path:[],draft:{holdFire:true},melee:{order:{targetId:ENEMY,startedDowned:false},strike:{targetId:ENEMY,atCore:861051,untilCore:861171,tool:'right-fist',outcome:'miss'}}});
 expect(pawn(initial,GAEL).health?.injuries).toHaveLength(9);expect(pawn(initial,GAEL).health?.nextInjuryId).toBe(30);expect(pawn(initial,GAEL).health?.missing).toEqual([{part:'left-big-toe',bornAt:86111}]);expect(pawn(initial,GAEL).health?.bloodLoss).toBe(3059640);
 expect(pawn(initial,ENEMY)).toMatchObject({x:124,z:114,path:[],melee:{order:{targetId:GAEL,startedDowned:false},strike:{targetId:GAEL,atCore:861103,untilCore:861175,tool:'knife-blade',outcome:'hit'}}});
 expect(pawn(initial,IRIS)).toMatchObject({x:121,z:113,path:[]});expect(pawn(initial,LEONIE)).toMatchObject({x:122,z:112,path:[]});
 const inheritedCombat={gael:structuredClone(pawn(initial,GAEL).melee),enemy:structuredClone(pawn(initial,ENEMY).melee),gaelStagger:structuredClone(pawn(initial,GAEL).stagger),enemyStagger:structuredClone(pawn(initial,ENEMY).stagger),ordersReissued:false,weaponChanged:false};
 const wood=initial.piles.filter(p=>p.item==='wood').map(p=>structuredClone(p)),plans=initial.jobs.filter(j=>j.id>=20050&&j.id<=20061).map(j=>structuredClone(j));
 expect(wood.reduce((n,p)=>n+p.quantity,0)).toBe(143);expect(plans).toHaveLength(12);
 const initialDamage=new Map(initial.structures.map(s=>[s.id,s.damage??0]));
 const incidentalWalls=new Set(initial.structures.filter(s=>s.kind==='wall'&&s.material==='wood'&&s.x>=120&&s.x<=125&&s.z>=110&&s.z<=115).map(s=>s.id));
 const previousDamage=new Map<number,number|null>(initial.structures.map(s=>[s.id,s.damage??0]));
 const injuries=new Map(PROTECTED.map(id=>[id,new Set(person(initial,id)?.health?.injuries.map(i=>i.id)??[])]));
 const missing=new Map(PROTECTED.map(id=>[id,new Set(person(initial,id)?.health?.missing.map(i=>i.part)??[])]));
 const injurySequences=new Map(PROTECTED.map(id=>[id,person(initial,id)?.health?.nextInjuryId??0]));
 const infections=new Map(PROTECTED.map(id=>[id,new Set(person(initial,id)?.health?.infections?.cases.map(i=>i.id)??[])]));
 const property=PATIENTS.flatMap(id=>owned(initial,id).filter(p=>p.kind!=='food').map(p=>structuredClone(p)));
 const identity=PROTECTED.map(id=>{const p=person(initial,id)!;return {id,name:p.name,appearance:structuredClone(p.appearance),background:p.background,traits:p.traits};});
 const errors=observeErrors(page),lifecycle:unknown[]=[],actions:unknown[]=[],combatTrace:unknown[]=[],gaelHealthTrace:unknown[]=[],gaelDamageTrace:unknown[]=[],collateralTrace:unknown[]=[],doorTrace:unknown[]=[],civilTrace:unknown[]=[],artifactErrors:unknown[]=[],conservationDiagnostics:unknown[]=[],checkpoints:{name:string;path:string;sha256:string;tick:number;reloaded:boolean}[]=[],journal:unknown[]=[],ring:unknown[]=[];
 const started=Date.now();let bodyStarted=started,deadline=Infinity,observeUntil=Infinity,loaded=false,finalizing=false,last:World|undefined,stage='input',stop='not-started',failure:unknown,exportFailure:unknown,fallback:unknown,backend:unknown;
 let civiliansSheltered=true,raidOutcome:unknown,lastJournal=-1,lastKey='',lastDoorKey='',lastHealthKey='',lastEnemyKey='',lastCivilKey='';
 let previousGaelNextId=pawn(initial,GAEL).health?.nextInjuryId??0;
 let previousGaelHealth=structuredClone(pawn(initial,GAEL).health);
 const strict=(list:unknown[],value:unknown)=>{if(list.length>=8192)throw new Stop('causal-capacity',{stage,tick:last?.tick});list.push(value);};
 const rolling=(list:unknown[],value:unknown,limit:number)=>{list.push(value);if(list.length>limit)list.shift();};
 const at=(w:World,id:number,c:Cell)=>same(pawn(w,id),c)&&stationary(w,pawn(w,id));
 const sheltered=(w:World)=>at(w,IRIS,IRIS_REFUGE)&&at(w,LEONIE,LEONIE_REFUGE);
 const healthView=(w:World,p:Pawn)=>({tick:w.tick,pawnId:p.id,state:p.state,nextInjuryId:p.health?.nextInjuryId,injuries:p.health?.injuries??[],newInjuryIds:p.health?.injuries.filter(i=>!injuries.get(p.id)?.has(i.id)).map(i=>i.id)??[],missing:p.health?.missing??[],bloodLoss:p.health?.bloodLoss??0,medicalBleed:p.health?medicalBleed(p.health):0,bleedUnitsPerMedicalInterval:p.health?medicalBleedUnits(p.health):0,body:pawnBody(p),infections:p.health?.infections,melee:p.melee,shooting:p.shooting,lastAttack:p.lastAttack,stun:p.stun,stagger:p.stagger});
 const sample=(w:World)=>({tick:w.tick,stage,people:PROTECTED.map(id=>person(w,id)),enemy:w.pawns.find(p=>p.id===ENEMY),door:w.structures.find(s=>s.id===DOOR),destroyed:w.destroyed,deconstructed:w.deconstructed,wood:w.piles.filter(p=>p.item==='wood'),blueprints:w.jobs.filter(j=>j.id>=20050&&j.id<=20061),rice:w.piles.find(p=>p.id===20144),packed:w.packed,raids:w.raids,projectiles:w.projectiles,events:w.events.slice(-15)});
 const observe=(w:World)=>{
  const g=pawn(w,GAEL);if(g){const view=healthView(w,g),key=JSON.stringify({...view,tick:undefined});if(key!==lastHealthKey){strict(gaelHealthTrace,view);lastHealthKey=key;}const next=g.health?.nextInjuryId??0;if(next>previousGaelNextId){strict(gaelDamageTrace,{observedTick:w.tick,nextInjuryIdBefore:previousGaelNextId,nextInjuryIdAfter:next,healthBefore:previousGaelHealth,healthAfter:structuredClone(g.health),position:{x:g.x,z:g.z,motion:g.motion},engagement:{melee:g.melee,shooting:g.shooting,lastAttack:g.lastAttack},qualification:'Observed nextInjuryId increase, including merged injuries; not every intermediate impact reconstructed'});}previousGaelNextId=next;previousGaelHealth=structuredClone(g.health);}
  for(const old of initial.structures){if(old.id===DOOR)continue;const current=w.structures.find(s=>s.id===old.id),damage=current?current.damage??0:null,before=previousDamage.get(old.id);if(before!==damage){const max=current?structureMaxHp(current):structureMaxHp(old);strict(collateralTrace,{observedTick:w.tick,structureId:old.id,kind:old.kind,material:old.material,position:{x:old.x,z:old.z},damageBefore:before,damageAfter:damage,exists:!!current,maxHp:max,remainingHp:current?max-(current.damage??0):0,acceptedPolicy:incidentalWalls.has(old.id)&&!!current&&max-(current.damage??0)>max/2?'initial-cabin-wood-walls-above-half-hp':null});previousDamage.set(old.id,damage);}}
  const e=w.pawns.find(p=>p.id===ENEMY),ekey=JSON.stringify(e?{state:e.state,health:e.health,melee:e.melee,raid:e.raid,lastAttack:e.lastAttack}:null);
  if(ekey!==lastEnemyKey){strict(combatTrace,{observedTick:w.tick,enemy:e?structuredClone(e):null,qualification:'Actual combat state, no invented hit attribution or future outcome'});lastEnemyKey=ekey;}
  const d=w.structures.find(s=>s.id===DOOR),dkey=JSON.stringify(d?{damage:d.damage,door:d.door}:null);
  if(dkey!==lastDoorKey){strict(doorTrace,{observedTick:w.tick,exists:!!d,hp:d?104-(d.damage??0):null,door:d?structuredClone(d):null,destroyed:structuredClone(w.destroyed)});lastDoorKey=dkey;}
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
   if(id!==GAEL&&p.health?.missing.some(m=>!missing.get(id)!.has(m.part)))throw new Stop('new-missing-part',{id,tick:w.tick,p});
   if(id!==GAEL&&((p.health?.nextInjuryId??0)>injurySequences.get(id)!||p.health?.injuries.some(i=>!injuries.get(id)!.has(i.id))))throw new Stop('first-other-protected-injury',{id,tick:w.tick,p});
   if(p.health?.infections?.cases.some(i=>!infections.get(id)!.has(i.id)))throw new Stop('new-infection',{id,tick:w.tick,p});
   const before=identity.find(i=>i.id===id)!;expect({id:p.id,name:p.name,appearance:p.appearance,background:p.background,traits:p.traits}).toEqual(before);
  }
  const g=pawn(w,GAEL),body=pawnBody(g);
  if(!body.canBeAwake||body.painShock||body.vitalFailure||body.capacities.manipulation<=0)throw new Stop('gael-combat-incapacity',{tick:w.tick,body,g});
  if(!same(g,GAEL_POST)||!stationary(w,g)||g.path.length||(g.motion?.end??0)>w.tick)throw new Stop('gael-left-static-post-or-started-pursuit',{tick:w.tick,g});
  if(!sheltered(w))throw new Stop('civilian-left-inherited-refuge',{tick:w.tick,iris:pawn(w,IRIS),leonie:pawn(w,LEONIE)});
  if(w.structures.some(s=>s.id===DOOR))throw new Stop('destroyed-door-reappeared',{tick:w.tick});
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
 const run=async()=>{await pause(page);const before=await read();await closeMenu();await page.keyboard.press('Escape');await page.locator('[data-speed="1"]').click();strict(actions,{kind:'actual-ui-play-x1',lastPausedTick:before.tick,domainOrdersIssued:0});};
 const capture=async(name:string,reload:boolean,conserve=false)=>{
  await pause(page);await closeMenu();const before=await read(conserve);expect(validateWorld(before)).toEqual([]);expect(checkpoints.length).toBeLessThan(2);try{await page.screenshot({path:info.outputPath(name+'.png')});}catch(e){artifactErrors.push({name,kind:'screenshot-error',error:String(e),tick:before.tick});}
  await panel(page,'menu');const manager=page.locator('[data-save-manager]'),label=`Defense ${segment} ${name}`;await manager.locator('[data-save-manager-name]').fill(label);await manager.locator('[data-save-manager-action="create"]').click();await expect(manager.locator('[data-save-manager-status]')).toHaveAttribute('data-state','success');
  const download=page.waitForEvent('download');await manager.locator('[data-save-manager-action="export"]').click();const path=info.outputPath(name+'.json');await(await download).saveAs(path);const text=await readFile(path,'utf8');expect(deserializeWorld(text)).toEqual(before);const record={name,path,sha256:hash(text),tick:before.tick,reloaded:false};checkpoints.push(record);
  if(reload){await page.locator('#browse-saves').click();const front=page.locator('.front-menu'),row=front.locator('label').filter({has:page.locator('strong').filter({hasText:label})});await row.locator('input[name="front-save"]').check();await front.getByRole('button',{name:'Charger',exact:true}).click();await expect(page.locator('.game-shell')).toHaveJSProperty('inert',false,{timeout:90000});await expectWorld(page,before);record.reloaded=true;}
  await closeMenu();return before;
 };


 try{
  const file=info.outputPath('literal-input.json');await writeFile(file,raw);await page.goto('/?e2e');const front=page.locator('.front-menu');await front.getByRole('button',{name:'Charger une partie',exact:true}).click();await front.locator('input[type=file]').setInputFiles(file);await expect(page.locator('.game-shell')).toHaveJSProperty('inert',false,{timeout:90000});await expectWorld(page,initial);loaded=true;bodyStarted=Date.now();deadline=bodyStarted+seconds*1000;observeUntil=deadline-18000;
  await pause(page);stage='initial';await capture('initial',true);if(artifactErrors.length)throw new Stop('initial-screenshot-failure',{artifactErrors});let w=await read();
  expect(pawn(w,GAEL).melee).toEqual(inheritedCombat.gael);expect(pawn(w,ENEMY).melee).toEqual(inheritedCombat.enemy);expect(pawn(w,GAEL).stagger).toEqual(inheritedCombat.gaelStagger);expect(pawn(w,ENEMY).stagger).toEqual(inheritedCombat.enemyStagger);
  expect(sheltered(w)).toBe(true);stage='inherited-contact-continuation';await run();
  while(Date.now()<observeUntil){
   w=await read();const enemy=w.pawns.find(p=>p.id===ENEMY);
   if(!enemy||['dead','downed'].includes(enemy.state)||enemy.raid?.exiting||w.raids?.active?.phase==='withdraw'||!w.raids?.active){stop='actual-threat-cessation';raidOutcome={tick:w.tick,target:enemy,raids:w.raids,qualification:enemy?.state==='downed'?'Actual downing; no capture/heal':enemy?.state==='dead'?'Actual death conserved':enemy?.raid?.exiting?'Actual withdrawal flag; physical exit not claimed':'Actual raid cessation/physical absence observed'};break;}
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
  const ledger={kind:'explicit-raid-defense',intervention:'raid3-contact-continuation',inputSha:INPUT_SHA,parentLedgerSha:PARENT_SHA,newMandate:true,priorLedgersRemainForbidden:true,review:{path:reviewPath,sha256:reviewSha},productiveParent:{...structuredClone(parent.productiveParent),fullLedgerPath:PRODUCTIVE_SOURCE,fullLedgerSha256:PRODUCTIVE_SHA,fullLedger:structuredClone(productive)},defenseParent:{source:SOURCE,sha256:PARENT_SHA,summarySha256:PARENT_SUMMARY_SHA,ledger:structuredClone(parent)},originTick:75566,horizon:111566,defenseHorizon:END,allowedDestroyedStructure:DOOR,allowedCombatInjuriesPawnId:GAEL,allowedCombatAnatomyPawnId:GAEL,stopOnNewMissingPart:false,acceptedCollaterals:'initial-cabin-wood-walls-above-half-hp',segment,checkpoint:checkpoints.at(-1),resumeAllowed:false,stop,actions,gaelHealthTrace,gaelDamageTrace,collateralTrace,doorTrace,civilTrace,combatTrace,raidOutcome,inheritedCombat,domainOrdersIssued:0};
  const ledgerPath=info.outputPath('ledger.json'),text=JSON.stringify(ledger,null,2);await writeFile(ledgerPath,text);
  const summary=info.outputPath('raid-contact-continuation-summary.json');await writeFile(summary,JSON.stringify({segment,inputPath:INPUT,inputSha:INPUT_SHA,parentLedgerSha:PARENT_SHA,channel:'chrome',backend,bodyMs:bodyEnded-bodyStarted,overallMs:Date.now()-started,stop,failure:failure instanceof Error?{message:failure.message,stack:failure.stack}:failure,exportFailure,allowedCombatInjuriesPawnId:GAEL,acceptedCollaterals:'initial-cabin-wood-walls-above-half-hp',doorLossAlreadyInherited:true,inheritedCombat,domainOrdersIssued:0,allowedCombatAnatomyPawnId:GAEL,civiliansSheltered,raidOutcome,gaelHealthTrace,gaelDamageTrace,collateralTrace,doorTrace,civilTrace,combatTrace,actions,checkpoints,ledger:{path:ledgerPath,sha256:hash(text)},errors,lifecycle,artifactErrors,conservationDiagnostics,journal,ring,fallback,last:last?sample(last):null,raidVictoryGuaranteed:false,campaignQualified:false,allVisitorsSaved:false,globalHealingQualified:false,productiveRefundQualified:false},null,2));await info.attach('raid contact continuation summary',{contentType:'application/json',path:summary});
  page.off('crash',crash);page.off('close',closed);browser?.off('disconnected',disconnected);
 }
 if(failure)throw failure instanceof Error?failure:new Error(JSON.stringify(failure));expect(exportFailure).toBeUndefined();expect(checkpoints.at(-1)?.reloaded).toBe(true);expect(last!.tick).toBeGreaterThan(initial.tick);
}
