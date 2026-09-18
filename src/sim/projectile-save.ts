import { bulletPosition,validateBulletFlight } from './bullet-flight.ts';
import { CORE_TICKS_PER_LOCAL,revolverProfile } from './ranged-statistics.ts';
import type { WorldProjectile } from './projectile-state.ts';
import type { World } from './types.ts';

const record=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const integer=(v:unknown,min:number,max=Number.MAX_SAFE_INTEGER):v is number=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=min&&v<=max;
const keys=(v:Record<string,unknown>,allowed:string[])=>Object.keys(v).every(k=>allowed.includes(k));
const identity=(v:unknown)=>v===null||typeof v==='string'&&(/^(pawn|structure|frame|resource|pile|packed):[1-9]\d*$/.test(v)&&integer(Number(v.slice(v.indexOf(':')+1)),1)||/^rock:(0|[1-9]\d*)$/.test(v)&&integer(Number(v.slice(5)),0));
const samePoint=(a:{x:number;z:number},b:unknown)=>record(b)&&keys(b,['x','z'])&&b.x===a.x&&b.z===a.z;

/** Unknown JSON is rejected before touching references or calling the resolver. */
export function validWorldProjectile(value:unknown,world:Pick<World,'width'|'height'|'tick'>):value is WorldProjectile {
  if(!record(value)||!keys(value,['id','quality','emittedAtCore','advancedAtCore','flight','relations','arrival']))return false;
  const end=world.tick*CORE_TICKS_PER_LOCAL;
  if(!Number.isSafeInteger(end)||!integer(value.id,1)||!integer(value.emittedAtCore,0,end)||!integer(value.advancedAtCore,value.emittedAtCore,end))return false;
  const f=value.flight,r=value.relations;
  if(!record(f)||!keys(f,['launcherKey','intendedKey','usedKey','flags','preventFriendlyFire','equipmentKey','origin','destination','speedPerCoreTick','remainingCoreTicks','completed'])||!record(f.origin)||!keys(f.origin,['x','z'])||!record(f.destination)||!keys(f.destination,['x','z']))return false;
  if(typeof f.launcherKey!=='string'||!/^pawn:[1-9]\d*$/.test(f.launcherKey)||!identity(f.launcherKey)||!identity(f.intendedKey)||!identity(f.usedKey)||f.equipmentKey!==null&&(typeof f.equipmentKey!=='string'||!/^pile:[1-9]\d*$/.test(f.equipmentKey)||!identity(f.equipmentKey)))return false;
  if(!record(r)||!keys(r,['friendlyPawnIds','friendlyFireFactor'])||!Array.isArray(r.friendlyPawnIds)||r.friendlyPawnIds.length>world.width*world.height||r.friendlyPawnIds.some((id,i,a)=>!integer(id,1)||i>0&&Number(a[i-1])>=id)||typeof r.friendlyFireFactor!=='number'||!Number.isFinite(r.friendlyFireFactor)||r.friendlyFireFactor<0||r.friendlyFireFactor>1)return false;
  try {
    const p=value as unknown as WorldProjectile,profile=revolverProfile(p.quality);validateBulletFlight(p.flight);
    if(f.speedPerCoreTick!==profile.projectileTilesPerCoreTick||p.flight.origin.x<0||p.flight.origin.z<0||p.flight.origin.x>=world.width||p.flight.origin.z>=world.height)return false;
    // Ordinary revolver + wild-miss radius, not an arbitrary long-lived missile.
    const distance=Math.hypot(p.flight.destination.x-p.flight.origin.x,p.flight.destination.z-p.flight.origin.z);
    if(distance>profile.range+12)return false;
    const position=bulletPosition(p.flight);if(position.x<0||position.z<0||position.x>=world.width||position.z>=world.height)return false;
    const total=Math.max(1,Math.ceil(distance/profile.projectileTilesPerCoreTick)),elapsed=p.advancedAtCore-p.emittedAtCore;
    if(!p.flight.completed)return value.arrival===null&&p.advancedAtCore===end&&p.flight.remainingCoreTicks===total-elapsed;
    const a=value.arrival;if(!record(a)||!keys(a,['kind','targetKey','point','coreTick','effect'])||!integer(a.coreTick,1,total)||a.coreTick!==elapsed||!identity(a.targetKey)||!samePoint(bulletPosition(p.flight),a.point)||p.advancedAtCore<=(world.tick-1)*CORE_TICKS_PER_LOCAL)return false;
    if(a.kind==='exit')return a.effect==='exit'&&a.targetKey===null&&p.flight.remainingCoreTicks===total-elapsed+1;
    if(a.kind!=='impact'||p.flight.remainingCoreTicks!==total-elapsed)return false;
    return a.targetKey===null?a.effect==='ground':String(a.targetKey).startsWith('pawn:')?a.effect==='pawn':a.effect==='unsupported-object';
  } catch {return false;}
}

export function validateProjectiles(world:World,version:number,ids:Set<number>):string[] {
  const value=world.projectiles;if(value===undefined)return [];
  if(version<55||!Array.isArray(value)||!value.length||value.length>world.width*world.height)return ['Invalid projectile collection for schema.'];
  const errors:string[]=[];let previous=0;
  for(const p of value) {
    if(!validWorldProjectile(p,world)){errors.push('Invalid persistent projectile.');continue;}
    if(ids.has(p.id)||p.id<=previous||p.id>=world.nextId)errors.push('Invalid projectile identity/order.');
    ids.add(p.id);previous=p.id;
  }
  return errors;
}
