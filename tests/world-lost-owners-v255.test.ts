import {expect,test} from 'vitest';
import {registryCamp,preparedMap,command,until} from './helpers/world-maps-v255.ts';
import {applyCommand,stepWorld,serializeCampaign,deserializeCampaign,validateWorld} from '../src/sim/index.ts';
import {registeredMap,flushRegisteredMap,hasLoadedRoot} from '../src/sim/world-map-context.ts';
import {detachMapOwners,captureLostOwners} from '../src/sim/world-lost-owners.ts';
import {validLostArchiveShape,validateLostArchives} from '../src/sim/world-lost-save.ts';
import {campaignPhysicalCaptures} from '../src/sim/campaign-people.ts';
import {rescueCamp} from './scenarios/rescue.ts';
import {animalRescueCamp} from './helpers/animal-rescue-v310.ts';
import {exhaustedCarrier} from './scenarios/interrupted-cargo.ts';
import {addMaterial,refreshStock} from '../src/sim/materials.ts';
import type {AbandonedMapContents} from '../src/sim/world-map-state.ts';
import type {World} from '../src/sim/types.ts';
const shape=(w:World,a:AbandonedMapContents)=>{expect(validLostArchiveShape(a,w.tick,w.nextId)).toBe(true);for(const key of ['map','shared','tiles','structures','jobs','resources','archives'])expect(a).not.toHaveProperty(key);};
// A direct transition unit attaches only its result to exercise the dedicated owner guard.
const ownerGuard=(w:World,a:AbandonedMapContents)=>{shape(w,a);w.worldGroups!.abandonedContents.push(a);expect(validateLostArchives(w,new Map(),new Set())).toEqual([]);};

test('real root abandonment promotes originals, loses ground, keeps only compact owners and refuses re-entry',()=>{
 const w=registryCamp(),other=preparedMap(w),source=registeredMap(w,0)!,people=source.pawns.slice(),ages=people.map(p=>p.age),bodies=people.map(p=>p.health),shirts=source.piles.filter(i=>i.owner.type==='apparel'),ground=source.piles.filter(i=>i.owner.type==='ground').reduce((n,i)=>n+i.quantity,0),otherTiles=other.tiles,tick=w.tick,rng=w.rng,nextId=w.nextId;
 const initial=campaignPhysicalCaptures(w).flatMap(c=>[...c.owners.byId.keys()]).sort((a,b)=>a-b);command(w,{type:'map-abandon',mapId:0,confirm:true});const a=w.worldGroups!.abandonedContents[0]!;
 expect([w.tick,w.rng,w.nextId]).toEqual([tick,rng,nextId]);expect(w.worldMaps!.rootMapId).toBe(1);expect(registeredMap(w,1)!.tiles).toBe(otherTiles);shape(w,a);expect(a.humans.map(h=>h.pawn)).toEqual(people);for(let i=0;i<people.length;i++){expect(a.humans[i]!.pawn).toBe(people[i]);expect(people[i]!.age).toBe(ages[i]);expect(people[i]!.health).toBe(bodies[i]);expect(people[i]!.orders).toEqual({active:null,queue:[]});expect(people[i]!.bedId).toBeNull();}for(const shirt of shirts)expect(a.humans.flatMap(h=>h.items)).toContain(shirt);
 expect(Object.values(a.lost.items).reduce((n,q)=>n+(q??0),0)).toBe(ground);expect(campaignPhysicalCaptures(w).flatMap(c=>[...c.owners.byId.keys()]).sort((a,b)=>a-b)).toEqual(initial);expect(captureLostOwners(w).local).toEqual([]);expect(validateWorld(w)).toEqual([]);
 const text=serializeCampaign(w),copy=deserializeCampaign(text);if(!hasLoadedRoot(copy))throw Error('The remaining actual map must still be loaded');expect(serializeCampaign(copy)).toBe(text);const frozen=JSON.stringify(copy.worldGroups!.abandonedContents);stepWorld(copy,2);expect(JSON.stringify(copy.worldGroups!.abandonedContents)).toBe(frozen);expect(applyCommand(copy,{type:'map-view',mapId:0}).ok).toBe(false);expect(applyCommand(copy,{type:'map-settle',mapId:0}).ok).toBe(false);expect(validateWorld(copy)).toEqual([]);
});

test('current ordinary delivery deposits the original cargo before removal; no cargo conversion or refund',()=>{
 const w=registryCamp();preparedMap(w);const source=registeredMap(w,0)!,p=source.pawns[0]!;p.bedId=null;p.priorities.haul=1;addMaterial(source,'wood',10,{type:'ground',x:12,z:16},'wood');const pile=source.piles.at(-1)!;source.stockpiles.push({id:w.nextId++,x:25,z:25,filters:{wood:true,food:false},priority:2,capacity:75});refreshStock(source);flushRegisteredMap(source);
 command(w,{type:'order-haul',pawnId:p.id,target:{type:'pile',pileId:pile.id},queue:false});until(w,()=>p.haul?.phase==='deliver'&&!!p.motion&&p.motion.end>w.tick,400);const cargo=source.piles.find(i=>i.owner.type==='pawn'&&i.owner.pawnId===p.id)!;expect(cargo).toBeDefined();const quantity=cargo.quantity,occupied={...p.motion!.from},health=JSON.stringify(p.health),age=JSON.stringify(p.age);command(w,{type:'map-abandon',mapId:0,confirm:true});const a=w.worldGroups!.abandonedContents[0]!,h=a.humans.find(h=>h.id===p.id)!;
 expect(h.items.some(i=>i.id===cargo.id)).toBe(false);expect(a.lost.items.wood).toBe(quantity);expect(p).toMatchObject({...occupied,jobId:null,haul:null,need:null,path:[],moveCooldown:0});expect(p.motion).toBeUndefined();expect(p.orders).toEqual({active:null,queue:[]});expect(JSON.stringify(p.health)).toBe(health);expect(JSON.stringify(p.age)).toBe(age);expect(validateWorld(w)).toEqual([]);
});

