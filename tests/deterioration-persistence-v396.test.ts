import {expect,test} from 'vitest';
import {serializeWorld,deserializeWorld,validateWorld} from '../src/sim/serialization.ts';
import {SnapshotEncoder,SnapshotDecoder} from '../src/bridge/snapshots.ts';
import {createDeteriorationState,DETERIORATION_INTERVAL} from '../src/sim/deterioration-content.ts';
import {validDeteriorationHistoricalTransport,validDeteriorationTransport} from '../src/sim/deterioration-save.ts';
import {campaignPresentation} from '../src/sim/secondary-site-presentation.ts';
import {secondaryContext,flushSecondaryContext} from '../src/sim/secondary-site-context.ts';
import {SCHEMA_VERSION,type World} from '../src/sim/types.ts';
import {equipmentCamp} from './scenarios/equipment.ts';
import {preparedCassandraExpedition} from './scenarios/secondary-incidents-v379.ts';

/** Boundary preparation only: no exposure or damage history is credited. */
function current(){
 const w=equipmentCamp(1);if(w.fires)w.fires.clockCore=w.tick*10;
 w.deterioration=createDeteriorationState(w.seed,w.tick);return w;
}
function old251(w:World){
 const old=structuredClone(w);(old as {schemaVersion:number}).schemaVersion=251;delete old.deterioration;
 if(old.secondarySite)delete old.secondarySite.map.deterioration;
 return old;
}
const checkpoint=(w:World)=>new SnapshotDecoder().adopt(structuredClone(new SnapshotEncoder().encode(w,0,0)));

test('252 exact local calendar and same-tick RNG change survive file/checkpoint/delta without main RNG mutation',()=>{
 const w=current(),before=JSON.stringify(w),rng=w.rng;
 expect(DETERIORATION_INTERVAL).toBe(25);expect(validateWorld(w)).toEqual([]);
 expect(deserializeWorld(serializeWorld(w))).toEqual(w);
 const encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();
 const full=structuredClone(encoder.encode(w,0,0));const first=decoder.adopt(full);expect(first.status).toBe('applied');
 if(first.status!=='applied')throw Error('Expected initial adoption');const frozen=JSON.stringify(first.world);
 w.deterioration!.rng=w.deterioration!.rng===1?2:1;
 const delta=structuredClone(encoder.encode(w,0,0));expect(delta.kind).toBe('delta');
 const second=decoder.adopt(delta);expect(second.status).toBe('applied');
 if(second.status==='applied')expect(second.world).toEqual(w);
 expect(JSON.stringify(first.world)).toBe(frozen);expect(w.rng).toBe(rng);expect(before).not.toBe(JSON.stringify(w));
});

test('251 original two-map validation precedes neutral prospective calendar adoption',()=>{
 const {w}=preparedCassandraExpedition(),old=old251(w),before=JSON.stringify(old);
 const migrated=deserializeWorld(before),expected=structuredClone(old);
 expected.schemaVersion=SCHEMA_VERSION;expected.deterioration=createDeteriorationState(old.seed,old.tick);
 expected.secondarySite!.map.deterioration=createDeteriorationState(old.secondarySite!.map.seed,old.tick);
 expect(migrated).toEqual(expected);expect(migrated.rng).toBe(old.rng);expect(JSON.stringify(old)).toBe(before);
 expect(migrated.deterioration).not.toBe(migrated.secondarySite!.map.deterioration);
 const corrupt=structuredClone(old);corrupt.secondarySite!.map.pawns[0]!.orders.queue='broken' as never;
 expect(()=>deserializeWorld(JSON.stringify(corrupt))).toThrow(/Invalid version251/);
});

test('old RAW/full/delta, inactive-map and archive future clocks refuse before adoption without replacing the owner graph',()=>{
 const base=old251(current());
 const probes:Array<(w:Record<string,any>)=>void>=[
  w=>w.deterioration={revision:1,rng:1,lastTick:w.tick},
  w=>w.pawns[0].deterioration={revision:1,rng:1,lastTick:w.tick},
  w=>w.piles[0].deterioration={revision:1,rng:1,lastTick:w.tick},
  w=>w.groupLosses=[{pawn:{deterioration:{revision:1,rng:1,lastTick:w.tick}}}],
  w=>w.visitors={departed:[{pawn:{deterioration:{revision:1,rng:1,lastTick:w.tick}}}]},
 ];
 for(const probe of probes){const bad=structuredClone(base);probe(bad);const frozen=JSON.stringify(bad);
  expect(validDeteriorationHistoricalTransport(bad,251)).toBe(false);
  expect(()=>deserializeWorld(frozen)).toThrow(/deterioration/i);expect(checkpoint(bad).status).toBe('resync');expect(JSON.stringify(bad)).toBe(frozen);
 }
 const {w}=preparedCassandraExpedition(),old=old251(w);old.secondarySite!.map.deterioration=createDeteriorationState(old.seed,old.tick);
 expect(()=>deserializeWorld(JSON.stringify(old))).toThrow(/deterioration/i);
 const encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();const first=decoder.adopt(structuredClone(encoder.encode(base,0,0)));
 expect(first.status).toBe('applied');if(first.status!=='applied')throw Error('Expected old baseline');const frozen=JSON.stringify(first.world);
 const delta=structuredClone(encoder.encode(base,0,0));expect(delta.kind).toBe('delta');
 const bad=structuredClone(delta);bad.world.deterioration=createDeteriorationState(base.seed,base.tick);
 expect(decoder.adopt(bad).status).toBe('resync');expect(JSON.stringify(first.world)).toBe(frozen);
 expect(decoder.adopt(delta).status).toBe('applied');
 expect(validDeteriorationHistoricalTransport({world:{schemaVersion:251},structures:{upserted:[{deterioration:{revision:1,rng:1,lastTick:0}}]}},251)).toBe(false);
});

