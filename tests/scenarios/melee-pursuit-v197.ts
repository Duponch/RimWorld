import { deconstructionCamp } from './deconstruction.ts';
import { startingPawn } from '../../src/sim/starting-pawns.ts';
import { newTactics } from '../../src/sim/tactics-state.ts';
import { applyCommand,validateWorld } from '../../src/sim/index.ts';
import { createMedicalRecord,addResolvedInjury } from '../../src/sim/injury-state.ts';
import { reconcilePawnHealth } from '../../src/sim/health.ts';
import type { Command,Pawn } from '../../src/sim/types.ts';

export type MeleePursuitMode='tactics'|'raid'|'flee'|'direct';
/** Prepared open daytime runway. The medical slowdown and subsequent motion,
 * chase and contacts use real simulation systems; no injury is erased later. */
export function meleePursuitCamp(mode:MeleePursuitMode='tactics',gap=8) {
  const w=deconstructionCamp(1,96);w.tick=3000;w.rng=81733;w.stockpiles=[];w.growingZones=[];
  const command=(c:Command)=>{const result=applyCommand(w,c);if(!result.ok)throw new Error(result.reason);};
  const target=w.pawns[0]!;Object.assign(target,{x:24,z:48,hunger:100,rest:100});target.recreation.level=100;target.schedule.fill('work');
  for(const key of Object.keys(target.priorities))target.priorities[key as keyof Pawn['priorities']]=0;
  target.health=createMedicalRecord(w.tick);
  for(const leg of ['left-leg','right-leg'] as const)addResolvedInjury(target.health,leg,'bruise',13000,()=>.999999);
  reconcilePawnHealth(w,target);
  const chaser=startingPawn(w.nextId++,'Poursuivant',24-gap,48,0,100);delete chaser.health;chaser.schedule.fill('work');w.pawns.push(chaser);
  if(mode==='direct'){
    command({type:'draft',pawnIds:[chaser.id],enabled:true});command({type:'fire-at-will',pawnIds:[chaser.id],enabled:false});
  }else{chaser.faction='outlaws';chaser.tactics=newTactics();}
  if(mode==='raid'||mode==='flee'){
    chaser.raid={group:1,exiting:false,goal:null};
    w.raids={profile:'camp-raids-v1',rng:7,nextCheck:null,serial:1,completed:0,departed:[],active:{id:1,startedAt:w.tick,deadline:w.tick+3000,lossPermille:700,members:[chaser.id],lost:[],phase:'assault'}};
  }
  if(mode!=='flee'){
    command({type:'draft',pawnIds:[target.id],enabled:true});command({type:'fire-at-will',pawnIds:[target.id],enabled:false});command({type:'draft-move',pawnIds:[target.id],target:{x:80,z:48},queue:false});
  }
  if(mode==='direct')command({type:'melee',pawnIds:[chaser.id],targetId:target.id});
  const errors=validateWorld(w);if(errors.length)throw new Error(errors.join('; '));
  return {w,target,chaser};
}
