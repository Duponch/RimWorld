import {readFileSync} from 'node:fs';
import {expect,test} from 'vitest';
import {INPUT261_SHA,sha261,admitted261} from './helpers/caravan-encounter261-acquired.ts';
import {deserializeCampaign,serializeCampaign} from '../src/sim/serialization.ts';
import {registeredMap} from '../src/sim/world-map-context.ts';
import {SnapshotEncoder,SnapshotDecoder} from '../src/bridge/snapshots.ts';
import {previewGroupReform260} from '../src/sim/group-reform-260.ts';
import {actualCampRemovalAbsCore256} from '../src/sim/world-pawn-map-removed-256.ts';

test.skipIf(process.env.TRAVEL261_ENCOUNTER_SIM!=='1')('acquired736: actual MAIN projection estimates Reform with the same SIM quote without owning a removal clock',()=>{
 const path=process.env.CARAVAN261_INPUT;if(!path)throw Error('Exact acquired Camp736 CARAVAN261_INPUT required');const raw=readFileSync(path,'utf8');expect(sha261(raw)).toBe(INPUT261_SHA);const root=deserializeCampaign(raw);admitted261(root);const before=serializeCampaign(root),map=registeredMap(root,1)!;
 const decoder=new SnapshotDecoder(),packet=decoder.adopt(structuredClone(new SnapshotEncoder().encode(root,0,0)));expect(packet.status).toBe('applied');if(packet.status!=='applied')throw Error('Actual MAIN adoption absent');const main=packet.world,mainBefore=JSON.stringify(main);
 expect(main.worldMaps).toBeUndefined();expect(()=>actualCampRemovalAbsCore256(main,main)).toThrow('Actual geographic Camp climate/clock owner required');
 const draft={originMapId:1,memberIds:[7,8],sources:[{pileId:36326,quantity:1}],destination:0},sim=previewGroupReform260(map,draft),projected=previewGroupReform260(main,draft);expect(projected.ok).toBe(true);expect(projected).toEqual(sim);if(!projected.ok)throw Error(projected.reason);expect(projected.provisions).toMatchObject({ok:true,foodDays:0,warnings:['no-food']});expect(projected.mass.rations).toBe(1);
 expect(JSON.stringify(main)).toBe(mainBefore);expect(serializeCampaign(root)).toBe(before);expect(sha261(readFileSync(path,'utf8'))).toBe(INPUT261_SHA);
},120_000);
