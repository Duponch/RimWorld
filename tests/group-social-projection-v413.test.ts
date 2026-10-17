import {expect,test} from 'vitest';
import {preparedNativeFreight413} from './helpers/group-freight-v413';
import {harness} from './helpers/group-admission-v412';
import {serializeCampaign,deserializeCampaign,validateWorld} from '../src/sim/serialization';
import {SnapshotEncoder,SnapshotDecoder} from '../src/bridge/snapshots';
import {campaignPresentation} from '../src/sim/secondary-site-presentation';

test('actual freight departure preserves new social memories of the resident through RAW/full/delta, without registering a second owner',()=>{
 const {root,manifest:m}=preparedNativeFreight413(),f=harness(root),encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();
 f.command({type:'group-start',originMapId:m.mapId,memberIds:m.memberIds,animalIds:[m.animalId],sources:[{pileId:m.medicine.sourceId,quantity:2}],packedIds:[m.pack.id],destination:m.destination});
 expect(decoder.adopt(structuredClone(encoder.encode(root,0,1))).status).toBe('applied');
 for(let i=0;i<400&&!root.worldGroups!.groups.some(r=>'members'in r.state);i++){
  f.step();expect(validateWorld(root)).toEqual([]);
  const result=decoder.adopt(structuredClone(encoder.encode(root,0,1)));
  expect(result.status,JSON.stringify({tick:root.tick,result:result.status==='applied'?result.status:result})).toBe('applied');
 }
 const g=root.worldGroups!.groups[0]!.state;if(!('members'in g))throw Error('The actual originals did not depart');
 const resident=m.residentIds[0]!;expect(g.members.some(p=>p.social?.last?.otherId===resident&&p.social.memories.some(v=>v.otherId===resident))).toBe(true);
 expect(root.pawns.map(p=>p.id)).toEqual(m.residentIds);expect(g.members.map(p=>p.id)).toEqual(m.memberIds);
 const raw=serializeCampaign(root);expect(serializeCampaign(deserializeCampaign(raw))).toBe(raw);
 const full=new SnapshotDecoder().adopt(structuredClone(new SnapshotEncoder().encode(root,0,1)));
 expect(full.status).toBe('applied');if(full.status!=='applied')throw Error('Actual departure full refused');expect(full.world).toEqual(campaignPresentation(root));
 // A physical furniture ID is not human knowledge. The same social guard
 // must still reject that forged reference after projection.
 g.members.find(p=>p.social?.last?.otherId===resident)!.social!.last!.otherId=m.pack.id;
 expect(validateWorld(root).length).toBeGreaterThan(0);
 const forged=new SnapshotDecoder().adopt(structuredClone(new SnapshotEncoder().encode(root,0,1)));
 expect(forged.status).toBe('resync');
},30000);
