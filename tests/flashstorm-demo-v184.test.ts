import { withoutMiningSkill, withoutPredatorDefaults } from './scenarios/legacy-skills.ts';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { FLASHSTORM_DEMO_TICK, flashstormDemoManifestEntry, prepareFlashstormDemo } from '../scripts/generate-flashstorm-demo-v184.ts';
import { MISC_INTRO_TICK } from '../src/sim/cassandra-misc.ts';
import { stepWorld } from '../src/sim/engine.ts';
import { deserializeWorld, serializeWorld, validateWorld } from '../src/sim/serialization.ts';

const fixturePath = new URL('../public/test-saves/v184/orage-sec-et-incendies.json', import.meta.url);

test('V184 prepared public scene resolves a real introductory Misc ticket only after resume', () => {
  const raw = readFileSync(fixturePath, 'utf8');
  const world = deserializeWorld(raw);
  const prepared=withoutPredatorDefaults(withoutMiningSkill(prepareFlashstormDemo('pre-v210')));
  // Arid species and weights are unchanged; retain the original V173 profile.
  prepared.wildlife!.profile='biome-herbivores-v1';
  expect(world).toEqual(prepared);
  expect(world.tick).toBe(FLASHSTORM_DEMO_TICK);
  expect([world.width, world.height, world.pawns.length]).toEqual([250, 250, 3]);
  expect(world.flashstorm).toBeUndefined();
  expect(world.fires?.items).toHaveLength(0);
  expect(world.weather?.lastLightning).toBeUndefined();
  expect(world.miscIncidents).toMatchObject({ introDone: false, opportunities: 0, heatwaves: 0 });
  const hash = createHash('sha256').update(raw).digest('hex');
  expect(flashstormDemoManifestEntry(world, hash)).toMatchObject({ id: 'orage-sec-et-incendies-v184', sha256: hash, tick: FLASHSTORM_DEMO_TICK });
  const gameRng = world.rng;
  stepWorld(world);
  expect(world.tick).toBe(MISC_INTRO_TICK);
  expect(world.miscIncidents).toMatchObject({ introDone: true, opportunities: 1, heatwaves: 0 });
  expect(world.flashstorm).toMatchObject({ totalStrikes: 0, storms: 1, active: { start: MISC_INTRO_TICK, strikes: 0 } });
  expect(world.fires?.items).toHaveLength(0);
  expect(world.rng).toBe(gameRng);
  expect(validateWorld(world)).toEqual([]);
});

test('V184 prepared scene serves a physical lightning attempt and resumes the same world', () => {
  const world = deserializeWorld(readFileSync(fixturePath, 'utf8'));
  stepWorld(world, 5);
  expect(world.flashstorm?.active?.strikes).toBeGreaterThan(0);
  expect(world.flashstorm?.totalStrikes).toBe(world.flashstorm?.active?.strikes);
  expect(world.flashstorm?.active?.center).toEqual({ x: 131, z: 112 });
  expect(world.weather?.lastLightning).toMatchObject({ x: 122, z: 123, coreTick: 264001 });
  expect(world.fires?.items.length).toBeGreaterThan(0);
  expect(world.fires?.ledger.ignitions).toBeGreaterThan(0);
  expect(validateWorld(world)).toEqual([]);
  const resumed = deserializeWorld(serializeWorld(world));
  stepWorld(world, 80);
  stepWorld(resumed, 80);
  expect(resumed).toEqual(world);
  expect(validateWorld(world)).toEqual([]);
});
