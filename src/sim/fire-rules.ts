import type { Cell,ResourceKind,World } from './types.ts';
import type { ItemId } from './items.ts';

/** Core 1.6.4871 rates; counters are Core ticks, never wall-clock seconds. */
export const FIRE_PULSE_CORE=15;
export const FIRE_COMPLEX_CORE=150;
export const FIRE_MIN_SIZE=.1;
export const FIRE_MAX_SIZE=1.75;
export const FIREFIGHT_COOLDOWN_CORE=66;
export interface FireRecord extends Cell {
  id:number;size:number;bornCore:number;nextPulseCore:number;complexCore:number;spreadCore:number;
  attachedPawnId?:number;attachedAnimalId?:number;
}
export interface FireEmber {id:number;from:Cell;to:Cell;impactCore:number}
export interface BurningReaction {phase:'panic'|'extinguish';remainingCore:number;target?:Cell}
export interface FirefightingTask {fireId:number;forced:boolean;phase:'approach'|'beat';cooldownCore:number;spentCore:number}
export interface FireLedger {items:Partial<Record<ItemId,number>>;resources:Partial<Record<ResourceKind,number>>;structures:number;extinguished:number;ignitions:number;batteryEnergyLost:number;fuelTicksLost:number;fuelTicksBurned:number;woodPotentialLost:number}
export interface FireState {rng:number;clockCore:number;items:FireRecord[];embers:FireEmber[];batteryWicks:{structureId:number;endCore:number}[];ledger:FireLedger}
export const emptyFireLedger=():FireLedger=>({items:{},resources:{},structures:0,extinguished:0,ignitions:0,batteryEnergyLost:0,fuelTicksLost:0,fuelTicksBurned:0,woodPotentialLost:0});
export function ensureFireState(world:World):FireState {
  return world.fires??={rng:((world.seed^0x47a19e3d)>>>0)||1,clockCore:world.tick*10,items:[],embers:[],batteryWicks:[],ledger:emptyFireLedger()};
}
export function fireRandom(state:Pick<FireState,'rng'>):number {let n=state.rng;n^=n<<13;n^=n>>>17;n^=n<<5;state.rng=n>>>0;return state.rng/0x100000000;}
export function fireRound(value:number,random:()=>number):number {const floor=Math.floor(value);return floor+(value>floor&&random()<value-floor?1:0);}
export const fireSpreadInterval=(size:number)=>Math.max(75,150-(size-1)*40);
export const fireDamage=(size:number,random:()=>number)=>Math.max(1,fireRound(Math.min(.05,Math.max(.0125,.0125+.0036*size))*150,random));
/** Attachment check over 150 Core ticks, converted from probability per second. */
export const attachFireChance=(flammability:number,coreTicks=150)=>1-Math.pow(1-(flammability<=.1?flammability*.7:flammability<.3?.07+(flammability-.1)*.93/.2:1),coreTicks/60);
export const fireDanger=(world:World)=>world.fires?.items.reduce((sum,f)=>sum+.5+f.size,0)??0;
export const isBurning=(world:World,pawnId:number)=>world.fires?.items.some(f=>f.attachedPawnId===pawnId)??false;
export const firePosition=(world:World,f:FireRecord):Cell|undefined=>f.attachedPawnId!==undefined?world.pawns.find(p=>p.id===f.attachedPawnId):f.attachedAnimalId!==undefined?world.wildlife?.animals.find(a=>a.id===f.attachedAnimalId):f;
export const groundFire=(f:FireRecord)=>f.attachedPawnId===undefined&&f.attachedAnimalId===undefined;
/** Perceived path cost only: this never slows a physically captured edge. */
export function fireNavigationPenalty(world:World,cell:Cell):number {
  let penalty=0;for(const fire of world.fires?.items??[])if(groundFire(fire)){
    const dx=Math.abs(fire.x-cell.x),dz=Math.abs(fire.z-cell.z);if(dx<=1&&dz<=1)penalty+=dx===0&&dz===0?1000:150;
  }return penalty;
}
