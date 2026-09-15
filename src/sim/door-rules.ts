import type { Cell, Structure, World } from './types.ts';
import { isBlockMaterial } from './building-materials.ts';

/** Timed leaf segment, distinct from permission and logical opening. */
export interface DoorState {
  open:boolean;
  holdOpen:boolean;
  forbidden:boolean;
  changedAt:number;
  from:number;
  closeAt:number|null;
  lastTouch:number;
}
export const DOOR_CLOSE_DELAY=11;
export const doorOpenTicks=(s:Pick<Structure,'material'>):number=>
  Math.round(45/(isBlockMaterial(s.material)? .45:s.material==='wood'?1.2:1))/10;
export const newDoorState=(tick:number):DoorState=>({open:false,holdOpen:false,forbidden:false,changedAt:tick,from:0,closeAt:null,lastTouch:-12});
export function builtDoorState(world:World,s:Cell&Pick<Structure,'material'>):DoorState {
  const state=newDoorState(world.tick);
  if(world.piles.some(p=>p.owner.type==='ground'&&p.owner.x===s.x&&p.owner.z===s.z)||world.packed.some(p=>p.owner.type==='ground'&&p.owner.x===s.x&&p.owner.z===s.z)) {
    state.open=true;state.closeAt=world.tick+doorOpenTicks(s)+DOOR_CLOSE_DELAY;
  }
  return state;
}
export function doorOpenness(s:Structure,tick:number):number {
  const d=s.door!;
  return Math.max(0,Math.min(1,d.from+(d.open?1:-1)*(tick-d.changedAt)/doorOpenTicks(s)));
}
export const doorAt=(world:World,c:Cell):Structure|undefined=>world.structures.find(s=>s.kind==='door'&&s.x===c.x&&s.z===c.z);
export const doorWait=(s:Structure,tick:number):number=>s.door!.open?Math.max(0,(1-doorOpenness(s,tick))*doorOpenTicks(s)):doorOpenTicks(s);
/** Doors retain a solid frame at diagonal side cells, including while open. */
export const doorCorners=(world:World):ReadonlySet<number>=>new Set(world.structures.filter(s=>s.kind==='door').map(s=>s.z*world.width+s.x));

/** Visual axis follows adjacent solids/plans; rotation never changes footprint. */
export function doorOrientation(world:World,c:Cell):0|1 {
  return doorOrientations(world).get(c.z*world.width+c.x)??0;
}
export function doorOrientations(world:World):ReadonlyMap<number,0|1> {
  const scores=new Map<number,number>(),result=new Map<number,0|1>();
  for(const s of [...world.structures,...world.jobs])if(s.kind==='wall'||s.kind==='door')scores.set(s.z*world.width+s.x,s.kind==='wall'?9:1);
  const score=(x:number,z:number)=>{
    if(x<0||z<0||x>=world.width||z>=world.height)return 0;
    if(['rock','water'].includes(world.tiles[z*world.width+x]!.terrain))return 9;
    return scores.get(z*world.width+x)??0;
  };
  for(const c of world.structures)if(c.kind==='door')result.set(c.z*world.width+c.x,score(c.x-1,c.z)+score(c.x+1,c.z)>=score(c.x,c.z-1)+score(c.x,c.z+1)?0:1);
  return result;
}
