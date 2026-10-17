import {createMedicalRecord} from '../src/sim/injury-state.ts';
import {addCryptosleepSickness256} from '../src/sim/cryptosleep-sickness-256.ts';
import {animalSpecies} from '../src/sim/animal-species.ts';
import {holdNewDuckArrival256} from '../src/sim/duck-flyer-runtime-256.ts';
import {test,expect} from 'vitest';
import {registryCamp,preparedMap,command} from './helpers/world-maps-v255.ts';
import {captureStandability} from '../src/sim/furniture-travel.ts';
import {registeredMap} from '../src/sim/world-map-context.ts';
import {adultAgeTicks} from '../src/sim/animal-life.ts';
import {createAnimalMedicalRecord256} from '../src/sim/animal-clinical-age-v256.ts';
import {detachMapOwners} from '../src/sim/world-lost-owners.ts';
import {validLostArchiveShape,validateLostArchives} from '../src/sim/world-lost-save.ts';
import {captureActorBeds256} from '../src/sim/actor-bed-local-256.ts';
import {prepareRemovedMapBeds256} from '../src/sim/actor-bed-transition-256.ts';
import {applyCommand,validateWorld,serializeCampaign,deserializeCampaign} from '../src/sim/index.ts';
import type {WildAnimal} from '../src/sim/wildlife-state.ts';
/** Declared originals and possessions, no natural acquisition or journey asserted. */
function prepared(){const w=registryCamp(),map=registeredMap(w,0)!;expect(w.schemaVersion).toBeGreaterThanOrEqual(256);const stand=captureStandability(map);let cell:{x:number;z:number}|undefined;for(let z=1;z<map.height-1&&!cell;z++)for(let x=1;x<map.width-1;x++)if(stand({x,z})&&!map.pawns.some(p=>p.x===x&&p.z===z)){cell={x,z};break;}if(!cell)throw Error('Declared standing cell missing');
 const animal:WildAnimal={id:map.nextId++,species:'muffalo',sex:'female',ageTicks:adultAgeTicks('muffalo'),...cell,food:1,rest:1,state:'idle',path:[],nextDecision:map.tick,domestic:{since:map.tick,care:'herbal',tameness:5,nextDecay:map.tick+6000,productFullness:0}};animal.health=createAnimalMedicalRecord256(map,animal);map.wildlife??={profile:'temperate-hares-v1',rng:1,animals:[],eatenPlants:0,eatenNutrition:0,eatenItems:0};map.wildlife.animals.push(animal);
 const item={id:map.nextId++,kind:'food' as const,item:'hay' as const,quantity:2,owner:{type:'inventory' as const,pawnId:animal.id},rot:{progress:0,atTick:map.tick}};map.piles.push(item);const pack={building:{id:map.nextId++,kind:'bedroll' as const,...cell,orientation:0 as const,footprint:'standard' as const,material:'cloth' as const,quality:'normal' as const},owner:{type:'inventory' as const,pawnId:animal.id}};map.packed.push(pack);return {w,map,animal,item,pack};}
function abandoned(){const f=prepared();preparedMap(f.w);command(f.w,{type:'map-abandon',mapId:0,confirm:true});const archive=f.w.worldGroups!.abandonedContents.find(a=>a.mapId===0)!;return {...f,archive,row:archive.animals.find(r=>r.animal.id===f.animal.id)!};}

test('MapRemoved retains actual animal inventory/packed originals without crediting ground loss or a surviving stock',()=>{const f=prepared(),groundHay=f.map.piles.filter(p=>p.item==='hay'&&p.owner.type==='ground').reduce((n,p)=>n+p.quantity,0),beforeNext=f.map.nextId,health=JSON.stringify(f.animal.health),age=f.animal.ageTicks,archive=detachMapOwners(f.map,0,f.w.planet!.homeTile),row=archive.animals.find(r=>r.animal.id===f.animal.id)!;expect(row.animal).toBe(f.animal);expect(row.items).toEqual([f.item]);expect(row.items![0]).toBe(f.item);expect(row.packed![0]).toBe(f.pack);expect(archive.lost.items.hay??0).toBe(groundHay);expect(archive.lost.packed).toBe(f.map.packed.filter(p=>p!==f.pack&&p.owner.type==='ground').length);expect(f.map.nextId).toBe(beforeNext);expect(JSON.stringify(f.animal.health)).toBe(health);expect(f.animal.ageTicks).toBe(age);expect(Object.keys(archive).some(k=>['map','tiles','structures','jobs'].includes(k))).toBe(false);});

