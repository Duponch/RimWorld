import { isRainElectricalKind,RAIN_ELECTRICAL_INTERVAL_CORE } from './rain-electric.ts';
import type { World } from './types.ts';

const object=(value:unknown):value is Record<string,unknown>=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const integer=(value:unknown,min=0,max=Number.MAX_SAFE_INTEGER):value is number=>
  typeof value==='number'&&Number.isSafeInteger(value)&&value>=min&&value<=max;
// Remove the integer remainder before division, even at safe-clock limits.
const opportunities=(core:number)=>(core-core%RAIN_ELECTRICAL_INTERVAL_CORE)/RAIN_ELECTRICAL_INTERVAL_CORE;
const keys=(value:Record<string,unknown>,required:readonly string[],optional:readonly string[]=[])=>
  required.every(k=>Object.hasOwn(value,k))&&Object.keys(value).every(k=>required.includes(k)||optional.includes(k));

/** Bounded transport/save guard. The last contact is historical: destruction
 * need not leave its building on the map. Full weather validation is separate. */
export function validRainElectrical(value:unknown,version:number,
  w:Pick<World,'tick'|'width'|'height'|'nextId'|'weather'>):boolean {
  if(value===undefined)return true;
  const now=w.tick*10,weather=w.weather;
  if(version<181||!integer(w.tick)||!integer(now)||!weather||!object(weather)||
    weather.revision!==1||!integer(weather.originTick,0,w.tick)||weather.lastCoreTick!==now||!integer(weather.rng,1,0xffffffff)||
    !integer(w.width,1)||!integer(w.height,1)||!integer(w.nextId,1)||!object(value)||
    !keys(value,['revision','adoptedAt','lastCoreTick','rng','discharges'],['lastDischarge'])||
    value.revision!==1||!integer(value.adoptedAt,weather.originTick,w.tick)||value.lastCoreTick!==now||
    !integer(value.rng,1,0xffffffff)||!integer(value.discharges))return false;
  const adoptedCore=value.adoptedAt*10;
  if(value.discharges>opportunities(now)-opportunities(adoptedCore))return false;
  if(value.discharges===0)return !Object.hasOwn(value,'lastDischarge');
  const last=value.lastDischarge;
  return object(last)&&keys(last,['coreTick','structureId','kind','x','z'])&&
    integer(last.coreTick,adoptedCore+1,now)&&last.coreTick%RAIN_ELECTRICAL_INTERVAL_CORE===0&&
    value.discharges<=opportunities(last.coreTick)-opportunities(adoptedCore)&&
    integer(last.structureId,1,w.nextId-1)&&isRainElectricalKind(last.kind)&&(version>=193||last.kind!=='mini-turret')&&(version>=190||last.kind!=='tube-television')&&
    integer(last.x,0,w.width-1)&&integer(last.z,0,w.height-1);
}
export function validateRainElectrical(w:World,version=w.schemaVersion):string[] {
  return validRainElectrical(w.rainElectrical,version,w)?[]:['Invalid rain electrical state.'];
}
