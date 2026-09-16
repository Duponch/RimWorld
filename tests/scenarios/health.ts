import { deconstructionCamp,fixtureBuilding } from './deconstruction.ts';
import { carrierWithHelper } from './interrupted-cargo.ts';
import { createMedicalRecord,addResolvedInjury } from '../../src/sim/injury-state.ts';
import { reconcilePawnHealth } from '../../src/sim/health.ts';
import type { Pawn,World } from '../../src/sim/types.ts';

export function medicalCamp(count=1,size=32):World {
  const w=deconstructionCamp(count,size);w.tick=3000;w.stockpiles=[];w.growingZones=[];
  for(const p of w.pawns){p.recreation.level=100;p.schedule.fill('work');p.bedId=null;for(const key of Object.keys(p.priorities) as (keyof Pawn['priorities'])[])p.priorities[key]=0;}
  return w;
}
export function controlledInjury(w:World,p:Pawn,part:Parameters<typeof addResolvedInjury>[1],severity:number,kind:Parameters<typeof addResolvedInjury>[2]='bruise'):void {
  p.health??=createMedicalRecord(w.tick);addResolvedInjury(p.health,part,kind,severity,()=>.999999);reconcilePawnHealth(w,p);
}
export function roofAccidentCamp():World {
  const w=medicalCamp(2),worker=w.pawns[0]!,bystander=w.pawns[1]!;
  Object.assign(worker,{x:13,z:16});worker.priorities.build=1;
  Object.assign(bystander,{x:13,z:17});fixtureBuilding(w,'wall',14,16);
  w.roofing={constructed:[16*32+13,17*32+13,17*32+14],build:[],remove:[],cursor:0};
  return w;
}
export function medicalCarrier():World {
  const w=carrierWithHelper(),p=w.pawns[0]!;
  p.rest=80;p.restZeroTicks=0;p.collapsePending=false;p.hunger=80;return w;
}
