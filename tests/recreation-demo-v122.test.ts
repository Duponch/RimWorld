import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { stepWorld } from '../src/sim/engine.ts';
import { deserializeWorld, serializeWorld, validateWorld } from '../src/sim/serialization.ts';

const fixtureUrl = new URL('../public/test-saves/v122/echecs.json', import.meta.url);
const manifestUrl = new URL('../public/test-saves/manifest.json', import.meta.url);
test('prepared V122 chess room loads directly and real play resumes exactly', () => {
  // This historical V122 fixture is immutable. Its original bytes, rather than
  // a newly generated current-schema scene, are the migration oracle.
  const raw = readFileSync(fixtureUrl, 'utf8');
  const sha256 = createHash('sha256').update(raw).digest('hex');
  const manifest = JSON.parse(readFileSync(manifestUrl, 'utf8')) as { saves: { id: string; release: string; filename: string; sha256: string; prepared: boolean }[] };
  const listed = manifest.saves.find(save => save.id === 'echecs-v122');
  expect(listed).toMatchObject({ release: 'v122', filename: 'echecs.json', prepared: true, sha256 });
  const world = deserializeWorld(raw);
  expect(validateWorld(world)).toEqual([]);
  const initial = world.pawns[0]!.recreation.level;
  let started = false;
  for (let i = 0; i < 80; i++) {
    stepWorld(world);
    if (world.pawns[0]!.recreation.task?.activity === 'chess' && world.pawns[0]!.recreation.task?.phase === 'active') { started = true; break; }
  }
  expect(started).toBe(true);
  const resumed = deserializeWorld(serializeWorld(world));
  expect(validateWorld(resumed)).toEqual([]);
  for (let i = 0; i < 80; i++) { stepWorld(world); stepWorld(resumed); }
  expect(world.pawns[0]!.recreation.level).toBeGreaterThan(initial);
  expect(world.pawns[0]!.recreation.tolerance.cerebral).toBeGreaterThan(0);
  expect(world.pawns[0]!.skills.intellectual?.xp ?? 0).toBeGreaterThan(0);
  expect(validateWorld(world)).toEqual([]);
  expect(serializeWorld(resumed)).toBe(serializeWorld(world));
});
