import { expect, test } from 'vitest';
import { animalInspectorScaffold, animalInspectorView } from '../src/ui/animal-inspector';
import { createWorld } from '../src/sim/index';
import { createMedicalRecord } from '../src/sim/injury-state';
import type { WildAnimal } from '../src/sim/wildlife-state';

function fixture() {
  const world = createWorld(901, 16, 16);
  const animal: WildAnimal = { id: world.nextId++, species: 'hare', sex: 'female', x: 4, z: 7, food: .1, rest: .25, state: 'idle', path: [], nextDecision: world.tick };
  world.wildlife = { profile: 'temperate-hares-v1', rng: 1, animals: [animal], eatenPlants: 0, eatenNutrition: 0, eatenItems: 0 };
  return { world, animal };
}

test('selected wild animal exposes its stored identity, needs, state and hunt designation', () => {
  const { world, animal } = fixture();
  const view = animalInspectorView(world, animal.id)!;
  expect(view.title).toBe(`Lièvre ${animal.id}`);
  expect(view.identity).toBe('Femelle · sauvage');
  expect(view.position).toBe('4, 7');
  expect(view.needs).toContain('Nourriture : 50 %');
  expect(view.needs).toContain('Repos : 25 %');
  expect(view.hunted).toBe(false);
  world.hunting = { targets: [animal.id], completed: 0 };
  expect(animalInspectorView(world, animal.id)?.hunted).toBe(true);
  expect(animalInspectorView(world, -1)).toBeNull();
});

test('animal anatomy and medical conditions use the real species record', () => {
  const { world, animal } = fixture();
  animal.health = { ...createMedicalRecord(world.tick), body: 'hare', malnutrition: 200_000_000 };
  animal.health.injuries.push({ id: 1, part: 'tail', kind: 'bite', severity: 1200, bornAt: world.tick });
  animal.health.nextInjuryId = 2;
  animal.health.infections = { nextId: 2, immunity: 100_000_000, cases: [{ id: 1, part: 'tail', bornAt: world.tick, severity: 400_000_000, luck: 1_000_000 }] };
  const health = animalInspectorView(world, animal.id)!.health.join(' · ');
  expect(health).toContain('Queue : Morsure, −1.20 PV');
  expect(health).toContain('Queue : infection majeure, 40.0 %');
  expect(health).toContain('Malnutrition');
  expect(health).toContain('Mobilité');
  animal.state = 'dead';
  expect(animalInspectorView(world, animal.id)?.canHunt).toBe(false);
});

test('applicable tabs have labelled panels and no unsupported training controls', () => {
  const markup = animalInspectorScaffold();
  for (const tab of ['info', 'health']) {
    expect(markup).toContain(`role="tab" id="animal-tab-${tab}" aria-controls="animal-panel-${tab}"`);
    expect(markup).toContain(`role="tabpanel" id="animal-panel-${tab}" aria-labelledby="animal-tab-${tab}"`);
  }
  expect(markup).toContain('data-animal-hunt');
  expect(markup).not.toContain('animal-tab-needs');
  expect(markup).not.toMatch(/dressage|apprivoiser|training|taming/i);
});
