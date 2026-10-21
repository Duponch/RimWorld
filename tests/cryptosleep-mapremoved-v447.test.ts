import {expect,test} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {deserializeCampaign,serializeCampaign,validateWorld} from '../src/sim/serialization.ts';
import {registeredMap,registeredMapId,flushRegisteredMap} from '../src/sim/world-map-context.ts';
import {prepareMapRemoved259} from '../src/sim/world-pawn-map-removed-259.ts';
import {detachMapOwners} from '../src/sim/world-lost-owners.ts';
import {abandonRegisteredMap,removeEmptyCamps,mapChoices} from '../src/sim/world-map-authority.ts';
import {captureWorldPawnHumans256} from '../src/sim/world-pawn-human-capture-256.ts';
import {heldCasketGCUnknown259} from '../src/sim/world-pawn-casket-membership-259.ts';
import {validWorldPawnsEnvelope256} from '../src/sim/world-pawn-save-256.ts';
import {newCryptosleepHolder271,isPlayerCasket271,type PlayerCasket271} from '../src/sim/cryptosleep-state-271.ts';
import {validateCryptosleepOwners271,registerCryptosleepThingIds271} from '../src/sim/cryptosleep-owner-save-271.ts';
import {validateHeldPlayerCaskets271} from '../src/sim/world-pawn-player-casket-271.ts';
import {validateTreeTransport,registerTreeThingIds} from '../src/sim/tree-transfer-save.ts';
import {validOriginalTreeResource} from '../src/sim/tree-transfer-resource-save.ts';
import {extractTreeDefinition} from '../src/sim/tree-transfer-rules.ts';
import {TREE_PACK_LIFETIME,type MinifiedTreePile} from '../src/sim/tree-transfer-state.ts';
import {PLANT_LIFE_INTERVAL} from '../src/sim/plant-life.ts';
import {releaseWork} from '../src/sim/work-release.ts';
import {researchCost,CRYPTOSLEEP_RESEARCH_COST271} from '../src/sim/research.ts';
import {terrainSupportsAffordance256} from '../src/sim/natural-terrain-runtime-256.ts';
import {footprintCells} from '../src/sim/definitions.ts';
import {registeredMapPresentation} from '../src/sim/world-map-presentation.ts';
import {SnapshotEncoder,SnapshotDecoder} from '../src/bridge/snapshots.ts';
import type {MaterialPile,Structure,World} from '../src/sim/types.ts';

const acquired='tmp/test-runs/caravan-owners-v414-departure-expiry01-2026-10-17T19-08-08.417Z-26072/artifacts/caravan-owners-v259/actual259-paused2905-before-abandon-refusal.json';
const sha='5ff387667bb3933d4b3957c65dd9516c4c3470e13d3c888b2a917878f9778525';
let preparedText:string|undefined;
/** Reuse the actual acquired two-map campaign; no new globe, journey or five-
 * colony scenario. The recovered casket/bed, completed prerequisite research,
 * five wood and one packed bed are DECLARED owner-boundary preparation. This
 * test claims no casket construction or500-Core admission acquisition. */
