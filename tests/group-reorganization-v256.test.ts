import {addMaterial,refreshStock} from '../src/sim/materials.ts';
import {createMedicalRecord,reconcileMedicalDeath} from '../src/sim/injury-state.ts';
import {BLOOD_UNIT} from '../src/sim/injury-rules.ts';
import {flushRegisteredMap} from '../src/sim/world-map-context.ts';
import {applyWorldMapCommand,groupEntryActions} from '../src/sim/world-map-authority.ts';
import {expect,test} from 'vitest';
import {reorganizationCamp256,preparedMotion,testMotionGeometry} from './helpers/group-reorganization-v256.ts';
import {prepareGroupSplit,prepareGroupMerge,commitGroupReorganization} from '../src/sim/group-reorganization.ts';
import {draftSplitInventory,commitSplitInventory} from '../src/sim/group-inventory-reorganization.ts';
import {openGroupReorganization,groupReorganizationBalance,groupInventoryVector} from '../src/sim/group-reorganization-balance.ts';
import {validGroupReorganizationCommand} from '../src/sim/group-reorganization-save.ts';
import {GroupMotionRuntime} from '../src/sim/group-motion-runtime.ts';
import {rememberCurrentMapArea,prepareRemovedMapAreas,commitRemovedMapAreas,validPawnMapAreaBindings,prepareMapAreaEntry,commitMapAreaEntry} from '../src/sim/pawn-map-areas.ts';
import {validProjectedMemberContexts,captureGroupMemberContexts} from '../src/sim/group-member-origin.ts';
import {validateWorld,serializeCampaign,deserializeCampaign} from '../src/sim/index.ts';
import {SnapshotEncoder,SnapshotDecoder} from '../src/bridge/snapshots.ts';
import type {AwayGroup} from '../src/sim/group-capture.ts';
import type {MaterialPile,World} from '../src/sim/types.ts';
const split=(f:ReturnType<typeof reorganizationCamp256>,quantity=1)=>prepareGroupSplit(f.w,{type:'group-split',groupId:f.g.id,memberIds:[f.members[1]!.id],inventory:quantity?[{pileId:f.g.items.find(p=>p.item==='survival-meal')!.id,quantity}]:[]});
function commit(result:ReturnType<typeof split>){expect(result.kind).toBe('ready');if(result.kind!=='ready')throw Error(result.reason);expect(commitGroupReorganization(result.plan)).toEqual({ok:true});return result.plan;}

test('split an engaged actual owner: source route, pause, counters and originals survive; only child starts stationary',()=>{
 const f=reorganizationCamp256(),{w,g,members}=f,from=g.tile,to=legacyPlanet(w).tiles[from]!.neighbours.find(id=>legacyPlanet(w).tiles[id]!.biome!=='ocean')!;if(to===undefined)throw Error('Prepared land edge missing');
 g.destination=to;g.phase='travelling';g.route=[to];g.segment={from,to,totalCore:500,remainingCore:217};g.paused=true;g.stop={kind:'paused'};g.travel!.tickDelta=7;
 const edge=g.segment,route=g.route,ledger=g.ledger,originalFood=g.items.find(p=>p.item==='survival-meal')!,next=w.nextId,rng=w.rng;
 const plan=commit(split(f,2)),source=f.record.state as AwayGroup,child=plan.created[0]!.state as AwayGroup;
 expect(source.members[0]).toBe(members[0]);expect(child.members[0]).toBe(members[1]);expect(source.segment).toBe(edge);expect(source.route).toBe(route);expect(source.ledger).toBe(ledger);expect(source.paused).toBe(true);expect(source.travel!.tickDelta).toBe(7);
 expect(child).toMatchObject({tile:from,destination:from,phase:'stationary',segment:null,route:[from],paused:false,travel:{revision:1,tickDelta:0,forage:{progress:0}},reorganization:{birth:{kind:'split',parentGroupId:g.id}}});
 expect(source.items.find(p=>p.id===originalFood.id)).toBe(originalFood);expect(originalFood.quantity).toBe(2);expect(child.items.find(p=>p.item==='survival-meal')).toMatchObject({id:next,quantity:2,owner:{type:'inventory',pawnId:members[1]!.id}});expect(w.nextId).toBe(next+1);expect(w.rng).not.toBe(rng);expect(validateWorld(w)).toEqual([]);
 const saved=serializeCampaign(w),restored=deserializeCampaign(saved);expect(serializeCampaign(restored)).toBe(saved);expect(restored.worldGroups!.groups.map(r=>r.state)).toEqual(w.worldGroups!.groups.map(r=>r.state));
});

