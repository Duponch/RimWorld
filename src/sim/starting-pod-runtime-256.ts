import {isCorePhysicalSchema297} from './physical-schema-297.ts';
import {effectiveCore297} from './core-phase-297.ts';
import {isSchema256Or257} from './schema-compatibility-257.ts';
import {hitSkyfallerRoof256} from './roofing.ts';
import {prepareStartingPodDischarge256} from './starting-pod-discharge-256.ts';
import {CORE_STARTING_ARRIVAL_PROFILE_256,CORE_STARTING_OPEN_DELAY_256,finishCoreStartingArrival256,type CoreStartingArrivalPending256} from './starting-pod-state-256.ts';
import type {World} from './types.ts';
/** Prospective only. Each local10Core boundary preserves the real per-pod
 * incoming duration and111 active Core ticks. Existing fifteen/twelve local
 * arrival timing is never migrated, reinterpreted or called through here. */
export function advanceCoreStartingArrival256(world:World):void {
 const value=world.startingArrival;if(!value||value.profile!==CORE_STARTING_ARRIVAL_PROFILE_256||value.phase==='opened')return;
 const arrival=value as CoreStartingArrivalPending256;
 if(!isSchema256Or257(world.schemaVersion)||world.site?.revision!==3||world.planet?.revision!==3||world.tick<1||arrival.atCore!==(world.tick-1)*10)throw Error('Core initial arrival lost its actual confirmed frontier');
 const failedRoofs=new Set<number>(),failedOpenings=new Set<number>();
 for(let core=(world.tick-1)*10+1;core<=world.tick*10;core++){
  // Snapshot membership only. A completed pod leaves this actual owner list
  // before another one opens; later placement reads its newly spawned Things.
  for(const pod of [...arrival.pods]){
   if(!arrival.pods.includes(pod))continue; // another real roof/impact may have destroyed this holder
   if(pod.phase==='incoming'){
    if(failedRoofs.has(pod.id))continue;
    pod.remainingCore=Math.max(0,pod.remainingCore-1);
    if(!pod.roofHit&&pod.remainingCore<=15){
     // This arrival subsystem commits its ten-step batch at the macro frontier.
     // Roof impacts must use that actual physical frontier, not a replayed
     // interior step that the strict physical roof owner correctly refuses.
     const roofCore=isCorePhysicalSchema297(Number(world.schemaVersion))?effectiveCore297(world):core;
     if(!hitSkyfallerRoof256(world,pod.cell,roofCore)){
      // Same explicit pending refusal as the existing real flyer holder.
      // One physical attempt per local boundary, no reroute, drop or free
      // extinction. This exceptional retry is not claimed as native timing.
      pod.remainingCore=0;failedRoofs.add(pod.id);continue;
     }pod.roofHit=true;
    }
    if(pod.remainingCore===0){pod.phase='landed';pod.ageCore=0;}
    continue;
   }
   if(failedOpenings.has(pod.id))continue;
   pod.ageCore=Math.min(111,pod.ageCore+1);
   if(pod.ageCore<=CORE_STARTING_OPEN_DELAY_256)continue;
   const opening=prepareStartingPodDischarge256(world,arrival,pod);
   if(opening.status!=='ready'){failedOpenings.add(pod.id);continue;}
   opening.commit();
  }
  if(!arrival.pods.length){finishCoreStartingArrival256(world,arrival);return;}
 }
 arrival.atCore=world.tick*10;arrival.phase=arrival.pods.some(p=>p.phase==='incoming')?'incoming':'landed';
}
