import {expect,test} from 'vitest';
import {deconstructionCamp} from './scenarios/deconstruction.ts';
import {newShelfStorage} from '../src/sim/shelf-storage.ts';
import {cloneLinkedShelfPolicy286} from '../src/sim/linked-storage-policy-286.ts';
import {prepareLinkedStorageMapRemoval286,type LinkedStorageMapRemovalResult286} from '../src/sim/linked-storage-map-removal-286.ts';
import {prepareCampMapRemoved256} from '../src/sim/world-pawn-map-removed-256.ts';
import {beginHeldCasketRemoval259} from '../src/sim/world-pawn-casket-259.ts';
import {initialWorldRegistry,registeredMap} from '../src/sim/world-map-context.ts';
import {flushRegisteredMap} from '../src/sim/world-map-context.ts';
import {registryCamp,preparedMap} from './helpers/world-maps-v255.ts';
import {prepareLinkedStorageCommand286} from '../src/sim/linked-storage-plan-286.ts';
import {abandonRegisteredMap} from '../src/sim/world-map-authority.ts';
import {captureStandability} from '../src/sim/furniture-travel.ts';
import {terrainSupportsAffordance256} from '../src/sim/natural-terrain-runtime-256.ts';
import {deserializeCampaign,serializeCampaign,validateWorld} from '../src/sim/serialization.ts';
import {registeredMapPresentation} from '../src/sim/world-map-presentation.ts';
import {SnapshotEncoder,SnapshotDecoder} from '../src/bridge/snapshots.ts';
import {ResidentPresentationAssembler} from '../src/bridge/resident-presentation-assembler.ts';
import type {Structure,World} from '../src/sim/types.ts';

/** Explicit cold-owner preparation on an actual small classic colony. Tests
 * exercise admission/membership receipts, not a played trip or paid building.
 * No geographic MapRemoved, WorldPawn birth or browser result is claimed. */
function prepared(groundThird=true){
 const root=deconstructionCamp(2);root.stockpiles=[];root.growingZones=[];root.packed=[];
 const add=(x:number):Structure=>{const s:Structure={id:root.nextId++,kind:'small-shelf',x,z:10,orientation:0,footprint:'standard',material:'wood',shelf:newShelfStorage([root.nextId++])};root.structures.push(s);return s;};
 const a=add(10),b=add(14),c=add(18),policy=cloneLinkedShelfPolicy286(a.shelf!.settings);policy.priority=5;
 root.linkedStorage286={revision:1,nextId:2,groups:[{id:1,originMapId:0,name:'Même origine',settings:cloneLinkedShelfPolicy286(policy),memberIds:[a.id,b.id,c.id]}]};
 for(const s of [a,b,c]){s.shelf!.linked286={revision:1,groupId:1,independent:cloneLinkedShelfPolicy286(s.shelf!.settings)};s.shelf!.settings=cloneLinkedShelfPolicy286(policy);}
 root.structures=root.structures.filter(s=>s!==b&&s!==c);
 const bPack={building:b,owner:{type:'inventory' as const,pawnId:root.pawns[0]!.id}},cPack={building:c,owner:groundThird?{type:'ground' as const,x:18,z:10}:{type:'inventory' as const,pawnId:root.pawns[1]!.id}};
 root.packed.push(bPack,cPack);initialWorldRegistry(root);const map=registeredMap(root,0)!;
 return {root,map,a,b,c,bPack,cPack};
}
const ready=(result:LinkedStorageMapRemovalResult286)=>{if(!result.ok)throw Error(result.reason);return result.plan;};

test('preflight separates lost installed/ground shelves from the same inventory survivor, without mutation',()=>{
 const f=prepared(),before=JSON.stringify(f.root),rng=f.root.rng,nextId=f.root.nextId;
 const plan=ready(prepareLinkedStorageMapRemoval286(f.root,f.map,0,new Set()));
 expect(plan.lostIds).toEqual([f.a.id,f.c.id]);expect(plan.current()).toBe(true);expect(JSON.stringify(f.root)).toBe(before);
 const projected=plan.projectPacked([f.bPack]);expect(projected[0]!.building.shelf!.linked286).toBeUndefined();expect(f.b.shelf!.linked286).toBeDefined();expect(projected[0]!.building).not.toBe(f.b);
 plan.begin();expect(plan.current()).toBe(false);expect(plan.beforeWrites()).toBe(true);plan.commit();
 expect(plan.afterWrites()).toBe(true);expect(f.root.linkedStorage286!.groups).toEqual([]);expect(f.b.shelf!.linked286).toBeUndefined();expect(f.b.shelf!.settings.priority).toBe(5);expect(f.root.rng).toBe(rng);expect(f.root.nextId).toBe(nextId);
});

