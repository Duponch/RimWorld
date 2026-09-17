import { equippedWeapon } from './equipment-rules.ts';
import { dropRetainingIdentity } from './ground-placement.ts';
import { pawnBody } from './health-rules.ts';
import type { MaterialPile,Pawn,World } from './types.ts';

/** No disappearance on a saturated floor. A retained weapon is disabled and
 * retried on a staggered cadence; it is never confused with working cargo. */
export function dropIncapacitatedEquipment(world:World,pawn:Pawn,retry=false,weapon:MaterialPile|undefined=equippedWeapon(world,pawn)):void {
  if(!weapon){delete pawn.equipmentDropPending;return;}
  const inBed=pawn.need?.kind==='sleep'&&pawn.need.phase==='sleep'&&pawn.need.bedId!==null;
  if(!pawn.equipmentDropPending&&pawn.state!=='dead'&&!(pawn.state==='downed'&&!inBed)&&pawnBody(pawn).capacities.manipulation>0)return;
  // Only the engine's once-per-pawn tick may retry a previously failed drop.
  // Health/command reconciliation can run several times within that tick.
  if(pawn.equipmentDropPending&&(!retry||world.tick%20!==pawn.id%20))return;
  if(dropRetainingIdentity(world,weapon,pawn)){
    weapon.weapon!.forbidden=true;delete pawn.equipmentDropPending;
    if(pawn.state==='downed'&&pawnBody(pawn).capacities.manipulation>0)pawn.droppedWeaponId=weapon.id;
  }else pawn.equipmentDropPending=true;
}

export function reconcileWeaponMemory(world:World,pawn:Pawn):void {
  if(pawn.droppedWeaponId!==undefined&&!world.piles.some(p=>p.id===pawn.droppedWeaponId&&p.kind==='weapon'&&p.owner.type==='ground'))delete pawn.droppedWeaponId;
}
