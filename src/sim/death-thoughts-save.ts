import {captureHumanOwners} from './human-owners.ts';
import {DEATH_THOUGHT_RULES} from './death-thoughts-rules.ts';
import type {DeathThoughtKind,DeathThoughtMemory} from './death-thoughts-state.ts';
import type {World} from './types.ts';

const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const integer=(v:unknown,min=0,max=Number.MAX_SAFE_INTEGER):v is number=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=min&&v<=max;

/** Memories preserve the observed event, not today's line of sight, trait,
 * affiliation or surviving corpse Thing. A dead observer freezes its memories. */
export function validDeathThoughtsShape(value:unknown,version:number,tick:number,frozen=false):value is DeathThoughtMemory[]|undefined {
  if(value===undefined)return true;
  if(version<209||!integer(tick)||!Array.isArray(value)||!value.length||value.length>25
    ||Object.keys(value).length!==value.length||Object.keys(value).some((key,index)=>key!==String(index)))return false;
  const seen=new Set<string>(),counts=new Map<DeathThoughtKind,number>();
  for(const memory of value){
    if(!object(memory)||Reflect.ownKeys(memory).length!==3||Object.keys(memory).some(k=>!['kind','otherId','at'].includes(k))
      ||typeof memory.kind!=='string'||!Object.hasOwn(DEATH_THOUGHT_RULES,memory.kind)||!integer(memory.otherId,1)||!integer(memory.at,0,tick))return false;
    const kind=memory.kind as DeathThoughtKind,rule=DEATH_THOUGHT_RULES[kind],key=`${kind}:${memory.otherId}`;
    const count=(counts.get(kind)??0)+1;
    if(seen.has(key)||count>rule.limit||!frozen&&memory.at+rule.duration<=tick)return false;
    seen.add(key);counts.set(kind,count);
  }
  return true;
}

export function validDeathThoughtsPawnShape(pawn:Record<string,unknown>,version:number,tick:number):boolean {
  if(!Object.hasOwn(pawn,'deathThoughts'))return true;
  if(pawn.deathThoughts===undefined)return false;
  const dead=pawn.state==='dead',deathAt=object(pawn.health)&&object(pawn.health.death)?pawn.health.death.tick:undefined;
  return validDeathThoughtsShape(pawn.deathThoughts,version,tick,dead)
    &&(!dead||integer(deathAt,0,tick)&&pawn.deathThoughts!.every(m=>m.at<=deathAt));
}

/** One scoped human capture after the ordinary owners have been validated.
 * Archives retain departure clocks; terminal people retain their death clock.
 * The common absence path does not capture possessions or invent state. */
export function validDeathThoughtsTransport(world:World,version:number=world.schemaVersion):boolean {
  try {
    const candidates:unknown[]=[...world.pawns];
    for(const owner of [world.scout,world.commercialTrip])if(owner&&'pawn' in owner)candidates.push(owner.pawn);
    if(world.group&&'members' in world.group)candidates.push(...world.group.members);
    candidates.push(...(world.groupLosses??[]).map(loss=>loss.pawn));
    for(const records of [world.visitors?.departed??[],world.podRescues?.departed??[]])candidates.push(...records.map(d=>d.pawn));
    if(!candidates.some(p=>object(p)&&Object.hasOwn(p,'deathThoughts')))return true;
    const capture=captureHumanOwners(world);
    for(const slot of capture.pawnOwners){
      const pawn=slot.pawn!;
      if(!validDeathThoughtsPawnShape(pawn as unknown as Record<string,unknown>,version,slot.validationTick))return false;
      for(const memory of pawn.deathThoughts??[]){
        const other=capture.people.get(memory.otherId);
        if(memory.otherId===pawn.id||other?.status!=='dead'||other.deathAt===undefined||memory.at<other.deathAt)return false;
      }
    }
    return true;
  }catch{return false;}
}
