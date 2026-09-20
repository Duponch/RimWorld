import { expect,test } from 'vitest';
import { createWorld } from '../src/sim/engine';
import { growingJobValid } from '../src/sim/farming';
import { footprintCells,STRUCTURE_DEFINITIONS } from '../src/sim/definitions';
import { TemperatureView } from '../src/sim/temperature';
import type { Job,StructureKind,World } from '../src/sim/types';

/** The pre-V88 full-field capture is an independent oracle for the targeted
 * capture. Both deliberately call the same unchanged intention rules. */
function fullContext(w:World) {
  const objects=[...w.structures.filter(s=>s.kind!=='power-conduit'),...w.jobs.filter(j=>j.kind==='install'||j.kind!=='power-conduit'&&j.kind in STRUCTURE_DEFINITIONS)];
  return {resources:new Map(w.resources.map(r=>[r.z*w.width+r.x,r])),fixed:new Set(objects.flatMap(s=>footprintCells(s).map(c=>c.z*w.width+c.x))),temperatures:new TemperatureView(w)};
}

test('point agricultural validation retains complete-field decisions, neighbour clearing and mutation boundaries',()=>{
  const w=createWorld(42,16,16);w.tiles=w.tiles.map(()=>({terrain:'grass'}));w.jobs=[];w.structures=[];w.resources=[];w.piles=[];
  w.growingZones=[{id:900,plant:'rice',cells:Array.from({length:256},(_,i)=>i),allowSow:true,allowCut:true}];
  w.resources=[{id:901,kind:'tree',x:6,z:6,amount:30},{id:902,kind:'rice',x:8,z:8,amount:6,growth:1,growthTick:w.tick}];
  const base:Job={id:903,kind:'sow',x:7,z:6,orientation:0,footprint:'standard',growingZoneId:900,status:'pending',reservedBy:null,progress:0,escrow:{wood:0,food:0}};
  const targets=[{kind:'sow',x:4,z:4},{kind:'sow',x:7,z:6},{kind:'chop',x:6,z:6},{kind:'harvest',x:8,z:8},{kind:'cut',x:8,z:8}] as const;
  const check=()=>{
    const context=fullContext(w);
    for(const target of targets)for(const reservedBy of [null,w.pawns[0]!.id]) {
      const job={...base,...target,reservedBy};expect(growingJobValid(w,job)).toBe(growingJobValid(w,job,context));
    }
  };
  expect(growingJobValid(w,{...base,kind:'chop',x:6,z:6})).toBe(true);
  expect(growingJobValid(w,{...base,kind:'harvest',x:8,z:8})).toBe(true);
  check();
  for(const kind of Object.keys(STRUCTURE_DEFINITIONS) as StructureKind[])for(const orientation of [0,1,2,3] as const) {
    w.structures=[{id:904,kind,x:7,z:6,orientation,footprint:'standard'}];check();
    w.structures=[];w.jobs=[{...base,id:904,kind,growingZoneId:undefined,x:7,z:6,orientation,construction:'frame'}];check();
  }
  // Each new validation must see the new world even within the same tick.
  w.jobs=[];w.structures=[];w.resources=w.resources.filter(r=>r.kind!=='tree');check();
  expect(growingJobValid(w,{...base,kind:'chop',x:6,z:6})).toBe(false);
  w.growingZones=[{...w.growingZones[0]!,allowSow:false,allowCut:false}];check();
});
