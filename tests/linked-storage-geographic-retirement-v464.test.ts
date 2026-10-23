import {beforeAll,expect,test} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {deserializeCampaign,serializeCampaign,validateWorld} from '../src/sim/serialization.ts';
import {registeredMap,flushRegisteredMap} from '../src/sim/world-map-context.ts';
import {prepareLinkedStorageCommand286} from '../src/sim/linked-storage-plan-286.ts';
import {prepareLinkedStorageMapRemoval286} from '../src/sim/linked-storage-map-removal-286.ts';
import {prepareMapRemoved259} from '../src/sim/world-pawn-map-removed-259.ts';
import {abandonRegisteredMap} from '../src/sim/world-map-authority.ts';
import {newShelfStorage} from '../src/sim/shelf-storage.ts';
import {footprintCells} from '../src/sim/definitions.ts';
import {captureStandability} from '../src/sim/furniture-travel.ts';
import {terrainSupportsAffordance256} from '../src/sim/natural-terrain-runtime-256.ts';
import {registeredMapPresentation} from '../src/sim/world-map-presentation.ts';
import {SnapshotEncoder,SnapshotDecoder} from '../src/bridge/snapshots.ts';
import {ResidentPresentationAssembler} from '../src/bridge/resident-presentation-assembler.ts';
import {SCHEMA_VERSION,type Structure} from '../src/sim/types.ts';

const source='tmp/test-runs/reform-v415-complete11-2026-10-17T22-21-45.321Z-20704/artifacts/reform-v415/07-existing-camp736-before-real-work-order-RAW-BEFORE-ADMISSION.json';
const sourceSHA='70dea3811dab70e7225cced4c715c8438b1d7aecec6aa173ac72eaa52115e699';
let baseline:string;
beforeAll(()=>{
 const raw=readFileSync(source,'utf8');expect(createHash('sha256').update(raw).digest('hex')).toBe(sourceSHA);
 // Strict migration preserves the acquired globe, calendar, actors and true
 // WorldPawn registry. Each fixture then reloads this exact current campaign;
 // structuredClone cannot replace its private geography witnesses.
 baseline=serializeCampaign(deserializeCampaign(raw));
},120_000);

/** Acquired Camp736, original people7/8 and all existing physical owners.
 * Only two shelves, their preferences, packing B under Milo7 and the selected
 * presentation map are declared preparation. No construction, uninstall work,
 * travel, new person/faction, clinical correction or played link is claimed;
 * the real link plan and actual MapRemoved authority below are executed. */
function prepared(){
 const root=deserializeCampaign(baseline);if(!('pawns'in root))throw Error('Acquired loaded settlement required');
 const map=registeredMap(root,1)!;expect(root.tick).toBe(736);expect(root.schemaVersion).toBe(SCHEMA_VERSION);
 expect(root.planet?.revision).toBe(3);expect(map.climate?.revision).toBe(4);expect(map.site?.revision).toBe(3);
 expect(root.worldMaps!.sites.find(s=>s.id===1)?.kind).toBe('camp');
 const pawn=map.pawns.find(p=>p.id===7)!;expect(pawn.name).toBe('Milo');expect(map.pawns.find(p=>p.id===8)?.name).toBe('Émile');
 const occupied=new Set([...map.structures.flatMap(footprintCells),...map.jobs.flatMap(footprintCells),...map.resources,...map.piles.flatMap(p=>p.owner.type==='ground'?[p.owner]:[]),...map.packed.flatMap(p=>p.owner.type==='ground'?[p.owner]:[]),...map.stockpiles,...map.pawns].map(c=>c.z*map.width+c.x));
 const stands=captureStandability(map),shelves:Structure[]=[];
 for(let z=2;z<map.height-2&&shelves.length<2;z++)for(let x=2;x<map.width-2&&shelves.length<2;x++){
  const key=z*map.width+x,cell={x,z};
  if(occupied.has(key)||!stands(cell)||!terrainSupportsAffordance256(map.tiles[key]!,'Medium',map))continue;
  const shelf:Structure={id:map.nextId++,kind:'small-shelf',x,z,orientation:0,footprint:'standard',material:'wood',shelf:newShelfStorage([map.nextId++],286)};
  map.structures.push(shelf);shelves.push(shelf);occupied.add(key);
 }
 expect(shelves).toHaveLength(2);const [a,b]=shelves as [Structure,Structure];a.shelf!.settings.priority=5;b.shelf!.settings.priority=1;flushRegisteredMap(map);
 const link=prepareLinkedStorageCommand286(map,{type:'shelf-link',structureIds:[a.id,b.id]});
 expect(link.ok,link.ok?'':link.reason).toBe(true);if(!link.ok)throw Error(link.reason);expect(link.commit()).toBe(true);
 const pack={building:b,owner:{type:'inventory' as const,pawnId:pawn.id}};
 map.structures=map.structures.filter(s=>s!==b);map.packed.push(pack);flushRegisteredMap(map);
 root.worldMaps!.selectedMapId=0;
 expect(validateWorld(root)).toEqual([]);return {root,map,pawn,a,b,pack};
}

