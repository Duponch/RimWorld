import { ticksUntilRot } from '../sim/food-preservation.ts';
import { TICKS_PER_DAY, type MaterialPile } from '../sim/types.ts';

export function foodFreshnessLabel(pile: MaterialPile, tick: number): string {
  if (pile.kind !== 'food') return '';
  const left = ticksUntilRot(pile, tick);
  if (!Number.isFinite(left)) return pile.rot?'gelé · pourriture suspendue':'ne pourrit pas';
  const hours = Math.max(0, left / TICKS_PER_DAY * 24);
  const delay=hours < 24 ? `${hours.toFixed(1)} h` : `${(hours / 24).toFixed(1)} j`;
  return `${(pile.rot?.rate??1)<1?'réfrigéré · ':''}pourrit dans ${delay} à température actuelle`;
}
