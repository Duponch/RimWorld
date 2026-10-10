import type { BombInstigatorKey } from './mini-turret-state.ts';
import type { Cell,World } from './types.ts';
import type { NumericMembershipSink } from './numeric-membership.ts';
import { miniTurretExplosive } from './bomb-eligibility.ts';
import { WEAPON_QUALITIES,type WeaponQuality } from './equipment-rules.ts';
import { validWorldProjectile } from './projectile-save.ts';

export const BOMB_RADIUS=3.9;
export const BOMB_AMOUNT=50;
export const BOMB_AP=.1;
export const BOMB_WICK_CORE=240;
export interface MiniTurretBombWave {
  id:number;sourceId:number;instigatorKey?:BombInstigatorKey;center:Cell;
  startedAtCore:number;advancedAtCore:number;cells:number[];nextCell:number;damagedThingKeys:string[];
  shortCircuit?:{damage:'flame'|'bomb';radius:number;seed:number};
  emp?:{quality:WeaponQuality};
}
export const bombWaveRadius=(wave:MiniTurretBombWave):number=>wave.emp?1.1:wave.shortCircuit?.radius??BOMB_RADIUS;
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const integer=(v:unknown,min=0,max=Number.MAX_SAFE_INTEGER):v is number=>Number.isSafeInteger(v)&&Number(v)>=min&&Number(v)<=max;
const keys=(v:Record<string,unknown>,allowed:readonly string[])=>Object.keys(v).every(k=>allowed.includes(k));
const dense=(v:unknown[])=>Object.keys(v).length===v.length&&Object.keys(v).every((key,index)=>key===String(index));
export const bombThingKey=(v:unknown,version=194):v is string=>typeof v==='string'&&(version>=194||!v.startsWith('mech:'))&&/^(pawn|animal|mech|structure|resource|pile|fire):[1-9]\d*$/.test(v)&&integer(Number(v.slice(v.indexOf(':')+1)),1);
export const bombInstigatorKey=(v:unknown,version=194):v is BombInstigatorKey=>bombThingKey(v,version)&&/^(pawn|animal|mech|structure):/.test(v);
export const bombCellCore=(w:Pick<World,'width'>,wave:MiniTurretBombWave,index:number)=>wave.startedAtCore+Math.floor(Math.hypot(index%w.width-wave.center.x,Math.floor(index/w.width)-wave.center.z)*1.5);
export function validBombWaveShape(value:unknown,version=193):value is MiniTurretBombWave {
  if(version<193||!object(value)||!keys(value,['id','sourceId','instigatorKey','center','startedAtCore','advancedAtCore','cells','nextCell','damagedThingKeys',...version>=201?['shortCircuit']:[],...version>=208?['emp']:[]]))return false;
  const variant=value.shortCircuit;
  if(Object.hasOwn(value,'emp')&&(!object(value.emp)||!keys(value.emp,['quality'])
    ||!WEAPON_QUALITIES.includes(value.emp.quality as WeaponQuality)||Object.hasOwn(value,'shortCircuit')
    ||typeof value.instigatorKey!=='string'||!/^pawn:[1-9]\d*$/.test(value.instigatorKey)
    ||Number(value.instigatorKey.slice(5))>=Number(value.sourceId)))return false;
  if(Object.hasOwn(value,'shortCircuit')&&(!object(variant)||!keys(variant,['damage','radius','seed'])
    ||variant.damage!=='flame'&&variant.damage!=='bomb'||typeof variant.radius!=='number'||!Number.isFinite(variant.radius)
    ||variant.radius<(variant.damage==='flame'?1.5:1.05)||variant.radius>(variant.damage==='flame'?14.9:14.9*.3)
    ||variant.damage==='bomb'&&variant.radius<=3.5*.3||!integer(variant.seed,1,0xffffffff)||Object.hasOwn(value,'instigatorKey')))return false;
  const c=value.center;
  return integer(value.id,1)&&integer(value.sourceId,1,Number(value.id)-1)&&(!Object.hasOwn(value,'instigatorKey')||bombInstigatorKey(value.instigatorKey,version)&&Number(value.instigatorKey.slice(value.instigatorKey.indexOf(':')+1))<Number(value.id))
    &&object(c)&&keys(c,['x','z'])&&integer(c.x)&&integer(c.z)&&integer(value.startedAtCore)&&integer(value.advancedAtCore,Number(value.startedAtCore))
    &&Array.isArray(value.cells)&&value.cells.length>0&&value.cells.length<=(value.emp?9:variant?961:81)&&value.cells.every(i=>integer(i))&&new Set(value.cells).size===value.cells.length
    &&integer(value.nextCell,0,value.cells.length)&&Array.isArray(value.damagedThingKeys)&&value.damagedThingKeys.length<=131072
    &&value.damagedThingKeys.every(k=>bombThingKey(k,version))&&new Set(value.damagedThingKeys).size===value.damagedThingKeys.length
    &&(!value.emp||dense(value.cells)&&dense(value.damagedThingKeys));
}
/** Captured LOS is historical. Validate geometry/cursor, never recompute it from
 * today's opened walls. Completed waves stay inert through their arrival tick. */
