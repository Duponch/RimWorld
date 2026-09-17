import { canStandAt } from './furniture-travel.ts';
import { routeToCell,routeCost,workNeighbours,type Reachability } from './pathfinding.ts';
import { reservedServiceCells } from './service-reservations.ts';
import type { Cell,Pawn,World } from './types.ts';

export const lyingPatient=(p:Pawn):boolean=>p.state!=='dead'&&p.moveCooldown===0&&p.need?.kind==='sleep'&&p.need.phase==='sleep'&&p.need.bedId!==null;
export const patientClaimed=(world:World,patientId:number,except:Pawn):boolean=>world.pawns.some(p=>p!==except&&(p.tend?.patientId===patientId||p.feed?.patientId===patientId));
/** One decision owns this search and reservation view; never retained across ticks. */
export function bedsideAccess(world:World,doctor:Pawn,patient:Pawn,reach:Reachability):{spot:Cell;path:Cell[];cost:number}|undefined {
  const reserved=reservedServiceCells(world,doctor.id);let best:{spot:Cell;path:Cell[];cost:number}|undefined;
  for(const spot of workNeighbours(patient))if(canStandAt(world,spot)&&!reserved.has(spot.z*world.width+spot.x)){
    const path=routeToCell(world,spot,reach);if(path){const cost=routeCost(world,path,reach);if(!best||cost<best.cost)best={spot,path,cost};}
  }
  return best;
}
