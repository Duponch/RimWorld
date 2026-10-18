import {test,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {generateGeographicWorldDraft256} from '../src/sim/world-geographic-draft';
import {defaultWorldGenerationSettings} from '../src/sim/world-generation-settings';
import {captureGeneratedGeography256} from '../src/sim/world-geography-owner-256';
import {createGeographicNewGame256} from '../src/sim/geographic-new-game-256';
import {ACTUAL_SHRINES_750_256} from '../src/sim/ancient-temple-orchestration-256';
import {createStartingCandidateRoster} from '../src/sim/starting-candidates';
import {startingOriginalRequestFromRoster256} from '../src/sim/starting-original-request-256';
import {serializeCampaign,deserializeCampaign,validateWorld} from '../src/sim/serialization';
import {registeredMaps} from '../src/sim/world-map-context';
import {registeredMapPresentation} from '../src/sim/world-map-presentation';
import {SnapshotEncoder,SnapshotDecoder} from '../src/bridge/snapshots';
import {stepWorld} from '../src/sim/engine';
import {SCHEMA_VERSION} from '../src/sim/types';
const enabled=process.env.ELSEWHERE_RUN_GEOGRAPHIC_RENEWAL262==='1';
function drain<Y,T>(it:Generator<Y,T,void>):T{let result=it.next();while(!result.done)result=it.next();return result.value;}

/** ROOT-only factory/reload control, prepared but never executed by this agent.
 * Same already-declared V408/V414 globe/site, no search or selected reroll. */
test.skipIf(!enabled)('actual new262 factory owns the marker, RAW/full/delta and a real next tick continue exactly',()=>{
 expect(SCHEMA_VERSION).toBe(262);
 const settings={...defaultWorldGenerationSettings(),rainfall:4 as const,temperature:2 as const};
 const draft=drain(generateGeographicWorldDraft256({seed:'Camp2274 preview 256 🌲',settings,tick:0,nextThingId:1,playerDef:'PlayerColony',playerName:'QA262 prospective'})),geography=captureGeneratedGeography256(draft),roster=createStartingCandidateRoster(259017);
 const a=drain(createGeographicNewGame256({draft,geography,tile:50388,size:250,scenario:'crashlanded',startingParty:startingOriginalRequestFromRoster256(259017,roster)},{shrines750:ACTUAL_SHRINES_750_256}));
 expect(a.wildlife!.geographicRenewal262).toEqual({revision:1,adoptedAt:0,lastTick:0});expect(validateWorld(a)).toEqual([]);
 const bytes=serializeCampaign(a),b=deserializeCampaign(bytes);expect(serializeCampaign(b)).toBe(bytes);
 const encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder(),full=decoder.adopt(structuredClone(encoder.encode(a,0,0)));expect(full.status).toBe('applied');
 stepWorld(a,1);stepWorld(b as typeof a,1);expect(serializeCampaign(b)).toBe(serializeCampaign(a));
 const delta=decoder.adopt(structuredClone(encoder.encode(a,0,0)));expect(delta.status).toBe('applied');if(delta.status!=='applied')throw Error('Actual delta required');
 expect(delta.world).toEqual(registeredMapPresentation(a));expect(delta.world.wildlife!.geographicRenewal262).toEqual({revision:1,adoptedAt:0,lastTick:1});
});

const oldPath=process.env.GEOGRAPHIC_RENEWAL262_OLD261,oldSHA=process.env.GEOGRAPHIC_RENEWAL262_OLD261_SHA256;
test.skipIf(!enabled||!oldPath||!oldSHA)('exact acquired261 validates all original maps before neutral262 migration, without retroactive renewal or RNG draws',()=>{
 const bytes=readFileSync(oldPath!,'utf8');expect(createHash('sha256').update(bytes).digest('hex')).toBe(oldSHA);const old=JSON.parse(bytes);expect(old.schemaVersion).toBe(261);
 const current=deserializeCampaign(bytes);expect(current.schemaVersion).toBe(262);const expected={...old,schemaVersion:262};expect(JSON.parse(serializeCampaign(current))).toEqual(expected);
 for(const map of registeredMaps(current))expect(Object.hasOwn(map.wildlife??{},'geographicRenewal262')).toBe(false);
 const testMap=(raw:typeof old)=>{const local=[];if('tiles'in raw)local.push(raw);for(const site of raw.worldMaps?.sites??[])if(site.map)local.push(site.map);if(raw.secondarySite?.map)local.push(raw.secondarySite.map);return local;};
 const originals=testMap(old);expect(originals.length).toBeGreaterThan(0);
 for(let index=0;index<originals.length;index++){
  const forged=JSON.parse(bytes),map=testMap(forged)[index]!;expect(map.wildlife).toBeDefined();map.wildlife.geographicRenewal262={revision:1,adoptedAt:old.tick,lastTick:old.tick};
  expect(()=>deserializeCampaign(JSON.stringify(forged))).toThrow();
 }
 expect(readFileSync(oldPath!,'utf8')).toBe(bytes);
});
