/* PRIVATE prepared scenes; factory used only before the first UI import.
 * No natural research, construction or campaign progress is credited. */
import {medicalCamp} from './health';
import {fixtureBuilding} from './deconstruction';
import {addGroundMaterial,refreshStock} from '../../src/sim/materials';
import {fuelItem,newBuildingFuel} from '../../src/sim/fuel';
import {newPowerState} from '../../src/sim/power-rules';
import {RESEARCH_SCALE} from '../../src/sim/research';
import {serializeWorld,validateWorld} from '../../src/sim/serialization';
import type {Structure} from '../../src/sim/types';

export const CASES=['wood-generator','chemfuel-generator'] as const;
export type RefuelKind=typeof CASES[number];
export function preparedRefuel(kind:RefuelKind){
  const w=medicalCamp(2,32),[p,other]=w.pawns;
  w.research={points:0,project:null,biofuelRefining:{points:700*RESEARCH_SCALE,completedAt:2900}};
  for(const a of w.pawns){delete a.background;delete a.traits;}
  p!.priorities.haul=1;
  Object.assign(p!,{x:8,z:13});Object.assign(other!,{x:8,z:16});
  const s=fixtureBuilding(w,kind,12,13) as Structure;
  s.material='steel';s.fuel={...newBuildingFuel(kind),ticks:0,burned:0,autoRefuel:false};
  s.power={...newPowerState(kind),on:false};
  const item=fuelItem(kind),quantity=5;
  addGroundMaterial(w,item,quantity,{x:10,z:13},item);refreshStock(w);
  const errors=validateWorld(w);if(errors.length)throw Error('Prepared fixture invalid: '+errors.join('; '));
  const source=w.piles.find(i=>i.item===item)!;
  const declaration={kind:'prepared-native-scene',campaign:false,naturalResearch:false,naturalConstruction:false,
    generatorKind:kind,seed:w.seed,width:32,height:32,tick:w.tick,pawnId:p!.id,otherPawnId:other!.id,
    generatorId:s.id,sourceId:source.id,sourceCell:{x:10,z:13},quantity,item,
    declaredResearch:structuredClone(w.research),declaredStructures:structuredClone(w.structures),
    notice:'Objects, research and ground fuel are initial fixtures. Only the subsequent real menu order and physical refuelling may be credited.'};
  return {initial:w,raw:serializeWorld(w),declaration};
}
