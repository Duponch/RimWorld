import {expect,test} from 'vitest';
import {OCCUPANCY,occupancyOf,clearsGroundItems,groundOccupancyAllows,storageOccupancyAllows} from '../src/sim/occupancy';
import {createWorld} from '../src/sim/engine';
import {footprintCells} from '../src/sim/definitions';
import type {Structure} from '../src/sim/types';
const kinds=['column','urn','stele-large','stele-grand','sarcophagus'] as const;

// Expected facts resolved from current Core XML: all five PassThroughOnly,
// SurfaceType.None, clearBuildingArea=true, canOverlapZones=false. These are
// coexistence/storage facts, not an assertion that traversal is impassable.
test('five monument kinds clear ground items and forbid ground placement, zones and ordinary storage; historical contrasts remain literal',()=>{
 for(const kind of kinds){
  expect(occupancyOf(kind)).toEqual({clearItems:true,items:false,zones:false,store:false});
 }
 expect(OCCUPANCY.table).toEqual({clearItems:false,items:true,zones:false,store:false});
 expect(OCCUPANCY.fence).toEqual({clearItems:false,items:true,zones:true,store:true});
 expect(OCCUPANCY.shelf).toEqual({clearItems:true,items:true,zones:false,store:true});
});
test('actual 1x1/2x2/3x3 and rotated sarcophagus footprints reject item destinations in every occupied cell without changing World',()=>{
 // Declared small occupancy fixture only; no generated/built ruin or item
 // movement is credited. Real footprint and public occupancy readers are used.
 const w=createWorld(809,32,32);w.structures=[];w.jobs=[];
 for(const t of w.tiles){t.terrain='grass';delete t.floor;delete t.bridge;delete t.collapsedRock;}
 for(const kind of kinds)for(const orientation of kind==='sarcophagus'?([0,1,2,3] as const):([0] as const)){
  const structure:Structure={id:w.nextId++,kind,x:12,z:12,orientation,footprint:'standard',material:'marble-blocks'};
  w.structures=[structure];const before=JSON.stringify(w);
  expect(clearsGroundItems(w,kind)).toBe(true);
  for(const cell of footprintCells(structure)){
   expect(groundOccupancyAllows(w,cell)).toBe(false);
   expect(storageOccupancyAllows(w,cell)).toBe(false);
  }
  expect(groundOccupancyAllows(w,{x:5,z:5})).toBe(true);
  expect(storageOccupancyAllows(w,{x:5,z:5})).toBe(true);
  expect(JSON.stringify(w)).toBe(before);
 }
});
