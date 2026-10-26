import { wallDoorBlueprint296 } from '../sim/wall-door-state-296';
import type { Job, World } from '../sim/types';

/** A future blueprint is selectable by its own reserved identity. The removal
 * execution itself is shown only when the player also designated the wall. */
export function selectedMapJob296(world:Pick<World,'jobs'>,id:number):Job|undefined {
  const job=world.jobs.find(j=>j.id===id);
  if(job)return job.wallDoor296?.manual===false?undefined:job;
  const parent=world.jobs.find(j=>j.wallDoor296?.plan?.id===id);
  return parent?wallDoorBlueprint296(parent):undefined;
}
export function* selectableMapJobs296(world:Pick<World,'jobs'>):Iterable<Job> {
  for(const job of world.jobs){
    if(job.wallDoor296?.manual!==false)yield job;
    if(job.wallDoor296?.plan)yield wallDoorBlueprint296(job)!;
  }
}
