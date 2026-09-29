/** Prepared visual episodes, never a natural-weather occurrence claim.
 * Run: node --experimental-strip-types scripts/weather-test-saves-v166.ts
 * Output stays outside the versioned historical fixtures. */
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createWorld, deserializeWorld, serializeWorld, validateWorld } from '../src/sim/index.ts';
import { newWeatherState } from '../src/sim/weather.ts';
import type { WeatherKind } from '../src/sim/weather-definitions.ts';

const output = join(process.cwd(), 'tmp', 'weather-v166');
const base = createWorld(166, 32, 32);
const episodes: { id: string; weather: WeatherKind; description: string }[] = [
  { id: 'clear-prepared', weather: 'clear', description: 'Temps clair établi, témoin sans précipitation.' },
  { id: 'fog-prepared', weather: 'fog', description: 'Brouillard établi, témoin sans précipitation.' },
  { id: 'rain-prepared', weather: 'rain', description: 'Pluie établie, préparation visuelle explicite.' },
  { id: 'dry-thunderstorm-prepared', weather: 'dry-thunderstorm', description: 'Orage sec établi, sans frappe historique ajoutée.' },
  { id: 'foggy-rain-prepared', weather: 'foggy-rain', description: 'Pluie et brouillard établis, préparation visuelle explicite.' },
  { id: 'snow-gentle-prepared', weather: 'snow-gentle', description: 'Neige légère établie, préparation visuelle explicite.' },
  { id: 'snow-hard-prepared', weather: 'snow-hard', description: 'Neige forte établie, préparation visuelle explicite.' },
  { id: 'rainy-thunderstorm-prepared', weather: 'rainy-thunderstorm', description: 'Orage pluvieux établi, sans frappe historique ajoutée.' },
];
const manifest = [];
await mkdir(output, { recursive: true });
for (const episode of episodes) {
  const world = structuredClone(base);
  world.weather = newWeatherState(world.seed, world.tick);
  world.weather.current = world.weather.previous = episode.weather;
  world.weather.durationCore = episode.weather.includes('thunderstorm') ? 20_000 : 40_000;
  const errors = validateWorld(world);
  if (errors.length) throw Error(`${episode.id}: ${errors.join(' ')}`);
  const raw = serializeWorld(world);
  const loaded = deserializeWorld(raw); // strict current-schema loader
  if (serializeWorld(loaded) !== raw) throw Error(`${episode.id}: save did not round-trip.`);
  const filename = `${episode.id}.json`;
  await writeFile(join(output, filename), raw, 'utf8');
  manifest.push({ ...episode, filename, schemaVersion: world.schemaVersion, tick: world.tick,
    width: world.width, height: world.height, sha256: createHash('sha256').update(raw).digest('hex') });
}
await writeFile(join(output, 'manifest.json'), JSON.stringify({ version: 1, prepared: true, episodes: manifest }, null, 2) + '\n');
console.log(JSON.stringify({ output, episodes: manifest }, null, 2));
