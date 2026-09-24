import { expect, test } from 'vitest';
import { applyCommand } from '../src/sim/engine';
import { draftablePawns, toggleDraft } from '../src/ui/drafting-controls';
import { tacticalAttackPolicy, tacticalPawns } from '../src/ui/order-menu';
import type { Command } from '../src/sim/types';
import { animalCombatCamp } from './scenarios/animal-combat';
import { encounterCamp } from './scenarios/encounter';

test('R acts only on available free colonists in a mixed selection', () => {
  const world = encounterCamp(), [guard, civilian, patient, enemy] = world.pawns;
  patient!.state = 'downed';
  const sent: Command[] = [];
  expect(draftablePawns([guard!, civilian!, patient!, enemy!]).map(p => p.id)).toEqual([guard!.id, civilian!.id]);
  toggleDraft([guard!, civilian!, patient!, enemy!], command => sent.push(command));
  expect(sent).toEqual([{ type: 'draft', pawnIds: [guard!.id, civilian!.id], enabled: true }]);
  toggleDraft([patient!, enemy!], command => sent.push(command));
  expect(sent).toHaveLength(1);
});

test('context attack excludes a friend and cannot silently turn into movement', () => {
  const world = encounterCamp(), guard = world.pawns[0]!, friend = world.pawns[1]!, enemy = world.pawns[3]!;
  const ids = new Set([guard.id, friend.id, enemy.id]);
  expect(tacticalPawns(world, ids).map(p => p.id)).toEqual([guard.id]);
  const friendly = tacticalAttackPolicy(world, ids, friend.id, false);
  expect(friendly.options).toEqual([]);
  expect(friendly.reason).toMatch(/allié/);
  const hostile = tacticalAttackPolicy(world, ids, enemy.id, false);
  const shot = hostile.options.find(option => option.kind === 'shoot')!;
  expect(shot.enabled).toBe(true);
  expect(shot.pawnIds).toEqual([guard.id]);
  expect(applyCommand(world, { type: 'shoot', pawnIds: shot.pawnIds, targetId: enemy.id }).ok).toBe(true);
});

test('wild prey has an explicit attack choice, while Maj never queues an attack', () => {
  const world = animalCombatCamp(), shooter = world.pawns[0]!, animal = world.wildlife!.animals[0]!;
  const ids = new Set([shooter.id]);
  const policy = tacticalAttackPolicy(world, ids, animal.id, false);
  expect(policy.target).toContain('lièvre');
  expect(policy.options.find(option => option.kind === 'shoot')).toMatchObject({ enabled: true, pawnIds: [shooter.id] });
  expect(policy.options.find(option => option.kind === 'melee')?.label).toContain('Attaquer au contact');
  const queued = tacticalAttackPolicy(world, ids, animal.id, true);
  expect(queued.options.every(option => !option.enabled)).toBe(true);
  expect(queued.options[0]?.reason).toMatch(/file d’attaques/);
});
