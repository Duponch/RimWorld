import { chooseMissCover,type AimReport,type CoverReport } from './combat-report.ts';
import { clearShotSegment,leaningCells,shotInBounds,type ShotGrid } from './combat-space.ts';
import { createBulletFlight,type BulletFlight } from './bullet-flight.ts';
import { projectileChance,projectileDraw,type ProjectileRandom } from './projectile-rules.ts';
import type { RevolverProfile } from './ranged-statistics.ts';
import type { Cell } from './types.ts';

const spread:readonly (readonly [number,number])[]=[[.02,10],[.04,8],[.07,6],[.11,4],[.22,2],[1,1]];
export function wildMissRadius(standardAim:number,quantile:number):number {
  if(!Number.isFinite(standardAim)||standardAim<0||!Number.isFinite(quantile)||quantile<0||quantile>1)throw new RangeError('Invalid wild miss');
  let upper=spread.at(-1)![1];
  if(standardAim<=spread[0][0])upper=spread[0][1];
  else for(let i=1;i<spread.length;i++)if(standardAim<=spread[i][0]) {
    const [a,x]=spread[i-1],[b,y]=spread[i];upper=x+(y-x)*(standardAim-a)/(b-a);break;
  }
  return 1+(upper-1)*quantile;
}

/** Miss clipping has endpoint/near-shooter semantics unlike a visibility test.
 * Visit cell boundaries in canonical order, stopping at the first full obstacle
 * outside 1.5 cells. This path also permits a miss to leave the map. */
function clipWildMiss(grid:ShotGrid,from:Cell,to:Cell):Cell {
  // CellCanSeeCell permits leaning at either end, but neither original cell may
  // be opaque. A merely blocked central ray is not enough to clip the miss.
  if(shotInBounds(grid,to)&&!grid.blocksSight(from.x,from.z)&&!grid.blocksSight(to.x,to.z)) {
    if(clearShotSegment(grid,from,to))return to;
    const ends=leaningCells(grid,to,from);
    if(leaningCells(grid,from,to).some(start=>ends.some(end=>clearShotSegment(grid,start,end))))return to;
  }
  const dx=Math.abs(to.x-from.x),dz=Math.abs(to.z-from.z),sx=Math.sign(to.x-from.x),sz=Math.sign(to.z-from.z);
  let x=from.x,z=from.z,ix=0,iz=0;
  const xFirst=from.x===to.x?from.z<to.z:from.x<to.x;
  for(let left=dx+dz;left>=0;left--) {
    if((x-from.x)**2+(z-from.z)**2>2.25&&shotInBounds(grid,{x,z})&&grid.blocksSight(x,z))return {x,z};
    if(!left)break;
    if(ix<dx&&(iz===dz||(2*ix+1)*dz<(2*iz+1)*dx||(2*ix+1)*dz===(2*iz+1)*dx&&xFirst)){x+=sx;ix++;}
    else{z+=sz;iz++;}
  }
  return to;
}
export function wildMissCell(grid:ShotGrid,from:Cell,towards:Cell,standardAim:number,random:ProjectileRandom):Cell {
  if(!shotInBounds(grid,from)||!shotInBounds(grid,towards))throw new RangeError('Wild-miss line outside map');
  const radius=wildMissRadius(standardAim,projectileDraw(random)),dx=towards.x-from.x,dz=towards.z-from.z;
  // Core retries directions behind the shooter. Bound pathological providers;
  // an exhausted draw budget is an error, never an invented fallback hit.
  for(let attempt=0;attempt<128;attempt++) {
    const angle=projectileDraw(random)*2*Math.PI;
    const to={x:Math.floor(towards.x+.5+Math.cos(angle)*radius),z:Math.floor(towards.z+.5+Math.sin(angle)*radius)};
    if(dx*(to.x-from.x)+dz*(to.z-from.z)>=0)return clipWildMiss(grid,from,to);
  }
  throw new Error('Wild-miss direction budget exhausted');
}

export interface BulletEmissionInput {
  grid:ShotGrid;line:{from:Cell;to:Cell};origin:Cell;
  launcherKey:string;equipmentKey:string|null;
  target:{key:string|null;cell:Cell;full:boolean;canBenefitFromCover:boolean};
  aim:AimReport;cover:CoverReport;profile:RevolverProfile;
  canHitOtherPawns:boolean;preventFriendlyFire:boolean;
  /** Anchor of the actual cover object, not necessarily its adjacent footprint cell. */
  coverAnchor(key:string):Cell|undefined;
}
export interface BulletEmission {branch:'target'|'wild'|'cover';coverKey:string|null;flight:BulletFlight}

/** Ordinary single-bullet revolver: no forced-radius/overhead/shield/trait branch.
 * Caller already checked actor, weapon, range and line, and owns the RNG commit.
 * Selection of prospective cover precedes accuracy, even when it isn't hit. */
export function emitRevolverBullet(input:BulletEmissionInput,random:ProjectileRandom):BulletEmission {
  const {target,aim,cover}=input;
  if(!shotInBounds(input.grid,input.line.from)||!shotInBounds(input.grid,input.line.to)||!shotInBounds(input.grid,target.cell)||!Number.isFinite(aim.aimIgnoringPosture)||aim.aimIgnoringPosture<0||!Number.isFinite(cover.passChance)||cover.passChance<0||cover.passChance>1)throw new RangeError('Invalid bullet emission');
  const candidate=cover.contributions.length?chooseMissCover(cover,cover.contributions.length===1?0:projectileDraw(random)):undefined;
  let cell=target.cell,usedKey=target.key,branch:BulletEmission['branch']='target',flags=1+(input.canHitOtherPawns?2:0)+(target.key===null||target.full?4:0);
  if(!projectileChance(aim.aimIgnoringPosture,random)) {
    branch='wild';cell=wildMissCell(input.grid,input.line.from,input.line.to,aim.standardAim,random);usedKey=null;
    // The 50% draw occurs even when non-target pawns are prohibited.
    flags=4+(projectileChance(.5,random)&&input.canHitOtherPawns?2:0);
  } else if(target.canBenefitFromCover&&!projectileChance(cover.passChance,random)) {
    const anchor=candidate&&input.coverAnchor(candidate.key);
    if(!candidate||!anchor||!shotInBounds(input.grid,anchor))throw new Error('Stale or missing bullet cover');
    branch='cover';cell=anchor;usedKey=candidate.key;flags=4+(input.canHitOtherPawns?2:0);
  } else if(target.key===null)cell=input.line.to;
  // Gen.RandomHorizontalVector(.3) is a square, not a disk or a mesh hit point.
  const destination={x:cell.x+.5+(projectileDraw(random)*2-1)*.3,z:cell.z+.5+(projectileDraw(random)*2-1)*.3};
  const flight=createBulletFlight({launcherKey:input.launcherKey,equipmentKey:input.equipmentKey,intendedKey:target.key,usedKey,flags,preventFriendlyFire:input.preventFriendlyFire,origin:input.origin,destination,speedPerCoreTick:input.profile.projectileTilesPerCoreTick});
  return {branch,coverKey:candidate?.key??null,flight};
}
