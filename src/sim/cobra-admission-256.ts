import {isSchema256Or257} from './schema-compatibility-257.ts';
import {captureHumanOwners} from './human-owners.ts';
import {hasHumanConditionMind256} from './human-condition-mind-256.ts';
import type {World} from './types.ts';
import type {Pawn} from './types.ts';
import type {WildAnimal} from './wildlife-state.ts';
export function cobraCohortReason256(humans:readonly Pawn[],animals:readonly WildAnimal[]):string|undefined {
 for(const p of humans)if(p.state!=='dead'&&!hasHumanConditionMind256(p))return 'Historical human has no actual clinical wander authority';
 for(const a of animals)if(a.state!=='dead'&&!a.wander)return 'Historical animal has no actual clinical wander authority';
 return;
}
/** Read-only rare transition preflight. Unknown historical MindState is an
 * explicit unsupported frontier, never initialized by a bite/load/episode.
 * The ecological producer keeps the chosen Cobra; it does not choose again. */
export function cobraAdmissionReason256(world:World):string|undefined {
 if(!isSchema256Or257(world.schemaVersion))return 'Cobra requires prospective256 owners';
 const humans=captureHumanOwners(world).pawnOwners.flatMap(slot=>slot.pawn?[slot.pawn]:[]),animals=[...world.wildlife?.animals??[],...(world.wildlife?.flyers??[]).map(f=>f.animal)];
 for(const row of world.worldGroups?.groups??[])if('members'in row.state)animals.push(...row.state.animalOwners?.members??[]);
 for(const row of world.worldGroups?.abandonedContents??[])animals.push(...row.animals.map(a=>a.animal));
 for(const row of world.worldFactions?.leaders??[])humans.push(row.pawn);
 return cobraCohortReason256(humans,animals);
}
