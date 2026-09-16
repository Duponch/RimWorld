import { carrierOf } from './rescue-state.ts';
import { TICKS_PER_DAY, type Pawn, type World } from './types.ts';
import { BUILDING_MATERIALS } from './building-materials.ts';

export const REST_PER_TICK = 95 / TICKS_PER_DAY;
export const LEGACY_REST_PER_TICK = 0.008;
export const BED_REST_PER_TICK = 100 / (TICKS_PER_DAY * 10.5 / 24);
export const GROUND_REST_PER_TICK = BED_REST_PER_TICK * 0.8;
const COLLAPSE_INTERVAL = TICKS_PER_DAY / 400;

export const restFallFactor = (rest: number): number => rest >= 28 ? 1 : rest >= 14 ? 0.7 : rest >= 1 ? 0.3 : 0.6;

/** Reference MTB is in game days; our tick/day is one tenth of RimWorld's. */
export function collapseProbability(zeroTicks: number): number {
  if (zeroTicks <= 100) return 0;
  const days = zeroTicks < 1500 ? 0.25 : zeroTicks < 3000 ? 0.125 : zeroTicks < 4500 ? 1 / 12 : 0.0625;
  return COLLAPSE_INTERVAL / (days * TICKS_PER_DAY);
}

export function updateRest(world: World, pawn: Pawn): void {
  if(pawn.state==='dead')return;
  if(carrierOf(world,pawn.id)){
    delete pawn.medicalSleep;
    pawn.rest=Math.max(0,pawn.rest-(world.restRules==='legacy'?LEGACY_REST_PER_TICK:REST_PER_TICK*restFallFactor(pawn.rest)));
    return;
  }
  if(pawn.state==='downed') {
    pawn.restZeroTicks=0;pawn.collapsePending=false;
    if(pawn.moveCooldown>0){delete pawn.medicalSleep;return;}
    if(pawn.medicalSleep&&pawn.rest>=100)delete pawn.medicalSleep;
    else if(!pawn.medicalSleep&&pawn.rest<75&&pawn.hunger>0)pawn.medicalSleep=true;
    const need=pawn.need,bed=pawn.moveCooldown===0&&need?.kind==='sleep'&&need.phase==='sleep'&&need.bedId!==null?world.structures.find(s=>s.id===need.bedId&&s.kind==='bed'):undefined;
    if(pawn.medicalSleep)pawn.rest=Math.min(100,pawn.rest+(bed?BED_REST_PER_TICK*(bed.material?BUILDING_MATERIALS[bed.material].restFactor:1):GROUND_REST_PER_TICK));
    else pawn.rest=Math.max(0,pawn.rest-(world.restRules==='legacy'?LEGACY_REST_PER_TICK:REST_PER_TICK*restFallFactor(pawn.rest)));
    return;
  }
  if (pawn.state !== 'sleeping') pawn.rest = Math.max(0, pawn.rest - (world.restRules === 'legacy' ? LEGACY_REST_PER_TICK : REST_PER_TICK * restFallFactor(pawn.rest)));
  if (world.restRules === 'legacy') { pawn.restZeroTicks = 0; pawn.collapsePending = false; return; }
  pawn.restZeroTicks = pawn.rest < 0.01 && pawn.state !== 'sleeping' ? Math.min(4500, pawn.restZeroTicks + 1) : 0;
  if (pawn.rest >= 0.01 || pawn.hunger <= 0 || pawn.need?.kind === 'sleep') { pawn.collapsePending = false; return; }
  if (pawn.collapsePending || (world.tick + pawn.id) % COLLAPSE_INTERVAL !== 0) return;
  const probability = collapseProbability(pawn.restZeroTicks);
  if (!probability) return;
  // Same serialized PRNG as harvest; only eligible checks consume a draw.
  let rng = world.rng; rng ^= rng << 13; rng ^= rng >>> 17; rng ^= rng << 5;
  world.rng = rng >>> 0;
  pawn.collapsePending = world.rng / 0x100000000 < probability;
}
