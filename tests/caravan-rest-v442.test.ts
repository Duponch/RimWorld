import {expect,test} from 'vitest';
import {writeTestFileSync} from './test-output.ts';
import {reorganizationCamp256} from './helpers/group-reorganization-v256.ts';
import {harness} from './helpers/group-admission-v412.ts';
import {applyCommand,stepWorld} from '../src/sim/engine.ts';
import {serializeCampaign,deserializeWorld,deserializeCampaign,validateWorld} from '../src/sim/serialization.ts';
import {GroupCampaignRuntime256} from '../src/sim/group-campaign-runtime-256.ts';
import {GroupCaravanPhysical256} from '../src/sim/group-caravan-physical-256.ts';
import {createGroupCampaignGeometry256} from '../src/sim/group-campaign-geometry-256.ts';
import {groupHashOffset256,groupPawnInterval256} from '../src/sim/group-core-cadence-256.ts';
import {captureGroupMass,type AwayGroup} from '../src/sim/group-capture.ts';
import {planetTile} from '../src/sim/planet-geography-256.ts';
import {planetCostContext,planetEdgeCost} from '../src/sim/planet-navigation.ts';
import {registeredMap} from '../src/sim/world-map-context.ts';
import {openGroupReorganization} from '../src/sim/group-reorganization-balance.ts';
import {adultAgeTicks} from '../src/sim/animal-life.ts';
import {attachGeneratedAnimalGrowth256} from '../src/sim/animal-growth-runtime-256.ts';
import {createAnimalMedicalRecord256} from '../src/sim/animal-clinical-age-v256.ts';
import {validCaravanRestField266} from '../src/sim/caravan-rest-state-266.ts';
import {SnapshotEncoder,SnapshotDecoder} from '../src/bridge/snapshots.ts';
import {ARMOR_STUFFS267,isSmithingApparel267} from '../src/sim/smithing-apparel-267.ts';
import {SCHEMA_VERSION} from '../src/sim/types.ts';
import type {World,Pawn} from '../src/sim/types.ts';
import type {WildAnimal} from '../src/sim/wildlife-state.ts';

function group(w:World,id:number):AwayGroup {
 const g=w.worldGroups!.groups.find(r=>r.state.id===id)?.state;
 if(!g||!('members'in g))throw Error('Actual away owner missing');return g;
}
class ObservedPhysical extends GroupCaravanPhysical256 {
 readonly calls:number[]=[];
 override afterTween(...args:Parameters<GroupCaravanPhysical256['afterTween']>):void {
  this.calls.push(args[2]);super.afterTween(...args);
 }
}
function runtime(w:World){
 const physical=new ObservedPhysical(),run=new GroupCampaignRuntime256(createGroupCampaignGeometry256(w),physical);
 run.bootstrap(w);return {physical,run};
}
function roundTrip(w:World):World {
 expect(validateWorld(w)).toEqual([]);const saved=serializeCampaign(w),copy=deserializeWorld(saved);
 expect(serializeCampaign(copy)).toBe(saved);return copy;
}

/** Original small campaign owners, with a declared paused, paid return edge.
 * No loading, journey, rest service or need gain is claimed by preparation.
 * The runtime below must obtain the new receipt itself. */
