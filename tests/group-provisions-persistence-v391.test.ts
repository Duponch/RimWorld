import {legacyPlanet} from './helpers/legacy-fixture-guards.ts';
import {expect,test} from 'vitest';
import {applyCommand,stepWorld} from '../src/sim/engine.ts';
import {deserializeWorld,serializeWorld,validateWorld} from '../src/sim/serialization.ts';
import {validGroupProvisionsShape,validGroupProvisionsHistoricalTransport} from '../src/sim/group-provisions-save.ts';
import {SnapshotDecoder,SnapshotEncoder} from '../src/bridge/snapshots.ts';
import {tryGroupDeparture} from '../src/sim/group-driver.ts';
import {addMaterial,refreshStock} from '../src/sim/materials.ts';
import {createMedicalRecord,addResolvedInjury,medicalStatus} from '../src/sim/injury-state.ts';
import {BLOOD_UNIT} from '../src/sim/injury-rules.ts';
import {commercialCamp} from './helpers/commercial-v193.ts';
import {preparedCassandraExpedition} from './scenarios/secondary-incidents-v379.ts';
import type {AwayGroup,PreparingGroup} from '../src/sim/group-capture.ts';
import {SCHEMA_VERSION,type World} from '../src/sim/types.ts';
import {createDeteriorationState} from '../src/sim/deterioration-content.ts';

const flag=()=>({revision:1 as const,pemmicanLoadedUnits:0,pemmicanConsumedUnits:0,pemmicanSpoiledUnits:0});
const raw=(v:unknown)=>v as Record<string,any>;
/** Name the old format before its positive baseline: prospective permissions
 * and map clocks were absent, not erased by a permissive migration. */
const as249=(w:World)=>{
  for(const map of [w,w.secondarySite?.map])if(map){
    delete raw(map).deterioration;
    if(map.group){delete map.group.freight;if('baseline' in map.group)delete map.group.baseline.freight;}
  }
  raw(w).schemaVersion=249;return w;
};
function migratedExpected(old:World):World {
  const expected=structuredClone(old);raw(expected).schemaVersion=SCHEMA_VERSION;
  expected.deterioration=createDeteriorationState(expected.seed,expected.tick);
  if(expected.secondarySite)expected.secondarySite.map.deterioration=createDeteriorationState(expected.secondarySite.map.seed,expected.tick);
  return expected;
}
function formation(){
  const {world:w}=commercialCamp(32),members=w.pawns.slice(0,2);
  addMaterial(w,'food',2,{type:'inventory',pawnId:members[0]!.id},'survival-meal');
  expect(applyCommand(w,{type:'planet-adopt'}).ok).toBe(true);
  expect(applyCommand(w,{type:'group-start',memberIds:members.map(p=>p.id),destination:legacyPlanet(w).civilianTile,sources:[]}).ok).toBe(true);
  const g=w.group as PreparingGroup;if(!g||!('manifest' in g))throw Error('Missing formation');
  expect(g.provisions).toEqual(flag());return {w,g,members};
}
/** Only inventory and the final exit frontier are prepared; the existing
 * departure operation performs the original-owner transfer and baseline. */
function away(){
  const {w,g,members}=formation();addMaterial(w,'food',8,{type:'inventory',pawnId:members[0]!.id},'pemmican');
  g.phase='leaving';
  for(const e of g.exits){const p=w.pawns.find(p=>p.id===e.pawnId)!;if(!e.cell)throw Error('No legal exit');p.x=e.cell.x;p.z=e.cell.z;p.path=[];p.moveCooldown=0;p.planCooldown=0;p.state='idle';delete p.motion;}
  tryGroupDeparture(w);const group=w.group as AwayGroup;if(!group||!('members' in group))throw Error('Departure missing');
  group.phase='at-site';group.tile=group.destination;group.route=[group.tile];group.segment=null;group.stop={kind:'at-site'};
  expect(validateWorld(w)).toEqual([]);return {w,g:group};
}
function legacy(){const {w,g}=away();delete g.provisions;delete g.baseline.pemmican;as249(w);return w;}
function refuses(w:World,mutate:(bad:World)=>void){
  const bad=structuredClone(w);mutate(bad);expect(validateWorld(bad).length).toBeGreaterThan(0);expect(()=>deserializeWorld(JSON.stringify(bad))).toThrow();
  const encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder(),first=decoder.adopt(structuredClone(encoder.encode(w,0,0)));
  if(first.status!=='applied')throw Error('Baseline snapshot refused');const before=structuredClone(first.world);
  const packet=structuredClone(encoder.encode(bad,0,0));expect(decoder.adopt(packet).status).toBe('resync');expect(first.world).toEqual(before);
  expect(decoder.adopt(structuredClone(encoder.encode(w,0,0))).status).toBe('applied');
}

