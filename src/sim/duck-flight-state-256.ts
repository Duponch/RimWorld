/** Core4871 flight tracker facts. Original implementation, Core clock units. */
export type DuckFlightPhase256='grounded'|'taking-off'|'flying'|'landing';
export interface DuckFlight256 {revision:1;phase:DuckFlightPhase256;flyingCore:number;cooldownCore:number;lerpCore:number;atCore:number}
export const DUCK_MAX_FLIGHT_CORE_256=1800,DUCK_FLIGHT_COOLDOWN_CORE_256=600,DUCK_FLIGHT_TRANSITION_CORE_256=50;
export const duckFlying256=(flight:DuckFlight256|undefined):boolean=>!!flight&&flight.phase!=='grounded';
export const newDuckFlight256=(atCore:number):DuckFlight256=>({revision:1,phase:'grounded',flyingCore:-1,cooldownCore:0,lerpCore:0,atCore});
export function forceDuckLand256(flight:DuckFlight256):void {if(flight.phase==='taking-off'||flight.phase==='flying'){flight.phase='landing';flight.lerpCore=25;flight.cooldownCore=650;}}
/** Exactly one real Core step, not an elapsed-time catchup. Landing completion
 * is returned to the real owner for its downed/terrain terminal transaction. */
export function stepDuckFlightCore256(flight:DuckFlight256):boolean {
 if(flight.phase==='taking-off'){if(++flight.lerpCore>=50){flight.phase='flying';flight.lerpCore=0;}}
 else if(flight.phase==='landing'){if(++flight.lerpCore>=50){flight.phase='grounded';flight.lerpCore=0;flight.cooldownCore=600;flight.flyingCore=-1;return true;}}
 else if(flight.phase==='flying'){if(++flight.flyingCore>=1800)flight.phase='landing';}
 else if(flight.cooldownCore>0)flight.cooldownCore--;
 return false;
}
/** No RNG or clock read in render. Curves are confirmed tracker progress. */
export function duckFlightHeight256(flight:DuckFlight256|undefined):number {if(!flight||flight.phase==='grounded')return 0;if(flight.phase==='flying')return 1;const t=flight.lerpCore/50;return flight.phase==='taking-off'?(t<=.5?t*1.2:.6+(t-.5)*.8):(t<=.5?1-t*1.2:.4-(t-.5)*.8);}
const own=(v:object,k:string)=>Object.getOwnPropertyDescriptor(v,k);
export function validDuckFlight256(value:unknown,species:unknown,version:number,atCore:number,dead=false):value is DuckFlight256|undefined {
 if(value===undefined)return true;if(version<256||species!=='duck'||!value||typeof value!=='object'||Array.isArray(value)||![Object.prototype,null].includes(Object.getPrototypeOf(value)))return false;
 const keys=Reflect.ownKeys(value);if(keys.length!==6||keys.some(k=>typeof k!=='string'||!['revision','phase','flyingCore','cooldownCore','lerpCore','atCore'].includes(k)))return false;
 // Five tracker fields plus revision: descriptors only, never invoke accessors.
 for(const k of keys){const d=own(value,k as string);if(!d||!('value'in d)||!d.enumerable)return false;}
 const f=value as DuckFlight256,i=(n:number,a:number,b:number)=>Number.isSafeInteger(n)&&n>=a&&n<=b;
 if(f.revision!==1||!['grounded','taking-off','flying','landing'].includes(f.phase)||!i(f.atCore,0,atCore)||!dead&&f.atCore!==atCore||!i(f.flyingCore,-1,1800)||!i(f.cooldownCore,0,650)||!i(f.lerpCore,0,49))return false;
 return f.phase==='grounded'?f.flyingCore===-1&&f.lerpCore===0&&f.cooldownCore<=600:f.phase==='taking-off'?f.flyingCore===-1&&f.cooldownCore===0:f.phase==='flying'?f.flyingCore>=-1&&f.flyingCore<1800&&f.lerpCore===0&&f.cooldownCore===0:true;
}
