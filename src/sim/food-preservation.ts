import type { ItemId } from './items.ts';
import { TICKS_PER_DAY, type MaterialPile, type World } from './types.ts';

export const ROT_DAYS = Object.freeze({ berries: 14, rice: 40, 'simple-meal': 4, 'herbal-medicine':150, 'hare-meat':2, 'hare-corpse':2.5 } as const);
export type PerishableItem = keyof typeof ROT_DAYS;
export interface RotState { progress: number; atTick: number; rate?:number }
export type SpoiledFood = Record<Exclude<PerishableItem,'herbal-medicine'|'hare-meat'|'hare-corpse'>, number>&{'herbal-medicine'?:number;'hare-meat'?:number};
export const emptySpoilage = (): SpoiledFood => ({ berries: 0, rice: 0, 'simple-meal': 0 });
export const isPerishable = (item: ItemId): item is PerishableItem => Object.hasOwn(ROT_DAYS, item);
export const rotRateAtTemperature = (temperature: number): number => Math.max(0, Math.min(1, temperature / 10));

/** Anchored thermal age. Rate changes checkpoint the previous interval first. */
export function rotAge(pile: MaterialPile, tick: number): number {
  return pile.rot ? pile.rot.progress + (tick - pile.rot.atTick) * (pile.rot.rate??1) : 0;
}
export function ticksUntilRot(pile: MaterialPile, tick: number): number {
  if(!isPerishable(pile.item))return Infinity;
  const remaining=ROT_DAYS[pile.item]*TICKS_PER_DAY-rotAge(pile,tick);
  return remaining<=0?0:remaining/(pile.rot?.rate??1);
}
export function freshRot(item: ItemId, tick: number): { rot?: RotState } {
  return isPerishable(item) ? { rot: { progress: 0, atTick: tick } } : {};
}
export function copyRot(pile: MaterialPile): { rot?: RotState } {
  return pile.rot ? { rot: { ...pile.rot } } : {};
}
/** Call before increasing target.quantity; incomingAge=0 means newly produced food. */
export function mergeRot(target: MaterialPile, quantity: number, incomingAge: number, tick: number): void {
  if (!quantity || !isPerishable(target.item)) return;
  target.rot = { progress: (rotAge(target, tick) * target.quantity + incomingAge * quantity) / (target.quantity + quantity), atTick: tick,...target.rot?.rate!==undefined?{rate:target.rot.rate}:{} };
}
export function spoiledUnits(world: World): number {
  return world.spoiled.berries + world.spoiled.rice + world.spoiled['simple-meal']+(world.spoiled['hare-meat']??0);
}
