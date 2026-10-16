import type {SettlementLimit} from '../sim/world-map-state';
export type {SettlementLimit} from '../sim/world-map-state';
export const SETTLEMENT_LIMIT_PREFERENCE_KEY='lisiere.game.max-settlements.v1';
export const SETTLEMENT_LIMIT_CHOICES:readonly SettlementLimit[]=[1,2,3,4,5];
export function settlementLimit(value:unknown):SettlementLimit {
 const parsed=typeof value==='string'&&/^[1-5]$/.test(value)?Number(value):value;
 return typeof parsed==='number'&&SETTLEMENT_LIMIT_CHOICES.includes(parsed as SettlementLimit)?parsed as SettlementLimit:1;
}
export function readSettlementLimit(read:()=>string|null):SettlementLimit {try{return settlementLimit(read());}catch{return 1;}}
/** Global browser option, never a saved-campaign field. As with urgent pause,
 * the desired stored value becomes active only after the worker acknowledges. */
export function createSettlementLimitPreference(options:{initial:SettlementLimit;confirm:(value:SettlementLimit)=>Promise<unknown>;store:(value:SettlementLimit)=>boolean;changed:()=>void}){
 const desiredInitial=options.initial;let active:SettlementLimit=1,pending=false,inFlight:Promise<boolean>|undefined;
 async function apply(next:SettlementLimit,persist:boolean):Promise<boolean>{
  if(pending)throw Error('Le nombre maximal de colonies attend encore sa confirmation.');
  if(!SETTLEMENT_LIMIT_CHOICES.includes(next))throw Error('Choisissez entre une et cinq colonies.');
  pending=true;options.changed();
  try{await options.confirm(next);active=next;if(!persist)return true;try{return options.store(next);}catch{return false;}}
  finally{pending=false;options.changed();}
 }
 function run(next:SettlementLimit,persist:boolean){if(pending)return Promise.reject(Error('Le nombre maximal de colonies attend encore sa confirmation.'));const work=apply(next,persist);inFlight=work;void work.then(()=>{if(inFlight===work)inFlight=undefined;},()=>{if(inFlight===work)inFlight=undefined;});return work;}
 return {get value(){return active;},get pending(){return pending;},whenSettled:()=>inFlight??Promise.resolve(true),initialize:()=>run(desiredInitial,false),set:(next:SettlementLimit)=>run(next,true)};
}