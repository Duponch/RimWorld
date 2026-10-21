import {expect,test} from 'vitest';
import {readFileSync,existsSync} from 'node:fs';
import {preparedGiftCamp274,GIFT_CAMP_SOURCE274} from './helpers/diplomatic-gifts-v450.ts';
import {serializeCampaign,deserializeCampaign,serializeWorld,validateWorld} from '../src/sim/serialization.ts';
import {SnapshotEncoder,SnapshotDecoder} from '../src/bridge/snapshots.ts';
import {ResidentPresentationAssembler} from '../src/bridge/resident-presentation-assembler.ts';
import {isSchema273OrLater,isSchema272OrLater} from '../src/sim/schema-compatibility-257.ts';
import {validGroupCommand} from '../src/sim/group-command-shape.ts';
import {SCHEMA_VERSION,type World} from '../src/sim/types.ts';

test.skipIf(!existsSync('tmp/prosthetics-v449/native-ui/2026-10-21T19-18-40-181Z/result.json'))('optional actual earned V449 surgical result advances strict273 by number alone',()=>{
 const text=readFileSync('tmp/prosthetics-v449/native-ui/2026-10-21T19-18-40-181Z/result.json','utf8'),before=JSON.parse(text);
 expect(before.schemaVersion).toBe(273);expect(before.pawns.find((p:{id:number})=>p.id===197).health.artificialParts[0].kind).toBe('prosthetic-leg');
 const copy=deserializeCampaign(text);expect(copy.schemaVersion).toBe(SCHEMA_VERSION);expect(validateWorld(copy)).toEqual([]);expect(JSON.parse(serializeCampaign(copy))).toEqual({...before,schemaVersion:SCHEMA_VERSION});expect(readFileSync('tmp/prosthetics-v449/native-ui/2026-10-21T19-18-40-181Z/result.json','utf8')).toBe(text);
});

test('closed capability and command families continue274 and reject275 and old gift commands',()=>{
 for(const v of [273,274]){expect(isSchema273OrLater(v)).toBe(true);expect(isSchema272OrLater(v)).toBe(true);}
 for(const v of [272,275,'274',NaN])expect(isSchema273OrLater(v)).toBe(false);
 const c={type:'group-gift274',groupId:5,lines:[{pileId:17,quantity:2}],quote:'correlated'};
 expect(validGroupCommand(c,274)).toBe(true);for(const v of [254,256,273,275])expect(validGroupCommand(c,v)).toBe(false);
 for(const lines of [[],[{pileId:17,quantity:0}],[{pileId:17,quantity:1},{pileId:17,quantity:2}]])expect(validGroupCommand({...c,lines},274)).toBe(false);
});

test.skipIf(!existsSync(GIFT_CAMP_SOURCE274))('optional strict273 refuses a future gift marker on its real geographic post and its same-tick public projection',()=>{
 const f=preparedGiftCamp274(),old=deserializeCampaign(serializeCampaign(f.w));if(!('pawns'in old))throw Error('Expected actual loaded campaign');Object.assign(old,{schemaVersion:273});const text=JSON.stringify(old);
 expect(JSON.parse(serializeCampaign(deserializeCampaign(text)))).toEqual({...JSON.parse(text),schemaVersion:SCHEMA_VERSION});
 const encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder(),resident=new ResidentPresentationAssembler(),packet=structuredClone(encoder.encode(old,0,0));
 const first=decoder.adopt(structuredClone(packet)),shown=resident.adopt(structuredClone(packet));expect(first.status).toBe('applied');expect(shown.status).toBe('applied');if(first.status!=='applied'||packet.kind!=='checkpoint')throw Error('Valid old post projection refused');const retained=structuredClone(first.world);
 const post=old.worldGroups!.posts.find(p=>p.id===f.postId)!;Object.assign(post.state,{gifts274:false});expect(()=>deserializeCampaign(JSON.stringify(old))).toThrow();
 const delta=structuredClone(encoder.encode(old,0,0));expect(delta.kind).toBe('delta');expect(decoder.adopt(structuredClone(delta)).status).toBe('resync');expect(resident.adopt(delta).status).toBe('resync');expect(first.world).toEqual(retained);
 const full=structuredClone(packet),summary=full.world.campaignMap;if(summary?.revision!==2)throw Error('Missing actual group summary');const row=summary.groups.find(r=>r.id===f.groupId);expect(row?.postId).toBe(f.postId);if(!row?.post)throw Error('Observed real post absent');Object.assign(row.post,{gifts274:undefined});expect(new SnapshotDecoder().adopt(full).status).toBe('resync');expect(first.world).toEqual(retained);
},120000);
