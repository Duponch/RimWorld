import {foodWorkstationCamp,fixtureFoodStation} from './food-workstations.ts';
import {applyCommand} from '../../src/sim/engine.ts';
import {addGroundMaterial,refreshStock} from '../../src/sim/materials.ts';
import type {Command} from '../../src/sim/types.ts';

export const BILL_PAUSE_PREPARATION468='Declared32square control kitchen at tick2000 with its initial deterioration frontier2000, same constructor-born adult Cooking10, cleared grass terrain, finished fueled stove with12000finite fuel ticks,140finite rice and2food stockpile cells. Initial needs are prepared by the existing fixture. No cooked meal, acquired pause, progress, output, hunger change or RNG is supplied after play. Actual gathering/work/output, direct ingestion and reserve transitions follow the engine; this is not a naturally developed colony or paid stove construction.';
export function billPauseKitchen468(policy=true){
  const w=foodWorkstationCamp(),pawn=w.pawns[0]!,station=fixtureFoodStation(w,'fueled-stove');
  // This is the declared starting frontier, with no prior exposure claimed.
  w.deterioration!.lastTick=w.tick;
  pawn.name='Cuisinière de la réserve';pawn.priorities.cook=1;pawn.priorities.basic=3;pawn.apparelAutomation=false;
  station.fuel!.ticks=12000;
  addGroundMaterial(w,'food',70,{x:6,z:6},'rice');addGroundMaterial(w,'food',70,{x:7,z:6},'rice');
  const command=(c:Command)=>{const r=applyCommand(w,c);if(!r.ok)throw Error(r.reason);};
  for(const x of [12,13])command({type:'stockpile',enabled:true,x,z:10,filters:{wood:false,food:true}});
  command({type:'bill-add',structureId:station.id,recipe:'simple-meal'});const bill=station.bills![0]!;
  command({type:'bill-update',structureId:station.id,billId:bill.id,settings:{...bill,mode:'until',target:4}});
  if(policy)command({type:'bill-pause-policy',structureId:station.id,billId:bill.id,policy:{enabled:true,resumeAt:2}});
  refreshStock(w);return {w,pawn,station,bill,command,preparation:BILL_PAUSE_PREPARATION468};
}
