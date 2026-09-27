import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { stepWorld } from '../src/sim/engine.ts';
import { RESEARCH_SCALE } from '../src/sim/research.ts';
import { deserializeWorld, serializeWorld, validateWorld } from '../src/sim/serialization.ts';

const fixtureUrl = new URL('../public/test-saves/v122/echecs.json', import.meta.url);
const manifestUrl = new URL('../public/test-saves/manifest.json', import.meta.url);
const sourceUrl = new URL('../public/test-saves/v103/salles.json', import.meta.url);

/** The old room scene is immutable; only this new demonstration is prepared. */
function preparedWorld() {
  const world = deserializeWorld(readFileSync(sourceUrl, 'utf8'));
  const pawn = world.pawns[0]!;
  expect(world.structures.some(s => s.kind === 'stool' && s.x === 17 && s.z === 15)).toBe(true);
  expect(world.structures.some(s => s.x === 16 && s.z === 15)).toBe(false);
  world.research = { project: null, points: 0, complexFurniture: { points: 300 * RESEARCH_SCALE, completedAt: world.tick - 1 } };
  world.structures.push({ id: world.nextId++, kind: 'chess-table', x: 16, z: 15, orientation: 0, footprint: 'standard', material: 'wood', quality: 'normal' });
  pawn.hunger = 70;
  pawn.recreation.level = 10;
  pawn.recreation.tolerance.solitary = 70;
  pawn.recreation.tolerance.dexterity = 70;
  pawn.recreation.bored.solitary = true;
  pawn.recreation.bored.dexterity = true;
  pawn.recreation.tolerance.cerebral = 0;
  pawn.recreation.bored.cerebral = false;
  pawn.schedule = Array.from({ length: 24 }, () => 'recreation' as const);
  pawn.needCooldown = 0;
  pawn.planCooldown = 0;
  expect(validateWorld(world)).toEqual([]);
  return world;
}

const entry = (world: ReturnType<typeof preparedWorld>, sha256: string) => ({
  id: 'echecs-v122', release: 'v122', label: 'Échecs en salle · 1 colon',
  description: 'Table d’échecs et siège physiques dans une salle préparée ; le colon joue réellement après la reprise, gagne du loisir et entraîne son intellect.',
  filename: 'echecs.json', pawns: world.pawns.length, colonists: world.pawns.length,
  width: world.width, height: world.height, tick: world.tick,
  focus: ['échecs', 'siège partagé', 'lassitude cérébrale', 'salle de loisirs', 'mobilier complexe'],
  steps: [
    'Repérer la table d’échecs à (16, 15) et le tabouret adjacent à (17, 15) ; ouvrir la fiche Besoins d’Ada.',
    'Reprendre : Ada rejoint le siège et joue. Son loisir augmente, et la lassitude des jeux cérébraux progresse.',
    'Retirer ou désinstaller le siège pour voir l’activité s’interrompre ; un nouveau siège rétablit une place utilisable.',
  ],
  prepared: true,
  provenance: 'Scène V122 préparée depuis les salles historiques V103 : table, recherche, siège, faim et lassitudes initiales sont fixés explicitement. La partie d’échecs et ses gains sont effectués après reprise par le moteur ordinaire.',
  sha256,
});

test('prepared V122 chess room loads directly and real play resumes exactly', () => {
  const expected = preparedWorld();
  const serialized = serializeWorld(expected);
  const sha256 = createHash('sha256').update(serialized).digest('hex');
  if (process.env.WRITE_V122_DEMO === '1') {
    mkdirSync(new URL('../public/test-saves/v122/', import.meta.url), { recursive: true });
    writeFileSync(fixtureUrl, serialized);
    const manifest = JSON.parse(readFileSync(manifestUrl, 'utf8')) as { version: number; saves: Record<string, unknown>[] };
    manifest.saves = manifest.saves.filter(save => save.id !== 'echecs-v122');
    manifest.saves.push(entry(expected, sha256));
    writeFileSync(manifestUrl, JSON.stringify(manifest, null, 2) + '\n');
  }
  const manifest = JSON.parse(readFileSync(manifestUrl, 'utf8')) as { saves: { id: string; release: string; filename: string; sha256: string; prepared: boolean }[] };
  const listed = manifest.saves.find(save => save.id === 'echecs-v122');
  expect(listed).toMatchObject({ release: 'v122', filename: 'echecs.json', prepared: true, sha256 });
  const raw = readFileSync(fixtureUrl, 'utf8');
  expect(raw).toBe(serialized);
  expect(createHash('sha256').update(raw).digest('hex')).toBe(listed!.sha256);
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
