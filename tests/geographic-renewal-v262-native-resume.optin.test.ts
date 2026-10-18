import {test,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {deserializeCampaign,serializeCampaign,validateWorld} from '../src/sim/serialization';
import {decodeStoredSave} from '../src/ui/save-storage-codec';
import {registeredMaps} from '../src/sim/world-map-context';
import {registeredMapPresentation} from '../src/sim/world-map-presentation';
import {SnapshotEncoder,SnapshotDecoder} from '../src/bridge/snapshots';
import {stepWorld} from '../src/sim/engine';
import {SCHEMA_VERSION,type World} from '../src/sim/types';
import type {CampaignState} from '../src/sim/world-map-state';
import {writeTestFileSync} from './test-output';

const ANIMAL261_SHA='7e6b579ddd93f3ff1822cbbcd98166749b8feb833119e963e30cb121a7fff492';
const sha=(s:string)=>createHash('sha256').update(s).digest('hex');
function requiredInput(pathKey:string,shaKey:string,knownSHA?:string){
 const path=process.env[pathKey],expected=process.env[shaKey];if(!path||!expected||!/^[a-f0-9]{64}$/.test(expected)||knownSHA&&expected!==knownSHA)throw Error(`Explicit acquired ${pathKey} and ${shaKey} required; no factory/fallback`);
 const bytes=readFileSync(path,'utf8');expect(sha(bytes)).toBe(expected);return {path,bytes,sha256:expected};
}
function actual262(root:CampaignState):asserts root is World {
 expect(SCHEMA_VERSION).toBe(262);if(Number(root.schemaVersion)!==262||!('tiles'in root)||root.planet?.revision!==3||root.climate?.revision!==4)throw Error('Actual acquired geographic262 World required');
 expect(validateWorld(root)).toEqual([]);
}
function rawCheckpoint(root:World,label:string){
 const path=`artifacts/geographic-v417-native-resume/${label}-RAW.json`;writeTestFileSync(path,JSON.stringify(root));actual262(root);const raw=serializeCampaign(root);writeTestFileSync(path,raw);writeTestFileSync(path.replace(/-RAW\.json$/,'-receipt.json'),JSON.stringify({sha256:sha(raw),tick:root.tick,rng:root.rng,nextId:root.nextId,notice:'Continuation of the single actual native325/winter export; no factory or geography generation; one ordinary tick only.'},null,2));return raw;
}

/** Consumes ONLY the actual exported native menu result, compressed or RAW.
 * No generation imports, alternate seed/site, manually inserted marker or
 * forced wildlife draw. A single tick does not prove a renewal birth. */
test.skipIf(process.env.GEOGRAPHIC_RENEWAL262_NATIVE_RESUME!=='1')('actual native325 export: markers, RAW/checkpoint/delta and one independent real tick reload exactly',async()=>{
 const input=requiredInput('GEOGRAPHIC_RENEWAL262_NATIVE_INPUT','GEOGRAPHIC_RENEWAL262_NATIVE_INPUT_SHA256'),raw=await decodeStoredSave(input.bytes);
 writeTestFileSync('artifacts/geographic-v417-native-resume/01-native-export-RAW-BEFORE-ADMISSION.json',raw);
 let root=deserializeCampaign(raw);actual262(root);expect([root.width,root.height]).toEqual([325,325]);expect(root.tiles).toHaveLength(105625);expect(root.worldMaps!.sites).toHaveLength(1);expect(root.worldMaps!.sites[0]!.kind).toBe('settlement');expect(root.worldMaps!.mapSize).toEqual({width:325,height:325});
 expect(root.climate).toMatchObject({revision:4,adoptedAt:0,irregular262:true});expect(root.wildlife?.profile).toBe('geographic-fauna-v3');expect(root.wildlife?.geographicRenewal262).toEqual({revision:1,adoptedAt:0,lastTick:root.tick});
 const baseline=serializeCampaign(root),tick=root.tick,marker=structuredClone(root.wildlife!.geographicRenewal262!);expect(baseline).toBe(raw);
 // Reassignment drops the admitted input World; the only tick runs on this
 // independent RAW reload. Encoder/Decoder below retain one SIM and one MAIN,
 // never three campaigns or a second generation.
 root=deserializeCampaign(baseline);actual262(root);expect(serializeCampaign(root)).toBe(baseline);
 {
  const encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();
  {const packet=structuredClone(encoder.encode(root,0,0));expect(packet.kind).toBe('checkpoint');expect(packet).toHaveProperty('world');const adopted=decoder.adopt(packet);expect(adopted.status).toBe('applied');if(adopted.status!=='applied')throw Error('Actual checkpoint adoption required');expect(adopted.world).toEqual(registeredMapPresentation(root));expect(adopted.world.wildlife?.geographicRenewal262).toEqual(marker);expect(adopted.world.climate).toMatchObject({irregular262:true});}
  stepWorld(root,1);expect(root.tick).toBe(tick+1);expect(root.wildlife!.geographicRenewal262).toEqual({...marker,lastTick:tick+1});rawCheckpoint(root,'02-one-real-tick-before-transport');
  {const packet=structuredClone(encoder.encode(root,0,0));expect(packet.kind).toBe('delta');const adopted=decoder.adopt(packet);expect(adopted.status).toBe('applied');if(adopted.status!=='applied')throw Error('Actual delta adoption required');expect(adopted.world).toEqual(registeredMapPresentation(root));expect(adopted.world.wildlife?.geographicRenewal262).toEqual({...marker,lastTick:tick+1});expect(adopted.world.climate).toMatchObject({irregular262:true});}
 }
 const after=serializeCampaign(root);root=deserializeCampaign(after);actual262(root);expect(serializeCampaign(root)).toBe(after);expect(root.tick).toBe(tick+1);expect(root.wildlife!.geographicRenewal262).toEqual({...marker,lastTick:tick+1});expect(readFileSync(input.path,'utf8')).toBe(input.bytes);
},120_000);

/** Separate acquired two-map migration. No step/combat/Camp and no migration
 * enrichment: original root home0 and embedded selected Battlefield2 each reject
 * both future262 namespaces before the accepted number-only conversion. */
test.skipIf(process.env.GEOGRAPHIC_RENEWAL262_OLD261_RESUME!=='1')('actual animal03 two-map261: strict original bodies then number-only262, no retroactive marker or time',()=>{
 const input=requiredInput('GEOGRAPHIC_RENEWAL262_OLD261','GEOGRAPHIC_RENEWAL262_OLD261_SHA256',ANIMAL261_SHA),bytes=input.bytes;
 type RawMap={width:number;height:number;wildlife:Record<string,unknown>;climate:Record<string,unknown>};type RawAnimal261=RawMap&{schemaVersion:number;tick:number;rng:number;nextId:number;worldMaps:{selectedMapId:number;sites:{id:number;map?:RawMap}[]}};
 const bodies=(raw:RawAnimal261)=>[{id:raw.worldMaps.sites.find(s=>!s.map)!.id,map:raw as RawMap},...raw.worldMaps.sites.flatMap(s=>s.map?[{id:s.id,map:s.map}]:[])];
 {const old=JSON.parse(bytes);expect([old.schemaVersion,old.tick,old.rng,old.nextId,old.worldMaps.selectedMapId]).toEqual([261,1000,2997821375,64517,2]);expect(bodies(old).map(r=>[r.id,r.map.width,r.map.height])).toEqual([[0,250,250],[2,90,90]]);for(const {map}of bodies(old)){expect(map.wildlife).toBeDefined();expect(map.climate?.revision).toBe(4);expect(Object.hasOwn(map.wildlife,'geographicRenewal262')).toBe(false);expect(Object.hasOwn(map.climate,'irregular262')).toBe(false);}}
 // A positive admitted source first prevents an unrelated old-data rejection
 // from masquerading as proof of the future-field guards below.
 {const current=deserializeCampaign(bytes);actual262(current);expect(serializeCampaign(current)).toBe(bytes.replace(/^\{"schemaVersion":261,/, '{"schemaVersion":262,'));expect(registeredMaps(current)).toHaveLength(2);for(const map of registeredMaps(current)){expect(Object.hasOwn(map.wildlife??{},'geographicRenewal262')).toBe(false);expect(Object.hasOwn(map.climate??{},'irregular262')).toBe(false);}}
 for(const id of [0,2])for(const future of ['renewal','temperature']){
  const forged=JSON.parse(bytes),map=bodies(forged).find(r=>r.id===id)!.map;if(future==='renewal')map.wildlife.geographicRenewal262={revision:1,adoptedAt:1000,lastTick:1000};else map.climate.irregular262=true;
  expect(()=>deserializeCampaign(JSON.stringify(forged)),`Original261 map${id} ${future} must reject before migration`).toThrow();
 }
 expect(sha(readFileSync(input.path,'utf8'))).toBe(ANIMAL261_SHA);writeTestFileSync('artifacts/geographic-v417-native-resume/03-old261-two-map-migration-receipt.json',JSON.stringify({input:input.path,inputSHA256:ANIMAL261_SHA,maps:[0,2],tick:1000,rng:2997821375,nextId:64517,onlyRootSchemaChanged:true,checkedFutureFields:['geographicRenewal262','irregular262'],simulationTicks:0},null,2));
},120_000);