function prepared(){
 if(!preparedText){
  const raw=readFileSync(acquired,'utf8');expect(createHash('sha256').update(raw).digest('hex')).toBe(sha);
  const root=deserializeCampaign(raw);if(!('pawns'in root))throw Error('Actual loaded settlement required');
  const map=registeredMap(root,0)!,p=map.pawns.find(q=>q.id===8)!;expect(p.name).toBe('Éloïse');
  const occupied=new Set([...map.structures.flatMap(footprintCells),...map.resources].map(v=>v.z*map.width+v.x));
  let origin:{x:number;z:number}|undefined;
  for(let z=Math.max(1,p.z-12);z<Math.min(map.height-4,p.z+12)&&!origin;z++)for(let x=Math.max(1,p.x-12);x<Math.min(map.width-4,p.x+12)&&!origin;x++){
   const cells=Array.from({length:16},(_,i)=>({x:x+i%4,z:z+Math.floor(i/4)}));
   if(cells.every(c=>!occupied.has(c.z*map.width+c.x)&&!['rock','water'].includes(map.tiles[c.z*map.width+c.x]!.terrain)&&terrainSupportsAffordance256(map.tiles[c.z*map.width+c.x]!,'Medium',map)))origin={x,z};
  }
  if(!origin)throw Error('Declared fixture needs real unoccupied supported floor near the actual colonist');
  const bed:Structure={id:map.nextId++,kind:'bed',x:origin.x+2,z:origin.z+2,orientation:0,footprint:'standard',material:'wood',quality:'normal'};
  const c:PlayerCasket271={id:map.nextId++,kind:'cryptosleep-casket',...origin,orientation:0,footprint:'standard',material:'steel',cryptosleep:newCryptosleepHolder271(map.tick)};
  if(!releaseWork(map,p))throw Error('Actual fixture colonist cargo cannot be released');
  delete p.motion;p.path=[];p.moveCooldown=0;p.planCooldown=0;p.need=null;p.cryptosleepHeldAt271=map.tick;p.bedId=bed.id;p.mapBed={revision:1,mapId:registeredMapId(map)!,bedId:bed.id};
  const items:MaterialPile[]=map.piles.filter(i=>'pawnId'in i.owner&&i.owner.pawnId===p.id&&['inventory','equipment','apparel'].includes(i.owner.type));
  items.push({id:map.nextId++,kind:'wood',item:'wood',quantity:5,owner:{type:'inventory',pawnId:p.id}});
  c.cryptosleep.human=p;c.cryptosleep.items=items;c.cryptosleep.packed=[{building:{id:map.nextId++,kind:'bed',x:origin.x+3,z:origin.z+3,orientation:0,footprint:'standard',material:'wood',quality:'normal'},owner:{type:'inventory',pawnId:p.id}}];
  map.pawns=map.pawns.filter(q=>q!==p);map.piles=map.piles.filter(i=>!items.includes(i));map.structures=[...map.structures,bed,c];
  root.research={...root.research!,project:null,smithing:{points:researchCost('smithing'),completedAt:0},machining:{points:researchCost('machining'),completedAt:0},microelectronics:{points:researchCost('microelectronics'),completedAt:0},multiAnalyzer:{points:researchCost('multi-analyzer'),completedAt:0},cryptosleep:{points:CRYPTOSLEEP_RESEARCH_COST271,completedAt:0}};
  flushRegisteredMap(map);expect(validateCryptosleepOwners271(map)).toEqual([]);expect(validateWorld(root)).toEqual([]);preparedText=serializeCampaign(root);
 }
 const root=deserializeCampaign(preparedText);if(!('pawns'in root))throw Error('Actual settlement required');const map=registeredMap(root,0)!,c=map.structures.find(isPlayerCasket271)!;
 return {root,map,c,p:c.cryptosleep.human!};
}
function abandon(){const result=prepared(),r=abandonRegisteredMap(result.root,0,true);expect(r.ok,r.reason).toBe(true);return result;}

/** Declared boxing/holder preparation over one actual acquired tree. Its
 * original Resource and dates remain unchanged; no extraction is claimed. */
function containedTree(){
 const f=prepared(),source=f.map.resources.find(r=>extractTreeDefinition(r)&&validOriginalTreeResource(r,f.map,271,f.map.tick)&&!f.map.jobs.some(j=>j.x===r.x&&j.z===r.z));
 if(!source)throw Error('The acquired map needs one real unclaimed tree for the declared holder fixture');
 const tree:MinifiedTreePile={id:f.map.nextId++,kind:'plant',item:'minified-tree',quantity:1,owner:{type:'inventory',pawnId:f.p.id},innerResource:source,plantPack:{packedAt:f.map.tick,expiresAt:f.map.tick+TREE_PACK_LIFETIME}};
 f.map.resources=f.map.resources.filter(r=>r!==source);f.c.cryptosleep.items.push(tree);flushRegisteredMap(f.map);
 // The acquired checkpoint was still displaying its camp. Publish the actual
 // holder's map here so full/delta guards exercise this local tree as well.
 f.root.worldMaps!.selectedMapId=registeredMapId(f.map)!;
 expect(validateWorld(f.root)).toEqual([]);return {...f,tree,source};
}
function publicExact(root:ReturnType<typeof prepared>['root']){
 const encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder(),view=registeredMapPresentation(root)!;
 const first=decoder.adopt(structuredClone(encoder.encode(root,0,0,true)));expect(first.status).toBe('applied');if(first.status==='applied')expect(first.world).toEqual(view);
 const delta=encoder.encode(root,0,0);expect(delta.kind).toBe('delta');const second=decoder.adopt(structuredClone(delta));expect(second.status).toBe('applied');if(second.status==='applied')expect(second.world).toEqual(view);
}
function refuseTreeCollision(root:ReturnType<typeof prepared>['root'],retained:boolean,treeId:number,innerId:number){
 const view=registeredMapPresentation(root)!,other=view.resources.find(r=>r.id!==innerId&&(r.id-innerId)%PLANT_LIFE_INTERVAL===0);
 if(!other)throw Error('The actual namespace needs an existing Resource with the same plant clock phase');
 const holder=(w:World)=>retained?w.worldPawns!.heldPlayerCaskets271![0]!.casket:w.structures.find(isPlayerCasket271)!;
 const mutate=(w:World)=>{const c=holder(w),tree=c.cryptosleep.items.find(p=>p.id===treeId)!;tree.innerResource!.id=other.id;const context=retained?w.worldPawns!.heldPlayerCaskets271![0]!.context:w;expect(validOriginalTreeResource(tree.innerResource,{...context,nextId:w.nextId},271,c.cryptosleep.heldAt)).toBe(true);};
 const saved=serializeCampaign(root),badRaw=JSON.parse(saved) as World;mutate(badRaw);expect(()=>deserializeCampaign(JSON.stringify(badRaw))).toThrow();expect(serializeCampaign(root)).toBe(saved);
 const encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder(),first=decoder.adopt(structuredClone(encoder.encode(root,0,0,true)));expect(first.status).toBe('applied');if(first.status!=='applied')throw Error('Actual valid holder checkpoint required');
 const before=structuredClone(first.world),good=encoder.encode(root,0,0,true),bad=structuredClone(good);if(bad.kind!=='checkpoint')throw Error('Explicit checkpoint required');mutate(bad.world);
 expect(decoder.adopt(bad).status).toBe('resync');expect(first.world).toEqual(before);expect(decoder.adopt(good).status).toBe('applied');
}

