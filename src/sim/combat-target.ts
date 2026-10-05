import { hostileTo,activeThreat } from './affiliation.ts';
import { clearShotSegment,type ShotGrid } from './combat-space.ts';
import { captureWorldShotGrid } from './combat-world.ts';
import { carrierOf } from './rescue-state.ts';
import { violentWorkRefusal } from './colonist-backgrounds.ts';
import { isColonist,distanceSquared } from './affiliation.ts';
import type { Pawn,World } from './types.ts';
import type { WildAnimal } from './wildlife-state.ts';
import type { Mechanoid } from './mechanoid-state.ts';

export type LivingTarget=Pawn|WildAnimal|Mechanoid;
export const isAnimalTarget=(p:LivingTarget):p is WildAnimal=>'species' in p;
export const isMechanoidTarget=(p:LivingTarget):p is Mechanoid=>'mechKind' in p;
export const isPawnTarget=(p:LivingTarget):p is Pawn=>!isAnimalTarget(p)&&!isMechanoidTarget(p);
export const combatTarget=(w:World,id:number):LivingTarget|undefined=>w.pawns.find(p=>p.id===id)??(w.schemaVersion>=77?w.wildlife?.animals.find(a=>a.id===id):undefined)??(w.schemaVersion>=194?w.mechanoids?.find(m=>m.id===id):undefined);
export const combatTargetKey=(p:LivingTarget):`pawn:${number}`|`animal:${number}`|`mech:${number}`=>`${isAnimalTarget(p)?'animal':isMechanoidTarget(p)?'mech':'pawn'}:${p.id}`;
export const combatTargetSize=(p:LivingTarget)=>isAnimalTarget(p)?.2:1;
export const hostileTarget=(p:Pawn,t:LivingTarget)=>isAnimalTarget(t)?p.mental?.crisis?.kind==='berserk'||!!t.manhunter:isMechanoidTarget(t)?!p.prisoner||p.mental?.crisis?.kind==='berserk':hostileTo(p,t);
/** The same predicate owns civilian fleeing, defense and auto-order validity. */
export const activeCombatThreat=(t:LivingTarget)=>isAnimalTarget(t)?!!t.manhunter&&!['dead','downed','sleeping'].includes(t.state):isMechanoidTarget(t)?t.state!=='dead'&&t.state!=='downed'&&!t.health?.death:activeThreat(t);
export const hostileCandidates=(w:World,p:Pawn,animals:readonly WildAnimal[]=w.wildlife?.animals??[]):LivingTarget[]=>[
  ...w.pawns.filter(t=>hostileTarget(p,t)&&activeCombatThreat(t)),
  ...animals.filter(t=>hostileTarget(p,t)&&activeCombatThreat(t)),
  ...(w.mechanoids??[]).filter(t=>hostileTarget(p,t)&&activeCombatThreat(t)),
];

export const retaliationPermission=(p:Pawn):boolean=>isColonist(p)&&!p.prisoner&&!p.draft&&!p.mental?.crisis&&!violentWorkRefusal(p)
  &&p.hostilityResponse==='attack'&&p.orders.active===null&&!p.orders.queue.length&&!p.priorityWork&&!p.equipmentTask
  &&!p.trade&&!p.cleaning?.forced&&!p.firefighting?.forced;
/** A real attempt establishes this short-lived threat even between allies.
 * It is distinct from faction hostility and cannot turn Flee/Ignore into Attack. */
export function meleeThreatTarget(w:World,p:Pawn,core=w.tick*10,grid?:ShotGrid):LivingTarget|undefined {
  const threat=p.meleeThreat;if(!threat||core<threat.atCore||core-threat.atCore>400)return;
  const attacker=combatTarget(w,threat.attackerId);
  if(!attacker||attacker===p||['dead','downed','sleeping'].includes(attacker.state)||distanceSquared(p,attacker)>9||isPawnTarget(attacker)&&carrierOf(w,attacker.id))return;
  return clearShotSegment(grid??captureWorldShotGrid(w),p,attacker)?attacker:undefined;
}
