import {expect,test} from 'vitest';
import {shipReactorWorkshop275} from './scenarios/ship-reactor-v451.ts';
import {SHIP_ADDED_KINDS_276,SHIP_ADDED_CONTENT_276,type ShipAddedKind276} from '../src/sim/ship-part-content-276.ts';
import {shipPartCells276,shipPartRect276} from '../src/sim/ship-part-geometry-276.ts';
import {shipPartPlacementRefusal276} from '../src/sim/ship-reactor-placement-275.ts';
import {constructionRecipe,constructionSkillRequired,validConstructionMaterial} from '../src/sim/construction-materials.ts';
import {blockedCells} from '../src/sim/pathfinding.ts';
import {RoomTopologyCache} from '../src/sim/room-topology.ts';
import {WindObstructionView} from '../src/sim/wind-rules.ts';
import {penRegion} from '../src/sim/animal-pens.ts';
import {structureBeauty} from '../src/sim/room-beauty.ts';
import {structureMaxHp} from '../src/sim/thing-damage-rules.ts';
import {applyEmpEffect} from '../src/sim/emp-effects.ts';
import {powerWatts} from '../src/sim/power-rules.ts';
import {advancePower,reconcilePower} from '../src/sim/power.ts';
import {validatePower} from '../src/sim/power-save.ts';
import {damageStructure} from '../src/sim/thing-damage.ts';
import type {Structure,Orientation} from '../src/sim/types.ts';

/** Declared local physics fixtures, not an acquisition/build campaign. */
function fixture(kind:ShipAddedKind276,orientation:Orientation=0){
 const {w}=shipReactorWorkshop275();w.structures=[];w.resources=[];w.jobs=[];w.piles=[];
 w.tiles=w.tiles.map(()=>({terrain:'grass'}));w.roofing={constructed:[],build:[],remove:[],cursor:0};
 const s:Structure={id:w.nextId++,kind,x:16,z:16,orientation,footprint:'standard',material:'steel',power:{on:false,parentId:null}};
 return {w,s};
}

for(const kind of SHIP_ADDED_KINDS_276)test(`${kind}: four12-cell orientations share movement, air, wind and pen physics, with no Stuff beauty or EMP`,()=>{
 for(const orientation of [0,1,2,3] as const){
  const {w,s}=fixture(kind,orientation);w.structures.push(s);
  const marker:Structure={id:w.nextId++,kind:'pen-marker',x:2,z:2,orientation:0,footprint:'standard',material:'wood',pen:{accepted:['muffalo']}};w.structures.push(marker);
  const pose={...s,kind},cells=shipPartCells276(pose),rect=shipPartRect276(pose),travel=blockedCells(w),cache=new RoomTopologyCache(),room=cache.read(w),wind=new WindObstructionView(w),pen=penRegion(w,marker.id);
  expect(cells).toHaveLength(12);expect(pen).toBeDefined();
  for(const c of cells){const i=c.z*w.width+c.x;expect(travel[i]).toBe(1);expect(room.at(c.x,c.z)?.kind).toBe('solid');expect(wind.blocked(c)).toBe(true);expect(pen!.cells.has(i)).toBe(false);}
  const outside={x:rect.x-1,z:rect.z-1};expect(travel[outside.z*w.width+outside.x]).toBe(0);expect(room.at(outside.x,outside.z)?.kind).toBe('space');expect(wind.blocked(outside)).toBe(false);
  expect(structureMaxHp(s)).toBe(400);expect(structureBeauty(s)).toBe(0);expect(powerWatts(s,w)).toBe(0);expect(validatePower(w,276)).toEqual([]);
  const before=structuredClone(s),rng=w.rng;expect(applyEmpEffect(w,s,50,w.tick*10)).toBe(false);expect(s).toEqual(before);expect(w.rng).toBe(rng);
  w.structures=w.structures.filter(b=>b!==s);const clear=blockedCells(w),newRoom=cache.read(w),newWind=new WindObstructionView(w),newPen=penRegion(w,marker.id);
  for(const c of cells){const i=c.z*w.width+c.x;expect(clear[i]).toBe(0);expect(newRoom.at(c.x,c.z)?.kind).toBe('space');expect(newWind.blocked(c)).toBe(false);expect(newPen!.cells.has(i)).toBe(true);expect(room.at(c.x,c.z)?.kind).toBe('solid');}
 }
});

