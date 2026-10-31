import {initializeDeclaredFixtureTick298} from './initial-core-clock298-port.ts';
import {createDeteriorationState} from '../../src/sim/deterioration-content.ts';
import {deconstructionCamp} from '../scenarios/deconstruction.ts';
import type {Pawn,World} from '../../src/sim/types.ts';

export function medicalCamp298(count=1,size=32):World {
  const w=deconstructionCamp(count,size);initializeDeclaredFixtureTick298(w,3000);w.deterioration=createDeteriorationState(w.seed,w.tick);w.stockpiles=[];w.growingZones=[];
  for(const p of w.pawns){p.recreation.level=100;p.schedule.fill('work');p.bedId=null;for(const key of Object.keys(p.priorities) as (keyof Pawn['priorities'])[])p.priorities[key]=0;}
  return w;
}