function prepared(withAnimals=false){
 const f=reorganizationCamp256(true),{w,g,members}=f,animals:WildAnimal[]=[];
 for(const p of members){p.rest=50;p.hunger=100;p.recreation.level=100;}
 if(withAnimals){
  for(const p of members)animals.push({id:w.nextId++,species:'muffalo',sex:'female',ageTicks:adultAgeTicks('muffalo'),x:p.x,z:p.z,
   food:1,rest:.5,state:'idle',path:[],nextDecision:w.tick,
   domestic:{since:w.tick,care:'herbal',tameness:5,nextDecay:w.tick+6000,productFullness:0}});
  // Current native-seven originals require their real creation-time growth
  // profile for off-map thermal facts, then the matching clinical age header.
  for(const a of animals){attachGeneratedAnimalGrowth256(a,w.tick*10,w.schemaVersion);a.health=createAnimalMedicalRecord256(w,a);}
  g.animalOwners={revision:1,members:animals,origins:animals.map(a=>({pawnId:a.id,originMapId:f.record.originMapId,context:f.record.context})),order:members.flatMap((p,i)=>[p.id,animals[i]!.id])};
  g.items.push({id:w.nextId++,kind:'food',item:'hay',quantity:40,owner:{type:'inventory',pawnId:animals[0]!.id},rot:{progress:0,atTick:w.tick}});
  g.reorganization=openGroupReorganization(g,w.worldGroups!.losses,w.tick,g.reorganization!.memberOrigins);
 }
 const home=w.planet!.homeTile,from=planetTile(w.planet!,home)!.neighbours.find(id=>planetTile(w.planet!,id)?.biome!=='ocean');
 if(from===undefined)throw Error('Prepared home has no passable neighbour');
 const mass=captureGroupMass(g.members,g.items,!!g.freight,w.schemaVersion,g.packed,g.animalOwners?.members);
 if(!mass)throw Error('Actual caravan mass missing');
 const edge=planetEdgeCost(w.planet!,from,home,planetCostContext(w,mass));
 if(edge===undefined)throw Error('Actual return cost missing');
 Object.assign(g,{tile:from,destination:home,phase:'travelling',route:[home],segment:{from,to:home,totalCore:Math.fround(edge),remainingCore:0},paused:true,stop:{kind:'paused'}});
 expect(validateWorld(w)).toEqual([]);expect([...members,...animals].every(p=>!Object.hasOwn(p,'caravanRest'))).toBe(true);
 return {...f,animals};
}

/** Find an observable save boundary: needs150 comes in the next local tick,
 * while the previously earned receipt is live, BEFORE the next callback.
 * This selects a clock window, never changes an ID, clock or meter. */
function checkpoint(withAnimals=false){
 const f=prepared(withAnimals),live=runtime(f.w);
 for(let i=0;i<50;i++){
  stepWorld(f.w,1,undefined,live.run);
  const g=group(f.w,f.g.id),now=f.w.tick*10;
  const actors:readonly (Pawn|WildAnimal)[]=withAnimals?g.animalOwners!.members:g.members;
  for(const actor of actors){
   const mark=actor.caravanRest;if(!mark)continue;
   let nextCallback=now+1,delta=g.travel!.tickDelta+1;
   while(delta<=15&&(((nextCallback|0)+groupHashOffset256(g.id))|0)%15!==0){nextCallback++;delta++;}
   for(let due=now+1;due<=now+10;due++)if(groupPawnInterval256(actor.id,due,150,1)&&due<nextCallback&&due-mark.atCore<15){
    expect(live.physical.calls).toContain(mark.atCore);expect(mark.atCore).toBeLessThanOrEqual(now);
    return {...f,live,actor,due,nextCallback};
   }
  }
 }
 throw Error('No acquired rest/needs150/callback save window within50 real local ticks');
}

test('earned human rest survives reload and same-tick pause commands before needs150, with complete continuation equality',()=>{
 const f=checkpoint(),{w,live,actor,due}=f,id=f.g.id;
 if('species'in actor)throw Error('Human checkpoint selected an animal');
 // Commands must use the same authoritative runtime; no physical tick occurs.
 const commandTick=w.tick,mark=structuredClone(actor.caravanRest),beforeRest=actor.rest;
 for(const paused of [false,true]){const result=applyCommand(w,{type:'group-pause',groupId:id,paused},live.run);expect(result.ok,result.reason).toBe(true);}
 expect(w.tick).toBe(commandTick);expect(actor.caravanRest).toEqual(mark);expect(actor.rest).toBe(beforeRest);
 writeTestFileSync('artifacts/caravan-rest-v442/human-acquired.json',serializeCampaign(w));
 const copy=roundTrip(w),replay=runtime(copy),calls=live.physical.calls.length;
 expect(replay.run.restMarks.effectiveness(actor.id,due,group(copy,id).members.find(p=>p.id===actor.id)!)).toBe(mark!.effectiveness);
 stepWorld(w,1,undefined,live.run);stepWorld(copy,1,undefined,replay.run);
 expect(live.physical.calls.slice(calls).every(core=>core>due)).toBe(true);
 expect(actor.rest).toBeGreaterThan(beforeRest);expect(serializeCampaign(copy)).toBe(serializeCampaign(w));
 for(let i=0;i<6;i++){stepWorld(w,1,undefined,live.run);stepWorld(copy,1,undefined,replay.run);expect(serializeCampaign(copy)).toBe(serializeCampaign(w));}
 roundTrip(w);
});

