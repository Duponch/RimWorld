import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {deserializeWorld} from '../../src/sim/serialization.ts';
import {applyCommand} from '../../src/sim/engine.ts';
import {projectProgress,researchCost} from '../../src/sim/research.ts';
import {addGroundMaterial,refreshStock} from '../../src/sim/materials.ts';

export const EARNED_SHIP_SHA276='c41c0ec8e585ced1c88cc85cb5453b088bee8216e47a27f8b2a1754993fdf2ef';
export const SHIP_CASKET_PREPARATION277='Whole earned V452 world at46030, including actual V451 reactor, paid beam/three engines, original Ada, food, exhaustion history and existing damage. Only cryptosleep/spatial-cryptosleep knowledge and finite120steel/14uranium/3components/3advanced-components are prepared. The real player schedule command replaces inherited forced work by Anything; rest, needs, health, history and buildings are not reset. No blueprint, carried ingredient, construction work, occupant, startup or victory is prepared.';
export const SHIP_CASKET_STOCK277=Object.freeze([
 {item:'steel' as const,quantity:120},{item:'uranium' as const,quantity:14},
 {item:'component' as const,quantity:3},{item:'advanced-component' as const,quantity:3},
]);
export const SHIP_CASKET_PLAN277=Object.freeze({type:'designate' as const,kind:'ship-cryptosleep-casket' as const,x:10,z:19,orientation:3 as const,material:'steel' as const});
export function shipCasketWorkshop277(){
 const text=readFileSync(new URL('../fixtures/ship-parts-v452-earned.json',import.meta.url),'utf8');
 if(createHash('sha256').update(text).digest('hex')!==EARNED_SHIP_SHA276)throw Error('Earned V452 world bytes changed');
 const source=JSON.parse(text),w=deserializeWorld(text);
 for(const project of ['cryptosleep','ship-cryptosleep'] as const){const progress=projectProgress(w.research!,project);progress.points=researchCost(project);progress.completedAt=w.tick;}
 for(const [i,row]of SHIP_CASKET_STOCK277.entries())addGroundMaterial(w,row.item,row.quantity,{x:5+i,z:14},row.item);
 const result=applyCommand(w,{type:'schedule-replace',pawnId:168,assignments:Array(24).fill('anything')});
 if(!result.ok)throw Error(result.reason);refreshStock(w);
 return {w,source,reactorId:284,beamId:445,builderId:168,lampId:185,plan:SHIP_CASKET_PLAN277};
}
