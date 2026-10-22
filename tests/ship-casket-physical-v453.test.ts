import {expect,test} from 'vitest';
import {shipReactorWorkshop275} from './scenarios/ship-reactor-v451.ts';
import {SHIP_CASKET_CONTENT_277} from '../src/sim/ship-casket-content-277.ts';
import {shipCasketRect277,shipCasketCells277,shipCasketContains277,shipCasketBeamCell277,shipCasketInteraction277} from '../src/sim/ship-casket-geometry-277.ts';
import {shipCasketPlacementRefusal277} from '../src/sim/ship-casket-placement-277.ts';
import {newShipCasketHolder277} from '../src/sim/ship-casket-state-277.ts';
import {newCryptosleepHolder271} from '../src/sim/cryptosleep-state-271.ts';
import {validShipCasketBuilding277} from '../src/sim/ship-casket-owner-save-277.ts';
import {constructionRecipe,constructionSkillRequired,validConstructionMaterial} from '../src/sim/construction-materials.ts';
import {blockedCells} from '../src/sim/pathfinding.ts';
import {canStandAt} from '../src/sim/furniture-travel.ts';
import {RoomTopologyCache} from '../src/sim/room-topology.ts';
import {WindObstructionView} from '../src/sim/wind-rules.ts';
import {penRegion} from '../src/sim/animal-pens.ts';
import {structureBeauty} from '../src/sim/room-beauty.ts';
import {structureMaxHp} from '../src/sim/thing-damage-rules.ts';
import {STRUCTURE_SHOT_FILL} from '../src/sim/combat-content.ts';
import {applyEmpEffect} from '../src/sim/emp-effects.ts';
import {powerWatts,isFlickable} from '../src/sim/power-rules.ts';
import {validatePower} from '../src/sim/power-save.ts';
import {advancePower,reconcilePower} from '../src/sim/power.ts';
import {damageStructure} from '../src/sim/thing-damage.ts';
import type {Structure,Orientation} from '../src/sim/types.ts';

/** Declared local geometry/physics fixture, without an acquisition claim. */
function fixture(orientation:Orientation=2){
 const {w}=shipReactorWorkshop275();w.structures=[];w.resources=[];w.jobs=[];w.piles=[];w.packed=[];
 w.tiles=w.tiles.map(()=>({terrain:'grass'}));w.roofing={constructed:[],build:[],remove:[],cursor:0};
 const c:Structure={id:w.nextId++,kind:'ship-cryptosleep-casket',x:16,z:16,orientation,footprint:'standard',material:'steel',power:{on:false,parentId:null},shipCryptosleep277:newShipCasketHolder277(w.tick)};
 const poses=[{x:16,z:15,orientation:1},{x:14,z:16,orientation:0},{x:16,z:18,orientation:1},{x:17,z:16,orientation:0}] as const;
 const beam:Structure={id:w.nextId++,kind:'ship-beam',...poses[orientation],footprint:'standard',material:'steel',power:{on:false,parentId:null}};
 return {w,c,beam};
}

test('native1×2 footprint, head and interaction use the four distinct orientations and default South',()=>{
 const at={x:16,z:16},golden=[
  {cells:[at,{x:16,z:17}],beam:{x:16,z:15},interaction:{x:17,z:16},rect:{x:16,z:16,width:1,depth:2}},
  {cells:[at,{x:17,z:16}],beam:{x:15,z:16},interaction:{x:16,z:15},rect:{x:16,z:16,width:2,depth:1}},
  {cells:[at,{x:16,z:15}],beam:{x:16,z:17},interaction:{x:15,z:16},rect:{x:16,z:15,width:1,depth:2}},
  {cells:[at,{x:15,z:16}],beam:{x:17,z:16},interaction:{x:16,z:17},rect:{x:15,z:16,width:2,depth:1}},
 ];
 for(const r of [0,1,2,3] as const){const g=golden[r]!;expect(shipCasketCells277(at,r)).toEqual(g.cells);expect(shipCasketRect277(at,r)).toEqual(g.rect);expect(shipCasketBeamCell277(at,r)).toEqual(g.beam);expect(shipCasketInteraction277(at,r)).toEqual(g.interaction);for(const cell of g.cells)expect(shipCasketContains277(at,cell,r)).toBe(true);expect(shipCasketContains277(at,g.beam,r)).toBe(false);expect(shipCasketContains277(at,g.interaction,r)).toBe(false);}
 expect(shipCasketCells277(at)).toEqual(golden[2]!.cells);
});

test('the four placements need a completed exact beam; placement reads are pure and no beam ownership is persisted',()=>{
 for(const orientation of [0,1,2,3] as const){const {w,c,beam}=fixture(orientation),pose={x:c.x,z:c.z,orientation};
  expect(shipCasketPlacementRefusal277(w,pose)).toMatch(/poutre/);w.structures.push(beam);
  const before=JSON.stringify(w);expect(shipCasketPlacementRefusal277(w,pose)).toBeUndefined();expect(JSON.stringify(w)).toBe(before);
  w.structures.push(c);w.structures=w.structures.filter(s=>s!==beam);
  expect(validShipCasketBuilding277(c,277,w,w.tick)).toBe(true);
 }
 const {w,c,beam}=fixture();w.structures.push({...beam,kind:'ship-engine'});expect(shipCasketPlacementRefusal277(w,{x:c.x,z:c.z,orientation:c.orientation})).toMatch(/poutre/);
});

