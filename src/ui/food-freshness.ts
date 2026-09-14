import { ticksUntilRot } from '../sim/food-preservation.ts';
import { TICKS_PER_DAY, type MaterialPile } from '../sim/types.ts';

export function foodFreshnessLabel(pile: MaterialPile, tick: number): string {
  if (pile.kind !== 'food') return '';
  const left = ticksUntilRot(pile, tick);
  if (!Number.isFinite(left)) return 'ne pourrit pas';
  const hours = Math.max(0, left / TICKS_PER_DAY * 24);
  return hours < 24 ? `pourrit dans ${hours.toFixed(1)} h` : `pourrit dans ${(hours / 24).toFixed(1)} j`;
}
