import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { afterEach, expect, test, vi } from 'vitest';
import { isColonist } from '../src/sim/affiliation.ts';
import { deserializeWorld, serializeWorld, validateWorld } from '../src/sim/index.ts';
import { SCHEMA_VERSION } from '../src/sim/types.ts';
import { parseTestColonies, readTestColony, testColonyUrl } from '../src/ui/test-colonies.ts';

const episodes = [
  ['clear', 'clear'],
  ['fog', 'fog'],
  ['rain', 'rain'],
  ['dry-thunderstorm', 'dry-thunderstorm'],
  ['foggy-rain', 'foggy-rain'],
  ['snow-gentle', 'snow-gentle'],
  ['snow-hard', 'snow-hard'],
  ['rainy-thunderstorm', 'rainy-thunderstorm'],
] as const;

afterEach(() => vi.unstubAllGlobals());

test('the eight prepared weather saves are published in the player test-colony catalogue', async () => {
  const manifest = JSON.parse(readFileSync('public/test-saves/manifest.json', 'utf8'));
  const saves = parseTestColonies(manifest);
  expect(saves).toHaveLength(34);
  expect(saves.filter(save => save.release === 'v166')).toHaveLength(8);
  vi.stubGlobal('fetch', vi.fn(async (url: string) =>
    new Response(readFileSync(`public${url}`, 'utf8'))));
  for (const [slug, weather] of episodes) {
    const save = saves.find(entry => entry.id === `weather-${slug}-v166`)!;
    expect(save).toMatchObject({ release: 'v166', filename: `${slug}-prepared.json`,
      pawns: 3, colonists: 3, width: 32, height: 32, tick: 0, prepared: true });
    const raw = readFileSync(`public${testColonyUrl(save)}`, 'utf8');
    expect(save.sha256).toBe(createHash('sha256').update(raw).digest('hex'));
    expect(await readTestColony(save)).toBe(raw);
    const world = deserializeWorld(raw);
    expect(validateWorld(world)).toEqual([]);
    expect(world.weather?.current).toBe(weather);
    expect(world.pawns.filter(isColonist)).toHaveLength(save.colonists);
    const original = JSON.parse(raw);
    expect(serializeWorld(world)).toBe(JSON.stringify({ ...original, schemaVersion: SCHEMA_VERSION }));
  }
});
