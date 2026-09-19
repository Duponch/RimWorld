import { cancelShooting } from './shooting-state.ts';
import type { Pawn,World } from './types.ts';

export interface HuntingTask {animalId:number;startedAt:number;phase:'stalk'|'finish'|'collect';progress:number}
export type HuntingCommand={type:'hunt';animalId:number;enabled:boolean};
export function huntingPermission(w:World,p:Pawn,targetId:number):boolean {
  return !!p.hunting&&p.hunting.animalId===targetId&&p.hunting.phase==='stalk'&&!p.draft&&p.priorities.hunt>0
    &&!!w.hunting?.targets.includes(targetId)&&!!w.wildlife?.animals.some(a=>a.id===targetId&&!['dead','downed'].includes(a.state));
}
export function cancelHunting(p:Pawn):void {
  if(p.shooting?.order?.hunt)cancelShooting(p);
  delete p.hunting;
}