test('two retained packed originals keep their group and effective policies when the installed member is lost',()=>{
 const f=prepared(false),b=f.b.shelf!.settings,c=f.c.shelf!.settings,plan=ready(prepareLinkedStorageMapRemoval286(f.root,f.map,0,new Set()));
 expect(plan.lostIds).toEqual([f.a.id]);plan.begin();plan.commit();expect(f.root.linkedStorage286!.groups[0]!.memberIds).toEqual([f.b.id,f.c.id]);
 expect(f.b.shelf!.linked286?.groupId).toBe(1);expect(f.c.shelf!.linked286?.groupId).toBe(1);expect(f.b.shelf!.settings).toBe(b);expect(f.c.shelf!.settings).toBe(c);
});

test('the explicit preflight drop set marks that same packed original lost without restoring an old private policy',()=>{
 const f=prepared(false),plan=ready(prepareLinkedStorageMapRemoval286(f.root,f.map,0,new Set([f.b.id])));
 expect(plan.lostIds).toEqual([f.a.id,f.b.id]);plan.begin();plan.commit();expect(f.c.shelf!.linked286).toBeUndefined();expect(f.c.shelf!.settings.priority).toBe(5);expect(f.root.linkedStorage286!.nextId).toBe(2);
});

test('same-value holder replacement after preparation is stale before admission and changes no policy',()=>{
 const f=prepared(),plan=ready(prepareLinkedStorageMapRemoval286(f.root,f.map,0,new Set()));
 f.root.packed[0]=structuredClone(f.bPack);const changed=JSON.stringify(f.root);expect(plan.current()).toBe(false);expect(()=>plan.begin()).toThrow();expect(JSON.stringify(f.root)).toBe(changed);expect(f.b.shelf!.linked286).toBeDefined();
});

test('an immutable singleton recipient refuses the whole preflight before IDs, RNG or a lost member change',()=>{
 const f=prepared();Object.defineProperty(f.b.shelf!,'linked286',{...Object.getOwnPropertyDescriptor(f.b.shelf!,'linked286')!,configurable:false});const before=JSON.stringify(f.root);
 const result=prepareLinkedStorageMapRemoval286(f.root,f.map,0,new Set());expect(result.ok).toBe(false);expect(JSON.stringify(f.root)).toBe(before);expect(f.a.shelf!.linked286).toBeDefined();
});

test('mutating the private desired receipt after begin cannot bless different registry writes',()=>{
 const f=prepared(false),plan=ready(prepareLinkedStorageMapRemoval286(f.root,f.map,0,new Set()));plan.begin();const before=JSON.stringify(f.root);
 const write=plan.writes.find(w=>w.object===f.root&&w.key==='linkedStorage286')!;Reflect.set(write.value as object,'nextId',99);
 expect(plan.beforeWrites()).toBe(false);expect(()=>plan.commit()).toThrow();expect(JSON.stringify(f.root)).toBe(before);
});

test('the current classic archive path admits shelf phases without creating WorldPawns or factions',()=>{
 const f=prepared(),pawns=f.root.worldPawns,factions=f.root.worldFactions,before=JSON.stringify(f.root),pass=prepareCampMapRemoved256(f.root,f.map,0,false);
 expect(pass.ok,pass.ok?'':pass.reason).toBe(true);if(!pass.ok)return;expect(pass.current()).toBe(true);expect(JSON.stringify(f.root)).toBe(before);
 const phase=beginHeldCasketRemoval259(f.map,pass);expect(phase).toBeDefined();phase!.areas();expect(f.root.worldPawns).toBe(pawns);expect(f.root.worldFactions).toBe(factions);expect(f.b.shelf!.linked286).toBeDefined();
 // This is a phase-admission test. The full authority still owns actual
 // detach/archive/retired-origin publication and its separate qualification.
});

