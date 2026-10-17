import {freshRot} from '../src/sim/food-preservation.ts';
import {attachActualAnimalGrowth256} from '../src/sim/animal-growth-runtime-256.ts';
import {constructAnimalMind256} from '../src/sim/animal-condition-mental-state-256.ts';
import {tryApplyAnimalAgeCondition256} from '../src/sim/animal-birthday-application-256.ts';
import {animalCareTargets} from '../src/sim/animal-care.ts';
import {prepareGroupPickup,commitGroupPickup} from '../src/sim/group-loading.ts';
import {captureCampRetainedAnimals256} from '../src/sim/group-camp-draft-256.ts';
import {groupFormationAuthority} from '../src/sim/group-authority.ts';
import {captureStandability} from '../src/sim/furniture-travel.ts';
import {advanceGroupCare} from '../src/sim/group-care.ts';
import {groupPawnInterval256} from '../src/sim/group-core-cadence-256.ts';
import {addResolvedInjury} from '../src/sim/injury-state.ts';
import {expect,test} from 'vitest';
import {reorganizationCamp256,preparedMotion} from './helpers/group-reorganization-v256.ts';
import {registryCamp,command} from './helpers/world-maps-v255.ts';
import {registeredMap,withWorldGroup,flushRegisteredMap} from '../src/sim/world-map-context.ts';
import {adultAgeTicks} from '../src/sim/animal-life.ts';
import {captureGroupMass} from '../src/sim/group-capture.ts';
import {groupReorganizationBalance,openGroupReorganization} from '../src/sim/group-reorganization-balance.ts';
import {prepareGroupSplit,prepareGroupMerge,commitGroupReorganization} from '../src/sim/group-reorganization.ts';
import {groupMemberOriginAuthority} from '../src/sim/group-member-origin.ts';
import {validGroupAnimalOwners256,validateGroupAnimalLosses256} from '../src/sim/group-animal-save-256.ts';
import {validCaravanAnimalRecord256} from '../src/sim/group-animal-record-save-256.ts';
import {processGroupAnimalHandler256,processGroupAnimalDelivery256} from '../src/sim/group-animal-formation-256.ts';
import {retireCaravanAnimal256} from '../src/sim/group-animal-terminal-256.ts';
import {enterRegisteredSite} from '../src/sim/world-map-authority.ts';
import {animalNavigation} from '../src/sim/wildlife-navigation.ts';
import {animalCaravanCapacityGrams256,animalCaravanRidingFactor256} from '../src/sim/group-animal-capacity-256.ts';
import {GroupMotionRuntime} from '../src/sim/group-motion-runtime.ts';
import {testMotionGeometry} from './helpers/group-reorganization-v256.ts';
import {createAnimalMedicalRecord256} from '../src/sim/animal-clinical-age-v256.ts';
import {BLOOD_UNIT} from '../src/sim/injury-rules.ts';
import {reconcileMedicalDeath} from '../src/sim/injury-state.ts';
import {validGroupCommand} from '../src/sim/group-command-shape.ts';
import {serializeCampaign,deserializeCampaign,validateWorld} from '../src/sim/index.ts';
import type {WildAnimal} from '../src/sim/wildlife-state.ts';
import type {AwayGroup,PreparingGroup} from '../src/sim/group-capture.ts';
import type {NeedContext} from '../src/sim/needs.ts';
/** Declared original checkpoint animals, never claimed acquisition or travel. */
function animal(id:number,tick:number,x:number,z:number,species:WildAnimal['species']='muffalo'):WildAnimal {return {id,species,sex:'female',ageTicks:adultAgeTicks(species),x,z,food:1,rest:1,state:'idle',path:[],nextDecision:tick,domestic:{since:tick,care:'herbal',tameness:5,nextDecay:tick+6000,...species==='muffalo'?{productFullness:0}:{}}};}
function mixed(prospective=true){const f=reorganizationCamp256(prospective),a=animal(f.w.nextId++,f.w.tick,f.members[0]!.x,f.members[0]!.z),b=animal(f.w.nextId++,f.w.tick,f.members[1]!.x,f.members[1]!.z);f.g.animalOwners={revision:1,members:[a,b],origins:[a,b].map(a=>({pawnId:a.id,originMapId:f.record.originMapId,context:f.record.context})),order:[f.members[0]!.id,a.id,f.members[1]!.id,b.id],...!prospective?{interval:{revision:1,startedAt:f.w.tick,atCore:f.w.tick*10,tickDelta:0}}:{}};f.g.items.push({id:f.w.nextId++,item:'hay',kind:'food',quantity:40,owner:{type:'inventory',pawnId:a.id},rot:{progress:0,atTick:f.w.tick}});f.g.reorganization=openGroupReorganization(f.g,[],f.w.tick,f.members.map(p=>({pawnId:p.id,originMapId:f.record.originMapId,context:f.record.context})));return {...f,a,b};}
test('actual caravan animal originals cannot be captured as Free wild-redress candidates',()=>{
 const f=mixed(),before=JSON.stringify(f.w),owners=f.g.animalOwners!.members,captured=captureCampRetainedAnimals256(f.w);
 expect(captured).not.toContain(f.a);expect(captured).not.toContain(f.b);
 expect(f.g.animalOwners!.members).toBe(owners);expect(owners).toEqual([f.a,f.b]);expect(JSON.stringify(f.w)).toBe(before);
});
function local(){const w=registryCamp(),map=registeredMap(w,w.worldMaps!.rootMapId!)!,p=map.pawns[0]!;const food=map.piles.find(p=>p.owner.type==='ground'&&p.item==='survival-meal'&&p.quantity>=2)!;if(food.owner.type!=='ground')throw Error('Prepared source is not ground');const stand=captureStandability(map),nav=animalNavigation(map);let pair:{human:{x:number;z:number};animal:{x:number;z:number}}|undefined;for(const human of [{...food.owner},{x:food.owner.x+1,z:food.owner.z},{x:food.owner.x-1,z:food.owner.z},{x:food.owner.x,z:food.owner.z+1},{x:food.owner.x,z:food.owner.z-1}]){if(!stand(human))continue;for(const a of [{x:human.x+1,z:human.z},{x:human.x-1,z:human.z},{x:human.x,z:human.z+1},{x:human.x,z:human.z-1}])if(nav.free(a)){pair={human,animal:a};break;}if(pair)break;}if(!pair)throw Error('Declared contact checkpoint unavailable');Object.assign(p,pair.human);p.path=[];delete p.motion;p.moveCooldown=0;const a=animal(w.nextId++,w.tick,pair.animal.x,pair.animal.z);map.wildlife??={profile:'temperate-hares-v1',rng:1,animals:[],eatenPlants:0,eatenNutrition:0,eatenItems:0};map.wildlife.animals.push(a);flushRegisteredMap(map);command(w,{type:'group-start',originMapId:w.worldMaps!.rootMapId!,memberIds:[p.id],animalIds:[a.id],sources:[{pileId:food.id,quantity:2}],destination:52});return {w,map,p,a,food,id:w.worldGroups!.selectedGroupId!};}