test('refusal, exhausted IDs, duplicate selection and stale confirmations leave World, allocator and RNG byte exact',()=>{
 const f=reorganizationCamp256(),frozen=serializeCampaign(f.w);for(const memberIds of [[],f.members.map(p=>p.id),[f.members[1]!.id,f.members[1]!.id]]){expect(prepareGroupSplit(f.w,{type:'group-split',groupId:f.g.id,memberIds,inventory:[]}).kind).toBe('refused');expect(serializeCampaign(f.w)).toBe(frozen);}
 const ready=split(f);if(ready.kind!=='ready')throw Error(ready.reason);f.w.rng^=1;const changed=serializeCampaign(f.w);expect(commitGroupReorganization(ready.plan).ok).toBe(false);expect(serializeCampaign(f.w)).toBe(changed);
 f.w.rng^=1;f.w.planet!.nextGroupId=Number.MAX_SAFE_INTEGER;const exhausted=JSON.stringify(f.w);expect(split(f).kind).toBe('refused');expect(JSON.stringify(f.w)).toBe(exhausted);
 let reads=0;const hostile={type:'group-split',groupId:f.g.id,memberIds:[f.members[1]!.id],inventory:[]};Object.defineProperty(hostile,'memberIds',{get(){reads++;return [f.members[1]!.id];},enumerable:true});expect(validGroupReorganizationCommand(hostile,256)).toBe(false);expect(reads).toBe(0);expect(validGroupReorganizationCommand({type:'group-merge',groupIds:[1,2]},255)).toBe(false);
});

test('no nutrition/overload admission is invented for split; source without travel keeps its historical cadence',()=>{
 const f=reorganizationCamp256(false);f.g.items=f.g.items.filter(p=>p.item!=='survival-meal');f.g.baseline.food=0;for(const p of f.g.members){p.hunger=0;p.rest=0;}const plan=commit(split(f,0));expect(Object.hasOwn(f.record.state,'travel')).toBe(false);expect((plan.created[0]!.state as AwayGroup).travel).toBeDefined();
 expect(groupReorganizationBalance(f.record.state as AwayGroup,(f.record.state as AwayGroup).reorganization!,[])).toBe(true);
});

test('real successive partial stack absorption preserves units and records allocated then absorbed fragment IDs',()=>{
 const f=reorganizationCamp256(),[a,b]=f.members;const base=f.w.nextId,items:MaterialPile[]=[{id:base,kind:'textile',item:'cloth',quantity:60,owner:{type:'inventory',pawnId:a!.id}},{id:base+1,kind:'textile',item:'cloth',quantity:60,owner:{type:'inventory',pawnId:a!.id}},{id:base+2,kind:'textile',item:'cloth',quantity:50,owner:{type:'inventory',pawnId:b!.id}}];
 const bytes=JSON.stringify(items),draft=draftSplitInventory(f.members,items,new Set([b!.id]),[{pileId:base+2,quantity:50}],base+3,f.w.rng,f.w.tick);expect(draft).toBeDefined();expect(JSON.stringify(items)).toBe(bytes);if(!draft)throw Error('Actual split draft missing');expect(draft.receipts.filter(r=>r.absorbedById!==undefined).length).toBeGreaterThanOrEqual(2);expect(draft.nextId).toBeGreaterThanOrEqual(base+5);commitSplitInventory(draft);expect(groupInventoryVector([...draft.source,...draft.child]).cloth).toBe(170);expect(groupInventoryVector(draft.child).cloth).toBe(50);expect(groupInventoryVector(draft.source).cloth).toBe(120);expect(draft.receipts.every(r=>r.quantity>0)).toBe(true);
});

