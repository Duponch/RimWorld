import {expect,test} from 'vitest';
import {deconstructionCamp} from './scenarios/deconstruction.ts';
import {registryCamp,preparedMap} from './helpers/world-maps-v255.ts';
import {reorganizationCamp256} from './helpers/group-reorganization-v256.ts';
import {newShelfStorage} from '../src/sim/shelf-storage.ts';
import {cloneLinkedShelfPolicy286} from '../src/sim/linked-storage-policy-286.ts';
import {captureLinkedStorageOwners286} from '../src/sim/linked-storage-owners-286.ts';
import {validLinkedShelfField286,validLinkedStorageRegistryShape286,validLinkedStorageHistorical286,validLinkedStorageWorld286,validLinkedStorageProjection286} from '../src/sim/linked-storage-save-286.ts';
import {deserializeCampaign,serializeCampaign,validateWorld,validateCampaignSchema285} from '../src/sim/serialization.ts';
import {initialWorldRegistry,registeredMapId,flushRegisteredMap} from '../src/sim/world-map-context.ts';
import {registeredMapPresentation} from '../src/sim/world-map-presentation.ts';
import {newCryptosleepHolder271,type PlayerCasket271} from '../src/sim/cryptosleep-state-271.ts';
import {SnapshotEncoder,SnapshotDecoder} from '../src/bridge/snapshots.ts';
import {ResidentPresentationAssembler} from '../src/bridge/resident-presentation-assembler.ts';
import {SCHEMA_VERSION,type Structure,type World} from '../src/sim/types.ts';

function shelf(w:World,x:number,z:number,small=false):Structure {
 const s:Structure={id:w.nextId++,kind:small?'small-shelf':'shelf',x,z,orientation:0,footprint:'standard',material:'wood',shelf:newShelfStorage(Array.from({length:small?1:2},()=>w.nextId++))};w.structures.push(s);return s;
}
/** Declared linked state at the save boundary. Gameplay tests own creation;
 * this fixture does not claim a paid construction or played link command. */
function linked(w:World,buildings:readonly Structure[],origin=registeredMapId(w)??0):void {
 const policy=cloneLinkedShelfPolicy286(buildings[0]!.shelf!.settings);
 w.linkedStorage286={revision:1,nextId:2,groups:[{id:1,originMapId:origin,name:'Réserves',settings:policy,memberIds:buildings.map(s=>s.id)}]};
 for(const s of buildings){const independent=cloneLinkedShelfPolicy286(s.shelf!.settings);s.shelf!.settings=cloneLinkedShelfPolicy286(policy);s.shelf!.linked286={revision:1,groupId:1,independent};}
}
function prepared(){const w=deconstructionCamp(3);initialWorldRegistry(w);const a=shelf(w,17,18),b=shelf(w,17,21,true);b.shelf!.settings.priority=5;linked(w,[a,b]);return {w,a,b};}

test('linked member and registry shapes close versions, descriptors, identity ranges and exact optional policy presence',()=>{
 const {w,a}=prepared(),registry=w.linkedStorage286!;expect(validLinkedStorageRegistryShape286(registry,286,w.nextId)).toBe(true);
 expect(validLinkedStorageRegistryShape286(registry,285,w.nextId)).toBe(false);expect(validLinkedStorageRegistryShape286(registry,SCHEMA_VERSION,w.nextId)).toBe(true);expect(validLinkedStorageRegistryShape286(registry,SCHEMA_VERSION+1,w.nextId)).toBe(false);
 expect(validLinkedShelfField286(a.shelf,286)).toBe(true);expect(validLinkedShelfField286(a.shelf,285)).toBe(false);
 for(const change of [(r:typeof registry)=>{r.groups[0]!.memberIds.pop();},(r:typeof registry)=>{r.nextId=1;},(r:typeof registry)=>{r.groups[0]!.name='x\n';},(r:typeof registry)=>{r.groups[0]!.memberIds[1]=r.groups[0]!.memberIds[0]!;},(r:typeof registry)=>{Object.assign(r.groups[0]!.settings,{allowFresh:undefined});}]){const bad=structuredClone(registry);change(bad);expect(validLinkedStorageRegistryShape286(bad,286,w.nextId)).toBe(false);}
 let reads=0;const bad=structuredClone(a.shelf!);Object.defineProperty(bad,'linked286',{enumerable:true,get(){reads++;throw Error('No getter');}});expect(validLinkedShelfField286(bad,286)).toBe(false);expect(reads).toBe(0);
 const undefinedLink=structuredClone(a.shelf!);Object.defineProperty(undefinedLink,'linked286',{value:undefined,enumerable:true});expect(validLinkedShelfField286(undefinedLink,286)).toBe(false);
});

