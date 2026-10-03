import { meleePursuitCamp } from './melee-pursuit-v197.ts';
import { reconcilePawnHealth } from '../../src/sim/health.ts';
import { considerFlee,threatQueries } from '../../src/sim/threats.ts';

/** Prepared civilian escape facing a real mobile raider. Equal effective pace
 * keeps contacts outside this motion audit; the wounded case retains real
 * medical injuries on both actors, with no capacity changes during the run. */
export function fleeContinuityCamp(wounded=false) {
  const scene=meleePursuitCamp('flee',7);
  if(wounded){scene.chaser.health=structuredClone(scene.target.health);reconcilePawnHealth(scene.w,scene.chaser);}
  else delete scene.target.health;
  considerFlee(scene.w,scene.target,threatQueries(scene.w));
  return scene;
}