test('RAW251 schema has precedence over a misleading world envelope before future-field rejection',()=>{
 const base=old251(current());
 const probes:Array<(w:Record<string,any>)=>void>=[
  w=>w.deterioration=createDeteriorationState(w.seed,w.tick),
  w=>w.pawns[0].deterioration=createDeteriorationState(w.seed,w.tick),
  w=>w.groupLosses=[{pawn:{deterioration:createDeteriorationState(w.seed,w.tick)}}],
 ];
 for(const probe of probes){const bad=structuredClone(base) as unknown as Record<string,any>;bad.world={};probe(bad);
  const frozen=JSON.stringify(bad);expect(validDeteriorationHistoricalTransport(bad,251)).toBe(false);
  expect(()=>deserializeWorld(frozen)).toThrow(/deterioration/i);expect(JSON.stringify(bad)).toBe(frozen);
 }
 const {w}=preparedCassandraExpedition(),secondary=old251(w) as unknown as Record<string,any>;secondary.world={};
 secondary.secondarySite.map.deterioration=createDeteriorationState(secondary.seed,secondary.tick);
 expect(validDeteriorationHistoricalTransport(secondary,251)).toBe(false);
 expect(()=>deserializeWorld(JSON.stringify(secondary))).toThrow(/deterioration/i);
});

test('252 strict state rejects absent/future/stale/extra and archived calendars on every boundary',()=>{
 const w=current(),before=JSON.stringify(w);
 const probes:Array<(w:Record<string,any>)=>void>=[
  w=>delete w.deterioration,w=>w.deterioration=undefined,w=>w.deterioration=null,
  w=>w.deterioration.revision=2,w=>w.deterioration.rng=0,w=>w.deterioration.rng=0x100000000,
  w=>w.deterioration.lastTick=w.tick+1,w=>w.deterioration.lastTick=w.tick-25,
  w=>w.deterioration.lastTick=.5,w=>w.deterioration.unused=0,
  w=>w.pawns[0].deterioration={revision:1,rng:1,lastTick:w.tick},
 ];
 for(const probe of probes){const bad=structuredClone(w);probe(bad);
  expect(validDeteriorationTransport(bad,252)).toBe(false);expect(()=>serializeWorld(bad)).toThrow();expect(checkpoint(bad).status).toBe('resync');
 }
 const oldest=structuredClone(w);oldest.deterioration!.lastTick=w.tick-24;
 expect(validDeteriorationTransport(oldest,252)).toBe(true);expect(deserializeWorld(serializeWorld(oldest))).toEqual(oldest);
 const maximal=structuredClone(w);maximal.tick=Number.MAX_SAFE_INTEGER;maximal.deterioration!.lastTick=maximal.tick;
 expect(validDeteriorationTransport(maximal,252)).toBe(true); // No tick+interval overflow in this shape.
 expect(JSON.stringify(w)).toBe(before);
});

test('descriptor-safe historical checks skip large grids and catch cycles/getters without throwing',()=>{
 const archived:Record<string,unknown>={label:'deterioration'};
 for(const key of ['tiles','resources','planet'])Object.defineProperty(archived,key,{enumerable:true,get(){throw Error('Ignored grid');}});
 expect(validDeteriorationHistoricalTransport({pawns:[archived]},251)).toBe(true);
 const cyclic:Record<string,unknown>={};cyclic.self=cyclic;
 expect(validDeteriorationHistoricalTransport({pawns:[cyclic]},251)).toBe(false);
 expect(validDeteriorationHistoricalTransport({get pawns(){throw Error('Malformed owner');}},251)).toBe(false);
 expect(validDeteriorationHistoricalTransport({deterioration:undefined},251)).toBe(false);
 const inherited=Object.create({deterioration:undefined});expect(validDeteriorationHistoricalTransport(inherited,251)).toBe(false);
 const w=current();Object.defineProperty(w.deterioration!,'rng',{enumerable:true,get(){throw Error('Not plain data');}});
 expect(validDeteriorationTransport(w,252)).toBe(false);
});

test('two map-local clocks stay independent through pre-flush presentation and strict inactive validation',()=>{
 const {w,local}=preparedCassandraExpedition();
 w.deterioration=createDeteriorationState(w.seed,w.tick);local.deterioration=createDeteriorationState(local.seed,w.tick);
 local.deterioration.rng=w.deterioration.rng===1?2:1;w.secondarySite!.selected=true;
 const localBefore=structuredClone(local.deterioration),homeBefore=structuredClone(w.deterioration);
 const shown=campaignPresentation(w);expect(shown.deterioration).toEqual(localBefore);expect(shown.deterioration).not.toEqual(homeBefore);
 expect(checkpoint(shown).status).toBe('applied');flushSecondaryContext(w);
 expect(deserializeWorld(serializeWorld(w))).toEqual(w);expect(secondaryContext(w)!.deterioration).toEqual(localBefore);
 const bad=structuredClone(w);bad.secondarySite!.map.deterioration!.lastTick=w.tick-25;
 expect(()=>deserializeWorld(JSON.stringify(bad))).toThrow();expect(w.deterioration).toEqual(homeBefore);
});
