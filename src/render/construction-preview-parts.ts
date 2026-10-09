import * as THREE from 'three/webgpu';
import { constructionMaterials, type ConstructionMaterial } from '../sim/construction-materials';
import { STRUCTURE_DEFINITIONS } from '../sim/definitions';
import { isFloorKind, type FloorKind } from '../sim/flooring';
import type { Orientation, Structure, StructureKind, World } from '../sim/types';
import { WORLD_SCALE } from '../world/scale';
import type { BoxBatches } from './BoxBatches';
import { buildFurniture } from './FurnitureLayer';
import { floorPartsForKind } from './HygieneLayer';
import { roofSlabCellBounds, roofSurfaceCells } from './RoofLayer';
import { timberCladdingParts } from './TimberCladdingLayer';
import { doorLeafParts } from './door-parts';
import { miniTurretTopPartsForStructure } from './mini-turret-parts';
import type { Placement } from './primitives';
import { windBladeParts } from './wind-blade-parts';

export { createTimberGeometry } from './TimberCladdingLayer';

export interface ConstructionPreviewSpec {
  key?: number;
  kind: StructureKind | 'lay-floor' | 'build-roof';
  x: number; z: number;
  orientation?: Orientation;
  material?: ConstructionMaterial;
  floor?: FloorKind;
  /** An installation retains its authored material, footprint and contents. */
  furniture?: Structure | null;
}

export type ConstructionPreviewPlacement = Placement & { rx?: number; rz?: number; tint?: number };
export interface ConstructionPreviewParts {
  boxes: ConstructionPreviewPlacement[];
  timberWalls: ConstructionPreviewPlacement[];
  timberEaves: ConstructionPreviewPlacement[];
  rotatedBoxes: ConstructionPreviewPlacement[];
}
export type ConstructionPreviewPart = {
  geometry: 'box' | 'timber-wall' | 'timber-eave';
  placement: ConstructionPreviewPlacement;
};

function virtualStructure(spec: ConstructionPreviewSpec, id: number): Structure {
  if (!Object.hasOwn(STRUCTURE_DEFINITIONS, spec.kind)) throw new Error(`No construction model for ${spec.kind}`);
  if (spec.furniture && spec.furniture.kind !== spec.kind) throw new Error('Installation model kind differs from its furniture');
  const kind = spec.kind as StructureKind;
  return {
    ...spec.furniture,
    id, kind, x: spec.x, z: spec.z,
    orientation: spec.orientation ?? spec.furniture?.orientation ?? 0,
    footprint: spec.furniture?.footprint ?? 'standard',
    // The current construction selector must not recolour a packed object.
    material: spec.furniture ? spec.furniture.material : spec.material ?? constructionMaterials(kind)[0],
  };
}

/** Read the actual authored builders through their set port. The small subject
 * view shares the map, inventories and clocks; only its structure list and
 * packed-parcel render subjects differ. Neighbours remain in contextWorld. */