test('actual pack/riding mass derives from biological originals; dead/downed capacity and riding predicates remain distinct',()=>{const f=mixed(),mass=captureGroupMass(f.g.members,f.g.items,true,256,[],[f.a,f.b])!;expect(mass.capacityGrams).toBe(70000+animalCaravanCapacityGrams256(f.a)+animalCaravanCapacityGrams256(f.b));expect(mass.grams).toBe(captureGroupMass(f.g.members,f.g.items.filter(p=>p.owner.type!=='inventory'||p.owner.pawnId!==f.a.id),true,256)!.grams+560);expect(captureGroupMass(f.g.members,f.g.items,true,255,[],[f.a])).toBeUndefined();const camel=animal(f.w.nextId++,f.w.tick,0,0,'dromedary');expect(animalCaravanRidingFactor256(camel)).toBe(1.3);camel.state='downed';expect(animalCaravanRidingFactor256(camel)).toBe(1);expect(animalCaravanCapacityGrams256(camel)).toBeGreaterThan(0);});

test('split/merge keeps actual mixed originals, source movement, counters, IDs and exact save/reload',()=>{const f=mixed(),a=f.a,id=a.id,next=f.w.nextId,split=prepareGroupSplit(f.w,{type:'group-split',groupId:f.g.id,memberIds:[f.members[1]!.id],animalIds:[id],inventory:[{pileId:f.g.items.find(p=>p.item==='hay')!.id,quantity:13}]});if(split.kind!=='ready')throw Error(split.reason);expect(f.g.animalOwners!.members).toContain(a);expect(commitGroupReorganization(split.plan).ok).toBe(true);const source=f.record.state as AwayGroup,child=split.plan.created[0]!.state as AwayGroup;expect(child.animalOwners!.members[0]).toBe(a);expect(source.animalOwners!.members).not.toContain(a);expect(child.animalOwners!.order).toEqual([id,f.members[1]!.id]);expect(groupReorganizationBalance(source,source.reorganization!,[])).toBe(true);expect(groupReorganizationBalance(child,child.reorganization!,[])).toBe(true);expect(f.w.nextId).toBeGreaterThanOrEqual(next);const merge=prepareGroupMerge(f.w,{type:'group-merge',groupIds:[source.id,child.id]},preparedMotion(f.w));if(merge.kind!=='ready')throw Error(merge.reason);expect(commitGroupReorganization(merge.plan).ok).toBe(true);expect((f.record.state as AwayGroup).animalOwners!.members).toContain(a);expect(validateWorld(f.w)).toEqual([]);const raw=serializeCampaign(f.w);expect(serializeCampaign(deserializeCampaign(raw))).toBe(raw);});

