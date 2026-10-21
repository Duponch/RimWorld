import {expect,test} from 'vitest';
import {existsSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {deserializeCampaign,serializeCampaign,validateWorld} from '../src/sim/serialization.ts';
import {SnapshotEncoder,SnapshotDecoder} from '../src/bridge/snapshots.ts';
import {ResidentPresentationAssembler} from '../src/bridge/resident-presentation-assembler.ts';
import {SCHEMA_VERSION} from '../src/sim/types.ts';

const input='tmp/diplomatic-gifts-v450/native-ui/2026-10-21T20-33-51-940Z/given.json';
const hash='a5acc56aefa61a98e68c469e9076f8155b47359b369710fc46633787c4c72250';
test.skipIf(!existsSync(input))('acquired actual V450 gift campaign advances strict274 by number alone and preserves both public readers',()=>{
  const text=readFileSync(input,'utf8'),sha=()=>createHash('sha256').update(readFileSync(input)).digest('hex');
  expect(sha()).toBe(hash);const original=JSON.parse(text);expect(original.schemaVersion).toBe(274);
  const current=deserializeCampaign(text);if(!('pawns'in current))throw Error('Expected original loaded colony');
  expect(validateWorld(current)).toEqual([]);expect(JSON.parse(serializeCampaign(current))).toEqual({...original,schemaVersion:SCHEMA_VERSION});
  expect(Object.hasOwn(current,'shipReactorThreats275')).toBe(false);expect(current.structures.some(s=>s.kind==='ship-reactor')).toBe(false);
  const packet=new SnapshotEncoder().encode(current,0,0),full=new SnapshotDecoder().adopt(structuredClone(packet)),resident=new ResidentPresentationAssembler().adopt(structuredClone(packet));
  expect(full.status).toBe('applied');expect(resident.status).toBe('applied');if(full.status!=='applied'||resident.status!=='applied')throw Error('Actual gift continuation refused');
  expect(JSON.parse(JSON.stringify(resident.world))).toEqual(JSON.parse(JSON.stringify(full.world)));expect(sha()).toBe(hash);
},120000);
