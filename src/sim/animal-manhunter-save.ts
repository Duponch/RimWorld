import type { World } from './types.ts';
import type { WildAnimal } from './wildlife-state.ts';
import { isRoomDoor } from './door-rules.ts';
import { animalSpecies,isAnimalSpecies } from './animal-species.ts';

const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const int=(v:unknown,min=0,max=Number.MAX_SAFE_INTEGER):v is number=>Number.isSafeInteger(v)&&Number(v)>=min&&Number(v)<=max;
const keys=(v:Record<string,unknown>,allowed:string[])=>Object.keys(v).every(k=>allowed.includes(k));
type BoundaryWorld=Pick<World,'tick'|'nextId'|'pawns'|'structures'|'raids'|'width'|'height'|'wildlife'|'jobs'|'piles'|'resources'|'packed'>;
/** Recovery survives loss of its door and mental state. It still owns a
 * valid past contact and cannot borrow a live actor's global identity. */
function validDoorStrike(w:BoundaryWorld,version:number,a:WildAnimal):boolean {
  const s=a.strike;if(s?.structure===undefined)return true;
  if(version<183||!isAnimalSpecies(a.species)||!Array.isArray(a.path)||!object(s)||!keys(s,['targetId','atCore','untilCore','tool','outcome','structure'])
    ||!object(s.structure)||!keys(s.structure,['x','z'])||!int(s.structure.x,0,w.width-1)||!int(s.structure.z,0,w.height-1)
    ||!int(s.targetId,1,w.nextId-1)||!int(s.atCore,0,w.tick*10)||!int(s.untilCore,w.tick*10+1)
    ||s.outcome!=='hit'||!animalSpecies(a.species).melee.some(t=>t.id===s.tool&&s.untilCore-s.atCore===t.cooldownCore)
    ||!['idle','sleeping'].includes(a.state)||a.path.length||(a.motion?.end??0)>w.tick||a.meal)return false;
  const door=w.structures.find(d=>d.id===s.targetId),c=s.structure;
  if(door&&(!isRoomDoor(door.kind)||door.x!==c.x||door.z!==c.z))return false;
  return ![w.pawns,w.jobs,w.piles,w.resources,w.wildlife?.animals??[]].some(items=>items.some(i=>i.id===s.targetId))
    &&!w.packed.some(p=>p.building.id===s.targetId);
}
/** Closed sparse shape, with no navigation or medical mutation at transport. */
export function validAnimalManhunter(w:BoundaryWorld,version:number,a:WildAnimal):boolean {
  if(!validDoorStrike(w,version,a))return false;
  const m:unknown=a.manhunter;if(m===undefined)return true;
  if(version<183||!object(m)||!keys(m,['startedAtCore','rng','zeroRestTicks','exhausted','targetId','door'])
    ||!int(m.startedAtCore,0,w.tick*10)||!int(m.rng,1,0xffffffff)
    ||!int(m.zeroRestTicks,0,w.tick*10-m.startedAtCore+150)||m.zeroRestTicks%150!==0
    ||a.domestic||a.meal||a.predation||a.exiting||a.flee||a.threat||a.retaliation||a.mating||a.taming
    ||!['idle','moving','sleeping'].includes(a.state))return false;
  if(m.exhausted!==undefined&&(m.exhausted!==true||m.zeroRestTicks<=1000||a.rest>=.0001||a.path.length||m.targetId!==undefined||m.door!==undefined))return false;
  if(m.targetId!==undefined&&(!int(m.targetId,1,w.nextId-1)||!w.pawns.some(p=>p.id===m.targetId)&&!w.raids?.departed.some(p=>p.pawnId===m.targetId)))return false;
  if(m.door!==undefined){
    const d=m.door;
    if(!object(d)||!keys(d,['targetId','remaining','untilCore'])||!int(d.targetId,1,w.nextId-1)||!int(d.remaining,0,5)
      ||!int(d.untilCore,w.tick*10+1,w.tick*10+3999)||m.targetId===undefined
      ||!w.structures.some(s=>s.id===d.targetId&&!!s.door))return false;
  }
  return true;
}
export function validWildlifeManhunterState(w:BoundaryWorld,version:number):boolean {
  if(w.wildlife===undefined)return true;
  return object(w.wildlife)&&Array.isArray(w.wildlife.animals)&&w.wildlife.animals.every(a=>object(a)&&validAnimalManhunter(w,version,a));
}