test('actual MapRemoved retains the same player holder once, unclaims its real bed and preserves every frozen original through save/public transport',()=>{
 const {root,map,c,p}=prepared(),items=[...c.cryptosleep.items],packs=[...c.cryptosleep.packed],clinical=structuredClone(p.health),heldAt=c.cryptosleep.heldAt,rng=root.rng;
 const consequences=mapChoices(root).find(m=>m.id===0)!.abandonConsequences;expect(consequences.pawns).toContainEqual({id:p.id,name:p.name});
 expect(abandonRegisteredMap(root,0,false).ok).toBe(false);expect(root.worldMaps!.retired.some(m=>m.id===0)).toBe(false);
 const result=abandonRegisteredMap(root,0,true);expect(result.ok,result.reason).toBe(true);const row=root.worldPawns!.heldPlayerCaskets271![0]!;
 expect(row.casket).toBe(c);expect(row.casket.cryptosleep.human).toBe(p);expect(row.casket.cryptosleep.items).toEqual(items);expect(row.casket.cryptosleep.items.every((i,n)=>i===items[n])).toBe(true);expect(row.casket.cryptosleep.packed.every((i,n)=>i===packs[n])).toBe(true);
 expect(p.bedId).toBeNull();expect(p.mapBed).toBeUndefined();expect(p.cryptosleepHeldAt271).toBe(heldAt);expect(p.health).toEqual(clinical);expect(p.health?.cryptosleepSickness).toBeUndefined();expect(root.rng).toBe(rng);
 expect(root.worldPawns!.owners.some(r=>r.actor.id===p.id)).toBe(false);expect(root.worldGroups!.abandonedContents.flatMap(a=>a.humans).some(h=>h.id===p.id)).toBe(false);expect(root.worldGroups!.abandonedContents.find(a=>a.mapId===0)!.lostColonistIds259).toContain(p.id);
 expect(captureWorldPawnHumans256(root).byId.get(p.id)!.pawn).toBe(p);expect(captureWorldPawnHumans256(root).contained.some(h=>h.id===p.id)).toBe(true);expect(heldCasketGCUnknown259(root.worldPawns!).find(([id])=>id===p.id)![1].unknown).toContain('actual-player-cryptosleep-holder-terminal-uncomposed');
 expect(map.structures.includes(c)).toBe(false);expect(validateWorld(root)).toEqual([]);const saved=serializeCampaign(root);expect(serializeCampaign(deserializeCampaign(saved))).toBe(saved);
 const view=registeredMapPresentation(root)!,packet=new SnapshotDecoder().adopt(structuredClone(new SnapshotEncoder().encode(root,0,0)));expect(packet.status).toBe('applied');if(packet.status==='applied')expect(packet.world).toEqual(view);
});

test('a player holder cannot be detached by an unbranded/stale permit or collected merely because a camp has no spawned colonist',()=>{
 const {root,map,c,p}=prepared(),before=serializeCampaign(root),tile=root.worldMaps!.sites.find(s=>s.id===0)!.tile!;
 // The acquired map also contains an occupied ancient casket. Either actual
 // nonempty-holder guard may refuse first; ordering is not part of the API.
 expect(()=>detachMapOwners(map,0,tile)).toThrow(/casket/);expect(serializeCampaign(root)).toBe(before);expect(map.structures).toContain(c);expect(c.cryptosleep.human).toBe(p);
 const plan=prepareMapRemoved259(root,map,0,false);expect(plan.ok).toBe(true);if(!plan.ok)throw Error(plan.reason);expect(plan.current()).toBe(true);
 p.health=structuredClone(p.health);expect(plan.current()).toBe(false);const changed=serializeCampaign(root);expect(()=>detachMapOwners(map,0,tile,plan)).toThrow(/casket/);expect(serializeCampaign(root)).toBe(changed);expect(c.cryptosleep.human).toBe(p);
 // Use the SAME actual map as a declared camp-removal predicate probe only;
 // no settlement creation or new-map simulation is claimed by this branch.
 const record=root.worldMaps!.sites.find(s=>s.id===0)!,kind=record.kind;record.kind='camp';const states=root.worldMaps!.sites.slice();removeEmptyCamps(root);expect(root.worldMaps!.sites).toEqual(states);record.kind=kind;
});

