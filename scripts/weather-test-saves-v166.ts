/** Prepared visual episodes, never a natural-weather occurrence claim.
 * Run: node --experimental-strip-types scripts/weather-test-saves-v166.ts
 * The public V166 copies are separate from the immutable historical fixtures.
 * The tmp copies remain available for the browser capture workflow. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createWorld, deserializeWorld, serializeWorld, validateWorld } from '../src/sim/index.ts';
import { newWeatherState } from '../src/sim/weather.ts';
import type { WeatherKind } from '../src/sim/weather-definitions.ts';
import { SCHEMA_VERSION } from '../src/sim/types.ts';

const output = join(process.cwd(), 'tmp', 'weather-v166');
const publicOutput = new URL('../public/test-saves/v166/', import.meta.url);
const publicManifest = new URL('../public/test-saves/manifest.json', import.meta.url);
assert.equal(SCHEMA_VERSION, 162, 'Do not rewrite the V166 reference under a later schema.');
const base = createWorld(166, 32, 32);
const episodes: { id: string; weather: WeatherKind; label: string; description: string; focus: string[]; steps: string[] }[] = [
  { id: 'clear-prepared', weather: 'clear', label: 'Temps clair · 3 colons', description: 'Temps clair établi, témoin sans précipitation.',
    focus: ['temps clair', 'témoin sans précipitation'], steps: ['Observer le ciel et vérifier l’absence de pluie et de neige.', 'Basculer entre caméra isométrique et perspective basse pour comparer la scène.'] },
  { id: 'fog-prepared', weather: 'fog', label: 'Brouillard · 3 colons', description: 'Brouillard établi, témoin sans précipitation.',
    focus: ['brouillard', 'témoin sans précipitation'], steps: ['Observer le ciel et vérifier l’absence de pluie et de neige.', 'Comparer la visibilité avec le temps clair préparé.'] },
  { id: 'rain-prepared', weather: 'rain', label: 'Pluie · 3 colons', description: 'Pluie établie, préparation visuelle explicite.',
    focus: ['pluie', 'traînées visibles', 'caméra'], steps: ['Observer les traits de pluie autour du camp en caméra isométrique.', 'Passer en perspective basse puis mettre en pause pour inspecter la pluie au même tick.'] },
  { id: 'dry-thunderstorm-prepared', weather: 'dry-thunderstorm', label: 'Orage sec · 3 colons', description: 'Orage sec établi, sans frappe historique ajoutée.',
    focus: ['orage sec', 'absence de précipitation'], steps: ['Observer le ciel sombre sans pluie ni neige.', 'Reprendre la partie pour laisser les événements météo futurs suivre la simulation.'] },
  { id: 'foggy-rain-prepared', weather: 'foggy-rain', label: 'Pluie et brouillard · 3 colons', description: 'Pluie et brouillard établis, préparation visuelle explicite.',
    focus: ['pluie', 'brouillard', 'caméra'], steps: ['Observer ensemble les nuages, le brouillard et les traits de pluie.', 'Comparer les deux vues de caméra autour du camp.'] },
  { id: 'snow-gentle-prepared', weather: 'snow-gentle', label: 'Neige légère · 3 colons', description: 'Neige légère établie, préparation visuelle explicite.',
    focus: ['neige légère', 'flocons visibles'], steps: ['Observer les flocons près du camp et vérifier l’absence de seconde pluie artificielle.', 'Comparer leur densité avec la neige forte préparée.'] },
  { id: 'snow-hard-prepared', weather: 'snow-hard', label: 'Neige forte · 3 colons', description: 'Neige forte établie, préparation visuelle explicite.',
    focus: ['neige forte', 'flocons visibles', 'caméra'], steps: ['Observer les flocons en caméra isométrique et en perspective basse.', 'Mettre en pause pour inspecter le champ de neige sans déplacement du temps.'] },
  { id: 'rainy-thunderstorm-prepared', weather: 'rainy-thunderstorm', label: 'Orage pluvieux · 3 colons', description: 'Orage pluvieux établi, sans frappe historique ajoutée.',
    focus: ['orage pluvieux', 'pluie', 'ciel sombre'], steps: ['Observer la pluie sous les nuages sombres en caméra isométrique.', 'Passer en perspective basse pour comparer la visibilité des traits de pluie.'] },
];
const manifest = [];
await mkdir(output, { recursive: true });
await mkdir(publicOutput, { recursive: true });
const published = JSON.parse(await readFile(publicManifest, 'utf8')) as { version: number; saves: { id: string; release: string; [key: string]: unknown }[] };
assert.equal(published.version, 2);
assert.ok(Array.isArray(published.saves));
const expectedIds = new Set(episodes.map(episode => `weather-${episode.weather}-v166`));
for (const save of published.saves.filter(save => save.release === 'v166')) assert.ok(expectedIds.has(save.id), `Unexpected V166 entry: ${save.id}`);
const historical = published.saves.filter(save => save.release !== 'v166');
assert.equal(historical.length, 22, 'The 22 existing public entries must remain intact.');
const publicEntries = [];
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
  await writeFile(new URL(filename, publicOutput), raw, 'utf8');
  const sha256 = createHash('sha256').update(raw).digest('hex');
  manifest.push({ ...episode, filename, schemaVersion: world.schemaVersion, tick: world.tick,
    width: world.width, height: world.height, sha256 });
  publicEntries.push({
    release: 'v166', id: `weather-${episode.weather}-v166`, label: episode.label,
    description: episode.description, filename, pawns: world.pawns.length, colonists: world.pawns.length,
    width: world.width, height: world.height, tick: world.tick, focus: episode.focus,
    steps: episode.steps, prepared: true,
    provenance: 'Scène V166 préparée depuis le même départ 32 × 32 au tick zéro : la météo établie est imposée explicitement. La saison et la fréquence naturelle de cette météo ne sont pas démontrées ; aucune frappe de foudre passée n’est ajoutée.',
    sha256,
  });
}
await writeFile(join(output, 'manifest.json'), JSON.stringify({ version: 1, prepared: true, episodes: manifest }, null, 2) + '\n');
published.saves = [...historical, ...publicEntries];
await writeFile(publicManifest, JSON.stringify(published, null, 2) + '\n');
console.log(JSON.stringify({ output, publicOutput: publicOutput.pathname, episodes: manifest }, null, 2));