test('the same original keeps its earned receipt through an actual split, and the other member returns without a rest registry',()=>{
 const f=checkpoint(),{w,live,actor}=f,id=f.g.id,mark=structuredClone(actor.caravanRest),driver=harness(w);
 if('species'in actor)throw Error('Human split checkpoint selected an animal');
 driver.command({type:'group-split',groupId:id,memberIds:[actor.id],inventory:[{pileId:group(w,id).items.find(p=>p.item==='survival-meal')!.id,quantity:1}]});
 const child=w.worldGroups!.groups.find(r=>r.state.id!==id&&'members'in r.state&&r.state.members.includes(actor))!;
 expect(child).toBeDefined();expect('members'in child.state&&child.state.members[0]).toBe(actor);expect(actor.caravanRest).toEqual(mark);
 // Re-bootstrap only after the command, exactly as a new Worker generation.
 const saved=roundTrip(w),replay=harness(saved),source=group(w,id).members[0]!,originalSourceMark=structuredClone(source.caravanRest);
 driver.command({type:'group-pause',groupId:id,paused:false});replay.command({type:'group-pause',groupId:id,paused:false});
 for(let i=0;i<8&&!registeredMap(w,f.record.originMapId)!.pawns.includes(source);i++){
  driver.step();replay.step();expect(serializeCampaign(saved)).toBe(serializeCampaign(w));
 }
 expect(registeredMap(w,f.record.originMapId)!.pawns.find(p=>p.id===source.id)).toBe(source);
 expect(w.worldGroups!.groups.some(r=>'members'in r.state&&r.state.members.includes(source))).toBe(false);
 expect(source.caravanRest).toBeDefined();expect(source.caravanRest!.atCore).toBeGreaterThanOrEqual(originalSourceMark!.atCore);
 expect(group(w,child.state.id).members[0]).toBe(actor);roundTrip(w);
 // The old runtime was not used after reorganization; no hidden mark registry
 // is copied into either fresh generation.
 expect(live.physical.calls.length).toBeGreaterThan(0);
});

test('actual mixed-caravan animal rest is earned, restored before needs150 and expires at the strict15-Core boundary',()=>{
 const {w,g,live,actor,due}=checkpoint(true),mark=structuredClone(actor.caravanRest)!,before=actor.rest;
 expect('species'in actor).toBe(true);expect(mark.effectiveness).toBe(.8);
 expect(live.run.restMarks.effectiveness(actor.id,mark.atCore,actor)).toBe(.8);
 expect(live.run.restMarks.effectiveness(actor.id,mark.atCore+14,actor)).toBe(.8);
 expect(live.run.restMarks.effectiveness(actor.id,mark.atCore+15,actor)).toBeUndefined();
 const copy=roundTrip(w),replay=runtime(copy),restored=group(copy,g.id).animalOwners!.members.find(a=>a.id===actor.id)!;
 expect(restored.caravanRest).toEqual(mark);expect(replay.run.restMarks.effectiveness(actor.id,due,restored)).toBe(.8);
 stepWorld(w,1,undefined,live.run);stepWorld(copy,1,undefined,replay.run);
 expect(actor.rest).toBeGreaterThan(before);expect(serializeCampaign(copy)).toBe(serializeCampaign(w));
 for(let i=0;i<4;i++){stepWorld(w,1,undefined,live.run);stepWorld(copy,1,undefined,replay.run);expect(serializeCampaign(copy)).toBe(serializeCampaign(w));}
});

test('strict265 migrates the complete unmarked campaign by number only and rejects a future receipt on local or away owners',()=>{
 const f=prepared(),old=JSON.parse(serializeCampaign(f.w)) as World;
 // This synthetic265 witness predates forge permission presets; discard only
 // those newly introduced permissions before casting the historical schema.
 if(old.apparelPolicies)old.apparelPolicies=old.apparelPolicies.map(p=>({...p,
  allowedItems:p.allowedItems.filter(i=>!isSmithingApparel267(i)),
  allowedMaterials:p.allowedMaterials.filter(m=>!(ARMOR_STUFFS267 as readonly string[]).includes(m))}));
 Object.assign(old,{schemaVersion:265});const bytes=JSON.stringify(old),migrated=deserializeCampaign(bytes);
 expect(migrated.schemaVersion).toBe(SCHEMA_VERSION);expect(JSON.parse(serializeCampaign(migrated))).toEqual({...old,schemaVersion:SCHEMA_VERSION});
 expect(JSON.stringify(old)).toBe(bytes);
 for(const location of ['local','away'] as const){
  const bad=JSON.parse(bytes) as World,p=location==='local'?bad.pawns[0]!:group(bad,f.g.id).members[0]!;
  p.caravanRest={atCore:bad.tick*10,effectiveness:.8};const input=JSON.stringify(bad);
  expect(()=>deserializeCampaign(input),location).toThrow();expect(JSON.stringify(bad)).toBe(input);
 }
 expect([...migrated.worldGroups!.groups.flatMap(r=>'members'in r.state?r.state.members:[]),...('pawns'in migrated?migrated.pawns:[])].every(p=>!Object.hasOwn(p,'caravanRest'))).toBe(true);
});

