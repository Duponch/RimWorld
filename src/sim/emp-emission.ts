import { emitRevolverBullet,type BulletEmissionInput,type BulletEmission } from './bullet-emission.ts';
import { createBulletFlight } from './bullet-flight.ts';
import { projectileChance,projectileDraw,type ProjectileRandom } from './projectile-rules.ts';
import type { Cell } from './types.ts';

/** Same radial distribution as Core. Equal-distance offsets have a stable
 * local x/z order; C# List.Sort's unspecified ties are not a shared RNG oracle. */
const offsets:readonly Cell[]=Object.freeze(Array.from({length:25},(_,i)=>({x:Math.floor(i/5)-2,z:i%5-2}))
  .filter(p=>p.x*p.x+p.z*p.z<=1.9**2).sort((a,b)=>a.x*a.x+a.z*a.z-b.x*b.x-b.z*b.z||a.x-b.x||a.z-b.z));
export function empForcedMissRadius(from:Cell,to:Cell):number {
  const d=(to.x-from.x)**2+(to.z-from.z)**2;
  return d<9?0:d<25?1.9*.5:d<49?1.9*.8:1.9;
}
/** Forced-radius admission precedes ordinary cover/accuracy draws. Choosing
 * the centre resumes the historical bullet producer, including its jitter. */
export function emitEmpProjectile(input:BulletEmissionInput,random:ProjectileRandom):BulletEmission|{branch:'forced';coverKey:null;flight:BulletEmission['flight']} {
  const radius=empForcedMissRadius({x:Math.floor(input.origin.x),z:Math.floor(input.origin.z)},input.target.cell);
  if(radius<=.5)return emitRevolverBullet(input,random);
  const cells=offsets.filter(p=>p.x*p.x+p.z*p.z<=radius*radius),offset=cells[Math.floor(projectileDraw(random)*cells.length)]!;
  if(!offset.x&&!offset.z)return emitRevolverBullet(input,random);
  let flags=projectileChance(.5,random)?7:4;
  if(!input.canHitOtherPawns)flags&=~2;
  const cell={x:input.target.cell.x+offset.x,z:input.target.cell.z+offset.z};
  const destination={x:cell.x+.5+(projectileDraw(random)*2-1)*.3,z:cell.z+.5+(projectileDraw(random)*2-1)*.3};
  return {branch:'forced',coverKey:null,flight:createBulletFlight({launcherKey:input.launcherKey,equipmentKey:input.equipmentKey,
    intendedKey:input.target.key,usedKey:null,flags,preventFriendlyFire:input.preventFriendlyFire,
    origin:input.origin,destination,speedPerCoreTick:input.profile.projectileTilesPerCoreTick})};
}