test('retained player-holder provenance, marker, namespace and closed schema reject forged records without manufacturing lost owners',()=>{
 const {root}=abandon(),saved=serializeCampaign(root);expect(validWorldPawnsEnvelope256(root,271,root.tick*10,root.nextId)).toBe(true);
 for(const change of ['wrong-origin','future-registration','wrong-marker','duplicate-holder','wrong-owner','local-bed','future-schema'] as const){
  const bad=JSON.parse(saved),entry=bad.worldPawns.heldPlayerCaskets271[0],holder=entry.casket.cryptosleep;
  if(change==='wrong-origin')entry.originMapId=bad.worldMaps.nextMapId;
  else if(change==='future-registration')entry.registeredAtCore=(bad.tick+1)*10;
  else if(change==='wrong-marker')holder.human.cryptosleepHeldAt271--;
  else if(change==='duplicate-holder')bad.worldPawns.heldPlayerCaskets271.push(structuredClone(entry));
  else if(change==='wrong-owner')holder.items[0].owner.pawnId=bad.nextId;
  else if(change==='local-bed')holder.human.bedId=entry.casket.id;
  else bad.schemaVersion=270;
  expect(()=>deserializeCampaign(JSON.stringify(bad))).toThrow();expect(serializeCampaign(root)).toBe(saved);
 }
});

test('a tree solely inside an actual local player holder has one registered original through RAW, full and delta adoption',()=>{
 const {root,map,c,tree,source}=containedTree(),counts=new Map<number,number>(),ids=new Set([...map.pawns,...map.piles,...map.resources,...map.structures,...map.jobs,...map.stockpiles,...map.packed.map(p=>p.building)].map(v=>v.id));
 expect(map.piles.some(p=>p.innerResource)).toBe(false);expect(c.cryptosleep.items.find(p=>p.id===tree.id)).toBe(tree);expect(tree.innerResource).toBe(source);
 const sink={has:(id:number)=>ids.has(id),add:(id:number)=>{counts.set(id,(counts.get(id)??0)+1);ids.add(id);}};
 expect(registerCryptosleepThingIds271(map,sink)).toEqual([]);expect(validateTreeTransport(map)).toBe(true);expect(registerTreeThingIds(map,sink)).toEqual([]);
 expect(counts.get(tree.id)).toBe(1);expect(counts.get(source.id)).toBe(1);expect(registerTreeThingIds(map,sink).length).toBeGreaterThan(0);
 const saved=serializeCampaign(root);expect(serializeCampaign(deserializeCampaign(saved))).toBe(saved);publicExact(root);refuseTreeCollision(root,false,tree.id,source.id);
});

test('the same boxed tree after actual MapRemoved is registered only by its retained WorldPawn holder and resumes RAW/public exactly',()=>{
 const {root,map,c,tree,source}=containedTree(),before=structuredClone(source),result=abandonRegisteredMap(root,0,true);expect(result.ok,result.reason).toBe(true);
 const row=root.worldPawns!.heldPlayerCaskets271![0]!;expect(row.casket).toBe(c);expect(row.casket.cryptosleep.items.find(p=>p.id===tree.id)).toBe(tree);expect(tree.innerResource).toBe(source);expect(source).toEqual(before);expect(map.structures.includes(c)).toBe(false);
 const view=registeredMapPresentation(root)!,counts=new Map<number,number>(),ids=new Set([...view.pawns,...view.piles,...view.resources,...view.structures,...view.jobs,...view.stockpiles].map(v=>v.id));
 const sink={has:(id:number)=>ids.has(id),add:(id:number)=>{counts.set(id,(counts.get(id)??0)+1);ids.add(id);}};
 expect(registerTreeThingIds(view,sink)).toEqual([]);expect(ids.has(source.id)).toBe(false);
 expect(validateHeldPlayerCaskets271(root.worldPawns!,root,sink,undefined,new Set(captureWorldPawnHumans256(root).people.keys()))).toEqual([]);
 expect(counts.get(tree.id)).toBe(1);expect(counts.get(source.id)).toBe(1);expect(registerTreeThingIds(view,sink)).toEqual([]);expect(counts.get(source.id)).toBe(1);
 expect(validateWorld(root)).toEqual([]);const saved=serializeCampaign(root);expect(serializeCampaign(deserializeCampaign(saved))).toBe(saved);publicExact(root);refuseTreeCollision(root,true,tree.id,source.id);
});