export function validateBombWaves(w:World,errors:string[],ids?:NumericMembershipSink):void {
  if(!Object.hasOwn(w,'bombWaves'))return;
  const waves=w.bombWaves,end=w.tick*10;
  if(w.schemaVersion<193||!Array.isArray(waves)||!waves.length||waves.length>w.width*w.height){errors.push('Invalid bomb wave collection.');return;}
  // Other entries may already be malformed while this entry is valid. Pair
  // checks borrow only independently validated shapes; the loop reports all
  // rejected entries without dereferencing a null or incomplete neighbor.
  const shaped=waves.filter(other=>object(other)&&Object.hasOwn(other,'shortCircuit')&&validBombWaveShape(other,w.schemaVersion));
  let prior=0;const seen=ids??new Set([...w.pawns,...w.structures,...w.jobs,...w.resources,...w.piles].map(t=>t.id));
  for(const wave of waves){
    if(!validBombWaveShape(wave,w.schemaVersion)){errors.push('Invalid bomb wave shape.');continue;}
    if(wave.shortCircuit){
      const report=w.miscIncidents?.shortCircuits?.last;
      if(!object(report)||report.outcome!=='discharge'||report.conduitId!==wave.sourceId||!object(report.center)||report.center.x!==wave.center.x||report.center.z!==wave.center.z
        ||report.at*10!==wave.startedAtCore||(wave.shortCircuit.damage==='flame'?report.flameRadius:report.bombRadius)!==wave.shortCircuit.radius)
        errors.push('Invalid short-circuit wave provenance.');
      const peers=shaped.filter(other=>other.shortCircuit?.damage===wave.shortCircuit!.damage);
      if(peers.length!==1)errors.push('Duplicate short-circuit wave kind.');
      const flame=shaped.find(other=>other.shortCircuit?.damage==='flame'),bomb=shaped.find(other=>other.shortCircuit?.damage==='bomb');
      if(bomb&&(!flame||bomb.id!==flame.id+1||bomb.shortCircuit!.seed!==flame.shortCircuit!.seed)
        ||wave.shortCircuit.damage==='flame'&&wave.advancedAtCore===wave.startedAtCore&&report?.bombRadius!==undefined&&!bomb)
        errors.push('Invalid short-circuit wave pair.');
    }
    if(wave.emp){
      const source=w.projectiles?.find(p=>p&&p.id===wave.sourceId);
      if(source?(!validWorldProjectile(source,w,w.schemaVersion)||source.weaponItem!=='emp-launcher'||source.quality!==wave.emp.quality||source.flight.launcherKey!==wave.instigatorKey
        ||source.arrival?.kind!=='impact'||source.advancedAtCore!==wave.startedAtCore
        ||Math.floor(source.arrival.point.x)!==wave.center.x||Math.floor(source.arrival.point.z)!==wave.center.z):seen.has(wave.sourceId))
        errors.push('Invalid EMP projectile provenance.');
    }
    if(wave.id<=prior||wave.id>=w.nextId||seen.has(wave.id)||wave.center.x>=w.width||wave.center.z>=w.height||wave.startedAtCore>end||wave.advancedAtCore>end
      ||(wave.shortCircuit?seen.has(wave.sourceId)&&!w.structures.some(s=>s.id===wave.sourceId&&s.kind==='power-conduit'&&s.x===wave.center.x&&s.z===wave.center.z)
        :wave.emp?false:seen.has(wave.sourceId)||!miniTurretExplosive(wave.sourceId))||wave.cells.length>w.width*w.height||wave.nextCell<wave.cells.length&&wave.advancedAtCore!==end
      ||wave.nextCell===wave.cells.length&&wave.advancedAtCore<=end-10)errors.push('Invalid bomb wave ownership/clock.');
    seen.add(wave.id);prior=wave.id;
    let last=-1,lastCore=-1;
    for(const [n,index] of wave.cells.entries()){
      const date=bombCellCore(w,wave,index),distance=(index%w.width-wave.center.x)**2+(Math.floor(index/w.width)-wave.center.z)**2;
      if(index>=w.width*w.height||distance>bombWaveRadius(wave)**2||date<lastCore||date===lastCore&&index<=last
        ||n<wave.nextCell&&(wave.advancedAtCore<=wave.startedAtCore||date>wave.advancedAtCore)
        ||n>=wave.nextCell&&wave.advancedAtCore>wave.startedAtCore&&date<=wave.advancedAtCore)errors.push('Invalid bomb wave cells/cursor.');
      last=index;lastCore=date;
    }
    if(wave.damagedThingKeys.some(key=>Number(key.slice(key.indexOf(':')+1))>=w.nextId)||wave.damagedThingKeys.some((key,n,all)=>n>0&&all[n-1]!>=key))errors.push('Invalid bomb wave affected identities.');
  }
}