test('historical fences reject future linked state through packed holders and sparse structure upserts without reads or mutation',()=>{
 const {a}=prepared(),p={building:a,owner:{type:'inventory',pawnId:1}};
 const envelopes=[{structures:[a]},{packed:[p]},{worldMaps:{sites:[{map:{packed:[p]}}]}},{worldGroups:{groups:[{state:{packed:[p]}}],abandonedContents:[{humans:[{packed:[p]}]}]}},{worldPawns:{owners:[{packed:[p]}],heldPlayerCaskets271:[{casket:{cryptosleep:{packed:[p]}}}]}},{world:{schemaVersion:285},structures:{removed:[],upserted:[a],order:[a.id]}}];
 for(const raw of envelopes){const before=JSON.stringify(raw);expect(validLinkedStorageHistorical286(raw,285)).toBe(false);expect(validLinkedStorageHistorical286(raw,286)).toBe(true);expect(validLinkedStorageHistorical286(raw,SCHEMA_VERSION)).toBe(true);expect(validLinkedStorageHistorical286(raw,SCHEMA_VERSION+1)).toBe(false);expect(JSON.stringify(raw)).toBe(before);}
 expect(validLinkedStorageHistorical286({linkedStorage286:undefined},285)).toBe(false);
 let reads=0;const raw={};Object.defineProperty(raw,'linkedStorage286',{enumerable:true,get(){reads++;throw Error('Historical getter');}});expect(validLinkedStorageHistorical286(raw,285)).toBe(false);expect(reads).toBe(0);
});

test('complete save keeps same furniture, physical cells, hidden policy and clocks with no aliases or repair',()=>{
 const {w,a,b}=prepared(),before=JSON.stringify(w),ids=[a.id,...a.shelf!.cells,b.id,...b.shelf!.cells],clock=[w.tick,w.rng,w.nextId];
 expect(validLinkedStorageWorld286(w)).toBe(true);expect(validateWorld(w)).toEqual([]);
 const copy=deserializeCampaign(serializeCampaign(w)) as World;expect(copy).toEqual(w);expect(JSON.stringify(w)).toBe(before);expect([w.tick,w.rng,w.nextId]).toEqual(clock);
 expect(copy.structures.flatMap(s=>[s.id,...s.shelf?.cells??[]])).toEqual(ids);
 expect(copy.structures[1]!.shelf!.linked286!.independent.priority).toBe(5);expect(copy.structures[1]!.shelf!.settings.priority).toBe(3);
 expect(copy.structures[0]!.shelf!.settings.filters).not.toBe(copy.linkedStorage286!.groups[0]!.settings.filters);
});

test('RAW rejects missing originals, divergent effective policy, wrong group and mutable policy alias',()=>{
 const {w}=prepared();
 for(const change of [(v:World)=>{v.structures.pop();},(v:World)=>{v.structures[1]!.shelf!.settings.priority=4;},(v:World)=>{v.structures[0]!.shelf!.linked286!.groupId=2;},(v:World)=>{v.structures[0]!.shelf!.linked286!.independent=v.structures[0]!.shelf!.settings;},(v:World)=>{v.linkedStorage286!.groups[0]!.originMapId=999999;}]){
  const bad=structuredClone(w);change(bad);const before=JSON.stringify(bad);expect(validLinkedStorageWorld286(bad)).toBe(false);expect(JSON.stringify(bad)).toBe(before);
 }
 const noRegistry=structuredClone(w);delete noRegistry.linkedStorage286;expect(validLinkedStorageWorld286(noRegistry)).toBe(false);
});

test('partial transport accepts absent physical members but refuses disagreement of its actual present originals',()=>{
 const {w,a}=prepared(),partial={...w,structures:[a],packed:[]};
 expect(validLinkedStorageProjection286(partial)).toBe(true);expect(validLinkedStorageWorld286(partial)).toBe(false);
 const bad=structuredClone(partial);bad.structures[0]!.shelf!.settings.allowFresh=false;expect(validLinkedStorageProjection286(bad)).toBe(false);
 const origin=structuredClone(partial);origin.linkedStorage286!.groups[0]!.originMapId=99999;expect(validLinkedStorageProjection286(origin)).toBe(false);
});