test('animal-only half, stale original, duplicate IDs, future or accessor owner all refuse before RNG/identity mutation',()=>{const f=mixed(),before=JSON.stringify(f.w);expect(prepareGroupSplit(f.w,{type:'group-split',groupId:f.g.id,memberIds:[],animalIds:[f.a.id],inventory:[]}).kind).toBe('refused');expect(JSON.stringify(f.w)).toBe(before);const authority=(o:Parameters<typeof groupMemberOriginAuthority>[1])=>groupMemberOriginAuthority(f.w,o);expect(validGroupAnimalOwners256(f.g,f.w,255,authority)).toBe(false);const bad=structuredClone(f.g);bad.animalOwners!.order[0]=f.a.id;expect(validGroupAnimalOwners256(bad,f.w,256,authority)).toBe(false);let reads=0;const getter={...f.g};Object.defineProperty(getter,'animalOwners',{enumerable:true,get(){reads++;return f.g.animalOwners;}});expect(validGroupAnimalOwners256(getter,f.w,256,authority)).toBe(false);expect(reads).toBe(0);expect(validGroupCommand({type:'group-start',originMapId:0,memberIds:[f.members[0]!.id],animalIds:[f.a.id],destination:52,sources:[]},255)).toBe(false);});

test('new animal interval is persisted only for a true legacy transfer, and the same MotionRuntime advances it without human travel promotion',()=>{const f=mixed(false),g=f.g,interval=g.animalOwners!.interval!,motion=new GroupMotionRuntime(testMotionGeometry);const owner=()=>({id:g.id,tile:g.tile,destination:g.destination,moving:false,segment:null,nextPassable:true,animalInterval:interval});motion.bootstrap([owner()]);const events:number[]=[];for(let core=f.w.tick*10+1;core<=f.w.tick*10+10;core++)motion.stepCore(core,{owners:()=>[owner()],beforeTween(){},afterTween(){},afterAnimalTween:(_id,delta)=>events.push(delta)});expect(interval.atCore).toBe(f.w.tick*10+10);expect(interval.tickDelta).toBeLessThanOrEqual(15);expect(g.travel).toBeUndefined();expect(events.every(n=>n>0&&n<=16)).toBe(true);});

test('contact creates the real formation link; no contact and unfinished captured edges cannot gather an animal',()=>{const f=local();withWorldGroup(f.w,f.id,w=>{const g=w.group as PreparingGroup,handler=w.pawns.find(p=>p.id===f.p.id)!;let moves=0;const ctx={move(){moves++;return false;}} as unknown as NeedContext;handler.motion={from:{x:handler.x-1,z:handler.z},to:{x:handler.x,z:handler.z},start:w.tick,end:w.tick+1,speedFactor:1,terrainDelay:0};expect(processGroupAnimalHandler256(w,g,handler,ctx)).toBe(true);expect(g.animalPreparation!.lines[0]!.gathered).toBe(false);expect(moves).toBe(0);});const ready=local();withWorldGroup(ready.w,ready.id,w=>{const g=w.group as PreparingGroup;processGroupAnimalHandler256(w,g,ready.p,{move(){throw Error('Already actual contact');}} as unknown as NeedContext);expect(g.animalPreparation!.lines[0]!.gathered).toBe(true);expect(w.wildlife!.animals).toContain(ready.a);});});