test('merge tie follows actual selected cohort order and preserves surviving ID, edge, ledger and runtime position',()=>{
 const f=reorganizationCamp256(),plan=commit(split(f,1)),child=plan.created[0]!,motion=preparedMotion(f.w),position=motion.position(child.state.id),source=f.record.state as AwayGroup;
 const prepared=prepareGroupMerge(f.w,{type:'group-merge',groupIds:[child.state.id,source.id]},motion);expect(prepared.kind).toBe('ready');if(prepared.kind!=='ready')throw Error(prepared.reason);const childId=child.state.id,ledger=child.state.ledger;expect(prepared.plan.survivors).toEqual([childId]);expect(commitGroupReorganization(prepared.plan).ok).toBe(true);expect(f.w.worldGroups!.groups).toHaveLength(1);const merged=child.state as AwayGroup;expect(merged.id).toBe(childId);expect(merged.ledger).toBe(ledger);expect(merged.members.map(p=>p.id)).toEqual([f.members[1]!.id,f.members[0]!.id]);expect(motion.position(childId)).toBe(position);expect(groupReorganizationBalance(merged,merged.reorganization!,f.w.worldGroups!.losses)).toBe(true);expect(validateWorld(f.w)).toEqual([]);
});

test('motion proximity is strict below half tile size; globe cadence and load reset never alter the serialized source route',()=>{
 const owners=[{id:1,tile:0,destination:0,moving:false,segment:null,nextPassable:true},{id:2,tile:1,destination:1,moving:false,segment:null,nextPassable:true}],geometry={...testMotionGeometry,center:(tile:number)=>[tile*.5,0,0] as const,tangent:()=>[0,0,0] as const},motion=new GroupMotionRuntime(geometry);motion.bootstrap(owners);expect(motion.closeTo(owners[0]!,owners[1]!)).toBe(false);const near=new GroupMotionRuntime({...geometry,center:tile=>[tile*.49,0,0]});near.bootstrap(owners);expect(near.closeTo(owners[0]!,owners[1]!)).toBe(true);
 const callbacks:string[]=[];motion.setGlobeSelected(true);motion.stepCore(1,{owners:()=>owners,beforeTween:(id,d)=>callbacks.push(`pather:${id}:${d}`),afterTween:(id,d)=>callbacks.push(`needs:${id}:${d}`)});expect(callbacks).toEqual(['pather:1:1','needs:1:1','pather:2:1','needs:2:1']);motion.bootstrap(owners);expect(motion.globeSelected).toBe(false);expect(motion.position(1)).toEqual([0,0,0]);
});

test('per-person projection headers are joined before branding and forged/missing headers refuse atomically in Decoder',()=>{
 const f=reorganizationCamp256();commit(split(f,1));const contexts=captureGroupMemberContexts(f.w,(f.record.state as AwayGroup).reorganization!.memberOrigins);expect(validProjectedMemberContexts(contexts,(f.record.state as AwayGroup).reorganization!.memberOrigins,f.w.tick,f.w.nextId)).toBe(true);const bad=structuredClone(contexts);bad[0]!.context.width=250;expect(validProjectedMemberContexts(bad,(f.record.state as AwayGroup).reorganization!.memberOrigins,f.w.tick,f.w.nextId)).toBe(false);
 const encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder(),packet=structuredClone(encoder.encode(f.w,0,0)),adopted=decoder.adopt(packet);expect(adopted.status,adopted.status==='resync'?adopted.reason:undefined).toBe('applied');if(adopted.status!=='applied')throw Error('Prepared projection refused');const before=structuredClone(adopted.world),forged=structuredClone(packet);if(!('world'in forged)||!forged.world.campaignMap||forged.world.campaignMap.revision!==2)throw Error('Actual campaign projection missing');forged.epoch=packet.epoch+1;forged.revision=packet.revision;const header=forged.world.campaignMap.groups[0]!.memberContexts![0]!;header.context={...header.context,seed:header.context.seed^1};expect(decoder.adopt(forged).status).toBe('resync');expect(adopted.world).toEqual(before);const retry=structuredClone(packet);retry.epoch=forged.epoch;retry.revision=packet.revision;const readopted=decoder.adopt(retry);expect(readopted.status,readopted.status==='resync'?readopted.reason:undefined).toBe('applied');
});