test('geographic259 removal composes nonempty shelf writes with the same WorldPawn packed original and exact retired-origin transport',()=>{
 const {root,map,pawn,a,b,pack}=prepared(),state=root.worldPawns!,oldOwners=[...state.owners],before=JSON.stringify(root),nextId=root.nextId;
 const expectedPack=structuredClone(pack);delete expectedPack.building.shelf!.linked286;
 // This must exercise real final writes, not a no-op registry or archive-only
 // path. The unused preview is pure and does not admit or mutate either owner.
 const linked=prepareLinkedStorageMapRemoval286(root,map,1,new Set());
 expect(linked.ok,linked.ok?'':linked.reason).toBe(true);if(!linked.ok)throw Error(linked.reason);
 expect(linked.plan.lostIds).toEqual([a.id]);expect(linked.plan.writes.some(w=>w.object===root&&w.key==='linkedStorage286')).toBe(true);
 expect(linked.plan.writes.some(w=>w.object===b.shelf&&w.key==='linked286'&&!w.present)).toBe(true);
 const preview=prepareMapRemoved259(root,map,1,false);expect(preview.ok,preview.ok?'':preview.reason).toBe(true);if(!preview.ok)throw Error(preview.reason);
 expect(preview.current()).toBe(true);expect(JSON.stringify(root)).toBe(before);
 const encoder=new SnapshotEncoder({structureDelta:true,minimumStructures:0}),decoder=new SnapshotDecoder(),resident=new ResidentPresentationAssembler();
 const opening=structuredClone(encoder.encode(root,0,0));expect(decoder.adopt(structuredClone(opening)).status).toBe('applied');expect(resident.adopt(structuredClone(opening)).status).toBe('applied');
 const result=abandonRegisteredMap(root,1,true);expect(result.ok,result.reason).toBe(true);
 expect(root.worldPawns).toBe(state);for(const owner of oldOwners)expect(state.owners).toContain(owner);
 const row=state.owners.find(r=>r.kind==='human'&&r.actor.id===pawn.id);expect(row).toBeDefined();if(!row||row.kind!=='human')throw Error('The acquired human must enter his real WorldPawn owner');
 expect(row.actor).toBe(pawn);expect(row.originMapId).toBe(1);expect(row.packed.find(p=>p.building.id===b.id)).toBe(pack);expect(pack.building).toBe(b);
 expect(JSON.stringify(pack)).toBe(JSON.stringify(expectedPack));expect(b.shelf!.settings.priority).toBe(5);expect(b.shelf!.linked286).toBeUndefined();
 expect(root.linkedStorage286).toEqual({revision:1,nextId:2,groups:[]});expect(root.nextId).toBe(nextId);
 expect(registeredMap(root,1)).toBeUndefined();const retired=root.worldMaps!.retired.find(s=>s.id===1)!;expect(retired).toMatchObject({id:1,kind:'camp',removedAt:736});
 expect(root.worldGroups!.abandonedContents.find(c=>c.mapId===1)!.humans.some(h=>h.id===pawn.id)).toBe(false);
 expect(validateWorld(root)).toEqual([]);const raw=serializeCampaign(root),copy=deserializeCampaign(raw);expect(serializeCampaign(copy)).toBe(raw);expect(validateWorld(copy)).toEqual([]);
 expect(copy.worldPawns!.owners.find(r=>r.actor.id===pawn.id)!.packed.find(p=>p.building.id===b.id)).toEqual(pack);
 const expected=structuredClone(registeredMapPresentation(root)!);
 if(expected.campaignMap?.revision!==2)throw Error('Actual registered presentation required');
 expect(expected.campaignMap.worldPawnOrigins).toContainEqual({mapId:1,tile:retired.tile,removedAt:736});expect(expected.campaignMap.maps.some(m=>m.id===1)).toBe(false);
 expect(registeredMapPresentation(copy)).toEqual(expected);
 const packet=structuredClone(encoder.encode(root,0,0));expect(packet.kind).toBe('delta');
 const publicResult=decoder.adopt(structuredClone(packet)),residentResult=resident.adopt(structuredClone(packet));
 expect(publicResult.status).toBe('applied');expect(residentResult.status).toBe('applied');
 if(publicResult.status!=='applied'||residentResult.status!=='applied')throw Error('Both readers must adopt the exact WorldPawn/furniture/origin candidate');
 expect(publicResult.world).toEqual(expected);expect(residentResult.world).toEqual(expected);
 // A rejected repeat cannot credit or finish an already transferred original.
 expect(abandonRegisteredMap(root,1,true).ok).toBe(false);expect(serializeCampaign(root)).toBe(raw);
},120_000);