test('actual legacy-site abandonment without humans retains its generated animal and two transferred original packs without WorldPawns',()=>{
 // Declared preparation: the existing registry fixture adopts its own globe;
 // preparedMap generates real map1 at tile52 without moving a person. Three
 // shelves are authored on supported free cells, then linked by the real plan.
 // B/C packing and transfer to the existing humans on map0 are explicit cold
 // preparation, not played construction, uninstalling, hauling or travel.
 // The generated living animal remains on map1, with its original identity;
 // the actual authority below archives it during complete abandonment.
 const root=registryCamp(),home=registeredMap(root,0)!,remote=preparedMap(root,52,'legacy-site',false);
 const record=root.worldMaps!.sites.find(s=>s.id===1)!;
 expect(record.kind).toBe('legacy-site');expect(remote.pawns).toEqual([]);
 const animals=[...remote.wildlife?.animals??[]];expect(animals).toHaveLength(1);expect(animals[0]!.state).not.toBe('dead');
 expect(Object.hasOwn(root,'worldPawns')).toBe(false);
 const stands=captureStandability(remote),occupied=new Set([...remote.structures,...remote.resources,...remote.jobs,...remote.piles.flatMap(p=>p.owner.type==='ground'?[p.owner]:[])].map(c=>c.z*remote.width+c.x));
 const shelves:Structure[]=[];
 for(let z=2;z<remote.height-2&&shelves.length<3;z++)for(let x=2;x<remote.width-2&&shelves.length<3;x++){
  const cell={x,z},key=z*remote.width+x;
  if(occupied.has(key)||!stands(cell)||!terrainSupportsAffordance256(remote.tiles[key]!,'Medium',remote))continue;
  const shelf:Structure={id:remote.nextId++,kind:'small-shelf',x,z,orientation:0,footprint:'standard',material:'wood',shelf:newShelfStorage([remote.nextId++],286)};
  remote.structures.push(shelf);shelves.push(shelf);occupied.add(key);
 }
 expect(shelves).toHaveLength(3);const [a,b,c]=shelves as [Structure,Structure,Structure];a.shelf!.settings.priority=5;
 flushRegisteredMap(remote);
 const link=prepareLinkedStorageCommand286(remote,{type:'shelf-link',structureIds:[a.id,b.id,c.id]});
 expect(link.ok,link.ok?'':link.reason).toBe(true);if(!link.ok)throw Error(link.reason);expect(link.commit()).toBe(true);
 const bPack={building:b,owner:{type:'inventory' as const,pawnId:home.pawns[0]!.id}},cPack={building:c,owner:{type:'inventory' as const,pawnId:home.pawns[1]!.id}};
 remote.structures=remote.structures.filter(s=>s!==b&&s!==c);home.packed.push(bPack,cPack);flushRegisteredMap(remote);flushRegisteredMap(home);
 expect(validateWorld(root)).toEqual([]);
 const rng=root.rng,nextId=root.nextId,encoder=new SnapshotEncoder({structureDelta:true,minimumStructures:0}),decoder=new SnapshotDecoder(),resident=new ResidentPresentationAssembler();
 const opening=structuredClone(encoder.encode(root,0,0));expect(decoder.adopt(structuredClone(opening)).status).toBe('applied');expect(resident.adopt(structuredClone(opening)).status).toBe('applied');
 const result=abandonRegisteredMap(root,1,true);expect(result.ok,result.reason).toBe(true);
 const archive=root.worldGroups!.abandonedContents.find(a=>a.mapId===1)!;
 expect(archive.animals).toHaveLength(animals.length);for(const animal of animals)expect(archive.animals.find(r=>r.animal.id===animal.id)!.animal).toBe(animal);
 expect(registeredMap(root,1)).toBeUndefined();expect(root.worldMaps!.sites.map(s=>s.id)).toEqual([0]);
 expect(root.worldMaps!.retired.find(s=>s.id===1)).toMatchObject({id:1,tile:record.tile,kind:'legacy-site',createdAt:record.createdAt,removedAt:root.tick,reason:'abandon'});
 expect(root.linkedStorage286!.groups[0]).toMatchObject({originMapId:1,memberIds:[b.id,c.id],settings:{priority:5}});
 expect(root.packed.find(p=>p.building.id===b.id)).toBe(bPack);expect(root.packed.find(p=>p.building.id===c.id)).toBe(cPack);
 expect(bPack.building).toBe(b);expect(cPack.building).toBe(c);expect([b.shelf!.settings.priority,c.shelf!.settings.priority]).toEqual([5,5]);
 expect(Object.hasOwn(root,'worldPawns')).toBe(false);expect([root.rng,root.nextId]).toEqual([rng,nextId]);expect(validateWorld(root)).toEqual([]);
 const raw=serializeCampaign(root),copy=deserializeCampaign(raw);expect(serializeCampaign(copy)).toBe(raw);expect(validateWorld(copy)).toEqual([]);
 if(!('pawns'in copy))throw Error('The surviving original map0 must remain loaded');
 const expected=structuredClone(registeredMapPresentation(root)!);
 if(expected.campaignMap?.revision!==2)throw Error('The current registered map publication is required');
 expect(expected.campaignMap!.maps.map(m=>m.id)).toEqual([0]);
 expect(expected.campaignMap!.worldPawnOrigins).toEqual([{mapId:1,tile:record.tile,removedAt:root.tick}]);
 expect(Object.hasOwn(expected,'worldPawns')).toBe(false);expect(registeredMapPresentation(copy as World)).toEqual(expected);
 const packet=structuredClone(encoder.encode(root,0,0));expect(packet.kind).toBe('delta');
 const adopted=decoder.adopt(structuredClone(packet)),shown=resident.adopt(structuredClone(packet));
 expect(adopted.status).toBe('applied');expect(shown.status).toBe('applied');
 if(adopted.status!=='applied'||shown.status!=='applied')throw Error('The same retired-origin candidate must be adopted by both readers');
 expect(adopted.world).toEqual(expected);expect(shown.world).toEqual(expected);
});
