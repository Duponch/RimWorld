import { expect,test } from 'vitest';
import { createWorld,validateWorld,deserializeWorld } from '../src/sim/index.ts';
import { createPodDepartureValidator } from '../src/sim/pod-rescue-projection.ts';
import { withoutTelevisionRecreation } from './scenarios/legacy-skills.ts';
import type { PodRescueDeparture } from '../src/sim/pod-rescue-state.ts';
import { SCHEMA_VERSION } from '../src/sim/types.ts';

test('frozen pod validation supplies later neutral TV only in its temporary current projection',()=>{
  const world=createWorld(42,16,16),pawn=structuredClone(world.pawns[0]!);pawn.state='idle';pawn.jobId=null;pawn.path=[];pawn.orders={active:null,queue:[]};
  withoutTelevisionRecreation({pawns:[pawn]});
  const departure={incidentId:1,tick:world.tick,pawn,items:[]} as PodRescueDeparture,encoded=JSON.stringify(departure);
  const validate=createPodDepartureValidator(view=>validateWorld(view as typeof world));
  expect(validate(departure,SCHEMA_VERSION,world)).toEqual([]);expect(JSON.stringify(departure)).toBe(encoded);
  expect(validate(departure,SCHEMA_VERSION,world)).toEqual([]);expect(JSON.stringify(departure)).toBe(encoded);
  const partial=structuredClone(departure);Object.assign(partial.pawn.recreation.tolerance,{television:0});
  expect(validate(partial,SCHEMA_VERSION,world).length).toBeGreaterThan(0);
  const future=structuredClone(departure);Object.assign(future.pawn.recreation.tolerance,{television:0});Object.assign(future.pawn.recreation.bored,{television:false});
  delete future.pawn.skills.mining;
  const strict=createPodDepartureValidator(view=>{try{deserializeWorld(JSON.stringify(view));return [];}catch(error){return [String(error)];}});
  expect(strict(future,185,world).join(' ')).toMatch(/Invalid version 185 save.*recreation/);
});
