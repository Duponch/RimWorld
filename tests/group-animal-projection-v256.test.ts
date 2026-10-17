import {expect,test} from 'vitest';
import {reorganizationCamp256} from './helpers/group-reorganization-v256.ts';
import {registeredMap,flushRegisteredMap} from '../src/sim/world-map-context.ts';
import {registeredMapPresentation as rawRegisteredMapPresentation,campaignOnlySummary} from '../src/sim/world-map-presentation.ts';
import {validRegisteredPresentation,validCampaignSummary} from '../src/sim/world-map-projection-save.ts';
import {validProjectedAnimalLosses256} from '../src/sim/group-animal-projection-save-256.ts';
import {validGroupAnimalLossRecord256,registerGroupAnimalLossRows256} from '../src/sim/group-animal-save-256.ts';
import {captureActorBeds256} from '../src/sim/actor-bed-local-256.ts';
import {adultAgeTicks} from '../src/sim/animal-life.ts';
import {openGroupReorganization} from '../src/sim/group-reorganization-balance.ts';
import {refreshStock} from '../src/sim/materials.ts';
import {SnapshotEncoder,SnapshotDecoder} from '../src/bridge/snapshots.ts';
import {serializeCampaign,deserializeCampaign,validateWorld} from '../src/sim/index.ts';
import type {GroupAnimalLoss256} from '../src/sim/group-animal-state-256.ts';
import type {WildAnimal} from '../src/sim/wildlife-state.ts';
import type {MinifiedTreePile} from '../src/sim/tree-transfer-state.ts';
/** Declared physical checkpoints only: no acquisition, death or trip is
 * claimed as played by these preparations. Originals have one real owner. */
