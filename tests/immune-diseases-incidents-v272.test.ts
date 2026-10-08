import {expect,test} from 'vitest';
import {SnapshotDecoder,SnapshotEncoder} from '../src/bridge/snapshots.ts';
import {crashlandedProfile} from '../src/sim/game-profile.ts';
import {stepWorld} from '../src/sim/engine.ts';
import {adoptFluIncidents,adoptImmuneDiseaseIncidents,advanceFluIncidents,FLU_FIRST_CHECK,
  resolveImmuneDiseaseIncident} from '../src/sim/flu-incidents.ts';
import {validFluIncidents} from '../src/sim/flu-incidents-save.ts';
import {createMedicalRecord} from '../src/sim/injury-state.ts';
import {createScenarioWorld} from '../src/sim/new-game.ts';
import {resolveSite} from '../src/sim/site.ts';
import {deserializeWorld,serializeWorld} from '../src/sim/serialization.ts';
import type {World} from '../src/sim/types.ts';
import {deconstructionCamp} from './scenarios/deconstruction.ts';

function colony(count=1){
  const w=deconstructionCamp(count);w.gameProfile=crashlandedProfile();adoptFluIncidents(w);return w;
}
function extension(w:World){w.tick=Math.max(w.tick,1);adoptImmuneDiseaseIncidents(w);return w.fluIncidents!.immuneDiseases!;}
function next(rng:number){let n=rng;n^=n<<13;n^=n>>>17;n^=n<<5;return n>>>0;}
/** Deterministic fixture pin finder, never used by production admission. */
const pins=new Map<number,number>();
function ticketSeed(low:number,high:number){
  const cached=pins.get(low);if(cached!==undefined)return cached;
  const chance=-Math.expm1(-100/(50*1.5*6000));
  for(let seed=1;seed<=1_000_000;seed++){
    const first=next(seed),ticket=next(first)/0x100000000*470;
    if(first/0x100000000<chance&&ticket>=low&&ticket<high){pins.set(low,seed);return seed;}
  }
  throw Error('No fixture disease ticket');
}

test('the extension is adopted only by future play, with no RNG draw or retrospective case',()=>{
  const w=colony(),before=structuredClone(w.fluIncidents),rng=w.rng;
  expect(w.fluIncidents!.immuneDiseases).toBeUndefined();
  adoptImmuneDiseaseIncidents(w);expect(w.fluIncidents).toEqual(before);
  w.tick=1;advanceFluIncidents(w);
  const state=w.fluIncidents!.immuneDiseases!;
  expect(state).toMatchObject({adoptedAt:1,draws:0,episodes:0,cases:0});
  expect({...w.fluIncidents,immuneDiseases:undefined}).toEqual({...before,immuneDiseases:undefined});
  expect(w.rng).toBe(rng);expect(validFluIncidents(w,207)).toBe(true);
  const saved=structuredClone(state);adoptImmuneDiseaseIncidents(w);expect(state).toEqual(saved);
});

test('schema206 preserves the complete old calendar and silently consumes non-Flu tickets',()=>{
  const w=colony();w.schemaVersion=206 as World['schemaVersion'];w.tick=FLU_FIRST_CHECK;
  w.fluIncidents!.rng=ticketSeed(100,200);const rng=w.rng;
  advanceFluIncidents(w);
  expect(w.fluIncidents).toMatchObject({checks:1,fluDraws:0,episodes:0,cases:0});
  expect(w.fluIncidents!.immuneDiseases).toBeUndefined();expect(w.pawns[0]!.health?.immuneDiseases).toBeUndefined();
  expect(w.rng).toBe(rng);expect(validFluIncidents(w,206)).toBe(true);
});