test('full footprint support and roof plus nearby real interaction cells are rechecked, independently from footprint overlap',()=>{
 const {w,c,beam}=fixture();w.structures.push(beam);
 const far={x:16,z:15},index=far.z*w.width+far.x;
 w.tiles[index]={terrain:'marsh'};expect(shipCasketPlacementRefusal277(w,{x:c.x,z:c.z,orientation:c.orientation})).toMatch(/lourde/);w.tiles[index]={terrain:'grass'};
 w.roofing!.constructed=[index];expect(shipCasketPlacementRefusal277(w,{x:c.x,z:c.z,orientation:c.orientation})).toMatch(/sans toit/);w.roofing!.constructed=[];
 // West-facing ordinary casket shares (15,16), but neither its footprint nor
 // the completed beam overlaps the new spatial casket's two occupied cells.
 const other:Structure={id:w.nextId++,kind:'cryptosleep-casket',x:15,z:15,orientation:3,footprint:'standard',material:'steel',power:{on:false,parentId:null},cryptosleep:newCryptosleepHolder271(w.tick)};
 w.structures.push(other);expect(shipCasketPlacementRefusal277(w,{x:c.x,z:c.z,orientation:c.orientation})).toMatch(/interaction/);
 w.structures=w.structures.filter(s=>s!==other);expect(shipCasketPlacementRefusal277(w,{x:c.x,z:c.z,orientation:c.orientation})).toBeUndefined();
});

test('paid recipe, industrial skill and fixed material stay versioned without quality or active power',()=>{
 const {w,c}=fixture();expect(constructionRecipe(c)).toMatchObject({ingredients:SHIP_CASKET_CONTENT_277.ingredients,work:800,coreWork:8000});expect(constructionSkillRequired(c.kind)).toBe(8);
 expect(validConstructionMaterial(c.kind,'steel',277)).toBe(true);expect(validConstructionMaterial(c.kind,'steel',276)).toBe(false);expect(validConstructionMaterial(c.kind,'steel',278)).toBe(false);expect(validConstructionMaterial(c.kind,'wood',277)).toBe(false);
 expect(powerWatts(c,w)).toBe(0);expect(isFlickable(c.kind)).toBe(false);
});

test('both cells pass travel and air/pen flood but forbid standing, block wind, and use200HP, half shot fill and no EMP',()=>{
 for(const orientation of [0,1,2,3] as const){
  const {w,c}=fixture(orientation);w.structures.push(c);
  const marker:Structure={id:w.nextId++,kind:'pen-marker',x:2,z:2,orientation:0,footprint:'standard',material:'wood',pen:{accepted:['muffalo']}};w.structures.push(marker);
  const cells=shipCasketCells277(c,orientation),travel=blockedCells(w),room=new RoomTopologyCache().read(w),wind=new WindObstructionView(w),pen=penRegion(w,marker.id);
  expect(pen).toBeDefined();for(const cell of cells){const i=cell.z*w.width+cell.x;expect(travel[i]).toBe(0);expect(canStandAt(w,cell)).toBe(false);expect(room.at(cell.x,cell.z)?.kind).toBe('space');expect(wind.blocked(cell)).toBe(true);expect(pen!.cells.has(i)).toBe(true);}
  expect(structureMaxHp(c)).toBe(200);expect(structureBeauty(c)).toBe(0);expect(STRUCTURE_SHOT_FILL[c.kind]).toBe(.5);expect(validatePower(w,277)).toEqual([]);
  const before=structuredClone(c),rng=w.rng;expect(applyEmpEffect(w,c,50,w.tick*10)).toBe(false);expect(c).toEqual(before);expect(w.rng).toBe(rng);
 }
});

test('a passive spatial casket really conducts the grid while never becoming a switched consumer; its removal cuts the distant lamp',()=>{
 const {w,c}=fixture(1);Object.assign(c,{x:16,z:8});
 const reactor:Structure={id:w.nextId++,kind:'ship-reactor',x:12,z:8,orientation:1,footprint:'standard',material:'steel',power:{on:true,parentId:null}};
 const lamp:Structure={id:w.nextId++,kind:'standing-lamp',x:23,z:8,orientation:0,footprint:'standard',material:'steel',power:{on:false,parentId:null}};
 w.structures.push(c,reactor,lamp);reconcilePower(w);expect(lamp.power!.parentId).toBe(c.id);
 for(let i=0;i<40&&!lamp.power!.on;i++){w.tick++;advancePower(w);}expect(lamp.power!.on).toBe(true);expect(c.power).toEqual({on:false,parentId:null});expect(powerWatts(c,w)).toBe(0);
 expect(damageStructure(w,c,200,'bullet')).toBe(true);for(let i=0;i<3;i++){w.tick++;advancePower(w);}
 expect(lamp.power!.on).toBe(false);expect(w.structures.includes(c)).toBe(false);expect(validatePower(w,277)).toEqual([]);
});