function registeredMapPresentation(w:Parameters<typeof rawRegisteredMapPresentation>[0]) {
 const view=rawRegisteredMapPresentation(w);
 assertRegistered(view);return view;
}
function assertRegistered(view:ReturnType<typeof rawRegisteredMapPresentation>):asserts view is NonNullable<typeof view>&{campaignMap:import('../src/sim/world-map-state.ts').CampaignMapPresentation} {
 if(!view||view.campaignMap?.revision!==2)throw Error('Prepared registered projection absent');
}
function registeredMeta(meta:import('../src/sim/types.ts').World['campaignMap']) {
 if(meta?.revision!==2)throw Error('Prepared registered metadata absent');return meta;
}
function mixed(){
 const f=reorganizationCamp256(),a:WildAnimal={id:f.w.nextId++,species:'muffalo',sex:'female',ageTicks:adultAgeTicks('muffalo'),x:f.members[0]!.x,z:f.members[0]!.z,food:1,rest:1,state:'idle',path:[],nextDecision:f.w.tick,domestic:{since:f.w.tick,care:'herbal',tameness:5,nextDecay:f.w.tick+6000,productFullness:0}};
 f.g.animalOwners={revision:1,members:[a],origins:[{pawnId:a.id,originMapId:f.record.originMapId,context:f.record.context}],order:[f.members[0]!.id,a.id,f.members[1]!.id]};
 f.g.items.push({id:f.w.nextId++,item:'hay',kind:'food',quantity:40,owner:{type:'inventory',pawnId:a.id},rot:{progress:0,atTick:f.w.tick}});
 f.g.reorganization=openGroupReorganization(f.g,[],f.w.tick,f.g.reorganization!.memberOrigins);
 return {...f,a};
}
function terminal(){
 const f=mixed(),origin=f.g.animalOwners!.origins[0]!,items=f.g.items.filter(p=>p.owner.type==='inventory'&&p.owner.pawnId===f.a.id);
 const loss:GroupAnimalLoss256={reason:'caravan-lost',groupId:f.g.id,tile:f.g.tile,tick:f.w.tick,animal:f.a,origin,items};
 // The humans and their original goods are prepared locally; the animal and
 // its real inventory are prepared terminally. No returned map is fabricated.
 const map=registeredMap(f.w,f.record.originMapId)!;
 map.pawns.push(...f.g.members);map.piles.push(...f.g.items.filter(p=>!items.includes(p)));
 f.w.worldGroups!.groups=[];f.w.worldGroups!.selectedGroupId=null;f.w.worldGroups!.animalLosses=[loss];
 refreshStock(map);flushRegisteredMap(map);return {...f,map,loss};
}
test('mixed projection publishes actual animal origins without inserting animals in human knowledge',()=>{
 const f=mixed();expect(validateWorld(f.w)).toEqual([]);
 const view=registeredMapPresentation(f.w)!;expect(validRegisteredPresentation(view)).toBe(true);
 const row=view.campaignMap!.groups[0]!,ids=row.memberContexts!.map(c=>c.pawnId);
 expect(ids).toEqual([...f.g.reorganization!.memberOrigins.map(o=>o.pawnId),f.a.id]);
 expect(view.campaignPeople!.some(p=>p.id===f.a.id)).toBe(false);
 expect(row.state).toBe(f.g);expect(captureActorBeds256(f.w).actors).toContain(f.a);
 const bad=structuredClone(view),witness=bad.campaignMap!.groups[0]!.memberContexts!.find(c=>c.pawnId===f.a.id)!;witness.context={...witness.context,width:64};
 expect(validRegisteredPresentation(bad)).toBe(false);
});
test('terminal projection keeps original personal/inventory owners and scalar origin, RAW exact roundtrip and bed metadata',()=>{
 const f=terminal();expect(validateWorld(f.w)).toEqual([]);
 const view=registeredMapPresentation(f.w)!,row=view.campaignMap!.animalLosses![0]!;
 expect(row.animal).toBe(f.a);expect(row.items[0]).toBe(f.loss.items[0]);expect(row.memberContext.context).toBe(f.loss.origin.context);
 expect(validRegisteredPresentation(view)).toBe(true);expect(view.campaignPeople!.some(p=>p.id===f.a.id)).toBe(false);
 expect(captureActorBeds256(f.w).actors).toContain(f.a);expect(view.campaignMap!.bedRefs).toEqual(captureActorBeds256(f.w).refs);
 const bytes=serializeCampaign(f.w);expect(serializeCampaign(deserializeCampaign(bytes))).toBe(bytes);
 const summary=campaignOnlySummary(f.w);expect(validCampaignSummary(summary)).toBe(true);expect(summary.people.some(p=>p.id===f.a.id)).toBe(false);
});
test('Decoder validates terminal clinical/header metadata before commit and preserves its prior frontier after malformed same-tick delta',()=>{
 const f=terminal(),encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();
 const first=decoder.adopt(structuredClone(encoder.encode(f.w,0,0)));expect(first.status,JSON.stringify(first)).toBe('applied');if(first.status!=='applied')throw Error('Missing actual confirmed baseline');
 const prior=JSON.stringify(first.world),tick=f.w.tick;f.map.events.push({tick,type:'command',message:'Prepared same-tick publication'});flushRegisteredMap(f.map);
 const source=structuredClone(encoder.encode(f.w,0,0));expect(source.kind).toBe('delta');expect(f.w.tick).toBe(tick);
 const clinical=structuredClone(source);registeredMeta(clinical.world.campaignMap).animalLosses![0]!.animal.food=NaN;
 expect(decoder.adopt(clinical).status).toBe('resync');
 const age=structuredClone(source);registeredMeta(age.world.campaignMap).animalLosses![0]!.items[0]!.rot!.atTick=f.w.tick+1;expect(decoder.adopt(age).status).toBe('resync');
 const origin=structuredClone(source),witness=registeredMeta(origin.world.campaignMap).animalLosses![0]!.memberContext;witness.context={...witness.context,width:64};expect(decoder.adopt(origin).status).toBe('resync');
 const collision=structuredClone(source);registeredMeta(collision.world.campaignMap).animalLosses![0]!.items[0]!.id=collision.world.pawns[0]!.id;expect(decoder.adopt(collision).status).toBe('resync');
 expect(JSON.stringify(first.world)).toBe(prior);expect(decoder.adopt(source).status).toBe('applied');
});
test('terminal projected field preserves literal absence and rejects old255, undefined, hidden and accessor data without invoking it',()=>{
 const f=terminal(),view=registeredMapPresentation(f.w)!,meta=view.campaignMap!;
 expect(validProjectedAnimalLosses256(meta,view)).toBe(true);
 const old=Object.assign({},view,{schemaVersion:255});expect(validProjectedAnimalLosses256(meta,old)).toBe(false);
 const absent={};expect(validProjectedAnimalLosses256(absent,view)).toBe(true);
 expect(validProjectedAnimalLosses256({animalLosses:undefined},view)).toBe(false);
 let reads=0;const accessor=Object.defineProperty({},'animalLosses',{enumerable:true,get(){reads++;return meta.animalLosses;}});
 expect(validProjectedAnimalLosses256(accessor,view)).toBe(false);expect(reads).toBe(0);
 const hidden=Object.defineProperty({},'animalLosses',{enumerable:false,value:meta.animalLosses});expect(validProjectedAnimalLosses256(hidden,view)).toBe(false);
});
test('terminal personal bounds follow its actual scalar200 origin rather than current32 header; no fake map is built',()=>{
 const f=terminal(),loss=structuredClone(f.loss);
 loss.origin={pawnId:loss.animal.id,originMapId:loss.origin.originMapId,context:{seed:7,width:200,height:200}};
 loss.animal.x=199;loss.animal.z=199;
 const header={tick:f.w.tick,nextId:f.w.nextId,planet:f.w.planet};
 expect(validGroupAnimalLossRecord256(loss,header,256,o=>o===loss.origin)).toBe(true);
 loss.animal.x=200;expect(validGroupAnimalLossRecord256(loss,header,256,o=>o===loss.origin)).toBe(false);
 loss.animal.x=199;expect(validGroupAnimalLossRecord256(loss,header,255,o=>o===loss.origin)).toBe(false);
});
test('terminal Thing namespace includes animal, real item, contained tree and package IDs, refusing a local collision',()=>{
 const f=terminal(),loss=structuredClone(f.loss),treeId=f.w.nextId++,wrapperId=f.w.nextId++,bedId=f.w.nextId++;
 const tree:MinifiedTreePile={id:wrapperId,item:'minified-tree',kind:'plant',quantity:1,owner:{type:'inventory',pawnId:loss.animal.id},innerResource:{id:treeId,kind:'tree',amount:40,x:0,z:0},plantPack:{packedAt:0,expiresAt:42000}};
 loss.items.push(tree);loss.packed=[{building:{id:bedId,kind:'bedroll',x:0,z:0,orientation:0,footprint:'standard',material:'cloth',quality:'normal'},owner:{type:'inventory',pawnId:loss.animal.id}}];
 // Namespace-only fixtures above are deliberately not a whole RAW validator oracle.
 const ids=new Set<number>();expect(registerGroupAnimalLossRows256([loss],f.w.nextId,ids)).toEqual([]);
 expect([...ids]).toEqual([loss.animal.id,...f.loss.items.map(p=>p.id),wrapperId,treeId,bedId]);
 const collision=new Set([treeId]);expect(registerGroupAnimalLossRows256([loss],f.w.nextId,collision).length).toBeGreaterThan(0);
});
