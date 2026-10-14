/** Versioned clock extension only for physically replanted species trees. */
import type {Resource,World} from './types.ts';
import {PLANT_LIFE_INTERVAL} from './plant-life.ts';
import {validOrdinaryPlantLife} from './plant-life-save.ts';
import {extractTreeDefinition} from './tree-transfer-rules.ts';
import type {PausedTreeLife} from './tree-transfer-atomic.ts';
const record=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const integer=(v:unknown,min:number,max=Number.MAX_SAFE_INTEGER):v is number=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=min&&v<=max;
export function hasPausedTreeClock(plant:Partial<Resource>):boolean {
  const life:unknown=plant.plantLife;return record(life)&&['pausedTicks','ageTick','leaflessPausedTicks'].some(k=>Object.hasOwn(life,k));
}
export function validPausedTreeLife(plant:Partial<Resource>,version:number,world:Pick<World,'tick'|'climate'>):boolean {
  if(!hasPausedTreeClock(plant))return validOrdinaryPlantLife(plant,version,world);
  const life:unknown=plant.plantLife;
  if(version<235||plant.kind!=='tree'||plant.species===undefined||!extractTreeDefinition(plant as Resource)||!world.climate||!record(life)||
    !Object.keys(life).every(k=>['since','bornAt','age','darkTicks','leaflessAt','nextCheck','pausedTicks','ageTick','leaflessPausedTicks'].includes(k))||
    !integer(life.since,world.climate.adoptedAt,world.tick)||!integer(life.pausedTicks,0,world.tick-life.since)||
    !integer(life.ageTick,life.since+life.pausedTicks,world.tick)||!integer(life.age,0,world.tick-life.since-life.pausedTicks)||
    life.age!==life.ageTick-life.since-life.pausedTicks||!integer(life.darkTicks,0,life.age)||
    !integer(life.nextCheck,world.tick+1,world.tick+PLANT_LIFE_INTERVAL)||
    life.nextCheck%PLANT_LIFE_INTERVAL!==(plant.id!+1)%PLANT_LIFE_INTERVAL)return false;
  if(Object.hasOwn(life,'bornAt')&&life.bornAt!==life.since)return false;
  if(Object.hasOwn(life,'leaflessAt'))return integer(life.leaflessAt,life.since,world.tick)&&
    integer(life.leaflessPausedTicks,0,life.pausedTicks)&&
    (life.leaflessAt-life.leaflessPausedTicks)%PLANT_LIFE_INTERVAL===(plant.id!+1)%PLANT_LIFE_INTERVAL;
  return !Object.hasOwn(life,'leaflessPausedTicks');
}
/** Replace only elapsed and ageTick update in the existing life loop; no new
 * loop, growth rule, freeze rule or tick schedule for ordinary flora. */
export function resumedTreeElapsed(plant:Resource,tick:number):number|undefined {
  if(!hasPausedTreeClock(plant))return;
  const life=plant.plantLife as PausedTreeLife;
  return tick-Math.max(life.since+life.pausedTicks,life.ageTick);
}
export function recordResumedTreeCheck(plant:Resource,tick:number):void {
  if(hasPausedTreeClock(plant))(plant.plantLife as PausedTreeLife).ageTick=tick;
}
/** Existing frost production creates a fresh unpaused leafless observation. */
export function recordResumedTreeFrost(plant:Resource):void {
  if(hasPausedTreeClock(plant))(plant.plantLife as PausedTreeLife).leaflessPausedTicks=0;
}
export function clearResumedTreeLeafless(plant:Resource):void {
  if(hasPausedTreeClock(plant))delete (plant.plantLife as PausedTreeLife).leaflessPausedTicks;
}