test('real abandon publishes compact possessions, keeps exact RAW reprise and refuses entry to the retired original',()=>{const f=abandoned();expect(f.row.items![0]).toBe(f.item);expect(f.row.packed![0]).toBe(f.pack);expect(validateWorld(f.w)).toEqual([]);const text=serializeCampaign(f.w);expect(serializeCampaign(deserializeCampaign(text))).toBe(text);expect(f.w.piles.some(p=>p.id===f.item.id)).toBe(false);expect(applyCommand(f.w,{type:'map-view',mapId:0}).ok).toBe(false);expect(captureActorBeds256(f.w).refs).toContainEqual({id:f.pack.building.id,mapId:null,slots:1,animal:false});});

test('historic255 archive remains literal and future possession keys reject before any getter is read',()=>{const f=prepared(),archive=detachMapOwners(f.map,0,f.w.planet!.homeTile),row=archive.animals.find(r=>r.animal.id===f.animal.id)!;expect(validLostArchiveShape(archive,f.w.tick,f.w.nextId,255,f.w)).toBe(false);delete row.items;delete row.packed;expect(validLostArchiveShape(archive,f.w.tick,f.w.nextId,255,f.w)).toBe(true);for(const field of ['items','packed'] as const){let reads=0;Object.defineProperty(row,field,{configurable:true,enumerable:true,get(){reads++;return [];}});expect(validLostArchiveShape(archive,f.w.tick,f.w.nextId,256,f.w)).toBe(false);expect(reads).toBe(0);delete row[field];}});

test('actual compact namespace rejects duplicate pile/pack IDs and an inventory belonging to another animal',()=>{const f=abandoned(),known=new Map(),valid=()=>validateLostArchives(f.w,known,new Set());expect(valid()).toEqual([]);f.row.items!.push({...f.item});expect(valid().length).toBeGreaterThan(0);f.row.items!.pop();const owner=f.item.owner;f.item.owner={type:'inventory',pawnId:f.animal.id+1};expect(valid().length).toBeGreaterThan(0);f.item.owner=owner;const id=f.pack.building.id;f.pack.building.id=f.item.id;expect(valid().length).toBeGreaterThan(0);f.pack.building.id=id;expect(valid()).toEqual([]);});

test('MapRemoved unclaims actors actually left but preserves another actual owner claim to the packed original',()=>{const f=prepared(),other=preparedMap(f.w),traveler=other.pawns[0]!;traveler.mapBed={revision:1,mapId:null,bedId:f.pack.building.id};const left=f.map.pawns[0]!,secondPack={...f.pack,building:{...f.pack.building,id:f.map.nextId++}};f.map.packed.push(secondPack);left.mapBed={revision:1,mapId:null,bedId:secondPack.building.id};expect(prepareRemovedMapBeds256(f.w,f.map,0)).toBeDefined();command(f.w,{type:'map-abandon',mapId:0,confirm:true});expect(left.mapBed).toBeUndefined();expect(traveler.mapBed).toEqual({revision:1,mapId:null,bedId:f.pack.building.id});expect(captureActorBeds256(f.w).refs.some(r=>r.id===f.pack.building.id&&r.mapId===null)).toBe(true);});

test('held archive clock is the exact personal frontier, not the removal clock; malformed/future clocks refuse',()=>{const f=prepared(),archive=detachMapOwners(f.map,0,f.w.planet!.homeTile),row=archive.animals.find(r=>r.animal.id===f.animal.id)!;archive.humans=[];archive.pods=[];archive.animals=[row];archive.removedAt=f.map.tick+1;row.clock=f.map.tick;expect(validLostArchiveShape(archive,archive.removedAt,f.w.nextId,256,f.w)).toBe(true);delete row.clock;expect(validLostArchiveShape(archive,archive.removedAt,f.w.nextId,256,f.w)).toBe(false);row.clock=archive.removedAt+1;expect(validLostArchiveShape(archive,archive.removedAt,f.w.nextId,256,f.w)).toBe(false);Object.defineProperty(row,'clock',{value:undefined,enumerable:true,configurable:true});expect(validLostArchiveShape(archive,archive.removedAt,f.w.nextId,256,f.w)).toBe(false);Object.defineProperty(row,'clock',{value:f.map.tick,enumerable:false,configurable:true});expect(validLostArchiveShape(archive,archive.removedAt,f.w.nextId,256,f.w)).toBe(false);});

