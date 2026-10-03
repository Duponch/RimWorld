import { expect, test } from 'vitest';
import { createWorld } from '../src/sim/engine';
import { constructionMaterials, constructionRecipe, validConstructionMaterial } from '../src/sim/construction-materials';
import { footprintCells, STRUCTURE_DEFINITIONS } from '../src/sim/definitions';
import { minifiable } from '../src/sim/furniture-rules';
import { FURNITURE_TRAVEL } from '../src/sim/furniture-travel';
import { occupancyOf } from '../src/sim/occupancy';
import { structureFlammability, structureLeavesResources, structureMaxHp } from '../src/sim/thing-damage-rules';
import { STRUCTURE_SHOT_FILL } from '../src/sim/combat-content';
import { structureRoomMarketValue, structureRoomStandable } from '../src/sim/room-market-value';
import type { Structure, World } from '../src/sim/types';
import { placementMaterial } from '../src/ui/construction-controls';
import { buildingLabels } from '../src/ui/building-labels';
import { ARCHITECT_ICON_MAPPING, ARCHITECT_ICON_ORDER } from '../src/ui/architect-icons';
import { toolDefinitions } from '../src/ui/layout';
import { powerInspection } from '../src/ui/power-inspection';
import { electricalParts } from '../src/render/electrical-parts';
import { EnvironmentLightField } from '../src/render/EnvironmentLightField';

function fixture(): { world: World; lamp: Structure } {
  const world = createWorld(189, 32, 32);
  world.tiles = world.tiles.map(() => ({ terrain: 'grass' }));
  world.resources = []; world.structures = []; world.roofing = undefined;
  world.climate = undefined; world.gameProfile = undefined; world.tick = 1600;
  const lamp: Structure = { id: world.nextId++, kind: 'sun-lamp', x: 16, z: 16, orientation: 0, footprint: 'standard', material: 'steel', power: { on: true, parentId: null } };
  world.structures.push(lamp);
  return { world, lamp };
}

test('horticultural construction is fixed steel with its Core cost and refuses historical material admission', () => {
  expect(constructionRecipe({ kind: 'sun-lamp', material: 'steel' })).toEqual({ ingredients: [{ item: 'steel', quantity: 40 }], work: 33, coreWork: 330 });
  expect(validConstructionMaterial('sun-lamp', 'steel', 176)).toBe(false);
  expect(validConstructionMaterial('sun-lamp', undefined, 177)).toBe(false);
  expect(validConstructionMaterial('sun-lamp', 'wood', 177)).toBe(false);
  expect(constructionMaterials('sun-lamp')).toEqual(['steel']);
  expect(placementMaterial('sun-lamp', 'wood')).toBe('steel');
  const { lamp } = fixture();
  expect(footprintCells(lamp)).toEqual([{ x: 16, z: 16 }]);
  expect(STRUCTURE_DEFINITIONS['sun-lamp'].blocksMovement).toBe(false);
  expect(minifiable('sun-lamp')).toBe(true);
  expect(FURNITURE_TRAVEL['sun-lamp']).toEqual({ delay: 1.4, stand: false, repeat: false });
  expect(occupancyOf('sun-lamp')).toEqual({ clearItems: false, items: true, zones: true, store: true });
  expect(structureMaxHp(lamp)).toBe(50);
  expect(structureFlammability(lamp)).toBe(1);
  expect(structureLeavesResources(lamp)).toBe(false);
  expect(STRUCTURE_SHOT_FILL['sun-lamp']).toBe(.2);
  expect(structureRoomStandable('sun-lamp')).toBe(false);
  expect(structureRoomMarketValue(lamp)).toBeCloseTo(77.188, 6);
  expect(structureRoomMarketValue({ ...lamp, damage: 25 })).toBeLessThan(structureRoomMarketValue(lamp));
});

