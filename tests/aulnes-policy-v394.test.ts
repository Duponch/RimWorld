import {expect,test} from 'vitest';
import {loadAulnesV386,prepareAulnesPolicyV394,AULNES_V394_ITEM,AULNES_V394_START} from '../scripts/aulnes-policy-v394.ts';
import {serializeWorld,deserializeWorld,validateWorld} from '../src/sim/serialization.ts';
import {SnapshotEncoder,SnapshotDecoder} from '../src/bridge/snapshots.ts';

test('V394 immutable played Aulnes: append only the wool tuque by the real policy command, preserving all sleeping owners and engaged work',async()=>{
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
