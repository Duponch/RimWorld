import { OUTDOOR_TEMPERATURE } from './environment.ts';
import type { ItemId } from './items.ts';
import { TICKS_PER_DAY, type MaterialPile, type World } from './types.ts';

export const ROT_DAYS = Object.freeze({ berries: 14, rice: 40, 'simple-meal': 4 } as const);
export type PerishableItem = keyof typeof ROT_DAYS;
export interface RotState { progress: number; atTick: number }
export type SpoiledFood = Record<PerishableItem, number>;
export const emptySpoilage = (): SpoiledFood => ({ berries: 0, rice: 0, 'simple-meal': 0 });
export const isPerishable = (item: ItemId): item is PerishableItem => Object.hasOwn(ROT_DAYS, item);
export const rotRateAtTemperature = (temperature: number): number => Math.max(0, Math.min(1, temperature / 10));
const ambientRate = rotRateAtTemperature(OUTDOOR_TEMPERATURE);

/** The fixed climate permits an anchored clock: no per-tick mutations or deltas.
 * Future temperature transitions must checkpoint age before changing its rate. */
export function rotAge(pile: MaterialPile, tick: number): number {
  return pile.rot ? pile.rot.progress + (tick - pile.rot.atTick) * ambientRate : 0;
}
export function ticksUntilRot(pile: MaterialPile, tick: number): number {
  return isPerishable(pile.item) ? (ROT_DAYS[pile.item] * TICKS_PER_DAY - rotAge(pile, tick)) / ambientRate : Infinity;
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
  target.rot = { progress: (rotAge(target, tick) * target.quantity + incomingAge * quantity) / (target.quantity + quantity), atTick: tick };
}
export function spoiledUnits(world: World): number {
  return world.spoiled.berries + world.spoiled.rice + world.spoiled['simple-meal'];
}