export function constructionPreviewParts(world: World, specs: readonly ConstructionPreviewSpec[], cutaway = false,
  contextSpecs: readonly ConstructionPreviewSpec[] = specs): ConstructionPreviewParts {
  const result: ConstructionPreviewParts = { boxes: [], timberWalls: [], timberEaves: [], rotatedBoxes: [] };
  if (!specs.length) return result;
  const all = [...contextSpecs], included = new Set(all);
  for (const spec of specs) if (!included.has(spec)) { all.push(spec); included.add(spec); }
  const ordinals = new Map(all.map((spec, index) => [spec, index]));
  const virtuals = new Map<ConstructionPreviewSpec, Structure>(), keys = new Map<number, number>();
  for (let index = 0; index < all.length; index++) {
    const spec = all[index]!;
    if (spec.kind === 'lay-floor' || spec.kind === 'build-roof') continue;
    const structure = virtualStructure(spec, -index - 1);
    virtuals.set(spec, structure); keys.set(structure.id, spec.key ?? index);
  }
  const moving = new Set(all.flatMap(spec => spec.furniture ? [spec.furniture.id] : []));
  const contextWorld: World = { ...world, structures: [
    ...world.structures.filter(s => !moving.has(s.id)), ...virtuals.values(),
  ] };
  const subjects = specs.flatMap(spec => virtuals.has(spec) ? [virtuals.get(spec)!] : []);
  const timber = timberCladdingParts(contextWorld, cutaway, subjects);
  result.timberWalls = timber.walls.map(part => ({ ...part, key: keys.get(part.key!)! }));
  result.timberEaves = timber.eaves.map(part => ({ ...part, key: keys.get(part.key!)! }));

  const group = new THREE.Group();
  const captureFurniture = (renderSubjects: Structure[]): Placement[] => {
    const subjectWorld: World = { ...contextWorld, structures: renderSubjects, packed: [] };
    let authored: Placement[] | undefined;
    const sink: Pick<BoxBatches, 'set'> = { set(_group, name, parts) {
      if (name !== 'furniture' || authored) throw new Error('Unexpected construction furniture batch');
      authored = parts;
    } };
    buildFurniture(subjectWorld, group, cutaway, sink as BoxBatches, contextWorld);
    if (!authored) throw new Error('Construction builder produced no furniture batch');
    return authored;
  };
  // Lines contain mono-cellular objects. Their authored pieces remain within
  // the owning cell, so one capture can retain the preview key by its anchor.
  // Context indexes (conduits, boundary axes, frames) are built once per line.
  const linearSubjects = subjects.filter(s => s.kind === 'wall' || s.kind === 'fence' || s.kind === 'power-conduit');
  const lineModels = new Map<number, Placement[]>();
  if (linearSubjects.length) {
    const byCell = new Map(linearSubjects.map(s => [`${s.x}:${s.z}`, s.id]));
    for (const s of linearSubjects) lineModels.set(s.id, []);
    for (const part of captureFurniture(linearSubjects)) {
      const id = part.key !== undefined && lineModels.has(part.key) ? part.key : byCell.get(`${Math.round(part.x)}:${Math.round(part.z)}`);
      if (id === undefined) throw new Error('Construction line part has no owning cell');
      lineModels.get(id)!.push(part);
    }
  }
  for (const spec of specs) {
    const key = spec.key ?? ordinals.get(spec)!;
    if (spec.kind === 'lay-floor') {
      if (!isFloorKind(spec.floor)) throw new Error('Construction floor model requires a floor kind');
      result.boxes.push(...floorPartsForKind(spec.floor, spec.x, spec.z).map(part => ({ ...part, key })));
      continue;
    }
    if (spec.kind === 'build-roof') continue;
    const structure = virtuals.get(spec)!;
    const linear = lineModels.get(structure.id);
    const parts: Placement[] = linear ? [...linear] : [...captureFurniture([structure]), ...doorLeafParts(contextWorld, cutaway, [structure])];
    if (structure.kind === 'mini-turret') parts.push(...miniTurretTopPartsForStructure(structure));
    if (structure.kind === 'wind-turbine') result.rotatedBoxes.push(...windBladeParts(structure).map(part => ({ ...part, key })));
    result.boxes.push(...parts.map(part => ({ ...part, key })));
    if (!parts.length && !timber.walls.some(part => part.key === structure.id)) throw new Error(`Empty construction model for ${spec.kind}`);
  }

  const roofs = specs.filter(spec => spec.kind === 'build-roof');
  if (roofs.length) {
    const constructed = new Set(world.roofing?.constructed ?? []);
    for (const spec of all) if (spec.kind === 'build-roof') constructed.add(spec.z * world.width + spec.x);
    const roofWorld: World = { ...contextWorld, roofing: { build: [], remove: [], cursor: 0, ...world.roofing, constructed: [...constructed] } };
    const bounds = new Map(roofSlabCellBounds(roofSurfaceCells(roofWorld), WORLD_SCALE.wallHeight + .08)
      .map(cell => [cell.z * world.width + cell.x, cell]));
    for (const spec of roofs) {
      const cell = bounds.get(spec.z * world.width + spec.x)!;
      result.boxes.push({ key: spec.key ?? ordinals.get(spec)!, x: (cell.w + cell.e) / 2, y: (cell.top + cell.bottom) / 2,
        z: (cell.s + cell.n) / 2, sx: cell.e - cell.w, sy: cell.top - cell.bottom, sz: cell.n - cell.s, color: 0xe6bc83 });
    }
  }
  return result;
}

/** Flat form for callers which group instances by geometry themselves. */
export function collectConstructionPreviewParts(world: World, specs: readonly ConstructionPreviewSpec[], cutaway = false,
  contextSpecs: readonly ConstructionPreviewSpec[] = specs): ConstructionPreviewPart[] {
  const parts = constructionPreviewParts(world, specs, cutaway, contextSpecs);
  return [
    ...[...parts.boxes, ...parts.rotatedBoxes].map(placement => ({ geometry: 'box' as const, placement })),
    ...parts.timberWalls.map(placement => ({ geometry: 'timber-wall' as const, placement })),
    ...parts.timberEaves.map(placement => ({ geometry: 'timber-eave' as const, placement })),
  ];
}
