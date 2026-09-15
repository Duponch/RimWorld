import type { World } from '../../src/sim/types';

/** Fixture authoring only, never a migration. Older schemas had neutral travel
 * and whole work ticks. Keep positions/delays, rebuild that historical cadence
 * before asking the production deserializer to validate an old fixture. */
export function withoutV37LightWork(world:World):void {
  for(const p of world.pawns)if(p.motion?.speedFactor!==undefined) {
    const m=p.motion;
    m.end=m.start+3*Math.hypot(m.to.x-m.from.x,m.to.z-m.from.z)+(m.terrainDelay??0);
    delete m.speedFactor;p.moveCooldown=Math.max(0,m.end-world.tick);
  }
  for(const j of world.jobs){delete j.workRemainder;delete j.pickTicks;if(j.clearance)delete j.clearance.workRemainder;}
}
