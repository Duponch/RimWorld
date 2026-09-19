import { isColonist } from './affiliation.ts';
import { DOOR_CLOSE_DELAY, doorAt, doorOpenness, doorOpenTicks } from './door-rules.ts';
import type { Cell, CommandResult, Pawn, Structure, World } from './types.ts';
export type DoorCommand={type:'door-policy';structureId:number;setting:'holdOpen'|'forbidden';value:boolean};

function openDoor(world:World,s:Structure):void {
  const d=s.door!;
  if(!d.open){d.from=doorOpenness(s,world.tick);d.changedAt=world.tick;d.open=true;}
  d.closeAt=world.tick+(1-doorOpenness(s,world.tick))*doorOpenTicks(s)+DOOR_CLOSE_DELAY;
}
/** Called before committing an edge. Waiting consumes no path or travel distance. */
export function readyDoorEntry(world:World,pawn:Pawn,next:Cell):boolean {
  const s=doorAt(world,next);if(!s)return true;
  const d=s.door!;if(!isColonist(pawn))return d.open&&doorOpenness(s,world.tick)>=1-1e-9;
  if(d.forbidden)return false;
  d.lastTouch=world.tick;
  if(!d.open)openDoor(world,s);
  if(doorOpenness(s,world.tick)<1-1e-9)return false;
  d.closeAt=world.tick+DOOR_CLOSE_DELAY;return true;
}
/** Index bodies/edges/items once, rather than scanning every actor for each door.
 * Edge endpoints protect the physical passage until the GPU-visible body clears. */
export function updateDoors(world:World):void {
  const doors=world.structures.filter(s=>s.kind==='door');if(!doors.length)return;
  const bodies=new Set<number>(),friendly=new Set<number>(),objects=new Set<number>();
  const add=(c:Cell)=>bodies.add(c.z*world.width+c.x);
  for(const p of world.pawns){add(p);if(p.motion&&p.motion.end>world.tick)add(p.motion.from);if(isColonist(p)){friendly.add(p.z*world.width+p.x);if(p.motion&&p.motion.end>world.tick)friendly.add(p.motion.from.z*world.width+p.motion.from.x);}}
  for(const a of world.wildlife?.animals??[]){add(a);if(a.motion&&a.motion.end>world.tick)add(a.motion.from);}
  for(const p of world.piles)if(p.owner.type==='ground')objects.add(p.owner.z*world.width+p.owner.x);
  for(const p of world.packed)if(p.owner.type==='ground')objects.add(p.owner.z*world.width+p.owner.x);
  for(const s of doors) {
    const d=s.door!,i=s.z*world.width+s.x;
    if(!d.open)continue;
    if(bodies.has(i)){if(!d.forbidden&&friendly.has(i))d.lastTouch=world.tick;d.closeAt=world.tick+DOOR_CLOSE_DELAY;}
    if(d.closeAt!==null&&world.tick>=d.closeAt) {
      if(d.holdOpen)d.closeAt=null;
      else if(bodies.has(i)||objects.has(i))d.closeAt=world.tick+1;
      else {d.from=doorOpenness(s,world.tick);d.changedAt=world.tick;d.open=false;d.closeAt=null;}
    } else if(d.closeAt===null&&!d.holdOpen&&world.tick<d.lastTouch+12)d.closeAt=world.tick+DOOR_CLOSE_DELAY;
  }
}
export function applyDoorCommand(world:World,c:DoorCommand):CommandResult {
  if(!Number.isSafeInteger(c.structureId)||typeof c.value!=='boolean'||!['holdOpen','forbidden'].includes(c.setting))return {ok:false,code:'invalid-command',reason:'Réglage de porte invalide.'};
  const s=world.structures.find(s=>s.id===c.structureId&&s.kind==='door');
  if(!s)return {ok:false,code:'missing-target',reason:'Cette porte n’existe plus.'};
  s.door![c.setting]=c.value;
  // An accepted edge remains physical. Future edges revalidate this permission.
  for(const p of world.pawns)p.planCooldown=0;
  return {ok:true};
}
