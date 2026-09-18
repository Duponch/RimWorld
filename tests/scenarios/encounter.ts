import { shootingLoad } from './shooting.ts';
import { addGroundMaterial } from '../../src/sim/materials.ts';
import { equipmentCamp } from './equipment.ts';
import { startingPawn } from '../../src/sim/starting-pawns.ts';
import { addMaterial } from '../../src/sim/materials.ts';
import { applyCommand } from '../../src/sim/engine.ts';
import type { World } from '../../src/sim/types.ts';

export function encounterCamp():World {
  const w=equipmentCamp(3);w.piles=[];w.rng=81733;
  Object.assign(w.pawns[0],{x:6,z:10});Object.assign(w.pawns[1],{x:3,z:26});Object.assign(w.pawns[2],{x:5,z:26});
  const enemy=startingPawn(w.nextId++,'Sentinelle',16,10,0,100);enemy.faction='outlaws';enemy.schedule.fill('work');
  w.pawns.push(enemy);
  for(const p of [w.pawns[0],enemy]){p.skills.shooting.passion=1;addMaterial(w,'weapon',1,{type:'equipment',pawnId:p.id},'revolver');}
  applyCommand(w,{type:'draft',pawnIds:[w.pawns[0].id],enabled:true});
  return w;
}

/** A guard first wounds the exposed adult; the player's reserve then responds.
 * All damage is produced by real shots. No health injection or faction switch. */
export function rescueEncounter():World {
  const w=encounterCamp();w.rng=6;
  Object.assign(w.pawns[1],{x:20,z:25});w.pawns[1].skills.shooting.level=16;
  addMaterial(w,'weapon',1,{type:'equipment',pawnId:w.pawns[1].id},'revolver');
  w.pawns[2].priorities.doctor=1;
  for(const p of w.pawns.slice(0,3)){p.priorities.patient=1;p.medicalCare='industrial';}
  addGroundMaterial(w,'medicine',30,{x:4,z:26},'medicine');
  addGroundMaterial(w,'food',30,{x:6,z:26},'survival-meal');
  return w;
}


/** Actual hostile AI + directed fire + civilian escape and untouched miners. */
export function encounterLoad(count:number) {
  const result=shootingLoad(count,false),w=result.world;
  for(const [i,pair] of result.pairs.entries()){
    const enemy=w.pawns.find(p=>p.id===pair[1])!;delete enemy.draft;enemy.faction='outlaws';enemy.path=[];enemy.state='idle';
    addMaterial(w,'weapon',1,{type:'equipment',pawnId:enemy.id},'revolver');
    const civilian=w.pawns[i*3+2];if(civilian&&i%2===0)Object.assign(civilian,{x:enemy.x-4,z:enemy.z+1});
  }
  return result;
}
