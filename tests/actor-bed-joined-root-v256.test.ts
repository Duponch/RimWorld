import {test,expect} from 'vitest';
import {reorganizationCamp256} from './helpers/group-reorganization-v256.ts';
import {applyCommand} from '../src/sim/engine.ts';
import {validateWorld,serializeCampaign,deserializeCampaign} from '../src/sim/serialization.ts';
import {SnapshotEncoder,SnapshotDecoder} from '../src/bridge/snapshots.ts';
import {captureActorBeds256} from '../src/sim/actor-bed-local-256.ts';
import {validateCampaignActorBeds256} from '../src/sim/actor-bed-save-256.ts';
import {bedSlotClaimed} from '../src/sim/bed-slots.ts';
import {damageStructure,structureMaxHp} from '../src/sim/thing-damage.ts';
import {prepareBedOwnershipTransition256} from '../src/sim/actor-bed-transition-256.ts';
function fixture(){const f=reorganizationCamp256(),b=f.map.structures.find(s=>s.kind==='bed')!,away=f.members[0]!,local=f.map.pawns[0]!;away.mapBed={revision:1,mapId:f.record.originMapId,bedId:b.id};away.bedId=null;return {...f,b,away,local};}
test('real manual bed command displaces the away owner and survives complete save/reload without clinical changes',()=>{
 const f=fixture(),{w,map,b,away,local}=f;expect(validateWorld(w)).toEqual([]);expect(bedSlotClaimed(map,b,0,local.id)).toBe(true);
 const clinical=JSON.stringify([away.health,away.hunger,away.rest,local.health,local.hunger,local.rest]),rng=w.rng,next=w.nextId;
 expect(applyCommand(w,{type:'assign-bed',bedId:b.id,pawnId:local.id})).toEqual({ok:true});
 expect(away.mapBed).toBeUndefined();expect(local.mapBed).toEqual({revision:1,mapId:f.record.originMapId,bedId:b.id});expect(local.bedId).toBe(b.id);
 expect(w.rng).toBe(rng);expect(w.nextId).toBe(next);expect(JSON.stringify([away.health,away.hunger,away.rest,local.health,local.hunger,local.rest])).toBe(clinical);expect(validateWorld(w)).toEqual([]);
 const saved=serializeCampaign(w);expect(serializeCampaign(deserializeCampaign(saved))).toBe(saved);
});
test('global original bed metadata joins in MAIN; forged active metadata refuses atomically then the exact same epoch can recover',()=>{
 const {w}=fixture(),encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder(),packet=structuredClone(encoder.encode(w,0,0)),first=decoder.adopt(packet);expect(first.status,first.status==='resync'?first.reason:undefined).toBe('applied');if(first.status!=='applied'||!('world'in packet)||packet.world.campaignMap?.revision!==2)throw Error('Actual joined projection missing');
 const before=structuredClone(first.world),bad=structuredClone(packet);if(!('world'in bad)||bad.world.campaignMap?.revision!==2)throw Error('Actual full message missing');bad.epoch=packet.epoch+1;bad.world.campaignMap!.bedRefs![0]!.slots=2;
 expect(decoder.adopt(bad).status).toBe('resync');expect(first.world).toEqual(before);const retry=structuredClone(packet);retry.epoch=bad.epoch;const result=decoder.adopt(retry);expect(result.status,result.status==='resync'?result.reason:undefined).toBe('applied');
});
test('true fatal bed damage clears its away original claim while keeping unrelated bed assignments and inventories',()=>{
 const {w,map,b,away,local,g}=fixture(),kept=local.bedId,inventory=structuredClone(g.items);expect(damageStructure(map,b,structureMaxHp(b),'bullet')).toBe(true);
 expect(away.mapBed).toBeUndefined();expect(local.bedId).toBe(kept);expect(g.items).toEqual(inventory);expect(captureActorBeds256(w).refs.some(r=>r.id===b.id)).toBe(false);expect(validateCampaignActorBeds256(w)).toEqual([]);
});
test('declared ownership-container transition preserves the same bed through Vanish and reinstall, without claiming construction work',()=>{
 const {w,map,b,away,record}=fixture(),packPlan=prepareBedOwnershipTransition256(map,b,'pack')!,pack={building:b,owner:{type:'ground' as const,x:4,z:4}};
 map.structures=map.structures.filter(s=>s!==b);map.packed.push(pack);packPlan.commit();expect(away.mapBed).toEqual({revision:1,mapId:null,bedId:b.id});expect(validateCampaignActorBeds256(w)).toEqual([]);
 const installPlan=prepareBedOwnershipTransition256(map,b,'install')!;map.packed=map.packed.filter(p=>p!==pack);map.structures.push(b);installPlan.commit();
 expect(away.mapBed).toEqual({revision:1,mapId:record.originMapId,bedId:b.id});expect(away.bedId).toBe(null);expect(validateCampaignActorBeds256(w)).toEqual([]);
});