test('249 group and pemmican possessions remain literal through current migration, with prospective clocks on both maps',()=>{
  const old=legacy(),before=structuredClone(old),text=JSON.stringify(old),next=deserializeWorld(text);
  expect(next.schemaVersion).toBe(SCHEMA_VERSION);expect(next).toEqual(migratedExpected(before));expect(JSON.stringify(old)).toBe(text);expect(next.group?.provisions).toBeUndefined();
  expect((next.group as AwayGroup).items.some(p=>p.item==='pemmican')).toBe(true);expect(validateWorld(next)).toEqual([]);
  const {w}=preparedCassandraExpedition();as249(w);const both=structuredClone(w);
  expect(deserializeWorld(JSON.stringify(w))).toEqual(migratedExpected(both));
  raw(w.secondarySite!.map).group={provisions:flag()};expect(()=>deserializeWorld(JSON.stringify(w))).toThrow(/provision/i);
});

test('249 refuses only new group permission/baseline/manifest, including secondary/raw/checkpoint/delta and terminal envelopes',()=>{
  const old=legacy();expect(validGroupProvisionsHistoricalTransport(old,249)).toBe(true);
  for(const mutate of [
    (w:World)=>{w.group!.provisions=flag();},(w:World)=>{(w.group as AwayGroup).baseline.pemmican=8;},
    (w:World)=>{raw(w.group).manifest=[{item:'pemmican'}];},(w:World)=>{raw(w).groupLosses=[{provisions:flag()}];},
  ]){const bad=structuredClone(old);mutate(bad);expect(()=>deserializeWorld(JSON.stringify(bad))).toThrow(/provision/i);expect(validGroupProvisionsHistoricalTransport({world:bad},249)).toBe(false);}
  const encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder(),first=decoder.adopt(structuredClone(encoder.encode(old,0,0)));
  expect(first.status).toBe('applied');if(first.status!=='applied')throw Error('Historical witness missing');const before=structuredClone(first.world);
  const future=old;future.group!.provisions=flag();const delta=structuredClone(encoder.encode(future,0,0));expect(delta.kind).toBe('delta');
  expect(decoder.adopt(delta).status).toBe('resync');expect(first.world).toEqual(before);
  expect(new SnapshotDecoder().adopt(structuredClone(new SnapshotEncoder().encode(future,0,0))).status).toBe('resync');
  const grids={group:before.group};for(const key of ['tiles','resources','planet'])Object.defineProperty(grids,key,{enumerable:true,get:()=>{throw Error('Unread grid');}});
  expect(validGroupProvisionsHistoricalTransport(grids,249)).toBe(true);
  expect(validGroupProvisionsHistoricalTransport({get group(){throw Error('Malformed group');}},249)).toBe(false);
});

test('250 requires the exact four-field marker and paired away baseline while unmarked historical groups remain literal',()=>{
  const {w}=away();
  for(const patch of [{revision:2},{pemmicanLoadedUnits:-1},{pemmicanConsumedUnits:.5},{pemmicanSpoiledUnits:Number.MAX_SAFE_INTEGER+1},{extra:0}])
    refuses(w,bad=>Object.assign(bad.group!.provisions!,patch));
  refuses(w,bad=>{delete raw(bad.group!.provisions).pemmicanSpoiledUnits;});
  refuses(w,bad=>{delete (bad.group as AwayGroup).baseline.pemmican;});
  refuses(w,bad=>{delete bad.group!.provisions;});
  const historical=legacy();raw(historical).schemaVersion=250;
  expect(validGroupProvisionsShape(historical.group,250)).toBe(true);
  expect(new SnapshotDecoder().adopt(structuredClone(new SnapshotEncoder().encode(historical,0,0))).status).toBe('applied');
  const unmarked=deserializeWorld(JSON.stringify(historical));expect(unmarked).toEqual(migratedExpected(historical));
  expect(unmarked.group!.provisions).toBeUndefined();expect((unmarked.group as AwayGroup).baseline.pemmican).toBeUndefined();
  expect(validateWorld(unmarked)).toEqual([]);
  expect(validGroupProvisionsShape({provisions:undefined},250)).toBe(false);
});