test('animal cargo delivery preserves the actual picked fragment only at real contact',()=>{const f=local();withWorldGroup(f.w,f.id,w=>{const g=w.group as PreparingGroup,line=g.manifest[0]!,before=f.food.quantity;g.phase='loading';const pickup=prepareGroupPickup(w,g,groupFormationAuthority(w,true));if(pickup.kind!=='ready')throw Error(pickup.reason);expect(commitGroupPickup(w,g,pickup.plan)).toBe(true);const pile=w.piles.find(p=>p.id===line.carriedPileId)!;expect(pile.id).not.toBe(f.food.id);expect(f.food.quantity).toBe(before-line.quantity);expect(pile.owner).toEqual({type:'inventory',pawnId:f.p.id});expect(line.animalCarrierId).toBe(f.a.id);const next=w.nextId;expect(processGroupAnimalDelivery256(w,g,f.p,{move(){throw Error('Already actual contact');}} as unknown as NeedContext)).toBe(true);expect(pile.owner).toEqual({type:'inventory',pawnId:f.a.id});expect(line.deliveredToAnimal).toBe(true);expect(w.nextId).toBe(next);expect(w.wildlife!.animals).toContain(f.a);});});

test('actual animal death strips goods into remaining real owners, freezes pregnancy and health, and cannot return as active member',()=>{const f=mixed(),a=f.a; f.b.sex='male';a.pregnancy={fatherId:f.b.id,progress:1};a.health=createAnimalMedicalRecord256(f.w,a);a.health.bloodLoss=BLOOD_UNIT;reconcileMedicalDeath(a.health);a.state='dead';withWorldGroup(f.w,f.g.id,w=>retireCaravanAnimal256(w,w.group as AwayGroup,a,f.g.animalOwners!.origins.find(o=>o.pawnId===a.id)!));expect(f.g.animalOwners!.members).not.toContain(a);const loss=f.w.worldGroups!.animalLosses![0]!;expect(loss.animal).toBe(a);expect(loss.items).toEqual([]);expect(a.pregnancy).toEqual({fatherId:f.b.id,progress:1});expect(f.g.items.filter(p=>p.item==='hay').reduce((n,p)=>n+p.quantity,0)).toBe(40);expect(validCaravanAnimalRecord256(a,{context:loss.origin.context,tick:loss.tick,nextId:f.w.nextId,version:256})).toBe(true);expect(validateGroupAnimalLosses256(f.w,256)).toEqual([]);});

test('entry reinserts the original animal on actual walkable terrain with true inventory, then exact campaign roundtrip',()=>{const f=mixed(),before=f.a;expect(enterRegisteredSite(f.w,f.g.id,'visit').ok).toBe(true);const map=registeredMap(f.w,f.record.originMapId)!;expect(map.wildlife!.animals).toContain(before);expect(animalNavigation(map).free(before)).toBe(true);expect(map.piles.some(p=>p.owner.type==='inventory'&&p.owner.pawnId===before.id&&p.item==='hay')).toBe(true);expect(validateWorld(f.w)).toEqual([]);const raw=serializeCampaign(f.w);expect(serializeCampaign(deserializeCampaign(raw))).toBe(raw);});


test('actual veterinary care consumes the medicine held by an animal and keeps the post-opening balance',()=>{const f=mixed(),doctor=f.members[0]!,a=f.a;delete doctor.selfTend;a.domestic!.care='herbal';a.health=createAnimalMedicalRecord256(f.w,a);const injury=addResolvedInjury(a.health,'torso','cut',1000,()=>.5);if(!injury)throw Error('Declared veterinary injury unavailable');const dose={id:f.w.nextId++,kind:'medicine' as const,item:'herbal-medicine' as const,quantity:1,owner:{type:'inventory' as const,pawnId:a.id}};f.g.items.push(dose);f.g.reorganization=openGroupReorganization(f.g,[],f.w.tick,f.g.reorganization!.memberOrigins);let core=f.w.tick*10;while(!groupPawnInterval256(doctor.id,core,1250,1))core++;const result=advanceGroupCare(f.g,{tick:f.w.tick,core256:{tick:core,delta:1},random:()=>.5});expect(a.health.injuries.find(i=>i.id===injury.id)!.tended).toBeDefined();expect(f.g.items).not.toContain(dose);expect(result.removed).toEqual([{pawnId:a.id,grams:350}]);expect(f.g.ledger.medicineUsed).toBe(0);expect(f.g.reorganization!.inventoryEffects?.['herbal-medicine']).toBe(-1);expect(groupReorganizationBalance(f.g,f.g.reorganization!,[])).toBe(true);});

