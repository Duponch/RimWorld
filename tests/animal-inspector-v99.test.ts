import { expect, test } from 'vitest';
import { animalInspectorScaffold, animalInspectorView } from '../src/ui/animal-inspector';
import { createWorld } from '../src/sim/index';
import { createMedicalRecord } from '../src/sim/injury-state';
import { adultAgeTicks } from '../src/sim/animal-life';
import type { WildAnimal } from '../src/sim/wildlife-state';
import { startAnimalManhunter } from '../src/sim/animal-manhunter';

function fixture() {
  const world = createWorld(901, 16, 16);
  const animal: WildAnimal = { id: world.nextId++, species: 'hare', sex: 'female', ageTicks: adultAgeTicks('hare'), x: 4, z: 7, food: .1, rest: .25, state: 'idle', path: [], nextDecision: world.tick };
  world.wildlife = { profile: 'temperate-hares-v1', rng: 1, animals: [animal], eatenPlants: 0, eatenNutrition: 0, eatenItems: 0 };
  return { world, animal };
}

test('selected wild animal exposes its stored identity, needs, state and hunt designation', () => {
  const { world, animal } = fixture();
  const view = animalInspectorView(world, animal.id)!;
  expect(view.title).toBe(`Lièvre ${animal.id}`);
  expect(view.identity).toBe('Femelle · Adulte · sauvage');
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

test('starvation exit is distinct from ordinary wandering and remains overridden by danger',()=>{
  const {world,animal}=fixture();animal.food=0;animal.state='moving';
  animal.exiting={destination:{x:0,z:7},nextFoodCheck:100};
  expect(animalInspectorView(world,animal.id)?.activity).toBe('Quitte la carte faute de nourriture');
  animal.flee={danger:{x:5,z:7},until:20};
  expect(animalInspectorView(world,animal.id)?.activity).toBe('Fuit');
});

test('applicable tabs have labelled panels; advanced training remains absent', () => {
  const markup = animalInspectorScaffold();
  for (const tab of ['info', 'health']) {
    expect(markup).toContain(`role="tab" id="animal-tab-${tab}" aria-controls="animal-panel-${tab}"`);
    expect(markup).toContain(`role="tabpanel" id="animal-panel-${tab}" aria-labelledby="animal-tab-${tab}"`);
  }
  expect(markup).toContain('data-animal-hunt');
  expect(markup).toContain('data-animal-tame');
  expect(markup).toContain('data-animal-care');
  expect(markup).not.toContain('animal-tab-needs');
  expect(markup).not.toMatch(/dressage|training/i);
});

test('temporary rage names the real human target safely and stays distinct from medical disease',()=>{
  const {world,animal}=fixture();
  expect(startAnimalManhunter(world,animal)).toBe(true);
  world.pawns[0]!.name='<img src=x onerror=alert(1)>';
  animal.manhunter!.targetId=world.pawns[0]!.id;
  const view=animalInspectorView(world,animal.id)!;
  expect(view.activity).toBe(`En rage · poursuit ${world.pawns[0]!.name}`);
  expect(view.species).toContain('État : rage temporaire · attaque les humains');
  expect(view.health.join(' ')).not.toMatch(/Scaria|rage/i);
  animal.manhunter!.door={targetId:world.nextId++,remaining:2,untilCore:1000};
  expect(animalInspectorView(world,animal.id)!.activity).toBe('En rage · frappe une porte');
});
