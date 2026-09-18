import { interceptionDistanceFactor } from './combat-report.ts';
import type { Cell } from './types.ts';

export const PROJECTILE_HIT=Object.freeze({intended:1,pawns:2,world:4,all:7});
export interface ProjectilePolicy {
  launcherKey:string;intendedKey:string|null;usedKey:string|null;
  flags:number;preventFriendlyFire:boolean;
}
/** Scene membership implies spawned on the same map. covered is a separate
 * altitude/full-object test, not the probabilistic neighbouring cover report. */
export type ProjectileTarget={key:string;cell:Cell;covered:boolean;fill:number;openDoor:boolean}&(
  {kind:'pawn';bodySize:number;standing:boolean;friendly:boolean}|
  {kind:'object'}
);
export interface ProjectileScene {
  width:number;height:number;friendlyFireFactor:number;
  target(key:string):ProjectileTarget|undefined;
  at(cell:Cell):readonly ProjectileTarget[];
}
export type ProjectileRandom=()=>number;
export function projectileDraw(random:ProjectileRandom):number {
  const value=random();if(!Number.isFinite(value)||value<0||value>=1)throw new RangeError('Invalid projectile draw');return value;
}
export function projectileChance(chance:number,random:ProjectileRandom):boolean {
  if(!Number.isFinite(chance))throw new RangeError('Invalid projectile chance');
  return chance>=1||chance>0&&projectileDraw(random)<chance;
}
export const projectileCell=(point:Cell):Cell=>({x:Math.floor(point.x),z:Math.floor(point.z)});
const distanceSquared=(origin:Cell,cell:Cell)=>(cell.x+.5-origin.x)**2+(cell.z+.5-origin.z)**2;
const size=(target:Extract<ProjectileTarget,{kind:'pawn'}>)=>Math.max(.1,Math.min(2,target.bodySize));

export function projectileCanHit(policy:ProjectilePolicy,target:ProjectileTarget):boolean {
  if(target.key===policy.launcherKey||target.covered||policy.flags===0)return false;
  if(target.key===policy.intendedKey)return !!(policy.flags&PROJECTILE_HIT.intended)||target.fill>.99;
  return !!(policy.flags&(target.kind==='pawn'?PROJECTILE_HIT.pawns:PROJECTILE_HIT.world));
}

/** Fly-by only. Destination-cell and used-target impact follow other rules. */
export function flybyChance(policy:ProjectilePolicy,target:ProjectileTarget,origin:Cell,destination:Cell,cell:Cell,friendlyFireFactor:number):number {
  if(!projectileCanHit(policy,target)||cell.x===destination.x&&cell.z===destination.z)return 0;
  const factor=interceptionDistanceFactor(distanceSquared(origin,cell));if(factor===0)return 0;
  if(target.fill>.99&&!target.openDoor)return 1;
  let chance=0;
  if(target.kind==='pawn')chance=.4*size(target)*(target.standing?1:.1)*(target.friendly?(policy.preventFriendlyFire?0:friendlyFireFactor):1);
  else if(target.fill>.2)chance=target.openDoor?.05:target.fill*(Math.max(Math.abs(cell.x-destination.x),Math.abs(cell.z-destination.z))<=1?1:.15);
  return Math.min(1,chance*factor);
}

/** Reference target identity survives movement. Missing/ineligible used target
 * falls back to the destination's candidates, shuffled without mutating scene.
 * A failed lying-target roll lands on the ground, with no second fallback. */
export function resolveProjectileArrival(policy:ProjectilePolicy,origin:Cell,destination:Cell,scene:ProjectileScene,random:ProjectileRandom):string|null {
  const far=(destination.x-origin.x)**2+(destination.z-origin.z)**2>=20.25;
  const used=policy.usedKey===null?undefined:scene.target(policy.usedKey);
  if(used&&projectileCanHit(policy,used))return used.kind==='pawn'&&!used.standing&&far&&!projectileChance(.5,random)?null:used.key;
  const cell=projectileCell(destination),candidates=scene.at(cell).filter(t=>projectileCanHit(policy,t));
  // Our deterministic Fisher-Yates convention does not claim Core PRNG parity.
  for(let i=candidates.length-1;i>0;i--){const j=Math.floor(projectileDraw(random)*(i+1));[candidates[i],candidates[j]]=[candidates[j],candidates[i]];}
  for(const target of candidates) {
    const chance=target.kind==='pawn'?.5*size(target)*(far&&!target.standing?.5:1)*(target.friendly?interceptionDistanceFactor(distanceSquared(origin,cell)):1):1.5*target.fill;
    // Deliberately no difficulty/preventFriendlyFire factor on this branch.
    if(projectileChance(chance,random))return target.key;
  }
  return null;
}
