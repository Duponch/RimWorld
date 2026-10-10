import { expect, test } from 'vitest';
import { createScenarioWorld } from '../src/sim/new-game';
import { TICKS_PER_DAY } from '../src/sim/types';
import { siteHudDate } from '../src/ui/site-hud';
import { resourceLedgerBranch } from '../src/ui/resource-ledger';
import { STORAGE_FILTER_TREE } from '../src/ui/storage-filter-tree';
import type { ItemId } from '../src/sim/items';

test('civil midnight changes the displayed calendar day using the saved origin', () => {
  const world = createScenarioWorld(42, 32, 'survivors');
  world.climate = { revision: 1, profile: 'temperate-reference', adoptedAt: 900, calendarOrigin: 14 * TICKS_PER_DAY + TICKS_PER_DAY - 1 };
  world.tick = 900;
  expect(siteHudDate(world)).toEqual({ day: 15, label: 'avrimai 5500', full: '15 avrimai 5500 · Printemps', season: 0 });
  world.tick++;
  expect(siteHudDate(world)).toEqual({ day: 1, label: 'juillêt 5500', full: '1 juillêt 5500 · Été', season: 1 });
});

test('the final quadrum rolls into a new year without displaying a day31', () => {
  const world = createScenarioWorld(42, 32, 'survivors');
  world.climate = { revision: 1, profile: 'temperate-reference', adoptedAt: 0, calendarOrigin: 60 * TICKS_PER_DAY - 1 };
  world.tick = 0;
  expect(siteHudDate(world)).toEqual({ day: 15, label: 'décembary 5500', full: '15 décembary 5500 · Hiver', season: 3 });
  world.tick++;
  expect(siteHudDate(world)).toEqual({ day: 1, label: 'avrimai 5501', full: '1 avrimai 5501 · Printemps', season: 0 });
});

test('historical games retain their continuous day number without an invented season', () => {
  const world = createScenarioWorld(42, 32, 'survivors');
  delete world.climate;
  world.tick = 30 * TICKS_PER_DAY;
  expect(siteHudDate(world)).toEqual({ day: 31, label: 'Partie historique', full: 'Jour 31 · calendrier historique' });
});

test('nested quantities count each item once and keep distinct medicine and material kinds', () => {
  const quantities = new Map<ItemId, number>([['wood', 75], ['granite-blocks', 40], ['marble-blocks', 20], ['herbal-medicine', 8], ['medicine', 6], ['muffalo-wool', 30], ['cloth', 15], ['rice', 50], ['simple-meal', 4]]);
  const branches = STORAGE_FILTER_TREE.map(node => resourceLedgerBranch(node, quantities));
  expect(branches.find(branch => branch.id === 'raw-resources')!.quantity).toBe(135);
  expect(branches.find(branch => branch.id === 'manufactured')!.quantity).toBe(59);
  const food = branches.find(branch => branch.id === 'foods')!;
  expect(food.quantity).toBe(54);
  expect(food.children.find(branch => branch.id === 'meals')!.quantity).toBe(4);
  expect(food.children.find(branch => branch.id === 'raw-food')!.quantity).toBe(50);
  expect(branches.reduce((sum, branch) => sum + branch.quantity, 0)).toBe([...quantities.values()].reduce((sum, quantity) => sum + quantity, 0));
});
