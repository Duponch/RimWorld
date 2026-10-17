import {animalCore256,isAnimalSpecies256} from '../sim/animal-core-v256.ts';
import {CORE_ANIMAL_BODIES_256} from '../sim/animal-anatomy-data-v256.ts';
import {animalPartId256} from '../sim/animal-anatomy-v256.ts';
import type {BodyPartId} from '../sim/body-definition.ts';
const cache=new Map<string,readonly BodyPartId[]>();
/** Exact visible anatomical roots fit the established23bit float word. Tiny
 * fingers/claws have clinical identities but share their enclosing silhouette;
 * this projection does not pretend to display individual lost digits. */
export function animalVisualParts256(species:string):readonly BodyPartId[]|undefined {
 if(!isAnimalSpecies256(species))return;
 const body=animalCore256(species).race.body;let parts=cache.get(body);if(parts)return parts;
 const rows=CORE_ANIMAL_BODIES_256[body];
 parts=Object.freeze(rows.filter(row=>row.depth==='outside'&&!row.conceptual&&!['Finger','Toe','FrontClaw','RearClaw','Claw','Shoulder'].includes(row.defId)).map(row=>animalPartId256(body,row.index)));
 if(parts.length>23)throw Error('Animal visible anatomy exceeds resident mask.');
 cache.set(body,parts);return parts;
}
