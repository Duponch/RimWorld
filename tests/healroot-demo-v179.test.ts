import { withoutMiningSkill, withoutPredatorDefaults } from './scenarios/legacy-skills.ts';
import { TEST_COLONY_COUNT } from './test-colony-count.ts';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { afterEach, expect, test, vi } from 'vitest';
import { applyCommand, deserializeWorld, serializeWorld, stepWorld, validateWorld } from '../src/sim/index.ts';
import { SCHEMA_VERSION, type World } from '../src/sim/types.ts';
import { parseTestColonies, readTestColony } from '../src/ui/test-colonies.ts';
import { HEALROOT_CELL, MEDICINE_STORE, prepareHealrootDemo } from '../scripts/generate-healroot-demo-v179.ts';
import { enableBiomeWildlife } from '../src/sim/wildlife.ts';

afterEach(() => vi.unstubAllGlobals());

const herbalTotal = (world: World) => world.piles.filter(pile => pile.item === 'herbal-medicine').reduce((n, pile) => n + pile.quantity, 0);
const industrialTotal = (world: World) => world.piles.filter(pile => pile.item === 'medicine').reduce((n, pile) => n + pile.quantity, 0);

test('V179 catalogue scene harvests its natural root, hauls one physical dose, and treats Noé after exact save continuation', async () => {
  const raw = readFileSync('public/test-saves/v179/racines-et-soins.json', 'utf8');
  const entries = parseTestColonies(JSON.parse(readFileSync('public/test-saves/manifest.json', 'utf8')));
  const entry = entries.find(save => save.id === 'racines-et-soins-v179');
  expect(entry).toMatchObject({ release: 'v179', filename: 'racines-et-soins.json', prepared: true, pawns: 3, colonists: 3, width: 250, height: 250 });
  expect(entries).toHaveLength(TEST_COLONY_COUNT);
  expect(entry!.sha256).toBe(createHash('sha256').update(raw).digest('hex'));
  expect(JSON.parse(raw).schemaVersion).toBe(168); // Immutable V179 bytes.
  vi.stubGlobal('fetch', vi.fn(async () => new Response(raw)));
  expect(await readTestColony(entry!)).toBe(raw);
  const world = deserializeWorld(raw);
  expect(world.schemaVersion).toBe(SCHEMA_VERSION);
  const prepared=withoutPredatorDefaults(withoutMiningSkill(prepareHealrootDemo('pre-v210')));
  // Reconstruct V168's boreal population from its own seed and ecological table.
  // Wildlife preceded these two prepared commands; no published body/ID is copied.
  expect(prepared.jobs).toHaveLength(1);expect(prepared.stockpiles).toHaveLength(1);
  expect(prepared.events).toEqual([{tick:0,type:'command',message:'Nouvel ordre : récolte (127, 143).'}]);
  prepared.nextId=prepared.wildlife!.animals[0]!.id;
  delete prepared.wildlife;prepared.jobs=[];prepared.stockpiles=[];prepared.events=[];
  prepared.schemaVersion=168 as World['schemaVersion'];
  enableBiomeWildlife(prepared,'boreal-forest');
  prepared.schemaVersion=SCHEMA_VERSION;
  for(const command of [
    {type:'stockpile',...MEDICINE_STORE,enabled:true,filters:{wood:false,food:false,medicine:true},priority:2,capacity:75},
    {type:'designate',kind:'harvest',...HEALROOT_CELL},
  ] as const)expect(applyCommand(prepared,command).ok).toBe(true);
  // The old fixture gains no Misc calendar merely by being loaded.
  delete prepared.miscIncidents;
  expect(world).toEqual(prepared);
  expect(validateWorld(world)).toEqual([]);

  const plant = world.resources.find(resource => resource.id === 7436);
  expect(plant).toMatchObject({ species: 'healroot-wild', kind: 'wild-plant', growth: 1, ...HEALROOT_CELL });
  const job = world.jobs.find(candidate => candidate.kind === 'harvest' && candidate.x === HEALROOT_CELL.x && candidate.z === HEALROOT_CELL.z)!;
  expect(job).toBeDefined();
  const ada = world.pawns[0]!, noe = world.pawns[1]!;
  expect(ada).toMatchObject({ name: 'Ada', priorities: { gather: 1, haul: 0, doctor: 0 } });
  expect(noe).toMatchObject({ name: 'Noé', medicalCare: 'herbal', priorities: { doctor: 0 } });
  expect(ada.skills.plants).toMatchObject({ level: 8, xp: 0, passion: 1 });
  expect(ada.health?.ageAilments).toEqual(['bad-back']);
  expect(noe.health?.injuries).toMatchObject([{ part: 'left-arm', kind: 'bruise', severity: 5000, bornAt: 0 }]);
  expect(noe.health!.injuries[0]!.tended).toBeUndefined();
  expect(world.stockpiles).toContainEqual(expect.objectContaining({ ...MEDICINE_STORE, filters: { wood: false, food: false, medicine: true } }));
  expect(herbalTotal(world)).toBe(0);
  expect(industrialTotal(world)).toBe(30);

  for (let i = 0; i < 250 && !((world.jobs.find(candidate => candidate.id === job.id)?.progress ?? 0) >= 5); i++) stepWorld(world);
  expect(world.jobs.find(candidate => candidate.id === job.id)?.progress).toBeGreaterThan(0);
  expect(world.jobs.find(candidate => candidate.id === job.id)?.progress).toBeLessThan(40);
  expect(world.resources.some(resource => resource.id === plant!.id)).toBe(true);
  expect(herbalTotal(world)).toBe(0);
  const resumed = deserializeWorld(serializeWorld(world));
  expect(validateWorld(resumed)).toEqual([]);
  for (let i = 0; i < 200 && world.resources.some(resource => resource.id === plant!.id); i++) {
    stepWorld(world);
    stepWorld(resumed);
  }
  expect(world.resources.some(resource => resource.id === plant!.id)).toBe(false);
  expect(ada.skills.plants!.xp).toBeGreaterThan(0);
  expect(noe.health!.injuries[0]!.tended).toBeUndefined();
  const dose = world.piles.find(pile => pile.item === 'herbal-medicine')!;
  expect(dose).toMatchObject({ item: 'herbal-medicine', quantity: 1, owner: { type: 'ground' } });
  expect(herbalTotal(world)).toBe(1);
  expect(industrialTotal(world)).toBe(30);
  expect(serializeWorld(resumed)).toBe(serializeWorld(world));

  const commands = [
    { type: 'priority', pawnId: ada.id, work: 'haul', value: 1 },
    { type: 'order-haul', pawnId: ada.id, target: { type: 'pile', pileId: dose.id }, queue: false },
  ] as const;
  for (const command of commands) {
    for (const state of [world, resumed]) {
      const result = applyCommand(state, command);
      expect(result.ok, result.reason).toBe(true);
    }
  }
  expect(ada.haul?.sourcePileId).toBe(dose.id);
  expect(ada.haul?.destination.type).toBe('stockpile');
  let carried = false;
  for (let i = 0; i < 250 && !world.piles.some(pile => pile.item === 'herbal-medicine' && pile.owner.type === 'ground' && pile.owner.x === MEDICINE_STORE.x && pile.owner.z === MEDICINE_STORE.z); i++) {
    stepWorld(world);
    stepWorld(resumed);
    carried ||= world.piles.some(pile => pile.item === 'herbal-medicine' && pile.owner.type === 'pawn' && pile.owner.pawnId === ada.id);
  }
  expect(carried).toBe(true);
  const stored = world.piles.find(pile => pile.item === 'herbal-medicine' && pile.owner.type === 'ground' && pile.owner.x === MEDICINE_STORE.x && pile.owner.z === MEDICINE_STORE.z)!;
  expect(stored.quantity).toBe(1);
  expect(ada.haul).toBeNull();
  expect(noe.health!.injuries[0]!.tended).toBeUndefined();
  expect(serializeWorld(resumed)).toBe(serializeWorld(world));

  for (const command of [
    { type: 'priority', pawnId: noe.id, work: 'doctor', value: 1 },
    { type: 'self-tend-policy', pawnId: noe.id, enabled: true },
    { type: 'order-tend', pawnId: noe.id, patientId: noe.id, queue: false },
  ] as const) {
    for (const state of [world, resumed]) {
      const result = applyCommand(state, command);
      expect(result.ok, result.reason).toBe(true);
    }
  }
  expect(noe.tend?.medicine).toMatchObject({ item: 'herbal-medicine', sourcePileId: stored.id, quantity: 1 });
  for (let i = 0; i < 250 && noe.health!.injuries[0]!.tended === undefined; i++) {
    stepWorld(world);
    stepWorld(resumed);
  }
  expect(noe.health!.injuries[0]!.tended).toBeDefined();
  expect(herbalTotal(world)).toBe(0);
  expect(industrialTotal(world)).toBe(30);
  expect(world.events.some(event => /avec Plantes médicinales/.test(event.message))).toBe(true);
  expect(validateWorld(world)).toEqual([]);
  expect(serializeWorld(resumed)).toBe(serializeWorld(world));
}, 60_000);
