import type { BombInstigatorKey } from './mini-turret-state.ts';
import type { Cell,World } from './types.ts';
import { miniTurretExplosive } from './bomb-eligibility.ts';

export const BOMB_RADIUS=3.9;
export const BOMB_AMOUNT=50;
export const BOMB_AP=.1;
export const BOMB_WICK_CORE=240;
export interface MiniTurretBombWave {
  id:number;sourceId:number;instigatorKey?:BombInstigatorKey;center:Cell;
  startedAtCore:number;advancedAtCore:number;cells:number[];nextCell:number;damagedThingKeys:string[];
}
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const integer=(v:unknown,min=0,max=Number.MAX_SAFE_INTEGER):v is number=>Number.isSafeInteger(v)&&Number(v)>=min&&Number(v)<=max;
const keys=(v:Record<string,unknown>,allowed:readonly string[])=>Object.keys(v).every(k=>allowed.includes(k));
export const bombThingKey=(v:unknown):v is string=>typeof v==='string'&&/^(pawn|animal|structure|resource|pile|fire):[1-9]\d*$/.test(v)&&integer(Number(v.slice(v.indexOf(':')+1)),1);
export const bombInstigatorKey=(v:unknown):v is BombInstigatorKey=>bombThingKey(v)&&/^(pawn|animal|structure):/.test(v);
export const bombCellCore=(w:Pick<World,'width'>,wave:MiniTurretBombWave,index:number)=>wave.startedAtCore+Math.floor(Math.hypot(index%w.width-wave.center.x,Math.floor(index/w.width)-wave.center.z)*1.5);
export function validBombWaveShape(value:unknown,version=193):value is MiniTurretBombWave {
  if(version<193||!object(value)||!keys(value,['id','sourceId','instigatorKey','center','startedAtCore','advancedAtCore','cells','nextCell','damagedThingKeys']))return false;
  const c=value.center;
  return integer(value.id,1)&&integer(value.sourceId,1,Number(value.id)-1)&&(!Object.hasOwn(value,'instigatorKey')||bombInstigatorKey(value.instigatorKey)&&Number(value.instigatorKey.slice(value.instigatorKey.indexOf(':')+1))<Number(value.id))
    &&object(c)&&keys(c,['x','z'])&&integer(c.x)&&integer(c.z)&&integer(value.startedAtCore)&&integer(value.advancedAtCore,Number(value.startedAtCore))
    &&Array.isArray(value.cells)&&value.cells.length>0&&value.cells.length<=81&&value.cells.every(i=>integer(i))&&new Set(value.cells).size===value.cells.length
    &&integer(value.nextCell,0,value.cells.length)&&Array.isArray(value.damagedThingKeys)&&value.damagedThingKeys.length<=131072
    &&value.damagedThingKeys.every(bombThingKey)&&new Set(value.damagedThingKeys).size===value.damagedThingKeys.length;
}
/** Captured LOS is historical. Validate geometry/cursor, never recompute it from
 * today's opened walls. Completed waves stay inert through their arrival tick. */
export function validateBombWaves(w:World,errors:string[],ids?:Set<number>):void {
  if(!Object.hasOwn(w,'bombWaves'))return;
  const waves=w.bombWaves,end=w.tick*10;
  if(w.schemaVersion<193||!Array.isArray(waves)||!waves.length||waves.length>w.width*w.height){errors.push('Invalid bomb wave collection.');return;}
  let prior=0;const seen=ids??new Set([...w.pawns,...w.structures,...w.jobs,...w.resources,...w.piles].map(t=>t.id));
  for(const wave of waves){
    if(!validBombWaveShape(wave,w.schemaVersion)){errors.push('Invalid bomb wave shape.');continue;}
    if(wave.id<=prior||wave.id>=w.nextId||seen.has(wave.id)||wave.center.x>=w.width||wave.center.z>=w.height||wave.startedAtCore>end||wave.advancedAtCore>end
      ||seen.has(wave.sourceId)||!miniTurretExplosive(wave.sourceId)||wave.nextCell<wave.cells.length&&wave.advancedAtCore!==end
      ||wave.nextCell===wave.cells.length&&wave.advancedAtCore<=end-10)errors.push('Invalid bomb wave ownership/clock.');
    seen.add(wave.id);prior=wave.id;
    let last=-1,lastCore=-1;
    for(const [n,index] of wave.cells.entries()){
      const date=bombCellCore(w,wave,index),distance=(index%w.width-wave.center.x)**2+(Math.floor(index/w.width)-wave.center.z)**2;
      if(index>=w.width*w.height||distance>BOMB_RADIUS**2||date<lastCore||date===lastCore&&index<=last
        ||n<wave.nextCell&&(wave.advancedAtCore<=wave.startedAtCore||date>wave.advancedAtCore)
        ||n>=wave.nextCell&&wave.advancedAtCore>wave.startedAtCore&&date<=wave.advancedAtCore)errors.push('Invalid bomb wave cells/cursor.');
      last=index;lastCore=date;
    }
    if(wave.damagedThingKeys.some(key=>Number(key.slice(key.indexOf(':')+1))>=w.nextId)||wave.damagedThingKeys.some((key,n,all)=>n>0&&all[n-1]!>=key))errors.push('Invalid bomb wave affected identities.');
  }
}
