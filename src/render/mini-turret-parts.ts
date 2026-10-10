import { miniTurretTargets,miniTurretView } from '../sim/mini-turret-presentation';
import type { Cell, Structure, World } from '../sim/types';
import type { Placement } from './primitives';

export const MINI_TURRET_MUZZLE_HEIGHT=1.12;
type TurretTopView={active:boolean;holdFire:boolean;shots:number;aim:{cell:Cell|null}|null};

/** The same complete gun head is used by retained aiming and by a new,
 * inactive construction ghost. No intrinsic gun state is created. */
export function miniTurretTopPartsForStructure(s:Structure,view:TurretTopView={active:false,holdFire:false,shots:60,aim:null}):Placement[] {
  const cell=view.aim?.cell,ry=cell?Math.atan2(cell.x-s.x,cell.z-s.z):0;
  const color=!view.active?0x829089:view.holdFire?0xb6a381:view.shots===0?0xa07c70:0x779b8c;
  return [{targetId:s.id,x:s.x,z:s.z,y:1.04,sx:.48,sy:.25,sz:.43,ry,color},
    {targetId:s.id,x:s.x+Math.sin(ry)*.34,z:s.z+Math.cos(ry)*.34,y:MINI_TURRET_MUZZLE_HEIGHT,sx:.14,sy:.13,sz:.69,ry,color:0x4f685e}];
}
export function miniTurretBaseParts(world:World):Placement[] {
  return world.structures.filter(s=>s.kind==='mini-turret').flatMap(s=>[
    {targetId:s.id,x:s.x,z:s.z,y:.09,sx:.87,sy:.18,sz:.87,color:0x6e837a},
    {targetId:s.id,x:s.x,z:s.z,y:.40,sx:.58,sy:.50,sz:.58,color:0x91ada1},
    {targetId:s.id,x:s.x,z:s.z,y:.78,sx:.24,sy:.28,sz:.24,color:0x62796e},
  ]);
}
/** Aiming only changes the shared top batch; the static furniture stays intact. */
export function miniTurretTopParts(world:World):Placement[] {
  const turrets=world.structures.filter(s=>s.kind==='mini-turret');if(!turrets.length)return [];
  const targets=miniTurretTargets(world);
  return turrets.flatMap(s=>miniTurretTopPartsForStructure(s,miniTurretView(world,s,targets)!));
}
