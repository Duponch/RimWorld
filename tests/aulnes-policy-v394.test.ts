import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {decodeStoredSave} from '../src/ui/save-storage-codec.ts';
import {SCHEMA_VERSION} from '../src/sim/types.ts';
import {expect,test} from 'vitest';
import {loadAulnesV386,prepareAulnesPolicyV394,AULNES_V394_ITEM,AULNES_V394_START} from '../scripts/aulnes-policy-v394.ts';
import {serializeWorld,deserializeWorld,validateWorld} from '../src/sim/serialization.ts';
import {SnapshotEncoder,SnapshotDecoder} from '../src/bridge/snapshots.ts';

test('V394 immutable played Aulnes: append only the wool tuque by the real policy command, preserving all sleeping owners and engaged work',async()=>{
  // The dated producer stays locked; actual played files always use the current loader.
  if(Number(SCHEMA_VERSION)!==250){await expect(loadAulnesV386()).rejects.toThrow(/current250 loader/);return;}
  const {world:source}=await loadAulnesV386(),before=serializeWorld(source),{world}=prepareAulnesPolicyV394(source),old=source.apparelPolicies!.find(p=>p.id===4)!,policy=world.apparelPolicies!.find(p=>p.id===4)!;
  expect(world.tick).toBe(AULNES_V394_START);expect(policy.allowedItems).toEqual([...old.allowedItems,AULNES_V394_ITEM]);expect(policy.allowedMaterials).toEqual(old.allowedMaterials);
  expect(policy.allowedItems).not.toBe(old.allowedItems);expect(policy.allowedMaterials).not.toBe(old.allowedMaterials);expect({...policy,allowedItems:old.allowedItems}).toEqual(old);
  expect({...world,apparelPolicies:source.apparelPolicies}).toEqual(source);expect(serializeWorld(source)).toBe(before);
  for(const [id,due] of [[19871,9996],[20337,10635]])expect(world.pawns.find(p=>p.id===id)).toMatchObject({state:'sleeping',apparelAutomation:true,apparelPolicyId:4,nextApparelCheckAt:due});
  expect(world.pawns.find(p=>p.id===19869)!.cooking).toEqual(source.pawns.find(p=>p.id===19869)!.cooking);expect(world.pawns.find(p=>p.id===20352)!.cooking).toEqual(source.pawns.find(p=>p.id===20352)!.cooking);
  expect(validateWorld(world)).toEqual([]);const raw=serializeWorld(world);expect(serializeWorld(deserializeWorld(raw))).toBe(raw);
  const decoded=new SnapshotDecoder().adopt(structuredClone(new SnapshotEncoder().encode(world,0,0,true)));expect(decoded.status).toBe('applied');if(decoded.status==='applied')expect(serializeWorld(decoded.world)).toBe(raw);
  const applied=serializeWorld(world);expect(()=>prepareAulnesPolicyV394(world)).toThrow(/exclude this tuque/);expect(serializeWorld(world)).toBe(applied);
},120_000);

// Qualifies the immutable played artifact after later neutral migrations;
// never regenerates the estate or silently unlocks its dated producer.
test('V394 played public artifact retains its literal owner graph and resumes the current schema',async()=>{
 const raw=await decodeStoredSave(readFileSync('public/test-saves/v394/les-aulnes-integrees.json','utf8'));
 expect(createHash('sha256').update(raw).digest('hex')).toBe('19bd59c90dfbae4983d04cb6eae95a2eb728cd61b59b19172c37366e7704be47');
 expect(JSON.parse(raw).schemaVersion).toBe(250);
 const world=deserializeWorld(raw);expect(world.schemaVersion).toBe(SCHEMA_VERSION);expect(world.tick).toBe(10733);
 expect(validateWorld(world)).toEqual([]);expect(world.pawns).toHaveLength(15);
 expect(world.pawns.find(p=>p.id===20352)!.cooking).toMatchObject({recipe:'tuque',phase:'work',progress:155000});
 expect(world.piles.find(p=>p.id===28063)).toMatchObject({owner:{type:'ground',x:139,z:149}});
 expect(world.apparelPolicies!.find(p=>p.id===4)!.allowedItems).toContain('muffalo-wool-tuque');
 expect(deserializeWorld(serializeWorld(world))).toEqual(world);
},120_000);