// Prepared original and medicine; advanceGroupCare executes the actual
// caravan consultation, tending and single-dose owner/mass transaction.
test('caravan paired asthma retains its real condition IDs and consumes one actual animal-held dose',()=>{
 const f=mixed(),a=f.a,doctor=f.members[0]!;delete doctor.selfTend;a.domestic!.care='herbal';
 attachActualAnimalGrowth256(a,{value:1,nextCheckCore:f.w.tick*10+240},256);constructAnimalMind256(a,256);a.health=createAnimalMedicalRecord256(f.w,a);
 const initialRandom={value:()=>.99,integer:(min:number,max:number)=>min+Math.floor(.99*(max-min)),float:(min:number,max:number)=>Math.fround(min+Math.fround(.99*(max-min)))};
 expect(tryApplyAnimalAgeCondition256(a.health,'Asthma',initialRandom).status).toBe('applied');
 const conditions=a.health.animalAgeConditions!.cases,ids=conditions.map(c=>c.id),severities=conditions.map(c=>c.severity);
 expect(conditions).toHaveLength(2);expect(animalCareTargets(a)).toHaveLength(2);
 const dose={id:f.w.nextId++,kind:'medicine' as const,item:'herbal-medicine' as const,quantity:2,owner:{type:'inventory' as const,pawnId:a.id},...freshRot('herbal-medicine',f.w.tick)};
 f.g.items.push(dose);f.g.reorganization=openGroupReorganization(f.g,[],f.w.tick,f.g.reorganization!.memberOrigins);
 expect(validateWorld(f.w)).toEqual([]);
 let core=f.w.tick*10;while(!groupPawnInterval256(doctor.id,core,1250,1))core++;
 let draws=0;const result=advanceGroupCare(f.g,{tick:f.w.tick,core256:{tick:core,delta:1},random:()=>{draws++;return .5;}});
 expect(a.health.animalAgeConditions!.cases.map(c=>c.id)).toEqual(ids);expect(a.health.animalAgeConditions!.cases.map(c=>c.severity)).toEqual(severities);
 expect(a.health.animalAgeConditions!.cases.every(c=>(c.tend?.ticksLeft??0)===427500)).toBe(true);expect(a.health.injuries).toEqual([]);expect(animalCareTargets(a)).toEqual([]);
 expect(draws).toBe(2);expect(dose.quantity).toBe(1);expect(f.g.items).toContain(dose);expect(result.removed).toEqual([{pawnId:a.id,grams:350}]);expect(result.massRemovedGrams).toBe(350);
 expect(f.g.ledger.medicineUsed).toBe(0);expect(f.g.reorganization!.inventoryEffects?.['herbal-medicine']).toBe(-1);expect(groupReorganizationBalance(f.g,f.g.reorganization!,[])).toBe(true);
 const raw=serializeCampaign(f.w);expect(serializeCampaign(deserializeCampaign(raw))).toBe(raw);
});

test('caravan chooses the truly life-threatening animal condition ahead of an earlier asthma patient',()=>{
 const f=mixed(),doctor=f.members[0]!;delete doctor.selfTend;
 const initialRandom={value:()=>.99,integer:(min:number,max:number)=>min+Math.floor(.99*(max-min)),float:(min:number,max:number)=>Math.fround(min+Math.fround(.99*(max-min)))};
 for(const a of [f.a,f.b]){a.domestic!.care='dry';attachActualAnimalGrowth256(a,{value:1,nextCheckCore:f.w.tick*10+240},256);constructAnimalMind256(a,256);a.health=createAnimalMedicalRecord256(f.w,a);}
 expect(tryApplyAnimalAgeCondition256(f.a.health!,'Asthma',initialRandom).status).toBe('applied');
 expect(tryApplyAnimalAgeCondition256(f.b.health!,'HeartAttack',initialRandom).status).toBe('applied');
 const before=f.b.health!.animalAgeConditions!.cases[0]!.severity;
 let core=f.w.tick*10;while(!groupPawnInterval256(doctor.id,core,1250,1))core++;
 let draws=0;const result=advanceGroupCare(f.g,{tick:f.w.tick,core256:{tick:core,delta:1},random:()=>{draws++;return 0;}});
 expect(f.a.health!.animalAgeConditions!.cases.every(c=>(c.tend?.ticksLeft??0)<0)).toBe(true);
 expect(f.b.health!.animalAgeConditions!.cases[0]!.severity).toBe(Math.max(0,Math.fround(before-Math.fround(.3))));
 expect(draws).toBe(1);expect(result).toEqual({massRemovedGrams:0,removed:[]});expect(f.g.ledger.medicineUsed).toBe(0);
});
