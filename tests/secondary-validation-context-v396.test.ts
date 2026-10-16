import {expect,test} from 'vitest';
import {validateWorld,deserializeWorld} from '../src/sim/serialization.ts';
import {secondaryContext,secondaryValidationContext,campaignAuthority,isSecondaryContext} from '../src/sim/secondary-site-context.ts';
import {createDeteriorationState} from '../src/sim/deterioration-content.ts';
import {SCHEMA_VERSION} from '../src/sim/types.ts';
import {preparedCassandraExpedition} from './scenarios/secondary-incidents-v379.ts';

const differentRng=(rng:number)=>rng===1?2:1;

test('validation of imported two-map data does not install a stale runtime view before a prospective map change',()=>{
  const {w}=preparedCassandraExpedition(),raw=structuredClone(w),before=JSON.stringify(raw);
  expect(validateWorld(raw)).toEqual([]);expect(JSON.stringify(raw)).toBe(before);
  const map=raw.secondarySite!.map;
  const nextClock={...map.deterioration!,rng:differentRng(map.deterioration!.rng)};
  map.deterioration=nextClock;
  const view=secondaryValidationContext(raw)!;
  expect(view.deterioration).toBe(nextClock);expect(isSecondaryContext(view)).toBe(true);expect(campaignAuthority(view)).toBe(raw);
  expect(secondaryContext(raw)!.deterioration).toBe(nextClock);
});

test('two original 251 maps validate before neutral252 adoption without a validation-created local cache',()=>{
  const {w}=preparedCassandraExpedition(),old=structuredClone(w);
  (old as {schemaVersion:number}).schemaVersion=251;delete old.deterioration;delete old.secondarySite!.map.deterioration;
  const serialized=JSON.stringify(old),expected=structuredClone(old);
  expected.schemaVersion=SCHEMA_VERSION;expected.deterioration=createDeteriorationState(old.seed,old.tick);
  expected.secondarySite!.map.deterioration=createDeteriorationState(old.secondarySite!.map.seed,old.tick);
  const migrated=deserializeWorld(serialized);
  expect(migrated).toEqual(expected);expect(JSON.stringify(old)).toBe(serialized);expect(validateWorld(migrated)).toEqual([]);
  expect(secondaryContext(migrated)!.deterioration).toBe(migrated.secondarySite!.map.deterioration);
});

test('live pre-flush replacements retain local authority and strict clock validation',()=>{
  const {w,local}=preparedCassandraExpedition(),before=JSON.stringify(w),map=w.secondarySite!.map;
  const liveClock={...local.deterioration!,rng:differentRng(local.deterioration!.rng)};
  local.deterioration=liveClock;local.piles=local.piles.slice();
  expect(map.deterioration).not.toBe(liveClock);expect(map.piles).not.toBe(local.piles);
  const view=secondaryValidationContext(w)!;
  expect(view.deterioration).toBe(liveClock);expect(view.piles).toBe(local.piles);expect(view.tick).toBe(w.tick);
  expect(Object.getOwnPropertyDescriptor(view,'tick')).toMatchObject({value:w.tick});
  expect(isSecondaryContext(view)).toBe(true);expect(campaignAuthority(view)).toBe(w);expect(validateWorld(w)).toEqual([]);
  const validRng=liveClock.rng;liveClock.rng=0;
  expect(validateWorld(w).some(e=>/Second site:.*deterioration/i.test(e))).toBe(true);
  liveClock.rng=validRng;expect(JSON.stringify(w)).toBe(before);expect(validateWorld(w)).toEqual([]);
});
