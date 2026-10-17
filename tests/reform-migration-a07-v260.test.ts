import {expect,test} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {deserializeCampaign,serializeCampaign,validateWorld} from '../src/sim/serialization.ts';

const A07_SHA='7067a0b1093feab8cc1502300838d630247df7d40cfe0de6e5edcd7173ed0bc5';
const sha=(s:string)=>createHash('sha256').update(s).digest('hex');
/** Read-only acquired V414 export, no fixture copy or simulation. Explicit
 * opt-in keeps this13MB historical input out of ordinary targeted runs. */
test.skipIf(process.env.REFORM260_A07_READONLY!=='1')('actual A07 two-map259 validates before scalar-only260 migration; inactive future field refuses',()=>{
 const path=process.env.REFORM260_A07_INPUT;if(!path)throw Error('ROOT must provide exact acquired A07 export path; no fallback or replay');
 const raw=readFileSync(path,'utf8');expect(sha(raw)).toBe(A07_SHA);expect(raw.startsWith('{"schemaVersion":259,')).toBe(true);
 const expectedSHA=sha(raw.replace(/^\{"schemaVersion":259,/, '{"schemaVersion":260,'));
 // Only one hydrated World is retained at a time. The scalar-only byte hash
 // covers both maps, persons, Things, clocks, owners, IDs and PRNG together.
 {
  const migrated=deserializeCampaign(raw);expect(migrated.schemaVersion).toBe(260);expect(migrated.worldMaps!.sites).toHaveLength(2);expect(migrated.tick).toBe(1807);expect(validateWorld(migrated)).toEqual([]);expect(sha(serializeCampaign(migrated))).toBe(expectedSHA);
 }
 {
  const old=JSON.parse(raw);expect(old.schemaVersion).toBe(259);expect(old.worldMaps.sites).toHaveLength(2);
  const inactive=old.worldMaps.sites.find((s:{id:number})=>s.id!==old.worldMaps.selectedMapId);if(!inactive)throw Error('Actual259 inactive map absent');
  // Closed future field on the actual inactive registry record. This has no
  // authority in259 and must fail before scalar migration, even off-screen.
  inactive.campPressure={revision:1,createdAtCore:old.tick*10};
  expect(()=>deserializeCampaign(JSON.stringify(old))).toThrow(/259/);expect(old.schemaVersion).toBe(259);
 }
 expect(sha(readFileSync(path,'utf8'))).toBe(A07_SHA);
},120_000);
