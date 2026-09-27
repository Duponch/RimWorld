import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {afterEach, expect, test, vi} from 'vitest';
import {deserializeWorld, serializeWorld, stepWorld, validateWorld} from '../src/sim/index.ts';
import {parseTestColonies, readTestColony} from '../src/ui/test-colonies.ts';

afterEach(() => vi.unstubAllGlobals());

test('V124 prepared table gathers two people in distinct seats and resumes exactly', async () => {
  const raw = readFileSync('public/test-saves/v124/rencontre.json', 'utf8');
  const entries = parseTestColonies(JSON.parse(readFileSync('public/test-saves/manifest.json', 'utf8')));
  const entry = entries.find(save => save.id === 'rencontre-v124');
  expect(entry).toMatchObject({release: 'v124', filename: 'rencontre.json', prepared: true, pawns: 2, colonists: 2});
  expect(entry!.sha256).toBe(createHash('sha256').update(raw).digest('hex'));
  expect(JSON.parse(raw).schemaVersion).toBe(124);
  vi.stubGlobal('fetch', vi.fn(async () => new Response(raw)));
  const world = deserializeWorld(await readTestColony(entry!));
  expect(world.schemaVersion).toBe(125);
  expect(validateWorld(world)).toEqual([]);
  const table = world.structures.find(s => s.kind === 'table' && s.x === 18 && s.z === 15)!;
  expect(table.gatherSpot).toBe(true);
  expect(world.pawns.every(p => p.recreation.task === null)).toBe(true);
  const initial = world.pawns.map(p => p.recreation.level);

  for (let i = 0; i < 180 && world.pawns.some(p => p.recreation.task?.phase !== 'active'); i++) stepWorld(world);
  expect(world.pawns.map(p => p.recreation.task?.activity)).toEqual(['social-relax', 'social-relax']);
  expect(world.pawns.every(p => p.recreation.task?.phase === 'active')).toBe(true);
  expect(new Set(world.pawns.map(p => p.recreation.task?.seatId)).size).toBe(2);
  expect(world.pawns.every(p => p.recreation.task?.buildingId === table.id)).toBe(true);
  const resumed = deserializeWorld(serializeWorld(world));
  for (let i = 0; i < 80; i++) {stepWorld(world); stepWorld(resumed);}
  expect(world.pawns.every((p, i) => p.recreation.level > initial[i]!)).toBe(true);
  expect(world.pawns.every(p => p.recreation.tolerance.social > 0)).toBe(true);
  expect(validateWorld(world)).toEqual([]);
  expect(serializeWorld(resumed)).toBe(serializeWorld(world));

  table.gatherSpot = false;
  stepWorld(world);
  expect(world.pawns.every(p => p.recreation.task === null)).toBe(true);
  expect(validateWorld(world)).toEqual([]);
});
