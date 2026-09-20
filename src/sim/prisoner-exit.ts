import { atMapEdge } from './raid-space.ts';
import { exitRaider } from './raids.ts';
import type { Cell,MaterialPile,Pawn,World } from './types.ts';

export interface PrisonDeparture { pawnId:number;name:string;capturedAt:number;tick:number;cell:Cell;items:MaterialPile[] }

/** Exit after the pawn loop, once the physical edge has arrived. The departure
 * retains ownership identities; a carried meal must first be eaten or dropped. */
export function exitPrisoner(world:World,pawn:Pawn):boolean {
  if(!pawn.prisoner?.escape||!atMapEdge(world,pawn)||pawn.state==='dead'||pawn.state==='downed'||pawn.need||pawn.moveCooldown>0||(pawn.motion?.end??0)>world.tick||pawn.interruptedCargo||pawn.equipmentDropPending||(pawn.stun?.untilCore??0)>world.tick*10)return false;
  if(world.piles.some(i=>i.owner.type==='pawn'&&i.owner.pawnId===pawn.id)||world.packed.some(i=>i.owner.type==='pawn'&&i.owner.pawnId===pawn.id))return false;
  if(pawn.raid){pawn.raid.exiting=true;return exitRaider(world,pawn);}
  if((world.prisonDepartures?.length??0)>=world.width*world.height)return false;
  const items=world.piles.filter(i=>(i.owner.type==='apparel'||i.owner.type==='equipment')&&i.owner.pawnId===pawn.id);
  (world.prisonDepartures??=[]).push({pawnId:pawn.id,name:pawn.name,capturedAt:pawn.prisoner.capturedAt,tick:world.tick,cell:{x:pawn.x,z:pawn.z},items});
  world.pawns=world.pawns.filter(p=>p!==pawn);world.piles=world.piles.filter(i=>!items.includes(i));
  world.events.push({tick:world.tick,type:'command',message:`${pawn.name} s'est échappé au bord de la carte avec ses objets portés.`});
  if(world.events.length>80)world.events.splice(0,world.events.length-80);
  return true;
}