test('Architecte exposes the lamp with a distinct icon without moving the historical atlas', () => {
  expect(buildingLabels['sun-lamp']).toBe('Lampe horticole');
  expect(toolDefinitions.find(t => t.id === 'sun-lamp')).toMatchObject({ title: 'Lampe horticole', category: 'furniture' });
  expect(ARCHITECT_ICON_ORDER.filter(id => id === 'sun-lamp')).toHaveLength(1);
  expect(ARCHITECT_ICON_MAPPING['sun-lamp']).toBeDefined();
  expect(ARCHITECT_ICON_MAPPING['standing-lamp']).toEqual({ atlas: 1, column: 2, row: 1 });
  expect(ARCHITECT_ICON_MAPPING['tailor-bench']).toEqual({ atlas: 1, column: 0, row: 2 });
});

test('inspection separates civil rest, manual stop, breakdown and supply', () => {
  const { world, lamp } = fixture();
  expect(powerInspection(world, lamp)).toContain('Non raccordée');
  lamp.power!.parentId = world.nextId++;
  world.structures.push({ id: lamp.power!.parentId, kind: 'power-conduit', x: 16, z: 17, orientation: 0, footprint: 'standard', material: 'steel' });
  expect(powerInspection(world, lamp)).toContain('Allumée');
  lamp.power!.on = false;
  expect(powerInspection(world, lamp)).toContain('Alimentation en attente');
  world.tick = 4800;
  expect(powerInspection(world, lamp)).toContain('Repos des plantes (horaire)');
  lamp.power!.switchOn = false;
  expect(powerInspection(world, lamp)).toContain('Arrêt manuel');
  lamp.breakdown = { brokenAt: world.tick };
  expect(powerInspection(world, lamp)).toContain('En panne');
});

test('full agricultural light saturates the visual byte and keeps buffer identity on confirmed stable ticks', () => {
  const { world, lamp } = fixture(), field = new EnvironmentLightField();
  const before = JSON.stringify(world);
  expect(field.update(world)).toBe(true);
  const data = field.data, revision = field.revision;
  const at = (x: number, z: number) => field.data[(z * world.width + x) * 4]!;
  expect(at(16, 16)).toBe(255); expect(at(21, 16)).toBe(255); expect(at(20, 20)).toBe(255);
  expect(at(30, 16)).toBe(0);
  expect(JSON.stringify(world)).toBe(before);
  expect(field.update(world)).toBe(false);
  world.tick++;
  expect(field.update(world)).toBe(false);
  expect(field.data).toBe(data); expect(field.revision).toBe(revision);
  lamp.power!.on = false;
  expect(field.update(world)).toBe(true); expect(at(16, 16)).toBe(0);
  expect(field.data).toBe(data);
});

test('lamp volumes remain finite in one cell and civil rest changes only their pigment colors', () => {
  const { world } = fixture(), before = JSON.stringify(world), lit = electricalParts(world);
  expect(lit.length).toBeGreaterThanOrEqual(4); expect(lit.length).toBeLessThanOrEqual(8);
  for (const p of lit) {
    const sx = p.sx ?? 1, sy = p.sy ?? 1, sz = p.sz ?? 1;
    for (const value of [p.x, p.y, p.z, p.sx, p.sy, p.sz]) expect(Number.isFinite(value)).toBe(true);
    expect(p.sx).toBeGreaterThan(0); expect(p.sy).toBeGreaterThan(0); expect(p.sz).toBeGreaterThan(0);
    expect(Math.abs(p.x - 16) + sx / 2).toBeLessThanOrEqual(.5);
    expect(Math.abs(p.z - 16) + sz / 2).toBeLessThanOrEqual(.5);
    expect(p.y - sy / 2).toBeGreaterThanOrEqual(0);
  }
  expect(JSON.stringify(world)).toBe(before);
  world.tick = 4800;
  const rest = electricalParts(world), shapes = (parts: typeof lit) => parts.map(({ color: _color, ...shape }) => shape);
  expect(shapes(rest)).toEqual(shapes(lit)); expect(rest).not.toEqual(lit);
});