test('census follows original caravan and colony-casket packs without inventing a nested Pawn inventory',()=>{
 const {w,map,g}=reorganizationCamp256(),a=shelf(map,8,8),b=shelf(map,8,11,true),c=shelf(map,8,14,true);
 linked(w,[a,b,c],registeredMapId(map)!);const holderPawn=map.pawns.pop();if(!holderPawn)throw Error('Prepared third original casket human missing');
 // Prepared custody only, as the existing holder-boundary fixtures. This is
 // not proof of paid casket construction, entry or complete clinical admission.
 const holder=newCryptosleepHolder271(w.tick);holder.human=holderPawn;
 const casket:PlayerCasket271={id:w.nextId++,kind:'cryptosleep-casket',x:10,z:10,orientation:0,footprint:'standard',material:'steel',cryptosleep:holder};
 const packA={building:a,owner:{type:'inventory' as const,pawnId:g.members[0]!.id}},packB={building:b,owner:{type:'inventory' as const,pawnId:holderPawn.id}};
 map.structures=map.structures.filter(s=>s!==a&&s!==b);map.structures.push(casket);g.packed=[...g.packed??[],packA];holder.packed.push(packB);flushRegisteredMap(map);
 const census=captureLinkedStorageOwners286(w);expect(census.valid).toBe(true);expect(census.members).toHaveLength(3);
 expect(census.byId.get(a.id)).toMatchObject({building:a,packed:packA,installed:false,holderKind:'caravan',holder:g});
 expect(census.byId.get(b.id)).toMatchObject({building:b,packed:packB,installed:false,holderKind:'player-casket',holder});expect(census.byId.get(c.id)!.installed).toBe(true);
 expect(validLinkedStorageWorld286(w,census)).toBe(true);expect(census.current()).toBe(true);packA.owner={...packA.owner};expect(census.current()).toBe(false);
});

test('registered-map census ignores noncustody grids and enforces origin only for installed shelves',()=>{
 const root=registryCamp(),remote=preparedMap(root),a=shelf(root,8,8),b=shelf(remote,8,8,true);linked(root,[a,b]);flushRegisteredMap(remote);
 expect(validLinkedStorageWorld286(root)).toBe(false);
 remote.structures=remote.structures.filter(s=>s!==b);remote.packed.push({building:b,owner:{type:'ground',x:10,z:8}});flushRegisteredMap(remote);
 let reads=0;const body=root.worldMaps!.sites.find(s=>s.id===registeredMapId(remote))!.map!;
 for(const key of ['tiles','resources','home','roofing','snow','thermal'])if(Object.hasOwn(body,key))Object.defineProperty(body,key,{enumerable:true,configurable:true,get(){reads++;throw Error('No noncustody read');}});
 expect(validLinkedStorageWorld286(root)).toBe(true);expect(reads).toBe(0);
});

test('same-tick policy and sparse structure delta adopt together or retain the previous public and resident state',()=>{
 const {w}=prepared(),encoder=new SnapshotEncoder({structureDelta:true,minimumStructures:0}),decoder=new SnapshotDecoder(),resident=new ResidentPresentationAssembler();
 const opening=structuredClone(encoder.encode(w,0,0));expect(decoder.adopt(structuredClone(opening)).status).toBe('applied');expect(resident.adopt(structuredClone(opening)).status).toBe('applied');
 w.linkedStorage286!.groups[0]!.settings.priority=4;for(const s of w.structures)s.shelf!.settings.priority=4;
 const good=structuredClone(encoder.encode(w,0,0));expect(good.kind).toBe('delta');
 const bad=structuredClone(good);bad.world.linkedStorage286!.groups[0]!.settings.priority=5;
 expect(decoder.adopt(structuredClone(bad)).status).toBe('resync');expect(resident.adopt(structuredClone(bad)).status).toBe('resync');
 expect(decoder.adopt(structuredClone(good)).status).toBe('applied');expect(resident.adopt(structuredClone(good)).status).toBe('applied');
});

test('strict285 migration changes only the version and first registry birth reaches an already cached real map presentation',()=>{
 const w=deconstructionCamp(2);initialWorldRegistry(w);w.schemaVersion=285 as World['schemaVersion'];const before=JSON.parse(JSON.stringify(w));
 expect(validateCampaignSchema285(w)).toEqual([]);expect(deserializeCampaign(JSON.stringify(w))).toEqual({...before,schemaVersion:SCHEMA_VERSION});expect(JSON.parse(JSON.stringify(w))).toEqual(before);
 w.schemaVersion=SCHEMA_VERSION;const opening=registeredMapPresentation(w)!;expect(Object.hasOwn(opening,'linkedStorage286')).toBe(false);
 const a=shelf(w,17,18),b=shelf(w,17,21,true);linked(w,[a,b]);const next=registeredMapPresentation(w)!;
 expect(next).toBe(opening);expect(next.linkedStorage286).toBe(w.linkedStorage286);expect(validLinkedStorageProjection286(next)).toBe(true);
});
