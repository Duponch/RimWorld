import {isSchema282OrLater} from './schema-compatibility-257.ts';
import {doorOpenness,isPassageDoor} from './door-rules.ts';
import type {Structure,World} from './types.ts';
import type {WildAnimal} from './wildlife-state.ts';

type DoorWorld282=Pick<World,'schemaVersion'|'worldFactions'|'tick'>;
const actualPlayerAnimal=(w:DoorWorld282,a:WildAnimal):boolean=>isSchema282OrLater(w.schemaVersion)&&!!a.domestic&&a.state!=='dead'&&a.shipCryptosleepHeldAt277===undefined;
/** Same actual faction/relationship authority as the foreign-door human
 * route, with the original domestic animal as player faction. No fabricated
 * colonist or blanket permission to operate foreign doors. */
export function animalHaulDoorCanOpen282(w:DoorWorld282,a:WildAnimal,s:Structure):boolean {
 if(!actualPlayerAnimal(w,a)||!isPassageDoor(s.kind)||!s.door||s.door.forbidden)return false;
 if(!Object.hasOwn(s,'factionId')||s.factionId===null)return true;
 const factions=w.worldFactions;if(!factions||s.factionId===undefined)return false;
 const own=factions.playerFactionId;if(s.factionId===own)return true;
 if(!factions.factions.some(f=>f.id===s.factionId))return false;
 const relation=factions.relations.find(r=>r.aId===Math.min(own,s.factionId!)&&r.bId===Math.max(own,s.factionId!));
 return !!relation&&relation.kind!=='hostile';
}
/** Planning may include a closed door this animal can actually operate.
 * Physical traversal always requires its completed real opening segment.
 * A foreign hostile door already open may be crossed without operating it;
 * forbidden policy remains a refusal in both modes. */
export function animalHaulDoorPassable282(w:DoorWorld282,a:WildAnimal,s:Structure,allowOpening=false):boolean {
 if(!actualPlayerAnimal(w,a)||!isPassageDoor(s.kind)||!s.door||s.door.forbidden)return false;
 return s.door.open&&doorOpenness(s,w.tick)>=1-1e-9||allowOpening&&animalHaulDoorCanOpen282(w,a,s);
}
