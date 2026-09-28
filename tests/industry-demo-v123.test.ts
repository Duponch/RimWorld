import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { afterEach, expect, test, vi } from 'vitest';
import { deserializeWorld, serializeWorld, stepWorld, validateWorld } from '../src/sim/index.ts';
import { parseTestColonies, readTestColony } from '../src/ui/test-colonies.ts';
import { prepareIndustryDemo } from '../scripts/generate-industry-demo-v123.ts';
import { SCHEMA_VERSION } from '../src/sim/types.ts';

afterEach(() => vi.unstubAllGlobals());

test('V123 industry scene loads through Charger and fabricates its first component after exact continuation', async () => {
  const raw = readFileSync('public/test-saves/v123/industrie.json', 'utf8');
  const entries = parseTestColonies(JSON.parse(readFileSync('public/test-saves/manifest.json', 'utf8')));
  const entry = entries.find(save => save.id === 'industrie-v123');
  expect(entry).toMatchObject({ release: 'v123', filename: 'industrie.json', prepared: true });
  expect(entry!.sha256).toBe(createHash('sha256').update(raw).digest('hex'));
  expect(deserializeWorld(raw)).toEqual(prepareIndustryDemo());
  vi.stubGlobal('fetch', vi.fn(async () => new Response(raw)));
  const loadedRaw = await readTestColony(entry!);
  expect(loadedRaw).toBe(raw);
  const world = deserializeWorld(loadedRaw);
  expect(validateWorld(world)).toEqual([]);
  expect(JSON.parse(raw).schemaVersion).toBe(123);
  expect(world.schemaVersion).toBe(SCHEMA_VERSION);
  expect(world.pawns[0]!.skills.crafting!.level).toBeGreaterThanOrEqual(8);
  const bench = world.structures.find(s => s.kind === 'fabrication-bench');
  expect(bench?.power?.on).toBe(true);
  expect(bench?.bills).toMatchObject([{ recipe: 'make-component', mode: 'times', target: 1 }]);
  const count = (item: string) => world.piles.filter(p => p.item === item).reduce((sum, p) => sum + p.quantity, 0);
  const initialSteel = count('steel');
  expect(initialSteel).toBeGreaterThanOrEqual(12);
  expect(count('component')).toBe(0);
  expect(world.piles.some(p => p.componentWork)).toBe(false);

  for (let i = 0; i < 1500 && !world.piles.some(p => (p.componentWork?.progress ?? 0) > 0); i++) stepWorld(world);
  expect(world.piles.some(p => (p.componentWork?.progress ?? 0) > 0)).toBe(true);
  const resumed = deserializeWorld(serializeWorld(world));
  expect(validateWorld(resumed)).toEqual([]);
  for (let i = 0; i < 2500 && count('component') === 0; i++) {
    stepWorld(world);
    stepWorld(resumed);
  }
  expect(count('component')).toBe(1);
  expect(count('steel')).toBe(initialSteel - 12);
  expect(world.piles.some(p => p.componentWork)).toBe(false);
  expect(bench!.bills![0]!.target).toBe(0);
  expect(validateWorld(world)).toEqual([]);
  expect(serializeWorld(resumed)).toBe(serializeWorld(world));
});
