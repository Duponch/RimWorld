import type { Cell } from './types.ts';
import { shotInBounds,type ShotCover,type ShotGrid } from './combat-space.ts';

const clamp01=(n:number)=>Math.max(0,Math.min(1,n));
function nonnegative(n:number,label:string):void {if(!Number.isFinite(n)||n<0)throw new RangeError(`Invalid ${label}`);}
export function coverBase(cover:ShotCover):number {
  nonnegative(cover.fill,'cover');if(cover.fill>1)throw new RangeError('Invalid cover');
  return cover.openDoor?0:cover.full?.75:cover.fill;
}
export interface CoverContribution {key:string;cell:Cell;chance:number;blocks:boolean}
export interface CoverReport {blockChance:number;passChance:number;contributions:CoverContribution[]}

/** Neighbour coefficients, not mesh heights. Multi-cell objects can contribute
 * from several occupied cells. Miss selection and total blockage differ for the
 * shooter's cell; retain that distinction instead of silently deduplicating IDs. */
export function shotCover(grid:ShotGrid,shooter:Cell,target:Cell,targetKey?:string,canBenefit=true):CoverReport {
  const contributions:CoverContribution[]=[];
  if(!shotInBounds(grid,shooter)||!shotInBounds(grid,target))throw new RangeError('Cover outside map');
  if(!canBenefit||shooter.x===target.x&&shooter.z===target.z)return {blockChance:0,passChance:1,contributions};
  const sx=shooter.x-target.x,sz=shooter.z-target.z,distance=Math.hypot(sx,sz);
  let blockChance=0;
  // Same stable cardinal/corner ordering as our documented query convention.
  for(const [dx,dz] of [[0,1],[1,0],[0,-1],[-1,0],[1,-1],[1,1],[-1,1],[-1,-1]]) {
    const x=target.x+dx,z=target.z+dz;
    if(x<0||z<0||x>=grid.width||z>=grid.height)continue;
    const cover=grid.coverAt(x,z);if(!cover||cover.key===targetKey)continue;
    const cosine=Math.max(-1,Math.min(1,(sx*dx+sz*dz)/(distance*Math.hypot(dx,dz))));
    const angle=Math.acos(cosine)*180/Math.PI*(dx!==0&&dz!==0?1.75:1);
    const angular=angle<15?1:angle<27?.8:angle<40?.6:angle<52?.4:angle<65?.2:0;
    const near=Math.hypot(shooter.x-x,shooter.z-z),proximity=near<1.9?.3333:near<2.9?.66666:1;
    const chance=coverBase(cover)*angular*proximity;if(chance<=0)continue;
    const blocks=shooter.x!==x||shooter.z!==z;
    contributions.push({key:cover.key,cell:{x,z},chance,blocks});
    if(blocks)blockChance+=(1-blockChance)*chance;
  }
  return {blockChance,passChance:1-blockChance,contributions};
}

/** A caller-supplied draw avoids hidden PRNG consumption in a read-only query. */
export function chooseMissCover(report:CoverReport,draw:number):CoverContribution|undefined {
  if(!Number.isFinite(draw)||draw<0||draw>=1)throw new RangeError('Invalid cover draw');
  const total=report.contributions.reduce((n,c)=>n+c.chance,0);if(total<=0)return;
  let remaining=draw*total;
  for(const c of report.contributions){remaining-=c.chance;if(remaining<0)return c;}
  return report.contributions.at(-1);
}

export type AccuracyCurve=readonly [number,number,number,number];
export function accuracyAtDistance(curve:AccuracyCurve,distance:number):number {
  nonnegative(distance,'shot distance');curve.forEach(n=>nonnegative(n,'accuracy'));
  const bands=[3,12,25,40];
  if(distance<=3)return curve[0];
  for(let i=1;i<4;i++)if(distance<=bands[i])return curve[i-1]+(curve[i]-curve[i-1])*(distance-bands[i-1])/(bands[i]-bands[i-1]);
  return curve[3];
}
export interface ShotFactors {
  distance:number;
  pawnAccuracy:number;
  weaponAccuracy:AccuracyCurve;
  pawnDistanceFactors?:AccuracyCurve;
  targetSize:number;
  standing:boolean;
  weather:number;
  blindSmoke:boolean;
}
export interface AimReport {
  shooter:number;weapon:number;size:number;weather:number;smoke:number;execution:number;posture:number;
  standardAim:number;aimIgnoringPosture:number;aim:number;passCover:number;estimatedHit:number;
}
/** Core clear/dark has no universal light malus. No hidden range/LOS test here:
 * this estimate is meaningful only after findShotLine succeeds. Posture is kept
 * separate so the later projectile resolver applies it exactly once. */
export function shotAim(input:ShotFactors,passCover=1):AimReport {
  for(const [label,value] of Object.entries({distance:input.distance,accuracy:input.pawnAccuracy,size:input.targetSize,weather:input.weather,passCover}))nonnegative(value,label);
  if(input.pawnAccuracy>1||passCover>1)throw new RangeError('Invalid shot probability');
  const shooter=Math.max(.0201,input.pawnAccuracy**input.distance*accuracyAtDistance(input.pawnDistanceFactors??[1,1,1,1],input.distance));
  const weapon=accuracyAtDistance(input.weaponAccuracy,input.distance),size=Math.max(.5,Math.min(2,input.targetSize));
  const smoke=input.blindSmoke?.7:1,execution=!input.standing&&input.distance<=3.9?7.5:1,posture=!input.standing&&input.distance>=4.5?.5:1;
  const standardAim=Math.max(.0201,shooter*weapon*input.weather*smoke*execution),aimIgnoringPosture=standardAim*size,aim=aimIgnoringPosture*posture;
  return {shooter,weapon,size,weather:input.weather,smoke,execution,posture,standardAim,aimIgnoringPosture,aim,passCover,estimatedHit:clamp01(aim*passCover)};
}

/** Applies to free interception's distance factor, not every friendly-fire path. */
export function interceptionDistanceFactor(distanceSquared:number):number {
  nonnegative(distanceSquared,'interception distance');return clamp01((distanceSquared-25)/119);
}
