import { expect, test } from 'vitest';
import { stepWorld } from '../src/sim/engine.ts';
import { canStandAt, FURNITURE_TRAVEL } from '../src/sim/furniture-travel.ts';
import { footprintCells } from '../src/sim/definitions.ts';
import { horseshoeCells, recreationSiteValid, recreationSpace, standableRecreationCell } from '../src/sim/recreation-space.ts';
import { newDoorState } from '../src/sim/door-rules.ts';
import { newPowerState } from '../src/sim/power-rules.ts';
import { refreshStock } from '../src/sim/materials.ts';
import { validateWorld } from '../src/sim/serialization.ts';
import { deconstructionCamp } from './scenarios/deconstruction.ts';
import type { StructureKind } from '../src/sim/types.ts';

test('recreation capture matches scalar stopping for every current furniture family and orientation', () => {
  const w = deconstructionCamp();
  // Predicate fixtures intentionally isolate shapes; they do not claim playable
  // electrical/research state for each catalog item.
  for (const kind of Object.keys(FURNITURE_TRAVEL) as StructureKind[]) for (const orientation of [0,1,2,3] as const) {
    const s = {id:w.nextId++,kind,x:16,z:16,orientation,footprint:'standard' as const,...(kind==='door'||kind==='autodoor'||kind==='fence-gate'?{door:newDoorState(w.tick)}:{})};
    w.structures = [s]; w.jobs = []; const space = recreationSpace(w);
    for (const c of [...footprintCells(s),{x:15,z:15},{x:30,z:30}]) {
      expect(standableRecreationCell(w,c,space),`${kind}/${orientation}/${c.x},${c.z}`).toBe(standableRecreationCell(w,c));
      expect(space.standable(c)).toBe(canStandAt(w,c));
    }
  }
});

test('recreation capture preserves blueprint/frame and chunk rules, with fresh same-tick captures after mutation', () => {
  const w = deconstructionCamp(), target = {x:16,z:16};
  for (const kind of ['wall','table','standing-lamp','power-conduit','lay-floor'] as const) for (const construction of ['blueprint','frame'] as const) {
    w.jobs = [{id:w.nextId++,kind,...target,orientation:0,footprint:'standard',construction,status:'pending',reservedBy:null,progress:0,escrow:{wood:0,food:0}}];
    const space = recreationSpace(w);
    expect(standableRecreationCell(w,target,space),`${kind}/${construction}`).toBe(standableRecreationCell(w,target));
  }
  w.jobs = []; const clear = recreationSpace(w); expect(standableRecreationCell(w,target,clear)).toBe(true);
  w.piles.push({id:w.nextId++,kind:'chunk',item:'granite-chunk',quantity:1,owner:{type:'ground',...target}});
  expect(standableRecreationCell(w,target,recreationSpace(w))).toBe(false);
  w.piles = []; expect(standableRecreationCell(w,target,recreationSpace(w))).toBe(true);
});

test('a standing lamp at the only horseshoe place prevents futile recreation admission', () => {
  const w = deconstructionCamp(); w.tick = 2000; const p = w.pawns[0]!;
  Object.assign(p,{x:20,z:16}); for (const key of Object.keys(p.priorities) as (keyof typeof p.priorities)[]) p.priorities[key]=0;
  p.recreation.level=10;p.recreation.bored.solitary=true;p.recreation.tolerance.solitary=60;
  const pin = {id:w.nextId++,kind:'horseshoes' as const,x:16,z:16,orientation:0 as const,footprint:'standard' as const};
  const target={x:21,z:16};
  w.structures.push(pin,{id:w.nextId++,kind:'standing-lamp',...target,orientation:0,footprint:'standard',material:'steel',power:newPowerState('standing-lamp')});
  for (const c of horseshoeCells(pin)) if (c.x!==target.x||c.z!==target.z) w.tiles[c.z*w.width+c.x]={terrain:'water'};
  refreshStock(w); expect(validateWorld(w)).toEqual([]);
  const task={activity:'horseshoes' as const,buildingId:pin.id,target,phase:'travel' as const,elapsed:0};
  expect(recreationSiteValid(w,task)).toBe(false);expect(recreationSiteValid(w,task,recreationSpace(w))).toBe(false);
  stepWorld(w); expect(p.recreation.task).toBeNull();expect(p.motion).toBeUndefined();expect(validateWorld(w)).toEqual([]);
});