test('real original area survives a declared departure; actual MapRemoved clears only its reference before split/merge and refuses return',()=>{
 const f=reorganizationCamp256(true,true),original=f.members[0]!,origin=f.record.originMapId,area=f.map.allowedAreas![0]!.id;
 expect(original.allowedAreaId).toBeUndefined();expect(original.mapAreas).toEqual({revision:1,assignments:[{mapId:origin,areaId:area}]});expect(validPawnMapAreaBindings(original,f.map,false)).toBe(true);
 const bad=structuredClone(original);bad.mapAreas!.assignments[0]!.areaId=f.w.nextId;expect(validPawnMapAreaBindings(bad,f.map,false)).toBe(false);
 const untouched={age:structuredClone(original.age),hunger:original.hunger,rest:original.rest,health:structuredClone(original.health)};
 expect(applyWorldMapCommand(f.w,{type:'map-abandon',mapId:origin,confirm:true}).ok).toBe(true);expect(original.mapAreas).toEqual({revision:1,assignments:[]});expect({age:original.age,hunger:original.hunger,rest:original.rest,health:original.health}).toEqual(untouched);
 const child=commit(split(f,1)).created[0]!,motion=preparedMotion(f.w),merged=prepareGroupMerge(f.w,{type:'group-merge',groupIds:[f.record.state.id,child.state.id]},motion);if(merged.kind!=='ready')throw Error(merged.reason);expect(commitGroupReorganization(merged.plan).ok).toBe(true);expect((f.record.state as AwayGroup).members.find(p=>p.id===original.id)).toBe(original);expect(groupEntryActions(f.w,f.record.state.id).visit.ok).toBe(false);expect(validateWorld(f.w)).toEqual([]);const text=serializeCampaign(f.w);expect(serializeCampaign(deserializeCampaign(text))).toBe(text);
});

test('first accounting opening includes an already retained terminal inventory but never transfers it to the child',()=>{
 const f=reorganizationCamp256(false),terminal=f.map.pawns.at(-1)!;addMaterial(f.map,'medicine',2,{type:'inventory',pawnId:terminal.id},'medicine');f.map.pawns.pop();terminal.health=createMedicalRecord(f.w.tick);terminal.health.bloodLoss=BLOOD_UNIT;reconcileMedicalDeath(terminal.health);terminal.state='dead';terminal.bedId=null;delete terminal.bedSlot;terminal.path=[];terminal.moveCooldown=0;terminal.planCooldown=0;terminal.orders={active:null,queue:[]};terminal.recreation.task=null;
 const items=f.map.piles.filter(p=>'pawnId'in p.owner&&p.owner.pawnId===terminal.id);f.map.piles=f.map.piles.filter(p=>!items.includes(p));refreshStock(f.map);
 const loss={groupId:f.g.id,tile:f.g.tile,tick:f.w.tick,pawn:terminal,items};f.w.worldGroups!.losses.push(loss);f.w.worldGroups!.lossContexts.push({groupId:f.g.id,originMapId:f.record.originMapId,context:f.record.context});f.g.baseline.medicine=2;flushRegisteredMap(f.map);expect(validateWorld(f.w)).toEqual([]);
 const plan=commit(split(f,1)),source=f.record.state as AwayGroup,child=plan.created[0]!.state as AwayGroup;expect(source.reorganization!.opening.medicine).toBe(2);expect(child.items.some(p=>p.item==='medicine')).toBe(false);expect(f.w.worldGroups!.losses[0]).toBe(loss);expect(f.w.worldGroups!.losses[0]!.items).toBe(items);expect(groupReorganizationBalance(source,source.reorganization!,f.w.worldGroups!.losses)).toBe(true);expect(validateWorld(f.w)).toEqual([]);
});

/** These prepared witnesses deliberately use a literal historical planet. */
function legacyPlanet(w:World){const p=w.planet;if(!p||p.revision===3)throw Error('Expected literal prepared planet');return p;}