test('current save and public checkpoint/delta guards reject malformed receipts atomically, including same-tick changes',()=>{
 const {w,g,actor}=checkpoint(),encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();
 const full=structuredClone(encoder.encode(w,0,0)),first=decoder.adopt(full);
 expect(first.status).toBe('applied');if(first.status!=='applied')throw Error('Valid rest checkpoint refused');
 const retained=structuredClone(first.world),original=serializeCampaign(w);
 for(const [label,value] of [
  ['own undefined',undefined],['NaN effectiveness',{atCore:w.tick*10,effectiveness:NaN}],
  ['future clock',{atCore:w.tick*10+1,effectiveness:.8}],['negative clock',{atCore:-1,effectiveness:.8}],
  ['zero effectiveness',{atCore:w.tick*10,effectiveness:0}],['extra member',{atCore:w.tick*10,effectiveness:.8,extra:true}],
 ] as const){
  const bad=deserializeWorld(original);Object.assign(group(bad,g.id).members.find(p=>p.id===actor.id)!,{caravanRest:value});
  expect(validateWorld(bad).length,label).toBeGreaterThan(0);expect(()=>serializeCampaign(bad),label).toThrow();
  const forged=structuredClone(full);if(!forged.world.campaignMap||forged.world.campaignMap.revision!==2)throw Error('Actual campaign projection missing');
  const projected=forged.world.campaignMap.groups.find(r=>r.id===g.id)!.state;if(!('members'in projected))throw Error('Actual projected away members missing');
  Object.assign(projected.members.find(p=>p.id===actor.id)!,{caravanRest:value});
  expect(new SnapshotDecoder().adopt(forged).status,label).toBe('resync');expect(first.world).toEqual(retained);
 }
 // Same-tick physical service edits remain visible to the public encoder.
 // This is an explicit transport mutant, not a claim of a second real rest.
 const tick=w.tick;actor.caravanRest={...actor.caravanRest!,effectiveness:.9};
 const delta=structuredClone(encoder.encode(w,0,0));expect(delta.kind).toBe('delta');expect(w.tick).toBe(tick);
 const corrupt=structuredClone(delta);if(!corrupt.world.campaignMap||corrupt.world.campaignMap.revision!==2)throw Error('Actual delta projection missing');
 const projected=corrupt.world.campaignMap.groups.find(r=>r.id===g.id)!.state;if(!('members'in projected))throw Error('Actual delta members missing');
 projected.members.find(p=>p.id===actor.id)!.caravanRest!.atCore=w.tick*10+1;
 expect(decoder.adopt(corrupt).status).toBe('resync');expect(first.world).toEqual(retained);
 const next=decoder.adopt(delta);expect(next.status).toBe('applied');
 if(next.status==='applied'){
  if(next.world.campaignMap?.revision!==2)throw Error('Actual admitted delta projection missing');
  const state=next.world.campaignMap.groups.find(r=>r.id===g.id)!.state;
  expect('members'in state&&state.members.find(p=>p.id===actor.id)!.caravanRest).toEqual(actor.caravanRest);
 }
 expect(first.world).toEqual(retained);
 // Pure hostile shapes cannot be represented faithfully by JSON.
 const inherited=Object.assign(Object.create({effectiveness:.8}),{atCore:w.tick*10});
 expect(validCaravanRestField266({caravanRest:inherited},266,w.tick)).toBe(false);
 let reads=0;const accessor={atCore:w.tick*10};Object.defineProperty(accessor,'effectiveness',{enumerable:true,get(){reads++;return .8;}});
 expect(validCaravanRestField266({caravanRest:accessor},266,w.tick)).toBe(false);expect(reads).toBe(0);
});
