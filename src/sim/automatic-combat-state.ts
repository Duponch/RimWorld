import type { Pawn,World } from './types.ts';
import { hostileTo,isColonist,activeThreat } from './affiliation.ts';
import { cancelShooting } from './shooting-state.ts';
import { cancelMelee } from './melee-state.ts';
import { combatTarget,hostileTarget,activeCombatThreat } from './combat-target.ts';

export type AutomaticAttack = {kind:'draft'}|{kind:'response';remaining:number;until:number};
export type AttackMemory = {targetId:number;atCore:number};
export function automaticPermission(p:Pawn,kind:'draft'|'response'):boolean {
  return isColonist(p)&&(kind==='draft'?!!p.draft:!p.draft&&p.hostilityResponse==='attack');
}
export function automaticTarget(world:World,p:Pawn,targetId:number):boolean {
  const target=combatTarget(world,targetId);return !!target&&hostileTarget(p,target)&&activeCombatThreat(target);
}
export function cancelAutomaticCombat(p:Pawn):void {
  if(p.shooting?.order?.auto)cancelShooting(p);
  if(p.melee?.order?.auto){cancelMelee(p);p.path=[];if(!['dead','downed'].includes(p.state))p.state='idle';}
}
