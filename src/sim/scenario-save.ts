import { isScenarioId,SCENARIOS,SCENARIO_REVISION } from './scenario-definitions.ts';

const record=(value:unknown):value is Record<string,unknown>=>typeof value==='object'&&value!==null&&!Array.isArray(value);
const coordinate=(value:unknown,limit:number)=>typeof value==='number'&&Number.isInteger(value)&&value>=0&&value<limit;
/** Historical saves have no inferred scenario. A stamp describes creation,
 * never a promise about the population, terrain or stocks of an advanced game. */
export function validScenario(value:unknown,version:number,width:number,height:number):boolean {
  if(value===undefined)return true;
  if(version<80||!record(value)||Object.keys(value).length!==3||!Object.keys(value).every(k=>['id','revision','landing'].includes(k))||!isScenarioId(value.id)||value.revision!==SCENARIO_REVISION||!record(value.landing))return false;
  if(width<SCENARIOS[value.id].minSize||height<SCENARIOS[value.id].minSize)return false;
  const landing=value.landing;
  return Object.keys(landing).length===2&&Object.keys(landing).every(k=>k==='x'||k==='z')&&coordinate(landing.x,width)&&coordinate(landing.z,height);
}