test('plague fills only [100,200), and its victims do not consume the Flu stream',()=>{
  const a=colony(),b=structuredClone(a);b.schemaVersion=206 as World['schemaVersion'];
  a.tick=b.tick=FLU_FIRST_CHECK;a.fluIncidents!.rng=b.fluIncidents!.rng=ticketSeed(100,200);
  advanceFluIncidents(a);advanceFluIncidents(b);
  const {immuneDiseases,...historical}=a.fluIncidents!;
  expect(historical).toEqual(b.fluIncidents);
  expect(immuneDiseases).toMatchObject({adoptedAt:FLU_FIRST_CHECK,draws:1,episodes:1,cases:1});
  expect(a.pawns[0]!.health?.immuneDiseases?.plague?.severity).toBe(1_000_000);
  expect(a.pawns[0]!.health?.immuneDiseases?.malaria).toBeUndefined();
  expect(validFluIncidents(a,207)).toBe(true);
});

test('malaria fills [200,300) only in temperate forests; plague remains usable in all biomes',()=>{
  const w=colony();w.tick=FLU_FIRST_CHECK;w.fluIncidents!.rng=ticketSeed(200,300);advanceFluIncidents(w);
  expect(w.pawns[0]!.health?.immuneDiseases?.malaria?.severity).toBe(1_000_000);
  for(const biome of ['boreal-forest','arid-shrubland'] as const){
    const cold=colony();cold.site=resolveSite(cold.seed,{hilliness:'flat',biome});const ext=extension(cold),rng=ext.rng;
    expect(resolveImmuneDiseaseIncident(cold,'malaria')).toBe(0);expect(ext.rng).toBe(rng);
    expect(resolveImmuneDiseaseIncident(cold,'plague')).toBe(1);
    expect(cold.pawns[0]!.health?.immuneDiseases?.malaria).toBeUndefined();
  }
});

test('victim selection is bounded, disease-specific and protects residual immunity',()=>{
  const w=colony(5),state=extension(w),rng=w.rng;
  const cases=resolveImmuneDiseaseIncident(w,'plague');expect(cases).toBeGreaterThanOrEqual(1);expect(cases).toBeLessThanOrEqual(2);
  expect(state.cases).toBe(cases);expect(w.rng).toBe(rng);
  const alone=colony();extension(alone);const p=alone.pawns[0]!;p.health=createMedicalRecord(alone.tick);
  p.health.immuneDiseases={malaria:{bornAt:alone.tick,severity:0,immunity:600_000_000,luck:1_000_000}};
  expect(resolveImmuneDiseaseIncident(alone,'malaria')).toBe(0);
  expect(resolveImmuneDiseaseIncident(alone,'plague')).toBe(1);
  expect(resolveImmuneDiseaseIncident(alone,'plague')).toBe(0);
});

test('extension state survives reload; malformed/future clocks and counters are refused',()=>{
  const w=createScenarioWorld(42,32,'crashlanded'); // Save at tick zero remains fully neutral.
  const loaded=deserializeWorld(serializeWorld(w));expect(loaded.fluIncidents!.immuneDiseases).toBeUndefined();
  stepWorld(w,1);expect(validFluIncidents(w,207)).toBe(true);
  expect(deserializeWorld(serializeWorld(w)).fluIncidents).toEqual(w.fluIncidents);
  for(const patch of [{adoptedAt:0},{adoptedAt:2},{rng:0},{rng:0x100000000},{draws:1},
    {episodes:1},{cases:1},{extra:1}]){
    const raw=structuredClone(w);Object.assign(raw.fluIncidents!.immuneDiseases!,patch);
    expect(validFluIncidents(raw,207)).toBe(false);
  }
  expect(validFluIncidents(w,206)).toBe(false);
});

test('a corrupt calendar cannot replace a confirmed Decoder world',()=>{
  const w=createScenarioWorld(42,32,'crashlanded'),encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();
  const initial=decoder.adopt(structuredClone(encoder.encode(w,0,6)));expect(initial.status).toBe('applied');
  if(initial.status!=='applied')throw Error('checkpoint');const before=structuredClone(initial.world);
  extension(w).rng=0;
  expect(decoder.adopt(structuredClone(encoder.encode(w,0,6))).status).toBe('resync');expect(initial.world).toEqual(before);
});
