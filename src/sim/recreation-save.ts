import { initialRecreation, RECREATION_DURATION, RECREATION_KINDS } from './recreation-rules.ts';
import { isHorseshoeCell } from './recreation-space.ts';
import type { World } from './types.ts';

const record=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const meter=(v:unknown):boolean=>typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=100;
export function initializeRecreation(world: World): void {
  world.schemaVersion=15;
  // No invented past boredom, no RNG draws and no interruption at load time.
  for(const pawn of world.pawns)pawn.recreation=initialRecreation();
}
/** Called after basic pawn/coordinates validation; dynamic site availability is
 * rechecked before the next action, so an obstructed route is not a corrupt save. */
export function validateRecreation(world: World, version: number): string[] {
  if(version<15)return [];
  const errors:string[]=[], users=new Map<number,number>();
  for(const pawn of world.pawns) {
    const joy:unknown=pawn.recreation;
    if(!record(joy)||!meter(joy.level)||!record(joy.tolerance)||!record(joy.bored)
      ||Object.keys(joy.tolerance).length!==2||Object.keys(joy.bored).length!==2
      ||RECREATION_KINDS.some(k=>!meter((joy.tolerance as Record<string,unknown>)[k])||typeof (joy.bored as Record<string,unknown>)[k]!=='boolean')) {errors.push('Invalid recreation need.');continue;}
    for(const kind of RECREATION_KINDS) {
      const value=joy.tolerance[kind] as number, bored=joy.bored[kind];
      if(value>50&&!bored||value<30&&bored)errors.push('Inconsistent recreation boredom.');
    }
    const task=joy.task;
    if(task===null){if(pawn.state==='recreating')errors.push('Recreation state has no activity.');continue;}
    if(!record(task)||!['skygaze','horseshoes'].includes(task.activity as string)||!['travel','active'].includes(task.phase as string)
      ||!Number.isInteger(task.elapsed)||(task.elapsed as number)<0||(task.elapsed as number)>=RECREATION_DURATION
      ||!record(task.target)||!Number.isInteger(task.target.x)||!Number.isInteger(task.target.z)
      ||(task.target.x as number)<0||(task.target.z as number)<0||(task.target.x as number)>=world.width||(task.target.z as number)>=world.height) {errors.push('Invalid recreation activity.');continue;}
    if(pawn.jobId!==null||pawn.haul||pawn.cooking||pawn.need)errors.push('Recreation conflicts with another task.');
    if(task.phase==='travel'?(pawn.state!=='moving'||task.elapsed!==0):(pawn.state!=='recreating'||pawn.path.length>0||pawn.moveCooldown>0||pawn.x!==task.target.x||pawn.z!==task.target.z))errors.push('Invalid recreation phase or position.');
    if(task.activity==='skygaze') {if(task.buildingId!==null)errors.push('Skygazing cannot claim a building.');}
    else {
      const pin=world.structures.find(s=>s.id===task.buildingId&&s.kind==='horseshoes');
      if(!pin||!isHorseshoeCell(pin,task.target as unknown as {x:number;z:number}))errors.push('Invalid horseshoes source or throwing spot.');
      else {const count=(users.get(pin.id)??0)+1;users.set(pin.id,count);if(count>3)errors.push('Too many horseshoes participants.');}
    }
  }
  return errors;
}