test('failed ordinary drop keeps the actual carry tracker and queue cleanup; no-job carry also remains physical',()=>{
 const w=exhaustedCarrier(),p=w.pawns[0]!,cargo=w.piles.find(i=>i.owner.type==='pawn')!,health=JSON.stringify(p.health);const a=detachMapOwners(w,0,0);expect(a.humans[0]!.items).toContain(cargo);expect(cargo.owner).toEqual({type:'pawn',pawnId:p.id});expect(p.interruptedCargo).toBe(true);expect(p.orders).toEqual({active:null,queue:[]});expect(p.haul).toBeNull();expect(JSON.stringify(p.health)).toBe(health);ownerGuard(w,a);
 const plain=registryCamp(),q=plain.pawns[0]!;q.bedId=null;addMaterial(plain,'wood',3,{type:'pawn',pawnId:q.id},'wood');q.interruptedCargo=true;const original=plain.piles.at(-1)!,b=detachMapOwners(plain,0,0);expect(b.humans.find(h=>h.id===q.id)!.items).toContain(original);expect(b.lost.items.wood).toBeUndefined();ownerGuard(plain,b);
});

test('human Rescue keeps one original patient inside its real carrier, stopping an incomplete edge without clinical work',()=>{
 const w=rescueCamp(),p=w.pawns[0]!,patient=w.pawns[1]!;expect(applyCommand(w,{type:'order-rescue',pawnId:p.id,patientId:patient.id,queue:false}).ok).toBe(true);until(w,()=>p.rescue?.phase==='carry'&&!!p.motion&&p.motion.end>w.tick,400);const clinical=JSON.stringify(patient.health),needs=[patient.hunger,patient.rest],occupied={...p.motion!.from},a=detachMapOwners(w,0,0);const h=a.humans.find(h=>h.id===patient.id)!;expect(h.pawn).toBe(patient);expect(h.carriedById).toBe(p.id);expect(patient).toMatchObject(occupied);expect(p).toMatchObject(occupied);expect(patient.motion).toBeUndefined();expect(p.rescue).toBeUndefined();expect(JSON.stringify(patient.health)).toBe(clinical);expect([patient.hunger,patient.rest]).toEqual(needs);expect(a.humans.filter(h=>h.id===patient.id)).toHaveLength(1);ownerGuard(w,a);
});

test('animal Rescue keeps the original held animal and all other living animals, without terrain or treatment',()=>{
 const {world:w,doctorId,animalId,medicalSpot}=animalRescueCamp(),p=w.pawns.find(p=>p.id===doctorId)!,animal=w.wildlife!.animals.find(a=>a.id===animalId)!;p.priorities.doctor=1;w.structures.push({id:w.nextId++,kind:'animal-sleeping-spot',x:medicalSpot.x,z:medicalSpot.z,orientation:0,footprint:'standard',medical:true});expect(applyCommand(w,{type:'order-animal-rescue',pawnId:doctorId,animalId}).ok).toBe(true);until(w,()=>p.animalRescue?.phase==='carry'&&!!p.motion&&p.motion.end>w.tick,500);const clinical=JSON.stringify(animal.health),nutrition=animal.food,rest=animal.rest,originals=w.wildlife!.animals.slice(),a=detachMapOwners(w,0,0);expect(a.animals.map(r=>r.animal)).toEqual(originals);expect(a.animals.find(r=>r.animal.id===animalId)).toMatchObject({carriedById:doctorId});expect(a.animals.find(r=>r.animal.id===animalId)!.animal).toBe(animal);expect(p.animalRescue).toBeUndefined();expect(animal.motion).toBeUndefined();expect(JSON.stringify(animal.health)).toBe(clinical);expect([animal.food,animal.rest]).toEqual([nutrition,rest]);ownerGuard(w,a);
});

test('compact guards reject old full-map owners, malformed personal records, duplicate holders and getters before reads',()=>{
 const w=registryCamp();preparedMap(w);command(w,{type:'map-abandon',mapId:0,confirm:true});const text=serializeCampaign(w),a=w.worldGroups!.abandonedContents[0]!;for(const mutate of [(v:any)=>v.map={tiles:[]},(v:any)=>v.humans[0].pawn.hunger=-1,(v:any)=>v.humans[0].pawn.jobs=[],(v:any)=>v.animals=null,(v:any)=>v.lost.items.wood=-1]){const bad=JSON.parse(text);mutate(bad.worldGroups.abandonedContents[0]);expect(validateWorld(bad).length).toBeGreaterThan(0);expect(()=>deserializeCampaign(JSON.stringify(bad))).toThrow();}
 const duplicate=JSON.parse(text);duplicate.worldGroups.abandonedContents[0].humans.push(duplicate.worldGroups.abandonedContents[0].humans[0]);expect(validateWorld(duplicate).length).toBeGreaterThan(0);let reads=0;const getter=structuredClone(a);Object.defineProperty(getter.humans[0]!.pawn!,'hunger',{enumerable:true,get(){reads++;return 100;}});expect(validLostArchiveShape(getter,w.tick,w.nextId)).toBe(false);expect(reads).toBe(0);expect(serializeCampaign(w)).toBe(text);
});
