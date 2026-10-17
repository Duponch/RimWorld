import {describe,it,expect} from 'vitest';
import {deconstructionCamp,fixtureBuilding} from './scenarios/deconstruction.ts';
import {actualPlantPhysicalMasks256,actualAdditionalPlantOwners256} from '../src/sim/actual-plant-physical-masks-256.ts';
import {footprintCells} from '../src/sim/definitions.ts';
import {createWildPlantResource256} from '../src/sim/wild-plant-acquisition-v256.ts';
import {addMaterial} from '../src/sim/materials.ts';
import {sowDaylily} from '../src/sim/flower-pot.ts';
import type {Job,Structure} from '../src/sim/types.ts';
function prepared(){const w=deconstructionCamp();w.tiles=w.tiles.map(()=>({terrain:'soil-natural'}));return w;}
const at=(x:number,z:number)=>z*32+x;
describe('actual rare physical flora masks256',()=>{
 it('keeps walk-through beds/tables distinct from standability and true finished solids',()=>{
  const w=prepared(),bed=fixtureBuilding(w,'bed',5,5),table=fixtureBuilding(w,'table-square',9,5);fixtureBuilding(w,'wall',15,5);const masks=actualPlantPhysicalMasks256(w);
  for(const b of [bed,table])for(const cell of footprintCells(b)){expect(masks.normalWalkable[at(cell.x,cell.z)]).toBe(1);expect(masks.coverOrEdifice[at(cell.x,cell.z)]).toBe(1);}
  expect(masks.normalWalkable[at(15,5)]).toBe(0);expect(masks.fullFill[at(15,5)]).toBe(1);expect(Array.from(masks.sandDepth).every(v=>v===0)).toBe(true);
 });
 it('distinguishes SupportsPlants from the spawner edifice refusal and retains conduit freedom',()=>{
  const w=prepared();fixtureBuilding(w,'sleeping-spot',3,3);fixtureBuilding(w,'hydroponics-basin',7,3);fixtureBuilding(w,'power-conduit',12,3);fixtureBuilding(w,'power-switch',14,3);
  const m=actualPlantPhysicalMasks256(w);for(const x of [3,7]){expect(m.coverOrEdifice[at(x,3)]).toBe(1);expect(m.blocksPlanting[at(x,3)]).toBe(0);}
  expect(m.coverOrEdifice[at(12,3)]).toBe(0);expect(m.blocksPlanting[at(12,3)]).toBe(0);expect(m.coverOrEdifice[at(14,3)]).toBe(1);expect(m.blocksPlanting[at(14,3)]).toBe(1);
 });
 it('uses physical doors/fences and actual Thing frames while ignoring unbuilt plans/terrain frames',()=>{
  const w=prepared();fixtureBuilding(w,'door',3,3);fixtureBuilding(w,'fence',5,3);fixtureBuilding(w,'fence-gate',7,3);
  w.jobs=[{id:w.nextId++,kind:'wall',x:10,z:3,construction:'frame',status:'pending',reservedBy:null,progress:0,orientation:0,footprint:'standard',escrow:{wood:0,food:0}},{id:w.nextId++,kind:'wall',x:12,z:3,construction:'blueprint',status:'pending',reservedBy:null,progress:0,orientation:0,footprint:'standard',escrow:{wood:0,food:0}},{id:w.nextId++,kind:'lay-floor',x:14,z:3,construction:'frame',status:'pending',reservedBy:null,progress:0,orientation:0,footprint:'standard',escrow:{wood:0,food:0}}] satisfies Job[];
  const m=actualPlantPhysicalMasks256(w);expect(m.door[at(3,3)]).toBe(1);expect(m.door[at(7,3)]).toBe(1);expect(m.fence[at(5,3)]).toBe(1);expect(m.normalWalkable[at(3,3)]).toBe(1);
  expect(m.coverOrEdifice[at(10,3)]).toBe(1);expect(m.normalWalkable[at(10,3)]).toBe(1);expect(m.fullFill[at(10,3)]).toBe(0);expect(m.coverOrEdifice[at(12,3)]).toBe(0);expect(m.coverOrEdifice[at(14,3)]).toBe(0);
 });
 it('retains ground-only item/packed ownership and never spawns a packed building footprint',()=>{
  const w=prepared(),b=fixtureBuilding(w,'bed',20,20);w.structures=[];w.packed=[{building:b,owner:{type:'ground',x:4,z:4}}];
  const plant=createWildPlantResource256(w,w.nextId++,6,4,'grass',.2,true);if(!plant)throw Error('Missing actual plant constructor');w.resources=[plant];
  addMaterial(w,'chunk',1,{type:'ground',x:8,z:4});addMaterial(w,'wood',3,{type:'ground',x:10,z:4});w.pawns[0]!.x=12;w.pawns[0]!.z=4;addMaterial(w,'chunk',1,{type:'inventory',pawnId:w.pawns[0]!.id});
  const m=actualPlantPhysicalMasks256(w);expect(m.coverOrEdifice[at(4,4)]).toBe(0);expect(m.coverOrEdifice[at(20,20)]).toBe(0);expect(m.blocksPlanting[at(6,4)]).toBe(1);expect(m.fullFill[at(6,4)]).toBe(0);expect(m.coverOrEdifice[at(8,4)]).toBe(1);expect(m.blocksPlanting[at(8,4)]).toBe(1);expect(m.normalWalkable[at(8,4)]).toBe(1);expect(m.coverOrEdifice[at(10,4)]).toBe(0);expect(m.coverOrEdifice[at(12,4)]).toBe(0);
 });
 it('uses the actual bridge surface and never removes solids/rock from normal-walk masks',()=>{
  const w=prepared();w.tiles[at(3,3)]={terrain:'water-deep'};w.tiles[at(5,3)]={terrain:'water-shallow',bridge:true};w.tiles[at(7,3)]={terrain:'water-shallow',bridge:true};fixtureBuilding(w,'wall',7,3);w.tiles[at(9,3)]={terrain:'rock'};
  const m=actualPlantPhysicalMasks256(w);expect(m.normalWalkable[at(3,3)]).toBe(0);expect(m.normalWalkable[at(5,3)]).toBe(1);expect(m.normalWalkable[at(7,3)]).toBe(0);expect(m.normalWalkable[at(9,3)]).toBe(0);expect(m.fullFill[at(9,3)]).toBe(1);
 });
 it('counts the actual live pot plant without manufacturing a resource or counting retained dead plants',()=>{
  const w=prepared();w.resources=[];const live:Structure=fixtureBuilding(w,'flower-pot',4,6),dead:Structure=fixtureBuilding(w,'flower-pot',8,6);fixtureBuilding(w,'flower-pot',12,6);
  live.flower={allowSow:false,plant:sowDaylily(w.tick)};dead.flower={allowSow:true,plant:{...sowDaylily(w.tick),hitPoints:0}};
  const before=JSON.stringify(w),resources=w.resources,nextId=w.nextId;
  expect(actualAdditionalPlantOwners256(w)).toEqual([{cell:at(4,6),defId:'Plant_Daylily',nonStump:true}]);
  expect(w.resources).toBe(resources);expect(w.resources).toEqual([]);expect(w.nextId).toBe(nextId);expect(JSON.stringify(w)).toBe(before);
  live.flower={allowSow:false};expect(actualAdditionalPlantOwners256(w)).toEqual([]);
 });

});
