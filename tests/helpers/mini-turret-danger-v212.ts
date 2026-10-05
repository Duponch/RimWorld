import { applyCommand } from '../../src/sim/engine.ts';
import { miniTurretExplosive } from '../../src/sim/bomb-creation.ts';
import { addGroundMaterial,refreshStock } from '../../src/sim/materials.ts';
import { validateWorld } from '../../src/sim/serialization.ts';
import type { Structure } from '../../src/sim/types.ts';
import { campTurret,miniTurretCamp } from '../scenarios/mini-turret-v212.ts';
import { fixtureBuilding } from '../scenarios/deconstruction.ts';
import { exposeToCrisis } from './mental-crises-v211.ts';

/** Future Tantrum is the actual external damage source. All buildings are
 * intact: no wick, damage, refuge or explosion has been manufactured. */
export function turretDangerNativeFixture(){
  const world=miniTurretCamp(),turret=campTurret(world),aggressor=world.pawns[0]!;
  let id=world.nextId;while(!miniTurretExplosive(id))id++;turret.id=id;world.nextId=id+1;
  turret.x=14;turret.z=16;turret.power={on:false,parentId:null};turret.turret!.holdFire=true;turret.turret!.autoReload=false;
  // Tantrum admission requires two reachable buildings. Keep the second intact
  // target close: its real retarget interval must not become a map-long walk.
  world.structures=[turret];const stool:Structure=fixtureBuilding(world,'stool',16,16);stool.material='wood';
  for(const [i,p] of world.pawns.entries()){
    p.x=i?14+i:12;p.z=i?18:16;p.hunger=100;p.rest=100;p.recreation.level=100;delete p.faction;p.hostilityResponse='ignore';
    p.traits=['optimist'];p.memories=[];delete p.mental;for(const work of Object.keys(p.priorities) as (keyof typeof p.priorities)[])p.priorities[work]=0;
  }
  aggressor.name='<b>Mèche</b> & refuge';aggressor.skills.melee.level=8;aggressor.priorities.gather=1;
  const tree={id:world.nextId++,kind:'tree' as const,x:13,z:15,amount:12};world.resources.push(tree);
  if(!applyCommand(world,{type:'designate',kind:'chop',x:tree.x,z:tree.z}).ok)throw Error('Cannot prepare the unfinished crisis job.');
  addGroundMaterial(world,'wood',3,{x:14,z:18},'wood');refreshStock(world);exposeToCrisis(world,aggressor,'tantrum',1);
  const errors=validateWorld(world);if(errors.length)throw Error(errors.join('; '));
  return {world,turretId:turret.id,aggressorId:aggressor.id,jobId:world.jobs.at(-1)!.id,treeId:tree.id};
}
