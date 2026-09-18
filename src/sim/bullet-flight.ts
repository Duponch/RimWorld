import { flybyChance,projectileCell,projectileChance,resolveProjectileArrival,type ProjectilePolicy,type ProjectileRandom,type ProjectileScene } from './projectile-rules.ts';
import type { Cell } from './types.ts';
import { interceptionDistanceFactor } from './combat-report.ts';

/** Continuous X/Z positions, not integer logical cells. Exact travel duration
 * and integer countdown are distinct; the reference rounds up the latter. */
export interface BulletFlight extends ProjectilePolicy {
  equipmentKey:string|null;origin:Cell;destination:Cell;
  speedPerCoreTick:number;remainingCoreTicks:number;completed:boolean;
}
export interface BulletArrival {kind:'impact'|'exit';targetKey:string|null;point:Cell;coreTick:number}
export interface BulletAdvance {flight:BulletFlight;arrival:BulletArrival|null}
const finitePoint=(p:Cell)=>!!p&&Number.isFinite(p.x)&&Number.isFinite(p.z)&&Math.abs(p.x)<=1e6&&Math.abs(p.z)<=1e6;
const referenceDuration=(f:Pick<BulletFlight,'origin'|'destination'|'speedPerCoreTick'>)=>{
  const duration=Math.hypot(f.destination.x-f.origin.x,f.destination.z-f.origin.z)/f.speedPerCoreTick;return duration>0?duration:.001;
};
const key=(v:unknown)=>v===null||typeof v==='string'&&v.length>0&&v.length<=128;

export function validateBulletFlight(f:BulletFlight):void {
  if(!f||!finitePoint(f.origin)||!finitePoint(f.destination)||!key(f.launcherKey)||f.launcherKey===null||!key(f.intendedKey)||!key(f.usedKey)||!key(f.equipmentKey)||!Number.isInteger(f.flags)||f.flags<0||f.flags>7||typeof f.preventFriendlyFire!=='boolean'||typeof f.completed!=='boolean'||!Number.isFinite(f.speedPerCoreTick)||f.speedPerCoreTick<=0)throw new RangeError('Invalid bullet flight');
  const duration=referenceDuration(f),total=Math.ceil(duration);
  if(!Number.isSafeInteger(total)||!Number.isSafeInteger(f.remainingCoreTicks)||f.remainingCoreTicks<0||f.remainingCoreTicks>total||!f.completed&&f.remainingCoreTicks===0)throw new RangeError('Invalid bullet countdown');
}
export function createBulletFlight(plan:Omit<BulletFlight,'remainingCoreTicks'|'completed'>):BulletFlight {
  const flight={...plan,origin:{...plan.origin},destination:{...plan.destination},remainingCoreTicks:Math.ceil(referenceDuration(plan)),completed:false};
  validateBulletFlight(flight);return flight;
}
export function bulletPosition(f:BulletFlight):Cell {
  const progress=Math.max(0,Math.min(1,1-f.remainingCoreTicks/referenceDuration(f)));
  return {x:f.origin.x+(f.destination.x-f.origin.x)*progress,z:f.origin.z+(f.destination.z-f.origin.z)*progress};
}

function interceptAt(f:BulletFlight,cell:Cell,destination:Cell,scene:ProjectileScene,random:ProjectileRandom):string|null {
  if(cell.x===destination.x&&cell.z===destination.z||interceptionDistanceFactor((cell.x+.5-f.origin.x)**2+(cell.z+.5-f.origin.z)**2)<=0)return null;
  for(const target of scene.at(cell)) {
    const chance=flybyChance(f,target,f.origin,destination,cell,scene.friendlyFireFactor);
    if(chance>1e-5&&projectileChance(chance,random))return target.key;
  }
  return null;
}

/** ONE Core step: same cell does nothing; cardinal neighbour checks only the
 * new cell; longer/diagonal steps sample every 0.2 cell. Dedup only within that
 * step, never over the whole flight. No global visited-cell set. */
function interceptBetween(f:BulletFlight,from:Cell,to:Cell,scene:ProjectileScene,random:ProjectileRandom):string|null {
  const start=projectileCell(from),end=projectileCell(to);
  if(start.x===end.x&&start.z===end.z)return null;
  const dx=to.x-from.x,dz=to.z-from.z,distance=Math.hypot(dx,dz),destination=projectileCell(f.destination);
  if(Math.abs(start.x-end.x)+Math.abs(start.z-end.z)===1)return interceptAt(f,end,destination,scene,random);
  if(interceptionDistanceFactor((end.x+.5-f.origin.x)**2+(end.z+.5-f.origin.z)**2)<=0)return null;
  const steps=Math.floor(distance/.2)+1,seen=new Set<number>();
  if(steps>10000)throw new RangeError('Bullet step exceeds traversal budget');
  for(let step=1;step<=steps;step++) {
    const cell={x:Math.floor(from.x+dx/distance*.2*step),z:Math.floor(from.z+dz/distance*.2*step)};
    if(cell.x>=0&&cell.z>=0&&cell.x<scene.width&&cell.z<scene.height) {
      const index=cell.z*scene.width+cell.x;
      if(!seen.has(index)) {
        seen.add(index);
        const hit=interceptAt(f,cell,destination,scene,random);if(hit!==null)return hit;
      }
    }
    if(cell.x===end.x&&cell.z===end.z)break;
  }
  return null;
}

/** Owns no clock, World, health mutation or renderer. The caller supplies an
 * up-to-date scene and commits its local PRNG with the returned flight/result.
 * Ten Core steps correspond to a local tick; NEVER skip crossed intermediate
 * Core steps at accelerated game speeds. Stop at first impact, idempotent after.
 * JSON continuation here is not integration with World save schema yet. */
export function advanceBulletFlight(input:BulletFlight,scene:ProjectileScene,random:ProjectileRandom,coreSteps=10):BulletAdvance {
  validateBulletFlight(input);
  if(!Number.isInteger(coreSteps)||coreSteps<0||coreSteps>1000||!Number.isSafeInteger(scene.width)||!Number.isSafeInteger(scene.height)||scene.width<=0||scene.height<=0||!Number.isFinite(scene.friendlyFireFactor)||scene.friendlyFireFactor<0||scene.friendlyFireFactor>1)throw new RangeError('Invalid bullet advance');
  const f={...input,origin:{...input.origin},destination:{...input.destination}};
  if(f.completed)return {flight:f,arrival:null};
  const total=Math.ceil(referenceDuration(f)),inside=(p:Cell)=>p.x>=0&&p.z>=0&&p.x<scene.width&&p.z<scene.height;
  for(let step=0;step<coreSteps;step++) {
    const from=bulletPosition(f);f.remainingCoreTicks--;const to=bulletPosition(f),coreTick=total-f.remainingCoreTicks;
    if(!inside(to)){f.remainingCoreTicks++;f.completed=true;return {flight:f,arrival:{kind:'exit',targetKey:null,point:from,coreTick}};}
    const targetKey=inside(from)?interceptBetween(f,from,to,scene,random):null;
    if(targetKey!==null){f.completed=true;return {flight:f,arrival:{kind:'impact',targetKey,point:to,coreTick}};}
    if(f.remainingCoreTicks===0) {
      f.completed=true;
      return {flight:f,arrival:{kind:'impact',targetKey:resolveProjectileArrival(f,f.origin,f.destination,scene,random),point:to,coreTick}};
    }
  }
  return {flight:f,arrival:null};
}