test('actual Duck holder removal retains its single living original at its personal clock and retires the local holder',()=>{const f=prepared(),duck:WildAnimal={id:f.map.nextId++,species:'duck',sex:'female',ageTicks:adultAgeTicks('duck'),x:f.animal.x,z:f.animal.z,food:animalSpecies('duck').nutrition,rest:1,state:'idle',path:[],nextDecision:f.map.tick};f.map.wildlife!.animals.push(duck);expect(holdNewDuckArrival256(f.map,duck)).toBe(true);const holder=f.map.wildlife!.flyers!.find(h=>h.animal===duck)!;const next=f.map.nextId,archive=detachMapOwners(f.map,0,f.w.planet!.homeTile),row=archive.animals.find(r=>r.animal===duck)!;expect(row.clock).toBe(holder.personalTick);expect(archive.animals.filter(r=>r.animal.id===duck.id)).toHaveLength(1);expect(JSON.stringify(archive)).not.toContain('holderId');expect(archive.animals.some(r=>r.animal.id===holder.id)).toBe(false);expect(f.map.nextId).toBe(next);expect(Object.hasOwn(row.animal,'flight')).toBe(false);});

test('owned-bed removal decides a packed original loss after its real owner has become ground',()=>{const f=prepared(),other=preparedMap(f.w),traveler=other.pawns[0]!;traveler.mapBed={revision:1,mapId:null,bedId:f.pack.building.id};const plan=prepareRemovedMapBeds256(f.w,f.map,0)!;const same=f.pack as import('../src/sim/furniture-rules.ts').PackedFurniture;same.owner={type:'ground',x:f.animal.x,z:f.animal.z};plan.commit();expect(traveler.mapBed).toBeUndefined();expect(same.building.id).toBe(f.pack.building.id);});

/** Explicit prepared current episodes. The real abandon command must stop
 * their spatial job; no elapsed clinical time or acquisition is claimed. */
test('real MapRemoved stops cryptosleep vomit while retaining both actual clinical records and animal inventory',()=>{
 const f=prepared();preparedMap(f.w);const pawn=f.map.pawns[0]!;pawn.health??=createMedicalRecord(f.map.tick);
 const records=[pawn.health,f.animal.health!],random={integer:()=>10000,integerValue:()=>17};
 for(const record of records)addCryptosleepSickness256(record,random,256);
 pawn.health.cryptosleepSickness!.vomit={remainingCore:300,cell:{x:pawn.x,z:pawn.z}};
 f.animal.health!.cryptosleepSickness!.vomit={remainingCore:400,cell:{x:f.animal.x,z:f.animal.z}};
 const expected=records.map(record=>{const copy=structuredClone(record);delete copy.cryptosleepSickness!.vomit;return copy;}),age=f.animal.ageTicks,nextId=f.w.nextId;
 expect(validateWorld(f.w)).toEqual([]);
 command(f.w,{type:'map-abandon',mapId:0,confirm:true});
 const archive=f.w.worldGroups!.abandonedContents.find(a=>a.mapId===0)!,human=archive.humans.find(h=>h.id===pawn.id)!,animal=archive.animals.find(a=>a.animal.id===f.animal.id)!;
 expect(human.pawn).toBe(pawn);expect(animal.animal).toBe(f.animal);expect(pawn.health).toBe(records[0]);expect(f.animal.health).toBe(records[1]);
 expect(pawn.health).toEqual(expected[0]);expect(f.animal.health).toEqual(expected[1]);expect(f.animal.ageTicks).toBe(age);expect(f.w.nextId).toBe(nextId);
 expect(animal.items![0]).toBe(f.item);expect(animal.packed![0]).toBe(f.pack);expect(f.w.piles.some(p=>p.id===f.item.id)).toBe(false);
 expect(validateWorld(f.w)).toEqual([]);const raw=serializeCampaign(f.w);expect(serializeCampaign(deserializeCampaign(raw))).toBe(raw);
});
