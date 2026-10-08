import {expect,test} from 'vitest';
import {SnapshotDecoder,SnapshotEncoder} from '../src/bridge/snapshots.ts';
import {advanceMiscIncidents,MISC_FIRST_CHECK} from '../src/sim/cassandra-misc.ts';
import {validMiscIncidents} from '../src/sim/cassandra-misc-save.ts';
import {stepWorld} from '../src/sim/index.ts';
import {deserializeWorld,serializeWorld,validateWorld} from '../src/sim/serialization.ts';
import {SCHEMA_VERSION,type World} from '../src/sim/types.ts';
import {shortCircuitColony} from './helpers/short-circuit-v266.ts';

function selected():World {
  const w=shortCircuitColony();w.miscIncidents!.rng=21;stepWorld(w);
  expect(w.miscIncidents!.shortCircuits!.count).toBe(1);expect(validateWorld(w)).toEqual([]);return w;
}

test('an ordinary Misc ticket discharges the eligible network exactly once, while an ineligible ticket stays consumed',()=>{
  const w=selected(),rng=w.rng,before=structuredClone(w);
  expect(w.tick).toBe(MISC_FIRST_CHECK);expect(w.miscIncidents!.opportunities).toBe(1);
  expect(w.miscIncidents!.shortCircuits!.last?.energyWd).toBe(5400);expect(w.bombWaves).toHaveLength(2);
  expect(w.structures.filter(s=>s.battery).every(s=>s.battery!.stored===0)).toBe(true);
  advanceMiscIncidents(w);expect(w).toEqual(before);expect(w.rng).toBe(rng);
  const empty=shortCircuitColony(false);empty.miscIncidents!.rng=21;stepWorld(empty);
  expect(empty.miscIncidents!.opportunities).toBe(1);expect(empty.miscIncidents!.shortCircuits!.count).toBe(0);
  expect(empty.bombWaves).toBeUndefined();expect(validateWorld(empty)).toEqual([]);
});

test('schema200 is validated before neutral migration and adoption waits for the first played step',()=>{
  const w=shortCircuitColony(false);delete w.miscIncidents!.shortCircuits;w.schemaVersion=200 as World['schemaVersion'];
  const before=structuredClone(w),restored=deserializeWorld(JSON.stringify(w));
  expect(restored).toEqual({...before,schemaVersion:SCHEMA_VERSION});stepWorld(restored,0);
  expect(restored.miscIncidents!.shortCircuits).toBeUndefined();stepWorld(restored);
  expect(restored.miscIncidents!.shortCircuits).toEqual({adoptedAt:before.tick,count:0});
  const forged=structuredClone(w);forged.miscIncidents!.shortCircuits={adoptedAt:w.tick,count:0};
  expect(()=>deserializeWorld(JSON.stringify(forged))).toThrow('Invalid version 200 save');
});

test('incident history refuses impossible clocks, quantities, counts, radii and future keys',()=>{
  const w=selected();
  const corruptions:Array<(c:World)=>void>=[
    c=>{c.miscIncidents!.shortCircuits!.adoptedAt=c.tick+1;},
    c=>{c.miscIncidents!.shortCircuits!.adoptedAt=c.tick;},
    c=>{c.miscIncidents!.shortCircuits!.count=2;},
    c=>{c.miscIncidents!.shortCircuits!.lastStart!++;},
    c=>{c.miscIncidents!.shortCircuits!.last!.conduitId=c.nextId;},
    c=>{c.miscIncidents!.shortCircuits!.last!.center.x=c.width;},
    c=>{c.miscIncidents!.shortCircuits!.last!.flameRadius=14.9;},
    c=>{delete c.miscIncidents!.shortCircuits!.last!.bombRadius;},
    c=>{c.miscIncidents!.shortCircuits!.last!.ignited=true;},
    c=>{const r=c.miscIncidents!.shortCircuits!.last!;r.energyWd=20+1e-10;r.flameRadius=1.5;delete r.bombRadius;},
    c=>{Object.assign(c.miscIncidents!.shortCircuits!.last!,{future:true});},
    c=>{Object.assign(c.miscIncidents!.shortCircuits!,{future:true});},
  ];
  for(const corrupt of corruptions){const c=structuredClone(w);corrupt(c);expect(validMiscIncidents(c.miscIncidents,SCHEMA_VERSION,c)).toBe(false);}
});

test('saving before the captured wave advances and resuming preserves all real consequences',()=>{
  const w=selected(),restored=deserializeWorld(serializeWorld(w));expect(restored).toEqual(w);
  expect(w.bombWaves!.every(wave=>wave.nextCell===0)).toBe(true);
  for(let i=0;i<5;i++){stepWorld(w);stepWorld(restored);expect(restored).toEqual(w);expect(validateWorld(w)).toEqual([]);}
  expect(w.bombWaves).toBeUndefined();expect(w.miscIncidents!.shortCircuits!.last?.energyWd).toBe(5400);
  expect(w.structures.some(s=>s.id===w.miscIncidents!.shortCircuits!.last!.conduitId)).toBe(false);
});

test('decoder refuses forged captured-wave provenance atomically and keeps its previous view',()=>{
  const w=selected(),encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();
  const first=decoder.adopt(structuredClone(encoder.encode(w,0,6)));expect(first.status).toBe('applied');
  if(first.status!=='applied')throw Error('checkpoint');const before=structuredClone(first.world);
  w.bombWaves![0]!.shortCircuit!.radius=14.9;
  expect(decoder.adopt(structuredClone(encoder.encode(w,0,6))).status).toBe('resync');expect(first.world).toEqual(before);
  w.bombWaves![0]!.shortCircuit!.radius=before.bombWaves![0]!.shortCircuit!.radius;
  expect(decoder.adopt(structuredClone(encoder.encode(w,0,6,true))).status).toBe('applied');expect(first.world).toEqual(before);
});
