import { applyCommand } from '../../src/sim/engine.ts';
import { addMaterial } from '../../src/sim/materials.ts';
import { startingPawn } from '../../src/sim/starting-pawns.ts';
import { newTactics } from '../../src/sim/tactics-state.ts';
import { equipmentCamp } from './equipment.ts';
import { automaticLoad } from './automatic-combat.ts';

export function pursuitCamp(armed=true) {
  const w=equipmentCamp(3,64);w.piles=[];w.rng=81733;
  const actor=w.pawns[0];actor.x=12;actor.z=16;
  const enemy=startingPawn(w.nextId++,'Éclaireur',52,16,0,100);enemy.faction='outlaws';enemy.tactics=newTactics();enemy.schedule.fill('work');w.pawns.push(enemy);
  if(armed)addMaterial(w,'weapon',1,{type:'equipment',pawnId:enemy.id},'revolver');
  applyCommand(w,{type:'draft',pawnIds:[actor.id],enabled:true});applyCommand(w,{type:'fire-at-will',pawnIds:[actor.id],enabled:false});
  return w;
}
/** Mixed work plus independently mobile opponents, not a group raid. */
export function pursuitLoad(count:number) {
  const result=automaticLoad(count);
  const w=result.world;
  for(let z=65;z<=140;z++)for(let x=91;x<=107;x++)w.tiles[z*w.width+x]={terrain:'grass'};
  w.resources=w.resources.filter(r=>!(r.x>=91&&r.x<=107&&r.z>=65&&r.z<=140));
  for(const p of w.pawns)if(p.faction==='outlaws'){p.tactics=newTactics();p.x=105;}
  return result;
}
