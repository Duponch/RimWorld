import {test,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {deserializeCampaign,serializeCampaign,validateWorld} from '../src/sim/serialization';
import {registeredMaps} from '../src/sim/world-map-context';
import {registeredMapPresentation} from '../src/sim/world-map-presentation';
import {SnapshotEncoder,SnapshotDecoder} from '../src/bridge/snapshots';
import {SCHEMA_VERSION,type World} from '../src/sim/types';
import type {CampaignState} from '../src/sim/world-map-state';
import {writeTestFileSync} from './test-output';

const ANIMAL261_SHA='7e6b579ddd93f3ff1822cbbcd98166749b8feb833119e963e30cb121a7fff492';
const sha=(s:string)=>createHash('sha256').update(s).digest('hex');
type RawMap=Record<string,unknown>&{width:number;height:number;wildlife:Record<string,unknown>;climate:Record<string,unknown>};
type RawHistorical=RawMap&{schemaVersion:number;tick:number;rng:number;nextId:number;worldMaps:{rootMapId:number;selectedMapId:number;sites:(Record<string,unknown>&{id:number;map?:RawMap})[]};worldGroups:{groups:Record<string,unknown>[]};worldFactions:{settlements:Record<string,unknown>[]}};
const bodies=(raw:RawHistorical)=>[{id:raw.worldMaps.rootMapId,map:raw as RawMap},...raw.worldMaps.sites.flatMap(s=>s.map?[{id:s.id,map:s.map}]:[])];
function actual263(root:CampaignState):asserts root is World {
 if(Number(root.schemaVersion)!==263||!('tiles'in root))throw Error('Actual admitted two-map263 required');
 expect(validateWorld(root)).toEqual([]);
}

/** Reuses ONLY the acquired animal03 two-map261 source and the existing262
 * resume input names. No step/engine, factory, encounter, new parent or pending
 * producer is imported. The intermediate262 bytes differ only by their number.
 * Forged rows below are negative raw namespace witnesses, never playable data. */
test.skipIf(process.env.WORLD_SITES263_OLD261_RESUME!=='1')('animal03 two-map261/262: strict future263 namespaces, neutral263 migration and same-tick transport',()=>{
 expect(SCHEMA_VERSION).toBe(263);
 const path=process.env.GEOGRAPHIC_RENEWAL262_OLD261,expectedSHA=process.env.GEOGRAPHIC_RENEWAL262_OLD261_SHA256;
 if(!path||expectedSHA!==ANIMAL261_SHA)throw Error('Explicit acquired GEOGRAPHIC_RENEWAL262_OLD261 and exact _SHA256 required; no factory/fallback');
 const bytes=readFileSync(path,'utf8');expect(sha(bytes)).toBe(ANIMAL261_SHA);expect(bytes.startsWith('{"schemaVersion":261,')).toBe(true);
 const stage262=bytes.replace(/^\{"schemaVersion":261,/, '{"schemaVersion":262,'),expected263=bytes.replace(/^\{"schemaVersion":261,/, '{"schemaVersion":263,');
 {
  const old:RawHistorical=JSON.parse(bytes);
  expect([old.schemaVersion,old.tick,old.rng,old.nextId,old.worldMaps.selectedMapId]).toEqual([261,1000,2997821375,64517,2]);
  expect(bodies(old).map(r=>[r.id,r.map.width,r.map.height])).toEqual([[0,250,250],[2,90,90]]);
  expect(old.worldGroups.groups).toEqual([]);expect(old.worldFactions.settlements.length).toBeGreaterThan(0);
  for(const {map}of bodies(old))for(const key of ['worldSites263','worldDefence263','worldSiteThreat263'])expect(Object.hasOwn(map,key)).toBe(false);
 }
 // Admit each unmodified historical version FIRST. Exact complete bytes prove
 // every original owner/map/story/calendar survives and only the number moves.
 for(const input of [bytes,stage262]){
  let root=deserializeCampaign(input);actual263(root);expect(serializeCampaign(root)).toBe(expected263);expect(registeredMaps(root)).toHaveLength(2);
  for(const map of registeredMaps(root)){expect(Object.hasOwn(map.wildlife??{},'geographicRenewal262')).toBe(false);expect(Object.hasOwn(map.climate??{},'irregular262')).toBe(false);}
  root=deserializeCampaign(expected263);actual263(root);expect(serializeCampaign(root)).toBe(expected263);
  const encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();
  for(const kind of ['checkpoint','delta'] as const){
   const packet=structuredClone(encoder.encode(root,0,0));expect(packet.kind).toBe(kind);
   const adopted=decoder.adopt(packet);expect(adopted.status).toBe('applied');if(adopted.status!=='applied')throw Error('Actual same-tick transport adoption required');
   expect(adopted.world).toEqual(registeredMapPresentation(root));
   const maps=adopted.world.campaignMap;if(maps?.revision!==2)throw Error('Actual registered campaign projection required');
   expect(maps.activeMapId).toBe(2);expect(maps.maps.map(m=>[m.id,m.kind])).toEqual([[0,'settlement'],[2,'battlefield']]);
   expect(serializeCampaign(root)).toBe(expected263);
  }
 }
 // Each copy is rejected at the explicit FUTURE263 authority gate, rather
 // than merely failing later because a fabricated negative row is malformed.
 const checked:string[]=[];
 for(const version of [261,262]){
  const input=version===261?bytes:stage262;
  const reject=(label:string,inject:(raw:RawHistorical)=>void)=>{
   const forged:RawHistorical=JSON.parse(input);inject(forged);const bad=JSON.stringify(forged);
   expect(()=>deserializeCampaign(bad),`${version} ${label}: reject BEFORE migration`).toThrow(`Invalid version${version} save: Historical save contains future263 Site/settlement authority.`);
   expect(forged.schemaVersion).toBe(version);checked.push(`${version}:${label}`);
  };
  for(const id of [0,2]){
   for(const key of ['worldSites263','worldDefence263','worldSiteThreat263'])reject(`map${id}.${key}`,raw=>{bodies(raw).find(r=>r.id===id)!.map[key]=null;});
   reject(`header${id}.target263`,raw=>{raw.worldMaps.sites.find(s=>s.id===id)!.target263=null;});
  }
  // The real source has no group record. This deliberately negative raw row
  // tests own-field rejection only, not a valid pending or encounter fixture.
  reject('negative-group-row.pendingEntry263',raw=>{raw.worldGroups.groups.push({pendingEntry263:null});});
  reject('actual-settlement.attack263',raw=>{raw.worldFactions.settlements[0]!.attack263=null;});
 }
 expect(sha(readFileSync(path,'utf8'))).toBe(ANIMAL261_SHA);
 writeTestFileSync('artifacts/world-sites263-old261-resume/receipt.json',JSON.stringify({input:path,inputSHA256:ANIMAL261_SHA,derived262SHA256:sha(stage262),numberOnly263SHA256:sha(expected263),maps:[0,2],selectedMapId:2,tick:1000,rng:2997821375,nextId:64517,checked,projection:'actual selected Battlefield2 with both true headers; checkpoint then same-tick delta',simulationTicks:0,sourceUnchanged:true},null,2));
},120_000);
