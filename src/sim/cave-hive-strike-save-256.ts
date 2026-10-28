import {validationCore297} from './core-phase-297.ts';
import {isSchema256Or257} from './schema-compatibility-257.ts';
/** Same original cooldown/tool/contact record, broader actual building target
 * only for the three new factioned insects. Historical door bashing is intact. */
import type {World} from './types.ts';
import type {WildAnimal} from './wildlife-state.ts';
import {isCaveInsectSpecies256} from './cave-insect-constructor-256.ts';
import {actualAnimalMeleeProfile256} from './actual-animal-profile-256.ts';
type Header=Pick<World,'width'|'height'|'tick'|'nextId'|'structures'|'pawns'|'jobs'|'piles'|'resources'|'packed'|'wildlife'>;
export function validHiveStructureStrike256(w:Header,version:number,a:WildAnimal,coreNow297?:number):boolean|undefined {
 if(!isCaveInsectSpecies256(a.species)||!a.hive||!a.strike?.structure)return;
 const core=version===297?validationCore297(version,w.tick,coreNow297):w.tick*10;if(version===297&&!Number.isSafeInteger(core))return false;
 const s=a.strike,c=s.structure!,int=(v:unknown,min:number,max=Number.MAX_SAFE_INTEGER)=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=min&&v<=max;
 if(!isSchema256Or257(version)||Object.keys(s).some(k=>!['targetId','atCore','untilCore','tool','outcome','structure'].includes(k))||Object.keys(c).some(k=>k!=='x'&&k!=='z')||!int(c.x,0,w.width-1)||!int(c.z,0,w.height-1)||!(s.targetId===null||int(s.targetId,1,w.nextId-1))||!int(s.atCore,0,core)||!int(s.untilCore,core+1)||s.outcome!=='hit'||!actualAnimalMeleeProfile256(a).some(t=>t.id===s.tool&&s.untilCore-s.atCore===t.cooldownCore)||!['idle','sleeping'].includes(a.state)||a.path.length||(a.motion?.end??0)>(version===297?core/10:w.tick)||a.meal)return false;
 if(s.targetId===null)return true;
 const target=w.structures.find(b=>b.id===s.targetId);
 return !!target&&target.x===c.x&&target.z===c.z;
}
