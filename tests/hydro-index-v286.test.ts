import { expect,test } from 'vitest';
import { validateHydroponics } from '../src/sim/farming-save.ts';
import { PowerParentValidationCache } from '../src/sim/power-parent-validation.ts';
import { footprintCells } from '../src/sim/definitions.ts';
import { HYDROPONICS_RESEARCH_COST } from '../src/sim/research.ts';
import { newPowerState } from '../src/sim/power-rules.ts';
import type { Structure } from '../src/sim/types.ts';
import { deconstructionCamp } from './scenarios/deconstruction.ts';

function camp(edge=false){
  const w=deconstructionCamp(0,24);w.structures=[];w.stockpiles=[];w.growingZones=[];
  w.research={project:null,points:0,hydroponics:{points:HYDROPONICS_RESEARCH_COST,completedAt:w.tick}};
  const b:Structure={id:w.nextId++,kind:'hydroponics-basin',x:edge?0:8,z:edge?1:8,orientation:0,footprint:'standard',material:'steel',power:newPowerState('hydroponics-basin')};
  w.structures.push(b);w.growingZones.push({id:w.nextId++,basinId:b.id,plant:'rice',allowSow:true,allowCut:true,cells:footprintCells(b).map(c=>c.z*w.width+c.x).sort((a,b)=>a-b)});
  return {w,b};
}
const collision='Hydroponics overlaps another structure.';

test('hydro index preserves duplicate occurrences, deduplicates multi-cell hits and excludes every self reference',()=>{
  const {w,b}=camp();
  // Identical object twice and another object reusing its ID remain three
  // independent occurrences; multi-cell intersection counts once per occurrence.
  const other:Structure={id:w.nextId++,kind:'table-long',x:b.x,z:b.z,orientation:0,footprint:'standard',material:'wood'};
  w.structures.push(other,other,{...other});
  let raw=validateHydroponics(w,w.schemaVersion),fast=validateHydroponics(w,w.schemaVersion,new PowerParentValidationCache());
  expect(raw.filter(e=>e===collision)).toHaveLength(3);expect(fast).toEqual(raw);
  // A repeated reference to the same basin creates duplicate basin validation
  // errors, but must never be considered its own overlapping neighbor.
  w.structures.push(b);
  raw=validateHydroponics(w,w.schemaVersion);fast=validateHydroponics(w,w.schemaVersion,new PowerParentValidationCache());
  expect(raw.filter(e=>e===collision)).toHaveLength(6);expect(fast).toEqual(raw);
});

test('hydro index retains out-of-map footprint aliases and raw record/coordinate skips',()=>{
  const {w}=camp(true);
  const edge:Structure={id:w.nextId++,kind:'solar-generator',x:23,z:0,orientation:0,footprint:'standard',material:'steel',power:{on:false,parentId:null}};
  w.structures.push(edge,edge,{...edge});
  const baseline=validateHydroponics(w,w.schemaVersion);expect(baseline.filter(e=>e===collision)).toHaveLength(3);
  expect(validateHydroponics(w,w.schemaVersion,new PowerParentValidationCache())).toEqual(baseline);
  for(const patch of [{orientation:4},{x:-1},{x:24},{z:24}]){
    const bad=structuredClone(w);Object.assign(bad.structures.at(-1)!,patch);
    expect(validateHydroponics(bad,bad.schemaVersion,new PowerParentValidationCache())).toEqual(validateHydroponics(bad,bad.schemaVersion));
  }
  const malformed=structuredClone(w);malformed.structures.push(null as never);
  expect(validateHydroponics(malformed,malformed.schemaVersion,new PowerParentValidationCache())).toEqual(validateHydroponics(malformed,malformed.schemaVersion));
});
