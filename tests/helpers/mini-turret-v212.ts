import { applyCommand,stepWorld } from '../../src/sim/engine.ts';
import { previewBackgroundSkills } from '../../src/sim/background-generation.ts';
import { addGroundMaterial,refreshStock } from '../../src/sim/materials.ts';
import { validateWorld } from '../../src/sim/serialization.ts';
import type { World } from '../../src/sim/types.ts';
import { miniTurretCamp,campTurret } from '../scenarios/mini-turret-v212.ts';

export function turretCombatNativeFixture():{world:World;turretId:number;targetId:number} {
  const world=miniTurretCamp(),turret=campTurret(world);turret.turret!.holdFire=true;turret.turret!.autoReload=false;
  for(const pawn of world.pawns){pawn.hunger=100;pawn.rest=100;pawn.recreation.level=100;for(const key of Object.keys(pawn.priorities) as Array<keyof typeof pawn.priorities>)pawn.priorities[key]=0;}
  return {world,turretId:turret.id,targetId:world.pawns[1]!.id};
}

/** A checkpoint from the actual producer, distinct from the intact public
 * preparation. No subtraction of ammo or synthetic private phase is used. */
export function producedTurretServiceCheckpoint():{world:World;turretId:number;pawnId:number;producedTicks:number;ammoQ:number} {
  const fixture=turretCombatNativeFixture(),world=fixture.world,gun=campTurret(world).turret!;
  const pawn=world.pawns[0]!;pawn.background={childhood:'quiet-child'};pawn.skills=previewBackgroundSkills(0,pawn.background);pawn.x=12;pawn.z=16;
  addGroundMaterial(world,'steel',4,{x:13,z:16},'steel');refreshStock(world);
  if(!applyCommand(world,{type:'turret-hold-fire',structureId:fixture.turretId,enabled:false}).ok)throw Error('Cannot expose real gun fire.');
  let producedTicks=0;
  while(producedTicks<200&&gun.cooldownCore===0){stepWorld(world);producedTicks++;}
  if(gun.ammoQ>=240||gun.cooldownCore===0)throw Error('No real fired cooldown checkpoint within the bounded fixture.');
  if(!applyCommand(world,{type:'turret-hold-fire',structureId:fixture.turretId,enabled:true}).ok)throw Error('Cannot retain fire after real burst.');
  pawn.priorities.haul=1;
  const errors=validateWorld(world);if(errors.length)throw Error(errors.join('; '));
  return {world,turretId:fixture.turretId,pawnId:pawn.id,producedTicks,ammoQ:gun.ammoQ};
}
