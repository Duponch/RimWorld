import { describe, expect, it } from 'vitest';
import { STRUCTURE_DEFINITIONS } from '../src/sim/definitions.ts';
import { FLOOR_DEFINITIONS } from '../src/sim/flooring.ts';
import { structureMaxHp } from '../src/sim/thing-damage-rules.ts';
import {
  floorRoomMarketValue, resourceRoomMarketValue,
  structureRoomMarketValue, structureRoomStandable,
} from '../src/sim/room-market-value.ts';
import type { Resource, Structure, StructureKind, Tile } from '../src/sim/types.ts';

const building = (kind: StructureKind, extra: Partial<Structure> = {}): Structure => ({
  id: 1, kind, x: 0, z: 0, orientation: 0, footprint: 'standard', ...extra,
});
const tile = (floor?: Tile['floor']): Tile => ({ terrain: 'soil', ...(floor ? { floor } : {}) });

describe('valeur physique des pièces Core 1.6.4871', () => {
  it('couvre toutes les constructions obtenables et distingue les vrais postes gratuits', () => {
    for (const kind of Object.keys(STRUCTURE_DEFINITIONS) as StructureKind[]) {
      expect(structureRoomMarketValue(building(kind)), kind).toBeGreaterThanOrEqual(0);
      expect(Number.isFinite(structureRoomMarketValue(building(kind))), kind).toBe(true);
      expect(typeof structureRoomStandable(kind), kind).toBe('boolean');
    }
    expect(structureRoomMarketValue(building('grave'))).toBeCloseTo(2.88, 8);
    expect(structureRoomMarketValue(building('butcher-spot'))).toBe(0);
    expect(structureRoomMarketValue(building('crafting-spot'))).toBe(0);
    expect(structureRoomMarketValue(building('machining-table'))).toBe(455);
  });

  it('prend coûts fixes, matière, facteur et décalage de travail sans inventer de matière historique', () => {
    expect(structureRoomMarketValue(building('bed', { material: 'wood' }))).toBeCloseTo(56.016, 8);
    expect(structureRoomMarketValue(building('bed', { material: 'steel' }))).toBeCloseTo(88.38, 8);
    expect(structureRoomMarketValue(building('bed', { material: 'marble-blocks' }))).toBeCloseTo(56.844, 8);
    expect(structureRoomMarketValue(building('bed'))).toBeCloseTo(92.88, 8);
    expect(structureRoomMarketValue(building('stonecutter', { material: 'wood' }))).toBeCloseTo(152.04, 8);
    expect(structureRoomMarketValue(building('butcher-table', { material: 'wood' }))).toBeCloseTo(119.04, 8);
  });

  it('applique qualité, réduction par PV et arrondi unitaire avant somme', () => {
    expect(structureRoomMarketValue(building('bed', { material: 'wood', quality: 'awful' }))).toBeCloseTo(28.008, 8);
    expect(structureRoomMarketValue(building('bed', { material: 'wood', quality: 'good' }))).toBeCloseTo(70.02, 8);
    expect(structureRoomMarketValue(building('armchair', { material: 'cloth', quality: 'normal' }))).toBe(215);
    expect(structureRoomMarketValue(building('armchair', { material: 'cloth', quality: 'legendary' }))).toBe(1075);

    const wall = building('wall', { material: 'steel' });
    expect(structureMaxHp(wall)).toBe(300);
    expect(structureRoomMarketValue(wall)).toBeCloseTo(9.986, 8);
    expect(structureRoomMarketValue({ ...wall, damage: 150 })).toBeCloseTo(.9986, 8);
    expect(structureRoomMarketValue({ ...wall, damage: 120 })).toBeCloseTo(4.993, 8);
    expect(structureRoomMarketValue({ ...wall, damage: 30 })).toBeCloseTo(9.986, 8);
    expect(structureRoomMarketValue(building('grave', { damage: 999 }))).toBeCloseTo(2.88, 8);
  });

  it('compte chaque sol construit, mais pas le naturel ou le bois brûlé', () => {
    expect(floorRoomMarketValue(tile())).toBe(0);
    expect(floorRoomMarketValue(tile('burned-wood'))).toBe(0);
    expect(floorRoomMarketValue(tile('wood-planks'))).toBeCloseTo(3.906, 8);
    expect(floorRoomMarketValue(tile('steel-tile'))).toBeCloseTo(16.18, 8);
    for (const floor of Object.keys(FLOOR_DEFINITIONS) as NonNullable<Tile['floor']>[]) {
      const value = floorRoomMarketValue(tile(floor));
      expect(Number.isFinite(value), floor).toBe(true);
      if (floor.endsWith('-tile') && floor !== 'steel-tile') expect(value, floor).toBeCloseTo(7.56, 8);
    }
  });

  it('la fleur en pot et les ressources naturelles n’ajoutent aucune richesse', () => {
    const pot = building('flower-pot', { material: 'wood' });
    expect(structureRoomMarketValue(pot)).toBeCloseTo(24.63, 8);
    for (const kind of ['wild-plant', 'potato', 'corn', 'tree', 'berries', 'rock', 'rice', 'cotton'] as const) {
      const resource: Resource = { id: 2, kind, x: 0, z: 0, amount: 1, growth: .9 };
      expect(resourceRoomMarketValue(resource), kind).toBe(0);
    }
  });

  it('classe les sièges et paillasses par Traversability Core, sans confondre avec leur usage', () => {
    for (const kind of ['grave', 'power-conduit', 'power-switch', 'butcher-spot', 'crafting-spot', 'door', 'stool', 'dining-chair', 'armchair', 'horseshoes'] as const)
      expect(structureRoomStandable(kind), kind).toBe(true);
    for (const kind of ['wall', 'cooler', 'bed', 'table', 'machining-table', 'flower-pot'] as const)
      expect(structureRoomStandable(kind), kind).toBe(false);
  });
});
