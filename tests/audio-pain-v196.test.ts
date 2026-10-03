import { expect, test } from 'vitest';
import { AudioCueRecorder } from '../src/bridge/audio-cues.ts';
import { AudioCueScheduler } from '../src/audio/scheduler.ts';
import { injurePawn } from '../src/sim/health.ts';
import { damageUnarmoredPawnWithBullet } from '../src/sim/bullet-damage.ts';
import { addResolvedInjury, createMedicalRecord, tendInjury } from '../src/sim/injury-state.ts';
import { administerAnesthetic } from '../src/sim/anesthetic.ts';
import { ANIMAL_SPECIES_IDS } from '../src/sim/animal-species.ts';
import { appearanceOf, createPawnAppearance } from '../src/sim/pawn-appearance.ts';
import { deserializeWorld, serializeWorld } from '../src/sim/index.ts';
import { medicalCamp } from './scenarios/health.ts';
import type { WildAnimal } from '../src/sim/wildlife-state.ts';

test.each(['male', 'female'] as const)('confirmed human damage uses the existing %s appearance, never the attacker voice', sex => {
  const world = medicalCamp(2), [attacker, victim] = world.pawns;
  victim!.appearance = createPawnAppearance(world.seed, victim!.id, victim!.name);
  victim!.appearance.sex = sex;
  victim!.appearance.headType = sex === 'male' ? 'Male_AverageNormal' : 'Female_AverageNormal';
  victim!.appearance.bodyType = sex === 'male' ? 'Male' : 'Female';
  victim!.appearance.beard = 'NoBeard';
  const recorder = new AudioCueRecorder(); recorder.capture(world);
  world.tick++;
  injurePawn(world, victim!, 'torso', 'bruise', 1000);
  const after = serializeWorld(world), rng = world.rng;
  recorder.capture(world);
  const cues = recorder.drain();
  expect(cues).toEqual([{ id: `human.hurt:${victim!.id}:${victim!.health!.nextInjuryId}`,
    tick: world.tick, kind: `human.hurt.${sex}`, x: victim!.x, z: victim!.z }]);
  expect(cues.some(cue => cue.id.includes(`:${attacker!.id}:`))).toBe(false);
  recorder.capture(world); expect(recorder.drain()).toEqual([]);
  expect(serializeWorld(world)).toBe(after); expect(world.rng).toBe(rng);
});

test.each([['Ada', 'female'], ['Noé', 'male'], ['Mina', 'female']] as const)(
  'historical %s uses the same %s projection as its visible appearance', (name, sex) => {
    const world = medicalCamp(), pawn = world.pawns[0]!;
    delete pawn.appearance; pawn.name = name;
    expect(appearanceOf(pawn, world.seed).sex).toBe(sex);
    const recorder = new AudioCueRecorder(); recorder.capture(world);
    world.tick++; injurePawn(world, pawn, 'torso', 'bruise', 1000);
    recorder.capture(world); expect(recorder.drain().map(cue => cue.kind)).toEqual([`human.hurt.${sex}`]);
    expect(pawn.appearance).toBeUndefined();
  });

test('merged wounds, healing offsets and immediately lost parts still signal committed damage once', () => {
  const world = medicalCamp(), pawn = world.pawns[0]!;
  const recorder = new AudioCueRecorder(); recorder.capture(world);
  injurePawn(world, pawn, 'torso', 'crush', 1000);
  recorder.capture(world); const first = recorder.drain(); expect(first).toHaveLength(1);
  const injury = pawn.health!.injuries[0]!;
  injury.severity = 100; // Prepared healing offsets more than the incoming blow.
  addResolvedInjury(pawn.health!, 'torso', 'crush', 100, () => .999999);
  expect(pawn.health!.injuries).toHaveLength(1); expect(injury.severity).toBe(200);
  recorder.capture(world); const second = recorder.drain(); expect(second).toHaveLength(1);
  expect(second[0]!.id).not.toBe(first[0]!.id); // Distinct even at the same local tick.
  injurePawn(world, pawn, 'left-hand', 'cut', 20000);
  expect(pawn.health!.missing.some(part => part.part === 'left-hand')).toBe(true);
  recorder.capture(world); expect(recorder.drain()).toHaveLength(1);
  recorder.capture(world); expect(recorder.drain()).toEqual([]);
});

