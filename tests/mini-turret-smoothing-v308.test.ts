import { expect,test,vi } from 'vitest';
import { Group,Matrix4,Vector3 } from 'three/webgpu';
import { BoxBatches } from '../src/render/BoxBatches';
import { BoxMesh } from '../src/render/BoxMesh';
import { MiniTurretLayer,miniTurretShortAngle } from '../src/render/MiniTurretLayer';
import { miniTurretFacing,miniTurretTopPartsForStructure,MINI_TURRET_TOP_PART_COUNT } from '../src/render/mini-turret-parts';
import { miniTurretView } from '../src/sim/mini-turret-presentation';
import { campTurret,miniTurretCamp } from './scenarios/mini-turret-v212';

function setup(){
  const world=miniTurretCamp(),turret=campTurret(world),target=world.pawns[1]!;
  turret.turret!.targetKey=`pawn:${target.id}`;
  const group=new Group(),batches=new BoxBatches(),layer=new MiniTurretLayer();
  layer.update(world,group,batches,true);
  const mesh=group.getObjectByName('turret-top') as BoxMesh;
  return {world,turret,target,group,batches,layer,mesh};
}
function angle(mesh:BoxMesh,index=0):number {
  const matrix=new Matrix4();mesh.getMatrixAt(index,matrix);return Math.atan2(-matrix.elements[2]!,matrix.elements[0]!);
}

test('a crossing at ±pi takes the short turn in either direction',()=>{
  expect(miniTurretShortAngle(Math.PI-.02,-Math.PI+.03)).toBeCloseTo(.05);
  expect(miniTurretShortAngle(-Math.PI+.03,Math.PI-.02)).toBeCloseTo(-.05);
});

test('retargeting changes only resident matrices until pause settles, without touching the World',()=>{
  const f=setup(),initial=angle(f.mesh),set=vi.spyOn(f.batches,'set');
  f.target.x=f.turret.x+7;f.target.z=f.turret.z-7;
  const before=JSON.stringify(f.world),colors=f.mesh.colorBuffer.array.slice(),colorVersion=f.mesh.colorBuffer.version;
  const allocation=f.mesh.instanceMatrix,geometry=f.mesh.geometry,sphere=f.mesh.boundingSphere.clone();
  expect(f.layer.update(f.world,f.group,f.batches)).toBe(true);expect(set).not.toHaveBeenCalled();
  expect(angle(f.mesh)).toBeCloseTo(initial);
  expect(f.layer.present(1/240)).toBe(true);
  const goal=miniTurretFacing(f.turret,miniTurretView(f.world,f.turret)!);
  expect(Math.abs(miniTurretShortAngle(angle(f.mesh),goal))).toBeLessThan(Math.abs(miniTurretShortAngle(initial,goal)));
  expect(angle(f.mesh)).not.toBeCloseTo(goal,4);
  expect(f.layer.present(0,true)).toBe(true);expect(angle(f.mesh)).toBeCloseTo(goal);
  const version=f.mesh.instanceMatrix.version;
  expect(f.layer.present(1/240,true)).toBe(false);expect(f.mesh.instanceMatrix.version).toBe(version);
  expect(f.mesh.instanceMatrix).toBe(allocation);expect(f.mesh.geometry).toBe(geometry);
  expect(f.mesh.colorBuffer.array).toEqual(colors);expect(f.mesh.colorBuffer.version).toBe(colorVersion);
  expect(f.mesh.boundingSphere).toEqual(sphere);expect(JSON.stringify(f.world)).toBe(before);
  f.batches.dispose();
});

test('pending uploads remain bounded while culled and reuse their range after an upload',()=>{
  const f=setup();f.mesh.instanceMatrix.clearUpdateRanges();
  f.target.x=f.turret.x-7;f.target.z=f.turret.z+1;f.layer.update(f.world,f.group,f.batches);
  f.layer.present(1/240);const range=f.mesh.instanceMatrix.updateRanges[0]!;
  expect(range).toEqual({start:0,count:MINI_TURRET_TOP_PART_COUNT*16});
  for(let i=0;i<20;i++)f.layer.present(1/240);
  expect(f.mesh.instanceMatrix.updateRanges).toHaveLength(1);expect(f.mesh.instanceMatrix.updateRanges[0]).toBe(range);
  f.mesh.instanceMatrix.clearUpdateRanges();f.layer.present(1/240);
  expect(f.mesh.instanceMatrix.updateRanges).toHaveLength(1);expect(f.mesh.instanceMatrix.updateRanges[0]).toBe(range);
  f.batches.dispose();
});

test('reload and removal discard pending turns; the all-angle bound contains every authored corner',()=>{
  const f=setup();f.target.z+=8;f.layer.update(f.world,f.group,f.batches);f.layer.present(1/240);
  f.layer.update(f.world,f.group,f.batches,true);
  expect(angle(f.mesh)).toBeCloseTo(miniTurretFacing(f.turret,miniTurretView(f.world,f.turret)!));
  expect(f.layer.present(1/240)).toBe(false);
  const point=new Vector3();
  for(let i=0;i<12;i++)for(const part of miniTurretTopPartsForStructure(f.turret,miniTurretView(f.world,f.turret)!,i*Math.PI/6)){
    const sin=Math.sin(part.ry??0),cos=Math.cos(part.ry??0);
    for(const x of [-1,1])for(const y of [-1,1])for(const z of [-1,1]){
      const dx=x*part.sx!/2,dz=z*part.sz!/2;
      point.set(part.x+cos*dx+sin*dz,part.y+y*part.sy!/2,part.z-sin*dx+cos*dz);
      expect(f.mesh.boundingSphere.containsPoint(point)).toBe(true);
    }
  }
  f.target.x-=8;f.layer.update(f.world,f.group,f.batches);
  f.world.structures=f.world.structures.filter(s=>s.id!==f.turret.id);
  expect(f.layer.update(f.world,f.group,f.batches)).toBe(true);expect(f.mesh.activeCount).toBe(0);
  expect(f.layer.present(1/240)).toBe(false);f.batches.dispose();
});
