import {expect,test} from 'vitest';
import type {BufferAttribute} from 'three/webgpu';
import {createWorld} from '../src/sim';
import {BoxBatches} from '../src/render/BoxBatches';
import {RecreationHints} from '../src/render/RecreationHints';
import {RangeOutlineLayer} from '../src/render/RangeOutlineLayer';
import {zoneBoundaryVertices} from '../src/render/zone-surface-presentation';
import {SceneRenderCore} from '../src/render/SceneRenderCore';
import {campTurret,miniTurretCamp} from './scenarios/mini-turret-v212';

test('a cell domain with a hole has only thin boundary faces, retained attributes and matching grass surfaces',()=>{
  const range=new RangeOutlineLayer(),cells=[11,12,13,21,23,31,32,33];
  try{
    range.update(10,cells,0x55b6ec);
    const geometry=range.mesh.geometry,positions=geometry.getAttribute('position'),count=geometry.drawRange.count;
    expect(Array.from(positions.array.slice(0,count*3))).toEqual(zoneBoundaryVertices(10,cells,.08).map(Math.fround));
    expect(range.surfaces.every(s=>Math.min(s.maxX-s.minX,s.maxZ-s.minZ)<.071)).toBe(true);
    expect(range.surfaces.some(s=>s.minX<=1&&s.maxX>=1&&s.minZ<=1&&s.maxZ>=1)).toBe(false);
    const restore=range.prepareForCompile();restore();expect(geometry.drawRange.count).toBe(count);
    range.update(10,[22],0xed7050);expect(range.mesh.geometry).toBe(geometry);expect(geometry.getAttribute('position')).toBe(positions);
    range.hide();const hidden=range.prepareForCompile();expect(range.mesh.visible).toBe(true);hidden();expect(range.mesh.visible).toBe(false);
    const during=range.prepareForCompile();range.update(10,[22],0xffffff);during();expect(range.mesh.visible).toBe(true);expect(range.surfaces).toHaveLength(4);
  }finally{range.dispose();}
});

test('inspection contours retain hot/cold edge colors and placement fills through switching and clearing',()=>{
  const boxes=new BoxBatches(),hints=new RecreationHints(boxes),world=createWorld(308,32,32),before=JSON.stringify(world);
  try{
    hints.cooler({x:16,z:16},1,world);expect(hints.surfaces).toHaveLength(8);
    expect(hints.surfaces.some(s=>s.blue>s.red)).toBe(true);expect(hints.surfaces.some(s=>s.red>s.blue)).toBe(true);
    hints.cooler({x:0,z:16},1,world);expect(hints.surfaces.every(s=>s.minX>=-.5&&s.maxX<2)).toBe(true);
    hints.television(world,{x:16,z:16,orientation:0});const fill=hints.group.getObjectByName('recreation-places')!;
    expect(fill.visible).toBe(true);expect(hints.surfaces.every(s=>s.maxX-s.minX>.79)).toBe(true);
    hints.television(world,{x:16,z:16,orientation:0},true);expect(fill.visible).toBe(false);
    expect(hints.surfaces.every(s=>Math.min(s.maxX-s.minX,s.maxZ-s.minZ)<.071)).toBe(true);
    const surfaces=hints.surfaces;hints.television(world,{x:16,z:16,orientation:0},true);expect(hints.surfaces).toBe(surfaces);
    hints.television(world,{x:16,z:16,orientation:0});expect(fill.visible).toBe(true);
    hints.hide();expect(hints.group.visible).toBe(false);expect(JSON.stringify(world)).toBe(before);
  }finally{hints.dispose();boxes.dispose();}
});

test('selecting a turret changes its contour without borrowing or clearing the order rectangle',()=>{
  const world=miniTurretCamp(),turret=campTurret(world),range=new RangeOutlineLayer(),order=Symbol('Order rectangle');
  const core=Object.assign(Object.create(SceneRenderCore.prototype),{world,tool:'select',selectedObject:{kind:'structure',id:turret.id},turretRange:range,areaPreview:order,refreshGroundOverlays(){}}) as SceneRenderCore;
  const run=()=>Reflect.get(SceneRenderCore.prototype,'updateTurretPreview').call(core);
  try{
    run();const full=range.mesh.geometry.drawRange.count;expect(full).toBeGreaterThan(0);expect(Reflect.get(core,'areaPreview')).toBe(order);
    const attribute=range.mesh.geometry.getAttribute('position') as BufferAttribute,version=attribute.version;run();expect(attribute.version).toBe(version);
    turret.turret!.wick={startedAtCore:world.tick*10,endCore:world.tick*10+30};
    run();expect(range.mesh.geometry.drawRange.count).toBeLessThan(full);
    Reflect.set(core,'tool','chop');run();expect(range.mesh.visible).toBe(false);expect(Reflect.get(core,'turretTintSurfaces')).toEqual([]);expect(Reflect.get(core,'areaPreview')).toBe(order);
  }finally{range.dispose();}
});