test('a zero-damage contact stays silent while a resolved bullet wound uses the victim pain cue', () => {
  const world = medicalCamp(), pawn = world.pawns[0]!;
  const recorder = new AudioCueRecorder(); recorder.capture(world);
  expect(damageUnarmoredPawnWithBullet(world, pawn, { damage: 0, part: 'torso' })).toBeNull();
  recorder.capture(world); expect(recorder.drain()).toEqual([]);
  world.tick++;
  const result = damageUnarmoredPawnWithBullet(world, pawn, { damage: 2, part: 'torso', depth: 'outside' });
  expect(result!.layers.length).toBeGreaterThan(0);
  expect(pawn.state).not.toBe('dead');
  recorder.capture(world);
  expect(recorder.drain().map(cue => cue.kind)).toEqual([`human.hurt.${appearanceOf(pawn, world.seed).sex}`]);
});

test('tending, blood loss, illness, sedated surgery and death do not masquerade as a human wound voice', () => {
  const world = medicalCamp(), pawn = world.pawns[0]!;
  injurePawn(world, pawn, 'torso', 'bruise', 1000);
  const recorder = new AudioCueRecorder(); recorder.capture(world); expect(recorder.drain()).toEqual([]);
  expect(tendInjury(pawn.health!, pawn.health!.injuries[0]!.id, 700)).toBe(true);
  pawn.health!.bloodLoss += 1000; pawn.health!.malnutrition = 100;
  recorder.capture(world); expect(recorder.drain()).toEqual([]);
  expect(administerAnesthetic(pawn.health!, () => .5)).toBe(true);
  injurePawn(world, pawn, 'torso', 'cut', 1000);
  recorder.capture(world); expect(recorder.drain()).toEqual([]);
  delete pawn.health!.anesthetic;
  injurePawn(world, pawn, 'torso', 'cut', 200000);
  expect(pawn.state).toBe('dead');
  recorder.capture(world);
  expect(recorder.drain().map(cue => cue.kind)).toEqual(['ui.colonist-death']);
});

test.each(ANIMAL_SPECIES_IDS)('%s has a wound voice only after real anatomical damage, including merged burns', species => {
  const world = medicalCamp();
  const animal: WildAnimal = { id: world.nextId++, species, sex: 'female', x: 10, z: 11, ageTicks: 1000,
    food: 1, rest: 1, state: 'idle', path: [], nextDecision: world.tick,
    health: { ...createMedicalRecord(world.tick), body: species } };
  world.wildlife = { profile: 'biome-fauna-v2', rng: 7, animals: [animal], eatenPlants: 0, eatenNutrition: 0, eatenItems: 0 };
  const recorder = new AudioCueRecorder(); recorder.capture(world); expect(recorder.drain()).toEqual([]);
  addResolvedInjury(animal.health!, 'torso', 'burn', 100, () => .999999);
  recorder.capture(world);
  expect(recorder.drain().map(cue => cue.kind)).toEqual([`animal.hurt.${species === 'snow-hare' ? 'hare' : species}`]);
  addResolvedInjury(animal.health!, 'torso', 'burn', 100, () => .999999);
  expect(animal.health!.injuries).toHaveLength(1);
  recorder.capture(world); expect(recorder.drain()).toHaveLength(1);
  recorder.capture(world); expect(recorder.drain()).toEqual([]);
});

test('a resumed medical record is silent, skipped observations collapse to one cue and repeated deliveries stay deduplicated', () => {
  let world = medicalCamp(); const pawn = world.pawns[0]!;
  injurePawn(world, pawn, 'torso', 'bruise', 1000);
  world = deserializeWorld(serializeWorld(world));
  const recorder = new AudioCueRecorder(); recorder.capture(world); expect(recorder.drain()).toEqual([]);
  for (let i = 0; i < 3; i++) { world.tick++; injurePawn(world, world.pawns[0]!, 'torso', 'bruise', 100); }
  recorder.capture(world); const cues = recorder.drain(); expect(cues).toHaveLength(1);
  const scheduler = new AudioCueScheduler(); scheduler.ingest(cues); scheduler.ingest(cues);
  expect(scheduler.takeDue(world.tick)).toEqual(cues);
  scheduler.ingest(cues); expect(scheduler.takeDue(world.tick)).toEqual([]);
  recorder.reset(); recorder.capture(world); expect(recorder.drain()).toEqual([]);
});

test('pain events preserve recorder burst caps and never mutate the medical record', () => {
  const world = medicalCamp(40, 64), recorder = new AudioCueRecorder(); recorder.capture(world);
  for (const pawn of world.pawns) injurePawn(world, pawn, 'torso', 'bruise', 100);
  const checkpoint = serializeWorld(world); recorder.capture(world);
  expect(recorder.drain()).toHaveLength(32); expect(serializeWorld(world)).toBe(checkpoint);
});