test('preparing pemmican receipts are separate, require actual future sources and cannot contain consumption or spoilage',()=>{
  const {w,g,members}=formation();addMaterial(w,'food',8,{type:'ground',x:5,z:14},'pemmican');const source=w.piles.at(-1)!;
  g.manifest=[{pileId:source.id,quantity:8,item:'pemmican',carrierId:members[0]!.id}];g.phase='loading';expect(validateWorld(w)).toEqual([]);
  refuses(w,bad=>{bad.piles.find(p=>p.id===source.id)!.quantity=7;});
  source.owner={type:'inventory',pawnId:members[0]!.id};g.manifest[0]!.carriedPileId=source.id;g.cursor=1;g.phase='leaving';g.provisions!.pemmicanLoadedUnits=8;refreshStock(w);
  expect(validateWorld(w)).toEqual([]);expect(g.ledger.foodLoaded).toBe(0);
  for(const field of ['pemmicanLoadedUnits','pemmicanConsumedUnits','pemmicanSpoiledUnits'] as const)refuses(w,bad=>{bad.group!.provisions![field]++;});
  refuses(w,bad=>{bad.group!.ledger.foodLoaded=8;});refuses(w,bad=>{delete bad.group!.provisions;});
});

test('away conservation counts pemmican units separately from survival meals and includes frozen terminal inventories',()=>{
  const {w,g}=away(),pem=g.items.find(p=>p.item==='pemmican')!;
  // Receipts are historical; no equality or ordering is invented against the real exit stock.
  g.provisions!.pemmicanLoadedUnits=20;g.baseline.pemmican=12;g.provisions!.pemmicanConsumedUnits=3;g.provisions!.pemmicanSpoiledUnits=1;
  expect(validateWorld(w)).toEqual([]);expect(g.baseline.food).toBe(2);expect(g.ledger.foodConsumed).toBe(0);
  refuses(w,bad=>{(bad.group as AwayGroup).items.find(p=>p.id===pem.id)!.quantity++;});
  refuses(w,bad=>{bad.group!.provisions!.pemmicanConsumedUnits=13;});
  const person=g.members.find(p=>pem.owner.type==='inventory'&&p.id===pem.owner.pawnId)!;
  person.health=createMedicalRecord(w.tick);addResolvedInjury(person.health,'right-hand','cut',6000,()=>.999999);person.health.bloodLoss=BLOOD_UNIT-1;person.medicalCare='none';
  const status=medicalStatus(person.health);person.state=status==='mobile'?'idle':status;
  for(let i=0;i<6&&!w.groupLosses?.some(l=>l.pawn.id===person.id);i++)stepWorld(w);
  const loss=w.groupLosses?.find(l=>l.pawn.id===person.id);expect(loss?.items.some(p=>p.id===pem.id)).toBe(true);expect(validateWorld(w)).toEqual([]);
  const witness=JSON.stringify(loss),loaded=deserializeWorld(serializeWorld(w));stepWorld(loaded,3);expect(JSON.stringify(loaded.groupLosses!.find(l=>l.pawn.id===person.id))).toBe(witness);
  refuses(w,bad=>{bad.groupLosses!.find(l=>l.pawn.id===person.id)!.items.find(p=>p.id===pem.id)!.quantity--;});
});


test('local collective pemmican inventory is prospective in RAW and both Decoder modes, with refusal retaining the confirmed world',()=>{
  const w=legacy(),encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();
  const first=decoder.adopt(structuredClone(encoder.encode(w,0,0)));expect(first.status).toBe('applied');
  if(first.status!=='applied')throw Error('Historical baseline refused');const before=structuredClone(first.world);
  addMaterial(w,'food',8,{type:'inventory',pawnId:w.pawns[0]!.id},'pemmican');
  expect(()=>deserializeWorld(JSON.stringify(w))).toThrow(/inventory ownership/i);
  const delta=structuredClone(encoder.encode(w,0,0));expect(delta.kind).toBe('delta');expect(decoder.adopt(delta).status).toBe('resync');expect(first.world).toEqual(before);
  expect(new SnapshotDecoder().adopt(structuredClone(new SnapshotEncoder().encode(w,0,0))).status).toBe('resync');
  raw(w).schemaVersion=250;
  // Exact historical250 counterpart still admits the inventory in Decoder.
  expect(new SnapshotDecoder().adopt(structuredClone(new SnapshotEncoder().encode(w,0,0))).status).toBe('applied');
  const upgraded=deserializeWorld(JSON.stringify(w));expect(upgraded.schemaVersion).toBe(SCHEMA_VERSION);
  expect(upgraded).toEqual(migratedExpected(w));expect(validateWorld(upgraded)).toEqual([]);
  expect(deserializeWorld(serializeWorld(upgraded))).toEqual(upgraded);
  expect(new SnapshotDecoder().adopt(structuredClone(new SnapshotEncoder().encode(upgraded,0,0))).status).toBe('applied');
});
