import { createWorld, refreshStock } from '../../src/sim/index.ts';
import { newCampfireFuel } from '../../src/sim/fuel.ts';
import type { StructureKind, World } from '../../src/sim/types.ts';

export function deconstructionCamp(count=1,size=32):World {
  const w=createWorld(42,size,size), original=w.pawns[0]!;
  w.resources=[];w.piles=[];w.jobs=[];w.structures=[];w.tiles=w.tiles.map(()=>({terrain:'grass'}));
  w.pawns=Array.from({length:count},(_,i)=>({...structuredClone(original),id:w.nextId++,name:`Bâtisseur ${i+1}`,
    x:Math.floor(size/2)-3+i%10,z:Math.floor(size/2)+Math.floor(i/10)*2,hunger:100,rest:100,
    priorities: {firefight:0,warden:0,basic:3,hunt:0,research:0, patient:0,bedrest:0,doctor:0,craft:2,mine:2,build:1,haul:0,gather:0,grow:0,cook:0}}));
  for(const p of w.pawns){delete p.medicalCare;p.schedule.fill('anything');}refreshStock(w);return w;
}
export function fixtureBuilding(w:World,kind:StructureKind,x:number,z:number,orientation:0|1|2|3=0) {
  const building={id:w.nextId++,kind,x,z,orientation,footprint:'standard' as const,...(kind==='campfire'?{fuel:newCampfireFuel(),bills:[]}: {})};
  w.structures.push(building);return building;
}
