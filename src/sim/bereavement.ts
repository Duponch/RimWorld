import { isColonist } from './affiliation.ts';
import { opinionOf } from './social-state.ts';
import { TICKS_PER_DAY,type Pawn,type World } from './types.ts';
import type { MoodThought } from './mood.ts';
import { notifyFamilyDeath } from './family-bereavement.ts';

export type DeathMemoryKind='friend-died'|'rival-died';
export interface DeathMemory {otherId:number;kind:DeathMemoryKind;at:number;opinion:number}

export const FRIEND_DEATH_DURATION=20*TICKS_PER_DAY;
export const RIVAL_DEATH_DURATION=10*TICKS_PER_DAY;
export const DEATH_MEMORY_LIMIT=5;

export const deathMemoryDuration=(kind:DeathMemoryKind):number=>kind==='friend-died'?FRIEND_DEATH_DURATION:RIVAL_DEATH_DURATION;

/** A death is observed once at the medical state transition. The directed
 * opinion is captured here, so later conversation/decay cannot rewrite grief. */
export function notifyPawnDeath(world:World,deceased:Pawn):void {
  if(!world.pawns.includes(deceased)||deceased.state!=='dead'||!deceased.health?.death)return;
  notifyFamilyDeath(world,deceased);
  for(const observer of world.pawns){
    if(observer===deceased||!isColonist(observer)||observer.prisoner||observer.state==='dead')continue;
    expireBereavement(observer,world.tick);
    if(observer.bereavement?.some(memory=>memory.otherId===deceased.id))continue;
    const opinion=opinionOf(observer,deceased.id,world.tick,world);
    const kind:DeathMemoryKind|undefined=opinion>=20?'friend-died':opinion<=-20?'rival-died':undefined;
    if(!kind)continue;
    const memories=observer.bereavement??=[];
    const same=memories.filter(memory=>memory.kind===kind);
    if(same.length>=DEATH_MEMORY_LIMIT){
      const oldest=same.reduce((a,b)=>a.at<b.at||a.at===b.at&&a.otherId<b.otherId?a:b);
      memories.splice(memories.indexOf(oldest),1);
    }
    memories.push({otherId:deceased.id,kind,at:world.tick,opinion});
  }
}

export function expireBereavement(pawn:Pawn,tick:number):void {
  const memories=pawn.bereavement;if(!memories)return;
  if(!memories.some(memory=>memory.at+deathMemoryDuration(memory.kind)<=tick))return;
  pawn.bereavement=memories.filter(memory=>memory.at+deathMemoryDuration(memory.kind)>tick);
  if(!pawn.bereavement.length)delete pawn.bereavement;
}

/** Only HUD/tick callers evaluate thoughts; there is no render-frame scan. */
export function bereavementThoughts(world:World,pawn:Pawn):MoodThought[] {
  if(pawn.state==='dead')return [];
  const thoughts:MoodThought[]=[];
  for(const memory of pawn.bereavement??[]){
    const expiresAt=memory.at+deathMemoryDuration(memory.kind);
    if(expiresAt<=world.tick)continue;
    const person=world.pawns.find(other=>other.id===memory.otherId);
    const friend=memory.kind==='friend-died';
    thoughts.push({id:`${memory.kind}-${memory.otherId}`,label:`Mort de ${person?.name??'cette personne'} (${friend?'ami':'rival'})`,
      offset:(friend?-10:10)*deathMemoryIntensity(memory.opinion),kind:'memory',expiresAt,
      description:friend?'Décès d’une personne appréciée ; opinion figée au décès.':'Décès d’une personne détestée ; opinion figée au décès.'});
  }
  // Core groups formatted labels, so two homonyms share a diminishing group;
  // their identities and individual expiry clocks remain separate in the save.
  const groups=new Map<string,MoodThought[]>();
  for(const thought of thoughts){const group=groups.get(thought.label);if(group)group.push(thought);else groups.set(thought.label,[thought]);}
  return [...groups.values()].map(group=>group.length===1?group[0]!:({...group[0]!,
    label:`${group[0]!.label} ×${group.length}`,
    offset:group.reduce((sum,t)=>sum+t.offset,0)/group.length*(1-.75**group.length)/.25,
    expiresAt:Math.min(...group.map(t=>t.expiresAt!)),
    description:'Souvenirs de personnes homonymes ; effet moyen pondéré à 0,75, prochaine expiration individuelle.'}));
}

/** The Core-inspired intensity rises from 0.15 at the eligible boundary to
 * one at the strongest opinion; the fixed branch strength remains separate. */
export function deathMemoryIntensity(opinion:number):number {
  return .15+.85*(Math.max(20,Math.min(100,Math.abs(opinion)))-20)/80;
}
