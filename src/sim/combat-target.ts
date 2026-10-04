import { hostileTo,activeThreat } from './affiliation.ts';
import type { Pawn,World } from './types.ts';
import type { WildAnimal } from './wildlife-state.ts';

export type LivingTarget=Pawn|WildAnimal;
export const isAnimalTarget=(p:LivingTarget):p is WildAnimal=>'species' in p;
export const combatTarget=(w:World,id:number):LivingTarget|undefined=>w.pawns.find(p=>p.id===id)??(w.schemaVersion>=77?w.wildlife?.animals.find(a=>a.id===id):undefined);
export const combatTargetKey=(p:LivingTarget)=>`${isAnimalTarget(p)?'animal':'pawn'}:${p.id}`;
export const combatTargetSize=(p:LivingTarget)=>isAnimalTarget(p)?.2:1;
export const hostileTarget=(p:Pawn,t:LivingTarget)=>isAnimalTarget(t)?!!t.manhunter:hostileTo(p,t);
/** The same predicate owns civilian fleeing, defense and auto-order validity. */
export const activeCombatThreat=(t:LivingTarget)=>isAnimalTarget(t)?!!t.manhunter&&!['dead','downed','sleeping'].includes(t.state):activeThreat(t);
export const hostileCandidates=(w:World,p:Pawn,animals:readonly WildAnimal[]=w.wildlife?.animals??[]):LivingTarget[]=>[
  ...w.pawns.filter(t=>hostileTarget(p,t)&&activeCombatThreat(t)),
  ...animals.filter(t=>hostileTarget(p,t)&&activeCombatThreat(t)),
];