test('beam/engine paid recipes and placement recheck the farthest occupied cell; fixed material and passive power stay closed',()=>{
 for(const kind of SHIP_ADDED_KINDS_276){
  const {w,s}=fixture(kind),pose={...s,kind},content=SHIP_ADDED_CONTENT_276[kind],before=structuredClone(w);
  expect(constructionRecipe(s)).toMatchObject({ingredients:content.ingredients,work:content.work,coreWork:content.coreWork});expect(constructionSkillRequired(kind)).toBe(kind==='ship-beam'?5:8);
  expect(shipPartPlacementRefusal276(w,pose)).toBeUndefined();expect(w).toEqual(before);
  const last=shipPartCells276(pose).at(-1)!,i=last.z*w.width+last.x;
  w.roofing!.constructed.push(i);expect(shipPartPlacementRefusal276(w,pose)).toContain('toit');w.roofing!.constructed=[];
  w.roofing!.natural={thin:[i],thick:[]};expect(shipPartPlacementRefusal276(w,pose)).toContain('toit');delete w.roofing!.natural;
  w.tiles[i]={terrain:'marsh'};expect(shipPartPlacementRefusal276(w,pose)).toContain('lourde');
  for(const version of [275,278])expect(validConstructionMaterial(kind,'steel',version)).toBe(false);
  expect(validConstructionMaterial(kind,'steel',276)).toBe(true);expect(validConstructionMaterial(kind,'wood',276)).toBe(false);
  w.structures.push(s);expect(validatePower(w,275)).not.toEqual([]);expect(validatePower(w,278)).not.toEqual([]);
  for(const power of [{on:true,parentId:null},{on:false,parentId:s.id},{on:false,parentId:null,switchOn:undefined}]){s.power=power;expect(validatePower(w,276)).not.toEqual([]);}
 }
});

test('a real grid transmits through passive beam and engine; breaking the beam interrupts supply without turning either passive part on',()=>{
 const {w}=fixture('ship-beam');
 const reactor:Structure={id:w.nextId++,kind:'ship-reactor',x:8,z:8,orientation:1,footprint:'standard',material:'steel',power:{on:true,parentId:null}};
 const beam:Structure={id:w.nextId++,kind:'ship-beam',x:12,z:8,orientation:0,footprint:'standard',material:'steel',power:{on:false,parentId:null}};
 const engine:Structure={id:w.nextId++,kind:'ship-engine',x:15,z:8,orientation:0,footprint:'standard',material:'steel',power:{on:false,parentId:null}};
 const lamp:Structure={id:w.nextId++,kind:'standing-lamp',x:22,z:8,orientation:0,footprint:'standard',material:'steel',power:{on:false,parentId:null}};
 w.structures.push(reactor,beam,engine,lamp);reconcilePower(w);expect(lamp.power!.parentId).toBe(engine.id);
 for(let i=0;i<40&&!lamp.power!.on;i++){w.tick++;advancePower(w);}
 expect(lamp.power!.on).toBe(true);expect(powerWatts(lamp,w)).toBe(-30);expect(beam.power).toEqual({on:false,parentId:null});expect(engine.power).toEqual({on:false,parentId:null});
 expect(damageStructure(w,beam,400,'bullet')).toBe(true);for(let i=0;i<3;i++){w.tick++;advancePower(w);}
 expect(lamp.power!.on).toBe(false);expect(engine.power).toEqual({on:false,parentId:null});expect(powerWatts(reactor,w)).toBe(1000);expect(validatePower(w,276)).toEqual([]);
});
