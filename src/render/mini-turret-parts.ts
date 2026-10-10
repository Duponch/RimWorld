import { miniTurretTargets,miniTurretView } from '../sim/mini-turret-presentation';
import type { Cell, Structure, World } from '../sim/types';
import type { Placement } from './primitives';

export const MINI_TURRET_MUZZLE_HEIGHT=1.12;
export const MINI_TURRET_TOP_PART_COUNT=18;
export type TurretTopView={active:boolean;holdFire:boolean;shots:number;aim:{cell:Cell|null}|null};
export function miniTurretFacing(s:Pick<Structure,'x'|'z'>,view:TurretTopView):number {
  const cell=view.aim?.cell;return cell?Math.atan2(cell.x-s.x,cell.z-s.z):0;
}
export function miniTurretTopColor(view:TurretTopView):number {
  return !view.active?0x829089:view.holdFire?0xb6a381:view.shots===0?0xa07c70:0x779b8c;
}

/** The same complete gun head is used by retained aiming and by a new,
 * inactive construction ghost. No intrinsic gun state is created. */
export function miniTurretTopPartsForStructure(s:Structure,view:TurretTopView={active:false,holdFire:false,shots:60,aim:null},ry=miniTurretFacing(s,view)):Placement[] {
  const color=miniTurretTopColor(view),sin=Math.sin(ry),cos=Math.cos(ry),parts:Placement[]=[];
  const part=(dx:number,y:number,dz:number,sx:number,sy:number,sz:number,tint:number):void=>{
    parts.push({targetId:s.id,x:s.x+cos*dx+sin*dz,z:s.z-sin*dx+cos*dz,y,sx,sy,sz,ry,color:tint});
  };
  part(0,1.04,0,.48,.25,.43,color);
  // Three joint sections form a stepped, narrower crown instead of a square
  // beam. These same primitives are retained by the construction ghost.
  part(0,MINI_TURRET_MUZZLE_HEIGHT,.36,.14,.075,.68,0x4f685e);
  part(0,MINI_TURRET_MUZZLE_HEIGHT+.05125,.36,.092,.0275,.68,0x60766b);
  part(0,MINI_TURRET_MUZZLE_HEIGHT-.05125,.36,.092,.0275,.68,0x43594f);
  part(0,MINI_TURRET_MUZZLE_HEIGHT,.23,.19,.17,.10,0x61796d);
  // A raised collar surrounds the small dark muzzle rather than painting a
  // symbol onto a flat end. The muzzle remains at the existing shot origin.
  part(0,MINI_TURRET_MUZZLE_HEIGHT+.076,.705,.18,.028,.05,0x71887c);
  part(0,MINI_TURRET_MUZZLE_HEIGHT-.076,.705,.18,.028,.05,0x43594f);
  part(-.076,MINI_TURRET_MUZZLE_HEIGHT,.705,.028,.124,.05,0x4f685e);
  part(.076,MINI_TURRET_MUZZLE_HEIGHT,.705,.028,.124,.05,0x4f685e);
  part(0,MINI_TURRET_MUZZLE_HEIGHT,.727,.122,.120,.008,0x25302d);
  part(-.29,.99,-.19,.19,.18,.18,0x687c6f);
  part(-.30,1.033,-.0375,.05,.035,.30,0x45564d);
  // Three visible linked cartridges suggest the feed belt; they are model
  // detail, never an additional reserve or an independent ammunition state.
  for(const dz of [-.14,-.045,.05]){
    part(-.30,1.066,dz,.12,.05,.052,0xb69c58);
    part(-.225,1.066,dz,.03,.031,.032,0xa87f42);
  }
  return parts;
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
