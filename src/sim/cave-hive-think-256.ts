/** The caller supplies the observed key of the executable Insect tree clone,
 * never the unresolved DutyDef prototype. This private hourly stream does not
 * consume the world, wildlife or generation stream. */
import {WorldGenerationRandom,combineWorldSeed} from './world-generation-random.ts';
import {groupHashOffset256} from './group-core-cadence-256.ts';
export interface HiveThinkData256 {maintenanceLastTryCore:number}
export interface HiveMaintenanceKey256 {tree:'Insect';duty:'DefendAndExpandHive';key:number}
/** ROOT native observation hivekeys-02, Core4871 DLL5cf1b5be; XML SHA0983e026.
 * DefendAndExpandHive index31, executing clone under the Insect main tree. */
export const OBSERVED_HIVE_MAINTENANCE_KEY_256:Readonly<HiveMaintenanceKey256>=Object.freeze({tree:'Insect',duty:'DefendAndExpandHive',key:-1527103351});
export function assertHiveMaintenanceKey256(v:HiveMaintenanceKey256):void {
 if(v.tree!=='Insect'||v.duty!=='DefendAndExpandHive'||!Number.isInteger(v.key)||v.key< -2147483648||v.key>2147483647||v.key!==OBSERVED_HIVE_MAINTENANCE_KEY_256.key)throw Error('Missing observed executable Hive maintenance key');
}
/** Rand.MTBEventOccurs uses a linear double probability, with the small-rate
 * gate; using 1-exp(-dt/MTB) or one global draw changes both outcome and stream. */
export function hiveMtbOccurs256(mtb:number,unit:number,elapsed:number,random:Pick<WorldGenerationRandom,'value'>):boolean {
 if(mtb===Infinity)return false;if(mtb===0)return true;
 if(!Number.isFinite(mtb)||mtb<0||!Number.isFinite(unit)||unit<=0||!Number.isFinite(elapsed)||elapsed<=0)throw Error('Invalid actual Hive MTB inputs');
 let probability=elapsed/(mtb*unit),gate=1;if(probability<=0)return false;
 while(probability<.0001){probability*=8;gate/=8;}
 if(gate!==1&&random.value()>gate)return false;
 return random.value()<probability;
}
export function hiveMaintenanceChance256(pawnId:number,core:number,absoluteCore:number,data:HiveThinkData256,key:HiveMaintenanceKey256):boolean {
 assertHiveMaintenanceKey256(key);
 if(!Number.isSafeInteger(pawnId)||pawnId<1||!Number.isSafeInteger(core)||core<0||!Number.isSafeInteger(absoluteCore)||absoluteCore<0||!Number.isSafeInteger(data.maintenanceLastTryCore)||data.maintenanceLastTryCore< -99999||data.maintenanceLastTryCore>core)throw Error('Invalid actual Hive think owner/clock');
 if(core<data.maintenanceLastTryCore+2500)return false;
 data.maintenanceLastTryCore=core;
 const salt=combineWorldSeed(key.key,26504059),hour=Math.trunc((absoluteCore|0)/2500),seed=combineWorldSeed(combineWorldSeed(groupHashOffset256(pawnId),hour),salt);
 return hiveMtbOccurs256(2.5,2500,2500,new WorldGenerationRandom(seed));
}
