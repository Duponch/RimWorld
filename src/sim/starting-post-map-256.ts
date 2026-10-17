import {isSchema256Or257} from './schema-compatibility-257.ts';
import {addCryptosleepSickness256} from './cryptosleep-sickness-256.ts';
import {createMedicalRecord} from './injury-state.ts';
import {CORE_STARTING_ARRIVAL_PROFILE_256} from './starting-pod-state-256.ts';
import type {CoreStartingArrivalPending256} from './starting-pod-state-256.ts';
import type {StartingOriginalRoster256} from './starting-original-roster-256.ts';
import {requireConsumedStartingOriginalRoster256} from './starting-original-roster-256.ts';
import type {WorldGenerationRandom} from './world-generation-random.ts';
import type {World} from './types.ts';
const completed=new WeakSet<World>();
/** True Scenario.PostMapGenerate frontier, AFTER all GenSteps returned and
 * popped their local streams. This is the SAME outer Init/weather object,
 * not the875 terminal counter. Only the actual selected three remain in
 * GameInitData after PrepForMapGen; the five real reserves receive no roll. */
export function applyCoreStartingPostMap256(world:World,roster:StartingOriginalRoster256,input:{
 random:WorldGenerationRandom;
 outerAfterWeather:Readonly<{seed:number;counter:number}>;
}):void {
 requireConsumedStartingOriginalRoster256(world,roster);
 const arrival=world.startingArrival,state=input.random.state,frontier=input.outerAfterWeather;
 if(completed.has(world)||world.tick!==0||!isSchema256Or257(world.schemaVersion)||!arrival||arrival.profile!==CORE_STARTING_ARRIVAL_PROFILE_256||arrival.phase==='opened'
  ||state.seed!==frontier.seed||state.counter!==frontier.counter)throw Error('Actual outer PostMapGenerate frontier is missing or consumed');
 const current=arrival as CoreStartingArrivalPending256;
 if(current.pods.length!==3||current.pods.some((p,i)=>p.pawn!==roster.selected[i]!.pawn))throw Error('PostMapGenerate did not retain the selected originals');
 // All operations are inside the unpublished initial candidate. A refused
 // later phase discards it; no active World or historic Pawn is modified.
 for(const {pawn} of current.pods){if(input.random.value()>=Math.fround(.5))continue;
  pawn.health??=createMedicalRecord(0);addCryptosleepSickness256(pawn.health,input.random,256);
 }
 completed.add(world);
}
